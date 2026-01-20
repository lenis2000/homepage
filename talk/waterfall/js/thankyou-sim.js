/**
 * Thank You Slide Simulation
 * Animated lozenge tiling letters using WASM
 */

function initThankYouSim() {
    (async function() {
        // Wait for LozengeModule factory to be available
        if (typeof LozengeModule === 'undefined') {
            console.error('LozengeModule not loaded');
            return;
        }

        // Create isolated WASM instance for Thank You slide
        const wasm = await LozengeModule();

        const letters = ['T', 'H', 'A', 'N', 'K', 'Y', 'O', 'U'];
        const colors = ['#E57200', '#232D4B', '#F9DCBF'];

        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);

        function getVertex(n, j) {
            return { x: n, y: slope * n + j * deltaC };
        }

        // WASM interface (using our isolated instance)
        const initFromTrianglesWasm = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const performGlauberStepsWasm = wasm.cwrap('performGlauberSteps', 'number', ['number']);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeStringWasm = wasm.cwrap('freeString', null, ['number']);
        const setUseRandomSweepsWasm = wasm.cwrap('setUseRandomSweeps', null, ['number']);
        const setDimersWasm = wasm.cwrap('setDimers', 'number', ['number', 'number']);

        // Helper to restore dimers to WASM after reinit
        function restoreDimers(dimers) {
            if (!dimers || dimers.length === 0) return;
            // Convert to flat array: [bn, bj, wn, wj, type, ...]
            const arr = [];
            for (const d of dimers) {
                arr.push(d.bn, d.bj, d.wn, d.wj, d.t);
            }
            const dataPtr = wasm._malloc(arr.length * 4);
            for (let i = 0; i < arr.length; i++) {
                wasm.setValue(dataPtr + i * 4, arr[i], 'i32');
            }
            const ptr = setDimersWasm(dataPtr, arr.length);
            freeStringWasm(ptr);
            wasm._free(dataPtr);
        }

        // Store state for each letter
        const letterStates = [];

        // Load all letters
        for (const letter of letters) {
            const canvasId = `letter-${letter}`;
            const canvas = document.getElementById(canvasId);
            if (!canvas) continue;

            try {
                const response = await fetch(`/letters/${letter}.json`);
                if (!response.ok) continue;
                const data = await response.json();
                if (!data.triangles) continue;

                const triangles = new Map();
                const triangleArr = [];
                for (const t of data.triangles) {
                    const type = t.type || t.t;
                    triangles.set(`${t.n},${t.j},${type}`, { n: t.n, j: t.j, type });
                    triangleArr.push(t.n, t.j, type);
                }

                // Calculate bounds
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (const [, tri] of triangles) {
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

                letterStates.push({
                    letter,
                    canvas,
                    ctx: canvas.getContext('2d'),
                    triangles,
                    triangleArr,
                    dimers: [],
                    bounds: { minX, maxX, minY, maxY }
                });
            } catch (e) {
                // Skip failed letters
            }
        }

        // Initialize each letter and get initial dimers
        for (const state of letterStates) {
            const dataPtr = wasm._malloc(state.triangleArr.length * 4);
            for (let i = 0; i < state.triangleArr.length; i++) {
                wasm.setValue(dataPtr + i * 4, state.triangleArr[i], 'i32');
            }
            const ptr = initFromTrianglesWasm(dataPtr, state.triangleArr.length);
            const jsonStr = wasm.UTF8ToString(ptr);
            freeStringWasm(ptr);
            wasm._free(dataPtr);

            const result = JSON.parse(jsonStr);
            if (result.status === 'valid') {
                setUseRandomSweepsWasm(1);
                const dPtr = exportDimersWasm();
                const dimerStr = wasm.UTF8ToString(dPtr);
                freeStringWasm(dPtr);
                const dimerResult = JSON.parse(dimerStr);
                state.dimers = Array.isArray(dimerResult) ? dimerResult : (dimerResult.dimers || []);
            }
        }

        // Draw function for a letter
        function drawLetter(state) {
            const { canvas, ctx, bounds, dimers } = state;
            const { minX, maxX, minY, maxY } = bounds;

            // Use fixed dimensions to prevent zoom issues
            const displayWidth = 200;
            const displayHeight = 260;
            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== displayWidth * dpr) {
                canvas.width = displayWidth * dpr;
                canvas.height = displayHeight * dpr;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, displayWidth, displayHeight);

            const regionWidth = maxX - minX;
            const regionHeight = maxY - minY;
            // Scale by HEIGHT only so all letters have same lozenge height (K aligns with others)
            const scale = (displayHeight / regionHeight) * 0.85;
            const centerX = displayWidth / 2 - ((minX + maxX) / 2) * scale;
            const centerY = displayHeight / 2 + ((minY + maxY) / 2) * scale;

            // Draw lozenges
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
                const p0 = [centerX + verts[0].x * scale, centerY - verts[0].y * scale];
                ctx.moveTo(p0[0], p0[1]);
                for (let i = 1; i < 4; i++) {
                    const p = [centerX + verts[i].x * scale, centerY - verts[i].y * scale];
                    ctx.lineTo(p[0], p[1]);
                }
                ctx.closePath();
                ctx.fillStyle = colors[t];
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        // Initial draw
        for (const state of letterStates) {
            drawLetter(state);
        }

        // Animation: cycle through letters, updating one per frame
        let currentLetterIdx = 0;
        let isRunning = false;
        let animationId = null;

        function animate() {
            if (!isRunning) return;

            // Update current letter
            const state = letterStates[currentLetterIdx];
            if (state) {
                // Re-init WASM with this letter's triangles (needed since we cycle through letters)
                const dataPtr = wasm._malloc(state.triangleArr.length * 4);
                for (let i = 0; i < state.triangleArr.length; i++) {
                    wasm.setValue(dataPtr + i * 4, state.triangleArr[i], 'i32');
                }
                const ptr = initFromTrianglesWasm(dataPtr, state.triangleArr.length);
                freeStringWasm(ptr);
                wasm._free(dataPtr);

                // Restore previous dimers so Glauber continues from current state
                restoreDimers(state.dimers);

                setUseRandomSweepsWasm(1);

                // Run Glauber steps
                const stepPtr = performGlauberStepsWasm(10);
                freeStringWasm(stepPtr);

                // Export new dimers
                const dPtr = exportDimersWasm();
                const dimerStr = wasm.UTF8ToString(dPtr);
                freeStringWasm(dPtr);
                const dimerResult = JSON.parse(dimerStr);
                state.dimers = Array.isArray(dimerResult) ? dimerResult : (dimerResult.dimers || []);

                drawLetter(state);
            }

            currentLetterIdx = (currentLetterIdx + 1) % letterStates.length;
            animationId = requestAnimationFrame(animate);
        }

        function start() {
            if (isRunning) return;
            isRunning = true;
            animate();
        }

        function pause() {
            isRunning = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        }

        // Register with slide engine - auto-start when slide is shown
        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('thankyou', {
                    start,
                    pause,
                    onSlideEnter() {
                        for (const state of letterStates) {
                            drawLetter(state);
                        }
                        start();
                    }
                }, 0);
            } else {
                setTimeout(waitForSlideEngine, 50);
            }
        }
        waitForSlideEngine();
    })();
}

// Initialize when WASM is loaded
if (typeof LozengeModule !== 'undefined') {
    initThankYouSim();
} else {
    window.addEventListener('wasm-loaded', initThankYouSim, { once: true });
}
