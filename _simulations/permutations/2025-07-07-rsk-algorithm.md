---
title: RSK for Permutations
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-07-07-rsk-algorithm.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-07-07-rsk-algorithm.cpp'
    txt: 'C++ code for WASM module (handles permutations up to size 10000)'
---

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<script src="{{site.url}}/js/2025-07-07-rsk-algorithm.js"></script>

<style>
.container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.controls {
    background-color: var(--bg-secondary, #f5f5f5);
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.input-group {
    margin-bottom: 15px;
}

.input-group label {
    display: inline-block;
    width: 150px;
    font-weight: bold;
    color: var(--text-primary, #212529);
}

.input-group input, .input-group select {
    padding: 5px 10px;
    font-size: 14px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    background-color: var(--bg-primary, #fff);
    color: var(--text-primary, #212529);
}

.input-group input[type="number"] {
    width: 80px;
}

button {
    padding: 8px 15px;
    font-size: 14px;
    background-color: var(--link-color, #007bff);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 10px;
    margin-bottom: 10px;
}

button:hover {
    background-color: var(--link-hover, #0056b3);
}

button:disabled {
    background-color: var(--text-secondary, #6c757d);
    cursor: not-allowed;
}

.visualization-container {
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    margin-top: 20px;
}

.section {
    background-color: var(--bg-primary, #fff);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.section h3 {
    margin-top: 0;
    color: var(--text-primary, #333);
}

.tableau-container {
    display: inline-block;
    margin: 10px;
}

.tableau-cell {
    stroke: var(--text-primary, #333);
    stroke-width: 1;
    fill: var(--bg-secondary, #f9f9f9);
}

.tableau-cell.filled {
    fill: #e3f2fd;
}

[data-theme="dark"] .tableau-cell.filled {
    fill: #1e3a5f;
}

.tableau-cell.inserting {
    fill: #ffeb3b;
}

[data-theme="dark"] .tableau-cell.inserting {
    fill: #6d5a00;
}

.tableau-cell.bumped {
    fill: #ff9800;
}

[data-theme="dark"] .tableau-cell.bumped {
    fill: #8b4000;
}

.tableau-cell.trajectory {
    fill: #e91e63;
    stroke: #ad1457;
    stroke-width: 3;
}

[data-theme="dark"] .tableau-cell.trajectory {
    fill: #c2185b;
    stroke: #e91e63;
}

.tableau-text {
    font-family: monospace;
    font-size: 16px;
    text-anchor: middle;
    dominant-baseline: middle;
    fill: var(--text-primary, #212529);
}

/* Permutation matrix is now drawn with circles instead of cells */

.permutation-display {
    font-family: monospace;
    font-size: 18px;
    margin: 10px 0;
    padding: 10px;
    background-color: var(--bg-secondary, #f0f0f0);
    border-radius: 4px;
    color: var(--text-primary, #212529);
}

.step-info {
    background-color: var(--bg-secondary, #e8f4f8);
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
    font-family: monospace;
    color: var(--text-primary, #212529);
}

/* Algorithm description is now a collapsible details element */
</style>

<div class="container">
    <h2>RSK Algorithm Interactive Visualization</h2>
    
    <details id="algorithm-description-details" style="margin-bottom: 20px;">
        <summary style="cursor: pointer; padding: 15px; border: 1px solid var(--border-color, #ddd); border-radius: 5px; background-color: var(--bg-secondary, #f9f9f9); font-weight: bold; font-size: 1.1em; color: var(--text-primary, #212529);">
            About the RSK Algorithm
        </summary>
        <div style="padding: 15px; border: 1px solid var(--border-color, #ddd); border-top: none; border-radius: 0 0 5px 5px; background-color: var(--bg-secondary, #f9f9f9); color: var(--text-primary, #212529);">
            <p>The Robinson-Schensted-Knuth (RSK) correspondence is a bijection between permutations and pairs of Standard Young Tableaux (SYT) of the same shape.</p>
            <p>This visualization demonstrates both directions:</p>
            <ul>
                <li><strong>Forward RSK:</strong> Permutation → (P-tableau, Q-tableau)</li>
                <li><strong>Inverse RSK:</strong> (P-tableau, Q-tableau) → Permutation</li>
            </ul>
            <p>For large permutations (N > 100), the simulation automatically uses a WebAssembly module for optimal performance.</p>
        </div>
    </details>
    
    <div class="controls">
        <div class="input-group">
            <label for="n-input">Permutation size N:</label>
            <input type="number" id="n-input" min="1" max="10000" value="6">
            <button id="generate-random">Generate Random Permutation</button>
            <span id="wasm-indicator" style="margin-left: 10px; color: var(--text-secondary, #666);"></span>
        </div>
        
        <div class="input-group">
            <label for="permutation-input">Permutation:</label>
            <input type="text" id="permutation-input" placeholder="e.g., 3,1,4,2" style="width: 300px;">
            <button id="set-permutation">Set Permutation</button>
        </div>
        
        <div class="input-group">
            <label for="speed-select">Animation Speed:</label>
            <select id="speed-select">
                <option value="2000">Very Slow</option>
                <option value="1000" selected>Slow</option>
                <option value="500">Medium</option>
                <option value="250">Fast</option>
                <option value="100">Very Fast</option>
                <option value="50">Ultra Fast</option>
                <option value="10">Lightning</option>
            </select>
        </div>
        
        <div>
            <button id="run-rsk">Run Forward RSK (Animated)</button>
            <button id="run-rsk-instant">Run Forward RSK (Instant)</button>
            <button id="run-rsk-step">Step Forward RSK</button>
            <button id="reset">Reset</button>
        </div>
    </div>
    
    <div class="section">
        <h3>Current Permutation</h3>
        <div id="permutation-display" class="permutation-display"></div>
        <div id="permutation-matrix"></div>
    </div>
    
    <div class="visualization-container">
        <div class="section">
            <h3>P-Tableau (Insertion Tableau)</h3>
            <div id="p-tableau"></div>
        </div>
        
        <div class="section">
            <h3>Q-Tableau (Recording Tableau)</h3>
            <div id="q-tableau"></div>
        </div>
    </div>
    
    <div class="section" id="step-info-section" style="display: none;">
        <h3>Current Step</h3>
        <div id="step-info" class="step-info"></div>
    </div>
</div>

<script>
class RSKVisualization {
    constructor() {
        this.permutation = [];
        this.n = 6;
        this.pTableau = [];
        this.qTableau = [];
        this.currentStep = 0;
        this.isRunning = false;
        this.animationSpeed = 1000;
        this.wasmModule = null;
        this.useWASM = false;
        
        this.initializeWASM();
        this.setupEventListeners();
        this.setupCollapsibleDetails();
        this.generateRandomPermutation();
        this.switchingToStepMode = false;
    }
    
    async initializeWASM() {
        try {
            // Check if Module is available (loaded from WASM JS file)
            if (typeof Module !== 'undefined') {
                await Module.ready;
                this.wasmModule = Module;
                this.updateWASMIndicator();
            }
        } catch (error) {
            console.log('WASM module not available, using JavaScript implementation');
        }
    }
    
    updateWASMIndicator() {
        const indicator = document.getElementById('wasm-indicator');
        if (this.wasmModule) {
            indicator.textContent = '(WASM ready for N > 100)';
            indicator.style.color = 'var(--accent-color, #28a745)';
        } else {
            indicator.textContent = '(JavaScript mode)';
        }
    }
    
    setupCollapsibleDetails() {
        // Open details element on wider screens
        if (window.innerWidth >= 577) {
            const details = document.getElementById('algorithm-description-details');
            if (details) {
                details.open = true;
            }
        }
    }
    
    setupEventListeners() {
        document.getElementById('generate-random').addEventListener('click', () => this.generateRandomPermutation());
        document.getElementById('set-permutation').addEventListener('click', () => this.setPermutation());
        document.getElementById('run-rsk').addEventListener('click', () => this.runRSK());
        document.getElementById('run-rsk-instant').addEventListener('click', () => this.runRSKInstant());
        document.getElementById('run-rsk-step').addEventListener('click', () => this.handleStepRSK());
        document.getElementById('reset').addEventListener('click', () => this.reset());
        document.getElementById('speed-select').addEventListener('change', (e) => {
            this.animationSpeed = parseInt(e.target.value);
        });
    }
    
    generateRandomPermutation() {
        this.n = parseInt(document.getElementById('n-input').value);
        this.permutation = Array.from({length: this.n}, (_, i) => i + 1);
        
        // Fisher-Yates shuffle
        for (let i = this.n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        
        document.getElementById('permutation-input').value = this.permutation.join(',');
        this.displayPermutation();
        this.reset();
    }
    
    setPermutation() {
        const input = document.getElementById('permutation-input').value;
        const perm = input.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
        
        // Validate permutation
        const sorted = [...perm].sort((a, b) => a - b);
        const isValid = sorted.length > 0 && sorted.every((val, idx) => val === idx + 1);
        
        if (isValid) {
            this.permutation = perm;
            this.n = perm.length;
            document.getElementById('n-input').value = this.n;
            this.displayPermutation();
            this.reset();
        } else {
            alert('Invalid permutation. Please enter a permutation of {1, 2, ..., n}');
        }
    }
    
    displayPermutation() {
        const display = document.getElementById('permutation-display');
        if (this.n > 100) {
            display.textContent = `σ = permutation of size ${this.n} (too large to display)`;
        } else {
            display.textContent = `σ = [${this.permutation.join(', ')}]`;
        }
        
        this.drawPermutationMatrix();
    }
    
    drawPermutationMatrix() {
        const container = document.getElementById('permutation-matrix');
        container.innerHTML = '';
        
        const fixedSize = 300; // Fixed size for the visualization
        const margin = 20;
        const cellSize = Math.min(30, (fixedSize - 2 * margin) / this.n);
        const dotRadius = Math.max(1, cellSize * 0.3);
        
        const svg = d3.select(container)
            .append('svg')
            .attr('width', fixedSize)
            .attr('height', fixedSize);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin}, ${margin})`);
        
        const actualSize = this.n * cellSize;
        
        // Draw border
        g.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', actualSize)
            .attr('height', actualSize)
            .attr('fill', 'none')
            .attr('stroke', 'var(--text-primary, #333)')
            .attr('stroke-width', 1);
        
        // Draw dots for the permutation
        for (let j = 0; j < this.n; j++) {
            const i = this.permutation[j] - 1;
            g.append('circle')
                .attr('cx', j * cellSize + cellSize / 2)
                .attr('cy', i * cellSize + cellSize / 2)
                .attr('r', dotRadius)
                .attr('fill', 'var(--text-primary, #333)');
        }
    }
    
    reset() {
        this.pTableau = [];
        this.qTableau = [];
        this.currentStep = 0;
        this.isRunning = false;
        document.getElementById('step-info-section').style.display = 'none';
        this.drawTableau('p-tableau', this.pTableau);
        this.drawTableau('q-tableau', this.qTableau);
    }
    
    async runRSK() {
        if (this.isRunning) return;
        this.reset();
        this.isRunning = true;
        document.getElementById('step-info-section').style.display = 'block';
        
        // Determine animation mode based on N
        const isFastMode = this.n > 200;
        const showDetailedBumps = this.n <= 200;
        
        const stepInfo = document.getElementById('step-info');
        if (isFastMode) {
            stepInfo.innerHTML = `Running RSK with fast animation (N=${this.n})...`;
        } else {
            stepInfo.innerHTML = `Running RSK with detailed animation (N=${this.n})...`;
        }
        
        for (let i = 0; i < this.n; i++) {
            if (isFastMode) {
                stepInfo.innerHTML = `Inserting ${this.permutation[i]} (step ${i + 1}/${this.n}) - showing bumping trajectory...`;
            }
            
            await this.insertRSK(this.permutation[i], i + 1, true, showDetailedBumps);
            if (!this.isRunning) break;
            
            // Check if user wants to switch to step mode
            if (this.switchingToStepMode) {
                this.currentStep = i + 1;
                this.isRunning = false;
                this.switchingToStepMode = false;
                stepInfo.innerHTML = `Animation stopped. Now in step mode at step ${this.currentStep}/${this.n}.`;
                break;
            }
            
            // Brief pause between insertions in fast mode
            if (isFastMode) {
                await this.sleep(Math.min(this.animationSpeed / 2, 200));
            }
        }
        
        if (this.isRunning) {
            stepInfo.innerHTML = `RSK algorithm completed!<br>Shape: [${this.pTableau.map(row => row.length).slice(0, 20).join(', ')}${this.pTableau.length > 20 ? '...' : ''}]`;
        }
        
        this.isRunning = false;
    }
    
    runRSKInstant() {
        if (this.isRunning) return;
        this.reset();
        document.getElementById('step-info-section').style.display = 'block';
        
        // Use WASM for large permutations
        if (this.wasmModule && this.n > 100) {
            this.runRSKWASM();
        } else {
            for (let i = 0; i < this.n; i++) {
                this.insertRSK(this.permutation[i], i + 1, false);
            }
            
            const stepInfo = document.getElementById('step-info');
            stepInfo.innerHTML = `RSK algorithm completed!<br>Shape: [${this.pTableau.map(row => row.length).join(', ')}]`;
        }
    }
    
    runRSKWASM() {
        const stepInfo = document.getElementById('step-info');
        stepInfo.innerHTML = 'Running RSK with WASM...';
        
        try {
            // Convert permutation to comma-separated string
            const permStr = this.permutation.join(',');
            
            // Call WASM function
            const performRSK = this.wasmModule.cwrap('performRSK', 'string', ['string']);
            const shapeStr = performRSK(permStr);
            
            if (!shapeStr) {
                throw new Error('WASM function returned null - possible memory allocation failure');
            }
            
            // Parse shape
            const shape = shapeStr.split(',').map(x => parseInt(x));
            
            // Build tableaux from WASM data
            this.pTableau = [];
            this.qTableau = [];
            
            const getTableauEntry = this.wasmModule.cwrap('getTableauEntry', 'number', ['number', 'number', 'number']);
            
            for (let row = 0; row < shape.length; row++) {
                this.pTableau[row] = [];
                this.qTableau[row] = [];
                for (let col = 0; col < shape[row]; col++) {
                    const pEntry = getTableauEntry(0, row, col);
                    const qEntry = getTableauEntry(1, row, col);
                    
                    if (pEntry === -1 || qEntry === -1) {
                        throw new Error(`Invalid tableau entry at (${row}, ${col})`);
                    }
                    
                    this.pTableau[row][col] = pEntry;
                    this.qTableau[row][col] = qEntry;
                }
            }
            
            // Free the allocated string
            this.wasmModule._freeString(shapeStr);
            
            this.drawTableau('p-tableau', this.pTableau);
            this.drawTableau('q-tableau', this.qTableau);
            
            stepInfo.innerHTML = `RSK algorithm completed (WASM)!<br>Shape: [${shape.slice(0, 20).join(', ')}${shape.length > 20 ? '...' : ''}]<br>Total boxes: ${shape.reduce((a, b) => a + b, 0)}`;
            
        } catch (error) {
            console.error('WASM RSK error:', error);
            stepInfo.innerHTML = `WASM error: ${error.message}<br>Falling back to JavaScript implementation...`;
            
            // Fallback to JavaScript implementation
            this.pTableau = [];
            this.qTableau = [];
            
            for (let i = 0; i < this.n; i++) {
                this.insertRSK(this.permutation[i], i + 1, false);
            }
            
            stepInfo.innerHTML += `<br>Completed with JavaScript fallback!`;
        }
    }
    
    handleStepRSK() {
        if (this.isRunning) {
            // Stop animation and switch to step mode
            this.switchingToStepMode = true;
        } else {
            // Regular step mode
            this.stepRSK();
        }
    }
    
    stepRSK() {
        if (this.currentStep >= this.n) {
            alert('RSK algorithm completed!');
            return;
        }
        
        document.getElementById('step-info-section').style.display = 'block';
        
        // Use detailed bumps for step mode regardless of N, but show trajectory for large N
        const showTrajectory = this.n > 200;
        this.insertRSK(this.permutation[this.currentStep], this.currentStep + 1, showTrajectory, !showTrajectory);
        this.currentStep++;
        
        const stepInfo = document.getElementById('step-info');
        stepInfo.innerHTML = `Step ${this.currentStep}/${this.n} completed. Value ${this.permutation[this.currentStep - 1]} inserted.`;
    }
    
    async insertRSK(value, time, animate, showDetailedBumps = true) {
        const stepInfo = document.getElementById('step-info');
        
        if (animate && showDetailedBumps) {
            stepInfo.innerHTML = `Inserting value ${value} at time ${time}`;
        }
        
        // Insert into P-tableau
        let currentValue = value;
        let row = 0;
        const bumpingPath = []; // Track the path for fast mode
        
        while (currentValue !== null) {
            if (!this.pTableau[row]) {
                this.pTableau[row] = [];
            }
            
            let inserted = false;
            for (let col = 0; col < this.pTableau[row].length; col++) {
                if (this.pTableau[row][col] > currentValue) {
                    // Bump this value
                    const temp = this.pTableau[row][col];
                    this.pTableau[row][col] = currentValue;
                    currentValue = temp;
                    
                    bumpingPath.push({row, col, value: currentValue, action: 'bump'});
                    
                    if (animate && showDetailedBumps) {
                        stepInfo.innerHTML += `<br>Row ${row + 1}: ${currentValue} bumps ${temp}`;
                        this.drawTableau('p-tableau', this.pTableau, {row, col, type: 'bumped'});
                        await this.sleep(this.animationSpeed);
                    }
                    
                    inserted = true;
                    break;
                }
            }
            
            if (!inserted) {
                // Add to end of row
                this.pTableau[row].push(currentValue);
                bumpingPath.push({row, col: this.pTableau[row].length - 1, value: currentValue, action: 'insert'});
                
                if (animate && showDetailedBumps) {
                    stepInfo.innerHTML += `<br>Row ${row + 1}: ${currentValue} added to end`;
                    this.drawTableau('p-tableau', this.pTableau, {row, col: this.pTableau[row].length - 1, type: 'inserting'});
                    await this.sleep(this.animationSpeed);
                }
                
                // Record in Q-tableau
                if (!this.qTableau[row]) {
                    this.qTableau[row] = [];
                }
                this.qTableau[row].push(time);
                
                currentValue = null;
            }
            
            row++;
        }
        
        // Fast mode: show the bumping trajectory
        if (animate && !showDetailedBumps && bumpingPath.length > 0) {
            // Highlight all cells in the bumping trajectory
            const trajectoryHighlights = bumpingPath.map(step => ({
                row: step.row, 
                col: step.col, 
                type: 'trajectory'
            }));
            
            this.drawTableau('p-tableau', this.pTableau, trajectoryHighlights);
            await this.sleep(Math.max(this.animationSpeed / 2, 100)); // Quick but visible
        }
        
        this.drawTableau('p-tableau', this.pTableau);
        this.drawTableau('q-tableau', this.qTableau);
    }
    
    drawTableau(containerId, tableau, highlight = null) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (tableau.length === 0) return;
        
        // For very large tableaux, draw the shape as a filled region
        if (this.n > 500) {
            const shape = tableau.map(row => row.length);
            const gridSize = 200;
            const margin = 10;
            
            const svg = d3.select(container)
                .append('svg')
                .attr('width', gridSize + 2 * margin)
                .attr('height', gridSize + 2 * margin);
            
            const g = svg.append('g')
                .attr('transform', `translate(${margin}, ${margin})`);
            
            // Calculate scale
            const maxRow = shape[0] || 0;
            const numRows = shape.length;
            const scale = Math.min(gridSize / maxRow, gridSize / numRows);
            
            // Draw background
            g.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', gridSize)
                .attr('height', gridSize)
                .attr('fill', 'var(--bg-secondary, #f5f5f5)')
                .attr('stroke', 'var(--border-color, #ddd)');
            
            // Draw the Young diagram shape
            const pathData = [];
            pathData.push(`M 0 0`);
            
            // Top edge
            pathData.push(`L ${shape[0] * scale} 0`);
            
            // Right edges going down
            for (let i = 0; i < shape.length; i++) {
                pathData.push(`L ${shape[i] * scale} ${(i + 1) * scale}`);
                if (i < shape.length - 1 && shape[i] > shape[i + 1]) {
                    pathData.push(`L ${shape[i + 1] * scale} ${(i + 1) * scale}`);
                }
            }
            
            // Bottom edge
            pathData.push(`L 0 ${numRows * scale}`);
            
            // Close path
            pathData.push('Z');
            
            g.append('path')
                .attr('d', pathData.join(' '))
                .attr('fill', 'var(--text-primary, #333)')
                .attr('opacity', 0.8);
            
            // Draw trajectory highlights if present
            if (highlight && Array.isArray(highlight)) {
                highlight.forEach(h => {
                    if (h.row < shape.length && h.col < shape[h.row]) {
                        g.append('circle')
                            .attr('cx', h.col * scale + scale/2)
                            .attr('cy', h.row * scale + scale/2)
                            .attr('r', Math.max(scale/3, 2))
                            .attr('fill', '#e91e63')
                            .attr('stroke', '#ad1457')
                            .attr('stroke-width', 2);
                    }
                });
            }
            
            // Add info text
            container.insertAdjacentHTML('beforeend', 
                `<div style="font-size: 12px; color: var(--text-secondary, #666); margin-top: 5px;">
                    Shape: [${shape.slice(0, 10).join(', ')}${shape.length > 10 ? '...' : ''}]<br>
                    Rows: ${shape.length}, Boxes: ${shape.reduce((a, b) => a + b, 0)}
                </div>`);
            
            return;
        }
        
        const maxDisplaySize = 50; // Maximum cells to display in each direction
        const truncated = tableau.length > maxDisplaySize || (tableau[0] && tableau[0].length > maxDisplaySize);
        
        const cellSize = this.n > 100 ? 20 : 40;
        const padding = 5;
        
        const displayRows = Math.min(tableau.length, maxDisplaySize);
        const maxCols = Math.min(Math.max(...tableau.slice(0, displayRows).map(row => row.length)), maxDisplaySize);
        
        const svg = d3.select(container)
            .append('svg')
            .attr('width', maxCols * cellSize + 2 * padding)
            .attr('height', displayRows * cellSize + 2 * padding);
        
        const g = svg.append('g')
            .attr('transform', `translate(${padding}, ${padding})`);
        
        tableau.slice(0, displayRows).forEach((row, rowIdx) => {
            row.slice(0, maxDisplaySize).forEach((value, colIdx) => {
                // Check for highlighting (single highlight object or array of highlights)
                let highlightType = '';
                if (highlight) {
                    if (Array.isArray(highlight)) {
                        // Multiple highlights (trajectory mode)
                        const matchingHighlight = highlight.find(h => h.row === rowIdx && h.col === colIdx);
                        if (matchingHighlight) {
                            highlightType = matchingHighlight.type;
                        }
                    } else {
                        // Single highlight
                        if (highlight.row === rowIdx && highlight.col === colIdx) {
                            highlightType = highlight.type;
                        }
                    }
                }
                
                g.append('rect')
                    .attr('x', colIdx * cellSize)
                    .attr('y', rowIdx * cellSize)
                    .attr('width', cellSize)
                    .attr('height', cellSize)
                    .attr('class', `tableau-cell filled ${highlightType}`);
                
                if (this.n <= 200) {
                    g.append('text')
                        .attr('x', colIdx * cellSize + cellSize / 2)
                        .attr('y', rowIdx * cellSize + cellSize / 2)
                        .attr('class', 'tableau-text')
                        .style('font-size', cellSize > 30 ? '16px' : '12px')
                        .text(value);
                }
            });
        });
        
        if (truncated) {
            container.insertAdjacentHTML('beforeend', 
                '<div style="font-size: 12px; color: var(--text-secondary, #666); margin-top: 5px;">Tableau truncated for display</div>');
        }
    }
    
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize visualization
const rsk = new RSKVisualization();
</script>
