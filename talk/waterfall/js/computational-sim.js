/**
 * Computational Slide — Dual 3D Simulations
 * Build order:
 *   1. Show banner
 *   2. Show CFTP pane
 *   3. Show "Why works" pane
 *   4. Run forward coupled Glauber animation (no T-doubling)
 *   5. Show "Why fails" pane
 *   6. Dispose CFTP → start waterfall animation
 *
 * Uses LozengeModule (modularized WASM) for CFTP,
 * global Module (non-modularized) for waterfall.
 * Single canvas shared by both sims.
 */

(function initComputationalSim() {
    if (!window.slideEngine) {
        setTimeout(initComputationalSim, 50);
        return;
    }

    const canvas = document.getElementById('comp-sim-canvas');
    const statusEl = document.getElementById('comp-sim-status');
    if (!canvas) return;

    function showElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hideElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    // ===================================================================
    // CFTP Simulation (LozengeModule — isolated modularized instance)
    // ===================================================================

    let wasm = null;
    let cftpFuncs = null;
    let cftpScene = null, cftpRenderer = null, cftpCamera = null, cftpControls = null, cftpMeshGroup = null;
    let cftpRenderLoopId = null;
    let cftpAnimating = false;
    let cftpAutoRotating = false;
    let wasmInitPromise = null;

    // Generate regular hexagonal region of side length a
    // Uses same coordinate system as ultimate-lozenge: getVertex(n,j) = {x: n, y: n/√3 + j*2/√3}
    // Type 1 = black (right-facing): vertices (n,j), (n,j-1), (n+1,j-1)
    // Type 2 = white (left-facing): vertices (n,j), (n+1,j), (n+1,j-1)
    const HEX_SIDE = 30;

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

        // Build hexagonal boundary polygon: sides a,a,a,a,a,a with 6 directions
        const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
        const boundary = [];
        let bn = 0, bj = 0;
        for (let dir = 0; dir < 6; dir++) {
            const [dn, dj] = directions[dir];
            for (let step = 0; step < a; step++) {
                boundary.push(getVertex(bn, bj));
                bn += dn;
                bj += dj;
            }
        }

        // Point-in-polygon (ray casting)
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

        // Find bounding box in (n, j) space
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

        // Enumerate triangles via centroid point-in-polygon test
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

    async function initCFTPWasm() {
        if (wasm) return true;
        if (wasmInitPromise) return wasmInitPromise;
        wasmInitPromise = (async () => {
            if (typeof LozengeModule === 'undefined') {
                console.warn('computational: LozengeModule not available');
                return false;
            }
            try {
                wasm = await LozengeModule();
                cftpFuncs = {
                    initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
                    initCFTP: wasm.cwrap('initCFTP', 'number', []),
                    forwardCoupledStep: wasm.cwrap('forwardCoupledStep', 'number', ['number']),
                    finalizeCFTP: wasm.cwrap('finalizeCFTP', 'number', []),
                    exportCFTPMinDimers: wasm.cwrap('exportCFTPMinDimers', 'number', []),
                    exportCFTPMaxDimers: wasm.cwrap('exportCFTPMaxDimers', 'number', []),
                    exportDimers: wasm.cwrap('exportDimers', 'number', []),
                    runCFTP: wasm.cwrap('runCFTP', 'number', []),
                    freeString: wasm.cwrap('freeString', null, ['number'])
                };
                return true;
            } catch (e) {
                console.error('Failed to init LozengeModule for computational:', e);
                wasm = null;
                return false;
            }
        })();
        return wasmInitPromise;
    }

    function loadShapeIntoWasm() {
        if (!wasm || !cftpFuncs) return;
        const triArr = generateHexagonTriangles(HEX_SIDE);
        const ptr = wasm._malloc(triArr.length * 4);
        for (let i = 0; i < triArr.length; i++) {
            wasm.setValue(ptr + i * 4, triArr[i], 'i32');
        }
        cftpFuncs.initFromTriangles(ptr, triArr.length);
        wasm._free(ptr);
    }

    function wasmCallJSON(fn) {
        const ptr = fn();
        const str = wasm.UTF8ToString(ptr);
        cftpFuncs.freeString(ptr);
        return JSON.parse(str);
    }

    // --- CFTP Three.js ---

    const frustumSize = 52;

    function initCFTPThreeJS() {
        if (cftpRenderer) return;
        cftpScene = new THREE.Scene();
        cftpScene.background = new THREE.Color(0x1a1a2e);
        cftpRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        cftpRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        cftpCamera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2,
            -5000, 6000
        );

        cftpControls = new THREE.OrbitControls(cftpCamera, cftpRenderer.domElement);
        cftpControls.enableDamping = false;
        cftpControls.enablePan = true;
        cftpControls.enableZoom = true;

        // Lighting (metallic style matching limit-shape-sim)
        cftpScene.add(new THREE.AmbientLight(0xffffff, 0.35));
        const hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
        hemi.position.set(0, 20, 0);
        cftpScene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(15, 20, 5);
        cftpScene.add(dir);
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-10, 5, -5);
        cftpScene.add(fill);

        cftpMeshGroup = new THREE.Group();
        cftpScene.add(cftpMeshGroup);

        // Camera position for hexagonal tiling
        cftpCamera.position.set(31.0, 15.6, 60.1);
        cftpCamera.zoom = 1.0;
        cftpCamera.updateProjectionMatrix();
        cftpControls.target.set(-15.1, -17.6, 9.0);
        cftpControls.update();

        resizeCFTP();
    }

    function resizeCFTP() {
        if (!cftpRenderer || !cftpCamera) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w === 0 || h === 0) return;
        cftpRenderer.setSize(w, h, false);
        const aspect = w / h;
        cftpCamera.left = -frustumSize * aspect / 2;
        cftpCamera.right = frustumSize * aspect / 2;
        cftpCamera.top = frustumSize / 2;
        cftpCamera.bottom = -frustumSize / 2;
        cftpCamera.updateProjectionMatrix();
    }

    function startCFTPRenderLoop() {
        if (cftpRenderLoopId) return;
        const AUTO_ROTATE_SPEED = 0.003; // radians per frame
        function loop() {
            if (!cftpRenderer || !cftpCamera || !cftpControls) return;
            // Auto-rotate after coalescence
            if (cftpAutoRotating && cftpControls) {
                const target = cftpControls.target;
                const offset = cftpCamera.position.clone().sub(target);
                const angle = AUTO_ROTATE_SPEED;
                const cosA = Math.cos(angle), sinA = Math.sin(angle);
                const newX = offset.x * cosA - offset.y * sinA;
                const newY = offset.x * sinA + offset.y * cosA;
                offset.x = newX;
                offset.y = newY;
                cftpCamera.position.copy(target).add(offset);
            }
            cftpControls.update();
            cftpRenderer.render(cftpScene, cftpCamera);
            cftpRenderLoopId = requestAnimationFrame(loop);
        }
        loop();
    }

    function stopCFTPRenderLoop() {
        if (cftpRenderLoopId) {
            cancelAnimationFrame(cftpRenderLoopId);
            cftpRenderLoopId = null;
        }
    }

    function disposeCFTPThreeJS() {
        stopCFTPRenderLoop();
        cftpAnimating = false;
        cftpAutoRotating = false;
        if (cftpMeshGroup) {
            while (cftpMeshGroup.children.length > 0) {
                const child = cftpMeshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                cftpMeshGroup.remove(child);
            }
        }
        if (cftpRenderer) cftpRenderer.dispose();
        cftpRenderer = null;
        cftpScene = null;
        cftpCamera = null;
        cftpControls = null;
        cftpMeshGroup = null;
    }

    // --- CFTP geometry building (from ultimate-lozenge cftpBoundsTo3D) ---

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

    const to3D_cftp = (n, j, h) => ({ x: h, y: -n - h, z: j - h });

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
        const colors = ['#FFFFFF', '#FFFFFF', '#FFFFFF'];
        const geometry = new THREE.BufferGeometry();
        const vertices = [], normals = [], vertexColors = [], indices = [];

        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            const v3d = verts.map(([n, j]) => to3D_cftp(n, j, heights.get(`${n},${j}`) || 0));
            const baseIndex = vertices.length / 3;
            for (const v of v3d) vertices.push(v.x, v.y, v.z);
            const e1 = { x: v3d[1].x-v3d[0].x, y: v3d[1].y-v3d[0].y, z: v3d[1].z-v3d[0].z };
            const e2 = { x: v3d[3].x-v3d[0].x, y: v3d[3].y-v3d[0].y, z: v3d[3].z-v3d[0].z };
            const nx = e1.y*e2.z - e1.z*e2.y, ny = e1.z*e2.x - e1.x*e2.z, nz = e1.x*e2.y - e1.y*e2.x;
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
            for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
            const c = new THREE.Color(colors[dimer.t]);
            c.r *= colorMod; c.g *= colorMod; c.b *= colorMod;
            for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
            indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true,
            roughness: 0.3, metalness: 0.35, color: 0xddeeff,
            transparent: true, opacity: opacity, depthWrite: opacity > 0.9
        });

        return new THREE.Mesh(geometry, material);
    }

    function clearCFTPMesh() {
        if (!cftpMeshGroup) return;
        while (cftpMeshGroup.children.length > 0) {
            const child = cftpMeshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            cftpMeshGroup.remove(child);
        }
    }

    function renderCFTPBounds(minDimers, maxDimers) {
        clearCFTPMesh();
        if (!cftpMeshGroup) return;

        if (maxDimers && maxDimers.length > 0) {
            const maxHeights = computeHeights(maxDimers);
            cftpMeshGroup.add(buildSurface(maxDimers, maxHeights, 0.6, 1.0));
        }
        if (minDimers && minDimers.length > 0) {
            const minHeights = computeHeights(minDimers);
            cftpMeshGroup.add(buildSurface(minDimers, minHeights, 0.6, 0.7));
        }
    }

    function renderCFTPCoalesced(dimers) {
        clearCFTPMesh();
        if (!cftpMeshGroup) return;
        if (!dimers || dimers.length === 0) return;

        const heights = computeHeights(dimers);
        cftpMeshGroup.add(buildSurface(dimers, heights, 1.0, 1.0));

        // Add subtle edges
        const mesh = cftpMeshGroup.children[0];
        if (mesh && mesh.geometry) {
            const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 10);
            cftpMeshGroup.add(new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({
                color: 0x444466, opacity: 0.4, transparent: true
            })));
        }
    }

    // --- Forward coupled Glauber animation (no T-doubling) ---

    const CFTP_STEP_DELAY = 600;  // ms between visual updates
    // Progressive milestone schedule: update visuals at these cumulative step counts
    const CFTP_MILESTONES = [10, 20, 50, 100, 200, 300, 500, 700];
    const CFTP_AFTER_MILESTONES = 200; // then every 200 steps

    function getNextMilestone(currentStep) {
        for (const m of CFTP_MILESTONES) {
            if (m > currentStep) return m;
        }
        // Past fixed milestones: next multiple of CFTP_AFTER_MILESTONES above last milestone
        const last = CFTP_MILESTONES[CFTP_MILESTONES.length - 1];
        const beyond = currentStep - last;
        return last + (Math.floor(beyond / CFTP_AFTER_MILESTONES) + 1) * CFTP_AFTER_MILESTONES;
    }

    async function runCFTPAnimated() {
        if (!wasm || !cftpFuncs) return;
        cftpAnimating = true;
        cftpAutoRotating = false;

        loadShapeIntoWasm();
        wasmCallJSON(cftpFuncs.initCFTP);

        // Show initial min/max bounds (fully separated)
        if (cftpMeshGroup) {
            const minD = wasmCallJSON(cftpFuncs.exportCFTPMinDimers);
            const maxD = wasmCallJSON(cftpFuncs.exportCFTPMaxDimers);
            renderCFTPBounds(minD.dimers, maxD.dimers);
        }
        if (statusEl) statusEl.textContent = 'coupled Glauber: step 0';
        await new Promise(r => setTimeout(r, CFTP_STEP_DELAY));

        let totalSteps = 0;
        while (cftpAnimating) {
            const nextMilestone = getNextMilestone(totalSteps);
            const stepsToRun = nextMilestone - totalSteps;
            const result = wasmCallJSON(() => cftpFuncs.forwardCoupledStep(stepsToRun));
            totalSteps = nextMilestone;

            if (result.status === 'coalesced') {
                if (statusEl) statusEl.textContent = 'coalesced at step ' + (result.step || '?');
                break;
            } else if (result.status === 'in_progress') {
                if (cftpMeshGroup) {
                    const minD = wasmCallJSON(cftpFuncs.exportCFTPMinDimers);
                    const maxD = wasmCallJSON(cftpFuncs.exportCFTPMaxDimers);
                    renderCFTPBounds(minD.dimers, maxD.dimers);
                }
                if (statusEl) statusEl.textContent = 'coupled Glauber: step ' + result.step;
                await new Promise(r => setTimeout(r, CFTP_STEP_DELAY));
            } else if (result.status === 'already_coalesced') {
                break;
            } else {
                break;
            }
        }

        // Finalize: show single coalesced surface
        if (cftpAnimating && cftpMeshGroup) {
            wasmCallJSON(cftpFuncs.finalizeCFTP);
            const dimersResult = wasmCallJSON(cftpFuncs.exportDimers);
            renderCFTPCoalesced(dimersResult.dimers || []);
            // Start slow auto-rotation
            cftpAutoRotating = true;
        }

        cftpAnimating = false;
    }

    async function runCFTPQuick() {
        // One-shot CFTP without animation (for step back 6→5)
        if (!wasm || !cftpFuncs) return;

        loadShapeIntoWasm();
        if (statusEl) statusEl.textContent = 'sampling...';
        wasmCallJSON(cftpFuncs.runCFTP);

        const dimersResult = wasmCallJSON(cftpFuncs.exportDimers);
        renderCFTPCoalesced(dimersResult.dimers || []);
        if (statusEl) statusEl.textContent = '';
        cftpAutoRotating = true;
    }

    // ===================================================================
    // Waterfall Simulation (global Module — shared, non-modularized)
    // ===================================================================

    const WF_N = 80, WF_T = 160, WF_S_TARGET = 80;
    const WF_Q = 0.8, WF_KAPPA = 3.0;
    const WF_STEP_INCREMENT = 5, WF_STEP_DELAY = 250;

    const WF_CAM_START = {
        pos: { x: 85.6, y: -104.4, z: 167.3 },
        target: { x: 28.2, y: 48.6, z: 34.9 }
    };
    const WF_CAM_END = {
        pos: { x: 79.2, y: 0.6, z: 103.0 },
        target: { x: 24.1, y: 50.6, z: 40.1 }
    };

    const wfColors = {
        gray1: '#E57200',   // Orange
        gray2: '#232D4B',   // Blue
        gray3: '#F9DCBF',   // Cream
        border: '#333333'
    };

    let wfScene = null, wfRenderer = null, wfCamera = null, wfControls = null, wfMeshGroup = null;
    let wfRenderLoopId = null;
    let wfAnimTimeoutId = null;
    let wfAnimating = false;
    let wfCurrentN = 0, wfCurrentT = 0, wfCurrentS = 0;

    // Waterfall WASM interface (uses global Module)
    let wfWasmReady = false;
    const wfWasm = {
        ready: false,
        paths: [],
        S_param: 0,

        initialize() {
            if (typeof Module === 'undefined' || typeof Module.cwrap !== 'function' || !Module.calledRun) return false;
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
            this.S_param = 0;
            const kappasq = kappa * kappa;
            this.setImaginaryQ(q);
            const ptr = await this.initializeTiling(WF_N, WF_T, 0, 7, -kappasq);
            if (ptr) {
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);
                const result = JSON.parse(jsonStr);
                this.S_param = result.s || 0;
            }
            await this.refreshPaths();
        },

        async stepForward() {
            if (!this.ready || this.S_param >= WF_T) return false;
            this.setImaginaryQ(WF_Q);
            const ptr = await this.performSOperator();
            if (ptr) {
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);
                const result = JSON.parse(jsonStr);
                this.S_param = result.s;
                await this.refreshPaths();
                return true;
            }
            return false;
        },

        async refreshPaths() {
            const ptr = await this.exportPaths();
            if (ptr) {
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);
                const result = JSON.parse(jsonStr);
                this.paths = result.paths;
            }
        }
    };

    function tryInitWfWasm() {
        if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function' && Module.calledRun) {
            if (wfWasm.initialize()) wfWasmReady = true;
        }
    }
    tryInitWfWasm();
    if (!wfWasmReady) {
        window.addEventListener('wasm-loaded', tryInitWfWasm, { once: true });
    }

    // --- Waterfall Three.js ---

    function initWaterfallThreeJS() {
        if (wfRenderer) return;

        wfScene = new THREE.Scene();
        wfScene.background = new THREE.Color(0xffffff);
        wfRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        wfRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        wfCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
        wfControls = new THREE.OrbitControls(wfCamera, wfRenderer.domElement);
        wfControls.enableDamping = true;
        wfControls.dampingFactor = 0.1;
        wfControls.enablePan = true;
        wfControls.enableZoom = true;

        // Lighting (default lpetrov.cc style)
        wfScene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        hemi.position.set(0, 20, 0);
        wfScene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(10, 10, 15);
        wfScene.add(dir);
        const fill = new THREE.DirectionalLight(0xffffff, 0.25);
        fill.position.set(-10, -5, -10);
        wfScene.add(fill);

        wfMeshGroup = new THREE.Group();
        wfScene.add(wfMeshGroup);

        wfCamera.position.set(WF_CAM_START.pos.x, WF_CAM_START.pos.y, WF_CAM_START.pos.z);
        wfCamera.up.set(0, 0, 1);
        wfControls.target.set(WF_CAM_START.target.x, WF_CAM_START.target.y, WF_CAM_START.target.z);
        wfControls.update();

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) {
            wfRenderer.setSize(w, h, false);
            wfCamera.aspect = w / h;
            wfCamera.updateProjectionMatrix();
        }
    }

    function disposeWaterfallThreeJS() {
        stopWaterfallAnimation();
        if (wfRenderLoopId) { cancelAnimationFrame(wfRenderLoopId); wfRenderLoopId = null; }
        if (wfMeshGroup) {
            while (wfMeshGroup.children.length > 0) {
                const child = wfMeshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                wfMeshGroup.remove(child);
            }
        }
        if (wfRenderer) wfRenderer.dispose();
        wfRenderer = null; wfScene = null; wfCamera = null; wfControls = null; wfMeshGroup = null;
    }

    function startWfRenderLoop() {
        if (wfRenderLoopId) return;
        function loop() {
            if (!wfRenderer || !wfCamera || !wfControls) return;
            wfControls.update();
            wfRenderer.render(wfScene, wfCamera);
            wfRenderLoopId = requestAnimationFrame(loop);
        }
        loop();
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function setWfCameraPosition(progress) {
        if (!wfCamera || !wfControls) return;
        wfCamera.position.set(
            lerp(WF_CAM_START.pos.x, WF_CAM_END.pos.x, progress),
            lerp(WF_CAM_START.pos.y, WF_CAM_END.pos.y, progress),
            lerp(WF_CAM_START.pos.z, WF_CAM_END.pos.z, progress)
        );
        wfControls.target.set(
            lerp(WF_CAM_START.target.x, WF_CAM_END.target.x, progress),
            lerp(WF_CAM_START.target.y, WF_CAM_END.target.y, progress),
            lerp(WF_CAM_START.target.z, WF_CAM_END.target.z, progress)
        );
        wfControls.update();
    }

    // --- Waterfall geometry (pathsTo3D + horizontal lozenges from dimensional-collapse) ---

    function wfPathsTo3D(paths, N, T, S) {
        if (!wfMeshGroup) return;
        wfCurrentN = N; wfCurrentT = T; wfCurrentS = S;

        while (wfMeshGroup.children.length > 0) {
            const child = wfMeshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            wfMeshGroup.remove(child);
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
                if (curr === prev + 1) x++;
                else if (curr === prev) y++;
                triplets.push([x, y, z]);
            }
            pathTriplets.push(triplets);
        }

        const geometry = new THREE.BufferGeometry();
        const vertices = [], normals = [], vertexColors = [], indices = [];

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

        for (let pathIdx = 1; pathIdx < pathTriplets.length; pathIdx++) {
            const topPath = pathTriplets[pathIdx];
            const bottomPath = topPath.map(point => [point[0], point[1], point[2] - 1]);
            for (let i = 0; i < topPath.length - 1; i++) {
                const topP1 = topPath[i], topP2 = topPath[i+1];
                const bottomP1 = bottomPath[i], bottomP2 = bottomPath[i+1];
                let color;
                if (topP2[0] > topP1[0] && topP2[1] === topP1[1]) color = wfColors.gray2;
                else if (topP2[0] === topP1[0] && topP2[1] > topP1[1]) color = wfColors.gray1;
                else color = wfColors.gray3;
                addSquareFace(topP1, topP2, bottomP2, bottomP1, color);
            }
        }

        wfPlaceAllHorizontalLozenges(pathTriplets, addSquareFace);

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true,
            roughness: 0.5, metalness: 0.15
        });
        wfMeshGroup.add(new THREE.Mesh(geometry, material));

        const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
        wfMeshGroup.add(new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({
            color: wfColors.border, linewidth: 1, opacity: 0.4, transparent: true
        })));
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
                const upperVal = upperQ[b] || 0;
                const lowerVal = lowerQ[b] || 0;
                if (upperVal > a && a >= lowerVal) matrix[a][b] = 1;
            }
        }
        return matrix;
    }

    function wfPlaceAllHorizontalLozenges(pathTriplets, addSquareFace) {
        const S = wfCurrentS, T = wfCurrentT, N = wfCurrentN;

        // Top boundary
        if (pathTriplets.length > 0) {
            const topZ = N;
            const topBoundary = [];
            for (let i = 0; i <= S; i++) topBoundary.push([i, 0, topZ]);
            for (let i = 1; i <= T - S; i++) topBoundary.push([S, i, topZ]);
            const zLevel = topZ - 1;
            const hm = calculateHorizontalLozengeMatrix(topBoundary, pathTriplets[0], S, T);
            for (let a = 0; a <= S; a++)
                for (let b = 0; b <= T - S; b++)
                    if (a < hm.length && b < hm[a].length && hm[a][b] === 1)
                        addSquareFace([a, b, zLevel], [a+1, b, zLevel], [a+1, b+1, zLevel], [a, b+1, zLevel], wfColors.gray3);
        }

        // Middle paths
        for (let pathIdx = 0; pathIdx < pathTriplets.length - 1; pathIdx++) {
            const upperPath = pathTriplets[pathIdx];
            const lowerPath = pathTriplets[pathIdx + 1];
            const zLevel = upperPath[0][2] - 1;
            const hm = calculateHorizontalLozengeMatrix(upperPath, lowerPath, S, T);
            for (let a = 0; a <= S; a++)
                for (let b = 0; b <= T - S; b++)
                    if (a < hm.length && b < hm[a].length && hm[a][b] === 1)
                        addSquareFace([a, b, zLevel], [a+1, b, zLevel], [a+1, b+1, zLevel], [a, b+1, zLevel], wfColors.gray3);
        }

        // Bottom boundary
        if (pathTriplets.length > 0) {
            const lastPath = pathTriplets[pathTriplets.length - 1];
            const bottomBoundary = [];
            for (let i = 0; i <= T - S; i++) bottomBoundary.push([0, i, 0]);
            for (let i = 1; i <= S; i++) bottomBoundary.push([i, T - S, 0]);
            const hm = calculateHorizontalLozengeMatrix(lastPath, bottomBoundary, S, T);
            for (let a = 0; a <= S; a++)
                for (let b = 0; b <= T - S; b++)
                    if (a < hm.length && b < hm[a].length && hm[a][b] === 1)
                        addSquareFace([a, b, 0], [a+1, b, 0], [a+1, b+1, 0], [a, b+1, 0], wfColors.gray3);
        }
    }

    // --- Waterfall animation ---

    function stopWaterfallAnimation() {
        if (wfAnimTimeoutId) { clearTimeout(wfAnimTimeoutId); wfAnimTimeoutId = null; }
        wfAnimating = false;
    }

    async function runWaterfallAnimation() {
        if (!wfWasmReady || wfAnimating) return;
        wfAnimating = true;

        await wfWasm.initTilingQRacah(WF_Q, WF_KAPPA);
        wfPathsTo3D(wfWasm.paths, WF_N, WF_T, wfWasm.S_param);
        setWfCameraPosition(0);

        async function doStep() {
            if (!wfAnimating || wfWasm.S_param >= WF_S_TARGET) {
                wfAnimating = false;
                setWfCameraPosition(1);
                if (statusEl) statusEl.textContent = '';
                return;
            }
            for (let i = 0; i < WF_STEP_INCREMENT && wfWasm.S_param < WF_S_TARGET; i++) {
                await wfWasm.stepForward();
            }
            if (!wfMeshGroup) { wfAnimating = false; return; }
            const pathsCopy = wfWasm.paths.map(p => [...p]);
            wfPathsTo3D(pathsCopy, WF_N, WF_T, wfWasm.S_param);
            const progress = wfWasm.S_param / WF_S_TARGET;
            setWfCameraPosition(progress);
            if (statusEl) statusEl.textContent = 'S = ' + wfWasm.S_param + ' / ' + WF_S_TARGET;

            if (wfWasm.S_param < WF_S_TARGET) {
                wfAnimTimeoutId = setTimeout(doStep, WF_STEP_DELAY);
            } else {
                wfAnimating = false;
                if (statusEl) statusEl.textContent = '';
            }
        }

        wfAnimTimeoutId = setTimeout(doStep, WF_STEP_DELAY);
    }

    // ===================================================================
    // Active simulation tracking
    // ===================================================================

    let activeSim = null; // 'cftp' | 'waterfall' | null

    function disposeActive() {
        if (activeSim === 'cftp') {
            cftpAnimating = false;
            cftpAutoRotating = false;
            disposeCFTPThreeJS();
        } else if (activeSim === 'waterfall') {
            disposeWaterfallThreeJS();
        }
        activeSim = null;
        if (statusEl) statusEl.textContent = '';
    }

    // ===================================================================
    // Slide engine registration — 5-step build order
    // ===================================================================
    // Banner always visible
    // Step 1: Show CFTP pane
    // Step 2: Show "Why works" pane
    // Step 3: Run CFTP animation
    // Step 4: Show "Why fails" pane
    // Step 5: Dispose CFTP → start waterfall

    window.slideEngine.registerSimulation('computational', {
        steps: 5,

        onSlideEnter: function() {
            // Banner is always visible (no opacity transition)
        },

        onSlideLeave: function() {
            disposeActive();
        },

        onStep: function(step) {
            if (step === 1) {
                showElement('comp-cftp');
            }
            if (step === 2) {
                showElement('comp-why-works');
            }
            if (step === 3) {
                // Init CFTP Three.js + run forward coupled Glauber
                (async () => {
                    const ok = await initCFTPWasm();
                    if (!ok) { console.warn('computational: CFTP wasm not available'); return; }
                    initCFTPThreeJS();
                    startCFTPRenderLoop();
                    activeSim = 'cftp';
                    await runCFTPAnimated();
                })().catch(e => console.error('computational CFTP error:', e));
            }
            if (step === 4) {
                showElement('comp-why-fails');
            }
            if (step === 5) {
                // Dispose CFTP, start waterfall
                cftpAnimating = false;
                cftpAutoRotating = false;
                disposeCFTPThreeJS();
                initWaterfallThreeJS();
                startWfRenderLoop();
                activeSim = 'waterfall';
                runWaterfallAnimation();
            }
        },

        onStepBack: function(step) {
            if (step === 5) {
                // Undo waterfall: dispose, re-init CFTP with quick sample + auto-rotate
                disposeWaterfallThreeJS();
                (async () => {
                    const ok = await initCFTPWasm();
                    if (!ok) return;
                    initCFTPThreeJS();
                    startCFTPRenderLoop();
                    activeSim = 'cftp';
                    await runCFTPQuick();
                })();
            }
            if (step === 4) {
                hideElement('comp-why-fails');
            }
            if (step === 3) {
                // Undo CFTP animation: stop and dispose
                cftpAnimating = false;
                cftpAutoRotating = false;
                disposeCFTPThreeJS();
                activeSim = null;
                if (statusEl) statusEl.textContent = '';
            }
            if (step === 2) {
                hideElement('comp-why-works');
            }
            if (step === 1) {
                hideElement('comp-cftp');
            }
        },

        reset: function() {
            hideElement('comp-cftp');
            hideElement('comp-why-works');
            hideElement('comp-why-fails');
        }
    }, 0);
})();
