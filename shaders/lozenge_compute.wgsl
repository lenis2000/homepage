// Lozenge Tiling Glauber Dynamics - WebGPU Compute Shader
// Implements chromatic sweep algorithm on triangular lattice
//
// This shader performs parallel Glauber dynamics updates using a 3-color
// checkerboard scheme. Vertices with the same (n+j) mod 3 value share no
// edges and can be updated simultaneously without race conditions.

struct SimulationParams {
    minN: i32,
    maxN: i32,
    minJ: i32,
    maxJ: i32,
    strideJ: i32,
    color_pass: i32,    // 0, 1, or 2
    q_bias: f32,
    rand_seed: u32,
}

@group(0) @binding(0) var<storage, read_write> grid: array<i32>;
@group(0) @binding(1) var<uniform> params: SimulationParams;

// PCG Hash for fast RNG
fn pcg_hash(input: u32) -> u32 {
    let state = input * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn get_float_rng(id: u32, seed: u32) -> f32 {
    return f32(pcg_hash(id ^ seed)) / 4294967295.0;
}

// Get grid index matching C++ getGridIdx()
fn get_grid_idx(n: i32, j: i32) -> i32 {
    if (n < params.minN || n > params.maxN || j < params.minJ || j > params.maxJ) {
        return -1;
    }
    return (n - params.minN) * params.strideJ + (j - params.minJ);
}

// Check if a dimer exists at given black triangle with given type
fn dimer_exists(blackN: i32, blackJ: i32, dtype: i32) -> bool {
    let idx = get_grid_idx(blackN, blackJ);
    if (idx < 0 || idx >= i32(arrayLength(&grid))) {
        return false;
    }
    return grid[idx] == dtype;
}

// Set dimer at given black triangle
fn set_dimer(blackN: i32, blackJ: i32, dtype: i32) {
    let idx = get_grid_idx(blackN, blackJ);
    if (idx >= 0 && idx < i32(arrayLength(&grid))) {
        grid[idx] = dtype;
    }
}

// Edge structure: blackN, blackJ, whiteN, whiteJ, type
// Inline the 6 hex edges around vertex (n, j) matching C++ getHexEdgesAroundVertex
// Edge 0: black(n, j+1), type 1   - R(n,j+1) - L(n,j): bottom edge
// Edge 1: black(n, j), type 0     - R(n,j) - L(n,j): diagonal
// Edge 2: black(n, j), type 2     - R(n,j) - L(n-1,j): left vertical
// Edge 3: black(n-1, j+1), type 1 - R(n-1,j+1) - L(n-1,j): bottom
// Edge 4: black(n-1, j+1), type 0 - R(n-1,j+1) - L(n-1,j+1): diagonal
// Edge 5: black(n-1, j), type 2   - R(n-1,j) - L(n-2,j): left vertical

struct HexEdge {
    blackN: i32,
    blackJ: i32,
    dtype: i32,
}

fn get_hex_edge(n: i32, j: i32, edge_idx: u32) -> HexEdge {
    switch(edge_idx) {
        case 0u: { return HexEdge(n, j + 1, 1); }
        case 1u: { return HexEdge(n, j, 0); }
        case 2u: { return HexEdge(n, j, 2); }
        case 3u: { return HexEdge(n - 1, j + 1, 1); }
        case 4u: { return HexEdge(n - 1, j + 1, 0); }
        case 5u: { return HexEdge(n - 1, j, 2); }
        default: { return HexEdge(0, 0, 0); }
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

    // Chromatic Sweep Check: Only process vertices where (n + j) mod 3 == color_pass
    // Handle negative numbers correctly
    let sum = n + j;
    let mod3 = ((sum % 3) + 3) % 3;
    if (mod3 != params.color_pass) {
        return;
    }

    // Read state of 6 edges around this vertex
    var covered_count: i32 = 0;
    var uncovered_count: i32 = 0;
    var covered: array<u32, 6>;
    var uncovered: array<u32, 6>;

    for (var k: u32 = 0u; k < 6u; k++) {
        let edge = get_hex_edge(n, j, k);
        if (dimer_exists(edge.blackN, edge.blackJ, edge.dtype)) {
            covered[covered_count] = k;
            covered_count++;
        } else {
            uncovered[uncovered_count] = k;
            uncovered_count++;
        }
    }

    // Valid flip requires exactly 3 covered and 3 uncovered edges
    if (covered_count != 3 || uncovered_count != 3) {
        return;
    }

    // Compute volume change
    // For type 0 dimers, volume contribution is based on blackN coordinate
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

    // Compute acceptance probability based on q-bias
    // Volume increase: accept with probability q / (1 + q)
    // Volume decrease: accept with probability 1 / (1 + q)
    var accept_prob: f32;
    if (volume_change > 0) {
        accept_prob = params.q_bias / (1.0 + params.q_bias);
    } else {
        accept_prob = 1.0 / (1.0 + params.q_bias);
    }

    // RNG check
    let rng = get_float_rng(u32(index), params.rand_seed);
    if (rng >= accept_prob) {
        return;
    }

    // Execute the flip: remove covered edges, add uncovered edges
    for (var k: i32 = 0; k < 3; k++) {
        let cov_edge = get_hex_edge(n, j, covered[k]);
        // Clear the covered edge (set to -1 or some sentinel)
        set_dimer(cov_edge.blackN, cov_edge.blackJ, -1);
    }

    for (var k: i32 = 0; k < 3; k++) {
        let uncov_edge = get_hex_edge(n, j, uncovered[k]);
        // Set the new dimer type
        set_dimer(uncov_edge.blackN, uncov_edge.blackJ, uncov_edge.dtype);
    }
}
