/**
 * Limit Shape 3D Visualization
 * 3D stepped surface with CFTP sampling, OBJ loading, and auto-rotation
 */

(async function() {
    'use strict';

    const canvas = document.getElementById('limit-shape-3d-canvas');
    const statusEl = document.getElementById('limit-shape-3d-status');
    const panelsEl = document.getElementById('limit-shape-panels');
    const rightPanelEl = document.getElementById('limit-shape-right-panel');
    const curvedTextEl = document.getElementById('limit-shape-curved-text');
    const subtextEl = document.getElementById('limit-shape-subtext');
    const imagePanelEl = document.getElementById('limit-shape-image-panel');
    const presampledLabel = document.getElementById('limit-shape-presampled-label');
    if (!canvas) return;

    // Wait for LozengeModule
    while (typeof LozengeModule === 'undefined') {
        await new Promise(r => setTimeout(r, 50));
    }

    // Create separate WASM instance
    const wasm = await LozengeModule();
    const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
    const runCFTPWasm = wasm.cwrap('runCFTP', 'number', []);
    const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
    const freeString = wasm.cwrap('freeString', null, ['number']);
    // GPU CFTP wrappers
    const initCFTPWasm = wasm.cwrap('initCFTP', 'number', []);
    const getGridBoundsWasm = wasm.cwrap('getGridBounds', 'number', []);
    const getCFTPMinGridDataWasm = wasm.cwrap('getCFTPMinGridData', 'number', []);
    const getCFTPMaxGridDataWasm = wasm.cwrap('getCFTPMaxGridData', 'number', []);

    // WebGPU engine
    let gpuEngine = null;
    let gpuAvailable = false;

    // Initialize WebGPU engine
    async function initGPU() {
        if (gpuEngine) return gpuAvailable;
        if (typeof WebGPULozengeEngine === 'undefined') {
            console.log('WebGPULozengeEngine not available');
            return false;
        }
        try {
            gpuEngine = new WebGPULozengeEngine();
            await gpuEngine.init();
            gpuAvailable = true;
            console.log('WebGPU Lozenge Engine initialized for limit-shape');
            return true;
        } catch (e) {
            console.log('WebGPU not available:', e.message);
            gpuAvailable = false;
            return false;
        }
    }

    // Helper to get grid data from WASM
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

    // Load shape triangles
    let shapeTriangles = null;
    try {
        const resp = await fetch('/letters/shape_for_arctic_small.json');
        const data = await resp.json();
        shapeTriangles = data.triangles;
    } catch (e) {
        return;
    }

    let currentDimers = [];
    const colors = ['#FFFFFF', '#FFFFFF', '#FFFFFF'];  // White lozenges like slide 2

    // Three.js setup - LAZY LOADED to avoid WebGL context limit
    let renderer = null;
    let scene = null;
    let camera = null;
    let controls = null;
    let meshGroup = null;
    let rotationLights = [];
    const frustumSize = 52;
    let aspect = 1;

    function initThreeJS() {
        if (renderer) return; // Already initialized

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);  // Dark background like slide 2
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        aspect = canvas.clientWidth / canvas.clientHeight || 1;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2,
            -5000, 6000  // Wider near/far for large OBJ during rotation
        );

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.enablePan = true;
        controls.enableZoom = true;

        // Lighting
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

        // Extra lights for rotation (warm orange tints)
        rotationLights = [];
        const rotationLightConfigs = [
            { pos: [-30, 10, 30], color: 0xffaa66, intensity: 0.7 },   // Orange tint
            { pos: [-30, 10, -30], color: 0xffcc88, intensity: 0.6 }   // Warm tint
        ];
        for (const cfg of rotationLightConfigs) {
            const light = new THREE.DirectionalLight(cfg.color, cfg.intensity);
            light.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
            light.visible = false;
            scene.add(light);
            rotationLights.push(light);
        }

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        // Initial camera position
        camera.position.set(10.2, -110.4, -10.8);
        camera.zoom = 1.0;
        camera.updateProjectionMatrix();
        controls.target.set(-13.4, -89.2, 12.4);
        controls.update();

        resize();
    }

    function disposeThreeJS() {
        if (!renderer) return;

        stopAutoRotate();

        // Dispose meshes
        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }
        }

        // Dispose renderer (releases WebGL context)
        renderer.dispose();
        renderer = null;
        scene = null;
        camera = null;
        controls = null;
        meshGroup = null;
        rotationLights = [];
    }

    function resize() {
        if (!renderer || !camera) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        aspect = w / h;
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    // Vertex and height helpers (limit-shape)
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

    function to3D(n, j, h) {
        return { x: h, y: -n - h, z: j - h };
    }

    function buildGeometry() {
        if (!meshGroup) return;
        // Don't rebuild if OBJ is showing
        if (objLoaded) {
            console.log('buildGeometry skipped - OBJ loaded');
            return;
        }
        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }

        if (currentDimers.length === 0) return;

        // Build vertex-to-dimer map and calculate heights via BFS
        const vertexToDimers = new Map();
        for (const dimer of currentDimers) {
            for (const [n, j] of getVertexKeys(dimer)) {
                const key = `${n},${j}`;
                if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                vertexToDimers.get(key).push(dimer);
            }
        }

        const heights = new Map();
        const firstVerts = getVertexKeys(currentDimers[0]);
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

        const geometry = new THREE.BufferGeometry();
        const vertices = [], normals = [], vertexColors = [], indices = [];

        function addQuad(v1, v2, v3, v4, color) {
            const baseIndex = vertices.length / 3;
            vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);
            const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
            const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z };
            const nx = edge1.y * edge2.z - edge1.z * edge2.y;
            const ny = edge1.z * edge2.x - edge1.x * edge2.z;
            const nz = edge1.x * edge2.y - edge1.y * edge2.x;
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
            for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
            const clr = new THREE.Color(color);
            for (let i = 0; i < 4; i++) vertexColors.push(clr.r, clr.g, clr.b);
            indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
        }

        for (const dimer of currentDimers) {
            const verts = getVertexKeys(dimer);
            const v3d = verts.map(([n, j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
            addQuad(v3d[0], v3d[1], v3d[2], v3d[3], colors[dimer.t]);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);

        currentMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.3, metalness: autoRotate ? 0.35 : 0.5,
            color: 0xddeeff  // Subtle blue tint
        });
        meshGroup.add(new THREE.Mesh(geometry, currentMaterial));

        const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
        meshGroup.add(new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({ color: 0x222222, opacity: 0.4, transparent: true })));

        // Center camera on geometry
        if (controls) {
            const box = new THREE.Box3().setFromObject(meshGroup);
            const center = new THREE.Vector3();
            box.getCenter(center);
            controls.target.copy(center);
            controls.update();
        }
    }

    // Sampling functions
    function getMinimalTiling() {
        if (!shapeTriangles) { currentDimers = []; return; }

        const triArr = [];
        for (const tri of shapeTriangles) {
            triArr.push(tri.n, tri.j, tri.type);
        }

        const ptr = wasm._malloc(triArr.length * 4);
        for (let i = 0; i < triArr.length; i++) {
            wasm.setValue(ptr + i * 4, triArr[i], 'i32');
        }

        initFromTriangles(ptr, triArr.length);
        wasm._free(ptr);

        const strPtr = exportDimersWasm();
        const jsonStr = wasm.UTF8ToString(strPtr);
        freeString(strPtr);

        try {
            const parsed = JSON.parse(jsonStr);
            currentDimers = Array.isArray(parsed.dimers) ? parsed.dimers : [];
        } catch (e) {
            currentDimers = [];
        }
    }

    // Get black triangles from shape (type=1 triangles)
    function getBlackTriangles() {
        if (!shapeTriangles) return [];
        return shapeTriangles.filter(t => t.type === 1).map(t => ({ n: t.n, j: t.j }));
    }

    // GPU CFTP sampling with WASM fallback
    async function sampleCFTP() {
        if (!shapeTriangles) { currentDimers = []; return; }
        // Don't run CFTP if OBJ is showing
        if (objLoaded) {
            console.log('sampleCFTP skipped - OBJ loaded');
            return;
        }

        // Try GPU CFTP first
        const useGPU = await initGPU();
        if (useGPU && gpuEngine) {
            try {
                // Initialize CFTP on WASM side to create extremal states
                initCFTPWasm();
                const bounds = getGridBounds();

                // Get extremal states for GPU
                const minGridData = getCFTPMinRawGridData(bounds);
                const maxGridData = getCFTPMaxRawGridData(bounds);

                if (minGridData && maxGridData) {
                    // Initialize GPU engine with grid parameters
                    gpuEngine.initFromWasmData(minGridData, bounds.minN, bounds.maxN, bounds.minJ, bounds.maxJ);

                    // Initialize GPU CFTP
                    const gpuCftpOk = await gpuEngine.initCFTP(minGridData, maxGridData);
                    if (gpuCftpOk) {
                        // GPU CFTP epoch-doubling loop
                        let T = 1;
                        const maxT = 134217728; // 2^27 safety limit
                        let coalesced = false;

                        while (!coalesced && T <= maxT) {
                            gpuEngine.resetCFTPChains(minGridData, maxGridData);
                            const result = await gpuEngine.stepCFTP(T, Math.min(T, 10000));
                            coalesced = result.coalesced;
                            if (!coalesced) {
                                coalesced = await gpuEngine.checkCoalescence();
                            }
                            if (!coalesced) T *= 2;
                        }

                        if (coalesced) {
                            // Get result from GPU and convert to dimers directly
                            const resultGrid = await gpuEngine.getCFTPResult();
                            const blackTriangles = getBlackTriangles();
                            currentDimers = gpuEngine.gridToDimers(resultGrid, blackTriangles);
                            gpuEngine.destroyCFTP();
                            console.log('GPU CFTP completed, T=' + T + ', dimers=' + currentDimers.length);
                            return;
                        }
                        gpuEngine.destroyCFTP();
                    }
                }
            } catch (e) {
                console.log('GPU CFTP failed, falling back to WASM:', e.message);
            }
        }

        // Fallback to WASM CFTP
        console.log('Using WASM CFTP');
        runCFTPWasm();

        const strPtr = exportDimersWasm();
        const jsonStr = wasm.UTF8ToString(strPtr);
        freeString(strPtr);

        try {
            const parsed = JSON.parse(jsonStr);
            currentDimers = Array.isArray(parsed.dimers) ? parsed.dimers : [];
        } catch (e) {
            currentDimers = [];
        }
    }

    // OBJ Loader for pre-sampled mesh
    let objMesh = null;
    let objLoaded = false;

    async function loadPresampledOBJ() {
        if (objLoaded || !meshGroup) return;

        // Load OBJLoader dynamically if not available
        if (typeof THREE.OBJLoader === 'undefined') {
            // Use older Three.js version that has non-module OBJLoader
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js';
                script.onload = resolve;
                script.onerror = () => {
                    console.warn('OBJLoader failed to load from CDN');
                    resolve(); // Don't reject, just continue without
                };
                document.head.appendChild(script);
            });
        }

        if (typeof THREE.OBJLoader === 'undefined') {
            console.error('OBJLoader not available');
            return;
        }

        const loader = new THREE.OBJLoader();
        try {
            const obj = await new Promise((resolve, reject) => {
                loader.load('images/big_shape.obj', resolve, undefined, reject);
            });

            // Clear existing geometry
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }

            // Apply same material style as sampled mesh (no vertexColors for OBJ)
            const objMaterial = new THREE.MeshStandardMaterial({
                side: THREE.DoubleSide,
                flatShading: true,
                roughness: 0.3,
                metalness: autoRotate ? 0.35 : 0.5,
                color: 0xddeeff  // Same subtle blue tint
            });

            obj.traverse((child) => {
                if (child.isMesh) {
                    child.material = objMaterial;
                    meshGroup.add(child.clone());
                }
            });
            currentMaterial = objMaterial;

            // OBJ is 8x larger - zoom out to fit
            if (camera) {
                camera.zoom = 0.01;
                camera.updateProjectionMatrix();
            }

            objMesh = obj;
            objLoaded = true;
            if (renderer && scene && camera) renderer.render(scene, camera);
        } catch (e) {
            console.error('Failed to load OBJ:', e);
        }
    }

    let isRunning = false;
    let animationId = null;
    let autoRotate = false;
    const rotateSpeed = 0.008;
    let currentMaterial = null;
    let hasSampled = false;

    function animate() {
        if (!isRunning || !renderer || !camera || !controls) return;

        if (autoRotate) {
            // Rotate around (1,1,1) direction for natural 3D view
            const axis = new THREE.Vector3(1, 1, 1).normalize();
            const offset = camera.position.clone().sub(controls.target);
            offset.applyAxisAngle(axis, rotateSpeed);
            camera.position.copy(controls.target).add(offset);
            camera.lookAt(controls.target);
        }

        controls.update();
        renderer.render(scene, camera);
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

    function startAutoRotate() {
        autoRotate = true;
        for (const light of rotationLights) if (light) light.visible = true;
        if (currentMaterial) currentMaterial.metalness = 0.35;  // Keep some metalness for vivid look
        if (!isRunning) start();
    }

    function stopAutoRotate() {
        autoRotate = false;
        for (const light of rotationLights) if (light) light.visible = false;
        if (currentMaterial) currentMaterial.metalness = 0.5;
    }

    function clear() {
        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }
        }
        currentDimers = [];
        hasSampled = false;
        if (statusEl) statusEl.textContent = '';
        if (renderer) renderer.render(scene, camera);
    }

    // Register with slide engine
    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('limit-shape', {
                start,
                pause,
                steps: 7,
                onSlideEnter() {
                    // Lazy init WebGL to avoid context limit
                    initThreeJS();
                    if (camera && controls) {
                        camera.position.set(22.6, -118.1, 11.9);
                        camera.zoom = 1.0;
                        camera.updateProjectionMatrix();
                        controls.target.set(0.0, -48.0, 32.0);
                        controls.update();
                        // Listen for controls changes
                        controls.addEventListener('change', () => {
                            if (!isRunning && renderer) renderer.render(scene, camera);
                        });
                    }
                    stopAutoRotate();
                    hasSampled = false;
                    objLoaded = false;
                    if (presampledLabel) presampledLabel.style.opacity = '0';
                    // Show minimal tiling (shape outline) on load
                    setTimeout(() => {
                        resize();
                        getMinimalTiling();
                        buildGeometry();
                        if (renderer) renderer.render(scene, camera);
                    }, 50);
                    start();
                },
                onSlideLeave() {
                    stopAutoRotate();
                    pause();
                    // Dispose WebGL context to free resources
                    disposeThreeJS();
                    currentDimers = [];
                    hasSampled = false;
                    objLoaded = false;
                    if (statusEl) statusEl.textContent = '';
                    if (panelsEl) panelsEl.style.opacity = '0';
                    if (curvedTextEl) curvedTextEl.style.opacity = '0';
                    if (rightPanelEl) rightPanelEl.style.opacity = '0';
                    if (subtextEl) subtextEl.style.opacity = '0';
                    if (presampledLabel) presampledLabel.style.opacity = '0';
                },
                async onStep(step) {
                    if (step === 1) {
                        // Run CFTP to get random sample (async for GPU)
                        if (statusEl) statusEl.textContent = 'picking one uniformly at random...';
                        await new Promise(r => setTimeout(r, 50));
                        await sampleCFTP();
                        buildGeometry();
                        if (statusEl) statusEl.textContent = '';
                        hasSampled = true;
                        if (renderer) renderer.render(scene, camera);
                    } else if (step === 2) {
                        // Start auto-rotation
                        startAutoRotate();
                    } else if (step === 3) {
                        // Load pre-sampled OBJ and show label
                        if (statusEl) statusEl.textContent = 'loading pre-sampled...';
                        await loadPresampledOBJ();
                        if (statusEl) statusEl.textContent = '';
                        if (presampledLabel) presampledLabel.style.opacity = '1';
                    } else if (step === 4) {
                        // Show theorem panel
                        if (panelsEl) panelsEl.style.opacity = '1';
                    } else if (step === 5) {
                        // Show curved text
                        if (curvedTextEl) curvedTextEl.style.opacity = '1';
                    } else if (step === 6) {
                        // Show question in right panel with subtext
                        if (rightPanelEl) rightPanelEl.style.opacity = '1';
                        if (subtextEl) subtextEl.style.opacity = '1';
                    } else if (step === 7) {
                        // Show frozen sample image
                        if (imagePanelEl) imagePanelEl.style.opacity = '1';
                    }
                },
                onStepBack(step) {
                    // Only restore zoom and hide label when going back TO steps before OBJ (0, 1, 2)
                    if (step <= 2) {
                        if (camera && camera.zoom !== 1.0) {
                            camera.zoom = 1.0;
                            camera.updateProjectionMatrix();
                        }
                        if (presampledLabel) presampledLabel.style.opacity = '0';
                    }

                    if (step === 0) {
                        clear();
                        stopAutoRotate();
                        objLoaded = false;
                        // Rebuild minimal tiling for step 0
                        getMinimalTiling();
                        buildGeometry();
                        if (renderer && scene && camera) renderer.render(scene, camera);
                        if (panelsEl) panelsEl.style.opacity = '0';
                        if (curvedTextEl) curvedTextEl.style.opacity = '0';
                        if (rightPanelEl) rightPanelEl.style.opacity = '0';
                        if (subtextEl) subtextEl.style.opacity = '0';
                        if (imagePanelEl) imagePanelEl.style.opacity = '0';
                    } else if (step === 1) {
                        stopAutoRotate();
                        objLoaded = false;
                        // Rebuild sampled geometry
                        buildGeometry();
                        if (renderer && scene && camera) renderer.render(scene, camera);
                        if (panelsEl) panelsEl.style.opacity = '0';
                        if (curvedTextEl) curvedTextEl.style.opacity = '0';
                        if (rightPanelEl) rightPanelEl.style.opacity = '0';
                        if (subtextEl) subtextEl.style.opacity = '0';
                        if (imagePanelEl) imagePanelEl.style.opacity = '0';
                    } else if (step === 2) {
                        // Back to rotating coarse sample - rebuild coarse geometry
                        objLoaded = false;
                        buildGeometry(); // Rebuild from currentDimers
                        if (renderer && scene && camera) renderer.render(scene, camera);
                        if (panelsEl) panelsEl.style.opacity = '0';
                        if (curvedTextEl) curvedTextEl.style.opacity = '0';
                        if (rightPanelEl) rightPanelEl.style.opacity = '0';
                        if (subtextEl) subtextEl.style.opacity = '0';
                        if (imagePanelEl) imagePanelEl.style.opacity = '0';
                    } else if (step === 3) {
                        // At pre-sampled, hide panels
                        if (panelsEl) panelsEl.style.opacity = '0';
                        if (curvedTextEl) curvedTextEl.style.opacity = '0';
                        if (rightPanelEl) rightPanelEl.style.opacity = '0';
                        if (subtextEl) subtextEl.style.opacity = '0';
                        if (imagePanelEl) imagePanelEl.style.opacity = '0';
                    } else if (step === 4) {
                        // At theorem, hide curved text, question and image
                        if (curvedTextEl) curvedTextEl.style.opacity = '0';
                        if (rightPanelEl) rightPanelEl.style.opacity = '0';
                        if (subtextEl) subtextEl.style.opacity = '0';
                        if (imagePanelEl) imagePanelEl.style.opacity = '0';
                    } else if (step === 5) {
                        // At curved text, hide question and image
                        if (rightPanelEl) rightPanelEl.style.opacity = '0';
                        if (subtextEl) subtextEl.style.opacity = '0';
                        if (imagePanelEl) imagePanelEl.style.opacity = '0';
                    } else if (step === 6) {
                        // At question, hide image
                        if (imagePanelEl) imagePanelEl.style.opacity = '0';
                    }
                }
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
})();
