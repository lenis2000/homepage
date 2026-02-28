---
title: q-RSK Sampling of Domino Tilings of the Aztec Diamond
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-04-RSK-sampling.md'
    txt: 'This simulation is interactive, written in JavaScript'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-04-RSK-sampling.cpp'
    txt: 'C++ source code (compiled to WebAssembly)'
---

<style>
  #aztec-svg {
    width: 100%;
    height: 50vh;
    vertical-align: top;
    border: 1px solid #ccc;
    background-color: #fafafa;
  }
  @media (max-width: 576px) {
    #aztec-svg {
      height: 40vh;
      vertical-align: top;
    }
  }
  #zoom-in-btn, #zoom-out-btn {
    font-weight: bold;
    width: 30px;
    height: 30px;
  }
  #zoom-reset-btn {
    height: 30px;
  }
  .param-input {
    font-family: monospace;
    font-size: 12px;
    width: 100%;
    padding: 5px;
    margin-top: 5px;
    margin-bottom: 10px;
  }
  #subsets-output {
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
    background-color: #f5f5f5;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-top: 10px;
  }
  #three-container {
    border: 1px solid #ccc;
    background-color: #fafafa;
    border-radius: 4px;
  }
  #three-container canvas {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
  /* Detailed Mode Styles */
  #detailed-mode-panel {
    background: #f0f7ff;
    border: 2px solid #1976d2;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
  }
  #detailed-step-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 15px;
  }
  #detailed-step-controls button {
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
  }
  .detailed-info-panel {
    background: #fff;
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 15px;
    font-family: monospace;
    font-size: 13px;
  }
  .detailed-info-panel h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #333;
  }
  #vh-probability-panel {
    background: #fffef0;
    border-color: #ddd;
  }
  #detailed-visualizations {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  @media (max-width: 900px) {
    #detailed-visualizations {
      grid-template-columns: 1fr;
    }
  }
  .detailed-viz-panel {
    border: 1px solid #ccc;
    padding: 10px;
    background: #fff;
    border-radius: 5px;
  }
  .detailed-viz-panel h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #333;
  }
  .detailed-viz-panel canvas {
    width: 100%;
    height: 280px;
    border: 1px solid #eee;
    background: #fafafa;
  }
  #toggle-detailed-mode-btn {
    margin-top: 10px;
    margin-bottom: 10px;
    padding: 10px 20px;
    font-size: 1.1em;
    font-weight: bold;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  #toggle-detailed-mode-btn:hover {
    background: #1565c0;
  }
  #toggle-detailed-mode-btn.active {
    background: #d32f2f;
  }
  #toggle-detailed-mode-btn.active:hover {
    background: #c62828;
  }
  .partition-display {
    font-family: monospace;
    font-size: 11px;
    margin-top: 5px;
    color: #555;
  }
</style>

<script src="/js/d3.v7.min.js"></script>
<script src="/js/colorschemes.js"></script>
<script src="https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
<script src="https://unpkg.com/svg2pdf.js@2.2.3/dist/svg2pdf.umd.min.js"></script>
<script src="/js/2025-12-04-RSK-sampling.js"></script>
<!-- Load Three.js for 3D visualization -->
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>

<details style="margin-bottom: 12px; border: 1px solid #ccc; border-radius: 5px;">
  <summary style="cursor: pointer; font-weight: bold; font-size: 1.1em; color: #0066cc; padding: 10px;">About the Simulation</summary>
  <div style="padding: 10px; font-size: 0.95em; line-height: 1.5;">
    <p><strong>q-RSK Sampling</strong> generates random domino tilings of the Aztec diamond using the q-deformed Robinson-Schensted-Knuth correspondence. At q=0, this gives uniform tilings; as q approaches 1, tilings concentrate near "frozen" configurations.</p>
    <p><strong>Parameters:</strong></p>
    <ul style="margin: 5px 0;">
      <li><strong>n</strong>: Size of the Aztec diamond</li>
      <li><strong>q</strong>: q-Whittaker parameter (0 ≤ q < 1). q=0 gives Schur measure; q>0 gives q-Whittaker measure</li>
      <li><strong>x, y</strong>: Schur process specialization. Uniform (all 1s) gives standard measure; other weights create non-uniform sampling</li>
      <li><strong>High precision</strong>: Uses 50-digit arithmetic (slower but stable for q close to 1)</li>
    </ul>
    <p>The simulation outputs interlacing partitions that encode the domino tiling.</p>
    <p style="margin-top: 10px;"><strong>Visualization Modes:</strong></p>
    <ul style="margin: 5px 0;">
      <li><strong>Dominoes</strong>: Standard flat tiling view with four colors for domino types.</li>
      <li><strong>Dimer</strong>: Displays the underlying matching on the dual graph as edges.</li>
      <li><strong>Double Dimer</strong>: Superimposes two independent samples to form loops. Includes a <strong>Min Loop Size</strong> filter.</li>
      <li><strong>Fluctuations</strong>: Visualizes height difference between two samples, approximating the Gaussian Free Field.</li>
      <li><strong>3D</strong>: Renders the tiling as a stepped surface in 3D space. Supports rotation, perspective/orthographic toggle, and multiple visual presets.</li>
    </ul>
    <p><strong>View Options:</strong></p>
    <ul style="margin: 5px 0;">
      <li><strong>Rotate 45°</strong>: Rotate the canvas view for alternative perspective.</li>
      <li><strong>Particles</strong>: Show lattice points forming the Schur/q-Whittaker process.</li>
      <li><strong>Color Palettes</strong>: Multiple palettes plus custom color pickers.</li>
      <li><strong>Canvas/SVG</strong>: Toggle between renderers.</li>
    </ul>
    <p><strong>Export:</strong> PNG and PDF export with adjustable quality.</p>
    <p style="margin-top: 10px;"><strong>References:</strong></p>
    <ul style="margin: 5px 0;">
      <li><a href="https://arxiv.org/abs/1504.00666">arXiv:1504.00666</a> — K. Matveev, L. Petrov, <i>q-randomized Robinson-Schensted-Knuth correspondences and random polymers</i></li>
      <li><a href="https://arxiv.org/abs/1407.3764">arXiv:1407.3764</a> — D. Betea et al., <i>Perfect sampling algorithms for Schur processes</i></li>
    </ul>
  </div>
</details>

<!-- Sampling controls -->
<div style="background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px;">
  <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
    <span>
      <label for="n-input">n = </label>
      <input id="n-input" type="number" value="4" min="1" max="1000" style="width: 60px;">
      <button id="sample-btn" style="margin-left: 8px;">Sample</button>
      <span id="progress-indicator" style="margin-left: 8px; color: #666;"></span>
      <span id="timing-display" style="margin-left: 8px; color: #666; font-size: 0.9em;"></span>
    </span>
    <span>
      <label for="q-input">q = </label>
      <input id="q-input" type="number" value="0.5" min="0" max="0.99999999999" step="0.0001" style="width: 70px;">
    </span>
    <span>
      <input type="checkbox" id="high-precision-cb">
      <label for="high-precision-cb">High precision</label>
    </span>
  </div>
</div>

<!-- Schur process parameters -->
<div style="background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px;">
  <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 6px;">
    <button id="uniform-btn">Uniform</button>
    <span>
      <label for="r-input">$x_i=y_i=r^i$: r = </label>
      <input id="r-input" type="number" value="0.9" min="0.01" max="10" step="0.01" style="width: 55px;">
      <button id="r-btn">Apply</button>
    </span>
    <span style="font-size: 0.8em; color: #666;">Syntax: <code>1^4</code> = 1,1,1,1</span>
  </div>
  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
    <label for="x-params" style="width: 16px;">x:</label>
    <input id="x-params" type="text" class="param-input" value="1^4" style="flex: 1;">
  </div>
  <div style="display: flex; gap: 8px; align-items: center;">
    <label for="y-params" style="width: 16px;">y:</label>
    <input id="y-params" type="text" class="param-input" value="1^4" style="flex: 1;">
  </div>
</div>

<!-- Zoom Controls and Export -->
<div id="zoom-export-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
  <div id="zoom-controls-container"></div>
  <div style="display: flex; align-items: center; gap: 6px; font-size: 0.9em;">
    <button type="button" id="fullres-btn" title="Open full-resolution image in new tab">Full Res</button>
    <button type="button" id="export-png-btn">PNG</button>
    <span style="font-size: 10px; color: #666;">Q:</span>
    <input type="range" id="export-quality" min="0" max="100" value="85" style="width: 50px;">
    <span id="export-quality-val" style="font-size: 10px; color: #1976d2;">85</span>
    <button type="button" id="export-pdf-btn">PDF</button>
  </div>
</div>

<!-- Canvas -->
<div id="canvas-row" class="row">
  <div class="col-12" style="position: relative; height: 50vh;">
    <canvas id="aztec-canvas" style="width: 100%; height: 100%; border: 1px solid #ccc; background-color: #fafafa;"></canvas>
    <svg id="aztec-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none;"></svg>
    <div id="three-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: none;"></div>
    <div id="loading-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); display: none; justify-content: center; align-items: center; z-index: 150; flex-direction: column;">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Building 3D View...</div>
      <div id="loading-progress" style="font-size: 14px; color: #666;">0%</div>
    </div>
    <button id="toggle3DBtn" style="position: absolute; top: 10px; right: 10px; font-weight: bold; font-size: 14px; padding: 6px 12px; background: #fff; border: 2px solid #333; border-radius: 4px; cursor: pointer; z-index: 100; opacity: 0.9;">3D</button>
  </div>
</div>

<!-- View Mode Controls -->
<div id="view-mode-controls" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-top: 8px; padding: 6px 10px; background: #e8f4e8; border: 1px solid #c8e6c9; border-radius: 5px; font-size: 0.9em;">
  <span style="font-weight: bold;">View:</span>
  <span>
    <input type="radio" id="view-dominoes" name="view-mode" value="dominoes" checked>
    <label for="view-dominoes">Dominoes</label>
  </span>
  <span>
    <input type="radio" id="view-dimer" name="view-mode" value="dimer">
    <label for="view-dimer">Dimer</label>
  </span>
  <span style="border-left: 1px solid #999; padding-left: 10px;">
    <button id="sample-double-dimer-btn" style="font-size: 0.9em;">Sample Double Dimer</button>
    <label style="margin-left: 6px; font-size: 0.85em;">Loops≥</label>
    <input type="number" id="min-loop-size" value="2" min="1" max="100" style="width: 40px;">
  </span>
  <span style="border-left: 1px solid #999; padding-left: 10px;">
    <button id="sample-fluctuations-btn" style="font-size: 0.9em;">Sample Fluctuations</button>
  </span>
</div>

<!-- Visual Controls -->
<div id="visual-controls" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-top: 8px; padding: 6px 10px; background: #f5f5f5; border-radius: 5px; font-size: 0.9em;">
  <span style="display: none;">
    <input type="radio" id="renderer-canvas" name="renderer" value="canvas" checked>
    <label for="renderer-canvas">Canvas</label>
    <input type="radio" id="renderer-svg" name="renderer" value="svg" style="margin-left: 6px;">
    <label for="renderer-svg">SVG</label>
  </span>
  <span>
    <input type="checkbox" id="rotate-canvas-cb">
    <label for="rotate-canvas-cb">Rotate 45°</label>
  </span>
  <span>
    <input type="checkbox" id="show-particles-cb">
    <label for="show-particles-cb">Particles</label>
  </span>
  <span>
    <label for="border-slider">Border:</label>
    <input type="range" id="border-slider" min="0" max="3" step="0.5" value="1" style="width: 60px; vertical-align: middle;">
    <span id="border-value">1</span>
  </span>
  <span style="border-left: 1px solid #ccc; padding-left: 10px;">
    <button id="prev-palette" style="padding: 0 6px; font-size: 12px;">&#9664;</button>
    <select id="palette-select" style="width: 110px; font-size: 12px;"></select>
    <button id="next-palette" style="padding: 0 6px; font-size: 12px;">&#9654;</button>
    <button id="custom-colors-btn" style="margin-left: 4px; font-size: 12px;">Custom</button>
  </span>
  <span id="controls-3d" style="border-left: 1px solid #ccc; padding-left: 10px; display: none;">
    <button id="perspectiveBtn" style="font-size: 12px;" title="Toggle perspective/orthographic">🎯</button>
    <button id="preset3DBtn" style="font-size: 12px;" title="Cycle visual preset">☀️</button>
    <button id="rotateLeftBtn" style="font-size: 12px;" title="Rotate left">↺</button>
    <button id="rotateRightBtn" style="font-size: 12px;" title="Rotate right">↻</button>
    <button id="autoRotateBtn" style="font-size: 12px;" title="Toggle auto-rotation">⟳</button>
  </span>
</div>
<div id="custom-color-pickers" style="display: none; gap: 6px; align-items: center; margin-top: 6px; padding: 6px 10px; background: #f0f0f0; border-radius: 5px; font-size: 0.85em;">
  <span>P→</span>
  <input type="color" id="custom-color-1" value="#228B22" style="width: 28px; height: 22px; padding: 0; border: 1px solid #999; border-radius: 3px; cursor: pointer;">
  <span>P↑</span>
  <input type="color" id="custom-color-2" value="#DC143C" style="width: 28px; height: 22px; padding: 0; border: 1px solid #999; border-radius: 3px; cursor: pointer;">
  <span>H→</span>
  <input type="color" id="custom-color-3" value="#0057B7" style="width: 28px; height: 22px; padding: 0; border: 1px solid #999; border-radius: 3px; cursor: pointer;">
  <span>H↑</span>
  <input type="color" id="custom-color-4" value="#FFCD00" style="width: 28px; height: 22px; padding: 0; border: 1px solid #999; border-radius: 3px; cursor: pointer;">
</div>

<!-- Detailed Mode Toggle -->
<button id="toggle-detailed-mode-btn">Enable Detailed Mode</button>

<!-- Detailed Mode Panel (hidden by default) -->
<div id="detailed-mode-panel" style="display: none;">
  <!-- Step Controls -->
  <div id="detailed-step-controls">
    <button id="step-reset-btn">Reset</button>
    <button id="step-prev-btn" disabled>&#9664; Prev</button>
    <button id="step-next-btn">Next &#9654;</button>
    <button id="step-auto-btn">Auto-Play</button>
    <label style="margin-left: 10px;">Speed:
      <input type="range" id="step-speed" min="100" max="2000" value="500" style="width: 80px; vertical-align: middle;">
    </label>
    <label style="margin-left: 15px;">Seed:
      <input type="number" id="detailed-seed" value="" placeholder="random" style="width: 80px;">
      <button id="new-seed-btn" title="Generate new random seed" style="padding: 2px 6px;">&#8635;</button>
    </label>
    <span id="step-indicator" style="margin-left: 15px; font-weight: bold; color: #1976d2;">Ready to start</span>
  </div>

  <!-- Bernoulli Trial Info -->
  <div id="cell-info-panel" class="detailed-info-panel">
    <h4>Bernoulli Trial at Cell (i, j)</h4>
    <div id="cell-position">Position: not started</div>
    <div id="cell-bernoulli">Probability: p = x<sub>i</sub> &middot; y<sub>j</sub> / (1 + x<sub>i</sub> &middot; y<sub>j</sub>)</div>
    <div id="cell-random">Random U ~ Uniform[0,1]: —</div>
    <div id="cell-bit">Result bit: —</div>
  </div>

  <!-- VH Bijection Probabilities -->
  <div id="vh-probability-panel" class="detailed-info-panel">
    <h4>q-Whittaker VH Bijection Probabilities</h4>
    <div id="island-info">Islands (consecutive indices where &mu;<sub>i</sub> - &kappa;<sub>i</sub> = 1): —</div>
    <div id="f-probability">f<sub>k</sub> = (1 - q<sup>&Delta;&lambda;</sup>) / (1 - q<sup>&Delta;&nu;</sup>): —</div>
    <div id="g-probabilities">g<sub>s</sub> values: —</div>
    <div id="stopped-decision">Stopping decision: —</div>
  </div>

  <!-- Row 1: Growth Diagram Cells and Island Processing side by side -->
  <div id="detailed-visualizations">
    <div class="detailed-viz-panel">
      <h4>Growth Diagram Cells (Precomputed Bernoulli Bits)</h4>
      <canvas id="cell-lattice-canvas" style="height: 200px;"></canvas>
      <div id="cell-lattice-info" class="partition-display">Staircase cells: <span style="color: #2e7d32;">&#9632; bit=1</span> | <span style="color: #c62828;">&#9633; bit=0</span> | <span style="background: #ffeb3b; padding: 0 4px;">current</span></div>
    </div>
    <div class="detailed-viz-panel">
      <h4>Island Processing Details</h4>
      <canvas id="island-canvas" style="height: 200px;"></canvas>
      <div id="island-detail-info" class="partition-display">Shows islands, f<sub>k</sub> stopping probability, g<sub>s</sub> sequential sampling</div>
    </div>
  </div>

  <!-- Row 2: Domino Shuffling (Figure 10 style) -->
  <div class="detailed-viz-panel" style="margin-top: 15px;">
    <h4>Domino Shuffling / VH Bijection (arXiv:1407.3764 Fig. 10)
      <span style="float: right; font-size: 0.85em; font-weight: normal;">
        <button id="shuffle-animate-btn" style="padding: 2px 8px; font-size: 11px;">&#9654; Animate</button>
        <button id="shuffle-reset-btn" style="padding: 2px 8px; font-size: 11px;">Reset</button>
        <select id="shuffle-phase-select" style="font-size: 11px; padding: 2px;">
          <option value="0">Phase 0: Initial</option>
          <option value="1">Phase 1: Dimers</option>
          <option value="2">Phase 2: Blocks</option>
          <option value="3">Phase 3: Slide</option>
          <option value="4">Phase 4: Final</option>
        </select>
      </span>
    </h4>
    <canvas id="shuffling-canvas" style="height: 380px;"></canvas>
    <div id="shuffling-info" class="partition-display">
      <b>Phases:</b> 0: Initial partitions | 1: Form dimers (&lambda;-&kappa; blue, &kappa;-&mu; orange) | 2: Identify blocks (B markers) | 3: Slide dimers &rarr; AFTER | 4: Final result with &Delta; indicators
    </div>
  </div>

  <!-- Row 3: Current Aztec Diamond (built from completed anti-diagonals) -->
  <div class="detailed-viz-panel" style="margin-top: 15px;">
    <h4>Current Aztec Diamond</h4>
    <canvas id="current-aztec-canvas" style="height: 400px;"></canvas>
    <div id="current-aztec-info" class="partition-display">After completing each anti-diagonal, the corresponding Aztec diamond is shown</div>
  </div>

  <!-- Row 4: Mathematical Description of Domino Shuffling -->
  <div class="detailed-viz-panel" style="margin-top: 15px; background: #fffef5;">
    <h4>Classical Domino Shuffling Algorithm (EKLP 1992)</h4>
    <div style="padding: 10px; font-size: 0.95em; line-height: 1.6;">

      <p><strong>Setup:</strong> The Aztec diamond $\mathcal{A}_n$ of order $n$ consists of all unit squares $[i, i+1] \times [j, j+1]$ with $|i| + |j| < n$. It contains $2n^2$ unit squares and is tiled by $n^2$ dominoes.</p>

      <p><strong>Domino Types:</strong> Each domino is classified by orientation and parity:
      <ul style="margin: 5px 0 10px 20px;">
        <li><strong>North (N):</strong> vertical domino with black square on top</li>
        <li><strong>South (S):</strong> vertical domino with white square on top</li>
        <li><strong>East (E):</strong> horizontal domino with black square on right</li>
        <li><strong>West (W):</strong> horizontal domino with white square on right</li>
      </ul>
      </p>

      <p><strong>The Shuffling Map $\mathcal{A}_n \to \mathcal{A}_{n+1}$:</strong></p>

      <ol style="margin-left: 20px;">
        <li><strong>Deletion:</strong> Find all $2 \times 2$ blocks containing exactly two dominoes that form either:
          <ul>
            <li>Two horizontal dominoes stacked (one N, one S), or</li>
            <li>Two vertical dominoes side-by-side (one E, one W)</li>
          </ul>
          These are called <em>bad blocks</em>. Delete all dominoes in bad blocks.
        </li>

        <li><strong>Sliding:</strong> Each remaining domino slides outward by one unit in its natural direction:
          $$\begin{aligned}
          \text{N dominoes} &\to \text{slide up (} +y \text{)} \\
          \text{S dominoes} &\to \text{slide down (} -y \text{)} \\
          \text{E dominoes} &\to \text{slide right (} +x \text{)} \\
          \text{W dominoes} &\to \text{slide left (} -x \text{)}
          \end{aligned}$$
        </li>

        <li><strong>Creation:</strong> After sliding, empty $2 \times 2$ blocks appear. Each block is filled with exactly one of two choices:
          <ul>
            <li>Two horizontal dominoes (N on top, S on bottom), or</li>
            <li>Two vertical dominoes (W on left, E on right)</li>
          </ul>
          For uniform random tilings, each choice is made independently with probability $\tfrac{1}{2}$.
        </li>
      </ol>

      <p><strong>Key Properties:</strong>
      <ul style="margin: 5px 0 10px 20px;">
        <li>The map is a $2^{n+1}$-to-1 correspondence from tilings of $\mathcal{A}_{n+1}$ to tilings of $\mathcal{A}_n$</li>
        <li>Uniform measure on $\mathcal{A}_n$ lifts to uniform measure on $\mathcal{A}_{n+1}$</li>
        <li>Starting from the unique tiling of $\mathcal{A}_0$ and shuffling $n$ times samples uniformly from $\mathcal{A}_n$</li>
      </ul>
      </p>

      <p><strong>Reference:</strong> <a href="https://arxiv.org/abs/math/9201305" target="_blank">arXiv:math/9201305</a> &mdash; Elkies, Kuperberg, Larsen, Propp, <em>"Alternating-Sign Matrices and Domino Tilings"</em> (1992).</p>

      <hr style="margin: 20px 0; border: none; border-top: 2px solid #1976d2;">

      <h4 style="color: #1976d2;">q-Whittaker Deformation (q &gt; 0)</h4>

      <p><strong>Key Insight:</strong> The q-deformation modifies <em>only Step 3 (Creation)</em>. Steps 1 and 2 remain unchanged.</p>

      <p>In the classical case, block-filling is deterministic: geometric constraints force a unique cascade. In the q-Whittaker case, particles have <strong>probabilistic "stickiness"</strong>&mdash;even when a particle <em>could</em> move, it might stay with probability depending on $q$.</p>

      <p><strong>Step 3': q-Weighted Creation</strong></p>

      <p>Empty 2&times;2 blocks form <em>islands</em>&mdash;consecutive positions where new dominoes must be placed. For each island $[k, m]$:</p>

      <ol style="margin-left: 20px;">
        <li><strong>Sample Bernoulli bit:</strong> $B \sim \text{Bernoulli}\left(\dfrac{x_i y_j}{1 + x_i y_j}\right)$</li>

        <li><strong>Special case:</strong> If $B = 1$ and $k = 0$, all particles jump (fill all blocks with same orientation).</li>

        <li><strong>Otherwise, sample stopping position:</strong>
          <ul>
            <li>Compute $f_k = \dfrac{1 - q^{\lambda_k - \bar\nu_k + 1}}{1 - q^{\bar\nu_{k-1} - \bar\nu_k + 1}}$</li>
            <li>Sample $U \sim \text{Uniform}[0,1]$. If $U &lt; f_k$: <strong>stop at $k$</strong></li>
            <li>Else, for $s = k+1, \ldots, m$:
              <ul>
                <li>Compute $g_s = 1 - q^{\lambda_s - \mu_s + 1}$</li>
                <li>Sample $U \sim \text{Uniform}[0,1]$. If $U &lt; g_s$: <strong>stop at $s$</strong></li>
              </ul>
            </li>
            <li>If no stop occurs: <strong>all particles jump</strong></li>
          </ul>
        </li>

        <li><strong>Fill blocks based on stopping position $s$:</strong>
          <ul>
            <li>Blocks at positions $k, \ldots, s-1$: orientation A (e.g., vertical EW pair)</li>
            <li>Block at position $s$: orientation B (opposite, e.g., horizontal NS pair)</li>
            <li>Blocks at positions $s+1, \ldots, m$: orientation A</li>
          </ul>
        </li>
      </ol>

      <p><strong>Domino Orientation Mapping:</strong> The stopped particle creates a <em>domain wall</em>:</p>
      <div style="font-family: monospace; background: #f5f5f5; padding: 8px; margin: 10px 0; border-radius: 4px;">
        Block: &nbsp; k &nbsp;&nbsp; k+1 &nbsp; ... &nbsp; s-1 &nbsp;&nbsp; <span style="color: #c62828; font-weight: bold;">s</span> &nbsp;&nbsp;&nbsp; s+1 &nbsp; ... &nbsp; m<br>
        Fill: &nbsp;&nbsp; [A] &nbsp; [A] &nbsp; ... &nbsp; [A] &nbsp; <span style="color: #c62828; font-weight: bold;">[B]</span> &nbsp; [A] &nbsp; ... &nbsp; [A]
      </div>


      <p><strong>References:</strong>
      <ul style="margin: 5px 0 10px 20px;">
        <li><a href="https://arxiv.org/abs/1407.3764" target="_blank">arXiv:1407.3764</a> &mdash; Betea, Bouttier, Nejjar, Vuletić, <em>"The free boundary Schur process and applications I"</em></li>
        <li><a href="https://arxiv.org/abs/1504.00666" target="_blank">arXiv:1504.00666</a> &mdash; Matveev, Petrov, <em>"q-randomized Robinson-Schensted-Knuth correspondences and random polymers"</em></li>
      </ul>
      </p>

    </div>
  </div>
</div>

<details id="partitions-details" style="margin-top: 8px; border: 1px solid #ccc; border-radius: 5px;">
  <summary style="cursor: pointer; font-weight: bold; font-size: 1.1em; color: #0066cc; padding: 10px;">Partitions forming the Schur/q-Whittaker process</summary>
  <div id="subsets-output" style="padding: 10px;">Loading...</div>
</details>

<script>
if (typeof Module === 'undefined') {
  document.getElementById("subsets-output").textContent = 'Error: WASM Module not loaded';
}

async function initializeApp() {
  // Wrap WASM functions
  const sampleAztecRSK = Module.cwrap('sampleAztecRSK', 'number', ['number', 'string', 'string', 'number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);
  const setHighPrecision = Module.cwrap('setHighPrecision', null, ['number']);
  const getHighPrecision = Module.cwrap('getHighPrecision', 'number', []);

  let currentN = 4;
  const svg = d3.select("#aztec-svg");
  const canvas = document.getElementById("aztec-canvas");
  const ctx = canvas.getContext("2d");
  let currentPartitions = [];
  let simulationActive = false;
  let progressInterval = null;
  const progressElem = document.getElementById("progress-indicator");
  const timingDisplay = document.getElementById("timing-display");

  // Canvas zoom/pan state
  let canvasTransform = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  // Cache for computed domino data
  let cachedDominoes = null;
  let cachedLatticePoints = null;
  let cachedBounds = null;

  // OffscreenCanvas cache for fast zoom/pan (avoids re-rendering all dominoes)
  let canvasCacheCanvas = null;
  let canvasCacheVersion = 0;  // incremented when data changes
  let canvasCacheRenderedVersion = -1;  // version last rendered to cache
  let canvasCacheWidth = 0;
  let canvasCacheHeight = 0;
  let canvasCacheParams = null;  // style params used for current cache

  function invalidateCanvasCache() {
    canvasCacheVersion++;
  }

  // Diagonal highlight state (when partition details are open)
  let showDiagonalHighlights = false;
  let previousParticleState = false;  // to restore when closing

  // Color scheme state
  const colorPalettes = window.ColorSchemes || [{ name: 'Domino Default', colors: ['#228B22', '#DC143C', '#0057B7', '#FFCD00'] }];
  let currentPaletteIndex = colorPalettes.findIndex(p => p.name === 'Domino Default');
  if (currentPaletteIndex === -1) currentPaletteIndex = 0;
  let useCustomColors = false;
  let customColors = ['#228B22', '#DC143C', '#0057B7', '#FFCD00'];

  // View mode state
  let currentViewMode = 'dominoes';  // 'dominoes' | 'dimer' | 'double-dimer' | 'fluctuations'

  // Two-sample state for double dimer and fluctuations
  let secondPartitions = null;
  let cachedDominoes2 = null;
  let cachedLatticePoints2 = null;

  // Height function and fluctuation caches
  let cachedActiveCells = null;   // Map of active cells from lattice points
  let cachedActiveCells2 = null;  // Map of active cells from second sample
  let rawFluctuations = null;     // Map of vertex fluctuation values (h1 - h2) / sqrt(2)

  // 3D View state
  let is3DView = false;
  let renderer3D = null;

  // 3D Vertex heights per domino type (4 types x 6 vertices)
  // Horizontal: 0=UR, 1=UM, 2=UL, 3=LL, 4=LM, 5=LR
  // Vertical: 0=TR, 1=MR, 2=BR, 3=BL, 4=ML, 5=TL
  const vertexHeights = {
    0: [1, 2, 1, 0, -1, 0],    // Horiz type 0 (black start)
    1: [0, -1, 0, 1, 2, 1],    // Horiz type 1 (white start)
    2: [-1, -2, -1, 0, 1, 0],  // Vert type 2 (black start)
    3: [0, 1, 0, -1, -2, -1]   // Vert type 3 (white start)
  };

  // 3D Visual Presets
  const VISUAL_PRESETS_3D = [
    {
      name: 'Default',
      icon: '☀️',
      background: 0xffffff,
      ambient: { intensity: 0.4 },
      hemisphere: { sky: 0xffffff, ground: 0x444444, intensity: 0.3 },
      directional: { intensity: 0.6, position: [10, 10, 15] },
      fill: { intensity: 0.25, position: [-10, -5, -10] },
      material: { type: 'standard', roughness: 0.5, metalness: 0.15, flatShading: true },
      edges: { color: 0x000000, opacity: 0.5 }
    },
    {
      name: 'Clean',
      icon: '✨',
      background: 0xfafafa,
      ambient: { intensity: 0.5 },
      hemisphere: { sky: 0xffffff, ground: 0xeeeeee, intensity: 0.2 },
      directional: { intensity: 0.7, position: [5, 15, 10] },
      fill: { intensity: 0.3, position: [-8, 5, -8] },
      material: { type: 'phong', shininess: 60, flatShading: true },
      edges: { color: 0x333333, opacity: 0.3 }
    },
    {
      name: 'Mathematical',
      icon: '📐',
      background: 0xffffff,
      ambient: { intensity: 0.6 },
      hemisphere: { sky: 0xffffff, ground: 0xffffff, intensity: 0.2 },
      directional: { intensity: 0.4, position: [0, 20, 0] },
      fill: { intensity: 0.2, position: [0, -10, 0] },
      material: { type: 'lambert', flatShading: true },
      edges: { color: 0x000000, opacity: 1.0 }
    },
    {
      name: 'Dramatic',
      icon: '🎭',
      background: 0x1a1a2e,
      ambient: { intensity: 0.35 },
      hemisphere: { sky: 0x6666aa, ground: 0x222244, intensity: 0.25 },
      directional: { intensity: 1.2, position: [15, 20, 5] },
      fill: { intensity: 0.3, position: [-10, 5, -5] },
      material: { type: 'standard', roughness: 0.3, metalness: 0.5, flatShading: true },
      edges: { color: 0x222222, opacity: 0.6 }
    },
    {
      name: 'Playful',
      icon: '🎨',
      background: 0xf0f8ff,
      ambient: { intensity: 0.5 },
      hemisphere: { sky: 0xaaddff, ground: 0xffddaa, intensity: 0.4 },
      directional: { intensity: 0.5, position: [10, 15, 10] },
      fill: { intensity: 0.35, position: [-10, 10, -5] },
      material: { type: 'phong', shininess: 100, flatShading: false },
      edges: { color: 0x444444, opacity: 0.2 }
    }
  ];

  function getCurrentColors() {
    if (useCustomColors) {
      return customColors;
    }
    return colorPalettes[currentPaletteIndex].colors;
  }


  // ========== 3D Renderer Class ==========

  class Domino3DRenderer {
    constructor(container) {
      this.container = container;
      this.autoRotate = false;
      this.lastDominoCount = 0;
      this.currentPresetIndex = 0;
      this.usePerspective = false;

      // Three.js setup
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xffffff);

      // Orthographic camera (top-down initially)
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 400;
      const frustum = 100;
      const aspect = w / h;

      this.camera = new THREE.OrthographicCamera(
        -frustum * aspect / 2, frustum * aspect / 2,
        frustum / 2, -frustum / 2,
        1, 1000
      );
      this.camera.position.set(0, 130, 0);
      this.camera.lookAt(0, 0, 0);

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.getContext().getExtension('OES_element_index_uint');
      container.appendChild(this.renderer.domElement);

      // Controls
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.25;
      this.controls.touches = { ONE: THREE.TOUCH.ROTATE };

      // Lighting
      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      this.scene.add(this.ambientLight);

      this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
      this.hemiLight.position.set(0, 20, 0);
      this.scene.add(this.hemiLight);

      this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
      this.directionalLight.position.set(10, 10, 15);
      this.scene.add(this.directionalLight);

      this.fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
      this.fillLight.position.set(-10, -5, -10);
      this.scene.add(this.fillLight);

      // Group for dominoes
      this.dominoGroup = new THREE.Group();
      this.scene.add(this.dominoGroup);

      // Handle resize
      window.addEventListener('resize', () => this.handleResize());

      // Apply default preset
      this.applyPreset(0);

      // Start animation loop
      this.animate();
    }

    applyPreset(index) {
      this.currentPresetIndex = index % VISUAL_PRESETS_3D.length;
      const preset = VISUAL_PRESETS_3D[this.currentPresetIndex];

      this.scene.background = new THREE.Color(preset.background);
      this.ambientLight.intensity = preset.ambient.intensity;
      this.hemiLight.color.setHex(preset.hemisphere.sky);
      this.hemiLight.groundColor.setHex(preset.hemisphere.ground);
      this.hemiLight.intensity = preset.hemisphere.intensity;
      this.directionalLight.intensity = preset.directional.intensity;
      this.directionalLight.position.set(...preset.directional.position);
      this.fillLight.intensity = preset.fill.intensity;
      this.fillLight.position.set(...preset.fill.position);
    }

    cyclePreset() {
      this.applyPreset(this.currentPresetIndex + 1);
      return VISUAL_PRESETS_3D[this.currentPresetIndex];
    }

    getCurrentPreset() {
      return VISUAL_PRESETS_3D[this.currentPresetIndex];
    }

    togglePerspective() {
      this.usePerspective = !this.usePerspective;
      const w = this.container.clientWidth || 600;
      const h = this.container.clientHeight || 400;
      const target = this.controls.target.clone();

      if (this.usePerspective) {
        this.camera = new THREE.PerspectiveCamera(60, w / h, 1, 2000);
        this.camera.position.set(60, 80, 100);
      } else {
        const frustum = 100;
        const aspect = w / h;
        this.camera = new THREE.OrthographicCamera(
          -frustum * aspect / 2, frustum * aspect / 2,
          frustum / 2, -frustum / 2,
          1, 1000
        );
        this.camera.position.set(0, 130, 0);
      }

      this.camera.lookAt(target);
      this.controls.dispose();
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.copy(target);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.25;
      this.controls.touches = { ONE: THREE.TOUCH.ROTATE };

      return this.usePerspective;
    }

    handleResize() {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const aspect = w / h;

      if (this.usePerspective) {
        this.camera.aspect = aspect;
      } else {
        const frustum = 100;
        this.camera.left = -frustum * aspect / 2;
        this.camera.right = frustum * aspect / 2;
        this.camera.top = frustum / 2;
        this.camera.bottom = -frustum / 2;
      }
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      this.controls.update();

      if (this.autoRotate && this.dominoGroup) {
        this.dominoGroup.rotation.y += 0.005;
      }

      this.renderer.render(this.scene, this.camera);
    }

    rotateHorizontal(angleDegrees) {
      const angleRadians = angleDegrees * Math.PI / 180;
      const target = this.controls.target;
      const offset = new THREE.Vector3();
      offset.subVectors(this.camera.position, target);

      const axis = new THREE.Vector3(0, 1, 0);
      offset.applyAxisAngle(axis, angleRadians);

      this.camera.position.copy(target).add(offset);
      this.camera.lookAt(target);
      this.controls.update();
    }

    setAutoRotate(enabled) {
      this.autoRotate = enabled;
    }

    zoomIn() {
      if (this.usePerspective) {
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, this.controls.target);
        direction.multiplyScalar(0.8);
        this.camera.position.copy(this.controls.target).add(direction);
        this.controls.update();
      } else {
        const factor = 0.8;
        this.camera.left *= factor;
        this.camera.right *= factor;
        this.camera.top *= factor;
        this.camera.bottom *= factor;
        this.camera.updateProjectionMatrix();
      }
    }

    zoomOut() {
      if (this.usePerspective) {
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, this.controls.target);
        direction.multiplyScalar(1.25);
        this.camera.position.copy(this.controls.target).add(direction);
        this.controls.update();
      } else {
        const factor = 1.25;
        this.camera.left *= factor;
        this.camera.right *= factor;
        this.camera.top *= factor;
        this.camera.bottom *= factor;
        this.camera.updateProjectionMatrix();
      }
    }

    resetView() {
      if (this.dominoGroup) {
        this.dominoGroup.rotation.set(0, 0, 0);
      }

      const box = new THREE.Box3();
      if (this.dominoGroup && this.dominoGroup.children.length > 0) {
        box.setFromObject(this.dominoGroup);
      } else {
        box.set(new THREE.Vector3(-50, -50, -50), new THREE.Vector3(50, 50, 50));
      }

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 100;

      const w = this.container.clientWidth || 600;
      const h = this.container.clientHeight || 400;
      const aspect = w / h;

      if (this.usePerspective) {
        const fov = this.camera.fov * (Math.PI / 180);
        const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;
        this.camera.position.set(
          center.x + distance * 0.5,
          center.y + distance,
          center.z + distance * 0.8
        );
        this.camera.lookAt(center);
      } else {
        const frustum = maxDim * 1.2;
        this.camera.left = -frustum * aspect / 2;
        this.camera.right = frustum * aspect / 2;
        this.camera.top = frustum / 2;
        this.camera.bottom = -frustum / 2;
        this.camera.position.set(center.x, center.y + maxDim * 2, center.z);
        this.camera.lookAt(center);
        this.camera.updateProjectionMatrix();
      }
      this.controls.target.copy(center);
      this.controls.update();
    }

    calculateHeightFunction(dominoes) {
      if (!dominoes || dominoes.length === 0) return new Map();

      const adj = new Map();

      function addEdge(v1, v2, dh) {
        const v1Key = `${v1[0]},${v1[1]}`;
        const v2Key = `${v2[0]},${v2[1]}`;

        if (!adj.has(v1Key)) adj.set(v1Key, []);
        if (!adj.has(v2Key)) adj.set(v2Key, []);

        adj.get(v1Key).push([v2Key, dh]);
        adj.get(v2Key).push([v1Key, -dh]);
      }

      for (const d of dominoes) {
        const isHorizontal = (d.y1 === d.y2);
        const x = Math.min(d.x1, d.x2);
        const y = Math.min(d.y1, d.y2);
        const type = d.type;
        const h = vertexHeights[type];

        if (isHorizontal) {
          const TL = [x, y+1], TM = [x+1, y+1], TR = [x+2, y+1];
          const BL = [x, y], BM = [x+1, y], BR = [x+2, y];

          addEdge(TL, TM, h[1] - h[2]);
          addEdge(TM, TR, h[0] - h[1]);
          addEdge(BL, BM, h[4] - h[3]);
          addEdge(BM, BR, h[5] - h[4]);
          addEdge(TL, BL, h[3] - h[2]);
          addEdge(TM, BM, h[4] - h[1]);
          addEdge(TR, BR, h[5] - h[0]);
        } else {
          const TL = [x, y+2], TR = [x+1, y+2];
          const ML = [x, y+1], MR = [x+1, y+1];
          const BL = [x, y], BR = [x+1, y];

          addEdge(TL, ML, h[4] - h[5]);
          addEdge(ML, BL, h[3] - h[4]);
          addEdge(TR, MR, h[1] - h[0]);
          addEdge(MR, BR, h[2] - h[1]);
          addEdge(TL, TR, h[0] - h[5]);
          addEdge(ML, MR, h[1] - h[4]);
          addEdge(BL, BR, h[2] - h[3]);
        }
      }

      const verts = Array.from(adj.keys()).map(k => {
        const [gx, gy] = k.split(',').map(Number);
        return { k, gx, gy };
      });

      if (verts.length === 0) return new Map();

      const root = verts.reduce((a, b) =>
        (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b
      ).k;

      const heights = new Map([[root, 0]]);
      const queue = [root];

      while (queue.length > 0) {
        const v = queue.shift();
        for (const [w, dh] of adj.get(v) || []) {
          if (!heights.has(w)) {
            heights.set(w, heights.get(v) + dh);
            queue.push(w);
          }
        }
      }

      return heights;
    }

    renderDominoes(dominoes, colors, onProgress) {
      // Clear previous geometry
      while (this.dominoGroup.children.length > 0) {
        const child = this.dominoGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        this.dominoGroup.remove(child);
      }

      if (!dominoes || dominoes.length === 0) return;

      const heightMap = this.calculateHeightFunction(dominoes);

      // Collect vertex/index data per color type (0-3)
      const groupVerts = [[], [], [], []];
      const groupIndices = [[], [], [], []];
      const vertexCounts = [0, 0, 0, 0];

      for (let i = 0; i < dominoes.length; i++) {
        const d = dominoes[i];
        const isHorizontal = (d.y1 === d.y2);
        const x = Math.min(d.x1, d.x2);
        const y = Math.min(d.y1, d.y2);
        const type = d.type;
        const hOffsets = vertexHeights[type];

        const baseKey = `${x},${y}`;
        const heightAtRef = heightMap.has(baseKey) ? heightMap.get(baseKey) : 0;
        const baseH = heightAtRef - hOffsets[3];

        let pts;
        if (isHorizontal) {
          pts = [
            [x+2, y+1, baseH + hOffsets[0]],
            [x+1, y+1, baseH + hOffsets[1]],
            [x,   y+1, baseH + hOffsets[2]],
            [x,   y,   baseH + hOffsets[3]],
            [x+1, y,   baseH + hOffsets[4]],
            [x+2, y,   baseH + hOffsets[5]]
          ];
        } else {
          pts = [
            [x+1, y+2, baseH + hOffsets[0]],
            [x+1, y+1, baseH + hOffsets[1]],
            [x+1, y,   baseH + hOffsets[2]],
            [x,   y,   baseH + hOffsets[3]],
            [x,   y+1, baseH + hOffsets[4]],
            [x,   y+2, baseH + hOffsets[5]]
          ];
        }

        const colorIdx = d.colorIndex !== undefined ? d.colorIndex : type;
        const g = colorIdx;
        const vOffset = vertexCounts[g];

        for (const [px, py, h] of pts) {
          groupVerts[g].push(px, h * 0.5, py);
        }

        const triIndices = isHorizontal
          ? [2,0,5, 2,5,3, 2,1,0, 3,4,5]
          : [5,0,2, 5,2,3, 5,4,3, 0,1,2];
        for (const idx of triIndices) {
          groupIndices[g].push(idx + vOffset);
        }

        vertexCounts[g] += 6;
      }

      if (onProgress) onProgress(50);

      // Create one merged mesh + one edge set per color type (8 objects total)
      const preset = this.getCurrentPreset();
      const matSettings = preset.material;

      for (let g = 0; g < 4; g++) {
        if (groupVerts[g].length === 0) continue;

        const vertices = new Float32Array(groupVerts[g]);
        const indices = new Uint32Array(groupIndices[g]);

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geom.setIndex(new THREE.BufferAttribute(indices, 1));
        geom.computeVertexNormals();

        const color = colors[g] || '#888888';
        let mat;
        if (matSettings.type === 'standard') {
          mat = new THREE.MeshStandardMaterial({
            color, side: THREE.DoubleSide,
            flatShading: matSettings.flatShading,
            roughness: matSettings.roughness,
            metalness: matSettings.metalness
          });
        } else if (matSettings.type === 'phong') {
          mat = new THREE.MeshPhongMaterial({
            color, side: THREE.DoubleSide,
            flatShading: matSettings.flatShading,
            shininess: matSettings.shininess
          });
        } else {
          mat = new THREE.MeshLambertMaterial({
            color, side: THREE.DoubleSide,
            flatShading: matSettings.flatShading
          });
        }

        const mesh = new THREE.Mesh(geom, mat);
        this.dominoGroup.add(mesh);

        const edges = new THREE.EdgesGeometry(geom, 15);
        const lineMat = new THREE.LineBasicMaterial({
          color: preset.edges.color,
          linewidth: 1,
          opacity: preset.edges.opacity,
          transparent: preset.edges.opacity < 1
        });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        this.dominoGroup.add(wireframe);

        if (onProgress) onProgress(50 + (g + 1) / 4 * 50);
      }

      const currentCount = dominoes.length;
      if (this.dominoGroup.children.length > 0 && currentCount !== this.lastDominoCount) {
        this.lastDominoCount = currentCount;

        const box = new THREE.Box3().setFromObject(this.dominoGroup);
        const center = box.getCenter(new THREE.Vector3());
        center.y = 0;
        this.dominoGroup.position.set(-center.x, 0, -center.z);

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.z);
        if (maxDim > 0) {
          const scale = 80 / maxDim;
          this.dominoGroup.scale.setScalar(scale);
        }

        this.controls.target.set(0, 0, 0);
      }
    }
  }

  // Convert RSK domino format to 3D-compatible format
  // RSK uses: {cx, cy, width, height, type: 'particle'|'hole', isHorizontal}
  // Screen coords: screenX = hx * scale, screenY = -hy * scale
  // 3D needs: {x1, y1, x2, y2, type: 0-3} where x,y are integer square coords
  function convertDominoFormatFor3D(d) {
    const scale = 20;
    // cx, cy are screen coords of domino center
    // Convert back to half-integer lattice center coords
    const centerHx = d.cx / scale;
    const centerHy = -d.cy / scale;  // flip y back

    let x1, y1, x2, y2;
    if (d.isHorizontal) {
      // Horizontal domino: centerHx is integer, centerHy is half-integer
      x1 = centerHx - 1;
      y1 = centerHy - 0.5;
      x2 = centerHx;
      y2 = y1;
    } else {
      // Vertical domino: centerHx is half-integer, centerHy is integer
      x1 = centerHx - 0.5;
      y1 = centerHy - 1;
      x2 = x1;
      y2 = centerHy;
    }

    // Round to handle floating point errors
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    x2 = Math.round(x2);
    y2 = Math.round(y2);

    // Flip y to match 2D view orientation (negate y coords)
    y1 = -y1;
    y2 = -y2;

    // Determine type based on orientation and starting vertex parity (for height function)
    const startX = Math.min(x1, x2);
    const startY = Math.min(y1, y2);
    const isBlackStart = (startX + startY) % 2 === 0;

    let numericType;
    if (d.isHorizontal) {
      numericType = isBlackStart ? 0 : 1;
    } else {
      numericType = isBlackStart ? 2 : 3;
    }

    // colorIndex matches 2D coloring: particle/hole + horizontal/vertical
    // particle+horiz→0, particle+vert→1, hole+horiz→2, hole+vert→3
    let colorIndex;
    if (d.type === 'particle') {
      colorIndex = d.isHorizontal ? 0 : 1;
    } else {
      colorIndex = d.isHorizontal ? 2 : 3;
    }

    return { x1, y1, x2, y2, type: numericType, colorIndex };
  }

  // 3D View mode management
  function setViewMode3D(use3D) {
    is3DView = use3D;

    const threeContainer = document.getElementById('three-container');
    const toggle3DBtn = document.getElementById('toggle3DBtn');
    const controls3D = document.getElementById('controls-3d');

    // Update button text
    toggle3DBtn.textContent = use3D ? '2D' : '3D';

    // Show/hide 3D control buttons container
    controls3D.style.display = use3D ? 'inline-flex' : 'none';

    // Disable 2D-specific controls in 3D mode
    document.getElementById('renderer-canvas').disabled = use3D;
    document.getElementById('renderer-svg').disabled = use3D;
    document.getElementById('rotate-canvas-cb').disabled = use3D;
    document.getElementById('show-particles-cb').disabled = use3D;

    if (use3D) {
      canvas.style.display = 'none';
      svg.style('display', 'none');
      threeContainer.style.display = 'block';

      if (!renderer3D) {
        renderer3D = new Domino3DRenderer(threeContainer);
      }
      update3DView().catch(err => console.error('3D view error:', err));
    } else {
      threeContainer.style.display = 'none';
      // Restore to current renderer (canvas or svg)
      if (document.getElementById('renderer-canvas').checked) {
        canvas.style.display = 'block';
        svg.style('display', 'none');
      } else {
        canvas.style.display = 'none';
        svg.style('display', 'block').style('pointer-events', 'auto');
      }
      redrawOnly();
    }
  }

  async function update3DView() {
    if (!is3DView || !renderer3D || !cachedDominoes || cachedDominoes.length === 0) return;

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingProgress = document.getElementById('loading-progress');

    // Show loading for large tilings
    const showLoading = cachedDominoes.length > 100;
    if (showLoading) {
      loadingOverlay.style.display = 'flex';
      loadingProgress.textContent = '0%';
      await new Promise(r => setTimeout(r, 10)); // Allow UI to update
    }

    // Convert domino format for 3D rendering
    const convertedDominoes = cachedDominoes.map(convertDominoFormatFor3D);
    const colors = getCurrentColors();

    // Progress callback
    const onProgress = (pct) => {
      if (showLoading) {
        loadingProgress.textContent = Math.round(pct) + '%';
      }
    };

    renderer3D.renderDominoes(convertedDominoes, colors, onProgress);

    if (showLoading) {
      loadingOverlay.style.display = 'none';
    }
  }


  // ========== RSK Sampling Function ==========

  async function aztecDiamondSample(n, x, y, q) {
    if (n === 0) return [[]];

    const startTime = performance.now();
    const xJson = JSON.stringify(x);
    const yJson = JSON.stringify(y);

    simulationActive = true;
    startProgressPolling();

    try {
      const ptr = await sampleAztecRSK(n, xJson, yJson, q);
      if (!ptr) {
        throw new Error("WASM returned null pointer — likely out of memory. Try reducing n.");
      }
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);

      const result = JSON.parse(jsonStr);
      if (result && result.error) {
        throw new Error("C++ sampling error: " + result.error);
      }

      simulationActive = false;
      progressElem.innerText = "";

      const elapsed = performance.now() - startTime;
      if (timingDisplay) {
        timingDisplay.innerText = `(${(elapsed / 1000).toFixed(2)}s)`;
      }

      return result;
    } catch (e) {
      simulationActive = false;
      progressElem.innerText = "Sampling failed: " + e.message + ". Try reducing n or adjusting parameters.";
      if (timingDisplay) {
        timingDisplay.innerText = "";
      }
      console.error("Sampling error:", e);
      return [[]];
    }
  }

  function startProgressPolling() {
    if (progressInterval) clearInterval(progressInterval);
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      if (!simulationActive) {
        clearInterval(progressInterval);
        return;
      }
      const progress = getProgress();
      progressElem.innerText = "Sampling... (" + progress + "%)";
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 50);
  }

  // ========== Parameter Parsing Functions ==========

  // Parse CSV to array with support for value^count notation (e.g., "1^100" = 100 ones)
  function parseCSV(str) {
    const result = [];

    // First, handle (pattern)^count notation: e.g., (1,2)^3 = 1,2,1,2,1,2
    let processed = str;
    const patternRegex = /\(([^)]+)\)\^(\d+)/g;
    processed = processed.replace(patternRegex, (match, patternStr, countStr) => {
      const count = parseInt(countStr, 10);
      const patternValues = patternStr.split(',').map(v => v.trim()).filter(v => v !== '');
      const expanded = [];
      for (let i = 0; i < count; i++) {
        expanded.push(...patternValues);
      }
      return expanded.join(',');
    });

    // Now parse the expanded string
    const tokens = processed.split(',');
    for (const token of tokens) {
      const trimmed = token.trim();
      if (trimmed === '') continue;

      // Check for value^count notation (e.g., 1^4)
      if (trimmed.includes('^')) {
        const parts = trimmed.split('^');
        if (parts.length === 2) {
          const value = parseFloat(parts[0].trim());
          const count = parseInt(parts[1].trim(), 10);
          if (!isNaN(value) && !isNaN(count) && count > 0) {
            for (let i = 0; i < count; i++) {
              result.push(value);
            }
            continue;
          }
        }
      }

      // Regular number
      const value = parseFloat(trimmed);
      if (!isNaN(value)) {
        result.push(value);
      }
    }
    return result;
  }

  // Generate CSV from array
  function arrayToCSV(arr) {
    return arr.map(x => x.toString()).join(',');
  }

  // Update parameters display based on n
  function updateParamsForN(newN) {
    const xParamsField = document.getElementById("x-params");
    const yParamsField = document.getElementById("y-params");
    const currentX = parseCSV(xParamsField.value);
    const currentY = parseCSV(yParamsField.value);

    // Extend or truncate to match n
    const newX = [];
    const newY = [];
    for (let i = 0; i < newN; i++) {
      newX.push(i < currentX.length ? currentX[i] : 1.0);
      newY.push(i < currentY.length ? currentY[i] : 1.0);
    }

    xParamsField.value = arrayToCSV(newX);
    yParamsField.value = arrayToCSV(newY);
  }

  // ========== Particle Count Functions ==========

  // Ground set sizes for each diagonal (index 0 to 2n)
  function getGroundSetSize(diagIdx) {
    return Math.min(diagIdx + 1, 2 * currentN + 1 - diagIdx);
  }

  // Number of particles on diagonal idx for Aztec diamond of size n
  // λ^k (even idx): n - k particles
  // μ^k (odd idx): n - k + 1 particles
  function getParticleCount(idx) {
    const k = Math.floor((idx + 1) / 2);
    if (idx % 2 === 0) {
      return currentN - k;
    } else {
      return currentN - k + 1;
    }
  }

  // Zoom setup
  let initialTransform = {};
  const zoom = d3.zoom()
    .scaleExtent([0.1, 50])
    .on("zoom", (event) => {
      if (!initialTransform.scale) return;
      const group = svg.select("g.particles");
      if (!group.empty()) {
        const t = event.transform;
        const rot = initialTransform.rotation || 0;
        group.attr("transform",
          `translate(${initialTransform.translateX * t.k + t.x},${initialTransform.translateY * t.k + t.y}) scale(${initialTransform.scale * t.k}) rotate(${rot})`);
      }
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", () => {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  });

  // Add zoom controls to dedicated container
  const zoomDiv = d3.select("#zoom-controls-container");

  zoomDiv.append("span").text("Zoom: ").style("font-weight", "bold");
  zoomDiv.append("button").attr("id", "zoom-in-btn").style("margin-left", "5px").text("+")
    .on("click", () => {
      if (document.getElementById("renderer-canvas").checked) {
        canvasTransform.scale *= 1.3;
        redrawOnly();
      } else {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
      }
    });
  zoomDiv.append("button").attr("id", "zoom-out-btn").style("margin-left", "5px").text("-")
    .on("click", () => {
      if (document.getElementById("renderer-canvas").checked) {
        canvasTransform.scale *= 0.7;
        redrawOnly();
      } else {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
      }
    });
  zoomDiv.append("button").attr("id", "zoom-reset-btn").style("margin-left", "5px").text("Reset Zoom")
    .on("click", () => {
      if (document.getElementById("renderer-canvas").checked) {
        canvasTransform = { x: 0, y: 0, scale: 1 };
        redrawOnly();
      } else {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      }
    });
  zoomDiv.append("span").style("margin-left", "10px").style("font-style", "italic").style("font-size", "0.9em")
    .text("(Mouse wheel to zoom, drag to pan)");

  // Superscript helper
  const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  function toSuperscript(num) {
    if (num < 10) return superscripts[num];
    return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
  }

  // Get partition label (λ^k or μ^k) for index
  function getPartitionLabel(idx) {
    if (idx % 2 === 0) {
      return "λ" + toSuperscript(idx / 2);
    } else {
      return "μ" + toSuperscript((idx + 1) / 2);
    }
  }

  // Format partition as string
  function partitionToString(lambda) {
    if (!lambda || lambda.length === 0) return "∅";
    return "(" + lambda.join(",") + ")";
  }

  // Check if μ/λ is a horizontal strip (at most one box per column)
  // Equivalently: μ_i ≥ λ_i ≥ μ_{i+1} for all i
  function isHorizontalStrip(mu, lambda) {
    const maxLen = Math.max(mu.length, lambda.length) + 1;
    for (let i = 0; i < maxLen; i++) {
      const mu_i = i < mu.length ? mu[i] : 0;
      const mu_ip1 = (i + 1) < mu.length ? mu[i + 1] : 0;
      const lambda_i = i < lambda.length ? lambda[i] : 0;
      if (!(mu_i >= lambda_i && lambda_i >= mu_ip1)) {
        return false;
      }
    }
    return true;
  }

  // Check if λ/μ is a vertical strip (at most one box per row)
  // Equivalently: λ_i - μ_i ∈ {0, 1} for all i
  function isVerticalStrip(lambda, mu) {
    const maxLen = Math.max(lambda.length, mu.length);
    for (let i = 0; i < maxLen; i++) {
      const lambda_i = i < lambda.length ? lambda[i] : 0;
      const mu_i = i < mu.length ? mu[i] : 0;
      const diff = lambda_i - mu_i;
      if (diff < 0 || diff > 1) {
        return false;
      }
    }
    return true;
  }

  // Convert partition to subset
  // Given partition λ and ground set size m, number of particles n_p
  function partitionToSubset(partition, numParticles, groundSetSize) {
    const m = groundSetSize;
    const n_p = numParticles;
    const h = m - n_p;  // number of holes (U's in walk)

    if (h <= 0) {
      const subset = [];
      for (let i = 1; i <= m; i++) subset.push(i);
      return subset;
    }

    const lambda = partition || [];
    const lambdaReversed = [...lambda].reverse();
    while (lambdaReversed.length < h) {
      lambdaReversed.unshift(0);
    }

    const holePositions = new Set();
    for (let j = 1; j <= h; j++) {
      const u_j = lambdaReversed[j - 1] + j;
      if (u_j >= 1 && u_j <= m) {
        holePositions.add(u_j);
      }
    }

    const subset = [];
    for (let pos = 1; pos <= m; pos++) {
      if (!holePositions.has(pos)) {
        subset.push(pos);
      }
    }

    return subset;
  }

  // Build walk string from subset
  function buildWalk(subset, groundSetSize) {
    const subsetSet = new Set(subset);
    let walk = "";
    for (let pos = 1; pos <= groundSetSize; pos++) {
      walk += subsetSet.has(pos) ? "R" : "U";
    }
    return walk;
  }

  // Generate lattice points for visualization
  function generateLatticePoints() {
    const scale = 20;
    const latticePoints = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let hx = -currentN - 0.5; hx <= currentN + 0.5; hx += 1) {
      for (let hy = -currentN - 0.5; hy <= currentN + 0.5; hy += 1) {
        if (Math.abs(hx % 1) !== 0.5 || Math.abs(hy % 1) !== 0.5) continue;
        if (Math.abs(hx) + Math.abs(hy) > currentN + 0.5) continue;

        const screenX = hx * scale;
        const screenY = -hy * scale;  // Flip y-axis so positive y is up
        const diag = Math.round(hx + hy);

        latticePoints.push({ hx, hy, x: screenX, y: screenY, diag });
        if (screenX < minX) minX = screenX;
        if (screenX > maxX) maxX = screenX;
        if (screenY < minY) minY = screenY;
        if (screenY > maxY) maxY = screenY;
      }
    }

    // Group by diagonal and assign positions
    const geomDiagonals = {};
    for (const p of latticePoints) {
      if (!geomDiagonals[p.diag]) geomDiagonals[p.diag] = [];
      geomDiagonals[p.diag].push(p);
    }
    for (const d in geomDiagonals) {
      geomDiagonals[d].sort((a, b) => (a.hx - a.hy) - (b.hx - b.hy));
      geomDiagonals[d].forEach((p, i) => { p.posInDiag = i + 1; });
    }

    const bounds = { minX, minY, maxX, maxY };
    return { latticePoints, geomDiagonals, bounds };
  }

  // Integer key for lattice point lookups (avoids string allocation)
  function latticeKey(hx, hy) {
    // hx, hy are half-integers. Multiply by 2 and shift to positive.
    const ix = Math.round(hx * 2) + 2 * currentN + 1;
    const iy = Math.round(hy * 2) + 2 * currentN + 1;
    return ix * (4 * currentN + 3) + iy;
  }

  // Compute dominoes from lattice points (cached for redrawing)
  function computeDominoes(latticePoints) {
    // Create lookup by integer key (faster than string-key object)
    const pointLookup = new Map();
    for (let i = 0; i < latticePoints.length; i++) {
      const p = latticePoints[i];
      pointLookup.set(latticeKey(p.hx, p.hy), p);
    }

    function getNeighbors(p) {
      const neighbors = [];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let d = 0; d < 4; d++) {
        const n = pointLookup.get(latticeKey(p.hx + dirs[d][0], p.hy + dirs[d][1]));
        if (n) neighbors.push(n);
      }
      return neighbors;
    }

    // Match particles - start from bottom-left
    const particles = latticePoints.filter(p => p.inSubset);
    particles.sort((a, b) => {
      const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
      if (sumA !== sumB) return sumA - sumB;
      return (a.hx - a.hy) - (b.hx - b.hy);
    });

    const matchedParticles = new Set();
    const particleDominoes = [];
    for (const p of particles) {
      const pk = latticeKey(p.hx, p.hy);
      if (matchedParticles.has(pk)) continue;
      const neighbors = getNeighbors(p).filter(n => n.inSubset && !matchedParticles.has(latticeKey(n.hx, n.hy)));
      if (neighbors.length > 0) {
        neighbors.sort((a, b) => {
          const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
          if (sumA !== sumB) return sumA - sumB;
          return (a.hx - a.hy) - (b.hx - b.hy);
        });
        const neighbor = neighbors[0];
        matchedParticles.add(pk);
        matchedParticles.add(latticeKey(neighbor.hx, neighbor.hy));
        particleDominoes.push({ p1: p, p2: neighbor });
      }
    }

    // Match holes - start from top-right
    const holes = latticePoints.filter(p => !p.inSubset);
    holes.sort((a, b) => {
      const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
      if (sumA !== sumB) return sumB - sumA;
      return (b.hx - b.hy) - (a.hx - a.hy);
    });

    const matchedHoles = new Set();
    const holeDominoes = [];
    for (const p of holes) {
      const pk = latticeKey(p.hx, p.hy);
      if (matchedHoles.has(pk)) continue;
      const neighbors = getNeighbors(p).filter(n => !n.inSubset && !matchedHoles.has(latticeKey(n.hx, n.hy)));
      if (neighbors.length > 0) {
        neighbors.sort((a, b) => {
          const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
          if (sumA !== sumB) return sumB - sumA;
          return (b.hx - b.hy) - (a.hx - a.hy);
        });
        const neighbor = neighbors[0];
        matchedHoles.add(pk);
        matchedHoles.add(latticeKey(neighbor.hx, neighbor.hy));
        holeDominoes.push({ p1: p, p2: neighbor });
      }
    }

    const scale = 20;
    const result = new Array(particleDominoes.length + holeDominoes.length);
    let ri = 0;
    for (let i = 0; i < particleDominoes.length; i++) {
      const d = particleDominoes[i];
      const isHorizontal = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      result[ri++] = {
        cx: (d.p1.x + d.p2.x) / 2,
        cy: (d.p1.y + d.p2.y) / 2,
        width: isHorizontal ? 2 * scale : scale,
        height: isHorizontal ? scale : 2 * scale,
        type: 'particle',
        isHorizontal
      };
    }
    for (let i = 0; i < holeDominoes.length; i++) {
      const d = holeDominoes[i];
      const isHorizontal = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      result[ri++] = {
        cx: (d.p1.x + d.p2.x) / 2,
        cy: (d.p1.y + d.p2.y) / 2,
        width: isHorizontal ? 2 * scale : scale,
        height: isHorizontal ? scale : 2 * scale,
        type: 'hole',
        isHorizontal
      };
    }
    return result;
  }

  // Get domino color based on type and orientation
  function getDominoColor(type, isHorizontal, showParticles) {
    if (showParticles) return "#ffffff";
    const colors = getCurrentColors();
    if (type === 'particle') {
      return isHorizontal ? colors[0] : colors[1];  // Green (horizontal), Red (vertical)
    } else {
      return isHorizontal ? colors[2] : colors[3];  // Blue (horizontal), Yellow (vertical)
    }
  }

  // Render tiling content to a target canvas context (used by both cache and export)
  function renderCanvasContent(tctx, dominoes, latticePoints, showParticles, borderWidth, rotation) {
    console.time('  colorGrouping');
    // Batch dominoes by color: group rects, fill once per color
    const colorGroups = {};
    for (let i = 0; i < dominoes.length; i++) {
      const d = dominoes[i];
      const color = getDominoColor(d.type, d.isHorizontal, showParticles);
      if (!colorGroups[color]) colorGroups[color] = [];
      colorGroups[color].push(d);
    }
    console.timeEnd('  colorGrouping');

    if (rotation !== 0) {
      tctx.rotate(rotation * Math.PI / 180);
    }

    // Draw all dominoes — fillRect per domino (faster than building giant paths)
    // Expand by 1 domain unit to eliminate anti-aliasing seams (especially at hi-res downscale)
    tctx.imageSmoothingEnabled = false;
    const pad = 1;
    console.time('  dominoFill');
    for (const color in colorGroups) {
      const group = colorGroups[color];
      tctx.fillStyle = color;
      for (let i = 0; i < group.length; i++) {
        const d = group[i];
        tctx.fillRect(d.cx - d.width / 2 - pad, d.cy - d.height / 2 - pad, d.width + pad * 2, d.height + pad * 2);
      }
    }
    console.timeEnd('  dominoFill');

    // Draw borders — skip when dominoes are too numerous (borders invisible at that scale)
    console.time('  borderStroke');
    if (borderWidth > 0 && dominoes.length <= 10000) {
      tctx.strokeStyle = "#000";
      tctx.lineWidth = borderWidth;
      tctx.beginPath();
      for (let i = 0; i < dominoes.length; i++) {
        const d = dominoes[i];
        tctx.rect(d.cx - d.width / 2, d.cy - d.height / 2, d.width, d.height);
      }
      tctx.stroke();
    }
    console.timeEnd('  borderStroke');

    // Draw particles if enabled (batched: black fills, then white fills, then all strokes)
    if (showParticles) {
      // Black particles (inSubset)
      tctx.fillStyle = "#000000";
      tctx.beginPath();
      for (let i = 0; i < latticePoints.length; i++) {
        const p = latticePoints[i];
        if (p.inSubset) {
          tctx.moveTo(p.x + 5, p.y);
          tctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        }
      }
      tctx.fill();
      // White particles (holes)
      tctx.fillStyle = "#ffffff";
      tctx.beginPath();
      for (let i = 0; i < latticePoints.length; i++) {
        const p = latticePoints[i];
        if (!p.inSubset) {
          tctx.moveTo(p.x + 5, p.y);
          tctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        }
      }
      tctx.fill();
      // All particle outlines
      tctx.strokeStyle = "#000";
      tctx.lineWidth = 1;
      tctx.beginPath();
      for (let i = 0; i < latticePoints.length; i++) {
        const p = latticePoints[i];
        tctx.moveTo(p.x + 5, p.y);
        tctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
      }
      tctx.stroke();
    }

    // Draw diagonal highlight lines when partition details are open
    if (showDiagonalHighlights && latticePoints.length > 0) {
      const scale = 20;
      tctx.strokeStyle = "rgba(255, 0, 0, 0.4)";
      tctx.lineWidth = 2;
      const fullExtent = currentN + 0.5;
      tctx.beginPath();
      for (let d = -currentN; d <= currentN; d++) {
        const x1 = (d / 2 - fullExtent) * scale;
        const y1 = -(d / 2 + fullExtent) * scale;
        const x2 = (d / 2 + fullExtent) * scale;
        const y2 = -(d / 2 - fullExtent) * scale;
        tctx.moveTo(x1, y1);
        tctx.lineTo(x2, y2);
      }
      tctx.stroke();
    }
  }

  // Canvas rendering function with OffscreenCanvas caching for fast zoom/pan
  function renderCanvas(dominoes, latticePoints, bounds, showParticles, borderWidth, rotation) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;
    const baseScale = Math.min(w / widthPts, h / heightPts) * 0.9;
    const baseX = (w - widthPts * baseScale) / 2 - (minX - 20) * baseScale;
    const baseY = (h - heightPts * baseScale) / 2 - (minY - 20) * baseScale;

    // Check if we need to re-render the cache (data change, style change, or resize)
    const hiresMultiplier = 3;
    const hiresCacheScale = dpr * hiresMultiplier;
    const currentParams = `${showParticles}|${borderWidth}|${rotation}|${showDiagonalHighlights}|${getCurrentColors().join(',')}`;
    const needsCacheUpdate = canvasCacheRenderedVersion !== canvasCacheVersion ||
      canvasCacheParams !== currentParams ||
      !canvasCacheCanvas || canvasCacheWidth !== w * hiresCacheScale || canvasCacheHeight !== h * hiresCacheScale;

    if (needsCacheUpdate) {
      // Progressive rendering: draw at 1x immediately, then upgrade to hi-res
      const loScale = dpr;
      const loW = Math.round(w * loScale);
      const loH = Math.round(h * loScale);

      // Fast 1x render (shows instantly)
      console.time('  cacheRender-1x');
      canvasCacheCanvas = document.createElement('canvas');
      canvasCacheCanvas.width = loW;
      canvasCacheCanvas.height = loH;
      canvasCacheWidth = loW;
      canvasCacheHeight = loH;
      const lctx = canvasCacheCanvas.getContext('2d');
      lctx.scale(loScale, loScale);
      lctx.translate(baseX, baseY);
      lctx.scale(baseScale, baseScale);
      renderCanvasContent(lctx, dominoes, latticePoints, showParticles, borderWidth, rotation);
      canvasCacheRenderedVersion = canvasCacheVersion;
      canvasCacheParams = currentParams;
      console.timeEnd('  cacheRender-1x');

      // Schedule hi-res upgrade if multiplier > 1
      if (hiresMultiplier > 1) {
        const capturedVersion = canvasCacheVersion;
        const capturedParams = currentParams;
        setTimeout(() => {
          // Abort if data changed since we scheduled
          if (canvasCacheVersion !== capturedVersion || canvasCacheParams !== capturedParams) return;
          console.time('  cacheRender-hires');
          const hiW = Math.round(w * hiresCacheScale);
          const hiH = Math.round(h * hiresCacheScale);
          const hiCanvas = document.createElement('canvas');
          hiCanvas.width = hiW;
          hiCanvas.height = hiH;
          const hctx = hiCanvas.getContext('2d');
          hctx.scale(hiresCacheScale, hiresCacheScale);
          hctx.translate(baseX, baseY);
          hctx.scale(baseScale, baseScale);
          renderCanvasContent(hctx, dominoes, latticePoints, showParticles, borderWidth, rotation);
          // Swap in hi-res cache
          if (canvasCacheVersion === capturedVersion) {
            canvasCacheCanvas = hiCanvas;
            canvasCacheWidth = hiW;
            canvasCacheHeight = hiH;
            console.timeEnd('  cacheRender-hires');
            redrawOnly();  // Repaint with sharp cache
          }
        }, 0);
      }
    }

    // Draw background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, w, h);

    // Draw cached image with zoom/pan transform (no smoothing to avoid Moiré seams)
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(canvasTransform.x, canvasTransform.y);
    ctx.scale(canvasTransform.scale, canvasTransform.scale);
    ctx.drawImage(canvasCacheCanvas, 0, 0, canvasCacheWidth, canvasCacheHeight, 0, 0, w, h);
    ctx.restore();
  }

  // SVG rendering function (optimized with data binding)
  function renderSVG(dominoes, latticePoints, bounds, showParticles, borderWidth, rotation) {
    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scaleView = Math.min(svgWidth / widthPts, svgHeight / heightPts) * 0.9;
    const translateX = (svgWidth - widthPts * scaleView) / 2 - (minX - 20) * scaleView;
    const translateY = (svgHeight - heightPts * scaleView) / 2 - (minY - 20) * scaleView;

    initialTransform = { translateX, translateY, scale: scaleView, rotation };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "particles")
      .attr("transform", `translate(${translateX},${translateY}) scale(${scaleView}) rotate(${rotation})`);

    // Use D3 data binding for batch DOM creation
    group.selectAll("rect.domino")
      .data(dominoes)
      .enter()
      .append("rect")
      .attr("class", "domino")
      .attr("x", d => d.cx - d.width / 2)
      .attr("y", d => d.cy - d.height / 2)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("fill", d => getDominoColor(d.type, d.isHorizontal, showParticles))
      .attr("stroke", borderWidth > 0 ? "#000" : "none")
      .attr("stroke-width", borderWidth);

    if (showParticles) {
      group.selectAll("circle.particle")
        .data(latticePoints)
        .enter()
        .append("circle")
        .attr("class", "particle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 5)
        .attr("fill", d => d.inSubset ? "#000000" : "#ffffff")
        .attr("stroke", "#000")
        .attr("stroke-width", 1);
    }
  }

  // Main render function - dispatches to canvas or SVG
  // Async with yield points to prevent page freeze at large n
  async function renderParticles() {
    const isLargeN = currentN >= 50;
    console.time('renderParticles total');

    if (isLargeN) { progressElem.innerText = "Computing lattice..."; await new Promise(r => setTimeout(r, 0)); }
    console.time('generateLatticePoints');
    const { latticePoints, geomDiagonals, bounds } = generateLatticePoints();
    console.timeEnd('generateLatticePoints');
    const diagKeys = Object.keys(geomDiagonals).map(Number).sort((a, b) => a - b);

    // Convert partitions to subsets
    console.time('partitionToSubset loop');
    const subsetsByDiag = {};
    for (let idx = 0; idx < currentPartitions.length && idx < diagKeys.length; idx++) {
      const diagKey = diagKeys[idx];
      const diagSize = geomDiagonals[diagKey].length;
      const partition = currentPartitions[idx] || [];
      const numParticles = getParticleCount(idx);
      const subset = partitionToSubset(partition, numParticles, diagSize);
      subsetsByDiag[diagKey] = new Set(subset);
    }

    for (let i = 0; i < latticePoints.length; i++) {
      const p = latticePoints[i];
      const subset = subsetsByDiag[p.diag];
      p.inSubset = subset ? subset.has(p.posInDiag) : false;
    }
    console.timeEnd('partitionToSubset loop');

    // Compute dominoes
    if (isLargeN) { progressElem.innerText = "Computing tiling..."; await new Promise(r => setTimeout(r, 0)); }
    console.time('computeDominoes');
    const dominoes = computeDominoes(latticePoints);
    console.timeEnd('computeDominoes');

    // Cache for redraw on style changes
    cachedDominoes = dominoes;
    cachedLatticePoints = latticePoints;
    cachedBounds = bounds;
    console.time('buildActiveCells');
    cachedActiveCells = buildActiveCells(latticePoints);
    console.timeEnd('buildActiveCells');
    invalidateCanvasCache();

    if (isLargeN) { progressElem.innerText = "Rendering..."; await new Promise(r => setTimeout(r, 0)); }

    const showParticles = document.getElementById("show-particles-cb").checked;
    const borderWidth = parseFloat(document.getElementById("border-slider").value);
    const rotateCanvas = document.getElementById("rotate-canvas-cb").checked;
    const rotation = rotateCanvas ? -45 : 0;

    const useCanvas = document.getElementById("renderer-canvas").checked;

    if (useCanvas) {
      canvas.style.display = "block";
      svg.style("display", "none");
      console.time('renderCanvas');
      renderCanvas(dominoes, latticePoints, bounds, showParticles, borderWidth, rotation);
      console.timeEnd('renderCanvas');
    } else {
      canvas.style.display = "none";
      svg.style("display", "block").style("pointer-events", "auto");
      renderSVG(dominoes, latticePoints, bounds, showParticles, borderWidth, rotation);
    }

    if (isLargeN) { progressElem.innerText = ""; }
    console.timeEnd('renderParticles total');
    console.log(`  n=${currentN}, latticePoints=${latticePoints.length}, dominoes=${dominoes.length}`);
  }

  // ========== Dimer Rendering (2-color scheme) ==========

  function getDimerColor(type) {
    return type === 'particle' ? '#000000' : '#888888';
  }

  function getDimerEndpoints(d) {
    const x1 = d.cx - (d.isHorizontal ? d.width / 4 : 0);
    const y1 = d.cy - (d.isHorizontal ? 0 : d.height / 4);
    const x2 = d.cx + (d.isHorizontal ? d.width / 4 : 0);
    const y2 = d.cy + (d.isHorizontal ? 0 : d.height / 4);
    return { x1, y1, x2, y2 };
  }

  function renderDimerCanvas(dominoes, bounds, rotation) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;
    const baseScale = Math.min(rect.width / widthPts, rect.height / heightPts) * 0.9;
    const baseX = (rect.width - widthPts * baseScale) / 2 - (minX - 20) * baseScale;
    const baseY = (rect.height - heightPts * baseScale) / 2 - (minY - 20) * baseScale;

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(canvasTransform.x + baseX * canvasTransform.scale, canvasTransform.y + baseY * canvasTransform.scale);
    ctx.scale(baseScale * canvasTransform.scale, baseScale * canvasTransform.scale);

    if (rotation !== 0) {
      ctx.rotate(rotation * Math.PI / 180);
    }

    // Draw dimer edges and endpoints
    for (const d of dominoes) {
      const color = getDimerColor(d.type);
      const { x1, y1, x2, y2 } = getDimerEndpoints(d);

      // Draw line
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw endpoints
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x1, y1, 3.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, y2, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.restore();
  }

  function renderDimerSVG(dominoes, bounds, rotation) {
    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scaleView = Math.min(svgWidth / widthPts, svgHeight / heightPts) * 0.9;
    const translateX = (svgWidth - widthPts * scaleView) / 2 - (minX - 20) * scaleView;
    const translateY = (svgHeight - heightPts * scaleView) / 2 - (minY - 20) * scaleView;

    initialTransform = { translateX, translateY, scale: scaleView, rotation };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "particles")
      .attr("transform", `translate(${translateX},${translateY}) scale(${scaleView}) rotate(${rotation})`);

    // Draw dimer lines
    group.selectAll("line.dimer")
      .data(dominoes)
      .enter()
      .append("line")
      .attr("class", "dimer")
      .attr("x1", d => getDimerEndpoints(d).x1)
      .attr("y1", d => getDimerEndpoints(d).y1)
      .attr("x2", d => getDimerEndpoints(d).x2)
      .attr("y2", d => getDimerEndpoints(d).y2)
      .attr("stroke", d => getDimerColor(d.type))
      .attr("stroke-width", 3);

    // Draw endpoints
    const endpoints = dominoes.flatMap(d => {
      const { x1, y1, x2, y2 } = getDimerEndpoints(d);
      return [
        { x: x1, y: y1, type: d.type },
        { x: x2, y: y2, type: d.type }
      ];
    });

    group.selectAll("circle.dimer-endpoint")
      .data(endpoints)
      .enter()
      .append("circle")
      .attr("class", "dimer-endpoint")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 3.5)
      .attr("fill", d => getDimerColor(d.type));
  }

  // ========== Double Dimer Rendering ==========

  function createEdgeKey(d) {
    const { x1, y1, x2, y2 } = getDimerEndpoints(d);
    // Round and normalize to avoid floating point issues
    const rx1 = Math.round(x1 * 1000) / 1000;
    const ry1 = Math.round(y1 * 1000) / 1000;
    const rx2 = Math.round(x2 * 1000) / 1000;
    const ry2 = Math.round(y2 * 1000) / 1000;

    return `${Math.min(rx1, rx2)},${Math.min(ry1, ry2)}-${Math.max(rx1, rx2)},${Math.max(ry1, ry2)}`;
  }

  function buildEdgeMap(dominoes1, dominoes2) {
    const edgeMap = new Map();

    dominoes1.forEach(d => {
      const key = createEdgeKey(d);
      edgeMap.set(key, { config1: true, config2: false, domino: d });
    });

    dominoes2.forEach(d => {
      const key = createEdgeKey(d);
      if (edgeMap.has(key)) {
        edgeMap.get(key).config2 = true;
      } else {
        edgeMap.set(key, { config1: false, config2: true, domino: d });
      }
    });

    return edgeMap;
  }

  function getDoubleDimerColor(edgeInfo) {
    if (edgeInfo.config1 && edgeInfo.config2) return '#800080';  // Purple
    if (edgeInfo.config1) return '#000000';  // Black
    return '#cc0000';  // Red
  }

  // ========== Loop/Cycle Filtering for Double Dimer ==========

  function filterEdgesByLoopSize(edgeMap, minLoopSize) {
    // Non-double edges form alternating loops/paths through the graph
    // Build vertex adjacency from non-double edges
    const vertexAdj = new Map();  // vertex key -> array of {edgeKey, neighbor}

    const addToAdj = (v1, v2, edgeKey) => {
      if (!vertexAdj.has(v1)) vertexAdj.set(v1, []);
      if (!vertexAdj.has(v2)) vertexAdj.set(v2, []);
      vertexAdj.get(v1).push({ edgeKey, neighbor: v2 });
      vertexAdj.get(v2).push({ edgeKey, neighbor: v1 });
    };

    // Get non-double edges
    const nonDoubleEdges = [];
    edgeMap.forEach((edgeInfo, edgeKey) => {
      if (!(edgeInfo.config1 && edgeInfo.config2)) {
        // This is a non-double edge
        const { x1, y1, x2, y2 } = getDimerEndpoints(edgeInfo.domino);
        const v1 = `${Math.round(x1 * 1000) / 1000},${Math.round(y1 * 1000) / 1000}`;
        const v2 = `${Math.round(x2 * 1000) / 1000},${Math.round(y2 * 1000) / 1000}`;
        addToAdj(v1, v2, edgeKey);
        nonDoubleEdges.push(edgeKey);
      }
    });

    // Find connected components using DFS
    const visited = new Set();
    const components = [];  // each component is array of edge keys

    for (const startVertex of vertexAdj.keys()) {
      if (visited.has(startVertex)) continue;

      const component = [];
      const componentSet = new Set();
      const stack = [startVertex];

      while (stack.length > 0) {
        const v = stack.pop();
        if (visited.has(v)) continue;
        visited.add(v);

        const neighbors = vertexAdj.get(v) || [];
        for (const { edgeKey, neighbor } of neighbors) {
          if (!componentSet.has(edgeKey)) {
            componentSet.add(edgeKey);
            component.push(edgeKey);
          }
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }

      if (component.length > 0) {
        components.push(component);
      }
    }

    // Filter components by size
    const keptEdges = new Set();
    for (const component of components) {
      // Loop size is the number of edges in the component
      if (component.length >= minLoopSize) {
        component.forEach(e => keptEdges.add(e));
      }
    }

    // Build filtered edge map
    const filteredEdgeMap = new Map();
    edgeMap.forEach((edgeInfo, edgeKey) => {
      const isDoubleEdge = edgeInfo.config1 && edgeInfo.config2;
      // Include double edges only if minLoopSize <= 2 (k=2 means show double)
      // Include non-double edges only if they belong to a loop of size >= k
      if (isDoubleEdge) {
        if (minLoopSize <= 2) {
          filteredEdgeMap.set(edgeKey, edgeInfo);
        }
      } else {
        if (keptEdges.has(edgeKey)) {
          filteredEdgeMap.set(edgeKey, edgeInfo);
        }
      }
    });

    return filteredEdgeMap;
  }

  function renderDoubleDimerCanvas(edgeMap, bounds, rotation) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;
    const baseScale = Math.min(rect.width / widthPts, rect.height / heightPts) * 0.9;
    const baseX = (rect.width - widthPts * baseScale) / 2 - (minX - 20) * baseScale;
    const baseY = (rect.height - heightPts * baseScale) / 2 - (minY - 20) * baseScale;

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(canvasTransform.x + baseX * canvasTransform.scale, canvasTransform.y + baseY * canvasTransform.scale);
    ctx.scale(baseScale * canvasTransform.scale, baseScale * canvasTransform.scale);

    if (rotation !== 0) {
      ctx.rotate(rotation * Math.PI / 180);
    }

    // Edge filtering is done before calling this function
    edgeMap.forEach((edgeInfo) => {
      const d = edgeInfo.domino;
      const { x1, y1, x2, y2 } = getDimerEndpoints(d);
      const color = getDoubleDimerColor(edgeInfo);

      // Draw line
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw endpoints
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x1, y1, 3.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, y2, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.restore();
  }

  function renderDoubleDimerSVG(edgeMap, bounds, rotation) {
    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scaleView = Math.min(svgWidth / widthPts, svgHeight / heightPts) * 0.9;
    const translateX = (svgWidth - widthPts * scaleView) / 2 - (minX - 20) * scaleView;
    const translateY = (svgHeight - heightPts * scaleView) / 2 - (minY - 20) * scaleView;

    initialTransform = { translateX, translateY, scale: scaleView, rotation };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "particles")
      .attr("transform", `translate(${translateX},${translateY}) scale(${scaleView}) rotate(${rotation})`);

    // Edge filtering is done before calling this function
    const edgesData = [];
    edgeMap.forEach((edgeInfo) => {
      edgesData.push(edgeInfo);
    });

    // Draw lines
    group.selectAll("line.double-dimer")
      .data(edgesData)
      .enter()
      .append("line")
      .attr("class", "double-dimer")
      .attr("x1", d => getDimerEndpoints(d.domino).x1)
      .attr("y1", d => getDimerEndpoints(d.domino).y1)
      .attr("x2", d => getDimerEndpoints(d.domino).x2)
      .attr("y2", d => getDimerEndpoints(d.domino).y2)
      .attr("stroke", d => getDoubleDimerColor(d))
      .attr("stroke-width", 3);

    // Draw endpoints
    const endpoints = edgesData.flatMap(edgeInfo => {
      const { x1, y1, x2, y2 } = getDimerEndpoints(edgeInfo.domino);
      const color = getDoubleDimerColor(edgeInfo);
      return [
        { x: x1, y: y1, color },
        { x: x2, y: y2, color }
      ];
    });

    group.selectAll("circle.double-dimer-endpoint")
      .data(endpoints)
      .enter()
      .append("circle")
      .attr("class", "double-dimer-endpoint")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 3.5)
      .attr("fill", d => d.color);
  }

  // ========== Height Function Computation ==========
  // Based on pattern from ultimate-domino.md - computes heights at integer VERTICES

  // Build active cells from lattice points (cells at half-integer grid)
  function buildActiveCells(latticePoints) {
    const scale = 20;  // pixel scale
    const activeCells = new Map();
    for (const p of latticePoints) {
      // Each lattice point (at pixel position) defines a cell center
      // Convert to integer cell coordinates
      const cellX = Math.round(p.x / scale);
      const cellY = Math.round(p.y / scale);
      activeCells.set(`${cellX},${cellY}`, { x: cellX, y: cellY });
    }
    return activeCells;
  }

  // Convert dominoes to edges format: array of {x1, y1, x2, y2}
  function dominoesToEdges(dominoes) {
    const scale = 20;
    const edges = [];
    for (const d of dominoes) {
      // Each domino covers two unit cells
      // Extract the two cell centers it connects
      if (d.isHorizontal) {
        // Horizontal domino: cells at (cx - scale/2, cy) and (cx + scale/2, cy)
        const x1 = Math.round((d.cx - scale / 2) / scale);
        const y1 = Math.round(d.cy / scale);
        const x2 = Math.round((d.cx + scale / 2) / scale);
        const y2 = y1;
        edges.push({ x1, y1, x2, y2 });
      } else {
        // Vertical domino: cells at (cx, cy - scale/2) and (cx, cy + scale/2)
        const x1 = Math.round(d.cx / scale);
        const y1 = Math.round((d.cy - scale / 2) / scale);
        const x2 = x1;
        const y2 = Math.round((d.cy + scale / 2) / scale);
        edges.push({ x1, y1, x2, y2 });
      }
    }
    return edges;
  }

  function computeHeightFunction(dominoes, activeCells) {
    // Height function computed at integer vertices (corners of cells)
    // Algorithm from ultimate-domino.md: BFS with height changes based on edge crossings
    const edges = dominoesToEdges(dominoes);
    if (edges.length === 0) return new Map();

    const heights = new Map();
    const edgeSet = new Set();
    for (const e of edges) {
      const x = Math.min(e.x1, e.x2), y = Math.min(e.y1, e.y2);
      edgeSet.add(`${x},${y},${e.x1 === e.x2 ? 1 : 0}`);
    }

    // Start from bottom-left corner vertex of first cell
    let startX, startY;
    for (const [key] of activeCells) {
      const [x, y] = key.split(',').map(Number);
      if (startX === undefined || y < startY || (y === startY && x < startX)) {
        startX = x; startY = y;
      }
    }
    if (startX === undefined) return new Map();

    heights.set(`${startX},${startY}`, 0);
    const queue = [[startX, startY]];
    const visited = new Set([`${startX},${startY}`]);

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      const h = heights.get(`${cx},${cy}`);

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, nkey = `${nx},${ny}`;
        if (visited.has(nkey)) continue;

        // Check if neighbor is adjacent to any active cell
        let adj = false;
        for (let ax = nx - 1; ax <= nx; ax++) {
          for (let ay = ny - 1; ay <= ny; ay++) {
            if (activeCells.has(`${ax},${ay}`)) adj = true;
          }
        }
        if (!adj) continue;

        // Compute height change based on edge crossing
        let dh = 0;
        if (dx === 1) {
          dh = edgeSet.has(`${cx},${cy - 1},1`) ? ((cx + cy - 1) % 2 === 0 ? -1 : 1) : ((cx + cy - 1) % 2 === 0 ? 1 : -1);
        } else if (dx === -1) {
          dh = edgeSet.has(`${cx - 1},${cy - 1},1`) ? ((cx - 1 + cy - 1) % 2 === 0 ? 1 : -1) : ((cx - 1 + cy - 1) % 2 === 0 ? -1 : 1);
        } else if (dy === 1) {
          dh = edgeSet.has(`${cx - 1},${cy},0`) ? ((cx - 1 + cy) % 2 === 0 ? -1 : 1) : ((cx - 1 + cy) % 2 === 0 ? 1 : -1);
        } else {
          dh = edgeSet.has(`${cx - 1},${cy - 1},0`) ? ((cx - 1 + cy - 1) % 2 === 0 ? 1 : -1) : ((cx - 1 + cy - 1) % 2 === 0 ? -1 : 1);
        }

        heights.set(nkey, h + dh);
        visited.add(nkey);
        queue.push([nx, ny]);
      }
    }

    return heights;
  }

  // ========== Fluctuation Rendering (Filled Heatmap) ==========

  function computeFluctuationDiffs(heights1, heights2) {
    // Compute raw fluctuation differences at vertices (not scaled yet)
    const diffs = new Map();
    for (const [key, h1] of heights1) {
      const h2 = heights2.get(key) || 0;
      diffs.set(key, (h1 - h2) / Math.sqrt(2));
    }
    return diffs;
  }

  function getFluctuationColor(avg, range) {
    // Color based on fluctuation value and auto-scaled range
    // Red for positive, blue for negative, gray for zero
    let r, g, b;
    if (avg >= 0) {
      const t = Math.min(1, avg / range);
      r = 255;
      g = b = Math.round(255 * (1 - t));
    } else {
      const t = Math.min(1, -avg / range);
      r = g = Math.round(255 * (1 - t));
      b = 255;
    }
    return `rgb(${r},${g},${b})`;
  }

  function renderFluctuationsCanvas(activeCells, rawFluctuations, bounds, rotation) {
    // Pattern from ultimate-domino.md: fill each cell by averaging corner fluctuations
    if (!rawFluctuations || rawFluctuations.size === 0) return;

    // Auto-scale based on data range
    let minF = Infinity, maxF = -Infinity;
    for (const [, v] of rawFluctuations) {
      minF = Math.min(minF, v);
      maxF = Math.max(maxF, v);
    }
    const range = Math.max(Math.abs(minF), Math.abs(maxF)) || 1;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;
    const baseScale = Math.min(rect.width / widthPts, rect.height / heightPts) * 0.9;
    const baseX = (rect.width - widthPts * baseScale) / 2 - (minX - 20) * baseScale;
    const baseY = (rect.height - heightPts * baseScale) / 2 - (minY - 20) * baseScale;

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(canvasTransform.x + baseX * canvasTransform.scale, canvasTransform.y + baseY * canvasTransform.scale);
    ctx.scale(baseScale * canvasTransform.scale, baseScale * canvasTransform.scale);

    if (rotation !== 0) {
      ctx.rotate(rotation * Math.PI / 180);
    }

    const cellSize = 20;  // pixel size per cell

    // Fill each cell with averaged corner fluctuations
    for (const [key, cell] of activeCells) {
      let sum = 0, cnt = 0;
      // Average corner vertices (cell corners are at integer coords)
      for (let dx = 0; dx <= 1; dx++) {
        for (let dy = 0; dy <= 1; dy++) {
          const fk = `${cell.x + dx},${cell.y + dy}`;
          if (rawFluctuations.has(fk)) {
            sum += rawFluctuations.get(fk);
            cnt++;
          }
        }
      }
      const avg = cnt > 0 ? sum / cnt : 0;
      const color = getFluctuationColor(avg, range);

      // Cell pixel position: cell coords * cellSize
      const px = cell.x * cellSize;
      const py = cell.y * cellSize;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, cellSize, cellSize);
    }

    // Draw boundary
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    for (const [key, cell] of activeCells) {
      const px = cell.x * cellSize, py = cell.y * cellSize;
      if (!activeCells.has(`${cell.x - 1},${cell.y}`)) {
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + cellSize); ctx.stroke();
      }
      if (!activeCells.has(`${cell.x + 1},${cell.y}`)) {
        ctx.beginPath(); ctx.moveTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); ctx.stroke();
      }
      if (!activeCells.has(`${cell.x},${cell.y - 1}`)) {
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); ctx.stroke();
      }
      if (!activeCells.has(`${cell.x},${cell.y + 1}`)) {
        ctx.beginPath(); ctx.moveTo(px, py + cellSize); ctx.lineTo(px + cellSize, py + cellSize); ctx.stroke();
      }
    }

    ctx.restore();
  }

  function renderFluctuationsSVG(activeCells, rawFluctuations, bounds, rotation) {
    if (!rawFluctuations || rawFluctuations.size === 0) return;

    // Auto-scale based on data range
    let minF = Infinity, maxF = -Infinity;
    for (const [, v] of rawFluctuations) {
      minF = Math.min(minF, v);
      maxF = Math.max(maxF, v);
    }
    const range = Math.max(Math.abs(minF), Math.abs(maxF)) || 1;

    const { minX, minY, maxX, maxY } = bounds;
    const widthPts = maxX - minX + 40;
    const heightPts = maxY - minY + 40;

    const bbox = svg.node().getBoundingClientRect();
    const svgWidth = bbox.width;
    const svgHeight = bbox.height;
    svg.attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);

    const scaleView = Math.min(svgWidth / widthPts, svgHeight / heightPts) * 0.9;
    const translateX = (svgWidth - widthPts * scaleView) / 2 - (minX - 20) * scaleView;
    const translateY = (svgHeight - heightPts * scaleView) / 2 - (minY - 20) * scaleView;

    initialTransform = { translateX, translateY, scale: scaleView, rotation };
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.selectAll("g").remove();

    const group = svg.append("g")
      .attr("class", "particles")
      .attr("transform", `translate(${translateX},${translateY}) scale(${scaleView}) rotate(${rotation})`);

    const cellSize = 20;

    // Prepare cell data with averaged fluctuations
    const cellsData = [];
    for (const [key, cell] of activeCells) {
      let sum = 0, cnt = 0;
      for (let dx = 0; dx <= 1; dx++) {
        for (let dy = 0; dy <= 1; dy++) {
          const fk = `${cell.x + dx},${cell.y + dy}`;
          if (rawFluctuations.has(fk)) {
            sum += rawFluctuations.get(fk);
            cnt++;
          }
        }
      }
      const avg = cnt > 0 ? sum / cnt : 0;
      cellsData.push({ cell, avg });
    }

    group.selectAll("rect.fluct-cell")
      .data(cellsData)
      .enter()
      .append("rect")
      .attr("class", "fluct-cell")
      .attr("x", d => d.cell.x * cellSize)
      .attr("y", d => d.cell.y * cellSize)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("fill", d => getFluctuationColor(d.avg, range))
      .attr("stroke", "none");

    // Draw boundary
    const boundaryLines = [];
    for (const [key, cell] of activeCells) {
      const px = cell.x * cellSize, py = cell.y * cellSize;
      if (!activeCells.has(`${cell.x - 1},${cell.y}`)) {
        boundaryLines.push({ x1: px, y1: py, x2: px, y2: py + cellSize });
      }
      if (!activeCells.has(`${cell.x + 1},${cell.y}`)) {
        boundaryLines.push({ x1: px + cellSize, y1: py, x2: px + cellSize, y2: py + cellSize });
      }
      if (!activeCells.has(`${cell.x},${cell.y - 1}`)) {
        boundaryLines.push({ x1: px, y1: py, x2: px + cellSize, y2: py });
      }
      if (!activeCells.has(`${cell.x},${cell.y + 1}`)) {
        boundaryLines.push({ x1: px, y1: py + cellSize, x2: px + cellSize, y2: py + cellSize });
      }
    }
    group.selectAll("line.boundary")
      .data(boundaryLines)
      .enter()
      .append("line")
      .attr("class", "boundary")
      .attr("x1", d => d.x1)
      .attr("y1", d => d.y1)
      .attr("x2", d => d.x2)
      .attr("y2", d => d.y2)
      .attr("stroke", "#333")
      .attr("stroke-width", 2);
  }

  // ========== Helper to compute second sample data ==========

  function computeSecondSampleData() {
    if (!secondPartitions) return;

    const { latticePoints: lp2, geomDiagonals: gd2 } = generateLatticePoints();
    const diagKeys = Object.keys(gd2).map(Number).sort((a, b) => a - b);

    // Convert partitions to subsets
    const subsetsByDiag = {};
    for (let idx = 0; idx < secondPartitions.length && idx < diagKeys.length; idx++) {
      const diagKey = diagKeys[idx];
      const diagSize = gd2[diagKey].length;
      const partition = secondPartitions[idx] || [];
      const numParticles = getParticleCount(idx);
      const subset = partitionToSubset(partition, numParticles, diagSize);
      subsetsByDiag[diagKey] = new Set(subset);
    }

    lp2.forEach(p => {
      const subset = subsetsByDiag[p.diag];
      p.inSubset = subset ? subset.has(p.posInDiag) : false;
    });

    cachedDominoes2 = computeDominoes(lp2);
    cachedLatticePoints2 = lp2;
  }

  // Fast redraw for style changes only (no recomputation)
  function redrawOnly() {
    if (!cachedDominoes || !cachedLatticePoints || !cachedBounds) {
      renderParticles();
      return;
    }

    const bounds = cachedBounds;

    const showParticles = document.getElementById("show-particles-cb").checked;
    const borderWidth = parseFloat(document.getElementById("border-slider").value);
    const rotateCanvas = document.getElementById("rotate-canvas-cb").checked;
    const rotation = rotateCanvas ? -45 : 0;

    const useCanvas = document.getElementById("renderer-canvas").checked;

    // Toggle visibility of canvas vs SVG
    canvas.style.display = useCanvas ? "block" : "none";
    svg.style("display", useCanvas ? "none" : "block");
    if (!useCanvas) svg.style("pointer-events", "auto");

    switch (currentViewMode) {
      case 'dominoes':
        if (useCanvas) {
          renderCanvas(cachedDominoes, cachedLatticePoints, bounds, showParticles, borderWidth, rotation);
        } else {
          renderSVG(cachedDominoes, cachedLatticePoints, bounds, showParticles, borderWidth, rotation);
        }
        break;

      case 'dimer':
        if (useCanvas) {
          renderDimerCanvas(cachedDominoes, bounds, rotation);
        } else {
          renderDimerSVG(cachedDominoes, bounds, rotation);
        }
        break;

      case 'double-dimer':
        if (!cachedDominoes2) {
          // Fallback to dimer view if no second sample
          if (useCanvas) {
            renderDimerCanvas(cachedDominoes, bounds, rotation);
          } else {
            renderDimerSVG(cachedDominoes, bounds, rotation);
          }
          break;
        }
        const minLoopSize = parseInt(document.getElementById("min-loop-size").value) || 2;
        const fullEdgeMap = buildEdgeMap(cachedDominoes, cachedDominoes2);
        const filteredEdgeMap = filterEdgesByLoopSize(fullEdgeMap, minLoopSize);
        if (useCanvas) {
          renderDoubleDimerCanvas(filteredEdgeMap, bounds, rotation);
        } else {
          renderDoubleDimerSVG(filteredEdgeMap, bounds, rotation);
        }
        break;

      case 'fluctuations':
        if (!rawFluctuations || !cachedActiveCells) {
          // Fallback to dominoes view if fluctuations not computed
          if (useCanvas) {
            renderCanvas(cachedDominoes, cachedLatticePoints, bounds, showParticles, borderWidth, rotation);
          } else {
            renderSVG(cachedDominoes, cachedLatticePoints, bounds, showParticles, borderWidth, rotation);
          }
          break;
        }
        if (useCanvas) {
          renderFluctuationsCanvas(cachedActiveCells, rawFluctuations, bounds, rotation);
        } else {
          renderFluctuationsSVG(cachedActiveCells, rawFluctuations, bounds, rotation);
        }
        break;
    }
  }

  // Display subsets and interlacing info
  function displaySubsets() {
    const subsetsOutput = document.getElementById("subsets-output");
    if (!subsetsOutput) return;

    // Skip detailed output for large n
    if (currentN > 50) {
      subsetsOutput.textContent = `Partition details hidden for n > 50 (current n = ${currentN})`;
      return;
    }

    const lines = [];

    lines.push("λ in h×k box → boundary walk → subset of {1,...,h+k}");
    lines.push("");

    for (let idx = 0; idx < currentPartitions.length; idx++) {
      const partition = currentPartitions[idx];
      const label = getPartitionLabel(idx);
      const partStr = partitionToString(partition);

      // Use SAME formulas as renderParticles (lines 785-788)
      const diagSize = currentN + ((idx + currentN) % 2);  // alternating n, n+1
      const numParticles = getParticleCount(idx);
      const numHoles = diagSize - numParticles;

      // Compute subset using the bijection (same as rendering)
      const subset = partitionToSubset(partition, numParticles, diagSize);
      const subsetStr = subset.length === 0 ? "∅" : "{" + subset.join(",") + "}";

      lines.push(`  ${label} = ${partStr}  in ${numHoles}×${numParticles} box  →  S = ${subsetStr}`);
    }

    // Interlacing checks
    lines.push("");
    lines.push("Interlacing checks:");
    let allValid = true;

    for (let idx = 1; idx < currentPartitions.length; idx++) {
      if (idx % 2 === 1) {
        // Odd index: μ^k where k = (idx+1)/2
        const k = (idx + 1) / 2;
        const mu_k = currentPartitions[idx];
        const lambda_km1 = currentPartitions[idx - 1];
        const hsCheck = isHorizontalStrip(mu_k, lambda_km1);
        const hsStatus = hsCheck ? "✓" : "✗";
        if (!hsCheck) allValid = false;
        lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k-1)} horizontal strip: ${hsStatus}`);

        // Check μ^k / λ^k is vertical strip (if λ^k exists)
        if (idx + 1 < currentPartitions.length) {
          const lambda_k = currentPartitions[idx + 1];
          const vsCheck = isVerticalStrip(mu_k, lambda_k);
          const vsStatus = vsCheck ? "✓" : "✗";
          if (!vsCheck) allValid = false;
          lines.push(`  μ${toSuperscript(k)}/λ${toSuperscript(k)} vertical strip: ${vsStatus}`);
        }
      }
    }

    if (allValid) {
      lines.push("All interlacing conditions satisfied ✓");
    } else {
      lines.push("WARNING: Some interlacing conditions failed ✗");
    }

    subsetsOutput.textContent = lines.join("\n");
  }

  // Sample button handler
  document.getElementById("sample-btn").addEventListener("click", async function() {
    const nInput = document.getElementById("n-input");
    const newN = parseInt(nInput.value, 10);
    if (isNaN(newN) || newN < 1) {
      alert("Please enter a valid positive integer for n");
      return;
    }
    currentN = newN;
    updateParamsForN(currentN);

    // Auto-disable particles and borders for large n (too many to be useful/visible)
    if (currentN > 100) {
      document.getElementById("show-particles-cb").checked = false;
      document.getElementById("border-slider").value = "0";
    }

    // Clear second sample caches
    secondPartitions = null;
    cachedDominoes2 = null;
    cachedLatticePoints2 = null;
    cachedActiveCells = null;
    cachedActiveCells2 = null;
    rawFluctuations = null;

    const x = parseCSV(document.getElementById("x-params").value);
    const y = parseCSV(document.getElementById("y-params").value);
    const q = parseFloat(document.getElementById("q-input").value);
    currentPartitions = await aztecDiamondSample(currentN, x, y, q);
    try {
      await renderParticles();
      displaySubsets();
      await update3DView();  // Update 3D view if active
    } catch (renderErr) {
      console.error("Rendering error after sampling:", renderErr);
      progressElem.innerText = "Rendering failed: " + renderErr.message;
      return;
    }

    // Build active cells for first sample
    cachedActiveCells = buildActiveCells(cachedLatticePoints);

    // If in double-dimer or fluctuations mode, also sample a second tiling
    if (currentViewMode === 'double-dimer' || currentViewMode === 'fluctuations') {
      progressElem.innerText = "Sampling 2nd...";
      secondPartitions = await aztecDiamondSample(currentN, x, y, q);
      progressElem.innerText = "";
      computeSecondSampleData();

      // Build active cells for second sample
      cachedActiveCells2 = buildActiveCells(cachedLatticePoints2);

      if (currentViewMode === 'fluctuations') {
        // Compute height functions and fluctuation differences
        const h1 = computeHeightFunction(cachedDominoes, cachedActiveCells);
        const h2 = computeHeightFunction(cachedDominoes2, cachedActiveCells2);
        rawFluctuations = computeFluctuationDiffs(h1, h2);
      }

      redrawOnly();
    }
  });

  // Uniform button handler - set all parameters to 1
  document.getElementById("uniform-btn").addEventListener("click", function() {
    const ones = Array(currentN).fill(1);
    document.getElementById("x-params").value = arrayToCSV(ones);
    document.getElementById("y-params").value = arrayToCSV(ones);
  });

  // Show particles checkbox handler - fast redraw
  document.getElementById("show-particles-cb").addEventListener("change", function() {
    redrawOnly();
  });

  // High precision checkbox handler - toggle between Boost (50 digits) and fast (log1p/expm1) modes
  document.getElementById("high-precision-cb").addEventListener("change", function() {
    setHighPrecision(this.checked ? 1 : 0);
  });

  // q-input change handler - resample when q changes
  document.getElementById("q-input").addEventListener("change", async function() {
    // Clear second sample caches
    secondPartitions = null;
    cachedDominoes2 = null;
    cachedLatticePoints2 = null;
    cachedActiveCells = null;
    cachedActiveCells2 = null;
    rawFluctuations = null;

    const x = parseCSV(document.getElementById("x-params").value);
    const y = parseCSV(document.getElementById("y-params").value);
    const q = parseFloat(document.getElementById("q-input").value);
    currentPartitions = await aztecDiamondSample(currentN, x, y, q);
    await renderParticles();
    displaySubsets();

    // Build active cells for first sample
    cachedActiveCells = buildActiveCells(cachedLatticePoints);

    // If in double-dimer or fluctuations mode, also sample a second tiling
    if (currentViewMode === 'double-dimer' || currentViewMode === 'fluctuations') {
      progressElem.innerText = "Sampling 2nd...";
      secondPartitions = await aztecDiamondSample(currentN, x, y, q);
      progressElem.innerText = "";
      computeSecondSampleData();

      // Build active cells for second sample
      cachedActiveCells2 = buildActiveCells(cachedLatticePoints2);

      if (currentViewMode === 'fluctuations') {
        // Compute height functions and fluctuation differences
        const h1 = computeHeightFunction(cachedDominoes, cachedActiveCells);
        const h2 = computeHeightFunction(cachedDominoes2, cachedActiveCells2);
        rawFluctuations = computeFluctuationDiffs(h1, h2);
      }

      redrawOnly();
    }
  });

  // Rotate canvas checkbox handler - fast redraw
  document.getElementById("rotate-canvas-cb").addEventListener("change", function() {
    redrawOnly();
  });

  // Border slider handler - fast redraw and update display value
  document.getElementById("border-slider").addEventListener("input", function() {
    document.getElementById("border-value").innerText = this.value;
    redrawOnly();
  });

  // Renderer toggle handlers - switch between canvas and SVG
  document.getElementById("renderer-canvas").addEventListener("change", function() {
    if (this.checked) {
      canvasTransform = { x: 0, y: 0, scale: 1 };
      redrawOnly();
    }
  });
  document.getElementById("renderer-svg").addEventListener("change", function() {
    if (this.checked) {
      redrawOnly();
    }
  });

  // ========== View Mode Event Handlers ==========

  // View mode change handler (for dominoes/dimer radio buttons only)
  document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
    radio.addEventListener('change', function() {
      currentViewMode = this.value;
      redrawOnly();
    });
  });

  // Sample Double Dimer button
  document.getElementById("sample-double-dimer-btn").addEventListener("click", async function() {
    progressElem.innerText = "Sampling pair...";

    // Sample two fresh tilings
    const x = parseCSV(document.getElementById("x-params").value);
    const y = parseCSV(document.getElementById("y-params").value);
    const q = parseFloat(document.getElementById("q-input").value);

    currentPartitions = await aztecDiamondSample(currentN, x, y, q);
    try {
      await renderParticles();  // This updates cachedDominoes and cachedLatticePoints
    } catch (renderErr) {
      console.error("Rendering error after sampling:", renderErr);
      progressElem.innerText = "Rendering failed: " + renderErr.message;
      return;
    }

    progressElem.innerText = "Sampling 2nd...";
    secondPartitions = await aztecDiamondSample(currentN, x, y, q);
    computeSecondSampleData();

    // Build active cells
    cachedActiveCells = buildActiveCells(cachedLatticePoints);
    cachedActiveCells2 = buildActiveCells(cachedLatticePoints2);

    progressElem.innerText = "";
    currentViewMode = 'double-dimer';
    document.getElementById("view-dominoes").checked = false;
    document.getElementById("view-dimer").checked = false;
    redrawOnly();
  });

  // Sample Fluctuations button
  document.getElementById("sample-fluctuations-btn").addEventListener("click", async function() {
    progressElem.innerText = "Sampling pair...";

    // Sample two fresh tilings
    const x = parseCSV(document.getElementById("x-params").value);
    const y = parseCSV(document.getElementById("y-params").value);
    const q = parseFloat(document.getElementById("q-input").value);

    currentPartitions = await aztecDiamondSample(currentN, x, y, q);
    try {
      await renderParticles();  // This updates cachedDominoes and cachedLatticePoints
    } catch (renderErr) {
      console.error("Rendering error after sampling:", renderErr);
      progressElem.innerText = "Rendering failed: " + renderErr.message;
      return;
    }

    progressElem.innerText = "Sampling 2nd...";
    secondPartitions = await aztecDiamondSample(currentN, x, y, q);
    computeSecondSampleData();

    // Build active cells
    cachedActiveCells = buildActiveCells(cachedLatticePoints);
    cachedActiveCells2 = buildActiveCells(cachedLatticePoints2);

    // Compute height functions and fluctuation differences
    const h1 = computeHeightFunction(cachedDominoes, cachedActiveCells);
    const h2 = computeHeightFunction(cachedDominoes2, cachedActiveCells2);
    rawFluctuations = computeFluctuationDiffs(h1, h2);

    progressElem.innerText = "";
    currentViewMode = 'fluctuations';
    document.getElementById("view-dominoes").checked = false;
    document.getElementById("view-dimer").checked = false;
    redrawOnly();
  });

  // Min loop size change handler
  document.getElementById("min-loop-size").addEventListener("input", function() {
    if (currentViewMode === 'double-dimer') {
      redrawOnly();
    }
  });

  // Canvas zoom/pan event handlers
  canvas.addEventListener("wheel", function(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = canvasTransform.scale * zoomFactor;

    // Zoom centered on mouse position
    canvasTransform.x = mouseX - (mouseX - canvasTransform.x) * zoomFactor;
    canvasTransform.y = mouseY - (mouseY - canvasTransform.y) * zoomFactor;
    canvasTransform.scale = newScale;

    redrawOnly();
  }, { passive: false });

  canvas.addEventListener("mousedown", function(e) {
    isDragging = true;
    dragStart = { x: e.clientX - canvasTransform.x, y: e.clientY - canvasTransform.y };
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("mousemove", function(e) {
    if (!isDragging) return;
    canvasTransform.x = e.clientX - dragStart.x;
    canvasTransform.y = e.clientY - dragStart.y;
    redrawOnly();
  });

  canvas.addEventListener("mouseup", function() {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("mouseleave", function() {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("dblclick", function() {
    canvasTransform = { x: 0, y: 0, scale: 1 };
    redrawOnly();
  });

  canvas.style.cursor = "grab";

  // Partition details toggle - switch to particle view and show diagonals
  document.getElementById("partitions-details").addEventListener("toggle", function(e) {
    const particlesCb = document.getElementById("show-particles-cb");
    if (this.open) {
      // Save current state and switch to particle view with diagonal highlights
      previousParticleState = particlesCb.checked;
      particlesCb.checked = true;
      showDiagonalHighlights = true;
    } else {
      // Restore previous state
      particlesCb.checked = previousParticleState;
      showDiagonalHighlights = false;
    }
    redrawOnly();
  });

  // r-weighting button handler - set x_i = y_i = r^i
  document.getElementById("r-btn").addEventListener("click", function() {
    const r = parseFloat(document.getElementById("r-input").value);
    if (isNaN(r) || r <= 0) {
      alert("Please enter a valid positive number for r");
      return;
    }
    const xArr = [];
    const yArr = [];
    for (let i = 0; i < currentN; i++) {
      const val = Math.pow(r, i + 1);  // r^1, r^2, ..., r^n
      xArr.push(val);
      yArr.push(val);
    }
    document.getElementById("x-params").value = arrayToCSV(xArr);
    document.getElementById("y-params").value = arrayToCSV(yArr);
  });

  // ========== Color Scheme Controls ==========

  const paletteSelect = document.getElementById("palette-select");
  const customColorsBtn = document.getElementById("custom-colors-btn");
  const customColorPickers = document.getElementById("custom-color-pickers");
  const colorInputs = [
    document.getElementById("custom-color-1"),
    document.getElementById("custom-color-2"),
    document.getElementById("custom-color-3"),
    document.getElementById("custom-color-4")
  ];

  // Populate palette dropdown
  colorPalettes.forEach((p, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = p.name;
    paletteSelect.appendChild(opt);
  });
  paletteSelect.value = currentPaletteIndex;

  function updateColorPickersFromPalette() {
    const colors = colorPalettes[currentPaletteIndex].colors;
    colorInputs[0].value = colors[0];
    colorInputs[1].value = colors[1];
    colorInputs[2].value = colors[2];
    colorInputs[3].value = colors[3];
    customColors = [...colors];
  }

  paletteSelect.addEventListener("change", function() {
    currentPaletteIndex = parseInt(this.value);
    useCustomColors = false;
    customColorPickers.style.display = "none";
    redrawOnly();
  });

  document.getElementById("prev-palette").addEventListener("click", function() {
    currentPaletteIndex = (currentPaletteIndex - 1 + colorPalettes.length) % colorPalettes.length;
    paletteSelect.value = currentPaletteIndex;
    useCustomColors = false;
    customColorPickers.style.display = "none";
    redrawOnly();
  });

  document.getElementById("next-palette").addEventListener("click", function() {
    currentPaletteIndex = (currentPaletteIndex + 1) % colorPalettes.length;
    paletteSelect.value = currentPaletteIndex;
    useCustomColors = false;
    customColorPickers.style.display = "none";
    redrawOnly();
  });

  customColorsBtn.addEventListener("click", function() {
    const isVisible = customColorPickers.style.display === "flex";
    if (isVisible) {
      customColorPickers.style.display = "none";
      useCustomColors = false;
    } else {
      updateColorPickersFromPalette();
      customColorPickers.style.display = "flex";
      useCustomColors = true;
    }
    redrawOnly();
  });

  colorInputs.forEach((input, i) => {
    // Use both input and change for cross-browser compatibility
    const handler = function() {
      customColors[i] = this.value;
      redrawOnly();
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });

  // ========== Export Functions ==========

  // Quality slider handler
  document.getElementById('export-quality').addEventListener('input', (e) => {
    document.getElementById('export-quality-val').textContent = e.target.value;
  });

  // Get export scale from quality slider (1x to 4x)
  function getExportScale() {
    return 1 + (parseInt(document.getElementById('export-quality').value) / 100) * 3;
  }

  // Generate export filename
  function generateExportFilename(extension) {
    const qVal = parseFloat(document.getElementById("q-input").value);
    return `aztec-diamond-n${currentN}-q${qVal}.${extension}`;
  }

  // Create high-resolution export canvas
  function createExportCanvas() {
    if (!cachedDominoes || !cachedLatticePoints) {
      alert("No tiling to export. Please sample first.");
      return null;
    }

    const showParticles = document.getElementById("show-particles-cb").checked;
    const borderWidth = parseFloat(document.getElementById("border-slider").value);
    const rotateCanvas = document.getElementById("rotate-canvas-cb").checked;

    // Compute bounds from dominoes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const d of cachedDominoes) {
      const left = d.cx - d.width / 2;
      const right = d.cx + d.width / 2;
      const top = d.cy - d.height / 2;
      const bottom = d.cy + d.height / 2;
      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate dimensions with padding
    const padding = 30;
    let contentWidth = maxX - minX;
    let contentHeight = maxY - minY;

    // If rotated, calculate the bounding box of the rotated content
    let baseWidth, baseHeight;
    if (rotateCanvas) {
      const angle = Math.PI / 4;
      const cos45 = Math.cos(angle);
      const sin45 = Math.sin(angle);
      baseWidth = contentWidth * cos45 + contentHeight * sin45 + 2 * padding;
      baseHeight = contentWidth * sin45 + contentHeight * cos45 + 2 * padding;
    } else {
      baseWidth = contentWidth + 2 * padding;
      baseHeight = contentHeight + 2 * padding;
    }

    // Create scaled canvas with max size limit
    let scale = getExportScale();
    const maxCanvasSize = 4096;  // Safe limit for iOS Safari
    const requestedWidth = baseWidth * scale;
    const requestedHeight = baseHeight * scale;

    // Scale down if exceeding max canvas size
    if (requestedWidth > maxCanvasSize || requestedHeight > maxCanvasSize) {
      const maxDim = Math.max(requestedWidth, requestedHeight);
      scale = scale * (maxCanvasSize / maxDim);
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.round(baseWidth * scale);
    exportCanvas.height = Math.round(baseHeight * scale);
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.scale(scale, scale);

    // Fill background
    exportCtx.fillStyle = "#fafafa";
    exportCtx.fillRect(0, 0, baseWidth, baseHeight);

    // Apply transform
    exportCtx.save();
    if (rotateCanvas) {
      exportCtx.translate(baseWidth / 2, baseHeight / 2);
      exportCtx.rotate(-45 * Math.PI / 180);
      exportCtx.translate(-centerX, -centerY);
    } else {
      exportCtx.translate(baseWidth / 2 - centerX, baseHeight / 2 - centerY);
    }

    // Draw dominoes
    for (const d of cachedDominoes) {
      exportCtx.fillStyle = getDominoColor(d.type, d.isHorizontal, showParticles);
      exportCtx.fillRect(d.cx - d.width / 2, d.cy - d.height / 2, d.width, d.height);
      if (borderWidth > 0) {
        exportCtx.strokeStyle = "#000";
        exportCtx.lineWidth = borderWidth;
        exportCtx.strokeRect(d.cx - d.width / 2, d.cy - d.height / 2, d.width, d.height);
      }
    }

    // Draw particles if enabled
    if (showParticles) {
      for (const p of cachedLatticePoints) {
        exportCtx.beginPath();
        exportCtx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        exportCtx.fillStyle = p.inSubset ? "#000000" : "#ffffff";
        exportCtx.fill();
        exportCtx.strokeStyle = "#000";
        exportCtx.lineWidth = 1;
        exportCtx.stroke();
      }
    }

    exportCtx.restore();
    return exportCanvas;
  }

  // Export as PNG file
  document.getElementById("export-png-btn").addEventListener("click", function(e) {
    e.preventDefault();
    const exportCanvas = createExportCanvas();
    if (!exportCanvas) return;

    exportCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generateExportFilename('png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  });

  // Full Res - open high-res image in new tab
  document.getElementById("fullres-btn").addEventListener("click", function(e) {
    e.preventDefault();
    const exportCanvas = createExportCanvas();
    if (!exportCanvas) return;
    exportCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }, 'image/png');
  });

  // Generate SVG for vector PDF export
  function generateExportSVG() {
    if (!cachedDominoes || !cachedLatticePoints) {
      return null;
    }

    const showParticles = document.getElementById("show-particles-cb").checked;
    const borderWidth = parseFloat(document.getElementById("border-slider").value);
    const rotateCanvas = document.getElementById("rotate-canvas-cb").checked;

    // Compute bounds from dominoes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const d of cachedDominoes) {
      const left = d.cx - d.width / 2;
      const right = d.cx + d.width / 2;
      const top = d.cy - d.height / 2;
      const bottom = d.cy + d.height / 2;
      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const padding = 30;
    let contentWidth = maxX - minX;
    let contentHeight = maxY - minY;

    let svgWidth, svgHeight;
    if (rotateCanvas) {
      const angle = Math.PI / 4;
      const cos45 = Math.cos(angle);
      const sin45 = Math.sin(angle);
      svgWidth = contentWidth * cos45 + contentHeight * sin45 + 2 * padding;
      svgHeight = contentWidth * sin45 + contentHeight * cos45 + 2 * padding;
    } else {
      svgWidth = contentWidth + 2 * padding;
      svgHeight = contentHeight + 2 * padding;
    }

    const svgNS = "http://www.w3.org/2000/svg";
    const exportSvg = document.createElementNS(svgNS, "svg");
    exportSvg.setAttribute("xmlns", svgNS);
    exportSvg.setAttribute("width", svgWidth);
    exportSvg.setAttribute("height", svgHeight);
    exportSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "#fafafa");
    exportSvg.appendChild(bg);

    const g = document.createElementNS(svgNS, "g");
    if (rotateCanvas) {
      g.setAttribute("transform",
        `translate(${svgWidth/2}, ${svgHeight/2}) rotate(-45) translate(${-centerX}, ${-centerY})`);
    } else {
      g.setAttribute("transform",
        `translate(${svgWidth/2 - centerX}, ${svgHeight/2 - centerY})`);
    }

    for (const d of cachedDominoes) {
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", d.cx - d.width / 2);
      rect.setAttribute("y", d.cy - d.height / 2);
      rect.setAttribute("width", d.width);
      rect.setAttribute("height", d.height);
      rect.setAttribute("fill", getDominoColor(d.type, d.isHorizontal, showParticles));
      if (borderWidth > 0) {
        rect.setAttribute("stroke", "#000");
        rect.setAttribute("stroke-width", borderWidth);
      }
      g.appendChild(rect);
    }

    if (showParticles) {
      for (const p of cachedLatticePoints) {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", p.x);
        circle.setAttribute("cy", p.y);
        circle.setAttribute("r", 5);
        circle.setAttribute("fill", p.inSubset ? "#000000" : "#ffffff");
        circle.setAttribute("stroke", "#000");
        circle.setAttribute("stroke-width", 1);
        g.appendChild(circle);
      }
    }

    exportSvg.appendChild(g);
    return exportSvg;
  }

  // Export as vector PDF file
  document.getElementById("export-pdf-btn").addEventListener("click", async function(e) {
    e.preventDefault();
    const exportSvg = generateExportSVG();
    if (!exportSvg) {
      alert("No tiling to export. Please sample first.");
      return;
    }

    let width = parseFloat(exportSvg.getAttribute("width"));
    let height = parseFloat(exportSvg.getAttribute("height"));

    // Scale down if too large for PDF (max 14400 pt)
    const maxPdfSize = 14000;
    const scale = Math.min(1, maxPdfSize / Math.max(width, height));
    const pdfWidth = width * scale;
    const pdfHeight = height * scale;

    const { jsPDF } = window.jspdf;
    const orientation = pdfWidth > pdfHeight ? "landscape" : "portrait";
    const pdf = new jsPDF({
      orientation: orientation,
      unit: "pt",
      format: [pdfWidth, pdfHeight]
    });

    try {
      // Temporarily add SVG to DOM (required by svg2pdf)
      exportSvg.style.position = "absolute";
      exportSvg.style.left = "-9999px";
      document.body.appendChild(exportSvg);

      // Use svg2pdf for vector conversion
      if (typeof pdf.svg === 'function') {
        await pdf.svg(exportSvg, { x: 0, y: 0, width: pdfWidth, height: pdfHeight });
      } else {
        throw new Error("Vector PDF not available - svg2pdf library not loaded");
      }

      document.body.removeChild(exportSvg);
      pdf.save(generateExportFilename('pdf'));
    } catch (e) {
      console.error("PDF export error:", e);
      alert("PDF export failed: " + e.message);
      if (exportSvg.parentNode) {
        document.body.removeChild(exportSvg);
      }
    }
  });

  // 3D View Toggle
  document.getElementById('toggle3DBtn').addEventListener('click', () => {
    setViewMode3D(!is3DView);
  });

  // Perspective toggle
  document.getElementById('perspectiveBtn').addEventListener('click', () => {
    if (renderer3D) {
      const isPerspective = renderer3D.togglePerspective();
      document.getElementById('perspectiveBtn').textContent = isPerspective ? '🎯' : '📐';
    }
  });

  // Preset cycle
  document.getElementById('preset3DBtn').addEventListener('click', () => {
    if (renderer3D) {
      const preset = renderer3D.cyclePreset();
      update3DView().catch(err => console.error('3D view error:', err));
    }
  });

  // Rotation buttons
  document.getElementById('rotateLeftBtn').addEventListener('click', () => {
    if (renderer3D) renderer3D.rotateHorizontal(-15);
  });
  document.getElementById('rotateRightBtn').addEventListener('click', () => {
    if (renderer3D) renderer3D.rotateHorizontal(15);
  });

  // Auto-rotate toggle
  document.getElementById('autoRotateBtn').addEventListener('click', () => {
    if (renderer3D) {
      renderer3D.autoRotate = !renderer3D.autoRotate;
      const btn = document.getElementById('autoRotateBtn');
      btn.style.backgroundColor = renderer3D.autoRotate ? '#ddd' : '';
    }
  });

  // ========== DETAILED MODE IMPLEMENTATION ==========

  let detailedModeActive = false;
  let detailedState = null;
  let autoPlayInterval = null;

  // Animation state for shuffle visualization
  let shuffleAnimationPhase = 4;  // 0=initial, 1=dimers, 2=blocks, 3=slide, 4=final
  let shuffleAnimationInterval = null;
  let shuffleAnimationProgress = 0;  // 0-1 for smooth transitions

  // Elements to hide/show when toggling detailed mode
  const elementsToHideInDetailedMode = [
    '#zoom-controls-container',
    '.row:has(#aztec-canvas)',
    '#aztec-canvas',
    '#aztec-svg',
    '#three-container',
    '#toggle3DBtn',
    '#loading-overlay'
  ];

  // Get i-th part of partition (0-indexed), return 0 if out of range
  function getPart(partition, i) {
    return (partition && i >= 0 && i < partition.length) ? partition[i] : 0;
  }

  // Compute 1 - q^n using log1p/expm1 for numerical stability
  function oneMinusQtoN(q, n) {
    if (n <= 0) return 0.0;
    if (q <= 0.0) return 1.0;
    if (q >= 1.0) return 0.0;
    return -Math.expm1(n * Math.log1p(q - 1.0));
  }

  // Compute f_k probability (equation 5.2 in arXiv:1504.00666)
  function computeF(lam_k, nu_bar_k, nu_bar_k_minus_1, q) {
    const delta_lam = lam_k - nu_bar_k + 1;
    if (delta_lam <= 0) return 0.0;
    const delta_nu = nu_bar_k_minus_1 - nu_bar_k + 1;
    if (delta_nu <= 0) return 1.0;
    const numerator = oneMinusQtoN(q, delta_lam);
    const denominator = oneMinusQtoN(q, delta_nu);
    if (denominator === 0.0) return 1.0;
    return numerator / denominator;
  }

  // Compute g_s probability
  function computeG(lam_s, mu_s, q) {
    const delta = lam_s - mu_s + 1;
    if (delta <= 0) return 0.0;
    return oneMinusQtoN(q, delta);
  }

  // Format partition as string
  function partitionToString(partition) {
    if (!partition || partition.length === 0) return '()';
    return '(' + partition.join(', ') + ')';
  }

  // Seeded random number generator (Mulberry32)
  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Current seeded RNG instance
  let detailedRNG = null;
  let currentSeed = null;

  // q-Whittaker VH bijection with detailed output
  function sampleVHqDetailed(lam, mu, kappa, bit, q) {
    const maxLen = Math.max(
      lam ? lam.length : 0,
      mu ? mu.length : 0,
      kappa ? kappa.length : 0
    ) + 2;

    const details = {
      islands: [],
      fValues: [],
      gValues: [],
      decisions: []
    };

    // Find moved indices: where mu_i - kappa_i = 1
    const moved = [];
    for (let i = 0; i < maxLen; i++) {
      if (getPart(mu, i) - getPart(kappa, i) === 1) {
        moved.push(i);
      }
    }

    // Group into islands (consecutive indices)
    const islands = [];
    if (moved.length > 0) {
      let islandStart = moved[0];
      let islandEnd = moved[0];
      for (let i = 1; i < moved.length; i++) {
        if (moved[i] === moved[i - 1] + 1) {
          islandEnd = moved[i];
        } else {
          islands.push({ start: islandStart, end: islandEnd });
          islandStart = moved[i];
          islandEnd = moved[i];
        }
      }
      islands.push({ start: islandStart, end: islandEnd });
    }
    details.islands = islands;

    // Initialize nu = lam
    const nu = [];
    for (let i = 0; i < maxLen; i++) {
      nu[i] = getPart(lam, i);
    }

    // Step 1: Rightmost particle jumps by bit
    nu[0] = getPart(lam, 0) + bit;

    // Step 2: Process each island
    for (const island of islands) {
      const k = island.start;
      const m = island.end;
      const nu_bar_k = getPart(mu, k);

      // Case 1: bit=1 and k=0 (island contains first particle)
      if (bit === 1 && k === 0) {
        for (let idx = 1; idx <= m + 1; idx++) {
          nu[idx] = getPart(lam, idx) + 1;
        }
        details.decisions.push({
          island: island,
          case: 'bit=1, k=0: all particles in island jump',
          stoppedAt: null
        });
        continue;
      }

      // Case 2: bit=0 or k>0
      let stoppedAt;
      if (q === 0.0) {
        // Schur case: deterministic - find first free particle
        stoppedAt = m + 1;
        for (let idx = k; idx <= m; idx++) {
          if (getPart(lam, idx) > getPart(mu, idx) - 1) {
            stoppedAt = idx;
            break;
          }
        }
        details.decisions.push({
          island: island,
          case: 'q=0 (Schur): deterministic',
          stoppedAt: stoppedAt,
          stoppedAtIsEnd: stoppedAt === m + 1
        });
      } else {
        // q-Whittaker case: probabilistic sampling
        const lam_k = getPart(lam, k);
        let f_k;
        if (k === 0) {
          // When k=0, nu_bar_{-1} = +infinity, so denominator is 1.0
          const delta_lam = lam_k - nu_bar_k + 1;
          f_k = (delta_lam <= 0) ? 0.0 : oneMinusQtoN(q, delta_lam);
        } else {
          f_k = computeF(lam_k, nu_bar_k, getPart(mu, k - 1), q);
        }
        const u_f = Math.random();

        const nu_bar_km1 = (k > 0) ? getPart(mu, k - 1) : Infinity;
        details.fValues.push({
          k: k,
          lam_k: lam_k,
          nu_bar_k: nu_bar_k,
          nu_bar_k_minus_1: nu_bar_km1,
          delta_lam: lam_k - nu_bar_k + 1,
          delta_nu: (k > 0) ? (nu_bar_km1 - nu_bar_k + 1) : Infinity,
          f_k: f_k,
          u: u_f,
          stopped: u_f < f_k
        });

        if (u_f < f_k) {
          stoppedAt = k;
          details.decisions.push({
            island: island,
            case: 'stopped by f_k',
            f_k: f_k,
            u: u_f,
            stoppedAt: stoppedAt
          });
        } else {
          stoppedAt = m + 1;
          const gVals = [];
          for (let s = k + 1; s <= m; s++) {
            const lam_s = getPart(lam, s);
            const mu_s = getPart(mu, s);
            const g_s = computeG(lam_s, mu_s, q);
            const u_g = Math.random();
            gVals.push({ s: s, lam_s: lam_s, mu_s: mu_s, g_s: g_s, u: u_g, stopped: u_g < g_s });
            if (u_g < g_s) {
              stoppedAt = s;
              details.decisions.push({
                island: island,
                case: 'stopped by g_s',
                s: s,
                g_s: g_s,
                u: u_g,
                stoppedAt: stoppedAt
              });
              break;
            }
          }
          details.gValues.push({ island: island, values: gVals });
          if (stoppedAt === m + 1) {
            details.decisions.push({
              island: island,
              case: 'all passed: full jump',
              stoppedAt: m + 1,
              stoppedAtIsEnd: true
            });
          }
        }
      }

      // Apply the moves: all indices from k to m+1 jump except stoppedAt
      for (let idx = k; idx <= m + 1; idx++) {
        if (idx !== stoppedAt) {
          nu[idx] = getPart(lam, idx) + 1;
        }
      }
    }

    // Ensure nu >= mu (horizontal strip condition)
    for (let i = 0; i < maxLen; i++) {
      nu[i] = Math.max(nu[i], getPart(mu, i));
    }

    // Trim trailing zeros
    let trimLen = maxLen;
    while (trimLen > 0 && nu[trimLen - 1] === 0) {
      trimLen--;
    }

    return {
      nu: nu.slice(0, trimLen),
      details: details
    };
  }

  // Detailed sampler state class
  class DetailedSamplerState {
    constructor(n, x, y, q, seed) {
      this.n = n;
      this.x = x.slice();
      this.y = y.slice();
      this.q = q;
      this.seed = seed;

      // Ensure x and y have length n
      while (this.x.length < n) this.x.push(1.0);
      while (this.y.length < n) this.y.push(1.0);

      // Initialize seeded RNG
      this.rng = mulberry32(seed);

      // Growth diagram: tau[i][j] stores partition at position (i,j)
      this.tau = this.initializeTau();

      // Precompute all Bernoulli trials using seeded RNG
      this.bernoulliData = this.precomputeBernoulli();

      // Build anti-diagonal traversal order: cells ordered by i+j
      // Anti-diagonal t = i+j ranges from 2 to n+1
      // After completing anti-diagonal t, we have Aztec diamond of size (t-1)
      this.cellOrder = this.buildAntiDiagonalOrder();
      this.cellIndex = 0;
      this.totalCells = n * (n + 1) / 2;

      // Current anti-diagonal being processed (2 to n+1)
      this.currentAntiDiag = 2;
      // Index within current anti-diagonal
      this.indexInAntiDiag = 0;
      // Size of current anti-diagonal
      this.antiDiagSize = 1;
      // Number of completed anti-diagonals (= current Aztec diamond size)
      this.completedAntiDiags = 0;

      // History for prev/next navigation
      this.history = [];
      this.history.push(this.saveState());

      // Last VH bijection details (for display)
      this.lastVHDetails = null;
      this.completed = false;
    }

    initializeTau() {
      const tau = [];
      for (let i = 0; i <= this.n; i++) {
        tau[i] = [];
        for (let j = 0; j <= this.n + 1; j++) {
          tau[i][j] = [];  // Empty partition
        }
      }
      return tau;
    }

    // Build anti-diagonal order: cells (i,j) sorted by i+j, then by i
    buildAntiDiagonalOrder() {
      const order = [];
      // Anti-diagonals t = 2, 3, ..., n+1
      for (let t = 2; t <= this.n + 1; t++) {
        // For anti-diagonal t, cells are (i, t-i) where:
        // 1 <= i <= n, 1 <= j = t-i <= n+1-i
        for (let i = 1; i < t && i <= this.n; i++) {
          const j = t - i;
          if (j >= 1 && j <= this.n + 1 - i) {
            order.push({ i, j, antiDiag: t });
          }
        }
      }
      return order;
    }

    // Precompute all Bernoulli trials for the growth diagram using seeded RNG
    precomputeBernoulli() {
      const data = [];
      for (let i = 0; i <= this.n; i++) {
        data[i] = [];
        for (let j = 0; j <= this.n + 1; j++) {
          data[i][j] = null;
        }
      }

      // Fill in anti-diagonal order for consistent RNG usage
      const order = this.buildAntiDiagonalOrder();
      for (let cellIdx = 0; cellIdx < order.length; cellIdx++) {
        const { i, j, antiDiag } = order[cellIdx];
        const x_i = this.x[i - 1];
        const y_j = this.y[j - 1];
        const xi = x_i * y_j;
        const p = xi / (1.0 + xi);
        const u = this.rng();  // Use seeded RNG
        const bit = (u < p) ? 1 : 0;

        data[i][j] = {
          i: i,
          j: j,
          antiDiag: antiDiag,
          cellIndex: cellIdx,
          x_i: x_i,
          y_j: y_j,
          xi: xi,
          p: p,
          u: u,
          bit: bit
        };
      }

      return data;
    }

    // Get Bernoulli data for cell (i, j)
    getBernoulli(i, j) {
      return this.bernoulliData[i] ? this.bernoulliData[i][j] : null;
    }

    // Get current cell in traversal order
    getCurrentCell() {
      if (this.cellIndex < this.cellOrder.length) {
        return this.cellOrder[this.cellIndex];
      }
      return null;
    }

    saveState() {
      return {
        cellIndex: this.cellIndex,
        currentAntiDiag: this.currentAntiDiag,
        indexInAntiDiag: this.indexInAntiDiag,
        antiDiagSize: this.antiDiagSize,
        completedAntiDiags: this.completedAntiDiags,
        tau: JSON.parse(JSON.stringify(this.tau)),
        lastVHDetails: this.lastVHDetails ? JSON.parse(JSON.stringify(this.lastVHDetails)) : null,
        completed: this.completed
      };
    }

    restoreState(state) {
      this.cellIndex = state.cellIndex;
      this.currentAntiDiag = state.currentAntiDiag;
      this.indexInAntiDiag = state.indexInAntiDiag;
      this.antiDiagSize = state.antiDiagSize;
      this.completedAntiDiags = state.completedAntiDiags;
      this.tau = state.tau;
      this.lastVHDetails = state.lastVHDetails;
      this.completed = state.completed;
    }
  }

  // Step the detailed sampler one cell forward (anti-diagonal order)
  function stepDetailedSampler() {
    if (!detailedState || detailedState.completed) {
      return false;
    }

    const state = detailedState;
    const cell = state.getCurrentCell();
    if (!cell) {
      state.completed = true;
      return false;
    }

    const i = cell.i;
    const j = cell.j;

    // Get adjacent partitions for VH bijection
    const kappa = state.tau[i - 1][j - 1];  // diagonal (upper-left)
    const lam = state.tau[i - 1][j];        // from above
    const mu = state.tau[i][j - 1];         // from left

    // Use precomputed Bernoulli values
    const bern = state.getBernoulli(i, j);
    const x_i = bern.x_i;
    const y_j = bern.y_j;
    const xi = bern.xi;
    const p = bern.p;
    const u = bern.u;
    const bit = bern.bit;

    // Sample new partition using VH bijection
    const result = sampleVHqDetailed(lam, mu, kappa, bit, state.q);
    state.tau[i][j] = result.nu;

    // Store details for display
    state.lastVHDetails = {
      i: i,
      j: j,
      antiDiag: cell.antiDiag,
      x_i: x_i,
      y_j: y_j,
      xi: xi,
      p: p,
      u: u,
      bit: bit,
      kappa: kappa,
      lam: lam,
      mu: mu,
      nu: result.nu,
      vhDetails: result.details
    };

    // Advance to next cell
    state.cellIndex++;
    state.indexInAntiDiag++;

    // Check if we completed an anti-diagonal
    if (state.indexInAntiDiag >= state.currentAntiDiag - 1) {
      // Completed anti-diagonal (currentAntiDiag - 1) cells
      state.completedAntiDiags++;
      state.currentAntiDiag++;
      state.indexInAntiDiag = 0;
    }

    // Check if completed all cells
    if (state.cellIndex >= state.totalCells) {
      state.completed = true;
    }

    // Save to history
    state.history.push(state.saveState());

    return true;
  }

  // Go to previous step
  function stepDetailedSamplerPrev() {
    if (!detailedState || detailedState.history.length <= 1) {
      return false;
    }

    // Pop current state
    detailedState.history.pop();
    // Restore previous state
    const prevState = detailedState.history[detailedState.history.length - 1];
    detailedState.restoreState(prevState);
    return true;
  }

  // Extract output partitions from current state
  // Following arXiv:1407.3764: boundary path from (0,n) to (n,0) along staircase
  function extractOutputPartitions(state) {
    if (!state) return [];
    return extractOutputPartitionsForSize(state, state.n);
  }

  // Draw cell lattice panel (growth diagram with precomputed Bernoulli bits)
  function drawCellLatticePanel() {
    const canvas = document.getElementById('cell-lattice-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    if (!detailedState) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.fillText('Click "Next" to start stepping', 20, h / 2);
      return;
    }

    const n = detailedState.n;
    const state = detailedState;

    // Calculate cell size to fit the staircase
    // The staircase has n rows, row i has (n+1-i) cells
    // Total width needs to fit n cells, height needs to fit n rows
    const margin = 30;
    const cellSize = Math.min((w - 2 * margin) / n, (h - 2 * margin) / n);
    const startX = margin;
    const startY = margin;

    // Draw axis labels
    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.fillText('j →', startX + (n * cellSize) / 2 - 10, startY - 10);
    ctx.save();
    ctx.translate(startX - 15, startY + (n * cellSize) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('i →', -10, 0);
    ctx.restore();

    // Get current cell info
    const currentCell = state.getCurrentCell();

    // Draw cells in staircase pattern
    for (let i = 1; i <= n; i++) {
      const rowLen = n + 1 - i;
      for (let j = 1; j <= rowLen; j++) {
        const bern = state.getBernoulli(i, j);
        if (!bern) continue;

        const x = startX + (j - 1) * cellSize;
        const y = startY + (i - 1) * cellSize;

        // Determine cell state based on anti-diagonal order
        const isProcessed = bern.cellIndex < state.cellIndex;
        const isCurrentCell = currentCell && (i === currentCell.i && j === currentCell.j);
        const isInCurrentAntiDiag = bern.antiDiag === state.currentAntiDiag;
        const isInCompletedAntiDiag = bern.antiDiag < state.currentAntiDiag;

        // Draw cell background
        if (isCurrentCell) {
          ctx.fillStyle = '#ffeb3b';  // Yellow for current cell
        } else if (isInCurrentAntiDiag && !isProcessed) {
          ctx.fillStyle = '#fff3e0';  // Light orange for cells in current anti-diagonal
        } else if (isProcessed) {
          ctx.fillStyle = bern.bit === 1 ? '#c8e6c9' : '#ffcdd2';  // Green/red tint for processed
        } else {
          ctx.fillStyle = '#f5f5f5';  // Light gray for unprocessed
        }
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw cell border - thicker for anti-diagonal boundaries
        ctx.strokeStyle = isProcessed ? '#666' : '#ccc';
        ctx.lineWidth = isCurrentCell ? 2.5 : 1;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Draw bit value
        const fontSize = Math.max(10, Math.min(16, cellSize * 0.5));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Always show the precomputed bit value
        if (isProcessed || isCurrentCell) {
          // Processed/current: bold colored
          ctx.fillStyle = bern.bit === 1 ? '#2e7d32' : '#c62828';
        } else {
          // Unprocessed: lighter color
          ctx.fillStyle = bern.bit === 1 ? '#81c784' : '#e57373';
        }
        ctx.fillText(bern.bit.toString(), x + cellSize / 2, y + cellSize / 2);
      }
    }

    // Draw anti-diagonal lines to show grouping
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    for (let t = 2; t <= n + 1; t++) {
      // Draw line separating anti-diagonal t from t+1
      const startI = Math.min(t - 1, n);
      const endJ = Math.min(t - 1, n);
      if (t <= state.currentAntiDiag) {
        ctx.beginPath();
        ctx.moveTo(startX + (t - startI - 1) * cellSize, startY + startI * cellSize);
        ctx.lineTo(startX + endJ * cellSize, startY);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // Draw row/column indices
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Column indices (j)
    for (let j = 1; j <= n; j++) {
      ctx.fillText(j.toString(), startX + (j - 0.5) * cellSize, startY - 5);
    }

    // Row indices (i)
    ctx.textAlign = 'right';
    for (let i = 1; i <= n; i++) {
      ctx.fillText(i.toString(), startX - 5, startY + (i - 0.5) * cellSize);
    }

    // Update info
    const infoDiv = document.getElementById('cell-lattice-info');
    if (infoDiv) {
      const processed = state.cellIndex;
      const total = state.totalCells;
      const totalOnes = countBits(state, 1, total);
      const totalZeros = total - totalOnes;
      const nextCell = state.getCurrentCell();
      const aztecSize = state.completedAntiDiags;
      infoDiv.innerHTML = `<b>Seed: ${state.seed}</b> | Cells: ${processed}/${total} | <span style="color: #2e7d32;">1s: ${totalOnes}</span> | <span style="color: #c62828;">0s: ${totalZeros}</span> | ` +
        `<b>Aztec size: ${aztecSize}</b>` +
        (nextCell ? ` | <span style="background: #ffeb3b; padding: 0 4px;">Next: (${nextCell.i},${nextCell.j}) in diag ${nextCell.antiDiag}</span>` : ' | <span style="color: #2e7d32;">Complete!</span>');
    }
  }

  // Helper: count bits in processed cells
  function countBits(state, bitValue, upToIndex) {
    let count = 0;
    for (let i = 1; i <= state.n; i++) {
      const rowLen = state.n + 1 - i;
      for (let j = 1; j <= rowLen; j++) {
        const bern = state.getBernoulli(i, j);
        if (bern && bern.cellIndex < upToIndex && bern.bit === bitValue) {
          count++;
        }
      }
    }
    return count;
  }

  // Extract output partitions for a smaller Aztec diamond of given size
  // Following the paper arXiv:1407.3764: the boundary path goes from (0, k) to (k, 0)
  // along the staircase boundary, visiting 2k+1 positions
  // IMPORTANT: Path is traced (0,k)→(k,0) then REVERSED to match C++ output order
  function extractOutputPartitionsForSize(state, size) {
    if (size <= 0) return [[]];

    const partitions = [];
    let i = 0, j = size;

    // Path from (0, size) to (size, 0) along staircase boundary
    // This traces the output of the Schur process for Aztec diamond of this size
    while (true) {
      partitions.push(state.tau[i][j] || []);
      if (i === size && j === 0) break;

      // Follow the staircase boundary:
      // Move right (i++) if we can, otherwise move down (j--)
      // The staircase for Aztec diamond has cells (i,j) with i >= 1, j >= 1, i+j <= size+1
      // We're on the boundary, so we check if (i+1, j) is in the staircase
      if (j <= size - i && i < size) {
        i++;
      } else {
        j--;
      }
    }

    // CRITICAL: Reverse to match the C++ code's output order
    // The C++ extracts path (0,n)→(n,0) then reverses it
    return partitions.reverse();
  }

  // Draw domino shuffling panel (Figure 10 style from arXiv:1407.3764)
  function drawShufflingPanel() {
    const canvas = document.getElementById('shuffling-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    if (!detailedState || !detailedState.lastVHDetails) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.fillText('Click "Next" to see domino shuffling visualization', 20, h / 2);
      return;
    }

    const d = detailedState.lastVHDetails;
    const vh = d.vhDetails;

    // Get partitions
    const kappa = d.kappa || [];
    const lambda = d.lam || [];
    const mu = d.mu || [];
    const nu = d.nu || [];

    // Find range for display
    let minPos = -5, maxPos = 5;
    [kappa, lambda, mu, nu].forEach(parts => {
      for (let i = 0; i < (parts.length || 0) + 3; i++) {
        const pos = (parts[i] || 0) - i;
        minPos = Math.min(minPos, pos - 1);
        maxPos = Math.max(maxPos, pos + 1);
      }
    });

    const cellWidth = Math.min(25, (w - 100) / (maxPos - minPos + 1));
    const rowHeight = 35;
    const startX = 80;
    const startY = 50;

    // Animation phase (0=initial, 1=dimers, 2=blocks, 3=slide, 4=final)
    const phase = shuffleAnimationPhase;
    const phaseNames = ['Initial Partitions', 'Dimer Formation', 'Block Identification', 'Dimer Sliding', 'Final Result'];

    // Draw phase indicator
    ctx.fillStyle = '#1976d2';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Phase ${phase}: ${phaseNames[phase]}`, 10, 15);

    // Draw progress bar
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(150, 8, 100, 10);
    ctx.fillStyle = '#1976d2';
    ctx.fillRect(150, 8, (phase / 4) * 100, 10);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.strokeRect(150, 8, 100, 10);

    // Helper to get Maya positions
    function getMayaParticles(parts, count) {
      const particles = new Set();
      for (let i = 0; i < count; i++) {
        particles.add((parts[i] || 0) - i);
      }
      return particles;
    }

    // Draw title sections
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BEFORE (κ ≺\' λ, κ ≺ μ):', 10, startY - 15);
    if (phase >= 3) {
      ctx.fillText('AFTER (λ ≺ ν, μ ≺\' ν):', 10, startY + 4 * rowHeight + 25);
    }

    // === BEFORE section (3 rows: λ, κ, μ) ===
    const beforeY = startY;
    const beforeLabels = ['λ', 'κ', 'μ'];
    const beforeParts = [lambda, kappa, mu];
    const beforeColors = ['#ddffdd', '#ffdddd', '#ddddff'];

    // Compute Maya diagrams
    const lambdaMaya = getMayaParticles(lambda, 10);
    const kappaMaya = getMayaParticles(kappa, 10);
    const muMaya = getMayaParticles(mu, 10);

    // Draw before rows
    beforeParts.forEach((parts, rowIdx) => {
      const y = beforeY + rowIdx * rowHeight;
      const maya = [lambdaMaya, kappaMaya, muMaya][rowIdx];

      // Label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px serif';
      ctx.textAlign = 'right';
      ctx.fillText(beforeLabels[rowIdx] + ':', startX - 10, y + 8);

      // Background
      ctx.fillStyle = beforeColors[rowIdx];
      ctx.fillRect(startX, y - 8, (maxPos - minPos + 1) * cellWidth, 22);

      // Draw particles/holes
      for (let pos = minPos; pos <= maxPos; pos++) {
        const x = startX + (pos - minPos + 0.5) * cellWidth;
        const isParticle = maya.has(pos);

        ctx.beginPath();
        ctx.arc(x, y + 3, 5, 0, 2 * Math.PI);
        if (isParticle) {
          ctx.fillStyle = '#333';
          ctx.fill();
        } else {
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    });

    // Draw dimers between rows (λ-κ for particles, κ-μ for holes) - Phase 1+
    if (phase >= 1) {
      ctx.lineWidth = 2;
      for (let pos = minPos; pos <= maxPos; pos++) {
        const x = startX + (pos - minPos + 0.5) * cellWidth;
        const y1 = beforeY + 3;      // λ row
        const y2 = beforeY + rowHeight + 3;  // κ row
        const y3 = beforeY + 2 * rowHeight + 3;  // μ row

        // λ-κ particle matching (blue dimers)
        if (lambdaMaya.has(pos) && kappaMaya.has(pos)) {
          ctx.strokeStyle = '#2196f3';
          ctx.beginPath();
          ctx.moveTo(x, y1 + 5);
          ctx.lineTo(x, y2 - 5);
          ctx.stroke();
        }

        // κ-μ hole matching (orange dimers)
        if (!kappaMaya.has(pos) && !muMaya.has(pos)) {
          ctx.strokeStyle = '#ff9800';
          ctx.beginPath();
          ctx.moveTo(x, y2 + 5);
          ctx.lineTo(x, y3 - 5);
          ctx.stroke();
        }
      }
    }

    // === Show islands, bit, and q-probabilities ===
    const islandY = beforeY + 3 * rowHeight + 5;
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    const islandStr = vh.islands.length > 0
      ? vh.islands.map(isl => `[${isl.start},${isl.end}]`).join(', ')
      : 'none';
    ctx.fillText(`Islands: ${islandStr}  |  Bit B = ${d.bit}  |  q = ${detailedState.q}`, startX, islandY);

    // Show q-probability details
    let probY = islandY + 16;
    const q = detailedState.q;
    if (q === 0) {
      ctx.fillStyle = '#666';
      ctx.fillText('q=0 (Schur): deterministic - find first λ_i > μ_i - 1 in island', startX, probY);
    } else if (vh.islands.length > 0) {
      // Show f_k
      if (vh.fValues.length > 0) {
        const f = vh.fValues[0];
        ctx.fillStyle = '#2e7d32';
        ctx.fillText(`f_${f.k} = (1-q^${f.delta_lam})/(1-q^${f.delta_nu}) = ${f.f_k.toFixed(4)}  [U=${f.u.toFixed(4)} → ${f.stopped ? 'STOP' : 'pass'}]`, startX, probY);
        probY += 14;
      }
      // Show g_s values
      if (vh.gValues.length > 0 && vh.gValues[0].values.length > 0) {
        const gStr = vh.gValues[0].values.map(g =>
          `g_${g.s}=${g.g_s.toFixed(3)}[${g.stopped ? 'STOP' : 'pass'}]`
        ).join('  ');
        ctx.fillStyle = '#ff6f00';
        ctx.fillText(gStr, startX, probY);
        probY += 14;
      }
    }

    // === AFTER section (3 rows: λ, ν, μ) - Phase 3+ ===
    const afterY = startY + 4.5 * rowHeight + 45;
    const nuMaya = getMayaParticles(nu, 10);

    if (phase >= 3) {
      const afterLabels = ['λ', 'ν', 'μ'];
      const afterMayas = [lambdaMaya, nuMaya, muMaya];
      const afterColors = ['#ddffdd', '#ffffdd', '#ddddff'];

      // Draw after rows
      afterMayas.forEach((maya, rowIdx) => {
        const y = afterY + rowIdx * rowHeight;

        // Label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'right';
        ctx.fillText(afterLabels[rowIdx] + ':', startX - 10, y + 8);

        // Background
        ctx.fillStyle = afterColors[rowIdx];
        ctx.fillRect(startX, y - 8, (maxPos - minPos + 1) * cellWidth, 22);

        // Draw particles/holes
        for (let pos = minPos; pos <= maxPos; pos++) {
          const x = startX + (pos - minPos + 0.5) * cellWidth;
          const isParticle = maya.has(pos);

          ctx.beginPath();
          ctx.arc(x, y + 3, 5, 0, 2 * Math.PI);
          if (isParticle) {
            ctx.fillStyle = '#333';
            ctx.fill();
          } else {
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      // Draw dimers for after (λ-ν particles, ν-μ holes) - Phase 4
      if (phase >= 4) {
        ctx.lineWidth = 2;
        for (let pos = minPos; pos <= maxPos; pos++) {
          const x = startX + (pos - minPos + 0.5) * cellWidth;
          const y1 = afterY + 3;      // λ row
          const y2 = afterY + rowHeight + 3;  // ν row
          const y3 = afterY + 2 * rowHeight + 3;  // μ row

          // λ-ν particle matching (blue)
          if (lambdaMaya.has(pos) && nuMaya.has(pos)) {
            ctx.strokeStyle = '#2196f3';
            ctx.beginPath();
            ctx.moveTo(x, y1 + 5);
            ctx.lineTo(x, y2 - 5);
            ctx.stroke();
          }

          // ν-μ hole matching (orange)
          if (!nuMaya.has(pos) && !muMaya.has(pos)) {
            ctx.strokeStyle = '#ff9800';
            ctx.beginPath();
            ctx.moveTo(x, y2 + 5);
            ctx.lineTo(x, y3 - 5);
            ctx.stroke();
          }
        }
      }
    }

    // === Enhancement 1: Block Position Highlighting === (Phase 2+)
    // Draw block indicators in the BEFORE section
    // κ-block: indices where μ_{i+1} < λ_i ≤ μ_i  (particle can jump or not)
    // Mark blocks with background highlight

    const maxParticleIndex = Math.max(lambda.length || 0, nu.length || 0, 8);

    if (phase >= 2) {
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';

      // Identify "moved" indices (where μ_i - κ_i = 1) - these form islands
      const movedIndices = new Set();
      for (let i = 0; i < Math.max((mu.length || 0), (kappa.length || 0)) + 2; i++) {
        if (getPart(mu, i) - getPart(kappa, i) === 1) {
          movedIndices.add(i);
        }
      }

      // Draw block position markers
      for (let i = 0; i < maxParticleIndex; i++) {
        if (!movedIndices.has(i)) continue;

        const mayaPos = getPart(kappa, i) - i;
        if (mayaPos < minPos || mayaPos > maxPos) continue;

        const x = startX + (mayaPos - minPos + 0.5) * cellWidth;
        const kappaY = beforeY + rowHeight + 3;

        // Draw small block marker above κ row
        ctx.fillStyle = 'rgba(156, 39, 176, 0.3)';
        ctx.fillRect(x - cellWidth/2 + 2, kappaY - 12, cellWidth - 4, 8);
        ctx.fillStyle = '#7b1fa2';
        ctx.fillText('B', x, kappaY - 6);
      }
    }

    // === Enhancement 2: Jump/Stay Indicator Row === (Phase 4 only)
    // Compare λ and ν partition-by-partition to show which particles jumped or stayed
    const jumpStayY = afterY + 3 * rowHeight + 15;

    if (phase >= 4) {
      ctx.fillStyle = '#333';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Δ:', startX - 10, jumpStayY + 3);

      // Find which partition index was "stopped" (if any)
      let stoppedIndex = null;
      if (vh.decisions.length > 0) {
        for (const dec of vh.decisions) {
          if (dec.stoppedAt !== null && dec.stoppedAt !== undefined && !dec.stoppedAtIsEnd) {
            stoppedIndex = dec.stoppedAt;
            break;
          }
        }
      }

      // Determine jump/stay for each particle index
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';

      for (let i = 0; i < maxParticleIndex; i++) {
        const lamI = getPart(lambda, i);
        const nuI = getPart(nu, i);
        const jumped = nuI > lamI;

        // Convert partition index to Maya position
        const mayaPos = lamI - i;
        if (mayaPos < minPos || mayaPos > maxPos) continue;

        const x = startX + (mayaPos - minPos + 0.5) * cellWidth;

        if (i === stoppedIndex) {
          // Stopped particle - red stop marker
          ctx.fillStyle = '#c62828';
          ctx.fillText('🛑', x, jumpStayY + 5);
        } else if (jumped) {
          // Jumped particle - green up arrow
          ctx.fillStyle = '#2e7d32';
          ctx.fillText('+1', x, jumpStayY + 3);
          // Draw small arrow
          ctx.beginPath();
          ctx.moveTo(x, jumpStayY + 7);
          ctx.lineTo(x, jumpStayY + 12);
          ctx.strokeStyle = '#2e7d32';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - 3, jumpStayY + 9);
          ctx.lineTo(x, jumpStayY + 6);
          ctx.lineTo(x + 3, jumpStayY + 9);
          ctx.stroke();
        } else if (lambdaMaya.has(mayaPos)) {
          // Particle that stayed - gray dash
          ctx.fillStyle = '#999';
          ctx.fillText('—', x, jumpStayY + 3);
        }
      }

      // === All Island Decisions Summary ===
      // Show summary of all island decisions below jump/stay row
      const decisionY = jumpStayY + 25;
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';

      if (vh.decisions.length > 0) {
        let decText = 'Decisions: ';
        vh.decisions.forEach((dec, idx) => {
          if (idx > 0) decText += ' | ';
          const islStr = `[${dec.island.start},${dec.island.end}]`;
          if (dec.stoppedAt === null) {
            decText += `${islStr}: all jump`;
          } else if (dec.stoppedAtIsEnd) {
            decText += `${islStr}: full jump`;
          } else {
            decText += `${islStr}: stop@${dec.stoppedAt}`;
          }
        });
        ctx.fillText(decText, startX, decisionY);
      }
    }
  }

  // Draw island processing details panel with decision tree visualization
  function drawIslandPanel() {
    const canvas = document.getElementById('island-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    if (!detailedState || !detailedState.lastVHDetails) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.fillText('Click "Next" to see island processing', 20, h / 2);
      return;
    }

    const d = detailedState.lastVHDetails;
    const vh = d.vhDetails;
    const q = detailedState.q;

    const margin = 15;
    let y = margin;

    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';

    // Compact header with partitions
    ctx.fillText(`VH: λ≻'κ≺μ → λ≺ν≻'μ  |  bit=${d.bit}  |  q=${q}`, margin, y);
    y += 16;

    ctx.font = '10px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText(`κ=${partitionToString(d.kappa)}  λ=${partitionToString(d.lam)}  μ=${partitionToString(d.mu)}`, margin, y);
    y += 16;

    // === Enhancement 3: Decision Tree Visualization ===
    const treeIndent = 12;
    const lineHeight = 14;

    // Helper to draw tree connector
    function drawTreeBranch(x, yPos, toX) {
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yPos);
      ctx.lineTo(toX, yPos);
      ctx.stroke();
    }

    if (vh.islands.length === 0) {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText('No islands. ν = λ' + (d.bit === 1 ? ' + (1 at pos 0)' : ''), margin, y);
      y += lineHeight;
    } else {
      // Draw decision tree for each island
      vh.decisions.forEach((dec, decIdx) => {
        const island = dec.island;
        const islX = margin;

        // Island header
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#1565c0';
        ctx.fillText(`Island [${island.start},${island.end}]:`, islX, y);
        y += lineHeight;

        const branchX = islX + treeIndent;

        if (q === 0) {
          // === Schur (q=0) Decision Tree ===
          ctx.font = '10px monospace';
          ctx.fillStyle = '#666';
          drawTreeBranch(islX + 4, y - 4, branchX);
          ctx.fillText('q=0: Deterministic cascade', branchX + 4, y);
          y += lineHeight;

          if (dec.stoppedAt !== null && !dec.stoppedAtIsEnd) {
            drawTreeBranch(branchX, y - 4, branchX + treeIndent);
            ctx.fillStyle = '#c62828';
            ctx.fillText(`└─ STOP at i=${dec.stoppedAt}: λ[${dec.stoppedAt}] > μ[${dec.stoppedAt}]-1`, branchX + 4, y);
          } else {
            drawTreeBranch(branchX, y - 4, branchX + treeIndent);
            ctx.fillStyle = '#2e7d32';
            ctx.fillText('└─ All particles free → full jump', branchX + 4, y);
          }
          y += lineHeight + 2;

        } else {
          // === q-Whittaker Decision Tree ===
          // Find f_k value for this island
          const fVal = vh.fValues.find(f => f.k === island.start);

          if (fVal) {
            // Draw f_k branch
            ctx.font = '10px monospace';
            drawTreeBranch(islX + 4, y - 4, branchX);
            ctx.fillStyle = '#2e7d32';
            ctx.fillText(`├─ f_${fVal.k} = ${fVal.f_k.toFixed(3)}`, branchX + 4, y);

            // Show U comparison
            const compX = branchX + 95;
            ctx.fillStyle = '#888';
            ctx.fillText(`U=${fVal.u.toFixed(3)}`, compX, y);

            // Show result
            if (fVal.stopped) {
              ctx.fillStyle = '#c62828';
              ctx.fillText('→ STOP', compX + 70, y);
            } else {
              ctx.fillStyle = '#4caf50';
              ctx.fillText('→ pass', compX + 70, y);
            }
            y += lineHeight;

            // Draw g_s values if f_k passed
            if (!fVal.stopped) {
              const gData = vh.gValues.find(g => g.island.start === island.start && g.island.end === island.end);
              if (gData && gData.values.length > 0) {
                gData.values.forEach((g, gIdx) => {
                  const isLast = gIdx === gData.values.length - 1 || g.stopped;
                  const prefix = isLast ? '└─' : '├─';

                  drawTreeBranch(branchX, y - 4, branchX + treeIndent);
                  ctx.fillStyle = '#ff6f00';
                  ctx.fillText(`${prefix} g_${g.s} = ${g.g_s.toFixed(3)}`, branchX + 4, y);

                  ctx.fillStyle = '#888';
                  ctx.fillText(`U=${g.u.toFixed(3)}`, compX, y);

                  if (g.stopped) {
                    ctx.fillStyle = '#c62828';
                    ctx.fillText('→ STOP', compX + 70, y);
                  } else {
                    ctx.fillStyle = '#4caf50';
                    ctx.fillText('→ pass', compX + 70, y);
                  }
                  y += lineHeight;

                  if (g.stopped) return; // Break after stop
                });
              }
            }
          } else if (dec.case && dec.case.includes('bit=1')) {
            // bit=1 and k=0 case
            ctx.font = '10px monospace';
            drawTreeBranch(islX + 4, y - 4, branchX);
            ctx.fillStyle = '#2e7d32';
            ctx.fillText('└─ bit=1, k=0: all particles jump', branchX + 4, y);
            y += lineHeight;
          }

          y += 2;
        }

        // Show result for this island
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#333';
        const resultParts = [];
        for (let idx = island.start; idx <= island.end + 1; idx++) {
          const jumped = getPart(d.nu, idx) > getPart(d.lam, idx);
          resultParts.push(`ν[${idx}]=${jumped ? 'λ+1' : 'λ'}`);
        }
        ctx.fillText(`   Result: ${resultParts.join(', ')}`, margin, y);
        y += lineHeight + 4;
      });
    }

    // === Enhancement 7: Physical Interpretation ===
    y += 4;
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Physical Interpretation:', margin, y);
    y += lineHeight;

    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#555';

    if (q === 0) {
      ctx.fillText('• q=0 (Schur/Uniform): particles slide freely', margin + 8, y);
      y += 11;
      ctx.fillText('• Cascade stops at first blocked particle', margin + 8, y);
      y += 11;
      ctx.fillText('• Equivalent to standard domino shuffling', margin + 8, y);
    } else if (q < 0.5) {
      ctx.fillText(`• q=${q.toFixed(2)}: low stickiness, particles mostly slide`, margin + 8, y);
      y += 11;
      ctx.fillText('• f_k, g_s small → cascade usually continues', margin + 8, y);
      y += 11;
      ctx.fillText('• Similar to uniform, slight q-deformation', margin + 8, y);
    } else if (q < 0.9) {
      ctx.fillText(`• q=${q.toFixed(2)}: moderate stickiness`, margin + 8, y);
      y += 11;
      ctx.fillText('• Balance between sliding and stopping', margin + 8, y);
      y += 11;
      ctx.fillText('• Visible deviation from uniform measure', margin + 8, y);
    } else {
      ctx.fillText(`• q=${q.toFixed(3)}: high stickiness, particles resist moving`, margin + 8, y);
      y += 11;
      ctx.fillText('• f_k, g_s close to 1 → cascade stops early', margin + 8, y);
      y += 11;
      ctx.fillText('• Tiling concentrates near frozen config', margin + 8, y);
    }

    // Final result
    y += 6;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#1565c0';
    ctx.fillText(`ν = ${partitionToString(d.nu)}`, margin, y);
  }

  // Draw current Aztec diamond panel (from completed anti-diagonals)
  function drawCurrentAztecDiamondPanel() {
    const canvas = document.getElementById('current-aztec-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    if (!detailedState) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.fillText('Click "Next" to start stepping', 20, h / 2);
      return;
    }

    const completedAntiDiags = detailedState.completedAntiDiags;
    const fullN = detailedState.n;

    // After completing anti-diagonal t, we can construct Aztec diamond of size t-1
    // (because the boundary path for size k requires cells on anti-diagonal k+1)
    const aztecSize = completedAntiDiags - 1;

    // Update info
    const infoDiv = document.getElementById('current-aztec-info');
    if (infoDiv) {
      if (aztecSize <= 0) {
        infoDiv.textContent = 'Complete more cells to see the first Aztec diamond (need 2 anti-diagonals).';
      } else if (aztecSize >= fullN) {
        infoDiv.textContent = `Complete Aztec diamond of size ${fullN}`;
      } else {
        infoDiv.textContent = `Aztec diamond of size ${aztecSize} (${fullN - aztecSize} more to go)`;
      }
    }

    if (aztecSize <= 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.fillText('Complete 2 anti-diagonals to see size-1 Aztec diamond', 20, h / 2);
      return;
    }

    // Get partitions for current Aztec size
    const partitions = extractOutputPartitionsForSize(detailedState, aztecSize);
    const n = aztecSize;

    // Scale to fit
    const scale = Math.min(w, h) / (2 * n + 3) * 0.85;
    const cx = w / 2;
    const cy = h / 2;

    // Generate lattice points for Aztec diamond of current size
    const latticePoints = [];
    for (let hx = -n - 0.5; hx <= n + 0.5; hx += 1) {
      for (let hy = -n - 0.5; hy <= n + 0.5; hy += 1) {
        if (Math.abs(hx % 1) !== 0.5 || Math.abs(hy % 1) !== 0.5) continue;
        if (Math.abs(hx) + Math.abs(hy) > n + 0.5) continue;

        const screenX = cx + hx * scale;
        const screenY = cy - hy * scale;
        const diag = Math.round(hx + hy);

        latticePoints.push({ hx, hy, x: screenX, y: screenY, diag });
      }
    }

    if (latticePoints.length === 0) return;

    // Group by diagonal and sort
    const geomDiagonals = {};
    latticePoints.forEach(p => {
      if (!geomDiagonals[p.diag]) geomDiagonals[p.diag] = [];
      geomDiagonals[p.diag].push(p);
    });
    for (const d in geomDiagonals) {
      geomDiagonals[d].sort((a, b) => (a.hx - a.hy) - (b.hx - b.hy));
      geomDiagonals[d].forEach((p, idx) => { p.posInDiag = idx + 1; });
    }

    const diagKeys = Object.keys(geomDiagonals).map(Number).sort((a, b) => a - b);

    // Helper: get particle count for diagonal index at given size
    function getParticleCountForSize(idx, size) {
      const k = Math.floor((idx + 1) / 2);
      if (idx % 2 === 0) {
        return size - k;
      } else {
        return size - k + 1;
      }
    }

    // Convert partitions to subsets - assign particles to lattice points
    const subsetsByDiag = {};
    for (let idx = 0; idx < partitions.length && idx < diagKeys.length; idx++) {
      const diagKey = diagKeys[idx];
      const diagSize = geomDiagonals[diagKey].length;
      const partition = partitions[idx] || [];
      const numParticles = getParticleCountForSize(idx, n);
      const subset = partitionToSubset(partition, numParticles, diagSize);
      subsetsByDiag[diagKey] = new Set(subset);
    }

    latticePoints.forEach(p => {
      const subset = subsetsByDiag[p.diag];
      p.inSubset = subset ? subset.has(p.posInDiag) : false;
    });

    // Create lookup for neighbor finding
    const pointLookup = {};
    latticePoints.forEach(p => {
      pointLookup[`${p.hx},${p.hy}`] = p;
    });

    // Draw diagonal lines through lattice points on each diagonal (hx + hy = d)
    // Points on diagonal d are arranged along direction (1, -1) in hx,hy coords
    // In screen coords: direction is (+scale, +scale) since screenY = cy - hy*scale
    ctx.strokeStyle = 'rgba(180, 180, 180, 0.7)';
    ctx.lineWidth = 1;

    // Group points by diagonal and draw line through each group
    const pointsByDiag = {};
    latticePoints.forEach(p => {
      if (!pointsByDiag[p.diag]) pointsByDiag[p.diag] = [];
      pointsByDiag[p.diag].push(p);
    });

    for (const d in pointsByDiag) {
      const pts = pointsByDiag[d];
      if (pts.length < 2) continue;

      // Sort by screen x to get endpoints
      pts.sort((a, b) => a.x - b.x);
      const first = pts[0];
      const last = pts[pts.length - 1];

      // Extend slightly beyond the endpoints
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const extend = scale * 0.5;
      const ux = dx / len, uy = dy / len;

      ctx.beginPath();
      ctx.moveTo(first.x - ux * extend, first.y - uy * extend);
      ctx.lineTo(last.x + ux * extend, last.y + uy * extend);
      ctx.stroke();
    }

    // Helper to get neighbors
    function getNeighbors(p) {
      const neighbors = [];
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of directions) {
        const key = `${p.hx + dx},${p.hy + dy}`;
        if (pointLookup[key]) neighbors.push(pointLookup[key]);
      }
      return neighbors;
    }

    // Match particles - start from bottom-left
    const particles = latticePoints.filter(p => p.inSubset);
    particles.sort((a, b) => {
      const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
      if (sumA !== sumB) return sumA - sumB;
      return (a.hx - a.hy) - (b.hx - b.hy);
    });

    const matchedParticles = new Set();
    const particleDominoes = [];
    for (const p of particles) {
      if (matchedParticles.has(`${p.hx},${p.hy}`)) continue;
      const neighbors = getNeighbors(p).filter(nb => nb.inSubset && !matchedParticles.has(`${nb.hx},${nb.hy}`));
      if (neighbors.length > 0) {
        neighbors.sort((a, b) => {
          const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
          if (sumA !== sumB) return sumA - sumB;
          return (a.hx - a.hy) - (b.hx - b.hy);
        });
        const neighbor = neighbors[0];
        matchedParticles.add(`${p.hx},${p.hy}`);
        matchedParticles.add(`${neighbor.hx},${neighbor.hy}`);
        particleDominoes.push({ p1: p, p2: neighbor });
      }
    }

    // Match holes - start from top-right
    const holes = latticePoints.filter(p => !p.inSubset);
    holes.sort((a, b) => {
      const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
      if (sumA !== sumB) return sumB - sumA;
      return (b.hx - b.hy) - (a.hx - a.hy);
    });

    const matchedHoles = new Set();
    const holeDominoes = [];
    for (const p of holes) {
      if (matchedHoles.has(`${p.hx},${p.hy}`)) continue;
      const neighbors = getNeighbors(p).filter(nb => !nb.inSubset && !matchedHoles.has(`${nb.hx},${nb.hy}`));
      if (neighbors.length > 0) {
        neighbors.sort((a, b) => {
          const sumA = a.hx + a.hy, sumB = b.hx + b.hy;
          if (sumA !== sumB) return sumB - sumA;
          return (b.hx - b.hy) - (a.hx - a.hy);
        });
        const neighbor = neighbors[0];
        matchedHoles.add(`${p.hx},${p.hy}`);
        matchedHoles.add(`${neighbor.hx},${neighbor.hy}`);
        holeDominoes.push({ p1: p, p2: neighbor });
      }
    }

    const allDominoes = [...particleDominoes, ...holeDominoes];

    // Draw domino outlines (rectangles around each matched pair)
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.lineWidth = Math.max(1.5, scale * 0.06);
    for (const d of allDominoes) {
      const isHorizontal = Math.abs(d.p1.hx - d.p2.hx) > 0.5;
      const domCx = (d.p1.x + d.p2.x) / 2;
      const domCy = (d.p1.y + d.p2.y) / 2;
      const domW = isHorizontal ? scale * 2 : scale;
      const domH = isHorizontal ? scale : scale * 2;
      ctx.strokeRect(domCx - domW / 2, domCy - domH / 2, domW, domH);
    }

    // Draw dimer edges (lines connecting matched pairs)
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.8)';
    ctx.lineWidth = Math.max(2, scale * 0.08);
    for (const d of allDominoes) {
      ctx.beginPath();
      ctx.moveTo(d.p1.x, d.p1.y);
      ctx.lineTo(d.p2.x, d.p2.y);
      ctx.stroke();
    }

    // Draw particles (filled circles) and holes (empty circles)
    const particleRadius = Math.max(4, scale * 0.25);

    for (const p of latticePoints) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, particleRadius, 0, 2 * Math.PI);

      if (p.inSubset) {
        // Particle: filled black circle
        ctx.fillStyle = '#000000';
        ctx.fill();
      } else {
        // Hole: empty white circle with black border
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // Update detailed mode UI
  function updateDetailedModeUI() {
    if (!detailedState) return;

    const state = detailedState;

    // Update step indicator
    const indicator = document.getElementById('step-indicator');
    if (indicator) {
      if (state.completed) {
        indicator.textContent = `Completed! (${state.totalCells} cells)`;
        indicator.style.color = '#2e7d32';
      } else if (state.cellIndex === 0) {
        indicator.textContent = `Ready to start (${state.totalCells} cells)`;
        indicator.style.color = '#1976d2';
      } else {
        indicator.textContent = `Cell ${state.cellIndex} of ${state.totalCells}`;
        indicator.style.color = '#1976d2';
      }
    }

    // Enable/disable buttons
    document.getElementById('step-prev-btn').disabled = state.history.length <= 1;
    document.getElementById('step-next-btn').disabled = state.completed;

    // Update info panels
    if (state.lastVHDetails) {
      const d = state.lastVHDetails;

      // Cell position
      document.getElementById('cell-position').innerHTML =
        `Position: cell (${d.i}, ${d.j}) in growth diagram`;

      // Bernoulli probability
      document.getElementById('cell-bernoulli').innerHTML =
        `p = x<sub>${d.i}</sub> &middot; y<sub>${d.j}</sub> / (1 + x<sub>${d.i}</sub> &middot; y<sub>${d.j}</sub>) = ${d.x_i.toFixed(4)} &times; ${d.y_j.toFixed(4)} / ${(1 + d.xi).toFixed(4)} = <b>${d.p.toFixed(6)}</b>`;

      document.getElementById('cell-random').innerHTML =
        `Random U ~ Uniform[0,1]: U = ${d.u.toFixed(6)}`;

      document.getElementById('cell-bit').innerHTML =
        `Result bit = ${d.bit} (U ${d.u < d.p ? '<' : '≥'} p)`;

      // VH bijection details
      const vh = d.vhDetails;
      const islandStr = vh.islands.length > 0
        ? vh.islands.map(isl => `[${isl.start}, ${isl.end}]`).join(', ')
        : 'none';
      document.getElementById('island-info').innerHTML =
        `Islands: ${islandStr}`;

      // f_k values
      if (vh.fValues.length > 0) {
        const f = vh.fValues[0];
        document.getElementById('f-probability').innerHTML =
          `f<sub>${f.k}</sub> = (1 - q<sup>${f.delta_lam}</sup>) / (1 - q<sup>${f.delta_nu}</sup>) = <b>${f.f_k.toFixed(6)}</b> (U=${f.u.toFixed(4)}, ${f.stopped ? 'STOPPED' : 'passed'})`;
      } else if (state.q === 0) {
        document.getElementById('f-probability').innerHTML =
          `q=0 (Schur case): deterministic, no probabilistic sampling`;
      } else {
        document.getElementById('f-probability').innerHTML = `f<sub>k</sub>: —`;
      }

      // g_s values
      if (vh.gValues.length > 0 && vh.gValues[0].values.length > 0) {
        const gStr = vh.gValues[0].values.map(g =>
          `g<sub>${g.s}</sub>=${g.g_s.toFixed(4)} (${g.stopped ? 'STOP' : 'pass'})`
        ).join(', ');
        document.getElementById('g-probabilities').innerHTML = `g values: ${gStr}`;
      } else {
        document.getElementById('g-probabilities').innerHTML = `g<sub>s</sub> values: —`;
      }

      // Decision
      if (vh.decisions.length > 0) {
        const decision = vh.decisions[vh.decisions.length - 1];
        document.getElementById('stopped-decision').innerHTML =
          `Decision: ${decision.case}` + (decision.stoppedAt !== null ? ` at index ${decision.stoppedAt}` : '');
      } else {
        document.getElementById('stopped-decision').innerHTML = `Decision: no islands to process`;
      }
    }

    // Draw all panels
    drawCellLatticePanel();
    drawShufflingPanel();
    drawIslandPanel();
    drawCurrentAztecDiamondPanel();
  }

  // Initialize detailed sampler
  function initializeDetailedSampler() {
    const n = parseInt(document.getElementById("n-input").value) || 4;
    const x = parseCSV(document.getElementById("x-params").value);
    const y = parseCSV(document.getElementById("y-params").value);
    const q = parseFloat(document.getElementById("q-input").value) || 0;

    // Get seed from input, or generate random one
    const seedInput = document.getElementById("detailed-seed");
    let seed = parseInt(seedInput.value);
    if (isNaN(seed) || seedInput.value === '') {
      seed = Math.floor(Math.random() * 2147483647);
      seedInput.value = seed;
    }
    currentSeed = seed;

    if (n > 15) {
      alert('Detailed mode works best with n ≤ 15 for clarity. Using n=' + Math.min(n, 15));
    }

    detailedState = new DetailedSamplerState(Math.min(n, 15), x, y, q, seed);
    updateDetailedModeUI();
  }

  // Toggle detailed mode
  document.getElementById('toggle-detailed-mode-btn').addEventListener('click', function() {
    detailedModeActive = !detailedModeActive;

    const btn = this;
    const panel = document.getElementById('detailed-mode-panel');

    // Elements to hide when in detailed mode (using IDs for reliability)
    const elementsToToggle = [
      'zoom-export-row',
      'canvas-row',
      'view-mode-controls',
      'visual-controls',
      'custom-color-pickers',
      'partitions-details'
    ];

    if (detailedModeActive) {
      btn.textContent = 'Disable Detailed Mode';
      btn.classList.add('active');
      panel.style.display = 'block';

      // Hide normal UI elements
      elementsToToggle.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });

      // Initialize sampler
      initializeDetailedSampler();
    } else {
      btn.textContent = 'Enable Detailed Mode';
      btn.classList.remove('active');
      panel.style.display = 'none';

      // Stop auto-play if running
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        document.getElementById('step-auto-btn').textContent = 'Auto-Play';
      }

      // Show normal UI elements
      elementsToToggle.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
      });

      detailedState = null;
    }
  });

  // Step controls
  document.getElementById('step-next-btn').addEventListener('click', function() {
    if (stepDetailedSampler()) {
      updateDetailedModeUI();
    }
  });

  document.getElementById('step-prev-btn').addEventListener('click', function() {
    if (stepDetailedSamplerPrev()) {
      updateDetailedModeUI();
    }
  });

  document.getElementById('step-reset-btn').addEventListener('click', function() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
      document.getElementById('step-auto-btn').textContent = 'Auto-Play';
    }
    initializeDetailedSampler();
  });

  document.getElementById('step-auto-btn').addEventListener('click', function() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
      this.textContent = 'Auto-Play';
    } else {
      const speed = 2100 - parseInt(document.getElementById('step-speed').value);
      autoPlayInterval = setInterval(() => {
        if (!stepDetailedSampler()) {
          clearInterval(autoPlayInterval);
          autoPlayInterval = null;
          document.getElementById('step-auto-btn').textContent = 'Auto-Play';
        }
        updateDetailedModeUI();
      }, speed);
      this.textContent = 'Pause';
    }
  });

  // New seed button - generates random seed and reinitializes
  document.getElementById('new-seed-btn').addEventListener('click', function() {
    const seedInput = document.getElementById("detailed-seed");
    seedInput.value = Math.floor(Math.random() * 2147483647);
    if (detailedModeActive) {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        document.getElementById('step-auto-btn').textContent = 'Auto-Play';
      }
      initializeDetailedSampler();
    }
  });

  // Shuffle animation controls
  document.getElementById('shuffle-animate-btn').addEventListener('click', function() {
    if (shuffleAnimationInterval) {
      // Stop animation
      clearInterval(shuffleAnimationInterval);
      shuffleAnimationInterval = null;
      this.innerHTML = '&#9654; Animate';
    } else {
      // Start animation from phase 0
      shuffleAnimationPhase = 0;
      this.innerHTML = '&#10074;&#10074; Pause';
      shuffleAnimationInterval = setInterval(() => {
        shuffleAnimationPhase++;
        if (shuffleAnimationPhase > 4) {
          shuffleAnimationPhase = 4;
          clearInterval(shuffleAnimationInterval);
          shuffleAnimationInterval = null;
          document.getElementById('shuffle-animate-btn').innerHTML = '&#9654; Animate';
        }
        document.getElementById('shuffle-phase-select').value = shuffleAnimationPhase;
        drawShufflingPanel();
      }, 800);
      drawShufflingPanel();
    }
  });

  document.getElementById('shuffle-reset-btn').addEventListener('click', function() {
    if (shuffleAnimationInterval) {
      clearInterval(shuffleAnimationInterval);
      shuffleAnimationInterval = null;
      document.getElementById('shuffle-animate-btn').innerHTML = '&#9654; Animate';
    }
    shuffleAnimationPhase = 4;  // Show complete view
    document.getElementById('shuffle-phase-select').value = 4;
    drawShufflingPanel();
  });

  document.getElementById('shuffle-phase-select').addEventListener('change', function() {
    if (shuffleAnimationInterval) {
      clearInterval(shuffleAnimationInterval);
      shuffleAnimationInterval = null;
      document.getElementById('shuffle-animate-btn').innerHTML = '&#9654; Animate';
    }
    shuffleAnimationPhase = parseInt(this.value);
    drawShufflingPanel();
  });

  // ========== END DETAILED MODE ==========

  // Sample on page load with default parameters
  try {
    updateParamsForN(currentN);
    const initX = parseCSV(document.getElementById("x-params").value);
    const initY = parseCSV(document.getElementById("y-params").value);
    const initQ = parseFloat(document.getElementById("q-input").value);
    currentPartitions = await aztecDiamondSample(currentN, initX, initY, initQ);
    await renderParticles();
    displaySubsets();
  } catch (e) {
    console.error('Initial sample failed:', e);
    document.getElementById("subsets-output").textContent = 'Error: ' + e.message;
  }
}

// Handle both cases: module already initialized or not yet
if (Module.calledRun) {
  initializeApp();
} else {
  Module.onRuntimeInitialized = initializeApp;
}
</script>
