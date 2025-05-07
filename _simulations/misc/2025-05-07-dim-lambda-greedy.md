---
title: Greedy Plancherel Growth Algorithm for Young Diagrams
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-05-07-dim-lambda-greedy.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-05-07-dim-lambda-greedy.cpp'
    txt: 'C++ code for the simulation'
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

  /* Explanation box styling */
  .explanation-box {
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    padding: 15px;
    margin-top: 20px;
    border-radius: 5px;
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

<script src="{{site.url}}/js/2025-05-07-dim-lambda-greedy.js"></script>

This simulation demonstrates the **Greedy Plancherel Growth Algorithm**. At each step, the algorithm adds a box at the position that maximizes the dimension $f(\lambda)$ of the next diagram $\lambda$, which is computed using the hook-length formula.

The algorithm can be viewed as a deterministic greedy version of the Plancherel growth process, where the next box is selected to maximize $f(\mu)/f(\lambda)$ at each step, and not randomly.

<div id="simulation-container">
  <div class="controls-row">
    <label for="partition-input">Starting Partition (comma-separated):</label>
    <input type="text" id="partition-input" value="3,2,1" />
    <button id="update-btn" class="btn btn-primary">Update</button>
  </div>

  <div class="controls-row">
    <label for="steps-input">Number of Steps:</label>
    <input type="number" id="steps-input" value="10" min="1" max="50" />
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

  <div class="mt-4">
    <label>
      <input type="checkbox" id="show-explanation" />
      Show Explanation
    </label>

    <div id="explanation-box" class="explanation-box" style="display: none;">
      <h4>How the Algorithm Works</h4>
      <p>
        This algorithm implements a deterministic version of the complementary hook walk
        to find the box that maximizes f(μ) when added to shape λ.
      </p>
      <p>
        For each potential corner that can be added, we calculate a score based on:
      </p>
      <pre>score = ∏ d(K,σ) / ∏ d(K,σ̄)</pre>
      <ul>
        <li>d(K,σ) = distance between the potential corner K and each existing corner σ</li>
        <li>d(K,σ̄) = distance between K and other addable corners σ̄</li>
      </ul>
      <p>
        The corner with the highest score corresponds to the box that would maximize
        f(μ) when added to the current shape λ.
      </p>
      <p>
        The dimension f(λ) is calculated using the hook-length formula:
      </p>
      <pre>f(λ) = n! / ∏ hook lengths</pre>
      <p>
        A hook length for a cell is the number of cells directly below plus the number directly to the right plus one (for the cell itself).
      </p>
    </div>
  </div>
</div>

<script>
// Add extensive debug logging
console.log("Script starting - checking Module availability");

// Debug function
function dumpObject(obj, name) {
  console.log(`Dumping ${name}: ${typeof obj}`);
  if (obj) {
    console.log(`Keys: ${Object.keys(obj).join(', ')}`);
  } else {
    console.log(`${name} is null or undefined`);
  }
}

// Log initial Module state
dumpObject(window.Module, "window.Module before definition");

// Use a different approach with a global moduleConfig
window.moduleConfig = {
    onRuntimeInitialized: async function() {
      // Debug check for Module functions
      console.log("Runtime initialized, checking exported WASM functions");
      dumpObject(Module, "Module in onRuntimeInitialized");

      if (typeof Module.cwrap !== 'function') {
        console.error("Module.cwrap is not a function!", typeof Module.cwrap);
        alert("WebAssembly module not loaded correctly. See console for details.");
        return;
      }

      // Wrap exported functions (with try/catch)
      console.log("Wrapping WASM functions");
      let simulateGreedyHook, freeString, getProgress;

      try {
        simulateGreedyHook = Module.cwrap('simulateGreedyHook', 'number', ['string', 'number'], {async: true});
        console.log("simulateGreedyHook wrapped successfully:", typeof simulateGreedyHook);
      } catch (e) {
        console.error("Error wrapping simulateGreedyHook:", e);
        alert("Error loading WebAssembly function: simulateGreedyHook");
        return;
      }

      try {
        freeString = Module.cwrap('freeString', null, ['number']);
        console.log("freeString wrapped successfully:", typeof freeString);
      } catch (e) {
        console.error("Error wrapping freeString:", e);
        alert("Error loading WebAssembly function: freeString");
        return;
      }

      try {
        getProgress = Module.cwrap('getProgress', 'number', []);
        console.log("getProgress wrapped successfully:", typeof getProgress);
      } catch (e) {
        console.error("Error wrapping getProgress:", e);
        alert("Error loading WebAssembly function: getProgress");
        return;
      }

      // Elements
      const partitionInput = document.getElementById('partition-input');
      const stepsInput = document.getElementById('steps-input');
      const updateBtn = document.getElementById('update-btn');
      const simulateBtn = document.getElementById('simulate-btn');
      const stepBtn = document.getElementById('step-btn');
      const resetBtn = document.getElementById('reset-btn');
      const youngDiagramContainer = document.getElementById('young-diagram-container');
      const cornersTable = document.getElementById('corners-table').querySelector('tbody');
      const progressIndicator = document.getElementById('progress-indicator');
      const showExplanationCheckbox = document.getElementById('show-explanation');
      const explanationBox = document.getElementById('explanation-box');

      // State variables
      let simulationData = [];
      let currentStep = 0;
      let isProcessing = false;
      let progressInterval = null;

      // Initialize with default values
      updatePartition();

      // Event listeners
      updateBtn.addEventListener('click', updatePartition);
      simulateBtn.addEventListener('click', runSimulation);
      stepBtn.addEventListener('click', stepForward);
      resetBtn.addEventListener('click', resetSimulation);
      showExplanationCheckbox.addEventListener('change', toggleExplanation);

      // Toggle explanation visibility
      function toggleExplanation() {
        explanationBox.style.display = showExplanationCheckbox.checked ? 'block' : 'none';
      }

      // Update partition from input
      function updatePartition() {
        try {
          const partitionStr = partitionInput.value.trim();
          const partition = partitionStr.split(',').map(x => parseInt(x.trim()));

          // Validate partition
          if (partition.some(isNaN)) {
            alert('Invalid input: must be comma-separated integers');
            return;
          }

          // Check that it's a valid partition (non-increasing)
          for (let i = 1; i < partition.length; i++) {
            if (partition[i] > partition[i-1]) {
              alert('Invalid partition: row lengths must be non-increasing');
              return;
            }
          }

          // Reset and update with new partition
          resetSimulation();
        } catch (error) {
          alert('Invalid input: must be comma-separated integers');
        }
      }

      // Run the simulation
      async function runSimulation() {
        if (isProcessing) return;

        try {
          isProcessing = true;
          const partitionStr = partitionInput.value.trim();
          const steps = parseInt(stepsInput.value, 10);

          if (isNaN(steps) || steps < 1 || steps > 50) {
            alert('Number of steps must be between 1 and 50');
            isProcessing = false;
            return;
          }

          // Disable controls during processing
          updateBtn.disabled = true;
          simulateBtn.disabled = true;
          stepBtn.disabled = true;
          resetBtn.disabled = true;

          // Start progress monitoring
          startProgressMonitoring();

          // Run the simulation
          try {
            console.log("Calling simulateGreedyHook with params:", partitionStr, steps);

            // First check if function still exists
            if (typeof simulateGreedyHook !== 'function') {
              console.error("simulateGreedyHook is no longer a function:", typeof simulateGreedyHook);
              throw new Error("WebAssembly function lost: simulateGreedyHook");
            }

            // Call the WASM function with detailed logging
            console.time("simulateGreedyHook execution time");
            const resultPtr = await simulateGreedyHook(partitionStr, steps);
            console.timeEnd("simulateGreedyHook execution time");
            console.log("simulateGreedyHook returned pointer:", resultPtr);

            if (!resultPtr) {
              console.error("simulateGreedyHook returned null or 0 pointer");
              throw new Error("WebAssembly function returned null result");
            }

            console.log("Calling UTF8ToString on result pointer");
            const jsonStr = Module.UTF8ToString(resultPtr);
            console.log("Result string length:", jsonStr.length);
            console.log("Result string preview:", jsonStr.substring(0, 200) + "...");

            console.log("Freeing result pointer");
            freeString(resultPtr);

            // Parse the results
            console.log("Parsing JSON result");
            simulationData = JSON.parse(jsonStr);
            console.log("Parsed JSON data length:", simulationData.length);
            currentStep = 0;

            // Display the first step
            console.log("Displaying first step");
            displayStep(currentStep);
          } catch (error) {
            console.error('Simulation error:', error);
            alert('Error running simulation: ' + error.message);
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
          console.error('Error:', error);
          alert('An error occurred: ' + error.message);
          isProcessing = false;

          // Re-enable controls
          updateBtn.disabled = false;
          simulateBtn.disabled = false;
          stepBtn.disabled = false;
          resetBtn.disabled = false;

          stopProgressMonitoring();
        }
      }

      // Step forward in the simulation
      function stepForward() {
        if (currentStep < simulationData.length - 1) {
          currentStep++;
          displayStep(currentStep);
        }
      }

      // Reset simulation
      function resetSimulation() {
        currentStep = 0;

        if (simulationData.length > 0) {
          displayStep(currentStep);
        } else {
          // Clear the display if no data
          youngDiagramContainer.innerHTML = '';
          cornersTable.innerHTML = '';
        }
      }

      // Start monitoring progress
      function startProgressMonitoring() {
        progressIndicator.textContent = 'Processing... (0%)';
        progressInterval = setInterval(() => {
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
          fValueCell.textContent = fValueMatch ? fValueMatch.fValue.toFixed(2) : 'N/A';
          row.appendChild(fValueCell);

          // Rank
          const rankCell = document.createElement('td');
          rankCell.textContent = index + 1;
          row.appendChild(rankCell);

          cornersTable.appendChild(row);
        });
      }

      // Run an initial simulation with the default values
      runSimulation();
    }
  };
}

// Add event listener for when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded - checking Module status");
  dumpObject(window.Module, "window.Module after DOMContentLoaded");

  // If Module exists, use setTimeout to wait for it to be fully initialized
  if (window.Module) {
    console.log("Module exists, waiting for it to be fully initialized");
    setTimeout(function() {
      console.log("Checking if Module is ready");
      dumpObject(window.Module, "window.Module after timeout");

      // If onRuntimeInitialized hasn't been called yet, replace it with our version
      if (typeof window.Module.onRuntimeInitialized === 'function') {
        const originalCallback = window.Module.onRuntimeInitialized;
        console.log("Found existing onRuntimeInitialized, wrapping it");

        window.Module.onRuntimeInitialized = function() {
          console.log("Runtime initialized - calling original callback");
          originalCallback();
          console.log("Original callback complete - calling our moduleConfig callback");
          window.moduleConfig.onRuntimeInitialized();
        };
      } else {
        console.log("Setting onRuntimeInitialized from moduleConfig");
        window.Module.onRuntimeInitialized = window.moduleConfig.onRuntimeInitialized;
      }
    }, 500); // Wait 500ms for Module to be ready
  } else {
    console.log("Module not found, setting window.Module = window.moduleConfig");
    window.Module = window.moduleConfig;
  }
});

// Add a timeout as a fallback to check Module status
setTimeout(function() {
  console.log("Fallback timeout checking Module status");
  dumpObject(window.Module, "window.Module after fallback timeout");

  // Check if we need to apply our moduleConfig
  if (window.Module && !window.Module._appliedConfig) {
    console.log("Applying moduleConfig in fallback");
    window.Module._appliedConfig = true;

    if (typeof window.Module.onRuntimeInitialized === 'function' &&
        window.Module.onRuntimeInitialized !== window.moduleConfig.onRuntimeInitialized) {
      const originalCallback = window.Module.onRuntimeInitialized;
      window.Module.onRuntimeInitialized = function() {
        console.log("Runtime initialized in fallback - calling original callback");
        originalCallback();
        console.log("Original callback complete in fallback - calling our moduleConfig callback");
        window.moduleConfig.onRuntimeInitialized();
      };
    } else {
      window.Module.onRuntimeInitialized = window.moduleConfig.onRuntimeInitialized;
    }
  }
}, 2000); // Wait 2 seconds as a fallback
</script>
