# GPU CFTP Sampling Algorithm Optimization (10x speedup)

## Overview

Optimize the WebGPU CFTP (Coupling From The Past) sampling algorithm to achieve ~10x speedup. The main bottlenecks are: (1) CPU-side random number generation uploaded per step, (2) per-step command buffer creation, (3) CPU-side coalescence checking via full grid readback. Also includes a secondary improvement for the 2D lozenge drawing path.

## Context

- Files involved:
  - `js/webgpu-lozenge-engine.js` - WebGPU engine with `stepCFTP()`, `stepFluctuationsCFTP()`, `checkCoalescence()`, `checkFluctuationsCoalescence()`
  - `shaders/cftp_compute.wgsl` - CFTP compute shader (per-vertex Glauber step with coupling)
  - `shaders/lozenge_compute.wgsl` - Regular Glauber compute shader (reference for RNG approach)
  - `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md` - Main simulation calling the engine
- Current bottlenecks in `stepCFTP()` (line 517-610 of webgpu-lozenge-engine.js):
  1. CPU random generation: `for (i=0; i<numCells; i++) randomData[i] = Math.random()` every step (~15k cells for size-50 hexagon)
  2. Per-step `writeBuffer` to upload those randoms to GPU
  3. Per-step `createCommandEncoder` + submit (instead of batching many steps)
  4. CPU-side coalescence: reads back 2 full grids, compares cell-by-cell in JS
  5. Same issues doubled in `stepFluctuationsCFTP()` (4 grids, 2 random buffers)
- Key insight: The regular Glauber shader (`lozenge_compute.wgsl`) already uses GPU-side RNG via `pcg_hash(index ^ seed)`, but the CFTP shader (`cftp_compute.wgsl`) reads from a `randoms` buffer uploaded from CPU. This was done for coupling (both chains need same randoms), but can be solved by giving both chains the same seed instead.

## Why these changes give 10x

- Eliminating CPU random gen + upload removes the per-step CPU bottleneck entirely
- Batching N steps in one command buffer eliminates N-1 command encoder creations and queue submissions
- GPU-side coalescence check eliminates the readback-compare-readback cycle (2 mapAsync calls + CPU loop per check)
- Together these turn the CPU from bottleneck to bystander - the GPU can run freely

## Development Approach

- Regular development (code changes, then visual + performance verification)
- Benchmarking: time CFTP end-to-end for hexagon size 30 and 50 before/after
- Correctness: CFTP must still produce valid perfect samples (visual check + verify coalescence still works)
- No test framework exists - verification is visual + timing + checking convergence behavior

## Implementation Steps

### Task 1: Move RNG to GPU-side in CFTP shader

**Files:**
- Modify: `shaders/cftp_compute.wgsl`
- Modify: `js/webgpu-lozenge-engine.js`

The CFTP shader currently reads pre-generated randoms from a storage buffer. Change it to generate randoms on-GPU using PCG hash (same approach as the Glauber shader), keyed by a seed uniform. Both chains get the same seed per step, preserving coupling.

- [x] Add `pcg_hash` and `get_float_rng` functions to `cftp_compute.wgsl` (copy from `lozenge_compute.wgsl`)
- [x] Replace `randoms` storage buffer binding with a `rand_seed` field in the `CFTPParams` uniform (reuse the existing `num_vertices` slot or pad field)
- [x] Change the shader to compute `let u = get_float_rng(u32(index), params.rand_seed)` instead of `let u = randoms[...]`
- [x] Update `js/webgpu-lozenge-engine.js`:
  - Remove `randomBuffer` creation in `initCFTP()`
  - Remove `randomData` generation loop and `writeBuffer` call in `stepCFTP()`
  - Instead, write a different `rand_seed` per step into the uniform buffer
  - Update bind group to not include the random buffer (or keep as dummy if layout change is complex)
- [x] Same changes for fluctuations CFTP: remove `fluctRandomBuffers`, use seed-based RNG

### Task 2: Batch multiple CFTP steps per command buffer

**Files:**
- Modify: `js/webgpu-lozenge-engine.js`

Currently `stepCFTP()` creates one command encoder per step. Instead, batch many steps into a single command buffer, only varying the seed uniform per step.

- [x] In `stepCFTP()`: create a single command encoder, loop through `numSteps` encoding 4 color passes per step (8 dispatches total per step for 2 chains), with different seed uniforms per step
- [x] Challenge: uniforms must differ per step. Solution: use dynamic uniform offsets, or pre-create N uniform buffers (one per step in batch), or use a storage buffer with per-step seeds
- [x] Recommended approach: add a `seedBuffer` (storage buffer of u32 seeds, one per step), pass step index via push constant or index into the seed buffer by step. Alternatively, simpler: write all seeds to a single storage buffer, have shader index by step
- [x] Actually simplest: keep current 4 uniform buffers per color but update rand_seed per step. Since we encode all steps before submit, use write-then-encode pattern: for each step, write seed to uniform buffers, then encode 8 passes. WebGPU guarantees writeBuffer ordering relative to subsequent dispatches within the same queue timeline.
- [x] Apply same batching to `stepFluctuationsCFTP()` (16 dispatches per step instead of 8)
- [x] Remove the `await device.queue.onSubmittedWorkDone()` from the inner loop - only await once after submitting the full batch

### Task 3: GPU-side coalescence check

**Files:**
- Create: `shaders/cftp_coalesce.wgsl`
- Modify: `js/webgpu-lozenge-engine.js`

Currently `checkCoalescence()` copies both grids to staging, maps them to CPU, and compares cell-by-cell. Replace with a GPU reduction shader.

- [ ] Create `shaders/cftp_coalesce.wgsl`: a compute shader that compares two grid buffers and atomically increments a "difference count" counter
  - Input: two `array<i32>` storage buffers (lower, upper), one `atomic<u32>` output buffer
  - Each thread compares grid[index] between lower and upper, atomicAdd to diff_count if different
- [ ] In `js/webgpu-lozenge-engine.js`:
  - Create the coalesce pipeline on first use (lazy init like cftpPipeline)
  - Create a small result buffer (4 bytes) for the diff count, plus staging buffer
  - `checkCoalescence()`: clear result buffer, dispatch coalesce shader, readback 4 bytes instead of 2 full grids
  - This reduces readback from ~60KB (2 x 15K i32) to 4 bytes
- [ ] Apply same optimization to `checkFluctuationsCoalescence()` (check 2 pairs, read back 8 bytes)

### Task 4: Optimize the CFTP loop structure in the calling code

**Files:**
- Modify: `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md`

Tune the batch sizes and check intervals now that GPU steps are much cheaper.

- [ ] Increase `stepsPerBatch` from 1000 to a larger value (e.g., 4000-8000) since steps are now much cheaper without CPU random gen
- [ ] Reduce frequency of `await new Promise(r => setTimeout(r, 0))` UI yields - maybe only yield every few batches
- [ ] Consider: instead of checking coalescence every `checkInterval` steps within a batch, run the full epoch T steps as one batch and check once at the end (since GPU coalescence check is now cheap)
- [ ] Same tuning for the fluctuations CFTP loop

### Task 5: Add benchmarking and verify correctness

**Files:**
- Modify: `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md`

- [ ] Add timing instrumentation: log per-epoch time and total CFTP time to console
- [ ] Test with hexagon presets: size 30 (~1350 lozenges) and size 50 (~3750 lozenges)
- [ ] Verify CFTP still produces valid perfect samples (visual inspection - should show frozen boundary)
- [ ] Verify coalescence detection still works (convergence should happen, not timeout)
- [ ] Compare before/after timing for the same hexagon sizes
- [ ] Test both regular CFTP and fluctuations CFTP paths
- [ ] Clean up any debug logging

### Task 6: (Bonus) WebGL2 instanced lozenge drawing

**Files:**
- Modify: `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.md`

Secondary optimization: replace per-lozenge Canvas 2D drawing with WebGL2 instanced rendering. This improves the draw() path which runs after each sample.

- [ ] Add a `WebGLLozengeRenderer` class using WebGL2 instanced drawing
- [ ] Replace the per-lozenge Canvas 2D loop in `drawLozengeView()` with a single `drawArraysInstanced()` call
- [ ] Handle outlines, colors, dark mode through the WebGL path
- [ ] Keep Canvas 2D as fallback
