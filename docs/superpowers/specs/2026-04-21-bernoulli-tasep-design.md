# Parallel Bernoulli TASEP with step IC — design spec

**Date:** 2026-04-21
**Author:** Leonid Petrov (spec drafted with Claude Code)
**Status:** Approved, ready for implementation plan

## 1. Goal

Add a new interactive simulation at `_simulations/TASEP-like-systems/2026-04-21-bernoulli-tasep.md` that runs **Bernoulli TASEP with step initial condition under either of two update rules** (parallel snapshot-based or right-to-left cascading sequential) and displays the **averaged empirical density profile** against its hydrodynamic limit. The user toggles between the two rules to visually compare them.

## 2. Model

Particles on $\mathbb{Z}$, step IC: exactly one particle at each site in $\{-r+1, -r+2, \ldots, 0\}$, all other sites empty. Discrete time $t = 0, 1, 2, \ldots, T$. Each step every particle first flips an independent coin with heads probability $p$; what happens next depends on the chosen **update rule**. Two rules are supported:

### 2a. Parallel (snapshot) update

A particle at position $x$ moves to $x+1$ iff both (a) it flipped heads, and (b) site $x+1$ was unoccupied *at time $t$* — i.e., in the snapshot, before any move in this step. All moves then happen simultaneously. No particle ordering.

### 2b. Sequential (cascading) update

Also known as *forward-sequential* or *right-to-left sequential*: particles are processed in decreasing order of position (rightmost first). A particle moves to $x+1$ iff (a) it flipped heads and (b) site $x+1$ is empty *at the moment of its decision* — which may mean it has just been vacated by its right neighbor moving earlier in the same step. This allows cascades. LP's motivating example: if $x_1 = 5$ and $x_2 = 4$ both flip heads, both jump in the sequential rule (only $x_1$ jumps in the parallel rule).

### 2c. Consequence: two different hydrodynamic limits

The two updates produce genuinely different large-scale behavior; see § 4 for the two flux formulas and corresponding rarefaction-fan density profiles.

## 3. User-facing parameters

| Parameter | Meaning | Range / values | Default |
|-----------|---------|-------|---------|
| $r$ | Number of particles | 100 – 30 000 | 3 000 |
| $p$ | Jump probability | 0.01 – 1.00 | 0.50 |
| $T$ | Time horizon (# steps) | 100 – 50 000 | 3 000 |
| $K$ | Number of Monte Carlo samples | 1 – 200 | 20 |
| update rule | Parallel / Sequential | radio buttons | Parallel |

Input widgets: number input + slider (paired) for the numeric params, radio buttons for the update rule. Changing any parameter (including the update rule) clears accumulated samples, because the empirical density distribution changes with the rule.

## 4. Output (single primary deliverable)

**Plot of the empirical particle density $\rho$ as a function of the scaled spatial coordinate $\xi = x / T$.**

Concretely, after each sample:

1. Compute final particle positions $\{x_1, \ldots, x_r\}$ at time $T$.
2. Bin positions into $B = 200$ uniform bins on $\xi \in [\xi_{\min}, \xi_{\max}]$ where $\xi_{\min} \approx -1.05$ and $\xi_{\max} \approx +1.05$ (fixed range in units of $\xi$, independent of $r$ and $p$).
3. Empirical density in bin $b$ is (particles in bin $b$) / (bin width in real-space units, $T \cdot \Delta\xi$).

Canvas shows three layered curves:
- **Thin, low-alpha lines:** density profile of each individual sample.
- **Bold colored line:** average of empirical densities over the $K$ samples accumulated so far.
- **Dashed reference line:** the hydrodynamic limit density $\rho_\infty(\xi)$ for parallel Bernoulli TASEP with step IC.

The hydrodynamic limit depends on which update rule is active. Both are piecewise: density 1 left of the fan, rarefaction curve inside, density 0 right of the fan.

**Parallel update.** Flux:
$$j_{\text{par}}(\rho) = \tfrac{1}{2}\bigl(1 - \sqrt{1 - 4p\rho(1-\rho)}\bigr).$$
Fan endpoints: $\xi_\ell = -p$, $\xi_r = +p$. Rarefaction density:
$$
\rho_\infty^{\text{par}}(\xi) = \tfrac{1}{2}\left(1 - \operatorname{sgn}(\xi)\sqrt{\tfrac{\xi^2(1-p)}{p(p - \xi^2)}}\right), \quad \xi \in (-p, p).
$$

**Sequential update (right-to-left cascading).** Flux:
$$j_{\text{seq}}(\rho) = \frac{p\rho(1-\rho)}{1 - p\rho}.$$
Fan endpoints (asymmetric): $\xi_\ell = -\dfrac{p}{1-p}$, $\xi_r = +p$. Rarefaction density:
$$
\rho_\infty^{\text{seq}}(\xi) = \frac{1}{p}\left(1 - \sqrt{\tfrac{1-p}{1-\xi}}\right), \quad \xi \in \left(-\tfrac{p}{1-p}, \, p\right).
$$

Both curves are computed in JS — pure arithmetic, ~200 evaluation points, no WASM needed. The active limit curve (matching the current update rule) is drawn as the dashed overlay.

At $p = 1$ the sequential fan formally extends to $\xi \to -\infty$ (density 1 everywhere left of the front), while the parallel fan collapses to the flat $\rho \equiv \tfrac{1}{2}$ on $(-1, 1)$ — a useful sanity check that the two rules behave dramatically differently.

## 5. Architecture

### 5.1 Files

1. **`_simulations/TASEP-like-systems/2026-04-21-bernoulli-tasep.md`** — Jekyll post with front matter, math description, UI HTML, inline JS (controls + rendering), and CSS reusing the conventions from `2026-03-11-plancherel-vs-tasep.md`.
2. **`_simulations/TASEP-like-systems/2026-04-21-bernoulli-tasep.cpp`** — C++ source for the WASM sampler. Build command embedded as a comment header, following the exact pattern of `2026-03-11-plancherel-vs-tasep.cpp` (including the `// !!!AI AGENT: run the build command in one line for auto-approval!!!` marker).

No separate JS file. All JS lives inline in the `.md`.

### 5.2 WASM build

Single `emcc` command that produces `2026-04-21-bernoulli-tasep.js` with `SINGLE_FILE=1` (WASM embedded as base64) and `MODULARIZE=1` with export name `createBernoulliTASEP`. The `.js` artifact is moved to `js/`. Flag set matches `2026-03-11-plancherel-vs-tasep.cpp`, plus:

- `-msimd128` (128-bit SIMD required — all core loops use `wasm_simd128.h`)
- `-O3 -flto -ffast-math`
- Include `<wasm_simd128.h>` in the source.

Exported function list: see § 6.6.

### 5.3 Run flow in the browser

1. Page loads → loading placeholder drawn on canvas → `await createBernoulliTASEP()` resolves → enable controls → draw empty axes with the limit curve already visible.
2. User clicks **Run**: JS reads $r, p, T, K$, calls WASM once per sample, accumulates density arrays, redraws after every sample.
3. A progress bar / text under the Run button shows "$k$ / $K$ samples · $\text{elapsed}$ · avg $\text{ms/sample}$".
4. Run is cancellable via a Stop button (same button toggles text).
5. Changing any parameter clears accumulated samples and redraws.

The run loop yields to the browser via `requestAnimationFrame` every ~80 ms (matching the pattern in the Plancherel sim) so the UI remains responsive during long batches.

## 6. WASM-side design

### 6.1 Data representation

- **Occupancy bitmap** of length $L = r + T + 2$ bits, stored as an array of `v128_t` SIMD lanes (128 bits per lane; 16-byte aligned). Number of lanes: $W = \lceil L / 128 \rceil$. Site index $i$ corresponds to bit `i % 128` of lane `i / 128`. A fixed offset places the initial step-IC particles so all motion stays inside $[0, L)$ (details in implementation — only requirement is that the bitmap never has to grow mid-sample).
- **Coin bitmap** of the same length, freshly regenerated each step via the bit-sliced scheme of § 6.3.
- **Particle position array** is not maintained step-by-step; final positions are extracted from the occupancy bitmap once, by scanning set bits at sample end (§ 6.7).
- All bitmaps plus scratch (`movers`, `shifted`, 8 RNG draw buffers) pre-allocated once at first call. Total workspace ~25 KB for $r = 30\,000$, fits in L1.

### 6.2 Core step — parallel update (single fused pass)

Bit-to-site convention: bit index $i$ of the bitmap (with $0 \le i < L$) lives in bit `i % 128` of lane `i / 128`, using WASM SIMD `v128` as the storage unit (required, not optional). For $r = 30\,000$, $L$ fits in ~235 lanes ≈ 3.75 KB — comfortably in L1.

The entire parallel step is ONE pass over the bitmap, carrying two single-bit flags between consecutive lanes:

```c
// per step, given: occ[], coin[]
v128_t carry_occ = 0, carry_mov = 0;
for (int i = 0; i < W; i++) {
    v128_t occ_i      = occ[i];
    v128_t shifted_o  = shl1_with_carry(occ_i, carry_occ);   // bit k → bit k+1
    v128_t movers     = occ_i & coin[i] & ~shifted_o;
    v128_t shifted_m  = shl1_with_carry(movers, carry_mov);
    occ[i]            = (occ_i ^ movers) | shifted_m;
    carry_occ         = top_bit(occ_i);
    carry_mov         = top_bit(movers);
}
```

`shl1_with_carry(v, c)` is a 128-bit left shift by 1 with the incoming carry inserted at bit 0: implemented via `wasm_i64x2_shl(v, 1)`, merged with the top-bit-of-lane-0 routed into lane-1's bit 0, and the incoming `c` inserted into lane-0's bit 0. Correctness argument for fusing clear-and-set in one write: if `movers` has a bit at position $k$, then by construction site $k+1$ was unoccupied in the snapshot, so `occ_i ^ movers` clearing bit $k$ and `shifted_m` setting bit $k+1$ do not collide with any other mover.

### 6.2b Core step — sequential update (cluster-wise cascade)

Sequential update has a data-dependent cascade: within a maximal run of consecutive 1s in `occ` (a *cluster*) of length $k$ ending at position $b$, the number of movers is $m = \min(k, G)$ where $G$ is the number of consecutive heads starting at the rightmost particle's coin and moving leftward until the first tails. After the step, the cluster's right edge shifts: bit at $b - m + 1$ is cleared, bit at $b + 1$ is set (unchanged if $m = 0$).

Algorithm per step:

1. **Find cluster ends** (SIMD): `cluster_ends = occ & ~shl1(occ)` — one SIMD pass over the active window.
2. **Generate coin bitmap** (SIMD): same bit-sliced scheme as § 6.3; one bit per site.
3. **Enumerate clusters** (scalar loop over set bits of `cluster_ends`). For each end bit $b$:
   - Determine cluster length $k$ by scanning `occ` leftward from $b$ until hitting a 0 (fast: bitmap bit-scan within a lane, then step lane-by-lane for the rare long cluster).
   - Determine $m$ by scanning `coin` leftward from $b$ until hitting a 0 (same bit-scan primitive), and cap at $k$.
   - If $m > 0$: clear bit $b - m + 1$ of `occ`, set bit $b + 1$ of `occ`.
4. Advance the sliding-window bounds (§ 6.4) to cover any new activity at the right edge.

Cost per step: dominated by step 3, scaling as $O(\text{\#clusters} + \text{total } m)$. Initially (step IC, $t \lesssim r$) the bitmap has very few clusters — just one or a few at the right edge — so early steps are nearly free. In the fully-developed rarefaction regime (density around $\tfrac{1}{2}$), `#clusters` is $O(r)$ and total $m$ per step is $O(\sum 1/(1-p)) = O(r/(1-p))$, so per-step cost is $O(r)$ with small constants. Projected total: $K = 50$, $r = T = 30\,000$ in **~3–5 seconds**. Still firmly sub-interactive. Acceptable; revisit with a segmented-scan bitmap algorithm only if measured performance disappoints.

Key primitive — "count consecutive 1s starting at bit $b$, going leftward, capped at the leftward cluster boundary":

```
int scanLeft(uint64_t* bm, int b, int lo_bound) {
    // count consecutive 1s in bm[] at positions b, b-1, b-2, ..., stopping at a 0 or at lo_bound.
    int qw = b / 64;
    int bit = b % 64;
    uint64_t w = bm[qw] & ((1ULL << (bit + 1)) - 1);  // mask out bits above b
    // Top consecutive 1s ending at bit `bit` → count by inverting, then ctz from the masked region.
    // Details in implementation.
}
```

The inner scan typically terminates within one or two qwords for reasonable $p$, so this is fast in practice. Full details deferred to the implementation plan.

Generating 128 independent Bernoulli($p$) bits per lane using 64 individual `u < threshold` comparisons would cost 1 RNG draw per coin (~9×10⁸ draws for a full $K=50$ batch — the bottleneck). Instead:

Write $p$ in binary to 8-bit precision: $p \approx \sum_{k=1}^{8} b_k \, 2^{-k}$ with $b_k \in \{0, 1\}$ (max error $2^{-8} < 0.004$, plenty for a Monte Carlo visualization).

Generate 8 fair-random 128-bit lanes $Y_1, \ldots, Y_8$. Define depth masks

$$M_k = \Bigl(\bigwedge_{l < k} Y_l\Bigr) \land \neg Y_k \qquad (k = 1, \ldots, 8),$$

so that bit $j$ of $M_k$ is 1 iff the first zero in column $j$ of $(Y_1, \ldots, Y_8)$ is at depth $k$. Output coin lane:

$$\text{coin} = \bigvee_{k \, : \, b_k = 1} M_k.$$

Each output bit is independently Bernoulli($p'$) with $|p' - p| \le 2^{-8}$. Cost per lane: 8 RNG draws (shared by 128 coins, so 0.0625 draws per coin) plus ~16 SIMD bitops — ≈0.25 ops per output coin.

If ever the precision becomes visible in the density plot, bump to 12-bit or 16-bit; cost stays linear in precision.

### 6.4 Sliding active window

Track `[lane_lo, lane_hi]` (inclusive) delimiting the lanes that contain "interesting" activity:
- **lane_hi** advances whenever a move crosses into a new empty lane on the right (rightmost front expansion).
- **lane_lo** advances whenever the solid-packed left region retreats (when the leftmost zero in `occ` moves left past a lane boundary).

Only lanes in `[lane_lo, lane_hi]` are processed each step; lanes to the left (all 1s) and right (all 0s) are skipped. For early times (fan not fully developed) this is a large win. For $T \gtrsim r$ it is negligible but not costly. Bookkeeping: update `lane_hi` from `carry_mov` escaping the current top lane; update `lane_lo` by checking the leading zeros of `occ[lane_lo]`.

### 6.5 RNG

Fast `xoshiro256**` for 64-bit output, wrapped into a `v128` generator that concatenates two draws per SIMD lane. Seeded per-sample with `std::random_device{}()` so successive samples are independent. `mt19937` is the fallback if profiling surprises us; picked at compile time via a `typedef`. The 8 fair-random lanes needed for coin generation (§ 6.3) are drawn here.

### 6.6 Exported functions

Minimal, task-focused surface:

| Function | Signature | Purpose |
|---|---|---|
| `runSample` | `int runSample(int r, int T, double p, int updateRule, int numBins, double xiMin, double xiMax)` | Runs one full sample; `updateRule` is `0` (parallel) or `1` (sequential). Returns actual $T$ used. Writes binned density into a pre-allocated buffer. |
| `getDensityBuf` | `double* getDensityBuf()` | Returns pointer to the density bin buffer (length `numBins`). |
| `freeWorkspace` | `void freeWorkspace()` | Releases any persistent buffers (called if sim is unmounted). |

All buffers are pre-allocated on first call based on the largest requested $r + T$, and grown on subsequent larger calls via realloc. `ALLOW_MEMORY_GROWTH=1` as in the other sims.

`EXPORTED_RUNTIME_METHODS` includes `HEAPF64`. JS reads the density buffer by constructing `new Float64Array(W.HEAPF64.buffer, ptr, numBins)` **immediately** and copying into a plain JS array before making any other WASM call (buffer can move under `ALLOW_MEMORY_GROWTH`).

### 6.7 Binning

Done inside WASM in `runSample`, right after the final step: walk the occupancy bitmap qword-by-qword (popcount-friendly), and for each set bit at site $i$ compute $\xi = (i - i_0) / T$ where $i_0$ is the position of the "origin" site, and increment `density[bin]`. Finally divide by $T \cdot \Delta\xi$ to convert counts into density units. This is cheap ($O(r)$ per sample).

## 7. JS / rendering side

### 7.1 Canvas layout

One main canvas `#densityCanvas`, full width of the visualization panel, height ~400px (reduces to ~300px on mobile). One secondary stats strip above for live counters: current sample count $k / K$, per-sample ms, total elapsed, L² deviation of the running mean from the limit curve.

### 7.2 Drawing `drawDensity()`

- Clear canvas, draw axes. X-range is fixed at $\xi \in [-1.1, 1.1]$ to accommodate the sequential fan's potentially-large left extent at $-p/(1-p)$ (which diverges as $p \to 1$; the left endpoint is clamped to $-1.1$ in the display). Y-range $\rho \in [-0.05, 1.05]$.
- Tick marks at $\pm 1$, $0$, and the fan endpoints for the current rule (marking $\pm p$ for parallel, $-p/(1-p)$ and $+p$ for sequential).
- Draw the dashed limit curve matching the **current** update rule (formulas in § 4). Update this whenever the rule changes.
- Draw faint individual sample curves (alpha $\approx 0.15$).
- Draw bold average curve.
- Shade the rarefaction fan region lightly.
- All colors via CSS custom properties (light/dark mode).

### 7.3 Controls block

Single `<details class="control-section" open>` group titled "Parameters" with five rows:
1. $r$ — number input + slider
2. $p$ — number input + slider
3. $T$ — number input + slider
4. $K$ — number input
5. **Update rule** — two radio buttons: Parallel / Sequential

Plus a "Batch" row containing the Run / Stop / Clear buttons and progress area. Mobile drawer behavior copied from the Plancherel sim. No keyboard shortcuts unless explicitly requested later.

### 7.4 Stats

Under the canvas, a stats-inline strip:
- **samples:** $k$
- **r, p, T:** echoed for clarity
- **ms/sample:** mean
- **||avg − limit||₂:** L² norm of the difference between running mean density and $\rho_\infty$, computed over the bin centers (a single scalar indicator that the Monte Carlo is converging).

## 8. Edge cases and correctness checks

- **$p = 0$:** no particle moves under either rule. Empirical density = $\mathbf{1}_{\xi \le 0}$. Both limit formulas must be guarded for $p = 0$ to avoid divide-by-zero.
- **$p = 1$, parallel:** deterministic. After $T$ steps, particles occupy $\{T, T-2, T-4, \ldots, -T+2, -T\}$ (parity-matched, spaced 2 apart), coarse-grained density $\tfrac{1}{2}$ on $\xi \in (-1, 1)$. Parallel limit formula correctly yields $\rho_\infty^{\text{par}} \equiv \tfrac{1}{2}$ here (the $\sqrt{1-p}$ factor kills the deviation).
- **$p = 1$, sequential:** deterministic and every free-OR-cascading particle moves every step, so at each step *all* $r$ particles shift right by 1. After $T$ steps, particles occupy $\{-r+1+T, \ldots, T\}$, fully packed. Empirical density = 1 on $\xi \in [-r/T + 1, 1]$, 0 elsewhere. Sequential limit formula gives $\rho_\infty^{\text{seq}} = 1$ for $\xi < 1$ (the fan degenerates to the single point $\xi = 1$ as $p \to 1$). ✓
- **$T \gg r$:** rightmost particle has moved ~$pT$ steps; if $pT > r$ (always, in this regime) the fan is fully developed but then the finite-$r$ system thins out — the "empty region" behind the left edge grows. The bitmap size $L = r + T + O(1)$ remains valid.
- **$T \ll r$:** fan hasn't fully developed. Empirical density is close to step profile near center, deviates only near the front. The sim still runs; the limit curve is the same regardless of whether $T$ is "big enough".
- **$r = 1$:** single particle, no blocking. Sanity check: empirical density is a delta-like mass near $\xi = p$ (since the particle moves on average $pT$ times).

## 9. Non-goals (explicitly out of scope for v1)

- **WebGPU.** Not needed — with the § 6 optimizations (128-bit SIMD, fused single-pass step, bit-sliced coins, sliding active window), a $K=50$, $r=T=30\,000$ batch should run in ~1 second. WebGPU would add shader complexity and fragmented browser support without a meaningful time win at this problem size.
- **Web Workers for parallel sampling.** Also not needed at this problem size; skipping avoids the SharedArrayBuffer / COOP / COEP requirements which the Jekyll site doesn't currently set.
- Space-time diagrams. Considered and explicitly dropped by LP.
- Tracy–Widom fluctuation histograms. Not requested for v1.
- Height function plots. Not requested for v1 — the output is the density, period.
- URL state serialization.
- 3D or animated views.
- Exporting images or data.

## 10. Testing / acceptance

Manual acceptance checks to be performed after implementation:

1. **Parallel, $p = 1$ sanity:** average density flat at $\tfrac{1}{2}$ on $(-1, 1)$; individual samples alternate around $\tfrac{1}{2}$ due to parity.
2. **Parallel, $p = 0.5$ sanity:** fan endpoints at $\pm \tfrac{1}{2}$; density $\approx 0.5$ at $\xi = 0$; curved shape matches the explicit formula.
3. **Sequential, $p = 0.5$ sanity:** fan endpoints asymmetric at $\xi_\ell = -1, \xi_r = 0.5$ (since $-p/(1-p) = -1$); density at $\xi = 0$ is $(1 - \sqrt{0.5})/0.5 \approx 0.586$, not $0.5$.
4. **Sequential vs. parallel visible difference:** at $p = 0.5$, switching the radio button must visibly change the density curve — the fan's left endpoint moves from $-0.5$ to $-1$, and the $\xi = 0$ density shifts from $0.5$ to $\approx 0.586$.
5. **Speed (parallel):** $r = T = 30\,000$, $K = 50$ completes in under 2 seconds.
6. **Speed (sequential):** $r = T = 30\,000$, $K = 50$ completes in under 5 seconds.
7. **UI responsiveness:** progress bar updates smoothly during a long batch; Stop button halts within one sample.
8. **No visual regressions:** dark mode, mobile drawer, KaTeX all render correctly.

## 11. Open items deferred to implementation

- Whether 8-bit coin precision is visible in the plot at large $K$; if so, bump to 12 or 16 bits.
- Precise canvas heights and breakpoints — tuned during polish.
- The exact default for $K$ (20 vs. 10) — polish.
- Whether to expose individual-sample curves behind a toggle (default on) or always draw them.

