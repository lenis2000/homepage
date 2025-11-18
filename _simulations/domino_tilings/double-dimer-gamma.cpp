/*
emcc double-dimer-gamma.cpp -o double-dimer-gamma.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_simulateAztecWithWeights','_simulateAztecWithWeightsAndDist','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv double-dimer-gamma.js ../../js/

Features:
- Gamma-disordered Aztec diamond with double dimer configurations
- Two independent samples from the same weighted measure
- Gamma-distributed weights on NE/SE edges (even rows)
- Fixed weights (=1) on NW/SW edges (odd rows)
- TikZ export functionality
- Memory optimized implementation with flat matrices
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

static std::mt19937 rng(std::random_device{}()); // Global RNG for speed

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

// Forward declarations
vector<Matrix> d3p(const MatrixDouble &x1);
vector<MatrixDouble> probs2(const MatrixDouble &x1);
MatrixInt delslide(const MatrixInt &x1);
MatrixInt create(MatrixInt x0, const MatrixDouble &p);
MatrixInt aztecgen(const vector<MatrixDouble> &x0);

// Enum for weight distribution types
enum class WeightDistribution {
    BERNOULLI = 0,
    GAUSSIAN = 1,
    GAMMA = 2
};

// Function to generate random weights from Bernoulli distribution
MatrixDouble generateBernoulliWeights(int dim, double value1, double value2, double prob1) {
    MatrixDouble weights(dim, dim);
    std::uniform_real_distribution<> dis(0.0, 1.0);
    
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            // Sample from Bernoulli distribution
            weights.at(i, j) = (dis(rng) < prob1) ? value1 : value2;
        }
    }
    
    return weights;
}

// Function to generate random weights from Gaussian distribution
MatrixDouble generateGaussianWeights(int dim, double beta) {
    MatrixDouble weights(dim, dim);
    std::normal_distribution<> normal(0.0, 1.0); // Standard normal
    
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            // Sample X from standard normal, weight = exp(beta * X)
            double X = normal(rng);
            weights.at(i, j) = exp(beta * X);
        }
    }
    
    return weights;
}

// Function to generate gamma-distributed weights on specific edges
// For i even: j even uses Gamma(alpha,1) for a_{i,j}, j odd uses Gamma(beta,1) for b_{i,j}
// For i odd: weight = 1
MatrixDouble generateGammaWeights(int dim, double alpha, double beta) {
    MatrixDouble weights(dim, dim);
    std::gamma_distribution<> gamma_alpha(alpha, 1.0); // shape = alpha, scale = 1
    std::gamma_distribution<> gamma_beta(beta, 1.0);   // shape = beta, scale = 1

    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            if (i % 2 == 0) {
                // i is even: use gamma distribution
                if (j % 2 == 0) {
                    // j is even: a_{i,j} ~ Gamma(alpha, 1)
                    weights.at(i, j) = gamma_alpha(rng);
                } else {
                    // j is odd: b_{i,j} ~ Gamma(beta, 1)
                    weights.at(i, j) = gamma_beta(rng);
                }
            } else {
                // i is odd: use weight 1 (NW/SW edges)
                weights.at(i, j) = 1.0;
            }
        }
    }

    return weights;
}

// General function to generate random weights based on distribution type
MatrixDouble generateRandomWeights(int dim, WeightDistribution distType, double param1, double param2, double param3) {
    if (distType == WeightDistribution::GAUSSIAN) {
        // For Gaussian, param1 is beta, param2 and param3 are ignored
        return generateGaussianWeights(dim, param1);
    } else if (distType == WeightDistribution::GAMMA) {
        // For Gamma, param1 is alpha, param2 is beta, param3 is ignored
        return generateGammaWeights(dim, param1, param2);
    } else {
        // For Bernoulli, param1 is value1, param2 is value2, param3 is prob1
        return generateBernoulliWeights(dim, param1, param2, param3);
    }
}

// d3p: builds a vector of matrices from x1. Now uses flat matrix implementation.
vector<Matrix> d3p(const MatrixDouble &x1) {
    int n = x1.size();
    Matrix A(n, n);
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            A.at(i, j) = (fabs(x1.at(i, j)) < 1e-9) ? Cell{1.0, 1} : Cell{x1.at(i, j), 0};
        }
    }
    vector<Matrix> AA;
    AA.reserve(n/2); // Pre-allocate to avoid reallocations
    AA.push_back(A);

    int iterations = n / 2 - 1; // Assumes n is even.
    for (int k = 0; k < iterations; k++){
        int nk = n - 2 * k - 2;
        Matrix C(nk, nk);
        const Matrix &prev = AA[k];
        for (int i = 0; i < nk; i++){
            for (int j = 0; j < nk; j++){
                int ii = i + 2 * (i & 1);  // instead of i % 2
                int jj = j + 2 * (j & 1);  // instead of j % 2
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
                C.at(i, j) = { current.value / a2, current.flag - static_cast<int>(a2_second) };
            }
        }
        AA.push_back(C);
        emscripten_sleep(0); // Yield periodically during heavy computation
    }
    return AA;
}

// probs2: compute probability matrices from the d3p output.
vector<MatrixDouble> probs2(const MatrixDouble &x1) {
    vector<Matrix> a0 = d3p(x1);
    int n = a0.size();
    vector<MatrixDouble> A;
    A.reserve(n); // Pre-allocate to avoid reallocations

    for (int k = 0; k < n; k++){
        const Matrix &mat = a0[n - k - 1];
        int nk = mat.size();
        int rows = nk / 2;
        MatrixDouble C(rows, rows, 0.0);
        for (int i = 0; i < rows; i++){
            for (int j = 0; j < rows; j++){
                int i0 = i << 1;  // 2*i
                int j0 = j << 1;  // 2*j
                int sum1 = mat.at(i0, j0).flag + mat.at(i0 + 1, j0 + 1).flag;
                int sum2 = mat.at(i0 + 1, j0).flag + mat.at(i0, j0 + 1).flag;
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

// delslide: deletion-slide procedure with optimized flat matrices.
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

// create: decide domino orientation in each 2x2 block using probabilities.
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

// aztecgen: iterate deletion-slide and creation steps.
MatrixInt aztecgen(const vector<MatrixDouble> &x0) {
    int n = (int)x0.size();
    std::uniform_real_distribution<> dis(0.0, 1.0);

    // Initialize with a 2x2 configuration using the first probability.
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
        // Don't update progress here anymore - it's handled in simulateAztec
        emscripten_sleep(0); // Yield control periodically
    }
    return a1;
}

// ---------------------------------------------------------------------
// simulateAztec
//
// Exported function callable from JavaScript.
// It creates a 2*n x 2*n weight matrix, runs the simulation,
// and returns a JSON string with TWO domino placements.
// ---------------------------------------------------------------------
extern "C" {

// Forward declaration inside extern "C"
char* simulateAztecWithWeightsAndDist(int n, int distType, double param1, double param2, double param3);

EMSCRIPTEN_KEEPALIVE
char* simulateAztecWithWeights(int n, double value1, double value2, double prob1) {
    // This function maintains backward compatibility for Bernoulli weights
    return simulateAztecWithWeightsAndDist(n, 0, value1, value2, prob1);
}

EMSCRIPTEN_KEEPALIVE
char* simulateAztecWithWeightsAndDist(int n, int distType, double param1, double param2, double param3) {
    try {
        progressCounter = 0; // Reset progress.

        // Create weight matrix A1a: dimensions 2*n x 2*n, with random weights
        int dim = 2 * n;
        WeightDistribution distribution = static_cast<WeightDistribution>(distType);
        MatrixDouble A1a = generateRandomWeights(dim, distribution, param1, param2, param3);

        // Compute probability matrices.
        vector<MatrixDouble> prob;
        try {
            prob = probs2(A1a);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error computing probability matrices");
        }
        progressCounter = 5; // Probabilities computed.
        emscripten_sleep(0); // Yield to update UI

        // Generate FIRST domino configuration.
        MatrixInt dominoConfig1;
        try {
            dominoConfig1 = aztecgen(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating first domino configuration");
        }
        progressCounter = 45; // First simulation complete.
        emscripten_sleep(0); // Yield to update UI

        // Generate SECOND domino configuration (independent).
        MatrixInt dominoConfig2;
        try {
            dominoConfig2 = aztecgen(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating second domino configuration");
        }
        progressCounter = 90; // Both simulations complete.
        emscripten_sleep(0); // Yield to update UI

        // Build JSON output with pre-allocated string for efficiency
        int size1 = dominoConfig1.size();
        int size2 = dominoConfig2.size();
        double scale = 10.0;

        // Reserve a reasonable amount of space for the JSON string
        // Each domino needs ~100 chars, and about 1/4 of the cells will be dominoes
        // Now we have TWO configurations, plus weight matrix
        size_t estimatedJsonSize = (size1 * size1 / 4 + size2 * size2 / 4) * 100 + 2000;
        string json;
        json.reserve(estimatedJsonSize > 2048 ? estimatedJsonSize : 2048);
        
        // Add weight matrix sample (8x8 upper-left corner)
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
        char buffer[128]; // Buffer for formatting numbers

        // Process FIRST configuration
        for (int i = 0; i < size1; i++){
            for (int j = 0; j < size1; j++){
                if (dominoConfig1.at(i, j) == 1) {
                    double x, y, w, h;
                    const char* color;

                    // Determine domino properties based on position
                    bool oddI = (i & 1), oddJ = (j & 1);
                    if (oddI && oddJ) { // i odd, j odd: Blue
                        color = "blue";
                        x = j - i - 2;
                        y = size1 + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (oddI && !oddJ) { // i odd, j even: Yellow
                        color = "yellow";
                        x = j - i - 1;
                        y = size1 + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else if (!oddI && !oddJ) { // i even, j even: Green
                        color = "green";
                        x = j - i - 2;
                        y = size1 + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (!oddI && oddJ) { // i even, j odd: Red
                        color = "red";
                        x = j - i - 1;
                        y = size1 + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else {
                        continue;
                    }
                    
                    x *= scale;
                    y *= scale;
                    w *= scale;
                    h *= scale;
                    
                    if (!first) json.append(",");
                    else first = false;

                    // Use sprintf for efficient number formatting
                    snprintf(buffer, sizeof(buffer), 
                             "{\"x\":%g,\"y\":%g,\"w\":%g,\"h\":%g,\"color\":\"%s\"}", 
                             x, y, w, h, color);
                    json.append(buffer);
                }
            }
        }
        
        json.append("],\"config2\":[");
        
        // Process SECOND configuration
        first = true;
        for (int i = 0; i < size2; i++){
            for (int j = 0; j < size2; j++){
                if (dominoConfig2.at(i, j) == 1) {
                    double x, y, w, h;
                    const char* color;

                    // Determine domino properties based on position
                    bool oddI = (i & 1), oddJ = (j & 1);
                    if (oddI && oddJ) { // i odd, j odd: Blue
                        color = "blue";
                        x = j - i - 2;
                        y = size2 + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (oddI && !oddJ) { // i odd, j even: Yellow
                        color = "yellow";
                        x = j - i - 1;
                        y = size2 + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else if (!oddI && !oddJ) { // i even, j even: Green
                        color = "green";
                        x = j - i - 2;
                        y = size2 + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (!oddI && oddJ) { // i even, j odd: Red
                        color = "red";
                        x = j - i - 1;
                        y = size2 + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else {
                        continue;
                    }
                    
                    x *= scale;
                    y *= scale;
                    w *= scale;
                    h *= scale;
                    
                    if (!first) json.append(",");
                    else first = false;

                    // Use sprintf for efficient number formatting
                    snprintf(buffer, sizeof(buffer), 
                             "{\"x\":%g,\"y\":%g,\"w\":%g,\"h\":%g,\"color\":\"%s\"}", 
                             x, y, w, h, color);
                    json.append(buffer);
                }
            }
        }
        
        json.append("]}");
        progressCounter = 100; // Finished.

        // Allocate memory for the output string
        char* out = NULL;
        try {
            out = (char*)malloc(json.size() + 1);
            if (!out) {
                throw std::runtime_error("Failed to allocate memory for output");
            }
            strcpy(out, json.c_str());
            return out;
        } catch (const std::exception& e) {
            // If memory allocation fails, return a simple error message
            const char* errorMsg = "{\"error\":\"Memory allocation failed\"}";
            out = (char*)malloc(strlen(errorMsg) + 1);
            if (out) {
                strcpy(out, errorMsg);
            } else {
                // If we can't even allocate the error message, return a minimal response
                out = (char*)malloc(3); // size for []
                if (out) {
                    strcpy(out, "[]");
                }
            }
            return out;
        }
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

// Default wrapper function that uses the original values
EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n) {
    return simulateAztecWithWeights(n, 0.5, 1.5, 0.5);
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