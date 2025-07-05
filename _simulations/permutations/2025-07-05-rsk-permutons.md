---
title: Random Permutation from Young Diagram (Hook‑Walk + RSK)
model: permutations
author: Leonid Petrov
code:
  - link: https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-07-05-rsk-permutons.md
    txt: Markdown page embedding the simulation
  - link: https://github.com/lenis2000/homepage/blob/master/js/2025-07-05-rsk-permutons.js
    txt: Pure‑JS implementation of hook‑walk + inverse RSK
---

<script src="{{site.url}}/js/2025-07-05-rsk-permutons.js"></script>

<div class="row mb-3">
  <div class="col-12">
    <p>Draw any Young diagram in the canvas, set a grid resolution <code>N</code>, then hit
    <strong>Generate Permutation</strong>. Two uniform standard Young tableaux are sampled via the Greene–Nijenhuis–Wilf
    hook‑walk, inverse RSK is applied, and the permutation matrix appears on the right.</p>
  </div>
</div>

<div class="row mb-3">
  <div class="col-12 col-lg-6">
    <label for="gridN">Grid resolution N:</label>
    <input id="gridN" type="number" min="5" max="80" step="1" value="20" class="form-control d-inline-block w-auto"/>
    <button id="clearBtn" class="btn btn-secondary ms-2">Clear</button>
    <button id="genBtn"   class="btn btn-primary ms-2">Generate Permutation</button>
    <canvas id="shapeCanvas" width="600" height="400" class="mt-3 border border-2" style="cursor:crosshair;"></canvas>
  </div>
  <div class="col-12 col-lg-6">
    <h5 class="mt-3">Permutation Matrix</h5>
    <div id="permMatrix"></div>
  </div>
</div>

<script>
  YoungPerm.initCanvas("shapeCanvas","gridN");
  document.getElementById("clearBtn").onclick=()=>{
    const c=document.getElementById("shapeCanvas").getContext("2d");c.clearRect(0,0,600,400);
  };
  document.getElementById("genBtn").onclick=()=>YoungPerm.drawPermutationMatrix("permMatrix");
</script>