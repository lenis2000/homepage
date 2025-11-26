/*
emcc 2025-11-26-c2-region-glauber.cpp -o 2025-11-26-c2-region-glauber.js \
 -s WASM=1 \
 -s "EXPORTED_FUNCTIONS=['_initDomain','_performGlauberSteps','_exportHeights','_updatePolygonParams','_setMode','_updateBias','_freeString','_getTotalCubes','_getAcceptRate']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=32MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv 2025-11-26-c2-region-glauber.js ../../js/

Features:
- Glauber dynamics (MCMC) simulation for lozenge tilings
- C2 region: 5-parameter polygon (a, b, c, d, e) with closure constraint a = b + c + e - d
- Three regions with different height constraints:
  - Region 1 (square): height [0, 2h]
  - Region 2 (right of diagonal): height [h, 2h] (raised floor)
  - Region 3 (above diagonal): height [0, h]
- Bias parameter for non-uniform sampling
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
#include <algorithm>

using namespace std;

// Fast xorshift random number generator
static uint64_t rng_state = 12345678901234567ULL;

inline uint64_t xorshift64() {
    rng_state ^= rng_state >> 12;
    rng_state ^= rng_state << 25;
    rng_state ^= rng_state >> 27;
    return rng_state * 0x2545F4914F6CDD1DULL;
}

// Global parameters
int GRID_SIZE = 60;
double BIAS = 0.0;  // Range [-1, 1]: negative = prefer remove, positive = prefer add

// C2 polygon parameters
int PARAM_B = 10;
int PARAM_C = 4;
int PARAM_D = 4;
int PARAM_E = 8;
int PARAM_H = 15;

// Derived values (computed from parameters)
int PARAM_A = 18;  // a = b + c + e - d
int N = 60;
int MAX_HEIGHT = 30;  // 2 * h

// State arrays
std::vector<int> heights;
std::vector<uint8_t> mask;  // 0 = outside, 1 = region 1, 2 = region 2, 3 = region 3

// Polygon vertices (10 vertices)
std::vector<std::pair<int, int>> polygon;

// Statistics
long long totalSteps = 0;
long long acceptedFlips = 0;
long long recentAccepted = 0;
long long recentTotal = 0;

// Helper function: get random double in (0,1)
inline double getRandom01() {
    return (xorshift64() >> 11) * (1.0 / 9007199254740992.0);
}

// Helper function: get random int in [0, n)
inline int getRandomInt(int n) {
    return static_cast<int>((xorshift64() >> 11) % n);
}

// Update derived values from polygon parameters
void updateDerivedValues() {
    PARAM_A = PARAM_B + PARAM_C + PARAM_E - PARAM_D;
    MAX_HEIGHT = 2 * PARAM_H;

    // Build polygon vertices
    int a = PARAM_A, b = PARAM_B, c = PARAM_C, d = PARAM_D, e = PARAM_E;
    polygon.clear();
    polygon.push_back({0, 0});
    polygon.push_back({a, 0});
    polygon.push_back({a, b});
    polygon.push_back({a - c, b});
    polygon.push_back({a - c, b - d});
    polygon.push_back({a - c - e, b - d});
    polygon.push_back({a - c - e, b - d + e});
    polygon.push_back({a - c - e + d, b - d + e});
    polygon.push_back({a - c - e + d, b - d + e + c});
    polygon.push_back({0, b - d + e + c});
}

// Point-in-polygon test (ray casting algorithm)
bool pointInPolygon(double px, double py) {
    bool inside = false;
    int n = polygon.size();
    for (int i = 0, j = n - 1; i < n; j = i++) {
        double xi = polygon[i].first, yi = polygon[i].second;
        double xj = polygon[j].first, yj = polygon[j].second;
        if (((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

// Determine which region a point belongs to
// Returns: 0 (outside), 1 (square), 2 (right of diagonal), 3 (above diagonal)
// Uses 90 degree CW rotation: (x, y) -> (a - 1 - y, x)
int getRegion(int x, int y) {
    int a = PARAM_A;
    int s = PARAM_B - PARAM_D;  // Square region side length

    // Apply 90 degree CW rotation
    int rotX = a - 1 - y;
    int rotY = x;

    // Check if point is in polygon (use center of cell)
    if (!pointInPolygon(rotX + 0.5, rotY + 0.5)) return 0;

    // Region 1: square region
    if (rotX < s && rotY < s) return 1;

    // Region 2: right of diagonal (rotX > rotY)
    if (rotX > rotY) return 2;

    // Region 3: above/on diagonal
    return 3;
}

// Get minimum height for a region
int getMinHeight(int region) {
    switch (region) {
        case 1: return 0;           // Region 1: 0 to 2h
        case 2: return PARAM_H;     // Region 2: h to 2h (floor raised!)
        case 3: return 0;           // Region 3: 0 to h
        default: return 0;
    }
}

// Get maximum height for a region
int getMaxHeight(int region) {
    switch (region) {
        case 1: return 2 * PARAM_H;  // Region 1: 0 to 2h
        case 2: return 2 * PARAM_H;  // Region 2: h to 2h
        case 3: return PARAM_H;      // Region 3: 0 to h
        default: return 0;
    }
}

// Initialize the C2 polygon domain
// mode: 0 = empty, 1 = fill, 2 = random
void initDomainInternal(int mode) {
    updateDerivedValues();

    N = GRID_SIZE;
    heights.resize(N * N);
    mask.resize(N * N);

    totalSteps = 0;
    acceptedFlips = 0;
    recentAccepted = 0;
    recentTotal = 0;

    for (int y = 0; y < N; y++) {
        for (int x = 0; x < N; x++) {
            int idx = y * N + x;
            int region = getRegion(x, y);

            mask[idx] = region;  // Store region number (0, 1, 2, or 3)

            if (region == 0) {
                heights[idx] = 0;
                continue;
            }

            int minH = getMinHeight(region);
            int maxH = getMaxHeight(region);

            switch (mode) {
                case 0: // empty
                    heights[idx] = minH;
                    break;
                case 1: // fill
                    heights[idx] = std::min({x, y, maxH});
                    heights[idx] = std::max(heights[idx], minH);
                    break;
                case 2: // random
                    {
                        int range = maxH - minH;
                        int maxPossible = std::min({x, y, range});
                        heights[idx] = minH + ((maxPossible > 0) ? static_cast<int>(getRandom01() * (maxPossible + 1)) : 0);
                    }
                    break;
            }
        }
    }

    // Enforce monotonicity for non-empty modes
    if (mode != 0) {
        // Multiple passes to handle the polygon shape properly
        for (int pass = 0; pass < 5; pass++) {
            for (int y = 0; y < N; y++) {
                for (int x = 0; x < N; x++) {
                    int idx = y * N + x;
                    int region = mask[idx];
                    if (region == 0) continue;

                    int minH = getMinHeight(region);
                    int maxH = getMaxHeight(region);

                    // Check constraints from upstream neighbors
                    if (x > 0 && mask[y * N + (x - 1)] > 0) {
                        maxH = std::min(maxH, heights[y * N + (x - 1)]);
                    }
                    if (y > 0 && mask[(y - 1) * N + x] > 0) {
                        maxH = std::min(maxH, heights[(y - 1) * N + x]);
                    }

                    heights[idx] = std::max(minH, std::min(heights[idx], maxH));
                }
            }
        }
    }
}

// Perform Glauber dynamics MCMC updates
int performGlauberStepsInternal(int numSteps) {
    int accepted = 0;

    // Calculate add probability from bias
    double addProb = 0.5 + BIAS * 0.5;

    for (int step = 0; step < numSteps; step++) {
        int x = getRandomInt(N);
        int y = getRandomInt(N);
        int idx = y * N + x;

        int region = mask[idx];
        if (region == 0) continue;

        int dir = (getRandom01() < addProb) ? 1 : -1;
        int h = heights[idx];
        int newH = h + dir;

        // Check region-specific bounds
        int minH = getMinHeight(region);
        int maxH = getMaxHeight(region);
        if (newH < minH || newH > maxH) continue;

        bool canFlip = false;

        if (dir == 1) {
            // Adding a cube - need support from both upstream neighbors (left, up)
            int supportX = MAX_HEIGHT;
            int supportY = MAX_HEIGHT;

            if (x > 0) {
                int leftIdx = y * N + (x - 1);
                int leftRegion = mask[leftIdx];
                if (leftRegion > 0) {
                    supportX = heights[leftIdx];
                }
            }
            if (y > 0) {
                int upIdx = (y - 1) * N + x;
                int upRegion = mask[upIdx];
                if (upRegion > 0) {
                    supportY = heights[upIdx];
                }
            }

            canFlip = (h < supportX) && (h < supportY);
        } else {
            // Removing a cube - check downstream neighbors (right, down)
            int childX = 0;
            int childY = 0;

            if (x < N - 1) {
                int rightIdx = y * N + (x + 1);
                int rightRegion = mask[rightIdx];
                if (rightRegion > 0) {
                    childX = heights[rightIdx];
                    // Must also respect child's minimum height
                    childX = std::max(childX, getMinHeight(rightRegion));
                }
            }
            if (y < N - 1) {
                int downIdx = (y + 1) * N + x;
                int downRegion = mask[downIdx];
                if (downRegion > 0) {
                    childY = heights[downIdx];
                    childY = std::max(childY, getMinHeight(downRegion));
                }
            }

            canFlip = (h > childX) && (h > childY);
        }

        if (canFlip) {
            heights[idx] = newH;
            accepted++;
        }
    }

    totalSteps += numSteps;
    acceptedFlips += accepted;
    recentAccepted += accepted;
    recentTotal += numSteps;

    return accepted;
}

// Calculate total volume (number of cubes)
long long calculateTotalCubes() {
    long long total = 0;
    for (int i = 0; i < N * N; i++) {
        if (mask[i] > 0) {
            total += heights[i];
        }
    }
    return total;
}

// Export functions
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* initDomain(int gridSize, int paramB, int paramC, int paramD, int paramE, int paramH, double bias, int mode) {
    try {
        // Validate parameters
        if (gridSize < 10 || gridSize > 300) {
            throw std::invalid_argument("Grid size must be between 10 and 300");
        }
        if (paramB < 1 || paramC < 1 || paramD < 1 || paramE < 1 || paramH < 1) {
            throw std::invalid_argument("Polygon parameters must be positive");
        }
        if (paramB <= paramD) {
            throw std::invalid_argument("b must be greater than d for valid square region");
        }
        if (bias < -1.0 || bias > 1.0) {
            throw std::invalid_argument("Bias must be between -1.0 and 1.0");
        }
        if (mode < 0 || mode > 2) {
            throw std::invalid_argument("Mode must be 0 (empty), 1 (fill), or 2 (random)");
        }

        GRID_SIZE = gridSize;
        PARAM_B = paramB;
        PARAM_C = paramC;
        PARAM_D = paramD;
        PARAM_E = paramE;
        PARAM_H = paramH;
        BIAS = bias;

        initDomainInternal(mode);

        // Return JSON with initial state
        std::string json = "{\"status\":\"initialized\",\"gridSize\":" + std::to_string(GRID_SIZE) +
                          ",\"n\":" + std::to_string(N) +
                          ",\"maxHeight\":" + std::to_string(MAX_HEIGHT) +
                          ",\"paramA\":" + std::to_string(PARAM_A) +
                          ",\"paramB\":" + std::to_string(PARAM_B) +
                          ",\"paramC\":" + std::to_string(PARAM_C) +
                          ",\"paramD\":" + std::to_string(PARAM_D) +
                          ",\"paramE\":" + std::to_string(PARAM_E) +
                          ",\"paramH\":" + std::to_string(PARAM_H) +
                          ",\"totalCubes\":" + std::to_string(calculateTotalCubes()) + "}";

        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* performGlauberSteps(int numSteps) {
    try {
        if (numSteps < 1 || numSteps > 1000000) {
            throw std::invalid_argument("Number of steps must be between 1 and 1000000");
        }

        int accepted = performGlauberStepsInternal(numSteps);

        std::string json = "{\"status\":\"steps_complete\",\"stepsPerformed\":" + std::to_string(numSteps) +
                          ",\"accepted\":" + std::to_string(accepted) +
                          ",\"totalSteps\":" + std::to_string(totalSteps) +
                          ",\"totalCubes\":" + std::to_string(calculateTotalCubes()) + "}";

        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* exportHeights() {
    try {
        // Build JSON output with heights and mask data
        std::string json = "{\"n\":" + std::to_string(N) +
                          ",\"maxHeight\":" + std::to_string(MAX_HEIGHT) +
                          ",\"heights\":[";

        for (int i = 0; i < N * N; i++) {
            if (i > 0) json += ",";
            json += std::to_string(heights[i]);
        }

        json += "],\"mask\":[";

        for (int i = 0; i < N * N; i++) {
            if (i > 0) json += ",";
            json += std::to_string(mask[i]);
        }

        json += "],\"totalCubes\":" + std::to_string(calculateTotalCubes()) + "}";

        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* updatePolygonParams(int paramB, int paramC, int paramD, int paramE, int paramH) {
    try {
        if (paramB < 1 || paramC < 1 || paramD < 1 || paramE < 1 || paramH < 1) {
            throw std::invalid_argument("Polygon parameters must be positive");
        }
        if (paramB <= paramD) {
            throw std::invalid_argument("b must be greater than d for valid square region");
        }

        PARAM_B = paramB;
        PARAM_C = paramC;
        PARAM_D = paramD;
        PARAM_E = paramE;
        PARAM_H = paramH;

        // Reinitialize domain with empty mode
        initDomainInternal(0);

        std::string json = "{\"status\":\"params_updated\",\"paramA\":" + std::to_string(PARAM_A) +
                          ",\"paramB\":" + std::to_string(PARAM_B) +
                          ",\"paramC\":" + std::to_string(PARAM_C) +
                          ",\"paramD\":" + std::to_string(PARAM_D) +
                          ",\"paramE\":" + std::to_string(PARAM_E) +
                          ",\"paramH\":" + std::to_string(PARAM_H) +
                          ",\"maxHeight\":" + std::to_string(MAX_HEIGHT) +
                          ",\"totalCubes\":" + std::to_string(calculateTotalCubes()) + "}";

        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* setMode(int mode, double bias) {
    try {
        if (mode < 0 || mode > 2) {
            throw std::invalid_argument("Mode must be 0 (empty), 1 (fill), or 2 (random)");
        }
        if (bias < -1.0 || bias > 1.0) {
            throw std::invalid_argument("Bias must be between -1.0 and 1.0");
        }

        BIAS = bias;
        initDomainInternal(mode);

        std::string json = "{\"status\":\"mode_set\",\"mode\":" + std::to_string(mode) +
                          ",\"bias\":" + std::to_string(BIAS) +
                          ",\"totalCubes\":" + std::to_string(calculateTotalCubes()) + "}";

        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* updateBias(double bias) {
    try {
        if (bias < -1.0 || bias > 1.0) {
            throw std::invalid_argument("Bias must be between -1.0 and 1.0");
        }

        BIAS = bias;

        std::string json = "{\"status\":\"bias_updated\",\"bias\":" + std::to_string(BIAS) + "}";

        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& e) {
        std::string errorMsg = "{\"error\":\"" + std::string(e.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
long long getTotalCubes() {
    return calculateTotalCubes();
}

EMSCRIPTEN_KEEPALIVE
double getAcceptRate() {
    if (recentTotal == 0) return 0.0;
    double rate = static_cast<double>(recentAccepted) / static_cast<double>(recentTotal);
    // Reset recent counters
    if (recentTotal > 100000) {
        recentAccepted = 0;
        recentTotal = 0;
    }
    return rate;
}

} // extern "C"
