/**
 * Summary Visual Slide — Three Static Escher Tilings
 * Loads SHAPE.json (non-simply-connected), sets hole winding to 6, 16, 22.
 * GPU CFTP sampling, 2D canvas rendering with UVA colors.
 * Samples one after the other, displays each as it completes. No animation.
 */
(function initSummaryVisualSim() {
    if (!window.slideEngine) {
        setTimeout(initSummaryVisualSim, 50);
        return;
    }

    const CONFIGS = [
        { winding: 6,  canvasId: 'summary-hex-6' },
        { winding: 16, canvasId: 'summary-hex-16' },
        { winding: 26, canvasId: 'summary-hex-22' }
    ];

    let initGen = 0;

    // === Triangular lattice helpers ===
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);
    function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

    function getVertexKeys(d) {
        const { bn, bj, t } = d;
        if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
        if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
        return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
    }

    const COLORS = { 0: '#E57200', 1: '#232D4B', 2: '#F9DCBF' };

    function drawTiling(ctx, canvas, dimers) {
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        if (!dimers || dimers.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const d of dimers) {
            for (const [n, j] of getVertexKeys(d)) {
                const v = getVertex(n, j);
                if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
                if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
            }
        }

        const pad = 5;
        const scale = Math.min((w - 2 * pad) / (maxX - minX || 1), (h - 2 * pad) / (maxY - minY || 1));
        const ox = pad + (w - 2 * pad - (maxX - minX) * scale) / 2;
        const oy = pad + (h - 2 * pad - (maxY - minY) * scale) / 2;

        for (const d of dimers) {
            const cv = getVertexKeys(d).map(([n, j]) => {
                const v = getVertex(n, j);
                return { x: ox + (v.x - minX) * scale, y: oy + (v.y - minY) * scale };
            });
            const c = COLORS[d.t] || '#ccc';
            ctx.fillStyle = c;
            ctx.strokeStyle = c;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cv[0].x, cv[0].y);
            for (let i = 1; i < cv.length; i++) ctx.lineTo(cv[i].x, cv[i].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    // === Shared shape data (loaded once) ===
    let shapeTrianglesJSON = null;

    async function loadShape() {
        if (shapeTrianglesJSON) return shapeTrianglesJSON;
        const resp = await fetch('/letters/SHAPE.json');
        const data = await resp.json();
        shapeTrianglesJSON = data.triangles;
        return shapeTrianglesJSON;
    }

    // === Sample one instance: WASM init + GPU CFTP, draw result ===
    async function sampleAndDraw(config, gen) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas || typeof LozengeModule === 'undefined') return;
        const ctx = canvas.getContext('2d');

        // Use HTML width/height attributes as pixel buffer size

        const shapeTris = await loadShape();
        if (gen !== initGen) return;

        const wasm = await LozengeModule();
        if (gen !== initGen) return;

        const cw = (name, ret, args) => wasm.cwrap(name, ret, args);
        const f = {
            initFromTriangles: cw('initFromTriangles', 'number', ['number', 'number']),
            runCFTP: cw('runCFTP', 'number', []),
            exportDimers: cw('exportDimers', 'number', []),
            freeString: cw('freeString', null, ['number']),
            setUseRandomSweeps: cw('setUseRandomSweeps', null, ['number']),
            getHoleCount: cw('getHoleCount', 'number', []),
            adjustHoleWinding: cw('adjustHoleWindingExport', 'number', ['number', 'number']),
            initCFTP: cw('initCFTP', 'number', []),
            getGridBounds: cw('getGridBounds', 'number', []),
            getCFTPMinGridData: cw('getCFTPMinGridData', 'number', []),
            getCFTPMaxGridData: cw('getCFTPMaxGridData', 'number', [])
        };

        // Load shape into WASM
        const triArr = [];
        for (const tri of shapeTris) triArr.push(tri.n, tri.j, tri.type);
        const ptr = wasm._malloc(triArr.length * 4);
        for (let i = 0; i < triArr.length; i++) wasm.setValue(ptr + i * 4, triArr[i], 'i32');
        const initPtr = f.initFromTriangles(ptr, triArr.length);
        f.freeString(initPtr);
        wasm._free(ptr);

        // Set hole winding
        const holeCount = f.getHoleCount();
        for (let h = 0; h < holeCount; h++) {
            const adjPtr = f.adjustHoleWinding(h, config.winding);
            f.freeString(adjPtr);
        }

        f.setUseRandomSweeps(1);

        // Black triangles for GPU dimer extraction
        const blackTriangles = shapeTris.filter(t => t.type === 1).map(t => ({ n: t.n, j: t.j }));

        // Try GPU CFTP
        let dimers = null;
        let gpu = null;

        if (typeof WebGPULozengeEngine !== 'undefined') {
            try {
                const cftpPtr = f.initCFTP();
                f.freeString(cftpPtr);

                const boundsPtr = f.getGridBounds();
                const bounds = JSON.parse(wasm.UTF8ToString(boundsPtr));
                f.freeString(boundsPtr);

                const minPtr = f.getCFTPMinGridData();
                const minGrid = new Int32Array(bounds.size);
                for (let i = 0; i < bounds.size; i++) minGrid[i] = wasm.getValue(minPtr + i * 4, 'i32');
                wasm._free(minPtr);

                const maxPtr = f.getCFTPMaxGridData();
                const maxGrid = new Int32Array(bounds.size);
                for (let i = 0; i < bounds.size; i++) maxGrid[i] = wasm.getValue(maxPtr + i * 4, 'i32');
                wasm._free(maxPtr);

                gpu = new WebGPULozengeEngine();
                await gpu.init();
                if (gen !== initGen) { gpu.destroy(); return; }

                gpu.initFromWasmData(minGrid, bounds.minN, bounds.maxN, bounds.minJ, bounds.maxJ);
                const gpuCftpOk = await gpu.initCFTP(minGrid, maxGrid);

                if (gpuCftpOk) {
                    let T = 1;
                    const maxT = 134217728;
                    let coalesced = false;
                    while (!coalesced && T <= maxT) {
                        if (gen !== initGen) { gpu.destroyCFTP(); gpu.destroy(); return; }
                        gpu.resetCFTPChains(minGrid, maxGrid);
                        const result = await gpu.stepCFTP(T, Math.min(T, 10000));
                        coalesced = result.coalesced;
                        if (!coalesced) coalesced = await gpu.checkCoalescence();
                        if (!coalesced) T *= 2;
                    }
                    if (coalesced) {
                        const resultGrid = await gpu.getCFTPResult();
                        dimers = gpu.gridToDimers(resultGrid, blackTriangles);
                    }
                    gpu.destroyCFTP();
                }
                gpu.destroy();
            } catch (e) {
                console.warn('[summary] GPU CFTP failed for winding=' + config.winding + ':', e.message);
                if (gpu) { try { gpu.destroy(); } catch (_) {} }
            }
        }

        // WASM fallback
        if (!dimers) {
            const cftpPtr = f.runCFTP();
            f.freeString(cftpPtr);
            const dimersPtr = f.exportDimers();
            const json = wasm.UTF8ToString(dimersPtr);
            f.freeString(dimersPtr);
            dimers = JSON.parse(json).dimers || [];
        }

        if (gen !== initGen) return;
        drawTiling(ctx, canvas, dimers);
    }

    // === Sequential init: sample one after another ===
    async function initAll() {
        const gen = ++initGen;
        if (typeof LozengeModule === 'undefined') return;

        // Clear canvases
        for (const config of CONFIGS) {
            const c = document.getElementById(config.canvasId);
            if (c) { const cx = c.getContext('2d'); cx.clearRect(0, 0, c.width, c.height); }
        }

        for (const config of CONFIGS) {
            if (gen !== initGen) return;
            try {
                await sampleAndDraw(config, gen);
            } catch (e) {
                console.error('[summary] init failed for winding=' + config.winding, e);
            }
        }
    }

    function disposeAll() {
        initGen++;
        // Clear canvases
        for (const config of CONFIGS) {
            const c = document.getElementById(config.canvasId);
            if (c) { const cx = c.getContext('2d'); cx.clearRect(0, 0, c.width, c.height); }
        }
    }

    // === Slide engine ===
    window.slideEngine.registerSimulation('summary-visual', {
        onSlideEnter: function() { initAll(); },
        onSlideLeave: function() { disposeAll(); },
        start: function() {},
        reset: function() { disposeAll(); }
    }, 0);
})();
