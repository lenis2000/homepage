/**
 * q-Deformation Simulation
 * Shows all 35 paths weighted by q^area
 */

(function() {
    'use strict';

    const canvas = document.getElementById('q-paths-canvas');
    const ctx = canvas.getContext('2d');
    const areaCanvas = document.getElementById('area-example-canvas');
    const areaCtx = areaCanvas.getContext('2d');
    const slider = document.getElementById('q-slider');
    const qValueSpan = document.getElementById('q-value');
    const formulaDisplay = document.getElementById('q-formula-display');
    const qBinomialEl = document.getElementById('q-binomial-formula');

    const A = 4, B = 3;

    // Generate all paths from (0,0) to (A,B)
    function generateAllPaths(a, b) {
        const paths = [];
        function generate(path, remainR, remainU) {
            if (remainR === 0 && remainU === 0) {
                paths.push([...path]);
                return;
            }
            if (remainR > 0) {
                path.push('R');
                generate(path, remainR - 1, remainU);
                path.pop();
            }
            if (remainU > 0) {
                path.push('U');
                generate(path, remainR, remainU - 1);
                path.pop();
            }
        }
        generate([], a, b);
        return paths;
    }

    // Calculate area ABOVE a path (unit squares above)
    // Area above = A*B - area below
    function calcArea(path) {
        let areaBelow = 0, y = 0;
        for (const move of path) {
            if (move === 'R') areaBelow += y;
            else y++;
        }
        return A * B - areaBelow;
    }

    const allPaths = generateAllPaths(A, B);
    const pathAreas = allPaths.map(calcArea);

    // Coefficients of the q-binomial polynomial (pre-computed)
    // 1 + q + 2q^2 + 3q^3 + 4q^4 + 4q^5 + 5q^6 + 4q^7 + 4q^8 + 3q^9 + 2q^10 + q^11 + q^12
    const qBinomCoeffs = [1, 1, 2, 3, 4, 4, 5, 4, 4, 3, 2, 1, 1];

    function evalQBinomial(q) {
        if (Math.abs(q - 1) < 1e-10) return 35;
        let sum = 0;
        for (let i = 0; i < qBinomCoeffs.length; i++) {
            sum += qBinomCoeffs[i] * Math.pow(q, i);
        }
        return sum;
    }

    function updateQBinomialFormula(q) {
        const val = evalQBinomial(q);
        if (Math.abs(q - 1) < 0.01) {
            qBinomialEl.innerHTML = `\\(\\displaystyle\\binom{7}{4}_q = 1 + q + 2q^2 + 3q^3 + 4q^4 + 4q^5 + 5q^6\\)<br>\\(\\phantom{\\binom{7}{4}_q =} +\\, 4q^7 + 4q^8 + 3q^9 + 2q^{10} + q^{11} + q^{12}\\)<br>At \\(q=1\\): <strong style="color: var(--slide-accent);">35</strong> paths`;
        } else {
            qBinomialEl.innerHTML = `\\(\\displaystyle\\binom{7}{4}_q = 1 + q + 2q^2 + 3q^3 + 4q^4 + 4q^5 + 5q^6\\)<br>\\(\\phantom{\\binom{7}{4}_q =} +\\, 4q^7 + 4q^8 + 3q^9 + 2q^{10} + q^{11} + q^{12}\\)<br>At \\(q=${q.toFixed(2)}\\): <strong style="color: var(--slide-accent);">${val.toFixed(2)}</strong>`;
        }
        if (window.renderMathInElement) {
            renderMathInElement(qBinomialEl, {
                delimiters: [
                    {left: "\\(", right: "\\)", display: false},
                    {left: "$$", right: "$$", display: true}
                ]
            });
        }
    }

    function drawAreaExample() {
        const w = areaCanvas.width, h = areaCanvas.height;
        areaCtx.fillStyle = '#fff';
        areaCtx.fillRect(0, 0, w, h);

        // Draw a specific path with area shaded
        // This path: R U R U R R U has area_below = 0+1+1+2 = 4, so area_above = 12-4 = 8
        const exPath = ['R', 'U', 'R', 'U', 'R', 'R', 'U'];
        const padding = h * 0.1;
        const gridW = w - 2 * padding;
        const gridH = h - 2 * padding;
        const step = Math.min(gridW / A, gridH / B);
        const stepX = step;
        const stepY = step;
        const baseX = (w - A * step) / 2;
        const baseY = (h - B * step) / 2;

        // Shade area ABOVE path
        areaCtx.fillStyle = 'rgba(229, 114, 0, 0.3)';
        let x = 0, y = 0;
        for (const move of exPath) {
            if (move === 'R') {
                // Shade column from y to B (above the path)
                if (y < B) {
                    areaCtx.fillRect(baseX + x * stepX, baseY, stepX, (B - y) * stepY);
                }
                x++;
            } else {
                y++;
            }
        }

        // Draw grid
        const actualGridW = A * stepX;
        const actualGridH = B * stepY;
        areaCtx.strokeStyle = '#ccc';
        areaCtx.lineWidth = 1;
        for (let i = 0; i <= A; i++) {
            areaCtx.beginPath();
            areaCtx.moveTo(baseX + i * stepX, baseY);
            areaCtx.lineTo(baseX + i * stepX, baseY + actualGridH);
            areaCtx.stroke();
        }
        for (let j = 0; j <= B; j++) {
            areaCtx.beginPath();
            areaCtx.moveTo(baseX, baseY + actualGridH - j * stepY);
            areaCtx.lineTo(baseX + actualGridW, baseY + actualGridH - j * stepY);
            areaCtx.stroke();
        }

        // Draw path
        areaCtx.strokeStyle = '#E57200';
        areaCtx.lineWidth = 3;
        areaCtx.lineCap = 'round';
        areaCtx.lineJoin = 'round';
        areaCtx.beginPath();
        x = 0; y = 0;
        areaCtx.moveTo(baseX + x * stepX, baseY + actualGridH - y * stepY);
        for (const move of exPath) {
            if (move === 'R') x++;
            else y++;
            areaCtx.lineTo(baseX + x * stepX, baseY + actualGridH - y * stepY);
        }
        areaCtx.stroke();
    }

    function drawAllPaths(q) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        // Layout: 7 columns x 5 rows
        const cols = 7, rows = 5;
        const cellW = w / cols;
        const cellH = h / rows;
        const padding = 6;
        const gridPadding = 4;

        // Calculate weights
        const qSum = evalQBinomial(q);
        const weights = pathAreas.map(area => Math.pow(q, area));
        const probs = weights.map(wt => wt / qSum);
        const maxProb = Math.max(...probs);

        // Sort paths by area for nice display
        const sorted = allPaths.map((p, i) => ({ path: p, area: pathAreas[i], prob: probs[i], weight: weights[i] }));
        sorted.sort((a, b) => a.area - b.area);

        for (let idx = 0; idx < sorted.length; idx++) {
            const { path, area, prob, weight } = sorted[idx];
            const col = idx % cols;
            const row = Math.floor(idx / cols);

            const cellX = col * cellW + padding;
            const cellY = row * cellH + padding;
            const innerW = cellW - 2 * padding;
            const innerH = cellH - 2 * padding - 28; // leave space for text

            // Draw mini grid with correct 4:3 aspect ratio
            const availW = innerW - 2 * gridPadding;
            const availH = innerH - 2 * gridPadding;
            const step = Math.min(availW / A, availH / B); // uniform step for square cells
            const gridW = step * A;
            const gridH = step * B;
            const baseX = cellX + gridPadding + (availW - gridW) / 2; // center horizontally
            const baseY = cellY + gridPadding + (availH - gridH) / 2; // center vertically

            // Grid lines
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            for (let i = 0; i <= A; i++) {
                ctx.beginPath();
                ctx.moveTo(baseX + i * step, baseY);
                ctx.lineTo(baseX + i * step, baseY + gridH);
                ctx.stroke();
            }
            for (let j = 0; j <= B; j++) {
                ctx.beginPath();
                ctx.moveTo(baseX, baseY + gridH - j * step);
                ctx.lineTo(baseX + gridW, baseY + gridH - j * step);
                ctx.stroke();
            }

            // Path line weight based on probability (thicker = higher prob) - MORE DRAMATIC
            const probRatio = prob / maxProb;
            const minLineW = 1;
            const maxLineW = 16;
            const lineW = minLineW + (maxLineW - minLineW) * Math.pow(probRatio, 0.5);

            // Opacity based on probability
            const minAlpha = 0.15;
            const alpha = minAlpha + (1 - minAlpha) * Math.pow(probRatio, 0.7);

            // Draw path
            ctx.strokeStyle = `rgba(229, 114, 0, ${alpha})`;
            ctx.lineWidth = lineW;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            let x = 0, y = 0;
            ctx.moveTo(baseX, baseY + gridH);
            for (const move of path) {
                if (move === 'R') x++;
                else y++;
                ctx.lineTo(baseX + x * step, baseY + gridH - y * step);
            }
            ctx.stroke();

            // Probability only (no area label) - MORE DRAMATIC sizing
            const textY = cellY + innerH + 15;
            const minFontSize = 14;
            const maxFontSize = 28;
            const fontSize = minFontSize + (maxFontSize - minFontSize) * Math.pow(probRatio, 0.5);
            const fontWeight = probRatio > 0.3 ? 'bold' : 'normal';
            ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
            const textAlpha = 0.3 + 0.7 * Math.pow(probRatio, 0.5);
            ctx.fillStyle = probRatio > 0.5 ? `rgba(229, 114, 0, ${textAlpha})` : `rgba(102, 102, 102, ${textAlpha})`;
            ctx.textAlign = 'center';
            const probStr = (prob * 100).toFixed(1) + '%';
            ctx.fillText(probStr, cellX + innerW / 2 + padding, textY);
        }
    }

    function update() {
        const q = parseFloat(slider.value);
        qValueSpan.textContent = q.toFixed(2);
        drawAllPaths(q);
        updateQBinomialFormula(q);

        // Update formula display
        const qBinom = evalQBinomial(q);
        if (Math.abs(q - 1) < 0.01) {
            formulaDisplay.textContent = 'q = 1: ordinary binomial (35 paths)';
        } else if (q < 1) {
            formulaDisplay.innerHTML = `q = ${q.toFixed(2)} < 1`;
        } else {
            formulaDisplay.innerHTML = `q = ${q.toFixed(2)} > 1`;
        }
    }

    slider.addEventListener('input', update);

    // Initial draw
    drawAreaExample();
    updateQBinomialFormula(1);
    update();

    // Step q values: step 0=1 (uniform), step 1=0.9, step 2=0.5 (favor low area), step 3=1.5 (favor high area)
    const stepQValues = [1, 0.9, 0.5, 1.5];

    function setQ(q) {
        slider.value = q;
        update();
    }

    // Register with slide engine
    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('q-deformation', {
                start() {},
                pause() {},
                steps: 3,
                onStep(step) {
                    if (step >= 1 && step <= 3) {
                        setQ(stepQValues[step]);
                    }
                },
                onStepBack(step) {
                    setQ(stepQValues[step]);
                },
                onSlideEnter() {
                    setQ(1);
                },
                onSlideLeave() {
                    setQ(1);
                }
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
})();
