---
title: '[testing] 3D Height Function Visualization of Domino Tilings of the Aztec Diamond'
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-31-aztec-uniform-3d.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-31-aztec-uniform-3d.cpp'
    txt: 'C++ code for the simulation'
published: true
---

<style>
  /* Ensure the canvas scales fully on wide screens and remains responsive on mobile */
  #aztec-canvas {
    width: 100%;
    height: 80vh; /* Use 80% of viewport height on large screens */
    vertical-align: top; /* Align media to the top */
  }
  @media (max-width: 576px) {
    #aztec-canvas {
      height: 60vh; /* Reduce height on smaller devices */
      vertical-align: top; /* Maintain top alignment on mobile */
    }
  }
</style>

<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>
<script src="/js/2025-03-31-aztec-uniform-3d.js"></script>

This simulation demonstrates random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>, which is a diamond-shaped union of unit squares. The simulation uses a uniform measure to generate random tilings via the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>; this version is adapted for <code>JS</code> + <code>WebAssembly</code>.

This visualization shows a 3D representation of the height function of the tiling. The height function assigns a height value to each vertex of the grid, creating a 3D surface. The implementation uses a simplified fixed height pattern where each domino type (blue, green, red, yellow) contributes a specific height pattern to its vertices. This approach creates visually distinct structures for each domino type. You can rotate, zoom, and pan the view using your mouse.

The sampler works in your browser. Up to $n \sim 50$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=120$ to avoid freezing your browser.

<!-- Controls to change n -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 120$): </label>
  <!-- Updated input: starting value 4, even numbers only (step=2), three-digit window (size=3), maximum 120 -->
  <input id="n-input" type="number" value="4" min="2" step="2" max="120" size="3">

  <button id="update-btn">Update</button>
</div>

<!-- Height Function Controls -->
<div style="margin-bottom: 10px; border: 1px solid #ccc; padding: 10px; background-color: #f8f8f8;">
  <h4 style="margin-top: 0;">Height Offset Controls</h4>

  <div style="display: flex; flex-wrap: wrap; gap: 20px;">
    <!-- Blue Domino Height Controls -->
    <div style="flex: 1; min-width: 250px;">
      <h5 style="color: #4363d8;">Blue Horizontal Domino</h5>
      <div style="display: flex; flex-wrap: wrap; gap: 5px;">
        <div style="width: 120px;">
          <label for="blue-v1">Top-Left:</label>
          <input id="blue-v1" type="number" value="-1" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="blue-v2">Top-Right:</label>
          <input id="blue-v2" type="number" value="-1" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="blue-v3">Bottom-Right:</label>
          <input id="blue-v3" type="number" value="-2" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="blue-v4">Bottom-Left:</label>
          <input id="blue-v4" type="number" value="-2" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="blue-vm1">Middle-Top:</label>
          <input id="blue-vm1" type="number" value="0" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="blue-vm2">Middle-Bottom:</label>
          <input id="blue-vm2" type="number" value="-3" step="0.5" style="width: 60px;">
        </div>
      </div>
    </div>

    <!-- Green Domino Height Controls -->
    <div style="flex: 1; min-width: 250px;">
      <h5 style="color: #3cb44b;">Green Horizontal Domino</h5>
      <div style="display: flex; flex-wrap: wrap; gap: 5px;">
        <div style="width: 120px;">
          <label for="green-v1">Top-Left:</label>
          <input id="green-v1" type="number" value="1" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="green-v2">Top-Right:</label>
          <input id="green-v2" type="number" value="1" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="green-v3">Bottom-Right:</label>
          <input id="green-v3" type="number" value="2" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="green-v4">Bottom-Left:</label>
          <input id="green-v4" type="number" value="2" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="green-vm1">Middle-Top:</label>
          <input id="green-vm1" type="number" value="0" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="green-vm2">Middle-Bottom:</label>
          <input id="green-vm2" type="number" value="3" step="0.5" style="width: 60px;">
        </div>
      </div>
    </div>

    <!-- Red Domino Height Controls -->
    <div style="flex: 1; min-width: 250px;">
      <h5 style="color: #e6194b;">Red Vertical Domino</h5>
      <div style="display: flex; flex-wrap: wrap; gap: 5px;">
        <div style="width: 120px;">
          <label for="red-v1">Top-Left:</label>
          <input id="red-v1" type="number" value="2" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="red-v2">Bottom-Left:</label>
          <input id="red-v2" type="number" value="2" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="red-v3">Bottom-Right:</label>
          <input id="red-v3" type="number" value="1" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="red-v4">Top-Right:</label>
          <input id="red-v4" type="number" value="1" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="red-vm1">Middle-Left:</label>
          <input id="red-vm1" type="number" value="3" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="red-vm2">Middle-Right:</label>
          <input id="red-vm2" type="number" value="0" step="0.5" style="width: 60px;">
        </div>
      </div>
    </div>

    <!-- Yellow Domino Height Controls -->
    <div style="flex: 1; min-width: 250px;">
      <h5 style="color: #ffe119;">Yellow Vertical Domino</h5>
      <div style="display: flex; flex-wrap: wrap; gap: 5px;">
        <div style="width: 120px;">
          <label for="yellow-v1">Top-Left:</label>
          <input id="yellow-v1" type="number" value="-2" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="yellow-v2">Bottom-Left:</label>
          <input id="yellow-v2" type="number" value="-2" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="yellow-v3">Bottom-Right:</label>
          <input id="yellow-v3" type="number" value="-1" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="yellow-v4">Top-Right:</label>
          <input id="yellow-v4" type="number" value="-1" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="yellow-vm1">Middle-Left:</label>
          <input id="yellow-vm1" type="number" value="-3" step="0.5" style="width: 60px;">
        </div>
        <div style="width: 120px;">
          <label for="yellow-vm2">Middle-Right:</label>
          <input id="yellow-vm2" type="number" value="0" step="0.5" style="width: 60px;">
        </div>
      </div>
    </div>
  </div>

  <div style="margin-top: 10px;">
    <button id="apply-heights-btn">Apply Height Changes</button>
    <button id="reset-heights-btn">Reset to Defaults</button>
  </div>
</div>

<!-- Progress indicator (polling progress from the C++ code via getProgress) -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<div class="row">
  <div class="col-12">
    <!-- The canvas container for Three.js rendering -->
    <div id="aztec-canvas"></div>
  </div>
</div>

<script>
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions asynchronously.
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  // Height offsets for each domino type
  let heightOffsets = {
    blue: {
      v1: -1, v2: -1, v3: -2, v4: -2, vm1: 0, vm2: -3
    },
    green: {
      v1: 1, v2: 1, v3: 2, v4: 2, vm1: 0, vm2: 3
    },
    red: {
      v1: 2, v2: 2, v3: 1, v4: 1, vm1: 3, vm2: 0
    },
    yellow: {
      v1: -2, v2: -2, v3: -1, v4: -1, vm1: -3, vm2: 0
    }
  };

  const progressElem = document.getElementById("progress-indicator");
  let progressInterval;

  // Three.js variables
  let scene, camera, renderer, controls;
  let dominoGroup; // Group to hold all domino meshes

  // Initialize Three.js scene
  function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Get canvas container and its dimensions
    const container = document.getElementById('aztec-canvas');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Create camera (orthographic for isometric-like view)
    const frustumSize = 100;
    const aspect = width / height;
    camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      1000
    );
    camera.position.set(0, 100, 0); // Position directly above (vertical view)
    camera.lookAt(0, 0, 0);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Add orbit controls for user interaction
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = true;

    // Create a group for all domino meshes
    dominoGroup = new THREE.Group();
    scene.add(dominoGroup);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
  }

  // Window resize handler
  function onWindowResize() {
    const container = document.getElementById('aztec-canvas');
    const width = container.clientWidth;
    const height = container.clientHeight;

    const aspect = width / height;
    const frustumSize = 100;

    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  // Initialize Three.js on page load
  initThreeJS();

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
  async function updateVisualization(n) {
    // Clear any previous simulation.
    while (dominoGroup.children.length > 0) {
      const mesh = dominoGroup.children[0];
      dominoGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }

    // Start the progress indicator.
    startProgressPolling();

    // Set a timeout to handle potential freezes
    const timeoutMs = 60000; // 60 seconds timeout
    let timeoutId;

    try {
      // Create a timeout promise that rejects after timeoutMs
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Simulation timed out"));
        }, timeoutMs);
      });

      // Race the simulation against the timeout
      const ptrPromise = simulateAztec(n);
      let ptr;
      try {
        ptr = await Promise.race([ptrPromise, timeout]);
      } catch (error) {
        throw new Error(`WebAssembly error: n=${n} is too large. Try a smaller value.`);
      }

      // Clear the timeout since we didn't hit it
      clearTimeout(timeoutId);

      // Check if ptr is valid
      if (!ptr) {
        throw new Error(`Invalid memory pointer returned. Try a smaller value of n.`);
      }

      // Get string from memory
      let jsonStr;
      try {
        jsonStr = Module.UTF8ToString(ptr);
        freeString(ptr);
      } catch (error) {
        throw new Error(`Memory access error: ${error.message}. Try a smaller value of n.`);
      }

      let dominoFaces;
      try {
        dominoFaces = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Error parsing JSON:", e, jsonStr);
        progressElem.innerText = "Error parsing simulation results";
        clearInterval(progressInterval);
        return;
      }

      // Check if the response contains an error message
      if (dominoFaces.error) {
        throw new Error(`Simulation error: ${dominoFaces.error}`);
      }

      // Validate the data structure
      if (!Array.isArray(dominoFaces) || dominoFaces.length === 0) {
        throw new Error("Invalid simulation data: empty or not an array");
      }

      // Determine the scale based on the size of the diamond
      const scale = 60 / (2 * n); // Scale to fit nicely within the camera view

      // Create face colors
      const colors = {
        "blue": 0x4363d8,
        "green": 0x3cb44b,
        "red": 0xe6194b,
        "yellow": 0xffe119
      };

      // Create meshes for each domino face
      let facesProcessed = 0;
      const totalFaces = dominoFaces.length;
      const batchSize = 500; // Process faces in batches to avoid UI freezing

      function processBatch(startIdx) {
        const endIdx = Math.min(startIdx + batchSize, totalFaces);

        for (let i = startIdx; i < endIdx; i++) {
          const face = dominoFaces[i];

          // Skip faces with missing or invalid data
          if (!face || !face.color || !Array.isArray(face.vertices) || face.vertices.length !== 4) {
            console.warn("Skipping invalid face at index", i);
            continue;
          }

          try {
            const geometry = new THREE.BufferGeometry();

            // Extract vertices and color
            const origVertices = face.vertices;
            const color = face.color;

            // We need to create a new geometry with 6 vertices instead of 4
            // We'll use the 4 corners plus 2 middle points

            // Determine if horizontal or vertical domino
            const isHorizontal = (color === "blue" || color === "green");

            // First process the four corner vertices with our custom heights
            const cornerPositions = [];
            const corners = [];

            for (let i = 0; i < origVertices.length; i++) {
              const vertex = [...origVertices[i]]; // Clone to avoid modifying original

              // Get the correct height based on vertex position and color
              let heightOffset = 0;
              if (color === "blue") {
                switch(i) {
                  case 0: heightOffset = heightOffsets.blue.v1; break; // Top-Left
                  case 1: heightOffset = heightOffsets.blue.v2; break; // Top-Right
                  case 2: heightOffset = heightOffsets.blue.v3; break; // Bottom-Right
                  case 3: heightOffset = heightOffsets.blue.v4; break; // Bottom-Left
                }
              } else if (color === "green") {
                switch(i) {
                  case 0: heightOffset = heightOffsets.green.v1; break; // Top-Left
                  case 1: heightOffset = heightOffsets.green.v2; break; // Top-Right
                  case 2: heightOffset = heightOffsets.green.v3; break; // Bottom-Right
                  case 3: heightOffset = heightOffsets.green.v4; break; // Bottom-Left
                }
              } else if (color === "red") {
                switch(i) {
                  case 0: heightOffset = heightOffsets.red.v1; break; // Top-Left
                  case 1: heightOffset = heightOffsets.red.v2; break; // Bottom-Left
                  case 2: heightOffset = heightOffsets.red.v3; break; // Bottom-Right
                  case 3: heightOffset = heightOffsets.red.v4; break; // Top-Right
                }
              } else if (color === "yellow") {
                switch(i) {
                  case 0: heightOffset = heightOffsets.yellow.v1; break; // Top-Left
                  case 1: heightOffset = heightOffsets.yellow.v2; break; // Bottom-Left
                  case 2: heightOffset = heightOffsets.yellow.v3; break; // Bottom-Right
                  case 3: heightOffset = heightOffsets.yellow.v4; break; // Top-Right
                }
              }

              // Set the height
              vertex[2] = heightOffset;
              corners.push(vertex);

              // Store position
              cornerPositions.push(vertex[0] * scale, vertex[2] * scale, vertex[1] * scale);
            }

            // Now create the middle vertices
            let middleVertex1, middleVertex2;
            let vm1Height, vm2Height;

            if (isHorizontal) {
              // For horizontal dominoes (blue/green)
              // Middle-top is between vertices 0 and 1
              middleVertex1 = [
                (corners[0][0] + corners[1][0]) / 2, // x is average
                corners[0][1], // y is same as top
                0 // height is set below
              ];

              // Middle-bottom is between vertices 3 and 2
              middleVertex2 = [
                (corners[3][0] + corners[2][0]) / 2, // x is average
                corners[3][1], // y is same as bottom
                0 // height is set below
              ];

              // Set heights
              if (color === "blue") {
                vm1Height = heightOffsets.blue.vm1; // Middle-top
                vm2Height = heightOffsets.blue.vm2; // Middle-bottom
              } else { // green
                vm1Height = heightOffsets.green.vm1; // Middle-top
                vm2Height = heightOffsets.green.vm2; // Middle-bottom
              }
            } else {
              // For vertical dominoes (red/yellow)
              // Middle-left is between vertices 0 and 1
              middleVertex1 = [
                corners[0][0], // x is same as left
                (corners[0][1] + corners[1][1]) / 2, // y is average
                0 // height is set below
              ];

              // Middle-right is between vertices 3 and 2
              middleVertex2 = [
                corners[3][0], // x is same as right
                (corners[3][1] + corners[2][1]) / 2, // y is average
                0 // height is set below
              ];

              // Set heights
              if (color === "red") {
                vm1Height = heightOffsets.red.vm1; // Middle-left
                vm2Height = heightOffsets.red.vm2; // Middle-right
              } else { // yellow
                vm1Height = heightOffsets.yellow.vm1; // Middle-left
                vm2Height = heightOffsets.yellow.vm2; // Middle-right
              }
            }

            // Apply heights
            middleVertex1[2] = vm1Height;
            middleVertex2[2] = vm2Height;

            // Start with the 4 corners
            const positions = [...cornerPositions];

            // Add the 2 middle positions
            positions.push(
              middleVertex1[0] * scale, middleVertex1[2] * scale, middleVertex1[1] * scale,
              middleVertex2[0] * scale, middleVertex2[2] * scale, middleVertex2[1] * scale
            );

            // Set position attribute
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

// Create triangulation using the middle vertices
// We have 6 vertices: 0,1,2,3 = corners, 4,5 = middle vertices

// Create triangulation using the 6 vertices
// 0,1,2,3 = corners (0=topleft, 1=topright, 2=bottomright, 3=bottomleft)
// 4,5 = middle vertices (for horizontal: 4=topmiddle, 5=bottommiddle)
//                       (for vertical: 4=leftmiddle, 5=rightmiddle)

if (isHorizontal) {
  // For horizontal dominoes (blue/green):
  geometry.setIndex([
    // Main rectangle (2 triangles)
    0, 1, 3, // Triangle 1: topleft-topright-bottomleft
    3, 2, 1, // Triangle 2: bottomleft-bottomright-topright

    // Additional triangles with middle vertices
    0, 1, 4, // Triangle 3: topleft-topright-topmiddle
    3, 2, 5  // Triangle 4: bottomleft-bottomright-bottommiddle
  ]);
} else {
  // For vertical dominoes (red/yellow):
  geometry.setIndex([
    // Main rectangle (2 triangles)
    0, 1, 3, // Triangle 1: topleft-topright-bottomleft
    3, 2, 1, // Triangle 2: bottomleft-bottomright-topright

    // Additional triangles with middle vertices
    0, 1, 4, // Triangle 3: topleft-bottomleft-leftmiddle
    3, 2, 5  // Triangle 4: topright-bottomright-rightmiddle
  ]);
}

            // Calculate face normal
            geometry.computeVertexNormals();

            // Create material with the specified color
            const material = new THREE.MeshStandardMaterial({
              color: colors[face.color] || 0x808080,
              side: THREE.DoubleSide,
              flatShading: true
            });

            // Create mesh and add it to the group
            const mesh = new THREE.Mesh(geometry, material);
            dominoGroup.add(mesh);
          } catch (error) {
            console.error("Error processing face at index", i, error);
          }
        }

        facesProcessed = endIdx;

        // Update progress based on face processing
        if (facesProcessed < totalFaces) {
          progressElem.innerText = `Rendering... (${Math.floor((facesProcessed / totalFaces) * 100)}%)`;
          requestAnimationFrame(() => processBatch(endIdx));
        } else {
          // All faces processed
          finishVisualization();
        }
      }

      // Start processing faces in batches
      progressElem.innerText = "Rendering... (0%)";
      processBatch(0);

      function finishVisualization() {
        // Center the domino group
        dominoGroup.position.set(0, 0, 0);

        // Only adjust camera if we're not preserving position (initial load or regular update)
        if (!window.preserveCameraPosition) {
          camera.position.set(0, n * scale * 2, 0); // Position directly above, higher for larger diamonds
          camera.lookAt(0, 0, 0);
        }

        controls.update();

        // Clear progress indicator once done.
        progressElem.innerText = "";
        clearInterval(progressInterval);
      }
    } catch (error) {
      console.error("Simulation error:", error);
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      progressElem.innerText = `Error: ${error.message}. Try a smaller value of n.`;

      // Create a basic placeholder visualization
      const geometry = new THREE.BoxGeometry(10, 1, 10);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
      const errorMesh = new THREE.Mesh(geometry, material);
      dominoGroup.add(errorMesh);
    }
  }

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
    if (n > 120) {
      alert("Please enter a number no greater than 120.");
      return;
    }

    // Read current height values from input fields
    readHeightValues();

    // Update with current settings
    updateVisualization(n);
  });

  // Function to read height values from input fields
  function readHeightValues() {
    // Blue domino heights
    heightOffsets.blue.v1 = parseFloat(document.getElementById("blue-v1").value);
    heightOffsets.blue.v2 = parseFloat(document.getElementById("blue-v2").value);
    heightOffsets.blue.v3 = parseFloat(document.getElementById("blue-v3").value);
    heightOffsets.blue.v4 = parseFloat(document.getElementById("blue-v4").value);
    heightOffsets.blue.vm1 = parseFloat(document.getElementById("blue-vm1").value);
    heightOffsets.blue.vm2 = parseFloat(document.getElementById("blue-vm2").value);

    // Green domino heights
    heightOffsets.green.v1 = parseFloat(document.getElementById("green-v1").value);
    heightOffsets.green.v2 = parseFloat(document.getElementById("green-v2").value);
    heightOffsets.green.v3 = parseFloat(document.getElementById("green-v3").value);
    heightOffsets.green.v4 = parseFloat(document.getElementById("green-v4").value);
    heightOffsets.green.vm1 = parseFloat(document.getElementById("green-vm1").value);
    heightOffsets.green.vm2 = parseFloat(document.getElementById("green-vm2").value);

    // Red domino heights
    heightOffsets.red.v1 = parseFloat(document.getElementById("red-v1").value);
    heightOffsets.red.v2 = parseFloat(document.getElementById("red-v2").value);
    heightOffsets.red.v3 = parseFloat(document.getElementById("red-v3").value);
    heightOffsets.red.v4 = parseFloat(document.getElementById("red-v4").value);
    heightOffsets.red.vm1 = parseFloat(document.getElementById("red-vm1").value);
    heightOffsets.red.vm2 = parseFloat(document.getElementById("red-vm2").value);

    // Yellow domino heights
    heightOffsets.yellow.v1 = parseFloat(document.getElementById("yellow-v1").value);
    heightOffsets.yellow.v2 = parseFloat(document.getElementById("yellow-v2").value);
    heightOffsets.yellow.v3 = parseFloat(document.getElementById("yellow-v3").value);
    heightOffsets.yellow.v4 = parseFloat(document.getElementById("yellow-v4").value);
    heightOffsets.yellow.vm1 = parseFloat(document.getElementById("yellow-vm1").value);
    heightOffsets.yellow.vm2 = parseFloat(document.getElementById("yellow-vm2").value);

    console.log("Updated height offsets:", heightOffsets);
  }

  // Function to reset height values to defaults
  function resetHeightValues() {
    // Blue domino heights
    document.getElementById("blue-v1").value = -1;
    document.getElementById("blue-v2").value = -1;
    document.getElementById("blue-v3").value = -2;
    document.getElementById("blue-v4").value = -2;
    document.getElementById("blue-vm1").value = 0;
    document.getElementById("blue-vm2").value = -3;

    // Green domino heights
    document.getElementById("green-v1").value = 1;
    document.getElementById("green-v2").value = 1;
    document.getElementById("green-v3").value = 2;
    document.getElementById("green-v4").value = 2;
    document.getElementById("green-vm1").value = 0;
    document.getElementById("green-vm2").value = 3;

    // Red domino heights
    document.getElementById("red-v1").value = 2;
    document.getElementById("red-v2").value = 2;
    document.getElementById("red-v3").value = 1;
    document.getElementById("red-v4").value = 1;
    document.getElementById("red-vm1").value = 3;
    document.getElementById("red-vm2").value = 0;

    // Yellow domino heights
    document.getElementById("yellow-v1").value = -2;
    document.getElementById("yellow-v2").value = -2;
    document.getElementById("yellow-v3").value = -1;
    document.getElementById("yellow-v4").value = -1;
    document.getElementById("yellow-vm1").value = -3;
    document.getElementById("yellow-vm2").value = 0;

    // Apply the reset values
    readHeightValues();
  }

  // Update heights only without re-running the simulation
  function updateHeightsOnly() {
    // Read height values from input fields
    readHeightValues();

    // Update existing meshes with new height values
    for (let i = 0; i < dominoGroup.children.length; i++) {
      const mesh = dominoGroup.children[i];

      // Skip non-mesh objects
      if (!(mesh instanceof THREE.Mesh)) continue;

      // Get material to determine domino color
      let colorName = "unknown";
      if (mesh.material.color.getHex() === 0x4363d8) colorName = "blue";
      else if (mesh.material.color.getHex() === 0x3cb44b) colorName = "green";
      else if (mesh.material.color.getHex() === 0xe6194b) colorName = "red";
      else if (mesh.material.color.getHex() === 0xffe119) colorName = "yellow";

      // Skip unknown colors
      if (colorName === "unknown") continue;

      // Determine if horizontal or vertical domino
      const isHorizontal = (colorName === "blue" || colorName === "green");

      // Get the current vertices positions
      const positionAttribute = mesh.geometry.getAttribute('position');

      // The position attribute is a flat array: [x0,y0,z0, x1,y1,z1, ...]
      // Our geometry has 6 vertices (4 corners + 2 middle vertices)
      const currentN = parseInt(document.getElementById("n-input").value, 10);
      const scale = 60 / (2 * currentN);

      // Handle the 4 corner vertices (indices 0-3)
      for (let j = 0; j < 4; j++) {
        let heightValue = 0;

        if (colorName === "blue") {
          switch(j) {
            case 0: heightValue = heightOffsets.blue.v1; break; // Top-Left
            case 1: heightValue = heightOffsets.blue.v2; break; // Top-Right
            case 2: heightValue = heightOffsets.blue.v3; break; // Bottom-Right
            case 3: heightValue = heightOffsets.blue.v4; break; // Bottom-Left
          }
        } else if (colorName === "green") {
          switch(j) {
            case 0: heightValue = heightOffsets.green.v1; break; // Top-Left
            case 1: heightValue = heightOffsets.green.v2; break; // Top-Right
            case 2: heightValue = heightOffsets.green.v3; break; // Bottom-Right
            case 3: heightValue = heightOffsets.green.v4; break; // Bottom-Left
          }
        } else if (colorName === "red") {
          switch(j) {
            case 0: heightValue = heightOffsets.red.v1; break; // Top-Left
            case 1: heightValue = heightOffsets.red.v2; break; // Bottom-Left
            case 2: heightValue = heightOffsets.red.v3; break; // Bottom-Right
            case 3: heightValue = heightOffsets.red.v4; break; // Top-Right
          }
        } else if (colorName === "yellow") {
          switch(j) {
            case 0: heightValue = heightOffsets.yellow.v1; break; // Top-Left
            case 1: heightValue = heightOffsets.yellow.v2; break; // Bottom-Left
            case 2: heightValue = heightOffsets.yellow.v3; break; // Bottom-Right
            case 3: heightValue = heightOffsets.yellow.v4; break; // Top-Right
          }
        }

        // Set the new height (y component in WebGL)
        positionAttribute.setY(j, heightValue * scale);
      }

      // Handle the 2 middle vertices (indices 4-5)
      if (isHorizontal) {
        // For blue and green dominoes, vertices 4-5 are middle-top and middle-bottom
        let middleTopHeight, middleBottomHeight;

        if (colorName === "blue") {
          middleTopHeight = heightOffsets.blue.vm1;
          middleBottomHeight = heightOffsets.blue.vm2;
        } else { // green
          middleTopHeight = heightOffsets.green.vm1;
          middleBottomHeight = heightOffsets.green.vm2;
        }

        // Set middle vertex heights
        positionAttribute.setY(4, middleTopHeight * scale);     // Middle-top
        positionAttribute.setY(5, middleBottomHeight * scale);  // Middle-bottom

      } else {
        // For red and yellow dominoes, vertices 4-5 are middle-left and middle-right
        let middleLeftHeight, middleRightHeight;

        if (colorName === "red") {
          middleLeftHeight = heightOffsets.red.vm1;
          middleRightHeight = heightOffsets.red.vm2;
        } else { // yellow
          middleLeftHeight = heightOffsets.yellow.vm1;
          middleRightHeight = heightOffsets.yellow.vm2;
        }

        // Set middle vertex heights
        positionAttribute.setY(4, middleLeftHeight * scale);   // Middle-left
        positionAttribute.setY(5, middleRightHeight * scale);  // Middle-right
      }

      // Mark the attribute as needing an update
      positionAttribute.needsUpdate = true;

      // Update the geometry
      mesh.geometry.computeVertexNormals();
    }

    // Force a render update
    renderer.render(scene, camera);
  }

  // Apply height changes button - only updates heights without regenerating
  document.getElementById("apply-heights-btn").addEventListener("click", () => {
    updateHeightsOnly();
  });

  // Reset heights button - resets heights and updates visualization
  document.getElementById("reset-heights-btn").addEventListener("click", () => {
    resetHeightValues();
    updateHeightsOnly();
  });

  // Initialize height values from input fields
  readHeightValues();

  // Run an initial simulation.
  const initialN = parseInt(document.getElementById("n-input").value, 10);
  updateVisualization(initialN);
};
</script>
