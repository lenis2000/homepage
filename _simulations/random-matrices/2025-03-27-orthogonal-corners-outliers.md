---
title: Corner eigenvalues of random matrices with optional outliers
model: random-matrices
author: 'Your Name'
code:
  - link: 'https://github.com/your-repo/2025-03-27-orthogonal-corners-outliers.md'
    txt: 'This page is an interactive simulation with d3.js + WebAssembly (Emscripten).'
  - link: 'https://github.com/your-repo/2025-03-27-orthogonal-corners-outliers.cpp'
    txt: 'C++ code for the simulation, compile to WebAssembly.'
---

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="{{site.url}}/js/2025-03-27-orthogonal-corners-outliers.js"></script>

<div class="row">
  <div class="col-12 mb-3">
    <p>
      This simulation computes the eigenvalues of successive corners of an \(N \times N\) random matrix, in two regimes:
    </p>
    <ul>
      <li>
        <strong>GUE:</strong> We (informally) generate a random Gaussian matrix (real-symmetric, normalized by \(1/\sqrt{N}\)) and collect corner eigenvalues.
      </li>
      <li>
        <strong>10-Point Atomic Density:</strong> A diagonal matrix with 10 distinct eigenvalues is conjugated by a random Haar orthogonal matrix.
        The 10 distinct points can be adjusted.
      </li>
    </ul>
    <p>
      We have also implemented a third function (not triggered by the interface below) that adds up to 5 outliers (here set to 0).
      One could easily modify the C++ code to allow specifying these outlier values at run-time.
    </p>
  </div>
</div>

<div class="row">
  <div class="col-12">
      <h5>Simulation Regime:</h5>
      <div class="mb-3">
        <label>
          <input type="radio" name="regime" value="atomic" id="regimeAtomic" checked>
          10-Point Atomic Density
        </label>
        &nbsp;&nbsp;
        <label>
          <input type="radio" name="regime" value="gue" id="regimeGUE">
          GUE
        </label>
      </div>
  </div>
</div>

<!-- Discrete density plot container with responsive SVG -->
<div class="row" id="discreteDensityContainer">
  <div class="col-12">
      <h5>10-Point Atomic Density (Drag the red points):</h5>
      <svg id="discreteDensitySVG" viewBox="0 0 600 150" style="border:1px solid #ccc; width: 100%; height: auto;"></svg>
      <button id="clearDensityBtn" class="btn btn-secondary mt-2">Reset to Default</button>
      <p class="mt-2">
        Drag the 10 red points horizontally to set the 10 distinct eigenvalues of the diagonal matrix before conjugation.
      </p>
  </div>
</div>

<!-- Numeric input fields for the discrete (atomic) profile -->
<div class="row" id="discreteFieldsContainer">
  <div class="col-12">
    <h5>Atomic Point Values</h5>
    <div class="row">
      <!-- Here we create 10 numeric fields side-by-side -->
      <div class="col-6 col-md-1 mb-2 text-center" v-for="i in 10" :key="i">
        <label :for="'discreteField' + i" class="form-label">{{i}}</label>
        <input type="number" :id="'discreteField' + i" class="form-control" step="10" style="width: 5em">
      </div>
    </div>
  </div>
</div>

<!-- Resample controls -->
<div class="row">
  <div class="col-12 col-lg-8">
    <div class="controls mb-3">
      <label for="nInput">Matrix size \(N\):</label>
      <input id="nInput" type="range" min="2" max="300" step="1" value="50" />
      <span id="nValue">50</span>&nbsp;&nbsp;
      <button id="resampleBtn" class="btn btn-primary">Resample</button>
    </div>
  </div>
</div>

<!-- Corner eigenvalue scatter plot -->
<div class="row">
  <div class="col-12">
      <h5>Corner Eigenvalue Dot Plot:</h5>
      <svg id="cornerEigenvalsPlot" width="100%" style="min-height: 500px;"></svg>
  </div>
</div>

<script>
// We rely on the Emscripten-produced module "Module" being included via the JS file.

let computedData = [];
let currentN = 50;

// We store exactly 10 points for the “atomic” distribution.
const numDiscretePoints = 10;
let discretePoints = d3.range(numDiscretePoints).map(i => ({ x: 100 + i * 40, y: 75 }));

// We'll allocate a buffer for these 10 double-precision values once (persistent).
let discreteBufferPtr = null;

// UI setup
const discreteSVG = d3.select("#discreteDensitySVG");

// Initialize and bind the discrete points
function initDiscreteDrawing() {
    // If no existing circles, create them. If they exist, update them.
    const circles = discreteSVG.selectAll("circle").data(discretePoints);
    circles.enter().append("circle")
        .attr("r", 5)
        .attr("fill", "red")
        .call(d3.drag()
            .on("drag", function(event, d) {
                // clamp x to [0,600]
                d.x = Math.max(0, Math.min(600, event.x));
                d3.select(this).attr("cx", d.x);
                updateDiscreteFieldsFromPoints();
            })
        )
        .merge(circles)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    circles.exit().remove();

    // Initialize the numeric fields to match the initial discretePoints
    updateDiscreteFieldsFromPoints();
}

// Reflect the circle positions into the numeric input fields
function updateDiscreteFieldsFromPoints() {
    discretePoints.forEach((pt, i) => {
        const field = document.getElementById("discreteField" + i);
        if (field) {
            field.value = pt.x.toFixed(1);
        }
    });
}

// Reflect numeric fields changes back into the circle positions
function updateDiscretePointsFromFields() {
    discretePoints.forEach((pt, i) => {
        const field = document.getElementById("discreteField" + i);
        if (field) {
            pt.x = parseFloat(field.value);
        }
    });
    // redraw circles
    discreteSVG.selectAll("circle").data(discretePoints)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
}

// Reset the discrete points to a default pattern
function resetDiscretePoints() {
    discretePoints = d3.range(numDiscretePoints).map(i => ({ x: 100 + i * 40, y: 75 }));
    initDiscreteDrawing();
}

// Show/hide the discrete section based on regime
function updateRegimeDisplay() {
    if (document.getElementById("regimeGUE").checked) {
        d3.select("#discreteDensityContainer").style("display", "none");
        d3.select("#discreteFieldsContainer").style("display", "none");
    } else {
        d3.select("#discreteDensityContainer").style("display", "block");
        d3.select("#discreteFieldsContainer").style("display", "block");
        // Ensure everything is drawn
        initDiscreteDrawing();
    }
}

document.getElementById("regimeAtomic").addEventListener("change", updateRegimeDisplay);
document.getElementById("regimeGUE").addEventListener("change", updateRegimeDisplay);

document.getElementById("clearDensityBtn").addEventListener("click", resetDiscretePoints);

// Also attach listeners to each numeric field to update the circle positions
for (let i = 0; i < numDiscretePoints; i++) {
    const fld = document.getElementById("discreteField" + i);
    if (fld) {
        fld.addEventListener("change", updateDiscretePointsFromFields);
    }
}

// We'll load the WASM module and then set up the simulation
async function initWasm() {
    try {
        // Wait until the module is ready
        await new Promise(resolve => {
            if (Module.ready) resolve();
            else Module.onRuntimeInitialized = resolve;
        });
        // Prepare discrete drawing
        resetDiscretePoints();
        // Allocate a persistent buffer for 10 double-precision values
        discreteBufferPtr = Module._malloc(numDiscretePoints * 8);

        // Connect events
        document.getElementById("nInput").addEventListener("input", e => {
            document.getElementById("nValue").textContent = e.target.value;
        });
        document.getElementById("resampleBtn").addEventListener("click", updateSimulation);

        // Initially set N=50 in the UI label
        document.getElementById("nValue").textContent = 50;

        // Show the discrete section, by default
        updateRegimeDisplay();
        // First run
        updateSimulation();
    } catch (err) {
        console.error("Error initializing WebAssembly:", err);
    }
}

function updateSimulation() {
    const N = parseInt(document.getElementById("nInput").value, 10);
    currentN = N;
    const totalPoints = N * (N + 1) / 2;

    let ptr;
    if (document.getElementById("regimeGUE").checked) {
        // GUE-like (real-symmetric) regime
        ptr = Module._computeCornerEigenvalues(N);
    } else {
        // 10-point atomic regime
        // Grab the sorted x-positions from discretePoints
        let sorted = discretePoints.map(d => d.x).sort((a, b) => a - b);
        const arr = new Float64Array(sorted);
        Module.HEAPF64.set(arr, discreteBufferPtr / 8);
        ptr = Module._computeCornerEigenvaluesDiscrete(N, discreteBufferPtr);
    }

    // Convert memory block into JS array: 2*(N*(N+1)/2) doubles
    const expectedLen = 2 * totalPoints;
    const rawData = new Float64Array(Module.HEAPF64.buffer, ptr, expectedLen);
    computedData = Array.from(rawData);
    drawCornerEigenvaluePlot(computedData, N);
}

function drawCornerEigenvaluePlot(points, N) {
    const svg = d3.select("#cornerEigenvalsPlot");
    svg.selectAll("*").remove();

    const data = [];
    for (let i = 0; i < points.length; i += 2) {
        data.push({ corner: points[i], eigen: points[i + 1] });
    }

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    const xExtent = d3.extent(data, d => d.eigen);
    // Protect against degenerate extent
    if (xExtent[0] === xExtent[1]) {
        xExtent[0] -= 1;
        xExtent[1] += 1;
    }
    const xScale = d3.scaleLinear()
        .domain(xExtent)
        .nice()
        .range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear()
        .domain([0, N])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis);
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis);

    svg.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.eigen))
        .attr("cy", d => yScale(d.corner))
        .attr("r", 1.5)
        .attr("fill", "#00204E");
}

// Kick off:
initWasm();
</script>
