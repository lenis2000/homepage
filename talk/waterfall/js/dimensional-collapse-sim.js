/**
 * Dimensional Collapse Slide - 2D canvas illustration of path slopes
 */

(function initCollapseSim() {
    if (!window.slideEngine) {
        setTimeout(initCollapseSim, 50);
        return;
    }

    const canvas = document.getElementById('collapse-paths-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const whyEl = document.getElementById('collapse-why');
    const consequenceEl = document.getElementById('collapse-consequence');

    function drawPaths() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        const padding = 60;
        const gridW = w - 2 * padding;
        const gridH = h - 2 * padding;

        // Draw hexagon-like boundary
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, h - padding);
        ctx.lineTo(padding + gridW * 0.3, h - padding);
        ctx.lineTo(padding + gridW, padding + gridH * 0.7);
        ctx.lineTo(padding + gridW, padding);
        ctx.lineTo(padding + gridW * 0.7, padding);
        ctx.lineTo(padding, padding + gridH * 0.3);
        ctx.closePath();
        ctx.stroke();

        // Draw waterfall center line (slope 1/2)
        ctx.strokeStyle = '#E57200';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(padding + gridW * 0.15, h - padding - gridH * 0.15);
        ctx.lineTo(padding + gridW * 0.85, padding + gridH * 0.15);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw several paths with slope 1/2 (waterfall region)
        const numPaths = 8;
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;

        for (let p = 0; p < numPaths; p++) {
            const offset = (p - numPaths/2) * 15;
            ctx.beginPath();

            // Start points
            const startX = padding + gridW * 0.2 + offset * 0.3;
            const startY = h - padding - gridH * 0.2 - offset * 0.3;
            ctx.moveTo(startX, startY);

            // Random walk with slope ~1/2
            let x = startX, y = startY;
            const steps = 30;
            for (let i = 0; i < steps; i++) {
                // Roughly equal chance of right or up-right
                if (Math.random() < 0.5) {
                    // Move right (horizontal step)
                    x += gridW / steps * 0.8;
                } else {
                    // Move up and right (slope 1)
                    x += gridW / steps * 0.4;
                    y -= gridH / steps * 0.4;
                }
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#232D4B';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Slope 0', padding + gridW * 0.15, h - padding + 25);
        ctx.fillText('Slope 1', padding + gridW + 30, padding + gridH * 0.5);

        ctx.fillStyle = '#E57200';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Slope 1/2 (waterfall)', padding + gridW * 0.5, padding - 15);
    }

    function reset() {
        if (whyEl) whyEl.style.opacity = '0';
        if (consequenceEl) consequenceEl.style.opacity = '0';
    }

    window.slideEngine.registerSimulation('dimensional-collapse', {
        start() {},
        pause() {},
        steps: 2,
        onStep(step) {
            if (step === 1 && whyEl) whyEl.style.opacity = '1';
            else if (step === 2 && consequenceEl) consequenceEl.style.opacity = '1';
        },
        onStepBack(step) {
            if (step === 0) reset();
            else if (step === 1 && consequenceEl) consequenceEl.style.opacity = '0';
        },
        onSlideEnter() {
            reset();
            drawPaths();
        },
        onSlideLeave() {
            reset();
        }
    }, 0);
})();
