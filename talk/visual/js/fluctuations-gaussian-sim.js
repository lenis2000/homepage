/**
 * Fluctuations Gaussian Simulation
 * Samples lattice paths via WASM CFTP, measures middle-y values,
 * builds histogram that converges to Gaussian, then reveals Brownian bridge.
 *
 * Steps:
 *   0: Reset, show empty histogram
 *   1: Run CFTP + collect ~20 samples, histogram forming
 *   2: Collect 1000 samples (GPU if available), clearly Gaussian
 *   3: Collect to 5000 samples
 *   4: Show fg-insight (Brownian bridge explanation) + draw bridge canvas
 */

function initFluctuationsGaussianSim() {
    (function() {
    'use strict';

    // === DOM Elements ===
    const histCanvas = document.getElementById('fg-histogram-canvas');
    const bridgeCanvas = document.getElementById('fg-bridge-canvas');
    const histCountEl = document.getElementById('fg-histogram-count');
    if (!histCanvas) return;

    const histCtx = histCanvas.getContext('2d');
    const bridgeCtx = bridgeCanvas ? bridgeCanvas.getContext('2d') : null;

    function showElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hideElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    // === WASM Parameters ===
    const WASM_N = 210, WASM_M = 120;
    const midX = Math.floor(WASM_N / 2);

    let wasm = null;
    let gpuEngine = null;
    let gpuInitAttempted = false;
    let wasmSamples = [];
    let middleYs = [];
    let wasmIsRunning = false;
    let cachedInitialBits = null;
    let wasmFunctions = {};
    let currentStep = 0;
    // Store the last CFTP-sampled path for Brownian bridge drawing
    let lastSampledPath = null;

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
                gpuEngine = new WebGPUQPartitionEngine();
                await gpuEngine.init();
                console.log('FG: WebGPU engine ready');
            } catch (e) {
                console.warn('FG: WebGPU init failed, CPU fallback:', e);
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
                if (done) {
                    const ptr = wasmFunctions.getPartitionPath();
                    const str = wasm.UTF8ToString(ptr);
                    wasmFunctions.freeString(ptr);
                    const path = JSON.parse(str);
                    wasmSamples.push(path);
                    middleYs.push(getMiddleY(path));
                    cachedInitialBits = pathToBits(path);
                    lastSampledPath = path;

                    drawHistogram();
                    wasmIsRunning = false;
                    resolve(path);
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
            const initialBits = cachedInitialBits;
            const batchSize = 5000;
            let remaining = count;
            while (remaining > 0) {
                const thisBatch = Math.min(batchSize, remaining);
                const gpuPromise = gpuEngine.sample(WASM_N, WASM_M, thisBatch, initialBits, 1000000);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('GPU timeout')), 10000)
                );
                const gpuMiddleYs = await Promise.race([gpuPromise, timeoutPromise]);
                for (let i = 0; i < gpuMiddleYs.length; i++) {
                    middleYs.push(gpuMiddleYs[i]);
                }
                remaining -= thisBatch;
                drawHistogram();
                await new Promise(r => setTimeout(r, 0));
            }
            drawHistogram();
        } catch (e) {
            console.error('FG: GPU sampling failed, falling back to CPU:', e);
            gpuEngine = null;
            return collectSamplesCPU(count);
        }
    }

    async function collectSamplesCPU(count) {
        if (!cachedInitialBits) {
            await runCFTP();
            if (!cachedInitialBits) return;
        }
        const initialBits = cachedInitialBits;
        const stepsPerSample = 1000000;
        for (let i = 0; i < count; i++) {
            const y = runGlauberWASM(initialBits, stepsPerSample);
            middleYs.push(y);
            drawHistogram();
            await new Promise(r => setTimeout(r, 0));
        }
        drawHistogram();
    }

    async function collectSamples(count) {
        if (gpuEngine) {
            await collectSamplesGPU(count);
        } else {
            await collectSamplesCPU(count);
        }
    }

    // === Drawing: Histogram ===

    function drawHistogram() {
        const padding = { top: 40, right: 40, bottom: 60, left: 70 };
        const w = histCanvas.width - padding.left - padding.right;
        const h = histCanvas.height - padding.top - padding.bottom;

        histCtx.fillStyle = '#fff';
        histCtx.fillRect(0, 0, histCanvas.width, histCanvas.height);

        if (middleYs.length === 0) {
            // Draw empty axes
            histCtx.strokeStyle = '#232D4B';
            histCtx.lineWidth = 2;
            histCtx.beginPath();
            histCtx.moveTo(padding.left, padding.top);
            histCtx.lineTo(padding.left, padding.top + h);
            histCtx.lineTo(padding.left + w, padding.top + h);
            histCtx.stroke();

            histCtx.fillStyle = '#232D4B';
            histCtx.font = Math.round(histCanvas.height * 0.03) + 'px sans-serif';
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

        // Axes
        histCtx.strokeStyle = '#232D4B';
        histCtx.lineWidth = 2;
        histCtx.beginPath();
        histCtx.moveTo(padding.left, padding.top);
        histCtx.lineTo(padding.left, padding.top + h);
        histCtx.lineTo(padding.left + w, padding.top + h);
        histCtx.stroke();

        // Bars
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

        // X-axis labels
        histCtx.fillStyle = '#232D4B';
        histCtx.font = Math.round(histCanvas.height * 0.03) + 'px sans-serif';
        histCtx.textAlign = 'center';
        histCtx.textBaseline = 'top';
        histCtx.fillText(Math.round(minY) + '', padding.left, padding.top + h + 8);
        histCtx.fillText(Math.round(maxY) + '', padding.left + w, padding.top + h + 8);
        histCtx.fillText('y at x=' + midX, padding.left + w / 2, padding.top + h + 30);

        // Y-axis label
        histCtx.save();
        histCtx.translate(20, padding.top + h / 2);
        histCtx.rotate(-Math.PI / 2);
        histCtx.textAlign = 'center';
        histCtx.fillText('frequency', 0, 0);
        histCtx.restore();

        if (histCountEl) histCountEl.textContent = middleYs.length + '';
    }

    // === Drawing: Brownian Bridge ===

    function drawBrownianBridge() {
        if (!bridgeCtx || !bridgeCanvas) return;
        if (!lastSampledPath || lastSampledPath.length === 0) return;

        const path = lastSampledPath;
        const w = bridgeCanvas.width, h = bridgeCanvas.height;
        const padding = 20;

        bridgeCtx.fillStyle = '#fff';
        bridgeCtx.fillRect(0, 0, w, h);

        // Compute path-minus-diagonal
        const totalX = path[path.length - 1][0];
        const totalY = path[path.length - 1][1];
        const slope = totalY / totalX;

        const diffs = [];
        for (let i = 0; i < path.length; i++) {
            const px = path[i][0];
            const py = path[i][1];
            diffs.push(py - slope * px);
        }

        const maxDiff = Math.max(...diffs.map(Math.abs), 5);
        const scaleX = (w - 2 * padding) / totalX;
        const scaleY = (h - 2 * padding) / (2 * maxDiff);

        // Zero line
        bridgeCtx.strokeStyle = '#ccc';
        bridgeCtx.lineWidth = 1;
        bridgeCtx.beginPath();
        bridgeCtx.moveTo(padding, h / 2);
        bridgeCtx.lineTo(w - padding, h / 2);
        bridgeCtx.stroke();

        // Difference curve
        bridgeCtx.strokeStyle = '#E57200';
        bridgeCtx.lineWidth = 3;
        bridgeCtx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const px = padding + path[i][0] * scaleX;
            const py = h / 2 - diffs[i] * scaleY;
            if (i === 0) bridgeCtx.moveTo(px, py);
            else bridgeCtx.lineTo(px, py);
        }
        bridgeCtx.stroke();

        bridgeCtx.fillStyle = '#232D4B';
        bridgeCtx.font = Math.round(h * 0.15) + 'px sans-serif';
        bridgeCtx.textAlign = 'center';
        bridgeCtx.fillText('path minus diagonal', w / 2, h - Math.round(h * 0.05));
    }

    // === Reset ===

    function resetAll() {
        currentStep = 0;
        wasmSamples = [];
        middleYs = [];
        cachedInitialBits = null;
        lastSampledPath = null;

        hideElement('fg-insight');

        if (histCountEl) histCountEl.textContent = '0';
        drawHistogram();

        if (bridgeCtx && bridgeCanvas) {
            bridgeCtx.fillStyle = '#fff';
            bridgeCtx.fillRect(0, 0, bridgeCanvas.width, bridgeCanvas.height);
        }
    }

    // === Step Logic ===

    async function onStep(step) {
        currentStep = step;

        if (step === 1) {
            // Init WASM + GPU, run CFTP + collect ~20 samples
            await tryInitGPU();
            const wasmOk = await initWASM();
            if (wasmOk) {
                wasmSamples = [];
                middleYs = [];
                cachedInitialBits = null;
                await runCFTP();
                await collectSamples(19);
            }
        } else if (step === 2) {
            // Accumulate to 1000
            const needed = 1000 - middleYs.length;
            if (needed > 0) {
                await collectSamples(needed);
            }
        } else if (step === 3) {
            // Accumulate to 5000
            const needed = 5000 - middleYs.length;
            if (needed > 0) {
                await collectSamples(needed);
            }
        } else if (step === 4) {
            // Show Brownian bridge insight
            showElement('fg-insight');
            drawBrownianBridge();
        }
    }

    function onStepBack(step) {
        currentStep = step;

        if (step < 4) {
            hideElement('fg-insight');
        }

        // Redraw histogram for current state
        if (step >= 1) {
            drawHistogram();
        }

        if (step === 0) {
            // Back to initial: keep samples but show current histogram
            drawHistogram();
        }
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
            steps: 4,
            onStep: onStep,
            onStepBack: onStepBack,
            async onSlideEnter() {
                await tryInitGPU();
                resetAll();
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
