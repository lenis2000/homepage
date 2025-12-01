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

        // Pre-write uniform data for all 4 colors
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, use_weights, rand_seed, _pad
        for (let color = 0; color < 4; color++) {
            const uniformData = new ArrayBuffer(40);
            const intView = new Int32Array(uniformData);
            const floatView = new Float32Array(uniformData);
            const uintView = new Uint32Array(uniformData);

            intView[0] = this.gridParams.minN;
            intView[1] = this.gridParams.maxN;
            intView[2] = this.gridParams.minJ;
            intView[3] = this.gridParams.maxJ;
            intView[4] = this.gridParams.strideJ;
            intView[5] = color;
            floatView[6] = qBias;
            uintView[7] = this.useWeights ? 1 : 0;
            uintView[8] = Math.floor(Math.random() * 4294967295);
            uintView[9] = 0;  // padding

            this.device.queue.writeBuffer(this.uniformBuffers[color], 0, uniformData);
        }

        // Batch all sweeps into a single command buffer
        // Each color pass uses its own bind group with pre-written uniforms
        const commandEncoder = this.device.createCommandEncoder();

        for (let i = 0; i < numSteps; i++) {
            // Four color passes per step (parallel-safe chromatic sweep)
            for (let color = 0; color < 4; color++) {
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(this.pipeline);
                passEncoder.setBindGroup(0, this.bindGroups[color]);
                passEncoder.dispatchWorkgroups(workgroupCount);
                passEncoder.end();
            }
        }

        this.device.queue.submit([commandEncoder.finish()]);

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
        const data = new Int32Array(this.stagingBuffer.getMappedRange().slice(0));
        this.stagingBuffer.unmap();

        return data;
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
    }

    // =========================================================================
    // CFTP (Coupling From The Past) Methods
    // =========================================================================

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

        // Create random buffer (one float per grid cell)
        const numCells = minStateData.length;
        this.randomBuffer = this.device.createBuffer({
            size: numCells * 4, // float32
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Create 4 CFTP uniform buffers (one per color pass for batching)
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, use_weights, num_vertices, _pad
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

        // Create staging buffers for coalescence check
        this.lowerStagingBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this.upperStagingBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Create bind groups for lower and upper chains (4 per chain, one per color)
        this.lowerBindGroups = [];
        this.upperBindGroups = [];
        for (let color = 0; color < 4; color++) {
            this.lowerBindGroups.push(this.device.createBindGroup({
                layout: this.cftpPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.lowerGridBuffer } },
                    { binding: 1, resource: { buffer: this.randomBuffer } },
                    { binding: 2, resource: { buffer: this.cftpUniformBuffers[color] } },
                    { binding: 3, resource: { buffer: this.cftpWeightsBuffer } }
                ]
            }));
            this.upperBindGroups.push(this.device.createBindGroup({
                layout: this.cftpPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.upperGridBuffer } },
                    { binding: 1, resource: { buffer: this.randomBuffer } },
                    { binding: 2, resource: { buffer: this.cftpUniformBuffers[color] } },
                    { binding: 3, resource: { buffer: this.cftpWeightsBuffer } }
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
     * @param {number} numSteps - Number of coupled steps to run
     * @param {number} checkInterval - Check coalescence every N steps (0 = no early check)
     * @returns {Promise<{coalesced: boolean, stepsRun: number}>}
     */
    async stepCFTP(numSteps, checkInterval = 0) {
        if (!this.cftpInitialized) return { coalesced: false, stepsRun: 0 };

        const workgroupCount = Math.ceil(this.cftpNumCells / 64);
        const qBias = this.cftpQBias || 1.0;
        const useWeights = this.cftpUseWeights ? 1 : 0;

        // Pre-write uniform data for all 4 colors
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, use_weights, num_vertices, _pad
        for (let color = 0; color < 4; color++) {
            const uniformData = new ArrayBuffer(40);
            const intView = new Int32Array(uniformData);
            const floatView = new Float32Array(uniformData);
            const uintView = new Uint32Array(uniformData);

            intView[0] = this.gridParams.minN;
            intView[1] = this.gridParams.maxN;
            intView[2] = this.gridParams.minJ;
            intView[3] = this.gridParams.maxJ;
            intView[4] = this.gridParams.strideJ;
            intView[5] = color;
            floatView[6] = qBias;
            uintView[7] = useWeights;
            uintView[8] = this.cftpNumCells;
            uintView[9] = 0;  // padding

            this.device.queue.writeBuffer(this.cftpUniformBuffers[color], 0, uniformData);
        }

        // Pre-allocate random data buffer
        const randomData = new Float32Array(this.cftpNumCells);
        let stepsRun = 0;

        for (let step = 0; step < numSteps; step++) {
            // Generate random numbers for this step (same for both chains)
            for (let i = 0; i < this.cftpNumCells; i++) {
                randomData[i] = Math.random();
            }
            this.device.queue.writeBuffer(this.randomBuffer, 0, randomData);

            // Batch all 8 dispatches (4 colors × 2 chains) in a single command buffer
            const commandEncoder = this.device.createCommandEncoder();

            for (let color = 0; color < 4; color++) {
                // Dispatch lower chain for this color
                const lowerPass = commandEncoder.beginComputePass();
                lowerPass.setPipeline(this.cftpPipeline);
                lowerPass.setBindGroup(0, this.lowerBindGroups[color]);
                lowerPass.dispatchWorkgroups(workgroupCount);
                lowerPass.end();

                // Dispatch upper chain for this color (same randoms)
                const upperPass = commandEncoder.beginComputePass();
                upperPass.setPipeline(this.cftpPipeline);
                upperPass.setBindGroup(0, this.upperBindGroups[color]);
                upperPass.dispatchWorkgroups(workgroupCount);
                upperPass.end();
            }

            this.device.queue.submit([commandEncoder.finish()]);
            stepsRun++;

            // Early coalescence check
            if (checkInterval > 0 && stepsRun % checkInterval === 0) {
                const coalesced = await this.checkCoalescence();
                if (coalesced) {
                    return { coalesced: true, stepsRun };
                }
            }
        }

        // Wait for GPU to finish
        await this.device.queue.onSubmittedWorkDone();
        return { coalesced: false, stepsRun };
    }

    /**
     * Check if lower and upper chains have coalesced
     * @returns {Promise<boolean>} True if chains are identical
     */
    async checkCoalescence() {
        if (!this.cftpInitialized) return false;

        // Copy both grids to staging buffers
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.lowerGridBuffer, 0, this.lowerStagingBuffer, 0, this.lowerGridBuffer.size);
        commandEncoder.copyBufferToBuffer(this.upperGridBuffer, 0, this.upperStagingBuffer, 0, this.upperGridBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);

        // Read back both grids
        await this.lowerStagingBuffer.mapAsync(GPUMapMode.READ);
        await this.upperStagingBuffer.mapAsync(GPUMapMode.READ);

        const lowerData = new Int32Array(this.lowerStagingBuffer.getMappedRange().slice(0));
        const upperData = new Int32Array(this.upperStagingBuffer.getMappedRange().slice(0));

        this.lowerStagingBuffer.unmap();
        this.upperStagingBuffer.unmap();

        // Compare grids
        for (let i = 0; i < lowerData.length; i++) {
            if (lowerData[i] !== upperData[i]) {
                return false;
            }
        }
        return true;
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
        const data = new Int32Array(this.lowerStagingBuffer.getMappedRange().slice(0));
        this.lowerStagingBuffer.unmap();

        return data;
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

        // Read back both grids
        await this.lowerStagingBuffer.mapAsync(GPUMapMode.READ);
        await this.upperStagingBuffer.mapAsync(GPUMapMode.READ);

        const lowerData = new Int32Array(this.lowerStagingBuffer.getMappedRange().slice(0));
        const upperData = new Int32Array(this.upperStagingBuffer.getMappedRange().slice(0));

        this.lowerStagingBuffer.unmap();
        this.upperStagingBuffer.unmap();

        // Convert to dimer arrays
        const minDimers = this.gridToDimers(lowerData, blackTriangles);
        const maxDimers = this.gridToDimers(upperData, blackTriangles);

        return { minDimers, maxDimers };
    }

    /**
     * Copy CFTP result to main grid buffer
     */
    async finalizeCFTP() {
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
        if (this.randomBuffer) { this.randomBuffer.destroy(); this.randomBuffer = null; }
        if (this.cftpWeightsBuffer) { this.cftpWeightsBuffer.destroy(); this.cftpWeightsBuffer = null; }
        if (this.cftpUniformBuffers) {
            for (const buf of this.cftpUniformBuffers) buf.destroy();
            this.cftpUniformBuffers = [];
        }
        if (this.lowerStagingBuffer) { this.lowerStagingBuffer.destroy(); this.lowerStagingBuffer = null; }
        if (this.upperStagingBuffer) { this.upperStagingBuffer.destroy(); this.upperStagingBuffer = null; }
        this.lowerBindGroups = [];
        this.upperBindGroups = [];
        this.cftpInitialized = false;
    }

    /**
     * Check if CFTP is initialized
     * @returns {boolean}
     */
    isCFTPInitialized() {
        return this.cftpInitialized === true;
    }
}

// Make available globally
window.WebGPULozengeEngine = WebGPULozengeEngine;
