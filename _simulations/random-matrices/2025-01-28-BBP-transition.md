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
      This simulation uses <code>WebAssembly</code> and the <code>Eigen</code> library. The visualization is done with <code>d3.js</code>.
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
  <div id="topEigenvals" class="mb-3 col-6 col-lg-3">
      <h5>Top 5 Eigenvalues:</h5>
      <ol id="eigenvalList">
          <!-- Populated by JavaScript -->
      </ol>
  </div>
  <div id="zeroEigenvals" class="mb-3 col-6 col-lg-3">
      <h5>5 Eigenvalues around zero:</h5>
      <ol id="eigenvalList_zero">
          <!-- Populated by JavaScript -->
      </ol>
  </div>
</div>

<div class="row">
  <!-- Histogram on the left -->
  <div class="col-12 col-lg-6">
      <svg id="plot" width="100%" style="min-height: 400px;"></svg>
  </div>

  <!-- Heatmap on the right -->
  <div class="col-12 col-lg-6" style="min-height: 400px;">
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
            // No automatic sampling on page load
        } catch (error) {
            console.error('Failed to load WASM:', error);
            document.body.innerHTML += `<p style="color: red">Error loading WASM: ${error.message}</p>`;
        }
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

    // Not strictly needed for the heatmap anymore but left in place:
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
            .domain([-2.5, 2.5])
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

        // Semicircle overlay (Wigner semicircle distribution)
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
        const values = [
            ...sortedEigenvals.slice(zeroIndex - 2, zeroIndex),
            sortedEigenvals[zeroIndex],
            ...sortedEigenvals.slice(zeroIndex + 1, zeroIndex + 3)
        ];
        const listElement = document.getElementById("eigenvalList_zero");
        listElement.innerHTML = "";
        values.forEach(val => {
            const li = document.createElement("li");
            li.textContent = val.toFixed(4);
            listElement.appendChild(li);
        });
    }

    // Draw a heatmap image using RGBA data aggregated in C++ (max size = 100x100)
    function drawHeatmap() {
        const dim = Module._getHeatMapDim(); // M = min(N, 100)
        const ptr = Module._getHeatMapData();
        if (!ptr || dim <= 0) return;

        // Build a Uint8ClampedArray view over the WASM memory
        const heatmapArray = new Uint8ClampedArray(Module.HEAPU8.buffer, ptr, 4 * dim * dim);

        const container = d3.select("#heatmap");
        container.selectAll("*").remove();

        // Create a canvas for the MxM RGBA image
        // We'll scale it to about 400px for visibility
        const scalePixels = 400;
        const canvas = container.append("canvas")
            .attr("width", dim)
            .attr("height", dim)
            .style("width", scalePixels + "px")
            .style("height", scalePixels + "px")
            .node();

        // Put image data onto the canvas
        const ctx = canvas.getContext("2d");
        const imageData = new ImageData(heatmapArray, dim, dim);
        ctx.putImageData(imageData, 0, 0);
    }

    // Generate & plot on button press
    document.getElementById("runBtn").addEventListener("click", () => {
        const N = parseInt(document.getElementById("nInput").value, 10);
        const eigenvals = getEigenvalues(N);

        drawHistogram(eigenvals);
        displayTopEigenvalues(eigenvals);
        displayEigenvaluesAroundZero(eigenvals);

        // Render aggregated heatmap
        drawHeatmap();
    });

    // Display slider value dynamically
    document.getElementById("nInput").addEventListener("input", (e) => {
        document.getElementById("nValue").textContent = e.target.value;
    });

    // Initialize WASM after page loads
    initWasm();
</script>
