(function() {
    'use strict';

    const SLIDE_ID = 'limit-shape-deformation';
    const CANVAS_ID = 'lsd-sample-canvas';
    const N = 200;

    let shufflingModule = null;
    let wasmReady = false;
    let sampling = false;
    let cachedDominoes = null;

    // --- WASM ---

    async function initWasm() {
        if (wasmReady) return true;
        if (typeof createShufflingModule === 'undefined') return false;
        try {
            shufflingModule = await createShufflingModule();
            wasmReady = true;
            return true;
        } catch (e) {
            console.error('[lsd] WASM init failed:', e);
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

            // Diagonal-layered Uniform[0,2] weights
            const diagWeights = new Float64Array(N);
            for (let k = 0; k < N; k++) {
                diagWeights[k] = Math.random() * 2.0;
            }

            // Beta edges (even row, even col) get diagonal-layered weight.
            // Alpha, gamma, delta = 1.0.
            for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) {
                    let w = 1.0;
                    if (i % 2 === 0 && j % 2 === 0) {
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
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('[lsd] Sampling failed:', e);
            wasmReady = false;
            shufflingModule = null;
            return null;
        } finally {
            sampling = false;
        }
    }

    // --- 2D domino drawing (no borders, offscreen nearest-neighbor) ---

    function drawDominoes(dominoes) {
        const canvas = document.getElementById(CANVAS_ID);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!dominoes || dominoes.length === 0) return;

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

        const cos45 = Math.SQRT1_2;
        const colorMap = { blue: '#232D4B', green: '#4B8B3B', yellow: '#E57200', red: '#C84E3A' };

        // Pre-compute rotated domino data and find tight bounding box
        let rMinX = Infinity, rMaxX = -Infinity, rMinY = Infinity, rMaxY = -Infinity;
        const rotDominoes = [];
        for (const d of dominoes) {
            const gx = (d.x - minX) / unit;
            const gy = (maxY - d.y - d.h) / unit;
            const gw = d.w / unit;
            const gh = d.h / unit;
            const pts = [[gx, gy], [gx + gw, gy], [gx + gw, gy + gh], [gx, gy + gh]];
            const rpts = pts.map(([x, y]) => [(x + y) * cos45, (y - x) * cos45]);
            for (const [rx, ry] of rpts) {
                if (rx < rMinX) rMinX = rx;
                if (rx > rMaxX) rMaxX = rx;
                if (ry < rMinY) rMinY = ry;
                if (ry > rMaxY) rMaxY = ry;
            }
            rotDominoes.push({ rpts, color: d.color });
        }

        const rW = rMaxX - rMinX;
        const rH = rMaxY - rMinY;
        const scale = Math.min(canvas.width / rW, canvas.height / rH) * 0.9;
        const offX = (canvas.width - rW * scale) / 2;
        const offY = 0;

        for (const { rpts, color } of rotDominoes) {
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const px = offX + (rpts[i][0] - rMinX) * scale;
                const py = offY + (rpts[i][1] - rMinY) * scale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = colorMap[color] || '#999';
            ctx.fill();
        }
    }

    // --- Status ---

    function setStatus(text) {
        const el = document.getElementById('lsd-status');
        if (el) el.textContent = text;
    }

    // --- Slide engine ---

    function tryInit() {
        if (!window.slideEngine) { setTimeout(tryInit, 100); return; }
        window.slideEngine.registerSimulation(SLIDE_ID, {
            steps: 0,

            start() {},
            pause() {},

            async onSlideEnter() {
                const samplingEl = document.getElementById('lsd-sampling');
                const canvasEl = document.getElementById(CANVAS_ID);
                await initWasm();
                if (!cachedDominoes) {
                    if (samplingEl) samplingEl.style.display = 'flex';
                    if (canvasEl) canvasEl.style.display = 'none';
                    const dominoes = await sampleTiling();
                    if (dominoes) {
                        cachedDominoes = dominoes;
                        if (samplingEl) samplingEl.style.display = 'none';
                        if (canvasEl) canvasEl.style.display = '';
                        drawDominoes(dominoes);
                    }
                } else {
                    if (samplingEl) samplingEl.style.display = 'none';
                    if (canvasEl) canvasEl.style.display = '';
                    drawDominoes(cachedDominoes);
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
