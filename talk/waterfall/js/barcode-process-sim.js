/**
 * Barcode Process Slide - 2D canvas illustration of barcode pattern
 */

(function initBarcodeSim() {
    if (!window.slideEngine) {
        setTimeout(initBarcodeSim, 50);
        return;
    }

    const canvas = document.getElementById('barcode-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const densityEl = document.getElementById('barcode-density');
    const eigenfunctionsEl = document.getElementById('barcode-eigenfunctions');
    const openEl = document.getElementById('barcode-open');

    function drawBarcode() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        const padding = 50;
        const gridW = w - 2 * padding;
        const gridH = h - 2 * padding;

        // Draw axes
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 2;

        // Vertical axis (x)
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, h - padding);
        ctx.stroke();

        // Horizontal axis (t = transversal)
        ctx.beginPath();
        ctx.moveTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#232D4B';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('t (transversal)', w / 2, h - 15);

        ctx.save();
        ctx.translate(20, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('x (position)', 0, 0);
        ctx.restore();

        // Draw barcode lines (vertical bars at different t positions)
        ctx.strokeStyle = '#E57200';
        ctx.lineWidth = 3;

        // Generate barcode-like pattern
        const numBars = 25;
        const barSpacing = gridW / (numBars + 1);

        for (let i = 1; i <= numBars; i++) {
            const t = padding + i * barSpacing;

            // Each bar has random height (representing x range where paths exist)
            const centerY = h / 2 + (Math.random() - 0.5) * gridH * 0.3;
            const barHeight = gridH * (0.1 + Math.random() * 0.15);

            ctx.beginPath();
            ctx.moveTo(t, centerY - barHeight / 2);
            ctx.lineTo(t, centerY + barHeight / 2);
            ctx.stroke();
        }

        // Draw center line (where paths concentrate)
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, h / 2);
        ctx.lineTo(w - padding, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#232D4B';
        ctx.font = 'italic 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('center line', w - padding - 70, h / 2 - 10);
    }

    function reset() {
        if (densityEl) densityEl.style.opacity = '0';
        if (eigenfunctionsEl) eigenfunctionsEl.style.opacity = '0';
        if (openEl) openEl.style.opacity = '0';
    }

    window.slideEngine.registerSimulation('barcode-process', {
        start() {},
        pause() {},
        steps: 3,
        onStep(step) {
            if (step === 1 && densityEl) densityEl.style.opacity = '1';
            else if (step === 2 && eigenfunctionsEl) eigenfunctionsEl.style.opacity = '1';
            else if (step === 3 && openEl) openEl.style.opacity = '1';
        },
        onStepBack(step) {
            if (step === 0) reset();
            else if (step === 1) { if (eigenfunctionsEl) eigenfunctionsEl.style.opacity = '0'; if (openEl) openEl.style.opacity = '0'; }
            else if (step === 2 && openEl) openEl.style.opacity = '0';
        },
        onSlideEnter() {
            reset();
            drawBarcode();
        },
        onSlideLeave() {
            reset();
        }
    }, 0);
})();
