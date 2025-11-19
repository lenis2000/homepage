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
vector<Matrix> d3p(const MatrixDouble &x1);
vector<MatrixDouble> probs2(const MatrixDouble &x1);
MatrixInt delslide(const MatrixInt &x1);
MatrixInt create(MatrixInt x0, const MatrixDouble &p);
MatrixInt aztecgen(const vector<MatrixDouble> &x0);

// Implementation matching Julia's ab_gamma function (lines 252-267 in simulatorfinal.jl)
// Translates from Julia 1-indexed to C++ 0-indexed:
// Julia: i odd (1,3,5...) -> C++: i even (0,2,4...)
// Julia: i even (2,4,6...) -> C++: i odd (1,3,5...)
// When i is even (0-indexed) and j is even: use Gamma(beta, 1) [bshape]
// When i is even (0-indexed) and j is odd: use Gamma(alpha, 1) [ashape]
// When i is odd (0-indexed): weight is 1.0 for all j
MatrixDouble generateBiasedGammaWeights(int dim, double alpha, double beta) {
    MatrixDouble weights(dim, dim);
    std::gamma_distribution<> gamma_a(alpha, 1.0);
    std::gamma_distribution<> gamma_b(beta, 1.0);

    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            if (i % 2 == 1) {
                // Odd i (0-indexed): weight is 1
                weights.at(i, j) = 1.0;
            } else {
                // Even i (0-indexed): weight depends on parity of j
                if (j % 2 == 0) {
                    // Even j: use beta (bshape)
                    weights.at(i, j) = gamma_b(rng);
                } else {
                    // Odd j: use alpha (ashape)
                    weights.at(i, j) = gamma_a(rng);
                }
            }
        }
    }
    return weights;
}

// d3p, probs2, delslide, create, aztecgen are standard shuffling functions
// We retain the optimized flat matrix implementation
vector<Matrix> d3p(const MatrixDouble &x1) {
    int n = x1.size();
    Matrix A(n, n);
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            A.at(i, j) = (fabs(x1.at(i, j)) < 1e-9) ? Cell{1.0, 1} : Cell{x1.at(i, j), 0};
        }
    }
    vector<Matrix> AA;
    AA.reserve(n/2);
    AA.push_back(A);

    int iterations = n / 2 - 1;
    for (int k = 0; k < iterations; k++){
        int nk = n - 2 * k - 2;
        Matrix C(nk, nk);
        const Matrix &prev = AA[k];
        for (int i = 0; i < nk; i++){
            for (int j = 0; j < nk; j++){
                int ii = i + 2 * (i & 1);
                int jj = j + 2 * (j & 1);
                const Cell &current = prev.at(ii, jj);
                const Cell &diag    = prev.at(i + 1, j + 1);
                const Cell &right   = prev.at(ii, j + 1);
                const Cell &down    = prev.at(i + 1, jj);
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
                C.at(i, j) = { current.value / a2, current.flag - a2_second };
            }
        }
        AA.push_back(C);
        emscripten_sleep(0);
    }
    return AA;
}

vector<MatrixDouble> probs2(const MatrixDouble &x1) {
    vector<Matrix> a0 = d3p(x1);
    int n = a0.size();
    vector<MatrixDouble> A;
    A.reserve(n);

    for (int k = 0; k < n; k++){
        const Matrix &mat = a0[n - k - 1];
        int nk = mat.size();
        int rows = nk / 2;
        MatrixDouble C(rows, rows, 0.0);
        for (int i = 0; i < rows; i++){
            for (int j = 0; j < rows; j++){
                int i0 = i << 1;
                int j0 = j << 1;
                double sum1 = mat.at(i0, j0).flag + mat.at(i0 + 1, j0 + 1).flag;
                double sum2 = mat.at(i0 + 1, j0).flag + mat.at(i0, j0 + 1).flag;
                if (sum1 > sum2) {
                    C.at(i, j) = 0.0;
                } else if (sum1 < sum2) {
                    C.at(i, j) = 1.0;
                } else {
                    double prod_main  = mat.at(i0 + 1, j0 + 1).value * mat.at(i0, j0).value;
                    double prod_other = mat.at(i0 + 1, j0).value * mat.at(i0, j0 + 1).value;
                    double denom = prod_main + prod_other;
                    if (fabs(denom) < 1e-9) denom = 1e-9;
                    C.at(i, j) = prod_main / denom;
                }
            }
        }
        A.push_back(C);
    }
    return A;
}

MatrixInt delslide(const MatrixInt &x1) {
    int n = x1.size();
    MatrixInt a0(n + 2, n + 2, 0);
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            a0.at(i + 1, j + 1) = x1.at(i, j);
        }
    }
    int half = n / 2;
    for (int i = 0; i < half; i++){
        for (int j = 0; j < half; j++){
            int i2 = i << 1, j2 = j << 1;
            if (a0.at(i2, j2) == 1 && a0.at(i2 + 1, j2 + 1) == 1) {
                a0.at(i2, j2) = 0;
                a0.at(i2 + 1, j2 + 1) = 0;
            } else if (a0.at(i2, j2 + 1) == 1 && a0.at(i2 + 1, j2) == 1) {
                a0.at(i2 + 1, j2) = 0;
                a0.at(i2, j2 + 1) = 0;
            }
        }
    }
    for (int i = 0; i < half + 1; i++){
        for (int j = 0; j < half + 1; j++){
            int i2 = i << 1, j2 = j << 1;
            if (a0.at(i2 + 1, j2 + 1) == 1) {
                a0.at(i2, j2) = 1;
                a0.at(i2 + 1, j2 + 1) = 0;
            } else if (a0.at(i2, j2) == 1) {
                a0.at(i2, j2) = 0;
                a0.at(i2 + 1, j2 + 1) = 1;
            } else if (a0.at(i2 + 1, j2) == 1) {
                a0.at(i2, j2 + 1) = 1;
                a0.at(i2 + 1, j2) = 0;
            } else if (a0.at(i2, j2 + 1) == 1) {
                a0.at(i2 + 1, j2) = 1;
                a0.at(i2, j2 + 1) = 0;
            }
        }
    }
    return a0;
}

MatrixInt create(MatrixInt x0, const MatrixDouble &p) {
    int n = x0.size();
    int half = n / 2;
    for (int i = 0; i < half; i++){
        for (int j = 0; j < half; j++){
            int i2 = i << 1, j2 = j << 1;
            if (x0.at(i2, j2) == 0 && x0.at(i2 + 1, j2) == 0 &&
                x0.at(i2, j2 + 1) == 0 && x0.at(i2 + 1, j2 + 1) == 0) {
                bool a1 = true, a2 = true, a3 = true, a4 = true;
                if (j > 0)
                    a1 = (x0.at(i2, j2 - 1) == 0) && (x0.at(i2 + 1, j2 - 1) == 0);
                if (j < half - 1)
                    a2 = (x0.at(i2, j2 + 2) == 0) && (x0.at(i2 + 1, j2 + 2) == 0);
                if (i > 0)
                    a3 = (x0.at(i2 - 1, j2) == 0) && (x0.at(i2 - 1, j2 + 1) == 0);
                if (i < half - 1)
                    a4 = (x0.at(i2 + 2, j2) == 0) && (x0.at(i2 + 2, j2 + 1) == 0);
                if (a1 && a2 && a3 && a4) {
                    std::uniform_real_distribution<> dis(0.0, 1.0);
                    double r = dis(rng);
                    if (r < p.at(i, j)) {
                        x0.at(i2, j2) = 1;
                        x0.at(i2 + 1, j2 + 1) = 1;
                    } else {
                        x0.at(i2 + 1, j2) = 1;
                        x0.at(i2, j2 + 1) = 1;
                    }
                }
            }
        }
    }
    return x0;
}

MatrixInt aztecgen(const vector<MatrixDouble> &x0) {
    int n = (int)x0.size();
    std::uniform_real_distribution<> dis(0.0, 1.0);
    MatrixInt a1(2, 2);
    if (dis(rng) < x0[0].at(0, 0)) {
        a1.at(0, 0) = 1; a1.at(0, 1) = 0;
        a1.at(1, 0) = 0; a1.at(1, 1) = 1;
    } else {
        a1.at(0, 0) = 0; a1.at(0, 1) = 1;
        a1.at(1, 0) = 1; a1.at(1, 1) = 0;
    }
    int totalIterations = n - 1;
    for (int i = 0; i < totalIterations; i++){
        a1 = delslide(a1);
        a1 = create(a1, x0[i + 1]);
        emscripten_sleep(0);
    }
    return a1;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateBiasedGamma(int n, double alpha, double beta) {
    try {
        progressCounter = 0;

        // Create biased Gamma weights: 2*n x 2*n
        int dim = 2 * n;
        MatrixDouble A1a = generateBiasedGammaWeights(dim, alpha, beta);

        vector<MatrixDouble> prob;
        try {
            prob = probs2(A1a);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error computing probability matrices");
        }
        progressCounter = 5;
        emscripten_sleep(0);

        // First configuration
        MatrixInt dominoConfig1;
        try {
            dominoConfig1 = aztecgen(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating first domino configuration");
        }
        progressCounter = 45;
        emscripten_sleep(0);

        // Second configuration
        MatrixInt dominoConfig2;
        try {
            dominoConfig2 = aztecgen(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating second domino configuration");
        }
        progressCounter = 90;
        emscripten_sleep(0);

        // JSON Generation
        int size1 = dominoConfig1.size();
        int size2 = dominoConfig2.size();
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
