/*
emcc 2025-11-26-cutout-region-glauber.cpp -o 2025-11-26-cutout-region-glauber.js \
 -s WASM=1 \
 -s "EXPORTED_FUNCTIONS=['_initDomain','_performGlauberSteps','_exportHeights','_updateCutoutParams','_setMode','_updateBias','_freeString','_getTotalCubes','_getAcceptRate']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=32MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv 2025-11-26-cutout-region-glauber.js ../../js/

Features:
- Glauber dynamics (MCMC) simulation for lozenge tilings
- Supports cutout regions (C-shaped domains)
- Configurable cutout parameters
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

using namespace std;

// Random number generator
static std::mt19937 rng(std::random_device{}());
static std::uniform_real_distribution<> dis(0.0, 1.0);

// Global parameters
int GRID_SIZE = 60;
double MAX_HEIGHT_RATIO = 0.7;
double BIAS = 0.0;  // Range [-0.1, 0.1]: negative = prefer remove, positive = prefer add

// C-Region cutout parameters (as percentages, 0-100)
int CUT_X1 = 30;     // X position where first cutout starts (%)
int CUT_X2 = 60;     // X position where first cutout ends (%)
int CUT_Y1 = 25;     // Y start of cutout (%)
int CUT_Y2 = 75;     // Y end of cutout (%)
int HOLE_HEIGHT = 0; // Height of the hole region as % of MAX_HEIGHT (0 = complete hole)

// Derived values
int N = 60;
int MAX_HEIGHT = 42;
int HOLE_MAX_HEIGHT = 0; // Derived from HOLE_HEIGHT

// State arrays
std::vector<int> heights;
std::vector<uint8_t> mask;

// Statistics
long long totalSteps = 0;
long long acceptedFlips = 0;
long long recentAccepted = 0;
long long recentTotal = 0;

// Helper function: get random double in (0,1)
inline double getRandom01() {
    return dis(rng);
}

// Initialize the C-shaped domain
// mode: 0 = empty, 1 = fill, 2 = random
void initDomainInternal(int mode) {
    N = GRID_SIZE;
    MAX_HEIGHT = static_cast<int>(N * MAX_HEIGHT_RATIO);
    HOLE_MAX_HEIGHT = static_cast<int>(MAX_HEIGHT * HOLE_HEIGHT / 100);

    heights.resize(N * N);
    mask.resize(N * N);

    totalSteps = 0;
    acceptedFlips = 0;
    recentAccepted = 0;
    recentTotal = 0;

    // Define shaped domain using configurable cutout parameters
    int cutX1 = N * CUT_X1 / 100;
    int cutX2 = N * CUT_X2 / 100;
    int cutY1 = N * CUT_Y1 / 100;
    int cutY2 = N * CUT_Y2 / 100;

    for (int y = 0; y < N; y++) {
        for (int x = 0; x < N; x++) {
            int idx = y * N + x;

            // Shape with notch: cutout only between cutX1 and cutX2
            bool inCutout = (x >= cutX1) && (x < cutX2) && (y >= cutY1) && (y < cutY2);

            // If hole height is 0, it's a complete cutout (mask = 0)
            // Otherwise, it's a region with a raised floor (mask = 1)
            mask[idx] = (inCutout && HOLE_HEIGHT == 0) ? 0 : 1;

            if (mask[idx] == 0) {
                heights[idx] = 0;
                continue;
            }

            // In cutout region, height is FIXED at HOLE_MAX_HEIGHT
            if (inCutout) {
                heights[idx] = HOLE_MAX_HEIGHT;
                continue;
            }

            // Outside cutout, normal behavior
            switch (mode) {
                case 0: // empty
                    heights[idx] = 0;
                    break;
                case 1: // fill
                    heights[idx] = std::min({x, y, MAX_HEIGHT});
                    break;
                case 2: // random
                    {
                        int maxH = std::min({x, y, MAX_HEIGHT});
                        heights[idx] = (maxH > 0) ? static_cast<int>(getRandom01() * (maxH + 1)) : 0;
                    }
                    break;
            }
        }
    }

    // Enforce monotonicity for non-empty modes
    if (mode != 0) {
        // Multiple passes to handle the C-shape properly
        for (int pass = 0; pass < 3; pass++) {
            for (int y = 0; y < N; y++) {
                for (int x = 0; x < N; x++) {
                    int idx = y * N + x;
                    if (mask[idx] == 0) continue;

                    int maxH = MAX_HEIGHT;

                    if (x > 0 && mask[y * N + (x - 1)] == 1) {
                        maxH = std::min(maxH, heights[y * N + (x - 1)]);
                    }
                    if (y > 0 && mask[(y - 1) * N + x] == 1) {
                        maxH = std::min(maxH, heights[(y - 1) * N + x]);
                    }

                    heights[idx] = std::min(heights[idx], maxH);
                }
            }
        }
    }
}

// Perform Glauber dynamics MCMC updates
// Returns the number of accepted flips
int performGlauberStepsInternal(int numSteps) {
    int accepted = 0;

    // Calculate add probability from bias
    // BIAS in [-1, 1] maps to addProb in [0, 1]
    double addProb = 0.5 + BIAS * 0.5;

    // Pre-compute cutout region bounds
    int cutX1 = N * CUT_X1 / 100;
    int cutX2 = N * CUT_X2 / 100;
    int cutY1 = N * CUT_Y1 / 100;
    int cutY2 = N * CUT_Y2 / 100;

    for (int step = 0; step < numSteps; step++) {
        int x = static_cast<int>(getRandom01() * N);
        int y = static_cast<int>(getRandom01() * N);
        int idx = y * N + x;

        if (mask[idx] == 0) continue;

        // Skip cutout region - heights are frozen there
        bool inCutout = (x >= cutX1) && (x < cutX2) && (y >= cutY1) && (y < cutY2);
        if (inCutout && HOLE_HEIGHT > 0) continue;

        int dir = getRandom01() < addProb ? 1 : -1;
        int h = heights[idx];
        int newH = h + dir;

        if (newH < 0 || newH > MAX_HEIGHT) continue;

        // Helper lambda to check if a position is in the frozen cutout
        auto isInFrozenCutout = [&](int px, int py) {
            if (HOLE_HEIGHT == 0) return false;
            return (px >= cutX1) && (px < cutX2) && (py >= cutY1) && (py < cutY2);
        };

        bool canFlip = false;

        if (dir == 1) {
            // Adding a cube - need support from both neighbors
            // Treat frozen cutout tiles as non-constraining (like they don't exist)
            int supportX = MAX_HEIGHT;
            int supportY = MAX_HEIGHT;

            if (x > 0) {
                int leftIdx = y * N + (x - 1);
                if (mask[leftIdx] == 1 && !isInFrozenCutout(x - 1, y)) {
                    supportX = heights[leftIdx];
                }
            }
            if (y > 0) {
                int upIdx = (y - 1) * N + x;
                if (mask[upIdx] == 1 && !isInFrozenCutout(x, y - 1)) {
                    supportY = heights[upIdx];
                }
            }

            canFlip = (h < supportX) && (h < supportY);
        } else {
            // Removing a cube - need no children depending on this cube
            // Treat frozen cutout tiles as non-constraining
            int childX = 0;
            int childY = 0;

            if (x < N - 1) {
                int rightIdx = y * N + (x + 1);
                if (mask[rightIdx] == 1 && !isInFrozenCutout(x + 1, y)) {
                    childX = heights[rightIdx];
                }
            }
            if (y < N - 1) {
                int downIdx = (y + 1) * N + x;
                if (mask[downIdx] == 1 && !isInFrozenCutout(x, y + 1)) {
                    childY = heights[downIdx];
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
        if (mask[i] == 1) {
            total += heights[i];
        }
    }
    return total;
}

// Export functions
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* initDomain(int gridSize, int cutX1, int cutX2, int cutY1, int cutY2, int holeHeight, double maxHeightRatio, double bias, int mode) {
    try {
        // Validate parameters
        if (gridSize < 10 || gridSize > 300) {
            throw std::invalid_argument("Grid size must be between 10 and 300");
        }
        if (cutX1 < 0 || cutX1 > 100 || cutX2 < 0 || cutX2 > 100 || cutY1 < 0 || cutY1 > 100 || cutY2 < 0 || cutY2 > 100) {
            throw std::invalid_argument("Cutout parameters must be percentages (0-100)");
        }
        if (cutX1 >= cutX2) {
            throw std::invalid_argument("cutX1 must be less than cutX2");
        }
        if (cutY1 >= cutY2) {
            throw std::invalid_argument("cutY1 must be less than cutY2");
        }
        if (holeHeight < 0 || holeHeight > 100) {
            throw std::invalid_argument("Hole height must be a percentage (0-100)");
        }
        if (maxHeightRatio < 0.1 || maxHeightRatio > 1.0) {
            throw std::invalid_argument("maxHeightRatio must be between 0.1 and 1.0");
        }
        if (bias < -1.0 || bias > 1.0) {
            throw std::invalid_argument("Bias must be between -1.0 and 1.0");
        }
        if (mode < 0 || mode > 2) {
            throw std::invalid_argument("Mode must be 0 (empty), 1 (fill), or 2 (random)");
        }

        GRID_SIZE = gridSize;
        CUT_X1 = cutX1;
        CUT_X2 = cutX2;
        CUT_Y1 = cutY1;
        CUT_Y2 = cutY2;
        HOLE_HEIGHT = holeHeight;
        MAX_HEIGHT_RATIO = maxHeightRatio;
        BIAS = bias;

        initDomainInternal(mode);

        // Return JSON with initial state
        std::string json = "{\"status\":\"initialized\",\"gridSize\":" + std::to_string(GRID_SIZE) +
                          ",\"n\":" + std::to_string(N) +
                          ",\"maxHeight\":" + std::to_string(MAX_HEIGHT) +
                          ",\"holeMaxHeight\":" + std::to_string(HOLE_MAX_HEIGHT) +
                          ",\"cutX1\":" + std::to_string(CUT_X1) +
                          ",\"cutX2\":" + std::to_string(CUT_X2) +
                          ",\"cutY1\":" + std::to_string(CUT_Y1) +
                          ",\"cutY2\":" + std::to_string(CUT_Y2) +
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
char* updateCutoutParams(int cutX1, int cutX2, int cutY1, int cutY2) {
    try {
        if (cutX1 < 0 || cutX1 > 100 || cutX2 < 0 || cutX2 > 100 || cutY1 < 0 || cutY1 > 100 || cutY2 < 0 || cutY2 > 100) {
            throw std::invalid_argument("Cutout parameters must be percentages (0-100)");
        }
        if (cutX1 >= cutX2) {
            throw std::invalid_argument("cutX1 must be less than cutX2");
        }
        if (cutY1 >= cutY2) {
            throw std::invalid_argument("cutY1 must be less than cutY2");
        }

        CUT_X1 = cutX1;
        CUT_X2 = cutX2;
        CUT_Y1 = cutY1;
        CUT_Y2 = cutY2;

        // Reinitialize domain with empty mode
        initDomainInternal(0);

        std::string json = "{\"status\":\"cutout_updated\",\"cutX1\":" + std::to_string(CUT_X1) +
                          ",\"cutX2\":" + std::to_string(CUT_X2) +
                          ",\"cutY1\":" + std::to_string(CUT_Y1) +
                          ",\"cutY2\":" + std::to_string(CUT_Y2) + "}";

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
