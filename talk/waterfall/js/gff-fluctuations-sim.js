/**
 * GFF Fluctuations: 3D surface from two independent lozenge tiling CFTP samples
 * GFF ≈ (h₁ - h₂) / √2
 */
(function() {
    'use strict';

    // Shape data (exported from ultimate lozenge editor)
    const SHAPE_TRIANGLES = [
        -4,5,1, -4,5,2, -3,5,1, -3,4,2, -2,4,2, -2,5,1, -3,5,2, -2,4,1,
        -2,3,2, -1,3,1, -1,3,2, -1,4,1, -4,4,2, -4,4,1, -4,3,2, -4,3,1,
        -4,2,2, -3,2,1, -3,2,2, -2,2,1, -2,2,2, -1,2,1, -1,2,2, 0,1,1,
        -1,1,2, -1,1,1, -2,1,2, -2,1,1, -3,1,2, 0,1,2, 0,2,1, 0,2,2,
        0,3,1, -3,3,1, -3,4,1, -5,5,2, -5,5,1, -5,4,2, -5,4,1, -5,3,2,
        -3,6,1, -3,6,2, -3,7,1, -4,7,2, -4,7,1, -4,6,2, -4,6,1, -5,6,2,
        -5,6,1, -6,6,2, -6,6,1, -6,5,2, -6,5,1, -6,4,2, 0,4,1, -1,4,2,
        0,3,2, 1,3,1, 1,2,2, 1,2,1, 1,1,2, 1,1,1, -1,5,1, -1,5,2,
        0,5,1, 0,4,2, 1,4,1, 1,3,2, -1,6,1, -1,6,2, 0,6,1, 0,5,2,
        1,5,1, 1,4,2
    ];

    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);
    const Z_SCALE = 3.0;
    const frustumSize = 30;

    // State
    let inst1 = null, inst2 = null;
    let shapesInitialized = false;
    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let animationId = null;
    let isRunning = false;
    let needsCenterCamera = true;
    let canvas = null;

    // ---- WASM HELPERS ----
    function wrap(wasm) {
        return {
            wasm,
            initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
            runCFTP: wasm.cwrap('runCFTP', 'number', []),
            exportDimers: wasm.cwrap('exportDimers', 'number', []),
            freeString: wasm.cwrap('freeString', null, ['number']),
            getHoleCount: typeof wasm._getHoleCount === 'function' ? wasm.cwrap('getHoleCount', 'number', []) : null,
            adjustHoleWinding: typeof wasm._adjustHoleWinding === 'function' ? wasm.cwrap('adjustHoleWinding', 'number', ['number', 'number']) : null
        };
    }

    function initShape(inst) {
        const dataPtr = inst.wasm._malloc(SHAPE_TRIANGLES.length * 4);
        for (let i = 0; i < SHAPE_TRIANGLES.length; i++) {
            inst.wasm.setValue(dataPtr + i * 4, SHAPE_TRIANGLES[i], 'i32');
        }
        const initPtr = inst.initFromTriangles(dataPtr, SHAPE_TRIANGLES.length);
        inst.freeString(initPtr);
        inst.wasm._free(dataPtr);

        // Set hole height = 1 (if WASM supports it)
        if (inst.getHoleCount && inst.adjustHoleWinding) {
            const holeCount = inst.getHoleCount();
            console.log('[GFF] Hole count:', holeCount);
            for (let h = 0; h < holeCount; h++) {
                const ptr = inst.adjustHoleWinding(h, 1);
                inst.freeString(ptr);
            }
        }
    }

    async function initWASM() {
        if (inst1 && inst2) return true;

        if (typeof LozengeModule === 'undefined') {
            console.error('[GFF] LozengeModule not loaded');
            return false;
        }

        console.log('[GFF] Creating two WASM instances...');
        const [wasm1, wasm2] = await Promise.all([LozengeModule(), LozengeModule()]);
        console.log('[GFF] WASM instances created');

        inst1 = wrap(wasm1);
        inst2 = wrap(wasm2);
        return true;
    }

    function initShapes() {
        if (shapesInitialized) return;
        console.log('[GFF] Initializing shapes...');
        initShape(inst1);
        initShape(inst2);
        shapesInitialized = true;
        console.log('[GFF] Shapes initialized');
    }

    // ---- CFTP SAMPLING (shape already initialized) ----
    function sampleDimers(inst) {
        const cftpPtr = inst.runCFTP();
        inst.freeString(cftpPtr);

        const dimersPtr = inst.exportDimers();
        const json = inst.wasm.UTF8ToString(dimersPtr);
        inst.freeString(dimersPtr);

        return JSON.parse(json).dimers || [];
    }

    // ---- HEIGHT FUNCTION FROM DIMERS (BFS) ----
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

    function computeHeights(dimers) {
        if (dimers.length === 0) return new Map();

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
        let queueIdx = 0;
        const visited = new Set();

        while (queueIdx < queue.length) {
            const currentKey = queue[queueIdx++];
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

        return heights;
    }

    // ---- GFF COMPUTATION ----
    function computeGFF() {
        // Use SAME instance for both samples (RNG state advances between calls)
        // Re-init shape before each CFTP to reset tiling state
        console.log('[GFF] Running CFTP sample 1 (inst1)...');
        const t0 = performance.now();
        initShape(inst1);
        const dimers1 = sampleDimers(inst1);
        console.log('[GFF] CFTP 1 done:', dimers1.length, 'dimers in', (performance.now() - t0).toFixed(0), 'ms');
        console.log('[GFF] Sample 1 first 3 dimers:', JSON.stringify(dimers1.slice(0, 3)));

        console.log('[GFF] Running CFTP sample 2 (inst1 again)...');
        const t1 = performance.now();
        initShape(inst1);
        const dimers2 = sampleDimers(inst1);
        console.log('[GFF] CFTP 2 done:', dimers2.length, 'dimers in', (performance.now() - t1).toFixed(0), 'ms');
        console.log('[GFF] Sample 2 first 3 dimers:', JSON.stringify(dimers2.slice(0, 3)));

        if (!meshGroup) return null;

        const heights1 = computeHeights(dimers1);
        const heights2 = computeHeights(dimers2);
        console.log('[GFF] Heights computed:', heights1.size, 'vertices (h1),', heights2.size, '(h2)');

        // Normalize to shared reference vertex
        const refKey = '0,0';
        const ref1 = heights1.get(refKey) || 0;
        const ref2 = heights2.get(refKey) || 0;

        const gff = new Map();
        let sum = 0, count = 0;
        for (const [key, h1] of heights1) {
            const h2 = heights2.has(key) ? heights2.get(key) : 0;
            const g = ((h1 - ref1) - (h2 - ref2)) / Math.sqrt(2);
            gff.set(key, g);
            sum += g;
            count++;
        }

        if (count > 0) {
            const mean = sum / count;
            for (const [key, g] of gff) {
                gff.set(key, g - mean);
            }
        }

        let gMin = Infinity, gMax = -Infinity;
        for (const g of gff.values()) {
            if (g < gMin) gMin = g;
            if (g > gMax) gMax = g;
        }
        console.log('[GFF] GFF computed:', gff.size, 'vertices, range:', gMin.toFixed(3), 'to', gMax.toFixed(3));
        return gff;
    }

    // ---- DIVERGING COLORMAP ----
    function gffColor(h) {
        const t = Math.tanh(h / 3);
        if (t < 0) {
            const s = -t;
            return [0.85 + s * (0.2 - 0.85), 0.85 + s * (0.3 - 0.85), 0.85 + s * (0.8 - 0.85)];
        } else {
            const s = t;
            return [0.85 + s * (0.8 - 0.85), 0.85 + s * (0.2 - 0.85), 0.85 + s * (0.2 - 0.85)];
        }
    }

    // ---- THREE.JS ----
    function initThreeJS() {
        canvas = document.getElementById('gff-canvas');
        if (!canvas) return;
        if (renderer) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;
        console.log('[GFF] Canvas dims:', w, 'x', h, '(client:', canvas.clientWidth, 'x', canvas.clientHeight, ', attr:', canvas.width, 'x', canvas.height, ')');

        const aspect = w / h || 1;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2,
            -5000, 6000
        );
        camera.up.set(0, 0, 1);
        camera.position.set(20, 20, 20);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.rotateSpeed = 0.8;
        controls.panSpeed = 0.8;
        controls.zoomSpeed = 1.2;

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

        // Add a test box to verify rendering pipeline
        const testBox = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        testBox.name = 'testBox';
        scene.add(testBox);

        controls.addEventListener('change', () => {
            if (!isRunning && renderer) renderer.render(scene, camera);
        });

        renderer.render(scene, camera);
        console.log('[GFF] Three.js initialized with test box at origin');
    }

    function disposeThreeJS() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        isRunning = false;
        if (!renderer) return;

        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }
        }

        if (controls) controls.dispose();
        renderer.dispose();
        renderer = null; scene = null; camera = null; controls = null; meshGroup = null;
    }

    function resize() {
        if (!renderer || !camera || !canvas) return;
        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h);
        const aspect = w / h;
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
        camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', resize);

    function animate() {
        if (!renderer || !camera || !controls) { animationId = null; return; }
        controls.update();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
    }

    function startAnimation() { isRunning = true; if (!animationId) animate(); }
    function stopAnimation() { isRunning = false; if (animationId) { cancelAnimationFrame(animationId); animationId = null; } }

    // ---- CAMERA ----
    function centerCamera(gff) {
        if (!camera || !controls) return;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        for (const [key, h] of gff) {
            const [n, j] = key.split(',').map(Number);
            const x = n, y = slope * n + j * deltaC, z = h * Z_SCALE;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
        const size = Math.max(maxX - minX, maxY - minY) || 10;

        controls.target.set(cx, cy, cz);
        camera.position.set(cx - size * 0.3, cy - size * 0.5, cz + size * 0.7);
        camera.zoom = frustumSize / (size * 1.1);
        camera.updateProjectionMatrix();
        controls.update();
        console.log('[GFF] Camera: pos=', camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1),
                    'target=', controls.target.x.toFixed(1), controls.target.y.toFixed(1), controls.target.z.toFixed(1),
                    'zoom=', camera.zoom.toFixed(2), 'size=', size.toFixed(1));

        // Remove test box once real data is shown
        const testBox = scene.getObjectByName('testBox');
        if (testBox) scene.remove(testBox);
    }

    // ---- SURFACE MESH ----
    function buildSurfaceMesh(gff) {
        if (!meshGroup) return;

        while (meshGroup.children.length > 0) {
            const child = meshGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            meshGroup.remove(child);
        }

        if (!gff || gff.size === 0) return;

        let minN = Infinity, maxN = -Infinity, minJ = Infinity, maxJ = -Infinity;
        for (const key of gff.keys()) {
            const [n, j] = key.split(',').map(Number);
            if (n < minN) minN = n; if (n > maxN) maxN = n;
            if (j < minJ) minJ = j; if (j > maxJ) maxJ = j;
        }

        const positions = [];
        const colors = [];

        function addVertex(n, j) {
            const h = gff.get(`${n},${j}`);
            positions.push(n, slope * n + j * deltaC, h * Z_SCALE);
            const [r, g, b] = gffColor(h);
            colors.push(r, g, b);
        }

        for (let n = minN; n <= maxN; n++) {
            for (let j = minJ; j <= maxJ; j++) {
                if (gff.has(`${n},${j}`) && gff.has(`${n},${j-1}`) && gff.has(`${n+1},${j-1}`)) {
                    addVertex(n, j);
                    addVertex(n, j - 1);
                    addVertex(n + 1, j - 1);
                }
                if (gff.has(`${n},${j}`) && gff.has(`${n+1},${j}`) && gff.has(`${n+1},${j-1}`)) {
                    addVertex(n, j);
                    addVertex(n + 1, j);
                    addVertex(n + 1, j - 1);
                }
            }
        }

        if (positions.length === 0) {
            console.log('[GFF] No triangles generated from GFF data');
            return;
        }

        console.log('[GFF] Building mesh:', positions.length / 3, 'vertices');

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide,
            flatShading: true, roughness: 0.5, metalness: 0.15
        });
        meshGroup.add(new THREE.Mesh(geometry, material));

        const edgeGeo = new THREE.EdgesGeometry(geometry, 15);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x444466, opacity: 0.15, transparent: true });
        meshGroup.add(new THREE.LineSegments(edgeGeo, edgeMat));
    }

    // ---- MAIN SAMPLING (async to not block UI) ----
    async function doSample() {
        if (!inst1 || !inst2) {
            console.log('[GFF] WASM not ready, initializing...');
            const ok = await initWASM();
            if (!ok) return;
        }

        if (!shapesInitialized) {
            initShapes();
        }

        // Yield to let Three.js render before blocking CFTP
        await new Promise(r => setTimeout(r, 0));

        if (!meshGroup) return;

        const gff = computeGFF();
        if (!meshGroup) return;
        buildSurfaceMesh(gff);
        if (needsCenterCamera && gff) {
            centerCamera(gff);
            needsCenterCamera = false;
        }
        if (renderer) renderer.render(scene, camera);
    }

    // ---- SLIDE ENGINE ----
    // Register immediately (don't wait for WASM)
    function waitForSlideEngine() {
        if (window.slideEngine) {
            console.log('[GFF] Registering with slide engine');
            window.slideEngine.registerSimulation('gff-fluctuations', {
                start() { startAnimation(); },
                pause() { stopAnimation(); },
                steps: 1,

                onSlideEnter() {
                    console.log('[GFF] Slide enter');
                    initThreeJS();
                    needsCenterCamera = true;
                    setTimeout(() => {
                        resize();
                        doSample();
                    }, 100);
                },

                onSlideLeave() {
                    console.log('[GFF] Slide leave');
                    stopAnimation();
                    disposeThreeJS();
                },

                onStep(step) {
                    if (step === 1) {
                        // Re-init shapes for fresh CFTP
                        shapesInitialized = false;
                        doSample();
                    }
                },

                reset() {}
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }

    waitForSlideEngine();
})();
