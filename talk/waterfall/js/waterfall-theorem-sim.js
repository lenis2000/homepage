/**
 * Waterfall Theorem Slide - 2D canvas illustration of saturation band
 */

(function initTheoremSim() {
    if (!window.slideEngine) {
        setTimeout(initTheoremSim, 50);
        return;
    }

    const canvas = document.getElementById('saturation-band-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const probabilityEl = document.getElementById('theorem-probability');
    const methodEl = document.getElementById('theorem-method');

    function drawSaturationBand() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        const padding = 60;
        const gridW = w - 2 * padding;
        const gridH = h - 2 * padding;

        // Draw hexagon boundary
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

        // Draw saturation band (shaded region)
        ctx.fillStyle = 'rgba(229, 114, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(padding + gridW * 0.1, h - padding - gridH * 0.1);
        ctx.lineTo(padding + gridW * 0.25, h - padding - gridH * 0.05);
        ctx.lineTo(padding + gridW * 0.9, padding + gridH * 0.05);
        ctx.lineTo(padding + gridW * 0.75, padding + gridH * 0.1);
        ctx.closePath();
        ctx.fill();

        // Draw band boundaries
        ctx.strokeStyle = '#E57200';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(padding + gridW * 0.1, h - padding - gridH * 0.1);
        ctx.lineTo(padding + gridW * 0.9, padding + gridH * 0.05);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padding + gridW * 0.25, h - padding - gridH * 0.05);
        ctx.lineTo(padding + gridW * 0.75, padding + gridH * 0.1);
        ctx.stroke();

        // Draw some concentrated paths inside the band
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 1.5;
        const numPaths = 12;

        for (let p = 0; p < numPaths; p++) {
            const t = (p + 0.5) / numPaths;
            ctx.beginPath();

            // Start near bottom-left of band
            const startX = padding + gridW * (0.12 + t * 0.06);
            const startY = h - padding - gridH * (0.08 + t * 0.02);
            ctx.moveTo(startX, startY);

            // End near top-right of band
            const endX = padding + gridW * (0.78 + t * 0.06);
            const endY = padding + gridH * (0.08 + t * 0.02);

            // Draw path with some randomness but staying in band
            let x = startX, y = startY;
            const steps = 25;
            for (let i = 1; i <= steps; i++) {
                const progress = i / steps;
                const targetX = startX + (endX - startX) * progress;
                const targetY = startY + (endY - startY) * progress;
                x = targetX + (Math.random() - 0.5) * 8;
                y = targetY + (Math.random() - 0.5) * 8;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#E57200';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Saturation Band', padding + gridW * 0.5, h - padding + 35);

        // Draw "exponentially unlikely" region indicator
        ctx.fillStyle = '#232D4B';
        ctx.font = '14px sans-serif';
        ctx.fillText('P(outside) = e^{-cN}', padding + gridW * 0.8, padding + gridH * 0.4);
    }

    function reset() {
        if (probabilityEl) probabilityEl.style.opacity = '0';
        if (methodEl) methodEl.style.opacity = '0';
    }

    window.slideEngine.registerSimulation('waterfall-theorem', {
        start() {},
        pause() {},
        steps: 2,
        onStep(step) {
            if (step === 1 && probabilityEl) probabilityEl.style.opacity = '1';
            else if (step === 2 && methodEl) methodEl.style.opacity = '1';
        },
        onStepBack(step) {
            if (step === 0) reset();
            else if (step === 1 && methodEl) methodEl.style.opacity = '0';
        },
        onSlideEnter() {
            reset();
            drawSaturationBand();
        },
        onSlideLeave() {
            reset();
        }
    }, 0);
})();
