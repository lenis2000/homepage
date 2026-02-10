/**
 * Hard to Sample Slide — Slow CFTP with periodic weights
 *
 * Same as CFTP slide but with extreme periodic q-bias (checkerboard)
 * that creates competing forces → exponentially slow coalescence.
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
    // WASM setup (isolated modularized instance)
    // ===================================================================

    let wasm = null;
    let funcs = null;
    let wasmInitPromise = null;

    const HEX_SIDE = 20;

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
                    forwardCoupledStep: wasm.cwrap('forwardCoupledStep', 'number', ['number']),
                    finalizeCFTP: wasm.cwrap('finalizeCFTP', 'number', []),
                    exportCFTPMinDimers: wasm.cwrap('exportCFTPMinDimers', 'number', []),
                    exportCFTPMaxDimers: wasm.cwrap('exportCFTPMaxDimers', 'number', []),
                    exportDimers: wasm.cwrap('exportDimers', 'number', []),
                    freeString: wasm.cwrap('freeString', null, ['number']),
                    setQBias: wasm.cwrap('setQBias', null, ['number']),
                    setPeriodicQBias: wasm.cwrap('setPeriodicQBias', null, ['number', 'number']),
                    setUsePeriodicWeights: wasm.cwrap('setUsePeriodicWeights', null, ['number']),
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

    function loadShapeIntoWasm() {
        if (!wasm || !funcs) return;
        const triArr = generateHexagonTriangles(HEX_SIDE);
        const ptr = wasm._malloc(triArr.length * 4);
        for (let i = 0; i < triArr.length; i++) {
            wasm.setValue(ptr + i * 4, triArr[i], 'i32');
        }
        funcs.initFromTriangles(ptr, triArr.length);
        wasm._free(ptr);
    }

    function setPeriodicWeights() {
        if (!wasm || !funcs) return;
        funcs.setQBias(0.9);
    }

    function wasmCallJSON(fn) {
        const ptr = fn();
        const str = wasm.UTF8ToString(ptr);
        funcs.freeString(ptr);
        return JSON.parse(str);
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

        // Camera for N=20 hexagon
        camera.position.set(21, 11, 41);
        camera.zoom = 1.0;
        camera.updateProjectionMatrix();
        controls.target.set(-10, -12, 6);
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
    // Dimer → 3D geometry (same as cftp-sim.js)
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
    // Animated CFTP with slow convergence
    // ===================================================================

    const STEP_DELAY = 600;
    const MILESTONES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    const AFTER_MILESTONES = 50000;

    function getNextMilestone(currentStep) {
        for (const m of MILESTONES) {
            if (m > currentStep) return m;
        }
        const last = MILESTONES[MILESTONES.length - 1];
        const beyond = currentStep - last;
        return last + (Math.floor(beyond / AFTER_MILESTONES) + 1) * AFTER_MILESTONES;
    }

    let stepGeneration = 0;

    async function runAnimated(gen) {
        if (!wasm || !funcs) return;
        animating = true;
        autoRotating = false;

        loadShapeIntoWasm();
        setPeriodicWeights();
        wasmCallJSON(funcs.initCFTP);

        // Show initial min/max bounds
        if (meshGroup) {
            const minD = wasmCallJSON(funcs.exportCFTPMinDimers);
            const maxD = wasmCallJSON(funcs.exportCFTPMaxDimers);
            renderBounds(minD.dimers, maxD.dimers);
        }
        if (statusEl) statusEl.textContent = 'coupled Glauber: step 0';
        await new Promise(r => setTimeout(r, STEP_DELAY));
        if (gen !== stepGeneration) return;

        let totalSteps = 0;
        while (animating && gen === stepGeneration) {
            const nextMilestone = getNextMilestone(totalSteps);
            const stepsToRun = nextMilestone - totalSteps;
            const result = wasmCallJSON(() => funcs.forwardCoupledStep(stepsToRun));
            totalSteps = nextMilestone;

            if (result.status === 'coalesced') {
                if (statusEl) statusEl.textContent = 'coalesced at step ' + (result.step || '?');
                break;
            } else if (result.status === 'in_progress') {
                if (meshGroup) {
                    const minD = wasmCallJSON(funcs.exportCFTPMinDimers);
                    const maxD = wasmCallJSON(funcs.exportCFTPMaxDimers);
                    renderBounds(minD.dimers, maxD.dimers);
                }
                if (statusEl) statusEl.textContent = 'coupled Glauber: step ' + result.step;
                await new Promise(r => setTimeout(r, STEP_DELAY));
                if (gen !== stepGeneration) return;
            } else {
                break;
            }
        }

        // If coalesced, show final surface
        if (animating && meshGroup && gen === stepGeneration) {
            wasmCallJSON(funcs.finalizeCFTP);
            const dimersResult = wasmCallJSON(funcs.exportDimers);
            renderCoalesced(dimersResult.dimers || []);
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

        onSlideEnter: function() {},

        onSlideLeave: function() {
            disposeAll();
        },

        onStep: function(step) {
            if (step === 1) startAnimation();
        },

        onStepBack: function(step) {
            if (step === 0) disposeAll();
        },

        reset: function() {
            disposeAll();
        }
    }, 0);
})();
