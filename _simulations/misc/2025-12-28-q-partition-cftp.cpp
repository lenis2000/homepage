/*
CFTP for q-weighted partitions in M x N rectangle
P(lambda) proportional to q^|lambda|

Compile with (run from this directory):

emcc 2025-12-28-q-partition-cftp.cpp -o ../../js/2025-12-28-q-partition-cftp.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initSimulation','_runCFTPEpoch','_runGlauberSteps','_getPartitionData','_getLowerData','_getUpperData','_freeString','_getM','_getN','_getArea','_getGap','_setQ','_getCftpT']" \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=64MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math

*/

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <vector>
#include <string>
#include <sstream>

// Fast xorshift128+ PRNG
class RNG {
public:
    uint64_t s[2];

    RNG(uint64_t seed = 12345) {
        s[0] = seed;
        s[1] = seed ^ 0xDEADBEEF12345678ULL;
    }

    uint64_t next() {
        uint64_t s1 = s[0];
        const uint64_t s0 = s[1];
        s[0] = s0;
        s1 ^= s1 << 23;
        s1 ^= s1 >> 17;
        s1 ^= s0;
        s1 ^= s0 >> 26;
        s[1] = s1;
        return s[0] + s[1];
    }

    double uniform() {
        return (next() >> 11) * (1.0 / 9007199254740992.0);
    }

    uint32_t randInt(uint32_t n) {
        // Use modulo for simplicity (slight bias but fine for our purposes)
        return next() % n;
    }
};

// Global state
static int N = 50;           // Width
static int M = 50;           // Height
static double q = 1.0;       // Weight parameter

// Path representation: sequence of M+N bits
// 0 = right step, 1 = up step
// Path goes from (0,M) to (N,0): N zeros and M ones
static std::vector<int> path;         // Current path
static std::vector<int> lowerPath;    // CFTP lower bound (all 0s first, then all 1s = empty partition)
static std::vector<int> upperPath;    // CFTP upper bound (all 1s first, then all 0s = full partition)
static std::vector<uint64_t> cftpSeeds;  // Accumulated seeds for backward doubling
static int cftp_T = 1;                   // Current epoch window size (doubles each epoch)
static RNG globalRng;

// Convert path to partition representation
inline void pathToPartition(const std::vector<int>& p, std::vector<int>& parts) {
    parts.assign(M, 0);
    int col = 0;
    int row = M - 1;  // Start from bottom row
    for (int i = 0; i < M + N; i++) {
        if (p[i] == 0) {
            // Right step
            col++;
        } else {
            // Up step - record the column for this row
            parts[row] = col;
            row--;
        }
    }
}

// Initialize simulation with parameters
extern "C" {

void initSimulation(int n, double a, double qVal) {
    N = n;
    M = (int)(a * n);
    if (M < 1) M = 1;
    q = qVal;

    // Initialize path: empty partition = M ones then N zeros (go up first, then right)
    path.assign(M + N, 0);
    for (int i = 0; i < M; i++) path[i] = 1;

    // Lower bound: empty partition (M ones then N zeros) - go up first
    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;

    // Upper bound: full partition (N zeros then M ones) - go right first
    upperPath.assign(M + N, 0);
    for (int i = N; i < M + N; i++) upperPath[i] = 1;

    cftpSeeds.clear();
    cftp_T = 1;
    globalRng = RNG((uint64_t)time(nullptr));
}

int getM() { return M; }
int getCftpT() { return cftp_T; }

// Update just q without resetting path
void setQ(double qVal) {
    q = qVal;
}
int getN() { return N; }

// Glauber step on a path
// Pick random position i, look at (path[i], path[i+1])
// 10 (outer corner) -> 01 with prob q/(1+q)
// 01 (inner corner) -> 10 with prob 1/(1+q)
// 00, 11 -> do nothing
inline void glauberStepPath(std::vector<int>& p, RNG& rng) {
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);  // Position 0 to len-2
    double u = rng.uniform();

    if (p[i] == 1 && p[i+1] == 0) {
        // 10 = outer corner (can add box), flip to 01 with prob q/(1+q)
        if (u < q / (1.0 + q)) {
            p[i] = 0;
            p[i+1] = 1;
        }
    } else if (p[i] == 0 && p[i+1] == 1) {
        // 01 = inner corner (can remove box), flip to 10 with prob 1/(1+q)
        if (u < 1.0 / (1.0 + q)) {
            p[i] = 1;
            p[i+1] = 0;
        }
    }
    // 00 or 11: do nothing
}

// Coupled Glauber step for CFTP
// Use SAME random threshold for both chains
inline void coupledGlauberStepPath(std::vector<int>& lower, std::vector<int>& upper, uint64_t seed) {
    RNG rng(seed);
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

    // Single decision: with prob q/(1+q) we "want to add" (flip 10->01)
    //                  with prob 1/(1+q) we "want to remove" (flip 01->10)
    bool wantAdd = (u < q / (1.0 + q));

    if (wantAdd) {
        // Try to add (flip 10->01) on both chains
        if (lower[i] == 1 && lower[i+1] == 0) {
            lower[i] = 0;
            lower[i+1] = 1;
        }
        if (upper[i] == 1 && upper[i+1] == 0) {
            upper[i] = 0;
            upper[i+1] = 1;
        }
    } else {
        // Try to remove (flip 01->10) on both chains
        if (lower[i] == 0 && lower[i+1] == 1) {
            lower[i] = 1;
            lower[i+1] = 0;
        }
        if (upper[i] == 0 && upper[i+1] == 1) {
            upper[i] = 1;
            upper[i+1] = 0;
        }
    }
}

// Compute area from path (count inversions: number of 1s before each 0)
int getArea() {
    int area = 0;
    int ones = 0;
    for (int i = 0; i < M + N; i++) {
        if (path[i] == 1) {
            ones++;
        } else {
            area += ones;  // Each 0 after k ones contributes k to area
        }
    }
    return area;
}

// Compute gap between lower and upper paths
int getGap() {
    int gap = 0;
    for (int i = 0; i < M + N; i++) {
        if (lowerPath[i] != upperPath[i]) gap++;
    }
    return gap / 2;  // Each swap is 2 differences
}

// Check if lower == upper
bool isCoalesced() {
    for (int i = 0; i < M + N; i++) {
        if (lowerPath[i] != upperPath[i]) return false;
    }
    return true;
}

// Run one backward-doubling epoch of CFTP
// Returns: 0=not coalesced (doubled T), 1=coalesced (exact sample ready)
int runCFTPEpoch() {
    // Prepend new seeds for earlier time period
    int newCount = cftp_T - (int)cftpSeeds.size();
    if (newCount > 0) {
        std::vector<uint64_t> newSeeds(newCount);
        for (int i = 0; i < newCount; i++) newSeeds[i] = globalRng.next();
        cftpSeeds.insert(cftpSeeds.begin(), newSeeds.begin(), newSeeds.end());
    }

    // Reset to extremal states
    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;
    upperPath.assign(M + N, 0);
    for (int i = N; i < M + N; i++) upperPath[i] = 1;

    // Apply ALL seeds from -T to 0
    for (size_t t = 0; t < cftpSeeds.size(); t++) {
        coupledGlauberStepPath(lowerPath, upperPath, cftpSeeds[t]);
    }

    // Check coalescence at time 0 only
    if (isCoalesced()) {
        path = lowerPath;
        return 1;
    }

    // Double for next epoch
    cftp_T *= 2;
    if (cftp_T > 1073741824) {  // 2^30 safety limit
        return -1;  // timeout
    }
    return 0;
}

// Run multiple Glauber steps on the current path
void runGlauberSteps(int numSteps) {
    for (int i = 0; i < numSteps; i++) {
        glauberStepPath(path, globalRng);
    }
}

// Get partition data as JSON string (convert from path)
char* getPartitionData() {
    std::vector<int> parts;
    pathToPartition(path, parts);
    std::ostringstream oss;
    oss << "[";
    for (int i = 0; i < M; i++) {
        if (i > 0) oss << ",";
        oss << parts[i];
    }
    oss << "]";
    std::string s = oss.str();
    char* result = (char*)malloc(s.size() + 1);
    strcpy(result, s.c_str());
    return result;
}

// Get lower bound data as JSON string
char* getLowerData() {
    std::vector<int> parts;
    pathToPartition(lowerPath, parts);
    std::ostringstream oss;
    oss << "[";
    for (int i = 0; i < M; i++) {
        if (i > 0) oss << ",";
        oss << parts[i];
    }
    oss << "]";
    std::string s = oss.str();
    char* result = (char*)malloc(s.size() + 1);
    strcpy(result, s.c_str());
    return result;
}

// Get upper bound data as JSON string
char* getUpperData() {
    std::vector<int> parts;
    pathToPartition(upperPath, parts);
    std::ostringstream oss;
    oss << "[";
    for (int i = 0; i < M; i++) {
        if (i > 0) oss << ",";
        oss << parts[i];
    }
    oss << "]";
    std::string s = oss.str();
    char* result = (char*)malloc(s.size() + 1);
    strcpy(result, s.c_str());
    return result;
}

void freeString(char* ptr) {
    free(ptr);
}

// Debug: get paths as strings
char* getDebugInfo() {
    std::ostringstream oss;
    oss << "lower: ";
    for (int i = 0; i < M + N; i++) oss << lowerPath[i];
    oss << " | upper: ";
    for (int i = 0; i < M + N; i++) oss << upperPath[i];
    oss << " | M=" << M << " N=" << N;
    std::string s = oss.str();
    char* result = (char*)malloc(s.size() + 1);
    strcpy(result, s.c_str());
    return result;
}

} // extern "C"
