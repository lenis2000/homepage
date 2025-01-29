---
title: BBP transition
model: random-matrices
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/random-matrices/2025-01-28-BBP-transition.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/random-matrices/2025-01-28-BBP-transition.cpp'
    txt: 'C++ code for the simulation'
---

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="{{site.url}}/js/2025-01-28-BBP-transition.js"></script>

<div class="row">
  <div class="col-12 mb-3">
    <p>
      This simulation uses <code>WebAssembly</code> and the <code>Eigen</code> library to compute eigenvalues
      of a (modified) Gaussian Orthogonal Ensemble (GOE) matrix. We introduce a rank-1 perturbation governed by
      a parameter $\theta$:
      $$A\mapsto A + \theta \cdot e_1e_1^T,$$ where $A$ is the original GOE matrix, and $e_1$ is the first basis vector.
      There is the <a href="https://arxiv.org/abs/math/0403022">BBP</a> phase transition phenomenon: for large enough $|\theta|$,
      the top eigenvalue “spikes” out of the traditional GOE spectrum.
    </p>
  </div>
</div>

<div class="row">
  <!-- Controls -->
  <div class="col-12 col-lg-8">
    <div class="controls mb-3">
      <label for="nInput">$N$:</label>
      <input id="nInput" type="range" min="2" max="2000" step="1" value="100" />
      <span id="nValue">100</span>&nbsp;

      <button id="runBtn" class="btn btn-primary">Set $N$ and resample matrix</button>

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <label for="thetaInput">θ:</label>
      <input id="thetaInput" type="range" min="-10" max="10" step="0.01" value="0" />
      <span id="thetaValue">0</span>
      <button id="decreaseTheta" class="btn btn-sm btn-secondary">-0.01</button>
      <button id="increaseTheta" class="btn btn-sm btn-secondary">+0.01</button>
    </div>
  </div>
</div>

<div class="row">
  <!-- Matrix corner display -->
  <div class="col-12 col-lg-8 mb-3">
    <h5>Upper 10×10 Corner of Matrix:</h5>
    <div id="matrixCorner" style="font-family: monospace; white-space: pre"></div>
  </div>
</div>

<!-- Three columns for top, zero, and lowest eigenvalues -->
<div class="row">

  <div id="lowestEigenvals" class="mb-3 col-12 col-lg-4">
      <h5>Lowest 5 Eigenvalues:</h5>
      <ol id="eigenvalList_lowest">
          <!-- Populated by JavaScript -->
      </ol>
  </div>
  <div id="zeroEigenvals" class="mb-3 col-12 col-lg-4">
      <h5>5 Eigenvalues around zero:</h5>
      <ol id="eigenvalList_zero">
          <!-- Populated by JavaScript -->
      </ol>
  </div>
  <div id="topEigenvals" class="mb-3 col-12 col-lg-4">
      <h5>Top 5 Eigenvalues:</h5>
      <ol id="eigenvalList">
          <!-- Populated by JavaScript -->
      </ol>
  </div>
</div>

<!-- Row with three point-process plots: top, zero, and lowest -->
<div class="row">
    <div class="col-12 col-lg-4">
      <h5 class="mt-4">Lowest 10 Eigenvalues:</h5>
      <svg id="lowest10EigenvalsPlot" width="100%" style="min-height: 300px;"></svg>
    </div>
  <div class="col-12 col-lg-4">
    <h5 class="mt-4">20 Eigenvalues Around Zero:</h5>
    <svg id="zero20EigenvalsPlot" width="100%" style="min-height: 300px;"></svg>
  </div>
  <div class="col-12 col-lg-4">
    <h5 class="mt-4">Top 10 Eigenvalues:</h5>
    <svg id="top10EigenvalsPlot" width="100%" style="min-height: 300px;"></svg>
  </div>
</div>

<div class="row align-items-center mb-3">
  <div class="col-12">
    <div class="controls">
      <label for="nInput2">$N$:</label>
      <input id="nInput2" type="range" min="2" max="1000" step="1" value="100" />
      <span id="nValue2">100</span>&nbsp;
      <button id="runBtn2" class="btn btn-primary">Set $N$  and resample matrix</button>

      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <label for="thetaInput2">θ:</label>
      <input id="thetaInput2" type="range" min="-10" max="10" step="0.01" value="0" />
      <span id="thetaValue2">0</span>
      <button id="decreaseTheta2" class="btn btn-sm btn-secondary">-0.01</button>
      <button id="increaseTheta2" class="btn btn-sm btn-secondary">+0.01</button>
    </div>
  </div>
</div>

<div class="row align-items-center">
  <!-- Histogram on the left -->
  <div class="col-12">
      <h5>Histogram of eigenvalues:</h5>
      <svg id="plot" width="100%" style="min-height: 400px;"></svg>
  </div>

</div>

<script>
    async function initWasm() {
        try {
            // Wait for the Module to be ready
            await new Promise((resolve) => {
                if (Module.ready) resolve();
                else Module.onRuntimeInitialized = resolve;
            });

            // Set initial slider values
            document.getElementById("nInput").value = 100;
            document.getElementById("nValue").textContent = 100;
            document.getElementById("thetaInput").value = 0;
            document.getElementById("thetaValue").textContent = 0;

            // Also sync second set
            document.getElementById("nInput2").value = 100;
            document.getElementById("nValue2").textContent = 100;
            document.getElementById("thetaInput2").value = 0;
            document.getElementById("thetaValue2").textContent = 0;

            runSimulation(); // auto-run once the WASM is ready

        } catch (error) {
            console.error('Failed to load WASM:', error);
            document.body.innerHTML += `<p style="color: red">Error loading WASM: ${error.message}</p>`;
        }
    }

    function displayMatrixCorner() {
        // Get the corner data from WASM
        const cornerPtr = Module._getMatrixCorner();
        const cornerSize = Module._getCornerSize();
        const cornerData = new Float64Array(Module.HEAPF64.buffer, cornerPtr, 100); // 10x10 array

        // Format the corner as a string
        let output = '';
        for (let i = 0; i < cornerSize; i++) {
            for (let j = 0; j < cornerSize; j++) {
                output += cornerData[i * 10 + j].toFixed(3).padStart(8) + ' ';
            }
            output += '\n';
        }

        // Display in the div
        document.getElementById('matrixCorner').textContent = output;
    }

    function runSimulation() {
        // We'll rely on the first set of sliders as the canonical source for N & theta
        const N = parseInt(document.getElementById("nInput").value, 10);
        const theta = parseFloat(document.getElementById("thetaInput").value);

        // Update the WASM side with current theta
        Module.ccall('setTheta', null, ['number'], [theta]);

        const eigenvals = getEigenvalues(N);

        drawHistogram(eigenvals);
        displayTopEigenvalues(eigenvals);
        displayEigenvaluesAroundZero(eigenvals);
        displayLowestEigenvalues(eigenvals);

        // Update matrix corner display
        displayMatrixCorner();

        // Draw top 10 as a point process with tooltips
        const top10 = getTop10Eigenvals(eigenvals);
        drawEigenvaluePointProcess(top10, "#top10EigenvalsPlot", "Top 10 Eigenvalues");

        // Draw 20 around zero as a point process
        const zero20 = getZero20Eigenvals(eigenvals);
        drawEigenvaluePointProcess(zero20, "#zero20EigenvalsPlot", "20 Around Zero");

        // Draw lowest 10 as a point process
        const lowest10 = getLowest10Eigenvals(eigenvals);
        drawEigenvaluePointProcess(lowest10, "#lowest10EigenvalsPlot", "Lowest 10 Eigenvalues");
    }

    function getEigenvalues(N) {
        if (!Module || !Module._computeEigenvalues) return [];
        try {
            const ptr = Module._computeEigenvalues(N);
            return Array.from(new Float64Array(Module.HEAPF64.buffer, ptr, N));
        } catch (error) {
            console.error('Error computing eigenvalues:', error);
            return [];
        }
    }

    // Create a histogram of the eigenvalues
    function drawHistogram(eigenvals) {
        const svg = d3.select("#plot");
        svg.selectAll("*").remove();

        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const width = svg.node().getBoundingClientRect().width;
        const height = svg.node().getBoundingClientRect().height;

        const xScale = d3.scaleLinear()
            .domain([-4, 4])
            .range([margin.left, width - margin.right]);

        const N = eigenvals.length;
        const numBins = N <= 100 ? 20 : 80;
        const bins = d3.bin()
            .domain(xScale.domain())
            .thresholds(numBins)(eigenvals);

        const binWidth = (bins[0].x1 - bins[0].x0);
        const totalArea = N * binWidth;
        const normalizedBins = bins.map(bin => ({
            ...bin,
            normalizedLength: bin.length / totalArea
        }));

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(normalizedBins, d => d.normalizedLength)])
            .range([height - margin.bottom, margin.top]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale));
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale));

        // Bars
        svg.selectAll(".bar")
            .data(normalizedBins)
            .join("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.x0))
            .attr("width", d => xScale(d.x1) - xScale(d.x0))
            .attr("y", d => yScale(d.normalizedLength))
            .attr("height", d => yScale(0) - yScale(d.normalizedLength))
            .attr("fill", "#00204E");

        // Semicircle overlay (approx Wigner semicircle for GOE)
        const semicircleData = Array.from({ length: 200 }, (_, i) => {
            const x = -2 + (i / 199) * 4;
            const y = Math.abs(x) <= 2 ? Math.sqrt(4 - x ** 2) / (2 * Math.PI) : 0;
            return { x, y };
        });

        const line = d3.line()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .curve(d3.curveBasis);

        svg.append("path")
            .datum(semicircleData)
            .attr("fill", "none")
            .attr("stroke", "#F56C26")
            .attr("stroke-width", 1.5)
            .attr("d", line);
    }

    function displayTopEigenvalues(eigenvals) {
        const topList = eigenvals.slice().sort((a, b) => b - a).slice(0, 5);
        const listElement = document.getElementById("eigenvalList");
        listElement.innerHTML = "";
        topList.forEach(val => {
            const li = document.createElement("li");
            li.textContent = val.toFixed(4);
            listElement.appendChild(li);
        });
    }

    function displayEigenvaluesAroundZero(eigenvals) {
        const sortedEigenvals = eigenvals.slice().sort((a, b) => a - b);
        const zeroIndex = sortedEigenvals.findIndex(x => x >= 0);

        const startIndex = Math.max(0, zeroIndex - 2);
        const endIndex   = Math.min(sortedEigenvals.length, zeroIndex + 3);
        const values = sortedEigenvals.slice(startIndex, endIndex);

        const listElement = document.getElementById("eigenvalList_zero");
        listElement.innerHTML = "";
        values.forEach(val => {
            const li = document.createElement("li");
            li.textContent = val.toFixed(4);
            listElement.appendChild(li);
        });
    }

    function displayLowestEigenvalues(eigenvals) {
        const sortedEigenvals = eigenvals.slice().sort((a, b) => a - b);
        const lowestList = sortedEigenvals.slice(0, 5);
        const listElement = document.getElementById("eigenvalList_lowest");
        listElement.innerHTML = "";
        lowestList.forEach(val => {
            const li = document.createElement("li");
            li.textContent = val.toFixed(4);
            listElement.appendChild(li);
        });
    }

    // Extract 10 largest eigenvalues
    function getTop10Eigenvals(eigenvals) {
        return eigenvals.slice().sort((a, b) => b - a).slice(0, 10);
    }

    // Extract 20 eigenvalues around zero
    function getZero20Eigenvals(eigenvals) {
        const sorted = eigenvals.slice().sort((a, b) => a - b);
        const zeroIndex = sorted.findIndex(x => x >= 0);
        const startIndex = Math.max(0, zeroIndex - 10);
        const endIndex   = Math.min(sorted.length, zeroIndex + 10);
        return sorted.slice(startIndex, endIndex);
    }

    // Extract 10 lowest eigenvalues
    function getLowest10Eigenvals(eigenvals) {
        return eigenvals.slice().sort((a, b) => a - b).slice(0, 10);
    }

    // Draw a point process scatterplot + tooltips
    function drawEigenvaluePointProcess(eigenvalsSubset, containerId, title) {
        const svg = d3.select(containerId);
        svg.selectAll("*").remove();

        const margin = { top: 20, right: 30, bottom: 30, left: 50 };
        const width = svg.node().getBoundingClientRect().width;
        const height = svg.node().getBoundingClientRect().height;

        const xScale = d3.scaleBand()
            .domain(eigenvalsSubset.map((_, i) => i.toString()))
            .range([margin.left, width - margin.right])
            .padding(0.2);

        const minVal = d3.min(eigenvalsSubset);
        const maxVal = d3.max(eigenvalsSubset);
        const yScale = d3.scaleLinear()
            .domain([minVal, maxVal])
            .nice()
            .range([height - margin.bottom, margin.top]);

        // Axes
        const xAxis = d3.axisBottom(xScale).tickFormat(i => +i + 1);
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(xAxis);
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale));

        // Title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text(title);

        // Tooltip
        const tooltip = d3.select("body")
          .append("div")
          .style("position", "absolute")
          .style("padding", "6px")
          .style("background", "white")
          .style("border", "1px solid #ccc")
          .style("border-radius", "4px")
          .style("pointer-events", "none")
          .style("display", "none");

        // Points
        svg.selectAll("circle")
            .data(eigenvalsSubset)
            .join("circle")
            .attr("cx", (_, i) => xScale(i.toString()) + xScale.bandwidth() / 2)
            .attr("cy", d => yScale(d))
            .attr("r", 5)
            .attr("fill", "#8B0000")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("fill", "orange");
                tooltip.style("display", "block")
                       .html(`Eigenvalue: ${d.toFixed(4)}`);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", (event.pageY + 10) + "px")
                       .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseleave", function () {
                d3.select(this).attr("fill", "#8B0000");
                tooltip.style("display", "none");
            });

        // Optional horizontal line at y=0
        if (minVal < 0 && maxVal > 0) {
            svg.append("line")
                .attr("x1", margin.left)
                .attr("x2", width - margin.right)
                .attr("y1", yScale(0))
                .attr("y2", yScale(0))
                .attr("stroke", "#333")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "3,3");
        }
    }

    // -----------------------------------------------------------
    // N Sliders & Buttons
    // -----------------------------------------------------------

    // 1) "Set N" button #1: force resample
    document.getElementById("runBtn").addEventListener("click", () => {
        Module.ccall('setForceResample', null, ['number'], [1]);
        runSimulation();
    });

    // 2) "Set N" button #2: also force resample
    document.getElementById("runBtn2").addEventListener("click", () => {
        Module.ccall('setForceResample', null, ['number'], [1]);
        runSimulation();
    });

    // 3) Slider #1 for N => update its displayed label & sync #2
    document.getElementById("nInput").addEventListener("input", (e) => {
        const value = e.target.value;
        document.getElementById("nValue").textContent = value;

        // Now sync second slider & label
        document.getElementById("nInput2").value = value;
        document.getElementById("nValue2").textContent = value;
    });

    // 4) Slider #2 for N => update its displayed label & sync #1
    document.getElementById("nInput2").addEventListener("input", (e) => {
        const value = e.target.value;
        document.getElementById("nValue2").textContent = value;

        // Now sync first slider & label
        document.getElementById("nInput").value = value;
        document.getElementById("nValue").textContent = value;
    });

    // -----------------------------------------------------------
    // Theta Sliders & ±0.01 Buttons
    // -----------------------------------------------------------

    // 1) First Theta slider => sync second
    document.getElementById("thetaInput").addEventListener("input", (e) => {
        const value = e.target.value;
        document.getElementById("thetaValue").textContent = value;

        // Sync second slider & label
        document.getElementById("thetaInput2").value = value;
        document.getElementById("thetaValue2").textContent = value;

        runSimulation();
    });

    // 2) Second Theta slider => sync first
    document.getElementById("thetaInput2").addEventListener("input", (e) => {
        const value = e.target.value;
        document.getElementById("thetaValue2").textContent = value;

        // Sync first slider & label
        document.getElementById("thetaInput").value = value;
        document.getElementById("thetaValue").textContent = value;

        runSimulation();
    });

    // 3) First Theta +0.01 button
    document.getElementById("increaseTheta").addEventListener("click", () => {
        const thetaInput = document.getElementById("thetaInput");
        let currentTheta = parseFloat(thetaInput.value);
        const newTheta = Math.min(10, currentTheta + 0.01);

        // Update #1 slider + label
        thetaInput.value = newTheta;
        document.getElementById("thetaValue").textContent = newTheta.toFixed(2);

        // Sync #2 slider + label
        document.getElementById("thetaInput2").value = newTheta;
        document.getElementById("thetaValue2").textContent = newTheta.toFixed(2);

        runSimulation();
    });

    // 4) First Theta -0.01 button
    document.getElementById("decreaseTheta").addEventListener("click", () => {
        const thetaInput = document.getElementById("thetaInput");
        let currentTheta = parseFloat(thetaInput.value);
        const newTheta = Math.max(-10, currentTheta - 0.01);

        // Update #1 slider + label
        thetaInput.value = newTheta;
        document.getElementById("thetaValue").textContent = newTheta.toFixed(2);

        // Sync #2 slider + label
        document.getElementById("thetaInput2").value = newTheta;
        document.getElementById("thetaValue2").textContent = newTheta.toFixed(2);

        runSimulation();
    });

    // 5) Second Theta +0.01 button
    document.getElementById("increaseTheta2").addEventListener("click", () => {
        const thetaInput = document.getElementById("thetaInput2");
        let currentTheta = parseFloat(thetaInput.value);
        const newTheta = Math.min(10, currentTheta + 0.01);

        // Update #2 slider + label
        thetaInput.value = newTheta;
        document.getElementById("thetaValue2").textContent = newTheta.toFixed(2);

        // Sync #1 slider + label
        document.getElementById("thetaInput").value = newTheta;
        document.getElementById("thetaValue").textContent = newTheta.toFixed(2);

        runSimulation();
    });

    // 6) Second Theta -0.01 button
    document.getElementById("decreaseTheta2").addEventListener("click", () => {
        const thetaInput = document.getElementById("thetaInput2");
        let currentTheta = parseFloat(thetaInput.value);
        const newTheta = Math.max(-10, currentTheta - 0.01);

        // Update #2 slider + label
        thetaInput.value = newTheta;
        document.getElementById("thetaValue2").textContent = newTheta.toFixed(2);

        // Sync #1 slider + label
        document.getElementById("thetaInput").value = newTheta;
        document.getElementById("thetaValue").textContent = newTheta.toFixed(2);

        runSimulation();
    });

    // Initialize WASM after DOM loads
    document.addEventListener('DOMContentLoaded', () => {
        // Values are already initialized above
    });

    // Start everything
    initWasm();
</script>
