/**
 * Algebraic Sampling Slide — Layer-by-layer waterfall construction
 * Shows the S→S+1 Markov chain building a 3D lozenge tiling one layer at a time.
 * Uses the waterfall WASM (Mode 7, imaginary q-Racah) from 2025-06-08-q-vol-3d.js.
 *
 * Slide ID: 'algebraic-sampling'
 */

(function initAlgebraicSamplingSim() {
    if (!window.slideEngine) {
        setTimeout(initAlgebraicSamplingSim, 50);
        return;
    }

    const canvas = document.getElementById('as-canvas');
    const layerCountEl = document.getElementById('as-layer-count');
    const layerTotalEl = document.getElementById('as-layer-total');
    const transferEl = document.getElementById('as-transfer');
    const resultEl = document.getElementById('as-result');
    if (!canvas) return;

    // ===================================================================
    // Parameters
    // ===================================================================

    const AS_N = 120, AS_T = 240, AS_S_TARGET = 80;
    const AS_KAPPA = 3.0, AS_Q = 0.8;
    const STEP_DELAY = 150; // ms between rendered layers
    if (layerTotalEl) layerTotalEl.textContent = AS_S_TARGET;

    // ===================================================================
    // WASM interface (shared global Module from 2025-06-08-q-vol-3d.js)
    // ===================================================================

    const wasmIface = {
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
                    return JSON.parse(jsonStr).paths;
                }
            } catch (e) { console.error('algebraic-sampling: exportPaths failed:', e); }
            return [];
        }
    };

    function tryInitWasm() {
        if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function' && Module.calledRun) {
            wasmIface.init();
        }
    }
    tryInitWasm();
    if (!wasmIface.ready) {
        window.addEventListener('wasm-loaded', tryInitWasm, { once: true });
    }

    // ===================================================================
    // Three.js state
    // ===================================================================

    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let renderLoopId = null;

    const colors = {
        gray1: '#E57200',  // Orange
        gray2: '#232D4B',  // Blue
        gray3: '#F9DCBF',  // Cream
        border: '#333333'
    };

    const initialCam = { pos: {x: 280, y: 20, z: 140}, target: {x: 80, y: 40, z: 55} };

    function initThreeJS() {
        if (renderer) return;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = true;
        controls.enableZoom = true;

        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);
        const directional = new THREE.DirectionalLight(0xffffff, 0.6);
        directional.position.set(10, 10, 15);
        scene.add(directional);
        const fill = new THREE.DirectionalLight(0xffffff, 0.25);
        fill.position.set(-10, -5, -10);
        scene.add(fill);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        camera.position.set(initialCam.pos.x, initialCam.pos.y, initialCam.pos.z);
        camera.up.set(0, 0, 1);
        controls.target.set(initialCam.target.x, initialCam.target.y, initialCam.target.z);
        controls.update();

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    }

    function disposeThreeJS() {
        stopRenderLoop();
        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }
        }
        if (renderer) renderer.dispose();
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

    function clearMesh() {
        if (!meshGroup) return;
        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }
    }

    // ===================================================================
    // Path → 3D geometry (from q-volume-visual waterfall)
    // ===================================================================

    function pathsTo3D(paths, N, T, S) {
        if (!meshGroup) return;
        clearMesh();
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
                    color = colors.gray2;
                } else if (topPath[i+1][0] === topPath[i][0] && topPath[i+1][1] > topPath[i][1]) {
                    color = colors.gray1;
                } else {
                    color = colors.gray3;
                }
                addSquareFace(topPath[i], topPath[i+1], bottomPath[i+1], bottomPath[i], color);
            }
        }

        // Horizontal lozenges
        placeAllHorizontalLozenges(pathTriplets, addSquareFace, N, T, S);

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
        meshGroup.add(mesh);

        const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: colors.border, linewidth: 1, opacity: 0.4, transparent: true
        });
        meshGroup.add(new THREE.LineSegments(edgesGeometry, edgesMaterial));
    }

    // Q-function helpers for horizontal lozenges (from q-volume-visual)

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
            const [x, y, z] = path[i];
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
                const upperVal = upperQ[b] || 0;
                const lowerVal = lowerQ[b] || 0;
                if (upperVal > a && a >= lowerVal) matrix[a][b] = 1;
            }
        }
        return matrix;
    }

    function placeAllHorizontalLozenges(pathTriplets, addSquareFace, N, T, S) {
        function addLayer(upperPath, lowerPath, zLevel) {
            const hMatrix = calculateHorizontalLozengeMatrix(upperPath, lowerPath, S, T);
            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T - S; b++) {
                    if (a < hMatrix.length && b < hMatrix[a].length && hMatrix[a][b] === 1) {
                        addSquareFace([a, b, zLevel], [a+1, b, zLevel], [a+1, b+1, zLevel], [a, b+1, zLevel], colors.gray3);
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

    // ===================================================================
    // Layer-by-layer animation
    // ===================================================================

    let generation = 0;
    let currentS = 0;
    let animating = false;
    let animTimeoutId = null;

    async function runLayerAnimation(gen) {
        if (!wasmIface.ready) {
            tryInitWasm();
            if (!wasmIface.ready) return;
        }

        animating = true;

        try {
            wasmIface.setImaginaryQ(AS_Q);
            const kappasq = AS_KAPPA * AS_KAPPA;
            const ptr = await wasmIface.initializeTiling(AS_N, AS_T, 0, 7, -kappasq);
            if (gen !== generation) return;
            if (ptr) {
                const jsonStr = Module.UTF8ToString(ptr);
                wasmIface.freeString(ptr);
                currentS = JSON.parse(jsonStr).s || 0;
            } else {
                currentS = 0;
            }

            if (layerCountEl) layerCountEl.textContent = currentS;

            // Step through layers one at a time
            while (currentS < AS_S_TARGET && animating && gen === generation) {
                wasmIface.setImaginaryQ(AS_Q);
                const sPtr = await wasmIface.performSOperator();
                if (gen !== generation) return;

                if (sPtr) {
                    const jsonStr = Module.UTF8ToString(sPtr);
                    wasmIface.freeString(sPtr);
                    currentS = JSON.parse(jsonStr).s;
                } else {
                    break;
                }

                // Render current state
                const paths = await wasmIface.refreshPaths();
                if (gen !== generation || !meshGroup) return;

                pathsTo3D(paths, AS_N, AS_T, currentS);
                if (layerCountEl) layerCountEl.textContent = currentS;

                // Wait between steps
                await new Promise(r => { animTimeoutId = setTimeout(r, STEP_DELAY); });
                if (gen !== generation) return;
            }
        } catch (e) {
            console.error('algebraic-sampling: animation failed:', e);
        }

        animating = false;
    }

    // ===================================================================
    // Step handling (fragments)
    // ===================================================================

    let currentStep = 0;

    function onStep(step) {
        currentStep = step;
        if (step === 1 && transferEl) transferEl.style.opacity = '1';
        if (step === 2 && resultEl) resultEl.style.opacity = '1';
    }

    function onStepBack(step) {
        currentStep = step;
        if (step < 2 && resultEl) resultEl.style.opacity = '0';
        if (step < 1 && transferEl) transferEl.style.opacity = '0';
    }

    function resetAll() {
        generation++;
        animating = false;
        if (animTimeoutId) { clearTimeout(animTimeoutId); animTimeoutId = null; }
        currentS = 0;
        currentStep = 0;
        if (layerCountEl) layerCountEl.textContent = '0';
        if (transferEl) transferEl.style.opacity = '0';
        if (resultEl) resultEl.style.opacity = '0';
    }

    // ===================================================================
    // Slide engine registration
    // ===================================================================

    window.slideEngine.registerSimulation('algebraic-sampling', {
        steps: 2,
        onStep,
        onStepBack,

        start() {
            if (renderer) startRenderLoop();
        },

        pause() {
            stopRenderLoop();
        },

        onSlideEnter() {
            resetAll();
            initThreeJS();
            startRenderLoop();
            const gen = generation;
            setTimeout(() => {
                if (gen === generation) runLayerAnimation(gen);
            }, 200);
        },

        onSlideLeave() {
            resetAll();
            disposeThreeJS();
        }
    }, 0);
})();
