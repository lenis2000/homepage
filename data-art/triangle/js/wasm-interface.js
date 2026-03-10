// Triangle data-art WASM interface — modularized WASM loading + SimulatorInterface
(function() {
    'use strict';

    class SimulatorInterface {
        static async create() {
            const mod = await TriangleLozenge();
            return new SimulatorInterface(mod);
        }

        constructor(mod) {
            this.mod = mod;
            this.initFromTrianglesWasm = mod.cwrap('initFromTriangles', 'number', ['number', 'number']);
            this.performGlauberStepsWasm = mod.cwrap('performGlauberSteps', 'number', ['number']);
            this.exportDimersWasm = mod.cwrap('exportDimers', 'number', []);
            this.setQBiasWasm = mod.cwrap('setQBias', null, ['number']);
            this.setHoleBaseHeightWasm = mod.cwrap('setHoleBaseHeight', 'number', ['number', 'number']);
            this.getHoleCountWasm = mod.cwrap('getHoleCount', 'number', []);
            this.getAllHolesInfoWasm = mod.cwrap('getAllHolesInfo', 'number', []);
            this.adjustHoleWindingWasm = mod.cwrap('adjustHoleWindingExport', 'number', ['number', 'number']);
            this.freeStringWasm = mod.cwrap('freeString', null, ['number']);
            this.initCFTPWasm = mod.cwrap('initCFTP', 'number', []);
            this.stepCFTPWasm = mod.cwrap('stepCFTP', 'number', []);
            this.finalizeCFTPWasm = mod.cwrap('finalizeCFTP', 'number', []);

            this.dimers = [];
            this.boundaries = [];
            this.isValid = false;
        }

        initFromTriangles(trianglesMap) {
            const mod = this.mod;
            const arr = [];
            for (const [key, tri] of trianglesMap) {
                arr.push(tri.n, tri.j, tri.type);
            }

            if (arr.length === 0) {
                this.isValid = false;
                return { status: 'empty' };
            }

            const dataPtr = mod._malloc(arr.length * 4);
            for (let i = 0; i < arr.length; i++) {
                mod.setValue(dataPtr + i * 4, arr[i], 'i32');
            }

            const ptr = this.initFromTrianglesWasm(dataPtr, arr.length);
            const jsonStr = mod.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            mod._free(dataPtr);

            const result = JSON.parse(jsonStr);
            this.isValid = result.status === 'valid';

            if (this.isValid) {
                this.refreshDimers();
            }

            return result;
        }

        step(numSteps) {
            const ptr = this.performGlauberStepsWasm(numSteps);
            const jsonStr = this.mod.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            this.refreshDimers();
            return result;
        }

        refreshDimers() {
            const ptr = this.exportDimersWasm();
            const jsonStr = this.mod.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            this.boundaries = result.boundaries || [];
            this.dimers = result.dimers;
        }

        setQBias(q) {
            this.setQBiasWasm(q);
        }

        setHoleBaseHeight(holeIdx, height) {
            this.setHoleBaseHeightWasm(holeIdx, height);
        }

        getHoleCount() {
            return this.getHoleCountWasm();
        }

        getAllHolesInfo() {
            const ptr = this.getAllHolesInfoWasm();
            const jsonStr = this.mod.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        adjustHoleWinding(holeIdx, delta) {
            const ptr = this.adjustHoleWindingWasm(holeIdx, delta);
            const jsonStr = this.mod.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        initCFTP() {
            const ptr = this.initCFTPWasm();
            const jsonStr = this.mod.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        stepCFTP() {
            const ptr = this.stepCFTPWasm();
            const jsonStr = this.mod.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        finalizeCFTP() {
            const ptr = this.finalizeCFTPWasm();
            const jsonStr = this.mod.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            if (result.status === 'finalized') {
                this.refreshDimers();
            }
            return result;
        }
    }

    window.SimulatorInterface = SimulatorInterface;
})();
