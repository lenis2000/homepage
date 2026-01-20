/**
 * Q-volume Deformation Simulation
 * Shows 5 tilings with different q-bias values for volume weighting
 */

(async function() {
    'use strict';

    // 5 canvases with q inputs
    const canvases = [0,1,2,3,4].map(i => document.getElementById(`qvol-canvas-${i}`));
    const qInputs = [0,1,2,3,4].map(i => document.getElementById(`qvol-input-${i}`));
    const sampleBtn = document.getElementById('qvol-sample-btn');
    if (canvases.some(c => !c) || qInputs.some(i => !i)) return;

    function getQValues() {
        return qInputs.map(input => parseFloat(input.value) || 1.0);
    }

    // Wait for LozengeModule
    while (typeof LozengeModule === 'undefined') {
        await new Promise(r => setTimeout(r, 50));
    }

    // Create 5 separate WASM instances
    const wasms = await Promise.all([0,1,2,3,4].map(() => LozengeModule()));

    function setupWasm(wasm) {
        return {
            wasm,
            initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
            performGlauberSteps: wasm.cwrap('performGlauberSteps', 'number', ['number']),
            exportDimers: wasm.cwrap('exportDimers', 'number', []),
            freeString: wasm.cwrap('freeString', null, ['number']),
            setQBias: wasm.cwrap('setQBias', null, ['number']),
            setUseRandomSweeps: wasm.cwrap('setUseRandomSweeps', null, ['number']),
            initCFTP: wasm.cwrap('initCFTP', 'number', []),
            runCFTP: wasm.cwrap('runCFTP', 'number', []),
            getGridBounds: wasm.cwrap('getGridBounds', 'number', []),
            getCFTPMinGridData: wasm.cwrap('getCFTPMinGridData', 'number', []),
            getCFTPMaxGridData: wasm.cwrap('getCFTPMaxGridData', 'number', [])
        };
    }

    const sims = wasms.map(w => setupWasm(w));

    const colors = ['#E57200', '#232D4B', '#F9DCBF'];
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);

    function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

    // Load shape from JSON file
    let shapeTriangles = null;
    try {
        const resp = await fetch('/letters/shape_for_arctic_small.json');
        const data = await resp.json();
        shapeTriangles = data.triangles;
    } catch (e) {
        console.error('Failed to load shape_for_arctic_small.json:', e);
        return;
    }

    function getTrianglesArray() {
        if (!shapeTriangles) return [];
        const arr = [];
        for (const tri of shapeTriangles) {
            arr.push(tri.n, tri.j, tri.type);
        }
        return arr;
    }

    function initSim(sim, triangles) {
        const dataPtr = sim.wasm._malloc(triangles.length * 4);
        for (let i = 0; i < triangles.length; i++) {
            sim.wasm.setValue(dataPtr + i * 4, triangles[i], 'i32');
        }
        const ptr = sim.initFromTriangles(dataPtr, triangles.length);
        sim.freeString(ptr);
        sim.wasm._free(dataPtr);
        sim.setUseRandomSweeps(1);
    }

    // CPU CFTP - updates internal WASM state
    function runCFTP(sim) {
        const ptr = sim.runCFTP();
        sim.freeString(ptr);
    }

    function runGlauber(sim, steps) {
        const ptr = sim.performGlauberSteps(steps);
        sim.freeString(ptr);
    }

    function getDimers(sim) {
        const ptr = sim.exportDimers();
        const json = sim.wasm.UTF8ToString(ptr);
        sim.freeString(ptr);
        const parsed = JSON.parse(json);
        return parsed.dimers || [];
    }

    function drawTiling(canvas, dimers) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        if (!dimers || dimers.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const d of dimers) {
            const verts = getLozengeVerts(d);
            for (const v of verts) {
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            }
        }

        // Rotate 90 degrees: swap width/height for scale calculation
        const scale = Math.min(w / (maxY - minY), h / (maxX - minX)) * 0.9;
        const cx = w / 2;
        const cy = h / 2;
        const offsetX = (minY + maxY) / 2;
        const offsetY = (minX + maxX) / 2;

        for (const d of dimers) {
            const verts = getLozengeVerts(d);
            ctx.beginPath();
            // Rotate 90°: (x,y) -> (y, -x)
            ctx.moveTo(cx + (verts[0].y - offsetX) * scale, cy + (verts[0].x - offsetY) * scale);
            for (let i = 1; i < 4; i++) {
                ctx.lineTo(cx + (verts[i].y - offsetX) * scale, cy + (verts[i].x - offsetY) * scale);
            }
            ctx.closePath();
            ctx.fillStyle = colors[d.t];
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    function getLozengeVerts(d) {
        const { bn, bj, t } = d;
        if (t === 0) return [getVertex(bn, bj), getVertex(bn+1, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
        if (t === 1) return [getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn+1, bj-2), getVertex(bn, bj-1)];
        return [getVertex(bn-1, bj), getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
    }

    const triangles = getTrianglesArray();
    let sampling = false;
    let sampled = false;

    async function sampleAll() {
        if (sampling) return;
        sampling = true;
        sampled = true;

        const qValues = getQValues();

        // Sample each q value sequentially, showing result immediately
        for (let i = 0; i < qValues.length; i++) {
            const q = qValues[i];
            const sim = sims[i];

            // Clear canvas to show we're working on it
            const ctx = canvases[i].getContext('2d');
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvases[i].width, canvases[i].height);
            ctx.fillStyle = '#999';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sampling...', canvases[i].width/2, canvases[i].height/2);

            // Yield to let UI update
            await new Promise(r => setTimeout(r, 50));

            // Reinitialize region
            initSim(sim, triangles);

            // Set q-bias BEFORE CFTP
            sim.setQBias(q);

            // Run CPU CFTP (uses q-bias for q-weighted sampling)
            runCFTP(sim);

            // Draw this result immediately
            drawTiling(canvases[i], getDimers(sim));

            // Small delay between samples so user can see progress
            await new Promise(r => setTimeout(r, 100));
        }

        sampling = false;
    }

    sampleBtn.addEventListener('click', sampleAll);

    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('q-volume', {
                start() {},
                pause() {},
                onSlideEnter() { if (!sampled) sampleAll(); },
                onSlideLeave() {}
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
})();
