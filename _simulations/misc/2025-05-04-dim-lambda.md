---
title: Young diagrams of (very close to) maximal dimension
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-05-04-dim-lambda.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
---
<script src="{{site.url}}/js/d3.v7.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">

<style>
  .chart-container, .c-lambda-chart-container {
    height: 300px;
    width: 100%;
    min-height: 200px;
  }
  .young-diagram-container {
    margin-top: 5px;
    margin-bottom: 10px;
    text-align: center;
    overflow-x: auto; /* Enable horizontal scrolling if needed */
    max-width: 100%; /* Ensure container doesn't exceed parent width */
    display: flex;
    justify-content: center;
    align-items: center; /* Center vertically as well */
    min-height: 200px;
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
    position: relative; /* For absolute positioning if needed */
  }
  /* Make SVG responsive */
  .young-diagram-container svg {
    max-width: 100%;
    height: auto !important;
    display: block;
    margin: 0 auto;
  }

  /* Responsive adjustments for small screens */
  @media (max-width: 576px) {
    .young-diagram-container {
      min-height: 150px;
      margin-left: -15px;
      margin-right: -15px;
      width: calc(100% + 30px);
      overflow-x: scroll;
      -webkit-overflow-scrolling: touch; /* Smoother scrolling on iOS */
    }

    /* Force display for mobile */
    .young-diagram-container svg {
      display: block !important;
      max-width: none !important; /* Allow diagram to be wider than container with scrolling */
      height: auto !important;
      min-width: 250px; /* Ensure minimum width on small screens */
    }
  }
  .young-box {
    fill: #4682b4;
    stroke: #000;
    stroke-width: 1px;
  }
  .young-box-new {
    fill: #ff7f50; /* Coral color for new boxes */
    stroke: #000;
    stroke-width: 1px;
  }
  .young-box-removed {
    fill: none;
    stroke: #ff0000; /* Red color for removed boxes */
    stroke-width: 2px;
    stroke-dasharray: 5,5;
  }
  .stats-card {
    margin-top: 20px;
  }
  .number-input-container {
    display: flex;
    align-items: center;
  }
  .number-controls {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
  }
  .number-control-btn {
    cursor: pointer;
    padding: 2px 8px;
    background: #f8f9fa;
    border: 1px solid #ced4da;
    user-select: none;
  }
  .number-control-btn:hover {
    background: #e9ecef;
  }

  .auto-controls {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }

  .speed-control {
    margin-top: 10px;
    padding: 5px;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #e9ecef;
  }

  .form-range {
    width: 100%;
    height: 1.5rem;
    padding: 0;
    appearance: none;
    background-color: transparent;
  }

  .form-range::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #007bff;
    cursor: pointer;
  }

  .form-range::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #007bff;
    cursor: pointer;
  }

  /* Styles for the dimension display */
  #dimension-display {
    font-family: "SFMono-Regular", Consolas, Monaco, "Courier New", Courier, monospace;
    font-size: 0.85rem;
    word-break: break-all;
    white-space: pre-wrap;
    min-height: 120px;
    max-height: 400px;
    overflow-y: auto;
    overflow-x: hidden;
    letter-spacing: -0.03em;
    line-height: 1.25;
    padding: 10px;
    border-color: #ccc;
    background-color: #f9f9f9;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    width: 100%;
  }
</style>

<div class="container mt-5">
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
          <p class="mt-4">
              This visualization displays the Young diagrams with the maximum
              dimension (number of standard Young tableaux)
              or <b>close to maximum</b> (for large $n$).
              Here $n$ is the number of boxes in the Young diagram.
              For large $n$, Young diagrams maximizing $f^\lambda$ are identified via heuristics inspired by <a href="https://arxiv.org/abs/2311.15199">this paper</a> by Duzhin and Smirnov-Maltsev (2023).
              All data on this page was precomputed with various degree of precision (and thus, closeness to the maximal). Up to $n=500$, this should likely be the correct maximal dimension for most $n$ (with a few outliers which are hard to catch), and after that, the answer is approximate, but should be reasonably close.
          </p>
          <p>
            In our search, we build candidate Young diagrams at level $n+1$ recursively by adding boxes to "best bets" from the previous two levels (few dozen at level $n-1$, and few hundred at level $n$). We also add "shaking": after adding boxes, we allow to move up to $k$ additional boxes in the Young diagram. We maximize the dimension over all candidates, and store the result and the "best bets" for future use.
          </p>
          <p>
          The algorithm's parameters differ significantly between small and large $n$. For $n\le 500$,
          we implement larger pools of "best bets", and more extensive shaking.
          For $500<n \le 5000$, we allow to move only one box.
        After $n=5000$, we implement an even faster greedy algorithm which just maximizes over all ways to add a box to the previous partition, without shaking.
          </p>
          <blockquote class="blockquote">
            <p>Based on the evidence up to $n=500$, we conjecture that even the greedy algorithm hits the actual maximal dimension for infinitely many $n$.</p>
          </blockquote>
        </div>
      </div>
    </div>
  </div>

  <div class="row mt-4">
    <div class="col-md-4">
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">Input</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label for="size-n" class="form-label">Size n:</label>
            <div class="number-input-container">
              <input type="number" class="form-control" id="size-n" min="1" max="12000" value="47" required>
              <div class="number-controls">
                  <span class="number-control-btn" id="increment-btn">▲</span>
                  <span class="number-control-btn" id="decrement-btn">▼</span>
              </div>
            </div>
            <div class="auto-controls mt-2">
              <button class="btn btn-sm btn-outline-primary" id="grow-btn">Grow Diagram</button>
              <button class="btn btn-sm btn-outline-danger" id="stop-grow-btn" style="display: none;">Stop</button>
              <button class="btn btn-sm btn-outline-warning ml-2" id="shrink-btn">Shrink Diagram</button>
              <button class="btn btn-sm btn-outline-danger" id="stop-shrink-btn" style="display: none;">Stop</button>
            </div>
            <div class="speed-control mt-2">
              <label for="speed-slider" class="form-label">Speed: <span id="speed-value">2x</span></label>
              <input type="range" class="form-range" id="speed-slider" min="1" max="10" value="2">
            </div>
          </div>
        </div>
      </div>

      <div class="card stats-card">
        <div class="card-header bg-info text-white">
          <h5 class="card-title mb-0">Information</h5>
        </div>
        <div class="card-body">
          <div id="stats-container">
            <p><strong>Partition:</strong> <span id="partition-display">-</span></p>
            <p><strong>Dimension $f^{\lambda}=$</strong> <span id="scientific-display">-</span></p>
            <p><strong>$c(\lambda) = -\log(f^{\lambda}/\sqrt{n!})/\sqrt{n}=$</strong> <span id="c-lambda-display">-</span></p>
          </div>
        </div>
      </div>
    </div>

    <div class="col-md-8">
      <div class="row">
        <!-- Warning Banner for n >= 500 -->
        <div class="col-md-12 mb-3" id="large-n-warning" style="display: none;">
          <div class="alert alert-warning" role="alert">
            <h4 class="alert-heading"><i class="fas fa-exclamation-triangle"></i> Approximate Results</h4>
            <p>For n > 500, the heuristic search was limited and the displayed partition may not have the maximum dimension.
            Results are approximate and based on simpler greedy algorithms.</p>
          </div>
        </div>

        <!-- Young Diagram Card -->
        <div class="col-md-12">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h5 class="card-title mb-0">Young Diagram</h5>
            </div>
            <div class="card-body">
              <div class="young-diagram-container" id="young-diagram-container"></div>

              <!-- Fixed legend below the diagram -->
              <div class="legend-container mt-3" id="legend-container">
                <div class="d-flex justify-content-center">
                  <div class="legend-item mx-2">
                    <span class="legend-box existing-box"></span>
                    <span class="legend-label">Existing</span>
                  </div>
                  <div class="legend-item mx-2">
                    <span class="legend-box new-box"></span>
                    <span class="legend-label">New</span>
                  </div>
                  <div class="legend-item mx-2">
                    <span class="legend-box removed-box"></span>
                    <span class="legend-label">Removed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- C(lambda) Graph Card -->
        <div class="col-md-12 mt-3">
          <div class="card">
            <div class="card-header bg-info text-white">
              <h5 class="card-title mb-0">Kerov-Pass conjectural constant</h5>
            </div>
            <div class="card-body">
              <div class="c-lambda-chart-container" id="c-lambda-chart-container"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="row mt-4">
    <div class="col-md-12">
      <div class="card">
        <div class="card-header bg-info text-white">
          <h5 class="card-title mb-0">Number of standard Young tableaux of this shape</h5>
        </div>
        <div class="card-body">
          <textarea id="dimension-display" class="form-control mb-4" rows="7" readonly style="resize: vertical; overflow-y: auto; font-family: monospace; font-size: 0.9rem; word-break: break-all; white-space: pre-wrap; overflow-x: scroll; scrollbar-width: thin;">-</textarea>
          <div class="mt-2">
            <div class="d-flex mb-2">
              <button id="get-mathematica-btn" class="btn btn-sm btn-outline-primary mr-2">Get dimension data Mathematica Format</button>
              <button id="copy-mathematica-btn" class="btn btn-sm btn-outline-secondary" type="button" style="display: none;">
                <i class="fas fa-copy"></i> Copy
              </button>
            </div>
            <div id="mathematica-format-container" class="mt-2" style="display: none;">
              <textarea id="mathematica-format" class="form-control" rows="4" readonly style="font-family: monospace; font-size: 0.9rem;"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Legend styles */
  .legend-container {
    text-align: center;
    padding: 5px;
    background-color: #f8f9fa;
    border-radius: 5px;
    margin-top: 5px;
    border: 1px solid #e9ecef;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    margin: 0 8px 5px 8px;
    white-space: nowrap;
  }
  .legend-box {
    display: inline-block;
    width: 15px;
    height: 15px;
    margin-right: 5px;
    flex-shrink: 0;
  }
  .existing-box {
    background-color: #4682b4;
    border: 1px solid #000;
  }
  .new-box {
    background-color: #ff7f50;
    border: 1px solid #000;
  }
  .removed-box {
    background-color: transparent;
    border: 2px dashed #ff0000;
    width: 13px;
    height: 13px;
  }
  .legend-label {
    font-size: 14px;
  }

  /* Responsive adjustments for small screens */
  @media (max-width: 576px) {
    .legend-item {
      margin: 0 4px 5px 4px;
    }
    .legend-box {
      width: 12px;
      height: 12px;
      margin-right: 3px;
    }
    .legend-label {
      font-size: 12px;
    }
    #about-section[open] {
      margin-bottom: 1rem;
    }
    #about-section:not([open]) {
      margin-bottom: 0;
    }
    #about-section > summary {
      font-weight: bold;
      cursor: pointer;
      padding: 0.5rem 0;
      margin-bottom: 0;
    }
  }

  /* Always fold About section by default on mobile */
  @media (max-width: 576px) {
    #about-section:not([open]) {
      display: block;
    }
    #about-section > div {
      display: none;
    }
    #about-section[open] > div {
      display: block;
    }
  }

  /* For larger screens, make details togglable but not folded by default */
  @media (min-width: 577px) {
    #about-section > summary {
      cursor: pointer;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    #about-section > summary::marker {
      font-size: 1.2em;
    }
  }

  /* Chart styles */
  .c-lambda-chart-container {
    width: 100%;
    height: 300px;
    min-height: 250px;
  }

  .x-axis path, .y-axis path,
  .x-axis line, .y-axis line {
    stroke: #ccc;
    stroke-width: 1px;
  }

  .x-axis text, .y-axis text {
    font-size: 10px;
    fill: #666;
  }
</style>

<script>
  // Global variables
  let partitionData = {};
  let growInterval = null;  // Timer for auto-incrementing n
  let shrinkInterval = null;  // Timer for auto-decrementing n

  // Function to fetch and process partition data
  async function loadPartitionData() {
    try {
      // Load all three JSON files
      const jsonFiles = [
        '{{site.url}}/js/2025-05-04-dim-lambda-partitionData.json',
        '{{site.url}}/js/2025-05-04-dim-lambda-partitionData-large.json',
        '{{site.url}}/js/2025-05-04-dim-lambda-partitionData-large2.json'
      ];

      // Load each file and merge the data
      for (const jsonFile of jsonFiles) {
        console.log(`Loading data from ${jsonFile}...`);
        const response = await fetch(jsonFile);
        if (!response.ok) {
          console.warn(`Could not load ${jsonFile}: ${response.status}`);
          continue;
        }

        // Get the raw text first
        const rawText = await response.text();

        try {
          // Parse JSON to object but ensure dimensions are preserved as strings
          const fileData = JSON.parse(rawText, (key, value) => {
            // Ensure dimension values are always strings
            if (key === 'dimension') {
              return value.toString();
            }
            return value;
          });

          // Merge data into the main partitionData object
          Object.keys(fileData).forEach(key => {
            partitionData[key] = fileData[key];
            // Ensure dimensions are strings
            if (partitionData[key].dimension !== undefined) {
              partitionData[key].dimension = partitionData[key].dimension.toString();
            }
          });

          console.log(`Successfully merged data from ${jsonFile}`);
        } catch (parseError) {
          console.error(`Error parsing ${jsonFile}:`, parseError);
        }
      }

      console.log("Partition data loading complete, merged data from all files.");

      // Update max input value based on available data
      const availableKeys = Object.keys(partitionData).map(Number).sort((a, b) => a - b);
      if (availableKeys.length > 0) {
        const maxAvailable = Math.max(...availableKeys);
        // Leave the max as 12000 as specified in the HTML
        console.log(`Updated max input value to ${maxAvailable} based on available data`);

        // No longer adding data range information
      }

      // Initialize display after data is loaded
      const inputElement = document.getElementById('size-n');
      const initialN = parseInt(inputElement.value);
      // Ensure the initial display update happens *after* data is loaded
      if (partitionData[initialN.toString()]) {
         updateDisplay(initialN);
      } else {
         console.warn(`Initial size n=${initialN} not found in loaded data.`);
         // Handle cases where initial value might not be in JSON
         document.getElementById('young-diagram-container').innerHTML = '<p>Select a valid size.</p>';
      }

    } catch (error) {
      console.error('Error loading partition data:', error);
      // Display an error message to the user in the UI
       document.getElementById('young-diagram-container').innerHTML = '<p class="text-danger">Error loading visualization data. Please check console.</p>';
       // Optionally disable controls or show specific error messages
    }
  }

  // Call the function to load data when the script runs
  // Ensure this runs before any code that relies on partitionData
  loadPartitionData();

  // Store the previous partition
  let previousPartition = null;

  // No need to store c(lambda) values anymore, we'll calculate them on demand

  // Function to draw the Young diagram for a given partition
  function drawYoungDiagram(partition, n) {
    const container = document.getElementById('young-diagram-container');
    container.innerHTML = '';

    // Get container dimensions
    const containerWidth = document.getElementById('young-diagram-container').offsetWidth;

    // Set up dimensions - dynamically adjust box size based on screen size
    const baseBoxSize = 40;
    // Reduce box size for small screens more aggressively, especially for mobile
    const isMobile = window.innerWidth <= 576;
    const minBoxSize = isMobile ? 10 : 18; // Even smaller minimum for mobile

    // For mobile, use a more aggressive calculation to ensure the diagram is visible
    let boxSize;
    if (isMobile) {
      // On mobile, prioritize visibility over detail
      const maxBoxesInWidth = Math.max(1, Math.max(...partition));
      boxSize = Math.min(baseBoxSize, Math.max(minBoxSize, 300 / (maxBoxesInWidth + 2)));
    } else {
      // For larger screens, use the original calculation
      boxSize = Math.min(baseBoxSize, Math.max(minBoxSize, containerWidth / (Math.max(1, Math.max(...partition)) + 5)));
    }

    const margin = Math.max(5, boxSize / 4);

    // Get the previous partition if available
    const prevPartition = n > 1 && partitionData[(n-1).toString()] ? partitionData[(n-1).toString()].partition : null;

    // Calculate max dimensions considering both current and previous partitions
    const numRows = Math.max(partition.length, prevPartition ? prevPartition.length : 0);
    const numCols = Math.max(
      Math.max(...partition),
      prevPartition ? Math.max(...prevPartition) : 0
    );

    const width = numCols * boxSize + margin * 2;
    const height = numRows * boxSize + margin * 2;

    // Container width already calculated above

    // Calculate scale factor if diagram is wider than container
    const scaleFactor = Math.min(1, containerWidth / (width + 100));

    // Create SVG with viewBox for responsiveness
    const svg = d3.select('#young-diagram-container')
      .append('svg')
      .attr('viewBox', `0 0 ${width + 50} ${height + 20}`) // No extra space for legend
      .attr('preserveAspectRatio', isMobile ? 'xMinYMid meet' : 'xMidYMid meet') // Left-align on mobile for better visibility
      .attr('width', isMobile ? Math.max(width + 50, 300) : '100%') // Set explicit width for mobile
      .attr('height', height + 20)
      .style('max-width', isMobile ? 'none' : '100%') // Remove max-width restriction on mobile
      .style('min-width', isMobile ? '300px' : 'auto') // Ensure minimum width on mobile
      .style('height', 'auto !important') // Force auto height with !important
      .style('display', 'block')
      .style('margin', '0 auto');

    // Create a map to track box statuses
    let boxStatuses = new Map();

    // If we have a previous partition, identify box statuses
    if (prevPartition) {
      // Create a map of boxes in the current partition
      const currentBoxes = new Set();
      for (let row = 0; row < partition.length; row++) {
        for (let col = 0; col < partition[row]; col++) {
          currentBoxes.add(`${row},${col}`);
        }
      }

      // Create a map of boxes in the previous partition
      const prevBoxes = new Set();
      for (let row = 0; row < prevPartition.length; row++) {
        for (let col = 0; col < prevPartition[row]; col++) {
          prevBoxes.add(`${row},${col}`);
        }
      }

      // Identify boxes that exist in both partitions (these haven't changed)
      const unchangedBoxes = new Set();
      prevBoxes.forEach(box => {
        if (currentBoxes.has(box)) {
          unchangedBoxes.add(box);
        }
      });

      // Identify boxes that exist in current but not in previous (new boxes)
      const newBoxes = new Set();
      currentBoxes.forEach(box => {
        if (!prevBoxes.has(box)) {
          newBoxes.add(box);
        }
      });

      // Identify boxes that exist in previous but not in current (removed boxes)
      const removedBoxes = new Set();
      prevBoxes.forEach(box => {
        if (!currentBoxes.has(box)) {
          removedBoxes.add(box);
        }
      });

      // For boxes in the current partition, determine if they're new, unchanged, or moved
      for (let row = 0; row < partition.length; row++) {
        for (let col = 0; col < partition[row]; col++) {
          const boxKey = `${row},${col}`;

          if (newBoxes.has(boxKey)) {
            // This is a new box
            boxStatuses.set(boxKey, 'new');
          } else {
            // All other boxes are considered unchanged
            boxStatuses.set(boxKey, 'unchanged');
          }
        }
      }

      // Mark removed boxes
      removedBoxes.forEach(boxKey => {
        boxStatuses.set(boxKey, 'removed');
      });
    }

    // First, draw the removed boxes (so they're in the background)
    if (prevPartition) {
      boxStatuses.forEach((status, boxKey) => {
        if (status === 'removed') {
          const [row, col] = boxKey.split(',').map(Number);
          svg.append('rect')
            .attr('class', 'young-box-removed')
            .attr('x', margin + col * boxSize)
            .attr('y', margin + row * boxSize)
            .attr('width', boxSize)
            .attr('height', boxSize);
        }
      });
    }

    // Then, draw the current boxes
    for (let row = 0; row < partition.length; row++) {
      const rowLength = partition[row];
      for (let col = 0; col < rowLength; col++) {
        const boxKey = `${row},${col}`;
        let boxClass = 'young-box';

        // If we have a previous partition, check if this box is new
        if (prevPartition) {
          const boxStatus = boxStatuses.get(boxKey);
          if (boxStatus === 'new') {
            boxClass = 'young-box-new';
          }
        }

        svg.append('rect')
          .attr('class', boxClass)
          .attr('x', margin + col * boxSize)
          .attr('y', margin + row * boxSize)
          .attr('width', boxSize)
          .attr('height', boxSize);
      }
    }

    // No floating legend in the SVG
  }

  // Function to calculate log factorial: log(n!)
  function logFactorial(n) {
    if (n <= 1) return 0;

    let logResult = 0;
    for (let i = 1; i <= n; i++) {
      logResult += Math.log(i);
    }
    return logResult;
  }

  // Function to calculate c(lambda) = -log(f^lambda/sqrt(n!))/sqrt(n)
  function calculateCLambda(dimension, n) {
    // Check if we have a pre-computed c_lambda value for this partition
    const nStr = n.toString();
    if (partitionData[nStr] && partitionData[nStr].c_lambda !== undefined && partitionData[nStr].c_lambda !== null) {
      return partitionData[nStr].c_lambda;
    }

    // For all n values, use logarithmic calculations to avoid overflow
    // Convert dimension to string to handle very large numbers
    const dimensionStr = dimension.toString();

    // For very large numbers (scientific notation with e+), extract the exponent
    let logDimension;
    if (dimensionStr.includes('e+')) {
      const parts = dimensionStr.split('e+');
      const mantissa = parseFloat(parts[0]);
      const exponent = parseInt(parts[1]);
      logDimension = Math.log(mantissa) + exponent * Math.log(10);
    } else {
      // For regular numbers, just take the log
      try {
        logDimension = Math.log(dimension);
      } catch (e) {
        console.warn(`Error calculating log for n=${n}, dimension is too large. Using Infinity.`);
        return Infinity; // Return a placeholder value for extremely large numbers
      }
    }

    // Calculate log(n!)
    const logNFactorial = logFactorial(n);

    // logSqrtFactorial = log(sqrt(n!)) = log(n!)/2
    const logSqrtFactorial = logNFactorial / 2;

    // c(lambda) = -log(f^lambda/sqrt(n!))/sqrt(n) = -(log(f^lambda) - log(sqrt(n!)))/sqrt(n)
    try {
      return -(logDimension - logSqrtFactorial) / Math.sqrt(n);
    } catch (e) {
      console.warn(`Error calculating c(lambda) for n=${n}: ${e.message}`);
      return Infinity; // Return a placeholder value for calculation errors
    }
  }

  // Function to update the display with information for a given size n
  function updateDisplay(n) {
    const data = partitionData[n.toString()];

    // Show/hide the warning banner based on n value
    const warningBanner = document.getElementById('large-n-warning');
    if (n > 500) {
      warningBanner.style.display = 'block';
    } else {
      warningBanner.style.display = 'none';
    }

    if (data) {
      // Update partition display
      document.getElementById('partition-display').textContent = `[${data.partition.join(', ')}]`;

      // Display dimension value - just focus on showing SUPER DUPER long numbers correctly
      const dimensionStr = data.dimension.toString(); // Convert to string

      // Display the dimension value in textarea (use value instead of textContent)
      const dimensionDisplay = document.getElementById('dimension-display');
      dimensionDisplay.value = dimensionStr;

      // Log for debugging
      console.log(`Dimension for n=${n}: String of length ${dimensionStr.length}`);

      // Adjust textarea height based on content length
      const contentLength = dimensionStr.length;
      if (contentLength > 1000) {
        dimensionDisplay.rows = 15; // More rows for extremely large numbers
      } else if (contentLength > 500) {
        dimensionDisplay.rows = 12;
      } else if (contentLength > 300) {
        dimensionDisplay.rows = 8;
      } else if (contentLength > 150) {
        dimensionDisplay.rows = 6;
      } else {
        dimensionDisplay.rows = 5;
      }

      // Format dimension in scientific notation with LaTeX formatting
      let scientificNotation;
      try {
        // Only format numbers for n <= 300
        if (n <= 300) {
          if (typeof dimensionStr === 'string' && dimensionStr.includes('e')) {
            // Handle scientific notation directly
            const parts = dimensionStr.split('e');
            const mantissa = parseFloat(parts[0]);
            const exponent = parseInt(parts[1].replace('+', ''));
            scientificNotation = `${mantissa.toFixed(2)} × 10^${exponent}`;
          } else if (typeof dimensionStr === 'string' && dimensionStr.length > 15) {
            // For very long string numbers
            scientificNotation = `${dimensionStr.substring(0, 2)}.${dimensionStr.substring(2, 4)} × 10^${dimensionStr.length - 1}`;
          } else if (data.dimension >= 1e10) {
            // Regular large numbers
            const exponent = Math.floor(Math.log10(data.dimension));
            const mantissa = data.dimension / Math.pow(10, exponent);
            scientificNotation = `${mantissa.toFixed(2)} × 10^${exponent}`;
          } else {
            // Small numbers
            scientificNotation = data.dimension.toString();
          }
        } else {
          // For n > 300, don't try to format
          scientificNotation = "Too large";
        }
      } catch (e) {
        // Fallback for any parsing errors
        scientificNotation = `10^${dimensionStr.toString().length}`;
      }
      document.getElementById('scientific-display').textContent = scientificNotation;

      // Calculate and display c(lambda)
      const cLambda = calculateCLambda(data.dimension, n);

      // Check if cLambda is a valid finite number
      if (isFinite(cLambda)) {
        document.getElementById('c-lambda-display').textContent = cLambda.toFixed(6);
      } else {
        // If we have a pre-computed value available, display that instead
        if (data.c_lambda !== undefined) {
          document.getElementById('c-lambda-display').textContent = data.c_lambda.toFixed(6);
        } else {
          document.getElementById('c-lambda-display').textContent = 'Value too large to compute';
        }
      }

      // Draw the Young diagram with the current n value
      drawYoungDiagram(data.partition, n);

      // Toggle legend visibility based on whether we have a previous partition
      const legendContainer = document.getElementById('legend-container');
      if (n > 1) {
        legendContainer.style.display = 'block';
      } else {
        legendContainer.style.display = 'none';
      }

      // Update the c(lambda) chart with current n
      drawCLambdaChart(n);
    } else {
      document.getElementById('partition-display').textContent = 'Not available';
      document.getElementById('dimension-display').textContent = 'Not available';
      document.getElementById('scientific-display').textContent = 'Not available';
      document.getElementById('c-lambda-display').textContent = 'Not available';
      document.getElementById('young-diagram-container').innerHTML = '<p>Data not available for this size.</p>';

      // Hide legend when no data is available
      document.getElementById('legend-container').style.display = 'none';
    }
  }

  // Function to increment n value with validation
  function incrementN() {
    const inputElement = document.getElementById('size-n');
    const currentValue = parseInt(inputElement.value) || 0;
    const maxValue = parseInt(inputElement.max);

    if (currentValue < maxValue) {
      const nextN = currentValue + 1;
      if (partitionData[nextN.toString()]) {
        inputElement.value = nextN;
        updateDisplay(nextN);
        return true; // Successfully incremented
      } else {
        console.warn(`Data for n=${nextN} not loaded or available.`);
        return false; // Failed to increment
      }
    }
    return false; // Out of range
  }

  // Function to decrement n value with validation
  function decrementN() {
    const inputElement = document.getElementById('size-n');
    const currentValue = parseInt(inputElement.value) || 0;
    const minValue = parseInt(inputElement.min) || 1;

    if (currentValue > minValue) {
      const prevN = currentValue - 1;
      if (partitionData[prevN.toString()]) {
        inputElement.value = prevN;
        updateDisplay(prevN);
        return true; // Successfully decremented
      } else {
        console.warn(`Data for n=${prevN} not loaded or available.`);
        return false; // Failed to decrement
      }
    }
    return false; // Out of range
  }

  // Function to get interval time based on speed slider
  function getIntervalTime() {
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = parseInt(speedSlider.value);

    // Convert speed multiplier (1-10) to milliseconds
    // Higher speed value means shorter interval time
    // 1x = 1000ms, 10x = 100ms
    return Math.round(1100 - (speedValue * 100));
  }

  // Function to update speed display
  function updateSpeedDisplay() {
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = parseInt(speedSlider.value);
    document.getElementById('speed-value').textContent = `${speedValue}x`;
  }

  // Function to start auto-growing the diagram
  function startGrowing() {
    // Clear any existing intervals to prevent multiple timers
    if (growInterval) clearInterval(growInterval);
    if (shrinkInterval) {
      clearInterval(shrinkInterval);
      shrinkInterval = null;
      document.getElementById('shrink-btn').style.display = 'inline-block';
      document.getElementById('stop-shrink-btn').style.display = 'none';
    }

    // Hide grow button, show stop button
    document.getElementById('grow-btn').style.display = 'none';
    document.getElementById('stop-grow-btn').style.display = 'inline-block';

    // Get interval time from speed slider
    const intervalTime = getIntervalTime();

    // Start increasing n at regular intervals
    growInterval = setInterval(() => {
      const success = incrementN();
      // If we've reached the max value or data not available, stop auto-growing
      if (!success) {
        stopGrowing();
      }
    }, intervalTime);
  }

  // Function to stop auto-growing
  function stopGrowing() {
    if (growInterval) {
      clearInterval(growInterval);
      growInterval = null;
      // Show grow button, hide stop button
      document.getElementById('grow-btn').style.display = 'inline-block';
      document.getElementById('stop-grow-btn').style.display = 'none';
    }
  }

  // Function to start auto-shrinking the diagram
  function startShrinking() {
    // Clear any existing intervals to prevent multiple timers
    if (shrinkInterval) clearInterval(shrinkInterval);
    if (growInterval) {
      clearInterval(growInterval);
      growInterval = null;
      document.getElementById('grow-btn').style.display = 'inline-block';
      document.getElementById('stop-grow-btn').style.display = 'none';
    }

    // Hide shrink button, show stop button
    document.getElementById('shrink-btn').style.display = 'none';
    document.getElementById('stop-shrink-btn').style.display = 'inline-block';

    // Get interval time from speed slider
    const intervalTime = getIntervalTime();

    // Start decreasing n at regular intervals
    shrinkInterval = setInterval(() => {
      const success = decrementN();
      // If we've reached the min value or data not available, stop auto-shrinking
      if (!success) {
        stopShrinking();
      }
    }, intervalTime);
  }

  // Function to stop auto-shrinking
  function stopShrinking() {
    if (shrinkInterval) {
      clearInterval(shrinkInterval);
      shrinkInterval = null;
      // Show shrink button, hide stop button
      document.getElementById('shrink-btn').style.display = 'inline-block';
      document.getElementById('stop-shrink-btn').style.display = 'none';
    }
  }

  // Add event listeners for the input field and control buttons
  document.addEventListener('DOMContentLoaded', function() {
    const inputElement = document.getElementById('size-n');
    const incrementBtn = document.getElementById('increment-btn');
    const decrementBtn = document.getElementById('decrement-btn');
    const growBtn = document.getElementById('grow-btn');
    const stopGrowBtn = document.getElementById('stop-grow-btn');
    const shrinkBtn = document.getElementById('shrink-btn');
    const stopShrinkBtn = document.getElementById('stop-shrink-btn');

    // Initialize display is now handled by loadPartitionData() after fetch completes

    // Add event listener for input changes
    inputElement.addEventListener('input', function() {
      // Stop any auto-growing/shrinking when the user manually changes the value
      stopGrowing();
      stopShrinking();

      const n = parseInt(this.value);
      // Check if data for n exists before updating
      if (partitionData[n.toString()]) {
         if (n >= 1 && n <= parseInt(inputElement.max)) { // Use dynamic max value
            updateDisplay(n);
         }
      } else {
          console.warn(`Data for n=${n} not loaded or available.`);
          // Optionally display a message in the UI
      }
    });

    // Add event listener for increment button
    incrementBtn.addEventListener('click', function() {
      incrementN();
    });

    // Add event listener for decrement button
    decrementBtn.addEventListener('click', function() {
      decrementN();
    });

    // Add event listeners for auto grow/shrink controls
    growBtn.addEventListener('click', startGrowing);
    stopGrowBtn.addEventListener('click', stopGrowing);
    shrinkBtn.addEventListener('click', startShrinking);
    stopShrinkBtn.addEventListener('click', stopShrinking);

    // Add event listener for speed slider
    const speedSlider = document.getElementById('speed-slider');

    // Initialize speed display
    updateSpeedDisplay();

    // Event listener for speed slider
    speedSlider.addEventListener('input', function() {
      // Update the speed display
      updateSpeedDisplay();

      // Update any active intervals with the new speed
      updateActiveIntervals();
    });
  });

  // Function to create and update the c(lambda) chart
  function drawCLambdaChart(currentN) {
    const container = document.getElementById('c-lambda-chart-container');
    container.innerHTML = '';

    if (currentN < 2) {
      container.innerHTML = '<div class="text-center p-3">At least n=2 is needed to display the chart.</div>';
      return;
    }

    // Get container dimensions
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight || 250;

    // Set up margins
    const margin = {top: 20, right: 30, bottom: 40, left: 60};
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select('#c-lambda-chart-container')
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate c(lambda) values up to current n
    const data = [];
    for (let n = 1; n <= currentN; n++) {
      let nStr = n.toString();
      if (partitionData[nStr]) {
        // First check if we have a pre-computed c_lambda value
        let cLambda;
        if (partitionData[nStr].c_lambda !== undefined && partitionData[nStr].c_lambda !== null) {
          cLambda = partitionData[nStr].c_lambda;
        } else {
          cLambda = calculateCLambda(partitionData[nStr].dimension, n);
        }

        if (!isNaN(cLambda) && isFinite(cLambda)) {
          data.push({
            n: n,
            value: cLambda
          });
        }
      }
    }

    if (data.length < 2) {
      container.innerHTML = '<div class="text-center p-3">No valid data points to display the chart.</div>';
      return;
    }

    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([0, currentN + 1]) // Start from 0 with a bit of padding at the end
      .range([0, width]);

    const yMin = Math.max(0, d3.min(data, d => d.value) * 0.9); // Start from 0 or slightly below min
    const yMax = d3.max(data, d => d.value) * 1.1; // Add 10% padding at the top

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(10, currentN))
      .tickFormat(d => Math.floor(d)); // Only show integer tick values

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => d.toFixed(2));

    // Add axes to chart
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis);

    svg.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    // Add X axis label
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .text('n');

    // Add Y axis label
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .text('c(λ)');

    // Create line generator
    const line = d3.line()
      .x(d => xScale(d.n))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX); // Smoother curve

    // Add line path
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4682b4')
      .attr('stroke-width', 2)
      .attr('d', line);

    // We're removing the dots for a cleaner line chart

    // Just track the current point for the value but don't display it
    const currentPoint = data.find(d => d.n === currentN);
  }

  // Handle window resize and orientation changes with debouncing
  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      const inputElement = document.getElementById('size-n');
      const currentN = parseInt(inputElement.value);
      updateDisplay(currentN);
      drawCLambdaChart(currentN); // Redraw the chart on resize with current n
    }, 250); // Wait 250ms after resize ends to redraw
  }

  // Listen for window resize
  window.addEventListener('resize', handleResize);

  // Stop auto-growing/shrinking when the window loses focus
  window.addEventListener('blur', function() {
    stopGrowing();
    stopShrinking();
  });

  // Helper function to restart active intervals with new speed
  function updateActiveIntervals() {
    const intervalTime = getIntervalTime();

    // Update growing interval if active
    if (growInterval) {
      clearInterval(growInterval);
      growInterval = setInterval(() => {
        const success = incrementN();
        if (!success) {
          stopGrowing();
        }
      }, intervalTime);
    }

    // Update shrinking interval if active
    if (shrinkInterval) {
      clearInterval(shrinkInterval);
      shrinkInterval = setInterval(() => {
        const success = decrementN();
        if (!success) {
          stopShrinking();
        }
      }, intervalTime);
    }
  }

  // Listen for orientation change specifically for mobile
  window.addEventListener('orientationchange', function() {
    // Force immediate redraw on orientation change
    const inputElement = document.getElementById('size-n');
    const currentN = parseInt(inputElement.value);

    // First attempt after a very short delay
    setTimeout(function() {
      updateDisplay(currentN);
      drawCLambdaChart(currentN);
    }, 100);

    // Second attempt after the device has fully reoriented
    setTimeout(function() {
      const container = document.getElementById('young-diagram-container');
      if (container && (!container.querySelector('svg') || container.querySelector('svg').style.display === 'none')) {
        console.log("Attempting secondary redraw after orientation change");
        updateDisplay(currentN);
        drawCLambdaChart(currentN);
      }
    }, 500);

    // Final attempt for problematic devices
    setTimeout(function() {
      // Force complete redraw if needed
      const container = document.getElementById('young-diagram-container');
      if (container && (!container.querySelector('svg') || container.querySelector('svg').style.display === 'none')) {
        console.log("Final redraw attempt after orientation change");
        container.innerHTML = ''; // Clear container
        updateDisplay(currentN); // Complete redraw
      }
    }, 1000);
  });

  // Mathematica format generation
  document.addEventListener('DOMContentLoaded', function() {
    const getMathematicaBtn = document.getElementById('get-mathematica-btn');
    const mathematicaFormatContainer = document.getElementById('mathematica-format-container');
    const mathematicaFormatTextarea = document.getElementById('mathematica-format');
    const copyMathematicaBtn = document.getElementById('copy-mathematica-btn');

    // Function to generate Mathematica format based on the current partition
    function generateMathematicaFormat() {
      const inputElement = document.getElementById('size-n');
      const n = parseInt(inputElement.value);

      if (partitionData[n.toString()]) {
        const partition = partitionData[n.toString()].partition;

        // Generate coordinate pairs for Mathematica
        let coordPairs = [];
        for (let i = 1; i <= n; i++) {
          // Calculate dim(λ_i) where λ_i is the partition of i
          const dimValue = i < n ?
                          (partitionData[i.toString()] ? partitionData[i.toString()].dimension : 1) :
                          partitionData[n.toString()].dimension;

          coordPairs.push(`{${i}, ${dimValue}}`);
        }

        // Format as Mathematica list
        return `{${coordPairs.join(', ')}}`;
      } else {
        return "Data not available for this size";
      }
    }

    // Event listener for the Mathematica format button
    getMathematicaBtn.addEventListener('click', function() {
      const mathematicaFormat = generateMathematicaFormat();
      mathematicaFormatTextarea.value = mathematicaFormat;
      mathematicaFormatContainer.style.display = 'block';
      copyMathematicaBtn.style.display = 'inline-block'; // Show the copy button
    });

    // Clipboard copy functionality
    copyMathematicaBtn.addEventListener('click', function() {
      mathematicaFormatTextarea.select();
      document.execCommand('copy');

      // Visual feedback
      const originalText = copyMathematicaBtn.innerHTML;
      copyMathematicaBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(function() {
        copyMathematicaBtn.innerHTML = originalText;
      }, 2000);
    });
  });

  // Auto-collapse accordion on mobile, expand on desktop
  document.addEventListener('DOMContentLoaded', function() {
    // Function to collapse/expand the about section based on screen size
    function setAboutSectionState() {
      // Get the collapse element by ID
      const infoCollapse = document.getElementById('infoCollapse');

      // Also get the button element to update aria-expanded attribute
      const toggleButton = document.querySelector('[data-target="#infoCollapse"]');

      if (infoCollapse) {
        const isMobile = window.innerWidth <= 576;

        if (isMobile) {
          // On mobile, collapse the section
          infoCollapse.classList.remove('show');
          if (toggleButton) {
            toggleButton.setAttribute('aria-expanded', 'false');
          }
        } else {
          // On larger screens, expand the section
          infoCollapse.classList.add('show');
          if (toggleButton) {
            toggleButton.setAttribute('aria-expanded', 'true');
          }
        }
      }
    }

    // Set initial state with a slight delay to ensure DOM is fully loaded
    setTimeout(function() {
      setAboutSectionState();
    }, 100);

    // Update state on resize
    window.addEventListener('resize', function() {
      // Use debouncing to avoid excessive function calls during resize
      clearTimeout(window.resizeAboutTimer);
      window.resizeAboutTimer = setTimeout(function() {
        setAboutSectionState();
      }, 250);
    });
  });
</script>
