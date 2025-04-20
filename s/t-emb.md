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
  <input id="a-input" type="number" value="1.0" min="0.1" max="10" step="0.1">
  <button id="update-btn">Update</button>
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
    r: 0.004;
  }

  .edge {
    stroke: black;
    stroke-width: 0.003;
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
  const g     = svg.append("g");
  
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

  g.selectAll("line.edge").data(edges).join("line")
   .attr("class","edge")
   .attr("x1", d => getReal(T[d[0]]))
   .attr("y1", d => -getImag(T[d[0]]))
   .attr("x2", d => getReal(T[d[1]]))
   .attr("y2", d => -getImag(T[d[1]]));

  g.selectAll("circle.vert").data(T).join("circle")
   .attr("class","vertex").attr("r",0.004)
   .attr("cx", d => getReal(d))
   .attr("cy", d => -getImag(d));
   
  /* No need for auto-scale with viewBox - the SVG viewBox already handles scaling for us */
  
  /* optional zoom */
  svg.call(d3.zoom().scaleExtent([0.5,30]).on("zoom",e=>g.attr("transform",e.transform)));
}

/* ---------- 4.5 3‑D drawing ---------- */
function initThree(){
  const div = document.getElementById("t-emb-3d");
  div.innerHTML = "";
  const w=div.clientWidth, h=div.clientHeight;
  scene   = new THREE.Scene();
  camera  = new THREE.PerspectiveCamera(45,w/h,0.001,1000);
  camera.position.set(0,0,3);

  renderer= new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(w,h); div.appendChild(renderer.domElement);
  controls= new THREE.OrbitControls(camera, renderer.domElement);
  animate();
}
function animate(){ requestAnimationFrame(animate); controls.update(); renderer.render(scene,camera); }

function draw3D(data){
  if(!renderer) initThree();
  scene.clear();
  const T=data.T;
  
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
  
  // Helper to get a coordinate key
  const getKey = (point) => {
    if (!point) return "0,0";
    const k = point.k !== undefined ? point.k : 0;
    const j = point.j !== undefined ? point.j : 0;
    return `${k},${j}`;
  };
  
  // Safely create a mapping from O coordinates to O.im values
  const Oim = new Map();
  if (data.O && Array.isArray(data.O)) {
    data.O.forEach(o => {
      if (o) {
        const key = getKey(o);
        const value = getImag(o);
        Oim.set(key, value);
      }
    });
  }
  
  console.log("3D: Creating geometry with", T.length, "vertices");
  const geom = new THREE.BufferGeometry();
  const positions = [];
  
  const edges = buildEdges(T, cached.n);
  console.log("3D: Built", edges.length, "edges");
  
  edges.forEach(e => {
    if (e && e.length >= 2 && T[e[0]] && T[e[1]]) {
      const v1 = T[e[0]], v2 = T[e[1]];
      
      // Get z-coordinate from Oim map or use 0
      const z1 = Oim.get(getKey(v1)) || 0;
      const z2 = Oim.get(getKey(v2)) || 0;
      
      positions.push(
        getReal(v1),     // x1
        -getImag(v1),    // y1
        z1,              // z1
        getReal(v2),     // x2
        -getImag(v2),    // y2
        z2               // z2
      );
    }
  });
  
  console.log("3D: Created", positions.length/6, "line segments");
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  scene.add(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({color:0x000000})));
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
</script>
