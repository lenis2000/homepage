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

This visualization shows a 3D representation of the height function of the tiling. The height function assigns an integer height to each vertex of the grid, creating a 3D surface. You can rotate, zoom, and pan the view using your mouse.

The sampler works in your browser. Up to $n \sim 50$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=120$ to avoid freezing your browser.

<!-- Controls to change n -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 120$): </label>
  <!-- Updated input: starting value 4, even numbers only (step=2), three-digit window (size=3), maximum 120 -->
  <input id="n-input" type="number" value="4" min="2" step="2" max="120" size="3">
  
  <button id="update-btn">Update</button>
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
    camera.position.set(50, 50, 50);
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
    
    // Add axes helper for orientation
    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);
    
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
            
            // Extract vertices
            const vertices = face.vertices;
            
            // Create flatten array for the position attribute
            const positions = [];
            for (const vertex of vertices) {
              if (!Array.isArray(vertex) || vertex.length !== 3) {
                throw new Error("Invalid vertex data");
              }
              positions.push(vertex[0] * scale, vertex[2] * scale, vertex[1] * scale); // Note: y and z are swapped for better 3D view
            }
            
            // Set position attribute
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            
            // Set indices for the face triangulation (assuming vertices are in counter-clockwise order)
            geometry.setIndex([0, 1, 2, 0, 2, 3]);
            
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
        
        // Adjust camera for the new model
        camera.position.set(n * scale, n * scale, n * scale);
        camera.lookAt(0, 0, 0);
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
    
    updateVisualization(n);
  });

  // Run an initial simulation.
  const initialN = parseInt(document.getElementById("n-input").value, 10);
  updateVisualization(initialN);
};
</script>
