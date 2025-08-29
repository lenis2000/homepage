/*
emcc 2025-08-29-3d-20vertex.cpp -o 2025-08-29-3d-20vertex.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_initializeModel','_sampleConfiguration','_exportArrows','_exportFilledCubes','_freeString','_getProgress','_malloc','_free']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","getValue","setValue","HEAPF64","HEAPU8","HEAPU32"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=128MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
 mv 2025-08-29-3d-20vertex.js ../../js/

Features:
- Twenty-vertex model (Bufetov-Zografos)
- 3D lattice with arrows on edges
- Stochastic vertex weights
- Interactive visualization with WebGL
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

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

// Random number generator
static std::mt19937 rng(std::random_device{}());
static std::uniform_real_distribution<double> uniform01(0.0, 1.0);

// Global parameters
int N_param = 10;  // Grid size N x N x N

// Flattened arrow data structure for performance
std::vector<uint8_t> arrows; // Flat array for performance
#define ARROW_INDEX(x, y, z, dir) ((size_t)(x) * N_param * N_param * 3 + (size_t)(y) * N_param * 3 + (size_t)(z) * 3 + (dir))

// Global vector to store filled cube coordinates
std::vector<uint32_t> filledCubes;

// Pre-calculated sampling probabilities
double cumProbs_sum1[3][3]; // For incoming sums of 1
int outcomes_sum1[3][3];    // Encoded outcomes for sum=1
double cumProbs_sum2[3][3]; // For incoming sums of 2
int outcomes_sum2[3][3];    // Encoded outcomes for sum=2

// The 12 free parameters (after accounting for sum-to-one constraints)
double freeParams[12];

// Helper function to get random number in [0,1]
double getRandom01() {
    return uniform01(rng);
}

// Convert 3-bit pattern to index
int patternToIndex(int x, int y, int z) {
    return (x << 2) | (y << 1) | z;
}

void initializeWeights() {
    // --- Outcomes for 1 incoming arrow (sum=1) ---
    // Possible outgoing patterns: 100 (4), 010 (2), 001 (1)
    outcomes_sum1[0][0] = 4; outcomes_sum1[0][1] = 2; outcomes_sum1[0][2] = 1;
    outcomes_sum1[1][0] = 4; outcomes_sum1[1][1] = 2; outcomes_sum1[1][2] = 1;
    outcomes_sum1[2][0] = 4; outcomes_sum1[2][1] = 2; outcomes_sum1[2][2] = 1;

    // Probabilities for incoming 100
    double p100_1 = freeParams[0]; double p100_2 = freeParams[1]; double p100_3 = 1.0;
    double sum100 = p100_1 + p100_2 + p100_3;
    cumProbs_sum1[0][0] = p100_1 / sum100;
    cumProbs_sum1[0][1] = cumProbs_sum1[0][0] + p100_2 / sum100;
    cumProbs_sum1[0][2] = 1.0;

    // Probabilities for incoming 010
    double p010_1 = freeParams[2]; double p010_2 = freeParams[3]; double p010_3 = 1.0;
    double sum010 = p010_1 + p010_2 + p010_3;
    cumProbs_sum1[1][0] = p010_1 / sum010;
    cumProbs_sum1[1][1] = cumProbs_sum1[1][0] + p010_2 / sum010;
    cumProbs_sum1[1][2] = 1.0;

    // Probabilities for incoming 001
    double p001_1 = freeParams[4]; double p001_2 = freeParams[5]; double p001_3 = 1.0;
    double sum001 = p001_1 + p001_2 + p001_3;
    cumProbs_sum1[2][0] = p001_1 / sum001;
    cumProbs_sum1[2][1] = cumProbs_sum1[2][0] + p001_2 / sum001;
    cumProbs_sum1[2][2] = 1.0;


    // --- Outcomes for 2 incoming arrows (sum=2) ---
    // Possible outgoing patterns: 110 (6), 101 (5), 011 (3)
    outcomes_sum2[0][0] = 6; outcomes_sum2[0][1] = 5; outcomes_sum2[0][2] = 3;
    outcomes_sum2[1][0] = 6; outcomes_sum2[1][1] = 5; outcomes_sum2[1][2] = 3;
    outcomes_sum2[2][0] = 6; outcomes_sum2[2][1] = 5; outcomes_sum2[2][2] = 3;

    // Probabilities for incoming 110
    double p110_1 = freeParams[6]; double p110_2 = freeParams[7]; double p110_3 = 1.0;
    double sum110 = p110_1 + p110_2 + p110_3;
    cumProbs_sum2[0][0] = p110_1 / sum110;
    cumProbs_sum2[0][1] = cumProbs_sum2[0][0] + p110_2 / sum110;
    cumProbs_sum2[0][2] = 1.0;

    // Probabilities for incoming 101
    double p101_1 = freeParams[8]; double p101_2 = freeParams[9]; double p101_3 = 1.0;
    double sum101 = p101_1 + p101_2 + p101_3;
    cumProbs_sum2[1][0] = p101_1 / sum101;
    cumProbs_sum2[1][1] = cumProbs_sum2[1][0] + p101_2 / sum101;
    cumProbs_sum2[1][2] = 1.0;
    
    // Probabilities for incoming 011
    double p011_1 = freeParams[10]; double p011_2 = freeParams[11]; double p011_3 = 1.0;
    double sum011 = p011_1 + p011_2 + p011_3;
    cumProbs_sum2[2][0] = p011_1 / sum011;
    cumProbs_sum2[2][1] = cumProbs_sum2[2][0] + p011_2 / sum011;
    cumProbs_sum2[2][2] = 1.0;
}

void initializeArrows() {
    arrows.assign((size_t)N_param * N_param * N_param * 3, 0);
    // The boundary condition logic is handled in sampleVertex, so no changes are needed here.
}

void sampleVertex(int x, int y, int z) {
    // Get incoming arrows using flattened array
    int in_x = (x > 0) ? arrows[ARROW_INDEX(x - 1, y, z, 0)] : 0;
    int in_y = (y > 0) ? arrows[ARROW_INDEX(x, y - 1, z, 1)] : 0;
    int in_z = (z > 0) ? arrows[ARROW_INDEX(x, y, z - 1, 2)] : ((x > 0 && y > 0) ? 1 : 0); // Boundary condition
    
    int incomingSum = in_x + in_y + in_z;
    
    int chosen_out_pattern = 0;

    if (incomingSum == 0) {
        chosen_out_pattern = 0; // 000
    } else if (incomingSum == 3) {
        chosen_out_pattern = 7; // 111
    } else {
        // Stochastic cases
        double r = getRandom01();
        int incoming_idx = -1;

        if (incomingSum == 1) {
            if (in_x) incoming_idx = 0;      // 100
            else if (in_y) incoming_idx = 1; // 010
            else incoming_idx = 2;           // 001

            if (r < cumProbs_sum1[incoming_idx][0]) chosen_out_pattern = outcomes_sum1[incoming_idx][0];
            else if (r < cumProbs_sum1[incoming_idx][1]) chosen_out_pattern = outcomes_sum1[incoming_idx][1];
            else chosen_out_pattern = outcomes_sum1[incoming_idx][2];

        } else { // incomingSum == 2
            if (!in_z) incoming_idx = 0;     // 110
            else if (!in_y) incoming_idx = 1;// 101
            else incoming_idx = 2;           // 011

            if (r < cumProbs_sum2[incoming_idx][0]) chosen_out_pattern = outcomes_sum2[incoming_idx][0];
            else if (r < cumProbs_sum2[incoming_idx][1]) chosen_out_pattern = outcomes_sum2[incoming_idx][1];
            else chosen_out_pattern = outcomes_sum2[incoming_idx][2];
        }
    }
    
    // Set outgoing arrows
    arrows[ARROW_INDEX(x, y, z, 0)] = (chosen_out_pattern >> 2) & 1;
    arrows[ARROW_INDEX(x, y, z, 1)] = (chosen_out_pattern >> 1) & 1;
    arrows[ARROW_INDEX(x, y, z, 2)] = chosen_out_pattern & 1;
}

bool isCubeFilled(int x, int y, int z) {
    // Check 4 edges in X-dir
    if (!arrows[ARROW_INDEX(x, y, z, 0)]) return false;
    if (!arrows[ARROW_INDEX(x, y + 1, z, 0)]) return false;
    if (!arrows[ARROW_INDEX(x, y, z + 1, 0)]) return false;
    if (!arrows[ARROW_INDEX(x, y + 1, z + 1, 0)]) return false;
    // Check 4 edges in Y-dir
    if (!arrows[ARROW_INDEX(x, y, z, 1)]) return false;
    if (!arrows[ARROW_INDEX(x + 1, y, z, 1)]) return false;
    if (!arrows[ARROW_INDEX(x, y, z + 1, 1)]) return false;
    if (!arrows[ARROW_INDEX(x + 1, y, z + 1, 1)]) return false;
    // Check 4 edges in Z-dir
    if (!arrows[ARROW_INDEX(x, y, z, 2)]) return false;
    if (!arrows[ARROW_INDEX(x + 1, y, z, 2)]) return false;
    if (!arrows[ARROW_INDEX(x, y + 1, z, 2)]) return false;
    if (!arrows[ARROW_INDEX(x + 1, y + 1, z, 2)]) return false;
    return true;
}

void findFilledCubes() {
    filledCubes.clear();
    if (N_param < 2) return;
    for (int x = 0; x < N_param - 1; ++x) {
        for (int y = 0; y < N_param - 1; ++y) {
            for (int z = 0; z < N_param - 1; ++z) {
                if (isCubeFilled(x, y, z)) {
                    // Pack x, y, z into a single uint32_t
                    // x (10 bits), y (10 bits), z (10 bits)
                    uint32_t packed = ((uint32_t)x << 20) | ((uint32_t)y << 10) | (uint32_t)z;
                    filledCubes.push_back(packed);
                }
            }
        }
    }
}

// Sample the entire configuration
void sampleFullConfiguration() {
    progressCounter = 0;
    
    // Process by time slices t = x + y + z
    int maxT = 3 * (N_param - 1);
    
    for (int t = 0; t <= maxT; t++) {
        // Process all vertices with x + y + z = t
        for (int x = 0; x < N_param && x <= t; x++) {
            for (int y = 0; y < N_param && x + y <= t; y++) {
                int z = t - x - y;
                if (z >= 0 && z < N_param) {
                    sampleVertex(x, y, z);
                }
            }
        }
        
        // Update progress
        progressCounter = (int)((100.0 * t) / maxT);
    }
    
    findFilledCubes();
    progressCounter = 100;
}

// Export functions
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* initializeModel(int n, double* params) {
    try {
        progressCounter = 0;
        
        // Validate parameters
        if (n < 2 || n > 300) {
            throw std::invalid_argument("N must be between 2 and 300");
        }
        
        N_param = n;
        
        // Copy free parameters
        for (int i = 0; i < 12; i++) {
            freeParams[i] = params[i];
        }
        
        // Initialize weights from free parameters
        initializeWeights();
        
        // Initialize arrow configuration
        initializeArrows();
        
        progressCounter = 100;
        
        // Return JSON with initial state
        std::string json = "{\"status\":\"initialized\",\"n\":" + std::to_string(N_param) + "}";
        
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
char* sampleConfiguration() {
    try {
        progressCounter = 0;
        
        // Sample the full configuration
        sampleFullConfiguration();
        
        progressCounter = 100;
        
        std::string json = "{\"status\":\"sampled\"}";
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
char* exportArrows() {
    static std::vector<uint32_t> arrow_data;
    arrow_data.clear();

    for (int x = 0; x < N_param; x++) {
        for (int y = 0; y < N_param; y++) {
            for (int z = 0; z < N_param; z++) {
                for (int dir = 0; dir < 3; dir++) {
                    if (arrows[ARROW_INDEX(x, y, z, dir)]) {
                        // Pack x, y, z, dir into one uint32_t
                        // x(10 bits), y(10 bits), z(10 bits), dir(2 bits)
                        uint32_t packed = ((uint32_t)x << 22) | ((uint32_t)y << 12) | ((uint32_t)z << 2) | (uint32_t)dir;
                        arrow_data.push_back(packed);
                    }
                }
            }
        }
    }
    
    uint32_t* ptr = arrow_data.data();
    size_t count = arrow_data.size();
    
    std::string json = "{\"ptr\":" + std::to_string((uintptr_t)ptr) + ",\"count\":" + std::to_string(count) + "}";
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* exportFilledCubes() {
    uint32_t* ptr = filledCubes.data();
    size_t count = filledCubes.size();
    
    std::string json = "{\"ptr\":" + std::to_string((uintptr_t)ptr) + ",\"count\":" + std::to_string(count) + "}";
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* updateWeights(double* params) {
    try {
        progressCounter = 0;
        
        // Update free parameters
        for (int i = 0; i < 12; i++) {
            freeParams[i] = params[i];
        }
        
        // Reinitialize weights
        initializeWeights();
        
        progressCounter = 100;
        
        std::string json = "{\"status\":\"weights_updated\"}";
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