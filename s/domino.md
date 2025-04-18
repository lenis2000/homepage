---
title: Domino tilings of the Aztec diamond
author: 'Leonid Petrov'
layout: default
permalink: /domino/
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/p/domino.md'
    txt: 'This simulation is interactive, written in JavaScript; see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/p/domino.cpp'
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
  #zoom-in-btn, #zoom-out-btn {
    font-weight: bold;
    width: 30px;
    height: 30px;
  }
  #zoom-reset-btn {
    height: 30px;
  }
</style>

This simulation demonstrates random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>, which is a diamond-shaped union of unit squares. The simulation uses a measure with $3\times 3$ periodic weights, extending the <a href="https://arxiv.org/abs/1410.2385">work</a> by Chhita and Johansson on 2×2 periodic weights.

The weight assignment uses a full 3×3 block pattern with 9 different weights:
```
[w₁ w₂ w₃]
[w₄ w₅ w₆]
[w₇ w₈ w₉]
```

Each position in the 3×3 grid can have its own weight parameter, allowing for complex periodic patterns. The simulation uses the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>; this version is adapted for <code>JS</code> + <code>WebAssembly</code>. Visualization is done using <code>D3.js</code>.

The sampler works in your browser. Up to $n \sim 120$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=300$ to avoid freezing your browser.


---

<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="/js/2025-04-18-three-periodic.js"></script>

<!-- Simulation Controls -->
<div class="controls">
  <label for="n-input">Aztec Diamond Order (n ≤ 300): </label>
  <input id="n-input" type="number" value="50" min="2" step="2" max="300" size="3">
  <button id="update-btn">Update</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
</div>

<div class="controls" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 600px; margin-bottom: 20px;">
  <div>
    <label for="w1-input">w₁:</label>
    <input id="w1-input" type="number" value="1.0" step="0.1" style="width: 60px;">
  </div>
  <div>
    <label for="w2-input">w₂:</label>
    <input id="w2-input" type="number" value="1.0" step="0.1" style="width: 60px;">
  </div>
  <div>
    <label for="w3-input">w₃:</label>
    <input id="w3-input" type="number" value="1.0" step="0.1" style="width: 60px;">
  </div>
  <div>
    <label for="w4-input">w₄:</label>
    <input id="w4-input" type="number" value="2.5" step="0.1" style="width: 60px;">
  </div>
  <div>
    <label for="w5-input">w₅:</label>
    <input id="w5-input" type="number" value="1.0" step="0.1" style="width: 60px;">
  </div>
  <div>
    <label for="w6-input">w₆:</label>
    <input id="w6-input" type="number" value="1.0" step="0.1" style="width: 60px;">
  </div>
  <div>
    <label for="w7-input">w₇:</label>
    <input id="w7-input" type="number" value="1.0" step="0.1" style="width: 60px;">
  </div>
  <div>
    <label for="w8-input">w₈:</label>
    <input id="w8-input" type="number" value="1.0" step="0.1" style="width: 60px;">
  </div>
  <div>
    <label for="w9-input">w₉:</label>
    <input id="w9-input" type="number" value="4.0" step="0.1" style="width: 60px;">
  </div>
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
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number','number','number','number','number','number','number','number','number','number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  const updateBtn = document.getElementById("update-btn");
  const cancelBtn = document.getElementById("cancel-btn");

  // Create zoom behavior
  let initialTransform = {}; // Store initial transform parameters
  const zoom = d3.zoom()
    .scaleExtent([0.1, 50]) // Min and max zoom scale (up to 50x)
    .on("zoom", (event) => {
      if (!initialTransform.scale) return; // Skip if no initial transform is set

      // Apply the zoom transformation on top of initial transform
      const group = svg.select("g");
      const t = event.transform;
      group.attr("transform",
        `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`);
    });

  // Enable zoom on the SVG
  svg.call(zoom);

  // Add double-click to reset zoom
  svg.on("dblclick.zoom", () => {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  });

  // Add zoom controls to the UI
  const controlsContainer = d3.select(".row").insert("div", "div")  // Insert before the SVG container
    .attr("class", "col-12")
    .append("div")
    .attr("class", "controls zoom-controls")
    .style("margin-bottom", "10px");

  controlsContainer.append("span")
    .text("Zoom: ")
    .style("font-weight", "bold");

  controlsContainer.append("button")
    .attr("id", "zoom-in-btn")
    .style("margin-left", "5px")
    .text("+")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.scaleBy, 1.3);
    });

  controlsContainer.append("button")
    .attr("id", "zoom-out-btn")
    .style("margin-left", "5px")
    .text("-")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.scaleBy, 0.7);
    });

  controlsContainer.append("button")
    .attr("id", "zoom-reset-btn")
    .style("margin-left", "5px")
    .text("Reset Zoom")
    .on("click", () => {
      svg.transition()
        .duration(300)
        .call(zoom.transform, d3.zoomIdentity);
    });

  controlsContainer.append("span")
    .style("margin-left", "10px")
    .style("font-style", "italic")
    .style("font-size", "0.9em")
    .text("(You can also use mouse wheel to zoom and drag to pan)");

  let progressInterval;
  let simulationActive = false;
  let simulationPromise = null;
  let simulationAbortController = null;

  function startProgressPolling() {
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      if (!simulationActive) {
        clearInterval(progressInterval);
        return;
      }

      const progress = getProgress();
      progressElem.innerText = "Sampling... (" + progress + "%)";

      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
  }

  function startSimulation() {
    simulationActive = true;
    updateBtn.disabled = true;
    cancelBtn.style.display = 'inline-block';
    simulationAbortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    clearInterval(progressInterval);
    updateBtn.disabled = false;
    cancelBtn.style.display = 'none';
    progressElem.innerText = "Simulation cancelled";

    if (simulationAbortController) {
      simulationAbortController.abort();
      simulationAbortController = null;
    }
  }

  // Helper function to sleep for ms milliseconds
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function updateVisualization(n) {
    svg.selectAll("g").remove();
    startSimulation();
    startProgressPolling();

    try {
      // Get all 9 weight parameters
      const w1 = parseFloat(document.getElementById("w1-input").value);
      const w2 = parseFloat(document.getElementById("w2-input").value);
      const w3 = parseFloat(document.getElementById("w3-input").value);
      const w4 = parseFloat(document.getElementById("w4-input").value);
      const w5 = parseFloat(document.getElementById("w5-input").value);
      const w6 = parseFloat(document.getElementById("w6-input").value);
      const w7 = parseFloat(document.getElementById("w7-input").value);
      const w8 = parseFloat(document.getElementById("w8-input").value);
      const w9 = parseFloat(document.getElementById("w9-input").value);
      const useGrayscale = document.getElementById("grayscale-checkbox").checked;

      // Allow UI to update before starting heavy computation
      await sleep(50);

      // Run simulation with periodic yielding to keep UI responsive
      const signal = simulationAbortController.signal;

      simulationPromise = (async () => {
        if (signal.aborted) return null;

        // Run the heavy simulation
        const ptr = await simulateAztec(n, w1, w2, w3, w4, w5, w6, w7, w8, w9);

        if (signal.aborted) {
          if (ptr) freeString(ptr);
          return null;
        }

        // Allow UI thread to breathe
        await sleep(10);

        if (signal.aborted) {
          if (ptr) freeString(ptr);
          return null;
        }

        const jsonStr = Module.UTF8ToString(ptr);
        freeString(ptr);

        // Parse results
        if (signal.aborted) return null;

        let dominoes;
        try {
          dominoes = JSON.parse(jsonStr);
        } catch (e) {
          console.error("Error parsing JSON:", e, jsonStr);
          if (simulationActive) {
            progressElem.innerText = "Error during sampling";
          }
          return null;
        }

        return dominoes;
      })();

      // Wait for simulation to complete
      const dominoes = await simulationPromise;

      // If simulation was cancelled or errored
      if (!dominoes || !simulationActive) {
        return;
      }

      cachedDominoes = dominoes;

      // Allow UI thread to breathe before rendering
      await sleep(10);
      if (!simulationActive) return;

      // Process and render the results in smaller chunks
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

      // Store the initial transform parameters for zoom behavior
      initialTransform = {
        translateX: translateX,
        translateY: translateY,
        scale: scale
      };

      // Reset the zoom transform when creating a new visualization
      svg.call(zoom.transform, d3.zoomIdentity);

      const group = svg.append("g")
                       .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

      // Render dominoes in batches to keep UI responsive
      const BATCH_SIZE = 200;

      for (let i = 0; i < dominoes.length && simulationActive; i += BATCH_SIZE) {
        const batch = dominoes.slice(i, i + BATCH_SIZE);

        group.selectAll("rect.batch" + i)
             .data(batch)
             .enter()
             .append("rect")
             .attr("x", d => d.x)
             .attr("y", d => d.y)
             .attr("width", d => d.w)
             .attr("height", d => d.h)
             .attr("fill", d => useGrayscale ? getGrayscaleColor(d.color, d) : d.color)
             .attr("stroke", "#000")
             .attr("stroke-width", 0.5);

        // Yield to UI thread after each batch
        if (i + BATCH_SIZE < dominoes.length) {
          await sleep(0);
          if (!simulationActive) return;
        }
      }

      progressElem.innerText = "";
      updateBtn.disabled = false;
      cancelBtn.style.display = 'none';
      simulationActive = false;
    } catch (error) {
      console.error("Simulation error:", error);
      progressElem.innerText = "Error during simulation";
      stopSimulation();
    }
  }

  document.getElementById("update-btn").addEventListener("click", () => {
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (isNaN(n) || n < 2 || n > 300 || n % 2 !== 0) {
      alert("Please enter a valid even number n, 2 ≤ n ≤ 300.");
      return;
    }
    updateVisualization(n);
  });

  document.getElementById("cancel-btn").addEventListener("click", () => {
    stopSimulation();
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
