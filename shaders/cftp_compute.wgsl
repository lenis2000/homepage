// CFTP (Coupling From The Past) Compute Shader
// Runs one chain (lower or upper) using pre-generated random numbers
// Both chains use identical randoms for coupling
// Matches C++ implementation exactly
// Supports periodic weights via per-cell q values

struct CFTPParams {
    minN: i32,
    maxN: i32,
    minJ: i32,
    maxJ: i32,
    strideJ: i32,
    color_pass: i32,    // 0, 1, 2, or 3 for 4-color scheme
    q_bias: f32,        // Global q bias (used when use_weights=0)
    use_weights: u32,   // 0 = use global q_bias, 1 = use per-cell weights buffer
    num_vertices: u32,
    use_height_weighted: u32,  // 0 = standard q-volume, 1 = height-weighted
    height_S: i32,      // S parameter for height-weighted mode
    _pad: u32,          // Padding for alignment
}

@group(0) @binding(0) var<storage, read_write> grid: array<i32>;
@group(0) @binding(1) var<storage, read> randoms: array<f32>;
@group(0) @binding(2) var<uniform> params: CFTPParams;
@group(0) @binding(3) var<storage, read> weights: array<f32>;  // Per-cell q values

// Get grid index - returns -1 if out of bounds
fn get_grid_idx(n: i32, j: i32) -> i32 {
    if (n < params.minN || n > params.maxN || j < params.minJ || j > params.maxJ) {
        return -1;
    }
    return (n - params.minN) * params.strideJ + (j - params.minJ);
}

struct HexEdge {
    blackN: i32,
    blackJ: i32,
    dtype: i32,
}

// Get hex edge around vertex (n, j) - matches C++ getHexEdgesAroundVertex EXACTLY
// C++ struct: { int blackN, blackJ, whiteN, whiteJ, type }
// So edges[0] = {n, j+1, n, j, 1} means black=(n, j+1), type=1
// C++ code:
// edges[0] = {n, j+1, n, j, 1};       -> black (n, j+1), type 1
// edges[1] = {n, j, n, j, 0};         -> black (n, j), type 0
// edges[2] = {n, j, n-1, j, 2};       -> black (n, j), type 2
// edges[3] = {n-1, j+1, n-1, j, 1};   -> black (n-1, j+1), type 1
// edges[4] = {n-1, j+1, n-1, j+1, 0}; -> black (n-1, j+1), type 0
// edges[5] = {n, j+1, n-1, j+1, 2};   -> black (n, j+1), type 2
fn get_hex_edge(n: i32, j: i32, edge_idx: u32) -> HexEdge {
    switch(edge_idx) {
        case 0u: { return HexEdge(n, j + 1, 1); }
        case 1u: { return HexEdge(n, j, 0); }
        case 2u: { return HexEdge(n, j, 2); }
        case 3u: { return HexEdge(n - 1, j + 1, 1); }
        case 4u: { return HexEdge(n - 1, j + 1, 0); }
        case 5u: { return HexEdge(n, j + 1, 2); }
        default: { return HexEdge(0, 0, 0); }
    }
}

// Check if dimer exists - matches C++ dimerExistsOnGrid
// Out of bounds returns FALSE (counts as uncovered)
fn dimer_exists(blackN: i32, blackJ: i32, dtype: i32) -> bool {
    let idx = get_grid_idx(blackN, blackJ);
    if (idx < 0) {
        return false;
    }
    if (idx >= i32(arrayLength(&grid))) {
        return false;
    }
    let val = grid[idx];
    if (val == -1) {
        return false;
    }
    return val == dtype;
}

// Set dimer - with bounds check
fn set_dimer(blackN: i32, blackJ: i32, dtype: i32) {
    let idx = get_grid_idx(blackN, blackJ);
    if (idx >= 0 && idx < i32(arrayLength(&grid))) {
        grid[idx] = dtype;
    }
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let index = i32(GlobalInvocationID.x);
    let grid_len = i32(arrayLength(&grid));
    if (index >= grid_len) {
        return;
    }

    // Reconstruct (n, j) from linear index
    let rel_n = index / params.strideJ;
    let rel_j = index % params.strideJ;
    let n = rel_n + params.minN;
    let j = rel_j + params.minJ;

    // 4-Color Chromatic Sweep for parallel safety
    // Using (n % 2) * 2 + (j % 2) ensures vertices are at least 2 apart
    let color = (((n % 2) + 2) % 2) * 2 + (((j % 2) + 2) % 2);
    if (color != params.color_pass) {
        return;
    }

    // Get pre-generated random for this vertex
    let u = randoms[u32(index) % params.num_vertices];

    // Get q value for this vertex
    var q: f32;
    if (params.use_weights != 0u && u32(index) < arrayLength(&weights)) {
        // Use per-cell periodic weights
        q = weights[u32(index)];
    } else {
        // Use global q_bias
        q = params.q_bias;
    }
    // Note: For CFTP, we need to compute pRemove based on height when height-weighted
    // This is computed after we know the rotation type and heights

    // Count covered and uncovered edges
    var covered_count: i32 = 0;
    var uncovered_count: i32 = 0;
    var covered: array<u32, 3>;
    var uncovered: array<u32, 3>;

    for (var k: u32 = 0u; k < 6u; k++) {
        let edge = get_hex_edge(n, j, k);
        if (dimer_exists(edge.blackN, edge.blackJ, edge.dtype)) {
            if (covered_count < 3) {
                covered[covered_count] = k;
                covered_count++;
            } else {
                return;
            }
        } else {
            if (uncovered_count < 3) {
                uncovered[uncovered_count] = k;
                uncovered_count++;
            } else {
                return;
            }
        }
    }

    if (covered_count != 3 || uncovered_count != 3) {
        return;
    }

    // Compute volume change (rotation type)
    var volume_before: i32 = 0;
    var volume_after: i32 = 0;

    for (var k: i32 = 0; k < 3; k++) {
        let cov_edge = get_hex_edge(n, j, covered[k]);
        let uncov_edge = get_hex_edge(n, j, uncovered[k]);

        if (cov_edge.dtype == 0) {
            volume_before += cov_edge.blackN;
        }
        if (uncov_edge.dtype == 0) {
            volume_after += uncov_edge.blackN;
        }
    }

    let volume_change = volume_after - volume_before;
    if (volume_change == 0) {
        return;
    }

    // CFTP coupling rule:
    // rotationType = +1 means volume increase (adding box)
    // rotationType = -1 means volume decrease (removing box)
    let rot_type = select(-1, 1, volume_change > 0);

    // Compute pRemove (height-weighted or standard)
    var pRemove: f32;
    if (params.use_height_weighted != 0u) {
        // Height-weighted: pRemove = 1 / (1 + w) where w = q^h + q^(2S-h)
        let h = select(volume_before, volume_after, volume_change > 0);
        let S = params.height_S;
        let qh = pow(q, f32(h));
        let q2Smh = pow(q, f32(2 * S - h));
        let w = qh + q2Smh;
        pRemove = 1.0 / (1.0 + w);
    } else {
        // Standard: pRemove = 1 / (1 + q)
        pRemove = 1.0 / (1.0 + q);
    }

    // Coupling decision: same random u used for both chains
    // if u < pRemove: accept removal (rot_type == -1)
    // if u >= pRemove: accept addition (rot_type == +1)
    var should_flip = false;
    if (u < pRemove && rot_type == -1) {
        should_flip = true;
    } else if (u >= pRemove && rot_type == 1) {
        should_flip = true;
    }

    if (!should_flip) {
        return;
    }

    // Execute the flip
    for (var k: i32 = 0; k < 3; k++) {
        let cov_edge = get_hex_edge(n, j, covered[k]);
        set_dimer(cov_edge.blackN, cov_edge.blackJ, -1);
    }

    for (var k: i32 = 0; k < 3; k++) {
        let uncov_edge = get_hex_edge(n, j, uncovered[k]);
        set_dimer(uncov_edge.blackN, uncov_edge.blackJ, uncov_edge.dtype);
    }
}
