---
title: T‑embeddings of the Aztec diamond (2‑D & 3‑D)
author: 'Leonid Petrov'
layout: default          # keeps site look identical to domino.md
permalink: /t-emb/
---

<!-- === Parameter controls shared by both panes === -->
<div id="controls" style="font-size:18px;margin-bottom:12px">
  <label>Aztec diamond n (1–200):</label>
  <input id="n-input" type="number" value="24" min="1" max="200" step="1">
  <label style="margin-left:15px">Periodic a:</label>
  <input id="a-input" type="number" value="0.6" min="0.1" max="10" step="0.1">
  <button id="update-btn">Update</button>
  <label style="margin-left:15px">
    <input id="show-origami" type="checkbox" checked>
    Show origami map
  </label>
</div>

<!-- === Camera controls === -->
<div class="camera-controls" style="margin-bottom:10px">
  <div style="margin-bottom:5px">
    <span style="margin-right:10px">Camera:</span>
    <button id="move-left-btn" class="camera-btn">←</button>
    <button id="move-up-btn" class="camera-btn">↑</button>
    <button id="move-down-btn" class="camera-btn">↓</button>
    <button id="move-right-btn" class="camera-btn">→</button>
    <span style="margin-left:10px">Zoom:</span>
    <button id="zoom-in-btn" class="camera-btn">+</button>
    <button id="zoom-out-btn" class="camera-btn">−</button>
    <button id="reset-view-btn" style="margin-left:10px">Reset View</button>
    <label style="margin-left:15px">
      <input id="demo-mode" type="checkbox"> Auto-rotate (3D)
    </label>
  </div>
</div>

<!-- === View toggle === -->
<div class="view-toggle" style="margin-bottom:10px">
  <button id="view-3d-btn" class="active">3D</button>
  <button id="view-2d-btn">2D</button>
</div>

<!-- === Two panes === -->
<div class="visualization-container">
  <!--  ❖  The panes are now *square* – size is controlled only by width,
          height is governed by aspect-ratio 1/1 so both stay identical. -->
  <svg id="t-emb-2d"
      viewBox="-1 -1 2 2"
      style="display:none;width:100%;aspect-ratio:1/1;border:1px solid #ccc;"></svg>
  <div id="t-emb-3d" style="width:100%;aspect-ratio:1/1;"></div>
</div>

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

  /* Vertex and edge styles */
  .vertex {
    fill: black;
    stroke: none;
  }

  .edge {
    stroke: black;
    fill: none;
  }

  /* Responsive design */
  /* 2 D & 3 D panes share the same square frame */
  #t-emb-2d, #t-emb-3d {
    aspect-ratio: 1 / 1;
    height: auto;            /* override any inline height       */
    max-height: 80vh;        /* optional – keeps it off the roof */
  }

  @media (max-width: 768px) {
    #t-emb-2d, #t-emb-3d {
      max-height: 65vh;
    }
  }

  @media (max-width: 600px) {
    #t-emb-2d, #t-emb-3d {
      max-height: 60vh;
    }
  }

  /* Styling for buttons and controls */
  button {
    cursor: pointer;
  }

  /* --- origami (O‑embedding) --- */
  .o-edge    { stroke:red; fill:none; }
  .o-vertex  { fill:red;   stroke:none; opacity:0.7; }

  /* --- face styling --- */
  .face     { stroke-width:0.0001px; }

  /* --- camera controls styling --- */
  .camera-btn {
    padding: 4px 8px;
    margin: 0 2px;
    border: 1px solid #ccc;
    background-color: #f8f8f8;
    border-radius: 3px;
    cursor: pointer;
  }

  .camera-btn:hover {
    background-color: #e8e8e8;
  }

  #reset-view-btn {
    padding: 4px 8px;
    border: 1px solid #ccc;
    background-color: #f0f0f0;
    border-radius: 3px;
    cursor: pointer;
  }

  #reset-view-btn:hover {
    background-color: #e0e0e0;
  }
</style>

<script src="/js/d3.v7.min.js"></script>
<script src="/js/three.min.js"></script>
<script src="/js/OrbitControls.js"></script>

<!-- WASM/JS produced from the single C++ core -->
<script src="/s/t-emb.js"></script>   <!-- same module drives BOTH views -->

<script>
/* ---------- 4.1 globals ---------- */
let cached = null;            // {n, a, data} or null
let scene, camera, renderer, controls;   // 3‑D objects
let isDemoMode = false;       // track if auto-rotation is enabled
let rotationSpeed = 0.005;    // rotation speed in radians

/* ---------- 4.2 WASM wrappers ---------- */
let doTembInitialized = false;

Module.onRuntimeInitialized = () => {
  window.doTemb = Module.cwrap('doTembJSONwithA','number',['number','number'],{async:true});
  window.freeStr = Module.cwrap('freeString',null,['number']);
  doTembInitialized = true;
  // Initial update once module is ready
  update();
};

/* --- thickness scaling for 2‑D --- */
function getThicknessScale(n){
  if (n <= 20)  return 2.0;   // +2 levels (thickest)
  if (n <= 35)  return 1.5;   // +1 level
  if (n <  75)  return 1.0;   // baseline around n≈50
  if (n < 100)  return 0.75;  // –1 level
  return 0.5;                 // –2 levels (thinnest)
}

/* ---------- 4.3 helpers ---------- */
async function fetchEmbedding(n,a){
  if (cached && cached.n===n && Math.abs(cached.a-a)<1e-12) return cached.data;
  const ptr = await doTemb(n,a);
  const json = Module.UTF8ToString(ptr);
  freeStr(ptr);
  cached = {n,a,data:JSON.parse(json)};
  return cached.data;
}

/* ---------- 4.4 2‑D drawing ---------- */
function draw2D(data){
  // Store current transform if it exists before removing content
  let currentTransform = null;
  const existingG = d3.select("#t-emb-2d g");
  if (!existingG.empty()) {
    const transform = existingG.attr("transform");
    if (transform) {
      currentTransform = transform;
    }
  }

  const svg = d3.select("#t-emb-2d");
  svg.selectAll("*").remove();
  const g = svg.append("g").attr("class", "main-container");
  
  // --- dynamic thickness (edge width & vertex radius) ---
  const BASE_EDGE  = 0.0005;   // present look at n≈50
  const BASE_VERT  = 0.001;
  const scale      = getThicknessScale(cached.n);   // cached.n is current n
  const edgeWidth  = BASE_EDGE * scale;
  const vertRadius = BASE_VERT * scale;

  // Apply the stored transform if available
  if (currentTransform) {
    g.attr("transform", currentTransform);
  }

  const TContainer = g.append("g").attr("class","t-container");        // existing content
  const OContainer = g.append("g")
      .attr("class","o-container")
      .style("visibility",
             document.getElementById("show-origami").checked ? "visible" : "hidden");

  const T = data.T;

  // We're using our own custom zoom/pan implementation with the camera controls
  // So we don't need d3.zoom() here anymore

  // Helper function to safely get real component
  const getReal = (point) => {
    if (!point) return 0;
    if (typeof point.re === 'number') return point.re;
    if (typeof point.real === 'number') return point.real;
    if (typeof point[0] === 'number') return point[0]; // Array format
    return 0;
  };

  // Helper function to safely get imaginary component
  const getImag = (point) => {
    if (!point) return 0;
    if (typeof point.im === 'number') return point.im;
    if (typeof point.imag === 'number') return point.imag;
    if (typeof point[1] === 'number') return point[1]; // Array format
    return 0;
  };

  /* build edges exactly like in the standalone 2‑D page */
  const edges = buildEdges(T, cached.n);
  addBoundaryRingEdges(T, edges, cached.n);

  // Polygons removed from 2D view - only keeping edges and vertices

  // Draw edges
  TContainer.selectAll("line.edge").data(edges).join("line")
   .attr("class","edge")
   .attr("stroke-width", edgeWidth)        // ← add this
   .attr("x1", d => getReal(T[d[0]]))
   .attr("y1", d => -getImag(T[d[0]]))
   .attr("x2", d => getReal(T[d[1]]))
   .attr("y2", d => -getImag(T[d[1]]));

  TContainer.selectAll("circle.vert").data(T).join("circle")
   .attr("class","vertex")
   .attr("r", vertRadius)                  // ← add / replace
   .attr("cx", d => getReal(d))
   .attr("cy", d => -getImag(d));

  // --- build and draw O‑edges / O‑vertices (origami map) ---
  const Oedges = buildEdges(data.O, cached.n);
  addBoundaryRingEdges(data.O, Oedges, cached.n);

  OContainer.append("g")
    .selectAll("line.o-edge")
    .data(Oedges).join("line")
    .attr("class","o-edge")
    .attr("stroke-width", edgeWidth)          // in the O‑edge join
    .attr("x1", d => data.O[d[0]].re)
    .attr("y1", d => -data.O[d[0]].im)
    .attr("x2", d => data.O[d[1]].re)
    .attr("y2", d => -data.O[d[1]].im);

  OContainer.append("g")
    .selectAll("circle.o-vertex")
    .data(data.O.filter(v => Math.abs(v.re)+Math.abs(v.im) > 1e-10))
    .join("circle")
    .attr("class","o-vertex")
    .attr("r", vertRadius * 0.8)              // slightly smaller
    .attr("cx", d => d.re)
    .attr("cy", d => -d.im);

  /* No need for auto-scale with viewBox - the SVG viewBox already handles scaling for us */
}

/* ---------- 4.5 3‑D drawing ---------- */
function initThree(){
  const div = document.getElementById("t-emb-3d");
  div.innerHTML = "";
  const w = div.clientWidth;
  const h = div.clientHeight;

  // Initialize the scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Set up camera with appropriate near and far planes
  camera = new THREE.PerspectiveCamera(45, 1, 0.0001, 10000); // square ⇒ aspect = 1
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  // Set up renderer with antialiasing
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(w, h);
  div.appendChild(renderer.domElement);

  // Set up orbit controls with min/max distances
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.0001;
  controls.maxDistance = 5000;
  controls.enableZoom = true;
  controls.screenSpacePanning = false;  // preserve vertical axis

  // Handle window resize
  window.addEventListener('resize', () => {
    if (renderer) {
      const newWidth = div.clientWidth;
      const newHeight = div.clientHeight;
      camera.aspect = 1;                // stays square no matter the window
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }
  });

  // Start animation loop
  animate();
}

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  
  // Apply rotation in demo mode (3D only)
  if (isDemoMode && document.getElementById("view-3d-btn").classList.contains("active")) {
    scene.rotation.y += rotationSpeed;
  }
  
  renderer.render(scene, camera);
}

// ---------- 4.5 3‑D drawing ----------
function draw3D(data){
  /* ----------------- INITIAL SETUP ----------------- */
  if (!renderer) initThree();
  
  // Preserve rotation when updating
  const currentRotation = scene.rotation.clone();
  
  scene.clear();

  const T = data.T;                     // T‑vertices in the JSON
  const OImMap = new Map();             // lookup: (k,j) ↦ Im(O)

  /* ---- map O‑vertices to z‑coordinates, if present ---- */
  if (data.O && Array.isArray(data.O)){
    data.O.forEach(o=>{
      if (o && o.k!==undefined && o.j!==undefined && o.im!==undefined){
        OImMap.set(`${o.k},${o.j}`, o.im);
      }
    });
  }

  /* ------------------------------------------------------------------
     Guarantee a height entry for the central vertex (k,j) = (0,0).

     – If an O‑vertex with those indices exists, use its imaginary part.
     – Otherwise approximate by averaging the four neighbours that *do*
       lie in OImMap.  This prevents the centre from defaulting to 0 and
       eliminates the fan‑out artefact.
  ------------------------------------------------------------------- */
  if (!OImMap.has('0,0')) {
    const centreO = data.O?.find(o => o.k === 0 && o.j === 0 && o.im!==undefined);
    if (centreO) {
      OImMap.set('0,0', centreO.im);
    } else {
      const neighKeys = ['1,0','-1,0','0,1','0,-1'].filter(key => OImMap.has(key));
      if (neighKeys.length) {
        const avg = neighKeys.reduce((s,k)=>s+OImMap.get(k),0)/neighKeys.length;
        OImMap.set('0,0', avg);
      } else {
        // fall back: give the centre a tiny lift so it is distinct
        OImMap.set('0,0', 1e-6);
      }
    }
  }


  /* ---- build interior + boundary edges ---- */
  const Tedges = buildEdges(T, cached.n);
  addBoundaryRingEdges(T, Tedges, cached.n);

  const originIndex = T.findIndex(v => v && v.k === 0 && v.j === 0);
  const edges = Tedges;

  /* ---- build faces for polygons ---- */
  const faces = buildFaces(T, cached.n);

  /* ---- materials ---- */
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 0.5  // thinner lines (note: most browsers have a minimum line width)
  });

  /* ---- build THREE.BufferGeometry from the filtered edge list ---- */
  const positions = new Float32Array(edges.length * 6);   // 2 × 3 coords
  for (let e = 0; e < edges.length; ++e){
    const [i1,i2] = edges[e];
    const v1 = T[i1], v2 = T[i2];

    const z1 = OImMap.get(`${v1.k},${v1.j}`) ?? 0;
    const z2 = OImMap.get(`${v2.k},${v2.j}`) ?? 0;

    positions.set([ v1.re, -v1.im, z1,
                    v2.re, -v2.im, z2 ], e*6);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const lineGroup = new THREE.LineSegments(geometry, lineMaterial);
  scene.add(lineGroup);

  /* ---- add lighting for better face rendering ---- */
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 0, 2);
  scene.add(directionalLight);

  /* ---- build face meshes ---- */
  // Create a group to hold all faces
  const facesGroup = new THREE.Group();

  faces.forEach(face => {
    if (face.length < 3) return; // Skip invalid faces

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    // Special handling for center (0,0) vertex
    const centerVertexIdx = face[0];
    const centerVertex = T[centerVertexIdx];
    const isCenterFace = centerVertex && centerVertex.k === 0 && centerVertex.j === 0;

    // Add all vertices to the geometry
    face.forEach((idx, i) => {
      const v = T[idx];
      if (!v) return;

      const z = OImMap.get(`${v.k},${v.j}`) ?? 0;
      vertices.push(v.re, -v.im, z);

      // Create triangulation indices
      if (i > 1) {
        indices.push(0, i-1, i);
      }
    });

    // Close the polygon if it has more than 3 vertices
    if (face.length > 3) {
      indices.push(0, face.length-1, 1);
    }

    // Create the geometry
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Create materials with proper transparency
    const faceMaterial = new THREE.MeshBasicMaterial({
      color: 0x3366cc,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false // Important for correct transparency rendering
    });

    const mesh = new THREE.Mesh(geometry, faceMaterial);
    facesGroup.add(mesh);
  });

  // Add the face group to the scene
  scene.add(facesGroup);

  /* ---- maintain camera position after update ---- */
  // Don't reset camera/controls - they will stay at current position
  controls.update();
  
  // Restore rotation when updating
  scene.rotation.copy(currentRotation);
}

// Build the interior edges among T- or O-vertices
function buildEdges(vertices, n) {
  // Helper function to safely get k,j coordinates
  const getCoords = (v) => {
    if (!v) return { k: 0, j: 0 };
    const k = v.k !== undefined ? v.k : 0;
    const j = v.j !== undefined ? v.j : 0;
    return { k, j };
  };

  // Create a mapping from coordinates to vertex index
  const indexMap = new Map();
  if (!vertices || !Array.isArray(vertices)) {
    return [];
  }

  vertices.forEach((v, idx) => {
    if (v) {
      const { k, j } = getCoords(v);
      indexMap.set(`${k},${j}`, idx);
    }
  });

  const edges = [];
  const neighborSteps = [
    { dk:  1, dj:  0 },
    { dk: -1, dj:  0 },
    { dk:  0, dj:  1 },
    { dk:  0, dj: -1 },
  ];
  const isBoundary = (k,j) => (Math.abs(k)+Math.abs(j) === n);

  // Add special edges connecting corners and boundary
  const specialEdges = [
    // Connect the four corners of the Aztec diamond
    { from: { k: 0, j: n }, to: { k: n, j: 0 } },
    { from: { k: 0, j: -n}, to: { k: n, j: 0 } },
    { from: { k: 0, j: -n}, to: { k: -n, j: 0 } },
    { from: { k: 0, j: n }, to: { k: -n, j: 0 } },
    // Direct connections among boundary
    { from: { k: n-1,  j: 0 },   to: { k: n,    j: 0 } },
    { from: { k: 0,     j: n-1 }, to: { k: 0,    j: n } },
    { from: { k: -(n-1),j: 0 },   to: { k: -n,   j: 0 } },
    { from: { k: 0,     j: -(n-1) }, to: { k: 0,    j: -n } }
  ];


  // Add edges between special vertices
  specialEdges.forEach(s => {
    const fromKey = `${s.from.k},${s.from.j}`;
    const toKey   = `${s.to.k},${s.to.j}`;
    if (indexMap.has(fromKey) && indexMap.has(toKey)) {
      const i1 = indexMap.get(fromKey);
      const i2 = indexMap.get(toKey);
      edges.push([Math.min(i1, i2), Math.max(i1, i2)]);
    }
  });

  // Add edges to neighbor steps, avoiding boundary/interior mismatches
  vertices.forEach((v, idx) => {
    if (!v) return;

    const { k, j } = getCoords(v);

    neighborSteps.forEach(step => {
      const nk = k + step.dk;
      const nj = j + step.dj;
      const key = `${nk},${nj}`;

      if (!indexMap.has(key)) return;
      const nbrIdx = indexMap.get(key);

      // If exactly one endpoint is boundary and the other is interior, skip:
      const oneIsBoundary = isBoundary(k,j) ^ isBoundary(nk,nj);
      if (!oneIsBoundary) {
        // Avoid duplicating edges
        if (nbrIdx > idx) {
          edges.push([idx, nbrIdx]);
        }
      }
    });
  });

  return edges;
}

// Connect boundary ring
function addBoundaryRingEdges(vertices, edges, n) {
  // Helper function to safely get k,j coordinates
  const getCoords = (v) => {
    if (!v) return { k: 0, j: 0 };
    const k = v.k !== undefined ? v.k : 0;
    const j = v.j !== undefined ? v.j : 0;
    return { k, j };
  };

  // Helper function to safely get real component
  const getReal = (point) => {
    if (!point) return 0;
    if (typeof point.re === 'number') return point.re;
    if (typeof point.real === 'number') return point.real;
    if (typeof point[0] === 'number') return point[0]; // Array format
    return 0;
  };

  // Helper function to safely get imaginary component
  const getImag = (point) => {
    if (!point) return 0;
    if (typeof point.im === 'number') return point.im;
    if (typeof point.imag === 'number') return point.imag;
    if (typeof point[1] === 'number') return point[1]; // Array format
    return 0;
  };

  // Find vertices on the boundary (k+j = n-1)
  const boundaryIndices = [];
  if (!vertices || !Array.isArray(vertices) || !edges) {
    return;
  }

  vertices.forEach((v, idx) => {
    if (!v) return;
    const { k, j } = getCoords(v);
    if (Math.abs(k) + Math.abs(j) === n-1) {
      boundaryIndices.push(idx);
    }
  });

  if (boundaryIndices.length === 0) return;

  // Sort boundary vertices by angle and connect them in order
  boundaryIndices.sort((iA, iB) => {
    const vA = vertices[iA];
    const vB = vertices[iB];
    const aA = Math.atan2(getImag(vA), getReal(vA));
    const aB = Math.atan2(getImag(vB), getReal(vB));
    return aA - aB;
  });

  // Connect in sequence
  for (let i = 0; i < boundaryIndices.length; i++) {
    const iA = boundaryIndices[i];
    const iB = boundaryIndices[(i+1) % boundaryIndices.length];
    edges.push([Math.min(iA, iB), Math.max(iA, iB)]);
  }
}

// Build the face polygons from vertices
function buildFaces(vertices, n) {
  // Helper function to safely get k,j coordinates
  const getCoords = (v) => {
    if (!v) return { k: 0, j: 0 };
    const k = v.k !== undefined ? v.k : 0;
    const j = v.j !== undefined ? v.j : 0;
    return { k, j };
  };

  // Create a mapping from coordinates to vertex index
  const indexMap = new Map();
  if (!vertices || !Array.isArray(vertices)) {
    return [];
  }

  vertices.forEach((v, idx) => {
    if (v) {
      const { k, j } = getCoords(v);
      indexMap.set(`${k},${j}`, idx);
    }
  });

  const faces = [];

  // Special handling for the central face (0,0)
  if (indexMap.has('0,0')) {
    const centerIdx = indexMap.get('0,0');
    const centralFace = [centerIdx];

    // Check each of the primary directions for adjacent vertices
    [[-1,0], [0,1], [1,0], [0,-1]].forEach(([dk, dj]) => {
      const key = `${dk},${dj}`;
      if (indexMap.has(key)) {
        centralFace.push(indexMap.get(key));
      }
    });

    // Only add face if we have at least 3 vertices
    if (centralFace.length >= 3) {
      faces.push(centralFace);
    }
  }

  // Generate all other faces
  for (let k = -n+1; k < n; k++) {
    for (let j = -n+1; j < n; j++) {
      // Skip the center which we've already handled
      if (k === 0 && j === 0) continue;

      // Only consider positions within the diamond
      if (Math.abs(k) + Math.abs(j) >= n) continue;

      const key = `${k},${j}`;
      if (!indexMap.has(key)) continue;

      const centralIdx = indexMap.get(key);
      const face = [centralIdx];

      // Find connected neighbors in clockwise order
      const neighbors = [];
      [[0,-1], [1,0], [0,1], [-1,0]].forEach(([dk, dj]) => {
        const nk = k + dk;
        const nj = j + dj;
        const nKey = `${nk},${nj}`;

        if (indexMap.has(nKey) && Math.abs(nk) + Math.abs(nj) < n) {
          neighbors.push(indexMap.get(nKey));
        }
      });

      // Only create faces with at least 3 vertices (including center)
      if (neighbors.length >= 2) {
        // Add neighbors to form the face
        face.push(...neighbors);
        faces.push(face);
      }
    }
  }

  return faces;
}

/* ---------- 4.6 UI wiring ---------- */
async function update(){
  if (!doTembInitialized) {
    return;
  }

  try {
    const n=parseInt(document.getElementById("n-input").value,10);
    const a=parseFloat(document.getElementById("a-input").value);
    const data=await fetchEmbedding(n,a);


    if (document.getElementById("view-3d-btn").classList.contains("active")) {
      draw3D(data);
    } else {
      draw2D(data);
    }
  } catch (err) {
  }
}
document.getElementById("update-btn").onclick = update;

/* toggle buttons */
document.getElementById("view-2d-btn").onclick = ()=>{
  document.getElementById("view-2d-btn").classList.add("active");
  document.getElementById("view-3d-btn").classList.remove("active");
  document.getElementById("t-emb-2d").style.display="block";
  document.getElementById("t-emb-3d").style.display="none";
  if (cached) draw2D(cached.data);
};
document.getElementById("view-3d-btn").onclick = ()=>{
  document.getElementById("view-3d-btn").classList.add("active");
  document.getElementById("view-2d-btn").classList.remove("active");
  document.getElementById("t-emb-3d").style.display="block";
  document.getElementById("t-emb-2d").style.display="none";
  if (cached) draw3D(cached.data);
};

document.getElementById("show-origami").addEventListener("change", function () {
  d3.select(".o-container")
     .style("visibility", this.checked ? "visible" : "hidden");
});

// Toggle auto-rotation demo mode
document.getElementById("demo-mode").addEventListener("change", function () {
  isDemoMode = this.checked;
});

/* ---------- 5. Camera controls ---------- */
// Shared variables for zoom levels
let zoom3DLevel = 1.0;
const ZOOM_FACTOR = 1.2;

// Reset view button (works in both 2D and 3D modes)
document.getElementById("reset-view-btn").addEventListener("click", function() {
  const is3DActive = document.getElementById("view-3d-btn").classList.contains("active");

  if (is3DActive) {
    // Reset 3D camera
    camera.position.set(0, 0, 3);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    zoom3DLevel = 1.0;
    controls.reset();
    
    // Reset scene rotation only if not in demo mode
    if (!isDemoMode) {
      scene.rotation.set(0, 0, 0);
    }
  } else {
    // Reset 2D view
    const svg = d3.select("#t-emb-2d");
    const g = svg.select("g");
    g.transition().duration(750).attr("transform", "translate(0,0) scale(1)");
  }
});

// Camera movement in both 2D and 3D
function handleCameraMovement(direction) {
  const is3DActive = document.getElementById("view-3d-btn").classList.contains("active");

  if (is3DActive) {
    // Handle 3D camera movement
    const moveAmount = 0.1 * camera.position.distanceTo(new THREE.Vector3(0, 0, 0));

    if (direction === "up") {
      camera.position.y += moveAmount;
      controls.target.y += moveAmount;
    } else if (direction === "down") {
      camera.position.y -= moveAmount;
      controls.target.y -= moveAmount;
    } else if (direction === "left") {
      camera.position.x -= moveAmount;
      controls.target.x -= moveAmount;
    } else if (direction === "right") {
      camera.position.x += moveAmount;
      controls.target.x += moveAmount;
    }

    controls.update();
  } else {
    // Handle 2D camera movement
    const svg = d3.select("#t-emb-2d");
    const g = svg.select("g");

    // Get current transform or use default
    let currentTransform = g.attr("transform");
    let x = 0, y = 0, scale = 1;

    if (currentTransform) {
      // Parse transform if it exists
      const translateMatch = /translate\(([^,]+),([^)]+)\)/.exec(currentTransform);
      const scaleMatch = /scale\(([^)]+)\)/.exec(currentTransform);

      if (translateMatch) {
        x = parseFloat(translateMatch[1]);
        y = parseFloat(translateMatch[2]);
      }

      if (scaleMatch) {
        scale = parseFloat(scaleMatch[1]);
      }
    }

    // Calculate move amount based on scale - using a smaller value for more precise movement
    const moveAmount = 0.002 * (1/scale) * 100;

    if (direction === "up") {
      y += moveAmount;
    } else if (direction === "down") {
      y -= moveAmount;
    } else if (direction === "left") {
      x += moveAmount;
    } else if (direction === "right") {
      x -= moveAmount;
    }

    // Apply the new transform
    g.attr("transform", `translate(${x},${y}) scale(${scale})`);
  }
}

// Zoom in/out in both 2D and 3D
function handleZoom(zoomIn) {
  const is3DActive = document.getElementById("view-3d-btn").classList.contains("active");

  if (is3DActive) {
    // Handle 3D zoom
    const zoomFactor = zoomIn ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);

    // Move camera along its direction vector
    camera.position.addScaledVector(cameraDir, -2 * (zoomFactor - 1));
    camera.updateProjectionMatrix();
    controls.update();

    zoom3DLevel *= zoomIn ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
  } else {
    // Handle 2D zoom
    const svg = d3.select("#t-emb-2d");
    const g = svg.select("g");

    // Get current transform or use default
    let currentTransform = g.attr("transform");
    let x = 0, y = 0, scale = 1;

    if (currentTransform) {
      // Parse transform if it exists
      const translateMatch = /translate\(([^,]+),([^)]+)\)/.exec(currentTransform);
      const scaleMatch = /scale\(([^)]+)\)/.exec(currentTransform);

      if (translateMatch) {
        x = parseFloat(translateMatch[1]);
        y = parseFloat(translateMatch[2]);
      }

      if (scaleMatch) {
        scale = parseFloat(scaleMatch[1]);
      }
    }

    // Calculate new scale
    const newScale = zoomIn ? scale * ZOOM_FACTOR : scale / ZOOM_FACTOR;

    // Apply the new transform
    g.attr("transform", `translate(${x},${y}) scale(${newScale})`);
  }
}

// Add event listeners for camera controls
document.getElementById("move-up-btn").addEventListener("click", function() {
  handleCameraMovement("up");
});

document.getElementById("move-down-btn").addEventListener("click", function() {
  handleCameraMovement("down");
});

document.getElementById("move-left-btn").addEventListener("click", function() {
  handleCameraMovement("left");
});

document.getElementById("move-right-btn").addEventListener("click", function() {
  handleCameraMovement("right");
});

document.getElementById("zoom-in-btn").addEventListener("click", function() {
  handleZoom(true);
});

document.getElementById("zoom-out-btn").addEventListener("click", function() {
  handleZoom(false);
});
</script>
