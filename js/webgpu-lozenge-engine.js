/**
 * WebGPU Lozenge Tiling Engine
 *
 * Implements Glauber dynamics on the GPU using WebGPU compute shaders.
 * Works alongside WASM engine which handles topology initialization.
 *
 * Used by: _simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md
 */

class WebGPULozengeEngine {
    constructor() {
        this.device = null;
        this.pipeline = null;
        this.gridBuffer = null;
        this.uniformBuffer = null;
        this.weightsBuffer = null;  // Per-cell q values
        this.stagingBuffer = null;
        this.bindGroup = null;
        this.isReady = false;
        this.gridParams = {};
        this.shaderCode = null;
        this.useWeights = false;    // Whether to use per-cell weights
    }

    async init() {
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No WebGPU adapter found");
        }

        this.device = await adapter.requestDevice();
        this.deviceLost = false;

        // Handle device lost (iOS can kill GPU under memory pressure)
        this.device.lost.then((info) => {
            console.error('[GPU] Device lost:', info.reason, info.message);
            this.deviceLost = true;
            this.isReady = false;
        });

        // Load shader code
        try {
            const response = await fetch('/shaders/lozenge_compute.wgsl');
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
        console.log("WebGPU Lozenge Engine initialized");
    }

    /**
     * Initialize from WASM state data
     * @param {Int32Array} gridData - The dimerGrid data from WASM (as int32)
     * @param {number} minN - Minimum N coordinate
     * @param {number} maxN - Maximum N coordinate
     * @param {number} minJ - Minimum J coordinate
     * @param {number} maxJ - Maximum J coordinate
     */
    initFromWasmData(gridData, minN, maxN, minJ, maxJ) {
        if (!this.isReady) {
            console.error("WebGPU engine not initialized");
            return;
        }

        const strideJ = maxJ - minJ + 1;
        this.gridParams = { minN, maxN, minJ, maxJ, strideJ };
        this.numCells = gridData.length;

        // Create Storage Buffer for the Grid
        this.gridBuffer = this.device.createBuffer({
            size: gridData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.gridBuffer.getMappedRange()).set(gridData);
        this.gridBuffer.unmap();

        // Create Weights Buffer for per-cell q values (default to 1.0)
        this.weightsBuffer = this.device.createBuffer({
            size: gridData.length * 4,  // float32 per cell
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        const defaultWeights = new Float32Array(this.weightsBuffer.getMappedRange());
        defaultWeights.fill(1.0);  // Default q=1.0 for all cells
        this.weightsBuffer.unmap();

        // Create 4 Uniform Buffers (one per color pass) to enable batching
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, use_weights, rand_seed, _pad
        this.uniformBuffers = [];
        this.bindGroups = [];
        for (let color = 0; color < 4; color++) {
            const uniformBuffer = this.device.createBuffer({
                size: 40,  // 10 x 4 bytes
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.uniformBuffers.push(uniformBuffer);
        }

        // Create Staging Buffer for readback
        this.stagingBuffer = this.device.createBuffer({
            size: gridData.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Create Bind Groups (one per color pass)
        for (let color = 0; color < 4; color++) {
            const bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.gridBuffer } },
                    { binding: 1, resource: { buffer: this.uniformBuffers[color] } },
                    { binding: 2, resource: { buffer: this.weightsBuffer } }
                ]
            });
            this.bindGroups.push(bindGroup);
        }

        console.log(`WebGPU grid initialized: ${gridData.length} cells, bounds (${minN},${maxN}) x (${minJ},${maxJ})`);
    }

    /**
     * Update grid from WASM data (for re-sync after topology changes)
     * @param {Int32Array} gridData - The dimerGrid data from WASM
     */
    updateGrid(gridData) {
        if (!this.isReady || !this.gridBuffer) {
            return;
        }
        this.device.queue.writeBuffer(this.gridBuffer, 0, gridData);
    }

    /**
     * Set per-cell weights from periodic weight matrix
     * @param {number[][]} periodicQ - 2D array of q values [periodicK][periodicK]
     * @param {number} periodicK - Period size
     * @param {boolean} usePeriodicWeights - Whether to enable periodic weights
     */
    setWeights(periodicQ, periodicK, usePeriodicWeights) {
        if (!this.isReady || !this.weightsBuffer) return;

        this.useWeights = usePeriodicWeights;

        if (!usePeriodicWeights) {
            // Will use global q_bias instead
            return;
        }

        // Compute per-cell q values based on periodic pattern
        const { minN, maxN, minJ, maxJ, strideJ } = this.gridParams;
        const weights = new Float32Array(this.numCells);

        for (let n = minN; n <= maxN; n++) {
            for (let j = minJ; j <= maxJ; j++) {
                const idx = (n - minN) * strideJ + (j - minJ);
                // Handle negative modulo correctly
                const ni = ((n % periodicK) + periodicK) % periodicK;
                const ji = ((j % periodicK) + periodicK) % periodicK;
                weights[idx] = periodicQ[ni][ji];
            }
        }

        this.device.queue.writeBuffer(this.weightsBuffer, 0, weights);
    }

    /**
     * Perform simulation steps using chromatic sweep
     * @param {number} numSteps - Number of full sweeps
     * @param {number} qBias - The q-bias parameter (default 1.0 for uniform)
     */
    async step(numSteps, qBias = 1.0) {
        if (!this.isReady || !this.gridBuffer) {
            return;
        }

        const workgroupCount = Math.ceil(this.gridBuffer.size / 4 / 64);

        // Pre-allocate uniform data template
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, use_weights, rand_seed, _pad
        const uniformData = new ArrayBuffer(40);
        const intView = new Int32Array(uniformData);
        const floatView = new Float32Array(uniformData);
        const uintView = new Uint32Array(uniformData);

        intView[0] = this.gridParams.minN;
        intView[1] = this.gridParams.maxN;
        intView[2] = this.gridParams.minJ;
        intView[3] = this.gridParams.maxJ;
        intView[4] = this.gridParams.strideJ;
        floatView[6] = qBias;
        uintView[7] = this.useWeights ? 1 : 0;
        uintView[9] = 0;  // padding

        // Per-step writeBuffer + submit: each step gets a fresh RNG seed.
        // writeBuffer and submit are ordered by the queue, so the GPU sees
        // correct uniforms for each step without needing per-step await.
        for (let i = 0; i < numSteps; i++) {
            const seed = Math.floor(Math.random() * 4294967295);
            for (let color = 0; color < 4; color++) {
                intView[5] = color;
                uintView[8] = seed;
                this.device.queue.writeBuffer(this.uniformBuffers[color], 0, uniformData);
            }

            const commandEncoder = this.device.createCommandEncoder();
            for (let color = 0; color < 4; color++) {
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(this.pipeline);
                passEncoder.setBindGroup(0, this.bindGroups[color]);
                passEncoder.dispatchWorkgroups(workgroupCount);
                passEncoder.end();
            }
            this.device.queue.submit([commandEncoder.finish()]);
        }

        // Wait for GPU work to complete
        await this.device.queue.onSubmittedWorkDone();
    }

    /**
     * Read grid data back from GPU
     * @returns {Promise<Int32Array>} The current grid state
     */
    async getGridData() {
        if (!this.isReady || !this.gridBuffer) {
            return null;
        }

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(
            this.gridBuffer, 0,
            this.stagingBuffer, 0,
            this.gridBuffer.size
        );
        this.device.queue.submit([commandEncoder.finish()]);

        await this.stagingBuffer.mapAsync(GPUMapMode.READ);
        try {
            const data = new Int32Array(this.stagingBuffer.getMappedRange().slice(0));
            return data;
        } finally {
            this.stagingBuffer.unmap();
        }
    }

    /**
     * Convert grid data to dimer array format expected by renderer
     * @param {Int32Array} gridData - Grid data from getGridData()
     * @param {Array} blackTriangles - Black triangles from WASM
     * @returns {Array} Array of dimer objects {bn, bj, wn, wj, t}
     */
    gridToDimers(gridData, blackTriangles) {
        const dimers = [];
        const { minN, maxN, minJ, maxJ, strideJ } = this.gridParams;

        for (const bt of blackTriangles) {
            if (bt.n >= minN && bt.n <= maxN && bt.j >= minJ && bt.j <= maxJ) {
                const gridIdx = (bt.n - minN) * strideJ + (bt.j - minJ);
                if (gridIdx >= 0 && gridIdx < gridData.length) {
                    const type = gridData[gridIdx];
                    if (type >= 0 && type <= 2) {
                        let wn, wj;
                        switch (type) {
                            case 0: wn = bt.n; wj = bt.j; break;      // diagonal
                            case 1: wn = bt.n; wj = bt.j - 1; break;  // bottom
                            case 2: wn = bt.n - 1; wj = bt.j; break;  // left vertical
                            default: wn = bt.n; wj = bt.j; break;
                        }
                        dimers.push({ bn: bt.n, bj: bt.j, wn, wj, t: type });
                    }
                }
            }
        }

        return dimers;
    }

    /**
     * Get dimers from GPU (convenience method combining getGridData + gridToDimers)
     * @param {Array} blackTriangles - Black triangles from WASM
     * @returns {Promise<Array>} Array of dimer objects
     */
    async getDimers(blackTriangles) {
        const gridData = await this.getGridData();
        if (!gridData) {
            return [];
        }
        return this.gridToDimers(gridData, blackTriangles);
    }

    /**
     * Check if engine is ready
     * @returns {boolean}
     */
    isInitialized() {
        return this.isReady && this.gridBuffer !== null;
    }

    /**
     * Clean up GPU resources
     */
    destroy() {
        if (this.gridBuffer) {
            this.gridBuffer.destroy();
            this.gridBuffer = null;
        }
        if (this.weightsBuffer) {
            this.weightsBuffer.destroy();
            this.weightsBuffer = null;
        }
        if (this.uniformBuffers) {
            for (const buf of this.uniformBuffers) {
                buf.destroy();
            }
            this.uniformBuffers = [];
        }
        if (this.stagingBuffer) {
            this.stagingBuffer.destroy();
            this.stagingBuffer = null;
        }
        this.bindGroups = [];
        this.destroyCFTP();
        this.destroyFluctuationsCFTP();
        // Pipelines are stateless and shared across CFTP/fluctuations sessions;
        // only null them on full engine teardown.
        this.cftpPipeline = null;
        this.coalescePipeline = null;
    }

    // =========================================================================
    // CFTP (Coupling From The Past) Methods
    // =========================================================================

    async _initCoalescePipeline() {
        if (this.coalescePipeline) return;
        const response = await fetch('/shaders/cftp_coalesce.wgsl');
        if (!response.ok) throw new Error(`Failed to load coalesce shader: ${response.status}`);
        const code = await response.text();
        const module = this.device.createShaderModule({ code });
        this.coalescePipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: { module, entryPoint: 'main' }
        });
    }

    /**
     * Initialize CFTP with lower and upper chain buffers
     * @param {Int32Array} minStateData - Extremal min state from WASM
     * @param {Int32Array} maxStateData - Extremal max state from WASM
     */
    async initCFTP(minStateData, maxStateData) {
        if (!this.isReady) {
            console.error("WebGPU engine not initialized");
            return false;
        }

        // Load CFTP shader if not already loaded
        if (!this.cftpPipeline) {
            try {
                const response = await fetch('/shaders/cftp_compute.wgsl');
                if (!response.ok) {
                    throw new Error(`Failed to load CFTP shader: ${response.status}`);
                }
                const cftpShaderCode = await response.text();
                const shaderModule = this.device.createShaderModule({ code: cftpShaderCode });
                this.cftpPipeline = this.device.createComputePipeline({
                    layout: 'auto',
                    compute: { module: shaderModule, entryPoint: 'main' }
                });
            } catch (e) {
                console.error("Failed to load CFTP shader:", e);
                return false;
            }
        }

        const gridSize = minStateData.byteLength;

        // Create lower chain buffer (starts at min state)
        this.lowerGridBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.lowerGridBuffer.getMappedRange()).set(minStateData);
        this.lowerGridBuffer.unmap();

        // Create upper chain buffer (starts at max state)
        this.upperGridBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.upperGridBuffer.getMappedRange()).set(maxStateData);
        this.upperGridBuffer.unmap();

        const numCells = minStateData.length;

        // Create 4 CFTP uniform buffers (one per color pass for batching)
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, use_weights, rand_seed, _pad
        this.cftpUniformBuffers = [];
        for (let color = 0; color < 4; color++) {
            this.cftpUniformBuffers.push(this.device.createBuffer({
                size: 40,  // 10 x 4 bytes
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }

        // Create CFTP weights buffer (copy from main weights buffer)
        this.cftpWeightsBuffer = this.device.createBuffer({
            size: numCells * 4,  // float32 per cell
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        const cftpWeights = new Float32Array(this.cftpWeightsBuffer.getMappedRange());
        cftpWeights.fill(1.0);  // Default q=1.0
        this.cftpWeightsBuffer.unmap();

        // Staging buffers for result/bounds readback (getCFTPResult, getCFTPBounds)
        this.lowerStagingBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this.upperStagingBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // GPU-side coalescence check buffers (4-byte diff count instead of full grid readback)
        try {
            await this._initCoalescePipeline();
        } catch (e) {
            console.error("Failed to init coalesce pipeline:", e);
            this.destroyCFTP();
            return false;
        }
        this.coalesceResultBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.coalesceStagingBuffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this.coalesceBindGroup = this.device.createBindGroup({
            layout: this.coalescePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.lowerGridBuffer } },
                { binding: 1, resource: { buffer: this.upperGridBuffer } },
                { binding: 2, resource: { buffer: this.coalesceResultBuffer } }
            ]
        });

        // Create bind groups for lower and upper chains (4 per chain, one per color)
        // Shader bindings: 0=grid, 1=params(uniform), 2=weights
        this.lowerBindGroups = [];
        this.upperBindGroups = [];
        for (let color = 0; color < 4; color++) {
            this.lowerBindGroups.push(this.device.createBindGroup({
                layout: this.cftpPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.lowerGridBuffer } },
                    { binding: 1, resource: { buffer: this.cftpUniformBuffers[color] } },
                    { binding: 2, resource: { buffer: this.cftpWeightsBuffer } }
                ]
            }));
            this.upperBindGroups.push(this.device.createBindGroup({
                layout: this.cftpPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.upperGridBuffer } },
                    { binding: 1, resource: { buffer: this.cftpUniformBuffers[color] } },
                    { binding: 2, resource: { buffer: this.cftpWeightsBuffer } }
                ]
            }));
        }

        this.cftpNumCells = numCells;
        this.cftpInitialized = true;
        console.log(`WebGPU CFTP initialized: ${numCells} cells`);
        return true;
    }

    /**
     * Reset CFTP chains to extremal states
     * @param {Int32Array} minStateData - Extremal min state
     * @param {Int32Array} maxStateData - Extremal max state
     */
    resetCFTPChains(minStateData, maxStateData) {
        if (!this.cftpInitialized) return;
        this.device.queue.writeBuffer(this.lowerGridBuffer, 0, minStateData);
        this.device.queue.writeBuffer(this.upperGridBuffer, 0, maxStateData);
    }

    /**
     * Set CFTP weights from periodic weight matrix (call before stepCFTP)
     * @param {number[][]} periodicQ - 2D array of q values [periodicK][periodicK]
     * @param {number} periodicK - Period size
     * @param {boolean} usePeriodicWeights - Whether to enable periodic weights
     * @param {number} qBias - Global q bias (used when usePeriodicWeights=false)
     */
    setCFTPWeights(periodicQ, periodicK, usePeriodicWeights, qBias = 1.0) {
        if (!this.cftpInitialized || !this.cftpWeightsBuffer) return;

        this.cftpUseWeights = usePeriodicWeights;
        this.cftpQBias = qBias;

        if (!usePeriodicWeights) {
            return;
        }

        // Compute per-cell q values based on periodic pattern
        const { minN, maxN, minJ, maxJ, strideJ } = this.gridParams;
        const weights = new Float32Array(this.cftpNumCells);

        for (let n = minN; n <= maxN; n++) {
            for (let j = minJ; j <= maxJ; j++) {
                const idx = (n - minN) * strideJ + (j - minJ);
                const ni = ((n % periodicK) + periodicK) % periodicK;
                const ji = ((j % periodicK) + periodicK) % periodicK;
                weights[idx] = periodicQ[ni][ji];
            }
        }

        this.device.queue.writeBuffer(this.cftpWeightsBuffer, 0, weights);
    }

    /**
     * Run CFTP coupled steps on GPU with early stopping
     * Batches multiple steps: builds per-step command buffers, submits all at once.
     * writeBuffer + submit per step ensures correct seed ordering; batching
     * avoids per-step await and reduces JS-to-GPU round trips.
     * @param {number} numSteps - Number of coupled steps to run
     * @param {number} checkInterval - Check coalescence every N steps (0 = no early check)
     * @returns {Promise<{coalesced: boolean, stepsRun: number}>}
     */
    async stepCFTP(numSteps, checkInterval = 0) {
        if (!this.cftpInitialized) return { coalesced: false, stepsRun: 0 };
        if (this.deviceLost) {
            console.error('[GPU] Device was lost, cannot step CFTP');
            throw new Error('GPU device lost');
        }

        const workgroupCount = Math.ceil(this.cftpNumCells / 64);
        const qBias = this.cftpQBias || 1.0;
        const useWeights = this.cftpUseWeights ? 1 : 0;

        // Pre-allocate uniform data template
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, use_weights, rand_seed, _pad
        const uniformData = new ArrayBuffer(40);
        const intView = new Int32Array(uniformData);
        const floatView = new Float32Array(uniformData);
        const uintView = new Uint32Array(uniformData);

        intView[0] = this.gridParams.minN;
        intView[1] = this.gridParams.maxN;
        intView[2] = this.gridParams.minJ;
        intView[3] = this.gridParams.maxJ;
        intView[4] = this.gridParams.strideJ;
        floatView[6] = qBias;
        uintView[7] = useWeights;
        uintView[9] = 0;  // padding

        let stepsRun = 0;

        // Determine batch boundaries: split at checkInterval points
        const batchSize = (checkInterval > 0) ? checkInterval : numSteps;

        while (stepsRun < numSteps) {
            const stepsThisBatch = Math.min(batchSize, numSteps - stepsRun);

            try {
                // Build and submit per-step command buffers in a tight loop without awaiting.
                // Each step: writeBuffer (queue op) then submit (queue op) are ordered by the queue.
                // No await between steps means the GPU driver pipelines them efficiently.
                for (let s = 0; s < stepsThisBatch; s++) {
                    const seed = Math.floor(Math.random() * 4294967295);

                    for (let color = 0; color < 4; color++) {
                        intView[5] = color;
                        uintView[8] = seed;
                        this.device.queue.writeBuffer(this.cftpUniformBuffers[color], 0, uniformData);
                    }

                    const commandEncoder = this.device.createCommandEncoder();
                    for (let color = 0; color < 4; color++) {
                        const lowerPass = commandEncoder.beginComputePass();
                        lowerPass.setPipeline(this.cftpPipeline);
                        lowerPass.setBindGroup(0, this.lowerBindGroups[color]);
                        lowerPass.dispatchWorkgroups(workgroupCount);
                        lowerPass.end();

                        const upperPass = commandEncoder.beginComputePass();
                        upperPass.setPipeline(this.cftpPipeline);
                        upperPass.setBindGroup(0, this.upperBindGroups[color]);
                        upperPass.dispatchWorkgroups(workgroupCount);
                        upperPass.end();
                    }
                    this.device.queue.submit([commandEncoder.finish()]);
                }
            } catch (e) {
                console.error('[GPU] Compute dispatch failed at step', stepsRun, ':', e);
                throw e;
            }

            stepsRun += stepsThisBatch;

            // Pure doubling: no early coalescence check mid-epoch.
            // Coalescence is checked only after running all T steps.
        }

        // Wait for GPU to finish after all batches
        try {
            await this.device.queue.onSubmittedWorkDone();
        } catch (e) {
            console.error('[GPU] onSubmittedWorkDone failed:', e);
        }
        return { coalesced: false, stepsRun };
    }

    /**
     * GPU-side coalescence check: dispatch coalesce shader and read back 4-byte diff count
     */
    async checkCoalescence() {
        if (!this.cftpInitialized) return false;

        const workgroupCount = Math.ceil(this.cftpNumCells / 64);
        const commandEncoder = this.device.createCommandEncoder();
        // Clear result to 0
        commandEncoder.clearBuffer(this.coalesceResultBuffer);
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(this.coalescePipeline);
        pass.setBindGroup(0, this.coalesceBindGroup);
        pass.dispatchWorkgroups(workgroupCount);
        pass.end();
        commandEncoder.copyBufferToBuffer(this.coalesceResultBuffer, 0, this.coalesceStagingBuffer, 0, 4);
        this.device.queue.submit([commandEncoder.finish()]);

        await this.coalesceStagingBuffer.mapAsync(GPUMapMode.READ);
        try {
            const diffCount = new Uint32Array(this.coalesceStagingBuffer.getMappedRange().slice(0))[0];
            return diffCount === 0;
        } finally {
            this.coalesceStagingBuffer.unmap();
        }
    }

    /**
     * Get the coalesced result (lower chain)
     * @returns {Promise<Int32Array>} The coalesced grid state
     */
    async getCFTPResult() {
        if (!this.cftpInitialized) return null;

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.lowerGridBuffer, 0, this.lowerStagingBuffer, 0, this.lowerGridBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);

        await this.lowerStagingBuffer.mapAsync(GPUMapMode.READ);
        try {
            const data = new Int32Array(this.lowerStagingBuffer.getMappedRange().slice(0));
            return data;
        } finally {
            this.lowerStagingBuffer.unmap();
        }
    }

    /**
     * Get current min (lower) and max (upper) chain states during CFTP
     * @param {Array} blackTriangles - Black triangles from WASM for conversion
     * @returns {Promise<{minDimers: Array, maxDimers: Array}>}
     */
    async getCFTPBounds(blackTriangles) {
        if (!this.cftpInitialized) return { minDimers: [], maxDimers: [] };

        // Copy both grids to staging buffers
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.lowerGridBuffer, 0, this.lowerStagingBuffer, 0, this.lowerGridBuffer.size);
        commandEncoder.copyBufferToBuffer(this.upperGridBuffer, 0, this.upperStagingBuffer, 0, this.upperGridBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);

        // Read back both grids in parallel
        await Promise.all([
            this.lowerStagingBuffer.mapAsync(GPUMapMode.READ),
            this.upperStagingBuffer.mapAsync(GPUMapMode.READ)
        ]);

        let lowerData, upperData;
        try {
            lowerData = new Int32Array(this.lowerStagingBuffer.getMappedRange().slice(0));
            upperData = new Int32Array(this.upperStagingBuffer.getMappedRange().slice(0));
        } finally {
            this.lowerStagingBuffer.unmap();
            this.upperStagingBuffer.unmap();
        }

        // Convert to dimer arrays
        const minDimers = this.gridToDimers(lowerData, blackTriangles);
        const maxDimers = this.gridToDimers(upperData, blackTriangles);

        return { minDimers, maxDimers };
    }

    /**
     * Copy CFTP result to main grid buffer
     */
    finalizeCFTP() {
        if (!this.cftpInitialized || !this.gridBuffer) return;

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.lowerGridBuffer, 0, this.gridBuffer, 0, this.lowerGridBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Clean up CFTP resources
     */
    destroyCFTP() {
        if (this.lowerGridBuffer) { this.lowerGridBuffer.destroy(); this.lowerGridBuffer = null; }
        if (this.upperGridBuffer) { this.upperGridBuffer.destroy(); this.upperGridBuffer = null; }
        if (this.cftpWeightsBuffer) { this.cftpWeightsBuffer.destroy(); this.cftpWeightsBuffer = null; }
        if (this.cftpUniformBuffers) {
            for (const buf of this.cftpUniformBuffers) buf.destroy();
            this.cftpUniformBuffers = [];
        }
        if (this.lowerStagingBuffer) { this.lowerStagingBuffer.destroy(); this.lowerStagingBuffer = null; }
        if (this.upperStagingBuffer) { this.upperStagingBuffer.destroy(); this.upperStagingBuffer = null; }
        if (this.coalesceResultBuffer) { this.coalesceResultBuffer.destroy(); this.coalesceResultBuffer = null; }
        if (this.coalesceStagingBuffer) { this.coalesceStagingBuffer.destroy(); this.coalesceStagingBuffer = null; }
        this.coalesceBindGroup = null;
        this.lowerBindGroups = [];
        this.upperBindGroups = [];
        // Note: cftpPipeline and coalescePipeline are NOT nulled here -- they are
        // stateless, reusable across CFTP/fluctuations sessions, and re-creating them
        // requires shader recompilation. They are cleaned up in destroy() instead.
        this.cftpInitialized = false;
    }

    /**
     * Check if CFTP is initialized
     * @returns {boolean}
     */
    isCFTPInitialized() {
        return this.cftpInitialized === true;
    }

    // =========================================================================
    // Fluctuations CFTP Methods (2 independent pairs for 2 samples)
    // =========================================================================

    /**
     * Initialize fluctuations CFTP with 2 independent pairs
     * @param {Int32Array} minStateData - Extremal min state
     * @param {Int32Array} maxStateData - Extremal max state
     */
    async initFluctuationsCFTP(minStateData, maxStateData) {
        if (!this.isReady) {
            console.error("WebGPU engine not initialized");
            return false;
        }

        // Ensure CFTP pipeline is loaded
        if (!this.cftpPipeline) {
            try {
                const response = await fetch('/shaders/cftp_compute.wgsl');
                if (!response.ok) throw new Error(`Failed to load CFTP shader: ${response.status}`);
                const cftpShaderCode = await response.text();
                const shaderModule = this.device.createShaderModule({ code: cftpShaderCode });
                this.cftpPipeline = this.device.createComputePipeline({
                    layout: 'auto',
                    compute: { module: shaderModule, entryPoint: 'main' }
                });
            } catch (e) {
                console.error("Failed to load CFTP shader:", e);
                return false;
            }
        }

        const gridSize = minStateData.byteLength;
        const numCells = minStateData.length;

        // Create 4 grid buffers (2 pairs: pair0 lower/upper, pair1 lower/upper)
        this.fluctGridBuffers = [];
        for (let i = 0; i < 4; i++) {
            const buf = this.device.createBuffer({
                size: gridSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true
            });
            // Initialize: even indices (0,2) are lower chains (min), odd (1,3) are upper chains (max)
            const data = (i % 2 === 0) ? minStateData : maxStateData;
            new Int32Array(buf.getMappedRange()).set(data);
            buf.unmap();
            this.fluctGridBuffers.push(buf);
        }

        // Create uniform buffers: 4 colors × 2 pairs = 8
        // Each pair needs its own seed, so we need separate uniform buffers per pair
        this.fluctUniformBuffers = [];
        for (let pair = 0; pair < 2; pair++) {
            for (let color = 0; color < 4; color++) {
                this.fluctUniformBuffers.push(this.device.createBuffer({
                    size: 40,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }));
            }
        }

        // Create weights buffer for fluctuations
        this.fluctWeightsBuffer = this.device.createBuffer({
            size: numCells * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.fluctWeightsBuffer.getMappedRange()).fill(1.0);
        this.fluctWeightsBuffer.unmap();

        // Staging buffers for sample readback (grids 0 and 2 = lower chains)
        this.fluctStagingBuffers = [
            this.device.createBuffer({ size: gridSize, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST }),
            null,  // not used
            this.device.createBuffer({ size: gridSize, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST }),
            null   // not used
        ];

        // GPU-side coalescence check buffers for 2 pairs (4-byte diff count each)
        try {
            await this._initCoalescePipeline();
        } catch (e) {
            console.error("Failed to init coalesce pipeline:", e);
            this.destroyFluctuationsCFTP();
            return false;
        }
        this.fluctCoalesceResultBuffers = [];
        this.fluctCoalesceStagingBuffers = [];
        this.fluctCoalesceBindGroups = [];
        for (let pair = 0; pair < 2; pair++) {
            const resultBuf = this.device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
            });
            const stagingBuf = this.device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });
            this.fluctCoalesceResultBuffers.push(resultBuf);
            this.fluctCoalesceStagingBuffers.push(stagingBuf);
            // Bind group comparing lower (pair*2) vs upper (pair*2+1)
            this.fluctCoalesceBindGroups.push(this.device.createBindGroup({
                layout: this.coalescePipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.fluctGridBuffers[pair * 2] } },
                    { binding: 1, resource: { buffer: this.fluctGridBuffers[pair * 2 + 1] } },
                    { binding: 2, resource: { buffer: resultBuf } }
                ]
            }));
        }

        // Create bind groups: 4 grids × 4 colors = 16 bind groups
        // fluctBindGroups[gridIdx][colorIdx]
        // Shader bindings: 0=grid, 1=params(uniform), 2=weights
        // Each pair shares the same seed (for coupling), so grids in same pair use same uniform buffer
        this.fluctBindGroups = [];
        for (let gridIdx = 0; gridIdx < 4; gridIdx++) {
            const pairIdx = Math.floor(gridIdx / 2); // 0,1 -> pair0, 2,3 -> pair1
            const colorGroups = [];
            for (let color = 0; color < 4; color++) {
                const uniformIdx = pairIdx * 4 + color;
                colorGroups.push(this.device.createBindGroup({
                    layout: this.cftpPipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: { buffer: this.fluctGridBuffers[gridIdx] } },
                        { binding: 1, resource: { buffer: this.fluctUniformBuffers[uniformIdx] } },
                        { binding: 2, resource: { buffer: this.fluctWeightsBuffer } }
                    ]
                }));
            }
            this.fluctBindGroups.push(colorGroups);
        }

        this.fluctNumCells = numCells;
        this.fluctMinState = minStateData;
        this.fluctMaxState = maxStateData;
        this.fluctCoalesced = [false, false]; // Track each pair
        this.fluctInitialized = true;
        console.log(`WebGPU Fluctuations CFTP initialized: ${numCells} cells, 2 pairs`);
        return true;
    }

    /**
     * Set fluctuation weights
     */
    setFluctuationsWeights(periodicQ, periodicK, usePeriodicWeights, qBias = 1.0) {
        if (!this.fluctInitialized || !this.fluctWeightsBuffer) return;

        this.fluctUseWeights = usePeriodicWeights;
        this.fluctQBias = qBias;

        if (!usePeriodicWeights) return;

        const { minN, maxN, minJ, maxJ, strideJ } = this.gridParams;
        const weights = new Float32Array(this.fluctNumCells);

        for (let n = minN; n <= maxN; n++) {
            for (let j = minJ; j <= maxJ; j++) {
                const idx = (n - minN) * strideJ + (j - minJ);
                const ni = ((n % periodicK) + periodicK) % periodicK;
                const ji = ((j % periodicK) + periodicK) % periodicK;
                weights[idx] = periodicQ[ni][ji];
            }
        }

        this.device.queue.writeBuffer(this.fluctWeightsBuffer, 0, weights);
    }

    /**
     * Reset fluctuation chains to extremal states
     */
    resetFluctuationsChains() {
        if (!this.fluctInitialized) return;
        for (let i = 0; i < 4; i++) {
            const data = (i % 2 === 0) ? this.fluctMinState : this.fluctMaxState;
            this.device.queue.writeBuffer(this.fluctGridBuffers[i], 0, data);
        }
        this.fluctCoalesced = [false, false];
    }

    /**
     * Run fluctuations CFTP steps (both pairs in parallel)
     * Submits per-step command buffers in a tight loop without awaiting.
     * Coalescence checks happen at batch boundaries (every checkInterval steps).
     * @param {number} numSteps - Steps to run
     * @param {number} checkInterval - Check coalescence every N steps
     * @returns {Promise<{coalesced: boolean[], stepsRun: number}>}
     */
    async stepFluctuationsCFTP(numSteps, checkInterval = 0) {
        if (!this.fluctInitialized) return { coalesced: [false, false], stepsRun: 0 };
        if (this.deviceLost) {
            console.error('[GPU] Device was lost, cannot step fluctuations CFTP');
            throw new Error('GPU device lost');
        }

        const workgroupCount = Math.ceil(this.fluctNumCells / 64);
        const qBias = this.fluctQBias || 1.0;
        const useWeights = this.fluctUseWeights ? 1 : 0;

        // Pre-allocate uniform data template
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, use_weights, rand_seed, _pad
        const uniformData = new ArrayBuffer(40);
        const intView = new Int32Array(uniformData);
        const floatView = new Float32Array(uniformData);
        const uintView = new Uint32Array(uniformData);

        intView[0] = this.gridParams.minN;
        intView[1] = this.gridParams.maxN;
        intView[2] = this.gridParams.minJ;
        intView[3] = this.gridParams.maxJ;
        intView[4] = this.gridParams.strideJ;
        floatView[6] = qBias;
        uintView[7] = useWeights;
        uintView[9] = 0;  // padding

        let stepsRun = 0;

        // Determine batch boundaries: split at checkInterval points
        const batchSize = (checkInterval > 0) ? checkInterval : numSteps;

        while (stepsRun < numSteps) {
            const stepsThisBatch = Math.min(batchSize, numSteps - stepsRun);

            // Submit per-step command buffers in a tight loop without awaiting.
            // writeBuffer + submit per step are ordered by the queue.
            try {
                for (let s = 0; s < stepsThisBatch; s++) {
                    const seed0 = Math.floor(Math.random() * 4294967295);
                    const seed1 = Math.floor(Math.random() * 4294967295);

                    for (let pair = 0; pair < 2; pair++) {
                        const seed = pair === 0 ? seed0 : seed1;
                        for (let color = 0; color < 4; color++) {
                            intView[5] = color;
                            uintView[8] = seed;
                            this.device.queue.writeBuffer(this.fluctUniformBuffers[pair * 4 + color], 0, uniformData);
                        }
                    }

                    const commandEncoder = this.device.createCommandEncoder();
                    for (let color = 0; color < 4; color++) {
                        for (let gridIdx = 0; gridIdx < 4; gridIdx++) {
                            const pass = commandEncoder.beginComputePass();
                            pass.setPipeline(this.cftpPipeline);
                            pass.setBindGroup(0, this.fluctBindGroups[gridIdx][color]);
                            pass.dispatchWorkgroups(workgroupCount);
                            pass.end();
                        }
                    }
                    this.device.queue.submit([commandEncoder.finish()]);
                }
            } catch (e) {
                console.error('[GPU] Fluct compute dispatch failed at step', stepsRun, ':', e);
                throw e;
            }

            stepsRun += stepsThisBatch;

            // Early coalescence check at batch boundary
            if (checkInterval > 0 && stepsRun < numSteps) {
                try {
                    const coalesced = await this.checkFluctuationsCoalescence();
                    if (coalesced[0] && coalesced[1]) {
                        return { coalesced, stepsRun };
                    }
                } catch (e) {
                    console.error('[GPU] Early fluctuations coalescence check failed, continuing:', e);
                }
            }
        }

        // Wait for GPU to finish after all batches
        try {
            await this.device.queue.onSubmittedWorkDone();
        } catch (e) {
            console.error('[GPU] onSubmittedWorkDone failed:', e);
        }
        return { coalesced: [false, false], stepsRun };
    }

    /**
     * Check coalescence for both pairs
     * @returns {Promise<boolean[]>} [pair0_coalesced, pair1_coalesced]
     */
    async checkFluctuationsCoalescence() {
        if (!this.fluctInitialized) return [false, false];

        const workgroupCount = Math.ceil(this.fluctNumCells / 64);
        const commandEncoder = this.device.createCommandEncoder();
        // Clear both result buffers and dispatch coalesce for each pair
        for (let pair = 0; pair < 2; pair++) {
            commandEncoder.clearBuffer(this.fluctCoalesceResultBuffers[pair]);
            const pass = commandEncoder.beginComputePass();
            pass.setPipeline(this.coalescePipeline);
            pass.setBindGroup(0, this.fluctCoalesceBindGroups[pair]);
            pass.dispatchWorkgroups(workgroupCount);
            pass.end();
            commandEncoder.copyBufferToBuffer(
                this.fluctCoalesceResultBuffers[pair], 0,
                this.fluctCoalesceStagingBuffers[pair], 0, 4
            );
        }
        this.device.queue.submit([commandEncoder.finish()]);

        // Read back 8 bytes total (4 per pair) in parallel
        await Promise.all([
            this.fluctCoalesceStagingBuffers[0].mapAsync(GPUMapMode.READ),
            this.fluctCoalesceStagingBuffers[1].mapAsync(GPUMapMode.READ)
        ]);

        const results = [];
        try {
            for (let pair = 0; pair < 2; pair++) {
                const diffCount = new Uint32Array(this.fluctCoalesceStagingBuffers[pair].getMappedRange().slice(0))[0];
                results.push(diffCount === 0);
            }
        } finally {
            this.fluctCoalesceStagingBuffers[0].unmap();
            this.fluctCoalesceStagingBuffers[1].unmap();
        }

        this.fluctCoalesced = results;
        return this.fluctCoalesced;
    }

    /**
     * Get the coalesced samples as dimer arrays
     * @param {Array} blackTriangles - Black triangles from WASM
     * @returns {Promise<{sample0: Array, sample1: Array}>}
     */
    async getFluctuationsSamples(blackTriangles) {
        if (!this.fluctInitialized) return { sample0: [], sample1: [] };

        // Read lower chain of each pair (grids 0 and 2)
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.fluctGridBuffers[0], 0, this.fluctStagingBuffers[0], 0, this.fluctGridBuffers[0].size);
        commandEncoder.copyBufferToBuffer(this.fluctGridBuffers[2], 0, this.fluctStagingBuffers[2], 0, this.fluctGridBuffers[2].size);
        this.device.queue.submit([commandEncoder.finish()]);

        await Promise.all([
            this.fluctStagingBuffers[0].mapAsync(GPUMapMode.READ),
            this.fluctStagingBuffers[2].mapAsync(GPUMapMode.READ)
        ]);

        let data0, data2;
        try {
            data0 = new Int32Array(this.fluctStagingBuffers[0].getMappedRange().slice(0));
            data2 = new Int32Array(this.fluctStagingBuffers[2].getMappedRange().slice(0));
        } finally {
            this.fluctStagingBuffers[0].unmap();
            this.fluctStagingBuffers[2].unmap();
        }

        return {
            sample0: this.gridToDimers(data0, blackTriangles),
            sample1: this.gridToDimers(data2, blackTriangles)
        };
    }

    /**
     * Clean up fluctuations CFTP resources
     */
    destroyFluctuationsCFTP() {
        if (this.fluctGridBuffers) {
            for (const buf of this.fluctGridBuffers) buf.destroy();
            this.fluctGridBuffers = null;
        }
        if (this.fluctUniformBuffers) {
            for (const buf of this.fluctUniformBuffers) buf.destroy();
            this.fluctUniformBuffers = null;
        }
        if (this.fluctWeightsBuffer) {
            this.fluctWeightsBuffer.destroy();
            this.fluctWeightsBuffer = null;
        }
        if (this.fluctStagingBuffers) {
            for (const buf of this.fluctStagingBuffers) { if (buf) buf.destroy(); }
            this.fluctStagingBuffers = null;
        }
        if (this.fluctCoalesceResultBuffers) {
            for (const buf of this.fluctCoalesceResultBuffers) buf.destroy();
            this.fluctCoalesceResultBuffers = null;
        }
        if (this.fluctCoalesceStagingBuffers) {
            for (const buf of this.fluctCoalesceStagingBuffers) buf.destroy();
            this.fluctCoalesceStagingBuffers = null;
        }
        this.fluctCoalesceBindGroups = null;
        this.fluctBindGroups = null;
        this.fluctInitialized = false;
    }

    /**
     * Check if fluctuations CFTP is initialized
     */
    isFluctuationsCFTPInitialized() {
        return this.fluctInitialized === true;
    }
}

// Make available globally
window.WebGPULozengeEngine = WebGPULozengeEngine;
