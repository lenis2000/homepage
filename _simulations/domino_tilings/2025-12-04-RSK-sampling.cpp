/*
q-RSK Sampling of Domino Tilings of the Aztec Diamond

Uses the RSK-type growth diagram algorithm with q-Whittaker deformation.
Based on arXiv:1504.00666 "Integrable probability: From representation theory to Macdonald processes"

Compile with:
emcc 2025-12-04-RSK-sampling.cpp -o 2025-12-04-RSK-sampling.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_sampleAztecRSK','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math \
 && mv 2025-12-04-RSK-sampling.js ../../js/
*/

#include <emscripten.h>
#include <vector>
#include <string>
#include <sstream>
#include <cmath>
#include <random>
#include <map>
#include <cstring>
#include <cstdlib>
#include <algorithm>

using namespace std;

// Global RNG
static std::mt19937 rng(std::random_device{}());
static std::uniform_real_distribution<double> uniform01(0.0, 1.0);

// Progress counter
volatile int progressCounter = 0;

// Partition type
using Partition = vector<int>;

// Get i-th part of partition (0-indexed), return 0 if out of range
inline int getPart(const Partition& partition, int i) {
    return (i >= 0 && i < (int)partition.size()) ? partition[i] : 0;
}

// Compute f_k for the q-deformed probability (equation 5.2 in arXiv:1504.00666)
// f_k = (1 - q^(λ_k - ν̄_k + 1)) / (1 - q^(ν̄_{k-1} - ν̄_k + 1))
// This is the probability that λ_k is chosen NOT to move within an island.
double computeF(int lam_k, int nu_bar_k, double nu_bar_k_minus_1, double q) {
    if (q == 0.0) {
        // Schur case: λ_k doesn't move iff it's free (not pushed)
        int delta = lam_k - nu_bar_k + 1;
        return delta > 0 ? 1.0 : 0.0;
    }
    int delta_lam = lam_k - nu_bar_k + 1;
    double delta_nu = nu_bar_k_minus_1 - nu_bar_k + 1;
    if (delta_nu <= 0) return 1.0;
    if (delta_lam <= 0) return 0.0;
    double numerator = 1.0 - pow(q, delta_lam);
    double denominator = 1.0 - pow(q, delta_nu);
    if (denominator == 0.0) return 1.0;
    return numerator / denominator;
}

// Compute g_i for the q-deformed probability
// g_i = 1 - q^(λ_i - ν̄_i + 1)
// Used in sequential sampling within an island.
double computeG(int lam_i, int nu_bar_i, double q) {
    if (q == 0.0) {
        int delta = lam_i - nu_bar_i + 1;
        return delta > 0 ? 1.0 : 0.0;
    }
    int delta = lam_i - nu_bar_i + 1;
    if (delta <= 0) return 0.0;
    return 1.0 - pow(q, delta);
}

// q-Whittaker version of the VH bijection for the Aztec diamond growth diagram
// Implements exact dynamics from arXiv:1504.00666 Section 5.1
// For q=0, reduces to the deterministic Schur case
Partition sampleVHq(const Partition& lam, const Partition& mu, const Partition& kappa, int bit, double q) {
    int maxLen = max({(int)lam.size(), (int)mu.size(), (int)kappa.size()}) + 2;

    // Find islands: consecutive indices where mu_i - kappa_i = 1
    // These are particles that moved at the lower level (bar_λ → bar_ν)
    vector<int> moved;
    for (int i = 0; i < maxLen; i++) {
        if (getPart(mu, i) - getPart(kappa, i) == 1) {
            moved.push_back(i);
        }
    }

    // Group into islands (consecutive indices)
    vector<pair<int, int>> islands;
    if (!moved.empty()) {
        int islandStart = moved[0];
        int islandEnd = moved[0];
        for (size_t i = 1; i < moved.size(); i++) {
            if (moved[i] == moved[i-1] + 1) {
                islandEnd = moved[i];
            } else {
                islands.push_back({islandStart, islandEnd});
                islandStart = moved[i];
                islandEnd = moved[i];
            }
        }
        islands.push_back({islandStart, islandEnd});
    }

    // Initialize nu = lam (particles start at their current positions)
    vector<int> nuParts(maxLen);
    for (int i = 0; i < maxLen; i++) {
        nuParts[i] = getPart(lam, i);
    }

    // Step 1: Rightmost particle jumps by bit
    // ν_1 = λ_1 + V_j (index 0 in 0-indexed)
    nuParts[0] = getPart(lam, 0) + bit;

    // Step 2: Process each island
    for (const auto& island : islands) {
        int k = island.first;
        int m = island.second;
        int nu_bar_k = getPart(mu, k);
        double nu_bar_k_minus_1 = (k > 0) ? (double)getPart(mu, k - 1) : 1e18; // Infinity

        // Case 1: bit=1 and k=0 (island contains first particle)
        // All particles λ_1, ..., λ_{m+1} (indices 1 to m+1) move with prob 1
        if (bit == 1 && k == 0) {
            for (int idx = 1; idx <= m + 1; idx++) {
                nuParts[idx] = getPart(lam, idx) + 1;
            }
            continue;
        }

        // Case 2: bit=0 or k>0
        // One of λ_k, ..., λ_{m+1} doesn't move; sample which one
        int stoppedAt;
        if (q == 0.0) {
            // Schur case: deterministic
            // Find first particle that is "free" (not pushed)
            // λ_i is pushed if λ_i = bar_ν_i - 1
            stoppedAt = m + 1;  // default: last one doesn't move
            for (int idx = k; idx <= m; idx++) {
                int lam_idx = getPart(lam, idx);
                int nu_bar_idx = getPart(mu, idx);
                if (lam_idx > nu_bar_idx - 1) {  // free, doesn't need to move
                    stoppedAt = idx;
                    break;
                }
            }
        } else {
            // q-Whittaker case: probabilistic sampling using f_k, g_s
            int lam_k = getPart(lam, k);
            double f_k = computeF(lam_k, nu_bar_k, nu_bar_k_minus_1, q);

            if (uniform01(rng) < f_k) {
                // λ_k doesn't move
                stoppedAt = k;
            } else {
                // λ_k moves, continue sampling through the island
                stoppedAt = m + 1;  // default if we don't stop earlier
                for (int s = k + 1; s <= m; s++) {
                    int lam_s = getPart(lam, s);
                    int nu_bar_s = getPart(mu, s);
                    double g_s = computeG(lam_s, nu_bar_s, q);
                    if (uniform01(rng) < g_s) {
                        // λ_s doesn't move
                        stoppedAt = s;
                        break;
                    }
                }
                // If loop completes, stoppedAt = m + 1 (λ_{m+1} doesn't move)
            }
        }

        // Apply the moves: all particles in [k, m+1] move except stoppedAt
        for (int idx = k; idx <= m + 1; idx++) {
            if (idx != stoppedAt) {
                nuParts[idx] = getPart(lam, idx) + 1;
            }
            // else: nuParts[idx] stays at lam[idx]
        }
    }

    // Ensure nu >= mu (horizontal strip condition)
    for (int i = 0; i < maxLen; i++) {
        nuParts[i] = max(nuParts[i], getPart(mu, i));
    }

    // Trim trailing zeros
    while (!nuParts.empty() && nuParts.back() == 0) {
        nuParts.pop_back();
    }

    return nuParts;
}

// Sample Aztec diamond partition sequence using RSK growth diagram
// x and y are Schur process parameters (arrays of length n)
// q is the q-Whittaker parameter (0 <= q < 1), q=0 is Schur/uniform
vector<Partition> aztecDiamondSample(int n, const vector<double>& x_in, const vector<double>& y_in, double q) {
    if (n == 0) {
        return {Partition()};
    }

    // Copy and extend x and y to length n
    vector<double> x = x_in;
    vector<double> y = y_in;
    while ((int)x.size() < n) x.push_back(1.0);
    while ((int)y.size() < n) y.push_back(1.0);

    // Initialize growth diagram with empty partitions on boundaries
    // Using map with string keys for compatibility with JavaScript version
    map<string, Partition> tau;
    for (int j = 0; j <= n; j++) {
        tau["0," + to_string(j)] = Partition();
    }
    for (int i = 0; i <= n; i++) {
        tau[to_string(i) + ",0"] = Partition();
    }

    // Fill staircase row by row
    int totalCells = n * (n + 1) / 2;
    int cellsDone = 0;

    for (int i = 1; i <= n; i++) {
        int rowLen = n + 1 - i;
        for (int j = 1; j <= rowLen; j++) {
            const Partition& lam = tau[to_string(i-1) + "," + to_string(j)];
            const Partition& mu = tau[to_string(i) + "," + to_string(j-1)];
            const Partition& kappa = tau[to_string(i-1) + "," + to_string(j-1)];

            // Schur process Bernoulli: p = x_i * y_j / (1 + x_i * y_j)
            double xi = x[i - 1] * y[j - 1];
            double p = xi / (1.0 + xi);
            int bit = (uniform01(rng) < p) ? 1 : 0;

            tau[to_string(i) + "," + to_string(j)] = sampleVHq(lam, mu, kappa, bit, q);

            cellsDone++;
            progressCounter = 10 + (cellsDone * 80) / totalCells;
        }
        emscripten_sleep(0); // Yield to update UI
    }

    // Extract output path along staircase boundary
    // Path goes from (0,n) to (n,0)
    vector<pair<int, int>> outputPath;
    int i = 0, j = n;
    outputPath.push_back({i, j});
    while (i != n || j != 0) {
        if (j <= n - i && i < n) {
            i++;
        } else {
            j--;
        }
        outputPath.push_back({i, j});
    }

    // Reverse to get correct order: λ⁰ first (empty), then growing, then shrinking back to λⁿ (empty)
    vector<Partition> result;
    for (auto it = outputPath.rbegin(); it != outputPath.rend(); ++it) {
        result.push_back(tau[to_string(it->first) + "," + to_string(it->second)]);
    }

    return result;
}

// Parse JSON array of doubles
vector<double> parseJsonArray(const char* json) {
    vector<double> result;
    if (!json || json[0] != '[') return result;

    const char* p = json + 1;
    while (*p) {
        // Skip whitespace
        while (*p == ' ' || *p == '\t' || *p == '\n' || *p == ',') p++;
        if (*p == ']') break;

        // Parse number
        char* end;
        double val = strtod(p, &end);
        if (end != p) {
            result.push_back(val);
            p = end;
        } else {
            break;
        }
    }
    return result;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* sampleAztecRSK(int n, const char* xJson, const char* yJson, double q) {
    try {
        progressCounter = 0;

        // Parse x and y parameters
        vector<double> x = parseJsonArray(xJson);
        vector<double> y = parseJsonArray(yJson);

        progressCounter = 5;

        // Sample the partition sequence
        vector<Partition> partitions = aztecDiamondSample(n, x, y, q);

        progressCounter = 95;

        // Build JSON output
        // Format: [[p1_1, p1_2, ...], [p2_1, p2_2, ...], ...]
        ostringstream oss;
        oss << "[";
        for (size_t i = 0; i < partitions.size(); i++) {
            if (i > 0) oss << ",";
            oss << "[";
            const Partition& p = partitions[i];
            for (size_t j = 0; j < p.size(); j++) {
                if (j > 0) oss << ",";
                oss << p[j];
            }
            oss << "]";
        }
        oss << "]";

        progressCounter = 100;

        string jsonStr = oss.str();
        char* out = (char*)malloc(jsonStr.size() + 1);
        if (out) {
            strcpy(out, jsonStr.c_str());
        }
        return out;

    } catch (const exception& e) {
        progressCounter = 100;
        string errorMsg = string("{\"error\":\"") + e.what() + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        if (out) {
            strcpy(out, errorMsg.c_str());
        }
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
