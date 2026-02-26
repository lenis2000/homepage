// APPROVED: Do not modify without explicit user request
/**
 * Flatland Summary Simulation
 * q-weighted path sample (a=240, b=180, q=0.99) with local zoom and fluctuations
 * Everything visible at once — no steps.
 */

(function() {
    'use strict';

    const mainCanvas = document.getElementById('fs-main-canvas');
    const mainCtx = mainCanvas.getContext('2d');
    const zoomCanvas = document.getElementById('fs-zoom-canvas');
    const zoomCtx = zoomCanvas.getContext('2d');
    const flucCanvas = document.getElementById('fs-fluc-canvas');
    const flucCtx = flucCanvas.getContext('2d');
    const statusEl = document.getElementById('fs-status');

    const N = 240;  // a
    const M = 180;  // b
    const q = 0.99;
    const gamma = -N * Math.log(q);
    const alpha = M / N;

    // WASM
    let wasm = null;
    let initSimulation, runCFTPBatch, getCoalesced, getPartitionPath, freeString;

    // Path data
    let pathCoords = [];   // [[x,y], ...]
    let pathMoves = [];    // ['R', 'U', ...]
    let isRunning = false;

    // Zoom highlight
    const highlightLen = 20;
    const highlightStart = Math.floor((N + M) / 2 - highlightLen / 2);

    const colors = ['#E57200', '#232D4B', '#F9DCBF'];

    async function initWasm() {
        if (typeof QPartitionModule === 'undefined') {
            statusEl.textContent = 'WASM not loaded';
            return false;
        }
        wasm = await QPartitionModule();
        initSimulation = wasm.cwrap('initSimulation', null, ['number', 'number', 'number']);
        runCFTPBatch = wasm.cwrap('runCFTPBatch', 'number', []);
        getCoalesced = wasm.cwrap('getCoalesced', 'number', []);
        getPartitionPath = wasm.cwrap('getPartitionPath', 'number', []);
        freeString = wasm.cwrap('freeString', null, ['number']);
        return true;
    }

    function getPathFromWasm() {
        const ptr = getPartitionPath();
        const str = wasm.UTF8ToString(ptr);
        freeString(ptr);
        const coords = JSON.parse(str);
        const moves = [];
        for (let i = 1; i < coords.length; i++) {
            const dx = coords[i][0] - coords[i - 1][0];
            if (dx > 0) moves.push('R');
            else moves.push('U');
        }
        return { coords, moves };
    }

    async function runCFTP() {
        if (!wasm || isRunning) return;
        isRunning = true;
        statusEl.textContent = 'Sampling...';

        initSimulation(N, M, q);

        let epochs = 0;

        while (true) {
            const status = runCFTPBatch();
            epochs++;
            if (status === 1) break;  // coalesced
            if (status === -1) {      // timeout
                statusEl.textContent = `Timeout after ${epochs} epochs`;
                isRunning = false;
                return;
            }
            statusEl.textContent = `Sampling... epoch ${epochs}`;
            await new Promise(r => setTimeout(r, 1));
        }

        const result = getPathFromWasm();
        pathCoords = result.coords;
        pathMoves = result.moves;
        statusEl.textContent = `Sampled in ${epochs} epochs`;
        isRunning = false;
        drawAll();
    }

    function drawAll() {
        drawMain();
        drawZoom();
        drawFluctuations();
    }

    // --- Limit shape math ---
    function getLimitShapeY(x_norm) {
        if (Math.abs(gamma) < 1e-6) return x_norm;
        const denom = 1 - Math.exp(-gamma * (1 + alpha));
        const A = (1 - Math.exp(-gamma)) / denom;
        const B = (1 - Math.exp(-gamma * alpha)) / denom;
        const inside = (1 - B * Math.exp(-gamma * x_norm)) / A;
        if (inside <= 0) return x_norm;
        const y_formula = -Math.log(inside) / gamma;
        return (alpha - y_formula) / alpha;
    }

    // --- Main canvas: path + limit shape + zoom box ---
    function drawMain() {
        const w = mainCanvas.width, h = mainCanvas.height;
        mainCtx.fillStyle = '#fff';
        mainCtx.fillRect(0, 0, w, h);

        const padding = 50;
        const drawW = w - 2 * padding;
        const drawH = h - 2 * padding;
        const scale = Math.min(drawW / N, drawH / M);
        const offsetX = padding + (drawW - N * scale) / 2;
        const offsetY = padding + (drawH - M * scale) / 2;

        // Bounding rectangle
        mainCtx.strokeStyle = colors[1];
        mainCtx.lineWidth = 2;
        mainCtx.strokeRect(offsetX, offsetY, N * scale, M * scale);

        // Filled partition area
        if (pathCoords.length > 0) {
            mainCtx.fillStyle = colors[0] + '50';
            mainCtx.beginPath();
            mainCtx.moveTo(offsetX, offsetY + M * scale);
            for (const [px, py] of pathCoords) {
                mainCtx.lineTo(offsetX + px * scale, offsetY + (M - py) * scale);
            }
            mainCtx.lineTo(offsetX, offsetY);
            mainCtx.lineTo(offsetX, offsetY + M * scale);
            mainCtx.closePath();
            mainCtx.fill();

            // Path line
            mainCtx.strokeStyle = colors[0];
            mainCtx.lineWidth = 3;
            mainCtx.beginPath();
            for (let i = 0; i < pathCoords.length; i++) {
                const [px, py] = pathCoords[i];
                const cx = offsetX + px * scale;
                const cy = offsetY + (M - py) * scale;
                if (i === 0) mainCtx.moveTo(cx, cy);
                else mainCtx.lineTo(cx, cy);
            }
            mainCtx.stroke();
        }

        // Limit shape curve (red dashed)
        mainCtx.strokeStyle = '#ff0000';
        mainCtx.lineWidth = 3;
        mainCtx.setLineDash([8, 4]);
        mainCtx.beginPath();
        mainCtx.moveTo(offsetX, offsetY + M * scale);
        const steps = 200;
        for (let i = 1; i < steps; i++) {
            const x_norm = i / steps;
            const y_norm = getLimitShapeY(x_norm);
            mainCtx.lineTo(offsetX + x_norm * N * scale, offsetY + (M - y_norm * M) * scale);
        }
        mainCtx.lineTo(offsetX + N * scale, offsetY);
        mainCtx.stroke();
        mainCtx.setLineDash([]);

        // Zoom highlight box (always shown)
        if (pathMoves.length > 0) {
            let hx = 0, hy = 0;
            for (let i = 0; i < highlightStart && i < pathMoves.length; i++) {
                if (pathMoves[i] === 'R') hx++; else hy++;
            }
            const startX = hx, startY = hy;
            for (let i = highlightStart; i < highlightStart + highlightLen && i < pathMoves.length; i++) {
                if (pathMoves[i] === 'R') hx++; else hy++;
            }
            const endX = hx, endY = hy;

            // Thicker highlight segment
            mainCtx.strokeStyle = '#232D4B';
            mainCtx.lineWidth = 6;
            mainCtx.beginPath();
            let px = startX, py = startY;
            mainCtx.moveTo(offsetX + px * scale, offsetY + (M - py) * scale);
            for (let i = highlightStart; i < highlightStart + highlightLen && i < pathMoves.length; i++) {
                if (pathMoves[i] === 'R') px++; else py++;
                mainCtx.lineTo(offsetX + px * scale, offsetY + (M - py) * scale);
            }
            mainCtx.stroke();

            // Box
            const boxPad = 8;
            const boxX1 = offsetX + startX * scale - boxPad;
            const boxY1 = offsetY + (M - endY) * scale - boxPad;
            const boxX2 = offsetX + endX * scale + boxPad;
            const boxY2 = offsetY + (M - startY) * scale + boxPad;
            mainCtx.strokeStyle = '#232D4B';
            mainCtx.lineWidth = 3;
            mainCtx.strokeRect(boxX1, boxY1, boxX2 - boxX1, boxY2 - boxY1);
        }
    }

    // --- Zoom canvas: local segment on grid ---
    function drawZoom() {
        const w = zoomCanvas.width, h = zoomCanvas.height;
        zoomCtx.fillStyle = '#fff';
        zoomCtx.fillRect(0, 0, w, h);

        if (pathMoves.length === 0) return;

        const segment = pathMoves.slice(highlightStart, highlightStart + highlightLen);
        if (segment.length === 0) return;

        let segR = 0, segU = 0;
        for (const m of segment) { if (m === 'R') segR++; else segU++; }
        if (segR === 0) segR = 1;
        if (segU === 0) segU = 1;

        const padding = 30;
        const availW = w - 2 * padding;
        const availH = h - 2 * padding;
        const step = Math.min(availW / segR, availH / segU);
        const gridW = segR * step;
        const gridH = segU * step;
        const baseX = padding + (availW - gridW) / 2;
        const baseY = padding + availH - (availH - gridH) / 2;

        // Grid lines
        zoomCtx.strokeStyle = '#ddd';
        zoomCtx.lineWidth = 1;
        for (let i = 0; i <= segR; i++) {
            zoomCtx.beginPath();
            zoomCtx.moveTo(baseX + i * step, baseY - gridH);
            zoomCtx.lineTo(baseX + i * step, baseY);
            zoomCtx.stroke();
        }
        for (let j = 0; j <= segU; j++) {
            zoomCtx.beginPath();
            zoomCtx.moveTo(baseX, baseY - j * step);
            zoomCtx.lineTo(baseX + gridW, baseY - j * step);
            zoomCtx.stroke();
        }

        // Path segments colored by direction
        let x = 0, y = 0;
        for (const move of segment) {
            const fromPx = baseX + x * step;
            const fromPy = baseY - y * step;
            if (move === 'R') {
                zoomCtx.strokeStyle = '#E57200';
                zoomCtx.lineWidth = 8;
                zoomCtx.lineCap = 'round';
                zoomCtx.beginPath();
                zoomCtx.moveTo(fromPx, fromPy);
                zoomCtx.lineTo(fromPx + step, fromPy);
                zoomCtx.stroke();
                x++;
            } else {
                zoomCtx.strokeStyle = '#232D4B';
                zoomCtx.lineWidth = 8;
                zoomCtx.lineCap = 'round';
                zoomCtx.beginPath();
                zoomCtx.moveTo(fromPx, fromPy);
                zoomCtx.lineTo(fromPx, fromPy - step);
                zoomCtx.stroke();
                y++;
            }
        }

        // Dots at vertices
        zoomCtx.fillStyle = '#232D4B';
        x = 0; y = 0;
        zoomCtx.beginPath();
        zoomCtx.arc(baseX, baseY, 5, 0, Math.PI * 2);
        zoomCtx.fill();
        for (const move of segment) {
            if (move === 'R') x++; else y++;
            zoomCtx.beginPath();
            zoomCtx.arc(baseX + x * step, baseY - y * step, 5, 0, Math.PI * 2);
            zoomCtx.fill();
        }
    }

    // --- Fluctuations canvas: path - limit shape ---
    function drawFluctuations() {
        const w = flucCanvas.width, h = flucCanvas.height;
        flucCtx.fillStyle = '#ffffff';
        flucCtx.fillRect(0, 0, w, h);

        if (pathCoords.length === 0) return;

        const padding = 20;
        const drawW = w - 2 * padding;
        const drawH = h - 2 * padding;

        // Compute fluctuations
        const fluctuations = [];
        for (const [px, py] of pathCoords) {
            const x_norm = px / N;
            const limitY = getLimitShapeY(x_norm) * M;
            fluctuations.push({ x_norm, diff: py - limitY });
        }

        // Max deviation for scaling
        let maxDev = 1;
        for (const f of fluctuations) maxDev = Math.max(maxDev, Math.abs(f.diff));

        // Zero line
        const zeroY = padding + drawH / 2;
        flucCtx.strokeStyle = '#ccc';
        flucCtx.lineWidth = 1;
        flucCtx.beginPath();
        flucCtx.moveTo(padding, zeroY);
        flucCtx.lineTo(padding + drawW, zeroY);
        flucCtx.stroke();

        // Fluctuation curve
        flucCtx.strokeStyle = colors[0];
        flucCtx.lineWidth = 3;
        flucCtx.beginPath();
        for (let i = 0; i < fluctuations.length; i++) {
            const f = fluctuations[i];
            const cx = padding + f.x_norm * drawW;
            const cy = zeroY - (f.diff / maxDev) * (drawH / 2) * 0.9;
            if (i === 0) flucCtx.moveTo(cx, cy);
            else flucCtx.lineTo(cx, cy);
        }
        flucCtx.stroke();
    }

    // --- Init ---
    async function init() {
        const ok = await initWasm();
        if (ok) await runCFTP();
    }

    function waitForSlideEngine() {
        if (!window.slideEngine) {
            setTimeout(waitForSlideEngine, 50);
            return;
        }
        window.slideEngine.registerSimulation('flatland-summary', {
            start() {},
            pause() {},
            onSlideEnter() {
                if (!wasm) {
                    init();
                } else if (pathCoords.length === 0) {
                    runCFTP();
                } else {
                    drawAll();
                }
            }
        }, 0);
    }
    waitForSlideEngine();

    // Initial placeholder draw
    drawMain();
})();
