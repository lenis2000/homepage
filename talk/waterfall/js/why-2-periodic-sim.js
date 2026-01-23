/**
 * Why 2-Periodic slide - Sample N=8, T=16, S=8 waterfall with q=0.5
 * 3D visualization with orthographic projection
 */

(function() {
    'use strict';

    const slideId = 'why-2-periodic';

    // Parameters
    const N_param = 8;
    const T_param = 16;
    const S_target = 8;
    const Q_VALUE = 0.2;
    const KAPPA = 3.0;

    // UVA Colors
    const colors = {
        gray1: '#E57200',  // Orange
        gray2: '#232D4B',  // Blue
        gray3: '#F9DCBF',  // Cream
        border: '#333333'
    };

    let canvas = null;
    let scene = null;
    let renderer = null;
    let camera = null;
    let controls = null;
    let meshGroup = null;
    let renderLoopId = null;
    let paths = null;
    let S_param = 0;
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

    function initThreeJS() {
        if (renderer) return;

        canvas = document.getElementById('why-2p-canvas');
        if (!canvas) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        const frustumSize = 20;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000
        );

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

        // Fixed camera position
        camera.position.set(19.5, -10.3, 22.0);
        camera.up.set(0, 0, 1);
        controls.target.set(4.2, 3.8, 3.7);
        camera.zoom = 1.51;
        camera.updateProjectionMatrix();
        controls.update();

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h, false);
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
        renderer = null;
        scene = null;
        camera = null;
        controls = null;
        meshGroup = null;
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

    function pathsTo3D(pathsData, N, T, S) {
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
            color: 0x000000,
            linewidth: 2
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

    async function sampleTiling() {
        if (!wasmReady) return;

        wasmInterface.setImaginaryQ(Q_VALUE);

        const kappasq = KAPPA * KAPPA;
        const ptr = await wasmInterface.initializeTiling(N_param, T_param, 0, 7, -kappasq);
        if (ptr) {
            const jsonStr = Module.UTF8ToString(ptr);
            wasmInterface.freeString(ptr);
            const result = JSON.parse(jsonStr);
            S_param = result.s || 0;
        }

        paths = await wasmInterface.refreshPaths();

        while (S_param < S_target) {
            wasmInterface.setImaginaryQ(Q_VALUE);
            const sPtr = await wasmInterface.performSOperator();
            if (sPtr) {
                const jsonStr = Module.UTF8ToString(sPtr);
                wasmInterface.freeString(sPtr);
                const result = JSON.parse(jsonStr);
                S_param = result.s;
                paths = await wasmInterface.refreshPaths();
            } else {
                break;
            }
        }

        pathsTo3D(paths, N_param, T_param, S_param);
        if (renderer) renderer.render(scene, camera);
    }

    function init() {
        initThreeJS();
        startRenderLoop();

        setTimeout(() => {
            if (wasmReady) {
                sampleTiling();
            } else {
                const checkWasm = setInterval(() => {
                    if (wasmReady) {
                        clearInterval(checkWasm);
                        sampleTiling();
                    }
                }, 100);
            }
        }, 100);
    }

    function reset() {
        paths = null;
        S_param = 0;
    }

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { startRenderLoop(); },
                pause() { stopRenderLoop(); },
                onSlideEnter() {
                    reset();
                    init();
                },
                onSlideLeave() {
                    disposeThreeJS();
                }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
