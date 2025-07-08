---
title: Random SYT via Hook Walk
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-07-07-hookwalk-tableau.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-07-07-hookwalk-tableau.cpp'
    txt : 'C++ code for WASM module (samples SYT up to 100 000 boxes)'
---

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<script src="{{site.url}}/js/2025-07-07-hookwalk-tableau.js"></script>

<style>
  .controls {
    margin: 20px 0;
    padding: 15px;
    background: var(--background-secondary, #f8f9fa);
    border-radius: 8px;
  }
  
  .input-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .input-group label {
    font-weight: 500;
  }
  
  .input-group input {
    padding: 8px 12px;
    border: 1px solid var(--border-color, #ccc);
    border-radius: 4px;
    font-family: monospace;
  }
  
  .input-group button {
    padding: 8px 16px;
    background: var(--accent-color, #007bff);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .input-group button:hover {
    background: var(--accent-hover, #0056b3);
  }
  
  .section {
    margin: 20px 0;
    min-height: 200px;
  }
  
  .tableau-cell {
    fill: white;
    stroke: #333;
    stroke-width: 1;
  }
  
  .tableau-cell.filled {
    fill: #e8f4ff;
  }
  
  .tableau-text {
    text-anchor: middle;
    dominant-baseline: middle;
    font-family: monospace;
    font-size: 14px;
    fill: #333;
  }
  
  .mode-toggle {
    padding: 8px 16px;
    border: 1px solid var(--border-color, #ccc);
    background: var(--background-primary, white);
    cursor: pointer;
    margin-right: 5px;
  }
  
  .mode-toggle.active {
    background: var(--accent-color, #007bff);
    color: white;
  }
  
  .input-section {
    margin: 15px 0;
    padding: 15px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 5px;
    background: var(--background-secondary, #f9f9f9);
  }
  
  .drawing-container {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }
  
  .drawing-info {
    min-width: 200px;
    font-family: monospace;
    font-size: 14px;
  }
  
  .drawing-info div {
    margin: 5px 0;
  }
  
  .grid-cell {
    fill: white;
    stroke: #ccc;
    stroke-width: 1;
    cursor: pointer;
  }
  
  .grid-cell.filled {
    fill: #e8f4ff;
  }
  
  .grid-cell:hover {
    fill: #d0e8ff;
  }
  
  .shape-toggle {
    padding: 6px 12px;
    border: 1px solid var(--border-color, #ccc);
    background: var(--background-primary, white);
    cursor: pointer;
    margin-right: 5px;
    font-size: 14px;
  }
  
  .shape-toggle.active {
    background: var(--accent-color, #007bff);
    color: white;
  }
  
  .shape-input-section {
    margin-top: 10px;
  }
  
  .info-text {
    font-size: 12px;
    color: var(--text-secondary, #666);
    font-style: italic;
    margin-left: 10px;
  }
  
  .progress-bar {
    width: 100%;
    height: 20px;
    background-color: var(--background-secondary, #f0f0f0);
    border: 1px solid var(--border-color, #ccc);
    border-radius: 10px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-color, #007bff), #0056b3);
    width: 0%;
    transition: width 0.3s ease;
  }
  
  .progress-text {
    text-align: center;
    font-size: 14px;
    margin-top: 5px;
    color: var(--text-primary, #333);
  }
</style>

<h2>Generate Random Standard Young Tableaux</h2>

<details id="algorithm-description-details" style="margin-bottom: 20px;">
    <summary style="cursor: pointer; padding: 15px; border: 1px solid var(--border-color, #ddd); border-radius: 5px; background-color: var(--bg-secondary, #f9f9f9); font-weight: bold; font-size: 1.1em; color: var(--text-primary, #212529);">
        About the Hook-Walk Algorithm
    </summary>
    <div style="padding: 15px; border: 1px solid var(--border-color, #ddd); border-top: none; border-radius: 0 0 5px 5px; background-color: var(--bg-secondary, #f9f9f9); color: var(--text-primary, #212529);">
        <p>The <strong>hook-walk algorithm</strong> (Greene-Nijenhuis-Wilf) generates uniformly random Standard Young Tableaux (SYT) of any given shape. This is a fundamental tool in algebraic combinatorics with applications to representation theory, symmetric functions, and random matrix theory.</p>
        
        <h4>How it works:</h4>
        <ol>
            <li>Start with an empty Young diagram of the given shape</li>
            <li>For each number k from N down to 1:
                <ul>
                    <li>Pick a random starting cell uniformly from all empty cells</li>
                    <li>Perform a random walk within the hook: move right or down with probabilities proportional to arm and leg lengths</li>
                    <li>Stop when reaching a corner cell (arm = leg = 0)</li>
                    <li>Place k at that corner and remove it from the diagram</li>
                </ul>
            </li>
        </ol>
        
        <h4>Properties:</h4>
        <ul>
            <li><strong>Uniform sampling:</strong> Each SYT of the given shape has equal probability</li>
            <li><strong>Efficient:</strong> O(N√N) time complexity for N boxes</li>
            <li><strong>Scalable:</strong> Handles shapes up to 100,000 boxes using WASM</li>
        </ul>
        
        <h4>Shape input methods:</h4>
        <ul>
            <li><strong>Draw Shape:</strong> Click cells on the interactive grid to draw Young diagrams by hand</li>
            <li><strong>Manual notation:</strong> Enter row lengths like <code>5,5,5</code> or <code>100^50</code></li>
            <li><strong>Plancherel measure:</strong> Sample random partitions by discretizing the Vershik-Kerov limit shape Ω(x) = (2/π)[x√(1-x²) + arcsin(x)]</li>
        </ul>
        
        <h4>Visualization:</h4>
        <ul>
            <li><strong>Small tableaux (≤200 boxes):</strong> Individual numbers displayed in cells</li>
            <li><strong>Large tableaux (>200 boxes):</strong> Heat map showing value distribution by deciles</li>
        </ul>
    </div>
</details>

<div class="controls">
  <div class="input-group">
    <label>Input method:</label>
    <button id="toggle-draw-mode" class="mode-toggle active">Draw Shape</button>
    <button id="toggle-text-mode" class="mode-toggle">Text Input</button>
  </div>
  
  <!-- Drawing interface -->
  <div id="draw-interface" class="input-section">
    <div class="input-group">
      <label for="target-boxes">N:</label>
      <input type="number" id="target-boxes" value="2500" min="1" max="100000">
      <button id="auto-shape">Auto Shape</button>
      <button id="clear-drawing">Clear</button>
      <span class="info-text">Draw only the outline; interior is auto-filled.</span>
    </div>
    <div class="drawing-container">
      <div id="shape-canvas"></div>
      <div class="drawing-info">
        <div>Current boxes: <span id="current-boxes">0</span></div>
      </div>
    </div>
  </div>
  
  <!-- Text interface -->
  <div id="text-interface" class="input-section" style="display: none;">
    <div class="input-group">
      <label>Shape type:</label>
      <button id="toggle-manual-shape" class="shape-toggle active">Manual</button>
      <button id="toggle-plancherel-shape" class="shape-toggle">Plancherel</button>
      <button id="toggle-staircase-shape" class="shape-toggle">Staircase</button>
    </div>
    
    <div id="manual-shape-input" class="shape-input-section">
      <div class="input-group">
        <label for="shape-input">Shape (rows):</label>
        <input type="text" id="shape-input" value="50^50">
      </div>
    </div>
    
    <div id="plancherel-shape-input" class="shape-input-section" style="display: none;">
      <div class="input-group">
        <label for="plancherel-n">Number of boxes (N):</label>
        <input type="number" id="plancherel-n" value="100" min="1" max="10000">
        <span class="info-text">Samples random partition with Plancherel measure</span>
      </div>
    </div>
    
    <div id="staircase-shape-input" class="shape-input-section" style="display: none;">
      <div class="input-group">
        <label for="staircase-k">Staircase k:</label>
        <input type="number" id="staircase-k" value="10" min="1" max="1000">
        <span class="info-text">Generates staircase shape k, k-1, ..., 1</span>
      </div>
    </div>
  </div>
  
  <div class="input-group">
    <button id="generate-tableau">Generate SYT</button>
    <span id="hook-wasm-indicator" style="margin-left:10px;color:var(--text-secondary,#666);"></span>
  </div>
  
  <div id="progress-container" style="display: none; margin-top: 10px;">
    <div class="progress-bar">
      <div id="progress-fill" class="progress-fill"></div>
    </div>
    <div id="progress-text" class="progress-text">Generating SYT...</div>
  </div>
</div>

<div id="hook-tableau-container" class="section"></div>

<script>
// Rename the module to avoid conflicts with RSK
if (typeof Module !== 'undefined') {
  window.HookModule = Module;
}

class HookWalkVis {
  constructor() {
    this.shape = Array(50).fill(50);
    this.N     = 2500;
    this.tableau = [];
    this.wasm   = null;
    this.drawMode = true;
    this.drawnShape = [];
    this.canvasSize    = 400;           // keeps the UI spec
    this.gridResolution = 100;          // keep
    this.pixelSize     = this.canvasSize / this.gridResolution;
    
    // === NEW ===
    this.borderGrid  = Array.from({length:this.gridResolution},
                       _=>Array(this.gridResolution).fill(false));   // 1 = border pixel
    this.isDrawing   = false;            // drag-state
    this.drawAction  = true;             // add or erase on this drag
    this.prevRow = null;                 // remember previous grid cell while dragging
    this.prevCol = null;                 //  …   …
    this.usePlancherel = false;
    this.shapeMode = 'manual';
    this.plancherelData = null;
    this.initWASM();
    this.setupEvents();
    this.setupCollapsibleDetails();
    this.initDrawingCanvas();
    this.loadPlancherelData();      // leave the grid empty; user draws border
  }

  async initWASM(){
    if (typeof HookModule !== 'undefined'){
      await HookModule.ready;
      this.wasm = HookModule;
      document.getElementById('hook-wasm-indicator').textContent = '(WASM ready for N>500)';
      document.getElementById('hook-wasm-indicator').style.color = 'var(--accent-color,#28a745)';
    } else {
      document.getElementById('hook-wasm-indicator').textContent='(JavaScript mode)';
    }
  }

  setupEvents(){
    document.getElementById('generate-tableau').addEventListener('click',()=>this.generate());
    document.getElementById('toggle-draw-mode').addEventListener('click',()=>this.setDrawMode(true));
    document.getElementById('toggle-text-mode').addEventListener('click',()=>this.setDrawMode(false));
    document.getElementById('clear-drawing').addEventListener('click',()=>this.clearDrawing());
    document.getElementById('auto-shape').addEventListener('click',()=>this.updateDrawingFromTarget());
    document.getElementById('toggle-manual-shape').addEventListener('click',()=>this.setShapeMode('manual'));
    document.getElementById('toggle-plancherel-shape').addEventListener('click',()=>this.setShapeMode('plancherel'));
    document.getElementById('toggle-staircase-shape').addEventListener('click',()=>this.setShapeMode('staircase'));
  }

  setupCollapsibleDetails() {
    // Keep details element collapsed by default
    const details = document.getElementById('algorithm-description-details');
    if (details) {
      details.open = false;
    }
  }

  setDrawMode(isDraw) {
    this.drawMode = isDraw;
    document.getElementById('toggle-draw-mode').classList.toggle('active', isDraw);
    document.getElementById('toggle-text-mode').classList.toggle('active', !isDraw);
    document.getElementById('draw-interface').style.display = isDraw ? 'block' : 'none';
    document.getElementById('text-interface').style.display = isDraw ? 'none' : 'block';
  }

  setShapeMode(mode) {
    this.shapeMode = mode;
    document.getElementById('toggle-manual-shape').classList.toggle('active', mode === 'manual');
    document.getElementById('toggle-plancherel-shape').classList.toggle('active', mode === 'plancherel');
    document.getElementById('toggle-staircase-shape').classList.toggle('active', mode === 'staircase');
    
    document.getElementById('manual-shape-input').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('plancherel-shape-input').style.display = mode === 'plancherel' ? 'block' : 'none';
    document.getElementById('staircase-shape-input').style.display = mode === 'staircase' ? 'block' : 'none';
    
    // For backward compatibility
    this.usePlancherel = (mode === 'plancherel');
  }

  initDrawingCanvas() {
    const container = document.getElementById('shape-canvas');
    container.innerHTML = ''; // Clear existing content
    
    // Create HTML5 canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasSize;
    this.canvas.height = this.canvasSize;
    this.canvas.style.border = '2px solid #ccc';
    this.canvas.style.borderRadius = '4px';
    this.canvas.style.cursor = 'crosshair';
    this.canvas.style.display = 'block';
    
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    // borderGrid is already initialized in constructor
    
    this.setupCanvasEvents();
    this.drawCanvas();
    this.updateDrawingInfo();
  }

  drawLine(r0,c0,r1,c1,val){
    let dr = Math.abs(r1-r0), dc = Math.abs(c1-c0);
    let sr = (r0<r1)?1:-1,     sc = (c0<c1)?1:-1;
    let err = dr - dc;
    while(true){
      this.borderGrid[r0][c0] = val;
      if (r0===r1 && c0===c1) break;
      const e2 = 2*err;
      if (e2 > -dc){ err -= dc; r0 += sr; }
      if (e2 <  dr){ err += dr; c0 += sc; }
    }
  }

  setupCanvasEvents() {
    const start = (x,y)=>{
      const {row,col} = this.xy2rc(x,y);
      if(row<0) return;
      this.isDrawing = true;
      this.drawAction = !this.borderGrid[row][col];   // draw OR erase
      this.prevRow = row; this.prevCol = col;
      this.setBorder(row,col,this.drawAction);
    };

    const move = (x,y)=>{
      if(!this.isDrawing) return;
      const {row,col} = this.xy2rc(x,y);
      if(row===this.prevRow && col===this.prevCol) return;
      /* interpolate the skipped cells */
      if(this.drawAction) this.drawLine(this.prevRow,this.prevCol,row,col,true);
      else                this.drawLine(this.prevRow,this.prevCol,row,col,false);
      this.prevRow = row; this.prevCol = col;
      this.drawCanvas();
      this.updateDrawingInfo();
    };

    const stop = ()=>{
      this.isDrawing = false;
      this.prevRow = this.prevCol = null;
    };

    /* mouse */
    this.canvas.addEventListener('mousedown',e=>start(e.offsetX,e.offsetY));
    this.canvas.addEventListener('mousemove',e=>move(e.offsetX,e.offsetY));
    window.addEventListener('mouseup',stop);

    /* touch (mobile) */
    this.canvas.addEventListener('touchstart',e=>{
        const t=e.touches[0]; const r=this.canvas.getBoundingClientRect();
        start(t.clientX-r.left,t.clientY-r.top); e.preventDefault();
    },{passive:false});
    this.canvas.addEventListener('touchmove',e=>{
        const t=e.touches[0]; const r=this.canvas.getBoundingClientRect();
        move(t.clientX-r.left,t.clientY-r.top); e.preventDefault();
    },{passive:false});
    window.addEventListener('touchend',stop);
  }

  xy2rc(x,y){        // canvas x,y → grid row,col
    return {row:Math.floor(y/this.pixelSize),
            col:Math.floor(x/this.pixelSize)};
  }
  setBorder(r,c,val){
    if(r<0||r>=this.gridResolution||c<0||c>=this.gridResolution) return;
    if(this.borderGrid[r][c]===val) return;
    this.borderGrid[r][c]=val;
    this.drawCanvas();
    this.updateDrawingInfo();
  }

  drawCanvas(){
    const ctx=this.ctx;
    ctx.clearRect(0,0,this.canvasSize,this.canvasSize);

    /* faint grid */
    ctx.strokeStyle='#f0f0f0'; ctx.lineWidth=0.5;
    for(let i=0;i<=this.canvasSize;i+=this.pixelSize){
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,this.canvasSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(this.canvasSize,i); ctx.stroke();
    }

    /* compute interior using north-west closure */
    const N = this.gridResolution;
    const interior = Array.from({length:N}, _=>Array(N).fill(false));
    for(let r=0; r<N; r++){
      for(let c=0; c<N; c++){
        if(!this.borderGrid[r][c]) continue;
        for(let rr=0; rr<=r; rr++){
          for(let cc=0; cc<=c; cc++){
            interior[rr][cc] = true;
          }
        }
      }
    }

    /* draw interior cells (black fill) */
    ctx.fillStyle='#000000';
    for(let r=0;r<N;r++)
      for(let c=0;c<N;c++)
        if(interior[r][c])
          ctx.fillRect(c*this.pixelSize, r*this.pixelSize,
                       this.pixelSize,     this.pixelSize);

    /* draw border cells (same black) */
    ctx.fillStyle='#000000';
    for(let r=0;r<N;r++)
      for(let c=0;c<N;c++)
        if(this.borderGrid[r][c])
          ctx.fillRect(c*this.pixelSize, r*this.pixelSize,
                       this.pixelSize,     this.pixelSize);
  }

  clearDrawing() {
    for(let r = 0; r < this.gridResolution; r++) {
      for(let c = 0; c < this.gridResolution; c++) {
        this.borderGrid[r][c] = false;
      }
    }
    this.drawCanvas();
    this.updateDrawingInfo();
  }

  updateDrawingFromTarget () {
    this.clearDrawing();

    const Nwant = parseInt(document.getElementById('target-boxes').value) || 100;
    const side  = Math.min(this.gridResolution-2, Math.ceil(Math.sqrt(Nwant)));

    // Simple square border, 1-pixel thick
    for (let c=0; c<side; c++) {                 // top & bottom
      this.borderGrid[0][c]      = true;
      this.borderGrid[side-1][c] = true;
    }
    for (let r=0; r<side; r++) {                 // left & right
      this.borderGrid[r][0]      = true;
      this.borderGrid[r][side-1] = true;
    }

    this.drawCanvas();
    this.updateDrawingInfo();
  }

  updateDrawingInfo() {
    this.drawnShape = this.getShapeFromDrawing();
    const boxes = this.drawnShape.reduce((a,b)=>a+b,0);
    document.getElementById('current-boxes').textContent = boxes;
    document.getElementById('target-boxes').value = boxes;
  }


  
  getShapeFromDrawing(){
    const N = this.gridResolution;
    const interior = Array.from({length:N}, _=>Array(N).fill(false));

    /* north-west closure: if (r,c) is border, mark all (r',c') with r'≤r AND c'≤c as interior */
    for(let r=0; r<N; r++){
      for(let c=0; c<N; c++){
        if(!this.borderGrid[r][c]) continue;
        for(let rr=0; rr<=r; rr++){
          for(let cc=0; cc<=c; cc++){
            interior[rr][cc] = true;
          }
        }
      }
    }

    /* read Young diagram row-lengths from interior */
    const rowLen = [];
    for(let r=0; r<N; r++){
      let len = 0;
      while(len < N && interior[r][len]) len++;
      if(len === 0 && rowLen.length) break;  // stop after first empty row
      if(len > 0) rowLen.push(len);
    }

    /* enforce non-increasing property */
    for(let i=1; i<rowLen.length; i++)
      if(rowLen[i] > rowLen[i-1]) rowLen[i] = rowLen[i-1];

    return rowLen;
  }

  parseShape(){
    let arr;
    
    if(this.drawMode) {
      // Use drawn shape
      arr = this.getShapeFromDrawing();
      if(!arr.length){ 
        alert('Draw a closed border first'); 
        return null; 
      }
      
      /* rescale to N if necessary */
      const Nwanted = parseInt(document.getElementById('target-boxes').value)||1;
      const Ncurr   = arr.reduce((a,b)=>a+b,0);
      if(Ncurr!==Nwanted){
         arr = this.scalePartition2D(arr,Nwanted); // 2-D block scale
      }
    } else if(this.shapeMode === 'plancherel') {
      // Generate Plancherel random partition
      const n = parseInt(document.getElementById('plancherel-n').value) || 100;
      arr = this.samplePlancherelPartition(n);
      if(!arr.length){ 
        alert('Failed to generate Plancherel partition'); 
        return null; 
      }
    } else if(this.shapeMode === 'staircase') {
      // Generate staircase shape k,k-1,...,1
      const k = parseInt(document.getElementById('staircase-k').value) || 10;
      arr = [];
      for(let i = k; i >= 1; i--) {
        arr.push(i);
      }
    } else {
      // Use manual text input
      const txt = document.getElementById('shape-input').value;
      const parts = txt.split(',').map(x=>x.trim());
      arr = [];
      
      for(const part of parts){
        if(part.includes('^')){
          // Handle exponential notation like "100^50"
          const [len, count] = part.split('^').map(x=>parseInt(x.trim()));
          if(isNaN(len) || isNaN(count) || len<=0 || count<=0){
            alert('Bad shape format: ' + part); 
            return null;
          }
          for(let i=0; i<count; i++) arr.push(len);
        } else {
          // Handle single number
          const len = parseInt(part);
          if(isNaN(len) || len<=0){
            alert('Bad shape format: ' + part); 
            return null;
          }
          arr.push(len);
        }
      }
      
      if(!arr.length){ alert('Bad shape'); return null; }
    }
    
    this.shape = arr;
    this.N = arr.reduce((a,b)=>a+b,0);
    return arr;
  }

  async loadPlancherelData() {
    try {
      const response = await fetch('{{site.url}}/js/2025-05-04-dim-lambda-partitionData.json');
      this.plancherelData = await response.json();
      console.log('Loaded Plancherel partition data for sizes up to', Math.max(...Object.keys(this.plancherelData).map(Number)));
    } catch (error) {
      console.log('Could not load Plancherel data, using fallback algorithm');
    }
  }

  samplePlancherelPartition(n) {
    // Use precomputed data if available, otherwise fallback to approximation
    if (this.plancherelData && this.plancherelData[n]) {
      // Direct lookup - the data has one partition per size
      const partitionData = this.plancherelData[n];
      return [...partitionData.partition]; // Copy to avoid mutation
    }
    
    // For large n > 5000, use block scaling
    if (this.plancherelData && n > 5000) {
      // Find k such that n/k² ≤ 5000, so k² ≥ n/5000
      const minK2 = n / 5000;
      const k = Math.ceil(Math.sqrt(minK2));
      const targetSize = Math.floor(n / (k * k));
      
      if (this.plancherelData[targetSize]) {
        const partitionData = this.plancherelData[targetSize];
        return this.blockScalePartition(partitionData.partition, k);
      }
      
      // If exact targetSize not available, find closest
      const sizes = Object.keys(this.plancherelData).map(Number).sort((a,b) => a - b);
      const closestSize = sizes.reduce((prev, curr) => 
        Math.abs(curr - targetSize) < Math.abs(prev - targetSize) ? curr : prev
      );
      
      if (closestSize && this.plancherelData[closestSize]) {
        const partitionData = this.plancherelData[closestSize];
        const blockScaled = this.blockScalePartition(partitionData.partition, k);
        
        // Fine-tune to get exactly n boxes
        return this.adjustPartitionSize(blockScaled, n);
      }
    }
    
    // Fallback: find closest size in data and scale
    if (this.plancherelData) {
      const sizes = Object.keys(this.plancherelData).map(Number).sort((a,b) => a - b);
      const closestSize = sizes.reduce((prev, curr) => 
        Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev
      );
      
      if (closestSize && this.plancherelData[closestSize]) {
        const partitionData = this.plancherelData[closestSize];
        // Scale the partition to target size n
        return this.scalePartition(partitionData.partition, n);
      }
    }
    
    // Ultimate fallback: simple approximation
    return this.fallbackPlancherelPartition(n);
  }

  blockScalePartition(partition, k) {
    // Replace each cell with a k×k block
    // Each row of length L becomes k rows of length L*k
    const scaledPartition = [];
    
    for (let i = 0; i < partition.length; i++) {
      const rowLength = partition[i];
      const scaledRowLength = rowLength * k;
      
      // Add k copies of this scaled row
      for (let j = 0; j < k; j++) {
        scaledPartition.push(scaledRowLength);
      }
    }
    
    return scaledPartition;
  }

  adjustPartitionSize(partition, targetN) {
    const currentN = partition.reduce((a,b) => a + b, 0);
    if (currentN === targetN) return partition;
    
    // Make a copy to avoid mutating input
    const adjusted = [...partition];
    
    if (currentN < targetN) {
      // Add boxes by extending rows (prefer longer rows)
      let diff = targetN - currentN;
      let i = 0;
      while (diff > 0 && i < adjusted.length) {
        adjusted[i]++;
        diff--;
        i = (i + 1) % adjusted.length;
      }
    } else if (currentN > targetN) {
      // Remove boxes by shortening rows (prefer shorter rows)
      let diff = currentN - targetN;
      for (let i = adjusted.length - 1; i >= 0 && diff > 0; i--) {
        if (adjusted[i] > 1) {
          adjusted[i]--;
          diff--;
        }
      }
    }
    
    // Ensure monotonicity
    adjusted.sort((a,b) => b - a);
    for (let i = 1; i < adjusted.length; i++) {
      if (adjusted[i] > adjusted[i-1]) adjusted[i] = adjusted[i-1];
    }
    
    return adjusted.filter(x => x > 0);
  }

  scalePartition(partition, targetN) {
    const currentN = partition.reduce((a,b) => a + b, 0);
    if (currentN === targetN) return [...partition];
    
    const scale = targetN / currentN;
    let scaled = partition.map(x => Math.max(1, Math.round(x * scale)));
    
    // Adjust to exact target
    let sum = scaled.reduce((a,b) => a + b, 0);
    let i = 0;
    while (sum < targetN && i < scaled.length) {
      scaled[i]++;
      sum++;
      i = (i + 1) % scaled.length;
    }
    while (sum > targetN && i < scaled.length) {
      if (scaled[i] > 1) {
        scaled[i]--;
        sum--;
      }
      i++;
    }
    
    // Ensure monotonicity
    scaled.sort((a,b) => b - a);
    for (let i = 1; i < scaled.length; i++) {
      if (scaled[i] > scaled[i-1]) scaled[i] = scaled[i-1];
    }
    
    return scaled.filter(x => x > 0);
  }

  /* === true 2-D scaler: block + fine-tune ========================== */
  scalePartition2D (partition, targetN) {
    const currentN = partition.reduce((a,b)=>a+b,0);
    if (currentN === 0) return [];

    /* k×k block blow-up so area ≥ target ---------------------------- */
    const k = Math.max(1, Math.ceil(Math.sqrt(targetN / currentN)));
    let scaled = this.blockScalePartition(partition, k);   // already defined

    /* fine-tune to *exactly* targetN using existing helper ---------- */
    return this.adjustPartitionSize(scaled, targetN);       // already defined
  }

  fallbackPlancherelPartition(n) {
    // Simple approximation: roughly square with some randomness
    const side = Math.floor(Math.sqrt(n));
    const partition = [];
    
    for (let i = 0; i < side + 5; i++) {
      const baseLength = side - Math.floor(i/2);
      const noise = Math.floor(this.gaussianRandom() * Math.sqrt(side));
      const length = Math.max(1, baseLength + noise);
      
      if (length > 0) partition.push(length);
    }
    
    return this.scalePartition(partition, n);
  }

  gaussianRandom() {
    // Box-Muller transform for standard normal
    if(this.spare !== undefined) {
      const tmp = this.spare;
      delete this.spare;
      return tmp;
    }
    const u = Math.random(), v = Math.random();
    const mag = Math.sqrt(-2 * Math.log(u));
    this.spare = mag * Math.cos(2 * Math.PI * v);
    return mag * Math.sin(2 * Math.PI * v);
  }

  async generate(){
    if(!this.parseShape()) return;

    // Show progress bar for large N
    const showProgress = this.N > 10000;
    if(showProgress) {
      this.showProgressBar(true);
      this.updateProgress(0, 'Initializing...');
      // Small delay to let UI update
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    try {
      if(this.wasm && this.N>500){
        // use WASM with progress updates
        if(showProgress) this.updateProgress(20, 'Preparing WASM...');
        
        const sample = this.wasm.cwrap('sampleHookWalk','string',['string']);
        const getShape = this.wasm.cwrap('getTableauShape','string',[]);
        const getEntry = this.wasm.cwrap('getTableauEntry','number',['number','number']);
        
        if(showProgress) this.updateProgress(40, 'Sampling tableau...');
        const status = sample(this.shape.join(','));
        
        if(status!=='OK'){ 
          alert('WASM failed'); 
          if(showProgress) this.showProgressBar(false);
          return;
        }
        
        if(showProgress) this.updateProgress(70, 'Reading tableau...');
        
        // rebuild tableau from wasm
        this.tableau = this.shape.map(r=>Array(r).fill(0));
        const totalCells = this.N;
        let processedCells = 0;
        
        for(let r=0;r<this.shape.length;r++){
          for(let c=0;c<this.shape[r];c++){
            this.tableau[r][c]=getEntry(r,c);
            processedCells++;
            
            // Update progress periodically
            if(showProgress && processedCells % Math.max(1, Math.floor(totalCells/50)) === 0) {
              const progress = 70 + (processedCells / totalCells) * 20;
              this.updateProgress(progress, `Reading tableau... ${Math.floor(processedCells/totalCells*100)}%`);
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
        }
        
        if(showProgress) this.updateProgress(95, 'Rendering...');
      } else {
        // fallback JS hook-walk with progress
        if(showProgress) this.updateProgress(30, 'Generating with JavaScript...');
        this.tableau = await this.sampleHookWalkJSWithProgress(showProgress);
      }

      if(showProgress) this.updateProgress(100, 'Complete!');
      this.draw();
      
      if(showProgress) {
        setTimeout(() => this.showProgressBar(false), 1000);
      }
    } catch(error) {
      console.error('Generation failed:', error);
      if(showProgress) this.showProgressBar(false);
      alert('Failed to generate tableau');
    }
  }

  showProgressBar(show) {
    document.getElementById('progress-container').style.display = show ? 'block' : 'none';
  }

  updateProgress(percent, text) {
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-text').textContent = text;
  }

  /* ---------- NEW: uniform GNW hook-walk (N ≤ 500) ---------- */
  sampleHookWalkJS () {
    const rowLen = [...this.shape];                       // active row lengths
    const tableau = rowLen.map(r => Array(r).fill(0));

    /* active cell list, kept in row-major order                         */
    let cells = [];
    for (let r = 0; r < rowLen.length; ++r)
      for (let c = 0; c < rowLen[r]; ++c) cells.push([r, c]);

    for (let k = this.N; k >= 1; --k) {

      /* --- 1. start square = uniform among *all* empty squares ------- */
      const start = Math.floor(Math.random() * cells.length);
      let [r, c] = cells[start];

      /* --- 2. hook walk until (r,c) is a corner ---------------------- */
      while (true) {
        const arm = rowLen[r] - c - 1;                        // squares to the right
        let leg = 0;                                          // squares below
        for (let rr = r + 1; rr < rowLen.length && c < rowLen[rr]; ++rr) leg++;

        if (arm === 0 && leg === 0) break;                    // now a corner

        /* choose a *different* square in the hook uniformly at random  */
        const step = 1 + Math.floor(Math.random() * (arm + leg));
        if (step <= arm)            c += step;                // move right
        else                        r += (step - arm);        // move down
      }

      /* --- 3. fill the corner and shrink the active diagram --------- */
      tableau[r][c] = k;
      rowLen[r]--;                                            // corner removed

      /* fast in-place filter of the active-cell array                  */
      const newCells = [];
      for (const [rr, cc] of cells) {
        if (rr === r && cc === c) continue;                   // removed cell
        if (cc >= rowLen[rr])       continue;                 // past new row end
        newCells.push([rr, cc]);
      }
      cells = newCells;
    }
    return tableau;
  }

  async sampleHookWalkJSWithProgress(showProgress) {
    const rowLen = [...this.shape];
    const tableau = rowLen.map(r => Array(r).fill(0));

    let cells = [];
    for (let r = 0; r < rowLen.length; ++r)
      for (let c = 0; c < rowLen[r]; ++c) cells.push([r, c]);

    for (let k = this.N; k >= 1; --k) {
      const start = Math.floor(Math.random() * cells.length);
      let [r, c] = cells[start];

      while (true) {
        const arm = rowLen[r] - c - 1;
        let leg = 0;
        for (let rr = r + 1; rr < rowLen.length && c < rowLen[rr]; ++rr) leg++;
        if (arm === 0 && leg === 0) break;
        const step = 1 + Math.floor(Math.random() * (arm + leg));
        if (step <= arm) c += step;
        else r += (step - arm);
      }

      tableau[r][c] = k;
      rowLen[r]--;

      const newCells = [];
      for (const [rr, cc] of cells) {
        if (rr === r && cc === c) continue;
        if (cc >= rowLen[rr]) continue;
        newCells.push([rr, cc]);
      }
      cells = newCells;

      // Update progress every 100 steps for large N
      if (showProgress && (this.N - k) % Math.max(1, Math.floor(this.N/100)) === 0) {
        const progress = 30 + ((this.N - k) / this.N) * 60;
        this.updateProgress(progress, `Processing... ${Math.floor((this.N - k)/this.N*100)}%`);
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    return tableau;
  }

  /* ----------- drawing -------------- */
  draw(){
    const cont = document.getElementById('hook-tableau-container');
    cont.innerHTML='';
    if(this.N<=200){ this.drawSmall(cont); }
    else            { this.drawLarge(cont); }
  }

  drawSmall(cont){
    const containerWidth = cont.offsetWidth || 800;
    const containerHeight = window.innerHeight * 0.8; // 80% of viewport height
    const rows=this.tableau.length;
    const cols=Math.max(...this.shape);
    const pad=10;
    
    // Calculate cell size based on both width and height constraints
    const cellSizeByWidth = (containerWidth - 2*pad) / cols;
    const cellSizeByHeight = (containerHeight - 2*pad) / rows;
    const cellSize = Math.min(40, cellSizeByWidth, cellSizeByHeight);
    
    const width = cols * cellSize + 2*pad;
    const height = rows * cellSize + 2*pad;
    
    const svg=d3.select(cont).append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-height', containerHeight + 'px');
    const g=svg.append('g').attr('transform',`translate(${pad},${pad})`);
    
    this.tableau.forEach((row,r)=>{
      row.forEach((val,c)=>{
        g.append('rect').attr('x',c*cellSize).attr('y',r*cellSize)
          .attr('width',cellSize).attr('height',cellSize)
          .attr('class','tableau-cell filled');
        g.append('text').attr('x',c*cellSize+cellSize/2).attr('y',r*cellSize+cellSize/2)
          .attr('class','tableau-text')
          .style('font-size', Math.min(14, cellSize*0.6) + 'px')
          .text(val);
      });
    });
  }

  drawLarge(cont){
    const containerWidth = cont.offsetWidth || 800;
    const containerHeight = window.innerHeight * 0.8; // 80% of viewport height
    const rows=this.shape.length;
    const cols=Math.max(...this.shape);
    const pad=10;
    
    // Calculate cell size based on both width and height constraints
    const cellSizeByWidth = (containerWidth - 2*pad) / cols;
    const cellSizeByHeight = (containerHeight - 2*pad) / rows;
    const cellSize = Math.max(1, Math.min(cellSizeByWidth, cellSizeByHeight));
    
    const width = cols * cellSize + 2*pad;
    const height = rows * cellSize + 2*pad;
    
    const svg=d3.select(cont).append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-height', containerHeight + 'px');
    const g=svg.append('g').attr('transform',`translate(${pad},${pad})`);
    
    const thresholds=[];
    for(let i=1;i<10;i++) thresholds.push(i*this.N/10);
    
    // UVA color palette: orange (inside/small values) to blue (outside/large values)
    const uvaColors = [];
    for(let i=0; i<10; i++) {
      const t = i / 9; // 0 to 1
      const r = Math.round((1-t) * 229 + t * 35);  // E57200 to 232D4B
      const g_val = Math.round((1-t) * 114 + t * 45);
      const b = Math.round((1-t) * 0 + t * 75);
      uvaColors.push(`rgb(${r},${g_val},${b})`);
    }
    
    this.tableau.forEach((row,r)=>{
      row.forEach((val,c)=>{
        let idx=thresholds.findIndex(t=>val<=t)+1; // 1..10
        g.append('rect').attr('x',c*cellSize).attr('y',r*cellSize)
          .attr('width',cellSize).attr('height',cellSize)
          .attr('fill',uvaColors[idx-1]).attr('stroke-width',0);
      });
    });
  }
}

const hookVis=new HookWalkVis();
</script>

