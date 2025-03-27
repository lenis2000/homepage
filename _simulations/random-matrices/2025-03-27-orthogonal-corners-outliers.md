---
title: Corner processes with unitary invariance and outliers
model: random-matrices
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/random-matrices/2025-03-27-orthogonal-corners-outliers.md'
    txt: 'Interactive simulation (JavaScript & Emscripten)'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/random-matrices/2025-03-27-orthogonal-corners-outliers.cpp'
    txt: 'C++ source code compiled to WebAssembly'
---

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="{{site.url}}/js/2025-03-27-orthogonal-corners-outliers.js"></script>

<div class="row">
  <div class="col-12 mb-3">
    <p>
      This page computes eigenvalues of successive top-left corners of three different complex Hermitian random-matrix ensembles (each with an option to add up to five outliers).
    </p>
    <ul>
      <li>
        <strong>10-Point Atomic</strong>: a diagonal matrix with 10 distinct eigenvalues (each repeated proportionally in size \(N\)), plus 5 outliers in the last 5 diagonal entries, all conjugated by a random complex unitary.
      </li>
      <li>
        <strong>GUE</strong>: a complex Hermitian GUE matrix + a rank $\le 5$ perturbation in the first 5 diagonal entries.
      </li>
      <li>
        <strong>Rotated GUE</strong>: a random complex Hermitian GUE matrix + a rank-5 diagonal perturbation \(U D U^\dagger\), where \(D\) has up to 5 outliers. The difference with the previous ensemble is that the perturbation is <strong>free</strong> with respect to the original GUE matrix.
      </li>
    </ul>
    <p>
      Adjust \(N\) (up to 500) and outlier values, then click “Resample” to see the corner eigenvalue scatter plot.
    </p>
  </div>
</div>

<div class="row">
  <div class="col-12">
      <h5>Simulation Regime:</h5>
      <div class="mb-3">
        <label>
          <input type="radio" name="regime" value="discrete"
              id="regimeDiscrete" checked>
          10-Point Atomic
        </label>
        &nbsp;&nbsp;
        <label>
          <input type="radio" name="regime" value="gue" id="regimeGUE" >
          GUE
        </label>

        &nbsp;&nbsp;
        <label>
          <input type="radio" name="regime" value="rotatedGUE" id="regimeRotatedGUE">
          Rotated GUE
        </label>
      </div>
  </div>
</div>

<!-- Outlier input fields (common to all three modes) -->
<div class="row">
  <div class="col-12">
    <h5>Outlier Values (up to 5)</h5>
    <div class="row">
      <!-- 5 numeric fields. Default 0 -->
      <div class="col-6 col-md-2 mb-2">
         <label for="outlierField0" class="form-label">Outlier 1</label>
         <input type="number" id="outlierField0" class="form-control" step="1" value="0">
      </div>
      <div class="col-6 col-md-2 mb-2">
         <label for="outlierField1" class="form-label">Outlier 2</label>
         <input type="number" id="outlierField1" class="form-control" step="1" value="0">
      </div>
      <div class="col-6 col-md-2 mb-2">
         <label for="outlierField2" class="form-label">Outlier 3</label>
         <input type="number" id="outlierField2" class="form-control" step="1" value="0">
      </div>
      <div class="col-6 col-md-2 mb-2">
         <label for="outlierField3" class="form-label">Outlier 4</label>
         <input type="number" id="outlierField3" class="form-control" step="1" value="0">
      </div>
      <div class="col-6 col-md-2 mb-2">
         <label for="outlierField4" class="form-label">Outlier 5</label>
         <input type="number" id="outlierField4" class="form-control" step="1" value="0">
      </div>
    </div>
  </div>
</div>

<!-- Discrete density plot container (for 10-point atomic) -->
<div class="row" id="discreteDensityContainer" style="display:none;">
  <div class="col-12">
    <h5>10-Point Atomic Profile (Drag the red points):</h5>
    <svg id="discreteDensitySVG" viewBox="0 0 600 150" style="border:1px solid #ccc; width: 100%; height: auto;"></svg>
    <button id="clearDensityBtn" class="btn btn-secondary mt-2">Reset Profile</button>
    <p class="mt-2">
      Drag the 10 red points horizontally to set the 10 distinct eigenvalues.
    </p>
  </div>
</div>

<!-- Numeric input fields for the 10-point profile (visible in discrete regime) -->
<div class="row" id="discreteFieldsContainer" style="display:none;">
  <div class="col-12">
    <h5>Discrete Profile Values</h5>
    <div class="row">
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField0" class="form-label">1</label>
         <input type="number" id="discreteField0" class="form-control" step="10" value="100" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField1" class="form-label">2</label>
         <input type="number" id="discreteField1" class="form-control" step="10" value="140" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField2" class="form-label">3</label>
         <input type="number" id="discreteField2" class="form-control" step="10" value="180" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField3" class="form-label">4</label>
         <input type="number" id="discreteField3" class="form-control" step="10" value="220" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField4" class="form-label">5</label>
         <input type="number" id="discreteField4" class="form-control" step="10" value="260" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField5" class="form-label">6</label>
         <input type="number" id="discreteField5" class="form-control" step="10" value="500" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField6" class="form-label">7</label>
         <input type="number" id="discreteField6" class="form-control" step="10" value="340" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField7" class="form-label">8</label>
         <input type="number" id="discreteField7" class="form-control" step="10" value="380" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField8" class="form-label">9</label>
         <input type="number" id="discreteField8" class="form-control" step="10" value="420" style="width: 5em">
      </div>
      <div class="col-4 col-md-1 mb-2 text-center">
         <label for="discreteField9" class="form-label">10</label>
         <input type="number" id="discreteField9" class="form-control" step="10" value="460" style="width: 5em">
      </div>
    </div>
  </div>
</div>

<!-- Controls: matrix size, resample -->
<div class="row">
  <div class="col-12 col-lg-8">
    <div class="controls mb-3">
      <label for="nInput">Matrix size \(N\):</label>
      <input id="nInput" type="range" min="2" max="500" step="1" value="50" />
      <span id="nValue">50</span>
      &nbsp;&nbsp;
      <button id="resampleBtn" class="btn btn-primary">Resample</button>
    </div>
  </div>
</div>

<!-- Corner eigenvalue plot -->
<div class="row">
  <div class="col-12">
      <h5>Corner Eigenvalue Plot</h5>
      <svg id="cornerEigenvalsPlot" width="100%" style="min-height: 500px;"></svg>
  </div>
</div>

<script>
// We rely on the Emscripten module, loaded in 2025-03-27-orthogonal-corners-outliers.js

let outlierArray = new Float64Array(5); // For the 5 outliers
let computedData = [];
let currentN = 50;

// For the "10-point atomic" distribution:
const numDiscretePoints = 10;
let discretePoints = d3.range(numDiscretePoints).map(i => ({ x: 100 + i*40, y: 75 }));

// We'll allocate two typed arrays in WASM: one for discrete 10 points, one for outliers(5).
let discreteBufferPtr = null;
let outlierBufferPtr  = null;

// Initialize the discrete SVG for drag
const discreteSVG = d3.select("#discreteDensitySVG");

function updateDiscreteDrawing() {
    const circles = discreteSVG.selectAll("circle").data(discretePoints);
    circles.enter().append("circle")
        .attr("r", 5)
        .attr("fill", "red")
        .call(d3.drag()
            .on("drag", function(event, d) {
                d.x = Math.max(0, Math.min(600, event.x));
                d3.select(this).attr("cx", d.x);
                updateDiscreteFields();
            })
        )
        .merge(circles)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    circles.exit().remove();
    updateDiscreteFields();
}

function updateDiscreteFields() {
    discretePoints.forEach((pt, i) => {
        const field = document.getElementById("discreteField" + i);
        if (field) {
            field.value = pt.x.toFixed(1);
        }
    });
}

document.getElementById("clearDensityBtn").addEventListener("click", () => {
    discretePoints = d3.range(numDiscretePoints).map(i => ({ x: 100 + i*40, y: 75 }));
    updateDiscreteDrawing();
});

// For each discrete field, on change, update the discretePoints
for (let i = 0; i < numDiscretePoints; i++) {
    const f = document.getElementById("discreteField" + i);
    f.addEventListener("change", function() {
        discretePoints[i].x = parseFloat(this.value);
        updateDiscreteDrawing();
    });
}

// Show/hide UI based on regime
function updateRegimeDisplay() {
    const regime = getRegime();
    const isDiscrete = (regime === "discrete");
    d3.select("#discreteDensityContainer").style("display", isDiscrete ? "block" : "none");
    d3.select("#discreteFieldsContainer").style("display", isDiscrete ? "block" : "none");
}

function getRegime() {
    if (document.getElementById("regimeGUE").checked) {
        return "gue";
    } else if (document.getElementById("regimeDiscrete").checked) {
        return "discrete";
    } else {
        return "rotatedGUE";
    }
}

document.getElementById("regimeGUE").addEventListener("change", updateRegimeDisplay);
document.getElementById("regimeDiscrete").addEventListener("change", updateRegimeDisplay);
document.getElementById("regimeRotatedGUE").addEventListener("change", updateRegimeDisplay);

// Called once the WASM module is loaded
async function initWasm() {
    try {
        await new Promise(resolve => {
            if (Module.ready) resolve();
            else Module.onRuntimeInitialized = resolve;
        });
        // Allocate persistent buffers: discrete (10 doubles), outliers (5 doubles)
        const malloc = Module["malloc"] || Module._malloc;
        discreteBufferPtr = malloc(10 * Float64Array.BYTES_PER_ELEMENT);
        outlierBufferPtr  = malloc(5  * Float64Array.BYTES_PER_ELEMENT);

        document.getElementById("nValue").textContent = 50;
        updateRegimeDisplay();
        updateDiscreteDrawing();

        // Initial simulation
        updateSimulation();
    } catch (error) {
        document.body.innerHTML += `<p style="color: red">Error loading WASM: ${error.message}</p>`;
    }
}

function updateSimulation() {
    const N = parseInt(document.getElementById("nInput").value, 10);
    currentN = N;

    // Gather 5 outlier values from UI
    for (let i = 0; i < 5; i++) {
        let val = parseFloat(document.getElementById("outlierField" + i).value);
        outlierArray[i] = isNaN(val) ? 0 : val;
    }
    // Copy outlierArray into WASM memory
    Module.HEAPF64.set(outlierArray, outlierBufferPtr / 8);

    // Decide which of the 3 modes
    const regime = getRegime();
    let ptr;
    const totalPoints = N * (N + 1) / 2;

    if (regime === "gue") {
        // call "GUE" outliers
        ptr = Module._computeCornerEigenvaluesGUEOutliers(N, outlierBufferPtr);
    } else if (regime === "discrete") {
        // Fill the discrete buffer from discretePoints.x, sorted ascending
        let sortedPoints = discretePoints.map(d => d.x).sort((a, b) => a - b);
        Module.HEAPF64.set(sortedPoints, discreteBufferPtr / 8);
        ptr = Module._computeCornerEigenvaluesDiscreteOutliers(N, discreteBufferPtr, outlierBufferPtr);
    } else {
        // "Rotated GUE"
        ptr = Module._computeCornerEigenvaluesRotatedGUE(N, outlierBufferPtr);
    }

    const expectedBytes = 2 * totalPoints * 8;
    // Safety check: ensure we are in range
    if (ptr + expectedBytes > Module.HEAPF64.buffer.byteLength) {
        console.warn("WASM memory out of bounds.");
        return;
    }
    computedData = Array.from(new Float64Array(Module.HEAPF64.buffer, ptr, 2 * totalPoints));
    drawCornerEigenvaluePlot(computedData, N);
}

function drawCornerEigenvaluePlot(points, N) {
    const svg = d3.select("#cornerEigenvalsPlot");
    svg.selectAll("*").remove();

    const totalPoints = points.length / 2;
    const data = [];
    for (let i = 0; i < totalPoints; i++) {
        data.push({ corner: points[2*i], eigen: points[2*i + 1] });
    }

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    const xExtent = d3.extent(data, d => d.eigen);
    const xScale = d3.scaleLinear()
                     .domain(xExtent).nice()
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

    // Draw circles
    svg.append("g")
       .selectAll("circle")
       .data(data)
       .join("circle")
       .attr("cx", d => xScale(d.eigen))
       .attr("cy", d => yScale(d.corner))
       .attr("r", 1.5)
       .attr("fill", "#00204E");
}

// DOM event listeners
document.getElementById("resampleBtn").addEventListener("click", updateSimulation);
document.getElementById("nInput").addEventListener("input", e => {
    document.getElementById("nValue").textContent = e.target.value;
});

initWasm();
</script>
