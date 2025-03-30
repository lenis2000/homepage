---
title: 3D Height Function of Domino tilings of the Aztec diamond
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-30-aztec-uniform-3d.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-03-30-aztec-uniform-3d.cpp'
    txt: 'C++ code for the simulation'
---

<script src="{{site.url}}/js/d3.v7.min.js"></script>
<script src="/js/2025-03-30-aztec-uniform-3d.js"></script>

This simulation demonstrates random domino tilings of an <a href="https://mathworld.wolfram.com/AztecDiamond.html">Aztec diamond</a>, which is a diamond-shaped union of unit squares. The simulation uses a uniform measure to generate random tilings via the <a href="https://arxiv.org/abs/math/0111034">shuffling algorithm</a>. The original python code was created by <a href="https://www.durham.ac.uk/staff/sunil-chhita/">Sunil Chhita</a>; this version is adapted for <code>JS</code> + <code>WebAssembly</code>.

The sampler works in your browser. Up to $n \sim 120$ it works in reasonable time, but for larger $n$ it may take a while.
I set the upper bound at $n=300$ to avoid freezing your browser.

<!-- Controls to change n -->
<div style="margin-bottom: 10px;">
  <label for="n-input">Aztec Diamond Order ($n\le 300$): </label>
  <input id="n-input" type="number" value="20" min="2" step="2" max="300" size="3">
  <button id="update-btn">Update</button>
</div>

<!-- Progress indicator (polling progress from the C++ code via getProgress) -->
<div id="progress-indicator" style="margin-bottom: 10px; font-weight: bold;"></div>

<script>
Module.onRuntimeInitialized = async function() {
  // Wrap exported functions asynchronously.
  const simulateAztec = Module.cwrap('simulateAztec', 'number', ['number'], {async: true});
  const freeString = Module.cwrap('freeString', null, ['number']);
  const getProgress = Module.cwrap('getProgress', 'number', []);

  const progressElem = document.getElementById("progress-indicator");
  let progressInterval;

  // Start polling the progress counter from C++.
  function startProgressPolling() {
    progressElem.innerText = "Sampling... (0%)";
    progressInterval = setInterval(() => {
      const progress = getProgress();
      progressElem.innerText = "Sampling... (" + progress + "%)";
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);
  }

  // Run the simulation for a given n and output JSON to console
  async function runSimulation(n) {
    // Start the progress indicator
    startProgressPolling();

    // Await the asynchronous simulation
    const ptr = await simulateAztec(n);
    const jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);

    try {
      // Parse JSON to validate it
      const data = JSON.parse(jsonStr);

      // Output to console
      console.log("Domino Tiling Simulation JSON:");
      console.log(jsonStr);

      // Log the number of dominoes and heights for verification
      if (data.dominoes) {
        console.log(`Number of dominoes: ${data.dominoes.length}`);
      }

      if (data.heights) {
        console.log(`Number of height vertices: ${data.heights.length}`);
      }

      // Clear progress indicator once done
      progressElem.innerText = "Simulation complete. Check the browser console for JSON output.";
    } catch (e) {
      console.error("Error parsing JSON:", e);
      progressElem.innerText = "Error during simulation";
      clearInterval(progressInterval);
    }
  }

  // Setup the update button
  document.getElementById("update-btn").addEventListener("click", () => {
    const inputField = document.getElementById("n-input");
    const n = parseInt(inputField.value, 10);

    // Check for a valid positive even number
    if (isNaN(n) || n < 2) {
      alert("Please enter a valid positive even number for n (n ≥ 2).");
      return;
    }
    if (n % 2 !== 0) {
      alert("Please enter an even number for n.");
      return;
    }
    if (n > 300) {
      alert("Please enter a number no greater than 300.");
      return;
    }

    // Run the simulation and output to console
    runSimulation(n);
  });

  // Run an initial simulation with n=20 (smaller default for faster testing)
  const initialN = parseInt(document.getElementById("n-input").value, 10);
  runSimulation(initialN);
};
</script>
