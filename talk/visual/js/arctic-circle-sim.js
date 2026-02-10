/**
 * Arctic Circle slide: live CFTP sampling for 3 shapes
 * Uses GPU CFTP (WebGPULozengeEngine) with WASM fallback.
 * Hexagon (hex.json), Sawtooth/Cardioid (cardio.json), General (shape_for_arctic_small.json)
 */

function initArcticCircleSim() {
    (async function() {
        'use strict';

        // Canvases
        const hexCanvas = document.getElementById('ac-hex-canvas');
        const cardioCanvas = document.getElementById('ac-cardio-canvas');
        const generalCanvas = document.getElementById('ac-general-canvas');
        if (!hexCanvas || !cardioCanvas || !generalCanvas) return;

        const hexCtx = hexCanvas.getContext('2d');
        const cardioCtx = cardioCanvas.getContext('2d');
        const generalCtx = generalCanvas.getContext('2d');

        if (typeof LozengeModule === 'undefined') {
            console.error('Arctic circle: LozengeModule not loaded');
            return;
        }

        // Create 3 isolated WASM instances
        const wasmHex = await LozengeModule();
        const wasmCardio = await LozengeModule();
        const wasmGeneral = await LozengeModule();

        function wrapWasm(wasm) {
            return {
                initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
                runCFTP: wasm.cwrap('runCFTP', 'number', []),
                exportDimers: wasm.cwrap('exportDimers', 'number', []),
                freeString: wasm.cwrap('freeString', null, ['number']),
                initCFTPWasm: wasm.cwrap('initCFTP', 'number', []),
                getGridBoundsWasm: wasm.cwrap('getGridBounds', 'number', []),
                getCFTPMinGridDataWasm: wasm.cwrap('getCFTPMinGridData', 'number', []),
                getCFTPMaxGridDataWasm: wasm.cwrap('getCFTPMaxGridData', 'number', []),
                _malloc: wasm._malloc.bind(wasm),
                _free: wasm._free.bind(wasm),
                setValue: wasm.setValue.bind(wasm),
                getValue: wasm.getValue.bind(wasm),
                UTF8ToString: wasm.UTF8ToString.bind(wasm)
            };
        }

        const engines = {
            hex: wrapWasm(wasmHex),
            cardio: wrapWasm(wasmCardio),
            general: wrapWasm(wasmGeneral)
        };

        // GPU engine (shared across all 3, sequential use)
        let gpuEngine = null;
        let gpuAvailable = false;

        async function initGPU() {
            if (gpuEngine) return gpuAvailable;
            if (typeof WebGPULozengeEngine === 'undefined') return false;
            try {
                gpuEngine = new WebGPULozengeEngine();
                await gpuEngine.init();
                gpuAvailable = true;
                console.log('Arctic circle: GPU CFTP available');
                return true;
            } catch (e) {
                console.log('Arctic circle: GPU not available, using WASM CFTP');
                gpuAvailable = false;
                return false;
            }
        }

        // Color schemes
        const colorSchemes = {
            hex: ['#E57200', '#232D4B', '#F9DCBF'],          // UVA
            cardio: ['#E91E63', '#880E4F', '#F8BBD0'],       // Valentine pink
            general: ['#E57200', '#232D4B', '#F9DCBF']       // UVA
        };

        // State
        const triangles = { hex: null, cardio: null, general: null };
        const dimers = { hex: [], cardio: [], general: [] };
        let loaded = false;
        let hasSampled = false;
        let cancelled = false;  // cancellation flag for non-blocking nav

        // Geometry helpers
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);
        function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

        function getLozengeVerts(dimer) {
            const { bn, bj, t } = dimer;
            if (t === 0) {
                return [getVertex(bn, bj), getVertex(bn+1, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
            } else if (t === 1) {
                return [getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn+1, bj-2), getVertex(bn, bj-1)];
            } else {
                return [getVertex(bn-1, bj), getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
            }
        }

        function toCanvas(x, y, centerX, centerY, scale) {
            return [centerX + x * scale, centerY - y * scale];
        }

        function resize(canvas, ctx) {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function resizeAll() {
            resize(hexCanvas, hexCtx);
            resize(cardioCanvas, cardioCtx);
            resize(generalCanvas, generalCtx);
        }

        const CARDIO_ROTATION = -Math.PI / 3;  // 60° clockwise

        function draw(ctx, canvas, dimerList, colors, angle) {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            if (dimerList.length === 0) return;

            // Precompute all vertex positions
            const allVerts = dimerList.map(d => getLozengeVerts(d));

            // Rotate around centroid if angle given
            if (angle) {
                let cx = 0, cy = 0, count = 0;
                for (const verts of allVerts) {
                    for (const v of verts) { cx += v.x; cy += v.y; count++; }
                }
                cx /= count; cy /= count;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                for (const verts of allVerts) {
                    for (const v of verts) {
                        const dx = v.x - cx, dy = v.y - cy;
                        v.x = cx + dx * cos - dy * sin;
                        v.y = cy + dx * sin + dy * cos;
                    }
                }
            }

            // Compute bounds
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const verts of allVerts) {
                for (const v of verts) {
                    if (v.x < minX) minX = v.x;
                    if (v.x > maxX) maxX = v.x;
                    if (v.y < minY) minY = v.y;
                    if (v.y > maxY) maxY = v.y;
                }
            }

            const worldW = maxX - minX;
            const worldH = maxY - minY;
            const padding = 0.1;
            const scale = Math.min(w / (worldW * (1 + padding)), h / (worldH * (1 + padding)));
            const centerX = w / 2 - (minX + maxX) / 2 * scale;
            const centerY = h / 2 + (minY + maxY) / 2 * scale;

            for (let i = 0; i < dimerList.length; i++) {
                const verts = allVerts[i];
                const canvasVerts = verts.map(v => toCanvas(v.x, v.y, centerX, centerY, scale));

                ctx.fillStyle = colors[dimerList[i].t];
                ctx.beginPath();
                ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
                for (let j = 1; j < canvasVerts.length; j++) {
                    ctx.lineTo(canvasVerts[j][0], canvasVerts[j][1]);
                }
                ctx.closePath();
                ctx.fill();

            }
        }

        function drawAll() {
            draw(hexCtx, hexCanvas, dimers.hex, colorSchemes.hex);
            draw(cardioCtx, cardioCanvas, dimers.cardio, colorSchemes.cardio, CARDIO_ROTATION);
            draw(generalCtx, generalCanvas, dimers.general, colorSchemes.general);
        }

        // Load triangles into WASM
        function loadAndInit(engine, triList) {
            const triArr = [];
            for (const tri of triList) {
                triArr.push(tri.n, tri.j, tri.type);
            }
            const ptr = engine._malloc(triArr.length * 4);
            for (let i = 0; i < triArr.length; i++) {
                engine.setValue(ptr + i * 4, triArr[i], 'i32');
            }
            engine.initFromTriangles(ptr, triArr.length);
            engine._free(ptr);
        }

        function getDimers(engine) {
            const strPtr = engine.exportDimers();
            const jsonStr = engine.UTF8ToString(strPtr);
            engine.freeString(strPtr);
            try {
                const parsed = JSON.parse(jsonStr);
                return Array.isArray(parsed.dimers) ? parsed.dimers : [];
            } catch (e) {
                return [];
            }
        }

        // WASM CFTP helpers for GPU
        function getGridBounds(engine) {
            const ptr = engine.getGridBoundsWasm();
            const jsonStr = engine.UTF8ToString(ptr);
            engine.freeString(ptr);
            return JSON.parse(jsonStr);
        }

        function getCFTPMinRawGridData(engine, bounds) {
            const dataPtr = engine.getCFTPMinGridDataWasm();
            if (!dataPtr) return null;
            const data = new Int32Array(bounds.size);
            for (let i = 0; i < bounds.size; i++) {
                data[i] = engine.getValue(dataPtr + i * 4, 'i32');
            }
            engine._free(dataPtr);
            return data;
        }

        function getCFTPMaxRawGridData(engine, bounds) {
            const dataPtr = engine.getCFTPMaxGridDataWasm();
            if (!dataPtr) return null;
            const data = new Int32Array(bounds.size);
            for (let i = 0; i < bounds.size; i++) {
                data[i] = engine.getValue(dataPtr + i * 4, 'i32');
            }
            engine._free(dataPtr);
            return data;
        }

        // Black triangles = type 1 (right-facing) from input JSON
        function getBlackTrianglesFromJSON(triList) {
            return triList.filter(t => t.type === 1).map(t => ({ n: t.n, j: t.j }));
        }

        // GPU CFTP for one shape — returns dimers array
        async function gpuCFTPSample(engine, triList) {
            // Init triangles already done; set up CFTP state in WASM
            engine.initCFTPWasm();
            const bounds = getGridBounds(engine);
            const minGridData = getCFTPMinRawGridData(engine, bounds);
            const maxGridData = getCFTPMaxRawGridData(engine, bounds);
            if (!minGridData || !maxGridData) return null;

            gpuEngine.initFromWasmData(minGridData, bounds.minN, bounds.maxN, bounds.minJ, bounds.maxJ);
            const gpuCftpOk = await gpuEngine.initCFTP(minGridData, maxGridData);
            if (!gpuCftpOk) return null;

            let T = 1;
            const maxT = 134217728;
            let coalesced = false;

            while (!coalesced && T <= maxT && !cancelled) {
                gpuEngine.resetCFTPChains(minGridData, maxGridData);
                const result = await gpuEngine.stepCFTP(T, Math.min(T, 10000));
                coalesced = result.coalesced;
                if (!coalesced) coalesced = await gpuEngine.checkCoalescence();
                if (!coalesced) T *= 2;
            }

            if (coalesced && !cancelled) {
                const resultGrid = await gpuEngine.getCFTPResult();
                const blackTris = getBlackTrianglesFromJSON(triList);
                const result = gpuEngine.gridToDimers(resultGrid, blackTris);
                gpuEngine.destroyCFTP();
                return result;
            }
            gpuEngine.destroyCFTP();
            return null;
        }

        // Load all 3 JSON files eagerly at init time
        try {
            const [hexResp, cardioResp, generalResp] = await Promise.all([
                fetch('/letters/hex.json'),
                fetch('/letters/cardio.json'),
                fetch('/letters/shape_for_arctic_small.json')
            ]);
            const [hexData, cardioData, generalData] = await Promise.all([
                hexResp.json(),
                cardioResp.json(),
                generalResp.json()
            ]);
            triangles.hex = hexData.triangles;
            triangles.cardio = cardioData.triangles;
            triangles.general = generalData.triangles;
            loaded = true;
        } catch (e) {
            console.error('Arctic circle: failed to load triangles', e);
            return;
        }

        // Try init GPU early
        await initGPU();

        let sampling = false;

        function showSamplingMsg(ctx, canvas) {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#999';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sampling...', w / 2, h / 2);
        }

        async function sampleAll() {
            if (!loaded || sampling) return;
            sampling = true;
            cancelled = false;

            const canvasInfo = [
                ['hex', hexCtx, hexCanvas],
                ['cardio', cardioCtx, cardioCanvas],
                ['general', generalCtx, generalCanvas]
            ];

            // Show "Sampling..." on all canvases
            for (const [, ctx, canvas] of canvasInfo) {
                showSamplingMsg(ctx, canvas);
            }

            // Sample one at a time with UI yields
            for (const [key, ctx, canvas] of canvasInfo) {
                if (cancelled) break;
                await new Promise(r => setTimeout(r, 50));
                if (cancelled) break;

                loadAndInit(engines[key], triangles[key]);

                let result = null;
                if (gpuAvailable && gpuEngine) {
                    result = await gpuCFTPSample(engines[key], triangles[key]);
                }

                if (cancelled) break;

                if (result) {
                    dimers[key] = result;
                } else {
                    // WASM fallback
                    engines[key].runCFTP();
                    dimers[key] = getDimers(engines[key]);
                }

                if (cancelled) break;
                draw(ctx, canvas, dimers[key], colorSchemes[key], key === 'cardio' ? CARDIO_ROTATION : 0);
            }

            if (!cancelled) hasSampled = true;
            sampling = false;
        }

        function clearAll() {
            cancelled = true;
            dimers.hex = [];
            dimers.cardio = [];
            dimers.general = [];
            hasSampled = false;
            for (const [ctx, canvas] of [[hexCtx, hexCanvas], [cardioCtx, cardioCanvas], [generalCtx, generalCanvas]]) {
                const w = canvas.clientWidth, h = canvas.clientHeight;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
            }
        }

        // DOM elements
        const frozenPane = document.getElementById('ac-frozen-pane');
        const liquidPane = document.getElementById('ac-liquid-pane');
        const boundaryPane = document.getElementById('ac-boundary-pane');
        const hexLabel = document.getElementById('ac-hex-label');
        const cardioLabel = document.getElementById('ac-cardio-label');
        const generalLabel = document.getElementById('ac-general-label');
        const equationsRow = document.getElementById('ac-equations-row');

        // Set visual state for a given step (fully establish - no incremental assumptions)
        function setVisualState(step) {
            // Step 0: CFTP samples + frozen/liquid/boundary panes
            if (step === 0) {
                if (frozenPane) frozenPane.style.display = '';
                if (liquidPane) liquidPane.style.display = '';
                if (boundaryPane) boundaryPane.style.display = '';
                if (equationsRow) equationsRow.style.display = 'none';
                if (hexLabel) hexLabel.textContent = 'Hexagon';
                if (cardioLabel) cardioLabel.textContent = 'Sawtooth';
                if (generalLabel) generalLabel.textContent = 'General polygon';

                if (hasSampled) {
                    drawAll();
                } else {
                    sampleAll();
                }
            }
            // Step 1: equations + curve names
            else if (step === 1) {
                if (frozenPane) frozenPane.style.display = '';
                if (liquidPane) liquidPane.style.display = '';
                if (boundaryPane) boundaryPane.style.display = '';
                if (equationsRow) equationsRow.style.display = 'grid';
                if (hexLabel) hexLabel.innerHTML = 'Hexagon: <span style="color: var(--slide-navy);">ellipse</span>';
                if (cardioLabel) cardioLabel.innerHTML = 'Sawtooth: <span style="color: #E91E63;">cardioid</span>';
                if (generalLabel) generalLabel.innerHTML = 'General: <span style="color: var(--slide-accent);">algebraic curve</span>';

                if (hasSampled) {
                    drawAll();
                } else {
                    sampleAll();
                }
            }
        }

        // Resize handler
        window.addEventListener('resize', () => {
            resizeAll();
            drawAll();
        });

        // Register with slide engine — JSON already loaded, GPU already init'd
        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('arctic-circle', {
                    steps: 1,
                    onSlideEnter() {
                        hasSampled = false;
                        cancelled = false;
                        resizeAll();
                        setVisualState(0);
                    },
                    onSlideLeave() {
                        cancelled = true;  // abort any in-progress GPU CFTP
                        clearAll();
                    },
                    reset() {
                        hasSampled = false;
                        cancelled = false;
                        setVisualState(0);
                    },
                    onStep(step) {
                        setVisualState(step);
                    },
                    onStepBack(step) {
                        setVisualState(step);
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
    initArcticCircleSim();
} else {
    window.addEventListener('wasm-loaded', initArcticCircleSim, { once: true });
}
