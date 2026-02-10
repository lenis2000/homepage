// APPROVED: Do not modify without explicit user request
/**
 * Grid Paths Simulation (visual talk version)
 * Interactive quiz: explore paths, then reveal counting formula
 */

(function() {
    const canvas = document.getElementById('paths-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const inputA = document.getElementById('path-a');
    const inputB = document.getElementById('path-b');
    const countSpan = document.getElementById('path-count');
    const questionEl = document.getElementById('grid-paths-question');
    const answerEl = document.getElementById('grid-paths-answer');

    // Draw grid demo in left column
    const gridCanvas = document.getElementById('grid-demo-canvas');
    const gridCtx = gridCanvas.getContext('2d');
    function drawGridDemo() {
        const w = gridCanvas.width, h = gridCanvas.height;
        const padding = 30;
        const gridSize = 4;
        const stepX = (w - 2 * padding) / gridSize;
        const stepY = (h - 2 * padding) / gridSize;

        gridCtx.fillStyle = '#fff';
        gridCtx.fillRect(0, 0, w, h);

        // Draw grid lines
        gridCtx.strokeStyle = '#999';
        gridCtx.lineWidth = 2;
        for (let i = 0; i <= gridSize; i++) {
            gridCtx.beginPath();
            gridCtx.moveTo(padding + i * stepX, padding);
            gridCtx.lineTo(padding + i * stepX, h - padding);
            gridCtx.stroke();
            gridCtx.beginPath();
            gridCtx.moveTo(padding, padding + i * stepY);
            gridCtx.lineTo(w - padding, padding + i * stepY);
            gridCtx.stroke();
        }

        // Draw dots
        gridCtx.fillStyle = '#232D4B';
        for (let i = 0; i <= gridSize; i++) {
            for (let j = 0; j <= gridSize; j++) {
                gridCtx.beginPath();
                gridCtx.arc(padding + i * stepX, h - padding - j * stepY, 4, 0, Math.PI * 2);
                gridCtx.fill();
            }
        }

        // Draw sample path: UURURRUR
        gridCtx.strokeStyle = '#E57200';
        gridCtx.lineWidth = 8;
        gridCtx.lineCap = 'round';
        gridCtx.lineJoin = 'round';
        gridCtx.beginPath();
        gridCtx.moveTo(padding, h - padding);
        gridCtx.lineTo(padding, h - padding - stepY);
        gridCtx.lineTo(padding, h - padding - 2 * stepY);
        gridCtx.lineTo(padding + stepX, h - padding - 2 * stepY);
        gridCtx.lineTo(padding + stepX, h - padding - 3 * stepY);
        gridCtx.lineTo(padding + 2 * stepX, h - padding - 3 * stepY);
        gridCtx.lineTo(padding + 3 * stepX, h - padding - 3 * stepY);
        gridCtx.lineTo(padding + 3 * stepX, h - padding - 4 * stepY);
        gridCtx.lineTo(padding + 4 * stepX, h - padding - 4 * stepY);
        gridCtx.stroke();

        // Labels
        gridCtx.fillStyle = '#232D4B';
        gridCtx.font = `${Math.round(gridCanvas.height * 0.053)}px sans-serif`;
        gridCtx.fillText('(0,0)', padding - 10, h - padding + Math.round(h * 0.067));
        gridCtx.fillText('(a,b)', w - padding - 25, padding - Math.round(h * 0.033));
    }
    drawGridDemo();

    function generatePaths(a, b) {
        const paths = [];
        function generate(x, y, path) {
            if (x === a && y === b) {
                paths.push([...path]);
                return;
            }
            if (x < a) {
                path.push('R');
                generate(x + 1, y, path);
                path.pop();
            }
            if (y < b) {
                path.push('U');
                generate(x, y + 1, path);
                path.pop();
            }
        }
        generate(0, 0, []);
        return paths;
    }

    let showCount = false;

    function drawPaths() {
        const a = Math.min(7, Math.max(1, parseInt(inputA.value) || 2));
        const b = Math.min(7, Math.max(1, parseInt(inputB.value) || 2));
        inputA.value = a;
        inputB.value = b;

        const paths = generatePaths(a, b);
        const numPaths = paths.length;
        countSpan.textContent = showCount ? `${numPaths} paths` : '';

        // Calculate grid layout
        const cols = Math.ceil(Math.sqrt(numPaths * 1.5));
        const rows = Math.ceil(numPaths / cols);

        const cellW = canvas.width / cols;
        const cellH = canvas.height / rows;
        const padding = Math.min(cellW, cellH) * 0.1;
        const gridW = cellW - 2 * padding;
        const gridH = cellH - 2 * padding;
        const stepX = gridW / a;
        const stepY = gridH / b;

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        paths.forEach((path, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const baseX = col * cellW + padding;
            const baseY = row * cellH + padding;

            // Draw grid lines
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            for (let i = 0; i <= a; i++) {
                ctx.beginPath();
                ctx.moveTo(baseX + i * stepX, baseY);
                ctx.lineTo(baseX + i * stepX, baseY + gridH);
                ctx.stroke();
            }
            for (let j = 0; j <= b; j++) {
                ctx.beginPath();
                ctx.moveTo(baseX, baseY + gridH - j * stepY);
                ctx.lineTo(baseX + gridW, baseY + gridH - j * stepY);
                ctx.stroke();
            }

            // Draw grid dots
            ctx.fillStyle = '#232D4B';
            for (let i = 0; i <= a; i++) {
                for (let j = 0; j <= b; j++) {
                    ctx.beginPath();
                    ctx.arc(baseX + i * stepX, baseY + gridH - j * stepY, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw path
            ctx.strokeStyle = '#E57200';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            let x = 0, y = 0;
            ctx.moveTo(baseX + x * stepX, baseY + gridH - y * stepY);
            for (const move of path) {
                if (move === 'R') x++;
                else y++;
                ctx.lineTo(baseX + x * stepX, baseY + gridH - y * stepY);
            }
            ctx.stroke();
        });
    }

    inputA.addEventListener('change', drawPaths);
    inputB.addEventListener('change', drawPaths);
    inputA.addEventListener('input', drawPaths);
    inputB.addEventListener('input', drawPaths);

    // Initial draw
    drawPaths();

    function setValues(a, b) {
        inputA.value = a;
        inputB.value = b;
        drawPaths();
    }

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }
    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    // Register with slideEngine
    // Step 0: a=2, b=2, all 6 paths shown, no count, no question
    // Step 1: a=4, b=3, show "How many paths?" question + count
    // Step 2: reveal binomial formula
    function waitForSlideEngine() {
        if (!window.slideEngine) {
            setTimeout(waitForSlideEngine, 50);
            return;
        }
        window.slideEngine.registerSimulation('grid-paths', {
            start() {},
            pause() {},
            steps: 2,
            onStep(step) {
                if (step === 1) {
                    showCount = true;
                    setValues(4, 3);
                    showElement('grid-paths-question');
                }
                if (step === 2) {
                    showElement('grid-paths-answer');
                }
            },
            onStepBack(step) {
                if (step === 1) {
                    hideElement('grid-paths-answer');
                }
                if (step === 0) {
                    showCount = false;
                    hideElement('grid-paths-question');
                    hideElement('grid-paths-answer');
                    setValues(2, 2);
                }
            },
            reset() {
                showCount = false;
                hideElement('grid-paths-question');
                hideElement('grid-paths-answer');
            },
            onSlideEnter() {
                showCount = false;
                hideElement('grid-paths-question');
                hideElement('grid-paths-answer');
                setValues(2, 2);
            }
        }, 0);
    }
    waitForSlideEngine();
})();
