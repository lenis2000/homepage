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
        this.stagingBuffer = null;
        this.bindGroup = null;
        this.isReady = false;
        this.gridParams = {};
        this.shaderCode = null;
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

        // Create Storage Buffer for the Grid
        this.gridBuffer = this.device.createBuffer({
            size: gridData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.gridBuffer.getMappedRange()).set(gridData);
        this.gridBuffer.unmap();

        // Create Uniform Buffer (8 i32 + 1 f32 + 1 u32 = 32 bytes, aligned)
        // Layout: minN, maxN, minJ, maxJ, strideJ, color_pass, q_bias, rand_seed
        this.uniformBuffer = this.device.createBuffer({
            size: 32, // 8 * 4 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Create Staging Buffer for readback
        this.stagingBuffer = this.device.createBuffer({
            size: gridData.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Create Bind Group
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.gridBuffer } },
                { binding: 1, resource: { buffer: this.uniformBuffer } }
            ]
        });

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
     * Perform simulation steps using chromatic sweep
     * @param {number} numSteps - Number of full sweeps
     * @param {number} qBias - The q-bias parameter (default 1.0 for uniform)
     */
    async step(numSteps, qBias = 1.0) {
        if (!this.isReady || !this.gridBuffer) {
            return;
        }

        const workgroupCount = Math.ceil(this.gridBuffer.size / 4 / 64);
        const uniformData = new ArrayBuffer(32);
        const intView = new Int32Array(uniformData);
        const floatView = new Float32Array(uniformData);
        const uintView = new Uint32Array(uniformData);

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);

        for (let i = 0; i < numSteps; i++) {
            // Three color passes per step (chromatic sweep)
            for (let color = 0; color < 3; color++) {
                // Update uniforms
                intView[0] = this.gridParams.minN;
                intView[1] = this.gridParams.maxN;
                intView[2] = this.gridParams.minJ;
                intView[3] = this.gridParams.maxJ;
                intView[4] = this.gridParams.strideJ;
                intView[5] = color;
                floatView[6] = qBias;
                uintView[7] = Math.floor(Math.random() * 4294967295);

                this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

                passEncoder.dispatchWorkgroups(workgroupCount);
            }
        }

        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);
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
        if (this.uniformBuffer) {
            this.uniformBuffer.destroy();
            this.uniformBuffer = null;
        }
        if (this.stagingBuffer) {
            this.stagingBuffer.destroy();
            this.stagingBuffer = null;
        }
        this.bindGroup = null;
    }
}

// Make available globally
window.WebGPULozengeEngine = WebGPULozengeEngine;
