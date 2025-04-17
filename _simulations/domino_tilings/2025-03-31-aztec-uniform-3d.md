---
title: '3D Height of Uniform Domino Tilings of the Aztec Diamond'
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
    vertical-align: top;
  }
  @media (max-width: 576px) {
    #aztec-canvas {
      height: 60vh;
    }
  }
</style>

<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>
<script src="/js/2025-03-31-aztec-uniform-3d.js"></script>

This simulation demonstrates random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>, via its three-dimentional height function. The simulation is inspired by Alexei and Matvey Borodins' <a href="https://math.mit.edu/~borodin/aztec.html">visualizations</a>.

<!-- Controls to change n -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 120$): </label>
  <input id="n-input" type="number" value="4" min="2" step="2" max="120" size="3">
  <button id="update-btn">Update</button>
</div>

<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>
<div id="aztec-canvas"></div>

<script>
Module.onRuntimeInitialized = async function() {
  const simulateAztec = Module.cwrap('simulateAztec','number',['number'],{async:true});
  const freeString    = Module.cwrap('freeString',null,['number']);
  const getProgress   = Module.cwrap('getProgress','number',[]);

  // Three.js setup (scene, camera, renderer, controls) unchanged...
  let scene, camera, renderer, controls, dominoGroup;

  function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const container = document.getElementById('aztec-canvas');
    const w = container.clientWidth, h = container.clientHeight;
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(w,h);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = ''; container.appendChild(renderer.domElement);

    const frustum = 100, aspect = w/h;
    camera = new THREE.OrthographicCamera(
      -frustum*aspect/2, frustum*aspect/2,
       frustum/2, -frustum/2,
      1,1000
    );
    camera.position.set(0,100,0);
    camera.lookAt(0,0,0);

    scene.add(new THREE.AmbientLight(0xffffff,0.5));
    const dir = new THREE.DirectionalLight(0xffffff,0.8);
    dir.position.set(1,1,1).normalize();
    scene.add(dir);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    window.addEventListener('resize', onWindowResize);

    dominoGroup = new THREE.Group();
    scene.add(dominoGroup);

    animate();
  }
  function onWindowResize(){
    const container = document.getElementById('aztec-canvas');
    const w = container.clientWidth, h = container.clientHeight;
    const frustum = 100, aspect = w/h;
    camera.left = -frustum*aspect/2; camera.right = frustum*aspect/2;
    camera.top = frustum/2; camera.bottom = -frustum/2;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h);
  }
  function animate(){
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  initThreeJS();

  async function updateVisualization(n) {
    // clear previous
    while(dominoGroup.children.length){
      const m = dominoGroup.children[0];
      dominoGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }

    // start progress polling
    document.getElementById("progress-indicator").innerText = "Sampling... (0%)";
    const poll = setInterval(()=>{
      const p = getProgress();
      document.getElementById("progress-indicator").innerText = `Sampling... (${p}%)`;
      if(p>=100) clearInterval(poll);
    },100);

    try {
      const ptr = await simulateAztec(n);
      let raw = Module.UTF8ToString(ptr);
      freeString(ptr);
      const faces = JSON.parse(raw);
      if(faces.error) throw new Error(faces.error);

      const scale = 60/(2*n);
      const colors = {
        blue:   0x4363d8,
        green:  0x3cb44b,
        red:    0xe6194b,
        yellow: 0xffe119
      };

      // build all meshes
      let idx = 0, total = faces.length;
      function batch(start){
        const end = Math.min(start + 500, total);
        for(let i = start; i < end; i++){
          const f = faces[i];
          if(!f || !f.color || !Array.isArray(f.vertices)) continue;
          try {
            const geom = new THREE.BufferGeometry();
            // vertices: 6 entries [x,y,z]
            const pos = [];
            for(const v of f.vertices){
              // For red and yellow dominoes, make vertical coordinate negative
              const isRedOrYellow = (f.color === 'red' || f.color === 'yellow');
              const heightFactor = isRedOrYellow ? -1 : 1;
              pos.push(v[0]*scale, v[2]*scale*heightFactor, v[1]*scale);
            }
            geom.setAttribute(
              'position',
              new THREE.Float32BufferAttribute(pos, 3)
            );
            // indices: same as before
            const isH = (f.color==='blue'||f.color==='green');
            geom.setIndex(
              isH
                ? [0,1,3, 3,2,1, 0,1,4, 3,2,5]
                : [0,1,3, 3,2,1, 0,1,4, 3,2,5]
            );
            geom.computeVertexNormals();
            const mat = new THREE.MeshStandardMaterial({
              color: colors[f.color]||0x808080,
              side: THREE.DoubleSide,
              flatShading:true
            });
            dominoGroup.add(new THREE.Mesh(geom, mat));
          } catch(e){
            console.warn("face error",i,e);
          }
        }
        idx = end;
        if(idx < total){
          document.getElementById("progress-indicator").innerText =
            `Rendering... (${Math.floor(100*(idx/total))}%)`;
          requestAnimationFrame(()=>batch(idx));
        } else {
          document.getElementById("progress-indicator").innerText = "";
          clearInterval(poll);
        }
      }
      batch(0);

    } catch(err) {
      console.error(err);
      document.getElementById("progress-indicator").innerText =
        `Error: ${err.message}`;
      clearInterval(poll);
    }
  }

  document.getElementById("update-btn").addEventListener("click",()=>{
    let n = parseInt(document.getElementById("n-input").value,10);
    if(isNaN(n)||n<2||n%2||n>120){
      return alert("Enter even n between 2 and 120");
    }
    updateVisualization(n);
  });

  updateVisualization(parseInt(document.getElementById("n-input").value,10));
};
</script>
