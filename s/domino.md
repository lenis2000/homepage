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
    height: 75vh; /* Use 75% of viewport height - slightly larger in vertical direction */
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

  /* View toggle and display options styling */
  .view-toggle, .display-options {
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

  .display-options {
    display: flex;
    align-items: center;
    padding: 8px;
    background-color: #f5f5f5;
    border-radius: 4px;
    margin-bottom: 15px;
  }

  .display-options label {
    margin-left: 5px;
    cursor: pointer;
    user-select: none;
  }

  .display-options input[type="checkbox"] {
    cursor: pointer;
  }

  @media (max-width: 768px) {
    #aztec-canvas, #aztec-2d-canvas {
      height: 65vh;
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


This simulation displays random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a> using its three-dimensional height function. The 3d visualization is inspired by Alexei and Matvey Borodin's <a href="https://math.mit.edu/~borodin/aztec.html">visualizations</a>. Caution: large values of $n$ may take a while to sample. If $n\le 100$, it should be reasonably fast. The simulation also contains a 2d version, which is faster and has more features, such as nonintersecting paths, dimers, and TikZ exports.

<!-- Parameters section above the panes -->
<div class="parameters-section">
  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 10px;">
    <div>
      <label for="n-input">Aztec Diamond Order: </label>
      <input id="n-input" type="number" value="12" min="2" step="2" max="300" size="3">
    </div>

    <div style="margin-left: 20px;">
      <input type="checkbox" id="show-colors-checkbox" checked style="vertical-align: middle;">
      <label for="show-colors-checkbox" style="cursor: pointer;">&nbsp;Show colors</label>
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
  <div id="aztec-2d-canvas" style="position: relative; overflow: hidden; height: 75vh;">
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
      <input type="checkbox" id="grayscale-checkbox-2d">
      <label for="grayscale-checkbox-2d">Grayscale mode (great for seeing gas phase in 2x2 periodic model)</label>
      <br>
      <input type="checkbox" id="checkerboard-checkbox-2d">
      <label for="checkerboard-checkbox-2d">Show checkerboard overlay</label>
      <span style="margin-left: 20px;"></span>
      <label for="border-width-input">Border thickness:</label>
      <input type="number" id="border-width-input" min="0" max="1" step="0.05" value="0.1" style="width: 60px;">
      <br>
      <input type="checkbox" id="paths-checkbox-2d">
      <label for="paths-checkbox-2d">Show nonintersecting paths</label>
      <br>
      <input type="checkbox" id="dimers-checkbox-2d">
      <label for="dimers-checkbox-2d">Show dimers</label>
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

    // Make sure the container is visible
    container.style.display = 'block';
    // No innerHTML clearing here - it can disrupt existing WebGL context

    const w = container.clientWidth, h = container.clientHeight;
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(w,h);
    renderer.setPixelRatio(window.devicePixelRatio);
    // Enable OES_element_index_uint extension for WebGL 1 to support 32-bit indices
    renderer.getContext().getExtension('OES_element_index_uint');

    // Clear and add canvas
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

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

  // Initialize Three.js when the module is loaded
  initThreeJS();

  // Add a global function to easily reset Three.js if needed
  window.resetThreeJS = function() {
    console.log("Manual reset of Three.js requested");
    if (renderer) {
      renderer.dispose();
    }
    initThreeJS();
    return "Three.js reset complete";
  };

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
     if (dominoGroup) {
       dominoGroup.clear();                    // three ≥ r152 preferred to loop/remove
       dominoGroup.position.set(0, 0, 0);
       dominoGroup.rotation.set(0, 0, 0);
       dominoGroup.scale.set(1, 1, 1);         // <‑‑ the crucial line
     } else {
       // Something went wrong with the 3D scene - reinitialize
       console.log("Reinitializing Three.js - dominoGroup was null");
       initThreeJS();
     }
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
    if (dominoGroup && dominoGroup.children) {
      // Improved clearing that's safer and handles possible null conditions
      while(dominoGroup.children && dominoGroup.children.length > 0){
        const m = dominoGroup.children[0];
        if (m) {
          dominoGroup.remove(m);
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        }
      }
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

      // Check if this is a large tiling (n > 300)
      const isLargeTiling = n > 300;
      console.log("Current n value:", n, "isLargeTiling:", isLargeTiling);

      // Always render the 2D view first (we'll need it regardless)
      await render2D(dominoes);

      // For large tilings (n > 300), prepare a message for 3D view
      if (isLargeTiling) {
        console.log("Large tiling detected, showing message instead of 3D");
        // Create a div with a message in the 3D canvas container
        const container = document.getElementById('aztec-canvas');
        container.innerHTML = '';
        const messageDiv = document.createElement('div');
        messageDiv.style.width = '100%';
        messageDiv.style.height = '100%';
        messageDiv.style.display = 'flex';
        messageDiv.style.alignItems = 'center';
        messageDiv.style.justifyContent = 'center';
        messageDiv.style.backgroundColor = '#f0f0f0';
        messageDiv.style.border = '1px solid #ccc';
        messageDiv.style.padding = '20px';
        messageDiv.style.boxSizing = 'border-box';
        messageDiv.style.fontSize = '18px';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.textAlign = 'center';
        messageDiv.innerHTML = 'For n > 300, only 2D visualization is available.<br>Switch to the 2D view using the button above.<br><br>To see a 3D visualization, decrease n to 300 or less and click Sample.';
        container.appendChild(messageDiv);

        progressElem.innerText = "";
        stopSimulation();
        return;
      }

      // For n ≤ 300, continue with 3D rendering regardless of current view
      console.log("Small tiling (n ≤ 300), proceeding with 3D rendering");

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

                // Check if we should show colors in 3D view
                const showColors = document.getElementById("show-colors-checkbox").checked;
                const monoColor = 0x999999; // Default monochrome color when not showing colors
                const colorValue = colors[f.color] || 0x808080;

                const mat = new THREE.MeshStandardMaterial({
                  color: showColors ? colorValue : monoColor,
                  side: THREE.DoubleSide,
                  flatShading: true
                });
                
                // Store the original color code for later use in the userData
                mat.userData = { originalColorValue: colorValue };

                // Create the mesh and store the original color for later toggling
                const mesh = new THREE.Mesh(geom, mat);
                mesh.userData.originalColor = f.color;

                dominoGroup.add(mesh);
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

    if (isNaN(n) || n < 2 || n % 2) {
      return alert(`Enter an even number for n (at least 2)`);
    }

    // Get the current view (3D or 2D)
    const is3DView = document.getElementById("view-3d-btn").classList.contains("active");

    // Absolute maximum n values for each view
    const max3DN = 300;
    const max2DN = 500;

    // Check if n is within allowed range
    if ((is3DView && n > max3DN && n <= max2DN)) {
      // If in 3D view with n between 300 and 500, ask if user wants to switch to 2D
      if (confirm(`For n > ${max3DN}, only 2D visualization is available. Switch to 2D view automatically?`)) {
        // Switch to 2D view
        document.getElementById("view-2d-btn").click();
        // Now update visualization
        updateVisualization(n);
      }
      return;
    } else if (n > max2DN) {
      // Absolute maximum exceeded
      return alert(`n is too large. Maximum value is ${max2DN}.`);
    }

    // Handle 3D view initialization and clearing
    if (is3DView) {
      if (n <= max3DN) {
        // For valid n in 3D view, initialize properly
        // Make sure the 3D view is fully initialized
        const container = document.getElementById('aztec-canvas');
        const hasCanvas = container.querySelector('canvas') !== null;

        // Only clear the container if we're keeping the 3D view (n <= 300)
        // and there's no WebGL canvas yet
        if (!hasCanvas) {
          console.log("Ensuring Three.js is initialized");
          initThreeJS();
        }

        // Show helpful information in the progress indicator for valid n
        progressElem.innerText = "Generating new 3D visualization...";
      }
    }

    // If we get here, n is within allowed range for current view
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

    // Check if the WebGL renderer is properly initialized
    const container = document.getElementById('aztec-canvas');
    if (!container.querySelector('canvas')) {
      console.log("Reinitializing Three.js - canvas was missing");
      initThreeJS();
    }

    // If we have cached dominoes, handle the view switch appropriately
    if (cachedDominoes && cachedDominoes.length > 0) {
      const n = parseInt(document.getElementById("n-input").value, 10);

      if (n > 300) {
        // Show message for large n
        const container = document.getElementById('aztec-canvas');
        container.innerHTML = '';
        const messageDiv = document.createElement('div');
        messageDiv.style.width = '100%';
        messageDiv.style.height = '100%';
        messageDiv.style.display = 'flex';
        messageDiv.style.alignItems = 'center';
        messageDiv.style.justifyContent = 'center';
        messageDiv.style.backgroundColor = '#f0f0f0';
        messageDiv.style.border = '1px solid #ccc';
        messageDiv.style.padding = '20px';
        messageDiv.style.boxSizing = 'border-box';
        messageDiv.style.fontSize = '18px';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.textAlign = 'center';
        messageDiv.innerHTML = 'For n > 300, only 2D visualization is available.<br>Switch to the 2D view using the button above.<br><br>To see a 3D visualization, decrease n to 300 or less and click Sample.';
        container.appendChild(messageDiv);

        progressElem.innerText = "Using cached tiling (n > 300 is only available in 2D view)";
        setTimeout(() => { progressElem.innerText = ""; }, 3000);
      } else {
        // For n ≤ 300, show informational message
        progressElem.innerText = "Using cached 3D visualization";
        setTimeout(() => { progressElem.innerText = ""; }, 2000);
      }
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
    // Handle undefined or non-string colors
    if (!originalColor) {
      // Default to a medium gray if color is undefined
      return grayHex(150);
    }

    // Special handling for "green" as string
    if (originalColor === "green" ||
        (typeof originalColor === 'string' && originalColor.toLowerCase().includes('green'))) {
      const yParity = Math.floor(d.y) % 4 === 0 ? 0 : 1;
      return grayHex(grayscaleValues.green["p" + yParity]);
    }

    let c;
    try {
      c = d3.color(originalColor);
    } catch (e) {
      return grayHex(150); // Default gray on parsing error
    }
    
    if (!c) return typeof originalColor === 'string' ? originalColor : grayHex(150);

    let normHex;
    try {
      normHex = c.formatHex().toLowerCase();
    } catch (e) {
      return grayHex(150); // Default gray if format fails
    }
    
    const isHorizontal = d.w > d.h;

    // For blue or green (horizontal dominoes), use vertical coordinate parity
    if (isHorizontal) {
      const yParity = Math.floor(d.y) % 4 === 0 ? 0 : 1;

      if (normHex === "#0000ff" || normHex === "#4363d8" || 
          (typeof normHex === 'string' && normHex.includes("blue"))) { // blue
        return grayHex(grayscaleValues.blue["p" + yParity]);
      }
      // Green dominoes - check multiple possible formats
      else if (normHex === "#00ff00" || normHex === "#1e8c28" || 
               (typeof normHex === 'string' && normHex.includes("green")) ||
               (c.r !== undefined && c.g !== undefined && c.b !== undefined && c.r < c.g && c.g > c.b)) { // Any mostly-green color
        return grayHex(grayscaleValues.green["p" + yParity]);
      }
    }
    // For red or yellow (vertical dominoes), use horizontal coordinate parity
    else {
      const xParity = Math.floor(d.x) % 4 === 0 ? 0 : 1;

      if (normHex === "#ff0000" || normHex === "#ff2244" || 
          (typeof normHex === 'string' && normHex.includes("red")) ||
          (c.r !== undefined && c.g !== undefined && c.b !== undefined && c.r > c.g && c.r > c.b)) { // red - any reddish color
        return grayHex(grayscaleValues.red["p" + xParity]);
      } else if (normHex === "#ffff00" || normHex === "#fca414" || 
                (typeof normHex === 'string' && normHex.includes("yellow")) ||
                (c.r !== undefined && c.g !== undefined && c.b !== undefined && c.r > 200 && c.g > 200 && c.b < 100)) { // yellow - any yellowish color
        return grayHex(grayscaleValues.yellow["p" + xParity]);
      }
    }

    // For any other color, convert using standard luminance formula
    if (c.r === undefined || c.g === undefined || c.b === undefined) {
      return grayHex(150); // Default gray if color components are missing
    }
    
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

  // Grayscale values are now hardcoded, no interactive controls needed

  // Hardcoded grayscale values
  const grayscaleValues = {
    blue: { p0: 100, p1: 253 },
    green: { p0: 243, p1: 80 },
    red: { p0: 150, p1: 10 },
    yellow: { p0: 20, p1: 170 }
  };

  // No interactive controls needed with hardcoded values

  // 2D grayscale toggle handler
  document.getElementById("grayscale-checkbox-2d").addEventListener("change", function() {
    updateDominoDisplay();
  });

  // Checkerboard overlay toggle handler
  document.getElementById("checkerboard-checkbox-2d").addEventListener("change", function() {
    updateDominoDisplay();
  });

  // Border width input handler - update immediately on input
  document.getElementById("border-width-input").addEventListener("input", function() {
    updateDominoDisplay();
  });

  // Nonintersecting paths toggle handler
  document.getElementById("paths-checkbox-2d").addEventListener("change", function() {
    updateDominoDisplay();
  });
  
  // Dimers toggle handler
  document.getElementById("dimers-checkbox-2d").addEventListener("change", function() {
    updateDominoDisplay();
  });

  // Function to determine if a lattice face (2x2 square) is part of the checkerboard pattern
  function getCheckerboardPattern(d) {
    // Dominoes are 2x4 (horizontal) or 4x2 (vertical)
    // We want to create a checkerboard pattern on the underlying 2x2 lattice faces

    // Get the position of each lattice face (2x2 square)
    // For a horizontal domino (2x4), it covers 2 lattice faces
    // For a vertical domino (4x2), it also covers 2 lattice faces

    // Convert domino coordinates to lattice coordinates (each lattice face is 2x2)
    const latticeX = Math.floor(d.x / 2);
    const latticeY = Math.floor(d.y / 2);

    // Traditional checkerboard pattern on the lattice
    // True if the sum of lattice coordinates is even
    return (latticeX + latticeY) % 2 === 0;
  }

  // Function to update domino display based on various display settings
  function updateDominoDisplay() {
    const useGrayscale = document.getElementById("grayscale-checkbox-2d").checked;
    const showCheckerboard = document.getElementById("checkerboard-checkbox-2d").checked;
    const showPaths = document.getElementById("paths-checkbox-2d").checked;
    const showDimers = document.getElementById("dimers-checkbox-2d").checked;
    const showColors = document.getElementById("show-colors-checkbox").checked;
    const monoColor = "#F8F8F8"; // Extremely light monochrome color

    // First, remove any existing overlays
    svg2d.select("g").selectAll(".checkerboard-square").remove();
    svg2d.select("g").selectAll(".path-line").remove();
    svg2d.select("g").selectAll(".dimer-circle").remove();
    svg2d.select("g").selectAll(".dimer-line").remove();

    // Get the current border thickness value
    const borderWidth = parseFloat(document.getElementById("border-width-input").value) || 0.1;

    // Toggle colors between normal and grayscale for the dominoes and update border width
    svg2d.select("g").selectAll("rect")
      .attr("fill", function(d) {
        // Determine the base color based on color settings
        if (!showColors) {
          return monoColor;
        } else if (useGrayscale) {
          return getGrayscaleColor(d.color, d);
        } else {
          return d.color;
        }
      })
      .attr("stroke-width", borderWidth); // Update the border thickness

    // If checkerboard is enabled, draw 2x2 lattice squares
    if (showCheckerboard) {
      const group = svg2d.select("g");

      // Create a set of all 2x2 lattice faces used by the dominoes
      const latticeSet = new Set();
      const latticeSquares = [];

      // First, collect all the 2x2 lattice face positions
      group.selectAll("rect").each(function(d) {
        // For a horizontal domino (2x4), it covers 2 lattice faces side by side
        // For a vertical domino (4x2), it covers 2 lattice faces one above the other

        const isHorizontal = d.w > d.h;

        if (isHorizontal) {
          // Horizontal domino covers 2 faces horizontally
          const leftX = Math.floor(d.x / 2) * 2;
          const y = Math.floor(d.y / 2) * 2;

          // Add both lattice faces
          const leftKey = `${leftX},${y}`;
          const rightKey = `${leftX + 2},${y}`;

          if (!latticeSet.has(leftKey)) {
            latticeSet.add(leftKey);
            latticeSquares.push({x: leftX, y: y, size: 2});
          }

          if (!latticeSet.has(rightKey)) {
            latticeSet.add(rightKey);
            latticeSquares.push({x: leftX + 2, y: y, size: 2});
          }
        } else {
          // Vertical domino covers 2 faces vertically
          const x = Math.floor(d.x / 2) * 2;
          const topY = Math.floor(d.y / 2) * 2;

          // Add both lattice faces
          const topKey = `${x},${topY}`;
          const bottomKey = `${x},${topY + 2}`;

          if (!latticeSet.has(topKey)) {
            latticeSet.add(topKey);
            latticeSquares.push({x: x, y: topY, size: 2});
          }

          if (!latticeSet.has(bottomKey)) {
            latticeSet.add(bottomKey);
            latticeSquares.push({x: x, y: topY + 2, size: 2});
          }
        }
      });

      // Now draw all the lattice faces with checkerboard pattern
      group.selectAll(".checkerboard-square")
          .data(latticeSquares)
          .enter()
          .append("rect")
          .attr("class", "checkerboard-square")
          .attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("width", d => d.size)
          .attr("height", d => d.size)
          .attr("fill", function(d) {
            // Create checkerboard pattern based on lattice coordinates
            const isBlack = ((d.x / 2) + (d.y / 2)) % 2 === 0;
            return isBlack ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0)"; // Black or transparent
          })
          .attr("pointer-events", "none"); // Allow clicking through to the dominoes
    }

    // If nonintersecting paths are enabled, draw them
    if (showPaths) {
      // Collect all the dominoes
      const dominoes = [];
      svg2d.select("g").selectAll("rect").each(function(d) {
        dominoes.push(d);
      });

      // Create paths based on domino type and orientation
      const pathSegments = [];

      // Process each domino
      dominoes.forEach(d => {
        const isHorizontal = d.w > d.h;
        const color = d.color;

        // Calculate center points
        const centerX = d.x + d.w/2;
        const centerY = d.y + d.h/2;

        // Get color type
        let colorType = "";
        if (isHorizontal) {
          if (typeof color === 'string' && (color.includes("green") || color === "#1e8c28" || color === "#00ff00")) {
            colorType = "green";
          } else if (typeof color === 'string' && (color.includes("blue") || color === "#4363d8" || color === "#0000ff")) {
            colorType = "blue";
          }
        } else {
          if (typeof color === 'string' && (color.includes("yellow") || color === "#fca414" || color === "#ffff00")) {
            colorType = "yellow";
          } else if (typeof color === 'string' && (color.includes("red") || color === "#ff2244" || color === "#ff0000")) {
            colorType = "red";
          }
        }

        if (isHorizontal && colorType === "green") {
          // Green horizontal domino - horizontal path through center
          // Draw a horizontal line through the center of the green domino
          pathSegments.push({
            x1: d.x, // left edge
            y1: centerY,
            x2: d.x + d.w, // right edge
            y2: centerY,
            color: "black" // All paths are black now
          });
        }
        else if (!isHorizontal) {
          // For vertical dominoes (yellow or red)
          const centerX = d.x + d.w/2; // center X
          const centerY = d.y + d.h/2; // center Y
          const tileWidth = d.w;  // width of the domino
          const tileHeight = d.h; // height of the domino

          // Calculate path length through the center (maintaining 45° angle)
          // For 45° angle, we need equal horizontal and vertical components
          // We'll use the smaller of width/2 and height/2 to ensure we maintain the angle
          // but scaled appropriately to make the path go through most of the tile
          const pathHalfLength = Math.min(tileWidth, tileHeight) * 1.2; // Slightly longer to ensure it crosses the tile

          if (colorType === "yellow") {
            // Yellow vertical domino - up-right 45° diagonal through center
            pathSegments.push({
              x1: centerX - pathHalfLength/2,
              y1: centerY + pathHalfLength/2, // Adding because y increases downward in SVG
              x2: centerX + pathHalfLength/2,
              y2: centerY - pathHalfLength/2, // Subtracting because y increases downward in SVG
              color: "black"
            });
          }
          else if (colorType === "red") {
            // Red vertical domino - down-right 45° diagonal through center
            pathSegments.push({
              x1: centerX - pathHalfLength/2,
              y1: centerY - pathHalfLength/2, // Subtracting because y increases downward in SVG
              x2: centerX + pathHalfLength/2,
              y2: centerY + pathHalfLength/2, // Adding because y increases downward in SVG
              color: "black"
            });
          }
        }
      });

      // Draw all path segments
      const group = svg2d.select("g");
      group.selectAll(".path-line")
          .data(pathSegments)
          .enter()
          .append("line")
          .attr("class", "path-line")
          .attr("x1", d => d.x1)
          .attr("y1", d => d.y1)
          .attr("x2", d => d.x2)
          .attr("y2", d => d.y2)
          .attr("stroke", "black") // All paths are black now
          .attr("stroke-width", 0.6)
          .attr("pointer-events", "none"); // Allow clicking through to dominoes
    }
    
    // If dimers are enabled, draw them
    if (showDimers) {
      // Collect all the dominoes
      const dominoes = [];
      svg2d.select("g").selectAll("rect").each(function(d) {
        // Only add dominoes with valid coordinates
        if (d && typeof d.x === 'number' && typeof d.y === 'number' && 
            typeof d.w === 'number' && typeof d.h === 'number' &&
            !isNaN(d.x) && !isNaN(d.y) && !isNaN(d.w) && !isNaN(d.h)) {
          dominoes.push(d);
        }
      });
      
      // Create dimer representations
      const dimerNodes = [];
      const dimerEdges = [];
      
      // Process each domino to create dimer edges and nodes
      dominoes.forEach(d => {
        // Skip dominoes with invalid dimensions
        if (d.w <= 0 || d.h <= 0) return;
        
        const isHorizontal = d.w > d.h;
        
        // For each domino, we'll add two nodes and one edge connecting them
        // The dimer length should be half the long side of the domino
        
        try {
          if (isHorizontal) {
            // Horizontal domino (blue or green)
            const centerX = d.x + d.w/2;  // Center of the domino
            const midY = d.y + d.h/2;     // Vertical center
            
            // Calculate dimer length (half the domino width)
            const dimerLength = d.w / 2;
            
            // Place nodes at the midpoints between center and edges
            const leftX = centerX - dimerLength/2;
            const rightX = centerX + dimerLength/2;
            
            // Validate all coordinates are numbers and not NaN
            if (isNaN(leftX) || isNaN(rightX) || isNaN(midY)) return;
            
            // Add nodes
            const leftNode = {
              x: leftX,
              y: midY,
              radius: 0.4 // Radius for node circles
            };
            
            const rightNode = {
              x: rightX,
              y: midY,
              radius: 0.4
            };
            
            dimerNodes.push(leftNode, rightNode);
            
            // Add edge connecting the two nodes
            dimerEdges.push({
              x1: leftX,
              y1: midY,
              x2: rightX,
              y2: midY
            });
            
          } else {
            // Vertical domino (red or yellow)
            const midX = d.x + d.w/2;     // Horizontal center
            const centerY = d.y + d.h/2;  // Center of the domino
            
            // Calculate dimer length (half the domino height)
            const dimerLength = d.h / 2;
            
            // Place nodes at the midpoints between center and edges
            const topY = centerY - dimerLength/2;
            const bottomY = centerY + dimerLength/2;
            
            // Validate all coordinates are numbers and not NaN
            if (isNaN(midX) || isNaN(topY) || isNaN(bottomY)) return;
            
            // Add nodes
            const topNode = {
              x: midX,
              y: topY,
              radius: 0.4
            };
            
            const bottomNode = {
              x: midX,
              y: bottomY,
              radius: 0.4
            };
            
            dimerNodes.push(topNode, bottomNode);
            
            // Add edge connecting the two nodes
            dimerEdges.push({
              x1: midX,
              y1: topY,
              x2: midX,
              y2: bottomY
            });
          }
        } catch (e) {
          console.error("Error processing dimer:", e);
        }
      });
      
      // Additional validation for all dimer edges and nodes
      const validDimerEdges = dimerEdges.filter(d => 
        typeof d.x1 === 'number' && !isNaN(d.x1) &&
        typeof d.y1 === 'number' && !isNaN(d.y1) &&
        typeof d.x2 === 'number' && !isNaN(d.x2) &&
        typeof d.y2 === 'number' && !isNaN(d.y2)
      );
      
      const validDimerNodes = dimerNodes.filter(d => 
        typeof d.x === 'number' && !isNaN(d.x) &&
        typeof d.y === 'number' && !isNaN(d.y) &&
        typeof d.radius === 'number' && !isNaN(d.radius)
      );
      
      // Draw dimer edges and nodes
      const group = svg2d.select("g");
      
      // First draw edges (lines)
      group.selectAll(".dimer-line")
          .data(validDimerEdges)
          .enter()
          .append("line")
          .attr("class", "dimer-line")
          .attr("x1", d => d.x1)
          .attr("y1", d => d.y1)
          .attr("x2", d => d.x2)
          .attr("y2", d => d.y2)
          .attr("stroke", "black")
          .attr("stroke-width", 0.3)
          .attr("pointer-events", "none");
      
      // Then draw nodes (circles)
      group.selectAll(".dimer-circle")
          .data(validDimerNodes)
          .enter()
          .append("circle")
          .attr("class", "dimer-circle")
          .attr("cx", d => d.x)
          .attr("cy", d => d.y)
          .attr("r", d => d.radius)
          .attr("fill", "black")
          .attr("stroke", "none")
          .attr("pointer-events", "none");
    }
  }

  // Helper function to check if a domino is horizontal
  function isHorizontalDomino(d) {
    return d.w > d.h;
  }

  // Global color toggle handler
  document.getElementById("show-colors-checkbox").addEventListener("change", function() {
    const showColors = this.checked; // Get the current state of the checkbox
    console.log("Show colors toggled:", showColors);
    
    // Update 2D view if it exists
    const svg2dGroup = svg2d.select("g");
    if (!svg2dGroup.empty()) {
      updateDominoDisplay();
    }

    // Update 3D view if it exists and we're not in a large tiling case
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (n <= 300 && dominoGroup && dominoGroup.children && dominoGroup.children.length > 0) {
      const monoColor3D = 0x999999;

      // Define standard colors for domino types (same as in the 3D rendering)
      const domino3DColors = {
        blue:   0x4363d8,
        green:  0x1e8c28,
        red:    0xff2244,
        yellow: 0xfca414
      };

      // Update all meshes in the domino group
      dominoGroup.children.forEach(mesh => {
        if (mesh.material) {
          if (!showColors) {
            // Set to monochrome
            mesh.material.color.setHex(monoColor3D);
          } else {
            // Try to get the color from userData first (direct hex value)
            if (mesh.material.userData && mesh.material.userData.originalColorValue) {
              mesh.material.color.setHex(mesh.material.userData.originalColorValue);
            } else {
              // Fall back to the color name method
              const colorName = mesh.userData.originalColor || "blue";
              if (domino3DColors[colorName]) {
                mesh.material.color.setHex(domino3DColors[colorName]);
              } else {
                // Fallback for unknown colors
                mesh.material.color.setHex(0x808080);
              }
            }
          }
        }
      });

      // Force a render update
      if (renderer) {
        renderer.render(scene, camera);
      }
    }
  });

  // Function to render dominoes in 2D view
  async function render2D(dominoes) {
    if (!dominoes || dominoes.length === 0) return;

    // Clear previous rendering
    svg2d.selectAll("g").remove();

    const useGrayscale = document.getElementById("grayscale-checkbox-2d").checked;

    // Get the current border thickness value
    const borderWidth = parseFloat(document.getElementById("border-width-input").value) || 0.1;

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
    // Shift the visualization up by adding a negative vertical offset (20% of available space)
    const verticalShift = svgHeight * 0.04; // 10% of the SVG height
    const translateY = (svgHeight - heightDominoes * scale) / 2 - minY * scale - verticalShift;

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
           .attr("stroke", "#000")
           .attr("stroke-width", borderWidth);

      // Yield to UI thread after each batch
      if (i + BATCH_SIZE < dominoes.length) {
        await sleep(0);
      }
    }

    // Apply display settings (colors, grayscale, checkerboard overlay) once all dominoes are rendered
    updateDominoDisplay();
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

    // Always reuse the cached dominoes if we have them
    if (cachedDominoes && cachedDominoes.length > 0) {
      render2D(cachedDominoes);

      // If we're switching from 3D to 2D, update the progress indicator
      const n = parseInt(document.getElementById("n-input").value, 10);
      if (n > 300) {
        progressElem.innerText = "Using cached tiling (n > 300 is only available in 2D view)";
        setTimeout(() => { progressElem.innerText = ""; }, 3000);
      } else {
        progressElem.innerText = "Using cached tiling";
        setTimeout(() => { progressElem.innerText = ""; }, 2000);
      }
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
