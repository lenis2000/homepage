(function() {
    'use strict';

    const SLIDE_ID = 'domino-gff';
    const CANVAS_2D_ID = 'dgff-canvas-2d';
    const CANVAS_3D_ID = 'dgff-canvas-3d';
    const N_SMALL = 4;
    const N_LARGE = 80;

    let shufflingModule = null;
    let wasmReady = false;
    let sampling = false;

    // Three.js state (lazy init)
    let scene = null, renderer = null, camera = null, controls = null;
    let meshGroup = null;
    let renderLoopId = null;

    // Simulation state
    let currentStep = 0;
    let lastSmallDominoes = null;
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

    // --- Height function (from domino.md) ---

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

        // Negate heights (as in domino.md)
        const finalHeights = new Map();
        heights.forEach((h, key) => finalHeights.set(key, -h));
        return finalHeights;
    }

    // --- createDominoFaces (from domino.md) ---

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
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = Math.max(1, scale * 0.15);
            ctx.strokeRect(sx, sy, sw, sh);
        }
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

    function clearMeshGroup() {
        if (!meshGroup) return;
        while (meshGroup.children.length > 0) {
            const m = meshGroup.children[0];
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
            meshGroup.remove(m);
        }
    }

    // --- 3D stepped domino rendering (from domino.md) ---

    function buildDominoSurface(dominoes, n) {
        clearMeshGroup();
        if (!meshGroup || !dominoes) return;

        const heightMap = calculateHeightFunction(dominoes);
        const scale = 60 / (2 * n);

        const threeColors = {
            blue:   new THREE.Color('#232D4B'),
            green:  new THREE.Color('#4B8B3B'),
            yellow: new THREE.Color('#E57200'),
            red:    new THREE.Color('#C84E3A')
        };

        // Compute faces with heights
        const faces = dominoes.map(d => createDominoFaces(d, heightMap, scale));

        // Height range for gradient
        let minH = Infinity, maxH = -Infinity;
        for (const f of faces) {
            minH = Math.min(minH, f.avgHeight);
            maxH = Math.max(maxH, f.avgHeight);
        }
        const hRange = maxH - minH || 1;

        // Build meshes (from domino.md rendering pipeline)
        for (const f of faces) {
            const geom = new THREE.BufferGeometry();
            const pos = [];
            for (const v of f.vertices) {
                pos.push(v[0] * scale, v[1] * scale, v[2] * scale);
            }
            geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

            const isH = (f.color === 'blue' || f.color === 'green');
            const indices = isH
                ? [0,1,3, 3,2,1, 0,1,4, 3,2,5]
                : [0,1,3, 3,2,1, 0,1,4, 3,2,5];
            geom.setIndex(indices);
            geom.computeVertexNormals();

            // Height gradient coloring
            const baseColor = threeColors[f.color] || new THREE.Color(0x808080);
            const t = (f.avgHeight - minH) / hRange;
            const darkColor = baseColor.clone().multiplyScalar(0.4);
            const finalColor = darkColor.lerp(baseColor, t);

            const mat = new THREE.MeshStandardMaterial({
                color: finalColor,
                side: THREE.DoubleSide,
                flatShading: true
            });
            meshGroup.add(new THREE.Mesh(geom, mat));
        }

        // Center the group (from domino.md)
        const box = new THREE.Box3().setFromObject(meshGroup);
        const center = box.getCenter(new THREE.Vector3());
        meshGroup.position.sub(center);

        const sizeXYZ = box.getSize(new THREE.Vector3());
        const viewW = camera.right - camera.left;
        const viewH = camera.top - camera.bottom;
        const maxScale = 0.95 * Math.min(viewW / sizeXYZ.x, viewH / sizeXYZ.z);
        meshGroup.scale.setScalar(maxScale);

        controls.target.set(0, 0, 0);
        controls.update();
    }

    // --- 3D GFF smooth surface ---

    function gffColor(h, maxAbsH) {
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

    function buildGFFSurface(gff, maxAbsH) {
        clearMeshGroup();
        if (!meshGroup || !gff || gff.size === 0) return;

        const vertices = [];
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const [key, h] of gff) {
            const [gx, gy] = key.split(',').map(Number);
            vertices.push({ gx, gy, h });
            minX = Math.min(minX, gx); maxX = Math.max(maxX, gx);
            minY = Math.min(minY, gy); maxY = Math.max(maxY, gy);
        }

        const hMap = new Map();
        for (const v of vertices) hMap.set(`${v.gx},${v.gy}`, v.h);

        const xCoords = [...new Set(vertices.map(v => v.gx))].sort((a, b) => a - b);
        let step = 2;
        for (let i = 1; i < xCoords.length; i++) {
            const diff = xCoords[i] - xCoords[i-1];
            if (diff > 0) step = Math.min(step, diff);
        }

        const positions = [], colors = [], indices = [];
        const scale = 60 / Math.max(maxX - minX, maxY - minY, 1);
        const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
        const heightScale = 3;

        for (let gx = minX; gx < maxX; gx += step) {
            for (let gy = minY; gy < maxY; gy += step) {
                const k00 = `${gx},${gy}`, k10 = `${gx+step},${gy}`;
                const k01 = `${gx},${gy+step}`, k11 = `${gx+step},${gy+step}`;
                if (hMap.has(k00) && hMap.has(k10) && hMap.has(k01) && hMap.has(k11)) {
                    const h00 = hMap.get(k00), h10 = hMap.get(k10);
                    const h01 = hMap.get(k01), h11 = hMap.get(k11);
                    const idx = positions.length / 3;
                    const x0 = (gx - centerX) * scale, x1 = (gx + step - centerX) * scale;
                    const y0 = (gy - centerY) * scale, y1 = (gy + step - centerY) * scale;
                    positions.push(x0, h00*heightScale, y0, x1, h10*heightScale, y0,
                                   x0, h01*heightScale, y1, x1, h11*heightScale, y1);
                    const c00 = gffColor(h00, maxAbsH), c10 = gffColor(h10, maxAbsH);
                    const c01 = gffColor(h01, maxAbsH), c11 = gffColor(h11, maxAbsH);
                    colors.push(c00.r,c00.g,c00.b, c10.r,c10.g,c10.b,
                                c01.r,c01.g,c01.b, c11.r,c11.g,c11.b);
                    indices.push(idx,idx+1,idx+2, idx+1,idx+3,idx+2);
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
    }

    // --- Step handling ---

    function setStatus(text) {
        const el = document.getElementById('dgff-status');
        if (el) el.textContent = text;
    }

    // Step 1: small N=4 tiling in 2D
    async function showSmallTiling() {
        disposeThreeJS();
        show2D();
        const dominoes = await sampleTiling(N_SMALL);
        if (!dominoes) { setStatus('WASM not ready'); return; }
        lastSmallDominoes = dominoes;
        drawDominoes(dominoes);
        setStatus(`Aztec diamond, N = ${N_SMALL}`);
    }

    // Step 2: same small tiling as 3D stepped height function (domino.md style)
    function showSmallHeight() {
        if (!lastSmallDominoes) return;
        show3D();
        initThreeJS();
        if (!renderer) return;
        buildDominoSurface(lastSmallDominoes, N_SMALL);
        setStatus(`Height function h(x,y), N = ${N_SMALL}`);
    }

    // Step 3: large N=80 tiling in 2D
    async function showLargeTiling() {
        disposeThreeJS();
        show2D();
        setStatus('Sampling...');
        const dominoes = await sampleTiling(N_LARGE);
        if (!dominoes) { setStatus('Sampling failed'); return; }
        lastLargeDominoes = dominoes;
        drawDominoes(dominoes);
        setStatus(`Aztec diamond, N = ${N_LARGE} — ${dominoes.length} dominoes`);
    }

    // Step 4: GFF 3D surface
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
        let maxAbsH = 0;
        for (const [key, v1] of h1) {
            if (h2.has(key)) {
                const val = (v1 - h2.get(key)) / sqrt2;
                gff.set(key, val);
                maxAbsH = Math.max(maxAbsH, Math.abs(val));
            }
        }

        show3D();
        initThreeJS();
        if (renderer) {
            buildGFFSurface(gff, maxAbsH);
            setStatus(`GFF — (h₁ − h₂)/√2, N = ${N_LARGE}`);
        } else {
            setStatus('WebGL context unavailable');
        }
    }

    function reset() {
        currentStep = 0;
        lastSmallDominoes = null;
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
            steps: 4,

            async onStep(step) {
                currentStep = step;
                if (step === 1) {
                    await initShufflingWasm();
                    await showSmallTiling();
                } else if (step === 2) {
                    showSmallHeight();
                } else if (step === 3) {
                    await showLargeTiling();
                } else if (step === 4) {
                    await showGFF();
                }
            },

            onStepBack(step) {
                currentStep = step;
                const insight = document.getElementById('dgff-insight');
                if (insight) insight.style.opacity = '0';

                if (step === 0) {
                    reset();
                } else if (step === 1) {
                    disposeThreeJS();
                    show2D();
                    if (lastSmallDominoes) {
                        drawDominoes(lastSmallDominoes);
                        setStatus(`Aztec diamond, N = ${N_SMALL}`);
                    }
                } else if (step === 2) {
                    showSmallHeight();
                } else if (step === 3) {
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
