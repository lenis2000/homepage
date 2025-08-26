---
title: Colored discretized t-PNG Model (Stochastic Colored Rule 54)
model: vertex-models
author: Leo Petrov
---

<div class="container" style="max-width: 1200px;">
  <div class="row">
    <div class="col-md-12">
      <h2>Colored t-PNG Model</h2>

      <div class="description mt-3 mb-4">
        <h4>Description</h4>
        <p>
          The colored discrete t-PNG model lives on the integer quadrant {1,2,...}² with n distinct colors.
          It evolves as a Markov chain in continuous time t = x + y. The boundaries are empty (no boundary emissions).
        </p>
        <p>
          <strong>Update rules:</strong> For a cell v at (x,y) on diagonal t+1, depending on cells s = (x-1, y) and s' = (x, y-1) on diagonal t, and u = (x-1, y-1) on diagonal t-1:
        </p>
        <ul>
          <li><strong>Random part:</strong></li>
          <li>If s = s' = 0 and u = 0: v = 0 with probability 1-b, v = j > 0 with probability b/n each</li>
          <li>If s = s' = 0 and u > 0: v = u with probability t, v = 0 with probability 1-t</li>
          <li><strong>Deterministic part:</strong></li>
          <li>If s = s' > 0 and u = s: v = 0; if u = 0: v = s</li>
          <li><strong>Stochastic part for different colors:</strong></li>
          <li>If s ≠ s' (both > 0): with probability t, v = s' if u = s or v = s if u = s' (crossing); with probability 1-t, v = 0 (annihilation)</li>
        </ul>
      </div>

      <div class="simulation-container">
        <canvas id="colored-tpng-canvas" width="700" height="700" style="border: 1px solid #ccc;"></canvas>
      </div>

      <div class="controls mt-3">
        <button id="start-btn" class="btn btn-primary">Start</button>
        <button id="stop-btn" class="btn btn-secondary">Stop</button>
        <button id="reset-btn" class="btn btn-warning">Reset</button>
        <button id="step-btn" class="btn btn-info">Step</button>
      </div>

      <div class="row mt-3">
        <div class="col-md-3">
          <h5>Model Parameters</h5>
          <div class="form-group">
            <label for="t-param">t (crossing probability):</label>
            <input type="text" id="t-param" inputmode="decimal" class="form-control" value="0.5" placeholder="e.g. 0.1 or 0,1">
          </div>
          <div class="form-group">
            <label for="b-param">b (birth probability):</label>
            <input type="text" id="b-param" inputmode="decimal" class="form-control" value="0.1" placeholder="e.g. 0.1 or 0,1">
          </div>
          <div class="form-group">
            <label for="n-colors">Number of colors:</label>
            <input type="number" id="n-colors" min="1" max="10" class="form-control" value="4">
          </div>
        </div>

        <div class="col-md-3">
          <h5>Simulation Control</h5>
          <div class="form-group">
            <label for="size-param">Grid Size:</label>
            <input type="range" id="size-param" min="20" max="700" step="10" value="50" class="form-control-range">
            <span id="size-value">50</span>
          </div>
          <div class="form-group">
            <label for="speed-param">Speed (× N):</label>
            <input type="range" id="speed-param" min="0.1" max="10" step="0.1" value="2.5" class="form-control-range">
            <span id="speed-value">2.5</span>
          </div>
        </div>

        <div class="col-md-3">
          <h5>Statistics</h5>
          <p>Time: <span id="time-display">0</span></p>
          <p>Occupied cells: <span id="occupied-count">0</span></p>
          <div id="color-counts"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
// Read & validate [0,1]; accepts both "." and ","
function readUnitInterval(id){
  const s = document.getElementById(id).value.trim().replace(',', '.');
  const x = Number(s);
  if (!Number.isFinite(x) || x < 0 || x > 1) throw new Error(`${id} must be between 0 and 1`);
  return x;
}

// Colored t-PNG Model
(function() {
    const canvas = document.getElementById('colored-tpng-canvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    const stepBtn = document.getElementById('step-btn');
    const tParam = document.getElementById('t-param');
    const bParam = document.getElementById('b-param');
    const nColorsParam = document.getElementById('n-colors');
    const sizeParam = document.getElementById('size-param');
    const sizeValue = document.getElementById('size-value');
    const speedParam = document.getElementById('speed-param');
    const speedValue = document.getElementById('speed-value');
    const timeDisplay = document.getElementById('time-display');
    const occupiedCount = document.getElementById('occupied-count');
    const colorCountsDiv = document.getElementById('color-counts');

    let t = 0.5;  // Crossing probability
    let b = 0.1;  // Birth probability
    let nColors = 4; // Number of colors
    let speedMultiplier = 2.5; // Speed multiplier

    // Color palettes - bright distinguishable colors
    const colorPalettes = [
        ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C88A', '#F8B500', '#6C5CE7', '#FD79A8', '#00CEC9'],
        ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#27AE60'],
        ['#FF4757', '#5F27CD', '#00D2D3', '#FFC048', '#54A0FF', '#48DBFB', '#EE5A24', '#10AC84', '#F368E0', '#FECA57']
    ];
    let currentPalette = colorPalettes[0];

    // Grid dimensions
    let gridSize = 50; // Grid size
    let cellSize = Math.min(canvas.width, canvas.height) / gridSize;

    // Grid state (0 = empty, 1-n = colors)
    let grid = [];
    let nextGrid = [];
    let time = 0;
    let animationId = null;
    let isRunning = false;

    // Initialize grid
    function initGrid() {
        grid = [];
        nextGrid = [];
        for (let i = 0; i < gridSize; i++) {
            grid[i] = [];
            nextGrid[i] = [];
            for (let j = 0; j < gridSize; j++) {
                grid[i][j] = 0;
                nextGrid[i][j] = 0;
            }
        }
        time = 0;
    }

    // Get cell value (with boundary conditions)
    function getCell(x, y) {
        if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) {
            return 0;
        }
        return grid[x][y];
    }

    // Count cells by color
    function countCells() {
        let counts = new Array(nColors + 1).fill(0);
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                counts[grid[i][j]]++;
            }
        }
        return counts;
    }

    // Update color statistics display
    function updateColorStats() {
        const counts = countCells();
        let html = '';
        let totalOccupied = 0;
        for (let i = 1; i <= nColors; i++) {
            if (counts[i] > 0) {
                html += `<div style="display: flex; align-items: center; margin: 2px 0;">
                    <span style="display: inline-block; width: 15px; height: 15px; background-color: ${currentPalette[i-1]}; margin-right: 5px; border: 1px solid #ccc;"></span>
                    Color ${i}: ${counts[i]}
                </div>`;
            }
            totalOccupied += counts[i];
        }
        colorCountsDiv.innerHTML = html;
        occupiedCount.textContent = totalOccupied;
    }

    // Single step of the Markov chain
    function step() {
        // Copy current grid to next grid
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                nextGrid[i][j] = grid[i][j];
            }
        }

        // Process the diagonal at current time
        const nextTime = time + 1;

        // Process all points (x,y) where x + y = nextTime
        for (let x = 0; x <= Math.min(nextTime, gridSize - 1); x++) {
            const y = nextTime - x;
            if (y >= gridSize || y < 0) continue;

            // Boundaries are always empty
            if (x === 0 || y === 0) {
                nextGrid[x][y] = 0;
                continue;
            }

            // Interior points: apply the colored cellular automaton rule
            if (x > 0 && y > 0) {
                const s = getCell(x - 1, y);        // left neighbor on diagonal t
                const sPrime = getCell(x, y - 1);   // down neighbor on diagonal t
                const u = getCell(x - 1, y - 1);    // SW neighbor on diagonal t-1

                // Apply the colored rule based on the exact specification

                // RANDOM PART: s = s' = 0
                if (s === 0 && sPrime === 0) {
                    if (u === 0) {
                        // s = s' = 0 and u = 0: v = 0 prob 1-b; v = j > 0 prob b/n
                        if (Math.random() < (1 - b)) {
                            nextGrid[x][y] = 0;
                        } else {
                            // Choose a random color from 1 to nColors
                            nextGrid[x][y] = Math.floor(Math.random() * nColors) + 1;
                        }
                    } else {
                        // s = s' = 0 and u > 0: v = u prob t, v = 0 prob 1-t
                        nextGrid[x][y] = (Math.random() < t) ? u : 0;
                    }
                }
                // DETERMINISTIC PART: at least one of s, s' is non-zero
                else if (s === sPrime && s > 0) {
                    // s = s' > 0
                    if (u === s) {
                        // u = s = s': v = 0
                        nextGrid[x][y] = 0;
                    } else if (u === 0) {
                        // u = 0: v = s
                        nextGrid[x][y] = s;
                    } else {
                        // Invalid situation: u ≠ 0 and u ≠ s
                        console.error(`Invalid evolution at (${x},${y}): s=${s}, s'=${sPrime}, u=${u}`);
                        alert(`Error: Invalid configuration at position (${x},${y}). s=${s}, s'=${sPrime}, u=${u}. This should not occur!`);
                        nextGrid[x][y] = 0;
                    }
                } else if (s !== sPrime) {
                    // s ≠ s'
                    if (s > 0 && sPrime > 0) {
                        // Both s and s' are non-zero and different
                        // Apply stochastic crossing/annihilation rule
                        if (Math.random() < t) {
                            // Crossing with probability t
                            if (u === s) {
                                nextGrid[x][y] = sPrime;
                            } else if (u === sPrime) {
                                nextGrid[x][y] = s;
                            } else if (u === 0) {
                                // u = 0: randomly pick one to survive
                                nextGrid[x][y] = (Math.random() < 0.5) ? s : sPrime;
                            } else {
                                // u is some other color - invalid
                                console.error(`Invalid evolution at (${x},${y}): s=${s}, s'=${sPrime}, u=${u}`);
                                alert(`Error: Invalid configuration at position (${x},${y}). s=${s}, s'=${sPrime}, u=${u}. This should not occur!`);
                                nextGrid[x][y] = 0;
                            }
                        } else {
                            // Annihilation with probability 1-t
                            nextGrid[x][y] = 0;
                        }
                    } else {
                        // Exactly one of s, s' is 0 (since they're different and not both 0)
                        // We need to treat this case carefully to match the uncolored model
                        const nonZero = (s > 0) ? s : sPrime;
                        const zero = 0;

                        // Apply the same swap rule as if 0 were a color
                        if (u === nonZero) {
                            nextGrid[x][y] = zero;  // v = 0
                        } else if (u === zero) {
                            nextGrid[x][y] = nonZero;  // v = the non-zero color
                        } else {
                            // u is some other color - this shouldn't happen
                            console.error(`Invalid evolution at (${x},${y}): s=${s}, s'=${sPrime}, u=${u}`);
                            alert(`Error: Invalid configuration at position (${x},${y}). s=${s}, s'=${sPrime}, u=${u}. This should not occur!`);
                            nextGrid[x][y] = 0;
                        }
                    }
                } else {
                    // This should never happen - we've covered all cases
                    console.error(`Unexpected case at (${x},${y}): s=${s}, s'=${sPrime}, u=${u}`);
                    alert(`Error: Unexpected case at (${x},${y}). Please check the logic.`);
                    nextGrid[x][y] = 0;
                }
            }
        }

        // Swap grids
        let temp = grid;
        grid = nextGrid;
        nextGrid = temp;

        time++;
        timeDisplay.textContent = time;
        updateColorStats();

        // Auto-stop condition: t >= 2N + 3
        if (time >= 2 * gridSize + 3) {
            isRunning = false;
            if (animationId) {
                clearTimeout(animationId);
            }
            startBtn.textContent = 'Start';
        }
    }

    // Draw the configuration
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate cell size to fit the grid in the canvas
        cellSize = Math.min(canvas.width / gridSize, canvas.height / gridSize);

        // Draw grid background
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, gridSize * cellSize, gridSize * cellSize);

        // Draw grid lines (optional for small grids)
        if (gridSize <= 50) {
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= gridSize; i++) {
                // Vertical lines
                ctx.beginPath();
                ctx.moveTo(i * cellSize, 0);
                ctx.lineTo(i * cellSize, gridSize * cellSize);
                ctx.stroke();
                // Horizontal lines
                ctx.beginPath();
                ctx.moveTo(0, i * cellSize);
                ctx.lineTo(gridSize * cellSize, i * cellSize);
                ctx.stroke();
            }
        }

        // Draw axes (thicker lines)
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        // X-axis (bottom)
        ctx.beginPath();
        ctx.moveTo(0, gridSize * cellSize);
        ctx.lineTo(gridSize * cellSize, gridSize * cellSize);
        ctx.stroke();
        // Y-axis (left)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, gridSize * cellSize);
        ctx.stroke();

        // Draw next time diagonal (x + y = time + 1)
        if (time >= 0 && time + 1 < 2 * gridSize) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();

            const diagonalValue = time + 1.5;

            // Find start and end points
            let startX, startY, endX, endY;

            if (diagonalValue <= gridSize - 0.5) {
                startX = diagonalValue;
                startY = -0.5;
                endX = -0.5;
                endY = diagonalValue;
            } else {
                startX = gridSize - 0.5;
                startY = diagonalValue - (gridSize - 0.5);
                endX = diagonalValue - (gridSize - 0.5);
                endY = gridSize - 0.5;
            }

            // Clamp to grid bounds
            startX = Math.max(-0.5, Math.min(gridSize - 0.5, startX));
            startY = Math.max(-0.5, Math.min(gridSize - 0.5, startY));
            endX = Math.max(-0.5, Math.min(gridSize - 0.5, endX));
            endY = Math.max(-0.5, Math.min(gridSize - 0.5, endY));

            // Convert to canvas coordinates (remember y-axis is flipped)
            const canvasStartX = (startX + 0.5) * cellSize;
            const canvasStartY = (gridSize - 0.5 - startY) * cellSize;
            const canvasEndX = (endX + 0.5) * cellSize;
            const canvasEndY = (gridSize - 0.5 - endY) * cellSize;

            ctx.moveTo(canvasStartX, canvasStartY);
            ctx.lineTo(canvasEndX, canvasEndY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw occupied cells with colors
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] > 0) {
                    // Map grid coordinates to canvas
                    const canvasX = i * cellSize;
                    const canvasY = (gridSize - 1 - j) * cellSize;

                    // Use color from palette
                    ctx.fillStyle = currentPalette[grid[i][j] - 1];
                    ctx.fillRect(canvasX, canvasY, cellSize, cellSize);

                    // Add a subtle border for better visibility
                    if (gridSize <= 100) {
                        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(canvasX, canvasY, cellSize, cellSize);
                    }
                }
            }
        }
    }

    // Animation loop
    function animate() {
        if (isRunning) {
            step();
            draw();
            const actualSpeed = speedMultiplier * gridSize / 10;
            animationId = setTimeout(() => {
                requestAnimationFrame(animate);
            }, 1000 / actualSpeed);
        }
    }

    // Event handlers
    startBtn.addEventListener('click', () => {
        if (!isRunning) {
            isRunning = true;
            animate();
            startBtn.textContent = 'Pause';
        } else {
            isRunning = false;
            if (animationId) {
                clearTimeout(animationId);
            }
            startBtn.textContent = 'Start';
        }
    });

    stopBtn.addEventListener('click', () => {
        isRunning = false;
        if (animationId) {
            clearTimeout(animationId);
        }
        startBtn.textContent = 'Start';
    });

    resetBtn.addEventListener('click', () => {
        isRunning = false;
        if (animationId) {
            clearTimeout(animationId);
        }
        initGrid();
        draw();
        startBtn.textContent = 'Start';
        timeDisplay.textContent = '0';
        updateColorStats();
    });

    stepBtn.addEventListener('click', () => {
        if (!isRunning) {
            step();
            draw();
        }
    });

    tParam.addEventListener('input', (e) => {
        try {
            t = readUnitInterval('t-param');
        } catch (err) {
            console.warn(err.message);
        }
    });

    bParam.addEventListener('input', (e) => {
        try {
            b = readUnitInterval('b-param');
        } catch (err) {
            console.warn(err.message);
        }
    });

    nColorsParam.addEventListener('input', (e) => {
        const newColors = parseInt(e.target.value);
        if (newColors >= 1 && newColors <= 10) {
            nColors = newColors;
            // Select a random palette
            currentPalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
            // Stop the simulation
            isRunning = false;
            if (animationId) {
                clearTimeout(animationId);
            }
            // Reset the grid
            initGrid();
            draw();
            startBtn.textContent = 'Start';
            timeDisplay.textContent = '0';
            updateColorStats();
        }
    });

    sizeParam.addEventListener('input', (e) => {
        const newSize = parseInt(e.target.value);
        sizeValue.textContent = newSize;

        // Stop the simulation first
        isRunning = false;
        if (animationId) {
            clearTimeout(animationId);
        }

        // Update grid size and reinitialize
        gridSize = newSize;
        cellSize = Math.min(canvas.width / gridSize, canvas.height / gridSize);
        initGrid();
        draw();
        startBtn.textContent = 'Start';
    });

    speedParam.addEventListener('input', (e) => {
        speedMultiplier = parseFloat(e.target.value);
        speedValue.textContent = speedMultiplier;
    });

    // Initialize
    initGrid();
    draw();
    updateColorStats();
})();
</script>
