/**
 * Web Worker for GFF CFTP sampling.
 * Accepts a pre-compiled WebAssembly.Module to skip recompilation.
 *
 * Messages:
 *   init  { wasmSrc, wasmBase, module?, seed, triangles } → ready  { dimers }
 *   sample {}                                              → sampled { dimers }
 */
let inst = null;

self.onmessage = async function(e) {
    const msg = e.data;

    if (msg.type === 'init') {
        try {
            importScripts(msg.wasmSrc);

            const config = { locateFile: (path) => msg.wasmBase + path };

            // Use pre-compiled module if provided (skip recompilation)
            if (msg.module) {
                config.instantiateWasm = function(imports, successCallback) {
                    WebAssembly.instantiate(msg.module, imports).then(function(instance) {
                        successCallback(instance);
                    });
                    return {};
                };
            }

            const wasm = await LozengeModule(config);

            inst = {
                wasm,
                initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
                runCFTP: wasm.cwrap('runCFTP', 'number', []),
                exportDimers: wasm.cwrap('exportDimers', 'number', []),
                freeString: wasm.cwrap('freeString', null, ['number']),
                performGlauberSteps: wasm.cwrap('performGlauberSteps', 'number', ['number'])
            };

            const tris = new Int32Array(msg.triangles);
            const ptr = wasm._malloc(tris.length * 4);
            for (let i = 0; i < tris.length; i++) {
                wasm.setValue(ptr + i * 4, tris[i], 'i32');
            }
            const initPtr = inst.initFromTriangles(ptr, tris.length);
            inst.freeString(initPtr);
            wasm._free(ptr);

            // Advance RNG state for worker 2 so CFTP produces an independent sample
            // (WASM uses hard-coded initial seed; Glauber steps advance xorshift state)
            if (msg.workerIndex > 0) {
                inst.performGlauberSteps(msg.workerIndex * 1000);
            }

            if (typeof wasm._getHoleCount === 'function' && typeof wasm._adjustHoleWinding === 'function') {
                const getHoleCount = wasm.cwrap('getHoleCount', 'number', []);
                const adjustHoleWinding = wasm.cwrap('adjustHoleWinding', 'number', ['number', 'number']);
                const n = getHoleCount();
                for (let h = 0; h < n; h++) {
                    inst.freeString(adjustHoleWinding(h, 1));
                }
            }

            const dp = inst.exportDimers();
            const json = wasm.UTF8ToString(dp);
            inst.freeString(dp);
            self.postMessage({ type: 'ready', dimers: json });
        } catch (err) {
            self.postMessage({ type: 'error', message: err.toString() });
        }
    }

    if (msg.type === 'sample') {
        try {
            inst.freeString(inst.runCFTP());
            const dp = inst.exportDimers();
            const json = inst.wasm.UTF8ToString(dp);
            inst.freeString(dp);
            self.postMessage({ type: 'sampled', dimers: json });
        } catch (err) {
            self.postMessage({ type: 'error', message: err.toString() });
        }
    }
};
