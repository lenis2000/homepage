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

  #aztec-canvas-2d {
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
    cursor: grab;
  }

  #aztec-canvas-2d.dragging {
    cursor: grabbing;
  }

  #aztec-svg-2d {
    touch-action: none; /* Prevent browser defaults on touch */
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    display: none;
  }

  #aztec-2d-canvas {
    background: var(--bg-secondary, #f8f8f8);
    border: 1px solid var(--border-color, #ddd);
    box-sizing: border-box;
    position: relative;
    display: none; /* Hidden by default */
  }

  [data-theme="dark"] #aztec-2d-canvas {
    background: var(--bg-secondary, #1f1f1f);
    border-color: var(--border-color, #444);
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
          <input id="n-input" type="number" value="12" min="2" step="2" max="500" size="3" class="mobile-input" style="width: 70px;">
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
              <input type="checkbox" id="no-3d-checkbox" checked>
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
          <button id="download-png-btn" class="btn-utility" style="font-size: 11px;">PNG</button>
          <button id="download-pdf-btn" class="btn-utility" style="font-size: 11px;">PDF</button>
          <button id="download-3d-btn" class="btn-utility" style="font-size: 11px; display: none;">3D Screenshot</button>
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
        <button id="view-3d-btn" title="3D height function view">3D</button>
        <button id="view-2d-btn" class="active" title="2D domino view">2D</button>
      </div>
      <button id="help-btn" title="Keyboard shortcuts" style="width: 28px; height: 28px; border: 1px solid var(--border-color, #888); border-radius: 50%; background: var(--bg-primary, white); color: #666; font-size: 14px; cursor: pointer; padding: 0; margin-left: 8px;">?</button>
    </div>

    <!-- 3D Visualization Pane (opt-in) -->
    <div id="aztec-canvas" style="display: none;"></div>

    <!-- 2D Visualization Pane (default) -->
    <div id="aztec-2d-canvas" style="display: block; position: relative; overflow: hidden; height: 70vh;">
      <!-- 2D controls moved to sidebar -->
      <canvas id="aztec-canvas-2d" aria-label="2D Aztec diamond tiling"></canvas>
      <svg id="aztec-svg-2d" aria-hidden="true"></svg>
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

function show3DCanvasMessage(html) {
  const container = document.getElementById('aztec-canvas');
  if (!container) return;
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
  messageDiv.innerHTML = html;
  container.appendChild(messageDiv);
}

// Helper function to create a message for large tilings (n > 300) in 3D view
function createLargeTilingMessage() {
  show3DCanvasMessage('For n > 300, only 2D visualization is available.<br>Switch to the 2D view using the button above.<br><br>To see a 3D visualization, decrease n to 300 or less and click Sample.');
}

function createNo3DMessage() {
  show3DCanvasMessage('3D visualization disabled.<br>Uncheck "No 3D" to enable 3D rendering.<br><br>Switch to 2D view to see the visualization.');
}

function create3DUnavailableMessage() {
  show3DCanvasMessage('3D visualization unavailable in this browser.<br>Switch to 2D view to see the visualization.');
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
  const performGlauberSteps = Module.cwrap('performGlauberSteps', 'number', [
    'string',
    'number', 'number', 'number', 'number', 'number', 'number',
    'number', 'number', 'number', 'number', 'number', 'number',
    'number'
  ], {async: true});
  const wasGlauberActive = Module.cwrap('wasGlauberActive', 'boolean', []);

  // Three.js setup
  let scene, camera, renderer, controls, dominoGroup;
  let animationActive = true;
  const THREE_JS_URL = "https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js";
  const ORBIT_CONTROLS_URL = "https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js";
  let threeJSLibraryPromise = null;

  // Simulation state
  let simulationActive = false;
  let abortController = null;
  const progressElem = document.getElementById("progress-indicator");
  const updateBtn = document.getElementById("update-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  let progressInterval;
  let cachedDominoes = null; // Store dominoes for 2D view
  let domino2DRenderer = null;
  let useHeightFunction = false; // Track height function visibility state
  let heightGroup; // Group for height function display

  // Glauber state variables (exposed on window for FAB access)
  let glauberRunning = false;
  window.glauberRunning = glauberRunning;
  let glauberTimer = null;
  let lastSampleWasGlauber = false; // Track if the *last* visualization update came from Glauber
  let no3DUserChanged = false;

  function initializeDefaultPaneState() {
    const no3DCheckbox = document.getElementById("no-3d-checkbox");
    if (no3DCheckbox) no3DCheckbox.checked = true;

    document.getElementById("view-3d-btn")?.classList.remove("active");
    document.getElementById("view-2d-btn")?.classList.add("active");

    const canvas3D = document.getElementById("aztec-canvas");
    const canvas2D = document.getElementById("aztec-2d-canvas");
    if (canvas3D) canvas3D.style.display = "none";
    if (canvas2D) canvas2D.style.display = "block";

    document.getElementById("download-png-btn").style.display = "inline-block";
    document.getElementById("download-pdf-btn").style.display = "inline-block";
    document.getElementById("download-3d-btn").style.display = "none";
    document.getElementById("n-input").setAttribute("max", "500");
  }

  initializeDefaultPaneState();

  const DOMINO_DEFAULT_BENCHMARK_CASES = [
    { n: 100, view: "2d", no3D: true, periodicity: "uniform" },
    { n: 200, view: "2d", no3D: true, periodicity: "uniform" },
    { n: 300, view: "2d", no3D: true, periodicity: "uniform" },
    { n: 500, view: "2d", no3D: true, periodicity: "uniform" }
  ];

  function dominoNow() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  function roundTiming(ms) {
    return Math.round(ms * 10) / 10;
  }

  function currentPeriodicity() {
    return document.querySelector('input[name="periodicity"]:checked')?.value || 'uniform';
  }

  function createDominoProfile(n, options = {}) {
    return {
      n,
      source: options.source || "sample",
      label: options.label || null,
      periodicity: currentPeriodicity(),
      view: document.getElementById("view-2d-btn")?.classList.contains("active") ? "2d" : "3d",
      no3D: Boolean(document.getElementById("no-3d-checkbox")?.checked),
      startedAt: new Date().toISOString(),
      startedAtMs: dominoNow(),
      status: "running",
      timings: {
        wasmCallMs: null,
        utf8ConversionMs: null,
        jsonParseMs: null,
        render2DMs: null,
        heightFunctionMs: null,
        render3DMs: null,
        totalMs: null
      },
      skipped: []
    };
  }

  function setDominoTiming(profile, key, elapsedMs) {
    if (!profile) return;
    profile.timings[key] = roundTiming(elapsedMs);
  }

  function skipDominoTiming(profile, key, reason) {
    if (!profile || profile.skipped.some(item => item.key === key)) return;
    profile.skipped.push({ key, reason });
  }

  function finishDominoProfile(profile, status = "ok") {
    if (!profile || profile.status !== "running") return profile;
    profile.status = status;
    profile.finishedAt = new Date().toISOString();
    profile.timings.totalMs = roundTiming(dominoNow() - profile.startedAtMs);

    window.dominoSamplerLastTiming = profile;
    window.dominoSamplerTimings = window.dominoSamplerTimings || [];
    window.dominoSamplerTimings.push(profile);
    if (window.dominoSamplerTimings.length > 50) {
      window.dominoSamplerTimings.shift();
    }

    if (window.dominoSamplerLogTimings === true) {
      console.info("[domino] sampler profile", profile);
      if (console.table) console.table(profile.timings);
    }
    return profile;
  }

  function profileSummary(profile) {
    if (!profile || profile.status !== "ok") return "";
    const t = profile.timings;
    const parts = [
      `total ${t.totalMs}ms`,
      t.wasmCallMs !== null ? `wasm ${t.wasmCallMs}ms` : null,
      t.utf8ConversionMs !== null ? `utf8 ${t.utf8ConversionMs}ms` : null,
      t.jsonParseMs !== null ? `parse ${t.jsonParseMs}ms` : null,
      t.render2DMs !== null ? `2D ${t.render2DMs}ms` : null,
      t.heightFunctionMs !== null ? `height ${t.heightFunctionMs}ms` : null,
      t.render3DMs !== null ? `3D ${t.render3DMs}ms` : null
    ].filter(Boolean);
    return `Profile: ${parts.join(", ")}`;
  }

  function showDominoProfileStatus(profile) {
    const message = profileSummary(profile);
    if (!message || !progressElem || profile.source === "benchmark") return;
    setProgressStatus(message, { immediate: true, clearAfterMs: 6000 });
  }

  let statusFramePending = false;
  let pendingStatusMessage = null;
  let pendingStatusOptions = {};
  let lastStatusUpdateMs = 0;
  let statusClearTimer = null;
  const STATUS_UPDATE_INTERVAL_MS = 125;

  function setProgressStatus(message, options = {}) {
    if (!progressElem) return;
    pendingStatusMessage = message;
    pendingStatusOptions = options;

    const applyStatus = () => {
      statusFramePending = false;
      const now = dominoNow();
      if (!pendingStatusOptions.immediate &&
          now - lastStatusUpdateMs < STATUS_UPDATE_INTERVAL_MS) {
        scheduleStatusFrame();
        return;
      }

      progressElem.innerText = pendingStatusMessage || "";
      lastStatusUpdateMs = now;

      if (statusClearTimer) {
        clearTimeout(statusClearTimer);
        statusClearTimer = null;
      }
      if (pendingStatusOptions.clearAfterMs) {
        const expectedMessage = pendingStatusMessage;
        statusClearTimer = setTimeout(() => {
          if (progressElem.innerText === expectedMessage) {
            progressElem.innerText = "";
          }
        }, pendingStatusOptions.clearAfterMs);
      }
    };

    function scheduleStatusFrame() {
      if (statusFramePending) return;
      statusFramePending = true;
      requestAnimationFrame(applyStatus);
    }

    if (options.immediate) {
      applyStatus();
    } else {
      scheduleStatusFrame();
    }
  }

  function clearProgressStatus(options = {}) {
    if (statusClearTimer) {
      clearTimeout(statusClearTimer);
      statusClearTimer = null;
    }
    pendingStatusMessage = "";
    pendingStatusOptions = {};
    if (options.immediate && progressElem) {
      progressElem.innerText = "";
      return;
    }
    setProgressStatus("", { immediate: Boolean(options.immediate) });
  }

  function getActiveView() {
    return document.getElementById("view-2d-btn")?.classList.contains("active") ? "2d" : "3d";
  }

  function isNo3DEnabled() {
    return Boolean(document.getElementById("no-3d-checkbox")?.checked);
  }

  function shouldRender2D(n) {
    return getActiveView() === "2d";
  }

  function shouldRender3D(n) {
    return getActiveView() === "3d" && n <= 300 && !isNo3DEnabled();
  }

  function shouldShowLarge3DMessage(n) {
    return getActiveView() === "3d" && n > 300;
  }

  function invalidate2DCanvasCache() {
    domino2DRenderer?.invalidateCache("external");
  }

  // Demo mode state
  let isDemoMode = false;
  let rotationSpeed = 0.005; // Speed of rotation in radians

  function loadDominoScriptOnce(src, isReady, marker) {
    if (isReady()) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const selector = `script[data-domino-lazy-script="${marker}"]`;
      const existing = document.querySelector(selector);
      if (existing) {
        if (existing.dataset.dominoLoaded === "true") {
          reject(new Error(`Loaded ${src}, but the expected 3D API is unavailable`));
          return;
        }
        if (existing.dataset.dominoLoadFailed === "true") {
          reject(new Error(`Failed to load ${src}`));
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.dominoLazyScript = marker;
      script.addEventListener("load", () => {
        script.dataset.dominoLoaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => {
        script.dataset.dominoLoadFailed = "true";
        reject(new Error(`Failed to load ${src}`));
      }, { once: true });
      document.head.appendChild(script);
    }).then(() => {
      if (!isReady()) throw new Error(`Loaded ${src}, but the expected 3D API is unavailable`);
    });
  }

  async function ensureThreeJSLibrary() {
    if (window.THREE?.WebGLRenderer && window.THREE?.OrbitControls) return true;
    if (!threeJSLibraryPromise) {
      threeJSLibraryPromise = loadDominoScriptOnce(
        THREE_JS_URL,
        () => Boolean(window.THREE?.WebGLRenderer),
        "three-core"
      ).then(() => loadDominoScriptOnce(
        ORBIT_CONTROLS_URL,
        () => Boolean(window.THREE?.OrbitControls),
        "three-orbit-controls"
      )).catch(error => {
        threeJSLibraryPromise = null;
        throw error;
      });
    }

    await threeJSLibraryPromise;
    return Boolean(window.THREE?.WebGLRenderer && window.THREE?.OrbitControls);
  }

  function initThreeJS() {
    if (!window.THREE?.WebGLRenderer || !window.THREE?.OrbitControls) {
      throw new Error("Three.js is not loaded");
    }

    animationActive = true;
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

  function disposeThreeMesh(mesh) {
    if (!mesh) return;
    if (mesh.geometry) mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(material => material?.dispose?.());
    } else if (mesh.material) {
      mesh.material.dispose();
    }
  }

  function clear3DMeshes() {
    if (!dominoGroup) return;
    while (dominoGroup.children.length > 0) {
      const mesh = dominoGroup.children[0];
      dominoGroup.remove(mesh);
      disposeThreeMesh(mesh);
    }
    dominoGroup.position.set(0, 0, 0);
    dominoGroup.rotation.set(0, 0, 0);
    dominoGroup.scale.set(1, 1, 1);
  }

  function resetThreeJSState() {
    animationActive = false;
    window.removeEventListener('resize', onWindowResize);
    clear3DMeshes();
    controls?.dispose?.();
    if (renderer) {
      renderer.dispose?.();
      if (renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    dominoGroup = null;
  }

  async function ensureThreeJSReady() {
    if (isNo3DEnabled() || getActiveView() !== "3d") return false;
    try {
      await ensureThreeJSLibrary();
    } catch (error) {
      console.error("[domino] failed to load 3D renderer", error);
      setProgressStatus(`Unable to load 3D renderer: ${error.message}`, {
        immediate: true,
        clearAfterMs: 5000
      });
      return false;
    }

    if (!renderer || !scene || !camera || !controls || !dominoGroup) {
      try {
        initThreeJS();
      } catch (error) {
        console.error("[domino] failed to initialize 3D renderer", error);
        resetThreeJSState();
        create3DUnavailableMessage();
        setProgressStatus(`Unable to initialize 3D renderer: ${error.message}`, {
          immediate: true,
          clearAfterMs: 5000
        });
        return false;
      }
      return Boolean(renderer && scene && camera && controls && dominoGroup);
    }
    const container = document.getElementById('aztec-canvas');
    if (container && renderer.domElement && !container.contains(renderer.domElement)) {
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    }
    if (!animationActive) {
      animationActive = true;
      animate();
    }
    return true;
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

  // Keep the default path free of WebGL setup. The 3D button loads Three.js on demand.
  animationActive = false;

  // Add a global function to easily reset Three.js if needed
  window.resetThreeJS = async function() {
    if (!(await ensureThreeJSReady())) return "3D unavailable";

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
        for (let i = 1; i <= 12; i++) {
            const val = parseFloat(document.getElementById(`w6x2_${i}`).value);
            params.push(Number.isFinite(val) ? val : 1.0);
        }
    } else if (periodicity === '2x2') {
        const a = parseFloat(document.getElementById('a-input').value) || 0.5;
        const b = parseFloat(document.getElementById('b-input').value) || 1.0;
        params.push(a, b, 0,0,0,0,0,0,0,0,0,0); // Pass a, b as p1, p2
    } else if (periodicity === '3x3') {
        for (let i = 1; i <= 9; i++) {
            const val = parseFloat(document.getElementById(`w${i}`).value) || 1.0;
            params.push(val);
        }
        params.push(0,0,0);
    } else { // Uniform
        params.push(1,1,1,1,1,1,1,1,1,1,1,1); // Pass all 1s
    }
    params.push(nSteps); // Add number of steps

    // 2. Call C++ function
    const ptr = await performGlauberSteps(...params);
    if (!ptr) {
        setProgressStatus("Glauber error: WASM returned a null pointer.", { immediate: true, clearAfterMs: 4000 });
        return 0;
    }

    let jsonStr = "";
    try {
        jsonStr = Module.UTF8ToString(ptr);
    } finally {
        freeString(ptr);
    }

    // 3. Parse result and update cache
    try {
        const result = parseDominoWasmResult(jsonStr, null);
        cachedDominoes = result;
        invalidate2DCanvasCache();
        lastSampleWasGlauber = true; // Mark that Glauber produced this state

        // 4. Update the visible visualization only
        await renderVisibleCachedDominoes();

        return nSteps; // Return number of steps successfully run
    } catch (e) {
        setProgressStatus(`Glauber error: ${e.message}`, { immediate: true, clearAfterMs: 4000 });
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

  function readSamplingWeights() {
    const periodicity = document.querySelector('input[name="periodicity"]:checked')?.value || 'uniform';
    const isFrozenH = periodicity === 'frozenH';
    const isFrozenV = periodicity === 'frozenV';
    let w1 = 1.0, w2 = 1.0, w3 = 1.0, w4 = 1.0, w5 = 1.0, w6 = 1.0, w7 = 1.0, w8 = 1.0, w9 = 1.0;
    let a = 1.0, b = 1.0;

    if (!isFrozenH && !isFrozenV) {
      if (periodicity === '2x2') {
        const aInput = document.getElementById("a-input");
        const bInput = document.getElementById("b-input");
        a = aInput && !isNaN(parseFloat(aInput.value)) ? parseFloat(aInput.value) : 0.5;
        b = bInput && !isNaN(parseFloat(bInput.value)) ? parseFloat(bInput.value) : 1.0;
        w1 = 1.0; w2 = a; w3 = 1.0;
        w4 = b; w5 = 1.0; w6 = b;
        w7 = 1.0; w8 = a; w9 = 1.0;
      } else if (periodicity === '3x3') {
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
      }
    }

    return { periodicity, isFrozenH, isFrozenV, weights: [w1, w2, w3, w4, w5, w6, w7, w8, w9] };
  }

  async function sampleDominoesFromWasm(n, profile, signal) {
    const { periodicity, isFrozenH, isFrozenV, weights } = readSamplingWeights();
    let ptr = 0;
    const wasmStart = dominoNow();

    if (isFrozenH) {
      ptr = await simulateAztecHorizontal(n, 0,0,0,0,0,0,0,0,0,0);
    } else if (isFrozenV) {
      ptr = await simulateAztecVertical(n, 0,0,0,0,0,0,0,0,0,0);
    } else if (periodicity === '6x2') {
      const v = [];
      for (let i = 1; i <= 12; i++) {
        const input = document.getElementById(`w6x2_${i}`);
        v.push(input && !isNaN(parseFloat(input.value)) ? parseFloat(input.value) : 1.0);
      }
      ptr = await simulateAztec6x2(n, ...v);
    } else {
      ptr = await simulateAztec(n, ...weights);
    }

    setDominoTiming(profile, "wasmCallMs", dominoNow() - wasmStart);
    if (signal?.aborted) {
      if (ptr) freeString(ptr);
      return null;
    }
    if (!ptr) {
      throw new Error("WASM sampler returned a null pointer.");
    }

    const utf8Start = dominoNow();
    let raw = "";
    try {
      raw = Module.UTF8ToString(ptr);
    } finally {
      setDominoTiming(profile, "utf8ConversionMs", dominoNow() - utf8Start);
      freeString(ptr);
    }

    return raw;
  }

  function parseDominoWasmResult(raw, profile) {
    if (!raw) {
      throw new Error("WASM sampler returned an empty response.");
    }
    const parseStart = dominoNow();
    const result = JSON.parse(raw);
    setDominoTiming(profile, "jsonParseMs", dominoNow() - parseStart);

    if (result && typeof result === "object" && !Array.isArray(result) && result.error) {
      throw new Error(result.error);
    }
    if (!Array.isArray(result)) {
      throw new Error("WASM sampler returned an unexpected response.");
    }
    return result;
  }

  async function render2DIfVisible(dominoes, n, profile) {
    if (!shouldRender2D(n)) {
      skipDominoTiming(profile, "render2DMs", "2D pane inactive");
      return false;
    }

    const render2DStart = dominoNow();
    await render2D(dominoes);
    setDominoTiming(profile, "render2DMs", dominoNow() - render2DStart);
    return true;
  }

  async function render3DFromDominoes(dominoes, n, profile, signal, options = {}) {
    if (!shouldRender3D(n)) {
      skipDominoTiming(profile, "heightFunctionMs", isNo3DEnabled() ? "No 3D enabled" : "3D pane inactive");
      skipDominoTiming(profile, "render3DMs", isNo3DEnabled() ? "No 3D enabled" : "3D pane inactive");
      return false;
    }

    if (!(await ensureThreeJSReady())) {
      skipDominoTiming(profile, "heightFunctionMs", "3D unavailable");
      skipDominoTiming(profile, "render3DMs", "3D unavailable");
      return false;
    }

    clear3DMeshes();
    const wasInDemoMode = isDemoMode;

    setProgressStatus("Calculating height function...");
    await sleep(10);
    if (signal?.aborted) return false;

    const heightStart = dominoNow();
    const heightMap = calculateHeightFunction(dominoes);
    setDominoTiming(profile, "heightFunctionMs", dominoNow() - heightStart);
    if (signal?.aborted) return false;

    const scale = 60 / (2 * n);
    const colors = {
      blue: hexToThreeColor(currentColors.blue),
      green: hexToThreeColor(currentColors.green),
      red: hexToThreeColor(currentColors.red),
      yellow: hexToThreeColor(currentColors.yellow)
    };

    setProgressStatus("Processing domino data...");
    await sleep(10);
    if (signal?.aborted) return false;

    const render3DStart = dominoNow();
    const faces = [];
    const CHUNK_SIZE = 200;
    for (let i = 0; i < dominoes.length; i += CHUNK_SIZE) {
      if (signal?.aborted) return false;
      const chunk = dominoes.slice(i, i + CHUNK_SIZE);
      const chunkFaces = chunk.map(domino => createDominoFaces(domino, heightMap, scale));
      faces.push(...chunkFaces);
      setProgressStatus(`Processing... (${Math.floor(100 * (i + chunk.length) / dominoes.length)}%)`);
      await sleep(0);
    }

    const total = faces.length;
    if (total === 0 || signal?.aborted) return false;

    let minHeight = Infinity, maxHeight = -Infinity;
    for (const f of faces) {
      if (f && f.avgHeight !== undefined) {
        minHeight = Math.min(minHeight, f.avgHeight);
        maxHeight = Math.max(maxHeight, f.avgHeight);
      }
    }
    const heightRange = maxHeight - minHeight;

    setProgressStatus("Rendering...");
    let idx = 0;

    function processBatch(start) {
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          if (signal?.aborted) {
            resolve(false);
            return;
          }

          const BATCH_SIZE = 200;
          const end = Math.min(start + BATCH_SIZE, total);

          for (let i = start; i < end; i++) {
            if (signal?.aborted) {
              resolve(false);
              return;
            }

            const f = faces[i];
            if (!f || !f.color || !Array.isArray(f.vertices)) continue;

            try {
              const geom = new THREE.BufferGeometry();
              const pos = [];
              for (const v of f.vertices) {
                pos.push(v[0] * scale, v[1] * scale, v[2] * scale);
              }

              geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

              const isH = (f.color === 'blue' || f.color === 'green');
              const indices = isH
                ? [0,1,3, 3,2,1, 0,1,4, 3,2,5]
                : [0,1,3, 3,2,1, 0,1,4, 3,2,5];

              if (total > 65535 / 6) {
                geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
              } else {
                geom.setIndex(indices);
              }

              geom.computeVertexNormals();

              const showColors = document.getElementById("show-colors-checkbox").checked;
              const showGradient = document.getElementById("height-gradient-checkbox").checked;
              const monoColor = 0x999999;
              const colorValue = colors[f.color] || 0x808080;

              let finalColor = colorValue;
              if (showColors && showGradient && heightRange > 0 && f.avgHeight !== undefined) {
                const t = (f.avgHeight - minHeight) / heightRange;
                const baseColor = new THREE.Color(colorValue);
                const darkColor = baseColor.clone().multiplyScalar(0.4);
                finalColor = darkColor.lerp(baseColor, t).getHex();
              }

              const mat = new THREE.MeshStandardMaterial({
                color: showColors ? finalColor : monoColor,
                side: THREE.DoubleSide,
                flatShading: true
              });
              mat.userData = { originalColorValue: colorValue, gradientColorValue: finalColor };

              const mesh = new THREE.Mesh(geom, mat);
              mesh.userData.originalColor = f.color;
              mesh.userData.avgHeight = f.avgHeight;
              dominoGroup.add(mesh);
            } catch (e) {

            }
          }

          idx = end;
          setProgressStatus(`Rendering... (${Math.floor(100 * (idx / total))}%)`);
          resolve(idx < total);
        });
      });
    }

    let hasMore = true;
    while (hasMore && (!signal || simulationActive) && !signal?.aborted) {
      hasMore = await processBatch(idx);
    }
    if (signal?.aborted) return false;

    if (idx >= total && dominoGroup.children.length > 0) {
      const box = new THREE.Box3().setFromObject(dominoGroup);
      const center = box.getCenter(new THREE.Vector3());
      center.x += -0.7;
      center.z += 4;
      dominoGroup.position.sub(center);

      const sizeXYZ = box.getSize(new THREE.Vector3());
      const margin = 0.05;
      const viewW = camera.right - camera.left;
      const viewH = camera.top - camera.bottom;
      const maxScale = (1 - margin) * Math.min(
        viewW / sizeXYZ.x,
        viewH / sizeXYZ.z
      );

      dominoGroup.scale.setScalar(maxScale);
      controls.target.set(0, 0, 0);
      controls.update();

      if (wasInDemoMode || options.restoreDemoMode) {
        setDemoViewCamera();
      }

      setDominoTiming(profile, "render3DMs", dominoNow() - render3DStart);
    }

    return true;
  }

  async function renderVisibleCachedDominoes(profile = null, signal = null) {
    if (!cachedDominoes) return false;
    const n = parseInt(document.getElementById("n-input").value, 10) || 0;

    if (getActiveView() === "2d") {
      const render2DStart = dominoNow();
      await render2D(cachedDominoes);
      setDominoTiming(profile, "render2DMs", dominoNow() - render2DStart);
      return true;
    }

    if (shouldShowLarge3DMessage(n)) {
      createLargeTilingMessage();
      skipDominoTiming(profile, "heightFunctionMs", "3D unavailable for n > 300");
      skipDominoTiming(profile, "render3DMs", "3D unavailable for n > 300");
      return false;
    }

    if (isNo3DEnabled()) {
      createNo3DMessage();
      skipDominoTiming(profile, "heightFunctionMs", "No 3D enabled");
      skipDominoTiming(profile, "render3DMs", "No 3D enabled");
      return false;
    }

    return await render3DFromDominoes(cachedDominoes, n, profile, signal);
  }

  async function updateVisualization(n, profileOptions = {}) {
    const profile = createDominoProfile(n, profileOptions);
    let profileCompleted = false;
    function completeProfile(status) {
      if (profileCompleted) return profile;
      profileCompleted = true;
      finishDominoProfile(profile, status);
      showDominoProfileStatus(profile);
      return profile;
    }

    // If Glauber is running, stop it
    if (glauberRunning) {
        toggleGlauberDynamics(); // Stop the dynamics
    }
    lastSampleWasGlauber = false; // Reset flag when generating a fresh sample

    startSimulation();
    const signal = abortController.signal;

    // Start progress polling
    setProgressStatus("Sampling... (0%)", { immediate: true });
    progressInterval = setInterval(() => {
      if (!simulationActive) {
        clearInterval(progressInterval);
        return;
      }
      const p = getProgress();
      setProgressStatus(`Sampling... (${p}%)`);
      if(p >= 100) clearInterval(progressInterval);
    }, 250);

    try {
      // Allow UI to update before starting heavy computation
      await sleep(50);
      if (signal.aborted) return completeProfile("aborted");

      const raw = await sampleDominoesFromWasm(n, profile, signal);
      if (raw === null || signal.aborted) return completeProfile("aborted");

      const dominoes = parseDominoWasmResult(raw, profile);
      if (signal.aborted) return completeProfile("aborted");

      // Cache the dominoes for 2D view
      cachedDominoes = dominoes;
      invalidate2DCanvasCache();

      await render2DIfVisible(dominoes, n, profile);
      if (signal.aborted) return completeProfile("aborted");

      if (!shouldRender3D(n)) {
        let reason = "2D view active";
        if (shouldShowLarge3DMessage(n)) {
          createLargeTilingMessage();
          reason = "3D unavailable for n > 300";
        } else if (getActiveView() === "3d" && isNo3DEnabled()) {
          createNo3DMessage();
          reason = "No 3D enabled";
        }
        skipDominoTiming(profile, "heightFunctionMs", reason);
        skipDominoTiming(profile, "render3DMs", reason);
      } else {
        const rendered3D = await render3DFromDominoes(dominoes, n, profile, signal);
        if (!rendered3D && signal.aborted) return completeProfile("aborted");
      }

      stopSimulation();
      clearProgressStatus({ immediate: true });
      return completeProfile("ok");

    } catch(err) {

      profile.error = err.message;
      stopSimulation();
      clearProgressStatus({ immediate: true });
      setProgressStatus(`Error: ${err.message}`, { immediate: true });
      return completeProfile("error");
    }
  }

  function snapshotBenchmarkControls() {
    return {
      n: document.getElementById("n-input")?.value,
      no3D: document.getElementById("no-3d-checkbox")?.checked,
      no3DUserChanged,
      view: document.getElementById("view-2d-btn")?.classList.contains("active") ? "2d" : "3d",
      periodicity: currentPeriodicity()
    };
  }

  function setBenchmarkView(view, no3D) {
    const no3DCheckbox = document.getElementById("no-3d-checkbox");
    if (no3DCheckbox) no3DCheckbox.checked = no3D;

    if (view === "3d") {
      document.getElementById("view-3d-btn")?.click();
    } else {
      document.getElementById("view-2d-btn")?.click();
    }
  }

  function setBenchmarkPeriodicity(periodicity) {
    const radio = document.querySelector(`input[name="periodicity"][value="${periodicity}"]`);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event("change"));
    updatePeriodicityParams();
  }

  function restoreBenchmarkControls(snapshot) {
    if (!snapshot) return;
    setBenchmarkView(snapshot.view, snapshot.no3D);
    if (snapshot.n !== undefined) {
      document.getElementById("n-input").value = snapshot.n;
      updateHeightFunctionVisibility(parseInt(snapshot.n, 10) || 12);
    }
    setBenchmarkPeriodicity(snapshot.periodicity);
  }

  function normalizeBenchmarkCase(testCase) {
    const n = Math.max(2, parseInt(testCase.n, 10) || 100);
    const view = testCase.view === "3d" ? "3d" : "2d";
    const no3D = testCase.no3D !== undefined ? Boolean(testCase.no3D) : view !== "3d";
    return {
      n,
      view,
      no3D,
      periodicity: testCase.periodicity || "uniform",
      label: testCase.label || `${view} n=${n}`
    };
  }

  window.dominoSamplerBenchmark = async function(options = {}) {
    const rawCases = Array.isArray(options.cases) && options.cases.length
      ? options.cases
      : DOMINO_DEFAULT_BENCHMARK_CASES;
    const cases = rawCases.map(normalizeBenchmarkCase);
    const snapshot = snapshotBenchmarkControls();
    const results = [];
    const startedAt = new Date().toISOString();

    try {
      for (let i = 0; i < cases.length; i++) {
        const benchmarkCase = cases[i];
        setBenchmarkView(benchmarkCase.view, benchmarkCase.no3D);
        setBenchmarkPeriodicity(benchmarkCase.periodicity);
        document.getElementById("n-input").value = benchmarkCase.n;
        updateHeightFunctionVisibility(benchmarkCase.n);

        setProgressStatus(`Benchmark ${i + 1}/${cases.length}: ${benchmarkCase.label}`, { immediate: true });

        await sleep(options.caseDelayMs ?? 25);
        const profile = await updateVisualization(benchmarkCase.n, {
          source: "benchmark",
          label: benchmarkCase.label
        });

        results.push({
          case: benchmarkCase,
          status: profile.status,
          timings: { ...profile.timings },
          skipped: [...profile.skipped],
          error: profile.error || null
        });

        if (profile.status === "error" && options.stopOnError !== false) break;
      }
    } finally {
      if (options.restore === true || snapshot.no3DUserChanged) {
        restoreBenchmarkControls(snapshot);
      }

      if (options.leaveNo3D !== false && !snapshot.no3DUserChanged) {
        document.getElementById("no-3d-checkbox").checked = true;
      }
      if (options.leaveView !== "current" && !snapshot.no3DUserChanged) {
        setBenchmarkView("2d", true);
      }

      setProgressStatus("Benchmark complete", { immediate: true, clearAfterMs: 4000 });
    }

    const summary = {
      startedAt,
      finishedAt: new Date().toISOString(),
      defaultCases: !(Array.isArray(options.cases) && options.cases.length),
      results
    };

    window.dominoSamplerLastBenchmark = summary;
    console.info("[domino] benchmark summary", summary);
    return summary;
  };

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

    // Absolute maximum n value for the sampler.
    const max2DN = 500;

    // Check if n is within allowed range
    if (n > max2DN) {
      // Absolute maximum exceeded
      return alert(`n is too large. Maximum value is ${max2DN}.`);
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
        invalidate2DCanvasCache();

        // Stop any running simulation
        stopSimulation();
        clearProgressStatus({ immediate: true });

        // Update visualization using existing cached data
        renderVisibleCachedDominoes();

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
    if (!camera || !controls) return;
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

  // Function to update colors in the visible visualization
  function updateColorsInVisualization() {
    const activeView = getActiveView();

    // Update 3D only when it is visible.
    if (activeView === "3d" && !isNo3DEnabled() && dominoGroup && dominoGroup.children.length > 0) {
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

    // Update 2D only when it is visible; hidden views rebuild from cached data on switch.
    if (activeView === "2d" && cachedDominoes && cachedDominoes.length > 0) {
      invalidate2DCanvasCache();
      updateDominoDisplay();
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
    if (!camera || !controls || !window.THREE?.Vector3) return;
    // Move camera up relative to current view
    const moveAmount = 5;
    const upVector = new THREE.Vector3(0, 1, 0);
    upVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(upVector, moveAmount);
    controls.target.addScaledVector(upVector, moveAmount);
    controls.update();
  });

  document.getElementById("move-down-btn").addEventListener("click", function() {
    if (!camera || !controls || !window.THREE?.Vector3) return;
    // Move camera down relative to current view
    const moveAmount = 5;
    const upVector = new THREE.Vector3(0, 1, 0);
    upVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(upVector, -moveAmount);
    controls.target.addScaledVector(upVector, -moveAmount);
    controls.update();
  });

  document.getElementById("move-left-btn").addEventListener("click", function() {
    if (!camera || !controls || !window.THREE?.Vector3) return;
    // Move camera left relative to current view
    const moveAmount = 5;
    const rightVector = new THREE.Vector3(1, 0, 0);
    rightVector.applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(rightVector, -moveAmount);
    controls.target.addScaledVector(rightVector, -moveAmount);
    controls.update();
  });

  document.getElementById("move-right-btn").addEventListener("click", function() {
    if (!camera || !controls || !window.THREE?.Vector3) return;
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
    if (getActiveView() === "2d") {
      domino2DRenderer?.resetView();
      return;
    }

    if (!camera || !controls) return;
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
  document.getElementById("view-3d-btn").addEventListener("click", async function() {
    const no3D = isNo3DEnabled();

    document.getElementById("aztec-canvas").style.display = "block";
    document.getElementById("aztec-2d-canvas").style.display = "none";
    document.getElementById("view-3d-btn").classList.add("active");
    document.getElementById("view-2d-btn").classList.remove("active");
    document.getElementById("download-png-btn").style.display = "none";
    document.getElementById("download-pdf-btn").style.display = "none";
    document.getElementById("download-3d-btn").style.display = no3D ? "none" : "inline-block";
    document.getElementById("n-input").setAttribute("max", "300");

    const n = parseInt(document.getElementById("n-input").value, 10) || 0;
    if (no3D) {
      createNo3DMessage();
      animationActive = false;
      return;
    }

    if (n > 300) {
      createLargeTilingMessage();
      animationActive = false;
      setProgressStatus("Using cached tiling (n > 300 is only available in 2D view)", {
        immediate: true,
        clearAfterMs: 3000
      });
      return;
    }

    if (cachedDominoes && cachedDominoes.length > 0) {
      setProgressStatus("Restoring cached 3D visualization...", { immediate: true });
      const rendered = await renderVisibleCachedDominoes();
      if (rendered) {
        setProgressStatus("Using cached 3D visualization", { immediate: true, clearAfterMs: 2000 });
      }
      return;
    }

    await ensureThreeJSReady();
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
    if (getActiveView() === "2d") updateDominoDisplay();
  });

  // Checkerboard overlay toggle handler
  document.getElementById("checkerboard-checkbox-2d").addEventListener("change", function() {
    if (getActiveView() === "2d") updateDominoDisplay();
  });

  // Border width input handler - update immediately on input
  document.getElementById("border-width-input").addEventListener("input", function() {
    if (getActiveView() === "2d") updateDominoDisplay();
  });

  // Nonintersecting paths toggle handler
  document.getElementById("paths-checkbox-2d").addEventListener("change", function() {
    if (getActiveView() === "2d") updateDominoDisplay();
  });

  // Dimers toggle handler
  document.getElementById("dimers-checkbox-2d").addEventListener("change", function() {
    if (getActiveView() === "2d") updateDominoDisplay();
  });

  // Height function toggle handler
  document.getElementById("height-function-checkbox-2d").addEventListener("change", function() {
    useHeightFunction = this.checked;
    if (getActiveView() === "2d") updateDominoDisplay();
  });

  // Global color toggle handler
  document.getElementById("show-colors-checkbox").addEventListener("change", function() {
    const showColors = this.checked; // Get the current state of the checkbox


    // Update 2D view if it is visible
    if (getActiveView() === "2d" && cachedDominoes && cachedDominoes.length > 0) {
      updateDominoDisplay();
    }

    // Update 3D view only if it is visible and we're not in a large tiling case
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (getActiveView() === "3d" && !isNo3DEnabled() &&
        n <= 300 && dominoGroup && dominoGroup.children && dominoGroup.children.length > 0) {
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

    // Update 3D view only if it is visible and colors are shown
    const n = parseInt(document.getElementById("n-input").value, 10);
    if (getActiveView() === "3d" && !isNo3DEnabled() &&
        n <= 300 && dominoGroup && dominoGroup.children && dominoGroup.children.length > 0) {
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

  const DOMINO_2D_OVERLAY_LIMIT = 220;
  const DOMINO_2D_SVG_COMPAT_LIMIT = 5000;
  const DOMINO_2D_CACHE_MAX_PX = 4096;
  const DOMINO_2D_CACHE_PADDING = 4;
  let prevCanvasDominoKey = null;

  function canvasKey2D(d) {
    return `${d.x}|${d.y}`;
  }

  function get2DOrder() {
    return parseInt(document.getElementById("n-input").value, 10) || 0;
  }

  function get2DDisplaySettings() {
    const n = get2DOrder();
    return {
      n,
      showColors: document.getElementById("show-colors-checkbox")?.checked !== false,
      useGrayscale: Boolean(document.getElementById("grayscale-checkbox-2d")?.checked),
      showCheckerboard: Boolean(document.getElementById("checkerboard-checkbox-2d")?.checked) && n <= DOMINO_2D_OVERLAY_LIMIT,
      showPaths: Boolean(document.getElementById("paths-checkbox-2d")?.checked) && n <= DOMINO_2D_OVERLAY_LIMIT,
      showDimers: Boolean(document.getElementById("dimers-checkbox-2d")?.checked) && n <= DOMINO_2D_OVERLAY_LIMIT,
      showHeightLabels: Boolean(document.getElementById("height-function-checkbox-2d")?.checked) && n <= 30,
      borderWidth: Math.max(0, parseFloat(document.getElementById("border-width-input")?.value) || 0),
      borderColor: currentColors.border || "#000",
      monoColor: "#F8F8F8"
    };
  }

  function getDominoFillColor(d, settings = get2DDisplaySettings()) {
    if (!settings.showColors) return settings.monoColor;
    if (settings.useGrayscale) return getGrayscaleColor(d.color, d);
    return currentColors[d.color] || d.color || "#cccccc";
  }

  function normalizeDominoColorName(d) {
    const color = String(d.color || "").toLowerCase();
    if (color.includes("green") || color === "#1e8c28" || color === "#00ff00") return "green";
    if (color.includes("blue") || color === "#4363d8" || color === "#0000ff") return "blue";
    if (color.includes("yellow") || color === "#fca414" || color === "#ffff00") return "yellow";
    if (color.includes("red") || color === "#ff2244" || color === "#ff0000") return "red";
    return d.w > d.h ? "blue" : "red";
  }

  function computeDominoBounds(dominoes) {
    if (!dominoes || dominoes.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const d of dominoes) {
      minX = Math.min(minX, d.x);
      minY = Math.min(minY, d.y);
      maxX = Math.max(maxX, d.x + d.w);
      maxY = Math.max(maxY, d.y + d.h);
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY)
    };
  }

  function createCanvasSurface(width, height) {
    const safeWidth = Math.max(1, Math.ceil(width));
    const safeHeight = Math.max(1, Math.ceil(height));
    if (typeof OffscreenCanvas !== "undefined") {
      return new OffscreenCanvas(safeWidth, safeHeight);
    }
    const canvas = document.createElement("canvas");
    canvas.width = safeWidth;
    canvas.height = safeHeight;
    return canvas;
  }

  function collectCheckerboardSquares(dominoes) {
    const latticeSet = new Set();
    const squares = [];
    for (const d of dominoes) {
      if (d.w > d.h) {
        const leftX = Math.floor(d.x / 2) * 2;
        const y = Math.floor(d.y / 2) * 2;
        const leftKey = `${leftX},${y}`;
        const rightKey = `${leftX + 2},${y}`;
        if (!latticeSet.has(leftKey)) {
          latticeSet.add(leftKey);
          squares.push({ x: leftX, y, size: 2 });
        }
        if (!latticeSet.has(rightKey)) {
          latticeSet.add(rightKey);
          squares.push({ x: leftX + 2, y, size: 2 });
        }
      } else {
        const x = Math.floor(d.x / 2) * 2;
        const topY = Math.floor(d.y / 2) * 2;
        const topKey = `${x},${topY}`;
        const bottomKey = `${x},${topY + 2}`;
        if (!latticeSet.has(topKey)) {
          latticeSet.add(topKey);
          squares.push({ x, y: topY, size: 2 });
        }
        if (!latticeSet.has(bottomKey)) {
          latticeSet.add(bottomKey);
          squares.push({ x, y: topY + 2, size: 2 });
        }
      }
    }
    return squares;
  }

  class Domino2DCanvasRenderer {
    constructor(container, canvas) {
      this.container = container;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dominoes = [];
      this.modelBounds = null;
      this.cacheBounds = null;
      this.cacheCanvas = null;
      this.cacheValid = false;
      this.framePending = false;
      this.dpr = 1;
      this.cssWidth = 1;
      this.cssHeight = 1;
      this.viewport = { scale: 1, translateX: 0, translateY: 0 };
      this.hasViewport = false;
      this.isDragging = false;
      this.dragStart = null;
      this.lastBoundsKey = null;

      this.bindEvents();
      this.resize();
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
      } else {
        window.addEventListener("resize", () => this.resize());
      }
    }

    bindEvents() {
      this.canvas.addEventListener("wheel", event => {
        if (!this.dominoes.length) return;
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const factor = event.deltaY > 0 ? 0.85 : 1.18;
        this.zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top);
      }, { passive: false });

      this.canvas.addEventListener("pointerdown", event => {
        if (!this.dominoes.length) return;
        this.isDragging = true;
        this.dragStart = {
          x: event.clientX,
          y: event.clientY,
          translateX: this.viewport.translateX,
          translateY: this.viewport.translateY
        };
        this.canvas.classList.add("dragging");
        this.canvas.setPointerCapture?.(event.pointerId);
      });

      this.canvas.addEventListener("pointermove", event => {
        if (!this.isDragging || !this.dragStart) return;
        this.viewport.translateX = this.dragStart.translateX + event.clientX - this.dragStart.x;
        this.viewport.translateY = this.dragStart.translateY + event.clientY - this.dragStart.y;
        this.scheduleDraw();
      });

      const endDrag = event => {
        this.isDragging = false;
        this.dragStart = null;
        this.canvas.classList.remove("dragging");
        this.canvas.releasePointerCapture?.(event.pointerId);
      };
      this.canvas.addEventListener("pointerup", endDrag);
      this.canvas.addEventListener("pointercancel", endDrag);
      this.canvas.addEventListener("dblclick", () => this.resetView());
    }

    resize() {
      const rect = this.container.getBoundingClientRect();
      this.cssWidth = Math.max(1, Math.round(rect.width || this.container.clientWidth || 1));
      this.cssHeight = Math.max(1, Math.round(rect.height || this.container.clientHeight || 1));
      this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
      const pixelWidth = Math.max(1, Math.round(this.cssWidth * this.dpr));
      const pixelHeight = Math.max(1, Math.round(this.cssHeight * this.dpr));

      if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
        this.canvas.style.width = `${this.cssWidth}px`;
        this.canvas.style.height = `${this.cssHeight}px`;
      }

      if (this.modelBounds && !this.hasViewport) this.fitToView();
      this.scheduleDraw();
    }

    setDominoes(dominoes, options = {}) {
      this.dominoes = Array.isArray(dominoes) ? dominoes : [];
      this.modelBounds = computeDominoBounds(this.dominoes);
      const boundsKey = this.modelBounds
        ? `${this.modelBounds.minX}|${this.modelBounds.minY}|${this.modelBounds.maxX}|${this.modelBounds.maxY}`
        : "empty";
      const shouldReset = options.resetView || !this.hasViewport || boundsKey !== this.lastBoundsKey;
      this.lastBoundsKey = boundsKey;
      this.invalidateCache("dominoes");
      if (shouldReset) this.fitToView();
      this.scheduleDraw();
    }

    invalidateCache() {
      this.cacheValid = false;
    }

    fitToView() {
      if (!this.modelBounds) return;
      const pad = 16;
      const availableWidth = Math.max(1, this.cssWidth - 2 * pad);
      const availableHeight = Math.max(1, this.cssHeight - 2 * pad);
      const scale = Math.max(
        0.001,
        Math.min(availableWidth / this.modelBounds.width, availableHeight / this.modelBounds.height) * 0.98
      );
      this.viewport.scale = scale;
      this.viewport.translateX = (this.cssWidth - this.modelBounds.width * scale) / 2 - this.modelBounds.minX * scale;
      this.viewport.translateY = (this.cssHeight - this.modelBounds.height * scale) / 2 - this.modelBounds.minY * scale;
      this.hasViewport = true;
    }

    resetView() {
      this.fitToView();
      this.scheduleDraw();
    }

    zoomBy(factor, anchorX = this.cssWidth / 2, anchorY = this.cssHeight / 2) {
      const oldScale = this.viewport.scale || 1;
      const newScale = Math.max(0.02, Math.min(80, oldScale * factor));
      const modelX = (anchorX - this.viewport.translateX) / oldScale;
      const modelY = (anchorY - this.viewport.translateY) / oldScale;
      this.viewport.scale = newScale;
      this.viewport.translateX = anchorX - modelX * newScale;
      this.viewport.translateY = anchorY - modelY * newScale;
      this.scheduleDraw();
    }

    scheduleDraw() {
      if (this.framePending) return;
      this.framePending = true;
      requestAnimationFrame(() => {
        this.framePending = false;
        this.drawFrame();
      });
    }

    renderNow() {
      this.resize();
      this.renderCache();
      this.drawFrame();
    }

    getCanvasBackground() {
      const styles = getComputedStyle(this.container);
      return styles.backgroundColor && styles.backgroundColor !== "rgba(0, 0, 0, 0)"
        ? styles.backgroundColor
        : "#f8f8f8";
    }

    renderCache() {
      if (this.cacheValid || !this.dominoes.length || !this.modelBounds) return;

      const cacheBounds = {
        minX: this.modelBounds.minX - DOMINO_2D_CACHE_PADDING,
        minY: this.modelBounds.minY - DOMINO_2D_CACHE_PADDING,
        maxX: this.modelBounds.maxX + DOMINO_2D_CACHE_PADDING,
        maxY: this.modelBounds.maxY + DOMINO_2D_CACHE_PADDING
      };
      cacheBounds.width = cacheBounds.maxX - cacheBounds.minX;
      cacheBounds.height = cacheBounds.maxY - cacheBounds.minY;

      const naturalScale = Math.max(1, Math.min(this.dpr, 2));
      const cacheScale = Math.max(
        0.5,
        Math.min(naturalScale, DOMINO_2D_CACHE_MAX_PX / Math.max(cacheBounds.width, cacheBounds.height))
      );
      const surface = createCanvasSurface(cacheBounds.width * cacheScale, cacheBounds.height * cacheScale);
      const ctx = surface.getContext("2d");
      const settings = get2DDisplaySettings();

      ctx.save();
      ctx.scale(cacheScale, cacheScale);
      ctx.translate(-cacheBounds.minX, -cacheBounds.minY);
      ctx.clearRect(cacheBounds.minX, cacheBounds.minY, cacheBounds.width, cacheBounds.height);
      this.drawDominoFillBatches(ctx, settings);
      this.drawCheckerboardOverlay(ctx, settings);
      this.drawBorderStrokePass(ctx, settings);
      this.drawPathOverlay(ctx, settings);
      this.drawDimerOverlay(ctx, settings);
      this.drawHeightLabels(ctx, settings);
      ctx.restore();

      this.cacheBounds = cacheBounds;
      this.cacheCanvas = surface;
      this.cacheValid = true;
      this.cacheScale = cacheScale;
    }

    drawDominoFillBatches(ctx, settings) {
      const batches = new Map();
      const inset = settings.borderWidth > 0 ? Math.min(0.04, settings.borderWidth * 0.04) : 0;
      for (const d of this.dominoes) {
        const fill = getDominoFillColor(d, settings);
        if (!batches.has(fill)) batches.set(fill, new Path2D());
        const path = batches.get(fill);
        path.rect(
          d.x + inset,
          d.y + inset,
          Math.max(0.001, d.w - 2 * inset),
          Math.max(0.001, d.h - 2 * inset)
        );
      }

      for (const [fill, path] of batches) {
        ctx.fillStyle = fill;
        ctx.fill(path);
      }
    }

    drawBorderStrokePass(ctx, settings) {
      if (settings.borderWidth <= 0) return;
      const path = new Path2D();
      const inset = Math.min(0.04, settings.borderWidth * 0.04);
      for (const d of this.dominoes) {
        path.rect(
          d.x + inset,
          d.y + inset,
          Math.max(0.001, d.w - 2 * inset),
          Math.max(0.001, d.h - 2 * inset)
        );
      }
      ctx.save();
      ctx.strokeStyle = settings.borderColor;
      ctx.lineWidth = settings.borderWidth;
      ctx.lineJoin = "miter";
      ctx.stroke(path);
      ctx.restore();
    }

    drawCheckerboardOverlay(ctx, settings) {
      if (!settings.showCheckerboard) return;
      const path = new Path2D();
      for (const square of collectCheckerboardSquares(this.dominoes)) {
        const isBlack = ((square.x / 2) + (square.y / 2)) % 2 === 0;
        if (isBlack) path.rect(square.x, square.y, square.size, square.size);
      }
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fill(path);
      ctx.restore();
    }

    drawPathOverlay(ctx, settings) {
      if (!settings.showPaths) return;
      ctx.save();
      ctx.beginPath();
      for (const d of this.dominoes) {
        const isHorizontal = d.w > d.h;
        const colorType = normalizeDominoColorName(d);
        const centerX = d.x + d.w / 2;
        const centerY = d.y + d.h / 2;
        const pathHalfLength = Math.min(d.w, d.h) * 1.2;

        if (isHorizontal && colorType === "green") {
          ctx.moveTo(d.x, centerY);
          ctx.lineTo(d.x + d.w, centerY);
        } else if (!isHorizontal && colorType === "yellow") {
          ctx.moveTo(centerX - pathHalfLength / 2, centerY + pathHalfLength / 2);
          ctx.lineTo(centerX + pathHalfLength / 2, centerY - pathHalfLength / 2);
        } else if (!isHorizontal && colorType === "red") {
          ctx.moveTo(centerX - pathHalfLength / 2, centerY - pathHalfLength / 2);
          ctx.lineTo(centerX + pathHalfLength / 2, centerY + pathHalfLength / 2);
        }
      }
      ctx.strokeStyle = "black";
      ctx.lineWidth = 0.6;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    }

    drawDimerOverlay(ctx, settings) {
      if (!settings.showDimers) return;
      const edges = [];
      const nodes = [];
      for (const d of this.dominoes) {
        if (d.w <= 0 || d.h <= 0) continue;
        if (d.w > d.h) {
          const centerX = d.x + d.w / 2;
          const midY = d.y + d.h / 2;
          const dimerLength = d.w / 2;
          const leftX = centerX - dimerLength / 2;
          const rightX = centerX + dimerLength / 2;
          edges.push([leftX, midY, rightX, midY]);
          nodes.push([leftX, midY], [rightX, midY]);
        } else {
          const midX = d.x + d.w / 2;
          const centerY = d.y + d.h / 2;
          const dimerLength = d.h / 2;
          const topY = centerY - dimerLength / 2;
          const bottomY = centerY + dimerLength / 2;
          edges.push([midX, topY, midX, bottomY]);
          nodes.push([midX, topY], [midX, bottomY]);
        }
      }

      ctx.save();
      ctx.strokeStyle = "black";
      ctx.fillStyle = "black";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      for (const [x1, y1, x2, y2] of edges) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.beginPath();
      for (const [x, y] of nodes) {
        ctx.moveTo(x + 0.4, y);
        ctx.arc(x, y, 0.4, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    drawHeightLabels(ctx, settings) {
      if (!settings.showHeightLabels) return;
      const heights = calculateHeightFunction(this.dominoes);
      if (!heights.size) return;
      const minSidePx = Math.min(...this.dominoes.map(d => Math.min(d.w, d.h)));
      const unit = minSidePx / 2;
      if (unit <= 0) return;
      const fontSize = Math.max(0.8, Math.min(1.2, 3.6 - settings.n / 20.0));

      ctx.save();
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.fillStyle = "#000";
      ctx.lineWidth = 0.3;
      for (const [key, h] of heights) {
        const [gx, gy] = key.split(",").map(Number);
        const px = gx * unit;
        const py = gy * unit;
        ctx.strokeText(String(h), px, py);
        ctx.fillText(String(h), px, py);
      }
      ctx.restore();
    }

    drawFrame() {
      const ctx = this.ctx;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
      ctx.fillStyle = this.getCanvasBackground();
      ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

      if (this.dominoes.length && this.modelBounds) {
        this.renderCache();
        if (this.cacheCanvas && this.cacheBounds) {
          ctx.imageSmoothingEnabled = true;
          if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
          ctx.drawImage(
            this.cacheCanvas,
            this.viewport.translateX + this.cacheBounds.minX * this.viewport.scale,
            this.viewport.translateY + this.cacheBounds.minY * this.viewport.scale,
            this.cacheBounds.width * this.viewport.scale,
            this.cacheBounds.height * this.viewport.scale
          );
        }
      }
      ctx.restore();
    }

    toBlob(callback) {
      this.renderNow();
      this.canvas.toBlob(callback, "image/png", 1.0);
    }
  }

  function sync2DSVGForExport(dominoes = cachedDominoes) {
    const svg = document.getElementById("aztec-svg-2d");
    if (!svg) return;
    svg.replaceChildren();
    if (!dominoes || dominoes.length === 0) return;

    const bounds = computeDominoBounds(dominoes);
    if (!bounds) return;
    svg.setAttribute("viewBox", `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
    svg.dataset.renderer = dominoes.length <= DOMINO_2D_SVG_COMPAT_LIMIT ? "small-svg" : "canvas";
    if (dominoes.length > DOMINO_2D_SVG_COMPAT_LIMIT) return;

    const settings = get2DDisplaySettings();
    const fragment = document.createDocumentFragment();
    const ns = "http://www.w3.org/2000/svg";
    for (const d of dominoes) {
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", d.x);
      rect.setAttribute("y", d.y);
      rect.setAttribute("width", d.w);
      rect.setAttribute("height", d.h);
      rect.setAttribute("fill", getDominoFillColor(d, settings));
      rect.setAttribute("stroke", settings.borderColor);
      rect.setAttribute("stroke-width", settings.borderWidth);
      fragment.appendChild(rect);
    }
    svg.appendChild(fragment);
  }

  domino2DRenderer = new Domino2DCanvasRenderer(
    document.getElementById("aztec-2d-canvas"),
    document.getElementById("aztec-canvas-2d")
  );

  updateDominoDisplay = function() {
    if (!domino2DRenderer) return;
    invalidate2DCanvasCache();
    domino2DRenderer.scheduleDraw();
  };

  toggleHeightFunction = function() {
    useHeightFunction = document.getElementById("height-function-checkbox-2d")?.checked || false;
    updateDominoDisplay();
  };

  render2D = async function(dominoes) {
    if (!dominoes?.length || !domino2DRenderer) return;
    const currentN = parseInt(document.getElementById("n-input").value, 10);
    const shouldResetView = prevCanvasDominoKey === null || currentN !== lastNRendered;
    domino2DRenderer.setDominoes(dominoes, { resetView: shouldResetView });
    domino2DRenderer.renderNow();
    sync2DSVGForExport(dominoes);
    prevCanvasDominoKey = dominoes.length > 0 ? canvasKey2D(dominoes[0]) : "empty";
    lastNRendered = currentN;
  };

  document.getElementById("zoom-in-btn-2d").addEventListener("click", () => {
    domino2DRenderer?.zoomBy(1.3);
  });

  document.getElementById("zoom-out-btn-2d").addEventListener("click", () => {
    domino2DRenderer?.zoomBy(0.7);
  });

  document.getElementById("zoom-reset-btn-2d").addEventListener("click", () => {
    domino2DRenderer?.resetView();
  });

  document.getElementById("view-2d-btn").addEventListener("click", async function() {
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

      await render2D(cachedDominoes);

      // If we're switching from 3D to 2D, update the progress indicator
      const n = parseInt(document.getElementById("n-input").value, 10);
      if (n > 300) {
        setProgressStatus("Using cached tiling (n > 300 is only available in 2D view)", {
          immediate: true,
          clearAfterMs: 3000
        });
      } else {
        setProgressStatus("Using cached tiling", { immediate: true, clearAfterMs: 2000 });
      }
    }

    // Pause 3D animation to save resources
    animationActive = false;
  });

  // No 3D checkbox event listener
  document.getElementById("no-3d-checkbox").addEventListener("change", function() {
    no3DUserChanged = true;
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
    const periodicity = currentPeriodicity();

    params.set('n', n);
    if (periodicity !== 'uniform') params.set('p', periodicity);

    if (periodicity === '2x2') {
      const a = document.getElementById('a-input')?.value;
      const b = document.getElementById('b-input')?.value;
      if (a) params.set('a', a);
      if (b) params.set('b', b);
    } else if (periodicity === '3x3') {
      const weights = readInputValues(['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9']);
      if (weights.length) params.set('w', weights.join(','));
    } else if (periodicity === '6x2') {
      const weights = readInputValues(Array.from({ length: 12 }, (_, i) => `w6x2_${i + 1}`));
      if (weights.length) params.set('w6x2', weights.join(','));
    }

    return window.location.origin + window.location.pathname + '?' + params.toString();
  }

  function readInputValues(ids) {
    return ids.map(id => document.getElementById(id)?.value ?? '');
  }

  function setInputValues(ids, values) {
    ids.forEach((id, index) => {
      if (values[index] === undefined || values[index] === '') return;
      const input = document.getElementById(id);
      if (!input) return;
      input.value = values[index];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function parseWeightList(value) {
    return String(value || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  }

  function readWeightsFromParams(params, listParam, ids) {
    if (params.has(listParam)) return parseWeightList(params.get(listParam));
    return ids.map(id => params.get(id) || '');
  }

  function setPeriodicityFromUrl(value) {
    const allowed = new Set(['uniform', '2x2', '3x3', '6x2', 'frozenH', 'frozenV']);
    if (!allowed.has(value)) return;
    const radio = Array.from(document.querySelectorAll('input[name="periodicity"]'))
      .find(input => input.value === value);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
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
      setPeriodicityFromUrl(params.get('p'));
    }
    if (params.has('a')) {
      const weightA = document.getElementById('a-input');
      if (weightA) weightA.value = params.get('a');
    }
    if (params.has('b')) {
      const weightB = document.getElementById('b-input');
      if (weightB) weightB.value = params.get('b');
    }
    const weight3x3Ids = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'];
    const weight6x2Ids = Array.from({ length: 12 }, (_, i) => `w6x2_${i + 1}`);
    setInputValues(weight3x3Ids, readWeightsFromParams(params, 'w', weight3x3Ids));
    setInputValues(weight6x2Ids, readWeightsFromParams(params, 'w6x2', weight6x2Ids));
    updatePeriodicityParams();
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

    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
    if (isArrowKey) {
      if (getActiveView() !== "3d" || !camera || !controls || !window.THREE?.Vector3) return;
      event.preventDefault();
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

  let firstSampleAttempts = 0;
  let firstSampleDone = false;

  function firstSampleWhenReady() {
    if (firstSampleDone) return;
    firstSampleAttempts++;

    // 1. container for the active default view
    const activeViewIs2D = document.getElementById("view-2d-btn")?.classList.contains("active");
    const container = document.getElementById(activeViewIs2D ? 'aztec-2d-canvas' : 'aztec-canvas');

    // 2. if it is still collapsed (0×0), try again (with limit)
    if (!container || !container.clientWidth || !container.clientHeight) {
      if (firstSampleAttempts < 100) {
        return requestAnimationFrame(firstSampleWhenReady);
      }
      // Fallback: try anyway after 100 attempts
    }

    firstSampleDone = true;

    // 3. everything is ready – launch the initial sample
    const n = parseInt(document.getElementById("n-input").value, 10) || 12;
    updateHeightFunctionVisibility(n);

    // Add visible loading indicator before starting
    setProgressStatus("Initializing...", { immediate: true });

    // Use a short timeout to ensure UI updates before heavy computation
    setTimeout(() => {
      updateVisualization(n);
    }, 50);
  }

  // Make sure we also explicitly update any time the pane becomes visible
  function ensureVisualization() {
    if (document.visibilityState === 'visible') {
      // If no tiling yet, trigger first sample
      if (!cachedDominoes || cachedDominoes.length === 0) {
        if (!firstSampleDone) {
          firstSampleWhenReady();
        }
        return;
      }
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
    if (!domino2DRenderer || !cachedDominoes || cachedDominoes.length === 0) {
      alert("Please sample a domino tiling first by clicking the 'Sample' button.");
      return;
    }

    const n = parseInt(document.getElementById("n-input").value) || 12;
    const periodicity = document.querySelector('input[name="periodicity"]:checked').value;
    const filename = `aztec_diamond_2d_n${n}_${periodicity}.png`;

    domino2DRenderer.toBlob(function(blob) {
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
    });
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
      const useGrayscale = document.getElementById("grayscale-checkbox-2d")?.checked === true;
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
      if (glauberRunning) {
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
