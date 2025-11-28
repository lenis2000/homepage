/*
emcc 2025-11-28-ultimate-lozenge.cpp -o 2025-11-28-ultimate-lozenge.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initFromTriangles','_performGlauberSteps','_exportDimers','_getTotalSteps','_getFlipCount','_getAcceptRate','_setQBias','_getQBias','_freeString','_runCFTP','_initCFTP','_stepCFTP','_finalizeCFTP','_exportCFTPMaxDimers','_repairRegion','_malloc','_free']" \
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
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <string>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <algorithm>
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

inline int getRandomInt(int n) {
    return static_cast<int>((xorshift64() >> 11) % n);
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

// Dimer representation
struct Dimer {
    int blackN, blackJ;
    int whiteN, whiteJ;
    int type;
};

std::vector<Dimer> currentDimers;

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

void performGlauberStepsInternal(int numSteps) {
    if (triangularVertices.empty()) return;

    double probAdd = qBias / (1.0 + qBias);
    double probRemove = 1.0 / (1.0 + qBias);

    for (int s = 0; s < numSteps; s++) {
        totalSteps++;
        int idx = getRandomInt(triangularVertices.size());
        const TriVertex& v = triangularVertices[idx];
        int coveredCount = countCoveredEdges(v.n, v.j);

        if (coveredCount == 3) {
            int rotationType = tryRotation(v.n, v.j, false);
            if (rotationType != 0) {
                double acceptProb = (rotationType > 0) ? probAdd : probRemove;
                if (getRandom01() < acceptProb) {
                    tryRotation(v.n, v.j, true);
                    flipCount++;
                }
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

void coupledStep(GridState& lower, GridState& upper, uint64_t seed) {
    uint64_t savedRng = rng_state;
    rng_state = seed;

    int N = triangularVertices.size();
    if (N == 0) { rng_state = savedRng; return; }

    double pRemove = 1.0 / (1.0 + qBias);

    for (int i = 0; i < N; i++) {
        int idx = getRandomInt(N);
        double u = getRandom01();
        const TriVertex& v = triangularVertices[idx];

        int lowerCovered = countCoveredEdgesOnGrid(lower.grid, v.n, v.j);
        if (lowerCovered == 3) {
            int lowerType = tryRotationOnGrid(lower.grid, v.n, v.j, false);
            if (u < pRemove) {
                if (lowerType == -1) tryRotationOnGrid(lower.grid, v.n, v.j, true);
            } else {
                if (lowerType == 1) tryRotationOnGrid(lower.grid, v.n, v.j, true);
            }
        }

        int upperCovered = countCoveredEdgesOnGrid(upper.grid, v.n, v.j);
        if (upperCovered == 3) {
            int upperType = tryRotationOnGrid(upper.grid, v.n, v.j, false);
            if (u < pRemove) {
                if (upperType == -1) tryRotationOnGrid(upper.grid, v.n, v.j, true);
            } else {
                if (upperType == 1) tryRotationOnGrid(upper.grid, v.n, v.j, true);
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
    }

    // 6. Compute boundary
    computeBoundary();

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
void setQBias(double q) { qBias = q; }

EMSCRIPTEN_KEEPALIVE
double getQBias() { return qBias; }

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
            if (T > 1000000) {
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

    if (cftp_currentStep < cftp_T) {
        std::string json = "{\"status\":\"in_progress\", \"T\":" + std::to_string(cftp_T) +
                          ", \"step\":" + std::to_string(cftp_currentStep) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    cftp_currentStep = 0;

    if (cftp_lower.grid == cftp_upper.grid) {
        cftp_coalesced = true;
        std::string json = "{\"status\":\"coalesced\", \"T\":" + std::to_string(cftp_T) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    } else {
        int prevT = cftp_T;
        cftp_T *= 2;
        if (cftp_T > 1000000) {
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

} // extern "C"
