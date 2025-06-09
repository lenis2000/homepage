---
title: Shuffling algorithm for q-volume lozenge tilings of the hexagon
model: lozenge-tilings
author: 'Vadim Gorin (original code); Leonid Petrov (porting)'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-06-02-q-vol-Gorin.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/lozenge_tilings/2025-06-02-q-vol-Gorin.cpp'
    txt: 'C++ code for the simulation'
---

<style>
  /* Interface container and responsive layout */
  .interface-container {
    display: grid;
    gap: 16px;
    padding: 16px;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Desktop layout */
  @media (min-width: 768px) {
    .interface-container {
      grid-template-columns: repeat(2, 1fr);
    }

    .control-group.full-width,
    .full-width {
      grid-column: 1 / -1;
    }
  }

  /* Mobile layout */
  @media (max-width: 767px) {
    .interface-container {
      grid-template-columns: 1fr;
    }
  }

  /* Visual grouping */
  .control-group {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .control-group-title {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Basic styling for the canvas */
  #lozenge-canvas {
    width: 100%;
    max-width: 800px;
    height: 400px; /* Default height, will be calculated dynamically */
    border: 1px solid #ccc;
    display: block;
    margin: 0 auto;
  }

  /* Legacy controls class for backward compatibility */
  .controls {
    margin-bottom: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .controls > * {
    flex-shrink: 0;
  }

  /* Parameter grid layout */
  .parameters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 12px;
    margin-bottom: 12px;
  }

  .param-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .param-item label {
    font-weight: 500;
    min-width: 20px;
  }

  .param-item input {
    flex: 1;
    min-width: 50px;
  }

  .button-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Consistent input styling */
  input[type="number"],
  input[type="text"],
  select {
    height: 36px;
    padding: 0 12px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  input[type="number"]:focus,
  input[type="text"]:focus,
  select:focus {
    outline: none;
    border-color: #4CAF50;
  }

  /* Button improvements */
  button {
    height: 36px;
    padding: 0 16px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  button:hover {
    background: #f5f5f5;
    border-color: #999;
  }

  button:active {
    background: #e0e0e0;
  }

  /* Primary action buttons */
  button.primary {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }

  button.primary:hover {
    background: #45a049;
  }

  /* Current configuration display */
  .config-display {
    background: #e8f5e9;
    border: 1px solid #4CAF50;
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;
  }

  .config-display h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #2e7d32;
  }

  .config-values {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .config-item {
    font-family: 'SF Mono', Monaco, monospace;
    color: #1976d2;
  }

  /* Color legend */
  .color-legend {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #fafafa;
    border-radius: 8px;
    flex-wrap: wrap;
  }

  .legend-title {
    font-weight: 600;
    color: #666;
  }

  .legend-items {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  .color-box {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid rgba(0,0,0,0.1);
  }

  /* Mobile touch targets and accessibility */
  @media (max-width: 767px) {
    .interface-container {
      padding: 8px;
      gap: 8px;
    }

    .control-group {
      padding: 8px;
      margin-bottom: 8px;
    }

    .control-group-title {
      font-size: 11px;
      margin-bottom: 6px;
    }

    button {
      min-height: 44px;
      min-width: 44px;
      padding: 0 12px;
      font-size: 13px;
    }

    input[type="number"],
    input[type="text"],
    select {
      height: 40px;
      font-size: 14px;
      padding: 0 6px;
    }

    /* Smaller text inputs where space is critical */
    #steps, #border-width {
      height: 36px;
      font-size: 13px;
      padding: 0 4px;
    }

    /* Compact select elements */
    select {
      height: 38px;
      font-size: 13px;
      padding: 0 4px;
    }

    /* Smaller palette dropdown specifically */
    #palette-select {
      height: 36px;
      font-size: 12px;
      padding: 0 4px;
      max-width: 120px;
    }

    .parameters-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .button-row {
      gap: 6px;
    }

    .param-item {
      gap: 2px;
    }

    .param-item label {
      font-size: 14px;
      min-width: 16px;
    }

    #lozenge-canvas {
      max-width: 100%;
      height: auto; /* Let dynamic sizing handle this */
      min-height: 200px;
    }

    .config-display {
      padding: 12px;
      margin-top: 8px;
    }

    .config-display h3 {
      font-size: 14px;
      margin-bottom: 6px;
    }

    .config-values {
      gap: 12px;
    }

    .config-item {
      font-size: 12px;
    }

    .color-legend {
      padding: 8px;
      gap: 8px;
    }

    .legend-items {
      gap: 12px;
    }

    .legend-item {
      font-size: 12px;
      gap: 4px;
    }

    .color-box {
      width: 16px;
      height: 16px;
    }


    /* Custom color panel mobile optimization */
    .custom-colors-panel {
      padding: 10px !important;
    }

    .color-palette label {
      width: 80px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
    }

    .color-palette input[type="color"] {
      width: 32px !important;
      height: 24px !important;
    }

    .color-palette input[type="text"] {
      width: 55px !important;
      height: 22px !important;
      font-size: 10px !important;
      padding: 2px !important;
    }

    /* Summary and details mobile styling */
    summary {
      padding: 10px 12px !important;
      font-size: 14px !important;
    }

    details .content {
      padding: 12px !important;
      font-size: 14px !important;
    }

    /* Keyboard info mobile optimization */
    #keyboard-info-details > .keyboard-info {
      padding: 8px !important;
      font-size: 11px !important;
      display: block !important; /* Show on mobile now that it's smaller */
    }
  }

  /* Focus states for accessibility */
  *:focus-visible {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  /* Loading and disabled states */
  button.loading {
    opacity: 0.7;
    cursor: wait;
  }

  button:disabled,
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* --- General Styling for ALL details elements --- */
  details {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px; /* Default spacing */
  }
  details:last-of-type {
    margin-bottom: 20px; /* Ensure consistent final spacing */
  }

  details > summary {
    padding: 12px 16px;
    background: #f5f5f5;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
    list-style-position: inside;
  }

  details[open] > summary {
    border-bottom: 1px solid #e0e0e0;
  }

  /* Content wrapper div directly inside details */
  details > .content {
    padding: 16px;
    background: white;
  }
  details > .content.control-group-content {
    background: #f5f5f5; /* Match original .control-group background */
    border: 1px solid #e0e0e0; /* Match original .control-group border */
    border-top: none; /* Summary border is enough */
    border-radius: 0 0 8px 8px;
    margin: -1px; /* To align with summary border if details has its own */
    margin-top: 0;
    padding: 12px; /* Match original .control-group padding */
  }
  #animation-controls-details {
    background: transparent; /* Let content handle bg */
    border: 1px solid #e0e0e0;
  }
  #animation-controls-details > summary {
    background: #f5f5f5; /* Title background */
  }
  /* Title styling when inside summary */
  details > summary > .control-group-title {
    display: inline;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0;
  }

  /* --- Styling for the MAIN "More Options" details (#more-options-details) --- */
  details#more-options-details {
    border: none; /* No border for the main container itself */
    background: transparent;
    margin-bottom: 0; /* It's a container, spacing handled by nested items */
    padding: 0;
  }
  details#more-options-details > .content {
    padding: 0; /* No padding, it just holds nested details */
    background: transparent;
  }

  /* More Options behaves the same on both mobile and desktop - always collapsible */
  details#more-options-details > summary {
    display: block; /* Summary is clickable on both mobile and desktop */
  }

  @media (max-width: 767px) {
    details#more-options-details > .content {
      padding: 8px; /* Mobile container padding */
    }
  }

  /* --- Styling for NESTED details elements within "More Options" --- */
  details.nested-control-group {
    margin-bottom: 10px;
    border: 1px solid #e8e8e8; /* Lighter border */
    border-radius: 6px;
  }
  details.nested-control-group:last-child {
    margin-bottom: 0;
  }
  details.nested-control-group > summary {
    background: #f9f9f9; /* Lighter summary background */
    padding: 10px 14px;
    font-size: 0.95em; /* Slightly smaller text */
    border-bottom: none; /* No border unless open */
  }
  details.nested-control-group[open] > summary {
    border-bottom: 1px solid #e0e0e0;
  }
  details.nested-control-group > .content {
    padding: 12px; /* Slightly smaller padding */
  }

  /* Special handling for #custom-colors-panel within #styling-controls-details */
  details#styling-controls-details > #custom-colors-panel {
    padding: 15px;
    background-color: #f8f9fa;
    border-top: 1px solid #e0e0e0; /* Separator from .content above */
    margin: 0; /* Reset original margin */
    border-radius: 0 0 6px 6px; /* Match bottom of parent details */
  }
  details#styling-controls-details:not([open]) > #custom-colors-panel {
    display: none; /* Hidden if styling-controls is closed */
  }
  @media (max-width: 767px) {
    details#styling-controls-details > #custom-colors-panel {
      padding: 10px;
    }
  }

  /* --- Styling for Info Sections (Config, Legend) & Keyboard Shortcuts --- */
  details.info-section-details,
  details#keyboard-info-details,
  details#about-simulation-details,
  details#animation-controls-details {
    /* These use the general 'details', 'summary', '.content' styles. */
  }
  /* Ensure the content of these sections uses the correct background */
  details.info-section-details > .content,
  details#keyboard-info-details > .keyboard-info,
  details#about-simulation-details > .content {
    background-color: white; /* Default content background for these */
  }
  /* Override for animation controls content to match its original group style */
  details#animation-controls-details > .content.control-group-content {
    background-color: #f5f5f5; /* Original control group background */
    border: none; /* The details element itself provides the border */
  }

  /* Ensure .keyboard-info (when child of details) displays correctly */
  #keyboard-info-details > .keyboard-info {
    display: block;
    margin-top: 0;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 0 0 4px 4px;
    font-size: 12px;
  }
  .keyboard-info {
    margin-top: 10px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
    font-size: 12px;
  }

  /* Custom colors panel */
  .custom-colors-panel {
    display: none;
    margin-top: 10px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #ccc;
  }

  .color-palette {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .color-palette label {
    width: 120px;
    font-weight: bold;
  }

  .color-palette input[type="color"] {
    width: 40px;
    height: 30px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .color-palette input[type="text"] {
    width: 70px;
    height: 26px;
    font-family: monospace;
    font-size: 12px;
    text-align: center;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  /* Color indicator */
  .color-indicator {
    margin-top: 5px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }

  .color-swatch {
    width: 20px;
    height: 20px;
    border: 1px solid #333;
    border-radius: 3px;
    display: inline-block;
  }

  /* Export modal styles */
  .export-modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
  }

  .export-modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 20px;
    border-radius: 8px;
    width: 80%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .export-textarea {
    width: 100%;
    height: 300px;
    font-family: monospace;
    font-size: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    margin: 10px 0;
    resize: vertical;
  }

  .export-buttons {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .export-buttons button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #f8f9fa;
    cursor: pointer;
  }

  .export-buttons button:hover {
    background-color: #e9ecef;
  }

  .close-modal {
    float: right;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    color: #aaa;
  }

  .close-modal:hover {
    color: #000;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    #lozenge-canvas {
      height: 60vh;
      min-height: 400px;
    }
    .controls {
      font-size: 14px;
    }
    .controls input[type="number"] {
      width: 50px !important;
    }
    .controls button {
      padding: 5px 10px;
      font-size: 13px;
    }
  }
</style>

<script src="/js/three.min.js"></script>
<script src="/js/OrbitControls.js"></script>
<script src="/js/colorschemes.js"></script>
<script src="/js/2025-06-02-q-vol-Gorin.js"></script>

<details id="about-simulation-details">
<summary>About this simulation</summary>
<div class="content">

This simulation demonstrates <strong>lozenge tilings</strong> using a WASM/JS port of a program by <a href="https://www.stat.berkeley.edu/~vadicgor/research.html">Vadim Gorin</a>.
The simulation generates lozenge tilings of a hexagon with sides $N$, $S$, and $T-S$ under the $q^{-volume}$ measure.
<br><br>
The sampler works entirely in your browser using WebAssembly.

</div>
</details>

---

<!-- Controls for the simulation -->
<div class="interface-container">
<!-- Parameters Group -->
<div class="control-group full-width">
  <div class="control-group-title">Parameters</div>
  <div class="parameters-grid">
    <div class="param-item">
      <label for="N">N:</label>
      <input type="number" id="N" value="20" min="1" max="200" style="width: 60px;">
    </div>
    <div class="param-item">
      <label for="T">T:</label>
      <input type="number" id="T" value="30" min="1" max="500" style="width: 60px;">
    </div>
    <div class="param-item">
      <label for="S">S:</label>
      <input type="number" id="S" value="25" min="0" style="width: 60px;">
    </div>
    <div class="param-item">
      <label for="q">q:</label>
      <input type="number" id="q" value="1" step="0.02" min="0.01" style="width: 80px;">
    </div>
  </div>
  <div class="button-row">
    <button id="initialize" class="primary">Initialize</button>
    <button id="set-parameters">Set Parameters</button>
  </div>
</div>

<!-- Animation Controls -->
<details id="animation-controls-details" class="full-width">
  <summary><div class="control-group-title">Animation Controls</div></summary>
  <div class="content control-group-content">
    <div class="button-row">
      <label for="steps" style="font-style: italic;">r =</label>
      <input id="steps" type="number" value="1" min="1" max="9999" style="width: 60px;">
      <button id="step-plus">S → S+r</button>
      <button id="step-minus">S → S-r</button>
      <button id="step-plus-back">S → S+r → S</button>
      <button id="step-minus-forward">S → S-r → S</button>
    </div>
  </div>
</details>

<!-- More Options (Mobile Collapsible) -->
<details class="control-group full-width" id="more-options-details">
  <summary>More Options</summary>
  <div class="content">
    <!-- View Controls -->
    <details class="nested-control-group">
      <summary><div class="control-group-title">View Controls</div></summary>
      <div class="content">
        <div class="button-row">
          <button id="zoom-in">Zoom In</button>
          <button id="zoom-out">Zoom Out</button>
          <button id="zoom-reset">Reset Zoom</button>
        </div>
      </div>
    </details>

    <!-- Styling Controls -->
    <details class="nested-control-group" id="styling-controls-details">
      <summary><div class="control-group-title">Styling Controls</div></summary>
      <div class="content">
        <div class="button-row">
          <label for="style">Style:</label>
          <select id="style">
            <option value="1" selected>Lozenges</option>
            <option value="5">Z² paths</option>
          </select>
        </div>
        <div class="button-row">
          <label>Border Width:</label>
          <input id="border-width" type="number" value="0.01" step="0.001" min="0" max="0.2" style="width: 100px;">
          <button id="border-thin">Thin</button>
          <button id="border-medium">Medium</button>
          <button id="border-thick">Thick</button>
          <button id="border-ultra-thick">Ultra Thick</button>
        </div>
        <div class="button-row">
          <label for="palette-select">Palette:</label>
          <button id="prev-palette">◀</button>
          <select id="palette-select">
            <!-- Original Palettes -->
            <option value="0">UVA</option>
            <option value="1">No Colors</option>
            <option value="2">Ocean Breeze</option>
            <option value="3">Forest Calm</option>
            <option value="4">Sunset Glow</option>
            <option value="5">Royal Purple</option>
            <option value="6">Arctic Frost</option>
            <option value="7">Cherry Blossom</option>
            <option value="8">Tropical</option>
            <option value="9">Emerald Dream</option>
            <option value="10">Cosmic Blue</option>
            <option value="11">Autumn Leaves</option>
            <option value="12">Lavender Fields</option>
            <option value="13">Desert Sand</option>
            <option value="14">Coral Reef</option>
            <option value="15">Midnight Sky</option>
            <option value="16">Rose Garden</option>
            <option value="17">Sage Green</option>
            <option value="18">Amber Glow</option>
            <option value="19">Steel Blue</option>
            <!-- Flag-Inspired Palettes -->
            <option value="20">Italy</option>
            <option value="21">France</option>
            <option value="22">United Kingdom</option>
            <option value="23">Jamaica</option>
            <option value="24">Belgium</option>
            <option value="25">Colombia</option>
            <option value="26">South Korea</option>
            <option value="27">Brazil</option>
            <option value="28">Argentina</option>
            <!-- Coding Themes -->
            <option value="29">Dracula</option>
            <option value="30">Monokai</option>
            <option value="31">Solarized Dark</option>
            <option value="32">One Dark</option>
            <option value="33">Material</option>
            <option value="34">Nord</option>
            <option value="35">Gruvbox Dark</option>
            <option value="36">Atom One Light</option>
            <!-- University Colors -->
            <option value="37">Harvard</option>
            <option value="38">MIT</option>
            <option value="39">Stanford</option>
            <option value="40">Yale</option>
            <option value="41">Princeton</option>
            <option value="42">Columbia</option>
            <option value="43">Berkeley</option>
            <option value="44">Michigan</option>
            <option value="45">Cornell</option>
            <option value="46">Northwestern</option>
            <option value="47">Northeastern</option>
            <option value="48">Duke</option>
          </select>
          <button id="next-palette">▶</button>
          <button id="permute-colors">Permute Colors</button>
          <button id="custom-colors">Custom Colors</button>
        </div>
      </div>
      <div id="custom-colors-panel" class="custom-colors-panel">
        <h4>Custom Color Palettes</h4>

        <div class="color-palette">
          <label>Up Rhombi:</label>
          <input type="color" id="color-gray1" value="#E57200">
          <input type="text" id="hex-gray1" value="#E57200" placeholder="#RRGGBB">
        </div>

        <div class="color-palette">
          <label>Down Rhombi:</label>
          <input type="color" id="color-gray2" value="#232D4B">
          <input type="text" id="hex-gray2" value="#232D4B" placeholder="#RRGGBB">
        </div>

        <div class="color-palette">
          <label>Horizontal:</label>
          <input type="color" id="color-gray3" value="#F9DCBF">
          <input type="text" id="hex-gray3" value="#F9DCBF" placeholder="#RRGGBB">
        </div>

        <div class="color-palette">
          <label>Border:</label>
          <input type="color" id="color-border" value="#666666">
          <input type="text" id="hex-border" value="#666666" placeholder="#RRGGBB">
        </div>

        <div style="margin-top: 15px;">
          <button id="reset-default-colors">Reset to Default</button>
          <button id="close-custom-colors" style="margin-left: 10px;">Close</button>
        </div>
      </div>
    </details>

    <!-- Export Controls -->
    <details class="nested-control-group">
      <summary><div class="control-group-title">Export</div></summary>
      <div class="content">
        <div class="button-row">
          <button id="export-tikz">Export TikZ</button>
        </div>
        <div id="tikz-export-display" style="display: none; margin-top: 12px;">
          <div style="margin-bottom: 8px; font-weight: 600; color: #666;">TikZ Code:</div>
          <textarea id="tikz-export-textarea" readonly style="width: 100%; height: 300px; font-family: monospace; font-size: 11px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; resize: vertical; background: #f8f9fa;"></textarea>
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button id="copy-tikz-clipboard">Copy TikZ to Clipboard</button>
            <button id="download-tikz-file">Download TikZ File</button>
            <button id="hide-tikz-export">Hide</button>
          </div>
        </div>
      </div>
    </details>
  </div>
</details>

</div> <!-- End interface-container -->

<!-- Visualization canvas -->
<canvas id="lozenge-canvas"></canvas>

<!-- Current Configuration -->
<details class="info-section-details" id="config-details">
  <summary>Current Configuration</summary>
  <div class="content">
    <div class="config-values" id="info">
      <span class="config-item">N = <strong>20</strong></span>
      <span class="config-item">T = <strong>30</strong></span>
      <span class="config-item">S = <strong>25</strong></span>
      <span class="config-item">q = <strong>1</strong></span>
    </div>
  </div>
</details>

<!-- Color Legend -->
<details class="info-section-details" id="legend-details">
  <summary>Color Legend</summary>
  <div class="content">
    <div class="legend-items">
      <span class="legend-item">
        <span class="color-box" id="swatch-gray1" style="background-color: #E57200;"></span>
        Up
      </span>
      <span class="legend-item">
        <span class="color-box" id="swatch-gray2" style="background-color: #232D4B;"></span>
        Down
      </span>
      <span class="legend-item">
        <span class="color-box" id="swatch-gray3" style="background-color: #F9DCBF;"></span>
        Horizontal
      </span>
      <span class="legend-item">
        <span class="color-box" id="swatch-border" style="background-color: #666666; border: 1px solid #333;"></span>
        Border
      </span>
      <span class="legend-item">
        <span style="font-weight: 600;" id="palette-info">UVA</span>
      </span>
    </div>
  </div>
</details>

<!-- Export Modal -->
<div id="export-modal" class="export-modal">
  <div class="export-modal-content">
    <span class="close-modal">&times;</span>
    <h3>Export Plane Partition</h3>
    <p>Matrix representation of the plane partition:</p>
    <textarea id="export-textarea" class="export-textarea" readonly></textarea>
    <div class="export-buttons">
      <button id="copy-to-clipboard">Copy to Clipboard</button>
      <button id="download-file">Download File</button>
      <button id="close-export">Close</button>
    </div>
  </div>
</div>

<details id="keyboard-info-details">
  <summary>Keyboard Shortcuts</summary>
  <div class="keyboard-info">
    <strong>Keyboard shortcuts:</strong><br>
    A: S → S+r<br>
    Z: S → S-r<br>
    S: S → S+r → S-r<br>
    X: S → S-r → S+r<br>
    C: Next color palette<br>
    Shift+C: Previous color palette<br>
    P: Permute colors (cycle through 6 permutations)<br>
    B: Change border style (thin/medium/thick/ultra thick)
  </div>
</details>

<script>
// Check if Module is defined before setting onRuntimeInitialized
if (typeof Module === 'undefined') {
    console.error('Module is not defined. Make sure the WASM JavaScript file is loaded correctly.');
    window.Module = { onRuntimeInitialized: function() {} };
}

Module.onRuntimeInitialized = async function() {
    // WASM Interface Class
    class WASMInterface {
        constructor() {
            this.ready = false;
            this.N_param = 20;
            this.T_param = 30;
            this.S_param = 25;
            this.mode_param = 5;
            this.q_param = 1.0;
            this.paths = [];
        }

        async initialize() {
            // Check if Module and cwrap are available
            if (typeof Module === 'undefined') {
                throw new Error('Module is not defined. WASM JavaScript file may not be loaded.');
            }
            if (typeof Module.cwrap !== 'function') {
                throw new Error('Module.cwrap is not a function. WASM module may not be properly initialized.');
            }

            // Wrap exported functions
            this.initializeTiling = Module.cwrap('initializeTiling', 'number', ['number', 'number', 'number', 'number', 'number'], {async: true});
            this.performSOperator = Module.cwrap('performSOperator', 'number', [], {async: true});
            this.performSMinusOperator = Module.cwrap('performSMinusOperator', 'number', [], {async: true});
            this.exportPaths = Module.cwrap('exportPaths', 'number', [], {async: true});
            this.updateParameters = Module.cwrap('updateParameters', 'number', ['number', 'number'], {async: true});
            this.freeString = Module.cwrap('freeString', null, ['number']);
            this.getProgress = Module.cwrap('getProgress', 'number', []);

            this.ready = true;
            console.log('WASM module loaded successfully');
        }

        async initializeTilingWasm(params) {
            if (!this.ready) throw new Error('WASM not ready');
            if (typeof Module === 'undefined') throw new Error('Module is not defined');

            this.N_param = params.N;
            this.T_param = params.T;
            this.S_param = params.S;
            this.mode_param = params.mode;
            this.q_param = params.q;

            try {
                console.log('Initializing tiling with params:', params);
                const ptr = await this.initializeTiling(params.N, params.T, params.S, params.mode, params.q);
                if (!ptr) {
                    throw new Error('initializeTiling returned null pointer');
                }
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (result.error) {
                    throw new Error(result.error);
                }

                // Auto-export paths
                await this.refreshPaths();
                return result;
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                throw new Error(`Initialization failed: ${errorMessage}`);
            }
        }

        async stepForward() {
            if (!this.ready) throw new Error('WASM not ready');
            if (this.S_param >= this.T_param) throw new Error('Cannot perform S→S+1: already at maximum');

            try {
                const ptr = await this.performSOperator();
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (result.error) {
                    throw new Error(result.error);
                }

                this.S_param = result.s;
                await this.refreshPaths();
                return result;
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                throw new Error(`S operator failed: ${errorMessage}`);
            }
        }

        async stepBackward() {
            if (!this.ready) throw new Error('WASM not ready');
            if (this.S_param <= 0) throw new Error('Cannot perform S→S-1: already at minimum');

            try {
                const ptr = await this.performSMinusOperator();
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (result.error) {
                    throw new Error(result.error);
                }

                this.S_param = result.s;
                await this.refreshPaths();
                return result;
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                throw new Error(`S- operator failed: ${errorMessage}`);
            }
        }

        async refreshPaths() {
            try {
                const ptr = await this.exportPaths();
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (!result.error) {
                    this.paths = result.paths;
                }
            } catch (error) {
                console.error('Failed to refresh paths:', error);
            }
        }

        getPaths() {
            return this.paths;
        }

        getParameters() {
            return {
                N: this.N_param,
                T: this.T_param,
                S: this.S_param,
                mode: this.mode_param,
                q: this.q_param
            };
        }

        async updateParametersWasm(params) {
            if (!this.ready) throw new Error('WASM not ready');

            try {
                const ptr = await this.updateParameters(params.mode, params.q);
                const jsonStr = Module.UTF8ToString(ptr);
                this.freeString(ptr);

                const result = JSON.parse(jsonStr);
                if (result.error) {
                    throw new Error(result.error);
                }

                this.mode_param = params.mode;
                this.q_param = params.q;
                return result;
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                throw new Error(`Parameter update failed: ${errorMessage}`);
            }
        }


        static transposeMatrix(matrix) {
            if (matrix.length === 0) return [];
            const rows = matrix.length;
            const cols = matrix[0].length;
            const transposed = Array(cols).fill(null).map(() => Array(rows));

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    transposed[j][i] = matrix[i][j];
                }
            }

            return transposed;
        }
    }

    // Tiling Visualizer Class
    class TilingVisualizer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.style = 2; // Default: classical with borders
            this.borderWidth = 0.01; // Default border width

            this.colors = {
                gray1: '#E57200', // UVA Orange (up rhombi)
                gray2: '#232D4B', // UVA Blue (down rhombi)
                gray3: '#F9DCBF', // UVA Orange 25% (horizontal rhombi)
                border: '#666666', // Default border color
                black: '#000000',
                white: '#FFFFFF'
            };
            this.customBorderColor = null; // Track if user has set custom border color

            this.currentPalette = 'UVA Colors';
            this.currentPaletteIndex = 0;
            
            // Color permutation state (0-5 for 6 possible permutations)
            this.currentPermutation = 0;
            this.originalColors = { gray1: '', gray2: '', gray3: '' }; // Store original colors for permutation

            // Load color palettes from external file
            this.colorPalettes = ColorSchemes;

            this.zoomLevel = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.isPanning = false;
            this.lastMouseX = 0;
            this.lastMouseY = 0;

            this.setupCanvas();
            this.setupMouseHandlers();
        }

        setupCanvas() {
            const dpr = window.devicePixelRatio || 1;

            // Get the actual canvas element dimensions from CSS
            const rect = this.canvas.getBoundingClientRect();
            const displayWidth = rect.width || 800;
            const displayHeight = rect.height || 400;

            // Set internal size accounting for device pixel ratio
            this.canvas.width = displayWidth * dpr;
            this.canvas.height = displayHeight * dpr;

            // Scale context to ensure correct drawing operations
            this.ctx.scale(dpr, dpr);
        }

        updateCanvasDimensions(N, T, S) {
            // Check if we already have the same parameters
            if (this.lastCanvasN === N && this.lastCanvasT === T && this.lastCanvasS === S) {
                return; // No need to update
            }

            this.lastCanvasN = N;
            this.lastCanvasT = T;
            this.lastCanvasS = S;

            const sqrt3 = Math.sqrt(3);

            // Calculate the bounding box of the hexagon
            const minX = 0;
            const maxX = T * 0.5 * sqrt3;
            const minY = -(T - S) * 0.5;
            const maxY = N + Math.max(S * 0.5, (2 * S - T) * 0.5);

            const hexWidth = maxX - minX;
            const hexHeight = maxY - minY;

            // Get the container width
            const container = this.canvas.parentElement;
            const containerWidth = container ? container.clientWidth : 800;
            const maxCanvasWidth = Math.min(containerWidth, 800); // Respect max-width

            const aspectRatio = hexWidth / hexHeight;

            // Calculate dimensions maintaining aspect ratio
            let canvasWidth = maxCanvasWidth;
            let canvasHeight = canvasWidth / aspectRatio;

            // Update canvas dimensions
            this.canvas.style.height = `${canvasHeight}px`;

            // Re-setup canvas with new dimensions
            this.setupCanvas();
        }

        setupMouseHandlers() {
            // Initialize touch gesture tracking
            this.lastTouchDistance = 0;
            this.lastTapTime = 0;
            this.tapCount = 0;
            this.doubleTapZooming = false;
            this.pinchZooming = false;
            this.initialDoubleTapY = 0;

            // Mouse wheel zoom
            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();

                const center = this.getHexagonScreenCenter();

                const zoomFactor = e.deltaY > 0 ? 0.985 : 1.015;
                const newZoom = Math.max(0.1, Math.min(10.0, this.zoomLevel * zoomFactor));

                const scale = newZoom / this.zoomLevel;
                this.panX = center.x - (center.x - this.panX) * scale;
                this.panY = center.y - (center.y - this.panY) * scale;

                this.zoomLevel = newZoom;

                if (this.lastPaths) {
                    this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
                }
            });

            // Mouse events
            this.canvas.addEventListener('mousedown', (e) => {
                this.isPanning = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            });

            window.addEventListener('mousemove', (e) => {
                if (!this.isPanning) return;

                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;

                this.panX += dx;
                this.panY += dy;

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                if (this.lastPaths) {
                    this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
                }
            });

            window.addEventListener('mouseup', () => {
                this.isPanning = false;
                this.canvas.style.cursor = 'grab';
            });

            // Enhanced touch events for mobile
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();

                const currentTime = Date.now();
                const touches = e.touches;

                if (touches.length === 1) {
                    // Single touch - check for double tap
                    const timeSinceLastTap = currentTime - this.lastTapTime;

                    if (timeSinceLastTap < 300 && this.tapCount === 1) {
                        // Double tap detected - start zoom mode
                        this.doubleTapZooming = true;
                        this.initialDoubleTapY = touches[0].clientY;
                        this.tapCount = 0;
                        this.lastTapTime = 0;
                        this.isPanning = false;
                    } else {
                        // Single tap or first tap of potential double tap
                        this.tapCount = 1;
                        this.lastTapTime = currentTime;

                        // Start panning after a delay to distinguish from double tap
                        setTimeout(() => {
                            if (this.tapCount === 1 && !this.doubleTapZooming && !this.pinchZooming) {
                                this.isPanning = true;
                                this.lastMouseX = touches[0].clientX;
                                this.lastMouseY = touches[0].clientY;
                            }
                        }, 150);
                    }
                } else if (touches.length === 2) {
                    // Two finger pinch zoom
                    this.pinchZooming = true;
                    this.isPanning = false;
                    this.doubleTapZooming = false;
                    this.tapCount = 0;

                    const touch1 = touches[0];
                    const touch2 = touches[1];
                    const distance = Math.sqrt(
                        Math.pow(touch2.clientX - touch1.clientX, 2) +
                        Math.pow(touch2.clientY - touch1.clientY, 2)
                    );
                    this.lastTouchDistance = distance;
                }
            });

            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();

                const touches = e.touches;

                if (this.doubleTapZooming && touches.length === 1) {
                    // Double tap zoom with finger movement
                    const touch = touches[0];
                    const deltaY = touch.clientY - this.initialDoubleTapY;

                    // More sensitive zoom factor for double-tap zoom
                    const zoomFactor = 1 + (deltaY * -0.005); // Negative for intuitive direction (up = zoom in)
                    const newZoom = Math.max(0.1, Math.min(10.0, this.zoomLevel * zoomFactor));

                    if (newZoom !== this.zoomLevel) {
                        const center = this.getHexagonScreenCenter();
                        const scale = newZoom / this.zoomLevel;
                        this.panX = center.x - (center.x - this.panX) * scale;
                        this.panY = center.y - (center.y - this.panY) * scale;
                        this.zoomLevel = newZoom;

                        if (this.lastPaths) {
                            this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
                        }
                    }

                    // Update the reference point for smoother zooming
                    this.initialDoubleTapY = touch.clientY;
                } else if (this.pinchZooming && touches.length === 2) {
                    // Pinch to zoom
                    const touch1 = touches[0];
                    const touch2 = touches[1];
                    const distance = Math.sqrt(
                        Math.pow(touch2.clientX - touch1.clientX, 2) +
                        Math.pow(touch2.clientY - touch1.clientY, 2)
                    );

                    if (this.lastTouchDistance > 0) {
                        const zoomFactor = distance / this.lastTouchDistance;
                        const newZoom = Math.max(0.1, Math.min(10.0, this.zoomLevel * zoomFactor));

                        if (newZoom !== this.zoomLevel) {
                            const center = this.getHexagonScreenCenter();
                            const scale = newZoom / this.zoomLevel;
                            this.panX = center.x - (center.x - this.panX) * scale;
                            this.panY = center.y - (center.y - this.panY) * scale;
                            this.zoomLevel = newZoom;

                            if (this.lastPaths) {
                                this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
                            }
                        }
                    }
                    this.lastTouchDistance = distance;
                } else if (this.isPanning && touches.length === 1) {
                    // Single finger panning
                    const dx = touches[0].clientX - this.lastMouseX;
                    const dy = touches[0].clientY - this.lastMouseY;

                    this.panX += dx;
                    this.panY += dy;

                    this.lastMouseX = touches[0].clientX;
                    this.lastMouseY = touches[0].clientY;

                    if (this.lastPaths) {
                        this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
                    }
                }
            });

            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();

                const touches = e.touches;

                if (touches.length === 0) {
                    // All fingers lifted
                    this.isPanning = false;
                    this.pinchZooming = false;
                    this.doubleTapZooming = false;
                    this.lastTouchDistance = 0;
                } else if (touches.length === 1 && this.pinchZooming) {
                    // Went from pinch to single touch
                    this.pinchZooming = false;
                    this.lastTouchDistance = 0;
                }
            });

            // Prevent context menu on long press
            this.canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });

            this.canvas.style.cursor = 'grab';
            this.canvas.style.touchAction = 'none'; // Prevent browser zoom/pan
        }

        setStyle(style) {
            this.style = parseInt(style);
        }

        setBorderWidth(width) {
            this.borderWidth = parseFloat(width);
        }

        getBorderColor() {
            // If user has set a custom border color, use that
            if (this.customBorderColor) {
                return this.customBorderColor;
            }
            
            // Get appropriate border color based on the current color scheme
            const palette = this.colorPalettes[this.currentPaletteIndex];
            
            // For "No Colors" palette, use a subtle gray
            if (palette.name === 'No Colors') {
                return '#BBBBBB';
            }
            
            // Convert hex colors to RGB for analysis
            const colors = [this.colors.gray1, this.colors.gray2, this.colors.gray3];
            const rgbColors = colors.map(hex => {
                const rgb = parseInt(hex.substring(1), 16);
                return {
                    r: (rgb >> 16) & 0xff,
                    g: (rgb >> 8) & 0xff,
                    b: rgb & 0xff
                };
            });
            
            // Calculate average color and brightness
            const avgColor = {
                r: Math.round(rgbColors.reduce((sum, c) => sum + c.r, 0) / 3),
                g: Math.round(rgbColors.reduce((sum, c) => sum + c.g, 0) / 3),
                b: Math.round(rgbColors.reduce((sum, c) => sum + c.b, 0) / 3)
            };
            
            const avgBrightness = (0.299 * avgColor.r + 0.587 * avgColor.g + 0.114 * avgColor.b);
            
            // Function to convert RGB to HSL
            const rgbToHsl = (r, g, b) => {
                r /= 255;
                g /= 255;
                b /= 255;
                
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                let h, s, l = (max + min) / 2;
                
                if (max === min) {
                    h = s = 0; // achromatic
                } else {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    
                    switch (max) {
                        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                        case g: h = ((b - r) / d + 2) / 6; break;
                        case b: h = ((r - g) / d + 4) / 6; break;
                    }
                }
                
                return { h: h * 360, s: s * 100, l: l * 100 };
            };
            
            // Function to convert HSL to RGB
            const hslToRgb = (h, s, l) => {
                h /= 360;
                s /= 100;
                l /= 100;
                
                let r, g, b;
                
                if (s === 0) {
                    r = g = b = l; // achromatic
                } else {
                    const hue2rgb = (p, q, t) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1/6) return p + (q - p) * 6 * t;
                        if (t < 1/2) return q;
                        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    };
                    
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1/3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1/3);
                }
                
                return {
                    r: Math.round(r * 255),
                    g: Math.round(g * 255),
                    b: Math.round(b * 255)
                };
            };
            
            // Get HSL of average color
            const avgHsl = rgbToHsl(avgColor.r, avgColor.g, avgColor.b);
            
            // Create a complementary color
            let borderHsl;
            
            if (avgHsl.s < 10) {
                // For grayscale palettes, use a contrasting gray
                if (avgBrightness > 128) {
                    return '#444444';
                } else {
                    return '#CCCCCC';
                }
            }
            
            // For colorful palettes, create an interesting border color
            if (avgBrightness > 180) {
                // Very light palette: use a darker, slightly shifted hue
                borderHsl = {
                    h: (avgHsl.h + 30) % 360,  // Slight hue shift
                    s: Math.min(avgHsl.s + 20, 80),  // Increase saturation
                    l: 25  // Dark
                };
            } else if (avgBrightness < 80) {
                // Very dark palette: use a lighter, complementary color
                borderHsl = {
                    h: (avgHsl.h + 180) % 360,  // Complementary hue
                    s: Math.max(avgHsl.s - 20, 30),  // Slightly less saturated
                    l: 75  // Light
                };
            } else {
                // Mid-range palette: use a color that's offset in hue and contrast
                const hueShift = avgHsl.s > 50 ? 150 : 120;  // More shift for saturated colors
                borderHsl = {
                    h: (avgHsl.h + hueShift) % 360,
                    s: avgHsl.s > 50 ? avgHsl.s * 0.7 : avgHsl.s * 1.2,  // Adjust saturation
                    l: avgBrightness > 128 ? 30 : 70  // Ensure contrast
                };
            }
            
            // Special adjustments for specific palettes
            const paletteName = palette.name.toLowerCase();
            
            // Flag-inspired palettes often look better with neutral borders
            if (paletteName.includes('italy') || paletteName.includes('france') || 
                paletteName.includes('belgium') || paletteName.includes('colombia')) {
                return avgBrightness > 128 ? '#2C3E50' : '#ECF0F1';  // Elegant blue-gray
            }
            
            // Coding themes work well with their typical comment colors
            if (paletteName.includes('dracula')) return '#6272A4';  // Dracula comment color
            if (paletteName.includes('monokai')) return '#75715E';  // Monokai comment color
            if (paletteName.includes('solarized')) return '#586E75';  // Solarized comment color
            if (paletteName.includes('gruvbox')) return '#928374';  // Gruvbox gray
            if (paletteName.includes('nord')) return '#4C566A';  // Nord gray
            
            // University colors often have specific accent colors
            if (paletteName.includes('uva')) return '#666666';  // Neutral gray for UVA
            if (paletteName.includes('harvard')) return '#C0C0C0';  // Silver for Harvard
            if (paletteName.includes('yale')) return '#8C8C8C';  // Yale gray
            
            // Convert the calculated HSL back to RGB and then to hex
            const borderRgb = hslToRgb(borderHsl.h, borderHsl.s, borderHsl.l);
            const toHex = (n) => n.toString(16).padStart(2, '0');
            
            return `#${toHex(borderRgb.r)}${toHex(borderRgb.g)}${toHex(borderRgb.b)}`;
        }

        setCustomColors(colors) {
            this.colors.gray1 = colors.gray1;
            this.colors.gray2 = colors.gray2;
            this.colors.gray3 = colors.gray3;
            if (colors.border) {
                this.customBorderColor = colors.border;
                this.colors.border = colors.border;
            }
            this.currentPalette = 'Custom';
            this.updateColorIndicator();
        }

        updateColorIndicator() {
            document.getElementById('swatch-gray1').style.backgroundColor = this.colors.gray1;
            document.getElementById('swatch-gray2').style.backgroundColor = this.colors.gray2;
            document.getElementById('swatch-gray3').style.backgroundColor = this.colors.gray3;
            
            // Update border color swatch with current border color
            const borderColor = this.getBorderColor();
            document.getElementById('swatch-border').style.backgroundColor = borderColor;

            const paletteInfo = document.getElementById('palette-info');
            if (this.currentPalette === 'Custom') {
                paletteInfo.textContent = `Custom`;
            } else {
                paletteInfo.textContent = this.currentPalette;
            }

            // Update dropdown selection
            const paletteSelect = document.getElementById('palette-select');
            if (paletteSelect && this.currentPalette !== 'Custom') {
                paletteSelect.value = this.currentPaletteIndex.toString();
            }
        }

        resetDefaultColors() {
            this.colors.gray1 = '#E57200';
            this.colors.gray2 = '#232D4B';
            this.colors.gray3 = '#F9DCBF';
            this.colors.border = '#666666';
            this.customBorderColor = null; // Clear custom border color
            this.currentPalette = 'UVA Colors';
            this.currentPaletteIndex = 0;
            this.updateColorIndicator();
        }

        setPalette(paletteIndex) {
            if (paletteIndex >= 0 && paletteIndex < this.colorPalettes.length) {
                this.currentPaletteIndex = paletteIndex;
                const palette = this.colorPalettes[this.currentPaletteIndex];

                this.colors.gray1 = palette.colors[0];
                this.colors.gray2 = palette.colors[1];
                this.colors.gray3 = palette.colors[2];
                this.customBorderColor = null; // Clear custom border color when switching palettes
                this.currentPalette = palette.name;

                this.updateColorIndicator();
                this.updateCustomColorPickers();
            }
        }

        nextPalette() {
            this.currentPaletteIndex = (this.currentPaletteIndex + 1) % this.colorPalettes.length;
            const palette = this.colorPalettes[this.currentPaletteIndex];

            this.colors.gray1 = palette.colors[0];
            this.colors.gray2 = palette.colors[1];
            this.colors.gray3 = palette.colors[2];
            this.customBorderColor = null; // Clear custom border color
            this.currentPalette = palette.name;
            
            // Reset permutation state when changing palettes
            this.currentPermutation = 0;

            this.updateColorIndicator();
            this.updateCustomColorPickers();
        }

        prevPalette() {
            this.currentPaletteIndex = (this.currentPaletteIndex - 1 + this.colorPalettes.length) % this.colorPalettes.length;
            const palette = this.colorPalettes[this.currentPaletteIndex];

            this.colors.gray1 = palette.colors[0];
            this.colors.gray2 = palette.colors[1];
            this.colors.gray3 = palette.colors[2];
            this.customBorderColor = null; // Clear custom border color
            this.currentPalette = palette.name;
            
            // Reset permutation state when changing palettes
            this.currentPermutation = 0;

            this.updateColorIndicator();
            this.updateCustomColorPickers();
        }

        changePalette() {
            this.nextPalette();
        }

        permuteColors() {
            // Store original colors on first permutation
            if (this.currentPermutation === 0) {
                this.originalColors.gray1 = this.colors.gray1;
                this.originalColors.gray2 = this.colors.gray2;
                this.originalColors.gray3 = this.colors.gray3;
            }

            // Cycle through the 6 permutations of (gray1, gray2, gray3)
            this.currentPermutation = (this.currentPermutation + 1) % 6;

            const { gray1, gray2, gray3 } = this.originalColors;

            switch (this.currentPermutation) {
                case 0: // Original: (1, 2, 3)
                    this.colors.gray1 = gray1;
                    this.colors.gray2 = gray2;
                    this.colors.gray3 = gray3;
                    break;
                case 1: // (1, 3, 2)
                    this.colors.gray1 = gray1;
                    this.colors.gray2 = gray3;
                    this.colors.gray3 = gray2;
                    break;
                case 2: // (2, 1, 3)
                    this.colors.gray1 = gray2;
                    this.colors.gray2 = gray1;
                    this.colors.gray3 = gray3;
                    break;
                case 3: // (2, 3, 1)
                    this.colors.gray1 = gray2;
                    this.colors.gray2 = gray3;
                    this.colors.gray3 = gray1;
                    break;
                case 4: // (3, 1, 2)
                    this.colors.gray1 = gray3;
                    this.colors.gray2 = gray1;
                    this.colors.gray3 = gray2;
                    break;
                case 5: // (3, 2, 1)
                    this.colors.gray1 = gray3;
                    this.colors.gray2 = gray2;
                    this.colors.gray3 = gray1;
                    break;
            }

            this.updateColorIndicator();
            this.updateCustomColorPickers();
        }

        updateCustomColorPickers() {
            // Update the custom color panel to reflect current colors
            document.getElementById('color-gray1').value = this.colors.gray1;
            document.getElementById('hex-gray1').value = this.colors.gray1.toUpperCase();
            document.getElementById('color-gray2').value = this.colors.gray2;
            document.getElementById('hex-gray2').value = this.colors.gray2.toUpperCase();
            document.getElementById('color-gray3').value = this.colors.gray3;
            document.getElementById('hex-gray3').value = this.colors.gray3.toUpperCase();
            
            // Update border color picker with current border color
            const borderColor = this.getBorderColor();
            document.getElementById('color-border').value = borderColor;
            document.getElementById('hex-border').value = borderColor.toUpperCase();
        }

        getCurrentPalette() {
            // Return current color palette for export
            return [
                this.colors.gray1,
                this.colors.gray2,
                this.colors.gray3
            ];
        }

        getHexagonScreenCenter() {
            if (!this.lastPaths || !this.lastN || !this.lastT || !this.lastS) {
                const width = this.canvas.width / (window.devicePixelRatio || 1);
                const height = this.canvas.height / (window.devicePixelRatio || 1);
                return { x: width / 2, y: height / 2 };
            }

            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            // Calculate where the hexagon center appears on screen
            // This matches the transformation sequence in drawHexagonStyle
            const screenCenterX = this.panX + width / 2;
            const screenCenterY = this.panY + height / 2;

            return { x: screenCenterX, y: screenCenterY };
        }

        zoomIn() {
            const center = this.getHexagonScreenCenter();

            const oldZoom = this.zoomLevel;
            const newZoom = Math.min(10.0, oldZoom * 1.2);

            if (newZoom === oldZoom) return;

            const scale = newZoom / oldZoom;
            this.panX = center.x - (center.x - this.panX) * scale;
            this.panY = center.y - (center.y - this.panY) * scale;

            this.zoomLevel = newZoom;
        }

        zoomOut() {
            const center = this.getHexagonScreenCenter();

            const oldZoom = this.zoomLevel;
            const newZoom = Math.max(0.1, oldZoom / 1.2);

            if (newZoom === oldZoom) return;

            const scale = newZoom / oldZoom;
            this.panX = center.x - (center.x - this.panX) * scale;
            this.panY = center.y - (center.y - this.panY) * scale;

            this.zoomLevel = newZoom;
        }

        resetZoom() {
            // Reset zoom and center the hexagon properly
            this.zoomLevel = 1.0;
            this.panX = 0;
            this.panY = 0;

            if (this.lastPaths) {
                this.draw(this.lastPaths, this.lastN, this.lastT, this.lastS);
            }
        }

        draw(paths, N, T, S) {
            this.lastPaths = paths;
            this.lastN = N;
            this.lastT = T;
            this.lastS = S;

            // Update canvas dimensions to fit hexagon exactly
            this.updateCanvasDimensions(N, T, S);

            const ctx = this.ctx;
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            ctx.fillStyle = this.colors.white;
            ctx.fillRect(0, 0, width, height);

            if (this.style === 5) {
                this.drawLatticePathsStyle(paths, N, T, S);
            } else {
                this.drawHexagonStyle(paths, N, T, S);
            }
        }


        drawHexagonStyle(paths, N, T, S) {
            const ctx = this.ctx;
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            const sqrt3 = Math.sqrt(3);

            // Calculate the bounding box of the hexagon
            const minX = 0;
            const maxX = T * 0.5 * sqrt3;
            const minY = -(T - S) * 0.5;
            const maxY = N + Math.max(S * 0.5, (2 * S - T) * 0.5);

            const hexWidth = maxX - minX;
            const hexHeight = maxY - minY;
            const hexCenterX = (minX + maxX) / 2;
            const hexCenterY = (minY + maxY) / 2;

            const margin = 0; // No margin - fit hexagon exactly
            const scale = Math.min(
                (width - 2 * margin) / hexWidth,
                (height - 2 * margin) / hexHeight
            ) * this.zoomLevel;

            ctx.save();
            ctx.translate(this.panX, this.panY);
            ctx.translate(width / 2, height / 2);
            ctx.scale(-scale, scale);  // Flip horizontally with negative x scale
            // Center the hexagon
            ctx.translate(-hexCenterX, -hexCenterY);

            this.drawBackgroundHexagon(N, T, S);

            for (let i = 0; i < T; i++) {
                for (let j = 0; j < N; j++) {
                    const currentHeight = paths[j][i];
                    const nextHeight = paths[j][i + 1];
                    this.drawRhombus(i, j, currentHeight, nextHeight);
                }
            }

            ctx.restore();
        }

        drawBackgroundHexagon(N, T, S) {
            const ctx = this.ctx;
            const sqrt3 = Math.sqrt(3);

            // First, clip to the hexagon shape
            const vertices = [
                {x: 0, y: 0},
                {x: 0, y: N},
                {x: S * 0.5 * sqrt3, y: N + S * 0.5},
                {x: T * 0.5 * sqrt3, y: N + (2 * S - T) * 0.5},
                {x: T * 0.5 * sqrt3, y: (2 * S - T) * 0.5},
                {x: (T - S) * 0.5 * sqrt3, y: -(T - S) * 0.5}
            ];

            ctx.save();

            // Create clipping path
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();
            ctx.clip();

            // Draw background rhombi with borders aligned to lozenge grid
            for (let timeIdx = -1; timeIdx <= T; timeIdx++) {
                for (let height = -(T - S + 2); height <= N + S + 2; height++) {
                    // Use the same coordinate system as the actual rhombi
                    const x1 = timeIdx * 0.5 * sqrt3;
                    const y1 = height - timeIdx * 0.5;

                    // Calculate rhombus center for bounds checking
                    const centerX = x1 + 0.25 * sqrt3;
                    const centerY = y1 + 0.5;

                    // Check if rhombus center is roughly within bounds
                    if (centerX >= -0.5 * sqrt3 && centerX <= (T + 1) * 0.5 * sqrt3 &&
                        centerY >= -(T - S + 2) * 0.5 && centerY <= N + S + 1) {

                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x1+0.5 * sqrt3, y1 + 0.5);
                        ctx.lineTo(x1 + sqrt3, y1);
                        ctx.lineTo(x1 + 0.5 * sqrt3, y1 - 0.5);
                        ctx.closePath();

                        ctx.fillStyle = this.colors.gray3;
                        ctx.fill();

                        ctx.strokeStyle = this.getBorderColor();
                        ctx.lineWidth = this.borderWidth;
                        ctx.stroke();
                    }
                }
            }

            ctx.restore();

            // Draw hexagon border
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            ctx.closePath();
            ctx.strokeStyle = this.getBorderColor();
            ctx.lineWidth = this.borderWidth;
            ctx.stroke();
        }

        drawRhombus(timeIdx, particleIdx, height, nextHeight) {
            const ctx = this.ctx;
            const sqrt3 = Math.sqrt(3);

            const x1 = timeIdx * 0.5 * sqrt3;
            const y1 = height - timeIdx * 0.5;
            const x2 = x1;
            const y2 = y1 + 1;

            let x3, y3, x4, y4;
            let fillColor;

            if (nextHeight === height) {
                // Down rhombus
                x3 = x2 + 0.5 * sqrt3;
                y3 = y2 - 0.5;
                x4 = x1 + 0.5 * sqrt3;
                y4 = y1 - 0.5;
                fillColor = this.colors.gray1;
            } else {
                // Up rhombus
                x3 = x2 + 0.5 * sqrt3;
                y3 = y2 + 0.5;
                x4 = x1 + 0.5 * sqrt3;
                y4 = y1 + 0.5;
                fillColor = this.colors.gray2;
            }

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
            ctx.closePath();

            ctx.fillStyle = fillColor;
            ctx.fill();

            // Add consistent thin borders to all rhombi
            ctx.strokeStyle = this.getBorderColor();
            ctx.lineWidth = this.borderWidth;
            ctx.stroke();
        }


        drawLatticePathsStyle(paths, N, T, S) {
            const ctx = this.ctx;
            const width = this.canvas.width / (window.devicePixelRatio || 1);
            const height = this.canvas.height / (window.devicePixelRatio || 1);

            const margin = 20; // Smaller margin for lattice paths
            const scaleX = (width - 2 * margin) / (T + 5);
            const scaleY = (height - 2 * margin) / (N + S + 5);
            const scale = Math.min(scaleX, scaleY) * this.zoomLevel;

            const maxY = N + S - 1;

            ctx.save();
            ctx.translate(this.panX + margin, this.panY + height - margin);
            ctx.scale(scale, -scale);

            ctx.fillStyle = this.colors.gray3;
            for (let i = 0; i <= T; i++) {
                for (let j = 0; j <= maxY; j++) {
                    ctx.fillRect(i - 0.1, j - 0.1, 0.2, 0.2);
                }
            }

            ctx.strokeStyle = this.colors.black;
            ctx.lineWidth = this.borderWidth;
            ctx.fillStyle = this.colors.black;

            for (let j = 0; j < N; j++) {
                ctx.beginPath();

                for (let i = 0; i <= T; i++) {
                    const x = i;
                    const y = paths[j][i];

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    ctx.fillRect(x - 0.05, y - 0.05, 0.1, 0.1);
                }

                ctx.stroke();
            }

            ctx.restore();
        }
    }

    // UI Controller Class
    class UIController {
        constructor(wasmInterface, visualizer) {
            this.wasm = wasmInterface;
            this.visualizer = visualizer;
            this.animationId = null;
            this.animationRunning = false;
            this.compositeOperationRunning = false;

            this.setupEventListeners();
        }

        setupEventListeners() {
            document.getElementById('style').addEventListener('change', (e) => {
                this.visualizer.setStyle(e.target.value);
                this.redraw();
            });

            document.getElementById('border-width').addEventListener('input', (e) => {
                this.visualizer.setBorderWidth(e.target.value);
                this.redraw();
            });

            // Border width preset buttons
            document.getElementById('border-thin').addEventListener('click', () => {
                document.getElementById('border-width').value = '0.001';
                this.visualizer.setBorderWidth(0.001);
                this.redraw();
            });

            document.getElementById('border-medium').addEventListener('click', () => {
                document.getElementById('border-width').value = '0.01';
                this.visualizer.setBorderWidth(0.01);
                this.redraw();
            });

            document.getElementById('border-thick').addEventListener('click', () => {
                document.getElementById('border-width').value = '0.05';
                this.visualizer.setBorderWidth(0.05);
                this.redraw();
            });

            document.getElementById('border-ultra-thick').addEventListener('click', () => {
                document.getElementById('border-width').value = '0.15';
                this.visualizer.setBorderWidth(0.15);
                this.redraw();
            });

            // Custom colors functionality
            document.getElementById('custom-colors').addEventListener('click', () => {
                const panel = document.getElementById('custom-colors-panel');
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            });

            // Apply colors automatically when color pickers change
            const applyColors = () => {
                const colors = {
                    gray1: document.getElementById('color-gray1').value,
                    gray2: document.getElementById('color-gray2').value,
                    gray3: document.getElementById('color-gray3').value,
                    border: document.getElementById('color-border').value
                };
                this.visualizer.setCustomColors(colors);
                this.redraw();
            };

            // Color picker event listeners with hex sync
            document.getElementById('color-gray1').addEventListener('input', (e) => {
                document.getElementById('hex-gray1').value = e.target.value.toUpperCase();
                applyColors();
            });

            document.getElementById('color-gray2').addEventListener('input', (e) => {
                document.getElementById('hex-gray2').value = e.target.value.toUpperCase();
                applyColors();
            });

            document.getElementById('color-gray3').addEventListener('input', (e) => {
                document.getElementById('hex-gray3').value = e.target.value.toUpperCase();
                applyColors();
            });

            // Hex field event listeners with color picker sync
            document.getElementById('hex-gray1').addEventListener('input', (e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    document.getElementById('color-gray1').value = hex;
                    applyColors();
                }
            });

            document.getElementById('hex-gray2').addEventListener('input', (e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    document.getElementById('color-gray2').value = hex;
                    applyColors();
                }
            });

            document.getElementById('hex-gray3').addEventListener('input', (e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    document.getElementById('color-gray3').value = hex;
                    applyColors();
                }
            });

            // Border color event listeners
            document.getElementById('color-border').addEventListener('input', (e) => {
                document.getElementById('hex-border').value = e.target.value.toUpperCase();
                applyColors();
            });

            document.getElementById('hex-border').addEventListener('input', (e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    document.getElementById('color-border').value = hex;
                    applyColors();
                }
            });

            document.getElementById('reset-default-colors').addEventListener('click', () => {
                this.visualizer.resetDefaultColors();
                // Reset both color pickers and hex fields
                document.getElementById('color-gray1').value = '#E57200';
                document.getElementById('hex-gray1').value = '#E57200';
                document.getElementById('color-gray2').value = '#232D4B';
                document.getElementById('hex-gray2').value = '#232D4B';
                document.getElementById('color-gray3').value = '#F9DCBF';
                document.getElementById('hex-gray3').value = '#F9DCBF';
                document.getElementById('color-border').value = '#666666';
                document.getElementById('hex-border').value = '#666666';
                this.redraw();
            });

            document.getElementById('close-custom-colors').addEventListener('click', () => {
                document.getElementById('custom-colors-panel').style.display = 'none';
            });

            // Palette dropdown functionality
            document.getElementById('palette-select').addEventListener('change', (e) => {
                const paletteIndex = parseInt(e.target.value);
                this.visualizer.setPalette(paletteIndex);
                this.redraw();
            });

            // Next/Previous palette buttons
            document.getElementById('next-palette').addEventListener('click', () => {
                this.visualizer.nextPalette();
                this.redraw();
            });

            document.getElementById('permute-colors').addEventListener('click', () => {
                this.visualizer.permuteColors();
                this.redraw();
            });

            document.getElementById('prev-palette').addEventListener('click', () => {
                this.visualizer.prevPalette();
                this.redraw();
            });

            document.getElementById('initialize').addEventListener('click', () => {
                this.initializeTiling(false); // Don't perform initial steps on button click
            });

            document.getElementById('set-parameters').addEventListener('click', () => {
                this.setParameters();
            });

            document.getElementById('step-plus').addEventListener('click', () => {
                this.stepForward();
            });

            document.getElementById('step-minus').addEventListener('click', () => {
                this.stepBackward();
            });

            document.getElementById('step-plus-back').addEventListener('click', () => {
                this.stepPlusBack();
            });

            document.getElementById('step-minus-forward').addEventListener('click', () => {
                this.stepMinusForward();
            });


            document.getElementById('export-tikz').addEventListener('click', () => {
                this.exportTikz();
            });

            document.getElementById('zoom-in').addEventListener('click', () => {
                this.visualizer.zoomIn();
                this.redraw();
            });

            document.getElementById('zoom-out').addEventListener('click', () => {
                this.visualizer.zoomOut();
                this.redraw();
            });

            document.getElementById('zoom-reset').addEventListener('click', () => {
                this.visualizer.resetZoom();
                this.redraw();
            });


            document.getElementById('copy-tikz-clipboard').addEventListener('click', () => {
                this.copyTikzToClipboard();
            });

            document.getElementById('download-tikz-file').addEventListener('click', () => {
                this.downloadTikzFile();
            });

            document.getElementById('hide-tikz-export').addEventListener('click', () => {
                document.getElementById('tikz-export-display').style.display = 'none';
            });


            // Export modal event listeners (keep for backward compatibility)
            document.getElementById('copy-to-clipboard').addEventListener('click', () => {
                this.copyToClipboard();
            });

            document.getElementById('download-file').addEventListener('click', () => {
                this.downloadFile();
            });

            document.getElementById('close-export').addEventListener('click', () => {
                this.closeExportModal();
            });

            document.querySelector('.close-modal').addEventListener('click', () => {
                this.closeExportModal();
            });

            // Close modal when clicking outside of it
            document.getElementById('export-modal').addEventListener('click', (e) => {
                if (e.target.id === 'export-modal') {
                    this.closeExportModal();
                }
            });


            // Keyboard controls
            document.addEventListener('keydown', (e) => {
                if (this.animationRunning) return;

                const key = e.key.toLowerCase();

                if ((key === 's' || key === 'x') && this.compositeOperationRunning) {
                    return;
                }

                // Handle Escape key for closing modal
                if (e.key === 'Escape') {
                    const modal = document.getElementById('export-modal');
                    if (modal.style.display === 'block') {
                        this.closeExportModal();
                        return;
                    }
                }

                const steps = parseInt(document.getElementById('steps').value) || 1;

                switch(key) {
                    case 'a':
                        this.stepForward();
                        break;
                    case 'z':
                        this.stepBackward();
                        break;
                    case 's':
                        this.compositeOperationRunning = true;
                        this.stepForwardNoRedraw().then(() => {
                            return this.stepBackwardNoRedraw();
                        }).then(() => {
                            // Update S display and redraw once at the end
                            const params = this.wasm.getParameters();
                            document.getElementById('S').value = params.S;
                            this.updateInfo();
                            this.redraw();
                            this.compositeOperationRunning = false;
                        }).catch((error) => {
                            // Silently handle errors - just stop the operation
                            this.compositeOperationRunning = false;
                        });
                        break;
                    case 'x':
                        this.compositeOperationRunning = true;
                        this.stepBackwardNoRedraw().then(() => {
                            return this.stepForwardNoRedraw();
                        }).then(() => {
                            // Update S display and redraw once at the end
                            const params = this.wasm.getParameters();
                            document.getElementById('S').value = params.S;
                            this.updateInfo();
                            this.redraw();
                            this.compositeOperationRunning = false;
                        }).catch((error) => {
                            // Silently handle errors - just stop the operation
                            this.compositeOperationRunning = false;
                        });
                        break;
                    case 'c':
                        // Change color palette - Shift+C for previous, C for next
                        if (e.shiftKey) {
                            this.visualizer.prevPalette();
                        } else {
                            this.visualizer.nextPalette();
                        }
                        this.redraw();
                        break;
                    case 'b':
                        // Cycle border thickness
                        this.cycleBorderThickness();
                        break;
                    case 'p':
                        // Permute colors (cycle through 6 permutations)
                        this.visualizer.permuteColors();
                        this.redraw();
                        break;
                }
            });

            window.addEventListener('resize', () => {
                this.visualizer.setupCanvas();
                this.redraw();
            });
        }


        getParametersFromUI() {
            const params = {
                mode: 5, // Always q-Hahn
                N: parseInt(document.getElementById('N').value),
                T: parseInt(document.getElementById('T').value),
                S: parseInt(document.getElementById('S').value),
                q: parseFloat(document.getElementById('q').value)
            };

            return params;
        }

        validateParametersUI(params) {
            if (isNaN(params.N) || params.N < 1) {
                throw new Error('N must be a positive integer');
            }
            if (isNaN(params.T) || params.T < 1) {
                throw new Error('T must be a positive integer');
            }
            if (isNaN(params.S) || params.S < 0 || params.S > params.T) {
                throw new Error('S must be between 0 and T');
            }

            if (isNaN(params.q) || params.q <= 0) {
                throw new Error('q must be positive');
            }
        }

        async initializeTiling(performInitialSteps = false) {
            try {
                const params = this.getParametersFromUI();
                this.validateParametersUI(params);

                if (performInitialSteps) {
                    // On page load: Initialize with S=0 and step to target S
                    const initParams = { ...params, S: 0 };
                    await this.wasm.initializeTilingWasm(initParams);

                    // Perform S→S+1 steps to reach the target
                    const targetS = params.S;
                    for (let i = 0; i < targetS; i++) {
                        try {
                            await this.wasm.stepForward();
                        } catch (error) {
                            // Stop if we can't step further
                            break;
                        }
                    }
                } else {
                    // On button click: Initialize directly with the desired S value (empty room)
                    await this.wasm.initializeTilingWasm(params);
                }

                const actualParams = this.wasm.getParameters();
                document.getElementById('S').value = actualParams.S;

                this.updateInfo();
                this.redraw();

            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                alert('Initialization error: ' + errorMessage);
                console.error(error);
            }
        }

        async stepForward() {
            try {
                const steps = parseInt(document.getElementById('steps').value) || 1;

                for (let i = 0; i < steps; i++) {
                    try {
                        await this.wasm.stepForward();
                    } catch (error) {
                        // Silently ignore boundary errors - just stop stepping
                        break;
                    }
                }

                const params = this.wasm.getParameters();
                document.getElementById('S').value = params.S;

                this.updateInfo();
                this.redraw();

            } catch (error) {
                // Silently handle any other errors
            }
        }

        async stepBackward() {
            try {
                const steps = parseInt(document.getElementById('steps').value) || 1;

                for (let i = 0; i < steps; i++) {
                    try {
                        await this.wasm.stepBackward();
                    } catch (error) {
                        // Silently ignore boundary errors - just stop stepping
                        break;
                    }
                }

                const params = this.wasm.getParameters();
                document.getElementById('S').value = params.S;

                this.updateInfo();
                this.redraw();

            } catch (error) {
                // Silently handle any other errors
            }
        }

        // Internal functions without redraw for composite operations
        async stepForwardNoRedraw() {
            const steps = parseInt(document.getElementById('steps').value) || 1;
            for (let i = 0; i < steps; i++) {
                try {
                    await this.wasm.stepForward();
                } catch (error) {
                    // Silently ignore boundary errors - just stop stepping
                    break;
                }
            }
        }

        async stepBackwardNoRedraw() {
            const steps = parseInt(document.getElementById('steps').value) || 1;
            for (let i = 0; i < steps; i++) {
                try {
                    await this.wasm.stepBackward();
                } catch (error) {
                    // Silently ignore boundary errors - just stop stepping
                    break;
                }
            }
        }

        async stepPlusBack() {
            try {
                const steps = parseInt(document.getElementById('steps').value) || 1;

                // S → S+steps
                for (let i = 0; i < steps; i++) {
                    try {
                        await this.wasm.stepForward();
                    } catch (error) {
                        break;
                    }
                }

                // S+steps → S
                for (let i = 0; i < steps; i++) {
                    try {
                        await this.wasm.stepBackward();
                    } catch (error) {
                        break;
                    }
                }

                const params = this.wasm.getParameters();
                document.getElementById('S').value = params.S;

                this.updateInfo();
                this.redraw();

            } catch (error) {
                // Silently handle any other errors
            }
        }

        async stepMinusForward() {
            try {
                const steps = parseInt(document.getElementById('steps').value) || 1;

                // S → S-steps
                for (let i = 0; i < steps; i++) {
                    try {
                        await this.wasm.stepBackward();
                    } catch (error) {
                        break;
                    }
                }

                // S-steps → S
                for (let i = 0; i < steps; i++) {
                    try {
                        await this.wasm.stepForward();
                    } catch (error) {
                        break;
                    }
                }

                const params = this.wasm.getParameters();
                document.getElementById('S').value = params.S;

                this.updateInfo();
                this.redraw();

            } catch (error) {
                // Silently handle any other errors
            }
        }



        exportTikz() {
            try {
                const params = this.wasm.getParameters();
                const paths = this.wasm.getPaths();
                const currentPalette = this.visualizer.getCurrentPalette();
                const borderWidth = parseFloat(document.getElementById('border-width').value);
                const showBorder = borderWidth > 0;

                const tikzCode = this.generateTikzFromCanvas(params, paths, currentPalette, borderWidth, showBorder);

                // Show TikZ export display
                document.getElementById('tikz-export-textarea').value = tikzCode;
                document.getElementById('tikz-export-display').style.display = 'block';
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                this.showErrorFeedback('export-tikz', 'Export failed: ' + errorMessage);
            }
        }

        generateTikzFromCanvas(params, paths, palette, borderWidth, showBorder) {
            const N = params.N;
            const T = params.T;
            const S = params.S;
            const sqrt3 = Math.sqrt(3);

            let tikz = `% Lozenge tiling exported from canvas rendering
% Parameters: N=${N}, T=${T}, S=${S}, q=${params.q}
% Generated on ${new Date().toISOString()}

\\documentclass{standalone}
\\usepackage{tikz}
\\begin{document}
\\begin{tikzpicture}[scale=1, yscale=-1, xscale=-1]

`;

            // Define colors from palette (exactly as rendered on canvas)
            const [color1, color2, color3] = palette;
            const rgb1 = this.hexToRGB(color1);
            const rgb2 = this.hexToRGB(color2);
            const rgb3 = this.hexToRGB(color3);
            
            // Get border color exactly as used in canvas
            const borderColor = this.visualizer.getBorderColor();
            const borderRgb = this.hexToRGB(borderColor);

            tikz += `% Define colors (matching canvas rendering)
\\definecolor{color1}{RGB}{${rgb1[0]},${rgb1[1]},${rgb1[2]}}
\\definecolor{color2}{RGB}{${rgb2[0]},${rgb2[1]},${rgb2[2]}}
\\definecolor{color3}{RGB}{${rgb3[0]},${rgb3[1]},${rgb3[2]}}
\\definecolor{bordercolor}{RGB}{${borderRgb[0]},${borderRgb[1]},${borderRgb[2]}}

`;

            // Define hexagon vertices for border
            const hexagonVertices = [
                {x: 0, y: 0},
                {x: 0, y: N},
                {x: S * 0.5 * sqrt3, y: N + S * 0.5},
                {x: T * 0.5 * sqrt3, y: N + (2 * S - T) * 0.5},
                {x: T * 0.5 * sqrt3, y: (2 * S - T) * 0.5},
                {x: (T - S) * 0.5 * sqrt3, y: -(T - S) * 0.5}
            ];

            // Calculate inset for clipping region to account for border thickness
            // Scale border width: multiply by 20 for rhombi, hexagon is 2x rhombi width
            const tikzRhombiBorderWidth = borderWidth * 20; // 0.2 * 20 = 4pt
            const tikzHexagonBorderWidth = tikzRhombiBorderWidth * 2; // 2x rhombi width = 8pt at max
            // Half the border width extends inward from the border path
            const borderInset = showBorder ? tikzHexagonBorderWidth * 0.5 * 0.02 : 0; // Convert pt to coordinate units
            
            // Create slightly smaller hexagon for clipping
            const clippingVertices = hexagonVertices.map((vertex, i) => {
                // Calculate inward normal direction for each edge
                const nextVertex = hexagonVertices[(i + 1) % hexagonVertices.length];
                const prevVertex = hexagonVertices[(i + hexagonVertices.length - 1) % hexagonVertices.length];
                
                // Edge vectors
                const edgeToNext = {x: nextVertex.x - vertex.x, y: nextVertex.y - vertex.y};
                const edgeFromPrev = {x: vertex.x - prevVertex.x, y: vertex.y - prevVertex.y};
                
                // Normalize edge vectors
                const lenNext = Math.sqrt(edgeToNext.x * edgeToNext.x + edgeToNext.y * edgeToNext.y);
                const lenPrev = Math.sqrt(edgeFromPrev.x * edgeFromPrev.x + edgeFromPrev.y * edgeFromPrev.y);
                
                if (lenNext > 0) {
                    edgeToNext.x /= lenNext;
                    edgeToNext.y /= lenNext;
                }
                if (lenPrev > 0) {
                    edgeFromPrev.x /= lenPrev;
                    edgeFromPrev.y /= lenPrev;
                }
                
                // Inward normals (rotate 90 degrees clockwise)
                const normalNext = {x: edgeToNext.y, y: -edgeToNext.x};
                const normalPrev = {x: edgeFromPrev.y, y: -edgeFromPrev.x};
                
                // Average normal direction
                const avgNormal = {
                    x: (normalNext.x + normalPrev.x) * 0.5,
                    y: (normalNext.y + normalPrev.y) * 0.5
                };
                
                // Normalize average normal
                const avgLen = Math.sqrt(avgNormal.x * avgNormal.x + avgNormal.y * avgNormal.y);
                if (avgLen > 0) {
                    avgNormal.x /= avgLen;
                    avgNormal.y /= avgLen;
                }
                
                // Move vertex inward by border inset
                return {
                    x: vertex.x + avgNormal.x * borderInset,
                    y: vertex.y + avgNormal.y * borderInset
                };
            });

            // Render exactly as the canvas does: background horizontal rhombi first
            tikz += `% Background horizontal rhombi (color3)
\\begin{scope}
\\clip `;
            for (let i = 0; i < clippingVertices.length; i++) {
                if (i > 0) tikz += ' -- ';
                tikz += `(${clippingVertices[i].x.toFixed(3)}, ${clippingVertices[i].y.toFixed(3)})`;
            }
            tikz += ` -- cycle;
`;
            for (let timeIdx = -1; timeIdx <= T; timeIdx++) {
                for (let height = -(T - S + 2); height <= N + S + 2; height++) {
                    const x1 = timeIdx * 0.5 * sqrt3;
                    const y1 = height - timeIdx * 0.5;
                    
                    tikz += `\\fill[color3`;
                    if (showBorder && borderWidth > 0) {
                        tikz += `, draw=bordercolor, line width=${tikzRhombiBorderWidth}pt`;
                    }
                    tikz += `] `;
                    tikz += `(${x1.toFixed(3)}, ${y1.toFixed(3)}) -- `;
                    tikz += `(${(x1 + 0.5 * sqrt3).toFixed(3)}, ${(y1 + 0.5).toFixed(3)}) -- `;
                    tikz += `(${(x1 + sqrt3).toFixed(3)}, ${y1.toFixed(3)}) -- `;
                    tikz += `(${(x1 + 0.5 * sqrt3).toFixed(3)}, ${(y1 - 0.5).toFixed(3)}) -- cycle;
`;
                }
            }
            tikz += `\\end{scope}

% Path-based rhombi fills (colors 1 and 2)
`;

            // First pass: draw only the fills for path-based rhombi
            for (let timeIdx = 0; timeIdx < T; timeIdx++) {
                for (let particleIdx = 0; particleIdx < N; particleIdx++) {
                    if (particleIdx < paths.length && timeIdx < paths[particleIdx].length - 1) {
                        const currentHeight = paths[particleIdx][timeIdx];
                        const nextHeight = paths[particleIdx][timeIdx + 1];
                        
                        const x1 = timeIdx * 0.5 * sqrt3;
                        const y1 = currentHeight - timeIdx * 0.5;
                        const x2 = x1;
                        const y2 = y1 + 1;
                        
                        let x3, y3, x4, y4, fillColor;
                        
                        if (nextHeight === currentHeight) {
                            // Down rhombus (color1)
                            x3 = x2 + 0.5 * sqrt3;
                            y3 = y2 - 0.5;
                            x4 = x1 + 0.5 * sqrt3;
                            y4 = y1 - 0.5;
                            fillColor = 'color1';
                        } else {
                            // Up rhombus (color2)
                            x3 = x2 + 0.5 * sqrt3;
                            y3 = y2 + 0.5;
                            x4 = x1 + 0.5 * sqrt3;
                            y4 = y1 + 0.5;
                            fillColor = 'color2';
                        }
                        
                        // Only fill, no stroke
                        tikz += `\\fill[${fillColor}] `;
                        tikz += `(${x1.toFixed(3)}, ${y1.toFixed(3)}) -- `;
                        tikz += `(${x2.toFixed(3)}, ${y2.toFixed(3)}) -- `;
                        tikz += `(${x3.toFixed(3)}, ${y3.toFixed(3)}) -- `;
                        tikz += `(${x4.toFixed(3)}, ${y4.toFixed(3)}) -- cycle;
`;
                    }
                }
            }

            // Second pass: draw borders for path-based rhombi if borders are enabled
            if (showBorder && borderWidth > 0) {
                tikz += `
% Path-based rhombi borders
`;
                for (let timeIdx = 0; timeIdx < T; timeIdx++) {
                    for (let particleIdx = 0; particleIdx < N; particleIdx++) {
                        if (particleIdx < paths.length && timeIdx < paths[particleIdx].length - 1) {
                            const currentHeight = paths[particleIdx][timeIdx];
                            const nextHeight = paths[particleIdx][timeIdx + 1];
                            
                            const x1 = timeIdx * 0.5 * sqrt3;
                            const y1 = currentHeight - timeIdx * 0.5;
                            const x2 = x1;
                            const y2 = y1 + 1;
                            
                            let x3, y3, x4, y4;
                            
                            if (nextHeight === currentHeight) {
                                // Down rhombus (color1)
                                x3 = x2 + 0.5 * sqrt3;
                                y3 = y2 - 0.5;
                                x4 = x1 + 0.5 * sqrt3;
                                y4 = y1 - 0.5;
                            } else {
                                // Up rhombus (color2)
                                x3 = x2 + 0.5 * sqrt3;
                                y3 = y2 + 0.5;
                                x4 = x1 + 0.5 * sqrt3;
                                y4 = y1 + 0.5;
                            }
                            
                            // Only stroke, no fill
                            tikz += `\\draw[bordercolor, line width=${tikzRhombiBorderWidth}pt] `;
                            tikz += `(${x1.toFixed(3)}, ${y1.toFixed(3)}) -- `;
                            tikz += `(${x2.toFixed(3)}, ${y2.toFixed(3)}) -- `;
                            tikz += `(${x3.toFixed(3)}, ${y3.toFixed(3)}) -- `;
                            tikz += `(${x4.toFixed(3)}, ${y4.toFixed(3)}) -- cycle;
`;
                        }
                    }
                }
            }

            // Draw hexagon border exactly as canvas does
            tikz += `
% Hexagon border
\\draw[bordercolor, line width=${Math.max(tikzHexagonBorderWidth, 0.5)}pt] `;
            for (let i = 0; i < hexagonVertices.length; i++) {
                if (i > 0) tikz += ' -- ';
                tikz += `(${hexagonVertices[i].x.toFixed(3)}, ${hexagonVertices[i].y.toFixed(3)})`;
            }
            tikz += ` -- cycle;
`;

            tikz += `
\\end{tikzpicture}
\\end{document}`;

            return tikz;
        }



        hexToRGB(hex) {
            // Convert hex color to RGB array
            if (typeof hex === 'string' && hex.startsWith('#')) {
                const h = hex.slice(1);
                return [
                    parseInt(h.slice(0, 2), 16),
                    parseInt(h.slice(2, 4), 16),
                    parseInt(h.slice(4, 6), 16)
                ];
            }
            return [128, 128, 128]; // Default gray
        }



        copyToClipboard() {
            try {
                const textarea = document.getElementById('export-textarea');
                textarea.select();
                textarea.setSelectionRange(0, 99999); // For mobile devices

                if (navigator.clipboard && window.isSecureContext) {
                    // Use modern clipboard API if available
                    navigator.clipboard.writeText(textarea.value).then(() => {
                        this.showCopyFeedback('copy-to-clipboard');
                    }).catch(() => {
                        // Fallback to execCommand
                        document.execCommand('copy');
                        this.showCopyFeedback('copy-to-clipboard');
                    });
                } else {
                    // Fallback for older browsers
                    document.execCommand('copy');
                    this.showCopyFeedback('copy-to-clipboard');
                }
            } catch (error) {
                this.showErrorFeedback('copy-to-clipboard', 'Failed to copy');
            }
        }

        downloadFile() {
            try {
                const text = document.getElementById('export-textarea').value;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `plane_partition_N${this.wasm.getParameters().N}_T${this.wasm.getParameters().T}_S${this.wasm.getParameters().S}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                alert('Download error: ' + errorMessage);
            }
        }



        copyTikzToClipboard() {
            try {
                const textarea = document.getElementById('tikz-export-textarea');
                textarea.select();
                textarea.setSelectionRange(0, 99999);

                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(textarea.value).then(() => {
                        this.showCopyFeedback('copy-tikz-clipboard');
                    }).catch(() => {
                        document.execCommand('copy');
                        this.showCopyFeedback('copy-tikz-clipboard');
                    });
                } else {
                    document.execCommand('copy');
                    this.showCopyFeedback('copy-tikz-clipboard');
                }
            } catch (error) {
                this.showErrorFeedback('copy-tikz-clipboard', 'Failed to copy');
            }
        }

        downloadTikzFile() {
            try {
                const text = document.getElementById('tikz-export-textarea').value;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const params = this.wasm.getParameters();
                a.download = `lozenge_tiling_N${params.N}_T${params.T}_S${params.S}.tex`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                this.showErrorFeedback('download-tikz-file', 'Download failed');
            }
        }

        closeExportModal() {
            document.getElementById('export-modal').style.display = 'none';
        }

        showCopyFeedback(buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✓ Copied!';
                button.style.background = '#4CAF50';
                button.style.color = 'white';
                button.style.borderColor = '#4CAF50';

                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.style.color = '';
                    button.style.borderColor = '';
                }, 2000);
            }
        }

        showSuccessFeedback(buttonId, message) {
            const button = document.getElementById(buttonId);
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✓ ' + message;
                button.style.background = '#4CAF50';
                button.style.color = 'white';
                button.style.borderColor = '#4CAF50';

                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.style.color = '';
                    button.style.borderColor = '';
                }, 2000);
            }
        }

        showErrorFeedback(buttonId, message) {
            const button = document.getElementById(buttonId);
            if (button) {
                const originalText = button.textContent;
                button.textContent = '✗ ' + message;
                button.style.background = '#f44336';
                button.style.color = 'white';
                button.style.borderColor = '#f44336';

                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.style.color = '';
                    button.style.borderColor = '';
                }, 3000);
            }
        }

        updateInfo() {
            const params = this.wasm.getParameters();

            const info = document.getElementById('info');
            info.innerHTML = `
                <span class="config-item">N = <strong>${params.N}</strong></span>
                <span class="config-item">T = <strong>${params.T}</strong></span>
                <span class="config-item">S = <strong>${params.S}</strong></span>
                <span class="config-item">q = <strong>${params.q}</strong></span>
            `;
        }

        async setParameters() {
            try {
                const params = this.getParametersFromUI();
                const currentParams = this.wasm.getParameters();

                if (params.N !== currentParams.N || params.T !== currentParams.T || params.S !== currentParams.S) {
                    alert('Cannot change N, T, or S without creating a new tiling. Use "Initialize New Tiling" instead.');
                    return;
                }

                this.validateParametersUI(params);
                await this.wasm.updateParametersWasm(params);

                this.updateInfo();

            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown error';
                alert('Invalid parameters: ' + errorMessage);
            }
        }

        cycleBorderThickness() {
            // Cycle through border thickness presets: thin (0.001) -> medium (0.01) -> thick (0.05) -> ultra thick (0.15) -> thin
            const borderInput = document.getElementById('border-width');
            const currentValue = parseFloat(borderInput.value);

            let newValue;
            if (currentValue <= 0.001) {
                newValue = 0.01; // thin -> medium
            } else if (currentValue <= 0.01) {
                newValue = 0.05; // medium -> thick
            } else if (currentValue <= 0.05) {
                newValue = 0.15; // thick -> ultra thick
            } else {
                newValue = 0.001; // ultra thick -> thin
            }

            borderInput.value = newValue;
            this.visualizer.setBorderWidth(newValue);
            this.redraw();
        }

        redraw() {
            try {
                const params = this.wasm.getParameters();
                const paths = this.wasm.getPaths();
                this.visualizer.draw(paths, params.N, params.T, params.S);
            } catch (error) {
                console.error('Redraw error:', error);
            }
        }
    }

    function initializeCollapsibleSections() {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth < 768;

        // About this simulation (#about-simulation-details)
        const aboutDetails = document.getElementById('about-simulation-details');
        if (aboutDetails) {
            if (isMobile) {
                aboutDetails.removeAttribute('open'); // CLOSED on mobile
            } else {
                aboutDetails.setAttribute('open', ''); // OPEN on desktop
            }
        }

        // Animation Controls (#animation-controls-details)
        const animationDetails = document.getElementById('animation-controls-details');
        if (animationDetails) {
            if (isMobile) {
                animationDetails.setAttribute('open', ''); // OPEN on mobile
            } else {
                animationDetails.removeAttribute('open'); // CLOSED on desktop
            }
        }

        // "More Options" main section (#more-options-details) - Don't auto-close if user has opened it
        const moreOptionsDetails = document.getElementById('more-options-details');
        if (moreOptionsDetails) {
            // On mobile, preserve the current state if user has opened it
            // On desktop, close by default unless user has opened it
            if (!moreOptionsDetails.hasAttribute('data-user-opened')) {
                moreOptionsDetails.removeAttribute('open'); // CLOSED by default, user clicks to expand
            }
            // Add event listener to track when user manually opens/closes
            if (!moreOptionsDetails.hasAttribute('data-listener-added')) {
                moreOptionsDetails.setAttribute('data-listener-added', 'true');
                moreOptionsDetails.addEventListener('toggle', function() {
                    if (this.hasAttribute('open')) {
                        this.setAttribute('data-user-opened', 'true');
                    } else {
                        this.removeAttribute('data-user-opened');
                    }
                });
            }
        }

        // Nested details within "More Options" (.nested-control-group) - Don't auto-close if user opened them
        const nestedMoreOptionsDetails = document.querySelectorAll('#more-options-details .nested-control-group');
        nestedMoreOptionsDetails.forEach(detail => {
            // Don't auto-close if user has opened it
            if (!detail.hasAttribute('data-user-opened')) {
                detail.removeAttribute('open'); // CLOSED by default, user expands as needed
            }
            // Add event listener to track when user manually opens/closes
            if (!detail.hasAttribute('data-listener-added')) {
                detail.setAttribute('data-listener-added', 'true');
                detail.addEventListener('toggle', function() {
                    if (this.hasAttribute('open')) {
                        this.setAttribute('data-user-opened', 'true');
                    } else {
                        this.removeAttribute('data-user-opened');
                    }
                });
            }
        });

        // Info Sections (Current Configuration & Color Legend) - OPEN on both mobile and desktop
        const configDetails = document.getElementById('config-details');
        if (configDetails) {
            configDetails.setAttribute('open', ''); // OPEN on both mobile and desktop
        }
        const legendDetails = document.getElementById('legend-details');
        if (legendDetails) {
            legendDetails.setAttribute('open', ''); // OPEN on both mobile and desktop
        }

        // Keyboard Shortcuts (#keyboard-info-details) - OPEN on both mobile and desktop
        const keyboardDetails = document.getElementById('keyboard-info-details');
        if (keyboardDetails) {
            keyboardDetails.setAttribute('open', ''); // OPEN on both mobile and desktop
        }
    }

    // Initialize application
    try {
        console.log('Starting application initialization...');
        console.log('Module defined:', typeof Module !== 'undefined');

        const wasmInterface = new WASMInterface();
        await wasmInterface.initialize();

        const canvas = document.getElementById('lozenge-canvas');
        if (!canvas) {
            throw new Error('Canvas element "lozenge-canvas" not found');
        }
        const visualizer = new TilingVisualizer(canvas);

        const ui = new UIController(wasmInterface, visualizer);

        // Initialize collapsible sections with responsive behavior
        initializeCollapsibleSections();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            // Debounce the resize event to avoid excessive calls
            resizeTimer = setTimeout(() => {
                initializeCollapsibleSections();
            }, 250);
        });

        // Initialize with default parameters and perform initial steps on page load
        await ui.initializeTiling(true);

        console.log('Random Tilings Generator initialized successfully');

    } catch (error) {
        console.error('Failed to initialize application:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        alert('Failed to initialize application: ' + errorMessage + '\nCheck console for details.');
    }
};
</script>
