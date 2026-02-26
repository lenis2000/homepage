/*
CFTP for q-weighted partitions with general boundary
P(lambda) proportional to q^|lambda| where lambda is contained in a given boundary partition

Compile with (run from this directory):

emcc 2026-01-04-q-partition-cftp-general.cpp -o ../../js/2026-01-04-q-partition-cftp-general.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initSimulationWithBoundary','_runCFTPEpoch','_runGlauberSteps','_getPartitionData','_getLowerData','_getUpperData','_getBoundaryData','_freeString','_getM','_getN','_getArea','_getGap','_setQ','_getCftpT']" \
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
static int N = 50;           // Width (max column = boundary[0])
static int M = 50;           // Height (number of rows)
static double q = 1.0;       // Weight parameter
static std::vector<int> boundary;  // Boundary partition (maxParts for each row)

// Path representation: sequence of M+N bits
// 0 = right step, 1 = up step
// Path goes from (0,M) to (N,0): N zeros and M ones
static std::vector<int> path;         // Current path
static std::vector<int> lowerPath;    // CFTP lower bound (empty partition)
static std::vector<int> upperPath;    // CFTP upper bound (boundary partition)
static std::vector<int> boundaryPath; // Path encoding of boundary (for constraint checking)

// Block-based CFTP seed storage: O(log T) memory instead of O(T)
// Each block stores one seed that deterministically generates all steps in that block
struct EpochBlock {
    uint64_t seed;
    int64_t length;  // number of steps in this block
};
static std::vector<EpochBlock> epochBlocks;
static int64_t cftp_T = 0;           // Total CFTP time window
static RNG globalRng;

// Convert partition to path representation
inline void partitionToPath(const std::vector<int>& parts, std::vector<int>& p) {
    p.assign(M + N, 0);
    int idx = 0;
    int col = 0;
    for (int row = M - 1; row >= 0; row--) {
        int targetCol = parts[row];
        while (col < targetCol) {
            p[idx++] = 0;
            col++;
        }
        p[idx++] = 1;
    }
    while (col < N) {
        p[idx++] = 0;
        col++;
    }
}

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

// Parse comma-separated integers from string
inline std::vector<int> parseIntArray(const char* str) {
    std::vector<int> result;
    std::string s(str);
    std::istringstream iss(s);
    std::string token;
    while (std::getline(iss, token, ',')) {
        result.push_back(std::atoi(token.c_str()));
    }
    return result;
}

extern "C" {

void initSimulationWithBoundary(const char* boundaryStr, double qVal) {
    boundary = parseIntArray(boundaryStr);
    if (boundary.empty()) {
        boundary.assign(50, 50);
    }

    M = boundary.size();
    N = boundary[0];
    q = qVal;

    for (int i = 1; i < M; i++) {
        if (boundary[i] > boundary[i-1]) {
            boundary[i] = boundary[i-1];
        }
    }

    partitionToPath(boundary, boundaryPath);

    path.assign(M + N, 0);
    for (int i = 0; i < M; i++) path[i] = 1;

    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;

    upperPath = boundaryPath;

    epochBlocks.clear();
    cftp_T = 0;
    globalRng = RNG((uint64_t)time(nullptr));
}

int getM() { return M; }
int getN() { return N; }
double getCftpT() { return (double)cftp_T; }

void setQ(double qVal) {
    q = qVal;
}

// Glauber step on a path with boundary constraint
inline void glauberStepPath(std::vector<int>& p, RNG& rng) {
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

    if (p[i] == 1 && p[i+1] == 0) {
        if (u < q / (1.0 + q)) {
            int zerosP = 0, zerosBoundary = 0;
            for (int j = 0; j <= i; j++) {
                if (p[j] == 0) zerosP++;
                if (boundaryPath[j] == 0) zerosBoundary++;
            }
            if (zerosP + 1 <= zerosBoundary) {
                p[i] = 0;
                p[i+1] = 1;
            }
        }
    } else if (p[i] == 0 && p[i+1] == 1) {
        if (u < 1.0 / (1.0 + q)) {
            p[i] = 1;
            p[i+1] = 0;
        }
    }
}

// Coupled Glauber step for CFTP with boundary constraint
// Takes RNG by reference (sequential draws within a block)
inline void coupledGlauberStepPath(std::vector<int>& lower, std::vector<int>& upper, RNG& rng) {
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

    bool wantAdd = (u < q / (1.0 + q));

    if (wantAdd) {
        if (lower[i] == 1 && lower[i+1] == 0) {
            int zerosL = 0, zerosB = 0;
            for (int j = 0; j <= i; j++) {
                if (lower[j] == 0) zerosL++;
                if (boundaryPath[j] == 0) zerosB++;
            }
            if (zerosL + 1 <= zerosB) {
                lower[i] = 0;
                lower[i+1] = 1;
            }
        }
        if (upper[i] == 1 && upper[i+1] == 0) {
            int zerosU = 0, zerosB = 0;
            for (int j = 0; j <= i; j++) {
                if (upper[j] == 0) zerosU++;
                if (boundaryPath[j] == 0) zerosB++;
            }
            if (zerosU + 1 <= zerosB) {
                upper[i] = 0;
                upper[i+1] = 1;
            }
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
    // New block length: first call adds 1, subsequent calls double
    int64_t blockLen = (cftp_T == 0) ? 1 : cftp_T;
    epochBlocks.insert(epochBlocks.begin(), EpochBlock{globalRng.next(), blockLen});
    cftp_T += blockLen;  // 0->1, 1->2, 2->4, 4->8, ...

    // Reset to extremal states
    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;
    upperPath = boundaryPath;

    // Replay all blocks in chronological order (earliest first)
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

char* getBoundaryData() {
    std::ostringstream oss;
    oss << "[";
    for (int i = 0; i < M; i++) {
        if (i > 0) oss << ",";
        oss << boundary[i];
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

} // extern "C"
