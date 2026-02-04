/**
 * Barcode Process Applied slide — three simulations combined:
 *   1. Vertical-slice style: 3D tiling (N=80, q=0.3) + 2D diagonal slice
 *   2. Spectral-transversal style: same 3D tiling + 2D horizontal slice
 *   3. Why-2-periodic style: small orthographic (N=8, q=0.2) with thick edges
 */
(function() {
    'use strict';

    const slideId = 'barcode-process-applied';

    // Large tiling params (views 0 & 1)
    const LARGE_N = 80, LARGE_T = 160, LARGE_S_TARGET = 80, LARGE_Q = 0.85;
    // Small tiling params (view 2)
    const SMALL_N = 8, SMALL_T = 16, SMALL_S_TARGET = 8, SMALL_Q = 0.2;
    const KAPPA = 3.0;

    const colors = {
        orange: '#E57200', blue: '#232D4B', cream: '#F9DCBF',
        border: '#333333', slicePlane: '#E57200'
    };

    // State
    let largePaths = null, largeS = 0, largeSampled = false;
    let smallPaths = null, smallS = 0, smallSampled = false;
    let sampling = false;
    let largeSliceData = null;   // diagonal slice
    let horizSliceData = null;   // horizontal slice

    // Three views: [0]=vs-3d, [1]=st-3d, [2]=w2p
    const views = [null, null, null];
    let renderLoopId = null;
    let cameraAnimationId = null;
    let buttonsInitialized = false;

    // Camera positions for view 2 (why-2-periodic style)
    const cam2Pos1 = { pos: {x: 19.5, y: -10.3, z: 22.0}, target: {x: 4.2, y: 3.8, z: 3.7}, zoom: 1.51 };
    const cam2Pos2 = { pos: {x: 8.2, y: 1.8, z: 31.0}, target: {x: 4.1, y: 4.5, z: 3.8}, zoom: 1.51 };

    // Camera positions for view 1 zoom (spectral-transversal barcode zoom)
    const cam1Initial = { pos: {x: 140, y: 80, z: 140}, target: {x: 40, y: 40, z: 40} };
    const cam1Zoomed = { pos: {x: 61.7, y: 35.0, z: 60.1}, target: {x: 40.0, y: 40.0, z: 40.0} };
    // 2D slice zoom state for horizontal cross-section
    let slice2D = { scale: 1, offsetX: 0, offsetY: 0 };
    const slice2DInitial = { scale: 1, offsetX: 0, offsetY: 0 };
    const slice2DZoomed = { scale: 5, offsetX: -1000, offsetY: -800 };
    let zoomAnimationId = null;

    // ===== WASM =====
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
            } catch (e) { console.error('BPA export paths failed:', e); }
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

    // ===== VIEW FACTORY =====
    function createPerspectiveView(canvasId, camPos, camTarget) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
        camera.position.set(camPos.x, camPos.y, camPos.z);
        camera.up.set(0, 0, 1);
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.target.set(camTarget.x, camTarget.y, camTarget.z);
        controls.update();
        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        hemi.position.set(0, 20, 0); scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(10, 10, 15); scene.add(dir);
        const fill = new THREE.DirectionalLight(0xffffff, 0.25);
        fill.position.set(-10, -5, -10); scene.add(fill);
        const meshGroup = new THREE.Group();
        scene.add(meshGroup);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
        return { canvas, scene, renderer, camera, controls, meshGroup, slicePlane: null };
    }

    function createOrthographicView(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        const frustumSize = 20;
        const camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, 0.1, 1000
        );
        camera.up.set(0, 0, 1);
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = true;
        controls.enableZoom = true;
        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        hemi.position.set(0, 20, 0); scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(10, 10, 15); scene.add(dir);
        const fill = new THREE.DirectionalLight(0xffffff, 0.25);
        fill.position.set(-10, -5, -10); scene.add(fill);
        const meshGroup = new THREE.Group();
        scene.add(meshGroup);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) renderer.setSize(w, h, false);
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
            if (anyActive) renderLoopId = requestAnimationFrame(loop);
        }
        loop();
    }

    function stopRenderLoop() {
        if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
    }

    // ===== SHARED GEOMETRY HELPERS =====
    function pathsToTriplets(pathsData) {
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
        return pathTriplets;
    }

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

    function placeHorizontalLozenges(pathTriplets, addFace, N, T, S) {
        function placeBetween(upper, lower, zLevel) {
            const m = calculateHorizontalLozengeMatrix(upper, lower, S, T);
            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T - S; b++) {
                    if (a < m.length && b < m[a].length && m[a][b] === 1)
                        addFace([a, b, zLevel], [a+1, b, zLevel], [a+1, b+1, zLevel], [a, b+1, zLevel], colors.cream);
                }
            }
        }
        if (pathTriplets.length > 0) {
            const topBoundary = [];
            for (let i = 0; i <= S; i++) topBoundary.push([i, 0, N]);
            for (let i = 1; i <= T - S; i++) topBoundary.push([S, i, N]);
            placeBetween(topBoundary, pathTriplets[0], N - 1);
        }
        for (let pi = 0; pi < pathTriplets.length - 1; pi++)
            placeBetween(pathTriplets[pi], pathTriplets[pi + 1], pathTriplets[pi][0][2] - 1);
        if (pathTriplets.length > 0) {
            const bottomBoundary = [];
            for (let i = 0; i <= T - S; i++) bottomBoundary.push([0, i, 0]);
            for (let i = 1; i <= S; i++) bottomBoundary.push([i, T - S, 0]);
            placeBetween(pathTriplets[pathTriplets.length - 1], bottomBoundary, 0);
        }
    }

    // ===== BUILD LARGE TILING (views 0 & 1) — thin edges =====
    function buildLargeTilingOnView(viewIdx, pathsData, N, T, S) {
        const v = views[viewIdx];
        if (!v || !v.meshGroup) return;

        // Clear
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

        const pathTriplets = pathsToTriplets(pathsData);

        const geometry = new THREE.BufferGeometry();
        const vertices = [], normals = [], vertexColors = [], indices = [];

        function addSquareFace(v1, v2, v3, v4, color) {
            const baseIndex = vertices.length / 3;
            vertices.push(v1[1], v1[0], v1[2], v2[1], v2[0], v2[2], v3[1], v3[0], v3[2], v4[1], v4[0], v4[2]);
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
            const bottomPath = topPath.map(p => [p[0], p[1], p[2] - 1]);
            for (let i = 0; i < topPath.length - 1; i++) {
                let color;
                if (topPath[i+1][0] > topPath[i][0] && topPath[i+1][1] === topPath[i][1]) color = colors.blue;
                else if (topPath[i+1][0] === topPath[i][0] && topPath[i+1][1] > topPath[i][1]) color = colors.orange;
                else color = colors.cream;
                addSquareFace(topPath[i], topPath[i+1], bottomPath[i+1], bottomPath[i], color);
            }
        }

        placeHorizontalLozenges(pathTriplets, addSquareFace, N, T, S);

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.5, metalness: 0.15
        });
        v.meshGroup.add(new THREE.Mesh(geometry, material));

        const edgesGeo = new THREE.EdgesGeometry(geometry, 10);
        const edgesMat = new THREE.LineBasicMaterial({ color: colors.border, linewidth: 1, opacity: 0.4, transparent: true });
        v.meshGroup.add(new THREE.LineSegments(edgesGeo, edgesMat));

        // Add slice plane per view
        if (viewIdx === 0) addDiagonalSlicePlane(v, S, T, N);
        if (viewIdx === 1) addHorizontalSlicePlane(v, S, T, N);
    }

    function addDiagonalSlicePlane(v, S, T, N) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,S,0, T-S,0,0, T-S,0,N, 0,S,N]), 3));
        geo.setIndex([0,1,2, 0,2,3]);
        geo.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({ color: colors.slicePlane, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        v.slicePlane = new THREE.Mesh(geo, mat);
        v.scene.add(v.slicePlane);
    }

    function addHorizontalSlicePlane(v, S, T, N) {
        const zSlice = N / 2;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,zSlice, T-S,0,zSlice, T-S,S,zSlice, 0,S,zSlice]), 3));
        geo.setIndex([0,1,2, 0,2,3]);
        geo.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({ color: colors.slicePlane, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        v.slicePlane = new THREE.Mesh(geo, mat);
        v.scene.add(v.slicePlane);
    }

    // ===== BUILD SMALL TILING (view 2) — thick cylinder edges =====
    function buildSmallTilingOnView2(pathsData, N, T, S) {
        const v = views[2];
        if (!v || !v.meshGroup) return;

        while (v.meshGroup.children.length > 0) {
            const child = v.meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            v.meshGroup.remove(child);
        }

        if (!pathsData || pathsData.length === 0) return;

        const pathTriplets = pathsToTriplets(pathsData);

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
            const len = Math.sqrt(n[0]**2+n[1]**2+n[2]**2);
            if (len > 0) { n[0]/=len; n[1]/=len; n[2]/=len; }
            for (let i = 0; i < 4; i++) normals.push(n[0], n[1], n[2]);
            const c = new THREE.Color(color);
            for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
            indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
            // Collect edges for cylinders
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

        placeHorizontalLozenges(pathTriplets, addSquareFace, N, T, S);

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.5, metalness: 0.15
        });
        v.meshGroup.add(new THREE.Mesh(geometry, material));

        // Thick cylinder edges (from why-2-periodic)
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
            v.meshGroup.add(cylinder);
        }
    }

    // ===== 2D DIAGONAL SLICE (from vertical-slice) =====
    function extractDiagonalSlice(pathsData, S_param) {
        if (!pathsData || pathsData.length === 0) return null;
        const N = pathsData.length;
        const T = LARGE_T, S = S_param;
        const pathTriplets = pathsToTriplets(pathsData);
        const crossings = [];

        for (const path of pathTriplets) {
            const z = path[0][2];
            for (let i = 0; i < path.length - 1; i++) {
                const [x1, y1] = path[i], [x2, y2] = path[i+1];
                const d1 = (x1 / S) + (y1 / (T - S)) - 1;
                const d2 = (x2 / S) + (y2 / (T - S)) - 1;
                if (d1 * d2 <= 0 && !(d1 === 0 && d2 === 0)) {
                    let crossY;
                    if (Math.abs(d2 - d1) < 1e-10) crossY = (y1 + y2) / 2;
                    else { const t = -d1 / (d2 - d1); crossY = y1 + t * (y2 - y1); }
                    crossings.push({ u: crossY / (T - S), z });
                    break;
                }
            }
        }
        crossings.sort((a, b) => a.u - b.u);

        const sliceData = [];
        let currentHeight = N;
        sliceData.push({ u: 0, height: currentHeight });
        for (const c of crossings) {
            sliceData.push({ u: c.u, height: currentHeight });
            currentHeight = c.z - 1;
            sliceData.push({ u: c.u, height: currentHeight });
        }
        sliceData.push({ u: 1, height: 0 });
        return sliceData;
    }

    function drawDiagonalSlice(sliceDataArg) {
        const canvas = document.getElementById('bpa-vs-slice');
        if (!canvas || !sliceDataArg || sliceDataArg.length === 0) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width, height = canvas.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const padding = 50;
        const plotWidth = width - 2 * padding, plotHeight = height - 2 * padding;
        const maxH = Math.max(...sliceDataArg.map(d => d.height));
        const minH = Math.min(...sliceDataArg.map(d => d.height));
        const range = maxH - minH || 1;

        ctx.strokeStyle = colors.blue;
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let i = 0; i < sliceDataArg.length; i++) {
            const x = padding + sliceDataArg[i].u * plotWidth;
            const y = height - padding - ((sliceDataArg[i].height - minH) / range) * plotHeight;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // ===== 2D HORIZONTAL SLICE (from spectral-transversal) =====
    function extractHorizontalSlice(pathsData, S_param) {
        if (!pathsData || pathsData.length === 0) return null;
        const N = pathsData.length;
        const pathTriplets = pathsToTriplets(pathsData);
        const zSlice = Math.floor(N / 2);
        const pathIdx = N - zSlice;
        if (pathIdx < 0 || pathIdx >= pathTriplets.length) return null;
        return pathTriplets[pathIdx].map(p => ({ x: p[0], y: p[1] }));
    }

    function drawHorizontalSlice(sliceDataArg) {
        const canvas = document.getElementById('bpa-st-slice');
        if (!canvas || !sliceDataArg || sliceDataArg.length === 0) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width, height = canvas.height;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const padding = 50;
        const sqrt2 = Math.sqrt(2);
        const rotatedData = sliceDataArg.map(d => ({
            rotX: (d.x + d.y) / sqrt2,
            rotY: (d.y - d.x) / sqrt2
        }));

        const maxRX = Math.max(...rotatedData.map(d => d.rotX));
        const minRX = Math.min(...rotatedData.map(d => d.rotX));
        const maxRY = Math.max(...rotatedData.map(d => d.rotY));
        const minRY = Math.min(...rotatedData.map(d => d.rotY));
        const rangeX = maxRX - minRX || 1, rangeY = maxRY - minRY || 1;
        const plotWidth = width - 2 * padding, plotHeight = height - 2 * padding;
        const baseScale = Math.min(plotWidth / rangeX, plotHeight / rangeY);
        const baseOffsetX = (width - rangeX * baseScale) / 2;
        const baseOffsetY = (height - rangeY * baseScale) / 2;

        // Apply 2D zoom transform
        const totalScale = baseScale * slice2D.scale;
        const totalOffsetX = baseOffsetX * slice2D.scale + slice2D.offsetX;
        const totalOffsetY = baseOffsetY * slice2D.scale + slice2D.offsetY;

        ctx.strokeStyle = colors.blue;
        ctx.lineWidth = 5 * slice2D.scale;
        ctx.beginPath();
        for (let i = 0; i < rotatedData.length; i++) {
            const cx = totalOffsetX + (rotatedData[i].rotX - minRX) * totalScale;
            const cy = height - totalOffsetY - (rotatedData[i].rotY - minRY) * totalScale;
            if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    // ===== CAMERA ANIMATION (view 2) =====
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animateCameraView2(fromPos, toPos, duration) {
        if (cameraAnimationId) cancelAnimationFrame(cameraAnimationId);
        const v = views[2];
        if (!v || !v.camera || !v.controls) return;

        const startTime = performance.now();
        const startPos = { x: v.camera.position.x, y: v.camera.position.y, z: v.camera.position.z };
        const startTarget = { x: v.controls.target.x, y: v.controls.target.y, z: v.controls.target.z };
        const startZoom = v.camera.zoom;

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
            v.camera.zoom = startZoom + (toPos.zoom - startZoom) * eased;
            v.camera.updateProjectionMatrix();
            v.controls.update();

            if (t < 1) cameraAnimationId = requestAnimationFrame(animate);
            else cameraAnimationId = null;
        }
        animate();
    }

    // ===== ZOOM ANIMATION (view 1 — barcode interface + 2D slice) =====
    function animateZoomView1(toZoomed, duration) {
        if (zoomAnimationId) cancelAnimationFrame(zoomAnimationId);
        const v = views[1];
        if (!v || !v.camera || !v.controls) return;

        const startTime = performance.now();
        const startPos = { x: v.camera.position.x, y: v.camera.position.y, z: v.camera.position.z };
        const startTarget = { x: v.controls.target.x, y: v.controls.target.y, z: v.controls.target.z };
        const toPos = toZoomed ? cam1Zoomed : cam1Initial;
        // 2D slice zoom
        const start2D = { scale: slice2D.scale, offsetX: slice2D.offsetX, offsetY: slice2D.offsetY };
        const to2D = toZoomed ? slice2DZoomed : slice2DInitial;

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

            // Animate 2D slice zoom in sync
            slice2D.scale = start2D.scale + (to2D.scale - start2D.scale) * eased;
            slice2D.offsetX = start2D.offsetX + (to2D.offsetX - start2D.offsetX) * eased;
            slice2D.offsetY = start2D.offsetY + (to2D.offsetY - start2D.offsetY) * eased;
            if (horizSliceData) drawHorizontalSlice(horizSliceData);

            if (t < 1) zoomAnimationId = requestAnimationFrame(animate);
            else zoomAnimationId = null;
        }
        animate();
    }

    function setCameraImmediate(pos) {
        const v = views[2];
        if (!v || !v.camera || !v.controls) return;
        v.camera.position.set(pos.pos.x, pos.pos.y, pos.pos.z);
        v.controls.target.set(pos.target.x, pos.target.y, pos.target.z);
        v.camera.zoom = pos.zoom;
        v.camera.updateProjectionMatrix();
        v.controls.update();
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

        if (btn1) btn1.addEventListener('click', () => {
            if (cameraAnimationId) return;
            animateCameraView2(cam2Pos2, cam2Pos1, 2000);
            updateButtons(1);
        });
        if (btn2) btn2.addEventListener('click', () => {
            if (cameraAnimationId) return;
            animateCameraView2(cam2Pos1, cam2Pos2, 2000);
            updateButtons(2);
        });
        if (btnResample) btnResample.addEventListener('click', () => {
            if (sampling) return;
            smallSampled = false;
            smallPaths = null;
            sampleSmallTiling();
        });
    }

    // ===== SAMPLING =====
    async function sampleTiling(N, T, S_target, qValue) {
        let S_local = 0;
        wasmInterface.setImaginaryQ(qValue);
        const kappasq = KAPPA * KAPPA;
        const ptr = await wasmInterface.initializeTiling(N, T, 0, 7, -kappasq);
        if (ptr) {
            const jsonStr = Module.UTF8ToString(ptr);
            wasmInterface.freeString(ptr);
            S_local = JSON.parse(jsonStr).s || 0;
        }
        let paths = await wasmInterface.refreshPaths();

        while (S_local < S_target) {
            wasmInterface.setImaginaryQ(qValue);
            const sPtr = await wasmInterface.performSOperator();
            if (sPtr) {
                const jsonStr = Module.UTF8ToString(sPtr);
                wasmInterface.freeString(sPtr);
                S_local = JSON.parse(jsonStr).s;
                paths = await wasmInterface.refreshPaths();
            } else break;
        }
        return { paths: paths.map(p => [...p]), S: S_local };
    }

    async function sampleLargeTiling() {
        if (!wasmReady || sampling || largeSampled) return;
        sampling = true;

        const result = await sampleTiling(LARGE_N, LARGE_T, LARGE_S_TARGET, LARGE_Q);
        largePaths = result.paths;
        largeS = result.S;
        largeSampled = true;

        // Extract slices
        largeSliceData = extractDiagonalSlice(largePaths, largeS);
        horizSliceData = extractHorizontalSlice(largePaths, largeS);

        // Build on views 0 & 1
        if (views[0]) { buildLargeTilingOnView(0, largePaths, LARGE_N, LARGE_T, largeS); drawDiagonalSlice(largeSliceData); }
        if (views[1]) { buildLargeTilingOnView(1, largePaths, LARGE_N, LARGE_T, largeS); drawHorizontalSlice(horizSliceData); }

        sampling = false;

        // Now sample small tiling
        sampleSmallTiling();
    }

    async function sampleSmallTiling() {
        if (!wasmReady || sampling || smallSampled) return;
        sampling = true;

        const result = await sampleTiling(SMALL_N, SMALL_T, SMALL_S_TARGET, SMALL_Q);
        smallPaths = result.paths;
        smallS = result.S;
        smallSampled = true;
        sampling = false;

        // Build on view 2
        if (views[2]) buildSmallTilingOnView2(smallPaths, SMALL_N, SMALL_T, smallS);
    }

    // ===== SHOW/HIDE =====
    function showElement(id) { const el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hideElement(id) { const el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    // ===== SLIDE ENGINE =====
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { startRenderLoop(); },
                pause() {
                    stopRenderLoop();
                    if (cameraAnimationId) { cancelAnimationFrame(cameraAnimationId); cameraAnimationId = null; }
                    if (zoomAnimationId) { cancelAnimationFrame(zoomAnimationId); zoomAnimationId = null; }
                },
                steps: 3,
                onStep(step) {
                    // Step 1: zoom into barcode interface (sim 2 camera)
                    if (step === 1) animateZoomView1(true, 2500);
                    // Step 2: rotate why-2-periodic to position 2
                    if (step === 2) { animateCameraView2(cam2Pos1, cam2Pos2, 2000); updateButtons(2); }
                    // Step 3: rotate why-2-periodic back to position 1
                    if (step === 3) { animateCameraView2(cam2Pos2, cam2Pos1, 2000); updateButtons(1); }
                },
                onStepBack(step) {
                    if (step < 1) { animateZoomView1(false, 2500); }
                    if (step < 2) { setCameraImmediate(cam2Pos1); updateButtons(1); }
                    if (step < 3) { setCameraImmediate(cam2Pos2); updateButtons(2); }
                },
                reset() {
                    slice2D.scale = 1; slice2D.offsetX = 0; slice2D.offsetY = 0;
                },
                onSlideEnter() {
                    // Create views
                    views[0] = createPerspectiveView('bpa-vs-3d', {x: 165.8, y: 26.1, z: 106.0}, {x: 73.8, y: 40.0, z: 48.1});
                    views[1] = createPerspectiveView('bpa-st-3d', cam1Initial.pos, cam1Initial.target);
                    views[2] = createOrthographicView('bpa-w2p');

                    startRenderLoop();
                    setupButtonHandlers();
                    setCameraImmediate(cam2Pos1);
                    updateButtons(1);

                    // Start sampling
                    if (!largeSampled && !sampling) {
                        setTimeout(() => sampleLargeTiling(), 100);
                    } else {
                        if (largeSampled && views[0]) { buildLargeTilingOnView(0, largePaths, LARGE_N, LARGE_T, largeS); drawDiagonalSlice(largeSliceData); }
                        if (largeSampled && views[1]) { buildLargeTilingOnView(1, largePaths, LARGE_N, LARGE_T, largeS); drawHorizontalSlice(horizSliceData); }
                        if (smallSampled && views[2]) buildSmallTilingOnView2(smallPaths, SMALL_N, SMALL_T, smallS);
                    }
                },
                onSlideLeave() {
                    if (cameraAnimationId) { cancelAnimationFrame(cameraAnimationId); cameraAnimationId = null; }
                    if (zoomAnimationId) { cancelAnimationFrame(zoomAnimationId); zoomAnimationId = null; }
                    disposeAllViews();
                    largePaths = null; largeSampled = false; largeSliceData = null; horizSliceData = null;
                    smallPaths = null; smallSampled = false;
                }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
