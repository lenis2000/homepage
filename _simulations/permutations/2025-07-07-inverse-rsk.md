---
title: Inverse RSK from Two Random SYT
model: permutations
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-07-07-inverse-rsk.md'
    txt : 'Interactive JS – see source'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-07-07-inverse-rsk.js'
    txt : 'Main logic'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-07-07-hookwalk-tableau.cpp'
    txt : 'WASM sampler for a single SYT (already exists)'
---

<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<!-- hook-walk WASM (already compiled, single-file) -->
<script src="{{site.url}}/js/2025-07-07-hookwalk-tableau.js"></script>
<!-- our brand-new driver -->
<script src="{{site.url}}/js/2025-07-07-inverse-rsk.js"></script>

<style>
/* Reuse all the CSS from hookwalk-tableau for consistent UI */
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

.permutation-display {
  font-family: monospace;
  margin: 10px 0;
}

#perm-matrix svg {
  max-width: 90vw;
  height: auto;
}

.summary-box {
  font-family: monospace;
  color: var(--text-primary, #333);
  margin: 8px 0;
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

<h2>Random permutation via inverse RSK</h2>

<details id="algorithm-description-details" style="margin-bottom: 20px;">
    <summary style="cursor: pointer; padding: 15px; border: 1px solid var(--border-color, #ddd); border-radius: 5px; background-color: var(--bg-secondary, #f9f9f9); font-weight: bold; font-size: 1.1em; color: var(--text-primary, #212529);">
        About the Inverse RSK Algorithm
    </summary>
    <div style="padding: 15px; border: 1px solid var(--border-color, #ddd); border-top: none; border-radius: 0 0 5px 5px; background-color: var(--bg-secondary, #f9f9f9); color: var(--text-primary, #212529);">
        <p>The <strong>inverse Robinson-Schensted-Knuth (RSK) correspondence</strong> takes a pair of Standard Young Tableaux (P, Q) of the same shape and recovers the permutation that generated them through the forward RSK algorithm.</p>
        
        <h4>How it works:</h4>
        <ol>
            <li>Sample two independent random Standard Young Tableaux P and Q of the same shape using the hook-walk algorithm</li>
            <li>Apply the inverse RSK procedure:
                <ul>
                    <li>For each time step t = N down to 1, find t in the Q-tableau</li>
                    <li>Extract the corresponding entry from the P-tableau</li>
                    <li>Perform reverse bumping through the rows to recover the original inserted value</li>
                </ul>
            </li>
            <li>The sequence of extracted values forms the permutation σ</li>
        </ol>
        
        <h4>Properties:</h4>
        <ul>
            <li><strong>Uniform distribution:</strong> Generates uniformly random permutations with given RSK shape</li>
            <li><strong>Bijective:</strong> Perfect correspondence between permutations and SYT pairs</li>
            <li><strong>Scalable:</strong> Uses WASM for large shapes (N > 500 boxes) with pure JS implementation for smaller cases</li>
        </ul>
        
        <h4>Visualization:</h4>
        <ul>
            <li><strong>Small permutations (≤200):</strong> Full permutation array display</li>
            <li><strong>Medium permutations (≤600):</strong> Permutation matrix with dots</li>
            <li><strong>Large permutations (>600):</strong> Summary statistics only</li>
        </ul>
    </div>
</details>

<div id="shape-ui"></div>
<div class="input-group">
  <button id="generate-permutation">Generate permutation σ</button>
  <span id="wasm-status" style="margin-left:10px;color:var(--text-secondary,#666);"></span>
</div>

<div id="progress-area" style="display:none;margin-top:10px;">
  <div class="progress-bar"><div id="progress-fill" class="progress-fill"></div></div>
  <div id="progress-text" class="progress-text"></div>
</div>

<h3>Standard Young Tableaux</h3>
<div style="display: flex; gap: 20px; flex-wrap: wrap;">
  <div>
    <h4>P-tableau</h4>
    <div id="p-tableau"></div>
  </div>
  <div>
    <h4>Q-tableau</h4>
    <div id="q-tableau"></div>
  </div>
</div>

<h3>Permutation</h3>
<div id="perm-display" class="permutation-display"></div>
<div id="perm-matrix"></div>