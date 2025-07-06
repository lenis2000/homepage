---
title: Glauber Dynamics on Domino tilings with 2x2 periodic weights
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-04-21-aztec-glauber-two-by-two.md'
    txt: 'This simulation is interactive, written in JavaScript; see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-04-21-aztec-glauber-two-by-two.cpp'
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
  #dynamics-btn {
    background-color: #4CAF50;
    color: white;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  #dynamics-btn.running {
    background-color: #f44336;
  }

  /* Dark theme styles */
  [data-theme="dark"] svg {
    border-color: #555;
  }

  [data-theme="dark"] #dynamics-btn {
    background-color: #3a7f3a;
    color: #ddd;
  }

  [data-theme="dark"] #dynamics-btn:hover {
    background-color: #4a8f4a;
  }

  [data-theme="dark"] #dynamics-btn.running {
    background-color: #a43330;
  }

  [data-theme="dark"] label {
    color: #bbb;
  }

  [data-theme="dark"] input[type="number"] {
    background-color: #3a3a3a;
    border-color: #555;
    color: #ddd;
  }
</style>
## About the simulation

##### Shuffling (initial picture)

This simulation demonstrates random domino tilings of an Aztec diamond—a diamond‑shaped union of unit squares. The probability measure is $2\times2$‑periodic with edge‑weights $(a,b)$, as studied by Chhita & Johansson in [Domino tilings of the Aztec diamond with periodic weights](https://arxiv.org/abs/1410.2385). Sampling uses the shuffling algorithm. The original Python implementation by Sunil Chhita has been ported to JavaScript + WebAssembly, and the graphics are rendered with D3.js.

The sampling runs entirely in your browser. For sizes up to about $n\le120$ the sampler is fast; larger $n$ may take noticeable time (hard cap $n=300$ to protect your browser).

##### Glauber Dynamics

You can run the Glauber dynamics on domino tilings, and adjust the speed.
You can start the dynamics with one set of parameters $(a,b)$ and change them on the fly, observing in real time how the tiling reacts.
Key phenomena visible in the grayscale view:

- When $a=b$, the measure is uniform and inside the arctic circle you can see a "liquid" mixture of colors.
- When $a<1, b=1$, lighter color dominates; when $a>1, b=1$, darker color dominates.
- Local color relaxation occurs much faster than changes in the macroscopic limit shape.

**Conjecture**: In the non‑uniform case $a\neq b$, the Glauber chain requires exponentially many sweeps in $n$ to alter the limit shape.

---

<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="/js/2025-04-21-aztec-glauber-two-by-two.js"></script>

<!-- Simulation Controls -->
<!-- Dynamics controls – always visible -->
<div class="controls">
  <label for="sweeps-input">Sweeps per visual update:</label>
  <input id="sweeps-input" type="number"
         value="100" min="1" step="1" style="width:70px;">
  <button id="dynamics-btn" style="margin-left:10px;">Start Dynamics</button>
</div>


<div class="controls">
  <label for="n-input">Aztec Diamond Order (n ≤ 300): </label>
  <input id="n-input" type="number" value="50" min="2" step="2" max="300" size="3">
  <button id="update-btn">Update</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
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

<div style="margin-top: 10px; margin-bottom: 10px;">
  <button id="tikz-btn" class="btn btn-primary">Generate TikZ Code</button>
  <div id="tikz-buttons-container" style="margin-top: 10px; display: none;">
    <button id="copy-tikz-btn" class="btn btn-primary">Copy to Clipboard</button>
    <button id="download-tikz-btn" class="btn btn-primary" style="margin-left: 10px;">Download .tex File</button>
    <span id="copy-success-msg" style="color: green; margin-left: 10px; font-weight: bold; display: none;">Copied!</span>
  </div>
</div>

<!-- TikZ code container that will be updated dynamically -->
<div id="tikz-code-container" style="font-family: 'Courier New', monospace; padding: 15px; border: 1px solid #ccc; border-radius: 4px; background-color: white; white-space: pre; font-size: 14px; max-height: 40vh; overflow-y: auto; margin-top: 15px; margin-bottom: 15px; display: none;"></div>

<script>
// Global variable to cache the simulation sample.
let cachedDominoes = null;
let dynamicsRunning = false;
let dynamicsTimer = null;

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
  const simulateAztecGlauber = Module.cwrap('simulateAztecGlauber', 'number', ['number','number','number','number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  // Add this new function for single Glauber steps
  const performGlauberStep = Module.cwrap('performGlauberStep', 'number', ['number', 'number'], {async: true});
  const performGlauberSteps = Module.cwrap('performGlauberSteps', 'number', ['number','number','number'], {async:true});

  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  const updateBtn = document.getElementById("update-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const dynamicsBtn = document.getElementById("dynamics-btn");
  let progressInterval;

  // Create zoom behavior
  let initialTransform = {}; // Store initial transform parameters
  const zoom = d3.zoom()
    .scaleExtent([0.1, 50]) // Min and max zoom scale
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

  // Simulation state
  let simulationActive = false;
  let simulationAbortController = null;

  // Helper function to sleep for ms milliseconds
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function startSimulation() {
    simulationActive = true;
    updateBtn.disabled = true;
    document.getElementById("n-input").disabled = true;
    document.getElementById("a-input").disabled = true;
    document.getElementById("b-input").disabled = true;
    cancelBtn.style.display = 'inline-block';

    simulationAbortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    clearInterval(progressInterval);
    updateBtn.disabled = false;
    document.getElementById("n-input").disabled = false;
    document.getElementById("a-input").disabled = false;
    document.getElementById("b-input").disabled = false;
    cancelBtn.style.display = 'none';
    progressElem.innerText = "Simulation cancelled";

    if (simulationAbortController) {
      simulationAbortController.abort();
      simulationAbortController = null;
    }
  }

  function startProgressPolling() {
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      if (!simulationActive) {
        clearInterval(progressInterval);
        return;
      }

      const progress = getProgress();
      progressElem.innerText = "Sampling... (" + progress + "%)";
      if (progress >= 100) clearInterval(progressInterval);
    }, 100);
  }

// --- helper: run nSteps Glauber flips with current a,b and redraw ---
async function advanceDynamics(nSteps) {
  const aVal = parseFloat(document.getElementById('a-input').value);
  const bVal = parseFloat(document.getElementById('b-input').value);

  const ptr   = await performGlauberSteps(aVal, bVal, nSteps);
  const json  = Module.UTF8ToString(ptr);
  freeString(ptr);

  cachedDominoes = JSON.parse(json);
  updateDominoesVisualization();          // redraw
  return nSteps;                           // tell caller how many steps ran
}


  // Function to start/stop real-time Glauber dynamics
  async function toggleDynamics() {
    if (dynamicsRunning) {
      // Stop dynamics
      clearInterval(dynamicsTimer);
      dynamicsTimer = null;
      dynamicsRunning = false;
      dynamicsBtn.textContent = "Start Dynamics";
      dynamicsBtn.classList.remove("running");
      progressElem.innerText = "";

      // Re-enable controls
      document.getElementById("sweeps-input").disabled = false;
      document.getElementById("n-input").disabled = false;
      document.getElementById("a-input").disabled = false;
      document.getElementById("b-input").disabled = false;
      updateBtn.disabled = false;
    } else {
      // Start dynamics
      if (!cachedDominoes) {
        alert("Please generate a tiling first before starting dynamics.");
        return;
      }

      dynamicsRunning = true;
      dynamicsBtn.textContent = "Stop Dynamics";
      dynamicsBtn.classList.add("running");
      progressElem.innerText = "";

      // Only disable new sample inputs, leave sweeps/a/b editable
      document.getElementById("n-input").disabled = true;
      updateBtn.disabled = true;

          // ---- FIRST update *before* timer starts ----
          const firstSteps   = Math.max(1,
            parseInt(document.getElementById('sweeps-input').value, 10) || 1);

          let stepCount      = await advanceDynamics(firstSteps);   // runs once
          progressElem.innerText = "";


      // Start the dynamics timer - perform steps and update visualization
      const updateInterval = 100; // ms between screen draws

      // every update interval:
dynamicsTimer = setInterval(async () => {
  const stepsPerUpdate = Math.max(
        1, parseInt(document.getElementById('sweeps-input').value,10)||1);
  const aVal = parseFloat(document.getElementById('a-input').value);
  const bVal = parseFloat(document.getElementById('b-input').value);

  const ptr = await performGlauberSteps(aVal, bVal, stepsPerUpdate);
  const jsonStr = Module.UTF8ToString(ptr);  freeString(ptr);
  cachedDominoes = JSON.parse(jsonStr);

  updateDominoesVisualization();
  stepCount += stepsPerUpdate;
  progressElem.innerText = "";
}, updateInterval);
    }
  }

  // Function to update just the visualization without resampling
  function updateDominoesVisualization() {
    if (!cachedDominoes) return;

    const useGrayscale = document.getElementById("grayscale-checkbox").checked;

    // Update existing rectangles
    const rects = svg.select("g").selectAll("rect").data(cachedDominoes);

    // Update attributes that might have changed
    rects.attr("fill", d => useGrayscale ? getGrayscaleColor(d.color, d) : d.color)
         .attr("x", d => d.x)
         .attr("y", d => d.y)
         .attr("width", d => d.w)
         .attr("height", d => d.h);
  }

  async function updateVisualization(n) {
    // First, stop any running dynamics
    if (dynamicsRunning) {
      clearInterval(dynamicsTimer);
      dynamicsTimer = null;
      dynamicsRunning = false;
      dynamicsBtn.textContent = "Start Dynamics";
      dynamicsBtn.classList.remove("running");
    }

    svg.selectAll("g").remove();
    startSimulation();
    startProgressPolling();

    const signal = simulationAbortController.signal;

    // Hide the TikZ code container if it's visible
    const codeContainer = document.getElementById('tikz-code-container');
    if (codeContainer) {
      codeContainer.style.display = 'none';
    }

    // Hide the buttons container
    const buttonsContainer = document.getElementById('tikz-buttons-container');
    if (buttonsContainer) {
      buttonsContainer.style.display = 'none';
    }

    // Allow UI to update before starting heavy computation
    await sleep(50);
    if (signal.aborted) return;

    const aVal = parseFloat(document.getElementById("a-input").value);
    const bVal = parseFloat(document.getElementById("b-input").value);
    const useGrayscale = document.getElementById("grayscale-checkbox").checked;

    // Run simulation with periodic yielding to keep UI responsive
    try {
      // always take an exact shuffling sample
      let ptr = await simulateAztec(n, aVal, bVal);


      if (signal.aborted) {
        if (ptr) freeString(ptr);
        return;
      }

      // Allow UI thread to breathe
      await sleep(10);
      if (signal.aborted) {
        if (ptr) freeString(ptr);
        return;
      }

      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      if (signal.aborted) return;

      // Allow UI thread to breathe before parsing
      await sleep(10);
      if (signal.aborted) return;

      let dominoes;
      try {
        dominoes = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Error parsing JSON:", e, jsonStr);
        if (simulationActive) {
          progressElem.innerText = "Error during sampling";
        }
        clearInterval(progressInterval);
        return;
      }

      if (signal.aborted) return;

      cachedDominoes = dominoes;

      const minX = d3.min(dominoes, d => d.x);
      const minY = d3.min(dominoes, d => d.y);
      const maxX = d3.max(dominoes, d => d.x + d.w);
      const maxY = d3.max(dominoes, d => d.y + d.h);
      const widthDominoes = maxX - minX;
      const heightDominoes = maxY - minY;

      // Allow UI thread to breathe before rendering
      await sleep(10);
      if (signal.aborted) return;

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
        if (signal.aborted) return;

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
          if (signal.aborted) return;
        }
      }

      // Only update if not aborted
      if (!signal.aborted) {
        progressElem.innerText = "";
        updateBtn.disabled = false;
        document.getElementById("n-input").disabled = false;
        document.getElementById("a-input").disabled = false;
        document.getElementById("b-input").disabled = false;
        cancelBtn.style.display = 'none';
        simulationActive = false;
      }
    } catch (error) {
      console.error("Simulation error:", error);
      if (simulationActive) {
        progressElem.innerText = "Error during simulation";
      }
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

  // Add cancel button event listener
  document.getElementById("cancel-btn").addEventListener("click", stopSimulation);

  // Add dynamics button event listener
  document.getElementById("dynamics-btn").addEventListener("click", toggleDynamics);

  document.getElementById("grayscale-checkbox").addEventListener("change", () => {
    const useGrayscale = document.getElementById("grayscale-checkbox").checked;
    if (cachedDominoes) {
      d3.select("#aztec-svg").select("g").selectAll("rect")
        .attr("fill", d => useGrayscale ? getGrayscaleColor(d.color, d) : d.color);
    }
  });


  // Function to convert SVG dominoes to TikZ code
  function svgToTikZ() {
    if (!cachedDominoes || cachedDominoes.length === 0) {
      alert("Please generate a domino tiling first.");
      return;
    }

    const useGrayscale = document.getElementById("grayscale-checkbox").checked;

    // Convert domino objects to rectangle objects with the format needed for TikZ conversion
    const rectangles = cachedDominoes.map(domino => {
      return {
        x: domino.x / 100,
        y: domino.y / 100,
        width: domino.w / 100,
        height: domino.h / 100,
        fill: useGrayscale ? getGrayscaleColor(domino.color, domino) : domino.color,
        stroke: "black",
        strokeWidth: 0.45 // Scaled down
      };
    });

    // Find the bounds of the drawing
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // Process rectangles
    for (const rect of rectangles) {
      minX = Math.min(minX, rect.x);
      maxX = Math.max(maxX, rect.x + rect.width);
      minY = Math.min(minY, rect.y);
      maxY = Math.max(maxY, rect.y + rect.height);
    }

    // Calculate a good scale factor
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDimension = Math.max(width, height);
    const scaleFactor = 15.0 / maxDimension;

    // Get current parameters
    const n = parseInt(document.getElementById("n-input").value, 10);
    const a = parseFloat(document.getElementById("a-input").value);
    const b = parseFloat(document.getElementById("b-input").value);

    // Generate TikZ code
    let tikzCode = `\\documentclass{standalone}
\\usepackage{tikz}
\\usepackage{xcolor}

% Define colors to match SVG
\\definecolor{svggreen}{RGB}{0, 128, 0}
\\definecolor{svgred}{RGB}{255, 0, 0}
\\definecolor{svgyellow}{RGB}{255, 255, 0}
\\definecolor{svgblue}{RGB}{0, 0, 255}

\\begin{document}
% Aztec Diamond with 2x2 periodic weights
% n = ${n}, a = ${a}, b = ${b}, grayscale = ${useGrayscale}
% sample obtained by Glauber dynamics
\\begin{tikzpicture}[scale=${scaleFactor.toFixed(6)}]  % Calculated scale

% Dominoes (rectangles)
`;

    // Add rectangles to TikZ code
    rectangles.forEach(rect => {
      // Map SVG colors to TikZ colors
      let fillColor = rect.fill;
      if (!useGrayscale) {
        if (fillColor === '#00ff00') fillColor = 'svggreen';
        else if (fillColor === '#ff0000') fillColor = 'svgred';
        else if (fillColor === '#ffff00') fillColor = 'svgyellow';
        else if (fillColor === '#0000ff') fillColor = 'svgblue';
      }

      if (fillColor.startsWith('#')) {
        // For grayscale mode or other hex colors, extract the intensity and use it
        const intensity = parseInt(fillColor.substring(1, 3), 16);
        fillColor = `black!${Math.round((intensity/255)*100)}`;
      }

      // Shift coordinates to keep everything positive
      const x1 = rect.x - minX;
      const y1 = maxY - rect.y - rect.height;  // Invert y and adjust for height
      const x2 = rect.x - minX + rect.width;
      const y2 = maxY - rect.y;

      tikzCode += `\\filldraw[fill=${fillColor}, draw=black, line width=${rect.strokeWidth}pt] `;
      tikzCode += `(${x1.toFixed(2)}, ${y1.toFixed(2)}) rectangle (${x2.toFixed(2)}, ${y2.toFixed(2)});\n`;
    });

    tikzCode += `
\\end{tikzpicture}
\\end{document}`;

    // Update the TikZ code in the code container
    const tikzCodeContainer = document.getElementById('tikz-code-container');
    if (tikzCodeContainer) {
      tikzCodeContainer.textContent = tikzCode;
      tikzCodeContainer.style.display = 'block';
    } else {
      console.error("TikZ code container not found");
    }

    // Show the copy/download buttons
    const buttonsContainer = document.getElementById('tikz-buttons-container');
    if (buttonsContainer) {
      buttonsContainer.style.display = 'block';
    }
  }

  // Add event listeners for the TikZ buttons
  document.getElementById("tikz-btn").addEventListener("click", function() {
    svgToTikZ();
  });

  // Add event listener for the copy button
  document.getElementById("copy-tikz-btn").addEventListener("click", function() {
    const codeContainer = document.getElementById('tikz-code-container');
    const successMsg = document.getElementById('copy-success-msg');

    // Create a text area to copy from (more reliable cross-browser)
    const textArea = document.createElement('textarea');
    textArea.value = codeContainer.textContent;
    textArea.style.position = 'fixed';  // Prevent scrolling to bottom
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      successMsg.style.display = 'inline';
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 2000);
    } catch (err) {
      alert('Failed to copy to clipboard. Please try again or select and copy manually.');
    }

    document.body.removeChild(textArea);
  });

  // Add event listener for the download button
  document.getElementById("download-tikz-btn").addEventListener("click", function() {
    const codeContainer = document.getElementById('tikz-code-container');
    const n = parseInt(document.getElementById("n-input").value, 10);
    const a = parseFloat(document.getElementById("a-input").value);
    const b = parseFloat(document.getElementById("b-input").value);
    const algo = "glauber";

    const blob = new Blob([codeContainer.textContent], { type: 'text/plain' });
    const fileNameBase = `aztec_periodic_${algo}_n${n}_a${a}_b${b}`;
    const downloadLink = document.createElement('a');
    downloadLink.download = `${fileNameBase.replace(/\./g, "_")}_tikz.tex`;
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  });

  const initialN = parseInt(document.getElementById("n-input").value, 10);
  updateVisualization(initialN);
};
</script>
