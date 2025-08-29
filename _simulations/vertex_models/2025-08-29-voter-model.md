---
title: Voter Model
model: vertex-models
author: Alexei Borodin and Alexei Bufetov (request); Leonid Petrov (implementation)
---

The voter model on a 1D lattice where each site adopts the color of its left neighbor according to independent exponential clocks.

<div style="margin: 20px 0;">
    <label for="n-input">N (lattice size: -N to N): </label>
    <input type="number" id="n-input" value="10" min="1" max="2000" style="width: 60px;">
    <button onclick="setN()">Set N</button>

    <label for="step-size" style="margin-left: 20px;">Step size (1/N seconds): </label>
    <input type="range" id="step-size" value="0.1" min="0.01" max="1" step="0.01" style="width: 150px;">
    <span id="step-size-value">0.1</span>
</div>

<div style="margin: 20px 0;">
    <button id="run-stop-btn" onclick="toggleSimulation()">Run</button>
    <button onclick="stepSimulation()">Step</button>
    <button onclick="resetSimulation()">Reset</button>
</div>

<canvas id="voterCanvas" width="800" height="200" style="border: 1px solid #ccc; display: block; margin: 20px auto;"></canvas>

<div id="info" style="text-align: center; margin: 20px;">
    Time: <span id="time-display">0.00</span>
</div>

<script>
class VoterModel {
    constructor(N) {
        this.N = N;
        this.latticeSize = 2 * N + 1; // Sites from -N to N
        this.sites = new Array(this.latticeSize);
        this.clocks = new Array(this.latticeSize);
        this.time = 0;
        this.isRunning = false;
        this.animationId = null;
        this.lastUpdate = Date.now();

        this.canvas = document.getElementById('voterCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initializeLattice();
        this.draw();
    }

    initializeLattice() {
        // Initialize sites with rainbow colors
        for (let i = 0; i < this.latticeSize; i++) {
            const position = i - this.N; // Convert to -N to N
            const hue = (i / (this.latticeSize - 1)) * 360; // Rainbow across the lattice
            this.sites[i] = `hsl(${hue}, 80%, 60%)`;

            // Initialize exponential clocks
            this.clocks[i] = this.generateExponentialTime();
        }
        this.time = 0;
        this.updateTimeDisplay();
    }

    generateExponentialTime() {
        // Generate exponential random variable with rate 1
        return -Math.log(Math.random());
    }

    step() {
        // Find the site with the minimum clock time
        let minTime = Infinity;
        let minSite = 0;

        for (let i = 0; i < this.latticeSize; i++) {
            if (this.clocks[i] < minTime) {
                minTime = this.clocks[i];
                minSite = i;
            }
        }

        // Advance time
        const deltaTime = minTime;
        this.time += deltaTime;

        // Subtract the elapsed time from all clocks
        for (let i = 0; i < this.latticeSize; i++) {
            this.clocks[i] -= deltaTime;
        }

        // Execute the event at minSite
        this.executeEvent(minSite);

        this.updateTimeDisplay();
    }

    executeEvent(siteIndex) {
        // Site assumes color of left neighbor
        if (siteIndex > 0) {
            this.sites[siteIndex] = this.sites[siteIndex - 1];
        }
        // If siteIndex is 0 (leftmost site), it has no left neighbor, so no change

        // Reset the clock for this site
        this.clocks[siteIndex] = this.generateExponentialTime();
    }

    draw() {
        const canvas = this.canvas;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const siteWidth = canvas.width / this.latticeSize;
        const siteHeight = canvas.height;

        // Draw the lattice sites
        for (let i = 0; i < this.latticeSize; i++) {
            ctx.fillStyle = this.sites[i];
            ctx.fillRect(i * siteWidth, 0, siteWidth, siteHeight);
        }

        // Draw position labels (max 21 labels)
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        const maxLabels = 21;
        const labelStep = Math.ceil(this.latticeSize / maxLabels);

        for (let i = 0; i < this.latticeSize; i += labelStep) {
            const position = i - this.N;
            const x = i * siteWidth + siteWidth / 2;
            ctx.fillText(position.toString(), x, siteHeight - 10);
        }

        // Always show the rightmost label if it wasn't included
        if ((this.latticeSize - 1) % labelStep !== 0) {
            const position = (this.latticeSize - 1) - this.N;
            const x = (this.latticeSize - 1) * siteWidth + siteWidth / 2;
            ctx.fillText(position.toString(), x, siteHeight - 10);
        }
    }

    run() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastUpdate = Date.now();
        this.updateRunStopButton();

        const animate = () => {
            if (!this.isRunning) return;

            const now = Date.now();
            const elapsed = (now - this.lastUpdate) / 1000; // seconds
            const stepSize = parseFloat(document.getElementById('step-size').value);
            const targetSteps = elapsed / (stepSize / this.N); // Convert step size to simulation time

            if (targetSteps >= 1) {
                for (let i = 0; i < Math.floor(targetSteps); i++) {
                    this.step();
                }
                this.draw();
                this.lastUpdate = now;
            }

            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.updateRunStopButton();
    }

    updateRunStopButton() {
        const btn = document.getElementById('run-stop-btn');
        btn.textContent = this.isRunning ? 'Stop' : 'Run';
    }

    reset() {
        this.stop();
        this.initializeLattice();
        this.draw();
    }

    updateTimeDisplay() {
        document.getElementById('time-display').textContent = this.time.toFixed(3);
    }
}

// Global simulation instance
let simulation = null;

function setN() {
    const N = parseInt(document.getElementById('n-input').value);
    if (N < 1 || N > 2000) {
        alert('Please enter N between 1 and 2000');
        return;
    }

    if (simulation) {
        simulation.stop();
    }

    simulation = new VoterModel(N);
}

function toggleSimulation() {
    if (!simulation) {
        setN();
    }

    if (simulation.isRunning) {
        simulation.stop();
    } else {
        simulation.run();
    }
}

function stepSimulation() {
    if (!simulation) {
        setN();
    }
    simulation.stop();
    simulation.step();
    simulation.draw();
}

function resetSimulation() {
    if (simulation) {
        simulation.reset();
    }
}

// Initialize simulation on page load
window.addEventListener('load', function() {
    setN();

    // Setup step size slider
    const stepSizeSlider = document.getElementById('step-size');
    const stepSizeValue = document.getElementById('step-size-value');

    stepSizeSlider.addEventListener('input', function() {
        stepSizeValue.textContent = this.value;
    });
});
</script>
