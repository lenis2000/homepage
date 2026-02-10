/**
 * Random Path Simulation (visual talk)
 * Progressive grid sizes, limit shape reveal, local zoom with Bernoulli claim
 */

(function() {
    'use strict';

    const canvas = document.getElementById('random-path-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const localCanvas = document.getElementById('local-view-canvas');
    const localCtx = localCanvas.getContext('2d');
    const sizeSpan = document.getElementById('random-path-size');
    const bernoulliEl = document.getElementById('bernoulli-explanation');
    const localViewContainer = document.getElementById('local-view-container');

    // Grid sizes for progressive builds
    const sizes = [
        { a: 10, b: 6 },
        { a: 50, b: 30 },
        { a: 100, b: 60 },
        { a: 200, b: 120 },
        { a: 400, b: 240 }
    ];

    let currentSizeIdx = 0;
    let currentPath = null;
    let showDiagonal = false;
    let currentStep = 0;
    let highlightLen = 16;

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

    function currentSize() {
        return sizes[currentSizeIdx];
    }

    function drawMainPath() {
        const { a, b } = currentSize();
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        if (!currentPath) {
            currentPath = generateRandomPath(a, b);
        }

        const padding = 50;
        const gridW = w - 2 * padding;
        const gridH = h - 2 * padding;
        const stepX = gridW / a;
        const stepY = gridH / b;
        const baseX = padding;
        const baseY = padding;

        // Draw bounding box
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.strokeRect(baseX, baseY, gridW, gridH);

        // Draw diagonal (limit shape) if revealed
        if (showDiagonal) {
            ctx.strokeStyle = '#232D4B';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.moveTo(baseX, baseY + gridH);
            ctx.lineTo(baseX + gridW, baseY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw path
        ctx.strokeStyle = '#E57200';
        ctx.lineWidth = a <= 10 ? 18 : a <= 50 ? 12 : a <= 100 ? 9 : a <= 200 ? 6 : 4;
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

        // Draw highlighted region if local view is showing
        if (currentStep >= 6) {
            const highlightStart = Math.floor((a + b) / 2 - highlightLen / 2);
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
        ctx.fillText(`(${a},${b})`, baseX + gridW, baseY - 5);
    }

    function drawLocalView() {
        const { a, b } = currentSize();
        const w = localCanvas.width, h = localCanvas.height;
        localCtx.fillStyle = '#fff';
        localCtx.fillRect(0, 0, w, h);

        if (!currentPath) return;

        const highlightStart = Math.floor((a + b) / 2 - highlightLen / 2);
        const segment = currentPath.slice(highlightStart, highlightStart + highlightLen);
        if (segment.length === 0) return;

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

        // Draw path segments
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
        localCtx.fillText('Locally, steps look like independent coin flips', w / 2, baseY + 20);
    }

    function setSize(idx) {
        currentSizeIdx = idx;
        const { a, b } = currentSize();
        sizeSpan.textContent = `${a} × ${b}`;
        currentPath = generateRandomPath(a, b);
    }

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }
    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function showPanel(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    }
    function hidePanel(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    function reset() {
        currentStep = 0;
        showDiagonal = false;
        hidePanel('local-view-container');
        hideElement('bernoulli-explanation');
        hideElement('limit-shape-label');
        setSize(0);
        drawMainPath();
    }

    // Step 0: 10×6
    // Step 1: 50×30
    // Step 2: 100×60
    // Step 3: 200×120
    // Step 4: 400×240
    // Step 5: show diagonal (limit shape)
    // Step 6: local zoom
    // Step 7: Bernoulli explanation
    // Step 8: resample path
    // Step 9: resample path again

    function applyStep(step) {
        currentStep = step;

        if (step <= 4) {
            showDiagonal = false;
            hideElement('limit-shape-label');
            hidePanel('local-view-container');
            hideElement('bernoulli-explanation');
            setSize(step);
            drawMainPath();
        } else if (step === 5) {
            showDiagonal = true;
            showElement('limit-shape-label');
            hidePanel('local-view-container');
            hideElement('bernoulli-explanation');
            drawMainPath();
        } else if (step === 6) {
            showDiagonal = true;
            showElement('limit-shape-label');
            showPanel('local-view-container');
            hideElement('bernoulli-explanation');
            drawMainPath();
            drawLocalView();
        } else if (step >= 7) {
            // Steps 8, 9: resample the path
            if (step >= 8) {
                const { a, b } = currentSize();
                currentPath = generateRandomPath(a, b);
            }
            showDiagonal = true;
            showElement('limit-shape-label');
            showPanel('local-view-container');
            showElement('bernoulli-explanation');
            drawMainPath();
            drawLocalView();
        }
    }

    function waitForSlideEngine() {
        if (!window.slideEngine) {
            setTimeout(waitForSlideEngine, 50);
            return;
        }
        window.slideEngine.registerSimulation('random-path', {
            start() {},
            pause() {},
            steps: 9,
            onStep(step) {
                applyStep(step);
            },
            onStepBack(step) {
                applyStep(step);
            },
            reset() {
                reset();
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
