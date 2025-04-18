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
  /* Layout for the visualization panes */
  .visualization-container {
    width: 100%;
    position: relative;
  }

  .viz-pane {
    width: 100%;
    margin-bottom: 15px;
  }

  /* Canvas styling */
  #aztec-canvas, #aztec-2d-canvas {
    width: 100%;
    height: 70vh; /* Use 70% of viewport height */
    vertical-align: top;
  }

  #aztec-2d-canvas {
    background-color: #f8f8f8;
    border: 1px solid #ddd;
    display: flex;
    justify-content: center;
    align-items: center;
    display: none; /* Hidden by default */
  }

  /* View toggle button styling */
  .view-toggle {
    margin-bottom: 10px;
  }

  .view-toggle button {
    padding: 6px 12px;
    margin-right: 5px;
    border: 1px solid #ccc;
    background-color: #f0f0f0;
    border-radius: 3px;
    cursor: pointer;
  }

  .view-toggle button.active {
    background-color: #e0e0e0;
    font-weight: bold;
    border-color: #999;
  }

  @media (max-width: 768px) {
    #aztec-canvas, #aztec-2d-canvas {
      height: 60vh;
    }
  }

  /* Styling for buttons and controls */
  #sample-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background-color: #cccccc;
  }

  button {
    cursor: pointer;
  }

  .pane-title {
    font-weight: bold;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #eee;
  }

  #move-left-btn, #move-up-btn, #move-down-btn, #move-right-btn, #reset-view-btn {
    transition: background-color 0.2s;
  }

  #move-left-btn:hover, #move-up-btn:hover, #move-down-btn:hover, #move-right-btn:hover, #reset-view-btn:hover {
    background-color: #e0e0e0;
  }

  .parameters-section {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 15px;
  }
</style>

<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="{{site.url}}/s/domino.js"></script>


This simulation displays random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a> using its three-dimensional height function. The visualization is inspired by Alexei and Matvey Borodin's <a href="https://math.mit.edu/~borodin/aztec.html">visualizations</a>. Caution: large values of $n$ may take a while to sample. If $n\le 100$, it should be reasonably fast.

<!-- Parameters section above the panes -->
<div class="parameters-section">
  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 10px;">
    <div>
      <label for="n-input">Aztec Diamond Order: </label>
      <input id="n-input" type="number" value="12" min="2" step="2" max="300" size="3">
    </div>

    <div style="margin-left: auto;">
      <button id="sample-btn">Sample</button>
      <button id="cancel-btn" style="display: none; margin-left: 5px; background-color: #ff5555;">Cancel</button>
    </div>

    <div>
      <span id="progress-indicator" style="font-weight: bold;"></span>
    </div>
  </div>

  <!-- Periodicity control with radio buttons -->
  <div style="margin-bottom: 15px;">
    <h4 style="margin-top: 0; margin-bottom: 8px;">Periodicity:</h4>
    <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 10px;">
      <div style="padding: 5px; border-radius: 4px; cursor: pointer;">
        <input type="radio" id="uniform-radio" name="periodicity" value="uniform" checked style="cursor: pointer;">
        <label for="uniform-radio" style="cursor: pointer; user-select: none;">Uniform (no parameters)</label>
      </div>
      <div style="padding: 5px; border-radius: 4px; cursor: pointer;">
        <input type="radio" id="2x2-radio" name="periodicity" value="2x2" style="cursor: pointer;">
        <label for="2x2-radio" style="cursor: pointer; user-select: none;">2×2 Periodic</label>
      </div>
      <div style="padding: 5px; border-radius: 4px; cursor: pointer;">
        <input type="radio" id="3x3-radio" name="periodicity" value="3x3" style="cursor: pointer;">
        <label for="3x3-radio" style="cursor: pointer; user-select: none;">3×3 Periodic</label>
      </div>
    </div>
  </div>

  <!-- 2×2 Periodic Weights (initially hidden) -->
  <div id="weights-2x2" style="display: none; margin-bottom: 15px;">
    <h4 style="margin-top: 0; margin-bottom: 5px;">2×2 Periodic Weights</h4>
    <div style="display: flex; gap: 15px;">
      <div>
        <label for="a-input">a:</label>
        <input id="a-input" type="number" value="0.5" step="0.1" min="0.1" max="10" style="width: 60px;">
      </div>
      <div>
        <label for="b-input">b:</label>
        <input id="b-input" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 60px;">
      </div>
    </div>
  </div>

  <!-- 3×3 Periodic Weights (initially hidden) -->
  <div id="weights-3x3" style="display: none;">
    <h4 style="margin-top: 0; margin-bottom: 5px;">3×3 Periodic Weights</h4>
    <div style="display: grid; grid-template-columns: repeat(3, 60px); gap: 5px;">
      <input id="w1" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
      <input id="w2" type="number" value="4.0" step="0.1" min="0.1" max="10" style="width: 50px;">
      <input id="w3" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
      <input id="w4" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
      <input id="w5" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
      <input id="w6" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
      <input id="w7" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
      <input id="w8" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
      <input id="w9" type="number" value="9.0" step="0.1" min="0.1" max="10" style="width: 50px;">
    </div>
  </div>
</div>

<!-- Visualization container with switchable views -->
<div class="visualization-container">
  <!-- View toggle buttons -->
  <div class="view-toggle">
    <button id="view-3d-btn" class="active">3D</button>
    <button id="view-2d-btn">2D</button>
  </div>

  <!-- Camera controls for 3D pane -->
  <div id="camera-controls" style="margin-bottom: 10px;">
      <div class="d-flex flex-wrap align-items-center mb-2">
      <label>Camera movement:&nbsp;&nbsp;</label>
      <button id="move-left-btn" style="padding: 2px 8px; margin: 0 5px; font-size: 14px; vertical-align: middle;">←</button>
      <button id="move-up-btn" style="padding: 2px 8px; margin: 0 5px; font-size: 14px; vertical-align: middle;">↑</button>
      <button id="move-down-btn" style="padding: 2px 8px; margin: 0 5px; font-size: 14px; vertical-align: middle;">↓</button>
      <button id="move-right-btn" style="padding: 2px 8px; margin: 0 5px; font-size: 14px; vertical-align: middle;">→</button>
      <button id="reset-view-btn" style="padding: 2px 8px; margin: 0 5px; font-size: 14px; vertical-align: middle;">Reset View</button>
      <label for="demo-mode" style="padding: 2px 8px; margin: 0 25px; vertical-align: middle;">
        <input id="demo-mode" type="checkbox"> Demo mode (automatic rotation)
      </label>
    </div>
  </div>

  <!-- 3D Visualization Pane (default) -->
  <div id="aztec-canvas"></div>

  <!-- 2D Visualization Pane (hidden by default) -->
  <div id="aztec-2d-canvas" style="position: relative; overflow: hidden; height: 70vh;">
    <!-- 2D controls (fixed at top like 3D controls) -->
    <div id="controls-2d" style="margin-bottom: 10px;">
      <!-- Zoom controls -->
      <div style="margin-bottom: 10px;">
        <span style="font-weight: bold;">Zoom: </span>
        <button id="zoom-in-btn-2d" style="font-weight: bold; width: 30px; height: 30px; margin-left: 5px;">+</button>
        <button id="zoom-out-btn-2d" style="font-weight: bold; width: 30px; height: 30px; margin-left: 5px;">-</button>
        <button id="zoom-reset-btn-2d" style="height: 30px; margin-left: 5px;">Reset Zoom</button>
        <span style="margin-left: 10px; font-style: italic; font-size: 0.9em;">(You can also use mouse wheel to zoom and drag to pan)</span>
      </div>

      <!-- Display options -->
      <div style="margin-bottom: 10px;">
        <input type="checkbox" id="grayscale-checkbox-2d" style="vertical-align: middle;">
        <label for="grayscale-checkbox-2d" style="vertical-align: middle;">Grayscale mode</label>
      </div>
    </div>

    <!-- SVG container with adjusted height to account for controls -->
    <svg id="aztec-svg-2d" style="width: 100%; height: calc(100% - 80px); border: 1px solid #ccc;"></svg>
  </div>
</div>

<script>
Module.onRuntimeInitialized = async function() {
  const simulateAztec = Module.cwrap('simulateAztec','number',['number','number','number','number','number','number','number','number','number','number'],{async:true});
  const freeString    = Module.cwrap('freeString',null,['number']);
  const getProgress   = Module.cwrap('getProgress','number',[]);

  // Three.js setup
  let scene, camera, renderer, controls, dominoGroup;
  let animationActive = true;

  // Simulation state
  let simulationActive = false;
  let abortController = null;
  const progressElem = document.getElementById("progress-indicator");
  const updateBtn = document.getElementById("update-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  let progressInterval;
  let cachedDominoes = null; // Store dominoes for 2D view

  // Demo mode state
  let isDemoMode = false;
  let rotationSpeed = 0.005; // Speed of rotation in radians

  function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const container = document.getElementById('aztec-canvas');
    const w = container.clientWidth, h = container.clientHeight;
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(w,h);
    renderer.setPixelRatio(window.devicePixelRatio);
    // Enable OES_element_index_uint extension for WebGL 1 to support 32-bit indices
    renderer.getContext().getExtension('OES_element_index_uint');
    container.innerHTML = ''; container.appendChild(renderer.domElement);

    const frustum = 100, aspect = w/h;
    camera = new THREE.OrthographicCamera(
      -frustum*aspect/2, frustum*aspect/2,
       frustum/2, -frustum/2,
      1,1000
    );
    camera.position.set(0, 130, 0);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff,0.5));
    const dir1 = new THREE.DirectionalLight(0xffffff,0.8);
    dir1.position.set(0.5,1,0.5).normalize();
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff,0.6);
    dir2.position.set(-0.5,1,-0.5).normalize();
    scene.add(dir2);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    window.addEventListener('resize', onWindowResize);

    dominoGroup = new THREE.Group();
    scene.add(dominoGroup);

    animate();
  }

  function onWindowResize(){
    const container = document.getElementById('aztec-canvas');
    const w = container.clientWidth, h = container.clientHeight;
    const frustum = 100, aspect = w/h;
    camera.left = -frustum*aspect/2; camera.right = frustum*aspect/2;
    camera.top = frustum/2; camera.bottom = -frustum/2;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
  }

  function animate(){
    if (!animationActive) return;

    requestAnimationFrame(animate);
    controls.update();

    // Apply rotation in demo mode
    if (isDemoMode && dominoGroup) {
      dominoGroup.rotation.y += rotationSpeed;
    }

    renderer.render(scene, camera);
  }

  // Helper function to sleep for ms milliseconds
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function startSimulation() {
    simulationActive = true;

    // Disable sample button and n-input
    document.getElementById("sample-btn")?.setAttribute("disabled", "disabled");
    document.getElementById("n-input")?.setAttribute("disabled", "disabled");

    // Disable all the periodicity controls
    document.querySelectorAll('input[name="periodicity"]').forEach(radio => {
      radio.disabled = true;
    });

    // Disable all weight inputs regardless of current periodicity
    document.getElementById("a-input")?.setAttribute("disabled", "disabled");
    document.getElementById("b-input")?.setAttribute("disabled", "disabled");

    for (let i = 1; i <= 9; i++) {
      document.getElementById(`w${i}`)?.setAttribute("disabled", "disabled");
    }

    // Show cancel button
    if (cancelBtn) {
      cancelBtn.style.display = 'inline-block';
      cancelBtn.removeAttribute("disabled");
    }

    abortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    clearInterval(progressInterval);

    // Force re-enable all controls
    document.getElementById("sample-btn")?.removeAttribute("disabled");
    document.getElementById("n-input")?.removeAttribute("disabled");

    // Re-enable all radio buttons
    document.querySelectorAll('input[name="periodicity"]').forEach(radio => {
      radio.disabled = false;
    });

    // Re-enable ALL possible input fields regardless of current periodicity
    document.getElementById("a-input")?.removeAttribute("disabled");
    document.getElementById("b-input")?.removeAttribute("disabled");

    for (let i = 1; i <= 9; i++) {
      document.getElementById(`w${i}`)?.removeAttribute("disabled");
    }

    // Make sure parameter display is correct
    try {
      updatePeriodicityParams();
    } catch (e) {
      console.error("Error updating params:", e);
    }

    if (cancelBtn) cancelBtn.style.display = 'none';
    if (progressElem) progressElem.innerText = "Simulation cancelled";

    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  initThreeJS();

  // Calculate height function based on domino configuration
  // This implementation follows the algorithm from 2025-02-02-aztec-uniform.md
  function calculateHeightFunction(dominoes) {
    if (!dominoes || dominoes.length === 0) return new Map();

    // 1. Determine lattice unit (scaling factor)
    const minSidePx = Math.min(...dominoes.map(d => Math.min(d.w, d.h)));
    const unit = minSidePx / 2; // 2 lattice units → 1 short side
    if (unit <= 0) return new Map();

    // 2. Convert each domino to (orient, sign, gx, gy)
    const dominoData = dominoes.map(d => {
      const horiz = d.w > d.h;
      const orient = horiz ? 0 : 1;
      const sign = horiz
        ? (d.color === "green" ? -1 : 1)   // horizontal: green = −1, blue = +1
        : (d.color === "yellow" ? -1 : 1);  // vertical: yellow = −1, red = +1
      const gx = Math.round(d.x / unit);   // lattice coordinates
      const gy = Math.round(d.y / unit);
      return [orient, sign, gx, gy];
    });

    // 3. Build graph with height increments
    const adj = new Map();

    function addEdge(v1, v2, dh) {
      const v1Key = `${v1[0]},${v1[1]}`;
      const v2Key = `${v2[0]},${v2[1]}`;

      if (!adj.has(v1Key)) adj.set(v1Key, []);
      if (!adj.has(v2Key)) adj.set(v2Key, []);

      adj.get(v1Key).push([v2Key, dh]);
      adj.get(v2Key).push([v1Key, -dh]);
    }

    dominoData.forEach(([o, s, x, y]) => {
      if (o === 0) { // horizontal (4×2)
        const TL = [x, y+2], TM = [x+2, y+2], TR = [x+4, y+2];
        const BL = [x, y], BM = [x+2, y], BR = [x+4, y];

        addEdge(TL, TM, -s); addEdge(TM, TR, s);
        addEdge(BL, BM, s); addEdge(BM, BR, -s);
        addEdge(TL, BL, s); addEdge(TM, BM, 3*s);
        addEdge(TR, BR, s);
      } else { // vertical (2×4)
        const TL = [x, y+4], TR = [x+2, y+4];
        const ML = [x, y+2], MR = [x+2, y+2];
        const BL = [x, y], BR = [x+2, y];

        addEdge(TL, TR, -s); addEdge(ML, MR, -3*s); addEdge(BL, BR, -s);
        addEdge(TL, ML, s); addEdge(ML, BL, -s);
        addEdge(TR, MR, -s); addEdge(MR, BR, s);
      }
    });

    // 4. Breadth-first integration of heights
    const verts = Array.from(adj.keys()).map(k => {
      const [gx, gy] = k.split(',').map(Number);
      return {k, gx, gy};
    });

    // Find the "bottom-left" vertex as the root
    const root = verts.reduce((a, b) =>
      (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b
    ).k;

    const heights = new Map([[root, 0]]);
    const queue = [root];

    while (queue.length > 0) {
      const v = queue.shift();
      for (const [w, dh] of adj.get(v)) {
        if (!heights.has(w)) {
          heights.set(w, heights.get(v) + dh);
          queue.push(w);
        }
      }
    }

    // Create a map of vertex coordinates to height values
    const finalHeights = new Map();
    heights.forEach((h, key) => {
      const [x, y] = key.split(',').map(Number);
      // Important: negate the height as per the requirements
      finalHeights.set(`${x},${y}`, -h);
    });

    return finalHeights;
  }

  // Create a 3D face for a domino with its height function
  function createDominoFaces(domino, heightMap, scale) {
    const oddI = domino.color === "blue" || domino.color === "yellow";
    const oddJ = domino.color === "blue" || domino.color === "red";

    const isHorizontal = domino.w > domino.h;
    const color = domino.color;

    // Determine coordinates for each vertex
    let pts;
    if (isHorizontal) {
      // horizontal domino (blue or green)
      const w = 4, h = 2;
      const x = domino.x;
      const y = domino.y;

      pts = [
        [x, y+h],    // top-left
        [x+w, y+h],  // top-right
        [x+w, y],    // bottom-right
        [x, y],      // bottom-left
        [x+w/2, y+h],// top-mid
        [x+w/2, y]   // bottom-mid
      ];
    } else {
      // vertical domino (yellow or red)
      const w = 2, h = 4;
      const x = domino.x;
      const y = domino.y;

      pts = [
        [x, y],      // bottom-left
        [x, y+h],    // top-left
        [x+w, y+h],  // top-right
        [x+w, y],    // bottom-right
        [x, y+h/2],  // left-mid
        [x+w, y+h/2] // right-mid
      ];
    }

    // Map points to 3D coordinates with heights
    const vertices = [];
    const unit = isHorizontal ? domino.w / 4 : domino.h / 4;

    for (const [x, y] of pts) {
      const gridX = Math.round(x / unit);
      const gridY = Math.round(y / unit);
      const key = `${gridX},${gridY}`;

      // Get height for this vertex (default to 0 if not found)
      let z = 0;
      if (heightMap.has(key)) {
        z = heightMap.get(key);
      }

      // Apply scale and shifts
      const adjustedXShift = -0.5 + (isHorizontal ? 0 : 0);
      const adjustedYShift = 1.5 + (isHorizontal ? 0 : 0);

      vertices.push([
        x / 2.0 + adjustedXShift,
        z,  // z is the height
        y / 2.0 + adjustedYShift
      ]);
    }

    return {
      color: color,
      vertices: vertices
    };
  }

  async function updateVisualization(n) {
    /* ------------------------------------------------------------------ */
     /* 1. wipe previous geometry *and* transforms                          */
     /* ------------------------------------------------------------------ */
     dominoGroup.clear();                      // three ≥ r152 preferred to loop/remove
     dominoGroup.position.set(0, 0, 0);
     dominoGroup.rotation.set(0, 0, 0);
     dominoGroup.scale.set(1, 1, 1);           // <‑‑ the crucial line
     /* ------------------------------------------------------------------ */


    // Check if we're in 3D view with n > 300
    const is3DView = document.getElementById("view-3d-btn").classList.contains("active");
    const skip3DRendering = is3DView && n > 300;

    // Get the current periodicity setting
    const periodicity = document.querySelector('input[name="periodicity"]:checked').value;

    let w1=1.0, w2=1.0, w3=1.0, w4=1.0, w5=1.0, w6=1.0, w7=1.0, w8=1.0, w9=1.0;
    let a=1.0, b=1.0;

    if (periodicity === '2x2') {
      // Safe get values with defaults
      const aInput = document.getElementById("a-input");
      const bInput = document.getElementById("b-input");
      a = aInput && !isNaN(parseFloat(aInput.value)) ? parseFloat(aInput.value) : 0.5;
      b = bInput && !isNaN(parseFloat(bInput.value)) ? parseFloat(bInput.value) : 1.0;

      console.log(`Using 2×2 weights with a=${a}, b=${b}`);

      // For 2x2, we'll set the 3x3 weights specially
      w1 = 1.0; w2 = a; w3 = 1.0;
      w4 = b; w5 = 1.0; w6 = b;
      w7 = 1.0; w8 = a; w9 = 1.0;
    } else if (periodicity === '3x3') {
      // Get values from the 3x3 weight inputs
      for (let i = 1; i <= 9; i++) {
        const input = document.getElementById(`w${i}`);
        const val = input && !isNaN(parseFloat(input.value)) ? parseFloat(input.value) : 1.0;
        if (i === 1) w1 = val;
        else if (i === 2) w2 = val;
        else if (i === 3) w3 = val;
        else if (i === 4) w4 = val;
        else if (i === 5) w5 = val;
        else if (i === 6) w6 = val;
        else if (i === 7) w7 = val;
        else if (i === 8) w8 = val;
        else if (i === 9) w9 = val;
      }

      console.log(`Using 3×3 weights: [${w1}, ${w2}, ${w3}], [${w4}, ${w5}, ${w6}], [${w7}, ${w8}, ${w9}]`);
    } else {
      // Uniform weights - all weights are 1.0
      w1 = 1.0; w2 = 1.0; w3 = 1.0;
      w4 = 1.0; w5 = 1.0; w6 = 1.0;
      w7 = 1.0; w8 = 1.0; w9 = 1.0;

      console.log('Using uniform weights (all 1.0)');
    }
    // Clear previous models
    while(dominoGroup.children.length){
      const m = dominoGroup.children[0];
      dominoGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }

    // Remember demo mode state
    const wasInDemoMode = isDemoMode;

    startSimulation();
    const signal = abortController.signal;

    // Start progress polling
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      if (!simulationActive) {
        clearInterval(progressInterval);
        return;
      }
      const p = getProgress();
      progressElem.innerText = `Sampling... (${p}%)`;
      if(p >= 100) clearInterval(progressInterval);
    }, 100);

    try {
      // Allow UI to update before starting heavy computation
      await sleep(50);
      if (signal.aborted) return;

      // Get domino configuration from C++ code
      const ptrPromise = simulateAztec(n, w1, w2, w3, w4, w5, w6, w7, w8, w9);

      // Wait for simulation to complete
      const ptr = await ptrPromise;
      if (signal.aborted) {
        if (ptr) freeString(ptr);
        return;
      }

      let raw = Module.UTF8ToString(ptr);
      freeString(ptr);
      if (signal.aborted) return;

      // Parse the results
      const dominoes = JSON.parse(raw);
      if (dominoes.error) throw new Error(dominoes.error);
      if (signal.aborted) return;

      // Cache the dominoes for 2D view
      cachedDominoes = dominoes;

      // ABSOLUTE HARD CHECK: Skip both height function calculation and 3D rendering if n > 300
      // This check should never fail regardless of view mode
      if (n > 300) {
        progressElem.innerText = "Sampling complete. n > 300 is too large for 3D visualization.";
        stopSimulation();
        return;
      }

      // If we're in 2D view, render in 2D and skip 3D visualization
      if (!is3DView) {
        // Call 2D renderer
        await render2D(dominoes);
        progressElem.innerText = "";
        stopSimulation();
        return;
      }

      progressElem.innerText = "Calculating height function...";
      await sleep(10);
      if (signal.aborted) return;

      // Calculate the height function (in chunks if large)
      const heightMap = calculateHeightFunction(dominoes);
      if (signal.aborted) return;

      // Scale factor based on n
      const scale = 60/(2*n);

      // Colors for the materials
      const colors = {
        blue:   0x4363d8,
        green:  0x1e8c28,
        red:    0xff2244,
        yellow: 0xfca414
      };

      // Create the 3D faces with proper heights
      progressElem.innerText = "Processing domino data...";
      await sleep(10);
      if (signal.aborted) return;

      // Process faces in chunks to keep UI responsive
      const facesPromise = (async () => {
        const faces = [];
        const CHUNK_SIZE = 200;

        for (let i = 0; i < dominoes.length; i += CHUNK_SIZE) {
          if (signal.aborted) return null;

          // Process a chunk of dominoes
          const chunk = dominoes.slice(i, i + CHUNK_SIZE);
          const chunkFaces = chunk.map(domino =>
            createDominoFaces(domino, heightMap, scale));
          faces.push(...chunkFaces);

          // Update progress and yield to UI
          progressElem.innerText =
            `Processing... (${Math.floor(100*(i+chunk.length)/dominoes.length)}%)`;
          await sleep(0);
        }

        return faces;
      })();

      const faces = await facesPromise;
      if (!faces || signal.aborted) return;

      const total = faces.length;
      if (total === 0 || signal.aborted) return;

      // Batch processing of faces for better performance
      progressElem.innerText = "Rendering...";
      let idx = 0;

      function processBatch(start) {
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            if (signal.aborted) {
              resolve(false);
              return;
            }

            const BATCH_SIZE = 200;
            const end = Math.min(start + BATCH_SIZE, total);

            for (let i = start; i < end; i++) {
              if (signal.aborted) {
                resolve(false);
                return;
              }

              const f = faces[i];
              if (!f || !f.color || !Array.isArray(f.vertices)) continue;

              try {
                const geom = new THREE.BufferGeometry();
                // Vertices positions
                const pos = [];
                for (const v of f.vertices) {
                  pos.push(v[0]*scale, v[1]*scale, v[2]*scale);
                }

                geom.setAttribute(
                  'position',
                  new THREE.Float32BufferAttribute(pos, 3)
                );

                // Triangulation indices
                const isH = (f.color === 'blue' || f.color === 'green');
                const indices = isH
                  ? [0,1,3, 3,2,1, 0,1,4, 3,2,5]
                  : [0,1,3, 3,2,1, 0,1,4, 3,2,5];

                // Use 32-bit indices if needed for larger models
                if (total > 65535 / 6) { // 6 vertices per domino
                  geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
                } else {
                  geom.setIndex(indices);
                }

                geom.computeVertexNormals();

                const mat = new THREE.MeshStandardMaterial({
                  color: colors[f.color] || 0x808080,
                  side: THREE.DoubleSide,
                  flatShading: true
                });

                dominoGroup.add(new THREE.Mesh(geom, mat));
              } catch(e) {
                console.warn("face error", i, e);
              }
            }

            idx = end;
            progressElem.innerText = `Rendering... (${Math.floor(100*(idx/total))}%)`;
            resolve(idx < total);
          });
        });
      }

      // Process batches sequentially with yield points for UI
      let hasMore = true;
      while (hasMore && simulationActive && !signal.aborted) {
        hasMore = await processBatch(idx);
      }

      if (signal.aborted) return;

      // Only finish if we completed all batches
      if (idx >= total) {
        progressElem.innerText = "";

        // === recentre the tiling ===
        const box = new THREE.Box3().setFromObject(dominoGroup);
        const center = box.getCenter(new THREE.Vector3());
        // Shift the center a little for better visualization
        center.x += -0.7;  // Shift right a bit
        center.z +=  4;  // Shift forward a bit
        dominoGroup.position.sub(center);

        const sizeXYZ   = box.getSize(new THREE.Vector3());       // model extents
        const margin    = 0.05;                                   // 5 % breathing room

        // For an orthographic camera its “view size” is the difference of the planes:
        const viewW = camera.right  - camera.left;
        const viewH = camera.top    - camera.bottom;

        /* choose the limiting dimension (the one that would clip first) */
        const maxScale = (1 - margin) * Math.min(
          viewW / sizeXYZ.x,
          viewH / sizeXYZ.z          // z‑extent projects to vertical axis in your set‑up
        );

        dominoGroup.scale.setScalar(maxScale);
        controls.target.set(0, 0, 0);   // orbit around the true centre
        controls.update();

        // If we were in demo mode before update, restore demo view
        if (wasInDemoMode) {
          setDemoViewCamera();
        }
      }

      // Cleanup - reuse the stopSimulation function since it handles everything properly
      stopSimulation();
      if (progressElem) progressElem.innerText = "";
      console.log("Visualization complete");
    } catch(err) {
      console.error("Visualization error:", err);
      if (progressElem) progressElem.innerText = `Error: ${err.message}`;
      // Also use stopSimulation for cleanup on error
      stopSimulation();
    }
  }

  document.getElementById("sample-btn").addEventListener("click", () => {
    let n = parseInt(document.getElementById("n-input").value, 10);

    // Get the current view (3D or 2D)
    const is3DView = document.getElementById("view-3d-btn").classList.contains("active");
    const maxN = is3DView ? 300 : 500;

    if (isNaN(n) || n < 2 || n % 2) {
      return alert(`Enter an even number for n (at least 2)`);
    }

    if (n > maxN) {
      return alert(`n is too large. Maximum value in ${is3DView ? '3D' : '2D'} view is ${maxN}`);
    }

    updateVisualization(n);
  });

  // Function to update parameter visibility based on selected periodicity
  function updatePeriodicityParams() {
    const periodicity = document.querySelector('input[name="periodicity"]:checked')?.value || 'uniform';

    // Show/hide weights based on selection
    const weights2x2 = document.getElementById('weights-2x2');
    const weights3x3 = document.getElementById('weights-3x3');

    if (weights2x2) weights2x2.style.display = (periodicity === '2x2') ? 'block' : 'none';
    if (weights3x3) weights3x3.style.display = (periodicity === '3x3') ? 'block' : 'none';



    console.log(`Periodicity set to ${periodicity}, showing appropriate parameters`);
  }

  // Add handlers for periodicity radio buttons
  document.querySelectorAll('input[name="periodicity"]').forEach(radio => {
    radio.addEventListener('change', updatePeriodicityParams);

    // Make sure clicking on labels works too
    const id = radio.id;
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      label.addEventListener('click', () => {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      });
    }
  });



  // Ensure correct parameters are visible initially
  setTimeout(updatePeriodicityParams, 0);

  document.getElementById("cancel-btn").addEventListener("click", () => {
    stopSimulation();
  });

  // Demo mode toggle handler
  document.getElementById("demo-mode").addEventListener("change", function() {
    isDemoMode = this.checked;

    if (isDemoMode) {
      // Set to angled demo view
      setDemoViewCamera();
    }
    // When turning off, we just stop rotation but keep the current view
  });

  // Set up demo view camera position
  function setDemoViewCamera() {
    // Reset any existing rotation
    if (dominoGroup) dominoGroup.rotation.set(0, 0, 0);

    // Set to angled view
    camera.position.set(50, 80, 50);
    camera.lookAt(0, 0, 0);
    controls.update();
  }

  // Camera movement controls
  document.getElementById("move-up-btn").addEventListener("click", function() {
    // Move camera up relative to current view
    const moveAmount = 5;
    const upVector = new THREE.Vector3(0, 1, 0);
    upVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(upVector, moveAmount);
    controls.target.addScaledVector(upVector, moveAmount);
    controls.update();
  });

  document.getElementById("move-down-btn").addEventListener("click", function() {
    // Move camera down relative to current view
    const moveAmount = 5;
    const upVector = new THREE.Vector3(0, 1, 0);
    upVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(upVector, -moveAmount);
    controls.target.addScaledVector(upVector, -moveAmount);
    controls.update();
  });

  document.getElementById("move-left-btn").addEventListener("click", function() {
    // Move camera left relative to current view
    const moveAmount = 5;
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(rightVector, -moveAmount);
    controls.target.addScaledVector(rightVector, -moveAmount);
    controls.update();
  });

  document.getElementById("move-right-btn").addEventListener("click", function() {
    // Move camera right relative to current view
    const moveAmount = 5;
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(rightVector, moveAmount);
    controls.target.addScaledVector(rightVector, moveAmount);
    controls.update();
  });

  // Reset view button handler
  document.getElementById("reset-view-btn").addEventListener("click", function() {
    if (isDemoMode) {
      setDemoViewCamera();
    } else {
      // Reset camera to initial position
      camera.position.set(0, 130, 0);
      camera.lookAt(0, 0, 0);

      // Reset domino group rotation
      if (dominoGroup) dominoGroup.rotation.set(0, 0, 0);

      controls.update();
    }
  });

  // View toggle handlers
  document.getElementById("view-3d-btn").addEventListener("click", function() {
    // Show 3D view, hide 2D view
    document.getElementById("aztec-canvas").style.display = "block";
    document.getElementById("aztec-2d-canvas").style.display = "none";
    document.getElementById("camera-controls").style.display = "block";

    // Update toggle button states
    document.getElementById("view-3d-btn").classList.add("active");
    document.getElementById("view-2d-btn").classList.remove("active");

    // Set the max n for 3D view
    document.getElementById("n-input").setAttribute("max", "300");

    // Resume animation
    if (!animationActive) {
      animationActive = true;
      animate();
    }
  });

  // 2D visualization helper functions
  // Helper: convert a brightness value (0–255) to a hex grayscale string.
  function grayHex(brightness) {
    let hex = Math.round(brightness).toString(16);
    if(hex.length < 2) hex = "0" + hex;
    return "#" + hex + hex + hex;
  }

  // Function to convert color to grayscale based on position
  function getGrayscaleColor(originalColor, d) {
    let c = d3.color(originalColor);
    if (!c) return originalColor;
    
    let normHex = c.formatHex().toLowerCase();
    const isHorizontal = d.w > d.h;
    
    if (normHex === "#0000ff" || normHex === "#00ff00") { // blue or green (horizontal dominoes)
      // Use vertical coordinate parity
      const yCoord = Math.floor(d.y);
      return yCoord % 2 === 0 ? grayHex(120) : grayHex(180); // lighter/darker gray based on y parity
    } 
    else if (normHex === "#ff0000" || normHex === "#ffff00") { // red or yellow (vertical dominoes)
      // Use horizontal coordinate parity
      const xCoord = Math.floor(d.x);
      return xCoord % 2 === 0 ? grayHex(70) : grayHex(130); // lighter/darker gray based on x parity
    }
    
    // For any other color, convert using standard luminance formula
    let r = c.r, g = c.g, b = c.b;
    let lum = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
    return grayHex(lum);
  }

  // Setup 2D visualization elements
  const svg2d = d3.select("#aztec-svg-2d");
  let initialTransform2d = {}; // Store initial transform parameters for 2D

  // Create zoom behavior for 2D
  const zoom2d = d3.zoom()
    .scaleExtent([0.1, 50]) // Min and max zoom scale
    .on("zoom", (event) => {
      if (!initialTransform2d.scale) return; // Skip if no initial transform is set

      // Apply the zoom transformation on top of initial transform
      const group = svg2d.select("g");
      const t = event.transform;
      group.attr("transform",
        `translate(${initialTransform2d.translateX * t.k + t.x},${initialTransform2d.translateY * t.k + t.y}) scale(${initialTransform2d.scale * t.k})`);
    });

  // Enable zoom on the 2D SVG
  svg2d.call(zoom2d);

  // Add double-click to reset zoom for 2D
  svg2d.on("dblclick.zoom", () => {
    svg2d.transition()
      .duration(750)
      .call(zoom2d.transform, d3.zoomIdentity);
  });

  // Add event listeners for 2D zoom controls
  document.getElementById("zoom-in-btn-2d").addEventListener("click", () => {
    svg2d.transition()
      .duration(300)
      .call(zoom2d.scaleBy, 1.3);
  });

  document.getElementById("zoom-out-btn-2d").addEventListener("click", () => {
    svg2d.transition()
      .duration(300)
      .call(zoom2d.scaleBy, 0.7);
  });

  document.getElementById("zoom-reset-btn-2d").addEventListener("click", () => {
    svg2d.transition()
      .duration(300)
      .call(zoom2d.transform, d3.zoomIdentity);
  });

  // 2D grayscale toggle handler
  document.getElementById("grayscale-checkbox-2d").addEventListener("change", function() {
    const useGrayscale = this.checked;
    // Update colors of existing dominoes
    svg2d.select("g").selectAll("rect")
      .attr("fill", d => useGrayscale ? getGrayscaleColor(d.color, d) : d.color);
  });

  // Function to render dominoes in 2D view
  async function render2D(dominoes) {
    if (!dominoes || dominoes.length === 0) return;

    // Clear previous rendering
    svg2d.selectAll("g").remove();

    const useGrayscale = document.getElementById("grayscale-checkbox-2d").checked;

    // Calculate bounds and scale
    const minX = d3.min(dominoes, d => d.x);
    const minY = d3.min(dominoes, d => d.y);
    const maxX = d3.max(dominoes, d => d.x + d.w);
    const maxY = d3.max(dominoes, d => d.y + d.h);
    const widthDominoes = maxX - minX;
    const heightDominoes = maxY - minY;

    const bbox = svg2d.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;

    const scale = Math.min(svgWidth / widthDominoes, svgHeight / heightDominoes) * 0.9;
    const translateX = (svgWidth - widthDominoes * scale) / 2 - minX * scale;
    const translateY = (svgHeight - heightDominoes * scale) / 2 - minY * scale;

    // Store the initial transform parameters for zoom behavior
    initialTransform2d = {
      translateX: translateX,
      translateY: translateY,
      scale: scale
    };

    // Reset the zoom transform when creating a new visualization
    svg2d.call(zoom2d.transform, d3.zoomIdentity);

    const group = svg2d.append("g")
                       .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

    // Render dominoes in batches to keep UI responsive
    const BATCH_SIZE = 200;

    for (let i = 0; i < dominoes.length; i += BATCH_SIZE) {
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
           .attr("stroke-width", 0.1);

      // Yield to UI thread after each batch
      if (i + BATCH_SIZE < dominoes.length) {
        await sleep(0);
      }
    }
  }

  document.getElementById("view-2d-btn").addEventListener("click", function() {
    // Show 2D view, hide 3D view
    document.getElementById("aztec-canvas").style.display = "none";
    document.getElementById("aztec-2d-canvas").style.display = "block";
    document.getElementById("camera-controls").style.display = "none";

    // Update toggle button states
    document.getElementById("view-3d-btn").classList.remove("active");
    document.getElementById("view-2d-btn").classList.add("active");

    // Set the max n for 2D view
    document.getElementById("n-input").setAttribute("max", "500");

    // If we have cached dominoes, render them in 2D
    if (cachedDominoes && cachedDominoes.length > 0) {
      render2D(cachedDominoes);
    }

    // Pause 3D animation to save resources
    animationActive = false;
  });

  // Add keyboard controls
  window.addEventListener('keydown', function(event) {
    const moveAmount = 5;

    // Arrow keys for camera movement
    if (event.key === 'ArrowUp') {
      const upVector = new THREE.Vector3(0, 1, 0);
      upVector.applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(upVector, moveAmount);
      controls.target.addScaledVector(upVector, moveAmount);
      controls.update();
    }
    else if (event.key === 'ArrowDown') {
      const upVector = new THREE.Vector3(0, 1, 0);
      upVector.applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(upVector, -moveAmount);
      controls.target.addScaledVector(upVector, -moveAmount);
      controls.update();
    }
    else if (event.key === 'ArrowLeft') {
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(rightVector, -moveAmount);
      controls.target.addScaledVector(rightVector, -moveAmount);
      controls.update();
    }
    else if (event.key === 'ArrowRight') {
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(rightVector, moveAmount);
      controls.target.addScaledVector(rightVector, moveAmount);
      controls.update();
    }
    // 'R' key to reset view
    else if (event.key === 'r' || event.key === 'R') {
      document.getElementById("reset-view-btn").click();
    }
    // 'D' key to toggle demo mode
    else if (event.key === 'd' || event.key === 'D') {
      const demoCheckbox = document.getElementById('demo-mode');
      demoCheckbox.checked = !demoCheckbox.checked;
      // Trigger the change event
      demoCheckbox.dispatchEvent(new Event('change'));
    }
  });

  // Delay initialization slightly to ensure all DOM elements are ready
  setTimeout(() => {
    try {
      const n = parseInt(document.getElementById("n-input").value, 10) || 12;
      updateVisualization(n);
    } catch (err) {
      console.error("Error during initial visualization:", err);
    }
  }, 100);
};
</script>
