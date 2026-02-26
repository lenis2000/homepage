/*
CFTP for q-weighted partitions in M x N rectangle
P(lambda) proportional to q^|lambda|

For q=1 (uniform), the limit shape is a straight diagonal.

Compile from src/ folder:
emcc q-partition-cftp.cpp -o ../q-partition-cftp.js \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='QPartitionModule' \
  -s "EXPORTED_FUNCTIONS=['_initSimulation','_runCFTPBatch','_getCoalesced','_getProgress','_getPartitionPath','_freeString','_getM','_getN','_setPath','_runGlauberAndGetMiddleY','_malloc','_free']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','setValue','getValue']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=64MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math

Usage in JavaScript (modularized):
  const qpart = await QPartitionModule();
  const initSimulation = qpart.cwrap('initSimulation', null, ['number', 'number', 'number']);
*/

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <vector>
#include <string>
#include <sstream>
#include <ctime>

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
        return next() % n;
    }
};

// Global state
static int N = 100;          // Width
static int M = 100;          // Height
static double q = 1.0;       // Weight parameter

// Path representation: sequence of M+N bits
// 0 = right step, 1 = up step
// Path goes from (0,M) to (N,0): N zeros and M ones
static std::vector<int> path;         // Current/result path
static std::vector<int> lowerPath;    // CFTP lower bound
static std::vector<int> upperPath;    // CFTP upper bound
static bool coalesced = false;
static std::vector<uint64_t> cftpSeeds;  // Accumulated seeds for backward doubling
static int cftp_T = 1;                   // Current epoch window size
static RNG globalRng;

// Coupled Glauber step for CFTP (seed-based for backward doubling)
inline void coupledGlauberStep(std::vector<int>& lower, std::vector<int>& upper, uint64_t seed) {
    RNG rng(seed);
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

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

// Check if lower == upper
bool isCoalesced() {
    for (int i = 0; i < M + N; i++) {
        if (lowerPath[i] != upperPath[i]) return false;
    }
    return true;
}

// Compute gap between lower and upper paths
int getGap() {
    int gap = 0;
    for (int i = 0; i < M + N; i++) {
        if (lowerPath[i] != upperPath[i]) gap++;
    }
    return gap / 2;
}

extern "C" {

void initSimulation(int n, int m, double qVal) {
    N = n;
    M = m;
    if (M < 1) M = 1;
    if (N < 1) N = 1;
    q = qVal;

    // Lower bound: empty partition = M ones then N zeros (go up first)
    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;

    // Upper bound: full partition = N zeros then M ones (go right first)
    upperPath.assign(M + N, 0);
    for (int i = N; i < M + N; i++) upperPath[i] = 1;

    // Initialize result path to empty
    path.assign(M + N, 0);
    for (int i = 0; i < M; i++) path[i] = 1;

    coalesced = false;
    cftpSeeds.clear();
    cftp_T = 1;
    globalRng = RNG((uint64_t)time(nullptr) ^ (uint64_t)n ^ ((uint64_t)m << 16));
}

// Run one backward-doubling epoch of CFTP
// Returns 1 if coalesced (exact sample ready), 0 if not (doubled T)
int runCFTPBatch() {
    if (coalesced) return 1;

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
        coupledGlauberStep(lowerPath, upperPath, cftpSeeds[t]);
    }

    // Check coalescence at time 0 only
    if (isCoalesced()) {
        path = lowerPath;
        coalesced = true;
        return 1;
    }

    // Double for next epoch
    cftp_T *= 2;
    if (cftp_T > 33554432) {  // 2^25 safety limit
        return -1;  // timeout
    }
    return 0;
}

int getCoalesced() {
    return coalesced ? 1 : 0;
}

// Get progress as percentage (approximate based on gap shrinking)
int getProgress() {
    if (coalesced) return 100;
    int initialGap = M * N;  // Rough estimate
    int currentGap = getGap();
    if (currentGap <= 0) return 100;
    // Use log scale since gap shrinks exponentially
    double progress = 100.0 * (1.0 - (double)currentGap / (M + N));
    if (progress < 0) progress = 0;
    if (progress > 99) progress = 99;
    return (int)progress;
}

int getM() { return M; }
int getN() { return N; }

// Get partition path as JSON array of (x, y) coordinates
// The path goes from (0, 0) to (N, M) - up and right
char* getPartitionPath() {
    std::ostringstream oss;
    oss << "[";

    int x = 0, y = 0;
    oss << "[" << x << "," << y << "]";

    for (int i = 0; i < M + N; i++) {
        if (path[i] == 0) {
            x++;  // Right step
        } else {
            y++;  // Up step
        }
        oss << ",[" << x << "," << y << "]";
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

// Single-chain Glauber step (not coupled)
inline void singleGlauberStep(RNG& rng) {
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

    bool wantAdd = (u < q / (1.0 + q));

    if (wantAdd) {
        if (path[i] == 1 && path[i+1] == 0) {
            path[i] = 0;
            path[i+1] = 1;
        }
    } else {
        if (path[i] == 0 && path[i+1] == 1) {
            path[i] = 1;
            path[i+1] = 0;
        }
    }
}

// Set path from bit array (for initializing from CFTP result)
void setPath(int* bits, int len) {
    path.assign(bits, bits + len);
}

// Run Glauber steps and return middleY
int runGlauberAndGetMiddleY(int steps) {
    // Reseed RNG for independence
    globalRng = RNG((uint64_t)time(nullptr) ^ (uint64_t)rand());

    for (int s = 0; s < steps; s++) {
        singleGlauberStep(globalRng);
    }

    // Compute y at x = N/2
    int targetX = N / 2;
    int x = 0, y = 0;
    for (int i = 0; i < M + N; i++) {
        if (x == targetX) return y;
        if (path[i] == 0) x++; else y++;
    }
    return y;
}

} // extern "C"
