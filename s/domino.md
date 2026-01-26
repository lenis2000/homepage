---
title: Domino tilings of the Aztec diamond
author: 'Leonid Petrov'
layout: default
permalink: /domino/
---


<style>
  /* Height function label styling for better readability */
  .height-label {
    fill: #000;
    stroke: #fff;
    stroke-width: 0.3px;          /* outline thickness – tweak at will */
    paint-order: stroke fill;   /* draw stroke first, then fill      */
    stroke-linejoin: round;     /* smooth outline corners            */
    font-family: sans-serif;
  }

  /* Layout for the visualization panes */
  .visualization-container {
    width: 100%;
    position: relative;
  }

  .viz-pane {
    width: 100%;
    margin-bottom: 15px;
  }

  /* Canvas styling */
  #aztec-canvas, #aztec-2d-canvas {
    width: 100%;
    height: 75vh; /* Use 75% of viewport height - slightly larger in vertical direction */
    vertical-align: top;
  }


  #aztec-svg-2d {
    touch-action: none; /* Prevent browser defaults on touch */
  }

  #aztec-2d-canvas {
    background-color: #f8f8f8;
    border: 1px solid #ddd;
    display: flex;
    justify-content: center;
    align-items: center;
    display: none; /* Hidden by default */
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

  .display-options {
    display: flex;
    align-items: center;
    padding: 8px;
    background-color: #f5f5f5;
    border-radius: 4px;
    margin-bottom: 15px;
  }

  .display-options label {
    margin-left: 5px;
    cursor: pointer;
    user-select: none;
  }

  .display-options input[type="checkbox"] {
    cursor: pointer;
  }

  @media (max-width: 768px) {
    #aztec-canvas, #aztec-2d-canvas {
      height: 65vh;
    }
  }

  @media (max-width: 600px) {
    #aztec-canvas, #aztec-2d-canvas {
      height: 60vh;
    }
  }

  /* Dark theme styles for UI labels */
  [data-theme="dark"] #display-options-2d label,
  [data-theme="dark"] #controls-2d label,
  [data-theme="dark"] #controls label,
  [data-theme="dark"] #camera-controls label,
  [data-theme="dark"] .parameters-section label,
  [data-theme="dark"] #weights-2x2 label,
  [data-theme="dark"] #weights-3x3 label,
  [data-theme="dark"] #glauber-controls label {
    color: #bbb;
  }

  [data-theme="dark"] #display-options-2d small,
  [data-theme="dark"] #controls-2d small,
  [data-theme="dark"] #glauber-controls small {
    color: #999;
  }

  /* Dark theme styles for custom colors panel */
  [data-theme="dark"] #styling-controls label,
  [data-theme="dark"] .custom-colors-panel label {
    color: #bbb;
  }

  [data-theme="dark"] .custom-colors-panel {
    background-color: #2d2d2d !important;
    border-color: #444 !important;
  }

  [data-theme="dark"] .custom-colors-panel h4 {
    color: #ddd !important;
  }

  [data-theme="dark"] .custom-colors-panel input[type="text"] {
    background-color: #3a3a3a !important;
    border-color: #555 !important;
    color: #ddd !important;
  }

  [data-theme="dark"] .custom-colors-panel input[type="text"]:focus {
    border-color: #007bff !important;
  }

  [data-theme="dark"] .custom-colors-panel button {
    background-color: #3a3a3a !important;
    border-color: #555 !important;
    color: #ddd !important;
  }

  [data-theme="dark"] .custom-colors-panel button:hover {
    background-color: #4a4a4a !important;
    border-color: #666 !important;
  }

  [data-theme="dark"] #reset-default-colors {
    background-color: #28a745 !important;
    color: white !important;
  }

  [data-theme="dark"] #reset-default-colors:hover {
    background-color: #218838 !important;
  }

  [data-theme="dark"] #close-custom-colors {
    background-color: #6c757d !important;
    color: white !important;
  }

  [data-theme="dark"] #close-custom-colors:hover {
    background-color: #5a6268 !important;
  }

  [data-theme="dark"] .custom-colors-panel h5 {
    color: #bbb !important;
  }

  [data-theme="dark"] .custom-colors-panel select {
    background-color: #3a3a3a !important;
    border-color: #555 !important;
    color: #ddd !important;
  }

  [data-theme="dark"] .custom-colors-panel select:focus {
    border-color: #007bff !important;
  }

  /* Styling for buttons and controls */
  #sample-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background-color: #cccccc;
  }

  #glauber-btn.running {
    background-color: #dc3545; /* Red when running */
    border-color: #dc3545;
  }

  button {
    cursor: pointer;
  }

  .pane-title {
    font-weight: bold;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #eee;
  }

  #move-left-btn, #move-up-btn, #move-down-btn, #move-right-btn, #reset-view-btn {
    transition: background-color 0.2s;
  }

  #move-left-btn:hover, #move-up-btn:hover, #move-down-btn:hover, #move-right-btn:hover, #reset-view-btn:hover {
    background-color: #e0e0e0;
  }

  .parameters-section {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 5px;
    margin-bottom: 15px;
  }

  /* Custom colors panel styling */
  .custom-colors-panel {
    background-color: #f8f9fa;
    border-color: #ccc;
  }

  .custom-colors-panel h4 {
    color: #333;
  }

  .custom-colors-panel label {
    color: #333;
  }

  .custom-colors-panel input[type="text"] {
    background-color: white;
    border: 1px solid #ccc;
    color: #333;
  }

  .custom-colors-panel input[type="text"]:focus {
    border-color: #007bff;
    outline: none;
  }

  .custom-colors-panel button {
    background-color: #f8f9fa;
    border: 1px solid #ccc;
    color: #333;
  }

  .custom-colors-panel button:hover {
    background-color: #e9ecef;
    border-color: #999;
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
      flex-direction: row;
      align-items: flex-start;
    }
  }

  .controls-panel {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  @media (min-width: 992px) {
    .controls-panel {
      width: 340px;
      min-width: 300px;
      max-width: 400px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      position: sticky;
      top: 80px;
      padding-right: 8px;
    }
    .controls-panel::-webkit-scrollbar {
      width: 6px;
    }
    .controls-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .controls-panel::-webkit-scrollbar-thumb {
      background: var(--border-color, #dadada);
      border-radius: 3px;
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
    .visualization-panel {
      max-width: calc(100% - 360px);
    }
    .visualization-panel #aztec-canvas,
    .visualization-panel #aztec-2d-canvas {
      height: 70vh;
      max-height: 800px;
    }
  }

  /* ========================================================================
     Phase 2: Collapsible Accordion Sections
     ======================================================================== */
  details.control-section {
    display: block;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--bg-secondary, #f5f5f5);
  }

  div.control-section {
    display: block;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    background: var(--bg-secondary, #f5f5f5);
  }

  .control-section summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-primary, #333);
    cursor: pointer;
    user-select: none;
    list-style: none;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
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
    background: rgba(0, 123, 255, 0.08);
  }

  .control-section-content {
    padding: 12px 14px;
    border-top: 1px solid var(--border-color, #e0e0e0);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .control-section .control-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
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
    background: rgba(0, 123, 255, 0.1);
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
    width: 50%;
    height: 50%;
  }

  [data-theme="dark"] .palette-item {
    border-color: #555;
  }

  [data-theme="dark"] .palette-item.active {
    border-color: var(--accent-color, #ff9933);
  }

  /* ========================================================================
     Phase 3: Floating Action Button (Mobile)
     ======================================================================== */
  .sample-fab {
    display: none;
    position: fixed;
    bottom: 80px;
    right: 16px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E57200, #f08c30);
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(229, 114, 0, 0.4);
    z-index: 1000;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .sample-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(229, 114, 0, 0.5);
  }

  /* FAB Tooltip - only on devices that support hover (not touch) */
  @media (hover: hover) {
    .sample-fab::before {
      content: attr(data-tooltip);
      position: absolute;
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      margin-right: 12px;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 13px;
      white-space: nowrap;
      border-radius: 4px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      pointer-events: none;
    }

    .sample-fab:hover::before {
      opacity: 1;
      visibility: visible;
    }
  }

  .sample-fab:active {
    transform: scale(0.95);
  }

  .sample-fab:disabled {
    background: #999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    cursor: not-allowed;
  }

  @media (max-width: 991px) {
    .sample-fab {
      display: flex;
      align-items: center;
      justify-content: center;
    }
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

    .visualization-panel #aztec-canvas,
    .visualization-panel #aztec-2d-canvas {
      height: 50vh;
      max-height: 500px;
    }
  }

  @media (min-width: 992px) {
    .drawer-handle {
      display: none;
    }
    .controls-panel-inner {
      display: contents;
    }
  }

  /* ========================================================================
     Phase 3 & 6: Button Styling Consistency
     ======================================================================== */
  .btn-action {
    background: #007bff !important;
    color: white !important;
    border-color: #007bff !important;
    font-weight: 500;
  }

  .btn-action:hover {
    background: #0056b3 !important;
    border-color: #0056b3 !important;
  }

  .btn-action:disabled {
    background: #80bdff !important;
    border-color: #80bdff !important;
  }

  .btn-secondary-action {
    background: linear-gradient(135deg, #28a745, #218838) !important;
    color: white !important;
    border-color: #28a745 !important;
    font-weight: 500;
  }

  .btn-secondary-action:hover {
    background: linear-gradient(135deg, #218838, #1e7e34) !important;
  }

  .btn-secondary-action:disabled {
    background: #8fbc8f !important;
    border-color: #8fbc8f !important;
  }

  .btn-utility {
    background: var(--bg-primary, white) !important;
    color: var(--text-primary, #333) !important;
    border: 1px solid var(--border-color, #d0d0d0) !important;
  }

  .btn-utility:hover {
    background: var(--bg-secondary, #f5f5f5) !important;
    border-color: #999 !important;
  }

  /* ========================================================================
     Phase 5: Export Section Grouping
     ======================================================================== */
  .export-group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    flex-wrap: wrap;
  }

  .export-group-label {
    font-size: 11px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    min-width: 50px;
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

  /* View toggle overlay for visualization panel */
  .view-overlay {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .view-toggle-pills {
    display: inline-flex;
    border: 2px solid #007bff;
    border-radius: 6px;
    overflow: hidden;
  }

  .view-toggle-pills button {
    border: none;
    border-radius: 0;
    height: 28px;
    padding: 0 12px;
    font-weight: 500;
    background: white;
    color: #007bff;
    cursor: pointer;
    font-size: 12px;
  }

  .view-toggle-pills button.active {
    background: #007bff;
    color: white;
  }

  .view-toggle-pills button:hover:not(.active) {
    background: #e7f3ff;
  }

  [data-theme="dark"] .view-toggle-pills {
    border-color: #4dabf7;
  }

  [data-theme="dark"] .view-toggle-pills button {
    background: #2d2d2d;
    color: #4dabf7;
  }

  [data-theme="dark"] .view-toggle-pills button.active {
    background: #4dabf7;
    color: #1a1a1a;
  }

  [data-theme="dark"] .view-toggle-pills button:hover:not(.active) {
    background: #3d3d3d;
  }

  /* Help button */
  #help-btn:hover {
    border-color: #E57200;
    color: #E57200;
  }

  [data-theme="dark"] #help-btn {
    background: #2d2d2d;
    color: #aaa;
    border-color: #555;
  }

  [data-theme="dark"] #help-btn:hover {
    border-color: #ff9933;
    color: #ff9933;
  }

  /* Keyboard Shortcuts Help Modal */
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
</style>

<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="{{site.url}}/js/colorschemes.js"></script>
<script src="{{site.url}}/s/domino.js"></script>

<div class="accordion" id="infoAccordion">
  <div class="card">
    <div class="card-header" id="infoHeading">
      <h5 class="mb-0">
        <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#infoCollapse" aria-expanded="false" aria-controls="infoCollapse">
          <strong>About</strong> <i class="fa fa-chevron-down"></i>
        </button>
      </h5>
    </div>

    <div id="infoCollapse" class="collapse" aria-labelledby="infoHeading" data-parent="#infoAccordion">
      <div class="card-body">
        <p class="mt-3">This page hosts an <strong>all‑in‑one interactive sampler of random domino tilings of the <a href="https://en.wikipedia.org/wiki/Aztec_diamond">Aztec diamond</a></strong>. The sampling is done by the traditional <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>, and here it is adapted to <code>JavaScript</code> and <code>WebAssembly</code>.
        See also the <a href="{{site.url}}/simulations/model/domino-tilings/">individual simulations page</a> which include bite-size examples with more readable code.
        </p>

        <p>Two complementary visualizations are available:</p>

        <ul>
          <li><strong>3‑D height‑function view</strong> – A rendering of the stepped surface encoding the domino tiling. The 3-D visualization is inspired by <a href="https://math.mit.edu/~borodin/aztec.html">Alexei and Matvey Borodin's work</a> while being rewritten here in modern <code>WebGL/Three.js</code>, and with interactive sampling by shuffling. Large sizes ($n > 100$) may take a while; everything is computed client‑side, so be patient on slower machines.</li>

          <li><strong>2‑D SVG view</strong> – A faster 2-D drawing that adds several friedly overlays:
            <ul>
              <li>checkerboard coloring of the underlying grid</li>
              <li>grayscale shading for distinguishing domino orientations (handy for the gas phase of the $2 \times 2$ periodic model)</li>
              <li>non‑intersecting Motzkin (or Scrhoeder) paths</li>
              <li>dimers inscribed into dominos</li>
              <li>integer‑valued height function labels (shown only for orders $n \leq 30$ to avoid clutter).</li>
            </ul>
          </li>

          <li><strong>Glauber dynamics</strong> – Markov process of flipping pairs of adjacent dominoes forming a square. It uses
          the currently selected parameters - so you can sample a tiling with one set of parameters, and evolve it into another.
          See what happens!
          </li>
        </ul>

        <p>There is also an on‑the‑fly <strong>LaTeX/TikZ export</strong>, which supports all 2-D viewmodes.</p>

        <p>Use the controls below to switch between uniform, \(2 \times 2\), and \(3 \times 3\) periodic weightings, adjust border thickness, zoom/pan, and copy or download the generated TikZ code.</p>

        <p><strong>Tip.</strong> The simulation caches the most recent tiling in <code>localStorage</code>; press <strong>Sample</strong> again to force a fresh run.</p>



        <p class="mb-3"><i style="color:#999999;">Last updated: 2025-04-21</i></p>

  {%include dear_colleagues.md%}

<br><br>
      </div>
    </div>
  </div>
</div>

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

    <!-- Section 1: Region & Sampling (open by default) -->
    <details class="control-section" open>
      <summary>Region & Sampling</summary>
      <div class="control-section-content">
        <div class="control-row">
          <label for="n-input">Aztec Diamond Order:</label>
          <input id="n-input" type="number" value="12" min="2" step="2" max="300" size="3" class="mobile-input" style="width: 70px;">
        </div>
        <div class="control-row">
          <button id="sample-btn" class="btn-action">Sample</button>
          <button id="cancel-btn" style="display: none; background-color: #dc3545; color: white; border-color: #dc3545;">Cancel</button>
          <span id="progress-indicator" style="font-size: 12px; color: #666;"></span>
        </div>
        <div class="control-row">
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 13px;">
            <input type="checkbox" id="show-colors-checkbox" checked>
            Show colors
          </label>
        </div>
        <div class="control-row">
          <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 13px;">
            <input type="checkbox" id="height-gradient-checkbox" checked>
            Height gradient (3D)
          </label>
        </div>
      </div>
    </details>

    <!-- Section 2: Periodicity (open by default) -->
    <details class="control-section" open>
      <summary>Periodicity</summary>
      <div class="control-section-content">
        <div class="control-row" style="flex-direction: column; align-items: flex-start; gap: 6px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
            <input type="radio" id="uniform-radio" name="periodicity" value="uniform" checked>
            Uniform
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
            <input type="radio" id="2x2-radio" name="periodicity" value="2x2">
            2×2 Periodic
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
            <input type="radio" id="3x3-radio" name="periodicity" value="3x3">
            3×3 Periodic
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
            <input type="radio" id="6x2-radio" name="periodicity" value="6x2">
            6×2 Periodic
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
            <input type="radio" id="frozenH-radio" name="periodicity" value="frozenH">
            Frozen – all horizontal
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px;">
            <input type="radio" id="frozenV-radio" name="periodicity" value="frozenV">
            Frozen – all vertical
          </label>
        </div>

        <!-- 2×2 Periodic Weights -->
        <div id="weights-2x2" style="display: none; padding-top: 10px; border-top: 1px solid var(--border-color, #e0e0e0); margin-top: 8px;">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">2×2 Weights</div>
          <div class="control-row">
            <label style="font-size: 12px;">a:</label>
            <input id="a-input" type="number" value="0.5" step="0.1" min="0.1" max="10" style="width: 55px;">
            <label style="font-size: 12px; margin-left: 10px;">b:</label>
            <input id="b-input" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 55px;">
          </div>
        </div>

        <!-- 3×3 Periodic Weights -->
        <div id="weights-3x3" style="display: none; padding-top: 10px; border-top: 1px solid var(--border-color, #e0e0e0); margin-top: 8px;">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">3×3 Weights</div>
          <div style="display: grid; grid-template-columns: repeat(3, 55px); gap: 4px;">
            <input id="w1" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
            <input id="w2" type="number" value="4.0" step="0.1" min="0.1" max="10" style="width: 50px;">
            <input id="w3" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
            <input id="w4" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
            <input id="w5" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
            <input id="w6" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
            <input id="w7" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
            <input id="w8" type="number" value="1.0" step="0.1" min="0.1" max="10" style="width: 50px;">
            <input id="w9" type="number" value="9.0" step="0.1" min="0.1" max="10" style="width: 50px;">
          </div>
        </div>

        <!-- 6×2 Periodic Weights -->
        <div id="weights-6x2" style="display: none; padding-top: 10px; border-top: 1px solid var(--border-color, #e0e0e0); margin-top: 8px;">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">6×2 Weights</div>
          <div style="display: grid; grid-template-columns: repeat(6, 45px); gap: 3px;">
            <input id="w6x2_1" type="number" value="1.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_2" type="number" value="20.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_3" type="number" value="1.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_4" type="number" value="30.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_5" type="number" value="1.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_6" type="number" value="0.1" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_7" type="number" value="5.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_8" type="number" value="1.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_9" type="number" value="0.1" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_10" type="number" value="1.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_11" type="number" value="30.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
            <input id="w6x2_12" type="number" value="30.0" step="0.1" min="0.1" max="100" style="width: 42px; font-size: 11px;">
          </div>
        </div>
      </div>
    </details>

    <!-- Section 3: Glauber Dynamics (collapsed by default) -->
    <details class="control-section">
      <summary>Glauber Dynamics</summary>
      <div class="control-section-content">
        <div class="control-row">
          <label for="sweeps-input" style="font-size: 12px;">Sweeps per redraw:</label>
          <input id="sweeps-input" type="number" value="20000" min="1" step="1" style="width: 70px;">
        </div>
        <div class="control-row">
          <button id="glauber-btn" class="btn-secondary-action">Run Glauber</button>
          <span id="glauber-status" style="font-size: 12px; font-style: italic; color: #666;"></span>
        </div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">
          Plaquette updates between screen refreshes
        </div>
      </div>
    </details>

    <!-- Section 4: Styling (collapsed by default) -->
    <details class="control-section">
      <summary>Styling</summary>
      <div class="control-section-content">
        <!-- Palette Selector -->
        <div class="control-row">
          <button id="prevPaletteBtn" class="btn-utility" style="padding: 0 10px;" aria-label="Previous color palette">◀</button>
          <select id="palette-selector" style="flex: 1; min-width: 120px;" aria-label="Select color palette"></select>
          <button id="nextPaletteBtn" class="btn-utility" style="padding: 0 10px;" aria-label="Next color palette">▶</button>
          <button id="permuteColorsBtn" class="btn-utility" title="Permute colors" aria-label="Permute color order">Permute</button>
        </div>

        <!-- Visual Palette Picker Grid -->
        <div id="palettePickerGrid" class="palette-picker" role="listbox" aria-label="Color palette visual selection"></div>

        <div class="control-row" style="border-top: 1px solid var(--border-color, #e0e0e0); padding-top: 10px; margin-top: 4px;">
          <label for="border-width-input" style="font-size: 12px; color: #555;">Border:</label>
          <input type="number" id="border-width-input" value="0.1" min="0" max="1" step="0.05" class="param-input" style="width: 50px;" aria-label="Border width">
          <button id="custom-colors-btn" class="btn-utility" style="margin-left: auto;">Custom Colors</button>
        </div>

        <!-- Custom Colors Panel (initially hidden) -->
        <div id="custom-colors-panel" class="custom-colors-panel" style="display: none; padding: 10px; margin-top: 8px; border-radius: 4px; border: 1px solid var(--border-color, #ccc);">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 10px;">Custom Domino Colors</div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <label for="color-blue" style="font-size: 11px; width: 70px;">Horizontal 1:</label>
              <input type="color" id="color-blue" value="#4363d8" style="width: 32px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
              <input type="text" id="hex-blue" value="#4363d8" style="width: 70px; height: 22px; font-family: monospace; font-size: 11px; text-align: center; border: 1px solid var(--border-color, #ccc); border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label for="color-green" style="font-size: 11px; width: 70px;">Horizontal 2:</label>
              <input type="color" id="color-green" value="#1e8c28" style="width: 32px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
              <input type="text" id="hex-green" value="#1e8c28" style="width: 70px; height: 22px; font-family: monospace; font-size: 11px; text-align: center; border: 1px solid var(--border-color, #ccc); border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label for="color-red" style="font-size: 11px; width: 70px;">Vertical 1:</label>
              <input type="color" id="color-red" value="#ff2244" style="width: 32px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
              <input type="text" id="hex-red" value="#ff2244" style="width: 70px; height: 22px; font-family: monospace; font-size: 11px; text-align: center; border: 1px solid var(--border-color, #ccc); border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label for="color-yellow" style="font-size: 11px; width: 70px;">Vertical 2:</label>
              <input type="color" id="color-yellow" value="#fca414" style="width: 32px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
              <input type="text" id="hex-yellow" value="#fca414" style="width: 70px; height: 22px; font-family: monospace; font-size: 11px; text-align: center; border: 1px solid var(--border-color, #ccc); border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label for="color-border" style="font-size: 11px; width: 70px;">Border:</label>
              <input type="color" id="color-border" value="#666666" style="width: 32px; height: 24px; border: none; border-radius: 4px; cursor: pointer;">
              <input type="text" id="hex-border" value="#666666" style="width: 70px; height: 22px; font-family: monospace; font-size: 11px; text-align: center; border: 1px solid var(--border-color, #ccc); border-radius: 4px;">
            </div>
          </div>

          <div class="control-row" style="margin-top: 10px;">
            <button id="reset-default-colors" class="btn-utility" style="font-size: 11px;">Reset</button>
            <button id="close-custom-colors" class="btn-utility" style="font-size: 11px;">Close</button>
          </div>
        </div>
      </div>
    </details>

    <!-- Section 5: View Controls (collapsed by default) -->
    <details class="control-section">
      <summary>View Controls</summary>
      <div class="control-section-content">
        <!-- 3D Camera Controls -->
        <div id="camera-controls-section">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">3D Camera</div>
          <div class="control-row">
            <div class="btn-group" style="display: flex; gap: 2px;">
              <button id="move-left-btn" class="btn-utility" style="padding: 4px 8px;">←</button>
              <button id="move-up-btn" class="btn-utility" style="padding: 4px 8px;">↑</button>
              <button id="move-down-btn" class="btn-utility" style="padding: 4px 8px;">↓</button>
              <button id="move-right-btn" class="btn-utility" style="padding: 4px 8px;">→</button>
            </div>
            <button id="reset-view-btn" class="btn-utility" style="font-size: 11px;">Reset</button>
          </div>
          <div class="control-row">
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px;">
              <input type="checkbox" id="demo-mode">
              Demo mode (auto-rotate)
            </label>
          </div>
          <div class="control-row">
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px;">
              <input type="checkbox" id="no-3d-checkbox">
              No 3D (faster)
            </label>
          </div>
        </div>

        <!-- 2D Display Options -->
        <div id="display-options-section" style="border-top: 1px solid var(--border-color, #e0e0e0); padding-top: 10px; margin-top: 8px;">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">2D Zoom</div>
          <div class="control-row">
            <div class="btn-group" style="display: flex; gap: 2px;">
              <button id="zoom-in-btn-2d" class="btn-utility" style="padding: 4px 10px;">+</button>
              <button id="zoom-out-btn-2d" class="btn-utility" style="padding: 4px 10px;">−</button>
            </div>
            <button id="zoom-reset-btn-2d" class="btn-utility" style="font-size: 11px;">Reset</button>
          </div>

          <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; margin-top: 10px;">2D Display Options</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
              <input type="checkbox" id="grayscale-checkbox-2d">
              Grayscale mode
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
              <input type="checkbox" id="checkerboard-checkbox-2d">
              Checkerboard overlay
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
              <input type="checkbox" id="paths-checkbox-2d">
              Nonintersecting paths
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
              <input type="checkbox" id="dimers-checkbox-2d">
              Show dimers
            </label>
            <div id="height-function-toggle-container">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px;">
                <input type="checkbox" id="height-function-checkbox-2d">
                Height function (n ≤ 30)
              </label>
            </div>
          </div>
        </div>
      </div>
    </details>

    <!-- Section 6: Export (collapsed by default) -->
    <details class="control-section">
      <summary>Export</summary>
      <div class="control-section-content">
        <div class="export-group">
          <span class="export-group-label">Data</span>
          <button id="download-csv-btn" class="btn-utility" style="font-size: 11px;">CSV ↓</button>
          <input type="file" id="upload-csv-input" accept=".csv" style="display: none;">
          <button id="upload-csv-btn" class="btn-utility" style="font-size: 11px;">CSV ↑</button>
        </div>
        <div class="export-divider"></div>
        <div class="export-group">
          <span class="export-group-label">Images</span>
          <button id="download-png-btn" class="btn-utility" style="font-size: 11px; display: none;">PNG</button>
          <button id="download-pdf-btn" class="btn-utility" style="font-size: 11px; display: none;">PDF</button>
          <button id="download-3d-btn" class="btn-utility" style="font-size: 11px;">3D Screenshot</button>
        </div>
        <div class="export-divider"></div>
        <div class="export-group">
          <span class="export-group-label">Code</span>
          <button id="tikz-btn" class="btn-utility" style="font-size: 11px;">Generate TikZ</button>
        </div>
        <div id="tikz-buttons-container" style="display: none; margin-top: 8px;">
          <div class="control-row">
            <button id="copy-tikz-btn" class="btn-utility" style="font-size: 11px;">Copy</button>
            <button id="download-tikz-btn" class="btn-utility" style="font-size: 11px;">Download .tex</button>
            <span id="copy-success-msg" style="color: green; font-size: 11px; font-weight: bold; display: none;">Copied!</span>
          </div>
        </div>
        <!-- TikZ code container -->
        <div id="tikz-code-container" style="font-family: monospace; padding: 10px; border: 1px solid var(--border-color, #ccc); border-radius: 4px; background: var(--bg-primary, white); white-space: pre; font-size: 11px; max-height: 200px; overflow-y: auto; margin-top: 8px; display: none;"></div>
        <div class="export-divider"></div>
        <div class="export-group">
          <span class="export-group-label">Share</span>
          <button id="copy-link-btn" class="btn-utility" style="font-size: 11px;">Copy Link</button>
          <span id="link-copied-msg" style="color: #28a745; font-size: 11px; font-weight: bold; display: none; margin-left: 4px;">Copied!</span>
        </div>
      </div>
    </details>

  </div><!-- end controls-panel-inner -->
</aside>

<!-- Keyboard Shortcuts Help Modal -->
<div id="keyboard-help-modal" class="keyboard-help-modal" role="dialog" aria-labelledby="keyboard-help-title" aria-modal="true">
  <div class="keyboard-help-content">
    <h3 id="keyboard-help-title">Keyboard Shortcuts</h3>
    <table>
      <tr><td><kbd>S</kbd></td><td>Sample new tiling</td></tr>
      <tr><td><kbd>G</kbd></td><td>Start/Stop Glauber dynamics</td></tr>
      <tr><td><kbd>D</kbd></td><td>Toggle demo mode</td></tr>
      <tr><td><kbd>R</kbd></td><td>Reset view</td></tr>
      <tr><td><kbd>[</kbd> <kbd>]</kbd></td><td>Previous/Next palette</td></tr>
      <tr><td><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></td><td>Move camera (3D)</td></tr>
      <tr><td><kbd>2</kbd> / <kbd>3</kbd></td><td>Switch to 2D/3D view</td></tr>
      <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Close dialogs</td></tr>
    </table>
    <button class="close-btn" id="close-keyboard-help">Close</button>
  </div>
</div>

<!-- Right: Visualization Panel -->
<main class="visualization-panel">
  <!-- Canvas Container with view toggle overlay -->
  <div id="canvas-container" style="position: relative;">
    <!-- View Toggle overlay -->
    <div class="view-overlay">
      <div class="view-toggle-pills">
        <button id="view-3d-btn" class="active" title="3D height function view">3D</button>
        <button id="view-2d-btn" title="2D domino view">2D</button>
      </div>
      <button id="help-btn" title="Keyboard shortcuts" style="width: 28px; height: 28px; border: 1px solid var(--border-color, #888); border-radius: 50%; background: var(--bg-primary, white); color: #666; font-size: 14px; cursor: pointer; padding: 0; margin-left: 8px;">?</button>
    </div>

    <!-- 3D Visualization Pane (default) -->
    <div id="aztec-canvas"></div>

    <!-- 2D Visualization Pane (hidden by default) -->
    <div id="aztec-2d-canvas" style="display: none; position: relative; overflow: hidden; height: 70vh;">
      <!-- 2D controls moved to sidebar -->
      <svg id="aztec-svg-2d" style="width: 100%; height: 100%; border: 1px solid var(--border-color, #ccc);"></svg>
    </div>
  </div>
</main>

</div><!-- end simulation-layout -->

<!-- Floating Action Button for Mobile -->
<button id="sampleFab" class="sample-fab" aria-label="Sample domino tiling" data-tooltip="Sample (S)">▶</button>

{%include dear_colleagues.md%}

<script>
// Initialize display settings on document load
document.addEventListener('DOMContentLoaded', function() {
  // No collapsible functionality needed
});

// Helper function to create a message for large tilings (n > 300) in 3D view
function createLargeTilingMessage() {
  const container = document.getElementById('aztec-canvas');
  container.innerHTML = '';
  const messageDiv = document.createElement('div');
  messageDiv.style.width = '100%';
  messageDiv.style.height = '100%';
  messageDiv.style.display = 'flex';
  messageDiv.style.alignItems = 'center';
  messageDiv.style.justifyContent = 'center';
  messageDiv.style.backgroundColor = '#f0f0f0';
  messageDiv.style.border = '1px solid #ccc';
  messageDiv.style.padding = '20px';
  messageDiv.style.boxSizing = 'border-box';
  messageDiv.style.fontSize = '18px';
  messageDiv.style.fontWeight = 'bold';
  messageDiv.style.textAlign = 'center';
  messageDiv.innerHTML = 'For n > 300, only 2D visualization is available.<br>Switch to the 2D view using the button above.<br><br>To see a 3D visualization, decrease n to 300 or less and click Sample.';
  container.appendChild(messageDiv);
}

Module.onRuntimeInitialized = async function() {
  const simulateAztec = Module.cwrap('simulateAztec','number',['number','number','number','number','number','number','number','number','number','number'],{async:true});
  const simulateAztec6x2 = Module.cwrap('simulateAztec6x2', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'], {async:true});
  const simulateAztecHorizontal = Module.cwrap(
    'simulateAztecHorizontal', 'number',
    ['number','number','number','number','number','number',
     'number','number','number','number'], {async:true});

  const simulateAztecVertical = Module.cwrap(
    'simulateAztecVertical', 'number',
    ['number','number','number','number','number','number',
     'number','number','number','number'], {async:true});
  const freeString    = Module.cwrap('freeString',null,['number']);
  const getProgress   = Module.cwrap('getProgress','number',[]);
  const performGlauberSteps = Module.cwrap('performGlauberSteps', 'number', ['string', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'], {async: true});
  const wasGlauberActive = Module.cwrap('wasGlauberActive', 'boolean', []);

  // Three.js setup
  let scene, camera, renderer, controls, dominoGroup;
  let animationActive = true;

  // Simulation state
  let simulationActive = false;
  let abortController = null;
  const progressElem = document.getElementById("progress-indicator");
  const updateBtn = document.getElementById("update-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  let progressInterval;
  let cachedDominoes = null; // Store dominoes for 2D view
  let useHeightFunction = false; // Track height function visibility state
  let heightGroup; // Group for height function display

  // Glauber state variables (exposed on window for FAB access)
  let glauberRunning = false;
  window.glauberRunning = glauberRunning;
  let glauberTimer = null;
  let lastSampleWasGlauber = false; // Track if the *last* visualization update came from Glauber

  // Demo mode state
  let isDemoMode = false;
  let rotationSpeed = 0.005; // Speed of rotation in radians

  function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const container = document.getElementById('aztec-canvas');

    // Make sure the container is visible
    container.style.display = 'block';
    // No innerHTML clearing here - it can disrupt existing WebGL context

    const w = container.clientWidth, h = container.clientHeight;
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(w,h);
    renderer.setPixelRatio(window.devicePixelRatio);
    // Enable OES_element_index_uint extension for WebGL 1 to support 32-bit indices
    renderer.getContext().getExtension('OES_element_index_uint');

    // Clear and add canvas
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const frustum = 100, aspect = w/h;
    camera = new THREE.OrthographicCamera(
      -frustum*aspect/2, frustum*aspect/2,
       frustum/2, -frustum/2,
      1,1000
    );
    camera.position.set(0, 130, 0);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff,0.5));
    const dir1 = new THREE.DirectionalLight(0xffffff,0.8);
    dir1.position.set(0.5,1,0.5).normalize();
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xffffff,0.6);
    dir2.position.set(-0.5,1,-0.5).normalize();
    scene.add(dir2);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    /* NEW — allow one‑finger rotate on touch devices */
    controls.touches.ONE = THREE.TOUCH.ROTATE;
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
    if (!animationActive) return;

    requestAnimationFrame(animate);
    controls.update();

    // Apply rotation in demo mode
    if (isDemoMode && dominoGroup) {
      dominoGroup.rotation.y += rotationSpeed;
    }

    renderer.render(scene, camera);
  }

  // Helper function to sleep for ms milliseconds
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function startSimulation() {
    simulationActive = true;

    // Disable sample button and n-input
    document.getElementById("sample-btn")?.setAttribute("disabled", "disabled");
    document.getElementById("n-input")?.setAttribute("disabled", "disabled");

    // Disable all the periodicity controls
    document.querySelectorAll('input[name="periodicity"]').forEach(radio => {
      radio.disabled = true;
    });

    // Disable all weight inputs regardless of current periodicity
    document.getElementById("a-input")?.setAttribute("disabled", "disabled");
    document.getElementById("b-input")?.setAttribute("disabled", "disabled");

    for (let i = 1; i <= 9; i++) {
      document.getElementById(`w${i}`)?.setAttribute("disabled", "disabled");
    }

    // Disable Glauber controls
    document.getElementById('glauber-btn')?.setAttribute('disabled', 'disabled');
    document.getElementById('sweeps-input')?.setAttribute('disabled', 'disabled');

    // Show cancel button
    if (cancelBtn) {
      cancelBtn.style.display = 'inline-block';
      cancelBtn.removeAttribute("disabled");
    }

    abortController = new AbortController();
  }

  function stopSimulation() {
    simulationActive = false;
    clearInterval(progressInterval);

    // Force re-enable all controls
    document.getElementById("sample-btn")?.removeAttribute("disabled");
    document.getElementById("n-input")?.removeAttribute("disabled");

    // Re-enable all radio buttons
    document.querySelectorAll('input[name="periodicity"]').forEach(radio => {
      radio.disabled = false;
    });

    // Re-enable ALL possible input fields regardless of current periodicity
    document.getElementById("a-input")?.removeAttribute("disabled");
    document.getElementById("b-input")?.removeAttribute("disabled");

    for (let i = 1; i <= 9; i++) {
      document.getElementById(`w${i}`)?.removeAttribute("disabled");
    }

    // Re-enable Glauber controls
    document.getElementById('glauber-btn')?.removeAttribute('disabled');
    document.getElementById('sweeps-input')?.removeAttribute('disabled');

    // If cancelled while Glauber was running, reset its UI
    if (glauberRunning) {
        const glauberBtn = document.getElementById('glauber-btn');
        const glauberStatus = document.getElementById('glauber-status');
        glauberRunning = false;
        window.glauberRunning = false;
        clearInterval(glauberTimer);
        glauberTimer = null;
        glauberBtn.textContent = "Run Glauber";
        glauberBtn.classList.remove('running', 'btn-danger');
        glauberBtn.classList.add('btn-success');
        glauberStatus.innerText = "";
    }

    // Make sure parameter display is correct
    try {
      updatePeriodicityParams();
    } catch (e) {

    }

    if (cancelBtn) cancelBtn.style.display = 'none';
    if (progressElem) progressElem.innerText = "3D Drawing Cancelled";

    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  // Initialize Three.js when the module is loaded
  initThreeJS();

  // Add a global function to easily reset Three.js if needed
  window.resetThreeJS = function() {

    if (renderer) {
      renderer.dispose();
    }
    initThreeJS();
    return "";
  };

  // Helper function to run Glauber steps and update visualization
  async function advanceGlauberDynamics(nSteps) {
    if (!cachedDominoes) return 0; // Need an initial state

    // 1. Get current periodicity and parameters
    const periodicity = document.querySelector('input[name="periodicity"]:checked')?.value || 'uniform';
    let params = [periodicity]; // First arg is string name
    if (periodicity === '6x2') {
        // Get the 6x2 weights from the UI inputs
        // We can only pass 9 parameters, so we'll pass the first 9 weights
        // and reuse some values for the remaining positions
        const w1 = parseFloat(document.getElementById('w6x2_1').value) || 1.0;
        const w2 = parseFloat(document.getElementById('w6x2_2').value) || 20.0;
        const w3 = parseFloat(document.getElementById('w6x2_3').value) || 1.0;
        const w4 = parseFloat(document.getElementById('w6x2_4').value) || 20.0;
        const w5 = parseFloat(document.getElementById('w6x2_5').value) || 1.0;
        const w6 = parseFloat(document.getElementById('w6x2_6').value) || 20.0;
        const w7 = parseFloat(document.getElementById('w6x2_7').value) || 1.0;
        const w8 = parseFloat(document.getElementById('w6x2_8').value) || 20.0;
        const w9 = parseFloat(document.getElementById('w6x2_9').value) || 1.0;
        // Note: We can only pass 9 parameters, so w10, w11, w12 will be handled by storing them during sample
        params.push(w1, w2, w3, w4, w5, w6, w7, w8, w9);
    } else if (periodicity === '2x2') {
        const a = parseFloat(document.getElementById('a-input').value) || 0.5;
        const b = parseFloat(document.getElementById('b-input').value) || 1.0;
        params.push(a, b, 0,0,0,0,0,0,0); // Pass a, b as p1, p2
    } else if (periodicity === '3x3') {
        for (let i = 1; i <= 9; i++) {
            const val = parseFloat(document.getElementById(`w${i}`).value) || 1.0;
            params.push(val);
        }
    } else { // Uniform
        params.push(1,1,1,1,1,1,1,1,1); // Pass all 1s
    }
    params.push(nSteps); // Add number of steps

    // 2. Call C++ function
    const ptr = await performGlauberSteps(...params);
    const jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);

    // 3. Parse result and update cache
    try {
        const result = JSON.parse(jsonStr);
        if (result.error) {
            console.error("Glauber error:", result.error);
            // Optionally stop dynamics on error
            // toggleGlauberDynamics();
            return 0;
        }
        cachedDominoes = result;
        lastSampleWasGlauber = true; // Mark that Glauber produced this state

        // 4. Update visualization (both 2D and 3D if applicable)
        await updateVisualizationFromCache();

        return nSteps; // Return number of steps successfully run
    } catch (e) {
        console.error("Error parsing Glauber result:", e, jsonStr);
        return 0;
    }
  }

  // Function to start/stop Glauber dynamics
  async function toggleGlauberDynamics() {
    const glauberBtn = document.getElementById('glauber-btn');
    const sweepsInput = document.getElementById('sweeps-input');
    const glauberStatus = document.getElementById('glauber-status');

    const fabBtn = document.getElementById('sampleFab');

    if (glauberRunning) {
        // Stop dynamics
        clearInterval(glauberTimer);
        glauberTimer = null;
        glauberRunning = false;
        window.glauberRunning = false;
        glauberBtn.textContent = "Run Glauber";
        glauberBtn.classList.remove('running', 'btn-danger');
        glauberBtn.classList.add('btn-success');
        glauberStatus.innerText = "";

        // Update FAB to show play state
        if (fabBtn) {
            fabBtn.innerHTML = '▶';
            fabBtn.setAttribute('data-tooltip', 'Sample (S)');
        }

        // Re-enable controls that were disabled by Glauber
        document.getElementById("sample-btn")?.removeAttribute("disabled");
        document.getElementById("n-input")?.removeAttribute("disabled");
        document.querySelectorAll('input[name="periodicity"]').forEach(radio => radio.disabled = false);
        // Re-enable specific weight inputs based on current periodicity
        updatePeriodicityParams(); // This function should handle enabling/disabling based on selected radio

    } else {
        // Start dynamics
        if (!cachedDominoes) {
            alert("Please generate a tiling first using 'Sample' before running Glauber dynamics.");
            return;
        }

        glauberRunning = true;
        window.glauberRunning = true;
        glauberBtn.textContent = "Stop Glauber";
        glauberBtn.classList.add('running', 'btn-danger');
        glauberBtn.classList.remove('btn-success');
        glauberStatus.innerText = "";

        // Update FAB to show pause state
        if (fabBtn) {
            fabBtn.innerHTML = '⏸';
            fabBtn.setAttribute('data-tooltip', 'Stop (G)');
        }

        // Disable controls that shouldn't be changed during dynamics
        document.getElementById("sample-btn")?.setAttribute("disabled", "disabled");
        document.getElementById("n-input")?.setAttribute("disabled", "disabled");
        document.querySelectorAll('input[name="periodicity"]').forEach(radio => radio.disabled = true);
        // Keep weight inputs enabled so user can change them live

        // Initial step before interval starts
        const initialSteps = Math.max(1, parseInt(sweepsInput.value, 10) || 1);
        await advanceGlauberDynamics(initialSteps);

        // Start the timer if still running
        if (glauberRunning) {
            const updateInterval = 100; // ms between redraws
            glauberTimer = setInterval(async () => {
                if (!glauberRunning) { // Check again inside interval
                    clearInterval(glauberTimer);
                    return;
                }
                const stepsPerUpdate = Math.max(1, parseInt(sweepsInput.value, 10) || 1);
                await advanceGlauberDynamics(stepsPerUpdate);
            }, updateInterval);
        }
    }
  }

  // Function to update both 2D and 3D visualizations from cachedDominoes
  async function updateVisualizationFromCache() {
    if (!cachedDominoes) return;

    const n = parseInt(document.getElementById("n-input").value, 10) || 0;
    const is3DView = document.getElementById("view-3d-btn").classList.contains("active");
    const is2DView = document.getElementById("view-2d-btn").classList.contains("active");

    // Update 2D view immediately if active
    if (is2DView) {
        await render2D(cachedDominoes); // Re-render 2D SVG
    }

    // Update 3D view if active and n is suitable and 3D is not disabled
    const no3D = document.getElementById("no-3d-checkbox").checked;
    if (is3DView && n <= 300 && !no3D) {
        // Clear existing domino group
        if (dominoGroup) {
            while(dominoGroup.children.length > 0){
                const m = dominoGroup.children[0];
                dominoGroup.remove(m);
                if (m.geometry) m.geometry.dispose();
                if (m.material) m.material.dispose();
            }
        } else {
            initThreeJS(); // Reinitialize if group doesn't exist
        }

        // Recalculate height map and render (similar logic as in updateVisualization)
        const heightMap = calculateHeightFunction(cachedDominoes);
        const scale = 60 / (2 * n);
        const colors = {
          blue: hexToThreeColor(currentColors.blue),
          green: hexToThreeColor(currentColors.green),
          red: hexToThreeColor(currentColors.red),
          yellow: hexToThreeColor(currentColors.yellow)
        };
        const showColors3D = document.getElementById("show-colors-checkbox").checked;
        const showGradient3D = document.getElementById("height-gradient-checkbox").checked;
        const monoColor3D = 0x999999;

        // Pre-calculate all faces for height range
        const allFaces = cachedDominoes.map(d => createDominoFaces(d, heightMap, scale));
        let minHeight = Infinity, maxHeight = -Infinity;
        for (const f of allFaces) {
          if (f && f.avgHeight !== undefined) {
            minHeight = Math.min(minHeight, f.avgHeight);
            maxHeight = Math.max(maxHeight, f.avgHeight);
          }
        }
        const heightRange = maxHeight - minHeight;

        allFaces.forEach(faceData => {
            if (!faceData || !faceData.color || !Array.isArray(faceData.vertices)) return;

            try {
                const geom = new THREE.BufferGeometry();
                const pos = [];
                faceData.vertices.forEach(v => pos.push(v[0] * scale, v[1] * scale, v[2] * scale));
                geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

                const isH = (faceData.color === 'blue' || faceData.color === 'green');
                // ── choose full 12‑triangle index list (6 vertices) ──
                const indices = isH
                  // horizontal domino (blue/green): vertices 0‑5 →
                  //   0,1,3, 3,2,1  – top face
                  //   0,1,4         – long left side
                  //   3,2,5         – long right side
                  ? [0,1,3, 3,2,1, 0,1,4, 3,2,5]
                  // vertical domino (red/yellow): same pattern
                  : [0,1,3, 3,2,1, 0,1,4, 3,2,5];

                if (cachedDominoes.length * 6 > 65535) {
                    geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
                } else {
                    geom.setIndex(indices);
                }
                geom.computeVertexNormals();

                const colorValue = colors[faceData.color] || 0x808080;

                // Apply height gradient if enabled
                let finalColor = colorValue;
                if (showColors3D && showGradient3D && heightRange > 0 && faceData.avgHeight !== undefined) {
                  const t = (faceData.avgHeight - minHeight) / heightRange;
                  const baseColor = new THREE.Color(colorValue);
                  const darkColor = baseColor.clone().multiplyScalar(0.4);
                  finalColor = darkColor.lerp(baseColor, t).getHex();
                }

                const mat = new THREE.MeshStandardMaterial({
                    color: showColors3D ? finalColor : monoColor3D,
                    side: THREE.DoubleSide,
                    flatShading: true
                });
                mat.userData = { originalColorValue: colorValue, gradientColorValue: finalColor };
                const mesh = new THREE.Mesh(geom, mat);
                mesh.userData.originalColor = faceData.color;
                mesh.userData.avgHeight = faceData.avgHeight;
                dominoGroup.add(mesh);
            } catch(e) {
                console.error("Error creating 3D mesh during Glauber update:", e);
            }
        });

        // Recenter (optional, could keep previous center/scale)
        if (dominoGroup.children.length > 0) {
            const box = new THREE.Box3().setFromObject(dominoGroup);
            const center = box.getCenter(new THREE.Vector3());
            center.x += -0.7; center.z += 4; // Adjust center
            dominoGroup.position.sub(center);
        }
        // Ensure render happens
        if (renderer && animationActive) {
            //renderer.render(scene, camera); // Render handled by animate loop
        }
    }
  }

  // Calculate height function based on domino configuration
  // This implementation follows the algorithm from 2025-02-02-aztec-uniform.md
  function calculateHeightFunction(dominoes) {
    if (!dominoes || dominoes.length === 0) return new Map();

    // 1. Determine lattice unit (scaling factor)
    const minSidePx = Math.min(...dominoes.map(d => Math.min(d.w, d.h)));
    const unit = minSidePx / 2; // 2 lattice units → 1 short side
    if (unit <= 0) return new Map();

    // 2. Convert each domino to (orient, sign, gx, gy)
    const dominoData = dominoes.map(d => {
      const horiz = d.w > d.h;
      const orient = horiz ? 0 : 1;
      const sign = horiz
        ? (d.color === "green" ? -1 : 1)   // horizontal: green = −1, blue = +1
        : (d.color === "yellow" ? -1 : 1);  // vertical: yellow = −1, red = +1
      const gx = Math.round(d.x / unit);   // lattice coordinates
      const gy = Math.round(d.y / unit);
      return [orient, sign, gx, gy];
    });

    // 3. Build graph with height increments
    const adj = new Map();

    function addEdge(v1, v2, dh) {
      const v1Key = `${v1[0]},${v1[1]}`;
      const v2Key = `${v2[0]},${v2[1]}`;

      if (!adj.has(v1Key)) adj.set(v1Key, []);
      if (!adj.has(v2Key)) adj.set(v2Key, []);

      adj.get(v1Key).push([v2Key, dh]);
      adj.get(v2Key).push([v1Key, -dh]);
    }

    dominoData.forEach(([o, s, x, y]) => {
      if (o === 0) { // horizontal (4×2)
        const TL = [x, y+2], TM = [x+2, y+2], TR = [x+4, y+2];
        const BL = [x, y], BM = [x+2, y], BR = [x+4, y];

        addEdge(TL, TM, -s); addEdge(TM, TR, s);
        addEdge(BL, BM, s); addEdge(BM, BR, -s);
        addEdge(TL, BL, s); addEdge(TM, BM, 3*s);
        addEdge(TR, BR, s);
      } else { // vertical (2×4)
        const TL = [x, y+4], TR = [x+2, y+4];
        const ML = [x, y+2], MR = [x+2, y+2];
        const BL = [x, y], BR = [x+2, y];

        addEdge(TL, TR, -s); addEdge(ML, MR, -3*s); addEdge(BL, BR, -s);
        addEdge(TL, ML, s); addEdge(ML, BL, -s);
        addEdge(TR, MR, -s); addEdge(MR, BR, s);
      }
    });

    // 4. Breadth-first integration of heights
    const verts = Array.from(adj.keys()).map(k => {
      const [gx, gy] = k.split(',').map(Number);
      return {k, gx, gy};
    });

    // Find the "bottom-left" vertex as the root
    const root = verts.reduce((a, b) =>
      (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b
    ).k;

    const heights = new Map([[root, 0]]);
    const queue = [root];

    while (queue.length > 0) {
      const v = queue.shift();
      for (const [w, dh] of adj.get(v)) {
        if (!heights.has(w)) {
          heights.set(w, heights.get(v) + dh);
          queue.push(w);
        }
      }
    }

    // Create a map of vertex coordinates to height values
    const finalHeights = new Map();
    heights.forEach((h, key) => {
      const [x, y] = key.split(',').map(Number);
      // Important: negate the height as per the requirements
      finalHeights.set(`${x},${y}`, -h);
    });

    return finalHeights;
  }

  // Create a 3D face for a domino with its height function
  function createDominoFaces(domino, heightMap, scale) {
    const oddI = domino.color === "blue" || domino.color === "yellow";
    const oddJ = domino.color === "blue" || domino.color === "red";

    const isHorizontal = domino.w > domino.h;
    const color = domino.color;

    // Determine coordinates for each vertex
    let pts;
    if (isHorizontal) {
      // horizontal domino (blue or green)
      const w = 4, h = 2;
      const x = domino.x;
      const y = domino.y;

      pts = [
        [x, y+h],    // top-left
        [x+w, y+h],  // top-right
        [x+w, y],    // bottom-right
        [x, y],      // bottom-left
        [x+w/2, y+h],// top-mid
        [x+w/2, y]   // bottom-mid
      ];
    } else {
      // vertical domino (yellow or red)
      const w = 2, h = 4;
      const x = domino.x;
      const y = domino.y;

      pts = [
        [x, y],      // bottom-left
        [x, y+h],    // top-left
        [x+w, y+h],  // top-right
        [x+w, y],    // bottom-right
        [x, y+h/2],  // left-mid
        [x+w, y+h/2] // right-mid
      ];
    }

    // Map points to 3D coordinates with heights
    const vertices = [];
    const unit = isHorizontal ? domino.w / 4 : domino.h / 4;

    for (const [x, y] of pts) {
      const gridX = Math.round(x / unit);
      const gridY = Math.round(y / unit);
      const key = `${gridX},${gridY}`;

      // Get height for this vertex (default to 0 if not found)
      let z = 0;
      if (heightMap.has(key)) {
        z = heightMap.get(key);
      }

      // Apply scale and shifts
      const adjustedXShift = -0.5 + (isHorizontal ? 0 : 0);
      const adjustedYShift = 1.5 + (isHorizontal ? 0 : 0);

      vertices.push([
        x / 2.0 + adjustedXShift,
        z,  // z is the height
        y / 2.0 + adjustedYShift
      ]);
    }

    // Calculate average height for gradient coloring
    const avgHeight = vertices.reduce((sum, v) => sum + v[1], 0) / vertices.length;

    return {
      color: color,
      vertices: vertices,
      avgHeight: avgHeight
    };
  }

  async function updateVisualization(n) {
    // If Glauber is running, stop it
    if (glauberRunning) {
        toggleGlauberDynamics(); // Stop the dynamics
    }
    lastSampleWasGlauber = false; // Reset flag when generating a fresh sample

    /* ------------------------------------------------------------------ */
     /* 1. wipe previous geometry *and* transforms                          */
     /* ------------------------------------------------------------------ */
     if (dominoGroup) {
       dominoGroup.clear();                    // three ≥ r152 preferred to loop/remove
       dominoGroup.position.set(0, 0, 0);
       dominoGroup.rotation.set(0, 0, 0);
       dominoGroup.scale.set(1, 1, 1);         // <‑‑ the crucial line
     } else {
       // Something went wrong with the 3D scene - reinitialize

       initThreeJS();
     }
     /* ------------------------------------------------------------------ */


    // Check if we're in 3D view with n > 300
    const is3DView = document.getElementById("view-3d-btn").classList.contains("active");
    const skip3DRendering = is3DView && n > 300;

    // Get the current periodicity setting
    const periodicity = document.querySelector('input[name="periodicity"]:checked').value;
    const isFrozenH = (periodicity === 'frozenH');
    const isFrozenV = (periodicity === 'frozenV');

    let w1=1.0, w2=1.0, w3=1.0, w4=1.0, w5=1.0, w6=1.0, w7=1.0, w8=1.0, w9=1.0;
    let a=1.0, b=1.0;

    if (!isFrozenH && !isFrozenV) {
      if (periodicity === '2x2') {
        // Safe get values with defaults
        const aInput = document.getElementById("a-input");
        const bInput = document.getElementById("b-input");
        a = aInput && !isNaN(parseFloat(aInput.value)) ? parseFloat(aInput.value) : 0.5;
        b = bInput && !isNaN(parseFloat(bInput.value)) ? parseFloat(bInput.value) : 1.0;

        // For 2x2, we'll set the 3x3 weights specially
        w1 = 1.0; w2 = a; w3 = 1.0;
        w4 = b; w5 = 1.0; w6 = b;
        w7 = 1.0; w8 = a; w9 = 1.0;
      } else if (periodicity === '3x3') {
        // Get values from the 3x3 weight inputs
        for (let i = 1; i <= 9; i++) {
          const input = document.getElementById(`w${i}`);
          const val = input && !isNaN(parseFloat(input.value)) ? parseFloat(input.value) : 1.0;
          if (i === 1) w1 = val;
          else if (i === 2) w2 = val;
          else if (i === 3) w3 = val;
          else if (i === 4) w4 = val;
          else if (i === 5) w5 = val;
          else if (i === 6) w6 = val;
          else if (i === 7) w7 = val;
          else if (i === 8) w8 = val;
          else if (i === 9) w9 = val;
        }


      } else {
        // Uniform weights - all weights are 1.0
        w1 = 1.0; w2 = 1.0; w3 = 1.0;
        w4 = 1.0; w5 = 1.0; w6 = 1.0;
        w7 = 1.0; w8 = 1.0; w9 = 1.0;


      }
    }
    // Clear previous models
    if (dominoGroup && dominoGroup.children) {
      // Improved clearing that's safer and handles possible null conditions
      while(dominoGroup.children && dominoGroup.children.length > 0){
        const m = dominoGroup.children[0];
        if (m) {
          dominoGroup.remove(m);
          if (m.geometry) m.geometry.dispose();
          if (m.material) m.material.dispose();
        }
      }
    }

    // Remember demo mode state
    const wasInDemoMode = isDemoMode;

    startSimulation();
    const signal = abortController.signal;

    // Start progress polling
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      if (!simulationActive) {
        clearInterval(progressInterval);
        return;
      }
      const p = getProgress();
      progressElem.innerText = `Sampling... (${p}%)`;
      if(p >= 100) clearInterval(progressInterval);
    }, 100);

    try {
      // Allow UI to update before starting heavy computation
      await sleep(50);
      if (signal.aborted) return;

      // Get domino configuration from C++ code
      let ptrPromise;
      if (isFrozenH) {
        ptrPromise = simulateAztecHorizontal(n, 0,0,0,0,0,0,0,0,0,0);
      } else if (isFrozenV) {
        ptrPromise = simulateAztecVertical(n, 0,0,0,0,0,0,0,0,0,0);
      } else if (periodicity === '6x2') {
        const v = [];
        for (let i = 1; i <= 12; i++) {
            const input = document.getElementById(`w6x2_${i}`);
            v.push(input && !isNaN(parseFloat(input.value)) ? parseFloat(input.value) : 1.0);
        }
        ptrPromise = simulateAztec6x2(n, ...v);
      } else {
        ptrPromise = simulateAztec(n, w1,w2,w3,w4,w5,w6,w7,w8,w9);
      }

      // Wait for simulation to complete
      const ptr = await ptrPromise;
      if (signal.aborted) {
        if (ptr) freeString(ptr);
        return;
      }

      let raw = Module.UTF8ToString(ptr);
      freeString(ptr);
      if (signal.aborted) return;

      // Parse the results
      const dominoes = JSON.parse(raw);
      if (dominoes.error) throw new Error(dominoes.error);
      if (signal.aborted) return;

      // Cache the dominoes for 2D view
      cachedDominoes = dominoes;

      // Check if this is a large tiling (n > 300)
      const isLargeTiling = n > 300;


      /* Only render the 2‑D SVG if the pane is actually on screen
         (mobile Safari gives it height 0 while it is display:none).      */
      const need2D = document.getElementById("view-2d-btn")
                         .classList.contains("active")        // user is in 2‑D view
                   || n > 300;                                // 3‑D disabled anyway
      if (need2D) await render2D(dominoes);                   // otherwise defer

      // For large tilings (n > 300), prepare a message for 3D view
      if (isLargeTiling) {

        // Create a div with a message in the 3D canvas container
        const container = document.getElementById('aztec-canvas');
        container.innerHTML = '';
        const messageDiv = document.createElement('div');
        messageDiv.style.width = '100%';
        messageDiv.style.height = '100%';
        messageDiv.style.display = 'flex';
        messageDiv.style.alignItems = 'center';
        messageDiv.style.justifyContent = 'center';
        messageDiv.style.backgroundColor = '#f0f0f0';
        messageDiv.style.border = '1px solid #ccc';
        messageDiv.style.padding = '20px';
        messageDiv.style.boxSizing = 'border-box';
        messageDiv.style.fontSize = '18px';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.textAlign = 'center';
        messageDiv.innerHTML = 'For n > 300, only 2D visualization is available.<br>Switch to the 2D view using the button above.<br><br>To see a 3D visualization, decrease n to 300 or less and click Sample.';
        container.appendChild(messageDiv);

        progressElem.innerText = "";
        stopSimulation();
        return;
      }

      // For n ≤ 300, check if 3D rendering is disabled
      const no3D = document.getElementById("no-3d-checkbox").checked;
      if (no3D) {
        // Skip 3D processing entirely when no 3D is checked
        progressElem.innerText = "";
        stopSimulation();
        return;
      }

      progressElem.innerText = "Calculating height function...";
      await sleep(10);
      if (signal.aborted) return;

      // Calculate the height function (in chunks if large)
      const heightMap = calculateHeightFunction(dominoes);
      if (signal.aborted) return;

      // Scale factor based on n
      const scale = 60/(2*n);

      // Colors for the materials - use current custom colors
      const colors = {
        blue:   hexToThreeColor(currentColors.blue),
        green:  hexToThreeColor(currentColors.green),
        red:    hexToThreeColor(currentColors.red),
        yellow: hexToThreeColor(currentColors.yellow)
      };

      // Create the 3D faces with proper heights
      progressElem.innerText = "Processing domino data...";
      await sleep(10);
      if (signal.aborted) return;

      // Process faces in chunks to keep UI responsive
      const facesPromise = (async () => {
        const faces = [];
        const CHUNK_SIZE = 200;

        for (let i = 0; i < dominoes.length; i += CHUNK_SIZE) {
          if (signal.aborted) return null;

          // Process a chunk of dominoes
          const chunk = dominoes.slice(i, i + CHUNK_SIZE);
          const chunkFaces = chunk.map(domino =>
            createDominoFaces(domino, heightMap, scale));
          faces.push(...chunkFaces);

          // Update progress and yield to UI
          progressElem.innerText =
            `Processing... (${Math.floor(100*(i+chunk.length)/dominoes.length)}%)`;
          await sleep(0);
        }

        return faces;
      })();

      const faces = await facesPromise;
      if (!faces || signal.aborted) return;

      const total = faces.length;
      if (total === 0 || signal.aborted) return;

      // Calculate height range for gradient coloring
      let minHeight = Infinity, maxHeight = -Infinity;
      for (const f of faces) {
        if (f && f.avgHeight !== undefined) {
          minHeight = Math.min(minHeight, f.avgHeight);
          maxHeight = Math.max(maxHeight, f.avgHeight);
        }
      }
      const heightRange = maxHeight - minHeight;

      // Batch processing of faces for better performance
      progressElem.innerText = "Rendering...";
      let idx = 0;

      function processBatch(start) {
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            if (signal.aborted) {
              resolve(false);
              return;
            }

            const BATCH_SIZE = 200;
            const end = Math.min(start + BATCH_SIZE, total);

            for (let i = start; i < end; i++) {
              if (signal.aborted) {
                resolve(false);
                return;
              }

              const f = faces[i];
              if (!f || !f.color || !Array.isArray(f.vertices)) continue;

              try {
                const geom = new THREE.BufferGeometry();
                // Vertices positions
                const pos = [];
                for (const v of f.vertices) {
                  pos.push(v[0]*scale, v[1]*scale, v[2]*scale);
                }

                geom.setAttribute(
                  'position',
                  new THREE.Float32BufferAttribute(pos, 3)
                );

                // Triangulation indices
                const isH = (f.color === 'blue' || f.color === 'green');
                const indices = isH
                  ? [0,1,3, 3,2,1, 0,1,4, 3,2,5]
                  : [0,1,3, 3,2,1, 0,1,4, 3,2,5];

                // Use 32-bit indices if needed for larger models
                if (total > 65535 / 6) { // 6 vertices per domino
                  geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
                } else {
                  geom.setIndex(indices);
                }

                geom.computeVertexNormals();

                // Check if we should show colors in 3D view
                const showColors = document.getElementById("show-colors-checkbox").checked;
                const showGradient = document.getElementById("height-gradient-checkbox").checked;
                const monoColor = 0x999999; // Default monochrome color when not showing colors
                const colorValue = colors[f.color] || 0x808080;

                // Apply height gradient if enabled
                let finalColor = colorValue;
                if (showColors && showGradient && heightRange > 0 && f.avgHeight !== undefined) {
                  const t = (f.avgHeight - minHeight) / heightRange; // 0 at bottom, 1 at top
                  const baseColor = new THREE.Color(colorValue);
                  const darkColor = baseColor.clone().multiplyScalar(0.4); // darker at bottom
                  finalColor = darkColor.lerp(baseColor, t).getHex();
                }

                const mat = new THREE.MeshStandardMaterial({
                  color: showColors ? finalColor : monoColor,
                  side: THREE.DoubleSide,
                  flatShading: true
                });

                // Store the original color code for later use in the userData
                mat.userData = { originalColorValue: colorValue, gradientColorValue: finalColor };

                // Create the mesh and store the original color for later toggling
                const mesh = new THREE.Mesh(geom, mat);
                mesh.userData.originalColor = f.color;
                mesh.userData.avgHeight = f.avgHeight;

                dominoGroup.add(mesh);
              } catch(e) {

              }
            }

            idx = end;
            progressElem.innerText = `Rendering... (${Math.floor(100*(idx/total))}%)`;
            resolve(idx < total);
          });
        });
      }

      // Process batches sequentially with yield points for UI
      let hasMore = true;
      while (hasMore && simulationActive && !signal.aborted) {
        hasMore = await processBatch(idx);
      }

      if (signal.aborted) return;

      // Only finish if we completed all batches
      if (idx >= total) {
        progressElem.innerText = "";

        // === recentre the tiling ===
        const box = new THREE.Box3().setFromObject(dominoGroup);
        const center = box.getCenter(new THREE.Vector3());
        // Shift the center a little for better visualization
        center.x += -0.7;  // Shift right a bit
        center.z +=  4;  // Shift forward a bit
        dominoGroup.position.sub(center);

        const sizeXYZ   = box.getSize(new THREE.Vector3());       // model extents
        const margin    = 0.05;                                   // 5 % breathing room

        // For an orthographic camera its “view size” is the difference of the planes:
        const viewW = camera.right  - camera.left;
        const viewH = camera.top    - camera.bottom;

        /* choose the limiting dimension (the one that would clip first) */
        const maxScale = (1 - margin) * Math.min(
          viewW / sizeXYZ.x,
          viewH / sizeXYZ.z          // z‑extent projects to vertical axis in your set‑up
        );

        dominoGroup.scale.setScalar(maxScale);
        controls.target.set(0, 0, 0);   // orbit around the true centre
        controls.update();

        // If we were in demo mode before update, restore demo view
        if (wasInDemoMode) {
          setDemoViewCamera();
        }
      }

      // Cleanup - reuse the stopSimulation function since it handles everything properly
      stopSimulation();
      if (progressElem) progressElem.innerText = "";

    } catch(err) {

      if (progressElem) progressElem.innerText = `Error: ${err.message}`;
      // Also use stopSimulation for cleanup on error
      stopSimulation();
    }
  }

  // Add Glauber button event listener with iOS touch fix
  let glauberTouchFired = false;
  document.getElementById('glauber-btn')?.addEventListener('touchend', function(e) {
    e.preventDefault();
    glauberTouchFired = true;
    toggleGlauberDynamics();
    setTimeout(() => { glauberTouchFired = false; }, 300);
  }, { passive: false });
  document.getElementById('glauber-btn')?.addEventListener('click', function() {
    if (glauberTouchFired) return; // Prevent double-fire on iOS
    toggleGlauberDynamics();
  });

  document.getElementById("sample-btn").addEventListener("click", () => {
    let n = parseInt(document.getElementById("n-input").value, 10);

    if (isNaN(n) || n < 2 || n % 2) {
      return alert(`Enter an even number for n (at least 2)`);
    }

    // Reset lastNRendered if n has changed
    if (n !== lastNRendered) {
      // This will force a recalculation of the transform when rendering
      lastNRendered = null;
    }

    // Update height function visibility based on n value
    updateHeightFunctionVisibility(n);

    // Get the current view (3D or 2D)
    const is3DView = document.getElementById("view-3d-btn").classList.contains("active");

    // Absolute maximum n values for each view
    const max3DN = 300;
    const max2DN = 500;

    // Check if n is within allowed range
    if ((is3DView && n > max3DN && n <= max2DN)) {
      // If in 3D view with n between 300 and 500, ask if user wants to switch to 2D
      if (confirm(`For n > ${max3DN}, only 2D visualization is available. Switch to 2D view automatically?`)) {
        // Switch to 2D view
        document.getElementById("view-2d-btn").click();
        // Now update visualization
        updateVisualization(n);
      }
      return;
    } else if (n > max2DN) {
      // Absolute maximum exceeded
      return alert(`n is too large. Maximum value is ${max2DN}.`);
    }

    // Handle 3D view initialization and clearing
    if (is3DView) {
      if (n <= max3DN) {
        // For valid n in 3D view, initialize properly
        // Make sure the 3D view is fully initialized
        const container = document.getElementById('aztec-canvas');
        const hasCanvas = container.querySelector('canvas') !== null;

        // Only clear the container if we're keeping the 3D view (n <= 300)
        // and there's no WebGL canvas yet
        if (!hasCanvas) {
          console.log("Ensuring Three.js is initialized");
          initThreeJS();
        }

        // Show helpful information in the progress indicator for valid n
        progressElem.innerText = "Generating new 3D visualization...";
      }
    }

    // If we get here, n is within allowed range for current view
    updateVisualization(n);
  });

  // Function to update parameter visibility based on selected periodicity
  function updatePeriodicityParams() {
    const p = document.querySelector('input[name="periodicity"]:checked')?.value || 'uniform';
    const isFrozen = (p === 'frozenH' || p === 'frozenV');

    // 2×2, 3×3, and 6x2 weight panels
    document.getElementById('weights-2x2').style.display = (p === '2x2') ? 'block' : 'none';
    document.getElementById('weights-3x3').style.display = (p === '3x3') ? 'block' : 'none';
    document.getElementById('weights-6x2').style.display = (p === '6x2') ? 'block' : 'none';

    // Glauber controls
    const glauberControls = document.getElementById('glauber-controls');
    if (glauberControls) glauberControls.style.display = isFrozen ? 'none' : 'block';
  }

  // Add handlers for periodicity radio buttons
  document.querySelectorAll('input[name="periodicity"]').forEach(radio => {
    radio.addEventListener('change', updatePeriodicityParams);

    // Make sure clicking on labels works too
    const id = radio.id;
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      label.addEventListener('click', () => {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
        updatePeriodicityParams();
      });
    }
  });



  // Ensure correct parameters are visible initially
  setTimeout(updatePeriodicityParams, 0);

  document.getElementById("cancel-btn").addEventListener("click", () => {
    stopSimulation();
  });

  // CSV Download functionality
  document.getElementById("download-csv-btn").addEventListener("click", () => {
    if (!cachedDominoes || cachedDominoes.length === 0) {
      alert("No tiling data available. Generate a tiling first by clicking 'Sample'.");
      return;
    }

    // Create CSV content
    const headers = ["x", "y", "width", "height", "color"];
    const csvContent = [
      headers.join(","),
      ...cachedDominoes.map(domino =>
        [domino.x, domino.y, domino.w, domino.h, domino.color].join(",")
      )
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const n = document.getElementById("n-input").value;
    const periodicity = document.querySelector('input[name="periodicity"]:checked')?.value || 'uniform';
    link.download = `domino_tiling_n${n}_${periodicity}_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // CSV Upload functionality
  document.getElementById("upload-csv-btn").addEventListener("click", () => {
    document.getElementById("upload-csv-input").click();
  });

  document.getElementById("upload-csv-input").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        const lines = csvContent.split("\n").filter(line => line.trim());

        if (lines.length < 2) {
          alert("Invalid CSV file: no data found.");
          return;
        }

        // Parse header
        const headers = lines[0].split(",").map(h => h.trim());
        const expectedHeaders = ["x", "y", "width", "height", "color"];

        if (!expectedHeaders.every(h => headers.includes(h))) {
          alert("Invalid CSV format. Expected headers: " + expectedHeaders.join(", "));
          return;
        }

        // Parse data
        const newDominoes = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          if (values.length !== headers.length) continue;

          const domino = {};
          headers.forEach((header, index) => {
            if (header === "color") {
              domino[header] = values[index];
            } else if (header === "width") {
              domino.w = parseFloat(values[index]);
            } else if (header === "height") {
              domino.h = parseFloat(values[index]);
            } else {
              domino[header] = parseFloat(values[index]);
            }
          });

          // Validate domino data
          if (!isNaN(domino.x) && !isNaN(domino.y) && !isNaN(domino.w) && !isNaN(domino.h) && domino.color) {
            newDominoes.push(domino);
          }
        }

        if (newDominoes.length === 0) {
          alert("No valid domino data found in CSV file.");
          return;
        }

        // Update cached dominoes and refresh visualization
        cachedDominoes = newDominoes;

        // Stop any running simulation
        stopSimulation();

        // Update visualization using existing cached data
        updateVisualizationFromCache();

        alert(`Successfully loaded ${newDominoes.length} dominoes from CSV file.`);

      } catch (error) {
        alert("Error parsing CSV file: " + error.message);
      }
    };

    reader.readAsText(file);
    event.target.value = ""; // Reset file input
  });

  // Demo mode toggle handler
  document.getElementById("demo-mode").addEventListener("change", function() {
    isDemoMode = this.checked;

    if (isDemoMode) {
      // Set to angled demo view
      setDemoViewCamera();
    }
    // When turning off, we just stop rotation but keep the current view
  });

  // Set up demo view camera position
  function setDemoViewCamera() {
    // Reset any existing rotation
    if (dominoGroup) dominoGroup.rotation.set(0, 0, 0);

    // Set to angled view
    camera.position.set(50, 80, 50);
    camera.lookAt(0, 0, 0);
    controls.update();
  }

  // Helper function to convert hex to THREE.js color format
  function hexToThreeColor(hex) {
    return parseInt(hex.replace('#', '0x'));
  }

  // Custom Colors Functionality
  let isCustomColorsVisible = false;
  let currentColors = {
    blue: '#4363d8',
    green: '#1e8c28',
    red: '#ff2244',
    yellow: '#fca414',
    border: '#666666'
  };

  // Custom colors toggle handler
  document.getElementById("custom-colors-btn").addEventListener("click", function() {
    const panel = document.getElementById("custom-colors-panel");
    isCustomColorsVisible = !isCustomColorsVisible;
    panel.style.display = isCustomColorsVisible ? 'block' : 'none';
    this.textContent = isCustomColorsVisible ? 'Hide Custom Colors' : 'Custom Colors';
  });

  // Close custom colors panel
  document.getElementById("close-custom-colors").addEventListener("click", function() {
    const panel = document.getElementById("custom-colors-panel");
    const btn = document.getElementById("custom-colors-btn");
    isCustomColorsVisible = false;
    panel.style.display = 'none';
    btn.textContent = 'Custom Colors';
  });

  // Reset to default colors
  document.getElementById("reset-default-colors").addEventListener("click", function() {
    const defaultColors = {
      blue: '#4363d8',
      green: '#1e8c28',
      red: '#ff2244',
      yellow: '#fca414',
      border: '#666666'
    };

    // Update color inputs
    Object.keys(defaultColors).forEach(colorKey => {
      const colorInput = document.getElementById(`color-${colorKey}`);
      const hexInput = document.getElementById(`hex-${colorKey}`);
      if (colorInput && hexInput) {
        colorInput.value = defaultColors[colorKey];
        hexInput.value = defaultColors[colorKey];
        currentColors[colorKey] = defaultColors[colorKey];
      }
    });

    // Update visualization
    updateColorsInVisualization();
  });

  // Function to update colors in both 2D and 3D visualizations
  function updateColorsInVisualization() {
    // Update 3D visualization if it exists (regardless of which view is active)
    if (dominoGroup && dominoGroup.children.length > 0) {
      // Update 3D materials
      dominoGroup.children.forEach(mesh => {
        if (mesh.material && mesh.userData.originalColor) {
          const colorName = mesh.userData.originalColor;
          if (currentColors[colorName]) {
            const newColor = hexToThreeColor(currentColors[colorName]);
            const showColors = document.getElementById("show-colors-checkbox").checked;
            const monoColor = 0x999999;
            mesh.material.color.setHex(showColors ? newColor : monoColor);
            mesh.material.userData.originalColorValue = newColor;
          }
        }
      });
      // Force a render
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }

    // Update 2D visualization if cached dominoes exist
    if (cachedDominoes && cachedDominoes.length > 0) {
      // Update the 2D display regardless of which view is active
      if (dominoLayer) {
        updateDominoDisplay();
      }
    }
  }

  // Add event listeners for each color input (both color picker and hex input)
  ['blue', 'green', 'red', 'yellow', 'border'].forEach(colorKey => {
    const colorInput = document.getElementById(`color-${colorKey}`);
    const hexInput = document.getElementById(`hex-${colorKey}`);

    // Color picker real-time input handler (fires while dragging in Firefox/macOS)
    colorInput.addEventListener('input', function() {
      const newColor = this.value;
      hexInput.value = newColor;
      currentColors[colorKey] = newColor;
      updateColorsInVisualization();
    });

    // Color picker change handler (fires when picker is closed)
    colorInput.addEventListener('change', function() {
      const newColor = this.value;
      hexInput.value = newColor;
      currentColors[colorKey] = newColor;
      updateColorsInVisualization();
    });

    // Hex input change handler
    hexInput.addEventListener('change', function() {
      const newColor = this.value;
      // Validate hex color format
      if (/^#[0-9A-F]{6}$/i.test(newColor)) {
        colorInput.value = newColor;
        currentColors[colorKey] = newColor;
        updateColorsInVisualization();
      } else {
        // Reset to current color if invalid
        this.value = currentColors[colorKey];
      }
    });

    // Real-time hex input validation and update
    hexInput.addEventListener('input', function() {
      const newColor = this.value;
      if (/^#[0-9A-F]{6}$/i.test(newColor)) {
        colorInput.value = newColor;
        currentColors[colorKey] = newColor;
        updateColorsInVisualization();
      }
    });
  });

  // Palette Selector Functionality
  let currentPaletteIndex = 0;
  let colorPermutation = 0;
  const paletteSelector = document.getElementById('palette-selector');
  const palettePickerGrid = document.getElementById('palettePickerGrid');
  const prevPaletteBtn = document.getElementById('prevPaletteBtn');
  const nextPaletteBtn = document.getElementById('nextPaletteBtn');
  const permuteColorsBtn = document.getElementById('permuteColorsBtn');

  // Color permutation table (6 permutations of 4 colors)
  const permutations = [
    [0, 1, 2, 3], [0, 2, 1, 3], [1, 0, 2, 3],
    [1, 2, 0, 3], [2, 0, 1, 3], [2, 1, 0, 3]
  ];

  function applyPaletteColors(index) {
    if (typeof window.ColorSchemes === 'undefined') return;
    const selectedPalette = window.ColorSchemes[index];
    if (!selectedPalette || !selectedPalette.colors) return;

    // Apply permutation
    const colors = selectedPalette.colors;
    const perm = permutations[colorPermutation % 6];
    const permutedColors = perm.map(i => colors[i] || colors[0]);

    const paletteColors = {
      blue: permutedColors[0] || '#4363d8',
      green: permutedColors[1] || '#1e8c28',
      red: permutedColors[2] || '#ff2244',
      yellow: permutedColors[3] || permutedColors[0] || '#fca414',
      border: permutedColors[3] || '#666666'
    };

    // Update color inputs
    Object.keys(paletteColors).forEach(colorKey => {
      const colorInput = document.getElementById(`color-${colorKey}`);
      const hexInput = document.getElementById(`hex-${colorKey}`);
      if (colorInput && hexInput) {
        colorInput.value = paletteColors[colorKey];
        hexInput.value = paletteColors[colorKey];
        currentColors[colorKey] = paletteColors[colorKey];
      }
    });

    // Update visualization
    updateColorsInVisualization();
  }

  function selectPalette(index) {
    if (typeof window.ColorSchemes === 'undefined') return;
    const numPalettes = window.ColorSchemes.length;
    if (numPalettes === 0) return;

    // Wrap index
    index = ((index % numPalettes) + numPalettes) % numPalettes;
    currentPaletteIndex = index;
    colorPermutation = 0; // Reset permutation when changing palette

    // Update dropdown
    if (paletteSelector) {
      paletteSelector.value = index;
    }

    // Update visual picker grid
    const gridItems = document.querySelectorAll('#palettePickerGrid .palette-item');
    gridItems.forEach((item, i) => {
      item.classList.toggle('active', i === index);
      item.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });

    // Apply colors
    applyPaletteColors(index);
  }
  // Expose to window for cross-script access
  window.selectPalette = selectPalette;

  function initializePaletteSelector() {
    if (typeof window.ColorSchemes === 'undefined') return;

    // Populate the dropdown
    if (paletteSelector) {
      paletteSelector.innerHTML = '';
      window.ColorSchemes.forEach((scheme, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = scheme.name;
        paletteSelector.appendChild(option);
      });

      // Set initial selection
      paletteSelector.value = currentPaletteIndex;

      // Add change listener for immediate apply
      paletteSelector.addEventListener('change', () => {
        selectPalette(parseInt(paletteSelector.value));
      });
    }

    // Prev/Next/Permute buttons
    if (prevPaletteBtn) {
      prevPaletteBtn.addEventListener('click', () => {
        selectPalette(currentPaletteIndex - 1);
      });
    }

    if (nextPaletteBtn) {
      nextPaletteBtn.addEventListener('click', () => {
        selectPalette(currentPaletteIndex + 1);
      });
    }

    if (permuteColorsBtn) {
      permuteColorsBtn.addEventListener('click', () => {
        colorPermutation = (colorPermutation + 1) % 6;
        applyPaletteColors(currentPaletteIndex);
      });
    }

    // Find "Domino Default" palette and select it
    const defaultIndex = window.ColorSchemes.findIndex(p => p.name === 'Domino Default');
    if (defaultIndex >= 0) {
      selectPalette(defaultIndex);
    } else {
      selectPalette(0);
    }
  }

  // Initialize palette selector when ColorSchemes is available
  function waitForColorSchemes() {
    if (typeof window.ColorSchemes !== 'undefined') {
      initializePaletteSelector();
    } else {
      setTimeout(waitForColorSchemes, 100);
    }
  }

  // Start checking when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForColorSchemes);
  } else {
    waitForColorSchemes();
  }

  // Camera movement controls
  document.getElementById("move-up-btn").addEventListener("click", function() {
    // Move camera up relative to current view
    const moveAmount = 5;
    const upVector = new THREE.Vector3(0, 1, 0);
    upVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(upVector, moveAmount);
    controls.target.addScaledVector(upVector, moveAmount);
    controls.update();
  });

  document.getElementById("move-down-btn").addEventListener("click", function() {
    // Move camera down relative to current view
    const moveAmount = 5;
    const upVector = new THREE.Vector3(0, 1, 0);
    upVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(upVector, -moveAmount);
    controls.target.addScaledVector(upVector, -moveAmount);
    controls.update();
  });

  document.getElementById("move-left-btn").addEventListener("click", function() {
    // Move camera left relative to current view
    const moveAmount = 5;
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(rightVector, -moveAmount);
    controls.target.addScaledVector(rightVector, -moveAmount);
    controls.update();
  });

  document.getElementById("move-right-btn").addEventListener("click", function() {
    // Move camera right relative to current view
    const moveAmount = 5;
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(rightVector, moveAmount);
    controls.target.addScaledVector(rightVector, moveAmount);
    controls.update();
  });

  // Reset view button handler
  document.getElementById("reset-view-btn").addEventListener("click", function() {
    if (isDemoMode) {
      setDemoViewCamera();
    } else {
      // Reset camera to initial position
      camera.position.set(0, 130, 0);
      camera.lookAt(0, 0, 0);

      // Reset domino group rotation
      if (dominoGroup) dominoGroup.rotation.set(0, 0, 0);

      controls.update();
    }
  });

  // View toggle handlers
  document.getElementById("view-3d-btn").addEventListener("click", function() {
    const no3D = document.getElementById("no-3d-checkbox").checked;

    // Show 3D view, hide 2D view
    document.getElementById("aztec-canvas").style.display = "block";
    document.getElementById("aztec-2d-canvas").style.display = "none";

    // Update toggle button states
    document.getElementById("view-3d-btn").classList.add("active");
    document.getElementById("view-2d-btn").classList.remove("active");

    // Show/hide appropriate download buttons
    document.getElementById("download-png-btn").style.display = "none";
    document.getElementById("download-pdf-btn").style.display = "none";
    document.getElementById("download-3d-btn").style.display = no3D ? "none" : "inline-block";

    // Set the max n for 3D view
    document.getElementById("n-input").setAttribute("max", "300");

    if (no3D) {
      // Show no 3D message
      const container = document.getElementById('aztec-canvas');
      container.innerHTML = '';
      const messageDiv = document.createElement('div');
      messageDiv.style.width = '100%';
      messageDiv.style.height = '100%';
      messageDiv.style.display = 'flex';
      messageDiv.style.alignItems = 'center';
      messageDiv.style.justifyContent = 'center';
      messageDiv.style.backgroundColor = '#f0f0f0';
      messageDiv.style.border = '1px solid #ccc';
      messageDiv.style.padding = '20px';
      messageDiv.style.boxSizing = 'border-box';
      messageDiv.style.fontSize = '18px';
      messageDiv.style.fontWeight = 'bold';
      messageDiv.style.textAlign = 'center';
      messageDiv.innerHTML = '3D visualization disabled.<br>Uncheck "No 3D" to enable 3D rendering.<br><br>Switch to 2D view to see the visualization.';
      container.appendChild(messageDiv);
      animationActive = false;
    } else {
      // Resume animation for 3D view
      if (!animationActive) {
        animationActive = true;
        animate();
      }
    }

    // Check if the renderer is properly initialized/restored
    const container = document.getElementById('aztec-canvas');
    if (!container.querySelector('canvas')) {

      initThreeJS();

      // If we have cached dominoes, render them again
      if (cachedDominoes && cachedDominoes.length > 0) {
        // For large n, show a message instead
        const n = parseInt(document.getElementById("n-input").value, 10);
        if (n > 300) {
          createLargeTilingMessage();
        } else {
          // Small enough to render in 3D, try to restore
          try {
            const message = document.createElement('div');
            message.style.textAlign = 'center';
            message.style.padding = '20px';
            message.style.fontWeight = 'bold';
            message.innerHTML = 'Restoring 3D visualization...';
            container.appendChild(message);

            // Use setTimeout to allow the UI to update
            setTimeout(() => {
              updateVisualization(n);
            }, 10);
          } catch (e) {

          }
        }
      }
    }

    // If we have cached dominoes, handle the view switch appropriately
    if (cachedDominoes && cachedDominoes.length > 0) {
      const n = parseInt(document.getElementById("n-input").value, 10);

      if (n > 300) {
        // Show message for large n
        const container = document.getElementById('aztec-canvas');
        container.innerHTML = '';
        const messageDiv = document.createElement('div');
        messageDiv.style.width = '100%';
        messageDiv.style.height = '100%';
        messageDiv.style.display = 'flex';
        messageDiv.style.alignItems = 'center';
        messageDiv.style.justifyContent = 'center';
        messageDiv.style.backgroundColor = '#f0f0f0';
        messageDiv.style.border = '1px solid #ccc';
        messageDiv.style.padding = '20px';
        messageDiv.style.boxSizing = 'border-box';
        messageDiv.style.fontSize = '18px';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.textAlign = 'center';
        messageDiv.innerHTML = 'For n > 300, only 2D visualization is available.<br>Switch to the 2D view using the button above.<br><br>To see a 3D visualization, decrease n to 300 or less and click Sample.';
        container.appendChild(messageDiv);

        progressElem.innerText = "Using cached tiling (n > 300 is only available in 2D view)";
        setTimeout(() => { progressElem.innerText = ""; }, 3000);
      } else {
        // For n ≤ 300, show informational message
        progressElem.innerText = "Using cached 3D visualization";
        setTimeout(() => { progressElem.innerText = ""; }, 2000);
      }
    }
  });

  // Global variable to track last rendered order value
  let lastNRendered = null;

  // 2D visualization helper functions
  // Helper: convert a brightness value (0–255) to a hex grayscale string.
  function grayHex(brightness) {
    let hex = Math.round(brightness).toString(16);
    if(hex.length < 2) hex = "0" + hex;
    return "#" + hex + hex + hex;
  }

  // Function to convert color to grayscale based on position
  function getGrayscaleColor(originalColor, d) {
    // Handle undefined or non-string colors
    if (!originalColor) {
      // Default to a medium gray if color is undefined
      return grayHex(150);
    }

    // Special handling for "green" as string
    if (originalColor === "green" ||
        (typeof originalColor === 'string' && originalColor.toLowerCase().includes('green'))) {
      const yParity = Math.floor(d.y) % 4 === 0 ? 0 : 1;
      return grayHex(grayscaleValues.green["p" + yParity]);
    }

    let c;
    try {
      c = d3.color(originalColor);
    } catch (e) {
      return grayHex(150); // Default gray on parsing error
    }

    if (!c) return typeof originalColor === 'string' ? originalColor : grayHex(150);

    let normHex;
    try {
      normHex = c.formatHex().toLowerCase();
    } catch (e) {
      return grayHex(150); // Default gray if format fails
    }

    const isHorizontal = d.w > d.h;

    // For blue or green (horizontal dominoes), use vertical coordinate parity
    if (isHorizontal) {
      const yParity = Math.floor(d.y) % 4 === 0 ? 0 : 1;

      if (normHex === "#0000ff" || normHex === "#4363d8" ||
          (typeof normHex === 'string' && normHex.includes("blue"))) { // blue
        return grayHex(grayscaleValues.blue["p" + yParity]);
      }
      // Green dominoes - check multiple possible formats
      else if (normHex === "#00ff00" || normHex === "#1e8c28" ||
               (typeof normHex === 'string' && normHex.includes("green")) ||
               (c.r !== undefined && c.g !== undefined && c.b !== undefined && c.r < c.g && c.g > c.b)) { // Any mostly-green color
        return grayHex(grayscaleValues.green["p" + yParity]);
      }
    }
    // For red or yellow (vertical dominoes), use horizontal coordinate parity
    else {
      const xParity = Math.floor(d.x) % 4 === 0 ? 0 : 1;

      if (normHex === "#ff0000" || normHex === "#ff2244" ||
          (typeof normHex === 'string' && normHex.includes("red")) ||
          (c.r !== undefined && c.g !== undefined && c.b !== undefined && c.r > c.g && c.r > c.b)) { // red - any reddish color
        return grayHex(grayscaleValues.red["p" + xParity]);
      } else if (normHex === "#ffff00" || normHex === "#fca414" ||
                (typeof normHex === 'string' && normHex.includes("yellow")) ||
                (c.r !== undefined && c.g !== undefined && c.b !== undefined && c.r > 200 && c.g > 200 && c.b < 100)) { // yellow - any yellowish color
        return grayHex(grayscaleValues.yellow["p" + xParity]);
      }
    }

    // For any other color, convert using standard luminance formula
    if (c.r === undefined || c.g === undefined || c.b === undefined) {
      return grayHex(150); // Default gray if color components are missing
    }

    let r = c.r, g = c.g, b = c.b;
    let lum = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
    return grayHex(lum);
  }

  // Setup 2D visualization elements
  const svg2d = d3.select("#aztec-svg-2d")
    .style("touch-action", "none"); // Prevent browser default touch actions
  let initialTransform2d = {}; // Store initial transform parameters for 2D

  // ---- 2‑D layer bookkeeping ----------------------------------------------
  let dominoLayer   = null;   // <g> that holds *only* domino items
  let dominoIndex   = new Map();   // key ↦ {rect,tri,datum}
  let prevDominoKey = null;   // to detect first render

  function key2D(d){      // unique key → bottom‑left lattice coord
    return `${d.x}|${d.y}`;
  }

  // Create zoom behavior for 2D
  const zoom2d = d3.zoom()
    .scaleExtent([0.001, 50]) // Min and max zoom scale
    .on("zoom", (event) => {
      if (!initialTransform2d.scale) return; // Skip if no initial transform is set

      // Apply the zoom transformation on top of initial transform
      const group = svg2d.select("g");
      const t = event.transform;
      group.attr("transform",
        `translate(${initialTransform2d.translateX * t.k + t.x},${initialTransform2d.translateY * t.k + t.y}) scale(${initialTransform2d.scale * t.k})`);
    });

  // Enable zoom on the 2D SVG
  svg2d.call(zoom2d);

  // Add double-click to reset zoom for 2D
  svg2d.on("dblclick.zoom", () => {
    svg2d.transition()
      .duration(750)
      .call(zoom2d.transform, d3.zoomIdentity);
  });

  // Add event listeners for 2D zoom controls
  document.getElementById("zoom-in-btn-2d").addEventListener("click", () => {
    svg2d.transition()
      .duration(300)
      .call(zoom2d.scaleBy, 1.3);
  });

  document.getElementById("zoom-out-btn-2d").addEventListener("click", () => {
    svg2d.transition()
      .duration(300)
      .call(zoom2d.scaleBy, 0.7);
  });

  document.getElementById("zoom-reset-btn-2d").addEventListener("click", () => {
    if (initialTransform2d.scale) {
      svg2d.transition()
        .duration(300)
        .call(zoom2d.transform, d3.zoomIdentity);
    }
  });

  // Grayscale values are now hardcoded, no interactive controls needed

  // Hardcoded grayscale values
  const grayscaleValues = {
    blue: { p0: 100, p1: 253 },
    green: { p0: 243, p1: 80 },
    red: { p0: 150, p1: 10 },
    yellow: { p0: 20, p1: 170 }
  };

  // No interactive controls needed with hardcoded values

  // 2D grayscale toggle handler
  document.getElementById("grayscale-checkbox-2d").addEventListener("change", function() {
    updateDominoDisplay();
  });

  // Checkerboard overlay toggle handler
  document.getElementById("checkerboard-checkbox-2d").addEventListener("change", function() {
    updateDominoDisplay();
  });

  // Border width input handler - update immediately on input
  document.getElementById("border-width-input").addEventListener("input", function() {
    updateDominoDisplay();
  });

  // Nonintersecting paths toggle handler
  document.getElementById("paths-checkbox-2d").addEventListener("change", function() {
    updateDominoDisplay();
  });

  // Dimers toggle handler
  document.getElementById("dimers-checkbox-2d").addEventListener("change", function() {
    updateDominoDisplay();
  });

  // Height function toggle handler
  document.getElementById("height-function-checkbox-2d").addEventListener("change", function() {
    useHeightFunction = this.checked;
    updateDominoDisplay();
  });

  // Function to determine if a lattice face (2x2 square) is part of the checkerboard pattern
  function getCheckerboardPattern(d) {
    // Dominoes are 2x4 (horizontal) or 4x2 (vertical)
    // We want to create a checkerboard pattern on the underlying 2x2 lattice faces

    // Get the position of each lattice face (2x2 square)
    // For a horizontal domino (2x4), it covers 2 lattice faces
    // For a vertical domino (4x2), it also covers 2 lattice faces

    // Convert domino coordinates to lattice coordinates (each lattice face is 2x2)
    const latticeX = Math.floor(d.x / 2);
    const latticeY = Math.floor(d.y / 2);

    // Traditional checkerboard pattern on the lattice
    // True if the sum of lattice coordinates is even
    return (latticeX + latticeY) % 2 === 0;
  }

  // Function to update domino display based on various display settings
  function updateDominoDisplay() {
    const useGrayscale = document.getElementById("grayscale-checkbox-2d").checked;
    const showCheckerboard = document.getElementById("checkerboard-checkbox-2d").checked;
    const showPaths = document.getElementById("paths-checkbox-2d").checked;
    const showDimers = document.getElementById("dimers-checkbox-2d").checked;
    const showColors = document.getElementById("show-colors-checkbox").checked;
    const monoColor = "#F8F8F8"; // Extremely light monochrome color

    // First, make sure we have a persistent layer to work with
    if (!dominoLayer) return;

    // Remove any existing overlays
    dominoLayer.selectAll(".checkerboard-square").remove();
    dominoLayer.selectAll(".path-line").remove();
    dominoLayer.selectAll(".dimer-circle").remove();
    dominoLayer.selectAll(".dimer-line").remove();
    dominoLayer.selectAll(".height-node").remove();
    dominoLayer.selectAll(".height-label").remove();

    // Get the current border thickness value
    const borderWidth = parseFloat(document.getElementById("border-width-input").value) || 0.1;

    // Toggle colors between normal and grayscale for the dominoes and update border width
    // Use dominoIndex for fast direct access to each domino's rect and tri objects
    dominoIndex.forEach((domino, key) => {
      const d = domino.datum;

      // Set fill color based on settings
      let fill;
      if (!showColors) {
        fill = monoColor;
      } else if (useGrayscale) {
        fill = getGrayscaleColor(d.color, d);
      } else {
        // Use custom colors if available, otherwise fall back to original color
        fill = currentColors[d.color] || d.color;
      }

      // Apply styling directly to the rectangle
      domino.rect
        .attr("fill", fill)
        .attr("stroke", currentColors.border || "#000")
        .attr("stroke-width", borderWidth);
    });

    // If checkerboard is enabled, draw 2x2 lattice squares
    if (showCheckerboard) {
      // Create a set of all 2x2 lattice faces used by the dominoes
      const latticeSet = new Set();
      const latticeSquares = [];

      // First, collect all the 2x2 lattice face positions from our indexed dominoes
      dominoIndex.forEach((domino, key) => {
        const d = domino.datum;
        // For a horizontal domino (2x4), it covers 2 lattice faces side by side
        // For a vertical domino (4x2), it covers 2 lattice faces one above the other

        const isHorizontal = d.w > d.h;

        if (isHorizontal) {
          // Horizontal domino covers 2 faces horizontally
          const leftX = Math.floor(d.x / 2) * 2;
          const y = Math.floor(d.y / 2) * 2;

          // Add both lattice faces
          const leftKey = `${leftX},${y}`;
          const rightKey = `${leftX + 2},${y}`;

          if (!latticeSet.has(leftKey)) {
            latticeSet.add(leftKey);
            latticeSquares.push({x: leftX, y: y, size: 2});
          }

          if (!latticeSet.has(rightKey)) {
            latticeSet.add(rightKey);
            latticeSquares.push({x: leftX + 2, y: y, size: 2});
          }
        } else {
          // Vertical domino covers 2 faces vertically
          const x = Math.floor(d.x / 2) * 2;
          const topY = Math.floor(d.y / 2) * 2;

          // Add both lattice faces
          const topKey = `${x},${topY}`;
          const bottomKey = `${x},${topY + 2}`;

          if (!latticeSet.has(topKey)) {
            latticeSet.add(topKey);
            latticeSquares.push({x: x, y: topY, size: 2});
          }

          if (!latticeSet.has(bottomKey)) {
            latticeSet.add(bottomKey);
            latticeSquares.push({x: x, y: topY + 2, size: 2});
          }
        }
      });

      // Now draw all the lattice faces with checkerboard pattern
      dominoLayer.selectAll(".checkerboard-square")
          .data(latticeSquares)
          .enter()
          .append("rect")
          .attr("class", "checkerboard-square")
          .attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("width", d => d.size)
          .attr("height", d => d.size)
          .attr("fill", function(d) {
            // Create checkerboard pattern based on lattice coordinates
            const isBlack = ((d.x / 2) + (d.y / 2)) % 2 === 0;
            return isBlack ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0)"; // Black or transparent
          })
          .attr("pointer-events", "none"); // Allow clicking through to the dominoes
    }

    // If nonintersecting paths are enabled, draw them
    if (showPaths) {
      // Create paths based on domino type and orientation
      const pathSegments = [];

      // Process each domino from our index
      dominoIndex.forEach((domino, key) => {
        const d = domino.datum;
        const isHorizontal = d.w > d.h;
        const color = d.color;

        // Calculate center points
        const centerX = d.x + d.w/2;
        const centerY = d.y + d.h/2;

        // Get color type
        let colorType = "";
        if (isHorizontal) {
          if (typeof color === 'string' && (color.includes("green") || color === "#1e8c28" || color === "#00ff00")) {
            colorType = "green";
          } else if (typeof color === 'string' && (color.includes("blue") || color === "#4363d8" || color === "#0000ff")) {
            colorType = "blue";
          }
        } else {
          if (typeof color === 'string' && (color.includes("yellow") || color === "#fca414" || color === "#ffff00")) {
            colorType = "yellow";
          } else if (typeof color === 'string' && (color.includes("red") || color === "#ff2244" || color === "#ff0000")) {
            colorType = "red";
          }
        }

        if (isHorizontal && colorType === "green") {
          // Green horizontal domino - horizontal path through center
          // Draw a horizontal line through the center of the green domino
          pathSegments.push({
            x1: d.x, // left edge
            y1: centerY,
            x2: d.x + d.w, // right edge
            y2: centerY,
            color: "black" // All paths are black now
          });
        }
        else if (!isHorizontal) {
          // For vertical dominoes (yellow or red)
          const centerX = d.x + d.w/2; // center X
          const centerY = d.y + d.h/2; // center Y
          const tileWidth = d.w;  // width of the domino
          const tileHeight = d.h; // height of the domino

          // Calculate path length through the center (maintaining 45° angle)
          // For 45° angle, we need equal horizontal and vertical components
          // We'll use the smaller of width/2 and height/2 to ensure we maintain the angle
          // but scaled appropriately to make the path go through most of the tile
          const pathHalfLength = Math.min(tileWidth, tileHeight) * 1.2; // Slightly longer to ensure it crosses the tile

          if (colorType === "yellow") {
            // Yellow vertical domino - up-right 45° diagonal through center
            pathSegments.push({
              x1: centerX - pathHalfLength/2,
              y1: centerY + pathHalfLength/2, // Adding because y increases downward in SVG
              x2: centerX + pathHalfLength/2,
              y2: centerY - pathHalfLength/2, // Subtracting because y increases downward in SVG
              color: "black"
            });
          }
          else if (colorType === "red") {
            // Red vertical domino - down-right 45° diagonal through center
            pathSegments.push({
              x1: centerX - pathHalfLength/2,
              y1: centerY - pathHalfLength/2, // Subtracting because y increases downward in SVG
              x2: centerX + pathHalfLength/2,
              y2: centerY + pathHalfLength/2, // Adding because y increases downward in SVG
              color: "black"
            });
          }
        }
      });

      // Draw all path segments
      dominoLayer.selectAll(".path-line")
          .data(pathSegments)
          .enter()
          .append("line")
          .attr("class", "path-line")
          .attr("x1", d => d.x1)
          .attr("y1", d => d.y1)
          .attr("x2", d => d.x2)
          .attr("y2", d => d.y2)
          .attr("stroke", "black") // All paths are black now
          .attr("stroke-width", 0.6)
          .attr("pointer-events", "none"); // Allow clicking through to dominoes
    }

    // If dimers are enabled, draw them
    if (showDimers) {
      // Use dominoes from our index
      const dominoes = [];
      dominoIndex.forEach((domino, key) => {
        const d = domino.datum;
        // Only add dominoes with valid coordinates
        if (d && typeof d.x === 'number' && typeof d.y === 'number' &&
            typeof d.w === 'number' && typeof d.h === 'number' &&
            !isNaN(d.x) && !isNaN(d.y) && !isNaN(d.w) && !isNaN(d.h)) {
          dominoes.push(d);
        }
      });

      // Create dimer representations
      const dimerNodes = [];
      const dimerEdges = [];

      // Process each domino to create dimer edges and nodes
      dominoes.forEach(d => {
        // Skip dominoes with invalid dimensions
        if (d.w <= 0 || d.h <= 0) return;

        const isHorizontal = d.w > d.h;

        // For each domino, we'll add two nodes and one edge connecting them
        // The dimer length should be half the long side of the domino

        try {
          if (isHorizontal) {
            // Horizontal domino (blue or green)
            const centerX = d.x + d.w/2;  // Center of the domino
            const midY = d.y + d.h/2;     // Vertical center

            // Calculate dimer length (half the domino width)
            const dimerLength = d.w / 2;

            // Place nodes at the midpoints between center and edges
            const leftX = centerX - dimerLength/2;
            const rightX = centerX + dimerLength/2;

            // Validate all coordinates are numbers and not NaN
            if (isNaN(leftX) || isNaN(rightX) || isNaN(midY)) return;

            // Add nodes
            const leftNode = {
              x: leftX,
              y: midY,
              radius: 0.4 // Radius for node circles
            };

            const rightNode = {
              x: rightX,
              y: midY,
              radius: 0.4
            };

            dimerNodes.push(leftNode, rightNode);

            // Add edge connecting the two nodes
            dimerEdges.push({
              x1: leftX,
              y1: midY,
              x2: rightX,
              y2: midY
            });

          } else {
            // Vertical domino (red or yellow)
            const midX = d.x + d.w/2;     // Horizontal center
            const centerY = d.y + d.h/2;  // Center of the domino

            // Calculate dimer length (half the domino height)
            const dimerLength = d.h / 2;

            // Place nodes at the midpoints between center and edges
            const topY = centerY - dimerLength/2;
            const bottomY = centerY + dimerLength/2;

            // Validate all coordinates are numbers and not NaN
            if (isNaN(midX) || isNaN(topY) || isNaN(bottomY)) return;

            // Add nodes
            const topNode = {
              x: midX,
              y: topY,
              radius: 0.4
            };

            const bottomNode = {
              x: midX,
              y: bottomY,
              radius: 0.4
            };

            dimerNodes.push(topNode, bottomNode);

            // Add edge connecting the two nodes
            dimerEdges.push({
              x1: midX,
              y1: topY,
              x2: midX,
              y2: bottomY
            });
          }
        } catch (e) {

        }
      });

      // Additional validation for all dimer edges and nodes
      const validDimerEdges = dimerEdges.filter(d =>
        typeof d.x1 === 'number' && !isNaN(d.x1) &&
        typeof d.y1 === 'number' && !isNaN(d.y1) &&
        typeof d.x2 === 'number' && !isNaN(d.x2) &&
        typeof d.y2 === 'number' && !isNaN(d.y2)
      );

      const validDimerNodes = dimerNodes.filter(d =>
        typeof d.x === 'number' && !isNaN(d.x) &&
        typeof d.y === 'number' && !isNaN(d.y) &&
        typeof d.radius === 'number' && !isNaN(d.radius)
      );

      // Draw dimer edges and nodes

      // First draw edges (lines)
      dominoLayer.selectAll(".dimer-line")
          .data(validDimerEdges)
          .enter()
          .append("line")
          .attr("class", "dimer-line")
          .attr("x1", d => d.x1)
          .attr("y1", d => d.y1)
          .attr("x2", d => d.x2)
          .attr("y2", d => d.y2)
          .attr("stroke", "black")
          .attr("stroke-width", 0.3)
          .attr("pointer-events", "none");

      // Then draw nodes (circles)
      dominoLayer.selectAll(".dimer-circle")
          .data(validDimerNodes)
          .enter()
          .append("circle")
          .attr("class", "dimer-circle")
          .attr("cx", d => d.x)
          .attr("cy", d => d.y)
          .attr("r", d => d.radius)
          .attr("fill", "black")
          .attr("stroke", "none")
          .attr("pointer-events", "none");
    }

    // If height function is enabled, draw it last so it appears on top
    useHeightFunction = document.getElementById("height-function-checkbox-2d").checked;
    if (useHeightFunction) {
      toggleHeightFunction();
      // The height function is already set to raise() internally
    }
  }

  // Function to toggle height function on/off
  function toggleHeightFunction() {
    // Remove any existing height function elements
    if (!dominoLayer) return;
    dominoLayer.selectAll(".height-label,.height-node,.oldHeightBubble,.height-function-group").remove();

    // If height function is not enabled or n > 30, just return
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (!useHeightFunction || n > 30 || !cachedDominoes || cachedDominoes.length === 0) return;

    // Make sure we use cached dominoes directly which has known good coordinates
    // rather than trying to collect them from the display which might have NaN issues
    const dominoes = [...cachedDominoes];

    // 1. Determine lattice unit (scaling factor)
    const minSidePx = Math.min(...dominoes.map(d => Math.min(d.w, d.h)));
    const unit = minSidePx / 2; // 2 lattice units → 1 short side
    if (unit <= 0) return;

    // 2. Convert each domino to (orient, sign, gx, gy)
    const dominoData = dominoes.map(d => {
      const horiz = d.w > d.h;
      const orient = horiz ? 0 : 1;
      const sign = horiz
        ? (d.color === "green" ? -1 : 1)   // horizontal: green = −1, blue = +1
        : (d.color === "yellow" ? -1 : 1);  // vertical: yellow = −1, red = +1
      const gx = Math.round(d.x / unit);   // lattice coordinates
      const gy = Math.round(d.y / unit);
      return [orient, sign, gx, gy];
    });

    // 3. Build graph with height increments
    const adj = new Map();

    function addEdge(v1, v2, dh) {
      const v1Key = `${v1},${v2}` === v1 ? v1 : `${v1[0]},${v1[1]}`;
      const v2Key = `${v1},${v2}` === v2 ? v2 : `${v2[0]},${v2[1]}`;

      if (!adj.has(v1Key)) adj.set(v1Key, []);
      if (!adj.has(v2Key)) adj.set(v2Key, []);

      adj.get(v1Key).push([v2Key, dh]);
      adj.get(v2Key).push([v1Key, -dh]);
    }

    dominoData.forEach(([o, s, x, y]) => {
      if (o === 0) { // horizontal (4×2)
        const TL = [x, y+2], TM = [x+2, y+2], TR = [x+4, y+2];
        const BL = [x, y], BM = [x+2, y], BR = [x+4, y];

        addEdge(TL, TM, -s); addEdge(TM, TR, s);
        addEdge(BL, BM, s); addEdge(BM, BR, -s);
        addEdge(TL, BL, s); addEdge(TM, BM, 3*s);
        addEdge(TR, BR, s);
      } else { // vertical (2×4)
        const TL = [x, y+4], TR = [x+2, y+4];
        const ML = [x, y+2], MR = [x+2, y+2];
        const BL = [x, y], BR = [x+2, y];

        addEdge(TL, TR, -s); addEdge(ML, MR, -3*s); addEdge(BL, BR, -s);
        addEdge(TL, ML, s); addEdge(ML, BL, -s);
        addEdge(TR, MR, -s); addEdge(MR, BR, s);
      }
    });

    // 4. Breadth-first integration of heights
    const verts = Array.from(adj.keys()).map(k => {
      const [gx, gy] = k.split(',').map(Number);
      return {k, gx, gy};
    });

    // Find the "bottom-left" vertex as the root
    const root = verts.reduce((a, b) =>
      (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b
    ).k;

    const heights = new Map([[root, 0]]);
    const queue = [root];

    while (queue.length > 0) {
      const v = queue.shift();
      for (const [w, dh] of adj.get(v)) {
        if (!heights.has(w)) {
          heights.set(w, heights.get(v) + dh);
          queue.push(w);
        }
      }
    }

    // 5. Calculate font size based on n value (smaller font for larger n)
    const fontSize = Math.max(0.8, Math.min(1.2, 3.6 - n / 20.0))/1.0; // n = order

    // 6. Render just the numbers in pixels
    // Create a group for the height function labels
    const heightLabelsGroup = dominoLayer.append("g")
        .attr("class", "height-function-group");

    heights.forEach((h, key) => {
      const [gx, gy] = key.split(',').map(Number);
      const px = gx * unit, py = gy * unit;  // back to pixels

      // Add just the height value (text only, no circles)
      heightLabelsGroup.append("text")
        .attr("class", "height-label")
        .attr("x", px)
        .attr("y", py)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", `${fontSize}px`)
        .text(-h); // Negate height as per the requirements
    });

    // Make height function appear above everything else
    heightLabelsGroup.raise();
  }

  // Helper function to check if a domino is horizontal
  function isHorizontalDomino(d) {
    return d.w > d.h;
  }

  // Global color toggle handler
  document.getElementById("show-colors-checkbox").addEventListener("change", function() {
    const showColors = this.checked; // Get the current state of the checkbox


    // Update 2D view if it exists
    const svg2dGroup = svg2d.select("g");
    if (!svg2dGroup.empty()) {
      updateDominoDisplay();
    }

    // Update 3D view if it exists and we're not in a large tiling case
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (n <= 300 && dominoGroup && dominoGroup.children && dominoGroup.children.length > 0) {
      const monoColor3D = 0x999999;

      // Use current custom colors instead of hardcoded colors
      const domino3DColors = {
        blue:   hexToThreeColor(currentColors.blue),
        green:  hexToThreeColor(currentColors.green),
        red:    hexToThreeColor(currentColors.red),
        yellow: hexToThreeColor(currentColors.yellow)
      };

      const showGradient = document.getElementById("height-gradient-checkbox").checked;

      // Update all meshes in the domino group
      dominoGroup.children.forEach(mesh => {
        if (mesh.material) {
          if (!showColors) {
            // Set to monochrome
            mesh.material.color.setHex(monoColor3D);
          } else if (showGradient && mesh.material.userData && mesh.material.userData.gradientColorValue) {
            // Use gradient color if available
            mesh.material.color.setHex(mesh.material.userData.gradientColorValue);
          } else {
            // Try to get the color from userData first (direct hex value)
            if (mesh.material.userData && mesh.material.userData.originalColorValue) {
              mesh.material.color.setHex(mesh.material.userData.originalColorValue);
            } else {
              // Fall back to the color name method
              const colorName = mesh.userData.originalColor || "blue";
              if (domino3DColors[colorName]) {
                mesh.material.color.setHex(domino3DColors[colorName]);
              } else {
                // Fallback for unknown colors
                mesh.material.color.setHex(0x808080);
              }
            }
          }
        }
      });

      // Force a render update
      if (renderer) {
        renderer.render(scene, camera);
      }
    }
  });

  // Height gradient toggle handler
  document.getElementById("height-gradient-checkbox").addEventListener("change", function() {
    const showGradient = this.checked;
    const showColors = document.getElementById("show-colors-checkbox").checked;

    // Update 3D view if it exists and colors are shown
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (n <= 300 && dominoGroup && dominoGroup.children && dominoGroup.children.length > 0) {
      dominoGroup.children.forEach(mesh => {
        if (mesh.material && showColors) {
          if (showGradient && mesh.material.userData && mesh.material.userData.gradientColorValue) {
            mesh.material.color.setHex(mesh.material.userData.gradientColorValue);
          } else if (mesh.material.userData && mesh.material.userData.originalColorValue) {
            mesh.material.color.setHex(mesh.material.userData.originalColorValue);
          }
        }
      });

      // Force a render update
      if (renderer) {
        renderer.render(scene, camera);
      }
    }
  });

  // Function to render dominoes in 2D view
  async function render2D(dominoes){
    if(!dominoes?.length) return;

    /* -------- Initial build --------------------------------------------- */
    if(!dominoLayer){
      // build once
      svg2d.selectAll("g").remove();          // scrap stray stuff from old versions
      dominoLayer = svg2d.append("g")
                         .attr("class","domino-layer");
    }

    /* -------- Compute /‑‑‑only‑on‑first‑render‑or‑n‑change‑‑‑/ ------------------------ */
    // Check if this is first render or n has changed
    const currentN = parseInt(document.getElementById('n-input').value, 10);
    let needInitialTransform = prevDominoKey === null || currentN !== lastNRendered;

    if (needInitialTransform) {
      const minX = d3.min(dominoes,d=>d.x),
            minY = d3.min(dominoes,d=>d.y),
            maxX = d3.max(dominoes,d=>d.x+d.w),
            maxY = d3.max(dominoes,d=>d.y+d.h);

      const box   = svg2d.node().getBoundingClientRect(),
            scale = Math.min(box.width /(maxX-minX),
                            box.height/(maxY-minY))*0.9,
            tx    = (box.width  -(maxX-minX)*scale)/2 - minX*scale,
            ty    = (box.height -(maxY-minY)*scale)/2 - minY*scale
                    - box.height*0.04;                   // vertical shift

      dominoLayer.attr("transform",`translate(${tx},${ty}) scale(${scale})`);

      // Save initial transform values for zoom behavior
      initialTransform2d = {
        translateX: tx,
        translateY: ty,
        scale: scale
      };

      // Update lastNRendered
      lastNRendered = currentN;
    } else {
      /* dominoLayer already exists ⇒ keep whatever transform/zoom
         the user currently has.  Nothing to do here. */
    }

    /* -------- Data‑join -------------------------------------------------- */
    // join by bottom‑left coordinate
    const join = dominoLayer.selectAll("g.dom")
                  .data(dominoes,key2D);

    // EXIT – remove gone dominoes
    join.exit().each(function(d){
        const k = key2D(d);
        dominoIndex.delete(k);
      }).remove();

    // ENTER – new domino container
    const gEnter = join.enter()
          .append("g").attr("class","dom");

    //  ► rect
    gEnter.append("rect");

    // UPDATE + ENTER
    const gAll = gEnter.merge(join);

    gAll.each(function(d){
       const k = key2D(d), g = d3.select(this);
       // ----------------------------------------------------------------- rect
       g.select("rect")
        .attr("x",d.x).attr("y",d.y)
        .attr("width",d.w).attr("height",d.h)
        .attr("stroke", currentColors.border || "#000");      // use custom border color

       // store reference for lightning‑fast single‑domino tweaks later if needed
       dominoIndex.set(k,{rect:g.select("rect"),datum:d});
    });

    // Mark that we've done a render by setting prevDominoKey
    prevDominoKey = dominoes.length > 0 ? key2D(dominoes[0]) : "empty";

    // apply current colouring / overlays
    updateDominoDisplay();
  }

  document.getElementById("view-2d-btn").addEventListener("click", function() {
    // Show 2D view, hide 3D view
    document.getElementById("aztec-canvas").style.display = "none";
    document.getElementById("aztec-2d-canvas").style.display = "block";

    // Update toggle button states
    document.getElementById("view-3d-btn").classList.remove("active");
    document.getElementById("view-2d-btn").classList.add("active");

    // Show/hide appropriate download buttons
    document.getElementById("download-png-btn").style.display = "inline-block";
    document.getElementById("download-pdf-btn").style.display = "inline-block";
    document.getElementById("download-3d-btn").style.display = "none";

    // Set the max n for 2D view
    document.getElementById("n-input").setAttribute("max", "500");

    // Always reuse the cached dominoes if we have them
    if (cachedDominoes && cachedDominoes.length > 0) {
      // Force re-centering if we've switched viewmodes
      const currentN = parseInt(document.getElementById('n-input').value, 10);
      if (lastNRendered !== currentN) {
        lastNRendered = null; // Force a recalculation of the transform
      }

      render2D(cachedDominoes);

      // If we're switching from 3D to 2D, update the progress indicator
      const n = parseInt(document.getElementById("n-input").value, 10);
      if (n > 300) {
        progressElem.innerText = "Using cached tiling (n > 300 is only available in 2D view)";
        setTimeout(() => { progressElem.innerText = ""; }, 3000);
      } else {
        progressElem.innerText = "Using cached tiling";
        setTimeout(() => { progressElem.innerText = ""; }, 2000);
      }
    }

    // Pause 3D animation to save resources
    animationActive = false;
  });

  // No 3D checkbox event listener
  document.getElementById("no-3d-checkbox").addEventListener("change", function() {
    const is3DView = document.getElementById("view-3d-btn").classList.contains("active");
    if (is3DView) {
      // If we're in 3D view, trigger the 3D button click to update the display
      document.getElementById("view-3d-btn").click();
    }
  });

  // ========================================================================
  // Keyboard Shortcuts Help Modal
  // ========================================================================
  const keyboardHelpModal = document.getElementById('keyboard-help-modal');
  const closeKeyboardHelpBtn = document.getElementById('close-keyboard-help');

  function showKeyboardHelp() {
    keyboardHelpModal.classList.add('visible');
  }

  function hideKeyboardHelp() {
    keyboardHelpModal.classList.remove('visible');
  }

  closeKeyboardHelpBtn.addEventListener('click', hideKeyboardHelp);
  keyboardHelpModal.addEventListener('click', function(e) {
    if (e.target === keyboardHelpModal) hideKeyboardHelp();
  });
  document.getElementById('help-btn')?.addEventListener('click', showKeyboardHelp);

  // ========================================================================
  // URL State Serialization (Share Link)
  // ========================================================================
  function toUrlSafeBase64(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function serializeStateToUrl() {
    const params = new URLSearchParams();
    const n = document.getElementById('n-input').value;
    const periodicitySelect = document.getElementById('periodicity-select');
    const periodicity = periodicitySelect ? periodicitySelect.value : 'uniform';

    params.set('n', n);
    if (periodicity !== 'uniform') params.set('p', periodicity);

    // Add 2x2 or 3x3 weights if applicable
    if (periodicity === '2x2') {
      const a = document.getElementById('weight-a')?.value;
      const b = document.getElementById('weight-b')?.value;
      if (a) params.set('a', a);
      if (b) params.set('b', b);
    }

    return window.location.origin + window.location.pathname + '?' + params.toString();
  }

  function copyShareLink() {
    const url = serializeStateToUrl();
    const linkCopiedMsg = document.getElementById('link-copied-msg');
    navigator.clipboard.writeText(url).then(function() {
      linkCopiedMsg.style.display = 'inline';
      setTimeout(function() { linkCopiedMsg.style.display = 'none'; }, 2000);
    }).catch(function() {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      linkCopiedMsg.style.display = 'inline';
      setTimeout(function() { linkCopiedMsg.style.display = 'none'; }, 2000);
    });
  }

  document.getElementById('copy-link-btn').addEventListener('click', copyShareLink);

  // Load state from URL on page load
  (function loadStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('n')) {
      document.getElementById('n-input').value = params.get('n');
    }
    if (params.has('p')) {
      const periodicitySelect = document.getElementById('periodicity-select');
      if (periodicitySelect) periodicitySelect.value = params.get('p');
    }
    if (params.has('a')) {
      const weightA = document.getElementById('weight-a');
      if (weightA) weightA.value = params.get('a');
    }
    if (params.has('b')) {
      const weightB = document.getElementById('weight-b');
      if (weightB) weightB.value = params.get('b');
    }
  })();

  // ========================================================================
  // Enhanced Keyboard Controls
  // ========================================================================
  window.addEventListener('keydown', function(event) {
    // Ignore if typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
      return;
    }

    const key = event.key.toLowerCase();
    const moveAmount = 5;

    // Help modal
    if (key === '?' || (event.shiftKey && key === '/')) {
      event.preventDefault();
      showKeyboardHelp();
      return;
    }

    // Close dialogs
    if (key === 'escape') {
      hideKeyboardHelp();
      return;
    }

    // Sample
    if (key === 's' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      document.getElementById('sample-btn').click();
      return;
    }

    // Glauber toggle
    if (key === 'g') {
      event.preventDefault();
      document.getElementById('glauber-btn').click();
      return;
    }

    // View toggle
    if (key === '2') {
      event.preventDefault();
      document.getElementById('view-2d-btn').click();
      return;
    }
    if (key === '3') {
      event.preventDefault();
      document.getElementById('view-3d-btn').click();
      return;
    }

    // Palette navigation (use [ and ] since arrows are used for camera)
    if (key === '[') {
      event.preventDefault();
      document.getElementById('prevPaletteBtn').click();
      return;
    }
    if (key === ']') {
      event.preventDefault();
      document.getElementById('nextPaletteBtn').click();
      return;
    }

    // Arrow keys for camera movement (in 3D view)
    if (event.key === 'ArrowUp') {
      const upVector = new THREE.Vector3(0, 1, 0);
      upVector.applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(upVector, moveAmount);
      controls.target.addScaledVector(upVector, moveAmount);
      controls.update();
    }
    else if (event.key === 'ArrowDown') {
      const upVector = new THREE.Vector3(0, 1, 0);
      upVector.applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(upVector, -moveAmount);
      controls.target.addScaledVector(upVector, -moveAmount);
      controls.update();
    }
    else if (event.key === 'ArrowLeft') {
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(rightVector, -moveAmount);
      controls.target.addScaledVector(rightVector, -moveAmount);
      controls.update();
    }
    else if (event.key === 'ArrowRight') {
      const rightVector = new THREE.Vector3(1, 0, 0);
      rightVector.applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(rightVector, moveAmount);
      controls.target.addScaledVector(rightVector, moveAmount);
      controls.update();
    }
    // 'R' key to reset view
    else if (key === 'r' && !event.ctrlKey && !event.metaKey) {
      document.getElementById("reset-view-btn").click();
    }
    // 'D' key to toggle demo mode
    else if (key === 'd' && !event.ctrlKey && !event.metaKey) {
      const demoCheckbox = document.getElementById('demo-mode');
      demoCheckbox.checked = !demoCheckbox.checked;
      demoCheckbox.dispatchEvent(new Event('change'));
    }
  });

  // Function to update height function visibility based on n value
  function updateHeightFunctionVisibility(n) {
    const heightFunctionToggle = document.getElementById("height-function-toggle-container");
    if (heightFunctionToggle) {
      if (n > 30) {
        // Hide height function toggle for large n values
        heightFunctionToggle.style.display = "none";
        // Reset state if it was enabled
        if (useHeightFunction) {
          useHeightFunction = false;
          document.getElementById("height-function-checkbox-2d").checked = false;
        }
      } else {
        // Show height function toggle for smaller n
        heightFunctionToggle.style.display = "block";
      }
    }
  }

  /* First sample loader – extra robust for iOS Safari
   ------------------------------------------------
   ①  Wait for the 'load' event (DOM *and* CSS finished).
   ②  Add extra delay for iOS to be absolutely sure.
   ③  Wait until #aztec‑canvas has a non‑zero size (layout stabilised).
   ④  Only then run updateVisualization.                                */

  function firstSampleWhenReady() {
    // 1. container for 3‑D view
    const container = document.getElementById('aztec-canvas');

    // 2. if it is still collapsed (0×0), try again on next frame
    if (!container || !container.clientWidth || !container.clientHeight) {
      return requestAnimationFrame(firstSampleWhenReady);
    }


    // 3. everything is ready – launch the initial sample
    const n = parseInt(document.getElementById("n-input").value, 10) || 12;
    updateHeightFunctionVisibility(n);

    // Add visible loading indicator before starting
    const progressElem = document.getElementById("progress-indicator");
    if (progressElem) progressElem.innerText = "Initializing...";

    // Use a short timeout to ensure UI updates before heavy computation
    setTimeout(() => {
      updateVisualization(n);
    }, 50);
  }

  // Make sure we also explicitly update any time the pane becomes visible
  function ensureVisualization() {
    if (document.visibilityState === 'visible' && cachedDominoes && cachedDominoes.length > 0) {

      const n = parseInt(document.getElementById("n-input").value, 10) || 12;
      // If we're in 2D view, re-render it
      if (document.getElementById("view-2d-btn").classList.contains("active")) {
        render2D(cachedDominoes);
      }
    }
  }

  // Listen for visibility changes (useful for iOS)
  document.addEventListener('visibilitychange', ensureVisualization);

  // Add a small delay for iOS to ensure everything is truly ready
  function initWithIOSDelay() {

    // Extra delay for iOS (300ms has proven reliable on most devices)
    setTimeout(firstSampleWhenReady, 300);
  }

  // run after full page load with additional safety delay
  if (document.readyState === 'complete') {
    initWithIOSDelay();
  } else {
    window.addEventListener('load', initWithIOSDelay, { once: true });
  }

  // SVG to TikZ conversion function
  function svgToTikZ() {
    if (!cachedDominoes || cachedDominoes.length === 0) {
      alert("Please generate a domino tiling first.");
      return;
    }

    // Get states of all visualization checkboxes
    const usePaths = document.getElementById("paths-checkbox-2d")?.checked || false;
    const useHeightFunctionExport = document.getElementById("height-function-checkbox-2d")?.checked || false;
    const useCheckerboard = document.getElementById("checkerboard-checkbox-2d")?.checked || false;
    const useDimers = document.getElementById("dimers-checkbox-2d")?.checked || false;
    const showColors = document.getElementById("show-colors-checkbox")?.checked || false;
    const useGrayscale = document.getElementById("grayscale-checkbox-2d")?.checked || false;

    // Helper function to convert a brightness value (0–255) to a TikZ grayscale color
    function grayHexForTikZ(brightness) {
      const normalizedBrightness = brightness / 255;
      return `black!${Math.round((1 - normalizedBrightness) * 100)}`;
    }

    // Convert domino objects to rectangle objects with the format needed for TikZ conversion
    const rectangles = cachedDominoes.map(domino => {
      let fillColor;

      if (!showColors) {
        fillColor = "white"; // Use white if colors are disabled
      } else if (useGrayscale) {
        // Use grayscale colors based on domino position and type
        const isHorizontal = domino.w > domino.h;

        if (isHorizontal) {
          const yParity = Math.floor(domino.y) % 4 === 0 ? 0 : 1;
          if (domino.color === "blue") {
            fillColor = grayHexForTikZ(grayscaleValues.blue["p" + yParity]);
          } else if (domino.color === "green") {
            fillColor = grayHexForTikZ(grayscaleValues.green["p" + yParity]);
          } else {
            fillColor = "black!50"; // Default gray
          }
        } else {
          const xParity = Math.floor(domino.x) % 4 === 0 ? 0 : 1;
          if (domino.color === "red") {
            fillColor = grayHexForTikZ(grayscaleValues.red["p" + xParity]);
          } else if (domino.color === "yellow") {
            fillColor = grayHexForTikZ(grayscaleValues.yellow["p" + xParity]);
          } else {
            fillColor = "black!50"; // Default gray
          }
        }
      } else {
        fillColor = domino.color; // Use regular color
      }

      return {
        x: domino.x / 100,
        y: domino.y / 100,
        width: domino.w / 100,
        height: domino.h / 100,
        fill: fillColor,
        stroke: "black",
        strokeWidth: 0.45 // Scaled down for tikz
      };
    });

    // Create lines array for paths if enabled
    const lines = [];

    if (usePaths) {
      // Add lines based on domino colors and positions
      cachedDominoes.forEach(domino => {
        const centerX = domino.x + domino.w/2;
        const centerY = domino.y + domino.h/2;
        const isHorizontal = domino.w > domino.h;

        if (domino.color === "green") {
          // Green: Horizontal line through center
          lines.push({
            x1: domino.x / 100,
            y1: centerY / 100,
            x2: (domino.x + domino.w) / 100,
            y2: centerY / 100,
            stroke: "black",
            strokeWidth: 0.55 // Scaled down from UI thickness
          });
        }
        else if (domino.color === "yellow") {
          // Yellow: path parallel to vector (1,-1) through the center
          const length = Math.min(domino.w, domino.h) * 0.7;
          const dx = length / Math.sqrt(2);
          const dy = length / Math.sqrt(2);

          lines.push({
            x1: (centerX - dx) / 100,
            y1: (centerY + dy) / 100,
            x2: (centerX + dx) / 100,
            y2: (centerY - dy) / 100,
            stroke: "black",
            strokeWidth: 0.55
          });
        }
        else if (domino.color === "red") {
          // Red: path parallel to vector (1,1) through the center
          const length = Math.min(domino.w, domino.h) * 0.7;
          const dx = length / Math.sqrt(2);
          const dy = length / Math.sqrt(2);

          lines.push({
            x1: (centerX - dx) / 100,
            y1: (centerY - dy) / 100,
            x2: (centerX + dx) / 100,
            y2: (centerY + dy) / 100,
            stroke: "black",
            strokeWidth: 0.55
          });
        }
        // Blue dominos don't get paths
      });
    }

    // Find the bounds of the drawing
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // Process rectangles
    for (const rect of rectangles) {
      minX = Math.min(minX, rect.x);
      maxX = Math.max(maxX, rect.x + rect.width);
      minY = Math.min(minY, rect.y);
      maxY = Math.max(maxY, rect.y + rect.height);
    }

    // Process lines if they exist
    for (const line of lines) {
      minX = Math.min(minX, line.x1, line.x2);
      maxX = Math.max(maxX, line.x1, line.x2);
      minY = Math.min(minY, line.y1, line.y2);
      maxY = Math.max(maxY, line.y1, line.y2);
    }

    // Create checkerboard squares if enabled
    const checkerboardSquares = [];

    // Create dimers if enabled
    const dimerNodes = [];
    const dimerEdges = [];

    if (useDimers) {
      // Process each domino to create dimer edges and nodes
      cachedDominoes.forEach(domino => {
        // Skip dominoes with invalid dimensions
        if (domino.w <= 0 || domino.h <= 0) return;

        const isHorizontal = domino.w > domino.h;

        if (isHorizontal) {
          // Horizontal domino (blue or green)
          const centerX = domino.x + domino.w/2;  // Center of the domino
          const midY = domino.y + domino.h/2;     // Vertical center

          // Calculate dimer length (half the domino width)
          const dimerLength = domino.w / 2;

          // Place nodes at the midpoints between center and edges
          const leftX = centerX - dimerLength/2;
          const rightX = centerX + dimerLength/2;

          // Add nodes
          const leftNode = {
            x: leftX / 100,
            y: midY / 100,
            radius: 0.4 / 100
          };

          const rightNode = {
            x: rightX / 100,
            y: midY / 100,
            radius: 0.4 / 100
          };

          dimerNodes.push(leftNode, rightNode);

          // Add edge connecting the two nodes
          dimerEdges.push({
            x1: leftX / 100,
            y1: midY / 100,
            x2: rightX / 100,
            y2: midY / 100
          });
        } else {
          // Vertical domino (red or yellow)
          const midX = domino.x + domino.w/2;     // Horizontal center
          const centerY = domino.y + domino.h/2;  // Center of the domino

          // Calculate dimer length (half the domino height)
          const dimerLength = domino.h / 2;

          // Place nodes at the midpoints between center and edges
          const topY = centerY - dimerLength/2;
          const bottomY = centerY + dimerLength/2;

          // Add nodes
          const topNode = {
            x: midX / 100,
            y: topY / 100,
            radius: 0.4 / 100
          };

          const bottomNode = {
            x: midX / 100,
            y: bottomY / 100,
            radius: 0.4 / 100
          };

          dimerNodes.push(topNode, bottomNode);

          // Add edge connecting the two nodes
          dimerEdges.push({
            x1: midX / 100,
            y1: topY / 100,
            x2: midX / 100,
            y2: bottomY / 100
          });
        }
      });

      // Update bounds for dimer nodes and edges
      for (const node of dimerNodes) {
        minX = Math.min(minX, node.x - node.radius);
        maxX = Math.max(maxX, node.x + node.radius);
        minY = Math.min(minY, node.y - node.radius);
        maxY = Math.max(maxY, node.y + node.radius);
      }

      for (const edge of dimerEdges) {
        minX = Math.min(minX, edge.x1, edge.x2);
        maxX = Math.max(maxX, edge.x1, edge.x2);
        minY = Math.min(minY, edge.y1, edge.y2);
        maxY = Math.max(maxY, edge.y1, edge.y2);
      }
    }

    if (useCheckerboard) {
      // Create a set of all 2x2 lattice faces used by the dominoes
      const latticeSet = new Set();

      // Collect all the 2x2 lattice face positions
      cachedDominoes.forEach(domino => {
        const isHorizontal = domino.w > domino.h;

        if (isHorizontal) {
          // Horizontal domino covers 2 faces horizontally
          const leftX = Math.floor(domino.x / 2) * 2;
          const y = Math.floor(domino.y / 2) * 2;

          // Add both lattice faces
          const leftKey = `${leftX},${y}`;
          const rightKey = `${leftX + 2},${y}`;

          if (!latticeSet.has(leftKey)) {
            latticeSet.add(leftKey);
            checkerboardSquares.push({
              x: leftX / 100,
              y: y / 100,
              size: 2 / 100
            });
          }

          if (!latticeSet.has(rightKey)) {
            latticeSet.add(rightKey);
            checkerboardSquares.push({
              x: (leftX + 2) / 100,
              y: y / 100,
              size: 2 / 100
            });
          }
        } else {
          // Vertical domino covers 2 faces vertically
          const x = Math.floor(domino.x / 2) * 2;
          const topY = Math.floor(domino.y / 2) * 2;

          // Add both lattice faces
          const topKey = `${x},${topY}`;
          const bottomKey = `${x},${topY + 2}`;

          if (!latticeSet.has(topKey)) {
            latticeSet.add(topKey);
            checkerboardSquares.push({
              x: x / 100,
              y: topY / 100,
              size: 2 / 100
            });
          }

          if (!latticeSet.has(bottomKey)) {
            latticeSet.add(bottomKey);
            checkerboardSquares.push({
              x: x / 100,
              y: (topY + 2) / 100,
              size: 2 / 100
            });
          }
        }
      });

      // Update bounds for checkerboard squares
      for (const square of checkerboardSquares) {
        minX = Math.min(minX, square.x);
        maxX = Math.max(maxX, square.x + square.size);
        minY = Math.min(minY, square.y);
        maxY = Math.max(maxY, square.y + square.size);
      }
    }

    // Calculate a good scale factor
    const width = maxX - minX;
    const height = maxY - minY;
    const maxDimension = Math.max(width, height);
    const scaleFactor = 15.0 / maxDimension;

    // Generate TikZ code with current color scheme
    // Convert hex colors to RGB for TikZ
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : {r: 0, g: 0, b: 0};
    }

    const blueRgb = hexToRgb(currentColors.blue);
    const greenRgb = hexToRgb(currentColors.green);
    const redRgb = hexToRgb(currentColors.red);
    const yellowRgb = hexToRgb(currentColors.yellow);
    const borderRgb = hexToRgb(currentColors.border);

    let tikzCode = `\\documentclass{standalone}
\\usepackage{tikz}
\\usepackage{xcolor}

% Define colors to match current color scheme
\\definecolor{svggreen}{RGB}{${greenRgb.r}, ${greenRgb.g}, ${greenRgb.b}}
\\definecolor{svgred}{RGB}{${redRgb.r}, ${redRgb.g}, ${redRgb.b}}
\\definecolor{svgyellow}{RGB}{${yellowRgb.r}, ${yellowRgb.g}, ${yellowRgb.b}}
\\definecolor{svgblue}{RGB}{${blueRgb.r}, ${blueRgb.g}, ${blueRgb.b}}
\\definecolor{svgborder}{RGB}{${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}}

\\begin{document}
% Aztec Diamond Tiling
% n = ${parseInt(document.getElementById("n-input").value, 10)}
% Periodicity: ${document.querySelector('input[name="periodicity"]:checked')?.value || 'uniform'}`;
    // Add Glauber status comment
    if (lastSampleWasGlauber || wasGlauberActive()) { // Check both JS flag and C++ flag
      tikzCode += `\n% Sample obtained/modified by Glauber dynamics`;
    }
    tikzCode += `
\\begin{tikzpicture}[scale=${scaleFactor.toFixed(6)}]  % Calculated scale

% Dominoes (rectangles)
`;

    // Add rectangles to TikZ code
    rectangles.forEach(rect => {
      // Map SVG colors to TikZ colors
      let fillColor = rect.fill;
      // If it's already a TikZ grayscale format (black!X), keep it as is
      if (fillColor.startsWith('black!')) {
        // Already in TikZ format
      }
      // Otherwise map standard colors to TikZ named colors
      else if (fillColor === 'green') fillColor = 'svggreen';
      else if (fillColor === 'red') fillColor = 'svgred';
      else if (fillColor === 'yellow') fillColor = 'svgyellow';
      else if (fillColor === 'blue') fillColor = 'svgblue';
      else if (fillColor === 'white') fillColor = 'white';

      // Shift coordinates to keep everything positive
      const x1 = rect.x - minX;
      const y1 = maxY - rect.y - rect.height;  // Invert y and adjust for height
      const x2 = rect.x - minX + rect.width;
      const y2 = maxY - rect.y;

      tikzCode += `\\filldraw[fill=${fillColor}, draw=svgborder, line width=${rect.strokeWidth}pt] `;
      tikzCode += `(${x1.toFixed(2)}, ${y1.toFixed(2)}) rectangle (${x2.toFixed(2)}, ${y2.toFixed(2)});\n`;
    });

    // Add checkerboard pattern if enabled
    if (useCheckerboard && checkerboardSquares.length > 0) {
      tikzCode += "\n% Checkerboard pattern\n";

      checkerboardSquares.forEach(square => {
        // Shift coordinates to keep everything positive
        const x1 = square.x - minX;
        const y1 = maxY - square.y - square.size;  // Invert y and adjust for height
        const x2 = square.x - minX + square.size;
        const y2 = maxY - square.y;

        // Create checkerboard pattern based on lattice coordinates
        const isBlack = ((square.x * 100 / 2) + (square.y * 100 / 2)) % 2 === 0;

        if (isBlack) {
          tikzCode += `\\filldraw[fill=black!20, draw=none] `;
          tikzCode += `(${x1.toFixed(2)}, ${y1.toFixed(2)}) rectangle (${x2.toFixed(2)}, ${y2.toFixed(2)});\n`;
        }
      });
    }

    // Add dimers if enabled
    if (useDimers && dimerNodes.length > 0) {
      tikzCode += "\n% Dimers\n";

      // First draw edges
      dimerEdges.forEach(edge => {
        // Shift and invert coordinates
        const x1 = edge.x1 - minX;
        const y1 = maxY - edge.y1;
        const x2 = edge.x2 - minX;
        const y2 = maxY - edge.y2;

        tikzCode += `\\draw[svgborder, line width=2.5pt] (${x1.toFixed(2)}, ${y1.toFixed(2)}) -- (${x2.toFixed(2)}, ${y2.toFixed(2)});\n`;
      });

      // Then draw nodes
      dimerNodes.forEach(node => {
        // Shift and invert coordinates
        const x = node.x - minX;
        const y = maxY - node.y;
        const radius = node.radius * 10; // Adjust radius for TikZ

        tikzCode += `\\filldraw[fill=svgborder] (${x.toFixed(2)}, ${y.toFixed(2)}) circle (${radius.toFixed(2)/10});\n`;
      });
    }

    // Add height function if enabled
    if (useHeightFunctionExport && cachedDominoes && cachedDominoes.length > 0) {
      tikzCode += "\n% Height Function\n";

      // 1. Determine lattice unit (scaling factor)
      const minSidePx = Math.min(...cachedDominoes.map(d => Math.min(d.w, d.h)));
      const unit = minSidePx / 2; // 2 lattice units → 1 short side
      if (unit > 0) { // Only proceed if unit is valid
        // 2. Convert each domino to (orient, sign, gx, gy)
        const dominoData = cachedDominoes.map(d => {
          const horiz = d.w > d.h;
          const orient = horiz ? 0 : 1;
          const sign = horiz
            ? (d.color === "green" ? -1 : 1)   // horizontal: green = −1, blue = +1
            : (d.color === "yellow" ? -1 : 1);  // vertical: yellow = −1, red = +1
          const gx = Math.round(d.x / unit);   // lattice coordinates
          const gy = Math.round(d.y / unit);
          return [orient, sign, gx, gy];
        });

        // 3. Build graph with height increments
        const adj = new Map();

        function addEdge(v1, v2, dh) {
          const v1Key = typeof v1 === 'string' ? v1 : `${v1[0]},${v1[1]}`;
          const v2Key = typeof v2 === 'string' ? v2 : `${v2[0]},${v2[1]}`;

          if (!adj.has(v1Key)) adj.set(v1Key, []);
          if (!adj.has(v2Key)) adj.set(v2Key, []);

          adj.get(v1Key).push([v2Key, dh]);
          adj.get(v2Key).push([v1Key, -dh]);
        }

        dominoData.forEach(([o, s, x, y]) => {
          if (o === 0) { // horizontal (4×2)
            const TL = [x, y+2], TM = [x+2, y+2], TR = [x+4, y+2];
            const BL = [x, y], BM = [x+2, y], BR = [x+4, y];

            addEdge(TL, TM, -s); addEdge(TM, TR, s);
            addEdge(BL, BM, s); addEdge(BM, BR, -s);
            addEdge(TL, BL, s); addEdge(TM, BM, 3*s);
            addEdge(TR, BR, s);
          } else { // vertical (2×4)
            const TL = [x, y+4], TR = [x+2, y+4];
            const ML = [x, y+2], MR = [x+2, y+2];
            const BL = [x, y], BR = [x+2, y];

            addEdge(TL, TR, -s); addEdge(ML, MR, -3*s); addEdge(BL, BR, -s);
            addEdge(TL, ML, s); addEdge(ML, BL, -s);
            addEdge(TR, MR, -s); addEdge(MR, BR, s);
          }
        });

        // 4. Breadth-first integration of heights
        const verts = Array.from(adj.keys()).map(k => {
          const [gx, gy] = k.split(',').map(Number);
          return {k, gx, gy};
        });

        // Find the "bottom-left" vertex as the root
        const root = verts.reduce((a, b) =>
          (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b
        ).k;

        const heights = new Map([[root, 0]]);
        const queue = [root];

        while (queue.length > 0) {
          const v = queue.shift();
          for (const [w, dh] of adj.get(v)) {
            if (!heights.has(w)) {
              heights.set(w, heights.get(v) + dh);
              queue.push(w);
            }
          }
        }

        // 5. Generate TikZ text nodes for height values
        heights.forEach((h, key) => {
          const [gx, gy] = key.split(',').map(Number);
          const px = gx * unit / 100, py = gy * unit / 100;  // convert to TikZ coordinates

          // Shift and invert coordinates for TikZ
          const x = px - minX;
          const y = maxY - py;

          // Negate height as per the requirements
          const heightValue = -h;

          // Add TikZ code for height value text
          tikzCode += `\\node[font=\\small] at (${x.toFixed(2)}, ${y.toFixed(2)}) {${heightValue}};\n`;
        });
      }
    }

    if (lines.length > 0) {
      tikzCode += "\n% Paths (lines) - Optimized\n";

      // Extract all line segments
      const segments = [];

      // Process lines to get path segments with coordinate adjustments
      lines.forEach(line => {
        // Shift and invert coordinates
        const x1 = line.x1 - minX;
        const y1 = maxY - line.y1;
        const x2 = line.x2 - minX;
        const y2 = maxY - line.y2;
        segments.push([x1, y1, x2, y2]);
      });

      // Convert segments to start/end point format
      const parsedSegments = [];
      segments.forEach(segment => {
        const [x1, y1, x2, y2] = segment;
        const start = [x1, y1];
        const end = [x2, y2];
        parsedSegments.push([start, end]);
      });

      // Function to optimize paths
      function optimizePaths(segments) {
        // Create an adjacency list for easier path finding
        const adjacencyMap = new Map();

        // Add a pair to the adjacency map
        function addToAdjacencyMap(point, segmentIndex, isStart) {
          // Convert point to string for use as a map key (with reduced precision)
          const key = `${point[0].toFixed(2)},${point[1].toFixed(2)}`;
          if (!adjacencyMap.has(key)) {
            adjacencyMap.set(key, []);
          }
          adjacencyMap.get(key).push({ segmentIndex, isStart });
        }

        // Build the adjacency map
        segments.forEach((segment, index) => {
          addToAdjacencyMap(segment[0], index, true);  // Start point
          addToAdjacencyMap(segment[1], index, false); // End point
        });

        // Track which segments have been used
        const used = new Set();
        const paths = [];

        // Find all paths
        while (used.size < segments.length) {
          // Find an unused segment to start a new path
          let currentIndex = -1;
          for (let i = 0; i < segments.length; i++) {
            if (!used.has(i)) {
              currentIndex = i;
              break;
            }
          }

          if (currentIndex === -1) break; // All segments used

          // Start building the path
          const startSegment = segments[currentIndex];
          let currentPath = [...startSegment[0], ...startSegment[1]]; // Flatten to [x1,y1,x2,y2]
          used.add(currentIndex);

          // Keep extending the path as long as possible
          let foundExtension = true;
          while (foundExtension) {
            foundExtension = false;

            // Get current endpoints
            const n = currentPath.length;
            const headPoint = [currentPath[0], currentPath[1]];
            const tailPoint = [currentPath[n-2], currentPath[n-1]];

            // Try to find a segment connecting to the tail
            const tailKey = `${tailPoint[0].toFixed(2)},${tailPoint[1].toFixed(2)}`;
            if (adjacencyMap.has(tailKey)) {
              for (const connection of adjacencyMap.get(tailKey)) {
                if (used.has(connection.segmentIndex)) continue;

                const segment = segments[connection.segmentIndex];
                let newPoint;

                if (connection.isStart) {
                  // Tail connects to start of segment, add the end
                  newPoint = segment[1];
                } else {
                  // Tail connects to end of segment, add the start
                  newPoint = segment[0];
                }

                // Add the new point
                currentPath.push(newPoint[0], newPoint[1]);
                used.add(connection.segmentIndex);
                foundExtension = true;
                break;
              }
            }

            // If we didn't find a tail extension, try the head
            if (!foundExtension) {
              const headKey = `${headPoint[0].toFixed(2)},${headPoint[1].toFixed(2)}`;
              if (adjacencyMap.has(headKey)) {
                for (const connection of adjacencyMap.get(headKey)) {
                  if (used.has(connection.segmentIndex)) continue;

                  const segment = segments[connection.segmentIndex];
                  let newPoint;

                  if (connection.isStart) {
                    // Head connects to start of segment, add the end at the beginning
                    newPoint = segment[1];
                  } else {
                    // Head connects to end of segment, add the start at the beginning
                    newPoint = segment[0];
                  }

                  // Add to the beginning of the path
                  currentPath.unshift(newPoint[0], newPoint[1]);
                  used.add(connection.segmentIndex);
                  foundExtension = true;
                  break;
                }
              }
            }
          }

          // Convert flat array [x1,y1,x2,y2,...] to points [[x1,y1],[x2,y2],...]
          const pointPath = [];
          for (let i = 0; i < currentPath.length; i += 2) {
            pointPath.push([currentPath[i], currentPath[i+1]]);
          }

          paths.push(pointPath);
        }

        return paths;
      }

      // Function to format point for TikZ
      function formatPoint(point) {
        return `(${point[0].toFixed(2)}, ${point[1].toFixed(2)})`;
      }

      // Optimize the paths
      const optimizedPaths = optimizePaths(parsedSegments);

      // Generate the optimized TikZ code
      optimizedPaths.forEach((path, i) => {
        // Add path info comment
        tikzCode += `% Path ${i+1}, ${path.length} points\n`;

        // Generate the draw command
        tikzCode += `\\draw[svgborder, line width=2.5pt]`;
        path.forEach((point, j) => {
          if (j === 0) {
            tikzCode += ` ${formatPoint(point)}`;
          } else {
            tikzCode += ` -- ${formatPoint(point)}`;
          }
        });
        tikzCode += ";\n\n";
      });
    }

    tikzCode += `
\\end{tikzpicture}
\\end{document}`;

    // Update the TikZ code in the code container
    const tikzCodeContainer = document.getElementById('tikz-code-container');
    if (tikzCodeContainer) {
      tikzCodeContainer.textContent = tikzCode;
      tikzCodeContainer.style.display = 'block';
    }

    // Show the copy/download buttons
    const buttonsContainer = document.getElementById('tikz-buttons-container');
    if (buttonsContainer) {
      buttonsContainer.style.display = 'block';
    }
  }

  // Add event listeners for the TikZ buttons
  document.getElementById("tikz-btn").addEventListener("click", function() {
    svgToTikZ();
  });

  // Add event listener for the copy button
  document.getElementById("copy-tikz-btn").addEventListener("click", function() {
    const codeContainer = document.getElementById('tikz-code-container');
    const successMsg = document.getElementById('copy-success-msg');

    // Create a text area to copy from (more reliable cross-browser)
    const textArea = document.createElement('textarea');
    textArea.value = codeContainer.textContent;
    textArea.style.position = 'fixed';  // Prevent scrolling to bottom
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      successMsg.style.display = 'inline';
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 2000);
    } catch (err) {
      alert('Failed to copy to clipboard. Please try again or select and copy manually.');
    }

    document.body.removeChild(textArea);
  });

  // Add event listener for the download button
  document.getElementById("download-tikz-btn").addEventListener("click", function() {
    const codeContainer = document.getElementById('tikz-code-container');
    const blob = new Blob([codeContainer.textContent], { type: 'text/plain' });
    const a = document.createElement('a');
    a.download = `aztec_diamond_tikz.tex`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Add event listener for PNG download button
  document.getElementById("download-png-btn").addEventListener("click", function() {
    // Get the SVG element
    const svg = document.getElementById("aztec-svg-2d");

    // Check if SVG has content (dominoes have been drawn)
    if (!svg || !cachedDominoes || cachedDominoes.length === 0) {
      alert("Please sample a domino tiling first by clicking the 'Sample' button.");
      return;
    }

    // Get current parameters for filename
    const n = parseInt(document.getElementById("n-input").value) || 12;
    const periodicity = document.querySelector('input[name="periodicity"]:checked').value;

    // Create filename with parameters
    const filename = `aztec_diamond_2d_n${n}_${periodicity}.png`;

    // Clone the SVG to avoid modifying the original
    const svgClone = svg.cloneNode(true);

    // Get the SVG's computed dimensions
    const svgRect = svg.getBoundingClientRect();
    const width = svgRect.width || 800;
    const height = svgRect.height || 600;

    // Set explicit dimensions on the cloned SVG
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);

    // Ensure the SVG has proper namespace
    if (!svgClone.getAttribute('xmlns')) {
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // Create a canvas element with maximum resolution for best quality
    const canvas = document.createElement('canvas');
    const scale = 4; // 4x resolution for maximum quality
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);

    // Convert SVG to data URL with proper encoding
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const encodedSvgData = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    // Create an image and load the SVG
    const img = new Image();
    img.onload = function() {
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);

      // Draw the SVG image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to PNG with maximum quality (no compression)
      canvas.toBlob(function(blob) {
        if (blob) {
          const a = document.createElement('a');
          a.download = filename;
          a.href = URL.createObjectURL(blob);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        } else {
          alert('Error creating PNG file');
        }
      }, 'image/png', 1.0); // Maximum quality (no compression)
    };

    img.onerror = function() {
      alert('Error loading SVG for conversion');
    };

    img.src = encodedSvgData;
  });

  // Add event listener for PDF download button
  document.getElementById("download-pdf-btn").addEventListener("click", function() {
    // Get the SVG element
    const svg = document.getElementById("aztec-svg-2d");

    // Check if SVG has content (dominoes have been drawn)
    if (!svg || !cachedDominoes || cachedDominoes.length === 0) {
      alert("Please sample a domino tiling first by clicking the 'Sample' button.");
      return;
    }

    // Get current parameters for filename
    const n = parseInt(document.getElementById("n-input").value) || 12;
    const periodicity = document.querySelector('input[name="periodicity"]:checked')?.value || 'free';
    const filename = `aztec_diamond_2d_n${n}_${periodicity}.pdf`;

    // Calculate the actual bounding box of all dominoes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    cachedDominoes.forEach(domino => {
      minX = Math.min(minX, domino.x);
      minY = Math.min(minY, domino.y);
      maxX = Math.max(maxX, domino.x + domino.w);
      maxY = Math.max(maxY, domino.y + domino.h);
    });

    // Add some padding around the content
    const padding = 10;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const aspectRatio = contentWidth / contentHeight;

    // Create jsPDF instance with appropriate page size
    const { jsPDF } = window.jspdf;

    // Determine optimal PDF dimensions (in mm) - use A4 as base
    let pdfWidth, pdfHeight;
    const a4Width = 210; // A4 width in mm
    const a4Height = 297; // A4 height in mm

    if (aspectRatio > 1) {
      // Landscape orientation for wide diagrams
      pdfWidth = a4Height;
      pdfHeight = a4Height / aspectRatio;
      if (pdfHeight > a4Width) {
        pdfHeight = a4Width;
        pdfWidth = a4Width * aspectRatio;
      }
    } else {
      // Portrait orientation
      pdfWidth = a4Width;
      pdfHeight = a4Width / aspectRatio;
      if (pdfHeight > a4Height) {
        pdfHeight = a4Height;
        pdfWidth = a4Height * aspectRatio;
      }
    }

    const pdf = new jsPDF({
      orientation: aspectRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Get current color scheme for accurate colors
    const paletteSelector = document.getElementById('palette-selector');
    const selectedIndex = paletteSelector?.value || 0;
    const selectedPalette = window.ColorSchemes?.[selectedIndex];

    // Process each domino as vector graphics
    if (cachedDominoes && cachedDominoes.length > 0) {
      // Calculate scale factor from content bounds to PDF coordinates
      const scaleX = pdfWidth / contentWidth;
      const scaleY = pdfHeight / contentHeight;

      // Get current color settings
      const showColors = document.getElementById("show-colors-checkbox")?.checked !== false;
      const useGrayscale = document.getElementById("grayscale-checkbox")?.checked === true;
      const borderWidth = parseFloat(document.getElementById("border-width-input").value) || 0.1;

      cachedDominoes.forEach(domino => {
        // Determine fill color based on current settings
        let fillColor;
        if (!showColors) {
          fillColor = [255, 255, 255]; // White
        } else if (useGrayscale) {
          // Convert to grayscale
          const isHorizontal = domino.w > domino.h;
          if (isHorizontal) {
            fillColor = [200, 200, 200]; // Light gray for horizontal
          } else {
            fillColor = [100, 100, 100]; // Dark gray for vertical
          }
        } else {
          // Use the actual current theme colors, same as 2D rendering
          const colorHex = currentColors[domino.color] || domino.color;

          // Convert hex to RGB
          let r, g, b;
          if (typeof colorHex === 'string' && colorHex.startsWith('#')) {
            r = parseInt(colorHex.substr(1, 2), 16);
            g = parseInt(colorHex.substr(3, 2), 16);
            b = parseInt(colorHex.substr(5, 2), 16);
          } else {
            // Fallback to default colors if hex parsing fails
            r = 100; g = 100; b = 100;
          }
          fillColor = [r, g, b];
        }

        // Draw rectangle with precise coordinates
        pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        pdf.setDrawColor(0, 0, 0); // Black border
        pdf.setLineWidth(borderWidth);

        // Convert domino coordinates to PDF coordinates, accounting for content offset
        const x = (domino.x - minX) * scaleX;
        const y = (domino.y - minY) * scaleY;
        const width = domino.w * scaleX;
        const height = domino.h * scaleY;

        pdf.rect(x, y, width, height, 'FD'); // Fill and Draw
      });
    }

    // Save the PDF
    pdf.save(filename);
  });

  // Add event listener for 3D download button
  document.getElementById("download-3d-btn").addEventListener("click", function() {
    // Check if 3D scene exists and has content
    if (!renderer || !scene || !cachedDominoes || cachedDominoes.length === 0) {
      alert("Please sample a domino tiling first by clicking the 'Sample' button.");
      return;
    }

    // Get current parameters for filename
    const n = parseInt(document.getElementById("n-input").value) || 12;
    const periodicity = document.querySelector('input[name="periodicity"]:checked').value;

    // Create filename with parameters
    const filename = `aztec_diamond_3d_n${n}_${periodicity}.png`;

    // Render the current frame
    renderer.render(scene, camera);

    // Get the canvas and convert to blob
    const canvas = renderer.domElement;
    canvas.toBlob(function(blob) {
      if (blob) {
        const a = document.createElement('a');
        a.download = filename;
        a.href = URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } else {
        alert('Error creating PNG file from 3D view');
      }
    }, 'image/png', 0.95);
  });
};

/* About section is closed by default via HTML (no "show" class). */

// ========================================================================
// Mobile Bottom Sheet Drawer Handling
// ========================================================================
(function() {
  const drawerHandle = document.getElementById('drawerHandle');
  const controlsPanel = document.getElementById('controlsPanel');

  if (drawerHandle && controlsPanel) {
    let drawerStartY = 0;
    let drawerStartTranslateY = 0;
    let isDragging = false;

    const getDrawerTranslateY = () => {
      const transform = controlsPanel.style.transform;
      if (transform) {
        const match = transform.match(/translateY\(([^)]+)\)/);
        if (match) {
          const value = match[1];
          if (value.includes('calc')) return 0;
          return parseFloat(value) || 0;
        }
      }
      return 0;
    };

    drawerHandle.addEventListener('touchstart', (e) => {
      if (window.innerWidth >= 992) return;
      isDragging = true;
      drawerStartY = e.touches[0].clientY;
      drawerStartTranslateY = controlsPanel.classList.contains('expanded') ? 0 : controlsPanel.offsetHeight - 60;
      controlsPanel.style.transition = 'none';
    }, { passive: true });

    drawerHandle.addEventListener('touchmove', (e) => {
      if (!isDragging || window.innerWidth >= 992) return;
      const deltaY = e.touches[0].clientY - drawerStartY;
      const newTranslateY = Math.max(0, Math.min(controlsPanel.offsetHeight - 60, drawerStartTranslateY + deltaY));
      controlsPanel.style.transform = `translateY(${newTranslateY}px)`;
    }, { passive: true });

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      controlsPanel.style.transition = '';

      const currentTranslateY = getDrawerTranslateY();
      const threshold = controlsPanel.offsetHeight * 0.3;

      if (currentTranslateY < threshold) {
        controlsPanel.classList.add('expanded');
        controlsPanel.style.transform = '';
      } else {
        controlsPanel.classList.remove('expanded');
        controlsPanel.style.transform = '';
      }
    };

    drawerHandle.addEventListener('touchend', endDrag, { passive: true });
    drawerHandle.addEventListener('touchcancel', endDrag, { passive: true });

    // Click to toggle on drawer handle
    drawerHandle.addEventListener('click', () => {
      if (window.innerWidth >= 992) return;
      controlsPanel.classList.toggle('expanded');
    });
  }

  // ========================================================================
  // Floating Action Button (Mobile - Sample/Stop)
  // ========================================================================
  const sampleFab = document.getElementById('sampleFab');
  const sampleBtn = document.getElementById('sample-btn');

  if (sampleFab && sampleBtn) {
    sampleFab.addEventListener('click', () => {
      // If Glauber is running, clicking FAB stops it
      if (window.glauberRunning) {
        document.getElementById('glauber-btn')?.click();
      } else {
        sampleBtn.click();
      }
    });
  }

  // ========================================================================
  // Visual Palette Picker Grid
  // ========================================================================
  const gridContainer = document.getElementById('palettePickerGrid');

  function initPalettePickerGrid() {
    if (!gridContainer || !window.ColorSchemes) return;

    gridContainer.innerHTML = '';

    window.ColorSchemes.forEach((palette, index) => {
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-label', palette.name);
      item.setAttribute('tabindex', '0');
      item.setAttribute('title', palette.name);
      item.dataset.index = index;

      // Create 4 swatches for the 4 colors
      const colors = palette.colors || [];
      for (let i = 0; i < 4; i++) {
        const swatch = document.createElement('div');
        swatch.className = 'swatch';
        swatch.style.backgroundColor = colors[i] || '#ccc';
        item.appendChild(swatch);
      }

      item.addEventListener('click', () => {
        // Call selectPalette which handles dropdown sync and color application
        if (typeof window.selectPalette === 'function') {
          window.selectPalette(index);
        } else {
          // Fallback: update visually and trigger dropdown change
          document.querySelectorAll('.palette-item').forEach(p => p.classList.remove('active'));
          item.classList.add('active');
          const selector = document.getElementById('palette-selector');
          if (selector) {
            selector.value = index;
            selector.dispatchEvent(new Event('change'));
          }
        }
      });

      gridContainer.appendChild(item);
    });
  }

  // Initialize palette picker when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initPalettePickerGrid, 100);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initPalettePickerGrid, 100));
  }

  // Re-initialize when ColorSchemes loads
  if (window.ColorSchemes) {
    initPalettePickerGrid();
  }
})();
</script>

<div style="text-align: center; font-size: 0.8em; margin-top: 50px; color: #666;">
This material is based upon work supported by the National Science Foundation under Grant DMS-2153869
</div>
