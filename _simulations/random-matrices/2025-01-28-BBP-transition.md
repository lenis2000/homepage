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
      a parameter <code>θ</code> to demonstrate the BBP phase transition phenomenon: for large enough <code>θ</code>,
      the top eigenvalue “spikes” out of the traditional GOE spectrum.
    </p>
  </div>
</div>

<div class="row">
  <!-- Controls -->
  <div class="col-12 col-lg-8">
    <div class="controls mb-3">
      <label for="nInput">Matrix size N:</label>
      <input id="nInput" type="range" min="2" max="2000" step="1" value="50" />
      <span id="nValue">50</span>
      <button id="runBtn" class="btn btn-primary">Generate & Plot Eigenvalues</button>
    </div>
  </div>
</div>

<div class="row">
  <!-- Top & zero eigenvalue listings -->
  <div id="topEigenvals" class="mb-3 col-6 col-lg-6">
      <h5>Top 5 Eigenvalues:</h5>
      <ol id="eigenvalList">
          <!-- Populated by JavaScript -->
      </ol>
  </div>
  <div id="zeroEigenvals" class="mb-3 col-6 col-lg-6">
      <h5>5 Eigenvalues around zero:</h5>
      <ol id="eigenvalList_zero">
          <!-- Populated by JavaScript -->
      </ol>
  </div>
</div>

<!-- Row 4 with the new theta control and the point processes -->
<div class="row">
  <div class="col-12 col-lg-6">
    <h5 class="mt-4">Top 10 Eigenvalues (Point Process):</h5>
    <svg id="top10EigenvalsPlot" width="100%" style="min-height: 300px;"></svg>
  </div>

  <div class="col-12 col-lg-6">
    <h5 class="mt-4">20 Eigenvalues Around Zero (Point Process):</h5>
    <svg id="zero20EigenvalsPlot" width="100%" style="min-height: 300px;"></svg>
  </div>

  <!-- NEW theta slider control in row 4 -->
  <div class="col-12 mt-3">
    <label for="thetaInput">θ:</label>
    <input id="thetaInput" type="range" min="-3" max="3" step="0.05" value="0" />
    <span id="thetaValue">0</span>
  </div>
</div>

<div class="row align-items-center">
  <!-- Histogram on the left -->
  <div class="col-12 col-lg-6">
      <h5>Histogram of eigenvalues:</h5>
      <svg id="plot" width="100%" style="min-height: 400px;"></svg>
  </div>

  <!-- Heatmap on the right -->
  <div class="col-12 col-lg-6" style="min-height: 400px;">
      <h5>Heatmap of matrix elements:</h5>
      <div id="heatmap" style="margin-top: 1rem;"></div>
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

            // Auto-generate once after loading
            document.getElementById("nInput").value = 100;
            document.getElementById("nValue").textContent = 100;
            document.getElementById("thetaInput").value = 0;
            document.getElementById("thetaValue").textContent = 0;

            runSimulation(); // auto-run once the WASM is ready

        } catch (error) {
            console.error('Failed to load WASM:', error);
            document.body.innerHTML += `<p style="color: red">Error loading WASM: ${error.message}</p>`;
        }
    }

    function runSimulation() {
        const N = parseInt(document.getElementById("nInput").value, 10);
        const theta = parseFloat(document.getElementById("thetaInput").value);

        // Update the WASM side with current theta
        Module.ccall('setTheta', null, ['number'], [theta]);

        const eigenvals = getEigenvalues(N);

        drawHistogram(eigenvals);
        displayTopEigenvalues(eigenvals);
        displayEigenvaluesAroundZero(eigenvals);

        // Render aggregated heatmap
        drawHeatmap();

        // Draw top 10 as a point process with tooltips
        const top10 = getTop10Eigenvals(eigenvals);
        drawEigenvaluePointProcess(top10, "#top10EigenvalsPlot", "Top 10 Eigenvalues");

        // Draw 20 around zero as a point process with tooltips
        const zero20 = getZero20Eigenvals(eigenvals);
        drawEigenvaluePointProcess(zero20, "#zero20EigenvalsPlot", "20 Around Zero");
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

    // Not strictly needed for the heatmap but left here for reference
    function getMatrixData() {
        const N = Module._getCurrentN();
        const ptr = Module._getMatrixData();
        return Array.from(new Float64Array(Module.HEAPF64.buffer, ptr, N * N));
    }

    // Create a histogram of the eigenvalues
    function drawHistogram(eigenvals) {
        const svg = d3.select("#plot");
        svg.selectAll("*").remove();

        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const width = svg.node().getBoundingClientRect().width;
        const height = svg.node().getBoundingClientRect().height;

        const xScale = d3.scaleLinear()
            .domain([-2.5, 2.5])
            .range([margin.left, width - margin.right]);

        const N = eigenvals.length;
        const numBins = N <= 100 ? 10 : 40;
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

        // Semicircle overlay (Wigner semicircle distribution for GOE)
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

    // Extract 10 largest eigenvalues
    function getTop10Eigenvals(eigenvals) {
        return eigenvals.slice().sort((a, b) => b - a).slice(0, 10);
    }

    // Extract 20 eigenvalues around zero
    function getZero20Eigenvals(eigenvals) {
        const sorted = eigenvals.slice().sort((a, b) => a - b);
        const zeroIndex = sorted.findIndex(x => x >= 0);

        // We want 10 below zero and 10 above zero if possible
        const startIndex = Math.max(0, zeroIndex - 10);
        const endIndex   = Math.min(sorted.length, zeroIndex + 10);
        return sorted.slice(startIndex, endIndex);
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

    // Draw a heatmap image using RGBA data aggregated in C++
    function drawHeatmap() {
        const dim = Module._getHeatMapDim();
        const ptr = Module._getHeatMapData();
        if (!ptr || dim <= 0) return;

        const heatmapArray = new Uint8ClampedArray(Module.HEAPU8.buffer, ptr, 4 * dim * dim);

        const container = d3.select("#heatmap");
        container.selectAll("*").remove();

        const scalePixels = 400;
        const canvas = container.append("canvas")
            .attr("width", dim)
            .attr("height", dim)
            .style("width", scalePixels + "px")
            .style("height", scalePixels + "px")
            .node();

        const ctx = canvas.getContext("2d");
        const imageData = new ImageData(heatmapArray, dim, dim);
        ctx.putImageData(imageData, 0, 0);
    }

    // Button to resample
    document.getElementById("runBtn").addEventListener("click", () => {
        runSimulation();
    });

    // Slider for N
    document.getElementById("nInput").addEventListener("input", (e) => {
        document.getElementById("nValue").textContent = e.target.value;
    });

    // Slider for theta
    document.getElementById("thetaInput").addEventListener("input", (e) => {
        document.getElementById("thetaValue").textContent = e.target.value;
    });

    // Initialize WASM after page loads
    initWasm();
</script>
