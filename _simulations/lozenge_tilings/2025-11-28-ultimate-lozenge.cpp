/*
emcc 2025-11-28-ultimate-lozenge.cpp -o 2025-11-28-ultimate-lozenge.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initFromTriangles','_performGlauberSteps','_exportDimers','_getTotalSteps','_getFlipCount','_getAcceptRate','_setQBias','_getQBias','_setPeriodicQBias','_setPeriodicK','_setUsePeriodicWeights','_setUseRandomSweeps','_getUseRandomSweeps','_freeString','_runCFTP','_initCFTP','_stepCFTP','_finalizeCFTP','_exportCFTPMaxDimers','_exportCFTPMinDimers','_repairRegion','_setDimers','_getHoleCount','_getAllHolesInfo','_adjustHoleWindingExport','_recomputeHoleInfo','_getVerticalCutInfo','_malloc','_free']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','setValue','getValue']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=32MB \
  -s STACK_SIZE=1MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math
mv 2025-11-28-ultimate-lozenge.js ../../js/

Ultimate Lozenge Tiling Sampler
- Arbitrary topology support (holes, disconnected regions)
- Dinic's Max Flow algorithm for robust perfect matching initialization
- User-drawn triangular lattice regions
- Glauber dynamics and CFTP for sampling
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
#include <chrono>
#include <set>
#include <map>

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

// Lemire's fast bounded random - avoids costly modulo operation
inline uint32_t fastRandomRange(uint32_t range) {
    uint64_t random64 = xorshift64();
    // Calculates (random64 * range) >> 64 using 128-bit multiplication
    uint64_t hi = (uint64_t)(((unsigned __int128)random64 * range) >> 64);
    return (uint32_t)hi;
}

inline int getRandomInt(int n) {
    return (int)fastRandomRange((uint32_t)n);
}

// Triangle geometry constants
const double slope = 1.0 / std::sqrt(3.0);
const double deltaC = 2.0 / std::sqrt(3.0);

// Vertex structure
struct Vertex {
    double x, y;
    bool operator<(const Vertex& o) const {
        if (x != o.x) return x < o.x;
        return y < o.y;
    }
    bool operator==(const Vertex& o) const {
        return std::abs(x - o.x) < 1e-9 && std::abs(y - o.y) < 1e-9;
    }
};

// Get vertex coordinates
inline Vertex getVertex(int n, int j) {
    return { static_cast<double>(n), slope * n + j * deltaC };
}

// Triangle centroid for right-facing (BLACK) triangle
// R(n,j): vertices (n,j), (n,j-1), (n+1,j-1)
inline Vertex getRightTriangleCentroid(int n, int j) {
    Vertex v1 = getVertex(n, j);
    Vertex v2 = getVertex(n, j - 1);
    Vertex v3 = getVertex(n + 1, j - 1);
    return { (v1.x + v2.x + v3.x) / 3.0, (v1.y + v2.y + v3.y) / 3.0 };
}

// Triangle centroid for left-facing (WHITE) triangle
// L(n,j): vertices (n,j), (n+1,j), (n+1,j-1)
inline Vertex getLeftTriangleCentroid(int n, int j) {
    Vertex v1 = getVertex(n, j);
    Vertex v2 = getVertex(n + 1, j);
    Vertex v3 = getVertex(n + 1, j - 1);
    return { (v1.x + v2.x + v3.x) / 3.0, (v1.y + v2.y + v3.y) / 3.0 };
}

// 6 directions on triangular lattice
const int directions_dn[6] = { 1,  1,  0, -1, -1,  0 };
const int directions_dj[6] = { -1, 0,  1,  1,  0, -1 };

// Global state
double qBias = 1.0;
// Default 2x2 periodic weights
double qBias_periodic[5][5] = {
    {1.0, 100.0, 1.0, 1.0, 1.0},
    {0.003333, 3.0, 1.0, 1.0, 1.0},
    {1.0, 1.0, 1.0, 1.0, 1.0},
    {1.0, 1.0, 1.0, 1.0, 1.0},
    {1.0, 1.0, 1.0, 1.0, 1.0}
};
int periodicK = 2; // Default to Period 2
bool usePeriodicWeights = false; // Disabled by default
bool useRandomSweeps = false; // Default: systematic sweeps (faster, better cache locality)

inline double getQAtPosition(int n, int j) {
    if (!usePeriodicWeights) return qBias;
    int ni = ((n % periodicK) + periodicK) % periodicK;  // Handle negative n
    int ji = ((j % periodicK) + periodicK) % periodicK;  // Handle negative j
    return qBias_periodic[ni][ji];
}

// Dense grid state for O(1) dimer lookups
std::vector<int8_t> dimerGrid;
int gridMinN, gridMaxN, gridMinJ, gridMaxJ;
size_t gridStrideJ;

inline size_t getGridIdx(int n, int j) {
    return static_cast<size_t>(n - gridMinN) * gridStrideJ + static_cast<size_t>(j - gridMinJ);
}

// Get white triangle coords from black triangle and dimer type
inline void getWhiteFromType(int blackN, int blackJ, int type, int& whiteN, int& whiteJ) {
    switch (type) {
        case 0: whiteN = blackN; whiteJ = blackJ; break;      // diagonal
        case 1: whiteN = blackN; whiteJ = blackJ - 1; break;  // bottom
        case 2: whiteN = blackN - 1; whiteJ = blackJ; break;  // left vertical
        default: whiteN = blackN; whiteJ = blackJ; break;
    }
}

// Triangle storage
struct Triangle {
    int n, j;
    double cx, cy;
};

std::vector<Triangle> blackTriangles;
std::vector<Triangle> whiteTriangles;
std::unordered_map<long long, int> blackMap;
std::unordered_map<long long, int> whiteMap;

// Triangular vertices inside region (for Glauber dynamics)
struct TriVertex {
    int n, j;
};
std::vector<TriVertex> triangularVertices;

// ============================================================================
// OPTIMIZATION: Pre-computed caches for fast Glauber dynamics
// ============================================================================

// Cached grid indices for the 6 hex edges around each vertex
struct CachedHexIndices {
    int32_t edges[6];  // Indices into dimerGrid (-1 = sentinel/out of bounds)
    int8_t types[6];   // Expected dimer types for each edge
};
std::vector<CachedHexIndices> cachedHexIndices;

// Cached acceptance probabilities for each vertex
struct CachedProbabilities {
    float probUp;    // q / (1+q) - probability for volume increase
    float probDown;  // 1 / (1+q) - probability for volume decrease
};
std::vector<CachedProbabilities> cachedProbs;

// Sentinel index for out-of-bounds lookups
int32_t sentinelIdx = -1;

// Dimer representation
struct Dimer {
    int blackN, blackJ;
    int whiteN, whiteJ;
    int type;
};

std::vector<Dimer> currentDimers;

// ============================================================================
// HOLE TRACKING AND WINDING CONSTRAINTS
// ============================================================================

struct HoleInfo {
    int boundaryIdx;        // Index into computedBoundaries
    double centroidX, centroidY;
    int currentWinding;
    int minWinding, maxWinding;
    int lastAttemptedTarget;  // For hybrid shuffle: shuffle when re-trying same target
};

struct CutEdge {
    int blackN, blackJ;
    int whiteN, whiteJ;
    int type;
};

std::vector<HoleInfo> holes;
std::vector<CutEdge> holeCutEdges;  // Cut edges for hole 0
int outerBoundaryIdx = -1;

// Statistics
long long totalSteps = 0;
long long flipCount = 0;

// Key encoding
inline long long makeKey(int n, int j) {
    return (static_cast<long long>(n + 10000) << 20) | (j + 10000);
}

// Get dimer type from relative position
int getDimerType(int blackN, int blackJ, int whiteN, int whiteJ) {
    int dn = whiteN - blackN;
    int dj = whiteJ - blackJ;
    if (dn == 0 && dj == 0) return 0;       // diagonal
    else if (dn == 0 && dj == -1) return 1; // bottom
    else if (dn == -1 && dj == 0) return 2; // left vertical
    return 0;
}

// ============================================================================
// DINIC'S ALGORITHM FOR MAXIMUM BIPARTITE MATCHING
// ============================================================================

struct FlowEdge {
    int to, cap, flow, rev;
};

std::vector<std::vector<FlowEdge>> flowAdj;
std::vector<int> level;
std::vector<int> ptr;

void add_flow_edge(int from, int to, int cap) {
    flowAdj[from].push_back({to, cap, 0, (int)flowAdj[to].size()});
    flowAdj[to].push_back({from, 0, 0, (int)flowAdj[from].size() - 1});
}

bool bfs_flow(int s, int t) {
    std::fill(level.begin(), level.end(), -1);
    level[s] = 0;
    std::queue<int> q;
    q.push(s);
    while (!q.empty()) {
        int v = q.front(); q.pop();
        for (const auto& edge : flowAdj[v]) {
            if (edge.cap - edge.flow > 0 && level[edge.to] == -1) {
                level[edge.to] = level[v] + 1;
                q.push(edge.to);
            }
        }
    }
    return level[t] != -1;
}

int dfs_flow(int v, int t, int pushed) {
    if (pushed == 0) return 0;
    if (v == t) return pushed;
    for (int& cid = ptr[v]; cid < (int)flowAdj[v].size(); ++cid) {
        auto& edge = flowAdj[v][cid];
        int tr = edge.to;
        if (level[v] + 1 != level[tr] || edge.cap - edge.flow == 0) continue;
        int push = dfs_flow(tr, t, std::min(pushed, edge.cap - edge.flow));
        if (push == 0) continue;
        edge.flow += push;
        flowAdj[tr][edge.rev].flow -= push;
        return push;
    }
    return 0;
}

int dinic(int s, int t) {
    int flow = 0;
    while (bfs_flow(s, t)) {
        std::fill(ptr.begin(), ptr.end(), 0);
        while (int pushed = dfs_flow(s, t, 1000000000)) {
            flow += pushed;
        }
    }
    return flow;
}

// ============================================================================
// BOUNDARY DETECTION
// ============================================================================

// Edge represented as ordered pair of vertices
struct Edge {
    Vertex v1, v2;
    bool operator<(const Edge& o) const {
        if (v1 < o.v1) return true;
        if (o.v1 < v1) return false;
        return v2 < o.v2;
    }
};

Edge makeOrderedEdge(Vertex a, Vertex b) {
    if (b < a) std::swap(a, b);
    return {a, b};
}

std::vector<std::vector<Vertex>> computedBoundaries;

void computeBoundary() {
    computedBoundaries.clear();

    // Collect all triangle edges with count
    std::map<Edge, int> edgeCount;

    // Black triangles R(n,j): vertices (n,j), (n,j-1), (n+1,j-1)
    for (const auto& bt : blackTriangles) {
        Vertex v1 = getVertex(bt.n, bt.j);
        Vertex v2 = getVertex(bt.n, bt.j - 1);
        Vertex v3 = getVertex(bt.n + 1, bt.j - 1);
        edgeCount[makeOrderedEdge(v1, v2)]++;
        edgeCount[makeOrderedEdge(v2, v3)]++;
        edgeCount[makeOrderedEdge(v3, v1)]++;
    }

    // White triangles L(n,j): vertices (n,j), (n+1,j), (n+1,j-1)
    for (const auto& wt : whiteTriangles) {
        Vertex v1 = getVertex(wt.n, wt.j);
        Vertex v2 = getVertex(wt.n + 1, wt.j);
        Vertex v3 = getVertex(wt.n + 1, wt.j - 1);
        edgeCount[makeOrderedEdge(v1, v2)]++;
        edgeCount[makeOrderedEdge(v2, v3)]++;
        edgeCount[makeOrderedEdge(v3, v1)]++;
    }

    // Boundary edges appear exactly once - store as directed edges
    // Use edge key for tracking which edges have been used
    auto toIntPair = [](const Vertex& v) {
        return std::make_pair((int)std::round(v.x * 1000), (int)std::round(v.y * 1000));
    };

    auto intToVertex = [](const std::pair<int,int>& p) {
        return Vertex{p.first / 1000.0, p.second / 1000.0};
    };

    using IntPair = std::pair<int,int>;
    using EdgeKey = std::pair<IntPair, IntPair>;

    // Build adjacency and track edges
    std::map<IntPair, std::vector<IntPair>> adj;
    std::set<EdgeKey> unusedEdges;

    for (const auto& [edge, count] : edgeCount) {
        if (count == 1) {
            auto p1 = toIntPair(edge.v1);
            auto p2 = toIntPair(edge.v2);
            adj[p1].push_back(p2);
            adj[p2].push_back(p1);
            // Store edge in canonical order
            if (p1 < p2) {
                unusedEdges.insert({p1, p2});
            } else {
                unusedEdges.insert({p2, p1});
            }
        }
    }

    if (adj.empty()) return;

    // Trace loops by following edges until we return to start
    while (!unusedEdges.empty()) {
        // Pick any unused edge to start
        auto startEdge = *unusedEdges.begin();
        IntPair start = startEdge.first;
        IntPair current = start;
        IntPair prev = {-999999, -999999}; // Invalid marker

        std::vector<Vertex> currentBoundary;
        currentBoundary.push_back(intToVertex(current));

        bool loopComplete = false;
        while (!loopComplete) {
            // Find next vertex - pick any neighbor that forms an unused edge
            IntPair next = {-999999, -999999};
            for (const auto& neighbor : adj[current]) {
                if (neighbor == prev) continue; // Don't go back immediately

                EdgeKey edgeKey = (current < neighbor) ? EdgeKey{current, neighbor} : EdgeKey{neighbor, current};
                if (unusedEdges.find(edgeKey) != unusedEdges.end()) {
                    next = neighbor;
                    unusedEdges.erase(edgeKey);
                    break;
                }
            }

            if (next.first == -999999) {
                // No more edges to follow
                break;
            }

            if (next == start && currentBoundary.size() >= 3) {
                // Loop complete
                loopComplete = true;
            } else {
                currentBoundary.push_back(intToVertex(next));
                prev = current;
                current = next;
            }
        }

        if (currentBoundary.size() >= 3) {
            computedBoundaries.push_back(std::move(currentBoundary));
        }
    }
}

// ============================================================================
// HOLE DETECTION AND WINDING CONSTRAINT FUNCTIONS
// ============================================================================

// Compute signed area of a boundary (positive = CCW, negative = CW)
double computeSignedArea(const std::vector<Vertex>& boundary) {
    double area = 0;
    for (size_t i = 0; i < boundary.size(); i++) {
        size_t j = (i + 1) % boundary.size();
        area += boundary[i].x * boundary[j].y;
        area -= boundary[j].x * boundary[i].y;
    }
    return area / 2.0;
}

// Identify holes from computed boundaries
// The outer boundary has the largest absolute area
void identifyHolesFromBoundaries() {
    holes.clear();
    outerBoundaryIdx = -1;

    if (computedBoundaries.empty()) return;

    // Find outer boundary (largest absolute area)
    double maxArea = -1;
    for (size_t i = 0; i < computedBoundaries.size(); i++) {
        double area = std::abs(computeSignedArea(computedBoundaries[i]));
        if (area > maxArea) {
            maxArea = area;
            outerBoundaryIdx = (int)i;
        }
    }

    // All other boundaries are holes
    for (size_t i = 0; i < computedBoundaries.size(); i++) {
        if ((int)i == outerBoundaryIdx) continue;

        HoleInfo hole;
        hole.boundaryIdx = (int)i;

        // Compute centroid
        double cx = 0, cy = 0;
        for (const auto& v : computedBoundaries[i]) {
            cx += v.x;
            cy += v.y;
        }
        hole.centroidX = cx / computedBoundaries[i].size();
        hole.centroidY = cy / computedBoundaries[i].size();

        hole.currentWinding = 0;
        hole.minWinding = 0;
        hole.maxWinding = 0;
        hole.lastAttemptedTarget = INT_MIN;  // Sentinel for first attempt

        holes.push_back(hole);
    }
}

// Get the shared edge coordinates for a dimer
void getDimerSharedEdge(int blackN, int blackJ, int type, double& x1, double& y1, double& x2, double& y2) {
    // Black triangle R(n,j) vertices: (n,j), (n,j-1), (n+1,j-1)
    Vertex bv1 = getVertex(blackN, blackJ);
    Vertex bv2 = getVertex(blackN, blackJ - 1);
    Vertex bv3 = getVertex(blackN + 1, blackJ - 1);

    if (type == 0) {
        // Shared edge with White(bn, bj): edge (n,j)-(n+1,j-1)
        x1 = bv1.x; y1 = bv1.y;
        x2 = bv3.x; y2 = bv3.y;
    } else if (type == 1) {
        // Shared edge with White(bn, bj-1): edge (n,j-1)-(n+1,j-1)
        x1 = bv2.x; y1 = bv2.y;
        x2 = bv3.x; y2 = bv3.y;
    } else {
        // type == 2: Shared edge with White(bn-1, bj): edge (n,j)-(n,j-1)
        x1 = bv1.x; y1 = bv1.y;
        x2 = bv2.x; y2 = bv2.y;
    }
}

// Build a cut from hole to outer boundary
// Strategy: Use 32 rays in different directions and collect ALL dimer edges in region
void buildCutForHole(int holeIdx) {
    holeCutEdges.clear();

    if (holeIdx < 0 || holeIdx >= (int)holes.size()) return;
    if (outerBoundaryIdx < 0 || outerBoundaryIdx >= (int)computedBoundaries.size()) return;

    const HoleInfo& hole = holes[holeIdx];

    // Use a set to deduplicate edges found by multiple rays
    std::set<std::tuple<int,int,int,int,int>> foundEdges;  // (blackN, blackJ, whiteN, whiteJ, type)

    // Try 8 rays at different angles (every 45 degrees)
    for (int rayIdx = 0; rayIdx < 8; rayIdx++) {
        double angle = rayIdx * 3.14159265358979 / 4.0;  // 45 degrees apart
        double dx = std::cos(angle);
        double dy = std::sin(angle);

        // For each black triangle, check if any of its 3 possible dimer edges
        // intersects this ray from hole centroid
        for (const auto& bt : blackTriangles) {
            // Three possible dimer edges from this black triangle
            int neighbors[3][3] = {
                {bt.n, bt.j, 0},      // White(bn, bj), type 0
                {bt.n, bt.j - 1, 1},  // White(bn, bj-1), type 1
                {bt.n - 1, bt.j, 2}   // White(bn-1, bj), type 2
            };

            for (int k = 0; k < 3; k++) {
                int wn = neighbors[k][0];
                int wj = neighbors[k][1];
                int type = neighbors[k][2];

                // Check if this white triangle exists
                if (whiteMap.find(makeKey(wn, wj)) == whiteMap.end()) continue;

                // Get the shared edge coordinates
                double x1, y1, x2, y2;
                getDimerSharedEdge(bt.n, bt.j, type, x1, y1, x2, y2);

                // Check if ray from hole centroid intersects this edge segment
                double ex = x2 - x1;
                double ey = y2 - y1;

                // Solve intersection
                double det = dx * (-ey) - dy * (-ex);
                if (std::abs(det) < 1e-10) continue;  // Parallel

                double rx = x1 - hole.centroidX;
                double ry = y1 - hole.centroidY;

                double t = (rx * (-ey) - ry * (-ex)) / det;
                double s = (dx * ry - dy * rx) / det;

                // Check if intersection is valid: t > 0 (forward along ray), s in [0,1] (on segment)
                if (t > 0.01 && s >= 0 && s <= 1) {
                    foundEdges.insert(std::make_tuple(bt.n, bt.j, wn, wj, type));
                }
            }
        }
    }

    // Convert set to vector
    for (const auto& edge : foundEdges) {
        CutEdge ce;
        ce.blackN = std::get<0>(edge);
        ce.blackJ = std::get<1>(edge);
        ce.whiteN = std::get<2>(edge);
        ce.whiteJ = std::get<3>(edge);
        ce.type = std::get<4>(edge);
        holeCutEdges.push_back(ce);
    }
}

// Compute winding number for hole 0 using the cut
int computeWindingForHole(int holeIdx) {
    if (holeIdx != 0) return 0;
    if (holes.empty()) return 0;

    // Rebuild cut if needed
    if (holeCutEdges.empty()) {
        buildCutForHole(0);
    }

    int winding = 0;
    for (const auto& ce : holeCutEdges) {
        size_t gridIdx = getGridIdx(ce.blackN, ce.blackJ);
        if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == ce.type) {
            winding++;
        }
    }

    return winding;
}

// Compute all hole windings
void computeAllWindings() {
    for (size_t i = 0; i < holes.size(); i++) {
        holes[i].currentWinding = computeWindingForHole((int)i);
    }
}

// Compute winding bounds for holes
void computeWindingBounds() {
    if (holes.empty()) return;

    // Build cut for hole 0
    buildCutForHole(0);

    // Min winding = 0, Max winding = number of cut edges
    holes[0].minWinding = 0;
    holes[0].maxWinding = (int)holeCutEdges.size();
    holes[0].currentWinding = computeWindingForHole(0);
}

// ============================================================================
// VERTICAL CUT ALGORITHM FOR HOLE WINDING ADJUSTMENT
// ============================================================================

// Helper: collect crossing edges at a specific n position
std::vector<CutEdge> collectCrossingEdgesAtN(int n) {
    std::vector<CutEdge> edges;
    for (size_t i = 0; i < blackTriangles.size(); i++) {
        int bn = blackTriangles[i].n;
        int bj = blackTriangles[i].j;
        // Type 2 edge: black R(n,j) connects to white L(n-1,j)
        if (bn == n) {
            auto wit = whiteMap.find(makeKey(bn - 1, bj));
            if (wit != whiteMap.end()) {
                CutEdge ce;
                ce.blackN = bn;
                ce.blackJ = bj;
                ce.whiteN = bn - 1;
                ce.whiteJ = bj;
                ce.type = 2;
                edges.push_back(ce);
            }
        }
    }
    return edges;
}

// Find vertical cut through hole at integer n coordinate
// Returns list of edges crossing the cut line
std::vector<CutEdge> findVerticalCutEdges(int holeIdx, int& cutN) {
    std::vector<CutEdge> crossingEdges;
    if (holeIdx >= (int)holes.size()) return crossingEdges;

    // Get centroid n-coordinate (x = n in our coordinate system)
    double centroidN = holes[holeIdx].centroidX;
    int startN = (int)std::round(centroidN);

    // Search outward from centroid to find a position with crossing edges
    // The centroid might be inside the hole where there are no triangles
    for (int offset = 0; offset <= 20; offset++) {
        // Try startN + offset
        cutN = startN + offset;
        crossingEdges = collectCrossingEdgesAtN(cutN);
        if (!crossingEdges.empty()) return crossingEdges;

        // Try startN - offset (skip if offset == 0 to avoid duplicate)
        if (offset > 0) {
            cutN = startN - offset;
            crossingEdges = collectCrossingEdgesAtN(cutN);
            if (!crossingEdges.empty()) return crossingEdges;
        }
    }

    cutN = startN;
    return crossingEdges;  // Empty if nothing found
}

// Rebuild matching on a partition (left or right of cut) using Dinic's
// blackIndices/whiteIndices: indices into global blackTriangles/whiteTriangles
// forcedEdges: edges that must be matched (crossing the cut)
bool rebuildMatchingOnPartition(
    const std::vector<int>& blackIndices,
    const std::vector<int>& whiteIndices,
    const std::vector<CutEdge>& forcedEdges)
{
    int numBlack = (int)blackIndices.size();
    int numWhite = (int)whiteIndices.size();

    // Build local index maps
    std::unordered_map<long long, int> localBlackMap;  // global key -> local index
    std::unordered_map<long long, int> localWhiteMap;

    for (int i = 0; i < numBlack; i++) {
        int gi = blackIndices[i];
        localBlackMap[makeKey(blackTriangles[gi].n, blackTriangles[gi].j)] = i;
    }
    for (int i = 0; i < numWhite; i++) {
        int gi = whiteIndices[i];
        localWhiteMap[makeKey(whiteTriangles[gi].n, whiteTriangles[gi].j)] = i;
    }

    // Find which blacks/whites are pre-matched by forced edges
    std::set<int> excludedLocalBlacks, excludedLocalWhites;
    for (const auto& fe : forcedEdges) {
        auto bit = localBlackMap.find(makeKey(fe.blackN, fe.blackJ));
        auto wit = localWhiteMap.find(makeKey(fe.whiteN, fe.whiteJ));
        if (bit != localBlackMap.end()) excludedLocalBlacks.insert(bit->second);
        if (wit != localWhiteMap.end()) excludedLocalWhites.insert(wit->second);
    }

    int numFree = numBlack - (int)excludedLocalBlacks.size();
    if (numFree == 0) return true;  // All pre-matched, nothing to do

    // Build flow graph
    int S = numBlack + numWhite;
    int T = numBlack + numWhite + 1;

    flowAdj.assign(T + 2, std::vector<FlowEdge>());
    level.resize(T + 2);
    ptr.resize(T + 2);

    // Source -> free blacks
    for (int i = 0; i < numBlack; i++) {
        if (excludedLocalBlacks.count(i) == 0) {
            add_flow_edge(S, i, 1);
        }
    }

    // Free whites -> Sink
    for (int i = 0; i < numWhite; i++) {
        if (excludedLocalWhites.count(i) == 0) {
            add_flow_edge(numBlack + i, T, 1);
        }
    }

    // Add edges between free blacks and whites (only within partition)
    for (int i = 0; i < numBlack; i++) {
        if (excludedLocalBlacks.count(i) > 0) continue;

        int gi = blackIndices[i];
        int bn = blackTriangles[gi].n;
        int bj = blackTriangles[gi].j;

        int neighbors[3][2] = {
            {bn, bj},
            {bn, bj - 1},
            {bn - 1, bj}
        };

        for (int k = 0; k < 3; k++) {
            int wn = neighbors[k][0];
            int wj = neighbors[k][1];

            auto wit = localWhiteMap.find(makeKey(wn, wj));
            if (wit == localWhiteMap.end()) continue;

            int localWIdx = wit->second;
            if (excludedLocalWhites.count(localWIdx) > 0) continue;

            add_flow_edge(i, numBlack + localWIdx, 1);
        }
    }

    // Run max flow
    int flow = dinic(S, T);
    if (flow != numFree) return false;

    // Extract matching and update dimerGrid
    for (int i = 0; i < numBlack; i++) {
        if (excludedLocalBlacks.count(i) > 0) continue;

        for (const auto& e : flowAdj[i]) {
            if (e.to >= numBlack && e.to < numBlack + numWhite && e.flow == 1) {
                int localWIdx = e.to - numBlack;
                int gi = blackIndices[i];
                int gwi = whiteIndices[localWIdx];

                int bn = blackTriangles[gi].n;
                int bj = blackTriangles[gi].j;
                int wn = whiteTriangles[gwi].n;
                int wj = whiteTriangles[gwi].j;
                int type = getDimerType(bn, bj, wn, wj);

                size_t gridIdx = getGridIdx(bn, bj);
                if (gridIdx < dimerGrid.size()) {
                    dimerGrid[gridIdx] = (int8_t)type;
                }
                break;
            }
        }
    }

    return true;
}

// Rebuild one partition (LEFT or RIGHT) using Dinic's
// isLeft: true for LEFT partition (n < cutN), false for RIGHT (n >= cutN)
// excludedKeys: triangles that are part of forced crossing edges
bool rebuildHalfPartition(int cutN, bool isLeft, const std::set<long long>& excludedKeys) {
    // Collect triangles in this partition
    std::vector<int> partBlacks, partWhites;

    for (size_t i = 0; i < blackTriangles.size(); i++) {
        bool inPart = isLeft ? (blackTriangles[i].n < cutN) : (blackTriangles[i].n >= cutN);
        if (inPart) partBlacks.push_back(i);
    }
    for (size_t i = 0; i < whiteTriangles.size(); i++) {
        bool inPart = isLeft ? (whiteTriangles[i].n < cutN) : (whiteTriangles[i].n >= cutN);
        if (inPart) partWhites.push_back(i);
    }

    // Build local coordinate -> local index maps
    std::unordered_map<long long, int> localBlackMap, localWhiteMap;
    for (size_t i = 0; i < partBlacks.size(); i++) {
        int gi = partBlacks[i];
        localBlackMap[makeKey(blackTriangles[gi].n, blackTriangles[gi].j)] = i;
    }
    for (size_t i = 0; i < partWhites.size(); i++) {
        int gi = partWhites[i];
        localWhiteMap[makeKey(whiteTriangles[gi].n, whiteTriangles[gi].j)] = i;
    }

    // Find which local indices are excluded (part of forced crossing)
    // For LEFT partition: exclude whites (they're the ones in LEFT that connect to RIGHT blacks)
    // For RIGHT partition: exclude blacks (they're the ones in RIGHT that connect to LEFT whites)
    std::set<int> excludedLocalBlacks, excludedLocalWhites;
    for (const auto& key : excludedKeys) {
        if (isLeft) {
            auto wit = localWhiteMap.find(key);
            if (wit != localWhiteMap.end()) excludedLocalWhites.insert(wit->second);
        } else {
            auto bit = localBlackMap.find(key);
            if (bit != localBlackMap.end()) excludedLocalBlacks.insert(bit->second);
        }
    }

    int numBlack = partBlacks.size();
    int numWhite = partWhites.size();
    int freeBlacks = numBlack - excludedLocalBlacks.size();
    int freeWhites = numWhite - excludedLocalWhites.size();

    if (freeBlacks != freeWhites) {
        return false;
    }
    if (freeBlacks == 0) return true;  // Nothing to match

    // Build flow network
    int S = numBlack + numWhite;
    int T = S + 1;
    flowAdj.assign(T + 1, std::vector<FlowEdge>());
    level.resize(T + 1);
    ptr.resize(T + 1);

    for (int i = 0; i < numBlack; i++) {
        if (excludedLocalBlacks.count(i) == 0) add_flow_edge(S, i, 1);
    }
    for (int i = 0; i < numWhite; i++) {
        if (excludedLocalWhites.count(i) == 0) add_flow_edge(numBlack + i, T, 1);
    }

    // Edges: free black -> neighboring free whites (within partition)
    for (int i = 0; i < numBlack; i++) {
        if (excludedLocalBlacks.count(i) > 0) continue;
        int gi = partBlacks[i];
        int bn = blackTriangles[gi].n, bj = blackTriangles[gi].j;

        int neighbors[3][2] = {{bn, bj}, {bn, bj-1}, {bn-1, bj}};
        for (int k = 0; k < 3; k++) {
            auto wit = localWhiteMap.find(makeKey(neighbors[k][0], neighbors[k][1]));
            if (wit == localWhiteMap.end()) continue;
            if (excludedLocalWhites.count(wit->second) > 0) continue;
            add_flow_edge(i, numBlack + wit->second, 1);
        }
    }

    int flow = dinic(S, T);
    if (flow != freeBlacks) return false;

    // Write matching to dimerGrid
    for (int i = 0; i < numBlack; i++) {
        if (excludedLocalBlacks.count(i) > 0) continue;
        for (const auto& e : flowAdj[i]) {
            if (e.to >= numBlack && e.to < S && e.flow == 1) {
                int localW = e.to - numBlack;
                int gi = partBlacks[i];
                int gwi = partWhites[localW];
                int type = getDimerType(blackTriangles[gi].n, blackTriangles[gi].j,
                                        whiteTriangles[gwi].n, whiteTriangles[gwi].j);
                size_t gridIdx = getGridIdx(blackTriangles[gi].n, blackTriangles[gi].j);
                if (gridIdx < dimerGrid.size()) dimerGrid[gridIdx] = (int8_t)type;
                break;
            }
        }
    }
    return true;
}

// Find the gap in crossing edges (where the hole is)
// Returns the j-value that separates "below" from "above" the hole
int findHoleGapJ(const std::vector<CutEdge>& sortedEdges) {
    if (sortedEdges.size() < 2) return sortedEdges.empty() ? 0 : sortedEdges[0].blackJ;

    // Find largest gap between consecutive edges
    int maxGap = 0;
    int gapJ = sortedEdges[0].blackJ;
    for (size_t i = 1; i < sortedEdges.size(); i++) {
        int gap = sortedEdges[i].blackJ - sortedEdges[i-1].blackJ;
        if (gap > maxGap) {
            maxGap = gap;
            gapJ = (sortedEdges[i].blackJ + sortedEdges[i-1].blackJ) / 2;
        }
    }
    return gapJ;
}

// Helper: compute j-coordinate from world coordinates
inline int worldToJ(double worldX, double worldY) {
    return (int)std::round((worldY - slope * worldX) / deltaC);
}

// Adjust winding by SWAPPING a crossing dimer from below to above (or vice versa)
// For multiple holes on same cut: respects segment boundaries between holes
bool adjustWindingByCut(int holeIdx, int delta) {
    if (holeIdx < 0 || holeIdx >= (int)holes.size()) return false;
    if (delta != 1 && delta != -1) return false;

    auto startTime = std::chrono::steady_clock::now();
    auto checkTimeout = [&]() -> bool {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - startTime).count() > 2000;
    };

    std::vector<int8_t> savedGrid = dimerGrid;

    int cutN;
    std::vector<CutEdge> crossingEdges = findVerticalCutEdges(holeIdx, cutN);
    if (crossingEdges.empty()) return false;

    // Sort crossing edges by j (vertical position)
    std::sort(crossingEdges.begin(), crossingEdges.end(),
              [](const CutEdge& a, const CutEdge& b) { return a.blackJ < b.blackJ; });

    // Find ALL holes that intersect this vertical cut line
    // A hole intersects if its centroidX is close to cutN
    std::vector<std::pair<int, int>> holesOnCut; // (gapJ, holeIndex)
    for (size_t i = 0; i < holes.size(); i++) {
        int holeCutN = (int)std::round(holes[i].centroidX);
        if (holeCutN == cutN) {
            int holeJ = worldToJ(holes[i].centroidX, holes[i].centroidY);
            holesOnCut.push_back({holeJ, (int)i});
        }
    }

    // Sort holes by j-position (ascending)
    std::sort(holesOnCut.begin(), holesOnCut.end());

    // Find this hole's position in the sorted list
    int thisHolePos = -1;
    int thisGapJ = worldToJ(holes[holeIdx].centroidX, holes[holeIdx].centroidY);
    for (size_t i = 0; i < holesOnCut.size(); i++) {
        if (holesOnCut[i].second == holeIdx) {
            thisHolePos = (int)i;
            break;
        }
    }
    if (thisHolePos < 0) return false;

    // Determine segment boundaries for this hole
    // lowerBoundJ: j of hole below (or -infinity)
    // upperBoundJ: j of hole above (or +infinity)
    int lowerBoundJ = (thisHolePos > 0) ? holesOnCut[thisHolePos - 1].first : INT_MIN;
    int upperBoundJ = (thisHolePos < (int)holesOnCut.size() - 1) ? holesOnCut[thisHolePos + 1].first : INT_MAX;

    // Categorize crossing edges into segments
    // For +: we want matched in (lowerBoundJ, thisGapJ) and unmatched in (thisGapJ, upperBoundJ)
    // For -: we want matched in (thisGapJ, upperBoundJ) and unmatched in (lowerBoundJ, thisGapJ)
    std::vector<int> matchedInLowerSegment, matchedInUpperSegment;
    std::vector<int> unmatchedInLowerSegment, unmatchedInUpperSegment;

    for (size_t i = 0; i < crossingEdges.size(); i++) {
        const auto& ce = crossingEdges[i];
        size_t gridIdx = getGridIdx(ce.blackN, ce.blackJ);
        bool isMatched = (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == ce.type);

        // Check which segment this edge is in
        bool inLowerSegment = (ce.blackJ > lowerBoundJ && ce.blackJ < thisGapJ);
        bool inUpperSegment = (ce.blackJ > thisGapJ && ce.blackJ < upperBoundJ);

        if (isMatched) {
            if (inLowerSegment) matchedInLowerSegment.push_back(i);
            if (inUpperSegment) matchedInUpperSegment.push_back(i);
        } else {
            if (inLowerSegment) unmatchedInLowerSegment.push_back(i);
            if (inUpperSegment) unmatchedInUpperSegment.push_back(i);
        }
    }

    // For +1: take HIGHEST matched from lower segment, swap with unmatched in upper segment
    // For -1: take LOWEST matched from upper segment, swap with unmatched in lower segment
    int idxToUnmatch = -1;
    std::vector<int>* toMatchCandidates = nullptr;

    if (delta == 1) {
        // + : highest matched below -> above
        if (!matchedInLowerSegment.empty()) {
            // Edges are sorted by j ascending, so last one is highest
            idxToUnmatch = matchedInLowerSegment.back();
        }
        toMatchCandidates = &unmatchedInUpperSegment;
    } else {
        // - : lowest matched above -> below
        if (!matchedInUpperSegment.empty()) {
            // Edges are sorted by j ascending, so first one is lowest
            idxToUnmatch = matchedInUpperSegment.front();
        }
        toMatchCandidates = &unmatchedInLowerSegment;
    }

    if (idxToUnmatch < 0 || toMatchCandidates->empty()) {
        return false;
    }

    // Collect all currently matched edges
    std::vector<int> currentMatched;
    for (size_t i = 0; i < crossingEdges.size(); i++) {
        const auto& ce = crossingEdges[i];
        size_t gridIdx = getGridIdx(ce.blackN, ce.blackJ);
        if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == ce.type) {
            currentMatched.push_back(i);
        }
    }

    // Try each candidate for the new matched edge
    for (int idxToMatch : *toMatchCandidates) {
        if (checkTimeout()) { dimerGrid = savedGrid; return false; }

        // Build new set of matched crossing edges (swap one)
        std::vector<int> newMatchedIndices;
        for (int i : currentMatched) {
            if (i != idxToUnmatch) newMatchedIndices.push_back(i);
        }
        newMatchedIndices.push_back(idxToMatch);

        // Clear grid and set forced crossing edges
        std::fill(dimerGrid.begin(), dimerGrid.end(), -1);
        for (int idx : newMatchedIndices) {
            const auto& ce = crossingEdges[idx];
            size_t gridIdx = getGridIdx(ce.blackN, ce.blackJ);
            if (gridIdx < dimerGrid.size()) dimerGrid[gridIdx] = (int8_t)ce.type;
        }

        // Build excluded keys for each partition
        std::set<long long> excludedForLeft, excludedForRight;
        for (int idx : newMatchedIndices) {
            const auto& ce = crossingEdges[idx];
            excludedForLeft.insert(makeKey(ce.whiteN, ce.whiteJ));
            excludedForRight.insert(makeKey(ce.blackN, ce.blackJ));
        }

        // Rebuild LEFT (n < cutN)
        if (!rebuildHalfPartition(cutN, true, excludedForLeft)) {
            dimerGrid = savedGrid;
            continue;
        }

        // Rebuild RIGHT (n >= cutN)
        if (!rebuildHalfPartition(cutN, false, excludedForRight)) {
            dimerGrid = savedGrid;
            continue;
        }

        // Success!
        holes[holeIdx].currentWinding += delta;
        return true;
    }

    dimerGrid = savedGrid;
    return false;
}

// Main entry point for adjusting hole winding
bool adjustHoleWinding(int holeIdx, int delta) {
    if (holeIdx < 0 || holeIdx >= (int)holes.size()) return false;
    if (delta != 1 && delta != -1) return false;
    return adjustWindingByCut(holeIdx, delta);
}

// ============================================================================
// GLAUBER DYNAMICS (TOPOLOGY-AGNOSTIC)
// ============================================================================

// Get hex edges around vertex
struct HexEdge {
    int blackN, blackJ;
    int whiteN, whiteJ;
    int type;
};

void getHexEdgesAroundVertex(int n, int j, HexEdge edges[6]) {
    edges[0] = {n, j+1, n, j, 1};           // R(n,j+1) - L(n,j): bottom edge
    edges[1] = {n, j, n, j, 0};             // R(n,j) - L(n,j): diagonal
    edges[2] = {n, j, n-1, j, 2};           // R(n,j) - L(n-1,j): left vertical
    edges[3] = {n-1, j+1, n-1, j, 1};       // R(n-1,j+1) - L(n-1,j): bottom
    edges[4] = {n-1, j+1, n-1, j+1, 0};     // R(n-1,j+1) - L(n-1,j+1): diagonal
    edges[5] = {n, j+1, n-1, j+1, 2};       // R(n,j+1) - L(n-1,j+1): left vertical
}

// Populate cached indices for all triangular vertices (call after triangularVertices is built)
void populateCachedIndices() {
    cachedHexIndices.resize(triangularVertices.size());

    for (size_t i = 0; i < triangularVertices.size(); ++i) {
        HexEdge edges[6];
        getHexEdgesAroundVertex(triangularVertices[i].n, triangularVertices[i].j, edges);

        for (int k = 0; k < 6; ++k) {
            int bn = edges[k].blackN;
            int bj = edges[k].blackJ;
            cachedHexIndices[i].types[k] = edges[k].type;

            // If out of bounds, use sentinel (-1)
            if (bn < gridMinN || bn > gridMaxN || bj < gridMinJ || bj > gridMaxJ) {
                cachedHexIndices[i].edges[k] = sentinelIdx;
            } else {
                cachedHexIndices[i].edges[k] = (int32_t)getGridIdx(bn, bj);
            }
        }
    }
}

// Recompute acceptance probabilities for all vertices (call when q values change)
void recomputeProbabilities() {
    cachedProbs.resize(triangularVertices.size());
    for (size_t i = 0; i < triangularVertices.size(); ++i) {
        double q = getQAtPosition(triangularVertices[i].n, triangularVertices[i].j);
        cachedProbs[i].probUp = (float)(q / (1.0 + q));
        cachedProbs[i].probDown = (float)(1.0 / (1.0 + q));
    }
}

// Check if dimer exists - O(1) grid lookup
inline bool dimerExists(int blackN, int blackJ, int whiteN, int whiteJ) {
    if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) {
        return false;
    }
    size_t idx = getGridIdx(blackN, blackJ);
    if (idx >= dimerGrid.size()) return false;
    int8_t typeInGrid = dimerGrid[idx];
    if (typeInGrid == -1) return false;
    int expectedType = getDimerType(blackN, blackJ, whiteN, whiteJ);
    return typeInGrid == expectedType;
}

// Check if dimer exists on a specific grid
inline bool dimerExistsOnGrid(const std::vector<int8_t>& grid, int blackN, int blackJ, int whiteN, int whiteJ) {
    if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) {
        return false;
    }
    size_t idx = getGridIdx(blackN, blackJ);
    if (idx >= grid.size()) return false;
    int8_t typeInGrid = grid[idx];
    if (typeInGrid == -1) return false;
    int expectedType = getDimerType(blackN, blackJ, whiteN, whiteJ);
    return typeInGrid == expectedType;
}

// Count covered edges around vertex
int countCoveredEdges(int n, int j) {
    HexEdge edges[6];
    getHexEdgesAroundVertex(n, j, edges);
    int count = 0;
    for (int i = 0; i < 6; i++) {
        if (dimerExists(edges[i].blackN, edges[i].blackJ, edges[i].whiteN, edges[i].whiteJ)) {
            count++;
        }
    }
    return count;
}

int countCoveredEdgesOnGrid(const std::vector<int8_t>& grid, int n, int j) {
    HexEdge edges[6];
    getHexEdgesAroundVertex(n, j, edges);
    int count = 0;
    for (int i = 0; i < 6; i++) {
        if (dimerExistsOnGrid(grid, edges[i].blackN, edges[i].blackJ, edges[i].whiteN, edges[i].whiteJ)) {
            count++;
        }
    }
    return count;
}

// Perform rotation at vertex
int tryRotation(int n, int j, bool execute) {
    HexEdge edges[6];
    getHexEdgesAroundVertex(n, j, edges);

    int coveredIdx[3];
    int uncoveredIdx[3];
    int coveredCount = 0;
    int uncoveredCount = 0;

    for (int i = 0; i < 6; i++) {
        if (dimerExists(edges[i].blackN, edges[i].blackJ, edges[i].whiteN, edges[i].whiteJ)) {
            if (coveredCount < 3) coveredIdx[coveredCount++] = i;
            else return 0;
        } else {
            if (uncoveredCount < 3) uncoveredIdx[uncoveredCount++] = i;
            else return 0;
        }
    }

    if (coveredCount != 3 || uncoveredCount != 3) return 0;

    int volumeBefore = 0, volumeAfter = 0;
    for (int k = 0; k < 3; k++) {
        int idx = coveredIdx[k];
        if (edges[idx].type == 0) volumeBefore += edges[idx].blackN;
    }
    for (int k = 0; k < 3; k++) {
        int idx = uncoveredIdx[k];
        if (edges[idx].type == 0) volumeAfter += edges[idx].blackN;
    }

    int volumeChange = volumeAfter - volumeBefore;

    if (!execute) return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);

    for (int k = 0; k < 3; k++) {
        int idx = coveredIdx[k];
        int blackN = edges[idx].blackN;
        int blackJ = edges[idx].blackJ;
        if (blackN >= gridMinN && blackN <= gridMaxN && blackJ >= gridMinJ && blackJ <= gridMaxJ) {
            size_t gridIdx = getGridIdx(blackN, blackJ);
            if (gridIdx < dimerGrid.size()) dimerGrid[gridIdx] = -1;
        }
    }

    for (int k = 0; k < 3; k++) {
        int idx = uncoveredIdx[k];
        int blackN = edges[idx].blackN;
        int blackJ = edges[idx].blackJ;
        int type = edges[idx].type;
        if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) continue;
        auto blackIt = blackMap.find(makeKey(blackN, blackJ));
        auto whiteIt = whiteMap.find(makeKey(edges[idx].whiteN, edges[idx].whiteJ));
        if (blackIt != blackMap.end() && whiteIt != whiteMap.end()) {
            size_t gridIdx = getGridIdx(blackN, blackJ);
            if (gridIdx < dimerGrid.size()) dimerGrid[gridIdx] = static_cast<int8_t>(type);
        }
    }

    return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);
}

int tryRotationOnGrid(std::vector<int8_t>& grid, int n, int j, bool execute) {
    HexEdge edges[6];
    getHexEdgesAroundVertex(n, j, edges);

    int coveredIdx[3];
    int uncoveredIdx[3];
    int coveredCount = 0;
    int uncoveredCount = 0;

    for (int i = 0; i < 6; i++) {
        if (dimerExistsOnGrid(grid, edges[i].blackN, edges[i].blackJ, edges[i].whiteN, edges[i].whiteJ)) {
            if (coveredCount < 3) coveredIdx[coveredCount++] = i;
            else return 0;
        } else {
            if (uncoveredCount < 3) uncoveredIdx[uncoveredCount++] = i;
            else return 0;
        }
    }

    if (coveredCount != 3 || uncoveredCount != 3) return 0;

    int volumeBefore = 0, volumeAfter = 0;
    for (int k = 0; k < 3; k++) {
        int idx = coveredIdx[k];
        if (edges[idx].type == 0) volumeBefore += edges[idx].blackN;
    }
    for (int k = 0; k < 3; k++) {
        int idx = uncoveredIdx[k];
        if (edges[idx].type == 0) volumeAfter += edges[idx].blackN;
    }

    int volumeChange = volumeAfter - volumeBefore;

    if (!execute) return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);

    for (int k = 0; k < 3; k++) {
        int idx = coveredIdx[k];
        int blackN = edges[idx].blackN;
        int blackJ = edges[idx].blackJ;
        if (blackN >= gridMinN && blackN <= gridMaxN && blackJ >= gridMinJ && blackJ <= gridMaxJ) {
            size_t gridIdx = getGridIdx(blackN, blackJ);
            if (gridIdx < grid.size()) grid[gridIdx] = -1;
        }
    }

    for (int k = 0; k < 3; k++) {
        int idx = uncoveredIdx[k];
        int blackN = edges[idx].blackN;
        int blackJ = edges[idx].blackJ;
        int type = edges[idx].type;
        if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) continue;
        auto blackIt = blackMap.find(makeKey(blackN, blackJ));
        auto whiteIt = whiteMap.find(makeKey(edges[idx].whiteN, edges[idx].whiteJ));
        if (blackIt != blackMap.end() && whiteIt != whiteMap.end()) {
            size_t gridIdx = getGridIdx(blackN, blackJ);
            if (gridIdx < grid.size()) grid[gridIdx] = static_cast<int8_t>(type);
        }
    }

    return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);
}

// Persistent index for systematic sweeps (reset when region changes)
static size_t systematicIdx = 0;

void performGlauberStepsInternal(int numSteps) {
    if (triangularVertices.empty()) return;

    const size_t N = triangularVertices.size();
    const int8_t* gridData = dimerGrid.data();
    const size_t gridSize = dimerGrid.size();

    if (useRandomSweeps) {
        // Random site selection (original behavior)
        for (int s = 0; s < numSteps; s++) {
            totalSteps++;
            const uint32_t idx = fastRandomRange((uint32_t)N);
            const CachedHexIndices& hex = cachedHexIndices[idx];

            // Fast covered edge count using cached indices
            int coveredCount = 0;
            int coveredIdx[3], uncoveredIdx[3];
            int uncoveredCount = 0;

            for (int k = 0; k < 6; k++) {
                int32_t gridIdx = hex.edges[k];
                bool covered = (gridIdx >= 0 && (size_t)gridIdx < gridSize &&
                               gridData[gridIdx] == hex.types[k]);
                if (covered) {
                    if (coveredCount < 3) coveredIdx[coveredCount] = k;
                    coveredCount++;
                } else {
                    if (uncoveredCount < 3) uncoveredIdx[uncoveredCount] = k;
                    uncoveredCount++;
                }
            }

            if (coveredCount != 3 || uncoveredCount != 3) continue;

            const TriVertex& v = triangularVertices[idx];
            HexEdge edges[6];
            getHexEdgesAroundVertex(v.n, v.j, edges);

            int volumeBefore = 0, volumeAfter = 0;
            for (int k = 0; k < 3; k++) {
                if (edges[coveredIdx[k]].type == 0) volumeBefore += edges[coveredIdx[k]].blackN;
                if (edges[uncoveredIdx[k]].type == 0) volumeAfter += edges[uncoveredIdx[k]].blackN;
            }

            int volumeChange = volumeAfter - volumeBefore;
            if (volumeChange == 0) continue;

            float acceptProb = (volumeChange > 0) ? cachedProbs[idx].probUp : cachedProbs[idx].probDown;
            if (getRandom01() < acceptProb) {
                tryRotation(v.n, v.j, true);
                flipCount++;
            }
        }
    } else {
        // SYSTEMATIC SWEEP (default - better cache locality)
        // Process numSteps vertices sequentially, wrapping around
        for (int s = 0; s < numSteps; s++) {
            totalSteps++;
            const size_t i = systematicIdx;
            systematicIdx = (systematicIdx + 1) % N;

            const CachedHexIndices& hex = cachedHexIndices[i];

            int coveredCount = 0;
            int coveredIdx[3], uncoveredIdx[3];
            int uncoveredCount = 0;

            for (int k = 0; k < 6; k++) {
                int32_t gridIdx = hex.edges[k];
                bool covered = (gridIdx >= 0 && (size_t)gridIdx < gridSize &&
                               gridData[gridIdx] == hex.types[k]);
                if (covered) {
                    if (coveredCount < 3) coveredIdx[coveredCount] = k;
                    coveredCount++;
                } else {
                    if (uncoveredCount < 3) uncoveredIdx[uncoveredCount] = k;
                    uncoveredCount++;
                }
            }

            if (coveredCount != 3 || uncoveredCount != 3) continue;

            const TriVertex& v = triangularVertices[i];
            HexEdge edges[6];
            getHexEdgesAroundVertex(v.n, v.j, edges);

            int volumeBefore = 0, volumeAfter = 0;
            for (int k = 0; k < 3; k++) {
                if (edges[coveredIdx[k]].type == 0) volumeBefore += edges[coveredIdx[k]].blackN;
                if (edges[uncoveredIdx[k]].type == 0) volumeAfter += edges[uncoveredIdx[k]].blackN;
            }

            int volumeChange = volumeAfter - volumeBefore;
            if (volumeChange == 0) continue;

            float acceptProb = (volumeChange > 0) ? cachedProbs[i].probUp : cachedProbs[i].probDown;
            if (getRandom01() < acceptProb) {
                tryRotation(v.n, v.j, true);
                flipCount++;
            }
        }
    }
}

// ============================================================================
// CFTP (Coupling From The Past)
// ============================================================================

struct GridState {
    std::vector<int8_t> grid;
    void cloneFrom(const std::vector<int8_t>& src) { grid = src; }
};

static GridState cftp_minState, cftp_maxState;
static GridState cftp_lower, cftp_upper;
static int cftp_T = 0;
static bool cftp_initialized = false;
static bool cftp_coalesced = false;
static std::vector<uint64_t> cftp_seeds;
static int cftp_currentStep = 0;
static const int cftp_stepsPerBatch = 1000;

void makeExtremalState(GridState& state, int direction) {
    state.grid = dimerGrid;
    bool changed = true;
    while (changed) {
        changed = false;
        for (const auto& v : triangularVertices) {
            int coveredCount = countCoveredEdgesOnGrid(state.grid, v.n, v.j);
            if (coveredCount == 3) {
                int rotationType = tryRotationOnGrid(state.grid, v.n, v.j, false);
                if (rotationType == direction) {
                    tryRotationOnGrid(state.grid, v.n, v.j, true);
                    changed = true;
                }
            }
        }
    }
}

// Optimized: check coverage and get rotation type using cached indices
inline int fastCheckAndGetRotationType(const int8_t* gridData, size_t gridSize,
                                        const CachedHexIndices& hex,
                                        int coveredIdx[3], int uncoveredIdx[3],
                                        const HexEdge edges[6]) {
    int coveredCount = 0, uncoveredCount = 0;

    for (int k = 0; k < 6; k++) {
        int32_t gridIdx = hex.edges[k];
        bool covered = (gridIdx >= 0 && (size_t)gridIdx < gridSize && gridData[gridIdx] == hex.types[k]);
        if (covered) {
            if (coveredCount < 3) coveredIdx[coveredCount] = k;
            coveredCount++;
        } else {
            if (uncoveredCount < 3) uncoveredIdx[uncoveredCount] = k;
            uncoveredCount++;
        }
    }

    if (coveredCount != 3 || uncoveredCount != 3) return 0;

    int volumeBefore = 0, volumeAfter = 0;
    for (int k = 0; k < 3; k++) {
        if (edges[coveredIdx[k]].type == 0) volumeBefore += edges[coveredIdx[k]].blackN;
        if (edges[uncoveredIdx[k]].type == 0) volumeAfter += edges[uncoveredIdx[k]].blackN;
    }

    int volumeChange = volumeAfter - volumeBefore;
    return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);
}

void coupledStep(GridState& lower, GridState& upper, uint64_t seed) {
    uint64_t savedRng = rng_state;
    rng_state = seed;

    const size_t N = triangularVertices.size();
    if (N == 0) { rng_state = savedRng; return; }

    const size_t gridSize = lower.grid.size();

    if (useRandomSweeps) {
        // Random site selection (original behavior)
        for (size_t i = 0; i < N; i++) {
            const uint32_t idx = fastRandomRange((uint32_t)N);
            const double u = getRandom01();
            const TriVertex& v = triangularVertices[idx];
            const CachedHexIndices& hex = cachedHexIndices[idx];
            const float pRemove = cachedProbs[idx].probDown;

            HexEdge edges[6];
            getHexEdgesAroundVertex(v.n, v.j, edges);
            int coveredIdx[3], uncoveredIdx[3];

            // Process LOWER
            int lowerType = fastCheckAndGetRotationType(lower.grid.data(), gridSize, hex, coveredIdx, uncoveredIdx, edges);
            if (lowerType != 0) {
                if (u < pRemove) {
                    if (lowerType == -1) tryRotationOnGrid(lower.grid, v.n, v.j, true);
                } else {
                    if (lowerType == 1) tryRotationOnGrid(lower.grid, v.n, v.j, true);
                }
            }

            // Process UPPER (same u!)
            int upperType = fastCheckAndGetRotationType(upper.grid.data(), gridSize, hex, coveredIdx, uncoveredIdx, edges);
            if (upperType != 0) {
                if (u < pRemove) {
                    if (upperType == -1) tryRotationOnGrid(upper.grid, v.n, v.j, true);
                } else {
                    if (upperType == 1) tryRotationOnGrid(upper.grid, v.n, v.j, true);
                }
            }
        }
    } else {
        // SYSTEMATIC SWEEP with forced RNG synchronization
        // CRITICAL: Generate 'u' for EVERY site, regardless of chain state
        for (size_t i = 0; i < N; ++i) {
            // 1. Generate random number FIRST (this is the synchronization key!)
            const double u = getRandom01();

            const TriVertex& v = triangularVertices[i];
            const CachedHexIndices& hex = cachedHexIndices[i];
            const float pRemove = cachedProbs[i].probDown;

            HexEdge edges[6];
            getHexEdgesAroundVertex(v.n, v.j, edges);
            int coveredIdx[3], uncoveredIdx[3];

            // 2. Process LOWER chain
            int lowerType = fastCheckAndGetRotationType(lower.grid.data(), gridSize, hex, coveredIdx, uncoveredIdx, edges);
            if (lowerType != 0) {
                if (u < pRemove) {
                    if (lowerType == -1) tryRotationOnGrid(lower.grid, v.n, v.j, true);
                } else {
                    if (lowerType == 1) tryRotationOnGrid(lower.grid, v.n, v.j, true);
                }
            }

            // 3. Process UPPER chain (same u value!)
            int upperType = fastCheckAndGetRotationType(upper.grid.data(), gridSize, hex, coveredIdx, uncoveredIdx, edges);
            if (upperType != 0) {
                if (u < pRemove) {
                    if (upperType == -1) tryRotationOnGrid(upper.grid, v.n, v.j, true);
                } else {
                    if (upperType == 1) tryRotationOnGrid(upper.grid, v.n, v.j, true);
                }
            }
        }
    }

    rng_state = savedRng;
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

extern "C" {

// Initialize from user-drawn triangles using Dinic's algorithm
// Input: Flat int array [n, j, type, n, j, type, ...]
// type: 1 = Black (right-facing), 2 = White (left-facing)
EMSCRIPTEN_KEEPALIVE
char* initFromTriangles(int* data, int count) {
    blackTriangles.clear();
    whiteTriangles.clear();
    blackMap.clear();
    whiteMap.clear();
    triangularVertices.clear();
    currentDimers.clear();
    computedBoundaries.clear();
    systematicIdx = 0;  // Reset systematic sweep position

    totalSteps = 0;
    flipCount = 0;

    if (count == 0) {
        std::string json = "{\"status\":\"empty\",\"flow\":0,\"blackCount\":0,\"whiteCount\":0}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    // 1. Parse Input and Build Bounds
    int minN = 1000000, maxN = -1000000, minJ = 1000000, maxJ = -1000000;

    for (int i = 0; i < count; i += 3) {
        int n = data[i];
        int j = data[i + 1];
        int type = data[i + 2];

        minN = std::min(minN, n);
        maxN = std::max(maxN, n);
        minJ = std::min(minJ, j);
        maxJ = std::max(maxJ, j);

        if (type == 1) { // Black (right-facing)
            Vertex c = getRightTriangleCentroid(n, j);
            blackMap[makeKey(n, j)] = blackTriangles.size();
            blackTriangles.push_back({n, j, c.x, c.y});
        } else if (type == 2) { // White (left-facing)
            Vertex c = getLeftTriangleCentroid(n, j);
            whiteMap[makeKey(n, j)] = whiteTriangles.size();
            whiteTriangles.push_back({n, j, c.x, c.y});
        }
    }

    // 2. Initialize Grid for O(1) lookups
    gridMinN = minN - 2;
    gridMaxN = maxN + 2;
    gridMinJ = minJ - 2;
    gridMaxJ = maxJ + 2;
    gridStrideJ = (gridMaxJ - gridMinJ + 1);
    dimerGrid.assign((gridMaxN - gridMinN + 1) * gridStrideJ, -1);

    // 3. Build Flow Network using Dinic's Algorithm
    int numBlack = blackTriangles.size();
    int numWhite = whiteTriangles.size();
    int S = numBlack + numWhite;     // Source
    int T = S + 1;                    // Sink

    flowAdj.assign(T + 1, std::vector<FlowEdge>());
    level.resize(T + 1);
    ptr.resize(T + 1);

    // Edges: Source -> Black triangles
    for (int i = 0; i < numBlack; i++) {
        add_flow_edge(S, i, 1);
    }

    // Edges: White triangles -> Sink
    for (int i = 0; i < numWhite; i++) {
        add_flow_edge(numBlack + i, T, 1);
    }

    // Edges: Black -> White neighbors
    // Neighbors of Black(n,j) are White(n,j), White(n,j-1), White(n-1,j)
    for (int i = 0; i < numBlack; i++) {
        int bn = blackTriangles[i].n;
        int bj = blackTriangles[i].j;

        int neighbors[3][2] = {
            {bn, bj},      // Type 0: diagonal
            {bn, bj - 1},  // Type 1: bottom
            {bn - 1, bj}   // Type 2: left vertical
        };

        for (int k = 0; k < 3; k++) {
            long long key = makeKey(neighbors[k][0], neighbors[k][1]);
            auto it = whiteMap.find(key);
            if (it != whiteMap.end()) {
                add_flow_edge(i, numBlack + it->second, 1);
            }
        }
    }

    // 4. Run Dinic's Algorithm
    int maxFlow = dinic(S, T);
    bool tileable = (numBlack == numWhite && maxFlow == numBlack && numBlack > 0);

    // 5. Extract matching and populate dimer grid
    if (tileable) {
        for (int i = 0; i < numBlack; i++) {
            for (const auto& e : flowAdj[i]) {
                if (e.to >= numBlack && e.to < S && e.flow == 1) {
                    int wIdx = e.to - numBlack;
                    int type = getDimerType(blackTriangles[i].n, blackTriangles[i].j,
                                          whiteTriangles[wIdx].n, whiteTriangles[wIdx].j);
                    currentDimers.push_back({blackTriangles[i].n, blackTriangles[i].j,
                                           whiteTriangles[wIdx].n, whiteTriangles[wIdx].j, type});

                    size_t idx = getGridIdx(blackTriangles[i].n, blackTriangles[i].j);
                    if (idx < dimerGrid.size()) {
                        dimerGrid[idx] = static_cast<int8_t>(type);
                    }
                    break;
                }
            }
        }

        // Build triangular vertices for Glauber dynamics
        std::set<std::pair<int,int>> vertexSet;
        for (const auto& bt : blackTriangles) {
            // Black triangle R(n,j) has vertices (n,j), (n,j-1), (n+1,j-1)
            vertexSet.insert({bt.n, bt.j});
            vertexSet.insert({bt.n, bt.j - 1});
            vertexSet.insert({bt.n + 1, bt.j - 1});
        }
        for (const auto& wt : whiteTriangles) {
            // White triangle L(n,j) has vertices (n,j), (n+1,j), (n+1,j-1)
            vertexSet.insert({wt.n, wt.j});
            vertexSet.insert({wt.n + 1, wt.j});
            vertexSet.insert({wt.n + 1, wt.j - 1});
        }
        for (const auto& [n, j] : vertexSet) {
            triangularVertices.push_back({n, j});
        }

        // Populate optimization caches
        populateCachedIndices();
        recomputeProbabilities();
    }

    // 6. Compute boundary
    computeBoundary();

    // 6.5. Detect holes and compute winding numbers
    identifyHolesFromBoundaries();
    if (!holes.empty() && tileable) {
        buildCutForHole(0);
        computeAllWindings();
        computeWindingBounds();
    }

    // 7. Calculate initial volume
    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        size_t gridIdx = getGridIdx(bt.n, bt.j);
        if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) {
            volume += bt.n;
        }
    }

    // 8. Return JSON result
    std::string json = "{\"status\":\"" + std::string(tileable ? "valid" : "invalid") + "\""
        ",\"flow\":" + std::to_string(maxFlow) +
        ",\"blackCount\":" + std::to_string(numBlack) +
        ",\"whiteCount\":" + std::to_string(numWhite) +
        ",\"dimerCount\":" + std::to_string(currentDimers.size()) +
        ",\"vertexCount\":" + std::to_string(triangularVertices.size()) +
        ",\"volume\":" + std::to_string(volume) +
        "}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* performGlauberSteps(int numSteps) {
    performGlauberStepsInternal(numSteps);

    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) {
                volume += bt.n;
            }
        }
    }

    std::string json = "{\"status\":\"complete\""
        ",\"totalSteps\":" + std::to_string(totalSteps) +
        ",\"flipCount\":" + std::to_string(flipCount) +
        ",\"volume\":" + std::to_string(volume) +
        "}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* exportDimers() {
    // Rebuild currentDimers from dimerGrid
    currentDimers.clear();
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size()) {
                int8_t type = dimerGrid[gridIdx];
                if (type != -1) {
                    int whiteN, whiteJ;
                    getWhiteFromType(bt.n, bt.j, type, whiteN, whiteJ);
                    currentDimers.push_back({bt.n, bt.j, whiteN, whiteJ, type});
                }
            }
        }
    }

    // Export boundaries (array of arrays for multiple loops)
    std::string json = "{\"boundaries\":[";
    for (size_t b = 0; b < computedBoundaries.size(); b++) {
        if (b > 0) json += ",";
        json += "[";
        for (size_t i = 0; i < computedBoundaries[b].size(); i++) {
            if (i > 0) json += ",";
            json += "{\"x\":" + std::to_string(computedBoundaries[b][i].x) +
                    ",\"y\":" + std::to_string(computedBoundaries[b][i].y) + "}";
        }
        json += "]";
    }
    json += "],\"dimers\":[";

    // Export dimers
    for (size_t i = 0; i < currentDimers.size(); i++) {
        if (i > 0) json += ",";
        const Dimer& dm = currentDimers[i];
        json += "{\"bn\":" + std::to_string(dm.blackN) +
                ",\"bj\":" + std::to_string(dm.blackJ) +
                ",\"wn\":" + std::to_string(dm.whiteN) +
                ",\"wj\":" + std::to_string(dm.whiteJ) +
                ",\"t\":" + std::to_string(dm.type) + "}";
    }
    json += "],\"black\":[";

    // Export black triangles
    for (size_t i = 0; i < blackTriangles.size(); i++) {
        if (i > 0) json += ",";
        json += "{\"n\":" + std::to_string(blackTriangles[i].n) +
                ",\"j\":" + std::to_string(blackTriangles[i].j) +
                ",\"cx\":" + std::to_string(blackTriangles[i].cx) +
                ",\"cy\":" + std::to_string(blackTriangles[i].cy) + "}";
    }
    json += "],\"white\":[";

    // Export white triangles
    for (size_t i = 0; i < whiteTriangles.size(); i++) {
        if (i > 0) json += ",";
        json += "{\"n\":" + std::to_string(whiteTriangles[i].n) +
                ",\"j\":" + std::to_string(whiteTriangles[i].j) +
                ",\"cx\":" + std::to_string(whiteTriangles[i].cx) +
                ",\"cy\":" + std::to_string(whiteTriangles[i].cy) + "}";
    }
    json += "]}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
long long getTotalSteps() { return totalSteps; }

EMSCRIPTEN_KEEPALIVE
long long getFlipCount() { return flipCount; }

EMSCRIPTEN_KEEPALIVE
double getAcceptRate() {
    if (totalSteps == 0) return 0.0;
    return static_cast<double>(flipCount) / static_cast<double>(totalSteps);
}

EMSCRIPTEN_KEEPALIVE
void setQBias(double q) {
    qBias = q;
    recomputeProbabilities();
}

EMSCRIPTEN_KEEPALIVE
double getQBias() { return qBias; }

EMSCRIPTEN_KEEPALIVE
void setPeriodicQBias(double* values, int k) {
    periodicK = k;
    for (int i = 0; i < k; i++) {
        for (int j = 0; j < k; j++) {
            qBias_periodic[i][j] = values[i * k + j];
        }
    }
    recomputeProbabilities();
}

EMSCRIPTEN_KEEPALIVE
void setPeriodicK(int k) {
    if (k >= 1 && k <= 5) {
        periodicK = k;
        recomputeProbabilities();
    }
}

EMSCRIPTEN_KEEPALIVE
void setUsePeriodicWeights(int use) {
    usePeriodicWeights = (use != 0);
    recomputeProbabilities();
}

EMSCRIPTEN_KEEPALIVE
void setUseRandomSweeps(int use) {
    useRandomSweeps = (use != 0);
}

EMSCRIPTEN_KEEPALIVE
int getUseRandomSweeps() {
    return useRandomSweeps ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) { free(str); }

EMSCRIPTEN_KEEPALIVE
char* runCFTP() {
    GridState minState, maxState;
    makeExtremalState(minState, -1);
    makeExtremalState(maxState, 1);

    int T = 1;
    bool coalesced = false;

    while (!coalesced) {
        std::vector<uint64_t> currentSeeds(T);
        for (int i = 0; i < T; i++) currentSeeds[i] = xorshift64();

        GridState lower, upper;
        lower.cloneFrom(minState.grid);
        upper.cloneFrom(maxState.grid);

        for (int t = 0; t < T; t++) coupledStep(lower, upper, currentSeeds[t]);

        if (lower.grid == upper.grid) {
            coalesced = true;
            dimerGrid = lower.grid;
        } else {
            T *= 2;
            if (T > 33554432) {  // 2^25
                std::string json = "{\"status\":\"cftp_timeout\", \"steps\":" + std::to_string(T) + "}";
                char* out = (char*)malloc(json.size() + 1);
                strcpy(out, json.c_str());
                return out;
            }
        }
    }

    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) volume += bt.n;
        }
    }

    std::string json = "{\"status\":\"cftp_complete\", \"steps\":" + std::to_string(T) + ", \"volume\":" + std::to_string(volume) + "}";
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* initCFTP() {
    makeExtremalState(cftp_minState, -1);
    makeExtremalState(cftp_maxState, 1);
    cftp_T = 1;
    cftp_initialized = true;
    cftp_coalesced = false;
    cftp_currentStep = 0;

    std::string json = "{\"status\":\"cftp_initialized\", \"T\":" + std::to_string(cftp_T) + "}";
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* stepCFTP() {
    if (!cftp_initialized) {
        std::string json = "{\"status\":\"error\", \"message\":\"CFTP not initialized\"}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    if (cftp_coalesced) {
        std::string json = "{\"status\":\"already_coalesced\", \"T\":" + std::to_string(cftp_T) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    if (cftp_currentStep == 0) {
        cftp_seeds.resize(cftp_T);
        for (int i = 0; i < cftp_T; i++) cftp_seeds[i] = xorshift64();
        cftp_lower.cloneFrom(cftp_minState.grid);
        cftp_upper.cloneFrom(cftp_maxState.grid);
    }

    int stepsToRun = std::min(cftp_stepsPerBatch, cftp_T - cftp_currentStep);
    for (int i = 0; i < stepsToRun; i++) {
        coupledStep(cftp_lower, cftp_upper, cftp_seeds[cftp_currentStep + i]);
    }
    cftp_currentStep += stepsToRun;

    // Check coalescence after each batch - early exit if coalesced
    if (cftp_lower.grid == cftp_upper.grid) {
        cftp_coalesced = true;
        std::string json = "{\"status\":\"coalesced\", \"T\":" + std::to_string(cftp_currentStep) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    if (cftp_currentStep < cftp_T) {
        std::string json = "{\"status\":\"in_progress\", \"T\":" + std::to_string(cftp_T) +
                          ", \"step\":" + std::to_string(cftp_currentStep) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    // Not coalesced after all T steps - double T
    cftp_currentStep = 0;
    {
        int prevT = cftp_T;
        cftp_T *= 2;
        if (cftp_T > 33554432) {  // 2^25
            std::string json = "{\"status\":\"timeout\", \"T\":" + std::to_string(cftp_T) + "}";
            char* out = (char*)malloc(json.size() + 1);
            strcpy(out, json.c_str());
            return out;
        }
        std::string json = "{\"status\":\"not_coalesced\", \"T\":" + std::to_string(cftp_T) + ", \"prevT\":" + std::to_string(prevT) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* exportCFTPMaxDimers() {
    if (!cftp_initialized) {
        std::string json = "{\"dimers\":[]}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    // Export dimers from cftp_upper (max state)
    std::string json = "{\"dimers\":[";
    bool first = true;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < cftp_upper.grid.size()) {
                int8_t type = cftp_upper.grid[gridIdx];
                if (type != -1) {
                    int whiteN, whiteJ;
                    getWhiteFromType(bt.n, bt.j, type, whiteN, whiteJ);
                    if (!first) json += ",";
                    first = false;
                    json += "{\"bn\":" + std::to_string(bt.n) +
                            ",\"bj\":" + std::to_string(bt.j) +
                            ",\"wn\":" + std::to_string(whiteN) +
                            ",\"wj\":" + std::to_string(whiteJ) +
                            ",\"t\":" + std::to_string((int)type) + "}";
                }
            }
        }
    }
    json += "]}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* exportCFTPMinDimers() {
    if (!cftp_initialized) {
        std::string json = "{\"dimers\":[]}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    // Export dimers from cftp_lower (min state)
    std::string json = "{\"dimers\":[";
    bool first = true;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < cftp_lower.grid.size()) {
                int8_t type = cftp_lower.grid[gridIdx];
                if (type != -1) {
                    int whiteN, whiteJ;
                    getWhiteFromType(bt.n, bt.j, type, whiteN, whiteJ);
                    if (!first) json += ",";
                    first = false;
                    json += "{\"bn\":" + std::to_string(bt.n) +
                            ",\"bj\":" + std::to_string(bt.j) +
                            ",\"wn\":" + std::to_string(whiteN) +
                            ",\"wj\":" + std::to_string(whiteJ) +
                            ",\"t\":" + std::to_string((int)type) + "}";
                }
            }
        }
    }
    json += "]}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* finalizeCFTP() {
    if (!cftp_initialized) {
        std::string json = "{\"status\":\"error\", \"message\":\"CFTP not initialized\"}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    if (!cftp_coalesced) {
        std::string json = "{\"status\":\"error\", \"message\":\"CFTP not coalesced yet\"}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    dimerGrid = cftp_lower.grid;

    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) volume += bt.n;
        }
    }

    cftp_initialized = false;
    cftp_coalesced = false;

    std::string json = "{\"status\":\"finalized\", \"T\":" + std::to_string(cftp_T) + ", \"volume\":" + std::to_string(volume) + "}";
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* repairRegion() {
    // Strategy: Find unmatched triangles and ADD exterior neighbors to match them.
    // This adds the minimum number of triangles from the exterior to make tileable.

    int numBlack = blackTriangles.size();
    int numWhite = whiteTriangles.size();
    int S = numBlack + numWhite;

    // Find which triangles are matched in the current max flow
    std::unordered_set<int> matchedBlack;
    std::unordered_set<int> matchedWhite;

    for (int i = 0; i < numBlack; i++) {
        for (const auto& e : flowAdj[i]) {
            if (e.to >= numBlack && e.to < S && e.flow == 1) {
                matchedBlack.insert(i);
                matchedWhite.insert(e.to - numBlack);
                break;
            }
        }
    }

    // Use a set to track all triangles (existing + new) to avoid duplicates
    std::set<std::tuple<int,int,int>> triangleSet;

    // Add all current triangles
    for (const auto& bt : blackTriangles) {
        triangleSet.insert({bt.n, bt.j, 1});
    }
    for (const auto& wt : whiteTriangles) {
        triangleSet.insert({wt.n, wt.j, 2});
    }

    // For each unmatched black triangle, add an exterior white neighbor
    for (int i = 0; i < numBlack; i++) {
        if (matchedBlack.find(i) != matchedBlack.end()) continue;

        int bn = blackTriangles[i].n;
        int bj = blackTriangles[i].j;

        // White neighbors of Black(n,j): White(n,j), White(n,j-1), White(n-1,j)
        int neighbors[3][2] = {
            {bn, bj},
            {bn, bj - 1},
            {bn - 1, bj}
        };

        for (int k = 0; k < 3; k++) {
            int wn = neighbors[k][0];
            int wj = neighbors[k][1];
            long long key = makeKey(wn, wj);

            // If this white is NOT in the current region, add it
            if (whiteMap.find(key) == whiteMap.end()) {
                triangleSet.insert({wn, wj, 2});
                break;
            }
        }
    }

    // For each unmatched white triangle, add an exterior black neighbor
    for (int i = 0; i < numWhite; i++) {
        if (matchedWhite.find(i) != matchedWhite.end()) continue;

        int wn = whiteTriangles[i].n;
        int wj = whiteTriangles[i].j;

        // Black neighbors of White(n,j): Black(n,j), Black(n,j+1), Black(n+1,j)
        int neighbors[3][2] = {
            {wn, wj},
            {wn, wj + 1},
            {wn + 1, wj}
        };

        for (int k = 0; k < 3; k++) {
            int bn = neighbors[k][0];
            int bj = neighbors[k][1];
            long long key = makeKey(bn, bj);

            // If this black is NOT in the current region, add it
            if (blackMap.find(key) == blackMap.end()) {
                triangleSet.insert({bn, bj, 1});
                break;
            }
        }
    }

    // Convert set to flat array
    std::vector<int> newTriangles;
    for (const auto& t : triangleSet) {
        newTriangles.push_back(std::get<0>(t));
        newTriangles.push_back(std::get<1>(t));
        newTriangles.push_back(std::get<2>(t));
    }

    if (newTriangles.empty()) {
        return initFromTriangles(nullptr, 0);
    }

    return initFromTriangles(newTriangles.data(), newTriangles.size());
}

// Set dimers directly from a flat array [bn, bj, wn, wj, type, ...]
// Used for applying winding constraints
EMSCRIPTEN_KEEPALIVE
char* setDimers(int* data, int count) {
    // Clear existing dimer grid
    std::fill(dimerGrid.begin(), dimerGrid.end(), -1);
    currentDimers.clear();

    // Populate from input
    for (int i = 0; i < count; i += 5) {
        int bn = data[i];
        int bj = data[i + 1];
        int wn = data[i + 2];
        int wj = data[i + 3];
        int type = data[i + 4];

        // Validate and add to grid
        if (bn >= gridMinN && bn <= gridMaxN && bj >= gridMinJ && bj <= gridMaxJ) {
            size_t idx = getGridIdx(bn, bj);
            if (idx < dimerGrid.size()) {
                dimerGrid[idx] = static_cast<int8_t>(type);
                currentDimers.push_back({bn, bj, wn, wj, type});
            }
        }
    }

    // Compute volume
    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) {
                volume += bt.n;
            }
        }
    }

    std::string json = "{\"status\":\"dimers_set\""
        ",\"dimerCount\":" + std::to_string(currentDimers.size()) +
        ",\"volume\":" + std::to_string(volume) +
        "}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

// ============================================================================
// HOLE/WINDING EXPORTS FOR JAVASCRIPT
// ============================================================================

EMSCRIPTEN_KEEPALIVE
int getHoleCount() {
    return (int)holes.size();
}

EMSCRIPTEN_KEEPALIVE
char* getAllHolesInfo() {
    std::string json = "{\"holes\":[";
    for (size_t i = 0; i < holes.size(); i++) {
        if (i > 0) json += ",";
        const HoleInfo& h = holes[i];
        json += "{\"idx\":" + std::to_string(i) +
                ",\"centroidX\":" + std::to_string(h.centroidX) +
                ",\"centroidY\":" + std::to_string(h.centroidY) +
                ",\"currentWinding\":" + std::to_string(h.currentWinding) +
                ",\"minWinding\":" + std::to_string(h.minWinding) +
                ",\"maxWinding\":" + std::to_string(h.maxWinding) + "}";
    }
    json += "]}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* adjustHoleWindingExport(int holeIdx, int delta) {
    bool success = adjustHoleWinding(holeIdx, delta);

    std::string json = "{\"success\":" + std::string(success ? "true" : "false");
    if (success && holeIdx >= 0 && holeIdx < (int)holes.size()) {
        json += ",\"newWinding\":" + std::to_string(holes[holeIdx].currentWinding);
    }
    json += "}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void recomputeHoleInfo() {
    identifyHolesFromBoundaries();
    if (!holes.empty()) {
        buildCutForHole(0);
        computeAllWindings();
        computeWindingBounds();
    }
}

// Get vertical cut info for visualization
EMSCRIPTEN_KEEPALIVE
char* getVerticalCutInfo(int holeIdx) {
    int cutN = 0;
    std::vector<CutEdge> crossingEdges = findVerticalCutEdges(holeIdx, cutN);

    // Count matched crossing edges
    int matchedCount = 0;
    for (const auto& ce : crossingEdges) {
        size_t gridIdx = getGridIdx(ce.blackN, ce.blackJ);
        if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == ce.type) {
            matchedCount++;
        }
    }

    std::string json = "{\"cutN\":" + std::to_string(cutN) +
                       ",\"crossingCount\":" + std::to_string(crossingEdges.size()) +
                       ",\"matchedCount\":" + std::to_string(matchedCount) + "}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

} // extern "C"
