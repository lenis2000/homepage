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
// Global variable to store the current simulation data.
let cachedDominoes = null;

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

  // Helper function to compute a position index based on domino coordinates.
  // Use mod 4 for both x and y; then define:
  //    pos = (x_mod_4 * 2) + (if y_mod_4 >= 2 then 1 else 0)
  // This gives a value from 0 to 7.
  function getPos(d) {
    let xMod = ((Math.floor(d.x) % 4) + 4) % 4;
    let yMod = ((Math.floor(d.y) % 4) + 4) % 4;
    return xMod * 2 + (yMod >= 2 ? 1 : 0);
  }

  // Updated grayscale helper function.
  // For four specific original colors, we map each to an array of 8 grayscale shades.
  // Otherwise, we compute a generic grayscale value based on luminance and adjust based on pos.
  function getGrayscaleColor(originalColor, d) {
    let c = d3.color(originalColor);
    if (!c) return originalColor; // fallback if parsing fails
    let normHex = c.formatHex().toLowerCase();
    let pos = getPos(d); // value between 0 and 7
    const mapping = {
      "#ff0000": ["#f8f8f8", "#e8e8e8", "#d8d8d8", "#c8c8c8", "#b8b8b8", "#a8a8a8", "#989898", "#888888"],
      "#00ff00": ["#f0f0f0", "#e0e0e0", "#d0d0d0", "#c0c0c0", "#b0b0b0", "#a0a0a0", "#909090", "#808080"],
      "#0000ff": ["#e8e8e8", "#d8d8d8", "#c8c8c8", "#b8b8b8", "#a8a8a8", "#989898", "#888888", "#787878"],
      "#ffff00": ["#fcfcfc", "#ececec", "#dcdcdc", "#cccccc", "#bcbcbc", "#acacac", "#9c9c9c", "#8c8c8c"]
    };
    if (mapping[normHex]) {
      return mapping[normHex][pos];
    }
    // Fallback: compute luminance and adjust by an offset that depends on pos.
    let r = c.r, g = c.g, b = c.b;
    let lum = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
    // Let offset vary linearly from -40 to +40 over 8 steps.
    let offset = ((pos / 7) - 0.5) * 80;
    let newLum = Math.max(0, Math.min(255, lum + offset));
    let gray = Math.round(newLum).toString(16).padStart(2, "0");
    return "#" + gray + gray + gray;
  }

  // Main visualization update function: re-samples (if necessary) and draws the dominoes.
  async function updateVisualization(n) {
    svg.selectAll("g").remove();
    startProgressPolling();

    const periodicCheckbox = document.getElementById("periodic-checkbox");
    const grayscaleCheckbox = document.getElementById("grayscale-checkbox");
    const periodic = periodicCheckbox.checked ? 1 : 0;
    const useGrayscale = grayscaleCheckbox.checked;

    // Sample the dominoes from the simulation.
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

    // Cache the simulation result.
    cachedDominoes = dominoes;

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

  // When the update button is clicked, re-sample and redraw.
  document.getElementById("update-btn").addEventListener("click", () => {
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (isNaN(n) || n < 2 || n > 300 || n % 2 !== 0) {
      alert("Please enter a valid even number n, 2 ≤ n ≤ 300.");
      return;
    }
    updateVisualization(n);
  });

  // When the grayscale checkbox is toggled, do not re-sample.
  // Instead, simply update the fill colors of the already drawn dominoes.
  document.getElementById("grayscale-checkbox").addEventListener("change", () => {
    const useGrayscale = document.getElementById("grayscale-checkbox").checked;
    // If we have a cached sample, update the fill attribute.
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
