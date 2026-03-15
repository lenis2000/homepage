(function() {
    'use strict';

    const SLIDE_ID = 'random-weights-setup';
    const CANVAS_ID = 'random-weights-canvas';
    const N = 200;

    let shufflingModule = null;
    let wasmReady = false;
    let sampling = false;
    let cachedDominoes = null;
    let pendingSampleResolvers = [];
    let samplePromise = null;

    // Three.js state
    let scene = null, renderer = null, camera = null, controls = null;
    let meshGroup = null;
    let renderLoopId = null;

    // Camera positions
    const CAM_3D = {
        pos: { x: 40.3, y: 20.2, z: 41.9 },
        target: { x: 0.0, y: -11.7, z: 1.2 },
        zoom: 0.95
    };
    const CAM_3D_ALT = {
        pos: { x: 8.7, y: 43.9, z: 35.1 },
        target: { x: -2.9, y: -12.5, z: 3.6 },
        zoom: 3.61
    };
    const CAM_TOPDOWN = {
        pos: { x: 1.5, y: 53.1, z: 0.7 },
        target: { x: 0.7, y: -12.5, z: -0.1 },
        zoom: 1.51
    };

    // --- WASM ---

    async function initWasm() {
        if (wasmReady) return true;
        if (typeof createShufflingModule === 'undefined') return false;
        try {
            shufflingModule = await createShufflingModule();
            wasmReady = true;
            return true;
        } catch (e) {
            console.error('[random-weights] WASM init failed:', e);
            return false;
        }
    }

    function ensureSample() {
        if (cachedDominoes) return Promise.resolve(cachedDominoes);
        if (samplePromise) return samplePromise;
        samplePromise = sampleTiling().then(d => { samplePromise = null; return d; });
        return samplePromise;
    }

    async function sampleTiling() {
        if (sampling) return new Promise(resolve => pendingSampleResolvers.push(resolve));
        if (!wasmReady && !(await initWasm())) return null;
        sampling = true;
        console.log('[random-weights] Sampling N=' + N + '...');
        const t0 = performance.now();
        try {
            const dim = 2 * N;
            const numWeights = dim * dim;
            const weightsPtr = shufflingModule._malloc(numWeights * 8);

            // Build the EKLP weight matrix with diagonal-layered Bernoulli weights
            // Diagonal layer index = faceX - faceY = 2*diagJ - N, so it varies with
            // EKLP column j (diagJ = floor(j/2)). Each diagonal gets its own W_k.
            // Pre-generate one weight per diagonal layer
            const diagWeights = new Float64Array(N);
            for (let k = 0; k < N; k++) {
                diagWeights[k] = (Math.random() < 0.5) ? 0.5 : 5.0;
            }

            // EKLP matrix: only beta edges (even row, even col) get diagonal-layered weight.
            // Alpha (even row, odd col), gamma (odd row, even col), delta (odd row, odd col) = 1.0.
            // Beta at (2*diagI, 2*diagJ) → diagJ = j/2 gives the diagonal layer index.
            for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) {
                    let w = 1.0;
                    if (i % 2 === 0 && j % 2 === 0) {
                        // Beta edge: diagonal-layered weight
                        w = diagWeights[j / 2];
                    }
                    shufflingModule.setValue(weightsPtr + (i * dim + j) * 8, w, 'double');
                }
            }

            const resultPtr = await shufflingModule.ccall(
                'simulateAztecWithWeightMatrix', 'number',
                ['number', 'number'], [N, weightsPtr], {async: true}
            );
            shufflingModule._free(weightsPtr);
            const jsonStr = shufflingModule.UTF8ToString(resultPtr);
            shufflingModule.ccall('freeString', null, ['number'], [resultPtr]);
            const dominoes = JSON.parse(jsonStr);
            console.log('[random-weights] Sampled ' + dominoes.length + ' dominoes in ' + (performance.now() - t0).toFixed(0) + 'ms');
            // Notify anyone waiting
            pendingSampleResolvers.forEach(r => r(dominoes));
            pendingSampleResolvers = [];
            return dominoes;
        } catch (e) {
            console.error('[random-weights] Sampling failed:', e);
            return null;
        } finally {
            sampling = false;
        }
    }

    // --- Height function ---

    function calculateHeightFunction(dominoes) {
        if (!dominoes || dominoes.length === 0) return new Map();
        const minSidePx = Math.min(...dominoes.map(d => Math.min(d.w, d.h)));
        const unit = minSidePx / 2;
        if (unit <= 0) return new Map();

        const dominoData = dominoes.map(d => {
            const horiz = d.w > d.h;
            const orient = horiz ? 0 : 1;
            const sign = horiz
                ? (d.color === "green" ? -1 : 1)
                : (d.color === "yellow" ? -1 : 1);
            const gx = Math.round(d.x / unit);
            const gy = Math.round(d.y / unit);
            return [orient, sign, gx, gy];
        });

        const adj = new Map();
        function addEdge(v1, v2, dh) {
            const v1Key = `${v1[0]},${v1[1]}`;
            const v2Key = `${v2[0]},${v2[1]}`;
            if (!adj.has(v1Key)) adj.set(v1Key, []);
            if (!adj.has(v2Key)) adj.set(v2Key, []);
            adj.get(v1Key).push([v2Key, dh]);
            adj.get(v2Key).push([v1Key, -dh]);
        }

        dominoData.forEach(([o, s, x, y]) => {
            if (o === 0) {
                const TL = [x, y+2], TM = [x+2, y+2], TR = [x+4, y+2];
                const BL = [x, y], BM = [x+2, y], BR = [x+4, y];
                addEdge(TL, TM, -s); addEdge(TM, TR, s);
                addEdge(BL, BM, s); addEdge(BM, BR, -s);
                addEdge(TL, BL, s); addEdge(TM, BM, 3*s);
                addEdge(TR, BR, s);
            } else {
                const TL = [x, y+4], TR = [x+2, y+4];
                const ML = [x, y+2], MR = [x+2, y+2];
                const BL = [x, y], BR = [x+2, y];
                addEdge(TL, TR, -s); addEdge(ML, MR, -3*s); addEdge(BL, BR, -s);
                addEdge(TL, ML, s); addEdge(ML, BL, -s);
                addEdge(TR, MR, -s); addEdge(MR, BR, s);
            }
        });

        const verts = Array.from(adj.keys()).map(k => {
            const [gx, gy] = k.split(',').map(Number);
            return { k, gx, gy };
        });
        if (verts.length === 0) return new Map();

        const root = verts.reduce((a, b) =>
            (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b
        ).k;

        const heights = new Map([[root, 0]]);
        const queue = [root];
        let qi = 0;
        while (qi < queue.length) {
            const v = queue[qi++];
            for (const [w, dh] of adj.get(v) || []) {
                if (!heights.has(w)) {
                    heights.set(w, heights.get(v) + dh);
                    queue.push(w);
                }
            }
        }

        const finalHeights = new Map();
        heights.forEach((h, key) => finalHeights.set(key, -h));
        return finalHeights;
    }

    function createDominoFaces(domino, heightMap, scale) {
        const isHorizontal = domino.w > domino.h;
        let pts;
        if (isHorizontal) {
            const x = domino.x, y = domino.y;
            pts = [
                [x, y+2], [x+4, y+2], [x+4, y], [x, y],
                [x+2, y+2], [x+2, y]
            ];
        } else {
            const x = domino.x, y = domino.y;
            pts = [
                [x, y], [x, y+4], [x+2, y+4], [x+2, y],
                [x, y+2], [x+2, y+2]
            ];
        }

        const unit = isHorizontal ? domino.w / 4 : domino.h / 4;
        const vertices = [];
        for (const [x, y] of pts) {
            const gridX = Math.round(x / unit);
            const gridY = Math.round(y / unit);
            const key = `${gridX},${gridY}`;
            const z = heightMap.has(key) ? heightMap.get(key) : 0;
            vertices.push([x / 2.0 - 0.5, z, y / 2.0 + 1.5]);
        }

        const avgHeight = vertices.reduce((sum, v) => sum + v[1], 0) / vertices.length;
        return { color: domino.color, vertices, avgHeight };
    }

    // --- Three.js lifecycle ---

    function initThreeJS() {
        if (renderer) return;
        const canvas = document.getElementById(CANVAS_ID);
        if (!canvas) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const aspect = canvas.width / canvas.height;
        const frustumSize = 40;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, 1, 1000
        );
        camera.position.set(CAM_3D.pos.x, CAM_3D.pos.y, CAM_3D.pos.z);
        camera.up.set(0, 1, 0);
        camera.lookAt(CAM_3D.target.x, CAM_3D.target.y, CAM_3D.target.z);

        try {
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        } catch (e) {
            console.error('[random-weights] WebGL not available:', e);
            return;
        }
        renderer.setSize(canvas.width, canvas.height);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(CAM_3D.target.x, CAM_3D.target.y, CAM_3D.target.z);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.rotateSpeed = 0.8;



        // Lighting
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

        function renderLoop() {
            if (!renderer) return;
            controls.update();
            renderer.render(scene, camera);
            renderLoopId = requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }

    function disposeThreeJS() {
        if (!renderer) return;
        if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
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

    function clearMeshGroup() {
        if (!meshGroup) return;
        while (meshGroup.children.length > 0) {
            const m = meshGroup.children[0];
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
            meshGroup.remove(m);
        }
    }

    // --- Build full 3D surface ---

    function buildDominoSurface(dominoes) {
        clearMeshGroup();
        if (!meshGroup || !dominoes) return;

        const heightMap = calculateHeightFunction(dominoes);
        const scale = 60 / (2 * N);

        const threeColors = {
            blue:   new THREE.Color('#4B8B3B'),
            green:  new THREE.Color('#232D4B'),
            yellow: new THREE.Color('#E57200'),
            red:    new THREE.Color('#C84E3A')
        };

        const faces = dominoes.map(d => createDominoFaces(d, heightMap, scale));

        for (const f of faces) {
            const geom = new THREE.BufferGeometry();
            const pos = [];
            for (const v of f.vertices) {
                pos.push(v[0] * scale, v[1] * scale, v[2] * scale);
            }
            geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geom.setIndex([0,1,3, 3,2,1, 0,1,4, 3,2,5]);
            geom.computeVertexNormals();

            const mat = new THREE.MeshStandardMaterial({
                color: threeColors[f.color] || new THREE.Color(0x808080),
                side: THREE.DoubleSide,
                flatShading: true
            });
            meshGroup.add(new THREE.Mesh(geom, mat));
        }

        // Center the group
        const box = new THREE.Box3().setFromObject(meshGroup);
        const center = box.getCenter(new THREE.Vector3());
        meshGroup.position.sub(center);

        const sizeXYZ = box.getSize(new THREE.Vector3());
        const viewW = camera.right - camera.left;
        const viewH = camera.top - camera.bottom;
        const maxScale = 0.85 * Math.min(viewW / sizeXYZ.x, viewH / sizeXYZ.z);
        meshGroup.scale.setScalar(maxScale);
    }

    // --- Camera animation ---

    function animateCamera(from, to, duration) {
        const t0 = performance.now();
        function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }

        function animate() {
            if (!camera || !controls) return;
            const elapsed = performance.now() - t0;
            const t = Math.min(elapsed / duration, 1);
            const e = ease(t);
            camera.position.set(
                from.pos.x + (to.pos.x - from.pos.x) * e,
                from.pos.y + (to.pos.y - from.pos.y) * e,
                from.pos.z + (to.pos.z - from.pos.z) * e
            );
            controls.target.set(
                from.target.x + (to.target.x - from.target.x) * e,
                from.target.y + (to.target.y - from.target.y) * e,
                from.target.z + (to.target.z - from.target.z) * e
            );
            camera.zoom = from.zoom + (to.zoom - from.zoom) * e;
            camera.updateProjectionMatrix();
            controls.update();
            if (t < 1) requestAnimationFrame(animate);
        }
        animate();
    }

    function getCamState() {
        return {
            pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
            zoom: camera.zoom
        };
    }

    function setCam(cam) {
        camera.position.set(cam.pos.x, cam.pos.y, cam.pos.z);
        controls.target.set(cam.target.x, cam.target.y, cam.target.z);
        camera.zoom = cam.zoom;
        camera.updateProjectionMatrix();
        controls.update();
    }

    // --- Show/hide diagram vs canvas ---

    function showDiagram() {
        const diag = document.getElementById('rw-diagram');
        const wrap = document.getElementById('rw-canvas-wrap');
        const samp = document.getElementById('rw-sampling');
        if (diag) diag.style.display = '';
        if (wrap) wrap.style.display = 'none';
        if (samp) samp.style.display = 'none';
    }

    function showSampling() {
        const diag = document.getElementById('rw-diagram');
        const wrap = document.getElementById('rw-canvas-wrap');
        const samp = document.getElementById('rw-sampling');
        if (diag) diag.style.display = 'none';
        if (wrap) wrap.style.display = 'none';
        if (samp) samp.style.display = 'flex';
    }

    function showCanvas() {
        const diag = document.getElementById('rw-diagram');
        const wrap = document.getElementById('rw-canvas-wrap');
        const samp = document.getElementById('rw-sampling');
        if (diag) diag.style.display = 'none';
        if (wrap) wrap.style.display = '';
        if (samp) samp.style.display = 'none';
    }

    // --- Slide engine ---

    function tryInit() {
        if (!window.slideEngine) { setTimeout(tryInit, 100); return; }
        window.slideEngine.registerSimulation(SLIDE_ID, {
            steps: 3,

            async onStep(step) {
                if (step === 1) {
                    if (cachedDominoes) {
                        showCanvas();
                        buildDominoSurface(cachedDominoes);
                        setCam(CAM_3D);
                    } else {
                        showSampling();
                        const dominoes = await ensureSample();
                        if (dominoes) cachedDominoes = dominoes;
                        showCanvas();
                        buildDominoSurface(cachedDominoes);
                        setCam(CAM_3D);
                    }
                }
                if (step === 2) {
                    console.log('[random-weights] step2 camera.up:', camera.up.x.toFixed(3), camera.up.y.toFixed(3), camera.up.z.toFixed(3));
                    animateCamera(getCamState(), CAM_3D_ALT, 1500);
                }
                if (step === 3) {
                    animateCamera(getCamState(), CAM_TOPDOWN, 1500);
                }
            },

            onStepBack(step) {
                if (step === 0) { showDiagram(); }
                if (step === 1) { animateCamera(getCamState(), CAM_3D, 1500); }
                if (step === 2) { animateCamera(getCamState(), CAM_3D_ALT, 1500); }
            },

            start() {},
            pause() {},

            onSlideEnter() {
                showDiagram();
                initThreeJS();
                // Pre-sample
                ensureSample().then(d => { if (d) cachedDominoes = d; });
            },

            onSlideLeave() {
                showDiagram();
                disposeThreeJS();
            }
        }, 0);
    }
    tryInit();

    // Start sampling on page load so it's ready when slide is reached
    window.addEventListener('wasm-loaded', () => {
        ensureSample().then(d => { if (d) cachedDominoes = d; });
    }, { once: true });
})();
