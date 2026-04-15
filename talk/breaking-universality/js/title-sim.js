// APPROVED: Do not modify without explicit user request
/**
 * Title Slide Simulation - Breaking Universality
 * Washington Monument column: uniform random lozenge tiling of a
 * (10, 10, 80) hexagon, cropped to the top portion of the frame.
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

    function getRightTriangleCentroid(n, j) {
        const v1 = getVertex(n, j);
        const v2 = getVertex(n, j - 1);
        const v3 = getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    }

    function getLeftTriangleCentroid(n, j) {
        const v1 = getVertex(n, j);
        const v2 = getVertex(n + 1, j);
        const v3 = getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    }

    function pointInPolygon(x, y, polygon) {
        if (polygon.length < 3) return false;
        let inside = false;
        for (let i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[pj].x, yj = polygon[pj].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    // Flat triangle list [n, j, type, ...] for an (a, b, c) hexagon
    function generateHexagonTriangles(a, b, c) {
        const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
        const sideLengths = [a, b, c, a, b, c];
        const boundary = [];
        let bn = 0, bj = 0;
        for (let dir = 0; dir < 6; dir++) {
            for (let step = 0; step < sideLengths[dir]; step++) {
                boundary.push(getVertex(bn, bj));
                bn += directions[dir][0];
                bj += directions[dir][1];
            }
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of boundary) {
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
        }
        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        const arr = [];
        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                const rc = getRightTriangleCentroid(n, j);
                if (pointInPolygon(rc.x, rc.y, boundary)) arr.push(n, j, 1);
                const lc = getLeftTriangleCentroid(n, j);
                if (pointInPolygon(lc.x, lc.y, boundary)) arr.push(n, j, 2);
            }
        }
        return arr;
    }

    // WASM interface
    const initFromTrianglesWasm = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
    const initCFTPWasm = wasm.cwrap('initCFTP', 'number', []);
    const exportCFTPMinDimersWasm = wasm.cwrap('exportCFTPMinDimers', 'number', []);
    const setDimersWasm = wasm.cwrap('setDimers', 'number', ['number', 'number']);
    const performGlauberStepsWasm = wasm.cwrap('performGlauberSteps', 'number', ['number']);
    const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
    const freeStringWasm = wasm.cwrap('freeString', null, ['number']);
    const setUseRandomSweepsWasm = wasm.cwrap('setUseRandomSweeps', null, ['number']);

    // Marble-stone palette (top face, two side faces in shadow gradient)
    const colors = ['#E8E3D3', '#B8B1A0', '#8C867A'];

    // Hexagon parameters: tall, narrow obelisk
    const HEX_A = 10, HEX_B = 10, HEX_C = 60;

    let dimers = [];
    let isValid = false;
    let emptyDimersFlat = null;  // cached extremal "empty" state for reset()

    function loadEmptyState() {
        if (!emptyDimersFlat) return;
        const count = emptyDimersFlat.length;
        const dimerPtr = wasm._malloc(count * 4);
        for (let i = 0; i < count; i++) {
            wasm.setValue(dimerPtr + i * 4, emptyDimersFlat[i], 'i32');
        }
        const sdPtr = setDimersWasm(dimerPtr, count);
        freeStringWasm(sdPtr);
        wasm._free(dimerPtr);

        const dPtr = exportDimersWasm();
        const jsonStr = wasm.UTF8ToString(dPtr);
        freeStringWasm(dPtr);
        const result = JSON.parse(jsonStr);
        dimers = Array.isArray(result) ? result : (result.dimers || []);
    }

    try {
        const triArr = generateHexagonTriangles(HEX_A, HEX_B, HEX_C);
        if (triArr.length > 0) {
            const dataPtr = wasm._malloc(triArr.length * 4);
            for (let i = 0; i < triArr.length; i++) {
                wasm.setValue(dataPtr + i * 4, triArr[i], 'i32');
            }
            const ptr = initFromTrianglesWasm(dataPtr, triArr.length);
            const jsonStr = wasm.UTF8ToString(ptr);
            freeStringWasm(ptr);
            wasm._free(dataPtr);
            const result = JSON.parse(jsonStr);
            isValid = result.status === 'valid';
        }

        // Extract the "empty" extremal state (min height function) as the
        // starting configuration for Glauber dynamics.
        if (isValid) {
            const cftpPtr = initCFTPWasm();
            freeStringWasm(cftpPtr);

            const minPtr = exportCFTPMinDimersWasm();
            const minStr = wasm.UTF8ToString(minPtr);
            freeStringWasm(minPtr);
            const minResult = JSON.parse(minStr);
            const minDimers = minResult.dimers || [];

            emptyDimersFlat = new Array(minDimers.length * 5);
            for (let i = 0; i < minDimers.length; i++) {
                const d = minDimers[i];
                emptyDimersFlat[i * 5] = d.bn;
                emptyDimersFlat[i * 5 + 1] = d.bj;
                emptyDimersFlat[i * 5 + 2] = d.wn;
                emptyDimersFlat[i * 5 + 3] = d.wj;
                emptyDimersFlat[i * 5 + 4] = d.t;
            }

            loadEmptyState();
            setUseRandomSweepsWasm(1);
        }
    } catch (e) {
        console.error('[Title] Failed to initialize hexagon:', e);
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

    // Frame: white bands covering jagged edges, orange inner line
    const FRAME_SIDE = 10;
    const FRAME_TOP = 0;
    const FRAME_BOTTOM = 45;

    // Fixed transform: hexagon apex sits just below the top of the frame,
    // the bottom of the frame clips the lower c-units of the column.
    const SCALE = 12.6;  // 30% smaller than the original 18 px/lattice
    const TOP_MARGIN = 6;
    const hexTopCartY = (HEX_B + 2 * HEX_C) * slope;   // apex y in lattice Cartesian
    const hexCenterCartX = (HEX_A + HEX_B) / 2;        // horizontal center
    const centerX = displayWidth / 2 - hexCenterCartX * SCALE;
    const centerY = FRAME_TOP + TOP_MARGIN + hexTopCartY * SCALE;

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        if (dimers.length === 0) return;

        // Clip to the inner frame rectangle
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
            path.moveTo(centerX + v0.x * SCALE, centerY - v0.y * SCALE);
            path.lineTo(centerX + v1.x * SCALE, centerY - v1.y * SCALE);
            path.lineTo(centerX + v2.x * SCALE, centerY - v2.y * SCALE);
            path.lineTo(centerX + v3.x * SCALE, centerY - v3.y * SCALE);
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
        // Thin orange inner border line
        ctx.strokeStyle = '#C0362C';
        ctx.lineWidth = 4;
        ctx.strokeRect(FRAME_SIDE, FRAME_TOP, displayWidth - FRAME_SIDE * 2, displayHeight - FRAME_TOP - FRAME_BOTTOM);
    }

    function glauberLoop() {
        if (!isValid || !isRunning) return;

        // Slower Glauber: fewer steps per frame for a visible, deliberate melt
        const ptr = performGlauberStepsWasm(1500);
        freeStringWasm(ptr);

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

    // Register with slide engine: Glauber starts on step 2 (second arrow press)
    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('title', {
                start: startSim,
                pause: pauseSim,
                reset() { pauseSim(); loadEmptyState(); draw(); },
                onSlideEnter() { draw(); },
                onSlideLeave() { pauseSim(); },
                onStepBack(step) {
                    // Going back below step 2 restores the empty configuration
                    if (step < 2) {
                        pauseSim();
                        loadEmptyState();
                        draw();
                    }
                }
            }, 2);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
});
