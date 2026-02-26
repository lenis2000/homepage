// APPROVED: Do not modify without explicit user request
/**
 * q-Limit Shape Simulation
 * CFTP sampling for q-weighted lattice paths with limit shape visualization
 */

(function() {
    'use strict';

    const canvas = document.getElementById('q-limit-canvas');
    const ctx = canvas.getContext('2d');
    const flucCanvas = document.getElementById('fluctuations-canvas');
    const flucCtx = flucCanvas.getContext('2d');
    const gammaSlider = document.getElementById('gamma-slider');
    const gammaValueSpan = document.getElementById('gamma-value');
    const qValueSpan = document.getElementById('q-limit-value');
    const statusEl = document.getElementById('q-limit-status');
    const resampleBtn = document.getElementById('q-limit-resample');

    const N = 240;  // Width (a)
    const M = 180;  // Height (b)
    let q = 0.99;

    // WASM module
    let wasm = null;
    let initSimulation, runCFTPBatch, getCoalesced, getPartitionPath, freeString, getM, getN;

    // Partition path (sequence of 0=right, 1=up)
    let partitionPath = [];
    let isRunning = false;

    // Colors
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
        getM = wasm.cwrap('getM', 'number', []);
        getN = wasm.cwrap('getN', 'number', []);
        return true;
    }

    function getPathFromWasm() {
        const ptr = getPartitionPath();
        const str = wasm.UTF8ToString(ptr);
        freeString(ptr);
        return JSON.parse(str);
    }

    async function runCFTP() {
        if (!wasm || isRunning) return;
        isRunning = true;
        statusEl.textContent = 'Sampling...';

        initSimulation(N, M, q);

        let epochs = 0;

        while (true) {
            const result = runCFTPBatch();
            epochs++;
            if (result === 1) break;  // coalesced
            if (result === -1) {      // timeout
                statusEl.textContent = `Timeout after ${epochs} epochs`;
                isRunning = false;
                return;
            }
            statusEl.textContent = `Sampling... epoch ${epochs}`;
            await new Promise(r => setTimeout(r, 1));
        }

        partitionPath = getPathFromWasm();
        statusEl.textContent = `Sampled in ${epochs} epochs`;
        isRunning = false;
        draw();
    }

    function draw() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        const padding = 60;
        const drawW = w - 2 * padding;
        const drawH = h - 2 * padding;

        // Scale to fit M x N rectangle
        const scaleX = drawW / N;
        const scaleY = drawH / M;
        const scale = Math.min(scaleX, scaleY);

        const offsetX = padding + (drawW - N * scale) / 2;
        const offsetY = padding + (drawH - M * scale) / 2;

        // Bounding rectangle
        ctx.strokeStyle = colors[1];
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX, offsetY, N * scale, M * scale);

        // Draw partition (filled region)
        // partitionPath is [[x,y], [x,y], ...] from (0,0) to (N,M)
        if (partitionPath.length > 0) {
            ctx.fillStyle = colors[0] + '60';
            ctx.beginPath();
            // Start at bottom-left corner
            ctx.moveTo(offsetX, offsetY + M * scale);

            // Path goes from (0,0) to (N,M) in math coords
            // Canvas: x goes right, y goes DOWN, so we flip y
            for (const [px, py] of partitionPath) {
                ctx.lineTo(offsetX + px * scale, offsetY + (M - py) * scale);
            }

            // Close: go to top-left, then back to start
            ctx.lineTo(offsetX, offsetY);
            ctx.lineTo(offsetX, offsetY + M * scale);
            ctx.closePath();
            ctx.fill();

            // Draw path line
            ctx.strokeStyle = colors[0];
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < partitionPath.length; i++) {
                const [px, py] = partitionPath[i];
                const cx = offsetX + px * scale;
                const cy = offsetY + (M - py) * scale;
                if (i === 0) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }

        // Draw limit shape curve
        drawLimitShape(offsetX, offsetY, scale);

        // Draw fluctuations
        drawFluctuations();
    }

    function drawLimitShape(offsetX, offsetY, scale) {
        const aa = M / N;  // aspect ratio
        const gamma = -N * Math.log(q);

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();

        // For γ ≈ 0: straight diagonal
        if (Math.abs(gamma) < 1e-6) {
            ctx.moveTo(offsetX, offsetY + M * scale);
            ctx.lineTo(offsetX + N * scale, offsetY);
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }

        // A·e^{-γy} + B·e^{-γx} = 1 with y measured from TOP
        const denom = 1 - Math.exp(-gamma * (1 + aa));
        const A = (1 - Math.exp(-gamma)) / denom;
        const B = (1 - Math.exp(-gamma * aa)) / denom;

        const steps = 200;

        // Start at bottom-left corner
        ctx.moveTo(offsetX, offsetY + M * scale);

        for (let i = 1; i < steps; i++) {
            const x_norm = i / steps;
            const exp_neg_cx = Math.exp(-gamma * x_norm);
            const inside = (1 - B * exp_neg_cx) / A;

            if (inside > 0) {
                const y_formula = -Math.log(inside) / gamma;
                // y_formula goes from aa (at x=0) to 0 (at x=1)
                // We want y to go from 0 to M as x goes from 0 to N
                const y_scaled = (aa - y_formula) / aa * M;

                const canvasX = offsetX + x_norm * N * scale;
                const canvasY = offsetY + (M - y_scaled) * scale;
                ctx.lineTo(canvasX, canvasY);
            }
        }

        // End at top-right corner
        ctx.lineTo(offsetX + N * scale, offsetY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function getLimitShapeY(x_norm) {
        // Returns y in [0, 1] range (normalized to M)
        const aa = M / N;
        const gamma = -N * Math.log(q);
        if (Math.abs(gamma) < 1e-6) {
            return x_norm;  // Straight diagonal: y/M = x/N
        }
        const denom = 1 - Math.exp(-gamma * (1 + aa));
        const A = (1 - Math.exp(-gamma)) / denom;
        const B = (1 - Math.exp(-gamma * aa)) / denom;
        const exp_neg_cx = Math.exp(-gamma * x_norm);
        const inside = (1 - B * exp_neg_cx) / A;
        if (inside <= 0) return x_norm;
        const y_formula = -Math.log(inside) / gamma;
        // y_formula goes from aa to 0 as x goes 0 to 1
        // We want output in [0, 1] where 0 at x=0 and 1 at x=1
        return (aa - y_formula) / aa;
    }

    function drawFluctuations() {
        const w = flucCanvas.width, h = flucCanvas.height;
        flucCtx.fillStyle = '#ffffff';
        flucCtx.fillRect(0, 0, w, h);

        if (partitionPath.length === 0) return;

        const padding = 20;
        const drawW = w - 2 * padding;
        const drawH = h - 2 * padding;

        // Compute fluctuations: path_y - limit_shape_y at each x
        const fluctuations = [];
        for (const [px, py] of partitionPath) {
            const x_norm = px / N;
            const limitY = getLimitShapeY(x_norm) * M;  // Scale to M
            const diff = py - limitY;
            fluctuations.push({ x: px, diff: diff, x_norm: x_norm });
        }

        if (fluctuations.length === 0) return;

        // Find max deviation for scaling
        let maxDev = 1;
        for (const f of fluctuations) {
            maxDev = Math.max(maxDev, Math.abs(f.diff));
        }

        // Draw zero line
        const zeroY = padding + drawH / 2;
        flucCtx.strokeStyle = '#ccc';
        flucCtx.lineWidth = 1;
        flucCtx.beginPath();
        flucCtx.moveTo(padding, zeroY);
        flucCtx.lineTo(padding + drawW, zeroY);
        flucCtx.stroke();

        // Draw fluctuation curve
        flucCtx.strokeStyle = colors[0];
        flucCtx.lineWidth = 4;
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

    function updateGamma() {
        const gamma = parseFloat(gammaSlider.value);
        gammaValueSpan.textContent = gamma.toFixed(1);
        q = Math.exp(-gamma / N);
        qValueSpan.textContent = q.toFixed(4);
        draw();
    }

    gammaSlider.addEventListener('input', updateGamma);
    resampleBtn.addEventListener('click', () => runCFTP());

    // Initialize
    async function init() {
        const ok = await initWasm();
        if (ok) {
            await runCFTP();
        }
    }

    // Set gamma programmatically and resample
    function setGamma(gamma) {
        gammaSlider.value = gamma;
        gammaValueSpan.textContent = gamma.toFixed(1);
        q = Math.exp(-gamma / N);
        qValueSpan.textContent = q.toFixed(4);
        draw();  // Update limit shape curve immediately
        runCFTP();  // Start sampling in background
    }

    // Step gamma values
    const stepGammas = [3.6, 1, -8];  // step 0 (initial), step 1, step 2
    let currentStep = 0;

    // Register with slide engine
    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('q-limit-shape', {
                start() {},
                pause() {},
                steps: 2,
                onSlideEnter() {
                    // Restore gamma for current step
                    const gamma = stepGammas[currentStep];
                    gammaSlider.value = gamma;
                    gammaValueSpan.textContent = gamma.toFixed(1);
                    q = Math.exp(-gamma / N);
                    qValueSpan.textContent = q.toFixed(4);

                    if (!wasm) {
                        init();
                    } else if (partitionPath.length === 0) {
                        runCFTP();
                    } else {
                        draw();
                    }
                },
                onStep(step) {
                    currentStep = step;
                    if (step >= 1 && step <= stepGammas.length - 1) {
                        setGamma(stepGammas[step]);
                    }
                },
                onStepBack(step) {
                    currentStep = step;
                    if (step >= 0 && step <= stepGammas.length - 1) {
                        setGamma(stepGammas[step]);
                    }
                }
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();

    // Initial draw placeholder
    draw();
})();
