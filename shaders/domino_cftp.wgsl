// Domino CFTP Compute Shader
// GPU algorithm from arXiv-1804.07250v1
//
// Vertex state encoding (4-bit):
//   state = e_N + 2*e_S + 4*e_E + 8*e_W
//   where e_i ∈ {0,1} indicates domino crosses edge i
//
// Key states:
//   3 = horizontal pair (N=1, S=1, E=0, W=0) = 1 + 2 = 3
//   12 = vertical pair (N=0, S=0, E=1, W=1) = 4 + 8 = 12
//
// Rotate operation: 3 ↔ 12 (swap horizontal/vertical)

struct Params {
    minX: i32,
    maxX: i32,
    minY: i32,
    maxY: i32,
    width: i32,
    height: i32,
    color: i32,      // 0=black (x+y even), 1=white (x+y odd)
    diagonal: i32,   // for extremal tiling computation
    numCells: u32,
    _pad1: u32,
    _pad2: u32,
    _pad3: u32,
}

@group(0) @binding(0) var<storage, read_write> grid: array<i32>;
@group(0) @binding(1) var<storage, read> randoms: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;
@group(0) @binding(3) var<storage, read> region: array<u32>;

// Get linear index from (x, y) coordinates
fn get_idx(x: i32, y: i32) -> i32 {
    if (x < params.minX || x > params.maxX || y < params.minY || y > params.maxY) {
        return -1;
    }
    return (y - params.minY) * params.width + (x - params.minX);
}

// Check if cell is in region
fn in_region(x: i32, y: i32) -> bool {
    let idx = get_idx(x, y);
    if (idx < 0 || idx >= i32(params.numCells)) {
        return false;
    }
    // Region is stored as bytes packed into u32
    let byte_idx = u32(idx);
    let word_idx = byte_idx / 4u;
    let byte_offset = byte_idx % 4u;
    if (word_idx >= arrayLength(&region)) {
        return false;
    }
    let word = region[word_idx];
    let byte_val = (word >> (byte_offset * 8u)) & 0xFFu;
    return byte_val != 0u;
}

// Get vertex state at (x, y), returns 0 if out of bounds or not in region
fn get_state(x: i32, y: i32) -> i32 {
    let idx = get_idx(x, y);
    if (idx < 0 || idx >= i32(params.numCells)) {
        return 0;
    }
    if (!in_region(x, y)) {
        return 0;
    }
    return grid[idx];
}

// Set vertex state at (x, y)
fn set_state(x: i32, y: i32, state: i32) {
    let idx = get_idx(x, y);
    if (idx >= 0 && idx < i32(params.numCells) && in_region(x, y)) {
        grid[idx] = state;
    }
}

// ============================================================================
// ROTATE KERNEL
// Flip rotateable vertices (3 ↔ 12) with probability 0.5
// Only processes vertices of specified color
// ============================================================================
@compute @workgroup_size(64)
fn rotate(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = i32(gid.x);
    if (idx >= i32(params.numCells)) {
        return;
    }

    // Compute (x, y) from linear index
    let rel_y = idx / params.width;
    let rel_x = idx % params.width;
    let x = rel_x + params.minX;
    let y = rel_y + params.minY;

    // Check if in region
    if (!in_region(x, y)) {
        return;
    }

    // Check color: black if (x+y) even, white if odd
    let cell_color = ((x + y) % 2 + 2) % 2;  // Handle negative modulo
    if (cell_color != params.color) {
        return;
    }

    let state = grid[idx];

    // Only rotate if state is 3 (horizontal) or 12 (vertical)
    if (state != 3 && state != 12) {
        return;
    }

    // Get random number for this vertex
    let u = randoms[u32(idx) % params.numCells];

    // Rotate with probability 0.5
    if (u < 0.5) {
        if (state == 3) {
            grid[idx] = 12;  // horizontal -> vertical
        } else {
            grid[idx] = 3;   // vertical -> horizontal
        }
    }
}

// ============================================================================
// UPDATE KERNEL (for rotate bind group - needs randoms binding)
// Recompute vertex states from neighbors after rotation
// Based on paper equation 3
// ============================================================================
@compute @workgroup_size(64)
fn update_neighbors(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = i32(gid.x);
    if (idx >= i32(params.numCells)) {
        return;
    }

    // Compute (x, y) from linear index
    let rel_y = idx / params.width;
    let rel_x = idx % params.width;
    let x = rel_x + params.minX;
    let y = rel_y + params.minY;

    if (!in_region(x, y)) {
        return;
    }

    // Only update vertices of opposite color from what was rotated
    let cell_color = ((x + y) % 2 + 2) % 2;
    if (cell_color == params.color) {
        return;
    }

    // Recompute state from 4 neighbors
    // North neighbor (x, y-1) contributes S bit if it has N bit set
    // South neighbor (x, y+1) contributes N bit if it has S bit set
    // East neighbor (x+1, y) contributes W bit if it has E bit set
    // West neighbor (x-1, y) contributes E bit if it has W bit set

    var new_state: i32 = 0;

    let n_state = get_state(x, y - 1);  // North neighbor
    let s_state = get_state(x, y + 1);  // South neighbor
    let e_state = get_state(x + 1, y);  // East neighbor
    let w_state = get_state(x - 1, y);  // West neighbor

    // N bit: set if south neighbor has N bit (bit 0)
    if ((s_state & 1) != 0) {
        new_state |= 1;
    }

    // S bit: set if north neighbor has S bit (bit 1)
    if ((n_state & 2) != 0) {
        new_state |= 2;
    }

    // E bit: set if west neighbor has E bit (bit 2)
    if ((w_state & 4) != 0) {
        new_state |= 4;
    }

    // W bit: set if east neighbor has W bit (bit 3)
    if ((e_state & 8) != 0) {
        new_state |= 8;
    }

    grid[idx] = new_state;
}

// ============================================================================
// EXTREMAL HORIZONTAL KERNEL (MIN tiling)
// Greedy horizontal preference using diagonal sweep
// ============================================================================
@compute @workgroup_size(64)
fn extremal_horizontal(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = i32(gid.x);
    if (idx >= i32(params.numCells)) {
        return;
    }

    // Compute (x, y) from linear index
    let rel_y = idx / params.width;
    let rel_x = idx % params.width;
    let x = rel_x + params.minX;
    let y = rel_y + params.minY;

    if (!in_region(x, y)) {
        return;
    }

    // Only process cells on current diagonal (x + y - minX - minY = diagonal)
    let diag = rel_x + rel_y;
    if (diag != params.diagonal) {
        return;
    }

    // Only process black cells (x+y even) to avoid double counting
    if ((x + y) % 2 != 0) {
        return;
    }

    // Check if already covered
    let current = grid[idx];
    if (current != 0) {
        return;
    }

    // Try horizontal first (prefer MIN = horizontal dominoes)
    // Check if right neighbor exists, is in region, and uncovered
    if (in_region(x + 1, y)) {
        let right_idx = get_idx(x + 1, y);
        if (right_idx >= 0 && grid[right_idx] == 0) {
            // Place horizontal domino
            grid[idx] = 3;  // This cell: N=1, S=1
            grid[right_idx] = 3;  // Right cell: same state
            return;
        }
    }

    // Try vertical if horizontal failed
    if (in_region(x, y + 1)) {
        let down_idx = get_idx(x, y + 1);
        if (down_idx >= 0 && grid[down_idx] == 0) {
            // Place vertical domino
            grid[idx] = 12;  // This cell: E=1, W=1
            grid[down_idx] = 12;  // Down cell: same state
            return;
        }
    }
}

// ============================================================================
// EXTREMAL VERTICAL KERNEL (MAX tiling)
// Greedy vertical preference using diagonal sweep
// ============================================================================
@compute @workgroup_size(64)
fn extremal_vertical(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = i32(gid.x);
    if (idx >= i32(params.numCells)) {
        return;
    }

    // Compute (x, y) from linear index
    let rel_y = idx / params.width;
    let rel_x = idx % params.width;
    let x = rel_x + params.minX;
    let y = rel_y + params.minY;

    if (!in_region(x, y)) {
        return;
    }

    // Only process cells on current diagonal
    let diag = rel_x + rel_y;
    if (diag != params.diagonal) {
        return;
    }

    // Only process black cells (x+y even) to avoid double counting
    if ((x + y) % 2 != 0) {
        return;
    }

    // Check if already covered
    let current = grid[idx];
    if (current != 0) {
        return;
    }

    // Try vertical first (prefer MAX = vertical dominoes)
    if (in_region(x, y + 1)) {
        let down_idx = get_idx(x, y + 1);
        if (down_idx >= 0 && grid[down_idx] == 0) {
            // Place vertical domino
            grid[idx] = 12;
            grid[down_idx] = 12;
            return;
        }
    }

    // Try horizontal if vertical failed
    if (in_region(x + 1, y)) {
        let right_idx = get_idx(x + 1, y);
        if (right_idx >= 0 && grid[right_idx] == 0) {
            // Place horizontal domino
            grid[idx] = 3;
            grid[right_idx] = 3;
            return;
        }
    }
}
