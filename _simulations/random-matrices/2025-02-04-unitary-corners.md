---
title: Orthogonally Invariant Corners of Random Matrices
model: random-matrices
author: 'Connor MacMahon, Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/random-matrices/2025-02-04-unitary-corners.md'
    txt: 'This simulation is interactive, written in JavaScript – see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/random-matrices/2025-02-04-unitary-corners.cpp'
    txt: 'C++ code for the simulation'
---

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="{{site.url}}/js/2025-02-04-unitary-corners.js"></script>

<div class="row">
  <div class="col-12 mb-3">
    <p>
      This simulation computes the eigenvalues of successive corners of a random matrix.
      You can choose between two regimes:
    </p>
    <ul>
      <li>
        <strong>GOE:</strong> The matrix is generated as a random Gaussian Orthogonal Ensemble (GOE) matrix.
      </li>
      <li>
        <strong>Discrete Top Eigenvalue Profile:</strong> A diagonal matrix with 10 distinct eigenvalues (each with high multiplicity) is conjugated by a random Haar matrix.
        You can adjust the 10 discrete eigenvalues by dragging the red points.
      </li>
    </ul>
    <p>
      Use the slider to set the matrix size \(N\) (maximum 300), then click “Resample” to generate a new simulation.
    </p>
  </div>
</div>

<div class="row">
  <div class="col-12">
      <h5>Simulation Regime:</h5>
      <div class="mb-3">
        <label>
          <input type="radio" name="regime" value="goe" id="regimeGOE" checked>
          GOE
        </label>
        &nbsp;&nbsp;
        <label>
          <input type="radio" name="regime" value="discrete" id="regimeDiscrete">
          Discrete Top Eigenvalue Profile
        </label>
      </div>
  </div>
</div>

<div class="row" id="discreteDensityContainer">
  <div class="col-12">
      <h5>Discrete Top Eigenvalue Profile (Drag the red points):</h5>
      <svg id="discreteDensitySVG" width="600" height="150" style="border:1px solid #ccc;"></svg>
      <button id="clearDensityBtn" class="btn btn-secondary mt-2">Clear Discrete Profile</button>
      <p class="mt-2">
        Drag the 10 red points horizontally to set the 10 distinct eigenvalues.
      </p>
  </div>
</div>

<!-- Only one button: Resample -->
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

<div class="row">
  <div class="col-12">
      <h5>Corner Eigenvalue Dot Plot:</h5>
      <svg id="cornerEigenvalsPlot" width="100%" style="min-height: 500px;"></svg>
  </div>
</div>

<script>
// NOTE: We do not declare "Module" here because it is provided by the Emscripten module.

let computedData = [];
let currentN = 50;
// Persistent allocation for discrete mode: a buffer for 10 doubles (80 bytes).
let discreteBufferPtr = null;

const discreteSVG = d3.select("#discreteDensitySVG");
const numDiscretePoints = 10;
let discretePoints = d3.range(numDiscretePoints).map(i => ({ x: 100 + i * 40, y: 75 }));

function updateDiscreteDrawing() {
    const circles = discreteSVG.selectAll("circle").data(discretePoints);
    circles.enter().append("circle")
        .attr("r", 5)
        .attr("fill", "red")
        .call(d3.drag()
            .on("drag", function(event, d) {
                d.x = Math.max(0, Math.min(600, event.x));
                d.y = 75;
                d3.select(this).attr("cx", d.x);
            })
        )
        .merge(circles)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    circles.exit().remove();
}

function updateRegimeDisplay() {
    if (document.getElementById("regimeGOE").checked) {
        d3.select("#discreteDensityContainer").style("display", "none");
    } else {
        d3.select("#discreteDensityContainer").style("display", "block");
        updateDiscreteDrawing();
    }
}
document.getElementById("regimeGOE").addEventListener("change", updateRegimeDisplay);
document.getElementById("regimeDiscrete").addEventListener("change", updateRegimeDisplay);

document.getElementById("clearDensityBtn").addEventListener("click", () => {
    discretePoints = d3.range(numDiscretePoints).map(i => ({ x: 100 + i * 40, y: 75 }));
    updateDiscreteDrawing();
});

async function initWasm() {
    try {
        await new Promise(resolve => {
            if (Module.ready) resolve();
            else Module.onRuntimeInitialized = resolve;
        });
        document.getElementById("nInput").value = 50;
        document.getElementById("nValue").textContent = 50;
        updateRegimeDisplay();
        updateDiscreteDrawing();
        // Allocate persistent buffer for discrete mode (10 doubles) once.
        const malloc = Module["malloc"] || Module._malloc;
        discreteBufferPtr = malloc(10 * Float64Array.BYTES_PER_ELEMENT);
        // console.log("Persistent discrete buffer allocated at:", discreteBufferPtr);
        updateSimulation();
    } catch (error) {
        // console.error('Failed to load WASM:', error);
        document.body.innerHTML += `<p style="color: red">Error loading WASM: ${error.message}</p>`;
    }
}

function updateSimulation() {
    const N = parseInt(document.getElementById("nInput").value, 10);
    currentN = N;
    const totalPoints = N * (N + 1) / 2;
    let ptr;
    if (document.getElementById("regimeGOE").checked) {
         ptr = Module._computeCornerEigenvalues(N);
    } else {
         let sortedPoints = discretePoints.map(d => d.x).sort((a, b) => a - b);
         let eigenArray = new Float64Array(sortedPoints);
         // Use the persistent discreteBufferPtr.
         Module.HEAPF64.set(eigenArray, discreteBufferPtr / 8);
         ptr = Module._computeCornerEigenvaluesDiscrete(N, discreteBufferPtr);
    }
    const expectedBytes = 2 * totalPoints * 8;
    // console.log("Returned pointer:", ptr);
    // console.log("Expected bytes:", expectedBytes);
    // console.log("Current HEAPF64 buffer size:", Module.HEAPF64.buffer.byteLength);
    if (ptr + expectedBytes > Module.HEAPF64.buffer.byteLength) {
        // console.error("Error: Returned pointer plus expected data size exceed available memory!");
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
        data.push({ corner: points[2 * i], eigen: points[2 * i + 1] });
    }
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.eigen))
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
    svg.append("g")
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.eigen))
        .attr("cy", d => yScale(d.corner))
        .attr("r", 1.5)
        .attr("fill", "#00204E");
}

document.getElementById("resampleBtn").addEventListener("click", updateSimulation);
document.getElementById("nInput").addEventListener("input", e => {
    document.getElementById("nValue").textContent = e.target.value;
});

initWasm();
</script>
