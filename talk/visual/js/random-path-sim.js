/**
 * Random Path Simulation
 * Displays a single random lattice path from (0,0) to (a,b)
 */

(function() {
    const text1 = document.getElementById('random-path-text1');
    const question = document.getElementById('random-path-question');
    const simDiv = document.getElementById('random-path-sim');
    const canvas = document.getElementById('random-path-canvas');
    const ctx = canvas.getContext('2d');
    const formulaSpan = document.getElementById('random-path-formula');

    let currentA = 4;
    let currentB = 3;
    let currentPath = null;
    let showPath = true;

    function binomial(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return Math.round(result);
    }

    function generateRandomPath(a, b) {
        // Generate a random path: a R's and b U's
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
                // Choose R with probability remainingR / (remainingR + remainingU)
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

    function updateDisplay() {
        const n = currentA + currentB;
        const count = binomial(n, currentA);
        // Use KaTeX for rendering
        formulaSpan.innerHTML = `\\(a = ${currentA},\\; b = ${currentB} \\quad \\displaystyle\\binom{${n}}{${currentA}} =\\) <strong style="color: var(--slide-accent);">${count.toLocaleString()}</strong> paths`;
        if (window.renderMathInElement) {
            renderMathInElement(formulaSpan, {
                delimiters: [
                    {left: "\\(", right: "\\)", display: false},
                    {left: "$$", right: "$$", display: true}
                ]
            });
        }
    }

    function drawPath() {
        const a = currentA;
        const b = currentB;

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!showPath) {
            // For large a,b, just show a big sad face
            ctx.font = `${Math.round(canvas.height * 0.6)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('😢', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Generate random path if needed
        if (!currentPath || currentPath.length !== a + b) {
            currentPath = generateRandomPath(a, b);
        }

        const padding = 80;
        const gridW = canvas.width - 2 * padding;
        const gridH = canvas.height - 2 * padding;
        const stepX = gridW / a;
        const stepY = gridH / b;
        const baseX = padding;
        const baseY = padding;

        // Draw grid lines
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
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
                ctx.arc(baseX + i * stepX, baseY + gridH - j * stepY, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw path
        ctx.strokeStyle = '#E57200';
        ctx.lineWidth = 16;
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

        // Label endpoints
        ctx.fillStyle = '#232D4B';
        ctx.font = `bold ${Math.round(canvas.height * 0.031)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('(0,0)', baseX, baseY + gridH + Math.round(canvas.height * 0.011));
        ctx.textBaseline = 'bottom';
        ctx.fillText('(' + a + ',' + b + ')', baseX + gridW, baseY - Math.round(canvas.height * 0.011));
    }

    function setParams(a, b, draw = true) {
        currentA = a;
        currentB = b;
        showPath = (a <= 15 && b <= 15);
        currentPath = null;
        updateDisplay();
        if (draw) drawPath();
    }

    // Click to resample
    canvas.addEventListener('click', () => {
        if (showPath) {
            currentPath = generateRandomPath(currentA, currentB);
            drawPath();
        }
    });

    // Register with slideEngine for step-based reveal
    function waitForSlideEngine() {
        if (!window.slideEngine) {
            setTimeout(waitForSlideEngine, 50);
            return;
        }
        window.slideEngine.registerSimulation('random-path', {
            start() {},
            pause() {},
            steps: 5,
            onStep(step) {
                simDiv.style.opacity = '1';
                if (step === 1) {
                    setParams(4, 3);
                } else if (step === 2) {
                    setParams(12, 9);
                } else if (step === 3 || step === 4) {
                    // Resample - setParams ensures grid size is correct
                    setParams(12, 9);
                } else if (step === 5) {
                    setParams(120, 90);
                }
            },
            onStepBack(step) {
                // Each step must fully set state and redraw
                if (step === 0) {
                    simDiv.style.opacity = '0';
                } else {
                    simDiv.style.opacity = '1';
                    if (step === 1) {
                        setParams(4, 3);  // 4x3 grid with new random path
                    } else if (step === 2 || step === 3 || step === 4) {
                        // All these steps show 12x9 grid - setParams handles everything
                        setParams(12, 9);
                    }
                }
            },
            onSlideEnter() {
                simDiv.style.opacity = '0';
                // Reset to initial state
                currentA = 4;
                currentB = 3;
                currentPath = null;
                showPath = true;
            },
            onSlideLeave() {
                simDiv.style.opacity = '0';
                currentA = 4;
                currentB = 3;
                currentPath = null;
                showPath = true;
            }
        }, 1);
    }
    waitForSlideEngine();
})();
