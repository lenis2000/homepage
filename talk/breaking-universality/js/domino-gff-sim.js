(function() {
    'use strict';

    const SLIDE_ID = 'domino-gff';
    const CANVAS_ID = 'dgff-canvas';
    const N = 100;

    let shufflingModule = null;
    let wasmReady = false;
    let sampling = false;

    // State
    let lastDominoes = null;
    let lastGFF = null;

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
        const canvas = document.getElementById(CANVAS_ID);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!dominoes || dominoes.length === 0) return;

        // Find unit cell size and bounding box
        const unit = Math.min(...dominoes.map(d => Math.min(d.w, d.h)));
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const d of dominoes) {
            minX = Math.min(minX, d.x);
            maxX = Math.max(maxX, d.x + d.w);
            minY = Math.min(minY, d.y);
            maxY = Math.max(maxY, d.y + d.h);
        }

        const gridW = Math.round((maxX - minX) / unit);
        const gridH = Math.round((maxY - minY) / unit);

        // Draw to offscreen canvas at exact grid resolution (1 pixel per unit cell)
        const offscreen = document.createElement('canvas');
        offscreen.width = gridW;
        offscreen.height = gridH;
        const octx = offscreen.getContext('2d');

        const colorMap = { yellow: '#FFCD00', green: '#228B22', blue: '#0057B7', red: '#DC143C' };

        for (const d of dominoes) {
            const gx = Math.round((d.x - minX) / unit);
            const gy = Math.round((maxY - d.y - d.h) / unit);
            const gw = Math.round(d.w / unit);
            const gh = Math.round(d.h / unit);
            octx.fillStyle = colorMap[d.color] || '#999';
            octx.fillRect(gx, gy, gw, gh);
        }

        // Scale to main canvas with nearest-neighbor (no gaps, no moiré)
        ctx.imageSmoothingEnabled = false;
        const padding = 20;
        const scale = Math.min(
            (canvas.width - 2*padding) / gridW,
            (canvas.height - 2*padding) / gridH
        );
        const drawW = gridW * scale, drawH = gridH * scale;
        ctx.drawImage(offscreen,
            (canvas.width - drawW) / 2, (canvas.height - drawH) / 2,
            drawW, drawH);
    }

    // --- GFF colormap: discrete shades for ±2 height differences ---
    // h = (h1 - h2)/√2; original diff h1-h2 is always even,
    // so GFF values are multiples of √2. Each discrete level = height diff of 2.

    function gffColor(h) {
        // Convert back to integer level (each step = height diff of 2)
        const level = Math.round(h * Math.SQRT2 / 2);
        const maxLevel = 6;
        const clamped = Math.max(-maxLevel, Math.min(maxLevel, level));
        const t = clamped / maxLevel; // -1 to 1, discrete steps
        const gray = 0.75;
        let r, g, b;
        if (t < 0) {
            const s = -t;
            r = gray * (1 - s); g = gray * (1 - s); b = gray + s * (1 - gray);
        } else {
            const s = t;
            r = gray + s * (1 - gray); g = gray * (1 - s); b = gray * (1 - s);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    // --- 2D GFF heatmap ---

    function drawGFFHeatmap(gff) {
        const canvas = document.getElementById(CANVAS_ID);
        if (!canvas || !gff || gff.size === 0) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Find grid extents and step
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

        // Draw to offscreen canvas at grid resolution
        const gridW = Math.round((maxGX - minGX) / step) + 1;
        const gridH = Math.round((maxGY - minGY) / step) + 1;
        const offscreen = document.createElement('canvas');
        offscreen.width = gridW;
        offscreen.height = gridH;
        const octx = offscreen.getContext('2d');
        const imgData = octx.createImageData(gridW, gridH);
        const data = imgData.data;

        for (const [key, val] of gff) {
            const [gx, gy] = key.split(',').map(Number);
            const px = Math.round((gx - minGX) / step);
            const py = Math.round((maxGY - gy) / step);
            if (px >= 0 && px < gridW && py >= 0 && py < gridH) {
                const [r, g, b] = gffColor(val);
                const idx = (py * gridW + px) * 4;
                data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 255;
            }
        }
        octx.putImageData(imgData, 0, 0);

        // Scale to main canvas with nearest-neighbor
        ctx.imageSmoothingEnabled = false;
        const padding = 20;
        const scale = Math.min(
            (canvas.width - 2*padding) / gridW,
            (canvas.height - 2*padding) / gridH
        );
        const drawW = gridW * scale, drawH = gridH * scale;
        ctx.drawImage(offscreen,
            (canvas.width - drawW) / 2, (canvas.height - drawH) / 2,
            drawW, drawH);
    }

    // --- Step handling ---

    function setStatus(text) {
        const el = document.getElementById('dgff-status');
        if (el) el.textContent = text;
    }

    async function showLargeTiling() {
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

        // GFF = (h1 - h2) / sqrt(2) — no mean centering needed,
        // both height functions share the same root vertex at 0
        const gff = new Map();
        const sqrt2 = Math.SQRT2;
        for (const [key, v1] of h1) {
            if (h2.has(key)) {
                gff.set(key, (v1 - h2.get(key)) / sqrt2);
            }
        }

        lastGFF = gff;
        drawGFFHeatmap(gff);
        setStatus(`GFF ≈ (h₁ − h₂)/√2, N = ${N}`);
    }

    function reset() {
        lastDominoes = null;
        lastGFF = null;
        const canvas = document.getElementById(CANVAS_ID);
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

            onSlideLeave() {}
        }, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }
})();
