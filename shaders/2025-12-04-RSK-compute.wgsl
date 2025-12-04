// RSK Aztec Diamond Sampling - WebGPU Compute Shader (2025-12-04-RSK-compute.wgsl)
// Implements wavefront parallelization of the growth diagram
// Each thread processes one cell on the current anti-diagonal
// Used by: js/2025-12-04-RSK-sampling-gpu.js

// Maximum partition length - adjust based on max n supported
const MAX_PART_LEN: u32 = 128u;

struct RSKParams {
    n: i32,                    // Aztec diamond size
    q: f32,                    // q-Whittaker parameter
    max_part_len: i32,         // Max partition length (same as MAX_PART_LEN)
    current_diag: i32,         // Current anti-diagonal being processed
    num_cells: i32,            // Total number of cells
    randoms_per_cell: i32,     // Random numbers allocated per cell
    _pad0: u32,
    _pad1: u32,
}

// Partition storage: flattened 2D array
// tau[i][j] is at index getCellIndex(i,j) * max_part_len
@group(0) @binding(0) var<storage, read_write> tau: array<i32>;
@group(0) @binding(1) var<storage, read_write> tau_len: array<i32>;
@group(0) @binding(2) var<uniform> params: RSKParams;
@group(0) @binding(3) var<storage, read> x_params: array<f32>;  // Using f32 for simplicity
@group(0) @binding(4) var<storage, read> y_params: array<f32>;
@group(0) @binding(5) var<storage, read> randoms: array<f32>;

// Get cell index in flattened array
fn getCellIndex(i: i32, j: i32) -> i32 {
    // Cells stored row by row, row i has (n+1-i) cells
    var idx: i32 = 0;
    for (var row: i32 = 0; row < i; row++) {
        idx += (params.n + 1 - row);
    }
    return idx + j;
}

// Get partition value at position k, returns 0 if k >= length
fn getPart(cell_idx: i32, k: i32) -> i32 {
    let len = tau_len[cell_idx];
    if (k < 0 || k >= len) {
        return 0;
    }
    let offset = cell_idx * params.max_part_len;
    return tau[offset + k];
}

// Set partition at cell
fn setPart(cell_idx: i32, k: i32, val: i32) {
    let offset = cell_idx * params.max_part_len;
    tau[offset + k] = val;
}

// Fast power for small integer exponents
fn fastPow(base: f32, exp: i32) -> f32 {
    if (exp <= 0) { return 1.0; }
    if (exp == 1) { return base; }
    var result: f32 = 1.0;
    var b: f32 = base;
    var e: i32 = exp;
    while (e > 0) {
        if ((e & 1) == 1) {
            result *= b;
        }
        b *= b;
        e >>= 1;
    }
    return result;
}

// Compute f_k for q-deformed probability
fn computeF(lam_k: i32, nu_bar_k: i32, nu_bar_k_minus_1: i32, q: f32) -> f32 {
    let delta_lam = lam_k - nu_bar_k + 1;
    if (delta_lam <= 0) { return 0.0; }
    let delta_nu = nu_bar_k_minus_1 - nu_bar_k + 1;
    if (delta_nu <= 0) { return 1.0; }
    let numerator = 1.0 - fastPow(q, delta_lam);
    let denominator = 1.0 - fastPow(q, delta_nu);
    if (denominator == 0.0) { return 1.0; }
    return numerator / denominator;
}

// Compute g_i for q-deformed probability
fn computeG(lam_i: i32, nu_bar_i: i32, q: f32) -> f32 {
    let delta = lam_i - nu_bar_i + 1;
    if (delta <= 0) { return 0.0; }
    return 1.0 - fastPow(q, delta);
}

// Get random number for this cell
fn getRandom(cell_idx: i32, rand_idx: i32) -> f32 {
    let idx = cell_idx * params.randoms_per_cell + rand_idx;
    if (idx >= 0 && idx < i32(arrayLength(&randoms))) {
        return randoms[idx];
    }
    return 0.5; // fallback
}

// Sample VHq: the core q-Whittaker bijection
// lam_idx, mu_idx, kappa_idx are cell indices for input partitions
// result_idx is cell index for output partition
fn sampleVHq(lam_idx: i32, mu_idx: i32, kappa_idx: i32, bit: i32, result_idx: i32, rand_base: i32) {
    let q = params.q;

    // Get lengths
    let lam_len = tau_len[lam_idx];
    let mu_len = tau_len[mu_idx];
    let kappa_len = tau_len[kappa_idx];
    let max_len = max(max(lam_len, mu_len), kappa_len) + 2;

    // Initialize nu = lam
    var nu: array<i32, MAX_PART_LEN>;
    for (var i: i32 = 0; i < i32(MAX_PART_LEN); i++) {
        nu[i] = getPart(lam_idx, i);
    }

    // Step 1: Rightmost particle jumps by bit
    nu[0] = getPart(lam_idx, 0) + bit;

    // Find islands: indices where mu_i - kappa_i = 1
    var islands_start: array<i32, 32>;  // Max 32 islands
    var islands_end: array<i32, 32>;
    var num_islands: i32 = 0;
    var in_island: bool = false;
    var island_start: i32 = 0;

    for (var i: i32 = 0; i < max_len && i < i32(MAX_PART_LEN); i++) {
        let mu_i = getPart(mu_idx, i);
        let kappa_i = getPart(kappa_idx, i);
        let is_moved = (mu_i - kappa_i) == 1;

        if (is_moved) {
            if (!in_island) {
                in_island = true;
                island_start = i;
            }
        } else {
            if (in_island && num_islands < 32) {
                islands_start[num_islands] = island_start;
                islands_end[num_islands] = i - 1;
                num_islands++;
                in_island = false;
            }
        }
    }
    // Close last island if still in one
    if (in_island && num_islands < 32) {
        islands_start[num_islands] = island_start;
        islands_end[num_islands] = max_len - 1;
        num_islands++;
    }

    // Process each island
    var rand_idx: i32 = rand_base;
    for (var isl: i32 = 0; isl < num_islands; isl++) {
        let k = islands_start[isl];
        let m = islands_end[isl];
        let nu_bar_k = getPart(mu_idx, k);
        var nu_bar_k_minus_1: i32 = 1000000;  // Large value for k=0
        if (k > 0) {
            nu_bar_k_minus_1 = getPart(mu_idx, k - 1);
        }

        // Case 1: bit=1 and k=0
        if (bit == 1 && k == 0) {
            for (var idx: i32 = 1; idx <= m + 1 && idx < i32(MAX_PART_LEN); idx++) {
                nu[idx] = getPart(lam_idx, idx) + 1;
            }
            continue;
        }

        // Case 2: bit=0 or k>0
        var stopped_at: i32;
        if (q == 0.0) {
            // Schur case: deterministic
            stopped_at = m + 1;
            for (var idx: i32 = k; idx <= m; idx++) {
                if (getPart(lam_idx, idx) > getPart(mu_idx, idx) - 1) {
                    stopped_at = idx;
                    break;
                }
            }
        } else {
            // q-Whittaker case: probabilistic
            let lam_k = getPart(lam_idx, k);
            let f_k = computeF(lam_k, nu_bar_k, nu_bar_k_minus_1, q);

            let r1 = getRandom(result_idx, rand_idx);
            rand_idx++;

            if (r1 < f_k) {
                stopped_at = k;
            } else {
                stopped_at = m + 1;
                for (var s: i32 = k + 1; s <= m; s++) {
                    let g_s = computeG(getPart(lam_idx, s), getPart(mu_idx, s), q);
                    let r2 = getRandom(result_idx, rand_idx);
                    rand_idx++;
                    if (r2 < g_s) {
                        stopped_at = s;
                        break;
                    }
                }
            }
        }

        // Apply moves
        for (var idx: i32 = k; idx <= m + 1 && idx < i32(MAX_PART_LEN); idx++) {
            if (idx != stopped_at) {
                nu[idx] = getPart(lam_idx, idx) + 1;
            }
        }
    }

    // Ensure nu >= mu (horizontal strip)
    for (var i: i32 = 0; i < i32(MAX_PART_LEN); i++) {
        let mu_i = getPart(mu_idx, i);
        if (nu[i] < mu_i) {
            nu[i] = mu_i;
        }
    }

    // Trim and store result
    var result_len: i32 = 0;
    for (var i: i32 = i32(MAX_PART_LEN) - 1; i >= 0; i--) {
        if (nu[i] != 0) {
            result_len = i + 1;
            break;
        }
    }

    tau_len[result_idx] = result_len;
    let offset = result_idx * params.max_part_len;
    for (var i: i32 = 0; i < result_len; i++) {
        tau[offset + i] = nu[i];
    }
    for (var i: i32 = result_len; i < params.max_part_len; i++) {
        tau[offset + i] = 0;
    }
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let thread_idx = i32(GlobalInvocationID.x);
    let diag = params.current_diag;
    let n = params.n;

    // Count cells on this diagonal and find our cell
    var cell_count: i32 = 0;
    var our_i: i32 = -1;
    var our_j: i32 = -1;

    for (var i: i32 = max(1, diag - n); i <= min(n, diag); i++) {
        let j = diag - i;
        if (j >= 1 && j <= n + 1 - i) {
            if (cell_count == thread_idx) {
                our_i = i;
                our_j = j;
            }
            cell_count++;
        }
    }

    // Thread doesn't correspond to a cell on this diagonal
    if (our_i < 0) {
        return;
    }

    // Get cell indices
    let lam_idx = getCellIndex(our_i - 1, our_j);
    let mu_idx = getCellIndex(our_i, our_j - 1);
    let kappa_idx = getCellIndex(our_i - 1, our_j - 1);
    let result_idx = getCellIndex(our_i, our_j);

    // Compute Bernoulli bit: p = x_i * y_j / (1 + x_i * y_j)
    let x_i = x_params[our_i - 1];
    let y_j = y_params[our_j - 1];
    let xi = x_i * y_j;
    let p = xi / (1.0 + xi);

    let r = getRandom(result_idx, 0);
    var bit: i32 = 0;
    if (r < p) {
        bit = 1;
    }

    // Sample VHq
    sampleVHq(lam_idx, mu_idx, kappa_idx, bit, result_idx, 1);
}
