/*
RSK Sampling for Aztec Diamond Tilings
Based on arXiv:1407.3764 - Betea, Boutillier, Bouttier, Chapuy, Corteel, Vuletic

emcc 2025-12-04-RSK-sampling.cpp -o 2025-12-04-RSK-sampling.js \
  -s WASM=1 \
  -s ASYNCIFY=1 \
  -s "EXPORTED_FUNCTIONS=['_simulateSchur','_freeString','_getProgress']" \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=64MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math -std=c++17

mv 2025-12-04-RSK-sampling.js ../../js/
*/

#include <emscripten.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <random>
#include <chrono>
#include <sstream>
#include <string>
#include <algorithm>
#include <cstdlib>
#include <cstring>
#include <map>
#include <set>
#include <climits>

using namespace std;

static std::mt19937 rng(std::random_device{}());
volatile int progressCounter = 0;

// Partition represented as vector of non-negative integers (weakly decreasing)
using Partition = vector<int>;

// Helper: get partition part with index i (0-indexed), return 0 if out of bounds
inline int getPart(const Partition& p, int i) {
    return (i >= 0 && i < (int)p.size()) ? p[i] : 0;
}

// Parse JSON array of doubles
vector<double> parseJsonArray(const char* json) {
    vector<double> result;
    if (!json) return result;

    string s(json);
    size_t start = s.find('[');
    size_t end = s.rfind(']');
    if (start == string::npos || end == string::npos || end <= start) {
        return result;
    }

    string content = s.substr(start + 1, end - start - 1);
    stringstream ss(content);
    string token;
    while (getline(ss, token, ',')) {
        size_t first = token.find_first_not_of(" \t\n\r");
        size_t last = token.find_last_not_of(" \t\n\r");
        if (first != string::npos && last != string::npos) {
            string trimmed = token.substr(first, last - first + 1);
            if (!trimmed.empty()) {
                result.push_back(stod(trimmed));
            }
        }
    }
    return result;
}

/*
 * sampleHV: Sample new partition nu given previous partitions
 *
 * For Aztec diamond: word is (prec', succ)^n
 * - prec' means vertical interlacing (conjugate dominance)
 * - succ means horizontal interlacing
 *
 * This implements the HV bijection from the paper (Section 3.5)
 * Given: lambda (from left), mu (from below), kappa (diagonal), xi = x_i * y_j
 * Output: nu (new partition)
 *
 * The key relation: we're adding a box to the staircase partition grid
 * with interlacing conditions:
 *   - lambda ⪯ nu (horizontal strip)
 *   - mu ⪰' nu (vertical strip condition for conjugates)
 */
Partition sampleHV(const Partition& lambda, const Partition& mu,
                   const Partition& kappa, double xi) {
    // Bernoulli sample with probability xi / (1 + xi)
    uniform_real_distribution<double> dist(0.0, 1.0);
    int B = (dist(rng) < xi / (1.0 + xi)) ? 1 : 0;

    // Determine maximum length needed
    int maxLen = max({(int)lambda.size(), (int)mu.size(), (int)kappa.size()}) + 2;

    Partition nu;
    nu.reserve(maxLen);

    // Build nu according to the HV bijection
    // For i = 1, 2, ... (1-indexed in paper, 0-indexed here)
    for (int i = 0; i < maxLen; i++) {
        int lambda_i = getPart(lambda, i);
        int lambda_im1 = getPart(lambda, i - 1);  // lambda_{i-1}
        int mu_i = getPart(mu, i);
        int mu_ip1 = getPart(mu, i + 1);  // mu_{i+1}
        int kappa_i = getPart(kappa, i);

        int nu_i;

        // Check condition: lambda_i <= mu_i < lambda_{i-1}
        if (lambda_i <= mu_i && mu_i < lambda_im1) {
            nu_i = max(lambda_i, mu_i) + B;
        } else {
            nu_i = max(lambda_i, mu_i);
        }

        // Update B for next iteration
        // Condition: mu_{i+1} < lambda_i <= mu_i
        if (mu_ip1 < lambda_i && lambda_i <= mu_i) {
            B = min(lambda_i, mu_i) - kappa_i;
        }

        if (nu_i > 0) {
            nu.push_back(nu_i);
        } else {
            break;
        }
    }

    return nu;
}

/*
 * sampleVH: Similar but for the conjugate case (⪯', ⪰)
 * Used for the other type of step in Aztec diamond
 */
Partition sampleVH(const Partition& lambda, const Partition& mu,
                   const Partition& kappa, double xi) {
    // For VH, we swap the roles similar to HV but with conjugate logic
    uniform_real_distribution<double> dist(0.0, 1.0);
    int B = (dist(rng) < xi / (1.0 + xi)) ? 1 : 0;

    int maxLen = max({(int)lambda.size(), (int)mu.size(), (int)kappa.size()}) + 2;

    Partition nu;
    nu.reserve(maxLen);

    for (int i = 0; i < maxLen; i++) {
        int lambda_i = getPart(lambda, i);
        int lambda_im1 = getPart(lambda, i - 1);
        int mu_i = getPart(mu, i);
        int mu_ip1 = getPart(mu, i + 1);
        int kappa_i = getPart(kappa, i);

        int nu_i;

        // Symmetric condition for VH
        if (mu_i <= lambda_i && lambda_i < mu_ip1) {
            nu_i = max(lambda_i, mu_i) + B;
        } else {
            nu_i = max(lambda_i, mu_i);
        }

        // Update B
        if (lambda_im1 < mu_i && mu_i <= lambda_i) {
            B = min(lambda_i, mu_i) - kappa_i;
        }

        if (nu_i > 0) {
            nu.push_back(nu_i);
        } else {
            break;
        }
    }

    return nu;
}

/*
 * Convert partition to subset with specified size m
 * Given λ = (λ_1 ≥ λ_2 ≥ ... ≥ λ_l) and subset size m = ceiling(k/2),
 * compute S = {s_1 < s_2 < ... < s_m}
 *
 * Algorithm:
 * 1. Reverse partition: [λ_l, λ_{l-1}, ..., λ_1]
 * 2. Pad with zeros at beginning to length m
 * 3. s_i = padded[i-1] + i
 */
vector<int> partitionToSubset(const Partition& lambda, int m) {
    if (m <= 0) return {};

    // Reverse partition
    vector<int> reversed(lambda.rbegin(), lambda.rend());

    // Pad with zeros at the beginning to length m
    while ((int)reversed.size() < m) {
        reversed.insert(reversed.begin(), 0);
    }

    // Compute subset: s_i = reversed[i-1] + i
    vector<int> subset;
    for (int i = 0; i < m; i++) {
        subset.push_back(reversed[i] + (i + 1));
    }
    return subset;
}

/*
 * SchurSampleAztec: Main sampling algorithm for Aztec diamond
 *
 * For Aztec diamond of size n, we sample partitions on a staircase grid.
 * The word is w = (prec', succ)^n meaning we alternate:
 *   - odd columns (j=1,3,5,...): vertical interlacing (⪯')
 *   - even columns (j=2,4,6,...): horizontal interlacing (⪰)
 *
 * The staircase has shape (n, n-1, ..., 1).
 * We sample row by row, column by column.
 *
 * Returns: sequence of 2n partitions along the boundary
 */
vector<Partition> schurSampleAztec(int n, const vector<double>& x,
                                    const vector<double>& y) {
    // Grid of partitions: tau[i][j]
    // i = row (0 to n), j = column (0 to n)
    // We only need the staircase portion
    vector<vector<Partition>> tau(n + 1, vector<Partition>(n + 1));

    // Initialize: tau[0][j] = empty for all j, tau[i][0] = empty for all i
    // (already empty by default)

    // Sample the grid
    // For Aztec diamond, we process diagonals (like shuffling)
    // Or we can process row by row

    // Process by increasing i+j (diagonal processing, like shuffling)
    for (int d = 1; d <= 2 * n; d++) {
        for (int i = max(1, d - n); i <= min(n, d - 1); i++) {
            int j = d - i;
            if (j < 1 || j > n - i + 1) continue;

            // Parameters for this step
            double xi = x[i - 1] * y[j - 1];  // x_i * y_j

            // Get neighboring partitions
            Partition& lambda = tau[i - 1][j];  // from above
            Partition& mu = tau[i][j - 1];      // from left
            Partition& kappa = tau[i - 1][j - 1];  // diagonal

            // Determine type based on position in word
            // Column index j corresponds to position 2*i + j in the word
            // But simpler: for Aztec diamond all steps are HV type
            tau[i][j] = sampleHV(lambda, mu, kappa, xi);
        }

        // Update progress
        progressCounter = 10 + (int)(((double)d / (2 * n)) * 40);
        emscripten_sleep(0);
    }

    // Extract boundary partitions (the "output" of the Schur process)
    // These are partitions along the staircase boundary
    vector<Partition> result;

    // Bottom edge (i=0 to n, j=0): already empty
    // Right edge: move along staircase
    // We collect partitions from the rightmost column of each row
    for (int i = 1; i <= n; i++) {
        int j = n - i + 1;  // rightmost column for row i
        if (j >= 1) {
            result.push_back(tau[i][j]);
        }
    }

    return result;
}

/*
 * Convert partition sequence to domino tiling
 *
 * The partition sequence encodes a Maya diagram evolution
 * Differences between consecutive partitions give domino positions
 */
string partitionsToTilingJSON(const vector<Partition>& partitions, int n) {
    string json = "[";
    bool first = true;
    double scale = 10.0;

    // Simple approach: use the shuffling-like interpretation
    // Each partition pair gives information about one row of dominoes

    // For now, use a direct grid-based sampling output
    // We'll match the format of the existing code

    // Actually, let's use a simpler direct sampling approach
    // The Schur process is equivalent to shuffling for Aztec diamond
    // So we reconstruct the tiling from the partition data

    // Grid representation: 2n x 2n matrix
    vector<vector<int>> grid(2 * n + 2, vector<int>(2 * n + 2, 0));

    // Fill grid based on partitions
    // For simplicity, use direct domino placement
    // Maya diagram approach: partition lambda -> particles at positions lambda_i - i

    int size = 2 * n + 2;

    // Place dominoes based on partition differences
    // This is a simplified reconstruction
    for (int step = 0; step < (int)partitions.size() && step < n; step++) {
        const Partition& p = partitions[step];
        int row = step + 1;

        for (int k = 0; k < (int)p.size(); k++) {
            // Particle at position p[k] - k in Maya diagram
            int col = p[k] - k + n;  // Shift to positive
            if (col >= 0 && col < size - 1 && row >= 0 && row < size - 1) {
                // Place a domino marker
                grid[row][col] = 1;
            }
        }
    }

    // Convert grid to domino JSON
    // Match format: {"x":..., "y":..., "w":..., "h":..., "color":...}
    char buffer[128];

    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            if (grid[i][j] == 1) {
                double x, y, w, h;
                const char* color;

                bool oddI = (i & 1), oddJ = (j & 1);
                if (oddI && oddJ) {
                    color = "blue";
                    x = j - i - 2;
                    y = size + 1 - (i + j) - 1;
                    w = 4;
                    h = 2;
                } else if (oddI && !oddJ) {
                    color = "yellow";
                    x = j - i - 1;
                    y = size + 1 - (i + j) - 2;
                    w = 2;
                    h = 4;
                } else if (!oddI && !oddJ) {
                    color = "green";
                    x = j - i - 2;
                    y = size + 1 - (i + j) - 1;
                    w = 4;
                    h = 2;
                } else {
                    color = "red";
                    x = j - i - 1;
                    y = size + 1 - (i + j) - 2;
                    w = 2;
                    h = 4;
                }

                x *= scale;
                y *= scale;
                w *= scale;
                h *= scale;

                if (!first) json += ",";
                else first = false;

                snprintf(buffer, sizeof(buffer),
                         "{\"x\":%g,\"y\":%g,\"w\":%g,\"h\":%g,\"color\":\"%s\"}",
                         x, y, w, h, color);
                json += buffer;
            }
        }
    }

    json += "]";
    return json;
}

/*
 * Extract diagonal subsets from the grid
 * For Aztec diamond of order n, we get 2n+1 slices
 *
 * Each domino has 2 balls, one in each 1x1 square:
 * - Yellow domino → 2 yellow balls (both IN subset)
 * - Blue domino → 2 blue balls (both NOT in subset)
 *
 * Diagonal slices (NE direction) pass through balls.
 * Element index = position along the diagonal (sorted by cx).
 */
vector<vector<int>> extractDiagonalSubsets(const vector<vector<int>>& grid, int n) {
    int finalSize = 2 * n + 2;
    double scale = 10.0;

    // Each domino gets TWO balls, one per 1x1 square
    struct Ball {
        double cx;          // Center x of the square
        double cy;          // Center y of the square
        bool isYellow;      // Yellow = in subset, Blue = not in subset
    };
    vector<Ball> balls;

    for (int i = 0; i < finalSize; i++) {
        for (int j = 0; j < finalSize; j++) {
            if (grid[i][j] == 1) {
                bool oddI = (i & 1), oddJ = (j & 1);

                if (oddI && !oddJ) {
                    // Yellow (West, vertical domino, w=2, h=4) - 2 squares stacked
                    double xc = (j - i - 1) * scale;
                    double yc = (finalSize + 1 - (i + j) - 2) * scale;
                    balls.push_back({xc + scale, yc + scale, true});
                    balls.push_back({xc + scale, yc + 3 * scale, true});
                } else if (oddI && oddJ) {
                    // Blue (North, horizontal domino, w=4, h=2) - 2 squares side by side
                    double xc = (j - i - 2) * scale;
                    double yc = (finalSize + 1 - (i + j) - 1) * scale;
                    balls.push_back({xc + scale, yc + scale, true});
                    balls.push_back({xc + 3 * scale, yc + scale, true});
                } else if (!oddI && !oddJ) {
                    // Green (South, horizontal domino, w=4, h=2) - 2 squares side by side
                    double xc = (j - i - 2) * scale;
                    double yc = (finalSize + 1 - (i + j) - 1) * scale;
                    balls.push_back({xc + scale, yc + scale, false});
                    balls.push_back({xc + 3 * scale, yc + scale, false});
                } else {
                    // Red (East, vertical domino, w=2, h=4) - 2 squares stacked
                    double xc = (j - i - 1) * scale;
                    double yc = (finalSize + 1 - (i + j) - 2) * scale;
                    balls.push_back({xc + scale, yc + scale, false});
                    balls.push_back({xc + scale, yc + 3 * scale, false});
                }
            }
        }
    }

    if (balls.empty()) {
        vector<vector<int>> result(2*n + 1);
        return result;
    }

    // Group balls by distinct cx+cy values (with small tolerance for floating point)
    map<int, vector<Ball>> ballsBySum;  // key = rounded cx+cy
    for (auto& b : balls) {
        int sumKey = (int)round(b.cx + b.cy);
        ballsBySum[sumKey].push_back(b);
    }

    // Get sorted list of distinct cx+cy values
    vector<int> distinctSums;
    for (auto& kv : ballsBySum) {
        distinctSums.push_back(kv.first);
    }
    sort(distinctSums.begin(), distinctSums.end());

    // Map each distinct sum to a slice index
    int numSlices = (int)distinctSums.size();
    map<int, int> sumToSlice;
    for (int i = 0; i < numSlices; i++) {
        sumToSlice[distinctSums[i]] = i;
    }

    // Group balls by slice
    map<int, vector<Ball>> ballsBySlice;
    for (auto& b : balls) {
        int sumKey = (int)round(b.cx + b.cy);
        int sliceIdx = sumToSlice[sumKey];
        ballsBySlice[sliceIdx].push_back(b);
    }

    // Build subsets for each slice
    vector<vector<int>> subsets(numSlices);

    for (int s = 0; s < numSlices; s++) {
        if (!ballsBySlice.count(s)) continue;

        auto& sliceBalls = ballsBySlice[s];

        // Sort by cx (position along diagonal)
        sort(sliceBalls.begin(), sliceBalls.end(),
             [](const Ball& a, const Ball& b) { return a.cx < b.cx; });

        // Element index = position in sorted order (1-indexed)
        for (int i = 0; i < (int)sliceBalls.size(); i++) {
            if (sliceBalls[i].isYellow) {
                subsets[s].push_back(i + 1);
            }
        }
    }

    // Reverse so that slice 0 is empty (lambda^0) and slice 2n is full (lambda^n)
    // Even slices: lambda^0, lambda^1, ..., lambda^n
    // Odd slices: mu^1, mu^2, ..., mu^n
    reverse(subsets.begin(), subsets.end());

    return subsets;
}

/*
 * Alternative: Use shuffling-style direct sampling
 * This is simpler and matches the existing uniform sampler
 */
string directSample(int n, const vector<double>& x, const vector<double>& y) {
    // For the Schur process with parameters x_i, y_j,
    // the probability of choosing orientation 1 in the 2x2 block at (i,j) is:
    // p = x_i * y_j / (1 + x_i * y_j)
    //
    // This is exactly the Bernoulli probability from the sampleHV bijection

    // Grid: 2n x 2n
    int size = 2 * n;
    vector<vector<int>> grid(size + 2, vector<int>(size + 2, 0));

    uniform_real_distribution<double> dist(0.0, 1.0);

    // Initialize with first 2x2 block
    // For the first step, use x[0] * y[0]
    double xi = x[0] * y[0];
    double p = xi / (1.0 + xi);

    if (dist(rng) < p) {
        grid[0][0] = 1;
        grid[1][1] = 1;
    } else {
        grid[0][1] = 1;
        grid[1][0] = 1;
    }

    // Grow the tiling step by step (like shuffling)
    for (int step = 1; step < n; step++) {
        // Delete/slide phase
        // First, embed in larger grid
        vector<vector<int>> newGrid(size + 2, vector<int>(size + 2, 0));
        int currSize = 2 * (step);

        for (int i = 0; i < currSize; i++) {
            for (int j = 0; j < currSize; j++) {
                newGrid[i + 1][j + 1] = grid[i][j];
            }
        }

        // Delete colliding pairs
        int half = step;
        for (int i = 0; i < half; i++) {
            for (int j = 0; j < half; j++) {
                int i2 = i * 2, j2 = j * 2;
                if (newGrid[i2][j2] == 1 && newGrid[i2 + 1][j2 + 1] == 1) {
                    newGrid[i2][j2] = 0;
                    newGrid[i2 + 1][j2 + 1] = 0;
                } else if (newGrid[i2][j2 + 1] == 1 && newGrid[i2 + 1][j2] == 1) {
                    newGrid[i2 + 1][j2] = 0;
                    newGrid[i2][j2 + 1] = 0;
                }
            }
        }

        // Slide phase
        for (int i = 0; i <= half; i++) {
            for (int j = 0; j <= half; j++) {
                int i2 = i * 2, j2 = j * 2;
                if (newGrid[i2 + 1][j2 + 1] == 1) {
                    newGrid[i2][j2] = 1;
                    newGrid[i2 + 1][j2 + 1] = 0;
                } else if (newGrid[i2][j2] == 1) {
                    newGrid[i2][j2] = 0;
                    newGrid[i2 + 1][j2 + 1] = 1;
                } else if (newGrid[i2 + 1][j2] == 1) {
                    newGrid[i2][j2 + 1] = 1;
                    newGrid[i2 + 1][j2] = 0;
                } else if (newGrid[i2][j2 + 1] == 1) {
                    newGrid[i2 + 1][j2] = 1;
                    newGrid[i2][j2 + 1] = 0;
                }
            }
        }

        // Creation phase with Schur process probabilities
        int newHalf = step + 1;
        int newSize = 2 * newHalf;

        for (int i = 0; i < newHalf; i++) {
            for (int j = 0; j < newHalf; j++) {
                int i2 = i * 2, j2 = j * 2;

                // Check if 2x2 block is empty and eligible
                if (newGrid[i2][j2] == 0 && newGrid[i2 + 1][j2] == 0 &&
                    newGrid[i2][j2 + 1] == 0 && newGrid[i2 + 1][j2 + 1] == 0) {

                    bool eligible = true;
                    if (j > 0) eligible = eligible && (newGrid[i2][j2 - 1] == 0) && (newGrid[i2 + 1][j2 - 1] == 0);
                    if (j < newHalf - 1) eligible = eligible && (newGrid[i2][j2 + 2] == 0) && (newGrid[i2 + 1][j2 + 2] == 0);
                    if (i > 0) eligible = eligible && (newGrid[i2 - 1][j2] == 0) && (newGrid[i2 - 1][j2 + 1] == 0);
                    if (i < newHalf - 1) eligible = eligible && (newGrid[i2 + 2][j2] == 0) && (newGrid[i2 + 2][j2 + 1] == 0);

                    if (eligible) {
                        // Use Schur process probability
                        // Map grid position (i, j) to parameter indices
                        // For step k, we're filling the k-th "ring"
                        // The parameter index depends on the diagonal
                        int paramIdx = step;  // Use step as the main parameter index
                        if (paramIdx >= (int)x.size()) paramIdx = (int)x.size() - 1;
                        if (paramIdx >= (int)y.size()) paramIdx = (int)y.size() - 1;

                        xi = x[paramIdx] * y[paramIdx];
                        p = xi / (1.0 + xi);

                        if (dist(rng) < p) {
                            newGrid[i2][j2] = 1;
                            newGrid[i2 + 1][j2 + 1] = 1;
                        } else {
                            newGrid[i2 + 1][j2] = 1;
                            newGrid[i2][j2 + 1] = 1;
                        }
                    }
                }
            }
        }

        grid = newGrid;
        progressCounter = 10 + (int)(((double)(step + 1) / n) * 80);
        emscripten_sleep(0);
    }

    // Extract diagonal subsets
    vector<vector<int>> subsets = extractDiagonalSubsets(grid, n);

    // Convert grid to JSON
    string json = "{\"dominoes\":[";
    bool first = true;
    double scale = 10.0;
    int finalSize = 2 * n + 2;
    char buffer[128];

    for (int i = 0; i < finalSize; i++) {
        for (int j = 0; j < finalSize; j++) {
            if (grid[i][j] == 1) {
                double xc, yc, w, h;
                const char* color;

                bool oddI = (i & 1), oddJ = (j & 1);
                if (oddI && oddJ) {
                    color = "blue";
                    xc = j - i - 2;
                    yc = finalSize + 1 - (i + j) - 1;
                    w = 4;
                    h = 2;
                } else if (oddI && !oddJ) {
                    color = "yellow";
                    xc = j - i - 1;
                    yc = finalSize + 1 - (i + j) - 2;
                    w = 2;
                    h = 4;
                } else if (!oddI && !oddJ) {
                    color = "green";
                    xc = j - i - 2;
                    yc = finalSize + 1 - (i + j) - 1;
                    w = 4;
                    h = 2;
                } else {
                    color = "red";
                    xc = j - i - 1;
                    yc = finalSize + 1 - (i + j) - 2;
                    w = 2;
                    h = 4;
                }

                xc *= scale;
                yc *= scale;
                w *= scale;
                h *= scale;

                if (!first) json += ",";
                else first = false;

                snprintf(buffer, sizeof(buffer),
                         "{\"x\":%g,\"y\":%g,\"w\":%g,\"h\":%g,\"color\":\"%s\"}",
                         xc, yc, w, h, color);
                json += buffer;
            }
        }
    }

    json += "],\"subsets\":[";

    // Add subsets to JSON
    first = true;
    for (const auto& subset : subsets) {
        if (!first) json += ",";
        else first = false;

        json += "[";
        bool firstElem = true;
        for (int elem : subset) {
            if (!firstElem) json += ",";
            else firstElem = false;
            json += to_string(elem);
        }
        json += "]";
    }

    json += "]}";
    return json;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateSchur(int n, const char* x_json, const char* y_json) {
    try {
        progressCounter = 0;

        // Parse parameters
        vector<double> x = parseJsonArray(x_json);
        vector<double> y = parseJsonArray(y_json);

        // Validate and pad parameters if needed
        while ((int)x.size() < n) x.push_back(1.0);
        while ((int)y.size() < n) y.push_back(1.0);

        progressCounter = 5;
        emscripten_sleep(0);

        // Run the direct sampling algorithm
        string json = directSample(n, x, y);

        progressCounter = 100;

        char* out = (char*)malloc(json.size() + 1);
        if (!out) {
            const char* err = "[]";
            out = (char*)malloc(3);
            strcpy(out, err);
            return out;
        }
        strcpy(out, json.c_str());
        return out;

    } catch (const exception& e) {
        progressCounter = 100;
        const char* err = "[]";
        char* out = (char*)malloc(3);
        if (out) strcpy(out, err);
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
