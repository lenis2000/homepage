// CFTP (Coupling From The Past) Compute Shader
// Runs one chain (lower or upper) using pre-generated random numbers
// Both chains use identical randoms for coupling

struct CFTPParams {
    minN: i32,
    maxN: i32,
    minJ: i32,
    maxJ: i32,
    strideJ: i32,
    color_pass: i32,    // 0, 1, or 2 for chromatic sweep
    direction: i32,     // -1 for lower chain, +1 for upper chain (unused in coupling)
    num_vertices: u32,  // Total number of vertices for random indexing
}

@group(0) @binding(0) var<storage, read_write> grid: array<i32>;
@group(0) @binding(1) var<storage, read> randoms: array<f32>;
@group(0) @binding(2) var<uniform> params: CFTPParams;

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

// Edge structure for hex edges
struct HexEdge {
    blackN: i32,
    blackJ: i32,
    dtype: i32,
}

// Get hex edge around vertex (n, j) - matches C++ getHexEdgesAroundVertex
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
    let sum = n + j;
    let mod3 = ((sum % 3) + 3) % 3;
    if (mod3 != params.color_pass) {
        return;
    }

    // Get pre-generated random for this vertex
    // Use index as vertex ID for random lookup
    let u = randoms[u32(index) % params.num_vertices];
    let pRemove = 0.5;  // For q=1, probDown = 1/(1+q) = 0.5

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

    // Compute volume change (rotation type)
    // Type 0 dimers contribute their blackN to volume
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

    // Execute the flip: remove covered edges, add uncovered edges
    for (var k: i32 = 0; k < 3; k++) {
        let cov_edge = get_hex_edge(n, j, covered[k]);
        set_dimer(cov_edge.blackN, cov_edge.blackJ, -1);
    }

    for (var k: i32 = 0; k < 3; k++) {
        let uncov_edge = get_hex_edge(n, j, uncovered[k]);
        set_dimer(uncov_edge.blackN, uncov_edge.blackJ, uncov_edge.dtype);
    }
}
