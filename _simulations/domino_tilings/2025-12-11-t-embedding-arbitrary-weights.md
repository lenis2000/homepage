---
title: T-embeddings of the Aztec diamond with arbitrary weights
model: domino-tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.md'
    txt: 'JavaScript implementation'
  - link: 'https://github.com/lenis2000/homepage/blob/master/_simulations/domino_tilings/2025-12-11-t-embedding-arbitrary-weights.cpp'
    txt: 'C++ source (WASM)'
---

<details style="margin-bottom: 15px;">
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #fff8e8; border: 1px solid #d4a017;">About this simulation</summary>
  <div style="margin-top: 10px; padding: 15px; background: #fff; border: 1px solid #ddd; font-size: 14px; line-height: 1.6;">

<p>This simulation computes and visualizes <strong>perfect T-embeddings</strong> of the Aztec diamond graph with arbitrary edge weights. For the mathematical definitions and recurrence formulas, see the <em>"Perfect T-embeddings and their computation"</em> section below.</p>

<h5>Controls</h5>
<ul>
  <li><strong>n</strong>: Size of the Aztec diamond (number of domino rows). Values above 60 may take noticeable time.</li>
  <li><strong>Weights</strong>: Select a weight preset (see below for details).</li>
  <li><strong>Compute</strong>: Runs the T-embedding recurrence with the current parameters.</li>
</ul>

<h5>Weight Presets</h5>
<ol>
  <li><strong>Uniform</strong>: All edge weights equal 1 (the classical uniformly weighted Aztec diamond). Computation is faster because all coefficients are 1, so the folding phase is skipped.</li>
  <li><strong>i.i.d. random</strong>: Independent identically distributed random edge weights. Choose a distribution:
    <ul>
      <li><em>Uniform [a, b]</em>: Uniformly distributed on interval [a, b].</li>
      <li><em>Exponential (λ)</em>: Exponential distribution with rate λ.</li>
      <li><em>Pareto (α, x_min)</em>: Pareto distribution with shape α and scale x_min.</li>
      <li><em>Geometric (p)</em>: Geometric distribution with success probability p (integer-valued).</li>
    </ul>
  </li>
  <li><strong>Gamma i.i.d.</strong>: Edge weights drawn from Gamma(α, β) distribution.</li>
  <li><strong>Layered</strong>: Layered (row-dependent) weights with 5 regimes:
    <ul>
      <li><em>Regime 1 (Critical Scaling)</em>: Weights vary as Val1 + 2/√n or Val2 − 1/√n with given probabilities.</li>
      <li><em>Regime 2 (Rare Event Scaling)</em>: Weight = Val1 with probability 1/√n, otherwise Val2.</li>
      <li><em>Regime 3 (Bernoulli)</em>: Weight = Val1 (prob p₁) or Val2 (prob p₂). Default regime.</li>
      <li><em>Regime 4 (Deterministic Periodic)</em>: Alternates between w₁ and w₂ by row.</li>
      <li><em>Regime 5 (Continuous Uniform)</em>: Weights uniform on [a, b], varying by row.</li>
    </ul>
  </li>
  <li><strong>Periodic (k×l)</strong>: k-by-l periodic pattern of face weights. Opens an editor to set individual weights.</li>
</ol>

<h5>Main Visualization</h5>
<ul>
  <li><strong>2D/3D toggle</strong>: Switch between 2D T-embedding view and 3D origami surface view.</li>
  <li><strong>V / E sliders</strong>: Adjust vertex size and edge thickness.</li>
  <li><strong>Origami checkbox</strong>: Show/hide the origami map overlay (2D mode only).</li>
  <li><strong>Zoom buttons</strong>: +, −, and reset (⟲) for zooming the canvas.</li>
  <li><strong>Mouse/touch controls</strong>:
    <ul>
      <li>2D: Drag to pan, scroll/pinch to zoom.</li>
      <li>3D: Drag to rotate, Cmd/Ctrl+drag to pan, scroll/pinch to zoom.</li>
    </ul>
  </li>
</ul>

<h5>3D Mode Options</h5>
<ul>
  <li><strong>Re(Origami) / Im(Origami), matched</strong>: Select which surface(s) to display. When both are shown, they are rendered together with depth sorting. The Im surface is transformed to match the Re surface at boundary corners.</li>
  <li><strong>Projection toggle (🎯)</strong>: Switch between orthographic and perspective projection.</li>
  <li><strong>Preset cycle (☀️)</strong>: Cycle through visual presets (lighting, colors).</li>
  <li><strong>Auto-rotate (🔄)</strong>: Enable continuous rotation animation.</li>
</ul>

<h5>Export Options</h5>
<ul>
  <li><strong>PDF</strong>: Vector export of the T-embedding. Optional origami overlay checkbox.</li>
  <li><strong>PNG</strong>: Raster image export with quality slider (1–100).</li>
  <li><strong>OBJ</strong>: 3D mesh export for external 3D viewers/software.</li>
</ul>

<h5>Step-by-Step Visualization (n ≤ 15)</h5>
<p>For small n, explore the T-embedding recurrence level by level:</p>
<ul>
  <li><strong>Left panel (Aztec diamond graph)</strong>: Shows the weighted bipartite graph. Arrow buttons (« ← → ») navigate between steps of the domino shuffling / urban renewal. Toggle edge weights (E wts) and face weights (F wts). Click on vertices or edges for details.</li>
  <li><strong>Right panel (T-embedding)</strong>: Shows the T-embedding at level k. Buttons (← →) step through the recurrence. Toggle vertex labels with the Labels checkbox.</li>
</ul>

<h5>Mathematica Verification (n ≤ 15)</h5>
<p>For small n, this section provides:</p>
<ul>
  <li><strong>α/β parameters</strong>: The computed boundary parameters at each level.</li>
  <li><strong>T coordinates</strong>: The explicit T-embedding coordinates in Mathematica format.</li>
  <li><strong>XX Verification</strong>: Checks that each interior white vertex satisfies the face weight formula. Green = passed, red = numerical discrepancy.</li>
</ul>

<h5>T-embedding Performance Benchmark</h5>
<p>Measures computation time for n = 10 to 40 and fits a power law t(n) = c·n<sup>α</sup>. Uses the currently selected weight preset.</p>

  </div>
</details>

<details style="margin-bottom: 15px;">
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #f0f8ff; border: 1px solid #9cf;">Perfect T-embeddings and their computation</summary>
  <div style="margin-top: 10px; padding: 15px; background: #fff; border: 1px solid #ddd; font-size: 14px; line-height: 1.6;">

<p>The notion of a <em>t-embedding</em> (also known as a <em>Coulomb gauge</em>) was introduced in
<a href="https://arxiv.org/abs/1810.05616">[KLRR]</a> and further developed in
<a href="https://arxiv.org/abs/2001.11871">[CLR1]</a>, <a href="https://arxiv.org/abs/2109.06272">[CLR2]</a>.</p>

<h5>Definition (T-embedding)</h5>
<p>Let $\mathcal{G}$ be a weighted, finite, bipartite, planar graph with a marked outer face $f_{\mathrm{out}}$,
and let $\mathcal{G}^*$ denote its <em>augmented dual graph</em>. A <strong>t-embedding</strong> of $\mathcal{G}$ is an
embedding $\mathcal{T}: \mathcal{G}^* \to \mathbb{C}$ such that:</p>
<ol type="a">
  <li>$\mathcal{T}$ is a proper embedding: edges are non-degenerate straight segments, inner faces are convex and do not overlap;</li>
  <li><strong>Angle condition:</strong> For each inner vertex $v^*$ of $\mathcal{T}(\mathcal{G}^*)$, the sum of angles at corners corresponding to black faces equals $\pi$ (and similarly for white faces);</li>
  <li><strong>Weight condition:</strong> For each inner face $f$ of $\mathcal{G}$ with face weight $X_f$, if $v^*$ denotes the corresponding dual vertex with neighbors $v^*_1, \ldots, v^*_{2d}$ listed in counterclockwise order, then
    $$X_f = (-1)^{d+1} \prod_{k=1}^d \frac{\mathcal{T}(v^*) - \mathcal{T}(v^*_{2k-1})}{\mathcal{T}(v^*_{2k}) - \mathcal{T}(v^*)}.$$
  </li>
</ol>

<h5>Definition (Perfect T-embedding) <a href="https://arxiv.org/abs/2109.06272">[CLR2]</a></h5>
<p>A t-embedding $\mathcal{T}$ of a finite weighted planar bipartite graph $\mathcal{G}$ is called
<strong>perfect</strong> if the following additional boundary conditions are satisfied:</p>
<ol type="i">
  <li>The outer face of $\mathcal{T}(\mathcal{G}^*)$ is a <em>tangential polygon</em>, i.e., it admits an inscribed circle;</li>
  <li>For each outer vertex $v_k$ of $\mathcal{G}^*$, the edge connecting $v_k$ to its unique inner neighbor $v_{\mathrm{in},k}$ lies on the <em>angle bisector</em> of the corresponding corner of the tangential polygon. Equivalently, the line containing this edge passes through the center of the inscribed circle.</li>
</ol>

<h5>Definition (Face weight)</h5>
<p>Given edge weights $\chi$ on a bipartite graph $\mathcal{G}$, one can associate a <strong>face weight</strong> $X_{v^*}$ to each face of $\mathcal{G}$ by
$$X_{v^*}:=\prod_{s=1}^d\frac{\chi_{b_s w_s}}{\chi_{b_s w_{s+1}}},$$
where the face $v^*$ has degree $2d$ with vertices denoted by $w_1, b_1, \ldots , w_d, b_d$ in counterclockwise order (white vertices $w_i$, black vertices $b_i$, and $w_{d+1}:=w_1$).</p>

<h5>Recurrence algorithm for computing $\mathcal{T}_k$</h5>
<p>The T-embedding $\mathcal{T}$ of the Aztec diamond of size $n$ is computed iteratively as a sequence of embeddings $\mathcal{T}_0, \mathcal{T}_1, \ldots, \mathcal{T}_{n-2}$, where $\mathcal{T}_k$ has vertices at integer points $(i,j)$ with $|i|+|j| \leq k+1$.</p>

<p><strong>Base case ($k=0$):</strong> The initial embedding $\mathcal{T}_0$ has 5 vertices:</p>
$$\mathcal{T}_0(0,0) = 0, \quad \mathcal{T}_0(\pm 1, 0) = \pm 1, \quad \mathcal{T}_0(0, \pm 1) = \pm \frac{i}{\sqrt{X_{\mathrm{root}}}}$$
<p>where $X_{\mathrm{root}}$ is the face weight of the central (root) face.</p>

<p><strong>Recurrence ($k \geq 1$):</strong> Given $\mathcal{T}_{k-1}$, compute $\mathcal{T}_k$ using the following rules:</p>

<ol>
<li><strong>External corners</strong> (vertices at distance $k+1$ from origin, on axes):
$$\mathcal{T}_k(\pm(k+1), 0) = \mathcal{T}_{k-1}(\pm k, 0), \qquad \mathcal{T}_k(0, \pm(k+1)) = \mathcal{T}_{k-1}(0, \pm k)$$
</li>

<li><strong>Alpha vertices</strong> (on-axis boundary, $|i|+|j|=k$, either $i=0$ or $j=0$):
$$\mathcal{T}_k(k, 0) = \frac{\mathcal{T}_{k-1}(k, 0) + \alpha_R \cdot \mathcal{T}_{k-1}(k-1, 0)}{\alpha_R + 1}$$
$$\mathcal{T}_k(-k, 0) = \frac{\mathcal{T}_{k-1}(-k, 0) + \alpha_L \cdot \mathcal{T}_{k-1}(-(k-1), 0)}{\alpha_L + 1}$$
$$\mathcal{T}_k(0, k) = \frac{\mathcal{T}_{k-1}(0, k) + \alpha_T \cdot \mathcal{T}_{k-1}(0, k-1)}{\alpha_T + 1}$$
$$\mathcal{T}_k(0, -k) = \frac{\mathcal{T}_{k-1}(0, -k) + \alpha_B \cdot \mathcal{T}_{k-1}(0, -(k-1))}{\alpha_B + 1}$$
</li>

<li><strong>Beta vertices</strong> (off-axis boundary, $|i|+|j|=k$, $i \neq 0$ and $j \neq 0$). For $1 \leq m \leq k-1$:

<em>Upper-right quadrant</em> $(i,j) = (m, k-m)$:
$$\mathcal{T}_k(m, k-m) = \frac{\mathcal{T}_{k-1}(m-1, k-m) + \beta_{m,k-m} \cdot \mathcal{T}_{k-1}(m, k-m-1)}{\beta_{m,k-m} + 1}$$

<em>Lower-right quadrant</em> $(i,j) = (m, -(k-m))$:
$$\mathcal{T}_k(m, -(k-m)) = \frac{\mathcal{T}_{k-1}(m-1, -(k-m)) + \beta_{m,-(k-m)} \cdot \mathcal{T}_{k-1}(m, -(k-m-1))}{\beta_{m,-(k-m)} + 1}$$

<em>Upper-left quadrant</em> $(i,j) = (-m, k-m)$:
$$\mathcal{T}_k(-m, k-m) = \frac{\mathcal{T}_{k-1}(-(m-1), k-m) + \beta_{-m,k-m} \cdot \mathcal{T}_{k-1}(-m, k-m-1)}{\beta_{-m,k-m} + 1}$$

<em>Lower-left quadrant</em> $(i,j) = (-m, -(k-m))$:
$$\mathcal{T}_k(-m, -(k-m)) = \frac{\beta_{-m,-(k-m)} \cdot \mathcal{T}_{k-1}(-m, -(k-m-1)) + \mathcal{T}_{k-1}(-(m-1), -(k-m))}{\beta_{-m,-(k-m)} + 1}$$
</li>

<li><strong>Interior pass-through</strong> ($|i|+|j| < k$, $i+j+k$ even):
$$\mathcal{T}_k(i,j) = \mathcal{T}_{k-1}(i,j)$$
</li>

<li><strong>Interior recurrence</strong> ($|i|+|j| < k$, $i+j+k$ odd):
$$\mathcal{T}_k(i,j) = \frac{\gamma_{i,j}(\mathcal{T}_k(i-1,j) + \mathcal{T}_k(i+1,j)) + \mathcal{T}_k(i,j-1) + \mathcal{T}_k(i,j+1)}{\gamma_{i,j} + 1} - \mathcal{T}_{k-1}(i,j)$$
where $\gamma_{i,j}$ is the face weight at position $(i,j)$.
</li>
</ol>

<h5>Classification of weights: α, β, γ</h5>

<p>Given an Aztec diamond with arbitrary edge weights, the T-embedding recurrence uses three types of weights classified by their position in the reduced graph at each level $k$:</p>

<ul>
<li><strong>α (alpha) weights</strong> — <em>On-axis boundary weights</em>: These correspond to faces at positions $(i,j)$ where $|i|+|j| = k$ and either $i=0$ or $j=0$. That is, the four cardinal positions:
$$\alpha_R \leftrightarrow (k, 0), \quad \alpha_L \leftrightarrow (-k, 0), \quad \alpha_T \leftrightarrow (0, k), \quad \alpha_B \leftrightarrow (0, -k).$$
</li>

<li><strong>β (beta) weights</strong> — <em>Off-axis boundary weights</em>: These correspond to faces at positions $(i,j)$ where $|i|+|j| = k$ with $i \neq 0$ and $j \neq 0$. These are the diagonal boundary positions:
$$\beta_{m, k-m} \text{ for } 1 \leq m \leq k-1 \text{ in each quadrant.}$$
</li>

<li><strong>γ (gamma) weights</strong> — <em>Interior weights</em>: These correspond to faces at positions $(i,j)$ where $|i|+|j| \leq k-1$. These are the interior face weights of the reduced graph.
</li>
</ul>

<h5>Extraction from double edges</h5>

<p>The α and β weights are extracted during the <em>urban renewal</em> and <em>double edge combination</em> steps of the Aztec diamond graph reduction. After performing:</p>
<ol>
<li>Gauge transformations (to equalize edges along the boundary)</li>
<li>Degree-2 vertex removal and edge contraction</li>
<li>Urban renewal on the 4-valent faces</li>
</ol>

<p>the graph develops <em>double edges</em> (pairs of edges connecting the same two vertices). The α and β weights are then computed as ratios of these double edge weights:</p>

$$\alpha = \frac{w_{\text{black} \to \text{white}}}{w_{\text{white} \to \text{black}}}$$

<p>where:</p>
<ul>
<li><strong>Alpha edges</strong>: Double edges where <em>both</em> endpoints lie on the boundary (at maximal distance from the origin).</li>
<li><strong>Beta edges</strong>: Double edges where <em>exactly one</em> endpoint lies on the boundary and one is interior.</li>
</ul>

<p>The γ weights are simply the face weights at interior positions, stored during the reduction process.</p>

<h5>3D Visualization: Origami Map</h5>
<p>The <strong>origami map</strong> $\mathcal{O}$ is a companion to the T-embedding. Together, $\mathcal{T}$ and $\mathcal{O}$ define a <strong>t-surface</strong>
$\bigl(\mathrm{Re}(\mathcal{T}), \mathrm{Im}(\mathcal{T}), \mathrm{Re}(\mathcal{O}), \mathrm{Im}(\mathcal{O})\bigr)$
in the Minkowski space $\mathbb{R}^{2,2}$. For uniform weights, the surface lies in $\mathbb{R}^{2,1}$ [CLR2]; for periodic weights with gas regions, it is genuinely four-dimensional and converges to a <em>space-like maximal surface</em> [BNR].
The scaling limit for arbitrary (non-periodic) weights remains an open question.</p>

<p>The <strong>3D view</strong> shows a projection: the T-embedding as the $(x,y)$ base and $\mathrm{Re}(\mathcal{O})$ as height $z$.</p>

<p><strong>Im(Origami), matched:</strong> The imaginary part $\mathrm{Im}(\mathcal{O})$ gives a second height function, but with different boundary conditions than $\mathrm{Re}(\mathcal{O})$.
To compare them, we apply a linear transformation $z = \alpha \cdot \mathrm{Im}(\mathcal{O}) + \beta$
where $\alpha, \beta$ are chosen via least squares to match $\mathrm{Re}(\mathcal{O})$ at the four external corners.
This "matched" Im surface can be overlaid with Re to visualize how the two components relate.</p>

<h5>References</h5>
<ul style="font-size: 13px;">
  <li><strong>[BNR]</strong> T. Berggren, M. Nicoletti, M. Russkikh. <em>Perfect t-embeddings of doubly periodic Aztec diamonds.</em> <a href="https://arxiv.org/abs/2508.04938">arXiv:2508.04938</a> (2025).</li>
  <li><strong>[CLR2]</strong> D. Chelkak, B. Laslier, M. Russkikh. <em>Bipartite dimer model: perfect t-embeddings and Lorentz-minimal surfaces.</em> <a href="https://arxiv.org/abs/2109.06272">arXiv:2109.06272</a> (2021).</li>
  <li><strong>[CLR1]</strong> D. Chelkak, B. Laslier, M. Russkikh. <em>Dimer model and holomorphic functions on t-embeddings of planar graphs.</em> Proc. Lond. Math. Soc. 126(5):1656–1739 (2023). <a href="https://arxiv.org/abs/2001.11871">arXiv:2001.11871</a>.</li>
  <li><strong>[KLRR]</strong> R. Kenyon, W. Y. Lam, S. Ramassamy, M. Russkikh. <em>Dimers and circle patterns.</em> Ann. Sci. Éc. Norm. Supér. 55(3):863–901 (2022). <a href="https://arxiv.org/abs/1810.05616">arXiv:1810.05616</a>.</li>
</ul>

  </div>
</details>

<div style="margin-bottom: 10px;">
  <label>n: <input id="n-input" type="number" value="6" min="1" max="200" style="width: 60px;"></label>

  <!-- Weight Preset Dropdown -->
  <label style="margin-left: 15px;">Weights:
    <select id="weight-preset-select" style="margin-left: 5px;">
      <option value="random-iid" selected>Random IID</option>
      <option value="random-layered">Random Layered</option>
      <option value="random-gamma">Random Gamma</option>
      <option value="all-ones">All 1's</option>
      <option value="periodic">k × l Periodic</option>
    </select>
  </label>

  <!-- Periodic params (inline) -->
  <span id="periodic-params" style="display: none; margin-left: 10px;">
    <label>k: <input id="periodic-k" type="number" value="2" min="1" max="5" style="width: 40px;"></label>
    <label style="margin-left: 5px;">l: <input id="periodic-l" type="number" value="2" min="1" max="5" style="width: 40px;"></label>
  </span>

  <button id="compute-btn" style="margin-left: 15px;">Compute</button>
  <span id="compute-time" style="margin-left: 10px; color: #666;"></span>
  <div id="n-warning" style="display: none; margin-top: 8px; padding: 8px 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; color: #856404; font-size: 12px;">⚠️ <strong>Warning:</strong> n &gt; 60 may take several dozen seconds to compute</div>
</div>

<!-- Random IID params (collapsible panel) -->
<div id="iid-params" style="display: block; margin-bottom: 10px; padding: 10px; border: 1px solid #99c; background: #f0f0ff; border-radius: 4px;">
  <div style="margin-bottom: 8px; font-weight: bold;">IID Distribution</div>

  <div style="margin-bottom: 8px;">
    <label>Distribution:
      <select id="iid-distribution-select" style="margin-left: 5px;">
        <option value="uniform" selected>Uniform [a, b]</option>
        <option value="exponential">Exponential (1)</option>
        <option value="pareto">Pareto (α, x_min)</option>
        <option value="geometric">Geometric (p), X≥1</option>
      </select>
    </label>
  </div>

  <!-- Uniform distribution params -->
  <div id="iid-uniform-params" style="margin-bottom: 8px;">
    <small>Each edge weight ~ Uniform[a, b]</small><br>
    a: <input type="number" id="iid-min" value="0.5" step="0.1" min="0.001" style="width: 60px;">
    b: <input type="number" id="iid-max" value="2.0" step="0.1" min="0.001" style="width: 60px;">
  </div>

  <!-- Exponential distribution params -->
  <div id="iid-exponential-params" style="display: none; margin-bottom: 8px;">
    <small>Each edge weight ~ Exp(1). Mean = 1</small><br>
    <small style="color: #666;">(General Exp(λ) only scales weights, which doesn't affect T-embeddings)</small>
  </div>

  <!-- Pareto distribution params -->
  <div id="iid-pareto-params" style="display: none; margin-bottom: 8px;">
    <small>Each edge weight ~ Pareto(α, x_min). Heavy tail.</small><br>
    α: <input type="number" id="iid-pareto-alpha" value="2.0" step="0.1" min="0.1" style="width: 60px;">
    x_min: <input type="number" id="iid-pareto-xmin" value="1.0" step="0.1" min="0.01" style="width: 60px;">
  </div>

  <!-- Geometric distribution params -->
  <div id="iid-geometric-params" style="display: none; margin-bottom: 8px;">
    <small>Each edge weight ~ Geometric(p), X ≥ 1. Mean = 1/p</small><br>
    p: <input type="number" id="iid-geom-p" value="0.5" step="0.05" min="0.01" max="0.99" style="width: 60px;">
  </div>

  <div style="margin-top: 8px;">
    Seed: <input id="random-seed" type="number" value="42" style="width: 60px;">
  </div>
</div>

<!-- Random Gamma params (collapsible panel) -->
<div id="gamma-params" style="display: none; margin-bottom: 10px; padding: 10px; border: 1px solid #c99; background: #fff0f0; border-radius: 4px;">
  <div style="margin-bottom: 8px; font-weight: bold;">Gamma Distribution <span style="font-weight: normal; font-size: 0.85em;">(Duits, Van Peski <a href="https://arxiv.org/abs/2512.03033" target="_blank">[arXiv:2512.03033]</a>)</span></div>
  <small>α edges (bottom of faces) ~ Γ(α, 1), β edges (right of faces) ~ Γ(β, 1)</small>
  <div style="margin-top: 8px;">
    α: <input id="gamma-alpha" type="number" value="0.2" min="0.01" max="50" step="0.01" style="width: 60px;">
    β: <input id="gamma-beta" type="number" value="0.25" min="0.01" max="50" step="0.01" style="width: 60px;">
  </div>
  <div style="margin-top: 8px;">
    Seed: <input id="gamma-seed" type="number" value="42" style="width: 60px;">
  </div>
</div>

<!-- Random Layered params (collapsible) -->
<div id="layered-params" style="display: none; margin-bottom: 10px; padding: 10px; border: 1px solid #9c9; background: #f0fff0; border-radius: 4px;">
  <div style="margin-bottom: 8px; font-weight: bold;">Layered Weight Regime <span style="font-weight: normal; font-size: 0.85em;">(Bufetov, Petrov, Zografos <a href="https://arxiv.org/abs/2507.08560" target="_blank">[arXiv:2507.08560]</a>)</span></div>

  <div style="margin-bottom: 8px;">
    <input type="radio" id="layered-regime1" name="layered-regime" value="1">
    <label for="layered-regime1"><strong>Regime 1: Critical Scaling</strong></label>
    <div id="layered-regime1-params" style="margin-left: 25px; display: none; margin-top: 5px;">
      <small>Weight = Val1 + 2/√n (prob p₁) or Val2 - 1/√n (prob p₂)</small><br>
      Val1: <input type="number" id="layered1-val1" value="1" step="0.1" style="width: 50px;">
      Val2: <input type="number" id="layered1-val2" value="1" step="0.1" style="width: 50px;">
      p₁: <input type="number" id="layered1-prob1" value="0.5" step="0.1" min="0" max="1" style="width: 50px;">
      p₂: <input type="number" id="layered1-prob2" value="0.5" step="0.1" min="0" max="1" style="width: 50px;">
    </div>
  </div>

  <div style="margin-bottom: 8px;">
    <input type="radio" id="layered-regime2" name="layered-regime" value="2">
    <label for="layered-regime2"><strong>Regime 2: Rare Event Scaling</strong></label>
    <div id="layered-regime2-params" style="margin-left: 25px; display: none; margin-top: 5px;">
      <small>Weight = Val1 (prob 1/√n) or Val2 (prob (√n-1)/√n)</small><br>
      Val1: <input type="number" id="layered2-val1" value="2" step="0.1" style="width: 50px;">
      Val2: <input type="number" id="layered2-val2" value="1" step="0.1" style="width: 50px;">
    </div>
  </div>

  <div style="margin-bottom: 8px;">
    <input type="radio" id="layered-regime3" name="layered-regime" value="3" checked>
    <label for="layered-regime3"><strong>Regime 3: Bernoulli (Default)</strong></label>
    <div id="layered-regime3-params" style="margin-left: 25px; display: block; margin-top: 5px;">
      <small>Weight = Val1 (prob p₁) or Val2 (prob p₂)</small><br>
      Val1: <input type="number" id="layered3-val1" value="2" step="0.1" style="width: 50px;">
      Val2: <input type="number" id="layered3-val2" value="0.5" step="0.1" style="width: 50px;">
      p₁: <input type="number" id="layered3-prob1" value="0.5" step="0.1" min="0" max="1" style="width: 50px;">
      p₂: <input type="number" id="layered3-prob2" value="0.5" step="0.1" min="0" max="1" style="width: 50px;">
    </div>
  </div>

  <div style="margin-bottom: 8px;">
    <input type="radio" id="layered-regime4" name="layered-regime" value="4">
    <label for="layered-regime4"><strong>Regime 4: Deterministic Periodic</strong></label>
    <div id="layered-regime4-params" style="margin-left: 25px; display: none; margin-top: 5px;">
      <small>Pattern: w₁, w₂, w₁, w₂, ... by diagonal</small><br>
      w₁: <input type="number" id="layered4-w1" value="2" step="0.1" style="width: 50px;">
      w₂: <input type="number" id="layered4-w2" value="0.5" step="0.1" style="width: 50px;">
    </div>
  </div>

  <div style="margin-bottom: 8px;">
    <input type="radio" id="layered-regime5" name="layered-regime" value="5">
    <label for="layered-regime5"><strong>Regime 5: Continuous Uniform [a,b]</strong></label>
    <div id="layered-regime5-params" style="margin-left: 25px; display: none; margin-top: 5px;">
      <small>Weight ~ Uniform[a, b]</small><br>
      a: <input type="number" id="layered5-min" value="0.5" step="0.1" style="width: 50px;">
      b: <input type="number" id="layered5-max" value="2.0" step="0.1" style="width: 50px;">
    </div>
  </div>

  <div style="margin-top: 8px;">
    Seed: <input id="layered-seed" type="number" value="42" style="width: 60px;">
  </div>
</div>

<!-- Periodic Weights Editor (shown when periodic mode selected) -->
<div id="weights-editor" style="display: none; margin-bottom: 10px; padding: 10px; border: 1px solid #c9f; background: #f8f0ff; border-radius: 4px;">
  <div style="margin-bottom: 8px; font-weight: bold;">Periodic Weights (k×l = <span id="weights-editor-dims">2×2</span>)</div>
  <div style="margin-bottom: 6px; font-size: 11px; color: #666;" id="periodic-preset-desc">Preset loaded for this k×l</div>
  <div id="weights-tables" style="display: flex; flex-wrap: wrap; gap: 15px;"></div>
  <div style="margin-top: 10px;">
    <button id="close-weights-btn">Close</button>
  </div>
</div>

<div id="loading-msg" style="display: none; padding: 10px; background: #ffe; border: 1px solid #cc0; margin-bottom: 10px;">
  Loading WASM module...
</div>


<!-- Main T-embedding Visualization Section -->
<details id="main-visualization-section" style="margin-top: 15px;" open>
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #f0e8ff; border: 1px solid #c9f;">T-embedding Visualization</summary>
  <div style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
    <!-- Controls row -->
    <div style="margin-bottom: 10px; text-align: center;">
      <label>V: <input type="number" id="main-2d-vertex-size" value="3" min="0.6" max="20" step="0.1" style="width: 3em;"></label>
      <label style="margin-left: 10px;">E: <input type="number" id="main-2d-edge-thickness" value="2" min="0.3" max="10" step="0.1" style="width: 3em;"></label>
      <label style="margin-left: 15px;"><input type="checkbox" id="show-origami-chk" checked> Origami</label>
    </div>

    <!-- Canvas container with floating buttons -->
    <div id="main-canvas-wrapper" style="position: relative;">
      <!-- Floating controls row -->
      <div style="position: absolute; top: 10px; right: 10px; z-index: 10; display: flex; gap: 5px;">
        <button id="main-zoom-out-btn" style="padding: 5px 10px; font-weight: bold; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;">−</button>
        <button id="main-zoom-reset-btn" style="padding: 5px 10px; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;">⟲</button>
        <button id="main-zoom-in-btn" style="padding: 5px 10px; font-weight: bold; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;">+</button>
        <button id="toggle-2d-3d-btn" style="padding: 5px 15px; font-weight: bold; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;">2D</button>
        <button id="toggle-projection-btn" style="display: none; padding: 5px 10px; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;" title="Toggle orthographic/perspective">🎯</button>
        <button id="cycle-preset-btn" style="display: none; padding: 5px 10px; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;" title="Cycle visual preset">☀️</button>
        <button id="auto-rotate-btn" style="display: none; padding: 5px 10px; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;" title="Toggle auto-rotate">🔄</button>
      </div>
      <!-- Floating 3D surface selection (hidden by default, shown in 3D mode) -->
      <div id="surface-select-controls" style="display: none; position: absolute; top: 10px; left: 10px; z-index: 10; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; padding: 5px 10px; font-size: 12px;">
        <label style="margin-right: 10px;"><input type="checkbox" id="show-re-surface-chk" checked> Re(Origami)</label>
        <label><input type="checkbox" id="show-im-surface-chk"> Im(Origami), matched</label>
      </div>

      <!-- 2D Canvas -->
      <div id="main-2d-container">
        <canvas id="main-temb-2d-canvas" style="width: 100%; height: 60vh; border: 1px solid #ccc; background: #fafafa;"></canvas>
      </div>

      <!-- 3D Canvas (hidden by default) -->
      <div id="main-3d-container" style="display: none;">
        <canvas id="main-temb-3d-canvas" style="width: 100%; height: 60vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
      </div>
    </div>

    <!-- Export Controls -->
    <div style="margin-top: 10px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap;">
      <span style="font-size: 12px; font-weight: bold; color: #555;">Export:</span>
      <button id="export-pdf-btn" style="padding: 2px 8px;">PDF</button>
      <label style="display: flex; align-items: center; gap: 4px;">
        <input type="checkbox" id="pdf-include-origami" checked>
        <span style="font-size: 11px;">Origami</span>
      </label>
      <span style="color: #ccc;">|</span>
      <button id="export-png-btn" style="padding: 2px 8px;">PNG</button>
      <span style="font-size: 11px; color: #666;">Quality:</span>
      <input type="range" id="png-quality-slider" min="1" max="100" value="85" style="width: 60px;">
      <span style="color: #ccc;">|</span>
      <button id="export-obj-btn" style="padding: 2px 8px;">OBJ</button>
    </div>
  </div>
</details>

<details id="random-sample-section" style="margin-top: 15px;" open>
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #ffe8f0; border: 1px solid #f9c;">Random Domino Tiling</summary>
  <div style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
    <!-- Top controls row -->
    <div style="margin-bottom: 10px; text-align: center; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px;">
      <label>N: <input type="number" id="sample-N-input" value="6" min="1" max="300" style="width: 60px;"></label>
      <label>Border: <input type="number" id="sample-border-input" value="0.1" min="0" max="10" step="0.1" style="width: 50px;"></label>
      <button id="sample-btn" style="padding: 5px 15px;">Random Sample by Shuffling</button>
      <span id="sample-time" style="color: #666;"></span>
    </div>
    <!-- Double dimer controls (hidden by default) -->
    <div id="double-dimer-controls" style="margin-bottom: 10px; text-align: center; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 15px;">
      <label style="cursor: pointer;"><input type="checkbox" id="sample-double-dimer-chk"> Double Dimer</label>
      <span id="double-dimer-options" style="display: none;">
        <label style="margin-left: 10px; cursor: pointer;"><input type="checkbox" id="sample-show-double-edges-chk" checked> Show double edges (purple)</label>
        <label style="margin-left: 15px;">Min loop length: <input type="number" id="sample-min-loop-length" value="0" min="0" max="100" style="width: 50px;"></label>
      </span>
    </div>
    <!-- Canvas with floating controls -->
    <div id="sample-canvas-wrapper" style="position: relative;">
      <div style="position: absolute; top: 10px; right: 10px; z-index: 10; display: flex; gap: 5px; align-items: center;">
        <button id="sample-zoom-out-btn" style="padding: 5px 10px; font-weight: bold; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;">−</button>
        <button id="sample-zoom-reset-btn" style="padding: 5px 10px; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;">⟲</button>
        <button id="sample-zoom-in-btn" style="padding: 5px 10px; font-weight: bold; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;">+</button>
        <button id="sample-toggle-3d-btn" style="padding: 5px 15px; font-weight: bold; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;" title="Toggle 2D/3D view">3D</button>
        <button id="sample-perspective-btn" style="display: none; padding: 5px 10px; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;" title="Toggle perspective/isometric">🎯</button>
        <button id="sample-preset-btn" style="display: none; padding: 5px 10px; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;" title="Cycle 3D visual preset">☀️</button>
        <button id="sample-rotate-btn" style="display: none; padding: 5px 10px; background: rgba(255,255,255,0.9); border: 1px solid #999; border-radius: 4px; cursor: pointer;" title="Toggle auto-rotation">🔄</button>
      </div>
      <canvas id="sample-canvas" style="width: 100%; height: 50vh; border: 1px solid #ccc; background: #fafafa;"></canvas>
      <div id="sample-3d-container"></div>
    </div>
    <!-- Bottom controls: Colors and Export -->
    <div style="margin-top: 10px; text-align: center; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px;">
      <label>Colors: <select id="sample-palette-select" style="padding: 2px 4px;"></select></label>
      <span style="color: #ccc;">|</span>
      <span style="font-size: 12px; font-weight: bold; color: #555;">Export:</span>
      <button id="sample-export-png-btn" style="padding: 2px 8px;">PNG</button>
      <span style="font-size: 11px; color: #666;">Quality:</span>
      <input type="range" id="sample-png-quality" min="1" max="100" value="85" style="width: 60px;">
      <button id="sample-export-pdf-btn" style="padding: 2px 8px;">PDF</button>
    </div>
  </div>
</details>

<details id="stepwise-section" style="margin-top: 15px;">
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #e8f4e8; border: 1px solid #9c9;">Step-by-step visualization and explicit edge and face weights</summary>
  <div id="stepwise-large-n-msg" style="display: none; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; margin: 10px 0; border-radius: 4px;">
    <strong>Note:</strong> Step-by-step visualization is only available for n ≤ 15. For larger n, use the main T-embedding visualization above.
  </div>
  <div id="stepwise-content" style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
    <!-- Side-by-side layout -->
    <div style="display: flex; flex-wrap: wrap; gap: 20px;">
      <!-- LEFT: Aztec diamond graph -->
      <div style="flex: 1; min-width: 350px;">
        <div style="margin-bottom: 10px; text-align: center;">
          <button id="aztec-fast-down-btn" style="width: 32px;">«</button>
          <button id="aztec-down-btn" style="width: 32px;">←</button>
          <button id="aztec-up-btn" style="width: 32px;">→</button>
          <button id="aztec-fast-up-btn" style="width: 32px;">»</button>
          <label style="margin-left: 15px;"><input type="checkbox" id="show-aztec-weights-chk" checked> E wts</label>
          <label style="margin-left: 15px;"><input type="checkbox" id="show-face-weights-chk"> F wts</label>
        </div>
        <canvas id="aztec-graph-canvas" style="width: 100%; height: 50vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
        <div id="aztec-vertex-info" style="margin-top: 3px; padding: 8px; background: #fff; border: 1px solid #ddd; min-height: 30px; font-family: monospace; font-size: 12px;">
        </div>
      </div>

      <!-- RIGHT: T-embedding canvas -->
      <div style="flex: 1; min-width: 350px;">
        <div style="margin-bottom: 10px; text-align: center;">
          <button id="step-prev-btn" style="width: 60px;">←</button>
          <button id="step-next-btn" style="width: 60px; margin-left: 10px;">→</button>
          <span style="margin-left: 15px;">k = <span id="step-value">0</span></span>
          <label style="margin-left: 15px;"><input type="checkbox" id="show-labels-chk"> Labels</label>
          <label style="margin-left: 15px;">V: <input type="number" id="temb-vertex-size" value="3" min="0.6" max="20" step="0.1" style="width: 3em;"></label>
          <label style="margin-left: 10px;">E: <input type="number" id="temb-edge-thickness" value="2" min="0.3" max="10" step="0.1" style="width: 3em;"></label>
        </div>
        <canvas id="stepwise-temb-canvas" style="width: 100%; height: 50vh; border: 1px solid #ccc; background: #fafafa; cursor: grab;"></canvas>
        <div id="vertex-info" style="margin-top: 5px; padding: 8px; background: #fff; border: 1px solid #ddd; min-height: 30px; font-family: monospace; font-size: 12px;">
        </div>
      </div>
    </div>
  </div>
</details>

<details id="mathematica-section" style="margin-top: 15px;">
  <summary style="cursor: pointer; font-weight: bold; padding: 5px; background: #e8e8f4; border: 1px solid #99c;">Mathematica verification code for small n</summary>
  <div id="mathematica-large-n-msg" style="display: none; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; margin: 10px 0; border-radius: 4px;">
    <strong>Note:</strong> Mathematica verification is only available for n ≤ 15.
  </div>
  <div id="mathematica-content" style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">
    <p style="font-size: 12px; margin-bottom: 10px;">
      The XX verification formula checks that each interior white vertex satisfies:
    </p>
    <pre style="background: #f5f5f5; padding: 8px; border: 1px solid #ccc; font-size: 11px; margin-bottom: 10px;">XX[n1, n2, n3, n4][z] = ((z - n1)(z - n3)) / ((n2 - z)(n4 - z))</pre>
    <p style="font-size: 11px; color: #666; margin-bottom: 10px;">
      where n1, n2, n3, n4 are the four neighbors going counterclockwise around z, with n1 chosen so that edge z→n1 has the BLACK face on the right.
    </p>
    <div style="margin-bottom: 10px; position: relative;">
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">α/β parameters:</div>
      <button id="recompute-face-weights-btn" style="position: absolute; top: 0px; right: 42px; font-size: 10px; padding: 2px 6px;">Recompute</button>
      <button id="copy-face-weights-btn" style="position: absolute; top: 0px; right: 2px; font-size: 10px; padding: 2px 6px;">Copy</button>
      <div id="face-weights-output" style="padding: 8px; background: #fff8e8; border: 1px solid #d4a017; min-height: 30px; font-family: monospace; font-size: 11px; white-space: pre-wrap; max-height: 150px; overflow-y: auto;">
        <em>α/β parameters will appear here</em>
      </div>
    </div>
    <div style="margin-bottom: 10px; position: relative;">
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">T coordinates:</div>
      <button id="recompute-mathematica-btn" style="position: absolute; top: 0px; right: 42px; font-size: 10px; padding: 2px 6px;">Recompute</button>
      <button id="copy-mathematica-btn" style="position: absolute; top: 0px; right: 2px; font-size: 10px; padding: 2px 6px;">Copy</button>
      <div id="mathematica-output" style="padding: 8px; background: #fff; border: 1px solid #ccc; min-height: 30px; font-family: monospace; font-size: 11px; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">
        <em>T coordinates will appear here</em>
      </div>
    </div>
    <div id="verify-container" style="margin-top: 10px;">
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">XX Verification (by level):</div>
      <div id="verify-levels" style="display: flex; flex-direction: column; gap: 5px;">
        <em style="font-size: 11px;">XX verification checks will appear here</em>
      </div>
    </div>
  </div>
</details>

<p style="font-size: 0.9em; color: #555; margin-top: 15px;">
<b>Acknowledgement:</b> Developed during the reunion conference for the <a href="https://www.ipam.ucla.edu/programs/long-programs/geometry-statistical-mechanics-and-integrability/">IPAM long program on Geometry, Statistical Mechanics, and Integrability</a> (December 2025).
I thank Mikhail Basok, Dmitry Chelkak, and Marianna Russkikh for helpful discussions.
Part of this research was performed while the author was visiting the Institute for Pure and Applied Mathematics (IPAM), which is supported by the National Science Foundation (Grant No. DMS-1925919).
</p>

<!-- Benchmark Section -->
<div style="margin-top: 30px; padding: 15px; border: 1px solid #ccc; border-radius: 8px; background: #f9f9f9;">
  <h3 style="margin-top: 0;">T-embedding Performance Benchmark</h3>
  <p style="margin: 0 0 10px 0; font-size: 0.9em; color: #555;">Runs T-embedding computation for n=10 to n=40, measures time for each, and fits a power law t(n) = c · n<sup>α</sup> (c in nanoseconds). Uses the current weight selection.</p>
  <button id="benchmark-btn">Benchmark (takes about a minute)</button>
  <span id="benchmark-status" style="margin-left: 10px; color: #666;"></span>
  <div id="benchmark-results" style="display: none; margin-top: 15px;">
    <canvas id="benchmark-canvas" width="500" height="300" style="border: 1px solid #ddd; background: white;"></canvas>
    <div id="benchmark-fit" style="margin-top: 10px; font-family: monospace; font-size: 14px;"></div>
  </div>
</div>

<style>
#stepwise-temb-canvas.panning, #aztec-graph-canvas.panning { cursor: grabbing; }
#sample-3d-container {
  width: 100%;
  height: 50vh;
  border: 1px solid #ccc;
  display: none;
  background: #f0f0f0;
  border-radius: 6px;
}
#sample-3d-container canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>

<script src="/js/colorschemes.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.js"></script>
<script src="/js/2025-12-11-t-embedding-arbitrary-weights.js"></script>

<script>
(function() {
  const loadingMsg = document.getElementById('loading-msg');
  const stepwiseCanvas = document.getElementById('stepwise-temb-canvas');
  const stepwiseCtx = stepwiseCanvas.getContext('2d');
  const aztecCanvas = document.getElementById('aztec-graph-canvas');
  const aztecCtx = aztecCanvas.getContext('2d');
  const main3DCanvas = document.getElementById('main-temb-3d-canvas');
  const main3DCtx = main3DCanvas.getContext('2d');

  // 3D view state (rotation angles in radians, zoom, pan)
  let view3DRotX = -0.6;  // Rotation around X axis (tilt)
  let view3DRotZ = 0.5;   // Rotation around Z axis (spin)
  let view3DZoom = 1.0;
  let view3DPanX = 0, view3DPanY = 0;  // Pan offset in screen pixels
  let view3DIsDragging = false;
  let view3DIsPanning = false;  // Cmd+drag panning mode
  let view3DLastX = 0, view3DLastY = 0;
  let mainViewIs3D = false;  // Toggle between 2D and 3D view
  let view3DPerspective = false;  // false = orthographic, true = perspective
  let view3DPresetIndex = 0;  // Current visual preset index
  let view3DAutoRotate = false;  // Auto-rotate mode
  let view3DAutoRotateId = null;  // Animation frame ID

  // 3D Visual Presets
  const VISUAL_PRESETS_3D = [
    {
      name: 'Default',
      icon: '☀️',
      background: '#fafafa',
      baseColor: { r: 220, g: 225, b: 235 },
      ambient: 0.25,
      lights: [
        { dir: { x: 0.5, y: 0.7, z: 0.5 }, intensity: 0.35 },
        { dir: { x: -0.6, y: 0.3, z: -0.4 }, intensity: 0.20 },
        { dir: { x: 0.0, y: 1.0, z: 0.0 }, intensity: 0.15 },
        { dir: { x: 0.3, y: -0.5, z: 0.6 }, intensity: 0.10 }
      ],
      edgeColor: '#000',
      vertexColor: '#000'
    },
    {
      name: 'Clean',
      icon: '✨',
      background: '#ffffff',
      baseColor: { r: 245, g: 245, b: 250 },
      ambient: 0.35,
      lights: [
        { dir: { x: 0.0, y: 1.0, z: 0.3 }, intensity: 0.45 },
        { dir: { x: -0.5, y: 0.3, z: -0.5 }, intensity: 0.15 }
      ],
      edgeColor: '#333',
      vertexColor: '#333'
    },
    {
      name: 'Mathematical',
      icon: '📐',
      background: '#ffffff',
      baseColor: { r: 255, g: 255, b: 255 },
      ambient: 0.5,
      lights: [
        { dir: { x: 0.0, y: 1.0, z: 0.0 }, intensity: 0.35 },
        { dir: { x: 0.5, y: 0.5, z: 0.5 }, intensity: 0.15 }
      ],
      edgeColor: '#000',
      vertexColor: '#000'
    },
    {
      name: 'Dramatic',
      icon: '🎭',
      background: '#1a1a2e',
      baseColor: { r: 180, g: 190, b: 220 },
      ambient: 0.15,
      lights: [
        { dir: { x: 0.7, y: 0.5, z: 0.3 }, intensity: 0.60 },
        { dir: { x: -0.3, y: 0.8, z: -0.2 }, intensity: 0.20 },
        { dir: { x: -0.5, y: -0.3, z: 0.5 }, intensity: 0.10 }
      ],
      edgeColor: '#444',
      vertexColor: '#666'
    },
    {
      name: 'Warm',
      icon: '🌅',
      background: '#fff8f0',
      baseColor: { r: 255, g: 235, b: 220 },
      ambient: 0.30,
      lights: [
        { dir: { x: 0.6, y: 0.6, z: 0.4 }, intensity: 0.40 },
        { dir: { x: -0.4, y: 0.5, z: -0.3 }, intensity: 0.20 },
        { dir: { x: 0.0, y: 1.0, z: 0.0 }, intensity: 0.10 }
      ],
      edgeColor: '#664433',
      vertexColor: '#553322'
    },
    {
      name: 'Wireframe',
      icon: '🔲',
      background: '#ffffff',
      baseColor: { r: 200, g: 200, b: 200 },
      ambient: 0.5,
      lights: [
        { dir: { x: 0.0, y: 1.0, z: 0.0 }, intensity: 0.5 }
      ],
      edgeColor: '#000000',
      vertexColor: '#333333',
      showFaces: false
    }
  ];

  // T-embedding data
  let tembData = null;
  let wasmReady = false;
  let isComputing = false;  // Flag to prevent re-entrancy during computation

  // Hard cap on n
  const MAX_N = 200;

  // Step-by-step visualization is only available for n <= this threshold
  const STEP_BY_STEP_MAX_N = 15;

  // Helper to parse and clamp n input
  function parseN() {
    let n = parseInt(document.getElementById('n-input').value) || 6;
    n = Math.max(1, Math.min(MAX_N, n));
    document.getElementById('n-input').value = n;  // Update input to show clamped value
    // Show warning for large n
    const warning = document.getElementById('n-warning');
    if (warning) warning.style.display = (n > 60) ? 'inline' : 'none';
    return n;
  }

  // Update stepwise and Mathematica section visibility based on n
  function updateStepwiseSectionForN(n) {
    const stepSection = document.getElementById('stepwise-section');
    const stepContent = document.getElementById('stepwise-content');
    const stepMsg = document.getElementById('stepwise-large-n-msg');
    const mathSection = document.getElementById('mathematica-section');
    const mathContent = document.getElementById('mathematica-content');
    const mathMsg = document.getElementById('mathematica-large-n-msg');

    if (n > STEP_BY_STEP_MAX_N) {
      // Large n: collapse sections, show messages, hide content
      stepSection.removeAttribute('open');
      stepMsg.style.display = 'block';
      stepContent.style.display = 'none';

      mathSection.removeAttribute('open');
      mathMsg.style.display = 'block';
      mathContent.style.display = 'none';
    } else {
      // Small n: allow sections to be open, hide messages, show content
      stepMsg.style.display = 'none';
      stepContent.style.display = 'block';

      mathMsg.style.display = 'none';
      mathContent.style.display = 'block';
    }
  }

  // Update V/E controls based on n for appropriate sizing
  // Reference: n=6, V=3, E=2 work well; scale inversely with n
  function updateVEForN(n) {
    const baseN = 6;
    const baseV = 3;
    const baseE = 2;

    const newV = (baseV * baseN / n).toFixed(1);
    const newE = (baseE * baseN / n).toFixed(1);

    document.getElementById('main-2d-vertex-size').value = newV;
    document.getElementById('main-2d-edge-thickness').value = newE;
    document.getElementById('temb-vertex-size').value = newV;
    document.getElementById('temb-edge-thickness').value = newE;
  }

  // WASM function wrappers
  let setN, initCoefficients, computeTembedding, freeString;
  let generateAztecGraph, getAztecGraphJSON, getAztecFacesJSON, getStoredFaceWeightsJSON, getBetaRatiosJSON, getTembeddingLevelJSON, getOrigamiLevelJSON;
  let randomizeAztecWeights, setAztecWeightMode, setRandomIIDParams, setLayeredParams, setGammaParams;
  let setPeriodicPeriod, setPeriodicWeight, getPeriodicParams;
  let resetAztecGraphPreservingWeights, setAztecGraphLevel, seedRng;
  let aztecGraphStepDown, aztecGraphStepUp, getAztecReductionStep, canAztecStepUp, canAztecStepDown;
  let getComputeTimeMs;
  let clearTembLevels;
  let clearStoredWeightsExport;

  // Track current weight mode: 0=All 1's (uniform), 1=Random IID, 2=Layered, 3=Gamma, 4=Periodic
  let currentWeightMode = 1;  // Default to Random IID

  // Classify face type based on centroid coordinates and current face count
  // Returns: {type: 'ROOT'|'alpha_top'|'alpha_bottom'|'alpha_left'|'alpha_right'|'beta'|'gamma', k: number, i: number, j: number}
  function classifyFace(cx, cy, numFaces) {
    // Determine k from face count: numFaces = 2k² + 2k + 1
    // Solve: k = (-1 + sqrt(2*numFaces - 1)) / 2
    let k = -1;
    for (let testK = 0; testK <= 20; testK++) {
      if (2*testK*testK + 2*testK + 1 === numFaces) {
        k = testK;
        break;
      }
    }

    // Use raw coordinates for classification (may be non-integer)
    const i = Math.round(cx);
    const j = Math.round(cy);
    const absI = Math.abs(cx);
    const absJ = Math.abs(cy);
    const absSumRaw = absI + absJ;
    const absSum = Math.abs(i) + Math.abs(j);

    if (k < 0) return {type: 'unknown', k: -1, i, j};

    // For k=0, only ROOT (single face near origin)
    if (k === 0) {
      return {type: 'ROOT', k: 0, i, j};
    }

    // For k >= 1, classify based on position
    // Alpha: on axes, at distance k from origin (|i|+|j| ≈ k with i≈0 or j≈0)
    const tol = 0.6;
    if (absI < tol && absJ > k - tol) {
      return {type: cy > 0 ? 'alpha_top' : 'alpha_bottom', k, i, j};
    }
    if (absJ < tol && absI > k - tol) {
      return {type: cx > 0 ? 'alpha_right' : 'alpha_left', k, i, j};
    }

    // Beta: diagonal positions, |i|+|j| ≈ k, both i and j non-zero
    if (Math.abs(absSumRaw - k) < tol && absI > tol && absJ > tol) {
      return {type: 'beta', k, i, j};
    }

    // Gamma: inner positions, |i|+|j| < k
    if (absSumRaw < k - tol) {
      return {type: 'gamma', k, i, j};
    }

    // If close to boundary but not matching other types, likely beta
    if (Math.abs(absSumRaw - k) < 1.0) {
      return {type: 'beta', k, i, j};
    }

    return {type: 'unknown', k, i, j};
  }

  // T-embedding from face weights state
  let currentTembLevelData = null;  // Data from getTembeddingLevelJSON
  let tembFromFaceWeightsK = -1;    // Current k level computed

  // Check if face count corresponds to a checkpoint: numFaces = 2k² + 2k + 1
  function faceCountToK(numFaces) {
    for (let k = 0; k <= 20; k++) {
      if (2*k*k + 2*k + 1 === numFaces) return k;
    }
    return -1;  // Not a checkpoint
  }

  // Render T-embedding level from face weights on stepwise canvas
  function renderTembFromFaceWeights() {
    const dpr = window.devicePixelRatio || 1;
    const rect = stepwiseCanvas.getBoundingClientRect();
    stepwiseCanvas.width = rect.width * dpr;
    stepwiseCanvas.height = rect.height * dpr;
    stepwiseCtx.scale(dpr, dpr);

    stepwiseCtx.fillStyle = '#fafafa';
    stepwiseCtx.fillRect(0, 0, rect.width, rect.height);

    if (!currentTembLevelData || !currentTembLevelData.vertices || currentTembLevelData.vertices.length === 0) {
      stepwiseCtx.fillStyle = '#666';
      stepwiseCtx.font = '14px sans-serif';
      stepwiseCtx.textAlign = 'center';
      const msg = tembFromFaceWeightsK >= 0 ?
        `T_${tembFromFaceWeightsK} not yet computed` :
        'Not at a weight checkpoint';
      stepwiseCtx.fillText(msg, rect.width / 2, rect.height / 2);
      return;
    }

    const vertices = currentTembLevelData.vertices;
    const k = currentTembLevelData.k;

    // Find bounds
    let minRe = Infinity, maxRe = -Infinity;
    let minIm = Infinity, maxIm = -Infinity;
    for (const v of vertices) {
      minRe = Math.min(minRe, v.re);
      maxRe = Math.max(maxRe, v.re);
      minIm = Math.min(minIm, v.im);
      maxIm = Math.max(maxIm, v.im);
    }

    const rangeRe = maxRe - minRe || 1;
    const rangeIm = maxIm - minIm || 1;
    const centerRe = (minRe + maxRe) / 2;
    const centerIm = (minIm + maxIm) / 2;

    const padding = 60;
    const scaleX = (rect.width - 2 * padding) / rangeRe;
    const scaleY = (rect.height - 2 * padding) / rangeIm;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * stepwiseZoom;

    const cx = rect.width / 2 + stepwisePanX * stepwiseZoom;
    const cy = rect.height / 2 + stepwisePanY * stepwiseZoom;

    stepwiseCtx.save();
    stepwiseCtx.translate(cx, cy);

    // Create vertex map by (i,j)
    const vertexMap = {};
    for (const v of vertices) {
      vertexMap[`${v.i},${v.j}`] = v;
    }

    // Get control values for vertex size and edge thickness
    const tembVertexSizeControl = parseFloat(document.getElementById('temb-vertex-size').value) || 1.5;
    const tembEdgeThicknessControl = parseFloat(document.getElementById('temb-edge-thickness').value) || 1.5;
    const uniformEdgeWidth = Math.max(tembEdgeThicknessControl, scale / 300 * tembEdgeThicknessControl);

    // Draw edges based on T_k structure
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = uniformEdgeWidth;

    function drawTembEdge(i1, j1, i2, j2) {
      const v1 = vertexMap[`${i1},${j1}`];
      const v2 = vertexMap[`${i2},${j2}`];
      if (v1 && v2) {
        stepwiseCtx.beginPath();
        stepwiseCtx.moveTo((v1.re - centerRe) * scale, -(v1.im - centerIm) * scale);
        stepwiseCtx.lineTo((v2.re - centerRe) * scale, -(v2.im - centerIm) * scale);
        stepwiseCtx.stroke();
      }
    }

    // Draw T_k edges - same logic as renderStepwiseTemb
    // Interior lattice edges
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = uniformEdgeWidth;

    for (const v of vertices) {
      const ii = v.i, jj = v.j;
      const absSum = Math.abs(ii) + Math.abs(jj);

      if (vertexMap[`${ii+1},${jj}`]) {
        const nAbsSum = Math.abs(ii+1) + Math.abs(jj);
        if (absSum <= k && nAbsSum <= k) {
          drawTembEdge(ii, jj, ii+1, jj);
        }
      }
      if (vertexMap[`${ii},${jj+1}`]) {
        const nAbsSum = Math.abs(ii) + Math.abs(jj+1);
        if (absSum <= k && nAbsSum <= k) {
          drawTembEdge(ii, jj, ii, jj+1);
        }
      }
    }

    // Boundary rhombus
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = uniformEdgeWidth;
    drawTembEdge(k+1, 0, 0, k+1);
    drawTembEdge(0, k+1, -(k+1), 0);
    drawTembEdge(-(k+1), 0, 0, -(k+1));
    drawTembEdge(0, -(k+1), k+1, 0);

    // External corners to alpha
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = uniformEdgeWidth;
    drawTembEdge(k+1, 0, k, 0);
    drawTembEdge(-(k+1), 0, -k, 0);
    drawTembEdge(0, k+1, 0, k);
    drawTembEdge(0, -(k+1), 0, -k);

    // Diagonal boundary
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = uniformEdgeWidth;
    for (let s = 0; s < k; s++) {
      drawTembEdge(k-s, s, k-s-1, s+1);
      drawTembEdge(-s, k-s, -(s+1), k-s-1);
      drawTembEdge(-(k-s), -s, -(k-s-1), -(s+1));
      drawTembEdge(s, -(k-s), s+1, -(k-s-1));
    }

    // Draw vertices
    const vertexRadius = Math.max(tembVertexSizeControl, scale / 800 * tembVertexSizeControl);
    for (const v of vertices) {
      const x = (v.re - centerRe) * scale;
      const y = -(v.im - centerIm) * scale;  // Flip y for standard math orientation

      stepwiseCtx.beginPath();
      stepwiseCtx.arc(x, y, vertexRadius, 0, Math.PI * 2);
      stepwiseCtx.fillStyle = (v.i === 0 && v.j === 0) ? '#ff0000' : '#000';
      stepwiseCtx.fill();

      // Label vertices
      stepwiseCtx.fillStyle = '#333';
      stepwiseCtx.font = `${Math.max(10, scale / 15)}px sans-serif`;
      stepwiseCtx.textAlign = 'center';
      stepwiseCtx.textBaseline = 'bottom';
      const label = `(${v.i},${v.j})`;
      stepwiseCtx.fillText(label, x, y - vertexRadius - 2);
    }

    stepwiseCtx.restore();

    // Title
    stepwiseCtx.fillStyle = '#333';
    stepwiseCtx.font = '14px sans-serif';
    stepwiseCtx.textAlign = 'left';
    stepwiseCtx.fillText(`T_${k} from face weights`, 10, 20);
  }

  // Update T-embedding display based on current face count
  function updateTembFromFaceWeights() {
    if (!wasmReady || !getTembeddingLevelJSON) {
      currentTembLevelData = null;
      tembFromFaceWeightsK = -1;
      renderTembFromFaceWeights();
      return;
    }

    // Get face count from the current Aztec graph
    let ptr = getAztecFacesJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let facesData = JSON.parse(jsonStr);
    const numFaces = facesData.faces ? facesData.faces.length : 0;

    const k = faceCountToK(numFaces);
    tembFromFaceWeightsK = k;

    if (k >= 0) {
      // At a checkpoint - compute T_k
      ptr = getTembeddingLevelJSON(k);
      jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);
      currentTembLevelData = JSON.parse(jsonStr);
    } else {
      currentTembLevelData = null;
    }

    renderTembFromFaceWeights();
  }

  // T-embedding k level state (for face weights based T_k)
  let currentK = 0;
  let maxK = 0;  // Updated based on stored face weights
  let currentSimulationN = 6;  // Track current simulation dimension for change detection

  // Vertex selection state
  let selectedVertex = null;
  let highlightedDeps = new Set();
  let vertexScreenPositions = [];

  // T-embedding vertex screen positions for click detection
  let tembVertexScreenPositions = [];
  let tembCurrentVertices = [];  // Store current vertices data

  // Canvas pan/zoom for T-embedding (stepwise)
  let stepwiseZoom = 1.0;
  let stepwisePanX = 0, stepwisePanY = 0;
  let stepwiseIsPanning = false;
  let stepwiseLastPanX = 0, stepwiseLastPanY = 0;

  // Canvas pan/zoom for main 2D T-embedding
  let main2DZoom = 1.0;
  let main2DPanX = 0, main2DPanY = 0;
  let main2DIsPanning = false;
  let main2DLastPanX = 0, main2DLastPanY = 0;
  let main2DVertexScreenPositions = [];  // Store vertex positions for click detection
  let main2DSelectedVertex = null;  // Currently selected vertex for display

  // ========== AZTEC DIAMOND GRAPH STATE ==========
  let aztecLevel = 3;
  let aztecReductionStep = 0;  // 0=original, 1=gauge, 2=contracted, 3=finalized
  let aztecVertices = [];
  let aztecEdges = [];
  let aztecBlackQuadCenters = [];  // Centers of black quads (for shading at step 8+)
  let aztecZoom = 1.33;
  let aztecPanX = 0, aztecPanY = 0;
  let aztecIsPanning = false;
  let aztecDidPan = false;
  let aztecLastPanX = 0, aztecLastPanY = 0;
  let aztecVertexScreenPositions = [];
  let aztecEdgeScreenPositions = [];
  let aztecFaceScreenPositions = [];
  let selectedAztecVertex = null;
  let selectedAztecEdge = null;
  let selectedAztecFace = null;

  // Generate random weight from 0.5 to 2.0 with step 0.1
  function randomWeight() {
    const steps = Math.floor(Math.random() * 16); // 0-15 steps
    return 0.5 + steps * 0.1;
  }

  // Generate Aztec diamond graph vertices for level k
  function generateAztecVertices(k) {
    const vertices = [];
    // Vertices at half-integer coordinates where |x| + |y| <= k + 0.5
    for (let i = -k; i <= k; i++) {
      for (let j = -k; j <= k; j++) {
        const x = i + 0.5;
        const y = j + 0.5;
        if (Math.abs(x) + Math.abs(y) <= k + 0.5) {
          // Bipartite coloring depends on i + j + k
          const isWhite = ((i + j + k) % 2 === 0);
          vertices.push({ x, y, isWhite, key: `${x},${y}` });
        }
      }
    }
    return vertices;
  }

  // Generate edges between adjacent vertices
  function generateAztecEdges(vertices) {
    const vertexSet = new Set(vertices.map(v => v.key));
    const edges = [];

    for (const v of vertices) {
      // Right neighbor (x+1, y)
      const rightKey = `${v.x + 1},${v.y}`;
      if (vertexSet.has(rightKey)) {
        edges.push({
          x1: v.x, y1: v.y,
          x2: v.x + 1, y2: v.y,
          weight: randomWeight(),
          key: `h:${v.x},${v.y}`
        });
      }
      // Top neighbor (x, y+1)
      const topKey = `${v.x},${v.y + 1}`;
      if (vertexSet.has(topKey)) {
        edges.push({
          x1: v.x, y1: v.y,
          x2: v.x, y2: v.y + 1,
          weight: randomWeight(),
          key: `v:${v.x},${v.y}`
        });
      }
    }
    return edges;
  }

  // Compute face weights for all faces in the Aztec diamond
  // Face weight formula: X = (w1→b1 × w2→b2) / (w2→b1 × w1→b2)
  // where w1, b1, w2, b2 are vertices in clockwise order starting from white
  function computeFaceWeights() {
    if (aztecVertices.length === 0 || aztecEdges.length === 0) return [];

    // Build vertex lookup map: "x,y" -> vertex object
    const vertexMap = new Map();
    for (const v of aztecVertices) {
      vertexMap.set(`${v.x},${v.y}`, v);
    }

    // Build edge lookup map: canonical key -> edge weight
    const edgeMap = new Map();
    for (const e of aztecEdges) {
      // Canonical key: smaller coordinate pair first
      const key = e.x1 < e.x2 || (e.x1 === e.x2 && e.y1 < e.y2)
        ? `${e.x1},${e.y1}-${e.x2},${e.y2}`
        : `${e.x2},${e.y2}-${e.x1},${e.y1}`;
      edgeMap.set(key, e.weight);
    }

    // Helper to get edge weight between two vertices
    function getEdgeWeight(x1, y1, x2, y2) {
      const key = x1 < x2 || (x1 === x2 && y1 < y2)
        ? `${x1},${y1}-${x2},${y2}`
        : `${x2},${y2}-${x1},${y1}`;
      return edgeMap.get(key);
    }

    const faceWeights = [];
    const k = aztecLevel;

    // Iterate over all possible face positions (integer coordinates)
    for (let i = -k; i < k; i++) {
      for (let j = -k; j < k; j++) {
        // Face corners at half-integer coordinates
        const blX = i + 0.5, blY = j + 0.5;      // bottom-left
        const brX = i + 1.5, brY = j + 0.5;      // bottom-right
        const tlX = i + 0.5, tlY = j + 1.5;      // top-left
        const trX = i + 1.5, trY = j + 1.5;      // top-right

        // Check if all 4 vertices exist
        const blV = vertexMap.get(`${blX},${blY}`);
        const brV = vertexMap.get(`${brX},${brY}`);
        const tlV = vertexMap.get(`${tlX},${tlY}`);
        const trV = vertexMap.get(`${trX},${trY}`);

        if (!blV || !brV || !tlV || !trV) continue;

        // Check if all 4 edges exist
        const bottom = getEdgeWeight(blX, blY, brX, brY);
        const right = getEdgeWeight(brX, brY, trX, trY);
        const top = getEdgeWeight(tlX, tlY, trX, trY);
        const left = getEdgeWeight(blX, blY, tlX, tlY);

        if (bottom === undefined || right === undefined ||
            top === undefined || left === undefined) continue;

        // Compute face weight based on which diagonal is white
        // BL and TR have same parity, BR and TL have same parity
        let faceWeight;
        if (blV.isWhite) {
          // Type A: white at BL/TR, clockwise from BL: w1=BL, b1=BR, w2=TR, b2=TL
          // X = (w1→b1 × w2→b2) / (w2→b1 × w1→b2) = (bottom × top) / (right × left)
          faceWeight = (bottom * top) / (right * left);
        } else {
          // Type B: white at BR/TL, clockwise from BR: w1=BR, b1=TR, w2=TL, b2=BL
          // X = (w1→b1 × w2→b2) / (w2→b1 × w1→b2) = (right × left) / (top × bottom)
          faceWeight = (right * left) / (top * bottom);
        }

        // Compute centroid (at integer coordinates i+1, j+1)
        const cx = (blX + brX + tlX + trX) / 4;
        const cy = (blY + brY + tlY + trY) / 4;

        // Store face with index coordinates and type
        faceWeights.push({
          cx, cy,
          weight: faceWeight,
          faceI: i,           // Face index (BL corner at i+0.5, j+0.5)
          faceJ: j,
          isTypeA: blV.isWhite  // Type A if BL is white
        });
      }
    }

    return faceWeights;
  }

  // Initialize Aztec graph (calls C++ via WASM)
  function initAztecGraph(k) {
    if (!wasmReady) {
      // Fallback to JS generation if WASM not ready
      aztecLevel = k;
      aztecVertices = generateAztecVertices(k);
      aztecEdges = generateAztecEdges(aztecVertices);
      updateAztecUI();
      renderAztecGraph();
      return;
    }

    // Generate graph in C++
    generateAztecGraph(k);

    // Get JSON from C++
    let ptr = getAztecGraphJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let graphData = JSON.parse(jsonStr);

    aztecLevel = graphData.level;
    aztecReductionStep = graphData.reductionStep || 0;
    aztecVertices = graphData.vertices;
    aztecBlackQuadCenters = graphData.blackQuadCenters || [];

    // Convert edges from index-based to coordinate-based for rendering
    aztecEdges = graphData.edges.map(e => ({
      x1: aztecVertices[e.v1].x,
      y1: aztecVertices[e.v1].y,
      x2: aztecVertices[e.v2].x,
      y2: aztecVertices[e.v2].y,
      weight: e.weight,
      isHorizontal: e.isHorizontal,
      gaugeTransformed: e.gaugeTransformed || false
    }));

    updateAztecUI();
    renderAztecGraph();
  }

  // Update Aztec UI state (button states and step description)
  function updateAztecUI() {
    // Update button states
    if (wasmReady) {
      document.getElementById('aztec-up-btn').disabled = !canAztecStepUp();
      document.getElementById('aztec-down-btn').disabled = !canAztecStepDown();
      document.getElementById('aztec-fast-down-btn').disabled = !canAztecStepDown();
      document.getElementById('aztec-fast-up-btn').disabled = !canAztecStepUp();
    }
  }

  // Get step description text
  function getAztecStepDesc() {
    const stepDescs = {
      0: `Level ${aztecLevel}: Original Aztec diamond graph`,
      1: `Level ${aztecLevel}: Step 1 — Black gauge transform`,
      2: `Level ${aztecLevel}: Step 2 — White gauge transform`,
      3: `Level ${aztecLevel}: Step 3 — Contract boundary vertices`,
      4: `Level ${aztecLevel}: Step 4 — Black contraction (merge diagonal)`,
      5: `Level ${aztecLevel}: Step 5 — White contraction (merge diagonal)`,
      6: `Level ${aztecLevel}: Fold 1 — Shading (mark faces)`,
      7: `Level ${aztecLevel}: Fold 2 — Mark diagonal vertices`,
      8: `Level ${aztecLevel}: Fold 3 — Split green vertices`,
      9: `Level ${aztecLevel}: Fold 3b — Diagonal gauge transform`,
      10: `Level ${aztecLevel}: Fold 4 — Urban renewal`,
      11: `Level ${aztecLevel}: Fold 5 — Combine double edges`
    };
    return stepDescs[aztecReductionStep] || `Level ${aztecLevel}: Step ${aztecReductionStep}`;
  }

  // Refresh Aztec graph state from C++
  function refreshAztecFromCpp() {
    let ptr = getAztecGraphJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let graphData = JSON.parse(jsonStr);

    aztecLevel = graphData.level;
    aztecReductionStep = graphData.reductionStep || 0;
    aztecVertices = graphData.vertices;
    aztecBlackQuadCenters = graphData.blackQuadCenters || [];
    aztecEdges = graphData.edges.map(e => ({
      x1: aztecVertices[e.v1].x,
      y1: aztecVertices[e.v1].y,
      x2: aztecVertices[e.v2].x,
      y2: aztecVertices[e.v2].y,
      weight: e.weight,
      isHorizontal: e.isHorizontal,
      gaugeTransformed: e.gaugeTransformed || false
    }));

    updateAztecUI();
    renderAztecGraph();
    updateFaceWeightsOutput();
  }

  // Render Aztec diamond graph
  function renderAztecGraph() {
    const dpr = window.devicePixelRatio || 1;
    const rect = aztecCanvas.getBoundingClientRect();
    aztecCanvas.width = rect.width * dpr;
    aztecCanvas.height = rect.height * dpr;
    aztecCtx.scale(dpr, dpr);

    aztecCtx.fillStyle = '#fafafa';
    aztecCtx.fillRect(0, 0, rect.width, rect.height);

    // Draw step description floating on canvas (upper left corner)
    const stepDesc = getAztecStepDesc();
    aztecCtx.font = '11px sans-serif';
    aztecCtx.fillStyle = 'rgba(100, 100, 100, 0.9)';
    aztecCtx.textAlign = 'left';
    aztecCtx.textBaseline = 'top';
    aztecCtx.fillText(stepDesc, 8, 8);

    if (aztecVertices.length === 0) return;

    const k = aztecLevel;
    const padding = 40;
    const range = 2 * k + 2;
    const baseScale = Math.min(rect.width - 2 * padding, rect.height - 2 * padding) / range;
    const scale = baseScale * aztecZoom;

    const cx = rect.width / 2 + aztecPanX * aztecZoom;
    const cy = rect.height / 2 + aztecPanY * aztecZoom;

    aztecCtx.save();
    aztecCtx.translate(cx, cy);

    const showWeights = document.getElementById('show-aztec-weights-chk').checked;

    // Draw shaded black quads (faces containing purple stars)
    if (aztecReductionStep >= 6) {
      // For each black quad center, find the 4 closest vertices and draw as quad
      for (const center of aztecBlackQuadCenters) {
        // Get all vertices with their distances to center
        const vertsWithDist = aztecVertices.map(v => ({
          x: v.x, y: v.y,
          dist: Math.hypot(v.x - center.x, v.y - center.y)
        }));

        // Sort by distance and take the 4 closest
        vertsWithDist.sort((a, b) => a.dist - b.dist);
        const quadVerts = vertsWithDist.slice(0, 4);

        // Sort by angle around center to get correct winding order
        quadVerts.sort((a, b) => {
          const angleA = Math.atan2(a.y - center.y, a.x - center.x);
          const angleB = Math.atan2(b.y - center.y, b.x - center.x);
          return angleA - angleB;
        });

        // Draw the shaded quad
        aztecCtx.fillStyle = 'rgba(100, 100, 100, 0.35)';
        aztecCtx.beginPath();
        aztecCtx.moveTo(quadVerts[0].x * scale, -quadVerts[0].y * scale);
        for (let i = 1; i < quadVerts.length; i++) {
          aztecCtx.lineTo(quadVerts[i].x * scale, -quadVerts[i].y * scale);
        }
        aztecCtx.closePath();
        aztecCtx.fill();
      }

      // Draw purple stars at black quad centers
      const drawStar = (cx, cy, r, points) => {
        aztecCtx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? r : r * 0.4;
          const angle = (i * Math.PI / points) - Math.PI / 2;
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          if (i === 0) aztecCtx.moveTo(x, y);
          else aztecCtx.lineTo(x, y);
        }
        aztecCtx.closePath();
      };

      for (const center of aztecBlackQuadCenters) {
        const sx = center.x * scale;
        const sy = -center.y * scale;
        aztecCtx.fillStyle = 'rgba(128, 0, 128, 0.8)';
        drawStar(sx, sy, 8, 5);
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#400040';
        aztecCtx.lineWidth = 1;
        aztecCtx.stroke();
      }
    }

    // Draw edges and store positions for click detection
    // Group edges by vertex pair to detect multi-edges
    const edgeGroups = new Map();
    for (let i = 0; i < aztecEdges.length; i++) {
      const e = aztecEdges[i];
      // Create canonical key for the vertex pair
      const key = e.x1 < e.x2 || (e.x1 === e.x2 && e.y1 < e.y2)
        ? `${e.x1},${e.y1}-${e.x2},${e.y2}`
        : `${e.x2},${e.y2}-${e.x1},${e.y1}`;
      if (!edgeGroups.has(key)) edgeGroups.set(key, []);
      edgeGroups.get(key).push({idx: i, edge: e});
    }

    aztecEdgeScreenPositions = [];


    for (const [key, edges] of edgeGroups) {
      const numEdges = edges.length;

      for (let j = 0; j < numEdges; j++) {
        const {idx, edge: e} = edges[j];

        // Highlight gauge-transformed edges
        if (e.gaugeTransformed) {
          aztecCtx.strokeStyle = '#ff6600';
          aztecCtx.lineWidth = Math.max(2, scale / 15);
        } else {
          aztecCtx.strokeStyle = '#333';
          aztecCtx.lineWidth = Math.max(1, scale / 30);
        }

        const x1 = e.x1 * scale, y1 = -e.y1 * scale;
        const x2 = e.x2 * scale, y2 = -e.y2 * scale;

        aztecCtx.beginPath();

        if (numEdges === 1) {
          // Single edge: draw straight line
          aztecCtx.moveTo(x1, y1);
          aztecCtx.lineTo(x2, y2);
        } else {
          // Multi-edge: draw as curved arc
          // Use consistent direction (normalize so "smaller" endpoint is first)
          let ex1 = x1, ey1 = y1, ex2 = x2, ey2 = y2;
          if (x1 > x2 || (x1 === x2 && y1 > y2)) {
            ex1 = x2; ey1 = y2; ex2 = x1; ey2 = y1;
          }
          const dx = ex2 - ex1, dy = ey2 - ey1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 0.001) {
            // Skip degenerate edges
            aztecCtx.moveTo(x1, y1);
            aztecCtx.lineTo(x2, y2);
          } else {
            const perpX = -dy / len, perpY = dx / len;

            // Distribute curves symmetrically around the straight line
            const curveOffset = (j - (numEdges - 1) / 2) * Math.max(32, scale * 0.8);
            const ctrlX = (ex1 + ex2) / 2 + perpX * curveOffset;
            const ctrlY = (ey1 + ey2) / 2 + perpY * curveOffset;

            // Draw curved edge with distinct color for visibility
            aztecCtx.strokeStyle = ['#ff0000', '#0000ff', '#00ff00', '#ff00ff'][j % 4];
            aztecCtx.lineWidth = 3;

            aztecCtx.moveTo(x1, y1);
            aztecCtx.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
          }
        }
        aztecCtx.stroke();

        // Compute midpoint (on curve for multi-edges)
        let midX, midY;
        if (numEdges === 1) {
          midX = (x1 + x2) / 2;
          midY = (y1 + y2) / 2;
        } else {
          // Use same normalized direction as curve drawing
          let ex1 = x1, ey1 = y1, ex2 = x2, ey2 = y2;
          if (x1 > x2 || (x1 === x2 && y1 > y2)) {
            ex1 = x2; ey1 = y2; ex2 = x1; ey2 = y1;
          }
          const dx = ex2 - ex1, dy = ey2 - ey1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const perpX = -dy / len, perpY = dx / len;
          const curveOffset = (j - (numEdges - 1) / 2) * Math.max(32, scale * 0.8);
          midX = (x1 + x2) / 2 + perpX * curveOffset * 0.5;
          midY = (y1 + y2) / 2 + perpY * curveOffset * 0.5;
        }

        // Store edge midpoint for click detection
        aztecEdgeScreenPositions.push({
          idx: idx,
          screenX: midX + cx,
          screenY: midY + cy,
          edge: e
        });

        // Draw weight label in rectangular bubble
        if (showWeights) {
          const label = e.weight.toFixed(2);

          const fontSize = Math.max(8, Math.min(11, scale / 4));
          aztecCtx.font = `${fontSize}px sans-serif`;
          const textWidth = aztecCtx.measureText(label).width;
          const padX = 3, padY = 2;
          const boxW = textWidth + padX * 2;
          const boxH = fontSize + padY * 2;

          aztecCtx.fillStyle = '#fff';
          aztecCtx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
          aztecCtx.strokeStyle = '#999';
          aztecCtx.lineWidth = 0.5;
          aztecCtx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);

          aztecCtx.fillStyle = '#333';
          aztecCtx.textAlign = 'center';
          aztecCtx.textBaseline = 'middle';
          aztecCtx.fillText(label, midX, midY);
        }
      }
    }

    // Draw face weights
    const showFaceWeights = document.getElementById('show-face-weights-chk').checked;
    aztecFaceScreenPositions = [];  // Reset for click detection
    if (showFaceWeights) {
      // Get face weights from C++ if WASM is ready, otherwise fall back to JS
      let faceWeights = [];
      if (wasmReady && getAztecFacesJSON) {
        let ptr = getAztecFacesJSON();
        let jsonStr = Module.UTF8ToString(ptr);
        freeString(ptr);
        faceWeights = JSON.parse(jsonStr);
      } else {
        faceWeights = computeFaceWeights();
      }

      for (let idx = 0; idx < faceWeights.length; idx++) {
        const face = faceWeights[idx];
        const x = face.cx * scale;
        const y = -face.cy * scale;

        // Store screen position for click detection
        aztecFaceScreenPositions.push({
          idx: idx,
          screenX: x + cx,
          screenY: y + cy,
          face: face
        });

        // Check if this face is selected (compare by centroid since structure may differ)
        const isSelected = (selectedAztecFace !== null &&
                           Math.abs(selectedAztecFace.cx - face.cx) < 0.01 &&
                           Math.abs(selectedAztecFace.cy - face.cy) < 0.01);

        const label = face.weight.toFixed(2);
        const fontSize = Math.max(8, Math.min(11, scale / 4));
        aztecCtx.font = `${fontSize}px sans-serif`;
        const textWidth = aztecCtx.measureText(label).width;
        const padX = 3, padY = 2;
        const boxW = textWidth + padX * 2;
        const boxH = fontSize + padY * 2;

        // Light blue background (red if selected) to distinguish from edge weights
        aztecCtx.fillStyle = isSelected ? '#ffcccc' : '#e6f3ff';
        aztecCtx.fillRect(x - boxW / 2, y - boxH / 2, boxW, boxH);
        aztecCtx.strokeStyle = isSelected ? '#cc0000' : '#6699cc';
        aztecCtx.lineWidth = isSelected ? 1.5 : 0.5;
        aztecCtx.strokeRect(x - boxW / 2, y - boxH / 2, boxW, boxH);

        aztecCtx.fillStyle = isSelected ? '#cc0000' : '#003366';
        aztecCtx.textAlign = 'center';
        aztecCtx.textBaseline = 'middle';
        aztecCtx.fillText(label, x, y);
      }
    }

    // Draw vertices
    let vertexRadius = Math.max(4, scale / 8);
    if (aztecReductionStep == 8) vertexRadius /= 3;  // Smaller vertices at split step
    aztecVertexScreenPositions = [];

    for (let i = 0; i < aztecVertices.length; i++) {
      const v = aztecVertices[i];
      const x = v.x * scale;
      const y = -v.y * scale;

      // Store screen position for click detection
      aztecVertexScreenPositions.push({
        idx: i,
        screenX: x + cx,
        screenY: y + cy,
        vertex: v
      });

      const isSelected = (selectedAztecVertex === i);
      const inVgauge = v.inVgauge || false;
      const toContract = v.toContract || false;

      // Determine vertex size
      let radius = vertexRadius;
      if (isSelected) radius *= 1.5;
      if (toContract) radius *= 1.3;

      aztecCtx.beginPath();
      aztecCtx.arc(x, y, radius, 0, Math.PI * 2);

      if (isSelected) {
        // Selected vertex: red highlight
        aztecCtx.fillStyle = '#ff0000';
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#cc0000';
        aztecCtx.lineWidth = 2;
        aztecCtx.stroke();
      } else if (toContract) {
        // Vertex to be contracted: orange fill
        aztecCtx.fillStyle = '#ff6600';
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#cc4400';
        aztecCtx.lineWidth = 2;
        aztecCtx.stroke();
      } else if (inVgauge) {
        // V_gauge vertex: green ring
        aztecCtx.fillStyle = v.isWhite ? '#fff' : '#000';
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#00cc00';
        aztecCtx.lineWidth = 3;
        aztecCtx.stroke();
      } else if (v.isWhite) {
        // White vertex: hollow with black outline
        aztecCtx.fillStyle = '#fff';
        aztecCtx.fill();
        aztecCtx.strokeStyle = '#000';
        aztecCtx.lineWidth = Math.max(1, scale / 30);
        aztecCtx.stroke();
      } else {
        // Black vertex: filled
        aztecCtx.fillStyle = '#000';
        aztecCtx.fill();
      }
    }

    aztecCtx.restore();
  }

  // Aztec graph step down: advance reduction step (slow, single step)
  function aztecTransformDown() {
    if (!wasmReady) return;
    aztecGraphStepDown();
    refreshAztecFromCpp();
  }

  // Aztec graph step up: restore previous state (slow, single step)
  function aztecTransformUp() {
    if (!wasmReady) return;
    aztecGraphStepUp();
    refreshAztecFromCpp();
  }

  // Fast forward: jump to next key state
  // Key states: Original(0) -> Step5 -> Fold5(11) -> next level Fold5 -> ... -> Level2 Fold1(6)
  function aztecFastForward() {
    if (!wasmReady) return;
    if (!canAztecStepDown()) return;

    const currentStep = getAztecReductionStep();

    if (currentStep < 5) {
      // Jump to step 5
      while (getAztecReductionStep() < 5 && canAztecStepDown()) {
        aztecGraphStepDown();
      }
    } else if (currentStep < 11) {
      // Jump to step 11 (Fold 5)
      while (getAztecReductionStep() < 11 && canAztecStepDown()) {
        aztecGraphStepDown();
      }
    } else {
      // At step 11, jump to next level's Fold 5 (or Level 2 Fold 1 if at level 3)
      // Step from 11 takes us to next level step 0, then continue to step 11 (or 6)
      if (canAztecStepDown()) {
        aztecGraphStepDown();  // Now at next level step 0
        // Check current level by refreshing
        refreshAztecFromCpp();
        const targetStep = (aztecLevel === 2) ? 6 : 11;
        while (getAztecReductionStep() < targetStep && canAztecStepDown()) {
          aztecGraphStepDown();
        }
      }
    }
    refreshAztecFromCpp();
  }

  // Fast backward: jump to previous key state
  // Key states: Level2 Fold1 <- ... <- LevelN-1 Fold5 <- LevelN Fold5 <- LevelN Step5 <- Original
  function aztecFastBackward() {
    if (!wasmReady) return;
    if (!canAztecStepUp()) return;

    const currentStep = getAztecReductionStep();
    const originalLevel = maxK + 2;  // The original Aztec diamond level

    if (currentStep === 0) {
      // At step 0 of original level - can't go back further
      // (shouldn't happen since canAztecStepUp would be false)
      return;
    } else if (currentStep <= 5 && aztecLevel === originalLevel) {
      // At original level steps 1-5: go back to step 0
      while (getAztecReductionStep() > 0 && canAztecStepUp()) {
        aztecGraphStepUp();
      }
    } else if (currentStep <= 11 && aztecLevel === originalLevel) {
      // At original level steps 6-11: go back to step 5
      while (getAztecReductionStep() > 5 && canAztecStepUp()) {
        aztecGraphStepUp();
      }
    } else {
      // At a reduced level: go back to previous (higher) level's step 11
      // Keep stepping up until we reach step 11 at a higher level
      const targetLevel = aztecLevel + 1;
      while (canAztecStepUp()) {
        aztecGraphStepUp();
        refreshAztecFromCpp();  // Update aztecLevel
        if (aztecLevel === targetLevel && getAztecReductionStep() === 11) break;
      }
    }
    refreshAztecFromCpp();
  }

  // Randomize all edge weights (calls C++ via WASM)
  function randomizeWeights() {
    if (!wasmReady) {
      // Fallback to JS randomization
      for (const e of aztecEdges) {
        e.weight = randomWeight();
      }
      renderAztecGraph();
      return;
    }

    // Randomize in C++
    randomizeAztecWeights();

    // Re-fetch graph data
    let ptr = getAztecGraphJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let graphData = JSON.parse(jsonStr);

    // Update edges with new weights
    aztecEdges = graphData.edges.map(e => ({
      x1: aztecVertices[e.v1].x,
      y1: aztecVertices[e.v1].y,
      x2: aztecVertices[e.v2].x,
      y2: aztecVertices[e.v2].y,
      weight: e.weight,
      isHorizontal: e.isHorizontal
    }));

    renderAztecGraph();
  }

  // Handle click on Aztec graph canvas
  function handleAztecCanvasClick(e) {
    // Ignore click if we just panned
    if (aztecDidPan) {
      aztecDidPan = false;
      return;
    }

    const rect = aztecCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    const vertexThreshold = 15 * dpr;
    const edgeThreshold = 20 * dpr;
    const faceThreshold = 18 * dpr;
    let closestVertex = null;
    let closestVertexDist = Infinity;
    let closestEdge = null;
    let closestEdgeDist = Infinity;
    let closestFace = null;
    let closestFaceDist = Infinity;

    // Check vertices first (highest priority)
    for (const vp of aztecVertexScreenPositions) {
      const dx = clickX - vp.screenX * dpr;
      const dy = clickY - vp.screenY * dpr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < vertexThreshold && dist < closestVertexDist) {
        closestVertexDist = dist;
        closestVertex = vp;
      }
    }

    // Check faces if no vertex clicked (medium priority)
    if (!closestVertex) {
      for (const fp of aztecFaceScreenPositions) {
        const dx = clickX - fp.screenX * dpr;
        const dy = clickY - fp.screenY * dpr;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < faceThreshold && dist < closestFaceDist) {
          closestFaceDist = dist;
          closestFace = fp;
        }
      }
    }

    // Check edges if no vertex or face clicked
    if (!closestVertex && !closestFace) {
      for (const ep of aztecEdgeScreenPositions) {
        const dx = clickX - ep.screenX * dpr;
        const dy = clickY - ep.screenY * dpr;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < edgeThreshold && dist < closestEdgeDist) {
          closestEdgeDist = dist;
          closestEdge = ep;
        }
      }
    }

    const infoDiv = document.getElementById('aztec-vertex-info');

    if (closestVertex) {
      selectedAztecVertex = closestVertex.idx;
      selectedAztecEdge = null;
      selectedAztecFace = null;
      const v = closestVertex.vertex;
      // i + j + k parity determines color
      const i = Math.round(v.x - 0.5);
      const j = Math.round(v.y - 0.5);
      const parity = (i + j + aztecLevel) % 2;
      const colorType = v.isWhite ? `white (i+j+k = ${i}+${j}+${aztecLevel} = ${i+j+aztecLevel} even)`
                                  : `black (i+j+k = ${i}+${j}+${aztecLevel} = ${i+j+aztecLevel} odd)`;
      infoDiv.innerHTML = `<strong>V:</strong> (${v.x}, ${v.y}) &nbsp; | &nbsp; <strong>Color:</strong> ${colorType}`;
    } else if (closestFace) {
      selectedAztecFace = closestFace.face;
      selectedAztecVertex = null;
      selectedAztecEdge = null;
      const face = closestFace.face;
      const numFaces = aztecFaceScreenPositions.length;
      const faceClass = classifyFace(face.cx, face.cy, numFaces);
      let typeStr = faceClass.type;
      if (faceClass.type === 'beta' || faceClass.type === 'gamma') {
        typeStr = `${faceClass.type}(${faceClass.i},${faceClass.j})`;
      }
      const genStr = faceClass.k >= 0 ? `k=${faceClass.k}` : '';
      const weightStr = face.weight !== undefined ? face.weight.toFixed(6) : '?';
      infoDiv.innerHTML = `<strong>Type:</strong> ${typeStr} &nbsp; | &nbsp; <strong>Gen:</strong> ${genStr} &nbsp; | &nbsp; <strong>Center:</strong> (${face.cx.toFixed(2)}, ${face.cy.toFixed(2)}) &nbsp; | &nbsp; <strong>Weight:</strong> ${weightStr}`;
    } else if (closestEdge) {
      selectedAztecEdge = closestEdge.idx;
      selectedAztecVertex = null;
      selectedAztecFace = null;
      const edge = closestEdge.edge;
      const preciseWeight = edge.weight.toFixed(10);
      const orient = edge.isHorizontal ? 'horizontal' : 'vertical';
      const status = edge.gaugeTransformed ? ' (gauge transformed)' : '';
      infoDiv.innerHTML = `<strong>E:</strong> (${edge.x1}, ${edge.y1}) — (${edge.x2}, ${edge.y2}) &nbsp; | &nbsp; <strong>Weight:</strong> ${preciseWeight}${status}`;
    } else {
      selectedAztecVertex = null;
      selectedAztecEdge = null;
      selectedAztecFace = null;
      infoDiv.innerHTML = '<em>Click on a vertex, edge, or face weight to see details</em>';
    }

    renderAztecGraph();
  }

  // ========== T-EMBEDDING CODE (unchanged) ==========

  function initWasm() {
    if (typeof Module === 'undefined') {
      setTimeout(initWasm, 100);
      return;
    }

    loadingMsg.style.display = 'block';

    Module.onRuntimeInitialized = function() {
      setN = Module.cwrap('setN', null, ['number']);
      initCoefficients = Module.cwrap('initCoefficients', null, []);
      computeTembedding = Module.cwrap('computeTembedding', null, []);
      freeString = Module.cwrap('freeString', null, ['number']);

      // Aztec graph functions
      generateAztecGraph = Module.cwrap('generateAztecGraph', null, ['number']);
      getAztecGraphJSON = Module.cwrap('getAztecGraphJSON', 'number', []);
      getAztecFacesJSON = Module.cwrap('getAztecFacesJSON', 'number', []);
      getStoredFaceWeightsJSON = Module.cwrap('getStoredFaceWeightsJSON', 'number', []);
      getBetaRatiosJSON = Module.cwrap('getBetaRatiosJSON', 'number', []);
      getTembeddingLevelJSON = Module.cwrap('getTembeddingLevelJSON', 'number', ['number']);
      getOrigamiLevelJSON = Module.cwrap('getOrigamiLevelJSON', 'number', ['number']);
      randomizeAztecWeights = Module.cwrap('randomizeAztecWeights', null, []);
      setAztecWeightMode = Module.cwrap('setAztecWeightMode', null, ['number']);
      setRandomIIDParams = Module.cwrap('setRandomIIDParams', null, ['number', 'number']);
      setIIDDistribution = Module.cwrap('setIIDDistribution', null, ['number', 'number', 'number']);
      setLayeredParams = Module.cwrap('setLayeredParams', null, ['number', 'number', 'number', 'number', 'number']);
      setGammaParams = Module.cwrap('setGammaParams', null, ['number', 'number']);
      setPeriodicPeriod = Module.cwrap('setPeriodicPeriod', null, ['number', 'number']);
      setPeriodicWeight = Module.cwrap('setPeriodicWeight', null, ['number', 'number', 'number', 'number']);
      getPeriodicParams = Module.cwrap('getPeriodicParams', 'number', []);
      resetAztecGraphPreservingWeights = Module.cwrap('resetAztecGraphPreservingWeights', null, []);
      seedRng = Module.cwrap('seedRng', null, ['number']);
      seedRng(42);  // Fixed seed for reproducible results on load
      setAztecGraphLevel = Module.cwrap('setAztecGraphLevel', null, ['number']);
      aztecGraphStepDown = Module.cwrap('aztecGraphStepDown', null, []);
      aztecGraphStepUp = Module.cwrap('aztecGraphStepUp', null, []);
      getAztecReductionStep = Module.cwrap('getAztecReductionStep', 'number', []);
      canAztecStepUp = Module.cwrap('canAztecStepUp', 'number', []);
      canAztecStepDown = Module.cwrap('canAztecStepDown', 'number', []);
      getComputeTimeMs = Module.cwrap('getComputeTimeMs', 'number', []);
      clearTembLevels = Module.cwrap('clearTembLevels', null, []);
      clearStoredWeightsExport = Module.cwrap('clearStoredWeightsExport', null, []);

      wasmReady = true;

      // Auto-compute on load with randomized weights
      const n = parseN();
      currentSimulationN = n;  // Sync state on load
      setN(n);

      // Update stepwise section visibility based on n
      updateStepwiseSectionForN(n);

      // Initialize and compute with default Random IID weights
      initAztecGraph(n);
      seedRng(42);
      setRandomIIDParams(0.5, 2.0);
      setAztecWeightMode(1);  // Random IID mode
      computeAndDisplay();

      // Precompute all T-embedding levels for stepwise UI (only needed for small n)
      if (n <= STEP_BY_STEP_MAX_N) {
        for (let k = 0; k <= maxK; k++) {
          let ptr = getTembeddingLevelJSON(k);
          freeString(ptr);
        }
      }

      // Now hide loading message
      loadingMsg.style.display = 'none';

      // Store T-embedding Module reference before loading shuffling module
      const tembModule = Module;

      // Load shuffling WASM module dynamically
      loadShufflingModule(tembModule);
    };

    if (Module.calledRun) {
      Module.onRuntimeInitialized();
    }
  }

  // ========== RANDOM SAMPLE SHUFFLING ==========

  // Sample state
  let shufflingWasmReady = false;
  let shufflingModule = null;
  let simulateAztecWithWeightMatrix = null;
  let simulateAztecGammaDirect = null;
  let simulateAztecPeriodicDirect = null;
  let simulateAztecIIDDirect = null;
  let simulateAztecDoubleDimer = null;
  let shufflingFreeString = null;
  let shufflingGetProgress = null;
  let sampleDominoes = [];
  let sampleDominoes2 = [];  // Second configuration for double dimer mode
  let doubleDimerMode = false;
  let showDoubleEdges = true;
  let minLoopLength = 0;
  let sampleZoom = 1.0;
  let samplePanX = 0, samplePanY = 0;
  let samplePaletteIndex = 0;  // Default to first palette

  // Sample 3D view state
  let sampleIs3DView = false;
  let sampleRenderer3D = null;
  const sample3DContainer = document.getElementById('sample-3d-container');

  // 3D Vertex heights per domino type (4 types x 6 vertices)
  const vertexHeights = {
    0: [1, 2, 1, 0, -1, 0],    // Horiz type 0
    1: [0, -1, 0, 1, 2, 1],    // Horiz type 1
    2: [-1, -2, -1, 0, 1, 0],  // Vert type 2
    3: [0, 1, 0, -1, -2, -1]   // Vert type 3
  };

  // 3D Visual Presets for sample domino view (Three.js format, from ultimate-domino.md)
  const SAMPLE_3D_PRESETS = [
    {
      name: 'Default', icon: '☀️',
      background: 0xffffff,
      ambient: { intensity: 0.4 },
      hemisphere: { sky: 0xffffff, ground: 0x444444, intensity: 0.3 },
      directional: { intensity: 0.6, position: [10, 10, 15] },
      fill: { intensity: 0.25, position: [-10, -5, -10] },
      material: { type: 'standard', roughness: 0.5, metalness: 0.15, flatShading: true },
      edges: { color: 0x000000, opacity: 0.5 }
    },
    {
      name: 'Clean', icon: '✨',
      background: 0xfafafa,
      ambient: { intensity: 0.5 },
      hemisphere: { sky: 0xffffff, ground: 0xeeeeee, intensity: 0.2 },
      directional: { intensity: 0.7, position: [5, 15, 10] },
      fill: { intensity: 0.3, position: [-8, 5, -8] },
      material: { type: 'phong', shininess: 60, flatShading: true },
      edges: { color: 0x333333, opacity: 0.3 }
    },
    {
      name: 'Mathematical', icon: '📐',
      background: 0xffffff,
      ambient: { intensity: 0.6 },
      hemisphere: { sky: 0xffffff, ground: 0xffffff, intensity: 0.2 },
      directional: { intensity: 0.4, position: [0, 20, 0] },
      fill: { intensity: 0.2, position: [0, -10, 0] },
      material: { type: 'lambert', flatShading: true },
      edges: { color: 0x000000, opacity: 1.0 }
    },
    {
      name: 'Dramatic', icon: '🎭',
      background: 0x1a1a2e,
      ambient: { intensity: 0.35 },
      hemisphere: { sky: 0x6666aa, ground: 0x222244, intensity: 0.25 },
      directional: { intensity: 1.2, position: [15, 20, 5] },
      fill: { intensity: 0.3, position: [-10, 5, -5] },
      material: { type: 'standard', roughness: 0.3, metalness: 0.5, flatShading: true },
      edges: { color: 0x222222, opacity: 0.6 }
    },
    {
      name: 'Playful', icon: '🎨',
      background: 0xf0f8ff,
      ambient: { intensity: 0.5 },
      hemisphere: { sky: 0xaaddff, ground: 0xffddaa, intensity: 0.4 },
      directional: { intensity: 0.5, position: [10, 15, 10] },
      fill: { intensity: 0.35, position: [-10, 10, -5] },
      material: { type: 'phong', shininess: 100, flatShading: false },
      edges: { color: 0x444444, opacity: 0.2 }
    }
  ];

  // Simple 3D renderer for sample dominoes (based on domino.md approach)
  let sample3DScene, sample3DCamera, sample3DRenderer, sample3DControls, sample3DDominoGroup;
  let sample3DAnimating = false;
  let sample3DAutoRotate = false;
  let sample3DPresetIndex = 0;
  let sample3DAmbientLight, sample3DHemisphereLight, sample3DDirectionalLight, sample3DFillLight;
  let sample3DPerspective = false;  // false = orthographic, true = perspective
  let sample3DOrthoCamera, sample3DPerspCamera;  // Both camera types

  function applySample3DPreset(presetIndex) {
    if (!sample3DScene) return;
    const preset = SAMPLE_3D_PRESETS[presetIndex];
    sample3DScene.background = new THREE.Color(preset.background);
    if (sample3DAmbientLight) sample3DAmbientLight.intensity = preset.ambient.intensity;
    if (sample3DHemisphereLight) {
      sample3DHemisphereLight.color.setHex(preset.hemisphere.sky);
      sample3DHemisphereLight.groundColor.setHex(preset.hemisphere.ground);
      sample3DHemisphereLight.intensity = preset.hemisphere.intensity;
    }
    if (sample3DDirectionalLight) {
      sample3DDirectionalLight.intensity = preset.directional.intensity;
      sample3DDirectionalLight.position.set(...preset.directional.position);
    }
    if (sample3DFillLight) {
      sample3DFillLight.intensity = preset.fill.intensity;
      sample3DFillLight.position.set(...preset.fill.position);
    }
  }

  function initSample3D(container) {
    sample3DScene = new THREE.Scene();

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 400;
    const frustum = 100, aspect = w / h;

    // Create orthographic camera
    sample3DOrthoCamera = new THREE.OrthographicCamera(
      -frustum * aspect / 2, frustum * aspect / 2,
      frustum / 2, -frustum / 2, 1, 1000
    );
    sample3DOrthoCamera.position.set(0, 130, 0);
    sample3DOrthoCamera.lookAt(0, 0, 0);

    // Create perspective camera
    sample3DPerspCamera = new THREE.PerspectiveCamera(45, aspect, 1, 2000);
    sample3DPerspCamera.position.set(0, 130, 130);
    sample3DPerspCamera.lookAt(0, 0, 0);

    // Set active camera
    sample3DCamera = sample3DPerspective ? sample3DPerspCamera : sample3DOrthoCamera;

    sample3DRenderer = new THREE.WebGLRenderer({ antialias: true });
    sample3DRenderer.setSize(w, h);
    sample3DRenderer.setPixelRatio(window.devicePixelRatio);
    sample3DRenderer.getContext().getExtension('OES_element_index_uint');
    container.appendChild(sample3DRenderer.domElement);

    // Create lights (configured by preset)
    sample3DAmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sample3DScene.add(sample3DAmbientLight);
    sample3DHemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    sample3DScene.add(sample3DHemisphereLight);
    sample3DDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sample3DScene.add(sample3DDirectionalLight);
    sample3DFillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    sample3DScene.add(sample3DFillLight);

    // Apply initial preset
    applySample3DPreset(sample3DPresetIndex);

    sample3DControls = new THREE.OrbitControls(sample3DCamera, sample3DRenderer.domElement);
    sample3DControls.enableDamping = true;
    sample3DControls.dampingFactor = 0.25;
    sample3DControls.touches = { ONE: THREE.TOUCH.ROTATE };

    sample3DDominoGroup = new THREE.Group();
    sample3DScene.add(sample3DDominoGroup);

    if (!sample3DAnimating) {
      sample3DAnimating = true;
      animateSample3D();
    }
  }

  function animateSample3D() {
    if (!sample3DAnimating) return;
    requestAnimationFrame(animateSample3D);
    if (sample3DControls) sample3DControls.update();
    if (sample3DAutoRotate && sample3DDominoGroup) {
      sample3DDominoGroup.rotation.y += 0.005;
    }
    if (sample3DRenderer && sample3DScene && sample3DCamera) {
      sample3DRenderer.render(sample3DScene, sample3DCamera);
    }
  }

  function sample3DHandleResize() {
    const container = document.getElementById('sample-3d-container');
    if (!container || !sample3DRenderer) return;
    const w = container.clientWidth, h = container.clientHeight;
    const frustum = 100, aspect = w / h;
    // Update orthographic camera
    if (sample3DOrthoCamera) {
      sample3DOrthoCamera.left = -frustum * aspect / 2;
      sample3DOrthoCamera.right = frustum * aspect / 2;
      sample3DOrthoCamera.top = frustum / 2;
      sample3DOrthoCamera.bottom = -frustum / 2;
      sample3DOrthoCamera.updateProjectionMatrix();
    }
    // Update perspective camera
    if (sample3DPerspCamera) {
      sample3DPerspCamera.aspect = aspect;
      sample3DPerspCamera.updateProjectionMatrix();
    }
    sample3DRenderer.setSize(w, h);
  }

  // Height function calculation (from domino.md)
  function calculateSampleHeightFunction(dominoes) {
    if (!dominoes || dominoes.length === 0) return new Map();

    const minSidePx = Math.min(...dominoes.map(d => Math.min(d.w, d.h)));
    const unit = minSidePx / 2;
    if (unit <= 0) return new Map();

    const dominoData = dominoes.map(d => {
      const horiz = d.w > d.h;
      const orient = horiz ? 0 : 1;
      const sign = horiz
        ? (d.color === "green" ? -1 : 1)
        : (d.color === "yellow" ? -1 : 1);
      const gx = Math.round(d.x / unit);
      const gy = Math.round(d.y / unit);
      return [orient, sign, gx, gy];
    });

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
      if (o === 0) {
        const TL = [x, y+2], TM = [x+2, y+2], TR = [x+4, y+2];
        const BL = [x, y], BM = [x+2, y], BR = [x+4, y];
        addEdge(TL, TM, -s); addEdge(TM, TR, s);
        addEdge(BL, BM, s); addEdge(BM, BR, -s);
        addEdge(TL, BL, s); addEdge(TM, BM, 3*s);
        addEdge(TR, BR, s);
      } else {
        const TL = [x, y+4], TR = [x+2, y+4];
        const ML = [x, y+2], MR = [x+2, y+2];
        const BL = [x, y], BR = [x+2, y];
        addEdge(TL, TR, -s); addEdge(ML, MR, -3*s); addEdge(BL, BR, -s);
        addEdge(TL, ML, s); addEdge(ML, BL, -s);
        addEdge(TR, MR, -s); addEdge(MR, BR, s);
      }
    });

    const verts = Array.from(adj.keys()).map(k => {
      const [gx, gy] = k.split(',').map(Number);
      return { k, gx, gy };
    });
    if (verts.length === 0) return new Map();

    const root = verts.reduce((a, b) =>
      (a.gy < b.gy) || (a.gy === b.gy && a.gx <= b.gx) ? a : b
    ).k;

    const heights = new Map([[root, 0]]);
    const queue = [root];
    while (queue.length > 0) {
      const v = queue.shift();
      for (const [w, dh] of adj.get(v) || []) {
        if (!heights.has(w)) {
          heights.set(w, heights.get(v) + dh);
          queue.push(w);
        }
      }
    }
    return heights;
  }

  // Create domino face (from domino.md)
  function createSampleDominoFace(domino, heightMap) {
    const isHorizontal = domino.w > domino.h;
    const minSidePx = Math.min(domino.w, domino.h);
    const unit = minSidePx / 2;

    let pts;
    if (isHorizontal) {
      const w = 4, h = 2;
      const x = domino.x, y = domino.y;
      pts = [
        [x, y+h], [x+w, y+h], [x+w, y], [x, y], [x+w/2, y+h], [x+w/2, y]
      ];
    } else {
      const w = 2, h = 4;
      const x = domino.x, y = domino.y;
      pts = [
        [x, y], [x, y+h], [x+w, y+h], [x+w, y], [x, y+h/2], [x+w, y+h/2]
      ];
    }

    const vertices = [];
    for (const [px, py] of pts) {
      const gridX = Math.round(px / unit);
      const gridY = Math.round(py / unit);
      const key = `${gridX},${gridY}`;
      let z = heightMap.has(key) ? heightMap.get(key) : 0;
      vertices.push([px / 2.0, z, py / 2.0]);
    }

    return { color: domino.color, vertices };
  }

  function hexToThreeColor(hex) {
    return new THREE.Color(hex).getHex();
  }

  function renderSample3DDominoes(dominoes) {
    if (!sample3DDominoGroup) return;

    while (sample3DDominoGroup.children.length > 0) {
      const m = sample3DDominoGroup.children[0];
      sample3DDominoGroup.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
    }

    if (!dominoes || dominoes.length === 0) return;

    const heightMap = calculateSampleHeightFunction(dominoes);
    const palettes = window.ColorSchemes || [{ colors: ['#FFCD00', '#228B22', '#0057B7', '#DC143C'] }];
    const paletteColors = palettes[samplePaletteIndex] ? palettes[samplePaletteIndex].colors : palettes[0].colors;
    const colors = {
      yellow: hexToThreeColor(paletteColors[0]),
      green: hexToThreeColor(paletteColors[1]),
      blue: hexToThreeColor(paletteColors[2]),
      red: hexToThreeColor(paletteColors[3])
    };

    // Find N for scaling
    let maxCoord = 0;
    for (const d of dominoes) {
      maxCoord = Math.max(maxCoord, Math.abs(d.x + d.w), Math.abs(d.y + d.h));
    }
    const scale = 60 / Math.max(maxCoord, 1);

    for (const domino of dominoes) {
      const faceData = createSampleDominoFace(domino, heightMap);
      if (!faceData || !faceData.vertices) continue;

      try {
        const geom = new THREE.BufferGeometry();
        const pos = [];
        faceData.vertices.forEach(v => pos.push(v[0] * scale, v[1] * scale, v[2] * scale));
        geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

        const isH = (faceData.color === 'blue' || faceData.color === 'green');
        const indices = [0,1,3, 3,2,1, 0,1,4, 3,2,5];
        geom.setIndex(indices);
        geom.computeVertexNormals();

        const colorValue = colors[faceData.color] || 0x808080;
        const mat = new THREE.MeshStandardMaterial({
          color: colorValue,
          side: THREE.DoubleSide,
          flatShading: true
        });
        const mesh = new THREE.Mesh(geom, mat);
        sample3DDominoGroup.add(mesh);
      } catch (e) {
        console.error("Error creating 3D mesh:", e);
      }
    }

    if (sample3DDominoGroup.children.length > 0) {
      const box = new THREE.Box3().setFromObject(sample3DDominoGroup);
      const center = box.getCenter(new THREE.Vector3());
      sample3DDominoGroup.position.sub(center);
    }
  }

  // Wrapper class for compatibility with existing event handlers
  class SampleDomino3DRenderer {
    constructor(container) {
      initSample3D(container);
      window.addEventListener('resize', sample3DHandleResize);
    }
    handleResize() { sample3DHandleResize(); }
    zoomIn() {
      const factor = 0.8;
      if (sample3DPerspective && sample3DPerspCamera) {
        // For perspective, move camera closer
        sample3DPerspCamera.position.multiplyScalar(factor);
      } else if (sample3DOrthoCamera) {
        // For orthographic, shrink frustum
        sample3DOrthoCamera.left *= factor;
        sample3DOrthoCamera.right *= factor;
        sample3DOrthoCamera.top *= factor;
        sample3DOrthoCamera.bottom *= factor;
        sample3DOrthoCamera.updateProjectionMatrix();
      }
    }
    zoomOut() {
      const factor = 1.25;
      if (sample3DPerspective && sample3DPerspCamera) {
        // For perspective, move camera further
        sample3DPerspCamera.position.multiplyScalar(factor);
      } else if (sample3DOrthoCamera) {
        // For orthographic, expand frustum
        sample3DOrthoCamera.left *= factor;
        sample3DOrthoCamera.right *= factor;
        sample3DOrthoCamera.top *= factor;
        sample3DOrthoCamera.bottom *= factor;
        sample3DOrthoCamera.updateProjectionMatrix();
      }
    }
    resetView() {
      if (sample3DDominoGroup) sample3DDominoGroup.rotation.set(0, 0, 0);
      // Reset camera positions
      if (sample3DOrthoCamera) sample3DOrthoCamera.position.set(0, 130, 0);
      if (sample3DPerspCamera) sample3DPerspCamera.position.set(0, 130, 130);
      sample3DHandleResize();
      if (sample3DControls) sample3DControls.target.set(0, 0, 0);
    }
    togglePerspective() {
      sample3DPerspective = !sample3DPerspective;
      const newCamera = sample3DPerspective ? sample3DPerspCamera : sample3DOrthoCamera;
      if (newCamera && sample3DControls && sample3DRenderer) {
        sample3DCamera = newCamera;
        sample3DControls.object = newCamera;
        sample3DControls.update();
      }
      return sample3DPerspective;
    }
    cyclePreset() {
      sample3DPresetIndex = (sample3DPresetIndex + 1) % SAMPLE_3D_PRESETS.length;
      applySample3DPreset(sample3DPresetIndex);
      return SAMPLE_3D_PRESETS[sample3DPresetIndex];
    }
    set autoRotate(val) { sample3DAutoRotate = val; }
    get autoRotate() { return sample3DAutoRotate; }
    renderDominoes(dominoes) { renderSample3DDominoes(dominoes); }
  }

  // 3D View Management Functions
  function setSampleViewMode(use3D) {
    sampleIs3DView = use3D;
    const canvas2D = document.getElementById('sample-canvas');
    const container3D = document.getElementById('sample-3d-container');
    const toggle3DBtn = document.getElementById('sample-toggle-3d-btn');
    const perspectiveBtn = document.getElementById('sample-perspective-btn');
    const presetBtn = document.getElementById('sample-preset-btn');
    const rotateBtn = document.getElementById('sample-rotate-btn');

    if (use3D) {
      canvas2D.style.display = 'none';
      container3D.style.display = 'block';
      toggle3DBtn.textContent = '2D';
      toggle3DBtn.title = 'Switch to 2D view';
      perspectiveBtn.style.display = 'inline-block';
      presetBtn.style.display = 'inline-block';
      rotateBtn.style.display = 'inline-block';

      // Create 3D renderer if not exists, with slight delay to ensure container has dimensions
      setTimeout(() => {
        if (!sampleRenderer3D) {
          sampleRenderer3D = new SampleDomino3DRenderer(container3D);
        } else {
          sampleRenderer3D.handleResize();
        }
        updateSample3DView();
      }, 50);
    } else {
      canvas2D.style.display = 'block';
      container3D.style.display = 'none';
      toggle3DBtn.textContent = '3D';
      toggle3DBtn.title = 'Switch to 3D view';
      perspectiveBtn.style.display = 'none';
      presetBtn.style.display = 'none';
      rotateBtn.style.display = 'none';
      renderSample();
    }
  }

  function updateSample3DView() {
    if (!sampleIs3DView || !sampleRenderer3D) return;
    if (!sampleDominoes || sampleDominoes.length === 0) return;

    // Pass dominoes directly - renderer uses {x, y, w, h, color} format
    sampleRenderer3D.renderDominoes(sampleDominoes);
  }

  // Sample canvas and palette
  const sampleCanvas = document.getElementById('sample-canvas');
  const samplePaletteSelect = document.getElementById('sample-palette-select');

  // Initialize palette dropdown
  function initSamplePalette() {
    const palettes = window.ColorSchemes || [];
    samplePaletteSelect.innerHTML = '';
    // Find 'Domino Default' index
    let defaultIdx = palettes.findIndex(p => p.name === 'Domino Default');
    if (defaultIdx === -1) defaultIdx = 0;
    samplePaletteIndex = defaultIdx;

    palettes.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.name;
      if (i === defaultIdx) opt.selected = true;
      samplePaletteSelect.appendChild(opt);
    });
  }

  // Initialize palette on load
  if (samplePaletteSelect) {
    initSamplePalette();
    samplePaletteSelect.addEventListener('change', () => {
      samplePaletteIndex = parseInt(samplePaletteSelect.value);
      renderSample();
      updateSample3DView();
    });
  }
  const sampleCtx = sampleCanvas ? sampleCanvas.getContext('2d') : null;

  function loadShufflingModule(tembModule) {
    // Create script element to load shuffling WASM (modularized build)
    const script = document.createElement('script');
    script.src = '/js/2025-12-11-t-embedding-shuffling.js';
    script.onload = async function() {
      // createShufflingModule is a factory function that returns a Promise
      shufflingModule = await createShufflingModule();
      initShufflingFunctions();
    };
    document.head.appendChild(script);
  }

  function initShufflingFunctions() {
    simulateAztecWithWeightMatrix = shufflingModule.cwrap('simulateAztecWithWeightMatrix', 'number',
      ['number', 'number'], {async: true});
    simulateAztecGammaDirect = shufflingModule.cwrap('simulateAztecGammaDirect', 'number',
      ['number', 'number', 'number'], {async: true});
    simulateAztecPeriodicDirect = shufflingModule.cwrap('simulateAztecPeriodicDirect', 'number',
      ['number', 'number', 'number', 'number', 'number', 'number'], {async: true});
    simulateAztecIIDDirect = shufflingModule.cwrap('simulateAztecIIDDirect', 'number',
      ['number', 'number'], {async: true});
    simulateAztecDoubleDimer = shufflingModule.cwrap('simulateAztecDoubleDimer', 'number',
      ['number', 'number'], {async: true});
    shufflingFreeString = shufflingModule.cwrap('freeString', null, ['number']);
    shufflingGetProgress = shufflingModule.cwrap('getProgress', 'number', []);

    shufflingWasmReady = true;
    console.log('Shuffling WASM module ready');

    // Generate initial sample with default weights
    generateRandomSample();
  }

  // Get periodic edge weights from UI (alpha, beta, gamma tables)
  function getPeriodicEdgeWeightsFromUI(k, l) {
    const alpha = [], beta = [], gamma = [];
    for (let j = 0; j < k; j++) {
      alpha[j] = new Float64Array(l).fill(1.0);
      beta[j] = new Float64Array(l).fill(1.0);
      gamma[j] = new Float64Array(l).fill(1.0);
    }
    // Get from the editor inputs
    const inputs = document.querySelectorAll('#weights-tables input');
    inputs.forEach(input => {
      const type = parseInt(input.dataset.type);  // 0=alpha, 1=beta, 2=gamma
      const jIdx = parseInt(input.dataset.j);
      const iIdx = parseInt(input.dataset.i);
      if (jIdx < k && iIdx < l) {
        const val = parseFloat(input.value) || 1.0;
        if (type === 0) alpha[jIdx][iIdx] = val;
        else if (type === 1) beta[jIdx][iIdx] = val;
        else if (type === 2) gamma[jIdx][iIdx] = val;
      }
    });
    return { alpha, beta, gamma };
  }

  function getPeriodicWeightsFromUI(k, l) {
    // Extract periodic weights from the UI editor
    const weights = [];
    for (let j = 0; j < k; j++) {
      weights[j] = [];
      for (let i = 0; i < l; i++) {
        // Default to 1.0 if not found
        weights[j][i] = 1.0;
      }
    }
    // Try to get from the editor inputs
    const inputs = document.querySelectorAll('#weights-tables input[data-type="2"]');  // gamma weights
    inputs.forEach(input => {
      const jIdx = parseInt(input.dataset.j);
      const iIdx = parseInt(input.dataset.i);
      if (jIdx < k && iIdx < l) {
        weights[jIdx][iIdx] = parseFloat(input.value) || 1.0;
      }
    });
    return weights;
  }

  function getSampleSeed() {
    const preset = document.getElementById('weight-preset-select').value;
    if (preset === 'random-iid') {
      return parseInt(document.getElementById('random-seed').value) || 42;
    } else if (preset === 'random-layered') {
      return parseInt(document.getElementById('layered-seed').value) || 42;
    } else if (preset === 'random-gamma') {
      return parseInt(document.getElementById('gamma-seed').value) || 42;
    }
    return 42;
  }

  function getLayeredRegime() {
    const selected = document.querySelector('input[name="layered-regime"]:checked');
    return selected ? parseInt(selected.value) : 3;
  }

  // Simple seeded PRNG (xorshift)
  function createSeededRNG(seed) {
    let state = seed >>> 0;
    if (state === 0) state = 1;
    return function() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function generateIIDWeight(distType, rng) {
    if (distType === 'uniform') {
      const a = parseFloat(document.getElementById('iid-min').value) || 0.5;
      const b = parseFloat(document.getElementById('iid-max').value) || 2.0;
      return a + rng() * (b - a);
    } else if (distType === 'exponential') {
      return -Math.log(1 - rng());
    } else if (distType === 'pareto') {
      const alpha = parseFloat(document.getElementById('iid-pareto-alpha').value) || 2.0;
      const xmin = parseFloat(document.getElementById('iid-pareto-xmin').value) || 1.0;
      return xmin / Math.pow(1 - rng(), 1 / alpha);
    } else if (distType === 'geometric') {
      const p = parseFloat(document.getElementById('iid-geom-p').value) || 0.5;
      return Math.floor(Math.log(1 - rng()) / Math.log(1 - p)) + 1;
    }
    return 1.0;
  }

  function generateLayeredWeight(regime, diag, N, rng) {
    const sqrtN = Math.sqrt(N);
    switch (regime) {
      case 1: {
        const val1 = parseFloat(document.getElementById('layered1-val1').value) || 1;
        const val2 = parseFloat(document.getElementById('layered1-val2').value) || 1;
        const p1 = parseFloat(document.getElementById('layered1-prob1').value) || 0.5;
        return rng() < p1 ? val1 + 2/sqrtN : val2 - 1/sqrtN;
      }
      case 2: {
        const val1 = parseFloat(document.getElementById('layered2-val1').value) || 2;
        const val2 = parseFloat(document.getElementById('layered2-val2').value) || 1;
        return rng() < 1/sqrtN ? val1 : val2;
      }
      case 3: {
        const val1 = parseFloat(document.getElementById('layered3-val1').value) || 2;
        const val2 = parseFloat(document.getElementById('layered3-val2').value) || 0.5;
        const p1 = parseFloat(document.getElementById('layered3-prob1').value) || 0.5;
        return rng() < p1 ? val1 : val2;
      }
      case 4: {
        const w1 = parseFloat(document.getElementById('layered4-w1').value) || 2;
        const w2 = parseFloat(document.getElementById('layered4-w2').value) || 0.5;
        return diag % 2 === 0 ? w1 : w2;
      }
      case 5: {
        const a = parseFloat(document.getElementById('layered5-min').value) || 0.5;
        const b = parseFloat(document.getElementById('layered5-max').value) || 2.0;
        return a + rng() * (b - a);
      }
    }
    return 1.0;
  }

  // Gamma random using Marsaglia and Tsang's method
  function gammaRandom(shape, scale, rng) {
    if (shape < 1) {
      return gammaRandom(shape + 1, scale, rng) * Math.pow(rng(), 1 / shape);
    }
    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do {
        x = normalRandom(rng);
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = rng();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  function normalRandom(rng) {
    let u, v, s;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    return u * Math.sqrt(-2 * Math.log(s) / s);
  }

  async function generateRandomSample() {
    if (!shufflingWasmReady) return;

    let N = parseInt(document.getElementById('sample-N-input').value) || 6;
    const timeSpan = document.getElementById('sample-time');

    // Hard limit (memory constraint: algorithm uses O(N³) memory)
    if (N > 300) {
      N = 300;
      document.getElementById('sample-N-input').value = 300;
      timeSpan.textContent = 'N capped to 300 (memory limit). Sampling...';
    } else if (N > 200) {
      // Warning for large N
      timeSpan.textContent = 'Sampling (large N, may be slow)...';
    } else {
      timeSpan.textContent = 'Sampling...';
    }

    const startTime = performance.now();

    try {
      const preset = document.getElementById('weight-preset-select').value;
      let resultPtr;

      // For gamma preset, use the direct ab_gamma function (Duits-Van Peski model)
      if (preset === 'random-gamma') {
        const alpha = parseFloat(document.getElementById('gamma-alpha').value) || 0.2;
        const beta = parseFloat(document.getElementById('gamma-beta').value) || 0.25;

        if (doubleDimerMode) {
          // Generate gamma weights in JS for double dimer mode
          const dim = 2 * N;
          const seed = parseInt(document.getElementById('gamma-seed').value) || 42;
          const rng = createSeededRNG(seed);
          const numWeights = dim * dim;
          const edgeWeights = new Float64Array(numWeights);

          // ab_gamma pattern: for i even (0-indexed), j even: Gamma(beta), j odd: Gamma(alpha)
          // Everything else: 1.0
          for (let i = 0; i < dim; i++) {
            for (let j = 0; j < dim; j++) {
              if (i % 2 === 0) {
                if (j % 2 === 0) {
                  edgeWeights[i * dim + j] = gammaRandom(beta, 1.0, rng);
                } else {
                  edgeWeights[i * dim + j] = gammaRandom(alpha, 1.0, rng);
                }
              } else {
                edgeWeights[i * dim + j] = 1.0;
              }
            }
          }

          const weightsPtr = shufflingModule._malloc(numWeights * 8);
          for (let i = 0; i < numWeights; i++) {
            shufflingModule.setValue(weightsPtr + i * 8, edgeWeights[i], 'double');
          }
          resultPtr = await simulateAztecDoubleDimer(N, weightsPtr);
          shufflingModule._free(weightsPtr);
        } else {
          resultPtr = await simulateAztecGammaDirect(N, alpha, beta);
        }
      } else if (preset === 'periodic') {
        // For periodic preset, pass all three weight tables (alpha, beta, gamma)
        const k = parseInt(document.getElementById('periodic-k').value) || 2;
        const l = parseInt(document.getElementById('periodic-l').value) || 2;
        const periodicWeights = getPeriodicEdgeWeightsFromUI(k, l);

        // Build flat arrays for alpha, beta, gamma
        const alphaArray = new Float64Array(k * l);
        const betaArray = new Float64Array(k * l);
        const gammaArray = new Float64Array(k * l);

        for (let j = 0; j < k; j++) {
          for (let i = 0; i < l; i++) {
            alphaArray[j * l + i] = periodicWeights.alpha[j][i];
            betaArray[j * l + i] = periodicWeights.beta[j][i];
            gammaArray[j * l + i] = periodicWeights.gamma[j][i];
          }
        }

        if (doubleDimerMode) {
          // Generate full periodic weight matrix in JS for double dimer mode
          const dim = 2 * N;
          const numWeights = dim * dim;
          const edgeWeights = new Float64Array(numWeights);
          edgeWeights.fill(1.0);

          for (let i = 0; i < dim; i++) {
            if (i % 2 === 0) {  // Even rows only
              for (let j = 0; j < dim; j++) {
                const diagI = Math.floor(i / 2);
                const diagJ = Math.floor(j / 2);
                const pi = ((diagI % k) + k) % k;
                const pj = ((diagJ % l) + l) % l;

                if (j % 2 === 0) {
                  edgeWeights[i * dim + j] = betaArray[pi * l + pj];
                } else {
                  edgeWeights[i * dim + j] = alphaArray[pi * l + pj];
                }
              }
            }
          }

          const weightsPtr = shufflingModule._malloc(numWeights * 8);
          for (let i = 0; i < numWeights; i++) {
            shufflingModule.setValue(weightsPtr + i * 8, edgeWeights[i], 'double');
          }
          resultPtr = await simulateAztecDoubleDimer(N, weightsPtr);
          shufflingModule._free(weightsPtr);
        } else {
          // Allocate WASM memory for all three tables
          const alphaPtr = shufflingModule._malloc(k * l * 8);
          const betaPtr = shufflingModule._malloc(k * l * 8);
          const gammaPtr = shufflingModule._malloc(k * l * 8);

          for (let i = 0; i < k * l; i++) {
            shufflingModule.setValue(alphaPtr + i * 8, alphaArray[i], 'double');
            shufflingModule.setValue(betaPtr + i * 8, betaArray[i], 'double');
            shufflingModule.setValue(gammaPtr + i * 8, gammaArray[i], 'double');
          }

          resultPtr = await simulateAztecPeriodicDirect(N, k, l, alphaPtr, betaPtr, gammaPtr);

          shufflingModule._free(alphaPtr);
          shufflingModule._free(betaPtr);
          shufflingModule._free(gammaPtr);
        }
      } else if (preset === 'all-ones') {
        // Uniform weights: use gamma with alpha=beta=1 (gives Gamma(1)=Exp(1) which averages to 1)
        // Or just use IID with all 1s
        const dim = 2 * N;
        const numWeights = dim * dim;
        const edgeWeights = new Float64Array(numWeights);
        edgeWeights.fill(1.0);

        const weightsPtr = shufflingModule._malloc(numWeights * 8);
        for (let i = 0; i < numWeights; i++) {
          shufflingModule.setValue(weightsPtr + i * 8, 1.0, 'double');
        }
        if (doubleDimerMode) {
          resultPtr = await simulateAztecDoubleDimer(N, weightsPtr);
        } else {
          resultPtr = await simulateAztecIIDDirect(N, weightsPtr);
        }
        shufflingModule._free(weightsPtr);

      } else if (preset === 'random-iid') {
        // IID: each edge weight is independent random
        const dim = 2 * N;
        const seed = getSampleSeed();
        const rng = createSeededRNG(seed);
        const numWeights = dim * dim;
        const edgeWeights = new Float64Array(numWeights);

        for (let i = 0; i < numWeights; i++) {
          edgeWeights[i] = 0.5 + rng() * 1.5;  // Random in [0.5, 2.0]
        }

        const weightsPtr = shufflingModule._malloc(numWeights * 8);
        for (let i = 0; i < numWeights; i++) {
          shufflingModule.setValue(weightsPtr + i * 8, edgeWeights[i], 'double');
        }
        if (doubleDimerMode) {
          resultPtr = await simulateAztecDoubleDimer(N, weightsPtr);
        } else {
          resultPtr = await simulateAztecIIDDirect(N, weightsPtr);
        }
        shufflingModule._free(weightsPtr);

      } else if (preset === 'random-layered') {
        // Layered: exactly like 2025-06-25-random-edges.cpp
        // Weight at (i,j) where (i+j)%2==0 AND i%2==0 → random_variables[i/2]
        const dim = 2 * N;
        const seed = getSampleSeed();
        const rng = createSeededRNG(seed);
        const numWeights = dim * dim;
        const edgeWeights = new Float64Array(numWeights);

        // Get regime and parameters from UI
        const params = getLayeredParams();
        const { regime, p1, p2, prob1, prob2 } = params;
        const sqrtN = Math.sqrt(N);

        const numLayers = N;
        const layerWeights = new Float64Array(numLayers);

        // Generate layer weights based on regime (matching 2025-06-25-random-edges.cpp)
        for (let k = 0; k < numLayers; k++) {
          const r = rng();
          switch (regime) {
            case 1:
              // Regime 1 (Critical Scaling): p1 + 2/sqrt(N) with prob prob1, p2 - 1/sqrt(N) otherwise
              if (r < prob1) {
                layerWeights[k] = p1 + 2.0 / sqrtN;
              } else {
                layerWeights[k] = p2 - 1.0 / sqrtN;
              }
              break;
            case 2:
              // Regime 2 (Rare Event): p1 with prob 1/sqrt(N), p2 otherwise
              if (r < 1.0 / sqrtN) {
                layerWeights[k] = p1;
              } else {
                layerWeights[k] = p2;
              }
              break;
            case 3:
              // Regime 3 (Bernoulli): p1 with prob prob1, p2 otherwise
              if (r < prob1) {
                layerWeights[k] = p1;
              } else {
                layerWeights[k] = p2;
              }
              break;
            case 4:
              // Regime 4 (Deterministic Periodic): alternating p1, p2
              layerWeights[k] = (k % 2 === 0) ? p1 : p2;
              break;
            case 5:
              // Regime 5 (Continuous Uniform): uniform on [p1, p2]
              layerWeights[k] = p1 + r * (p2 - p1);
              break;
            default:
              // Default: 0.2 or 5.0 with equal probability
              layerWeights[k] = (r < 0.5) ? 0.2 : 5.0;
          }
        }

        for (let i = 0; i < dim; i++) {
          for (let j = 0; j < dim; j++) {
            if ((i + j) % 2 === 0 && i % 2 === 0) {
              edgeWeights[i * dim + j] = layerWeights[Math.floor(i / 2)];
            } else {
              edgeWeights[i * dim + j] = 1.0;
            }
          }
        }

        const weightsPtr = shufflingModule._malloc(numWeights * 8);
        for (let i = 0; i < numWeights; i++) {
          shufflingModule.setValue(weightsPtr + i * 8, edgeWeights[i], 'double');
        }
        if (doubleDimerMode) {
          resultPtr = await simulateAztecDoubleDimer(N, weightsPtr);
        } else {
          resultPtr = await simulateAztecIIDDirect(N, weightsPtr);
        }
        shufflingModule._free(weightsPtr);
      }

      // Parse result
      const jsonStr = shufflingModule.UTF8ToString(resultPtr);
      shufflingFreeString(resultPtr);

      const result = JSON.parse(jsonStr);

      // Handle double dimer mode: result has config1 and config2
      if (doubleDimerMode && result.config1) {
        sampleDominoes = result.config1;
        sampleDominoes2 = result.config2;
      } else {
        sampleDominoes = Array.isArray(result) ? result : [];
        sampleDominoes2 = [];
      }

      const elapsed = performance.now() - startTime;
      timeSpan.textContent = `${elapsed.toFixed(0)} ms`;

      // Reset view and render
      resetSampleView();
      renderSample();
      updateSample3DView();

    } catch (e) {
      console.error('Shuffling error:', e);
      timeSpan.textContent = 'Error';
    }
  }

  function resetSampleView() {
    if (sampleDominoes.length === 0) {
      sampleZoom = 1.0;
      samplePanX = 0;
      samplePanY = 0;
      return;
    }

    // Find bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const d of sampleDominoes) {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x + d.w);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y + d.h);
    }

    const rect = sampleCanvas.getBoundingClientRect();
    const regionW = maxX - minX;
    const regionH = maxY - minY;
    const padding = 0.9;

    const zoomX = (rect.width * padding) / regionW;
    const zoomY = (rect.height * padding) / regionH;
    sampleZoom = Math.min(zoomX, zoomY, 50);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    samplePanX = -centerX;
    samplePanY = -centerY;
  }

  function renderSample() {
    if (!sampleCanvas || !sampleCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = sampleCanvas.getBoundingClientRect();
    sampleCanvas.width = rect.width * dpr;
    sampleCanvas.height = rect.height * dpr;
    sampleCtx.scale(dpr, dpr);

    // Clear
    sampleCtx.fillStyle = '#fafafa';
    sampleCtx.fillRect(0, 0, rect.width, rect.height);

    if (sampleDominoes.length === 0) return;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Get colors from ColorSchemes using selected palette
    const palettes = window.ColorSchemes || [{ name: 'Domino Default', colors: ['#FFCD00', '#228B22', '#0057B7', '#DC143C'] }];
    const colors = palettes[samplePaletteIndex] ? palettes[samplePaletteIndex].colors : palettes[0].colors;

    // Color mapping: yellow=0, green=1, blue=2, red=3
    const colorMap = {
      'yellow': colors[0],
      'green': colors[1],
      'blue': colors[2],
      'red': colors[3]
    };

    // Get border width from input
    const borderWidthVal = parseFloat(document.getElementById('sample-border-input').value);
    const borderWidth = isNaN(borderWidthVal) ? 1 : borderWidthVal;

    // Double dimer mode: render loops
    if (doubleDimerMode && sampleDominoes2.length > 0) {
      renderDoubleDimerLoops(sampleCtx, centerX, centerY, sampleZoom, samplePanX, samplePanY);
      return;
    }

    // Standard domino rendering
    for (const d of sampleDominoes) {
      const sx = centerX + (d.x + samplePanX) * sampleZoom;
      const sy = centerY - (d.y + d.h + samplePanY) * sampleZoom;  // Flip Y
      const sw = d.w * sampleZoom;
      const sh = d.h * sampleZoom;

      sampleCtx.fillStyle = colorMap[d.color] || '#888';
      sampleCtx.fillRect(sx, sy, sw, sh);

      // Border
      if (borderWidth > 0) {
        sampleCtx.strokeStyle = '#000';
        sampleCtx.lineWidth = borderWidth;
        sampleCtx.strokeRect(sx, sy, sw, sh);
      }
    }
  }

  // Render double dimer configuration as loops
  function renderDoubleDimerLoops(ctx, centerX, centerY, zoom, panX, panY) {
    // Create edge key from domino
    const edgeKey = (d) => {
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h / 2;
      const horiz = d.w > d.h;
      let x1, y1, x2, y2;
      if (horiz) {
        x1 = cx - d.w / 4;
        x2 = cx + d.w / 4;
        y1 = y2 = cy;
      } else {
        x1 = x2 = cx;
        y1 = cy - d.h / 4;
        y2 = cy + d.h / 4;
      }
      const q = v => Math.round(v * 1000);
      return `${Math.min(q(x1), q(x2))},${Math.min(q(y1), q(y2))}-${Math.max(q(x1), q(x2))},${Math.max(q(y1), q(y2))}`;
    };

    // Build edge map
    const edgeMap = new Map();
    const addEdges = (list, type) => {
      for (const d of list) {
        const k = edgeKey(d);
        if (!edgeMap.has(k)) {
          edgeMap.set(k, { d, types: new Set() });
        }
        edgeMap.get(k).types.add(type);
      }
    };

    addEdges(sampleDominoes, 1);
    addEdges(sampleDominoes2, 2);

    // Compute loop lengths by tracing connected components
    // Build adjacency structure for loop detection
    const vertexToEdges = new Map();
    const allEdges = [];

    edgeMap.forEach((val, key) => {
      const d = val.d;
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h / 2;
      const horiz = d.w > d.h;
      let x1, y1, x2, y2;
      if (horiz) {
        x1 = cx - d.w / 4; x2 = cx + d.w / 4; y1 = y2 = cy;
      } else {
        x1 = x2 = cx; y1 = cy - d.h / 4; y2 = cy + d.h / 4;
      }

      const v1Key = `${Math.round(x1 * 1000)},${Math.round(y1 * 1000)}`;
      const v2Key = `${Math.round(x2 * 1000)},${Math.round(y2 * 1000)}`;

      const edgeInfo = { x1, y1, x2, y2, val, key, v1Key, v2Key, loopId: -1 };
      allEdges.push(edgeInfo);

      if (!vertexToEdges.has(v1Key)) vertexToEdges.set(v1Key, []);
      if (!vertexToEdges.has(v2Key)) vertexToEdges.set(v2Key, []);
      vertexToEdges.get(v1Key).push(edgeInfo);
      vertexToEdges.get(v2Key).push(edgeInfo);
    });

    // Find loops (connected components of non-double edges)
    let loopId = 0;
    const loopSizes = new Map();

    for (const edge of allEdges) {
      if (edge.loopId >= 0) continue;
      const isDouble = edge.val.types.has(1) && edge.val.types.has(2);
      if (isDouble) {
        edge.loopId = -2; // Mark as double edge
        continue;
      }

      // BFS to find connected non-double edges
      const queue = [edge];
      const visited = new Set();
      visited.add(edge.key);
      edge.loopId = loopId;
      let loopSize = 1;

      while (queue.length > 0) {
        const curr = queue.shift();
        for (const vKey of [curr.v1Key, curr.v2Key]) {
          const neighbors = vertexToEdges.get(vKey) || [];
          for (const neighbor of neighbors) {
            if (visited.has(neighbor.key)) continue;
            const neighborIsDouble = neighbor.val.types.has(1) && neighbor.val.types.has(2);
            if (neighborIsDouble) continue;
            visited.add(neighbor.key);
            neighbor.loopId = loopId;
            loopSize++;
            queue.push(neighbor);
          }
        }
      }

      loopSizes.set(loopId, loopSize);
      loopId++;
    }

    // Draw edges
    const lineWidth = Math.max(1.5, 3.5 * zoom / 10);
    const circleRadius = Math.max(1.5, 3.5 * zoom / 10);

    for (const edge of allEdges) {
      const { x1, y1, x2, y2, val } = edge;
      const isDouble = val.types.has(1) && val.types.has(2);

      // Skip double edges if checkbox unchecked
      if (isDouble && !showDoubleEdges) continue;

      // Skip edges in loops smaller than minLoopLength
      if (!isDouble && edge.loopId >= 0) {
        const loopSize = loopSizes.get(edge.loopId) || 0;
        if (loopSize < minLoopLength) continue;
      }

      let color, opacity;
      if (isDouble) {
        color = 'purple';
        opacity = 1.0;
      } else if (val.types.has(1)) {
        color = 'black';
        opacity = 1.0;
      } else {
        color = 'red';
        opacity = 0.8;
      }

      // Transform to screen coordinates
      const sx1 = centerX + (x1 + panX) * zoom;
      const sy1 = centerY - (y1 + panY) * zoom;
      const sx2 = centerX + (x2 + panX) * zoom;
      const sy2 = centerY - (y2 + panY) * zoom;

      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      // Draw endpoint circles
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx1, sy1, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx2, sy2, circleRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
  }

  // Sample canvas event handlers
  if (sampleCanvas) {
    document.getElementById('sample-btn').addEventListener('click', generateRandomSample);

    document.getElementById('sample-zoom-in-btn').addEventListener('click', () => {
      if (sampleIs3DView && sampleRenderer3D) {
        sampleRenderer3D.zoomIn();
      } else {
        sampleZoom *= 1.3;
        renderSample();
      }
    });

    document.getElementById('sample-zoom-out-btn').addEventListener('click', () => {
      if (sampleIs3DView && sampleRenderer3D) {
        sampleRenderer3D.zoomOut();
      } else {
        sampleZoom /= 1.3;
        renderSample();
      }
    });

    document.getElementById('sample-zoom-reset-btn').addEventListener('click', () => {
      if (sampleIs3DView && sampleRenderer3D) {
        sampleRenderer3D.resetView();
      } else {
        resetSampleView();
        renderSample();
      }
    });

    // Border width input - re-render on change
    document.getElementById('sample-border-input').addEventListener('input', () => {
      renderSample();
    });

    // Double dimer controls
    const doubleDimerChk = document.getElementById('sample-double-dimer-chk');
    const doubleDimerOptions = document.getElementById('double-dimer-options');
    const showDoubleEdgesChk = document.getElementById('sample-show-double-edges-chk');
    const minLoopLengthInput = document.getElementById('sample-min-loop-length');

    if (doubleDimerChk) {
      doubleDimerChk.addEventListener('change', function() {
        doubleDimerMode = this.checked;
        if (doubleDimerOptions) {
          doubleDimerOptions.style.display = this.checked ? 'inline' : 'none';
        }
        // Re-sample when toggling double dimer mode (need to get two configs)
        generateRandomSample();
      });
    }

    if (showDoubleEdgesChk) {
      showDoubleEdgesChk.addEventListener('change', function() {
        showDoubleEdges = this.checked;
        renderSample();
      });
    }

    if (minLoopLengthInput) {
      minLoopLengthInput.addEventListener('input', function() {
        minLoopLength = parseInt(this.value) || 0;
        renderSample();
      });
    }

    // Clear status message when N input changes
    document.getElementById('sample-N-input').addEventListener('input', () => {
      document.getElementById('sample-time').textContent = '';
    });

    // Pan with mouse drag
    let sampleIsPanning = false;
    let sampleLastX = 0, sampleLastY = 0;

    sampleCanvas.addEventListener('mousedown', (e) => {
      sampleIsPanning = true;
      sampleLastX = e.clientX;
      sampleLastY = e.clientY;
      sampleCanvas.style.cursor = 'grabbing';
    });

    sampleCanvas.addEventListener('mousemove', (e) => {
      if (!sampleIsPanning) return;
      const dx = e.clientX - sampleLastX;
      const dy = e.clientY - sampleLastY;
      samplePanX += dx / sampleZoom;
      samplePanY -= dy / sampleZoom;  // Flip Y
      sampleLastX = e.clientX;
      sampleLastY = e.clientY;
      renderSample();
    });

    sampleCanvas.addEventListener('mouseup', () => {
      sampleIsPanning = false;
      sampleCanvas.style.cursor = 'grab';
    });

    sampleCanvas.addEventListener('mouseleave', () => {
      sampleIsPanning = false;
      sampleCanvas.style.cursor = 'grab';
    });

    // Zoom with wheel
    sampleCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      sampleZoom *= factor;
      renderSample();
    });

    // Responsive: re-render on window resize
    window.addEventListener('resize', () => {
      renderSample();
    });

    // Export PNG (canvas capture like T-embedding)
    document.getElementById('sample-export-png-btn').addEventListener('click', () => {
      if (sampleDominoes.length === 0) return;

      const N = parseInt(document.getElementById('sample-N-input').value) || 6;
      const quality = parseInt(document.getElementById('sample-png-quality').value) || 85;
      // Map quality 1-100 to scale factor 0.5-4.0
      const scale = 0.5 + (quality / 100) * 3.5;

      const rect = sampleCanvas.getBoundingClientRect();

      // Create export canvas at scaled resolution
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = rect.width * scale;
      exportCanvas.height = rect.height * scale;
      const exportCtx = exportCanvas.getContext('2d');

      // Draw white background
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Draw the source canvas scaled
      exportCtx.drawImage(sampleCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

      // Download
      const link = document.createElement('a');
      link.download = `domino-sample-N${N}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    });

    // Generate SVG for domino sample
    function generateDominoSVG() {
      if (sampleDominoes.length === 0) return null;

      // Find bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const d of sampleDominoes) {
        minX = Math.min(minX, d.x);
        maxX = Math.max(maxX, d.x + d.w);
        minY = Math.min(minY, d.y);
        maxY = Math.max(maxY, d.y + d.h);
      }

      const regionW = maxX - minX;
      const regionH = maxY - minY;
      const padding = 10;
      const scale = 10;  // pixels per unit

      const svgW = regionW * scale + padding * 2;
      const svgH = regionH * scale + padding * 2;

      // Get colors
      const palettes = window.ColorSchemes || [{ name: 'Domino Default', colors: ['#FFCD00', '#228B22', '#0057B7', '#DC143C'] }];
      let paletteIdx = palettes.findIndex(p => p.name === 'Domino Default');
      if (paletteIdx === -1) paletteIdx = 0;
      const colors = palettes[paletteIdx].colors;
      const colorMap = { 'yellow': colors[0], 'green': colors[1], 'blue': colors[2], 'red': colors[3] };

      const borderWidthVal = parseFloat(document.getElementById('sample-border-input').value);
      const borderWidth = isNaN(borderWidthVal) ? 1 : borderWidthVal;

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
      svg += `<rect width="${svgW}" height="${svgH}" fill="white"/>`;

      for (const d of sampleDominoes) {
        const sx = (d.x - minX) * scale + padding;
        const sy = (maxY - d.y - d.h) * scale + padding;
        const sw = d.w * scale;
        const sh = d.h * scale;
        const fill = colorMap[d.color] || '#888';

        if (borderWidth > 0) {
          svg += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${fill}" stroke="#000" stroke-width="${borderWidth}"/>`;
        } else {
          svg += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${fill}"/>`;
        }
      }

      svg += '</svg>';
      return svg;
    }

    // Export PDF (via SVG - vector quality, like T-embedding)
    document.getElementById('sample-export-pdf-btn').addEventListener('click', async () => {
      if (sampleDominoes.length === 0) return;

      const N = parseInt(document.getElementById('sample-N-input').value) || 6;
      const svgString = generateDominoSVG();

      if (!svgString) return;

      try {
        // Load jspdf and svg2pdf.js dynamically if needed
        const loadScript = (src) => new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });

        if (!window.jspdf) {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        if (!window.svg2pdfLoaded) {
          await loadScript('/js/svg2pdf.umd.min.js');
          window.svg2pdfLoaded = true;
        }

        // Parse SVG
        const parser = new DOMParser();
        const svgElement = parser.parseFromString(svgString, 'image/svg+xml').documentElement;
        const width = parseFloat(svgElement.getAttribute('width'));
        const height = parseFloat(svgElement.getAttribute('height'));

        // Create PDF
        const { jsPDF } = window.jspdf;
        const orientation = width > height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({ orientation, unit: 'pt', format: [width, height] });

        // Render SVG to PDF
        await pdf.svg(svgElement, { x: 0, y: 0, width, height });
        pdf.save(`domino-sample-N${N}.pdf`);
      } catch (e) {
        console.error('PDF export error:', e);
        alert('PDF export failed: ' + e.message);
      }
    });

    sampleCanvas.style.cursor = 'grab';

    // 3D toggle button
    document.getElementById('sample-toggle-3d-btn').addEventListener('click', () => {
      setSampleViewMode(!sampleIs3DView);
    });

    // Perspective toggle
    document.getElementById('sample-perspective-btn').addEventListener('click', () => {
      if (sampleRenderer3D) {
        const isPerspective = sampleRenderer3D.togglePerspective();
        document.getElementById('sample-perspective-btn').textContent = isPerspective ? '📐' : '🎯';
      }
    });

    // Preset cycle
    document.getElementById('sample-preset-btn').addEventListener('click', () => {
      if (sampleRenderer3D) {
        const preset = sampleRenderer3D.cyclePreset();
        const btn = document.getElementById('sample-preset-btn');
        btn.textContent = preset.icon;
        btn.title = `Preset: ${preset.name}`;
        updateSample3DView();
      }
    });

    // Auto-rotate toggle
    document.getElementById('sample-rotate-btn').addEventListener('click', () => {
      if (sampleRenderer3D) {
        sampleRenderer3D.autoRotate = !sampleRenderer3D.autoRotate;
        const btn = document.getElementById('sample-rotate-btn');
        btn.style.background = sampleRenderer3D.autoRotate ? '#e0e0e0' : '';
      }
    });
  }

  const computeTimeSpan = document.getElementById('compute-time');

  // Helper for async progress updates
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function computeAndDisplay() {
    if (!wasmReady) return;
    if (isComputing) return;  // Prevent re-entrancy

    isComputing = true;
    const n = parseN();

    try {
      // Update stepwise section visibility
      updateStepwiseSectionForN(n);

      // Clear any previous T-embedding cache
      clearTembLevels();

      // Clear stale stored face weights before capturing fresh ones
      clearStoredWeightsExport();

      // --- PHASE 1: FOLDING ---
      // Skip folding for uniform weights (all 1's) - all coefficients are 1
      if (currentWeightMode === 0) {
        computeTimeSpan.textContent = "Uniform weights (skip folding)...";
        await delay(10);
        // No folding needed - coefficients are all 1
        refreshAztecFromCpp();
      } else {
        // NOTE: Do NOT call refreshAztecFromCpp() inside loops - it's extremely expensive
        computeTimeSpan.textContent = "Folding...";
        await delay(10);  // Yield to render text

        while (canAztecStepDown()) {
          aztecGraphStepDown();
        }

        while (canAztecStepUp()) {
          aztecGraphStepUp();
        }

        // Update UI once after folding/unfolding is done
        refreshAztecFromCpp();
      }

      // --- PHASE 2: COMPUTING T AND O MAPS ---
      computeTimeSpan.textContent = "Computing T...";
      await delay(10);  // Yield to render text

      const finalK = Math.max(0, n - 2);
      for (let k = 0; k <= finalK; k++) {
        let ptr = getTembeddingLevelJSON(k);
        freeString(ptr);
      }

      // maxK = n - 2 (for input n, we have T_0 through T_{n-2})
      maxK = finalK;

      // Start at k=0 or keep current if valid
      currentK = Math.min(currentK, maxK);
      if (currentK < 0) currentK = 0;
      updateStepDisplay();
      renderStepwiseTemb();

      // Also render the main visualization (2D or 3D)
      if (mainViewIs3D) {
        renderMain3D();
      } else {
        renderMain2DTemb();
      }

      // Display compute time
      const timeMs = getComputeTimeMs();
      const timeSec = (timeMs / 1000).toFixed(2);
      computeTimeSpan.textContent = `${timeSec}s`;
    } finally {
      isComputing = false;
    }
  }


  function updateStepDisplay() {
    document.getElementById('step-value').textContent = currentK;
    document.getElementById('step-prev-btn').disabled = (currentK <= 0);
    document.getElementById('step-next-btn').disabled = (currentK >= maxK);
    updateMathematicaOutput();
    updateVerifyOutput();
  }

  // Generate Mathematica array output for ALL T levels (T_0 through T_maxK)
  function updateMathematicaOutput() {
    const mathDiv = document.getElementById('mathematica-output');
    if (!wasmReady || !getTembeddingLevelJSON) {
      mathDiv.innerHTML = '<em>Loading...</em>';
      return;
    }

    // Format complex number for Mathematica
    function formatComplex(re, im) {
      if (Math.abs(im) < 1e-10) {
        return re.toFixed(12);
      } else if (Math.abs(re) < 1e-14) {
        return `${im.toFixed(12)}*I`;
      } else {
        const sign = im >= 0 ? '+' : '';
        return `${re.toFixed(12)}${sign}${im.toFixed(12)}*I`;
      }
    }

    // Get max K from stored face weights
    let maxK = currentK;
    let ptr = getStoredFaceWeightsJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    try {
      const data = JSON.parse(jsonStr);
      const levels = data.capturedLevels || [];
      for (const sw of levels) {
        if (sw.k > maxK) maxK = sw.k;
      }
    } catch (e) {}

    // Generate Mathematica definitions for ALL levels
    const lines = [];
    for (let k = 0; k <= maxK; k++) {
      ptr = getTembeddingLevelJSON(k);
      jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);
      const tembLevel = JSON.parse(jsonStr);

      if (tembLevel && tembLevel.vertices && tembLevel.vertices.length > 0) {
        for (const v of tembLevel.vertices) {
          lines.push(`T[${k}][${v.i},${v.j}]:=${formatComplex(v.re, v.im)}`);
        }
      }
    }

    if (lines.length === 0) {
      mathDiv.innerHTML = `<em>No T-embedding computed yet</em>`;
      return;
    }

    // Sort by k, then i, then j for consistent ordering
    lines.sort((a, b) => {
      const matchA = a.match(/T\[(\d+)\]\[(-?\d+),(-?\d+)\]/);
      const matchB = b.match(/T\[(\d+)\]\[(-?\d+),(-?\d+)\]/);
      const kA = parseInt(matchA[1]), iA = parseInt(matchA[2]), jA = parseInt(matchA[3]);
      const kB = parseInt(matchB[1]), iB = parseInt(matchB[2]), jB = parseInt(matchB[3]);
      if (kA !== kB) return kA - kB;
      if (iA !== iB) return iA - iB;
      return jA - jB;
    });

    mathDiv.textContent = lines.join('\n');
  }

  // Generate Mathematica verification code for XX formula
  // XX[n1,n2,n3,n4][z] = (z-n1)(z-n3) / ((n2-z)(n4-z))
  // n1,n2,n3,n4 go counterclockwise around z, with n1 such that edge z->n1 has BLACK on right
  function updateVerifyOutput() {
    const container = document.getElementById('verify-levels');
    if (!wasmReady || !getTembeddingLevelJSON || !getStoredFaceWeightsJSON) {
      container.innerHTML = '<em style="font-size: 11px;">Loading...</em>';
      return;
    }

    // Get weight variable name based on face position
    function getWeightName(k, i, j) {
      if (k === 0) return `root[0]`;
      const absI = Math.abs(i), absJ = Math.abs(j);
      const absSum = absI + absJ;
      if (i === 0 && j === k) return `alphaT[${k}]`;
      if (i === 0 && j === -k) return `alphaB[${k}]`;
      if (j === 0 && i === k) return `alphaR[${k}]`;
      if (j === 0 && i === -k) return `alphaL[${k}]`;
      if (absSum === k && absI > 0 && absJ > 0) return `beta[${k}][${i},${j}]`;
      if (absSum < k) return `gamma[${k}][${i},${j}]`;
      return `face[${k}][${i},${j}]`;
    }

    // Get max K from stored face weights
    let ptr = getStoredFaceWeightsJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    let maxK = 0;
    try {
      const data = JSON.parse(jsonStr);
      for (const lv of (data.capturedLevels || [])) {
        if (lv.k > maxK) maxK = lv.k;
      }
    } catch (e) {}

    // Collect T-embedding vertices by level
    const tembByLevel = {};
    for (let k = 0; k <= maxK; k++) {
      ptr = getTembeddingLevelJSON(k);
      jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);
      try {
        const tembLevel = JSON.parse(jsonStr);
        if (tembLevel && tembLevel.vertices) {
          tembByLevel[k] = {};
          for (const v of tembLevel.vertices) {
            tembByLevel[k][`${v.i},${v.j}`] = true;
          }
        }
      } catch (e) {}
    }

    // Build verification code per level
    const maxCheckK = Math.min(maxK, 5);
    const levelData = [];

    for (let k = 0; k <= maxCheckK; k++) {
      const vertices = tembByLevel[k];
      if (!vertices) continue;

      const lines = [];

      // Alpha faces (boundary) - neighbors based on T_k graph structure
      // alphaR at (k,0): neighbors are (k+1,0), (k-1,1), (k-1,0), (k-1,-1)
      // alphaT at (0,k): neighbors are (1,k-1), (0,k+1), (-1,k-1), (0,k-1)
      // alphaL at (-k,0): neighbors are (-k-1,0), (-k+1,-1), (-k+1,0), (-k+1,1)
      // alphaB at (0,-k): neighbors are (1,-k+1), (0,-k+1), (-1,-k+1), (0,-k-1)
      if (k >= 1) {
        // alphaR[k]
        lines.push(`XX[T[${k}][${k+1},0], T[${k}][${k-1},1], T[${k}][${k-1},0], T[${k}][${k-1},-1]][T[${k}][${k},0]] + alphaR[${k}]`);
        lines.push(`XX[T[${k}][${k-1},1], T[${k}][${k-1},0], T[${k}][${k-1},-1], T[${k}][${k+1},0]][T[${k}][${k},0]] + alphaR[${k}]`);

        // alphaT[k]
        lines.push(`XX[T[${k}][1,${k-1}], T[${k}][0,${k+1}], T[${k}][-1,${k-1}], T[${k}][0,${k-1}]][T[${k}][0,${k}]] + alphaT[${k}]`);
        lines.push(`XX[T[${k}][0,${k+1}], T[${k}][-1,${k-1}], T[${k}][0,${k-1}], T[${k}][1,${k-1}]][T[${k}][0,${k}]] + alphaT[${k}]`);

        // alphaL[k]
        lines.push(`XX[T[${k}][${-k-1},0], T[${k}][${-k+1},-1], T[${k}][${-k+1},0], T[${k}][${-k+1},1]][T[${k}][${-k},0]] + alphaL[${k}]`);
        lines.push(`XX[T[${k}][${-k+1},-1], T[${k}][${-k+1},0], T[${k}][${-k+1},1], T[${k}][${-k-1},0]][T[${k}][${-k},0]] + alphaL[${k}]`);

        // alphaB[k]
        lines.push(`XX[T[${k}][1,${-k+1}], T[${k}][0,${-k+1}], T[${k}][-1,${-k+1}], T[${k}][0,${-k-1}]][T[${k}][0,${-k}]] + alphaB[${k}]`);
        lines.push(`XX[T[${k}][0,${-k+1}], T[${k}][-1,${-k+1}], T[${k}][0,${-k-1}], T[${k}][1,${-k+1}]][T[${k}][0,${-k}]] + alphaB[${k}]`);

        // Beta faces - at (i,j) where |i|+|j|=k, i≠0, j≠0
        // For beta(i,j) in quadrant i>0,j>0: neighbors (i+1,j-1), (i-1,j+1), (i-1,j), (i,j-1)
        for (let i = 1; i < k; i++) {
          const j = k - i;
          // First quadrant: (i, j)
          lines.push(`XX[T[${k}][${i+1},${j-1}], T[${k}][${i-1},${j+1}], T[${k}][${i-1},${j}], T[${k}][${i},${j-1}]][T[${k}][${i},${j}]] + beta[${k}][${i},${j}]`);
          lines.push(`XX[T[${k}][${i-1},${j+1}], T[${k}][${i-1},${j}], T[${k}][${i},${j-1}], T[${k}][${i+1},${j-1}]][T[${k}][${i},${j}]] + beta[${k}][${i},${j}]`);

          // Second quadrant: (-i, j)
          lines.push(`XX[T[${k}][${-i-1},${j-1}], T[${k}][${-i+1},${j+1}], T[${k}][${-i},${j-1}], T[${k}][${-i+1},${j}]][T[${k}][${-i},${j}]] + beta[${k}][${-i},${j}]`);
          lines.push(`XX[T[${k}][${-i+1},${j+1}], T[${k}][${-i},${j-1}], T[${k}][${-i+1},${j}], T[${k}][${-i-1},${j-1}]][T[${k}][${-i},${j}]] + beta[${k}][${-i},${j}]`);

          // Third quadrant: (-i, -j)
          lines.push(`XX[T[${k}][${-i-1},${-j+1}], T[${k}][${-i+1},${-j-1}], T[${k}][${-i+1},${-j}], T[${k}][${-i},${-j+1}]][T[${k}][${-i},${-j}]] + beta[${k}][${-i},${-j}]`);
          lines.push(`XX[T[${k}][${-i+1},${-j-1}], T[${k}][${-i+1},${-j}], T[${k}][${-i},${-j+1}], T[${k}][${-i-1},${-j+1}]][T[${k}][${-i},${-j}]] + beta[${k}][${-i},${-j}]`);

          // Fourth quadrant: (i, -j)
          lines.push(`XX[T[${k}][${i+1},${-j+1}], T[${k}][${i-1},${-j-1}], T[${k}][${i},${-j+1}], T[${k}][${i-1},${-j}]][T[${k}][${i},${-j}]] + beta[${k}][${i},${-j}]`);
          lines.push(`XX[T[${k}][${i-1},${-j-1}], T[${k}][${i},${-j+1}], T[${k}][${i-1},${-j}], T[${k}][${i+1},${-j+1}]][T[${k}][${i},${-j}]] + beta[${k}][${i},${-j}]`);
        }
      }

      // Gamma faces (interior) - axis-aligned neighbors
      for (const key of Object.keys(vertices)) {
        const [iStr, jStr] = key.split(',');
        const i = parseInt(iStr), j = parseInt(jStr);

        const dirs = [[1,0], [0,1], [-1,0], [0,-1]];
        let allExist = true;
        for (const [di, dj] of dirs) {
          if (!vertices[`${i+di},${j+dj}`]) { allExist = false; break; }
        }
        if (!allExist) continue;

        const z = `T[${k}][${i},${j}]`;
        const nR = `T[${k}][${i+1},${j}]`;
        const nU = `T[${k}][${i},${j+1}]`;
        const nL = `T[${k}][${i-1},${j}]`;
        const nD = `T[${k}][${i},${j-1}]`;
        const wt = getWeightName(k, i, j);

        lines.push(`XX[${nR}, ${nU}, ${nL}, ${nD}][${z}] + ${wt}`);
        lines.push(`XX[${nU}, ${nL}, ${nD}, ${nR}][${z}] + ${wt}`);
      }

      if (lines.length > 0) {
        levelData.push({ k, lines });
      }
    }

    if (levelData.length === 0) {
      container.innerHTML = '<em style="font-size: 11px;">No interior vertices (need vertices with all 4 neighbors)</em>';
      return;
    }

    // Create divs for each level
    container.innerHTML = '';
    for (const { k, lines } of levelData) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: relative;';

      const btn = document.createElement('button');
      btn.textContent = 'Copy';
      btn.style.cssText = 'position: absolute; top: 2px; right: 2px; font-size: 10px; padding: 2px 6px;';

      const content = document.createElement('div');
      content.style.cssText = 'padding: 8px; background: #f0fff0; border: 1px solid #228b22; font-family: monospace; font-size: 11px; white-space: pre-wrap; max-height: 120px; overflow-y: auto;';
      content.textContent = `(* k=${k} *)\n` + lines.join('\n');

      btn.addEventListener('click', function() {
        navigator.clipboard.writeText(content.textContent).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        });
      });

      wrapper.appendChild(btn);
      wrapper.appendChild(content);
      container.appendChild(wrapper);
    }
  }

  // Display stored face weights near Aztec graph
  // Uses double edge ratios for alpha and beta, captured face weights for gamma
  function updateFaceWeightsOutput() {
    const faceDiv = document.getElementById('face-weights-output');
    if (!wasmReady || !getStoredFaceWeightsJSON) {
      faceDiv.innerHTML = '<em>Loading...</em>';
      return;
    }

    let ptr = getStoredFaceWeightsJSON();
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);

    try {
      const data = JSON.parse(jsonStr);
      const levels = data.capturedLevels || [];
      const doubleEdgeRatios = data.doubleEdgeRatios || [];
      const betaEdgeRatios = data.betaEdgeRatios || [];

      if (levels.length === 0) {
        faceDiv.innerHTML = '<em>No face weights captured yet. Step through reduction.</em>';
        return;
      }

      // Build lookup maps for double edge ratios
      const alphaByK = {};
      for (const der of doubleEdgeRatios) {
        alphaByK[der.k] = {
          right: der.right?.ratio ?? 1,
          left: der.left?.ratio ?? 1,
          top: der.top?.ratio ?? 1,
          bottom: der.bottom?.ratio ?? 1
        };
      }

      const betaByK = {};
      for (const ber of betaEdgeRatios) {
        betaByK[ber.k] = {};
        for (const r of (ber.ratios || [])) {
          betaByK[ber.k][`${r.i},${r.j}`] = r.ratio;
        }
      }

      let lines = [];
      for (const sw of levels) {
        const k = sw.k;
        if (k === 0 && sw.root !== undefined) {
          lines.push(`root[${k}]:=${sw.root.toFixed(12)}`);
        } else {
          // Use double edge ratios for alpha values
          const alpha = alphaByK[k] || { right: 1, left: 1, top: 1, bottom: 1 };
          lines.push(`alphaR[${k}]:=${alpha.right.toFixed(12)}`);
          lines.push(`alphaL[${k}]:=${alpha.left.toFixed(12)}`);
          lines.push(`alphaT[${k}]:=${alpha.top.toFixed(12)}`);
          lines.push(`alphaB[${k}]:=${alpha.bottom.toFixed(12)}`);

          // Use beta edge ratios (from double edges) for beta values
          const betaMap = betaByK[k] || {};
          if (sw.beta && sw.beta.length > 0) {
            for (const b of sw.beta) {
              const key = `${b.i},${b.j}`;
              const betaVal = betaMap[key] ?? b.weight;
              lines.push(`beta[${k}][${b.i},${b.j}]:=${betaVal.toFixed(12)}`);
            }
          }

          // Gamma values come from captured face weights (unchanged)
          if (sw.gamma && sw.gamma.length > 0) {
            for (const g of sw.gamma) {
              lines.push(`gamma[${k}][${g.i},${g.j}]:=${g.weight.toFixed(12)}`);
            }
          }
        }
      }
      faceDiv.textContent = lines.join('\n');
    } catch (e) {
      faceDiv.innerHTML = '<em>Error parsing face weights: ' + e.message + '</em>';
    }
  }

  // ========== MAIN 2D T-EMBEDDING RENDERING ==========

  function renderMain2DTemb() {
    const canvas = document.getElementById('main-temb-2d-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Use currentSimulationN (the computed n), not the input value
    const n = currentSimulationN;

    // Handle DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Use existing T-embedding data from g_tembLevels
    renderMain2DFromTembLevels(ctx, rect, n);
  }

  function renderMain2DFromTembLevels(ctx, rect, n) {
    if (!wasmReady || !getTembeddingLevelJSON) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', rect.width / 2, rect.height / 2);
      return;
    }

    // Get final T-embedding level (k = n-2)
    const finalK = Math.max(0, n - 2);
    const ptr = getTembeddingLevelJSON(finalK);
    const json = Module.UTF8ToString(ptr);
    freeString(ptr);

    let data;
    try {
      data = JSON.parse(json);
    } catch (e) {
      ctx.fillStyle = '#888';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Error parsing T-embedding data', rect.width / 2, rect.height / 2);
      return;
    }

    if (!data.vertices || data.vertices.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No T-embedding data. Click "Compute T-embedding".', rect.width / 2, rect.height / 2);
      return;
    }

    // Compute bounds
    let minRe = Infinity, maxRe = -Infinity;
    let minIm = Infinity, maxIm = -Infinity;
    for (const v of data.vertices) {
      minRe = Math.min(minRe, v.re);
      maxRe = Math.max(maxRe, v.re);
      minIm = Math.min(minIm, v.im);
      maxIm = Math.max(maxIm, v.im);
    }

    const padding = 20;
    const rangeRe = maxRe - minRe || 1;
    const rangeIm = maxIm - minIm || 1;
    const baseScale = Math.min(
      (rect.width - 2 * padding) / rangeRe,
      (rect.height - 2 * padding) / rangeIm
    );
    const scale = baseScale * main2DZoom;

    const centerX = rect.width / 2 + main2DPanX;
    const centerY = rect.height / 2 + main2DPanY;
    const centerRe = (minRe + maxRe) / 2;
    const centerIm = (minIm + maxIm) / 2;

    // Build vertex map for edge lookup
    const vertexMap = new Map();
    for (const v of data.vertices) {
      vertexMap.set(`${v.i},${v.j}`, v);
    }

    // Get size controls
    const edgeThicknessControl = parseFloat(document.getElementById('main-2d-edge-thickness').value) || 1.5;
    const vertexSizeControl = parseFloat(document.getElementById('main-2d-vertex-size').value) || 1.5;
    const uniformEdgeWidth = Math.max(edgeThicknessControl, scale / 300 * edgeThicknessControl);

    // Get k from the final level
    const k = data.k;

    // Helper to draw edge between two vertices by (i,j)
    function drawEdge(i1, j1, i2, j2) {
      const v1 = vertexMap.get(`${i1},${j1}`);
      const v2 = vertexMap.get(`${i2},${j2}`);
      if (v1 && v2) {
        const x1 = centerX + (v1.re - centerRe) * scale;
        const y1 = centerY - (v1.im - centerIm) * scale;
        const x2 = centerX + (v2.re - centerRe) * scale;
        const y2 = centerY - (v2.im - centerIm) * scale;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Draw edges

    // 1. Interior edges (lattice connections for |i|+|j| <= k)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = uniformEdgeWidth;
    for (const v of data.vertices) {
      const i = v.i, j = v.j;
      const absSum = Math.abs(i) + Math.abs(j);

      // Connect to right neighbor
      if (vertexMap.has(`${i+1},${j}`)) {
        const nAbsSum = Math.abs(i+1) + Math.abs(j);
        if (absSum <= k && nAbsSum <= k) {
          drawEdge(i, j, i+1, j);
        }
      }
      // Connect to top neighbor
      if (vertexMap.has(`${i},${j+1}`)) {
        const nAbsSum = Math.abs(i) + Math.abs(j+1);
        if (absSum <= k && nAbsSum <= k) {
          drawEdge(i, j, i, j+1);
        }
      }
    }

    // 2. Boundary rhombus (external corners) - same color as interior
    ctx.lineWidth = uniformEdgeWidth;
    drawEdge(k+1, 0, 0, k+1);
    drawEdge(0, k+1, -(k+1), 0);
    drawEdge(-(k+1), 0, 0, -(k+1));
    drawEdge(0, -(k+1), k+1, 0);

    // 3. External corners to alpha vertices - same color
    drawEdge(k+1, 0, k, 0);
    drawEdge(-(k+1), 0, -k, 0);
    drawEdge(0, k+1, 0, k);
    drawEdge(0, -(k+1), 0, -k);

    // 4. Diagonal boundary edges (along |i|+|j|=k) - same color

    // Right-top diagonal: (k,0) -> (k-1,1) -> ... -> (1,k-1) -> (0,k)
    for (let s = 0; s < k; s++) {
      drawEdge(k-s, s, k-s-1, s+1);
    }
    // Left-top diagonal: (0,k) -> (-1,k-1) -> ... -> (-(k-1),1) -> (-k,0)
    for (let s = 0; s < k; s++) {
      drawEdge(-s, k-s, -(s+1), k-s-1);
    }
    // Left-bottom diagonal: (-k,0) -> (-(k-1),-1) -> ... -> (-1,-(k-1)) -> (0,-k)
    for (let s = 0; s < k; s++) {
      drawEdge(-(k-s), -s, -(k-s-1), -(s+1));
    }
    // Right-bottom diagonal: (0,-k) -> (1,-(k-1)) -> ... -> (k-1,-1) -> (k,0)
    for (let s = 0; s < k; s++) {
      drawEdge(s, -(k-s), s+1, -(k-s-1));
    }

    // Draw vertices (T-embedding in black) and store positions for click detection
    ctx.fillStyle = '#333';
    const radius = Math.max(vertexSizeControl, scale / 800 * vertexSizeControl);
    main2DVertexScreenPositions = [];
    for (const v of data.vertices) {
      const x = centerX + (v.re - centerRe) * scale;
      const y = centerY - (v.im - centerIm) * scale;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
      main2DVertexScreenPositions.push({ screenX: x, screenY: y, vertex: v });
    }

    // ========== ORIGAMI MAP (in blue) ==========
    const showOrigami = document.getElementById('show-origami-chk').checked;
    if (showOrigami && getOrigamiLevelJSON) {
      const origamiPtr = getOrigamiLevelJSON(finalK);
      const origamiJson = Module.UTF8ToString(origamiPtr);
      freeString(origamiPtr);

      let origamiData;
      try {
        origamiData = JSON.parse(origamiJson);
      } catch (e) {
        origamiData = null;
      }

      if (origamiData && origamiData.vertices && origamiData.vertices.length > 0) {
        // Build origami vertex map
        const origamiVertexMap = new Map();
        for (const v of origamiData.vertices) {
          origamiVertexMap.set(`${v.i},${v.j}`, v);
        }

        // Helper to draw origami edge
        function drawOrigamiEdge(i1, j1, i2, j2) {
          const v1 = origamiVertexMap.get(`${i1},${j1}`);
          const v2 = origamiVertexMap.get(`${i2},${j2}`);
          if (v1 && v2) {
            const x1 = centerX + (v1.re - centerRe) * scale;
            const y1 = centerY - (v1.im - centerIm) * scale;
            const x2 = centerX + (v2.re - centerRe) * scale;
            const y2 = centerY - (v2.im - centerIm) * scale;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }

        // Draw origami edges in blue
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = uniformEdgeWidth * 0.8;

        // Interior edges
        for (const v of origamiData.vertices) {
          const i = v.i, j = v.j;
          const absSum = Math.abs(i) + Math.abs(j);
          if (origamiVertexMap.has(`${i+1},${j}`)) {
            const nAbsSum = Math.abs(i+1) + Math.abs(j);
            if (absSum <= k && nAbsSum <= k) {
              drawOrigamiEdge(i, j, i+1, j);
            }
          }
          if (origamiVertexMap.has(`${i},${j+1}`)) {
            const nAbsSum = Math.abs(i) + Math.abs(j+1);
            if (absSum <= k && nAbsSum <= k) {
              drawOrigamiEdge(i, j, i, j+1);
            }
          }
        }

        // Boundary rhombus
        drawOrigamiEdge(k+1, 0, 0, k+1);
        drawOrigamiEdge(0, k+1, -(k+1), 0);
        drawOrigamiEdge(-(k+1), 0, 0, -(k+1));
        drawOrigamiEdge(0, -(k+1), k+1, 0);

        // External corners to alpha
        drawOrigamiEdge(k+1, 0, k, 0);
        drawOrigamiEdge(-(k+1), 0, -k, 0);
        drawOrigamiEdge(0, k+1, 0, k);
        drawOrigamiEdge(0, -(k+1), 0, -k);

        // Diagonal boundary
        for (let s = 0; s < k; s++) {
          drawOrigamiEdge(k-s, s, k-s-1, s+1);
          drawOrigamiEdge(-s, k-s, -(s+1), k-s-1);
          drawOrigamiEdge(-(k-s), -s, -(k-s-1), -(s+1));
          drawOrigamiEdge(s, -(k-s), s+1, -(k-s-1));
        }

        // Draw origami vertices in blue
        ctx.fillStyle = '#0066cc';
        for (const v of origamiData.vertices) {
          const x = centerX + (v.re - centerRe) * scale;
          const y = centerY - (v.im - centerIm) * scale;
          ctx.beginPath();
          ctx.arc(x, y, radius * 0.8, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // Draw selected vertex info overlay in upper left
    if (main2DSelectedVertex) {
      const v = main2DSelectedVertex;
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const imSign = v.im >= 0 ? '+' : '-';
      const imAbs = Math.abs(v.im).toFixed(4);
      ctx.fillText(`T(${v.i},${v.j}) = ${v.re.toFixed(4)} ${imSign} ${imAbs}i`, 15, 15);
    }
  }

  // ========== MAIN 3D T-SURFACE RENDERING ==========
  // Base (x,y) = T-embedding, height z = Re[O(i,j)] or Im[O(i,j)] from origami map

  function renderMain3D() {
    if (!main3DCanvas) return;
    const ctx = main3DCtx;
    // Use currentSimulationN (the computed n), not the input value
    const n = currentSimulationN;

    // Handle DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const fullRect = main3DCanvas.getBoundingClientRect();
    main3DCanvas.width = fullRect.width * dpr;
    main3DCanvas.height = fullRect.height * dpr;
    ctx.scale(dpr, dpr);

    // Reset canvas context state to ensure no transparency
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    // Get current preset
    const preset = VISUAL_PRESETS_3D[view3DPresetIndex];

    // Background from preset
    ctx.fillStyle = preset.background;
    ctx.fillRect(0, 0, fullRect.width, fullRect.height);

    // Check which surfaces to show
    const showRe = document.getElementById('show-re-surface-chk').checked;
    const showIm = document.getElementById('show-im-surface-chk').checked;

    if (!showRe && !showIm) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select Re O or Im O to display', fullRect.width / 2, fullRect.height / 2);
      return;
    }

    if (!wasmReady || !getTembeddingLevelJSON || !getOrigamiLevelJSON) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', fullRect.width / 2, fullRect.height / 2);
      return;
    }

    // Get final level (k = n-2)
    const finalK = Math.max(0, n - 2);

    // Get T-embedding data for (x, y) coordinates
    let ptr = getTembeddingLevelJSON(finalK);
    let json = Module.UTF8ToString(ptr);
    freeString(ptr);
    let tembData;
    try {
      tembData = JSON.parse(json);
    } catch (e) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Error parsing T-embedding', fullRect.width / 2, fullRect.height / 2);
      return;
    }

    // Get origami data for z = Re[O(i,j)] or Im[O(i,j)]
    ptr = getOrigamiLevelJSON(finalK);
    json = Module.UTF8ToString(ptr);
    freeString(ptr);
    let origamiData;
    try {
      origamiData = JSON.parse(json);
    } catch (e) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Error parsing origami data', fullRect.width / 2, fullRect.height / 2);
      return;
    }

    if (!tembData.vertices || tembData.vertices.length === 0 ||
        !origamiData.vertices || origamiData.vertices.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data. Click "Compute".', fullRect.width / 2, fullRect.height / 2);
      return;
    }

    const k = tembData.k;

    // Build vertex maps
    const tembMap = new Map();
    for (const v of tembData.vertices) {
      tembMap.set(`${v.i},${v.j}`, v);
    }
    const origamiMap = new Map();
    for (const v of origamiData.vertices) {
      origamiMap.set(`${v.i},${v.j}`, v);
    }

    // Get vertex/edge size controls
    const vertexSizeControl = parseFloat(document.getElementById('main-2d-vertex-size').value) || 1.5;
    const edgeThicknessControl = parseFloat(document.getElementById('main-2d-edge-thickness').value) || 1.5;

    const rect = { x: 0, y: 0, width: fullRect.width, height: fullRect.height };

    // Define surface colors
    const reColor = { r: preset.baseColor.r, g: preset.baseColor.g, b: preset.baseColor.b };
    const imColor = { r: 100, g: 150, b: 255 };  // Im origami always blue tint

    // Build 3D points for each surface
    const surfaceData = [];

    if (showRe) {
      const points = [];
      for (const v of tembData.vertices) {
        const key = `${v.i},${v.j}`;
        const origV = origamiMap.get(key);
        if (origV) {
          points.push({ i: v.i, j: v.j, x: v.re, y: v.im, z: origV.re });
        }
      }
      surfaceData.push({ points, color: reColor, label: 'O.re', isRe: true });
    }

    if (showIm) {
      // Transform Im to match Re at the boundary corners
      // External corners: (k+1,0), (0,k+1), (-(k+1),0), (0,-(k+1))
      const corner1 = origamiMap.get(`${k+1},0`);   // Right
      const corner2 = origamiMap.get(`0,${k+1}`);   // Top
      const corner3 = origamiMap.get(`${-(k+1)},0`); // Left
      const corner4 = origamiMap.get(`0,${-(k+1)}`); // Bottom

      // Re values at corners
      const reCorner1 = corner1 ? corner1.re : 1;
      const reCorner2 = corner2 ? corner2.re : 1;
      const reCorner3 = corner3 ? corner3.re : 1;
      const reCorner4 = corner4 ? corner4.re : 1;

      // Im values at corners
      const imCorner1 = corner1 ? corner1.im : 0;
      const imCorner2 = corner2 ? corner2.im : 0;
      const imCorner3 = corner3 ? corner3.im : 0;
      const imCorner4 = corner4 ? corner4.im : 0;

      // Compute linear transformation: transformedIm = scale * im + offset
      // to match Re at corners using least squares fit
      const imVals = [imCorner1, imCorner2, imCorner3, imCorner4];
      const reVals = [reCorner1, reCorner2, reCorner3, reCorner4];

      const n = 4;
      const sumIm = imVals.reduce((a, b) => a + b, 0);
      const sumRe = reVals.reduce((a, b) => a + b, 0);
      const sumImIm = imVals.reduce((a, b) => a + b * b, 0);
      const sumImRe = imVals.reduce((sum, im, i) => sum + im * reVals[i], 0);

      const denom = n * sumImIm - sumIm * sumIm;
      let scale = 1, offset = 0;
      if (Math.abs(denom) > 1e-10) {
        scale = (n * sumImRe - sumIm * sumRe) / denom;
        offset = (sumRe - scale * sumIm) / n;
      }

      const points = [];
      for (const v of tembData.vertices) {
        const key = `${v.i},${v.j}`;
        const origV = origamiMap.get(key);
        if (origV) {
          points.push({ i: v.i, j: v.j, x: v.re, y: v.im, z: scale * origV.im + offset });
        }
      }
      surfaceData.push({ points, color: imColor, label: 'Im (scaled)', isRe: false });
    }

    if (surfaceData.length === 0 || surfaceData.every(s => s.points.length === 0)) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No matching vertices', rect.width / 2, rect.height / 2);
      return;
    }

    // Compute unified bounds across all surfaces
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const surf of surfaceData) {
      for (const p of surf.points) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
      }
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const rangeZ = maxZ - minZ || 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);

    // 3D to 2D projection with rotation
    const cosRX = Math.cos(view3DRotX), sinRX = Math.sin(view3DRotX);
    const cosRZ = Math.cos(view3DRotZ), sinRZ = Math.sin(view3DRotZ);

    const perspectiveFOV = 60;
    const perspectiveDist = 3.0;

    function project(x, y, z) {
      const nx = (x - centerX) / maxRange;
      const ny = (y - centerY) / maxRange;
      const nz = (z - centerZ) / maxRange;

      const rz_x = nx * cosRZ - ny * sinRZ;
      const rz_y = nx * sinRZ + ny * cosRZ;
      const rz_z = nz;

      const rx_x = rz_x;
      const rx_y = rz_y * cosRX - rz_z * sinRX;
      const rx_z = rz_y * sinRX + rz_z * cosRX;

      const baseScale = Math.min(rect.width, rect.height) * 0.7 * view3DZoom;

      let screenX, screenY;
      if (view3DPerspective) {
        const fovRad = perspectiveFOV * Math.PI / 180;
        const zOffset = perspectiveDist - rx_z;
        const perspectiveScale = (zOffset > 0.1) ? (1 / Math.tan(fovRad / 2)) / zOffset : 10;
        screenX = rect.width / 2 + rx_x * baseScale * perspectiveScale + view3DPanX;
        screenY = rect.height / 2 - rx_y * baseScale * perspectiveScale + view3DPanY;
      } else {
        screenX = rect.width / 2 + rx_x * baseScale + view3DPanX;
        screenY = rect.height / 2 - rx_y * baseScale + view3DPanY;
      }

      return { screenX, screenY, depth: rx_z };
    }

    // Build all drawables for all surfaces
    const allDrawables = [];

    // Lights from preset
    const lights = preset.lights.map(l => ({
      dir: { ...l.dir },
      intensity: l.intensity
    }));
    for (const light of lights) {
      const len = Math.sqrt(light.dir.x**2 + light.dir.y**2 + light.dir.z**2);
      light.dir.x /= len; light.dir.y /= len; light.dir.z /= len;
    }
    const ambientIntensity = preset.ambient;

    for (const surf of surfaceData) {
      const points3D = surf.points;
      const baseR = surf.color.r, baseG = surf.color.g, baseB = surf.color.b;
      const isTinted = !surf.isRe && showRe;  // Im surface when Re also shown

      // Project all vertices
      const pointMap = new Map();
      const projected = [];
      for (const p of points3D) {
        const proj = project(p.x, p.y, p.z);
        const entry = { ...p, ...proj };
        projected.push(entry);
        pointMap.set(`${p.i},${p.j}`, entry);
      }

      // Build edges
      const edges = [];
      for (const p of points3D) {
        const i = p.i, j = p.j;
        const absSum = Math.abs(i) + Math.abs(j);
        const rightKey = `${i+1},${j}`;
        if (pointMap.has(rightKey)) {
          const nAbsSum = Math.abs(i+1) + Math.abs(j);
          if (absSum <= k && nAbsSum <= k) {
            edges.push({ from: `${i},${j}`, to: rightKey });
          }
        }
        const topKey = `${i},${j+1}`;
        if (pointMap.has(topKey)) {
          const nAbsSum = Math.abs(i) + Math.abs(j+1);
          if (absSum <= k && nAbsSum <= k) {
            edges.push({ from: `${i},${j}`, to: topKey });
          }
        }
      }
      edges.push({ from: `${k+1},0`, to: `0,${k+1}` });
      edges.push({ from: `0,${k+1}`, to: `${-(k+1)},0` });
      edges.push({ from: `${-(k+1)},0`, to: `0,${-(k+1)}` });
      edges.push({ from: `0,${-(k+1)}`, to: `${k+1},0` });
      edges.push({ from: `${k+1},0`, to: `${k},0` });
      edges.push({ from: `${-(k+1)},0`, to: `${-k},0` });
      edges.push({ from: `0,${k+1}`, to: `0,${k}` });
      edges.push({ from: `0,${-(k+1)}`, to: `0,${-k}` });
      for (let s = 0; s < k; s++) {
        edges.push({ from: `${k-s},${s}`, to: `${k-s-1},${s+1}` });
        edges.push({ from: `${-s},${k-s}`, to: `${-(s+1)},${k-s-1}` });
        edges.push({ from: `${-(k-s)},${-s}`, to: `${-(k-s-1)},${-(s+1)}` });
        edges.push({ from: `${s},${-(k-s)}`, to: `${s+1},${-(k-s-1)}` });
      }

      // Build faces
      function tryAddFace(keys) {
        const corners = keys.map(key => pointMap.get(key));
        if (corners.every(c => c !== undefined)) {
          const avgDepth = corners.reduce((sum, p) => sum + p.depth, 0) / corners.length;
          const p0 = corners[0], p1 = corners[1], p2 = corners[2];
          const e1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
          const e2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
          const normal = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
          };
          const normLen = Math.sqrt(normal.x*normal.x + normal.y*normal.y + normal.z*normal.z) || 1;
          normal.x /= normLen; normal.y /= normLen; normal.z /= normLen;

          let totalLight = ambientIntensity;
          for (const light of lights) {
            const dot = normal.x * light.dir.x + normal.y * light.dir.y + normal.z * light.dir.z;
            totalLight += Math.max(0, dot) * light.intensity;
          }
          totalLight = Math.min(1.0, totalLight);

          const r = Math.floor(baseR * totalLight);
          const g = Math.floor(baseG * totalLight);
          const b = Math.floor(baseB * totalLight);

          allDrawables.push({ type: 'face', corners, depth: avgDepth, color: `rgb(${r},${g},${b})` });
        }
      }

      // Interior quadrilateral faces
      for (let i = -k; i < k; i++) {
        for (let j = -k; j < k; j++) {
          tryAddFace([`${i},${j}`, `${i+1},${j}`, `${i+1},${j+1}`, `${i},${j+1}`]);
        }
      }
      // Boundary triangular faces
      for (let s = 0; s < k; s++) tryAddFace([`${k+1},0`, `${k-s},${s}`, `${k-s-1},${s+1}`]);
      tryAddFace([`${k+1},0`, `0,${k}`, `0,${k+1}`]);
      for (let s = 0; s < k; s++) tryAddFace([`0,${k+1}`, `${-s},${k-s}`, `${-(s+1)},${k-s-1}`]);
      tryAddFace([`0,${k+1}`, `${-k},0`, `${-(k+1)},0`]);
      for (let s = 0; s < k; s++) tryAddFace([`${-(k+1)},0`, `${-(k-s)},${-s}`, `${-(k-s-1)},${-(s+1)}`]);
      tryAddFace([`${-(k+1)},0`, `0,${-k}`, `0,${-(k+1)}`]);
      for (let s = 0; s < k; s++) tryAddFace([`0,${-(k+1)}`, `${s},${-(k-s)}`, `${s+1},${-(k-s-1)}`]);
      tryAddFace([`0,${-(k+1)}`, `${k},0`, `${k+1},0`]);
      // Beta-beta-inner triangles
      for (let s = 1; s < k; s++) tryAddFace([`${k-s-1},${s}`, `${k-s},${s}`, `${k-s-1},${s+1}`]);
      for (let s = 1; s < k; s++) tryAddFace([`${-s},${k-s-1}`, `${-s},${k-s}`, `${-(s+1)},${k-s-1}`]);
      for (let s = 1; s < k; s++) tryAddFace([`${-(k-s-1)},${-s}`, `${-(k-s)},${-s}`, `${-(k-s-1)},${-(s+1)}`]);
      for (let s = 1; s < k; s++) tryAddFace([`${s},${-(k-s-1)}`, `${s},${-(k-s)}`, `${s+1},${-(k-s-1)}`]);
      // Alpha-beta-inner triangles
      tryAddFace([`${k-1},0`, `${k},0`, `${k-1},1`]);
      tryAddFace([`0,${k-1}`, `0,${k}`, `-1,${k-1}`]);
      tryAddFace([`${-k+1},0`, `${-k},0`, `${-k+1},-1`]);
      tryAddFace([`0,${-k+1}`, `0,${-k}`, `1,${-k+1}`]);

      // Add edges
      const edgeColor = isTinted ? `rgb(${Math.floor(baseR * 0.3)},${Math.floor(baseG * 0.3)},${Math.floor(baseB * 0.3)})` : preset.edgeColor;
      for (const edge of edges) {
        const p1 = pointMap.get(edge.from);
        const p2 = pointMap.get(edge.to);
        if (!p1 || !p2) continue;
        const avgDepth = (p1.depth + p2.depth) / 2;
        allDrawables.push({ type: 'edge', p1, p2, depth: avgDepth, color: edgeColor });
      }

      // Add vertices
      const vertexColor = isTinted ? `rgb(${Math.floor(baseR * 0.5)},${Math.floor(baseG * 0.5)},${Math.floor(baseB * 0.5)})` : preset.vertexColor;
      for (const p of projected) {
        allDrawables.push({ type: 'vertex', p, depth: p.depth, color: vertexColor });
      }
    }

    // Sort ALL drawables from both surfaces by depth (back to front)
    allDrawables.sort((a, b) => a.depth - b.depth);

    // Draw all objects in depth order
    for (const obj of allDrawables) {
      if (obj.type === 'face') {
        if (preset.showFaces === false) continue;
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.moveTo(obj.corners[0].screenX, obj.corners[0].screenY);
        for (let i = 1; i < obj.corners.length; i++) {
          ctx.lineTo(obj.corners[i].screenX, obj.corners[i].screenY);
        }
        ctx.closePath();
        ctx.fill();
      } else if (obj.type === 'edge') {
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = edgeThicknessControl * 0.8;
        ctx.beginPath();
        ctx.moveTo(obj.p1.screenX, obj.p1.screenY);
        ctx.lineTo(obj.p2.screenX, obj.p2.screenY);
        ctx.stroke();
      } else if (obj.type === 'vertex') {
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.arc(obj.p.screenX, obj.p.screenY, vertexSizeControl, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw axes indicator
    const axisLen = 40;
    const axisOrigin = { x: 60, y: rect.height - 60 };
    const zLabel = showRe ? 'O.re' : 'O.im';
    const axes = [
      { dir: [1, 0, 0], color: '#cc0000', label: 'T.re' },
      { dir: [0, 1, 0], color: '#009900', label: 'T.im' },
      { dir: [0, 0, 1], color: '#0000cc', label: zLabel }
    ];

    for (const axis of axes) {
      const [dx, dy, dz] = axis.dir;
      const rz_x = dx * cosRZ - dy * sinRZ;
      const rz_y = dx * sinRZ + dy * cosRZ;
      const rx_x = rz_x;
      const rx_y = rz_y * cosRX - dz * sinRX;

      ctx.strokeStyle = axis.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(axisOrigin.x, axisOrigin.y);
      ctx.lineTo(axisOrigin.x + rx_x * axisLen, axisOrigin.y - rx_y * axisLen);
      ctx.stroke();

      ctx.fillStyle = axis.color;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(axis.label, axisOrigin.x + rx_x * (axisLen + 12), axisOrigin.y - rx_y * (axisLen + 12));
    }

    // Instructions
    ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Drag to rotate', 10, 20);
  }

  function renderStepwiseTemb() {
    const dpr = window.devicePixelRatio || 1;
    const rect = stepwiseCanvas.getBoundingClientRect();
    stepwiseCanvas.width = rect.width * dpr;
    stepwiseCanvas.height = rect.height * dpr;
    stepwiseCtx.scale(dpr, dpr);

    stepwiseCtx.fillStyle = '#fafafa';
    stepwiseCtx.fillRect(0, 0, rect.width, rect.height);

    // Get T_k from face weights
    if (!wasmReady || !getTembeddingLevelJSON) {
      stepwiseCtx.fillStyle = '#666';
      stepwiseCtx.font = '14px sans-serif';
      stepwiseCtx.textAlign = 'center';
      stepwiseCtx.fillText('Loading...', rect.width / 2, rect.height / 2);
      return;
    }

    let ptr = getTembeddingLevelJSON(currentK);
    let jsonStr = Module.UTF8ToString(ptr);
    freeString(ptr);
    const tembLevel = JSON.parse(jsonStr);

    if (!tembLevel || !tembLevel.vertices || tembLevel.vertices.length === 0) {
      stepwiseCtx.fillStyle = '#666';
      stepwiseCtx.font = '14px sans-serif';
      stepwiseCtx.textAlign = 'center';
      stepwiseCtx.fillText(`T_${currentK} not computed yet`, rect.width / 2, rect.height / 2);
      return;
    }

    const vertices = tembLevel.vertices;
    const k = tembLevel.k;

    // Find bounds
    let minRe = Infinity, maxRe = -Infinity;
    let minIm = Infinity, maxIm = -Infinity;
    for (const v of vertices) {
      minRe = Math.min(minRe, v.re);
      maxRe = Math.max(maxRe, v.re);
      minIm = Math.min(minIm, v.im);
      maxIm = Math.max(maxIm, v.im);
    }

    const rangeRe = maxRe - minRe || 1;
    const rangeIm = maxIm - minIm || 1;
    const centerRe = (minRe + maxRe) / 2;
    const centerIm = (minIm + maxIm) / 2;

    const padding = 60;
    const scaleX = (rect.width - 2 * padding) / rangeRe;
    const scaleY = (rect.height - 2 * padding) / rangeIm;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * stepwiseZoom;

    const cx = rect.width / 2 + stepwisePanX * stepwiseZoom;
    const cy = rect.height / 2 + stepwisePanY * stepwiseZoom;

    stepwiseCtx.save();
    stepwiseCtx.translate(cx, cy);

    // Create vertex map by (i,j)
    const vertexMap = {};
    for (const v of vertices) {
      vertexMap[`${v.i},${v.j}`] = v;
    }

    // Draw edges based on T_k structure
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = Math.max(1, scale / 80);

    function drawTembEdge(i1, j1, i2, j2) {
      const v1 = vertexMap[`${i1},${j1}`];
      const v2 = vertexMap[`${i2},${j2}`];
      if (v1 && v2) {
        stepwiseCtx.beginPath();
        stepwiseCtx.moveTo((v1.re - centerRe) * scale, -(v1.im - centerIm) * scale);
        stepwiseCtx.lineTo((v2.re - centerRe) * scale, -(v2.im - centerIm) * scale);
        stepwiseCtx.stroke();
      }
    }

    // Draw T_k edges based on graph structure
    // T_k has:
    //   - External corners: (±(k+1), 0), (0, ±(k+1))
    //   - Alpha vertices: (±k, 0), (0, ±k) (on axis, |i|+|j|=k)
    //   - Beta vertices: |i|+|j|=k, off-axis
    //   - Interior: |i|+|j| < k
    //
    // Edge rules:
    //   1. External corners connect to alpha and to each other (boundary rhombus)
    //   2. Alpha/Beta form the diagonal boundary
    //   3. Interior connects like a lattice

    // Get control values for vertex size and edge thickness
    const tembVertexSizeControl = parseFloat(document.getElementById('temb-vertex-size').value) || 1.5;
    const tembEdgeThicknessControl = parseFloat(document.getElementById('temb-edge-thickness').value) || 1.5;
    const uniformEdgeWidth = Math.max(tembEdgeThicknessControl, scale / 300 * tembEdgeThicknessControl);

    // Draw interior edges (lattice connections)
    stepwiseCtx.strokeStyle = '#333';
    stepwiseCtx.lineWidth = uniformEdgeWidth;

    for (const v of vertices) {
      const i = v.i, j = v.j;
      const absSum = Math.abs(i) + Math.abs(j);

      // Connect to right neighbor (i+1, j) if both interior/boundary
      if (vertexMap[`${i+1},${j}`]) {
        const nAbsSum = Math.abs(i+1) + Math.abs(j);
        // Draw if both are interior (|i|+|j| <= k)
        if (absSum <= k && nAbsSum <= k) {
          drawTembEdge(i, j, i+1, j);
        }
      }

      // Connect to top neighbor (i, j+1) if both interior/boundary
      if (vertexMap[`${i},${j+1}`]) {
        const nAbsSum = Math.abs(i) + Math.abs(j+1);
        if (absSum <= k && nAbsSum <= k) {
          drawTembEdge(i, j, i, j+1);
        }
      }
    }

    // Draw boundary rhombus (external corners)
    // Connect external corners: (k+1,0) -> (0,k+1) -> (-(k+1),0) -> (0,-(k+1)) -> (k+1,0)
    drawTembEdge(k+1, 0, 0, k+1);
    drawTembEdge(0, k+1, -(k+1), 0);
    drawTembEdge(-(k+1), 0, 0, -(k+1));
    drawTembEdge(0, -(k+1), k+1, 0);

    // Connect external corners to alpha vertices
    drawTembEdge(k+1, 0, k, 0);
    drawTembEdge(-(k+1), 0, -k, 0);
    drawTembEdge(0, k+1, 0, k);
    drawTembEdge(0, -(k+1), 0, -k);

    // Connect diagonal boundary vertices (beta and alpha on boundary)
    // These form the edges along the diagonal |i|+|j|=k

    // Right-top diagonal: (k,0) -> (k-1,1) -> ... -> (1,k-1) -> (0,k)
    for (let s = 0; s < k; s++) {
      drawTembEdge(k-s, s, k-s-1, s+1);
    }
    // Left-top diagonal: (0,k) -> (-1,k-1) -> ... -> (-(k-1),1) -> (-k,0)
    for (let s = 0; s < k; s++) {
      drawTembEdge(-s, k-s, -(s+1), k-s-1);
    }
    // Left-bottom diagonal: (-k,0) -> (-(k-1),-1) -> ... -> (-1,-(k-1)) -> (0,-k)
    for (let s = 0; s < k; s++) {
      drawTembEdge(-(k-s), -s, -(k-s-1), -(s+1));
    }
    // Right-bottom diagonal: (0,-k) -> (1,-(k-1)) -> ... -> (k-1,-1) -> (k,0)
    for (let s = 0; s < k; s++) {
      drawTembEdge(s, -(k-s), s+1, -(k-s-1));
    }

    // Draw vertices and store positions for click detection
    const vertexRadius = Math.max(tembVertexSizeControl, scale / 800 * tembVertexSizeControl);
    const showLabels = document.getElementById('show-labels-chk').checked;
    tembVertexScreenPositions = [];  // Reset
    tembCurrentVertices = vertices;  // Store for click handler

    for (const v of vertices) {
      const x = (v.re - centerRe) * scale;
      const y = -(v.im - centerIm) * scale;  // Flip y for standard math orientation

      // Store screen position for click detection
      tembVertexScreenPositions.push({
        screenX: x + cx,
        screenY: y + cy,
        vertex: v
      });

      stepwiseCtx.beginPath();
      stepwiseCtx.arc(x, y, vertexRadius, 0, Math.PI * 2);
      stepwiseCtx.fillStyle = (v.i === 0 && v.j === 0) ? '#ff0000' : '#000';
      stepwiseCtx.fill();

      // Label vertices
      if (showLabels) {
        stepwiseCtx.fillStyle = '#333';
        stepwiseCtx.font = `${Math.max(10, scale / 15)}px sans-serif`;
        stepwiseCtx.textAlign = 'center';
        stepwiseCtx.textBaseline = 'bottom';
        const label = `(${v.i},${v.j})`;
        stepwiseCtx.fillText(label, x, y - vertexRadius - 2);
      }
    }

    stepwiseCtx.restore();

    // Title
    stepwiseCtx.fillStyle = '#333';
    stepwiseCtx.font = '12px sans-serif';
    stepwiseCtx.textAlign = 'left';
    stepwiseCtx.fillText(`T_${k}: ${vertices.length} vertices`, 10, 18);
  }

  function getVertexFormulaHTML(v, level) {
    const coeff = v.coeff.toFixed(3).replace(/\.?0+$/, '');
    const j = v.x, k = v.y;
    const m = v.sourceLevel;

    const typeDescriptions = {
      'boundary_corner': `<strong>Boundary corner</strong> (fixed)`,
      'axis_horizontal': `<strong>Axis boundary</strong> (horizontal)<br>T<sub>${level}</sub>(${j},0) uses α<sub>${m}</sub> = ${coeff}`,
      'axis_vertical': `<strong>Axis boundary</strong> (vertical)<br>T<sub>${level}</sub>(0,${k}) uses α<sub>${m}</sub> = ${coeff}`,
      'diag_positive_j': `<strong>Diagonal boundary</strong> (j > 0)<br>Uses β<sub>${j},${m}</sub> = ${coeff}`,
      'diag_negative_j': `<strong>Diagonal boundary</strong> (j < 0)<br>Uses β<sub>${j},${m}</sub> = ${coeff}`,
      'interior_passthrough': `<strong>Interior pass-through</strong> (j+k+m even)<br>T<sub>${level}</sub>(${j},${k}) = T<sub>${m}</sub>(${j},${k})`,
      'interior_recurrence': `<strong>Interior recurrence</strong> (j+k+m odd)<br>Uses γ<sub>${j},${k},${m}</sub> = ${coeff}`
    };

    let html = typeDescriptions[v.type] || `Unknown type: ${v.type}`;
    html += `<br><br><strong>Value:</strong> ${v.tReal.toFixed(4)} + ${v.tImag.toFixed(4)}i`;
    html += `<br><strong>Dependencies:</strong> ${v.deps.length > 0 ? v.deps.join(', ') : 'none (fixed)'}`;

    return html;
  }

  function handleStepwiseCanvasClick(e) {
    const rect = stepwiseCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    // 20x bigger detection area (was ~15, now 300)
    const clickThreshold = 300 * dpr;
    let closestVertex = null;
    let closestDist = Infinity;

    for (const vp of tembVertexScreenPositions) {
      const dx = clickX - vp.screenX * dpr;
      const dy = clickY - vp.screenY * dpr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < clickThreshold && dist < closestDist) {
        closestDist = dist;
        closestVertex = vp.vertex;
      }
    }

    const vertexInfoDiv = document.getElementById('vertex-info');
    const k = currentK;

    if (closestVertex) {
      const v = closestVertex;
      const i = v.i, j = v.j;
      const re = v.re.toFixed(6);
      const im = v.im.toFixed(6);
      const imSign = v.im >= 0 ? '+' : '';

      // Determine formula based on vertex position
      let formula = '';
      const absSum = Math.abs(i) + Math.abs(j);

      if (absSum === k + 1) {
        // External corner - inherited from previous level
        formula = `T_${k}(${i},${j}) = T_${k-1}(${i > 0 ? k : -k},${j > 0 ? k : (j < 0 ? -k : 0)})`;
        if (i !== 0) formula = `T_${k}(${i},${j}) = T_${k-1}(${i > 0 ? k : -k},0)`;
        else formula = `T_${k}(${i},${j}) = T_${k-1}(0,${j > 0 ? k : -k})`;
      } else if (absSum === k && (i === 0 || j === 0)) {
        // Alpha vertex (on axis)
        const dir = i > 0 ? 'right' : (i < 0 ? 'left' : (j > 0 ? 'top' : 'bottom'));
        formula = `T_${k}(${i},${j}) = (T_${k-1}(${i},${j}) + α_${dir} · T_${k-1}(${i===0 ? 0 : (i>0 ? k-1 : -(k-1))},${j===0 ? 0 : (j>0 ? k-1 : -(k-1))})) / (α_${dir} + 1)`;
      } else if (absSum === k && i !== 0 && j !== 0) {
        // Beta vertex (diagonal)
        formula = `T_${k}(${i},${j}) = (T_${k-1}(...) + β(${i},${j}) · T_${k-1}(...)) / (β(${i},${j}) + 1)`;
      } else if (absSum < k) {
        // Interior
        if ((i + j + k) % 2 === 0) {
          // Pass-through
          formula = `T_${k}(${i},${j}) = T_${k-1}(${i},${j})  [pass-through, i+j+k even]`;
        } else {
          // Recurrence
          formula = `T_${k}(${i},${j}) = (T_${k}(${i-1},${j}) + T_${k}(${i+1},${j}) + γ·(T_${k}(${i},${j+1}) + T_${k}(${i},${j-1}))) / (γ+1) - T_${k-1}(${i},${j})`;
        }
      }

      vertexInfoDiv.innerHTML = `<strong>T_${k}(${i},${j})</strong> = ${re} ${imSign} ${im}i<br><small>${formula}</small>`;
    } else {
      vertexInfoDiv.innerHTML = `<em>Click on a vertex to see its formula (T_${k}, ${tembVertexScreenPositions.length} vertices)</em>`;
    }
  }

  // ========== EVENT LISTENERS ==========

  // Helper to handle N changes - detects dimension change vs same-dimension recompute
  function handlePotentialNChange(newN) {
    if (newN !== currentSimulationN) {
      // Dimension changed: Regenerate graph with uniform weights (user sets weights via Apply)
      initAztecGraph(newN);
      // Weights are uniform by default - user can change via "Apply Weights" button
      currentSimulationN = newN;
      currentK = 0;  // Reset K to 0 when dimension changes
    } else {
      // Same dimension: Preserve weights, just recompute T-embedding
      resetAztecGraphPreservingWeights();
    }
  }

  // ========== WEIGHT PRESET HANDLING ==========

  const weightPresetSelect = document.getElementById('weight-preset-select');
  const iidParams = document.getElementById('iid-params');
  const layeredParams = document.getElementById('layered-params');
  const gammaParams = document.getElementById('gamma-params');
  const periodicParams = document.getElementById('periodic-params');
  const weightsEditor = document.getElementById('weights-editor');
  const weightsTables = document.getElementById('weights-tables');

  // Helper function to update visibility of parameter panels
  function updateParamVisibility(preset) {
    iidParams.style.display = (preset === 'random-iid') ? 'block' : 'none';
    layeredParams.style.display = (preset === 'random-layered') ? 'block' : 'none';
    gammaParams.style.display = (preset === 'random-gamma') ? 'block' : 'none';
    periodicParams.style.display = (preset === 'periodic') ? 'inline' : 'none';
    if (preset === 'periodic') {
      buildWeightsEditor();
      weightsEditor.style.display = 'block';
    } else {
      weightsEditor.style.display = 'none';
    }
  }

  // Handle weight preset dropdown change - show/hide relevant params
  weightPresetSelect.addEventListener('change', () => {
    updateParamVisibility(weightPresetSelect.value);
  });

  // Layered regime radio button handlers
  document.querySelectorAll('input[name="layered-regime"]').forEach(radio => {
    radio.addEventListener('change', function() {
      // Hide all layered regime param divs
      for (let i = 1; i <= 5; i++) {
        const paramDiv = document.getElementById(`layered-regime${i}-params`);
        if (paramDiv) paramDiv.style.display = 'none';
      }
      // Show the selected regime's params
      const selectedDiv = document.getElementById(`layered-regime${this.value}-params`);
      if (selectedDiv) selectedDiv.style.display = 'block';
    });
  });

  // IID distribution type handler - toggle parameter visibility
  const iidDistributionSelect = document.getElementById('iid-distribution-select');
  function updateIIDDistributionParams() {
    const dist = iidDistributionSelect.value;
    document.getElementById('iid-uniform-params').style.display = (dist === 'uniform') ? 'block' : 'none';
    document.getElementById('iid-exponential-params').style.display = (dist === 'exponential') ? 'block' : 'none';
    document.getElementById('iid-pareto-params').style.display = (dist === 'pareto') ? 'block' : 'none';
    document.getElementById('iid-geometric-params').style.display = (dist === 'geometric') ? 'block' : 'none';
  }
  iidDistributionSelect.addEventListener('change', updateIIDDistributionParams);
  updateIIDDistributionParams();  // Initialize on load

  // Initialize visibility
  updateParamVisibility(weightPresetSelect.value);

  // Build periodic weights editor UI
  function buildWeightsEditor() {
    const k = parseInt(document.getElementById('periodic-k').value) || 2;
    const l = parseInt(document.getElementById('periodic-l').value) || 2;
    document.getElementById('weights-editor-dims').textContent = `${k}×${l}`;

    // Initialize periodic params in C++
    if (wasmReady && setPeriodicPeriod) {
      setPeriodicPeriod(k, l);
    }

    // Get current values from C++
    let params = { k: k, l: l, alpha: [], beta: [], gamma: [] };
    if (wasmReady && getPeriodicParams) {
      const ptr = getPeriodicParams();
      const json = Module.UTF8ToString(ptr);
      freeString(ptr);
      params = JSON.parse(json);
    }

    // Initialize default arrays if needed
    for (let j = 0; j < k; j++) {
      if (!params.alpha[j]) params.alpha[j] = [];
      if (!params.beta[j]) params.beta[j] = [];
      if (!params.gamma[j]) params.gamma[j] = [];
      for (let i = 0; i < l; i++) {
        if (params.alpha[j][i] === undefined) params.alpha[j][i] = 1;
        if (params.beta[j][i] === undefined) params.beta[j][i] = 1;
        if (params.gamma[j][i] === undefined) params.gamma[j][i] = 1;
      }
    }

    // Build tables for alpha, beta, gamma
    weightsTables.innerHTML = '';
    const names = ['α (bottom)', 'β (right)', 'γ (left)'];
    const arrays = [params.alpha, params.beta, params.gamma];

    for (let t = 0; t < 3; t++) {
      const table = document.createElement('div');
      table.style.cssText = 'background: white; padding: 8px; border: 1px solid #ddd; border-radius: 4px;';
      table.innerHTML = `<div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">${names[t]}</div>`;

      const grid = document.createElement('div');
      grid.style.cssText = `display: grid; grid-template-columns: repeat(${l}, 1fr); gap: 3px;`;

      for (let j = 0; j < k; j++) {
        for (let i = 0; i < l; i++) {
          const input = document.createElement('input');
          input.type = 'number';
          input.step = '0.1';
          input.value = arrays[t][j][i].toFixed(2);
          input.style.cssText = 'width: 50px; padding: 2px; font-size: 11px;';
          input.dataset.type = t;
          input.dataset.j = j;
          input.dataset.i = i;
          // Update C++ immediately when value changes
          input.addEventListener('input', () => {
            const type = parseInt(input.dataset.type);
            const jIdx = parseInt(input.dataset.j);
            const iIdx = parseInt(input.dataset.i);
            const value = parseFloat(input.value) || 1;
            if (wasmReady && setPeriodicWeight) {
              setPeriodicWeight(type, jIdx, iIdx, value);
            }
          });
          grid.appendChild(input);
        }
      }
      table.appendChild(grid);
      weightsTables.appendChild(table);
    }
  }

  // Predefined presets for each (k, l) combination - pronounced gas patterns
  // Based on two-periodic model from Chhita-Johansson and extensions
  function getDefaultPeriodicPreset(k, l) {
    const presets = {
      '1_1': { desc: 'Uniform', alpha: [[1]], beta: [[1]], gamma: [[1]] },
      '1_2': { desc: 'a=0.3 stripe', alpha: [[0.3, 1]], beta: [[1, 0.3]], gamma: [[1, 1]] },
      '1_3': { desc: 'Wave pattern', alpha: [[0.2, 1, 0.5]], beta: [[1, 0.5, 0.2]], gamma: [[1, 1, 1]] },
      '1_4': { desc: 'Alternating', alpha: [[0.2, 1, 0.2, 1]], beta: [[1, 0.2, 1, 0.2]], gamma: [[1, 1, 1, 1]] },
      '1_5': { desc: 'Gradient', alpha: [[0.1, 0.3, 0.5, 0.8, 1]], beta: [[1, 0.8, 0.5, 0.3, 0.1]], gamma: [[1, 1, 1, 1, 1]] },
      '2_1': { desc: 'a=0.3 stripe', alpha: [[0.3], [1]], beta: [[1], [0.3]], gamma: [[1], [1]] },
      '2_2': { desc: 'Chhita-Johansson a=0.3', alpha: [[0.3, 1], [1, 0.3]], beta: [[0.3, 1], [1, 0.3]], gamma: [[1, 1], [1, 1]] },
      '2_3': { desc: '2×3 checkerboard a=0.25', alpha: [[0.25, 1, 0.25], [1, 0.25, 1]], beta: [[0.25, 1, 0.25], [1, 0.25, 1]], gamma: [[1, 1, 1], [1, 1, 1]] },
      '2_4': { desc: '2×4 wave', alpha: [[0.2, 0.5, 1, 0.5], [0.5, 1, 0.5, 0.2]], beta: [[0.2, 0.5, 1, 0.5], [0.5, 1, 0.5, 0.2]], gamma: [[1, 1, 1, 1], [1, 1, 1, 1]] },
      '2_5': { desc: '2×5 gradient', alpha: [[0.1, 0.2, 0.4, 0.7, 1], [1, 0.7, 0.4, 0.2, 0.1]], beta: [[0.1, 0.2, 0.4, 0.7, 1], [1, 0.7, 0.4, 0.2, 0.1]], gamma: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1]] },
      '3_1': { desc: 'Wave pattern', alpha: [[0.2], [1], [0.5]], beta: [[1], [0.5], [0.2]], gamma: [[1], [1], [1]] },
      '3_2': { desc: '3×2 checkerboard a=0.25', alpha: [[0.25, 1], [1, 0.25], [0.25, 1]], beta: [[0.25, 1], [1, 0.25], [0.25, 1]], gamma: [[1, 1], [1, 1], [1, 1]] },
      '3_3': { desc: '3×3 center focus a=0.15', alpha: [[0.4, 0.25, 0.4], [0.25, 0.15, 0.25], [0.4, 0.25, 0.4]], beta: [[0.4, 0.25, 0.4], [0.25, 0.15, 0.25], [0.4, 0.25, 0.4]], gamma: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] },
      '3_4': { desc: '3×4 diagonal', alpha: [[0.15, 0.3, 0.6, 1], [0.3, 0.15, 0.3, 0.6], [0.6, 0.3, 0.15, 0.3]], beta: [[0.15, 0.3, 0.6, 1], [0.3, 0.15, 0.3, 0.6], [0.6, 0.3, 0.15, 0.3]], gamma: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]] },
      '3_5': { desc: '3×5 wave', alpha: [[0.1, 0.3, 0.6, 0.3, 0.1], [0.3, 0.6, 1, 0.6, 0.3], [0.1, 0.3, 0.6, 0.3, 0.1]], beta: [[0.1, 0.3, 0.6, 0.3, 0.1], [0.3, 0.6, 1, 0.6, 0.3], [0.1, 0.3, 0.6, 0.3, 0.1]], gamma: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]] },
      '4_1': { desc: 'Alternating', alpha: [[0.2], [1], [0.2], [1]], beta: [[1], [0.2], [1], [0.2]], gamma: [[1], [1], [1], [1]] },
      '4_2': { desc: '4×2 wave', alpha: [[0.2, 0.5], [0.5, 1], [1, 0.5], [0.5, 0.2]], beta: [[0.2, 0.5], [0.5, 1], [1, 0.5], [0.5, 0.2]], gamma: [[1, 1], [1, 1], [1, 1], [1, 1]] },
      '4_3': { desc: '4×3 diagonal', alpha: [[0.15, 0.3, 0.6], [0.3, 0.15, 0.3], [0.6, 0.3, 0.15], [1, 0.6, 0.3]], beta: [[0.15, 0.3, 0.6], [0.3, 0.15, 0.3], [0.6, 0.3, 0.15], [1, 0.6, 0.3]], gamma: [[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]] },
      '4_4': { desc: '4×4 center focus a=0.1', alpha: [[0.5, 0.3, 0.3, 0.5], [0.3, 0.1, 0.1, 0.3], [0.3, 0.1, 0.1, 0.3], [0.5, 0.3, 0.3, 0.5]], beta: [[0.5, 0.3, 0.3, 0.5], [0.3, 0.1, 0.1, 0.3], [0.3, 0.1, 0.1, 0.3], [0.5, 0.3, 0.3, 0.5]], gamma: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]] },
      '4_5': { desc: '4×5 wave', alpha: [[0.1, 0.2, 0.4, 0.2, 0.1], [0.2, 0.4, 0.7, 0.4, 0.2], [0.4, 0.7, 1, 0.7, 0.4], [0.2, 0.4, 0.7, 0.4, 0.2]], beta: [[0.1, 0.2, 0.4, 0.2, 0.1], [0.2, 0.4, 0.7, 0.4, 0.2], [0.4, 0.7, 1, 0.7, 0.4], [0.2, 0.4, 0.7, 0.4, 0.2]], gamma: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]] },
      '5_1': { desc: 'Gradient', alpha: [[0.1], [0.3], [0.5], [0.8], [1]], beta: [[1], [0.8], [0.5], [0.3], [0.1]], gamma: [[1], [1], [1], [1], [1]] },
      '5_2': { desc: '5×2 gradient', alpha: [[0.1, 1], [0.2, 0.7], [0.4, 0.4], [0.7, 0.2], [1, 0.1]], beta: [[0.1, 1], [0.2, 0.7], [0.4, 0.4], [0.7, 0.2], [1, 0.1]], gamma: [[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]] },
      '5_3': { desc: '5×3 wave', alpha: [[0.1, 0.3, 0.1], [0.3, 0.6, 0.3], [0.6, 1, 0.6], [0.3, 0.6, 0.3], [0.1, 0.3, 0.1]], beta: [[0.1, 0.3, 0.1], [0.3, 0.6, 0.3], [0.6, 1, 0.6], [0.3, 0.6, 0.3], [0.1, 0.3, 0.1]], gamma: [[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]] },
      '5_4': { desc: '5×4 wave', alpha: [[0.1, 0.2, 0.2, 0.1], [0.2, 0.4, 0.4, 0.2], [0.4, 0.7, 0.7, 0.4], [0.2, 0.4, 0.4, 0.2], [0.1, 0.2, 0.2, 0.1]], beta: [[0.1, 0.2, 0.2, 0.1], [0.2, 0.4, 0.4, 0.2], [0.4, 0.7, 0.7, 0.4], [0.2, 0.4, 0.4, 0.2], [0.1, 0.2, 0.2, 0.1]], gamma: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]] },
      '5_5': { desc: '5×5 center focus a=0.08', alpha: [[0.5, 0.35, 0.25, 0.35, 0.5], [0.35, 0.2, 0.12, 0.2, 0.35], [0.25, 0.12, 0.08, 0.12, 0.25], [0.35, 0.2, 0.12, 0.2, 0.35], [0.5, 0.35, 0.25, 0.35, 0.5]], beta: [[0.5, 0.35, 0.25, 0.35, 0.5], [0.35, 0.2, 0.12, 0.2, 0.35], [0.25, 0.12, 0.08, 0.12, 0.25], [0.35, 0.2, 0.12, 0.2, 0.35], [0.5, 0.35, 0.25, 0.35, 0.5]], gamma: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]] }
    };

    const key = `${k}_${l}`;
    if (presets[key]) return presets[key];

    // Fallback: generate checkerboard pattern for unlisted k×l
    const alpha = [], beta = [], gamma = [];
    for (let j = 0; j < k; j++) {
      alpha[j] = []; beta[j] = []; gamma[j] = [];
      for (let i = 0; i < l; i++) {
        alpha[j][i] = (i + j) % 2 === 0 ? 0.3 : 1;
        beta[j][i] = (i + j) % 2 === 0 ? 0.3 : 1;
        gamma[j][i] = 1;
      }
    }
    return { desc: 'Checkerboard a=0.3', alpha, beta, gamma };
  }

  // Rebuild editor with default preset when k or l changes
  document.getElementById('periodic-k').addEventListener('change', () => {
    if (weightPresetSelect.value === 'periodic') {
      applyDefaultPeriodicPreset();
    }
  });
  document.getElementById('periodic-l').addEventListener('change', () => {
    if (weightPresetSelect.value === 'periodic') {
      applyDefaultPeriodicPreset();
    }
  });

  // Apply default preset for current k, l
  function applyDefaultPeriodicPreset() {
    const k = parseInt(document.getElementById('periodic-k').value) || 2;
    const l = parseInt(document.getElementById('periodic-l').value) || 2;
    const preset = getDefaultPeriodicPreset(k, l);

    // Update description
    document.getElementById('periodic-preset-desc').textContent = preset.desc;
    document.getElementById('weights-editor-dims').textContent = `${k}×${l}`;

    // Update C++
    if (wasmReady && setPeriodicPeriod) {
      setPeriodicPeriod(k, l);
    }

    // Set the weights in C++
    if (wasmReady && setPeriodicWeight) {
      for (let j = 0; j < k; j++) {
        for (let i = 0; i < l; i++) {
          setPeriodicWeight(0, j, i, preset.alpha[j][i]);
          setPeriodicWeight(1, j, i, preset.beta[j][i]);
          setPeriodicWeight(2, j, i, preset.gamma[j][i]);
        }
      }
    }

    // Rebuild the UI table with preset values
    rebuildWeightsTables(k, l, preset);
  }

  // Build the weights tables UI from preset
  function rebuildWeightsTables(k, l, preset) {
    weightsTables.innerHTML = '';
    const names = ['α (bottom)', 'β (right)', 'γ (left)'];
    const arrays = [preset.alpha, preset.beta, preset.gamma];

    for (let t = 0; t < 3; t++) {
      const table = document.createElement('div');
      table.style.cssText = 'background: white; padding: 8px; border: 1px solid #ddd; border-radius: 4px;';
      table.innerHTML = `<div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">${names[t]}</div>`;

      const grid = document.createElement('div');
      grid.style.cssText = `display: grid; grid-template-columns: repeat(${l}, 1fr); gap: 3px;`;

      for (let j = 0; j < k; j++) {
        for (let i = 0; i < l; i++) {
          const input = document.createElement('input');
          input.type = 'number';
          input.step = '0.1';
          input.value = arrays[t][j][i].toFixed(2);
          input.style.cssText = 'width: 50px; padding: 2px; font-size: 11px;';
          input.dataset.type = t;
          input.dataset.j = j;
          input.dataset.i = i;
          input.addEventListener('input', () => {
            const type = parseInt(input.dataset.type);
            const jIdx = parseInt(input.dataset.j);
            const iIdx = parseInt(input.dataset.i);
            const value = parseFloat(input.value) || 1;
            if (wasmReady && setPeriodicWeight) {
              setPeriodicWeight(type, jIdx, iIdx, value);
            }
          });
          grid.appendChild(input);
        }
      }
      table.appendChild(grid);
      weightsTables.appendChild(table);
    }
  }

  // Override buildWeightsEditor to apply default preset
  const originalBuildWeightsEditor = buildWeightsEditor;
  buildWeightsEditor = function() {
    applyDefaultPeriodicPreset();
  };

  // Close weights editor
  document.getElementById('close-weights-btn').addEventListener('click', () => {
    weightsEditor.style.display = 'none';
  });

  // Helper function to get layered regime parameters from UI
  function getLayeredParams() {
    const selectedRegime = document.querySelector('input[name="layered-regime"]:checked');
    const regime = selectedRegime ? parseInt(selectedRegime.value) : 3;

    let p1 = 1, p2 = 1, prob1 = 0.5, prob2 = 0.5;

    switch (regime) {
      case 1:
        p1 = parseFloat(document.getElementById('layered1-val1').value) || 1;
        p2 = parseFloat(document.getElementById('layered1-val2').value) || 1;
        prob1 = parseFloat(document.getElementById('layered1-prob1').value) || 0.5;
        prob2 = parseFloat(document.getElementById('layered1-prob2').value) || 0.5;
        break;
      case 2:
        p1 = parseFloat(document.getElementById('layered2-val1').value) || 2;
        p2 = parseFloat(document.getElementById('layered2-val2').value) || 1;
        break;
      case 3:
        p1 = parseFloat(document.getElementById('layered3-val1').value) || 2;
        p2 = parseFloat(document.getElementById('layered3-val2').value) || 0.5;
        prob1 = parseFloat(document.getElementById('layered3-prob1').value) || 0.5;
        prob2 = parseFloat(document.getElementById('layered3-prob2').value) || 0.5;
        break;
      case 4:
        p1 = parseFloat(document.getElementById('layered4-w1').value) || 2;
        p2 = parseFloat(document.getElementById('layered4-w2').value) || 0.5;
        break;
      case 5:
        p1 = parseFloat(document.getElementById('layered5-min').value) || 0.5;
        p2 = parseFloat(document.getElementById('layered5-max').value) || 2.0;
        break;
    }

    return { regime, p1, p2, prob1, prob2 };
  }

  // Show/hide warning and update V/E defaults as user types n value
  document.getElementById('n-input').addEventListener('input', () => {
    const n = parseInt(document.getElementById('n-input').value) || 6;
    const warning = document.getElementById('n-warning');
    if (warning) warning.style.display = (n > 60) ? 'inline' : 'none';
    // Update V/E controls to scale with n
    updateVEForN(n);
  });

  // Main compute button - initializes graph with weights and computes
  document.getElementById('compute-btn').addEventListener('click', () => {
    const n = parseN();
    const preset = weightPresetSelect.value;

    // Update V/E defaults based on n
    updateVEForN(n);

    // Always treat as fresh simulation state
    currentSimulationN = n;
    currentK = 0;

    initAztecGraph(n);

    // Set weight mode and parameters
    // Mode: 0=All 1's, 1=Random IID, 2=Random Layered, 3=Random Gamma, 4=Periodic
    if (preset === 'all-ones') {
      currentWeightMode = 0;
      setAztecWeightMode(0);
    } else if (preset === 'random-iid') {
      const seed = parseInt(document.getElementById('random-seed').value) || 42;
      seedRng(seed);
      const distType = document.getElementById('iid-distribution-select').value;
      if (distType === 'uniform') {
        const minVal = parseFloat(document.getElementById('iid-min').value) || 0.5;
        const maxVal = parseFloat(document.getElementById('iid-max').value) || 2.0;
        setIIDDistribution(0, 0, 0);  // dist=0 for uniform
        setRandomIIDParams(minVal, maxVal);
      } else if (distType === 'exponential') {
        setIIDDistribution(1, 1.0, 0);  // dist=1, lambda=1 (other values just scale, no effect on T-emb)
      } else if (distType === 'pareto') {
        const alpha = parseFloat(document.getElementById('iid-pareto-alpha').value) || 2.0;
        const xmin = parseFloat(document.getElementById('iid-pareto-xmin').value) || 1.0;
        setIIDDistribution(2, alpha, xmin);  // dist=2, p1=alpha, p2=xmin
      } else if (distType === 'geometric') {
        const p = parseFloat(document.getElementById('iid-geom-p').value) || 0.5;
        setIIDDistribution(3, p, 0);  // dist=3, p1=p
      }
      currentWeightMode = 1;
      setAztecWeightMode(1);
    } else if (preset === 'random-layered') {
      const seed = parseInt(document.getElementById('layered-seed').value) || 42;
      seedRng(seed);
      const params = getLayeredParams();
      setLayeredParams(params.regime, params.p1, params.p2, params.prob1, params.prob2);
      currentWeightMode = 2;
      setAztecWeightMode(2);
    } else if (preset === 'random-gamma') {
      const alpha = parseFloat(document.getElementById('gamma-alpha').value) || 0.2;
      const beta = parseFloat(document.getElementById('gamma-beta').value) || 0.25;
      const seed = parseInt(document.getElementById('gamma-seed').value) || 42;
      seedRng(seed);
      setGammaParams(alpha, beta);
      currentWeightMode = 3;
      setAztecWeightMode(3);
    } else if (preset === 'periodic') {
      // Weights are already set by the editor UI via setPeriodicWeight calls
      // Just apply periodic mode - don't re-initialize period which would reset weights
      currentWeightMode = 4;
      setAztecWeightMode(4);
    }

    computeAndDisplay();
  });

  // Aztec graph buttons
  document.getElementById('aztec-down-btn').addEventListener('click', aztecTransformDown);
  document.getElementById('aztec-up-btn').addEventListener('click', aztecTransformUp);
  document.getElementById('aztec-fast-down-btn').addEventListener('click', aztecFastForward);
  document.getElementById('aztec-fast-up-btn').addEventListener('click', aztecFastBackward);

  // T-embedding step buttons
  document.getElementById('step-prev-btn').addEventListener('click', () => {
    if (currentK > 0) {
      currentK--;
      updateStepDisplay();
      renderStepwiseTemb();
    }
  });

  document.getElementById('step-next-btn').addEventListener('click', () => {
    if (currentK < maxK) {
      currentK++;
      updateStepDisplay();
      renderStepwiseTemb();
    }
  });

  // Checkboxes
  document.getElementById('show-labels-chk').addEventListener('change', renderStepwiseTemb);
  document.getElementById('show-aztec-weights-chk').addEventListener('change', renderAztecGraph);
  document.getElementById('show-face-weights-chk').addEventListener('change', renderAztecGraph);
  document.getElementById('show-origami-chk').addEventListener('change', renderMain2DTemb);

  // Re/Im surface checkboxes (3D mode)
  document.getElementById('show-re-surface-chk').addEventListener('change', () => {
    if (mainViewIs3D) renderMain3D();
  });
  document.getElementById('show-im-surface-chk').addEventListener('change', () => {
    if (mainViewIs3D) renderMain3D();
  });

  // Main 2D/3D T-embedding size controls
  document.getElementById('main-2d-vertex-size').addEventListener('input', () => {
    if (mainViewIs3D) renderMain3D();
    else renderMain2DTemb();
  });
  document.getElementById('main-2d-edge-thickness').addEventListener('input', () => {
    if (mainViewIs3D) renderMain3D();
    else renderMain2DTemb();
  });

  // 2D/3D toggle button
  document.getElementById('toggle-2d-3d-btn').addEventListener('click', () => {
    mainViewIs3D = !mainViewIs3D;
    const btn = document.getElementById('toggle-2d-3d-btn');
    const container2D = document.getElementById('main-2d-container');
    const container3D = document.getElementById('main-3d-container');
    const projBtn = document.getElementById('toggle-projection-btn');
    const presetBtn = document.getElementById('cycle-preset-btn');
    const rotateBtn = document.getElementById('auto-rotate-btn');
    const surfaceSelectControls = document.getElementById('surface-select-controls');

    if (mainViewIs3D) {
      btn.textContent = '3D';
      container2D.style.display = 'none';
      container3D.style.display = 'block';
      projBtn.style.display = '';
      presetBtn.style.display = '';
      rotateBtn.style.display = '';
      surfaceSelectControls.style.display = '';
      renderMain3D();
    } else {
      btn.textContent = '2D';
      container2D.style.display = 'block';
      container3D.style.display = 'none';
      projBtn.style.display = 'none';
      presetBtn.style.display = 'none';
      rotateBtn.style.display = 'none';
      surfaceSelectControls.style.display = 'none';
      // Stop auto-rotate when switching to 2D
      if (view3DAutoRotate) {
        view3DAutoRotate = false;
        if (view3DAutoRotateId) cancelAnimationFrame(view3DAutoRotateId);
        rotateBtn.style.background = 'rgba(255,255,255,0.9)';
      }
      renderMain2DTemb();
    }
  });

  // 3D projection toggle (ortho/perspective)
  document.getElementById('toggle-projection-btn').addEventListener('click', () => {
    view3DPerspective = !view3DPerspective;
    const btn = document.getElementById('toggle-projection-btn');
    btn.textContent = view3DPerspective ? '📦' : '🎯';  // 📦 = perspective, 🎯 = ortho
    btn.title = view3DPerspective ? 'Switch to orthographic' : 'Switch to perspective';
    renderMain3D();
  });

  // 3D preset cycle
  document.getElementById('cycle-preset-btn').addEventListener('click', () => {
    view3DPresetIndex = (view3DPresetIndex + 1) % VISUAL_PRESETS_3D.length;
    const preset = VISUAL_PRESETS_3D[view3DPresetIndex];
    const btn = document.getElementById('cycle-preset-btn');
    btn.textContent = preset.icon;
    btn.title = `Preset: ${preset.name}`;
    renderMain3D();
  });

  // Auto-rotate animation
  function autoRotateStep() {
    if (!view3DAutoRotate) return;
    view3DRotZ += 0.01;  // Rotate around Z axis
    renderMain3D();
    view3DAutoRotateId = requestAnimationFrame(autoRotateStep);
  }

  // Auto-rotate toggle
  document.getElementById('auto-rotate-btn').addEventListener('click', () => {
    view3DAutoRotate = !view3DAutoRotate;
    const btn = document.getElementById('auto-rotate-btn');
    if (view3DAutoRotate) {
      btn.style.background = 'rgba(100,200,100,0.9)';
      btn.title = 'Stop auto-rotate';
      autoRotateStep();
    } else {
      btn.style.background = 'rgba(255,255,255,0.9)';
      btn.title = 'Toggle auto-rotate';
      if (view3DAutoRotateId) cancelAnimationFrame(view3DAutoRotateId);
    }
  });

  // Main canvas zoom buttons (works for both 2D and 3D modes)
  document.getElementById('main-zoom-in-btn').addEventListener('click', () => {
    if (mainViewIs3D) {
      view3DZoom = Math.min(5, view3DZoom * 1.25);
      renderMain3D();
    } else {
      main2DZoom = Math.min(20, main2DZoom * 1.25);
      renderMain2DTemb();
    }
  });

  document.getElementById('main-zoom-out-btn').addEventListener('click', () => {
    if (mainViewIs3D) {
      view3DZoom = Math.max(0.05, view3DZoom / 1.25);
      renderMain3D();
    } else {
      main2DZoom = Math.max(0.02, main2DZoom / 1.25);
      renderMain2DTemb();
    }
  });

  document.getElementById('main-zoom-reset-btn').addEventListener('click', () => {
    if (mainViewIs3D) {
      view3DZoom = 1.0;
      view3DRotX = -0.6;
      view3DRotZ = 0.5;
      view3DPanX = 0;
      view3DPanY = 0;
      renderMain3D();
    } else {
      main2DZoom = 1.0;
      main2DPanX = 0;
      main2DPanY = 0;
      renderMain2DTemb();
    }
  });

  // Main 2D canvas pan/zoom handlers
  const main2DCanvas = document.getElementById('main-temb-2d-canvas');

  main2DCanvas.addEventListener('mousedown', (e) => {
    main2DIsPanning = true;
    main2DLastPanX = e.clientX;
    main2DLastPanY = e.clientY;
    main2DCanvas.style.cursor = 'grabbing';
  });

  main2DCanvas.addEventListener('mousemove', (e) => {
    if (!main2DIsPanning) return;
    const dx = e.clientX - main2DLastPanX;
    const dy = e.clientY - main2DLastPanY;
    main2DPanX += dx;
    main2DPanY += dy;
    main2DLastPanX = e.clientX;
    main2DLastPanY = e.clientY;
    renderMain2DTemb();
  });

  main2DCanvas.addEventListener('mouseup', () => {
    main2DIsPanning = false;
    main2DCanvas.style.cursor = 'grab';
  });

  main2DCanvas.addEventListener('mouseleave', () => {
    main2DIsPanning = false;
    main2DCanvas.style.cursor = 'grab';
  });

  main2DCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    main2DZoom = Math.max(0.02, Math.min(50, main2DZoom * factor));
    renderMain2DTemb();
  }, { passive: false });

  // Main 2D canvas click handler for vertex info
  let main2DClickStartX = 0, main2DClickStartY = 0;
  main2DCanvas.addEventListener('mousedown', (e) => {
    main2DClickStartX = e.clientX;
    main2DClickStartY = e.clientY;
  }, true);

  main2DCanvas.addEventListener('click', (e) => {
    // Only handle click if mouse didn't move much (not a drag)
    const dx = e.clientX - main2DClickStartX;
    const dy = e.clientY - main2DClickStartY;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return;

    const rect = main2DCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clickThreshold = 20;
    let closestVertex = null;
    let closestDist = Infinity;

    for (const vp of main2DVertexScreenPositions) {
      const vdx = clickX - vp.screenX;
      const vdy = clickY - vp.screenY;
      const dist = Math.sqrt(vdx * vdx + vdy * vdy);
      if (dist < clickThreshold && dist < closestDist) {
        closestDist = dist;
        closestVertex = vp.vertex;
      }
    }

    main2DSelectedVertex = closestVertex;
    renderMain2DTemb();
  });

  // Main 2D canvas touch handlers for iOS
  let main2DTouchStartDist = 0;
  let main2DTouchStartZoom = 1;
  main2DCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      main2DIsPanning = true;
      main2DLastPanX = e.touches[0].clientX;
      main2DLastPanY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      main2DIsPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      main2DTouchStartDist = Math.sqrt(dx * dx + dy * dy);
      main2DTouchStartZoom = main2DZoom;
    }
  }, { passive: true });

  main2DCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && main2DIsPanning) {
      const dx = e.touches[0].clientX - main2DLastPanX;
      const dy = e.touches[0].clientY - main2DLastPanY;
      main2DPanX += dx;
      main2DPanY += dy;
      main2DLastPanX = e.touches[0].clientX;
      main2DLastPanY = e.touches[0].clientY;
      renderMain2DTemb();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (main2DTouchStartDist > 0) {
        main2DZoom = Math.max(0.02, Math.min(50, main2DTouchStartZoom * (dist / main2DTouchStartDist)));
        renderMain2DTemb();
      }
    }
  }, { passive: false });

  main2DCanvas.addEventListener('touchend', () => {
    main2DIsPanning = false;
    main2DTouchStartDist = 0;
  }, { passive: true });

  // 3D canvas rotation/pan handlers
  main3DCanvas.addEventListener('mousedown', (e) => {
    view3DLastX = e.clientX;
    view3DLastY = e.clientY;
    if (e.metaKey || e.ctrlKey) {
      view3DIsPanning = true;
      main3DCanvas.style.cursor = 'move';
    } else {
      view3DIsDragging = true;
      main3DCanvas.style.cursor = 'grabbing';
    }
  });

  main3DCanvas.addEventListener('mousemove', (e) => {
    if (!view3DIsDragging && !view3DIsPanning) return;
    const dx = e.clientX - view3DLastX;
    const dy = e.clientY - view3DLastY;
    if (view3DIsPanning) {
      view3DPanX += dx;
      view3DPanY += dy;
    } else {
      view3DRotZ += dx * 0.01;  // Horizontal drag = spin around Z
      view3DRotX += dy * 0.01;  // Vertical drag = tilt around X (no clamping - allow view from below)
    }
    view3DLastX = e.clientX;
    view3DLastY = e.clientY;
    renderMain3D();
  });

  main3DCanvas.addEventListener('mouseup', () => {
    view3DIsDragging = false;
    view3DIsPanning = false;
    main3DCanvas.style.cursor = 'grab';
  });

  main3DCanvas.addEventListener('mouseleave', () => {
    view3DIsDragging = false;
    view3DIsPanning = false;
    main3DCanvas.style.cursor = 'grab';
  });

  main3DCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    view3DZoom = Math.max(0.05, Math.min(20, view3DZoom * factor));
    renderMain3D();
  }, { passive: false });

  // 3D canvas touch handlers for iOS
  let view3DTouchStartDist = 0;
  let view3DTouchStartZoom = 1;
  main3DCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      view3DIsDragging = true;
      view3DLastX = e.touches[0].clientX;
      view3DLastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      view3DIsDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      view3DTouchStartDist = Math.sqrt(dx * dx + dy * dy);
      view3DTouchStartZoom = view3DZoom;
    }
  }, { passive: true });

  main3DCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && view3DIsDragging) {
      const dx = e.touches[0].clientX - view3DLastX;
      const dy = e.touches[0].clientY - view3DLastY;
      view3DRotZ += dx * 0.01;
      view3DRotX += dy * 0.01;  // No clamping - allow view from below
      view3DLastX = e.touches[0].clientX;
      view3DLastY = e.touches[0].clientY;
      renderMain3D();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (view3DTouchStartDist > 0) {
        view3DZoom = Math.max(0.05, Math.min(20, view3DTouchStartZoom * (dist / view3DTouchStartDist)));
        renderMain3D();
      }
    }
  }, { passive: false });

  main3DCanvas.addEventListener('touchend', () => {
    view3DIsDragging = false;
    view3DTouchStartDist = 0;
  }, { passive: true });

  // T-embedding size controls
  document.getElementById('temb-vertex-size').addEventListener('input', renderStepwiseTemb);
  document.getElementById('temb-edge-thickness').addEventListener('input', renderStepwiseTemb);

  // T-embedding canvas pan/zoom
  stepwiseCanvas.addEventListener('click', handleStepwiseCanvasClick);

  stepwiseCanvas.addEventListener('mousedown', (e) => {
    stepwiseIsPanning = true;
    stepwiseLastPanX = e.clientX;
    stepwiseLastPanY = e.clientY;
    stepwiseCanvas.style.cursor = 'grabbing';
  });

  stepwiseCanvas.addEventListener('mousemove', (e) => {
    if (!stepwiseIsPanning) return;
    const dx = e.clientX - stepwiseLastPanX;
    const dy = e.clientY - stepwiseLastPanY;
    stepwisePanX += dx / stepwiseZoom;
    stepwisePanY += dy / stepwiseZoom;
    stepwiseLastPanX = e.clientX;
    stepwiseLastPanY = e.clientY;
    renderStepwiseTemb();
  });

  stepwiseCanvas.addEventListener('mouseup', () => {
    stepwiseIsPanning = false;
    stepwiseCanvas.style.cursor = 'grab';
  });

  stepwiseCanvas.addEventListener('mouseleave', () => {
    stepwiseIsPanning = false;
    stepwiseCanvas.style.cursor = 'grab';
  });

  stepwiseCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    stepwiseZoom = Math.max(0.02, Math.min(50, stepwiseZoom * factor));
    renderStepwiseTemb();
  }, { passive: false });

  // Stepwise canvas touch handlers for iOS
  let stepwiseTouchStartDist = 0;
  let stepwiseTouchStartZoom = 1;
  stepwiseCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      stepwiseIsPanning = true;
      stepwiseLastPanX = e.touches[0].clientX;
      stepwiseLastPanY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      stepwiseIsPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      stepwiseTouchStartDist = Math.sqrt(dx * dx + dy * dy);
      stepwiseTouchStartZoom = stepwiseZoom;
    }
  }, { passive: true });

  stepwiseCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && stepwiseIsPanning) {
      const dx = e.touches[0].clientX - stepwiseLastPanX;
      const dy = e.touches[0].clientY - stepwiseLastPanY;
      stepwisePanX += dx / stepwiseZoom;
      stepwisePanY += dy / stepwiseZoom;
      stepwiseLastPanX = e.touches[0].clientX;
      stepwiseLastPanY = e.touches[0].clientY;
      renderStepwiseTemb();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (stepwiseTouchStartDist > 0) {
        stepwiseZoom = Math.max(0.02, Math.min(50, stepwiseTouchStartZoom * (dist / stepwiseTouchStartDist)));
        renderStepwiseTemb();
      }
    }
  }, { passive: false });

  stepwiseCanvas.addEventListener('touchend', () => {
    stepwiseIsPanning = false;
    stepwiseTouchStartDist = 0;
  }, { passive: true });

  // Aztec canvas click and pan/zoom
  aztecCanvas.addEventListener('click', handleAztecCanvasClick);

  aztecCanvas.addEventListener('mousedown', (e) => {
    aztecIsPanning = true;
    aztecDidPan = false;
    aztecLastPanX = e.clientX;
    aztecLastPanY = e.clientY;
    aztecCanvas.style.cursor = 'grabbing';
  });

  aztecCanvas.addEventListener('mousemove', (e) => {
    if (!aztecIsPanning) return;
    const dx = e.clientX - aztecLastPanX;
    const dy = e.clientY - aztecLastPanY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      aztecDidPan = true;
    }
    aztecPanX += dx / aztecZoom;
    aztecPanY += dy / aztecZoom;
    aztecLastPanX = e.clientX;
    aztecLastPanY = e.clientY;
    renderAztecGraph();
  });

  aztecCanvas.addEventListener('mouseup', () => {
    aztecIsPanning = false;
    aztecCanvas.style.cursor = 'grab';
  });

  aztecCanvas.addEventListener('mouseleave', () => {
    aztecIsPanning = false;
    aztecCanvas.style.cursor = 'grab';
  });

  aztecCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    aztecZoom = Math.max(0.02, Math.min(50, aztecZoom * factor));
    renderAztecGraph();
  }, { passive: false });

  // Aztec canvas touch handlers for iOS
  let aztecTouchStartDist = 0;
  let aztecTouchStartZoom = 1;
  aztecCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      aztecIsPanning = true;
      aztecDidPan = false;
      aztecLastPanX = e.touches[0].clientX;
      aztecLastPanY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      aztecIsPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      aztecTouchStartDist = Math.sqrt(dx * dx + dy * dy);
      aztecTouchStartZoom = aztecZoom;
    }
  }, { passive: true });

  aztecCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && aztecIsPanning) {
      const dx = e.touches[0].clientX - aztecLastPanX;
      const dy = e.touches[0].clientY - aztecLastPanY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) aztecDidPan = true;
      aztecPanX += dx / aztecZoom;
      aztecPanY += dy / aztecZoom;
      aztecLastPanX = e.touches[0].clientX;
      aztecLastPanY = e.touches[0].clientY;
      renderAztecGraph();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (aztecTouchStartDist > 0) {
        aztecZoom = Math.max(0.02, Math.min(50, aztecTouchStartZoom * (dist / aztecTouchStartDist)));
        renderAztecGraph();
      }
    }
  }, { passive: false });

  aztecCanvas.addEventListener('touchend', () => {
    aztecIsPanning = false;
    aztecTouchStartDist = 0;
  }, { passive: true });

  // ========== EXPORT FUNCTIONS ==========

  // Generate export filename with n and weight parameters
  function generateExportFilename(extension) {
    const n = parseInt(document.getElementById('n-input').value) || 6;
    const weightPreset = document.getElementById('weight-preset-select').value || 'unknown';

    let weightStr = weightPreset;
    if (weightPreset === 'random-iid') {
      const distType = document.getElementById('iid-distribution-select').value;
      if (distType === 'uniform') {
        const a = document.getElementById('iid-min').value;
        const b = document.getElementById('iid-max').value;
        weightStr = `iid-uniform-${a}-${b}`;
      } else if (distType === 'exponential') {
        weightStr = `iid-exp1`;
      } else if (distType === 'pareto') {
        const alpha = document.getElementById('iid-pareto-alpha').value;
        const xmin = document.getElementById('iid-pareto-xmin').value;
        weightStr = `iid-pareto-${alpha}-${xmin}`;
      } else if (distType === 'geometric') {
        const p = document.getElementById('iid-geom-p').value;
        weightStr = `iid-geom-${p}`;
      }
    } else if (weightPreset === 'random-gamma') {
      const alpha = document.getElementById('gamma-alpha').value;
      const beta = document.getElementById('gamma-beta').value;
      weightStr = `gamma-${alpha}-${beta}`;
    } else if (weightPreset === 'random-layered') {
      const regime = document.querySelector('input[name="layered-regime"]:checked');
      const regimeNum = regime ? regime.value : '?';
      weightStr = `layered-${regimeNum}`;
    } else if (weightPreset === 'periodic') {
      const k = document.getElementById('periodic-k').value;
      const l = document.getElementById('periodic-l').value;
      weightStr = `periodic-${k}x${l}`;
    } else if (weightPreset === 'all-ones') {
      weightStr = 'ones';
    }

    return `t-embedding-n${n}-${weightStr}.${extension}`;
  }

  // Generate SVG from T-embedding data
  function generateSVG(includeOrigami) {
    const n = parseInt(document.getElementById('n-input').value) || 6;
    const finalK = Math.max(0, n - 2);

    if (!wasmReady || !getTembeddingLevelJSON) {
      return null;
    }

    // Get T-embedding data
    const ptr = getTembeddingLevelJSON(finalK);
    const json = Module.UTF8ToString(ptr);
    freeString(ptr);

    let data;
    try {
      data = JSON.parse(json);
    } catch (e) {
      return null;
    }

    if (!data.vertices || data.vertices.length === 0) {
      return null;
    }

    // Compute bounds
    let minRe = Infinity, maxRe = -Infinity;
    let minIm = Infinity, maxIm = -Infinity;
    for (const v of data.vertices) {
      minRe = Math.min(minRe, v.re);
      maxRe = Math.max(maxRe, v.re);
      minIm = Math.min(minIm, v.im);
      maxIm = Math.max(maxIm, v.im);
    }

    // SVG dimensions and padding
    const padding = 40;
    const svgWidth = 800;
    const rangeRe = maxRe - minRe || 1;
    const rangeIm = maxIm - minIm || 1;
    const scale = (svgWidth - 2 * padding) / Math.max(rangeRe, rangeIm);
    const svgHeight = rangeIm * scale + 2 * padding;

    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const centerRe = (minRe + maxRe) / 2;
    const centerIm = (minIm + maxIm) / 2;

    // Get size controls
    const edgeThicknessControl = parseFloat(document.getElementById('main-2d-edge-thickness').value) || 1.5;
    const vertexSizeControl = parseFloat(document.getElementById('main-2d-vertex-size').value) || 1.5;
    const uniformEdgeWidth = Math.max(edgeThicknessControl, scale / 300 * edgeThicknessControl);
    const radius = Math.max(vertexSizeControl, scale / 800 * vertexSizeControl);

    // Build vertex map
    const vertexMap = new Map();
    for (const v of data.vertices) {
      vertexMap.set(`${v.i},${v.j}`, v);
    }
    const k = data.k;

    // SVG elements array
    const svgElements = [];

    // Helper to get screen coordinates
    function toScreen(re, im) {
      const x = centerX + (re - centerRe) * scale;
      const y = centerY - (im - centerIm) * scale;  // Flip Y for SVG
      return { x, y };
    }

    // Helper to add edge line
    function addEdge(i1, j1, i2, j2, color, width) {
      const v1 = vertexMap.get(`${i1},${j1}`);
      const v2 = vertexMap.get(`${i2},${j2}`);
      if (v1 && v2) {
        const p1 = toScreen(v1.re, v1.im);
        const p2 = toScreen(v2.re, v2.im);
        svgElements.push(`<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="${color}" stroke-width="${width.toFixed(2)}" stroke-linecap="round"/>`);
      }
    }

    // Draw T-embedding edges (in #333)
    const tembColor = '#333333';

    // 1. Interior edges
    for (const v of data.vertices) {
      const i = v.i, j = v.j;
      const absSum = Math.abs(i) + Math.abs(j);
      if (vertexMap.has(`${i+1},${j}`)) {
        const nAbsSum = Math.abs(i+1) + Math.abs(j);
        if (absSum <= k && nAbsSum <= k) {
          addEdge(i, j, i+1, j, tembColor, uniformEdgeWidth);
        }
      }
      if (vertexMap.has(`${i},${j+1}`)) {
        const nAbsSum = Math.abs(i) + Math.abs(j+1);
        if (absSum <= k && nAbsSum <= k) {
          addEdge(i, j, i, j+1, tembColor, uniformEdgeWidth);
        }
      }
    }

    // 2. Boundary rhombus
    addEdge(k+1, 0, 0, k+1, tembColor, uniformEdgeWidth);
    addEdge(0, k+1, -(k+1), 0, tembColor, uniformEdgeWidth);
    addEdge(-(k+1), 0, 0, -(k+1), tembColor, uniformEdgeWidth);
    addEdge(0, -(k+1), k+1, 0, tembColor, uniformEdgeWidth);

    // 3. External corners to alpha vertices
    addEdge(k+1, 0, k, 0, tembColor, uniformEdgeWidth);
    addEdge(-(k+1), 0, -k, 0, tembColor, uniformEdgeWidth);
    addEdge(0, k+1, 0, k, tembColor, uniformEdgeWidth);
    addEdge(0, -(k+1), 0, -k, tembColor, uniformEdgeWidth);

    // 4. Diagonal boundary edges
    for (let s = 0; s < k; s++) {
      addEdge(k-s, s, k-s-1, s+1, tembColor, uniformEdgeWidth);
      addEdge(-s, k-s, -(s+1), k-s-1, tembColor, uniformEdgeWidth);
      addEdge(-(k-s), -s, -(k-s-1), -(s+1), tembColor, uniformEdgeWidth);
      addEdge(s, -(k-s), s+1, -(k-s-1), tembColor, uniformEdgeWidth);
    }

    // Draw T-embedding vertices
    for (const v of data.vertices) {
      const p = toScreen(v.re, v.im);
      svgElements.push(`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${radius.toFixed(2)}" fill="${tembColor}"/>`);
    }

    // Origami overlay (if enabled)
    if (includeOrigami && getOrigamiLevelJSON) {
      const origPtr = getOrigamiLevelJSON(finalK);
      const origJson = Module.UTF8ToString(origPtr);
      freeString(origPtr);

      let origamiData;
      try {
        origamiData = JSON.parse(origJson);
      } catch (e) {
        origamiData = null;
      }

      if (origamiData && origamiData.vertices && origamiData.vertices.length > 0) {
        const origamiVertexMap = new Map();
        for (const v of origamiData.vertices) {
          origamiVertexMap.set(`${v.i},${v.j}`, v);
        }

        const origamiColor = '#0066cc';
        const origamiEdgeWidth = uniformEdgeWidth * 0.8;
        const origamiRadius = radius * 0.8;

        // Helper for origami edges
        function addOrigamiEdge(i1, j1, i2, j2) {
          const v1 = origamiVertexMap.get(`${i1},${j1}`);
          const v2 = origamiVertexMap.get(`${i2},${j2}`);
          if (v1 && v2) {
            const p1 = toScreen(v1.re, v1.im);
            const p2 = toScreen(v2.re, v2.im);
            svgElements.push(`<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="${origamiColor}" stroke-width="${origamiEdgeWidth.toFixed(2)}" stroke-linecap="round"/>`);
          }
        }

        // Interior edges
        for (const v of origamiData.vertices) {
          const i = v.i, j = v.j;
          const absSum = Math.abs(i) + Math.abs(j);
          if (origamiVertexMap.has(`${i+1},${j}`)) {
            const nAbsSum = Math.abs(i+1) + Math.abs(j);
            if (absSum <= k && nAbsSum <= k) {
              addOrigamiEdge(i, j, i+1, j);
            }
          }
          if (origamiVertexMap.has(`${i},${j+1}`)) {
            const nAbsSum = Math.abs(i) + Math.abs(j+1);
            if (absSum <= k && nAbsSum <= k) {
              addOrigamiEdge(i, j, i, j+1);
            }
          }
        }

        // Boundary rhombus
        addOrigamiEdge(k+1, 0, 0, k+1);
        addOrigamiEdge(0, k+1, -(k+1), 0);
        addOrigamiEdge(-(k+1), 0, 0, -(k+1));
        addOrigamiEdge(0, -(k+1), k+1, 0);

        // External corners to alpha
        addOrigamiEdge(k+1, 0, k, 0);
        addOrigamiEdge(-(k+1), 0, -k, 0);
        addOrigamiEdge(0, k+1, 0, k);
        addOrigamiEdge(0, -(k+1), 0, -k);

        // Diagonal boundary
        for (let s = 0; s < k; s++) {
          addOrigamiEdge(k-s, s, k-s-1, s+1);
          addOrigamiEdge(-s, k-s, -(s+1), k-s-1);
          addOrigamiEdge(-(k-s), -s, -(k-s-1), -(s+1));
          addOrigamiEdge(s, -(k-s), s+1, -(k-s-1));
        }

        // Origami vertices
        for (const v of origamiData.vertices) {
          const p = toScreen(v.re, v.im);
          svgElements.push(`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${origamiRadius.toFixed(2)}" fill="${origamiColor}"/>`);
        }
      }
    }

    // Build SVG string
    const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight.toFixed(0)}" viewBox="0 0 ${svgWidth} ${svgHeight.toFixed(0)}">
  <rect width="100%" height="100%" fill="white"/>
  ${svgElements.join('\n  ')}
</svg>`;

    return svgString;
  }

  // Export PDF (via SVG - vector quality)
  async function exportPdf() {
    const includeOrigami = document.getElementById('pdf-include-origami').checked;
    const svgString = generateSVG(includeOrigami);

    if (!svgString) {
      alert('No T-embedding data to export. Please compute a T-embedding first.');
      return;
    }

    try {
      // Load jspdf and svg2pdf.js dynamically if needed
      const loadScript = (src) => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

      if (!window.jspdf) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      if (!window.svg2pdfLoaded) {
        await loadScript('/js/svg2pdf.umd.min.js');
        window.svg2pdfLoaded = true;
      }

      // Parse SVG
      const parser = new DOMParser();
      const svgElement = parser.parseFromString(svgString, 'image/svg+xml').documentElement;
      const width = parseFloat(svgElement.getAttribute('width'));
      const height = parseFloat(svgElement.getAttribute('height'));

      // Create PDF
      const { jsPDF } = window.jspdf;
      const orientation = width > height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'pt', format: [width, height] });

      // Render SVG to PDF
      await pdf.svg(svgElement, { x: 0, y: 0, width, height });
      pdf.save(generateExportFilename('pdf'));
    } catch (e) {
      console.error('PDF export error:', e);
      alert('PDF export failed: ' + e.message);
    }
  }

  // Export PNG (canvas capture)
  function exportPng() {
    const quality = parseInt(document.getElementById('png-quality-slider').value) || 85;
    // Map quality 1-100 to scale factor 0.5-4.0
    const scale = 0.5 + (quality / 100) * 3.5;

    // Get the currently visible canvas
    const sourceCanvas = mainViewIs3D
      ? document.getElementById('main-temb-3d-canvas')
      : document.getElementById('main-temb-2d-canvas');

    if (!sourceCanvas) return;

    const rect = sourceCanvas.getBoundingClientRect();

    // Create export canvas at scaled resolution
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = rect.width * scale;
    exportCanvas.height = rect.height * scale;
    const exportCtx = exportCanvas.getContext('2d');

    // Draw white background
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the source canvas scaled
    exportCtx.drawImage(sourceCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

    // Download
    const link = document.createElement('a');
    link.download = generateExportFilename('png');
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  // Export OBJ (3D model with all faces, double-sided)
  function exportOBJ() {
    const n = parseInt(document.getElementById('n-input').value) || 6;
    const finalK = Math.max(0, n - 2);

    if (!wasmReady || !getTembeddingLevelJSON || !getOrigamiLevelJSON) {
      alert('WASM not ready. Please wait and try again.');
      return;
    }

    // Get T-embedding data
    let ptr = getTembeddingLevelJSON(finalK);
    let json = Module.UTF8ToString(ptr);
    freeString(ptr);
    let tembData;
    try {
      tembData = JSON.parse(json);
    } catch (e) {
      alert('Error parsing T-embedding data');
      return;
    }

    // Get origami data
    ptr = getOrigamiLevelJSON(finalK);
    json = Module.UTF8ToString(ptr);
    freeString(ptr);
    let origamiData;
    try {
      origamiData = JSON.parse(json);
    } catch (e) {
      alert('Error parsing origami data');
      return;
    }

    if (!tembData.vertices || !origamiData.vertices || tembData.vertices.length === 0) {
      alert('No data to export. Please compute a T-embedding first.');
      return;
    }

    const k = tembData.k;

    // Build vertex maps
    const tembMap = new Map();
    for (const v of tembData.vertices) {
      tembMap.set(`${v.i},${v.j}`, v);
    }
    const origamiMap = new Map();
    for (const v of origamiData.vertices) {
      origamiMap.set(`${v.i},${v.j}`, v);
    }

    // Build 3D points: x = T.re, y = T.im, z = O.re
    const points3D = [];
    const vertexIndex = new Map(); // key -> 1-based index for OBJ
    let idx = 1;

    for (const v of tembData.vertices) {
      const key = `${v.i},${v.j}`;
      const origV = origamiMap.get(key);
      if (origV) {
        points3D.push({
          i: v.i, j: v.j,
          x: v.re,
          y: v.im,
          z: origV.re
        });
        vertexIndex.set(key, idx++);
      }
    }

    if (points3D.length === 0) {
      alert('No matching vertices between T-embedding and origami.');
      return;
    }

    // Build ALL faces
    const faces = [];

    // Helper to add a face if all vertices exist
    function tryAddFace(keys) {
      if (keys.every(k => vertexIndex.has(k))) {
        faces.push(keys.map(k => vertexIndex.get(k)));
      }
    }

    // 1. Interior quadrilateral faces
    for (let i = -k; i < k; i++) {
      for (let j = -k; j < k; j++) {
        // Standard quad: (i,j), (i+1,j), (i+1,j+1), (i,j+1)
        tryAddFace([`${i},${j}`, `${i+1},${j}`, `${i+1},${j+1}`, `${i},${j+1}`]);
      }
    }

    // 2. Boundary triangular faces - fan from external corners to diagonal
    // Right side
    for (let s = 0; s < k; s++) {
      tryAddFace([`${k+1},0`, `${k-s},${s}`, `${k-s-1},${s+1}`]);
    }
    tryAddFace([`${k+1},0`, `0,${k}`, `0,${k+1}`]);

    // Top side
    for (let s = 0; s < k; s++) {
      tryAddFace([`0,${k+1}`, `${-s},${k-s}`, `${-(s+1)},${k-s-1}`]);
    }
    tryAddFace([`0,${k+1}`, `${-k},0`, `${-(k+1)},0`]);

    // Left side
    for (let s = 0; s < k; s++) {
      tryAddFace([`${-(k+1)},0`, `${-(k-s)},${-s}`, `${-(k-s-1)},${-(s+1)}`]);
    }
    tryAddFace([`${-(k+1)},0`, `0,${-k}`, `0,${-(k+1)}`]);

    // Bottom side
    for (let s = 0; s < k; s++) {
      tryAddFace([`0,${-(k+1)}`, `${s},${-(k-s)}`, `${s+1},${-(k-s-1)}`]);
    }
    tryAddFace([`0,${-(k+1)}`, `${k},0`, `${k+1},0`]);

    // 3. Beta-beta-inner triangles
    for (let s = 1; s < k; s++) {
      tryAddFace([`${k-s-1},${s}`, `${k-s},${s}`, `${k-s-1},${s+1}`]);
    }
    for (let s = 1; s < k; s++) {
      tryAddFace([`${-s},${k-s-1}`, `${-s},${k-s}`, `${-(s+1)},${k-s-1}`]);
    }
    for (let s = 1; s < k; s++) {
      tryAddFace([`${-(k-s-1)},${-s}`, `${-(k-s)},${-s}`, `${-(k-s-1)},${-(s+1)}`]);
    }
    for (let s = 1; s < k; s++) {
      tryAddFace([`${s},${-(k-s-1)}`, `${s},${-(k-s)}`, `${s+1},${-(k-s-1)}`]);
    }

    // 4. Alpha-beta-inner triangles
    tryAddFace([`${k-1},0`, `${k},0`, `${k-1},1`]);
    tryAddFace([`0,${k-1}`, `0,${k}`, `-1,${k-1}`]);
    tryAddFace([`${-k+1},0`, `${-k},0`, `${-k+1},-1`]);
    tryAddFace([`0,${-k+1}`, `0,${-k}`, `1,${-k+1}`]);

    // Find min Z for base level
    let minZ = Infinity;
    for (const p of points3D) {
      minZ = Math.min(minZ, p.z);
    }
    const baseZ = minZ - 0.2;  // 0.2 below minimum surface for base thickness

    // External corner keys and their surface indices
    const extCornerKeys = [`${k+1},0`, `0,${k+1}`, `${-(k+1)},0`, `0,${-(k+1)}`];
    const extCornerSurfIdx = extCornerKeys.map(key => vertexIndex.get(key));
    const extCornerPoints = extCornerSurfIdx.map(idx => points3D[idx - 1]);

    // Generate OBJ string
    let obj = '# T-embedding 3D surface (solid for 3D printing)\n';
    obj += `# n=${n}, k=${k}\n`;
    obj += `# Surface vertices: ${points3D.length}\n\n`;

    // Surface vertices (swap y and z for standard 3D orientation: x=right, y=up, z=forward)
    for (const p of points3D) {
      obj += `v ${p.x.toFixed(6)} ${p.z.toFixed(6)} ${p.y.toFixed(6)}\n`;
    }

    // Add 4 base corner vertices (below external corners)
    const baseCornerStart = points3D.length + 1;
    for (const p of extCornerPoints) {
      obj += `v ${p.x.toFixed(6)} ${baseZ.toFixed(6)} ${p.y.toFixed(6)}\n`;
    }
    // Add base center vertex
    const baseCenterIdx = baseCornerStart + 4;
    obj += `v 0.000000 ${baseZ.toFixed(6)} 0.000000\n`;
    obj += '\n';

    // Surface faces (top)
    obj += '# Surface faces\n';
    for (const indices of faces) {
      obj += `f ${indices.join(' ')}\n`;
    }
    obj += '\n';

    // Side walls - 4 trapezoid quads connecting external corners to base corners
    obj += '# Side walls (4 trapezoids)\n';
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const top1 = extCornerSurfIdx[i];
      const top2 = extCornerSurfIdx[next];
      const bot1 = baseCornerStart + i;
      const bot2 = baseCornerStart + next;
      // Quad: top1 -> top2 -> bot2 -> bot1
      obj += `f ${top1} ${top2} ${bot2} ${bot1}\n`;
    }
    obj += '\n';

    // Base face (rhombus with 4 corners, triangulated from center)
    obj += '# Base\n';
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const v1 = baseCornerStart + i;
      const v2 = baseCornerStart + next;
      obj += `f ${baseCenterIdx} ${v1} ${v2}\n`;
    }

    // Download
    const blob = new Blob([obj], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = generateExportFilename('obj');
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Export button event listeners
  document.getElementById('export-pdf-btn').addEventListener('click', exportPdf);
  document.getElementById('export-png-btn').addEventListener('click', exportPng);
  document.getElementById('export-obj-btn').addEventListener('click', exportOBJ);

  // Copy to clipboard buttons
  function copyToClipboard(elementId, btn) {
    const el = document.getElementById(elementId);
    const text = el.textContent || el.innerText;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1000);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }

  document.getElementById('copy-face-weights-btn').addEventListener('click', function() {
    copyToClipboard('face-weights-output', this);
  });
  document.getElementById('copy-mathematica-btn').addEventListener('click', function() {
    copyToClipboard('mathematica-output', this);
  });

  // Recompute buttons
  document.getElementById('recompute-face-weights-btn').addEventListener('click', function() {
    updateFaceWeightsOutput();
    this.textContent = 'Done!';
    setTimeout(() => { this.textContent = 'Recompute'; }, 1000);
  });
  document.getElementById('recompute-mathematica-btn').addEventListener('click', function() {
    clearTembLevels();  // Clear T-embedding cache to force recomputation
    renderStepwiseTemb();  // Recompute T from stored face weights
    updateMathematicaOutput();
    updateVerifyOutput();
    this.textContent = 'Done!';
    setTimeout(() => { this.textContent = 'Recompute'; }, 1000);
  });

  // Resize handler
  window.addEventListener('resize', () => {
    renderStepwiseTemb();
    renderAztecGraph();
  });

  // ========== BENCHMARK FUNCTIONS ==========

  function fitPowerLaw(results) {
    // Linear regression on log-log scale: log(t) = log(c) + alpha * log(n)
    // Returns { alpha, c } where t(n) ~ c * n^alpha
    if (results.length < 2) return { alpha: 0, c: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    let count = 0;
    for (const r of results) {
      if (r.time <= 0) continue;
      const x = Math.log(r.n);
      const y = Math.log(r.time);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      count++;
    }
    if (count < 2) return { alpha: 0, c: 0 };

    const alpha = (count * sumXY - sumX * sumY) / (count * sumX2 - sumX * sumX);
    const logC = (sumY - alpha * sumX) / count;
    const c = Math.exp(logC);
    return { alpha, c };
  }

  function plotBenchmarkResults(results, alpha, c) {
    const canvas = document.getElementById('benchmark-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, W, H);

    if (results.length === 0) return;

    // Find ranges
    const nMin = 10, nMax = 40;
    const times = results.map(r => r.time).filter(t => t > 0);
    if (times.length === 0) return;
    const tMin = Math.min(...times) * 0.8;
    const tMax = Math.max(...times) * 1.2;

    // Log scale for y-axis
    const logTMin = Math.log10(Math.max(tMin, 1));
    const logTMax = Math.log10(tMax);

    // Map functions
    const mapX = n => padding + (n - nMin) / (nMax - nMin) * (W - 2 * padding);
    const mapY = t => H - padding - (Math.log10(Math.max(t, 1)) - logTMin) / (logTMax - logTMin) * (H - 2 * padding);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, H - padding);
    ctx.lineTo(W - padding, H - padding);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('n', W / 2, H - 10);
    ctx.save();
    ctx.translate(15, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('time (ns)', 0, 0);
    ctx.restore();

    // X-axis ticks
    for (let n = 10; n <= 40; n += 5) {
      const x = mapX(n);
      ctx.beginPath();
      ctx.moveTo(x, H - padding);
      ctx.lineTo(x, H - padding + 5);
      ctx.stroke();
      ctx.fillText(n.toString(), x, H - padding + 18);
    }

    // Y-axis ticks (log scale)
    ctx.textAlign = 'right';
    for (let logT = Math.ceil(logTMin); logT <= Math.floor(logTMax); logT++) {
      const t = Math.pow(10, logT);
      const y = mapY(t);
      if (y > padding && y < H - padding) {
        ctx.beginPath();
        ctx.moveTo(padding - 5, y);
        ctx.lineTo(padding, y);
        ctx.stroke();
        // Format nanoseconds: 1e9 ns = 1s, 1e6 ns = 1ms, 1e3 ns = 1μs
        let label;
        if (t >= 1e9) label = (t/1e9).toFixed(0) + 's';
        else if (t >= 1e6) label = (t/1e6).toFixed(0) + 'ms';
        else if (t >= 1e3) label = (t/1e3).toFixed(0) + 'μs';
        else label = t.toFixed(0) + 'ns';
        ctx.fillText(label, padding - 8, y + 4);
      }
    }

    // Draw fit line if we have alpha and c
    if (alpha && c && results.length >= 2) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let n = nMin; n <= nMax; n++) {
        const t = c * Math.pow(n, alpha);
        const x = mapX(n);
        const y = mapY(t);
        if (n === nMin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw data points
    ctx.fillStyle = '#2196F3';
    for (const r of results) {
      if (r.time <= 0) continue;
      const x = mapX(r.n);
      const y = mapY(r.time);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  async function runBenchmark() {
    const btn = document.getElementById('benchmark-btn');
    const status = document.getElementById('benchmark-status');
    const resultsDiv = document.getElementById('benchmark-results');
    const fitDiv = document.getElementById('benchmark-fit');

    if (!wasmReady) {
      status.textContent = 'WASM not ready yet. Please wait...';
      return;
    }

    btn.disabled = true;
    resultsDiv.style.display = 'block';

    const results = [];

    try {
      for (let n = 10; n <= 40; n++) {
        status.textContent = `Running n=${n}...`;
        await delay(50);  // Yield to UI

        // Set n and run full computation
        document.getElementById('n-input').value = n;
        setN(n);

        // Generate graph with current weight selection
        generateAztecGraph(n);

        // Run all reduction steps
        while (canAztecStepDown()) {
          aztecGraphStepDown();
        }
        while (canAztecStepUp()) {
          aztecGraphStepUp();
        }

        // Get compute time in nanoseconds for more readable constant
        const timeMs = getComputeTimeMs();
        const timeNs = timeMs * 1e6;
        results.push({ n, time: timeNs });

        // Update plot
        const fit = fitPowerLaw(results);
        plotBenchmarkResults(results, fit.alpha, fit.c);
        fitDiv.textContent = results.length >= 3
          ? `Fit: t(n) = ${fit.c.toFixed(1)} ns * n^${fit.alpha.toFixed(2)} (${results.length} points)`
          : 'Collecting data...';
      }

      // Final fit
      const fit = fitPowerLaw(results);
      plotBenchmarkResults(results, fit.alpha, fit.c);
      fitDiv.textContent = `Fit: t(n) = ${fit.c.toFixed(1)} ns * n^${fit.alpha.toFixed(2)}`;
      status.textContent = 'Done!';
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      console.error('Benchmark error:', err);
    }

    btn.disabled = false;

    // Log results to console
    console.log('Benchmark results:', results);
  }

  const benchmarkBtn = document.getElementById('benchmark-btn');
  if (benchmarkBtn) {
    benchmarkBtn.addEventListener('click', runBenchmark);
  }

  // Initialize
  initWasm();
})();
</script>
