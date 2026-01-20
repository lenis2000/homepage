/**
 * Fluctuations Slide - GFF Visualization
 * Shows height fluctuations from double dimer model
 */

(async function() {
    'use strict';

    const canvas = document.getElementById('gff-canvas');
    const sampleBtn = document.getElementById('gff-sample-btn');
    if (!canvas) return;

    // Wait for LozengeModule
    while (typeof LozengeModule === 'undefined') {
        await new Promise(r => setTimeout(r, 50));
    }

    const wasm = await LozengeModule();

    // WASM function wrappers
    const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
    const freeString = wasm.cwrap('freeString', null, ['number']);
    const initCFTPWasm = wasm.cwrap('initCFTP', 'number', []);
    const getGridBoundsWasm = wasm.cwrap('getGridBounds', 'number', []);
    const getCFTPMinGridDataWasm = wasm.cwrap('getCFTPMinGridData', 'number', []);
    const getCFTPMaxGridDataWasm = wasm.cwrap('getCFTPMaxGridData', 'number', []);
    const exportDimers = wasm.cwrap('exportDimers', 'number', []);
    const runCFTP = wasm.cwrap('runCFTP', 'number', []);

    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);
    const sqrt2 = Math.sqrt(2);
    function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

    // GPU engine
    let gpuEngine = null;
    let gpuAvailable = false;

    // Initialize GPU engine if available
    async function initGpuEngine() {
        if (!navigator.gpu) return false;

        // Wait for WebGPU engine script to load (loaded at top of file)
        let waitCount = 0;
        while (!window.WebGPULozengeEngine && waitCount < 50) {
            await new Promise(r => setTimeout(r, 100));
            waitCount++;
        }
        if (!window.WebGPULozengeEngine) return false;
        try {
            gpuEngine = new WebGPULozengeEngine();
            const initPromise = gpuEngine.init();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('GPU init timeout')), 5000)
            );
            await Promise.race([initPromise, timeoutPromise]);
            gpuAvailable = gpuEngine.isAvailable();
            console.log('GFF slide: GPU engine', gpuAvailable ? 'ready' : 'unavailable');
            return gpuAvailable;
        } catch (e) {
            console.warn('GFF slide: GPU init failed:', e);
            return false;
        }
    }

    // Load shape from JSON file
    let shapeData = null;

    async function loadShapeData() {
        const response = await fetch('/letters/K.json');
        const json = await response.json();

        const triangleArr = [];
        const blackTriangles = [];
        const whiteTriangles = [];

        for (const tri of json.triangles) {
            const { n, j, type } = tri;
            triangleArr.push(n, j, type);

            if (type === 1) {
                const bv1 = getVertex(n, j), bv2 = getVertex(n, j-1), bv3 = getVertex(n+1, j-1);
                blackTriangles.push({ n, j, verts: [bv1, bv2, bv3] });
            } else {
                const wv1 = getVertex(n, j), wv2 = getVertex(n+1, j), wv3 = getVertex(n+1, j-1);
                whiteTriangles.push({ n, j, verts: [wv1, wv2, wv3] });
            }
        }

        return { triangleArr, blackTriangles, whiteTriangles };
    }

    function initRegion() {
        const dataPtr = wasm._malloc(shapeData.triangleArr.length * 4);
        for (let i = 0; i < shapeData.triangleArr.length; i++) {
            wasm.setValue(dataPtr + i * 4, shapeData.triangleArr[i], 'i32');
        }
        const ptr = initFromTriangles(dataPtr, shapeData.triangleArr.length);
        freeString(ptr);
        wasm._free(dataPtr);
    }

    // Get extremal grid data for GPU
    function getGridBounds() {
        const ptr = getGridBoundsWasm();
        const str = wasm.UTF8ToString(ptr);
        freeString(ptr);
        return JSON.parse(str);
    }

    function getCFTPMinRawGridData(bounds) {
        const dataPtr = getCFTPMinGridDataWasm();
        if (!dataPtr) return null;
        const data = new Int32Array(bounds.size);
        for (let i = 0; i < bounds.size; i++) {
            data[i] = wasm.getValue(dataPtr + i * 4, 'i32');
        }
        wasm._free(dataPtr);
        return data;
    }

    function getCFTPMaxRawGridData(bounds) {
        const dataPtr = getCFTPMaxGridDataWasm();
        if (!dataPtr) return null;
        const data = new Int32Array(bounds.size);
        for (let i = 0; i < bounds.size; i++) {
            data[i] = wasm.getValue(dataPtr + i * 4, 'i32');
        }
        wasm._free(dataPtr);
        return data;
    }

    // WASM CFTP fallback
    function sampleCFTPWasm() {
        const ptr = runCFTP();
        freeString(ptr);
        const dimPtr = exportDimers();
        const json = wasm.UTF8ToString(dimPtr);
        freeString(dimPtr);
        return JSON.parse(json).dimers || [];
    }

    // Compute height function from dimers
    function computeHeightFunction(dimers) {
        const getVertexKeys = (dimer) => {
            const { bn, bj, t } = dimer;
            if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
        };
        const getHeightPattern = (t) => {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        };

        const vertexToDimers = new Map();
        for (const dimer of dimers) {
            for (const [n, j] of getVertexKeys(dimer)) {
                const key = `${n},${j}`;
                if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                vertexToDimers.get(key).push(dimer);
            }
        }

        const heights = new Map();
        if (dimers.length === 0) return heights;

        const firstVerts = getVertexKeys(dimers[0]);
        const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
        heights.set(startKey, 0);

        const queue = [startKey];
        const visited = new Set();

        while (queue.length > 0) {
            const currentKey = queue.shift();
            if (visited.has(currentKey)) continue;
            visited.add(currentKey);

            const currentH = heights.get(currentKey);
            const [cn, cj] = currentKey.split(',').map(Number);

            for (const dimer of vertexToDimers.get(currentKey) || []) {
                const verts = getVertexKeys(dimer);
                const pattern = getHeightPattern(dimer.t);

                let myIdx = -1;
                for (let i = 0; i < 4; i++) {
                    if (verts[i][0] === cn && verts[i][1] === cj) { myIdx = i; break; }
                }

                if (myIdx >= 0) {
                    for (let i = 0; i < 4; i++) {
                        const [vn, vj] = verts[i];
                        const nkey = `${vn},${vj}`;
                        if (!heights.has(nkey)) {
                            heights.set(nkey, currentH + (pattern[i] - pattern[myIdx]));
                            queue.push(nkey);
                        }
                    }
                }
            }
        }
        return heights;
    }

    // Diverging colormap: blue (negative) -> white (zero) -> red (positive)
    function valueToColor(val, absMax) {
        if (absMax === 0) return 'rgb(255, 255, 255)';
        const t = Math.max(-1, Math.min(1, val / absMax));
        const gamma = 0.5;
        if (t < 0) {
            const s = Math.pow(-t, gamma);
            return `rgb(${Math.round(255 * (1 - s))}, ${Math.round(255 * (1 - s))}, 255)`;
        } else {
            const s = Math.pow(t, gamma);
            return `rgb(255, ${Math.round(255 * (1 - s))}, ${Math.round(255 * (1 - s))})`;
        }
    }

    function drawGFF(dimers1, dimers2) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        const h1 = computeHeightFunction(dimers1);
        const h2 = computeHeightFunction(dimers2);

        const fluctuations = new Map();
        for (const [key, val1] of h1) {
            const val2 = h2.get(key);
            if (val2 !== undefined) {
                fluctuations.set(key, (val1 - val2) / sqrt2);
            }
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const tri of [...shapeData.blackTriangles, ...shapeData.whiteTriangles]) {
            for (const v of tri.verts) {
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            }
        }

        const scale = Math.min(w / (maxX - minX), h / (maxY - minY)) * 0.9;
        const cx = w / 2 - ((minX + maxX) / 2) * scale;
        const cy = h / 2 + ((minY + maxY) / 2) * scale;

        function tx(x) { return cx + x * scale; }
        function ty(y) { return cy - y * scale; }

        let absMax = 0;
        for (const [, val] of fluctuations) {
            absMax = Math.max(absMax, Math.abs(val));
        }

        function getFluctValue(n, j) {
            return fluctuations.get(`${n},${j}`) || 0;
        }

        for (const tri of shapeData.blackTriangles) {
            const { n, j, verts } = tri;
            const avgVal = (getFluctValue(n, j) + getFluctValue(n, j-1) + getFluctValue(n+1, j-1)) / 3;
            ctx.beginPath();
            ctx.moveTo(tx(verts[0].x), ty(verts[0].y));
            ctx.lineTo(tx(verts[1].x), ty(verts[1].y));
            ctx.lineTo(tx(verts[2].x), ty(verts[2].y));
            ctx.closePath();
            ctx.fillStyle = valueToColor(avgVal, absMax);
            ctx.fill();
        }

        for (const tri of shapeData.whiteTriangles) {
            const { n, j, verts } = tri;
            const avgVal = (getFluctValue(n, j) + getFluctValue(n+1, j) + getFluctValue(n+1, j-1)) / 3;
            ctx.beginPath();
            ctx.moveTo(tx(verts[0].x), ty(verts[0].y));
            ctx.lineTo(tx(verts[1].x), ty(verts[1].y));
            ctx.lineTo(tx(verts[2].x), ty(verts[2].y));
            ctx.closePath();
            ctx.fillStyle = valueToColor(avgVal, absMax);
            ctx.fill();
        }
    }

    let initialized = false;
    let sampling = false;

    // GPU CFTP sampling
    async function sampleGPU() {
        sampleBtn.textContent = 'Sampling...';
        sampleBtn.disabled = true;

        // Initialize WASM CFTP to get extremal states
        const initPtr = initCFTPWasm();
        freeString(initPtr);

        const bounds = getGridBounds();
        const minGridData = getCFTPMinRawGridData(bounds);
        const maxGridData = getCFTPMaxRawGridData(bounds);

        if (!minGridData || !maxGridData) {
            console.error('Failed to get extremal states');
            sampleBtn.textContent = 'Re-sample GFF';
            sampleBtn.disabled = false;
            return;
        }

        // Initialize GPU fluctuations CFTP
        const gpuOk = await gpuEngine.initFluctuationsCFTP(minGridData, maxGridData);
        if (!gpuOk) {
            console.warn('GPU CFTP init failed, falling back to WASM');
            gpuEngine.destroyFluctuationsCFTP();
            const dimers1 = sampleCFTPWasm();
            const dimers2 = sampleCFTPWasm();
            drawGFF(dimers1, dimers2);
            sampleBtn.textContent = 'Re-sample GFF';
            sampleBtn.disabled = false;
            return;
        }

        // Set uniform weights (q=1)
        gpuEngine.setFluctuationsWeights(null, 1, false, 1.0);

        // GPU CFTP loop with epoch doubling
        let T = 1;
        const maxT = 1073741824;
        const stepsPerBatch = 1000;
        const checkInterval = 1000;

        let totalStepsAllEpochs = 0;

        async function gpuFluctStep() {
            gpuEngine.resetFluctuationsChains();

            let totalStepsRun = 0;
            let coalesced = [false, false];

            while (totalStepsRun < T && !(coalesced[0] && coalesced[1])) {
                const batchSize = Math.min(stepsPerBatch, T - totalStepsRun);
                const result = await gpuEngine.stepFluctuationsCFTP(batchSize, checkInterval);
                totalStepsRun += result.stepsRun;
                coalesced = result.coalesced;

                // Update progress
                const c0 = coalesced[0] ? '✓' : '○';
                const c1 = coalesced[1] ? '✓' : '○';
                const kSteps = Math.round((totalStepsAllEpochs + totalStepsRun) / 1000);
                sampleBtn.textContent = `T=${T} ${kSteps}k [${c0}${c1}]`;
                await new Promise(r => setTimeout(r, 0)); // yield for UI
            }
            totalStepsAllEpochs += totalStepsRun;

            const finalCoalesced = await gpuEngine.checkFluctuationsCoalescence();

            if (finalCoalesced[0] && finalCoalesced[1]) {
                const samples = await gpuEngine.getFluctuationsSamples(shapeData.blackTriangles);
                gpuEngine.destroyFluctuationsCFTP();
                drawGFF(samples.sample0, samples.sample1);
                sampleBtn.textContent = 'Re-sample GFF';
                sampleBtn.disabled = false;
                sampling = false;
            } else if (T >= maxT) {
                gpuEngine.destroyFluctuationsCFTP();
                sampleBtn.textContent = 'Timeout';
                sampleBtn.disabled = false;
                sampling = false;
            } else {
                T *= 2;
                setTimeout(gpuFluctStep, 0);
            }
        }

        setTimeout(gpuFluctStep, 10);
    }

    // WASM CFTP sampling (fallback)
    function sampleWASM() {
        sampleBtn.textContent = 'Sampling...';
        sampleBtn.disabled = true;

        setTimeout(() => {
            const dimers1 = sampleCFTPWasm();
            const dimers2 = sampleCFTPWasm();
            drawGFF(dimers1, dimers2);
            sampleBtn.textContent = 'Re-sample GFF';
            sampleBtn.disabled = false;
            sampling = false;
        }, 10);
    }

    async function sample() {
        if (sampling) return;
        sampling = true;

        if (!initialized) {
            sampleBtn.textContent = 'Loading...';
            shapeData = await loadShapeData();
            initRegion();
            await initGpuEngine();
            initialized = true;
        }

        if (gpuAvailable) {
            await sampleGPU();
        } else {
            sampleWASM();
        }
    }

    sampleBtn.addEventListener('click', sample);

    // Register with slide engine
    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('fluctuations', {
                start() {},
                pause() {},
                onSlideEnter() { if (!initialized) sample(); },
                onSlideLeave() {}
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
})();
