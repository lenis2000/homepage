(function() {
    'use strict';

    const SLIDE_ID = 'domino-gff';
    const CANVAS_2D_ID = 'dgff-canvas-2d';
    const CANVAS_3D_ID = 'dgff-canvas-3d';
    const N = 80;
    const Z_SCALE = 0.15;

    let shufflingModule = null;
    let wasmReady = false;
    let sampling = false;

    // Three.js state (lazy init)
    let scene = null, renderer = null, camera = null, controls = null;
    let meshGroup = null;
    let renderLoopId = null;

    // Simulation state
    let lastDominoes = null;
    let gffBuilt = false;

    // --- Canvas visibility ---

    function show2D() {
        const c2d = document.getElementById(CANVAS_2D_ID);
        const c3d = document.getElementById(CANVAS_3D_ID);
        if (c2d) c2d.style.display = '';
        if (c3d) c3d.style.display = 'none';
    }

    function show3D() {
        const c2d = document.getElementById(CANVAS_2D_ID);
        const c3d = document.getElementById(CANVAS_3D_ID);
        if (c2d) c2d.style.display = 'none';
        if (c3d) c3d.style.display = '';
    }

    // --- WASM initialization ---

    async function initShufflingWasm() {
        if (wasmReady) return true;
        if (typeof createShufflingModule === 'undefined') return false;
        try {
            shufflingModule = await createShufflingModule();
            wasmReady = true;
            return true;
        } catch (e) {
            console.error('Domino WASM init failed:', e);
            return false;
        }
    }

    async function ensureWasm() {
        if (!wasmReady || !shufflingModule) {
            wasmReady = false;
            return initShufflingWasm();
        }
        return true;
    }

    // --- Sampling ---

    async function sampleTiling(n) {
        if (sampling) return null;
        await ensureWasm();
        if (!wasmReady) return null;
        sampling = true;
        try {
            const dim = 2 * n;
            const numWeights = dim * dim;
            const weightsPtr = shufflingModule._malloc(numWeights * 8);
            for (let i = 0; i < numWeights; i++) {
                shufflingModule.setValue(weightsPtr + i * 8, 1.0, 'double');
            }
            const resultPtr = await shufflingModule.ccall(
                'simulateAztecWithWeightMatrix', 'number',
                ['number', 'number'], [n, weightsPtr], {async: true}
            );
            shufflingModule._free(weightsPtr);
            const jsonStr = shufflingModule.UTF8ToString(resultPtr);
            shufflingModule.ccall('freeString', null, ['number'], [resultPtr]);
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('[domino-gff] Sampling crashed, will re-init WASM:', e);
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

    // --- 2D domino drawing (no borders) ---

    function drawDominoes(dominoes) {
        const canvas = document.getElementById(CANVAS_2D_ID);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!dominoes || dominoes.length === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const d of dominoes) {
            minX = Math.min(minX, d.x);
            maxX = Math.max(maxX, d.x + d.w);
            minY = Math.min(minY, d.y);
            maxY = Math.max(maxY, d.y + d.h);
        }

        const rangeX = maxX - minX, rangeY = maxY - minY;
        const padding = 20;
        const scale = Math.min(
            (canvas.width - 2*padding) / rangeX,
            (canvas.height - 2*padding) / rangeY
        );
        const offX = (canvas.width - rangeX * scale) / 2 - minX * scale;
        const offY = (canvas.height - rangeY * scale) / 2 + maxY * scale;

        const colorMap = { blue: '#232D4B', green: '#4B8B3B', yellow: '#E57200', red: '#C84E3A' };

        for (const d of dominoes) {
            const sx = d.x * scale + offX;
            const sy = offY - (d.y + d.h) * scale;
            const sw = d.w * scale, sh = d.h * scale;
            ctx.fillStyle = colorMap[d.color] || '#999';
            ctx.fillRect(sx, sy, sw, sh);
        }
    }

    // --- GFF colormap: red/blue, same as lozenge version ---

    function gffColor(h) {
        const t = Math.tanh(h / 1.5);
        if (t < 0) {
            const s = -t;
            return [0.1 * (1 - s), 0.2 * (1 - s), 1.0];
        }
        const s = t;
        return [1.0, 0.15 * (1 - s), 0.05 * (1 - s)];
    }

    // --- Three.js lifecycle ---

    function initThreeJS() {
        if (renderer) return;
        const canvas = document.getElementById(CANVAS_3D_ID);
        if (!canvas) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const aspect = canvas.width / canvas.height;
        const frustumSize = 40;
        camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2, frustumSize * aspect / 2,
            frustumSize / 2, -frustumSize / 2, -5000, 6000
        );
        camera.position.set(20, 20, 30);
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);

        try {
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        } catch (e) {
            console.error('[domino-gff] WebGL not available:', e);
            return;
        }
        renderer.setSize(canvas.width, canvas.height);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.rotateSpeed = 0.8;

        controls.addEventListener('change', () => {
            const p = camera.position, t = controls.target, u = camera.up;
            console.log(
                `[domino-gff] pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}` +
                ` | target: ${t.x.toFixed(1)}, ${t.y.toFixed(1)}, ${t.z.toFixed(1)}` +
                ` | up: ${u.x.toFixed(3)}, ${u.y.toFixed(3)}, ${u.z.toFixed(3)}` +
                ` | zoom: ${camera.zoom.toFixed(4)}`
            );
        });

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

    // --- 3D GFF surface from domino height functions ---

    function buildGFFSurface(gff) {
        clearMeshGroup();
        if (!meshGroup || !gff || gff.size === 0) return;

        // Find grid extents and step size
        let minGX = Infinity, maxGX = -Infinity;
        let minGY = Infinity, maxGY = -Infinity;
        for (const key of gff.keys()) {
            const [gx, gy] = key.split(',').map(Number);
            if (gx < minGX) minGX = gx; if (gx > maxGX) maxGX = gx;
            if (gy < minGY) minGY = gy; if (gy > maxGY) maxGY = gy;
        }

        const xCoords = [...new Set(Array.from(gff.keys()).map(k => Number(k.split(',')[0])))].sort((a, b) => a - b);
        let step = 2;
        for (let i = 1; i < xCoords.length; i++) {
            const diff = xCoords[i] - xCoords[i-1];
            if (diff > 0) step = Math.min(step, diff);
        }

        const positions = [], colors = [], indices = [];
        const scaleXY = 60 / Math.max(maxGX - minGX, maxGY - minGY, 1);
        const centerX = (minGX + maxGX) / 2, centerY = (minGY + maxGY) / 2;

        for (let gx = minGX; gx < maxGX; gx += step) {
            for (let gy = minGY; gy < maxGY; gy += step) {
                const k00 = `${gx},${gy}`, k10 = `${gx+step},${gy}`;
                const k01 = `${gx},${gy+step}`, k11 = `${gx+step},${gy+step}`;
                if (gff.has(k00) && gff.has(k10) && gff.has(k01) && gff.has(k11)) {
                    const h00 = gff.get(k00), h10 = gff.get(k10);
                    const h01 = gff.get(k01), h11 = gff.get(k11);
                    const idx = positions.length / 3;
                    const x0 = (gx - centerX) * scaleXY, x1 = (gx + step - centerX) * scaleXY;
                    const y0 = (gy - centerY) * scaleXY, y1 = (gy + step - centerY) * scaleXY;
                    positions.push(x0, y0, h00 * Z_SCALE, x1, y0, h10 * Z_SCALE,
                                   x0, y1, h01 * Z_SCALE, x1, y1, h11 * Z_SCALE);
                    const c00 = gffColor(h00 * Z_SCALE), c10 = gffColor(h10 * Z_SCALE);
                    const c01 = gffColor(h01 * Z_SCALE), c11 = gffColor(h11 * Z_SCALE);
                    colors.push(...c00, ...c10, ...c01, ...c11);
                    indices.push(idx, idx+1, idx+2, idx+1, idx+3, idx+2);
                }
            }
        }
        if (positions.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        meshGroup.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, flatShading: true,
            roughness: 0.5, metalness: 0.15
        })));

        // Auto-fit camera
        const box = new THREE.Box3().setFromObject(meshGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        controls.target.copy(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.zoom = 35 / maxDim;
        camera.position.set(center.x + maxDim * 0.4, center.y - maxDim * 0.6, center.z + maxDim * 0.5);
        camera.updateProjectionMatrix();
        controls.update();
    }

    // --- Step handling ---

    function setStatus(text) {
        const el = document.getElementById('dgff-status');
        if (el) el.textContent = text;
    }

    async function showLargeTiling() {
        show2D();
        setStatus('Sampling...');
        const dominoes = await sampleTiling(N);
        if (!dominoes) { setStatus('Sampling failed'); return; }
        lastDominoes = dominoes;
        drawDominoes(dominoes);
        setStatus(`Aztec diamond, N = ${N}`);
    }

    async function showGFF() {
        setStatus('Sampling two tilings...');
        const d1 = await sampleTiling(N);
        const d2 = await sampleTiling(N);
        if (!d1 || !d2) { setStatus('Sampling failed'); return; }

        setStatus('Computing GFF...');
        const h1 = calculateHeightFunction(d1);
        const h2 = calculateHeightFunction(d2);

        // GFF = (h1 - h2) / sqrt(2), centered
        const gff = new Map();
        const sqrt2 = Math.SQRT2;
        let sum = 0, count = 0;
        for (const [key, v1] of h1) {
            if (h2.has(key)) {
                const val = (v1 - h2.get(key)) / sqrt2;
                gff.set(key, val);
                sum += val;
                count++;
            }
        }
        if (count > 0) {
            const mean = sum / count;
            for (const [key, val] of gff) {
                gff.set(key, val - mean);
            }
        }

        show3D();
        initThreeJS();
        if (renderer) {
            buildGFFSurface(gff);
            setStatus(`GFF ≈ (h₁ − h₂)/√2, N = ${N}`);
            gffBuilt = true;
        } else {
            setStatus('WebGL context unavailable');
        }
    }

    function reset() {
        lastDominoes = null;
        gffBuilt = false;
        disposeThreeJS();
        show2D();
        const canvas = document.getElementById(CANVAS_2D_ID);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setStatus('');
    }

    // --- Slide engine registration ---

    function tryInit() {
        if (!window.slideEngine) { setTimeout(tryInit, 100); return; }

        window.slideEngine.registerSimulation(SLIDE_ID, {
            steps: 1,

            async onStep(step) {
                if (step === 1) {
                    await showGFF();
                }
            },

            onStepBack(step) {
                if (step === 0) {
                    disposeThreeJS();
                    gffBuilt = false;
                    show2D();
                    if (lastDominoes) {
                        drawDominoes(lastDominoes);
                        setStatus(`Aztec diamond, N = ${N}`);
                    }
                }
            },

            start() {},
            pause() {},

            async onSlideEnter() {
                await initShufflingWasm();
                if (!lastDominoes) {
                    await showLargeTiling();
                }
            },

            onSlideLeave() {
                disposeThreeJS();
            }
        }, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
