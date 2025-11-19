/*
emcc 2025-11-18-double-dimer-gamma.cpp -o 2025-11-18-double-dimer-gamma.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateBiasedGamma','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
 mv 2025-11-18-double-dimer-gamma.js ../../js/
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

// ab_gamma: generates weights with gamma distribution
// For odd rows (i%2==0 in 0-indexed) and odd cols (j%2==0): Gamma(bshape, 1)
// For odd rows (i%2==0 in 0-indexed) and even cols (j%2==1): Gamma(ashape, 1)
// Everything else: 1.0
MatrixDouble ab_gamma(int n, double ashape, double bshape) {
    std::gamma_distribution<> gamma_a(ashape, 1.0);
    std::gamma_distribution<> gamma_b(bshape, 1.0);

    MatrixDouble A(2*n, 2*n, 1.0); // Initialize with 1.0

    for (int i = 0; i < 2*n; i++) {
        if (i % 2 == 0) {  // i is even in 0-indexed (odd in 1-indexed Julia)
            for (int j = 0; j < 2*n; j++) {
                if (j % 2 == 0) {  // j is even in 0-indexed (odd in 1-indexed)
                    A.at(i, j) = gamma_b(rng);
                } else {  // j is odd in 0-indexed (even in 1-indexed)
                    A.at(i, j) = gamma_a(rng);
                }
            }
        }
    }
    return A;
}

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

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateBiasedGamma(int n, double alpha, double beta) {
    try {
        progressCounter = 0;

        // Create biased Gamma weights using ab_gamma
        MatrixDouble A1a = ab_gamma(n, alpha, beta);

        vector<MatrixDouble> prob;
        try {
            prob = probsslim(A1a);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error computing probability matrices");
        }
        progressCounter = 5;
        emscripten_sleep(0);

        // First configuration
        MatrixInt dominoConfig1;
        try {
            dominoConfig1 = aztecgenslim(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating first domino configuration");
        }
        progressCounter = 45;
        emscripten_sleep(0);

        // Second configuration
        MatrixInt dominoConfig2;
        try {
            dominoConfig2 = aztecgenslim(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating second domino configuration");
        }
        progressCounter = 90;
        emscripten_sleep(0);

        // JSON Generation
        int size1 = dominoConfig1.size();
        int size2 = dominoConfig2.size();
        int dim = A1a.size();  // The weight matrix is 2*n x 2*n
        double scale = 10.0;
        size_t estimatedJsonSize = (size1 * size1 / 4 + size2 * size2 / 4) * 100 + 2000;
        string json;
        json.reserve(estimatedJsonSize > 2048 ? estimatedJsonSize : 2048);

        // Send weight matrix sample
        json.append("{\"weightMatrix\":[");
        int matrixSampleSize = std::min(8, dim);
        for (int i = 0; i < matrixSampleSize; i++) {
            if (i > 0) json.append(",");
            json.append("[");
            for (int j = 0; j < matrixSampleSize; j++) {
                if (j > 0) json.append(",");
                char weightBuffer[32];
                snprintf(weightBuffer, sizeof(weightBuffer), "%.2f", A1a.at(i, j));
                json.append(weightBuffer);
            }
            json.append("]");
        }
        json.append("],\"config1\":[");

        bool first = true;
        char buffer[128];

        auto appendConfig = [&](const MatrixInt& config, int size) {
            for (int i = 0; i < size; i++){
                for (int j = 0; j < size; j++){
                    if (config.at(i, j) == 1) {
                        double x, y, w, h;
                        const char* color;
                        bool oddI = (i & 1), oddJ = (j & 1);

                        if (oddI && oddJ) { // Blue
                            color = "blue"; x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                        } else if (oddI && !oddJ) { // Yellow
                            color = "yellow"; x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
                        } else if (!oddI && !oddJ) { // Green
                            color = "green"; x = j - i - 2; y = size + 1 - (i + j) - 1; w = 4; h = 2;
                        } else if (!oddI && oddJ) { // Red
                            color = "red"; x = j - i - 1; y = size + 1 - (i + j) - 2; w = 2; h = 4;
                        } else { continue; }

                        x *= scale; y *= scale; w *= scale; h *= scale;
                        if (!first) json.append(","); else first = false;
                        snprintf(buffer, sizeof(buffer),
                                 "{\"x\":%g,\"y\":%g,\"w\":%g,\"h\":%g,\"color\":\"%s\"}",
                                 x, y, w, h, color);
                        json.append(buffer);
                    }
                }
            }
        };

        appendConfig(dominoConfig1, size1);
        json.append("],\"config2\":[");
        first = true;
        appendConfig(dominoConfig2, size2);
        json.append("]}");

        progressCounter = 100;

        char* out = (char*)malloc(json.size() + 1);
        if (!out) throw std::runtime_error("Failed to allocate memory for output");
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
