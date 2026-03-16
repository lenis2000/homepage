(function() {
    'use strict';

    const SLIDE_ID = 'domino-intro';
    const CANVAS_ID = 'domino-intro-canvas';
    const N = 6;

    let shufflingModule = null;
    let wasmReady = false;
    let sampling = false;
    let cachedDominoes = null;

    // Three.js state
    let scene = null, renderer = null, camera = null, controls = null;
    let meshGroup = null;
    let renderLoopId = null;

    // Camera positions
    const CAM_BLOCKS = {
        pos: { x: -29.0, y: 19.7, z: 42.7 },
        target: { x: 0.1, y: -6.8, z: 4.3 },
        zoom: 1.0
    };
    const CAM_BLOCKS_ROTATED = {
        pos: { x: -11.0, y: 12.0, z: 50.0 },
        target: { x: 0.1, y: -6.8, z: 8.0 },
        zoom: 1.0
    };
    const CAM_SURFACE_3D = {
        pos: { x: -39.7, y: 21.8, z: 41.4 },
        target: { x: 0.1, y: -8.8, z: -0.8 },
        zoom: 0.95
    };
    const CAM_TOPDOWN = {
        pos: { x: 2.4, y: 56.8, z: -4.8 },
        target: { x: 2.4, y: -8.8, z: -5.8 },
        zoom: 0.95
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
            console.error('[domino-intro] WASM init failed:', e);
            return false;
        }
    }

    async function sampleTiling() {
        if (sampling) return null;
        if (!wasmReady && !(await initWasm())) return null;
        sampling = true;
        try {
            const dim = 2 * N;
            const numWeights = dim * dim;
            const weightsPtr = shufflingModule._malloc(numWeights * 8);
            for (let i = 0; i < numWeights; i++) {
                shufflingModule.setValue(weightsPtr + i * 8, 1.0, 'double');
            }
            const resultPtr = await shufflingModule.ccall(
                'simulateAztecWithWeightMatrix', 'number',
                ['number', 'number'], [N, weightsPtr], {async: true}
            );
            shufflingModule._free(weightsPtr);
            const jsonStr = shufflingModule.UTF8ToString(resultPtr);
            shufflingModule.ccall('freeString', null, ['number'], [resultPtr]);
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('[domino-intro] Sampling failed:', e);
            wasmReady = false;
            shufflingModule = null;
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
        camera.position.set(CAM_BLOCKS.pos.x, CAM_BLOCKS.pos.y, CAM_BLOCKS.pos.z);
        camera.up.set(0, 1, 0);
        camera.lookAt(CAM_BLOCKS.target.x, CAM_BLOCKS.target.y, CAM_BLOCKS.target.z);

        try {
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        } catch (e) {
            console.error('[domino-intro] WebGL not available:', e);
            return;
        }
        renderer.setSize(canvas.width, canvas.height);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(CAM_BLOCKS.target.x, CAM_BLOCKS.target.y, CAM_BLOCKS.target.z);
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

    // --- Build 4 isolated building blocks ---

    function buildBuildingBlocks() {
        clearMeshGroup();
        if (!meshGroup) return;

        const threeColors = {
            yellow: new THREE.Color('#FFCD00'),
            green:  new THREE.Color('#228B22'),
            blue:   new THREE.Color('#0057B7'),
            red:    new THREE.Color('#DC143C')
        };

        // Each building block is a single domino with its height function.
        // We create a synthetic single-domino "tiling" for each type,
        // compute its height function, and extract the 3D shape.
        const blockDefs = [
            { color: 'blue',   w: 4, h: 2, x: 0, y: 0 },  // horizontal +
            { color: 'green',  w: 4, h: 2, x: 0, y: 0 },  // horizontal -
            { color: 'red',    w: 2, h: 4, x: 0, y: 0 },  // vertical +
            { color: 'yellow', w: 2, h: 4, x: 0, y: 0 },  // vertical -
        ];

        const spacing = 12;
        const offsets = [
            { x: -spacing * 1.5, z: 0 },
            { x: -spacing * 0.5, z: 0 },
            { x: spacing * 0.5, z: 0 },
            { x: spacing * 1.5, z: 0 },
        ];

        blockDefs.forEach((def, i) => {
            const heightMap = calculateHeightFunction([def]);
            const face = createDominoFaces(def, heightMap, 1);

            const geom = new THREE.BufferGeometry();
            const pos = [];
            const sc = 3.0; // scale up individual blocks
            for (const v of face.vertices) {
                pos.push(
                    v[0] * sc + offsets[i].x,
                    v[1] * sc,
                    v[2] * sc + offsets[i].z
                );
            }
            geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geom.setIndex([0,1,3, 3,2,1, 0,1,4, 3,2,5]);
            geom.computeVertexNormals();

            const mat = new THREE.MeshStandardMaterial({
                color: threeColors[def.color],
                side: THREE.DoubleSide,
                flatShading: true
            });
            meshGroup.add(new THREE.Mesh(geom, mat));
        });
    }

    // --- Build full 3D surface ---

    function buildDominoSurface(dominoes) {
        clearMeshGroup();
        if (!meshGroup || !dominoes) return;

        const heightMap = calculateHeightFunction(dominoes);
        const scale = 60 / (2 * N);

        const threeColors = {
            yellow: new THREE.Color('#FFCD00'),
            green:  new THREE.Color('#228B22'),
            blue:   new THREE.Color('#0057B7'),
            red:    new THREE.Color('#DC143C')
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

    // --- Captions ---


    // --- Sample and cache ---

    async function ensureSample() {
        if (cachedDominoes) return cachedDominoes;
        const d = await sampleTiling();
        if (d) cachedDominoes = d;
        return cachedDominoes;
    }

    // --- Slide engine ---

    function tryInit() {
        if (!window.slideEngine) { setTimeout(tryInit, 100); return; }
        window.slideEngine.registerSimulation(SLIDE_ID, {
            steps: 3,

            async onStep(step) {
                if (!camera || !controls) return;

                if (step === 1) {
                    // Step 1: rotate building blocks slightly
                    animateCamera(getCamState(), CAM_BLOCKS_ROTATED, 1500);
                }
                if (step === 2) {
                    // Step 2: show full 3D surface
                    const dominoes = await ensureSample();
                    if (dominoes && meshGroup) {
                        buildDominoSurface(dominoes);
                        animateCamera(CAM_BLOCKS_ROTATED, CAM_SURFACE_3D, 1500);
                    }
                }
                if (step === 3) {
                    // Step 3: rotate to top-down → domino tiling reveal
                    animateCamera(getCamState(), CAM_TOPDOWN, 1500);
                }
            },

            onStepBack(step) {
                if (!camera || !controls) return;

                if (step === 2) {
                    // Back from top-down to 3D
                    animateCamera(getCamState(), CAM_SURFACE_3D, 1500);
                }
                if (step === 1) {
                    // Back to rotated blocks
                    buildBuildingBlocks();
                    setCam(CAM_BLOCKS_ROTATED);
                }
                if (step === 0) {
                    // Back to initial blocks view
                    animateCamera(getCamState(), CAM_BLOCKS, 1500);
                }
            },

            start() {},
            pause() {},

            onSlideEnter() {
                initThreeJS();
                // Start with building blocks
                buildBuildingBlocks();
                setCam(CAM_BLOCKS);

                // Pre-sample in background
                ensureSample();
            },

            onSlideLeave() { disposeThreeJS(); }
        }, 0);
    }
    tryInit();
})();
