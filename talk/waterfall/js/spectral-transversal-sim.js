// Spectral Transversal slide - Single simulation with horizontal slice
(function() {
    const slideId = 'spectral-transversal';

    // Parameters for simulation
    const N_param = 80;
    const T_param = 160;
    const S_target = 80;
    const KAPPA = 3.0;
    const Q_VALUE = 0.8;

    // UVA Colors
    const colors = {
        gray1: '#E57200',  // Orange
        gray2: '#232D4B',  // Blue
        gray3: '#F9DCBF',  // Cream
        border: '#333333',
        slicePlane: '#E57200'  // Orange for slice indicator
    };

    // Stored data
    let sampledPaths = null;
    let sampledS = 0;
    let sliceData = null;
    let sampled = false;
    let sampling = false;

    // Current display state
    let currentN = 0, currentT = 0, currentS = 0;

    // Three.js state
    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let slicePlane = null;
    let renderLoopId = null;

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
    function initThreeJS() {
        const canvas = document.getElementById('st-3d-canvas');
        if (!canvas || renderer) return;

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

        // Log 3D camera position on change
        controls.addEventListener('change', () => {
            console.log('3D camera pos:', camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1),
                        '| target:', controls.target.x.toFixed(1), controls.target.y.toFixed(1), controls.target.z.toFixed(1));
        });

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

        // Camera position for N=80, T=160, S=80 - side view for horizontal slice
        camera.position.set(140, 80, 140);
        camera.up.set(0, 0, 1);
        controls.target.set(40, 40, 40);
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
        if (slicePlane) {
            if (slicePlane.geometry) slicePlane.geometry.dispose();
            if (slicePlane.material) slicePlane.material.dispose();
            scene.remove(slicePlane);
            slicePlane = null;
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

    function clearMesh() {
        if (!meshGroup) return;
        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }
        if (slicePlane) {
            if (slicePlane.geometry) slicePlane.geometry.dispose();
            if (slicePlane.material) slicePlane.material.dispose();
            scene.remove(slicePlane);
            slicePlane = null;
        }
    }

    function addHorizontalSlicePlane() {
        if (!scene || slicePlane) return;

        const S = currentS;
        const N = currentN;
        const T = currentT;
        const zSlice = N / 2;  // Horizontal slice at center height

        const geometry = new THREE.BufferGeometry();

        // Horizontal plane at z = zSlice, spanning the hexagon footprint
        // The hexagon footprint goes from (0,0) to (S, T-S) in the x-y plane
        const vertices = new Float32Array([
            0, 0, zSlice,           // Origin corner
            T - S, 0, zSlice,       // Right corner
            T - S, S, zSlice,       // Far right corner
            0, S, zSlice            // Far left corner
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

        slicePlane = new THREE.Mesh(geometry, material);
        scene.add(slicePlane);
    }

    // Path to 3D conversion
    function pathsTo3D(paths, N, T, S) {
        if (!meshGroup) return;

        currentN = N;
        currentT = T;
        currentS = S;

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

        // Add horizontal slice plane indicator
        addHorizontalSlicePlane();
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

    // ===== 2D HORIZONTAL SLICE VISUALIZATION =====
    // 2D slice camera/zoom state
    let slice2D = {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        lastX: 0,
        lastY: 0
    };

    // Initialize 2D slice pan/zoom controls
    function init2DControls() {
        const canvas = document.getElementById('st-slice-canvas');
        if (!canvas) return;

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = slice2D.scale * zoomFactor;

            // Zoom toward mouse position
            slice2D.offsetX = mouseX - (mouseX - slice2D.offsetX) * zoomFactor;
            slice2D.offsetY = mouseY - (mouseY - slice2D.offsetY) * zoomFactor;
            slice2D.scale = newScale;

            drawHorizontalSlice(sliceData);
            log2DCamera();
        });

        canvas.addEventListener('mousedown', (e) => {
            slice2D.isDragging = true;
            slice2D.lastX = e.clientX;
            slice2D.lastY = e.clientY;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!slice2D.isDragging) return;
            const dx = e.clientX - slice2D.lastX;
            const dy = e.clientY - slice2D.lastY;
            slice2D.offsetX += dx;
            slice2D.offsetY += dy;
            slice2D.lastX = e.clientX;
            slice2D.lastY = e.clientY;
            drawHorizontalSlice(sliceData);
            log2DCamera();
        });

        canvas.addEventListener('mouseup', () => { slice2D.isDragging = false; });
        canvas.addEventListener('mouseleave', () => { slice2D.isDragging = false; });
    }

    function log2DCamera() {
        console.log('2D slice camera - scale:', slice2D.scale.toFixed(3),
                    '| offsetX:', slice2D.offsetX.toFixed(1),
                    '| offsetY:', slice2D.offsetY.toFixed(1));
    }

    function set2DCamera(scale, offsetX, offsetY) {
        slice2D.scale = scale;
        slice2D.offsetX = offsetX;
        slice2D.offsetY = offsetY;
        drawHorizontalSlice(sliceData);
    }

    // Draw the path at height z = N/2, rotated 45 degrees clockwise
    function drawHorizontalSlice(sliceDataArg) {
        const canvas = document.getElementById('st-slice-canvas');
        if (!canvas || !sliceDataArg || sliceDataArg.length === 0) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const padding = 50;

        // sliceData contains {x, y} coordinates of the path at z = N/2
        // Apply 45 degree clockwise rotation:
        // rotX = (x + y) / sqrt(2), rotY = (y - x) / sqrt(2)
        const sqrt2 = Math.sqrt(2);
        const rotatedData = sliceDataArg.map(d => ({
            rotX: (d.x + d.y) / sqrt2,
            rotY: (d.y - d.x) / sqrt2
        }));

        const maxRotX = Math.max(...rotatedData.map(d => d.rotX));
        const minRotX = Math.min(...rotatedData.map(d => d.rotX));
        const maxRotY = Math.max(...rotatedData.map(d => d.rotY));
        const minRotY = Math.min(...rotatedData.map(d => d.rotY));

        const rangeX = maxRotX - minRotX || 1;
        const rangeY = maxRotY - minRotY || 1;

        const plotWidth = width - 2 * padding;
        const plotHeight = height - 2 * padding;

        // Use uniform scaling to preserve aspect ratio
        const baseScale = Math.min(plotWidth / rangeX, plotHeight / rangeY);
        const baseOffsetX = (width - rangeX * baseScale) / 2;
        const baseOffsetY = (height - rangeY * baseScale) / 2;

        // Apply 2D camera transform
        const totalScale = baseScale * slice2D.scale;
        const totalOffsetX = baseOffsetX * slice2D.scale + slice2D.offsetX;
        const totalOffsetY = baseOffsetY * slice2D.scale + slice2D.offsetY;

        // Draw the slice as a step function
        ctx.strokeStyle = colors.gray2;  // UVA Blue
        ctx.lineWidth = 5 * slice2D.scale;
        ctx.beginPath();

        let started = false;
        for (let i = 0; i < rotatedData.length; i++) {
            const canvasX = totalOffsetX + (rotatedData[i].rotX - minRotX) * totalScale;
            const canvasY = height - totalOffsetY - (rotatedData[i].rotY - minRotY) * totalScale;

            if (!started) {
                ctx.moveTo(canvasX, canvasY);
                started = true;
            } else {
                ctx.lineTo(canvasX, canvasY);
            }
        }
        ctx.stroke();
    }

    // Extract horizontal slice at z = N/2 (center height)
    // This extracts the actual path at that height level from the 3D surface
    function extractHorizontalSlice(paths, S_param) {
        if (!paths || paths.length === 0) return null;

        const N = paths.length;
        const T = T_param;
        const S = S_param;
        const zSlice = Math.floor(N / 2);  // Slice at center height

        // Build path triplets (same as in pathsTo3D)
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

        // Find the path at z = zSlice
        // pathTriplets[i] has z = N - i, so for z = zSlice, i = N - zSlice
        const pathIdx = N - zSlice;
        if (pathIdx < 0 || pathIdx >= pathTriplets.length) {
            return null;
        }

        const pathAtSlice = pathTriplets[pathIdx];

        // Return the (x, y) coordinates of this path
        // This is the contour of the 3D surface at height zSlice
        return pathAtSlice.map(p => ({ x: p[0], y: p[1] }));
    }

    // ===== SAMPLING =====
    async function sampleQRacah() {
        if (!wasmReady || sampling || sampled) return;
        sampling = true;

        let S_param = 0;

        // Set q and initialize
        wasmInterface.setImaginaryQ(Q_VALUE);
        const kappasq = KAPPA * KAPPA;
        const ptr = await wasmInterface.initializeTiling(N_param, T_param, 0, 7, -kappasq);
        if (ptr) {
            const jsonStr = Module.UTF8ToString(ptr);
            wasmInterface.freeString(ptr);
            const result = JSON.parse(jsonStr);
            S_param = result.s || 0;
        }
        let paths = await wasmInterface.refreshPaths();

        // Grow to target
        while (S_param < S_target) {
            wasmInterface.setImaginaryQ(Q_VALUE);
            const ptr = await wasmInterface.performSOperator();
            if (ptr) {
                const jsonStr = Module.UTF8ToString(ptr);
                wasmInterface.freeString(ptr);
                const result = JSON.parse(jsonStr);
                S_param = result.s;
                paths = await wasmInterface.refreshPaths();
            } else {
                break;
            }
        }

        // Store the sampled data
        sampledPaths = paths.map(p => [...p]);
        sampledS = S_param;
        sliceData = extractHorizontalSlice(sampledPaths, S_param);
        sampled = true;
        sampling = false;

        // Display immediately
        displaySimulation();
    }

    // Display the simulation
    function displaySimulation() {
        if (!sampled || !sampledPaths) return;

        // Build 3D mesh
        pathsTo3D(sampledPaths, N_param, T_param, sampledS);

        // Draw horizontal slice
        drawHorizontalSlice(sliceData);

        if (renderer) renderer.render(scene, camera);
    }

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        // Hide step-dependent elements
        hideElement('st-converge');
        hideElement('st-bounded');
        hideElement('st-unbounded');

        // Reset 2D camera
        slice2D.scale = 1;
        slice2D.offsetX = 0;
        slice2D.offsetY = 0;

        // Initialize Three.js and start sampling on slide enter
        initThreeJS();
        init2DControls();
        if (!sampling && !sampled) {
            setTimeout(() => sampleQRacah(), 100);
        } else if (sampled) {
            displaySimulation();
        }
        startRenderLoop();
    }

    function onStep(step) {
        // Step 1: Picture zoom
        if (step >= 1) {
            // Zoom 3D camera
            if (camera && controls) {
                camera.position.set(61.7, 35.0, 60.1);
                controls.target.set(40.0, 40.0, 40.0);
                controls.update();
            }
            // Zoom 2D slice
            set2DCamera(5.504, -969.0, -697.7);
        }
        // Step 2: Show converge pane
        if (step >= 2) showElement('st-converge');
        // Step 3: Show bounded pane
        if (step >= 3) showElement('st-bounded');
        // Step 4: Show unbounded pane
        if (step >= 4) showElement('st-unbounded');
    }

    function onStepBack(step) {
        if (step < 4) hideElement('st-unbounded');
        if (step < 3) hideElement('st-bounded');
        if (step < 2) hideElement('st-converge');
        if (step < 1) {
            // Reset to initial camera positions
            slice2D.scale = 1;
            slice2D.offsetX = 0;
            slice2D.offsetY = 0;
            if (sliceData) drawHorizontalSlice(sliceData);
            if (camera && controls) {
                camera.position.set(140, 80, 140);
                controls.target.set(40, 40, 40);
                controls.update();
            }
        }
    }

    // Register with slide engine
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() {
                    startRenderLoop();
                },
                pause() {
                    stopRenderLoop();
                },
                steps: 4,
                onStep,
                onStepBack,
                onSlideEnter() { reset(); },
                onSlideLeave() {
                    disposeThreeJS();
                    sampledPaths = null;
                    sliceData = null;
                    sampled = false;
                }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
