---
title: 3D Height Function of Domino Tilings of the Aztec Diamond
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-29-aztec-uniform-3d.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-29-aztec-uniform-3d.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  /* Ensure the canvas scales fully on wide screens and remains responsive on mobile */
  #aztec-canvas {
    width: 100%;
    height: 80vh; /* Use 80% of viewport height on large screens */
    vertical-align: top; /* Align to the top */
  }
  @media (max-width: 576px) {
    #aztec-canvas {
      height: 60vh; /* Reduce height on smaller devices */
      vertical-align: top; /* Maintain top alignment on mobile */
    }
  }

  /* Controls styling */
  .controls-container {
    margin-bottom: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .view-controls {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .view-option {
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  .view-option.active {
    background-color: #4682B4;
    color: white;
  }
</style>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="{{site.url}}/js/three.min.js"></script>
<script src="{{site.url}}/js/OrbitControls.js"></script>
<script src="/js/2025-03-29-aztec-uniform-3d.js"></script>

This simulation demonstrates random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>, which is a diamond-shaped union of unit squares. The simulation uses a uniform measure to generate random tilings via the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>; this version is adapted for <code>JS</code> + <code>WebAssembly</code>.

The visualization shows the 3D height function associated with domino tilings. The height function is an integer-valued function defined on the vertices of the square lattice. It changes by +1 if the square to the left of a traversed edge is black (in the checkerboard coloring), and decreases by -1 if the square is white. This creates a continuous 3D surface where each domino represents a facet.

The sampler works in your browser. Up to $n \sim 120$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=300$ to avoid freezing your browser.

<!-- Controls to change n and toggle view modes -->
<div class="controls-container">
  <div>
    <label for="n-input">Aztec Diamond Order ($n\le 300$): </label>
    <input id="n-input" type="number" value="50" min="2" step="2" max="300" size="3">
    <button id="update-btn">Update</button>
  </div>

  <div class="view-controls">
    <div class="view-option active" id="view-3d">3D Height Function</div>
    <div class="view-option" id="view-2d">2D Domino Tiling</div>
  </div>
</div>

<!-- Progress indicator -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<div class="row">
  <div class="col-12">
    <!-- Canvas for Three.js rendering -->
    <canvas id="aztec-canvas"></canvas>
  </div>
</div>

<script>
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions asynchronously.
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const progressElem = document.getElementById("progress-indicator");
  let progressInterval;

  // Set up Three.js scene, camera, renderer
  const canvas = document.getElementById('aztec-canvas');
  let scene, camera, renderer, controls;
  let dominoGroup, heightMesh;
  let currentViewMode = '3d';

  // Initialize Three.js
  function initThreeJs() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(0, -300, 200);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);

    // Add ambient and directional light
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    // Create groups for organizing the scene
    dominoGroup = new THREE.Group();
    scene.add(dominoGroup);

    // Start animation loop
    animate();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  // Start polling the progress counter from C++.
  function startProgressPolling() {
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      const progress = getProgress();
      progressElem.innerText = "Sampling... (" + progress + "%)";
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
  }

  // Create the 3D visualization using Three.js
  function createDominoVisualization(dominoes) {
    // Clear any existing dominoes
    while(dominoGroup.children.length > 0) {
      dominoGroup.remove(dominoGroup.children[0]);
    }

    // Check if dominoes array exists and is not empty
    if (!dominoes || !Array.isArray(dominoes) || dominoes.length === 0) {
      console.error("No dominoes data available for visualization");
      return;
    }

    // Create a domino for each element in the data
    dominoes.forEach(domino => {
      const geometry = new THREE.BoxGeometry(domino.w, domino.h, 5);

      // Map color strings to THREE.js colors
      let color;
      switch(domino.color) {
        case 'red': color = 0xff0000; break;
        case 'green': color = 0x00ff00; break;
        case 'blue': color = 0x0000ff; break;
        case 'yellow': color = 0xffff00; break;
        default: color = 0xcccccc;
      }

      const material = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);

      // Position the domino
      mesh.position.set(domino.x + domino.w/2, domino.y + domino.h/2, 2.5);

      dominoGroup.add(mesh);
    });
  }

  // Create the 3D height function visualization
  function createHeightFunctionVisualization(heightData) {
    // Remove any existing height mesh
    if (heightMesh) {
      scene.remove(heightMesh);
    }

    // Check if height data exists and is not empty
    if (!heightData || !Array.isArray(heightData) || heightData.length === 0) {
      console.error("No height function data available for visualization");
      return;
    }

    // Create a geometry for the height function
    const geometry = new THREE.BufferGeometry();

    // Create an index map for the vertices
    const vertexMap = new Map();
    const positions = [];
    const colors = [];

    // Add all vertices
    heightData.forEach((vertex, index) => {
      if (vertex && typeof vertex.x === 'number' &&
          typeof vertex.y === 'number' &&
          typeof vertex.z === 'number') {
        positions.push(vertex.x, vertex.y, vertex.z);

        // Color based on height (gradient from blue to red)
        const normalizedHeight = vertex.z / 100; // Adjust based on your height range
        const r = Math.min(1, Math.max(0, normalizedHeight * 2));
        const g = Math.min(1, Math.max(0, 2 - Math.abs(normalizedHeight - 0.5) * 4));
        const b = Math.min(1, Math.max(0, 2 - normalizedHeight * 2));

        colors.push(r, g, b);
        vertexMap.set(`${vertex.x},${vertex.y}`, index);
      }
    });

    // Create faces (triangles) by connecting adjacent vertices
    const indices = [];
    const visited = new Set();

    // Helper function to add a triangle if all vertices exist
    function tryAddTriangle(x1, y1, x2, y2, x3, y3) {
      const key1 = `${x1},${y1}`;
      const key2 = `${x2},${y2}`;
      const key3 = `${x3},${y3}`;

      if (vertexMap.has(key1) && vertexMap.has(key2) && vertexMap.has(key3)) {
        const triangleKey = [key1, key2, key3].sort().join('|');

        if (!visited.has(triangleKey)) {
          indices.push(
            vertexMap.get(key1),
            vertexMap.get(key2),
            vertexMap.get(key3)
          );
          visited.add(triangleKey);
          return true;
        }
      }
      return false;
    }

    // Create triangles by checking adjacent vertices
    heightData.forEach(vertex => {
      const { x, y } = vertex;
      const step = 10; // Match the scale used in C++

      // Try to create triangles with adjacent vertices
      // Upper-right triangle
      tryAddTriangle(x, y, x + step, y, x, y - step);

      // Lower-left triangle
      tryAddTriangle(x + step, y, x + step, y - step, x, y - step);
    });

    // Set the attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Create the mesh
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 80
    });

    heightMesh = new THREE.Mesh(geometry, material);
    scene.add(heightMesh);

    // Add wireframe for better visibility of the surface
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: true, opacity: 0.3 })
    );
    heightMesh.add(wireframe);
  }

  // Toggle between 2D and 3D view modes
  function setViewMode(mode) {
    currentViewMode = mode;

    if (mode === '2d') {
      // Switch to 2D view (top-down)
      camera.position.set(0, 0, 500);
      camera.lookAt(0, 0, 0);

      // Show dominoes, hide height function
      dominoGroup.visible = true;
      if (heightMesh) heightMesh.visible = false;
    } else {
      // Switch to 3D view
      camera.position.set(0, -300, 200);
      camera.lookAt(0, 0, 0);

      // Hide dominoes in 3D mode, show height function
      dominoGroup.visible = false;
      if (heightMesh) heightMesh.visible = true;
    }

    // Update UI
    document.getElementById('view-2d').classList.toggle('active', mode === '2d');
    document.getElementById('view-3d').classList.toggle('active', mode === '3d');
  }

  // Update the visualization for a given n.
  async function updateVisualization(n) {
    // Clear any previous simulation.
    clearScene();

    // Start the progress indicator.
    startProgressPolling();

    try {
      // Await the asynchronous simulation.
      const ptr = await simulateAztec(n);
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      // Add debug logging
      console.log("JSON string length:", jsonStr.length);
      console.log("JSON string first 100 chars:", jsonStr.substring(0, 100));

      let result;
      try {
        result = JSON.parse(jsonStr);
        console.log("Parsed JSON structure:", result);
      } catch (e) {
        console.error("Error parsing JSON:", e);
        console.error("JSON substring where error might be:", jsonStr.substring(Math.max(0, e.position - 50), Math.min(jsonStr.length, e.position + 50)));
        progressElem.innerText = "Error during sampling";
        clearInterval(progressInterval);
        return;
      }

      // Create visualizations if data exists
      if (result.dominoes && Array.isArray(result.dominoes)) {
        console.log(`Creating visualization with ${result.dominoes.length} dominoes`);
        createDominoVisualization(result.dominoes);
      } else {
        console.error("No dominoes data in result");
      }

      if (result.heightFunction && Array.isArray(result.heightFunction)) {
        console.log(`Creating height function with ${result.heightFunction.length} vertices`);
        createHeightFunctionVisualization(result.heightFunction);
      } else {
        console.error("No height function data in result");
      }

      // Set the appropriate view mode
      setViewMode(currentViewMode);

      // Clear progress indicator once done.
      progressElem.innerText = "";
    } catch (error) {
      console.error("Error in updateVisualization:", error);
      progressElem.innerText = "Error during visualization";
      clearInterval(progressInterval);
    }
  }

  function clearScene() {
    // Clear domino group
    while(dominoGroup && dominoGroup.children.length > 0) {
      dominoGroup.remove(dominoGroup.children[0]);
    }

    // Remove height mesh
    if (heightMesh) {
      scene.remove(heightMesh);
      heightMesh = null;
    }
  }

  // Initialize Three.js
  initThreeJs();

  // Setup the update button.
  document.getElementById("update-btn").addEventListener("click", () => {
    const inputField = document.getElementById("n-input");
    const n = parseInt(inputField.value, 10);

    // Check for a valid positive even number.
    if (isNaN(n) || n < 2) {
      alert("Please enter a valid positive even number for n (n ≥ 2).");
      return;
    }
    if (n % 2 !== 0) {
      alert("Please enter an even number for n.");
      return;
    }
    if (n > 300) {
      alert("Please enter a number no greater than 300.");
      return;
    }
    updateVisualization(n);
  });

  // Setup view mode toggles
  document.getElementById("view-3d").addEventListener("click", () => setViewMode('3d'));
  document.getElementById("view-2d").addEventListener("click", () => setViewMode('2d'));

  // Run an initial simulation.
  const initialN = parseInt(document.getElementById("n-input").value, 10);
  updateVisualization(initialN);
};
</script>
