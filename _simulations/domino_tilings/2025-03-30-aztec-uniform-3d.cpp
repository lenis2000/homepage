/*

emcc 2025-03-29-aztec-uniform-3d.cpp -o 2025-03-29-aztec-uniform-3d.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv 2025-03-29-aztec-uniform-3d.js ../../js/

Note: When testing locally, serve these files over HTTP rather than via file://.
*/

#include <emscripten.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <random>
#include <chrono>
#include <sstream>
#include <string>
#include <tuple>
#include <ctime>
#include <cstdlib>
#include <cstring>
#include <queue>
#include <set>
#include <map>
#include <climits>

using namespace std;

static std::mt19937 rng(std::random_device{}()); // Global RNG for speed

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

struct Cell {
    double value;
    int flag;
};

// Structure to represent a vertex position in the grid
struct Vertex {
    int i, j;
    Vertex(int _i, int _j) : i(_i), j(_j) {}
    bool operator<(const Vertex& other) const {
        return i < other.i || (i == other.i && j < other.j);
    }
    bool operator==(const Vertex& other) const {
        return i == other.i && j == other.j;
    }
};

using Matrix = vector<vector<Cell>>;
using MatrixDouble = vector<vector<double>>;
using MatrixInt = vector<vector<int>>;

// Forward declaration for helper function
int computeHeightChange(const MatrixInt& dominoConfig, const Vertex& from, int direction);

// d3p: builds a vector of matrices from x1.
vector<Matrix> d3p(const MatrixDouble &x1) {
    int n = (int)x1.size();
    Matrix A(n, vector<Cell>(n));
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            // Use bitwise & for mod 2 replacement when applicable
            A[i][j] = (fabs(x1[i][j]) < 1e-9) ? Cell{1.0, 1} : Cell{x1[i][j], 0};
        }
    }
    vector<Matrix> AA;
    AA.push_back(A);

    int iterations = n / 2 - 1; // Assumes n is even.
    for (int k = 0; k < iterations; k++){
        int nk = n - 2 * k - 2;
        Matrix C(nk, vector<Cell>(nk));
        Matrix &prev = AA[k];
        for (int i = 0; i < nk; i++){
            for (int j = 0; j < nk; j++){
                int ii = i + 2 * (i & 1);  // instead of i % 2
                int jj = j + 2 * (j & 1);  // instead of j % 2
                const Cell &current = prev[ii][jj];
                const Cell &diag    = prev[i + 1][j + 1];
                const Cell &right   = prev[ii][j + 1];
                const Cell &down    = prev[i + 1][jj];
                double sum1 = current.flag + diag.flag;
                double sum2 = right.flag + down.flag;
                double a2, a2_second;
                if (fabs(sum1 - sum2) < 1e-9) {
                    a2 = current.value * diag.value + right.value * down.value;
                    a2_second = sum1;
                } else if (sum1 < sum2) {
                    a2 = current.value * diag.value;
                    a2_second = sum1;
                } else {
                    a2 = right.value * down.value;
                    a2_second = sum2;
                }
                if (fabs(a2) < 1e-9) a2 = 1e-9;
                C[i][j] = { current.value / a2, current.flag - static_cast<int>(a2_second) };
            }
        }
        AA.push_back(C);
    }
    return AA;
}

// probs2: compute probability matrices from the d3p output.
vector<MatrixDouble> probs2(const MatrixDouble &x1) {
    vector<Matrix> a0 = d3p(x1);
    int n = (int)a0.size();
    vector<MatrixDouble> A;
    for (int k = 0; k < n; k++){
        Matrix &mat = a0[n - k - 1];
        int nk = (int)mat.size();
        int rows = nk / 2;
        MatrixDouble C(rows, vector<double>(rows, 0.0));
        for (int i = 0; i < rows; i++){
            for (int j = 0; j < rows; j++){
                int i0 = i << 1;  // 2*i
                int j0 = j << 1;  // 2*j
                int sum1 = mat[i0][j0].flag + mat[i0 + 1][j0 + 1].flag;
                int sum2 = mat[i0 + 1][j0].flag + mat[i0][j0 + 1].flag;
                if (sum1 > sum2) {
                    C[i][j] = 0.0;
                } else if (sum1 < sum2) {
                    C[i][j] = 1.0;
                } else {
                    double prod_main  = mat[i0 + 1][j0 + 1].value * mat[i0][j0].value;
                    double prod_other = mat[i0 + 1][j0].value * mat[i0][j0 + 1].value;
                    double denom = prod_main + prod_other;
                    if (fabs(denom) < 1e-9) denom = 1e-9;
                    C[i][j] = prod_main / denom;
                }
            }
        }
        A.push_back(C);
    }
    return A;
}

// delslide: deletion-slide procedure.
MatrixInt delslide(const MatrixInt &x1) {
    int n = (int)x1.size();
    MatrixInt a0(n + 2, vector<int>(n + 2, 0));
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            a0[i + 1][j + 1] = x1[i][j];
        }
    }
    int half = n / 2;
    for (int i = 0; i < half; i++){
        for (int j = 0; j < half; j++){
            int i2 = i << 1, j2 = j << 1;
            if (a0[i2][j2] == 1 && a0[i2 + 1][j2 + 1] == 1) {
                a0[i2][j2] = 0;
                a0[i2 + 1][j2 + 1] = 0;
            } else if (a0[i2][j2 + 1] == 1 && a0[i2 + 1][j2] == 1) {
                a0[i2 + 1][j2] = 0;
                a0[i2][j2 + 1] = 0;
            }
        }
    }
    for (int i = 0; i < half + 1; i++){
        for (int j = 0; j < half + 1; j++){
            int i2 = i << 1, j2 = j << 1;
            if (a0[i2 + 1][j2 + 1] == 1) {
                a0[i2][j2] = 1;
                a0[i2 + 1][j2 + 1] = 0;
            } else if (a0[i2][j2] == 1) {
                a0[i2][j2] = 0;
                a0[i2 + 1][j2 + 1] = 1;
            } else if (a0[i2 + 1][j2] == 1) {
                a0[i2][j2 + 1] = 1;
                a0[i2 + 1][j2] = 0;
            } else if (a0[i2][j2 + 1] == 1) {
                a0[i2 + 1][j2] = 1;
                a0[i2][j2 + 1] = 0;
            }
        }
    }
    return a0;
}

// create: decide domino orientation in each 2x2 block using probabilities.
MatrixInt create(MatrixInt x0, const MatrixDouble &p) {
    int n = (int)x0.size();
    int half = n / 2;
    for (int i = 0; i < half; i++){
        for (int j = 0; j < half; j++){
            int i2 = i << 1, j2 = j << 1;
            if (x0[i2][j2] == 0 && x0[i2 + 1][j2] == 0 &&
                x0[i2][j2 + 1] == 0 && x0[i2 + 1][j2 + 1] == 0) {
                bool a1 = true, a2 = true, a3 = true, a4 = true;
                if (j > 0)
                    a1 = (x0[i2][j2 - 1] == 0) && (x0[i2 + 1][j2 - 1] == 0);
                if (j < half - 1)
                    a2 = (x0[i2][j2 + 2] == 0) && (x0[i2 + 1][j2 + 2] == 0);
                if (i > 0)
                    a3 = (x0[i2 - 1][j2] == 0) && (x0[i2 - 1][j2 + 1] == 0);
                if (i < half - 1)
                    a4 = (x0[i2 + 2][j2] == 0) && (x0[i2 + 2][j2 + 1] == 0);
                if (a1 && a2 && a3 && a4) {
                    std::uniform_real_distribution<> dis(0.0, 1.0);
                    double r = dis(rng);
                    if (r < p[i][j]) {
                        x0[i2][j2] = 1;
                        x0[i2 + 1][j2 + 1] = 1;
                    } else {
                        x0[i2 + 1][j2] = 1;
                        x0[i2][j2 + 1] = 1;
                    }
                }
            }
        }
    }
    return x0;
}

// aztecgen: iterate deletion-slide and creation steps.
MatrixInt aztecgen(const vector<MatrixDouble> &x0) {
    int n = (int)x0.size();
    std::uniform_real_distribution<> dis(0.0, 1.0);
    MatrixInt a1;
    // Initialize with a 2x2 configuration using the first probability.
    if (dis(rng) < x0[0][0][0])
        a1 = { {1, 0}, {0, 1} };
    else
        a1 = { {0, 1}, {1, 0} };
    int totalIterations = n - 1;
    for (int i = 0; i < totalIterations; i++){
        a1 = delslide(a1);
        a1 = create(a1, x0[i + 1]);
        // Update progress: scale from 10 to 90 over these iterations.
        progressCounter = 10 + (int)(((double)(i + 1) / totalIterations) * 70);
        emscripten_sleep(0); // Yield control so that progress updates are visible.
    }
    return a1;
}

// Calculate height function for a given domino configuration
// The height function is defined on vertices, and the calculation begins
// from a reference vertex with height 0, then propagates to other vertices
std::map<Vertex, int> computeHeightFunction(const MatrixInt& dominoConfig) {
    int size = dominoConfig.size();
    // We need a slightly larger grid for vertices
    int vertexSize = size + 1;

    // Initialize heights
    std::map<Vertex, int> heights;

    // Find the bottom-left corner of the Aztec diamond (or start from a designated corner)
    int startI = 0, startJ = size / 2;
    while (startJ > 0 && startJ < size && dominoConfig[0][startJ-1] == 0) startJ--;
    Vertex startVertex(startI, startJ);

    // Set the height of the starting vertex to 0
    heights[startVertex] = 0;

    // BFS to compute heights
    std::queue<Vertex> q;
    std::set<Vertex> visited;
    q.push(startVertex);
    visited.insert(startVertex);

    // Directions: right, up, left, down
    int di[] = {0, 1, 0, -1};
    int dj[] = {1, 0, -1, 0};

    while (!q.empty()) {
        progressCounter = 80 + (int)((float)heights.size() / (float)(vertexSize * vertexSize) * 15);
        Vertex current = q.front();
        q.pop();

        // Process each neighboring vertex
        for (int d = 0; d < 4; d++) {
            int newI = current.i + di[d];
            int newJ = current.j + dj[d];

            // Check if the new vertex is within bounds
            if (newI < 0 || newI >= vertexSize || newJ < 0 || newJ >= vertexSize) {
                continue;
            }

            Vertex next(newI, newJ);

            // If we've already visited this vertex, skip
            if (visited.find(next) != visited.end()) {
                continue;
            }

            // Calculate height change
            int heightChange = 0;

            // Edge between (i,j) and (i,j+1) - horizontal edge
            if (d == 0) {  // Moving right
                // Check if the square below this edge is in the Aztec diamond and has a domino
                if (current.i > 0 && current.j < size && current.i - 1 < size && current.j < size && dominoConfig[current.i-1][current.j] > 0) {
                    // This is a black square (assuming checkerboard coloring)
                    if ((current.i + current.j) % 2 == 0) {
                        heightChange = 1;
                    } else {
                        heightChange = -1;
                    }
                } else {
                    // No domino or outside the Aztec diamond
                    if ((current.i + current.j) % 2 == 0) {
                        heightChange = -1;
                    } else {
                        heightChange = 1;
                    }
                }
            }
            // Edge between (i,j) and (i+1,j) - vertical edge
            else if (d == 1) {  // Moving up
                // Check if the square to the left of this edge is in the Aztec diamond and has a domino
                if (current.i < size && current.j > 0 && current.i < size && current.j - 1 < size && dominoConfig[current.i][current.j-1] > 0) {
                    // This is a black square (assuming checkerboard coloring)
                    if ((current.i + current.j) % 2 == 0) {
                        heightChange = -1;
                    } else {
                        heightChange = 1;
                    }
                } else {
                    // No domino or outside the Aztec diamond
                    if ((current.i + current.j) % 2 == 0) {
                        heightChange = 1;
                    } else {
                        heightChange = -1;
                    }
                }
            }
            // Use symmetry for the other directions
            else if (d == 2) {  // Moving left (opposite of right)
                if (next.i > 0 && next.j < size && next.i - 1 < size && next.j < size && dominoConfig[next.i-1][next.j] > 0) {
                    // Square below has a domino
                    if ((next.i + next.j) % 2 == 0) {
                        heightChange = -1;
                    } else {
                        heightChange = 1;
                    }
                } else {
                    // No domino or outside
                    if ((next.i + next.j) % 2 == 0) {
                        heightChange = 1;
                    } else {
                        heightChange = -1;
                    }
                }
            }
            else if (d == 3) {  // Moving down (opposite of up)
                if (next.i < size && next.j > 0 && next.i < size && next.j - 1 < size && dominoConfig[next.i][next.j-1] > 0) {
                    // Square to the left has a domino
                    if ((next.i + next.j) % 2 == 0) {
                        heightChange = 1;
                    } else {
                        heightChange = -1;
                    }
                } else {
                    // No domino or outside
                    if ((next.i + next.j) % 2 == 0) {
                        heightChange = -1;
                    } else {
                        heightChange = 1;
                    }
                }
            }

            // Set the height of the next vertex
            heights[next] = heights[current] + heightChange;

            // Add to the queue for further propagation
            q.push(next);
            visited.insert(next);
        }
    }

    return heights;
}

// Helper function to compute height change when moving in a direction
int computeHeightChange(const MatrixInt& dominoConfig, const Vertex& from, int direction) {
    int size = dominoConfig.size();

    // Direction: 0 = right, 1 = up
    if (direction == 0) {  // Moving right
        if (from.i > 0 && from.j < size && dominoConfig[from.i-1][from.j] > 0) {
            // Square below has a domino
            if ((from.i + from.j) % 2 == 0) {
                return 1;
            } else {
                return -1;
            }
        } else {
            // No domino or outside
            if ((from.i + from.j) % 2 == 0) {
                return -1;
            } else {
                return 1;
            }
        }
    } else if (direction == 1) {  // Moving up
        if (from.i < size && from.j > 0 && dominoConfig[from.i][from.j-1] > 0) {
            // Square to the left has a domino
            if ((from.i + from.j) % 2 == 0) {
                return -1;
            } else {
                return 1;
            }
        } else {
            // No domino or outside
            if ((from.i + from.j) % 2 == 0) {
                return 1;
            } else {
                return -1;
            }
        }
    }

    return 0;
}

// ---------------------------------------------------------------------
// simulateAztec
//
// Exported function callable from JavaScript.
// It creates a 2*n x 2*n weight matrix, runs the simulation,
// and returns a JSON string with domino placements and height function.
// ---------------------------------------------------------------------
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n) {
    progressCounter = 0; // Reset progress.

    // Create weight matrix A1a: dimensions 2*n x 2*n, filled with ones.
    int dim = 2 * n;
    MatrixDouble A1a(dim, vector<double>(dim, 1.0));

    // Compute probability matrices.
    vector<MatrixDouble> prob = probs2(A1a);
    progressCounter = 10; // Probabilities computed.

    // Generate domino configuration.
    MatrixInt dominoConfig = aztecgen(prob);
    progressCounter = 80; // Simulation steps complete.

    // Compute the height function
    std::map<Vertex, int> heightFunction = computeHeightFunction(dominoConfig);

    // Find the min and max height values to normalize the 3D display
    int minHeight = INT_MAX;
    int maxHeight = INT_MIN;
    for (const auto& pair : heightFunction) {
        minHeight = std::min(minHeight, pair.second);
        maxHeight = std::max(maxHeight, pair.second);
    }

    // Build JSON output for dominoes and height function
    int size = (int)dominoConfig.size();
    double scale = 10.0;
    ostringstream oss;

    // Start the JSON object and dominoes array
    oss << "{\"dominoes\":[";

    // Add dominoes to the JSON
    bool first = true;
    for (int i = 0; i < size; i++){
        for (int j = 0; j < size; j++){
            if (dominoConfig[i][j] == 1) {
                double x, y, w, h;
                string color;
                if ((i & 1) && (j & 1)) { // i odd, j odd: Green
                    color = "green";
                    x = j - i - 2;
                    y = size + 1 - (i + j) - 1;
                    w = 4;
                    h = 2;
                } else if ((i & 1) && !(j & 1)) { // i odd, j even: Blue
                    color = "blue";
                    x = j - i - 1;
                    y = size + 1 - (i + j) - 2;
                    w = 2;
                    h = 4;
                } else if (!(i & 1) && !(j & 1)) { // i even, j even: Red
                    color = "red";
                    x = j - i - 2;
                    y = size + 1 - (i + j) - 1;
                    w = 4;
                    h = 2;
                } else if (!(i & 1) && (j & 1)) { // i even, j odd: Yellow
                    color = "yellow";
                    x = j - i - 1;
                    y = size + 1 - (i + j) - 2;
                    w = 2;
                    h = 4;
                } else {
                    continue;
                }
                x *= scale;
                y *= scale;
                w *= scale;
                h *= scale;
                if (!first) oss << ",";
                else first = false;
                oss << "{\"x\":" << x << ",\"y\":" << y
                    << ",\"w\":" << w << ",\"h\":" << h
                    << ",\"color\":\"" << color << "\"}";
            }
        }
    }

    // Close dominoes array and start heightFunction array
    oss << "],\"heightFunction\":[";

    // Add height function vertices to the JSON
    first = true;
    for (const auto& pair : heightFunction) {
        int i = pair.first.i;
        int j = pair.first.j;
        double x = (j - i) * scale;
        double y = (size - (i + j)) * scale;
        double z = (pair.second - minHeight) * scale * 0.5; // Scale the height for visualization

        if (!first) oss << ",";
        else first = false;

        oss << "{\"x\":" << x << ",\"y\":" << y << ",\"z\":" << z << "}";
    }

    // Close the heightFunction array and the JSON object
    oss << "]}";

    progressCounter = 100; // Finished.

    string json = oss.str();
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

} // extern "C"
