---
title: Grothendieck shenanigans - simulation of random permutations
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-01-26-Grothendieck-shenanigans.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: ''
    txt: 'c code for the simulation of heatmaps (runs faster)'
---

<div class="container mt-4 mb-3">


  <p>
    This page simulates random permutations arising from
    nonsymmetric Grothendieck polynomials. For more details,
    see our paper[[45]][ref45]. Use the controls below to choose
    <code>N</code>, <code>PROB</code>, and <code>Q</code>,
    then view the resulting permutation matrix drawn via D3.
  </p>

  <div class="my-3 p-3 border bg-light">
    <h2 class="h4 mb-3">Simulation Controls</h2>

    <div class="row mb-3">
      <!-- Control for N -->
      <div class="col-12 col-md-4 d-flex align-items-center mb-2">
        <label for="nInput" class="me-2 mb-0">N:</label>
        <input
          id="nInput"
          type="number"
          class="form-control form-control-sm me-2"
          value="500"
          min="1"
          max="10000"
          step="1"
          style="max-width: 90px;"
        />
        <button id="runBtn" class="btn btn-sm btn-primary">Run Simulation</button>
      </div>

      <!-- Slider for PROB -->
      <div class="col-6 col-md-4 d-flex align-items-center mb-2">
        <label for="probInput" class="me-2 mb-0">PROB:</label>
        <input
          id="probInput"
          type="range"
          class="form-range"
          min="0"
          max="1"
          step="0.01"
          value="0.5"
        />
        <span
          id="probValue"
          class="ms-2"
          style="width:2.5rem; text-align:right;"
        >
          0.50
        </span>
      </div>

      <!-- Slider for Q -->
      <div class="col-6 col-md-4 d-flex align-items-center mb-2">
        <label for="qInput" class="me-2 mb-0">Q:</label>
        <input
          id="qInput"
          type="range"
          class="form-range"
          min="0"
          max="1"
          step="0.01"
          value="0"
        />
        <span
          id="qValue"
          class="ms-2"
          style="width:2.5rem; text-align:right;"
        >
          0.00
        </span>
      </div>
    </div>

    <!-- Tooltip for circles -->
    <div
      id="tooltip"
      style="
        position: absolute;
        text-align: center;
        padding: 6px;
        font: 12px sans-serif;
        background: #fff;
        border: 1px solid #aaa;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 9999;
      "
    ></div>

    <!-- SVG container for the matrix -->
    <svg
      id="plot"
      style="border:1px solid #ccc; width:100%; max-width:800px; height:auto;"
    ></svg>
  </div>
</div>

<!-- Local D3 (downloaded to /js/d3.v7.min.js) -->
<script src="/js/d3.v7.min.js"></script>

<script>
/*
  We rely on the already-loaded Bootstrap 4 & main.css from your header.html.
  This script does the simulation & drawing.
*/

let currentN = null;
let debounceTimer = null;

/* Update displayed slider value */
function updateSliderDisplay(spanId, val) {
  document.getElementById(spanId).textContent = parseFloat(val).toFixed(2);
}

/* Debounce to avoid rapid re-runs on slider move */
function debounceSimulate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (currentN === null) return;
    const probVal = parseFloat(document.getElementById("probInput").value);
    const qVal    = parseFloat(document.getElementById("qInput").value);
    simulateAndDraw(currentN, probVal, qVal);
  }, 300);
}

/* Generate swaps */
function generateSwaps(t, N, swaps) {
  for (let i = 1; i < N; i++) {
    if ((t + i >= N) && (t - i <= N - 2) && ((t - i + N) % 2 === 0)) {
      swaps[i - 1] = 1;
    } else {
      swaps[i - 1] = 0;
    }
  }
}

/* Apply random swap */
function applyRandomSwap(sigma, swaps, N, PROB, Q) {
  for (let i = 0; i < N - 1; i++) {
    if (swaps[i] === 1) {
      // "Upward" swap
      if (sigma[i] < sigma[i + 1] && Math.random() < PROB) {
        [sigma[i], sigma[i+1]] = [sigma[i+1], sigma[i]];
        continue;
      }
      // "Downward" swap
      if (sigma[i] > sigma[i + 1] && Math.random() < PROB * Q) {
        [sigma[i], sigma[i+1]] = [sigma[i+1], sigma[i]];
        continue;
      }
    }
  }
}

/* Main simulation */
function runSimulation(N, PROB, Q) {
  const T_MAX = 2*N - 3;
  const sigma = Array.from({length:N}, (_,i) => i+1);
  const swaps = new Array(N-1).fill(0);

  for (let t = 1; t <= T_MAX; t++) {
    generateSwaps(t, N, swaps);
    applyRandomSwap(sigma, swaps, N, PROB, Q);
  }
  return sigma;
}

/* Draw permutation matrix using D3 */
function drawPermutationMatrix(sigma) {
  const svg = d3.select("#plot");
  svg.selectAll("*").remove(); // Clear old draws

  const N = sigma.length;
  const maxSize = 800;
  const margin  = 20;
  const width   = maxSize + margin*2;
  const height  = maxSize + margin*2;

  svg.attr("width", width).attr("height", height);

  const xScale = d3.scaleLinear().domain([0, N-1]).range([margin, margin+maxSize]);
  const yScale = d3.scaleLinear().domain([0, N-1]).range([margin, margin+maxSize]);

  const data = sigma.map((val, i) => ({ row: i, col: val - 1 }));
  const tooltip = d3.select("#tooltip");

  // Circle radius (tiny for large N)
  const radius = Math.max(1, 2 - Math.floor(N / 5000));

  svg.selectAll(".dot")
    .data(data)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.row))
    .attr("cy", d => yScale(d.col))
    .attr("r", radius)
    .style("fill", "steelblue") // or use your site color
    .on("mouseover", (evt, d) => {
      tooltip
        .style("opacity", 1)
        .style("left", (evt.pageX + 10) + "px")
        .style("top", (evt.pageY + 10) + "px")
        .html(`row = ${d.row}, col = ${d.col}`);
    })
    .on("mousemove", evt => {
      tooltip
        .style("left", (evt.pageX + 10) + "px")
        .style("top", (evt.pageY + 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });
}

/* Run sim + draw with given parameters */
function simulateAndDraw(N, PROB, Q) {
  const sigma = runSimulation(N, PROB, Q);
  drawPermutationMatrix(sigma);
}

/* Handle button & slider changes */
document.getElementById("runBtn").addEventListener("click", () => {
  const nVal = parseInt(document.getElementById("nInput").value, 10);
  if (isNaN(nVal) || nVal < 1 || nVal > 10000) {
    alert("Please enter a valid integer N in [1..10000].");
    return;
  }
  currentN = nVal;

  const pVal = parseFloat(document.getElementById("probInput").value);
  const qVal = parseFloat(document.getElementById("qInput").value);
  simulateAndDraw(currentN, pVal, qVal);
});

document.getElementById("probInput").addEventListener("input", (e) => {
  updateSliderDisplay("probValue", e.target.value);
  debounceSimulate();
});

document.getElementById("qInput").addEventListener("input", (e) => {
  updateSliderDisplay("qValue", e.target.value);
  debounceSimulate();
});

// Initialize slider readouts
updateSliderDisplay("probValue", document.getElementById("probInput").value);
updateSliderDisplay("qValue",   document.getElementById("qInput").value);
</script>

{%include references.md%}
