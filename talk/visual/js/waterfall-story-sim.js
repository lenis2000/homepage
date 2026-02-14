/**
 * Waterfall Story Slide Simulation
 * Small N=8 waterfall tiling (orthographic, thick edges) + step-based text reveals
 * Camera animates to top-down view on punchline step to reveal 2-periodic pattern
 * Adapted from why-2-periodic-sim.js and barcode-process-applied-sim.js
 */
(function() {
    'use strict';

    const slideId = 'waterfall-story';

    // Parameters (same as why-2-periodic)
    const N_param = 8;
    const T_param = 16;
    const S_target = 8;
    const Q_VALUE = 0.2;
    const KAPPA = 3.0;

    // UVA Colors
    const colors = {
        orange: '#E57200',
        blue: '#232D4B',
        cream: '#F9DCBF',
        border: '#333333'
    };

    // Three.js state
    let canvas = null;
    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let renderLoopId = null;
    let cameraAnimationId = null;
    let paths = null;
    let S_param = 0;
    let currentN = 0, currentT = 0, currentS = 0;

    // Camera positions (same as why-2-periodic: oblique and top-down)
    const cameraPos1 = { pos: {x: 19.5, y: -10.3, z: 22.0}, target: {x: 4.2, y: 3.8, z: 3.7}, zoom: 1.51 };
    const cameraPos2 = { pos: {x: 8.2, y: 1.8, z: 31.0}, target: {x: 4.1, y: 4.5, z: 3.8}, zoom: 1.51 };

    // Buttons
    const btn1 = document.getElementById('wfs-btn-1');
    const btn2 = document.getElementById('wfs-btn-2');
    let buttonsInitialized = false;

    // --- Element helpers ---

    function showEl(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideEl(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function updateButtons(posNum) {
        if (btn1) {
            btn1.style.background = posNum === 1 ? '#E57200' : '#fff';
            btn1.style.color = posNum === 1 ? '#fff' : '#232D4B';
            btn1.style.borderColor = posNum === 1 ? '#E57200' : '#232D4B';
        }
        if (btn2) {
            btn2.style.background = posNum === 2 ? '#E57200' : '#fff';
            btn2.style.color = posNum === 2 ? '#fff' : '#232D4B';
            btn2.style.borderColor = posNum === 2 ? '#E57200' : '#232D4B';
        }
    }

    function setupButtonHandlers() {
        if (buttonsInitialized) return;
        buttonsInitialized = true;
        if (btn1) {
            btn1.addEventListener('click', () => {
                if (cameraAnimationId) return;
                animateCameraTo(cameraPos1, 2000);
                updateButtons(1);
            });
        }
        if (btn2) {
            btn2.addEventListener('click', () => {
                if (cameraAnimationId) return;
                animateCameraTo(cameraPos2, 2000);
                updateButtons(2);
            });
        }
    }

    // --- WASM Interface ---

    let wasmReady = false;
    const wasmInterface = {
        ready: false,
        initialize() {
            if (typeof Module === 'undefined' || typeof Module.cwrap !== 'function') return false;
            this.initializeTiling = Module.cwrap('initializeTiling', 'number',
                ['number', 'number', 'number', 'number', 'number'], {async: true});
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
            } catch (e) { console.error('waterfall-story export paths failed:', e); }
            return [];
        }
    };

    function tryInitWasm() {
        if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function' && Module.calledRun) {
            if (wasmInterface.initialize()) wasmReady = true;
        }
    }
    tryInitWasm();
    if (!wasmReady) window.addEventListener('wasm-loaded', tryInitWasm, { once: true });

    // --- Three.js ---

    function initThreeJS() {
        if (renderer) return;
        canvas = document.getElementById('wfs-canvas');
        if (!canvas) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        const frustumSize = 20;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2,
            0.1, 1000
        );
        camera.up.set(0, 0, 1);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = true;
        controls.enableZoom = true;

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

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) renderer.setSize(w, h, false);
    }

    function disposeThreeJS() {
        if (!renderer) return;
        if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }
        }
        renderer.dispose();
        renderer = null; scene = null; camera = null; controls = null; meshGroup = null;
    }

    function startRenderLoop() {
        if (renderLoopId) return;
        function loop() {
            if (!renderer || !camera || !controls) return;
            controls.update();
            renderer.render(scene, camera);
            renderLoopId = requestAnimationFrame(loop);
        }
        loop();
    }

    function stopRenderLoop() {
        if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
    }

    // --- Path to 3D (from why-2-periodic) ---

    function pathsTo3D(pathsData, N, T, S) {
        if (!meshGroup) return;
        currentN = N; currentT = T; currentS = S;

        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }

        if (!pathsData || pathsData.length === 0) return;

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
                const prev = adjustedPath[j-1], curr = adjustedPath[j];
                if (curr === prev + 1) x++;
                else if (curr === prev) y++;
                triplets.push([x, y, z]);
            }
            pathTriplets.push(triplets);
        }

        const geometry = new THREE.BufferGeometry();
        const vertices = [], normals = [], vertexColors = [], indices = [];
        const edgeVertices = [];

        function addSquareFace(v1, v2, v3, v4, color) {
            const baseIndex = vertices.length / 3;
            const p1 = [v1[1], v1[0], v1[2]], p2 = [v2[1], v2[0], v2[2]];
            const p3 = [v3[1], v3[0], v3[2]], p4 = [v4[1], v4[0], v4[2]];
            vertices.push(...p1, ...p2, ...p3, ...p4);
            const e1 = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
            const e2 = [p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]];
            const n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
            const len = Math.sqrt(n[0]**2 + n[1]**2 + n[2]**2);
            if (len > 0) { n[0] /= len; n[1] /= len; n[2] /= len; }
            for (let i = 0; i < 4; i++) normals.push(n[0], n[1], n[2]);
            const c = new THREE.Color(color);
            for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
            indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
            edgeVertices.push(...p1, ...p2, ...p2, ...p3, ...p3, ...p4, ...p4, ...p1);
        }

        // Vertical lozenges
        for (let pi = 1; pi < pathTriplets.length; pi++) {
            const topPath = pathTriplets[pi];
            const bottomPath = topPath.map(p => [p[0], p[1], p[2] - 1]);
            for (let i = 0; i < topPath.length - 1; i++) {
                let color;
                if (topPath[i+1][0] > topPath[i][0] && topPath[i+1][1] === topPath[i][1]) color = colors.blue;
                else if (topPath[i+1][0] === topPath[i][0] && topPath[i+1][1] > topPath[i][1]) color = colors.orange;
                else color = colors.cream;
                addSquareFace(topPath[i], topPath[i+1], bottomPath[i+1], bottomPath[i], color);
            }
        }

        // Horizontal lozenges
        placeAllHorizontalLozenges(pathTriplets, addSquareFace);

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true,
            roughness: 0.5, metalness: 0.15
        });
        meshGroup.add(new THREE.Mesh(geometry, material));

        // Thick cylinder edges
        const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const edgeRadius = 0.04;
        for (let i = 0; i < edgeVertices.length; i += 6) {
            const p1 = new THREE.Vector3(edgeVertices[i], edgeVertices[i+1], edgeVertices[i+2]);
            const p2 = new THREE.Vector3(edgeVertices[i+3], edgeVertices[i+4], edgeVertices[i+5]);
            const direction = new THREE.Vector3().subVectors(p2, p1);
            const length = direction.length();
            if (length < 0.001) continue;
            const cylGeom = new THREE.CylinderGeometry(edgeRadius, edgeRadius, length, 4, 1);
            const cylinder = new THREE.Mesh(cylGeom, edgeMaterial);
            cylinder.position.copy(p1).add(p2).multiplyScalar(0.5);
            cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
            meshGroup.add(cylinder);
        }
    }

    // --- Horizontal lozenge helpers ---

    function extractLastFromIncreasing(list) {
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

    function calculateQFunction(path) {
        const table = [];
        for (let i = 0; i < path.length; i++) {
            const [x, y] = path[i];
            table.push(x === y ? y : x);
        }
        return extractLastFromIncreasing(table);
    }

    function calculateHorizontalLozengeMatrix(upperPath, lowerPath, S, T) {
        const matrix = Array(S + 1).fill().map(() => Array(T - S + 1).fill(0));
        const upperQ = calculateQFunction(upperPath);
        const lowerQ = calculateQFunction(lowerPath);
        for (let a = 0; a <= S; a++) {
            for (let b = 0; b <= T - S; b++) {
                if ((upperQ[b] || 0) > a && a >= (lowerQ[b] || 0)) matrix[a][b] = 1;
            }
        }
        return matrix;
    }

    function placeAllHorizontalLozenges(pathTriplets, addSquareFace) {
        const S = currentS, T = currentT, N = currentN;

        function placeBetween(upperPath, lowerPath, zLevel) {
            const hMatrix = calculateHorizontalLozengeMatrix(upperPath, lowerPath, S, T);
            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T - S; b++) {
                    if (a < hMatrix.length && b < hMatrix[a].length && hMatrix[a][b] === 1) {
                        addSquareFace(
                            [a, b, zLevel], [a+1, b, zLevel],
                            [a+1, b+1, zLevel], [a, b+1, zLevel], colors.cream
                        );
                    }
                }
            }
        }

        // Top boundary
        if (pathTriplets.length > 0) {
            const topBoundary = [];
            for (let i = 0; i <= S; i++) topBoundary.push([i, 0, N]);
            for (let i = 1; i <= T - S; i++) topBoundary.push([S, i, N]);
            placeBetween(topBoundary, pathTriplets[0], N - 1);
        }

        // Middle
        for (let idx = 0; idx < pathTriplets.length - 1; idx++) {
            placeBetween(pathTriplets[idx], pathTriplets[idx + 1], pathTriplets[idx][0][2] - 1);
        }

        // Bottom boundary
        if (pathTriplets.length > 0) {
            const lastPath = pathTriplets[pathTriplets.length - 1];
            const bottomBoundary = [];
            for (let i = 0; i <= T - S; i++) bottomBoundary.push([0, i, 0]);
            for (let i = 1; i <= S; i++) bottomBoundary.push([i, T - S, 0]);
            placeBetween(lastPath, bottomBoundary, 0);
        }
    }

    // --- Camera animation ---

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animateCameraTo(toPos, duration) {
        if (cameraAnimationId) cancelAnimationFrame(cameraAnimationId);
        if (!camera || !controls) return;

        const startTime = performance.now();
        const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
        const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
        const startZoom = camera.zoom;

        function animate() {
            if (!camera || !controls) return;
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = easeInOutCubic(t);

            camera.position.set(
                startPos.x + (toPos.pos.x - startPos.x) * eased,
                startPos.y + (toPos.pos.y - startPos.y) * eased,
                startPos.z + (toPos.pos.z - startPos.z) * eased
            );
            controls.target.set(
                startTarget.x + (toPos.target.x - startTarget.x) * eased,
                startTarget.y + (toPos.target.y - startTarget.y) * eased,
                startTarget.z + (toPos.target.z - startTarget.z) * eased
            );
            camera.zoom = startZoom + (toPos.zoom - startZoom) * eased;
            camera.updateProjectionMatrix();
            controls.update();

            if (t < 1) cameraAnimationId = requestAnimationFrame(animate);
            else cameraAnimationId = null;
        }
        animate();
    }

    function setCameraImmediate(pos) {
        if (!camera || !controls) return;
        camera.position.set(pos.pos.x, pos.pos.y, pos.pos.z);
        controls.target.set(pos.target.x, pos.target.y, pos.target.z);
        camera.zoom = pos.zoom;
        camera.updateProjectionMatrix();
        controls.update();
    }

    // --- Sampling ---

    async function sampleTiling() {
        if (!wasmReady) {
            tryInitWasm();
            if (!wasmReady) return;
        }

        wasmInterface.setImaginaryQ(Q_VALUE);
        const kappasq = KAPPA * KAPPA;
        const ptr = await wasmInterface.initializeTiling(N_param, T_param, 0, 7, -kappasq);
        if (ptr) {
            const jsonStr = Module.UTF8ToString(ptr);
            wasmInterface.freeString(ptr);
            S_param = JSON.parse(jsonStr).s || 0;
        }

        paths = await wasmInterface.refreshPaths();

        while (S_param < S_target) {
            wasmInterface.setImaginaryQ(Q_VALUE);
            const sPtr = await wasmInterface.performSOperator();
            if (sPtr) {
                const jsonStr = Module.UTF8ToString(sPtr);
                wasmInterface.freeString(sPtr);
                S_param = JSON.parse(jsonStr).s;
                paths = await wasmInterface.refreshPaths();
            } else break;
        }

        pathsTo3D(paths, N_param, T_param, S_param);
        if (renderer) renderer.render(scene, camera);
    }

    // --- Init / Reset ---

    function init() {
        initThreeJS();
        startRenderLoop();
        setTimeout(() => {
            if (wasmReady) {
                sampleTiling();
            } else {
                const check = setInterval(() => {
                    if (!wasmReady) tryInitWasm();
                    if (wasmReady) { clearInterval(check); sampleTiling(); }
                }, 200);
            }
        }, 100);
    }

    function reset() {
        paths = null;
        S_param = 0;
        hideEl('wfs-physics');
        hideEl('wfs-diverge');
        hideEl('wfs-punchline');
    }

    // --- Step handling ---
    // Step 1: Physics hat + formula
    // Step 2: "Does not converge!" + c-c+c-c
    // Step 3: Punchline (two limits, 2-periodic)
    // Step 4: Camera rotates to top-down view
    // Step 5: Camera returns to oblique view

    function onStep(step) {
        if (step === 1) showEl('wfs-physics');
        if (step === 2) showEl('wfs-diverge');
        if (step === 3) showEl('wfs-punchline');
        if (step === 4) {
            animateCameraTo(cameraPos2, 2000);
            updateButtons(2);
        }
        if (step === 5) {
            animateCameraTo(cameraPos1, 2000);
            updateButtons(1);
        }
    }

    function onStepBack(step) {
        if (step === 4) {
            animateCameraTo(cameraPos1, 2000);
            updateButtons(1);
        }
        if (step === 3) {
            animateCameraTo(cameraPos2, 2000);
            updateButtons(2);
        }
        if (step === 2) hideEl('wfs-punchline');
        if (step === 1) hideEl('wfs-diverge');
        if (step === 0) hideEl('wfs-physics');
    }

    // --- Registration ---

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { startRenderLoop(); },
                pause() {
                    stopRenderLoop();
                    if (cameraAnimationId) { cancelAnimationFrame(cameraAnimationId); cameraAnimationId = null; }
                },
                steps: 5,
                onStep,
                onStepBack,
                onSlideEnter() {
                    reset();
                    init();
                    setCameraImmediate(cameraPos1);
                    updateButtons(1);
                    setupButtonHandlers();
                },
                onSlideLeave() {
                    if (cameraAnimationId) { cancelAnimationFrame(cameraAnimationId); cameraAnimationId = null; }
                    disposeThreeJS();
                }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
