// Barcode Density simulation - shows the two-periodic density with step reveals
(function() {
    const slideId = 'barcode-density';
    const canvas = document.getElementById('barcode-density-canvas');

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('density-diverge');
        hideElement('density-numerics');
        hideElement('density-twoperiodic');
    }

    function onStep(step) {
        if (step >= 1) showElement('density-diverge');
        if (step >= 2) showElement('density-numerics');
        if (step >= 3) showElement('density-twoperiodic');
    }

    function onStepBack(step) {
        if (step < 3) hideElement('density-twoperiodic');
        if (step < 2) hideElement('density-numerics');
        if (step < 1) hideElement('density-diverge');
    }

    // Sample density values (even and odd)
    const q = 0.6;
    const evenDensity = [0.481, 0.357, 0.287, 0.241, 0.208, 0.183, 0.163, 0.147];
    const oddDensity = [0.388, 0.320, 0.268, 0.230, 0.200, 0.177, 0.159, 0.144];

    function draw() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);

        const margin = { left: 60, right: 30, top: 30, bottom: 50 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        // Axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, height - margin.bottom);
        ctx.lineTo(width - margin.right, height - margin.bottom);
        ctx.stroke();

        // Plot even density (blue)
        ctx.strokeStyle = '#232D4B';
        ctx.fillStyle = '#232D4B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < evenDensity.length; i++) {
            const x = margin.left + (i * 2) / (evenDensity.length * 2) * plotWidth;
            const y = margin.top + (1 - evenDensity[i] / 0.6) * plotHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw even density points
        for (let i = 0; i < evenDensity.length; i++) {
            const x = margin.left + (i * 2) / (evenDensity.length * 2) * plotWidth;
            const y = margin.top + (1 - evenDensity[i] / 0.6) * plotHeight;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Plot odd density (orange)
        ctx.strokeStyle = '#E57200';
        ctx.fillStyle = '#E57200';
        ctx.beginPath();
        for (let i = 0; i < oddDensity.length; i++) {
            const x = margin.left + (i * 2 + 1) / (oddDensity.length * 2) * plotWidth;
            const y = margin.top + (1 - oddDensity[i] / 0.6) * plotHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw odd density points
        for (let i = 0; i < oddDensity.length; i++) {
            const x = margin.left + (i * 2 + 1) / (oddDensity.length * 2) * plotWidth;
            const y = margin.top + (1 - oddDensity[i] / 0.6) * plotHeight;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('t', width / 2, height - 10);

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('ρ(t)', 0, 0);
        ctx.restore();

        // Legend
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#232D4B';
        ctx.fillRect(width - 120, 40, 12, 12);
        ctx.fillText('ρ_even', width - 65, 50);

        ctx.fillStyle = '#E57200';
        ctx.fillRect(width - 120, 60, 12, 12);
        ctx.fillText('ρ_odd', width - 68, 70);

        // Y-axis labels
        ctx.fillStyle = '#666';
        ctx.textAlign = 'right';
        for (let v = 0; v <= 0.5; v += 0.1) {
            const y = margin.top + (1 - v / 0.6) * plotHeight;
            ctx.fillText(v.toFixed(1), margin.left - 10, y + 4);
        }
    }

    // Register with slide engine
    if (window.slideEngine) {
        window.slideEngine.registerSimulation(slideId, {
            start() { draw(); },
            pause() { },
            steps: 3,
            onStep,
            onStepBack,
            onSlideEnter() { reset(); draw(); },
            onSlideLeave() { }
        }, 0);
    } else {
        draw();
    }
})();
