// APPROVED: Do not modify without explicit user request
/**
 * Hard to Sample Slide — q-Racah CFTP (monotone sandwich)
 *
 * Forward-coupled CFTP on a hexagonal lozenge tiling with q-Racah weights:
 * each horizontal lozenge at height h has weight q^(h-N/2) + q^(-(h-N/2)).
 * Height h ranges from 0 (floor) to N (ceiling).
 *
 * Shows the monotone sandwich (min/max bounds) collapsing slowly,
 * demonstrating that exact sampling via CFTP is hard for these weights.
 *
 * Uses LozengeModule WASM for initialization (extremal states).
 * Uses QRacahModule WASM for the coupled Glauber dynamics hot loop.
 *
 * Slide ID: 'hard-to-sample'
 * Canvas: hard-to-sample-canvas
 * Status: hard-to-sample-status
 */

(function initHardToSampleSim() {
    if (!window.slideEngine) {
        setTimeout(initHardToSampleSim, 50);
        return;
    }

    const canvas = document.getElementById('hard-to-sample-canvas');
    const statusEl = document.getElementById('hard-to-sample-status');
    if (!canvas) return;

    // ===================================================================
    // Configuration
    // ===================================================================

    const HEX_SIDE = 35;
    const Q_PARAM = 0.67;

    // ===================================================================
    // WASM setup: LozengeModule for init, QRacahModule for dynamics
    // ===================================================================

    let wasm = null;       // LozengeModule instance
    let funcs = null;      // LozengeModule wrapped functions
    let qrWasm = null;     // QRacahModule instance
    let qrFuncs = null;    // QRacahModule wrapped functions
    let wasmInitPromise = null;

    function generateHexagonTriangles(a) {
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);

        function getVertex(n, j) {
            return { x: n, y: slope * n + j * deltaC };
        }

        function getRightCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }

        function getLeftCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }

        const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
        const boundary = [];
        let bn = 0, bj = 0;
        for (let dir = 0; dir < 6; dir++) {
            const [dn, dj] = directions[dir];
            for (let step = 0; step < a; step++) {
                boundary.push(getVertex(bn, bj));
                bn += dn; bj += dj;
            }
        }

        function pointInPolygon(px, py, poly) {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i].x, yi = poly[i].y;
                const xj = poly[j].x, yj = poly[j].y;
                if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                    inside = !inside;
                }
            }
            return inside;
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of boundary) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }
        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        const triangles = [];
        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                const rc = getRightCentroid(n, j);
                if (pointInPolygon(rc.x, rc.y, boundary)) {
                    triangles.push(n, j, 1);
                }
                const lc = getLeftCentroid(n, j);
                if (pointInPolygon(lc.x, lc.y, boundary)) {
                    triangles.push(n, j, 2);
                }
            }
        }
        return triangles;
    }

    async function initWasm() {
        if (wasm && qrWasm) return true;
        if (wasmInitPromise) return wasmInitPromise;
        wasmInitPromise = (async () => {
            if (typeof LozengeModule === 'undefined') {
                console.warn('hard-to-sample: LozengeModule not available');
                return false;
            }
            if (typeof QRacahModule === 'undefined') {
                console.warn('hard-to-sample: QRacahModule not available');
                return false;
            }
            try {
                wasm = await LozengeModule();
                funcs = {
                    initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
                    initCFTP: wasm.cwrap('initCFTP', 'number', []),
                    getGridBounds: wasm.cwrap('getGridBounds', 'number', []),
                    getCFTPMinGridData: wasm.cwrap('getCFTPMinGridData', 'number', []),
                    getCFTPMaxGridData: wasm.cwrap('getCFTPMaxGridData', 'number', []),
                    freeString: wasm.cwrap('freeString', null, ['number']),
                };

                qrWasm = await QRacahModule();
                qrFuncs = {
                    initGrid: qrWasm.cwrap('initGrid', null, ['number', 'number', 'number', 'number']),
                    loadGrids: qrWasm.cwrap('loadGrids', null, ['number', 'number', 'number']),
                    loadBlackTriangles: qrWasm.cwrap('loadBlackTriangles', null, ['number', 'number']),
                    setParams: qrWasm.cwrap('setParams', null, ['number', 'number']),
                    computeHeights: qrWasm.cwrap('computeHeights', null, []),
                    runSweeps: qrWasm.cwrap('runSweeps', 'number', ['number']),
                    getMinGridPtr: qrWasm.cwrap('getMinGridPtr', 'number', []),
                    getMaxGridPtr: qrWasm.cwrap('getMaxGridPtr', 'number', []),
                    getGridSize: qrWasm.cwrap('getGridSize', 'number', []),
                    freeString: qrWasm.cwrap('freeString', null, ['number']),
                };

                return true;
            } catch (e) {
                console.error('hard-to-sample: Failed to init WASM:', e);
                wasm = null;
                qrWasm = null;
                return false;
            }
        })();
        return wasmInitPromise;
    }

    function wasmCallJSON(fn) {
        const ptr = fn();
        const str = wasm.UTF8ToString(ptr);
        funcs.freeString(ptr);
        return JSON.parse(str);
    }

    // ===================================================================
    // Grid state (kept in JS for rendering only)
    // ===================================================================

    let blackTriangles = [];
    let gridMinN, gridMaxN, gridMinJ, gridMaxJ, gridStrideJ, gridSize;
    let cachedTriArr = null;

    function jsIdx(n, j) {
        return (n - gridMinN) * gridStrideJ + (j - gridMinJ);
    }

    // Export grid to dimer list for rendering — reads from WASM memory
    function exportDimerListFromWasm(gridPtr) {
        const dimers = [];
        for (const bt of blackTriangles) {
            const gi = jsIdx(bt.n, bt.j);
            const type = qrWasm.getValue(gridPtr + gi, 'i8');
            if (type >= 0 && type <= 2) dimers.push({bn: bt.n, bj: bt.j, t: type});
        }
        return dimers;
    }

    // ===================================================================
    // WASM initialization: get min and max extremal tilings, load into QRacahModule
    // ===================================================================

    async function initFromWasm() {
        cachedTriArr = generateHexagonTriangles(HEX_SIDE);
        const ptr = wasm._malloc(cachedTriArr.length * 4);
        for (let i = 0; i < cachedTriArr.length; i++) {
            wasm.setValue(ptr + i * 4, cachedTriArr[i], 'i32');
        }
        funcs.initFromTriangles(ptr, cachedTriArr.length);
        wasm._free(ptr);

        // Get grid bounds from LozengeModule
        const boundsPtr = funcs.getGridBounds();
        const bounds = JSON.parse(wasm.UTF8ToString(boundsPtr));
        funcs.freeString(boundsPtr);

        gridMinN = bounds.minN;
        gridMaxN = bounds.maxN;
        gridMinJ = bounds.minJ;
        gridMaxJ = bounds.maxJ;
        gridStrideJ = bounds.maxJ - bounds.minJ + 1;
        gridSize = bounds.size;

        // Get min and max extremal states from LozengeModule
        wasmCallJSON(funcs.initCFTP);
        const minPtr = funcs.getCFTPMinGridData();
        const maxPtr = funcs.getCFTPMaxGridData();

        // Initialize QRacahModule grid
        qrFuncs.initGrid(gridMinN, gridMaxN, gridMinJ, gridMaxJ);
        qrFuncs.setParams(Q_PARAM, HEX_SIDE);

        // Copy grids from LozengeModule → QRacahModule
        const qrMinPtr = qrWasm._malloc(gridSize * 4);
        const qrMaxPtr = qrWasm._malloc(gridSize * 4);
        for (let i = 0; i < gridSize; i++) {
            const minVal = wasm.getValue(minPtr + i * 4, 'i32');
            const maxVal = wasm.getValue(maxPtr + i * 4, 'i32');
            qrWasm.setValue(qrMinPtr + i * 4, minVal, 'i32');
            qrWasm.setValue(qrMaxPtr + i * 4, maxVal, 'i32');
        }
        qrFuncs.loadGrids(qrMinPtr, qrMaxPtr, gridSize);
        qrWasm._free(qrMinPtr);
        qrWasm._free(qrMaxPtr);
        wasm._free(minPtr);
        wasm._free(maxPtr);

        // Build black triangle list and load into QRacahModule
        blackTriangles = [];
        for (let i = 0; i < cachedTriArr.length; i += 3) {
            if (cachedTriArr[i + 2] === 1) {
                blackTriangles.push({n: cachedTriArr[i], j: cachedTriArr[i + 1]});
            }
        }

        const btPtr = qrWasm._malloc(blackTriangles.length * 2 * 4);
        for (let i = 0; i < blackTriangles.length; i++) {
            qrWasm.setValue(btPtr + i * 8, blackTriangles[i].n, 'i32');
            qrWasm.setValue(btPtr + i * 8 + 4, blackTriangles[i].j, 'i32');
        }
        qrFuncs.loadBlackTriangles(btPtr, blackTriangles.length);
        qrWasm._free(btPtr);

        // Compute initial heights via BFS
        qrFuncs.computeHeights();
    }

    // ===================================================================
    // Three.js (same metallic style as CFTP slide)
    // ===================================================================

    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let renderLoopId = null;
    let animating = false;
    let autoRotating = false;

    const frustumSize = 40;

    function initThreeJS() {
        if (renderer) return;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1.5;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, -5000, 6000
        );

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.rotateSpeed = 0.8;
        controls.enablePan = true;
        controls.enableZoom = true;

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

        camera.position.set(-62.7, -5.5, 39.3);
        camera.zoom = 0.90;
        camera.updateProjectionMatrix();
        controls.target.set(-17.0, -17.6, 17.2);
        controls.update();

        resize();
    }

    function resize() {
        if (!renderer || !camera) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        const aspect = w / h;
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
    }

    function startRenderLoop() {
        if (renderLoopId) return;
        function loop() {
            if (!renderer || !camera || !controls) return;
            if (autoRotating) {
                const offset = camera.position.clone().sub(controls.target);
                const cosA = Math.cos(0.003), sinA = Math.sin(0.003);
                const newX = offset.x * cosA - offset.y * sinA;
                const newY = offset.x * sinA + offset.y * cosA;
                offset.x = newX; offset.y = newY;
                camera.position.copy(controls.target).add(offset);
            }
            controls.update();
            renderer.render(scene, camera);
            renderLoopId = requestAnimationFrame(loop);
        }
        loop();
    }

    function stopRenderLoop() {
        if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
    }

    function disposeThreeJS() {
        stopRenderLoop();
        animating = false;
        autoRotating = false;
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

    // ===================================================================
    // Dimer → 3D geometry
    // ===================================================================

    const getVertexKeys = (dimer) => {
        const { bn, bj, t } = dimer;
        if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
        if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
        return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
    };

    const getHeightPattern = (t) => {
        if (t === 0) return [0, 0, 0, 0];
        if (t === 1) return [1, 0, 0, 1];
        return [1, 1, 0, 0];
    };

    const to3D = (n, j, h) => ({ x: h, y: -n - h, z: j - h });

    function computeHeights(dimers) {
        const vertexToDimers = new Map();
        for (const dimer of dimers) {
            for (const [n, j] of getVertexKeys(dimer)) {
                const key = `${n},${j}`;
                if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                vertexToDimers.get(key).push(dimer);
            }
        }
        const heights = new Map();
        if (dimers.length > 0) {
            const firstVerts = getVertexKeys(dimers[0]);
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
                    const myIdx = verts.findIndex(([n, j]) => n === cn && j === cj);
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
        }
        return heights;
    }

    const UVA_COLORS = ['#F9DCBF', '#232D4B', '#E57200'];

    function buildSurface(dimers, heights, opacity, colorMod) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [], normals = [], vertexColors = [], indices = [];

        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            const v3d = verts.map(([n, j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
            const baseIndex = vertices.length / 3;
            for (const v of v3d) vertices.push(v.x, v.y, v.z);
            const e1 = { x: v3d[1].x-v3d[0].x, y: v3d[1].y-v3d[0].y, z: v3d[1].z-v3d[0].z };
            const e2 = { x: v3d[3].x-v3d[0].x, y: v3d[3].y-v3d[0].y, z: v3d[3].z-v3d[0].z };
            const nx = e1.y*e2.z - e1.z*e2.y, ny = e1.z*e2.x - e1.x*e2.z, nz = e1.x*e2.y - e1.y*e2.x;
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
            for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
            const c = new THREE.Color(UVA_COLORS[dimer.t]);
            c.r *= colorMod; c.g *= colorMod; c.b *= colorMod;
            for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
            indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();

        return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true,
            roughness: 0.5, metalness: 0.15,
            transparent: true, opacity: opacity, depthWrite: opacity > 0.9
        }));
    }

    // ===================================================================
    // Rendering
    // ===================================================================

    function clearMesh() {
        if (!meshGroup) return;
        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }
    }

    function renderBounds(minDimers, maxDimers) {
        clearMesh();
        if (!meshGroup) return;
        if (maxDimers && maxDimers.length > 0) {
            const maxH = computeHeights(maxDimers);
            meshGroup.add(buildSurface(maxDimers, maxH, 0.6, 1.0));
        }
        if (minDimers && minDimers.length > 0) {
            const minH = computeHeights(minDimers);
            meshGroup.add(buildSurface(minDimers, minH, 0.6, 0.7));
        }
    }

    function renderCoalesced(dimers) {
        clearMesh();
        if (!meshGroup) return;
        if (!dimers || dimers.length === 0) return;
        const heights = computeHeights(dimers);
        const mesh = buildSurface(dimers, heights, 1.0, 1.0);
        meshGroup.add(mesh);
        if (mesh.geometry) {
            const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 10);
            meshGroup.add(new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({
                color: 0x000000, opacity: 0.6, transparent: true
            })));
        }
    }

    // ===================================================================
    // Animated CFTP with q-Racah weights (slow convergence)
    // Gradual ramp: start at JS pace (~50 sweeps/render), speed up over time
    // ===================================================================

    const RENDER_INTERVAL = 500;  // ms between redraws (constant)

    // Batch size ramp: [sweepThreshold, batchSize] — sweeps per WASM call
    // Starts matching JS speed, then gradually accelerates
    const BATCH_RAMP = [
        [0,      10],      // 0–5K: 10 sweeps/batch (JS-like pace)
        [5000,   50],      // 5K–20K: 50 sweeps/batch
        [20000,  200],     // 20K–100K: 200 sweeps/batch
        [100000, 1000],    // 100K–500K: 1000 sweeps/batch
        [500000, 5000],    // 500K+: full speed
    ];

    function getBatchSize(sweeps) {
        let batch = BATCH_RAMP[0][1];
        for (const [threshold, size] of BATCH_RAMP) {
            if (sweeps >= threshold) batch = size;
        }
        return batch;
    }

    let stepGeneration = 0;

    function formatSweeps(n) {
        if (n < 1000) return '' + n;
        if (n < 1e6) return (n / 1e3).toFixed(1) + 'K';
        return (n / 1e6).toFixed(1) + 'M';
    }

    async function runAnimated(gen) {
        if (!wasm || !funcs || !qrWasm || !qrFuncs) return;
        animating = true;
        autoRotating = false;

        await initFromWasm();
        if (gen !== stepGeneration) return;

        // Get WASM grid pointers for reading
        const minGridPtr = qrFuncs.getMinGridPtr();
        const maxGridPtr = qrFuncs.getMaxGridPtr();

        // Show initial min/max bounds
        if (meshGroup) {
            const minDimers = exportDimerListFromWasm(minGridPtr);
            const maxDimers = exportDimerListFromWasm(maxGridPtr);
            renderBounds(minDimers, maxDimers);
        }
        if (statusEl) statusEl.textContent = 'coupled Glauber: step 0';

        // Coupled step loop: gradual ramp from JS pace to WASM full speed
        let sweepCount = 0;
        let lastRender = performance.now();

        while (animating && gen === stepGeneration) {
            // Determine batch size based on current sweep count
            const batchSize = getBatchSize(sweepCount);

            // Run sweeps in WASM
            const resultPtr = qrFuncs.runSweeps(batchSize);
            const resultStr = qrWasm.UTF8ToString(resultPtr);
            const result = JSON.parse(resultStr);
            sweepCount += batchSize;
            const coalesced = result.status === 'coalesced';

            const now = performance.now();
            if (coalesced || now - lastRender >= RENDER_INTERVAL) {
                lastRender = now;

                if (coalesced) {
                    if (statusEl) statusEl.textContent = 'coalesced at step ' + formatSweeps(sweepCount);
                    break;
                }

                // Render current bounds
                if (meshGroup) {
                    const minDimers = exportDimerListFromWasm(minGridPtr);
                    const maxDimers = exportDimerListFromWasm(maxGridPtr);
                    renderBounds(minDimers, maxDimers);
                }
                if (statusEl) {
                    statusEl.textContent = 'coupled Glauber: step ' + formatSweeps(sweepCount);
                }
            }

            // Yield to browser
            await new Promise(r => setTimeout(r, 4));
            if (gen !== stepGeneration) return;
        }

        // If coalesced, show final surface
        if (animating && meshGroup && gen === stepGeneration) {
            const dimers = exportDimerListFromWasm(minGridPtr);
            renderCoalesced(dimers);
            autoRotating = true;
        }
        animating = false;
    }

    // ===================================================================
    // Slide engine
    // ===================================================================

    function disposeAll() {
        stepGeneration++;
        animating = false;
        autoRotating = false;
        blackTriangles = [];
        disposeThreeJS();
        if (statusEl) statusEl.textContent = '';
    }

    function startAnimation() {
        const gen = ++stepGeneration;
        (async () => {
            const ok = await initWasm();
            if (!ok) { console.warn('hard-to-sample: WASM not available'); return; }
            if (gen !== stepGeneration) return;
            initThreeJS();
            startRenderLoop();
            await runAnimated(gen);
        })().catch(e => console.error('hard-to-sample error:', e));
    }

    window.slideEngine.registerSimulation('hard-to-sample', {
        steps: 1,

        onSlideEnter: function() {
            disposeAll();
            startAnimation();
        },

        onSlideLeave: function() {
            disposeAll();
        },

        onStep: function(step) {
            if (step === 1) {
                disposeAll();
                startAnimation();
            }
        },

        onStepBack: function(step) {
            if (step === 0) {
                disposeAll();
                startAnimation();
            }
        },

        reset: function() {
            disposeAll();
        }
    }, 0);
})();
