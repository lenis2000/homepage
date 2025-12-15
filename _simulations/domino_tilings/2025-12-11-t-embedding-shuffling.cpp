/*
  2025-12-11-t-embedding-shuffling.cpp

  Weighted EKLP shuffling for T-embedding page.
  Based on 2025-11-18-double-dimer-gamma.cpp (the correct slim functions).

  emcc 2025-12-11-t-embedding-shuffling.cpp -o 2025-12-11-t-embedding-shuffling.js -s WASM=1 -s ASYNCIFY=1 -s MODULARIZE=1 -s 'EXPORT_NAME="createShufflingModule"' -s "EXPORTED_FUNCTIONS=['_simulateAztecWithWeightMatrix','_simulateAztecGammaDirect','_simulateAztecPeriodicDirect','_simulateAztecIIDDirect','_freeString','_getProgress','_malloc','_free']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","setValue","getValue"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math && mv 2025-12-11-t-embedding-shuffling.js ../../js/
*/

#include <emscripten.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <random>
#include <sstream>
#include <string>
#include <cstdlib>
#include <cstring>
#include <functional>
#include "matrix_optimized.h"

using namespace std;

static std::mt19937 rng(std::random_device{}());

// Global progress counter
volatile int progressCounter = 0;

// Forward declarations
pair<vector<MatrixDouble>, vector<MatrixDouble>> d3pslim(const MatrixDouble &x1);
vector<MatrixDouble> probsslim(const MatrixDouble &x1);
MatrixInt delslideslim(const MatrixInt &x1);
MatrixInt createslim(MatrixInt &x0, const MatrixDouble &p);
MatrixInt aztecgenslim(const vector<MatrixDouble> &x0);

// d3pslim: computes the square move for all Aztec diamonds
// Returns pair of [weights matrix list, exponents matrix list]
pair<vector<MatrixDouble>, vector<MatrixDouble>> d3pslim(const MatrixDouble& x1) {
    int n = x1.size();
    int m = n / 2;

    vector<MatrixDouble> A1, A2;
    MatrixDouble B(n, n, 0.0);
    MatrixDouble C(n, n, 0.0);

    // Initialize first matrices
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (x1.at(i, j) == 0.0) {
                B.at(i, j) = 1.0;
                C.at(i, j) = 1.0;
            } else {
                B.at(i, j) = x1.at(i, j);
                C.at(i, j) = 0.0;
            }
        }
    }

    A1.push_back(B);
    A2.push_back(C);

    // Main loop
    for (int k = 0; k < m - 1; k++) {
        int size = n - 2*k - 2;
        B = MatrixDouble(size, size, 0.0);
        C = MatrixDouble(size, size, 0.0);

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                int idx_i = i + 2*(i%2);
                int idx_j = j + 2*(j%2);

                double a1_val = A1[k].at(idx_i, idx_j);
                double a1_exp = A2[k].at(idx_i, idx_j);

                double sum1_exp = A2[k].at(idx_i, idx_j) + A2[k].at(i+1, j+1);
                double sum2_exp = A2[k].at(idx_i, j+1) + A2[k].at(i+1, idx_j);

                double a2_val, a2_exp;

                if (sum1_exp == sum2_exp) {
                    a2_val = A1[k].at(idx_i, idx_j) * A1[k].at(i+1, j+1) +
                            A1[k].at(idx_i, j+1) * A1[k].at(i+1, idx_j);
                    a2_exp = sum1_exp;
                } else if (sum1_exp < sum2_exp) {
                    a2_val = A1[k].at(idx_i, idx_j) * A1[k].at(i+1, j+1);
                    a2_exp = sum1_exp;
                } else {
                    a2_val = A1[k].at(idx_i, j+1) * A1[k].at(i+1, idx_j);
                    a2_exp = sum2_exp;
                }

                B.at(i, j) = a1_val / a2_val;
                C.at(i, j) = a1_exp - a2_exp;
            }
        }

        A1.push_back(B);
        A2.push_back(C);
        emscripten_sleep(0);
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
        MatrixDouble C(size, size, 0.0);

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                double exp1 = a2[n-k-1].at(2*i, 2*j) + a2[n-k-1].at(2*i+1, 2*j+1);
                double exp2 = a2[n-k-1].at(2*i+1, 2*j) + a2[n-k-1].at(2*i, 2*j+1);

                if (exp1 > exp2) {
                    C.at(i, j) = 0.0;
                } else if (exp1 < exp2) {
                    C.at(i, j) = 1.0;
                } else {
                    double num = a1[n-k-1].at(2*i+1, 2*j+1) * a1[n-k-1].at(2*i, 2*j);
                    double den = num + a1[n-k-1].at(2*i+1, 2*j) * a1[n-k-1].at(2*i, 2*j+1);
                    C.at(i, j) = num / den;
                }
            }
        }
        A.push_back(C);
    }

    return A;
}

// delslideslim: deletion and sliding step
MatrixInt delslideslim(const MatrixInt& x1) {
    int n = x1.size();
    int m = n / 2;
    MatrixInt a0(n + 2, n + 2, 0);

    // Copy interior
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            a0.at(i+1, j+1) = x1.at(i, j);
        }
    }

    // Deletion step
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < m; j++) {
            if (a0.at(2*i, 2*j) == 1 && a0.at(2*i+1, 2*j+1) == 1) {
                a0.at(2*i, 2*j) = 0;
                a0.at(2*i+1, 2*j+1) = 0;
            } else if (a0.at(2*i, 2*j+1) == 1 && a0.at(2*i+1, 2*j) == 1) {
                a0.at(2*i+1, 2*j) = 0;
                a0.at(2*i, 2*j+1) = 0;
            }
        }
    }

    // Sliding step
    for (int i = 0; i <= m; i++) {
        for (int j = 0; j <= m; j++) {
            if (a0.at(2*i+1, 2*j+1) == 1) {
                a0.at(2*i, 2*j) = 1;
                a0.at(2*i+1, 2*j+1) = 0;
            } else if (a0.at(2*i, 2*j) == 1) {
                a0.at(2*i, 2*j) = 0;
                a0.at(2*i+1, 2*j+1) = 1;
            } else if (a0.at(2*i+1, 2*j) == 1) {
                a0.at(2*i, 2*j+1) = 1;
                a0.at(2*i+1, 2*j) = 0;
            } else if (a0.at(2*i, 2*j+1) == 1) {
                a0.at(2*i+1, 2*j) = 1;
                a0.at(2*i, 2*j+1) = 0;
            }
        }
    }

    return a0;
}

// createslim: creation step with probabilities
MatrixInt createslim(MatrixInt& x0, const MatrixDouble& p) {
    int n = x0.size();
    int m = n / 2;
    std::uniform_real_distribution<> uniform(0.0, 1.0);

    for (int i = 0; i < m; i++) {
        for (int j = 0; j < m; j++) {
            // Check if 2x2 block is empty
            if (x0.at(2*i, 2*j) == 0 && x0.at(2*i+1, 2*j) == 0 &&
                x0.at(2*i, 2*j+1) == 0 && x0.at(2*i+1, 2*j+1) == 0) {

                bool a1 = true, a2 = true, a3 = true, a4 = true;

                // Check left
                if (j > 0) {
                    a1 = (x0.at(2*i, 2*j-1) == 0) && (x0.at(2*i+1, 2*j-1) == 0);
                }

                // Check right
                if (j < m - 1) {
                    a2 = (x0.at(2*i, 2*j+2) == 0) && (x0.at(2*i+1, 2*j+2) == 0);
                }

                // Check top
                if (i > 0) {
                    a3 = (x0.at(2*i-1, 2*j) == 0) && (x0.at(2*i-1, 2*j+1) == 0);
                }

                // Check bottom
                if (i < m - 1) {
                    a4 = (x0.at(2*i+2, 2*j) == 0) && (x0.at(2*i+2, 2*j+1) == 0);
                }

                if (a1 && a2 && a3 && a4) {
                    if (uniform(rng) < p.at(i, j)) {
                        x0.at(2*i, 2*j) = 1;
                        x0.at(2*i+1, 2*j+1) = 1;
                    } else {
                        x0.at(2*i+1, 2*j) = 1;
                        x0.at(2*i, 2*j+1) = 1;
                    }
                }
            }
        }
    }

    return x0;
}

// aztecgenslim: generates an Aztec diamond using probabilities
MatrixInt aztecgenslim(const vector<MatrixDouble>& x0) {
    int n = x0.size();
    std::uniform_real_distribution<> uniform(0.0, 1.0);

    MatrixInt a1(2, 2, 0);
    if (uniform(rng) < x0[0].at(0, 0)) {
        a1.at(0, 0) = 1; a1.at(0, 1) = 0;
        a1.at(1, 0) = 0; a1.at(1, 1) = 1;
    } else {
        a1.at(0, 0) = 0; a1.at(0, 1) = 1;
        a1.at(1, 0) = 1; a1.at(1, 1) = 0;
    }

    for (int i = 0; i < n - 1; i++) {
        a1 = delslideslim(a1);
        a1 = createslim(a1, x0[i+1]);
        emscripten_sleep(0);
    }

    return a1;
}

// The EKLP shuffler takes EDGE WEIGHTS directly in ab_gamma format:
//   - Even rows (i % 2 == 0): actual edge weights
//   - Odd rows (i % 2 == 1): all 1.0
// NO cross-ratio computation needed - just pass edge weights!

// Generate Gamma EDGE WEIGHTS for EKLP shuffling (Duits-Van Peski model)
// EXACTLY matches ab_gamma from 2025-11-18-double-dimer-gamma.cpp
//
// Pattern:
//   - Even rows (i % 2 == 0): edge weights - Gamma(beta) at j even, Gamma(alpha) at j odd
//   - Odd rows (i % 2 == 1): all 1.0
MatrixDouble generateGammaEdgeWeights(int n, double alpha, double beta) {
    std::gamma_distribution<> gamma_a(alpha, 1.0);
    std::gamma_distribution<> gamma_b(beta, 1.0);

    int dim = 2 * n;
    MatrixDouble A(dim, dim, 1.0);  // Initialize all to 1.0

    for (int i = 0; i < dim; i++) {
        if (i % 2 == 0) {  // EVEN ROWS ONLY (matching ab_gamma exactly)
            for (int j = 0; j < dim; j++) {
                if (j % 2 == 0) {
                    A.at(i, j) = gamma_b(rng);  // beta
                } else {
                    A.at(i, j) = gamma_a(rng);  // alpha
                }
            }
        }
        // Odd rows stay 1.0 (already initialized)
    }
    return A;
}

// Generate k×l periodic EDGE WEIGHTS for EKLP shuffling
// Pattern: even rows get weights from table, odd rows = 1.0
MatrixDouble generatePeriodicEdgeWeights(int n, int k, int l, double* weights) {
    int dim = 2 * n;
    MatrixDouble A(dim, dim, 1.0);

    for (int i = 0; i < dim; i++) {
        if (i % 2 == 0) {  // Only even rows (EKLP convention)
            for (int j = 0; j < dim; j++) {
                int pi = (i / 2) % k;
                int pj = j % l;
                A.at(i, j) = weights[pi * l + pj];
            }
        }
    }
    return A;
}

// Generate IID EDGE WEIGHTS for EKLP shuffling
// Even rows: random edge weights, odd rows: 1.0
MatrixDouble generateIIDEdgeWeights(int n, double* randomValues) {
    int dim = 2 * n;
    MatrixDouble A(dim, dim, 1.0);
    int idx = 0;

    for (int i = 0; i < dim; i++) {
        if (i % 2 == 0) {  // Only even rows
            for (int j = 0; j < dim; j++) {
                A.at(i, j) = randomValues[idx++];
            }
        }
    }
    return A;
}

extern "C" {

// Simulate with IID edge weights (pre-generated in JS)
EMSCRIPTEN_KEEPALIVE
char* simulateAztecIIDDirect(int n, double* edgeWeights) {
    try {
        progressCounter = 0;
        if (n > 300) n = 300;

        // Generate edge weight matrix from pre-generated random values
        MatrixDouble A1a = generateIIDEdgeWeights(n, edgeWeights);

        emscripten_sleep(0);

        vector<MatrixDouble> prob = probsslim(A1a);
        progressCounter = 10;
        emscripten_sleep(0);

        MatrixInt dominoConfig = aztecgenslim(prob);
        progressCounter = 90;
        emscripten_sleep(0);

        ostringstream oss;
        oss << "[";
        int size = dominoConfig.size();
        bool first = true;

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (dominoConfig.at(i, j) == 1) {
                    double x, y, w, h;
                    string color;
                    bool oddI = (i & 1), oddJ = (j & 1);

                    if (oddI && oddJ) {
                        color = "blue"; x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                    } else if (oddI && !oddJ) {
                        color = "yellow"; x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
                    } else if (!oddI && !oddJ) {
                        color = "green"; x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                    } else {
                        color = "red"; x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
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

// Simulate with k×l periodic edge weights
EMSCRIPTEN_KEEPALIVE
char* simulateAztecPeriodicDirect(int n, int k, int l, double* weights) {
    try {
        progressCounter = 0;

        // Hard limit: N <= 300
        if (n > 300) n = 300;

        // Generate periodic edge weights directly
        MatrixDouble A1a = generatePeriodicEdgeWeights(n, k, l, weights);

        emscripten_sleep(0);

        // Compute probability matrices
        vector<MatrixDouble> prob = probsslim(A1a);
        progressCounter = 10;
        emscripten_sleep(0);

        // Generate domino configuration
        MatrixInt dominoConfig = aztecgenslim(prob);
        progressCounter = 90;
        emscripten_sleep(0);

        // Build JSON output
        ostringstream oss;
        oss << "[";
        int size = dominoConfig.size();
        bool first = true;

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (dominoConfig.at(i, j) == 1) {
                    double x, y, w, h;
                    string color;
                    bool oddI = (i & 1), oddJ = (j & 1);

                    if (oddI && oddJ) {
                        color = "blue"; x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                    } else if (oddI && !oddJ) {
                        color = "yellow"; x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
                    } else if (!oddI && !oddJ) {
                        color = "green"; x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                    } else {
                        color = "red"; x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
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

// Simulate with Gamma edge weights (Duits-Van Peski)
EMSCRIPTEN_KEEPALIVE
char* simulateAztecGammaDirect(int n, double alpha, double beta) {
    try {
        progressCounter = 0;

        // Hard limit: N <= 300
        if (n > 300) n = 300;

        // Generate Gamma edge weights (ab_gamma pattern)
        MatrixDouble A1a = generateGammaEdgeWeights(n, alpha, beta);

        emscripten_sleep(0);

        // Compute probability matrices
        vector<MatrixDouble> prob = probsslim(A1a);
        progressCounter = 10;
        emscripten_sleep(0);

        // Generate domino configuration
        MatrixInt dominoConfig = aztecgenslim(prob);
        progressCounter = 90;
        emscripten_sleep(0);

        // Build JSON output
        ostringstream oss;
        oss << "[";
        int size = dominoConfig.size();
        bool first = true;

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (dominoConfig.at(i, j) == 1) {
                    double x, y, w, h;
                    string color;
                    bool oddI = (i & 1), oddJ = (j & 1);

                    if (oddI && oddJ) {
                        color = "blue"; x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                    } else if (oddI && !oddJ) {
                        color = "yellow"; x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
                    } else if (!oddI && !oddJ) {
                        color = "green"; x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                    } else {
                        color = "red"; x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
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

EMSCRIPTEN_KEEPALIVE
char* simulateAztecWithWeightMatrix(int n, double* weights) {
    try {
        progressCounter = 0;

        // Hard limit: N <= 300 (enforced in JS, but cap here as safety)
        // Memory constraint: algorithm uses O(N³) memory
        if (n > 300) n = 300;

        int dim = 2 * n;

        // Copy weights into MatrixDouble
        MatrixDouble A1a(dim, dim, 1.0);
        for (int i = 0; i < dim; ++i) {
            for (int j = 0; j < dim; ++j) {
                A1a.at(i, j) = weights[i * dim + j];
            }
        }

        emscripten_sleep(0);

        // Compute probability matrices using slim version
        vector<MatrixDouble> prob;
        try {
            prob = probsslim(A1a);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error computing probability matrices");
        }
        progressCounter = 10;
        emscripten_sleep(0);

        // Generate domino configuration using slim version
        MatrixInt dominoConfig;
        try {
            dominoConfig = aztecgenslim(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating domino configuration");
        }

        progressCounter = 90;
        emscripten_sleep(0);

        // Build JSON output
        ostringstream oss;
        oss << "[";
        int size = dominoConfig.size();
        bool first = true;

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                if (dominoConfig.at(i, j) == 1) {
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

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

} // extern "C"
