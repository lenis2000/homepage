// APPROVED: Do not modify without explicit user request
/**
 * GFF Fluctuations: 3D surface from two independent lozenge tiling CFTP samples
 * GFF ≈ (h₁ - h₂) / √2
 * Uses Rotunda shape, WebGPU CFTP with CPU fallback (same pattern as limit-shape-sim)
 */

function initGFFFluctuationsSim() {
    (async function() {
        'use strict';

        const canvas = document.getElementById('gff-canvas');
        if (!canvas) return;

        if (typeof LozengeModule === 'undefined') {
            console.error('[GFF] LozengeModule not loaded');
            return;
        }

        // ---- WASM setup ----
        const wasm = await LozengeModule();
        const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const runCFTPWasm = wasm.cwrap('runCFTP', 'number', []);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeString = wasm.cwrap('freeString', null, ['number']);
        const initCFTPWasm = wasm.cwrap('initCFTP', 'number', []);
        const getGridBoundsWasm = wasm.cwrap('getGridBounds', 'number', []);
        const getCFTPMinGridDataWasm = wasm.cwrap('getCFTPMinGridData', 'number', []);
        const getCFTPMaxGridDataWasm = wasm.cwrap('getCFTPMaxGridData', 'number', []);
        const performGlauberSteps = wasm.cwrap('performGlauberSteps', 'number', ['number']);

        console.log('[GFF] WASM ready');

        // ---- WebGPU engine ----
        let gpuEngine = null;
        let gpuAvailable = false;

        async function initGPU() {
            if (gpuEngine) return gpuAvailable;
            if (typeof WebGPULozengeEngine === 'undefined') {
                console.log('[GFF] WebGPULozengeEngine not available');
                return false;
            }
            try {
                gpuEngine = new WebGPULozengeEngine();
                await gpuEngine.init();
                gpuAvailable = true;
                console.log('[GFF] WebGPU engine initialized');
                return true;
            } catch (e) {
                console.log('[GFF] WebGPU not available:', e.message);
                gpuAvailable = false;
                return false;
            }
        }

        function getGridBounds() {
            const ptr = getGridBoundsWasm();
            const jsonStr = wasm.UTF8ToString(ptr);
            freeString(ptr);
            return JSON.parse(jsonStr);
        }

        function getCFTPMinRawGridData(bounds) {
            const dataPtr = getCFTPMinGridDataWasm();
            if (!dataPtr) return null;
            const data = new Int32Array(bounds.size);
            for (let i = 0; i < bounds.size; i++) {
                data[i] = wasm.getValue(dataPtr + i * 4, 'i32');
            }
            wasm._free(dataPtr);
            return data;
        }

        function getCFTPMaxRawGridData(bounds) {
            const dataPtr = getCFTPMaxGridDataWasm();
            if (!dataPtr) return null;
            const data = new Int32Array(bounds.size);
            for (let i = 0; i < bounds.size; i++) {
                data[i] = wasm.getValue(dataPtr + i * 4, 'i32');
            }
            wasm._free(dataPtr);
            return data;
        }

        function getBlackTriangles() {
            if (!shapeTrianglesObj) return [];
            return shapeTrianglesObj.filter(t => t.type === 1).map(t => ({ n: t.n, j: t.j }));
        }

        // ---- Load shape ----
        let shapeTrianglesObj = null; // original objects for gridToDimers
        let shapeTrianglesFlat = null; // flat Int32Array for WASM init

        try {
            const resp = await fetch('/letters/Rotunda.json');
            const data = await resp.json();
            shapeTrianglesObj = data.triangles;
            shapeTrianglesFlat = new Int32Array(data.triangles.length * 3);
            for (let i = 0; i < data.triangles.length; i++) {
                shapeTrianglesFlat[i * 3] = data.triangles[i].n;
                shapeTrianglesFlat[i * 3 + 1] = data.triangles[i].j;
                shapeTrianglesFlat[i * 3 + 2] = data.triangles[i].type;
            }
        } catch (e) {
            console.error('[GFF] Failed to load Rotunda.json:', e);
            return;
        }

        // Initialize WASM tiling from triangles
        const triPtr = wasm._malloc(shapeTrianglesFlat.length * 4);
        for (let i = 0; i < shapeTrianglesFlat.length; i++) {
            wasm.setValue(triPtr + i * 4, shapeTrianglesFlat[i], 'i32');
        }
        const initPtr = initFromTriangles(triPtr, shapeTrianglesFlat.length);
        freeString(initPtr);
        wasm._free(triPtr);

        // ---- Constants ----
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);
        const Z_SCALE = 20.0;
        const frustumSize = 30;

        // ---- State ----
        let sampleGeneration = 0;
        let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
        let animationId = null;
        let isRunning = false;
        let statusEl = null;
        let samplingActive = false;

        // Drop navigation keys during sampling
        document.addEventListener('keydown', function(e) {
            if (!samplingActive) return;
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                 ' ', 'PageUp', 'PageDown'].includes(e.key)) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }, true);

        // ---- Status overlay ----
        function showStatus(text) {
            if (!statusEl) {
                const parent = canvas && canvas.parentElement;
                if (!parent) return;
                statusEl = document.createElement('div');
                statusEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                    'font-size:clamp(1.2rem,2vw,1.6rem);color:#666;background:rgba(255,255,255,0.85);' +
                    'padding:0.8vh 1.5vw;border-radius:4px;pointer-events:none;z-index:10;';
                parent.style.position = 'relative';
                parent.appendChild(statusEl);
            }
            statusEl.textContent = text;
            statusEl.style.display = '';
        }

        function hideStatus() {
            if (statusEl) statusEl.style.display = 'none';
        }

        // ---- Height function from dimers (BFS) ----
        function getVertexKeys(dimer) {
            const { bn, bj, t } = dimer;
            if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
        }

        function getHeightPattern(t) {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        }

        function computeHeights(dimers) {
            if (dimers.length === 0) return new Map();

            const vertexToDimers = new Map();
            for (const dimer of dimers) {
                for (const [n, j] of getVertexKeys(dimer)) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }

            const heights = new Map();
            const firstVerts = getVertexKeys(dimers[0]);
            const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
            heights.set(startKey, 0);

            const queue = [startKey];
            let queueIdx = 0;
            const visited = new Set();

            while (queueIdx < queue.length) {
                const currentKey = queue[queueIdx++];
                if (visited.has(currentKey)) continue;
                visited.add(currentKey);

                const currentH = heights.get(currentKey);
                const [cn, cj] = currentKey.split(',').map(Number);

                for (const dimer of vertexToDimers.get(currentKey) || []) {
                    const verts = getVertexKeys(dimer);
                    const pattern = getHeightPattern(dimer.t);
                    const myIdx = verts.findIndex(([vn, vj]) => vn === cn && vj === cj);
                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const vkey = `${verts[i][0]},${verts[i][1]}`;
                            if (!heights.has(vkey)) {
                                heights.set(vkey, currentH + (pattern[i] - pattern[myIdx]));
                                queue.push(vkey);
                            }
                        }
                    }
                }
            }

            return heights;
        }

        // ---- Absolute colormap: 0=gray, positive→red, negative→blue ----
        // Same tanh approach as ultimate lozenge: zero is always gray
        function gffColor(h) {
            const t = Math.tanh(h / 1.5);
            const alpha = Math.min(1, Math.abs(h) / 1);
            if (t < 0) {
                const s = -t;
                return [0.1 * (1 - s), 0.2 * (1 - s), 1.0, alpha];
            }
            const s = t;
            return [1.0, 0.15 * (1 - s), 0.05 * (1 - s), alpha];
        }

        // ---- Three.js ----
        function initThreeJS() {
            if (renderer) return;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xffffff);

            const w = canvas.clientWidth || canvas.width;
            const h = canvas.clientHeight || canvas.height;
            const aspect = w / h || 1;

            camera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2, frustumSize * aspect / 2,
                frustumSize / 2, -frustumSize / 2, -5000, 6000
            );
            camera.up.set(0, 0, 1);
            camera.position.set(20, 20, 20);
            camera.lookAt(0, 0, 0);

            renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(w, h);

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.rotateSpeed = 0.8;
            controls.panSpeed = 0.8;
            controls.zoomSpeed = 1.2;

            scene.add(new THREE.AmbientLight(0xffffff, 0.4));
            const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
            hemi.position.set(0, 20, 0);
            scene.add(hemi);
            const dir = new THREE.DirectionalLight(0xffffff, 0.6);
            dir.position.set(10, 10, 15);
            scene.add(dir);
            const fill = new THREE.DirectionalLight(0xffffff, 0.25);
            fill.position.set(-10, -5, -10);
            scene.add(fill);

            meshGroup = new THREE.Group();
            scene.add(meshGroup);

            controls.addEventListener('change', () => {
                if (!isRunning && renderer) renderer.render(scene, camera);
            });

            renderer.render(scene, camera);
        }

        function disposeThreeJS() {
            if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
            isRunning = false;
            if (statusEl) { statusEl.remove(); statusEl = null; }
            if (!renderer) return;

            if (meshGroup) {
                while (meshGroup.children.length > 0) {
                    const child = meshGroup.children[0];
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                    meshGroup.remove(child);
                }
            }

            if (controls) controls.dispose();
            renderer.dispose();
            renderer = null; scene = null; camera = null; controls = null; meshGroup = null;
        }

        function resize() {
            if (!renderer || !camera || !canvas) return;
            const w = canvas.clientWidth || canvas.width;
            const h = canvas.clientHeight || canvas.height;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h);
            const aspect = w / h;
            camera.left = -frustumSize * aspect / 2;
            camera.right = frustumSize * aspect / 2;
            camera.top = frustumSize / 2;
            camera.bottom = -frustumSize / 2;
            camera.updateProjectionMatrix();
        }

        window.addEventListener('resize', resize);

        function animate() {
            if (!renderer || !camera || !controls) { animationId = null; return; }
            controls.update();
            renderer.render(scene, camera);
            animationId = requestAnimationFrame(animate);
        }

        function startAnimation() { isRunning = true; if (!animationId) animate(); }
        function stopAnimation() { isRunning = false; if (animationId) { cancelAnimationFrame(animationId); animationId = null; } }

        // ---- Camera animation ----
        let cameraAnimId = null;

        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function animateCamera(targetPos, targetLookAt, targetZoom, duration) {
            if (cameraAnimId) cancelAnimationFrame(cameraAnimId);
            if (!camera || !controls) return;

            const startPos = camera.position.clone();
            const startTarget = controls.target.clone();
            const startZoom = camera.zoom;
            const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
            const endTarget = new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);
            const t0 = performance.now();

            function step() {
                if (!camera || !controls) { cameraAnimId = null; return; }
                const elapsed = performance.now() - t0;
                const progress = Math.min(elapsed / duration, 1);
                const t = easeInOutCubic(progress);

                camera.position.lerpVectors(startPos, endPos, t);
                controls.target.lerpVectors(startTarget, endTarget, t);
                camera.zoom = startZoom + (targetZoom - startZoom) * t;
                camera.updateProjectionMatrix();
                controls.update();
                if (renderer) renderer.render(scene, camera);

                if (progress < 1) {
                    cameraAnimId = requestAnimationFrame(step);
                } else {
                    cameraAnimId = null;
                }
            }
            step();
        }

        // ---- Camera ----
        function centerCamera(gff) {
            if (!camera || !controls) return;
            camera.position.set(11.1, -54.6, 110.7);
            controls.target.set(49.1, 21.6, -2.9);
            camera.zoom = 0.20;
            camera.updateProjectionMatrix();
            controls.update();
        }

        function centerCameraFlat(vertexSet) {
            if (!camera || !controls) return;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const key of vertexSet) {
                const [n, j] = key.split(',').map(Number);
                const x = n, y = slope * n + j * deltaC;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
            const size = Math.max(maxX - minX, maxY - minY) || 10;
            controls.target.set(cx, cy, 0);
            camera.position.set(cx - size * 0.3, cy - size * 0.5, size * 0.7);
            camera.zoom = frustumSize / (size * 1.1);
            camera.updateProjectionMatrix();
            controls.update();
        }

        // ---- Boundary ----
        function computeBoundaryLoops(vertexSet) {
            let minN = Infinity, maxN = -Infinity, minJ = Infinity, maxJ = -Infinity;
            for (const key of vertexSet) {
                const [n, j] = key.split(',').map(Number);
                if (n < minN) minN = n; if (n > maxN) maxN = n;
                if (j < minJ) minJ = j; if (j > maxJ) maxJ = j;
            }

            const edgeCount = new Map();
            function countEdge(a, b) {
                const key = a < b ? a + '|' + b : b + '|' + a;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
            for (let n = minN; n <= maxN; n++) {
                for (let j = minJ; j <= maxJ; j++) {
                    const a = n+','+j, b = n+','+(j-1), c = (n+1)+','+(j-1), d = (n+1)+','+j;
                    if (vertexSet.has(a) && vertexSet.has(b) && vertexSet.has(c)) {
                        countEdge(a, b); countEdge(b, c); countEdge(a, c);
                    }
                    if (vertexSet.has(a) && vertexSet.has(d) && vertexSet.has(c)) {
                        countEdge(a, d); countEdge(d, c); countEdge(a, c);
                    }
                }
            }

            const adj = new Map();
            for (const [key, cnt] of edgeCount) {
                if (cnt !== 1) continue;
                const [a, b] = key.split('|');
                if (!adj.has(a)) adj.set(a, []);
                if (!adj.has(b)) adj.set(b, []);
                adj.get(a).push(b);
                adj.get(b).push(a);
            }

            const loops = [];
            const visited = new Set();
            for (const [start] of adj) {
                if (visited.has(start)) continue;
                const loop = [start];
                visited.add(start);
                let current = start;
                while (true) {
                    const next = (adj.get(current) || []).find(v => !visited.has(v));
                    if (!next) break;
                    loop.push(next);
                    visited.add(next);
                    current = next;
                }
                if (loop.length >= 3) loops.push(loop);
            }
            return loops;
        }

        function drawBoundary(vertexSet, zLevel) {
            if (!meshGroup) return;
            const loops = computeBoundaryLoops(vertexSet);
            const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
            for (const loop of loops) {
                const points = loop.map(key => {
                    const [n, j] = key.split(',').map(Number);
                    return new THREE.Vector3(n, slope * n + j * deltaC, zLevel);
                });
                points.push(points[0]);
                const geom = new THREE.BufferGeometry().setFromPoints(points);
                meshGroup.add(new THREE.Line(geom, mat));
            }
        }

        // ---- Surface mesh ----
        function buildSurfaceMesh(gff) {
            if (!meshGroup) return;

            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }

            if (!gff || gff.size === 0) return;

            let minN = Infinity, maxN = -Infinity, minJ = Infinity, maxJ = -Infinity;
            for (const key of gff.keys()) {
                const [n, j] = key.split(',').map(Number);
                if (n < minN) minN = n; if (n > maxN) maxN = n;
                if (j < minJ) minJ = j; if (j > maxJ) maxJ = j;
            }

            const positions = [];
            const colors = [];
            const alphas = [];

            function addVertex(n, j) {
                const v = gff.get(`${n},${j}`);
                positions.push(n, slope * n + j * deltaC, v.z * Z_SCALE);
                const [r, g, b, a] = gffColor(v.z);
                colors.push(r, g, b);
                alphas.push(a);
            }

            for (let n = minN; n <= maxN; n++) {
                for (let j = minJ; j <= maxJ; j++) {
                    if (gff.has(`${n},${j}`) && gff.has(`${n},${j-1}`) && gff.has(`${n+1},${j-1}`)) {
                        addVertex(n, j);
                        addVertex(n, j - 1);
                        addVertex(n + 1, j - 1);
                    }
                    if (gff.has(`${n},${j}`) && gff.has(`${n+1},${j}`) && gff.has(`${n+1},${j-1}`)) {
                        addVertex(n, j);
                        addVertex(n + 1, j);
                        addVertex(n + 1, j - 1);
                    }
                }
            }

            if (positions.length === 0) return;

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
                vertexColors: true, side: THREE.DoubleSide,
                flatShading: true, roughness: 0.5, metalness: 0.15,
                transparent: true, depthWrite: false
            });
            material.onBeforeCompile = (shader) => {
                shader.vertexShader = shader.vertexShader.replace(
                    'void main() {',
                    'attribute float alpha;\nvarying float vAlpha;\nvoid main() {\n  vAlpha = alpha;'
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    'void main() {',
                    'varying float vAlpha;\nvoid main() {'
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <dithering_fragment>',
                    '#include <dithering_fragment>\n  gl_FragColor.a *= vAlpha;'
                );
            };
            meshGroup.add(new THREE.Mesh(geometry, material));

            const edgeGeo = new THREE.EdgesGeometry(geometry, 15);
            const edgeMat = new THREE.LineBasicMaterial({ color: 0x444466, opacity: 0.15, transparent: true });
            meshGroup.add(new THREE.LineSegments(edgeGeo, edgeMat));

            drawBoundary(new Set(gff.keys()), 0);
        }

        // ---- GPU CFTP (same pattern as limit-shape-sim) ----
        async function sampleOneCFTP() {
            const useGPU = await initGPU();

            if (useGPU && gpuEngine) {
                try {
                    initCFTPWasm();
                    const bounds = getGridBounds();
                    const minGridData = getCFTPMinRawGridData(bounds);
                    const maxGridData = getCFTPMaxRawGridData(bounds);

                    if (minGridData && maxGridData) {
                        gpuEngine.initFromWasmData(minGridData, bounds.minN, bounds.maxN, bounds.minJ, bounds.maxJ);
                        const gpuCftpOk = await gpuEngine.initCFTP(minGridData, maxGridData);

                        if (gpuCftpOk) {
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
                                const blackTriangles = getBlackTriangles();
                                const dimers = gpuEngine.gridToDimers(resultGrid, blackTriangles);
                                gpuEngine.destroyCFTP();
                                console.log('[GFF] GPU CFTP completed, T=' + T + ', dimers=' + dimers.length);
                                return dimers;
                            }
                            gpuEngine.destroyCFTP();
                        }
                    }
                } catch (e) {
                    console.log('[GFF] GPU CFTP failed, falling back to WASM:', e.message);
                }
            }

            // CPU fallback
            console.log('[GFF] Using WASM CFTP');
            freeString(runCFTPWasm());
            const strPtr = exportDimersWasm();
            const jsonStr = wasm.UTF8ToString(strPtr);
            freeString(strPtr);
            const parsed = JSON.parse(jsonStr);
            return parsed.dimers || [];
        }

        // ---- Main sampling ----
        async function doSample() {
            const gen = ++sampleGeneration;
            samplingActive = true;

            showStatus('Sampling (1/2)...');

            // Get initial dimers for boundary drawing
            const dp0 = exportDimersWasm();
            const initJson = wasm.UTF8ToString(dp0);
            freeString(dp0);
            const initDimers = JSON.parse(initJson).dimers || [];
            const verts = new Set();
            for (const d of initDimers) {
                for (const [n, j] of getVertexKeys(d)) verts.add(n + ',' + j);
            }
            drawBoundary(verts, 0);
            centerCameraFlat(verts);
            if (renderer) renderer.render(scene, camera);

            // Sample 1
            const t0 = performance.now();
            const dimers1 = await sampleOneCFTP();
            const t1 = performance.now();
            console.log('[GFF] Sample 1: ' + ((t1 - t0) / 1000).toFixed(1) + 's');

            if (gen !== sampleGeneration || !meshGroup) { samplingActive = false; hideStatus(); return; }

            showStatus('Sampling (2/2)...');

            // Sample 2 (RNG state already advanced from first initCFTP seed generation)
            const dimers2 = await sampleOneCFTP();
            const t2 = performance.now();
            console.log('[GFF] Sample 2: ' + ((t2 - t1) / 1000).toFixed(1) + 's');
            console.log('[GFF] Total: ' + ((t2 - t0) / 1000).toFixed(1) + 's');

            if (gen !== sampleGeneration || !meshGroup) { samplingActive = false; hideStatus(); return; }

            // Compute GFF = (h1 - h2) / sqrt(2)
            const heights1 = computeHeights(dimers1);
            const heights2 = computeHeights(dimers2);

            const refKey = '0,0';
            const ref1 = heights1.get(refKey) || 0;
            const ref2 = heights2.get(refKey) || 0;

            const gff = new Map();
            let sum = 0, count = 0;
            for (const [key, h1] of heights1) {
                const h2 = heights2.has(key) ? heights2.get(key) : 0;
                const diff = (h1 - ref1) - (h2 - ref2);
                const g = diff / Math.sqrt(2);
                gff.set(key, { z: g, diff });
                sum += g;
                count++;
            }
            if (count > 0) {
                const mean = sum / count;
                for (const [, v] of gff) v.z -= mean;
            }

            if (!meshGroup) { samplingActive = false; hideStatus(); return; }
            buildSurfaceMesh(gff);
            centerCamera(gff);
            if (renderer) renderer.render(scene, camera);
            hideStatus();
            setTimeout(() => { samplingActive = false; }, 300);
        }

        // ---- Slide engine ----
        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('gff-simplified', {
                    steps: 2,

                    start() { startAnimation(); },
                    pause() { stopAnimation(); },

                    onStep(step) {
                        if (step === 1) {
                            // Start sampling on first arrow press
                            doSample();
                        }
                        if (step === 2) {
                            // Animate to top-down view
                            animateCamera(
                                { x: 50.1, y: 28.8, z: 139.1 },
                                { x: 50.1, y: 28.8, z: -2.9 },
                                0.19,
                                500
                            );
                        }
                    },

                    onStepBack(step) {
                        if (step === 1) {
                            // Animate back to 3/4 view
                            animateCamera(
                                { x: 11.1, y: -54.6, z: 110.7 },
                                { x: 49.1, y: 21.6, z: -2.9 },
                                0.20,
                                500
                            );
                        }
                    },

                    onSlideEnter() {
                        initThreeJS();
                        setTimeout(() => {
                            resize();
                            // Draw boundary polygon outline
                            const dp0 = exportDimersWasm();
                            const initJson = wasm.UTF8ToString(dp0);
                            freeString(dp0);
                            const initDimers = JSON.parse(initJson).dimers || [];
                            const verts = new Set();
                            for (const d of initDimers) {
                                for (const [n, j] of getVertexKeys(d)) verts.add(n + ',' + j);
                            }
                            drawBoundary(verts, 0);
                            centerCameraFlat(verts);
                            if (renderer) renderer.render(scene, camera);
                        }, 100);
                    },

                    onSlideLeave() {
                        sampleGeneration++;
                        samplingActive = false;
                        if (cameraAnimId) { cancelAnimationFrame(cameraAnimId); cameraAnimId = null; }
                        stopAnimation();
                        disposeThreeJS();
                    },

                    reset() {
                        if (cameraAnimId) { cancelAnimationFrame(cameraAnimId); cameraAnimId = null; }
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
    initGFFFluctuationsSim();
} else {
    window.addEventListener('wasm-loaded', initGFFFluctuationsSim, { once: true });
}
