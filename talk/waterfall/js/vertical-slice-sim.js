// Vertical Slice simulation - shows a slice through the waterfall with step reveals
(function() {
    const slideId = 'vertical-slice';
    const canvas = document.getElementById('vertical-slice-canvas');

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('vs-answer');
        hideElement('vs-operators');
        hideElement('vs-problem');
        hideElement('vs-conclusion');
    }

    function onStep(step) {
        if (step >= 1) showElement('vs-answer');
        if (step >= 2) showElement('vs-operators');
        if (step >= 3) showElement('vs-problem');
        if (step >= 4) showElement('vs-conclusion');
    }

    function onStepBack(step) {
        if (step < 4) hideElement('vs-conclusion');
        if (step < 3) hideElement('vs-problem');
        if (step < 2) hideElement('vs-operators');
        if (step < 1) hideElement('vs-answer');
    }

    // Draw the canvas visualization
    function draw() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);

        // Draw paths as horizontal lines (representing the vertical slice view)
        const numPaths = 40;
        const centerY = height / 2;
        const spread = height * 0.35;

        ctx.strokeStyle = '#E57200';
        ctx.lineWidth = 2;

        for (let i = 0; i < numPaths; i++) {
            const t = i / (numPaths - 1);
            const y = centerY + (t - 0.5) * 2 * spread;
            const jitter = (Math.random() - 0.5) * 10;

            ctx.beginPath();
            ctx.moveTo(50, y + jitter);
            ctx.lineTo(width - 50, y + jitter + (Math.random() - 0.5) * 20);
            ctx.stroke();
        }

        // Draw saturation band boundaries
        ctx.strokeStyle = '#232D4B';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);

        ctx.beginPath();
        ctx.moveTo(50, centerY - spread);
        ctx.lineTo(width - 50, centerY - spread);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(50, centerY + spread);
        ctx.lineTo(width - 50, centerY + spread);
        ctx.stroke();

        ctx.setLineDash([]);

        // Labels
        ctx.fillStyle = '#232D4B';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Saturation band', width / 2, centerY - spread - 15);
        ctx.fillText('t', width / 2, height - 20);

        ctx.save();
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('x', 0, 0);
        ctx.restore();
    }

    // Register with slide engine
    if (window.slideEngine) {
        window.slideEngine.registerSimulation(slideId, {
            start() { draw(); },
            pause() { },
            steps: 4,
            onStep,
            onStepBack,
            onSlideEnter() { reset(); draw(); },
            onSlideLeave() { }
        }, 0);
    } else {
        // Draw immediately if no slide engine
        draw();
    }
})();
