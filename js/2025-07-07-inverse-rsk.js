/* global HookModule */
/* eslint-disable no-await-in-loop, max-lines */

(function () {
  /* ---------------------------------- 0. Utilities ---------------------------------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------------------------- 1. Shape UI Class ---------------------------------- */
  
  /**
   * Complete shape input UI class borrowed from HookWalkVis
   * Handles drawing, text input, and Plancherel mode
   */
  class ShapeInputVis {
    constructor(hostId) {
      this.host = document.getElementById(hostId);
      if (!this.host) {
        return;
      }
      this.drawMode = true;
      this.usePlancherel = false;
      this.shapeMode = 'manual';
      this.plancherelData = null;
      this.canvasSize = 400;
      this.gridResolution = 100;
      this.pixelSize = this.canvasSize / this.gridResolution;
      
      this.borderGrid = Array.from({length: this.gridResolution}, 
                        _ => Array(this.gridResolution).fill(false));
      this.isDrawing = false;
      this.drawAction = true;
      this.prevRow = null;
      this.prevCol = null;
      
      this.initUI();
      this.setupEvents();
      this.initDrawingCanvas();
      this.loadPlancherelData();
    }

    initUI() {
      if (!this.host) {
        return;
      }
      this.host.innerHTML = `
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
        </div>
      `;
    }

    setupEvents() {
      document.getElementById('toggle-draw-mode').addEventListener('click', () => this.setDrawMode(true));
      document.getElementById('toggle-text-mode').addEventListener('click', () => this.setDrawMode(false));
      document.getElementById('clear-drawing').addEventListener('click', () => this.clearDrawing());
      document.getElementById('auto-shape').addEventListener('click', () => this.updateDrawingFromTarget());
      document.getElementById('toggle-manual-shape').addEventListener('click', () => this.setShapeMode('manual'));
      document.getElementById('toggle-plancherel-shape').addEventListener('click', () => this.setShapeMode('plancherel'));
      document.getElementById('toggle-staircase-shape').addEventListener('click', () => this.setShapeMode('staircase'));
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
      container.innerHTML = '';
      
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.canvasSize;
      this.canvas.height = this.canvasSize;
      this.canvas.style.border = '2px solid #ccc';
      this.canvas.style.borderRadius = '4px';
      this.canvas.style.cursor = 'crosshair';
      this.canvas.style.display = 'block';
      
      container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      
      this.setupCanvasEvents();
      this.drawCanvas();
      this.updateDrawingInfo();
    }

    drawLine(r0, c0, r1, c1, val) {
      let dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0);
      let sr = (r0 < r1) ? 1 : -1, sc = (c0 < c1) ? 1 : -1;
      let err = dr - dc;
      while (true) {
        this.borderGrid[r0][c0] = val;
        if (r0 === r1 && c0 === c1) break;
        const e2 = 2 * err;
        if (e2 > -dc) { err -= dc; r0 += sr; }
        if (e2 < dr) { err += dr; c0 += sc; }
      }
    }

    setupCanvasEvents() {
      const start = (x, y) => {
        const {row, col} = this.xy2rc(x, y);
        if (row < 0) return;
        this.isDrawing = true;
        this.drawAction = !this.borderGrid[row][col];
        this.prevRow = row; this.prevCol = col;
        this.setBorder(row, col, this.drawAction);
      };

      const move = (x, y) => {
        if (!this.isDrawing) return;
        const {row, col} = this.xy2rc(x, y);
        if (row === this.prevRow && col === this.prevCol) return;
        
        if (this.drawAction) this.drawLine(this.prevRow, this.prevCol, row, col, true);
        else this.drawLine(this.prevRow, this.prevCol, row, col, false);
        this.prevRow = row; this.prevCol = col;
        this.drawCanvas();
        this.updateDrawingInfo();
      };

      const stop = () => {
        this.isDrawing = false;
        this.prevRow = this.prevCol = null;
      };

      this.canvas.addEventListener('mousedown', e => start(e.offsetX, e.offsetY));
      this.canvas.addEventListener('mousemove', e => move(e.offsetX, e.offsetY));
      window.addEventListener('mouseup', stop);

      this.canvas.addEventListener('touchstart', e => {
        const t = e.touches[0]; const r = this.canvas.getBoundingClientRect();
        start(t.clientX - r.left, t.clientY - r.top); e.preventDefault();
      }, {passive: false});
      this.canvas.addEventListener('touchmove', e => {
        const t = e.touches[0]; const r = this.canvas.getBoundingClientRect();
        move(t.clientX - r.left, t.clientY - r.top); e.preventDefault();
      }, {passive: false});
      window.addEventListener('touchend', stop);
    }

    xy2rc(x, y) {
      return {row: Math.floor(y / this.pixelSize), col: Math.floor(x / this.pixelSize)};
    }

    setBorder(r, c, val) {
      if (r < 0 || r >= this.gridResolution || c < 0 || c >= this.gridResolution) return;
      if (this.borderGrid[r][c] === val) return;
      this.borderGrid[r][c] = val;
      this.drawCanvas();
      this.updateDrawingInfo();
    }

    drawCanvas() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 0.5;
      for (let i = 0; i <= this.canvasSize; i += this.pixelSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, this.canvasSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(this.canvasSize, i); ctx.stroke();
      }

      const N = this.gridResolution;
      const interior = Array.from({length: N}, _ => Array(N).fill(false));
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (!this.borderGrid[r][c]) continue;
          for (let rr = 0; rr <= r; rr++) {
            for (let cc = 0; cc <= c; cc++) {
              interior[rr][cc] = true;
            }
          }
        }
      }

      ctx.fillStyle = '#000000';
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (interior[r][c])
            ctx.fillRect(c * this.pixelSize, r * this.pixelSize, this.pixelSize, this.pixelSize);

      ctx.fillStyle = '#000000';
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (this.borderGrid[r][c])
            ctx.fillRect(c * this.pixelSize, r * this.pixelSize, this.pixelSize, this.pixelSize);
    }

    clearDrawing() {
      for (let r = 0; r < this.gridResolution; r++) {
        for (let c = 0; c < this.gridResolution; c++) {
          this.borderGrid[r][c] = false;
        }
      }
      this.drawCanvas();
      this.updateDrawingInfo();
    }

    updateDrawingFromTarget() {
      this.clearDrawing();

      const Nwant = parseInt(document.getElementById('target-boxes').value) || 100;
      const side = Math.min(this.gridResolution - 2, Math.ceil(Math.sqrt(Nwant)));

      for (let c = 0; c < side; c++) {
        this.borderGrid[0][c] = true;
        this.borderGrid[side - 1][c] = true;
      }
      for (let r = 0; r < side; r++) {
        this.borderGrid[r][0] = true;
        this.borderGrid[r][side - 1] = true;
      }

      this.drawCanvas();
      this.updateDrawingInfo();
    }

    updateDrawingInfo() {
      const drawnShape = this.getShapeFromDrawing();
      const boxes = drawnShape.reduce((a, b) => a + b, 0);
      document.getElementById('current-boxes').textContent = boxes;
      document.getElementById('target-boxes').value = boxes;
    }

    getShapeFromDrawing() {
      const N = this.gridResolution;
      const interior = Array.from({length: N}, _ => Array(N).fill(false));

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (!this.borderGrid[r][c]) continue;
          for (let rr = 0; rr <= r; rr++) {
            for (let cc = 0; cc <= c; cc++) {
              interior[rr][cc] = true;
            }
          }
        }
      }

      const rowLen = [];
      for (let r = 0; r < N; r++) {
        let len = 0;
        while (len < N && interior[r][len]) len++;
        if (len === 0 && rowLen.length) break;
        if (len > 0) rowLen.push(len);
      }

      for (let i = 1; i < rowLen.length; i++)
        if (rowLen[i] > rowLen[i - 1]) rowLen[i] = rowLen[i - 1];

      return rowLen;
    }

    async loadPlancherelData() {
      try {
        const response = await fetch('/js/2025-05-04-dim-lambda-partitionData.json');
        this.plancherelData = await response.json();
      } catch (error) {
        // Could not load Plancherel data, using fallback algorithm
      }
    }

    samplePlancherelPartition(n) {
      if (this.plancherelData && this.plancherelData[n]) {
        const partitionData = this.plancherelData[n];
        return [...partitionData.partition];
      }
      
      if (this.plancherelData && n > 5000) {
        const minK2 = n / 5000;
        const k = Math.ceil(Math.sqrt(minK2));
        const targetSize = Math.floor(n / (k * k));
        
        if (this.plancherelData[targetSize]) {
          const partitionData = this.plancherelData[targetSize];
          return this.blockScalePartition(partitionData.partition, k);
        }
      }
      
      return this.fallbackPlancherelPartition(n);
    }

    blockScalePartition(partition, k) {
      const scaledPartition = [];
      for (let i = 0; i < partition.length; i++) {
        const rowLength = partition[i];
        const scaledRowLength = rowLength * k;
        for (let j = 0; j < k; j++) {
          scaledPartition.push(scaledRowLength);
        }
      }
      return scaledPartition;
    }

    scalePartition2D(partition, targetN) {
      const currentN = partition.reduce((a, b) => a + b, 0);
      if (currentN === 0) return [];

      const k = Math.max(1, Math.ceil(Math.sqrt(targetN / currentN)));
      let scaled = this.blockScalePartition(partition, k);
      return this.adjustPartitionSize(scaled, targetN);
    }

    adjustPartitionSize(partition, targetN) {
      const currentN = partition.reduce((a, b) => a + b, 0);
      if (currentN === targetN) return partition;
      
      const adjusted = [...partition];
      
      if (currentN < targetN) {
        let diff = targetN - currentN;
        let i = 0;
        while (diff > 0 && i < adjusted.length) {
          adjusted[i]++;
          diff--;
          i = (i + 1) % adjusted.length;
        }
      } else if (currentN > targetN) {
        let diff = currentN - targetN;
        for (let i = adjusted.length - 1; i >= 0 && diff > 0; i--) {
          if (adjusted[i] > 1) {
            adjusted[i]--;
            diff--;
          }
        }
      }
      
      adjusted.sort((a, b) => b - a);
      for (let i = 1; i < adjusted.length; i++) {
        if (adjusted[i] > adjusted[i - 1]) adjusted[i] = adjusted[i - 1];
      }
      
      return adjusted.filter(x => x > 0);
    }

    fallbackPlancherelPartition(n) {
      const side = Math.floor(Math.sqrt(n));
      const partition = [];
      
      for (let i = 0; i < side + 5; i++) {
        const baseLength = side - Math.floor(i / 2);
        const noise = Math.floor(this.gaussianRandom() * Math.sqrt(side));
        const length = Math.max(1, baseLength + noise);
        
        if (length > 0) partition.push(length);
      }
      
      return this.scalePartition(partition, n);
    }

    scalePartition(partition, targetN) {
      const currentN = partition.reduce((a, b) => a + b, 0);
      if (currentN === targetN) return [...partition];
      
      const scale = targetN / currentN;
      let scaled = partition.map(x => Math.max(1, Math.round(x * scale)));
      
      let sum = scaled.reduce((a, b) => a + b, 0);
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
      
      scaled.sort((a, b) => b - a);
      for (let i = 1; i < scaled.length; i++) {
        if (scaled[i] > scaled[i - 1]) scaled[i] = scaled[i - 1];
      }
      
      return scaled.filter(x => x > 0);
    }

    gaussianRandom() {
      if (this.spare !== undefined) {
        const tmp = this.spare;
        delete this.spare;
        return tmp;
      }
      const u = Math.random(), v = Math.random();
      const mag = Math.sqrt(-2 * Math.log(u));
      this.spare = mag * Math.cos(2 * Math.PI * v);
      return mag * Math.sin(2 * Math.PI * v);
    }

    parseShape() {
      let arr;
      
      if (this.drawMode) {
        try {
          arr = this.getShapeFromDrawing();
          if (!arr.length) {
            // Fall back to text input
            arr = [50, 50];  // Default 50x50 if drawing fails
          }
        } catch (error) {
          arr = [50, 50];  // Default fallback
        }
        
        const Nwanted = parseInt(document.getElementById('target-boxes').value) || 1;
        const Ncurr = arr.reduce((a, b) => a + b, 0);
        if (Ncurr !== Nwanted) {
          arr = this.scalePartition2D(arr, Nwanted);
        }
      } else if (this.shapeMode === 'plancherel') {
        const n = parseInt(document.getElementById('plancherel-n').value) || 100;
        arr = this.samplePlancherelPartition(n);
        if (!arr.length) {
          alert('Failed to generate Plancherel partition');
          return null;
        }
      } else if (this.shapeMode === 'staircase') {
        const k = parseInt(document.getElementById('staircase-k').value) || 10;
        arr = [];
        for (let i = k; i >= 1; i--) {
          arr.push(i);
        }
      } else {
        const txt = document.getElementById('shape-input').value;
        const parts = txt.split(',').map(x => x.trim());
        arr = [];
        
        for (const part of parts) {
          if (part.includes('^')) {
            const [len, count] = part.split('^').map(x => parseInt(x.trim()));
            if (isNaN(len) || isNaN(count) || len <= 0 || count <= 0) {
              alert('Bad shape format: ' + part);
              return null;
            }
            for (let i = 0; i < count; i++) arr.push(len);
          } else {
            const len = parseInt(part);
            if (isNaN(len) || len <= 0) {
              alert('Bad shape format: ' + part);
              return null;
            }
            arr.push(len);
          }
        }
        
        if (!arr.length) { alert('Bad shape'); return null; }
      }
      
      return arr;
    }
  }

  /* ---------------------------------- 2. Hook-walk sampler ---------------------------------- */
  async function sampleSYT(shape, wasm) {
    const N = shape.reduce((a, b) => a + b, 0);

    /* Use WASM sampler for N>500 if available */
    if (wasm && N > 500) {
      const sample = wasm.cwrap('sampleHookWalk', 'string', ['string']);
      const getEntry = wasm.cwrap('getTableauEntry', 'number', ['number', 'number']);
      const status = sample(shape.join(','));
      if (status !== 'OK') throw new Error('WASM hook-walk failed');

      const T = shape.map(r => Array(r));
      for (let r = 0; r < shape.length; ++r)
        for (let c = 0; c < shape[r]; ++c)
          T[r][c] = getEntry(r, c);
      return T;
    }

    /* Pure-JS Greene–Nijenhuis–Wilf hook-walk */
    const rowLen = [...shape];
    const T = rowLen.map(r => Array(r).fill(0));
    let cells = [];
    for (let r = 0; r < rowLen.length; ++r)
      for (let c = 0; c < rowLen[r]; ++c)
        cells.push([r, c]);

    for (let k = N; k >= 1; --k) {
      const [startIdx] = [Math.floor(Math.random() * cells.length)];
      let [r, c] = cells[startIdx];

      for (;;) {
        const arm = rowLen[r] - c - 1;
        let leg = 0;
        for (let rr = r + 1; rr < rowLen.length && c < rowLen[rr]; ++rr) ++leg;
        if (!arm && !leg) break;
        const step = 1 + Math.floor(Math.random() * (arm + leg));
        step <= arm ? (c += step) : (r += step - arm);
      }
      T[r][c] = k;
      rowLen[r]--;

      const next = [];
      for (const [rr, cc] of cells) {
        if (rr === r && cc === c) continue;
        if (cc >= rowLen[rr]) continue;
        next.push([rr, cc]);
      }
      cells = next;
    }
    return T;
  }

  /* ---------------------------------- 3. Inverse RSK ---------------------------------- */
  function inverseRSK(P, Q) {
    const N = P.flat().length;
    const perm = Array(N);
    
    for (let t = N; t >= 1; --t) {
      let r = -1, c = -1;
      for (let i = 0; i < Q.length && r === -1; ++i) {
        const j = Q[i].indexOf(t);
        if (j !== -1) { r = i; c = j; }
      }
      
      const val = P[r][c];
      Q[r].splice(c, 1);
      P[r].splice(c, 1);
      if (Q[r].length === 0) { Q.splice(r, 1); P.splice(r, 1); }

      /* bump up */
      let currentVal = val;
      for (let row = r - 1; row >= 0; --row) {
        let best = -1;
        for (let col = P[row].length - 1; col >= 0; --col)
          if (P[row][col] < currentVal) { best = col; break; }
        if (best === -1) break;
        const tmp = P[row][best];
        P[row][best] = currentVal;
        currentVal = tmp;
      }
      perm[t - 1] = currentVal;
    }
    return perm;
  }

  /* ---------------------------------- 4. Permutation matrix draw (copied from RSK algorithm) ---------------------------------- */
  function drawPermutation(perm, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const N = perm.length;
    const fixedSize = 300; // Fixed size for the visualization
    const margin = 20;
    const cellSize = Math.min(30, (fixedSize - 2 * margin) / N);
    const dotRadius = Math.max(1, cellSize * 0.3);
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', fixedSize)
      .attr('height', fixedSize);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin}, ${margin})`);
    
    const actualSize = N * cellSize;
    
    // Draw border
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', actualSize)
      .attr('height', actualSize)
      .attr('fill', 'none')
      .attr('stroke', 'var(--text-primary, #333)')
      .attr('stroke-width', 1);
    
    // Draw dots for the permutation
    for (let j = 0; j < N; j++) {
      const i = perm[j] - 1;
      g.append('circle')
        .attr('cx', j * cellSize + cellSize / 2)
        .attr('cy', i * cellSize + cellSize / 2)
        .attr('r', dotRadius)
        .attr('fill', 'var(--text-primary, #333)');
    }
  }

  /* ---------------------------------- 5. Tableau drawing (EXACT copy from hookwalk-tableau) ---------------------------------- */
  function drawTableau(containerId, tableau, title) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!tableau || tableau.length === 0) {
      container.innerHTML = '<div style="color: #666; font-style: italic;">No tableau</div>';
      return;
    }
    
    const N = tableau.flat().length;
    
    // Use EXACT same logic as hookwalk-tableau
    if (N <= 200) {
      drawTableauSmall(container, tableau, N);
    } else {
      drawTableauLarge(container, tableau, N);
    }
  }

  function drawTableauSmall(container, tableau, N) {
    const containerWidth = container.offsetWidth || 800;
    const containerHeight = window.innerHeight * 0.8; // 80% of viewport height
    const rows = tableau.length;
    const cols = Math.max(...tableau.map(row => row.length));
    const pad = 10;
    
    // Calculate cell size based on both width and height constraints
    const cellSizeByWidth = (containerWidth - 2 * pad) / cols;
    const cellSizeByHeight = (containerHeight - 2 * pad) / rows;
    const cellSize = Math.min(40, cellSizeByWidth, cellSizeByHeight);
    
    const width = cols * cellSize + 2 * pad;
    const height = rows * cellSize + 2 * pad;
    
    const svg = d3.select(container).append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-height', containerHeight + 'px');
    const g = svg.append('g').attr('transform', `translate(${pad},${pad})`);
    
    tableau.forEach((row, r) => {
      row.forEach((val, c) => {
        g.append('rect').attr('x', c * cellSize).attr('y', r * cellSize)
          .attr('width', cellSize).attr('height', cellSize)
          .attr('class', 'tableau-cell filled');
        g.append('text').attr('x', c * cellSize + cellSize / 2).attr('y', r * cellSize + cellSize / 2)
          .attr('class', 'tableau-text')
          .style('font-size', Math.min(14, cellSize * 0.6) + 'px')
          .text(val);
      });
    });
  }

  function drawTableauLarge(container, tableau, N) {
    const containerWidth = container.offsetWidth || 800;
    const containerHeight = window.innerHeight * 0.8; // 80% of viewport height
    const rows = tableau.length;
    const cols = Math.max(...tableau.map(row => row.length));
    const pad = 10;
    
    // Calculate cell size based on both width and height constraints
    const cellSizeByWidth = (containerWidth - 2 * pad) / cols;
    const cellSizeByHeight = (containerHeight - 2 * pad) / rows;
    const cellSize = Math.max(1, Math.min(cellSizeByWidth, cellSizeByHeight));
    
    const width = cols * cellSize + 2 * pad;
    const height = rows * cellSize + 2 * pad;
    
    const svg = d3.select(container).append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-height', containerHeight + 'px');
    const g = svg.append('g').attr('transform', `translate(${pad},${pad})`);
    
    const thresholds = [];
    for (let i = 1; i < 10; i++) thresholds.push(i * N / 10);
    
    // UVA color palette: orange (inside/small values) to blue (outside/large values)
    const uvaColors = [];
    for (let i = 0; i < 10; i++) {
      const t = i / 9; // 0 to 1
      const r = Math.round((1 - t) * 229 + t * 35);  // E57200 to 232D4B
      const g_val = Math.round((1 - t) * 114 + t * 45);
      const b = Math.round((1 - t) * 0 + t * 75);
      uvaColors.push(`rgb(${r},${g_val},${b})`);
    }
    
    tableau.forEach((row, r) => {
      row.forEach((val, c) => {
        let idx = thresholds.findIndex(t => val <= t) + 1; // 1..10
        g.append('rect').attr('x', c * cellSize).attr('y', r * cellSize)
          .attr('width', cellSize).attr('height', cellSize)
          .attr('fill', uvaColors[idx - 1]).attr('stroke-width', 0);
      });
    });
  }

  /* ---------------------------------- 6. Main driver class ---------------------------------- */
  class InverseRSKVis {
    constructor() {
      this.shapeUI = new ShapeInputVis('shape-ui');
      this.wasm = null;
      this.initWASM();
      document.getElementById('generate-permutation')
        .addEventListener('click', () => this.run());
    }

    async initWASM() {
      if (typeof HookModule !== 'undefined') {
        await HookModule.ready;
        this.wasm = HookModule;
        document.getElementById('wasm-status')
          .textContent = '(WASM ready for N>500)';
      } else {
        document.getElementById('wasm-status')
          .textContent = '(JavaScript mode)';
      }
    }

    showProgress(p, txt) {
      const bar = document.getElementById('progress-area');
      const fill = document.getElementById('progress-fill');
      const text = document.getElementById('progress-text');
      bar.style.display = 'block';
      fill.style.width = `${p}%`;
      text.textContent = txt;
    }

    hideProgress() {
      document.getElementById('progress-area').style.display = 'none';
    }

    async run() {
      let shape;
      try {
        shape = this.shapeUI.parseShape();
      } catch (error) {
        shape = null;
      }
      
      if (!shape || shape.length === 0) {
        // Default to a small rectangle if no shape is provided
        const defaultShape = [7, 7, 7, 7, 7, 7, 7];
        const N = defaultShape.reduce((a, b) => a + b, 0);
        this.runWithShape(defaultShape, N);
        return;
      }
      const N = shape.reduce((a, b) => a + b, 0);
      this.runWithShape(shape, N);
    }

    async runWithShape(shape, N) {
      try {
        this.showProgress(5, 'Sampling P tableau');
        const P = await sampleSYT(shape, this.wasm);

        this.showProgress(55, 'Sampling Q tableau');
        const Q = await sampleSYT(shape, this.wasm);

        // Draw the tableaux before inverse RSK (for all sizes)
        drawTableau('p-tableau', P, 'P');
        drawTableau('q-tableau', Q, 'Q');

        /* deep copy because inverseRSK mutates */
        const Pcopy = P.map(r => r.slice());
        const Qcopy = Q.map(r => r.slice());

        this.showProgress(75, 'Computing inverse RSK');
        const perm = inverseRSK(Pcopy, Qcopy);

        this.showProgress(100, 'Rendering permutation');
        
        if (N <= 200) {
          document.getElementById('perm-display').textContent = `σ = [${perm.join(', ')}]`;
        } else {
          document.getElementById('perm-display').textContent = `σ of size ${N} (showing first 20): [${perm.slice(0, 20).join(', ')}...]`;
        }
        drawPermutation(perm, 'perm-matrix');
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        this.hideProgress();
      }
    }
  }

  /* ---------------------------------- 6. Boot ---------------------------------- */
  window.addEventListener('DOMContentLoaded', () => {
    new InverseRSKVis();
  });
}());