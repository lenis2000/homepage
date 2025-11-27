---
title: Lozenge Tiling Glauber Dynamics (Hexagon)
model: lozenge-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-11-27-lozenge-glauber.md'
    txt: 'This simulation is interactive, written in JavaScript'
---

<style>
  .container { max-width: 1000px; margin: 0 auto; padding: 16px; }
  .controls { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
  .control-group { background: #f5f5f5; padding: 12px; border-radius: 8px; }
  .control-group label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
  .control-group input[type="range"] { width: 120px; }
  .control-group span { font-family: monospace; color: #1976d2; }
  button { padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; }
  button:hover { background: #f0f0f0; }
  button.primary { background: #4CAF50; color: white; border-color: #4CAF50; }
  button.running { background: #ff5722; color: white; border-color: #ff5722; }
  #canvas { border: 1px solid #ccc; display: block; margin: 0 auto; background: white; }
  .stats { margin-top: 16px; font-family: monospace; color: #666; }
  select { padding: 6px; border-radius: 4px; }
  .checkbox-group { display: flex; align-items: center; gap: 4px; }
</style>

<script src="/js/colorschemes.js"></script>

<div class="container">
  <div class="controls">
    <div class="control-group">
      <label>Size: <span id="sizeVal">5</span></label>
      <input type="range" id="sizeSlider" min="3" max="25" value="5">
    </div>
    <button id="resetBtn">Reset</button>
  </div>
  <canvas id="canvas" width="800" height="700"></canvas>
</div>

<script>
// ============================================================================
// TRIANGULAR GRID
// ============================================================================
//
// Triangular lattice using axial coordinates (q, r):
//   - q axis points right
//   - r axis points 60° up-right
//
// Screen coordinates:
//   x = q + r * cos(60°) = q + r/2
//   y = r * sin(60°) = r * sqrt(3)/2
//
// Each vertex has 6 neighbors (triangular lattice).

class TriangularGrid {
    constructor(size) {
        this.size = size;
        this.vertices = [];
        this.buildVertices();
    }

    buildVertices() {
        this.vertices = [];
        const n = this.size;

        // Hexagonal region: |q| <= n, |r| <= n, |q+r| <= n
        for (let q = -n; q <= n; q++) {
            for (let r = -n; r <= n; r++) {
                if (Math.abs(q + r) <= n) {
                    this.vertices.push({q, r});
                }
            }
        }
    }

    hasVertex(q, r) {
        const n = this.size;
        return Math.abs(q) <= n && Math.abs(r) <= n && Math.abs(q + r) <= n;
    }

    // 6 neighbors in triangular lattice
    getNeighbors(q, r) {
        return [
            {q: q + 1, r: r},      // right
            {q: q, r: r + 1},      // up-right
            {q: q - 1, r: r + 1},  // up-left
            {q: q - 1, r: r},      // left
            {q: q, r: r - 1},      // down-left
            {q: q + 1, r: r - 1},  // down-right
        ].filter(n => this.hasVertex(n.q, n.r));
    }

    edgeKey(q1, r1, q2, r2) {
        if (r1 < r2 || (r1 === r2 && q1 < q2)) {
            return `${q1},${r1}-${q2},${r2}`;
        }
        return `${q2},${r2}-${q1},${r1}`;
    }
}

// ============================================================================
// RENDERER
// ============================================================================

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    // Convert axial (q, r) to screen (x, y)
    toScreen(q, r, scale, offsetX, offsetY) {
        const x = offsetX + scale * (q + r * 0.5);
        const y = offsetY - scale * (r * Math.sqrt(3) / 2);
        return {x, y};
    }

    draw(grid) {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        const scale = Math.min(W, H) * 0.35 / grid.size;
        const offsetX = W / 2;
        const offsetY = H / 2;

        const toScr = (q, r) => this.toScreen(q, r, scale, offsetX, offsetY);

        // Draw edges
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;

        const drawnEdges = new Set();

        for (const {q, r} of grid.vertices) {
            const neighbors = grid.getNeighbors(q, r);
            for (const {q: nq, r: nr} of neighbors) {
                const edgeKey = grid.edgeKey(q, r, nq, nr);
                if (drawnEdges.has(edgeKey)) continue;
                drawnEdges.add(edgeKey);

                const p1 = toScr(q, r);
                const p2 = toScr(nq, nr);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }

        // Draw dual lattice (honeycomb)
        // Vertices at face centers, bipartite coloring
        this.drawDualLattice(ctx, grid, toScr);
    }

    drawDualLattice(ctx, grid, toScr) {
        const n = grid.size;

        // Collect all faces (triangles) and their centers
        // Up-pointing triangle at (q,r): vertices (q,r), (q+1,r), (q,r+1) -> center (q+1/3, r+1/3)
        // Down-pointing triangle at (q,r): vertices (q,r), (q+1,r-1), (q+1,r) -> center (q+2/3, r-1/3)

        const faces = [];

        for (let q = -n - 1; q <= n; q++) {
            for (let r = -n - 1; r <= n + 1; r++) {
                // Up-pointing triangle
                if (grid.hasVertex(q, r) && grid.hasVertex(q + 1, r) && grid.hasVertex(q, r + 1)) {
                    faces.push({
                        cq: q + 1/3,
                        cr: r + 1/3,
                        type: 'up',
                        q, r
                    });
                }
                // Down-pointing triangle
                if (grid.hasVertex(q, r) && grid.hasVertex(q + 1, r - 1) && grid.hasVertex(q + 1, r)) {
                    faces.push({
                        cq: q + 2/3,
                        cr: r - 1/3,
                        type: 'down',
                        q, r
                    });
                }
            }
        }

        // Draw edges between adjacent face centers
        // Up triangle (q,r) is adjacent to:
        //   - Down triangle across edge (q,r)-(q+1,r): center (q+2/3, r-1/3)
        //   - Down triangle across edge (q+1,r)-(q,r+1): center (q+2/3, r+2/3)
        //   - Down triangle across edge (q,r)-(q,r+1): center (q-1/3, r+2/3)

        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;

        const drawnEdges = new Set();

        for (const face of faces) {
            if (face.type === 'up') {
                const {q, r} = face;
                const upCenter = {q: q + 1/3, r: r + 1/3};

                // Three adjacent down-triangles (only if they exist in faces)
                const neighborData = [
                    {q: q + 2/3, r: r - 1/3, checkQ: q, checkR: r - 1},       // below: down-tri at (q, r-1+1)=(q,r) -> actually check (q+1,r-1)
                    {q: q + 2/3, r: r + 2/3, checkQ: q + 1, checkR: r + 1},   // right
                    {q: q - 1/3, r: r + 2/3, checkQ: q - 1, checkR: r + 1},   // left
                ];

                for (const nc of neighborData) {
                    // Check if the down-triangle exists (all 3 vertices must exist)
                    // Down triangle at (cq, cr) has vertices at (cq-2/3+q', cr+1/3+r') pattern
                    // Simpler: check if neighbor center corresponds to valid down-triangle
                    const dq = Math.round(nc.q - 2/3);
                    const dr = Math.round(nc.r + 1/3);
                    if (!grid.hasVertex(dq, dr) || !grid.hasVertex(dq + 1, dr - 1) || !grid.hasVertex(dq + 1, dr)) {
                        continue;
                    }

                    const p1 = toScr(upCenter.q, upCenter.r);
                    const p2 = toScr(nc.q, nc.r);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }

        // Draw vertices with bipartite coloring
        // Up triangles = black, Down triangles = white
        for (const face of faces) {
            const p = toScr(face.cq, face.cr);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = face.type === 'up' ? '#000' : '#fff';
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

// ============================================================================
// MAIN
// ============================================================================

let grid, renderer;

function init() {
    const size = parseInt(document.getElementById('sizeSlider').value);
    grid = new TriangularGrid(size);

    if (!renderer) {
        renderer = new Renderer(document.getElementById('canvas'));
    }

    renderer.draw(grid);
}

// Event handlers
document.getElementById('resetBtn').addEventListener('click', init);

document.getElementById('sizeSlider').addEventListener('input', (e) => {
    document.getElementById('sizeVal').textContent = e.target.value;
    init();
});

// Start
init();
</script>
