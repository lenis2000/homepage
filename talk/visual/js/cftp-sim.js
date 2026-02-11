// APPROVED: Do not modify without explicit user request
/**
 * CFTP Slide — 3D CFTP Visualization
 * Build order:
 *   0. Initial state (canvas, nothing running)
 *   1. Show CFTP explanation + start CFTP animation
 *   2. Show "Why works" (monotone coupling)
 *   3. Show "Exactly random" highlight
 *
 * Uses LozengeModule (modularized WASM) for CFTP.
 */

(function initCFTPSim() {
    if (!window.slideEngine) {
        setTimeout(initCFTPSim, 50);
        return;
    }

    const canvas = document.getElementById('cftp-sim-canvas');
    const statusEl = document.getElementById('cftp-sim-status');
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
    const HEX_SIDE = 35;

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
                console.warn('cftp: LozengeModule not available');
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
                console.error('Failed to init LozengeModule for cftp:', e);
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
        cftpScene.background = new THREE.Color(0xffffff);
        cftpRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        cftpRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        cftpCamera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2,
            -5000, 6000
        );

        cftpControls = new THREE.OrbitControls(cftpCamera, cftpRenderer.domElement);
        cftpControls.enableDamping = true;
        cftpControls.dampingFactor = 0.1;
        cftpControls.rotateSpeed = 0.8;
        cftpControls.enablePan = true;
        cftpControls.enableZoom = true;

        // Lighting (UVA preset)
        cftpScene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        hemi.position.set(0, 20, 0);
        cftpScene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(10, 10, 15);
        cftpScene.add(dir);
        const fill = new THREE.DirectionalLight(0xffffff, 0.25);
        fill.position.set(-10, -5, -10);
        cftpScene.add(fill);

        cftpMeshGroup = new THREE.Group();
        cftpScene.add(cftpMeshGroup);

        // Camera position for hexagonal tiling
        cftpCamera.position.set(-28.2, 2.6, 87.9);
        cftpCamera.zoom = 1.11;
        cftpCamera.updateProjectionMatrix();
        cftpControls.target.set(-11.9, -18.2, 16.2);
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
        const AUTO_ROTATE_SPEED = 0.003;
        function loop() {
            if (!cftpRenderer || !cftpCamera || !cftpControls) return;
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

    // --- CFTP geometry building ---

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

    const UVA_COLORS = ['#E57200', '#232D4B', '#F9DCBF'];

    function buildSurface(dimers, heights, opacity, colorMod) {
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

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true,
            roughness: 0.5, metalness: 0.15,
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
                color: 0x000000, opacity: 0.6, transparent: true
            })));
        }
    }

    // --- Forward coupled Glauber animation (no T-doubling) ---

    const CFTP_STEP_DELAY = 800;
    const CFTP_MILESTONES = [2, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500, 700];
    const CFTP_AFTER_MILESTONES = 200;

    function getNextMilestone(currentStep) {
        for (const m of CFTP_MILESTONES) {
            if (m > currentStep) return m;
        }
        const last = CFTP_MILESTONES[CFTP_MILESTONES.length - 1];
        const beyond = currentStep - last;
        return last + (Math.floor(beyond / CFTP_AFTER_MILESTONES) + 1) * CFTP_AFTER_MILESTONES;
    }

    async function runCFTPAnimated(gen) {
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
        if (gen !== stepGeneration) return;

        let totalSteps = 0;
        while (cftpAnimating && gen === stepGeneration) {
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
                if (gen !== stepGeneration) return;
            } else if (result.status === 'already_coalesced') {
                break;
            } else {
                break;
            }
        }

        // Finalize: show single coalesced surface
        if (cftpAnimating && cftpMeshGroup && gen === stepGeneration) {
            wasmCallJSON(cftpFuncs.finalizeCFTP);
            const dimersResult = wasmCallJSON(cftpFuncs.exportDimers);
            renderCFTPCoalesced(dimersResult.dimers || []);
            cftpAutoRotating = true;
        }

        cftpAnimating = false;
    }

    async function runCFTPQuick() {
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
    // Active simulation tracking
    // ===================================================================

    let stepGeneration = 0;

    function disposeAll() {
        stepGeneration++;
        cftpAnimating = false;
        cftpAutoRotating = false;
        disposeCFTPThreeJS();
        if (statusEl) statusEl.textContent = '';
    }

    // ===================================================================
    // Slide engine registration — 3-step build order
    // ===================================================================
    // On enter: Show CFTP explanation pane
    // Step 1: Show "Monotone sandwich" pane
    // Step 2: Start CFTP sandwich dynamics animation
    // Step 3: Show "Exactly random" highlight

    function startCFTPAnimation() {
        const gen = ++stepGeneration;
        (async () => {
            const ok = await initCFTPWasm();
            if (!ok) { console.warn('cftp: CFTP wasm not available'); return; }
            if (gen !== stepGeneration) return;
            initCFTPThreeJS();
            startCFTPRenderLoop();
            await runCFTPAnimated(gen);
        })().catch(e => console.error('cftp error:', e));
    }

    window.slideEngine.registerSimulation('cftp', {
        steps: 2,

        onSlideEnter: function() {
            showElement('cftp-explain');
        },

        onSlideLeave: function() {
            disposeAll();
        },

        start: function() {
            showElement('cftp-explain');
        },

        onStep: function(step) {
            if (step === 1) {
                showElement('cftp-explain');
                showElement('cftp-hex-label');
                startCFTPAnimation();
            }
            if (step === 2) {
                showElement('cftp-explain');
                showElement('cftp-hex-label');
                showElement('cftp-exact');
            }
        },

        onStepBack: function(step) {
            if (step === 1) {
                hideElement('cftp-exact');
            }
            if (step === 0) {
                hideElement('cftp-exact');
                hideElement('cftp-hex-label');
                disposeAll();
            }
        },

        reset: function() {
            disposeAll();
            hideElement('cftp-explain');
            hideElement('cftp-hex-label');
            hideElement('cftp-exact');
            if (statusEl) statusEl.textContent = '';
        }
    }, 0);
})();
