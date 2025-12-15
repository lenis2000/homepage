/*
  2025-12-11-t-embedding-shuffling.cpp

  Weighted EKLP shuffling for T-embedding page.
  Based on 2025-11-18-double-dimer-gamma.cpp (the correct slim functions).

  emcc 2025-12-11-t-embedding-shuffling.cpp -o 2025-12-11-t-embedding-shuffling.js -s WASM=1 -s ASYNCIFY=1 -s MODULARIZE=1 -s 'EXPORT_NAME="createShufflingModule"' -s "EXPORTED_FUNCTIONS=['_simulateAztecWithWeightMatrix','_simulateAztecGammaEdges','_freeString','_getProgress','_malloc','_free']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","setValue","getValue"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math && mv 2025-12-11-t-embedding-shuffling.js ../../js/
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

// Compute face weight matrix from edge weights
// For T-embedding convention: black faces have edges α (bottom), β (right), γ (left), 1 (top)
// Cross-ratio = (bottom * top) / (left * right) = α / (γ * β) = α / (βγ)
// But the exact formula depends on conventions - this implements the standard one
MatrixDouble computeFaceWeightsFromEdges(int n,
    const std::function<double(int,int,char)>& getEdgeWeight) {
    // getEdgeWeight(i, j, dir) returns the edge weight at face (i,j) in direction dir
    // dir: 'N'=north/top, 'E'=east/right, 'S'=south/bottom, 'W'=west/left

    int dim = 2 * n;
    MatrixDouble faceWeights(dim, dim, 1.0);

    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            // Only non-trivial weights on even rows (matching ab_gamma pattern)
            if (i % 2 == 0) {
                double wN = getEdgeWeight(i, j, 'N');
                double wE = getEdgeWeight(i, j, 'E');
                double wS = getEdgeWeight(i, j, 'S');
                double wW = getEdgeWeight(i, j, 'W');

                // Cross-ratio: (wS * wN) / (wW * wE)
                // With wN = 1 typically: wS / (wW * wE)
                double denom = wW * wE;
                if (denom < 1e-12) denom = 1e-12;
                faceWeights.at(i, j) = (wS * wN) / denom;
            }
        }
    }

    return faceWeights;
}

// Simple gamma-distributed edge weights matching T-embedding gamma preset
// α-edges get Gamma(alpha), β-edges get Gamma(beta), others get 1
MatrixDouble computeGammaFaceWeights(int n, double alpha, double beta) {
    std::gamma_distribution<> gamma_a(alpha, 1.0);
    std::gamma_distribution<> gamma_b(beta, 1.0);

    int dim = 2 * n;
    MatrixDouble faceWeights(dim, dim, 1.0);

    // For each face, compute cross-ratio from edge weights
    // T-embedding pattern: black faces have α (S), β (E), γ (W), 1 (N)
    // For gamma preset: α-edges ~ Gamma(alpha), β-edges ~ Gamma(beta), γ=1, top=1

    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            if (i % 2 == 0) {
                // This face has edge weights
                double alpha_edge = gamma_a(rng);  // α edge (bottom/south)
                double beta_edge = gamma_b(rng);   // β edge (right/east)
                double gamma_edge = 1.0;           // γ edge (left/west)
                double one_edge = 1.0;             // 1 edge (top/north)

                // Cross-ratio = (α * 1) / (γ * β) = α / (γβ) = α / β (since γ=1)
                faceWeights.at(i, j) = alpha_edge / beta_edge;
            }
        }
    }

    return faceWeights;
}

extern "C" {

// Simulate with gamma-distributed edge weights converted to face weights via cross-ratio
EMSCRIPTEN_KEEPALIVE
char* simulateAztecGammaEdges(int n, double alpha, double beta) {
    try {
        progressCounter = 0;
        int dim = 2 * n;

        if (dim > 1000) {
            throw std::runtime_error("Input size too large");
        }

        // Compute face weights from gamma-distributed edge weights
        MatrixDouble A1a = computeGammaFaceWeights(n, alpha, beta);

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
        int dim = 2 * n;

        if (dim > 1000) {
            throw std::runtime_error("Input size too large");
        }

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
