---
title: "The Gamma-disordered Aztec Diamond"
permalink: /double-dimer-gamma/
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-11-18-double-dimer-gamma.md'
    txt: 'Interactive simulation source code'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-11-18-double-dimer-gamma.cpp'
    txt: 'C++ backend code'
---

<style>
  #aztec-svg { width: 100%; height: 80vh; vertical-align: top; }
  @media (max-width: 576px) { #aztec-svg { height: 60vh; } }
  #zoom-in-btn, #zoom-out-btn { font-weight: bold; width: 30px; height: 30px; }
  #zoom-reset-btn { height: 30px; }
</style>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="/js/2025-11-18-double-dimer-gamma.js"></script>

This simulation visualizes **Definition 1.1** from *The Gamma-disordered Aztec diamond* (Duits and Van Peski).
We generate random weights $\{a_{i,j}, b_{i,j}\}$ on the Aztec diamond graph such that:

$a_{i,j} \sim \Gamma(\alpha, 1) \quad \text{and} \quad b_{i,j} \sim \Gamma(\beta, 1).$

These weights create a biased random environment.
- When $\alpha \approx \beta$, the environment is roughly homogeneous.
- When $\alpha \gg \beta$ or $\beta \gg \alpha$, we observe specific "frozen" behaviors and turning point fluctuations described in the paper.

---

<div style="margin-bottom: 10px;">
  <label for="n-input">Size ($n\le 400$): </label>
  <input id="n-input" type="number" value="120" min="2" step="2" max="400" size="3">
  <button id="update-btn">Update</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
</div>

<div style="margin-bottom: 10px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
  <strong>Gamma Parameters:</strong>
  <div style="margin-top: 5px;">
      <label for="alpha-input">Alpha ($\alpha$): </label>
      <input id="alpha-input" type="number" value="0.2" min="0.01" max="50" step="0.01" style="width: 70px;">

      <label for="beta-input" style="margin-left: 20px;">Beta ($\beta$): </label>
      <input id="beta-input" type="number" value="0.25" min="0.01" max="50" step="0.01" style="width: 70px;">
  </div>
</div>

<div style="margin-bottom: 10px;">
  <label><input type="checkbox" id="show-double-edges"> Show double edges (purple)</label>
  <label style="margin-left: 20px;"><input type="checkbox" id="show-weight-matrix"> Show weight sample (8×8)</label>
</div>

<div id="weight-matrix-display" style="display: none; margin-bottom: 10px; font-family: monospace; font-size: 12px;">
  <div id="weight-matrix-content" style="padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; overflow-x: auto;"></div>
</div>

<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<div id="domino-view">
  <svg id="aztec-svg"></svg>
</div>

<script>
Module.onRuntimeInitialized = async function() {
  const simulateBiasedGamma = Module.cwrap('simulateBiasedGamma', 'number', ['number', 'number', 'number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  // DOM Elements
  const svg = d3.select("#aztec-svg");
  const progressElem = document.getElementById("progress-indicator");
  const nInput = document.getElementById("n-input");
  const alphaInput = document.getElementById("alpha-input");
  const betaInput = document.getElementById("beta-input");
  const updateBtn = document.getElementById("update-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const showDoubleEdgesCheckbox = document.getElementById("show-double-edges");

  // State
  let simulationActive = false;
  let simulationAbortController = null;
  let progressInterval;
  let currentConfigs = null;
  let currentDominoes = [];
  let showDoubleEdges = false;
  let initialTransform = {};

  // Weight Matrix Display Logic
  function displayWeightMatrix(matrix) {
    if (!matrix || matrix.length === 0) return;
    let html = '<table style="border-collapse: collapse;"><tr><td></td>';
    for (let j = 0; j < matrix[0].length; j++) html += `<td style="padding:4px;border:1px solid #ccc;text-align:center;font-weight:bold;">j=${j}</td>`;
    html += '</tr>';

    for (let i = 0; i < matrix.length; i++) {
      html += `<tr><td style="padding:4px;border:1px solid #ccc;font-weight:bold;">i=${i}</td>`;
      // Identify row type for visualization: Even = Alpha, Odd = Beta
      const rowType = (i % 2 === 0) ? "α" : "β";
      const bgBase = (i % 2 === 0) ? [230, 240, 255] : [255, 240, 230];

      for (let j = 0; j < matrix[i].length; j++) {
        const val = matrix[i][j];
        // Simple opacity scaling for visual intensity
        const opacity = Math.min(1, val / 5.0);
        const r = Math.round(255 + (bgBase[0]-255)*opacity);
        const g = Math.round(255 + (bgBase[1]-255)*opacity);
        const b = Math.round(255 + (bgBase[2]-255)*opacity);

        html += `<td style="padding:4px;border:1px solid #ccc;text-align:right;background-color:rgb(${r},${g},${b})">${val.toFixed(2)}</td>`;
      }
      html += `<td>(${rowType})</td></tr>`;
    }
    html += '</table><div style="font-size:11px;margin-top:5px;">Blueish rows: weights ~ Γ(α). Reddish rows: weights ~ Γ(β).</div>';
    document.getElementById("weight-matrix-content").innerHTML = html;
  }

  document.getElementById("show-weight-matrix").addEventListener("change", function() {
    document.getElementById("weight-matrix-display").style.display = this.checked ? 'block' : 'none';
  });

  // Zoom Logic
  const zoom = d3.zoom().scaleExtent([0.1, 50]).on("zoom", (event) => {
    if (!initialTransform.scale) return;
    const t = event.transform;
    svg.select("g.dominoes").attr("transform",
      `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k})`);
  });
  svg.call(zoom);

  // Zoom Controls
  const controlsDiv = d3.select("#domino-view").insert("div", "#aztec-svg").style("margin-bottom","5px");
  controlsDiv.append("span").text("Zoom: ").style("font-weight","bold");
  controlsDiv.append("button").text("+").on("click", () => svg.transition().call(zoom.scaleBy, 1.3));
  controlsDiv.append("button").text("-").style("margin-left","5px").on("click", () => svg.transition().call(zoom.scaleBy, 0.7));
  controlsDiv.append("button").text("Reset").style("margin-left","5px").on("click", () => svg.transition().call(zoom.transform, d3.zoomIdentity));

  // Rendering
  function render(configs) {
    const allDominoes = [...configs.config1, ...configs.config2];
    if(allDominoes.length === 0) return;

    const minX = d3.min(allDominoes, d => d.x), maxX = d3.max(allDominoes, d => d.x + d.w);
    const minY = d3.min(allDominoes, d => d.y), maxY = d3.max(allDominoes, d => d.y + d.h);
    const width = maxX - minX, height = maxY - minY;

    const bbox = svg.node().getBoundingClientRect();
    const scale = Math.min(bbox.width / width, bbox.height / height) * 0.9;
    const tx = (bbox.width - width * scale) / 2 - minX * scale;
    const ty = (bbox.height - height * scale) / 2 - minY * scale;

    initialTransform = { translateX: tx, translateY: ty, scale: scale };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g").attr("class", "dominoes")
       .attr("transform", `translate(${tx},${ty}) scale(${scale})`);

    // Edge Map for Double Dimer logic
    const edgeMap = new Map();
    const key = d => {
       const cx = d.x + d.w/2, cy = d.y + d.h/2;
       const horiz = d.w > d.h;
       let x1, y1, x2, y2;
       if(horiz) { x1=cx-d.w/4; x2=cx+d.w/4; y1=y2=cy; }
       else { x1=x2=cx; y1=cy-d.h/4; y2=cy+d.h/4; }
       // quantize
       const q = v => Math.round(v*1000);
       return `${Math.min(q(x1),q(x2))},${Math.min(q(y1),q(y2))}-${Math.max(q(x1),q(x2))},${Math.max(q(y1),q(y2))}`;
    };

    const addEdges = (list, type) => list.forEach(d => {
        const k = key(d);
        if(!edgeMap.has(k)) edgeMap.set(k, {d, types: new Set()});
        edgeMap.get(k).types.add(type);
    });

    addEdges(configs.config1, 1);
    addEdges(configs.config2, 2);

    edgeMap.forEach((val) => {
        const isDouble = val.types.has(1) && val.types.has(2);
        if(isDouble && !showDoubleEdges) return;

        let color = "red", opacity = 0.8;
        if(isDouble) { color = "purple"; opacity = 1.0; }
        else if(val.types.has(1)) { color = "black"; opacity = 1.0; }

        const d = val.d;
        const cx = d.x + d.w/2, cy = d.y + d.h/2;
        const horiz = d.w > d.h;
        let x1, y1, x2, y2;
        if(horiz) { x1=cx-d.w/4; x2=cx+d.w/4; y1=y2=cy; }
        else { x1=x2=cx; y1=cy-d.h/4; y2=cy+d.h/4; }

        group.append("line").attr("x1",x1).attr("y1",y1).attr("x2",x2).attr("y2",y2)
             .attr("stroke", color).attr("stroke-width", 3.5).attr("opacity", opacity);
        group.append("circle").attr("cx",x1).attr("cy",y1).attr("r",3.5).attr("fill",color).attr("opacity",opacity);
        group.append("circle").attr("cx",x2).attr("cy",y2).attr("r",3.5).attr("fill",color).attr("opacity",opacity);
    });
  }

  async function runSimulation() {
    const n = parseInt(nInput.value);
    const alpha = parseFloat(alphaInput.value);
    const beta = parseFloat(betaInput.value);

    if (n % 2 !== 0 || n > 400) { alert("N must be even and <= 400"); return; }

    simulationActive = true;
    simulationAbortController = new AbortController();
    updateBtn.disabled = true;
    cancelBtn.style.display = 'inline-block';
    progressElem.innerText = "Sampling...";

    // Polling
    progressInterval = setInterval(() => {
       const p = getProgress();
       progressElem.innerText = `Sampling... (${p}%)`;
    }, 100);

    await new Promise(r => setTimeout(r, 10)); // UI Breath

    try {
       const ptr = await simulateBiasedGamma(n, alpha, beta);

       if (simulationAbortController.signal.aborted) {
          if(ptr) freeString(ptr);
          throw new Error("Aborted");
       }

       const json = Module.UTF8ToString(ptr);
       freeString(ptr);

       const data = JSON.parse(json);
       if(data.error) throw new Error(data.error);

       currentConfigs = data;
       if(data.weightMatrix) displayWeightMatrix(data.weightMatrix);
       render(data);
       progressElem.innerText = "";

    } catch (e) {
       if(e.message !== "Aborted") alert(e.message);
       progressElem.innerText = "Stopped.";
    } finally {
       clearInterval(progressInterval);
       simulationActive = false;
       updateBtn.disabled = false;
       cancelBtn.style.display = 'none';
    }
  }

  updateBtn.addEventListener("click", runSimulation);
  cancelBtn.addEventListener("click", () => {
     if(simulationAbortController) simulationAbortController.abort();
  });

  showDoubleEdgesCheckbox.addEventListener("change", function() {
      showDoubleEdges = this.checked;
      if(currentConfigs) render(currentConfigs);
  });

  // Initial Run
  runSimulation();
};
</script>
