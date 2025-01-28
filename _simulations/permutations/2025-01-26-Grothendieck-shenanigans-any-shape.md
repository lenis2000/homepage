---
title: Simulation of random permutations from arbitrary reduced words (EXPERIMENTAL)
model: permutations
author: "Leonid Petrov"
code:
    - link: "https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-01-26-Grothendieck-shenanigans-any-shape.md"
      txt: "This simulation is interactive, written in JavaScript."
---

<div class="container mt-4 mb-3" style="overflow: visible">
    <p>
        This page simulates random permutations arising from nonsymmetric
        Grothendieck polynomials. For more details, see our paper
        <a href="{{site.url}}/2024/07/Grothendieck-shenanigans/">[45]</a>. Here
        we allow arbitrary reduced words, not just the staircase one.
    </p>

<h3>
    Warning: the drawing feature is EXPERIMENTAL, and simulations may not work correctly.
</h3>

   <div class="flexRow" style="display: flex;">
    <!-- ========================= LEFT: Controls ========================= -->
    <div class="controlsBox">
      <label><strong>Boundary:</strong></label><br />
      <select id="boundarySelect">
        <option value="staircase">Staircase</option>
        <option value="shaep">Quadratic (Crab)</option>
        <option value="userdrawn">User‐Drawn (Brush)</option>
      </select>

      <p id="drawnNote" class="labelSmall" style="margin-top:0.5em; display:none">
        <strong>Brush usage:</strong><br/>
        - Left‐drag to paint or erase<br/>
        - “Clear All” / “Fill All” resets entire shape
      </p>
      <div class="buttonRow" id="drawTools" style="display:none">
        <button id="clearAllBtn">Clear All</button>
        <button id="fillAllBtn">Fill All</button>
      </div>
      <div id="modeDiv" style="display:none; margin-top: 0.5em">
        <label><strong>Mode:</strong></label><br/>
        <input type="radio" name="drawMode" id="drawModePaint" value="paint" checked/>
        <label for="drawModePaint">Paint</label>
        <input type="radio" name="drawMode" id="drawModeErase" value="erase"/>
        <label for="drawModeErase">Erase</label>
      </div>
      <div id="brushDiv" style="display:none; margin-top: 0.5em">
        <label>
          <strong>Brush Size:</strong> <span id="brushVal">1</span>
        </label><br/>
        <input id="brushSizeSlider" type="range" min="1" max="10" step="1" value="1" style="width:120px"/>
      </div>

      <hr style="margin:1em 0;" />

      <label><strong>N (Simulation):</strong> <span id="nVal">1000</span></label><br/>
      <input id="nSlider" type="range" min="100" max="12000" step="100" value="1000" style="width:120px"/>

      <div style="margin-top:0.5em">
        <label><strong>p:</strong> <span id="probVal">0.50</span></label><br />
        <input id="probInput" type="range" min="0" max="1" step="0.01" value="0.50" style="width:120px"/>
      </div>

      <div style="margin-top:0.5em">
        <label><strong>q:</strong> <span id="qVal">0.00</span></label><br />
        <input id="qInput" type="range" min="0" max="1" step="0.01" value="0.00" style="width:120px"/>
      </div>

      <div style="margin-top:0.8em">
        <label>
          <input type="checkbox" id="parityCheck" checked />
          Use Parity Condition?
        </label>
      </div>

      <div style="margin-top:1em">
        <button id="runSimBtn">Run Simulation</button>
      </div>
    </div><!-- end controlsBox -->

    <!-- ========================= RIGHT: Shape for N_draw=26 ========================= -->
    <div class="shapeBox">
      <button id="drawShapeBtn">(Re)Draw Shape</button>
      <p class="labelSmall" style="margin:0.3em 0 0.8em">
      </p>
      <!-- Fixed small width/height so it won't blow up in size -->
      <svg id="shapeSVG" width="500" height="500"></svg>
    </div>
  </div><!-- end flexRow -->

  <!-- ========================= Final Permutation ========================= -->
  <h3 style="clear:both; margin-top:2em">Permutation Result</h3>
  <svg id="permSVG" width="400" height="400"></svg>
</div>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script>
////////////////////////////////////////
// 1) Small grid for user drawing
////////////////////////////////////////
const N_DRAW = 26;             // small “shape‐drawing N”
const T_DRAW = 2 * N_DRAW - 3; // 49
const I_DRAW = N_DRAW;         // 26

let userShapeMatrix = [];
let cellMap = [];

function initUserShapeMatrix() {
  userShapeMatrix = [];
  for (let t = 0; t < T_DRAW; t++) {
    userShapeMatrix.push(new Array(I_DRAW).fill(false));
  }
}
initUserShapeMatrix();

////////////////////////////////////////
// 2) Boundary condition helpers
////////////////////////////////////////
function isStaircase(t, i, N) {
  const useParity = document.getElementById("parityCheck").checked;
  let cond = (t + i >= N) && (t - i <= N - 2);
  if (useParity) {
    cond = cond && ((t - i + N) % 2 === 0);
  }
  return cond;
}

function isShaep(t, i, N) {
  const useParity = document.getElementById("parityCheck").checked;
  const k = Math.floor((i * i)/20);
  let cond = (t + k >= N) && (t - k <= N - 2);
  if (useParity) {
    cond = cond && ((t - i + N) % 2 === 0);
  }
  return cond;
}

////////////////////////////////////////
// 3) Scale (t,i) from big N → small grid
//    (for userdrawn boundary)
////////////////////////////////////////
function isUserDrawnActive(t, i, N) {
  // Map big grid (1..2N-3 × 1..N) to small grid (1..T_DRAW × 1..I_DRAW)
  const T_big = 2*N - 3;
  // fraction along each axis
  const fracT = (t - 1)/(T_big - 1); // from 0..1
  const fracI = (i - 1)/(N - 1);

  // scale to small grid indices
  const tSmall = Math.floor(fracT * (T_DRAW - 1)) + 1;
  const iSmall = Math.floor(fracI * (I_DRAW - 1)) + 1;

  if (tSmall < 1 || tSmall > T_DRAW) return false;
  if (iSmall < 1 || iSmall > I_DRAW) return false;

  const drawnOn = userShapeMatrix[tSmall - 1][iSmall - 1];
  const useParity = document.getElementById("parityCheck").checked;

  if (!drawnOn) return false;
  if (useParity) {
    return ((t - i + N) % 2 === 0);
  }
  return true;
}

////////////////////////////////////////
// 4) “Draw shape” in the small grid
////////////////////////////////////////
function drawShape() {
  const boundary = document.getElementById("boundarySelect").value;
  if (boundary === "staircase") {
    for (let t = 1; t <= T_DRAW; t++) {
      for (let i = 1; i <= I_DRAW; i++) {
        userShapeMatrix[t - 1][i - 1] = isStaircase(t, i, N_DRAW);
      }
    }
  } else if (boundary === "shaep") {
    for (let t = 1; t <= T_DRAW; t++) {
      for (let i = 1; i <= I_DRAW; i++) {
        userShapeMatrix[t - 1][i - 1] = isShaep(t, i, N_DRAW);
      }
    }
  }
  // if userdrawn => keep existing
  renderShapeSVG(boundary);
}

////////////////////////////////////////
// 5) Render the small shape as an SVG
////////////////////////////////////////
let isPainting = false;
function renderShapeSVG(boundary) {
  const svg = d3.select("#shapeSVG");
  svg.selectAll("*").remove(); // clear old

  cellMap = Array.from({ length: T_DRAW }, () => new Array(I_DRAW));

  // Use very small cell size = 2×2 for fewer pixels
  const cellW = 7, cellH = 7;

  // No "viewBox" => we rely on the fixed width/height in the <svg> tag
  // We'll directly place rectangles in pixel coordinates
  const rectData = [];
  for (let t = 1; t <= T_DRAW; t++) {
    for (let i = 1; i <= I_DRAW; i++) {
      rectData.push({
        t,
        i,
        active: userShapeMatrix[t - 1][i - 1]
      });
    }
  }

  svg.selectAll("rect")
    .data(rectData)
    .join("rect")
    .attr("x", d => (d.i - 1) * cellW)
    .attr("y", d => (d.t - 1) * cellH)
    .attr("width", cellW)
    .attr("height", cellH)
    .attr("fill", d => d.active ? "red" : "white")
    .each(function(d) {
      cellMap[d.t - 1][d.i - 1] = this;
    })
    .on("mouseover", (evt, d) => {
      if (isPainting && boundary === "userdrawn") {
        paintOrEraseBrush(d);
      }
    })
    .on("mousedown", (evt, d) => {
      evt.preventDefault();
      if (boundary === "userdrawn") {
        isPainting = true;
        paintOrEraseBrush(d);
      }
    });

  // Stop painting if mouse leaves
  svg.on("mouseup",  () => { isPainting = false; });
  svg.on("mouseleave", () => { isPainting = false; });
}

function paintOrEraseBrush(cellData) {
  const brushSize = +document.getElementById("brushSizeSlider").value;
  const paintMode = document.getElementById("drawModePaint").checked;
  const newVal = paintMode;

  const tC = cellData.t - 1;
  const iC = cellData.i - 1;
  for (let dt = -brushSize; dt <= brushSize; dt++) {
    for (let di = -brushSize; di <= brushSize; di++) {
      const tt = tC + dt;
      const ii = iC + di;
      if (tt >= 0 && tt < T_DRAW && ii >= 0 && ii < I_DRAW) {
        userShapeMatrix[tt][ii] = newVal;
        d3.select(cellMap[tt][ii]).attr("fill", newVal ? "red" : "white");
      }
    }
  }
}

////////////////////////////////////////
// 6) Clear/Fill the small grid
////////////////////////////////////////
function clearAllUserDrawn() {
  for (let t = 0; t < T_DRAW; t++) {
    for (let i = 0; i < I_DRAW; i++) {
      userShapeMatrix[t][i] = false;
    }
  }
}
function fillAllUserDrawn() {
  for (let t = 0; t < T_DRAW; t++) {
    for (let i = 0; i < I_DRAW; i++) {
      userShapeMatrix[t][i] = true;
    }
  }
}

////////////////////////////////////////
// 7) Grothendieck simulation on NxN
////////////////////////////////////////
function generateSwaps(t, N, swaps, boundary) {
  for (let i = 1; i < N; i++) {
    let active = false;
    if (boundary === "staircase") {
      active = isStaircase(t, i, N);
    } else if (boundary === "shaep") {
      active = isShaep(t, i, N);
    } else {
      // userdrawn + parity
      active = isUserDrawnActive(t, i, N);
    }
    swaps[i - 1] = active ? 1 : 0;
  }
}

function applyRandomSwap(sigma, swaps, N, p, q) {
  for (let i = 0; i < N - 1; i++) {
    if (swaps[i] === 1) {
      // Upward
      if (sigma[i] < sigma[i + 1] && Math.random() < p) {
        [sigma[i], sigma[i + 1]] = [sigma[i + 1], sigma[i]];
        continue;
      }
      // Downward
      if (sigma[i] > sigma[i + 1] && Math.random() < p * q) {
        [sigma[i], sigma[i + 1]] = [sigma[i + 1], sigma[i]];
        continue;
      }
    }
  }
}

function runSimulation(N, p, q, boundary) {
  const sigma = Array.from({ length: N }, (_, idx) => idx + 1);
  const swaps = new Array(N - 1).fill(0);
  const T_MAX = 2*N - 3;
  for (let t = 1; t <= T_MAX; t++) {
    generateSwaps(t, N, swaps, boundary);
    applyRandomSwap(sigma, swaps, N, p, q);
  }
  return sigma;
}

////////////////////////////////////////
// 8) Draw final permutation
////////////////////////////////////////
function drawPermutationMatrix(sigma) {
  const svg = d3.select("#permSVG");
  svg.selectAll("*").remove();

  const N = sigma.length;
  // We fix width/height in HTML (400×400). Let's define a small margin inside.
  const margin = 30, chartSize = 340;
  // We'll just use a naive scale
  const xScale = d3.scaleLinear()
                   .domain([-0.5, N-0.5])
                   .range([margin, margin + chartSize]);
  const yScale = d3.scaleLinear()
                   .domain([-0.5, N-0.5])
                   .range([margin, margin + chartSize]);

  const radius = (N > 2000) ? 1 : 2;
  const data = sigma.map((val, i) => ({ row: i, col: val - 1 }));

  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => xScale(d.row))
    .attr("cy", d => yScale(d.col))
    .attr("r", radius)
    .attr("fill", "#002D62");
}

////////////////////////////////////////
// 9) Wire up UI
////////////////////////////////////////
function initUI() {
  // Toggle user‐drawn UI
  document.getElementById("boundarySelect").addEventListener("change", e => {
    const val = e.target.value;
    const show = (val === "userdrawn");
    document.getElementById("drawnNote").style.display = show ? "block" : "none";
    document.getElementById("drawTools").style.display = show ? "flex" : "none";
    document.getElementById("brushDiv").style.display = show ? "block" : "none";
    document.getElementById("modeDiv").style.display = show ? "block" : "none";
  });

  // Brush size
  document.getElementById("brushSizeSlider").addEventListener("input", e => {
    document.getElementById("brushVal").textContent = e.target.value;
  });

  // N slider
  document.getElementById("nSlider").addEventListener("input", e => {
    document.getElementById("nVal").textContent = e.target.value;
  });

  // p,q sliders
  document.getElementById("probInput").addEventListener("input", e => {
    document.getElementById("probVal").textContent = parseFloat(e.target.value).toFixed(2);
  });
  document.getElementById("qInput").addEventListener("input", e => {
    document.getElementById("qVal").textContent = parseFloat(e.target.value).toFixed(2);
  });

  // Draw shape
  document.getElementById("drawShapeBtn").addEventListener("click", () => {
    drawShape();
  });

  // Run Simulation
  document.getElementById("runSimBtn").addEventListener("click", () => {
    const boundary = document.getElementById("boundarySelect").value;
    const N = +document.getElementById("nSlider").value;
    const p = +document.getElementById("probInput").value;
    const q = +document.getElementById("qInput").value;

    const sigma = runSimulation(N, p, q, boundary);
    drawPermutationMatrix(sigma);
  });

  // Clear/Fill
  document.getElementById("clearAllBtn").addEventListener("click", () => {
    clearAllUserDrawn();
    renderShapeSVG("userdrawn");
  });
  document.getElementById("fillAllBtn").addEventListener("click", () => {
    fillAllUserDrawn();
    renderShapeSVG("userdrawn");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initUI();
  // Hide userdrawn UI by default
  document.getElementById("drawnNote").style.display = "none";
  document.getElementById("drawTools").style.display = "none";
  document.getElementById("brushDiv").style.display = "none";
  document.getElementById("modeDiv").style.display = "none";

  // Initialize numeric labels
  document.getElementById("nVal").textContent = "1000";
  document.getElementById("probVal").textContent = "0.50";
  document.getElementById("qVal").textContent = "0.00";
  document.getElementById("brushVal").textContent = "1";
});
</script>
