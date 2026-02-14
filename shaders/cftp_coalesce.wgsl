// GPU-side coalescence check for CFTP
// Compares two grid buffers and atomically counts differences
// Returns diff_count = 0 if grids are identical (coalesced)

@group(0) @binding(0) var<storage, read> grid_a: array<i32>;
@group(0) @binding(1) var<storage, read> grid_b: array<i32>;
@group(0) @binding(2) var<storage, read_write> result: atomic<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let index = GlobalInvocationID.x;
    if (index >= arrayLength(&grid_a)) {
        return;
    }

    if (grid_a[index] != grid_b[index]) {
        atomicAdd(&result, 1u);
    }
}
