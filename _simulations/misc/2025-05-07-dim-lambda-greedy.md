---
title: Greedy Plancherel Growth Algorithm for Young Diagrams
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-05-07-dim-lambda-greedy.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-05-07-dim-lambda-greedy.cpp'
    txt: 'C++ code for the simulation'
published: false
---

<style>
  /* Ensure the container scales properly */
  #simulation-container {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
  }

  /* Young diagram table styling */
  .young-diagram-cell {
    width: 40px;
    height: 40px;
    font-size: 12px;
    text-align: center;
    vertical-align: middle;
    border: 1px solid #333;
  }

  .young-diagram-cell.active {
    background-color: #f0f0f0;
  }

  .young-diagram-cell.best-corner {
    background-color: #ffc107;
    border: 2px solid #ff9800;
  }

  .young-diagram-cell.addable {
    background-color: #e0e0e0;
    border: 1px dashed #333;
  }

  /* Styling for corners table */
  #corners-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }

  #corners-table th, #corners-table td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: center;
  }

  #corners-table th {
    background-color: #f2f2f2;
  }

  #corners-table tr.best-corner {
    background-color: #fff8e1;
  }

  /* Controls styling */
  .controls-row {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  .controls-row label {
    margin-right: 10px;
  }

  .controls-row input, .controls-row button {
    margin-right: 10px;
    margin-bottom: 5px;
  }


  /* Progress indicator */
  #progress-indicator {
    margin-top: 10px;
    font-weight: bold;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .young-diagram-cell {
      width: 30px;
      height: 30px;
      font-size: 10px;
    }

    .controls-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .controls-row input, .controls-row button {
      margin-bottom: 10px;
    }
  }
</style>

This simulation demonstrates the **Greedy Plancherel Growth Algorithm**. At each step, the algorithm adds a box at the position that maximizes the dimension $f(\mu)$ of the next diagram $\mu$, which is computed using the hook-length formula.

The algorithm can be viewed as a deterministic greedy version of the Plancherel growth process, where the next box is selected to maximize $f(\mu)/f(\lambda)$ at each step, and not randomly.

<div id="simulation-container">
  <div class="controls-row">
    <label for="partition-input">Starting Partition (comma-separated):</label>
    <input type="text" id="partition-input" value="3,2,1" />
    <button id="update-btn" class="btn btn-primary">Update</button>
  </div>

  <div class="controls-row">
    <label for="steps-input">Number of Steps:</label>
    <input type="number" id="steps-input" value="1" min="1" max="10000" />
    <button id="simulate-btn" class="btn btn-primary">Simulate</button>
    <button id="step-btn" class="btn btn-secondary">Step Forward</button>
    <button id="reset-btn" class="btn btn-danger">Reset</button>
  </div>

  <div id="progress-indicator"></div>

  <div class="row mt-4">
    <div class="col-md-6">
      <h3>Young Diagram</h3>
      <div id="young-diagram-container"></div>
    </div>
    <div class="col-md-6">
      <h3>Potential Corners</h3>
      <table id="corners-table">
        <thead>
          <tr>
            <th>Corner</th>
            <th>Score</th>
            <th>f(μ)</th>
            <th>Rank</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

</div>

<script>
// Helper function
function logInfo(message) {
  console.log("[DEBUG] " + message);
}

// Define preRun to handle initialization
var Module = {
  preRun: [],
  postRun: [],
  print: function(text) {
    console.log(text);
  },
  printErr: function(text) {
    console.error(text);
  },
  onRuntimeInitialized: function() {
    logInfo("WebAssembly module initialized!");
    initUI();
  }
};

// Load the WebAssembly script
var wasmScript = document.createElement('script');
wasmScript.src = "{{site.url}}/js/2025-05-07-dim-lambda-greedy.js";
wasmScript.async = true;
wasmScript.onerror = function() {
  console.error("Failed to load WASM script!");
  document.getElementById('progress-indicator').textContent =
      "Error loading simulation. Please try refreshing the page.";
};
document.head.appendChild(wasmScript);

// Core UI function that gets called when WebAssembly is ready
function initUI() {
  try {
    logInfo("Initializing UI components");

    // Wrap the exported WebAssembly functions
    const simulateGreedyHook = Module.cwrap('simulateGreedyHook', 'number', ['string', 'number'], {async: true});
    const freeString = Module.cwrap('freeString', null, ['number']);
    const getProgress = Module.cwrap('getProgress', 'number', []);

    logInfo("WASM functions wrapped successfully");

    // Get DOM elements
    const partitionInput = document.getElementById('partition-input');
    const stepsInput = document.getElementById('steps-input');
    const updateBtn = document.getElementById('update-btn');
    const simulateBtn = document.getElementById('simulate-btn');
    const stepBtn = document.getElementById('step-btn');
    const resetBtn = document.getElementById('reset-btn');
    const youngDiagramContainer = document.getElementById('young-diagram-container');
    const cornersTable = document.getElementById('corners-table').querySelector('tbody');
    const progressIndicator = document.getElementById('progress-indicator');

    // State variables
    let simulationData = [];
    let currentStep = 0;
    let isProcessing = false;
    let progressInterval = null;
    let isRunningContinuous = false;
    let simulationTimer = null;

    // Add event listeners
    updateBtn.addEventListener('click', updatePartition);
    simulateBtn.addEventListener('click', toggleSimulation);
    stepBtn.addEventListener('click', stepForward);
    resetBtn.addEventListener('click', resetSimulation);

    logInfo("Event listeners added");

    // Toggle between starting and stopping simulation
    function toggleSimulation() {
      if (isRunningContinuous) {
        // Stop the simulation
        stopContinuousSimulation();
      } else {
        // Start the simulation
        startContinuousSimulation();
      }
    }

    // Start continuous simulation
    function startContinuousSimulation() {
      if (isProcessing) return;

      // If we don't have simulation data yet, run the simulation first
      if (simulationData.length === 0) {
        runSimulation().then(() => {
          if (simulationData.length > 0) {
            startSteppingProcess();
          }
        });
      } else {
        startSteppingProcess();
      }
    }

    // Start the stepping process after simulation data is ready
    function startSteppingProcess() {
      isRunningContinuous = true;
      simulateBtn.textContent = "Stop";
      simulateBtn.classList.remove("btn-primary");
      simulateBtn.classList.add("btn-danger");

      // Disable other controls during continuous simulation
      updateBtn.disabled = true;
      stepBtn.disabled = true;

      // Start stepping at intervals based on speed
      stepForwardLoop();
    }

    // Step forward continuously
    function stepForwardLoop() {
      if (!isRunningContinuous) return;

      // If we've reached the end, stop the simulation
      if (currentStep >= simulationData.length - 1) {
        stopContinuousSimulation();
        progressIndicator.textContent = "End of simulation reached.";
        setTimeout(() => {
          progressIndicator.textContent = '';
        }, 1500);
        return;
      }

      // Step forward
      currentStep++;
      displayStep(currentStep);
      progressIndicator.textContent = `Step ${currentStep + 1} of ${simulationData.length}`;

      // No need to read the steps again, just use a fixed animation speed
      // This way the animation speed is independent of computation steps
      const delay = 500; // 500ms delay between steps

      simulationTimer = setTimeout(stepForwardLoop, delay);
    }

    // Stop the continuous simulation
    function stopContinuousSimulation() {
      isRunningContinuous = false;
      simulateBtn.textContent = "Simulate";
      simulateBtn.classList.remove("btn-danger");
      simulateBtn.classList.add("btn-primary");

      // Re-enable controls
      updateBtn.disabled = false;
      stepBtn.disabled = false;

      // Clear any pending timer
      if (simulationTimer) {
        clearTimeout(simulationTimer);
        simulationTimer = null;
      }
    }

    // Update partition from input
    function updatePartition() {
      try {
        const partitionStr = partitionInput.value.trim();
        const partition = partitionStr.split(',').map(x => parseInt(x.trim()));

        // Validate partition
        if (partition.some(isNaN)) {
          alert('Invalid input: must be comma-separated integers');
          return false;
        }

        // Check that it's a valid partition (non-increasing)
        for (let i = 1; i < partition.length; i++) {
          if (partition[i] > partition[i-1]) {
            alert('Invalid partition: row lengths must be non-increasing');
            return false;
          }
        }

        // Clear previous visualization
        youngDiagramContainer.innerHTML = '';
        cornersTable.innerHTML = '';
        simulationData = [];

        // Show the initial partition without running the simulation
        renderInitialPartition(partition);

        return true;
      } catch (error) {
        console.error("Error in updatePartition:", error);
        alert('Invalid input: must be comma-separated integers');
        return false;
      }
    }

    // Render just the initial partition without any corners
    function renderInitialPartition(partition) {
      // Create a table for the Young diagram
      const table = document.createElement('table');
      table.className = 'young-diagram-table';

      // Determine dimensions
      const rows = partition.length > 0 ? partition.length : 1;
      const cols = (partition.length > 0 ? partition[0] : 0);

      // Create the table
      for (let i = 0; i < rows; i++) {
        const row = document.createElement('tr');

        for (let j = 0; j < cols; j++) {
          const cell = document.createElement('td');
          cell.className = 'young-diagram-cell';

          // Determine if this cell is part of the Young diagram
          if (i < partition.length && j < partition[i]) {
            cell.classList.add('active');

            // Calculate and display hook length
            const hookLength = calculateHookLength(i, j, partition);
            cell.textContent = hookLength;
          }

          row.appendChild(cell);
        }

        table.appendChild(row);
      }

      youngDiagramContainer.appendChild(table);
    }

    // Run the simulation
    async function runSimulation() {
      if (isProcessing) return Promise.resolve(false);

      return new Promise(async (resolve) => {
        try {
          isProcessing = true;
          const partitionStr = partitionInput.value.trim();

          // Get steps from input - we'll use it both for computation and animation
          const steps = parseInt(stepsInput.value, 10);

          if (isNaN(steps) || steps < 1 || steps > 10000) {
            alert('Number of steps must be between 1 and 10000');
            isProcessing = false;
            resolve(false);
            return;
          }

          // Use the steps input directly for simulation length
          const simulationSteps = steps;

          // Validate input partition before proceeding
          const partition = partitionStr.split(',').map(x => parseInt(x.trim()));

          // Validate partition
          if (partition.some(isNaN)) {
            alert('Invalid input: must be comma-separated integers');
            isProcessing = false;
            resolve(false);
            return;
          }

          // Check that it's a valid partition (non-increasing)
          for (let i = 1; i < partition.length; i++) {
            if (partition[i] > partition[i-1]) {
              alert('Invalid partition: row lengths must be non-increasing');
              isProcessing = false;
              resolve(false);
              return;
            }
          }

          // Disable controls during processing
          updateBtn.disabled = true;
          simulateBtn.disabled = true;
          stepBtn.disabled = true;
          resetBtn.disabled = true;

          // Start progress monitoring
          startProgressMonitoring();

          try {
            logInfo("Calling simulateGreedyHook with: " + partitionStr + ", " + simulationSteps);

            // Call the WebAssembly function to generate simulation data
            const resultPtr = await simulateGreedyHook(partitionStr, simulationSteps);
            logInfo("simulateGreedyHook returned: " + resultPtr);

            if (!resultPtr) {
              throw new Error("Simulation returned null result");
            }

            // Convert the result to a string
            const jsonStr = Module.UTF8ToString(resultPtr);
            logInfo("Result string length: " + jsonStr.length);

            // Free the memory allocated in C++
            freeString(resultPtr);

            try {
              // Parse the JSON result
              simulationData = JSON.parse(jsonStr);
              logInfo("Parsed JSON data with " + simulationData.length + " steps");
            } catch (parseError) {
              console.error("JSON parse error:", parseError);
              // Try to handle common JSON parsing issues
              const fixedJsonStr = jsonStr
                .replace(/NaN/g, '"NaN"') // Replace NaN with string "NaN"
                .replace(/Infinity/g, '"Infinity"') // Replace Infinity with string "Infinity"
                .replace(/-Infinity/g, '"-Infinity"'); // Replace -Infinity with string "-Infinity"

              try {
                simulationData = JSON.parse(fixedJsonStr);
                logInfo("Parsed fixed JSON data with " + simulationData.length + " steps");
              } catch (secondError) {
                console.error("Second JSON parse error:", secondError);
                throw new Error("Failed to parse simulation results. Try reducing the number of steps.");
              }
            }

            // Display the first step
            currentStep = 0;
            displayStep(currentStep);

            // Update progress indicator
            progressIndicator.textContent = `Simulation ready with ${simulationData.length} steps. Press 'Simulate' to animate.`;
            setTimeout(() => {
              if (!isRunningContinuous) {
                progressIndicator.textContent = '';
              }
            }, 3000);

            resolve(true);

          } catch (error) {
            console.error("Simulation error:", error);
            alert("Error running simulation: " + error.message);
            resolve(false);
          }

          // Stop progress monitoring
          stopProgressMonitoring();

          // Re-enable controls
          updateBtn.disabled = false;
          simulateBtn.disabled = false;
          stepBtn.disabled = false;
          resetBtn.disabled = false;

          isProcessing = false;
        } catch (error) {
          console.error("Error in runSimulation:", error);
          alert("An error occurred: " + error.message);

          // Re-enable controls
          updateBtn.disabled = false;
          simulateBtn.disabled = false;
          stepBtn.disabled = false;
          resetBtn.disabled = false;

          stopProgressMonitoring();
          isProcessing = false;
          resolve(false);
        }
      });
    }

    // Step forward in the simulation
    function stepForward() {
      // If we're in continuous mode, don't do anything
      if (isRunningContinuous) return;

      // If we don't have simulation data, run the simulation first
      if (simulationData.length === 0) {
        progressIndicator.textContent = "Preparing simulation...";
        runSimulation().then(success => {
          if (success) {
            // Now handle the step forward
            singleStepForward();
          }
        });
        return;
      }

      singleStepForward();
    }

    // Single step forward (used by both manual stepping and continuous simulation)
    function singleStepForward() {
      if (currentStep < simulationData.length - 1) {
        currentStep++;
        displayStep(currentStep);
        if (!isRunningContinuous) {
          progressIndicator.textContent = `Step ${currentStep + 1} of ${simulationData.length}`;
          setTimeout(() => {
            progressIndicator.textContent = '';
          }, 1500);
        }
        return true;
      } else {
        // At the end of simulation
        if (!isRunningContinuous) {
          progressIndicator.textContent = "End of simulation reached.";
          setTimeout(() => {
            progressIndicator.textContent = '';
          }, 1500);
        }
        return false;
      }
    }

    // Reset simulation
    function resetSimulation() {
      // If we're in continuous mode, stop first
      if (isRunningContinuous) {
        stopContinuousSimulation();
      }

      if (simulationData.length === 0) {
        // Just reset the display if no simulation has been run
        const partitionStr = partitionInput.value.trim();
        try {
          const partition = partitionStr.split(',').map(x => parseInt(x.trim()));
          if (!partition.some(isNaN)) {
            // Show initial partition
            youngDiagramContainer.innerHTML = '';
            cornersTable.innerHTML = '';
            renderInitialPartition(partition);
          }
        } catch (e) {
          console.error("Error parsing partition:", e);
        }
        return;
      }

      // Reset to first step of simulation
      currentStep = 0;
      displayStep(currentStep);
      progressIndicator.textContent = "Reset to step 1 of " + simulationData.length;
      setTimeout(() => {
        progressIndicator.textContent = '';
      }, 1500);
    }

    // Start monitoring progress
    function startProgressMonitoring() {
      progressIndicator.textContent = 'Processing... (0%)';
      progressInterval = setInterval(() => {
        try {
          const progress = getProgress();
          progressIndicator.textContent = `Processing... (${progress}%)`;

          if (progress >= 100) {
            clearInterval(progressInterval);
            progressIndicator.textContent = 'Processing complete!';

            // Clear the message after a delay
            setTimeout(() => {
              progressIndicator.textContent = '';
            }, 2000);
          }
        } catch (e) {
          console.error("Error in progress monitoring:", e);
          clearInterval(progressInterval);
        }
      }, 100);
    }

    // Stop monitoring progress
    function stopProgressMonitoring() {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    }

    // Display the current step of the simulation
    function displayStep(stepIndex) {
      if (!simulationData || stepIndex >= simulationData.length) return;

      const stepData = simulationData[stepIndex];
      const partition = stepData.partition;
      const bestCorner = stepData.bestCorner;
      const cornerScores = stepData.cornerScores;
      const fValues = stepData.fValues;

      // Render Young diagram
      renderYoungDiagram(partition, bestCorner, cornerScores.map(c => c.corner));

      // Render corners table
      renderCornersTable(cornerScores, fValues, bestCorner);
    }

    // Render the Young diagram
    function renderYoungDiagram(partition, bestCorner, addableCorners) {
      youngDiagramContainer.innerHTML = '';

      // Create a table for the Young diagram
      const table = document.createElement('table');
      table.className = 'young-diagram-table';

      // Determine maximum dimensions needed
      const rows = partition.length + 2;  // Add extra rows for potential new row
      const cols = (partition.length > 0 ? partition[0] : 0) + 2;  // Add extra column

      // Create the table
      for (let i = 0; i < rows; i++) {
        const row = document.createElement('tr');

        for (let j = 0; j < cols; j++) {
          const cell = document.createElement('td');
          cell.className = 'young-diagram-cell';

          // Determine if this cell is part of the Young diagram
          if (i < partition.length && j < partition[i]) {
            cell.classList.add('active');

            // Calculate and display hook length
            const hookLength = calculateHookLength(i, j, partition);
            cell.textContent = hookLength;
          }
          // Check if this is the best corner
          else if (i === bestCorner[0] && j === bestCorner[1]) {
            cell.classList.add('best-corner');
            cell.textContent = '+';
          }
          // Check if this is an addable corner
          else if (isAddableCorner(i, j, addableCorners)) {
            cell.classList.add('addable');
            cell.textContent = '+';
          }

          row.appendChild(cell);
        }

        table.appendChild(row);
      }

      youngDiagramContainer.appendChild(table);
    }

    // Check if a cell is an addable corner
    function isAddableCorner(row, col, corners) {
      return corners.some(corner => corner[0] === row && corner[1] === col);
    }

    // Calculate hook length for a cell
    function calculateHookLength(row, col, partition) {
      if (row >= partition.length || col >= partition[row]) return 0;

      // Calculate arm length (cells to the right)
      const armLength = partition[row] - col - 1;

      // Calculate leg length (cells below)
      let legLength = 0;
      for (let i = row + 1; i < partition.length; i++) {
        if (col < partition[i]) legLength++;
      }

      // Hook length = arm + leg + 1 (the cell itself)
      return armLength + legLength + 1;
    }

    // Render the corners table
    function renderCornersTable(cornerScores, fValues, bestCorner) {
      cornersTable.innerHTML = '';

      // Sort corners by score (highest first)
      const sortedCorners = [...cornerScores].sort((a, b) => b.score - a.score);

      // Create rows for each corner
      sortedCorners.forEach((item, index) => {
        const row = document.createElement('tr');

        // Highlight the best corner
        if (item.corner[0] === bestCorner[0] && item.corner[1] === bestCorner[1]) {
          row.classList.add('best-corner');
        }

        // Corner coordinates
        const cornerCell = document.createElement('td');
        cornerCell.textContent = `[${item.corner[0]}, ${item.corner[1]}]`;
        row.appendChild(cornerCell);

        // Score
        const scoreCell = document.createElement('td');
        scoreCell.textContent = item.score.toFixed(4);
        row.appendChild(scoreCell);

        // Find matching f value
        const fValueMatch = fValues.find(f =>
          f.corner[0] === item.corner[0] && f.corner[1] === item.corner[1]
        );

        // f(μ) value
        const fValueCell = document.createElement('td');
        if (fValueMatch) {
          // Handle different formats of fValue
          if (typeof fValueMatch.fValue === 'string') {
            // It's already a string (might be "NaN", "too large to compute", etc.)
            fValueCell.textContent = fValueMatch.fValue.replace(/"/g, ''); // Remove quotes if any
          } else if (isNaN(fValueMatch.fValue)) {
            // It's NaN
            fValueCell.textContent = 'Too large';
          } else {
            // It's a number
            try {
              fValueCell.textContent = parseFloat(fValueMatch.fValue).toFixed(2);
            } catch (e) {
              fValueCell.textContent = fValueMatch.fValue;
            }
          }
        } else {
          fValueCell.textContent = 'N/A';
        }
        row.appendChild(fValueCell);

        // Rank
        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        row.appendChild(rankCell);

        cornersTable.appendChild(row);
      });
    }

    // Initialize the UI with the starting partition
    logInfo("Initializing with starting partition");
    updatePartition();

    // Show a ready message
    progressIndicator.textContent = "Simulation ready. Click 'Simulate' to start/stop.";
    setTimeout(() => {
      progressIndicator.textContent = "";
    }, 3000);

    // Make sure simulation can be stopped if user navigates away
    window.addEventListener('beforeunload', function() {
      if (simulationTimer) {
        clearTimeout(simulationTimer);
      }
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    });

  } catch (error) {
    console.error("Error in initUI:", error);
    document.getElementById('progress-indicator').textContent =
        "Error initializing simulation. Please check the console for details.";
  }
}
</script>
