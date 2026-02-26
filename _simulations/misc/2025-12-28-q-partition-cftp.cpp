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
static std::vector<int> lowerPath;    // CFTP lower bound (empty partition)
static std::vector<int> upperPath;    // CFTP upper bound (full partition)

// Block-based CFTP seed storage: O(log T) memory instead of O(T)
struct EpochBlock {
    uint64_t seed;
    int64_t length;
};
static std::vector<EpochBlock> epochBlocks;
static int64_t cftp_T = 0;
static RNG globalRng;

// Convert path to partition representation
inline void pathToPartition(const std::vector<int>& p, std::vector<int>& parts) {
    parts.assign(M, 0);
    int col = 0;
    int row = M - 1;
    for (int i = 0; i < M + N; i++) {
        if (p[i] == 0) {
            col++;
        } else {
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

    path.assign(M + N, 0);
    for (int i = 0; i < M; i++) path[i] = 1;

    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;

    upperPath.assign(M + N, 0);
    for (int i = N; i < M + N; i++) upperPath[i] = 1;

    epochBlocks.clear();
    cftp_T = 0;
    globalRng = RNG((uint64_t)time(nullptr));
}

int getM() { return M; }
double getCftpT() { return (double)cftp_T; }

void setQ(double qVal) {
    q = qVal;
}
int getN() { return N; }

// Glauber step on a path
inline void glauberStepPath(std::vector<int>& p, RNG& rng) {
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

    if (p[i] == 1 && p[i+1] == 0) {
        if (u < q / (1.0 + q)) {
            p[i] = 0;
            p[i+1] = 1;
        }
    } else if (p[i] == 0 && p[i+1] == 1) {
        if (u < 1.0 / (1.0 + q)) {
            p[i] = 1;
            p[i+1] = 0;
        }
    }
}

// Coupled Glauber step for CFTP (takes RNG by reference)
inline void coupledGlauberStepPath(std::vector<int>& lower, std::vector<int>& upper, RNG& rng) {
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

    bool wantAdd = (u < q / (1.0 + q));

    if (wantAdd) {
        if (lower[i] == 1 && lower[i+1] == 0) {
            lower[i] = 0;
            lower[i+1] = 1;
        }
        if (upper[i] == 1 && upper[i+1] == 0) {
            upper[i] = 0;
            upper[i+1] = 1;
        }
    } else {
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

int getArea() {
    int area = 0;
    int ones = 0;
    for (int i = 0; i < M + N; i++) {
        if (path[i] == 1) {
            ones++;
        } else {
            area += ones;
        }
    }
    return area;
}

int getGap() {
    int gap = 0;
    for (int i = 0; i < M + N; i++) {
        if (lowerPath[i] != upperPath[i]) gap++;
    }
    return gap / 2;
}

bool isCoalesced() {
    for (int i = 0; i < M + N; i++) {
        if (lowerPath[i] != upperPath[i]) return false;
    }
    return true;
}

// Run one backward-doubling epoch of CFTP
// Block-based: stores one seed per epoch block (O(log T) memory)
// Returns: 0=not coalesced, 1=coalesced (exact sample ready)
int runCFTPEpoch() {
    int64_t blockLen = (cftp_T == 0) ? 1 : cftp_T;
    epochBlocks.insert(epochBlocks.begin(), EpochBlock{globalRng.next(), blockLen});
    cftp_T += blockLen;

    // Reset to extremal states
    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;
    upperPath.assign(M + N, 0);
    for (int i = N; i < M + N; i++) upperPath[i] = 1;

    // Replay all blocks in chronological order
    for (const auto& block : epochBlocks) {
        RNG blockRng(block.seed);
        for (int64_t s = 0; s < block.length; s++) {
            coupledGlauberStepPath(lowerPath, upperPath, blockRng);
        }
    }

    if (isCoalesced()) {
        path = lowerPath;
        return 1;
    }

    return 0;
}

void runGlauberSteps(int numSteps) {
    for (int i = 0; i < numSteps; i++) {
        glauberStepPath(path, globalRng);
    }
}

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
