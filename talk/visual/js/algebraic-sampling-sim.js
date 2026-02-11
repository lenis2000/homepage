/**
 * Algebraic Sampling Slide — S→S+1 Markov chain (2D canvas)
 * Shows the waterfall construction building a lozenge tiling one step at a time.
 * Uses the waterfall WASM (Mode 7, imaginary q-Racah) from 2025-06-08-q-vol-3d.js.
 *
 * Slide ID: 'algebraic-sampling'
 */

(function initAlgebraicSamplingSim() {
    if (!window.slideEngine) {
        setTimeout(initAlgebraicSamplingSim, 50);
        return;
    }

    const canvas = document.getElementById('as-canvas');
    const layerCountEl = document.getElementById('as-layer-count');
    const layerTotalEl = document.getElementById('as-layer-total');
    const transferEl = document.getElementById('as-transfer');
    const resultEl = document.getElementById('as-result');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // ===================================================================
    // Parameters
    // ===================================================================

    const AS_N = 120, AS_T = 240, AS_S_TARGET = 80;
    const AS_KAPPA = 3.0, AS_Q = 0.8;
    const STEP_DELAY = 150; // ms between rendered steps
    if (layerTotalEl) layerTotalEl.textContent = AS_S_TARGET;

    const colors = {
        gray1: '#E57200',  // Orange (flat step rhombi)
        gray2: '#232D4B',  // Blue (up step rhombi)
        gray3: '#F9DCBF',  // Cream (horizontal / background)
        border: '#666666',
        white: '#FFFFFF'
    };

    // ===================================================================
    // WASM interface (shared global Module from 2025-06-08-q-vol-3d.js)
    // ===================================================================

    const wasmIface = {
        ready: false,
        init() {
            if (typeof Module === 'undefined' || !Module.calledRun) return false;
            this.initializeTiling = Module.cwrap('initializeTiling', 'number',
                ['number','number','number','number','number'], {async:true});
            this.performSOperator = Module.cwrap('performSOperator', 'number', [], {async:true});
            this.exportPaths = Module.cwrap('exportPaths', 'number', [], {async:true});
            this.setImaginaryQ = Module.cwrap('setImaginaryQ', null, ['number']);
            this.freeString = Module.cwrap('freeString', null, ['number']);
            this.ready = true;
            return true;
        },
        async refreshPaths() {
            try {
                const ptr = await this.exportPaths();
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    return JSON.parse(jsonStr);
                }
            } catch (e) { console.error('algebraic-sampling: exportPaths failed:', e); }
            return null;
        }
    };

    function tryInitWasm() {
        if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function' && Module.calledRun) {
            wasmIface.init();
        }
    }
    tryInitWasm();
    if (!wasmIface.ready) {
        window.addEventListener('wasm-loaded', tryInitWasm, { once: true });
    }

    // ===================================================================
    // 2D Hexagonal Drawing (adapted from Gorin q-vol simulation)
    // ===================================================================

    function drawTiling(paths, N, T, S) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = colors.white;
        ctx.fillRect(0, 0, w, h);

        if (!paths || paths.length === 0 || N === 0) return;

        const sqrt3 = Math.sqrt(3);

        // Bounding box of the hexagon in tiling coordinates
        const minX = 0;
        const maxX = T * 0.5 * sqrt3;
        const minY = -(T - S) * 0.5;
        const maxY = N + Math.max(S * 0.5, (2 * S - T) * 0.5);

        const hexWidth = maxX - minX;
        const hexHeight = maxY - minY;
        const hexCenterX = (minX + maxX) / 2;
        const hexCenterY = (minY + maxY) / 2;

        const scale = Math.min(w / hexWidth, h / hexHeight) * 0.92;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(-scale, scale);
        ctx.translate(-hexCenterX, -hexCenterY);

        // Hexagon vertices
        const hexVerts = [
            {x: 0, y: 0},
            {x: 0, y: N},
            {x: S * 0.5 * sqrt3, y: N + S * 0.5},
            {x: T * 0.5 * sqrt3, y: N + (2 * S - T) * 0.5},
            {x: T * 0.5 * sqrt3, y: (2 * S - T) * 0.5},
            {x: (T - S) * 0.5 * sqrt3, y: -(T - S) * 0.5}
        ];

        // Clip to hexagon
        ctx.beginPath();
        ctx.moveTo(hexVerts[0].x, hexVerts[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(hexVerts[i].x, hexVerts[i].y);
        ctx.closePath();
        ctx.save();
        ctx.clip();

        // Background: fill with cream horizontal rhombi
        const borderWidth = 0;
        for (let i = -1; i <= T; i++) {
            for (let height = -(T - S + 2); height <= N + S + 2; height++) {
                const x1 = i * 0.5 * sqrt3;
                const y1 = height - i * 0.5;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x1 + 0.5 * sqrt3, y1 + 0.5);
                ctx.lineTo(x1 + sqrt3, y1);
                ctx.lineTo(x1 + 0.5 * sqrt3, y1 - 0.5);
                ctx.closePath();
                ctx.fillStyle = colors.gray3;
                ctx.fill();
            }
        }

        ctx.restore(); // unclip

        // Draw actual rhombi from paths
        for (let i = 0; i < T; i++) {
            for (let j = 0; j < N; j++) {
                if (j >= paths.length || i + 1 >= paths[j].length) continue;
                const h0 = paths[j][i];
                const h1 = paths[j][i + 1];
                drawRhombus(i, h0, h1);
            }
        }

        // Hexagon border
        ctx.beginPath();
        ctx.moveTo(hexVerts[0].x, hexVerts[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(hexVerts[i].x, hexVerts[i].y);
        ctx.closePath();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = borderWidth * 3;
        ctx.stroke();

        ctx.restore();
    }

    function drawRhombus(timeIdx, height, nextHeight) {
        const sqrt3 = Math.sqrt(3);
        const x1 = timeIdx * 0.5 * sqrt3;
        const y1 = height - timeIdx * 0.5;
        const x2 = x1;
        const y2 = y1 + 1;

        let x3, y3, x4, y4, fillColor;

        if (nextHeight === height) {
            // Flat step → orange rhombus
            x3 = x2 + 0.5 * sqrt3;
            y3 = y2 - 0.5;
            x4 = x1 + 0.5 * sqrt3;
            y4 = y1 - 0.5;
            fillColor = colors.gray1;
        } else {
            // Up step → blue rhombus
            x3 = x2 + 0.5 * sqrt3;
            y3 = y2 + 0.5;
            x4 = x1 + 0.5 * sqrt3;
            y4 = y1 + 0.5;
            fillColor = colors.gray2;
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
    }

    // ===================================================================
    // Animation state
    // ===================================================================

    let generation = 0;
    let currentS = 0;
    let animating = false;
    let animTimeoutId = null;
    let wasmInitialized = false;

    async function initAndShowFlat(gen) {
        if (!wasmIface.ready) {
            tryInitWasm();
            if (!wasmIface.ready) return;
        }

        try {
            wasmIface.setImaginaryQ(AS_Q);
            const kappasq = AS_KAPPA * AS_KAPPA;
            const ptr = await wasmIface.initializeTiling(AS_N, AS_T, 0, 7, -kappasq);
            if (gen !== generation) return;
            if (ptr) {
                const jsonStr = Module.UTF8ToString(ptr);
                wasmIface.freeString(ptr);
                currentS = JSON.parse(jsonStr).s || 0;
            } else {
                currentS = 0;
            }
            wasmInitialized = true;

            // Draw the initial flat parallelogram
            const result = await wasmIface.refreshPaths();
            if (gen !== generation) return;
            if (result && result.paths) {
                drawTiling(result.paths, result.n, result.t, result.s);
            }
            if (layerCountEl) layerCountEl.textContent = currentS;
        } catch (e) {
            console.error('algebraic-sampling: init failed:', e);
        }
    }

    async function runLayerAnimation(gen) {
        if (!wasmInitialized) return;
        animating = true;

        try {
            while (currentS < AS_S_TARGET && animating && gen === generation) {
                wasmIface.setImaginaryQ(AS_Q);
                const sPtr = await wasmIface.performSOperator();
                if (gen !== generation) return;

                if (sPtr) {
                    const jsonStr = Module.UTF8ToString(sPtr);
                    wasmIface.freeString(sPtr);
                    currentS = JSON.parse(jsonStr).s;
                } else {
                    break;
                }

                // Render current state
                const result = await wasmIface.refreshPaths();
                if (gen !== generation) return;

                if (result && result.paths) {
                    drawTiling(result.paths, result.n, result.t, result.s);
                }
                if (layerCountEl) layerCountEl.textContent = currentS;

                // Wait between steps
                await new Promise(r => { animTimeoutId = setTimeout(r, STEP_DELAY); });
                if (gen !== generation) return;
            }
        } catch (e) {
            console.error('algebraic-sampling: animation failed:', e);
        }

        animating = false;
    }

    // ===================================================================
    // Step handling (fragments)
    // ===================================================================

    let currentStep = 0;

    function onStep(step) {
        currentStep = step;
        if (step === 1) {
            const gen = generation;
            runLayerAnimation(gen);
        }
    }

    function onStepBack(step) {
        currentStep = step;
        if (step < 1) {
            generation++;
            animating = false;
            if (animTimeoutId) { clearTimeout(animTimeoutId); animTimeoutId = null; }
            const gen = generation;
            initAndShowFlat(gen);
        }
    }

    function resetAll() {
        generation++;
        animating = false;
        wasmInitialized = false;
        if (animTimeoutId) { clearTimeout(animTimeoutId); animTimeoutId = null; }
        currentS = 0;
        currentStep = 0;
        if (layerCountEl) layerCountEl.textContent = '0';
    }

    // ===================================================================
    // Slide engine registration
    // ===================================================================

    window.slideEngine.registerSimulation('algebraic-sampling', {
        steps: 1,
        onStep,
        onStepBack,

        start() {},
        pause() {},

        onSlideEnter() {
            resetAll();
            const gen = generation;
            setTimeout(() => {
                if (gen === generation) initAndShowFlat(gen);
            }, 200);
        },

        onSlideLeave() {
            resetAll();
            // Clear canvas
            ctx.fillStyle = colors.white;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }, 0);
})();
