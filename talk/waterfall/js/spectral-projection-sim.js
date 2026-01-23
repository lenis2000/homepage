// Spectral Projection slide - Two 3D tilings + 2D slices side by side
(function() {
    const slideId = 'spectral-projection';

    // Parameters for simulation
    const N_param = 40;
    const T_param = 80;
    const S_target = 40;
    const KAPPA = 3.0;

    // Two simulations with different q values
    const Q_VALUES = [0.97, 0.8];

    // UVA Colors
    const colors = {
        gray1: '#E57200',  // Orange
        gray2: '#232D4B',  // Blue
        gray3: '#F9DCBF',  // Cream
        border: '#333333',
        slicePlane: '#E57200'  // Orange for slice indicator
    };

    // State for each simulation (indexed 0 and 1)
    const simStates = [
        { scene: null, renderer: null, camera: null, controls: null, meshGroup: null, slicePlane: null, renderLoopId: null, sliceData: null, paths: [], S_param: 0, sampling: false, sampled: false },
        { scene: null, renderer: null, camera: null, controls: null, meshGroup: null, slicePlane: null, renderLoopId: null, sliceData: null, paths: [], S_param: 0, sampling: false, sampled: false }
    ];

    let currentN = 0, currentT = 0, currentS = 0;

    // WASM interface
    let wasmReady = false;
    const wasmInterface = {
        ready: false,

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

        async refreshPaths() {
            try {
                const ptr = await this.exportPaths();
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    return result.paths;
                }
            } catch (e) { console.error('Export paths failed:', e); }
            return [];
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

    // ===== THREE.JS 3D VISUALIZATION =====
    function initThreeJS(simIdx) {
        const state = simStates[simIdx];
        const canvas = document.getElementById(`sp-3d-canvas-${simIdx + 1}`);
        if (!canvas || state.renderer) return;

        state.scene = new THREE.Scene();
        state.scene.background = new THREE.Color(0xffffff);

        state.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        state.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);

        state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
        state.controls.enableDamping = true;
        state.controls.dampingFactor = 0.1;
        state.controls.enablePan = true;
        state.controls.enableZoom = true;

        // Lighting
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

        // Camera position for N=40, T=80, S=40
        state.camera.position.set(100, 80, 120);
        state.camera.up.set(0, 0, 1);
        state.controls.target.set(40, 60, 20);
        state.controls.update();

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) {
            state.renderer.setSize(w, h, false);
            state.camera.aspect = w / h;
            state.camera.updateProjectionMatrix();
        }
    }

    function disposeThreeJS(simIdx) {
        const state = simStates[simIdx];
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
        if (state.slicePlane) {
            if (state.slicePlane.geometry) state.slicePlane.geometry.dispose();
            if (state.slicePlane.material) state.slicePlane.material.dispose();
            state.scene.remove(state.slicePlane);
            state.slicePlane = null;
        }
        state.renderer.dispose();
        state.renderer = null;
        state.scene = null;
        state.camera = null;
        state.controls = null;
        state.meshGroup = null;
    }

    function startRenderLoop(simIdx) {
        const state = simStates[simIdx];
        if (state.renderLoopId) return;
        function loop() {
            if (!state.renderer || !state.camera || !state.controls) return;
            state.controls.update();
            state.renderer.render(state.scene, state.camera);
            state.renderLoopId = requestAnimationFrame(loop);
        }
        loop();
    }

    function stopRenderLoop(simIdx) {
        const state = simStates[simIdx];
        if (state.renderLoopId) {
            cancelAnimationFrame(state.renderLoopId);
            state.renderLoopId = null;
        }
    }

    function addSlicePlane(simIdx) {
        const state = simStates[simIdx];
        if (!state.scene || state.slicePlane) return;

        const S = currentS;
        const N = currentN;
        const T = currentT;

        const geometry = new THREE.BufferGeometry();

        // Quadrilateral through GREEN, BLUE, WHITE, CYAN (exact vertices):
        const vertices = new Float32Array([
            0, S, 0,           // GREEN
            T - S, 0, 0,       // BLUE
            T - S, 0, N,       // WHITE
            0, S, N            // CYAN
        ]);

        const indices = [0, 1, 2, 0, 2, 3];

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshBasicMaterial({
            color: colors.slicePlane,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        state.slicePlane = new THREE.Mesh(geometry, material);
        state.scene.add(state.slicePlane);
    }

    // Path to 3D conversion
    function pathsTo3D(simIdx, paths, N, T, S) {
        const state = simStates[simIdx];
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

        // Add slice plane indicator
        addSlicePlane(simIdx);
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

    // ===== 2D SLICE VISUALIZATION =====
    function drawSlice(simIdx) {
        const state = simStates[simIdx];
        const canvas = document.getElementById(`sp-slice-canvas-${simIdx + 1}`);
        if (!canvas || !state.sliceData || state.sliceData.length === 0) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const padding = 20;
        const plotWidth = width - 2 * padding;
        const plotHeight = height - 2 * padding;

        const maxHeight = Math.max(...state.sliceData.map(d => d.height));
        const minHeight = Math.min(...state.sliceData.map(d => d.height));
        const range = maxHeight - minHeight || 1;

        // Draw the slice as connected line segments
        ctx.strokeStyle = colors.gray2;  // UVA Blue
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < state.sliceData.length; i++) {
            const x = padding + state.sliceData[i].u * plotWidth;
            const y = height - padding - ((state.sliceData[i].height - minHeight) / range) * plotHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    function extractDiagonalSlice(simIdx) {
        const state = simStates[simIdx];
        const paths = state.paths;
        if (!paths || paths.length === 0) return null;

        const N = paths.length;
        const T = currentT;
        const S = currentS;

        // Build path triplets (same transform as pathsTo3D)
        const pathTriplets = [];
        for (let i = 0; i < paths.length; i++) {
            const pathCopy = paths[i].slice().reverse();
            const firstElement = pathCopy[0];
            const adjustedPath = pathCopy.map(val => firstElement - val);

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

        // Diagonal plane: from (x=S, y=0) to (x=0, y=T-S)
        // Plane equation: x/S + y/(T-S) = 1
        // Find where each path crosses this plane
        const crossings = [];

        for (const path of pathTriplets) {
            const z = path[0][2];

            for (let i = 0; i < path.length - 1; i++) {
                const [x1, y1] = path[i];
                const [x2, y2] = path[i+1];

                // Distance to plane
                const d1 = (x1 / S) + (y1 / (T - S)) - 1;
                const d2 = (x2 / S) + (y2 / (T - S)) - 1;

                // Check if segment crosses plane (signs differ or one is zero)
                if (d1 * d2 <= 0 && !(d1 === 0 && d2 === 0)) {
                    let crossY;
                    if (Math.abs(d2 - d1) < 1e-10) {
                        crossY = (y1 + y2) / 2;
                    } else {
                        const t = -d1 / (d2 - d1);
                        crossY = y1 + t * (y2 - y1);
                    }

                    // Parameter along diagonal (0=GREEN at S,0; 1=BLUE at 0,T-S)
                    const u = crossY / (T - S);

                    crossings.push({ u, z });
                    break;  // Each path crosses once
                }
            }
        }

        // Sort by u (position along diagonal)
        crossings.sort((a, b) => a.u - b.u);

        // Build step function: height decreases as we cross each path
        const sliceData = [];
        let currentHeight = N;

        sliceData.push({ u: 0, height: currentHeight });

        for (const c of crossings) {
            // Add point just before crossing at current height
            sliceData.push({ u: c.u, height: currentHeight });
            // After crossing path at level z, height becomes z-1
            currentHeight = c.z - 1;
            sliceData.push({ u: c.u, height: currentHeight });
        }

        sliceData.push({ u: 1, height: 0 });

        return sliceData;
    }

    // ===== SAMPLING =====
    async function sampleQRacah(simIdx) {
        const state = simStates[simIdx];
        if (!wasmReady || state.sampling || state.sampled) return;
        state.sampling = true;

        const qValue = Q_VALUES[simIdx];

        // Set q and initialize
        wasmInterface.setImaginaryQ(qValue);
        const kappasq = KAPPA * KAPPA;
        const ptr = await wasmInterface.initializeTiling(N_param, T_param, 0, 7, -kappasq);
        if (ptr) {
            const jsonStr = Module.UTF8ToString(ptr);
            wasmInterface.freeString(ptr);
            const result = JSON.parse(jsonStr);
            state.S_param = result.s || 0;
        }
        state.paths = await wasmInterface.refreshPaths();

        // Grow to target
        while (state.S_param < S_target) {
            wasmInterface.setImaginaryQ(qValue);
            const ptr = await wasmInterface.performSOperator();
            if (ptr) {
                const jsonStr = Module.UTF8ToString(ptr);
                wasmInterface.freeString(ptr);
                const result = JSON.parse(jsonStr);
                state.S_param = result.s;
                state.paths = await wasmInterface.refreshPaths();
            } else {
                break;
            }
        }

        // Build 3D and extract diagonal slice
        const pathsCopy = state.paths.map(p => [...p]);
        pathsTo3D(simIdx, pathsCopy, N_param, T_param, state.S_param);
        state.sliceData = extractDiagonalSlice(simIdx);
        drawSlice(simIdx);

        if (state.renderer) state.renderer.render(state.scene, state.camera);

        state.sampling = false;
        state.sampled = true;
    }

    // Element visibility
    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('sp-limit');
        hideElement('sp-sine');
        hideElement('sp-refs');
        hideElement('sp-sim-container');
        hideElement('sp-sim-left');
        hideElement('sp-sim-right');
    }

    function onStep(step) {
        // Step 1: Show limit and sine kernel, start sampling both in background
        if (step >= 1) {
            showElement('sp-limit');
            showElement('sp-sine');
            // Initialize both Three.js renderers and start sampling
            initThreeJS(0);
            initThreeJS(1);
            if (!simStates[0].sampling && !simStates[0].sampled) {
                setTimeout(() => sampleQRacah(0), 100);
            }
            if (!simStates[1].sampling && !simStates[1].sampled) {
                setTimeout(() => sampleQRacah(1), 200);  // Slight delay for second
            }
        }
        // Step 2: Show references
        if (step >= 2) showElement('sp-refs');
        // Step 3: Show first simulation (q=0.97)
        if (step >= 3) {
            showElement('sp-sim-container');
            showElement('sp-sim-left');
            startRenderLoop(0);
            drawSlice(0);
        }
        // Step 4: Show second simulation (q=0.8)
        if (step >= 4) {
            showElement('sp-sim-right');
            startRenderLoop(1);
            drawSlice(1);
        }
    }

    function onStepBack(step) {
        if (step < 4) {
            hideElement('sp-sim-right');
            stopRenderLoop(1);
        }
        if (step < 3) {
            hideElement('sp-sim-container');
            hideElement('sp-sim-left');
            stopRenderLoop(0);
        }
        if (step < 2) hideElement('sp-refs');
        if (step < 1) {
            hideElement('sp-limit');
            hideElement('sp-sine');
        }
    }

    // Register with slide engine
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() {
                    const container = document.getElementById('sp-sim-container');
                    if (container && container.style.opacity === '1') {
                        if (document.getElementById('sp-sim-left').style.opacity === '1') {
                            startRenderLoop(0);
                        }
                        if (document.getElementById('sp-sim-right').style.opacity === '1') {
                            startRenderLoop(1);
                        }
                    }
                },
                pause() {
                    stopRenderLoop(0);
                    stopRenderLoop(1);
                },
                steps: 4,
                onStep,
                onStepBack,
                onSlideEnter() { reset(); },
                onSlideLeave() {
                    disposeThreeJS(0);
                    disposeThreeJS(1);
                    simStates[0].sliceData = null;
                    simStates[0].sampled = false;
                    simStates[1].sliceData = null;
                    simStates[1].sampled = false;
                }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
