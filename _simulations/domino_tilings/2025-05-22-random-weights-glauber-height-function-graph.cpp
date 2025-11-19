/*
emcc 2025-05-22-random-weights-glauber-height-function-graph.cpp -o 2025-05-22-random-weights-glauber-height-function-graph.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec', '_simulateAztecFrozen', '_performGlauberStep', '_performGlauberSteps', '_simulateAztecGlauber', '_getWeightMatrix', '_freeString', '_getProgress', '_resetGlobalState']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=1GB \
 -s STACK_SIZE=32MB \
 -s ASSERTIONS=1 \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv 2025-05-22-random-weights-glauber-height-function-graph.js ../../js/

Features:
- Random Bernoulli weights (0.5 or 1.5 with probability 1/2) for domino tilings of Aztec diamond
- Glauber dynamics using the same random weight matrix
- Height function graph visualization
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
static MatrixDouble   g_W;            // current random weight matrix
static int            g_N    = 0;     // linear size of g_conf (2n)
static double         g_a    = -1.0;  // last (a,b) used to build g_W
static double         g_b    = -1.0;
static bool           g_random_initialized = false; // whether random weights are initialized

volatile int progressCounter = 0;

// Forward declarations
pair<vector<MatrixDouble>, vector<MatrixDouble>> d3pslim(const MatrixDouble &x1);
vector<MatrixDouble> probsslim(const MatrixDouble &x1);
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

// Function to get the current weight matrix as JSON
std::string getWeightMatrixJson() {
    if (g_N == 0) {
        // It's crucial that g_N is set (e.g., after a simulation runs)
        // and g_a, g_b are valid (not their initial -1.0 if those are invalid sentinels).
        // Assuming g_a, g_b are correctly updated from UI parameters (u,v) before this is called.
        return "{\"error\":\"Weight matrix generation failed: g_N is 0 or parameters not initialized. Run a simulation or update weights first.\"}";
    }
    if (g_a < 0 || g_b < 0) { // Or whatever check is appropriate for g_a, g_b being uninitialized
         // This check might be too simple if 0 or negative values are valid for a/b.
         // The original code initializes g_a = -1.0, g_b = -1.0.
         // If the simulation hasn't run or weights haven't been set, g_a/g_b might be these defaults.
         // The JavaScript side has u/v inputs with min="0.1".
         // Let's assume if g_a/g_b are at defaults, we should signal an error or use actual defaults for u/v.
         // For now, we'll proceed assuming they are valid positive numbers as per UI.
    }


    MatrixDouble true_horizontal_weights(g_N, g_N);
    MatrixDouble true_vertical_weights(g_N, g_N);
    std::uniform_real_distribution<> bernoulli_dist(0.0, 1.0); // For choosing between g_a and g_b

    for (int i = 0; i < g_N; ++i) {
        for (int j = 0; j < g_N; ++j) {
            bool is_node_black = ((i % 2) == (j % 2)); // True if (0,0) is Black

            // Determine Horizontal Edge Weight from node (i,j) to (i,j+1)
            if (is_node_black) {
                // Black-to-White Horizontal (gamma-type in "good picture", Random)
                true_horizontal_weights.at(i,j) = (bernoulli_dist(rng) < 0.5) ? g_a : g_b;
            } else {
                // White-to-Black Horizontal (fixed '1' in "good picture")
                true_horizontal_weights.at(i,j) = 1.0;
            }

            // Determine Vertical Edge Weight from node (i,j) to (i+1,j)
            if (is_node_black) {
                // Black-to-White Vertical (alpha-type in "good picture", Random)
                true_vertical_weights.at(i,j) = (bernoulli_dist(rng) < 0.5) ? g_a : g_b;
            } else {
                // White-to-Black Vertical (beta-type in "good picture", Random)
                true_vertical_weights.at(i,j) = (bernoulli_dist(rng) < 0.5) ? g_a : g_b;
            }
        }
    }

    // Serialize both matrices into a single JSON object string
    std::string json_str = "{\"horizontal_weights\":[";
    for (int i = 0; i < g_N; ++i) {
        if (i > 0) json_str += ",";
        json_str += "[";
        for (int j = 0; j < g_N; ++j) {
            if (j > 0) json_str += ",";
            json_str += std::to_string(true_horizontal_weights.at(i,j));
        }
        json_str += "]";
    }
    json_str += "],\"vertical_weights\":[";
    for (int i = 0; i < g_N; ++i) {
        if (i > 0) json_str += ",";
        json_str += "[";
        for (int j = 0; j < g_N; ++j) {
            if (j > 0) json_str += ",";
            json_str += std::to_string(true_vertical_weights.at(i,j));
        }
        json_str += "]";
    }
    json_str += "]}";

    return json_str;
}

// Function to generate frozen all-vertical configuration
MatrixInt generateFrozenVertical(int n) {
    // Create frozen-all-vertical configuration exactly like reference but swapped for blue left/yellow right
    const int N = 2 * n;
    MatrixInt conf(N, N, 0);
    
    for (int i = 0; i < N; ++i) {
        for (int j = 0; j < N; ++j) {
            const bool oddI = i & 1;
            const bool oddJ = j & 1;
            const int x = j - i - 1;  // renderer's x-coord
            
            // Reference puts oddI && !oddJ on left (yellow), !oddI && oddJ on right (red)
            // But oddI && !oddJ renders as blue, !oddI && oddJ renders as yellow
            // So reference actually has blue on left, yellow on right - which is what we want!
            if (x <= 0) {  // left half
                if (oddI && !oddJ && i <= N-2 && j >= 2)
                    conf.at(i, j) = 1;  /* blue markers */
            } else {  // right half
                if (!oddI && oddJ && i >= 0 && j <= N-1)
                    conf.at(i, j) = 1;  /* yellow markers */
            }
        }
    }
    
    return conf;
}

extern "C" {

// Export function to generate frozen configuration
EMSCRIPTEN_KEEPALIVE
char* simulateAztecFrozen(int n, double a, double b) {
    try {
        progressCounter = 0;
        
        // Generate frozen all-vertical configuration
        MatrixInt dominoConfig = generateFrozenVertical(n);
        
        // Update global state
        g_conf = dominoConfig;
        g_N = 2 * n;
        g_a = a;
        g_b = b;
        
        // Create weight matrix (same as regular simulation)
        MatrixDouble A1a(2*n, 2*n, 0.0);
        
        if (!g_random_initialized) {
            std::uniform_real_distribution<> bernoulli(0.0, 1.0);
            int k_period = 2, ell_period = 2;
            
            for (int i = 0; i < 2*n; i++){
                for (int j = 0; j < 2*n; j++){
                    int mod_i = i % ell_period;
                    int mod_j = j % k_period;
                    
                    if (mod_i == 0 && mod_j == 0) {
                        A1a.at(i, j) = 1.0;
                    } else if (mod_i == 0 && mod_j != 0) {
                        A1a.at(i, j) = (bernoulli(rng) < 0.5) ? a : b;
                    } else if (mod_i != 0 && mod_j != 0) {
                        A1a.at(i, j) = (bernoulli(rng) < 0.5) ? a : b;
                    } else if (mod_i != 0 && mod_j == 0) {
                        A1a.at(i, j) = (bernoulli(rng) < 0.5) ? a : b;
                    }
                }
            }
            g_W = A1a;
            g_random_initialized = true;
        } else {
            A1a = g_W;
        }
        
        // Build JSON output (same format as regular simulation)
        int size = dominoConfig.size();
        double scale = 10.0;
        
        size_t estimatedJsonSize = (size * size / 4) * 100;
        string json;
        json.reserve(estimatedJsonSize > 1024 ? estimatedJsonSize : 1024);
        json.append("[");
        
        bool first = true;
        char buffer[128];
        
        for (int i = 0; i < size; i++){
            for (int j = 0; j < size; j++){
                if (dominoConfig.at(i, j) == 1) {
                    double x, y, w, h;
                    const char* color;
                    
                    // For frozen vertical configuration, all dominoes are vertical (red or yellow)
                    bool oddI = (i & 1), oddJ = (j & 1);
                    if (oddI && !oddJ) { // i odd, j even - vertical red
                        color = "red";
                        x = j - i - 1;
                        y = size + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else if (!oddI && oddJ) { // i even, j odd - vertical yellow  
                        color = "yellow";
                        x = j - i - 1;
                        y = size + 1 - (i + j) - 2;
                        w = 2;
                        h = 4;
                    } else {
                        continue; // Skip non-vertical positions
                    }
                    
                    x *= scale;
                    y *= scale;
                    w *= scale;
                    h *= scale;
                    
                    if (!first) json.append(",");
                    else first = false;
                    
                    snprintf(buffer, sizeof(buffer),
                             "{\"x\":%g,\"y\":%g,\"w\":%g,\"h\":%g,\"color\":\"%s\"}",
                             x, y, w, h, color);
                    json.append(buffer);
                }
            }
        }
        
        json.append("]");
        progressCounter = 100;
        
        char* out = (char*)malloc(json.size() + 1);
        if (!out) {
            throw std::runtime_error("Failed to allocate memory for output");
        }
        strcpy(out, json.c_str());
        return out;
        
    } catch (const std::exception& e) {
        std::string errorMsg = std::string("{\"error\":\"") + e.what() + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        if (out) {
            strcpy(out, errorMsg.c_str());
        }
        progressCounter = 100;
        return out;
    }
}

// Export function to get the weight matrix
EMSCRIPTEN_KEEPALIVE
char* getWeightMatrix() {
    try {
        std::string json = getWeightMatrixJson();

        char* result = (char*)malloc(json.size() + 1);
        if (!result) {
            return nullptr;
        }
        strcpy(result, json.c_str());
        return result;
    } catch (const std::exception& e) {
        std::string error = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* result = (char*)malloc(error.size() + 1);
        if (!result) {
            return nullptr;
        }
        strcpy(result, error.c_str());
        return result;
    }
}

EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n, double a, double b) {
    try {
        progressCounter = 0; // Reset progress.

        // Create 2*n x 2*n weight matrix with random weights
        int dim = 2 * n;
        MatrixDouble A1a(dim, dim, 0.0);

        // Force regeneration of weights if special parameter values are used
        if (a == -1.0 && b == -1.0) {
            std::cout << "Forcing regeneration of random weights in simulateAztec" << std::endl;
            g_random_initialized = false;
        }

        // Initialize random Bernoulli weights if not already done or if forced
        if (!g_random_initialized) {
            std::uniform_real_distribution<> bernoulli(0.0, 1.0);
            // Set up the random weights according to the specified pattern:
            // When (ℓx'+i', ky'+j') = (ℓx+i+1, ky+j), the element equals 1
            // For α, β, γ, use random Bernoulli weights (0.5 or 1.5 with probability 1/2)

            // We're using k=ℓ=2 for 2x2 periodicity
            int k_period = 2, ell_period = 2;

            for (int i = 0; i < dim; i++){
                for (int j = 0; j < dim; j++){
                    // For each coordinate, determine which weight type it is
                    int mod_i = i % ell_period;
                    int mod_j = j % k_period;
                    int x = i / ell_period;
                    int y = j / k_period;

                    // When (x'+i', y'+j') = (x+i+1, y+j), element equals 1
                    if (mod_i == 0 && mod_j == 0) {
                        A1a.at(i, j) = 1.0; // This is the deterministic weight
                    }
                    // α_{j+1,i+1} when (x'+i', y'+j') = (x+i, y+j+1)
                    else if (mod_i == 0 && mod_j != 0) {
                        A1a.at(i, j) = (bernoulli(rng) < 0.5) ? a : b; // α - random
                    }
                    // β_{j+1,i+1} when (x'+i', y'+j') = (x+i+1, y+j+1)
                    else if (mod_i != 0 && mod_j != 0) {
                        A1a.at(i, j) = (bernoulli(rng) < 0.5) ? a : b; // β - random
                    }
                    // γ_{j+1,i+1} when (x'+i', y'+j') = (x+i, y+j)
                    else if (mod_i != 0 && mod_j == 0) {
                        A1a.at(i, j) = (bernoulli(rng) < 0.5) ? a : b; // γ - random
                    }
                }
            }
            // Store the random weights matrix globally
            g_W = A1a;
            g_random_initialized = true;
        } else {
            // Reuse the existing random weights matrix
            A1a = g_W;
        }

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
        // Create 2*n x 2*n weight matrix with random weights
        int dim = 2 * n;
        MatrixDouble W(dim, dim, 0.0);

        // Initialize random Bernoulli weights if not already done
        if (!g_random_initialized) {
            std::uniform_real_distribution<> bernoulli(0.0, 1.0);
            // Set up the random weights according to the specified pattern:
            // When (ℓx'+i', ky'+j') = (ℓx+i+1, ky+j), the element equals 1
            // For α, β, γ, use random Bernoulli weights (0.5 or 1.5 with probability 1/2)

            // We're using k=ℓ=2 for 2x2 periodicity
            int k_period = 2, ell_period = 2;

            for (int i = 0; i < dim; i++){
                for (int j = 0; j < dim; j++){
                    // For each coordinate, determine which weight type it is
                    int mod_i = i % ell_period;
                    int mod_j = j % k_period;
                    int x = i / ell_period;
                    int y = j / k_period;

                    // When (x'+i', y'+j') = (x+i+1, y+j), element equals 1
                    if (mod_i == 0 && mod_j == 0) {
                        W.at(i, j) = 1.0; // This is the deterministic weight
                    }
                    // α_{j+1,i+1} when (x'+i', y'+j') = (x+i, y+j+1)
                    else if (mod_i == 0 && mod_j != 0) {
                        W.at(i, j) = (bernoulli(rng) < 0.5) ? a : b; // α - random
                    }
                    // β_{j+1,i+1} when (x'+i', y'+j') = (x+i+1, y+j+1)
                    else if (mod_i != 0 && mod_j != 0) {
                        W.at(i, j) = (bernoulli(rng) < 0.5) ? a : b; // β - random
                    }
                    // γ_{j+1,i+1} when (x'+i', y'+j') = (x+i, y+j)
                    else if (mod_i != 0 && mod_j == 0) {
                        W.at(i, j) = (bernoulli(rng) < 0.5) ? a : b; // γ - random
                    }
                }
            }
            // Store the random weights matrix globally
            g_W = W;
            g_random_initialized = true;
        } else {
            // Reuse the existing random weights matrix if dimensions match
            if (g_W.size() == dim) {
                W = g_W;
            } else {
                // Create new random weights if dimensions don't match
                g_random_initialized = false; // Reset flag to recreate matrix
                std::uniform_real_distribution<> bernoulli(0.0, 1.0);
                for (int i = 0; i < dim; i++){
                    for (int j = 0; j < dim; j++){
                        W.at(i, j) = (bernoulli(rng) < 0.5) ? a : b;
                    }
                }
                g_W = W;
                g_random_initialized = true;
            }
        }

        // Compute probability matrices.
        vector<MatrixDouble> prob;
        try {
            prob = probsslim(W);
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

        /* Generate a new weight matrix if parameters have changed */
        if (a != g_a || b != g_b) {
            std::cout << "Weight parameters changed or update requested. New (a,b) = (" << a << "," << b
                      << "). Previous (g_a,g_b) = (" << g_a << "," << g_b << "). Regenerating g_W." << std::endl;

            g_a = a; // Update g_a and g_b with the new parameters
            g_b = b;

            if (g_N > 0) { // g_N should be set from a previous simulation run
                g_W = MatrixDouble(g_N, g_N, 0.0); // Reinitialize g_W
                std::uniform_real_distribution<> bernoulli(0.0, 1.0);
                int k_period = 2;    // Corrected periodicity
                int ell_period = 2;  // Corrected periodicity

                for (int i = 0; i < g_N; ++i) {
                    for (int j = 0; j < g_N; ++j) {
                        int mod_i = i % ell_period;
                        int mod_j = j % k_period;

                        // Using the same 4-case pattern as in simulateAztec:
                        // One type is 1.0, others are random (g_a or g_b)
                        if (mod_i == 0 && mod_j == 0) {         // Case 1 (e.g., top-left of 2x2 block)
                            g_W.at(i, j) = 1.0;                 // Deterministic weight
                        } else if (mod_i == 0 && mod_j != 0) {  // Case 2 (e.g., top-right)
                            g_W.at(i, j) = (bernoulli(rng) < 0.5) ? g_a : g_b; // Random
                        } else if (mod_i != 0 && mod_j == 0) {  // Case 3 (e.g., bottom-left)
                            g_W.at(i, j) = (bernoulli(rng) < 0.5) ? g_a : g_b; // Random
                        } else { // mod_i != 0 && mod_j != 0     // Case 4 (e.g., bottom-right)
                            g_W.at(i, j) = (bernoulli(rng) < 0.5) ? g_a : g_b; // Random
                        }
                    }
                }
                g_random_initialized = true; // Mark that g_W is now current and correctly initialized
                std::cout << "g_W regenerated with new parameters and 2x2 periodicity." << std::endl;
            } else {
                // This case should ideally not be hit if called after an initial simulation.
                std::cerr << "Error in performGlauberStep: g_N is 0, cannot regenerate g_W. Run an initial sampler first." << std::endl;
            }
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

        /* Generate a new weight matrix if:
           1. Parameters have changed, OR
           2. The function was called with nSteps == -1 (Update Weights button)
        */
        bool force_regenerate_due_to_update_button = (nSteps == -1);
        bool parameters_changed = (a != g_a || b != g_b);

        if (force_regenerate_due_to_update_button || parameters_changed) {
            if (force_regenerate_due_to_update_button) {
                std::cout << "Update Weights request: Forcing regeneration of g_W with (a,b) = (" << a << "," << b << ")." << std::endl;
            } else { // This means parameters_changed is true and force_regenerate_due_to_update_button is false
                std::cout << "Weight parameters changed during dynamics. New (a,b) = (" << a << "," << b
                          << "). Previous (g_a,g_b) = (" << g_a << "," << g_b << "). Regenerating g_W." << std::endl;
            }

            g_a = a; // Update g_a and g_b with the new parameters
            g_b = b;

            if (g_N > 0) { // g_N should be set from a previous simulation run
                g_W = MatrixDouble(g_N, g_N, 0.0); // Reinitialize g_W
                std::uniform_real_distribution<> bernoulli(0.0, 1.0);
                int k_period = 2;    // Corrected periodicity
                int ell_period = 2;  // Corrected periodicity

                for (int i = 0; i < g_N; ++i) {
                    for (int j = 0; j < g_N; ++j) {
                        int mod_i = i % ell_period;
                        int mod_j = j % k_period;

                        // Using the same 4-case pattern as in simulateAztec:
                        // One type is 1.0, others are random (g_a or g_b)
                        if (mod_i == 0 && mod_j == 0) {         // Case 1 (e.g., top-left of 2x2 block)
                            g_W.at(i, j) = 1.0;                 // Deterministic weight
                        } else if (mod_i == 0 && mod_j != 0) {  // Case 2 (e.g., top-right)
                            g_W.at(i, j) = (bernoulli(rng) < 0.5) ? g_a : g_b; // Random
                        } else if (mod_i != 0 && mod_j == 0) {  // Case 3 (e.g., bottom-left)
                            g_W.at(i, j) = (bernoulli(rng) < 0.5) ? g_a : g_b; // Random
                        } else { // mod_i != 0 && mod_j != 0     // Case 4 (e.g., bottom-right)
                            g_W.at(i, j) = (bernoulli(rng) < 0.5) ? g_a : g_b; // Random
                        }
                    }
                }
                g_random_initialized = true; // Mark that g_W is now current and correctly initialized
                std::cout << "g_W regenerated with new parameters and 2x2 periodicity." << std::endl;
            } else {
                // This case should ideally not be hit if called after an initial simulation.
                std::cerr << "Error in performGlauberSteps: g_N is 0, cannot regenerate g_W. Run an initial sampler first." << std::endl;
            }
        }

        /* run the requested number of flips or special case for just updating weights */
        if (nSteps == -1) {
            // Special case: nSteps = -1 means just update weights (done above) and return the current configuration
            std::cout << "Weights updated (or re-confirmed) for (u,v) = (" << a << "," << b << "). No Glauber steps performed." << std::endl;
        } else {
            // Normal case: perform nSteps Glauber steps
            std::uniform_real_distribution<> u(0.0,1.0);
            for(int k=0;k<nSteps;++k)
                glauberStep(g_conf, g_W, rng, u);
        }

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

EMSCRIPTEN_KEEPALIVE
void resetGlobalState() {
    // Reset global state to force complete regeneration
    g_N = 0;  // This will force a fresh size calculation
    g_random_initialized = false;  // Force new random weights

    std::cout << "Global state reset - g_N=0, g_random_initialized=false" << std::endl;
}

} // extern "C"
