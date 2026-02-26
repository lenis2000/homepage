/*
CFTP for q-weighted partitions with general boundary
P(lambda) proportional to q^|lambda| where lambda is contained in a given boundary partition

Compile with (run from this directory):

emcc 2026-01-04-q-partition-cftp-general.cpp -o ../../js/2026-01-04-q-partition-cftp-general.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initSimulationWithBoundary','_runCFTPEpoch','_runGlauberSteps','_getPartitionData','_getLowerData','_getUpperData','_getBoundaryData','_freeString','_getM','_getN','_getArea','_getGap','_setQ']" \
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
static std::vector<uint64_t> cftpSeeds;  // Accumulated seeds for backward doubling
static int cftp_T = 1;                   // Current epoch window size
static int currentT = 0;
static RNG globalRng;

// Convert partition to path representation
// Path goes from (0,M) to (N,0): right steps (0) and up steps (1)
// For partition parts[], we alternate: go right to parts[row], then up
inline void partitionToPath(const std::vector<int>& parts, std::vector<int>& p) {
    p.assign(M + N, 0);
    int idx = 0;
    int col = 0;
    // Go through rows from bottom (M-1) to top (0)
    for (int row = M - 1; row >= 0; row--) {
        int targetCol = parts[row];
        // Go right to targetCol
        while (col < targetCol) {
            p[idx++] = 0;  // right step
            col++;
        }
        // Go up
        p[idx++] = 1;  // up step
    }
    // Go right to N
    while (col < N) {
        p[idx++] = 0;
        col++;
    }
}

// Convert path to partition representation
inline void pathToPartition(const std::vector<int>& p, std::vector<int>& parts) {
    parts.assign(M, 0);
    int col = 0;
    int row = M - 1;  // Start from bottom row
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

// Initialize simulation with a boundary partition (comma-separated string)
// e.g., "50,50,50,40,30,20,10" for a partition with those row lengths
void initSimulationWithBoundary(const char* boundaryStr, double qVal) {
    boundary = parseIntArray(boundaryStr);
    if (boundary.empty()) {
        // Default to 50x50 rectangle
        boundary.assign(50, 50);
    }

    M = boundary.size();
    N = boundary[0];  // Max width is the first (largest) row
    q = qVal;

    // Validate boundary is a valid partition (non-increasing)
    for (int i = 1; i < M; i++) {
        if (boundary[i] > boundary[i-1]) {
            boundary[i] = boundary[i-1];  // Fix invalid input
        }
    }

    // Create boundary path
    partitionToPath(boundary, boundaryPath);

    // Initialize path to empty partition
    // Empty partition = all up steps first, then all right steps
    path.assign(M + N, 0);
    for (int i = 0; i < M; i++) path[i] = 1;

    // Lower bound: empty partition (M ones then N zeros)
    lowerPath.assign(M + N, 0);
    for (int i = 0; i < M; i++) lowerPath[i] = 1;

    // Upper bound: boundary partition
    upperPath = boundaryPath;

    cftpSeeds.clear();
    cftp_T = 1;
    currentT = 0;
    globalRng = RNG((uint64_t)time(nullptr));
}

int getM() { return M; }
int getN() { return N; }

void setQ(double qVal) {
    q = qVal;
}

// Check if a path is dominated by the boundary path
// Path p is valid if for each position, the partition it represents
// is contained in the boundary partition
// In path terms: at any prefix, #zeros in p <= #zeros in boundaryPath
inline bool isValidPath(const std::vector<int>& p) {
    int zerosP = 0;
    int zerosBoundary = 0;
    for (int i = 0; i < M + N; i++) {
        if (p[i] == 0) zerosP++;
        if (boundaryPath[i] == 0) zerosBoundary++;
        if (zerosP > zerosBoundary) return false;
    }
    return true;
}

// Glauber step on a path with boundary constraint
// Pick random position i, look at (path[i], path[i+1])
// 10 (outer corner) -> 01 with prob q/(1+q), if still valid
// 01 (inner corner) -> 10 with prob 1/(1+q)
inline void glauberStepPath(std::vector<int>& p, RNG& rng) {
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

    if (p[i] == 1 && p[i+1] == 0) {
        // 10 = outer corner (can add box), flip to 01 with prob q/(1+q)
        // But must check boundary constraint
        if (u < q / (1.0 + q)) {
            // Check if flip would violate boundary
            // After flip, we'd have more 0s at position i, same at i+1
            // Count zeros up to and including position i in both paths
            int zerosP = 0, zerosBoundary = 0;
            for (int j = 0; j <= i; j++) {
                if (p[j] == 0) zerosP++;
                if (boundaryPath[j] == 0) zerosBoundary++;
            }
            // After flip, zerosP would increase by 1 at position i
            if (zerosP + 1 <= zerosBoundary) {
                p[i] = 0;
                p[i+1] = 1;
            }
        }
    } else if (p[i] == 0 && p[i+1] == 1) {
        // 01 = inner corner (can remove box), flip to 10 with prob 1/(1+q)
        // Removing a box always respects boundary (makes partition smaller)
        if (u < 1.0 / (1.0 + q)) {
            p[i] = 1;
            p[i+1] = 0;
        }
    }
}

// Coupled Glauber step for CFTP with boundary constraint
inline void coupledGlauberStepPath(std::vector<int>& lower, std::vector<int>& upper, uint64_t seed) {
    RNG rng(seed);
    int len = M + N;
    if (len < 2) return;

    int i = rng.randInt(len - 1);
    double u = rng.uniform();

    bool wantAdd = (u < q / (1.0 + q));

    if (wantAdd) {
        // Try to add (flip 10->01) on both chains, respecting boundary
        if (lower[i] == 1 && lower[i+1] == 0) {
            // Check boundary constraint for lower
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
            // Check boundary constraint for upper
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

// Compute area from path
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

// Compute gap between lower and upper paths
int getGap() {
    int gap = 0;
    for (int i = 0; i < M + N; i++) {
        if (lowerPath[i] != upperPath[i]) gap++;
    }
    return gap / 2;
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
    upperPath = boundaryPath;

    // Apply ALL seeds from -T to 0
    for (size_t t = 0; t < cftpSeeds.size(); t++) {
        coupledGlauberStepPath(lowerPath, upperPath, cftpSeeds[t]);
    }
    currentT = cftpSeeds.size();

    // Check coalescence at time 0 only
    if (isCoalesced()) {
        path = lowerPath;
        return 1;
    }

    // Double for next epoch
    cftp_T *= 2;
    return 0;
}

// Run multiple Glauber steps on the current path
void runGlauberSteps(int numSteps) {
    for (int i = 0; i < numSteps; i++) {
        glauberStepPath(path, globalRng);
    }
}

// Get partition data as JSON string
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

// Get boundary partition as JSON string
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
