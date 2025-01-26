---
title: Simulation of random permutations from arbitrary reduced words
model: permutations
author: "Leonid Petrov"
code:
    - link: "https://github.com/lenis2000/homepage/blob/master/_simulations/permutations/2025-01-26-Grothendieck-shenanigans-any-shape.md"
      txt: "This simulation is interactive, written in JavaScript, see the source code of this page at the link"
---

<div class="container mt-4 mb-3" style="overflow: visible">
    <p>
        This page simulates random permutations arising from nonsymmetric
        Grothendieck polynomials. For more details, see our paper
        <a href="{{site.url}}/2024/07/Grothendieck-shenanigans/">[45]</a>. Here
        we allow arbitrary reduced words, not just the staircase one.
    </p>

    <div class="container">
        <h1>Grothendieck Simulation – Parity on User-Drawn</h1>

        <div class="flexRow">
            <!-- ====================== Left: Controls ====================== -->
            <div class="controlsBox">
                <p>
                    1) Choose boundary type.<br />
                    2) “Draw Shape” (N=100).<br />
                    3) Set N, p, q → “Run Simulation”.
                </p>

                <!-- Boundary condition dropdown -->
                <label><strong>Boundary Condition:</strong></label
                ><br />
                <select id="boundarySelect">
                    <option value="staircase">Staircase</option>
                    <option value="shaep">Quadratic (Crab)</option>
                    <option value="userdrawn">User-Drawn (Brush)</option>
                </select>

                <div class="buttonRow">
                    <button id="drawShapeBtn">Draw Shape (N=100)</button>
                    <button id="runSimBtn">Run Simulation</button>
                </div>

                <!-- userdrawn controls -->
                <p id="drawnNote" class="labelSmall" style="display: none">
                    <strong>Brush usage:</strong><br />
                    - Left‐drag to paint or erase<br />
                    - “Clear All” / “Fill All” resets entire shape
                </p>
                <div class="buttonRow" id="drawTools" style="display: none">
                    <button id="clearAllBtn">Clear All</button>
                    <button id="fillAllBtn">Fill All</button>
                </div>
                <div id="modeDiv" style="display: none; margin-top: 0.5em">
                    <label><strong>Mode:</strong></label
                    ><br />
                    <input
                        type="radio"
                        name="drawMode"
                        id="drawModePaint"
                        value="paint"
                        checked
                    />
                    <label for="drawModePaint">Paint</label>
                    <input
                        type="radio"
                        name="drawMode"
                        id="drawModeErase"
                        value="erase"
                    />
                    <label for="drawModeErase">Erase</label>
                </div>
                <div id="brushDiv" class="brushLabel" style="display: none">
                    <label
                        ><strong>Brush Size:</strong>
                        <span id="brushVal">1</span> </label
                    ><br />
                    <input
                        id="brushSizeSlider"
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value="1"
                        style="width: 120px"
                    />
                </div>

                <!-- N, p, q, parity -->
                <div style="margin-top: 1em">
                    <label
                        ><strong>N (for Simulation):</strong>
                        <span id="nVal">1000</span> </label
                    ><br />
                    <input
                        id="nSlider"
                        type="range"
                        min="100"
                        max="12000"
                        step="100"
                        value="1000"
                        style="width: 120px"
                    />

                    <div style="margin-top: 0.5em">
                        <label
                            ><strong>p:</strong>
                            <span id="probVal">0.50</span></label
                        ><br />
                        <input
                            id="probInput"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value="0.50"
                            style="width: 120px"
                        />
                    </div>

                    <div style="margin-top: 0.5em">
                        <label
                            ><strong>q:</strong>
                            <span id="qVal">0.00</span></label
                        ><br />
                        <input
                            id="qInput"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value="0.00"
                            style="width: 120px"
                        />
                    </div>

                    <!-- Parity condition checkbox -->
                    <div style="margin-top: 0.8em">
                        <label>
                            <input type="checkbox" id="parityCheck" checked />
                            Use Parity Condition?
                        </label>
                    </div>
                </div>
            </div>
            <!-- .controlsBox -->

            <!-- ====================== Right: shape at N=100 ====================== -->
            <div class="shapeBox">
                <h3 style="margin-top: 0">Shape at N=100</h3>
                <p class="labelSmall">
                    Grid: t=1..197 (vertical), i=1..100 (horizontal)
                </p>
                <svg id="shapeSVG" preserveAspectRatio="xMidYMid meet"></svg>
            </div>
            <!-- .shapeBox -->
        </div>
        <!-- .flexRow -->

        <!-- Tooltip -->
        <div id="tooltip" class="tooltip"></div>

        <!-- ====================== Final Permutation ====================== -->
        <h2>Permutation (N × N)</h2>
        <svg id="permSVG" preserveAspectRatio="xMidYMid meet"></svg>
    </div>
    <!-- .container -->

    <!-- Load D3 from a CDN (can also use local version if desired) -->
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <script>
        // ----------------------------------------
        // 1) Global data structures
        // ----------------------------------------
        const T_MAX_100 = 197; // 2*100 - 3
        const I_MAX_100 = 100;
        let userShapeMatrix = [];
        let cellMap = [];

        // Initialize user shape array [t][i] => boolean
        function initUserShapeMatrix() {
            userShapeMatrix = [];
            for (let t = 0; t < T_MAX_100; t++) {
                userShapeMatrix.push(new Array(I_MAX_100).fill(false));
            }
        }
        initUserShapeMatrix();

        // ----------------------------------------
        // 2) Boundary condition helpers
        //    (staircase / shaep) + parity
        // ----------------------------------------
        function isStaircase(t, i, N) {
            const useParity = document.getElementById("parityCheck").checked;
            let cond = t + i >= N && t - i <= N - 2;
            if (useParity) {
                cond = cond && (t - i + N) % 2 === 0;
            }
            return cond;
        }
        function isShaep(t, i, N) {
            const useParity = document.getElementById("parityCheck").checked;
            const k = Math.floor((i * i) / 20);
            let cond = t + k >= N && t - k <= N - 2;
            if (useParity) {
                cond = cond && (t - i + N) % 2 === 0;
            }
            return cond;
        }

        // ----------------------------------------
        // 3) User-drawn boundary + parity
        //    NOTE: We also check parity if box is checked
        // ----------------------------------------
        function isUserDrawnActive(t, i, N) {
            const s = N / 100;
            const tSmall = Math.floor((t - 1) / s) + 1;
            const iSmall = Math.floor((i - 1) / s) + 1;
            if (tSmall < 1 || tSmall > T_MAX_100) return false;
            if (iSmall < 1 || iSmall > I_MAX_100) return false;

            const drawnOn = userShapeMatrix[tSmall - 1][iSmall - 1];
            const useParity = document.getElementById("parityCheck").checked;
            if (!drawnOn) return false;

            // If parity is checked, require (t - i + N) % 2 === 0
            if (useParity) {
                return (t - i + N) % 2 === 0;
            } else {
                return true;
            }
        }

        // ----------------------------------------
        // 4) "Draw Shape" for N=100
        // ----------------------------------------
        function drawShape() {
            const boundary = document.getElementById("boundarySelect").value;
            if (boundary === "staircase") {
                for (let t = 1; t <= T_MAX_100; t++) {
                    for (let i = 1; i <= I_MAX_100; i++) {
                        userShapeMatrix[t - 1][i - 1] = isStaircase(t, i, 100);
                    }
                }
            } else if (boundary === "shaep") {
                for (let t = 1; t <= T_MAX_100; t++) {
                    for (let i = 1; i <= I_MAX_100; i++) {
                        userShapeMatrix[t - 1][i - 1] = isShaep(t, i, 100);
                    }
                }
            }
            // "userdrawn" => do nothing; keep user painting
            renderShapeSVG(boundary);
        }

        // ----------------------------------------
        // 5) Render shape at N=100
        // ----------------------------------------
        let isPainting = false;
        function renderShapeSVG(boundary) {
            const svg = d3.select("#shapeSVG");
            svg.selectAll("*").remove();

            cellMap = Array.from(
                { length: T_MAX_100 },
                () => new Array(I_MAX_100),
            );

            const cellW = 3,
                cellH = 3;
            svg.attr("viewBox", [0, 0, I_MAX_100 * cellW, T_MAX_100 * cellH]);

            const rectData = [];
            for (let t = 1; t <= T_MAX_100; t++) {
                for (let i = 1; i <= I_MAX_100; i++) {
                    rectData.push({
                        t,
                        i,
                        active: userShapeMatrix[t - 1][i - 1],
                    });
                }
            }

            const tooltip = d3.select("#tooltip");
            svg.selectAll("rect")
                .data(rectData)
                .join("rect")
                .attr("x", (d) => (d.i - 1) * cellW)
                .attr("y", (d) => (d.t - 1) * cellH)
                .attr("width", cellW)
                .attr("height", cellH)
                .attr("fill", (d) => (d.active ? "red" : "white"))
                .attr("stroke", "#999")
                .attr("stroke-width", 0.3)
                .each(function (d) {
                    cellMap[d.t - 1][d.i - 1] = this;
                })
                .on("mouseover", (evt, d) => {
                    tooltip
                        .style("opacity", 1)
                        .style("left", evt.pageX + 10 + "px")
                        .style("top", evt.pageY + 10 + "px")
                        .html(`t=${d.t}, i=${d.i}, active=${d.active}`);
                    if (isPainting && boundary === "userdrawn") {
                        paintOrEraseBrush(d);
                    }
                })
                .on("mousemove", (evt) => {
                    tooltip
                        .style("left", evt.pageX + 10 + "px")
                        .style("top", evt.pageY + 10 + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("opacity", 0);
                })
                .on("mousedown", (evt, d) => {
                    evt.preventDefault();
                    if (boundary === "userdrawn") {
                        isPainting = true;
                        paintOrEraseBrush(d);
                    }
                });

            svg.on("mouseup", () => {
                isPainting = false;
            });
            svg.on("mouseleave", () => {
                isPainting = false;
            });
        }

        function paintOrEraseBrush(cellData) {
            const brushSize = +document.getElementById("brushSizeSlider").value;
            const paintMode = document.getElementById("drawModePaint").checked;
            const newVal = paintMode;

            const tCenter = cellData.t - 1;
            const iCenter = cellData.i - 1;
            for (let dt = -brushSize; dt <= brushSize; dt++) {
                for (let di = -brushSize; di <= brushSize; di++) {
                    const tt = tCenter + dt;
                    const ii = iCenter + di;
                    if (
                        tt >= 0 &&
                        tt < T_MAX_100 &&
                        ii >= 0 &&
                        ii < I_MAX_100
                    ) {
                        userShapeMatrix[tt][ii] = newVal;
                        d3.select(cellMap[tt][ii]).attr(
                            "fill",
                            newVal ? "red" : "white",
                        );
                    }
                }
            }
        }

        // ----------------------------------------
        // 6) Clear/Fill user-drawn
        // ----------------------------------------
        function clearAllUserDrawn() {
            for (let t = 0; t < T_MAX_100; t++) {
                for (let i = 0; i < I_MAX_100; i++) {
                    userShapeMatrix[t][i] = false;
                }
            }
        }
        function fillAllUserDrawn() {
            for (let t = 0; t < T_MAX_100; t++) {
                for (let i = 0; i < I_MAX_100; i++) {
                    userShapeMatrix[t][i] = true;
                }
            }
        }

        // ----------------------------------------
        // 7) Grothendieck simulation
        // ----------------------------------------
        function generateSwaps(t, N, swaps, boundary) {
            for (let i = 1; i < N; i++) {
                let active = false;
                if (boundary === "staircase") {
                    active = isStaircase(t, i, N);
                } else if (boundary === "shaep") {
                    active = isShaep(t, i, N);
                } else {
                    // user-drawn + parity
                    active = isUserDrawnActive(t, i, N);
                }
                swaps[i - 1] = active ? 1 : 0;
            }
        }

        function applyRandomSwap(sigma, swaps, N, p, q) {
            for (let i = 0; i < N - 1; i++) {
                if (swaps[i] === 1) {
                    // upward
                    if (sigma[i] < sigma[i + 1] && Math.random() < p) {
                        [sigma[i], sigma[i + 1]] = [sigma[i + 1], sigma[i]];
                        continue;
                    }
                    // downward
                    if (sigma[i] > sigma[i + 1] && Math.random() < p * q) {
                        [sigma[i], sigma[i + 1]] = [sigma[i + 1], sigma[i]];
                        continue;
                    }
                }
            }
        }

        function runSimulation(N, p, q, boundary) {
            const sigma = Array.from({ length: N }, (_, idx) => idx + 1);
            const swaps = new Array(N - 1).fill(0);
            const T_MAX = 2 * N - 3;
            for (let t = 1; t <= T_MAX; t++) {
                generateSwaps(t, N, swaps, boundary);
                applyRandomSwap(sigma, swaps, N, p, q);
            }
            return sigma;
        }

        // ----------------------------------------
        // 8) Draw final permutation
        // ----------------------------------------
        function drawPermutationMatrix(sigma) {
            const svg = d3.select("#permSVG");
            svg.selectAll("*").remove();

            const N = sigma.length;
            const margin = 30,
                chartSize = 600;
            svg.attr("viewBox", [
                0,
                0,
                chartSize + margin * 2,
                chartSize + margin * 2,
            ]);

            const xScale = d3
                .scaleLinear()
                .domain([-0.5, N - 0.5])
                .range([margin, margin + chartSize]);
            const yScale = d3
                .scaleLinear()
                .domain([-0.5, N - 0.5])
                .range([margin, margin + chartSize]);

            const radius = N > 2000 ? 1 : 2;
            const data = sigma.map((val, i) => ({ row: i, col: val - 1 }));

            const tooltip = d3.select("#tooltip");
            svg.selectAll("circle")
                .data(data)
                .join("circle")
                .attr("cx", (d) => xScale(d.row))
                .attr("cy", (d) => yScale(d.col))
                .attr("r", radius)
                .attr("fill", "steelblue")
                .on("mouseover", (evt, d) => {
                    tooltip
                        .style("opacity", 1)
                        .style("left", evt.pageX + 10 + "px")
                        .style("top", evt.pageY + 10 + "px")
                        .html(`i=${d.row}, σ[i]=${d.col + 1}`);
                })
                .on("mousemove", (evt) => {
                    tooltip
                        .style("left", evt.pageX + 10 + "px")
                        .style("top", evt.pageY + 10 + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("opacity", 0);
                });
        }

        // ----------------------------------------
        // 9) Wire up UI
        // ----------------------------------------
        function initUI() {
            // boundary => show/hide userdrawn UI
            document
                .getElementById("boundarySelect")
                .addEventListener("change", (e) => {
                    const val = e.target.value;
                    document.getElementById("drawnNote").style.display =
                        val === "userdrawn" ? "block" : "none";
                    document.getElementById("drawTools").style.display =
                        val === "userdrawn" ? "flex" : "none";
                    document.getElementById("brushDiv").style.display =
                        val === "userdrawn" ? "block" : "none";
                    document.getElementById("modeDiv").style.display =
                        val === "userdrawn" ? "block" : "none";
                });

            // Brush size
            document
                .getElementById("brushSizeSlider")
                .addEventListener("input", (e) => {
                    document.getElementById("brushVal").textContent =
                        e.target.value;
                });

            // N slider
            document
                .getElementById("nSlider")
                .addEventListener("input", (e) => {
                    document.getElementById("nVal").textContent =
                        e.target.value;
                });

            // p, q sliders
            document
                .getElementById("probInput")
                .addEventListener("input", (e) => {
                    document.getElementById("probVal").textContent = parseFloat(
                        e.target.value,
                    ).toFixed(2);
                });
            document.getElementById("qInput").addEventListener("input", (e) => {
                document.getElementById("qVal").textContent = parseFloat(
                    e.target.value,
                ).toFixed(2);
            });

            // Draw shape
            document
                .getElementById("drawShapeBtn")
                .addEventListener("click", () => {
                    drawShape();
                });

            // Run simulation
            document
                .getElementById("runSimBtn")
                .addEventListener("click", () => {
                    const boundary =
                        document.getElementById("boundarySelect").value;
                    const N = +document.getElementById("nSlider").value;
                    const p = +document.getElementById("probInput").value;
                    const q = +document.getElementById("qInput").value;

                    const sigma = runSimulation(N, p, q, boundary);
                    drawPermutationMatrix(sigma);
                });

            // Clear / Fill
            document
                .getElementById("clearAllBtn")
                .addEventListener("click", () => {
                    clearAllUserDrawn();
                    renderShapeSVG("userdrawn");
                });
            document
                .getElementById("fillAllBtn")
                .addEventListener("click", () => {
                    fillAllUserDrawn();
                    renderShapeSVG("userdrawn");
                });
        }

        // ----------------------------------------
        // 10) On page load
        // ----------------------------------------
        window.addEventListener("DOMContentLoaded", () => {
            initUI();
            // Hide userdrawn UI by default
            document.getElementById("drawnNote").style.display = "none";
            document.getElementById("drawTools").style.display = "none";
            document.getElementById("brushDiv").style.display = "none";
            document.getElementById("modeDiv").style.display = "none";

            // Init numeric labels
            document.getElementById("nVal").textContent = "1000";
            document.getElementById("probVal").textContent = "0.50";
            document.getElementById("qVal").textContent = "0.00";
            document.getElementById("brushVal").textContent = "1";
        });
    </script>
</div>
