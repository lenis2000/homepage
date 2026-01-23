/**
 * Summary slide - 3D waterfall growth animation
 * Same as dimensional-collapse but for summary slide
 */

(function initSummarySim() {
    if (!window.slideEngine) {
        setTimeout(initSummarySim, 50);
        return;
    }

    const canvas = document.getElementById('summary-canvas');
    if (!canvas) {
        return;
    }

    // Parameters
    const N_param = 80;
    const T_param = 160;
    const S_target = 80;
    const Q_VALUE = 0.8;
    const KAPPA = 3.0;

    // Animation: 80 steps, show every 5, total 4s = 250ms per visible step
    const STEP_INCREMENT = 5;
    const STEP_DELAY = 250;

    // Camera animation positions
    const CAMERA_START = {
        pos: { x: 85.6, y: -104.4, z: 167.3 },
        target: { x: 28.2, y: 48.6, z: 34.9 }
    };
    const CAMERA_END = {
        pos: { x: 79.2, y: 0.6, z: 103.0 },
        target: { x: 24.1, y: 50.6, z: 40.1 }
    };

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function setCameraPosition(progress) {
        if (!camera || !controls) return;
        camera.position.set(
            lerp(CAMERA_START.pos.x, CAMERA_END.pos.x, progress),
            lerp(CAMERA_START.pos.y, CAMERA_END.pos.y, progress),
            lerp(CAMERA_START.pos.z, CAMERA_END.pos.z, progress)
        );
        controls.target.set(
            lerp(CAMERA_START.target.x, CAMERA_END.target.x, progress),
            lerp(CAMERA_START.target.y, CAMERA_END.target.y, progress),
            lerp(CAMERA_START.target.z, CAMERA_END.target.z, progress)
        );
        controls.update();
    }

    // UVA Colors
    const colors = {
        gray1: '#E57200',  // Orange
        gray2: '#232D4B',  // Blue
        gray3: '#F9DCBF',  // Cream
        border: '#333333'
    };

    // ===== WASM INTERFACE =====
    let wasmReady = false;
    const wasmInterface = {
        ready: false,
        paths: [],
        S_param: 0,

        initialize() {
            if (typeof Module === 'undefined' || typeof Module.cwrap !== 'function') {
                return false;
            }
            this.initializeTiling = Module.cwrap('initializeTiling', 'number', ['number', 'number', 'number', 'number', 'number'], {async: true});
            this.performSOperator = Module.cwrap('performSOperator', 'number', [], {async: true});
            this.exportPaths = Module.cwrap('exportPaths', 'number', [], {async: true});
            this.setImaginaryQ = Module.cwrap('setImaginaryQ', null, ['number']);
            this.freeString = Module.cwrap('freeString', null, ['number']);
            this.ready = true;
            return true;
        },

        async initTilingQRacah(q, kappa) {
            if (!this.ready) return;
            try {
                this.S_param = 0;
                const kappasq = kappa * kappa;
                this.setImaginaryQ(q);
                const ptr = await this.initializeTiling(N_param, T_param, 0, 7, -kappasq);
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    this.S_param = result.s || 0;
                }
                await this.refreshPaths();
            } catch (e) { console.error('Init failed:', e); }
        },

        async stepForward() {
            if (!this.ready || this.S_param >= T_param) return false;
            try {
                this.setImaginaryQ(Q_VALUE);
                const ptr = await this.performSOperator();
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    this.S_param = result.s;
                    await this.refreshPaths();
                    return true;
                }
            } catch (e) { console.error('Step failed:', e); }
            return false;
        },

        async refreshPaths() {
            try {
                const ptr = await this.exportPaths();
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    this.paths = result.paths;
                }
            } catch (e) { console.error('Export paths failed:', e); }
        }
    };

    let wasmInitAttempts = 0;
    function tryInitWasm() {
        wasmInitAttempts++;
        if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function') {
            if (wasmInterface.initialize()) {
                wasmReady = true;
            }
        } else if (wasmInitAttempts < 100) {
            setTimeout(tryInitWasm, 100);
        }
    }
    tryInitWasm();

    // ===== THREE.JS STATE =====
    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let renderLoopId = null;
    let currentN = 0, currentT = 0, currentS = 0;

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

        // Lighting
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

        camera.position.set(CAMERA_START.pos.x, CAMERA_START.pos.y, CAMERA_START.pos.z);
        camera.up.set(0, 0, 1);
        controls.target.set(CAMERA_START.target.x, CAMERA_START.target.y, CAMERA_START.target.z);
        controls.update();

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
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
        if (renderLoopId) {
            cancelAnimationFrame(renderLoopId);
            renderLoopId = null;
        }
    }

    // ===== PATHS TO 3D =====
    function pathsTo3D(paths, N, T, S) {
        if (!meshGroup) return;

        currentN = N;
        currentT = T;
        currentS = S;

        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }

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

                if (curr === prev + 1) {
                    x++;
                } else if (curr === prev) {
                    y++;
                }
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

            const edge1 = [v2[1] - v1[1], v2[0] - v1[0], v2[2] - v1[2]];
            const edge2 = [v3[1] - v1[1], v3[0] - v1[0], v3[2] - v1[2]];
            const normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0]
            ];
            const len = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
            if (len > 0) {
                normal[0] /= len;
                normal[1] /= len;
                normal[2] /= len;
            }

            for (let i = 0; i < 4; i++) {
                normals.push(normal[0], normal[1], normal[2]);
            }

            const c = new THREE.Color(color);
            for (let i = 0; i < 4; i++) {
                vertexColors.push(c.r, c.g, c.b);
            }

            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex, baseIndex + 2, baseIndex + 3
            );
        }

        // Create strips between consecutive paths
        for (let pathIdx = 1; pathIdx < pathTriplets.length; pathIdx++) {
            const topPath = pathTriplets[pathIdx];
            const bottomPath = topPath.map(point => [point[0], point[1], point[2] - 1]);

            for (let i = 0; i < topPath.length - 1; i++) {
                const topP1 = topPath[i];
                const topP2 = topPath[i + 1];
                const bottomP1 = bottomPath[i];
                const bottomP2 = bottomPath[i + 1];

                let color;
                if (topP2[0] > topP1[0] && topP2[1] === topP1[1]) {
                    color = colors.gray2;
                } else if (topP2[0] === topP1[0] && topP2[1] > topP1[1]) {
                    color = colors.gray1;
                } else {
                    color = colors.gray3;
                }

                addSquareFace(topP1, topP2, bottomP2, bottomP1, color);
            }
        }

        placeAllHorizontalLozenges(pathTriplets, addSquareFace);

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
            color: colors.border,
            linewidth: 1,
            opacity: 0.4,
            transparent: true
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        meshGroup.add(edges);
    }

    function extractLastFromIncreasing(list) {
        const result = [];
        let i = 0;
        while (i < list.length) {
            let j = i;
            while (j + 1 < list.length && list[j] < list[j + 1]) {
                j++;
            }
            result.push(list[j]);
            i = j + 1;
        }
        return result;
    }

    function calculateQFunction(path) {
        const table = [];
        for (let i = 0; i < path.length; i++) {
            const [x, y, z] = path[i];
            if (x === y) {
                table.push(y);
            } else {
                table.push(x);
            }
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

                if (upperVal > a && a >= lowerVal) {
                    matrix[a][b] = 1;
                }
            }
        }

        return matrix;
    }

    function placeAllHorizontalLozenges(pathTriplets, addSquareFace) {
        const S = currentS;
        const T = currentT;
        const N = currentN;

        // Top boundary
        if (pathTriplets.length > 0) {
            const topZ = N;
            const firstPath = pathTriplets[0];

            const topBoundary = [];
            for (let i = 0; i <= S; i++) {
                topBoundary.push([i, 0, topZ]);
            }
            for (let i = 1; i <= T - S; i++) {
                topBoundary.push([S, i, topZ]);
            }

            const zLevel = topZ - 1;
            const horizontalMatrix = calculateHorizontalLozengeMatrix(topBoundary, firstPath, S, T);

            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T - S; b++) {
                    if (a < horizontalMatrix.length && b < horizontalMatrix[a].length && horizontalMatrix[a][b] === 1) {
                        const square = [
                            [a, b, zLevel],
                            [a + 1, b, zLevel],
                            [a + 1, b + 1, zLevel],
                            [a, b + 1, zLevel]
                        ];
                        addSquareFace(square[0], square[1], square[2], square[3], colors.gray3);
                    }
                }
            }
        }

        // Middle paths
        for (let pathIdx = 0; pathIdx < pathTriplets.length - 1; pathIdx++) {
            const upperPath = pathTriplets[pathIdx];
            const lowerPath = pathTriplets[pathIdx + 1];

            const zLevel = upperPath[0][2] - 1;

            const horizontalMatrix = calculateHorizontalLozengeMatrix(upperPath, lowerPath, S, T);

            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T - S; b++) {
                    if (a < horizontalMatrix.length && b < horizontalMatrix[a].length && horizontalMatrix[a][b] === 1) {
                        const square = [
                            [a, b, zLevel],
                            [a + 1, b, zLevel],
                            [a + 1, b + 1, zLevel],
                            [a, b + 1, zLevel]
                        ];
                        addSquareFace(square[0], square[1], square[2], square[3], colors.gray3);
                    }
                }
            }
        }

        // Bottom boundary
        if (pathTriplets.length > 0) {
            const lastPath = pathTriplets[pathTriplets.length - 1];

            const bottomBoundary = [];
            for (let i = 0; i <= T - S; i++) {
                bottomBoundary.push([0, i, 0]);
            }
            for (let i = 1; i <= S; i++) {
                bottomBoundary.push([i, T - S, 0]);
            }

            const zLevel = 0;
            const horizontalMatrix = calculateHorizontalLozengeMatrix(lastPath, bottomBoundary, S, T);

            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T - S; b++) {
                    if (a < horizontalMatrix.length && b < horizontalMatrix[a].length && horizontalMatrix[a][b] === 1) {
                        const square = [
                            [a, b, zLevel],
                            [a + 1, b, zLevel],
                            [a + 1, b + 1, zLevel],
                            [a, b + 1, zLevel]
                        ];
                        addSquareFace(square[0], square[1], square[2], square[3], colors.gray3);
                    }
                }
            }
        }
    }

    // ===== ANIMATION =====
    let animationTimeoutId = null;
    let isAnimating = false;

    async function initAndAnimate() {
        if (!wasmReady || isAnimating) return;
        isAnimating = true;

        // Initialize at S=0
        await wasmInterface.initTilingQRacah(Q_VALUE, KAPPA);
        pathsTo3D(wasmInterface.paths, N_param, T_param, wasmInterface.S_param);
        setCameraPosition(0);
        if (renderer) renderer.render(scene, camera);

        // Animate step by step
        async function doStep() {
            if (!isAnimating || wasmInterface.S_param >= S_target) {
                isAnimating = false;
                setCameraPosition(1);
                return;
            }

            for (let i = 0; i < STEP_INCREMENT && wasmInterface.S_param < S_target; i++) {
                await wasmInterface.stepForward();
            }

            const pathsCopy = wasmInterface.paths.map(p => [...p]);
            pathsTo3D(pathsCopy, N_param, T_param, wasmInterface.S_param);

            const progress = wasmInterface.S_param / S_target;
            setCameraPosition(progress);

            if (wasmInterface.S_param < S_target) {
                animationTimeoutId = setTimeout(doStep, STEP_DELAY);
            } else {
                isAnimating = false;
            }
        }

        animationTimeoutId = setTimeout(doStep, STEP_DELAY);
    }

    function stopAnimation() {
        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }
        isAnimating = false;
    }

    window.slideEngine.registerSimulation('summary', {
        start() {
            startRenderLoop();
        },
        pause() {
            stopRenderLoop();
            stopAnimation();
        },
        onSlideEnter() {
            initThreeJS();
            startRenderLoop();
            setTimeout(() => initAndAnimate(), 100);
        },
        onSlideLeave() {
            stopAnimation();
            disposeThreeJS();
        }
    }, 0);

})();
