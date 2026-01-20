/**
 * Random Path Simulation
 * Shows random lattice path with local zoom and Brownian bridge visualization
 */

(function() {
    'use strict';

    const canvas = document.getElementById('random-path-canvas');
    const ctx = canvas.getContext('2d');
    const localCanvas = document.getElementById('local-view-canvas');
    const localCtx = localCanvas.getContext('2d');
    const bridgeCanvas = document.getElementById('brownian-bridge-canvas');
    const bridgeCtx = bridgeCanvas.getContext('2d');
    const sizeSpan = document.getElementById('random-path-size');
    const localTitle = document.getElementById('local-view-title');
    const localViewContainer = document.getElementById('local-view-container');
    const brownianContainer = document.getElementById('brownian-container');
    const bernoulliEl = document.getElementById('bernoulli-explanation');
    const globalEl = document.getElementById('global-observation');

    const A = 100, B = 60;  // Grid size
    let currentPath = null;
    let highlightLen = 16;     // Length of highlighted region
    let highlightStart = Math.floor((A + B) / 2 - highlightLen / 2);  // Always middle

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

    function drawMainPath(showHighlight = false) {
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

        // Draw bounding box
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.strokeRect(baseX, baseY, gridW, gridH);

        // Draw diagonal (limit shape)
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(baseX, baseY + gridH);
        ctx.lineTo(baseX + gridW, baseY);
        ctx.stroke();
        ctx.setLineDash([]);

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

        // Draw highlighted region box if enabled
        if (showHighlight) {
            // Find coordinates at start and end of highlight region
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

            // Draw orange box around highlighted region
            const boxPad = 8;
            const boxX1 = baseX + startX * stepX - boxPad;
            const boxY1 = baseY + gridH - endY * stepY - boxPad;
            const boxX2 = baseX + endX * stepX + boxPad;
            const boxY2 = baseY + gridH - startY * stepY + boxPad;

            ctx.strokeStyle = '#E57200';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.strokeRect(boxX1, boxY1, boxX2 - boxX1, boxY2 - boxY1);

            // Draw the highlighted segment thicker
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

        // Extract the highlighted segment
        const segment = currentPath.slice(highlightStart, highlightStart + highlightLen);
        const segLen = segment.length;
        if (segLen === 0) return;

        const padding = 80;
        const availW = w - 2 * padding;
        const availH = h - 2 * padding - 50;

        // Count R's and U's in segment
        let segR = 0, segU = 0;
        for (const m of segment) {
            if (m === 'R') segR++;
            else segU++;
        }
        if (segR === 0) segR = 1;
        if (segU === 0) segU = 1;

        // Use same step size for both directions (square grid cells)
        const step = Math.min(availW / segR, availH / segU);
        const gridW = segR * step;
        const gridH = segU * step;
        const baseX = padding + (availW - gridW) / 2;
        const baseY = padding + availH - (availH - gridH) / 2;

        // Draw grid
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

        // Draw path segments - track x,y in grid coordinates
        let x = 0, y = 0;

        for (let i = 0; i < segment.length; i++) {
            const move = segment[i];
            const fromPx = baseX + x * step;
            const fromPy = baseY - y * step;

            if (move === 'R') {
                // Draw R segment in orange (horizontal)
                localCtx.strokeStyle = '#E57200';
                localCtx.lineWidth = 6;
                localCtx.beginPath();
                localCtx.moveTo(fromPx, fromPy);
                localCtx.lineTo(fromPx + step, fromPy);
                localCtx.stroke();
                x++;
            } else {
                // Draw U segment in navy (vertical)
                localCtx.strokeStyle = '#232D4B';
                localCtx.lineWidth = 6;
                localCtx.beginPath();
                localCtx.moveTo(fromPx, fromPy);
                localCtx.lineTo(fromPx, fromPy - step);
                localCtx.stroke();
                y++;
            }
        }

        // Draw dots at vertices
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

        // Draw annotation
        localCtx.fillStyle = '#666';
        localCtx.font = '18px sans-serif';
        localCtx.textAlign = 'center';
        localCtx.textBaseline = 'top';
        localCtx.fillText('Each step: independent Bernoulli trial', w / 2, baseY + 20);
    }

    function drawBrownianBridge() {
        if (!currentPath) return;

        const w = bridgeCanvas.width, h = bridgeCanvas.height;
        bridgeCtx.fillStyle = '#fff';
        bridgeCtx.fillRect(0, 0, w, h);

        const padding = 30;
        const drawW = w - 2 * padding;
        const drawH = h - 2 * padding;

        // Compute fluctuations: y - (B/A)*x at each point
        const points = [];
        let x = 0, y = 0;
        points.push({ x: 0, y: 0, diff: 0 });
        for (const move of currentPath) {
            if (move === 'R') x++;
            else y++;
            const expectedY = (B / A) * x;
            points.push({ x, y, diff: y - expectedY });
        }

        const maxDiff = Math.max(...points.map(p => Math.abs(p.diff)), 3);

        // Draw zero line
        const zeroY = padding + drawH / 2;
        bridgeCtx.strokeStyle = '#ccc';
        bridgeCtx.lineWidth = 1;
        bridgeCtx.beginPath();
        bridgeCtx.moveTo(padding, zeroY);
        bridgeCtx.lineTo(padding + drawW, zeroY);
        bridgeCtx.stroke();

        // Draw fluctuation curve
        bridgeCtx.strokeStyle = '#E57200';
        bridgeCtx.lineWidth = 3;
        bridgeCtx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const px = padding + (points[i].x / A) * drawW;
            const py = zeroY - (points[i].diff / maxDiff) * (drawH / 2) * 0.9;
            if (i === 0) bridgeCtx.moveTo(px, py);
            else bridgeCtx.lineTo(px, py);
        }
        bridgeCtx.stroke();

        // Label
        bridgeCtx.fillStyle = '#232D4B';
        bridgeCtx.font = '16px sans-serif';
        bridgeCtx.textAlign = 'center';
        bridgeCtx.fillText('path − diagonal', w / 2, h - 8);
    }

    function resample() {
        currentPath = generateRandomPath(A, B);
        // Keep highlight in the middle
    }

    // Click to resample
    canvas.addEventListener('click', () => {
        resample();
        drawAll();
    });

    let currentStep = 0;

    function drawAll() {
        // Show highlight box only on step 3+
        const showHighlight = currentStep >= 3;
        drawMainPath(showHighlight);
        if (currentStep >= 3) {
            drawLocalView();
        }
        if (currentStep >= 5) {
            drawBrownianBridge();
        }
    }

    function reset() {
        currentStep = 0;
        currentPath = null;
        localCanvas.style.opacity = '0';
        localTitle.style.opacity = '0';
        brownianContainer.style.opacity = '0';
        bernoulliEl.style.opacity = '0';
        globalEl.style.opacity = '0';
        resample();
        drawMainPath(false);
    }

    // Register with slideEngine
    // Steps: 0=initial, 1-2=resample, 3-5=zoom+resample, 6=Bernoulli, 7=global+bridge
    function waitForSlideEngine() {
        if (!window.slideEngine) {
            setTimeout(waitForSlideEngine, 50);
            return;
        }
        window.slideEngine.registerSimulation('random-path', {
            start() {},
            pause() {},
            steps: 7,
            onStep(step) {
                currentStep = step;
                if (step === 1 || step === 2) {
                    // Resample without zoom
                    resample();
                    drawMainPath(false);
                } else if (step === 3) {
                    // Show zoom inset + resample
                    resample();
                    localCanvas.style.opacity = '1';
                    localTitle.style.opacity = '1';
                    drawAll();
                } else if (step === 4 || step === 5) {
                    // Resample with zoom showing
                    resample();
                    drawAll();
                } else if (step === 6) {
                    // Show Bernoulli explanation
                    bernoulliEl.style.opacity = '1';
                    drawAll();
                } else if (step === 7) {
                    // Show global observation + Brownian bridge
                    globalEl.style.opacity = '1';
                    brownianContainer.style.opacity = '1';
                    drawAll();
                }
            },
            onStepBack(step) {
                currentStep = step;
                if (step === 0 || step === 1 || step === 2) {
                    // Hide zoom panel
                    localCanvas.style.opacity = '0';
                    localTitle.style.opacity = '0';
                    bernoulliEl.style.opacity = '0';
                    globalEl.style.opacity = '0';
                    brownianContainer.style.opacity = '0';
                    resample();
                    drawMainPath(false);
                } else if (step === 3 || step === 4 || step === 5) {
                    bernoulliEl.style.opacity = '0';
                    globalEl.style.opacity = '0';
                    brownianContainer.style.opacity = '0';
                    resample();
                    drawAll();
                } else if (step === 6) {
                    globalEl.style.opacity = '0';
                    brownianContainer.style.opacity = '0';
                    drawAll();
                }
            },
            onSlideEnter() {
                reset();
            },
            onSlideLeave() {
                reset();
            }
        }, 0);
    }
    waitForSlideEngine();
})();
