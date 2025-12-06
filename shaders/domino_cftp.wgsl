// Domino CFTP Compute Shader - Face-Based Algorithm
// GPU algorithm from arXiv-1804.07250v1
//
// Data structure: Edge-based encoding
//   Each cell stores 2 bits: bit 0 = horizontal edge to right, bit 1 = vertical edge upward
//   grid[y*width + x] = (h_edge << 0) | (v_edge << 1)
//
// Face-based operations:
//   Face (fx, fy) is the 2x2 plaquette with corners at (fx,fy), (fx+1,fy), (fx,fy+1), (fx+1,fy+1)
//   Face state 1: horizontal pair (top and bottom edges covered)
//   Face state 2: vertical pair (left and right edges covered)
//   Face state 0: not flippable
//
// 4-color chromatic sweep: faces with color (fx%2)*2 + (fy%2) don't share vertices

struct Params {
    minX: i32,
    maxX: i32,
    minY: i32,
    maxY: i32,
    width: i32,
    height: i32,
    color_pass: i32,    // 0-3 for 4-color sweep
    diagonal: i32,      // for extremal tiling computation
    numCells: u32,
    numFaces: u32,
    _pad1: u32,
    _pad2: u32,
}

@group(0) @binding(0) var<storage, read_write> grid: array<i32>;
@group(0) @binding(1) var<storage, read> randoms: array<f32>;
@group(0) @binding(2) var<uniform> params: Params;
@group(0) @binding(3) var<storage, read> region: array<u32>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get linear index from (x, y) coordinates
fn cell_idx(x: i32, y: i32) -> i32 {
    if (x < params.minX || x > params.maxX || y < params.minY || y > params.maxY) {
        return -1;
    }
    return (y - params.minY) * params.width + (x - params.minX);
}

// Check if cell is in region
fn in_region(x: i32, y: i32) -> bool {
    let idx = cell_idx(x, y);
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

// Check if all 4 corners of a face are in region
fn face_in_region(fx: i32, fy: i32) -> bool {
    return in_region(fx, fy) && in_region(fx + 1, fy) &&
           in_region(fx, fy + 1) && in_region(fx + 1, fy + 1);
}

// ============================================================================
// EDGE ACCESS FUNCTIONS
// Edge convention: horizontal edge at (x,y) connects (x,y) to (x+1,y), stored at cell (x,y) bit 0
//                  vertical edge at (x,y) connects (x,y) to (x,y+1), stored at cell (x,y) bit 1
// ============================================================================

fn has_horizontal_edge(x: i32, y: i32) -> bool {
    let idx = cell_idx(x, y);
    if (idx < 0 || u32(idx) >= params.numCells) { return false; }
    return (grid[idx] & 1) != 0;
}

fn has_vertical_edge(x: i32, y: i32) -> bool {
    let idx = cell_idx(x, y);
    if (idx < 0 || u32(idx) >= params.numCells) { return false; }
    return (grid[idx] & 2) != 0;
}

fn set_horizontal_edge(x: i32, y: i32) {
    let idx = cell_idx(x, y);
    if (idx >= 0 && u32(idx) < params.numCells) {
        grid[idx] = grid[idx] | 1;
    }
}

fn clear_horizontal_edge(x: i32, y: i32) {
    let idx = cell_idx(x, y);
    if (idx >= 0 && u32(idx) < params.numCells) {
        grid[idx] = grid[idx] & (~1);
    }
}

fn set_vertical_edge(x: i32, y: i32) {
    let idx = cell_idx(x, y);
    if (idx >= 0 && u32(idx) < params.numCells) {
        grid[idx] = grid[idx] | 2;
    }
}

fn clear_vertical_edge(x: i32, y: i32) {
    let idx = cell_idx(x, y);
    if (idx >= 0 && u32(idx) < params.numCells) {
        grid[idx] = grid[idx] & (~2);
    }
}

// Check if a cell is covered by any domino
fn is_covered(x: i32, y: i32) -> bool {
    // A cell is covered if ANY of its 4 edges has a domino
    // Right edge at (x, y), Left edge at (x-1, y),
    // Top edge at (x, y), Bottom edge at (x, y-1)
    return has_horizontal_edge(x, y) ||      // right edge (domino to right)
           has_horizontal_edge(x - 1, y) ||  // left edge (domino from left)
           has_vertical_edge(x, y) ||        // top edge (domino upward)
           has_vertical_edge(x, y - 1);      // bottom edge (domino from below)
}

// ============================================================================
// FACE OPERATIONS
// Face (fx, fy) has corners at (fx, fy), (fx+1, fy), (fx, fy+1), (fx+1, fy+1)
// Top edge: horizontal at (fx, fy+1) - but we need edge FROM (fx, fy+1) so check has_horizontal_edge(fx, fy+1)
// Bottom edge: horizontal at (fx, fy)
// Left edge: vertical at (fx, fy)
// Right edge: vertical at (fx+1, fy)
// ============================================================================

fn get_face_state(fx: i32, fy: i32) -> i32 {
    // Check which edges of the face are covered by dominoes
    let hasTop = has_horizontal_edge(fx, fy + 1);    // horizontal edge at top
    let hasBot = has_horizontal_edge(fx, fy);        // horizontal edge at bottom
    let hasLeft = has_vertical_edge(fx, fy);         // vertical edge at left
    let hasRight = has_vertical_edge(fx + 1, fy);    // vertical edge at right

    // State 1: horizontal pair (top and bottom edges covered, left and right free)
    if (hasTop && hasBot && !hasLeft && !hasRight) { return 1; }
    // State 2: vertical pair (left and right edges covered, top and bottom free)
    if (!hasTop && !hasBot && hasLeft && hasRight) { return 2; }
    // State 0: not flippable (mixed configuration)
    return 0;
}

fn flip_face(fx: i32, fy: i32, state: i32) {
    if (state == 1) {
        // horizontal → vertical
        clear_horizontal_edge(fx, fy + 1);  // remove top edge
        clear_horizontal_edge(fx, fy);      // remove bottom edge
        set_vertical_edge(fx, fy);          // add left edge
        set_vertical_edge(fx + 1, fy);      // add right edge
    } else if (state == 2) {
        // vertical → horizontal
        clear_vertical_edge(fx, fy);        // remove left edge
        clear_vertical_edge(fx + 1, fy);    // remove right edge
        set_horizontal_edge(fx, fy + 1);    // add top edge
        set_horizontal_edge(fx, fy);        // add bottom edge
    }
}

// ============================================================================
// CFTP STEP KERNEL
// 4-color chromatic sweep: process faces of one color at a time
// Color = (fx%2)*2 + (fy%2) ensures no two same-color faces share vertices
// ============================================================================
@compute @workgroup_size(64)
fn cftp_step(@builtin(global_invocation_id) gid: vec3<u32>) {
    let face_idx = i32(gid.x);
    if (u32(face_idx) >= params.numFaces) {
        return;
    }

    // Convert linear face index to face coordinates
    // Face grid is (width-1) x (height-1)
    let face_width = params.width - 1;
    let face_height = params.height - 1;
    if (face_width <= 0 || face_height <= 0) {
        return;
    }

    let rel_fy = face_idx / face_width;
    let rel_fx = face_idx % face_width;
    let fx = rel_fx + params.minX;
    let fy = rel_fy + params.minY;

    // 4-color chromatic sweep: only process faces of current color
    let fx_mod = ((fx % 2) + 2) % 2;  // Handle negative modulo
    let fy_mod = ((fy % 2) + 2) % 2;
    let face_color = fx_mod * 2 + fy_mod;
    if (face_color != params.color_pass) {
        return;
    }

    // Check if face is interior (all 4 corners in region)
    if (!face_in_region(fx, fy)) {
        return;
    }

    let state = get_face_state(fx, fy);
    if (state == 0) {
        return;  // Not flippable
    }

    // Get random for monotone coupling
    let u = randoms[gid.x % params.numFaces];

    // CFTP coupling rule:
    // state 1 (horizontal) corresponds to LOWER heights (MIN)
    // state 2 (vertical) corresponds to HIGHER heights (MAX)
    // u < 0.5 → prefer horizontal (MIN direction)
    // u >= 0.5 → prefer vertical (MAX direction)

    var should_flip = false;
    if (u < 0.5 && state == 2) {
        // Currently vertical, random wants horizontal → flip
        should_flip = true;
    } else if (u >= 0.5 && state == 1) {
        // Currently horizontal, random wants vertical → flip
        should_flip = true;
    }

    if (should_flip) {
        flip_face(fx, fy, state);
    }
}

// ============================================================================
// EXTREMAL HORIZONTAL KERNEL (MIN tiling)
// Greedy horizontal preference using diagonal sweep
// Processes ALL cells on current diagonal and prefers horizontal dominoes
// ============================================================================
@compute @workgroup_size(64)
fn extremal_min(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = i32(gid.x);
    if (u32(idx) >= params.numCells) {
        return;
    }

    // Compute (x, y) from linear index
    let rel_y = idx / params.width;
    let rel_x = idx % params.width;
    let x = rel_x + params.minX;
    let y = rel_y + params.minY;

    // Only process cells on current diagonal
    let diag = rel_x + rel_y;
    if (diag != params.diagonal) {
        return;
    }

    // Process ALL cells (not just black) - diagonal sweep ensures no conflicts
    // since dominoes go to higher diagonals

    if (!in_region(x, y)) {
        return;
    }

    // Check if already covered
    if (is_covered(x, y)) {
        return;
    }

    // Try horizontal first (prefer MIN = horizontal dominoes)
    // Check if right neighbor exists, is in region, and uncovered
    if (in_region(x + 1, y) && !is_covered(x + 1, y)) {
        // Place horizontal domino: edge from (x,y) to (x+1,y)
        set_horizontal_edge(x, y);
        return;
    }

    // Try vertical if horizontal failed
    if (in_region(x, y + 1) && !is_covered(x, y + 1)) {
        // Place vertical domino: edge from (x,y) to (x,y+1)
        set_vertical_edge(x, y);
        return;
    }
}

// ============================================================================
// EXTREMAL VERTICAL KERNEL (MAX tiling)
// Greedy vertical preference using diagonal sweep
// Processes ALL cells on current diagonal and prefers vertical dominoes
// ============================================================================
@compute @workgroup_size(64)
fn extremal_max(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = i32(gid.x);
    if (u32(idx) >= params.numCells) {
        return;
    }

    // Compute (x, y) from linear index
    let rel_y = idx / params.width;
    let rel_x = idx % params.width;
    let x = rel_x + params.minX;
    let y = rel_y + params.minY;

    // Only process cells on current diagonal
    let diag = rel_x + rel_y;
    if (diag != params.diagonal) {
        return;
    }

    // Process ALL cells (not just black) - diagonal sweep ensures no conflicts
    // since dominoes go to higher diagonals

    if (!in_region(x, y)) {
        return;
    }

    // Check if already covered
    if (is_covered(x, y)) {
        return;
    }

    // Try vertical first (prefer MAX = vertical dominoes)
    if (in_region(x, y + 1) && !is_covered(x, y + 1)) {
        // Place vertical domino: edge from (x,y) to (x,y+1)
        set_vertical_edge(x, y);
        return;
    }

    // Try horizontal if vertical failed
    if (in_region(x + 1, y) && !is_covered(x + 1, y)) {
        // Place horizontal domino: edge from (x,y) to (x+1,y)
        set_horizontal_edge(x, y);
        return;
    }
}

// ============================================================================
// CLEAR GRID KERNEL
// Reset all edges to 0
// ============================================================================
@compute @workgroup_size(64)
fn clear_grid(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    if (idx >= params.numCells) {
        return;
    }
    grid[idx] = 0;
}

// ============================================================================
// COALESCENCE CHECK KERNEL (uses separate bind group)
// Compares two grids and atomically counts differences
// Only compares edge bits (bits 0 and 1)
// ============================================================================
@group(1) @binding(0) var<storage, read> grid_lower: array<i32>;
@group(1) @binding(1) var<storage, read> grid_upper: array<i32>;
@group(1) @binding(2) var<storage, read_write> diff_count: atomic<u32>;

@compute @workgroup_size(256)
fn check_coalescence(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    if (idx >= params.numCells) {
        return;
    }

    // Compare only edge bits (bits 0 and 1)
    let lower_val = grid_lower[idx] & 3;
    let upper_val = grid_upper[idx] & 3;

    if (lower_val != upper_val) {
        atomicAdd(&diff_count, 1u);
    }
}
