// APPROVED: Do not modify without explicit user request
/**
 * Fluctuations Gaussian Simulation
 * Shows path-minus-diagonal (Brownian bridge) immediately with pure JS 100×60 path.
 * Then samples midpoint heights via WASM CFTP, builds histogram → Gaussian.
 *
 * Steps:
 *   0: Bridge canvas visible (pure JS path-minus-diagonal)
 *   1: Init WASM, run CFTP + collect ~20 histogram samples
 *   2: Collect to 1000 samples
 *   3: Collect to 5000 samples
 *   4: Show fg-insight (Brownian bridge explanation text)
 *   5: Show fg-universality (universality of Brownian bridge)
 */

function initFluctuationsGaussianSim() {
    (function() {
    'use strict';

    // === DOM Elements ===
    const histCanvas = document.getElementById('fg-histogram-canvas');
    const bridgeCanvas = document.getElementById('fg-bridge-canvas');
    const histCountEl = document.getElementById('fg-histogram-count');
    if (!bridgeCanvas) return;

    const histCtx = histCanvas ? histCanvas.getContext('2d') : null;
    const bridgeCtx = bridgeCanvas.getContext('2d');

    function showElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hideElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    // === Pure JS path generation for bridge display ===
    const BRIDGE_A = 210, BRIDGE_B = 120;

    function generateRandomPath(a, b) {
        const moves = [];
        let remainingR = a, remainingU = b;
        while (remainingR + remainingU > 0) {
            if (remainingR === 0) { moves.push('U'); remainingU--; }
            else if (remainingU === 0) { moves.push('R'); remainingR--; }
            else if (Math.random() < remainingR / (remainingR + remainingU)) { moves.push('R'); remainingR--; }
            else { moves.push('U'); remainingU--; }
        }
        return moves;
    }

    function drawBridgeFromMoves(moves, a, b) {
        const w = bridgeCanvas.width, h = bridgeCanvas.height;
        const padding = 40;
        const N = a + b;

        bridgeCtx.fillStyle = '#fff';
        bridgeCtx.fillRect(0, 0, w, h);

        // Compute fluctuations: y_i - (b/(a+b)) * i
        const fluct = [0];
        let yCount = 0;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i] === 'U') yCount++;
            fluct.push(yCount - (b / N) * (i + 1));
        }

        let minF = 0, maxF = 0;
        for (const f of fluct) {
            if (f < minF) minF = f;
            if (f > maxF) maxF = f;
        }
        const absMax = Math.max(Math.abs(minF), Math.abs(maxF), 1) * 1.2;

        const plotW = w - 2 * padding;
        const plotH = h - 2 * padding;
        const stepX = plotW / N;
        const zeroY = padding + plotH / 2;

        // Zero line
        bridgeCtx.strokeStyle = '#aaa';
        bridgeCtx.lineWidth = 1;
        bridgeCtx.setLineDash([6, 4]);
        bridgeCtx.beginPath();
        bridgeCtx.moveTo(padding, zeroY);
        bridgeCtx.lineTo(padding + plotW, zeroY);
        bridgeCtx.stroke();
        bridgeCtx.setLineDash([]);

        // Midpoint vertical line
        const midStep = Math.floor(N / 2);
        const midPx = padding + midStep * stepX;
        bridgeCtx.strokeStyle = '#232D4B';
        bridgeCtx.lineWidth = 1.5;
        bridgeCtx.setLineDash([6, 4]);
        bridgeCtx.beginPath();
        bridgeCtx.moveTo(midPx, padding);
        bridgeCtx.lineTo(midPx, padding + plotH);
        bridgeCtx.stroke();
        bridgeCtx.setLineDash([]);
        // Midpoint label
        bridgeCtx.fillStyle = '#232D4B';
        bridgeCtx.font = '14px sans-serif';
        bridgeCtx.textAlign = 'center';
        bridgeCtx.textBaseline = 'top';
        bridgeCtx.fillText('mid', midPx, padding + plotH + 8);

        // Fluctuation curve
        bridgeCtx.strokeStyle = '#E57200';
        bridgeCtx.lineWidth = 9;
        bridgeCtx.lineCap = 'round';
        bridgeCtx.lineJoin = 'round';
        bridgeCtx.beginPath();
        for (let i = 0; i <= N; i++) {
            const px = padding + i * stepX;
            const py = zeroY - (fluct[i] / absMax) * (plotH / 2);
            if (i === 0) bridgeCtx.moveTo(px, py);
            else bridgeCtx.lineTo(px, py);
        }
        bridgeCtx.stroke();

        // Dots at endpoints
        bridgeCtx.fillStyle = '#232D4B';
        bridgeCtx.beginPath();
        bridgeCtx.arc(padding, zeroY, 5, 0, Math.PI * 2);
        bridgeCtx.fill();
        bridgeCtx.beginPath();
        bridgeCtx.arc(padding + plotW, zeroY, 5, 0, Math.PI * 2);
        bridgeCtx.fill();

        // Labels
        bridgeCtx.fillStyle = '#666';
        bridgeCtx.font = '14px sans-serif';
        bridgeCtx.textAlign = 'left';
        bridgeCtx.textBaseline = 'middle';
        bridgeCtx.fillText('0', padding - 20, zeroY);
        bridgeCtx.textAlign = 'center';
        bridgeCtx.textBaseline = 'top';
        bridgeCtx.fillText('0', padding, h - padding + 8);
        bridgeCtx.fillText(N + '', padding + plotW, h - padding + 8);
    }

    let bridgeMoves = null;

    function drawBridge() {
        if (!bridgeMoves) bridgeMoves = generateRandomPath(BRIDGE_A, BRIDGE_B);
        drawBridgeFromMoves(bridgeMoves, BRIDGE_A, BRIDGE_B);
    }

    // === WASM Parameters (for histogram) ===
    const WASM_N = 210, WASM_M = 120;
    const midX = Math.floor(WASM_N / 2);

    let wasm = null;
    let gpuEngine = null;
    let gpuInitAttempted = false;
    let middleYs = [];
    let wasmIsRunning = false;
    let cachedInitialBits = null;
    let wasmFunctions = {};
    let currentStep = 0;

    // === WASM Initialization ===

    async function initWASM() {
        if (wasm) return true;
        if (typeof QPartitionModule === 'undefined') {
            console.error('fluctuations-gaussian: QPartitionModule not loaded');
            return false;
        }
        wasm = await QPartitionModule();
        wasmFunctions = {
            initSimulation: wasm.cwrap('initSimulation', null, ['number', 'number', 'number']),
            runCFTPBatch: wasm.cwrap('runCFTPBatch', 'number', []),
            getPartitionPath: wasm.cwrap('getPartitionPath', 'number', []),
            freeString: wasm.cwrap('freeString', null, ['number']),
            setPath: wasm.cwrap('setPath', null, ['number', 'number']),
            runGlauberAndGetMiddleY: wasm.cwrap('runGlauberAndGetMiddleY', 'number', ['number'])
        };
        return true;
    }

    async function tryInitGPU() {
        if (gpuInitAttempted) return;
        gpuInitAttempted = true;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (!isMobile && typeof WebGPUQPartitionEngine !== 'undefined' && WebGPUQPartitionEngine.isAvailable()) {
            try {
                const engine = new WebGPUQPartitionEngine();
                await engine.init();
                gpuEngine = engine; // Only expose after init completes
            } catch (e) {
                gpuEngine = null;
            }
        }
    }

    // === Sampling Helpers ===

    function getMiddleY(path) {
        for (let i = 0; i < path.length; i++) {
            if (path[i][0] === midX) return path[i][1];
        }
        for (let i = 0; i < path.length - 1; i++) {
            if (path[i][0] <= midX && path[i + 1][0] > midX) return path[i][1];
        }
        return WASM_M / 2;
    }

    function pathToBits(coordPath) {
        const bits = [];
        for (let i = 1; i < coordPath.length; i++) {
            bits.push(coordPath[i][1] > coordPath[i-1][1] ? 1 : 0);
        }
        return bits;
    }

    async function runCFTP() {
        if (wasmIsRunning || !wasm) return null;
        wasmIsRunning = true;
        wasmFunctions.initSimulation(WASM_N, WASM_M, 1.0);

        return new Promise((resolve) => {
            function step() {
                const done = wasmFunctions.runCFTPBatch();
                if (done === 1) {
                    const ptr = wasmFunctions.getPartitionPath();
                    const str = wasm.UTF8ToString(ptr);
                    wasmFunctions.freeString(ptr);
                    const path = JSON.parse(str);
                    middleYs.push(getMiddleY(path));
                    cachedInitialBits = pathToBits(path);
                    drawHistogram();
                    wasmIsRunning = false;
                    resolve(path);
                } else if (done === -1) {
                    // Timeout — discard this sample
                    wasmIsRunning = false;
                    resolve(null);
                } else {
                    requestAnimationFrame(step);
                }
            }
            step();
        });
    }

    function runGlauberWASM(initialBits, steps) {
        const len = initialBits.length;
        const ptr = wasm._malloc(len * 4);
        for (let i = 0; i < len; i++) {
            wasm.setValue(ptr + i * 4, initialBits[i], 'i32');
        }
        wasmFunctions.setPath(ptr, len);
        wasm._free(ptr);
        return wasmFunctions.runGlauberAndGetMiddleY(steps);
    }

    async function collectSamplesGPU(count) {
        if (!gpuEngine) return collectSamplesCPU(count);
        try {
            if (!cachedInitialBits) {
                await runCFTP();
                if (!cachedInitialBits) return collectSamplesCPU(count);
            }
            const batchSize = 5000;
            let remaining = count;
            while (remaining > 0) {
                const thisBatch = Math.min(batchSize, remaining);
                const gpuPromise = gpuEngine.sample(WASM_N, WASM_M, thisBatch, cachedInitialBits, 1000000);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('GPU timeout')), 10000)
                );
                const gpuMiddleYs = await Promise.race([gpuPromise, timeoutPromise]);
                for (let i = 0; i < gpuMiddleYs.length; i++) middleYs.push(gpuMiddleYs[i]);
                remaining -= thisBatch;
                drawHistogram();
                await new Promise(r => setTimeout(r, 0));
            }
        } catch (e) {
            console.warn('FG: GPU sampling failed, falling back to CPU:', e);
            gpuEngine = null;
            return collectSamplesCPU(count - middleYs.length);
        }
    }

    async function collectSamplesCPU(count) {
        if (!wasm) {
            const ok = await initWASM();
            if (!ok) return;
        }
        if (!cachedInitialBits) {
            await runCFTP();
            if (!cachedInitialBits) return;
        }
        for (let i = 0; i < count; i++) {
            const y = runGlauberWASM(cachedInitialBits, 1000000);
            middleYs.push(y);
            drawHistogram();
            await new Promise(r => setTimeout(r, 0));
        }
    }

    async function collectSamples(count) {
        if (!cachedInitialBits || !wasm) return;
        if (gpuEngine) await collectSamplesGPU(count);
        else await collectSamplesCPU(count);
    }

    // === Drawing: Histogram ===

    function drawHistogram() {
        if (!histCtx) return;
        const padding = { top: 40, right: 40, bottom: 60, left: 70 };
        const w = histCanvas.width - padding.left - padding.right;
        const h = histCanvas.height - padding.top - padding.bottom;

        histCtx.fillStyle = '#fff';
        histCtx.fillRect(0, 0, histCanvas.width, histCanvas.height);

        if (middleYs.length === 0) {
            histCtx.strokeStyle = '#232D4B';
            histCtx.lineWidth = 2;
            histCtx.beginPath();
            histCtx.moveTo(padding.left, padding.top);
            histCtx.lineTo(padding.left, padding.top + h);
            histCtx.lineTo(padding.left + w, padding.top + h);
            histCtx.stroke();
            histCtx.fillStyle = '#232D4B';
            histCtx.font = Math.round(histCanvas.height * 0.035) + 'px sans-serif';
            histCtx.textAlign = 'center';
            histCtx.fillText('y at x=' + midX, padding.left + w / 2, padding.top + h + 30);
            if (histCountEl) histCountEl.textContent = '0';
            return;
        }

        const minY = Math.min(...middleYs);
        const maxY = Math.max(...middleYs);
        const range = Math.max(maxY - minY, 10);
        const binCount = Math.max(10, Math.min(20, Math.ceil(range / 2)));
        const binWidth = range / binCount;
        const bins = new Array(binCount).fill(0);

        for (const y of middleYs) {
            const binIdx = Math.min(binCount - 1, Math.floor((y - minY) / binWidth));
            bins[binIdx]++;
        }
        const maxBin = Math.max(...bins);

        histCtx.strokeStyle = '#232D4B';
        histCtx.lineWidth = 2;
        histCtx.beginPath();
        histCtx.moveTo(padding.left, padding.top);
        histCtx.lineTo(padding.left, padding.top + h);
        histCtx.lineTo(padding.left + w, padding.top + h);
        histCtx.stroke();

        const barW = w / binCount;
        for (let i = 0; i < binCount; i++) {
            const barH = (bins[i] / maxBin) * h * 0.9;
            const x = padding.left + i * barW;
            const y = padding.top + h - barH;
            histCtx.fillStyle = '#E57200';
            histCtx.fillRect(x + 1, y, barW - 2, barH);
            histCtx.strokeStyle = '#232D4B';
            histCtx.lineWidth = 1;
            histCtx.strokeRect(x + 1, y, barW - 2, barH);
        }

        histCtx.fillStyle = '#232D4B';
        histCtx.font = Math.round(histCanvas.height * 0.035) + 'px sans-serif';
        histCtx.textAlign = 'center';
        histCtx.textBaseline = 'top';
        histCtx.fillText(Math.round(minY) + '', padding.left, padding.top + h + 8);
        histCtx.fillText(Math.round(maxY) + '', padding.left + w, padding.top + h + 8);
        histCtx.fillText('y at x=' + midX, padding.left + w / 2, padding.top + h + 30);

        if (histCountEl) histCountEl.textContent = middleYs.length + '';
    }

    // === Reset ===

    function resetAll() {
        currentStep = 0;
        middleYs = [];
        cachedInitialBits = null;
        bridgeMoves = null;

        hideElement('fg-universality');
        hideElement('fg-insight');
        hideElement('fg-bridge-container');
        hideElement('fg-histogram-canvas');
        hideElement('fg-histogram-label');
        if (histCountEl) histCountEl.textContent = '0';

        if (histCtx) {
            histCtx.fillStyle = '#fff';
            histCtx.fillRect(0, 0, histCanvas.width, histCanvas.height);
        }
    }

    // === Step Logic ===

    async function onStep(step) {
        currentStep = step;

        // Each step fully establishes its visual state
        // (slide engine restores steps without awaiting async results)
        if (step >= 1) {
            showElement('fg-histogram-canvas');
            showElement('fg-histogram-label');
        }
        if (step >= 4) {
            showElement('fg-insight');
            showElement('fg-bridge-container');
            drawBridge();
        }
        if (step >= 5) {
            showElement('fg-universality');
        }

        if (step === 1) {
            // Init WASM, collect ~20 samples
            await tryInitGPU();
            const wasmOk = await initWASM();
            if (wasmOk) {
                middleYs = [];
                cachedInitialBits = null;
                drawHistogram();
                await runCFTP();
                await collectSamples(19);
            }
        } else if (step === 2) {
            if (cachedInitialBits) {
                const needed = 1000 - middleYs.length;
                if (needed > 0) await collectSamples(needed);
            }
        } else if (step === 3) {
            if (cachedInitialBits) {
                const needed = 5000 - middleYs.length;
                if (needed > 0) await collectSamples(needed);
            }
        }
    }

    function onStepBack(step) {
        currentStep = step;

        // Hide what shouldn't be visible
        if (step < 5) hideElement('fg-universality');
        if (step < 4) {
            hideElement('fg-insight');
            hideElement('fg-bridge-container');
        }
        if (step < 1) {
            hideElement('fg-histogram-canvas');
            hideElement('fg-histogram-label');
        }

        // Show what should be visible
        if (step >= 4) {
            showElement('fg-insight');
            showElement('fg-bridge-container');
            drawBridge();
        }
        if (step >= 5) {
            showElement('fg-universality');
        }
        if (step >= 1) drawHistogram();
    }

    // === Register ===

    function waitForSlideEngine() {
        if (!window.slideEngine) {
            setTimeout(waitForSlideEngine, 50);
            return;
        }
        window.slideEngine.registerSimulation('fluctuations-gaussian', {
            start() {},
            pause() {},
            steps: 5,
            onStep: onStep,
            onStepBack: onStepBack,
            onSlideEnter() {
                resetAll();
                tryInitGPU(); // fire-and-forget; gpuEngine set only after init completes
            },
            onSlideLeave() { resetAll(); }
        }, 0);
    }
    waitForSlideEngine();
    })();
}

// Initialize when WASM is loaded
if (typeof QPartitionModule !== 'undefined') {
    initFluctuationsGaussianSim();
} else {
    window.addEventListener('wasm-loaded', initFluctuationsGaussianSim, { once: true });
}
