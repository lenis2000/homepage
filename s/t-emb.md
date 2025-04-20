---
title: T‑embeddings of the Aztec diamond (2‑D & 3‑D)
author: 'Leonid Petrov'
layout: default          # keeps site look identical to domino.md
permalink: /t-emb/
---

<!-- === Parameter controls shared by both panes === -->
<div id="controls" style="font-size:18px;margin-bottom:12px">
  <label>Aztec diamond n (1–200):</label>
  <input id="n-input" type="number" value="16" min="1" max="200" step="1">
  <label style="margin-left:15px">Periodic a:</label>
  <input id="a-input" type="number" value="0.8" min="0.1" max="10" step="0.1">
  <button id="update-btn">Update</button>
  <label style="margin-left:15px">
    <input id="show-origami" type="checkbox" checked>
    Show origami map
  </label>
</div>

<!-- === View toggle === -->
<div class="view-toggle" style="margin-bottom:10px">
  <button id="view-2d-btn" class="active">2‑D</button>
  <button id="view-3d-btn">3‑D</button>
</div>

<!-- === Two panes === -->
<div class="visualization-container">
  <svg id="t-emb-2d" viewBox="-1 -1 2 2" style="width:100%;height:80vh;border:1px solid #ccc;"></svg>
  <div id="t-emb-3d"  style="display:none;width:100%;height:80vh;"></div>
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
    r: 0.001;
  }

  .edge {
    stroke: black;
    stroke-width: 0.001;
    fill: none;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    #t-emb-2d, #t-emb-3d {
      height: 65vh;
    }
  }

  @media (max-width: 600px) {
    #t-emb-2d, #t-emb-3d {
      height: 60vh;
    }
  }

  /* Styling for buttons and controls */
  button {
    cursor: pointer;
  }

  /* --- origami (O‑embedding) --- */
  .o-edge    { stroke:red; stroke-width:0.0003px; fill:none; }
  .o-vertex  { fill:red;   stroke:none;  r:0.0005;  opacity:0.7; }
</style>

<script src="/js/d3.v7.min.js"></script>
<script src="/js/three.min.js"></script>
<script src="/js/OrbitControls.js"></script>

<!-- WASM/JS produced from the single C++ core -->
<script src="/js/2025-03-27-t-emb-a-json.js"></script>   <!-- same module drives BOTH views -->

<script>
/* ---------- 4.1 globals ---------- */
let cached = null;            // {n, a, data} or null
let scene, camera, renderer, controls;   // 3‑D objects

/* ---------- 4.2 WASM wrappers ---------- */
let doTembInitialized = false;

Module.onRuntimeInitialized = () => {
  window.doTemb = Module.cwrap('doTembJSONwithA','number',['number','number'],{async:true});
  window.freeStr = Module.cwrap('freeString',null,['number']);
  doTembInitialized = true;
  console.log("WASM module initialized");
  // Initial update once module is ready
  update();
};

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
  const svg   = d3.select("#t-emb-2d");
  svg.selectAll("*").remove();
  const g          = svg.append("g");
  const TContainer = g.append("g").attr("class","t-container");        // existing content
  const OContainer = g.append("g")
      .attr("class","o-container")
      .style("visibility",
             document.getElementById("show-origami").checked ? "visible" : "hidden");

  const T     = data.T;

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
  console.log("Building edges for n =", cached.n);
  const edges = buildEdges(T, cached.n);
  console.log("Adding boundary edges");
  addBoundaryRingEdges(T, edges, cached.n);
  console.log("Created edges:", edges.length);

  TContainer.selectAll("line.edge").data(edges).join("line")
   .attr("class","edge")
   .attr("x1", d => getReal(T[d[0]]))
   .attr("y1", d => -getImag(T[d[0]]))
   .attr("x2", d => getReal(T[d[1]]))
   .attr("y2", d => -getImag(T[d[1]]));

  TContainer.selectAll("circle.vert").data(T).join("circle")
   .attr("class","vertex").attr("r",0.001)
   .attr("cx", d => getReal(d))
   .attr("cy", d => -getImag(d));

  // --- build and draw O‑edges / O‑vertices (origami map) ---
  const Oedges = buildEdges(data.O, cached.n);
  addBoundaryRingEdges(data.O, Oedges, cached.n);

  OContainer.append("g")
    .selectAll("line.o-edge")
    .data(Oedges).join("line")
    .attr("class","o-edge")
    .attr("x1", d => data.O[d[0]].re)
    .attr("y1", d => -data.O[d[0]].im)
    .attr("x2", d => data.O[d[1]].re)
    .attr("y2", d => -data.O[d[1]].im);

  OContainer.append("g")
    .selectAll("circle.o-vertex")
    .data(data.O.filter(v => Math.abs(v.re)+Math.abs(v.im) > 1e-10))
    .join("circle")
    .attr("class","o-vertex")
    .attr("cx", d => d.re)
    .attr("cy", d => -d.im);

  /* No need for auto-scale with viewBox - the SVG viewBox already handles scaling for us */

  /* optional zoom */
  svg.call(d3.zoom().scaleExtent([0.5,30]).on("zoom",e=>g.attr("transform",e.transform)));
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
  camera = new THREE.PerspectiveCamera(45, w/h, 0.0001, 10000);
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

  // Handle window resize
  window.addEventListener('resize', () => {
    if (renderer) {
      const newWidth = div.clientWidth;
      const newHeight = div.clientHeight;
      camera.aspect = newWidth / newHeight;
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
  renderer.render(scene, camera);
}

// ---------- 4.5 3‑D drawing ----------
function draw3D(data){
  /* ----------------- INITIAL SETUP ----------------- */
  if (!renderer) initThree();
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

  /* ---- material for lines ---- */
  const material = new THREE.LineBasicMaterial({ color: 0x000000 });

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
  const lineGroup = new THREE.LineSegments(geometry, material);
  scene.add(lineGroup);

  /* ===============================================================
     ❷  ***REMOVE SPHERES***  – no decorative vertices any more
     (The old sphere/InstancedMesh code block has been deleted.)
  ================================================================== */

  /* ---- camera framing ---- */
  camera.position.set(0.5, -0.5, 2);
  camera.lookAt(0,0,0);
  controls.update();
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
    console.error("Invalid vertices array:", vertices);
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

  console.log("Index map has", indexMap.size, "entries for n =", n);

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

  console.log(`Built ${edges.length} edges from ${vertices.length} vertices with n=${n}`);
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
    console.error("Invalid parameters to addBoundaryRingEdges");
    return;
  }

  vertices.forEach((v, idx) => {
    if (!v) return;
    const { k, j } = getCoords(v);
    if (Math.abs(k) + Math.abs(j) === n-1) {
      boundaryIndices.push(idx);
    }
  });

  console.log(`Found ${boundaryIndices.length} boundary vertices (n=${n})`);
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

  console.log(`Added ${boundaryIndices.length} boundary ring edges`);
}

/* ---------- 4.6 UI wiring ---------- */
async function update(){
  if (!doTembInitialized) {
    console.log("WASM module not yet initialized, skipping update");
    return;
  }

  try {
    const n=parseInt(document.getElementById("n-input").value,10);
    const a=parseFloat(document.getElementById("a-input").value);
    console.log(`Fetching embedding with n=${n}, a=${a}`);
    const data=await fetchEmbedding(n,a);
    console.log("Data fetched:", data);

    // Debug: examine the structure of the first few T objects
    if (data.T && data.T.length > 0) {
      console.log("First T object sample:", data.T[0]);
      console.log("T object properties:", Object.keys(data.T[0]));
    }

    // Debug: examine the structure of the first few O objects
    if (data.O && data.O.length > 0) {
      console.log("First O object sample:", data.O[0]);
      console.log("O object properties:", Object.keys(data.O[0]));
    }

    if (document.getElementById("view-2d-btn").classList.contains("active")) {
      console.log("Drawing 2D view");
      draw2D(data);
    } else {
      console.log("Drawing 3D view");
      draw3D(data);
    }
  } catch (err) {
    console.error("Error in update:", err);
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
</script>
