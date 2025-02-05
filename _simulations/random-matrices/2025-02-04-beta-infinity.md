---
title: Roots of Successive Derivatives of the Characteristic Polynomial
model: random-matrices
author: 'Connor MacMahon, Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/random-matrices/2025-02-04-beta-infinity.md'
    txt: 'This interactive simulation is written in JavaScript – see the source code at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/random-matrices/2025-02-04-beta-infinity.cpp'
    txt: 'C++ code for computing derivative roots'
published: false
---

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="{{site.url}}/js/2025-02-04-beta-infinity.js"></script>

<div class="row" id="discreteDensityContainer">
  <div class="col-12">
      <h5>Discrete Spectrum Profile (Drag the red points):</h5>
      <svg id="discreteDensitySVG" viewBox="0 0 600 150" style="border:1px solid #ccc; width: 100%; height: auto;"></svg>
      <button id="clearDensityBtn" class="btn btn-secondary mt-2">Clear Profile</button>
      <p class="mt-2">
        Drag the 10 red points horizontally to set the 10 discrete values.
      </p>
  </div>
</div>

<div class="row" id="discreteFieldsContainer">
  <div class="col-12">
    <h5>Discrete Profile Values</h5>
    <div class="row">
      <!-- 10 numeric fields for the discrete values -->
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
         <input type="number" id="discreteField5" class="form-control" step="10" value="300" style="width: 5em">
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

<!-- Matrix size slider and Resample button -->
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

<!-- Derivative Roots Dot Plot -->
<div class="row">
  <div class="col-12">
      <h5>Derivative Roots Dot Plot</h5>
      <svg id="derivativeRootsPlot" style="width: 100%; min-height: 500px; border: 1px solid #ccc;"></svg>
  </div>
</div>

<script>
// --- Discrete Spectrum Drawing ---
const discreteSVG = d3.select("#discreteDensitySVG");
const numDiscretePoints = 10;
let discretePoints = d3.range(numDiscretePoints).map(i => ({ x: 100 + i * 40, y: 75 }));

function updateDiscreteDrawing() {
    // Update the red points.
    const circles = discreteSVG.selectAll("circle").data(discretePoints);
    circles.enter().append("circle")
        .attr("r", 5)
        .attr("fill", "red")
        .call(d3.drag()
            .on("drag", function(event, d) {
                d.x = Math.max(0, Math.min(600, event.x));
                d3.select(this).attr("cx", d.x);
                updateDiscreteFields();
                updateDiscreteLine();
            })
        )
        .merge(circles)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    circles.exit().remove();
    updateDiscreteFields();
    updateDiscreteLine();
}

function updateDiscreteLine() {
    // Draw a line connecting the discrete points.
    const line = d3.line()
        .x(d => d.x)
        .y(d => d.y);
    let path = discreteSVG.selectAll("path.discrete-line").data([discretePoints]);
    path.enter().append("path")
        .attr("class", "discrete-line")
        .merge(path)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-width", 2);
    path.exit().remove();
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
    discretePoints = d3.range(numDiscretePoints).map(i => ({ x: 100 + i * 40, y: 75 }));
    updateDiscreteDrawing();
});

for (let i = 0; i < numDiscretePoints; i++) {
    const field = document.getElementById("discreteField" + i);
    if (field) {
        field.addEventListener("change", function() {
            discretePoints[i].x = parseFloat(this.value);
            updateDiscreteDrawing();
        });
    }
}

// --- WASM and Simulation ---
let computedData = [];
let currentN = 50;
let discreteBufferPtr = null;

async function initWasm() {
    try {
        await new Promise(resolve => {
            if (Module.ready) resolve();
            else Module.onRuntimeInitialized = resolve;
        });
        document.getElementById("nInput").value = 50;
        document.getElementById("nValue").textContent = 50;
        updateDiscreteDrawing();
        // Allocate a persistent buffer for 10 doubles.
        const malloc = Module["malloc"] || Module._malloc;
        discreteBufferPtr = malloc(10 * Float64Array.BYTES_PER_ELEMENT);
        updateSimulation();
    } catch (error) {
        document.body.innerHTML += `<p style="color: red">Error loading WASM: ${error.message}</p>`;
    }
}

function updateSimulation() {
    const N = parseInt(document.getElementById("nInput").value, 10);
    currentN = N;
    const totalPoints = (N * (N - 1)) / 2;
    // IMPORTANT: Use the discrete values that the user provided.
    // We extract the x-values from the draggable points (which are kept in sync
    // with the numeric fields) and sort them to ensure the correct order.
    let sortedPoints = discretePoints.map(d => d.x).sort((a, b) => a - b);
    let eigenArray = new Float64Array(sortedPoints);
    Module.HEAPF64.set(eigenArray, discreteBufferPtr / 8);
    const ptr = Module._computeDerivativeRoots(N, discreteBufferPtr);
    const expectedBytes = 2 * totalPoints * 8;
    if (ptr + expectedBytes > Module.HEAPF64.buffer.byteLength) return;
    computedData = Array.from(new Float64Array(Module.HEAPF64.buffer, ptr, 2 * totalPoints));
    drawDerivativeRootsPlot(computedData, N);
}

// --- Derivative Roots Plot Drawing ---
function drawDerivativeRootsPlot(points, N) {
    const svg = d3.select("#derivativeRootsPlot");
    svg.selectAll("*").remove();
    const totalPoints = points.length / 2;
    const data = [];
    for (let i = 0; i < totalPoints; i++) {
        data.push({ degree: points[2 * i], root: points[2 * i + 1] });
    }
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    // X-scale for root values with a bit of padding.
    const xExtent = d3.extent(data, d => d.root);
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([margin.left, width - margin.right]);

    // Y-scale: derivative polynomial degree (1 to N-1). Higher degree at the top.
    const yScale = d3.scaleLinear()
        .domain([1, N - 1])
        .range([height - margin.bottom, margin.top]);

    // Gridlines.
    const xAxisGrid = d3.axisBottom(xScale)
        .tickSize(- (height - margin.top - margin.bottom))
        .tickFormat('');
    const yAxisGrid = d3.axisLeft(yScale)
        .tickSize(- (width - margin.left - margin.right))
        .tickFormat('');

    // Axes.
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxisGrid);

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxisGrid);

    // Draw x-axis.
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis)
      .append("text")
        .attr("x", (width - margin.left - margin.right)/2 + margin.left)
        .attr("y", 40)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .text("Root Value");

    // Draw y-axis.
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", - (height - margin.top - margin.bottom)/2 - margin.top)
        .attr("y", -40)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .text("Derivative Polynomial Degree");

    // Draw the derivative roots as circles.
    svg.append("g")
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.root))
        .attr("cy", d => yScale(d.degree))
        .attr("r", 2.5)
        .attr("fill", "#1f78b4")
        .attr("opacity", 0.7);
}

document.getElementById("resampleBtn").addEventListener("click", updateSimulation);
document.getElementById("nInput").addEventListener("input", e => {
    document.getElementById("nValue").textContent = e.target.value;
});

initWasm();
</script>
