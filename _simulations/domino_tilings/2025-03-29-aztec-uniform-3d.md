---
title: 3D Domino Tilings of the Aztec Diamond (Height Function)
model: domino-tilings
author: 'Leonid Petrov'
code:
- link:    'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-29-aztec-uniform-3d.md'
  txt: 'Interactive 3D Domino Tilings; see the source code of this page at the link'
- link:    'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-29-aztec-uniform-3d.cpp'
  txt: 'C++ code for the simulation with proper shuffling algorithm (3D version)'
published: false
---

<!-- Load Three.js and OrbitControls (adjust the paths for your setup) -->
<script src="/js/three.min.js"></script>
<script src="/js/OrbitControls.js"></script>

<!-- Load our WASM/JS that was compiled from 2025-03-29-aztec-uniform-3d.cpp -->
<script src="/js/2025-03-29-aztec-uniform-3d.js"></script>

<div style="margin-bottom: 1em;">
  <label for="n-input">Aztec order n (try a small value first):</label>
  <input id="n-input" type="number" min="1" max="50" value="3" style="width:60px;" />

  <button id="update-btn">Update Tiling</button>

  <label style="margin-left:1em;">
    <input type="checkbox" id="demo-mode" checked />
    Demo Mode (auto-rotate)
  </label>
  <button id="reset-view-btn" style="margin-left:1em;">Reset View</button>
</div>

<!-- The 3D container -->
<div id="three-canvas" style="width:100%; height:80vh; border:1px solid #ccc;"></div>

<!-- Debug output -->
<div id="debug-output" style="margin-top: 1em; padding: 10px; border: 1px solid #ccc; background-color: #f5f5f5; max-height: 150px; overflow: auto; font-family: monospace; font-size: 12px;">
Debug information will appear here...
</div>

<script>
// Debug helper function
function debug(msg) {
  const debugEl = document.getElementById("debug-output");
  if (debugEl) {
    debugEl.innerHTML += `<div>${msg}</div>`;
    debugEl.scrollTop = debugEl.scrollHeight;
  }
  console.log(msg);
}

let scene, camera, renderer, controls;
let groupDominoes = null; // a Group containing all domino meshes
let isDemoMode = true; // Default to true for first-time users
let rotateSpeed = 0.005;
let axesHelper, referenceCube;

debug("Script starting...");

// Create fallback simple scene in case WASM doesn't load
function createFallbackScene() {
  debug("Creating fallback scene");

  // Create scene, camera, renderer
  const container = document.getElementById("three-canvas");
  const w = container.clientWidth;
  const h = container.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 1000);
  camera.position.set(0, 0, 50);
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Add reference objects
  axesHelper = new THREE.AxesHelper(50);
  scene.add(axesHelper);

  const geometry = new THREE.BoxGeometry(10, 10, 10);
  const material = new THREE.MeshBasicMaterial({color: 0xff0000});
  referenceCube = new THREE.Mesh(geometry, material);
  scene.add(referenceCube);

  // Add some domino-like objects
  for (let i = 0; i < 10; i++) {
    const domGeom = new THREE.BoxGeometry(2, 1, 0.5);
    const material = new THREE.MeshBasicMaterial({
      color: ['red', 'green', 'blue', 'yellow'][i % 4],
      transparent: true,
      opacity: 0.7
    });
    const domino = new THREE.Mesh(domGeom, material);
    domino.position.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 5
    );
    scene.add(domino);
  }

  // Start animation
  animate();

  debug("Fallback scene created - you should see colored blocks");
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (isDemoMode && referenceCube) {
    referenceCube.rotation.y += 0.01;
  }

  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// Check if Three.js is loaded
if (typeof THREE === 'undefined') {
  debug("ERROR: Three.js not loaded!");
  document.getElementById("three-canvas").innerHTML =
    "<p style='color:red;padding:20px;'>ERROR: Three.js library not loaded!</p>";
} else {
  debug("Three.js loaded successfully");

  // Set timeout to create fallback scene if Module doesn't initialize
  setTimeout(function() {
    if (!scene) {
      debug("WARNING: No scene created after 3 seconds - creating fallback");
      createFallbackScene();
    }
  }, 3000);
}

// Wait for WASM module to initialize
if (typeof Module !== 'undefined') {
  debug("Module object exists, waiting for initialization...");

  Module.onRuntimeInitialized = async function() {
    debug("WASM module initialized!");

    try {
      // Wrap C++ functions
      const simulateAztec3D = Module.cwrap('simulateAztec3D', 'number', ['number'], {async:true});
      const freeString = Module.cwrap('freeString', null, ['number']);
      debug("C++ functions wrapped successfully");

      // Create scene
      const container = document.getElementById("three-canvas");
      const w = container.clientWidth;
      const h = container.clientHeight;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff);

      camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 1000);
      camera.position.set(0, 0, 50);

      renderer = new THREE.WebGLRenderer({antialias:true});
      renderer.setSize(w, h);
      container.appendChild(renderer.domElement);

      controls = new THREE.OrbitControls(camera, renderer.domElement);

      // Add reference objects
      axesHelper = new THREE.AxesHelper(30);
      scene.add(axesHelper);

      // Animation loop
      animate();

      // Update button handler
      document.getElementById("update-btn").addEventListener("click", async function() {
        try {
          debug("Update button clicked");
          const n = parseInt(document.getElementById("n-input").value, 10);

          if (isNaN(n) || n < 1) {
            debug("Invalid n value");
            alert("Please enter a valid number for n");
            return;
          }

          debug(`Generating tiling for n=${n}...`);

          // Remove existing dominoes
          if (groupDominoes) {
            scene.remove(groupDominoes);
          }

          // Show loading indicator
          const ptr = await simulateAztec3D(n);
          debug(`Got result pointer: ${ptr}`);

          if (!ptr) {
            debug("ERROR: Null pointer returned");
            return;
          }

          const jsonStr = Module.UTF8ToString(ptr);
          debug(`Received JSON (${jsonStr.length} chars)`);

          try {
            const dominoData = JSON.parse(jsonStr);
            debug(`Parsed ${dominoData.length} dominoes`);

            // Clean up memory
            freeString(ptr);

            // Create new group for dominoes
            groupDominoes = new THREE.Group();

            // Create dominoes
            dominoData.forEach(d => {
              const colorStr = d.color || "gray";
              const corners = d.corners || [];

              if (corners.length < 4) return;

              // Create geometry
              const geometry = new THREE.BufferGeometry();

              // Set up vertices for two triangles
              const positions = new Float32Array(18);

              // First triangle
              positions[0] = corners[0][0];
              positions[1] = corners[0][1];
              positions[2] = corners[0][2];
              positions[3] = corners[1][0];
              positions[4] = corners[1][1];
              positions[5] = corners[1][2];
              positions[6] = corners[2][0];
              positions[7] = corners[2][1];
              positions[8] = corners[2][2];

              // Second triangle
              positions[9] = corners[2][0];
              positions[10] = corners[2][1];
              positions[11] = corners[2][2];
              positions[12] = corners[1][0];
              positions[13] = corners[1][1];
              positions[14] = corners[1][2];
              positions[15] = corners[3][0];
              positions[16] = corners[3][1];
              positions[17] = corners[3][2];

              geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

              // Create material and mesh
              const material = new THREE.MeshBasicMaterial({
                color: colorStr,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
              });

              const mesh = new THREE.Mesh(geometry, material);

              // Add edges
              const edgesGeometry = new THREE.EdgesGeometry(geometry);
              const edgesMaterial = new THREE.LineBasicMaterial({color: 0x000000});
              const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

              // Add to group
              const dominoGroup = new THREE.Group();
              dominoGroup.add(mesh);
              dominoGroup.add(edges);
              groupDominoes.add(dominoGroup);
            });

            // Add to scene
            scene.add(groupDominoes);

            // Center camera on dominoes
            const box = new THREE.Box3().setFromObject(groupDominoes);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            debug(`Domino bounds - center: [${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)}], size: [${size.x.toFixed(1)}, ${size.y.toFixed(1)}, ${size.z.toFixed(1)}]`);

            // Set camera position
            controls.target.copy(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            camera.position.set(
              center.x,
              center.y - maxDim,
              center.z + maxDim
            );

            debug("Camera repositioned to view dominoes");

            // Hide reference objects
            axesHelper.visible = false;

          } catch (e) {
            debug(`ERROR parsing JSON: ${e.message}`);
          }
        } catch (e) {
          debug(`ERROR in update: ${e.message}`);
        }
      });

      // Demo mode toggle
      document.getElementById("demo-mode").addEventListener("change", function() {
        isDemoMode = this.checked;
        debug(`Demo mode ${isDemoMode ? 'enabled' : 'disabled'}`);
      });

      // Reset view button
      document.getElementById("reset-view-btn").addEventListener("click", function() {
        debug("Resetting view");
        axesHelper.visible = true;
        controls.reset();
        camera.position.set(0, 0, 50);
        controls.target.set(0, 0, 0);
      });

      // Initial tiling
      debug("Starting initial tiling...");
      document.getElementById("update-btn").click();

    } catch (e) {
      debug(`ERROR during initialization: ${e.message}`);
      createFallbackScene();
    }
  };
} else {
  debug("ERROR: WASM Module is not defined!");
  setTimeout(createFallbackScene, 1000);
}
</script>
