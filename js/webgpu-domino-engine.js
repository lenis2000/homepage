/**
 * WebGPU Domino Tiling Engine - Face-Based Algorithm
 *
 * Implements CFTP (Coupling From The Past) on the GPU using WebGPU compute shaders.
 * Based on the GPU algorithm from arXiv-1804.07250v1.
 *
 * Key algorithm:
 * - Edge-based data structure: bit 0 = horizontal edge, bit 1 = vertical edge
 * - Face-based operations: 2x2 plaquettes with states 0, 1 (horizontal pair), 2 (vertical pair)
 * - 4-color chromatic sweep: (fx%2)*2 + (fy%2) ensures no vertex conflicts
 *
 * Used by: _simulations/domino_tilings/2025-12-05-ultimate-domino.md
 */

class WebGPUDominoEngine {
    constructor() {
        this.device = null;
        this.isReady = false;
        this.cftpInitialized = false;
        this.doubleDimerInitialized = false;
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

        // Create bind group layout (all pipelines use same layout)
        // Layout: grid (storage), randoms (read-only), params (uniform), region (read-only)
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }
            ]
        });
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout]
        });

        // Create pipelines
        this.cftpPipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'cftp_step' }
        });

        this.extremalMinPipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'extremal_min' }
        });

        this.extremalMaxPipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'extremal_max' }
        });

        this.clearGridPipeline = this.device.createComputePipeline({
            layout: pipelineLayout,
            compute: { module: this.shaderModule, entryPoint: 'clear_grid' }
        });

        this.isReady = true;
        console.log("WebGPU Domino Engine initialized (face-based algorithm)");
    }

    /**
     * Create uniform buffer data
     */
    createUniformData(colorPass, diagonal) {
        const uniformData = new ArrayBuffer(48);  // 12 x 4 bytes
        const intView = new Int32Array(uniformData);
        const uintView = new Uint32Array(uniformData);

        intView[0] = this.gridParams.minX;
        intView[1] = this.gridParams.maxX;
        intView[2] = this.gridParams.minY;
        intView[3] = this.gridParams.maxY;
        intView[4] = this.gridParams.width;
        intView[5] = this.gridParams.height;
        intView[6] = colorPass;
        intView[7] = diagonal;
        uintView[8] = this.numCells;
        uintView[9] = this.numFaces;
        uintView[10] = 0;  // padding
        uintView[11] = 0;  // padding

        return uniformData;
    }

    /**
     * Initialize CFTP with region mask
     * @param {Uint8Array} regionMask - Binary mask of region
     * @param {number} minX, maxX, minY, maxY - Bounds
     * @returns {Promise<boolean>} Success
     */
    async initCFTP(regionMask, minX, maxX, minY, maxY) {
        if (!this.isReady) {
            console.error("WebGPU engine not initialized");
            return false;
        }

        // Clean up previous CFTP if any
        this.destroyCFTP();

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        this.gridParams = { minX, maxX, minY, maxY, width, height };
        this.numCells = width * height;
        this.numFaces = Math.max(0, (width - 1) * (height - 1));

        // Create region mask buffer
        this.regionBuffer = this.device.createBuffer({
            size: Math.max(regionMask.byteLength, 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(this.regionBuffer.getMappedRange()).set(regionMask);
        this.regionBuffer.unmap();

        // Create edge buffers (Int32 per cell: bit 0 = h_edge, bit 1 = v_edge)
        const gridSize = this.numCells * 4;

        // Lower chain buffer (will hold MIN tiling - horizontal preferred)
        this.lowerGridBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.lowerGridBuffer.getMappedRange()).fill(0);
        this.lowerGridBuffer.unmap();

        // Upper chain buffer (will hold MAX tiling - vertical preferred)
        this.upperGridBuffer = this.device.createBuffer({
            size: gridSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true
        });
        new Int32Array(this.upperGridBuffer.getMappedRange()).fill(0);
        this.upperGridBuffer.unmap();

        // Random buffer (float32 per face for CFTP steps)
        const randomBufferSize = Math.max(this.numFaces, this.numCells) * 4;
        this.randomBuffer = this.device.createBuffer({
            size: Math.max(randomBufferSize, 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Uniform buffer for parameters
        this.uniformBuffer = this.device.createBuffer({
            size: 48,
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

        // Create bind groups
        this.lowerBindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.lowerGridBuffer } },
                { binding: 1, resource: { buffer: this.randomBuffer } },
                { binding: 2, resource: { buffer: this.uniformBuffer } },
                { binding: 3, resource: { buffer: this.regionBuffer } }
            ]
        });
        this.upperBindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.upperGridBuffer } },
                { binding: 1, resource: { buffer: this.randomBuffer } },
                { binding: 2, resource: { buffer: this.uniformBuffer } },
                { binding: 3, resource: { buffer: this.regionBuffer } }
            ]
        });

        // Compute extremal tilings
        await this.computeExtremalTilings();

        this.cftpInitialized = true;
        console.log(`WebGPU CFTP initialized: ${this.numCells} cells, ${this.numFaces} faces`);
        return true;
    }

    /**
     * Compute MIN (horizontal) and MAX (vertical) extremal tilings on GPU
     */
    async computeExtremalTilings() {
        const { width, height } = this.gridParams;
        const workgroupCount = Math.ceil(this.numCells / 64);

        // Process diagonals from top-left to bottom-right
        const numDiagonals = width + height - 1;

        for (let diag = 0; diag < numDiagonals; diag++) {
            // Write uniform data with current diagonal
            const uniformData = this.createUniformData(0, diag);
            this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

            const commandEncoder = this.device.createCommandEncoder();

            // Compute MIN tiling (prefer horizontal) on lower chain
            const minPass = commandEncoder.beginComputePass();
            minPass.setPipeline(this.extremalMinPipeline);
            minPass.setBindGroup(0, this.lowerBindGroup);
            minPass.dispatchWorkgroups(workgroupCount);
            minPass.end();

            // Compute MAX tiling (prefer vertical) on upper chain
            const maxPass = commandEncoder.beginComputePass();
            maxPass.setPipeline(this.extremalMaxPipeline);
            maxPass.setBindGroup(0, this.upperBindGroup);
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
        const zeros = new Int32Array(this.numCells);
        this.device.queue.writeBuffer(this.lowerGridBuffer, 0, zeros);
        this.device.queue.writeBuffer(this.upperGridBuffer, 0, zeros);

        // Recompute extremal tilings
        await this.computeExtremalTilings();
    }

    /**
     * Run CFTP coupled steps on GPU with 4-color chromatic sweep
     * @param {number} numSteps - Number of coupled steps to run
     * @param {number} checkInterval - Check coalescence every N steps (0 = no early check)
     * @returns {Promise<{coalesced: boolean, stepsRun: number}>}
     */
    async stepCFTP(numSteps, checkInterval = 0) {
        if (!this.cftpInitialized) return { coalesced: false, stepsRun: 0 };

        const faceWorkgroups = Math.ceil(this.numFaces / 64);
        const randomDataSize = Math.max(this.numFaces, 1);
        const randomData = new Float32Array(randomDataSize);
        let stepsRun = 0;

        for (let step = 0; step < numSteps; step++) {
            // Generate random numbers for this step (same for both chains - coupling!)
            for (let i = 0; i < randomDataSize; i++) {
                randomData[i] = Math.random();
            }
            this.device.queue.writeBuffer(this.randomBuffer, 0, randomData);

            // 4-color chromatic sweep
            for (let color = 0; color < 4; color++) {
                const uniformData = this.createUniformData(color, 0);
                this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

                const commandEncoder = this.device.createCommandEncoder();

                // Lower chain CFTP step
                const lowerPass = commandEncoder.beginComputePass();
                lowerPass.setPipeline(this.cftpPipeline);
                lowerPass.setBindGroup(0, this.lowerBindGroup);
                lowerPass.dispatchWorkgroups(faceWorkgroups);
                lowerPass.end();

                // Upper chain CFTP step (same randoms!)
                const upperPass = commandEncoder.beginComputePass();
                upperPass.setPipeline(this.cftpPipeline);
                upperPass.setBindGroup(0, this.upperBindGroup);
                upperPass.dispatchWorkgroups(faceWorkgroups);
                upperPass.end();

                this.device.queue.submit([commandEncoder.finish()]);
            }

            stepsRun++;

            // Early coalescence check
            if (checkInterval > 0 && stepsRun % checkInterval === 0) {
                await this.device.queue.onSubmittedWorkDone();
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

        // Compare grids - only edge bits matter (bits 0 and 1)
        let differences = 0;
        for (let i = 0; i < lowerData.length; i++) {
            if ((lowerData[i] & 3) !== (upperData[i] & 3)) {
                differences++;
            }
        }

        if (differences > 0) {
            console.log(`Coalescence check: ${differences}/${lowerData.length} cells differ`);
        }
        return differences === 0;
    }

    /**
     * Get the coalesced result as edge grid
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
     * Convert edge grid to domino list for display
     * Edge convention: bit 0 = horizontal edge from (x,y) to (x+1,y)
     *                  bit 1 = vertical edge from (x,y) to (x,y+1)
     * @param {Int32Array} edgeGrid - Edge grid from GPU
     * @returns {Array<{x1, y1, x2, y2, type}>} - List of dominoes
     */
    edgesToDominoes(edgeGrid) {
        const dominoes = [];
        const { minX, maxX, minY, maxY, width } = this.gridParams;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const idx = (y - minY) * width + (x - minX);
                const cell = edgeGrid[idx];

                // Check horizontal edge (bit 0) - domino from (x,y) to (x+1,y)
                if ((cell & 1) !== 0) {
                    // Horizontal domino
                    const isBlack = ((x + y) % 2 + 2) % 2 === 0;
                    dominoes.push({
                        x1: x, y1: y,
                        x2: x + 1, y2: y,
                        type: isBlack ? 0 : 1  // 0=horiz-black, 1=horiz-white
                    });
                }

                // Check vertical edge (bit 1) - domino from (x,y) to (x,y+1)
                if ((cell & 2) !== 0) {
                    // Vertical domino
                    const isBlack = ((x + y) % 2 + 2) % 2 === 0;
                    dominoes.push({
                        x1: x, y1: y,
                        x2: x, y2: y + 1,
                        type: isBlack ? 2 : 3  // 2=vert-black, 3=vert-white
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
        const edgeGrid = await this.getCFTPResult();
        if (!edgeGrid) return [];
        return this.edgesToDominoes(edgeGrid);
    }

    // ========================================================================
    // DOUBLE DIMER SUPPORT (4 chains)
    // ========================================================================

    /**
     * Initialize Double Dimer CFTP with 4 chains (2 independent pairs)
     * @param {Uint8Array} regionMask - Binary mask of region
     * @param {number} minX, maxX, minY, maxY - Bounds
     * @returns {Promise<boolean>} Success
     */
    async initDoubleDimerCFTP(regionMask, minX, maxX, minY, maxY) {
        if (!this.isReady) {
            console.error("WebGPU engine not initialized");
            return false;
        }

        // Clean up previous
        this.destroyDoubleDimer();

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        this.gridParams = { minX, maxX, minY, maxY, width, height };
        this.numCells = width * height;
        this.numFaces = Math.max(0, (width - 1) * (height - 1));

        const gridSize = this.numCells * 4;

        // Create region mask buffer
        this.ddRegionBuffer = this.device.createBuffer({
            size: Math.max(regionMask.byteLength, 4),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(this.ddRegionBuffer.getMappedRange()).set(regionMask);
        this.ddRegionBuffer.unmap();

        // Create 4 grid buffers (2 pairs x 2 chains each)
        this.ddPair0LowerBuffer = this.device.createBuffer({
            size: gridSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.ddPair0UpperBuffer = this.device.createBuffer({
            size: gridSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.ddPair1LowerBuffer = this.device.createBuffer({
            size: gridSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        this.ddPair1UpperBuffer = this.device.createBuffer({
            size: gridSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });

        // 2 random buffers (one per pair - different randomness!)
        const randomBufferSize = Math.max(this.numFaces, this.numCells) * 4;
        this.ddRandom0Buffer = this.device.createBuffer({
            size: Math.max(randomBufferSize, 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.ddRandom1Buffer = this.device.createBuffer({
            size: Math.max(randomBufferSize, 4), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // Uniform buffer
        this.ddUniformBuffer = this.device.createBuffer({
            size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // Staging buffers
        this.ddStagingBuffers = [];
        for (let i = 0; i < 4; i++) {
            this.ddStagingBuffers.push(this.device.createBuffer({
                size: gridSize, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            }));
        }

        // Create bind groups for all 4 chains
        this.ddPair0LowerBindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.ddPair0LowerBuffer } },
                { binding: 1, resource: { buffer: this.ddRandom0Buffer } },
                { binding: 2, resource: { buffer: this.ddUniformBuffer } },
                { binding: 3, resource: { buffer: this.ddRegionBuffer } }
            ]
        });
        this.ddPair0UpperBindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.ddPair0UpperBuffer } },
                { binding: 1, resource: { buffer: this.ddRandom0Buffer } },
                { binding: 2, resource: { buffer: this.ddUniformBuffer } },
                { binding: 3, resource: { buffer: this.ddRegionBuffer } }
            ]
        });
        this.ddPair1LowerBindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.ddPair1LowerBuffer } },
                { binding: 1, resource: { buffer: this.ddRandom1Buffer } },
                { binding: 2, resource: { buffer: this.ddUniformBuffer } },
                { binding: 3, resource: { buffer: this.ddRegionBuffer } }
            ]
        });
        this.ddPair1UpperBindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.ddPair1UpperBuffer } },
                { binding: 1, resource: { buffer: this.ddRandom1Buffer } },
                { binding: 2, resource: { buffer: this.ddUniformBuffer } },
                { binding: 3, resource: { buffer: this.ddRegionBuffer } }
            ]
        });

        // Compute extremal tilings for all 4 chains
        await this.computeDoubleDimerExtremalTilings();

        this.doubleDimerInitialized = true;
        console.log(`WebGPU Double Dimer CFTP initialized: 4 chains, ${this.numCells} cells`);
        return true;
    }

    /**
     * Compute extremal tilings for all 4 Double Dimer chains
     */
    async computeDoubleDimerExtremalTilings() {
        const { width, height } = this.gridParams;
        const workgroupCount = Math.ceil(this.numCells / 64);
        const numDiagonals = width + height - 1;

        // Clear all buffers first
        const zeros = new Int32Array(this.numCells);
        this.device.queue.writeBuffer(this.ddPair0LowerBuffer, 0, zeros);
        this.device.queue.writeBuffer(this.ddPair0UpperBuffer, 0, zeros);
        this.device.queue.writeBuffer(this.ddPair1LowerBuffer, 0, zeros);
        this.device.queue.writeBuffer(this.ddPair1UpperBuffer, 0, zeros);

        for (let diag = 0; diag < numDiagonals; diag++) {
            const uniformData = this.createUniformData(0, diag);
            this.device.queue.writeBuffer(this.ddUniformBuffer, 0, uniformData);

            const commandEncoder = this.device.createCommandEncoder();

            // Pair 0 lower: MIN
            const p0lPass = commandEncoder.beginComputePass();
            p0lPass.setPipeline(this.extremalMinPipeline);
            p0lPass.setBindGroup(0, this.ddPair0LowerBindGroup);
            p0lPass.dispatchWorkgroups(workgroupCount);
            p0lPass.end();

            // Pair 0 upper: MAX
            const p0uPass = commandEncoder.beginComputePass();
            p0uPass.setPipeline(this.extremalMaxPipeline);
            p0uPass.setBindGroup(0, this.ddPair0UpperBindGroup);
            p0uPass.dispatchWorkgroups(workgroupCount);
            p0uPass.end();

            // Pair 1 lower: MIN
            const p1lPass = commandEncoder.beginComputePass();
            p1lPass.setPipeline(this.extremalMinPipeline);
            p1lPass.setBindGroup(0, this.ddPair1LowerBindGroup);
            p1lPass.dispatchWorkgroups(workgroupCount);
            p1lPass.end();

            // Pair 1 upper: MAX
            const p1uPass = commandEncoder.beginComputePass();
            p1uPass.setPipeline(this.extremalMaxPipeline);
            p1uPass.setBindGroup(0, this.ddPair1UpperBindGroup);
            p1uPass.dispatchWorkgroups(workgroupCount);
            p1uPass.end();

            this.device.queue.submit([commandEncoder.finish()]);
        }

        await this.device.queue.onSubmittedWorkDone();
    }

    /**
     * Reset Double Dimer chains
     */
    async resetDoubleDimerChains() {
        if (!this.doubleDimerInitialized) return;
        await this.computeDoubleDimerExtremalTilings();
    }

    /**
     * Run Double Dimer CFTP steps (4 chains, 2 independent pairs)
     * @param {number} numSteps - Number of steps
     * @param {number} checkInterval - Check coalescence interval
     * @returns {Promise<{pair0Coalesced, pair1Coalesced, stepsRun}>}
     */
    async stepDoubleDimerCFTP(numSteps, checkInterval = 0) {
        if (!this.doubleDimerInitialized) return { pair0Coalesced: false, pair1Coalesced: false, stepsRun: 0 };

        const faceWorkgroups = Math.ceil(this.numFaces / 64);
        const randomDataSize = Math.max(this.numFaces, 1);
        const random0Data = new Float32Array(randomDataSize);
        const random1Data = new Float32Array(randomDataSize);
        let stepsRun = 0;

        for (let step = 0; step < numSteps; step++) {
            // Generate DIFFERENT randoms for each pair
            for (let i = 0; i < randomDataSize; i++) {
                random0Data[i] = Math.random();
                random1Data[i] = Math.random();
            }
            this.device.queue.writeBuffer(this.ddRandom0Buffer, 0, random0Data);
            this.device.queue.writeBuffer(this.ddRandom1Buffer, 0, random1Data);

            // 4-color sweep for all 4 chains
            for (let color = 0; color < 4; color++) {
                const uniformData = this.createUniformData(color, 0);
                this.device.queue.writeBuffer(this.ddUniformBuffer, 0, uniformData);

                const commandEncoder = this.device.createCommandEncoder();

                // Pair 0 lower
                const p0lPass = commandEncoder.beginComputePass();
                p0lPass.setPipeline(this.cftpPipeline);
                p0lPass.setBindGroup(0, this.ddPair0LowerBindGroup);
                p0lPass.dispatchWorkgroups(faceWorkgroups);
                p0lPass.end();

                // Pair 0 upper
                const p0uPass = commandEncoder.beginComputePass();
                p0uPass.setPipeline(this.cftpPipeline);
                p0uPass.setBindGroup(0, this.ddPair0UpperBindGroup);
                p0uPass.dispatchWorkgroups(faceWorkgroups);
                p0uPass.end();

                // Pair 1 lower
                const p1lPass = commandEncoder.beginComputePass();
                p1lPass.setPipeline(this.cftpPipeline);
                p1lPass.setBindGroup(0, this.ddPair1LowerBindGroup);
                p1lPass.dispatchWorkgroups(faceWorkgroups);
                p1lPass.end();

                // Pair 1 upper
                const p1uPass = commandEncoder.beginComputePass();
                p1uPass.setPipeline(this.cftpPipeline);
                p1uPass.setBindGroup(0, this.ddPair1UpperBindGroup);
                p1uPass.dispatchWorkgroups(faceWorkgroups);
                p1uPass.end();

                this.device.queue.submit([commandEncoder.finish()]);
            }

            stepsRun++;

            if (checkInterval > 0 && stepsRun % checkInterval === 0) {
                await this.device.queue.onSubmittedWorkDone();
                const pair0Coalesced = await this.checkDoubleDimerCoalescence(0);
                const pair1Coalesced = await this.checkDoubleDimerCoalescence(1);
                if (pair0Coalesced && pair1Coalesced) {
                    return { pair0Coalesced: true, pair1Coalesced: true, stepsRun };
                }
            }
        }

        await this.device.queue.onSubmittedWorkDone();
        const pair0Coalesced = await this.checkDoubleDimerCoalescence(0);
        const pair1Coalesced = await this.checkDoubleDimerCoalescence(1);
        return { pair0Coalesced, pair1Coalesced, stepsRun };
    }

    /**
     * Check coalescence for one pair
     */
    async checkDoubleDimerCoalescence(pairIndex) {
        if (!this.doubleDimerInitialized) return false;

        const lowerBuffer = pairIndex === 0 ? this.ddPair0LowerBuffer : this.ddPair1LowerBuffer;
        const upperBuffer = pairIndex === 0 ? this.ddPair0UpperBuffer : this.ddPair1UpperBuffer;
        const lowerStaging = this.ddStagingBuffers[pairIndex * 2];
        const upperStaging = this.ddStagingBuffers[pairIndex * 2 + 1];

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(lowerBuffer, 0, lowerStaging, 0, lowerBuffer.size);
        commandEncoder.copyBufferToBuffer(upperBuffer, 0, upperStaging, 0, upperBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);

        await lowerStaging.mapAsync(GPUMapMode.READ);
        await upperStaging.mapAsync(GPUMapMode.READ);

        const lowerData = new Int32Array(lowerStaging.getMappedRange().slice(0));
        const upperData = new Int32Array(upperStaging.getMappedRange().slice(0));

        lowerStaging.unmap();
        upperStaging.unmap();

        for (let i = 0; i < lowerData.length; i++) {
            if ((lowerData[i] & 3) !== (upperData[i] & 3)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get Double Dimer results (both samples)
     */
    async getDoubleDimerResults() {
        if (!this.doubleDimerInitialized) return null;

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.ddPair0LowerBuffer, 0, this.ddStagingBuffers[0], 0, this.ddPair0LowerBuffer.size);
        commandEncoder.copyBufferToBuffer(this.ddPair1LowerBuffer, 0, this.ddStagingBuffers[2], 0, this.ddPair1LowerBuffer.size);
        this.device.queue.submit([commandEncoder.finish()]);

        await this.ddStagingBuffers[0].mapAsync(GPUMapMode.READ);
        await this.ddStagingBuffers[2].mapAsync(GPUMapMode.READ);

        const sample0 = new Int32Array(this.ddStagingBuffers[0].getMappedRange().slice(0));
        const sample1 = new Int32Array(this.ddStagingBuffers[2].getMappedRange().slice(0));

        this.ddStagingBuffers[0].unmap();
        this.ddStagingBuffers[2].unmap();

        return {
            sample0: this.edgesToDominoes(sample0),
            sample1: this.edgesToDominoes(sample1)
        };
    }

    /**
     * Finalize Double Dimer CFTP
     */
    async finalizeDoubleDimerCFTP() {
        return await this.getDoubleDimerResults();
    }

    /**
     * Clean up Double Dimer resources
     */
    destroyDoubleDimer() {
        const buffers = [
            'ddPair0LowerBuffer', 'ddPair0UpperBuffer',
            'ddPair1LowerBuffer', 'ddPair1UpperBuffer',
            'ddRandom0Buffer', 'ddRandom1Buffer',
            'ddUniformBuffer', 'ddRegionBuffer'
        ];
        for (const name of buffers) {
            if (this[name]) {
                this[name].destroy();
                this[name] = null;
            }
        }
        if (this.ddStagingBuffers) {
            for (const buf of this.ddStagingBuffers) {
                if (buf) buf.destroy();
            }
            this.ddStagingBuffers = null;
        }
        this.doubleDimerInitialized = false;
    }

    /**
     * Clean up CFTP resources
     */
    destroyCFTP() {
        const buffers = [
            'lowerGridBuffer', 'upperGridBuffer',
            'randomBuffer', 'uniformBuffer', 'regionBuffer',
            'lowerStagingBuffer', 'upperStagingBuffer'
        ];
        for (const name of buffers) {
            if (this[name]) {
                this[name].destroy();
                this[name] = null;
            }
        }
        this.cftpInitialized = false;
    }

    /**
     * Check if engine is ready and CFTP is initialized
     */
    isInitialized() {
        return this.isReady && this.cftpInitialized;
    }

    /**
     * Check if Double Dimer is initialized
     */
    isDoubleDimerInitialized() {
        return this.isReady && this.doubleDimerInitialized;
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
