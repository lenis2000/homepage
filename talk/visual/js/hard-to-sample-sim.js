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
 * Uses WASM for initialization (extremal states from CFTP).
 * Coupled Glauber dynamics runs in pure JS with height-dependent acceptance.
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
    const Q_PARAM = 0.7;

    // Precompute q-Racah weight w(h) = q^(h-N/2) + q^(-(h-N/2))
    // and acceptance ratios for all valid h
    const qRW = new Float64Array(HEX_SIDE + 2);
    const ratioUp = new Float64Array(HEX_SIDE + 1);   // min(1, w(h+1)/w(h))
    const ratioDown = new Float64Array(HEX_SIDE + 1); // min(1, w(h-1)/w(h))
    for (let h = 0; h <= HEX_SIDE + 1; h++) {
        const a = h - HEX_SIDE / 2;
        qRW[h] = Math.pow(Q_PARAM, a) + Math.pow(Q_PARAM, -a);
    }
    for (let h = 0; h <= HEX_SIDE; h++) {
        ratioUp[h] = (h < HEX_SIDE) ? Math.min(1.0, qRW[h + 1] / qRW[h]) : 0;
        ratioDown[h] = (h > 0) ? Math.min(1.0, qRW[h - 1] / qRW[h]) : 0;
    }

    // ===================================================================
    // WASM setup (for initialization only)
    // ===================================================================

    let wasm = null;
    let funcs = null;
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
        if (wasm) return true;
        if (wasmInitPromise) return wasmInitPromise;
        wasmInitPromise = (async () => {
            if (typeof LozengeModule === 'undefined') {
                console.warn('hard-to-sample: LozengeModule not available');
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
                return true;
            } catch (e) {
                console.error('hard-to-sample: Failed to init LozengeModule:', e);
                wasm = null;
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
    // JS CFTP state (two coupled chains: min and max)
    // ===================================================================

    let jsGridMin = null;        // Int8Array: dimer grid for min (lower) chain
    let jsGridMax = null;        // Int8Array: dimer grid for max (upper) chain
    let heightArrMin = null;     // Int32Array: height function for min chain (indexed by grid pos)
    let heightArrMax = null;     // Int32Array: height function for max chain
    let blackTriangles = [];     // [{n, j}, ...]: all black triangles in region
    let vertN = null;            // Int32Array: n-coordinates of internal vertices (flat)
    let vertJ = null;            // Int32Array: j-coordinates of internal vertices (flat)
    let vertIdx = null;          // Int32Array: pre-computed grid indices for internal vertices
    let numVerts = 0;
    // Pre-computed grid index offsets for the 3 triangles around a vertex (n,j):
    // tri1 = (n, j+1), tri2 = (n, j), tri3 = (n-1, j+1)
    let vertIdx1 = null;         // Int32Array: grid index for (n, j+1)
    let vertIdx2 = null;         // Int32Array: grid index for (n, j)
    let vertIdx3 = null;         // Int32Array: grid index for (n-1, j+1)
    let gridMinN, gridMaxN, gridMinJ, gridMaxJ, gridStrideJ, gridSize;
    let totalSteps = 0;
    let cachedTriArr = null;

    function jsIdx(n, j) {
        return (n - gridMinN) * gridStrideJ + (j - gridMinJ);
    }

    function gridGet(grid, n, j) {
        if (n < gridMinN || n > gridMaxN || j < gridMinJ || j > gridMaxJ) return -1;
        return grid[jsIdx(n, j)];
    }

    function gridSet(grid, n, j, type) {
        grid[jsIdx(n, j)] = type;
    }

    // Build list of internal vertices where Glauber rotations can occur.
    // Stores as flat typed arrays for fast iteration.
    function buildInternalVerts() {
        // Use a flat boolean array instead of string Set
        const blackTriGrid = new Uint8Array(gridSize);
        for (const bt of blackTriangles) {
            blackTriGrid[jsIdx(bt.n, bt.j)] = 1;
        }

        const tempN = [], tempJ = [];
        const seen = new Uint8Array(gridSize);
        for (const bt of blackTriangles) {
            const candidates = [[bt.n, bt.j - 1], [bt.n, bt.j], [bt.n + 1, bt.j - 1]];
            for (const [cn, cj] of candidates) {
                if (cn < gridMinN || cn > gridMaxN || cj < gridMinJ || cj > gridMaxJ) continue;
                const ci = jsIdx(cn, cj);
                if (seen[ci]) continue;
                seen[ci] = 1;
                // Check 3 neighboring black triangles exist
                const n = cn, j = cj;
                if (n >= gridMinN && n <= gridMaxN && j + 1 >= gridMinJ && j + 1 <= gridMaxJ &&
                    n >= gridMinN && n <= gridMaxN && j >= gridMinJ && j <= gridMaxJ &&
                    n - 1 >= gridMinN && n - 1 <= gridMaxN && j + 1 >= gridMinJ && j + 1 <= gridMaxJ &&
                    blackTriGrid[jsIdx(n, j + 1)] &&
                    blackTriGrid[jsIdx(n, j)] &&
                    blackTriGrid[jsIdx(n - 1, j + 1)]) {
                    tempN.push(n);
                    tempJ.push(j);
                }
            }
        }
        numVerts = tempN.length;
        vertN = new Int32Array(tempN);
        vertJ = new Int32Array(tempJ);
        vertIdx = new Int32Array(numVerts);
        vertIdx1 = new Int32Array(numVerts);
        vertIdx2 = new Int32Array(numVerts);
        vertIdx3 = new Int32Array(numVerts);
        for (let i = 0; i < numVerts; i++) {
            vertIdx[i] = jsIdx(vertN[i], vertJ[i]);
            vertIdx1[i] = jsIdx(vertN[i], vertJ[i] + 1);
            vertIdx2[i] = jsIdx(vertN[i], vertJ[i]);
            vertIdx3[i] = jsIdx(vertN[i] - 1, vertJ[i] + 1);
        }
    }

    // Compute height function from a dimer grid via BFS.
    // Returns Int32Array indexed by grid position.
    function computeHeightsFromGrid(grid) {
        const heights = new Int32Array(gridSize);
        const visited = new Uint8Array(gridSize);
        const dimers = [];
        for (const bt of blackTriangles) {
            const type = gridGet(grid, bt.n, bt.j);
            if (type >= 0 && type <= 2) dimers.push({bn: bt.n, bj: bt.j, t: type});
        }
        if (dimers.length === 0) return heights;

        // Build vertex→dimer adjacency using grid indices
        // Each vertex can appear in up to ~6 dimers; use a flat structure
        const adjCount = new Uint8Array(gridSize);
        const adjData = [];  // will store [dimerIdx, vertIdxInDimer] pairs per grid cell
        const adjOffset = new Int32Array(gridSize + 1);

        // First pass: count adjacencies
        for (let di = 0; di < dimers.length; di++) {
            const verts = getVertexKeys(dimers[di]);
            for (const [vn, vj] of verts) {
                if (vn >= gridMinN && vn <= gridMaxN && vj >= gridMinJ && vj <= gridMaxJ) {
                    adjCount[jsIdx(vn, vj)]++;
                }
            }
        }
        // Compute offsets
        adjOffset[0] = 0;
        for (let i = 0; i < gridSize; i++) adjOffset[i + 1] = adjOffset[i] + adjCount[i];
        const totalAdj = adjOffset[gridSize];
        const adjDimerIdx = new Int32Array(totalAdj);
        const adjVertPos = new Int32Array(totalAdj);
        const adjFill = new Int32Array(gridSize);

        // Second pass: fill adjacency
        for (let di = 0; di < dimers.length; di++) {
            const verts = getVertexKeys(dimers[di]);
            for (let vi = 0; vi < verts.length; vi++) {
                const [vn, vj] = verts[vi];
                if (vn >= gridMinN && vn <= gridMaxN && vj >= gridMinJ && vj <= gridMaxJ) {
                    const gi = jsIdx(vn, vj);
                    const pos = adjOffset[gi] + adjFill[gi];
                    adjDimerIdx[pos] = di;
                    adjVertPos[pos] = vi;
                    adjFill[gi]++;
                }
            }
        }

        // BFS using grid indices
        const firstVerts = getVertexKeys(dimers[0]);
        const startIdx = jsIdx(firstVerts[0][0], firstVerts[0][1]);
        heights[startIdx] = 0;
        visited[startIdx] = 1;
        const queue = [startIdx, firstVerts[0][0], firstVerts[0][1]];
        let qHead = 0;

        while (qHead < queue.length) {
            const curIdx = queue[qHead];
            const curN = queue[qHead + 1];
            const curJ = queue[qHead + 2];
            qHead += 3;
            const curH = heights[curIdx];

            for (let a = adjOffset[curIdx]; a < adjOffset[curIdx] + adjCount[curIdx]; a++) {
                const d = dimers[adjDimerIdx[a]];
                const myPos = adjVertPos[a];
                const verts = getVertexKeys(d);
                const pattern = getHeightPattern(d.t);
                for (let i = 0; i < 4; i++) {
                    const [vn, vj] = verts[i];
                    if (vn >= gridMinN && vn <= gridMaxN && vj >= gridMinJ && vj <= gridMaxJ) {
                        const vi = jsIdx(vn, vj);
                        if (!visited[vi]) {
                            visited[vi] = 1;
                            heights[vi] = curH + (pattern[i] - pattern[myPos]);
                            queue.push(vi, vn, vj);
                        }
                    }
                }
            }
        }

        // Normalize so min height = 0
        let minH = Infinity;
        for (let i = 0; i < gridSize; i++) {
            if (visited[i]) minH = Math.min(minH, heights[i]);
        }
        if (minH !== 0) {
            for (let i = 0; i < gridSize; i++) {
                if (visited[i]) heights[i] -= minH;
            }
        }
        return heights;
    }

    // One coupled step: visit all internal vertices with shared random coins.
    // Uses flat typed arrays — no string allocation in hot loop.
    function coupledSweep() {
        const gMin = jsGridMin, gMax = jsGridMax;
        const hMin = heightArrMin, hMax = heightArrMax;
        const rUp = ratioUp, rDown = ratioDown;
        const nv = numVerts;

        for (let vi = 0; vi < nv; vi++) {
            const i1 = vertIdx1[vi];
            const i2 = vertIdx2[vi];
            const i3 = vertIdx3[vi];

            // Min chain state
            const dMin1 = gMin[i1], dMin2 = gMin[i2], dMin3 = gMin[i3];
            const minEven = (dMin1 === 1 && dMin2 === 2 && dMin3 === 0);
            const minOdd = (dMin1 === 2 && dMin2 === 0 && dMin3 === 1);

            // Max chain state
            const dMax1 = gMax[i1], dMax2 = gMax[i2], dMax3 = gMax[i3];
            const maxEven = (dMax1 === 1 && dMax2 === 2 && dMax3 === 0);
            const maxOdd = (dMax1 === 2 && dMax2 === 0 && dMax3 === 1);

            if (!minEven && !minOdd && !maxEven && !maxOdd) continue;

            const u = Math.random();
            const idx = vertIdx[vi];
            const hmn = hMin[idx];
            const hmx = hMax[idx];

            if (u < 0.5) {
                // Try DOWN (even→odd): height decreases
                const uScaled = u * 2;
                if (minEven && hmn > 0 && uScaled < rDown[hmn]) {
                    gMin[i1] = 2; gMin[i2] = 0; gMin[i3] = 1;
                    hMin[idx] = hmn - 1;
                }
                if (maxEven && hmx > 0 && uScaled < rDown[hmx]) {
                    gMax[i1] = 2; gMax[i2] = 0; gMax[i3] = 1;
                    hMax[idx] = hmx - 1;
                }
            } else {
                // Try UP (odd→even): height increases
                const uScaled = (u - 0.5) * 2;
                if (minOdd && hmn < HEX_SIDE && uScaled < rUp[hmn]) {
                    gMin[i1] = 1; gMin[i2] = 2; gMin[i3] = 0;
                    hMin[idx] = hmn + 1;
                }
                if (maxOdd && hmx < HEX_SIDE && uScaled < rUp[hmx]) {
                    gMax[i1] = 1; gMax[i2] = 2; gMax[i3] = 0;
                    hMax[idx] = hmx + 1;
                }
            }
        }
        totalSteps += nv;
    }

    // Check if the two grids have coalesced (are identical)
    function checkCoalesced() {
        for (let i = 0; i < gridSize; i++) {
            if (jsGridMin[i] !== jsGridMax[i]) return false;
        }
        return true;
    }

    // Export grid to dimer list for rendering
    function exportDimerListFromGrid(grid) {
        const dimers = [];
        for (const bt of blackTriangles) {
            const type = gridGet(grid, bt.n, bt.j);
            if (type >= 0 && type <= 2) dimers.push({bn: bt.n, bj: bt.j, t: type});
        }
        return dimers;
    }

    // ===================================================================
    // WASM initialization: get min and max extremal tilings
    // ===================================================================

    async function initFromWasm() {
        cachedTriArr = generateHexagonTriangles(HEX_SIDE);
        const ptr = wasm._malloc(cachedTriArr.length * 4);
        for (let i = 0; i < cachedTriArr.length; i++) {
            wasm.setValue(ptr + i * 4, cachedTriArr[i], 'i32');
        }
        funcs.initFromTriangles(ptr, cachedTriArr.length);
        wasm._free(ptr);

        // Get grid bounds
        const boundsPtr = funcs.getGridBounds();
        const bounds = JSON.parse(wasm.UTF8ToString(boundsPtr));
        funcs.freeString(boundsPtr);

        gridMinN = bounds.minN;
        gridMaxN = bounds.maxN;
        gridMinJ = bounds.minJ;
        gridMaxJ = bounds.maxJ;
        gridStrideJ = bounds.maxJ - bounds.minJ + 1;
        gridSize = bounds.size;

        // Get min and max extremal states
        wasmCallJSON(funcs.initCFTP);

        const minPtr = funcs.getCFTPMinGridData();
        const maxPtr = funcs.getCFTPMaxGridData();

        jsGridMin = new Int8Array(gridSize);
        jsGridMax = new Int8Array(gridSize);
        for (let i = 0; i < gridSize; i++) {
            jsGridMin[i] = wasm.getValue(minPtr + i * 4, 'i32');
            jsGridMax[i] = wasm.getValue(maxPtr + i * 4, 'i32');
        }
        wasm._free(minPtr);
        wasm._free(maxPtr);

        // Build black triangle list
        blackTriangles = [];
        for (let i = 0; i < cachedTriArr.length; i += 3) {
            if (cachedTriArr[i + 2] === 1) {
                blackTriangles.push({n: cachedTriArr[i], j: cachedTriArr[i + 1]});
            }
        }

        totalSteps = 0;
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
        scene.background = new THREE.Color(0x1a1a2e);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1.5;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, -5000, 6000
        );

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.enablePan = true;
        controls.enableZoom = true;

        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        const hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(15, 20, 5);
        scene.add(dir);
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-10, 5, -5);
        scene.add(fill);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        camera.position.set(27.9, -7.7, 41.8);
        camera.zoom = 0.77;
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
            const c = new THREE.Color('#FFFFFF');
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
            roughness: 0.3, metalness: 0.35, color: 0xddeeff,
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
                color: 0x444466, opacity: 0.4, transparent: true
            })));
        }
    }

    // ===================================================================
    // Animated CFTP with q-Racah weights (slow convergence)
    // ===================================================================

    const RENDER_INTERVAL_SLOW = 500;   // ms between redraws before threshold
    const RENDER_INTERVAL_FAST = 2000;  // ms between redraws after threshold
    const BATCH_SIZE = 50;        // steps per batch before yielding
    const BOOST_THRESHOLD = 100000;
    const YIELD_MS = 10;          // ms to yield to browser between batches

    let stepGeneration = 0;

    function formatSweeps(n) {
        if (n < 1000) return '' + n;
        if (n < 1e6) return (n / 1e3).toFixed(1) + 'K';
        return (n / 1e6).toFixed(1) + 'M';
    }

    async function runAnimated(gen) {
        if (!wasm || !funcs) return;
        animating = true;
        autoRotating = false;

        await initFromWasm();
        if (gen !== stepGeneration) return;

        // Compute initial height functions for both chains
        heightArrMin = computeHeightsFromGrid(jsGridMin);
        heightArrMax = computeHeightsFromGrid(jsGridMax);
        buildInternalVerts();

        // Show initial min/max bounds
        if (meshGroup) {
            const minDimers = exportDimerListFromGrid(jsGridMin);
            const maxDimers = exportDimerListFromGrid(jsGridMax);
            renderBounds(minDimers, maxDimers);
        }
        if (statusEl) statusEl.textContent = 'coupled Glauber: step 0';

        // Coupled step loop: run in small batches, render periodically
        let stepCount = 0;
        let lastRender = performance.now();

        while (animating && gen === stepGeneration) {
            // Run a batch of steps
            for (let s = 0; s < BATCH_SIZE; s++) {
                coupledSweep();
            }
            stepCount += BATCH_SIZE;

            const renderInterval = stepCount < BOOST_THRESHOLD ? RENDER_INTERVAL_SLOW : RENDER_INTERVAL_FAST;
            const now = performance.now();
            if (now - lastRender >= renderInterval) {
                lastRender = now;

                // Check for coalescence
                if (checkCoalesced()) {
                    if (statusEl) statusEl.textContent = 'coalesced at step ' + formatSweeps(stepCount);
                    break;
                }

                // Render current bounds
                if (meshGroup) {
                    const minDimers = exportDimerListFromGrid(jsGridMin);
                    const maxDimers = exportDimerListFromGrid(jsGridMax);
                    renderBounds(minDimers, maxDimers);
                }
                if (statusEl) {
                    statusEl.textContent = 'coupled Glauber: step ' + formatSweeps(stepCount);
                }
            }

            // Yield to browser to stay responsive
            await new Promise(r => setTimeout(r, YIELD_MS));
            if (gen !== stepGeneration) return;
        }

        // If coalesced, show final surface
        if (animating && meshGroup && gen === stepGeneration) {
            const dimers = exportDimerListFromGrid(jsGridMin); // min = max after coalescence
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
        jsGridMin = null;
        jsGridMax = null;
        heightArrMin = null;
        heightArrMax = null;
        blackTriangles = [];
        vertN = null; vertJ = null; vertIdx = null; vertIdx1 = null; vertIdx2 = null; vertIdx3 = null; numVerts = 0;
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
                // Stop and restart fresh
                disposeAll();
                startAnimation();
            }
        },

        onStepBack: function(step) {
            if (step === 0) {
                // Restart fresh
                disposeAll();
                startAnimation();
            }
        },

        reset: function() {
            disposeAll();
        }
    }, 0);
})();
