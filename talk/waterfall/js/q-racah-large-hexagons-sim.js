/**
 * q-Racah Large Hexagons Slide
 * Two side-by-side 3D tilings - copied directly from nature-builds-sim.js
 * Left: q ≈ 1 (scaling regime), Right: fixed q
 */

(function initLargeHexSim() {
    if (!window.slideEngine) {
        setTimeout(initLargeHexSim, 50);
        return;
    }

    const scalingCanvas = document.getElementById('large-hex-scaling-canvas');
    const fixedCanvas = document.getElementById('large-hex-fixed-canvas');
    if (!scalingCanvas || !fixedCanvas) return;

    // Parameters
    const N_param = 80;
    const T_param = 160;
    const S_target = 80;
    // Both q-Racah with kappa = 3i
    const KAPPA = 3.0;
    const Q_LEFT = 0.95;   // scaling regime
    const Q_RIGHT = 0.8;   // fixed q regime

    // UVA Colors for white background
    const colors = {
        gray1: '#E57200',  // Orange
        gray2: '#232D4B',  // Blue
        gray3: '#F9DCBF',  // Cream
        border: '#333333'
    };

    // ===== WASM INTERFACE (same as nature-builds-sim.js) =====
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

        async initTilingQHahn(q) {
            if (!this.ready) return;
            try {
                this.S_param = 0;
                // Mode 5 = Q_HAHN with real q
                const ptr = await this.initializeTiling(N_param, T_param, 0, 5, q);
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    this.S_param = result.s || 0;
                }
                await this.refreshPaths();
            } catch (e) { console.error('Init failed:', e); }
        },

        async initTilingQRacah(q, kappa) {
            if (!this.ready) return;
            try {
                this.S_param = 0;
                // Mode 7 = IMAGINARY_Q_RACAH
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
        },

        async growToTarget() {
            while (this.S_param < S_target) {
                const stepped = await this.stepForward();
                if (!stepped) break;
            }
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

    // ===== TWO THREEJS STATES =====
    const states = {
        scaling: { canvas: scalingCanvas, scene: null, renderer: null, camera: null, controls: null, meshGroup: null, renderLoopId: null },
        fixed: { canvas: fixedCanvas, scene: null, renderer: null, camera: null, controls: null, meshGroup: null, renderLoopId: null }
    };

    let currentN = 0, currentT = 0, currentS = 0;

    function initThreeJS(state) {
        if (state.renderer) return;

        state.scene = new THREE.Scene();
        state.scene.background = new THREE.Color(0xffffff);  // White background

        state.renderer = new THREE.WebGLRenderer({ canvas: state.canvas, antialias: true });
        state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = state.canvas.clientWidth / state.canvas.clientHeight || 1;
        state.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);

        state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
        state.controls.enableDamping = true;
        state.controls.dampingFactor = 0.1;
        state.controls.enablePan = true;
        state.controls.enableZoom = true;


        // lpetrov.cc/lozenge lighting
        state.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        hemi.position.set(0, 20, 0);
        state.scene.add(hemi);
        const directional = new THREE.DirectionalLight(0xffffff, 0.6);
        directional.position.set(10, 10, 15);
        state.scene.add(directional);
        const fill = new THREE.DirectionalLight(0xffffff, 0.25);
        fill.position.set(-10, -5, -10);
        state.scene.add(fill);

        state.meshGroup = new THREE.Group();
        state.scene.add(state.meshGroup);

        state.camera.position.set(112.3, -2.8, 134.2);
        state.camera.up.set(0, 0, 1);
        state.controls.target.set(26.6, 43.7, 34.4);
        state.controls.update();

        const w = state.canvas.clientWidth, h = state.canvas.clientHeight;
        if (w > 0 && h > 0) {
            state.renderer.setSize(w, h, false);
            state.camera.aspect = w / h;
            state.camera.updateProjectionMatrix();
        }
    }

    function disposeThreeJS(state) {
        if (!state.renderer) return;
        if (state.renderLoopId) { cancelAnimationFrame(state.renderLoopId); state.renderLoopId = null; }
        if (state.meshGroup) {
            while (state.meshGroup.children.length > 0) {
                const child = state.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                state.meshGroup.remove(child);
            }
        }
        state.renderer.dispose();
        state.renderer = null;
        state.scene = null;
        state.camera = null;
        state.controls = null;
        state.meshGroup = null;
    }

    function startRenderLoop(state) {
        if (state.renderLoopId) return;
        function loop() {
            if (!state.renderer || !state.camera || !state.controls) return;
            state.controls.update();
            state.renderer.render(state.scene, state.camera);
            state.renderLoopId = requestAnimationFrame(loop);
        }
        loop();
    }

    function stopRenderLoop(state) {
        if (state.renderLoopId) {
            cancelAnimationFrame(state.renderLoopId);
            state.renderLoopId = null;
        }
    }

    // ===== PATHS TO 3D (copied exactly from nature-builds-sim.js) =====
    function pathsTo3D(state, paths, N, T, S) {
        if (!state.meshGroup) return;

        currentN = N;
        currentT = T;
        currentS = S;

        while (state.meshGroup.children.length > 0) {
            const child = state.meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            state.meshGroup.remove(child);
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
        state.meshGroup.add(mesh);

        const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: colors.border,
            linewidth: 1,
            opacity: 0.4,
            transparent: true
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        state.meshGroup.add(edges);
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

    // ===== SAMPLING =====
    let sampling = false;
    let currentQ = 0.5;  // Track current q for step operations

    async function sampleQRacah(state, q, label) {
        // Reset WASM state completely for this sample
        wasmInterface.paths = [];
        wasmInterface.S_param = 0;
        currentQ = q;

        // Set q and initialize
        wasmInterface.setImaginaryQ(q);
        const kappasq = KAPPA * KAPPA;
        const ptr = await wasmInterface.initializeTiling(N_param, T_param, 0, 7, -kappasq);
        if (ptr) {
            const jsonStr = Module.UTF8ToString(ptr);
            wasmInterface.freeString(ptr);
            const result = JSON.parse(jsonStr);
            wasmInterface.S_param = result.s || 0;
        }
        await wasmInterface.refreshPaths();

        // Grow to target - set q before EACH step
        while (wasmInterface.S_param < S_target) {
            wasmInterface.setImaginaryQ(q);
            const ptr = await wasmInterface.performSOperator();
            if (ptr) {
                const jsonStr = Module.UTF8ToString(ptr);
                wasmInterface.freeString(ptr);
                const result = JSON.parse(jsonStr);
                wasmInterface.S_param = result.s;
                await wasmInterface.refreshPaths();
            } else {
                break;
            }
        }

        // Deep copy paths before rendering
        const pathsCopy = wasmInterface.paths.map(p => [...p]);
        pathsTo3D(state, pathsCopy, N_param, T_param, wasmInterface.S_param);
        if (state.renderer) state.renderer.render(state.scene, state.camera);
    }

    async function sampleBoth() {
        if (!wasmReady || sampling) return;
        sampling = true;

        await sampleQRacah(states.scaling, Q_LEFT, '(q=0.95)');
        await sampleQRacah(states.fixed, Q_RIGHT, '(q=0.8)');

        sampling = false;
    }

    // ===== ZOOM ANIMATION =====
    const CAMERA_START = { pos: { x: 112.3, y: -2.8, z: 134.2 }, target: { x: 26.6, y: 43.7, z: 34.4 } };
    const CAMERA_END_LEFT = { pos: { x: 33.9, y: 42.4, z: 32.7 }, target: { x: 30.2, y: 44.7, z: 30.3 } };
    // Right zooms 2.5x less deep (2/5 of the distance)
    const CAMERA_END_RIGHT = { pos: { x: 80.9, y: 15.3, z: 93.6 }, target: { x: 28.0, y: 44.1, z: 32.8 } };
    const ZOOM_DURATION = 4000; // 4 seconds for slow zoom

    let zoomAnimationId = null;
    let isZooming = false;

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function setCameraPosition(state, camPos, targetPos) {
        if (!state.camera || !state.controls) return;
        state.camera.position.set(camPos.x, camPos.y, camPos.z);
        state.controls.target.set(targetPos.x, targetPos.y, targetPos.z);
        state.controls.update();
    }

    function startZoomAnimation() {
        if (isZooming) return;
        isZooming = true;

        const startTime = performance.now();

        function animateZoom() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / ZOOM_DURATION, 1);
            const eased = easeInOutCubic(t);

            // Left canvas - full zoom
            const camPosLeft = {
                x: lerp(CAMERA_START.pos.x, CAMERA_END_LEFT.pos.x, eased),
                y: lerp(CAMERA_START.pos.y, CAMERA_END_LEFT.pos.y, eased),
                z: lerp(CAMERA_START.pos.z, CAMERA_END_LEFT.pos.z, eased)
            };
            const targetPosLeft = {
                x: lerp(CAMERA_START.target.x, CAMERA_END_LEFT.target.x, eased),
                y: lerp(CAMERA_START.target.y, CAMERA_END_LEFT.target.y, eased),
                z: lerp(CAMERA_START.target.z, CAMERA_END_LEFT.target.z, eased)
            };

            // Right canvas - 5x less deep
            const camPosRight = {
                x: lerp(CAMERA_START.pos.x, CAMERA_END_RIGHT.pos.x, eased),
                y: lerp(CAMERA_START.pos.y, CAMERA_END_RIGHT.pos.y, eased),
                z: lerp(CAMERA_START.pos.z, CAMERA_END_RIGHT.pos.z, eased)
            };
            const targetPosRight = {
                x: lerp(CAMERA_START.target.x, CAMERA_END_RIGHT.target.x, eased),
                y: lerp(CAMERA_START.target.y, CAMERA_END_RIGHT.target.y, eased),
                z: lerp(CAMERA_START.target.z, CAMERA_END_RIGHT.target.z, eased)
            };

            setCameraPosition(states.scaling, camPosLeft, targetPosLeft);
            setCameraPosition(states.fixed, camPosRight, targetPosRight);

            if (t < 1) {
                zoomAnimationId = requestAnimationFrame(animateZoom);
            } else {
                isZooming = false;
                zoomAnimationId = null;
            }
        }

        animateZoom();
    }

    function resetZoom() {
        if (zoomAnimationId) {
            cancelAnimationFrame(zoomAnimationId);
            zoomAnimationId = null;
        }
        isZooming = false;
        setCameraPosition(states.scaling, CAMERA_START.pos, CAMERA_START.target);
        setCameraPosition(states.fixed, CAMERA_START.pos, CAMERA_START.target);
    }

    window.slideEngine.registerSimulation('q-racah-large-hexagons', {
        start() {
            startRenderLoop(states.scaling);
            startRenderLoop(states.fixed);
        },
        pause() {
            stopRenderLoop(states.scaling);
            stopRenderLoop(states.fixed);
        },
        steps: 1,
        onStep(step) {
            if (step === 1) {
                startZoomAnimation();
            }
        },
        onStepBack(step) {
            if (step === 0) {
                resetZoom();
            }
        },
        onSlideEnter() {
            initThreeJS(states.scaling);
            initThreeJS(states.fixed);
            resetZoom();
            startRenderLoop(states.scaling);
            startRenderLoop(states.fixed);
            setTimeout(() => sampleBoth(), 100);
        },
        onSlideLeave() {
            if (zoomAnimationId) {
                cancelAnimationFrame(zoomAnimationId);
                zoomAnimationId = null;
            }
            isZooming = false;
            disposeThreeJS(states.scaling);
            disposeThreeJS(states.fixed);
        }
    }, 0);
})();
