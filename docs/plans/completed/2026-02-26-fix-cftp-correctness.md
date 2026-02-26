# Fix CFTP to Correct Propp-Wilson Protocol (Backward Doubling With Seed Reuse)

## Overview

Fix all CFTP (Coupling From The Past) implementations across the codebase to use the correct Propp-Wilson backward-doubling protocol with seed reuse. Three categories of bugs exist: (1) forward coupling instead of backward doubling, (2) early coalescence output at intermediate times instead of time 0, (3) no seed reuse across doubling epochs. Reference note: `/Users/leo/notes/content/2026-02/2026-02-26-coupling-from-the-past/2026-02-26-coupling-from-the-past.tex`.

## Context

- **Correct CFTP protocol**: Generate maps Φ_{-1}, Φ_{-2}, ..., doubling the window. At each epoch, reset to extremal states, apply ALL maps from -T to 0, check coalescence ONLY at time 0. When doubling from T to 2T, REUSE the T maps for [-T, 0] and generate T new maps for [-2T, -T] (prepend).
- **Reference correct implementation**: `_simulations/domino_tilings/2025-12-05-ultimate-domino.cpp:2016-2043` — prepends new seeds with `cftpSweepSeeds.insert(cftpSweepSeeds.begin(), ...)`, resets to extremals, replays all seeds.
- **Reference correct threaded coalescence check**: `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge-threaded.cpp:2191-2207` — checks coalescence only after `cftp_currentStep == cftp_T`.
- **User decision**: Keep forward coupling animation in `talk/visual/js/cftp-sim.js` (pedagogical). Fix `runCFTPQuick()` path (calls C++ `runCFTP()` which will be fixed).
- **GPU engines** (`webgpu-*-engine.js`) and shaders are correct primitives — callers pass `checkInterval=0`. Not modified.

## Development Approach

- Edit C++ source files directly; user handles recompilation
- Each task is a self-contained group of similar changes across multiple files
- Verification: run `python3 /Users/leo/notes/content/2026-02/2026-02-26-coupling-from-the-past/cftp_check.py`

---

## Task 1: Fix Early Coalescence in Lozenge `stepCFTP()`

**Bug**: After each batch of steps, coalescence is checked and the function returns "coalesced" even if `cftp_currentStep < cftp_T`. This outputs the state at intermediate time, not time 0.

**Fix pattern**: Reorder logic to match the threaded version — first check `if (cftp_currentStep < cftp_T) return in_progress`, then check coalescence only when epoch is complete.

**Files:**
- [x] Modify: `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.cpp` — `stepCFTP()` at line 2191
- [x] Modify: `talk/visual/sim/src/visual-lozenge.cpp` — `stepCFTP()` at line ~2212
- [x] Modify: `talk/waterfall/sim/src/visual-lozenge.cpp` — `stepCFTP()` at line ~2207

In each file, the current code after the batch loop is:
```cpp
// BUG: Check coalescence after each batch - early exit if coalesced
if (cftp_lower.grid == cftp_upper.grid) {
    cftp_coalesced = true;
    // returns "coalesced" at cftp_currentStep which may be < cftp_T
    return ...;
}

if (cftp_currentStep < cftp_T) {
    return in_progress;
}

// Not coalesced after all T steps - double T
```

Replace with (matching threaded version at line 2191-2207):
```cpp
// Only check coalescence after running ALL T steps
if (cftp_currentStep < cftp_T) {
    return in_progress;
}

// Epoch complete - check coalescence at time 0
if (cftp_lower.grid == cftp_upper.grid) {
    cftp_coalesced = true;
    return coalesced;
}

// Not coalesced after all T steps - double T
```

**NOT modified** (already correct):
- `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge-threaded.cpp` — line 2191 comment says "Pure doubling: only check coalescence after running ALL T steps"
- `talk/visual/sim/src/visual-lozenge-threaded.cpp` — same pattern
- `talk/waterfall/sim/src/visual-lozenge-threaded.cpp` — same pattern

---

## Task 2: Fix Early Coalescence in Domino `stepCFTP()` and `stepFluctuationsCFTP()`

**Bug**: `tilingsEqual()` check runs after every 1000-sweep batch within an epoch, declaring coalescence at intermediate time.

**Files:**
- [x] Modify: `_simulations/domino_tilings/2025-12-05-ultimate-domino.cpp` — `stepCFTP()` at line 2058-2066
- [x] Modify: `_simulations/domino_tilings/2025-12-05-ultimate-domino.cpp` — `stepFluctuationsCFTP()` at lines 2586 and 2620

### `stepCFTP()` fix

Current code (lines 2046-2090):
```cpp
// Run sweeps batch
while (cftpCurrentSweepIdx < cftpSweepSeeds.size() && sweepsThisBatch < COALESCENCE_CHECK_INTERVAL) {
    cftpSweep(cftpSweepSeeds[cftpCurrentSweepIdx]);
    cftpCurrentSweepIdx++;
    cftpTotalSweeps++;
    sweepsThisBatch++;
}

// BUG: Check coalescence every 1000 sweeps (intermediate time)
if (tilingsEqual(cftpMin, cftpMax)) {
    return coalesced;
}

// If finished this epoch's sweeps without coalescence
if (cftpCurrentSweepIdx >= cftpSweepSeeds.size()) {
    // ... double epoch ...
}

// Still in progress
return in_progress;
```

Fix — move coalescence check inside epoch-complete block:
```cpp
// Run sweeps batch
while (cftpCurrentSweepIdx < cftpSweepSeeds.size() && sweepsThisBatch < COALESCENCE_CHECK_INTERVAL) {
    cftpSweep(cftpSweepSeeds[cftpCurrentSweepIdx]);
    cftpCurrentSweepIdx++;
    cftpTotalSweeps++;
    sweepsThisBatch++;
}

// If finished this epoch's sweeps — check coalescence at time 0 only
if (cftpCurrentSweepIdx >= cftpSweepSeeds.size()) {
    if (tilingsEqual(cftpMin, cftpMax)) {
        return coalesced;
    }
    // ... double epoch ...
}

// Still in progress
return in_progress;
```

### `stepFluctuationsCFTP()` fix

Same pattern for both pair 0 (line 2586) and pair 1 (line 2620). Move `tilingsEqual()` check from after-batch to inside epoch-complete branch. Currently:
```cpp
// BUG: Check coalescence after each batch
if (tilingsEqual(fluctMin0, fluctMax0)) {
    fluctCoalesced0 = true;
} else if (fluctCurrentSweepIdx0 >= fluctSeeds0.size()) {
    fluctEpochSize0 *= 2;
}
```

Fix:
```cpp
// Check coalescence only at epoch completion
if (fluctCurrentSweepIdx0 >= fluctSeeds0.size()) {
    if (tilingsEqual(fluctMin0, fluctMax0)) {
        fluctCoalesced0 = true;
    } else {
        fluctEpochSize0 *= 2;
    }
}
```

Apply identically for pair 1 (lines ~2620).

---

## Task 3: Add Seed Reuse to Lozenge `runCFTP()`

**Bug**: Each doubling epoch generates entirely fresh seeds for the full window. Should prepend new seeds for earlier time period while reusing existing seeds.

**Files** (7 files, all have identical `runCFTP()` pattern):
- [x] `_simulations/lozenge_tilings/2025-11-28-c2-CFTP.cpp`
- [x] `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.cpp`
- [x] `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge-threaded.cpp`
- [x] `talk/visual/sim/src/visual-lozenge.cpp`
- [x] `talk/visual/sim/src/visual-lozenge-threaded.cpp`
- [x] `talk/waterfall/sim/src/visual-lozenge.cpp`
- [x] `talk/waterfall/sim/src/visual-lozenge-threaded.cpp`

Current pattern (e.g., `ultimate-lozenge.cpp:2101-2145`):
```cpp
char* runCFTP() {
    GridState minState, maxState;
    makeExtremalState(minState, -1);
    makeExtremalState(maxState, 1);

    int T = 1;
    bool coalesced = false;

    while (!coalesced) {
        // BUG: All fresh seeds each epoch
        std::vector<uint64_t> currentSeeds(T);
        for (int i = 0; i < T; i++) currentSeeds[i] = xorshift64();

        GridState lower, upper;
        lower.cloneFrom(minState.grid);
        upper.cloneFrom(maxState.grid);

        for (int t = 0; t < T; t++) coupledStep(lower, upper, currentSeeds[t]);

        if (lower.grid == upper.grid) {
            coalesced = true;
            dimerGrid = lower.grid;
        } else {
            T *= 2;
        }
    }
    // ...
}
```

Fix — accumulate seeds with prepending:
```cpp
char* runCFTP() {
    GridState minState, maxState;
    makeExtremalState(minState, -1);
    makeExtremalState(maxState, 1);

    std::vector<uint64_t> allSeeds;
    int T = 1;
    bool coalesced = false;

    while (!coalesced) {
        // Prepend new seeds for earlier time period
        int newCount = T - (int)allSeeds.size();
        std::vector<uint64_t> newSeeds(newCount);
        for (int i = 0; i < newCount; i++) newSeeds[i] = xorshift64();
        allSeeds.insert(allSeeds.begin(), newSeeds.begin(), newSeeds.end());

        // Reset to extremal states
        GridState lower, upper;
        lower.cloneFrom(minState.grid);
        upper.cloneFrom(maxState.grid);

        // Apply ALL seeds (reusing later-time seeds from previous epochs)
        for (size_t t = 0; t < allSeeds.size(); t++) {
            coupledStep(lower, upper, allSeeds[t]);
        }

        if (lower.grid == upper.grid) {
            coalesced = true;
            dimerGrid = lower.grid;
        } else {
            T *= 2;
        }
    }
    // ...
}
```

---

## Task 4: Add Seed Reuse to Lozenge `stepCFTP()`

**Bug**: Same as Task 3 but for the step-based function called from JS.

**Files** (same 7 files as Task 3):
- [x] `_simulations/lozenge_tilings/2025-11-28-c2-CFTP.cpp`
- [x] `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.cpp`
- [x] `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge-threaded.cpp`
- [x] `talk/visual/sim/src/visual-lozenge.cpp`
- [x] `talk/visual/sim/src/visual-lozenge-threaded.cpp`
- [x] `talk/waterfall/sim/src/visual-lozenge.cpp`
- [x] `talk/waterfall/sim/src/visual-lozenge-threaded.cpp`

### Step 1: Add `cftp_seeds.clear()` to `initCFTP()`

In each file's `initCFTP()`, add `cftp_seeds.clear()` alongside the existing reset:
```cpp
cftp_T = 1;
cftp_initialized = true;
cftp_coalesced = false;
cftp_currentStep = 0;
cftp_seeds.clear();  // ADD THIS
```

### Step 2: Change seed generation in `stepCFTP()`

Current (e.g., `ultimate-lozenge.cpp:2178-2182`):
```cpp
if (cftp_currentStep == 0) {
    cftp_seeds.resize(cftp_T);
    for (int i = 0; i < cftp_T; i++) cftp_seeds[i] = xorshift64();
    cftp_lower.cloneFrom(cftp_minState.grid);
    cftp_upper.cloneFrom(cftp_maxState.grid);
}
```

Fix:
```cpp
if (cftp_currentStep == 0) {
    // Prepend new seeds for earlier time period (reuse existing later-time seeds)
    int newCount = cftp_T - (int)cftp_seeds.size();
    if (newCount > 0) {
        std::vector<uint64_t> newSeeds(newCount);
        for (int i = 0; i < newCount; i++) newSeeds[i] = xorshift64();
        cftp_seeds.insert(cftp_seeds.begin(), newSeeds.begin(), newSeeds.end());
    }
    cftp_lower.cloneFrom(cftp_minState.grid);
    cftp_upper.cloneFrom(cftp_maxState.grid);
}
```

### Step 3: Fix loop bound

The step loop uses `cftp_seeds[cftp_currentStep + i]` which is correct — the index into the full accumulated seed array works because `cftp_seeds.size() == cftp_T` at this point.

The batch size check `std::min(cftp_stepsPerBatch, cftp_T - cftp_currentStep)` also still works correctly.

---

## Task 5: Add Seed Reuse to Lozenge `stepFluctuationsCFTP()`

**Bug**: When doubling T, generates entirely new seeds with a deterministic hash. Should prepend.

**Files** (same 7 lozenge files + the domino file already has correct prepending):
- [x] `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge.cpp`
- [x] `_simulations/lozenge_tilings/2025-11-28-ultimate-lozenge-threaded.cpp`
- [x] `talk/visual/sim/src/visual-lozenge.cpp`
- [x] `talk/visual/sim/src/visual-lozenge-threaded.cpp`
- [x] `talk/waterfall/sim/src/visual-lozenge.cpp`
- [x] `talk/waterfall/sim/src/visual-lozenge-threaded.cpp`

Note: `c2-CFTP.cpp` does not have `stepFluctuationsCFTP()`.

Current doubling code (e.g., `ultimate-lozenge.cpp:2666-2681`):
```cpp
} else {
    // Double T and generate new seeds
    int newT = fluct_T[s] * 2;
    std::vector<uint64_t> newSeeds(newT);

    // Generate seeds deterministically
    uint64_t seedBase = fluct_seeds[s][0] ^ (s * 12345);
    uint64_t tempRng = seedBase;
    for (int i = 0; i < newT; i++) {
        tempRng ^= tempRng >> 12;
        tempRng ^= tempRng << 25;
        tempRng ^= tempRng >> 27;
        newSeeds[i] = tempRng * 0x2545F4914F6CDD1DULL;
    }

    fluct_seeds[s] = std::move(newSeeds);
    fluct_T[s] = newT;
}
```

Fix — prepend new seeds, keep existing:
```cpp
} else {
    // Prepend new seeds for earlier time period (reuse existing later-time seeds)
    int newCount = fluct_T[s];
    std::vector<uint64_t> newSeeds(newCount);
    for (int i = 0; i < newCount; i++) newSeeds[i] = xorshift64();
    fluct_seeds[s].insert(fluct_seeds[s].begin(), newSeeds.begin(), newSeeds.end());
    fluct_T[s] *= 2;
}
```

---

## Task 6: Convert Q-Partition CFTP from Forward Coupling to Backward Doubling

**Bug**: These files run coupled chains forward without backward doubling. Should use backward doubling with seed reuse.

**Files:**
- [x] Modify: `_simulations/misc/2025-12-28-q-partition-cftp.cpp` — `runCFTPEpoch()` at line 225
- [x] Modify: `_simulations/misc/2026-01-04-q-partition-cftp-general.cpp` — `runCFTPEpoch()` at line ~312
- [x] Modify: `talk/visual/sim/src/q-partition-cftp.cpp` — `runCFTPBatch()` at line ~156
- [x] Modify: `talk/waterfall/sim/src/q-partition-cftp.cpp` — `runCFTPBatch()` at line ~156

### Step 1: Add global CFTP state

Add near the other globals in each file:
```cpp
static std::vector<uint64_t> cftpSeeds;
static int cftp_T = 1;
```

### Step 2: Add reset function

Add a reset function to be called when starting a new sample:
```cpp
void resetCFTP() {
    cftpSeeds.clear();
    cftp_T = 1;
    currentT = 0;
}
```

Call `resetCFTP()` from wherever the existing CFTP initialization happens (e.g., the `initCFTP` exported function or at the start of the sampling loop).

### Step 3: Replace `runCFTPEpoch()` / `runCFTPBatch()`

Current forward coupling pattern (`q-partition-cftp.cpp:225-259`):
```cpp
int runCFTPEpoch() {
    const int BATCH_SIZE = 50000000;
    if (currentT == 0) {
        lowerPath = minPath();
        upperPath = maxPath();
    }
    for (int t = 0; t < BATCH_SIZE; t++) {
        uint64_t seed = globalRng.next();
        coupledGlauberStepPath(lowerPath, upperPath, seed);
        currentT++;
        if ((currentT % 1000000) == 0 && isCoalesced()) {
            path = lowerPath;
            return 1;
        }
    }
    if (isCoalesced()) { path = lowerPath; return 1; }
    return 0;
}
```

Replace with backward doubling:
```cpp
int runCFTPEpoch() {
    // Prepend new seeds for earlier time period
    int newCount = cftp_T - (int)cftpSeeds.size();
    if (newCount > 0) {
        std::vector<uint64_t> newSeeds(newCount);
        for (int i = 0; i < newCount; i++) newSeeds[i] = globalRng.next();
        cftpSeeds.insert(cftpSeeds.begin(), newSeeds.begin(), newSeeds.end());
    }

    // Reset to extremal states
    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;
    upperPath.assign(M + N, 0);
    for (int i = N; i < M + N; i++) upperPath[i] = 1;

    // Apply ALL seeds from -T to 0
    for (size_t t = 0; t < cftpSeeds.size(); t++) {
        coupledGlauberStepPath(lowerPath, upperPath, cftpSeeds[t]);
    }
    currentT = cftpSeeds.size();

    // Check coalescence at time 0 only
    if (isCoalesced()) {
        path = lowerPath;
        return 1;
    }

    // Double for next epoch
    cftp_T *= 2;
    return 0;
}
```

Note: For the simulation-page files (`_simulations/misc/`), the function is called repeatedly from a batch loop with progress reporting. The new implementation runs the full epoch per call, which is fine — early epochs are very fast (T=1,2,4,...), and later epochs are O(T) which is comparable to the old forward approach.

For the WASM talk files (`talk/*/sim/src/q-partition-cftp.cpp`), adapt similarly — the `runCFTPBatch()` function should do one complete backward-doubling epoch per call and return status.

### Step 4: Update the `q-partition-cftp-general.cpp` variant

This file has a different path encoding (general boundary). Apply the same pattern — replace the forward loop in `runCFTPEpoch()` with backward doubling + prepend. The extremal state initialization may differ (check the existing init code for lower/upper boundary paths).

---

## Files NOT Modified

| File | Reason |
|------|--------|
| `talk/visual/js/cftp-sim.js` | Keep forward animation; `runCFTPQuick()` calls C++ `runCFTP()` which is fixed in Task 3 |
| `js/webgpu-lozenge-engine.js` | Correct GPU primitive; callers pass `checkInterval=0` |
| `js/webgpu-domino-engine.js` | Correct GPU primitive |
| `js/webgpu-qpartition-engine.js` | Not CFTP (forward Glauber mixing from CFTP-initialized state) |
| `shaders/cftp_compute.wgsl` | Correct coupled-step primitive |
| `shaders/cftp_coalesce.wgsl` | Correct coalescence check primitive |
| `shaders/domino_cftp.wgsl` | Correct coupled-step primitive |
| `talk/visual/sim/visual-webgpu-lozenge-engine.js` | Copy of GPU engine — correct |
| `talk/waterfall/sim/visual-webgpu-lozenge-engine.js` | Copy of GPU engine — correct |
| `_simulations/misc/2025-12-08-triangular-dimers.cpp` | No CFTP (explicitly noted in code) |
| `_simulations/lozenge_tilings/2025-11-28-c2-CFTP.cpp` | No `stepFluctuationsCFTP()` — only needs Tasks 3 & 4 |

## Verification

1. `python3 /Users/leo/notes/content/2026-02/2026-02-26-coupling-from-the-past/cftp_check.py` — correct CFTP should give TV distance ≈ 0 for the correct method
2. Visual spot-check: open lozenge and domino simulation pages in browser, run CFTP sampling, verify it still produces valid tilings
3. Check that `stepCFTP()` coalescence is only reported when the full epoch has completed (not at intermediate batch boundaries)
