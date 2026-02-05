/**
 * Random Path Gaussian Simulation (merged)
 * Phase 1 (steps 1-6): JS random path with local zoom + Bernoulli
 * Phase 2 (steps 7-10): WASM histogram sampling → Gaussian reveal
 */

function initRandomPathGaussianSim() {
    (function() {
    'use strict';

    // === DOM Elements ===
    const canvas = document.getElementById('rpg-main-canvas');
    const ctx = canvas.getContext('2d');
    const localCanvas = document.getElementById('rpg-local-view-canvas');
    const localCtx = localCanvas.getContext('2d');
    const sizeSpan = document.getElementById('rpg-path-size');
    const localTitle = document.getElementById('rpg-local-view-title');
    const localViewContainer = document.getElementById('rpg-local-view-container');
    const bernoulliEl = document.getElementById('rpg-bernoulli-explanation');
    const globalEl = document.getElementById('rpg-global-observation');

    // Phase 2 elements
    const histContainer = document.getElementById('rpg-histogram-container');
    const histCanvas = document.getElementById('rpg-histogram-canvas');
    const histCtx = histCanvas.getContext('2d');
    const histCountEl = document.getElementById('rpg-histogram-count');
    const answerEl = document.getElementById('rpg-answer');
    const bridgeCanvas = document.getElementById('rpg-bridge-canvas');
    const bridgeCtx = bridgeCanvas.getContext('2d');

    // === Phase 1: JS Random Path ===
    const A = 100, B = 60;
    let currentPath = null;
    let highlightLen = 16;
    let highlightStart = Math.floor((A + B) / 2 - highlightLen / 2);

    function generateRandomPath(a, b) {
        const moves = [];
        let remainingR = a;
        let remainingU = b;
        while (remainingR + remainingU > 0) {
            if (remainingR === 0) {
                moves.push('U');
                remainingU--;
            } else if (remainingU === 0) {
                moves.push('R');
                remainingR--;
            } else {
                if (Math.random() < remainingR / (remainingR + remainingU)) {
                    moves.push('R');
                    remainingR--;
                } else {
                    moves.push('U');
                    remainingU--;
                }
            }
        }
        return moves;
    }

    function drawMainPath(showHighlight = false, showMidline = false) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        if (!currentPath) {
            currentPath = generateRandomPath(A, B);
        }

        const padding = 50;
        const gridW = w - 2 * padding;
        const gridH = h - 2 * padding;
        const stepX = gridW / A;
        const stepY = gridH / B;
        const baseX = padding;
        const baseY = padding;

        // Bounding box
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.strokeRect(baseX, baseY, gridW, gridH);

        // Diagonal (limit shape)
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(baseX, baseY + gridH);
        ctx.lineTo(baseX + gridW, baseY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint vertical line (phase 2)
        if (showMidline) {
            const midX = Math.floor(A / 2);
            const midCanvasX = baseX + midX * stepX;
            ctx.strokeStyle = 'rgba(35, 45, 75, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(midCanvasX, baseY);
            ctx.lineTo(midCanvasX, baseY + gridH);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw path
        ctx.strokeStyle = '#E57200';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        let x = 0, y = 0;
        ctx.moveTo(baseX + x * stepX, baseY + gridH - y * stepY);
        for (const move of currentPath) {
            if (move === 'R') x++;
            else y++;
            ctx.lineTo(baseX + x * stepX, baseY + gridH - y * stepY);
        }
        ctx.stroke();

        // Highlighted region
        if (showHighlight) {
            let hx = 0, hy = 0;
            for (let i = 0; i < highlightStart; i++) {
                if (currentPath[i] === 'R') hx++;
                else hy++;
            }
            const startX = hx, startY = hy;
            for (let i = highlightStart; i < highlightStart + highlightLen && i < currentPath.length; i++) {
                if (currentPath[i] === 'R') hx++;
                else hy++;
            }
            const endX = hx, endY = hy;

            const boxPad = 8;
            const boxX1 = baseX + startX * stepX - boxPad;
            const boxY1 = baseY + gridH - endY * stepY - boxPad;
            const boxX2 = baseX + endX * stepX + boxPad;
            const boxY2 = baseY + gridH - startY * stepY + boxPad;

            ctx.strokeStyle = '#E57200';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.strokeRect(boxX1, boxY1, boxX2 - boxX1, boxY2 - boxY1);

            ctx.strokeStyle = '#E57200';
            ctx.lineWidth = 8;
            ctx.beginPath();
            let sx = 0, sy = 0;
            for (let i = 0; i < highlightStart; i++) {
                if (currentPath[i] === 'R') sx++;
                else sy++;
            }
            ctx.moveTo(baseX + sx * stepX, baseY + gridH - sy * stepY);
            for (let i = highlightStart; i < highlightStart + highlightLen && i < currentPath.length; i++) {
                if (currentPath[i] === 'R') sx++;
                else sy++;
                ctx.lineTo(baseX + sx * stepX, baseY + gridH - sy * stepY);
            }
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#232D4B';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('(0,0)', baseX, baseY + gridH + 5);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`(${A},${B})`, baseX + gridW, baseY - 5);
    }

    function drawLocalView() {
        const w = localCanvas.width, h = localCanvas.height;
        localCtx.fillStyle = '#fff';
        localCtx.fillRect(0, 0, w, h);

        if (!currentPath) return;

        const segment = currentPath.slice(highlightStart, highlightStart + highlightLen);
        const segLen = segment.length;
        if (segLen === 0) return;

        const padding = 80;
        const availW = w - 2 * padding;
        const availH = h - 2 * padding - 50;

        let segR = 0, segU = 0;
        for (const m of segment) {
            if (m === 'R') segR++;
            else segU++;
        }
        if (segR === 0) segR = 1;
        if (segU === 0) segU = 1;

        const step = Math.min(availW / segR, availH / segU);
        const gridW = segR * step;
        const gridH = segU * step;
        const baseX = padding + (availW - gridW) / 2;
        const baseY = padding + availH - (availH - gridH) / 2;

        // Grid
        localCtx.strokeStyle = '#ddd';
        localCtx.lineWidth = 1;
        for (let i = 0; i <= segR; i++) {
            localCtx.beginPath();
            localCtx.moveTo(baseX + i * step, baseY - gridH);
            localCtx.lineTo(baseX + i * step, baseY);
            localCtx.stroke();
        }
        for (let j = 0; j <= segU; j++) {
            localCtx.beginPath();
            localCtx.moveTo(baseX, baseY - j * step);
            localCtx.lineTo(baseX + gridW, baseY - j * step);
            localCtx.stroke();
        }

        // Path segments
        let x = 0, y = 0;
        for (let i = 0; i < segment.length; i++) {
            const move = segment[i];
            const fromPx = baseX + x * step;
            const fromPy = baseY - y * step;

            if (move === 'R') {
                localCtx.strokeStyle = '#E57200';
                localCtx.lineWidth = 6;
                localCtx.beginPath();
                localCtx.moveTo(fromPx, fromPy);
                localCtx.lineTo(fromPx + step, fromPy);
                localCtx.stroke();
                x++;
            } else {
                localCtx.strokeStyle = '#232D4B';
                localCtx.lineWidth = 6;
                localCtx.beginPath();
                localCtx.moveTo(fromPx, fromPy);
                localCtx.lineTo(fromPx, fromPy - step);
                localCtx.stroke();
                y++;
            }
        }

        // Dots at vertices
        localCtx.fillStyle = '#232D4B';
        x = 0; y = 0;
        localCtx.beginPath();
        localCtx.arc(baseX, baseY, 5, 0, Math.PI * 2);
        localCtx.fill();
        for (const move of segment) {
            if (move === 'R') x++;
            else y++;
            localCtx.beginPath();
            localCtx.arc(baseX + x * step, baseY - y * step, 5, 0, Math.PI * 2);
            localCtx.fill();
        }

        // Annotation
        localCtx.fillStyle = '#666';
        const localFontSize = Math.round(window.innerHeight * 0.025);
        localCtx.font = `${localFontSize}px sans-serif`;
        localCtx.textAlign = 'center';
        localCtx.textBaseline = 'top';
        localCtx.fillText('Each step: independent Bernoulli trial', w / 2, baseY + 20);
    }

    function resample() {
        currentPath = generateRandomPath(A, B);
    }

    // Click to resample
    canvas.addEventListener('click', () => {
        resample();
        drawPhase1();
        if (currentStep >= 12) {
            drawBrownianBridge();
        }
    });

    // === Phase 2: WASM Histogram Sampling ===
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

    async function initWASM() {
        if (wasm) return true;
        if (typeof QPartitionModule === 'undefined') {
            console.error('QPartitionModule not loaded');
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
                console.log('RPG: WebGPU engine ready');
            } catch (e) {
                console.warn('RPG: WebGPU init failed, CPU fallback:', e);
                gpuEngine = null;
            }
        }
    }

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
            console.error('GPU sampling failed, falling back to CPU:', e);
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

    function drawHistogram() {
        const padding = { top: 40, right: 40, bottom: 60, left: 70 };
        const w = histCanvas.width - padding.left - padding.right;
        const h = histCanvas.height - padding.top - padding.bottom;

        histCtx.fillStyle = '#fff';
        histCtx.fillRect(0, 0, histCanvas.width, histCanvas.height);

        if (middleYs.length === 0) return;

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
        histCtx.font = `${Math.round(histCanvas.height * 0.03)}px sans-serif`;
        histCtx.textAlign = 'center';
        histCtx.textBaseline = 'top';
        histCtx.fillText(`${Math.round(minY)}`, padding.left, padding.top + h + 8);
        histCtx.fillText(`${Math.round(maxY)}`, padding.left + w, padding.top + h + 8);
        histCtx.fillText(`y at x=${midX}`, padding.left + w / 2, padding.top + h + 30);

        // Y-axis label
        histCtx.save();
        histCtx.translate(20, padding.top + h / 2);
        histCtx.rotate(-Math.PI / 2);
        histCtx.textAlign = 'center';
        histCtx.fillText('frequency', 0, 0);
        histCtx.restore();

        histCountEl.textContent = middleYs.length;
    }

    function drawBrownianBridge() {
        if (!currentPath) return;

        // Use the JS path displayed on the main canvas
        const pathCoords = [[0, 0]];
        let x = 0, y = 0;
        for (const move of currentPath) {
            if (move === 'R') x++; else y++;
            pathCoords.push([x, y]);
        }

        const w = bridgeCanvas.width, h = bridgeCanvas.height;
        const padding = 20;
        bridgeCtx.fillStyle = '#fff';
        bridgeCtx.fillRect(0, 0, w, h);

        const diffs = [];
        for (let i = 0; i < pathCoords.length; i++) {
            const px = pathCoords[i][0];
            const py = pathCoords[i][1];
            diffs.push(py - (B / A) * px);
        }

        const maxDiff = Math.max(...diffs.map(Math.abs), 5);
        const scaleX = (w - 2 * padding) / A;
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
        bridgeCtx.lineWidth = 4;
        bridgeCtx.beginPath();
        for (let i = 0; i < pathCoords.length; i++) {
            const px = padding + pathCoords[i][0] * scaleX;
            const py = h / 2 - diffs[i] * scaleY;
            if (i === 0) bridgeCtx.moveTo(px, py);
            else bridgeCtx.lineTo(px, py);
        }
        bridgeCtx.stroke();

        bridgeCtx.fillStyle = '#232D4B';
        bridgeCtx.font = `${Math.round(h * 0.18)}px sans-serif`;
        bridgeCtx.textAlign = 'center';
        bridgeCtx.fillText('path minus diagonal', w / 2, h - Math.round(h * 0.05));
    }

    // === Drawing Helpers ===
    let currentStep = 0;

    function drawPhase1() {
        const showHighlight = currentStep >= 3 && currentStep <= 6;
        const showMidline = currentStep >= 7;
        drawMainPath(showHighlight, showMidline);
        if (currentStep >= 3 && currentStep <= 6) {
            drawLocalView();
        }
    }

    // === Reset ===
    function resetAll() {
        currentStep = 0;
        currentPath = null;

        // Phase 1 elements
        localCanvas.style.opacity = '0';
        localTitle.style.opacity = '0';
        bernoulliEl.style.opacity = '0';
        globalEl.style.opacity = '0';

        // Phase 2 elements
        localViewContainer.style.display = '';
        histContainer.style.display = 'none';

        answerEl.style.opacity = '0';

        // Phase 2 state
        wasmSamples = [];
        middleYs = [];
        cachedInitialBits = null;
        histCountEl.textContent = '0';

        resample();
        drawMainPath(false, false);
    }

    // === Step Logic ===
    // Steps 1-2: resample, 3: zoom, 4-5: resample+zoom, 6: Bernoulli,
    // 7: LLN + histogram + WASM sampling, 8-10: accumulate 1K/3K/5K,
    // 11: answer+bridge, 12: resample

    async function onStep(step) {
        currentStep = step;

        if (step === 1 || step === 2) {
            resample();
            drawMainPath(false);
        } else if (step === 3) {
            resample();
            localCanvas.style.opacity = '1';
            localTitle.style.opacity = '1';
            drawPhase1();
        } else if (step === 4 || step === 5) {
            resample();
            drawPhase1();
        } else if (step === 6) {
            bernoulliEl.style.opacity = '1';
            drawPhase1();
        } else if (step === 7) {
            // Transition to phase 2
            globalEl.style.opacity = '1';
            localCanvas.style.opacity = '0';
            localTitle.style.opacity = '0';
            localViewContainer.style.display = 'none';
            histContainer.style.display = 'flex';
            drawMainPath(false, true);

            // Init WASM + GPU, then start sampling
            await tryInitGPU();
            const wasmOk = await initWASM();
            if (wasmOk) {
                wasmSamples = [];
                middleYs = [];
                cachedInitialBits = null;
                await runCFTP();
                await collectSamples(19);
            }
        } else if (step >= 8 && step <= 10) {
            // Accumulate to target: 1K, 3K, 5K
            const targets = [1000, 3000, 5000];
            const target = targets[step - 8];
            const needed = target - middleYs.length;
            if (needed > 0) {
                await collectSamples(needed);
            }
        } else if (step === 11) {
            answerEl.style.opacity = '1';
            drawBrownianBridge();
        } else if (step === 12) {
            resample();
            drawMainPath(false, true);
            drawBrownianBridge();
        }
    }

    function onStepBack(step) {
        currentStep = step;

        // Always hide elements beyond current step
        if (step < 11) answerEl.style.opacity = '0';
        if (step < 7) {
            globalEl.style.opacity = '0';
    
            histContainer.style.display = 'none';
            localViewContainer.style.display = '';
            // Reset WASM state
            wasmSamples = [];
            middleYs = [];
            cachedInitialBits = null;
            histCountEl.textContent = '0';
        }
        if (step < 6) bernoulliEl.style.opacity = '0';
        if (step < 3) {
            localCanvas.style.opacity = '0';
            localTitle.style.opacity = '0';
        }

        // Redraw for current step
        if (step <= 2) {
            resample();
            drawMainPath(false);
        } else if (step <= 5) {
            resample();
            drawPhase1();
        } else if (step === 6) {
            drawPhase1();
        } else if (step >= 7) {
            drawMainPath(false, true);
            drawHistogram();
        }
    }

    // === Register ===
    function waitForSlideEngine() {
        if (!window.slideEngine) {
            setTimeout(waitForSlideEngine, 50);
            return;
        }
        window.slideEngine.registerSimulation('random-path-gaussian', {
            start() {},
            pause() {},
            steps: 12,
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
    initRandomPathGaussianSim();
} else {
    window.addEventListener('wasm-loaded', initRandomPathGaussianSim, { once: true });
}
