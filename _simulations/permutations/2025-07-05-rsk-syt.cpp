/*
Compiles into a WebAssembly module that generates a random permutation
based on a user-drawn Young diagram shape.

Core logic:
1. Receives a Young diagram shape (a partition) from JavaScript.
2. Generates two independent, uniformly random Standard Young Tableaux (SYT)
   of that shape using the hook walk algorithm.
3. Applies the inverse-RSK algorithm to the two SYT to get a permutation.
4. Exposes the permutation data to be visualized by JavaScript.

Build command:
emcc 2025-07-05-rsk-syt.cpp -o 2025-07-05-rsk-syt.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_generatePermutation', '_getPermutationData', '_getPermutationSize']" \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_MEMORY=134217728 \
    -O3 \
    -s SINGLE_FILE=1 \
    && mv 2025-07-05-rsk-syt.js ../../js/
*/

#include <emscripten/emscripten.h>
#include <vector>
#include <random>
#include <numeric>
#include <algorithm>
#include <map>

// Global storage
static std::vector<int> permutation;
static int permutationSize = 0;
static std::mt19937 rng(std::random_device{}());

// Type alias for a Tableau/Shape
using Tableau = std::vector<std::vector<int>>;
using Shape = std::vector<int>;

// Checks if (r, c) is a removable corner of a given shape.
bool is_corner(int r, int c, const Shape& shape) {
    if (r >= shape.size() || c >= shape[r]) return false;
    bool is_row_end = (c == shape[r] - 1);
    bool is_col_end = (r == shape.size() - 1 || c >= shape[r + 1]);
    return is_row_end && is_col_end;
}

// Gets all cells in the hook of (r, c) for a given shape.
std::vector<std::pair<int, int>> get_hook(int r, int c, const Shape& shape) {
    std::vector<std::pair<int, int>> hook_cells;
    // Right arm
    for (int j = c + 1; j < shape[r]; ++j) {
        hook_cells.push_back({r, j});
    }
    // Bottom leg
    for (int i = r + 1; i < shape.size(); ++i) {
        if (c < shape[i]) {
            hook_cells.push_back({i, c});
        }
    }
    hook_cells.push_back({r, c}); // include the cell itself
    return hook_cells;
}

// Generates a random Standard Young Tableau of a given shape using the hook walk.
Tableau generateSYT(Shape shape) {
    int n = std::accumulate(shape.begin(), shape.end(), 0);
    Tableau tableau(shape.size());
    for(size_t i = 0; i < shape.size(); ++i) {
        tableau[i].resize(shape[i], 0);
    }

    Shape current_shape = shape;

    for (int k = n; k > 0; --k) {
        // 1. Get all cells in the current diagram
        std::vector<std::pair<int, int>> cells;
        for(size_t r = 0; r < current_shape.size(); ++r) {
            for(int c = 0; c < current_shape[r]; ++c) {
                cells.push_back({r, c});
            }
        }

        // 2. Pick a starting cell for the walk uniformly at random
        std::uniform_int_distribution<int> dist(0, cells.size() - 1);
        std::pair<int, int> current_cell = cells[dist(rng)];

        // 3. Perform the hook walk until a corner is reached
        while (!is_corner(current_cell.first, current_cell.second, current_shape)) {
            auto hook = get_hook(current_cell.first, current_cell.second, current_shape);
            std::uniform_int_distribution<int> hook_dist(0, hook.size() - 1);
            current_cell = hook[hook_dist(rng)];
        }

        // 4. Place k in the corner and update the shape
        int r = current_cell.first;
        int c = current_cell.second;
        tableau[r][c] = k;
        current_shape[r]--;
        if (current_shape[r] == 0) {
            current_shape.erase(current_shape.begin() + r);
        }
    }
    return tableau;
}

// Performs one step of reverse row insertion (un-bumping).
int reverse_row_insert(Tableau& p, int r, int val) {
    // Base case: If we are above the top row, the value is ejected from the tableau.
    if (r < 0) {
        return val;
    }

    // Find the largest element in the row that is strictly smaller than val.
    int swap_idx = -1;
    for (size_t i = 0; i < p[r].size(); ++i) {
        if (p[r][i] < val) {
            swap_idx = i;
        } else {
            break;
        }
    }

    // If no such element exists, val is smaller than all elements in this row.
    // This case should not happen with valid SYT inputs.
    // However, if it did, the value would be ejected from this position.
    if (swap_idx == -1) {
       return reverse_row_insert(p, r - 1, val);
    }
    
    // Swap val with the found element and recurse.
    int ejected_val = p[r][swap_idx];
    p[r][swap_idx] = val;

    return reverse_row_insert(p, r - 1, ejected_val);
}

// Computes the inverse RSK algorithm on two SYT P and Q.
std::vector<int> rskInverse(Tableau p_orig, Tableau q_orig) {
    Tableau p = p_orig; // Work on copies
    Tableau q = q_orig;

    int n = 0;
    for(const auto& row : p) n += row.size();
    if (n == 0) return {};
    
    std::vector<int> pi(n);

    for (int k = n; k > 0; --k) {
        // 1. Find the position of k in Q
        int r_k = -1, c_k = -1;
        for (size_t i = 0; i < q.size(); ++i) {
            if (!q[i].empty()) {
                for (size_t j = 0; j < q[i].size(); ++j) {
                    if (q[i][j] == k) {
                        r_k = i;
                        c_k = j;
                        break;
                    }
                }
            }
            if (r_k != -1) break;
        }
        
        // 2. The value at the same position in P is the value to be un-bumped.
        int val_to_unbump = p[r_k][c_k];
        
        // 3. Remove this cell's value from P for the un-bumping process.
        // The cell itself is removed from the structure of the tableau.
        p[r_k].erase(p[r_k].begin() + c_k);

        // 4. Perform the un-bumping process starting from the row above.
        int x = reverse_row_insert(p, r_k - 1, val_to_unbump);
        
        // 5. We found a pair of the permutation: pi(x) = k
        pi[x - 1] = k;
    }
    return pi;
}

EMSCRIPTEN_KEEPALIVE
extern "C" void generatePermutation(int* shape_ptr, int shape_len) {
    Shape shape(shape_ptr, shape_ptr + shape_len);
    
    // Ensure shape is a valid partition (non-increasing)
    for (size_t i = 0; i < shape.size() - 1; ++i) {
        if (shape[i] < shape[i+1]) {
            // Invalid shape, clear previous result and return
            permutation.clear();
            permutationSize = 0;
            return;
        }
    }

    // Generate two independent random SYT
    Tableau P = generateSYT(shape);
    Tableau Q = generateSYT(shape);
    
    // Apply the corrected inverse RSK algorithm
    permutation = rskInverse(P, Q);
    permutationSize = permutation.size();
}

EMSCRIPTEN_KEEPALIVE
extern "C" int* getPermutationData() {
    return permutation.data();
}

EMSCRIPTEN_KEEPALIVE
extern "C" int getPermutationSize() {
    return permutationSize;
}

// Required dummy main
int main() {
    return 0;
}