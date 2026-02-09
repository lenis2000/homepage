/**
 * q-Local Simulation
 * CFTP sampling for q-weighted paths with local zoom view
 */

function initQLocalSim() {
    (async function() {
        'use strict';

        const canvas = document.getElementById('q-local-canvas');
        const ctx = canvas.getContext('2d');
        const localCanvas = document.getElementById('q-local-view-canvas');
        const localCtx = localCanvas.getContext('2d');
        const gammaSlider = document.getElementById('q-local-gamma-slider');
        const gammaValueSpan = document.getElementById('q-local-gamma-value');
        const qValueSpan = document.getElementById('q-local-q-value');
        const statusEl = document.getElementById('q-local-status');
        const resampleBtn = document.getElementById('q-local-resample');
        const localTitle = document.getElementById('q-local-view-title');
        const insightEl = document.getElementById('q-local-insight');
        const explanationEl = document.getElementById('q-local-explanation');

        const N = 180;  // Width (a)
        const M = 135;  // Height (b)
        let q = 0.99;
        let highlightLen = 16;
        let highlightStart = Math.floor((N + M) / 2 - highlightLen / 2);

        // WASM module
        let wasm = null;
        let initSimulation, runCFTPBatch, getCoalesced, getPartitionPath, freeString;

        // Path as array of moves ['R', 'U', ...]
        let currentPath = [];
        let isRunning = false;

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
            // Returns [[x,y], [x,y], ...] - convert to ['R', 'U', ...]
            const coords = JSON.parse(str);
            const moves = [];
            for (let i = 1; i < coords.length; i++) {
                const dx = coords[i][0] - coords[i-1][0];
                const dy = coords[i][1] - coords[i-1][1];
                if (dx > 0) moves.push('R');
                else if (dy > 0) moves.push('U');
            }
            return moves;
        }

        async function runCFTP() {
            if (!wasm || isRunning) return;
            isRunning = true;
            statusEl.textContent = 'Sampling...';

            initSimulation(N, M, q);

            let totalSteps = 0;
            const batchSize = 10000000;

            while (!getCoalesced()) {
                runCFTPBatch();
                totalSteps += batchSize;
                statusEl.textContent = `Sampling... ${(totalSteps / 1e6).toFixed(0)}M steps`;
                await new Promise(r => setTimeout(r, 1));
            }

            currentPath = getPathFromWasm();
            statusEl.textContent = `Sampled in ${(totalSteps / 1e6).toFixed(1)}M steps`;
            isRunning = false;
            draw();
        }

        function drawLimitShape(baseX, baseY, gridW, gridH) {
            const aa = M / N;
            const gamma = -N * Math.log(q);

            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);

            if (Math.abs(gamma) < 1e-6) {
                ctx.beginPath();
                ctx.moveTo(baseX, baseY + gridH);
                ctx.lineTo(baseX + gridW, baseY);
                ctx.stroke();
                ctx.setLineDash([]);
                return;
            }

            const denom = 1 - Math.exp(-gamma * (1 + aa));
            const A = (1 - Math.exp(-gamma)) / denom;
            const B = (1 - Math.exp(-gamma * aa)) / denom;

            ctx.beginPath();
            ctx.moveTo(baseX, baseY + gridH);

            const steps = 200;
            for (let i = 1; i < steps; i++) {
                const x_norm = i / steps;
                const exp_neg_cx = Math.exp(-gamma * x_norm);
                const inside = (1 - B * exp_neg_cx) / A;
                if (inside > 0) {
                    const y_formula = -Math.log(inside) / gamma;
                    const y_scaled = (aa - y_formula) / aa * M;
                    ctx.lineTo(baseX + x_norm * gridW, baseY + gridH - (y_scaled / M) * gridH);
                }
            }
            ctx.lineTo(baseX + gridW, baseY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        function draw() {
            const w = canvas.width, h = canvas.height;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, w, h);

            const padding = 60;
            const gridW = w - 2 * padding;
            const gridH = h - 2 * padding;
            const scaleX = gridW / N;
            const scaleY = gridH / M;
            const baseX = padding;
            const baseY = padding;

            // Bounding rectangle
            ctx.strokeStyle = colors[1];
            ctx.lineWidth = 2;
            ctx.strokeRect(baseX, baseY, gridW, gridH);

            // Draw limit shape (not for extreme q)
            if (currentStep < 3) {
                drawLimitShape(baseX, baseY, gridW, gridH);
            }

            // Draw path
            if (currentPath.length > 0) {
                ctx.strokeStyle = colors[0];
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                let x = 0, y = 0;
                ctx.moveTo(baseX, baseY + gridH);
                for (const move of currentPath) {
                    if (move === 'R') x++;
                    else y++;
                    ctx.lineTo(baseX + x * scaleX, baseY + gridH - y * scaleY);
                }
                ctx.stroke();

                // Draw highlight box if zoom is showing
                if (currentStep >= 1) {
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

                    // Redraw path segment inside box thicker
                    ctx.strokeStyle = colors[0];
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    let px = startX, py = startY;
                    ctx.moveTo(baseX + px * scaleX, baseY + gridH - py * scaleY);
                    for (let i = highlightStart; i < highlightStart + highlightLen && i < currentPath.length; i++) {
                        if (currentPath[i] === 'R') px++;
                        else py++;
                        ctx.lineTo(baseX + px * scaleX, baseY + gridH - py * scaleY);
                    }
                    ctx.stroke();

                    const boxPad = 8;
                    const boxX1 = baseX + startX * scaleX - boxPad;
                    const boxY1 = baseY + gridH - endY * scaleY - boxPad;
                    const boxX2 = baseX + endX * scaleX + boxPad;
                    const boxY2 = baseY + gridH - startY * scaleY + boxPad;

                    ctx.strokeStyle = colors[0];
                    ctx.lineWidth = 5;
                    ctx.setLineDash([]);
                    ctx.strokeRect(boxX1, boxY1, boxX2 - boxX1, boxY2 - boxY1);
                }
            }

            // Draw local view if visible
            if (currentStep >= 1) {
                drawLocalView();
            }
        }

        function drawLocalView() {
            const w = localCanvas.width, h = localCanvas.height;
            localCtx.fillStyle = '#fff';
            localCtx.fillRect(0, 0, w, h);

            const padding = 60;
            const availW = w - 2 * padding;
            const availH = h - 2 * padding - 40;

            if (currentPath.length === 0) return;

            const segment = currentPath.slice(highlightStart, highlightStart + highlightLen);
            if (segment.length === 0) return;

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

            // Draw path segments
            let x = 0, y = 0;
            for (const move of segment) {
                const fromPx = baseX + x * step;
                const fromPy = baseY - y * step;
                if (move === 'R') {
                    localCtx.strokeStyle = '#E57200';
                    localCtx.lineWidth = 10;
                    localCtx.lineCap = 'round';
                    localCtx.beginPath();
                    localCtx.moveTo(fromPx, fromPy);
                    localCtx.lineTo(fromPx + step, fromPy);
                    localCtx.stroke();
                    x++;
                } else {
                    localCtx.strokeStyle = '#232D4B';
                    localCtx.lineWidth = 10;
                    localCtx.lineCap = 'round';
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
            localCtx.arc(baseX, baseY, 6, 0, Math.PI * 2);
            localCtx.fill();
            for (const move of segment) {
                if (move === 'R') x++;
                else y++;
                localCtx.beginPath();
                localCtx.arc(baseX + x * step, baseY - y * step, 6, 0, Math.PI * 2);
                localCtx.fill();
            }

            // Only show Bernoulli text for non-extreme steps
            if (currentStep < 3) {
                localCtx.fillStyle = '#666';
                localCtx.font = '28px sans-serif';
                localCtx.textAlign = 'center';
                localCtx.textBaseline = 'top';
                localCtx.fillText('Locally still IID Bernoulli!', w / 2, baseY + 15);
            }
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
        canvas.addEventListener('click', () => runCFTP());

        let currentStep = 0;

        function setGamma(gamma) {
            gammaSlider.value = gamma;
            gammaValueSpan.textContent = gamma.toFixed(1);
            q = Math.exp(-gamma / N);
            qValueSpan.textContent = q.toFixed(4);
        }

        function reset() {
            currentStep = 0;
            currentPath = [];
            localCanvas.style.opacity = '0';
            localTitle.style.opacity = '0';
            insightEl.style.opacity = '0';
            explanationEl.style.opacity = '0';
            insightEl.innerHTML = '<strong style="color: var(--slide-accent); font-size: 1.2em;">Local Universality for \\(q = e^{-\\gamma/N} \\approx 1\\): still IID Bernoulli!</strong><br>For \\(q\\) close to \\(1\\), local structure remains independent Bernoulli trials.';
            renderMath(insightEl);
            setGamma(3);
        }

        function renderMath(el) {
            if (window.renderMathInElement) {
                renderMathInElement(el, {
                    delimiters: [
                        {left: "\\(", right: "\\)", display: false},
                        {left: "$$", right: "$$", display: true}
                    ]
                });
            } else if (window.MathJax) {
                MathJax.typeset([el]);
            }
        }

        async function init() {
            const ok = await initWasm();
            if (ok) {
                await runCFTP();
            }
        }

        // Set q directly (for extreme values that don't fit slider range)
        function setQDirect(newQ) {
            q = newQ;
            qValueSpan.textContent = q.toFixed(4);
            gammaValueSpan.textContent = '\u221E';
        }

        // Steps: 0=initial(γ=3), 1=show zoom, 2=insight, 3=extreme q(0.7)+resample, 4=broken insight
        function waitForSlideEngine() {
            if (!window.slideEngine) {
                setTimeout(waitForSlideEngine, 50);
                return;
            }
            window.slideEngine.registerSimulation('q-local', {
                start() {},
                pause() {},
                steps: 7,
                async onStep(step) {
                    currentStep = step;
                    if (step === 1) {
                        localCanvas.style.opacity = '1';
                        localTitle.style.opacity = '1';
                        draw();
                    } else if (step === 2) {
                        insightEl.style.opacity = '1';
                        explanationEl.style.opacity = '1';
                        draw();
                    } else if (step === 3) {
                        // Extreme q < 1 - breaks universality, path hugs bottom then right
                        setQDirect(0.67);
                        highlightStart = 130;
                        insightEl.style.opacity = '0';
                        explanationEl.style.opacity = '0';
                        await runCFTP();
                    } else if (step === 4) {
                        insightEl.innerHTML = '<strong style="color: #c00; font-size: 1.2em;">Universality BROKEN at extreme q!</strong><br>When q is too extreme (q = 0.67), the path becomes a finite (random) perturbation of the deterministic path that hugs the corner. In other words, the configuration is <strong>frozen</strong>.';
                        insightEl.style.opacity = '1';
                        draw();
                    } else if (step === 5 || step === 6 || step === 7) {
                        // More resamples with same extreme q for effect
                        await runCFTP();
                    }
                },
                onStepBack(step) {
                    currentStep = step;
                    if (step === 0) {
                        localCanvas.style.opacity = '0';
                        localTitle.style.opacity = '0';
                        insightEl.style.opacity = '0';
                        setGamma(3);
                        runCFTP();
                    } else if (step === 1) {
                        insightEl.style.opacity = '0';
                        explanationEl.style.opacity = '0';
                    } else if (step === 2) {
                        setGamma(3);
                        highlightStart = Math.floor((N + M) / 2 - highlightLen / 2);  // Back to middle
                        insightEl.innerHTML = '<strong style="color: var(--slide-accent); font-size: 1.2em;">Local Universality for \\(q = e^{-\\gamma/N} \\approx 1\\): still IID Bernoulli!</strong><br>For \\(q\\) close to \\(1\\), local structure remains <strong>independent Bernoulli trials</strong>.';
                        renderMath(insightEl);
                        runCFTP();
                    } else if (step === 3) {
                        insightEl.style.opacity = '0';
                    } else if (step === 4 || step === 5 || step === 6) {
                        // Back from later resample steps - just resample
                        runCFTP();
                    }
                    draw();
                },
                onSlideEnter() {
                    reset();
                    if (!wasm) {
                        init();
                    } else if (currentPath.length === 0) {
                        runCFTP();
                    } else {
                        draw();
                    }
                },
                onSlideLeave() {
                    reset();
                }
            }, 0);
        }
        waitForSlideEngine();
    })();
}

// Initialize when WASM is loaded
if (typeof QPartitionModule !== 'undefined') {
    initQLocalSim();
} else {
    window.addEventListener('wasm-loaded', initQLocalSim, { once: true });
}
