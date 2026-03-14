/**
 * WASM Loader for Lozenge Tiling simulations
 * Provides isolated WASM instances and standard cwrap wrappers
 */

window.WasmLoader = {
    /**
     * Wait for LozengeModule to be available
     */
    async waitForModule() {
        while (typeof LozengeModule === 'undefined') {
            await new Promise(r => setTimeout(r, 50));
        }
    },

    /**
     * Create an isolated WASM instance with standard wrappers
     * @returns {Object} Object with wasm instance and wrapped functions
     */
    async createInstance() {
        await this.waitForModule();
        const wasm = await LozengeModule();

        return {
            wasm,
            // Standard wrappers
            initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
            runCFTP: wasm.cwrap('runCFTP', 'number', []),
            exportDimers: wasm.cwrap('exportDimers', 'number', []),
            freeString: wasm.cwrap('freeString', null, ['number']),
            performGlauberSteps: wasm.cwrap('performGlauberSteps', 'number', ['number']),
            setUseRandomSweeps: wasm.cwrap('setUseRandomSweeps', null, ['number']),
            // GPU CFTP wrappers
            initCFTP: wasm.cwrap('initCFTP', 'number', []),
            getGridBounds: wasm.cwrap('getGridBounds', 'number', []),
            getCFTPMinGridData: wasm.cwrap('getCFTPMinGridData', 'number', []),
            getCFTPMaxGridData: wasm.cwrap('getCFTPMaxGridData', 'number', []),

            // Helper methods
            allocateInt32Array(arr) {
                const ptr = wasm._malloc(arr.length * 4);
                for (let i = 0; i < arr.length; i++) {
                    wasm.setValue(ptr + i * 4, arr[i], 'i32');
                }
                return ptr;
            },

            readString(ptr) {
                const str = wasm.UTF8ToString(ptr);
                this.freeString(ptr);
                return str;
            },

            readInt32Array(ptr, size) {
                const data = new Int32Array(size);
                for (let i = 0; i < size; i++) {
                    data[i] = wasm.getValue(ptr + i * 4, 'i32');
                }
                wasm._free(ptr);
                return data;
            }
        };
    }
};
