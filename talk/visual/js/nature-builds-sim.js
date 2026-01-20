/**
 * Nature Builds Simulation
 * 3D Hexagon Glauber simulation - Complete JS port of ultimate-lozenge.cpp
 */

(function initCrystalSim() {
    if (!window.slideEngine) {
        setTimeout(initCrystalSim, 50);
        return;
    }
    const canvas = document.getElementById('crystal-growth-canvas');
    if (!canvas) return;

    // ===== LOZENGE TILING ENGINE (ported from C++) =====
    const hexSide = 100;

    // Triangular lattice constants
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);

    // Dimer grid and bounds
    let dimerGrid = [];
    let gridMinN, gridMaxN, gridMinJ, gridMaxJ, gridStrideJ;

    // Triangle storage
    const blackTriangles = [];
    const whiteTriangles = [];
    const blackMap = new Map();
    const whiteMap = new Map();
    const triangularVertices = [];

    // Helpers
    function makeKey(n, j) { return `${n},${j}`; }
    function getGridIdx(n, j) { return (n - gridMinN) * gridStrideJ + (j - gridMinJ); }
    function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

    function getRightTriangleCentroid(n, j) {
        const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    }
    function getLeftTriangleCentroid(n, j) {
        const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    }

    function getDimerType(blackN, blackJ, whiteN, whiteJ) {
        const dn = whiteN - blackN, dj = whiteJ - blackJ;
        if (dn === 0 && dj === 0) return 0;
        if (dn === 0 && dj === -1) return 1;
        if (dn === -1 && dj === 0) return 2;
        return -1;
    }

    function getWhiteFromType(blackN, blackJ, type) {
        if (type === 0) return [blackN, blackJ];
        if (type === 1) return [blackN, blackJ - 1];
        if (type === 2) return [blackN - 1, blackJ];
        return [blackN, blackJ];
    }

    function pointInPolygon(x, y, polygon) {
        if (polygon.length < 3) return false;
        let inside = false;
        for (let i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[pj].x, yj = polygon[pj].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    // ===== DINIC'S MAX-FLOW (ported from C++) =====
    let flowAdj = [];
    let level = [];
    let ptr = [];

    function addFlowEdge(from, to, cap) {
        flowAdj[from].push({ to, cap, flow: 0, rev: flowAdj[to].length });
        flowAdj[to].push({ to: from, cap: 0, flow: 0, rev: flowAdj[from].length - 1 });
    }

    function bfsFlow(s, t) {
        level.fill(-1);
        level[s] = 0;
        const q = [s];
        let head = 0;
        while (head < q.length) {
            const v = q[head++];
            for (const edge of flowAdj[v]) {
                if (edge.cap - edge.flow > 0 && level[edge.to] === -1) {
                    level[edge.to] = level[v] + 1;
                    q.push(edge.to);
                }
            }
        }
        return level[t] !== -1;
    }

    function dfsFlow(v, t, pushed) {
        if (pushed === 0) return 0;
        if (v === t) return pushed;
        for (; ptr[v] < flowAdj[v].length; ptr[v]++) {
            const edge = flowAdj[v][ptr[v]];
            if (level[v] + 1 !== level[edge.to] || edge.cap - edge.flow === 0) continue;
            const push = dfsFlow(edge.to, t, Math.min(pushed, edge.cap - edge.flow));
            if (push === 0) continue;
            edge.flow += push;
            flowAdj[edge.to][edge.rev].flow -= push;
            return push;
        }
        return 0;
    }

    function dinic(s, t) {
        let flow = 0;
        while (bfsFlow(s, t)) {
            ptr.fill(0);
            let pushed;
            while ((pushed = dfsFlow(s, t, Infinity)) > 0) {
                flow += pushed;
            }
        }
        return flow;
    }

    // ===== HEX EDGES FOR GLAUBER =====
    function getHexEdgesAroundVertex(n, j) {
        return [
            { blackN: n, blackJ: j+1, whiteN: n, whiteJ: j, type: 1 },
            { blackN: n, blackJ: j, whiteN: n, whiteJ: j, type: 0 },
            { blackN: n, blackJ: j, whiteN: n-1, whiteJ: j, type: 2 },
            { blackN: n-1, blackJ: j+1, whiteN: n-1, whiteJ: j, type: 1 },
            { blackN: n-1, blackJ: j+1, whiteN: n-1, whiteJ: j+1, type: 0 },
            { blackN: n, blackJ: j+1, whiteN: n-1, whiteJ: j+1, type: 2 }
        ];
    }

    function dimerExists(blackN, blackJ, whiteN, whiteJ) {
        if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) return false;
        const idx = getGridIdx(blackN, blackJ);
        if (idx < 0 || idx >= dimerGrid.length) return false;
        const typeInGrid = dimerGrid[idx];
        if (typeInGrid === -1) return false;
        return typeInGrid === getDimerType(blackN, blackJ, whiteN, whiteJ);
    }

    const qParam = 0;  // q=0 means pure removal, never add cubes

    function tryRotation(n, j, execute) {
        const edges = getHexEdgesAroundVertex(n, j);
        const coveredIdx = [], uncoveredIdx = [];

        for (let i = 0; i < 6; i++) {
            const e = edges[i];
            if (dimerExists(e.blackN, e.blackJ, e.whiteN, e.whiteJ)) {
                if (coveredIdx.length < 3) coveredIdx.push(i);
                else return 0;
            } else {
                if (uncoveredIdx.length < 3) uncoveredIdx.push(i);
                else return 0;
            }
        }

        if (coveredIdx.length !== 3 || uncoveredIdx.length !== 3) return 0;

        if (!execute) return 1;

        // q-weighted acceptance: covered sum 6 = {0,2,4}, sum 9 = {1,3,5}
        // Going from sum=9 to sum=6 adds cube, sum=6 to sum=9 removes
        const coveredSum = coveredIdx[0] + coveredIdx[1] + coveredIdx[2];
        const addingCube = (coveredSum === 9);  // {1,3,5} -> {0,2,4}
        if (addingCube && Math.random() > qParam) return 0;  // reject add with prob 1 - q
        if (!addingCube && qParam > 0 && Math.random() > 1 / qParam) return 0;  // reject remove with prob 1 - 1/q

        for (const idx of coveredIdx) {
            const e = edges[idx];
            if (e.blackN >= gridMinN && e.blackN <= gridMaxN && e.blackJ >= gridMinJ && e.blackJ <= gridMaxJ) {
                const gridIdx = getGridIdx(e.blackN, e.blackJ);
                if (gridIdx >= 0 && gridIdx < dimerGrid.length) dimerGrid[gridIdx] = -1;
            }
        }
        for (const idx of uncoveredIdx) {
            const e = edges[idx];
            if (e.blackN < gridMinN || e.blackN > gridMaxN || e.blackJ < gridMinJ || e.blackJ > gridMaxJ) continue;
            if (blackMap.has(makeKey(e.blackN, e.blackJ)) && whiteMap.has(makeKey(e.whiteN, e.whiteJ))) {
                const gridIdx = getGridIdx(e.blackN, e.blackJ);
                if (gridIdx >= 0 && gridIdx < dimerGrid.length) dimerGrid[gridIdx] = e.type;
            }
        }
        return 1;
    }

    // ===== INITIALIZATION WITH MAX-FLOW =====
    function initHexagon() {
        blackTriangles.length = 0;
        whiteTriangles.length = 0;
        blackMap.clear();
        whiteMap.clear();
        triangularVertices.length = 0;

        const N = hexSide;

        // Generate hexagon boundary
        const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
        const boundary = [];
        let bn = 0, bj = 0;
        for (let dir = 0; dir < 6; dir++) {
            for (let step = 0; step < N; step++) {
                boundary.push(getVertex(bn, bj));
                bn += directions[dir][0];
                bj += directions[dir][1];
            }
        }

        // Bounding box
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

        // Generate triangles
        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                const rc = getRightTriangleCentroid(n, j);
                if (pointInPolygon(rc.x, rc.y, boundary)) {
                    blackMap.set(makeKey(n, j), blackTriangles.length);
                    blackTriangles.push({ n, j });
                }
                const lc = getLeftTriangleCentroid(n, j);
                if (pointInPolygon(lc.x, lc.y, boundary)) {
                    whiteMap.set(makeKey(n, j), whiteTriangles.length);
                    whiteTriangles.push({ n, j });
                }
            }
        }

        // Grid setup
        gridMinN = searchMinN - 2; gridMaxN = searchMaxN + 2;
        gridMinJ = searchMinJ - 2; gridMaxJ = searchMaxJ + 2;
        gridStrideJ = gridMaxJ - gridMinJ + 1;
        dimerGrid = new Array((gridMaxN - gridMinN + 1) * gridStrideJ).fill(-1);

        // ===== DINIC'S MAX-FLOW FOR PERFECT MATCHING =====
        const numBlack = blackTriangles.length;
        const numWhite = whiteTriangles.length;
        const S = numBlack + numWhite;  // Source
        const T = S + 1;                 // Sink

        flowAdj = Array.from({ length: T + 1 }, () => []);
        level = new Array(T + 1).fill(-1);
        ptr = new Array(T + 1).fill(0);

        // Source -> black triangles
        for (let i = 0; i < numBlack; i++) {
            addFlowEdge(S, i, 1);
        }

        // White triangles -> sink
        for (let i = 0; i < numWhite; i++) {
            addFlowEdge(numBlack + i, T, 1);
        }

        // Black -> white neighbors (3 possible neighbors per black)
        for (let i = 0; i < numBlack; i++) {
            const bt = blackTriangles[i];
            const neighbors = [
                [bt.n, bt.j],        // Type 0
                [bt.n, bt.j - 1],    // Type 1
                [bt.n - 1, bt.j]     // Type 2
            ];
            for (const [wn, wj] of neighbors) {
                const wKey = makeKey(wn, wj);
                if (whiteMap.has(wKey)) {
                    addFlowEdge(i, numBlack + whiteMap.get(wKey), 1);
                }
            }
        }

        // Run Dinic's algorithm
        const maxFlow = dinic(S, T);

        // Extract matching from flow
        for (let i = 0; i < numBlack; i++) {
            for (const edge of flowAdj[i]) {
                if (edge.to >= numBlack && edge.to < S && edge.flow === 1) {
                    const wIdx = edge.to - numBlack;
                    const bt = blackTriangles[i];
                    const wt = whiteTriangles[wIdx];
                    const type = getDimerType(bt.n, bt.j, wt.n, wt.j);
                    const gridIdx = getGridIdx(bt.n, bt.j);
                    if (gridIdx >= 0 && gridIdx < dimerGrid.length) {
                        dimerGrid[gridIdx] = type;
                    }
                    break;
                }
            }
        }

        // Build triangular vertices
        const vertexSet = new Set();
        for (const bt of blackTriangles) {
            vertexSet.add(makeKey(bt.n, bt.j));
            vertexSet.add(makeKey(bt.n, bt.j - 1));
            vertexSet.add(makeKey(bt.n + 1, bt.j - 1));
        }
        for (const wt of whiteTriangles) {
            vertexSet.add(makeKey(wt.n, wt.j));
            vertexSet.add(makeKey(wt.n + 1, wt.j));
            vertexSet.add(makeKey(wt.n + 1, wt.j - 1));
        }
        for (const key of vertexSet) {
            const [n, j] = key.split(',').map(Number);
            triangularVertices.push({ n, j });
        }

    }

    function glauberSteps(count) {
        const N = triangularVertices.length;
        if (N === 0) return;
        for (let s = 0; s < count; s++) {
            const idx = Math.floor(Math.random() * N);
            const v = triangularVertices[idx];
            tryRotation(v.n, v.j, true);
        }
    }

    function exportDimers() {
        const dimers = [];
        for (const bt of blackTriangles) {
            const gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx >= 0 && gridIdx < dimerGrid.length) {
                const type = dimerGrid[gridIdx];
                if (type !== -1) {
                    const [wn, wj] = getWhiteFromType(bt.n, bt.j, type);
                    dimers.push({ bn: bt.n, bj: bt.j, wn, wj, t: type });
                }
            }
        }
        return dimers;
    }

    // ===== THREE.JS RENDERING (LAZY LOADED) =====
    let scene = null;
    let renderer = null;
    let camera = null;
    let controls = null;
    let meshGroup = null;
    let aspect = 1;

    function initThreeJS() {
        if (renderer) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        aspect = canvas.clientWidth / canvas.clientHeight || 1;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.enablePan = true;
        controls.enableZoom = true;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        const hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);
        const directional = new THREE.DirectionalLight(0xffffff, 1.2);
        directional.position.set(15, 20, 5);
        scene.add(directional);
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-10, 5, -5);
        scene.add(fill);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        camera.position.set(10.2, -110.4, -10.8);
        controls.target.set(-13.4, -89.2, 12.4);
        controls.update();

        // Listen for controls changes
        controls.addEventListener('change', () => {
            if (!isRunning && !isCameraAnimating && renderer) renderer.render(scene, camera);
        });

        resize();
    }

    function disposeThreeJS() {
        if (!renderer) return;

        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        if (cameraAnimationId) { cancelAnimationFrame(cameraAnimationId); cameraAnimationId = null; }
        isRunning = false;
        isCameraAnimating = false;

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

    function resize() {
        if (!renderer || !camera) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        aspect = w / h;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    const colors = ['#FFFFFF', '#FFFFFF', '#FFFFFF'];
    let isRunning = false;
    let animationId = null;

    // Vertex keys for each dimer type (same as before)
    function getVertexKeys(dimer) {
        const { bn, bj, t } = dimer;
        if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
        if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
        return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
    }

    function getHeightPattern(t) {
        if (t === 0) return [0, 0, 0, 0];
        if (t === 1) return [1, 0, 0, 1];
        return [1, 1, 0, 0];
    }

    function to3D(n, j, h) {
        return { x: h, y: -n - h, z: j - h };
    }

    function buildGeometry() {
        if (!meshGroup) return;

        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }

        const dimers = exportDimers();
        if (dimers.length === 0) return;

        // Build vertex-to-dimer map and calculate heights via BFS
        const vertexToDimers = new Map();
        for (const dimer of dimers) {
            for (const [n, j] of getVertexKeys(dimer)) {
                const key = `${n},${j}`;
                if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                vertexToDimers.get(key).push(dimer);
            }
        }

        const heights = new Map();
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
                const myIdx = verts.findIndex(([vn, vj]) => vn === cn && vj === cj);
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

        const geometry = new THREE.BufferGeometry();
        const vertices = [], normals = [], vertexColors = [], indices = [];

        function addQuad(v1, v2, v3, v4, color) {
            const baseIndex = vertices.length / 3;
            vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);
            const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
            const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z };
            const nx = edge1.y * edge2.z - edge1.z * edge2.y;
            const ny = edge1.z * edge2.x - edge1.x * edge2.z;
            const nz = edge1.x * edge2.y - edge1.y * edge2.x;
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
            for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
            const c = new THREE.Color(color);
            for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
            indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
        }

        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            const v3d = verts.map(([n, j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
            addQuad(v3d[0], v3d[1], v3d[2], v3d[3], colors[dimer.t]);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.3, metalness: 0.5
        });
        meshGroup.add(new THREE.Mesh(geometry, material));

        if (!isRunning) {
            const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
            meshGroup.add(new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({ color: 0x222222, opacity: 0.6, transparent: true })));
        }
    }

    // Initialize hexagon shape (not Three.js - that's lazy loaded)
    initHexagon();

    function animate() {
        if (!isRunning || !renderer || !controls) return;
        glauberSteps(15000);
        buildGeometry();
        controls.update();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
    }

    const playBtn = document.getElementById('crystal-play-btn');

    function updatePlayBtn() {
        playBtn.textContent = isRunning ? '⏸' : '▶';
    }

    function start() {
        if (!isRunning) { isRunning = true; updatePlayBtn(); animate(); }
    }

    function pause() {
        isRunning = false;
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        updatePlayBtn();
        buildGeometry();
        if (renderer) renderer.render(scene, camera);
    }

    function toggle() {
        if (isRunning) pause(); else start();
    }

    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
    });

    // Camera animation (end is 2x farther from target)
    const cameraStart = { x: 10.2, y: -110.4, z: -10.8 };
    const cameraEnd = { x: 39.6, y: -140.4, z: 39.6 };
    let isCameraAnimating = false;
    let cameraAnimationId = null;

    function animateCamera(duration = 3000) {
        if (!camera || !controls || !renderer) return;
        const startTime = performance.now();
        const startPos = { ...cameraStart };
        isCameraAnimating = true;

        function tick() {
            if (!camera || !controls || !renderer) { isCameraAnimating = false; return; }
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Smooth easing (ease-in-out)
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            camera.position.x = startPos.x + (cameraEnd.x - startPos.x) * ease;
            camera.position.y = startPos.y + (cameraEnd.y - startPos.y) * ease;
            camera.position.z = startPos.z + (cameraEnd.z - startPos.z) * ease;
            controls.update();
            renderer.render(scene, camera);

            if (t < 1) {
                cameraAnimationId = requestAnimationFrame(tick);
            } else {
                isCameraAnimating = false;
            }
        }
        tick();
    }

    function resetCamera() {
        if (cameraAnimationId) cancelAnimationFrame(cameraAnimationId);
        isCameraAnimating = false;
        if (!camera || !controls || !renderer) return;
        camera.position.set(cameraStart.x, cameraStart.y, cameraStart.z);
        controls.update();
        renderer.render(scene, camera);
    }

    const questionEl = document.getElementById('nature-builds-question');

    // 4 steps: 1=start, 2=stop, 3=camera transition, 4=text
    window.slideEngine.registerSimulation('nature-builds', {
        start, pause, steps: 4,
        onSlideEnter() {
            // Lazy init WebGL to avoid context limit
            initThreeJS();
            setTimeout(() => {
                resize();
                if (renderer) renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
                buildGeometry();
                if (controls) controls.update();
                if (renderer) renderer.render(scene, camera);
                requestAnimationFrame(() => { resize(); if (renderer) renderer.render(scene, camera); });
            }, 50);
        },
        onSlideLeave() {
            // Dispose WebGL context to free resources
            disposeThreeJS();
            questionEl.style.opacity = '0';
        },
        onStep(step) {
            if (step === 1) { start(); }
            else if (step === 2) { pause(); }
            else if (step === 3) { animateCamera(3000); }
            else if (step === 4) { questionEl.style.opacity = '1'; }
        },
        onStepBack(step) {
            if (step === 0) { pause(); initHexagon(); buildGeometry(); resetCamera(); questionEl.style.opacity = '0'; }
            else if (step === 1) { start(); questionEl.style.opacity = '0'; }
            else if (step === 2) { resetCamera(); questionEl.style.opacity = '0'; }
            else if (step === 3) { questionEl.style.opacity = '0'; }
        }
    }, 1);
})();
