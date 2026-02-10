/**
 * Hard to Sample Slide — Coupled Glauber Dynamics with q-bias weights
 * Pure JS implementation (no WASM needed for N=8)
 *
 * Parameters: N=8, q=0.5, weight w(h) = q^h + q^{-h}
 * Heat-bath: accept up with R/(1+R), down with 1/(1+R), R = w(h+1)/w(h)
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

    const N = 8;
    const T = 2 * N;
    const Q = 0.5;
    const LN_Q = Math.log(Q);

    // ===================================================================
    // Path representation: N non-intersecting ±1 paths
    // Path k (k=0 topmost) goes from (0, N-1-k) to (T, 2N-1-k)
    // ===================================================================

    function makeMinPaths() {
        const paths = [];
        for (let k = 0; k < N; k++) {
            const row = new Float64Array(T + 1);
            for (let t = 0; t <= T; t++)
                row[t] = (N - 1 - k) + Math.max(0, t - N);
            paths.push(row);
        }
        return paths;
    }

    function makeMaxPaths() {
        const paths = [];
        for (let k = 0; k < N; k++) {
            const row = new Float64Array(T + 1);
            for (let t = 0; t <= T; t++)
                row[t] = (N - 1 - k) + Math.min(t, N);
            paths.push(row);
        }
        return paths;
    }

    // ===================================================================
    // Weight ratio: w(h) = q^h + q^{-h}, R(z) = w(h+1)/w(h), h = z - N
    // ===================================================================

    function weightRatio(z) {
        const h = z - N;
        const qh = Math.exp(LN_Q * h);
        const qh1 = qh * Q;
        return (qh1 + 1 / qh1) / (qh + 1 / qh);
    }

    // ===================================================================
    // Coupled Glauber dynamics
    // ===================================================================

    function coupledSweep(pathsMin, pathsMax) {
        for (let k = 0; k < N; k++) {
            for (let tc = 1; tc < T; tc++) {
                const direction = Math.random() < 0.5 ? 1 : -1;
                const u = Math.random();
                tryFlip(pathsMin, k, tc, direction, u);
                tryFlip(pathsMax, k, tc, direction, u);
            }
        }
    }

    function tryFlip(paths, k, tc, direction, u) {
        const cur = paths[k][tc];
        const proposed = cur + direction;
        if (proposed < 0 || proposed > T) return;

        const left = paths[k][tc - 1];
        const right = paths[k][tc + 1];
        if (Math.abs(proposed - left) !== 1 || Math.abs(proposed - right) !== 1) return;

        // Non-intersection (strict inequality)
        if (k > 0 && proposed >= paths[k - 1][tc]) return;
        if (k < N - 1 && proposed <= paths[k + 1][tc]) return;

        // Heat-bath acceptance
        let acceptProb;
        if (direction === 1) {
            const R = weightRatio(cur);
            acceptProb = R / (1 + R);
        } else {
            const R = weightRatio(cur - 1);
            acceptProb = 1 / (1 + R);
        }

        if (u < acceptProb) paths[k][tc] = proposed;
    }

    function countDisagreements(pathsMin, pathsMax) {
        let count = 0;
        for (let k = 0; k < N; k++)
            for (let t = 0; t <= T; t++)
                if (pathsMin[k][t] !== pathsMax[k][t]) count++;
        return count;
    }

    // ===================================================================
    // Paths → plane partition π(a,b)
    // π(a,b) = #{k : paths[k][a+b] ≤ a + (N-1-k)}
    // ===================================================================

    function pathsToPi(paths) {
        const pi = [];
        for (let a = 0; a < N; a++) {
            pi[a] = [];
            for (let b = 0; b < N; b++) {
                let count = 0;
                const t = a + b;
                for (let k = 0; k < N; k++) {
                    if (paths[k][t] <= a + (N - 1 - k)) count++;
                }
                pi[a][b] = count;
            }
        }
        return pi;
    }

    // ===================================================================
    // Three.js setup (matching CFTP dark metallic style)
    // ===================================================================

    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let renderLoopId = null;
    let autoRotating = false;
    let animating = false;
    let stepGeneration = 0;

    const frustumSize = 16;

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

        // Camera for N=8 hexagon (will tune after visual test)
        camera.position.set(10, 5, 18);
        camera.zoom = 1.0;
        camera.updateProjectionMatrix();
        controls.target.set(-3, -5.5, 2);
        controls.update();

        // Debug: log camera position on move
        controls.addEventListener('change', () => {
            console.log('Camera pos:', camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1),
                        '| Target:', controls.target.x.toFixed(1), controls.target.y.toFixed(1), controls.target.z.toFixed(1),
                        '| Zoom:', camera.zoom.toFixed(2));
        });

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
                offset.x = newX;
                offset.y = newY;
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
    // Build 3D surface from plane partition
    // to3D(a,b,c) maps box coords to isometric 3D (same as cftp-sim)
    // ===================================================================

    function to3D(a, b, c) {
        return { x: c, y: -a - c, z: b - c };
    }

    function buildSurfaceFromPi(pi, opacity, colorMod) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [], normals = [], vertexColors = [], indices = [];

        function addQuad(v0, v1, v2, v3, color) {
            const baseIndex = vertices.length / 3;
            vertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
            // Compute normal from cross product
            const e1x = v1.x - v0.x, e1y = v1.y - v0.y, e1z = v1.z - v0.z;
            const e2x = v3.x - v0.x, e2y = v3.y - v0.y, e2z = v3.z - v0.z;
            const nx = e1y * e2z - e1z * e2y;
            const ny = e1z * e2x - e1x * e2z;
            const nz = e1x * e2y - e1y * e2x;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            for (let i = 0; i < 4; i++) normals.push(nx / len, ny / len, nz / len);
            const c = new THREE.Color(color);
            c.r *= colorMod; c.g *= colorMod; c.b *= colorMod;
            for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
        }

        for (let a = 0; a < N; a++) {
            for (let b = 0; b < N; b++) {
                const h = pi[a][b];
                if (h <= 0) continue;

                // Top face at height h
                addQuad(to3D(a, b, h), to3D(a + 1, b, h), to3D(a + 1, b + 1, h), to3D(a, b + 1, h), '#FFFFFF');

                // Front faces (a-direction): visible where pi(a,b) > pi(a+1,b)
                const hFront = (a + 1 < N) ? pi[a + 1][b] : 0;
                for (let c = hFront; c < h; c++)
                    addQuad(to3D(a + 1, b, c), to3D(a + 1, b + 1, c), to3D(a + 1, b + 1, c + 1), to3D(a + 1, b, c + 1), '#FFFFFF');

                // Side faces (b-direction): visible where pi(a,b) > pi(a,b+1)
                const hSide = (b + 1 < N) ? pi[a][b + 1] : 0;
                for (let c = hSide; c < h; c++)
                    addQuad(to3D(a, b + 1, c), to3D(a + 1, b + 1, c), to3D(a + 1, b + 1, c + 1), to3D(a, b + 1, c + 1), '#FFFFFF');
            }
        }

        // Back wall (a=0)
        for (let b = 0; b < N; b++) {
            const h = pi[0][b];
            for (let c = 0; c < h; c++)
                addQuad(to3D(0, b, c), to3D(0, b + 1, c), to3D(0, b + 1, c + 1), to3D(0, b, c + 1), '#FFFFFF');
        }

        // Side wall (b=0)
        for (let a = 0; a < N; a++) {
            const h = pi[a][0];
            for (let c = 0; c < h; c++)
                addQuad(to3D(a, 0, c), to3D(a + 1, 0, c), to3D(a + 1, 0, c + 1), to3D(a, 0, c + 1), '#FFFFFF');
        }

        if (vertices.length === 0) return null;

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
    // Rendering helpers
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

    function renderBounds(pathsMin, pathsMax) {
        clearMesh();
        if (!meshGroup) return;
        const meshMax = buildSurfaceFromPi(pathsToPi(pathsMax), 0.6, 1.0);
        if (meshMax) meshGroup.add(meshMax);
        const meshMin = buildSurfaceFromPi(pathsToPi(pathsMin), 0.6, 0.7);
        if (meshMin) meshGroup.add(meshMin);
    }

    function renderCoalesced(paths) {
        clearMesh();
        if (!meshGroup) return;
        const mesh = buildSurfaceFromPi(pathsToPi(paths), 1.0, 1.0);
        if (mesh) {
            meshGroup.add(mesh);
            const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 10);
            meshGroup.add(new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({
                color: 0x444466, opacity: 0.4, transparent: true
            })));
        }
    }

    // ===================================================================
    // Animation
    // ===================================================================

    const STEP_DELAY = 400;
    const SWEEPS_PER_FRAME = 50;

    async function runCoupledAnimation(gen) {
        animating = true;
        autoRotating = false;

        const pathsMin = makeMinPaths();
        const pathsMax = makeMaxPaths();

        renderBounds(pathsMin, pathsMax);
        let totalSweeps = 0;
        let disagreements = countDisagreements(pathsMin, pathsMax);
        if (statusEl) statusEl.textContent = 'coupled Glauber: sweep ' + totalSweeps + ' | disagreements: ' + disagreements;

        await new Promise(r => setTimeout(r, STEP_DELAY));
        if (gen !== stepGeneration) return;

        while (animating && gen === stepGeneration && disagreements > 0) {
            for (let i = 0; i < SWEEPS_PER_FRAME; i++)
                coupledSweep(pathsMin, pathsMax);
            totalSweeps += SWEEPS_PER_FRAME;

            disagreements = countDisagreements(pathsMin, pathsMax);
            renderBounds(pathsMin, pathsMax);
            if (statusEl) statusEl.textContent = 'coupled Glauber: sweep ' + totalSweeps + ' | disagreements: ' + disagreements;

            await new Promise(r => setTimeout(r, STEP_DELAY));
            if (gen !== stepGeneration) return;
        }

        if (animating && meshGroup && gen === stepGeneration) {
            if (statusEl) statusEl.textContent = 'coalesced at sweep ' + totalSweeps;
            renderCoalesced(pathsMin);
            autoRotating = true;
        }
        animating = false;
    }

    // ===================================================================
    // Slide engine registration
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
        initThreeJS();
        startRenderLoop();
        runCoupledAnimation(gen).catch(e => console.error('hard-to-sample error:', e));
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
