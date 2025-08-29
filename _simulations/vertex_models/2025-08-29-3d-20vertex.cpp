/*
emcc 2025-08-29-3d-20vertex.cpp -o 2025-08-29-3d-20vertex.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_initializeModel','_sampleConfiguration','_exportArrows','_updateWeights','_freeString','_getProgress','_malloc','_free']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","getValue","setValue","HEAPF64","HEAP8"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
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

// Arrow configuration: arrows[x][y][z][dir] where dir = 0(x), 1(y), 2(z)
// Value is 1 if arrow present, 0 otherwise
std::vector<std::vector<std::vector<std::vector<int>>>> arrows;

// Vertex weights for the 20 configurations
// Index encodes: incoming(3 bits) * 8 + outgoing(3 bits)
// We have 18 free parameters after sum-to-one constraints
double vertexWeights[64];  // 8x8 matrix, but only certain entries are valid

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

// Initialize vertex weights from free parameters
void initializeWeights() {
    // Clear all weights
    for (int i = 0; i < 64; i++) {
        vertexWeights[i] = 0.0;
    }
    
    // Deterministic vertices (conservation enforces these)
    vertexWeights[patternToIndex(0,0,0) * 8 + patternToIndex(0,0,0)] = 1.0;  // 000->000
    vertexWeights[patternToIndex(1,1,1) * 8 + patternToIndex(1,1,1)] = 1.0;  // 111->111
    
    // For vertices with sum=1 (one incoming arrow)
    // We have 3 choices of incoming, each with 3 choices of outgoing
    // Due to sum-to-one constraint, we need 2 free parameters per incoming config
    
    // 100 -> {100, 010, 001}
    double sum100 = freeParams[0] + freeParams[1] + 1.0;
    vertexWeights[patternToIndex(1,0,0) * 8 + patternToIndex(1,0,0)] = freeParams[0] / sum100;
    vertexWeights[patternToIndex(1,0,0) * 8 + patternToIndex(0,1,0)] = freeParams[1] / sum100;
    vertexWeights[patternToIndex(1,0,0) * 8 + patternToIndex(0,0,1)] = 1.0 / sum100;
    
    // 010 -> {100, 010, 001}
    double sum010 = freeParams[2] + freeParams[3] + 1.0;
    vertexWeights[patternToIndex(0,1,0) * 8 + patternToIndex(1,0,0)] = freeParams[2] / sum010;
    vertexWeights[patternToIndex(0,1,0) * 8 + patternToIndex(0,1,0)] = freeParams[3] / sum010;
    vertexWeights[patternToIndex(0,1,0) * 8 + patternToIndex(0,0,1)] = 1.0 / sum010;
    
    // 001 -> {100, 010, 001}
    double sum001 = freeParams[4] + freeParams[5] + 1.0;
    vertexWeights[patternToIndex(0,0,1) * 8 + patternToIndex(1,0,0)] = freeParams[4] / sum001;
    vertexWeights[patternToIndex(0,0,1) * 8 + patternToIndex(0,1,0)] = freeParams[5] / sum001;
    vertexWeights[patternToIndex(0,0,1) * 8 + patternToIndex(0,0,1)] = 1.0 / sum001;
    
    // For vertices with sum=2 (two incoming arrows)
    // We have 3 choices of incoming, each with 3 choices of outgoing
    
    // 110 -> {110, 101, 011}
    double sum110 = freeParams[6] + freeParams[7] + 1.0;
    vertexWeights[patternToIndex(1,1,0) * 8 + patternToIndex(1,1,0)] = freeParams[6] / sum110;
    vertexWeights[patternToIndex(1,1,0) * 8 + patternToIndex(1,0,1)] = freeParams[7] / sum110;
    vertexWeights[patternToIndex(1,1,0) * 8 + patternToIndex(0,1,1)] = 1.0 / sum110;
    
    // 101 -> {110, 101, 011}
    double sum101 = freeParams[8] + freeParams[9] + 1.0;
    vertexWeights[patternToIndex(1,0,1) * 8 + patternToIndex(1,1,0)] = freeParams[8] / sum101;
    vertexWeights[patternToIndex(1,0,1) * 8 + patternToIndex(1,0,1)] = freeParams[9] / sum101;
    vertexWeights[patternToIndex(1,0,1) * 8 + patternToIndex(0,1,1)] = 1.0 / sum101;
    
    // 011 -> {110, 101, 011}
    double sum011 = freeParams[10] + freeParams[11] + 1.0;
    vertexWeights[patternToIndex(0,1,1) * 8 + patternToIndex(1,1,0)] = freeParams[10] / sum011;
    vertexWeights[patternToIndex(0,1,1) * 8 + patternToIndex(1,0,1)] = freeParams[11] / sum011;
    vertexWeights[patternToIndex(0,1,1) * 8 + patternToIndex(0,1,1)] = 1.0 / sum011;
}

// Initialize the arrow configuration
void initializeArrows() {
    arrows.resize(N_param);
    for (int x = 0; x < N_param; x++) {
        arrows[x].resize(N_param);
        for (int y = 0; y < N_param; y++) {
            arrows[x][y].resize(N_param);
            for (int z = 0; z < N_param; z++) {
                arrows[x][y][z].resize(3, 0);  // 3 directions: x, y, z
            }
        }
    }
    
    // Set boundary conditions
    // Empty in xz and yz planes (x=0 or y=0)
    // Full in xy plane (z=0) - arrow pointing up from below
    for (int x = 0; x < N_param; x++) {
        for (int y = 0; y < N_param; y++) {
            if (x > 0 && y > 0) {
                // Arrow pointing up into vertex (x,y,0)
                // This is stored as the z-direction arrow at (x,y,-1) if we had it
                // Since we don't have negative indices, we handle this as a boundary condition
                // We'll mark that vertices at z=0 with x>0 and y>0 have incoming z arrow
            }
        }
    }
}

// Sample the configuration for a single vertex
void sampleVertex(int x, int y, int z) {
    // Get incoming arrows
    int in_x = (x > 0) ? arrows[x-1][y][z][0] : 0;
    int in_y = (y > 0) ? arrows[x][y-1][z][1] : 0;
    int in_z = (z > 0) ? arrows[x][y][z-1][2] : ((x > 0 && y > 0) ? 1 : 0);  // Boundary condition
    
    int incomingPattern = patternToIndex(in_x, in_y, in_z);
    int incomingSum = in_x + in_y + in_z;
    
    // Deterministic cases
    if (incomingSum == 0) {
        arrows[x][y][z][0] = 0;
        arrows[x][y][z][1] = 0;
        arrows[x][y][z][2] = 0;
        return;
    }
    if (incomingSum == 3) {
        arrows[x][y][z][0] = 1;
        arrows[x][y][z][1] = 1;
        arrows[x][y][z][2] = 1;
        return;
    }
    
    // Stochastic case - sample from valid outgoing configurations
    std::vector<int> validOutgoing;
    std::vector<double> probs;
    
    // Find all valid outgoing patterns (those with same sum)
    for (int out_x = 0; out_x <= 1; out_x++) {
        for (int out_y = 0; out_y <= 1; out_y++) {
            for (int out_z = 0; out_z <= 1; out_z++) {
                if (out_x + out_y + out_z == incomingSum) {
                    int outPattern = patternToIndex(out_x, out_y, out_z);
                    int index = incomingPattern * 8 + outPattern;
                    validOutgoing.push_back(outPattern);
                    probs.push_back(vertexWeights[index]);
                }
            }
        }
    }
    
    // Normalize probabilities (should already sum to 1, but just in case)
    double totalProb = 0.0;
    for (double p : probs) totalProb += p;
    if (totalProb > 0) {
        for (double& p : probs) p /= totalProb;
    }
    
    // Sample from distribution
    double r = getRandom01();
    double cumProb = 0.0;
    int chosen = 0;
    for (size_t i = 0; i < probs.size(); i++) {
        cumProb += probs[i];
        if (r <= cumProb) {
            chosen = validOutgoing[i];
            break;
        }
    }
    
    // Set outgoing arrows
    arrows[x][y][z][0] = (chosen >> 2) & 1;
    arrows[x][y][z][1] = (chosen >> 1) & 1;
    arrows[x][y][z][2] = chosen & 1;
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
    try {
        progressCounter = 0;
        
        // Build JSON output with arrow data
        std::stringstream json;
        json << "{\"arrows\":[";
        
        bool first = true;
        for (int x = 0; x < N_param; x++) {
            for (int y = 0; y < N_param; y++) {
                for (int z = 0; z < N_param; z++) {
                    for (int dir = 0; dir < 3; dir++) {
                        if (arrows[x][y][z][dir] == 1) {
                            if (!first) json << ",";
                            json << "{\"x\":" << x << ",\"y\":" << y << ",\"z\":" << z << ",\"dir\":" << dir << "}";
                            first = false;
                        }
                    }
                }
            }
        }
        
        json << "],\"n\":" << N_param << "}";
        
        progressCounter = 100;
        
        std::string jsonStr = json.str();
        char* out = (char*)malloc(jsonStr.size() + 1);
        strcpy(out, jsonStr.c_str());
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