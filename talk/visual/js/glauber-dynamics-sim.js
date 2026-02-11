/**
 * Glauber Dynamics Slide — Stub Simulation
 * Shows a small hexagonal lozenge tiling with animated Glauber dynamics flips.
 *
 * Steps:
 *   0: Initial state, canvas with placeholder/tiling
 *   1: Show gd-markov pane (Markov chain explanation)
 *   2: Show gd-convergence pane (convergence properties)
 *
 * Uses LozengeModule WASM for tiling initialization and Glauber steps.
 */

(function initGlauberDynamicsSim() {
    if (!window.slideEngine) {
        setTimeout(initGlauberDynamicsSim, 50);
        return;
    }

    const canvas = document.getElementById('glauber-canvas');
    const statusEl = document.getElementById('glauber-status');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    function showElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hideElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    // === Tiling State ===
    let wasm = null;
    let wasmFuncs = null;
    let wasmInitPromise = null;
    let dimers = [];
    let animationId = null;
    let isRunning = false;

    const HEX_SIDE = 25;

    // Triangular lattice constants
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);

    function getVertex(n, j) {
        return { x: n, y: slope * n + j * deltaC };
    }

    // === Hexagon triangle generation (same as cftp-sim) ===

    function generateHexagonTriangles(a) {
        function getRightCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }
        function getLeftCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }

        const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
        const boundary = [];
        let bn = 0, bj = 0;
        for (let dir = 0; dir < 6; dir++) {
            const [dn, dj] = directions[dir];
            for (let step = 0; step < a; step++) {
                boundary.push(getVertex(bn, bj));
                bn += dn;
                bj += dj;
            }
        }

        function pointInPolygon(px, py, poly) {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i].x, yi = poly[i].y;
                const xj = poly[j].x, yj = poly[j].y;
                if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                    inside = !inside;
                }
            }
            return inside;
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of boundary) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }
        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        const triangles = [];
        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                const rc = getRightCentroid(n, j);
                if (pointInPolygon(rc.x, rc.y, boundary)) {
                    triangles.push(n, j, 1);
                }
                const lc = getLeftCentroid(n, j);
                if (pointInPolygon(lc.x, lc.y, boundary)) {
                    triangles.push(n, j, 2);
                }
            }
        }
        return triangles;
    }

    // === WASM Initialization ===

    async function initWasm() {
        if (wasm) return true;
        if (wasmInitPromise) return wasmInitPromise;
        wasmInitPromise = (async () => {
            if (typeof LozengeModule === 'undefined') {
                console.warn('glauber-dynamics: LozengeModule not available');
                return false;
            }
            try {
                wasm = await LozengeModule();
                wasmFuncs = {
                    initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
                    runCFTP: wasm.cwrap('runCFTP', 'number', []),
                    exportDimers: wasm.cwrap('exportDimers', 'number', []),
                    performGlauberSteps: wasm.cwrap('performGlauberSteps', 'number', ['number']),
                    freeString: wasm.cwrap('freeString', null, ['number']),
                    setUseRandomSweeps: wasm.cwrap('setUseRandomSweeps', null, ['number']),
                    initCFTP: wasm.cwrap('initCFTP', 'number', []),
                    getGridBounds: wasm.cwrap('getGridBounds', 'number', []),
                    getCFTPMaxGridData: wasm.cwrap('getCFTPMaxGridData', 'number', []),
                    setDimers: wasm.cwrap('setDimers', 'number', ['number', 'number'])
                };
                return true;
            } catch (e) {
                console.error('Failed to init LozengeModule for glauber-dynamics:', e);
                wasm = null;
                return false;
            }
        })();
        return wasmInitPromise;
    }

    function wasmCallJSON(fn) {
        const ptr = fn();
        const str = wasm.UTF8ToString(ptr);
        wasmFuncs.freeString(ptr);
        return JSON.parse(str);
    }

    // === 2D Lozenge Drawing ===

    const LOZENGE_COLORS = {
        0: '#E57200', // type 0: orange
        1: '#232D4B', // type 1: navy
        2: '#F9DCBF'  // type 2: cream
    };

    function getVertexKeys(dimer) {
        const { bn, bj, t } = dimer;
        if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
        if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
        return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
    }

    function drawTiling() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        if (dimers.length === 0) {
            // Draw placeholder
            ctx.fillStyle = '#999';
            ctx.font = Math.round(h * 0.04) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Glauber dynamics simulation', w / 2, h / 2);
            return;
        }

        // Find bounding box of all vertices
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            for (const [n, j] of verts) {
                const v = getVertex(n, j);
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            }
        }

        const padding = 30;
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        const scaleX = (w - 2 * padding) / rangeX;
        const scaleY = (h - 2 * padding) / rangeY;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = padding + (w - 2 * padding - rangeX * scale) / 2;
        const offsetY = padding + (h - 2 * padding - rangeY * scale) / 2;

        function toCanvas(n, j) {
            const v = getVertex(n, j);
            return {
                x: offsetX + (v.x - minX) * scale,
                y: offsetY + (v.y - minY) * scale
            };
        }

        // Draw each lozenge
        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            const canvasVerts = verts.map(([n, j]) => toCanvas(n, j));

            ctx.fillStyle = LOZENGE_COLORS[dimer.t] || '#ccc';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;

            ctx.beginPath();
            ctx.moveTo(canvasVerts[0].x, canvasVerts[0].y);
            for (let i = 1; i < canvasVerts.length; i++) {
                ctx.lineTo(canvasVerts[i].x, canvasVerts[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    // === Animation Loop ===

    let boosted = false;
    let totalGlauberSteps = 0;
    const INITIAL_STEPS = 5;
    const MAX_BASE_STEPS = 100;
    const RAMP_FRAMES = 120; // frames to ramp from INITIAL_STEPS to MAX_BASE_STEPS
    let frameCount = 0;
    const BOOST_STEPS = 50000;
    const BOOST_INTERVAL = 500; // ms between redraws when boosted

    function animationLoop() {
        if (!isRunning || !wasm || !wasmFuncs) return;

        if (boosted) {
            // Boosted: do many steps, redraw every BOOST_INTERVAL ms
            const resultPtr = wasmFuncs.performGlauberSteps(BOOST_STEPS);
            if (resultPtr) { wasm.UTF8ToString(resultPtr); wasmFuncs.freeString(resultPtr); }
            totalGlauberSteps += BOOST_STEPS;
            const dimerResult = wasmCallJSON(wasmFuncs.exportDimers);
            dimers = dimerResult.dimers || [];
            drawTiling();
            if (statusEl) {
                const n = totalGlauberSteps;
                const fmt = n < 1000 ? '' + n : n < 1e6 ? (n / 1e3).toFixed(1) + 'K' : (n / 1e6).toFixed(1) + 'M';
                statusEl.textContent = 'Attempted rotations: ' + fmt;
            }
            animationId = setTimeout(animationLoop, BOOST_INTERVAL);
        } else {
            // Normal: ramp up steps per frame for a slow start
            const t = Math.min(frameCount / RAMP_FRAMES, 1);
            const stepsThisFrame = Math.round(INITIAL_STEPS + (MAX_BASE_STEPS - INITIAL_STEPS) * t * t);
            frameCount++;
            const resultPtr = wasmFuncs.performGlauberSteps(stepsThisFrame);
            if (resultPtr) { wasm.UTF8ToString(resultPtr); wasmFuncs.freeString(resultPtr); }
            totalGlauberSteps += stepsThisFrame;
            const dimerResult = wasmCallJSON(wasmFuncs.exportDimers);
            dimers = dimerResult.dimers || [];
            drawTiling();
            if (statusEl) {
                const n = totalGlauberSteps;
                const fmt = n < 1000 ? '' + n : n < 1e6 ? (n / 1e3).toFixed(1) + 'K' : (n / 1e6).toFixed(1) + 'M';
                statusEl.textContent = 'Attempted rotations: ' + fmt;
            }
            animationId = requestAnimationFrame(animationLoop);
        }
    }

    function startAnimation() {
        if (isRunning) return;
        isRunning = true;
        animationLoop();
    }

    function stopAnimation() {
        isRunning = false;
        if (animationId) {
            if (boosted) clearTimeout(animationId);
            else cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    // === Initialization ===

    async function initTiling() {
        const ok = await initWasm();
        if (!ok) {
            drawTiling(); // Draw placeholder
            return;
        }

        // Load hexagon shape
        const triArr = generateHexagonTriangles(HEX_SIDE);
        const ptr = wasm._malloc(triArr.length * 4);
        for (let i = 0; i < triArr.length; i++) {
            wasm.setValue(ptr + i * 4, triArr[i], 'i32');
        }
        wasmFuncs.initFromTriangles(ptr, triArr.length);
        wasm._free(ptr);
        wasmFuncs.setUseRandomSweeps(1);

        // Set to maximal configuration via CFTP extremal state
        wasmCallJSON(wasmFuncs.initCFTP);
        const boundsPtr = wasmFuncs.getGridBounds();
        const bounds = JSON.parse(wasm.UTF8ToString(boundsPtr));
        wasmFuncs.freeString(boundsPtr);

        const maxPtr = wasmFuncs.getCFTPMaxGridData();
        const strideJ = bounds.maxJ - bounds.minJ + 1;
        const dimerData = [];
        for (let i = 0; i < triArr.length; i += 3) {
            if (triArr[i + 2] === 1) { // black triangle
                const bn = triArr[i], bj = triArr[i + 1];
                const gridIdx = (bn - bounds.minN) * strideJ + (bj - bounds.minJ);
                if (gridIdx >= 0 && gridIdx < bounds.size) {
                    const type = wasm.getValue(maxPtr + gridIdx * 4, 'i32');
                    if (type >= 0 && type <= 2) {
                        let wn, wj;
                        if (type === 0) { wn = bn; wj = bj; }
                        else if (type === 1) { wn = bn; wj = bj - 1; }
                        else { wn = bn - 1; wj = bj; }
                        dimerData.push(bn, bj, wn, wj, type);
                    }
                }
            }
        }
        wasm._free(maxPtr);

        const dPtr = wasm._malloc(dimerData.length * 4);
        for (let i = 0; i < dimerData.length; i++) {
            wasm.setValue(dPtr + i * 4, dimerData[i], 'i32');
        }
        wasmCallJSON(() => wasmFuncs.setDimers(dPtr, dimerData.length));
        wasm._free(dPtr);

        const dimerResult = wasmCallJSON(wasmFuncs.exportDimers);
        dimers = dimerResult.dimers || [];
        if (statusEl) statusEl.textContent = '';

        drawTiling();
        totalGlauberSteps = 0;
        startAnimation();
    }

    // === Slide Engine Registration ===

    window.slideEngine.registerSimulation('glauber-dynamics', {
        steps: 3,

        onSlideEnter: function() {
            console.log('[glauber-dynamics] onSlideEnter');
            drawTiling();
            initTiling();
        },

        onSlideLeave: function() {
            console.log('[glauber-dynamics] onSlideLeave');
            stopAnimation();
            dimers = [];
            totalGlauberSteps = 0;
            wasm = null;
            wasmFuncs = null;
            wasmInitPromise = null;
            if (statusEl) statusEl.textContent = '';
        },

        onStep: function(step) {
            if (step === 1) {
                showElement('gd-markov');
            }
            if (step === 2) {
                showElement('gd-convergence');
                stopAnimation();
                boosted = true;
                startAnimation();
            }
            if (step === 3) {
                stopAnimation();
            }
        },

        onStepBack: function(step) {
            if (step === 2) {
                boosted = true;
                startAnimation();
            }
            if (step === 1) {
                hideElement('gd-convergence');
                stopAnimation();
                boosted = false;
                startAnimation();
            }
            if (step === 0) {
                hideElement('gd-markov');
            }
        },

        reset: function() {
            stopAnimation();
            dimers = [];
            totalGlauberSteps = 0;
            boosted = false;
            frameCount = 0;
            hideElement('gd-markov');
            hideElement('gd-convergence');
            if (statusEl) statusEl.textContent = '';
            drawTiling();
        }
    }, 0);
})();
