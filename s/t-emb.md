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
  <svg id="t-emb-2d" style="width:100%;height:80vh;border:1px solid #ccc;"></svg>
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
    stroke-width: 0.001px;
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
<script src="/s/t-emb.js"></script>   <!-- same module drives BOTH views -->

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

  /* build edges exactly like in the standalone 2‑D page */
  const edges = buildEdges(T, cached.n);
  addBoundaryRingEdges(T, edges, cached.n);

  g.selectAll("line.edge").data(edges).join("line")
   .attr("class","edge")
   .attr("x1",d=>T[d[0]].re).attr("y1",d=>-T[d[0]].im)
   .attr("x2",d=>T[d[1]].re).attr("y2",d=>-T[d[1]].im);

  g.selectAll("circle.vert").data(T).join("circle")
   .attr("class","vertex").attr("r",0.001)
   .attr("cx",d=>d.re).attr("cy",d=>-d.im);
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
  const T=data.T, Oim=new Map(data.O.map(o=>[`${o.k},${o.j}`,o.im]));
  const geom = new THREE.BufferGeometry();
  const positions = [];
  buildEdges(T,cached.n).forEach(e=>{
     const v1=T[e[0]], v2=T[e[1]];
     positions.push(v1.re,-v1.im,Oim.get(`${v1.k},${v1.j}`)||0,
                    v2.re,-v2.im,Oim.get(`${v2.k},${v2.j}`)||0);
  });
  geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  scene.add(new THREE.LineSegments(geom,new THREE.LineBasicMaterial({color:0x000000})));
}

// Build the interior edges among T- or O-vertices
function buildEdges(vertices, n) {
  const indexMap = new Map();
  vertices.forEach((v, idx) => {
    indexMap.set(`${v.k},${v.j}`, idx);
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

  // Add edges between vertices
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
    neighborSteps.forEach(step => {
      const nk = v.k + step.dk;
      const nj = v.j + step.dj;
      const key = `${nk},${nj}`;
      if (!indexMap.has(key)) return;
      const nbrIdx = indexMap.get(key);

      // If exactly one endpoint is boundary and the other is interior, skip:
      const oneIsBoundary = isBoundary(v.k,v.j) ^ isBoundary(nk,nj);
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
  const boundaryIndices = [];
  vertices.forEach((v, idx) => {
    if (Math.abs(v.k) + Math.abs(v.j) === n-1) {
      boundaryIndices.push(idx);
    }
  });

  // Sort boundary vertices by angle and connect them in order
  boundaryIndices.sort((iA, iB) => {
    const vA = vertices[iA];
    const vB = vertices[iB];
    const aA = Math.atan2(vA.im, vA.re);
    const aB = Math.atan2(vB.im, vB.re);
    return aA - aB;
  });

  // Connect in sequence
  for (let i = 0; i < boundaryIndices.length; i++) {
    const iA = boundaryIndices[i];
    const iB = boundaryIndices[(i+1) % boundaryIndices.length];
    edges.push([Math.min(iA, iB), Math.max(iA, iB)]);
  }
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
