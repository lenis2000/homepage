---
title: Domino tilings of the Aztec diamond with 2x2 periodic weights
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-02-03-aztec-periodic.md'
    txt: 'This simulation is interactive, written in JavaScript; see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-02-03-aztec-periodic.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  /* Basic styling for the SVG and controls */
  #aztec-svg {
    width: 100%;
    height: 80vh;
    border: 1px solid #ccc;
  }
  .controls {
    margin-bottom: 10px;
  }
</style>

This simulation demonstrates random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>, which is a diamond-shaped union of unit squares. The simulation uses a measure with $2\times 2$ periodic weights, as in the <a href="https://arxiv.org/abs/1410.2385">paper</a> by Chhita and Johansson. The simulation uses the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>; this version is adapted for <code>JS</code> + <code>WebAssembly</code>. Visualization is done using <code>D3.js</code>.

The sampler works in your browser. Up to $n \sim 120$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=300$ to avoid freezing your browser.

### Update 2025-04-14: TikZ Code Generation

You can now get a TikZ code for the sampled Aztec diamond (supporting dominoes and nonintersecting paths) using [this Python script](https://github.com/lenis2000/homepage/blob/master/LaTeX/Scripts/2025-04-14-SVG_to_TiKZ_domino_tiling_convert.py).

---

<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="/js/2025-02-03-aztec-periodic.js"></script>

<!-- Simulation Controls -->
<div class="controls">
  <label for="n-input">Aztec Diamond Order (n ≤ 300): </label>
  <input id="n-input" type="number" value="50" min="2" step="2" max="300" size="3">
  <button id="update-btn">Update</button>
</div>

<div class="controls">
  <label for="a-input">a:</label>
  <input id="a-input" type="number" value="0.5" step="0.1">
  <label for="b-input">b:</label>
  <input id="b-input" type="number" value="1.0" step="0.1">
</div>

<div class="controls">
  <input type="checkbox" id="grayscale-checkbox">
  <label for="grayscale-checkbox">Grayscale mode</label>
</div>

<!-- Progress indicator -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<div class="row">
  <div class="col-12">
    <svg id="aztec-svg"></svg>
  </div>
</div>

<script>
// Global variable to cache the simulation sample.
let cachedDominoes = null;

// Helper: convert a brightness value (0–255) to a hex grayscale string.
function grayHex(brightness) {
  let hex = Math.round(brightness).toString(16);
  if(hex.length < 2) hex = "0" + hex;
  return "#" + hex + hex + hex;
}

// Pre-compute grayscale palettes for the four original colors.
const palettes = {
"#ff0000": d3.range(0,8).map(i => grayHex(30*i+5)),
"#00ff00": d3.range(0,8).map(i => grayHex(30*i+10)),
"#0000ff": d3.range(0,8).map(i => grayHex(30*i+12)),
"#ffff00": d3.range(0,8).map(i => grayHex(30*i+18))
};

function getPos(d) {
    if (d.w > d.h) {
        return ((Math.floor(d.x) % 8) + 8) % 8;
    } else {
        return ((Math.floor(d.y) % 8) + 8) % 8;
    }
}

function getGrayscaleColor(originalColor, d) {
  let c = d3.color(originalColor);
  if (!c) return originalColor;
  let normHex = c.formatHex().toLowerCase();
  let pos = getPos(d);
  if (palettes[normHex]) {
    return palettes[normHex][pos];
  }
  let r = c.r, g = c.g, b = c.b;
  let lum = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  let offset = ((pos / 7) - 0.5) * 80;
  let newLum = Math.max(0, Math.min(255, lum + offset));
  return grayHex(newLum);
}

// Wrap exported functions after module is initialized.
Module.onRuntimeInitialized = async function() {
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number','number','number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  let progressInterval;

  function startProgressPolling() {
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      const progress = getProgress();
      progressElem.innerText = "Sampling... (" + progress + "%)";
      if (progress >= 100) clearInterval(progressInterval);
    }, 100);
  }

  async function updateVisualization(n) {
    svg.selectAll("g").remove();
    startProgressPolling();

    const aVal = parseFloat(document.getElementById("a-input").value);
    const bVal = parseFloat(document.getElementById("b-input").value);
    const useGrayscale = document.getElementById("grayscale-checkbox").checked;

    const ptr = await simulateAztec(n, aVal, bVal);
    const jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);

    let dominoes;
    try {
      dominoes = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Error parsing JSON:", e, jsonStr);
      progressElem.innerText = "Error during sampling";
      clearInterval(progressInterval);
      return;
    }
    cachedDominoes = dominoes;

    const minX = d3.min(dominoes, d => d.x);
    const minY = d3.min(dominoes, d => d.y);
    const maxX = d3.max(dominoes, d => d.x + d.w);
    const maxY = d3.max(dominoes, d => d.y + d.h);
    const widthDominoes = maxX - minX;
    const heightDominoes = maxY - minY;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scale = Math.min(svgWidth / widthDominoes, svgHeight / heightDominoes) * 0.9;
    const translateX = (svgWidth - widthDominoes * scale) / 2 - minX * scale;
    const translateY = (svgHeight - heightDominoes * scale) / 2 - minY * scale;

    const group = svg.append("g")
                     .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

    group.selectAll("rect")
         .data(dominoes)
         .enter()
         .append("rect")
         .attr("x", d => d.x)
         .attr("y", d => d.y)
         .attr("width", d => d.w)
         .attr("height", d => d.h)
         .attr("fill", d => useGrayscale ? getGrayscaleColor(d.color, d) : d.color)
         .attr("stroke", "#000")
         .attr("stroke-width", 0.5);

    progressElem.innerText = "";
  }

  document.getElementById("update-btn").addEventListener("click", () => {
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (isNaN(n) || n < 2 || n > 300 || n % 2 !== 0) {
      alert("Please enter a valid even number n, 2 ≤ n ≤ 300.");
      return;
    }
    updateVisualization(n);
  });

  document.getElementById("grayscale-checkbox").addEventListener("change", () => {
    const useGrayscale = document.getElementById("grayscale-checkbox").checked;
    if (cachedDominoes) {
      d3.select("#aztec-svg").select("g").selectAll("rect")
        .attr("fill", d => useGrayscale ? getGrayscaleColor(d.color, d) : d.color);
    }
  });

  const initialN = parseInt(document.getElementById("n-input").value, 10);
  updateVisualization(initialN);
};
</script>
