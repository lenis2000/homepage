/**
 * Energy Slide 3D Tiling Visualization
 * Shows stepped surfaces with varying slopes (A, B) parameters
 */

(async function() {
    'use strict';

    const canvas = document.getElementById('energy-tiling-canvas');
    if (!canvas) return;

    // ===== THREE.JS (LAZY LOADED) =====
    let scene = null;
    let camera = null;
    let renderer = null;
    let controls = null;
    let meshGroup = null;
    const frustumSize = 35;  // Smaller = more zoom

    function initThreeJS() {
        if (renderer) return;  // Already initialized

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);  // Dark background like limit-shape

        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;
        const aspect = w / h;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, 0.1, 1000
        );
        // Y is up (Three.js default) - coordinates transformed to match
        camera.position.set(50, 50, 40);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableRotate = true;
        controls.enablePan = true;
        controls.enableZoom = true;
        // Lock polar angle - only allow horizontal rotation around Y axis
        const fixedPolarAngle = Math.PI / 3;  // 60 degrees from vertical (nice viewing angle)
        controls.minPolarAngle = fixedPolarAngle;
        controls.maxPolarAngle = fixedPolarAngle;
        controls.addEventListener('change', () => {
            if (renderer) renderer.render(scene, camera);
        });

        // Lighting (same as limit-shape)
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        const hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);
        const directional = new THREE.DirectionalLight(0xffffff, 1.2);
        directional.position.set(15, 20, 5);
        scene.add(directional);
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-10, 5, -5);
        scene.add(fill);
        // Warm orange-tinted lights for rotation
        const warmLight1 = new THREE.DirectionalLight(0xffaa66, 0.7);
        warmLight1.position.set(-30, 10, 30);
        scene.add(warmLight1);
        const warmLight2 = new THREE.DirectionalLight(0xffcc88, 0.6);
        warmLight2.position.set(-30, 10, -30);
        scene.add(warmLight2);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        renderer.render(scene, camera);
    }

    function disposeThreeJS() {
        if (!renderer) return;

        // Dispose meshes
        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }
        }

        // Release WebGL context
        if (controls) controls.dispose();
        renderer.dispose();
        renderer = null;
        scene = null;
        camera = null;
        controls = null;
        meshGroup = null;
    }

    // Wait for LozengeModule
    while (typeof LozengeModule === 'undefined') {
        await new Promise(r => setTimeout(r, 50));
    }
    const wasm = await LozengeModule();

    const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
    const runCFTP = wasm.cwrap('runCFTP', 'number', []);
    const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
    const freeString = wasm.cwrap('freeString', null, ['number']);
    const repairRegionWasm = wasm.cwrap('repairRegion', 'number', []);
    const initCFTPWasm = wasm.cwrap('initCFTP', 'number', []);
    const getGridBoundsWasm = wasm.cwrap('getGridBounds', 'number', []);
    const getCFTPMinGridDataWasm = wasm.cwrap('getCFTPMinGridData', 'number', []);
    const getCFTPMaxGridDataWasm = wasm.cwrap('getCFTPMaxGridData', 'number', []);
    const getBlackTrianglesWasm = wasm.cwrap('getBlackTriangles', 'number', []);

    // GPU engine
    let gpuEngine = null;
    let gpuAvailable = false;

    async function initGPU() {
        if (gpuEngine) return gpuAvailable;
        if (typeof WebGPULozengeEngine === 'undefined') return false;
        try {
            gpuEngine = new WebGPULozengeEngine();
            await gpuEngine.init();
            gpuAvailable = true;
            return true;
        } catch (e) {
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
        const ptr = getBlackTrianglesWasm();
        const jsonStr = wasm.UTF8ToString(ptr);
        freeString(ptr);
        return JSON.parse(jsonStr);
    }

    const N = 50;
    const colors = ['#E57200', '#232D4B', '#F9DCBF']; // UVA colors
    let initialSampleDone = false;

    // Generate stepped path on cylinder (same as 3D viz)
    function generateSteppedPath(A, B) {
        const path = [];
        function addPoint(x, y, h, prevH) {
            if (path.length > 0 && h !== prevH) {
                const lastPt = path[path.length - 1];
                if (h > prevH) {
                    for (let hh = prevH + 1; hh <= h; hh++) {
                        path.push({ x: lastPt.x, y: lastPt.y, z: hh });
                    }
                } else {
                    for (let hh = prevH - 1; hh >= h; hh--) {
                        path.push({ x: lastPt.x, y: lastPt.y, z: hh });
                    }
                }
            }
            path.push({ x, y, z: h });
            return h;
        }

        let prevH = Math.round(A * 0 + B * 0);
        path.push({ x: 0, y: 0, z: prevH });

        for (let x = 1; x <= N; x++) {
            prevH = addPoint(x, 0, Math.round(A * x + B * 0), prevH);
        }
        for (let y = 1; y <= N; y++) {
            prevH = addPoint(N, y, Math.round(A * N + B * y), prevH);
        }
        for (let x = N - 1; x >= 0; x--) {
            prevH = addPoint(x, N, Math.round(A * x + B * N), prevH);
        }
        for (let y = N - 1; y >= 1; y--) {
            prevH = addPoint(0, y, Math.round(A * 0 + B * y), prevH);
        }
        const h0 = Math.round(A * 0 + B * 0);
        if (h0 !== prevH) {
            addPoint(0, 0, h0, prevH);
        }
        return path;
    }

    // Project to x+y+z=0 plane: (x,y,z) -> (x-t, y-t, z-t) where t=(x+y+z)/3
    function projectToLattice(path) {
        return path.map(p => {
            const t = (p.x + p.y + p.z) / 3;
            return { x: p.x - t, y: p.y - t, z: p.z - t };
        });
    }

    // Convert projected 3D coords to 2D triangular lattice coords
    // On x+y+z=0 plane, we use (u,v) where u = x-z, v = y-z (or similar)
    function to2DLattice(p3d) {
        // Standard projection: u = x - z, v = y - z
        return { u: p3d.x - p3d.z, v: p3d.y - p3d.z };
    }

    // Point-in-polygon test (ray casting)
    function pointInPolygon(px, py, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].u, yi = polygon[i].v;
            const xj = polygon[j].u, yj = polygon[j].v;
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    // Generate triangles inside the projected boundary
    function generateTriangles(A, B) {
        const steppedPath = generateSteppedPath(A, B);
        const projected3D = projectToLattice(steppedPath);
        const polygon2D = projected3D.map(to2DLattice);

        // Get bounding box
        const uVals = polygon2D.map(p => p.u);
        const vVals = polygon2D.map(p => p.v);
        const minU = Math.floor(Math.min(...uVals)) - 2;
        const maxU = Math.ceil(Math.max(...uVals)) + 2;
        const minV = Math.floor(Math.min(...vVals)) - 2;
        const maxV = Math.ceil(Math.max(...vVals)) + 2;

        const triangles = [];

        // For each lattice cell (n, j), check black and white triangles
        // Black (right-pointing) centroid: (n + 2/3, j + 1/3) in (u,v) coords
        // White (left-pointing) centroid: (n + 1/3, j + 2/3)
        for (let n = minU; n <= maxU; n++) {
            for (let j = minV; j <= maxV; j++) {
                // Black triangle centroid
                const blackU = n + 2/3, blackV = j + 1/3;
                if (pointInPolygon(blackU, blackV, polygon2D)) {
                    triangles.push(n, j, 1);
                }
                // White triangle centroid
                const whiteU = n + 1/3, whiteV = j + 2/3;
                if (pointInPolygon(whiteU, whiteV, polygon2D)) {
                    triangles.push(n, j, 2);
                }
            }
        }

        return triangles;
    }

    // ========================================================================
    // HEIGHT FUNCTION COMPUTATION (from ultimate-lozenge.md)
    // ========================================================================
    function computeHeightFunction(dimers) {
        // Vertex keys for each dimer type
        const getVertexKeys = (dimer) => {
            const { bn, bj, t } = dimer;
            if (t === 0) {
                return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            } else if (t === 1) {
                return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            } else {
                return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
            }
        };

        // Height patterns (relative z-heights of the 4 vertices)
        const getHeightPattern = (t) => {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        };

        // Build Vertex-to-Dimer Map
        const vertexToDimers = new Map();
        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            for (const [n, j] of verts) {
                const key = `${n},${j}`;
                if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                vertexToDimers.get(key).push(dimer);
            }
        }

        // BFS to calculate Height Function h(n,j)
        const heights = new Map();
        if (dimers.length > 0) {
            const firstDimer = dimers[0];
            const firstVerts = getVertexKeys(firstDimer);
            const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
            heights.set(startKey, 0);

            const queue = [startKey];
            const visited = new Set();

            while (queue.length > 0) {
                const currentKey = queue.shift();
                if (visited.has(currentKey)) continue;
                visited.add(currentKey);

                const currentH = heights.get(currentKey);
                const [cn, cj] = currentKey.split(',').map(Number);

                for (const dimer of vertexToDimers.get(currentKey) || []) {
                    const verts = getVertexKeys(dimer);
                    const pattern = getHeightPattern(dimer.t);

                    // Find index of current vertex in this dimer
                    let myIdx = -1;
                    for (let i = 0; i < 4; i++) {
                        if (verts[i][0] === cn && verts[i][1] === cj) {
                            myIdx = i;
                            break;
                        }
                    }

                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const [vn, vj] = verts[i];
                            const vkey = `${vn},${vj}`;
                            if (!heights.has(vkey)) {
                                const newH = currentH + (pattern[i] - pattern[myIdx]);
                                heights.set(vkey, newH);
                                queue.push(vkey);
                            }
                        }
                    }
                }
            }
        }

        return heights;
    }

    // Draw lozenges as 3D stepped surface
    function drawFromDimers(dimers, triangleArr, resetCamera = true) {
        if (!meshGroup) return;

        // Clear previous meshes
        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }

        if (!dimers || dimers.length === 0) {
            if (renderer) renderer.render(scene, camera);
            return;
        }

        // Vertex keys for each dimer type
        const getVertexKeys = (dimer) => {
            const { bn, bj, t } = dimer;
            if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            else if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            else return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
        };

        // Compute height function
        const heights = computeHeightFunction(dimers);

        // 3D Coordinate Transformation (from ultimate-lozenge.md, with Y as vertical)
        // Maps abstract lattice (n, j, h) to Cartesian (x, y, z)
        // Swapped y/z so Y is vertical (Three.js convention for OrbitControls)
        const to3D = (n, j, h) => ({ x: h, y: j - h, z: -n - h });

        // White lozenges like limit-shape
        const lozengeColors = ['#FFFFFF', '#FFFFFF', '#FFFFFF'];

        // Build single geometry with all quads
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const normals = [];
        const vertexColors = [];
        const indices = [];

        const addQuad = (v1, v2, v3, v4, color) => {
            const baseIndex = vertices.length / 3;
            vertices.push(v1.x, v1.y, v1.z);
            vertices.push(v2.x, v2.y, v2.z);
            vertices.push(v3.x, v3.y, v3.z);
            vertices.push(v4.x, v4.y, v4.z);

            // Compute flat normal
            const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
            const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z };
            const nx = edge1.y * edge2.z - edge1.z * edge2.y;
            const ny = edge1.z * edge2.x - edge1.x * edge2.z;
            const nz = edge1.x * edge2.y - edge1.y * edge2.x;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

            for (let i = 0; i < 4; i++) {
                normals.push(nx / len, ny / len, nz / len);
            }

            const c = new THREE.Color(color);
            for (let i = 0; i < 4; i++) {
                vertexColors.push(c.r, c.g, c.b);
            }

            indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
        };

        // Generate geometry for each dimer
        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            const v3d = verts.map(([n, j]) => {
                const h = heights.get(`${n},${j}`) || 0;
                return to3D(n, j, h);
            });
            addQuad(v3d[0], v3d[1], v3d[2], v3d[3], lozengeColors[dimer.t]);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();

        // Create mesh with vertex colors (same material as limit-shape)
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            flatShading: true,
            roughness: 0.3,
            metalness: 0.35,
            color: 0xddeeff  // Subtle blue tint
        });
        const mesh = new THREE.Mesh(geometry, material);
        meshGroup.add(mesh);

        // Add edge lines (subtle for dark background)
        const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: 0x444466,
            linewidth: 1,
            opacity: 0.6,
            transparent: true
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        meshGroup.add(edges);

        // Update camera to follow geometry
        if (geometry.boundingSphere) {
            const center = geometry.boundingSphere.center;
            const radius = geometry.boundingSphere.radius;

            if (resetCamera) {
                // Full reset: position camera at default angle
                controls.target.copy(center);
                camera.position.set(center.x + radius, center.y + radius * 0.8, center.z + radius);
                camera.lookAt(center);
            } else {
                // Preserve angle: move camera relative to new center
                const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
                controls.target.copy(center);
                camera.position.copy(center).add(offset);
            }
            controls.update();
        }

        renderer.render(scene, camera);
    }

    // Sample function
    async function sample(A, B, resetCamera = true) {
        const triangles = generateTriangles(A, B);

        // Pass to WASM
        const dataPtr = wasm._malloc(triangles.length * 4);
        for (let i = 0; i < triangles.length; i++) {
            wasm.setValue(dataPtr + i * 4, triangles[i], 'i32');
        }
        const initPtr = initFromTriangles(dataPtr, triangles.length);
        const initResult = wasm.UTF8ToString(initPtr);
        freeString(initPtr);
        wasm._free(dataPtr);

        // Parse init result to check if valid
        const initParsed = JSON.parse(initResult);

        // If invalid (flow < count or black ≠ white), repair the region
        if (initParsed.status === 'invalid') {
            const repairPtr = repairRegionWasm();
            const repairResult = wasm.UTF8ToString(repairPtr);
            freeString(repairPtr);

            // Check if repair succeeded
            const repairParsed = JSON.parse(repairResult);
            if (repairParsed.status === 'invalid') {
                return;
            }
        }

        // Try GPU CFTP first, fall back to CPU
        let dimers = [];
        const useGPU = await initGPU();

        if (useGPU && gpuEngine) {
            try {
                // Initialize CFTP on WASM side to create extremal states
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
                            dimers = gpuEngine.gridToDimers(resultGrid, blackTriangles);
                            gpuEngine.destroyCFTP();
                        } else {
                            gpuEngine.destroyCFTP();
                            throw new Error('GPU CFTP did not coalesce');
                        }
                    } else {
                        throw new Error('GPU CFTP init failed');
                    }
                } else {
                    throw new Error('Could not get grid data');
                }
            } catch (e) {
                // Fall through to CPU
                dimers = [];
            }
        }

        // CPU fallback
        if (dimers.length === 0) {
            const cftpPtr = runCFTP();
            const cftpResult = wasm.UTF8ToString(cftpPtr);
            freeString(cftpPtr);

            const dimersPtr = exportDimersWasm();
            const dimersJson = wasm.UTF8ToString(dimersPtr);
            freeString(dimersPtr);

            const parsed = JSON.parse(dimersJson);
            dimers = parsed.dimers || [];
        }

        drawFromDimers(dimers, triangles, resetCamera);
    }

    // Wire up Sample button
    const btn = document.getElementById('energy-sample');
    const inputA = document.getElementById('gradient-a');
    const inputB = document.getElementById('gradient-b');

    if (btn && inputA && inputB) {
        btn.addEventListener('click', () => {
            if (!renderer) return;
            sample(parseFloat(inputA.value), parseFloat(inputB.value));
        });
    }

    // Auto-rotation
    let autoRotateId = null;
    function startAutoRotate() {
        if (autoRotateId) return;
        const rotateSpeed = 0.0075;
        function rotate() {
            if (!controls || !renderer) return;
            const x = camera.position.x - controls.target.x;
            const z = camera.position.z - controls.target.z;
            const cos = Math.cos(rotateSpeed);
            const sin = Math.sin(rotateSpeed);
            camera.position.x = controls.target.x + x * cos - z * sin;
            camera.position.z = controls.target.z + x * sin + z * cos;
            camera.lookAt(controls.target);
            renderer.render(scene, camera);
            autoRotateId = requestAnimationFrame(rotate);
        }
        rotate();
    }

    function stopAutoRotate() {
        if (autoRotateId) {
            cancelAnimationFrame(autoRotateId);
            autoRotateId = null;
        }
    }

    // Register with slide engine for lazy WebGL loading
    function waitForSlideEngine() {
        if (typeof window.slideEngine !== 'undefined') {
            // Presets for stepping through (preset 0 is pre-sampled on slide enter)
            const presets = [
                { A: -2, B: 0.3 },
                { A: -0.05, B: 0.4 },
                { A: -0.2, B: 0.3 },
                { A: -0.2, B: 0 },
                { A: 0, B: 0 }
            ];
            let currentPreset = 0;

            function applyPreset(idx, resetCamera = true) {
                if (idx < 0 || idx >= presets.length) return;
                currentPreset = idx;
                const { A, B } = presets[idx];
                document.getElementById('gradient-a').value = A;
                document.getElementById('gradient-b').value = B;
                sample(A, B, resetCamera);
            }

            window.slideEngine.registerSimulation('energy', {
                start() { startAutoRotate(); },
                pause() { stopAutoRotate(); },
                steps: presets.length - 1,  // 3 steps (presets 1, 2, 3)
                onStep(step) {
                    // step 1 -> preset 1, step 2 -> preset 2, step 3 -> preset 3
                    if (step >= 1 && step < presets.length) {
                        applyPreset(step, false);  // Don't reset camera angle
                    }
                },
                onStepBack(step) {
                    // step 0 -> preset 0, step 1 -> preset 1, step 2 -> preset 2
                    if (step >= 0 && step < presets.length) {
                        applyPreset(step, false);  // Don't reset camera angle
                    }
                },
                onSlideEnter() {
                    // Wait for Three.js then initialize
                    const initWhenReady = () => {
                        if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
                            initThreeJS();
                            if (!initialSampleDone) {
                                applyPreset(0);  // Pre-sample with first preset
                                initialSampleDone = true;
                            } else if (renderer) {
                                renderer.render(scene, camera);
                            }
                            startAutoRotate();
                        } else {
                            setTimeout(initWhenReady, 50);
                        }
                    };
                    initWhenReady();
                },
                onSlideLeave() {
                    stopAutoRotate();
                    disposeThreeJS();
                    initialSampleDone = false;  // Reset so re-entering slide will resample
                }
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
})();
