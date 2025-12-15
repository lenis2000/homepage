/*
  2025-12-11-t-embedding-shuffling.cpp

  Weighted EKLP shuffling for T-embedding page.
  Based on s/domino.cpp with added support for arbitrary weight matrices.

  emcc 2025-12-11-t-embedding-shuffling.cpp -o 2025-12-11-t-embedding-shuffling.js -s WASM=1 -s ASYNCIFY=1 -s MODULARIZE=1 -s 'EXPORT_NAME="createShufflingModule"' -s "EXPORTED_FUNCTIONS=['_simulateAztec','_simulateAztecWithWeightMatrix','_freeString','_getProgress','_malloc','_free']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","setValue","getValue"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math && mv 2025-12-11-t-embedding-shuffling.js ../../js/

Features:
- 3x3 periodic weights for random domino tilings of Aztec diamond
- 2x2 periodic weights support added (May 2025)
- Arbitrary weight matrix support for T-embedding integration

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
#include <map>
#include <queue>
#include <utility>
#include <array>

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

/* ---------- Global state for incremental Glauber dynamics ---------- */
static MatrixInt      g_conf;        // current domino configuration (vector<vector<int>>)
static MatrixDouble   g_W;           // current weight matrix (vector<vector<double>>)
static int            g_N    = 0;    // linear size of g_conf (2n)
static string         g_periodicity = "uniform"; // "uniform", "2x2", or "3x3"
// Store weights based on periodicity
static double         g_a = 1.0, g_b = 1.0; // For 2x2
static array<double, 9> g_w = {1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0}; // For 3x3 (w1 to w9)
static array<double, 12> g_w6x2 = {1.0, 20.0, 1.0, 20.0, 1.0, 20.0, 1.0, 20.0, 1.0, 20.0, 1.0, 20.0}; // For 6x2

// Flag to track if a Glauber run is active
static bool g_glauber_active = false;
/* ------------------------------------------------------------------ */

// Helper to get the weight of a plaquette configuration
// Uses the globally stored weight matrix g_W
double plaquetteWeight(int r, int c, bool horizontal) {
    /* Calculates the weight contribution of a 2x2 plaquette at (r, c).
       'horizontal' being true corresponds to the state where
       markers are at (r, c) [NW] and (r+1, c+1) [SE].
       'horizontal' being false corresponds to markers at
       (r+1, c) [SW] and (r, c+1) [NE].

       Uses the global weight matrix g_W.
    */
    if (r < 0 || r + 1 >= g_N || c < 0 || c + 1 >= g_N) {
         // Bounds check - should not happen if called correctly
         return 1.0; // Or some other default/error handling
    }

    const double wNW = g_W[r][c];         // Weight at NW corner (r, c)
    const double wNE = g_W[r][c + 1];     // Weight at NE corner (r, c+1)
    const double wSW = g_W[r + 1][c];     // Weight at SW corner (r+1, c)
    const double wSE = g_W[r + 1][c + 1]; // Weight at SE corner (r+1, c+1)

    if (horizontal) {
        // Weight for Horizontal configuration (NW and SE markers)
        return wNW * wSE;
    } else {
        // Weight for Vertical configuration (SW and NE markers)
        return wSW * wNE;
    }
}

// One heat‑bath update on a random 2×2 plaquette using global state
void glauberStep(std::uniform_real_distribution<> &u) {
    if (g_N == 0) return; // No configuration loaded

    // Use global RNG
    std::uniform_int_distribution<> duRow(0, g_N - 2);
    std::uniform_int_distribution<> duCol(0, g_N - 2);
    int i = duRow(rng); // Random row for top-left corner (0 to N-2)
    int j = duCol(rng); // Random col for top-left corner (0 to N-2)

    // Check current state of the 2x2 plaquette at (i, j)
    bool isHH = (g_conf[i][j] == 1 && g_conf[i + 1][j + 1] == 1 &&
                 g_conf[i + 1][j] == 0 && g_conf[i][j + 1] == 0);
    bool isVV = (g_conf[i + 1][j] == 1 && g_conf[i][j + 1] == 1 &&
                 g_conf[i][j] == 0 && g_conf[i + 1][j + 1] == 0);

    if (!(isHH || isVV)) {
        // Not a valid HH or VV plaquette (might be mixed or empty)
        return; // Skip update for invalid states
    }

    // Compute weights using the global weight matrix g_W
    double wHH = plaquetteWeight(i, j, /*horizontal=*/true);
    double wVV = plaquetteWeight(i, j, /*horizontal=*/false);

    // Heat-bath probability for choosing the Horizontal state (HH)
    double pHH = (std::abs(wHH + wVV) < 1e-15) ? 0.5 : (wHH / (wHH + wVV));

    // Decide whether to flip based on the probability
    bool chooseHH = (u(rng) < pHH);

    // If the chosen state matches the current state, do nothing
    if ((chooseHH && isHH) || (!chooseHH && isVV)) {
        return;
    }

    // Flip the state: clear the plaquette first
    g_conf[i][j] = 0;
    g_conf[i][j + 1] = 0;
    g_conf[i + 1][j] = 0;
    g_conf[i + 1][j + 1] = 0;

    // Set the new state
    if (chooseHH) {
        // Place markers for HH state (NW and SE)
        g_conf[i][j] = 1;
        g_conf[i + 1][j + 1] = 1;
    } else {
        // Place markers for VV state (SW and NE)
        g_conf[i + 1][j] = 1;
        g_conf[i][j + 1] = 1;
    }
     g_glauber_active = true; // Mark that Glauber has modified the state
}

vector<Matrix> d3p(const MatrixDouble &x1) {
    // d3p: builds a vector of matrices from x1.
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

vector<MatrixDouble> probs2(const MatrixDouble &x1) {
    // probs2: compute probability matrices from the d3p output.
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

MatrixInt delslide(const MatrixInt &x1) {
    // delslide: deletion-slide procedure.
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

MatrixInt create(MatrixInt x0, const MatrixDouble &p) {
    // create: decide domino orientation in each 2x2 block using probabilities.
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

MatrixInt aztecgen(const vector<MatrixDouble> &x0) {
    // aztecgen: iterate deletion-slide and creation steps.
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

// ---------------------------------------------------------------------
// simulateAztec
//
// Exported function callable from JavaScript.
// It creates a 2*n x 2*n weight matrix, runs the simulation,
// and returns a JSON string with domino placements for 3D rendering.
// ---------------------------------------------------------------------
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n, double w1, double w2, double w3, double w4, double w5, double w6, double w7, double w8, double w9) {
    try {
        // // Limit n to reasonable values to prevent memory issues
        // if (n > 120) {
        //     n = 120; // Cap at 120 to prevent memory issues
        // }

        progressCounter = 0; // Reset progress.

        // Create weight matrix A1a: dimensions 2*n x 2*n with periodic pattern
        int dim = 2 * n;

        // Check if memory allocation would be too large
        if (dim > 1000) {
            throw std::runtime_error("Input size too large, would exceed memory limits");
        }

        MatrixDouble A1a(dim, vector<double>(dim, 0.0));

        // Check if the weights match the pattern for a 2x2 periodic configuration
        // In a 2x2 pattern, w2 and w8 are 'a', w4 and w6 are 'b', and the rest are 1.0
        bool is2x2Pattern = (std::abs(w1 - 1.0) < 1e-9 && std::abs(w3 - 1.0) < 1e-9 &&
                             std::abs(w5 - 1.0) < 1e-9 && std::abs(w7 - 1.0) < 1e-9 &&
                             std::abs(w9 - 1.0) < 1e-9 &&
                             std::abs(w2 - w8) < 1e-9 && std::abs(w4 - w6) < 1e-9);

        if (is2x2Pattern) {
            // Use the direct 2x2 pattern implementation from the reference code
            double a = w2; // w2 and w8 are 'a'
            double b = w4; // w4 and w6 are 'b'

            for (int i = 0; i < dim; ++i) {
                for (int j = 0; j < dim; ++j) {
                    int im = i & 3; // Faster than i % 4
                    int jm = j & 3; // Faster than j % 4
                    if ((im < 2 && jm < 2) || (im >= 2 && jm >= 2))
                        A1a[i][j] = b;
                    else
                        A1a[i][j] = a;
                }
            }
        } else {
            // --- 3×3 periodic pattern ------------------------------------------
            const double W[3][3] = {{w1, w2, w3},
                                    {w4, w5, w6},
                                    {w7, w8, w9}};

            for (int i = 0; i < dim; ++i) {
                int ii = i % 3;               // row inside the 3‑periodic block
                for (int j = 0; j < dim; ++j) {
                    int jj = j % 3;           // column inside the 3‑periodic block
                    A1a[i][j] = W[ii][jj];    // assign the corresponding weight
                }
            }
        }

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
        // Store the generated configuration and parameters globally
        g_conf = dominoConfig; // Store the generated MatrixInt
        g_W    = A1a;          // Store the calculated weight MatrixDouble
        g_N    = dim;          // Store the dimension (2*n)

        // Store the periodicity type and corresponding weights
        if (is2x2Pattern) {
            g_periodicity = "2x2";
            g_a = w2; // 'a' from input
            g_b = w4; // 'b' from input
        } else if (std::abs(w1 - 1.0) < 1e-9 && std::abs(w2 - 1.0) < 1e-9 && std::abs(w3 - 1.0) < 1e-9 &&
                   std::abs(w4 - 1.0) < 1e-9 && std::abs(w5 - 1.0) < 1e-9 && std::abs(w6 - 1.0) < 1e-9 &&
                   std::abs(w7 - 1.0) < 1e-9 && std::abs(w8 - 1.0) < 1e-9 && std::abs(w9 - 1.0) < 1e-9) {
            g_periodicity = "uniform";
        } else {
            g_periodicity = "3x3";
            g_w = {w1, w2, w3, w4, w5, w6, w7, w8, w9}; // Store all 9 weights
        }

        g_glauber_active = false; // Reset Glauber flag after fresh sample

        progressCounter = 90; // Simulation steps complete.
        emscripten_sleep(0);  // Yield to update UI

        // Build JSON output with dominoes data
        ostringstream oss;
        oss << "[";  // Simple array of domino objects

        int size = (int)dominoConfig.size();
        bool first = true;

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (dominoConfig[i][j] == 1) {
                    double x, y, w, h;
                    string color;

                    bool oddI = (i & 1), oddJ = (j & 1);

                    if (oddI && oddJ) { // i odd, j odd: Blue
                        color = "blue";
                        x = j - i - 2;
                        y = size + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (oddI && !oddJ) { // i odd, j even: Yellow
                        color = "yellow";
                        x = j - i - 1;
                        y = size + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else if (!oddI && !oddJ) { // i even, j even: Green
                        color = "green";
                        x = j - i - 2;
                        y = size + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (!oddI && oddJ) { // i even, j odd: Red
                        color = "red";
                        x = j - i - 1;
                        y = size + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else {
                        continue;
                    }

                    if (!first) oss << ",";
                    else first = false;

                    oss << "{\"x\":" << x << ",\"y\":" << y
                        << ",\"w\":" << w << ",\"h\":" << h
                        << ",\"color\":\"" << color << "\"}";
                }
            }
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
                out = (char*)malloc(13); // size for []
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
            out = (char*)malloc(3); // size for []
            if (out) {
                strcpy(out, "[]");
            }
        }
        progressCounter = 100; // Mark as complete to stop progress indicator
        return out;
    }
}

// ---------------------------------------------------------------------
// simulateAztec6x2
//
// New function for 6x2 periodic weights.
// ---------------------------------------------------------------------
EMSCRIPTEN_KEEPALIVE
char* simulateAztec6x2(int n, double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10, double v11, double v12) {
    try {
        progressCounter = 0;
        int dim = 2 * n;
        if (dim > 1000) {
            throw std::runtime_error("Input size too large, would exceed memory limits");
        }

        // Store weights globally for Glauber dynamics
        g_w6x2[0] = v1; g_w6x2[1] = v2; g_w6x2[2] = v3;
        g_w6x2[3] = v4; g_w6x2[4] = v5; g_w6x2[5] = v6;
        g_w6x2[6] = v7; g_w6x2[7] = v8; g_w6x2[8] = v9;
        g_w6x2[9] = v10; g_w6x2[10] = v11; g_w6x2[11] = v12;

        MatrixDouble A1a(dim, vector<double>(dim, 0.0));
        const double W[2][6] = {
            {v1, v2, v3, v4, v5, v6},
            {v7, v8, v9, v10, v11, v12}
        };

        for (int i = 0; i < dim; ++i) {
            int ii = i % 2;
            for (int j = 0; j < dim; ++j) {
                int jj = j % 6;
                A1a[i][j] = W[ii][jj];
            }
        }
        emscripten_sleep(0);

        vector<MatrixDouble> prob = probs2(A1a);
        progressCounter = 10;
        emscripten_sleep(0);

        MatrixInt dominoConfig = aztecgen(prob);

        // Store the generated configuration and parameters globally for Glauber
        g_conf = dominoConfig;
        g_W    = A1a;
        g_N    = dim;
        g_periodicity = "6x2"; // Set periodicity for Glauber context
        g_glauber_active = false;

        progressCounter = 90;
        emscripten_sleep(0);

        ostringstream oss;
        oss << "[";
        int size = (int)dominoConfig.size();
        bool first = true;
        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (dominoConfig[i][j] == 1) {
                    double x, y, w, h;
                    string color;
                    bool oddI = (i & 1), oddJ = (j & 1);
                    if (oddI && oddJ) { color = "blue";   x = j-i-2; y = size+1-(i+j)-1; w = 4; h = 2; }
                    else if (oddI && !oddJ){ color = "yellow"; x = j-i-1; y = size+1-(i+j)-2; w = 2; h = 4; }
                    else if (!oddI && !oddJ){ color = "green";  x = j-i-2; y = size+1-(i+j)-1; w = 4; h = 2; }
                    else if (!oddI && oddJ) { color = "red";    x = j-i-1; y = size+1-(i+j)-2; w = 2; h = 4; }
                    else continue;

                    if (!first) oss << ","; else first = false;
                    oss << "{\"x\":" << x << ",\"y\":" << y
                        << ",\"w\":" << w << ",\"h\":" << h
                        << ",\"color\":\"" << color << "\"}";
                }
            }
        }
        oss << "]";
        progressCounter = 100;
        emscripten_sleep(0);

        string json = oss.str();
        char* out = (char*)malloc(json.size() + 1);
        if (!out) { throw std::runtime_error("Failed to allocate memory for output"); }
        strcpy(out, json.c_str());
        return out;
    } catch (const std::exception& e) {
        string errorMsg = string("{\"error\":\"") + e.what() + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        progressCounter = 100;
        return out;
    }
}

/* ------------------------------------------------------------------ *
 *  simulateAztecHorizontal – deterministic "all‑horizontal" frozen state
 *  (returns only dominoes whose 4×2 rectangle lies wholly inside ♦)
 * ------------------------------------------------------------------ */
extern "C" EMSCRIPTEN_KEEPALIVE
char* simulateAztecHorizontal(int n,
                              double, double, double,
                              double, double, double,
                              double, double, double)
{
    try {
        const int N = 2 * n;                     // lattice size

        MatrixInt conf(N, std::vector<int>(N, 0));

        for (int i = 0; i <= N; ++i) {
            for (int j = 0; j <= N; ++j) {
                const bool oddI = i & 1;
                const bool oddJ = j & 1;

                /* Renderer y‑coord (centre‑of‑diamond = 0) */
                const int y = (N + 1) - (i + j) - 1;

                /*  blue  = NW marker  (companion SE = i+1,j+1)
                 *  green = SE marker  (companion NW = i‑1,j‑1)          */
                if (y >= 0) {                            // TOP half
                    if (oddI && oddJ && i <= N - 2 && j <= N - 2  && i >= 3 && j >= 3)
                        conf[i][j] = 1;                  // blue marker
                } else {                                 // BOTTOM half
                    if (!oddI && !oddJ && i >= 1 && j >= 1 && i <= N  && j <= N )
                        conf[i][j] = 1;                  // green marker
                }
            }
        }

        /* ---- stash in globals so renderers & Glauber can use it ---- */
        g_conf           = conf;
        g_W              = MatrixDouble(N, std::vector<double>(N, 1.0));
        g_N              = N;
        g_periodicity    = "uniform";
        g_glauber_active = false;

        /* ------------ serialise exactly like simulateAztec ---------- */
        std::ostringstream oss;  oss << '[';  bool first = true;

        for (int i = 0; i < N; ++i) {
            for (int j = 0; j < N; ++j) {
                if (!conf[i][j]) continue;

                double x  = j - i - 2;
                double yy = N + 1 - (i + j) - 1;
                const char* col = ((i & 1) && (j & 1)) ? "blue" : "green";

                if (!first) oss << ','; else first = false;
                oss << "{\"x\":" << x  << ",\"y\":" << yy
                    << ",\"w\":4,\"h\":2,\"color\":\"" << col << "\"}";
            }
        }
        oss << ']';

        char* out = (char*)std::malloc(oss.str().size() + 1);
        std::strcpy(out, oss.str().c_str());
        return out;
    }
    catch (const std::exception& e) {
        std::string err = std::string("{\"error\":\"") + e.what() + "\"}";
        char* out = (char*)std::malloc(err.size() + 1);
        std::strcpy(out, err.c_str());
        return out;
    }
}


/* ------------------------------------------------------------------ *
 *  simulateAztecVertical – deterministic “all‑vertical” frozen state
 *  (returns only dominoes whose 2×4 rectangle lies wholly inside ♦)
 * ------------------------------------------------------------------ */
extern "C" EMSCRIPTEN_KEEPALIVE
char* simulateAztecVertical(int n,
                            double, double, double,
                            double, double, double,
                            double, double, double)
{
    try {
        const int N = 2 * n;                       /* lattice size */


        MatrixInt conf(N, std::vector<int>(N,0));

        for (int i = 0; i <= N; ++i){
            for (int j = 0; j <= N; ++j){

                const bool oddI = i & 1;
                const bool oddJ = j & 1;
                const int  x    = j - i - 1;          // renderer’s x‑coord

                /*  yellow  (NE marker)  needs companion SW = (i+1,j‑1)
                 *  red     (SW marker)  needs companion NE = (i‑1,j+1)  */
                if (x <= 0){                                            // left half
                    if ( oddI && !oddJ && i <= N-2 && j >= 2 )
                        conf[i][j] = 1;          /* yellow marker */
                } else {                                              // right half
                    if (!oddI && oddJ && i >= 0 && j <= N )
                        conf[i][j] = 1;          /* red marker */
                }
            }
        }

        /* --- stash in globals so downstream renderers / Glauber work --- */
        g_conf           = conf;
        g_W              = MatrixDouble(N, std::vector<double>(N,1.0));
        g_N              = N;
        g_periodicity    = "uniform";
        g_glauber_active = false;

        /* ----------- serialise exactly like simulateAztec -------------- */
        std::ostringstream oss;  oss << '[';  bool first = true;

        for (int i = 0; i < N; ++i){
            for (int j = 0; j < N; ++j){
                if (!conf[i][j]) continue;

                double x = j - i - 1;
                double y = N + 1 - (i + j) - 2;
                const char* col = (x <= 0) ? "yellow" : "red";

                if (!first) oss << ','; else first = false;

                    oss << "{\"x\":"<<x<<",\"y\":"<<y
                        <<",\"w\":2,\"h\":4,\"color\":\""<<col<<"\"}";
            }
        }
        oss << ']';

        char* out = (char*)std::malloc(oss.str().size()+1);
        std::strcpy(out, oss.str().c_str());
        return out;
    }
    catch (const std::exception& e){
        std::string err = std::string("{\"error\":\"")+e.what()+"\"}";
        char* out = (char*)std::malloc(err.size()+1);
        std::strcpy(out, err.c_str());
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

// Function to perform multiple Glauber steps and return the result as JSON
EMSCRIPTEN_KEEPALIVE
char* performGlauberSteps(
    const char* periodicity_cstr, // "uniform", "2x2", or "3x3"
    double p1, double p2, double p3, double p4, double p5, double p6, double p7, double p8, double p9, // Use all 9 for flexibility
    int nSteps)
{
    try {
        if (g_N == 0) {
            throw std::runtime_error("No configuration loaded. Run 'Sample' first.");
        }

        string periodicity = periodicity_cstr;
        bool weights_changed = false;

        // Check if weights or periodicity need updating
        if (periodicity != g_periodicity) {
            weights_changed = true;
            g_periodicity = periodicity;
        }

        if (periodicity == "2x2") {
            double a = p1; // Use p1 for 'a'
            double b = p2; // Use p2 for 'b'
            if (std::abs(a - g_a) > 1e-9 || std::abs(b - g_b) > 1e-9) {
                weights_changed = true;
                g_a = a;
                g_b = b;
            }
        } else if (periodicity == "3x3") {
            array<double, 9> current_w = {p1, p2, p3, p4, p5, p6, p7, p8, p9};
            for (size_t i = 0; i < 9; ++i) {
                if (std::abs(current_w[i] - g_w[i]) > 1e-9) {
                    weights_changed = true;
                    break;
                }
            }
            if (weights_changed) {
                g_w = current_w;
            }
        } else if (periodicity == "6x2") {
            // Check if any of the first 9 weights have changed
            array<double, 9> current_w = {p1, p2, p3, p4, p5, p6, p7, p8, p9};
            for (size_t i = 0; i < 9; ++i) {
                if (std::abs(current_w[i] - g_w6x2[i]) > 1e-9) {
                    weights_changed = true;
                    break;
                }
            }
            // Note: we'll update g_w6x2 in the rebuild section below
        }
         // No specific weight check needed for "uniform" if periodicity changes

        // Rebuild global weight matrix g_W if necessary
        if (weights_changed) {
             g_W = MatrixDouble(g_N, vector<double>(g_N, 0.0)); // Reinitialize
             if (g_periodicity == "2x2") {
                 for (int i = 0; i < g_N; ++i) {
                     for (int j = 0; j < g_N; ++j) {
                         int im = i & 3, jm = j & 3;
                         g_W[i][j] = ((im < 2 && jm < 2) || (im >= 2 && jm >= 2)) ? g_b : g_a;
                     }
                 }
             } else if (g_periodicity == "3x3") {
                 const double W[3][3] = {{g_w[0], g_w[1], g_w[2]},
                                         {g_w[3], g_w[4], g_w[5]},
                                         {g_w[6], g_w[7], g_w[8]}};
                 for (int i = 0; i < g_N; ++i) {
                     for (int j = 0; j < g_N; ++j) {
                         g_W[i][j] = W[i % 3][j % 3];
                     }
                 }
             } else if (g_periodicity == "6x2") {
                 // For 6x2 mode, update the global weights with passed parameters
                 // We only have 9 parameters, so we'll update the first 9 weights
                 // and keep the last 3 from the global state
                 g_w6x2[0] = p1; g_w6x2[1] = p2; g_w6x2[2] = p3;
                 g_w6x2[3] = p4; g_w6x2[4] = p5; g_w6x2[5] = p6;
                 g_w6x2[6] = p7; g_w6x2[7] = p8; g_w6x2[8] = p9;
                 // Keep g_w6x2[9], g_w6x2[10], g_w6x2[11] from previous state
                 
                 // Now rebuild the weight matrix with the updated values
                 const double W[2][6] = {
                     {g_w6x2[0], g_w6x2[1], g_w6x2[2], g_w6x2[3], g_w6x2[4], g_w6x2[5]},
                     {g_w6x2[6], g_w6x2[7], g_w6x2[8], g_w6x2[9], g_w6x2[10], g_w6x2[11]}
                 };
                 for (int i = 0; i < g_N; ++i) {
                     int ii = i % 2;
                     for (int j = 0; j < g_N; ++j) {
                         int jj = j % 6;
                         g_W[i][j] = W[ii][jj];
                     }
                 }
             } else { // Uniform
                  for (int i = 0; i < g_N; ++i) {
                     for (int j = 0; j < g_N; ++j) {
                          g_W[i][j] = 1.0;
                     }
                 }
             }
        }

        // Perform nSteps Glauber updates
        std::uniform_real_distribution<> u(0.0, 1.0);
        for (int k = 0; k < nSteps; ++k) {
            glauberStep(u);
             // Optionally add emscripten_sleep(0) inside the loop for very large nSteps
             // if (k % 1000 == 0) emscripten_sleep(0);
        }

         g_glauber_active = true; // Mark that Glauber has run

        // Serialize the current configuration g_conf to JSON
        // (This part is identical to the JSON generation in simulateAztec)
        ostringstream oss;
        oss << "[";
        int size = g_N;
        bool first = true;

         for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (g_conf[i][j] == 1) {
                    double x, y, w, h;
                    string color;
                    bool oddI = (i & 1), oddJ = (j & 1);
                    if (oddI && oddJ) { color = "blue";   x = j-i-2; y = size+1-(i+j)-1; w = 4; h = 2; }
                    else if (oddI && !oddJ){ color = "yellow"; x = j-i-1; y = size+1-(i+j)-2; w = 2; h = 4; }
                    else if (!oddI && !oddJ){ color = "green";  x = j-i-2; y = size+1-(i+j)-1; w = 4; h = 2; }
                    else if (!oddI && oddJ) { color = "red";    x = j-i-1; y = size+1-(i+j)-2; w = 2; h = 4; }
                    else continue;

                    if (!first) oss << ","; else first = false;
                    oss << "{\"x\":" << x << ",\"y\":" << y
                        << ",\"w\":" << w << ",\"h\":" << h
                        << ",\"color\":\"" << color << "\"}";
                }
            }
        }
        oss << "]";

        // Allocate memory for the output string and return
        string json = oss.str();
        char* out = (char*)malloc(json.size() + 1);
        if (!out) throw std::runtime_error("Memory allocation failed for Glauber result");
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& e) {
        // Return error as JSON
        std::string errorMsg = std::string("{\"error\":\"Glauber step error: ") + e.what() + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        if (out) strcpy(out, errorMsg.c_str());
        else { // Fallback if error allocation fails
            out = (char*)malloc(13); // size for "[]" + null
            if (out) strcpy(out, "[]");
        }
        return out;
    }
}

// Add a simple getter for the g_glauber_active flag
EMSCRIPTEN_KEEPALIVE
bool wasGlauberActive() {
    return g_glauber_active;
}

// ---------------------------------------------------------------------
// simulateAztecWithWeightMatrix
//
// Takes a full weight matrix as a flat array of size (2n)*(2n).
// This allows arbitrary (non-periodic) weights like IID, layered, gamma.
// The weight matrix is passed via WASM memory (caller allocates with _malloc).
// ---------------------------------------------------------------------
EMSCRIPTEN_KEEPALIVE
char* simulateAztecWithWeightMatrix(int n, double* weights) {
    try {
        progressCounter = 0;
        int dim = 2 * n;

        if (dim > 1000) {
            throw std::runtime_error("Input size too large");
        }

        // Copy weights into MatrixDouble
        MatrixDouble A1a(dim, vector<double>(dim, 1.0));
        for (int i = 0; i < dim; ++i) {
            for (int j = 0; j < dim; ++j) {
                A1a[i][j] = weights[i * dim + j];
            }
        }

        emscripten_sleep(0);

        // Compute probability matrices
        vector<MatrixDouble> prob;
        try {
            prob = probs2(A1a);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error computing probability matrices");
        }
        progressCounter = 10;
        emscripten_sleep(0);

        // Generate domino configuration
        MatrixInt dominoConfig;
        try {
            dominoConfig = aztecgen(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating domino configuration");
        }

        // Store globally for potential Glauber follow-up
        g_conf = dominoConfig;
        g_W = A1a;
        g_N = dim;
        g_periodicity = "arbitrary";
        g_glauber_active = false;

        progressCounter = 90;
        emscripten_sleep(0);

        // Build JSON output
        ostringstream oss;
        oss << "[";
        int size = (int)dominoConfig.size();
        bool first = true;

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (dominoConfig[i][j] == 1) {
                    double x, y, w, h;
                    string color;
                    bool oddI = (i & 1), oddJ = (j & 1);

                    if (oddI && oddJ) {
                        color = "blue";
                        x = j - i - 2;
                        y = size + 1 - (i + j) - 1;
                        w = 4; h = 2;
                    } else if (oddI && !oddJ) {
                        color = "yellow";
                        x = j - i - 1;
                        y = size + 1 - (i + j) - 2;
                        w = 2; h = 4;
                    } else if (!oddI && !oddJ) {
                        color = "green";
                        x = j - i - 2;
                        y = size + 1 - (i + j) - 1;
                        w = 4; h = 2;
                    } else {
                        color = "red";
                        x = j - i - 1;
                        y = size + 1 - (i + j) - 2;
                        w = 2; h = 4;
                    }

                    if (!first) oss << ",";
                    else first = false;
                    oss << "{\"x\":" << x << ",\"y\":" << y
                        << ",\"w\":" << w << ",\"h\":" << h
                        << ",\"color\":\"" << color << "\"}";
                }
            }
        }

        oss << "]";
        progressCounter = 100;
        emscripten_sleep(0);

        string json = oss.str();
        char* out = (char*)malloc(json.size() + 1);
        if (!out) throw std::runtime_error("Memory allocation failed");
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& e) {
        std::string errorMsg = std::string("{\"error\":\"") + e.what() + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        if (out) strcpy(out, errorMsg.c_str());
        progressCounter = 100;
        return out;
    }
}

} // extern "C"
