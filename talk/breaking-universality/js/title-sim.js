// APPROVED: Do not modify without explicit user request
/**
 * Title Slide Simulation - Breaking Universality
 * Glauber dynamics on the Golden Gate Bridge shape (lozenge tiling)
 * Based on visual talk title-sim.js pattern
 */

window.addEventListener('wasm-loaded', async function() {
    if (typeof LozengeModule === 'undefined') {
        console.error('[Title] LozengeModule not loaded');
        return;
    }

    const wasm = await LozengeModule();

    // Triangular lattice constants
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);

    function getVertex(n, j) {
        return { x: n, y: slope * n + j * deltaC };
    }

    // WASM interface
    const initFromTrianglesWasm = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
    const setDimersWasm = wasm.cwrap('setDimers', 'number', ['number', 'number']);
    const performGlauberStepsWasm = wasm.cwrap('performGlauberSteps', 'number', ['number']);
    const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
    const freeStringWasm = wasm.cwrap('freeString', null, ['number']);
    const setUseRandomSweepsWasm = wasm.cwrap('setUseRandomSweeps', null, ['number']);

    // Golden Gate Bridge colors (International Orange palette)
    const colors = ['#C0362C', '#862317', '#E8853A'];

    // State
    let activeTriangles = new Map();
    let dimers = [];
    let isValid = false;

    // Load Golden Gate shape
    try {
        const response = await fetch('/letters/golden_gate.json');
        if (!response.ok) throw new Error('fetch failed');
        const shapeData = await response.json();

        if (shapeData.triangles) {
            for (const t of shapeData.triangles) {
                const type = t.type || t.t;
                activeTriangles.set(`${t.n},${t.j},${type}`, { n: t.n, j: t.j, type });
            }

            // Initialize WASM region from triangles
            const arr = [];
            for (const [, tri] of activeTriangles) {
                arr.push(tri.n, tri.j, tri.type);
            }

            if (arr.length > 0) {
                const dataPtr = wasm._malloc(arr.length * 4);
                for (let i = 0; i < arr.length; i++) {
                    wasm.setValue(dataPtr + i * 4, arr[i], 'i32');
                }
                const ptr = initFromTrianglesWasm(dataPtr, arr.length);
                const jsonStr = wasm.UTF8ToString(ptr);
                freeStringWasm(ptr);
                wasm._free(dataPtr);
                const result = JSON.parse(jsonStr);
                isValid = result.status === 'valid';
            }

            // Import pre-sampled dimers from JSON (preserves the nice random tiling)
            if (isValid && shapeData.dimers && shapeData.dimers.length > 0) {
                const count = shapeData.dimers.length * 5;
                const dimerPtr = wasm._malloc(count * 4);
                for (let i = 0; i < shapeData.dimers.length; i++) {
                    const d = shapeData.dimers[i];
                    wasm.setValue(dimerPtr + (i * 5) * 4, d[0], 'i32');
                    wasm.setValue(dimerPtr + (i * 5 + 1) * 4, d[1], 'i32');
                    wasm.setValue(dimerPtr + (i * 5 + 2) * 4, d[2], 'i32');
                    wasm.setValue(dimerPtr + (i * 5 + 3) * 4, d[3], 'i32');
                    wasm.setValue(dimerPtr + (i * 5 + 4) * 4, d[4], 'i32');
                }
                const sdPtr = setDimersWasm(dimerPtr, count);
                freeStringWasm(sdPtr);
                wasm._free(dimerPtr);

                setUseRandomSweepsWasm(1);

                // Export to get proper dimer objects for drawing
                const dPtr = exportDimersWasm();
                const dJson = wasm.UTF8ToString(dPtr);
                freeStringWasm(dPtr);
                const dResult = JSON.parse(dJson);
                dimers = Array.isArray(dResult) ? dResult : (dResult.dimers || []);
            }
        }
    } catch (e) {
        console.error('[Title] Failed to load golden_gate.json:', e);
    }

    // Canvas setup
    const canvas = document.getElementById('title-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = 2;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;

    let isRunning = false;
    let glauberTimer = null;

    // Pre-calculate transform from shape bounds
    let scale, centerX, centerY;
    function calcTransform() {
        if (activeTriangles.size === 0) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [, tri] of activeTriangles) {
            let verts;
            if (tri.type === 1) {
                verts = [getVertex(tri.n, tri.j), getVertex(tri.n, tri.j - 1), getVertex(tri.n + 1, tri.j - 1)];
            } else {
                verts = [getVertex(tri.n, tri.j), getVertex(tri.n + 1, tri.j), getVertex(tri.n + 1, tri.j - 1)];
            }
            for (const v of verts) {
                minX = Math.min(minX, v.x);
                maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y);
                maxY = Math.max(maxY, v.y);
            }
        }
        const regionWidth = maxX - minX;
        const regionHeight = maxY - minY;
        scale = Math.min(displayWidth / regionWidth, displayHeight / regionHeight) * 0.98;
        centerX = displayWidth / 2 - ((minX + maxX) / 2) * scale;
        centerY = displayHeight / 2 + ((minY + maxY) / 2) * scale;
    }
    calcTransform();

    // Frame: white bands covering jagged edges, orange inner line
    const FRAME_SIDE = 10;   // left/right width
    const FRAME_TOP = 0;     // top height (no top frame)
    const FRAME_BOTTOM = 45; // bottom height (more coverage)

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        if (dimers.length === 0) return;

        // Clip all four edges
        ctx.save();
        ctx.beginPath();
        ctx.rect(FRAME_SIDE, FRAME_TOP, displayWidth - FRAME_SIDE * 2, displayHeight - FRAME_TOP - FRAME_BOTTOM);
        ctx.clip();

        // Batch by type for efficiency
        const paths = [new Path2D(), new Path2D(), new Path2D()];
        for (const d of dimers) {
            const bn = d.bn, bj = d.bj, t = d.t;
            let v0, v1, v2, v3;
            if (t === 0) {
                v0 = getVertex(bn, bj); v1 = getVertex(bn + 1, bj);
                v2 = getVertex(bn + 1, bj - 1); v3 = getVertex(bn, bj - 1);
            } else if (t === 1) {
                v0 = getVertex(bn, bj); v1 = getVertex(bn + 1, bj - 1);
                v2 = getVertex(bn + 1, bj - 2); v3 = getVertex(bn, bj - 1);
            } else {
                v0 = getVertex(bn - 1, bj); v1 = getVertex(bn, bj);
                v2 = getVertex(bn + 1, bj - 1); v3 = getVertex(bn, bj - 1);
            }
            const path = paths[t];
            path.moveTo(centerX + v0.x * scale, centerY - v0.y * scale);
            path.lineTo(centerX + v1.x * scale, centerY - v1.y * scale);
            path.lineTo(centerX + v2.x * scale, centerY - v2.y * scale);
            path.lineTo(centerX + v3.x * scale, centerY - v3.y * scale);
            path.closePath();
        }

        for (let t = 0; t < 3; t++) {
            ctx.fillStyle = colors[t];
            ctx.fill(paths[t]);
        }

        ctx.restore();

        // White bands cover jagged edges on all four sides
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displayWidth, FRAME_TOP);
        ctx.fillRect(0, 0, FRAME_SIDE, displayHeight);
        ctx.fillRect(displayWidth - FRAME_SIDE, 0, FRAME_SIDE, displayHeight);
        ctx.fillRect(0, displayHeight - FRAME_BOTTOM, displayWidth, FRAME_BOTTOM);
        // Thin orange inner border line (closed rectangle)
        ctx.strokeStyle = '#C0362C';
        ctx.lineWidth = 4;
        ctx.strokeRect(FRAME_SIDE, FRAME_TOP, displayWidth - FRAME_SIDE * 2, displayHeight - FRAME_TOP - FRAME_BOTTOM);
    }

    function glauberLoop() {
        if (!isValid || !isRunning) return;

        // 5K steps per update (~1 sweep for ~4.6K dimers)
        const ptr = performGlauberStepsWasm(5000);
        freeStringWasm(ptr);

        // Refresh dimers from WASM
        const dPtr = exportDimersWasm();
        const jsonStr = wasm.UTF8ToString(dPtr);
        freeStringWasm(dPtr);
        const result = JSON.parse(jsonStr);
        dimers = Array.isArray(result) ? result : (result.dimers || []);

        draw();
        glauberTimer = requestAnimationFrame(glauberLoop);
    }

    function startSim() {
        if (!isRunning) {
            isRunning = true;
            glauberLoop();
        }
    }

    function pauseSim() {
        isRunning = false;
        if (glauberTimer) {
            cancelAnimationFrame(glauberTimer);
            glauberTimer = null;
        }
    }

    canvas.addEventListener('click', () => {
        if (isRunning) pauseSim();
        else startSim();
    });

    // Initial static draw
    draw();

    // Register with slide engine
    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('title', {
                start: startSim,
                pause: pauseSim,
                onSlideEnter() { draw(); },
                onSlideLeave() { pauseSim(); }
            }, 1);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
});
