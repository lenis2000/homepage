// Summary slide simulation - shows 3D waterfall with step reveals
(function() {
    const slideId = 'summary';
    const canvas = document.getElementById('summary-canvas');

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('summary-vertical');
        hideElement('summary-transversal');
        hideElement('summary-edge');
        hideElement('summary-arxiv');
    }

    function onStep(step) {
        if (step >= 1) showElement('summary-vertical');
        if (step >= 2) showElement('summary-transversal');
        if (step >= 3) showElement('summary-edge');
        if (step >= 4) showElement('summary-arxiv');
    }

    function onStepBack(step) {
        if (step < 4) hideElement('summary-arxiv');
        if (step < 3) hideElement('summary-edge');
        if (step < 2) hideElement('summary-transversal');
        if (step < 1) hideElement('summary-vertical');
    }

    // Check if Three.js and WASM are available
    if (typeof THREE === 'undefined') {
        console.log('summary-sim: Three.js not loaded yet');
    }

    let scene, camera, renderer, controls, meshGroup;
    let renderLoopId = null;
    let wasmInterface = null;
    let isInitialized = false;

    function initThreeJS() {
        if (!canvas || renderer) return;

        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 400;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        camera = new THREE.OrthographicCamera(-200, 200, 150, -150, 0.1, 5000);
        camera.position.set(300, 200, 300);
        camera.zoom = 1.2;
        camera.updateProjectionMatrix();

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.target.set(0, 50, 0);
        controls.update();

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        const hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);
        const directional = new THREE.DirectionalLight(0xffffff, 1.2);
        directional.position.set(15, 20, 5);
        scene.add(directional);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);
    }

    function disposeThreeJS() {
        if (renderLoopId) {
            cancelAnimationFrame(renderLoopId);
            renderLoopId = null;
        }
        if (!renderer) return;

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

    function renderLoop() {
        if (!renderer || !camera || !controls) return;
        controls.update();
        renderer.render(scene, camera);
        renderLoopId = requestAnimationFrame(renderLoop);
    }

    async function initWasm() {
        if (typeof LozengeModule === 'undefined') {
            console.log('summary-sim: LozengeModule not available');
            return;
        }

        try {
            const wasmInstance = await LozengeModule();
            wasmInterface = {
                initializeTiling: wasmInstance.cwrap('initializeTiling', 'number', ['number', 'number', 'number', 'number', 'number']),
                stepForward: wasmInstance.cwrap('stepForward', 'number', []),
                setImaginaryQ: wasmInstance.cwrap('setImaginaryQ', null, ['number']),
                exportLozenges: wasmInstance.cwrap('exportLozenges', 'string', [])
            };

            // Initialize with waterfall parameters
            const N = 30, T = 30;
            const q = 0.7;
            const kappa_i = 3.0;
            const kappasq = kappa_i * kappa_i;

            wasmInterface.setImaginaryQ(q);
            await wasmInterface.initializeTiling(N, T, 0, 7, -kappasq);

            // Run some steps
            for (let i = 0; i < 500; i++) {
                await wasmInterface.stepForward();
            }

            buildGeometry();
            isInitialized = true;
        } catch (e) {
            console.log('summary-sim: WASM init error', e);
        }
    }

    function buildGeometry() {
        if (!wasmInterface || !meshGroup) return;

        // Clear existing
        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }

        try {
            const jsonStr = wasmInterface.exportLozenges();
            const lozenges = JSON.parse(jsonStr);

            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];

            const UVA_ORANGE = new THREE.Color('#E57200');
            const UVA_BLUE = new THREE.Color('#232D4B');
            const UVA_CREAM = new THREE.Color('#F9DCBF');

            lozenges.forEach(loz => {
                const [v0, v1, v2, v3] = loz;
                positions.push(v0[0], v0[1], v0[2]);
                positions.push(v1[0], v1[1], v1[2]);
                positions.push(v2[0], v2[1], v2[2]);
                positions.push(v0[0], v0[1], v0[2]);
                positions.push(v2[0], v2[1], v2[2]);
                positions.push(v3[0], v3[1], v3[2]);

                // Calculate normal
                const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
                const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
                const nx = ay * bz - az * by;
                const ny = az * bx - ax * bz;
                const nz = ax * by - ay * bx;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                const nnx = Math.abs(nx / len), nny = Math.abs(ny / len), nnz = Math.abs(nz / len);

                let color;
                if (nnx >= nny && nnx >= nnz) color = UVA_ORANGE;
                else if (nny >= nnx && nny >= nnz) color = UVA_BLUE;
                else color = UVA_CREAM;

                for (let i = 0; i < 6; i++) {
                    colors.push(color.r, color.g, color.b);
                }
            });

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                flatShading: true,
                roughness: 0.3,
                metalness: 0.35,
                color: 0xddeeff
            });

            const mesh = new THREE.Mesh(geometry, material);
            meshGroup.add(mesh);

            // Center the geometry
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const center = new THREE.Vector3();
            box.getCenter(center);
            meshGroup.position.set(-center.x, -center.y, -center.z);

        } catch (e) {
            console.log('summary-sim: geometry build error', e);
        }
    }

    function start() {
        initThreeJS();
        if (!isInitialized && typeof LozengeModule !== 'undefined') {
            initWasm();
        }
        renderLoop();
    }

    function pause() {
        if (renderLoopId) {
            cancelAnimationFrame(renderLoopId);
            renderLoopId = null;
        }
    }

    // Register with slide engine (with retry for load timing)
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start,
                pause,
                steps: 4,
                onStep,
                onStepBack,
                onSlideEnter() { reset(); initThreeJS(); },
                onSlideLeave() { disposeThreeJS(); }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();

    // Init on wasm-loaded
    function init() {
        if (typeof LozengeModule !== 'undefined') {
            // Ready
        } else {
            window.addEventListener('wasm-loaded', init, { once: true });
        }
    }
    init();
})();
