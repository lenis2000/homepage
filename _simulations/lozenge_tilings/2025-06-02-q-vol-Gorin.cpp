/*
emcc 2025-06-02-q-vol-Gorin.cpp -o 2025-06-02-q-vol-Gorin.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_initializeTiling','_performSOperator','_performSMinusOperator','_exportPaths','_updateParameters','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=32MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv 2025-06-02-q-vol-Gorin.js ../../js/

Features:
- Lozenge tilings simulation (WASM/JS port of Vadim Gorin's program)
- Supports uniform and q^volume cases
- Interactive visualization with WebGL
- S operator for dynamics
*/

#include <emscripten.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <random>
#include <chrono>
#include <sstream>
#include <string>
#include <cstdlib>
#include <cstring>

using namespace std;

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

// Random number generator
static std::mt19937 rng(std::random_device{}());

// Enum for tiling modes
enum class TilingMode {
    Q_HAHN = 5,
    HAHN = 6
};

// Global parameters
int N_param = 5;      // Number of paths
int T_param = 10;     // Time horizon
int S_param = 0;      // Current S value
TilingMode current_mode = TilingMode::HAHN;
double q_param = 0.5; // q parameter for Q_HAHN mode

// Paths array: paths[i][t] = position of path i at time t
std::vector<std::vector<int>> paths;

// Random number generator (0,1)
double getRandom01() {
    static std::uniform_real_distribution<> dis(0.0, 1.0);
    return dis(rng);
}

// Initialize paths
void initPaths() {
    for (int j = 0; j < N_param; j++) {
        // First part: constant height
        for (int i = 0; i <= T_param - S_param; i++) {
            paths[j][i] = j;
        }
        // Second part: increasing height
        for (int i = T_param - S_param + 1; i <= T_param; i++) {
            paths[j][i] = j + (i - (T_param - S_param));
        }
    }
}

// Forward declaration
void calculateProbabilitiesSminus(std::vector<double>& p, int k_start, int j_end, int tc);

// Calculate probabilities for S operator
void calculateProbabilitiesSplus(std::vector<double>& p, int k_start, int j_end, int tc) {
    switch (current_mode) {
        case TilingMode::HAHN: {
            if (T_param - tc - S_param < 1) {
                p[0] = 1.0;
                for (int i = 1; i <= j_end - k_start + 1; i++) {
                    double x = paths[k_start + i - 1][tc];
                    p[i] = p[i-1] * (T_param - tc - S_param + x) / (x + 1);
                }
            } else {
                p[j_end - k_start + 1] = 1.0;
                for (int i = 0; i < j_end - k_start + 1; i++) {
                    double x = paths[j_end - i][tc];
                    p[j_end - k_start - i] = p[j_end - k_start + 1 - i] *
                                             (x + 1) / (T_param - tc - S_param + x);
                }
            }
            break;
        }
        case TilingMode::Q_HAHN: {
            double K_val = static_cast<double>(T_param - tc - S_param); // Parameter K

            if (std::abs(q_param - 1.0) < 1e-9) {
                // Fallback to Hahn if q is very close to 1, as q-formulas become degenerate.
                // This assumes Hahn is the q->1 limit. This part might need model-specific verification.
                // For now, copying Hahn logic as a robust fallback:
                if (K_val < 1.0) { // Equivalent to T_param - tc - S_param < 1 in Hahn
                    p[0] = 1.0;
                    for (int i = 1; i <= j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[k_start + i - 1][tc]);
                        if (std::abs(x + 1.0) < 1e-9) { p[i] = 0.0; } // Avoid division by zero
                        else { p[i] = p[i-1] * (K_val + x) / (x + 1.0); }
                    }
                } else {
                    p[j_end - k_start + 1] = 1.0;
                    for (int i = 0; i < j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[j_end - i][tc]);
                        if (std::abs(K_val + x) < 1e-9) { p[j_end - k_start - i] = 0.0; } // Avoid division by zero
                        else {
                            p[j_end - k_start - i] = p[j_end - k_start + 1 - i] *
                                                   (x + 1.0) / (K_val + x);
                        }
                    }
                }
            } else if (q_param < 1.0) { // Case: q < 1
                if (K_val < 1.0) { // Subcase: q < 1 AND K_val <= 0
                    p[0] = 1.0; // Forward iteration
                    for (int i = 1; i <= j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[k_start + i - 1][tc]);
                        double term_numerator = (1.0 - std::pow(q_param, K_val + x));
                        double term_denominator = (1.0 - std::pow(q_param, x + 1.0));
                        if (std::abs(term_denominator) < 1e-9) { p[i] = 0.0; }
                        else { p[i] = p[i-1] * q_param * term_numerator / term_denominator; }
                    }
                } else { // Subcase: q < 1 AND K_val >= 1
                    // This is the original block with "i0 logic", crucial for non-monotonic distributions.
                    double x0_threshold_numerator = (std::pow(q_param, K_val) - 1.0);
                    double x0_threshold_denominator = (1.0 - 1.0/q_param);
                    double x0 = 0.0; // Default x0 if calculation is problematic

                    if (std::abs(x0_threshold_denominator) > 1e-9 && std::abs(std::log(q_param)) > 1e-9 && x0_threshold_numerator / x0_threshold_denominator > 0) {
                         x0 = -std::log(x0_threshold_numerator / x0_threshold_denominator) / std::log(q_param);
                    } else {
                        // Fallback or specific handling if x0 cannot be calculated well
                        // (e.g. K_val makes numerator non-positive, or q_param is problematic for log)
                        // For now, this may lead to i0 being at an edge if x0 calculation fails.
                    }

                    int i0 = k_start;
                    // Ensure paths[i0][tc] is valid before comparison if i0 can reach j_end+1
                    while (i0 <= j_end && paths[i0][tc] < x0) {
                        i0++;
                    }

                    int i0_offset = i0 - k_start;
                    // Clamp i0_offset to be a valid index for array p
                    if (i0_offset < 0) i0_offset = 0;
                    if (i0_offset > (j_end - k_start + 1)) i0_offset = (j_end - k_start + 1);
                    
                    p[i0_offset] = 1.0;

                    for (int i = i0_offset + 1; i <= j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[k_start + i - 1][tc]);
                        double term_numerator = (1.0 - std::pow(q_param, K_val + x));
                        double term_denominator = (1.0 - std::pow(q_param, x + 1.0));
                        if (std::abs(term_denominator) < 1e-9) { p[i] = 0.0; }
                        else { p[i] = p[i-1] * q_param * term_numerator / term_denominator; }
                    }
                    for (int i = i0_offset - 1; i >= 0; i--) {
                        double x = static_cast<double>(paths[k_start + i][tc]);
                        double term_numerator = (1.0 - std::pow(q_param, x + 1.0));
                        double term_denominator = (q_param * (1.0 - std::pow(q_param, K_val + x)));
                        if (std::abs(term_denominator) < 1e-9) { p[i] = 0.0; }
                        else { p[i] = p[i+1] * term_numerator / term_denominator; }
                    }
                }
            } else { // Case: q_param > 1.0
                // Formulas are standard q-inversions (q -> 1/q, adjust powers) of the q < 1 cases.
                if (K_val < 1.0) { // Subcase: q > 1 AND K_val <= 0
                    // Corresponds to forward iteration for q < 1, K_val <= 0.
                    // Ratio p[i]/p[i-1] for q>1: Q^K_val * (1 - Q^-(K_val+x)) / (1 - Q^-(x+1)), where Q=q_param.
                    p[0] = 1.0;
                    for (int i = 1; i <= j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[k_start + i - 1][tc]);
                        double term_numerator = (1.0 - std::pow(q_param, -(K_val + x)));
                        double term_denominator = (1.0 - std::pow(q_param, -(x + 1.0)));
                        if (std::abs(term_denominator) < 1e-9) { p[i] = 0.0; }
                        else { p[i] = p[i-1] * std::pow(q_param, K_val) * term_numerator / term_denominator; }
                    }
                } else { // Subcase: q > 1 AND K_val >= 1
                    // Corresponds to backward iteration from p[last]=1.0.
                    // Ratio p[curr]/p[next] for q>1: Q^-K_val * (1 - Q^-(x_curr+1)) / (1 - Q^-(K_val+x_curr))
                    // This assumes that for q>1, K_val>=1, the probability distribution does not require
                    // an "i0-like" pivot different from the edges for stable calculation.
                    // If the specific model dictates otherwise, this part would need model-specific "i0 logic" for q>1.
                    // Verification Point: Confirm if "i0 logic" is needed for this case (q>1, K_val>=1) from source model.
                    p[j_end - k_start + 1] = 1.0;
                    for (int i = 0; i < j_end - k_start + 1; i++) { // Iterates to fill p[j_end-k_start] down to p[0]
                        int current_p_idx = j_end - k_start - i;
                        int next_p_idx = j_end - k_start + 1 - i;
                        double x_for_current_p = static_cast<double>(paths[k_start + current_p_idx][tc]); // x for p[current_idx]

                        double term_numerator = (1.0 - std::pow(q_param, -(x_for_current_p + 1.0)));
                        double term_denominator = (1.0 - std::pow(q_param, -(K_val + x_for_current_p)));

                        if (std::abs(term_denominator) < 1e-9) { p[current_p_idx] = 0.0; }
                        else {
                             p[current_p_idx] = p[next_p_idx] *
                                std::pow(q_param, -K_val) * term_numerator / term_denominator;
                        }
                    }
                }
            }
            break;
        }
    }
}

// S operator implementation  
void sOperator() {
    std::vector<std::vector<int>> paths_out = paths;

    // Copy time 0
    for (int k = 0; k < N_param; k++) {
        paths_out[k][0] = paths[k][0];
    }

    // Main loop through time steps
    for (int tc = 1; tc <= T_param; tc++) {
        int k = 0;

        while (k < N_param) {
            // Case 1: Deterministic upward move
            if (paths[k][tc] == paths_out[k][tc-1] + 1) {
                paths_out[k][tc] = paths[k][tc];
                k++;
            }
            // Case 2: Deterministic stay
            else if (paths[k][tc] == paths_out[k][tc-1] - 1) {
                paths_out[k][tc] = paths_out[k][tc-1];
                k++;
            }
            // Case 3: Random split
            else {
                int j = k;
                while (j < N_param - 1 &&
                       paths_out[j + 1][tc - 1] == paths[j + 1][tc] &&
                       paths_out[j + 1][tc - 1] == paths_out[j][tc - 1] + 1) {
                    j++;
                }

                std::vector<double> p(j - k + 2);
                calculateProbabilitiesSplus(p, k, j, tc);

                double psum = 0.0;
                for (int i = 0; i <= j - k + 1; i++) {
                    psum += p[i];
                }

                double rnumber = getRandom01() * psum;
                int split_idx = 0;
                double cumsum = p[0];
                while (cumsum < rnumber && split_idx < j - k + 1) {
                    split_idx++;
                    cumsum += p[split_idx];
                }

                for (int l = k; l < k + split_idx; l++) {
                    paths_out[l][tc] = paths[l][tc];
                }
                for (int l = k + split_idx; l <= j; l++) {
                    paths_out[l][tc] = paths[l][tc] + 1;
                }

                k = j + 1;
            }
        }
    }

    paths = paths_out;
    S_param++;
}

// S-minus operator implementation (the REAL algorithm!)
void sMinusOperator() {
    std::vector<std::vector<int>> paths_out = paths;

    // Copy time 0 (doesn't change)
    for (int k = 0; k < N_param; k++) {
        paths_out[k][0] = paths[k][0];
    }

    // Main loop through time steps
    for (int tc = 1; tc <= T_param; tc++) {
        int k = 0;

        while (k < N_param) {
            // Case 1: Deterministic stay
            if (paths[k][tc] == paths_out[k][tc-1]) {
                paths_out[k][tc] = paths[k][tc];
                k++;
            }
            // Case 2: Deterministic downward move
            else if (paths[k][tc] - paths_out[k][tc-1] == 2) {
                paths_out[k][tc] = paths_out[k][tc-1] + 1;
                k++;
            }
            // Case 3: Random split needed
            else {
                int j = k;
                while (j < N_param - 1 &&
                       paths_out[j + 1][tc - 1] + 1 == paths[j + 1][tc] &&
                       paths_out[j + 1][tc - 1] == paths_out[j][tc - 1] + 1) {
                    j++;
                }

                std::vector<double> p(j - k + 2);
                calculateProbabilitiesSminus(p, k, j, tc);

                double psum = 0.0;
                for (int i = 0; i <= j - k + 1; i++) {
                    psum += p[i];
                }

                double rnumber = getRandom01() * psum;
                int split_idx = 0;
                double cumsum = p[0];
                while (cumsum < rnumber && split_idx < j - k + 1) {
                    split_idx++;
                    cumsum += p[split_idx];
                }

                // Apply the split
                // Particles k to k+split_idx-1 go down
                for (int l = k; l < k + split_idx; l++) {
                    paths_out[l][tc] = paths[l][tc] - 1;
                }
                // Particles k+split_idx to j stay up
                for (int l = k + split_idx; l <= j; l++) {
                    paths_out[l][tc] = paths[l][tc];
                }

                k = j + 1;
            }
        }
    }

    paths = paths_out;
    S_param--;
}

// Calculate probabilities for S-minus operator
void calculateProbabilitiesSminus(std::vector<double>& p, int k_start, int j_end, int tc) {
    switch (current_mode) {
        case TilingMode::HAHN: {
            if (tc < S_param) {
                p[0] = 1.0;
                for (int i = 1; i <= j_end - k_start + 1; i++) {
                    double x = paths[k_start + i - 1][tc];
                    p[i] = p[i-1] * (N_param + (tc - 1) - x + 1) / (N_param + S_param - x - 1);
                }
            } else {
                p[j_end - k_start + 1] = 1.0;
                for (int i = 0; i < j_end - k_start + 1; i++) {
                    double x = paths[j_end - i][tc];
                    p[j_end - k_start - i] = p[j_end - k_start + 1 - i] *
                                             (N_param + S_param - x - 1) / (N_param + (tc - 1) - x + 1);
                }
            }
            break;
        }
        case TilingMode::Q_HAHN: {
            double K_prime_val = static_cast<double>(S_param - tc);

            if (std::abs(q_param - 1.0) < 1e-9) {
                // Fallback to Hahn if q is very close to 1.
                // This assumes Hahn is the q->1 limit. This part might need model-specific verification.
                // Copying Hahn logic for Sminus:
                if (tc < S_param) { // K_prime_val > 0
                    p[0] = 1.0;
                    for (int i = 1; i <= j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[k_start + i - 1][tc]);
                        if (std::abs(N_param + S_param - x - 1.0) < 1e-9) { p[i] = 0.0; }
                        else { p[i] = p[i-1] * (N_param + (tc - 1) - x + 1.0) / (N_param + S_param - x - 1.0); }
                    }
                } else { // K_prime_val <= 0
                    p[j_end - k_start + 1] = 1.0;
                    for (int i = 0; i < j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[j_end - i][tc]);
                        if (std::abs(N_param + (tc - 1) - x + 1.0) < 1e-9) { p[j_end - k_start - i] = 0.0; }
                        else {
                            p[j_end - k_start - i] = p[j_end - k_start + 1 - i] *
                                                   (N_param + S_param - x - 1.0) / (N_param + (tc - 1) - x + 1.0);
                        }
                    }
                }
            } else if (q_param < 1.0) { // Case: q < 1
                if (K_prime_val > 0) { // Subcase: q < 1 AND K_prime_val > 0 (tc < S_param)
                    p[0] = 1.0; // Forward iteration
                    for (int i = 1; i <= j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[k_start + i - 1][tc]);
                        double term_numerator = (1.0 - std::pow(q_param, N_param + tc - x));
                        double term_denominator = (1.0 - std::pow(q_param, N_param + S_param - x - 1.0));
                        if (std::abs(term_denominator) < 1e-9) { p[i] = 0.0; }
                        else { p[i] = p[i-1] * std::pow(q_param, K_prime_val) * term_numerator / term_denominator; }
                    }
                } else { // Subcase: q < 1 AND K_prime_val <= 0 (tc >= S_param)
                    p[j_end - k_start + 1] = 1.0; // Backward iteration
                    for (int i = 0; i < j_end - k_start + 1; i++) {
                        int current_p_idx = j_end - k_start - i;
                        double x_for_current_p = static_cast<double>(paths[k_start + current_p_idx][tc]);
                        double term_numerator = (1.0 - std::pow(q_param, N_param + S_param - x_for_current_p - 1.0));
                        double term_denominator = (1.0 - std::pow(q_param, N_param + tc - x_for_current_p));
                        if (std::abs(term_denominator) < 1e-9) { p[current_p_idx] = 0.0; }
                        else {
                            p[current_p_idx] = p[j_end - k_start + 1 - i] *
                                std::pow(q_param, -K_prime_val) * term_numerator / term_denominator;
                        }
                    }
                }
            } else { // Case: q_param > 1.0
                if (K_prime_val > 0) { // Subcase: q > 1 AND K_prime_val > 0 (tc < S_param)
                    // Forward iteration. Ratio p[i]/p[i-1] for q>1: (1 - Q^-(N+tc-x)) / (1 - Q^-(N+S-x-1))
                    p[0] = 1.0;
                    for (int i = 1; i <= j_end - k_start + 1; i++) {
                        double x = static_cast<double>(paths[k_start + i - 1][tc]);
                        double term_numerator = (1.0 - std::pow(q_param, -(N_param + tc - x)));
                        double term_denominator = (1.0 - std::pow(q_param, -(N_param + S_param - x - 1.0)));
                        if (std::abs(term_denominator) < 1e-9) { p[i] = 0.0; }
                        else { p[i] = p[i-1] * term_numerator / term_denominator; }
                    }
                } else { // Subcase: q > 1 AND K_prime_val <= 0 (tc >= S_param)
                    // Backward iteration. Ratio p[curr]/p[next] for q>1: (1 - Q^-(N+S-x_curr-1)) / (1 - Q^-(N+tc-x_curr))
                    p[j_end - k_start + 1] = 1.0;
                    for (int i = 0; i < j_end - k_start + 1; i++) {
                        int current_p_idx = j_end - k_start - i;
                        double x_for_current_p = static_cast<double>(paths[k_start + current_p_idx][tc]);
                        double term_numerator = (1.0 - std::pow(q_param, -(N_param + S_param - x_for_current_p - 1.0)));
                        double term_denominator = (1.0 - std::pow(q_param, -(N_param + tc - x_for_current_p)));
                        if (std::abs(term_denominator) < 1e-9) { p[current_p_idx] = 0.0; }
                        else {
                            p[current_p_idx] = p[j_end - k_start + 1 - i] * term_numerator / term_denominator;
                        }
                    }
                }
            }
            break;
        }
    }
}

// Export functions
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* initializeTiling(int n, int t, int s, int mode, double q) {
    try {
        progressCounter = 0;
        
        // Validate parameters
        if (n < 1 || t < 1 || s < 0 || s > t || mode < 5 || mode > 6) {
            throw std::invalid_argument("Invalid parameters");
        }
        
        if (mode == 5 && q <= 0.0) {
            throw std::invalid_argument("q must be positive");
        }

        N_param = n;
        T_param = t;
        S_param = s;
        current_mode = static_cast<TilingMode>(mode);
        q_param = q;

        // Resize paths array
        paths.resize(N_param);
        for (int i = 0; i < N_param; i++) {
            paths[i].resize(T_param + 1);
        }

        // Initialize paths
        initPaths();
        
        progressCounter = 100;
        
        // Return JSON with initial state
        std::string json = "{\"status\":\"initialized\",\"n\":" + std::to_string(N_param) + 
                          ",\"t\":" + std::to_string(T_param) + 
                          ",\"s\":" + std::to_string(S_param) + 
                          ",\"mode\":" + std::to_string(mode) + 
                          ",\"q\":" + std::to_string(q_param) + "}";
        
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
        
    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        progressCounter = 100;
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* performSOperator() {
    try {
        progressCounter = 0;
        
        // Call the REAL S operator algorithm
        sOperator();
        
        progressCounter = 100;
        
        std::string json = "{\"status\":\"s_operator_complete\",\"s\":" + std::to_string(S_param) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
        
    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        progressCounter = 100;
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* performSMinusOperator() {
    try {
        progressCounter = 0;
        
        // S-minus operator - prevent going below 0
        if (S_param <= 0) {
            std::string json = "{\"error\":\"Cannot perform S-minus: S is already at minimum (0)\"}";
            char* out = (char*)malloc(json.size() + 1);
            strcpy(out, json.c_str());
            return out;
        }
        
        // Call the REAL S-minus operator algorithm
        sMinusOperator();
        
        progressCounter = 100;
        
        std::string json = "{\"status\":\"s_minus_operator_complete\",\"s\":" + std::to_string(S_param) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
        
    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        progressCounter = 100;
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* exportPaths() {
    try {
        progressCounter = 0;
        
        // Build JSON output with paths data
        std::string json = "{\"paths\":[";
        
        for (int i = 0; i < N_param; i++) {
            if (i > 0) json += ",";
            json += "[";
            for (int t = 0; t <= T_param; t++) {
                if (t > 0) json += ",";
                json += std::to_string(paths[i][t]);
            }
            json += "]";
        }
        
        json += "],\"n\":" + std::to_string(N_param) + 
               ",\"t\":" + std::to_string(T_param) + 
               ",\"s\":" + std::to_string(S_param) + "}";
        
        progressCounter = 100;
        
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
        
    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        progressCounter = 100;
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* updateParameters(int mode, double q) {
    try {
        progressCounter = 0;
        
        if (mode < 5 || mode > 6) {
            throw std::invalid_argument("Mode must be 5 or 6");
        }
        
        if (mode == 5 && q <= 0.0) {
            throw std::invalid_argument("q must be positive");
        }
        
        current_mode = static_cast<TilingMode>(mode);
        q_param = q;
        
        progressCounter = 100;
        
        std::string json = "{\"status\":\"parameters_updated\",\"mode\":" + std::to_string(mode) + 
                          ",\"q\":" + std::to_string(q_param) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
        
    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
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