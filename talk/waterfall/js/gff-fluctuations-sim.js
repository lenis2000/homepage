/**
 * GFF Fluctuations: 3D surface from two independent lozenge tiling CFTP samples
 * GFF ≈ (h₁ - h₂) / √2
 * Uses Rotunda shape loaded from /letters/Rotunda.json
 * Runs two sequential CFTP samples using the already-loaded threaded LozengeModule
 */
(function() {
    'use strict';

    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);
    const Z_SCALE = 20.0;
    const frustumSize = 30;

    // State
    let shapeTriangles = null;
    let sampleGeneration = 0;
    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let animationId = null;
    let isRunning = false;
    let canvas = null;
    let statusEl = null;
    let samplingActive = false;

    // Drop navigation keys during sampling so they don't queue up
    // and all fire at once when blocking CFTP finishes
    document.addEventListener('keydown', function(e) {
        if (!samplingActive) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
             ' ', 'PageUp', 'PageDown'].includes(e.key)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true); // capture phase — runs before slide engine

    // ---- STATUS OVERLAY ----
    function showStatus(text) {
        if (!statusEl) {
            const parent = canvas && canvas.parentElement;
            if (!parent) return;
            statusEl = document.createElement('div');
            statusEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
                'font-size:clamp(1.2rem,2vw,1.6rem);color:#666;background:rgba(255,255,255,0.85);' +
                'padding:0.8vh 1.5vw;border-radius:4px;pointer-events:none;z-index:10;';
            parent.style.position = 'relative';
            parent.appendChild(statusEl);
        }
        statusEl.textContent = text;
        statusEl.style.display = '';
    }

    function hideStatus() {
        if (statusEl) statusEl.style.display = 'none';
    }

    // ---- LOAD SHAPE ----
    async function loadShape() {
        if (shapeTriangles) return true;
        try {
            const resp = await fetch('/letters/Rotunda.json');
            const data = await resp.json();
            const tris = data.triangles;
            shapeTriangles = new Int32Array(tris.length * 3);
            for (let i = 0; i < tris.length; i++) {
                shapeTriangles[i * 3] = tris[i].n;
                shapeTriangles[i * 3 + 1] = tris[i].j;
                shapeTriangles[i * 3 + 2] = tris[i].type;
            }
            return true;
        } catch (e) {
            console.error('[GFF] Failed to load shape:', e);
            return false;
        }
    }

    // ---- WASM INSTANCE HELPER ----
    async function createWasmInstance() {
        const wasm = await LozengeModule();
        return {
            wasm,
            initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
            runCFTP: wasm.cwrap('runCFTP', 'number', []),
            exportDimers: wasm.cwrap('exportDimers', 'number', []),
            freeString: wasm.cwrap('freeString', null, ['number']),
            performGlauberSteps: wasm.cwrap('performGlauberSteps', 'number', ['number'])
        };
    }

    function initTilingFromTriangles(inst) {
        const ptr = inst.wasm._malloc(shapeTriangles.length * 4);
        for (let i = 0; i < shapeTriangles.length; i++) {
            inst.wasm.setValue(ptr + i * 4, shapeTriangles[i], 'i32');
        }
        const initPtr = inst.initFromTriangles(ptr, shapeTriangles.length);
        inst.freeString(initPtr);
        inst.wasm._free(ptr);
    }

    function runCFTPAndExport(inst) {
        inst.freeString(inst.runCFTP());
        const dp = inst.exportDimers();
        const json = inst.wasm.UTF8ToString(dp);
        inst.freeString(dp);
        return json;
    }

    // yield to browser for status updates
    function yieldFrame() {
        return new Promise(r => setTimeout(r, 0));
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

    // ---- DIVERGING COLORMAP ----
    function gffColor(diff) {
        if (diff === 0) return [0.7, 0.7, 0.7];
        if (diff < 0) return [0.2, 0.3, 0.85];
        return [0.85, 0.2, 0.2];
    }

    // ---- THREE.JS ----
    function initThreeJS() {
        canvas = document.getElementById('gff-canvas');
        if (!canvas || renderer) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;
        const aspect = w / h || 1;

        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, -5000, 6000
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

        controls.addEventListener('change', () => {
            if (!isRunning && renderer) renderer.render(scene, camera);
            console.log('[GFF] Camera pos:', camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1),
                '| Target:', controls.target.x.toFixed(1), controls.target.y.toFixed(1), controls.target.z.toFixed(1),
                '| Zoom:', camera.zoom.toFixed(2));
        });

        renderer.render(scene, camera);
    }

    function disposeThreeJS() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        isRunning = false;
        if (statusEl) { statusEl.remove(); statusEl = null; }
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
        for (const [key, v] of gff) {
            const [n, j] = key.split(',').map(Number);
            const x = n, y = slope * n + j * deltaC, z = v.z * Z_SCALE;
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
    }

    function centerCameraFlat(vertexSet) {
        if (!camera || !controls) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const key of vertexSet) {
            const [n, j] = key.split(',').map(Number);
            const x = n, y = slope * n + j * deltaC;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        const size = Math.max(maxX - minX, maxY - minY) || 10;
        controls.target.set(cx, cy, 0);
        camera.position.set(cx - size * 0.3, cy - size * 0.5, size * 0.7);
        camera.zoom = frustumSize / (size * 1.1);
        camera.updateProjectionMatrix();
        controls.update();
    }

    // ---- BOUNDARY COMPUTATION ----
    function computeBoundaryLoops(vertexSet) {
        let minN = Infinity, maxN = -Infinity, minJ = Infinity, maxJ = -Infinity;
        for (const key of vertexSet) {
            const [n, j] = key.split(',').map(Number);
            if (n < minN) minN = n; if (n > maxN) maxN = n;
            if (j < minJ) minJ = j; if (j > maxJ) maxJ = j;
        }

        const edgeCount = new Map();
        function countEdge(a, b) {
            const key = a < b ? a + '|' + b : b + '|' + a;
            edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
        }
        for (let n = minN; n <= maxN; n++) {
            for (let j = minJ; j <= maxJ; j++) {
                const a = n+','+j, b = n+','+(j-1), c = (n+1)+','+(j-1), d = (n+1)+','+j;
                if (vertexSet.has(a) && vertexSet.has(b) && vertexSet.has(c)) {
                    countEdge(a, b); countEdge(b, c); countEdge(a, c);
                }
                if (vertexSet.has(a) && vertexSet.has(d) && vertexSet.has(c)) {
                    countEdge(a, d); countEdge(d, c); countEdge(a, c);
                }
            }
        }

        const adj = new Map();
        for (const [key, cnt] of edgeCount) {
            if (cnt !== 1) continue;
            const [a, b] = key.split('|');
            if (!adj.has(a)) adj.set(a, []);
            if (!adj.has(b)) adj.set(b, []);
            adj.get(a).push(b);
            adj.get(b).push(a);
        }

        const loops = [];
        const visited = new Set();
        for (const [start] of adj) {
            if (visited.has(start)) continue;
            const loop = [start];
            visited.add(start);
            let current = start;
            while (true) {
                const next = (adj.get(current) || []).find(v => !visited.has(v));
                if (!next) break;
                loop.push(next);
                visited.add(next);
                current = next;
            }
            if (loop.length >= 3) loops.push(loop);
        }
        return loops;
    }

    function drawBoundary(vertexSet, zLevel) {
        if (!meshGroup) return;
        const loops = computeBoundaryLoops(vertexSet);
        const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        for (const loop of loops) {
            const points = loop.map(key => {
                const [n, j] = key.split(',').map(Number);
                return new THREE.Vector3(n, slope * n + j * deltaC, zLevel);
            });
            points.push(points[0]);
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            meshGroup.add(new THREE.Line(geom, mat));
        }
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
            const v = gff.get(`${n},${j}`);
            positions.push(n, slope * n + j * deltaC, v.z * Z_SCALE);
            const [r, g, b] = gffColor(v.diff);
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

        if (positions.length === 0) return;

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

        drawBoundary(new Set(gff.keys()), 0);
    }

    // ---- MAIN SAMPLING (main thread, uses already-loaded threaded LozengeModule) ----
    async function doSample() {
        const gen = ++sampleGeneration;
        samplingActive = true;

        showStatus('Loading...');

        const shapeOk = await loadShape();
        if (!shapeOk || gen !== sampleGeneration || !meshGroup) { samplingActive = false; hideStatus(); return; }

        // Create two independent WASM instances (uses threaded LozengeModule from index.html)
        showStatus('Initializing...');
        let inst1, inst2;
        try {
            [inst1, inst2] = await Promise.all([createWasmInstance(), createWasmInstance()]);
        } catch (e) {
            console.error('[GFF] WASM init failed:', e);
            samplingActive = false; hideStatus();
            return;
        }
        if (gen !== sampleGeneration || !meshGroup) { samplingActive = false; hideStatus(); return; }

        // Initialize both from the same triangles
        initTilingFromTriangles(inst1);
        initTilingFromTriangles(inst2);

        // Advance RNG on instance 2 so it produces a different CFTP sample
        // (WASM uses hard-coded initial xorshift seed; Glauber steps advance the state)
        inst2.performGlauberSteps(1000);

        // Get initial dimers for boundary (before CFTP)
        const dp0 = inst1.exportDimers();
        const initDimersJson = inst1.wasm.UTF8ToString(dp0);
        inst1.freeString(dp0);
        const initDimers = JSON.parse(initDimersJson).dimers || [];
        const verts = new Set();
        for (const d of initDimers) {
            for (const [n, j] of getVertexKeys(d)) verts.add(n + ',' + j);
        }
        drawBoundary(verts, 0);
        centerCameraFlat(verts);
        if (renderer) renderer.render(scene, camera);

        // Run CFTP 1
        const t0 = performance.now();
        showStatus('Sampling (1/2)...');
        await yieldFrame();
        if (gen !== sampleGeneration || !meshGroup) { samplingActive = false; hideStatus(); return; }

        const json1 = runCFTPAndExport(inst1);
        const t1 = performance.now();
        console.log('[GFF] CFTP 1 took ' + ((t1 - t0) / 1000).toFixed(1) + 's');

        // Run CFTP 2
        showStatus('Sampling (2/2)...');
        await yieldFrame();
        if (gen !== sampleGeneration || !meshGroup) { samplingActive = false; hideStatus(); return; }

        const json2 = runCFTPAndExport(inst2);
        const t2 = performance.now();
        console.log('[GFF] CFTP 2 took ' + ((t2 - t1) / 1000).toFixed(1) + 's');
        console.log('[GFF] Total sampling: ' + ((t2 - t0) / 1000).toFixed(1) + 's');

        if (gen !== sampleGeneration || !meshGroup) { samplingActive = false; hideStatus(); return; }

        // Compute GFF = (h1 - h2) / sqrt(2)
        const dimers1 = JSON.parse(json1).dimers || [];
        const dimers2 = JSON.parse(json2).dimers || [];
        const heights1 = computeHeights(dimers1);
        const heights2 = computeHeights(dimers2);

        const refKey = '0,0';
        const ref1 = heights1.get(refKey) || 0;
        const ref2 = heights2.get(refKey) || 0;

        const gff = new Map();
        let sum = 0, count = 0;
        for (const [key, h1] of heights1) {
            const h2 = heights2.has(key) ? heights2.get(key) : 0;
            const diff = (h1 - ref1) - (h2 - ref2);
            const g = diff / Math.sqrt(2);
            gff.set(key, { z: g, diff });
            sum += g;
            count++;
        }
        if (count > 0) {
            const mean = sum / count;
            for (const [, v] of gff) v.z -= mean;
        }

        if (!meshGroup) { samplingActive = false; hideStatus(); return; }
        buildSurfaceMesh(gff);
        centerCamera(gff);
        if (renderer) renderer.render(scene, camera);
        hideStatus();
        // Keep swallowing queued keys for 300ms to flush any that piled up
        setTimeout(() => { samplingActive = false; }, 300);
    }

    // ---- SLIDE ENGINE ----
    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('gff-fluctuations', {
                start() { startAnimation(); },
                pause() { stopAnimation(); },

                onSlideEnter() {
                    initThreeJS();
                    setTimeout(() => {
                        resize();
                        doSample();
                    }, 100);
                },

                onSlideLeave() {
                    sampleGeneration++;
                    samplingActive = false;
                    stopAnimation();
                    disposeThreeJS();
                },

                reset() {}
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }

    waitForSlideEngine();
})();
