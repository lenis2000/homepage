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
#include <map>
#include <queue>
#include <utility>

using namespace std;

static std::mt19937 rng(std::random_device{}()); // Global RNG for speed

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

struct Cell {
    double value;
    int flag;
};

using Matrix = vector<vector<Cell>>;
using MatrixDouble = vector<vector<double>>;
using MatrixInt = vector<vector<int>>;
using Vertex = pair<int, int>;
using HeightMap = map<Vertex, double>;

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
        progressCounter = 10 + (int)(((double)(i + 1) / totalIterations) * 80);
        emscripten_sleep(0); // Yield control so that progress updates are visible.
    }
    return a1;
}

// Calculate the height function directly based on the domino configuration
HeightMap calculateHeightFunction(const MatrixInt &dominoConfig, int n) {
    // Create height map to store heights at vertices
    HeightMap heightMap;

    try {
        // First, set up the reference heights for the entire grid
        // We'll use a more direct approach focusing on corners of the dominoes
        
        progressCounter = 91;
        emscripten_sleep(0);
        
        // Set the reference height at origin (0,0) to 0
        heightMap[{0, 0}] = 0.0;
        
        // Pre-compute a uniform height field using a simple rule:
        // For each vertex (i,j), if i+j is even, set height to 0
        // Otherwise, use the parity of the coordinates to determine height
        for (int i = -2*n; i <= 2*n; i += 2) {
            for (int j = -2*n; j <= 2*n; j += 2) {
                if (abs(i) + abs(j) <= 2*n) { // Inside diamond boundary
                    // For even coordinates, the height depends on whether we're in a white or black square
                    heightMap[{i, j}] = ((i/2 + j/2) % 2 == 0) ? 0 : 1;
                }
            }
        }
        
        progressCounter = 92;
        emscripten_sleep(0);
        
        // Apply the height increments caused by each domino
        int size = dominoConfig.size();
        int processed = 0;
        int totalToProcess = (size * size) / 4; // Estimate of number of dominoes
        
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (dominoConfig[i][j] == 1) {
                    // Define vertices in grid coordinates and adjust heights
                    
                    // Standard grid coordinates of domino corners
                    int vi, vj, width, height;
                    string color;
                    
                    if ((i & 1) && (j & 1)) { // Blue - horizontal domino (i odd, j odd)
                        color = "blue";
                        // Use consistent coordinate calculation
                        vi = (j - i - 2);
                        vj = 2*n - (i + j);
                        width = 4;
                        height = 2;
                        
                        // Impact on height field:
                        // Horizontal dominoes add or subtract 2 to heights on one side
                        for (int x = vi; x <= vi + width; x += 2) {
                            for (int y = vj - height; y <= vj; y += 2) {
                                if (heightMap.find({x, y}) != heightMap.end()) {
                                    // Adjust heights based on position relative to domino
                                    if (y < vj) { // Bottom side of horizontal domino
                                        heightMap[{x, y}] += 2;
                                    }
                                }
                            }
                        }
                    } else if ((i & 1) && !(j & 1)) { // Yellow - vertical domino (i odd, j even)
                        color = "yellow";
                        // Match horizontal domino coordinate system
                        vi = (j - i - 2); // Changed from -1 to -2 for consistency
                        vj = 2*n - (i + j); // Removed -2 for consistency
                        width = 2;
                        height = 4;
                        
                        // Impact on height field:
                        // Vertical dominoes add or subtract 2 to heights on one side
                        for (int x = vi; x <= vi + width; x += 2) {
                            for (int y = vj; y <= vj + height; y += 2) {
                                if (heightMap.find({x, y}) != heightMap.end()) {
                                    // Adjust heights based on position relative to domino
                                    if (x > vi) { // Right side of vertical domino
                                        heightMap[{x, y}] += 2;
                                    }
                                }
                            }
                        }
                    } else if (!(i & 1) && !(j & 1)) { // Green - horizontal domino (i even, j even)
                        color = "green";
                        // Use consistent coordinate calculation
                        vi = (j - i - 2);
                        vj = 2*n - (i + j);
                        width = 4;
                        height = 2;
                        
                        // Impact on height field:
                        // Horizontal dominoes add or subtract 2 to heights on one side
                        for (int x = vi; x <= vi + width; x += 2) {
                            for (int y = vj - height; y <= vj; y += 2) {
                                if (heightMap.find({x, y}) != heightMap.end()) {
                                    // Adjust heights based on position relative to domino
                                    if (y < vj) { // Bottom side of horizontal domino
                                        heightMap[{x, y}] -= 2;
                                    }
                                }
                            }
                        }
                    } else if (!(i & 1) && (j & 1)) { // Red - vertical domino (i even, j odd)
                        color = "red";
                        // Match horizontal domino coordinate system
                        vi = (j - i - 2); // Changed from -1 to -2 for consistency
                        vj = 2*n - (i + j); // Removed -2 for consistency
                        width = 2;
                        height = 4;
                        
                        // Impact on height field:
                        // Vertical dominoes add or subtract 2 to heights on one side
                        for (int x = vi; x <= vi + width; x += 2) {
                            for (int y = vj; y <= vj + height; y += 2) {
                                if (heightMap.find({x, y}) != heightMap.end()) {
                                    // Adjust heights based on position relative to domino
                                    if (x > vi) { // Right side of vertical domino
                                        heightMap[{x, y}] -= 2;
                                    }
                                }
                            }
                        }
                    }
                    
                    processed++;
                    if (processed % 50 == 0) {
                        // Update progress from 92 to 95
                        int progress = 92 + (processed * 3) / totalToProcess;
                        if (progress > 95) progress = 95;
                        progressCounter = progress;
                        emscripten_sleep(0);
                    }
                }
            }
        }
    } catch (const std::exception& e) {
        // If an exception occurs, return a simple height map with minimal vertices
        cerr << "Error in height function calculation: " << e.what() << endl;
        HeightMap fallbackMap;
        fallbackMap[{0, 0}] = 0.0;
        return fallbackMap;
    }

    return heightMap;
}

// Get the domino face vertices in 3D with heights
vector<tuple<string, vector<vector<double>>>> getDominoFaces(const MatrixInt &dominoConfig, const HeightMap &heightMap, int n) {
    vector<tuple<string, vector<vector<double>>>> faces;
    int size = dominoConfig.size();

    // Update progress to indicate we're starting face generation
    progressCounter = 96;
    emscripten_sleep(0);

    // Reserve space to avoid reallocation (vector can use reserve)
    faces.reserve(size * size / 4); // Rough estimate

    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            if (dominoConfig[i][j] == 1) {
                try {
                    string color;
                    vector<vector<double>> vertices(4, vector<double>(3));

                    // Standard grid coordinates of domino corners (using even coordinates)
                    int vi, vj, width, height;
                    
                    if ((i & 1) && (j & 1)) { // Blue - horizontal domino (i odd, j odd)
                        color = "blue";
                        // Use consistent coordinate calculation
                        vi = (j - i - 2);
                        vj = 2*n - (i + j);
                        width = 4;
                        height = 2;
                        
                        // Define the four corners in counterclockwise order (for proper face normal)
                        Vertex v1 = {vi, vj};
                        Vertex v2 = {vi + width, vj};
                        Vertex v3 = {vi + width, vj - height};
                        Vertex v4 = {vi, vj - height};
                        
                        // Get heights with fallback to 0 if vertex not found
                        double h1 = (heightMap.find(v1) != heightMap.end()) ? heightMap.at(v1) : 0.0;
                        double h2 = (heightMap.find(v2) != heightMap.end()) ? heightMap.at(v2) : 0.0;
                        double h3 = (heightMap.find(v3) != heightMap.end()) ? heightMap.at(v3) : 0.0;
                        double h4 = (heightMap.find(v4) != heightMap.end()) ? heightMap.at(v4) : 0.0;
                        
                        // Scale coordinates back to normal range for display
                        // Shift all blue horizontal dominoes by -1/2 left (x-axis) and -3/2 down (y-axis)
                        vertices[0] = {static_cast<double>(vi) / 2.0 - 0.5, static_cast<double>(vj) / 2.0 - 1.5, h1};
                        vertices[1] = {static_cast<double>(vi + width) / 2.0 - 0.5, static_cast<double>(vj) / 2.0 - 1.5, h2};
                        vertices[2] = {static_cast<double>(vi + width) / 2.0 - 0.5, static_cast<double>(vj - height) / 2.0 - 1.5, h3};
                        vertices[3] = {static_cast<double>(vi) / 2.0 - 0.5, static_cast<double>(vj - height) / 2.0 - 1.5, h4};
                        
                    } else if ((i & 1) && !(j & 1)) { // Yellow - vertical domino (i odd, j even)
                        color = "yellow";
                        // Match horizontal domino coordinate system
                        vi = (j - i - 2); // Changed from -1 to -2 for consistency
                        vj = 2*n - (i + j); // Removed -2 for consistency
                        width = 2;
                        height = 4;
                        
                        // Define the four corners in counterclockwise order (for proper face normal)
                        Vertex v1 = {vi, vj};
                        Vertex v2 = {vi, vj + height};
                        Vertex v3 = {vi + width, vj + height};
                        Vertex v4 = {vi + width, vj};
                        
                        // Get heights with fallback to 0 if vertex not found
                        double h1 = (heightMap.find(v1) != heightMap.end()) ? heightMap.at(v1) : 0.0;
                        double h2 = (heightMap.find(v2) != heightMap.end()) ? heightMap.at(v2) : 0.0;
                        double h3 = (heightMap.find(v3) != heightMap.end()) ? heightMap.at(v3) : 0.0;
                        double h4 = (heightMap.find(v4) != heightMap.end()) ? heightMap.at(v4) : 0.0;
                        
                        // Scale coordinates back to normal range for display
                        // No offset for vertical dominoes
                        vertices[0] = {static_cast<double>(vi) / 2.0, static_cast<double>(vj) / 2.0, h1};
                        vertices[1] = {static_cast<double>(vi) / 2.0, static_cast<double>(vj + height) / 2.0, h2};
                        vertices[2] = {static_cast<double>(vi + width) / 2.0, static_cast<double>(vj + height) / 2.0, h3};
                        vertices[3] = {static_cast<double>(vi + width) / 2.0, static_cast<double>(vj) / 2.0, h4};
                        
                    } else if (!(i & 1) && !(j & 1)) { // Green - horizontal domino (i even, j even)
                        color = "green";
                        // Use consistent coordinate calculation
                        vi = (j - i - 2);
                        vj = 2*n - (i + j);
                        width = 4;
                        height = 2;
                        
                        // Define the four corners in counterclockwise order (for proper face normal)
                        Vertex v1 = {vi, vj};
                        Vertex v2 = {vi + width, vj};
                        Vertex v3 = {vi + width, vj - height};
                        Vertex v4 = {vi, vj - height};
                        
                        // Get heights with fallback to 0 if vertex not found
                        double h1 = (heightMap.find(v1) != heightMap.end()) ? heightMap.at(v1) : 0.0;
                        double h2 = (heightMap.find(v2) != heightMap.end()) ? heightMap.at(v2) : 0.0;
                        double h3 = (heightMap.find(v3) != heightMap.end()) ? heightMap.at(v3) : 0.0;
                        double h4 = (heightMap.find(v4) != heightMap.end()) ? heightMap.at(v4) : 0.0;
                        
                        // Scale coordinates back to normal range for display
                        // Shift all blue horizontal dominoes by -1/2 left (x-axis) and -3/2 down (y-axis)
                        vertices[0] = {static_cast<double>(vi) / 2.0 - 0.5, static_cast<double>(vj) / 2.0 - 1.5, h1};
                        vertices[1] = {static_cast<double>(vi + width) / 2.0 - 0.5, static_cast<double>(vj) / 2.0 - 1.5, h2};
                        vertices[2] = {static_cast<double>(vi + width) / 2.0 - 0.5, static_cast<double>(vj - height) / 2.0 - 1.5, h3};
                        vertices[3] = {static_cast<double>(vi) / 2.0 - 0.5, static_cast<double>(vj - height) / 2.0 - 1.5, h4};
                        
                    } else if (!(i & 1) && (j & 1)) { // Red - vertical domino (i even, j odd)
                        color = "red";
                        // Match horizontal domino coordinate system
                        vi = (j - i - 2); // Changed from -1 to -2 for consistency
                        vj = 2*n - (i + j); // Removed -2 for consistency
                        width = 2;
                        height = 4;
                        
                        // Define the four corners in counterclockwise order (for proper face normal)
                        Vertex v1 = {vi, vj};
                        Vertex v2 = {vi, vj + height};
                        Vertex v3 = {vi + width, vj + height};
                        Vertex v4 = {vi + width, vj};
                        
                        // Get heights with fallback to 0 if vertex not found
                        double h1 = (heightMap.find(v1) != heightMap.end()) ? heightMap.at(v1) : 0.0;
                        double h2 = (heightMap.find(v2) != heightMap.end()) ? heightMap.at(v2) : 0.0;
                        double h3 = (heightMap.find(v3) != heightMap.end()) ? heightMap.at(v3) : 0.0;
                        double h4 = (heightMap.find(v4) != heightMap.end()) ? heightMap.at(v4) : 0.0;
                        
                        // Scale coordinates back to normal range for display
                        // No offset for vertical dominoes
                        vertices[0] = {static_cast<double>(vi) / 2.0, static_cast<double>(vj) / 2.0, h1};
                        vertices[1] = {static_cast<double>(vi) / 2.0, static_cast<double>(vj + height) / 2.0, h2};
                        vertices[2] = {static_cast<double>(vi + width) / 2.0, static_cast<double>(vj + height) / 2.0, h3};
                        vertices[3] = {static_cast<double>(vi + width) / 2.0, static_cast<double>(vj) / 2.0, h4};
                    } else {
                        continue;
                    }

                    faces.push_back(make_tuple(color, vertices));

                    // Update progress occasionally
                    if ((i * size + j) % 1000 == 0) {
                        float progress = 96 + (float)(i * size + j) / (size * size) * 4;
                        if (progress < 100) {
                            progressCounter = static_cast<int>(progress);
                            emscripten_sleep(0);
                        }
                    }
                } catch (const std::exception& e) {
                    // Skip problematic faces silently
                    continue;
                }
            }
        }
    }

    // Ensure we have at least some faces to render
    if (faces.empty()) {
        // Create a simple placeholder face if no valid faces were generated
        vector<vector<double>> vertices = {
            {-n/2.0, -n/2.0, 0.0},
            {n/2.0, -n/2.0, 0.0},
            {n/2.0, n/2.0, 0.0},
            {-n/2.0, n/2.0, 0.0}
        };
        faces.push_back(make_tuple("blue", vertices));
    }

    progressCounter = 100;
    emscripten_sleep(0);
    return faces;
}

// ---------------------------------------------------------------------
// simulateAztec
//
// Exported function callable from JavaScript.
// It creates a 2*n x 2*n weight matrix, runs the simulation,
// and returns a JSON string with domino placements as 3D faces.
// ---------------------------------------------------------------------
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n) {
    try {
        // Limit n to reasonable values to prevent memory issues
        if (n > 120) {
            n = 120; // Cap at 120 to prevent memory issues
        }

        progressCounter = 0; // Reset progress.

        // Create weight matrix A1a: dimensions 2*n x 2*n, filled with ones.
        int dim = 2 * n;

        // Check if memory allocation would be too large
        if (dim > 1000) {
            throw std::runtime_error("Input size too large, would exceed memory limits");
        }

        MatrixDouble A1a(dim, vector<double>(dim, 1.0));
        emscripten_sleep(0); // Yield to update UI

        // Compute probability matrices.
        vector<MatrixDouble> prob;
        try {
            prob = probs2(A1a);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error computing probability matrices");
        }
        progressCounter = 10; // Probabilities computed.
        emscripten_sleep(0); // Yield to update UI

        // Generate domino configuration.
        MatrixInt dominoConfig;
        try {
            dominoConfig = aztecgen(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating domino configuration");
        }
        progressCounter = 90; // Simulation steps complete.
        emscripten_sleep(0); // Yield to update UI

        // Calculate height function
        HeightMap heightMap;
        try {
            heightMap = calculateHeightFunction(dominoConfig, n);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error calculating height function");
        }
        progressCounter = 95; // Height function computed
        emscripten_sleep(0); // Yield to update UI

        // Get 3D faces with heights
        vector<tuple<string, vector<vector<double>>>> faces;
        try {
            faces = getDominoFaces(dominoConfig, heightMap, n);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating 3D faces");
        }

        // Build JSON output with 3D vertices
        ostringstream oss;
        oss << "[";

        // Limit the number of faces to prevent memory issues
        const size_t maxFacesToOutput = 10000;
        const size_t facesToOutput = std::min(faces.size(), maxFacesToOutput);

        for (size_t i = 0; i < facesToOutput; i++) {
            if (i > 0) oss << ",";

            // Use traditional access instead of structured binding for compatibility
            const string& color = std::get<0>(faces[i]);
            const vector<vector<double>>& vertices = std::get<1>(faces[i]);

            oss << "{\"color\":\"" << color << "\",\"vertices\":[";

            for (size_t j = 0; j < vertices.size(); j++) {
                if (j > 0) oss << ",";
                oss << "[" << vertices[j][0] << "," << vertices[j][1] << "," << vertices[j][2] << "]";
            }

            oss << "]}";

            // Yield every 1000 faces to keep UI responsive
            if (i % 1000 == 0) {
                emscripten_sleep(0);
            }
        }

        // If we limited the number of faces, add a message
        if (facesToOutput < faces.size()) {
            oss << ",{\"color\":\"gray\",\"vertices\":[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],\"message\":\"Output limited to "
                << maxFacesToOutput << " faces out of " << faces.size() << " total\"}";
        }

        oss << "]";
        progressCounter = 100; // Finished.
        emscripten_sleep(0); // Yield to update UI

        // Allocate memory for the output string
        string json = oss.str();
        char* out = nullptr;

        try {
            out = (char*)malloc(json.size() + 1);
            if (!out) {
                throw std::runtime_error("Failed to allocate memory for output");
            }
            strcpy(out, json.c_str());
        } catch (const std::exception& e) {
            // If memory allocation fails, return a simple error message
            const char* errorMsg = "{\"error\":\"Memory allocation failed\"}";
            out = (char*)malloc(strlen(errorMsg) + 1);
            if (out) {
                strcpy(out, errorMsg);
            } else {
                // If we can't even allocate the error message, return a minimal response
                out = (char*)malloc(3);
                if (out) {
                    strcpy(out, "[]");
                }
            }
        }

        return out;
    } catch (const std::exception& e) {
        // Return error as JSON
        std::string errorMsg = std::string("{\"error\":\"") + e.what() + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        if (out) {
            strcpy(out, errorMsg.c_str());
        } else {
            // Fallback if memory allocation fails
            out = (char*)malloc(3);
            if (out) {
                strcpy(out, "[]");
            }
        }
        progressCounter = 100; // Mark as complete to stop progress indicator
        return out;
    }
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
