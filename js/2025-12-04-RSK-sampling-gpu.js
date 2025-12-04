/**
 * WebGPU RSK Sampling Engine (2025-12-04-RSK-sampling-gpu.js)
 *
 * Implements parallel sampleVH computation on GPU for Aztec diamond growth diagrams.
 * Uses anti-diagonal wavefront parallelization where cells (i,j) with i+j = constant
 * can be processed simultaneously.
 *
 * Used by: _simulations/domino_tilings/2025-12-04-RSK-sampling.md
 * Shader: shaders/2025-12-04-RSK-compute.wgsl
 */

class WebGPURSKEngine {
    constructor() {
        this.device = null;
        this.pipeline = null;
        this.isReady = false;
        this.shaderCode = null;

        // Buffers
        this.tauBuffer = null;       // Growth diagram partitions
        this.tauLenBuffer = null;    // Partition lengths
        this.paramsBuffer = null;    // Parameters (n, q, x, y, etc.)
        this.xBuffer = null;         // x parameters
        this.yBuffer = null;         // y parameters
        this.randomBuffer = null;    // Pre-generated random numbers
        this.outputBuffer = null;    // Output partitions
        this.stagingBuffer = null;   // For readback
    }

    async init() {
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No WebGPU adapter found");
        }

        this.device = await adapter.requestDevice({
            requiredLimits: {
                maxStorageBufferBindingSize: 256 * 1024 * 1024, // 256MB for large n
            }
        });

        // Load shader code
        try {
            const response = await fetch('/shaders/2025-12-04-RSK-compute.wgsl');
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${response.status}`);
            }
            this.shaderCode = await response.text();
        } catch (e) {
            console.error("Failed to load WGSL shader:", e);
            throw e;
        }

        const shaderModule = this.device.createShaderModule({
            code: this.shaderCode
        });

        this.pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main'
            }
        });

        this.isReady = true;
        console.log("WebGPU RSK Engine initialized");
    }

    /**
     * Sample Aztec diamond partition sequence using GPU
     * @param {number} n - Size of Aztec diamond
     * @param {Float64Array} x - x parameters (length n)
     * @param {Float64Array} y - y parameters (length n)
     * @param {number} q - q-Whittaker parameter
     * @returns {Promise<Array<Array<number>>>} Partition sequence
     */
    async sampleAztec(n, x, y, q) {
        if (!this.isReady) {
            throw new Error("WebGPU engine not initialized");
        }

        const startTime = performance.now();

        // For small n, just use CPU (GPU overhead not worth it)
        if (n < 10) {
            console.log("n too small for GPU, falling back to CPU");
            return null;
        }

        // Calculate buffer sizes
        // Growth diagram is triangular: tau[i][j] for i=0..n, j=0..(n-i)
        // Each partition has max length n
        // Total cells = sum(n+1-i for i=0..n) = (n+1)(n+2)/2
        const numCells = (n + 1) * (n + 2) / 2;
        const maxPartLen = n + 1;

        // tau buffer: numCells * maxPartLen int32 values
        const tauSize = numCells * maxPartLen * 4;
        // tauLen buffer: numCells int32 values
        const tauLenSize = numCells * 4;

        // Create buffers
        this.tauBuffer = this.device.createBuffer({
            size: tauSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.tauBuffer.getMappedRange()).fill(0);
        this.tauBuffer.unmap();

        this.tauLenBuffer = this.device.createBuffer({
            size: tauLenSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.tauLenBuffer.getMappedRange()).fill(0);
        this.tauLenBuffer.unmap();

        // Parameters buffer: n, q, maxPartLen, current_diagonal
        this.paramsBuffer = this.device.createBuffer({
            size: 32, // 8 x 4 bytes (alignment)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // x and y buffers
        this.xBuffer = this.device.createBuffer({
            size: n * 8, // float64
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float64Array(this.xBuffer.getMappedRange()).set(x.slice(0, n));
        this.xBuffer.unmap();

        this.yBuffer = this.device.createBuffer({
            size: n * 8,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float64Array(this.yBuffer.getMappedRange()).set(y.slice(0, n));
        this.yBuffer.unmap();

        // Random buffer - pre-generate all random numbers needed
        // Each cell needs multiple random numbers for sampling
        const maxRandomsPerCell = maxPartLen + 10; // island decisions + bernoulli
        const randomSize = numCells * maxRandomsPerCell * 4;
        this.randomBuffer = this.device.createBuffer({
            size: randomSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        const randoms = new Float32Array(this.randomBuffer.getMappedRange());
        for (let i = 0; i < randoms.length; i++) {
            randoms[i] = Math.random();
        }
        this.randomBuffer.unmap();

        // Output staging buffer
        this.stagingBuffer = this.device.createBuffer({
            size: tauSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        const stagingLenBuffer = this.device.createBuffer({
            size: tauLenSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Create bind group
        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.tauBuffer } },
                { binding: 1, resource: { buffer: this.tauLenBuffer } },
                { binding: 2, resource: { buffer: this.paramsBuffer } },
                { binding: 3, resource: { buffer: this.xBuffer } },
                { binding: 4, resource: { buffer: this.yBuffer } },
                { binding: 5, resource: { buffer: this.randomBuffer } }
            ]
        });

        // Process anti-diagonals wavefront style
        // Anti-diagonal k contains cells (i, j) where i + j = k
        // k ranges from 1 to 2n (the actual filled cells start at (1,1))
        for (let diag = 1; diag <= 2 * n; diag++) {
            // Count cells on this diagonal
            let cellsOnDiag = 0;
            for (let i = Math.max(1, diag - n); i <= Math.min(n, diag); i++) {
                const j = diag - i;
                if (j >= 1 && j <= n + 1 - i) {
                    cellsOnDiag++;
                }
            }

            if (cellsOnDiag === 0) continue;

            // Update params
            const paramsData = new ArrayBuffer(32);
            const paramsInt = new Int32Array(paramsData);
            const paramsFloat = new Float32Array(paramsData);
            paramsInt[0] = n;
            paramsFloat[1] = q;
            paramsInt[2] = maxPartLen;
            paramsInt[3] = diag;
            paramsInt[4] = numCells;
            paramsInt[5] = maxRandomsPerCell;
            this.device.queue.writeBuffer(this.paramsBuffer, 0, paramsData);

            // Dispatch compute
            const workgroupCount = Math.ceil(cellsOnDiag / 64);
            const commandEncoder = this.device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.dispatchWorkgroups(workgroupCount);
            passEncoder.end();
            this.device.queue.submit([commandEncoder.finish()]);
        }

        // Wait for all work to complete
        await this.device.queue.onSubmittedWorkDone();

        // Read back results
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.tauBuffer, 0, this.stagingBuffer, 0, tauSize);
        commandEncoder.copyBufferToBuffer(this.tauLenBuffer, 0, stagingLenBuffer, 0, tauLenSize);
        this.device.queue.submit([commandEncoder.finish()]);

        await this.stagingBuffer.mapAsync(GPUMapMode.READ);
        await stagingLenBuffer.mapAsync(GPUMapMode.READ);

        const tauData = new Int32Array(this.stagingBuffer.getMappedRange().slice(0));
        const tauLenData = new Int32Array(stagingLenBuffer.getMappedRange().slice(0));

        this.stagingBuffer.unmap();
        stagingLenBuffer.unmap();

        // Extract output path partitions
        const partitions = this.extractOutputPath(tauData, tauLenData, n, maxPartLen);

        // Cleanup
        this.cleanup();
        stagingLenBuffer.destroy();

        const elapsed = performance.now() - startTime;
        console.log(`GPU RSK sampling completed in ${elapsed.toFixed(1)}ms`);

        return partitions;
    }

    /**
     * Extract output path partitions from growth diagram
     */
    extractOutputPath(tauData, tauLenData, n, maxPartLen) {
        // Helper to get cell index in flattened array
        const getCellIndex = (i, j) => {
            // Cells are stored row by row
            // Row i has (n+1-i) cells for j = 0, 1, ..., n-i
            let idx = 0;
            for (let row = 0; row < i; row++) {
                idx += (n + 1 - row);
            }
            return idx + j;
        };

        // Helper to get partition at (i, j)
        const getPartition = (i, j) => {
            const cellIdx = getCellIndex(i, j);
            const len = tauLenData[cellIdx];
            const start = cellIdx * maxPartLen;
            const result = [];
            for (let k = 0; k < len; k++) {
                result.push(tauData[start + k]);
            }
            return result;
        };

        // Output path goes from (0, n) to (n, 0)
        const outputPath = [];
        let i = 0, j = n;
        outputPath.push([i, j]);
        while (i !== n || j !== 0) {
            if (j <= n - i && i < n) {
                i++;
            } else {
                j--;
            }
            outputPath.push([i, j]);
        }

        // Collect partitions in reverse order
        const result = [];
        for (let k = outputPath.length - 1; k >= 0; k--) {
            const [pi, pj] = outputPath[k];
            result.push(getPartition(pi, pj));
        }

        return result;
    }

    /**
     * Cleanup GPU resources
     */
    cleanup() {
        if (this.tauBuffer) { this.tauBuffer.destroy(); this.tauBuffer = null; }
        if (this.tauLenBuffer) { this.tauLenBuffer.destroy(); this.tauLenBuffer = null; }
        if (this.paramsBuffer) { this.paramsBuffer.destroy(); this.paramsBuffer = null; }
        if (this.xBuffer) { this.xBuffer.destroy(); this.xBuffer = null; }
        if (this.yBuffer) { this.yBuffer.destroy(); this.yBuffer = null; }
        if (this.randomBuffer) { this.randomBuffer.destroy(); this.randomBuffer = null; }
        if (this.stagingBuffer) { this.stagingBuffer.destroy(); this.stagingBuffer = null; }
    }

    /**
     * Check if engine is ready
     */
    isInitialized() {
        return this.isReady;
    }

    /**
     * Destroy engine
     */
    destroy() {
        this.cleanup();
        this.isReady = false;
    }
}

// Make available globally
window.WebGPURSKEngine = WebGPURSKEngine;
