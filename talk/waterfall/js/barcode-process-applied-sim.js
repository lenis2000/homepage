/**
 * Barcode Process Applied slide
 * Three 3D simulations sharing one WASM sample:
 *   1. Vertical-slice style (diagonal slice plane, q far from 1)
 *   2. Spectral-transversal style (horizontal slice plane)
 *   3. Why-2-periodic style (full tiling, camera buttons)
 */
(function() {
    'use strict';

    const slideId = 'barcode-process-applied';

    // Parameters
    const N_param = 80;
    const T_param = 160;
    const S_target = 80;
    const Q_VALUE = 0.3;
    const KAPPA = 3.0;

    // UVA Colors
    const colors = {
        orange: '#E57200',
        blue: '#232D4B',
        cream: '#F9DCBF',
        border: '#333333',
        slicePlane: '#E57200'
    };

    // Shared state
    let sampledPaths = null;
    let sampledS = 0;
    let sampled = false;
    let sampling = false;

    // Three views
    const views = [null, null, null];
    let renderLoopId = null;
    let cameraAnimationId = null;
    let buttonsInitialized = false;

    // Camera configs per view
    const viewConfigs = [
        // View 0: vertical-slice style
        { canvasId: 'bpa-canvas-vs', pos: {x: 165.8, y: 26.1, z: 106.0}, target: {x: 73.8, y: 40.0, z: 48.1} },
        // View 1: spectral-transversal style
        { canvasId: 'bpa-canvas-st', pos: {x: 140, y: 80, z: 140}, target: {x: 40, y: 40, z: 40} },
        // View 2: why-2-periodic style
        { canvasId: 'bpa-canvas-w2p', pos: {x: 120, y: -40, z: 130}, target: {x: 40, y: 40, z: 40} }
    ];

    // Camera positions for view 2 buttons
    const cam2Pos1 = { pos: {x: 120, y: -40, z: 130}, target: {x: 40, y: 40, z: 40} };
    const cam2Pos2 = { pos: {x: 80, y: 0, z: 110}, target: {x: 40, y: 40, z: 40} };

    // ===== VIEW FACTORY =====
    function createView(idx) {
        const cfg = viewConfigs[idx];
        const canvas = document.getElementById(cfg.canvasId);
        if (!canvas) return null;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
        camera.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z);
        camera.up.set(0, 0, 1);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.target.set(cfg.target.x, cfg.target.y, cfg.target.z);
        controls.update();

        // Lighting
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

        const meshGroup = new THREE.Group();
        scene.add(meshGroup);

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }

        return { canvas, scene, renderer, camera, controls, meshGroup, slicePlane: null };
    }

    function disposeView(idx) {
        const v = views[idx];
        if (!v || !v.renderer) return;
        if (v.meshGroup) {
            while (v.meshGroup.children.length > 0) {
                const child = v.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                v.meshGroup.remove(child);
            }
        }
        if (v.slicePlane) {
            if (v.slicePlane.geometry) v.slicePlane.geometry.dispose();
            if (v.slicePlane.material) v.slicePlane.material.dispose();
            v.scene.remove(v.slicePlane);
            v.slicePlane = null;
        }
        v.renderer.dispose();
        views[idx] = null;
    }

    function disposeAllViews() {
        stopRenderLoop();
        for (let i = 0; i < 3; i++) disposeView(i);
    }

    // ===== RENDER LOOP =====
    function startRenderLoop() {
        if (renderLoopId) return;
        function loop() {
            let anyActive = false;
            for (let i = 0; i < 3; i++) {
                const v = views[i];
                if (v && v.renderer && v.camera && v.controls) {
                    v.controls.update();
                    v.renderer.render(v.scene, v.camera);
                    anyActive = true;
                }
            }
            if (anyActive) {
                renderLoopId = requestAnimationFrame(loop);
            }
        }
        loop();
    }

    function stopRenderLoop() {
        if (renderLoopId) {
            cancelAnimationFrame(renderLoopId);
            renderLoopId = null;
        }
    }

    // ===== CAMERA ANIMATION (view 2 buttons) =====
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animateCameraView2(toPos, duration) {
        if (cameraAnimationId) cancelAnimationFrame(cameraAnimationId);
        const v = views[2];
        if (!v || !v.camera || !v.controls) return;

        const startTime = performance.now();
        const startPos = { x: v.camera.position.x, y: v.camera.position.y, z: v.camera.position.z };
        const startTarget = { x: v.controls.target.x, y: v.controls.target.y, z: v.controls.target.z };

        function animate() {
            if (!v || !v.camera || !v.controls) return;
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = easeInOutCubic(t);

            v.camera.position.set(
                startPos.x + (toPos.pos.x - startPos.x) * eased,
                startPos.y + (toPos.pos.y - startPos.y) * eased,
                startPos.z + (toPos.pos.z - startPos.z) * eased
            );
            v.controls.target.set(
                startTarget.x + (toPos.target.x - startTarget.x) * eased,
                startTarget.y + (toPos.target.y - startTarget.y) * eased,
                startTarget.z + (toPos.target.z - startTarget.z) * eased
            );
            v.controls.update();

            if (t < 1) {
                cameraAnimationId = requestAnimationFrame(animate);
            } else {
                cameraAnimationId = null;
            }
        }
        animate();
    }

    function updateButtons(positionNum) {
        const btn1 = document.getElementById('bpa-btn-1');
        const btn2 = document.getElementById('bpa-btn-2');
        if (btn1) {
            btn1.style.background = positionNum === 1 ? '#E57200' : '#fff';
            btn1.style.color = positionNum === 1 ? '#fff' : '#232D4B';
            btn1.style.borderColor = positionNum === 1 ? '#E57200' : '#232D4B';
        }
        if (btn2) {
            btn2.style.background = positionNum === 2 ? '#E57200' : '#fff';
            btn2.style.color = positionNum === 2 ? '#fff' : '#232D4B';
            btn2.style.borderColor = positionNum === 2 ? '#E57200' : '#232D4B';
        }
    }

    function setupButtonHandlers() {
        if (buttonsInitialized) return;
        buttonsInitialized = true;

        const btn1 = document.getElementById('bpa-btn-1');
        const btn2 = document.getElementById('bpa-btn-2');
        const btnResample = document.getElementById('bpa-btn-resample');

        if (btn1) {
            btn1.addEventListener('click', () => {
                if (cameraAnimationId) return;
                animateCameraView2(cam2Pos1, 2000);
                updateButtons(1);
            });
        }
        if (btn2) {
            btn2.addEventListener('click', () => {
                if (cameraAnimationId) return;
                animateCameraView2(cam2Pos2, 2000);
                updateButtons(2);
            });
        }
        if (btnResample) {
            btnResample.addEventListener('click', () => {
                if (sampling) return;
                sampled = false;
                sampledPaths = null;
                sampleAndDisplay();
            });
        }
    }

    // ===== WASM INTERFACE =====
    let wasmReady = false;
    const wasmInterface = {
        ready: false,

        initialize() {
            if (typeof Module === 'undefined' || typeof Module.cwrap !== 'function') return false;
            this.initializeTiling = Module.cwrap('initializeTiling', 'number', ['number', 'number', 'number', 'number', 'number'], {async: true});
            this.performSOperator = Module.cwrap('performSOperator', 'number', [], {async: true});
            this.exportPaths = Module.cwrap('exportPaths', 'number', [], {async: true});
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
                    return JSON.parse(jsonStr).paths;
                }
            } catch (e) { console.error('Export paths failed:', e); }
            return [];
        }
    };

    function tryInitWasm() {
        if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function' && Module.calledRun) {
            if (wasmInterface.initialize()) wasmReady = true;
        }
    }
    tryInitWasm();
    if (!wasmReady) {
        window.addEventListener('wasm-loaded', tryInitWasm, { once: true });
    }

    // ===== BUILD GEOMETRY ON A VIEW =====
    function buildGeometryOnView(viewIdx, pathsData, N, T, S) {
        const v = views[viewIdx];
        if (!v || !v.meshGroup) return;

        // Clear old geometry
        while (v.meshGroup.children.length > 0) {
            const child = v.meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            v.meshGroup.remove(child);
        }
        if (v.slicePlane) {
            if (v.slicePlane.geometry) v.slicePlane.geometry.dispose();
            if (v.slicePlane.material) v.slicePlane.material.dispose();
            v.scene.remove(v.slicePlane);
            v.slicePlane = null;
        }

        if (!pathsData || pathsData.length === 0) return;

        // Convert paths to triplets
        const pathTriplets = [];
        for (let i = 0; i < pathsData.length; i++) {
            const pathCopy = pathsData[i].slice().reverse();
            const firstElement = pathCopy[0];
            const adjustedPath = pathCopy.map(x => firstElement - x);

            const triplets = [];
            let x = 0, y = 0;
            const z = pathsData.length - i;
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

            const e1 = [v2[1]-v1[1], v2[0]-v1[0], v2[2]-v1[2]];
            const e2 = [v3[1]-v1[1], v3[0]-v1[0], v3[2]-v1[2]];
            const n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
            const len = Math.sqrt(n[0]**2+n[1]**2+n[2]**2);
            if (len > 0) { n[0]/=len; n[1]/=len; n[2]/=len; }

            for (let i = 0; i < 4; i++) normals.push(n[0], n[1], n[2]);
            const c = new THREE.Color(color);
            for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
            indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
        }

        // Vertical lozenges
        for (let pi = 1; pi < pathTriplets.length; pi++) {
            const topPath = pathTriplets[pi];
            const bottomPath = topPath.map(p => [p[0], p[1], p[2]-1]);
            for (let i = 0; i < topPath.length-1; i++) {
                let color;
                if (topPath[i+1][0] > topPath[i][0] && topPath[i+1][1] === topPath[i][1]) color = colors.blue;
                else if (topPath[i+1][0] === topPath[i][0] && topPath[i+1][1] > topPath[i][1]) color = colors.orange;
                else color = colors.cream;
                addSquareFace(topPath[i], topPath[i+1], bottomPath[i+1], bottomPath[i], color);
            }
        }

        // Horizontal lozenges
        placeHorizontalLozenges(pathTriplets, addSquareFace, N, T, S);

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true,
            roughness: 0.5, metalness: 0.15
        });
        v.meshGroup.add(new THREE.Mesh(geometry, material));

        const edgesGeo = new THREE.EdgesGeometry(geometry, 10);
        const edgesMat = new THREE.LineBasicMaterial({ color: colors.border, linewidth: 1, opacity: 0.4, transparent: true });
        v.meshGroup.add(new THREE.LineSegments(edgesGeo, edgesMat));

        // Add slice planes per view
        if (viewIdx === 0) addDiagonalSlicePlane(v, S, T, N);
        if (viewIdx === 1) addHorizontalSlicePlane(v, S, T, N);
    }

    // ===== SLICE PLANES =====
    function addDiagonalSlicePlane(v, S, T, N) {
        const geometry = new THREE.BufferGeometry();
        const verts = new Float32Array([
            0, S, 0,
            T-S, 0, 0,
            T-S, 0, N,
            0, S, N
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geometry.setIndex([0,1,2, 0,2,3]);
        geometry.computeVertexNormals();

        const material = new THREE.MeshBasicMaterial({
            color: colors.slicePlane, transparent: true, opacity: 0.3, side: THREE.DoubleSide
        });
        v.slicePlane = new THREE.Mesh(geometry, material);
        v.scene.add(v.slicePlane);
    }

    function addHorizontalSlicePlane(v, S, T, N) {
        const zSlice = N / 2;
        const geometry = new THREE.BufferGeometry();
        const verts = new Float32Array([
            0, 0, zSlice,
            T-S, 0, zSlice,
            T-S, S, zSlice,
            0, S, zSlice
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geometry.setIndex([0,1,2, 0,2,3]);
        geometry.computeVertexNormals();

        const material = new THREE.MeshBasicMaterial({
            color: colors.slicePlane, transparent: true, opacity: 0.3, side: THREE.DoubleSide
        });
        v.slicePlane = new THREE.Mesh(geometry, material);
        v.scene.add(v.slicePlane);
    }

    // ===== HORIZONTAL LOZENGE HELPERS =====
    function extractLastFromIncreasing(list) {
        const result = [];
        let i = 0;
        while (i < list.length) {
            let j = i;
            while (j+1 < list.length && list[j] < list[j+1]) j++;
            result.push(list[j]);
            i = j + 1;
        }
        return result;
    }

    function calculateQFunction(path) {
        const table = [];
        for (let i = 0; i < path.length; i++) {
            const [x, y] = path[i];
            table.push(x === y ? y : x);
        }
        return extractLastFromIncreasing(table);
    }

    function calculateHorizontalLozengeMatrix(upperPath, lowerPath, S, T) {
        const matrix = Array(S+1).fill().map(() => Array(T-S+1).fill(0));
        const upperQ = calculateQFunction(upperPath);
        const lowerQ = calculateQFunction(lowerPath);
        for (let a = 0; a <= S; a++) {
            for (let b = 0; b <= T-S; b++) {
                if ((upperQ[b]||0) > a && a >= (lowerQ[b]||0)) matrix[a][b] = 1;
            }
        }
        return matrix;
    }

    function placeHorizontalLozenges(pathTriplets, addSquareFace, N, T, S) {
        function placeBetween(upper, lower, zLevel) {
            const m = calculateHorizontalLozengeMatrix(upper, lower, S, T);
            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T-S; b++) {
                    if (a < m.length && b < m[a].length && m[a][b] === 1) {
                        addSquareFace([a,b,zLevel],[a+1,b,zLevel],[a+1,b+1,zLevel],[a,b+1,zLevel], colors.cream);
                    }
                }
            }
        }

        // Top boundary
        if (pathTriplets.length > 0) {
            const topBoundary = [];
            for (let i = 0; i <= S; i++) topBoundary.push([i, 0, N]);
            for (let i = 1; i <= T-S; i++) topBoundary.push([S, i, N]);
            placeBetween(topBoundary, pathTriplets[0], N-1);
        }

        // Between consecutive paths
        for (let pi = 0; pi < pathTriplets.length-1; pi++) {
            placeBetween(pathTriplets[pi], pathTriplets[pi+1], pathTriplets[pi][0][2]-1);
        }

        // Bottom boundary
        if (pathTriplets.length > 0) {
            const bottomBoundary = [];
            for (let i = 0; i <= T-S; i++) bottomBoundary.push([0, i, 0]);
            for (let i = 1; i <= S; i++) bottomBoundary.push([i, T-S, 0]);
            placeBetween(pathTriplets[pathTriplets.length-1], bottomBoundary, 0);
        }
    }

    // ===== SAMPLING =====
    async function sampleAndDisplay() {
        if (!wasmReady || sampling) return;
        sampling = true;

        let S_local = 0;
        wasmInterface.setImaginaryQ(Q_VALUE);
        const kappasq = KAPPA * KAPPA;
        const ptr = await wasmInterface.initializeTiling(N_param, T_param, 0, 7, -kappasq);
        if (ptr) {
            const jsonStr = Module.UTF8ToString(ptr);
            wasmInterface.freeString(ptr);
            S_local = JSON.parse(jsonStr).s || 0;
        }
        let pathsResult = await wasmInterface.refreshPaths();

        while (S_local < S_target) {
            wasmInterface.setImaginaryQ(Q_VALUE);
            const sPtr = await wasmInterface.performSOperator();
            if (sPtr) {
                const jsonStr = Module.UTF8ToString(sPtr);
                wasmInterface.freeString(sPtr);
                S_local = JSON.parse(jsonStr).s;
                pathsResult = await wasmInterface.refreshPaths();
            } else break;
        }

        sampledPaths = pathsResult.map(p => [...p]);
        sampledS = S_local;
        sampled = true;
        sampling = false;

        // Build geometry on all three views
        for (let i = 0; i < 3; i++) {
            if (views[i]) {
                buildGeometryOnView(i, sampledPaths, N_param, T_param, sampledS);
            }
        }
    }

    // ===== SHOW/HIDE =====
    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }
    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    // ===== SLIDE ENGINE =====
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { startRenderLoop(); },
                pause() {
                    stopRenderLoop();
                    if (cameraAnimationId) { cancelAnimationFrame(cameraAnimationId); cameraAnimationId = null; }
                },
                reset() {
                    hideElement('bpa-sim1');
                    hideElement('bpa-sim2');
                    hideElement('bpa-sim3');
                    hideElement('bpa-text-section');
                },
                steps: 4,
                onStep(step) {
                    if (step === 1) showElement('bpa-sim1');
                    if (step === 2) showElement('bpa-sim2');
                    if (step === 3) showElement('bpa-sim3');
                    if (step === 4) showElement('bpa-text-section');
                },
                onStepBack(step) {
                    if (step < 1) hideElement('bpa-sim1');
                    if (step < 2) hideElement('bpa-sim2');
                    if (step < 3) hideElement('bpa-sim3');
                    if (step < 4) hideElement('bpa-text-section');
                },
                onSlideEnter() {
                    hideElement('bpa-sim1');
                    hideElement('bpa-sim2');
                    hideElement('bpa-sim3');
                    hideElement('bpa-text-section');

                    // Create all three views
                    for (let i = 0; i < 3; i++) views[i] = createView(i);
                    startRenderLoop();
                    setupButtonHandlers();
                    updateButtons(1);

                    // Sample once, render on all three
                    if (!sampling && !sampled) {
                        setTimeout(() => sampleAndDisplay(), 100);
                    } else if (sampled) {
                        for (let i = 0; i < 3; i++) {
                            if (views[i]) buildGeometryOnView(i, sampledPaths, N_param, T_param, sampledS);
                        }
                    }
                },
                onSlideLeave() {
                    if (cameraAnimationId) { cancelAnimationFrame(cameraAnimationId); cameraAnimationId = null; }
                    disposeAllViews();
                    sampledPaths = null;
                    sampled = false;
                }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
