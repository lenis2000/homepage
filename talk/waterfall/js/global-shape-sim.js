/**
 * Global Shape Slide - 3D q-Racah lozenge tiling simulation
 * Similar to waterfall-phenomenon but with different camera angle
 */

(function initGlobalShapeSim() {
    if (!window.slideEngine) {
        setTimeout(initGlobalShapeSim, 50);
        return;
    }

    const canvas = document.getElementById('global-shape-canvas');
    if (!canvas) return;

    // ===== WASM INTERFACE =====
    let wasmReady = false;
    const wasmInterface = {
        ready: false,
        N_param: 35,
        T_param: 70,
        S_param: 0,
        S_target: 35,
        imaginary_q: 0.85,
        kappa_i: 2.5,
        paths: [],

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

        async initTiling() {
            if (!this.ready) return;
            try {
                this.S_param = 0;
                const kappasq = this.kappa_i * this.kappa_i;
                this.setImaginaryQ(this.imaginary_q);
                const ptr = await this.initializeTiling(this.N_param, this.T_param, 0, 7, -kappasq);
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    this.S_param = result.s || 0;
                }
                await this.refreshPaths();
            } catch (e) { console.error('Init failed:', e); }
        },

        async stepForward() {
            if (!this.ready || this.S_param >= this.T_param) return false;
            try {
                const ptr = await this.performSOperator();
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    this.S_param = result.s;
                    await this.refreshPaths();
                    return true;
                }
            } catch (e) { console.error('Step failed:', e); }
            return false;
        },

        async refreshPaths() {
            try {
                const ptr = await this.exportPaths();
                if (ptr) {
                    const jsonStr = Module.UTF8ToString(ptr);
                    this.freeString(ptr);
                    const result = JSON.parse(jsonStr);
                    this.paths = result.paths;
                }
            } catch (e) { console.error('Export paths failed:', e); }
        }
    };

    let wasmInitAttempts = 0;
    function tryInitWasm() {
        wasmInitAttempts++;
        if (typeof Module !== 'undefined' && typeof Module.cwrap === 'function') {
            const success = wasmInterface.initialize();
            if (success) wasmReady = true;
        } else {
            if (wasmInitAttempts < 100) setTimeout(tryInitWasm, 100);
        }
    }
    tryInitWasm();

    const colors = { gray1: '#FFFFFF', gray2: '#FFFFFF', gray3: '#FFFFFF' };

    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let renderLoopId = null, animationId = null, isRunning = false;
    let currentN = 0, currentT = 0, currentS = 0;

    function initThreeJS() {
        if (renderer) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;

        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        const hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);
        const directional = new THREE.DirectionalLight(0xffffff, 1.2);
        directional.position.set(15, 20, 5);
        scene.add(directional);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        // Top-down view to show global shape
        camera.position.set(20, 20, 80);
        camera.up.set(0, 0, 1);
        controls.target.set(20, 20, 15);
        controls.update();

        function renderLoop() {
            if (!renderer) return;
            controls.update();
            renderer.render(scene, camera);
            renderLoopId = requestAnimationFrame(renderLoop);
        }
        renderLoop();
        resize();
    }

    function disposeThreeJS() {
        if (!renderer) return;
        if (renderLoopId) cancelAnimationFrame(renderLoopId);
        if (animationId) clearTimeout(animationId);
        isRunning = false;

        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }
        }
        renderer.dispose();
        renderer = null; scene = null; camera = null; controls = null; meshGroup = null;
    }

    function resize() {
        if (!renderer || !camera) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    function pathsTo3D(paths, N, T, S) {
        if (!meshGroup) return;
        currentN = N; currentT = T; currentS = S;

        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
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
                const prev = adjustedPath[j-1], curr = adjustedPath[j];
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
            vertices.push(v1[1], v1[0], v1[2], v2[1], v2[0], v2[2], v3[1], v3[0], v3[2], v4[1], v4[0], v4[2]);

            const edge1 = [v2[1] - v1[1], v2[0] - v1[0], v2[2] - v1[2]];
            const edge2 = [v3[1] - v1[1], v3[0] - v1[0], v3[2] - v1[2]];
            const normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0]
            ];
            const len = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
            if (len > 0) { normal[0] /= len; normal[1] /= len; normal[2] /= len; }

            for (let i = 0; i < 4; i++) normals.push(normal[0], normal[1], normal[2]);
            const c = new THREE.Color(color);
            for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
        }

        for (let pathIdx = 1; pathIdx < pathTriplets.length; pathIdx++) {
            const topPath = pathTriplets[pathIdx];
            const bottomPath = topPath.map(point => [point[0], point[1], point[2] - 1]);

            for (let i = 0; i < topPath.length - 1; i++) {
                const topP1 = topPath[i], topP2 = topPath[i + 1];
                const bottomP1 = bottomPath[i], bottomP2 = bottomPath[i + 1];

                let color = colors.gray3;
                if (topP2[0] > topP1[0] && topP2[1] === topP1[1]) color = colors.gray2;
                else if (topP2[0] === topP1[0] && topP2[1] > topP1[1]) color = colors.gray1;

                addSquareFace(topP1, topP2, bottomP2, bottomP1, color);
            }
        }

        // Add horizontal lozenges (simplified version)
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
            for (const [x, y, z] of path) table.push(x === y ? y : x);
            return extractLastFromIncreasing(table);
        }

        for (let pathIdx = 0; pathIdx < pathTriplets.length - 1; pathIdx++) {
            const upperPath = pathTriplets[pathIdx];
            const lowerPath = pathTriplets[pathIdx + 1];
            const zLevel = upperPath[0][2] - 1;

            const upperQ = calculateQFunction(upperPath);
            const lowerQ = calculateQFunction(lowerPath);

            for (let a = 0; a <= S; a++) {
                for (let b = 0; b <= T - S; b++) {
                    const upperVal = upperQ[b] || 0;
                    const lowerVal = lowerQ[b] || 0;
                    if (upperVal > a && a >= lowerVal) {
                        const square = [[a, b, zLevel], [a + 1, b, zLevel], [a + 1, b + 1, zLevel], [a, b + 1, zLevel]];
                        addSquareFace(square[0], square[1], square[2], square[3], colors.gray3);
                    }
                }
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.3, metalness: 0.35, color: 0xddeeff
        });
        meshGroup.add(new THREE.Mesh(geometry, material));

        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x444466, opacity: 0.6, transparent: true });
        meshGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 10), edgesMaterial));
    }

    function buildGeometry() {
        pathsTo3D(wasmInterface.paths, wasmInterface.N_param, wasmInterface.T_param, wasmInterface.S_param);
        if (renderer && scene && camera) renderer.render(scene, camera);
    }

    async function initTilingEmpty() {
        if (!wasmInterface.ready) {
            setTimeout(initTilingEmpty, 100);
            return;
        }
        await wasmInterface.initTiling();
        buildGeometry();
    }

    async function doSlowAnimationStep() {
        if (!isRunning || !renderer) return;
        if (wasmInterface.S_param >= wasmInterface.S_target) {
            isRunning = false;
            updatePlayBtn();
            return;
        }
        await wasmInterface.stepForward();
        buildGeometry();
        if (isRunning) animationId = setTimeout(doSlowAnimationStep, 500);
    }

    const playBtn = document.getElementById('global-shape-play-btn');
    function updatePlayBtn() { if (playBtn) playBtn.textContent = isRunning ? '⏸' : '▶'; }
    function start() { if (!isRunning) { isRunning = true; updatePlayBtn(); doSlowAnimationStep(); } }
    function pause() { isRunning = false; if (animationId) clearTimeout(animationId); updatePlayBtn(); }
    function toggle() { if (isRunning) pause(); else start(); }
    if (playBtn) playBtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });

    const mechanismEl = document.getElementById('global-shape-mechanism');
    const regionsEl = document.getElementById('global-shape-regions');

    function reset() {
        if (mechanismEl) mechanismEl.style.opacity = '0';
        if (regionsEl) regionsEl.style.opacity = '0';
    }

    window.slideEngine.registerSimulation('global-shape', {
        start, pause, steps: 3,
        onSlideEnter() {
            initThreeJS();
            setTimeout(async () => {
                resize();
                await initTilingEmpty();
            }, 50);
        },
        onSlideLeave() { disposeThreeJS(); reset(); },
        onStep(step) {
            if (step === 1) start();
            else if (step === 2 && mechanismEl) mechanismEl.style.opacity = '1';
            else if (step === 3 && regionsEl) regionsEl.style.opacity = '1';
        },
        onStepBack(step) {
            if (step === 0) { pause(); initTilingEmpty(); reset(); }
            else if (step === 1 && mechanismEl) { mechanismEl.style.opacity = '0'; if (regionsEl) regionsEl.style.opacity = '0'; }
            else if (step === 2 && regionsEl) regionsEl.style.opacity = '0';
        }
    }, 1);
})();
