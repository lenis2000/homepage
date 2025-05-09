/*
emcc 2025-05-09-random-weights-glauber.cpp -o 2025-05-09-random-weights-glauber.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec', '_performGlauberStep', '_performGlauberSteps', '_simulateAztecGlauber', '_freeString', '_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv 2025-05-09-random-weights-glauber.js ../../js/

Features:
- 2x2 periodic weights for random domino tilings of Aztec diamond
- Memory optimized implementation with flat matrices (May 2025)
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

/* ---------- Global state for incremental Glauber dynamics ---------- */
static MatrixInt      g_conf;         // current domino configuration
static MatrixDouble   g_W;            // current 2×2–periodic weight matrix
static int            g_N    = 0;     // linear size of g_conf (2n)
static double         g_a    = -1.0;  // last (a,b) used to build g_W
static double         g_b    = -1.0;

volatile int progressCounter = 0;

// Forward declarations
vector<Matrix> d3p(const MatrixDouble &x1);
vector<MatrixDouble> probs2(const MatrixDouble &x1);
MatrixInt delslide(const MatrixInt &x1);
MatrixInt create(MatrixInt x0, const MatrixDouble &p);
MatrixInt aztecgen(const vector<MatrixDouble> &x0);

// ---------- Glauber dynamics forward declarations ----------
double plaquetteWeight(int r, int c, bool horizontal, const MatrixDouble& W);
void glauberStep(MatrixInt &conf,
                 const MatrixDouble &W,
                 std::mt19937 &rng,
                 std::uniform_real_distribution<> &u);
// char* simulateAztecGlauber(int n, double a, double b, int sweeps);

// d3p: builds a vector of matrices from x1.
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
        // Update progress: scale from 10 to 90 over these iterations.
        progressCounter = 10 + (int)(((double)(i + 1) / totalIterations) * 80);
        emscripten_sleep(0); // Yield control so that progress updates are visible.
    }
    return a1;
}

// --- replace the old helper completely -------------------------------
double plaquetteWeight(int r,int c,bool horizontal,const MatrixDouble& W)
{
    /* exact Gibbs weights used by the shuffling sampler
         – "HH": markers on NW & SE  →  weight = w_NW · w_SE
         – "VV": markers on SW & NE  →  weight = w_SW · w_NE            */

    const double w00 = W.at(r,   c);     // NW
    const double w01 = W.at(r,   c+1);   // NE
    const double w10 = W.at(r+1, c);     // SW
    const double w11 = W.at(r+1, c+1);   // SE

    return horizontal ? (w00 * w11)      // w_HH
                      : (w10 * w01);     // w_VV
}


// One heat‑bath update on a random 2×2 plaquette
void glauberStep(MatrixInt &conf,
                 const MatrixDouble &W,
                 std::mt19937 &rng,
                 std::uniform_real_distribution<> &u)
{
    const int N = conf.size();               // lattice size (even)
    std::uniform_int_distribution<> duRow(0, N - 2);
    std::uniform_int_distribution<> duCol(0, N - 2);
    int i = duRow(rng);      // 0 … N‑2  (no “*2” ⇒ all rows)
    int j = duCol(rng);      // 0 … N‑2  (no “*2” ⇒ all cols)

    // Detect current orientation (exactly two markers on a diagonal)
    bool isHH = (conf.at(i, j)      == 1 &&                // NW
                 conf.at(i+1, j+1)  == 1 &&                // SE
                 conf.at(i+1, j)    == 0 &&                // SW empty
                 conf.at(i, j+1)    == 0);                 // NE empty

    bool isVV = (conf.at(i+1, j)    == 1 &&                // SW
                 conf.at(i, j+1)    == 1 &&                // NE
                 conf.at(i, j)      == 0 &&                // NW empty
                 conf.at(i+1, j+1)  == 0);                 // SE empty

    if(!(isHH || isVV)) return;   // "mixed" plaquette – skip

    // Compute weights
    double wHH = plaquetteWeight(i, j, /*horizontal=*/true,  W);
    double wVV = plaquetteWeight(i, j, /*horizontal=*/false, W);

    /* Heat‑bath probability matching shuffling measure */
    double pHH = (std::abs(wHH - wVV) < 1e-15)
                 ? 0.5
                 : wHH / (wHH + wVV);

    bool chooseHH = (u(rng) < pHH);

    if( (chooseHH && isHH) || (!chooseHH && isVV) ) return; // nothing flips

    // Clear plaquette
    conf.at(i, j)    = conf.at(i, j+1)   = 0;
    conf.at(i+1, j)  = conf.at(i+1, j+1)  = 0;

    if(chooseHH){
        // place markers on NW & SE
        conf.at(i, j)     = 1;
        conf.at(i+1, j+1) = 1;
    }else{
        // place markers on SW & NE
        conf.at(i+1, j)   = 1;
        conf.at(i, j+1)   = 1;
    }
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n, double a, double b) {
    try {
        progressCounter = 0; // Reset progress.

        // Create 2*n x 2*n weight matrix with 2x2 periodic weights.
        int dim = 2 * n;
        MatrixDouble A1a(dim, dim, 0.0);

        // Set up the 2x2 periodic weights pattern
        for (int i = 0; i < dim; i++){
            for (int j = 0; j < dim; j++){
                int im = i & 3; // Faster than i % 4
                int jm = j & 3; // Faster than j % 4
                if ((im < 2 && jm < 2) || (im >= 2 && jm >= 2))
                    A1a.at(i, j) = b;
                else
                    A1a.at(i, j) = a;
            }
        }

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

        // Build JSON output with pre-allocated string for efficiency
        int size = dominoConfig.size();
        double scale = 10.0;

        /* store global state so that performGlauberStep can continue from here */
        g_conf = dominoConfig;
        g_W    = A1a;
        g_N    = 2 * n;
        g_a    = a;
        g_b    = b;

        // Reserve a reasonable amount of space for the JSON string
        // Each domino needs ~100 chars, and about 1/4 of the cells will be dominoes
        size_t estimatedJsonSize = (size * size / 4) * 100;
        string json;
        json.reserve(estimatedJsonSize > 1024 ? estimatedJsonSize : 1024);
        json.append("[");

        bool first = true;
        char buffer[128]; // Buffer for formatting numbers

        for (int i = 0; i < size; i++){
            for (int j = 0; j < size; j++){
                if (dominoConfig.at(i, j) == 1) {
                    double x, y, w, h;
                    const char* color;

                    // Determine domino properties based on position
                    bool oddI = (i & 1), oddJ = (j & 1);
                    if (oddI && oddJ) { // i odd, j odd
                        color = "green";
                        x = j - i - 2;
                        y = size + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (oddI && !oddJ) { // i odd, j even
                        color = "blue";
                        x = j - i - 1;
                        y = size + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else if (!oddI && !oddJ) { // i even, j even
                        color = "red";
                        x = j - i - 2;
                        y = size + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (!oddI && oddJ) { // i even, j odd
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

        json.append("]");
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

// ---------- Glauber driver ----------
EMSCRIPTEN_KEEPALIVE
char* simulateAztecGlauber(int n, double a, double b, int sweeps) {
    try {
        /* 1. exact start (shuffling) */
        // Create 2*n x 2*n weight matrix with 2x2 periodic weights.
        int dim = 2 * n;
        MatrixDouble W(dim, dim, 0.0);

        // Set up the 2x2 periodic weights pattern
        for (int i = 0; i < dim; i++){
            for (int j = 0; j < dim; j++){
                int im = i & 3; // Faster than i % 4
                int jm = j & 3; // Faster than j % 4
                if ((im < 2 && jm < 2) || (im >= 2 && jm >= 2))
                    W.at(i, j) = b;
                else
                    W.at(i, j) = a;
            }
        }

        // Compute probability matrices.
        vector<MatrixDouble> prob;
        try {
            prob = probs2(W);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error computing probability matrices");
        }
        progressCounter = 5; // Initial progress.
        emscripten_sleep(0); // Yield to update UI

        // Generate initial domino configuration.
        MatrixInt conf;
        try {
            conf = aztecgen(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating domino configuration");
        }

        /* store global state for incremental updates */
        g_conf = conf;
        g_W    = W;
        g_N    = 2 * n;
        g_a    = a;
        g_b    = b;

        /* 2. Glauber sweeps */
        int N = 2*n;
        std::uniform_real_distribution<> u(0.0,1.0);
        const long plaquettes = (long)(N - 1) * (N - 1);   // total 2×2 blocks now visited
        const long steps      = (long)sweeps * plaquettes; // one sweep = one average visit
        progressCounter = 5;                               // reuse progress bar
        for(long t=0; t<steps; ++t){
            glauberStep(conf, W, rng, u);
            if(t % (steps/90==0?1:steps/90) == 0){
                progressCounter = 5 + (int)(90.0 * t / steps);
                emscripten_sleep(0);
            }
        }

        /* 3. serialise to JSON – *identical* code path as simulateAztec */
        // Build JSON output with pre-allocated string for efficiency
        int size = conf.size();
        double scale = 10.0;

        // Reserve a reasonable amount of space for the JSON string
        // Each domino needs ~100 chars, and about 1/4 of the cells will be dominoes
        size_t estimatedJsonSize = (size * size / 4) * 100;
        string json;
        json.reserve(estimatedJsonSize > 1024 ? estimatedJsonSize : 1024);
        json.append("[");

        bool first = true;
        char buffer[128]; // Buffer for formatting numbers

        for (int i = 0; i < size; i++){
            for (int j = 0; j < size; j++){
                if (conf.at(i, j) == 1) {
                    double x, y, w, h;
                    const char* color;

                    // Determine domino properties based on position
                    bool oddI = (i & 1), oddJ = (j & 1);
                    if (oddI && oddJ) { // i odd, j odd
                        color = "green";
                        x = j - i - 2;
                        y = size + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (oddI && !oddJ) { // i odd, j even
                        color = "blue";
                        x = j - i - 1;
                        y = size + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else if (!oddI && !oddJ) { // i even, j even
                        color = "red";
                        x = j - i - 2;
                        y = size + 1 - (i + j) - 1;
                        w = 4;
                        h = 2;
                    } else if (!oddI && oddJ) { // i even, j odd
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

        json.append("]");
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

/* ------------------------------------------------------------------ */
/*  One Glauber heat‑bath update, serialise result, and return JSON   */
/*  JS side calls:   performGlauberStep(a, b)                         */
/* ------------------------------------------------------------------ */
EMSCRIPTEN_KEEPALIVE
char* performGlauberStep(double a, double b)
{
    try {
        if(g_N == 0)
            throw std::runtime_error("No configuration in memory – run an initial sampler first.");

        /* rebuild weight matrix only if (a,b) changed */
        if(a != g_a || b != g_b){
            g_W = MatrixDouble(g_N, g_N, 0.0);
            for(int i = 0; i < g_N; ++i){
                for(int j = 0; j < g_N; ++j){
                    int im = i & 3, jm = j & 3;
                    g_W.at(i,j) = ((im < 2 && jm < 2) || (im >= 2 && jm >= 2)) ? b : a;
                }
            }
            g_a = a; g_b = b;
        }

        /* one heat‑bath plaquette flip */
        std::uniform_real_distribution<> u(0.0,1.0);
        glauberStep(g_conf, g_W, rng, u);

        /* --------- serialise g_conf – identical to other drivers --------- */
        const int size  = g_N;
        const double sc = 10.0;   // drawing scale
        std::string json;
        json.reserve((size*size/4)*100);
        json.push_back('[');

        bool first = true;
        char buf[128];

        for(int i = 0; i < size; ++i){
            for(int j = 0; j < size; ++j){
                if(g_conf.at(i,j) != 1) continue;

                double x, y, w, h;
                const char* col;
                bool oi = i & 1, oj = j & 1;

                if( oi &&  oj){ col="green";  x=j-i-2; y=size+1-(i+j)-1; w=4; h=2; }
                if( oi && !oj){ col="blue";   x=j-i-1; y=size+1-(i+j)-2; w=2; h=4; }
                if(!oi && !oj){ col="red";    x=j-i-2; y=size+1-(i+j)-1; w=4; h=2; }
                if(!oi &&  oj){ col="yellow"; x=j-i-1; y=size+1-(i+j)-2; w=2; h=4; }

                if(!first) json.push_back(','); else first = false;
                snprintf(buf,sizeof(buf),
                         "{\"x\":%g,\"y\":%g,\"w\":%g,\"h\":%g,\"color\":\"%s\"}",
                         x*sc, y*sc, w*sc, h*sc, col);
                json.append(buf);
            }
        }
        json.push_back(']');

        char* out = (char*)malloc(json.size()+1);
        if(!out) throw std::runtime_error("malloc failed");
        strcpy(out, json.c_str());
        return out;

    } catch(const std::exception& e){
        std::string err = std::string("{\"error\":\"") + e.what() + "\"}";
        char* out = (char*)malloc(err.size()+1);
        if(out) strcpy(out, err.c_str());
        return out;
    }
}

/* ------------------------------------------------------------------ */
/*  Run N plaquette flips, rebuild weights if (a,b) changed, return   */
/*  updated configuration as JSON.                                    */
/* ------------------------------------------------------------------ */
EMSCRIPTEN_KEEPALIVE
char* performGlauberSteps(double a, double b, int nSteps)
{
    try {
        if(g_N == 0)
            throw std::runtime_error("No configuration in memory – run a sampler first.");

        /* rebuild weights if needed */
        if(a != g_a || b != g_b){
            g_W = MatrixDouble(g_N, g_N, 0.0);
            for(int i=0;i<g_N;++i)
                for(int j=0;j<g_N;++j){
                    int im=i&3, jm=j&3;
                    g_W.at(i,j)=((im<2&&jm<2)||(im>=2&&jm>=2))? b : a;
                }
            g_a = a; g_b = b;
        }

        /* run the requested number of flips */
        std::uniform_real_distribution<> u(0.0,1.0);
        for(int k=0;k<nSteps;++k)
            glauberStep(g_conf, g_W, rng, u);

        /* --- serialise g_conf (identical code path) --- */
        const int size  = g_N;
        const double sc = 10.0;
        std::string json;  json.reserve((size*size/4)*100); json.push_back('[');
        bool first=true;  char buf[128];
        for(int i=0;i<size;++i)
          for(int j=0;j<size;++j){
            if(g_conf.at(i,j)!=1) continue;
            bool oi=i&1, oj=j&1; const char* col;
            double x,y,w,h;
            if( oi&& oj){col="green";  x=j-i-2; y=size+1-(i+j)-1; w=4; h=2;}
            if( oi&&!oj){col="blue";   x=j-i-1; y=size+1-(i+j)-2; w=2; h=4;}
            if(!oi&&!oj){col="red";    x=j-i-2; y=size+1-(i+j)-1; w=4; h=2;}
            if(!oi&& oj){col="yellow"; x=j-i-1; y=size+1-(i+j)-2; w=2; h=4;}
            if(!first) json.push_back(','); else first=false;
            snprintf(buf,sizeof(buf),
                     "{\"x\":%g,\"y\":%g,\"w\":%g,\"h\":%g,\"color\":\"%s\"}",
                     x*sc,y*sc,w*sc,h*sc,col);
            json.append(buf);
          }
        json.push_back(']');
        char* out=(char*)malloc(json.size()+1); strcpy(out,json.c_str());
        return out;

    }catch(const std::exception& e){
        std::string err="{\"error\":\""+std::string(e.what())+"\"}";
        char* out=(char*)malloc(err.size()+1); strcpy(out,err.c_str()); return out;
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
