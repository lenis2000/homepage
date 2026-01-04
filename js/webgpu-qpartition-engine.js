/**
 * WebGPU q-Partition Glauber Engine
 *
 * Runs multiple independent Glauber chains in parallel on the GPU.
 * Starting from a valid path (obtained via CFTP), each chain runs
 * independent Glauber dynamics to generate approximate samples.
 *
 * Returns the y-value at x = N/2 for each sample (for histogram).
 */

class WebGPUQPartitionEngine {
    constructor() {
        this.device = null;
        this.isReady = false;
        this.N = 0;
        this.M = 0;
        this.numChains = 0;
        this.samplingLock = null;  // Promise for current sampling operation
    }

    /**
     * Check if WebGPU is available
     */
    static isAvailable() {
        return !!navigator.gpu;
    }

    /**
     * Initialize WebGPU device and load shaders
     */
    async init() {
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No WebGPU adapter found");
        }

        try {
            this.device = await adapter.requestDevice();
        } catch (e) {
            console.error("WebGPU device request failed:", e);
            throw new Error("WebGPU device request failed: " + e.message);
        }

        // Inline shader code for Glauber sampling (no CFTP, just mixing)
        const shaderCode = `
struct Params {
    N: u32,
    M: u32,
    numChains: u32,
    stepsPerChain: u32,
    q_num: u32,
    q_denom: u32,
    _pad1: u32,
    _pad2: u32,
}

@group(0) @binding(0) var<storage, read_write> paths: array<u32>;      // Packed bits for all chains
@group(0) @binding(1) var<storage, read_write> rngState: array<u32>;  // PCG state per chain
@group(0) @binding(2) var<storage, read_write> middleY: array<i32>;   // y at x=N/2 for each chain
@group(0) @binding(3) var<uniform> params: Params;

fn pcg_next(chain: u32) -> u32 {
    let idx = chain * 2u;
    var state = rngState[idx];
    let inc = rngState[idx + 1u];
    state = state * 747796405u + inc;
    rngState[idx] = state;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn pcg_float(chain: u32) -> f32 {
    return f32(pcg_next(chain)) / 4294967296.0;
}

fn get_bit(chain: u32, pos: u32) -> u32 {
    let pathLen = params.N + params.M;
    let wordsPerChain = (pathLen + 31u) / 32u;
    let baseIdx = chain * wordsPerChain;
    let wordIdx = baseIdx + pos / 32u;
    let bitIdx = pos % 32u;
    return (paths[wordIdx] >> bitIdx) & 1u;
}

fn set_bit(chain: u32, pos: u32, value: u32) {
    let pathLen = params.N + params.M;
    let wordsPerChain = (pathLen + 31u) / 32u;
    let baseIdx = chain * wordsPerChain;
    let wordIdx = baseIdx + pos / 32u;
    let bitIdx = pos % 32u;
    if (value == 1u) {
        paths[wordIdx] = paths[wordIdx] | (1u << bitIdx);
    } else {
        paths[wordIdx] = paths[wordIdx] & ~(1u << bitIdx);
    }
}

fn glauber_step(chain: u32) {
    let pathLen = params.N + params.M;
    if (pathLen < 2u) { return; }

    let pos = pcg_next(chain) % (pathLen - 1u);
    let u = pcg_float(chain);
    let threshold = f32(params.q_num) / f32(params.q_num + params.q_denom);
    let wantAdd = u < threshold;

    let bit_i = get_bit(chain, pos);
    let bit_i1 = get_bit(chain, pos + 1u);

    if (wantAdd) {
        if (bit_i == 1u && bit_i1 == 0u) {
            set_bit(chain, pos, 0u);
            set_bit(chain, pos + 1u, 1u);
        }
    } else {
        if (bit_i == 0u && bit_i1 == 1u) {
            set_bit(chain, pos, 1u);
            set_bit(chain, pos + 1u, 0u);
        }
    }
}

fn compute_middle_y(chain: u32) -> i32 {
    let pathLen = params.N + params.M;
    let targetX = params.N / 2u;
    var x = 0u;
    var y = 0u;
    for (var i = 0u; i < pathLen; i = i + 1u) {
        if (x == targetX) {
            return i32(y);
        }
        let bit = get_bit(chain, i);
        if (bit == 0u) {
            x = x + 1u;
        } else {
            y = y + 1u;
        }
    }
    return i32(y);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let chain = global_id.x;
    if (chain >= params.numChains) { return; }

    // Run Glauber steps
    for (var s = 0u; s < params.stepsPerChain; s = s + 1u) {
        glauber_step(chain);
    }

    // Compute and store middleY
    middleY[chain] = compute_middle_y(chain);
}
`;

        this.shaderModule = this.device.createShaderModule({ code: shaderCode });

        // Check for shader compilation errors
        const compilationInfo = await this.shaderModule.getCompilationInfo();
        if (compilationInfo.messages.length > 0) {
            for (const msg of compilationInfo.messages) {
                console.warn(`Shader ${msg.type}: ${msg.message} at line ${msg.lineNum}`);
            }
        }

        // Create bind group layout (simpler - no lower/upper, just one path buffer)
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },  // paths
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },  // rngState
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },  // middleY
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }   // params
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout]
        });

        this.pipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'main' }
        });

        this.isReady = true;
        console.log("WebGPU Glauber Engine initialized");
    }

    /**
     * Run Glauber sampling from an initial path
     * @param {number} N - Width (right steps)
     * @param {number} M - Height (up steps)
     * @param {number} numChains - Number of parallel samples
     * @param {number[]} initialPath - Initial valid path (array of 0s and 1s, length N+M)
     * @param {number} stepsPerChain - Glauber steps per chain (default 20000)
     * @returns {Promise<Int32Array>} - middleY values for each chain
     */
    async sample(N, M, numChains, initialPath, stepsPerChain = 20000) {
        if (!this.isReady) throw new Error("Engine not initialized");

        // Wait for any previous sampling operation to complete
        if (this.samplingLock) {
            try {
                await this.samplingLock;
            } catch (e) {
                // Previous operation failed, continue with new one
            }
        }

        // Create a new lock for this operation
        let resolveLock;
        this.samplingLock = new Promise(resolve => { resolveLock = resolve; });

        console.log(`WebGPU sample: N=${N}, M=${M}, chains=${numChains}, steps=${stepsPerChain}`);

        try {
        this.N = N;
        this.M = M;
        this.numChains = numChains;

        const pathLen = N + M;
        const wordsPerChain = Math.ceil(pathLen / 32);
        const totalWords = wordsPerChain * numChains;

        // Pack initial path into words
        const initialWords = new Uint32Array(wordsPerChain);
        for (let i = 0; i < pathLen; i++) {
            if (initialPath[i] === 1) {
                const wordIdx = Math.floor(i / 32);
                const bitIdx = i % 32;
                initialWords[wordIdx] |= (1 << bitIdx);
            }
        }

        // Create path buffer with all chains starting from initial path
        const pathData = new Uint32Array(totalWords);
        for (let c = 0; c < numChains; c++) {
            for (let w = 0; w < wordsPerChain; w++) {
                pathData[c * wordsPerChain + w] = initialWords[w];
            }
        }

        this.pathsBuffer = this.device.createBuffer({
            size: totalWords * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.pathsBuffer, 0, pathData);

        // RNG state: 2 u32s per chain
        this.rngStateBuffer = this.device.createBuffer({
            size: numChains * 2 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const rngData = new Uint32Array(numChains * 2);
        for (let i = 0; i < numChains; i++) {
            rngData[i * 2] = Math.floor(Math.random() * 0xFFFFFFFF);
            rngData[i * 2 + 1] = (Math.floor(Math.random() * 0xFFFFFFFF) | 1);
        }
        this.device.queue.writeBuffer(this.rngStateBuffer, 0, rngData);

        // Middle Y values
        this.middleYBuffer = this.device.createBuffer({
            size: numChains * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        // Staging buffer for readback
        this.stagingBuffer = this.device.createBuffer({
            size: numChains * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Params buffer
        this.paramsBuffer = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const params = new Uint32Array([
            N, M, numChains, stepsPerChain,
            1, 1,  // q_num, q_denom (q=1 for uniform)
            0, 0
        ]);
        this.device.queue.writeBuffer(this.paramsBuffer, 0, params);

        // Create bind group
        this.bindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.pathsBuffer } },
                { binding: 1, resource: { buffer: this.rngStateBuffer } },
                { binding: 2, resource: { buffer: this.middleYBuffer } },
                { binding: 3, resource: { buffer: this.paramsBuffer } }
            ]
        });

        // Run compute shader
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(Math.ceil(numChains / 64));
        pass.end();

        // Copy results
        encoder.copyBufferToBuffer(this.middleYBuffer, 0, this.stagingBuffer, 0, numChains * 4);
        this.device.queue.submit([encoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();

        // Read results
        await this.stagingBuffer.mapAsync(GPUMapMode.READ);
        const middleYData = new Int32Array(this.stagingBuffer.getMappedRange().slice());
        this.stagingBuffer.unmap();

        // Cleanup
        this.pathsBuffer.destroy();
        this.rngStateBuffer.destroy();
        this.middleYBuffer.destroy();
        this.stagingBuffer.destroy();
        this.paramsBuffer.destroy();

        return middleYData;
        } finally {
            resolveLock();  // Release the lock
        }
    }

    destroy() {
        // Buffers are cleaned up after each sample() call
    }
}

// Make available globally
window.WebGPUQPartitionEngine = WebGPUQPartitionEngine;
