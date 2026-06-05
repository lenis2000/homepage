# Factorial YBE sampler baseline

Date: 2026-06-05

Environment:

- Node v24.14.1
- Chromium headless at `/usr/bin/chromium`
- Static local server rooted at `/workspace`; `/factorial/` loaded the current page script directly

## Current hot path

The exact sampler currently runs entirely on the main browser thread:

1. `sampleMany(count)` loops over `sampleOnce()` synchronously, so multiple samples have no yielding point.
2. `sampleOnce()` validates parameters, resets counters, calls `sampleRows()`, rebuilds `mu`/`lam`, updates DOM stats, then redraws the canvas.
3. `sampleRows()` rebuilds the frozen RHS and performs `N * M` adjacent row swaps.
4. `swapAdjacentRows(pos)` is the dominant loop. For every row swap it scans columns from `1` until the forced tail condition is reached, with `fs-max-cols` as the hard cap. Each column probes JavaScript `Set` objects for bottom/middle/top levels, calls `localForward()`, mutates a new `Set`, and updates counters.
5. `localForward()` recomputes the admissible local transition enumeration for every cell. It loops over all eight possible triples twice, evaluates local weights, normalizes the admissible output states, and consumes one Bernoulli random choice when the output is not deterministic.

This means the practical cost is closer to:

```text
sum over N*M row swaps of active scanned columns * local table enumeration cost
```

not just `N*M`. Large tails or large `N,M` can therefore block pointer events, buttons, and repainting until the synchronous call returns.

The baseline hook added in this iteration keeps the visible sampler behavior unchanged, but replaces the direct hot-path use of `Math.random()` with a swappable `randomUnit()` source. The normal page source is still `Math.random`; `window.factorialYBEReferenceSample(...)` temporarily installs a seeded Xoshiro256++ source for deterministic small reference checks and restores the page state afterward.

## Baseline timings

Each timing is one call to the current visible `window.factorialExactSamplerSample()` path after applying controls. `stats.elapsedMs` is measured inside `sampleOnce()` through the sampler/rebuild path; `wallMs` includes the surrounding browser call and canvas redraw.

| case | result | stats.elapsedMs | wallMs | row swaps | local moves | Bernoulli choices | max position | |lambda| |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Default controls: `N=6`, `M=6`, `q=0.95`, `alpha=0.55`, `beta=0`, `gamma=1` | ok | 4.30 ms | 5.20 ms | 36 | 555 | 153 | 28 | 43 |
| Old fan style, epsilon-safe: `N=12`, `M=50`, `q=0.2`, `x=1^12`, `w=1.001*q^(-50+i)`, `y=q^(i-50)` | ok | 245.20 ms | 248.60 ms | 600 | 121,698 | 18,318 | 17,043 | 17,507 |
| Stress constants: `N=80`, `M=120`, `x=0.8^80`, `w=1^120`, `y=0^600` | ok but main thread blocked | 11,017.60 ms | 11,022.90 ms | 9,600 | 7,885,473 | 1,041,509 | 1,693 | 39,138 |

Qualitative result: the default and old fan cases complete quickly enough in headless Chromium, but the larger stress case blocks the browser thread for about 11 seconds. A user-facing page cannot cancel, reset, pan, or repaint during that synchronous run.

## Invariants to preserve

The WASM rewrite should preserve these current exact-sampler invariants:

- Frozen RHS row construction starts bottom-to-top as `x_N, ..., x_1, w_1, ..., w_M`.
- After all swaps, row order is `w_1, ..., w_M, x_N, ..., x_1`.
- Exactly `N * M` adjacent row swaps are performed.
- `mu[j]` exists for `j = 0..M`, and every `mu[j]` has length `N`.
- `lam[j]` exists for `j = 0..N`, and `lam[j]` has length `j`.
- `lam[N]` and `mu[M]` are the same sampled signature `lambda`.
- Every partition row is weakly decreasing and nonnegative.
- Consecutive rows form the same noncrossing/interlacing path ensemble on both the `mu` and `lam` sides; future tests should check this directly from the returned row/level data.
- Local probabilistic semantics remain the reverse-Cauchy Yang--Baxter split with weights `(x + y_k) / (w + y_k)` and `(w - x) / (w + y_k)`.

## Stale file audit

The stale files still exist:

- `js/factorial-glauber.js`
- `js/factorial-wasm.js`

Source search found no `/factorial/` reference to either file. The current page loads only:

```html
<script src="/js/factorial-ybe-sampler.js?v=20260605-active"></script>
```

They were not deleted in this baseline task. A later cleanup should remove them only after the worker/WASM smoke tests confirm that `/factorial/` loads the new exact sampler bundle and not the old Glauber code.

## Added test coverage

`tools/test-factorial-ybe.mjs` now checks:

- `/factorial/` loads the current YBE sampler and not the stale Glauber files.
- the seeded JS reference hook is exposed;
- the hot local sampler uses the swappable RNG source rather than direct `Math.random() * total`;
- in Chromium, two tiny reference samples with the same seed return identical JSON-style output after ignoring elapsed time;
- the returned `mu` and `lam` arrays have the expected row counts and row lengths, `lam[N] = mu[M]`, and partitions are nonnegative and weakly decreasing.
