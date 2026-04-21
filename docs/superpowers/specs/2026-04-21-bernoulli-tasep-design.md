# Parallel Bernoulli TASEP with step IC — design spec

**Date:** 2026-04-21
**Author:** Leonid Petrov (spec drafted with Claude Code)
**Status:** Approved, ready for implementation plan

## 1. Goal

Add a new interactive simulation at `_simulations/TASEP-like-systems/2026-04-21-bernoulli-tasep.md` that runs parallel Bernoulli TASEP with step initial condition and displays the **averaged empirical density profile** against its hydrodynamic limit.

## 2. Model

Particles on $\mathbb{Z}$, step IC: exactly one particle at each site in $\{-r+1, -r+2, \ldots, 0\}$, all other sites empty.

Discrete time $t = 0, 1, 2, \ldots, T$. One parallel step $t \to t+1$:

1. Each particle independently flips a coin with heads probability $p$.
2. Snapshot-based parallel update: a particle currently at position $x$ moves to $x+1$ iff both (a) it flipped heads, and (b) site $x+1$ was unoccupied at time $t$ (the snapshot, *before* any move in this step).

All moves in a step are applied simultaneously from the snapshot, so there is no ordering between particles within a step.

## 3. User-facing parameters

| Parameter | Meaning | Range | Default |
|-----------|---------|-------|---------|
| $r$ | Number of particles | 100 – 30 000 | 3 000 |
| $p$ | Jump probability | 0.01 – 1.00 | 0.50 |
| $T$ | Time horizon (# steps) | 100 – 50 000 | 3 000 |
| $K$ | Number of Monte Carlo samples | 1 – 200 | 20 |

Input widgets: number input + slider (paired), following the pattern used in `2026-03-11-plancherel-vs-tasep.md`. Changing any parameter clears accumulated samples.

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

The hydrodynamic limit: the flux for parallel Bernoulli TASEP is
$$j(\rho) = \tfrac{1}{2}\bigl(1 - \sqrt{1 - 4p\rho(1-\rho)}\bigr).$$
For step IC the density solves $j'(\rho_\infty(\xi)) = \xi$ in the rarefaction region and is $1$ (resp. $0$) outside it. Explicit form (derived by writing $u = 1 - 2\rho$ and $\xi = j'(\rho)$):

$$
\rho_\infty(\xi) =
\begin{cases}
1 & \xi \le -p, \\[2pt]
\tfrac{1}{2}\left(1 - \operatorname{sgn}(\xi) \sqrt{\dfrac{\xi^2(1-p)}{p(p - \xi^2)}}\right) & -p < \xi < p, \\[8pt]
0 & \xi \ge p.
\end{cases}
$$

(The simulation computes this in JS — pure arithmetic, ~200 points, no WASM needed.)

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

### 6.2 Core step — single fused pass

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

### 6.3 Coin generation — bit-sliced 8-bit precision

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
| `runSample` | `int runSample(int r, int T, double p, int numBins, double xiMin, double xiMax)` | Runs one full sample; returns actual $T$ used. Writes binned density into a pre-allocated buffer. |
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

- Clear canvas, draw axes (x: $\xi$ on $[-1.05, 1.05]$ with ticks at $\pm 1, \pm p, 0$; y: $\rho$ on $[-0.05, 1.05]$ with ticks at $0, 0.25, 0.5, 0.75, 1$).
- Draw dashed limit curve $\rho_\infty(\xi)$ using the explicit formula in § 4.
- Draw faint individual sample curves (alpha $\approx 0.15$).
- Draw bold average curve.
- Shade the rarefaction fan $[-p, p]$ very lightly to make the region visible.
- All colors come from CSS custom properties (light/dark mode), matching conventions in other recent sims.

### 7.3 Controls block

Single `<details class="control-section" open>` group titled "Parameters" with four rows (r, p, T, K), plus a "Batch" row containing the Run / Stop / Clear buttons and progress area. Mobile drawer behavior copied from the Plancherel sim. No keyboard shortcuts unless explicitly requested later (per LP's preferences).

### 7.4 Stats

Under the canvas, a stats-inline strip:
- **samples:** $k$
- **r, p, T:** echoed for clarity
- **ms/sample:** mean
- **||avg − limit||₂:** L² norm of the difference between running mean density and $\rho_\infty$, computed over the bin centers (a single scalar indicator that the Monte Carlo is converging).

## 8. Edge cases and correctness checks

- **$p = 0$:** no particle ever moves. Empirical density should be $\mathbf{1}_{\xi \le 0}$ (step profile) for all $T$. The limit formula gives $\rho_\infty(\xi) = 1$ for $\xi \le 0$ and $0$ for $\xi > 0$ (note $[-p, p] = \{0\}$ collapses). Implementation must handle $p = 0$ without divide-by-zero in the limit curve.
- **$p = 1$:** deterministic dynamics. Every particle whose right neighbor is free moves. From step IC this produces, at time $T$, particles at positions $\{T, T-2, T-4, \ldots, -T+2, -T\}$ (same parity as $T$, spaced 2 apart). The coarse-grained density is $\rho = \tfrac{1}{2}$ on the full interval $\xi \in (-1, 1)$. The formula in § 4 correctly gives $\rho_\infty(\xi) = \tfrac{1}{2}$ on $(-p, p) = (-1, 1)$ when $p = 1$ (the square root's numerator $1-p$ vanishes). Good sanity check.
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

1. **$p = 1$ sanity:** running with $p = 1$, $r = T = 2000$, $K = 50$ should show the average density hugging the flat line $\rho_\infty(\xi) = \tfrac{1}{2}$ on $(-1, 1)$ within visible tolerance (and individual samples alternating around $\tfrac{1}{2}$ on a bin-by-bin basis due to the even/odd parity of particle positions at time $T$).
2. **$p = 0.5$ sanity:** average density on $[-0.5, 0.5]$ should match the curved formula; fan endpoints visibly at $\pm p$; density hits $\approx 0.5$ at $\xi = 0$.
3. **Speed:** $r = T = 30\,000$, $K = 50$ completes in **under 2 seconds** on LP's machine (target with all § 6 optimizations in place).
4. **UI responsiveness:** progress bar updates smoothly during a long batch; Stop button halts the run within one sample.
5. **No visual regressions:** dark mode renders correctly; mobile drawer works; no KaTeX errors.

## 11. Open items deferred to implementation

- Whether 8-bit coin precision is visible in the plot at large $K$; if so, bump to 12 or 16 bits.
- Precise canvas heights and breakpoints — tuned during polish.
- The exact default for $K$ (20 vs. 10) — polish.
- Whether to expose individual-sample curves behind a toggle (default on) or always draw them.

