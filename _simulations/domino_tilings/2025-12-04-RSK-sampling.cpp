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
 -O3 -ffast-math -flto -DNDEBUG \
 && mv 2025-12-04-RSK-sampling.js ../../js/
*/

#include <emscripten.h>
#include <vector>
#include <string>
#include <cmath>
#include <random>
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

// Fast integer power - much faster than pow() for small integer exponents
inline double fastPow(double base, int exp) {
    if (exp <= 0) return 1.0;
    if (exp == 1) return base;
    if (exp == 2) return base * base;
    double result = 1.0;
    while (exp > 0) {
        if (exp & 1) result *= base;
        base *= base;
        exp >>= 1;
    }
    return result;
}

// Precomputed powers of q (filled once per sample)
static vector<double> qPowers;
static double cachedQ = -1.0;

inline double getQPower(double q, int exp) {
    if (exp <= 0) return 1.0;
    if (q != cachedQ) {
        // Rebuild cache
        cachedQ = q;
        qPowers.resize(256);
        qPowers[0] = 1.0;
        for (int i = 1; i < 256; i++) {
            qPowers[i] = qPowers[i-1] * q;
        }
    }
    if (exp < 256) return qPowers[exp];
    return fastPow(q, exp);
}

// Compute f_k for the q-deformed probability (equation 5.2 in arXiv:1504.00666)
// f_k = (1 - q^(λ_k - ν̄_k + 1)) / (1 - q^(ν̄_{k-1} - ν̄_k + 1))
// This is the probability that λ_k is chosen NOT to move within an island.
inline double computeF(int lam_k, int nu_bar_k, int nu_bar_k_minus_1, double q) {
    int delta_lam = lam_k - nu_bar_k + 1;
    if (delta_lam <= 0) return 0.0;
    int delta_nu = nu_bar_k_minus_1 - nu_bar_k + 1;
    if (delta_nu <= 0) return 1.0;
    double numerator = 1.0 - getQPower(q, delta_lam);
    double denominator = 1.0 - getQPower(q, delta_nu);
    if (denominator == 0.0) return 1.0;
    return numerator / denominator;
}

// Compute g_i for the q-deformed probability
// g_i = 1 - q^(λ_i - ν̄_i + 1)
// Used in sequential sampling within an island.
inline double computeG(int lam_i, int nu_bar_i, double q) {
    int delta = lam_i - nu_bar_i + 1;
    if (delta <= 0) return 0.0;
    return 1.0 - getQPower(q, delta);
}

// Static buffers to avoid allocations in inner loop (reused across calls)
static vector<int> s_moved;
static vector<pair<int, int>> s_islands;
static vector<int> s_nuParts;

// q-Whittaker version of the VH bijection for the Aztec diamond growth diagram
// Implements exact dynamics from arXiv:1504.00666 Section 5.1
// For q=0, reduces to the deterministic Schur case
Partition sampleVHq(const Partition& lam, const Partition& mu, const Partition& kappa, int bit, double q) {
    const int maxLen = max({(int)lam.size(), (int)mu.size(), (int)kappa.size()}) + 2;

    // Reuse static buffers
    s_moved.clear();
    s_islands.clear();

    // Find islands: consecutive indices where mu_i - kappa_i = 1
    for (int i = 0; i < maxLen; i++) {
        if (getPart(mu, i) - getPart(kappa, i) == 1) {
            s_moved.push_back(i);
        }
    }

    // Group into islands (consecutive indices)
    if (!s_moved.empty()) {
        int islandStart = s_moved[0];
        int islandEnd = s_moved[0];
        for (size_t i = 1; i < s_moved.size(); i++) {
            if (s_moved[i] == s_moved[i-1] + 1) {
                islandEnd = s_moved[i];
            } else {
                s_islands.push_back({islandStart, islandEnd});
                islandStart = s_moved[i];
                islandEnd = s_moved[i];
            }
        }
        s_islands.push_back({islandStart, islandEnd});
    }

    // Initialize nu = lam (reuse static buffer)
    s_nuParts.resize(maxLen);
    for (int i = 0; i < maxLen; i++) {
        s_nuParts[i] = getPart(lam, i);
    }

    // Step 1: Rightmost particle jumps by bit
    s_nuParts[0] = getPart(lam, 0) + bit;

    // Step 2: Process each island
    for (const auto& island : s_islands) {
        const int k = island.first;
        const int m = island.second;
        const int nu_bar_k = getPart(mu, k);
        const int nu_bar_k_minus_1 = (k > 0) ? getPart(mu, k - 1) : 1000000000; // Large value as infinity

        // Case 1: bit=1 and k=0 (island contains first particle)
        if (bit == 1 && k == 0) {
            for (int idx = 1; idx <= m + 1; idx++) {
                s_nuParts[idx] = getPart(lam, idx) + 1;
            }
            continue;
        }

        // Case 2: bit=0 or k>0
        int stoppedAt;
        if (q == 0.0) {
            // Schur case: deterministic - find first free particle
            stoppedAt = m + 1;
            for (int idx = k; idx <= m; idx++) {
                if (getPart(lam, idx) > getPart(mu, idx) - 1) {
                    stoppedAt = idx;
                    break;
                }
            }
        } else {
            // q-Whittaker case: probabilistic sampling
            const int lam_k = getPart(lam, k);
            const double f_k = computeF(lam_k, nu_bar_k, nu_bar_k_minus_1, q);

            if (uniform01(rng) < f_k) {
                stoppedAt = k;
            } else {
                stoppedAt = m + 1;
                for (int s = k + 1; s <= m; s++) {
                    const double g_s = computeG(getPart(lam, s), getPart(mu, s), q);
                    if (uniform01(rng) < g_s) {
                        stoppedAt = s;
                        break;
                    }
                }
            }
        }

        // Apply the moves
        for (int idx = k; idx <= m + 1; idx++) {
            if (idx != stoppedAt) {
                s_nuParts[idx] = getPart(lam, idx) + 1;
            }
        }
    }

    // Ensure nu >= mu (horizontal strip condition)
    for (int i = 0; i < maxLen; i++) {
        s_nuParts[i] = max(s_nuParts[i], getPart(mu, i));
    }

    // Trim trailing zeros and return copy
    int trimLen = maxLen;
    while (trimLen > 0 && s_nuParts[trimLen - 1] == 0) {
        trimLen--;
    }

    return Partition(s_nuParts.begin(), s_nuParts.begin() + trimLen);
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

    // Initialize growth diagram with 2D vector (much faster than map<string>)
    // tau[i][j] stores partition at position (i,j)
    vector<vector<Partition>> tau(n + 1, vector<Partition>(n + 1));
    // Boundaries are already empty partitions by default

    // Fill staircase row by row
    const int totalCells = n * (n + 1) / 2;
    int cellsDone = 0;
    const int sleepInterval = max(1, n / 10); // Yield ~10 times total instead of every row

    for (int i = 1; i <= n; i++) {
        const int rowLen = n + 1 - i;
        const double xi_base = x[i - 1];

        for (int j = 1; j <= rowLen; j++) {
            const Partition& lam = tau[i-1][j];
            const Partition& mu = tau[i][j-1];
            const Partition& kappa = tau[i-1][j-1];

            // Schur process Bernoulli: p = x_i * y_j / (1 + x_i * y_j)
            const double xi = xi_base * y[j - 1];
            const double p = xi / (1.0 + xi);
            const int bit = (uniform01(rng) < p) ? 1 : 0;

            tau[i][j] = sampleVHq(lam, mu, kappa, bit, q);

            cellsDone++;
        }

        // Update progress and yield less frequently
        progressCounter = 10 + (cellsDone * 80) / totalCells;
        if (i % sleepInterval == 0) {
            emscripten_sleep(0); // Yield to update UI
        }
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
    result.reserve(outputPath.size());
    for (auto it = outputPath.rbegin(); it != outputPath.rend(); ++it) {
        result.push_back(tau[it->first][it->second]);
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

        // Build JSON output using string directly (faster than ostringstream)
        // Estimate size: each partition element ~4 chars avg, plus brackets/commas
        size_t totalParts = 0;
        for (const auto& p : partitions) totalParts += p.size();
        string jsonStr;
        jsonStr.reserve(totalParts * 5 + partitions.size() * 3 + 10);

        jsonStr = "[";
        for (size_t i = 0; i < partitions.size(); i++) {
            if (i > 0) jsonStr += ',';
            jsonStr += '[';
            const Partition& p = partitions[i];
            for (size_t j = 0; j < p.size(); j++) {
                if (j > 0) jsonStr += ',';
                jsonStr += to_string(p[j]);
            }
            jsonStr += ']';
        }
        jsonStr += ']';

        progressCounter = 100;
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
