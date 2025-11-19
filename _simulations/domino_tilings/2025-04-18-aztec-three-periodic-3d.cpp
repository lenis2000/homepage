/*

emcc 2025-04-18-aztec-three-periodic-3d.cpp -o 2025-04-18-aztec-three-periodic-3d.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
mv 2025-04-18-aztec-three-periodic-3d.js ../../js/



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

using MatrixDouble = vector<vector<double>>;
using MatrixInt = vector<vector<int>>;
using Vertex = pair<int, int>;

// d3pslim: computes the square move for all Aztec diamonds
// Returns pair of [weights matrix list, exponents matrix list]
pair<vector<MatrixDouble>, vector<MatrixDouble>> d3pslim(const MatrixDouble& x1) {
    int n = x1.size();
    int m = n / 2;

    vector<MatrixDouble> A1, A2;
    MatrixDouble B(n, vector<double>(n, 0.0));
    MatrixDouble C(n, vector<double>(n, 0.0));

    // Initialize first matrices
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (x1[i][j] == 0.0) {
                B[i][j] = 1.0;
                C[i][j] = 1.0;
            } else {
                B[i][j] = x1[i][j];
                C[i][j] = 0.0;
            }
        }
    }

    A1.push_back(B);
    A2.push_back(C);

    // Main loop
    for (int k = 0; k < m - 1; k++) {
        int size = n - 2*k - 2;
        B = MatrixDouble(size, vector<double>(size, 0.0));
        C = MatrixDouble(size, vector<double>(size, 0.0));

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                int idx_i = i + 2*(i%2);
                int idx_j = j + 2*(j%2);

                double a1_val = A1[k][idx_i][idx_j];
                double a1_exp = A2[k][idx_i][idx_j];

                double sum1_exp = A2[k][idx_i][idx_j] + A2[k][i+1][j+1];
                double sum2_exp = A2[k][idx_i][j+1] + A2[k][i+1][idx_j];

                double a2_val, a2_exp;

                if (sum1_exp == sum2_exp) {
                    a2_val = A1[k][idx_i][idx_j] * A1[k][i+1][j+1] +
                            A1[k][idx_i][j+1] * A1[k][i+1][idx_j];
                    a2_exp = sum1_exp;
                } else if (sum1_exp < sum2_exp) {
                    a2_val = A1[k][idx_i][idx_j] * A1[k][i+1][j+1];
                    a2_exp = sum1_exp;
                } else {
                    a2_val = A1[k][idx_i][j+1] * A1[k][i+1][idx_j];
                    a2_exp = sum2_exp;
                }

                B[i][j] = a1_val / a2_val;
                C[i][j] = a1_exp - a2_exp;
            }
        }

        A1.push_back(B);
        A2.push_back(C);
    }

    return {A1, A2};
}

// probsslim: outputs the probabilities needed for creation steps
vector<MatrixDouble> probsslim(const MatrixDouble& x1) {
    auto [a1, a2] = d3pslim(x1);
    int n = a1.size();
    vector<MatrixDouble> A;

    for (int k = 0; k < n; k++) {
        int size = k + 1;
        MatrixDouble C(size, vector<double>(size, 0.0));

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                double exp1 = a2[n-k-1][2*i][2*j] + a2[n-k-1][2*i+1][2*j+1];
                double exp2 = a2[n-k-1][2*i+1][2*j] + a2[n-k-1][2*i][2*j+1];

                if (exp1 > exp2) {
                    C[i][j] = 0.0;
                } else if (exp1 < exp2) {
                    C[i][j] = 1.0;
                } else {
                    double num = a1[n-k-1][2*i+1][2*j+1] * a1[n-k-1][2*i][2*j];
                    double den = num + a1[n-k-1][2*i+1][2*j] * a1[n-k-1][2*i][2*j+1];
                    C[i][j] = num / den;
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

        // Create weight matrix A1a: dimensions 2*n x 2*n with 3x3 periodic pattern
        int dim = 2 * n;

        // Check if memory allocation would be too large
        if (dim > 1000) {
            throw std::runtime_error("Input size too large, would exceed memory limits");
        }

        MatrixDouble A1a(dim, vector<double>(dim, 0.0));
        
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
        
        emscripten_sleep(0); // Yield to update UI

        // Compute probability matrices.
        vector<MatrixDouble> prob;
        try {
            prob = probsslim(A1a);
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

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

} // extern "C"
