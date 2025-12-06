/**
 * WebGPU Domino Tiling Engine
 *
 * Implements CFTP (Coupling From The Past) on the GPU using WebGPU compute shaders.
 * Based on the GPU algorithm from arXiv-1804.07250v1.
 *
 * Key algorithm:
 * - Vertex state encoding: 4-bit (e_N + 2*e_S + 4*e_E + 8*e_W)
 * - Rotateable states: 3 (horizontal) and 12 (vertical)
 * - Checkerboard decomposition for parallel updates
 *
 * Used by: _simulations/domino_tilings/2025-12-05-ultimate-domino.md
 */

class WebGPUDominoEngine {
    constructor() {
        this.device = null;
        this.isReady = false;
        this.cftpInitialized = false;
        this.gridParams = {};
        this.shaderModule = null;
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

        this.device = await adapter.requestDevice();

        // Load shader code
        try {
            const response = await fetch('/shaders/domino_cftp.wgsl');
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${response.status}`);
            }
            const shaderCode = await response.text();
            this.shaderModule = this.device.createShaderModule({ code: shaderCode });
        } catch (e) {
            console.error("Failed to load domino CFTP shader:", e);
            throw e;
        }

        // Create explicit bind group layouts for sharing between pipelines
        // Layout for rotate/update (uses all 4 bindings: grid, randoms, params, region)
        this.rotateBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }
            ]
        });
        const rotatePipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.rotateBindGroupLayout]
        });

        // Layout for extremal (bindings 0, 2, 3 - no randoms)
        this.extremalBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }
            ]
        });
        const extremalPipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.extremalBindGroupLayout]
        });

        // Create pipelines with explicit layouts
        this.rotatePipeline = this.device.createComputePipeline({
            layout: rotatePipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'rotate' }
        });

        this.updatePipeline = this.device.createComputePipeline({
            layout: rotatePipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'update_neighbors' }
        });

        this.extremalHorizontalPipeline = this.device.createComputePipeline({
            layout: extremalPipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'extremal_horizontal' }
        });

        this.extremalVerticalPipeline = this.device.createComputePipeline({
            layout: extremalPipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'extremal_vertical' }
        });

        this.isReady = true;
        console.log("WebGPU Domino Engine initialized");
    }

    /**
     * Initialize region from active cells
     * @param {Uint8Array} regionMask - Binary mask (1=in region, 0=outside)
     * @param {number} minX - Minimum X coordinate
     * @param {number} maxX - Maximum X coordinate
     * @param {number} minY - Minimum Y coordinate
     * @param {number} maxY - Maximum Y coordinate
     */
    initFromRegion(regionMask, minX, maxX, minY, maxY) {
        if (!this.isReady) {
            console.error("WebGPU engine not initialized");
            return;
        }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        this.gridParams = { minX, maxX, minY, maxY, width, height };
        this.numCells = width * height;

        // Create region mask buffer
        this.regionBuffer = this.device.createBuffer({
            size: regionMask.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(this.regionBuffer.getMappedRange()).set(regionMask);
        this.regionBuffer.unmap();

        console.log(`WebGPU region initialized: ${width}x${height}, ${regionMask.filter(x => x).length} active cells`);
    }

    /**
     * Initialize CFTP with region mask - computes extremal tilings on GPU
     * @param {Uint8Array} regionMask - Binary mask of region
     * @param {number} minX, maxX, minY, maxY - Bounds
     * @returns {Promise<boolean>} Success
     */
    async initCFTP(regionMask, minX, maxX, minY, maxY) {
        if (!this.isReady) {
            console.error("WebGPU engine not initialized");
            return false;
        }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        this.gridParams = { minX, maxX, minY, maxY, width, height };
        this.numCells = width * height;

        // Create region mask buffer
        this.regionBuffer = this.device.createBuffer({
            size: Math.max(regionMask.byteLength, 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(this.regionBuffer.getMappedRange()).set(regionMask);
        this.regionBuffer.unmap();

        // Create vertex state buffers (Int32 per cell)
        const gridSize = this.numCells * 4;  // 4 bytes per int32

        // Lower chain buffer (will hold MIN tiling)
        this.lowerGridBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        // Initialize to 0 (no dominoes)
        new Int32Array(this.lowerGridBuffer.getMappedRange()).fill(0);
        this.lowerGridBuffer.unmap();

        // Upper chain buffer (will hold MAX tiling)
        this.upperGridBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.upperGridBuffer.getMappedRange()).fill(0);
        this.upperGridBuffer.unmap();

        // Random buffer (float32 per cell)
        this.randomBuffer = this.device.createBuffer({
            size: this.numCells * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Uniform buffer for parameters
        // Layout: minX, maxX, minY, maxY, width, height, color, diagonal, numCells, _pad
        this.uniformBuffer = this.device.createBuffer({
            size: 48,  // 12 x 4 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Staging buffers for readback
        this.lowerStagingBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        this.upperStagingBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Create bind groups for rotate/update pipelines (shared layout)
        this.lowerRotateBindGroup = this.device.createBindGroup({
            layout: this.rotateBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.lowerGridBuffer } },
                { binding: 1, resource: { buffer: this.randomBuffer } },
                { binding: 2, resource: { buffer: this.uniformBuffer } },
                { binding: 3, resource: { buffer: this.regionBuffer } }
            ]
        });
        this.upperRotateBindGroup = this.device.createBindGroup({
            layout: this.rotateBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.upperGridBuffer } },
                { binding: 1, resource: { buffer: this.randomBuffer } },
                { binding: 2, resource: { buffer: this.uniformBuffer } },
                { binding: 3, resource: { buffer: this.regionBuffer } }
            ]
        });

        // Create bind groups for extremal tiling computation (shared layout)
        this.lowerExtremalBindGroup = this.device.createBindGroup({
            layout: this.extremalBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.lowerGridBuffer } },
                { binding: 2, resource: { buffer: this.uniformBuffer } },
                { binding: 3, resource: { buffer: this.regionBuffer } }
            ]
        });
        this.upperExtremalBindGroup = this.device.createBindGroup({
            layout: this.extremalBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.upperGridBuffer } },
                { binding: 2, resource: { buffer: this.uniformBuffer } },
                { binding: 3, resource: { buffer: this.regionBuffer } }
            ]
        });

        // Compute extremal tilings
        await this.computeExtremalTilings();

        this.cftpInitialized = true;
        console.log(`WebGPU CFTP initialized: ${this.numCells} cells`);
        return true;
    }

    /**
     * Compute MIN (horizontal) and MAX (vertical) extremal tilings on GPU
     */
    async computeExtremalTilings() {
        const { width, height } = this.gridParams;
        const workgroupCount = Math.ceil(this.numCells / 64);

        // Process diagonals from top-left to bottom-right
        // Cells on same diagonal (x + y = const) are independent
        const numDiagonals = width + height - 1;

        for (let diag = 0; diag < numDiagonals; diag++) {
            // Write uniform data with current diagonal
            const uniformData = new ArrayBuffer(48);
            const intView = new Int32Array(uniformData);
            intView[0] = this.gridParams.minX;
            intView[1] = this.gridParams.maxX;
            intView[2] = this.gridParams.minY;
            intView[3] = this.gridParams.maxY;
            intView[4] = width;
            intView[5] = height;
            intView[6] = 0;  // color (not used for extremal)
            intView[7] = diag;  // current diagonal
            intView[8] = this.numCells;
            intView[9] = 0;  // padding

            this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

            const commandEncoder = this.device.createCommandEncoder();

            // Compute MIN tiling (prefer horizontal) on lower chain
            const minPass = commandEncoder.beginComputePass();
            minPass.setPipeline(this.extremalHorizontalPipeline);
            minPass.setBindGroup(0, this.lowerExtremalBindGroup);
            minPass.dispatchWorkgroups(workgroupCount);
            minPass.end();

            // Compute MAX tiling (prefer vertical) on upper chain
            const maxPass = commandEncoder.beginComputePass();
            maxPass.setPipeline(this.extremalVerticalPipeline);
            maxPass.setBindGroup(0, this.upperExtremalBindGroup);
            maxPass.dispatchWorkgroups(workgroupCount);
            maxPass.end();

            this.device.queue.submit([commandEncoder.finish()]);
        }

        await this.device.queue.onSubmittedWorkDone();
        console.log("Extremal tilings computed");
    }

    /**
     * Reset CFTP chains to extremal states (for new epoch)
     */
    async resetCFTPChains() {
        if (!this.cftpInitialized) return;

        // Clear both buffers
        const gridSize = this.numCells * 4;
        const zeros = new Int32Array(this.numCells);
        this.device.queue.writeBuffer(this.lowerGridBuffer, 0, zeros);
        this.device.queue.writeBuffer(this.upperGridBuffer, 0, zeros);

        // Recompute extremal tilings
        await this.computeExtremalTilings();
    }

    /**
     * Run CFTP coupled steps on GPU
     * @param {number} numSteps - Number of coupled steps to run
     * @param {number} checkInterval - Check coalescence every N steps (0 = no early check)
     * @returns {Promise<{coalesced: boolean, stepsRun: number}>}
     */
    async stepCFTP(numSteps, checkInterval = 0) {
        if (!this.cftpInitialized) return { coalesced: false, stepsRun: 0 };

        const workgroupCount = Math.ceil(this.numCells / 64);
        const { width, height } = this.gridParams;

        // Pre-allocate random data buffer
        const randomData = new Float32Array(this.numCells);
        let stepsRun = 0;

        for (let step = 0; step < numSteps; step++) {
            // Generate random numbers for this step (same for both chains)
            for (let i = 0; i < this.numCells; i++) {
                randomData[i] = Math.random();
            }
            this.device.queue.writeBuffer(this.randomBuffer, 0, randomData);

            // Two-phase update: black vertices then white vertices
            for (let color = 0; color < 2; color++) {
                // Write uniform data with current color
                const uniformData = new ArrayBuffer(48);
                const intView = new Int32Array(uniformData);
                intView[0] = this.gridParams.minX;
                intView[1] = this.gridParams.maxX;
                intView[2] = this.gridParams.minY;
                intView[3] = this.gridParams.maxY;
                intView[4] = width;
                intView[5] = height;
                intView[6] = color;  // 0=black, 1=white
                intView[7] = 0;  // diagonal (not used)
                intView[8] = this.numCells;
                intView[9] = 0;

                this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

                const commandEncoder = this.device.createCommandEncoder();

                // Rotate phase: flip rotateable vertices (3↔12) with probability 0.5
                const lowerRotatePass = commandEncoder.beginComputePass();
                lowerRotatePass.setPipeline(this.rotatePipeline);
                lowerRotatePass.setBindGroup(0, this.lowerRotateBindGroup);
                lowerRotatePass.dispatchWorkgroups(workgroupCount);
                lowerRotatePass.end();

                const upperRotatePass = commandEncoder.beginComputePass();
                upperRotatePass.setPipeline(this.rotatePipeline);
                upperRotatePass.setBindGroup(0, this.upperRotateBindGroup);
                upperRotatePass.dispatchWorkgroups(workgroupCount);
                upperRotatePass.end();

                this.device.queue.submit([commandEncoder.finish()]);

                // Update phase: recompute neighbor states
                // Uses same bind groups as rotate (same layout)
                const updateEncoder = this.device.createCommandEncoder();

                const lowerUpdatePass = updateEncoder.beginComputePass();
                lowerUpdatePass.setPipeline(this.updatePipeline);
                lowerUpdatePass.setBindGroup(0, this.lowerRotateBindGroup);
                lowerUpdatePass.dispatchWorkgroups(workgroupCount);
                lowerUpdatePass.end();

                const upperUpdatePass = updateEncoder.beginComputePass();
                upperUpdatePass.setPipeline(this.updatePipeline);
                upperUpdatePass.setBindGroup(0, this.upperRotateBindGroup);
                upperUpdatePass.dispatchWorkgroups(workgroupCount);
                upperUpdatePass.end();

                this.device.queue.submit([updateEncoder.finish()]);
            }

            stepsRun++;

            // Early coalescence check
            if (checkInterval > 0 && stepsRun % checkInterval === 0) {
                const coalesced = await this.checkCoalescence();
                if (coalesced) {
                    return { coalesced: true, stepsRun };
                }
            }
        }

        // Final coalescence check at end of epoch
        await this.device.queue.onSubmittedWorkDone();
        const finalCoalesced = await this.checkCoalescence();
        return { coalesced: finalCoalesced, stepsRun };
    }

    /**
     * Check if lower and upper chains have coalesced
     * @returns {Promise<boolean>}
     */
    async checkCoalescence() {
        if (!this.cftpInitialized) return false;

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.lowerGridBuffer, 0, this.lowerStagingBuffer, 0, this.lowerGridBuffer.size);
        commandEncoder.copyBufferToBuffer(this.upperGridBuffer, 0, this.upperStagingBuffer, 0, this.upperGridBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);

        await this.lowerStagingBuffer.mapAsync(GPUMapMode.READ);
        await this.upperStagingBuffer.mapAsync(GPUMapMode.READ);

        const lowerData = new Int32Array(this.lowerStagingBuffer.getMappedRange().slice(0));
        const upperData = new Int32Array(this.upperStagingBuffer.getMappedRange().slice(0));

        this.lowerStagingBuffer.unmap();
        this.upperStagingBuffer.unmap();

        // Compare grids
        let differences = 0;
        for (let i = 0; i < lowerData.length; i++) {
            if (lowerData[i] !== upperData[i]) {
                differences++;
            }
        }
        if (differences > 0) {
            console.log(`Coalescence check: ${differences}/${lowerData.length} cells differ`);
            // Log sample of differences
            let samples = [];
            for (let i = 0; i < lowerData.length && samples.length < 5; i++) {
                if (lowerData[i] !== upperData[i]) {
                    samples.push({ i, lower: lowerData[i], upper: upperData[i] });
                }
            }
            console.log('Sample diffs:', samples);
        }
        return differences === 0;
    }

    /**
     * Get the coalesced result as vertex states
     * @returns {Promise<Int32Array>}
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
     * Convert vertex states to domino list for display
     * @param {Int32Array} vertexStates - Vertex state array from GPU
     * @returns {Array<{x1, y1, x2, y2, type}>} - List of dominoes
     */
    vertexStatesToDominoes(vertexStates) {
        const dominoes = [];
        const { minX, maxX, minY, maxY, width } = this.gridParams;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const idx = (y - minY) * width + (x - minX);
                const state = vertexStates[idx];

                // Only process black cells (x+y even) to avoid double counting
                if ((x + y) % 2 !== 0) continue;

                if (state === 3) {
                    // Horizontal domino: covers (x,y) and (x+1,y)
                    dominoes.push({
                        x1: x, y1: y,
                        x2: x + 1, y2: y,
                        type: 0  // horizontal from black
                    });
                } else if (state === 12) {
                    // Vertical domino: covers (x,y) and (x,y+1)
                    dominoes.push({
                        x1: x, y1: y,
                        x2: x, y2: y + 1,
                        type: 2  // vertical from black
                    });
                }
            }
        }

        // Also check white cells for their dominoes
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const idx = (y - minY) * width + (x - minX);
                const state = vertexStates[idx];

                // Only process white cells (x+y odd)
                if ((x + y) % 2 !== 1) continue;

                if (state === 3) {
                    // Horizontal domino: covers (x,y) and (x+1,y)
                    dominoes.push({
                        x1: x, y1: y,
                        x2: x + 1, y2: y,
                        type: 1  // horizontal from white
                    });
                } else if (state === 12) {
                    // Vertical domino: covers (x,y) and (x,y+1)
                    dominoes.push({
                        x1: x, y1: y,
                        x2: x, y2: y + 1,
                        type: 3  // vertical from white
                    });
                }
            }
        }

        return dominoes;
    }

    /**
     * Finalize CFTP and get dominoes
     * @returns {Promise<Array>} - List of dominoes
     */
    async finalizeCFTP() {
        const vertexStates = await this.getCFTPResult();
        if (!vertexStates) return [];
        return this.vertexStatesToDominoes(vertexStates);
    }

    /**
     * Clean up CFTP resources
     */
    destroyCFTP() {
        if (this.lowerGridBuffer) {
            this.lowerGridBuffer.destroy();
            this.lowerGridBuffer = null;
        }
        if (this.upperGridBuffer) {
            this.upperGridBuffer.destroy();
            this.upperGridBuffer = null;
        }
        if (this.randomBuffer) {
            this.randomBuffer.destroy();
            this.randomBuffer = null;
        }
        if (this.uniformBuffer) {
            this.uniformBuffer.destroy();
            this.uniformBuffer = null;
        }
        if (this.regionBuffer) {
            this.regionBuffer.destroy();
            this.regionBuffer = null;
        }
        if (this.lowerStagingBuffer) {
            this.lowerStagingBuffer.destroy();
            this.lowerStagingBuffer = null;
        }
        if (this.upperStagingBuffer) {
            this.upperStagingBuffer.destroy();
            this.upperStagingBuffer = null;
        }
        this.cftpInitialized = false;
    }

    /**
     * Check if engine is ready and CFTP is initialized
     */
    isInitialized() {
        return this.isReady && this.cftpInitialized;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = WebGPUDominoEngine;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.WebGPUDominoEngine = WebGPUDominoEngine;
}
