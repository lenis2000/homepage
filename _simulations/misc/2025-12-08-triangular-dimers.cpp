/*
emcc 2025-12-08-triangular-dimers.cpp -o 2025-12-08-triangular-dimers.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initFromVertices','_performGlauberSteps','_performGlauberSteps2','_exportDimers','_exportDimers2','_resetDimers2','_clearDimers2','_getTotalSteps','_getFlipCount','_getLozengeFlips','_getTriangleFlips','_getButterflyFlips','_getAcceptRate','_setWeight','_setPeriodicEdgeWeights','_setUsePeriodicWeights','_getUsePeriodicWeights','_getPeriodicK','_getPeriodicL','_setSeed','_getVertexCount','_getEdgeCount','_freeString','_filterLoopsBySize','_getDebugWeights','_setProbePoints','_getSeparationCount','_getSeparatingLoopEdges','_getLoopCount','_getProbeDebugInfo','_findLoopContainingPoint','_computeLoopFractalDimension','_getLoopInfo','_getLoopEdgeIndices','_startFractalAveraging','_sampleFractalDimension','_getFractalAverage','_resetFractalSamples','_getFractalSamples','_malloc','_free']" \
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
- Glauber dynamics with lozenge moves (3 directions) from Kenyon-Rémila
- Lozenge moves flip 2 dimers in a parallelogram (4 vertices)
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
#include <array>

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

// For loop detection: canonicalize edge by coordinate comparison
inline long long loopEdgeKey(int n1, int j1, int n2, int j2) {
    if (n1 > n2 || (n1 == n2 && j1 > j2)) {
        std::swap(n1, n2); std::swap(j1, j2);
    }
    // Use 16 bits per coordinate to fit all 4 values
    return ((long long)(n1 + 32768) << 48) | ((long long)(j1 + 32768) << 32) |
           ((long long)(n2 + 32768) << 16) | ((long long)(j2 + 32768));
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
std::vector<int> dimerPartnerInit; // Initial matching (base config)
std::vector<int> dimerPartner;  // First dimer configuration
std::vector<int> dimerPartner2; // Second dimer configuration (for double dimer model)

// Statistics
long long totalSteps = 0;
long long flipCount = 0;
long long lozengeFlips = 0;
long long triangleFlips = 0;
long long butterflyFlips = 0;
long long totalSteps2 = 0;
long long flipCount2 = 0;

// Weight (for future position-dependent weights)
double globalWeight = 1.0;

// Periodic edge weights: [k][l][3] where 3 = number of edge types (horiz, diag1, diag2)
// Max dimensions: k=4, l=4
double edgeWeights_periodic[5][5][3];  // initialized with 1.0 in initPeriodicWeights
int periodicK = 2;  // Period in n direction (default 2)
int periodicL = 1;  // Period in j direction (default 1)
bool usePeriodicWeights = false;

// Initialize periodic weights with defaults
void initPeriodicWeights() {
    for (int ni = 0; ni < 5; ni++) {
        for (int ji = 0; ji < 5; ji++) {
            for (int t = 0; t < 3; t++) {
                edgeWeights_periodic[ni][ji][t] = 1.0;
            }
        }
    }
    // Default non-uniform weights for k=2, l=1
    // Position (0,0): horiz=1.0, diag1=2.0, diag2=0.5
    // Position (1,0): horiz=0.5, diag1=1.0, diag2=2.0
    edgeWeights_periodic[0][0][0] = 1.0;
    edgeWeights_periodic[0][0][1] = 2.0;
    edgeWeights_periodic[0][0][2] = 0.5;
    edgeWeights_periodic[1][0][0] = 0.5;
    edgeWeights_periodic[1][0][1] = 1.0;
    edgeWeights_periodic[1][0][2] = 2.0;
}

// ============================================================================
// EDGE WEIGHT FUNCTIONS
// ============================================================================

// Compute edge type from direction delta
// Type 0: horizontal (dn=±1, dj=0)
// Type 1: upper-right diagonal (dn=0, dj=±1)
// Type 2: upper-left diagonal (dn=∓1, dj=±1) - where dn and dj have opposite signs
inline int getEdgeType(int dn, int dj) {
    if (dj == 0) return 0;  // horizontal
    if (dn == 0) return 1;  // upper-right diagonal
    return 2;               // upper-left diagonal
}

// Get weight for edge from (n1,j1) to (n2,j2)
// Uses the edge midpoint for periodicity (so edges tile correctly)
inline double getEdgeWeightFromCoords(int n1, int j1, int n2, int j2) {
    if (!usePeriodicWeights) return 1.0;

    int dn = n2 - n1;
    int dj = j2 - j1;
    int edgeType = getEdgeType(dn, dj);

    // Use edge midpoint for periodicity (doubled to avoid fractions)
    // Midpoint = ((n1+n2)/2, (j1+j2)/2)
    // Doubled: (n1+n2, j1+j2)
    int midN2 = n1 + n2;  // 2 * midpoint_n
    int midJ2 = j1 + j2;  // 2 * midpoint_j

    // Period is also doubled: 2*k, 2*l
    int ni = ((midN2 % (2 * periodicK)) + (2 * periodicK)) % (2 * periodicK);
    int ji = ((midJ2 % (2 * periodicL)) + (2 * periodicL)) % (2 * periodicL);

    // Map back to [0, k) x [0, l)
    ni = ni / 2;
    ji = ji / 2;

    return edgeWeights_periodic[ni][ji][edgeType];
}

// Debug: dump all periodic weights
std::string debugPeriodicWeights() {
    std::string result = "Periodic weights (k=" + std::to_string(periodicK) + ", l=" + std::to_string(periodicL) + "):\n";
    for (int ni = 0; ni < periodicK; ni++) {
        for (int ji = 0; ji < periodicL; ji++) {
            result += "  (" + std::to_string(ni) + "," + std::to_string(ji) + "): ";
            result += "horiz=" + std::to_string(edgeWeights_periodic[ni][ji][0]) + ", ";
            result += "diag1=" + std::to_string(edgeWeights_periodic[ni][ji][1]) + ", ";
            result += "diag2=" + std::to_string(edgeWeights_periodic[ni][ji][2]) + "\n";
        }
    }
    return result;
}

// Loop detection for double dimer
std::vector<std::array<int, 4>> loopDimers0, loopDimers1;  // {n1, j1, n2, j2}
std::vector<int> loopSizes;  // Cycle size for each edge

// Distinct cycles: each cycle is a list of edges {n1, j1, n2, j2}
std::vector<std::vector<std::array<int, 4>>> distinctCycles;
// Edge indices for each distinct cycle (parallel to distinctCycles)
std::vector<std::vector<size_t>> distinctCycleIndices;

// Probe points for topological stats (triangle centers, so fractional coords)
double probeN1 = -10000, probeJ1 = -10000;
double probeN2 = -10000, probeJ2 = -10000;

// Fractal dimension averaging - fixed probe point
double fractalProbeN = -10000, fractalProbeJ = -10000;
std::vector<double> fractalSamples;  // accumulated fractal dimension samples

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
// For non-bipartite graphs, finding a perfect matching requires care.
// The full solution is Edmonds' Blossom Algorithm which handles odd cycles.
// We use a simplified approach: greedy matching + BFS augmenting paths.
// This works for most practical cases on triangular lattice parallelograms,
// but may fail on pathological domains. If initMatching() returns false,
// the domain either has odd vertex count or no perfect matching exists.

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
// LOZENGE MOVES (Kenyon-Remila)
// ============================================================================
// Three types of lozenges (parallelograms with 4 vertices):
// Type 0 (up-right): (n,j) - (n+1,j) - (n+1,j+1) - (n,j+1)
// Type 1 (up):       (n,j) - (n,j+1) - (n-1,j+2) - (n-1,j+1)
// Type 2 (up-left):  (n,j) - (n-1,j+1) - (n-2,j+1) - (n-1,j)
//
// Each lozenge has 2 pairs of opposite edges. If one pair is covered by dimers,
// we can flip to cover the other pair.

// Try lozenge flip for 4 vertices v0-v1-v2-v3 forming a cycle
// Returns true if flip was performed
bool tryLozengeFlip(int v0, int v1, int v2, int v3) {
    const Vertex& V0 = vertices[v0];
    const Vertex& V1 = vertices[v1];
    const Vertex& V2 = vertices[v2];
    const Vertex& V3 = vertices[v3];

    // Check if (v0,v1) and (v2,v3) are both dimers
    if (dimerPartner[v0] == v1 && dimerPartner[v2] == v3) {
        // Current edges: (v0,v1) and (v2,v3)
        // Proposed edges: (v1,v2) and (v3,v0)

        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(V0.n, V0.j, V1.n, V1.j)
                         * getEdgeWeightFromCoords(V2.n, V2.j, V3.n, V3.j);
            double w_new = getEdgeWeightFromCoords(V1.n, V1.j, V2.n, V2.j)
                         * getEdgeWeightFromCoords(V3.n, V3.j, V0.n, V0.j);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;  // Reject move
            }
        }

        // Accept: Flip to (v1,v2) and (v3,v0)
        dimerPartner[v0] = v3;
        dimerPartner[v3] = v0;
        dimerPartner[v1] = v2;
        dimerPartner[v2] = v1;
        return true;
    }
    // Check if (v1,v2) and (v3,v0) are both dimers
    if (dimerPartner[v1] == v2 && dimerPartner[v3] == v0) {
        // Current edges: (v1,v2) and (v3,v0)
        // Proposed edges: (v0,v1) and (v2,v3)

        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(V1.n, V1.j, V2.n, V2.j)
                         * getEdgeWeightFromCoords(V3.n, V3.j, V0.n, V0.j);
            double w_new = getEdgeWeightFromCoords(V0.n, V0.j, V1.n, V1.j)
                         * getEdgeWeightFromCoords(V2.n, V2.j, V3.n, V3.j);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;  // Reject move
            }
        }

        // Accept: Flip to (v0,v1) and (v2,v3)
        dimerPartner[v0] = v1;
        dimerPartner[v1] = v0;
        dimerPartner[v2] = v3;
        dimerPartner[v3] = v2;
        return true;
    }
    return false;
}

// ============================================================================
// TRIANGLE MOVES (Kenyon-Remila)
// ============================================================================
// Two types of triangles with 6 boundary edges covered by 3 dimers:
// Type 0: (n,j) - (n+2,j) - (n,j+2)  [pointing up-left]
// Type 1: (n,j) - (n+2,j) - (n+2,j-2) [pointing down-right]
//
// Each triangle boundary has 6 edges. If 3 alternating edges are dimers,
// we can rotate to the other 3 alternating edges.

// Try triangle flip for triangle type 0: (n,j)-(n+2,j)-(n,j+2)
// Boundary vertices in order: (n,j)-(n+1,j)-(n+2,j)-(n+1,j+1)-(n,j+2)-(n,j+1)-(n,j)
// 6 edges: e0=(n,j)-(n+1,j), e1=(n+1,j)-(n+2,j), e2=(n+2,j)-(n+1,j+1),
//          e3=(n+1,j+1)-(n,j+2), e4=(n,j+2)-(n,j+1), e5=(n,j+1)-(n,j)
// Pattern A: e0, e2, e4 are dimers
// Pattern B: e1, e3, e5 are dimers
bool tryTriangleFlip0(int n, int j) {
    // Get all 6 boundary vertices
    int v0 = getVertexFromGrid(n, j);
    int v1 = getVertexFromGrid(n+1, j);
    int v2 = getVertexFromGrid(n+2, j);
    int v3 = getVertexFromGrid(n+1, j+1);
    int v4 = getVertexFromGrid(n, j+2);
    int v5 = getVertexFromGrid(n, j+1);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0) {
        return false;
    }

    // Check pattern A: (v0-v1), (v2-v3), (v4-v5) are dimers
    if (dimerPartner[v0] == v1 && dimerPartner[v2] == v3 && dimerPartner[v4] == v5) {
        // Flip to pattern B: (v1-v2), (v3-v4), (v5-v0)
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n, j, n+1, j)
                         * getEdgeWeightFromCoords(n+2, j, n+1, j+1)
                         * getEdgeWeightFromCoords(n, j+2, n, j+1);
            double w_new = getEdgeWeightFromCoords(n+1, j, n+2, j)
                         * getEdgeWeightFromCoords(n+1, j+1, n, j+2)
                         * getEdgeWeightFromCoords(n, j+1, n, j);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner[v0] = v5; dimerPartner[v5] = v0;
        dimerPartner[v1] = v2; dimerPartner[v2] = v1;
        dimerPartner[v3] = v4; dimerPartner[v4] = v3;
        return true;
    }

    // Check pattern B: (v1-v2), (v3-v4), (v5-v0) are dimers
    if (dimerPartner[v1] == v2 && dimerPartner[v3] == v4 && dimerPartner[v5] == v0) {
        // Flip to pattern A: (v0-v1), (v2-v3), (v4-v5)
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n+1, j, n+2, j)
                         * getEdgeWeightFromCoords(n+1, j+1, n, j+2)
                         * getEdgeWeightFromCoords(n, j+1, n, j);
            double w_new = getEdgeWeightFromCoords(n, j, n+1, j)
                         * getEdgeWeightFromCoords(n+2, j, n+1, j+1)
                         * getEdgeWeightFromCoords(n, j+2, n, j+1);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner[v0] = v1; dimerPartner[v1] = v0;
        dimerPartner[v2] = v3; dimerPartner[v3] = v2;
        dimerPartner[v4] = v5; dimerPartner[v5] = v4;
        return true;
    }

    return false;
}

// Try triangle flip for triangle type 1: (n,j)-(n+2,j)-(n+2,j-2)
// Boundary vertices in order: (n,j)-(n+1,j)-(n+2,j)-(n+2,j-1)-(n+2,j-2)-(n+1,j-1)-(n,j)
// 6 edges: e0=(n,j)-(n+1,j), e1=(n+1,j)-(n+2,j), e2=(n+2,j)-(n+2,j-1),
//          e3=(n+2,j-1)-(n+2,j-2), e4=(n+2,j-2)-(n+1,j-1), e5=(n+1,j-1)-(n,j)
// Pattern A: e0, e2, e4 are dimers
// Pattern B: e1, e3, e5 are dimers
bool tryTriangleFlip1(int n, int j) {
    // Get all 6 boundary vertices
    int v0 = getVertexFromGrid(n, j);
    int v1 = getVertexFromGrid(n+1, j);
    int v2 = getVertexFromGrid(n+2, j);
    int v3 = getVertexFromGrid(n+2, j-1);
    int v4 = getVertexFromGrid(n+2, j-2);
    int v5 = getVertexFromGrid(n+1, j-1);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0) {
        return false;
    }

    // Check pattern A: (v0-v1), (v2-v3), (v4-v5) are dimers
    if (dimerPartner[v0] == v1 && dimerPartner[v2] == v3 && dimerPartner[v4] == v5) {
        // Flip to pattern B: (v1-v2), (v3-v4), (v5-v0)
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n, j, n+1, j)
                         * getEdgeWeightFromCoords(n+2, j, n+2, j-1)
                         * getEdgeWeightFromCoords(n+2, j-2, n+1, j-1);
            double w_new = getEdgeWeightFromCoords(n+1, j, n+2, j)
                         * getEdgeWeightFromCoords(n+2, j-1, n+2, j-2)
                         * getEdgeWeightFromCoords(n+1, j-1, n, j);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner[v0] = v5; dimerPartner[v5] = v0;
        dimerPartner[v1] = v2; dimerPartner[v2] = v1;
        dimerPartner[v3] = v4; dimerPartner[v4] = v3;
        return true;
    }

    // Check pattern B: (v1-v2), (v3-v4), (v5-v0) are dimers
    if (dimerPartner[v1] == v2 && dimerPartner[v3] == v4 && dimerPartner[v5] == v0) {
        // Flip to pattern A: (v0-v1), (v2-v3), (v4-v5)
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n+1, j, n+2, j)
                         * getEdgeWeightFromCoords(n+2, j-1, n+2, j-2)
                         * getEdgeWeightFromCoords(n+1, j-1, n, j);
            double w_new = getEdgeWeightFromCoords(n, j, n+1, j)
                         * getEdgeWeightFromCoords(n+2, j, n+2, j-1)
                         * getEdgeWeightFromCoords(n+2, j-2, n+1, j-1);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner[v0] = v1; dimerPartner[v1] = v0;
        dimerPartner[v2] = v3; dimerPartner[v3] = v2;
        dimerPartner[v4] = v5; dimerPartner[v5] = v4;
        return true;
    }

    return false;
}

// ============================================================================
// BUTTERFLY MOVES (Kenyon-Remila)
// ============================================================================
// Three types of butterflies with 8 boundary edges covered by 4 dimers:
// Type 0: (n+1,j)-(n+2,j)-(n+3,j-1)-(n+3,j)-(n+3,j+1)-(n+2,j+1)-(n+1,j+2)-(n+1,j+1)
//         Centered at (n,j), vertices shifted by (1,0)
// Type 1: (n,j)-(n-1,j+1)-(n-2,j+2)-(n-2,j+1)-(n-3,j+1)-(n-2,j)-(n-1,j+1)-(n-1,j)
//         Note: the user's path has a repeated vertex, interpreting as 8-cycle
// Type 2: (n,j)-(n+1,j)-(n+2,j)-(n+1,j+1)-(n+1,j+2)-(n,j+2)-(n-1,j+2)-(n,j+1)
//
// Each butterfly boundary has 8 edges. If 4 alternating edges are dimers,
// we can rotate to the other 4 alternating edges.

// Helper: try butterfly flip given 8 vertices in cycle order
// v0-v1-v2-v3-v4-v5-v6-v7 form the cycle
// Pattern A: edges (v0,v1), (v2,v3), (v4,v5), (v6,v7) are dimers
// Pattern B: edges (v1,v2), (v3,v4), (v5,v6), (v7,v0) are dimers
bool tryButterflyFlip(int v0, int v1, int v2, int v3, int v4, int v5, int v6, int v7,
                      int n0, int j0, int n1, int j1, int n2, int j2, int n3, int j3,
                      int n4, int j4, int n5, int j5, int n6, int j6, int n7, int j7) {
    // Check pattern A: (v0-v1), (v2-v3), (v4-v5), (v6-v7) are dimers
    if (dimerPartner[v0] == v1 && dimerPartner[v2] == v3 &&
        dimerPartner[v4] == v5 && dimerPartner[v6] == v7) {
        // Flip to pattern B: (v1-v2), (v3-v4), (v5-v6), (v7-v0)
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n0, j0, n1, j1)
                         * getEdgeWeightFromCoords(n2, j2, n3, j3)
                         * getEdgeWeightFromCoords(n4, j4, n5, j5)
                         * getEdgeWeightFromCoords(n6, j6, n7, j7);
            double w_new = getEdgeWeightFromCoords(n1, j1, n2, j2)
                         * getEdgeWeightFromCoords(n3, j3, n4, j4)
                         * getEdgeWeightFromCoords(n5, j5, n6, j6)
                         * getEdgeWeightFromCoords(n7, j7, n0, j0);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner[v0] = v7; dimerPartner[v7] = v0;
        dimerPartner[v1] = v2; dimerPartner[v2] = v1;
        dimerPartner[v3] = v4; dimerPartner[v4] = v3;
        dimerPartner[v5] = v6; dimerPartner[v6] = v5;
        return true;
    }

    // Check pattern B: (v1-v2), (v3-v4), (v5-v6), (v7-v0) are dimers
    if (dimerPartner[v1] == v2 && dimerPartner[v3] == v4 &&
        dimerPartner[v5] == v6 && dimerPartner[v7] == v0) {
        // Flip to pattern A: (v0-v1), (v2-v3), (v4-v5), (v6-v7)
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n1, j1, n2, j2)
                         * getEdgeWeightFromCoords(n3, j3, n4, j4)
                         * getEdgeWeightFromCoords(n5, j5, n6, j6)
                         * getEdgeWeightFromCoords(n7, j7, n0, j0);
            double w_new = getEdgeWeightFromCoords(n0, j0, n1, j1)
                         * getEdgeWeightFromCoords(n2, j2, n3, j3)
                         * getEdgeWeightFromCoords(n4, j4, n5, j5)
                         * getEdgeWeightFromCoords(n6, j6, n7, j7);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner[v0] = v1; dimerPartner[v1] = v0;
        dimerPartner[v2] = v3; dimerPartner[v3] = v2;
        dimerPartner[v4] = v5; dimerPartner[v5] = v4;
        dimerPartner[v6] = v7; dimerPartner[v7] = v6;
        return true;
    }

    return false;
}

// Butterfly type 0: (1,0)-(2,0)-(3,-1)-(3,0)-(3,1)-(2,1)-(1,2)-(1,1) relative to origin
// At position (n,j), the 8 vertices are:
// (n+1,j)-(n+2,j)-(n+3,j-1)-(n+3,j)-(n+3,j+1)-(n+2,j+1)-(n+1,j+2)-(n+1,j+1)
bool tryButterflyFlip0(int n, int j) {
    int n0 = n+1, j0 = j;
    int n1 = n+2, j1 = j;
    int n2 = n+3, j2 = j-1;
    int n3 = n+3, j3 = j;
    int n4 = n+3, j4 = j+1;
    int n5 = n+2, j5 = j+1;
    int n6 = n+1, j6 = j+2;
    int n7 = n+1, j7 = j+1;

    int v0 = getVertexFromGrid(n0, j0);
    int v1 = getVertexFromGrid(n1, j1);
    int v2 = getVertexFromGrid(n2, j2);
    int v3 = getVertexFromGrid(n3, j3);
    int v4 = getVertexFromGrid(n4, j4);
    int v5 = getVertexFromGrid(n5, j5);
    int v6 = getVertexFromGrid(n6, j6);
    int v7 = getVertexFromGrid(n7, j7);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0 || v6 < 0 || v7 < 0) {
        return false;
    }

    return tryButterflyFlip(v0, v1, v2, v3, v4, v5, v6, v7,
                            n0, j0, n1, j1, n2, j2, n3, j3, n4, j4, n5, j5, n6, j6, n7, j7);
}

// Butterfly type 1: (0,0)-(-1,1)-(-2,2)-(-2,1)-(-3,1)-(-2,0)-(-1,0) relative to origin
// Interpreting the user's path (removing duplicate), 8-cycle at (n,j):
// (n,j)-(n-1,j+1)-(n-2,j+2)-(n-2,j+1)-(n-3,j+1)-(n-2,j)-(n-1,j)-(n-1,j+1 duplicate? no, should be different)
// Looking more carefully: (0,0)-(-1,1)-(-2,2)-(-2,1)-(-3,1)-(-2,0)-(-1,1)-(-1,0)-(0,0)
// This has (-1,1) appearing twice. Let me reinterpret as:
// v0=(0,0), v1=(-1,1), v2=(-2,2), v3=(-2,1), v4=(-3,1), v5=(-2,0), v6=(-1,1), v7=(-1,0)
// Since (-1,1) appears at v1 and v6, this seems wrong. Let me re-read...
// Actually checking adjacencies:
// (0,0) to (-1,1): valid (up-left)
// (-1,1) to (-2,2): valid (up-left)
// (-2,2) to (-2,1): valid (down, j-1)
// (-2,1) to (-3,1): valid (left, n-1)
// (-3,1) to (-2,0): valid (down-right, n+1,j-1)
// (-2,0) to (-1,1): valid (up-right, n+1,j+1) - BUT this is already v1!
// So this seems like a 6-cycle with a "tail"? Let me assume typo and use:
// (n,j)-(n-1,j+1)-(n-2,j+2)-(n-2,j+1)-(n-3,j+1)-(n-3,j)-(n-2,j)-(n-1,j)
bool tryButterflyFlip1(int n, int j) {
    int n0 = n, j0 = j;
    int n1 = n-1, j1 = j+1;
    int n2 = n-2, j2 = j+2;
    int n3 = n-2, j3 = j+1;
    int n4 = n-3, j4 = j+1;
    int n5 = n-3, j5 = j;
    int n6 = n-2, j6 = j;
    int n7 = n-1, j7 = j;

    int v0 = getVertexFromGrid(n0, j0);
    int v1 = getVertexFromGrid(n1, j1);
    int v2 = getVertexFromGrid(n2, j2);
    int v3 = getVertexFromGrid(n3, j3);
    int v4 = getVertexFromGrid(n4, j4);
    int v5 = getVertexFromGrid(n5, j5);
    int v6 = getVertexFromGrid(n6, j6);
    int v7 = getVertexFromGrid(n7, j7);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0 || v6 < 0 || v7 < 0) {
        return false;
    }

    return tryButterflyFlip(v0, v1, v2, v3, v4, v5, v6, v7,
                            n0, j0, n1, j1, n2, j2, n3, j3, n4, j4, n5, j5, n6, j6, n7, j7);
}

// Butterfly type 2: (0,0)-(1,0)-(2,0)-(1,1)-(1,2)-(0,2)-(-1,2)-(0,1) relative to origin
// At position (n,j), the 8 vertices are:
// (n,j)-(n+1,j)-(n+2,j)-(n+1,j+1)-(n+1,j+2)-(n,j+2)-(n-1,j+2)-(n,j+1)
bool tryButterflyFlip2(int n, int j) {
    int n0 = n, j0 = j;
    int n1 = n+1, j1 = j;
    int n2 = n+2, j2 = j;
    int n3 = n+1, j3 = j+1;
    int n4 = n+1, j4 = j+2;
    int n5 = n, j5 = j+2;
    int n6 = n-1, j6 = j+2;
    int n7 = n, j7 = j+1;

    int v0 = getVertexFromGrid(n0, j0);
    int v1 = getVertexFromGrid(n1, j1);
    int v2 = getVertexFromGrid(n2, j2);
    int v3 = getVertexFromGrid(n3, j3);
    int v4 = getVertexFromGrid(n4, j4);
    int v5 = getVertexFromGrid(n5, j5);
    int v6 = getVertexFromGrid(n6, j6);
    int v7 = getVertexFromGrid(n7, j7);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0 || v6 < 0 || v7 < 0) {
        return false;
    }

    return tryButterflyFlip(v0, v1, v2, v3, v4, v5, v6, v7,
                            n0, j0, n1, j1, n2, j2, n3, j3, n4, j4, n5, j5, n6, j6, n7, j7);
}

// ============================================================================
// GLAUBER DYNAMICS - LOZENGE + TRIANGLE + BUTTERFLY MOVES (Kenyon-Remila)
// ============================================================================

void performOneStep() {
    totalSteps++;

    // Pick random vertex
    int v = getRandomInt((int)vertices.size());
    int n = vertices[v].n;
    int j = vertices[v].j;

    // Pick random move type: 0-2 = lozenge, 3-4 = triangle, 5-7 = butterfly
    int moveType = getRandomInt(8);

    if (moveType < 3) {
        // Lozenge move
        int n0, j0, n1, j1, n2, j2, n3, j3;

        switch (moveType) {
            case 0:
                // Type 0 (up-right): (n,j) - (n+1,j) - (n+1,j+1) - (n,j+1)
                n0 = n;     j0 = j;
                n1 = n + 1; j1 = j;
                n2 = n + 1; j2 = j + 1;
                n3 = n;     j3 = j + 1;
                break;
            case 1:
                // Type 1 (up): (n,j) - (n,j+1) - (n-1,j+2) - (n-1,j+1)
                n0 = n;     j0 = j;
                n1 = n;     j1 = j + 1;
                n2 = n - 1; j2 = j + 2;
                n3 = n - 1; j3 = j + 1;
                break;
            case 2:
                // Type 2 (up-left): (n,j) - (n-1,j+1) - (n-2,j+1) - (n-1,j)
                n0 = n;     j0 = j;
                n1 = n - 1; j1 = j + 1;
                n2 = n - 2; j2 = j + 1;
                n3 = n - 1; j3 = j;
                break;
            default:
                return;
        }

        int v0 = getVertexFromGrid(n0, j0);
        int v1 = getVertexFromGrid(n1, j1);
        int v2 = getVertexFromGrid(n2, j2);
        int v3 = getVertexFromGrid(n3, j3);

        if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0) {
            return;
        }

        if (tryLozengeFlip(v0, v1, v2, v3)) {
            flipCount++;
            lozengeFlips++;
        }
    } else if (moveType < 5) {
        // Triangle move
        if (moveType == 3) {
            // Triangle type 0: (n,j)-(n+2,j)-(n,j+2)
            if (tryTriangleFlip0(n, j)) {
                flipCount++;
                triangleFlips++;
            }
        } else {
            // Triangle type 1: (n,j)-(n+2,j)-(n+2,j-2)
            if (tryTriangleFlip1(n, j)) {
                flipCount++;
                triangleFlips++;
            }
        }
    } else {
        // Butterfly move
        bool flipped = false;
        switch (moveType) {
            case 5:
                flipped = tryButterflyFlip0(n, j);
                break;
            case 6:
                flipped = tryButterflyFlip1(n, j);
                break;
            case 7:
                flipped = tryButterflyFlip2(n, j);
                break;
        }
        if (flipped) {
            flipCount++;
            butterflyFlips++;
        }
    }
}

// ============================================================================
// SECOND CONFIGURATION (for double dimer model)
// ============================================================================

// Lozenge flip for second configuration
bool tryLozengeFlip2(int v0, int v1, int v2, int v3) {
    const Vertex& V0 = vertices[v0];
    const Vertex& V1 = vertices[v1];
    const Vertex& V2 = vertices[v2];
    const Vertex& V3 = vertices[v3];

    if (dimerPartner2[v0] == v1 && dimerPartner2[v2] == v3) {
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(V0.n, V0.j, V1.n, V1.j)
                         * getEdgeWeightFromCoords(V2.n, V2.j, V3.n, V3.j);
            double w_new = getEdgeWeightFromCoords(V1.n, V1.j, V2.n, V2.j)
                         * getEdgeWeightFromCoords(V3.n, V3.j, V0.n, V0.j);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner2[v0] = v3;
        dimerPartner2[v3] = v0;
        dimerPartner2[v1] = v2;
        dimerPartner2[v2] = v1;
        return true;
    }
    if (dimerPartner2[v1] == v2 && dimerPartner2[v3] == v0) {
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(V1.n, V1.j, V2.n, V2.j)
                         * getEdgeWeightFromCoords(V3.n, V3.j, V0.n, V0.j);
            double w_new = getEdgeWeightFromCoords(V0.n, V0.j, V1.n, V1.j)
                         * getEdgeWeightFromCoords(V2.n, V2.j, V3.n, V3.j);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner2[v0] = v1;
        dimerPartner2[v1] = v0;
        dimerPartner2[v2] = v3;
        dimerPartner2[v3] = v2;
        return true;
    }
    return false;
}

// Triangle flip type 0 for second configuration
bool tryTriangleFlip0_2(int n, int j) {
    int v0 = getVertexFromGrid(n, j);
    int v1 = getVertexFromGrid(n+1, j);
    int v2 = getVertexFromGrid(n+2, j);
    int v3 = getVertexFromGrid(n+1, j+1);
    int v4 = getVertexFromGrid(n, j+2);
    int v5 = getVertexFromGrid(n, j+1);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0) {
        return false;
    }

    if (dimerPartner2[v0] == v1 && dimerPartner2[v2] == v3 && dimerPartner2[v4] == v5) {
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n, j, n+1, j)
                         * getEdgeWeightFromCoords(n+2, j, n+1, j+1)
                         * getEdgeWeightFromCoords(n, j+2, n, j+1);
            double w_new = getEdgeWeightFromCoords(n+1, j, n+2, j)
                         * getEdgeWeightFromCoords(n+1, j+1, n, j+2)
                         * getEdgeWeightFromCoords(n, j+1, n, j);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner2[v0] = v5; dimerPartner2[v5] = v0;
        dimerPartner2[v1] = v2; dimerPartner2[v2] = v1;
        dimerPartner2[v3] = v4; dimerPartner2[v4] = v3;
        return true;
    }

    if (dimerPartner2[v1] == v2 && dimerPartner2[v3] == v4 && dimerPartner2[v5] == v0) {
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n+1, j, n+2, j)
                         * getEdgeWeightFromCoords(n+1, j+1, n, j+2)
                         * getEdgeWeightFromCoords(n, j+1, n, j);
            double w_new = getEdgeWeightFromCoords(n, j, n+1, j)
                         * getEdgeWeightFromCoords(n+2, j, n+1, j+1)
                         * getEdgeWeightFromCoords(n, j+2, n, j+1);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner2[v0] = v1; dimerPartner2[v1] = v0;
        dimerPartner2[v2] = v3; dimerPartner2[v3] = v2;
        dimerPartner2[v4] = v5; dimerPartner2[v5] = v4;
        return true;
    }

    return false;
}

// Triangle flip type 1 for second configuration
bool tryTriangleFlip1_2(int n, int j) {
    int v0 = getVertexFromGrid(n, j);
    int v1 = getVertexFromGrid(n+1, j);
    int v2 = getVertexFromGrid(n+2, j);
    int v3 = getVertexFromGrid(n+2, j-1);
    int v4 = getVertexFromGrid(n+2, j-2);
    int v5 = getVertexFromGrid(n+1, j-1);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0) {
        return false;
    }

    if (dimerPartner2[v0] == v1 && dimerPartner2[v2] == v3 && dimerPartner2[v4] == v5) {
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n, j, n+1, j)
                         * getEdgeWeightFromCoords(n+2, j, n+2, j-1)
                         * getEdgeWeightFromCoords(n+2, j-2, n+1, j-1);
            double w_new = getEdgeWeightFromCoords(n+1, j, n+2, j)
                         * getEdgeWeightFromCoords(n+2, j-1, n+2, j-2)
                         * getEdgeWeightFromCoords(n+1, j-1, n, j);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner2[v0] = v5; dimerPartner2[v5] = v0;
        dimerPartner2[v1] = v2; dimerPartner2[v2] = v1;
        dimerPartner2[v3] = v4; dimerPartner2[v4] = v3;
        return true;
    }

    if (dimerPartner2[v1] == v2 && dimerPartner2[v3] == v4 && dimerPartner2[v5] == v0) {
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n+1, j, n+2, j)
                         * getEdgeWeightFromCoords(n+2, j-1, n+2, j-2)
                         * getEdgeWeightFromCoords(n+1, j-1, n, j);
            double w_new = getEdgeWeightFromCoords(n, j, n+1, j)
                         * getEdgeWeightFromCoords(n+2, j, n+2, j-1)
                         * getEdgeWeightFromCoords(n+2, j-2, n+1, j-1);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner2[v0] = v1; dimerPartner2[v1] = v0;
        dimerPartner2[v2] = v3; dimerPartner2[v3] = v2;
        dimerPartner2[v4] = v5; dimerPartner2[v5] = v4;
        return true;
    }

    return false;
}

// Butterfly flip helper for second configuration
bool tryButterflyFlip2_config(int v0, int v1, int v2, int v3, int v4, int v5, int v6, int v7,
                               int n0, int j0, int n1, int j1, int n2, int j2, int n3, int j3,
                               int n4, int j4, int n5, int j5, int n6, int j6, int n7, int j7) {
    if (dimerPartner2[v0] == v1 && dimerPartner2[v2] == v3 &&
        dimerPartner2[v4] == v5 && dimerPartner2[v6] == v7) {
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n0, j0, n1, j1)
                         * getEdgeWeightFromCoords(n2, j2, n3, j3)
                         * getEdgeWeightFromCoords(n4, j4, n5, j5)
                         * getEdgeWeightFromCoords(n6, j6, n7, j7);
            double w_new = getEdgeWeightFromCoords(n1, j1, n2, j2)
                         * getEdgeWeightFromCoords(n3, j3, n4, j4)
                         * getEdgeWeightFromCoords(n5, j5, n6, j6)
                         * getEdgeWeightFromCoords(n7, j7, n0, j0);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner2[v0] = v7; dimerPartner2[v7] = v0;
        dimerPartner2[v1] = v2; dimerPartner2[v2] = v1;
        dimerPartner2[v3] = v4; dimerPartner2[v4] = v3;
        dimerPartner2[v5] = v6; dimerPartner2[v6] = v5;
        return true;
    }

    if (dimerPartner2[v1] == v2 && dimerPartner2[v3] == v4 &&
        dimerPartner2[v5] == v6 && dimerPartner2[v7] == v0) {
        if (usePeriodicWeights) {
            double w_old = getEdgeWeightFromCoords(n1, j1, n2, j2)
                         * getEdgeWeightFromCoords(n3, j3, n4, j4)
                         * getEdgeWeightFromCoords(n5, j5, n6, j6)
                         * getEdgeWeightFromCoords(n7, j7, n0, j0);
            double w_new = getEdgeWeightFromCoords(n0, j0, n1, j1)
                         * getEdgeWeightFromCoords(n2, j2, n3, j3)
                         * getEdgeWeightFromCoords(n4, j4, n5, j5)
                         * getEdgeWeightFromCoords(n6, j6, n7, j7);
            double ratio = w_new / w_old;
            if (ratio < 1.0 && getRandom01() >= ratio) {
                return false;
            }
        }
        dimerPartner2[v0] = v1; dimerPartner2[v1] = v0;
        dimerPartner2[v2] = v3; dimerPartner2[v3] = v2;
        dimerPartner2[v4] = v5; dimerPartner2[v5] = v4;
        dimerPartner2[v6] = v7; dimerPartner2[v7] = v6;
        return true;
    }

    return false;
}

bool tryButterflyFlip0_2(int n, int j) {
    int n0 = n+1, j0 = j;
    int n1 = n+2, j1 = j;
    int n2 = n+3, j2 = j-1;
    int n3 = n+3, j3 = j;
    int n4 = n+3, j4 = j+1;
    int n5 = n+2, j5 = j+1;
    int n6 = n+1, j6 = j+2;
    int n7 = n+1, j7 = j+1;

    int v0 = getVertexFromGrid(n0, j0);
    int v1 = getVertexFromGrid(n1, j1);
    int v2 = getVertexFromGrid(n2, j2);
    int v3 = getVertexFromGrid(n3, j3);
    int v4 = getVertexFromGrid(n4, j4);
    int v5 = getVertexFromGrid(n5, j5);
    int v6 = getVertexFromGrid(n6, j6);
    int v7 = getVertexFromGrid(n7, j7);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0 || v6 < 0 || v7 < 0) {
        return false;
    }

    return tryButterflyFlip2_config(v0, v1, v2, v3, v4, v5, v6, v7,
                                     n0, j0, n1, j1, n2, j2, n3, j3, n4, j4, n5, j5, n6, j6, n7, j7);
}

bool tryButterflyFlip1_2(int n, int j) {
    int n0 = n, j0 = j;
    int n1 = n-1, j1 = j+1;
    int n2 = n-2, j2 = j+2;
    int n3 = n-2, j3 = j+1;
    int n4 = n-3, j4 = j+1;
    int n5 = n-3, j5 = j;
    int n6 = n-2, j6 = j;
    int n7 = n-1, j7 = j;

    int v0 = getVertexFromGrid(n0, j0);
    int v1 = getVertexFromGrid(n1, j1);
    int v2 = getVertexFromGrid(n2, j2);
    int v3 = getVertexFromGrid(n3, j3);
    int v4 = getVertexFromGrid(n4, j4);
    int v5 = getVertexFromGrid(n5, j5);
    int v6 = getVertexFromGrid(n6, j6);
    int v7 = getVertexFromGrid(n7, j7);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0 || v6 < 0 || v7 < 0) {
        return false;
    }

    return tryButterflyFlip2_config(v0, v1, v2, v3, v4, v5, v6, v7,
                                     n0, j0, n1, j1, n2, j2, n3, j3, n4, j4, n5, j5, n6, j6, n7, j7);
}

bool tryButterflyFlip2_2(int n, int j) {
    int n0 = n, j0 = j;
    int n1 = n+1, j1 = j;
    int n2 = n+2, j2 = j;
    int n3 = n+1, j3 = j+1;
    int n4 = n+1, j4 = j+2;
    int n5 = n, j5 = j+2;
    int n6 = n-1, j6 = j+2;
    int n7 = n, j7 = j+1;

    int v0 = getVertexFromGrid(n0, j0);
    int v1 = getVertexFromGrid(n1, j1);
    int v2 = getVertexFromGrid(n2, j2);
    int v3 = getVertexFromGrid(n3, j3);
    int v4 = getVertexFromGrid(n4, j4);
    int v5 = getVertexFromGrid(n5, j5);
    int v6 = getVertexFromGrid(n6, j6);
    int v7 = getVertexFromGrid(n7, j7);

    if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0 || v4 < 0 || v5 < 0 || v6 < 0 || v7 < 0) {
        return false;
    }

    return tryButterflyFlip2_config(v0, v1, v2, v3, v4, v5, v6, v7,
                                     n0, j0, n1, j1, n2, j2, n3, j3, n4, j4, n5, j5, n6, j6, n7, j7);
}

void performOneStep2() {
    totalSteps2++;

    int v = getRandomInt((int)vertices.size());
    int n = vertices[v].n;
    int j = vertices[v].j;

    // Pick random move type: 0-2 = lozenge, 3-4 = triangle, 5-7 = butterfly
    int moveType = getRandomInt(8);

    if (moveType < 3) {
        // Lozenge move
        int n0, j0, n1, j1, n2, j2, n3, j3;

        switch (moveType) {
            case 0:
                n0 = n;     j0 = j;
                n1 = n + 1; j1 = j;
                n2 = n + 1; j2 = j + 1;
                n3 = n;     j3 = j + 1;
                break;
            case 1:
                n0 = n;     j0 = j;
                n1 = n;     j1 = j + 1;
                n2 = n - 1; j2 = j + 2;
                n3 = n - 1; j3 = j + 1;
                break;
            case 2:
                n0 = n;     j0 = j;
                n1 = n - 1; j1 = j + 1;
                n2 = n - 2; j2 = j + 1;
                n3 = n - 1; j3 = j;
                break;
            default:
                return;
        }

        int v0 = getVertexFromGrid(n0, j0);
        int v1 = getVertexFromGrid(n1, j1);
        int v2 = getVertexFromGrid(n2, j2);
        int v3 = getVertexFromGrid(n3, j3);

        if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0) {
            return;
        }

        if (tryLozengeFlip2(v0, v1, v2, v3)) {
            flipCount2++;
        }
    } else if (moveType < 5) {
        // Triangle move
        if (moveType == 3) {
            if (tryTriangleFlip0_2(n, j)) {
                flipCount2++;
            }
        } else {
            if (tryTriangleFlip1_2(n, j)) {
                flipCount2++;
            }
        }
    } else {
        // Butterfly move
        bool flipped = false;
        switch (moveType) {
            case 5:
                flipped = tryButterflyFlip0_2(n, j);
                break;
            case 6:
                flipped = tryButterflyFlip1_2(n, j);
                break;
            case 7:
                flipped = tryButterflyFlip2_2(n, j);
                break;
        }
        if (flipped) {
            flipCount2++;
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
    dimerPartnerInit.clear();
    dimerPartner.clear();
    dimerPartner2.clear();
    totalSteps = 0;
    flipCount = 0;
    lozengeFlips = 0;
    triangleFlips = 0;
    butterflyFlips = 0;
    totalSteps2 = 0;
    flipCount2 = 0;

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

    // Save initial matching as base config
    dimerPartnerInit = dimerPartner;

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
long long getLozengeFlips() { return lozengeFlips; }

EMSCRIPTEN_KEEPALIVE
long long getTriangleFlips() { return triangleFlips; }

EMSCRIPTEN_KEEPALIVE
long long getButterflyFlips() { return butterflyFlips; }

EMSCRIPTEN_KEEPALIVE
double getAcceptRate() {
    if (totalSteps == 0) return 0.0;
    return (double)flipCount / (double)totalSteps;
}

EMSCRIPTEN_KEEPALIVE
void setWeight(double w) { globalWeight = w; }

// Set periodic edge weights from flat array
// Layout: [n=0,j=0,t=0], [n=0,j=0,t=1], [n=0,j=0,t=2], [n=0,j=1,t=0], ...
EMSCRIPTEN_KEEPALIVE
void setPeriodicEdgeWeights(double* values, int k, int l) {
    periodicK = k;
    periodicL = l;
    for (int ni = 0; ni < k; ni++) {
        for (int ji = 0; ji < l; ji++) {
            for (int t = 0; t < 3; t++) {
                edgeWeights_periodic[ni][ji][t] = values[(ni * l + ji) * 3 + t];
            }
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void setUsePeriodicWeights(int use) {
    usePeriodicWeights = (use != 0);
}

EMSCRIPTEN_KEEPALIVE
int getUsePeriodicWeights() {
    return usePeriodicWeights ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE
int getPeriodicK() { return periodicK; }

EMSCRIPTEN_KEEPALIVE
int getPeriodicL() { return periodicL; }

EMSCRIPTEN_KEEPALIVE
void setSeed(double seed) {
    // Cast double (from JS) to uint64
    rng_state = (uint64_t)seed;
    // Scramble a bit to avoid bad seeds
    for (int i = 0; i < 10; i++) xorshift64();
}

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

EMSCRIPTEN_KEEPALIVE
const char* getDebugWeights() {
    static std::string result;
    result = debugPeriodicWeights();
    return result.c_str();
}

// ============================================================================
// DOUBLE DIMER EXPORTED FUNCTIONS
// ============================================================================

EMSCRIPTEN_KEEPALIVE
void performGlauberSteps2(int numSteps) {
    for (int i = 0; i < numSteps; i++) {
        performOneStep2();
    }
}

EMSCRIPTEN_KEEPALIVE
void resetDimers2() {
    // Start fresh: copy initial base config to second
    dimerPartner2 = dimerPartnerInit;
    totalSteps2 = 0;
    flipCount2 = 0;
}

EMSCRIPTEN_KEEPALIVE
void clearDimers2() {
    dimerPartner2.clear();
    totalSteps2 = 0;
    flipCount2 = 0;
}

EMSCRIPTEN_KEEPALIVE
const char* exportDimers2() {
    static std::string result;
    result.clear();

    std::unordered_set<long long> exported;

    for (size_t i = 0; i < vertices.size(); i++) {
        int partner = dimerPartner2[i];
        if (partner > (int)i) {
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

// ============================================================================
// LOOP DETECTION FOR DOUBLE DIMER MODEL
// ============================================================================

// Build loops from the two dimer configurations and populate distinctCycles
void buildLoops() {
    // Build edge lists from current configurations
    loopDimers0.clear();
    loopDimers1.clear();
    distinctCycles.clear();
    distinctCycleIndices.clear();

    std::unordered_set<long long> seen0;
    for (size_t i = 0; i < vertices.size(); i++) {
        int p = dimerPartner[i];
        if (p > (int)i) {
            long long ek = loopEdgeKey(vertices[i].n, vertices[i].j, vertices[p].n, vertices[p].j);
            if (seen0.find(ek) == seen0.end()) {
                seen0.insert(ek);
                loopDimers0.push_back({vertices[i].n, vertices[i].j, vertices[p].n, vertices[p].j});
            }
        }
    }

    std::unordered_set<long long> seen1;
    for (size_t i = 0; i < vertices.size(); i++) {
        int p = dimerPartner2[i];
        if (p > (int)i) {
            long long ek = loopEdgeKey(vertices[i].n, vertices[i].j, vertices[p].n, vertices[p].j);
            if (seen1.find(ek) == seen1.end()) {
                seen1.insert(ek);
                loopDimers1.push_back({vertices[i].n, vertices[i].j, vertices[p].n, vertices[p].j});
            }
        }
    }

    size_t totalEdges = loopDimers0.size() + loopDimers1.size();
    loopSizes.assign(totalEdges, 0);

    // Build edge map for sample 1 (for double dimer detection)
    std::unordered_map<long long, size_t> edge1Map;
    for (size_t i = 0; i < loopDimers1.size(); i++) {
        auto& d = loopDimers1[i];
        edge1Map[loopEdgeKey(d[0], d[1], d[2], d[3])] = i;
    }

    // Build adjacency: vertex -> list of {edgeIdx, sample, otherVertex}
    struct AdjEntry { size_t edgeIdx; int sample; long long otherVert; };
    std::unordered_map<long long, std::vector<AdjEntry>> adj;

    auto addEdge = [&](int n1, int j1, int n2, int j2, size_t idx, int sample) {
        long long v1 = vertexKey(n1, j1);
        long long v2 = vertexKey(n2, j2);
        adj[v1].push_back({idx, sample, v2});
        adj[v2].push_back({idx, sample, v1});
    };

    for (size_t i = 0; i < loopDimers0.size(); i++) {
        auto& d = loopDimers0[i];
        addEdge(d[0], d[1], d[2], d[3], i, 0);
    }
    for (size_t i = 0; i < loopDimers1.size(); i++) {
        auto& d = loopDimers1[i];
        addEdge(d[0], d[1], d[2], d[3], loopDimers0.size() + i, 1);
    }

    // Mark double dimers as size 2
    for (size_t i = 0; i < loopDimers0.size(); i++) {
        auto& d = loopDimers0[i];
        long long ek = loopEdgeKey(d[0], d[1], d[2], d[3]);
        auto it = edge1Map.find(ek);
        if (it != edge1Map.end()) {
            loopSizes[i] = 2;
            loopSizes[loopDimers0.size() + it->second] = 2;
        }
    }

    // Trace alternating cycles
    std::vector<bool> visited(totalEdges, false);
    for (size_t i = 0; i < totalEdges; i++) {
        if (loopSizes[i] == 2) visited[i] = true;
    }

    for (size_t startIdx = 0; startIdx < loopDimers0.size(); startIdx++) {
        if (visited[startIdx]) continue;

        std::vector<size_t> cycleEdgeIndices;
        std::vector<std::array<int, 4>> cycleEdges;
        cycleEdgeIndices.push_back(startIdx);
        cycleEdges.push_back(loopDimers0[startIdx]);
        visited[startIdx] = true;

        auto& sd = loopDimers0[startIdx];
        long long startV1 = vertexKey(sd[0], sd[1]);
        long long startV2 = vertexKey(sd[2], sd[3]);
        long long currentV = startV2;
        int lastSample = 0;

        int maxIter = 10000;
        while (maxIter-- > 0) {
            int nextSample = 1 - lastSample;
            bool found = false;

            for (auto& ae : adj[currentV]) {
                if (ae.sample == nextSample && !visited[ae.edgeIdx]) {
                    cycleEdgeIndices.push_back(ae.edgeIdx);
                    visited[ae.edgeIdx] = true;
                    // Get the actual edge coordinates
                    if (ae.edgeIdx < loopDimers0.size()) {
                        cycleEdges.push_back(loopDimers0[ae.edgeIdx]);
                    } else {
                        cycleEdges.push_back(loopDimers1[ae.edgeIdx - loopDimers0.size()]);
                    }
                    currentV = ae.otherVert;
                    lastSample = nextSample;
                    found = true;
                    break;
                }
            }

            if (!found || currentV == startV1) break;
        }

        // Only add properly closed cycles (must return to startV1)
        bool isClosed = (currentV == startV1);
        int cycleSize = (int)cycleEdgeIndices.size();

        for (size_t idx : cycleEdgeIndices) {
            loopSizes[idx] = isClosed ? cycleSize : 0;
        }

        // Store the distinct cycle only if closed and not trivial
        if (isClosed && cycleSize > 2) {
            distinctCycles.push_back(cycleEdges);
            distinctCycleIndices.push_back(cycleEdgeIndices);
        }
    }
}

// Check if a point (n, j) is inside a loop using ray casting
// Casts a horizontal ray to the right (n -> +infinity) at fixed j
// Works with fractional coordinates (triangle centers)
bool isPointInsideLoop(double n, double j, const std::vector<std::array<int, 4>>& loop) {
    bool inside = false;

    for (const auto& edge : loop) {
        double n1 = edge[0], j1 = edge[1];
        double n2 = edge[2], j2 = edge[3];

        // Skip horizontal edges (they don't cross horizontal rays)
        if (j1 == j2) continue;

        // Ensure j1 < j2 for consistent handling
        if (j1 > j2) {
            std::swap(n1, n2);
            std::swap(j1, j2);
        }

        // Check if the ray at height j crosses this edge
        // Using half-open interval [j1, j2) to avoid double-counting vertices
        if (j >= j1 && j < j2) {
            // Calculate the n-coordinate of intersection
            // Linear interpolation: n_intersect = n1 + (j - j1) * (n2 - n1) / (j2 - j1)
            double n_intersect = n1 + (j - j1) * (n2 - n1) / (j2 - j1);

            // Ray goes to the right, so count intersections where n_intersect > n
            if (n_intersect > n) {
                inside = !inside;
            }
        }
    }

    return inside;
}

EMSCRIPTEN_KEEPALIVE
const char* filterLoopsBySize(int minSize) {
    static std::string result;

    // Use the refactored buildLoops() function
    buildLoops();

    // Build result JSON with filtered edge indices
    result = "{\"indices0\":[";
    bool first = true;
    for (size_t i = 0; i < loopDimers0.size(); i++) {
        if (loopSizes[i] >= minSize) {
            if (!first) result += ",";
            first = false;
            result += std::to_string(i);
        }
    }
    result += "],\"indices1\":[";
    first = true;
    for (size_t i = 0; i < loopDimers1.size(); i++) {
        if (loopSizes[loopDimers0.size() + i] >= minSize) {
            if (!first) result += ",";
            first = false;
            result += std::to_string(i);
        }
    }
    result += "]}";

    return result.c_str();
}

// ============================================================================
// TOPOLOGICAL SEPARATION STATS
// ============================================================================

// Set the two probe points for separation calculation (triangle centers)
EMSCRIPTEN_KEEPALIVE
void setProbePoints(double n1, double j1, double n2, double j2) {
    probeN1 = n1; probeJ1 = j1;
    probeN2 = n2; probeJ2 = j2;
}

// Get the number of loops separating the two probe points
// Returns -1 if probe points are not set
EMSCRIPTEN_KEEPALIVE
int getSeparationCount() {
    if (probeN1 < -9000 || probeN2 < -9000) return -1;
    if (dimerPartner2.empty()) return -1;  // Double dimer not active

    // Build loops from current configurations
    buildLoops();

    int separationCount = 0;

    // For each distinct cycle, check if it separates the two probe points
    for (const auto& cycle : distinctCycles) {
        bool in1 = isPointInsideLoop(probeN1, probeJ1, cycle);
        bool in2 = isPointInsideLoop(probeN2, probeJ2, cycle);

        // The loop separates the points if exactly one is inside
        if (in1 != in2) {
            separationCount++;
        }
    }

    return separationCount;
}

// Get edge indices for loops that separate the two probe points
// Returns JSON: {"indices0":[...],"indices1":[...]}
EMSCRIPTEN_KEEPALIVE
const char* getSeparatingLoopEdges() {
    static std::string result;

    if (probeN1 < -9000 || probeN2 < -9000) {
        result = "{\"indices0\":[],\"indices1\":[]}";
        return result.c_str();
    }
    if (dimerPartner2.empty()) {
        result = "{\"indices0\":[],\"indices1\":[]}";
        return result.c_str();
    }

    buildLoops();

    std::vector<size_t> sepIndices0, sepIndices1;
    size_t n0 = loopDimers0.size();

    for (size_t i = 0; i < distinctCycles.size(); i++) {
        const auto& cycle = distinctCycles[i];
        bool in1 = isPointInsideLoop(probeN1, probeJ1, cycle);
        bool in2 = isPointInsideLoop(probeN2, probeJ2, cycle);

        if (in1 != in2) {
            // This loop separates - collect its edge indices
            for (size_t idx : distinctCycleIndices[i]) {
                if (idx < n0) {
                    sepIndices0.push_back(idx);
                } else {
                    sepIndices1.push_back(idx - n0);
                }
            }
        }
    }

    // Build JSON result
    result = "{\"indices0\":[";
    for (size_t i = 0; i < sepIndices0.size(); i++) {
        if (i > 0) result += ",";
        result += std::to_string(sepIndices0[i]);
    }
    result += "],\"indices1\":[";
    for (size_t i = 0; i < sepIndices1.size(); i++) {
        if (i > 0) result += ",";
        result += std::to_string(sepIndices1[i]);
    }
    result += "]}";

    return result.c_str();
}

// Debug: get detailed info about probe points and loops
EMSCRIPTEN_KEEPALIVE
const char* getProbeDebugInfo() {
    static std::string result;
    result.clear();

    if (probeN1 < -9000 || probeN2 < -9000) {
        result = "Probes not set";
        return result.c_str();
    }

    buildLoops();

    result = "A:(" + std::to_string(probeN1) + "," + std::to_string(probeJ1) + ") ";
    result += "B:(" + std::to_string(probeN2) + "," + std::to_string(probeJ2) + ")\n";
    result += "Loops: " + std::to_string(distinctCycles.size()) + "\n";

    for (size_t i = 0; i < distinctCycles.size(); i++) {
        const auto& cycle = distinctCycles[i];
        bool in1 = isPointInsideLoop(probeN1, probeJ1, cycle);
        bool in2 = isPointInsideLoop(probeN2, probeJ2, cycle);
        result += "Loop " + std::to_string(i) + " (edges:" + std::to_string(cycle.size()) + "): ";
        result += "A=" + std::string(in1 ? "IN" : "OUT") + " B=" + std::string(in2 ? "IN" : "OUT");
        if (in1 != in2) result += " [SEPARATES]";
        result += "\n";
    }

    return result.c_str();
}

// Get number of distinct loops (for debugging/display)
EMSCRIPTEN_KEEPALIVE
int getLoopCount() {
    return (int)distinctCycles.size();
}

// ============================================================================
// FRACTAL DIMENSION COMPUTATION
// ============================================================================

// Convert lattice coordinates to Cartesian for distance calculations
inline void latticeToCartesian(double n, double j, double& x, double& y) {
    x = n + 0.5 * j;
    y = j * 0.8660254037844386;  // sqrt(3)/2
}

// Compute squared distance from point (px, py) to line segment (x1,y1)-(x2,y2)
inline double pointToSegmentDistSq(double px, double py, double x1, double y1, double x2, double y2) {
    double dx = x2 - x1;
    double dy = y2 - y1;
    double lenSq = dx * dx + dy * dy;

    if (lenSq < 1e-10) {
        // Degenerate segment
        return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    }

    // Project point onto line, clamp to segment
    double t = std::max(0.0, std::min(1.0, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    double projX = x1 + t * dx;
    double projY = y1 + t * dy;

    return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

// Find the index of the loop nearest to a given point (finds loop passing through/near the point)
// Returns -1 if no loops exist
EMSCRIPTEN_KEEPALIVE
int findLoopContainingPoint(double n, double j) {
    if (dimerPartner2.empty()) return -1;  // Double dimer not active

    buildLoops();

    if (distinctCycles.empty()) return -1;

    // Convert clicked point to Cartesian
    double px, py;
    latticeToCartesian(n, j, px, py);

    // Find the loop with the closest edge to the clicked point
    int bestIdx = -1;
    double bestDistSq = 1e30;

    for (size_t i = 0; i < distinctCycles.size(); i++) {
        const auto& loop = distinctCycles[i];

        for (const auto& edge : loop) {
            double x1, y1, x2, y2;
            latticeToCartesian(edge[0], edge[1], x1, y1);
            latticeToCartesian(edge[2], edge[3], x2, y2);

            double distSq = pointToSegmentDistSq(px, py, x1, y1, x2, y2);

            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestIdx = (int)i;
            }
        }
    }

    return bestIdx;
}

// Compute fractal dimension of a loop using box counting
// Returns the fractal dimension, or -1 if invalid
EMSCRIPTEN_KEEPALIVE
double computeLoopFractalDimension(int loopIndex) {
    if (loopIndex < 0 || loopIndex >= (int)distinctCycles.size()) return -1.0;

    const auto& loop = distinctCycles[loopIndex];
    if (loop.size() < 4) return -1.0;  // Too small for meaningful dimension

    // Collect all vertices in the loop (converted to Cartesian)
    std::vector<std::pair<double, double>> cartPoints;
    for (const auto& edge : loop) {
        double x1, y1, x2, y2;
        latticeToCartesian(edge[0], edge[1], x1, y1);
        latticeToCartesian(edge[2], edge[3], x2, y2);
        cartPoints.push_back({x1, y1});
        cartPoints.push_back({x2, y2});
    }

    // Find bounding box
    double minX = cartPoints[0].first, maxX = cartPoints[0].first;
    double minY = cartPoints[0].second, maxY = cartPoints[0].second;
    for (const auto& p : cartPoints) {
        minX = std::min(minX, p.first);
        maxX = std::max(maxX, p.first);
        minY = std::min(minY, p.second);
        maxY = std::max(maxY, p.second);
    }

    double width = maxX - minX;
    double height = maxY - minY;
    double maxDim = std::max(width, height);

    if (maxDim < 1e-6) return -1.0;

    // Box counting at multiple scales
    // We'll use 6 different box sizes from maxDim/2 down to maxDim/64
    std::vector<double> logEpsilon;
    std::vector<double> logN;

    for (int scale = 1; scale <= 6; scale++) {
        double boxSize = maxDim / (1 << scale);  // maxDim/2, maxDim/4, ..., maxDim/64
        if (boxSize < 0.1) break;  // Don't go too small

        // Count boxes that contain at least one edge
        std::unordered_set<long long> occupiedBoxes;

        // For each edge, mark all boxes it passes through
        for (const auto& edge : loop) {
            double x1, y1, x2, y2;
            latticeToCartesian(edge[0], edge[1], x1, y1);
            latticeToCartesian(edge[2], edge[3], x2, y2);

            // Sample points along the edge
            int numSamples = std::max(2, (int)(std::sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1)) / boxSize * 2));
            for (int s = 0; s <= numSamples; s++) {
                double t = (double)s / numSamples;
                double x = x1 + t * (x2 - x1);
                double y = y1 + t * (y2 - y1);

                int bx = (int)std::floor((x - minX) / boxSize);
                int by = (int)std::floor((y - minY) / boxSize);
                long long boxKey = ((long long)bx << 20) | by;
                occupiedBoxes.insert(boxKey);
            }
        }

        if (occupiedBoxes.size() > 1) {
            logEpsilon.push_back(std::log(boxSize));
            logN.push_back(std::log((double)occupiedBoxes.size()));
        }
    }

    // Linear regression: log(N) = -D * log(epsilon) + c
    // D = -slope of log(N) vs log(epsilon)
    if (logEpsilon.size() < 3) return -1.0;

    int n = (int)logEpsilon.size();
    double sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    for (int i = 0; i < n; i++) {
        sumX += logEpsilon[i];
        sumY += logN[i];
        sumXX += logEpsilon[i] * logEpsilon[i];
        sumXY += logEpsilon[i] * logN[i];
    }

    double slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Fractal dimension is the negative of the slope
    return -slope;
}

// ============================================================================
// FRACTAL DIMENSION AVERAGING (fixed probe point over time)
// ============================================================================

// Set the probe point for fractal averaging and reset samples
EMSCRIPTEN_KEEPALIVE
void startFractalAveraging(double n, double j) {
    fractalProbeN = n;
    fractalProbeJ = j;
    fractalSamples.clear();
}

// Sample fractal dimension of the loop through the fixed probe point
// Call this periodically during dynamics. Returns the sampled dimension, or -1 if invalid.
EMSCRIPTEN_KEEPALIVE
double sampleFractalDimension() {
    if (fractalProbeN < -9000) return -1.0;
    if (dimerPartner2.empty()) return -1.0;

    // Find the loop nearest to the probe point
    int loopIdx = findLoopContainingPoint(fractalProbeN, fractalProbeJ);
    if (loopIdx < 0) return -1.0;

    // Compute its fractal dimension
    double dim = computeLoopFractalDimension(loopIdx);
    if (dim > 0) {
        fractalSamples.push_back(dim);
    }
    return dim;
}

// Get the averaged fractal dimension and sample count
// Returns JSON: {"average": X, "count": N, "stddev": S}
EMSCRIPTEN_KEEPALIVE
const char* getFractalAverage() {
    static std::string result;

    if (fractalSamples.empty()) {
        result = "{\"average\":-1,\"count\":0,\"stddev\":0}";
        return result.c_str();
    }

    // Compute mean
    double sum = 0;
    for (double d : fractalSamples) sum += d;
    double mean = sum / fractalSamples.size();

    // Compute stddev
    double sumSq = 0;
    for (double d : fractalSamples) sumSq += (d - mean) * (d - mean);
    double stddev = fractalSamples.size() > 1 ? std::sqrt(sumSq / (fractalSamples.size() - 1)) : 0;

    result = "{\"average\":" + std::to_string(mean) +
             ",\"count\":" + std::to_string(fractalSamples.size()) +
             ",\"stddev\":" + std::to_string(stddev) + "}";
    return result.c_str();
}

// Reset fractal averaging (keep probe point, clear samples)
EMSCRIPTEN_KEEPALIVE
void resetFractalSamples() {
    fractalSamples.clear();
}

// Get individual samples as JSON array (for histogram/analysis)
EMSCRIPTEN_KEEPALIVE
const char* getFractalSamples() {
    static std::string result;
    result = "[";
    for (size_t i = 0; i < fractalSamples.size(); i++) {
        if (i > 0) result += ",";
        result += std::to_string(fractalSamples[i]);
    }
    result += "]";
    return result.c_str();
}

// Get detailed info about a specific loop
EMSCRIPTEN_KEEPALIVE
const char* getLoopInfo(int loopIndex) {
    static std::string result;
    result.clear();

    if (loopIndex < 0 || loopIndex >= (int)distinctCycles.size()) {
        result = "{\"error\":\"Invalid loop index\"}";
        return result.c_str();
    }

    const auto& loop = distinctCycles[loopIndex];

    // Compute diameter (max distance between any two vertices)
    std::vector<std::pair<double, double>> cartPoints;
    for (const auto& edge : loop) {
        double x1, y1, x2, y2;
        latticeToCartesian(edge[0], edge[1], x1, y1);
        latticeToCartesian(edge[2], edge[3], x2, y2);
        cartPoints.push_back({x1, y1});
    }

    double maxDist = 0;
    for (size_t i = 0; i < cartPoints.size(); i++) {
        for (size_t j = i + 1; j < cartPoints.size(); j++) {
            double dx = cartPoints[i].first - cartPoints[j].first;
            double dy = cartPoints[i].second - cartPoints[j].second;
            double dist = std::sqrt(dx * dx + dy * dy);
            maxDist = std::max(maxDist, dist);
        }
    }

    // Compute center of mass
    double cx = 0, cy = 0;
    for (const auto& p : cartPoints) {
        cx += p.first;
        cy += p.second;
    }
    cx /= cartPoints.size();
    cy /= cartPoints.size();

    // Compute fractal dimension
    double fractalDim = computeLoopFractalDimension(loopIndex);

    // Build JSON result
    result = "{";
    result += "\"index\":" + std::to_string(loopIndex) + ",";
    result += "\"edges\":" + std::to_string(loop.size()) + ",";
    result += "\"diameter\":" + std::to_string(maxDist) + ",";
    result += "\"centerX\":" + std::to_string(cx) + ",";
    result += "\"centerY\":" + std::to_string(cy) + ",";
    result += "\"fractalDim\":" + std::to_string(fractalDim);
    result += "}";

    return result.c_str();
}

// Get edge indices for a specific loop
EMSCRIPTEN_KEEPALIVE
const char* getLoopEdgeIndices(int loopIndex) {
    static std::string result;

    if (loopIndex < 0 || loopIndex >= (int)distinctCycleIndices.size()) {
        result = "{\"indices0\":[],\"indices1\":[]}";
        return result.c_str();
    }

    const auto& indices = distinctCycleIndices[loopIndex];
    size_t n0 = loopDimers0.size();

    std::vector<size_t> idx0, idx1;
    for (size_t idx : indices) {
        if (idx < n0) {
            idx0.push_back(idx);
        } else {
            idx1.push_back(idx - n0);
        }
    }

    result = "{\"indices0\":[";
    for (size_t i = 0; i < idx0.size(); i++) {
        if (i > 0) result += ",";
        result += std::to_string(idx0[i]);
    }
    result += "],\"indices1\":[";
    for (size_t i = 0; i < idx1.size(); i++) {
        if (i > 0) result += ",";
        result += std::to_string(idx1[i]);
    }
    result += "]}";

    return result.c_str();
}

} // extern "C"
