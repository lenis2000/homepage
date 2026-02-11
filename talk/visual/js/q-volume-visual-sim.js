// APPROVED: Do not modify without explicit user request
/**
 * Q-volume Slide Simulation
 * Five canvases showing q-weighted tilings + live waterfall animation
 */

function initQVolumeSim() {
    (async function() {
        'use strict';

        const canvases = [0,1,2,3,4].map(i => document.getElementById(`qvol-canvas-${i}`));
        const qInputs = [0,1,2,3,4].map(i => document.getElementById(`qvol-input-${i}`));
        const sampleBtn = document.getElementById('qvol-sample-btn');
        if (canvases.some(c => !c) || qInputs.some(i => !i)) return;

        function getQValues() {
            return qInputs.map(input => parseFloat(input.value) || 1.0);
        }

        // Wait for LozengeModule
        if (typeof LozengeModule === 'undefined') {
            console.error('LozengeModule not loaded');
            return;
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

        // GPU engine (shared across all 5, sequential use)
        let gpuEngine = null;
        let gpuAvailable = false;

        async function initGPU() {
            if (gpuEngine) return gpuAvailable;
            if (typeof WebGPULozengeEngine === 'undefined') return false;
            try {
                gpuEngine = new WebGPULozengeEngine();
                await gpuEngine.init();
                gpuAvailable = true;
                console.log('q-volume-visual: GPU CFTP available');
                return true;
            } catch (e) {
                console.log('q-volume-visual: GPU not available, using WASM CFTP');
                gpuAvailable = false;
                return false;
            }
        }

        function getGridBoundsFrom(sim) {
            const ptr = sim.getGridBounds();
            const jsonStr = sim.wasm.UTF8ToString(ptr);
            sim.freeString(ptr);
            return JSON.parse(jsonStr);
        }

        function getCFTPMinRawGridData(sim, bounds) {
            const dataPtr = sim.getCFTPMinGridData();
            if (!dataPtr) return null;
            const data = new Int32Array(bounds.size);
            for (let i = 0; i < bounds.size; i++) {
                data[i] = sim.wasm.getValue(dataPtr + i * 4, 'i32');
            }
            sim.wasm._free(dataPtr);
            return data;
        }

        function getCFTPMaxRawGridData(sim, bounds) {
            const dataPtr = sim.getCFTPMaxGridData();
            if (!dataPtr) return null;
            const data = new Int32Array(bounds.size);
            for (let i = 0; i < bounds.size; i++) {
                data[i] = sim.wasm.getValue(dataPtr + i * 4, 'i32');
            }
            sim.wasm._free(dataPtr);
            return data;
        }

        function getBlackTrianglesFromFlat(flatArr) {
            const result = [];
            for (let i = 0; i < flatArr.length; i += 3) {
                if (flatArr[i + 2] === 1) {
                    result.push({ n: flatArr[i], j: flatArr[i + 1] });
                }
            }
            return result;
        }

        const colors = ['#E57200', '#232D4B', '#F9DCBF'];
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);

        function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

        async function loadShapeTriangles() {
            const resp = await fetch('/letters/qvol_shape.json');
            const data = await resp.json();
            const triArr = [];
            for (const tri of data.triangles) {
                triArr.push(tri.n, tri.j, tri.type);
            }
            return triArr;
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

        function runCFTP(sim) {
            const ptr = sim.runCFTP();
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

            const scale = Math.min(w / (maxY - minY), h / (maxX - minX)) * 0.9;
            const cx = w / 2;
            const cy = h / 2;
            const offsetX = (minY + maxY) / 2;
            const offsetY = (minX + maxX) / 2;

            for (const d of dimers) {
                const verts = getLozengeVerts(d);
                ctx.beginPath();
                ctx.moveTo(cx - (verts[0].y - offsetX) * scale, cy - (verts[0].x - offsetY) * scale);
                for (let i = 1; i < 4; i++) {
                    ctx.lineTo(cx - (verts[i].y - offsetX) * scale, cy - (verts[i].x - offsetY) * scale);
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

        const triangles = await loadShapeTriangles();
        let sampling = false;
        let sampled = false;

        async function gpuCFTPSample(sim, q) {
            sim.initCFTP();
            const bounds = getGridBoundsFrom(sim);
            const minGridData = getCFTPMinRawGridData(sim, bounds);
            const maxGridData = getCFTPMaxRawGridData(sim, bounds);
            if (!minGridData || !maxGridData) return null;

            gpuEngine.initFromWasmData(minGridData, bounds.minN, bounds.maxN, bounds.minJ, bounds.maxJ);
            const gpuCftpOk = await gpuEngine.initCFTP(minGridData, maxGridData);
            if (!gpuCftpOk) return null;

            // Set q-bias on GPU
            gpuEngine.setCFTPWeights(null, 0, false, q);

            let T = 1;
            const maxT = 134217728;
            let coalesced = false;

            while (!coalesced && T <= maxT) {
                gpuEngine.resetCFTPChains(minGridData, maxGridData);
                const result = await gpuEngine.stepCFTP(T, Math.min(T, 10000));
                coalesced = result.coalesced;
                if (!coalesced) coalesced = await gpuEngine.checkCoalescence();
                if (!coalesced) T *= 2;
            }

            if (coalesced) {
                const resultGrid = await gpuEngine.getCFTPResult();
                const blackTris = getBlackTrianglesFromFlat(triangles);
                const dimers = gpuEngine.gridToDimers(resultGrid, blackTris);
                gpuEngine.destroyCFTP();
                return dimers;
            }
            gpuEngine.destroyCFTP();
            return null;
        }

        async function sampleAll() {
            if (sampling) return;
            sampling = true;
            sampled = true;

            const useGPU = await initGPU();
            const qValues = getQValues();

            for (let i = 0; i < qValues.length; i++) {
                const q = qValues[i];
                const sim = sims[i];

                const ctx = canvases[i].getContext('2d');
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvases[i].width, canvases[i].height);
                ctx.fillStyle = '#999';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Sampling...', canvases[i].width/2, canvases[i].height/2);

                await new Promise(r => setTimeout(r, 50));

                initSim(sim, triangles);
                sim.setQBias(q);

                let dimers = null;
                if (useGPU && gpuEngine) {
                    try {
                        dimers = await gpuCFTPSample(sim, q);
                    } catch (e) {
                        console.log('q-volume-visual: GPU CFTP failed for q=' + q, e);
                        dimers = null;
                    }
                }

                if (!dimers) {
                    // WASM fallback
                    runCFTP(sim);
                    dimers = getDimers(sim);
                }

                drawTiling(canvases[i], dimers);
            }

            sampling = false;
        }

        sampleBtn.addEventListener('click', sampleAll);

        // ===== WATERFALL LIVE ANIMATION (Three.js 3D, matching waterfall talk) =====

        const WF_N = 80, WF_T = 160, WF_S_TARGET = 80, WF_KAPPA = 3.0, WF_Q = 0.8;
        const wfWrap = document.getElementById('qvol-waterfall-wrap');

        const wfColors = {
            gray1: '#E57200',  // Orange
            gray2: '#232D4B',  // Blue
            gray3: '#F9DCBF',  // Cream
            border: '#333333'
        };

        // Waterfall WASM interface (uses global Module from 2025-06-08-q-vol-3d.js)
        const waterfallWasm = {
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
                        const result = JSON.parse(jsonStr);
                        return result.paths;
                    }
                } catch (e) { console.error('Waterfall export paths failed:', e); }
                return [];
            }
        };

        let wfPaths = null;
        let wfS = 0;
        let wfSampled = false;
        let wfSampling = false;
        let wfCurrentStep = 0;

        // Three.js state for waterfall
        let wfScene = null, wfRenderer = null, wfCamera = null, wfControls = null, wfMeshGroup = null;
        let wfRenderLoopId = null;
        let wfN = 0, wfT_cur = 0, wfS_cur = 0;

        // Zoom animation
        let wfZoomAnimId = null;
        const WF_ZOOM_DURATION = 2500;

        // Camera positions (matching spectral-projection-sim.js)
        const wfInitialCam = { pos: {x: 165.8, y: 26.1, z: 106.0}, target: {x: 73.8, y: 40.0, z: 48.1} };
        const wfZoomedCam = { pos: {x: 56.2, y: 16.1, z: 73.3}, target: {x: 34.1, y: 40.1, z: 35.3} };

        function tryInitWaterfallWasm() {
            if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function' && Module.calledRun) {
                waterfallWasm.init();
            }
        }
        tryInitWaterfallWasm();
        if (!waterfallWasm.ready) {
            window.addEventListener('wasm-loaded', tryInitWaterfallWasm, { once: true });
        }

        // ===== THREE.JS for waterfall (identical to spectral-projection-sim.js) =====

        function wfInitThreeJS() {
            const canvas = document.getElementById('qvol-waterfall-canvas');
            if (!canvas || wfRenderer) return;

            wfScene = new THREE.Scene();
            wfScene.background = new THREE.Color(0xffffff);

            wfRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            wfRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const aspect = canvas.clientWidth / canvas.clientHeight || 1;
            wfCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);

            wfControls = new THREE.OrbitControls(wfCamera, wfRenderer.domElement);
            wfControls.enableDamping = true;
            wfControls.dampingFactor = 0.1;
            wfControls.enablePan = true;
            wfControls.enableZoom = true;



            // Lighting (same as waterfall talk)
            wfScene.add(new THREE.AmbientLight(0xffffff, 0.4));
            const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
            hemi.position.set(0, 20, 0);
            wfScene.add(hemi);
            const directional = new THREE.DirectionalLight(0xffffff, 0.6);
            directional.position.set(10, 10, 15);
            wfScene.add(directional);
            const fill = new THREE.DirectionalLight(0xffffff, 0.25);
            fill.position.set(-10, -5, -10);
            wfScene.add(fill);

            wfMeshGroup = new THREE.Group();
            wfScene.add(wfMeshGroup);

            // Camera position (same as spectral-projection)
            wfCamera.position.set(wfInitialCam.pos.x, wfInitialCam.pos.y, wfInitialCam.pos.z);
            wfCamera.up.set(0, 0, 1);
            wfControls.target.set(wfInitialCam.target.x, wfInitialCam.target.y, wfInitialCam.target.z);
            wfControls.update();

            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (w > 0 && h > 0) {
                wfRenderer.setSize(w, h, false);
                wfCamera.aspect = w / h;
                wfCamera.updateProjectionMatrix();
            }
        }

        function wfDisposeThreeJS() {
            if (!wfRenderer) return;
            if (wfRenderLoopId) { cancelAnimationFrame(wfRenderLoopId); wfRenderLoopId = null; }
            if (wfMeshGroup) {
                while (wfMeshGroup.children.length > 0) {
                    const child = wfMeshGroup.children[0];
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                    wfMeshGroup.remove(child);
                }
            }
            wfRenderer.dispose();
            wfRenderer = null; wfScene = null; wfCamera = null; wfControls = null; wfMeshGroup = null;
        }

        function wfStartRenderLoop() {
            if (wfRenderLoopId) return;
            function loop() {
                if (!wfRenderer || !wfCamera || !wfControls) return;
                wfControls.update();
                wfRenderer.render(wfScene, wfCamera);
                wfRenderLoopId = requestAnimationFrame(loop);
            }
            loop();
        }

        function wfStopRenderLoop() {
            if (wfRenderLoopId) { cancelAnimationFrame(wfRenderLoopId); wfRenderLoopId = null; }
        }

        function wfClearMesh() {
            if (!wfMeshGroup) return;
            while (wfMeshGroup.children.length > 0) {
                const child = wfMeshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                wfMeshGroup.remove(child);
            }
        }

        // Path to 3D conversion (identical to spectral-projection-sim.js)
        function wfPathsTo3D(paths, N, T, S) {
            if (!wfMeshGroup) return;

            wfN = N; wfT_cur = T; wfS_cur = S;
            wfClearMesh();
            if (!paths || paths.length === 0) return;

            const pathTriplets = [];
            for (let i = 0; i < paths.length; i++) {
                const pathCopy = paths[i].slice().reverse();
                const firstElement = pathCopy[0];
                const adjustedPath = pathCopy.map(x => firstElement - x);

                const triplets = [];
                let x = 0, y = 0;
                const z = paths.length - i;
                triplets.push([x, y, z]);

                for (let j = 1; j < adjustedPath.length; j++) {
                    const prev = adjustedPath[j-1];
                    const curr = adjustedPath[j];
                    if (curr === prev + 1) x++;
                    else if (curr === prev) y++;
                    triplets.push([x, y, z]);
                }
                pathTriplets.push(triplets);
            }

            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const normals = [];
            const vertexColors = [];
            const indices = [];

            function addSquareFace(v1, v2, v3, v4, color) {
                const baseIndex = vertices.length / 3;
                vertices.push(v1[1], v1[0], v1[2]);
                vertices.push(v2[1], v2[0], v2[2]);
                vertices.push(v3[1], v3[0], v3[2]);
                vertices.push(v4[1], v4[0], v4[2]);

                const edge1 = [v2[1]-v1[1], v2[0]-v1[0], v2[2]-v1[2]];
                const edge2 = [v3[1]-v1[1], v3[0]-v1[0], v3[2]-v1[2]];
                const normal = [
                    edge1[1]*edge2[2] - edge1[2]*edge2[1],
                    edge1[2]*edge2[0] - edge1[0]*edge2[2],
                    edge1[0]*edge2[1] - edge1[1]*edge2[0]
                ];
                const len = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
                if (len > 0) { normal[0] /= len; normal[1] /= len; normal[2] /= len; }

                for (let i = 0; i < 4; i++) normals.push(normal[0], normal[1], normal[2]);
                const c = new THREE.Color(color);
                for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
                indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
            }

            // Vertical lozenges (strips between consecutive paths)
            for (let pathIdx = 1; pathIdx < pathTriplets.length; pathIdx++) {
                const topPath = pathTriplets[pathIdx];
                const bottomPath = topPath.map(p => [p[0], p[1], p[2] - 1]);
                for (let i = 0; i < topPath.length - 1; i++) {
                    let color;
                    if (topPath[i+1][0] > topPath[i][0] && topPath[i+1][1] === topPath[i][1]) {
                        color = wfColors.gray2;
                    } else if (topPath[i+1][0] === topPath[i][0] && topPath[i+1][1] > topPath[i][1]) {
                        color = wfColors.gray1;
                    } else {
                        color = wfColors.gray3;
                    }
                    addSquareFace(topPath[i], topPath[i+1], bottomPath[i+1], bottomPath[i], color);
                }
            }

            // Horizontal lozenges
            wfPlaceAllHorizontalLozenges(pathTriplets, addSquareFace, N, T, S);

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);

            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                flatShading: true,
                roughness: 0.5,
                metalness: 0.15
            });

            const mesh = new THREE.Mesh(geometry, material);
            wfMeshGroup.add(mesh);

            const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
            const edgesMaterial = new THREE.LineBasicMaterial({
                color: wfColors.border, linewidth: 1, opacity: 0.4, transparent: true
            });
            wfMeshGroup.add(new THREE.LineSegments(edgesGeometry, edgesMaterial));
        }

        // Q-function helpers for horizontal lozenges
        function wfExtractLastFromIncreasing(list) {
            const result = [];
            let i = 0;
            while (i < list.length) {
                let j = i;
                while (j + 1 < list.length && list[j] < list[j + 1]) j++;
                result.push(list[j]);
                i = j + 1;
            }
            return result;
        }

        function wfCalculateQFunction(path) {
            const table = [];
            for (let i = 0; i < path.length; i++) {
                const [x, y, z] = path[i];
                table.push(x === y ? y : x);
            }
            return wfExtractLastFromIncreasing(table);
        }

        function wfCalculateHorizontalLozengeMatrix(upperPath, lowerPath, S, T) {
            const matrix = Array(S + 1).fill().map(() => Array(T - S + 1).fill(0));
            const upperQ = wfCalculateQFunction(upperPath);
            const lowerQ = wfCalculateQFunction(lowerPath);
            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T - S; b++) {
                    const upperVal = upperQ[b] || 0;
                    const lowerVal = lowerQ[b] || 0;
                    if (upperVal > a && a >= lowerVal) matrix[a][b] = 1;
                }
            }
            return matrix;
        }

        function wfPlaceAllHorizontalLozenges(pathTriplets, addSquareFace, N, T, S) {
            function addLayer(upperPath, lowerPath, zLevel) {
                const hMatrix = wfCalculateHorizontalLozengeMatrix(upperPath, lowerPath, S, T);
                for (let a = 0; a <= S; a++) {
                    for (let b = 0; b <= T - S; b++) {
                        if (a < hMatrix.length && b < hMatrix[a].length && hMatrix[a][b] === 1) {
                            addSquareFace([a, b, zLevel], [a+1, b, zLevel], [a+1, b+1, zLevel], [a, b+1, zLevel], wfColors.gray3);
                        }
                    }
                }
            }

            // Top boundary
            if (pathTriplets.length > 0) {
                const topBoundary = [];
                for (let i = 0; i <= S; i++) topBoundary.push([i, 0, N]);
                for (let i = 1; i <= T - S; i++) topBoundary.push([S, i, N]);
                addLayer(topBoundary, pathTriplets[0], N - 1);
            }

            // Middle
            for (let idx = 0; idx < pathTriplets.length - 1; idx++) {
                addLayer(pathTriplets[idx], pathTriplets[idx + 1], pathTriplets[idx][0][2] - 1);
            }

            // Bottom boundary
            if (pathTriplets.length > 0) {
                const lastPath = pathTriplets[pathTriplets.length - 1];
                const bottomBoundary = [];
                for (let i = 0; i <= T - S; i++) bottomBoundary.push([0, i, 0]);
                for (let i = 1; i <= S; i++) bottomBoundary.push([i, T - S, 0]);
                addLayer(lastPath, bottomBoundary, 0);
            }
        }

        // ===== SAMPLING =====

        async function sampleWaterfall() {
            if (wfSampling || wfSampled) return;
            if (!waterfallWasm.ready) {
                tryInitWaterfallWasm();
                if (!waterfallWasm.ready) return;
            }
            wfSampling = true;

            try {
                waterfallWasm.setImaginaryQ(WF_Q);
                const kappasq = WF_KAPPA * WF_KAPPA;
                const ptr = await waterfallWasm.initializeTiling(WF_N, WF_T, 0, 7, -kappasq);
                let currentS = 0;
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    waterfallWasm.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    currentS = result.s || 0;
                }

                while (currentS < WF_S_TARGET) {
                    waterfallWasm.setImaginaryQ(WF_Q);
                    const sPtr = await waterfallWasm.performSOperator();
                    if (sPtr) {
                        const jsonStr = Module.UTF8ToString(sPtr);
                        waterfallWasm.freeString(sPtr);
                        const result = JSON.parse(jsonStr);
                        currentS = result.s;
                    } else {
                        break;
                    }
                }

                const paths = await waterfallWasm.refreshPaths();
                wfPaths = paths.map(p => [...p]);
                wfS = currentS;
                wfSampled = true;

                // If step 1 already hit, show immediately
                if (wfCurrentStep >= 1) {
                    showWaterfall();
                }
            } catch (e) {
                console.error('Waterfall sampling failed:', e);
            }

            wfSampling = false;
        }

        function showWaterfall() {
            if (!wfSampled || !wfWrap) return;
            wfInitThreeJS();
            wfPathsTo3D(wfPaths, WF_N, WF_T, wfS);
            // Reset camera to initial position
            if (wfCamera && wfControls) {
                wfCamera.position.set(wfInitialCam.pos.x, wfInitialCam.pos.y, wfInitialCam.pos.z);
                wfControls.target.set(wfInitialCam.target.x, wfInitialCam.target.y, wfInitialCam.target.z);
                wfControls.update();
            }
            if (wfRenderer) wfRenderer.render(wfScene, wfCamera);
            wfStartRenderLoop();
            wfWrap.style.opacity = '1';
        }

        function hideWaterfall() {
            if (wfWrap) wfWrap.style.opacity = '0';
            wfStopRenderLoop();
        }

        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function animateWfZoom(toZoomed) {
            if (wfZoomAnimId) { cancelAnimationFrame(wfZoomAnimId); wfZoomAnimId = null; }
            if (!wfCamera || !wfControls) return;

            const startTime = performance.now();
            const curPos = { x: wfCamera.position.x, y: wfCamera.position.y, z: wfCamera.position.z };
            const curTgt = { x: wfControls.target.x, y: wfControls.target.y, z: wfControls.target.z };
            const to = toZoomed ? wfZoomedCam : wfInitialCam;

            function animate() {
                if (!wfCamera || !wfControls) return;
                const elapsed = performance.now() - startTime;
                const rawT = Math.min(elapsed / WF_ZOOM_DURATION, 1);
                const t = easeInOutCubic(rawT);

                wfCamera.position.x = curPos.x + (to.pos.x - curPos.x) * t;
                wfCamera.position.y = curPos.y + (to.pos.y - curPos.y) * t;
                wfCamera.position.z = curPos.z + (to.pos.z - curPos.z) * t;
                wfControls.target.x = curTgt.x + (to.target.x - curTgt.x) * t;
                wfControls.target.y = curTgt.y + (to.target.y - curTgt.y) * t;
                wfControls.target.z = curTgt.z + (to.target.z - curTgt.z) * t;
                wfControls.update();

                if (rawT < 1) {
                    wfZoomAnimId = requestAnimationFrame(animate);
                } else {
                    wfZoomAnimId = null;
                }
            }
            animate();
        }

        // Step handling
        function onStep(step) {
            wfCurrentStep = step;
            if (step === 1) {
                if (wfSampled) showWaterfall();
            }
            if (step === 2) {
                if (wfSampled) {
                    if (wfWrap) wfWrap.style.opacity = '1';
                    if (!wfRenderer) showWaterfall();
                    animateWfZoom(true);
                }
            }
        }

        function onStepBack(step) {
            wfCurrentStep = step;
            if (step < 2) {
                animateWfZoom(false);
            }
            if (step < 1) {
                hideWaterfall();
            }
        }

        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('q-volume-visual', {
                    steps: 2,
                    onStep,
                    onStepBack,
                    start() {
                        if (wfRenderer) wfStartRenderLoop();
                    },
                    pause() {
                        wfStopRenderLoop();
                        if (wfZoomAnimId) { cancelAnimationFrame(wfZoomAnimId); wfZoomAnimId = null; }
                    },
                    onSlideEnter() {
                        wfCurrentStep = 0;
                        hideWaterfall();
                        if (!sampled) sampleAll();
                        if (!wfSampled && !wfSampling) {
                            setTimeout(() => sampleWaterfall(), 200);
                        }
                    },
                    onSlideLeave() {
                        wfStopRenderLoop();
                        if (wfZoomAnimId) { cancelAnimationFrame(wfZoomAnimId); wfZoomAnimId = null; }
                        wfDisposeThreeJS();
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
    initQVolumeSim();
} else {
    window.addEventListener('wasm-loaded', initQVolumeSim, { once: true });
}
