# Vacuum Cleaner Math Review

Scope reviewed:
- `2026-03-17-vacuum-cleaner.cpp`
- `2026-03-17-vacuum-cleaner.md` for math-sensitive visualization code

I checked the lazy Poisson generation, deletion logic, and nearest-neighbor search. The shell stopping test itself is fine; the mathematically relevant problems are below.

## Findings

### 1. Hard cap of 7 points per unit cell breaks the rate-1 Poisson law

Files:
- `2026-03-17-vacuum-cleaner.cpp:75-77`
- `2026-03-17-vacuum-cleaner.cpp:90-92`
- `2026-03-17-vacuum-cleaner.cpp:154-163`
- `2026-03-17-vacuum-cleaner.cpp:185-193`

Problem:
- Each unit cell should contain `N ~ Poisson(1)` points, with support on all nonnegative integers.
- The code samples `n = poissonSample(rng)` and then truncates with `if (n > 7) n = 7;`.
- Because deletions are stored in an 8-bit mask, cells with 8 or more Poisson points are not represented correctly.

Why this is mathematically wrong:
- The simulated field is no longer an exact PPP of intensity 1.
- The implemented cell count law is `min(Poisson(1), 7)`, not `Poisson(1)`.
- Quantitatively:
  - `P(Poisson(1) >= 8) = 1.024919667e-5`
  - `E[min(Poisson(1), 7)] = 0.9999885032`
  - mean intensity loss = `1.149677257e-5` points per unit volume
- In truncated cells, extra points are silently removed, so the greedy walk can choose a different nearest point than the true walk would.

Impact:
- This is the main mathematical inaccuracy in the simulator.
- The error per cell is small, but it is systematic and can affect nearest-neighbor decisions whenever the walk reaches a truncated cell.

Recommended fix:
- Remove the cap and store the full per-cell point count.
- Replace the 8-bit deletion mask with a structure that can represent arbitrary occupancy, such as a per-cell bitset/vector or an index set for deleted points.

### 2. Fixed search radius 100 makes the nearest-neighbor step only approximate

Files:
- `2026-03-17-vacuum-cleaner.cpp:278-299`
- `2026-03-17-vacuum-cleaner.cpp:313-336`
- `2026-03-17-vacuum-cleaner.cpp:431`

Problem:
- `findNearest2D` and `findNearest3D` stop expanding after radius `100`, even if the correctness bound has not yet been met.
- If the true nearest point lies outside the searched region, the function can either:
  - return a point that is nearest only among the searched cells, or
  - return `false`, causing `runSteps` to stop the walk entirely.

Why this is mathematically wrong:
- The vacuum-cleaner process is defined by the globally nearest unvisited Poisson point.
- With a hard search cutoff, the code is exact only when the lower-bound test has already certified that no outer shell can beat the current best point.
- If the loop exits because `radius == 100` rather than because that certification succeeded, exactness is lost.

Impact:
- For intensity 1 this is extremely rare, so this is much less important than the cell truncation bug.
- It is still a real correctness issue: the algorithm is not exact as written.

Recommended fix:
- Remove the hard radius cap and keep expanding until the lower-bound criterion is satisfied.
- If a cap is kept for performance, it should be documented as an approximation rather than presented as the exact greedy walk.

### 3. The 3D scatter view does not show the walker’s local Poisson field

Files:
- `2026-03-17-vacuum-cleaner.md:875-903`

Problem:
- In 3D mode, the scatter view queries
  - `x in [curX - viewHalfX, curX + viewHalfX]`
  - `y in [curY - viewHalfY, curY + viewHalfY]`
  - `z in [-viewHalfY, viewHalfY]`
- So the `z` slab is centered at `0`, not at the walker’s current `z` coordinate.

Why this is mathematically wrong:
- Once the walker moves away from `z = 0`, the displayed points are taken from an unrelated slab through the origin rather than from the walker’s neighborhood.
- The 3D picture therefore ceases to represent the actual local environment that drives the greedy walk.

Additional distortion:
- The 3D query is also capped at `80000` points.
- For the displayed box size, the expected number of Poisson points in the queried 3D slab is typically on the order of `10^6`, so the rendered point cloud is heavily truncated.

Impact:
- This does not change the simulated walk itself.
- It does make the displayed 3D Poisson field mathematically inaccurate as a visualization of the current state.

Recommended fix:
- Center the queried `z` interval at `curZ`.
- If the point cap remains, label the view clearly as a sampled/truncated projection rather than the full local field.
