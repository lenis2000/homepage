/**
 * Title Slide Simulation - Breaking Universality
 * Animated Glauber dynamics on the UVA Rotunda lozenge-tiling shape.
 * Adapted from the visual talk title slide.
 */

(function() {
    let initialized = false;

    async function initTitleRotunda() {
        if (initialized) return;
        const canvas = document.getElementById('title-canvas');
        if (!canvas) return;
        if (typeof LozengeModule === 'undefined') return;
        initialized = true;

        const wasm = await LozengeModule();

        // Triangular lattice constants (for equilateral triangles)
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);

        function getVertex(n, j) {
            return { x: n, y: slope * n + j * deltaC };
        }

        // WASM interface (isolated instance)
        const initFromTrianglesWasm = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const performGlauberStepsWasm = wasm.cwrap('performGlauberSteps', 'number', ['number']);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeStringWasm = wasm.cwrap('freeString', null, ['number']);
        const setUseRandomSweepsWasm = wasm.cwrap('setUseRandomSweeps', null, ['number']);

        // UVA palette
        const colors = ['#E57200', '#232D4B', '#F9DCBF'];

        let activeTriangles = new Map();
        let dimers = [];
        let isValid = false;

        // Load Rotunda preset
        try {
            const response = await fetch('/letters/Rotunda.json');
            if (response.ok) {
                const data = await response.json();
                if (data.triangles) {
                    for (const t of data.triangles) {
                        const type = t.type || t.t;
                        activeTriangles.set(`${t.n},${t.j},${type}`, { n: t.n, j: t.j, type });
                    }

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

                        if (isValid) {
                            setUseRandomSweepsWasm(1);
                            const dPtr = exportDimersWasm();
                            const dStr = wasm.UTF8ToString(dPtr);
                            freeStringWasm(dPtr);
                            const dResult = JSON.parse(dStr);
                            dimers = Array.isArray(dResult) ? dResult : (dResult.dimers || []);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[Title Rotunda] Failed to load Rotunda preset:', e);
        }

        const ctx = canvas.getContext('2d');
        const dpr = 2;
        const displayWidth = canvas.width / dpr;
        const displayHeight = canvas.height / dpr;

        let isRunning = false;
        let animationId = null;

        let scale = 1, centerX = displayWidth / 2, centerY = displayHeight / 2;
        function calcTransform() {
            if (!activeTriangles || activeTriangles.size === 0) return;
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
            scale = Math.min(displayWidth / regionWidth, displayHeight / regionHeight) * 0.9;
            centerX = displayWidth / 2 - ((minX + maxX) / 2) * scale;
            centerY = displayHeight / 2 + ((minY + maxY) / 2) * scale;
        }
        calcTransform();

        function draw() {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, displayWidth, displayHeight);

            if (!activeTriangles || activeTriangles.size === 0) return;

            if (Array.isArray(dimers) && dimers.length > 0) {
                for (const d of dimers) {
                    const bn = d.bn, bj = d.bj, t = d.t;
                    let verts;
                    if (t === 0) {
                        verts = [getVertex(bn, bj), getVertex(bn + 1, bj), getVertex(bn + 1, bj - 1), getVertex(bn, bj - 1)];
                    } else if (t === 1) {
                        verts = [getVertex(bn, bj), getVertex(bn + 1, bj - 1), getVertex(bn + 1, bj - 2), getVertex(bn, bj - 1)];
                    } else {
                        verts = [getVertex(bn - 1, bj), getVertex(bn, bj), getVertex(bn + 1, bj - 1), getVertex(bn, bj - 1)];
                    }

                    ctx.beginPath();
                    ctx.moveTo(centerX + verts[0].x * scale, centerY - verts[0].y * scale);
                    for (let i = 1; i < 4; i++) {
                        ctx.lineTo(centerX + verts[i].x * scale, centerY - verts[i].y * scale);
                    }
                    ctx.closePath();
                    ctx.fillStyle = colors[t];
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
                    ctx.lineWidth = 0.45;
                    ctx.stroke();
                }
            }
        }

        function animate() {
            if (!isValid || !isRunning) return;

            const ptr = performGlauberStepsWasm(8000);
            freeStringWasm(ptr);

            const dPtr = exportDimersWasm();
            const jsonStr = wasm.UTF8ToString(dPtr);
            freeStringWasm(dPtr);
            const result = JSON.parse(jsonStr);
            dimers = Array.isArray(result) ? result : (result.dimers || []);

            draw();
            animationId = requestAnimationFrame(animate);
        }

        function startSim() {
            if (!isRunning) {
                isRunning = true;
                animate();
            }
        }

        function pauseSim() {
            isRunning = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        }

        canvas.addEventListener('click', () => {
            if (isRunning) pauseSim();
            else startSim();
        });

        draw();

        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('title', {
                    start: startSim,
                    pause: pauseSim,
                    reset() { pauseSim(); draw(); },
                    onSlideEnter() { pauseSim(); draw(); },
                    onSlideLeave: pauseSim,
                    onStepBack(step) {
                        if (step < 1) pauseSim();
                    }
                }, 1);
            } else {
                setTimeout(waitForSlideEngine, 50);
            }
        }
        waitForSlideEngine();
    }

    window.addEventListener('wasm-loaded', initTitleRotunda);
    if (typeof LozengeModule !== 'undefined') {
        setTimeout(initTitleRotunda, 0);
    }
})();
