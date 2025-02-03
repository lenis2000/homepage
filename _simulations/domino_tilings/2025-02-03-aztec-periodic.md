---
title: Domino tilings of the Aztec diamond with periodic weights
model: domino-tilings-periodic
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

<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="/js/2025-02-03-aztec-periodic.js"></script>

<!-- Simulation Controls -->
<div class="controls">
  <label for="n-input">Aztec Diamond Order (n ≤ 300): </label>
  <input id="n-input" type="number" value="50" min="2" step="2" max="300" size="3">
  <button id="update-btn">Update</button>
</div>

<div class="controls">
  <input type="checkbox" id="periodic-checkbox" checked>
  <label for="periodic-checkbox">Use periodic weights (period 2×2: a = 0.5, b = 1.0)</label>
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
// The keys must be normalized (lowercase) hex strings.
const palettes = {
"#ff0000": d3.range(0,8).map(i => grayHex(30*i+5)), // red: brightness from 240 downwards
"#00ff00": d3.range(0,8).map(i => grayHex(30*i+10)), // green
"#0000ff": d3.range(0,8).map(i => grayHex(30*i+12)), // blue
"#ffff00": d3.range(0,8).map(i => grayHex(30*i+18))  // yellow
};

// Compute a position index between 0 and 7 based on domino coordinates,
// using the orientation of the domino: for horizontal dominoes (w > h), use the x-coordinate modulo 4;
// for vertical dominoes, use the y-coordinate modulo 4 and add 4.
function getPos(d) {
    if (d.w > d.h) { // horizontal domino
        return ((Math.floor(d.x) % 8) + 8) % 8;
    } else { // vertical domino
        return ((Math.floor(d.y) % 8) + 8) % 8;
    }
}

// Updated grayscale helper: given the original domino color and domino data,
// return one of eight grayscale shades.
function getGrayscaleColor(originalColor, d) {
  let c = d3.color(originalColor);
  if (!c) return originalColor; // fallback if parsing fails
  let normHex = c.formatHex().toLowerCase();
  let pos = getPos(d); // index from 0 to 7
  if (palettes[normHex]) {
    return palettes[normHex][pos];
  }
  // Fallback: generic luminance conversion.
  let r = c.r, g = c.g, b = c.b;
  let lum = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  // Adjust brightness linearly based on pos.
  let offset = ((pos / 7) - 0.5) * 80;
  let newLum = Math.max(0, Math.min(255, lum + offset));
  return grayHex(newLum);
}

// Wait for the WASM module to initialize.
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions.
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number', 'number'], {async: true});
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

  // Main visualization update function.
  // When called from the update button, it re-samples dominoes and caches them.
  async function updateVisualization(n) {
    svg.selectAll("g").remove();
    startProgressPolling();

    const periodicCheckbox = document.getElementById("periodic-checkbox");
    const grayscaleCheckbox = document.getElementById("grayscale-checkbox");
    const periodic = periodicCheckbox.checked ? 1 : 0;
    const useGrayscale = grayscaleCheckbox.checked;

    const ptr = await simulateAztec(n, periodic);
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
    cachedDominoes = dominoes; // cache the simulation result

    // Compute bounding box.
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

  // "Update" button: re-sample and redraw.
  document.getElementById("update-btn").addEventListener("click", () => {
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (isNaN(n) || n < 2 || n > 300 || n % 2 !== 0) {
      alert("Please enter a valid even number n, 2 ≤ n ≤ 300.");
      return;
    }
    updateVisualization(n);
  });

  // When the grayscale checkbox is toggled, simply update the fill colors using the cached dominoes.
  document.getElementById("grayscale-checkbox").addEventListener("change", () => {
    const useGrayscale = document.getElementById("grayscale-checkbox").checked;
    if (cachedDominoes) {
      d3.select("#aztec-svg").select("g").selectAll("rect")
        .attr("fill", d => useGrayscale ? getGrayscaleColor(d.color, d) : d.color);
    }
  });

  // Run the initial simulation.
  const initialN = parseInt(document.getElementById("n-input").value, 10);
  updateVisualization(initialN);
};
</script>
