---
title: Ultimate Lozenge Tiling Generator - Draw Any Region
model: lozenge-tilings
permalink: lozenge-draw/
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.cpp'
    txt: 'C++ code for the simulation (compiled to WebAssembly)'
---

<details id="about-simulation-details">
<summary>About this simulation</summary>
<div class="info-panel-content">
  <div class="info-tabs">
    <button class="info-tab active" data-tab="quickstart">Quick Start</button>
    <button class="info-tab" data-tab="sampling">Sampling</button>
    <button class="info-tab" data-tab="tools">Tools</button>
    <button class="info-tab" data-tab="export">Export</button>
  </div>

  <div class="info-pane active" id="pane-quickstart">
    <ol>
      <li><strong>Draw a region</strong> on the triangular grid using the pencil tool, or use <strong>Hexagon</strong> preset</li>
      <li>Click <strong>"Make Tileable"</strong> if the region shows as invalid</li>
      <li>Click <strong>"Perfect Sample"</strong> to generate an exact random tiling</li>
      <li>Toggle <strong>3D</strong> view to see the height function surface</li>
    </ol>
    <p style="margin-top: 12px; color: #666; font-size: 12px;">A region is <strong>tileable</strong> if it has equal numbers of black and white triangles that can be perfectly matched.</p>
  </div>

  <div class="info-pane" id="pane-sampling">
    <p><strong>Sampling Methods:</strong></p>
    <ul>
      <li><strong>Glauber dynamics</strong>: MCMC with local flips. Converges to target distribution over time.</li>
      <li><strong>Perfect Sample (CFTP)</strong>: Coupling From The Past — exact sample with no burn-in.</li>
    </ul>
    <p style="margin-top: 12px;"><strong>Weight Distributions:</strong></p>
    <ul>
      <li><strong>Uniform (q=1)</strong>: Equal probability for all tilings</li>
      <li><strong>q-Volume (q≠1)</strong>: Probability ∝ q<sup>volume</sup></li>
      <li><strong>Periodic weights</strong>: k×k matrix of position-dependent q values</li>
    </ul>
    <p style="margin-top: 12px;"><strong>Advanced:</strong></p>
    <ul>
      <li><strong>Average Sample</strong>: Compute mean height (Limit Shape)</li>
      <li><strong>Fluctuations</strong>: Height difference ≈ Gaussian Free Field</li>
      <li><strong>Double Dimer</strong>: Superimpose two samples to form loops</li>
    </ul>
  </div>

  <div class="info-pane" id="pane-tools">
    <p><strong>Drawing Tools:</strong></p>
    <ul>
      <li><strong>Pan</strong> 🤚: Move the view around</li>
      <li><strong>Draw</strong> ✏️: Add triangles to region</li>
      <li><strong>Erase</strong> 🧹: Remove triangles from region</li>
      <li><strong>Lasso Fill/Erase</strong>: Click points to define polygon, click near start to close</li>
      <li><strong>Snap</strong> 📐: Snap lasso to grid vertices</li>
    </ul>
    <p style="margin-top: 12px;"><strong>Region Tools:</strong></p>
    <ul>
      <li><strong>Scale Up/Down</strong>: Double or halve region size</li>
      <li><strong>Make Tileable</strong>: Auto-fix invalid regions</li>
      <li><strong>Undo/Redo</strong>: Full history support (Ctrl+Z/Y)</li>
    </ul>
    <p style="margin-top: 12px;"><strong>Presets:</strong> Hexagon (a,b,c), Letters A-Z, Numbers 0-9, Shape of the Month</p>
  </div>

  <div class="info-pane" id="pane-export">
    <p><strong>Visualization:</strong></p>
    <ul>
      <li><strong>2D Lozenge</strong> ◆: Standard flat tiling view</li>
      <li><strong>2D Paths</strong> →: Non-intersecting paths</li>
      <li><strong>2D Dimer</strong> •-•: Matching on dual graph</li>
      <li><strong>3D Height</strong>: Stepped surface, rotate/zoom</li>
    </ul>
    <p style="margin-top: 12px;"><strong>Export Options:</strong></p>
    <ul>
      <li><strong>Images</strong>: PNG, PDF</li>
      <li><strong>Data</strong>: Height CSV, Mathematica array</li>
      <li><strong>Region</strong>: JSON import/export</li>
      <li><strong>Share</strong>: Copy link with encoded state</li>
    </ul>
    <p style="margin-top: 12px;"><strong>Performance:</strong> Uses WebGPU when available, falls back to multi-threaded WASM.</p>
  </div>
</div>
</details>

---

<style>
  .control-group {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
  }
  .control-group-title {
    font-size: 11px;
    font-weight: 600;
    color: #666;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  #lozenge-canvas {
    width: 100%;
    max-width: 900px;
    height: 600px;
    border: 1px solid #ccc;
    display: block;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 6px;
    cursor: crosshair;
    /* Prevent iOS touch behaviors that cause jumping */
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  #lozenge-canvas.panning {
    cursor: grab;
  }
  #lozenge-canvas.panning:active {
    cursor: grabbing;
  }
  #three-container {
    width: 100%;
    max-width: 900px;
    height: 600px;
    border: 1px solid #ccc;
    display: none;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 6px;
    /* Prevent iOS touch behaviors */
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  #three-container canvas {
    width: 100% !important;
    height: 100% !important;
    display: block;
  }
  [data-theme="dark"] #three-container {
    background: #1a1a1a;
    border-color: #444;
  }
  [data-theme="dark"] #lozenge-canvas {
    background: #1a1a1a;
    border-color: #444;
  }
  #canvas-container.fullscreen-mode {
    position: fixed !important;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: white;
  }
  #canvas-container.fullscreen-mode #lozenge-canvas,
  #canvas-container.fullscreen-mode #three-container {
    max-width: none;
    height: 100vh !important;
    width: 100vw;
  }
  [data-theme="dark"] #canvas-container.fullscreen-mode {
    background: #1a1a1a;
  }
  .param-input {
    width: 50px;
    height: 28px;
    text-align: center;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    font-family: 'SF Mono', Monaco, monospace;
    box-sizing: border-box;
  }
  .param-input:focus {
    outline: none;
    border-color: #E57200;
    box-shadow: 0 0 0 2px rgba(229, 114, 0, 0.2);
  }
  .param-label {
    font-size: 13px;
    color: #555;
    margin-right: 4px;
    font-weight: 500;
  }
  .param-group {
    display: inline-flex;
    align-items: center;
    margin-right: 12px;
  }
  .control-group button {
    height: 30px;
    padding: 0 14px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    background: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .control-group button:hover {
    background: #f5f5f5;
    border-color: #999;
  }
  .control-group button:disabled {
    background: #e0e0e0;
    border-color: #ccc;
    color: #999;
    cursor: not-allowed;
  }
  .control-group button:disabled:hover {
    background: #e0e0e0;
    border-color: #ccc;
  }
  .control-group button.primary {
    background: #E57200;
    color: white;
    border-color: #E57200;
  }
  .control-group button.primary:hover {
    background: #c96300;
  }
  .control-group button.primary:disabled {
    background: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
  }
  .control-group button.running {
    background: linear-gradient(135deg, #E57200, #f08c30);
    color: white;
    border-color: #E57200;
  }
  .control-group button.cftp {
    background: linear-gradient(135deg, #232D4B, #3a4a6b);
    color: white;
    border-color: #232D4B;
  }
  .control-group button.cftp:hover {
    background: linear-gradient(135deg, #1a2238, #232D4B);
  }
  .control-group button.cftp:disabled {
    background: #8a9ab8;
    border-color: #8a9ab8;
    cursor: not-allowed;
  }
  /* Tool toggle buttons */
  .tool-toggle {
    display: inline-flex;
    border: 2px solid #232D4B;
    border-radius: 6px;
    overflow: hidden;
  }
  .tool-toggle button {
    border: none;
    border-radius: 0;
    height: 32px;
    padding: 0 16px;
    font-weight: 500;
    background: white;
    color: #232D4B;
  }
  .tool-toggle button.active {
    background: #232D4B;
    color: white;
  }
  .tool-toggle button:hover:not(.active) {
    background: #F9DCBF;
  }
  /* View toggle buttons */
  .view-toggle {
    display: inline-flex;
    border: 2px solid #232D4B;
    border-radius: 6px;
    overflow: hidden;
  }
  /* Exception: zoom overlay has no border */
  #zoom-overlay > .view-toggle {
    border: none;
    background: transparent;
    overflow: visible;
  }
  .view-toggle button {
    border: none;
    border-radius: 0;
    height: 32px;
    padding: 0 16px;
    font-weight: 500;
    background: white;
    color: #232D4B;
  }
  .view-toggle button.active {
    background: #232D4B;
    color: white;
  }
  .view-toggle button:hover:not(.active) {
    background: #F9DCBF;
  }
  .stats-inline {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 12px;
  }
  .stats-inline .stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .stats-inline .stat-label {
    color: #888;
    text-transform: uppercase;
    font-size: 10px;
  }
  .stats-inline .stat-value {
    color: #232D4B;
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
  }
  .status-valid {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 12px;
  }
  .status-invalid {
    background: #ffebee;
    color: #c62828;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 12px;
  }
  .status-empty {
    background: #fff3e0;
    color: #e65100;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 12px;
  }
  select {
    height: 30px;
    padding: 0 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    background: white;
    cursor: pointer;
  }
  input[type="range"] {
    height: 4px;
    border-radius: 2px;
    background: #d0d0d0;
    appearance: none;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E57200, #f08c30);
    cursor: pointer;
  }
  details {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
    margin: 8px auto;
    max-width: 900px;
  }
  details > summary {
    padding: 8px 12px;
    background: #f5f5f5;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
  }
  details > .content {
    padding: 10px 12px;
    background: white;
  }
  [data-theme="dark"] .control-group {
    background-color: #2d2d2d;
    border-color: #444;
  }
  [data-theme="dark"] .control-group-title,
  [data-theme="dark"] .param-label {
    color: #bbb;
  }
  [data-theme="dark"] .param-input,
  [data-theme="dark"] select,
  [data-theme="dark"] .control-group button {
    background-color: #3a3a3a;
    border-color: #555;
    color: #ddd;
  }
  [data-theme="dark"] .control-group button:disabled {
    background-color: #2a2a2a;
    border-color: #444;
    color: #666;
  }
  [data-theme="dark"] .status-valid { background: #1b5e20; color: #a5d6a7; }
  [data-theme="dark"] .status-invalid { background: #b71c1c; color: #ffcdd2; }
  [data-theme="dark"] .status-empty { background: #e65100; color: #ffe0b2; }
  /* Accessibility improvements */
  button:focus, input:focus, select:focus {
    outline: 3px solid #E57200;
    outline-offset: 2px;
  }
  .tool-toggle button:focus, .view-toggle button:focus {
    outline: 3px solid #232D4B;
    outline-offset: 2px;
  }
  /* Skip to main content link - hidden until focused */
  .skip-link {
    position: absolute;
    left: -9999px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
    z-index: 1000;
    background: #E57200;
    color: white;
    padding: 8px 16px;
    text-decoration: none;
    border-radius: 4px;
  }
  .skip-link:focus {
    position: fixed;
    top: 10px;
    left: 10px;
    width: auto;
    height: auto;
    overflow: visible;
  }
  /* Improved button contrast and touch targets */
  .control-group button {
    min-width: 44px;
    min-height: 44px;
  }
  /* Better touch targets for mobile */
  @media (max-width: 767px) {
    /* Larger touch targets */
    .control-group button {
      min-width: 48px;
      min-height: 48px;
      padding: 0 14px;
      font-size: 13px;
    }
    .tool-toggle button {
      min-width: 48px;
      min-height: 48px;
      padding: 0 14px;
      font-size: 15px;
    }
    .view-toggle button {
      min-width: 44px;
      min-height: 44px;
      padding: 0 12px;
      font-size: 12px;
    }
    #lozenge-canvas, #three-container {
      height: 400px;
    }
    /* Prevent iOS page bounce/scroll during canvas interaction */
    .visualization-panel {
      overscroll-behavior: none;
      -webkit-overflow-scrolling: auto;
    }
    .control-group {
      padding: 8px 12px;
      margin-bottom: 10px;
    }
    .control-group-title {
      font-size: 11px;
      margin-bottom: 8px;
    }
    .param-input {
      width: 48px;
      height: 44px;
      font-size: 14px;
    }
    .param-label {
      font-size: 13px;
    }
    .param-group {
      margin-right: 10px;
      margin-bottom: 8px;
    }
    select {
      min-height: 44px;
      font-size: 14px;
      padding: 0 12px;
    }
    .stats-inline {
      font-size: 12px;
      gap: 12px;
    }
    #view-overlay {
      top: 6px;
      right: 6px;
      gap: 6px;
    }
    #helpBtn {
      width: 36px;
      height: 36px;
      font-size: 16px;
    }
    /* Better spacing for controls */
    .control-group > div {
      gap: 10px;
    }
    /* Stack controls vertically on very small screens */
    @media (max-width: 480px) {
      .control-group > div {
        flex-direction: column;
        align-items: stretch;
      }
      .control-group button:not(.tool-toggle button):not(.view-toggle button) {
        width: 100%;
      }
    }
  }
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .control-group button {
      border-width: 2px;
    }
    .tool-toggle, .view-toggle {
      border-width: 3px;
    }
  }
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  /* Hole winding controls */
  .hole-control {
    position: absolute;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2px;
    pointer-events: auto;
    /* GPU composition for hardware-accelerated transforms */
    will-change: transform;
    top: 0;
    left: 0;
    /* Center the element on its coordinate via margin */
    margin-top: -12px;
    margin-left: -40px; /* Half of approx width (~80px for the control group) */
  }
  .hole-control button {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid rgba(100, 100, 100, 0.5);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-weight: bold;
    font-size: 16px;
    line-height: 1;
    box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  }
  .hole-control button:hover {
    background: rgba(255, 255, 255, 0.7);
  }
  [data-theme="dark"] .hole-control button {
    background: rgba(60, 60, 60, 0.6);
    border-color: rgba(136, 136, 136, 0.5);
    color: #eee;
  }
  [data-theme="dark"] .hole-control button:hover {
    background: rgba(80, 80, 80, 0.7);
  }
  .hole-control input {
    width: 36px;
    height: 24px;
    padding: 2px 4px;
    border: 1px solid rgba(100, 100, 100, 0.5);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(0,0,0,0.15);
    -moz-appearance: textfield;
  }
  .hole-control input::-webkit-outer-spin-button,
  .hole-control input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .hole-control input:focus {
    outline: 2px solid #4a90d9;
    background: rgba(255, 255, 255, 0.8);
  }
  [data-theme="dark"] .hole-control input {
    background: rgba(60, 60, 60, 0.6);
    border-color: rgba(136, 136, 136, 0.5);
    color: #eee;
  }
  [data-theme="dark"] .hole-control input:focus {
    background: rgba(60, 60, 60, 0.8);
  }

  /* ========================================================================
     About Section - Full Width with Tabbed Interface
     ======================================================================== */
  #about-simulation-details {
    max-width: 1400px;
    margin: 0 auto 16px auto;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--bg-secondary, #f8f9fa);
  }

  #about-simulation-details summary {
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
  }

  #about-simulation-details[open] summary {
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .info-panel-content {
    background: var(--bg-primary, white);
    border-radius: 0 0 8px 8px;
    padding: 0;
  }

  .info-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color, #ddd);
    background: var(--bg-secondary, #f8f9fa);
    padding: 0 8px;
    overflow-x: auto;
  }

  .info-tab {
    padding: 10px 16px;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    color: #666;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .info-tab:hover {
    color: #333;
    background: rgba(0, 0, 0, 0.03);
  }

  .info-tab.active {
    color: #232d4b;
    border-bottom-color: #E57200;
    font-weight: 600;
  }

  .info-pane {
    display: none;
    padding: 16px;
    font-size: 13px;
    line-height: 1.5;
  }

  .info-pane.active {
    display: block;
  }

  .info-pane ol,
  .info-pane ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  .info-pane li {
    margin: 6px 0;
  }

  .info-pane p {
    margin: 0;
  }

  [data-theme="dark"] #about-simulation-details {
    background: var(--bg-secondary, #2d2d2d);
    border-color: var(--border-color, #444);
  }

  [data-theme="dark"] #about-simulation-details summary {
    background: var(--bg-secondary, #2d2d2d);
  }

  [data-theme="dark"] .info-panel-content {
    background: var(--bg-primary, #1a1a1a);
  }

  [data-theme="dark"] .info-tabs {
    background: var(--bg-secondary, #2d2d2d);
    border-color: var(--border-color, #444);
  }

  [data-theme="dark"] .info-tab {
    color: #999;
  }

  [data-theme="dark"] .info-tab:hover {
    color: #ddd;
    background: rgba(255, 255, 255, 0.05);
  }

  [data-theme="dark"] .info-tab.active {
    color: #e8e8e8;
    border-bottom-color: #ff9933;
  }

  /* ========================================================================
     Phase 1: Two-Column Desktop Layout
     ======================================================================== */
  .simulation-layout {
    display: flex;
    flex-direction: column;
    max-width: 1400px;
    margin: 0 auto;
    padding: 8px;
    gap: 16px;
  }

  @media (min-width: 992px) {
    .simulation-layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      grid-template-rows: auto auto;
      gap: 16px;
      align-items: start;
    }
    .controls-panel {
      grid-column: 1;
      grid-row: 1 / 3; /* span both rows */
    }
    .visualization-panel {
      grid-column: 2;
      grid-row: 1;
    }
    .controls-panel-inner {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }

  /* Wide desktop: 2-column controls below canvas height */
  @media (min-width: 1200px) {
    .simulation-layout {
      grid-template-columns: 380px 1fr;
    }
  }

  /* Bottom sections wrapper - uses grid placement on desktop */
  .bottom-sections-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }

  @media (min-width: 992px) {
    .bottom-sections-wrapper {
      grid-column: 2; /* under the canvas */
      grid-row: 2;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      align-items: start;
      margin-top: 0;
    }
  }

  /* On mobile, bottom sections are moved into drawer via JS */
  @media (max-width: 991px) {
    .bottom-sections-wrapper {
      padding: 0;
      margin-top: 0;
    }
  }

  .controls-panel {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: visible;
  }

  @media (min-width: 992px) {
    .controls-panel {
      padding-right: 16px;
      border-right: 2px solid var(--border-color, #d0d0d0);
      box-shadow: 4px 0 12px rgba(0, 0, 0, 0.06);
      overflow: visible;
    }
    [data-theme="dark"] .controls-panel {
      border-right-color: var(--border-color, #555);
      box-shadow: 4px 0 12px rgba(0, 0, 0, 0.3);
    }
  }

  .visualization-panel {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  @media (min-width: 992px) {
    .visualization-panel #lozenge-canvas,
    .visualization-panel #three-container {
      width: 100%;
      max-width: none;
      height: 70vh;
      max-height: 800px;
      margin: 0;
    }
  }

  /* ========================================================================
     Phase 2: Collapsible Accordion Sections
     ======================================================================== */
  details.control-section {
    display: block;
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--bg-secondary, #f5f5f5);
    overflow: visible;
    margin: 0;
  }

  /* Non-details control-section (like stats row) */
  div.control-section {
    display: block;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--bg-secondary, #f5f5f5);
  }

  .control-section summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    font-family: "franklingothic-demi", Arial, sans-serif;
    font-size: 15px;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0.3px;
    color: var(--text-primary, #333);
    cursor: pointer;
    user-select: none;
    list-style: none;
    background: var(--bg-secondary, #f5f5f5);
    transition: background 0.15s;
  }

  .control-section summary::-webkit-details-marker {
    display: none;
  }

  .control-section summary::after {
    content: '';
    width: 8px;
    height: 8px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.2s;
    opacity: 0.6;
  }

  .control-section[open] summary::after {
    transform: rotate(45deg);
  }

  .control-section summary:hover {
    background: rgba(229, 114, 0, 0.08);
  }

  .control-section-content {
    padding: 12px;
    border-top: 1px solid var(--border-color, #e0e0e0);
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-x: visible;
  }

  .control-section .control-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Form labels - consistent 14px */
  .control-section label,
  .control-section .param-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary, #555);
  }

  [data-theme="dark"] .control-section label,
  [data-theme="dark"] .control-section .param-label {
    color: var(--text-secondary, #aaa);
  }

  [data-theme="dark"] details.control-section,
  [data-theme="dark"] div.control-section {
    background: var(--bg-secondary, #2d2d2d);
    border-color: var(--border-color, #444);
  }

  [data-theme="dark"] .control-section summary {
    background: var(--bg-secondary, #2d2d2d);
    color: var(--text-primary, #e8e8e8);
  }

  [data-theme="dark"] .control-section summary:hover {
    background: rgba(255, 153, 51, 0.1);
  }

  [data-theme="dark"] .control-section-content {
    border-color: var(--border-color, #444);
  }

  /* ========================================================================
     Phase 3: Visual Enhancements - Palette Picker Grid
     ======================================================================== */
  .palette-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 6px;
    max-height: 140px;
    overflow-y: auto;
    padding: 4px;
    margin-top: 8px;
  }

  .palette-item {
    display: flex;
    flex-wrap: wrap;
    width: 44px;
    height: 28px;
    border: 2px solid var(--border-color, #d0d0d0);
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.1s;
  }

  .palette-item:hover {
    transform: scale(1.08);
    z-index: 1;
  }

  .palette-item.active {
    border-color: var(--accent-color, #e57200);
    border-width: 2px;
    box-shadow: 0 0 0 2px rgba(229, 114, 0, 0.3);
  }

  .palette-item .swatch {
    width: 33.33%;
    height: 100%;
  }

  [data-theme="dark"] .palette-item {
    border-color: #555;
  }

  [data-theme="dark"] .palette-item.active {
    border-color: var(--accent-color, #ff9933);
  }

  /* ========================================================================
     Phase 3: Floating Action Buttons (Mobile)
     ======================================================================== */
  .fab-group {
    display: none;
    position: fixed;
    bottom: 80px;
    right: 16px;
    z-index: 1000;
    flex-direction: row;
    gap: 10px;
    align-items: center;
  }

  @media (max-width: 991px) {
    .fab-group {
      display: flex;
    }
  }

  .fab-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #555;
    color: white;
    border: none;
    font-size: 18px;
    cursor: pointer;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
    transition: transform 0.15s, box-shadow 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab-btn:hover {
    transform: scale(1.1);
  }

  .fab-btn:active {
    transform: scale(0.95);
  }

  .fab-btn:disabled {
    background: #999;
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Primary FAB (Sample) - larger and orange */
  .fab-btn.fab-primary {
    width: 56px;
    height: 56px;
    font-size: 24px;
    background: linear-gradient(135deg, #E57200, #f08c30);
    box-shadow: 0 4px 12px rgba(229, 114, 0, 0.4);
  }

  .fab-btn.fab-primary:hover {
    box-shadow: 0 6px 16px rgba(229, 114, 0, 0.5);
  }

  .fab-btn.fab-primary:disabled {
    background: #999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  /* Secondary FABs - navy blue */
  .fab-btn.fab-secondary {
    background: linear-gradient(135deg, #232D4B, #3a4a6b);
  }

  .fab-btn.fab-secondary:disabled {
    background: #888;
  }

  /* ========================================================================
     Keyboard Shortcuts Help Modal
     ======================================================================== */
  .keyboard-help-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 2000;
    align-items: center;
    justify-content: center;
  }

  .keyboard-help-modal.visible {
    display: flex;
  }

  .keyboard-help-content {
    background: var(--bg-primary, white);
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .keyboard-help-content h3 {
    margin: 0 0 16px 0;
    font-family: "franklingothic-demi", Arial, sans-serif;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .keyboard-help-content table {
    width: 100%;
    border-collapse: collapse;
  }

  .keyboard-help-content td {
    padding: 8px 4px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    font-size: 13px;
  }

  .keyboard-help-content kbd {
    display: inline-block;
    background: #e8e8e8;
    border: 1px solid #bbb;
    border-radius: 4px;
    padding: 2px 8px;
    font-family: monospace;
    font-size: 12px;
    min-width: 24px;
    text-align: center;
    color: #333;
    box-shadow: 0 1px 0 #999;
  }

  [data-theme="dark"] .keyboard-help-content kbd {
    background: #444;
    border-color: #666;
    color: #e8e8e8;
    box-shadow: 0 1px 0 #222;
  }

  .keyboard-help-content .close-btn {
    margin-top: 16px;
    width: 100%;
    padding: 10px;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #d0d0d0);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  }

  [data-theme="dark"] .keyboard-help-content {
    background: var(--bg-primary, #1a1a1a);
  }

  /* ========================================================================
     Phase 1: Mobile Bottom Sheet Drawer
     ======================================================================== */
  @media (max-width: 991px) {
    .controls-panel {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--bg-primary, #fff);
      border-top: 1px solid var(--border-color, #e0e0e0);
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
      z-index: 900;
      max-height: 70vh;
      transform: translateY(calc(100% - 60px));
      transition: transform 0.3s ease-out;
      padding: 0;
      overflow: hidden;
    }

    .controls-panel.expanded {
      transform: translateY(0);
    }

    .controls-panel-inner {
      max-height: calc(70vh - 60px);
      overflow-y: auto;
      padding: 0 12px 20px;
    }

    .drawer-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 60px;
      cursor: grab;
      flex-shrink: 0;
    }

    .drawer-handle:active {
      cursor: grabbing;
    }

    .drawer-handle-bar {
      width: 40px;
      height: 4px;
      background: var(--border-color, #ccc);
      border-radius: 2px;
    }

    .drawer-handle-hint {
      position: absolute;
      font-size: 11px;
      color: #888;
      margin-top: 24px;
    }

    .controls-panel.expanded .drawer-handle-hint {
      display: none;
    }

    [data-theme="dark"] .controls-panel {
      background: var(--bg-primary, #1a1a1a);
      border-color: var(--border-color, #444);
    }

    .visualization-panel {
      padding-bottom: 70px;
    }

    .visualization-panel #lozenge-canvas,
    .visualization-panel #three-container {
      /* Fixed height for iOS - vh units cause resize issues with Safari chrome */
      height: 400px;
    }
  }

  @media (min-width: 992px) {
    .drawer-handle {
      display: none;
    }
    .controls-panel-inner {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      overflow: visible;
    }
  }

  /* Ensure buttons can shrink and wrap properly */
  .control-section button,
  .control-row button {
    flex-shrink: 1;
    min-width: 0;
    white-space: nowrap;
  }

  /* ========================================================================
     Issue 9: Additional Mobile Responsiveness
     ======================================================================== */
  @media (max-width: 768px) {
    .simulation-layout {
      padding: 4px;
    }

    /* Touch-friendly accordion headers */
    .control-section summary {
      padding: 14px 16px;
      min-height: 48px;
      font-size: 13px;
    }

    .control-section-content {
      padding: 12px;
    }

    .control-row {
      gap: 8px;
    }

    /* Drawing tools in grid layout */
    .tool-toggle {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      width: 100%;
      border: none !important;
    }

    .tool-toggle button {
      min-width: 44px;
      min-height: 44px;
      padding: 8px;
      border: 1px solid var(--border-color, #ddd) !important;
      border-radius: 6px !important;
    }

    .tool-toggle button.active {
      background: #232D4B !important;
      color: white !important;
      border-color: #232D4B !important;
    }

    /* Smaller param inputs on mobile */
    .param-input {
      width: 50px;
      height: 36px;
      font-size: 14px;
    }

    /* Compact export groups */
    .export-group {
      flex-wrap: wrap;
    }

    .export-group-label {
      width: 100%;
      margin-bottom: 4px;
    }

    /* Info tabs scroll on mobile */
    .info-tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .info-tab {
      padding: 10px 12px;
      font-size: 12px;
    }
  }

  @media (max-width: 480px) {
    /* Very small screens */
    .control-section summary {
      padding: 12px 14px;
      min-height: 44px;
      font-size: 12px;
    }

    .control-section-content {
      padding: 10px;
      gap: 10px;
    }

    .btn-action,
    .btn-secondary-action {
      padding: 10px 14px;
      font-size: 13px;
      width: 100%;
    }

    .btn-utility,
    .btn-outline {
      padding: 8px 12px;
      font-size: 12px;
    }

    /* Stack main action buttons vertically */
    #startStopBtn,
    #cftpBtn {
      flex: 1 1 100% !important;
    }

    /* Control row stacks */
    .control-row {
      flex-wrap: wrap;
    }

    /* Zoom overlay - bottom left on small screens */
    #zoom-overlay {
      bottom: 12px !important;
      left: 12px !important;
    }

    /* Stats bar compact */
    .stats-bar {
      font-size: 11px;
      padding: 6px 10px;
      gap: 6px;
    }

    .stats-bar .stat-divider {
      margin: 0 2px;
    }
  }

  /* ========================================================================
     Issue 3: Drawing Tool Labels
     ======================================================================== */
  .tool-btn-labeled {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 10px;
    min-width: 48px;
    gap: 2px;
  }

  .tool-btn-labeled .tool-icon {
    font-size: 16px;
    line-height: 1;
  }

  .tool-btn-labeled .tool-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    opacity: 0.8;
  }

  .tool-toggle .tool-btn-labeled.active .tool-label {
    opacity: 1;
  }

  /* ========================================================================
     Issue 1: Validity Status Indicator
     ======================================================================== */
  .validity-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .validity-status.status-empty {
    background-color: rgba(108, 117, 125, 0.1);
    color: #6c757d;
    border: 1px solid rgba(108, 117, 125, 0.2);
  }

  .validity-status.status-invalid {
    background-color: rgba(220, 53, 69, 0.1);
    color: #dc3545;
    border: 1px solid rgba(220, 53, 69, 0.25);
  }

  .validity-status.status-valid {
    background-color: rgba(40, 167, 69, 0.1);
    color: #28a745;
    border: 1px solid rgba(40, 167, 69, 0.25);
  }

  .validity-status .status-icon {
    font-size: 14px;
  }

  [data-theme="dark"] .validity-status.status-empty {
    background-color: rgba(108, 117, 125, 0.2);
    border-color: rgba(108, 117, 125, 0.3);
  }

  [data-theme="dark"] .validity-status.status-invalid {
    background-color: rgba(220, 53, 69, 0.15);
    border-color: rgba(220, 53, 69, 0.3);
  }

  [data-theme="dark"] .validity-status.status-valid {
    background-color: rgba(40, 167, 69, 0.15);
    border-color: rgba(40, 167, 69, 0.3);
  }

  /* ========================================================================
     Issue 2: Button Hierarchy Refinement
     ======================================================================== */
  /* Primary CTA - orange gradient */
  .btn-primary-cta {
    background: linear-gradient(135deg, #E57200 0%, #f08c30 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 5px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(229, 114, 0, 0.3);
  }

  .btn-primary-cta:hover:not(:disabled) {
    background: linear-gradient(135deg, #d16610 0%, #E57200 100%);
    box-shadow: 0 3px 8px rgba(229, 114, 0, 0.4);
    transform: translateY(-1px);
  }

  .btn-primary-cta:disabled {
    background: #ccc;
    box-shadow: none;
    cursor: not-allowed;
  }

  /* Secondary CTA - navy */
  .btn-secondary-cta {
    background: linear-gradient(135deg, #232D4B 0%, #3a4a6b 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 5px;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary-cta:hover:not(:disabled) {
    background: linear-gradient(135deg, #1a2238 0%, #232D4B 100%);
  }

  .btn-secondary-cta:disabled {
    background: #8a9ab8;
    cursor: not-allowed;
  }

  /* Outline button */
  .btn-outline {
    background: transparent;
    color: #232D4B;
    border: 1px solid #232D4B;
    padding: 7px 14px;
    border-radius: 5px;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-outline:hover:not(:disabled) {
    background: #232D4B;
    color: white;
  }

  [data-theme="dark"] .btn-outline {
    color: #b0c4de;
    border-color: #b0c4de;
  }

  [data-theme="dark"] .btn-outline:hover:not(:disabled) {
    background: #b0c4de;
    color: #1a1a1a;
  }

  /* ========================================================================
     Issue 10: Zoom Controls - Bottom Right with Container
     ======================================================================== */
  #zoom-overlay {
    position: absolute !important;
    bottom: 16px !important;
    left: 16px !important;
    top: auto !important;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    border: 1px solid rgba(0,0,0,0.08);
  }

  [data-theme="dark"] #zoom-overlay {
    background: rgba(35, 35, 35, 0.95);
    border-color: rgba(255,255,255,0.1);
  }

  #zoom-overlay .view-toggle {
    background: transparent !important;
    border: none !important;
    border-width: 0 !important;
    padding: 0;
    gap: 2px;
    box-shadow: none !important;
    overflow: visible;
  }

  #zoom-overlay .view-toggle::before,
  #zoom-overlay .view-toggle::after {
    display: none !important;
  }

  #zoom-overlay button {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none !important;
    border-radius: 6px;
    background: transparent !important;
    font-size: 18px;
    cursor: pointer;
    transition: background 0.15s;
    color: var(--text-primary, #333);
    box-shadow: none !important;
  }

  #zoom-overlay button:hover {
    background: rgba(0, 0, 0, 0.08) !important;
  }

  #zoom-overlay button:active {
    background: rgba(0, 0, 0, 0.12) !important;
  }

  #zoom-overlay button.active {
    background: transparent !important;
    color: var(--text-primary, #333);
  }

  [data-theme="dark"] #zoom-overlay button {
    color: var(--text-primary, #e8e8e8);
  }

  [data-theme="dark"] #zoom-overlay button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* ========================================================================
     Issue 4: Canvas Toolbar Improvements with Tooltips
     ======================================================================== */
  #view-overlay {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 6px 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    border: 1px solid rgba(0,0,0,0.08);
  }

  [data-theme="dark"] #view-overlay {
    background: rgba(35, 35, 35, 0.95);
    border-color: rgba(255,255,255,0.1);
  }

  #view-overlay button[title]::after {
    content: attr(title);
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 6px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    font-size: 11px;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s;
    z-index: 1000;
  }

  #view-overlay button[title]:hover::after {
    opacity: 1;
  }

  #view-overlay .view-toggle {
    background: transparent;
    border: none;
    padding: 0;
    gap: 2px;
  }

  #view-overlay button {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    border: 1px solid var(--border-color, #ddd);
    font-size: 13px;
  }

  /* ========================================================================
     Issue 5: Accordion Panel Enhancement
     ======================================================================== */
  .control-section summary {
    background: linear-gradient(to bottom, var(--bg-secondary, #f8f9fa), var(--bg-secondary, #f5f5f5));
    border-bottom: 1px solid transparent;
  }

  .control-section[open] summary {
    border-bottom-color: var(--border-color, #e0e0e0);
    border-radius: 8px 8px 0 0;
  }

  .control-section summary::before {
    content: '';
    width: 6px;
    height: 6px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.2s;
    margin-right: 8px;
    opacity: 0.5;
  }

  .control-section[open] summary::before {
    transform: rotate(45deg);
  }

  .control-section summary::after {
    display: none;
  }

  /* ========================================================================
     Issue 8: Status Bar Enhancement
     ======================================================================== */
  .stats-inline {
    background: linear-gradient(to bottom, var(--bg-secondary, #f8f9fa), var(--bg-primary, #fff));
    padding: 10px 14px;
    border-radius: 6px;
    border: 1px solid var(--border-color, #e0e0e0);
  }

  .stats-inline .stat {
    padding: 4px 12px;
    background: var(--bg-primary, white);
    border-radius: 4px;
    border: 1px solid var(--border-color, #e8e8e8);
  }

  .stats-inline .stat-label {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-right: 6px;
  }

  .stats-inline .stat-value {
    font-family: 'SF Mono', Monaco, 'Consolas', monospace;
    font-weight: 700;
  }

  [data-theme="dark"] .stats-inline {
    background: linear-gradient(to bottom, var(--bg-secondary, #2d2d2d), var(--bg-primary, #1a1a1a));
  }

  [data-theme="dark"] .stats-inline .stat {
    background: var(--bg-secondary, #2d2d2d);
    border-color: var(--border-color, #444);
  }

  /* ========================================================================
     Phase 6: Tooltips for Complex Options
     ======================================================================== */
  [data-tooltip] {
    position: relative;
  }

  [data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 10px;
    background: rgba(35, 45, 75, 0.95);
    color: white;
    font-size: 11px;
    font-weight: normal;
    text-transform: none;
    letter-spacing: normal;
    border-radius: 4px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    z-index: 1001;
    margin-bottom: 6px;
    max-width: 250px;
    white-space: normal;
    text-align: center;
    line-height: 1.3;
  }

  [data-tooltip]:hover::after,
  [data-tooltip]:focus::after {
    opacity: 1;
  }

  /* ========================================================================
     Phase 3 & 6: Button Styling Consistency - Three-Tier Hierarchy
     ======================================================================== */

  /* Primary buttons (main actions) - solid orange fill */
  .btn-action {
    background: linear-gradient(135deg, #E57200, #f08c30) !important;
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 10px 20px !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    box-shadow: 0 2px 4px rgba(229, 114, 0, 0.3);
    transition: all 0.15s ease;
  }

  .btn-action:hover:not(:disabled) {
    background: linear-gradient(135deg, #c96300, #E57200) !important;
    box-shadow: 0 3px 6px rgba(229, 114, 0, 0.4);
    transform: translateY(-1px);
  }

  .btn-action:disabled {
    background: #ccc !important;
    box-shadow: none;
    cursor: not-allowed;
  }

  /* Secondary buttons (important but not primary) - solid navy fill */
  .btn-secondary-action {
    background: linear-gradient(135deg, #232D4B, #3a4a6b) !important;
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 10px 20px !important;
    font-weight: 500 !important;
    font-size: 14px !important;
    box-shadow: 0 2px 4px rgba(35, 45, 75, 0.3);
    transition: all 0.15s ease;
  }

  .btn-secondary-action:hover:not(:disabled) {
    background: linear-gradient(135deg, #1a2238, #232D4B) !important;
    box-shadow: 0 3px 6px rgba(35, 45, 75, 0.4);
    transform: translateY(-1px);
  }

  .btn-secondary-action:disabled {
    background: #8a9ab8 !important;
    box-shadow: none;
    cursor: not-allowed;
  }

  /* Tertiary buttons (utility) - outlined style */
  .btn-utility,
  .btn-outline {
    background: var(--bg-primary, white) !important;
    color: var(--text-primary, #333) !important;
    border: 1px solid var(--border-color, #d0d0d0) !important;
    border-radius: 4px !important;
    padding: 8px 16px !important;
    font-weight: 500 !important;
    font-size: 13px !important;
    transition: all 0.15s ease;
  }

  .btn-utility:hover:not(:disabled),
  .btn-outline:hover:not(:disabled) {
    background: var(--bg-secondary, #f5f5f5) !important;
    border-color: #999 !important;
  }

  .btn-utility:disabled,
  .btn-outline:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  [data-theme="dark"] .btn-utility,
  [data-theme="dark"] .btn-outline {
    background: var(--bg-secondary, #2d2d2d) !important;
    border-color: var(--border-color, #555) !important;
    color: var(--text-primary, #e8e8e8) !important;
  }

  [data-theme="dark"] .btn-utility:hover:not(:disabled),
  [data-theme="dark"] .btn-outline:hover:not(:disabled) {
    background: #3d3d3d !important;
    border-color: #777 !important;
  }

  /* ========================================================================
     Phase 6: WCAG AA Contrast Fixes
     ======================================================================== */
  .control-group-title,
  .control-section summary {
    color: #4a4a4a;
  }

  [data-theme="dark"] .control-group-title,
  [data-theme="dark"] .control-section summary {
    color: #d0d0d0;
  }

  .stats-inline .stat-label {
    color: #666;
  }

  [data-theme="dark"] .stats-inline .stat-label {
    color: #aaa;
  }

  /* ========================================================================
     Dark Mode Contrast Improvements (WCAG AA)
     ======================================================================== */

  /* Form labels - increase contrast */
  [data-theme="dark"] .control-section label,
  [data-theme="dark"] .control-row label,
  [data-theme="dark"] .param-label {
    color: #c0c0c0 !important;
  }

  /* Secondary/helper text - more visible */
  [data-theme="dark"] .control-section p,
  [data-theme="dark"] .helper-text,
  [data-theme="dark"] small {
    color: #999 !important;
  }

  /* Input field styling - better borders and backgrounds */
  [data-theme="dark"] input[type="text"],
  [data-theme="dark"] input[type="number"],
  [data-theme="dark"] select,
  [data-theme="dark"] .param-input {
    background: #2a2a2a !important;
    border: 1px solid #555 !important;
    color: #e0e0e0 !important;
  }

  [data-theme="dark"] input[type="text"]:focus,
  [data-theme="dark"] input[type="number"]:focus,
  [data-theme="dark"] select:focus,
  [data-theme="dark"] .param-input:focus {
    border-color: #777 !important;
    outline: 2px solid rgba(229, 114, 0, 0.4);
  }

  /* Disabled button contrast fix for dark mode */
  [data-theme="dark"] .btn-action:disabled {
    background: #4a4a4a !important;
    color: #888 !important;
  }

  [data-theme="dark"] .btn-secondary-action:disabled {
    background: #3a3a3a !important;
    color: #777 !important;
  }

  /* Checkbox visibility - add clear border */
  [data-theme="dark"] input[type="checkbox"] {
    accent-color: #ff9933;
    border: 2px solid #666 !important;
    background: #2a2a2a;
  }

  /* Slider track - more visible in dark mode */
  [data-theme="dark"] input[type="range"] {
    background: #555 !important;
  }

  [data-theme="dark"] input[type="range"]::-webkit-slider-runnable-track {
    background: #555;
  }

  [data-theme="dark"] input[type="range"]::-moz-range-track {
    background: #555;
  }

  /* Canvas control buttons (zoom +/-) - increase contrast */
  [data-theme="dark"] #zoom-overlay button,
  [data-theme="dark"] .view-overlay button {
    background: #3a3a3a !important;
    border-color: #666 !important;
    color: #e0e0e0 !important;
  }

  [data-theme="dark"] #zoom-overlay button:hover,
  [data-theme="dark"] .view-overlay button:hover {
    background: #4a4a4a !important;
    border-color: #888 !important;
  }

  /* View toggle buttons in dark mode */
  [data-theme="dark"] .view-toggle {
    border-color: #666 !important;
  }

  [data-theme="dark"] .view-toggle button {
    background: #2d2d2d !important;
    color: #c0c0c0 !important;
  }

  [data-theme="dark"] .view-toggle button.active {
    background: #4a90d9 !important;
    color: white !important;
  }

  [data-theme="dark"] .view-toggle button:hover:not(.active) {
    background: #3d3d3d !important;
  }

  /* Tool toggle buttons in dark mode */
  [data-theme="dark"] .tool-toggle {
    border-color: #666 !important;
  }

  [data-theme="dark"] .tool-toggle button {
    background: #2d2d2d !important;
    color: #c0c0c0 !important;
    border-color: #555 !important;
  }

  [data-theme="dark"] .tool-toggle button.active {
    background: #4a4a4a !important;
    color: #fff !important;
  }

  /* Stats bar in dark mode */
  [data-theme="dark"] .stats-bar {
    background: #252525 !important;
    color: #c0c0c0 !important;
  }

  [data-theme="dark"] .stats-bar .stat-label {
    color: #999 !important;
  }

  [data-theme="dark"] .stats-bar .stat-value {
    color: #e0e0e0 !important;
  }

  /* ========================================================================
     Phase 5: Export Section Grouping
     ======================================================================== */
  .export-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 0;
  }

  .export-group-label {
    font-size: 11px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    min-width: 45px;
    flex-shrink: 0;
  }

  [data-theme="dark"] .export-group-label {
    color: #aaa;
  }

  .export-divider {
    width: 100%;
    height: 1px;
    background: var(--border-color, #e0e0e0);
    margin: 4px 0;
  }

  /* Legacy control-group styles within new sections */
  .control-section .control-group {
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
  }

  .control-section .control-group-title {
    display: none;
  }

  /* ========================================================================
     Input Field Standardization
     ======================================================================== */

  /* Small numeric inputs (a, b, c, q values) */
  .param-input,
  .control-section input[type="number"] {
    width: 60px;
    height: 34px;
    padding: 4px 8px;
    border: 1px solid var(--border-color, #ccc);
    border-radius: 4px;
    font-size: 14px;
    font-family: 'SF Mono', Monaco, monospace;
    text-align: center;
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
    box-sizing: border-box;
  }

  .param-input:focus,
  .control-section input[type="number"]:focus {
    outline: none;
    border-color: #E57200;
    box-shadow: 0 0 0 2px rgba(229, 114, 0, 0.2);
  }

  [data-theme="dark"] .param-input,
  [data-theme="dark"] .control-section input[type="number"] {
    background: var(--bg-secondary, #2d2d2d);
    border-color: var(--border-color, #555);
    color: var(--text-primary, #e8e8e8);
  }

  /* Param group - hexagon inputs alignment */
  .param-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .param-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary, #555);
    min-width: 12px;
  }

  /* Medium inputs (Speed value, sample counts) */
  .control-section input.medium-input,
  #speedInput,
  #avgSamplesInput,
  #fluctuationSamplesInput,
  #minLoopInput {
    width: 90px !important;
  }

  /* Full-width dropdowns */
  .control-section select {
    width: 100%;
    height: auto;
    min-height: 36px;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #ccc);
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.4;
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
    cursor: pointer;
    box-sizing: border-box;
  }

  .control-section select:focus {
    outline: none;
    border-color: #E57200;
  }

  [data-theme="dark"] .control-section select {
    background: var(--bg-secondary, #2d2d2d);
    border-color: var(--border-color, #555);
    color: var(--text-primary, #e8e8e8);
  }

  /* ========================================================================
     Checkbox + Label Spacing
     ======================================================================== */
  .control-section label:has(input[type="checkbox"]) {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
  }

  .control-section input[type="checkbox"] {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: #E57200;
  }

  /* ========================================================================
     Speed Slider Alignment
     ======================================================================== */
  .speed-control-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .control-section input[type="range"] {
    flex: 1;
    min-width: 60px;
    max-width: 100px;
    height: 6px;
    accent-color: #E57200;
  }

  /* ========================================================================
     Status Bar - Simple Horizontal Line Under Canvas
     ======================================================================== */
  .stats-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 12px;
    color: var(--text-secondary, #666);
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 4px;
    margin-top: 8px;
  }

  .stats-bar .stat-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .stats-bar .stat-label {
    font-weight: 500;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.3px;
    color: var(--text-secondary, #888);
  }

  .stats-bar .stat-value {
    font-weight: 600;
    font-family: 'SF Mono', Monaco, monospace;
    color: var(--text-primary, #333);
  }

  .stats-bar .stat-divider {
    color: var(--border-color, #ccc);
    margin: 0 4px;
  }

  [data-theme="dark"] .stats-bar {
    background: var(--bg-secondary, #2a2a2a);
  }

  [data-theme="dark"] .stats-bar .stat-label {
    color: #999;
  }

  [data-theme="dark"] .stats-bar .stat-value {
    color: #e8e8e8;
  }

  [data-theme="dark"] .stats-bar .stat-divider {
    color: #555;
  }

  /* ========================================================================
     Shape of the Month Button - UVA Orange, Rectangular
     ======================================================================== */
  #shapeOfMonthBtn {
    background: var(--bg-primary, white) !important;
    color: #E57200 !important;
    border: 1px dashed #E57200 !important;
    border-radius: 4px !important;
    padding: 6px 14px !important;
    font-weight: 500 !important;
    font-size: 11px !important;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  #shapeOfMonthBtn:hover {
    background: #fff8f0 !important;
    border-style: solid !important;
  }

  [data-theme="dark"] #shapeOfMonthBtn {
    background: var(--bg-secondary, #2d2d2d) !important;
    color: #ff9933 !important;
    border-color: #ff9933 !important;
  }

  [data-theme="dark"] #shapeOfMonthBtn:hover {
    background: #3d3020 !important;
  }

  /* ========================================================================
     Sampling Buttons - Side by Side Layout
     ======================================================================== */
  #startStopBtn,
  #cftpBtn {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
  }

  /* ========================================================================
     WEIGHTS Matrix Grid Alignment
     ======================================================================== */
  #periodicWeightsMatrix {
    display: grid !important;
    gap: 8px !important;
    justify-content: start;
  }

  #periodicWeightsMatrix input {
    width: 60px !important;
    height: 32px !important;
    text-align: center;
  }

  /* ========================================================================
     Permute Button Alignment
     ======================================================================== */
  #permuteColors {
    height: 32px !important;
    padding: 0 12px !important;
    display: inline-flex;
    align-items: center;
  }

  /* ========================================================================
     Drawing Tools Icon Buttons - Uniform Size
     ======================================================================== */
  .tool-toggle button {
    min-width: 40px;
    min-height: 40px;
    padding: 4px 8px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  .tool-toggle .tool-btn-labeled {
    min-width: 48px;
    padding: 6px 8px;
  }

  .tool-toggle .tool-btn-labeled .tool-icon {
    font-size: 16px;
    line-height: 1;
  }

  .tool-toggle .tool-btn-labeled .tool-label {
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    opacity: 0.8;
  }

  .tool-toggle .tool-btn-labeled.active .tool-label {
    opacity: 1;
  }
</style>

<script src="/js/colorschemes.js"></script>
<script src="/js/three.min.js"></script>
<script src="/js/OrbitControls.js"></script>
<script>
// Dynamic WASM loader: use threaded version if SharedArrayBuffer is available
window.LOZENGE_THREADED = typeof SharedArrayBuffer !== 'undefined';
// Detect Firefox - force CPU due to WebGPU IPC overhead issues (Bug 1870699)
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
window.LOZENGE_WEBGPU = !isFirefox && !!navigator.gpu;
console.log('Will load WASM:', window.LOZENGE_THREADED ? 'threaded' : 'non-threaded');
console.log('WebGPU:', window.LOZENGE_WEBGPU ? 'available' : 'unavailable', isFirefox ? '(Firefox: forced CPU)' : '');
</script>
<script>
// Load appropriate WASM module
document.write('<script src="/js/2025-11-28-ultimate-lozenge' + (window.LOZENGE_THREADED ? '-threaded' : '') + '.js"><\/script>');
// Load WebGPU engine if available
if (window.LOZENGE_WEBGPU) {
    document.write('<script src="/js/webgpu-lozenge-engine.js"><\/script>');
}
</script>

<!-- Skip to main content for accessibility -->
<a href="#lozenge-canvas" class="skip-link">Skip to simulation canvas</a>

<!-- Two-Column Layout Container -->
<div class="simulation-layout">

<!-- Left: Controls Panel -->
<aside class="controls-panel" id="controlsPanel">
  <!-- Mobile drawer handle -->
  <div class="drawer-handle" id="drawerHandle">
    <div class="drawer-handle-bar"></div>
    <span class="drawer-handle-hint">Swipe up for controls</span>
  </div>

  <div class="controls-panel-inner">

    <!-- Section 1: Region (open by default) -->
    <details class="control-section" open>
      <summary>Region</summary>
      <div class="control-section-content">
        <div class="control-row">
          <button id="shapeOfMonthBtn" aria-label="Load shape of the month preset">Shape of the Month</button>
        </div>
        <div class="control-row">
          <button id="hexagonBtn" class="btn-outline" aria-label="Create hexagonal region">Hexagon</button>
          <span class="param-group"><label for="hexAInput" class="param-label">a</label><input type="number" class="param-input" id="hexAInput" value="4" min="1" max="30" aria-label="Hexagon side a"></span>
          <span class="param-group"><label for="hexBInput" class="param-label">b</label><input type="number" class="param-input" id="hexBInput" value="3" min="1" max="30" aria-label="Hexagon side b"></span>
          <span class="param-group"><label for="hexCInput" class="param-label">c</label><input type="number" class="param-input" id="hexCInput" value="5" min="1" max="30" aria-label="Hexagon side c"></span>
        </div>
        <div class="control-row">
          <select id="letterSelect" style="padding: 4px 8px; font-size: 12px; flex: 1;" aria-label="Select preset shape">
            <option value="">Presets</option>
          </select>
        </div>
        <div class="control-row" style="border-top: 1px solid var(--border-color, #e0e0e0); padding-top: 10px; margin-top: 4px;">
          <button id="doubleMeshBtn" class="btn-utility" title="Double the region size (U)" aria-label="Scale up region by doubling size">Scale Up</button>
          <button id="halveMeshBtn" class="btn-utility" title="Halve the region size" aria-label="Scale down region by halving size">Scale Down</button>
          <button id="clearRegionBtn" class="btn-outline" title="Clear all triangles" aria-label="Clear all triangles from region">Clear</button>
        </div>
      </div>
    </details>

    <!-- Section 2: Sampling (open by default) -->
    <details class="control-section" open>
      <summary>Sampling</summary>
      <div class="control-section-content">
        <div class="control-row">
          <button id="startStopBtn" class="btn-action" disabled aria-label="Start or stop Glauber dynamics simulation">Start Glauber</button>
          <button id="cftpBtn" class="btn-secondary-action" data-tooltip="Exact sample via Coupling From The Past" disabled aria-label="Generate perfect sample using CFTP algorithm">Perfect Sample</button>
          <button id="cftpStopBtn" style="display: none; background: #dc3545; color: white; border-color: #dc3545;" aria-label="Stop CFTP sampling">Stop</button>
        </div>
        <div class="control-row">
          <label for="speedSlider" style="font-size: 12px; color: #666;">Speed</label>
          <input type="range" id="speedSlider" min="0" max="100" value="29" style="width: 80px;" aria-label="Simulation speed slider">
          <input type="number" id="speedInput" class="param-input" value="100" min="1" max="100000000" style="width: 90px;" aria-label="Simulation speed in steps per second">
          <span style="font-size: 11px; color: #888;">/s</span>
        </div>
        <div class="control-row">
          <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #555; cursor: pointer;">
            <input type="checkbox" id="useRandomSweepsCheckbox" aria-label="Enable random sweeps mode"> Random Sweeps
          </label>
          <span class="param-group"><label for="qInput" class="param-label">q</label><input type="number" class="param-input" id="qInput" value="1" min="0" max="10" step="0.01" style="width: 75px;" aria-label="q-volume weight parameter"></span>
        </div>
      </div>
    </details>

    <!-- Section 3: Drawing Tools (open by default) -->
    <details class="control-section" open>
      <summary>Drawing Tools</summary>
      <div class="control-section-content">
        <div class="control-row">
          <div class="tool-toggle" role="group" aria-label="Drawing mode selection">
            <button id="handBtn" class="tool-btn-labeled" title="Pan view (P)" aria-label="Hand tool - Pan view" aria-pressed="false">
              <span class="tool-icon">🤚</span>
              <span class="tool-label">Pan</span>
            </button>
            <button id="drawBtn" class="tool-btn-labeled active" title="Draw triangles (D)" aria-label="Draw tool - Add triangles to region" aria-pressed="true">
              <span class="tool-icon">✏️</span>
              <span class="tool-label">Draw</span>
            </button>
            <button id="eraseBtn" class="tool-btn-labeled" title="Erase triangles (E)" aria-label="Erase tool - Remove triangles from region" aria-pressed="false">
              <span class="tool-icon">🧹</span>
              <span class="tool-label">Erase</span>
            </button>
          </div>
          <div class="tool-toggle" role="group" aria-label="Lasso selection mode">
            <button id="lassoFillBtn" class="tool-btn-labeled" title="Lasso fill (L)" aria-label="Lasso fill - Click points to define polygon to fill" aria-pressed="false">
              <span class="tool-icon">⭕+</span>
              <span class="tool-label">Fill</span>
            </button>
            <button id="lassoEraseBtn" class="tool-btn-labeled" title="Lasso erase" aria-label="Lasso erase - Click points to define polygon to erase" aria-pressed="false">
              <span class="tool-icon">⭕−</span>
              <span class="tool-label">Erase</span>
            </button>
            <button id="lassoSnapBtn" class="tool-btn-labeled active" title="Snap to triangular grid" aria-label="Snap lasso to grid" aria-pressed="true">
              <span class="tool-icon">📐</span>
              <span class="tool-label">Snap</span>
            </button>
          </div>
        </div>
        <div class="control-row">
          <button id="resetBtn" class="btn-outline" aria-label="Clear all triangles from region">Clear</button>
          <button id="undoBtn" class="btn-outline" title="Undo (Ctrl+Z)" aria-label="Undo last action" aria-keyshortcuts="Ctrl+Z">Undo</button>
          <button id="redoBtn" class="btn-outline" title="Redo (Ctrl+Y)" aria-label="Redo last undone action" aria-keyshortcuts="Ctrl+Y">Redo</button>
          <button id="repairBtn" class="btn-outline" data-tooltip="Adds minimal triangles for valid tiling" disabled aria-label="Make region tileable by adding triangles">Make Tileable</button>
        </div>
        <div class="control-row">
          <span id="statusBadge" class="validity-status status-empty" role="status" aria-live="polite">
            <span class="status-icon">○</span>
            <span class="status-text">Empty</span>
          </span>
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; color: #555; margin-left: auto;">
            <input type="checkbox" id="showHoleLabelsCheckbox" checked aria-label="Show hole winding labels"> Hole Labels
          </label>
        </div>
      </div>
    </details>

    <!-- Section 4: Weights (collapsed by default) -->
    <details class="control-section" id="periodic-weights-details">
      <summary>Weights</summary>
      <div class="control-section-content">
        <div class="control-row">
          <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #555; cursor: pointer;">
            <input type="checkbox" id="usePeriodicWeightsCheckbox"> Enable periodic weights
          </label>
        </div>
        <div class="control-row">
          <label for="periodicKSelect" style="font-size: 12px; color: #555;">Period k:</label>
          <select id="periodicKSelect" style="padding: 2px 6px; font-size: 12px;">
            <option value="1">1</option>
            <option value="2" selected>2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
        <div class="control-row" style="flex-direction: column; align-items: flex-start; gap: 6px;">
          <span style="font-size: 12px; color: #555;">Presets:</span>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <button id="preset2x2Btn" class="btn-utility" style="font-size: 11px;">Charlier-Duits-Kuijlaars 2x2</button>
            <span id="duits2x2Container" style="display: none; align-items: center; gap: 4px;">
              <label for="duitsAlpha" style="font-size: 11px; color: #555;">α:</label>
              <input type="number" id="duitsAlpha" value="2" step="0.1" min="0.01" style="width: 50px; padding: 2px 4px; font-size: 11px; border: 1px solid #999; border-radius: 3px;">
              <a href="https://onlinelibrary.wiley.com/doi/full/10.1111/sapm.12339" target="_blank" style="font-size: 11px;">[paper]</a>
            </span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <button id="presetNienhuis3x3Btn" class="btn-utility" style="font-size: 11px;">Nienhuis-Hilhorst-Blöte 3x3</button>
            <span id="nienhuis3x3AlphaContainer" style="display: none; align-items: center; gap: 4px;">
              <label for="nienhuis3x3Alpha" style="font-size: 11px; color: #555;">α:</label>
              <input type="number" id="nienhuis3x3Alpha" value="2" min="0.01" step="0.1" style="width: 60px; padding: 2px 4px; font-size: 11px; border: 1px solid #999; border-radius: 3px;">
              <a href="https://iopscience.iop.org/article/10.1088/0305-4470/17/18/025" target="_blank" style="font-size: 11px;">[paper]</a>
            </span>
          </div>
        </div>
        <div id="periodicWeightsMatrix" style="display: inline-grid; gap: 4px;"></div>
        <div style="font-size: 12px; color: #555;">
          At position (n,j), uses q<sub>n mod k, j mod k</sub> · <strong>Product: <span id="periodicQProduct">1</span></strong>
        </div>
      </div>
    </details>

    <!-- Section 5: Styling (collapsed by default) -->
    <details class="control-section">
      <summary>Styling</summary>
      <div class="control-section-content">
        <!-- Palette selection -->
        <div class="control-row">
          <button id="prev-palette" class="btn-utility" style="padding: 0 10px;" aria-label="Previous color palette">◀</button>
          <select id="palette-select" style="flex: 1; min-width: 100px;" aria-label="Select color palette"></select>
          <button id="next-palette" class="btn-utility" style="padding: 0 10px;" aria-label="Next color palette">▶</button>
          <button id="permuteColors" class="btn-utility" title="Permute colors" aria-label="Permute color order">Permute</button>
        </div>
        <!-- Visual Palette Picker Grid -->
        <div id="palettePickerGrid" class="palette-picker" role="listbox" aria-label="Color palette visual selection"></div>
        <!-- Custom colors -->
        <div class="control-row">
          <button id="customColorsBtn" class="btn-utility" title="Custom colors" aria-label="Toggle custom color pickers">Custom colors</button>
          <div id="customColorPickers" style="display: none; align-items: center; gap: 8px;" role="group" aria-label="Custom color pickers">
            <input type="color" id="customColor1" value="#E57200" title="Color 1" aria-label="Custom lozenge color 1" style="width: 32px; height: 26px; padding: 0; border: 1px solid #999; border-radius: 3px; cursor: pointer;">
            <input type="color" id="customColor2" value="#232D4B" title="Color 2" aria-label="Custom lozenge color 2" style="width: 32px; height: 26px; padding: 0; border: 1px solid #999; border-radius: 3px; cursor: pointer;">
            <input type="color" id="customColor3" value="#F9DCBF" title="Color 3" aria-label="Custom lozenge color 3" style="width: 32px; height: 26px; padding: 0; border: 1px solid #999; border-radius: 3px; cursor: pointer;">
          </div>
          <label for="holeColorPicker" style="font-size: 12px; color: #555;">Holes:</label>
          <input type="color" id="holeColorPicker" value="#FFFFFF" title="Hole color" aria-label="Color for holes in the region" style="width: 32px; height: 26px; padding: 0; border: 1px solid #999; border-radius: 3px; cursor: pointer;">
        </div>
        <!-- Line widths -->
        <div class="control-row" style="border-top: 1px solid var(--border-color, #e0e0e0); padding-top: 10px; margin-top: 4px;">
          <label for="outlineWidthPct" style="font-size: 12px; color: #555;">Outline:</label>
          <input type="number" id="outlineWidthPct" value="0.1" min="0" max="100" step="0.1" class="param-input" style="width: 5em;" aria-label="Outline width percentage">
          <span style="font-size: 11px; color: #888;">%</span>
          <label for="borderWidthPct" style="font-size: 12px; color: #555; margin-left: 8px;">Border:</label>
          <input type="number" id="borderWidthPct" value="1" min="0" max="50" step="0.5" class="param-input" style="width: 5em;" aria-label="Border width percentage">
          <span style="font-size: 11px; color: #888;">%</span>
        </div>
        <div class="control-row">
          <label for="pathWidthPx" style="font-size: 12px; color: #555;">Path:</label>
          <input type="number" id="pathWidthPx" value="2" min="0" max="20" step="0.5" class="param-input" style="width: 5em;" aria-label="Path width in pixels">
          <span style="font-size: 11px; color: #888;">px</span>
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; color: #555; margin-left: 12px;">
            <input type="checkbox" id="showGridCheckbox" checked aria-label="Show grid lines"> Grid
          </label>
        </div>
        <!-- Labels -->
        <div class="control-row">
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; color: #555;">
            <input type="checkbox" id="showBoundaryLengthsCheckbox" aria-label="Show boundary length labels"> Length Labels
          </label>
        </div>
        <span id="labelControls" style="display: none; align-items: center; gap: 4px; flex-wrap: wrap;" role="group" aria-label="Label display settings">
          <label for="labelSizeInput" style="font-size: 11px; color: #888;">size:</label>
          <input type="number" id="labelSizeInput" value="1.0" min="0.3" max="3" step="0.1" style="width: 45px; padding: 2px 4px; font-size: 11px;" aria-label="Label font size multiplier">
          <label for="labelOffsetInput" style="font-size: 11px; color: #888;">offset:</label>
          <input type="number" id="labelOffsetInput" value="1.5" min="0.5" max="5" step="0.1" style="width: 45px; padding: 2px 4px; font-size: 11px;" aria-label="Label offset distance">
          <label style="display: flex; align-items: center; gap: 2px; font-size: 11px; color: #888; cursor: pointer;">
            <input type="checkbox" id="showHoleLengthsCheckbox" checked style="margin: 0;" aria-label="Show hole length labels"> holes
          </label>
        </span>
        <!-- Pan controls (zoom/reset moved to canvas overlay) -->
        <div class="control-row" id="view2DControlsRow" style="border-top: 1px solid var(--border-color, #e0e0e0); padding-top: 10px; margin-top: 4px;">
          <span style="font-size: 11px; color: #666; margin-right: 4px;">Pan:</span>
          <button id="panLeftBtn" class="btn-utility" title="Pan Left" aria-label="Pan view left">←</button>
          <button id="panRightBtn" class="btn-utility" title="Pan Right" aria-label="Pan view right">→</button>
          <button id="panUpBtn" class="btn-utility" title="Pan Up" aria-label="Pan view up">↑</button>
          <button id="panDownBtn" class="btn-utility" title="Pan Down" aria-label="Pan view down">↓</button>
        </div>
        <!-- 3D View Controls (shown only in 3D mode) -->
        <div class="control-row" id="view3DControlsRow" style="display: none;">
          <span style="font-size: 11px; color: #666; margin-right: 4px;">Rotate:</span>
          <button id="rotateLeftBtn" class="btn-utility" title="Rotate Left (3D)" disabled aria-label="Rotate 3D view left">↺</button>
          <button id="rotateRightBtn" class="btn-utility" title="Rotate Right (3D)" disabled aria-label="Rotate 3D view right">↻</button>
          <select id="renderModeSelect" style="display:none;" aria-label="3D render style">
            <option value="standard">Standard</option>
            <option value="lego">LEGO</option>
            <option value="minecraft">Minecraft</option>
          </select>
        </div>
      </div>
    </details>

  </div><!-- end controls-panel-inner -->
</aside>

<!-- Right: Visualization Panel -->
<main class="visualization-panel">
  <!-- Canvas Container with overlay -->
  <div id="canvas-container" style="position: relative;">
    <!-- Zoom controls overlay (left side) -->
    <div id="zoom-overlay" style="position: absolute; top: 8px; left: 8px; z-index: 100; display: flex; flex-direction: column; gap: 4px;">
      <div class="view-toggle" style="flex-direction: column;">
        <button id="zoomInBtn" title="Zoom In (+)" aria-label="Zoom in">+</button>
        <button id="zoomOutBtn" title="Zoom Out (-)" aria-label="Zoom out">−</button>
        <button id="resetViewBtn" title="Reset View (R)" aria-label="Reset view to default">⊙</button>
      </div>
    </div>

    <!-- View Toggle overlay -->
    <div id="view-overlay" style="position: absolute; top: 8px; right: 8px; z-index: 100; display: flex; align-items: center; gap: 6px;">
      <div class="view-toggle">
        <button id="toggle3DBtn" title="Toggle 2D/3D view">3D</button>
      </div>
      <div class="view-toggle">
        <button id="lozengeViewBtn" class="active" title="Lozenge view">◆</button>
        <button id="pathViewBtn" title="Toggle nonintersecting paths">⟶</button>
        <button id="dimerViewBtn" title="Dimer view">•-•</button>
        <button id="rotate2DBtn" title="Rotate canvas 90°">↻</button>
      </div>
      <div class="view-toggle" id="view3DOverlay" style="display: none;">
        <button id="perspectiveBtn" title="Isometric view (click for perspective)">📐</button>
        <button id="preset3DBtn" title="Cycle 3D visual preset">☀️</button>
      </div>
      <button id="fullscreenBtn" title="Fullscreen (F)" style="width: 28px; height: 28px; border: 1px solid #888; border-radius: 50%; background: white; color: #666; font-size: 14px; cursor: pointer; padding: 0;">⛶</button>
      <button id="helpBtn" style="width: 28px; height: 28px; border: 1px solid #888; border-radius: 50%; background: white; color: #666; font-size: 14px; cursor: pointer; padding: 0;">?</button>
      <div id="tool-tooltip" style="padding: 6px 10px; background: rgba(0,0,0,0.85); color: white; border-radius: 6px; font-size: 11px; display: none; white-space: pre-line; line-height: 1.4; position: absolute; right: 0; top: 40px;">🤚 pan · ✏️ draw · 🧹 erase
⭕+ lasso fill · ⭕− lasso erase
📐 snap to grid
─────────
Shift: toggle draw↔erase
Cmd-click: complete lasso</div>
    </div>

    <!-- Canvas -->
    <canvas id="lozenge-canvas" role="img" aria-label="Interactive lozenge tiling canvas. Use drawing tools to create and modify regions."></canvas>

    <!-- 3D Container -->
    <div id="three-container" role="img" aria-label="3D visualization of lozenge tiling height function"></div>

    <!-- Hole winding overlays -->
    <div id="hole-overlays" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50;" aria-hidden="true"></div>
  </div>

  <!-- Stats Bar (under canvas) -->
  <div class="stats-bar" role="status" aria-live="polite">
    <span class="stat-item"><span class="stat-label">Dimers</span> <span class="stat-value" id="dimerCount">0</span><span id="dimerWarning" style="color: #e77500; font-size: 0.85em; margin-left: 4px; display: none;" role="alert">⚠️ slow</span></span>
    <span class="stat-divider">|</span>
    <span class="stat-item"><span class="stat-label">Steps</span> <span class="stat-value" id="stepCount">0</span></span>
    <span class="stat-divider">|</span>
    <span class="stat-item"><span class="stat-label">CFTP</span> <span class="stat-value" id="cftpSteps">-</span></span>
    <span id="gpuIndicator" style="color: #2e8b57; margin-left: 8px; display: none;">🚀 GPU</span>
  </div>
</main>

<!-- Bottom sections: under canvas on desktop, in drawer on mobile via JS -->
<div class="bottom-sections-wrapper">
  <!-- Fluctuations & Double Dimers -->
  <details class="control-section bottom-section">
    <summary>Fluctuations & Double Dimers</summary>
    <div class="control-section-content">
      <div class="control-row">
        <button id="cftpBtn2" class="btn-secondary-action" data-tooltip="Individual perfect sample" disabled aria-label="Generate individual perfect sample using CFTP">CFTP Sample</button>
        <button id="averageBtn" class="btn-secondary-action" data-tooltip="Compute averaged height (Limit Shape)" disabled aria-label="Compute averaged height function from multiple samples">Average</button>
        <span class="param-group"><label for="avgSamplesInput" class="param-label">n</label><input type="number" class="param-input" id="avgSamplesInput" value="10" min="1" max="1000" style="width: 50px;" aria-label="Number of samples to average"></span>
        <button id="avgStopBtn" style="display: none; background: #dc3545; color: white; border-color: #dc3545;" aria-label="Stop averaging process">Stop</button>
      </div>
      <div class="control-row">
        <span id="avgProgress" style="font-size: 12px; color: #666;" role="status" aria-live="polite"></span>
      </div>
      <div class="control-row">
        <button id="fluctuationsBtn" class="btn-secondary-action" data-tooltip="Height difference ≈ Gaussian Free Field" disabled aria-label="Visualize height function fluctuations between two samples">Fluctuations</button>
        <span id="fluctProgress" style="font-size: 12px; color: #666;" role="status" aria-live="polite"></span>
        <label for="fluctScaleInput" style="font-size: 14px; color: #555;">×</label>
        <input type="number" id="fluctScaleInput" value="10" min="1" max="100" step="1" style="width: 50px; padding: 2px 4px; font-size: 13px;" aria-label="Fluctuation scale multiplier">
        <label style="display: flex; align-items: center; gap: 3px; font-size: 14px; color: #555; cursor: pointer;">
          <input type="checkbox" id="fluctOutlineCheck" checked style="margin: 0;" aria-label="Show outline in fluctuations view">
          Outline
        </label>
      </div>
      <div class="control-row">
        <button id="doubleDimerBtn" class="btn-secondary-action" data-tooltip="Superimpose two samples to form loops" disabled aria-label="Generate double dimer loop visualization">Double Dimer</button>
        <span id="doubleDimerProgress" style="font-size: 12px; color: #666;" role="status" aria-live="polite"></span>
        <label for="minLoopInput" style="font-size: 14px; color: #555;">min loop:</label>
        <input type="number" id="minLoopInput" value="2" min="2" max="99" style="width: 3.5em; padding: 2px 4px; font-size: 13px;" aria-label="Minimum loop size to display">
      </div>
      <div class="control-row">
        <button id="resampleBtn" style="display: none; background: #6c757d; color: white; border-color: #6c757d;" aria-label="Generate new sample">Resample</button>
      </div>
    </div>
  </details>

  <!-- Export -->
  <details class="control-section bottom-section">
    <summary>Export</summary>
    <div class="control-section-content">
      <div class="export-group">
        <span class="export-group-label">Images</span>
        <button id="export-png" class="btn-utility" aria-label="Export as PNG image">PNG</button>
        <label for="export-quality" style="font-size: 13px; color: #666;">Quality:</label>
        <input type="range" id="export-quality" min="0" max="100" value="85" style="width: 60px;" aria-label="PNG export quality">
        <span id="export-quality-val" style="font-size: 13px; color: #232D4B;">85</span>
        <button id="export-pdf" class="btn-utility" aria-label="Export as PDF document">PDF</button>
      </div>
      <div class="export-divider"></div>
      <div class="export-group">
        <span class="export-group-label">Height</span>
        <button id="export-height-csv" class="btn-utility" aria-label="Export height function as CSV file">CSV</button>
        <button id="height-csv-info" style="padding: 0 6px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 50%; font-size: 13px; cursor: pointer;" aria-label="Show height CSV format information">?</button>
        <button id="export-height-mma" class="btn-utility" aria-label="Copy height function as Mathematica array to clipboard">Mathematica</button>
        <button id="height-mma-info" style="padding: 0 6px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 50%; font-size: 13px; cursor: pointer;" aria-label="Show Mathematica array format information">?</button>
      </div>
      <div class="export-divider"></div>
      <div class="export-group">
        <span class="export-group-label">Shape</span>
        <button id="export-json" class="btn-utility" aria-label="Export region shape as JSON file">Export</button>
        <button id="import-json" class="btn-utility" aria-label="Import region shape from JSON file">Import</button>
        <input type="file" id="import-json-file" accept=".json" style="display: none;" aria-label="JSON file input">
      </div>
      <div class="export-divider"></div>
      <div class="export-group">
        <span class="export-group-label">Share</span>
        <button id="copy-link-btn" class="btn-utility" aria-label="Copy shareable link to clipboard">Copy Link</button>
        <span id="link-copied" style="display: none; color: #28a745; font-size: 13px;">Copied!</span>
      </div>
      <div class="export-divider"></div>
      <div class="export-group">
        <span class="export-group-label">3D</span>
        <button id="export-obj" class="btn-utility" aria-label="Export 3D model as OBJ file">OBJ</button>
        <button id="export-obj2" class="btn-utility" aria-label="Export 3D model as OBJ with orthogonal axes">OBJ-ortho</button>
        <label for="obj-thickness" style="font-size: 13px; color: #666;">Thickness:</label>
        <input type="number" id="obj-thickness" value="2" min="0" step="1" style="width: 40px;" aria-label="OBJ export thickness in millimeters">
        <span style="font-size: 13px; color: #888;">mm</span>
      </div>
      <div id="height-csv-info-box" style="display: none; margin-top: 8px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; white-space: pre-wrap; max-width: 100%;">Height CSV Coordinates:

• n, j: Integer lattice coordinates on the triangular grid
• x, y: World coordinates (floating point)
• h: Height function value at vertex (n, j)

Coordinate System:
  The angle between n and j axes is 60°

  n-direction: horizontal + slight upward tilt
    (vector: (1, 1/√3), angle 30° from horizontal)

  j-direction: purely vertical
    (vector: (0, 2/√3))

Conversion to world (x, y):
  x = n
  y = n/√3 + j × 2/√3

Triangles indexed by (n, j, type):
  Type 1 (black ▶): vertices (n,j), (n,j-1), (n+1,j-1)
  Type 2 (white ◀): vertices (n,j), (n+1,j), (n+1,j-1)

The height h is defined on vertices of the triangular lattice
(equivalently, faces of the dual hexagonal grid).</div>
      <div id="height-mma-info-box" style="display: none; margin-top: 8px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; white-space: pre-wrap; max-width: 100%;">Mathematica Plotting Code:

After pasting, assign to A and run:

pts2D = A[[All, {1, 2}]];
mesh = DelaunayMesh[pts2D];
Graphics3D[{EdgeForm[Black],
  GraphicsComplex[
    MapThread[Append, {pts2D, A[[All, 3]]}],
    {Polygon[MeshCells[mesh, 2][[All, 1]]]}]
}, Boxed -> False]</div>
    </div>
  </details>
</div>

</div><!-- end simulation-layout -->

<!-- Floating Action Buttons for Mobile -->
<div class="fab-group">
  <button id="hexagonFab" class="fab-btn fab-secondary" aria-label="Create hexagon"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 22,7 22,17 12,22 2,17 2,7"/></svg></button>
  <button id="scaleUpFab" class="fab-btn fab-secondary" disabled aria-label="Scale region up">2×</button>
  <button id="sampleFab" class="fab-btn fab-primary" disabled aria-label="Generate perfect sample">🎲</button>
</div>

<!-- Keyboard Shortcuts Help Modal -->
<div id="keyboardHelpModal" class="keyboard-help-modal" role="dialog" aria-labelledby="keyboard-help-title" aria-modal="true">
  <div class="keyboard-help-content">
    <h3 id="keyboard-help-title">Help</h3>
    <h4 style="margin: 12px 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666;">Drawing Tools</h4>
    <table>
      <tr><td>🖐</td><td>Pan canvas</td></tr>
      <tr><td>✏️</td><td>Draw triangles</td></tr>
      <tr><td>🧽</td><td>Erase triangles</td></tr>
      <tr><td>⭕+</td><td>Lasso fill</td></tr>
      <tr><td>⭕−</td><td>Lasso erase</td></tr>
      <tr><td>📐</td><td>Snap to grid</td></tr>
    </table>
    <table style="margin-top: 8px;">
      <tr><td><kbd>Shift</kbd></td><td>Toggle draw ↔ erase</td></tr>
      <tr><td><kbd>Cmd</kbd>-click</td><td>Complete lasso</td></tr>
    </table>
    <h4 style="margin: 16px 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666;">Keyboard Shortcuts</h4>
    <table>
      <tr><td><kbd>S</kbd></td><td>Perfect Sample (CFTP)</td></tr>
      <tr><td><kbd>G</kbd></td><td>Start/Stop Glauber</td></tr>
      <tr><td><kbd>Space</kbd></td><td>Pause/Resume Glauber</td></tr>
      <tr><td><kbd>3</kbd></td><td>Toggle 3D view</td></tr>
      <tr><td><kbd>R</kbd></td><td>Reset view</td></tr>
      <tr><td><kbd>U</kbd></td><td>Scale Up region (2×)</td></tr>
      <tr><td><kbd>+</kbd> / <kbd>-</kbd></td><td>Zoom in/out</td></tr>
      <tr><td><kbd>C</kbd> / <kbd>Shift</kbd>+<kbd>C</kbd></td><td>Next/Previous palette</td></tr>
      <tr><td><kbd>P</kbd></td><td>Permute colors</td></tr>
      <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>Previous/Next palette</td></tr>
      <tr><td><kbd>Z</kbd></td><td>Undo</td></tr>
      <tr><td><kbd>H</kbd></td><td>Toggle hole labels</td></tr>
      <tr><td><kbd>L</kbd></td><td>Cycle render mode (3D)</td></tr>
      <tr><td><kbd>Y</kbd></td><td>Redo</td></tr>
      <tr><td><kbd>M</kbd></td><td>Make tileable</td></tr>
      <tr><td><kbd>F</kbd></td><td>Toggle fullscreen</td></tr>
      <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Close dialogs</td></tr>
    </table>
    <button class="close-btn" id="closeKeyboardHelp">Close</button>
  </div>
</div>

<script>
// Info Panel Tab Switching
(function() {
  const tabs = document.querySelectorAll('.info-tab');
  const panes = document.querySelectorAll('.info-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = 'pane-' + tab.dataset.tab;

      // Remove active from all tabs and panes
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      // Add active to clicked tab and target pane
      tab.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
})();

// Responsive: Move bottom sections into drawer on mobile, out on desktop
(function() {
  const bottomSections = document.querySelector('.bottom-sections-wrapper');
  const controlsInner = document.querySelector('.controls-panel-inner');
  const simulationLayout = document.querySelector('.simulation-layout');

  if (!bottomSections || !controlsInner || !simulationLayout) return;

  let isInDrawer = false;

  function updateBottomSectionsPosition() {
    const isMobile = window.innerWidth < 992;

    if (isMobile && !isInDrawer) {
      // Move into drawer (at the end of controls-panel-inner)
      controlsInner.appendChild(bottomSections);
      isInDrawer = true;
    } else if (!isMobile && isInDrawer) {
      // Move out to simulation-layout (before closing div)
      simulationLayout.appendChild(bottomSections);
      isInDrawer = false;
    }
  }

  // Initial position
  updateBottomSectionsPosition();

  // Update on resize
  window.addEventListener('resize', updateBottomSectionsPosition);
})();

function initLozengeApp() {
    const slope = 1 / Math.sqrt(3);
    const deltaC = 2 / Math.sqrt(3);

    function getVertex(n, j) {
        return { x: n, y: slope * n + j * deltaC };
    }

    // ========================================================================
    // HEIGHT FUNCTION COMPUTATION
    // ========================================================================
    function computeHeightFunction(dimers) {
        // Vertex keys for each dimer type
        const getVertexKeys = (dimer) => {
            const { bn, bj, t } = dimer;
            if (t === 0) {
                return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            } else if (t === 1) {
                return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            } else {
                return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
            }
        };

        // Height patterns (relative z-heights of the 4 vertices)
        const getHeightPattern = (t) => {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        };

        // Build Vertex-to-Dimer Map
        const vertexToDimers = new Map();
        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            for (const [n, j] of verts) {
                const key = `${n},${j}`;
                if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                vertexToDimers.get(key).push(dimer);
            }
        }

        // BFS to calculate Height Function h(n,j)
        const heights = new Map();
        if (dimers.length > 0) {
            const firstDimer = dimers[0];
            const firstVerts = getVertexKeys(firstDimer);
            const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
            heights.set(startKey, 0);

            const queue = [startKey];
            const visited = new Set();

            while (queue.length > 0) {
                const currentKey = queue.shift();
                if (visited.has(currentKey)) continue;
                visited.add(currentKey);

                const currentH = heights.get(currentKey);
                const [cn, cj] = currentKey.split(',').map(Number);

                for (const dimer of vertexToDimers.get(currentKey) || []) {
                    const verts = getVertexKeys(dimer);
                    const pattern = getHeightPattern(dimer.t);

                    // Find index of current vertex in this dimer
                    let myIdx = -1;
                    for (let i = 0; i < 4; i++) {
                        if (verts[i][0] === cn && verts[i][1] === cj) {
                            myIdx = i;
                            break;
                        }
                    }

                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const [vn, vj] = verts[i];
                            const vkey = `${vn},${vj}`;
                            if (!heights.has(vkey)) {
                                const newH = currentH + (pattern[i] - pattern[myIdx]);
                                heights.set(vkey, newH);
                                queue.push(vkey);
                            }
                        }
                    }
                }
            }
        }

        return heights;
    }

    // ========================================================================
    // RECONSTRUCT DIMERS FROM HEIGHT FUNCTION
    // ========================================================================
    function reconstructDimersFromHeights(heights, blackTriangles, whiteTriangles) {
        // Build set of white triangles for lookup
        const whiteSet = new Set();
        for (const w of whiteTriangles) {
            whiteSet.add(`${w.n},${w.j}`);
        }

        const dimers = [];

        // For each black triangle, determine which white neighbor it pairs with
        for (const black of blackTriangles) {
            const bn = black.n;
            const bj = black.j;

            // Get heights at relevant vertices
            const getH = (n, j) => heights.get(`${n},${j}`) || 0;

            // Check each possible dimer type
            // Type 0: pairs with white (bn, bj)
            // Vertices: [bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]
            // All should have same height (pattern [0,0,0,0])
            const h0_v0 = getH(bn, bj);
            const h0_v1 = getH(bn + 1, bj);
            const h0_v2 = getH(bn + 1, bj - 1);
            const h0_v3 = getH(bn, bj - 1);
            const err0 = whiteSet.has(`${bn},${bj}`) ?
                Math.abs(h0_v0 - h0_v1) + Math.abs(h0_v1 - h0_v2) + Math.abs(h0_v2 - h0_v3) : Infinity;

            // Type 1: pairs with white (bn, bj-1)
            // Vertices: [bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]
            // Pattern [1, 0, 0, 1]: v0,v3 are 1 higher than v1,v2
            const h1_v0 = getH(bn, bj);
            const h1_v1 = getH(bn + 1, bj - 1);
            const h1_v2 = getH(bn + 1, bj - 2);
            const h1_v3 = getH(bn, bj - 1);
            const err1 = whiteSet.has(`${bn},${bj - 1}`) ?
                Math.abs(h1_v0 - h1_v3) + Math.abs(h1_v1 - h1_v2) + Math.abs((h1_v0 - h1_v1) - 1) : Infinity;

            // Type 2: pairs with white (bn-1, bj)
            // Vertices: [bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]
            // Pattern [1, 1, 0, 0]: v0,v1 are 1 higher than v2,v3
            const h2_v0 = getH(bn - 1, bj);
            const h2_v1 = getH(bn, bj);
            const h2_v2 = getH(bn + 1, bj - 1);
            const h2_v3 = getH(bn, bj - 1);
            const err2 = whiteSet.has(`${bn - 1},${bj}`) ?
                Math.abs(h2_v0 - h2_v1) + Math.abs(h2_v2 - h2_v3) + Math.abs((h2_v0 - h2_v2) - 1) : Infinity;

            // Choose type with minimum error
            let bestType = 0;
            let minErr = err0;
            if (err1 < minErr) { bestType = 1; minErr = err1; }
            if (err2 < minErr) { bestType = 2; minErr = err2; }

            // Determine white triangle coords based on type
            let wn, wj;
            if (bestType === 0) { wn = bn; wj = bj; }
            else if (bestType === 1) { wn = bn; wj = bj - 1; }
            else { wn = bn - 1; wj = bj; }

            dimers.push({ bn, bj, wn, wj, t: bestType });
        }

        return dimers;
    }

    // ========================================================================
    // UNDO/REDO SYSTEM
    // ========================================================================
    class UndoStack {
        constructor() {
            this.undoStack = [];
            this.redoStack = [];
            this.maxSize = 100;
        }

        push(state) {
            this.undoStack.push(JSON.stringify(state));
            this.redoStack = [];
            if (this.undoStack.length > this.maxSize) {
                this.undoStack.shift();
            }
        }

        undo(currentState) {
            if (this.undoStack.length === 0) return null;
            this.redoStack.push(JSON.stringify(currentState));
            return JSON.parse(this.undoStack.pop());
        }

        redo(currentState) {
            if (this.redoStack.length === 0) return null;
            this.undoStack.push(JSON.stringify(currentState));
            return JSON.parse(this.redoStack.pop());
        }

        canUndo() { return this.undoStack.length > 0; }
        canRedo() { return this.redoStack.length > 0; }
        clear() { this.undoStack = []; this.redoStack = []; }
    }

    // ========================================================================
    // WASM INTERFACE
    // ========================================================================
    class UltimateLozengeSampler {
        constructor() {
            this.boundaries = [];
            this.dimers = [];
            this.blackTriangles = [];
            this.whiteTriangles = [];
            this.isValid = false;

            this.initFromTrianglesWasm = Module.cwrap('initFromTriangles', 'number', ['number', 'number']);
            this.performGlauberStepsWasm = Module.cwrap('performGlauberSteps', 'number', ['number']);
            this.exportDimersWasm = Module.cwrap('exportDimers', 'number', []);
            this.getAcceptRateWasm = Module.cwrap('getAcceptRate', 'number', []);
            this.setQBiasWasm = Module.cwrap('setQBias', null, ['number']);
            this.setPeriodicQBiasWasm = Module.cwrap('setPeriodicQBias', null, ['number', 'number']);
            this.setPeriodicKWasm = Module.cwrap('setPeriodicK', null, ['number']);
            this.setUsePeriodicWeightsWasm = Module.cwrap('setUsePeriodicWeights', null, ['number']);
            this.setUseRandomSweepsWasm = Module.cwrap('setUseRandomSweeps', null, ['number']);
            this.runCFTPWasm = Module.cwrap('runCFTP', 'number', []);
            this.initCFTPWasm = Module.cwrap('initCFTP', 'number', []);
            this.stepCFTPWasm = Module.cwrap('stepCFTP', 'number', []);
            this.finalizeCFTPWasm = Module.cwrap('finalizeCFTP', 'number', []);
            this.exportCFTPMaxDimersWasm = Module.cwrap('exportCFTPMaxDimers', 'number', []);
            this.exportCFTPMinDimersWasm = Module.cwrap('exportCFTPMinDimers', 'number', []);
            this.repairRegionWasm = Module.cwrap('repairRegion', 'number', []);
            this.setDimersWasm = Module.cwrap('setDimers', 'number', ['number', 'number']);
            this.getHoleCountWasm = Module.cwrap('getHoleCount', 'number', []);
            this.getAllHolesInfoWasm = Module.cwrap('getAllHolesInfo', 'number', []);
            this.adjustHoleWindingWasm = Module.cwrap('adjustHoleWindingExport', 'number', ['number', 'number']);
            this.setHoleBaseHeightWasm = Module.cwrap('setHoleBaseHeight', 'number', ['number', 'number']);
            this.recomputeHoleInfoWasm = Module.cwrap('recomputeHoleInfo', null, []);
            this.getVerticalCutInfoWasm = Module.cwrap('getVerticalCutInfo', 'number', ['number']);
            this.freeStringWasm = Module.cwrap('freeString', null, ['number']);

            // Parallel CFTP API (works with both threaded and non-threaded builds)
            this.getHardwareConcurrencyWasm = Module.cwrap('getHardwareConcurrency', 'number', []);
            this.initFluctuationsCFTPWasm = Module.cwrap('initFluctuationsCFTP', 'number', ['number']);
            this.stepFluctuationsCFTPWasm = Module.cwrap('stepFluctuationsCFTP', 'number', []);
            this.getFluctuationsResultWasm = Module.cwrap('getFluctuationsResult', 'number', []);
            this.exportFluctuationSampleWasm = Module.cwrap('exportFluctuationSample', 'number', ['number']);

            // WebGPU Interface
            this.getRawGridDataWasm = Module.cwrap('getRawGridData', 'number', []);
            this.getGridBoundsWasm = Module.cwrap('getGridBounds', 'number', []);
            this.getCFTPMinGridDataWasm = Module.cwrap('getCFTPMinGridData', 'number', []);
            this.getCFTPMaxGridDataWasm = Module.cwrap('getCFTPMaxGridData', 'number', []);

            // Loop Detection for Double Dimer
            this.loadDimersForLoopsWasm = Module.cwrap('loadDimersForLoops', null, ['number', 'number']);
            this.detectLoopSizesWasm = Module.cwrap('detectLoopSizes', 'number', []);
            this.filterLoopsBySizeWasm = Module.cwrap('filterLoopsBySize', 'number', ['number']);

            this.totalSteps = 0;
            this.flipCount = 0;
        }

        setQBias(q) { this.setQBiasWasm(q); }
        setPeriodicQBias(values, k) {
            // values is a flat array of k*k doubles
            const dataPtr = Module._malloc(values.length * 8);
            for (let i = 0; i < values.length; i++) {
                Module.setValue(dataPtr + i * 8, values[i], 'double');
            }
            this.setPeriodicQBiasWasm(dataPtr, k);
            Module._free(dataPtr);
        }
        setPeriodicK(k) { this.setPeriodicKWasm(k); }
        setUsePeriodicWeights(use) { this.setUsePeriodicWeightsWasm(use ? 1 : 0); }
        setUseRandomSweeps(use) { this.setUseRandomSweepsWasm(use ? 1 : 0); }

        initFromTriangles(trianglesMap) {
            // Convert Map to flat array [n, j, type, n, j, type, ...]
            const arr = [];
            for (const [key, tri] of trianglesMap) {
                arr.push(tri.n, tri.j, tri.type);
            }

            if (arr.length === 0) {
                this.isValid = false;
                this.boundaries = [];
                this.dimers = [];
                this.blackTriangles = [];
                this.whiteTriangles = [];
                return { status: 'empty', blackCount: 0, whiteCount: 0 };
            }

            const dataPtr = Module._malloc(arr.length * 4);
            // Write array to WASM memory using setValue
            for (let i = 0; i < arr.length; i++) {
                Module.setValue(dataPtr + i * 4, arr[i], 'i32');
            }

            const ptr = this.initFromTrianglesWasm(dataPtr, arr.length);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            Module._free(dataPtr);

            const result = JSON.parse(jsonStr);
            this.isValid = result.status === 'valid';
            this.totalSteps = 0;
            this.flipCount = 0;

            if (this.isValid) {
                this.refreshDimers();
            } else {
                this.dimers = [];
            }

            return result;
        }

        step(numSteps) {
            const ptr = this.performGlauberStepsWasm(numSteps);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            this.totalSteps = result.totalSteps || 0;
            this.flipCount = result.flipCount || 0;
            this.refreshDimers();
            return result;
        }

        initCFTP() {
            const ptr = this.initCFTPWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        stepCFTP() {
            const ptr = this.stepCFTPWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        finalizeCFTP() {
            const ptr = this.finalizeCFTPWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            this.refreshDimers();
            return JSON.parse(jsonStr);
        }

        getCFTPMaxDimers() {
            const ptr = this.exportCFTPMaxDimersWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        getCFTPMinDimers() {
            const ptr = this.exportCFTPMinDimersWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        repair() {
            const ptr = this.repairRegionWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            this.isValid = result.status === 'valid';
            this.refreshDimers();
            return result;
        }

        // Set dimers directly (for winding constraints)
        // dimers: array of {bn, bj, wn, wj, t}
        setDimers(dimers) {
            // Convert to flat array: [bn, bj, wn, wj, type, ...]
            const arr = [];
            for (const d of dimers) {
                arr.push(d.bn, d.bj, d.wn, d.wj, d.t);
            }

            const dataPtr = Module._malloc(arr.length * 4);
            for (let i = 0; i < arr.length; i++) {
                Module.setValue(dataPtr + i * 4, arr[i], 'i32');
            }

            const ptr = this.setDimersWasm(dataPtr, arr.length);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            Module._free(dataPtr);

            const result = JSON.parse(jsonStr);
            this.dimers = dimers;
            return result;
        }

        refreshDimers() {
            const ptr = this.exportDimersWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            const result = JSON.parse(jsonStr);
            this.boundaries = result.boundaries || [];
            this.segments = result.segments || [];
            this.dimers = result.dimers;
            this.blackTriangles = result.black;
            this.whiteTriangles = result.white;
        }

        getTotalSteps() { return this.totalSteps; }
        getFlipCount() { return this.flipCount; }
        getAcceptRate() { return this.getAcceptRateWasm(); }

        // Hole and winding methods
        getHoleCount() { return this.getHoleCountWasm(); }

        getAllHolesInfo() {
            const ptr = this.getAllHolesInfoWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        getVerticalCutInfo(holeIdx) {
            const ptr = this.getVerticalCutInfoWasm(holeIdx);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        adjustHoleWinding(holeIdx, delta) {
            const ptr = this.adjustHoleWindingWasm(holeIdx, delta);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        setHoleBaseHeight(holeIdx, height) {
            return this.setHoleBaseHeightWasm(holeIdx, height);
        }

        recomputeHoleInfo() {
            this.recomputeHoleInfoWasm();
        }

        // Parallel CFTP API
        getHardwareConcurrency() {
            return this.getHardwareConcurrencyWasm();
        }

        initFluctuationsCFTP(numSamples) {
            const ptr = this.initFluctuationsCFTPWasm(numSamples);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        stepFluctuationsCFTP() {
            const ptr = this.stepFluctuationsCFTPWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        getFluctuationsResult() {
            const ptr = this.getFluctuationsResultWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        exportFluctuationSample(sampleIdx) {
            const ptr = this.exportFluctuationSampleWasm(sampleIdx);
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        // WebGPU Interface - get raw grid data for GPU compute
        getRawGridData() {
            const boundsPtr = this.getGridBoundsWasm();
            const boundsStr = Module.UTF8ToString(boundsPtr);
            this.freeStringWasm(boundsPtr);
            const bounds = JSON.parse(boundsStr);

            const dataPtr = this.getRawGridDataWasm();
            if (!dataPtr) return null;

            // Copy data from WASM memory to JavaScript Int32Array
            const size = bounds.size;
            const data = new Int32Array(size);
            for (let i = 0; i < size; i++) {
                data[i] = Module.getValue(dataPtr + i * 4, 'i32');
            }
            Module._free(dataPtr);

            return {
                data: data,
                minN: bounds.minN,
                maxN: bounds.maxN,
                minJ: bounds.minJ,
                maxJ: bounds.maxJ,
                strideJ: bounds.strideJ,
                size: size
            };
        }

        getGridBounds() {
            const ptr = this.getGridBoundsWasm();
            const jsonStr = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(jsonStr);
        }

        // WebGPU Interface - get raw CFTP min state grid data
        getCFTPMinRawGridData() {
            const boundsPtr = this.getGridBoundsWasm();
            const boundsStr = Module.UTF8ToString(boundsPtr);
            this.freeStringWasm(boundsPtr);
            const bounds = JSON.parse(boundsStr);

            const dataPtr = this.getCFTPMinGridDataWasm();
            if (!dataPtr) return null;

            const size = bounds.size;
            const data = new Int32Array(size);
            for (let i = 0; i < size; i++) {
                data[i] = Module.getValue(dataPtr + i * 4, 'i32');
            }
            Module._free(dataPtr);
            return data;
        }

        // WebGPU Interface - get raw CFTP max state grid data
        getCFTPMaxRawGridData() {
            const boundsPtr = this.getGridBoundsWasm();
            const boundsStr = Module.UTF8ToString(boundsPtr);
            this.freeStringWasm(boundsPtr);
            const bounds = JSON.parse(boundsStr);

            const dataPtr = this.getCFTPMaxGridDataWasm();
            if (!dataPtr) return null;

            const size = bounds.size;
            const data = new Int32Array(size);
            for (let i = 0; i < size; i++) {
                data[i] = Module.getValue(dataPtr + i * 4, 'i32');
            }
            Module._free(dataPtr);
            return data;
        }

        // Loop Detection for Double Dimer - allocate string helper
        allocString(str) {
            const len = Module.lengthBytesUTF8(str) + 1;
            const ptr = Module._malloc(len);
            Module.stringToUTF8(str, ptr, len);
            return ptr;
        }

        // Load dimers for loop detection (call before filtering)
        loadDimersForLoops(dimers0, dimers1) {
            const json0 = JSON.stringify(dimers0.map(d => [d.bn, d.bj, d.wn, d.wj]));
            const json1 = JSON.stringify(dimers1.map(d => [d.bn, d.bj, d.wn, d.wj]));
            const ptr0 = this.allocString(json0);
            const ptr1 = this.allocString(json1);
            this.loadDimersForLoopsWasm(ptr0, ptr1);
            Module._free(ptr0);
            Module._free(ptr1);
        }

        // Detect loop sizes and return size statistics
        detectLoopSizes() {
            const ptr = this.detectLoopSizesWasm();
            const json = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(json);
        }

        // Filter dimers by minimum loop size, returns {indices0, indices1}
        filterLoopsByMinSize(minSize) {
            const ptr = this.filterLoopsBySizeWasm(minSize);
            const json = Module.UTF8ToString(ptr);
            this.freeStringWasm(ptr);
            return JSON.parse(json);
        }
    }

    // ========================================================================
    // PRESET SHAPES
    // ========================================================================
    // Helper: point in polygon test (ray casting)
    function pointInPolygonPreset(x, y, polygon) {
        if (polygon.length < 3) return false;
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    // Get triangle centroids
    function getRightTriangleCentroid(n, j) {
        const v1 = getVertex(n, j);
        const v2 = getVertex(n, j - 1);
        const v3 = getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    }

    function getLeftTriangleCentroid(n, j) {
        const v1 = getVertex(n, j);
        const v2 = getVertex(n + 1, j);
        const v3 = getVertex(n + 1, j - 1);
        return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
    }

    // Generate triangles inside a polygon boundary
    function generateTrianglesInPolygon(boundary) {
        const triangles = new Map();

        // Find bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of boundary) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }

        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                // Check black triangle (right-facing)
                const rc = getRightTriangleCentroid(n, j);
                if (pointInPolygonPreset(rc.x, rc.y, boundary)) {
                    const blackKey = `${n},${j},1`;
                    triangles.set(blackKey, { n, j, type: 1 });
                }

                // Check white triangle (left-facing)
                const lc = getLeftTriangleCentroid(n, j);
                if (pointInPolygonPreset(lc.x, lc.y, boundary)) {
                    const whiteKey = `${n},${j},2`;
                    triangles.set(whiteKey, { n, j, type: 2 });
                }
            }
        }
        return triangles;
    }

    function generateHexagon(a, b, c) {
        // Generate hexagon boundary with sides a, b, c, a, b, c
        // Directions on triangular lattice: (dn, dj) pairs
        const directions = [
            [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]
        ];
        const sideLengths = [a, b, c, a, b, c];

        const boundary = [];
        let n = 0, j = 0;

        for (let dir = 0; dir < 6; dir++) {
            const [dn, dj] = directions[dir];
            for (let step = 0; step < sideLengths[dir]; step++) {
                boundary.push(getVertex(n, j));
                n += dn;
                j += dj;
            }
        }

        return generateTrianglesInPolygon(boundary);
    }

    // Load letter triangles from JSON file
    async function loadLetterTriangles(char) {
        // Special characters like * and *** don't need uppercasing
        const filename = (char.match(/^[a-zA-Z0-9]$/) ? char.toUpperCase() : char) + '.json';
        try {
            const response = await fetch(`/letters/${filename}?v=${Date.now()}`);
            if (!response.ok) return new Map();
            const data = await response.json();
            if (!data.triangles) return new Map();

            const triangles = new Map();
            for (const t of data.triangles) {
                const type = t.type || t.t;
                triangles.set(`${t.n},${t.j},${type}`, { n: t.n, j: t.j, type });
            }
            return triangles;
        } catch (e) {
            console.error('Failed to load letter:', char, e);
            return new Map();
        }
    }

    // Convert world coordinates to lattice (n, j) - boundary vertices are at integer lattice points
    function worldToLattice(x, y) {
        const n = Math.round(x);
        const j = Math.round((y - slope * n) / deltaC);
        return { n, j };
    }

    // Snap world coordinates to nearest lattice vertex
    function snapToLattice(worldPos) {
        const lattice = worldToLattice(worldPos.x, worldPos.y);
        return getVertex(lattice.n, lattice.j);
    }

    // Snap direction to nearest triangular grid axis if within threshold
    // Returns a snapped endpoint given start and raw end positions
    function snapDirectionToGrid(startPos, endPos, angleThreshold = 15) {
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) return endPos;

        // Current angle in degrees
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Grid directions in world coordinates (6 directions)
        // n-axis: (1, slope), j-axis: (0, deltaC), diagonal: (1, slope - deltaC)
        const gridAngles = [
            Math.atan2(slope, 1) * 180 / Math.PI,           // +n direction
            Math.atan2(-slope, -1) * 180 / Math.PI,         // -n direction
            90,                                              // +j direction (straight up)
            -90,                                             // -j direction (straight down)
            Math.atan2(slope - deltaC, 1) * 180 / Math.PI,  // +n-j diagonal
            Math.atan2(deltaC - slope, -1) * 180 / Math.PI  // -n+j diagonal
        ];

        // Find closest grid angle
        let closestAngle = angle;
        let minDiff = Infinity;
        for (const ga of gridAngles) {
            let diff = Math.abs(angle - ga);
            if (diff > 180) diff = 360 - diff;
            if (diff < minDiff) {
                minDiff = diff;
                closestAngle = ga;
            }
        }

        // Only snap if within threshold
        if (minDiff <= angleThreshold) {
            const radians = closestAngle * Math.PI / 180;
            return {
                x: startPos.x + dist * Math.cos(radians),
                y: startPos.y + dist * Math.sin(radians)
            };
        }

        return endPos;
    }

    // Scale mesh by scaling ALL boundaries (including holes) ensuring INTEGER LATTICE alignment
    function doubleMesh(triangles) {
        if (triangles.size === 0) return new Map();

        // 1. Safety Check: We need valid boundaries from the WASM engine
        // The simulation MUST be valid (have boundaries) to be scaled.
        if (!sim.boundaries || sim.boundaries.length === 0) {
            console.warn('No valid boundary available. The shape must be valid (tilable) to be doubled.');
            return triangles;
        }

        // 2. Topology Analysis: Distinguish Outer Boundary from Holes
        // We assume the Outer Boundary is the one with the largest bounding box diagonal.
        let outerIdx = 0;
        let maxDiag = -1;

        // Convert all boundaries from World (x,y) to Lattice (n,j) integers
        const latticeBoundaries = sim.boundaries.map(b => b.map(v => worldToLattice(v.x, v.y)));

        latticeBoundaries.forEach((b, i) => {
            let mn = Infinity, mxn = -Infinity, mj = Infinity, mxj = -Infinity;
            for(const v of b) {
                mn = Math.min(mn, v.n); mxn = Math.max(mxn, v.n);
                mj = Math.min(mj, v.j); mxj = Math.max(mxj, v.j);
            }
            const diag = (mxn - mn) ** 2 + (mxj - mj) ** 2;
            if (diag > maxDiag) {
                maxDiag = diag;
                outerIdx = i;
            }
        });

        // 3. Integer Anchoring: Calculate the Scaling Origin
        // CRITICAL: We calculate the centroid, but ROUND it to the nearest integer.
        // This ensures that Integer + (Integer - Integer)*2 = Integer.
        const outerLattice = latticeBoundaries[outerIdx];
        let cenN = 0, cenJ = 0;
        for (const v of outerLattice) { cenN += v.n; cenJ += v.j; }

        const anchorN = Math.round(cenN / outerLattice.length);
        const anchorJ = Math.round(cenJ / outerLattice.length);

        // 4. Transformation: Scale all boundaries relative to the Anchor
        const scaledBoundaries = latticeBoundaries.map(b => {
             // Scale in Lattice Space, then convert to World Space for the point-in-poly check
             return b.map(v => {
                 // The scaling formula: New = Anchor + (Old - Anchor) * 2
                 const newN = anchorN + (v.n - anchorN) * 2;
                 const newJ = anchorJ + (v.j - anchorJ) * 2;
                 return getVertex(newN, newJ);
             });
        });

        const scaledOuter = scaledBoundaries[outerIdx];
        const scaledHoles = scaledBoundaries.filter((_, i) => i !== outerIdx);

        // 5. Rasterization: Fill the new geometry
        // Determine the scan range (Bounding Box of the new scaled outer boundary)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of scaledOuter) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }

        const newTriangles = new Map();

        // Add padding to ensuring we catch the jagged edges of the boundary
        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;

        // Heuristic for J range based on C++ slope constants
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {

                // --- Check Type 1 (Black/Right-Facing) ---
                const rc = getRightTriangleCentroid(n, j);
                if (pointInPolygonPreset(rc.x, rc.y, scaledOuter)) {
                    // Inclusion Logic: Must be in Outer AND NOT in any Hole
                    let inHole = false;
                    for (const hole of scaledHoles) {
                        if (pointInPolygonPreset(rc.x, rc.y, hole)) {
                            inHole = true;
                            break;
                        }
                    }
                    if (!inHole) {
                        const key = `${n},${j},1`;
                        newTriangles.set(key, { n, j, type: 1 });
                    }
                }

                // --- Check Type 2 (White/Left-Facing) ---
                const lc = getLeftTriangleCentroid(n, j);
                if (pointInPolygonPreset(lc.x, lc.y, scaledOuter)) {
                    let inHole = false;
                    for (const hole of scaledHoles) {
                        if (pointInPolygonPreset(lc.x, lc.y, hole)) {
                            inHole = true;
                            break;
                        }
                    }
                    if (!inHole) {
                        const key = `${n},${j},2`;
                        newTriangles.set(key, { n, j, type: 2 });
                    }
                }
            }
        }

        return newTriangles;
    }

    // Scale mesh DOWN using segment-based boundary halving
    // Instead of scaling vertices (which causes distortion), we:
    // 1. Parse boundary into directional segments
    // 2. Remove length-1 segments, halve the rest
    // 3. Reconstruct and rasterize
    function halveMesh(triangles) {
        if (triangles.size === 0) return new Map();

        if (!sim.boundaries || sim.boundaries.length === 0) {
            console.warn('No valid boundary available. The shape must be valid (tilable) to be halved.');
            return triangles;
        }

        // Convert all boundaries from World (x,y) to Lattice (n,j) integers
        const latticeBoundaries = sim.boundaries.map(b => b.map(v => worldToLattice(v.x, v.y)));

        // Find outer boundary (largest bounding box diagonal)
        let outerIdx = 0;
        let maxDiag = -1;
        latticeBoundaries.forEach((b, i) => {
            let mn = Infinity, mxn = -Infinity, mj = Infinity, mxj = -Infinity;
            for (const v of b) {
                mn = Math.min(mn, v.n); mxn = Math.max(mxn, v.n);
                mj = Math.min(mj, v.j); mxj = Math.max(mxj, v.j);
            }
            const diag = (mxn - mn) ** 2 + (mxj - mj) ** 2;
            if (diag > maxDiag) { maxDiag = diag; outerIdx = i; }
        });

        // Process a single boundary into halved segments
        function halveBoundary(latticePoints) {
            if (latticePoints.length < 2) return [];

            // 1. Parse into segments (runs of consecutive same-direction edges)
            const segments = [];
            let i = 0;
            while (i < latticePoints.length) {
                const curr = latticePoints[i];
                const next = latticePoints[(i + 1) % latticePoints.length];
                const dn = next.n - curr.n;
                const dj = next.j - curr.j;

                // Count consecutive edges in same direction
                let length = 1;
                let k = i + 1;
                while (k < latticePoints.length) {
                    const p1 = latticePoints[k];
                    const p2 = latticePoints[(k + 1) % latticePoints.length];
                    if (p2.n - p1.n === dn && p2.j - p1.j === dj) {
                        length++;
                        k++;
                    } else break;
                }
                segments.push({ dn, dj, length });
                i = k;
            }

            // 2. Halve segments: remove length-1, halve others with round()
            const halvedSegments = [];
            for (const seg of segments) {
                if (seg.length >= 2) {
                    halvedSegments.push({
                        dn: seg.dn,
                        dj: seg.dj,
                        length: Math.round(seg.length / 2)
                    });
                }
                // length-1 segments are dropped
            }

            if (halvedSegments.length === 0) return [];

            // 3. Find centroid of original to anchor the halved boundary
            let cenN = 0, cenJ = 0;
            for (const v of latticePoints) { cenN += v.n; cenJ += v.j; }
            const anchorN = Math.round(cenN / latticePoints.length);
            const anchorJ = Math.round(cenJ / latticePoints.length);

            // 4. Reconstruct boundary vertices from halved segments
            const newVertices = [];
            let n = anchorN, j = anchorJ;
            for (const seg of halvedSegments) {
                for (let m = 0; m < seg.length; m++) {
                    newVertices.push(getVertex(n, j));
                    n += seg.dn;
                    j += seg.dj;
                }
            }
            return newVertices;
        }

        const scaledBoundaries = latticeBoundaries.map(halveBoundary);
        const scaledOuter = scaledBoundaries[outerIdx];
        const scaledHoles = scaledBoundaries.filter((_, i) => i !== outerIdx && scaledBoundaries[i].length > 0);

        if (scaledOuter.length < 3) {
            console.warn('Region too small to halve (all segments were length 1).');
            return triangles;
        }

        // Rasterization: Fill the new geometry
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const v of scaledOuter) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }

        const newTriangles = new Map();

        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {

                // Check Type 1 (Black/Right-Facing)
                const rc = getRightTriangleCentroid(n, j);
                if (pointInPolygonPreset(rc.x, rc.y, scaledOuter)) {
                    let inHole = false;
                    for (const hole of scaledHoles) {
                        if (pointInPolygonPreset(rc.x, rc.y, hole)) {
                            inHole = true;
                            break;
                        }
                    }
                    if (!inHole) {
                        const key = `${n},${j},1`;
                        newTriangles.set(key, { n, j, type: 1 });
                    }
                }

                // Check Type 2 (White/Left-Facing)
                const lc = getLeftTriangleCentroid(n, j);
                if (pointInPolygonPreset(lc.x, lc.y, scaledOuter)) {
                    let inHole = false;
                    for (const hole of scaledHoles) {
                        if (pointInPolygonPreset(lc.x, lc.y, hole)) {
                            inHole = true;
                            break;
                        }
                    }
                    if (!inHole) {
                        const key = `${n},${j},2`;
                        newTriangles.set(key, { n, j, type: 2 });
                    }
                }
            }
        }

        return newTriangles;
    }

    // ========================================================================
    // WEBGL2 INSTANCED LOZENGE RENDERER
    // ========================================================================
    class WebGLLozengeRenderer {
        constructor() {
            this.glCanvas = document.createElement('canvas');
            this.gl = null;
            this.program = null;
            this.instanceBuffer = null;
            this.vertexBuffer = null;
            this.maxInstances = 0;
            this.ready = false;
        }

        init() {
            const gl = this.glCanvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: true });
            if (!gl) return false;
            this.gl = gl;

            // Vertex shader: computes lozenge vertex positions from (bn, bj, type)
            // Uses the same coordinate math as getVertex + toCanvas
            const vsSource = `#version 300 es
            // Per-vertex: which corner of the rhombus (0-5 for 2 triangles)
            in float a_vertexId;
            // Per-instance: bn, bj, type
            in vec3 a_instance;

            uniform vec2 u_resolution;  // canvas size in CSS pixels
            uniform float u_scale;
            uniform vec2 u_center;      // centerX, centerY in CSS pixels
            uniform float u_rotated;    // 0.0 or 1.0

            out vec2 v_uv;  // parametric coords for edge detection
            flat out int v_type;

            const float SLOPE = 0.5773502691896258;  // 1/sqrt(3)
            const float DELTA_C = 1.1547005383792517; // 2/sqrt(3)

            // getVertex(n, j) -> (x, y) in world coords
            vec2 getVertex(float n, float j) {
                return vec2(n, SLOPE * n + j * DELTA_C);
            }

            // toCanvas(x, y) -> canvas pixel coords
            vec2 toCanvas(vec2 world) {
                if (u_rotated > 0.5) {
                    return vec2(u_center.x + world.y * u_scale, u_center.y + world.x * u_scale);
                }
                return vec2(u_center.x + world.x * u_scale, u_center.y - world.y * u_scale);
            }

            void main() {
                float bn = a_instance.x;
                float bj = a_instance.y;
                int type = int(a_instance.z);
                v_type = type;

                // 4 corners of the rhombus in lattice coords (n, j)
                // Vertex order: 0=v0, 1=v1, 2=v2, 3=v3
                // Two triangles: (0,1,2) and (0,2,3)
                vec2 corners[4];
                if (type == 0) {
                    corners[0] = vec2(bn, bj);
                    corners[1] = vec2(bn + 1.0, bj);
                    corners[2] = vec2(bn + 1.0, bj - 1.0);
                    corners[3] = vec2(bn, bj - 1.0);
                } else if (type == 1) {
                    corners[0] = vec2(bn, bj);
                    corners[1] = vec2(bn + 1.0, bj - 1.0);
                    corners[2] = vec2(bn + 1.0, bj - 2.0);
                    corners[3] = vec2(bn, bj - 1.0);
                } else {
                    corners[0] = vec2(bn - 1.0, bj);
                    corners[1] = vec2(bn, bj);
                    corners[2] = vec2(bn + 1.0, bj - 1.0);
                    corners[3] = vec2(bn, bj - 1.0);
                }

                // Map vertex ID to corner index and UV
                int vid = int(a_vertexId);
                // Triangle 1: 0,1,2  Triangle 2: 0,2,3
                int cornerIdx;
                vec2 uv;
                if (vid == 0) { cornerIdx = 0; uv = vec2(0.0, 0.0); }
                else if (vid == 1) { cornerIdx = 1; uv = vec2(1.0, 0.0); }
                else if (vid == 2) { cornerIdx = 2; uv = vec2(1.0, 1.0); }
                else if (vid == 3) { cornerIdx = 0; uv = vec2(0.0, 0.0); }
                else if (vid == 4) { cornerIdx = 2; uv = vec2(1.0, 1.0); }
                else { cornerIdx = 3; uv = vec2(0.0, 1.0); }

                v_uv = uv;

                // Convert lattice -> world -> canvas -> NDC
                vec2 world = getVertex(corners[cornerIdx].x, corners[cornerIdx].y);
                vec2 pixel = toCanvas(world);

                // Canvas pixel coords -> NDC: x: [0, width] -> [-1, 1], y: [0, height] -> [1, -1]
                gl_Position = vec4(
                    2.0 * pixel.x / u_resolution.x - 1.0,
                    1.0 - 2.0 * pixel.y / u_resolution.y,
                    0.0, 1.0
                );
            }`;

            const fsSource = `#version 300 es
            precision mediump float;

            in vec2 v_uv;
            flat in int v_type;

            uniform vec3 u_colors[3];      // RGB for each type
            uniform vec3 u_outlineColor;
            uniform float u_outlineWidth;  // in UV-space (0 = no outline)

            out vec4 fragColor;

            void main() {
                // Distance to nearest edge in UV space
                float edgeDist = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));

                vec3 color;
                if (v_type == 0) color = u_colors[0];
                else if (v_type == 1) color = u_colors[1];
                else color = u_colors[2];

                if (u_outlineWidth > 0.0 && edgeDist < u_outlineWidth) {
                    // Smooth edge with anti-aliasing
                    float aa = fwidth(edgeDist);
                    float t = smoothstep(u_outlineWidth - aa, u_outlineWidth, edgeDist);
                    color = mix(u_outlineColor, color, t);
                }

                fragColor = vec4(color, 1.0);
            }`;

            const vs = this._compileShader(gl, gl.VERTEX_SHADER, vsSource);
            const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
            if (!vs || !fs) return false;

            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('WebGL program link error:', gl.getProgramInfoLog(program));
                return false;
            }
            this.program = program;

            // Get attribute/uniform locations
            this.loc = {
                vertexId: gl.getAttribLocation(program, 'a_vertexId'),
                instance: gl.getAttribLocation(program, 'a_instance'),
                resolution: gl.getUniformLocation(program, 'u_resolution'),
                scale: gl.getUniformLocation(program, 'u_scale'),
                center: gl.getUniformLocation(program, 'u_center'),
                rotated: gl.getUniformLocation(program, 'u_rotated'),
                colors: gl.getUniformLocation(program, 'u_colors'),
                outlineColor: gl.getUniformLocation(program, 'u_outlineColor'),
                outlineWidth: gl.getUniformLocation(program, 'u_outlineWidth'),
            };

            // Create vertex buffer: 6 vertex IDs (0-5) for the two triangles
            this.vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 2, 3, 4, 5]), gl.STATIC_DRAW);

            // Create VAO
            this.vao = gl.createVertexArray();
            gl.bindVertexArray(this.vao);

            // Vertex ID attribute (per-vertex)
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.enableVertexAttribArray(this.loc.vertexId);
            gl.vertexAttribPointer(this.loc.vertexId, 1, gl.FLOAT, false, 0, 0);

            // Instance attribute (per-instance) - will be filled later
            this.instanceBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
            gl.enableVertexAttribArray(this.loc.instance);
            gl.vertexAttribPointer(this.loc.instance, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(this.loc.instance, 1);

            gl.bindVertexArray(null);

            this.ready = true;
            return true;
        }

        _compileShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('WebGL shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        _hexToRGB(hex) {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return [r, g, b];
        }

        /**
         * Draw lozenges using WebGL2 instanced rendering.
         * @param {CanvasRenderingContext2D} ctx2d - The 2D canvas context to draw onto
         * @param {Array} dimers - Array of {bn, bj, t} objects
         * @param {number} centerX - View center X in CSS pixels
         * @param {number} centerY - View center Y in CSS pixels
         * @param {number} scale - Pixels per world unit
         * @param {boolean} rotated - Whether view is rotated
         * @param {Array} colors - Array of 3 hex color strings
         * @param {string} outlineColor - Hex color for outlines
         * @param {number} outlineWidth - Outline width (0 = no outlines)
         * @param {number} displayWidth - Canvas CSS width
         * @param {number} displayHeight - Canvas CSS height
         * @param {number} dpr - Device pixel ratio
         */
        draw(ctx2d, dimers, centerX, centerY, scale, rotated, colors, outlineColor, outlineWidth, displayWidth, displayHeight, dpr) {
            if (!this.ready || dimers.length === 0) return false;

            const gl = this.gl;
            const count = dimers.length;

            // Resize GL canvas to match the 2D canvas physical size
            const physW = Math.round(displayWidth * dpr);
            const physH = Math.round(displayHeight * dpr);
            if (this.glCanvas.width !== physW || this.glCanvas.height !== physH) {
                this.glCanvas.width = physW;
                this.glCanvas.height = physH;
            }

            // Upload instance data
            if (count > this.maxInstances) {
                this.maxInstances = Math.max(count, this.maxInstances * 2 || 1024);
                this.instanceData = new Float32Array(this.maxInstances * 3);
            }
            const data = this.instanceData;
            for (let i = 0; i < count; i++) {
                const d = dimers[i];
                const off = i * 3;
                data[off] = d.bn;
                data[off + 1] = d.bj;
                data[off + 2] = d.t;
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.buffer, 0, count * 3), gl.DYNAMIC_DRAW);

            // Set viewport and clear
            gl.viewport(0, 0, physW, physH);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(this.program);
            gl.bindVertexArray(this.vao);

            // Uniforms - scale coordinates by dpr since GL canvas is in physical pixels
            gl.uniform2f(this.loc.resolution, displayWidth * dpr, displayHeight * dpr);
            gl.uniform1f(this.loc.scale, scale * dpr);
            gl.uniform2f(this.loc.center, centerX * dpr, centerY * dpr);
            gl.uniform1f(this.loc.rotated, rotated ? 1.0 : 0.0);

            // Colors
            const c0 = this._hexToRGB(colors[0]);
            const c1 = this._hexToRGB(colors[1]);
            const c2 = this._hexToRGB(colors[2]);
            gl.uniform3fv(this.loc.colors, new Float32Array([...c0, ...c1, ...c2]));

            const oc = this._hexToRGB(outlineColor);
            gl.uniform3f(this.loc.outlineColor, oc[0], oc[1], oc[2]);
            // Convert outline width from pixel-like units to UV space
            // A lozenge in UV space spans [0,1] x [0,1]; in pixel space it spans ~scale pixels
            // outlineWidth is already a fraction (e.g., 0.1 scaled by density)
            // We need it in UV space: outlineWidth_uv = outlineWidth_pixels / lozenge_size_pixels
            // lozenge_size_pixels ~ scale (since each lozenge edge is ~1 world unit)
            const lozengePixelSize = scale * dpr;
            const outlineUV = lozengePixelSize > 0 ? (outlineWidth * dpr * 0.5) / lozengePixelSize : 0;
            gl.uniform1f(this.loc.outlineWidth, outlineUV);

            // Draw instanced
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);

            gl.bindVertexArray(null);

            // Blit GL canvas onto 2D canvas
            ctx2d.drawImage(this.glCanvas, 0, 0, physW, physH, 0, 0, displayWidth, displayHeight);
            return true;
        }
    }

    // ========================================================================
    // RENDERER
    // ========================================================================
    class LozengeRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.outlineWidthPct = 0.1;
            this.borderWidthPct = 1;
            this.pathWidthPx = 2;
            this.pathMode = 0; // 0=off, 1=types 0+1, 2=types 1+2, 3=types 0+2
            this.showDimerView = false;
            this.showGrid = true;
            this.showBoundaryLengths = false;
            this.showHoleLengths = true;
            this.labelSize = 1.0;
            this.labelOffset = 1.5;
            this.rotated = false;
            this.usePeriodicWeights = false;
            this.periodicK = 2;
            this.periodicQ = [
                [1, 100],
                [0.003333, 3]
            ];
            this.currentPaletteIndex = 0;
            this.colorPermutation = 0;
            this.useCustomColors = false;
            this.customColors = ['#E57200', '#232D4B', '#F9DCBF'];
            this.holeColor = '#FFFFFF';
            this.colorPalettes = window.ColorSchemes || [{ name: 'UVA', colors: ['#E57200', '#232D4B', '#F9DCBF', '#002D62'] }];
            this.gridSize = 100;
            // Pan and zoom state
            this.zoom = 1;
            this.panX = 0; // In world coordinates
            this.panY = 0;
            this.minZoom = 0.02;
            this.maxZoom = 10;
            // WebGL2 instanced renderer for fast lozenge drawing
            this.glRenderer = new WebGLLozengeRenderer();
            this.useWebGL = this.glRenderer.init();
            if (this.useWebGL) console.log('WebGL2 instanced lozenge renderer enabled');
            this.setupCanvas();
        }

        setupCanvas() {
            const rect = this.canvas.getBoundingClientRect();
            // FIX: Cap dpr at 2.0 to prevent iOS Canvas Memory Eviction (saves ~55% VRAM)
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.ctx.scale(dpr, dpr);
            this.displayWidth = rect.width;
            this.displayHeight = rect.height;
        }

        getCurrentPalette() { return this.colorPalettes[this.currentPaletteIndex]; }

        getPermutedColors() {
            if (this.useCustomColors) {
                const permutations = [
                    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
                ];
                const perm = permutations[this.colorPermutation || 0];
                return [this.customColors[perm[0]], this.customColors[perm[1]], this.customColors[perm[2]]];
            }
            const palette = this.getCurrentPalette();
            const permutations = [
                [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
            ];
            const perm = permutations[this.colorPermutation || 0];
            return [palette.colors[perm[0]], palette.colors[perm[1]], palette.colors[perm[2]]];
        }

        toCanvas(x, y, centerX, centerY, scale) {
            if (this.rotated) {
                return [centerX + y * scale, centerY + x * scale];
            }
            return [centerX + x * scale, centerY - y * scale];
        }

        fromCanvas(cx, cy, centerX, centerY, scale) {
            if (this.rotated) {
                const y = (cx - centerX) / scale;
                const x = (cy - centerY) / scale;
                return { x, y };
            }
            const x = (cx - centerX) / scale;
            const y = (centerY - cy) / scale;
            return { x, y };
        }

        getTransform(activeTriangles) {
            // Base scale: fit a reasonable view (e.g., 20 units across)
            const baseViewSize = 20; // World units visible at zoom=1
            const baseScale = Math.min(this.displayWidth, this.displayHeight) / baseViewSize;
            const scale = baseScale * this.zoom;

            // Center position (incorporating pan)
            const centerX = this.displayWidth / 2 - this.panX * scale;
            const centerY = this.displayHeight / 2 + this.panY * scale;

            return { centerX, centerY, scale };
        }

        // Zoom centered on a point (in canvas coordinates)
        zoomAt(canvasX, canvasY, factor) {
            const { centerX, centerY, scale } = this.getTransform();

            // Convert canvas point to world coordinates before zoom
            const worldX = (canvasX - centerX) / scale;
            const worldY = (centerY - canvasY) / scale;

            // Apply zoom
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
            const actualFactor = newZoom / this.zoom;
            this.zoom = newZoom;

            // Adjust pan so the world point stays at the same canvas position
            const newScale = scale * actualFactor;
            this.panX = (this.displayWidth / 2 - canvasX) / newScale + worldX;
            this.panY = (canvasY - this.displayHeight / 2) / newScale + worldY;
        }

        // Pan by canvas delta
        pan(deltaCanvasX, deltaCanvasY) {
            const { scale } = this.getTransform();
            this.panX -= deltaCanvasX / scale;
            this.panY += deltaCanvasY / scale;
        }

        resetView() {
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
        }

        // Fit view to show all active triangles with padding
        fitToRegion(activeTriangles) {
            if (activeTriangles.size === 0) {
                this.resetView();
                return;
            }

            // Calculate bounding box in world coords
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const [key, tri] of activeTriangles) {
                let verts;
                if (tri.type === 1) {
                    verts = [getVertex(tri.n, tri.j), getVertex(tri.n, tri.j - 1), getVertex(tri.n + 1, tri.j - 1)];
                } else {
                    verts = [getVertex(tri.n, tri.j), getVertex(tri.n + 1, tri.j), getVertex(tri.n + 1, tri.j - 1)];
                }
                for (const v of verts) {
                    minX = Math.min(minX, v.x);
                    maxX = Math.max(maxX, v.x);
                    minY = Math.min(minY, v.y);
                    maxY = Math.max(maxY, v.y);
                }
            }

            // Add padding
            const padding = 2;
            minX -= padding;
            maxX += padding;
            minY -= padding;
            maxY += padding;

            // Calculate center and zoom
            const centerWorldX = (minX + maxX) / 2;
            const centerWorldY = (minY + maxY) / 2;
            const rangeX = maxX - minX;
            const rangeY = maxY - minY;

            // Fit to canvas
            const baseViewSize = 20;
            const minDim = Math.min(this.displayWidth, this.displayHeight);
            if (minDim <= 0 || rangeX <= 0 || rangeY <= 0) return;
            const neededZoomX = this.displayWidth / rangeX / (minDim / baseViewSize);
            const neededZoomY = this.displayHeight / rangeY / (minDim / baseViewSize);
            this.zoom = Math.min(neededZoomX, neededZoomY);

            // Set pan to center the region
            this.panX = centerWorldX;
            this.panY = centerWorldY;
        }

        getLozengeVertices(dimer) {
            const { bn, bj, t } = dimer;
            if (t === 0) {
                return [getVertex(bn, bj), getVertex(bn + 1, bj), getVertex(bn + 1, bj - 1), getVertex(bn, bj - 1)];
            } else if (t === 1) {
                return [getVertex(bn, bj), getVertex(bn + 1, bj - 1), getVertex(bn + 1, bj - 2), getVertex(bn, bj - 1)];
            } else {
                return [getVertex(bn - 1, bj), getVertex(bn, bj), getVertex(bn + 1, bj - 1), getVertex(bn, bj - 1)];
            }
        }

        draw(sim, activeTriangles, isValid) {
            const ctx = this.ctx;
            if (!ctx) {
                console.error('RENDERER: ctx is null!');
                return;
            }
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

            ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
            ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

            const { centerX, centerY, scale } = this.getTransform(activeTriangles);

            // Skip draw if canvas has no dimensions (e.g. hidden in 3D mode)
            if (scale <= 0 || !isFinite(scale)) return;

            // Draw background grid
            this.drawBackgroundGrid(ctx, centerX, centerY, scale, isDarkMode);

            // Draw active triangles (if not showing dimers or if invalid)
            // Skip coloring triangles in dimer view for large polygons (>1000 black triangles)
            const skipTriangleColoring = this.showDimerView && sim.blackTriangles && sim.blackTriangles.length > 1000;
            if (!isValid || (this.showDimerView && !skipTriangleColoring)) {
                this.drawActiveTriangles(ctx, activeTriangles, centerX, centerY, scale, isValid);
            }

            // Draw dimers/lozenges if valid
            if (isValid && sim.dimers.length > 0) {
                if (this.showDimerView) {
                    this.drawDimerView(ctx, sim, centerX, centerY, scale, activeTriangles);
                } else {
                    this.drawLozengeView(ctx, sim, centerX, centerY, scale, isDarkMode);
                }
                // Draw nonintersecting paths overlay
                this.drawPaths(ctx, sim, centerX, centerY, scale);
            }

            // Fill holes with hole color
            if (isValid && sim.boundaries && sim.boundaries.length > 1) {
                this.drawHoleFills(ctx, sim.boundaries, centerX, centerY, scale);
            }

            // Draw all boundaries (outer + holes + disconnected)
            if (sim.boundaries && sim.boundaries.length > 0) {
                for (const boundary of sim.boundaries) {
                    this.drawBoundary(ctx, boundary, centerX, centerY, scale, isDarkMode);
                }
            }

            // Draw boundary segment lengths if enabled
            if (this.showBoundaryLengths && sim.segments && sim.segments.length > 0) {
                // Find outer boundary index (largest absolute area)
                let outerIdx = 0;
                let maxArea = 0;
                for (let i = 0; i < sim.boundaries.length; i++) {
                    const b = sim.boundaries[i];
                    let area = 0;
                    for (let j = 0; j < b.length; j++) {
                        const k = (j + 1) % b.length;
                        area += b[j].x * b[k].y - b[k].x * b[j].y;
                    }
                    if (Math.abs(area) > maxArea) {
                        maxArea = Math.abs(area);
                        outerIdx = i;
                    }
                }
                // Draw segments, skip holes if showHoleLengths is false
                for (let i = 0; i < sim.segments.length; i++) {
                    const isHole = (i !== outerIdx);
                    if (isHole && !this.showHoleLengths) continue;
                    this.drawBoundaryLengths(ctx, sim.segments[i], centerX, centerY, scale, isDarkMode, sim.boundaries);
                }
            }

        }

        drawBackgroundGrid(ctx, centerX, centerY, scale, isDarkMode) {
            if (!this.showGrid) return;

            // Dynamically calculate visible range based on current view
            // Sample all corners and edges of canvas to find world bounds
            const corners = [
                this.fromCanvas(0, 0, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth, 0, centerX, centerY, scale),
                this.fromCanvas(0, this.displayHeight, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth, this.displayHeight, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth / 2, 0, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth / 2, this.displayHeight, centerX, centerY, scale),
                this.fromCanvas(0, this.displayHeight / 2, centerX, centerY, scale),
                this.fromCanvas(this.displayWidth, this.displayHeight / 2, centerX, centerY, scale),
            ];

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const c of corners) {
                minX = Math.min(minX, c.x);
                maxX = Math.max(maxX, c.x);
                minY = Math.min(minY, c.y);
                maxY = Math.max(maxY, c.y);
            }

            // Add generous margin that scales with view size
            const viewRange = Math.max(maxX - minX, maxY - minY);
            const margin = Math.ceil(viewRange * 0.5) + 10;

            minX -= margin;
            maxX += margin;
            minY -= margin;
            maxY += margin;

            // Calculate n and j ranges for the triangular lattice
            const minN = Math.floor(minX) - 5;
            const maxN = Math.ceil(maxX) + 5;
            const minJ = Math.floor(minY / deltaC) - Math.ceil(viewRange) - 5;
            const maxJ = Math.ceil(maxY / deltaC) + Math.ceil(viewRange) + 5;

            ctx.strokeStyle = isDarkMode ? 'rgba(200, 200, 200, 0.4)' : 'rgba(200, 200, 200, 0.5)';
            ctx.lineWidth = 0.5;

            // Vertical lines (n = const)
            for (let n = minN; n <= maxN; n++) {
                const y1 = slope * n + minJ * deltaC;
                const y2 = slope * n + maxJ * deltaC;
                const [x1c, y1c] = this.toCanvas(n, y1, centerX, centerY, scale);
                const [x2c, y2c] = this.toCanvas(n, y2, centerX, centerY, scale);
                ctx.beginPath(); ctx.moveTo(x1c, y1c); ctx.lineTo(x2c, y2c); ctx.stroke();
            }

            // +slope lines (j = const in lattice coords)
            for (let j = minJ; j <= maxJ; j++) {
                const [x1c, y1c] = this.toCanvas(minN, slope * minN + j * deltaC, centerX, centerY, scale);
                const [x2c, y2c] = this.toCanvas(maxN, slope * maxN + j * deltaC, centerX, centerY, scale);
                ctx.beginPath(); ctx.moveTo(x1c, y1c); ctx.lineTo(x2c, y2c); ctx.stroke();
            }

            // -slope lines
            for (let j = minJ; j <= maxJ; j++) {
                const [x1c, y1c] = this.toCanvas(minN, -slope * minN + j * deltaC, centerX, centerY, scale);
                const [x2c, y2c] = this.toCanvas(maxN, -slope * maxN + j * deltaC, centerX, centerY, scale);
                ctx.beginPath(); ctx.moveTo(x1c, y1c); ctx.lineTo(x2c, y2c); ctx.stroke();
            }
        }

        drawActiveTriangles(ctx, activeTriangles, centerX, centerY, scale, isValid, outlinesOnly = false) {
            for (const [key, tri] of activeTriangles) {
                let verts;
                if (tri.type === 1) {
                    // Black (right-facing): (n,j), (n,j-1), (n+1,j-1)
                    verts = [getVertex(tri.n, tri.j), getVertex(tri.n, tri.j - 1), getVertex(tri.n + 1, tri.j - 1)];
                } else {
                    // White (left-facing): (n,j), (n+1,j), (n+1,j-1)
                    verts = [getVertex(tri.n, tri.j), getVertex(tri.n + 1, tri.j), getVertex(tri.n + 1, tri.j - 1)];
                }

                const canvasVerts = verts.map(v => this.toCanvas(v.x, v.y, centerX, centerY, scale));

                ctx.beginPath();
                ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
                ctx.lineTo(canvasVerts[1][0], canvasVerts[1][1]);
                ctx.lineTo(canvasVerts[2][0], canvasVerts[2][1]);
                ctx.closePath();

                // Skip fills for outlines-only mode (e.g., double dimer view)
                if (!outlinesOnly) {
                    // Color: blue for black, orange for white; red tint if invalid
                    if (!isValid) {
                        ctx.fillStyle = 'rgba(200, 50, 50, 0.4)';
                    } else {
                        ctx.fillStyle = tri.type === 1 ? 'rgba(50, 100, 200, 0.3)' : 'rgba(200, 150, 50, 0.3)';
                    }
                    ctx.fill();
                }

                ctx.strokeStyle = tri.type === 1 ? '#3366cc' : '#cc9933';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        drawLozengeView(ctx, sim, centerX, centerY, scale, isDarkMode = false) {
            const colors = this.getPermutedColors();
            const dimerCount = sim.dimers.length || 1;
            const refDimerCount = 100;
            const outlineWidth = this.outlineWidthPct * (refDimerCount / dimerCount);
            const outlineColor = isDarkMode ? '#aaaaaa' : '#000000';

            // Try WebGL2 instanced path
            if (this.useWebGL && this.glRenderer) {
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const ok = this.glRenderer.draw(
                    ctx, sim.dimers,
                    centerX, centerY, scale, this.rotated,
                    colors, outlineColor, outlineWidth,
                    this.displayWidth, this.displayHeight, dpr
                );
                if (ok) return;
            }

            // Canvas 2D fallback
            for (const dimer of sim.dimers) {
                const verts = this.getLozengeVertices(dimer);
                const canvasVerts = verts.map(v => this.toCanvas(v.x, v.y, centerX, centerY, scale));
                ctx.fillStyle = colors[dimer.t];
                ctx.beginPath();
                ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
                for (let i = 1; i < canvasVerts.length; i++) ctx.lineTo(canvasVerts[i][0], canvasVerts[i][1]);
                ctx.closePath();
                ctx.fill();
                if (outlineWidth > 0) {
                    ctx.strokeStyle = outlineColor;
                    ctx.lineWidth = outlineWidth;
                    ctx.stroke();
                }
            }
        }

        drawPaths(ctx, sim, centerX, centerY, scale) {
            if (this.pathMode === 0) return;

            // 3 path families, each through 2 of the 3 lozenge types
            // Mode 1: types 0+1 (excludes type 2)
            // Mode 2: types 1+2 (excludes type 0)
            // Mode 3: types 0+2 (excludes type 1)
            const excludedType = this.pathMode === 1 ? 2 : (this.pathMode === 2 ? 0 : 1);

            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            ctx.strokeStyle = isDarkMode ? '#ffffff' : '#333333';
            ctx.lineWidth = this.pathWidthPx;
            ctx.lineCap = 'round';

            for (const dimer of sim.dimers) {
                if (dimer.t === excludedType) continue;

                const verts = this.getLozengeVertices(dimer);
                // Lozenges are rhombi with 4 vertices: [0, 1, 2, 3]
                // Two pairs of parallel edges:
                //   Pair A: (0-1, 2-3)
                //   Pair B: (1-2, 3-0)
                // Which pair to use depends on mode and lozenge type for proper connectivity

                let mid1, mid2;
                const t = dimer.t;

                if (this.pathMode === 1) {
                    // Types 0+1: use Pair B for both
                    mid1 = { x: (verts[1].x + verts[2].x) / 2, y: (verts[1].y + verts[2].y) / 2 };
                    mid2 = { x: (verts[3].x + verts[0].x) / 2, y: (verts[3].y + verts[0].y) / 2 };
                } else if (this.pathMode === 2) {
                    // Types 1+2: type 1 uses Pair A, type 2 uses Pair B
                    if (t === 1) {
                        mid1 = { x: (verts[0].x + verts[1].x) / 2, y: (verts[0].y + verts[1].y) / 2 };
                        mid2 = { x: (verts[2].x + verts[3].x) / 2, y: (verts[2].y + verts[3].y) / 2 };
                    } else {
                        mid1 = { x: (verts[1].x + verts[2].x) / 2, y: (verts[1].y + verts[2].y) / 2 };
                        mid2 = { x: (verts[3].x + verts[0].x) / 2, y: (verts[3].y + verts[0].y) / 2 };
                    }
                } else {
                    // Mode 3: Types 0+2: use Pair A for both (correct)
                    mid1 = { x: (verts[0].x + verts[1].x) / 2, y: (verts[0].y + verts[1].y) / 2 };
                    mid2 = { x: (verts[2].x + verts[3].x) / 2, y: (verts[2].y + verts[3].y) / 2 };
                }

                const [c1x, c1y] = this.toCanvas(mid1.x, mid1.y, centerX, centerY, scale);
                const [c2x, c2y] = this.toCanvas(mid2.x, mid2.y, centerX, centerY, scale);
                ctx.beginPath();
                ctx.moveTo(c1x, c1y);
                ctx.lineTo(c2x, c2y);
                ctx.stroke();
            }
        }

        drawDimerView(ctx, sim, centerX, centerY, scale, activeTriangles) {
            // Draw dimer edges
            ctx.strokeStyle = '#000';
            // Use thinner lines for large polygons (>1000 black triangles)
            const isLargePolygon = sim.blackTriangles && sim.blackTriangles.length > 1000;
            ctx.lineWidth = isLargePolygon ? 1 : 3;
            for (const dimer of sim.dimers) {
                const bc = sim.blackTriangles.find(b => b.n === dimer.bn && b.j === dimer.bj);
                const wc = sim.whiteTriangles.find(w => w.n === dimer.wn && w.j === dimer.wj);
                if (bc && wc) {
                    const [bcx, bcy] = this.toCanvas(bc.cx, bc.cy, centerX, centerY, scale);
                    const [wcx, wcy] = this.toCanvas(wc.cx, wc.cy, centerX, centerY, scale);
                    ctx.beginPath(); ctx.moveTo(bcx, bcy); ctx.lineTo(wcx, wcy); ctx.stroke();
                }
            }

            // Draw periodic weights at face centers if enabled
            if (this.usePeriodicWeights && activeTriangles) {
                // Collect unique vertices from active triangles
                const vertices = new Map();
                for (const [key, tri] of activeTriangles) {
                    // Each triangle has 3 vertices
                    const addVertex = (n, j) => {
                        const vkey = `${n},${j}`;
                        if (!vertices.has(vkey)) {
                            vertices.set(vkey, { n, j });
                        }
                    };
                    if (tri.type === 1) {
                        addVertex(tri.n, tri.j);
                        addVertex(tri.n, tri.j - 1);
                        addVertex(tri.n + 1, tri.j - 1);
                    } else {
                        addVertex(tri.n, tri.j);
                        addVertex(tri.n + 1, tri.j);
                        addVertex(tri.n + 1, tri.j - 1);
                    }
                }

                // Skip drawing q-labels if too many vertices
                if (vertices.size > 100) return;

                // Draw q values at each vertex
                const fontSize = Math.max(12, Math.min(24, scale * 0.7));
                ctx.font = `${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                ctx.fillStyle = isDark ? '#fff' : '#000';

                for (const [vkey, v] of vertices) {
                    const k = this.periodicK;
                    const ni = ((v.n % k) + k) % k;
                    const ji = ((v.j % k) + k) % k;
                    const q = this.periodicQ[ni][ji];
                    const worldX = v.n;
                    const worldY = v.n / Math.sqrt(3) + v.j * 2 / Math.sqrt(3);
                    const [cx, cy] = this.toCanvas(worldX, worldY, centerX, centerY, scale);
                    ctx.fillText(q.toString(), cx, cy);
                }
            }
        }

        // Draw double dimer configuration (both min and max) for CFTP visualization
        drawDoubleDimerView(ctx, sim, minDimers, maxDimers, centerX, centerY, scale) {
            const isLargePolygon = sim.blackTriangles && sim.blackTriangles.length > 1000;
            const lineWidth = isLargePolygon ? 1 : 3;

            // Create maps for fast lookup
            const minSet = new Set(minDimers.map(d => `${d.bn},${d.bj},${d.wn},${d.wj}`));
            const maxSet = new Set(maxDimers.map(d => `${d.bn},${d.bj},${d.wn},${d.wj}`));

            // Combine all dimers
            const allDimers = new Map();
            for (const d of minDimers) {
                const key = `${d.bn},${d.bj},${d.wn},${d.wj}`;
                allDimers.set(key, d);
            }
            for (const d of maxDimers) {
                const key = `${d.bn},${d.bj},${d.wn},${d.wj}`;
                allDimers.set(key, d);
            }

            // Draw dimers with different styles
            for (const [key, dimer] of allDimers) {
                const inMin = minSet.has(key);
                const inMax = maxSet.has(key);

                const bc = sim.blackTriangles.find(b => b.n === dimer.bn && b.j === dimer.bj);
                const wc = sim.whiteTriangles.find(w => w.n === dimer.wn && w.j === dimer.wj);
                if (bc && wc) {
                    const [bcx, bcy] = this.toCanvas(bc.cx, bc.cy, centerX, centerY, scale);
                    const [wcx, wcy] = this.toCanvas(wc.cx, wc.cy, centerX, centerY, scale);

                    if (inMin && inMax) {
                        // Coalesced dimers - solid black
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = lineWidth;
                        ctx.setLineDash([]);
                    } else if (inMax) {
                        // Only in max (upper bound) - blue
                        ctx.strokeStyle = '#2196F3';
                        ctx.lineWidth = lineWidth;
                        ctx.setLineDash([]);
                    } else {
                        // Only in min (lower bound) - red
                        ctx.strokeStyle = '#F44336';
                        ctx.lineWidth = lineWidth;
                        ctx.setLineDash([]);
                    }

                    ctx.beginPath();
                    ctx.moveTo(bcx, bcy);
                    ctx.lineTo(wcx, wcy);
                    ctx.stroke();
                }
            }
            ctx.setLineDash([]);
        }

        drawBoundary(ctx, boundary, centerX, centerY, scale, isDarkMode = false) {
            if (boundary.length < 2) return;
            ctx.strokeStyle = isDarkMode ? '#cccccc' : '#000';
            // Scale border width based on percentage (similar to outline scaling)
            const borderWidth = this.borderWidthPct * scale * 0.1;
            ctx.lineWidth = Math.max(0.5, borderWidth);
            ctx.beginPath();
            const [sx, sy] = this.toCanvas(boundary[0].x, boundary[0].y, centerX, centerY, scale);
            ctx.moveTo(sx, sy);
            for (let i = 1; i < boundary.length; i++) {
                const [px, py] = this.toCanvas(boundary[i].x, boundary[i].y, centerX, centerY, scale);
                ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Fill holes with hole color
        drawHoleFills(ctx, boundaries, centerX, centerY, scale) {
            if (!boundaries || boundaries.length <= 1) return;

            // Find outer boundary index (largest absolute area)
            let outerIdx = 0;
            let maxArea = 0;
            for (let i = 0; i < boundaries.length; i++) {
                const b = boundaries[i];
                let area = 0;
                for (let j = 0; j < b.length; j++) {
                    const k = (j + 1) % b.length;
                    area += b[j].x * b[k].y - b[k].x * b[j].y;
                }
                if (Math.abs(area) > maxArea) {
                    maxArea = Math.abs(area);
                    outerIdx = i;
                }
            }

            // Fill all boundaries except the outer one (those are holes)
            ctx.fillStyle = this.holeColor;
            for (let i = 0; i < boundaries.length; i++) {
                if (i === outerIdx) continue; // Skip outer boundary
                const boundary = boundaries[i];
                if (boundary.length < 3) continue;

                ctx.beginPath();
                const [sx, sy] = this.toCanvas(boundary[0].x, boundary[0].y, centerX, centerY, scale);
                ctx.moveTo(sx, sy);
                for (let j = 1; j < boundary.length; j++) {
                    const [px, py] = this.toCanvas(boundary[j].x, boundary[j].y, centerX, centerY, scale);
                    ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            }
        }

        // Draw pre-computed boundary segment lengths
        drawBoundaryLengths(ctx, segments, centerX, centerY, scale, isDarkMode, boundaries) {
            if (!segments || segments.length === 0) return;

            // Helper: point-in-polygon test (ray casting)
            const pointInPolygon = (x, y, polygon) => {
                if (!polygon || polygon.length < 3) return false;
                let inside = false;
                for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                    const xi = polygon[i].x, yi = polygon[i].y;
                    const xj = polygon[j].x, yj = polygon[j].y;
                    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                        inside = !inside;
                    }
                }
                return inside;
            };

            // Test if point is inside tileable region (inside odd number of boundaries)
            const isInsideRegion = (x, y) => {
                if (!boundaries || boundaries.length === 0) return false;
                let count = 0;
                for (const boundary of boundaries) {
                    if (pointInPolygon(x, y, boundary)) count++;
                }
                return count % 2 === 1;
            };

            // Font size controlled by labelSize parameter
            const baseFontSize = Math.max(13, Math.min(27, scale * 0.4));
            const fontSize = baseFontSize * this.labelSize;
            const latticeOffset = 0.8; // Offset in lattice units for testing
            ctx.font = `italic ${fontSize}px "Times New Roman", "Georgia", serif`;
            ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (const seg of segments) {
                const text = seg.len.toString();

                // Test candidate position in lattice coordinates
                let testX = seg.x + seg.nx * latticeOffset;
                let testY = seg.y + seg.ny * latticeOffset;

                // Determine direction: flip if candidate is inside the tileable region
                let flip = isInsideRegion(testX, testY) ? -1 : 1;

                // Transform normal to canvas coordinates based on rotation
                let nx, ny;
                if (this.rotated) {
                    nx = seg.ny * flip;
                    ny = seg.nx * flip;
                } else {
                    nx = seg.nx * flip;
                    ny = -seg.ny * flip;
                }

                // Position in canvas coordinates, offset controlled by labelOffset parameter
                const [cx, cy] = this.toCanvas(seg.x, seg.y, centerX, centerY, scale);
                const canvasOffset = fontSize * this.labelOffset;
                const labelX = cx + nx * canvasOffset;
                const labelY = cy + ny * canvasOffset;

                ctx.fillText(text, labelX, labelY);
            }
        }

        drawLasso(ctx, lassoPoints, centerX, centerY, scale, isFillMode, cursorPos = null) {
            if (lassoPoints.length === 0) return;

            const [sx, sy] = this.toCanvas(lassoPoints[0].x, lassoPoints[0].y, centerX, centerY, scale);

            // Draw existing points
            ctx.strokeStyle = isFillMode ? '#4CAF50' : '#f44336';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            for (let i = 1; i < lassoPoints.length; i++) {
                const [px, py] = this.toCanvas(lassoPoints[i].x, lassoPoints[i].y, centerX, centerY, scale);
                ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Draw preview line to cursor
            if (cursorPos && lassoPoints.length >= 1) {
                const lastPt = lassoPoints[lassoPoints.length - 1];
                const [lx, ly] = this.toCanvas(lastPt.x, lastPt.y, centerX, centerY, scale);
                const [cx, cy] = this.toCanvas(cursorPos.x, cursorPos.y, centerX, centerY, scale);
                ctx.strokeStyle = isFillMode ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.lineTo(cx, cy);
                // Also show line back to start if we have 2+ points
                if (lassoPoints.length >= 2) {
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Fill with semi-transparent color
            if (lassoPoints.length >= 3) {
                ctx.fillStyle = isFillMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)';
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                for (let i = 1; i < lassoPoints.length; i++) {
                    const [px, py] = this.toCanvas(lassoPoints[i].x, lassoPoints[i].y, centerX, centerY, scale);
                    ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            }

            // Draw start point indicator
            ctx.fillStyle = isFillMode ? '#4CAF50' : '#f44336';
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        setPalette(index) {
            this.currentPaletteIndex = ((index % this.colorPalettes.length) + this.colorPalettes.length) % this.colorPalettes.length;
            this.colorPermutation = 0;
            this.updateLegend();
        }

        nextPalette() { this.setPalette(this.currentPaletteIndex + 1); }
        prevPalette() { this.setPalette(this.currentPaletteIndex - 1); }

        permuteColors() {
            this.colorPermutation = ((this.colorPermutation || 0) + 1) % 6;
            this.updateLegend();
        }

        updateLegend() {
            // Legend removed from UI
        }
    }

    // ========================================================================
    // 3D RENDERER
    // ========================================================================

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

    class Lozenge3DRenderer {
        constructor(container) {
            this.container = container;
            this.colorPalettes = window.ColorSchemes || [{ name: 'UVA', colors: ['#E57200', '#232D4B', '#F9DCBF', '#002D62'] }];
            this.currentPaletteIndex = 0;
            this.colorPermutation = 0;
            this.useCustomColors = false;
            this.customColors = ['#E57200', '#232D4B', '#F9DCBF'];
            this.holeColor = '#FFFFFF';
            this.autoRotate = false;
            this.cameraInitialized = false;
            this.currentPresetIndex = 0;
            this.usePerspective = false;
            this.renderMode = 'standard';
            this.glauberRunning = false;
            this._legoMergedEdges = null;
            this._legoFP = null;

            // Three.js setup
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xffffff);

            // Camera with Z-up - start with orthographic since usePerspective is false
            const w = container.clientWidth;
            const h = container.clientHeight;
            const frustum = 150;
            const aspect = w / h;
            this.camera = new THREE.OrthographicCamera(
                -frustum * aspect / 2, frustum * aspect / 2,
                frustum / 2, -frustum / 2,
                0.1, 10000
            );
            this.camera.up.set(0, 0, 1);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(this.renderer.domElement);

            // Orbit controls
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enablePan = true;
            this.controls.panSpeed = 1.0;
            // Slower zoom for smoother experience
            this.controls.zoomSpeed = 0.5;
            // Better touch/trackpad support
            this.controls.enableZoom = true;
            this.controls.screenSpacePanning = true;
            // Touch gestures: one finger rotate, two finger zoom/pan
            this.controls.touches = {
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN
            };

            // Lighting - store references for preset changes
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

            // Group for meshes
            this.meshGroup = new THREE.Group();
            this.scene.add(this.meshGroup);

            // Apply default preset
            this.applyPreset(0);

            // Handle window resize
            window.addEventListener('resize', () => this.handleResize());

            // Start animation loop
            this.animate();
        }

        get legoMode() { return this.renderMode === 'lego'; }
        set legoMode(v) { this.renderMode = v ? 'lego' : 'standard'; }

        applyPreset(index) {
            this.currentPresetIndex = index % VISUAL_PRESETS_3D.length;
            const preset = VISUAL_PRESETS_3D[this.currentPresetIndex];

            // Background
            this.scene.background = new THREE.Color(preset.background);

            // Lights
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
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;

            // Save current camera target
            const target = this.controls.target.clone();

            if (this.usePerspective) {
                // Switch to perspective camera
                this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
                this.camera.up.set(0, 0, 1);
                this.camera.position.set(200, 200, 200);
            } else {
                // Switch to orthographic camera
                const frustum = 150;
                const aspect = w / h;
                this.camera = new THREE.OrthographicCamera(
                    -frustum * aspect / 2, frustum * aspect / 2,
                    frustum / 2, -frustum / 2,
                    0.1, 10000
                );
                this.camera.up.set(0, 0, 1);
                this.camera.position.set(150, 150, 150);
            }

            this.camera.lookAt(target);
            this.controls.dispose();
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.copy(target);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enablePan = true;
            this.controls.panSpeed = 1.0;
            this.controls.zoomSpeed = 0.5;
            this.controls.enableZoom = true;
            this.controls.screenSpacePanning = true;
            this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

            return this.usePerspective;
        }

        getCurrentPalette() { return this.colorPalettes[this.currentPaletteIndex]; }

        getPermutedColors() {
            if (this.useCustomColors) {
                const permutations = [
                    [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
                ];
                const perm = permutations[this.colorPermutation || 0];
                return [this.customColors[perm[0]], this.customColors[perm[1]], this.customColors[perm[2]]];
            }
            const palette = this.getCurrentPalette();
            const permutations = [
                [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]
            ];
            const perm = permutations[this.colorPermutation || 0];
            return [palette.colors[perm[0]], palette.colors[perm[1]], palette.colors[perm[2]]];
        }

        setPalette(index) {
            this.currentPaletteIndex = ((index % this.colorPalettes.length) + this.colorPalettes.length) % this.colorPalettes.length;
            this.colorPermutation = 0;
        }

        permuteColors() {
            const step = this.renderMode !== 'standard' ? 2 : 1;
            this.colorPermutation = ((this.colorPermutation || 0) + step) % 6;
        }

        setAutoRotate(enabled) {
            this.autoRotate = enabled;
        }

        // Convert lattice coords (n, j) + height to screen coords for hole labels
        worldToScreen3D(n, j, h) {
            const pos3d = new THREE.Vector3(h, -n - h, j - h);
            pos3d.project(this.camera);
            const rect = this.container.getBoundingClientRect();
            return {
                x: (pos3d.x * 0.5 + 0.5) * rect.width,
                y: (-pos3d.y * 0.5 + 0.5) * rect.height
            };
        }

        handleResize() {
            if (!this.container) return;
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            const aspect = width / height;

            if (this.usePerspective) {
                this.camera.aspect = aspect;
            } else {
                const frustum = 150;
                this.camera.left = -frustum * aspect / 2;
                this.camera.right = frustum * aspect / 2;
                this.camera.top = frustum / 2;
                this.camera.bottom = -frustum / 2;
            }
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }

        animate() {
            requestAnimationFrame(() => this.animate());

            // Manual auto-rotate around vertical axis through figure center
            if (this.autoRotate) {
                const target = this.controls.target;
                const offset = new THREE.Vector3();
                offset.subVectors(this.camera.position, target);

                // Rotate around Z-axis
                const angle = 0.01; // radians per frame (~0.57 deg)
                const axis = new THREE.Vector3(0, 0, 1);
                offset.applyAxisAngle(axis, angle);

                this.camera.position.copy(target).add(offset);
                this.camera.lookAt(target);
            }

            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        }

        dimersTo3D(dimers, boundaries) {
            // Clear existing geometry
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) { if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose(); }
                this.meshGroup.remove(child);
            }

            if (!dimers || dimers.length === 0) return;

            const colors = this.getPermutedColors();

            // Vertex keys for each dimer type
            const getVertexKeys = (dimer) => {
                const { bn, bj, t } = dimer;
                if (t === 0) {
                    return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
                } else if (t === 1) {
                    return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
                } else {
                    return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
                }
            };

            // Height patterns (relative z-heights of the 4 vertices)
            const getHeightPattern = (t) => {
                if (t === 0) return [0, 0, 0, 0];
                if (t === 1) return [1, 0, 0, 1];
                return [1, 1, 0, 0];
            };

            // 1. Build Vertex-to-Dimer Map
            const vertexToDimers = new Map();
            for (const dimer of dimers) {
                const verts = getVertexKeys(dimer);
                for (const [n, j] of verts) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }

            // 2. BFS to calculate Height Function h(n,j)
            const heights = new Map();
            if (dimers.length > 0) {
                const firstDimer = dimers[0];
                const firstVerts = getVertexKeys(firstDimer);
                const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
                heights.set(startKey, 0);

                const queue = [startKey];
                const visited = new Set();

                while (queue.length > 0) {
                    const currentKey = queue.shift();
                    if (visited.has(currentKey)) continue;
                    visited.add(currentKey);

                    const currentH = heights.get(currentKey);
                    const [cn, cj] = currentKey.split(',').map(Number);

                    for (const dimer of vertexToDimers.get(currentKey) || []) {
                        const verts = getVertexKeys(dimer);
                        const pattern = getHeightPattern(dimer.t);

                        // Find index of current vertex in this dimer
                        let myIdx = -1;
                        for (let i = 0; i < 4; i++) {
                            if (verts[i][0] === cn && verts[i][1] === cj) {
                                myIdx = i;
                                break;
                            }
                        }

                        if (myIdx >= 0) {
                            for (let i = 0; i < 4; i++) {
                                const [vn, vj] = verts[i];
                                const vkey = `${vn},${vj}`;
                                if (!heights.has(vkey)) {
                                    const newH = currentH + (pattern[i] - pattern[myIdx]);
                                    heights.set(vkey, newH);
                                    queue.push(vkey);
                                }
                            }
                        }
                    }
                }
            }

            // 3. Coordinate Transformation
            // Maps abstract lattice (n, j, h) to Cartesian (x, y, z)
            // Using x = n - h and y = j + h ensures that the "vertical drop" vector (1, -1)
            // maps to a constant (x, y) position, creating perfect vertical walls.
            // Height is negated (z = -h) to match 2D "empty room" interpretation.
            const to3D = (n, j, h) => {
                return {
                    x: h,
                    y: -n - h,
                    z: j - h
                };
            };

            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const normals = [];
            const vertexColors = [];
            const indices = [];

            const addQuad = (v1, v2, v3, v4, color) => {
                const baseIndex = vertices.length / 3;
                vertices.push(v1.x, v1.y, v1.z);
                vertices.push(v2.x, v2.y, v2.z);
                vertices.push(v3.x, v3.y, v3.z);
                vertices.push(v4.x, v4.y, v4.z);

                // Compute flat normal
                const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
                const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z }; // Use v4 for consistent winding
                const nx = edge1.y * edge2.z - edge1.z * edge2.y;
                const ny = edge1.z * edge2.x - edge1.x * edge2.z;
                const nz = edge1.x * edge2.y - edge1.y * edge2.x;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

                for (let i = 0; i < 4; i++) {
                    normals.push(nx / len, ny / len, nz / len);
                }

                const c = new THREE.Color(color);
                for (let i = 0; i < 4; i++) {
                    vertexColors.push(c.r, c.g, c.b);
                }

                indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
                indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
            };

            // 4. Generate Geometry
            for (const dimer of dimers) {
                const verts = getVertexKeys(dimer);
                const h0 = heights.get(`${verts[0][0]},${verts[0][1]}`);
                if (h0 === undefined) continue;

                // Use locally-consistent heights from vertex 0 + tile pattern
                // to avoid branch-cut distortion around holes
                const pattern = getHeightPattern(dimer.t);
                const baseH = h0 - pattern[0];
                const v3d = verts.map(([n, j], i) => to3D(n, j, baseH + pattern[i]));
                addQuad(v3d[0], v3d[1], v3d[2], v3d[3], colors[dimer.t]);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);
            geometry.computeBoundingSphere(); // Helps with camera centering

            // Create material based on current preset
            const preset = this.getCurrentPreset();
            const matSettings = preset.material;
            let material;
            if (matSettings.type === 'standard') {
                material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    side: THREE.DoubleSide,
                    flatShading: matSettings.flatShading,
                    roughness: matSettings.roughness,
                    metalness: matSettings.metalness
                });
            } else if (matSettings.type === 'phong') {
                material = new THREE.MeshPhongMaterial({
                    vertexColors: true,
                    side: THREE.DoubleSide,
                    flatShading: matSettings.flatShading,
                    shininess: matSettings.shininess
                });
            } else {
                material = new THREE.MeshLambertMaterial({
                    vertexColors: true,
                    side: THREE.DoubleSide,
                    flatShading: matSettings.flatShading
                });
            }
            const mesh = new THREE.Mesh(geometry, material);
            this.meshGroup.add(mesh);

            const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
            const edgesMaterial = new THREE.LineBasicMaterial({
                color: preset.edges.color,
                linewidth: 2,
                opacity: preset.edges.opacity,
                transparent: preset.edges.opacity < 1
            });
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            this.meshGroup.add(edges);

            if (!this.cameraInitialized && dimers.length > 0) {
                this.centerCamera(heights);
                this.cameraInitialized = true;
            }
        }

        dimersToLego3D(dimers, boundaries) {
            // Clear existing geometry
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) { if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose(); }
                this.meshGroup.remove(child);
            }

            if (!dimers || dimers.length === 0) return;

            const colors = this.getPermutedColors();

            const getVertexKeys = (dimer) => {
                const { bn, bj, t } = dimer;
                if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
                else if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
                else return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
            };

            const getHeightPattern = (t) => {
                if (t === 0) return [0, 0, 0, 0];
                if (t === 1) return [1, 0, 0, 1];
                return [1, 1, 0, 0];
            };

            // Build vertex-to-dimer map
            const vertexToDimers = new Map();
            for (const dimer of dimers) {
                const verts = getVertexKeys(dimer);
                for (const [n, j] of verts) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }

            // BFS height computation
            const heights = new Map();
            if (dimers.length > 0) {
                const firstDimer = dimers[0];
                const firstVerts = getVertexKeys(firstDimer);
                const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
                heights.set(startKey, 0);

                const queue = [startKey];
                const visited = new Set();

                while (queue.length > 0) {
                    const currentKey = queue.shift();
                    if (visited.has(currentKey)) continue;
                    visited.add(currentKey);

                    const currentH = heights.get(currentKey);
                    const [cn, cj] = currentKey.split(',').map(Number);

                    for (const dimer of vertexToDimers.get(currentKey) || []) {
                        const verts = getVertexKeys(dimer);
                        const pattern = getHeightPattern(dimer.t);

                        let myIdx = -1;
                        for (let i = 0; i < 4; i++) {
                            if (verts[i][0] === cn && verts[i][1] === cj) {
                                myIdx = i;
                                break;
                            }
                        }

                        if (myIdx >= 0) {
                            for (let i = 0; i < 4; i++) {
                                const [vn, vj] = verts[i];
                                const vkey = `${vn},${vj}`;
                                if (!heights.has(vkey)) {
                                    const newH = currentH + (pattern[i] - pattern[myIdx]);
                                    heights.set(vkey, newH);
                                    queue.push(vkey);
                                }
                            }
                        }
                    }
                }
            }

            const to3D = (n, j, h) => ({
                x: h,
                y: -n - h,
                z: j - h
            });

            // Build geometry with gaps between bricks
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            const normals = [];
            const vertexColors = [];
            const indices = [];

            const shrink = 0.97;

            const addQuad = (v1, v2, v3, v4, color) => {
                const baseIndex = vertices.length / 3;
                vertices.push(v1.x, v1.y, v1.z);
                vertices.push(v2.x, v2.y, v2.z);
                vertices.push(v3.x, v3.y, v3.z);
                vertices.push(v4.x, v4.y, v4.z);

                const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
                const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z };
                const nx = edge1.y * edge2.z - edge1.z * edge2.y;
                const ny = edge1.z * edge2.x - edge1.x * edge2.z;
                const nz = edge1.x * edge2.y - edge1.y * edge2.x;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

                for (let i = 0; i < 4; i++) {
                    normals.push(nx / len, ny / len, nz / len);
                }

                const c = new THREE.Color(color);
                for (let i = 0; i < 4; i++) {
                    vertexColors.push(c.r, c.g, c.b);
                }

                indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
                indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
            };

            // Pre-compute tile positions
            const tileData = [];
            for (const dimer of dimers) {
                const verts = getVertexKeys(dimer);
                const h0 = heights.get(`${verts[0][0]},${verts[0][1]}`);
                if (h0 === undefined) { tileData.push(null); continue; }
                const pattern = getHeightPattern(dimer.t);
                const baseH = h0 - pattern[0];
                const v3d = verts.map(([n, j], i) => to3D(n, j, baseH + pattern[i]));
                tileData.push({ dimer, verts, v3d });
            }

            // Build edge adjacency for brick merging
            const edgeToTiles = new Map();
            const tileEdgeKeys = [];
            for (let di = 0; di < tileData.length; di++) {
                if (!tileData[di]) { tileEdgeKeys.push(null); continue; }
                const { verts } = tileData[di];
                const keys = [];
                for (let e = 0; e < 4; e++) {
                    const [n1, j1] = verts[e];
                    const [n2, j2] = verts[(e + 1) % 4];
                    const key = (n1 < n2 || (n1 === n2 && j1 < j2))
                        ? `${n1},${j1}-${n2},${j2}` : `${n2},${j2}-${n1},${j1}`;
                    keys.push(key);
                    if (!edgeToTiles.has(key)) edgeToTiles.set(key, []);
                    edgeToTiles.get(key).push(di);
                }
                tileEdgeKeys.push(keys);
            }

            // Brick merging: cache coin flips, skip during Glauber
            const dimerFP = dimers.length > 0
                ? dimers[0].bn * 100003 + dimers[0].bj * 101 + dimers[dimers.length-1].bn * 997 + dimers[dimers.length-1].bj
                : 0;
            let mergedEdges;
            if (this.glauberRunning) {
                mergedEdges = new Set();
            } else if (this._legoMergedEdges !== null && this._legoFP === dimerFP) {
                mergedEdges = this._legoMergedEdges;
            } else {
                mergedEdges = new Set();
                for (const [key, tiles] of edgeToTiles) {
                    if (tiles.length === 2) {
                        const d0 = tileData[tiles[0]], d1 = tileData[tiles[1]];
                        if (d0 && d1 && d0.dimer.t === d1.dimer.t && d0.dimer.t !== 2) {
                            // Only merge wall tiles (types 0,1), not top faces (type 2)
                            // Only merge vertical edges (different z) — these connect side-by-side tiles into wider bricks
                            // Horizontal edges (same z) connect stacked tiles and would create tall bricks
                            const edgeIdx = tileEdgeKeys[tiles[0]].indexOf(key);
                            const pattern = getHeightPattern(d0.dimer.t);
                            const nextIdx = (edgeIdx + 1) % 4;
                            if (d0.verts[edgeIdx][1] - pattern[edgeIdx] !== d0.verts[nextIdx][1] - pattern[nextIdx]) {
                                if (Math.random() < 0.5) mergedEdges.add(key);
                            }
                        }
                    }
                }
                // Propagate wall merges to Type 2 (top face) edges:
                // when two wall tiles merge, the Type 2 tiles above them should also merge
                for (const key of [...mergedEdges]) {
                    const tiles = edgeToTiles.get(key);
                    if (!tiles || tiles.length !== 2) continue;
                    const d0 = tileData[tiles[0]], d1 = tileData[tiles[1]];
                    if (!d0 || !d1 || d0.dimer.t === 2) continue;
                    const ek0 = tileEdgeKeys[tiles[0]], ek1 = tileEdgeKeys[tiles[1]];
                    if (!ek0 || !ek1) continue;
                    // Edge 0 of each wall tile is its top edge, shared with a Type 2 tile
                    const tt0 = edgeToTiles.get(ek0[0]), tt1 = edgeToTiles.get(ek1[0]);
                    if (!tt0 || !tt1) continue;
                    let t2a = -1, t2b = -1;
                    for (const ti of tt0) if (tileData[ti] && tileData[ti].dimer.t === 2) { t2a = ti; break; }
                    for (const ti of tt1) if (tileData[ti] && tileData[ti].dimer.t === 2) { t2b = ti; break; }
                    if (t2a >= 0 && t2b >= 0 && t2a !== t2b) {
                        const ka = tileEdgeKeys[t2a], kb = new Set(tileEdgeKeys[t2b]);
                        if (ka) for (const k of ka) { if (kb.has(k)) { mergedEdges.add(k); break; } }
                    }
                }
                this._legoMergedEdges = mergedEdges;
                this._legoFP = dimerFP;
            }

            // Render with selective per-edge shrink (gaps only at non-merged edges)
            const gap = 1 - shrink;
            const linePositions = [];
            for (let di = 0; di < tileData.length; di++) {
                if (!tileData[di]) continue;
                const { v3d } = tileData[di];
                const edgeKeys = tileEdgeKeys[di];

                const shrunk = v3d.map((v, i) => {
                    const prev = (i + 3) % 4;
                    const next = (i + 1) % 4;
                    let dx = 0, dy = 0, dz = 0;
                    // Gap on outgoing edge i (v[i] → v[next])
                    if (!mergedEdges.has(edgeKeys[i])) {
                        dx += gap * (v3d[prev].x - v.x) / 2;
                        dy += gap * (v3d[prev].y - v.y) / 2;
                        dz += gap * (v3d[prev].z - v.z) / 2;
                    }
                    // Gap on incoming edge prev (v[prev] → v[i])
                    if (!mergedEdges.has(edgeKeys[prev])) {
                        dx += gap * (v3d[next].x - v.x) / 2;
                        dy += gap * (v3d[next].y - v.y) / 2;
                        dz += gap * (v3d[next].z - v.z) / 2;
                    }
                    return { x: v.x + dx, y: v.y + dy, z: v.z + dz };
                });

                addQuad(shrunk[0], shrunk[1], shrunk[2], shrunk[3], colors[0]);

                // Collect edge lines at non-merged boundaries
                for (let e = 0; e < 4; e++) {
                    if (!mergedEdges.has(edgeKeys[e])) {
                        linePositions.push(
                            shrunk[e].x, shrunk[e].y, shrunk[e].z,
                            shrunk[(e+1)%4].x, shrunk[(e+1)%4].y, shrunk[(e+1)%4].z
                        );
                    }
                }
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);
            geometry.computeBoundingSphere();

            // Plastic material - polygonOffset pushes faces back so studs/edges don't z-fight
            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                flatShading: true,
                roughness: 0.35,
                metalness: 0.0,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            });
            const mesh = new THREE.Mesh(geometry, material);
            this.meshGroup.add(mesh);

            // Brick edge lines (only at non-merged boundaries)
            const lineGeom = new THREE.BufferGeometry();
            lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            const edgesMaterial = new THREE.LineBasicMaterial({
                color: 0x333333,
                linewidth: 2
            });
            const edges = new THREE.LineSegments(lineGeom, edgesMaterial);
            this.meshGroup.add(edges);

            // Studs: 4 per lozenge, on all face types
            const typeGroups = [[], [], []];
            const typeNormals = [null, null, null];

            for (let di = 0; di < tileData.length; di++) {
                if (!tileData[di]) continue;
                const { dimer, v3d } = tileData[di];
                typeGroups[dimer.t].push(v3d);
                if (!typeNormals[dimer.t]) {
                    const e1 = { x: v3d[1].x - v3d[0].x, y: v3d[1].y - v3d[0].y, z: v3d[1].z - v3d[0].z };
                    const e2 = { x: v3d[3].x - v3d[0].x, y: v3d[3].y - v3d[0].y, z: v3d[3].z - v3d[0].z };
                    const nx = e1.y * e2.z - e1.z * e2.y;
                    const ny = e1.z * e2.x - e1.x * e2.z;
                    const nz = e1.x * e2.y - e1.y * e2.x;
                    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
                    typeNormals[dimer.t] = new THREE.Vector3(nx / len, ny / len, nz / len);
                }
            }

            const segments = dimers.length > 3000 ? 12 : 16;
            const studR = 0.13, studH = 0.10;
            const studGeom = new THREE.CylinderGeometry(studR, studR, studH, segments);
            const yAxis = new THREE.Vector3(0, 1, 0);
            const studMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(colors[0]),
                roughness: 0.25,
                metalness: 0.0,
                flatShading: true,
                side: THREE.DoubleSide
            });

            for (const type of [2]) {
                const groupVerts = typeGroups[type];
                const normal = typeNormals[type];
                if (groupVerts.length === 0 || !normal) continue;

                const totalStuds = groupVerts.length * 4;
                const instancedMesh = new THREE.InstancedMesh(studGeom, studMat, totalStuds);
                const flipped = normal.clone().negate();
                const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, flipped);
                const dummy = new THREE.Matrix4();
                const nOffset = flipped.clone().multiplyScalar(0.08);

                // Precompute rotated circle templates for stud rim outlines
                const circleTop = [], circleBot = [];
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    const cos = Math.cos(angle) * studR, sin = Math.sin(angle) * studR;
                    const pt = new THREE.Vector3(cos, studH / 2, sin).applyQuaternion(quaternion);
                    circleTop.push(pt);
                    const pb = new THREE.Vector3(cos, -studH / 2, sin).applyQuaternion(quaternion);
                    circleBot.push(pb);
                }

                const studLinePos = [];
                let idx = 0;
                for (const v3d of groupVerts) {
                    const a = { x: v3d[1].x - v3d[0].x, y: v3d[1].y - v3d[0].y, z: v3d[1].z - v3d[0].z };
                    const b = { x: v3d[3].x - v3d[0].x, y: v3d[3].y - v3d[0].y, z: v3d[3].z - v3d[0].z };
                    for (const [s, t] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
                        const cx = v3d[0].x + s * a.x + t * b.x + nOffset.x;
                        const cy = v3d[0].y + s * a.y + t * b.y + nOffset.y;
                        const cz = v3d[0].z + s * a.z + t * b.z + nOffset.z;
                        dummy.compose(
                            new THREE.Vector3(cx, cy, cz),
                            quaternion,
                            new THREE.Vector3(1, 1, 1)
                        );
                        instancedMesh.setMatrixAt(idx++, dummy);
                        // Top and bottom rim circle outlines
                        for (let i = 0; i < segments; i++) {
                            studLinePos.push(
                                cx + circleTop[i].x, cy + circleTop[i].y, cz + circleTop[i].z,
                                cx + circleTop[i+1].x, cy + circleTop[i+1].y, cz + circleTop[i+1].z,
                                cx + circleBot[i].x, cy + circleBot[i].y, cz + circleBot[i].z,
                                cx + circleBot[i+1].x, cy + circleBot[i+1].y, cz + circleBot[i+1].z
                            );
                        }
                    }
                }

                instancedMesh.instanceMatrix.needsUpdate = true;
                this.meshGroup.add(instancedMesh);

                // Stud rim outlines (same dark material as brick edges)
                if (studLinePos.length > 0) {
                    const studLineGeom = new THREE.BufferGeometry();
                    studLineGeom.setAttribute('position', new THREE.Float32BufferAttribute(studLinePos, 3));
                    const studEdges = new THREE.LineSegments(studLineGeom, edgesMaterial);
                    this.meshGroup.add(studEdges);
                }
            }

            if (!this.cameraInitialized && dimers.length > 0) {
                this.centerCamera(heights);
                this.cameraInitialized = true;
            }
        }

        _generateMinecraftTexture(type) {
            const S = 16;
            const canvas = document.createElement('canvas');
            canvas.width = S; canvas.height = S;
            const ctx = canvas.getContext('2d');

            // 4x4 value noise interpolated to 16x16 — used to bias pixel color picks
            const noise = () => {
                const g = [];
                for (let i = 0; i < 25; i++) g.push(Math.random());
                return (x, y) => {
                    const gx = x / S * 4, gy = y / S * 4;
                    const ix = Math.floor(gx), iy = Math.floor(gy);
                    const fx = gx - ix, fy = gy - iy;
                    const v = (r, c) => g[r * 5 + c];
                    return v(iy,ix)*(1-fx)*(1-fy) + v(iy,ix+1)*fx*(1-fy) +
                           v(iy+1,ix)*(1-fx)*fy + v(iy+1,ix+1)*fx*fy;
                };
            };

            // Pick from palette: noise sets region, random adds strong per-pixel variation
            const fill = (palette, n) => {
                for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
                    const t = n(x, y) * 0.4 + Math.random() * 0.6;
                    const idx = Math.min(palette.length - 1, (t * palette.length) | 0);
                    ctx.fillStyle = palette[idx];
                    ctx.fillRect(x, y, 1, 1);
                }
            };

            if (type === 'stone') {
                fill(['#555555','#666666','#6E6E6E','#7A7A7A','#848484','#8B8B8B','#8B8B8B','#959595','#9A9A9A','#A0A0A0'], noise());
                for (let i = 0; i < 10; i++) {
                    ctx.fillStyle = '#4A4A4A';
                    ctx.fillRect((Math.random()*S)|0, (Math.random()*S)|0, 1, 1);
                }
            } else if (type === 'dirt') {
                fill(['#5A4020','#654A2A','#6B4E30','#7A5C3A','#836442','#8B6B4A','#96785A','#9C7C5A','#A8896A'], noise());
                for (let i = 0; i < 8; i++) {
                    ctx.fillStyle = '#4E3618';
                    ctx.fillRect((Math.random()*S)|0, (Math.random()*S)|0, 1, 1);
                }
            } else if (type === 'grass') {
                fill(['#2E5510','#3A6818','#3D6B1E','#4A7A28','#52842E','#5B8C32','#68A038','#6EA03E','#7AB848','#88CC50'], noise());
                for (let i = 0; i < 8; i++) {
                    ctx.fillStyle = Math.random() < 0.5 ? '#8AD048' : '#305A12';
                    ctx.fillRect((Math.random()*S)|0, (Math.random()*S)|0, 1, 1);
                }
            } else if (type === 'magma') {
                fill(['#120808','#1A0E0E','#221414','#2A1A1A','#2A1A1A','#332020','#3A2222','#442828'], noise());
                for (let i = 0; i < 5; i++) {
                    let cx = (Math.random()*S)|0, cy = (Math.random()*S)|0;
                    for (let s = 0; s < 3 + ((Math.random()*4)|0); s++) {
                        const colors = ['#CC4400','#FF6600','#FF9900','#FFCC00','#FFE040'];
                        ctx.fillStyle = colors[(Math.random()*colors.length)|0];
                        ctx.fillRect(cx, cy, 1, 1);
                        cx += [-1,0,1][(Math.random()*3)|0];
                        cy += [-1,0,1][(Math.random()*3)|0];
                    }
                }
            } else if (type === 'diamond') {
                fill(['#555555','#666666','#6E6E6E','#7A7A7A','#848484','#8B8B8B','#8B8B8B','#959595','#9A9A9A','#A0A0A0'], noise());
                const ox = 3 + ((Math.random()*10)|0), oy = 3 + ((Math.random()*10)|0);
                const spots = [[0,0],[1,0],[0,1]];
                if (Math.random() < 0.7) spots.push([1,1]);
                if (Math.random() < 0.5) spots.push([-1,0]);
                if (Math.random() < 0.4) spots.push([0,-1]);
                if (Math.random() < 0.3) spots.push([2,0]);
                for (const [dx, dy] of spots) {
                    ctx.fillStyle = ['#3DCEBE','#50DED0','#6EEEDE','#88FFF0'][(Math.random()*4)|0];
                    ctx.fillRect(ox + dx, oy + dy, 1, 1);
                }
            } else if (type === 'emerald') {
                fill(['#555555','#666666','#6E6E6E','#7A7A7A','#848484','#8B8B8B','#8B8B8B','#959595','#9A9A9A','#A0A0A0'], noise());
                const ox = 3 + ((Math.random()*10)|0), oy = 3 + ((Math.random()*10)|0);
                const spots = [[0,0],[1,0],[0,1]];
                if (Math.random() < 0.7) spots.push([1,1]);
                if (Math.random() < 0.5) spots.push([-1,0]);
                if (Math.random() < 0.4) spots.push([0,-1]);
                if (Math.random() < 0.3) spots.push([2,0],[0,2]);
                for (const [dx, dy] of spots) {
                    ctx.fillStyle = ['#1B8C1B','#2DA82D','#40C040','#55DD55'][(Math.random()*4)|0];
                    ctx.fillRect(ox + dx, oy + dy, 1, 1);
                }
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }

        dimersToMinecraft3D(dimers, boundaries) {
            // Clear existing geometry
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
                this.meshGroup.remove(child);
            }

            if (!dimers || dimers.length === 0) return;

            const getVertexKeys = (dimer) => {
                const { bn, bj, t } = dimer;
                if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
                else if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
                else return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
            };
            const getHeightPattern = (t) => {
                if (t === 0) return [0, 0, 0, 0];
                if (t === 1) return [1, 0, 0, 1];
                return [1, 1, 0, 0];
            };

            // BFS heights (same as standard)
            const vertexToDimers = new Map();
            for (const dimer of dimers) {
                for (const [n, j] of getVertexKeys(dimer)) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }
            const heights = new Map();
            if (dimers.length > 0) {
                const fv = getVertexKeys(dimers[0]);
                const startKey = `${fv[0][0]},${fv[0][1]}`;
                heights.set(startKey, 0);
                const queue = [startKey];
                const visited = new Set();
                while (queue.length > 0) {
                    const ck = queue.shift();
                    if (visited.has(ck)) continue;
                    visited.add(ck);
                    const ch = heights.get(ck);
                    const [cn, cj] = ck.split(',').map(Number);
                    for (const dimer of vertexToDimers.get(ck) || []) {
                        const verts = getVertexKeys(dimer);
                        const pattern = getHeightPattern(dimer.t);
                        let myIdx = -1;
                        for (let i = 0; i < 4; i++) {
                            if (verts[i][0] === cn && verts[i][1] === cj) { myIdx = i; break; }
                        }
                        if (myIdx >= 0) {
                            for (let i = 0; i < 4; i++) {
                                const vkey = `${verts[i][0]},${verts[i][1]}`;
                                if (!heights.has(vkey)) {
                                    heights.set(vkey, ch + (pattern[i] - pattern[myIdx]));
                                    queue.push(vkey);
                                }
                            }
                        }
                    }
                }
            }
            const to3D = (n, j, h) => ({ x: h, y: -n - h, z: j - h });

            // Per-hexagonal-face texture: the three tiles (types 0,1,2) forming
            // each visible "hex cube" share one texture. We detect hex-face triples
            // at tri-vertices (3D vertices where all 3 tile types meet) by checking
            // which tiles share edges emanating from that vertex.
            const MC_TYPES = ['stone','dirt','grass','magma','diamond','emerald'];

            const hashInts = (a, b, c) => {
                let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
                h = ((h >> 16) ^ h) * 0x45d9f3b;
                h = ((h >> 16) ^ h) * 0x45d9f3b;
                return (h ^ (h >> 16)) & 0x7fffffff;
            };
            const texFromHash = (h) => {
                const r = (h % 1000) / 1000;
                if (r < 0.01) return 5;      // emerald ore (1%)
                if (r < 0.05) return 4;      // diamond (4%)
                if (r < 0.10) return 3;      // magma (5%)
                if (r < 0.55) return 1;      // dirt (45%)
                return 0;                    // stone (45%)
            };

            // Compute 3D verts for each tile
            const dimerV3D = [];
            for (let di = 0; di < dimers.length; di++) {
                const dimer = dimers[di];
                const vk = getVertexKeys(dimer);
                const h0 = heights.get(`${vk[0][0]},${vk[0][1]}`);
                if (h0 === undefined) { dimerV3D.push(null); continue; }
                const pattern = getHeightPattern(dimer.t);
                const baseH = h0 - pattern[0];
                const v3d = vk.map(([n, j], i) => to3D(n, j, baseH + pattern[i]));
                dimerV3D.push(v3d);
            }

            // Union-find: group tiles sharing cross-type 3D edges.
            // Any two adjacent tiles of different types get the same block texture.
            const ufP = new Int32Array(dimers.length);
            for (let i = 0; i < dimers.length; i++) ufP[i] = i;
            const ufF = (x) => { while (ufP[x] !== x) { ufP[x] = ufP[ufP[x]]; x = ufP[x]; } return x; };
            const ufU = (a, b) => { a = ufF(a); b = ufF(b); if (a !== b) ufP[a] = b; };

            const edgeToTiles = new Map();
            for (let di = 0; di < dimers.length; di++) {
                const v = dimerV3D[di]; if (!v) continue;
                for (let e = 0; e < 4; e++) {
                    const a = v[e], b = v[(e+1)%4];
                    const k1 = `${a.x},${a.y},${a.z}`, k2 = `${b.x},${b.y},${b.z}`;
                    const ek = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
                    if (!edgeToTiles.has(ek)) edgeToTiles.set(ek, []);
                    edgeToTiles.get(ek).push(di);
                }
            }
            for (const [, tiles] of edgeToTiles) {
                if (tiles.length === 2 && dimers[tiles[0]].t !== dimers[tiles[1]].t) {
                    ufU(tiles[0], tiles[1]);
                }
            }

            // Assign texture per group using spatial hash of representative's centroid
            const tileTexture = new Uint8Array(dimers.length);
            for (let di = 0; di < dimers.length; di++) {
                const v = dimerV3D[di]; if (!v) continue;
                const rep = ufF(di);
                const rv = dimerV3D[rep];
                const cx = Math.round((rv[0].x + rv[1].x + rv[2].x + rv[3].x) * 4);
                const cy = Math.round((rv[0].y + rv[1].y + rv[2].y + rv[3].y) * 4);
                const cz = Math.round((rv[0].z + rv[1].z + rv[2].z + rv[3].z) * 4);
                let tex = texFromHash(hashInts(cx, cy, cz));
                if (tex === 1 && dimers[di].t === 2) tex = 2; // grass on top of dirt (type 2 = top face)
                tileTexture[di] = tex;
            }

            // Build geometry
            const geometry = new THREE.BufferGeometry();
            const verts = [], norms = [], uvs = [];
            const groupIdx = MC_TYPES.map(() => []);
            const linePositions = [];
            const gap = 0.03;

            const addQuad = (v1, v2, v3, v4, grp, uvOff) => {
                const base = verts.length / 3;
                verts.push(v1.x,v1.y,v1.z, v2.x,v2.y,v2.z, v3.x,v3.y,v3.z, v4.x,v4.y,v4.z);
                const e1x=v2.x-v1.x,e1y=v2.y-v1.y,e1z=v2.z-v1.z;
                const e2x=v4.x-v1.x,e2y=v4.y-v1.y,e2z=v4.z-v1.z;
                const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x;
                const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
                for(let i=0;i<4;i++) norms.push(nx/len,ny/len,nz/len);
                uvs.push(uvOff,uvOff, uvOff+1,uvOff, uvOff+1,uvOff+1, uvOff,uvOff+1);
                groupIdx[grp].push(base,base+1,base+2, base,base+2,base+3);
            };

            for (let di = 0; di < dimers.length; di++) {
                const v3d = dimerV3D[di];
                if (!v3d) continue;
                const grp = tileTexture[di];
                const uvOff = (di * 0.37) % 1;

                // Shrink toward center for gap
                const cx = (v3d[0].x+v3d[1].x+v3d[2].x+v3d[3].x)/4;
                const cy = (v3d[0].y+v3d[1].y+v3d[2].y+v3d[3].y)/4;
                const cz = (v3d[0].z+v3d[1].z+v3d[2].z+v3d[3].z)/4;
                const s = v3d.map(v => ({
                    x: v.x + (cx-v.x)*gap, y: v.y + (cy-v.y)*gap, z: v.z + (cz-v.z)*gap
                }));

                // Top face
                addQuad(s[0], s[1], s[2], s[3], grp, uvOff);

                // Edge lines for this face
                for (let e = 0; e < 4; e++) {
                    const a = s[e], b = s[(e+1)%4];
                    linePositions.push(a.x,a.y,a.z, b.x,b.y,b.z);
                }

            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            const allIdx = [];
            const materials = [];
            for (let g = 0; g < MC_TYPES.length; g++) {
                const start = allIdx.length;
                for (const idx of groupIdx[g]) allIdx.push(idx);
                if (groupIdx[g].length > 0) {
                    geometry.addGroup(start, groupIdx[g].length, materials.length);
                    const tex = this._generateMinecraftTexture(MC_TYPES[g]);
                    materials.push(new THREE.MeshLambertMaterial({
                        map: tex, side: THREE.DoubleSide,
                        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
                    }));
                }
            }
            geometry.setIndex(allIdx);
            geometry.computeBoundingSphere();
            this.meshGroup.add(new THREE.Mesh(geometry, materials));

            // Edge lines
            const lineGeom = new THREE.BufferGeometry();
            lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            this.meshGroup.add(new THREE.LineSegments(lineGeom,
                new THREE.LineBasicMaterial({ color: 0x1a1a1a, linewidth: 2 })));

            if (!this.cameraInitialized && dimers.length > 0) {
                this.centerCamera(heights);
                this.cameraInitialized = true;
            }
        }

        renderDimers(dimers, boundaries) {
            if (this.renderMode === 'lego') this.dimersToLego3D(dimers, boundaries);
            else if (this.renderMode === 'minecraft') this.dimersToMinecraft3D(dimers, boundaries);
            else this.dimersTo3D(dimers, boundaries);
        }

        // Render both min and max CFTP surfaces with transparency
        cftpBoundsTo3D(minDimers, maxDimers) {
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) { if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose(); }
                this.meshGroup.remove(child);
            }

            if ((!minDimers || minDimers.length === 0) && (!maxDimers || maxDimers.length === 0)) return;

            const colors = this.getPermutedColors();

            const getVertexKeys = (dimer) => {
                const { bn, bj, t } = dimer;
                if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
                else if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
                else return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
            };

            const getHeightPattern = (t) => {
                if (t === 0) return [0, 0, 0, 0];
                if (t === 1) return [1, 0, 0, 1];
                return [1, 1, 0, 0];
            };

            const computeHeights = (dimers) => {
                const vertexToDimers = new Map();
                for (const dimer of dimers) {
                    for (const [n, j] of getVertexKeys(dimer)) {
                        const key = `${n},${j}`;
                        if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                        vertexToDimers.get(key).push(dimer);
                    }
                }
                const heights = new Map();
                if (dimers.length > 0) {
                    const firstVerts = getVertexKeys(dimers[0]);
                    const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
                    heights.set(startKey, 0);
                    const queue = [startKey];
                    const visited = new Set();
                    while (queue.length > 0) {
                        const currentKey = queue.shift();
                        if (visited.has(currentKey)) continue;
                        visited.add(currentKey);
                        const currentH = heights.get(currentKey);
                        const [cn, cj] = currentKey.split(',').map(Number);
                        for (const dimer of vertexToDimers.get(currentKey) || []) {
                            const verts = getVertexKeys(dimer);
                            const pattern = getHeightPattern(dimer.t);
                            let myIdx = verts.findIndex(([n, j]) => n === cn && j === cj);
                            if (myIdx >= 0) {
                                for (let i = 0; i < 4; i++) {
                                    const vkey = `${verts[i][0]},${verts[i][1]}`;
                                    if (!heights.has(vkey)) {
                                        heights.set(vkey, currentH + (pattern[i] - pattern[myIdx]));
                                        queue.push(vkey);
                                    }
                                }
                            }
                        }
                    }
                }
                return heights;
            };

            const to3D = (n, j, h) => ({ x: h, y: -n - h, z: j - h });

            const buildSurface = (dimers, heights, opacity, colorMod) => {
                const geometry = new THREE.BufferGeometry();
                const vertices = [], normals = [], vertexColors = [], indices = [];
                const addQuad = (v1, v2, v3, v4, color) => {
                    const baseIndex = vertices.length / 3;
                    vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);
                    const e1 = { x: v2.x-v1.x, y: v2.y-v1.y, z: v2.z-v1.z };
                    const e2 = { x: v4.x-v1.x, y: v4.y-v1.y, z: v4.z-v1.z };
                    const nx = e1.y*e2.z - e1.z*e2.y, ny = e1.z*e2.x - e1.x*e2.z, nz = e1.x*e2.y - e1.y*e2.x;
                    const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
                    for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
                    const c = new THREE.Color(color);
                    c.r *= colorMod; c.g *= colorMod; c.b *= colorMod;
                    for (let i = 0; i < 4; i++) vertexColors.push(c.r, c.g, c.b);
                    indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
                };
                for (const dimer of dimers) {
                    const verts = getVertexKeys(dimer);
                    const v3d = verts.map(([n, j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
                    addQuad(v3d[0], v3d[1], v3d[2], v3d[3], colors[dimer.t]);
                }
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
                geometry.setIndex(indices);
                geometry.computeBoundingSphere();
                const preset = this.getCurrentPreset();
                const matSettings = preset.material;
                let material;
                if (matSettings.type === 'standard') {
                    material = new THREE.MeshStandardMaterial({
                        vertexColors: true, side: THREE.DoubleSide, flatShading: matSettings.flatShading,
                        roughness: matSettings.roughness, metalness: matSettings.metalness,
                        transparent: true, opacity: opacity, depthWrite: opacity > 0.9
                    });
                } else if (matSettings.type === 'phong') {
                    material = new THREE.MeshPhongMaterial({
                        vertexColors: true, side: THREE.DoubleSide, flatShading: matSettings.flatShading,
                        shininess: matSettings.shininess,
                        transparent: true, opacity: opacity, depthWrite: opacity > 0.9
                    });
                } else {
                    material = new THREE.MeshLambertMaterial({
                        vertexColors: true, side: THREE.DoubleSide, flatShading: matSettings.flatShading,
                        transparent: true, opacity: opacity, depthWrite: opacity > 0.9
                    });
                }
                return new THREE.Mesh(geometry, material);
            };

            if (maxDimers && maxDimers.length > 0) {
                const maxHeights = computeHeights(maxDimers);
                this.meshGroup.add(buildSurface(maxDimers, maxHeights, 0.6, 1.0));
            }
            if (minDimers && minDimers.length > 0) {
                const minHeights = computeHeights(minDimers);
                this.meshGroup.add(buildSurface(minDimers, minHeights, 0.6, 0.7));
            }
        }

        // Render continuous height function as surface plot (like Mathematica ListPlot3D)
        // options: { hideZLabels: boolean } - hide z-axis labels for fluctuation display
        heightFunctionTo3D(heights, blackTriangles, whiteTriangles, boundaries, options = {}) {
            while (this.meshGroup.children.length > 0) {
                const child = this.meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) { if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose(); }
                this.meshGroup.remove(child);
            }

            if (heights.size === 0) return;

            // Surface plot coordinates: x = n, y = j (in triangular lattice coords), z = height
            // Use the same 2D world coordinates as the renderer
            const to3D = (n, j, h) => {
                // Same as getVertex but with height as z
                const x = n;
                const y = n / Math.sqrt(3) + j * 2 / Math.sqrt(3);
                return { x: x, y: y, z: h };
            };

            const geometry = new THREE.BufferGeometry();
            const vertices = [], normals = [], vertexColors = [], indices = [];

            // Diverging colormap: blue (negative) -> gray (zero) -> red (positive)
            // When fadeZero is true, values near zero become transparent
            const getHeightColorAlpha = (h, fadeZero) => {
                const t = Math.tanh(h / 3); // Normalize to [-1, 1] range
                const gray = 0.75; // Zero value is light gray instead of white
                let r, g, b;
                if (t < 0) {
                    // Blue to gray
                    const s = -t;
                    r = gray * (1 - s); g = gray * (1 - s); b = gray + s * (1 - gray);
                } else {
                    // Gray to red
                    const s = t;
                    r = gray + s * (1 - gray); g = gray * (1 - s); b = gray * (1 - s);
                }
                // Alpha: transparent at zero, opaque at large |h|
                const alpha = fadeZero ? Math.min(1, Math.abs(h) / 5) : 1;
                return { r, g, b, a: alpha };
            };

            const fadeZero = options.fadeZero || false;

            const addTriangle = (v1, v2, v3, h1, h2, h3) => {
                const baseIndex = vertices.length / 3;
                vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);

                // Compute flat normal
                const e1 = { x: v2.x-v1.x, y: v2.y-v1.y, z: v2.z-v1.z };
                const e2 = { x: v3.x-v1.x, y: v3.y-v1.y, z: v3.z-v1.z };
                const nx = e1.y*e2.z - e1.z*e2.y;
                const ny = e1.z*e2.x - e1.x*e2.z;
                const nz = e1.x*e2.y - e1.y*e2.x;
                const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
                for (let i = 0; i < 3; i++) normals.push(nx/len, ny/len, nz/len);

                // Color each vertex by its height (with optional alpha for fadeZero)
                // For fadeZero, use average height for flat shading (no interpolation)
                const avgH = fadeZero ? (h1 + h2 + h3) / 3 : 0;
                const c1 = getHeightColorAlpha(fadeZero ? avgH : h1, fadeZero);
                const c2 = getHeightColorAlpha(fadeZero ? avgH : h2, fadeZero);
                const c3 = getHeightColorAlpha(fadeZero ? avgH : h3, fadeZero);
                vertexColors.push(c1.r, c1.g, c1.b, c1.a, c2.r, c2.g, c2.b, c2.a, c3.r, c3.g, c3.b, c3.a);

                indices.push(baseIndex, baseIndex+1, baseIndex+2);
            };

            // Draw black triangles (type 1): vertices (n,j), (n,j-1), (n+1,j-1)
            for (const tri of blackTriangles) {
                const h1 = heights.get(`${tri.n},${tri.j}`) || 0;
                const h2 = heights.get(`${tri.n},${tri.j-1}`) || 0;
                const h3 = heights.get(`${tri.n+1},${tri.j-1}`) || 0;
                const p1 = to3D(tri.n, tri.j, h1);
                const p2 = to3D(tri.n, tri.j-1, h2);
                const p3 = to3D(tri.n+1, tri.j-1, h3);
                addTriangle(p1, p2, p3, h1, h2, h3);
            }

            // Draw white triangles (type 2): vertices (n,j), (n+1,j), (n+1,j-1)
            for (const tri of whiteTriangles) {
                const h1 = heights.get(`${tri.n},${tri.j}`) || 0;
                const h2 = heights.get(`${tri.n+1},${tri.j}`) || 0;
                const h3 = heights.get(`${tri.n+1},${tri.j-1}`) || 0;
                const p1 = to3D(tri.n, tri.j, h1);
                const p2 = to3D(tri.n+1, tri.j, h2);
                const p3 = to3D(tri.n+1, tri.j-1, h3);
                addTriangle(p1, p2, p3, h1, h2, h3);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 4)); // RGBA
            geometry.setIndex(indices);
            geometry.computeBoundingSphere();

            let material;
            if (fadeZero) {
                // Custom shader material for per-vertex alpha with flat shading
                material = new THREE.ShaderMaterial({
                    vertexShader: `
                        attribute vec4 color;
                        flat varying vec4 vColor;
                        varying vec3 vNormal;
                        void main() {
                            vColor = color;
                            vNormal = normalMatrix * normal;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        flat varying vec4 vColor;
                        varying vec3 vNormal;
                        void main() {
                            vec3 light = normalize(vec3(0.5, 0.5, 1.0));
                            float diff = max(dot(normalize(vNormal), light), 0.3);
                            gl_FragColor = vec4(vColor.rgb * diff, vColor.a);
                        }
                    `,
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                    glslVersion: THREE.GLSL3
                });
            } else {
                const preset = this.getCurrentPreset();
                const matSettings = preset.material;
                if (matSettings.type === 'standard') {
                    material = new THREE.MeshStandardMaterial({
                        vertexColors: true, side: THREE.DoubleSide,
                        flatShading: options.flatShading !== undefined ? options.flatShading : matSettings.flatShading,
                        roughness: matSettings.roughness, metalness: matSettings.metalness
                    });
                } else if (matSettings.type === 'phong') {
                    material = new THREE.MeshPhongMaterial({
                        vertexColors: true, side: THREE.DoubleSide,
                        flatShading: options.flatShading !== undefined ? options.flatShading : matSettings.flatShading,
                        shininess: matSettings.shininess
                    });
                } else {
                    material = new THREE.MeshLambertMaterial({
                        vertexColors: true, side: THREE.DoubleSide,
                        flatShading: options.flatShading !== undefined ? options.flatShading : matSettings.flatShading
                    });
                }
            }
            const mesh = new THREE.Mesh(geometry, material);
            this.meshGroup.add(mesh);

            // Compute bounds
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            for (let i = 0; i < vertices.length; i += 3) {
                minX = Math.min(minX, vertices[i]);
                maxX = Math.max(maxX, vertices[i]);
                minY = Math.min(minY, vertices[i+1]);
                maxY = Math.max(maxY, vertices[i+1]);
                minZ = Math.min(minZ, vertices[i+2]);
                maxZ = Math.max(maxZ, vertices[i+2]);
            }

            // Draw coordinate axes and grid
            const axesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
            const gridMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, linewidth: 1 });

            // X axis
            const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(minX, minY, minZ),
                new THREE.Vector3(maxX, minY, minZ)
            ]);
            this.meshGroup.add(new THREE.Line(xAxisGeom, axesMaterial));

            // Y axis
            const yAxisGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(minX, minY, minZ),
                new THREE.Vector3(minX, maxY, minZ)
            ]);
            this.meshGroup.add(new THREE.Line(yAxisGeom, axesMaterial));

            // Z axis
            const zAxisGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(minX, minY, minZ),
                new THREE.Vector3(minX, minY, maxZ)
            ]);
            this.meshGroup.add(new THREE.Line(zAxisGeom, axesMaterial));

            // Grid lines on bottom (z = minZ)
            const gridStep = Math.max(1, Math.floor((maxX - minX) / 5));
            for (let x = Math.ceil(minX); x <= maxX; x += gridStep) {
                const lineGeom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, minY, minZ),
                    new THREE.Vector3(x, maxY, minZ)
                ]);
                this.meshGroup.add(new THREE.Line(lineGeom, gridMaterial));
            }
            for (let y = Math.ceil(minY); y <= maxY; y += gridStep) {
                const lineGeom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(minX, y, minZ),
                    new THREE.Vector3(maxX, y, minZ)
                ]);
                this.meshGroup.add(new THREE.Line(lineGeom, gridMaterial));
            }

            // Z axis tick marks and labels
            const zRange = maxZ - minZ;
            const zStep = Math.pow(10, Math.floor(Math.log10(zRange))) || 1;
            const tickSize = (maxX - minX) * 0.02;

            // Create sprite material for labels
            const createLabel = (text, position) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 128;
                canvas.height = 64;
                ctx.fillStyle = '#000000';
                ctx.font = '32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(text, 64, 40);
                const texture = new THREE.CanvasTexture(canvas);
                const spriteMat = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.position.copy(position);
                sprite.scale.set((maxX - minX) * 0.15, (maxX - minX) * 0.075, 1);
                return sprite;
            };

            if (!options.hideZLabels) {
                for (let z = Math.ceil(minZ / zStep) * zStep; z <= maxZ; z += zStep) {
                    // Tick mark
                    const tickGeom = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(minX - tickSize, minY, z),
                        new THREE.Vector3(minX + tickSize, minY, z)
                    ]);
                    this.meshGroup.add(new THREE.Line(tickGeom, axesMaterial));

                    // Label (divide by 10 to show true values since heights are scaled x10)
                    const trueZ = z / 10;
                    const label = createLabel(trueZ.toFixed(1), new THREE.Vector3(minX - tickSize * 4, minY, z));
                    this.meshGroup.add(label);
                }
            }

            // Draw polygon boundary above or below the surface (if showOutline is not explicitly false)
            const drawBoundary = options.showOutline !== false;
            if (drawBoundary && boundaries && boundaries.length > 0) {
                let boundaryZ;
                if (options.boundaryAtZero) {
                    // At z=0 for fluctuations (centered around zero)
                    boundaryZ = 0;
                } else if (options.boundaryAbove) {
                    boundaryZ = maxZ + zRange * 0.1;
                } else {
                    boundaryZ = minZ - zRange * 0.1; // Below for normal height function
                }
                const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

                for (const boundary of boundaries) {
                    if (boundary.length < 2) continue;
                    const points = boundary.map(pt => new THREE.Vector3(pt.x, pt.y, boundaryZ));
                    points.push(points[0]); // Close the loop
                    const boundaryGeom = new THREE.BufferGeometry().setFromPoints(points);
                    this.meshGroup.add(new THREE.Line(boundaryGeom, boundaryMaterial));
                }

                // Also draw filled polygon (unless boundaryLineOnly is set)
                if (!options.boundaryLineOnly && boundaries[0] && boundaries[0].length >= 3) {
                    const shape = new THREE.Shape();
                    shape.moveTo(boundaries[0][0].x, boundaries[0][0].y);
                    for (let i = 1; i < boundaries[0].length; i++) {
                        shape.lineTo(boundaries[0][i].x, boundaries[0][i].y);
                    }
                    shape.closePath();
                    const shapeGeom = new THREE.ShapeGeometry(shape);
                    // Position at boundaryZ
                    shapeGeom.translate(0, 0, boundaryZ);
                    const shapeMat = new THREE.MeshBasicMaterial({
                        color: 0xeeeeee,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.5
                    });
                    const shapeMesh = new THREE.Mesh(shapeGeom, shapeMat);
                    this.meshGroup.add(shapeMesh);
                }
            }

            // Center camera for surface plot
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const cz = (minZ + maxZ) / 2;
            const range = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
            this.camera.position.set(cx + range * 0.6, cy - range * 0.8, cz + range * 0.6);
            this.camera.lookAt(cx, cy, cz);
            this.controls.target.set(cx, cy, cz);
            this.controls.update();
        }

        centerCamera(heights) {
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;

            for (const [key, h] of heights) {
                const [n, j] = key.split(',').map(Number);
                const x = n - j * 0.5;
                const y = j * Math.sqrt(3) / 2;
                const z = h;

                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const centerZ = (minZ + maxZ) / 2;
            const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 10;

            this.controls.target.set(centerX, centerY, centerZ);
            this.camera.position.set(
                centerX - size * 3.0,
                centerY + size * 1.5,
                centerZ + size * 1.5
            );
            this.camera.lookAt(centerX, centerY, centerZ);
            this.controls.update();
        }

        resetCamera() {
            // Get bounding box of the model
            const box = new THREE.Box3();
            if (this.meshGroup && this.meshGroup.children.length > 0) {
                box.setFromObject(this.meshGroup);
            } else {
                // Default box if no geometry
                box.set(new THREE.Vector3(-50, -50, -50), new THREE.Vector3(50, 50, 50));
            }

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 100;

            const w = this.container.clientWidth || 900;
            const h = this.container.clientHeight || 600;
            const aspect = w / h;

            if (this.usePerspective) {
                // Position camera to fit the bounding sphere
                const fov = this.camera.fov * (Math.PI / 180);
                const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.8;
                this.camera.position.set(
                    center.x - distance * 0.7,
                    center.y + distance * 0.5,
                    center.z + distance * 0.5
                );
                this.camera.lookAt(center);
            } else {
                // Orthographic: set frustum to fit the model with padding
                const frustum = maxDim * 1.3;
                this.camera.left = -frustum * aspect / 2;
                this.camera.right = frustum * aspect / 2;
                this.camera.top = frustum / 2;
                this.camera.bottom = -frustum / 2;
                this.camera.position.set(
                    center.x - maxDim,
                    center.y + maxDim,
                    center.z + maxDim
                );
                this.camera.lookAt(center);
                this.camera.updateProjectionMatrix();
            }
            this.controls.target.copy(center);
            this.controls.update();
            this.cameraInitialized = true;
        }

        zoom(factor) {
            if (this.usePerspective) {
                // Perspective: dolly camera towards/away from target
                const direction = new THREE.Vector3();
                direction.subVectors(this.camera.position, this.controls.target);
                direction.multiplyScalar(1 / factor);
                this.camera.position.copy(this.controls.target).add(direction);
                this.controls.update();
            } else {
                // Orthographic: adjust frustum size
                const scaleFactor = 1 / factor;  // factor > 1 means zoom in, so shrink frustum
                this.camera.left *= scaleFactor;
                this.camera.right *= scaleFactor;
                this.camera.top *= scaleFactor;
                this.camera.bottom *= scaleFactor;
                this.camera.updateProjectionMatrix();
            }
        }

        pan(deltaX, deltaY) {
            // Pan camera and target in screen space
            const offset = new THREE.Vector3();

            // Get camera's right and up vectors
            const right = new THREE.Vector3();
            const up = new THREE.Vector3();
            this.camera.matrix.extractBasis(right, up, new THREE.Vector3());

            // Scale pan amount based on distance to target
            const distance = this.camera.position.distanceTo(this.controls.target);
            const panScale = distance * 0.002;

            offset.addScaledVector(right, -deltaX * panScale);
            offset.addScaledVector(up, deltaY * panScale);

            this.camera.position.add(offset);
            this.controls.target.add(offset);
            this.controls.update();
        }

        rotateHorizontal(angleDegrees) {
            // Rotate camera around the target, around the X+Y=0 axis (direction (1,-1,0))
            const angleRadians = angleDegrees * Math.PI / 180;
            const target = this.controls.target;
            const offset = new THREE.Vector3();
            offset.subVectors(this.camera.position, target);

            // Rotate around axis (1, -1, 0) normalized
            const axis = new THREE.Vector3(1, -1, 0).normalize();
            offset.applyAxisAngle(axis, angleRadians);

            this.camera.position.copy(target).add(offset);
            this.camera.lookAt(target);
            this.controls.update();
        }

        updateDarkMode(isDark) {
            this.scene.background = new THREE.Color(isDark ? 0x1a1a1a : 0xffffff);
        }
    }

    // ========================================================================
    // MAIN APPLICATION
    // ========================================================================
    const canvas = document.getElementById('lozenge-canvas');
    const threeContainer = document.getElementById('three-container');
    const sim = new UltimateLozengeSampler();
    const renderer = new LozengeRenderer(canvas);
    const undoStack = new UndoStack();

    // iOS canvas context loss recovery
    let contextLost = false;
    canvas.addEventListener('contextlost', (e) => {
        e.preventDefault();
        contextLost = true;
    });
    canvas.addEventListener('contextrestored', () => {
        contextLost = false;
        renderer.setupCanvas();
        draw();
    });

    // WebGPU Engine (initialized asynchronously if available)
    let gpuEngine = null;
    let useWebGPU = false;

    // Initialize WebGPU engine if available (with timeout for iOS Safari)
    if (window.LOZENGE_WEBGPU && window.WebGPULozengeEngine) {
        (async () => {
            try {
                gpuEngine = new WebGPULozengeEngine();
                // Add timeout for iOS Safari where requestAdapter can hang after page refresh
                const initPromise = gpuEngine.init();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('WebGPU init timeout')), 3000)
                );
                await Promise.race([initPromise, timeoutPromise]);
                console.log('WebGPU Lozenge Engine ready');
                // Show GPU indicator
                const gpuIndicator = document.getElementById('gpuIndicator');
                if (gpuIndicator) gpuIndicator.style.display = 'inline';
                // Sync grid data if simulation is already valid (async init may complete after reinitRegion)
                if (isValid && sim) {
                    const gridInfo = sim.getRawGridData();
                    if (gridInfo) {
                        gpuEngine.initFromWasmData(gridInfo.data, gridInfo.minN, gridInfo.maxN, gridInfo.minJ, gridInfo.maxJ);
                        useWebGPU = true;
                        console.log('WebGPU grid synced after async init');
                    }
                }
            } catch (e) {
                console.warn('WebGPU initialization failed:', e);
                gpuEngine = null;
            }
        })();
    }

    let activeTriangles = new Map();
    let isDrawing = false;
    // Tools: 'draw', 'erase', 'lassoFill', 'lassoErase', 'belowFill', 'belowErase'
    let currentTool = 'draw';
    let running = false;

    // 3D view state
    let is3DView = false;
    let renderer3D = null;

    // Lasso state (drag to select)
    let lassoPoints = []; // Array of {x, y} in world coordinates
    let isLassoing = false;
    let lassoCursor = null; // Current cursor position for lasso preview

    let stepsPerSecond = 100;
    let animationId = null;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let currentFps = 0;
    let isValid = false;
    let showHoleLabels = true;
    let useRandomSweeps = false;  // Track sweep mode for step normalization
    let sweepAccumulator = 0;      // Accumulator for fractional sweeps in systematic mode

    const el = {
        handBtn: document.getElementById('handBtn'),
        drawBtn: document.getElementById('drawBtn'),
        eraseBtn: document.getElementById('eraseBtn'),
        lassoFillBtn: document.getElementById('lassoFillBtn'),
        lassoEraseBtn: document.getElementById('lassoEraseBtn'),
        resetBtn: document.getElementById('resetBtn'),
        undoBtn: document.getElementById('undoBtn'),
        redoBtn: document.getElementById('redoBtn'),
        statusBadge: document.getElementById('statusBadge'),
        hexagonBtn: document.getElementById('hexagonBtn'),
        hexAInput: document.getElementById('hexAInput'),
        hexBInput: document.getElementById('hexBInput'),
        hexCInput: document.getElementById('hexCInput'),
        letterSelect: document.getElementById('letterSelect'),
        showBoundaryLengthsCheckbox: document.getElementById('showBoundaryLengthsCheckbox'),
        labelSizeInput: document.getElementById('labelSizeInput'),
        labelOffsetInput: document.getElementById('labelOffsetInput'),
        shapeOfMonthBtn: document.getElementById('shapeOfMonthBtn'),
        lozengeViewBtn: document.getElementById('lozengeViewBtn'),
        pathViewBtn: document.getElementById('pathViewBtn'),
        dimerViewBtn: document.getElementById('dimerViewBtn'),
        pathWidthPx: document.getElementById('pathWidthPx'),
        paletteSelect: document.getElementById('palette-select'),
        outlineWidthPct: document.getElementById('outlineWidthPct'),
        speedSlider: document.getElementById('speedSlider'),
        speedInput: document.getElementById('speedInput'),
        startStopBtn: document.getElementById('startStopBtn'),
        cftpBtn: document.getElementById('cftpBtn'),
        cftpBtn2: document.getElementById('cftpBtn2'),
        repairBtn: document.getElementById('repairBtn'),
        qInput: document.getElementById('qInput'),
        dimerCount: document.getElementById('dimerCount'),
        stepCount: document.getElementById('stepCount'),
        cftpSteps: document.getElementById('cftpSteps'),
        cftpStopBtn: document.getElementById('cftpStopBtn'),
        toggle3DBtn: document.getElementById('toggle3DBtn'),
        perspectiveBtn: document.getElementById('perspectiveBtn'),
        preset3DBtn: document.getElementById('preset3DBtn'),
        renderModeSelect: document.getElementById('renderModeSelect'),
        averageBtn: document.getElementById('averageBtn'),
        avgSamplesInput: document.getElementById('avgSamplesInput'),
        avgStopBtn: document.getElementById('avgStopBtn'),
        avgProgress: document.getElementById('avgProgress'),
        fluctuationsBtn: document.getElementById('fluctuationsBtn'),
        fluctProgress: document.getElementById('fluctProgress'),
        fluctScaleInput: document.getElementById('fluctScaleInput'),
        fluctOutlineCheck: document.getElementById('fluctOutlineCheck'),
        doubleDimerBtn: document.getElementById('doubleDimerBtn'),
        doubleDimerProgress: document.getElementById('doubleDimerProgress'),
        minLoopInput: document.getElementById('minLoopInput'),
        resampleBtn: document.getElementById('resampleBtn'),
    };

    // CFTP cancellation flag
    let cftpCancelled = false;
    // GPU busy lock - prevents reinitialize() from destroying buffers mid-frame
    let isGpuBusy = false;
    // Average sampling cancellation flag
    let avgCancelled = false;
    // Fluctuations cancellation flag
    let fluctCancelled = false;
    // Double dimer cancellation flag
    let doubleDimerCancelled = false;
    // Store raw dimer samples (shared between fluctuations and double dimer views)
    let storedSamples = null; // {dimers0, dimers1}
    // Store computed fluctuation heights for dynamic re-rendering
    let rawFluctuations = null;
    // Flag to prevent draw() from overwriting fluctuation surface
    let inFluctuationMode = false;
    // Flag to prevent draw() from overwriting double dimer view
    let inDoubleDimerMode = false;

    function renderFluctuations() {
        if (!rawFluctuations || !renderer3D) return;
        const scale = parseFloat(el.fluctScaleInput.value) || 10;
        const fluctHeights = new Map();
        for (const [key, raw] of rawFluctuations) {
            fluctHeights.set(key, raw * scale);
        }
        const showOutline = el.fluctOutlineCheck.checked;
        renderer3D.heightFunctionTo3D(fluctHeights, sim.blackTriangles, sim.whiteTriangles, sim.boundaries, { hideZLabels: true, flatShading: true, boundaryAtZero: true, boundaryLineOnly: true, showOutline });
    }

    // Render 2D fluctuation field as a heatmap on triangles
    function renderFluctuations2D() {
        if (!rawFluctuations) return;

        const ctx = canvas.getContext('2d');
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const scale = parseFloat(el.fluctScaleInput.value) || 10;

        // Clear canvas
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        const { centerX, centerY, scale: viewScale } = renderer.getTransform(activeTriangles);

        // Draw grid background if enabled
        if (renderer.showGrid) {
            renderer.drawBackgroundGrid(ctx, centerX, centerY, viewScale, isDarkMode);
        }

        // Find min/max fluctuation values for color scaling
        let minVal = Infinity, maxVal = -Infinity;
        for (const [, raw] of rawFluctuations) {
            const v = raw * scale;
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
        }
        // Symmetrize around zero for diverging colormap
        const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));

        // Diverging colormap: blue (negative) -> white (zero) -> red (positive)
        // Use gamma < 1 to boost visibility of small values (make colors more saturated)
        const gamma = 0.5; // sqrt mapping - small values become more visible
        function valueToColor(val) {
            if (absMax === 0) return 'rgb(255, 255, 255)';
            const t = val / absMax; // -1 to 1
            if (t < 0) {
                // Blue to white
                const s = Math.pow(-t, gamma); // gamma correction for visibility
                const r = Math.round(255 * (1 - s));
                const g = Math.round(255 * (1 - s));
                const b = 255;
                return `rgb(${r}, ${g}, ${b})`;
            } else {
                // White to red
                const s = Math.pow(t, gamma); // gamma correction for visibility
                const r = 255;
                const g = Math.round(255 * (1 - s));
                const b = Math.round(255 * (1 - s));
                return `rgb(${r}, ${g}, ${b})`;
            }
        }

        // Helper to get fluctuation value at a vertex
        function getFluctValue(n, j) {
            const key = `${n},${j}`;
            const raw = rawFluctuations.get(key);
            return raw !== undefined ? raw * scale : 0;
        }

        // Draw each triangle colored by average vertex fluctuation
        for (const [, tri] of activeTriangles) {
            let verts, vertKeys;
            if (tri.type === 1) {
                // Black (right-facing): (n,j), (n,j-1), (n+1,j-1)
                verts = [getVertex(tri.n, tri.j), getVertex(tri.n, tri.j - 1), getVertex(tri.n + 1, tri.j - 1)];
                vertKeys = [[tri.n, tri.j], [tri.n, tri.j - 1], [tri.n + 1, tri.j - 1]];
            } else {
                // White (left-facing): (n,j), (n+1,j), (n+1,j-1)
                verts = [getVertex(tri.n, tri.j), getVertex(tri.n + 1, tri.j), getVertex(tri.n + 1, tri.j - 1)];
                vertKeys = [[tri.n, tri.j], [tri.n + 1, tri.j], [tri.n + 1, tri.j - 1]];
            }

            // Average fluctuation value at triangle vertices
            const avgVal = (getFluctValue(vertKeys[0][0], vertKeys[0][1]) +
                           getFluctValue(vertKeys[1][0], vertKeys[1][1]) +
                           getFluctValue(vertKeys[2][0], vertKeys[2][1])) / 3;

            const canvasVerts = verts.map(v => renderer.toCanvas(v.x, v.y, centerX, centerY, viewScale));

            ctx.beginPath();
            ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
            ctx.lineTo(canvasVerts[1][0], canvasVerts[1][1]);
            ctx.lineTo(canvasVerts[2][0], canvasVerts[2][1]);
            ctx.closePath();

            ctx.fillStyle = valueToColor(avgVal);
            ctx.fill();
        }

        // Fill holes with their constrained height-based colors
        // Holes are boundaries[1], boundaries[2], ... (index 0 is the outer boundary)
        if (sim.boundaries && sim.boundaries.length > 1) {
            const holesInfo = sim.getAllHolesInfo();
            const wasmHoles = holesInfo.holes || [];

            // Find outer boundary index (largest absolute area)
            let outerIdx = 0;
            let maxArea = 0;
            for (let i = 0; i < sim.boundaries.length; i++) {
                const b = sim.boundaries[i];
                let area = 0;
                for (let k = 0; k < b.length; k++) {
                    const next = (k + 1) % b.length;
                    area += b[k].x * b[next].y - b[next].x * b[k].y;
                }
                if (Math.abs(area) > maxArea) {
                    maxArea = Math.abs(area);
                    outerIdx = i;
                }
            }

            // Fill each hole with color based on its height constraint
            let holeIdx = 0;
            for (let i = 0; i < sim.boundaries.length; i++) {
                if (i === outerIdx) continue; // Skip outer boundary
                const boundary = sim.boundaries[i];
                if (boundary.length < 3) continue;

                // Get hole's relative height (currentWinding - baseHeight)
                // For fluctuations field, since both samples respect the same constraints,
                // the fluctuation value at the hole should be 0
                let holeFluctValue = 0;
                if (wasmHoles[holeIdx]) {
                    // The fluctuation (h1-h2)/sqrt2 at hole should be 0 if constraints match
                    // But we can show the relative height scaled by the UI scale factor
                    const relativeHeight = wasmHoles[holeIdx].currentWinding - wasmHoles[holeIdx].baseHeight;
                    holeFluctValue = relativeHeight * scale; // Use same scale as display
                }

                ctx.beginPath();
                const [sx, sy] = renderer.toCanvas(boundary[0].x, boundary[0].y, centerX, centerY, viewScale);
                ctx.moveTo(sx, sy);
                for (let j = 1; j < boundary.length; j++) {
                    const [px, py] = renderer.toCanvas(boundary[j].x, boundary[j].y, centerX, centerY, viewScale);
                    ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = valueToColor(holeFluctValue);
                ctx.fill();

                holeIdx++;
            }
        }

        // Draw boundary (polygon outline) if enabled
        if (el.fluctOutlineCheck.checked && sim.boundaries && sim.boundaries.length > 0) {
            for (const boundary of sim.boundaries) {
                renderer.drawBoundary(ctx, boundary, centerX, centerY, viewScale, isDarkMode);
            }
        }

        // Draw color scale legend
        const legendX = renderer.displayWidth - 80;
        const legendY = 20;
        const legendW = 20;
        const legendH = 120;
        const numSteps = 50;

        // Draw gradient bar
        for (let i = 0; i < numSteps; i++) {
            const t = 1 - 2 * i / (numSteps - 1); // 1 to -1 (top to bottom)
            const val = t * absMax;
            ctx.fillStyle = valueToColor(val);
            ctx.fillRect(legendX, legendY + i * (legendH / numSteps), legendW, legendH / numSteps + 1);
        }

        // Legend border
        ctx.strokeStyle = isDarkMode ? '#666' : '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY, legendW, legendH);

        // Legend labels
        ctx.fillStyle = isDarkMode ? '#ccc' : '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`+${absMax.toFixed(1)}`, legendX + legendW + 4, legendY + 10);
        ctx.fillText('0', legendX + legendW + 4, legendY + legendH / 2 + 4);
        ctx.fillText(`−${absMax.toFixed(1)}`, legendX + legendW + 4, legendY + legendH);
    }

    // ========================================================================
    // HOLE DETECTION AND WINDING CONSTRAINTS
    // ========================================================================
    // Hole detection and winding control is now handled in WASM (C++).
    // The C++ functions: getHoleCount(), getAllHolesInfo(), adjustHoleWindingExport()
    // are wrapped in the UltimateLozengeSampler class.

    // Get hole overlays container
    const holeOverlays = document.getElementById('hole-overlays');

    // Convert world coords to screen coords using renderer's toCanvas
    function worldToScreen(worldX, worldY) {
        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const [sx, sy] = renderer.toCanvas(worldX, worldY, centerX, centerY, scale);
        return { x: sx, y: sy };
    }

    // Optimized Overlay Position Updater (No WASM calls, No Layout Thrashing)
    // Reads world coordinates from dataset instead of calling sim.getAllHolesInfo()
    function updateHoleOverlayPositions() {
        const controls = holeOverlays.querySelectorAll('.hole-control');
        if (controls.length === 0) return;

        // NO WASM CALL - read from cached dataset instead
        controls.forEach(ctrl => {
            const wx = parseFloat(ctrl.dataset.worldX);
            const wy = parseFloat(ctrl.dataset.worldY);

            if (isNaN(wx) || isNaN(wy)) return;

            let screen;
            if (is3DView && renderer3D) {
                screen = renderer3D.worldToScreen3D(wx, wy, 0);
            } else {
                screen = worldToScreen(wx, wy);
            }

            // Use transform for hardware accelerated movement (no layout thrashing)
            ctrl.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`;
        });
    }

    // Update the holes UI - creates overlay controls inside each hole
    function updateHolesUI() {
        // Clear existing overlays
        holeOverlays.innerHTML = '';

        if (!showHoleLabels) return;
        if (!isValid) return;

        // Get hole info from WASM
        const holesInfo = sim.getAllHolesInfo();
        const wasmHoles = holesInfo.holes || [];

        if (wasmHoles.length === 0) return;

        // Check dimer count to decide UI mode
        const dimerCount = sim.dimers ? sim.dimers.length : 0;
        const useBatchMode = dimerCount >= 1000;

        // Create control for each hole
        for (let h = 0; h < wasmHoles.length; h++) {
            const hole = wasmHoles[h];
            let screen;
            if (is3DView && renderer3D) {
                screen = renderer3D.worldToScreen3D(hole.centroidX, hole.centroidY, 0);
            } else {
                screen = worldToScreen(hole.centroidX, hole.centroidY);
            }

            const ctrl = document.createElement('div');
            ctrl.className = 'hole-control';
            // Use transform for hardware-accelerated positioning
            ctrl.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0)`;
            ctrl.dataset.hole = h;
            // STORE WORLD COORDS IN DATASET for fast position updates (no WASM calls)
            ctrl.dataset.worldX = hole.centroidX;
            ctrl.dataset.worldY = hole.centroidY;

            // Both modes: [+] [height] [-] with editable height in center
            // Display relative height (currentWinding - baseHeight), starts at 0
            const relativeHeight = hole.currentWinding - hole.baseHeight;
            ctrl.innerHTML = `
                <button class="winding-plus">+</button>
                <input type="number" class="height-input" value="${relativeHeight}" title="Relative height (starts at 0)">
                <button class="winding-minus">−</button>
            `;
            const heightInput = ctrl.querySelector('.height-input');
            const minusBtn = ctrl.querySelector('.winding-minus');
            const plusBtn = ctrl.querySelector('.winding-plus');

            // Height input change handler - adjust winding to reach target
            heightInput.addEventListener('change', (e) => {
                e.stopPropagation();
                const holeIdx = parseInt(ctrl.dataset.hole);
                const targetRelativeHeight = parseInt(e.target.value) || 0;
                const currentRelativeHeight = hole.currentWinding - hole.baseHeight;
                const delta = targetRelativeHeight - currentRelativeHeight;
                if (delta !== 0) {
                    heightInput.disabled = true;
                    minusBtn.disabled = true;
                    plusBtn.disabled = true;
                    setTimeout(() => {
                        sim.adjustHoleWinding(holeIdx, delta);
                        sim.refreshDimers();
                        draw();
                        updateHolesUI();
                    }, 10);
                }
            });
            heightInput.addEventListener('click', (e) => e.stopPropagation());

            // Winding adjustment buttons
            minusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const holeIdx = parseInt(ctrl.dataset.hole);
                minusBtn.textContent = '⏳';
                minusBtn.disabled = true;
                plusBtn.disabled = true;
                heightInput.disabled = true;
                setTimeout(() => {
                    const result = sim.adjustHoleWinding(holeIdx, -1);
                    if (result.success) {
                        sim.refreshDimers();
                        draw();
                    }
                    updateHolesUI();
                }, useBatchMode ? 10 : 10);
            });

            plusBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const holeIdx = parseInt(ctrl.dataset.hole);
                plusBtn.textContent = '⏳';
                plusBtn.disabled = true;
                minusBtn.disabled = true;
                heightInput.disabled = true;
                setTimeout(() => {
                    const result = sim.adjustHoleWinding(holeIdx, 1);
                    if (result.success) {
                        sim.refreshDimers();
                        draw();
                    }
                    updateHolesUI();
                }, useBatchMode ? 10 : 10);
            });

            holeOverlays.appendChild(ctrl);
        }
    }

    function initPaletteSelector() {
        renderer.colorPalettes.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.name;
            el.paletteSelect.appendChild(opt);
        });
        // Random palette on load, excluding "No Colors" (index 2)
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * renderer.colorPalettes.length);
        } while (renderer.colorPalettes[randomIndex].name === 'No Colors');
        renderer.setPalette(randomIndex);
        el.paletteSelect.value = renderer.currentPaletteIndex;
        renderer.updateLegend();
    }

    function formatNumber(n) {
        if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toString();
    }

    function updateUI() {
        el.dimerCount.textContent = isValid ? sim.dimers.length : 0;
        // Show warning for large regions (>30K vertices)
        const dimerWarning = document.getElementById('dimerWarning');
        if (dimerWarning) {
            const vertexCount = countVertices();
            dimerWarning.style.display = (isValid && vertexCount > 30000) ? 'inline' : 'none';
        }
        el.stepCount.textContent = formatNumber(sim.getTotalSteps());

        // Status badge with icons - show different states
        if (activeTriangles.size === 0) {
            el.statusBadge.className = 'validity-status status-empty';
            el.statusBadge.innerHTML = '<span class="status-icon">○</span><span class="status-text">Empty</span>';
            el.statusBadge.style.display = '';
        } else if (isValid) {
            el.statusBadge.className = 'validity-status status-valid';
            el.statusBadge.innerHTML = '<span class="status-icon">✓</span><span class="status-text">Valid</span>';
            el.statusBadge.style.display = '';
        } else {
            el.statusBadge.className = 'validity-status status-invalid';
            el.statusBadge.innerHTML = '<span class="status-icon">✗</span><span class="status-text">Invalid</span>';
            el.statusBadge.style.display = '';
        }

        // Enable/disable simulation buttons
        el.startStopBtn.disabled = !isValid;
        el.cftpBtn.disabled = !isValid;
        el.cftpBtn2.disabled = !isValid;
        el.averageBtn.disabled = !isValid;
        el.fluctuationsBtn.disabled = !isValid;
        el.doubleDimerBtn.disabled = !isValid;

        // Enable repair button only if Invalid and Not Empty
        el.repairBtn.disabled = isValid || activeTriangles.size === 0;

        // Update holes UI
        updateHolesUI();

        // Update scale up button warning
        updateScaleUpWarning();
    }

    function countVertices() {
        // Count unique vertices from active triangles
        const vertices = new Set();
        for (const tri of activeTriangles.values()) {
            const { n, j, t } = tri;
            if (t === 0) {
                vertices.add(`${n},${j}`);
                vertices.add(`${n+1},${j}`);
                vertices.add(`${n+1},${j-1}`);
            } else {
                vertices.add(`${n},${j}`);
                vertices.add(`${n+1},${j}`);
                vertices.add(`${n+1},${j-1}`);
            }
        }
        return vertices.size;
    }

    function updateScaleUpWarning() {
        const btn = document.getElementById('doubleMeshBtn');
        if (!btn) return;
        const vertexCount = countVertices();
        if (vertexCount > 5000) {
            btn.textContent = 'Scale Up Region ⚠️';
            btn.title = 'Double the region size (may take a moment)';
        } else {
            btn.textContent = 'Scale Up Region';
            btn.title = 'Double the region size';
        }
    }

    function setViewMode(use3D) {
        is3DView = use3D;
        canvas.style.display = use3D ? 'none' : 'block';
        threeContainer.style.display = use3D ? 'block' : 'none';
        // Hole overlays are shown in both 2D and 3D views
        el.toggle3DBtn.textContent = use3D ? '2D' : '3D';
        // Show/hide 3D option buttons (grouped in view3DOverlay container)
        const view3DOverlay = document.getElementById('view3DOverlay');
        if (view3DOverlay) {
            view3DOverlay.style.display = use3D ? 'flex' : 'none';
        }
        el.perspectiveBtn.style.display = use3D ? 'inline-block' : 'none';
        el.preset3DBtn.style.display = use3D ? 'inline-block' : 'none';
        // Show/hide 2D/3D view control rows in Styling section
        const view2DRow = document.getElementById('view2DControlsRow');
        const view3DRow = document.getElementById('view3DControlsRow');
        if (view2DRow) view2DRow.style.display = use3D ? 'none' : 'flex';
        if (view3DRow) view3DRow.style.display = use3D ? 'flex' : 'none';
        if (use3D && renderer3D) {
            el.preset3DBtn.textContent = renderer3D.getCurrentPreset().icon;
            el.preset3DBtn.title = `Style: ${renderer3D.getCurrentPreset().name}`;
        }
        // Enable/disable rotate buttons based on 3D view
        document.getElementById('rotateLeftBtn').disabled = !use3D;
        document.getElementById('rotateRightBtn').disabled = !use3D;
        // Auto-disable hole labels when entering 3D (user can re-enable)
        if (use3D) {
            const holeLabelsCheckbox = document.getElementById('showHoleLabelsCheckbox');
            if (holeLabelsCheckbox && holeLabelsCheckbox.checked) {
                holeLabelsCheckbox.checked = false;
                showHoleLabels = false;
            }
        }

        // Disable lozenge/dimer/path toggle in 3D mode (not applicable)
        const rotate2DBtn = document.getElementById('rotate2DBtn');
        el.lozengeViewBtn.disabled = use3D;
        el.pathViewBtn.disabled = use3D;
        el.dimerViewBtn.disabled = use3D;
        el.lozengeViewBtn.style.opacity = use3D ? '0.5' : '1';
        el.pathViewBtn.style.opacity = use3D ? '0.5' : '1';
        el.dimerViewBtn.style.opacity = use3D ? '0.5' : '1';
        // rotate2DBtn stays enabled - it toggles 90-deg rotation in 2D and auto-rotate in 3D
        // Reset button active state when switching views
        if (rotate2DBtn) {
            rotate2DBtn.classList.remove('active');
            if (use3D && renderer3D) {
                renderer3D.autoRotate = false;
            } else {
                renderer.rotated = false;
            }
        }

        if (use3D) {
            if (!renderer3D) {
                renderer3D = new Lozenge3DRenderer(threeContainer);
                // Update hole label positions when camera moves in 3D
                renderer3D.controls.addEventListener('change', updateHoleOverlayPositions);
            }
            // Sync palette and permutation
            renderer3D.setPalette(renderer.currentPaletteIndex);
            renderer3D.colorPermutation = renderer.colorPermutation;
            // Update dark mode
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            renderer3D.updateDarkMode(isDarkMode);
            // Render 3D view - use fluctuations if in that mode
            if (inFluctuationMode && rawFluctuations) {
                renderFluctuations();
            } else if (isValid && sim.dimers.length > 0) {
                renderer3D.renderDimers(sim.dimers, sim.boundaries);
                renderer3D.resetCamera();
            }
        } else {
            // 2D view - use fluctuations heatmap if in that mode
            if (inFluctuationMode && rawFluctuations) {
                renderFluctuations2D();
            } else {
                draw();
            }
        }
        // Refresh hole overlays for new view mode
        updateHolesUI();
    }

    function draw() {
        // Try to recover from context loss (iOS)
        if (contextLost) {
            renderer.setupCanvas();
            if (renderer.ctx) {
                contextLost = false;
            } else {
                return;
            }
        }

        // Check if context is valid
        if (!renderer.ctx) {
            renderer.setupCanvas();
            if (!renderer.ctx) {
                return;
            }
        }

        // If in double dimer mode, render that instead
        if (inDoubleDimerMode && storedSamples) {
            renderDoubleDimers();
            updateHoleOverlayPositions();
            return;
        }

        // If in 2D fluctuation mode, render heatmap instead
        if (inFluctuationMode && rawFluctuations && !is3DView) {
            renderFluctuations2D();
            updateHoleOverlayPositions();
            return;
        }

        if (is3DView && renderer3D && isValid && sim.dimers.length > 0 && !inFluctuationMode) {
            renderer3D.renderDimers(sim.dimers, sim.boundaries);
        }

        renderer.draw(sim, activeTriangles, isValid);

        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const tool = getEffectiveTool();

        // Draw lasso overlay if active
        if (lassoPoints.length > 0 || isLassoing) {
            const isFillMode = tool === 'lassoFill';
            renderer.drawLasso(renderer.ctx, lassoPoints, centerX, centerY, scale, isFillMode, lassoCursor);
        }

        // Update hole overlay positions on pan/zoom
        updateHoleOverlayPositions();
    }

    // Track if simulation should auto-restart when shape becomes valid
    let wasRunningBeforeInvalid = false;

    function reinitialize() {
        const wasRunning = running;

        // Clear sampling modes when polygon changes
        inFluctuationMode = false;
        inDoubleDimerMode = false;
        storedSamples = null;
        rawFluctuations = null;
        el.resampleBtn.style.display = 'none';
        el.fluctProgress.textContent = '';
        el.doubleDimerProgress.textContent = '';

        // Stop animation loop temporarily
        if (animationId) {
            cancelAnimationFrame(animationId);
            clearTimeout(animationId);
            animationId = null;
        }

        const result = sim.initFromTriangles(activeTriangles);
        const wasValid = isValid;
        isValid = result.status === 'valid';

        // Sync grid data to WebGPU if available and valid
        // Check gpuEngine.isReady (GPU initialized) rather than isInitialized() (which also requires gridBuffer)
        // SAFETY: Skip if GPU is busy (prevents destroying buffers mid-CFTP)
        if (isGpuBusy) {
            console.warn('[reinitialize] Skipping GPU init - GPU is busy');
        } else if (isValid && gpuEngine && gpuEngine.isReady) {
            const gridInfo = sim.getRawGridData();
            if (gridInfo) {
                try {
                    gpuEngine.initFromWasmData(gridInfo.data, gridInfo.minN, gridInfo.maxN, gridInfo.minJ, gridInfo.maxJ);
                    // Set GPU weights if periodic weights UI is available
                    if (typeof currentPeriodicQ !== 'undefined' && typeof currentPeriodicK !== 'undefined') {
                        const usePeriodic = document.getElementById('usePeriodicWeightsCheckbox')?.checked || false;
                        gpuEngine.setWeights(currentPeriodicQ, currentPeriodicK, usePeriodic);
                    }
                    useWebGPU = true;
                } catch (e) {
                    console.warn('[reinitialize] GPU sync failed (buffer resize error?), falling back to CPU:', e);
                    useWebGPU = false;
                }
            }
        } else {
            useWebGPU = false;
        }

        // Track if we should auto-restart when valid again
        if (wasRunning && !isValid) {
            wasRunningBeforeInvalid = true;
            running = false;
            el.startStopBtn.textContent = 'Start';
            el.startStopBtn.classList.remove('running');
        }

        // Auto-restart if shape became valid and we were running before
        if (isValid && wasRunningBeforeInvalid) {
            wasRunningBeforeInvalid = false;
            running = true;
            el.startStopBtn.textContent = 'Stop';
            el.startStopBtn.classList.add('running');
            lastFrameTime = performance.now();
            frameCount = 0;
            loop();
        } else if (isValid && wasRunning) {
            // Continue running if still valid
            running = true;
            loop();
        }

        updateUI();
        draw();
    }

    function saveState() {
        // Save both triangles and current dimers
        sim.refreshDimers();
        const state = {
            triangles: [],
            dimers: sim.dimers ? sim.dimers.slice() : null
        };
        for (const [key, tri] of activeTriangles) {
            state.triangles.push({ n: tri.n, j: tri.j, type: tri.type });
        }
        undoStack.push(state);
    }

    function loadState(state) {
        // Handle old format (array of triangles) and new format (object with triangles and dimers)
        const triangles = Array.isArray(state) ? state : state.triangles;
        const dimers = Array.isArray(state) ? null : state.dimers;

        activeTriangles.clear();
        for (const tri of triangles) {
            const key = `${tri.n},${tri.j},${tri.type}`;
            activeTriangles.set(key, { n: tri.n, j: tri.j, type: tri.type });
        }
        reinitialize();

        // Restore dimers if we have them
        if (dimers && dimers.length > 0) {
            sim.setDimers(dimers);
            sim.refreshDimers();
            draw();
        }
    }

    // ========================================================================
    // MOUSE/TOUCH INTERACTION
    // ========================================================================
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;

    // Helper: Check which triangle contains world point (x,y)
    // Returns {n, j, type} or null
    function getTriangleFromWorld(x, y) {
        // Convert world coords to lattice basis guess
        const n = Math.floor(x);
        const j = Math.floor((y - slope * n) / deltaC);

        // Check neighborhood candidates (n,j) for exact inclusion
        // We check a 1-ring around the estimate to be safe
        const candidates = [
            { n, j }, { n, j: j + 1 }, { n: n + 1, j }, { n: n - 1, j },
            { n, j: j - 1 }, { n: n + 1, j: j - 1 }, { n: n - 1, j: j + 1 }
        ];

        for (const { n: cn, j: cj } of candidates) {
            // Check Black (Type 1)
            const v1 = getVertex(cn, cj);
            const v2 = getVertex(cn, cj - 1);
            const v3 = getVertex(cn + 1, cj - 1);
            if (pointInTriangle(x, y, v1, v2, v3)) return { n: cn, j: cj, type: 1 };

            // Check White (Type 2)
            const w1 = getVertex(cn, cj);
            const w2 = getVertex(cn + 1, cj);
            const w3 = getVertex(cn + 1, cj - 1);
            if (pointInTriangle(x, y, w1, w2, w3)) return { n: cn, j: cj, type: 2 };
        }
        return null;
    }

    // Refactored mouse handler to use the helper
    function getTriangleAtPoint(mx, my) {
        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const { x, y } = renderer.fromCanvas(mx, my, centerX, centerY, scale);
        return getTriangleFromWorld(x, y);
    }

    function pointInTriangle(px, py, v1, v2, v3) {
        const d1 = sign(px, py, v1.x, v1.y, v2.x, v2.y);
        const d2 = sign(px, py, v2.x, v2.y, v3.x, v3.y);
        const d3 = sign(px, py, v3.x, v3.y, v1.x, v1.y);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        return !(hasNeg && hasPos);
    }

    function sign(px, py, x1, y1, x2, y2) {
        return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    }

    function handleDraw(tri) {
        // Add the specific triangle that was clicked
        const key = `${tri.n},${tri.j},${tri.type}`;
        if (!activeTriangles.has(key)) {
            activeTriangles.set(key, { n: tri.n, j: tri.j, type: tri.type });
            return true;
        }
        return false;
    }

    function handleErase(tri) {
        // Remove the specific triangle that was clicked
        const key = `${tri.n},${tri.j},${tri.type}`;
        if (activeTriangles.has(key)) {
            activeTriangles.delete(key);
            return true;
        }
        return false;
    }

    function completeLasso(isFillMode) {
        if (lassoPoints.length < 3) {
            lassoPoints = [];
            isLassoing = false;
            return false;
        }

        saveState();

        // Find bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of lassoPoints) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }

        const searchMinN = Math.floor(minX) - 2;
        const searchMaxN = Math.ceil(maxX) + 2;
        const nRange = searchMaxN - searchMinN;
        const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
        const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

        let changed = false;

        for (let n = searchMinN; n <= searchMaxN; n++) {
            for (let j = searchMinJ; j <= searchMaxJ; j++) {
                const blackCentroid = getRightTriangleCentroid(n, j);
                if (pointInPolygonPreset(blackCentroid.x, blackCentroid.y, lassoPoints)) {
                    const key = `${n},${j},1`;
                    if (isFillMode) {
                        if (!activeTriangles.has(key)) {
                            activeTriangles.set(key, { n, j, type: 1 });
                            changed = true;
                        }
                    } else {
                        if (activeTriangles.has(key)) {
                            activeTriangles.delete(key);
                            changed = true;
                        }
                    }
                }

                const whiteCentroid = getLeftTriangleCentroid(n, j);
                if (pointInPolygonPreset(whiteCentroid.x, whiteCentroid.y, lassoPoints)) {
                    const key = `${n},${j},2`;
                    if (isFillMode) {
                        if (!activeTriangles.has(key)) {
                            activeTriangles.set(key, { n, j, type: 2 });
                            changed = true;
                        }
                    } else {
                        if (activeTriangles.has(key)) {
                            activeTriangles.delete(key);
                            changed = true;
                        }
                    }
                }
            }
        }

        lassoPoints = [];
        isLassoing = false;
        return changed;
    }

    function handleInput(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX || e.touches[0].clientX) - rect.left;
        const my = (e.clientY || e.touches[0].clientY) - rect.top;

        const tool = getEffectiveTool();
        // Hand tool does nothing to the region
        if (tool === 'hand') return;

        const tri = getTriangleAtPoint(mx, my);
        if (!tri) return;

        let changed = false;
        if (tool === 'draw') {
            changed = handleDraw(tri);
        } else if (tool === 'erase') {
            changed = handleErase(tri);
        }

        if (changed) {
            reinitialize();
        }
    }

    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const zoomFactor = e.deltaY > 0 ? 0.97 : 1.03;
        renderer.zoomAt(mx, my, zoomFactor);
        draw();
    }, { passive: false });

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Track if cmd/meta is held for temporary tool switch
    let cmdHeld = false;
    // Track if shift is held for draw/erase toggle
    let shiftHeld = false;

    document.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey) cmdHeld = true;
        if (e.shiftKey) shiftHeld = true;
    });
    document.addEventListener('keyup', (e) => {
        // Reset if the Meta or Ctrl key itself was released
        if (e.key === 'Meta' || e.key === 'Control') cmdHeld = false;
        // Also reset if neither modifier is held
        if (!e.metaKey && !e.ctrlKey) cmdHeld = false;
        // Reset shift
        if (e.key === 'Shift') shiftHeld = false;
        if (!e.shiftKey) shiftHeld = false;
    });
    // Reset on focus loss to prevent stuck state
    window.addEventListener('blur', () => {
        cmdHeld = false;
        shiftHeld = false;
    });
    // Also reset when mouse is released
    canvas.addEventListener('mouseup', () => {
        cmdHeld = false;
    });

    function getEffectiveTool() {
        // Shift toggles between draw and erase
        if (shiftHeld) {
            if (currentTool === 'draw') return 'erase';
            if (currentTool === 'erase') return 'draw';
        }
        return currentTool;
    }

    function isLassoTool() {
        const tool = getEffectiveTool();
        return tool === 'lassoFill' || tool === 'lassoErase';
    }

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Right-click or middle-click = pan
        if (e.button === 2 || e.button === 1) {
            isPanning = true;
            lastPanX = mx;
            lastPanY = my;
            canvas.classList.add('panning');
            return;
        }

        // Hand tool = pan on left click too
        if (currentTool === 'hand') {
            isPanning = true;
            lastPanX = mx;
            lastPanY = my;
            canvas.classList.add('panning');
            return;
        }

        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const worldPos = renderer.fromCanvas(mx, my, centerX, centerY, scale);
        const lassoSnap = document.getElementById('lassoSnapBtn').classList.contains('active');

        // Left-click - handle different tool types
        if (isLassoTool()) {
            // Click-based lasso: click to add points, click near start to close
            if (!isLassoing) {
                // Start new lasso
                isLassoing = true;
                const pointToAdd = lassoSnap ? snapToLattice(worldPos) : worldPos;
                lassoPoints = [pointToAdd];
                draw();
            } else {
                // Snap direction to grid axes if enabled, then snap to lattice
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                let pointToAdd = worldPos;
                if (lassoSnap) {
                    const dirSnapped = snapDirectionToGrid(lastPoint, worldPos);
                    pointToAdd = snapToLattice(dirSnapped);
                }

                // Cmd-click (Mac) or Ctrl-click: add point and complete immediately
                if (e.metaKey || e.ctrlKey) {
                    if (pointToAdd.x !== lastPoint.x || pointToAdd.y !== lastPoint.y) {
                        lassoPoints.push(pointToAdd);
                    }
                    if (lassoPoints.length >= 3) {
                        const tool = getEffectiveTool();
                        const changed = completeLasso(tool === 'lassoFill');
                        if (changed) reinitialize();
                        else draw();
                    }
                    isLassoing = false;
                    lassoCursor = null;
                    return;
                }

                // Check if clicking near start point to close
                const startPoint = lassoPoints[0];
                const distToStart = Math.hypot(pointToAdd.x - startPoint.x, pointToAdd.y - startPoint.y);
                if (lassoPoints.length >= 3 && distToStart < 0.8) {
                    // Close the lasso
                    const tool = getEffectiveTool();
                    const changed = completeLasso(tool === 'lassoFill');
                    if (changed) reinitialize();
                    else draw();
                    isLassoing = false;
                    lassoCursor = null;
                } else {
                    // Add waypoint (avoid duplicates)
                    if (pointToAdd.x !== lastPoint.x || pointToAdd.y !== lastPoint.y) {
                        lassoPoints.push(pointToAdd);
                    }
                    draw();
                }
            }
        } else {
            // Regular draw/erase
            saveState();
            isDrawing = true;
            handleInput(e);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (isPanning) {
            const dx = mx - lastPanX;
            const dy = my - lastPanY;
            renderer.pan(dx, dy);
            lastPanX = mx;
            lastPanY = my;
            draw();
            return;
        }

        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        const worldPos = renderer.fromCanvas(mx, my, centerX, centerY, scale);

        if (isLassoing) {
            // Update cursor preview for lasso with direction snapping
            const lassoSnap = document.getElementById('lassoSnapBtn').classList.contains('active');
            if (lassoSnap && lassoPoints.length > 0) {
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                const dirSnapped = snapDirectionToGrid(lastPoint, worldPos);
                lassoCursor = snapToLattice(dirSnapped);
            } else {
                lassoCursor = lassoSnap ? snapToLattice(worldPos) : worldPos;
            }
            draw();
            return;
        }

        if (isDrawing) handleInput(e);
    });

    canvas.addEventListener('mouseup', (e) => {
        // Lasso doesn't complete on mouseup anymore (click-based)
        isDrawing = false;
        isPanning = false;
        canvas.classList.remove('panning');
    });

    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
        isPanning = false;
        canvas.classList.remove('panning');
    });

    // Touch: two-finger pinch to zoom, single finger to draw
    let touchStartDist = 0;
    let touchStartZoom = 1;

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            // Two-finger: start pinch zoom
            const t1 = e.touches[0], t2 = e.touches[1];
            touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            touchStartZoom = renderer.zoom;
            isPanning = true;
            lastPanX = (t1.clientX + t2.clientX) / 2;
            lastPanY = (t1.clientY + t2.clientY) / 2;
        } else {
            const rect = canvas.getBoundingClientRect();
            const mx = e.touches[0].clientX - rect.left;
            const my = e.touches[0].clientY - rect.top;

            // Hand tool = pan on single touch
            if (currentTool === 'hand') {
                isPanning = true;
                lastPanX = mx;
                lastPanY = my;
                return;
            }

            const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
            const worldPos = renderer.fromCanvas(mx, my, centerX, centerY, scale);

            if (isLassoTool()) {
                isLassoing = true;
                lassoPoints = [snapToLattice(worldPos)];
                draw();
            } else {
                saveState();
                isDrawing = true;
                handleInput(e);
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();

        if (e.touches.length === 2) {
            const t1 = e.touches[0], t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
            const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

            // Pinch zoom
            if (touchStartDist > 0) {
                const newZoom = touchStartZoom * (dist / touchStartDist);
                renderer.zoom = Math.max(renderer.minZoom, Math.min(renderer.maxZoom, newZoom));
            }

            // Pan with midpoint
            const rawMidX = (t1.clientX + t2.clientX) / 2;
            const rawMidY = (t1.clientY + t2.clientY) / 2;
            if (isPanning) {
                const dx = rawMidX - lastPanX;
                const dy = rawMidY - lastPanY;
                renderer.pan(dx, dy);
            }
            lastPanX = rawMidX;
            lastPanY = rawMidY;
            draw();
            return;
        }

        if (e.touches.length === 1) {
            const mx = e.touches[0].clientX - rect.left;
            const my = e.touches[0].clientY - rect.top;
            const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
            const worldPos = renderer.fromCanvas(mx, my, centerX, centerY, scale);

            if (isLassoing) {
                const snappedPos = snapToLattice(worldPos);
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                if (snappedPos.x !== lastPoint.x || snappedPos.y !== lastPoint.y) {
                    lassoPoints.push(snappedPos);
                    draw();
                }
                return;
            }
        }

        if (isDrawing) handleInput(e);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            if (isLassoing) {
                const tool = getEffectiveTool();
                const changed = completeLasso(tool === 'lassoFill');
                if (changed) reinitialize();
                else draw();
            }

            isDrawing = false;
            isPanning = false;
            isLassoing = false;
            touchStartDist = 0;
        } else if (e.touches.length === 1) {
            // Switched from two-finger to one
            isPanning = false;
            touchStartDist = 0;
        }
    });

    // ========================================================================
    // UI EVENT HANDLERS
    // ========================================================================
    function setTool(tool) {
        // Auto-switch to 2D when using drawing tools (but not for hand)
        if (is3DView && tool !== 'hand') {
            setViewMode(false);
        }
        // Clear any in-progress lasso when switching tools
        if (lassoPoints.length > 0 || isLassoing) {
            lassoPoints = [];
            isLassoing = false;
            lassoCursor = null;
            draw();
        }
        currentTool = tool;
        // Update active class and aria-pressed state for accessibility
        el.handBtn.classList.toggle('active', tool === 'hand');
        el.handBtn.setAttribute('aria-pressed', tool === 'hand');
        el.drawBtn.classList.toggle('active', tool === 'draw');
        el.drawBtn.setAttribute('aria-pressed', tool === 'draw');
        el.eraseBtn.classList.toggle('active', tool === 'erase');
        el.eraseBtn.setAttribute('aria-pressed', tool === 'erase');
        el.lassoFillBtn.classList.toggle('active', tool === 'lassoFill');
        el.lassoFillBtn.setAttribute('aria-pressed', tool === 'lassoFill');
        el.lassoEraseBtn.classList.toggle('active', tool === 'lassoErase');
        el.lassoEraseBtn.setAttribute('aria-pressed', tool === 'lassoErase');
    }

    el.handBtn.addEventListener('click', () => { cmdHeld = false; setTool('hand'); });
    el.drawBtn.addEventListener('click', () => { cmdHeld = false; setTool('draw'); });
    el.eraseBtn.addEventListener('click', () => { cmdHeld = false; setTool('erase'); });
    el.lassoFillBtn.addEventListener('click', () => { cmdHeld = false; setTool('lassoFill'); });
    el.lassoEraseBtn.addEventListener('click', () => { cmdHeld = false; setTool('lassoErase'); });

    document.getElementById('lassoSnapBtn').addEventListener('click', () => {
        const btn = document.getElementById('lassoSnapBtn');
        btn.classList.toggle('active');
        btn.setAttribute('aria-pressed', btn.classList.contains('active'));
    });

    el.resetBtn.addEventListener('click', () => {
        // Switch to 2D view first if in 3D mode
        if (is3DView) {
            setViewMode(false);
        }
        saveState();
        activeTriangles.clear();
        renderer.resetView();
        reinitialize();
    });

    // Clear button in Region section - same action as resetBtn
    const clearRegionBtn = document.getElementById('clearRegionBtn');
    if (clearRegionBtn) {
        clearRegionBtn.addEventListener('click', () => el.resetBtn.click());
    }

    el.undoBtn.addEventListener('click', () => {
        const state = undoStack.undo(Array.from(activeTriangles.values()));
        if (state) loadState(state);
    });

    el.redoBtn.addEventListener('click', () => {
        const state = undoStack.redo(Array.from(activeTriangles.values()));
        if (state) loadState(state);
    });

    const doubleMeshBtn = document.getElementById('doubleMeshBtn');
    doubleMeshBtn.addEventListener('click', () => {
        if (activeTriangles.size === 0) return;
        if (doubleMeshBtn.disabled) return;
        const dimerCount = sim.dimers ? sim.dimers.length : 0;
        // Capture hole relative heights before scaling
        let savedHoleHeights = [];
        if (isValid) {
            const holesInfo = sim.getAllHolesInfo();
            const wasmHoles = holesInfo.holes || [];
            savedHoleHeights = wasmHoles.map(h => h.currentWinding - h.baseHeight);
        }
        saveState();
        activeTriangles = doubleMesh(activeTriangles);
        reinitialize();
        // Restore hole heights scaled by 2x
        if (isValid && savedHoleHeights.length > 0) {
            const newHoleCount = sim.getHoleCount();
            const count = Math.min(savedHoleHeights.length, newHoleCount);
            for (let i = 0; i < count; i++) {
                const scaledHeight = savedHoleHeights[i] * 2;
                if (scaledHeight !== 0) {
                    sim.adjustHoleWinding(i, scaledHeight);
                }
            }
            if (count > 0) {
                sim.refreshDimers();
            }
        }
        renderer.fitToRegion(activeTriangles);
        draw();
        // Prevent multi-clicking for large regions
        if (dimerCount > 5000) {
            doubleMeshBtn.disabled = true;
            setTimeout(() => {
                doubleMeshBtn.disabled = false;
                updateScaleUpWarning();
            }, 1000);
        }
    });

    document.getElementById('halveMeshBtn').addEventListener('click', () => {
        if (activeTriangles.size === 0) return;
        saveState();
        activeTriangles = halveMesh(activeTriangles);
        reinitialize();

        // Auto-repair if region is invalid after scaling
        if (!isValid && activeTriangles.size > 0) {
            const result = sim.repair();
            activeTriangles.clear();
            for (const t of sim.blackTriangles) {
                activeTriangles.set(`${t.n},${t.j},1`, { n: t.n, j: t.j, type: 1 });
            }
            for (const t of sim.whiteTriangles) {
                activeTriangles.set(`${t.n},${t.j},2`, { n: t.n, j: t.j, type: 2 });
            }
            isValid = result.status === 'valid';
            updateUI();
        }

        renderer.fitToRegion(activeTriangles);
        draw();
    });

    el.repairBtn.addEventListener('click', () => {
        saveState();
        const result = sim.repair();

        // Update activeTriangles based on the C++ result
        activeTriangles.clear();

        // Rebuild from sim properties updated by refreshDimers inside repair
        for (const t of sim.blackTriangles) {
            activeTriangles.set(`${t.n},${t.j},1`, { n: t.n, j: t.j, type: 1 });
        }
        for (const t of sim.whiteTriangles) {
            activeTriangles.set(`${t.n},${t.j},2`, { n: t.n, j: t.j, type: 2 });
        }

        isValid = result.status === 'valid';
        updateUI();
        draw();
    });

    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        renderer.zoomAt(renderer.displayWidth / 2, renderer.displayHeight / 2, 1.3);
        if (renderer3D && is3DView) {
            renderer3D.zoom(1.3);
        }
        draw();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        renderer.zoomAt(renderer.displayWidth / 2, renderer.displayHeight / 2, 0.7);
        if (renderer3D && is3DView) {
            renderer3D.zoom(0.7);
        }
        draw();
    });

    document.getElementById('resetViewBtn').addEventListener('click', () => {
        // Complete redraw of 2D canvas
        renderer.setupCanvas();
        renderer.resetView();
        renderer.fitToRegion(activeTriangles);

        // Complete redraw of 3D if available
        if (renderer3D) {
            renderer3D.resetCamera();
            renderer3D.handleResize();
            // Rebuild 3D geometry from current state
            if (isValid && sim.dimers.length > 0) {
                renderer3D.renderDimers(sim.dimers, sim.boundaries);
            }
        }
        draw();
    });

    // Pan controls
    const panAmount = 50; // pixels
    document.getElementById('panLeftBtn').addEventListener('click', () => {
        renderer.pan(panAmount, 0);
        if (renderer3D && is3DView) {
            renderer3D.pan(-panAmount, 0);
        }
        draw();
    });
    document.getElementById('panRightBtn').addEventListener('click', () => {
        renderer.pan(-panAmount, 0);
        if (renderer3D && is3DView) {
            renderer3D.pan(panAmount, 0);
        }
        draw();
    });
    document.getElementById('panUpBtn').addEventListener('click', () => {
        renderer.pan(0, panAmount);
        if (renderer3D && is3DView) {
            renderer3D.pan(0, panAmount);
        }
        draw();
    });
    document.getElementById('panDownBtn').addEventListener('click', () => {
        renderer.pan(0, -panAmount);
        if (renderer3D && is3DView) {
            renderer3D.pan(0, -panAmount);
        }
        draw();
    });

    // Rotate controls (3D only)
    const rotateAngle = 15; // degrees
    document.getElementById('rotateLeftBtn').addEventListener('click', () => {
        if (renderer3D && is3DView) {
            renderer3D.rotateHorizontal(-rotateAngle);
        }
    });
    document.getElementById('rotateRightBtn').addEventListener('click', () => {
        if (renderer3D && is3DView) {
            renderer3D.rotateHorizontal(rotateAngle);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            el.undoBtn.click();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
            e.preventDefault();
            el.redoBtn.click();
        }
        // Escape to cancel any in-progress lasso
        if (e.key === 'Escape') {
            if (lassoPoints.length > 0 || isLassoing) {
                lassoPoints = [];
                isLassoing = false;
                lassoCursor = null;
                draw();
            }
        }
    });

    // Preset buttons
    el.hexagonBtn.addEventListener('click', () => {
        saveState();
        const a = parseInt(el.hexAInput.value) || 4;
        const b = parseInt(el.hexBInput.value) || 3;
        const c = parseInt(el.hexCInput.value) || 5;
        activeTriangles = generateHexagon(a, b, c);
        reinitialize();
    });

    // Initialize letter/number dropdown - populate with A-Z, 0-9, and special shapes
    function initLetterSelector() {
        const select = el.letterSelect;
        // Add A-Z
        for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(65 + i);
            const opt = document.createElement('option');
            opt.value = letter;
            opt.textContent = letter;
            select.appendChild(opt);
        }
        // Add 0-9
        for (let i = 0; i <= 9; i++) {
            const opt = document.createElement('option');
            opt.value = i.toString();
            opt.textContent = i.toString();
            select.appendChild(opt);
        }
        // Add special shapes (with optional theme)
        const specialShapes = [
            { value: '*', label: 'Snowflake' },
            { value: '***', label: 'Snowman' },
            { value: 'christmas-tree', label: 'Christmas Tree', theme: 'New Year' },
            { value: 'Rotunda', label: 'Rotunda', theme: 'UVA' }
        ];
        for (const shape of specialShapes) {
            const opt = document.createElement('option');
            opt.value = shape.value;
            opt.textContent = shape.label;
            if (shape.theme) opt.dataset.theme = shape.theme;
            select.appendChild(opt);
        }
    }
    initLetterSelector();

    el.letterSelect.addEventListener('change', async (e) => {
        const char = e.target.value;
        if (!char) return;
        const selectedOption = e.target.options[e.target.selectedIndex];
        const theme = selectedOption.dataset.theme;
        saveState();
        activeTriangles = await loadLetterTriangles(char);
        if (activeTriangles.size === 0) {
            console.warn('Letter not found:', char);
        }
        // Reset view and fit to region
        renderer.resetView();
        renderer.fitToRegion(activeTriangles);
        if (renderer3D) {
            renderer3D.resetCamera();
        }
        // Apply theme if specified
        if (theme) {
            const paletteIndex = renderer.colorPalettes.findIndex(p => p.name === theme);
            if (paletteIndex !== -1) {
                renderer.setPalette(paletteIndex);
                if (renderer3D) {
                    renderer3D.setPalette(paletteIndex);
                }
                el.paletteSelect.value = paletteIndex;
            }
        }
        reinitialize();
        e.target.value = ''; // Reset to placeholder
    });

    // Boundary lengths checkbox
    el.showBoundaryLengthsCheckbox.addEventListener('change', (e) => {
        renderer.showBoundaryLengths = e.target.checked;
        document.getElementById('labelControls').style.display = e.target.checked ? 'inline-flex' : 'none';
        draw();
    });

    // Label size and offset inputs
    el.labelSizeInput.addEventListener('input', (e) => {
        renderer.labelSize = parseFloat(e.target.value) || 1.0;
        draw();
    });
    el.labelOffsetInput.addEventListener('input', (e) => {
        renderer.labelOffset = parseFloat(e.target.value) || 1.5;
        draw();
    });

    // Hole lengths toggle
    document.getElementById('showHoleLengthsCheckbox').addEventListener('change', (e) => {
        renderer.showHoleLengths = e.target.checked;
        draw();
    });

    // Shape of the Month button
    el.shapeOfMonthBtn.addEventListener('click', async () => {
        saveState();
        activeTriangles = await loadLetterTriangles('SHAPE');
        if (activeTriangles.size === 0) {
            console.warn('Shape of the month not found');
        }
        renderer.resetView();
        renderer.fitToRegion(activeTriangles);
        if (renderer3D) {
            renderer3D.resetCamera();
        }
        // Load and apply theme from THEME.txt
        try {
            const themeResponse = await fetch(`/letters/THEME.txt?v=${Date.now()}`);
            if (themeResponse.ok) {
                const themeName = (await themeResponse.text()).trim();
                const paletteIndex = renderer.colorPalettes.findIndex(p => p.name === themeName);
                if (paletteIndex !== -1) {
                    renderer.setPalette(paletteIndex);
                    if (renderer3D) {
                        renderer3D.setPalette(paletteIndex);
                    }
                    el.paletteSelect.value = paletteIndex;
                }
            }
        } catch (e) {
            console.warn('Could not load theme:', e);
        }
        reinitialize();

        // Load and apply hole height from HOLE_HEIGHT.txt
        try {
            const holeHeightResponse = await fetch(`/letters/HOLE_HEIGHT.txt?v=${Date.now()}`);
            if (holeHeightResponse.ok) {
                const holeHeight = parseInt((await holeHeightResponse.text()).trim());
                if (!isNaN(holeHeight) && holeHeight !== 0 && isValid) {
                    const holeCount = sim.getHoleCount();
                    for (let h = 0; h < holeCount; h++) {
                        sim.adjustHoleWinding(h, holeHeight);
                    }
                    sim.refreshDimers();
                    draw();
                    updateHolesUI();
                }
            }
        } catch (e) {
            console.warn('Could not load hole height:', e);
        }
    });

    // View toggle
    el.lozengeViewBtn.addEventListener('click', () => {
        renderer.showDimerView = false;
        el.lozengeViewBtn.classList.add('active');
        el.dimerViewBtn.classList.remove('active');
        draw();
    });

    el.dimerViewBtn.addEventListener('click', () => {
        renderer.showDimerView = true;
        el.dimerViewBtn.classList.add('active');
        el.lozengeViewBtn.classList.remove('active');
        draw();
    });

    // Path view toggle (cycles through 4 states: off, 3 path families)
    el.pathViewBtn.addEventListener('click', () => {
        renderer.pathMode = (renderer.pathMode + 1) % 4;
        // Always show ∥ icon, toggle active state based on mode
        el.pathViewBtn.classList.toggle('active', renderer.pathMode !== 0);
        draw();
    });

    // 3D View toggle
    el.toggle3DBtn.addEventListener('click', () => {
        setViewMode(!is3DView);
    });

    el.perspectiveBtn.addEventListener('click', () => {
        if (renderer3D) {
            const isPerspective = renderer3D.togglePerspective();
            el.perspectiveBtn.textContent = isPerspective ? '🎯' : '📐';
            el.perspectiveBtn.title = isPerspective ? 'Perspective view (click for isometric)' : 'Isometric view (click for perspective)';
            renderer3D.resetCamera();
        }
    });

    el.preset3DBtn.addEventListener('click', () => {
        if (renderer3D) {
            const preset = renderer3D.cyclePreset();
            el.preset3DBtn.textContent = preset.icon;
            el.preset3DBtn.title = `Style: ${preset.name}`;
            // Re-render with new preset
            if (isValid && sim.dimers.length > 0) {
                renderer3D.renderDimers(sim.dimers, sim.boundaries);
            }
        }
    });

    el.renderModeSelect.addEventListener('change', () => {
        if (renderer3D) {
            renderer3D.renderMode = el.renderModeSelect.value;
            renderer3D._legoMergedEdges = null;
            if (isValid && sim.dimers.length > 0) {
                renderer3D.renderDimers(sim.dimers, sim.boundaries);
            }
        }
    });

    // Fullscreen button
    function setFullscreen(enter) {
        const container = document.getElementById('canvas-container');
        const canvas = document.getElementById('lozenge-canvas');
        const three = document.getElementById('three-container');
        const hide = [
            document.getElementById('controlsPanel'),
            document.querySelector('.stats-bar'),
            document.querySelector('.bottom-sections-wrapper')
        ];

        if (enter) {
            if (!is3DView) {
                setTool('hand');
            }
            container.classList.add('fullscreen-mode');
            container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:white;';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.maxWidth = 'none';
            three.style.width = '100vw';
            three.style.height = '100vh';
            three.style.maxWidth = 'none';
            document.body.style.overflow = 'hidden';
            hide.forEach(el => { if (el) el.style.display = 'none'; });
        } else {
            container.classList.remove('fullscreen-mode');
            container.style.cssText = 'position:relative;';
            canvas.style.width = '';
            canvas.style.height = '';
            canvas.style.maxWidth = '';
            three.style.width = '';
            three.style.height = '';
            three.style.maxWidth = '';
            document.body.style.overflow = '';
            hide.forEach(el => { if (el) el.style.display = ''; });
        }

        function resizeAndDraw() {
            renderer.setupCanvas();
            if (renderer3D) renderer3D.handleResize();
            draw();
        }
        if (enter) {
            requestAnimationFrame(resizeAndDraw);
        } else {
            requestAnimationFrame(() => requestAnimationFrame(resizeAndDraw));
        }
    }

    document.getElementById('fullscreenBtn').addEventListener('click', () => {
        const container = document.getElementById('canvas-container');
        setFullscreen(!container.classList.contains('fullscreen-mode'));
    });

    // Help button - show keyboard shortcuts modal
    document.getElementById('helpBtn').addEventListener('click', () => {
        const modal = document.getElementById('keyboardHelpModal');
        if (modal) {
            modal.classList.add('visible');
        }
    });

    // Keyboard help modal close button
    const closeKeyboardHelp = document.getElementById('closeKeyboardHelp');
    if (closeKeyboardHelp) {
        closeKeyboardHelp.addEventListener('click', () => {
            const modal = document.getElementById('keyboardHelpModal');
            if (modal) {
                modal.classList.remove('visible');
            }
        });
    }

    // Close modal on backdrop click
    const keyboardModal = document.getElementById('keyboardHelpModal');
    if (keyboardModal) {
        keyboardModal.addEventListener('click', (e) => {
            if (e.target === keyboardModal) {
                keyboardModal.classList.remove('visible');
            }
        });
    }

    // Custom colors functionality
    const customColorsBtn = document.getElementById('customColorsBtn');
    const customColorPickers = document.getElementById('customColorPickers');
    const customColor1 = document.getElementById('customColor1');
    const customColor2 = document.getElementById('customColor2');
    const customColor3 = document.getElementById('customColor3');

    function updateColorPickersFromPalette() {
        const palette = renderer.getCurrentPalette();
        customColor1.value = palette.colors[0];
        customColor2.value = palette.colors[1];
        customColor3.value = palette.colors[2];
        renderer.customColors = [palette.colors[0], palette.colors[1], palette.colors[2]];
        if (renderer3D) {
            renderer3D.customColors = [palette.colors[0], palette.colors[1], palette.colors[2]];
        }
    }

    function handleColorChange() {
        renderer.customColors = [customColor1.value, customColor2.value, customColor3.value];
        if (renderer3D) {
            renderer3D.customColors = [customColor1.value, customColor2.value, customColor3.value];
        }
        draw();
    }

    customColorsBtn.addEventListener('click', () => {
        const isVisible = customColorPickers.style.display === 'flex';
        if (isVisible) {
            customColorPickers.style.display = 'none';
            renderer.useCustomColors = false;
            if (renderer3D) {
                renderer3D.useCustomColors = false;
            }
        } else {
            updateColorPickersFromPalette();
            customColorPickers.style.display = 'flex';
            renderer.useCustomColors = true;
            if (renderer3D) {
                renderer3D.useCustomColors = true;
            }
        }
        draw();
    });

    customColor1.addEventListener('input', handleColorChange);
    customColor2.addEventListener('input', handleColorChange);
    customColor3.addEventListener('input', handleColorChange);

    // Firefox workaround: ensure color pickers open reliably
    [customColor1, customColor2, customColor3].forEach(input => {
        input.addEventListener('click', (e) => {
            e.target.focus();
            if (e.target.showPicker) {
                try { e.target.showPicker(); } catch (err) {}
            }
        });
    });

    // Hole color picker
    const holeColorPicker = document.getElementById('holeColorPicker');
    holeColorPicker.addEventListener('input', (e) => {
        renderer.holeColor = e.target.value;
        if (renderer3D) {
            renderer3D.holeColor = e.target.value;
        }
        draw();
    });
    holeColorPicker.addEventListener('click', (e) => {
        e.target.focus();
        if (e.target.showPicker) {
            try { e.target.showPicker(); } catch (err) {}
        }
    });

    // Palette
    el.paletteSelect.addEventListener('change', (e) => {
        renderer.setPalette(parseInt(e.target.value));
        if (renderer3D) {
            renderer3D.setPalette(parseInt(e.target.value));
        }
        if (renderer.useCustomColors) {
            updateColorPickersFromPalette();
        }
        draw();
    });

    document.getElementById('prev-palette').addEventListener('click', () => {
        renderer.prevPalette();
        if (renderer3D) {
            renderer3D.setPalette(renderer.currentPaletteIndex);
        }
        el.paletteSelect.value = renderer.currentPaletteIndex;
        if (renderer.useCustomColors) {
            updateColorPickersFromPalette();
        }
        draw();
    });

    document.getElementById('next-palette').addEventListener('click', () => {
        renderer.nextPalette();
        if (renderer3D) {
            renderer3D.setPalette(renderer.currentPaletteIndex);
        }
        el.paletteSelect.value = renderer.currentPaletteIndex;
        if (renderer.useCustomColors) {
            updateColorPickersFromPalette();
        }
        draw();
    });

    document.getElementById('permuteColors').addEventListener('click', () => {
        renderer.permuteColors();
        if (renderer3D) {
            renderer3D.permuteColors();
        }
        draw();
    });

    el.outlineWidthPct.addEventListener('input', (e) => {
        renderer.outlineWidthPct = parseFloat(e.target.value) || 0;
        draw();
    });

    document.getElementById('borderWidthPct').addEventListener('input', (e) => {
        renderer.borderWidthPct = parseFloat(e.target.value) || 0;
        draw();
    });

    document.getElementById('pathWidthPx').addEventListener('input', (e) => {
        renderer.pathWidthPx = parseFloat(e.target.value) || 0;
        draw();
    });

    document.getElementById('showGridCheckbox').addEventListener('change', (e) => {
        renderer.showGrid = e.target.checked;
        draw();
    });

    document.getElementById('showHoleLabelsCheckbox').addEventListener('change', (e) => {
        showHoleLabels = e.target.checked;
        updateHolesUI();
    });

    // 2D rotate button in canvas overlay (also auto-rotate toggle in 3D)
    document.getElementById('rotate2DBtn').addEventListener('click', () => {
        const btn = document.getElementById('rotate2DBtn');
        if (is3DView && renderer3D) {
            // In 3D: toggle auto-rotate
            renderer3D.autoRotate = !renderer3D.autoRotate;
            btn.classList.toggle('active', renderer3D.autoRotate);
        } else {
            // In 2D: toggle 90-deg rotation
            renderer.rotated = !renderer.rotated;
            btn.classList.toggle('active', renderer.rotated);
            draw();
        }
    });

    // Simulation controls - logarithmic slider with synchronized input
    // Slider 0-100 maps to speed 1 - 100,000,000 (logarithmic)
    function sliderToSpeed(sliderVal) {
        // 0 -> 1, 100 -> 100M (10^8)
        return Math.round(Math.pow(10, sliderVal * 0.08));
    }

    function speedToSlider(speed) {
        // Inverse: log10(speed) / 0.08
        if (speed <= 1) return 0;
        return Math.round(Math.log10(speed) / 0.08);
    }

    function updateSpeedFromSlider(sliderVal) {
        stepsPerSecond = sliderToSpeed(sliderVal);
        el.speedSlider.value = sliderVal;
        el.speedInput.value = stepsPerSecond;
    }

    function updateSpeedFromInput(speed) {
        stepsPerSecond = Math.max(1, Math.min(100000000, parseInt(speed) || 100));
        el.speedInput.value = stepsPerSecond;
        el.speedSlider.value = speedToSlider(stepsPerSecond);
    }

    el.speedSlider.addEventListener('input', (e) => updateSpeedFromSlider(parseInt(e.target.value)));
    el.speedInput.addEventListener('input', (e) => updateSpeedFromInput(e.target.value));

    el.qInput.addEventListener('change', (e) => {
        const q = parseFloat(e.target.value) || 1;
        e.target.value = Math.max(0, Math.min(10, q));
        sim.setQBias(parseFloat(e.target.value));
    });

    // Periodic weights controls
    const usePeriodicCheckbox = document.getElementById('usePeriodicWeightsCheckbox');
    const periodicKSelect = document.getElementById('periodicKSelect');
    const periodicWeightsMatrix = document.getElementById('periodicWeightsMatrix');

    // Default values for each k (k x k matrices stored as 2D arrays)
    const defaultPeriodicQ = {
        1: [[1]],
        2: [[1, 100], [0.003333, 3]],
        // Nienhuis Pattern: (n-j)%3. q0=1 (diag), q1=0.5, q2=2
        3: [
            [1.0, 2.0, 0.5],
            [0.5, 1.0, 2.0],
            [2.0, 0.5, 1.0]
        ],
        4: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]],
        5: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]]
    };

    let currentPeriodicK = 2; // Default to 2
    let currentPeriodicQ = defaultPeriodicQ[2].map(row => [...row]); // Load 2x2 matrix
    let isNienhuis3x3Mode = false;
    let isDuits2x2Mode = false;

    function computeCharlier2x2Matrix(alpha) {
        return [
            [alpha, 1],
            [1, 1/alpha]
        ];
    }

    function computeNienhuis3x3Matrix(alpha) {
        const invAlpha = 1 / alpha;
        return [
            [1, alpha, invAlpha],
            [invAlpha, 1, alpha],
            [alpha, invAlpha, 1]
        ];
    }

    function buildPeriodicMatrix(k) {
        periodicWeightsMatrix.innerHTML = '';
        periodicWeightsMatrix.style.gridTemplateColumns = `repeat(${k}, auto)`;

        for (let i = 0; i < k; i++) {
            for (let j = 0; j < k; j++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'param-input';
                input.style.width = '100px';
                input.min = '0';
                input.max = '1000000';
                input.step = '0.01';
                input.value = currentPeriodicQ[i]?.[j] ?? 1;
                input.dataset.row = i;
                input.dataset.col = j;
                input.title = `q${i}${j}`;
                input.addEventListener('change', updatePeriodicWeights);
                periodicWeightsMatrix.appendChild(input);
            }
        }
    }

    function updatePeriodicWeights() {
        const k = currentPeriodicK;
        const inputs = periodicWeightsMatrix.querySelectorAll('input');
        const values = [];
        currentPeriodicQ = [];
        let product = 1;

        for (let i = 0; i < k; i++) {
            currentPeriodicQ[i] = [];
        }

        inputs.forEach(input => {
            const i = parseInt(input.dataset.row);
            const j = parseInt(input.dataset.col);
            const val = Math.max(0, Math.min(1000000, parseFloat(input.value) || 1));
            input.value = val;
            currentPeriodicQ[i][j] = val;
            values.push(val);
            product *= val;
        });

        document.getElementById('periodicQProduct').textContent = product.toFixed(4).replace(/\.?0+$/, '');

        sim.setPeriodicQBias(values, k);
        renderer.periodicK = k;
        renderer.periodicQ = currentPeriodicQ;

        // Update GPU weights
        const usePeriodic = usePeriodicCheckbox.checked;
        if (gpuEngine && gpuEngine.isInitialized()) {
            gpuEngine.setWeights(currentPeriodicQ, k, usePeriodic);
        }
        draw();
    }

    periodicKSelect.addEventListener('change', (e) => {
        const newK = parseInt(e.target.value);
        // Exit preset modes and restore editable matrix
        isNienhuis3x3Mode = false;
        isDuits2x2Mode = false;
        document.getElementById('nienhuis3x3AlphaContainer').style.display = 'none';
        document.getElementById('duits2x2Container').style.display = 'none';
        // Unhighlight presets
        document.getElementById('preset2x2Btn').style.background = '#f5f5f5';
        document.getElementById('preset2x2Btn').style.color = '';
        document.getElementById('presetNienhuis3x3Btn').style.background = '#f5f5f5';
        document.getElementById('presetNienhuis3x3Btn').style.color = '';
        // Preserve values where possible
        const oldQ = currentPeriodicQ;
        currentPeriodicK = newK;
        currentPeriodicQ = [];
        for (let i = 0; i < newK; i++) {
            currentPeriodicQ[i] = [];
            for (let j = 0; j < newK; j++) {
                currentPeriodicQ[i][j] = oldQ[i]?.[j] ?? 1;
            }
        }
        buildPeriodicMatrix(newK);
        setMatrixInputsDisabled(false);
        updatePeriodicWeights();
    });

    usePeriodicCheckbox.addEventListener('change', (e) => {
        sim.setUsePeriodicWeights(e.target.checked);
        renderer.usePeriodicWeights = e.target.checked;
        // Always update GPU weights (either enable or disable periodic)
        if (gpuEngine && gpuEngine.isInitialized()) {
            gpuEngine.setWeights(currentPeriodicQ, currentPeriodicK, e.target.checked);
        }
        if (e.target.checked) {
            updatePeriodicWeights();
        }
        draw();
    });

    // Random sweeps checkbox (for Glauber/CFTP)
    const randomSweepsCheckbox = document.getElementById('useRandomSweepsCheckbox');
    randomSweepsCheckbox.addEventListener('change', (e) => {
        useRandomSweeps = e.target.checked;
        sweepAccumulator = 0;  // Reset accumulator when switching modes
        sim.setUseRandomSweeps(e.target.checked);
    });

    // Preset buttons
    document.getElementById('preset2x2Btn').addEventListener('click', (e) => {
        e.preventDefault();
        isNienhuis3x3Mode = false;
        isDuits2x2Mode = true;
        document.getElementById('nienhuis3x3AlphaContainer').style.display = 'none';
        document.getElementById('duits2x2Container').style.display = 'flex';
        // Highlight active preset
        document.getElementById('preset2x2Btn').style.background = '#1976d2';
        document.getElementById('preset2x2Btn').style.color = 'white';
        document.getElementById('presetNienhuis3x3Btn').style.background = '#f5f5f5';
        document.getElementById('presetNienhuis3x3Btn').style.color = '';
        currentPeriodicK = 2;
        const alpha = parseFloat(document.getElementById('duitsAlpha').value) || 2;
        currentPeriodicQ = computeCharlier2x2Matrix(alpha);
        periodicKSelect.value = '2';
        buildPeriodicMatrix(2);
        setMatrixInputsDisabled(true);
        // Enable periodic weights
        usePeriodicCheckbox.checked = true;
        sim.setUsePeriodicWeights(true);
        renderer.usePeriodicWeights = true;
        updatePeriodicWeights();
    });

    function updateCharlier2x2Matrix() {
        if (!isDuits2x2Mode) return;
        const alpha = parseFloat(document.getElementById('duitsAlpha').value) || 2;
        currentPeriodicQ = computeCharlier2x2Matrix(alpha);
        const inputs = periodicWeightsMatrix.querySelectorAll('input');
        inputs.forEach(input => {
            const i = parseInt(input.dataset.row);
            const j = parseInt(input.dataset.col);
            input.value = currentPeriodicQ[i][j];
        });
        updatePeriodicWeights();
    }

    document.getElementById('duitsAlpha').addEventListener('input', updateCharlier2x2Matrix);

    document.getElementById('presetNienhuis3x3Btn').addEventListener('click', (e) => {
        e.preventDefault();
        isNienhuis3x3Mode = true;
        isDuits2x2Mode = false;
        document.getElementById('duits2x2Container').style.display = 'none';
        document.getElementById('nienhuis3x3AlphaContainer').style.display = 'flex';
        // Highlight active preset
        document.getElementById('presetNienhuis3x3Btn').style.background = '#1976d2';
        document.getElementById('presetNienhuis3x3Btn').style.color = 'white';
        document.getElementById('preset2x2Btn').style.background = '#f5f5f5';
        document.getElementById('preset2x2Btn').style.color = '';
        currentPeriodicK = 3;
        const alpha = parseFloat(document.getElementById('nienhuis3x3Alpha').value) || 2;
        currentPeriodicQ = computeNienhuis3x3Matrix(alpha);
        periodicKSelect.value = '3';
        buildPeriodicMatrix(3);
        setMatrixInputsDisabled(true);
        // Enable periodic weights
        usePeriodicCheckbox.checked = true;
        sim.setUsePeriodicWeights(true);
        renderer.usePeriodicWeights = true;
        updatePeriodicWeights();
    });

    document.getElementById('nienhuis3x3Alpha').addEventListener('input', (e) => {
        if (!isNienhuis3x3Mode) return;
        const alpha = parseFloat(e.target.value) || 2;
        currentPeriodicQ = computeNienhuis3x3Matrix(alpha);
        // Update the displayed values in the greyed-out inputs
        const inputs = periodicWeightsMatrix.querySelectorAll('input');
        inputs.forEach(input => {
            const i = parseInt(input.dataset.row);
            const j = parseInt(input.dataset.col);
            input.value = currentPeriodicQ[i][j];
        });
        updatePeriodicWeights();
    });

    function setMatrixInputsDisabled(disabled) {
        const inputs = periodicWeightsMatrix.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = disabled;
            input.style.backgroundColor = disabled ? '#e9e9e9' : '';
            input.style.color = disabled ? '#666' : '';
        });
    }

    // Initialize matrix and compute initial product
    buildPeriodicMatrix(currentPeriodicK);
    document.getElementById('periodicQProduct').textContent = currentPeriodicQ.flat().reduce((a, b) => a * b, 1).toFixed(4).replace(/\.?0+$/, '');

    async function loop() {
        if (!running) return;
        const now = performance.now();
        frameCount++;
        if (now - lastFrameTime >= 1000) {
            currentFps = frameCount * 1000 / (now - lastFrameTime);
            frameCount = 0;
            lastFrameTime = now;
        }

        // Normalize step counting: slider represents toggle attempts per second in both modes
        // In random sweeps: 1 WASM step = 1 toggle attempt
        // In systematic sweeps: 1 WASM step = N toggle attempts (full sweep)
        // So for systematic, we divide by N to get equivalent behavior
        const qBias = parseFloat(el.qInput.value) || 1.0;

        // GPU is reserved for CFTP/fluctuations only - Glauber uses WASM
        if (useRandomSweeps) {
            // Random sweeps: direct mapping
            const stepsPerFrame = stepsPerSecond <= 60 ? 1 : Math.ceil(stepsPerSecond / 60);
            sim.step(stepsPerFrame);
        } else {
            // Systematic sweeps: normalize by number of vertices (use dimers as proxy)
            const N = Math.max(1, sim.dimers.length);  // Number of toggle attempts per sweep
            const sweepsPerSecond = stepsPerSecond / N;
            // Accumulate fractional sweeps
            sweepAccumulator += sweepsPerSecond / 60;  // sweeps this frame (assuming 60fps target)
            const sweepsThisFrame = Math.floor(sweepAccumulator);
            sweepAccumulator -= sweepsThisFrame;
            if (sweepsThisFrame > 0) {
                sim.step(sweepsThisFrame);
            }
        }
        draw();
        el.stepCount.textContent = formatNumber(sim.getTotalSteps());

        if (running) {
            if (useRandomSweeps && stepsPerSecond <= 60) {
                animationId = setTimeout(() => requestAnimationFrame(loop), 1000 / stepsPerSecond);
            } else {
                animationId = requestAnimationFrame(loop);
            }
        }
    }

    el.startStopBtn.addEventListener('click', () => {
        if (!isValid) return;
        running = !running;
        el.startStopBtn.textContent = running ? 'Stop' : 'Start';
        el.startStopBtn.classList.toggle('running', running);
        if (running) {
            inFluctuationMode = false; // Exit fluctuation mode when starting Glauber
            inDoubleDimerMode = false; // Exit double dimer mode when starting Glauber
            if (renderer3D) {
                renderer3D.glauberRunning = true;
                if (renderer3D.renderMode === 'minecraft') {
                    renderer3D.renderMode = 'standard';
                    renderer3D._legoMergedEdges = null;
                }
            }
            lastFrameTime = performance.now();
            frameCount = 0;
            loop();
        } else {
            if (animationId) {
                cancelAnimationFrame(animationId);
                clearTimeout(animationId);
                animationId = null;
            }
            if (renderer3D) {
                renderer3D.glauberRunning = false;
                renderer3D._legoMergedEdges = null;
            }
            draw(); // Redraw with merges
        }
    });

    el.cftpBtn.addEventListener('click', () => {
        if (!isValid) return;
        inFluctuationMode = false; // Exit fluctuation mode when starting CFTP
        inDoubleDimerMode = false; // Exit double dimer mode when starting CFTP
        if (running) {
            running = false;
            el.startStopBtn.textContent = 'Start';
            el.startStopBtn.classList.remove('running');
            if (animationId) {
                cancelAnimationFrame(animationId);
                clearTimeout(animationId);
                animationId = null;
            }
        }

        const originalText = el.cftpBtn.textContent;
        el.cftpBtn.disabled = true;
        el.cftpBtn.textContent = 'Init...';
        el.cftpSteps.textContent = 'init';
        cftpCancelled = false;
        el.cftpStopBtn.style.display = 'inline-block';
        const cftpStartTime = performance.now();

        // Check if WebGPU is available for accelerated CFTP
        const useGpuCFTP = gpuEngine && gpuEngine.isInitialized && gpuEngine.isInitialized();

        setTimeout(async () => {
            // Initialize CFTP in WASM (creates extremal states)
            console.log('[CFTP] Starting' + (useGpuCFTP ? ' (GPU)' : ' (WASM)'));
            sim.initCFTP();

            if (useGpuCFTP) {
                // ========== WebGPU CFTP Path ==========
                // Get extremal states from WASM as raw grid data
                const minGridData = sim.getCFTPMinRawGridData();
                const maxGridData = sim.getCFTPMaxRawGridData();

                if (!minGridData || !maxGridData) {
                    el.cftpSteps.textContent = 'error';
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                    return;
                }

                // Initialize GPU CFTP with extremal states
                let gpuCftpOk = false;
                try {
                    // FLUSH: Destroy old CFTP buffers before init to prevent size mismatch errors
                    try {
                        if (gpuEngine.destroyCFTP) gpuEngine.destroyCFTP();
                        draw(); // Redraw to refresh rendering state after buffer flush
                    } catch(e) {}

                    gpuCftpOk = await gpuEngine.initCFTP(minGridData, maxGridData);
                } catch (initErr) {
                    console.error('[CFTP] initCFTP error:', initErr);
                }
                if (!gpuCftpOk) {
                    // Fall through to WASM path below
                } else {
                    // Set CFTP weights (periodic or global q_bias)
                    const qBias = parseFloat(el.qInput.value) || 1.0;
                    const usePeriodic = usePeriodicCheckbox.checked;
                    gpuEngine.setCFTPWeights(currentPeriodicQ, currentPeriodicK, usePeriodic, qBias);
                    // GPU CFTP loop with pure epoch doubling (no early stopping)
                    let T = 1;
                    const maxT = 1073741824; // Safety limit (2^30)
                    const drawInterval = 16384;  // Draw min/max bounds every N steps

                    async function gpuCftpStep() {
                        if (cftpCancelled) {
                            isGpuBusy = false;
                            gpuEngine.destroyCFTP();
                            const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                            el.cftpSteps.textContent = 'stopped (' + elapsed + 's)';
                            el.cftpBtn.textContent = originalText;
                            el.cftpBtn.disabled = false;
                            el.cftpStopBtn.style.display = 'none';
                            return;
                        }

                        // Reset chains to extremal states at start of each epoch
                        try {
                            gpuEngine.resetCFTPChains(minGridData, maxGridData);
                        } catch (resetErr) {
                            console.error('[CFTP] resetCFTPChains error:', resetErr);
                            isGpuBusy = false;
                            try { gpuEngine.destroyCFTP(); } catch (e) {}
                            el.cftpSteps.textContent = 'GPU error - tap Sample to retry';
                            el.cftpBtn.textContent = originalText;
                            el.cftpBtn.disabled = false;
                            el.cftpStopBtn.style.display = 'none';
                            return;
                        }
                        el.cftpSteps.textContent = 'T=' + T;
                        el.cftpBtn.textContent = 'T=' + T;

                        // Run full epoch as single batch (pure doubling, no early stopping)
                        let result;
                        const epochStart = performance.now();
                        try {
                            result = await gpuEngine.stepCFTP(T, 0);
                        } catch (stepErr) {
                            console.error('[CFTP] stepCFTP error:', stepErr);
                            isGpuBusy = false;
                            try { gpuEngine.destroyCFTP(); } catch (e) {}
                            el.cftpSteps.textContent = 'GPU error - tap Sample to retry';
                            el.cftpBtn.textContent = originalText;
                            el.cftpBtn.disabled = false;
                            el.cftpStopBtn.style.display = 'none';
                            return;
                        }
                        const totalStepsRun = result.stepsRun;
                        let coalesced = result.coalesced;
                        const epochMs = performance.now() - epochStart;
                        console.log(`[CFTP] epoch T=${T}: ${totalStepsRun} steps in ${epochMs.toFixed(1)}ms${coalesced ? ' (coalesced)' : ''}`);

                        // Update progress display
                        el.cftpSteps.textContent = 'T=' + T + ' @' + totalStepsRun + (coalesced ? ' ✓' : '');
                        el.cftpBtn.textContent = T + ':' + totalStepsRun;

                        if (cftpCancelled) {
                            isGpuBusy = false;
                            gpuEngine.destroyCFTP();
                            const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                            el.cftpSteps.textContent = 'stopped (' + elapsed + 's)';
                            el.cftpBtn.textContent = originalText;
                            el.cftpBtn.disabled = false;
                            el.cftpStopBtn.style.display = 'none';
                            return;
                        }

                        // Final coalescence check if not detected during run
                        if (!coalesced) {
                            try {
                                coalesced = await gpuEngine.checkCoalescence();
                            } catch (coalErr) {
                                console.error('[CFTP] checkCoalescence error:', coalErr);
                            }
                        }

                        if (coalesced) {
                            // Success! Copy result to main grid and WASM
                            try {
                                await gpuEngine.finalizeCFTP();
                                // Get dimers from GPU result and update sim
                                sim.dimers = await gpuEngine.getDimers(sim.blackTriangles);
                                // Sync to WASM so Glauber can continue from this state
                                sim.setDimers(sim.dimers);
                                draw();
                            } catch (finalErr) {
                                console.error('[CFTP] finalizeCFTP error:', finalErr);
                            }

                            isGpuBusy = false;
                            gpuEngine.destroyCFTP();
                            const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                            console.log(`[CFTP] GPU sampling complete: T=${T}, ${elapsed}s total`);
                            el.cftpSteps.textContent = T + ' (' + elapsed + 's, GPU)';
                            el.cftpBtn.textContent = originalText;
                            el.cftpBtn.disabled = false;
                            el.cftpStopBtn.style.display = 'none';
                        } else if (T >= maxT) {
                            // Timeout
                            isGpuBusy = false;
                            gpuEngine.destroyCFTP();
                            const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                            el.cftpSteps.textContent = 'timeout (' + elapsed + 's)';
                            el.cftpBtn.textContent = originalText;
                            el.cftpBtn.disabled = false;
                            el.cftpStopBtn.style.display = 'none';
                        } else {
                            // Draw bounds at end of each epoch >= drawInterval
                            if (T >= drawInterval) {
                                try {
                                    const bounds = await gpuEngine.getCFTPBounds(sim.blackTriangles);
                                    if (bounds.maxDimers.length > 0) {
                                        if (is3DView && renderer3D) {
                                            renderer3D.cftpBoundsTo3D(bounds.minDimers, bounds.maxDimers);
                                        } else if (renderer.showDimerView) {
                                            renderer.draw(sim, activeTriangles, isValid);
                                            const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
                                            renderer.drawDoubleDimerView(renderer.ctx, sim, bounds.minDimers, bounds.maxDimers, centerX, centerY, scale);
                                        } else {
                                            const savedDimers = sim.dimers;
                                            sim.dimers = bounds.maxDimers;
                                            draw();
                                            sim.dimers = savedDimers;
                                        }
                                    }
                                } catch (boundsErr) {
                                    console.error('[CFTP] getCFTPBounds error:', boundsErr);
                                }
                            }
                            // Double T and try again
                            T *= 2;
                            setTimeout(gpuCftpStep, 0);
                        }
                    }

                    // LOCK: Prevent reinitialize() from destroying GPU buffers during CFTP
                    isGpuBusy = true;
                    gpuCftpStep();
                    return; // Don't fall through to WASM path
                }
            }

            // ========== WASM CFTP Path (fallback) ==========
            let lastDrawnBlock = -1; // Track which 16K-block we last drew

            function cftpStep() {
                // Check for cancellation
                if (cftpCancelled) {
                    const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                    el.cftpSteps.textContent = 'stopped (' + elapsed + 's)';
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                    return;
                }

                const res = sim.stepCFTP();
                if (res.status === 'in_progress') {
                    el.cftpSteps.textContent = 'T=' + res.T + ' @' + res.step;
                    el.cftpBtn.textContent = res.T + ':' + res.step;
                    // Draw every 16384 steps when T > 16384
                    if (res.T > 16384) {
                        const currentBlock = Math.floor(res.step / 16384);
                        if (currentBlock > lastDrawnBlock) {
                            lastDrawnBlock = currentBlock;
                            const maxData = sim.getCFTPMaxDimers();
                            const minData = sim.getCFTPMinDimers();
                            if (is3DView && renderer3D) {
                                renderer3D.cftpBoundsTo3D(minData.dimers, maxData.dimers);
                            } else if (maxData.dimers && maxData.dimers.length > 0) {
                                if (renderer.showDimerView) {
                                    // Draw double dimer view in 2D dimer mode
                                    renderer.draw(sim, activeTriangles, isValid);
                                    const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
                                    renderer.drawDoubleDimerView(renderer.ctx, sim, minData.dimers, maxData.dimers, centerX, centerY, scale);
                                } else {
                                    // Lozenge view - just show max
                                    const savedDimers = sim.dimers;
                                    sim.dimers = maxData.dimers;
                                    draw();
                                    sim.dimers = savedDimers;
                                }
                            }
                        }
                    }
                    setTimeout(cftpStep, 0);
                } else if (res.status === 'coalesced') {
                    sim.finalizeCFTP();
                    draw();
                    const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                    console.log(`[CFTP] WASM sampling complete: T=${res.T}, ${elapsed}s total`);
                    el.cftpSteps.textContent = res.T + ' (' + elapsed + 's)';
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                } else if (res.status === 'timeout') {
                    const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                    console.log(`[CFTP] WASM timeout: ${elapsed}s`);
                    el.cftpSteps.textContent = 'timeout (' + elapsed + 's)';
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                } else if (res.status === 'not_coalesced') {
                    console.log(`[CFTP] WASM epoch T=${res.prevT} not coalesced, doubling to T=${res.T}`);
                    el.cftpSteps.textContent = 'T=' + res.T;
                    el.cftpBtn.textContent = 'T=' + res.T;
                    lastDrawnBlock = -1; // Reset for new epoch
                    // Draw both surfaces only at end of epochs 4096, 8192, 16384
                    if (res.prevT >= 4096 && res.prevT <= 16384) {
                        const maxData = sim.getCFTPMaxDimers();
                        const minData = sim.getCFTPMinDimers();
                        if (is3DView && renderer3D) {
                            renderer3D.cftpBoundsTo3D(minData.dimers, maxData.dimers);
                        } else if (maxData.dimers && maxData.dimers.length > 0) {
                            if (renderer.showDimerView) {
                                // Draw double dimer view in 2D dimer mode
                                renderer.draw(sim, activeTriangles, isValid);
                                const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
                                renderer.drawDoubleDimerView(renderer.ctx, sim, minData.dimers, maxData.dimers, centerX, centerY, scale);
                            } else {
                                // Lozenge view - just show max
                                const savedDimers = sim.dimers;
                                sim.dimers = maxData.dimers;
                                draw();
                                sim.dimers = savedDimers;
                            }
                        }
                    }
                    setTimeout(cftpStep, 0);
                } else {
                    const elapsed = ((performance.now() - cftpStartTime) / 1000).toFixed(2);
                    el.cftpSteps.textContent = 'error (' + elapsed + 's)';
                    el.cftpBtn.textContent = originalText;
                    el.cftpBtn.disabled = false;
                    el.cftpStopBtn.style.display = 'none';
                }
            }

            setTimeout(cftpStep, 0);
        }, 10);
    });

    el.cftpStopBtn.addEventListener('click', () => {
        cftpCancelled = true;
    });

    // cftpBtn2 triggers the same action as cftpBtn
    el.cftpBtn2.addEventListener('click', () => {
        el.cftpBtn.click();
    });

    // Average Sampling for Limit Shape
    // Uses parallel CFTP API (runs in parallel in threaded build)
    el.averageBtn.addEventListener('click', () => {
        if (!isValid) return;
        inFluctuationMode = false; // Exit fluctuation mode when starting averaging
        inDoubleDimerMode = false; // Exit double dimer mode when starting averaging

        // Stop any running simulation
        if (running) {
            running = false;
            el.startStopBtn.textContent = 'Start';
            el.startStopBtn.classList.remove('running');
            if (animationId) {
                cancelAnimationFrame(animationId);
                clearTimeout(animationId);
                animationId = null;
            }
        }

        const numSamples = parseInt(el.avgSamplesInput.value) || 10;
        const originalText = el.averageBtn.textContent;
        el.averageBtn.disabled = true;
        el.cftpBtn.disabled = true;
        el.startStopBtn.disabled = true;
        avgCancelled = false;
        el.avgStopBtn.style.display = 'inline-block';

        // Start timing
        const startTime = performance.now();
        const isThreaded = window.LOZENGE_THREADED || false;
        const cores = sim.getHardwareConcurrency();
        console.log(`Average sampling: starting ${numSamples} samples (threaded=${isThreaded}, cores=${cores})`);

        // Initialize parallel CFTP for all samples
        const initRes = sim.initFluctuationsCFTP(numSamples);
        if (initRes.status !== 'initialized') {
            el.avgProgress.textContent = 'init error';
            el.averageBtn.textContent = originalText;
            el.averageBtn.disabled = false;
            el.cftpBtn.disabled = false;
            el.startStopBtn.disabled = false;
            el.avgStopBtn.style.display = 'none';
            return;
        }

        function stepParallel() {
            if (avgCancelled) {
                el.avgProgress.textContent = 'stopped';
                el.averageBtn.textContent = originalText;
                el.averageBtn.disabled = false;
                el.cftpBtn.disabled = false;
                el.startStopBtn.disabled = false;
                el.avgStopBtn.style.display = 'none';
                return;
            }

            const res = sim.stepFluctuationsCFTP();
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

            if (res.status === 'in_progress') {
                el.avgProgress.textContent = `${res.done}/${numSamples} done, T=${res.maxT} (${elapsed}s)`;
                el.averageBtn.textContent = `${res.done}/${numSamples}`;
                setTimeout(stepParallel, 0);
            } else if (res.status === 'coalesced') {
                finishAveraging();
            } else {
                el.avgProgress.textContent = 'error';
                el.averageBtn.textContent = originalText;
                el.averageBtn.disabled = false;
                el.cftpBtn.disabled = false;
                el.startStopBtn.disabled = false;
                el.avgStopBtn.style.display = 'none';
            }
        }

        function finishAveraging() {
            // Collect all samples and compute height sums
            const heightSums = new Map();
            let completedSamples = 0;

            for (let i = 0; i < numSamples; i++) {
                const sample = sim.exportFluctuationSample(i);
                if (!sample.dimers || sample.dimers.length === 0) continue;

                const heights = computeHeightFunction(sample.dimers);
                for (const [key, h] of heights) {
                    if (!heightSums.has(key)) {
                        heightSums.set(key, 0);
                    }
                    heightSums.set(key, heightSums.get(key) + h);
                }
                completedSamples++;
            }

            // Compute averaged heights (rounded to nearest integer)
            const avgHeights = new Map();
            for (const [key, sum] of heightSums) {
                avgHeights.set(key, Math.round(sum / completedSamples));
            }

            // Reconstruct dimers from averaged heights
            const avgDimers = reconstructDimersFromHeights(avgHeights, sim.blackTriangles, sim.whiteTriangles);

            // Display the result
            sim.dimers = avgDimers;
            draw();

            // Report timing
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`Average sampling: completed ${completedSamples} samples in ${elapsed}s`);
            el.avgProgress.textContent = `Done (${completedSamples} samples, ${elapsed}s)`;
            el.averageBtn.textContent = originalText;
            el.averageBtn.disabled = false;
            el.cftpBtn.disabled = false;
            el.startStopBtn.disabled = false;
            el.avgStopBtn.style.display = 'none';
        }

        setTimeout(stepParallel, 10);
    });

    el.avgStopBtn.addEventListener('click', () => {
        avgCancelled = true;
    });

    // Fluctuations (GFF) - difference of two samples divided by sqrt(2)
    // Uses parallel CFTP API (runs in parallel in threaded build)
    el.fluctuationsBtn.addEventListener('click', () => {
        if (!isValid) return;

        // If samples already exist, just switch to fluctuation view
        if (storedSamples && rawFluctuations) {
            inFluctuationMode = true;
            inDoubleDimerMode = false;
            // Default to 2D view for fluctuations
            if (is3DView) {
                setViewMode(false);
            }
            renderFluctuations2D();
            return;
        }

        // Stop any running simulation
        if (running) {
            running = false;
            el.startStopBtn.textContent = 'Start';
            el.startStopBtn.classList.remove('running');
            if (animationId) {
                cancelAnimationFrame(animationId);
                clearTimeout(animationId);
                animationId = null;
            }
        }

        const originalText = el.fluctuationsBtn.textContent;
        el.fluctuationsBtn.disabled = true;
        el.cftpBtn.disabled = true;
        el.startStopBtn.disabled = true;
        el.averageBtn.disabled = true;
        el.doubleDimerBtn.disabled = true;
        fluctCancelled = false;

        // Start timing
        const startTime = performance.now();

        // Check if GPU is available
        const useGpuFluct = useWebGPU && gpuEngine && gpuEngine.isInitialized();

        if (useGpuFluct) {
            console.log('Fluctuations: starting (GPU)');
            isGpuBusy = true;
            runGpuFluctuations();
        } else {
            const isThreaded = window.LOZENGE_THREADED || false;
            const cores = sim.getHardwareConcurrency();
            console.log(`Fluctuations: starting (WASM, threaded=${isThreaded}, cores=${cores})`);
            runWasmFluctuations();
        }

        // ========== GPU Fluctuations Path ==========
        async function runGpuFluctuations() {
            // Initialize WASM CFTP to get extremal states
            sim.initCFTP();

            // Get extremal state data (same method as regular CFTP)
            const minGridData = sim.getCFTPMinRawGridData();
            const maxGridData = sim.getCFTPMaxRawGridData();
            if (!minGridData || !maxGridData) {
                console.error('Failed to get extremal states');
                el.fluctProgress.textContent = 'init error';
                resetButtons();
                return;
            }

            // Initialize GPU fluctuations CFTP
            const gpuOk = await gpuEngine.initFluctuationsCFTP(minGridData, maxGridData);
            if (!gpuOk) {
                isGpuBusy = false;
                console.error('GPU fluctuations init failed, falling back to WASM');
                runWasmFluctuations();
                return;
            }

            // Set weights
            const qBias = parseFloat(el.qInput.value) || 1.0;
            const usePeriodic = usePeriodicCheckbox.checked;
            gpuEngine.setFluctuationsWeights(currentPeriodicQ, currentPeriodicK, usePeriodic, qBias);

            // GPU CFTP loop with epoch doubling
            let T = 1;
            const maxT = 1073741824; // 2^30
            const checkInterval = 4000;

            async function gpuFluctStep() {
                if (fluctCancelled) {
                    gpuEngine.destroyFluctuationsCFTP();
                    el.fluctProgress.textContent = 'stopped';
                    resetButtons();
                    return;
                }

                // Reset chains at start of each epoch
                gpuEngine.resetFluctuationsChains();
                el.fluctProgress.textContent = `T=${T} (GPU)`;
                el.fluctuationsBtn.textContent = `T=${T}`;

                // Run full epoch as single batch - GPU checks coalescence every checkInterval steps
                const epochStart = performance.now();
                let result;
                try {
                    result = await gpuEngine.stepFluctuationsCFTP(T, checkInterval);
                } catch (stepErr) {
                    console.error('[Fluct-CFTP] stepFluctuationsCFTP error:', stepErr);
                    try { gpuEngine.destroyFluctuationsCFTP(); } catch (e) {}
                    resetButtons();
                    return;
                }
                const totalStepsRun = result.stepsRun;
                let coalesced = result.coalesced;
                const epochMs = performance.now() - epochStart;
                const pairStatus = `${coalesced[0]?'✓':'○'}${coalesced[1]?'✓':'○'}`;
                console.log(`[Fluct-CFTP] epoch T=${T}: ${totalStepsRun} steps in ${epochMs.toFixed(1)}ms (${pairStatus})`);

                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
                const status = coalesced[0] && coalesced[1] ? ' ✓' : ` (${pairStatus})`;
                el.fluctProgress.textContent = `T=${T} @${totalStepsRun}${status} (${elapsed}s, GPU)`;

                // Check final coalescence if not detected during run
                if (!(coalesced[0] && coalesced[1])) {
                    try {
                        const finalCoalesced = await gpuEngine.checkFluctuationsCoalescence();
                        coalesced = finalCoalesced;
                    } catch (checkErr) {
                        console.error('[Fluct-CFTP] coalescence check error:', checkErr);
                        try { gpuEngine.destroyFluctuationsCFTP(); } catch (e) {}
                        resetButtons();
                        return;
                    }
                }

                if (coalesced[0] && coalesced[1]) {
                    // Both pairs coalesced - get samples and finish
                    try {
                        const samples = await gpuEngine.getFluctuationsSamples(sim.blackTriangles);
                        gpuEngine.destroyFluctuationsCFTP();
                        console.log(`[Fluct-CFTP] GPU sampling complete: T=${T}, ${((performance.now() - startTime) / 1000).toFixed(2)}s total`);
                        finishFluctuationsWithSamples(samples.sample0, samples.sample1);
                    } catch (e) {
                        console.error('[Fluct-CFTP] getFluctuationsSamples error:', e);
                        try { gpuEngine.destroyFluctuationsCFTP(); } catch (e2) {}
                        resetButtons();
                    }
                } else if (T >= maxT) {
                    el.fluctProgress.textContent = 'max T reached';
                    gpuEngine.destroyFluctuationsCFTP();
                    resetButtons();
                } else {
                    // Double T and try again
                    T *= 2;
                    setTimeout(gpuFluctStep, 0);
                }
            }

            setTimeout(gpuFluctStep, 10);
        }

        // ========== WASM Fluctuations Path ==========
        function runWasmFluctuations() {
            const initRes = sim.initFluctuationsCFTP(2);
            if (initRes.status !== 'initialized') {
                el.fluctProgress.textContent = 'init error';
                resetButtons();
                return;
            }

            function stepParallel() {
                if (fluctCancelled) {
                    el.fluctProgress.textContent = 'stopped';
                    resetButtons();
                    return;
                }

                const res = sim.stepFluctuationsCFTP();
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

                if (res.status === 'in_progress') {
                    const status = `(${res.done >= 1 ? '✓' : '○'}${res.done >= 2 ? '✓' : '○'})`;
                    el.fluctProgress.textContent = `T=${res.maxT} ${status} (${elapsed}s)`;
                    el.fluctuationsBtn.textContent = `${res.done}/2`;
                    setTimeout(stepParallel, 0);
                } else if (res.status === 'coalesced') {
                    const sample0 = sim.exportFluctuationSample(0);
                    const sample1 = sim.exportFluctuationSample(1);
                    finishFluctuationsWithSamples(sample0.dimers, sample1.dimers);
                } else {
                    el.fluctProgress.textContent = 'error';
                    resetButtons();
                }
            }

            setTimeout(stepParallel, 10);
        }

        // ========== Shared finish function ==========
        function finishFluctuationsWithSamples(dimers0, dimers1) {
            // Store raw samples for both views
            storedSamples = { dimers0, dimers1 };

            const sample1Heights = computeHeightFunction(dimers0);
            const sample2Heights = computeHeightFunction(dimers1);

            // Compute raw (h1 - h2) / sqrt(2) and store for dynamic re-rendering
            rawFluctuations = new Map();
            const sqrt2 = Math.sqrt(2);

            for (const [key, h1] of sample1Heights) {
                const h2 = sample2Heights.get(key) || 0;
                rawFluctuations.set(key, (h1 - h2) / sqrt2);
            }

            // Default to 2D view for fluctuations
            if (is3DView) {
                setViewMode(false);
            }

            // Lock fluctuation mode to prevent draw() from overwriting
            inFluctuationMode = true;
            inDoubleDimerMode = false;

            // Render with current scale (2D by default)
            renderFluctuations2D();

            // Report timing
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`Fluctuations: completed in ${elapsed}s`);
            el.fluctProgress.textContent = `Done (${elapsed}s)`;
            resetButtons();
        }

        function resetButtons() {
            isGpuBusy = false;
            el.fluctuationsBtn.textContent = originalText;
            el.fluctuationsBtn.disabled = false;
            el.cftpBtn.disabled = false;
            el.startStopBtn.disabled = false;
            el.averageBtn.disabled = false;
            el.doubleDimerBtn.disabled = false;
            el.resampleBtn.style.display = 'inline-block';
        }
    });

    // Dynamic scale update for fluctuations (both 2D and 3D)
    el.fluctScaleInput.addEventListener('input', () => {
        if (inFluctuationMode && rawFluctuations) {
            if (is3DView) {
                renderFluctuations();
            } else {
                renderFluctuations2D();
            }
        }
    });

    // Toggle outline for fluctuations and double dimer views
    el.fluctOutlineCheck.addEventListener('change', () => {
        if (inFluctuationMode && rawFluctuations) {
            if (is3DView) {
                renderFluctuations();
            } else {
                renderFluctuations2D();
            }
        }
        if (inDoubleDimerMode && storedSamples) {
            renderDoubleDimers();
        }
    });

    // Filter loops by minimum size for double dimer display
    // Double dimer = union of 2 perfect matchings = decomposes into vertex-disjoint cycles
    // Render double dimer view with loop filtering (C++ only)
    function renderDoubleDimers() {
        if (!storedSamples) return;
        const minLoop = parseInt(el.minLoopInput.value) || 2;

        // Load dimers into C++ once per sample set
        if (!storedSamples.loadedToCpp) {
            sim.loadDimersForLoops(storedSamples.dimers0, storedSamples.dimers1);
            storedSamples.loadedToCpp = true;
        }
        const result = sim.filterLoopsByMinSize(minLoop);
        const filtered = {
            dimers0: result.indices0.map(i => storedSamples.dimers0[i]),
            dimers1: result.indices1.map(i => storedSamples.dimers1[i])
        };

        // Force 2D mode
        is3DView = false;
        canvas.style.display = 'block';
        threeContainer.style.display = 'none';
        el.toggle3DBtn.textContent = '3D';

        // Get canvas context and clear EVERYTHING
        const ctx = canvas.getContext('2d');
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

        // Clear entire canvas
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Get transform for drawing
        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);

        // Draw grid background if enabled
        if (renderer.showGrid) {
            renderer.drawBackgroundGrid(ctx, centerX, centerY, scale, isDarkMode);
        }

        // Draw triangle outlines only for small polygons (when shading would be shown) and outline is enabled
        const isSmallPolygon = !sim.blackTriangles || sim.blackTriangles.length <= 1000;
        if (isSmallPolygon && el.fluctOutlineCheck.checked) {
            renderer.drawActiveTriangles(ctx, activeTriangles, centerX, centerY, scale, true, true);
        }

        // Fill holes with hole color
        if (sim.boundaries && sim.boundaries.length > 1) {
            renderer.drawHoleFills(ctx, sim.boundaries, centerX, centerY, scale);
        }

        // Draw ONLY the double dimer configuration - two samples superimposed
        renderer.drawDoubleDimerView(ctx, sim, filtered.dimers0, filtered.dimers1, centerX, centerY, scale);

        // Draw all boundaries (outer + holes + disconnected) if outline checkbox is checked
        // Draw AFTER dimers so boundary is visible on top
        if (el.fluctOutlineCheck.checked && sim.boundaries && sim.boundaries.length > 0) {
            for (const boundary of sim.boundaries) {
                renderer.drawBoundary(ctx, boundary, centerX, centerY, scale, isDarkMode);
            }
        }
    }

    // Double Dimer perfect sampling
    el.doubleDimerBtn.addEventListener('click', async () => {
        // If samples already exist, just switch to double dimer view
        if (storedSamples) {
            inDoubleDimerMode = true;
            inFluctuationMode = false;
            renderDoubleDimers();
            return;
        }

        const originalText = el.doubleDimerBtn.textContent;
        el.doubleDimerBtn.disabled = true;
        el.cftpBtn.disabled = true;
        el.fluctuationsBtn.disabled = true;
        el.averageBtn.disabled = true;
        doubleDimerCancelled = false;

        const ddStartTime = performance.now();

        // Check if GPU is available
        const useGpuDD = useWebGPU && gpuEngine && gpuEngine.isInitialized && gpuEngine.isInitialized();

        el.doubleDimerProgress.textContent = 'initializing...';

        function finishDoubleDimerWithSamples(dimers0, dimers1) {
            // Store raw samples for both views
            storedSamples = { dimers0, dimers1 };

            // Also compute fluctuations data so user can switch views
            const sample1Heights = computeHeightFunction(dimers0);
            const sample2Heights = computeHeightFunction(dimers1);
            rawFluctuations = new Map();
            const sqrt2 = Math.sqrt(2);
            for (const [key, h1] of sample1Heights) {
                const h2 = sample2Heights.get(key) || 0;
                rawFluctuations.set(key, (h1 - h2) / sqrt2);
            }

            inDoubleDimerMode = true;
            inFluctuationMode = false;

            isGpuBusy = false;
            const elapsed = ((performance.now() - ddStartTime) / 1000).toFixed(2);
            el.doubleDimerProgress.textContent = `Done (${elapsed}s)`;
            el.doubleDimerBtn.textContent = originalText;
            el.doubleDimerBtn.disabled = false;
            el.cftpBtn.disabled = false;
            el.fluctuationsBtn.disabled = false;
            el.averageBtn.disabled = false;
            el.resampleBtn.style.display = 'inline-block';

            renderDoubleDimers();
        }

        if (useGpuDD) {
            // GPU path - reuse fluctuations CFTP infrastructure
            isGpuBusy = true;
            // Initialize WASM CFTP to get extremal states
            sim.initCFTP();

            const minGridData = sim.getCFTPMinRawGridData();
            const maxGridData = sim.getCFTPMaxRawGridData();

            if (!minGridData || !maxGridData) {
                isGpuBusy = false;
                el.doubleDimerProgress.textContent = 'Error: no grid data';
                el.doubleDimerBtn.textContent = originalText;
                el.doubleDimerBtn.disabled = false;
                el.cftpBtn.disabled = false;
                el.fluctuationsBtn.disabled = false;
                el.averageBtn.disabled = false;
                return;
            }

            const gpuDDOk = await gpuEngine.initFluctuationsCFTP(minGridData, maxGridData);
            if (!gpuDDOk) {
                isGpuBusy = false;
                console.warn('GPU Double Dimer init failed, falling back to WASM');
            } else {
                const qBias = parseFloat(el.qInput.value) || 1.0;
                const usePeriodic = usePeriodicCheckbox.checked;
                gpuEngine.setFluctuationsWeights(currentPeriodicQ, currentPeriodicK, usePeriodic, qBias);

                let T = 1;
                const maxT = 1073741824;
                const checkInterval = 4000;

                async function gpuDDStep() {
                    if (doubleDimerCancelled) {
                        gpuEngine.destroyFluctuationsCFTP();
                        isGpuBusy = false;
                        el.doubleDimerProgress.textContent = 'stopped';
                        el.doubleDimerBtn.textContent = originalText;
                        el.doubleDimerBtn.disabled = false;
                        el.cftpBtn.disabled = false;
                        el.fluctuationsBtn.disabled = false;
                        el.averageBtn.disabled = false;
                        return;
                    }

                    gpuEngine.resetFluctuationsChains();

                    // Run full epoch as single batch - GPU checks coalescence every checkInterval steps
                    const epochStart = performance.now();
                    let result;
                    try {
                        result = await gpuEngine.stepFluctuationsCFTP(T, checkInterval);
                    } catch (stepErr) {
                        console.error('[DD-CFTP] stepFluctuationsCFTP error:', stepErr);
                        try { gpuEngine.destroyFluctuationsCFTP(); } catch (e) {}
                        isGpuBusy = false;
                        el.doubleDimerProgress.textContent = 'GPU error';
                        el.doubleDimerBtn.textContent = originalText;
                        el.doubleDimerBtn.disabled = false;
                        el.cftpBtn.disabled = false;
                        el.fluctuationsBtn.disabled = false;
                        el.averageBtn.disabled = false;
                        return;
                    }
                    const stepsRun = result.stepsRun;
                    let coalesced = result.coalesced;
                    const epochMs = performance.now() - epochStart;
                    const pairStatus = `${coalesced[0]?'✓':'○'}${coalesced[1]?'✓':'○'}`;
                    console.log(`[DD-CFTP] epoch T=${T}: ${stepsRun} steps in ${epochMs.toFixed(1)}ms (${pairStatus})`);

                    const elapsed = ((performance.now() - ddStartTime) / 1000).toFixed(1);
                    const status = coalesced[0] && coalesced[1] ? ' ✓' : ` (${pairStatus})`;
                    el.doubleDimerProgress.textContent = `T=${T} @${stepsRun}${status} (${elapsed}s, GPU)`;

                    // Check final coalescence if not detected during run
                    if (!(coalesced[0] && coalesced[1])) {
                        try {
                            coalesced = await gpuEngine.checkFluctuationsCoalescence();
                        } catch (checkErr) {
                            console.error('[DD-CFTP] coalescence check error:', checkErr);
                            try { gpuEngine.destroyFluctuationsCFTP(); } catch (e) {}
                            isGpuBusy = false;
                            el.doubleDimerProgress.textContent = 'GPU error';
                            el.doubleDimerBtn.textContent = originalText;
                            el.doubleDimerBtn.disabled = false;
                            el.cftpBtn.disabled = false;
                            el.fluctuationsBtn.disabled = false;
                            el.averageBtn.disabled = false;
                            return;
                        }
                    }

                    if (coalesced[0] && coalesced[1]) {
                        try {
                            const samples = await gpuEngine.getFluctuationsSamples(sim.blackTriangles);
                            gpuEngine.destroyFluctuationsCFTP();
                            console.log(`[DD-CFTP] GPU sampling complete: T=${T}, ${((performance.now() - ddStartTime) / 1000).toFixed(2)}s total`);
                            finishDoubleDimerWithSamples(samples.sample0, samples.sample1);
                        } catch (e) {
                            console.error('[DD-CFTP] getFluctuationsSamples error:', e);
                            try { gpuEngine.destroyFluctuationsCFTP(); } catch (e2) {}
                            isGpuBusy = false;
                            el.doubleDimerProgress.textContent = 'GPU error';
                            el.doubleDimerBtn.textContent = originalText;
                            el.doubleDimerBtn.disabled = false;
                            el.cftpBtn.disabled = false;
                            el.fluctuationsBtn.disabled = false;
                            el.averageBtn.disabled = false;
                        }
                    } else if (T >= maxT) {
                        gpuEngine.destroyFluctuationsCFTP();
                        isGpuBusy = false;
                        el.doubleDimerProgress.textContent = 'timeout';
                        el.doubleDimerBtn.textContent = originalText;
                        el.doubleDimerBtn.disabled = false;
                        el.cftpBtn.disabled = false;
                        el.fluctuationsBtn.disabled = false;
                        el.averageBtn.disabled = false;
                    } else {
                        T *= 2;
                        setTimeout(gpuDDStep, 0);
                    }
                }

                gpuDDStep();
                return;
            }
        }

        // WASM path
        sim.initFluctuationsCFTP(2);

        function wasmDDStep() {
            if (doubleDimerCancelled) {
                el.doubleDimerProgress.textContent = 'stopped';
                el.doubleDimerBtn.textContent = originalText;
                el.doubleDimerBtn.disabled = false;
                el.cftpBtn.disabled = false;
                el.fluctuationsBtn.disabled = false;
                el.averageBtn.disabled = false;
                return;
            }

            // Call step once - it does a full epoch and returns status
            const res = sim.stepFluctuationsCFTP();
            const elapsed = ((performance.now() - ddStartTime) / 1000).toFixed(1);
            const status = res.done >= 2 ? '✓' : `(${res.done >= 1 ? '✓' : '○'}${res.done >= 2 ? '✓' : '○'})`;
            el.doubleDimerProgress.textContent = `T=${res.maxT} ${status} (${elapsed}s)`;

            if (res.status === 'coalesced') {
                const sample0 = sim.exportFluctuationSample(0);
                const sample1 = sim.exportFluctuationSample(1);
                finishDoubleDimerWithSamples(sample0.dimers, sample1.dimers);
            } else if (res.status === 'in_progress') {
                setTimeout(wasmDDStep, 0);
            } else {
                el.doubleDimerProgress.textContent = 'error';
                el.doubleDimerBtn.textContent = originalText;
                el.doubleDimerBtn.disabled = false;
                el.cftpBtn.disabled = false;
                el.fluctuationsBtn.disabled = false;
                el.averageBtn.disabled = false;
            }
        }

        wasmDDStep();
    });

    // Dynamic min loop update for double dimers
    el.minLoopInput.addEventListener('input', () => {
        if (inDoubleDimerMode && storedSamples) {
            renderDoubleDimers();
        }
    });

    // Resample button - clears stored samples and re-runs sampling
    el.resampleBtn.addEventListener('click', () => {
        // Remember which mode was active
        const wasDoubleDimerMode = inDoubleDimerMode;
        // Clear stored data
        storedSamples = null;
        rawFluctuations = null;
        inFluctuationMode = false;
        inDoubleDimerMode = false;
        el.resampleBtn.style.display = 'none';
        el.fluctProgress.textContent = '';
        el.doubleDimerProgress.textContent = '';
        // Trigger new sampling via the appropriate button
        if (wasDoubleDimerMode) {
            el.doubleDimerBtn.click();
        } else {
            el.fluctuationsBtn.click();
        }
    });

    // Export
    document.getElementById('export-quality').addEventListener('input', (e) => {
        document.getElementById('export-quality-val').textContent = e.target.value;
    });

    // iOS detection for download workaround (all iOS browsers use WebKit)
    function isIOS() {
        const ua = navigator.userAgent;
        return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    // Cross-platform file download (iOS doesn't support link.click() downloads)
    async function downloadFile(blob, filename) {
        if (isIOS() && navigator.share && navigator.canShare) {
            // iOS: use Web Share API for native Share Sheet
            const file = new File([blob], filename, { type: blob.type });
            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file] });
                    return;
                } catch (e) {
                    if (e.name !== 'AbortError') console.error('Share failed:', e);
                    return;
                }
            }
        }
        // Desktop / fallback: standard download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }

    function getExportScale() {
        return 1 + (parseInt(document.getElementById('export-quality').value) / 100) * 3;
    }

    function generateExportFilename(extension, exportType) {
        // Random 4-letter code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const code = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');

        // Size info (black = white count for tileable regions)
        const numTri = sim.blackTriangles ? sim.blackTriangles.length : 0;
        const size = `n${numTri}`;

        // Measure info
        const qVal = parseFloat(el.qInput.value) || 1.0;
        const usePeriodic = usePeriodicCheckbox.checked;
        let measure = qVal === 1.0 ? 'unif' : `q${qVal}`;
        if (usePeriodic) {
            const k = parseInt(periodicKSelect.value) || 1;
            measure += `_per${k}`;
        }

        // Mode info - exportType takes precedence for data exports (shape, height)
        let mode;
        if (exportType) {
            mode = exportType;
        } else if (inDoubleDimerMode && storedSamples) {
            const minLoop = parseInt(el.minLoopInput.value) || 2;
            mode = `dblDimer_loop${minLoop}`;
        } else if (renderer.showDimerView) {
            mode = 'dimer';
        } else {
            mode = 'loz';
        }

        return `lozenge_${mode}_${size}_${measure}_${code}.${extension}`;
    }

    function createExportSVG() {
        const width = 900, height = 600;
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

        // Temporarily set renderer dimensions for correct transform
        const origW = renderer.displayWidth, origH = renderer.displayHeight;
        renderer.displayWidth = width;
        renderer.displayHeight = height;
        const { centerX, centerY, scale } = renderer.getTransform(activeTriangles);
        renderer.displayWidth = origW;
        renderer.displayHeight = origH;

        const colors = renderer.getPermutedColors();
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

        // 1. Background
        svg += `<rect width="${width}" height="${height}" fill="${isDarkMode ? '#1a1a1a' : '#ffffff'}"/>`;

        // 2. Grid (if enabled)
        if (renderer.showGrid) {
            const gridColor = isDarkMode ? 'rgba(200,200,200,0.4)' : 'rgba(200,200,200,0.5)';
            svg += `<g stroke="${gridColor}" stroke-width="0.5" fill="none">`;

            // Calculate visible range
            const corners = [
                renderer.fromCanvas(0, 0, centerX, centerY, scale),
                renderer.fromCanvas(width, 0, centerX, centerY, scale),
                renderer.fromCanvas(0, height, centerX, centerY, scale),
                renderer.fromCanvas(width, height, centerX, centerY, scale),
            ];
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const c of corners) {
                minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
                minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
            }
            const viewRange = Math.max(maxX - minX, maxY - minY);
            const margin = Math.ceil(viewRange * 0.5) + 10;
            minX -= margin; maxX += margin;

            const minN = Math.floor(minX) - 5;
            const maxN = Math.ceil(maxX) + 5;
            const minJ = Math.floor(minY / deltaC) - Math.ceil(viewRange) - 5;
            const maxJ = Math.ceil(maxY / deltaC) + Math.ceil(viewRange) + 5;

            // Vertical lines
            for (let n = minN; n <= maxN; n++) {
                const y1 = slope * n + minJ * deltaC;
                const y2 = slope * n + maxJ * deltaC;
                const [x1c, y1c] = renderer.toCanvas(n, y1, centerX, centerY, scale);
                const [x2c, y2c] = renderer.toCanvas(n, y2, centerX, centerY, scale);
                svg += `<line x1="${x1c}" y1="${y1c}" x2="${x2c}" y2="${y2c}"/>`;
            }
            // +slope lines
            for (let j = minJ; j <= maxJ; j++) {
                const [x1c, y1c] = renderer.toCanvas(minN, slope * minN + j * deltaC, centerX, centerY, scale);
                const [x2c, y2c] = renderer.toCanvas(maxN, slope * maxN + j * deltaC, centerX, centerY, scale);
                svg += `<line x1="${x1c}" y1="${y1c}" x2="${x2c}" y2="${y2c}"/>`;
            }
            // -slope lines
            for (let j = minJ; j <= maxJ; j++) {
                const [x1c, y1c] = renderer.toCanvas(minN, -slope * minN + j * deltaC, centerX, centerY, scale);
                const [x2c, y2c] = renderer.toCanvas(maxN, -slope * maxN + j * deltaC, centerX, centerY, scale);
                svg += `<line x1="${x1c}" y1="${y1c}" x2="${x2c}" y2="${y2c}"/>`;
            }
            svg += '</g>';
        }

        // 3. Lozenges or Dimers
        if (isValid && sim.dimers.length > 0) {
            if (renderer.showDimerView) {
                // Dimer edges
                const isLarge = sim.blackTriangles && sim.blackTriangles.length > 1000;
                const lineW = isLarge ? 1 : 3;
                svg += `<g stroke="#000" stroke-width="${lineW}" fill="none">`;
                for (const dimer of sim.dimers) {
                    const bc = sim.blackTriangles.find(b => b.n === dimer.bn && b.j === dimer.bj);
                    const wc = sim.whiteTriangles.find(w => w.n === dimer.wn && w.j === dimer.wj);
                    if (bc && wc) {
                        const [bcx, bcy] = renderer.toCanvas(bc.cx, bc.cy, centerX, centerY, scale);
                        const [wcx, wcy] = renderer.toCanvas(wc.cx, wc.cy, centerX, centerY, scale);
                        svg += `<line x1="${bcx}" y1="${bcy}" x2="${wcx}" y2="${wcy}"/>`;
                    }
                }
                svg += '</g>';
            } else {
                // Lozenges
                const dimerCount = sim.dimers.length || 1;
                const outlineWidth = renderer.outlineWidthPct * (100 / dimerCount) * 0.1;
                const outlineColor = isDarkMode ? '#aaaaaa' : '#000000';

                for (const dimer of sim.dimers) {
                    const verts = renderer.getLozengeVertices(dimer);
                    const pts = verts.map(v => renderer.toCanvas(v.x, v.y, centerX, centerY, scale));
                    const points = pts.map(p => `${p[0]},${p[1]}`).join(' ');
                    svg += `<polygon points="${points}" fill="${colors[dimer.t]}"`;
                    if (outlineWidth > 0) {
                        svg += ` stroke="${outlineColor}" stroke-width="${outlineWidth}"`;
                    }
                    svg += '/>';
                }
            }

            // 4. Path overlays
            if (renderer.pathMode > 0) {
                const excludedType = renderer.pathMode === 1 ? 2 : (renderer.pathMode === 2 ? 0 : 1);
                const pathColor = isDarkMode ? '#ffffff' : '#333333';
                svg += `<g stroke="${pathColor}" stroke-width="${renderer.pathWidthPx}" stroke-linecap="round" fill="none">`;

                for (const dimer of sim.dimers) {
                    if (dimer.t === excludedType) continue;
                    const verts = renderer.getLozengeVertices(dimer);
                    let mid1, mid2;
                    const t = dimer.t;

                    if (renderer.pathMode === 1) {
                        mid1 = { x: (verts[1].x + verts[2].x) / 2, y: (verts[1].y + verts[2].y) / 2 };
                        mid2 = { x: (verts[3].x + verts[0].x) / 2, y: (verts[3].y + verts[0].y) / 2 };
                    } else if (renderer.pathMode === 2) {
                        if (t === 1) {
                            mid1 = { x: (verts[0].x + verts[1].x) / 2, y: (verts[0].y + verts[1].y) / 2 };
                            mid2 = { x: (verts[2].x + verts[3].x) / 2, y: (verts[2].y + verts[3].y) / 2 };
                        } else {
                            mid1 = { x: (verts[1].x + verts[2].x) / 2, y: (verts[1].y + verts[2].y) / 2 };
                            mid2 = { x: (verts[3].x + verts[0].x) / 2, y: (verts[3].y + verts[0].y) / 2 };
                        }
                    } else {
                        mid1 = { x: (verts[0].x + verts[1].x) / 2, y: (verts[0].y + verts[1].y) / 2 };
                        mid2 = { x: (verts[2].x + verts[3].x) / 2, y: (verts[2].y + verts[3].y) / 2 };
                    }

                    const [c1x, c1y] = renderer.toCanvas(mid1.x, mid1.y, centerX, centerY, scale);
                    const [c2x, c2y] = renderer.toCanvas(mid2.x, mid2.y, centerX, centerY, scale);
                    svg += `<line x1="${c1x}" y1="${c1y}" x2="${c2x}" y2="${c2y}"/>`;
                }
                svg += '</g>';
            }
        }

        // 5. Hole fills
        if (sim.boundaries && sim.boundaries.length > 1) {
            // Find outer boundary index (largest absolute area)
            let outerIdx = 0;
            let maxArea = 0;
            for (let i = 0; i < sim.boundaries.length; i++) {
                const b = sim.boundaries[i];
                let area = 0;
                for (let j = 0; j < b.length; j++) {
                    const k = (j + 1) % b.length;
                    area += b[j].x * b[k].y - b[k].x * b[j].y;
                }
                if (Math.abs(area) > maxArea) {
                    maxArea = Math.abs(area);
                    outerIdx = i;
                }
            }
            // Fill all boundaries except the outer one (those are holes)
            for (let i = 0; i < sim.boundaries.length; i++) {
                if (i === outerIdx) continue;
                const boundary = sim.boundaries[i];
                if (boundary.length < 3) continue;
                const pts = boundary.map(p => renderer.toCanvas(p.x, p.y, centerX, centerY, scale));
                const d = `M ${pts[0][0]},${pts[0][1]} ` + pts.slice(1).map(p => `L ${p[0]},${p[1]}`).join(' ') + ' Z';
                svg += `<path d="${d}" fill="${renderer.holeColor}" stroke="none"/>`;
            }
        }

        // 6. Boundaries
        if (sim.boundaries && sim.boundaries.length > 0) {
            const borderWidth = Math.max(0.5, renderer.borderWidthPct * scale * 0.1);
            const borderColor = isDarkMode ? '#cccccc' : '#000000';
            svg += `<g stroke="${borderColor}" stroke-width="${borderWidth}" fill="none">`;
            for (const boundary of sim.boundaries) {
                if (boundary.length < 2) continue;
                const pts = boundary.map(p => renderer.toCanvas(p.x, p.y, centerX, centerY, scale));
                const d = `M ${pts[0][0]},${pts[0][1]} ` + pts.slice(1).map(p => `L ${p[0]},${p[1]}`).join(' ') + ' Z';
                svg += `<path d="${d}"/>`;
            }
            svg += '</g>';
        }

        // 6. Boundary length labels (if enabled)
        if (renderer.showBoundaryLengths && sim.segments && sim.segments.length > 0) {
            const baseFontSize = Math.max(13, Math.min(27, scale * 0.4));
            const fontSize = baseFontSize * renderer.labelSize;
            const textColor = isDarkMode ? '#ffffff' : '#000000';
            svg += `<g font-family="Times New Roman, Georgia, serif" font-style="italic" font-size="${fontSize}" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">`;

            // Find outer boundary
            let outerIdx = 0, maxArea = 0;
            for (let i = 0; i < sim.boundaries.length; i++) {
                const b = sim.boundaries[i];
                let area = 0;
                for (let j = 0; j < b.length; j++) {
                    const k = (j + 1) % b.length;
                    area += b[j].x * b[k].y - b[k].x * b[j].y;
                }
                if (Math.abs(area) > maxArea) { maxArea = Math.abs(area); outerIdx = i; }
            }

            // Helper for point-in-polygon
            const pointInPolygon = (x, y, polygon) => {
                if (!polygon || polygon.length < 3) return false;
                let inside = false;
                for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                    const xi = polygon[i].x, yi = polygon[i].y;
                    const xj = polygon[j].x, yj = polygon[j].y;
                    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
                }
                return inside;
            };
            const isInsideRegion = (x, y) => {
                let count = 0;
                for (const boundary of sim.boundaries) if (pointInPolygon(x, y, boundary)) count++;
                return count % 2 === 1;
            };

            for (let i = 0; i < sim.segments.length; i++) {
                const isHole = (i !== outerIdx);
                if (isHole && !renderer.showHoleLengths) continue;
                for (const seg of sim.segments[i]) {
                    let testX = seg.x + seg.nx * 0.8;
                    let testY = seg.y + seg.ny * 0.8;
                    let flip = isInsideRegion(testX, testY) ? -1 : 1;
                    let nx, ny;
                    if (renderer.rotated) { nx = seg.ny * flip; ny = seg.nx * flip; }
                    else { nx = seg.nx * flip; ny = -seg.ny * flip; }
                    const [cx, cy] = renderer.toCanvas(seg.x, seg.y, centerX, centerY, scale);
                    const canvasOffset = fontSize * renderer.labelOffset;
                    const labelX = cx + nx * canvasOffset;
                    const labelY = cy + ny * canvasOffset;
                    svg += `<text x="${labelX}" y="${labelY}">${seg.len}</text>`;
                }
            }
            svg += '</g>';
        }

        // 7. Periodic weights (if enabled and not too many)
        if (renderer.usePeriodicWeights && activeTriangles && !renderer.showDimerView) {
            const vertices = new Map();
            for (const [key, tri] of activeTriangles) {
                const addVertex = (n, j) => { const vkey = `${n},${j}`; if (!vertices.has(vkey)) vertices.set(vkey, { n, j }); };
                if (tri.type === 1) { addVertex(tri.n, tri.j); addVertex(tri.n, tri.j - 1); addVertex(tri.n + 1, tri.j - 1); }
                else { addVertex(tri.n, tri.j); addVertex(tri.n + 1, tri.j); addVertex(tri.n + 1, tri.j - 1); }
            }

            if (vertices.size <= 100) {
                const fontSize = Math.max(12, Math.min(24, scale * 0.7));
                const textColor = isDarkMode ? '#ffffff' : '#000000';
                svg += `<g font-family="sans-serif" font-size="${fontSize}" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">`;
                for (const [vkey, v] of vertices) {
                    const k = renderer.periodicK;
                    const ni = ((v.n % k) + k) % k;
                    const ji = ((v.j % k) + k) % k;
                    const q = renderer.periodicQ[ni][ji];
                    const worldX = v.n;
                    const worldY = v.n / Math.sqrt(3) + v.j * 2 / Math.sqrt(3);
                    const [cx, cy] = renderer.toCanvas(worldX, worldY, centerX, centerY, scale);
                    svg += `<text x="${cx}" y="${cy}">${q}</text>`;
                }
                svg += '</g>';
            }
        }

        svg += '</svg>';
        return svg;
    }

    function createExportCanvas() {
        const baseWidth = 900, baseHeight = 600, scale = getExportScale();
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = baseWidth * scale;
        exportCanvas.height = baseHeight * scale;
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.scale(scale, scale);
        const origCtx = renderer.ctx, origW = renderer.displayWidth, origH = renderer.displayHeight;
        renderer.ctx = exportCtx;
        renderer.displayWidth = baseWidth;
        renderer.displayHeight = baseHeight;

        // Check if we're in double dimer mode - render that view instead
        if (inDoubleDimerMode && storedSamples) {
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            exportCtx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
            exportCtx.fillRect(0, 0, baseWidth, baseHeight);

            const { centerX, centerY, scale: viewScale } = renderer.getTransform(activeTriangles);

            if (renderer.showGrid) {
                renderer.drawBackgroundGrid(exportCtx, centerX, centerY, viewScale, isDarkMode);
            }

            const isSmallPolygon = !sim.blackTriangles || sim.blackTriangles.length <= 1000;
            if (isSmallPolygon) {
                renderer.drawActiveTriangles(exportCtx, activeTriangles, centerX, centerY, viewScale, true, true);
            }

            // Fill holes with hole color
            if (sim.boundaries && sim.boundaries.length > 1) {
                renderer.drawHoleFills(exportCtx, sim.boundaries, centerX, centerY, viewScale);
            }

            if (sim.boundaries && sim.boundaries.length > 0) {
                for (const boundary of sim.boundaries) {
                    renderer.drawBoundary(exportCtx, boundary, centerX, centerY, viewScale, isDarkMode);
                }
            }

            // Get filtered dimers using current min loop setting
            const minLoop = parseInt(el.minLoopInput.value) || 2;
            if (!storedSamples.loadedToCpp) {
                sim.loadDimersForLoops(storedSamples.dimers0, storedSamples.dimers1);
                storedSamples.loadedToCpp = true;
            }
            const result = sim.filterLoopsByMinSize(minLoop);
            const filtered = {
                dimers0: result.indices0.map(i => storedSamples.dimers0[i]),
                dimers1: result.indices1.map(i => storedSamples.dimers1[i])
            };

            renderer.drawDoubleDimerView(exportCtx, sim, filtered.dimers0, filtered.dimers1, centerX, centerY, viewScale);
        } else {
            renderer.draw(sim, activeTriangles, isValid);
        }

        renderer.ctx = origCtx;
        renderer.displayWidth = origW;
        renderer.displayHeight = origH;
        return exportCanvas;
    }

    document.getElementById('export-png').addEventListener('click', () => {
        createExportCanvas().toBlob((blob) => {
            downloadFile(blob, generateExportFilename('png'));
        }, 'image/png');
    });

    document.getElementById('export-pdf').addEventListener('click', async () => {
        try {
            // Load jspdf and svg2pdf.js if needed
            const loadScript = (src) => new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = resolve;
                s.onerror = () => reject(new Error('Failed to load ' + src));
                document.head.appendChild(s);
            });

            if (!window.jspdf) {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            if (!window.svg2pdfLoaded) {
                await loadScript('/js/svg2pdf.umd.min.js');
                window.svg2pdfLoaded = true;
            }

            const svgString = createExportSVG();
            const parser = new DOMParser();
            const svgElement = parser.parseFromString(svgString, 'image/svg+xml').documentElement;

            const width = 900, height = 600;
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [width, height]
            });

            await pdf.svg(svgElement, { x: 0, y: 0, width, height });
            const blob = pdf.output('blob');
            downloadFile(blob, generateExportFilename('pdf'));
        } catch (err) {
            console.error('PDF export error:', err);
            alert('PDF export failed: ' + err.message);
        }
    });

    // JSON Export - save shape to file
    document.getElementById('export-json').addEventListener('click', () => {
        const triangles = [];
        for (const [key, tri] of activeTriangles) {
            triangles.push({ n: tri.n, j: tri.j, type: tri.type });
        }
        const data = {
            version: 1,
            triangles: triangles
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        downloadFile(blob, generateExportFilename('json', 'shape'));
    });

    // Height CSV coordinate info - toggle visibility
    const csvInfoBox = document.getElementById('height-csv-info-box');
    document.getElementById('height-csv-info').addEventListener('click', () => {
        csvInfoBox.style.display = csvInfoBox.style.display === 'none' ? 'block' : 'none';
    });

    // Mathematica plotting code - toggle visibility
    const mmaInfoBox = document.getElementById('height-mma-info-box');
    document.getElementById('height-mma-info').addEventListener('click', () => {
        mmaInfoBox.style.display = mmaInfoBox.style.display === 'none' ? 'block' : 'none';
    });

    // Height CSV Export - export height function to CSV
    document.getElementById('export-height-csv').addEventListener('click', () => {
        if (!isValid || sim.dimers.length === 0) {
            alert('No valid tiling to export. Create a valid tileable region first.');
            return;
        }

        const heights = computeHeightFunction(sim.dimers);

        // Build CSV with header
        let csv = 'n,j,x,y,h\n';
        for (const [key, h] of heights) {
            const [n, j] = key.split(',').map(Number);
            const vertex = getVertex(n, j);
            csv += `${n},${j},${vertex.x.toFixed(6)},${vertex.y.toFixed(6)},${-h}\n`;
        }

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadFile(blob, generateExportFilename('csv', 'height'));
    });

    // Height Mathematica Export - copy height function to clipboard in Mathematica format
    document.getElementById('export-height-mma').addEventListener('click', () => {
        if (!isValid || sim.dimers.length === 0) {
            alert('No valid tiling to export. Create a valid tileable region first.');
            return;
        }

        const heights = computeHeightFunction(sim.dimers);

        // Build Mathematica list format: { {x1,y1,h1}, {x2,y2,h2}, ... }
        const entries = [];
        for (const [key, h] of heights) {
            const [n, j] = key.split(',').map(Number);
            const vertex = getVertex(n, j);
            entries.push(`{${vertex.x.toFixed(6)}, ${vertex.y.toFixed(6)}, ${-h}}`);
        }
        const mma = `{\n${entries.join(',\n')}\n}`;

        // Copy to clipboard
        navigator.clipboard.writeText(mma).then(() => {
            // Brief visual feedback
            const btn = document.getElementById('export-height-mma');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = originalText; }, 1500);
        }).catch(err => {
            alert('Failed to copy to clipboard: ' + err);
        });
    });

    // OBJ Export - stepped surface with thickness in (1,-1,-1) direction
    function generateOBJ(dimers, thickness) {
        const heights = computeHeightFunction(dimers);

        const getVertexKeys = (dimer) => {
            const { bn, bj, t } = dimer;
            if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
        };

        // Original 3D renderer coordinates, scaled to mm
        const scale = 10;
        const to3D = (n, j, h) => ({
            x: h * scale,
            y: (-n - h) * scale,
            z: (j - h) * scale
        });

        // Offset direction (1,-1,-1) normalized * thickness
        const offsetLen = thickness * scale;
        const norm = Math.sqrt(3);
        const offset = { x: offsetLen / norm, y: -offsetLen / norm, z: -offsetLen / norm };

        const vertexMap = new Map();
        const vertices = [];
        let vertexIndex = 1;

        const addVertex = (x, y, z) => {
            const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
            if (!vertexMap.has(key)) {
                vertices.push({ x, y, z });
                vertexMap.set(key, vertexIndex++);
            }
            return vertexMap.get(key);
        };

        const faces = [];

        // Track edges for side walls (boundary detection)
        const edgeData = new Map();
        const normalizeEdgeKey = (n1, j1, n2, j2) => {
            // Sort endpoints to get consistent key regardless of direction
            if (n1 < n2 || (n1 === n2 && j1 < j2)) {
                return `${n1},${j1}-${n2},${j2}`;
            }
            return `${n2},${j2}-${n1},${j1}`;
        };

        const getHeightPattern = (t) => {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        };

        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            const h0 = heights.get(`${verts[0][0]},${verts[0][1]}`);
            if (h0 === undefined) continue;

            // Use locally-consistent heights from vertex 0 + tile pattern
            // to avoid branch-cut distortion around holes
            const pattern = getHeightPattern(dimer.t);
            const baseH = h0 - pattern[0];

            const positions = verts.map(([n, j], i) => to3D(n, j, baseH + pattern[i]));

            const topVerts = positions.map(pos => addVertex(pos.x, pos.y, pos.z));
            const botVerts = positions.map(pos => addVertex(pos.x + offset.x, pos.y + offset.y, pos.z + offset.z));

            // Top face
            faces.push([topVerts[0], topVerts[1], topVerts[2], topVerts[3]]);
            // Bottom face (reversed winding)
            faces.push([botVerts[3], botVerts[2], botVerts[1], botVerts[0]]);

            // Track edges for boundary detection
            for (let i = 0; i < 4; i++) {
                const next = (i + 1) % 4;
                const [n1, j1] = verts[i];
                const [n2, j2] = verts[next];
                const key = normalizeEdgeKey(n1, j1, n2, j2);

                if (!edgeData.has(key)) {
                    edgeData.set(key, { count: 0, topV1: topVerts[i], topV2: topVerts[next],
                                        botV1: botVerts[i], botV2: botVerts[next] });
                }
                edgeData.get(key).count++;
            }
        }

        // Add side walls for boundary edges (edges with count == 1)
        for (const [key, data] of edgeData) {
            if (data.count === 1) {
                // This is a boundary edge - add side wall quad
                faces.push([data.topV1, data.topV2, data.botV2, data.botV1]);
                faces.push([data.botV1, data.botV2, data.topV2, data.topV1]); // double-sided
            }
        }

        let obj = '# Lozenge tiling OBJ\n';
        obj += '# Units: millimeters (mm)\n';
        obj += `# Vertices: ${vertices.length}, Faces: ${faces.length}\n\n`;
        for (const v of vertices) {
            obj += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
        }
        obj += '\n';
        for (const f of faces) {
            obj += `f ${f.join(' ')}\n`;
        }
        return obj;
    }

    document.getElementById('export-obj').addEventListener('click', () => {
        if (!isValid || sim.dimers.length === 0) {
            alert('No valid tiling to export.');
            return;
        }
        const thickness = parseFloat(document.getElementById('obj-thickness').value) || 2;
        const obj = generateOBJ(sim.dimers, thickness);
        const blob = new Blob([obj], { type: 'model/obj' });
        downloadFile(blob, generateExportFilename('obj'));
    });

    // OBJ2 Export - rotated coordinate system where (1,-1,-1) is Z axis, flat bottom
    function generateOBJ2(dimers, thickness) {
        const heights = computeHeightFunction(dimers);

        const getVertexKeys = (dimer) => {
            const { bn, bj, t } = dimer;
            if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
        };

        const scale = 10;
        // Original 3D coordinates
        const to3Doriginal = (n, j, h) => ({
            x: h * scale,
            y: (-n - h) * scale,
            z: (j - h) * scale
        });

        // Rotation: (1,-1,-1) becomes Z axis
        const sqrt2 = Math.sqrt(2);
        const sqrt3 = Math.sqrt(3);
        const sqrt6 = Math.sqrt(6);
        const rotate = (p) => ({
            x: (p.x + p.y) / sqrt2,
            y: (p.x - p.y + 2 * p.z) / sqrt6,
            z: (p.x - p.y - p.z) / sqrt3
        });

        const to3D = (n, j, h) => rotate(to3Doriginal(n, j, h));

        // First pass: find minimum Z of top surface
        let minZ = Infinity;
        for (const [key, h] of heights) {
            const [n, j] = key.split(',').map(Number);
            const pos = to3D(n, j, h);
            minZ = Math.min(minZ, pos.z);
        }
        // Flat bottom at minZ - thickness
        const bottomZ = minZ - thickness * scale;

        const vertexMap = new Map();
        const vertices = [];
        let vertexIndex = 1;

        const addVertex = (x, y, z) => {
            const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
            if (!vertexMap.has(key)) {
                vertices.push({ x, y, z });
                vertexMap.set(key, vertexIndex++);
            }
            return vertexMap.get(key);
        };

        const faces = [];

        const edgeData = new Map();
        const normalizeEdgeKey = (n1, j1, n2, j2) => {
            if (n1 < n2 || (n1 === n2 && j1 < j2)) {
                return `${n1},${j1}-${n2},${j2}`;
            }
            return `${n2},${j2}-${n1},${j1}`;
        };

        const getHeightPattern = (t) => {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        };

        for (const dimer of dimers) {
            const verts = getVertexKeys(dimer);
            const h0 = heights.get(`${verts[0][0]},${verts[0][1]}`);
            if (h0 === undefined) continue;

            // Use locally-consistent heights from vertex 0 + tile pattern
            // to avoid branch-cut distortion around holes
            const pattern = getHeightPattern(dimer.t);
            const baseH = h0 - pattern[0];

            const positions = verts.map(([n, j], i) => to3D(n, j, baseH + pattern[i]));

            const topVerts = positions.map(pos => addVertex(pos.x, pos.y, pos.z));
            const botVerts = positions.map(pos => addVertex(pos.x, pos.y, bottomZ));

            faces.push([topVerts[0], topVerts[1], topVerts[2], topVerts[3]]);
            faces.push([botVerts[3], botVerts[2], botVerts[1], botVerts[0]]);

            for (let i = 0; i < 4; i++) {
                const next = (i + 1) % 4;
                const [n1, j1] = verts[i];
                const [n2, j2] = verts[next];
                const key = normalizeEdgeKey(n1, j1, n2, j2);

                if (!edgeData.has(key)) {
                    edgeData.set(key, { count: 0, topV1: topVerts[i], topV2: topVerts[next],
                                        botV1: botVerts[i], botV2: botVerts[next] });
                }
                edgeData.get(key).count++;
            }
        }

        for (const [key, data] of edgeData) {
            if (data.count === 1) {
                faces.push([data.topV1, data.topV2, data.botV2, data.botV1]);
                faces.push([data.botV1, data.botV2, data.topV2, data.topV1]);
            }
        }

        let obj = '# Lozenge tiling OBJ2 (rotated: Z = (1,-1,-1) direction)\n';
        obj += '# Units: millimeters (mm)\n';
        obj += `# Vertices: ${vertices.length}, Faces: ${faces.length}\n\n`;
        for (const v of vertices) {
            obj += `v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}\n`;
        }
        obj += '\n';
        for (const f of faces) {
            obj += `f ${f.join(' ')}\n`;
        }
        return obj;
    }

    document.getElementById('export-obj2').addEventListener('click', () => {
        if (!isValid || sim.dimers.length === 0) {
            alert('No valid tiling to export.');
            return;
        }
        const thickness = parseFloat(document.getElementById('obj-thickness').value) || 2;
        const obj = generateOBJ2(sim.dimers, thickness);
        const blob = new Blob([obj], { type: 'model/obj' });
        downloadFile(blob, generateExportFilename('obj'));
    });

    // JSON Import - load shape from file
    document.getElementById('import-json').addEventListener('click', () => {
        document.getElementById('import-json-file').click();
    });

    document.getElementById('import-json-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.triangles || !Array.isArray(data.triangles)) {
                    alert('Invalid shape file: missing triangles array');
                    return;
                }

                saveState();
                activeTriangles.clear();

                for (const tri of data.triangles) {
                    if (tri.n !== undefined && tri.j !== undefined && tri.type !== undefined) {
                        const key = `${tri.n},${tri.j},${tri.type}`;
                        activeTriangles.set(key, { n: tri.n, j: tri.j, type: tri.type });
                    }
                }

                reinitialize();
                renderer.fitToRegion(activeTriangles);
                draw();
            } catch (err) {
                alert('Failed to parse shape file: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    });

    // ========================================================================
    // URL State Serialization (Share Link)
    // ========================================================================

    // URL-safe base64 encoding/decoding
    function toUrlSafeBase64(str) {
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function fromUrlSafeBase64(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return atob(str);
    }

    function serializeStateToUrl() {
        const params = new URLSearchParams();

        // Encode triangles as compact format: n1,j1,t1;n2,j2,t2;...
        const triangles = Array.from(activeTriangles.values());
        if (triangles.length > 0) {
            const triStr = triangles.map(t => `${t.n},${t.j},${t.type}`).join(';');
            params.set('t', toUrlSafeBase64(triStr));
        }

        // Add settings (only if non-default)
        if (renderer.currentPaletteIndex !== 0) params.set('p', renderer.currentPaletteIndex);
        if (Math.abs(renderer.zoom - 1.0) > 0.01) params.set('z', Math.round(renderer.zoom * 100));
        if (!renderer.showGrid) params.set('g', '0');

        return window.location.origin + window.location.pathname + '?' + params.toString();
    }

    function loadStateFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('t')) return false;

        try {
            // Decode triangles
            const triStr = fromUrlSafeBase64(params.get('t'));
            const triParts = triStr.split(';');

            activeTriangles.clear();
            let loadedCount = 0;
            for (const part of triParts) {
                const [n, j, typeStr] = part.split(',');
                const nNum = parseInt(n), jNum = parseInt(j), type = parseInt(typeStr);
                if (!isNaN(nNum) && !isNaN(jNum) && (type === 1 || type === 2)) {
                    const key = `${nNum},${jNum},${type}`;
                    activeTriangles.set(key, { n: nNum, j: jNum, type });
                    loadedCount++;
                }
            }
            console.log('Loaded', loadedCount, 'triangles from URL');

            // Apply settings
            if (params.has('p')) {
                const idx = parseInt(params.get('p'));
                if (idx >= 0 && idx < renderer.colorPalettes.length) {
                    renderer.setPalette(idx);
                    el.paletteSelect.value = idx;
                }
            }
            if (params.has('z')) {
                renderer.zoom = parseInt(params.get('z')) / 100;
            }
            if (params.has('g')) {
                renderer.showGrid = params.get('g') !== '0';
                document.getElementById('showGridCheckbox').checked = renderer.showGrid;
            }

            return activeTriangles.size > 0;
        } catch (err) {
            console.error('Failed to load state from URL:', err);
            return false;
        }
    }

    function copyShareLink() {
        const url = serializeStateToUrl();
        const linkCopied = document.getElementById('link-copied');
        navigator.clipboard.writeText(url).then(() => {
            linkCopied.style.display = 'inline';
            setTimeout(() => linkCopied.style.display = 'none', 2000);
        }).catch(err => {
            console.error('Failed to copy link:', err);
            // Fallback: select text in a temporary input
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            linkCopied.style.display = 'inline';
            setTimeout(() => linkCopied.style.display = 'none', 2000);
        });
    }

    document.getElementById('copy-link-btn').addEventListener('click', copyShareLink);

    // ========================================================================
    // Mobile Drawer Toggle
    // ========================================================================
    const controlsPanel = document.getElementById('controlsPanel');
    const drawerHandle = document.getElementById('drawerHandle');
    if (controlsPanel && drawerHandle) {
        drawerHandle.addEventListener('click', () => {
            controlsPanel.classList.toggle('expanded');
        });

        // Touch swipe support for drawer
        let touchStartY = 0;
        let touchStartExpanded = false;
        drawerHandle.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartExpanded = controlsPanel.classList.contains('expanded');
        }, { passive: true });
        drawerHandle.addEventListener('touchmove', (e) => {
            const deltaY = touchStartY - e.touches[0].clientY;
            if (deltaY > 30 && !touchStartExpanded) {
                controlsPanel.classList.add('expanded');
            } else if (deltaY < -30 && touchStartExpanded) {
                controlsPanel.classList.remove('expanded');
            }
        }, { passive: true });
    }

    // ========================================================================
    // Floating Action Button (FAB) for Mobile
    // ========================================================================
    const sampleFab = document.getElementById('sampleFab');
    const hexagonFab = document.getElementById('hexagonFab');
    const scaleUpFab = document.getElementById('scaleUpFab');

    if (sampleFab) {
        sampleFab.addEventListener('click', () => {
            // If Glauber is running, stop it
            if (running) {
                el.startStopBtn.click();
                return;
            }
            // Otherwise, trigger CFTP
            if (!el.cftpBtn.disabled) {
                el.cftpBtn.click();
            }
        });
    }

    if (hexagonFab) {
        hexagonFab.addEventListener('click', () => {
            // Trigger the hexagon button
            if (el.hexagonBtn) {
                el.hexagonBtn.click();
            }
        });
    }

    if (scaleUpFab) {
        scaleUpFab.addEventListener('click', () => {
            // Trigger scale up (double mesh)
            const doubleMeshBtn = document.getElementById('doubleMeshBtn');
            if (doubleMeshBtn && !doubleMeshBtn.disabled) {
                doubleMeshBtn.click();
                draw(); // Ensure full redraw after scale up
            }
        });
    }

    // Update FAB states based on simulation state
    function updateFabState() {
        if (sampleFab) {
            sampleFab.disabled = !isValid || !sim;
            if (running) {
                sampleFab.innerHTML = '⏸';
            } else {
                sampleFab.innerHTML = '🎲';
            }
        }
        if (scaleUpFab) {
            // Enable scale up only when we have a valid region
            scaleUpFab.disabled = !isValid || activeTriangles.size === 0;
        }
    }

    // Hook into existing update functions
    const originalUpdateUI = updateUI;
    updateUI = function() {
        originalUpdateUI();
        updateFabState();
    };

    // ========================================================================
    // Palette Picker Grid
    // ========================================================================
    function initPalettePickerGrid() {
        const grid = document.getElementById('palettePickerGrid');
        if (!grid || typeof LOZENGE_PALETTES === 'undefined') return;

        grid.innerHTML = '';
        LOZENGE_PALETTES.forEach((palette, idx) => {
            const item = document.createElement('div');
            item.className = 'palette-item' + (idx === renderer.currentPaletteIndex ? ' active' : '');
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', idx === renderer.currentPaletteIndex);
            item.title = palette.name;
            item.dataset.index = idx;

            // Create 3 color swatches
            for (let i = 0; i < 3; i++) {
                const swatch = document.createElement('div');
                swatch.className = 'swatch';
                swatch.style.backgroundColor = palette.colors[i];
                item.appendChild(swatch);
            }

            item.addEventListener('click', () => {
                renderer.setPalette(idx);
                if (renderer3D) {
                    renderer3D.setPalette(idx);
                }
                el.paletteSelect.value = idx;
                // Update active state
                grid.querySelectorAll('.palette-item').forEach(p => {
                    p.classList.remove('active');
                    p.setAttribute('aria-selected', 'false');
                });
                item.classList.add('active');
                item.setAttribute('aria-selected', 'true');
                draw();
            });

            grid.appendChild(item);
        });
    }

    // ========================================================================
    // Keyboard Shortcuts
    // ========================================================================
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        const key = e.key.toLowerCase();

        // ? - show help modal
        if (key === '?') {
            e.preventDefault();
            const modal = document.getElementById('keyboardHelpModal');
            if (modal) modal.classList.add('visible');
            return;
        }

        // H - Toggle hole labels
        if (key === 'h' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const checkbox = document.getElementById('showHoleLabelsCheckbox');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
            return;
        }

        // L - Cycle render mode (3D)
        if (key === 'l' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (is3DView && renderer3D) {
                const modes = ['standard', 'lego', 'minecraft'];
                const cur = renderer3D.renderMode;
                renderer3D.renderMode = modes[(modes.indexOf(cur) + 1) % 3];
                renderer3D._legoMergedEdges = null;
                if (isValid && sim.dimers.length > 0) {
                    renderer3D.renderDimers(sim.dimers, sim.boundaries);
                }
            }
            return;
        }

        // M - Make tileable
        if (key === 'm' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (!el.repairBtn.disabled) {
                el.repairBtn.click();
            }
            return;
        }

        // F - Toggle fullscreen
        if (key === 'f' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('fullscreenBtn').click();
            return;
        }

        // Escape - close modal or exit fullscreen
        if (key === 'escape') {
            const container = document.getElementById('canvas-container');
            if (container.classList.contains('fullscreen-mode')) {
                setFullscreen(false);
                return;
            }
            const modal = document.getElementById('keyboardHelpModal');
            if (modal && modal.classList.contains('visible')) {
                modal.classList.remove('visible');
            }
            return;
        }

        // S - Perfect Sample (CFTP)
        if (key === 's' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (!el.cftpBtn.disabled) {
                el.cftpBtn.click();
            }
            return;
        }

        // G - Start/Stop Glauber
        if (key === 'g') {
            e.preventDefault();
            if (!el.startStopBtn.disabled) {
                el.startStopBtn.click();
            }
            return;
        }

        // Space - Pause/Resume Glauber
        if (key === ' ') {
            e.preventDefault();
            if (running) {
                el.startStopBtn.click();
            }
            return;
        }

        // 3 - Toggle 3D view
        if (key === '3') {
            e.preventDefault();
            el.toggle3DBtn.click();
            return;
        }

        // R - Reset view
        if (key === 'r' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('resetViewBtn').click();
            return;
        }

        // U - Scale Up region (2×)
        if (key === 'u' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const btn = document.getElementById('doubleMeshBtn');
            if (btn && !btn.disabled) {
                btn.click();
            }
            return;
        }

        // +/= - Zoom in (only without Cmd/Ctrl to allow browser zoom)
        if ((key === '+' || key === '=') && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            document.getElementById('zoomInBtn').click();
            return;
        }

        // - - Zoom out (only without Cmd/Ctrl to allow browser zoom)
        if (key === '-' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            document.getElementById('zoomOutBtn').click();
            return;
        }

        // C - Next palette, Shift+C - Previous palette
        if (key === 'c' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
                document.getElementById('prev-palette').click();
            } else {
                document.getElementById('next-palette').click();
            }
            initPalettePickerGrid();
            return;
        }

        // P - Permute colors
        if (key === 'p' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            el.permuteColors.click();
            return;
        }

        // Arrow Left - Previous palette
        if (key === 'arrowleft' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('prev-palette').click();
            initPalettePickerGrid(); // Update grid selection
            return;
        }

        // Arrow Right - Next palette
        if (key === 'arrowright' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('next-palette').click();
            initPalettePickerGrid(); // Update grid selection
            return;
        }

        // Z - Undo (without Ctrl, for simplicity; Ctrl+Z also works via existing handler)
        if (key === 'z' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            el.undoBtn.click();
            return;
        }

        // Y - Redo
        if (key === 'y' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            el.redoBtn.click();
            return;
        }
    });

    // Initialize - debounced resize handler to avoid interfering with sampling
    let resizeTimeout = null;
    window.addEventListener('resize', () => {
        // Skip resize during CFTP to avoid corrupting state
        if (el.cftpBtn.disabled && el.cftpStopBtn.style.display !== 'none') {
            return;
        }
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            renderer.setupCanvas();
            draw();
        }, 100);
    });

    initPaletteSelector();
    initPalettePickerGrid();

    // Load state from URL if present
    if (loadStateFromUrl()) {
        reinitialize();
        renderer.fitToRegion(activeTriangles);
    }

    updateUI();
    draw();

    // Re-setup canvas after layout settles (handles CSS loading delay)
    setTimeout(() => {
        renderer.setupCanvas();
        if (activeTriangles.size > 0) {
            renderer.fitToRegion(activeTriangles);
        }
        draw();
    }, 100);

    console.log('Ultimate Lozenge Tiling ready (WASM with Dinic\'s Algorithm) - ' + (window.LOZENGE_THREADED ? 'THREADED' : 'single-threaded'));
}

// Handle both fresh loads and bfcache restoration (iOS Firefox/Safari)
if (typeof Module !== 'undefined' && Module.calledRun) {
    console.log('Module already initialized, running init directly');
    initLozengeApp();
} else {
    Module.onRuntimeInitialized = initLozengeApp;
}

// Handle iOS bfcache restoration - force reload to ensure clean state
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('Page restored from bfcache, reloading...');
        location.reload();
    }
});
</script>
