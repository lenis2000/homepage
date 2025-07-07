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
        
        <h4>Shape notation:</h4>
        <p>Enter row lengths separated by commas. Use exponential notation like <code>100^50</code> for 50 rows of length 100.</p>
        <p><strong>Examples:</strong> <code>5,5,5</code> or <code>100^100</code> or <code>200^10,100^5,50^20</code></p>
        
        <h4>Visualization:</h4>
        <ul>
            <li><strong>Small tableaux (≤200 boxes):</strong> Individual numbers displayed in cells</li>
            <li><strong>Large tableaux (>200 boxes):</strong> Heat map showing value distribution by deciles</li>
        </ul>
    </div>
</details>

<div class="controls">
  <div class="input-group">
    <label for="shape-input">Shape (rows):</label>
    <input type="text" id="shape-input" value="50^50">
    <button id="generate-tableau">Generate SYT</button>
    <span id="hook-wasm-indicator" style="margin-left:10px;color:var(--text-secondary,#666);"></span>
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
    this.initWASM();
    this.setupEvents();
    this.setupCollapsibleDetails();
    this.generate(); // Generate initial tableau
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
  }

  setupCollapsibleDetails() {
    // Keep details element collapsed by default
    const details = document.getElementById('algorithm-description-details');
    if (details) {
      details.open = false;
    }
  }

  parseShape(){
    const txt = document.getElementById('shape-input').value;
    const parts = txt.split(',').map(x=>x.trim());
    const arr = [];
    
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
    this.shape = arr;
    this.N = arr.reduce((a,b)=>a+b,0);
    return arr;
  }

  async generate(){
    if(!this.parseShape()) return;

    if(this.wasm && this.N>500){
      // use WASM
      const sample = this.wasm.cwrap('sampleHookWalk','string',['string']);
      const getShape = this.wasm.cwrap('getTableauShape','string',[]);
      const getEntry = this.wasm.cwrap('getTableauEntry','number',['number','number']);
      const status = sample(this.shape.join(','));
      if(status!=='OK'){ alert('WASM failed'); return;}
      // rebuild tableau from wasm
      this.tableau = this.shape.map(r=>Array(r).fill(0));
      for(let r=0;r<this.shape.length;r++){
        for(let c=0;c<this.shape[r];c++){
          this.tableau[r][c]=getEntry(r,c);
        }
      }
    } else {
      // fallback JS hook-walk
      this.tableau = this.sampleHookWalkJS();
    }

    this.draw();
    
    // Debug: print tableau to console
    console.log('Generated SYT for shape:', this.shape.join(','));
    console.log('Total boxes N =', this.N);
    console.log('Tableau:');
    this.tableau.forEach((row, i) => {
      console.log(`Row ${i}: [${row.join(', ')}]`);
    });
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
    const palette=['#e3f2fd','#bbdefb','#90caf9','#64b5f6','#42a5f5',
                   '#2196f3','#1e88e5','#1976d2','#1565c0','#0d47a1']; // light→dark
    this.tableau.forEach((row,r)=>{
      row.forEach((val,c)=>{
        let idx=thresholds.findIndex(t=>val<=t)+1; // 1..10
        g.append('rect').attr('x',c*cellSize).attr('y',r*cellSize)
          .attr('width',cellSize).attr('height',cellSize)
          .attr('fill',palette[idx-1]).attr('stroke-width',0);
      });
    });
  }
}

const hookVis=new HookWalkVis();
</script>

