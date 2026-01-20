/**
 * Limit Shape 2D Simulation
 * CFTP and Glauber sampling for uniform lattice paths with histogram
 */

// Wait for WASM to load, then initialize
function initLimitShape2DSim() {
    (async function() {
        'use strict';

        // Wait for QPartitionModule to be available
        if (typeof QPartitionModule === 'undefined') {
            console.error('QPartitionModule not loaded');
            return;
        }

    // Detect mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Initialize GPU engine if WebGPU available (skip on mobile)
    let gpuEngine = null;
    if (!isMobile && typeof WebGPUQPartitionEngine !== 'undefined' && WebGPUQPartitionEngine.isAvailable()) {
        try {
            gpuEngine = new WebGPUQPartitionEngine();
            await gpuEngine.init();
            console.log('WebGPU engine ready');
        } catch (e) {
            console.warn('WebGPU init failed, using CPU fallback:', e);
            gpuEngine = null;
        }
    } else {
        console.log(isMobile ? 'Mobile: simple mode' : 'WebGPU not available, using CPU');
    }

    // Path canvas (left)
    const canvas = document.getElementById('limit-shape-canvas');
    const ctx = canvas.getContext('2d');

    // Histogram canvas (right)
    const histCanvas = document.getElementById('histogram-canvas');
    const histCtx = histCanvas.getContext('2d');
    const histContainer = document.getElementById('histogram-container');
    const histCountEl = document.getElementById('histogram-count');
    const histStats = document.getElementById('histogram-stats');
    const histPlaceholder = document.getElementById('histogram-mobile-placeholder');

    // On mobile: hide canvas, show placeholder
    if (isMobile) {
        histCanvas.style.display = 'none';
        histStats.style.display = 'none';
        histPlaceholder.style.display = 'flex';
    }

    // Other elements
    const statusEl = document.getElementById('limit-shape-status');
    const formulaEl = document.getElementById('limit-shape-formula');
    const observationEl = document.getElementById('limit-shape-observation');
    const questionEl = document.getElementById('limit-shape-question');
    const answerEl = document.getElementById('limit-shape-answer');
    const bridgeCanvas = document.getElementById('brownian-bridge-canvas');
    const bridgeCtx = bridgeCanvas.getContext('2d');

    // Fixed size: 210 x 120 (matching previous slide)
    const N = 210;
    const M = 120;
    const midX = Math.floor(N / 2);  // x = 105, expected y ≈ 60

    // Create isolated WASM instance
    const wasm = await QPartitionModule();
    const initSimulation = wasm.cwrap('initSimulation', null, ['number', 'number', 'number']);
    const runCFTPBatch = wasm.cwrap('runCFTPBatch', 'number', []);
    const getPartitionPath = wasm.cwrap('getPartitionPath', 'number', []);
    const freeString = wasm.cwrap('freeString', null, ['number']);

    let samples = [];      // Store full paths for overlay
    let middleYs = [];     // Store y-values at x = N/2 for histogram
    let isRunning = false;
    let cachedInitialBits = null;  // Cache the initial path bits after first CFTP

    function updateFormula() {
        const count = middleYs.length;  // Use histogram sample count
        if (count === 0) {
            formulaEl.innerHTML = `\\(a = ${N},\\; b = ${M}\\)`;
        } else if (count === 1) {
            formulaEl.innerHTML = `\\(a = ${N},\\; b = ${M}\\) — <strong style="color: var(--slide-accent);">1 sample</strong>`;
        } else {
            formulaEl.innerHTML = `\\(a = ${N},\\; b = ${M}\\) — <strong style="color: var(--slide-accent);">${count} samples</strong>`;
        }
        if (window.renderMathInElement) {
            renderMathInElement(formulaEl, {
                delimiters: [
                    {left: "\\(", right: "\\)", display: false},
                    {left: "$$", right: "$$", display: true}
                ]
            });
        }
    }

    function drawPathCanvas() {
        const padding = 60;
        const gridW = canvas.width - 2 * padding;
        const gridH = canvas.height - 2 * padding;
        const scaleX = gridW / N;
        const scaleY = gridH / M;
        const baseX = padding;
        const baseY = padding;

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw bounding box
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.strokeRect(baseX, baseY, gridW, gridH);

        // Draw grid dots at corners only
        ctx.fillStyle = '#232D4B';
        const dotRadius = 6;
        ctx.beginPath();
        ctx.arc(baseX, baseY + gridH, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(baseX + gridW, baseY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw diagonal (limit shape) - dashed dark blue line
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.moveTo(baseX, baseY + gridH);
        ctx.lineTo(baseX + gridW, baseY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw vertical line at x = N/2 (where we measure y)
        if (middleYs.length > 0) {
            const midCanvasX = baseX + midX * scaleX;
            ctx.strokeStyle = 'rgba(35, 45, 75, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(midCanvasX, baseY);
            ctx.lineTo(midCanvasX, baseY + gridH);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw all stored samples (oldest faded, newest bold)
        for (let i = 0; i < samples.length; i++) {
            const path = samples[i];
            const isLast = (i === samples.length - 1);
            ctx.strokeStyle = isLast ? '#E57200' : 'rgba(229, 114, 0, 0.25)';
            ctx.lineWidth = isLast ? 4 : 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let j = 0; j < path.length; j++) {
                const [x, y] = path[j];
                const canvasX = baseX + x * scaleX;
                const canvasY = baseY + gridH - y * scaleY;
                if (j === 0) ctx.moveTo(canvasX, canvasY);
                else ctx.lineTo(canvasX, canvasY);
            }
            ctx.stroke();
        }

        // Coordinate labels
        ctx.fillStyle = '#232D4B';
        ctx.font = `bold ${Math.round(canvas.height * 0.022)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('(0, 0)', baseX, baseY + gridH + Math.round(canvas.height * 0.01));
        ctx.textBaseline = 'bottom';
        ctx.fillText(`(${N}, ${M})`, baseX + gridW, baseY - Math.round(canvas.height * 0.01));
    }

    function drawHistogram() {
        const padding = { top: 40, right: 40, bottom: 60, left: 70 };
        const w = histCanvas.width - padding.left - padding.right;
        const h = histCanvas.height - padding.top - padding.bottom;

        histCtx.fillStyle = '#fff';
        histCtx.fillRect(0, 0, histCanvas.width, histCanvas.height);

        if (middleYs.length === 0) return;

        // Compute histogram bins - use fixed bin width of 2 for smooth Gaussian look
        const minY = Math.min(...middleYs);
        const maxY = Math.max(...middleYs);
        const range = Math.max(maxY - minY, 10);
        const binCount = Math.max(10, Math.min(20, Math.ceil(range / 2)));  // ~2 units per bin
        const binWidth = range / binCount;
        const bins = new Array(binCount).fill(0);

        for (const y of middleYs) {
            const binIdx = Math.min(binCount - 1, Math.floor((y - minY) / binWidth));
            bins[binIdx]++;
        }
        const maxBin = Math.max(...bins);

        // Draw axes
        histCtx.strokeStyle = '#232D4B';
        histCtx.lineWidth = 2;
        histCtx.beginPath();
        histCtx.moveTo(padding.left, padding.top);
        histCtx.lineTo(padding.left, padding.top + h);
        histCtx.lineTo(padding.left + w, padding.top + h);
        histCtx.stroke();

        // Draw bars
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
        histCtx.font = `${Math.round(histCanvas.height * 0.026)}px sans-serif`;
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

        // Update sample count
        histCountEl.textContent = middleYs.length;
    }

    // Extract y-value at x = N/2 from a path
    function getMiddleY(path) {
        // Path is array of [x, y] pairs, find the one where x = midX
        for (let i = 0; i < path.length; i++) {
            if (path[i][0] === midX) {
                return path[i][1];
            }
        }
        // Fallback: interpolate
        for (let i = 0; i < path.length - 1; i++) {
            if (path[i][0] <= midX && path[i + 1][0] > midX) {
                return path[i][1];
            }
        }
        return M / 2;
    }

    async function runCFTP() {
        if (isRunning) return null;
        isRunning = true;

        initSimulation(N, M, 1.0);  // q=1 for uniform
        statusEl.textContent = 'Sampling...';
        statusEl.style.color = '#E57200';

        return new Promise((resolve) => {
            function step() {
                const done = runCFTPBatch();

                if (done) {
                    const ptr = getPartitionPath();
                    const str = wasm.UTF8ToString(ptr);
                    freeString(ptr);
                    const path = JSON.parse(str);
                    samples.push(path);
                    middleYs.push(getMiddleY(path));
                    // Cache the bits for future Glauber sampling
                    cachedInitialBits = pathToBits(path);
                    statusEl.textContent = `${samples.length} sample${samples.length > 1 ? 's' : ''}`;
                    statusEl.style.color = 'var(--slide-muted)';
                    updateFormula();
                    drawPathCanvas();
                    isRunning = false;
                    resolve(path);
                } else {
                    requestAnimationFrame(step);
                }
            }
            step();
        });
    }

    // Convert coordinate path [[x,y], ...] to bit array (0=right, 1=up)
    function pathToBits(coordPath) {
        const bits = [];
        for (let i = 1; i < coordPath.length; i++) {
            const dx = coordPath[i][0] - coordPath[i-1][0];
            const dy = coordPath[i][1] - coordPath[i-1][1];
            bits.push(dy > 0 ? 1 : 0);  // 1 = up, 0 = right
        }
        return bits;
    }

    async function collectSamplesGPU(count) {
        if (!gpuEngine) return collectSamplesCPU(count);

        try {
            // Use cached bits, or run CFTP if needed
            if (!cachedInitialBits) {
                statusEl.textContent = 'Getting initial sample...';
                statusEl.style.color = '#E57200';
                const initialPath = await runCFTP();
                if (!initialPath) return collectSamplesCPU(count);
            }

            const initialBits = cachedInitialBits;

            // Run GPU Glauber chains in batches of 5k (20k = 4 batches)
            const batchSize = 5000;
            let remaining = count;
            while (remaining > 0) {
                const thisBatch = Math.min(batchSize, remaining);
                statusEl.textContent = `GPU: ${middleYs.length}/${count + middleYs.length - remaining} samples...`;

                // Add timeout for GPU operations (10 seconds)
                const gpuPromise = gpuEngine.sample(N, M, thisBatch, initialBits, 1000000);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('GPU timeout')), 10000)
                );

                const gpuMiddleYs = await Promise.race([gpuPromise, timeoutPromise]);

                for (let i = 0; i < gpuMiddleYs.length; i++) {
                    middleYs.push(gpuMiddleYs[i]);
                }

                remaining -= thisBatch;
                drawHistogram();
                await new Promise(r => setTimeout(r, 0));  // Yield to UI
            }

            statusEl.textContent = `${middleYs.length} samples (GPU)`;
            statusEl.style.color = 'var(--slide-muted)';
            updateFormula();
            drawPathCanvas();
            drawHistogram();
        } catch (e) {
            console.error('GPU sampling failed, falling back to CPU:', e);
            gpuEngine = null;  // Disable GPU for future calls
            return collectSamplesCPU(count);
        }
    }

    // WASM Glauber wrappers
    const setPath = wasm.cwrap('setPath', null, ['number', 'number']);
    const runGlauberAndGetMiddleY = wasm.cwrap('runGlauberAndGetMiddleY', 'number', ['number']);

    function runGlauberWASM(initialBits, steps) {
        // Copy bits to WASM memory
        const len = initialBits.length;
        const ptr = wasm._malloc(len * 4);  // int array
        for (let i = 0; i < len; i++) {
            wasm.setValue(ptr + i * 4, initialBits[i], 'i32');
        }
        setPath(ptr, len);
        wasm._free(ptr);

        // Run Glauber and get result
        return runGlauberAndGetMiddleY(steps);
    }

    async function collectSamplesCPU(count) {
        // Use cached bits, or run CFTP if needed
        if (!cachedInitialBits) {
            statusEl.textContent = 'Getting initial sample...';
            statusEl.style.color = '#E57200';
            const initialPath = await runCFTP();
            if (!initialPath) return;
        }

        const initialBits = cachedInitialBits;
        const stepsPerSample = 1000000;  // 1M steps per sample

        for (let i = 0; i < count; i++) {
            const y = runGlauberWASM(initialBits, stepsPerSample);
            middleYs.push(y);
            statusEl.textContent = `${middleYs.length} samples (CPU)`;
            drawHistogram();
            await new Promise(r => setTimeout(r, 0));  // Yield to UI after each sample
        }
        statusEl.textContent = `${middleYs.length} samples`;
        statusEl.style.color = 'var(--slide-muted)';
        updateFormula();
        drawHistogram();
    }

    async function collectSamples(count) {
        if (gpuEngine) {
            await collectSamplesGPU(count);
        } else {
            await collectSamplesCPU(count);
        }
    }

    // Draw the difference between path and diagonal (Brownian bridge visualization)
    function drawBrownianBridge() {
        if (samples.length === 0) return;

        const path = samples[samples.length - 1];  // Use last sample
        const w = bridgeCanvas.width;
        const h = bridgeCanvas.height;
        const padding = 20;

        bridgeCtx.fillStyle = '#fff';
        bridgeCtx.fillRect(0, 0, w, h);

        // Compute differences: y - (M/N)*x at each point
        const diffs = [];
        for (let i = 0; i < path.length; i++) {
            const x = path[i][0];
            const y = path[i][1];
            const expectedY = (M / N) * x;
            diffs.push(y - expectedY);
        }

        const maxDiff = Math.max(...diffs.map(Math.abs), 5);
        const scaleX = (w - 2 * padding) / N;
        const scaleY = (h - 2 * padding) / (2 * maxDiff);

        // Draw zero line
        bridgeCtx.strokeStyle = '#ccc';
        bridgeCtx.lineWidth = 1;
        bridgeCtx.beginPath();
        bridgeCtx.moveTo(padding, h / 2);
        bridgeCtx.lineTo(w - padding, h / 2);
        bridgeCtx.stroke();

        // Draw difference curve
        bridgeCtx.strokeStyle = '#E57200';
        bridgeCtx.lineWidth = 2;
        bridgeCtx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const px = padding + path[i][0] * scaleX;
            const py = h / 2 - diffs[i] * scaleY;
            if (i === 0) bridgeCtx.moveTo(px, py);
            else bridgeCtx.lineTo(px, py);
        }
        bridgeCtx.stroke();

        // Labels
        bridgeCtx.fillStyle = '#232D4B';
        bridgeCtx.font = `${Math.round(h * 0.18)}px sans-serif`;
        bridgeCtx.textAlign = 'center';
        bridgeCtx.fillText('path minus diagonal', w / 2, h - Math.round(h * 0.05));
    }

    function reset() {
        samples = [];
        middleYs = [];
        cachedInitialBits = null;
        observationEl.style.opacity = '0';
        questionEl.style.opacity = '0';
        answerEl.style.opacity = '0';
        histContainer.style.opacity = '0';
        statusEl.textContent = 'Ready';
        statusEl.style.color = 'var(--slide-muted)';
        histCountEl.textContent = '0';
        updateFormula();
        drawPathCanvas();
    }

    // Register with slide engine
    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('limit-shape-2d', {
                start() {},
                pause() {},
                steps: 5,
                async onStep(step) {
                    console.log('limit-shape-2d step:', step, 'isMobile:', isMobile);
                    if (isMobile) {
                        // Mobile: simple mode - just CFTP samples, no histogram
                        if (step === 1) {
                            samples = [];
                            middleYs = [];
                            await runCFTP();
                            observationEl.style.opacity = '1';
                        } else if (step === 2) {
                            // Run 4 more CFTP samples (5 total)
                            for (let i = 0; i < 4; i++) {
                                await runCFTP();
                            }
                            histContainer.style.opacity = '1';  // Shows placeholder
                        } else if (step === 3) {
                            // Skip on mobile
                        } else if (step === 4) {
                            questionEl.style.opacity = '1';
                        } else if (step === 5) {
                            answerEl.style.opacity = '1';
                            drawBrownianBridge();
                        }
                    } else {
                        // Desktop: full experience
                        if (step === 1) {
                            samples = [];
                            middleYs = [];
                            await runCFTP();
                            observationEl.style.opacity = '1';
                            drawHistogram();
                        } else if (step === 2) {
                            histContainer.style.opacity = '1';
                            drawHistogram();
                            await collectSamples(19);
                        } else if (step === 3) {
                            const count = gpuEngine ? 20000 : 200;
                            await collectSamples(count);
                        } else if (step === 4) {
                            questionEl.style.opacity = '1';
                        } else if (step === 5) {
                            answerEl.style.opacity = '1';
                            drawBrownianBridge();
                        }
                    }
                },
                onStepBack(step) {
                    // Always reset to step 0 on any back motion
                    reset();
                    // Also reset the slide engine's step counter for this slide
                    if (window.slideEngine) {
                        window.slideEngine.currentSimStep = 0;
                        window.slideEngine.slideHistory.set('limit-shape-2d', { fragment: 0, simStep: 0 });
                    }
                },
                onSlideEnter() {
                    // Always reset to step 0 when entering (whether forward or back)
                    reset();
                    histContainer.style.opacity = '0';
                    observationEl.style.opacity = '0';
                    questionEl.style.opacity = '0';
                    answerEl.style.opacity = '0';
                    // Reset the slide engine's step counter
                    if (window.slideEngine) {
                        window.slideEngine.currentSimStep = 0;
                        window.slideEngine.slideHistory.set('limit-shape-2d', { fragment: 0, simStep: 0 });
                    }
                }
            }, 1);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();

    // Initial draw
    updateFormula();
    drawPathCanvas();
    })();
}

// Initialize when WASM is loaded
if (typeof QPartitionModule !== 'undefined') {
    initLimitShape2DSim();
} else {
    window.addEventListener('wasm-loaded', initLimitShape2DSim, { once: true });
}
