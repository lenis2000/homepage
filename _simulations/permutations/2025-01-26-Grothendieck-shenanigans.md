---
title: Grothendieck shenanigans - simulation of random permutations from staircase reduced word
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-01-26-Grothendieck-shenanigans.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/simulations/blob/master/2025-01-26-Grothendieck-c-code/Grothendieck-swaps.c'
    txt: 'c code for the simulation of heatmaps, runs faster'
---

<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<div class="container mt-4 mb-3" style="overflow: visible;">
  <p>
    This page simulates random permutations arising from nonsymmetric
    Grothendieck polynomials. For more details, see our paper
    <a href="{{site.url}}/2024/07/Grothendieck-shenanigans/">[45]</a>.
    Use the controls below to choose $N$, $p$, and $q$,
    then view the resulting permutation matrix drawn via <code>D3.js</code>.
  </p>

  <!-- Outer container with no "border" class -->
  <div class="my-3 p-3 bg-light" style="overflow: visible;">
    <h2 class="h4 mb-3">Simulation Controls</h2>

    <div class="row mb-3">
      <!-- Control for N -->
      <div class="col-12 col-md-4 d-flex align-items-center mb-2">
        <label for="nInput" class="me-2 mb-0">$N$:&nbsp;</label>
        <input
          id="nInput"
          type="range"
          class="form-range"
          value="1000"
          min="0"
          max="12000"
          step="100"
        />
        &nbsp;<span id="nValue" class="ms-2" style="text-align:right;">1000</span>&nbsp;&nbsp;
        <button id="runBtn" class="btn btn-sm btn-primary ms-2">
          Change $N$
        </button>
      </div>

      <!-- Slider for p -->
      <div class="col-6 col-md-4 d-flex align-items-center mb-2">
        <label for="probInput" class="me-2 mb-0">$p$:&nbsp;</label>
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

      <!-- Slider for q -->
      <div class="col-6 col-md-4 d-flex align-items-center mb-2">
        <label for="qInput" class="me-2 mb-0">$q$:&nbsp;</label>
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

    <!-- Responsive SVG container for the matrix -->
    <svg
      id="plot"
      style="width: 100%; height: auto; display: block;"
      preserveAspectRatio="xMidYMid meet"
    ></svg>
  </div>
</div>


<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script>
// ==============================
// 1) Global Variables
// ==============================
let currentN = null;
let debounceTimer = null;

// ==============================
// 2) Utility: Update Slider Text
// ==============================
function updateSliderDisplay(spanId, val) {
  if (spanId === "nValue") {
    document.getElementById(spanId).textContent = parseInt(val);
  } else {
    document.getElementById(spanId).textContent = parseFloat(val).toFixed(2);
  }
}
// Debounce function to avoid re-running sim on every small slider move
function debounceSimulate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (currentN === null) return;
    const probVal = parseFloat(document.getElementById("probInput").value);
    const qVal    = parseFloat(document.getElementById("qInput").value);
    simulateAndDraw(currentN, probVal, qVal);
  }, 300);
}

// ==============================
// 3) Swap Generation + Application
// ==============================
function generateSwaps(t, N, swaps) {
  for (let i = 1; i < N; i++) {
    if ((t + i >= N) && (t - i <= N - 2) && ((t - i + N) % 2 === 0)) {
      swaps[i - 1] = 1;
    } else {
      swaps[i - 1] = 0;
    }
  }
}

function applyRandomSwap(sigma, swaps, N, PROB, Q) {
  for (let i = 0; i < N - 1; i++) {
    if (swaps[i] === 1) {
      // Upward swap
      if (sigma[i] < sigma[i+1] && Math.random() < PROB) {
        [sigma[i], sigma[i+1]] = [sigma[i+1], sigma[i]];
        continue;
      }
      // Downward swap
      if (sigma[i] > sigma[i+1] && Math.random() < PROB * Q) {
        [sigma[i], sigma[i+1]] = [sigma[i+1], sigma[i]];
        continue;
      }
    }
  }
}

// ==============================
// 4) Run Simulation
// ==============================
function runSimulation(N, PROB, Q) {
  const T_MAX = 2 * N - 3;
  const sigma = Array.from({length: N}, (_, i) => i+1);
  const swaps = new Array(N - 1).fill(0);

  for (let t = 1; t <= T_MAX; t++) {
    generateSwaps(t, N, swaps);
    applyRandomSwap(sigma, swaps, N, PROB, Q);
  }
  return sigma;
}

// ==============================
// 5) Draw with D3 (Responsive)
// ==============================
function drawPermutationMatrix(sigma) {
  const N = sigma.length;
  const svg = d3.select("#plot");
  svg.selectAll("*").remove(); // Clear old

  // We'll define a dimension in "data space"
  const margin = 30;
  const chartSize = 800; // Logical size
  const width  = chartSize + margin * 2;
  const height = chartSize + margin * 2;

  // Use a viewBox for full responsiveness
  svg
    .attr("viewBox", [0, 0, width, height])
    .style("border", "none");

  // Circle radius
  const radius = 2;

  // Scales
  const xScale = d3.scaleLinear()
    .domain([-0.5, N - 0.5])
    .range([margin + radius, margin + chartSize - radius]);

  const yScale = d3.scaleLinear()
    .domain([-0.5, N - 0.5])
    .range([margin + radius, margin + chartSize - radius]);

  // Build data
  const data = sigma.map((val, i) => ({row: i, col: val - 1}));
  const tooltip = d3.select("#tooltip");

  svg.selectAll(".dot")
    .data(data)
    .join("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.row))
      .attr("cy", d => yScale(d.col))
      .attr("r", radius)
      .style("fill", "#00204E")
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

// ==============================
// 6) Combined Function
// ==============================
function simulateAndDraw(N, PROB, Q) {
  const sigma = runSimulation(N, PROB, Q);
  drawPermutationMatrix(sigma);
}

// ==============================
// 7) Event Listeners
// ==============================


document.getElementById("runBtn").addEventListener("click", () => {
  const nVal = parseInt(document.getElementById("nInput").value, 10);
  if (isNaN(nVal) || nVal < 1 || nVal > 12000) {
    alert("Please enter a valid integer N in [1..12000].");
    return;
  }
  currentN = nVal;

  const probVal = parseFloat(document.getElementById("probInput").value);
  const qVal    = parseFloat(document.getElementById("qInput").value);

  simulateAndDraw(currentN, probVal, qVal);
});

document.getElementById("probInput").addEventListener("input", (e) => {
  updateSliderDisplay("probValue", e.target.value);
  debounceSimulate();
});

document.getElementById("qInput").addEventListener("input", (e) => {
  updateSliderDisplay("qValue", e.target.value);
  debounceSimulate();
});

document.getElementById("nInput").addEventListener("input", (e) => {
  updateSliderDisplay("nValue", e.target.value);
});

// Initialize slider text
updateSliderDisplay("probValue", document.getElementById("probInput").value);
updateSliderDisplay("qValue",   document.getElementById("qInput").value);

// ==============================
// 8) Automatically Run Simulation on Page Load
// ==============================
(function autoRunOnLoad() {
  // Use the current default values from the DOM
  const nVal = parseInt(document.getElementById("nInput").value, 10);
  currentN = nVal;

  const probVal = parseFloat(document.getElementById("probInput").value);
  const qVal    = parseFloat(document.getElementById("qInput").value);

  simulateAndDraw(nVal, probVal, qVal);
})();
</script>

The initial pipe dream boundary condition (where the pipe dreams live) is as follows:
<img src="{{site.storage_url}}/img/papers/grothendieck-shenanigans.png" alt="Initial pipe dream boundary condition diagram showing where pipe dreams are located" width="100%"/>


{% include references.md %}
