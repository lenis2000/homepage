---
title: 3D Height Function of Domino tilings of the Aztec diamond
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-30-aztec-uniform-3d.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-30-aztec-uniform-3d.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  /* Ensure the SVG scales fully on wide screens and remains responsive on mobile */
  #aztec-svg, #aztec-3d-canvas {
    width: 100%;
    height: 80vh; /* Use 80% of viewport height on large screens */
    vertical-align: top; /* Align media to the top */
  }
  @media (max-width: 576px) {
    #aztec-svg, #aztec-3d-canvas {
      height: 60vh; /* Reduce height on smaller devices */
      vertical-align: top; /* Maintain top alignment on mobile */
    }
  }

  /* Toggle button styles */
  .view-toggle {
    display: inline-block;
    padding: 8px 16px;
    margin-right: 10px;
    background-color: #f0f0f0;
    border: 1px solid #ccc;
    cursor: pointer;
    border-radius: 4px;
  }

  .view-toggle.active {
    background-color: #007bff;
    color: white;
    border-color: #0056b3;
  }
</style>

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="{{site.url}}/js/three.min.js"></script>
<script src="{{site.url}}/js/OrbitControls.js"></script>
<script src="/js/2025-03-30-aztec-uniform-3d.js"></script>

This simulation demonstrates random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>, which is a diamond-shaped union of unit squares. The simulation uses a uniform measure to generate random tilings via the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>; this version is adapted for <code>JS</code> + <code>WebAssembly</code>. Visualization is done using <code>D3.js</code> for 2D and <code>Three.js</code> for the 3D height function.

The sampler works in your browser. Up to $n \sim 120$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=300$ to avoid freezing your browser.

<!-- View toggle buttons -->
<div style="margin-bottom: 10px;">
  <span id="toggle-2d" class="view-toggle">2D Tiling</span>
  <span id="toggle-3d" class="view-toggle active">3D Height Function</span>
</div>

<!-- Controls to change n -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 300$): </label>
  <!-- Updated input: starting value 10, even numbers only (step=2), three-digit window (size=3), maximum 300 -->
  <input id="n-input" type="number" value="50" min="2" step="2" max="300" size="3">
  <button id="update-btn">Update</button>
</div>

<!-- Progress indicator (polling progress from the C++ code via getProgress) -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<div class="row">
  <div class="col-12">
    <!-- The SVG for 2D view -->
    <svg id="aztec-svg"></svg>
    <!-- The canvas for 3D view (initially hidden) -->
    <div id="aztec-3d-canvas" style="display: none;"></div>
  </div>
</div>

<script>
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions asynchronously.
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const svg = d3.select("#aztec-svg");
  const canvas3d = document.getElementById("aztec-3d-canvas");
  const progressElem = document.getElementById("progress-indicator");
  let progressInterval;

  // Three.js variables
  let scene, camera, renderer, controls;
  let heightMesh, heightGeometry;
  let dominoData = null;

  // Initialize Three.js scene
  function initThreeJS() {
    // Clean up previous renderer if it exists
    if (renderer) {
      canvas3d.removeChild(renderer.domElement);
      renderer.dispose();
    }

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    const aspect = canvas3d.clientWidth / canvas3d.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, -30, 30);
    camera.up.set(0, 0, 1); // Set z-up orientation
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvas3d.clientWidth, canvas3d.clientHeight);
    canvas3d.appendChild(renderer.domElement);

    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Start animation loop
    animate();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    if (renderer) {
      const aspect = canvas3d.clientWidth / canvas3d.clientHeight;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas3d.clientWidth, canvas3d.clientHeight);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // Calculate the height function from domino tiling
  function calculateHeightFunction(dominoes, gridSize) {
    // Initialize height grid (2 cells larger in each direction to account for boundaries)
    const n = gridSize + 4;
    const heights = Array(n).fill().map(() => Array(n).fill(0));

    // Set boundary conditions (alternating heights around the boundary)
    for (let i = 0; i < n; i++) {
      heights[0][i] = i % 2;
      heights[n-1][i] = (n-1+i) % 2;
      heights[i][0] = i % 2;
      heights[i][n-1] = (n-1+i) % 2;
    }

    // Offset coordinates to account for the boundary
    const offset = 2;

    // Process each domino
    dominoes.forEach(domino => {
      const x = domino.x + offset;
      const y = domino.y + offset;
      const w = domino.w;
      const h = domino.h;

      // For horizontal dominoes (w=2, h=1)
      if (w === 2 && h === 1) {
        heights[y][x+1] = heights[y][x] + 1;
        heights[y+1][x+1] = heights[y+1][x] - 1;
      }
      // For vertical dominoes (w=1, h=2)
      else if (w === 1 && h === 2) {
        heights[y+1][x] = heights[y][x] - 1;
        heights[y+1][x+1] = heights[y][x+1] + 1;
      }
    });

    // Propagate heights through the grid
    for (let i = 1; i < n-1; i++) {
      for (let j = 1; j < n-1; j++) {
        if (heights[i][j] === 0) {
          // Take average of neighbors and ensure consistency
          const neighbors = [
            heights[i-1][j],
            heights[i+1][j],
            heights[i][j-1],
            heights[i][j+1]
          ].filter(h => h !== 0);

          if (neighbors.length > 0) {
            heights[i][j] = Math.round(neighbors.reduce((a, b) => a + b, 0) / neighbors.length);
          }
        }
      }
    }

    return heights;
  }

  // Create 3D visualization of the height function
  // Modified function to create the 3D height function with slanted dominoes
  function createHeightFunctionMesh(heights, dominoes) {
    if (heightMesh) {
      scene.remove(heightMesh);
      if (heightGeometry) heightGeometry.dispose();
    }

    // Clear any previous meshes in the scene
    while(scene.children.length > 0) {
      const object = scene.children[0];
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
      scene.remove(object);
    }

    const n = heights.length;
    const centerOffset = Math.floor((n-1) / 2);

    // Create a group to hold all domino meshes
    const dominoGroup = new THREE.Group();

    // Create materials for each domino color
    const materials = {
      horizontal: {
        yellow: new THREE.MeshLambertMaterial({ color: 0xffff00, side: THREE.DoubleSide }),
        red: new THREE.MeshLambertMaterial({ color: 0xff0000, side: THREE.DoubleSide })
      },
      vertical: {
        green: new THREE.MeshLambertMaterial({ color: 0x00ff00, side: THREE.DoubleSide }),
        blue: new THREE.MeshLambertMaterial({ color: 0x0000ff, side: THREE.DoubleSide })
      }
    };

    // Process each domino
    dominoes.forEach(domino => {
      // Convert domino coordinates to scene coordinates (centered)
      const x = domino.x - centerOffset;
      const y = domino.y - centerOffset;
      const w = domino.w;
      const h = domino.h;

      // Safely get height values at the corners of the domino with bounds checking
      // Add offset of 2 to get correct index in heights array
      const safeGetHeight = (row, col) => {
        // Ensure coordinates are within bounds
        const safeRow = Math.max(0, Math.min(n-1, row + 2));
        const safeCol = Math.max(0, Math.min(n-1, col + 2));

        if (!heights[safeRow] || heights[safeRow][safeCol] === undefined) {
          console.warn(`Invalid height access at [${safeRow}][${safeCol}]`);
          return 0; // Default height
        }

        return heights[safeRow][safeCol];
      };

      // Get height values with safety checks
      const h00 = safeGetHeight(domino.y, domino.x);
      const h10 = safeGetHeight(domino.y, domino.x + w);
      const h01 = safeGetHeight(domino.y + h, domino.x);
      const h11 = safeGetHeight(domino.y + h, domino.x + w);

      // Create geometry for the domino
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      const indices = [];

      // Define the vertices for the domino (adjusted for height function)
      vertices.push(
        x, y, h00 * 0.5,           // 0: bottom-left
        x + w, y, h10 * 0.5,       // 1: bottom-right
        x, y + h, h01 * 0.5,       // 2: top-left
        x + w, y + h, h11 * 0.5    // 3: top-right
      );

      // Create triangles (two per domino)
      indices.push(0, 1, 2, 1, 3, 2);

      // Set geometry attributes
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      // Determine material based on domino type and color
      let material;
      if (w === 2 && h === 1) {
        // Horizontal domino
        material = domino.color.includes('yellow') ? materials.horizontal.yellow : materials.horizontal.red;
      } else {
        // Vertical domino
        material = domino.color.includes('green') ? materials.vertical.green : materials.vertical.blue;
      }

      // Create mesh and add to group
      const mesh = new THREE.Mesh(geometry, material);
      dominoGroup.add(mesh);
    });

    // Add the domino group to the scene
    scene.add(dominoGroup);

    // Add a wireframe grid for reference
    const gridHelper = new THREE.GridHelper(n, n);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Adjust camera to view the entire model
    const box = new THREE.Box3().setFromObject(dominoGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2));

    camera.position.set(center.x, center.y - cameraDistance, center.z + cameraDistance/2);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
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

  // Update the visualization for a given n.
  // Update the visualization for a given n.
  async function updateVisualization(n) {
    // Clear any previous simulation.
    svg.selectAll("g").remove();
    // Start the progress indicator.
    startProgressPolling();

    // Await the asynchronous simulation.
    const ptr = await simulateAztec(n);
    const jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);

    let dominoes;
    try {
      dominoes = JSON.parse(jsonStr);
      dominoData = dominoes; // Store for later use
    } catch (e) {
      console.error("Error parsing JSON:", e, jsonStr);
      progressElem.innerText = "Error during sampling";
      clearInterval(progressInterval);
      return;
    }

    // Update 2D visualization
    updateDominoVisualization(dominoes);

    // Update 3D visualization
    const heights = calculateHeightFunction(dominoes, n);
    createHeightFunctionMesh(heights, dominoes); // Pass dominoes instead of n

    // Clear progress indicator once done.
    progressElem.innerText = "";
  }

  // Update 2D domino visualization
  function updateDominoVisualization(dominoes) {
    // Compute bounding box of dominoes.
    const minX = d3.min(dominoes, d => d.x);
    const minY = d3.min(dominoes, d => d.y);
    const maxX = d3.max(dominoes, d => d.x + d.w);
    const maxY = d3.max(dominoes, d => d.y + d.h);
    const widthDominoes = maxX - minX;
    const heightDominoes = maxY - minY;

    // Use the computed dimensions of the SVG (which now scales with the container).
    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scale = Math.min(svgWidth / widthDominoes, svgHeight / heightDominoes) * 0.9;
    const translateX = (svgWidth - widthDominoes * scale) / 2 - minX * scale;
    const translateY = (svgHeight - heightDominoes * scale) / 2 - minY * scale;

    // Append a group for the dominoes.
    const group = svg.append("g")
                     .attr("transform", "translate(" + translateX + "," + translateY + ") scale(" + scale + ")");

    // Render each domino piece.
    group.selectAll("rect")
         .data(dominoes)
         .enter()
         .append("rect")
         .attr("x", d => d.x)
         .attr("y", d => d.y)
         .attr("width", d => d.w)
         .attr("height", d => d.h)
         .attr("fill", d => d.color)
         .attr("stroke", "#000")
         .attr("stroke-width", 0.5);
  }

  // Initialize 3D view
  initThreeJS();

  // Toggle between 2D and 3D views
  document.getElementById("toggle-2d").addEventListener("click", function() {
    document.getElementById("toggle-2d").classList.add("active");
    document.getElementById("toggle-3d").classList.remove("active");
    document.getElementById("aztec-svg").style.display = "block";
    document.getElementById("aztec-3d-canvas").style.display = "none";
  });

  document.getElementById("toggle-3d").addEventListener("click", function() {
    document.getElementById("toggle-3d").classList.add("active");
    document.getElementById("toggle-2d").classList.remove("active");
    document.getElementById("aztec-svg").style.display = "none";
    document.getElementById("aztec-3d-canvas").style.display = "block";
    // Trigger resize event to ensure Three.js canvas resizes properly
    window.dispatchEvent(new Event('resize'));
  });

  // Show 3D view by default
  document.getElementById("toggle-3d").click();

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

  // Run an initial simulation.
  const initialN = parseInt(document.getElementById("n-input").value, 10);
  updateVisualization(initialN);
};
</script>
