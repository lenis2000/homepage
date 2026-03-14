(function() {
    'use strict';

    const SLIDE_ID = 'domino-gff';
    const CANVAS_2D_ID = 'dgff-canvas-2d';
    const CANVAS_3D_ID = 'dgff-canvas-3d';
    const N_SMALL = 4;
    const N_LARGE = 80;

    let shufflingModule = null;
    let wasmReady = false;

    // Three.js state (lazy init)
    let scene = null, renderer = null, camera = null, controls = null;
    let meshGroup = null;
    let renderLoopId = null;

    // Simulation state
    let currentStep = 0;
    let lastLargeDominoes = null;

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

    // --- Sampling ---

    async function sampleTiling(n) {
        if (!wasmReady) return null;
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
    }

    // --- Height function from dominos ---

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
        return heights;
    }

    // --- 2D domino drawing ---

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

        const rangeX = maxX - minX;
        const rangeY = maxY - minY;
        const padding = 20;
        const scaleX = (canvas.width - 2 * padding) / rangeX;
        const scaleY = (canvas.height - 2 * padding) / rangeY;
        const scale = Math.min(scaleX, scaleY);
        const offX = (canvas.width - rangeX * scale) / 2 - minX * scale;
        const offY = (canvas.height - rangeY * scale) / 2 + maxY * scale;

        const colorMap = {
            blue: '#232D4B',
            green: '#4B8B3B',
            yellow: '#E57200',
            red: '#C84E3A'
        };

        for (const d of dominoes) {
            const sx = d.x * scale + offX;
            const sy = offY - (d.y + d.h) * scale;
            const sw = d.w * scale;
            const sh = d.h * scale;
            ctx.fillStyle = colorMap[d.color] || '#999';
            ctx.fillRect(sx, sy, sw, sh);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = Math.max(1, scale * 0.15);
            ctx.strokeRect(sx, sy, sw, sh);
        }
    }

    // --- 3D GFF surface (lazy Three.js on dedicated canvas) ---

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
            frustumSize / 2, -frustumSize / 2, 1, 1000
        );
        camera.position.set(30, 50, 30);
        camera.up.set(0, 1, 0);
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

    function getHeightColor(h, maxAbsH) {
        const t = maxAbsH > 0 ? Math.tanh(h / (maxAbsH * 0.5)) : 0;
        const gray = 0.75;
        let r, g, b;
        if (t < 0) {
            const s = -t;
            r = gray * (1 - s); g = gray * (1 - s); b = gray + s * (1 - gray);
        } else {
            const s = t;
            r = gray + s * (1 - gray); g = gray * (1 - s); b = gray * (1 - s);
        }
        return new THREE.Color(r, g, b);
    }

    function buildGFFSurface(heightDiff) {
        if (!meshGroup) return;
        while (meshGroup.children.length > 0) {
            const m = meshGroup.children[0];
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
            meshGroup.remove(m);
        }
        if (!heightDiff || heightDiff.size === 0) return;

        const vertices = [];
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let maxAbsH = 0;

        for (const [key, h] of heightDiff) {
            const [gx, gy] = key.split(',').map(Number);
            vertices.push({ gx, gy, h });
            minX = Math.min(minX, gx); maxX = Math.max(maxX, gx);
            minY = Math.min(minY, gy); maxY = Math.max(maxY, gy);
            maxAbsH = Math.max(maxAbsH, Math.abs(h));
        }

        const heightMap = new Map();
        for (const v of vertices) heightMap.set(`${v.gx},${v.gy}`, v.h);

        const xCoords = [...new Set(vertices.map(v => v.gx))].sort((a, b) => a - b);
        let step = 2;
        for (let i = 1; i < xCoords.length; i++) {
            const diff = xCoords[i] - xCoords[i-1];
            if (diff > 0) step = Math.min(step, diff);
        }

        const positions = [];
        const colors = [];
        const indices = [];
        const scale = 60 / Math.max(maxX - minX, maxY - minY, 1);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const heightScale = 3;

        for (let gx = minX; gx < maxX; gx += step) {
            for (let gy = minY; gy < maxY; gy += step) {
                const k00 = `${gx},${gy}`;
                const k10 = `${gx+step},${gy}`;
                const k01 = `${gx},${gy+step}`;
                const k11 = `${gx+step},${gy+step}`;
                if (heightMap.has(k00) && heightMap.has(k10) && heightMap.has(k01) && heightMap.has(k11)) {
                    const h00 = heightMap.get(k00), h10 = heightMap.get(k10);
                    const h01 = heightMap.get(k01), h11 = heightMap.get(k11);
                    const idx = positions.length / 3;
                    const x0 = (gx - centerX) * scale, x1 = (gx + step - centerX) * scale;
                    const y0 = (gy - centerY) * scale, y1 = (gy + step - centerY) * scale;
                    positions.push(x0, h00 * heightScale, y0);
                    positions.push(x1, h10 * heightScale, y0);
                    positions.push(x0, h01 * heightScale, y1);
                    positions.push(x1, h11 * heightScale, y1);
                    const c00 = getHeightColor(h00, maxAbsH), c10 = getHeightColor(h10, maxAbsH);
                    const c01 = getHeightColor(h01, maxAbsH), c11 = getHeightColor(h11, maxAbsH);
                    colors.push(c00.r, c00.g, c00.b, c10.r, c10.g, c10.b);
                    colors.push(c01.r, c01.g, c01.b, c11.r, c11.g, c11.b);
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

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            flatShading: true,
            roughness: 0.5,
            metalness: 0.15
        });
        meshGroup.add(new THREE.Mesh(geometry, material));
    }

    // --- Step handling ---

    function setStatus(text) {
        const el = document.getElementById('dgff-status');
        if (el) el.textContent = text;
    }

    // Step 1: small N=4 tiling (auto on slide enter)
    async function showSmallTiling() {
        show2D();
        disposeThreeJS();
        const dominoes = await sampleTiling(N_SMALL);
        if (!dominoes) { setStatus('WASM not ready'); return; }
        drawDominoes(dominoes);
        setStatus(`Aztec diamond, N = ${N_SMALL}`);
    }

    // Step 2: large N=80 tiling
    async function showLargeTiling() {
        show2D();
        disposeThreeJS();
        setStatus('Sampling...');
        const dominoes = await sampleTiling(N_LARGE);
        if (!dominoes) { setStatus('Sampling failed'); return; }
        lastLargeDominoes = dominoes;
        drawDominoes(dominoes);
        setStatus(`Aztec diamond, N = ${N_LARGE} — ${dominoes.length} dominoes`);
    }

    // Step 3: GFF
    async function showGFF() {
        const insight = document.getElementById('dgff-insight');
        if (insight) insight.style.opacity = '1';

        setStatus('Sampling two tilings...');
        const d1 = await sampleTiling(N_LARGE);
        const d2 = await sampleTiling(N_LARGE);
        if (!d1 || !d2) { setStatus('Sampling failed'); return; }

        setStatus('Computing GFF...');
        const h1 = calculateHeightFunction(d1);
        const h2 = calculateHeightFunction(d2);

        const gff = new Map();
        const sqrt2 = Math.SQRT2;
        for (const [key, v1] of h1) {
            if (h2.has(key)) {
                gff.set(key, (v1 - h2.get(key)) / sqrt2);
            }
        }

        show3D();
        initThreeJS();
        if (renderer) {
            buildGFFSurface(gff);
            setStatus(`GFF — (h₁ − h₂)/√2, N = ${N_LARGE}`);
        } else {
            setStatus('WebGL context unavailable');
        }
    }

    function reset() {
        currentStep = 0;
        lastLargeDominoes = null;
        const insight = document.getElementById('dgff-insight');
        if (insight) insight.style.opacity = '0';
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
            steps: 3,

            async onStep(step) {
                currentStep = step;
                if (step === 1) {
                    await initShufflingWasm();
                    await showSmallTiling();
                } else if (step === 2) {
                    await showLargeTiling();
                } else if (step === 3) {
                    await showGFF();
                }
            },

            onStepBack(step) {
                currentStep = step;
                if (step === 0) {
                    reset();
                } else if (step === 1) {
                    const insight = document.getElementById('dgff-insight');
                    if (insight) insight.style.opacity = '0';
                    disposeThreeJS();
                    show2D();
                    // Re-sample small tiling
                    initShufflingWasm().then(() => showSmallTiling());
                } else if (step === 2) {
                    const insight = document.getElementById('dgff-insight');
                    if (insight) insight.style.opacity = '0';
                    disposeThreeJS();
                    show2D();
                    if (lastLargeDominoes) {
                        drawDominoes(lastLargeDominoes);
                        setStatus(`Aztec diamond, N = ${N_LARGE} — ${lastLargeDominoes.length} dominoes`);
                    }
                }
            },

            start() {},
            pause() {},

            onSlideEnter() {
                initShufflingWasm();
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
