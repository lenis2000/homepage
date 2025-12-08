/*
emcc 2025-12-08-triangular-dimers.cpp -o 2025-12-08-triangular-dimers.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initFromVertices','_performGlauberSteps','_exportDimers','_getTotalSteps','_getFlipCount','_getAcceptRate','_setWeight','_getVertexCount','_getEdgeCount','_freeString','_malloc','_free']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','setValue','getValue']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=32MB \
  -s STACK_SIZE=1MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math -flto
mv 2025-12-08-triangular-dimers.js ../../js/

Triangular Lattice Dimer Sampler
- Dimers (perfect matchings) on the triangular lattice
- Non-bipartite lattice - no height function, no CFTP
- Glauber dynamics with 4-cycle (rhombus) and 6-cycle (hexagon) moves
- Based on Kenyon-Rémila theory: 4+6 cycles suffice for simply-connected domains
*/

#include <emscripten.h>
#include <cstdio>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <string>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <algorithm>
#include <climits>

// Fast xorshift random number generator
static uint64_t rng_state = 12345678901234567ULL;

inline uint64_t xorshift64() {
    rng_state ^= rng_state >> 12;
    rng_state ^= rng_state << 25;
    rng_state ^= rng_state >> 27;
    return rng_state * 0x2545F4914F6CDD1DULL;
}

inline double getRandom01() {
    return (xorshift64() >> 11) * (1.0 / 9007199254740992.0);
}

// Lemire's fast bounded random
inline uint32_t fastRandomRange(uint32_t range) {
    uint64_t random64 = xorshift64();
    uint64_t hi = (uint64_t)(((unsigned __int128)random64 * range) >> 64);
    return (uint32_t)hi;
}

inline int getRandomInt(int n) {
    return (int)fastRandomRange((uint32_t)n);
}

// ============================================================================
// TRIANGULAR LATTICE GEOMETRY
// ============================================================================
// Vertex (n, j) has screen coordinates:
//   x = n + 0.5 * j
//   y = j * sqrt(3) / 2
//
// 6 neighbors of (n, j):
//   Direction 0: (n+1, j)   - right
//   Direction 1: (n,   j+1) - upper-right
//   Direction 2: (n-1, j+1) - upper-left
//   Direction 3: (n-1, j)   - left
//   Direction 4: (n,   j-1) - lower-left
//   Direction 5: (n+1, j-1) - lower-right

const int dir_dn[6] = { 1,  0, -1, -1,  0,  1 };
const int dir_dj[6] = { 0,  1,  1,  0, -1, -1 };

// Opposite direction
inline int oppositeDir(int d) { return (d + 3) % 6; }

// Key for vertex (n, j)
inline long long vertexKey(int n, int j) {
    return ((long long)(n + 10000) << 20) | (long long)(j + 10000);
}

// Key for edge from (n, j) in direction d (d < 3 to avoid duplicates)
// We normalize: store edge as (min_vertex, direction_from_min)
inline long long edgeKey(int n1, int j1, int n2, int j2) {
    long long k1 = vertexKey(n1, j1);
    long long k2 = vertexKey(n2, j2);
    if (k1 < k2) {
        // Find direction from v1 to v2
        for (int d = 0; d < 6; d++) {
            if (n1 + dir_dn[d] == n2 && j1 + dir_dj[d] == j2) {
                return (k1 << 3) | d;
            }
        }
    } else {
        // Find direction from v2 to v1
        for (int d = 0; d < 6; d++) {
            if (n2 + dir_dn[d] == n1 && j2 + dir_dj[d] == j1) {
                return (k2 << 3) | d;
            }
        }
    }
    return -1; // Should never happen for adjacent vertices
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

struct Vertex {
    int n, j;
    int index; // Index in vertices array
};

// Dimer: edge between two vertices
struct Dimer {
    int v1, v2; // Vertex indices
    int n1, j1, n2, j2; // Coordinates
};

// Global state
std::vector<Vertex> vertices;
std::unordered_map<long long, int> vertexMap; // key -> index (used only during init)
std::vector<int> dimerPartner; // dimerPartner[v] = partner vertex index (-1 if none)

// Statistics
long long totalSteps = 0;
long long flipCount = 0;

// Weight (for future position-dependent weights)
double globalWeight = 1.0;

// ============================================================================
// OPTIMIZED DATA STRUCTURES (O(1) lookups)
// ============================================================================

// Dense grid for O(1) vertex lookup
std::vector<int16_t> vertexGrid;  // -1 if no vertex, else vertex index
int gridMinN, gridMaxN, gridMinJ, gridMaxJ;
size_t gridStrideJ;

inline size_t getGridIdx(int n, int j) {
    return (size_t)(n - gridMinN) * gridStrideJ + (size_t)(j - gridMinJ);
}

inline int getVertexFromGrid(int n, int j) {
    if (n < gridMinN || n > gridMaxN || j < gridMinJ || j > gridMaxJ) return -1;
    return vertexGrid[getGridIdx(n, j)];
}

// Cached neighbor indices for each vertex (computed once at init)
struct CachedNeighbors {
    int16_t neighbors[6];  // Pre-computed neighbor vertex indices (-1 if none)
};
std::vector<CachedNeighbors> cachedNeighbors;

// ============================================================================
// INITIALIZATION
// ============================================================================

// Add vertex if not already present, return index
int addVertex(int n, int j) {
    long long key = vertexKey(n, j);
    auto it = vertexMap.find(key);
    if (it != vertexMap.end()) {
        return it->second;
    }
    int idx = (int)vertices.size();
    vertices.push_back({n, j, idx});
    vertexMap[key] = idx;
    return idx;
}

// Get vertex index, -1 if not present
int getVertexIndex(int n, int j) {
    long long key = vertexKey(n, j);
    auto it = vertexMap.find(key);
    if (it != vertexMap.end()) {
        return it->second;
    }
    return -1;
}

// Build dense grid for O(1) vertex lookup
void buildDenseGrid() {
    if (vertices.empty()) return;

    // Find bounding box
    gridMinN = gridMaxN = vertices[0].n;
    gridMinJ = gridMaxJ = vertices[0].j;
    for (const auto& v : vertices) {
        gridMinN = std::min(gridMinN, v.n);
        gridMaxN = std::max(gridMaxN, v.n);
        gridMinJ = std::min(gridMinJ, v.j);
        gridMaxJ = std::max(gridMaxJ, v.j);
    }

    // Add padding for neighbor lookups
    gridMinN--; gridMaxN++;
    gridMinJ--; gridMaxJ++;

    gridStrideJ = (size_t)(gridMaxJ - gridMinJ + 1);
    size_t gridSize = (size_t)(gridMaxN - gridMinN + 1) * gridStrideJ;

    vertexGrid.assign(gridSize, -1);

    // Populate grid
    for (size_t i = 0; i < vertices.size(); i++) {
        vertexGrid[getGridIdx(vertices[i].n, vertices[i].j)] = (int16_t)i;
    }
}

// Build cached neighbors for each vertex
void buildCachedNeighbors() {
    cachedNeighbors.resize(vertices.size());
    for (size_t i = 0; i < vertices.size(); i++) {
        int n = vertices[i].n;
        int j = vertices[i].j;
        for (int d = 0; d < 6; d++) {
            cachedNeighbors[i].neighbors[d] = (int16_t)getVertexFromGrid(n + dir_dn[d], j + dir_dj[d]);
        }
    }
}

// Build adjacency list (only for vertices in the region) - used for initial matching
std::vector<std::vector<int>> adjacency;

void buildAdjacency() {
    // Build dense grid first
    buildDenseGrid();

    adjacency.clear();
    adjacency.resize(vertices.size());

    for (size_t i = 0; i < vertices.size(); i++) {
        int n = vertices[i].n;
        int j = vertices[i].j;
        for (int d = 0; d < 6; d++) {
            int nn = n + dir_dn[d];
            int nj = j + dir_dj[d];
            int neighborIdx = getVertexFromGrid(nn, nj); // Use fast grid lookup
            if (neighborIdx >= 0) {
                adjacency[i].push_back(neighborIdx);
            }
        }
    }

    // Build cached neighbors for Glauber dynamics
    buildCachedNeighbors();
}

// ============================================================================
// PERFECT MATCHING INITIALIZATION
// ============================================================================
// For non-bipartite graphs, we use a greedy approach with augmenting paths
// This is simpler than Edmonds' blossom algorithm but works for most cases

// Find augmenting path from unmatched vertex using BFS
bool findAugmentingPath(int start, std::vector<int>& parent) {
    std::queue<int> q;
    std::vector<bool> visited(vertices.size(), false);
    parent.assign(vertices.size(), -1);

    q.push(start);
    visited[start] = true;

    while (!q.empty()) {
        int u = q.front();
        q.pop();

        for (int v : adjacency[u]) {
            if (visited[v]) continue;
            visited[v] = true;
            parent[v] = u;

            if (dimerPartner[v] == -1) {
                // Found augmenting path to unmatched vertex
                return true;
            }

            // Continue through the matched edge
            int w = dimerPartner[v];
            if (!visited[w]) {
                visited[w] = true;
                parent[w] = v;
                q.push(w);
            }
        }
    }
    return false;
}

// Augment matching along path
void augmentPath(int end, const std::vector<int>& parent) {
    int v = end;
    while (parent[v] != -1) {
        int u = parent[v];
        int prev = parent[u];

        // Match u-v
        dimerPartner[u] = v;
        dimerPartner[v] = u;

        if (prev == -1) break;
        v = prev;
    }
}

// Initialize perfect matching using augmenting paths
bool initMatching() {
    dimerPartner.assign(vertices.size(), -1);

    // Greedy initial matching
    for (size_t i = 0; i < vertices.size(); i++) {
        if (dimerPartner[i] != -1) continue;
        for (int j : adjacency[i]) {
            if (dimerPartner[j] == -1) {
                dimerPartner[i] = j;
                dimerPartner[j] = i;
                break;
            }
        }
    }

    // Augment to find perfect matching
    std::vector<int> parent;
    for (size_t i = 0; i < vertices.size(); i++) {
        if (dimerPartner[i] == -1) {
            if (findAugmentingPath(i, parent)) {
                // Trace back and augment
                int v = -1;
                // Find the endpoint
                for (size_t j = 0; j < vertices.size(); j++) {
                    if (parent[j] != -1 && dimerPartner[j] == -1 && j != i) {
                        v = j;
                        break;
                    }
                }
                if (v != -1) {
                    augmentPath(v, parent);
                }
            }
        }
    }

    // Check if matching is perfect
    for (size_t i = 0; i < vertices.size(); i++) {
        if (dimerPartner[i] == -1) {
            return false;
        }
    }
    return true;
}

// ============================================================================
// 4-CYCLE (RHOMBUS) MOVES
// ============================================================================
// A rhombus is 4 vertices forming a parallelogram
// If two opposite edges are dimers, we can flip to the other two

// Check if (v1, v2, v3, v4) form a rhombus where v1-v2-v3-v4-v1 is the cycle
// Returns true if edges (v1,v2) and (v3,v4) OR (v2,v3) and (v4,v1) are dimers
bool tryRhombusFlip(int v1, int v2, int v3, int v4) {
    // Check if (v1,v2) and (v3,v4) are both dimers
    if (dimerPartner[v1] == v2 && dimerPartner[v3] == v4) {
        // Flip to (v2,v3) and (v4,v1)
        dimerPartner[v1] = v4;
        dimerPartner[v4] = v1;
        dimerPartner[v2] = v3;
        dimerPartner[v3] = v2;
        return true;
    }
    // Check if (v2,v3) and (v4,v1) are both dimers
    if (dimerPartner[v2] == v3 && dimerPartner[v4] == v1) {
        // Flip to (v1,v2) and (v3,v4)
        dimerPartner[v1] = v2;
        dimerPartner[v2] = v1;
        dimerPartner[v3] = v4;
        dimerPartner[v4] = v3;
        return true;
    }
    return false;
}

// ============================================================================
// 6-CYCLE (HEXAGON) MOVES
// ============================================================================
// A hexagon has 6 vertices n0-n1-n2-n3-n4-n5-n0 around a center vertex
// If alternating edges are dimers, rotate to the other alternating pattern

bool tryHexagonFlip(int n0, int n1, int n2, int n3, int n4, int n5) {
    // Check alternating pattern 1: (n0,n1), (n2,n3), (n4,n5)
    if (dimerPartner[n0] == n1 && dimerPartner[n2] == n3 && dimerPartner[n4] == n5) {
        // Flip to (n1,n2), (n3,n4), (n5,n0)
        dimerPartner[n0] = n5;
        dimerPartner[n5] = n0;
        dimerPartner[n1] = n2;
        dimerPartner[n2] = n1;
        dimerPartner[n3] = n4;
        dimerPartner[n4] = n3;
        return true;
    }
    // Check alternating pattern 2: (n1,n2), (n3,n4), (n5,n0)
    if (dimerPartner[n1] == n2 && dimerPartner[n3] == n4 && dimerPartner[n5] == n0) {
        // Flip to (n0,n1), (n2,n3), (n4,n5)
        dimerPartner[n0] = n1;
        dimerPartner[n1] = n0;
        dimerPartner[n2] = n3;
        dimerPartner[n3] = n2;
        dimerPartner[n4] = n5;
        dimerPartner[n5] = n4;
        return true;
    }
    return false;
}

// ============================================================================
// GLAUBER DYNAMICS (OPTIMIZED) - 4-CYCLE AND 6-CYCLE MOVES
// ============================================================================

// Optimized Glauber step using cached data
void performOneStep() {
    totalSteps++;

    // Pick random vertex
    int v = getRandomInt((int)vertices.size());
    const CachedNeighbors& cn = cachedNeighbors[v];

    // Decide move type: 4-cycle (70%) or 6-cycle (30%)
    bool try6cycle = (getRandom01() < 0.3);

    if (try6cycle) {
        // 6-CYCLE (HEXAGON) MOVE
        // Check if all 6 neighbors exist
        bool allExist = true;
        int16_t nb[6];
        for (int d = 0; d < 6; d++) {
            nb[d] = cn.neighbors[d];
            if (nb[d] < 0) {
                allExist = false;
                break;
            }
        }

        if (allExist) {
            // Check if consecutive neighbors are connected (form a hexagon)
            bool allConnected = true;
            for (int d = 0; d < 6; d++) {
                int d2 = (d + 1) % 6;
                const CachedNeighbors& cn_d = cachedNeighbors[nb[d]];
                bool found = false;
                for (int k = 0; k < 6; k++) {
                    if (cn_d.neighbors[k] == nb[d2]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    allConnected = false;
                    break;
                }
            }

            if (allConnected) {
                if (tryHexagonFlip(nb[0], nb[1], nb[2], nb[3], nb[4], nb[5])) {
                    flipCount++;
                }
            }
        }
    } else {
        // 4-CYCLE (RHOMBUS) MOVE
        // Pick a random direction pair (d, d+1 mod 6) and check for rhombus
        int d1 = getRandomInt(6);
        int d2 = (d1 + 1) % 6;

        int v1 = cn.neighbors[d1];
        int v2 = cn.neighbors[d2];

        if (v1 >= 0 && v2 >= 0) {
            // Compute diagonal vertex position
            int n = vertices[v].n;
            int j = vertices[v].j;
            int n3 = n + dir_dn[d1] + dir_dn[d2];
            int j3 = j + dir_dj[d1] + dir_dj[d2];
            int v3 = getVertexFromGrid(n3, j3);

            if (v3 >= 0) {
                // Check if v1-v3 and v2-v3 edges exist
                const CachedNeighbors& cn1 = cachedNeighbors[v1];
                const CachedNeighbors& cn2 = cachedNeighbors[v2];
                bool v1v3 = false, v2v3 = false;
                for (int k = 0; k < 6; k++) {
                    if (cn1.neighbors[k] == v3) v1v3 = true;
                    if (cn2.neighbors[k] == v3) v2v3 = true;
                }

                if (v1v3 && v2v3) {
                    // Rhombus exists: v -> v1 -> v3 -> v2 -> v
                    if (tryRhombusFlip(v, v1, v3, v2)) {
                        flipCount++;
                    }
                }
            }
        }
    }
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

extern "C" {

// Initialize from a list of vertices
// Format: "n1,j1;n2,j2;n3,j3;..."
EMSCRIPTEN_KEEPALIVE
int initFromVertices(const char* vertexList) {
    vertices.clear();
    vertexMap.clear();
    adjacency.clear();
    dimerPartner.clear();
    totalSteps = 0;
    flipCount = 0;

    // Parse vertex list
    std::string input(vertexList);
    size_t pos = 0;
    while (pos < input.size()) {
        size_t comma = input.find(',', pos);
        size_t semi = input.find(';', pos);
        if (comma == std::string::npos) break;

        int n = std::stoi(input.substr(pos, comma - pos));
        int j;
        if (semi != std::string::npos) {
            j = std::stoi(input.substr(comma + 1, semi - comma - 1));
            pos = semi + 1;
        } else {
            j = std::stoi(input.substr(comma + 1));
            pos = input.size();
        }

        addVertex(n, j);
    }

    if (vertices.size() == 0) return -1;
    if (vertices.size() % 2 != 0) return -2; // Odd number of vertices

    // Build adjacency
    buildAdjacency();

    // Find initial matching
    if (!initMatching()) {
        return -3; // No perfect matching exists
    }

    return (int)vertices.size();
}

EMSCRIPTEN_KEEPALIVE
void performGlauberSteps(int numSteps) {
    for (int i = 0; i < numSteps; i++) {
        performOneStep();
    }
}

EMSCRIPTEN_KEEPALIVE
const char* exportDimers() {
    static std::string result;
    result.clear();

    std::unordered_set<long long> exported;

    for (size_t i = 0; i < vertices.size(); i++) {
        int partner = dimerPartner[i];
        if (partner > (int)i) { // Avoid duplicates
            long long key = ((long long)i << 20) | partner;
            if (exported.find(key) == exported.end()) {
                exported.insert(key);
                if (!result.empty()) result += ";";
                result += std::to_string(vertices[i].n) + "," + std::to_string(vertices[i].j);
                result += ",";
                result += std::to_string(vertices[partner].n) + "," + std::to_string(vertices[partner].j);
            }
        }
    }

    return result.c_str();
}

EMSCRIPTEN_KEEPALIVE
long long getTotalSteps() { return totalSteps; }

EMSCRIPTEN_KEEPALIVE
long long getFlipCount() { return flipCount; }

EMSCRIPTEN_KEEPALIVE
double getAcceptRate() {
    if (totalSteps == 0) return 0.0;
    return (double)flipCount / (double)totalSteps;
}

EMSCRIPTEN_KEEPALIVE
void setWeight(double w) { globalWeight = w; }

EMSCRIPTEN_KEEPALIVE
int getVertexCount() { return (int)vertices.size(); }

EMSCRIPTEN_KEEPALIVE
int getEdgeCount() {
    int count = 0;
    for (const auto& adj : adjacency) {
        count += adj.size();
    }
    return count / 2; // Each edge counted twice
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* ptr) {
    // No-op for static string
}

} // extern "C"
