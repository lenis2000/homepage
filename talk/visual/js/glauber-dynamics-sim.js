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

    const HEX_SIDE = 15; // Smaller hex for 2D canvas rendering

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
                    freeString: wasm.cwrap('freeString', null, ['number'])
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

    const GLAUBER_STEPS_PER_FRAME = 200;
    let totalGlauberSteps = 0;

    function animationLoop() {
        if (!isRunning || !wasm || !wasmFuncs) return;

        // Perform Glauber steps
        const resultPtr = wasmFuncs.performGlauberSteps(GLAUBER_STEPS_PER_FRAME);
        if (resultPtr) {
            const str = wasm.UTF8ToString(resultPtr);
            wasmFuncs.freeString(resultPtr);
            // Result may contain updated dimer info
        }
        totalGlauberSteps += GLAUBER_STEPS_PER_FRAME;

        // Export and redraw periodically
        if (totalGlauberSteps % 1000 < GLAUBER_STEPS_PER_FRAME) {
            const dimerResult = wasmCallJSON(wasmFuncs.exportDimers);
            dimers = dimerResult.dimers || [];
            drawTiling();
            if (statusEl) statusEl.textContent = 'Glauber steps: ' + totalGlauberSteps;
        }

        animationId = requestAnimationFrame(animationLoop);
    }

    function startAnimation() {
        if (isRunning) return;
        isRunning = true;
        animationLoop();
    }

    function stopAnimation() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
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

        // Run CFTP to get initial tiling
        if (statusEl) statusEl.textContent = 'sampling initial tiling...';
        wasmCallJSON(wasmFuncs.runCFTP);
        const dimerResult = wasmCallJSON(wasmFuncs.exportDimers);
        dimers = dimerResult.dimers || [];
        if (statusEl) statusEl.textContent = '';

        drawTiling();
        totalGlauberSteps = 0;
        startAnimation();
    }

    // === Slide Engine Registration ===

    window.slideEngine.registerSimulation('glauber-dynamics', {
        steps: 2,

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
            console.log('[glauber-dynamics] onStep(' + step + ')');
            if (step === 1) {
                showElement('gd-markov');
            }
            if (step === 2) {
                showElement('gd-convergence');
            }
        },

        onStepBack: function(step) {
            console.log('[glauber-dynamics] onStepBack(' + step + ')');
            if (step === 1) {
                hideElement('gd-convergence');
            }
            if (step === 0) {
                hideElement('gd-markov');
            }
        },

        reset: function() {
            console.log('[glauber-dynamics] reset');
            stopAnimation();
            dimers = [];
            totalGlauberSteps = 0;
            hideElement('gd-markov');
            hideElement('gd-convergence');
            if (statusEl) statusEl.textContent = '';
            drawTiling();
        }
    }, 0);
})();
