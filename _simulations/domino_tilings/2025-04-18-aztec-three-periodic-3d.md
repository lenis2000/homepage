---
title: '3D Visualization of Domino Tilings with 3x3 Periodic Weights'
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-04-18-aztec-three-periodic-3d.md'
    txt: 'This simulation is interactive, written in JavaScript; see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-04-18-aztec-three-periodic-3d.cpp'
    txt: 'C++ code for the simulation'
published: true
---

<style>
  /* Ensure the canvas scales fully on wide screens and remains responsive on mobile */
  #aztec-canvas {
    width: 100%;
    height: 80vh; /* Use 80% of viewport height on large screens */
    vertical-align: top;
  }
  @media (max-width: 576px) {
    #aztec-canvas {
      height: 60vh;
    }
  }
</style>

<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>
<script src="/js/2025-04-18-aztec-three-periodic-3d.js"></script>


This simulation displays random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a> using its three-dimensional height function. The visualization is inspired by Alexei and Matvey Borodin's <a href="https://math.mit.edu/~borodin/aztec.html">visualizations</a>. The simulation uses a measure with $3\times 3$ periodic weights, extending the <a href="https://arxiv.org/abs/1410.2385">work</a> by Chhita and Johansson on 2×2 periodic weights.

The weight assignment uses a full 3×3 block pattern with 9 different weights:
```
[w₁ w₂ w₃]
[w₄ w₅ w₆]
[w₇ w₈ w₉]
```

Caution: large values of $n$ may take a while to sample. If $n\le 100$, it should be reasonably fast.

<!-- Aztec Diamond Order Control -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 300$): </label>
  <input id="n-input" type="number" value="30" min="2" step="2" max="300" size="3">
  <button id="update-btn">Update</button>
  <button id="cancel-btn" style="display: none; margin-left: 10px; background-color: #ff5555;">Cancel</button>
</div>

<!-- Weight Controls -->
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 600px; margin-bottom: 20px;">
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

<span id="progress-indicator" style="font-weight: bold; margin-left: 10px;"></span>

<div id="aztec-canvas"></div>

<script>
Module.onRuntimeInitialized = async function() {
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number','number','number','number','number','number','number','number','number','number'], {async: true});
  const freeString    = Module.cwrap('freeString', null, ['number']);
  const getProgress   = Module.cwrap('getProgress', 'number', []);

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
    renderer.render(scene, camera);
  }

  // Helper function to sleep for ms milliseconds
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function startSimulation() {
    simulationActive = true;
    updateBtn.disabled = true;
    cancelBtn.style.display = 'inline-block';
    abortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    clearInterval(progressInterval);
    updateBtn.disabled = false;
    cancelBtn.style.display = 'none';
    progressElem.innerText = "Simulation cancelled";

    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  initThreeJS();

  // Calculate height function based on domino configuration
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
      // color names from the C++ file: red, blue, green, yellow 
      const sign = horiz
        ? (d.color === "#00ff00" ? -1 : 1)   // horizontal: green = −1, blue = +1
        : (d.color === "#ffff00" ? -1 : 1);  // vertical: yellow = −1, red = +1
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
    // Clear previous models
    while(dominoGroup.children.length){
      const m = dominoGroup.children[0];
      dominoGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }

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
      
      // Allow UI to update before starting heavy computation
      await sleep(50);
      if (signal.aborted) return;

      // Get domino configuration from C++ code with weights
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

      progressElem.innerText = "Calculating height function...";
      await sleep(10);
      if (signal.aborted) return;

      // Calculate the height function (in chunks if large)
      const heightMap = calculateHeightFunction(dominoes);
      if (signal.aborted) return;

      // Scale factor based on n
      const scale = 60/(2*n);

      // Colors for the materials (hex colors to THREE.js colors)
      const colors = {
        "#ff0000": 0xff0000, // red
        "#00ff00": 0x00ff00, // green
        "#0000ff": 0x0000ff, // blue
        "#ffff00": 0xffff00  // yellow
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
                const isH = (f.color === '#0000ff' || f.color === '#00ff00');
                const indices = isH
                  ? [0,1,4, 1,2,5, 0,4,3, 4,5,3]
                  : [0,1,4, 1,2,5, 0,4,3, 4,5,3];

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
        dominoGroup.position.sub(center);

        // now scale it to fill the view
        const size = new THREE.Vector3();
        box.getSize(size);

        // compute how big the camera's view is in world units
        const viewWidth = camera.right - camera.left;
        const viewHeight = camera.top - camera.bottom;

        // pick the smaller scale so it fits both width & height, with 5% padding
        const finalScale = Math.min(
          viewWidth / size.x,
          viewHeight / size.z
        ) * 0.95;

        dominoGroup.scale.setScalar(finalScale);
      }

      // Cleanup
      clearInterval(progressInterval);
      updateBtn.disabled = false;
      cancelBtn.style.display = 'none';
      simulationActive = false;
    } catch(err) {
      console.error(err);
      progressElem.innerText = `Error: ${err.message}`;
      clearInterval(progressInterval);
      updateBtn.disabled = false;
      cancelBtn.style.display = 'none';
      simulationActive = false;
    }
  }

  document.getElementById("update-btn").addEventListener("click", () => {
    let n = parseInt(document.getElementById("n-input").value, 10);
    if (isNaN(n) || n < 2 || n % 2 || n > 300) {
      return alert("Enter even n between 2 and 300");
    }
    updateVisualization(n);
  });

  document.getElementById("cancel-btn").addEventListener("click", () => {
    stopSimulation();
  });

  updateVisualization(parseInt(document.getElementById("n-input").value, 10));
};
</script>