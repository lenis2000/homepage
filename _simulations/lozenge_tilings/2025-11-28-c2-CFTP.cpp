/*
emcc 2025-11-28-c2-CFTP.cpp -o 2025-11-28-c2-CFTP.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initPolygon','_performGlauberSteps','_exportDimers','_getTotalSteps','_getFlipCount','_getAcceptRate','_setQBias','_getQBias','_freeString','_runCFTP','_initCFTP','_stepCFTP','_finalizeCFTP']" \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=32MB \
  -s STACK_SIZE=1MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math
mv 2025-11-28-c2-CFTP.js ../../js/

C++ translation of the working JavaScript implementation for:
- Glauber dynamics for lozenge tilings of C2 (complex polygon) region
- Polygon defined by parameters b, c, d, e, h with a = b - d + e + c
- Dimer covering on triangular lattice
- Coupling From The Past (CFTP) for perfect sampling
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

// Triangle geometry constants (exactly as in JS)
const double slope = 1.0 / std::sqrt(3.0);
const double deltaC = 2.0 / std::sqrt(3.0);

// Vertex structure
struct Vertex {
    double x, y;
};

// Get vertex coordinates (exactly as in JS)
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

// Point in polygon test (ray casting, exactly as in JS)
bool pointInPolygon(double x, double y, const std::vector<Vertex>& polygon) {
    if (polygon.size() < 3) return false;
    bool inside = false;
    for (size_t i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
        double xi = polygon[i].x, yi = polygon[i].y;
        double xj = polygon[j].x, yj = polygon[j].y;
        if (((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

// 6 directions on triangular lattice (exactly as in JS)
const int directions_dn[6] = { 1,  1,  0, -1, -1,  0 };
const int directions_dj[6] = { -1, 0,  1,  1,  0, -1 };

// Global state
int B = 7, C = 6, D = 3, E = 8, H = 6;
int A = 18;
double qBias = 1.0;  // Bias parameter: q/(1+q) to add box, 1/(1+q) to remove

std::vector<Vertex> polygonBoundary;

// Dense grid state for O(1) dimer lookups
// dimerGrid stores dimer type (0,1,2) or -1 if black triangle has no dimer
std::vector<int8_t> dimerGrid;
int gridMinN, gridMaxN, gridMinJ, gridMaxJ;
size_t gridStrideJ; // number of j values per n

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

// Triangular vertices inside polygon (for Glauber dynamics)
struct TriVertex {
    int n, j;
};
std::vector<TriVertex> triangularVertices;

// Dimer representation (exactly as in JS)
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

// Generate polygon boundary (exactly as in JS getComplexPolygonBoundary)
void generatePolygonBoundary() {
    polygonBoundary.clear();
    A = B - D + E + C;

    int n = 0, j = 0;
    int dir = 0;

    auto move = [&](int steps) {
        for (int i = 0; i < steps; i++) {
            polygonBoundary.push_back(getVertex(n, j));
            n += directions_dn[dir];
            j += directions_dj[dir];
        }
    };

    auto turnCCW = [&](int degrees) {
        dir = (dir + degrees / 60 + 6) % 6;
    };

    auto turnCW = [&](int degrees) {
        dir = (dir - degrees / 60 + 6) % 6;
    };

    // Trace boundary exactly as in JS
    move(A);
    turnCCW(60); move(B);
    turnCCW(60); move(H);
    turnCCW(60); move(C);
    turnCCW(60); move(D);
    turnCW(60); move(E);
    turnCW(120); move(E);
    turnCW(60); move(D);
    turnCCW(60); move(C);
    turnCCW(60); move(H);
    turnCCW(60); move(B);
    turnCCW(60); move(A);
    turnCCW(60); move(2 * H);
}

// Get dimer type from relative position (exactly as in JS getDimerType)
int getDimerType(int blackN, int blackJ, int whiteN, int whiteJ) {
    int dn = whiteN - blackN;
    int dj = whiteJ - blackJ;
    if (dn == 0 && dj == 0) return 0;       // diagonal
    else if (dn == 0 && dj == -1) return 1; // bottom
    else if (dn == -1 && dj == 0) return 2; // left vertical
    return 0;
}

// Find all triangles inside polygon
void findTrianglesInPolygon() {
    blackTriangles.clear();
    whiteTriangles.clear();
    blackMap.clear();
    whiteMap.clear();
    triangularVertices.clear();

    // Find bounding box
    double minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const auto& v : polygonBoundary) {
        minX = std::min(minX, v.x);
        maxX = std::max(maxX, v.x);
        minY = std::min(minY, v.y);
        maxY = std::max(maxY, v.y);
    }

    int searchMinN = static_cast<int>(std::floor(minX)) - 2;
    int searchMaxN = static_cast<int>(std::ceil(maxX)) + 2;
    // J bounds need padding proportional to the N range to account for the slanted coordinate system
    int nRange = searchMaxN - searchMinN;
    int searchMinJ = static_cast<int>(std::floor(minY / deltaC)) - nRange - 5;
    int searchMaxJ = static_cast<int>(std::ceil(maxY / deltaC)) + nRange + 5;

    // Initialize grid bounds for O(1) lookups
    gridMinN = searchMinN;
    gridMaxN = searchMaxN;
    gridMinJ = searchMinJ;
    gridMaxJ = searchMaxJ;
    gridStrideJ = static_cast<size_t>(gridMaxJ - gridMinJ + 1);

    // Allocate and initialize grid to -1 (no dimer)
    size_t gridSize = static_cast<size_t>(gridMaxN - gridMinN + 1) * gridStrideJ;
    dimerGrid.assign(gridSize, -1);

    for (int n = searchMinN; n <= searchMaxN; n++) {
        for (int jj = searchMinJ; jj <= searchMaxJ; jj++) {
            // Check right-facing triangle (BLACK)
            Vertex rc = getRightTriangleCentroid(n, jj);
            if (pointInPolygon(rc.x, rc.y, polygonBoundary)) {
                int idx = blackTriangles.size();
                blackTriangles.push_back({n, jj, rc.x, rc.y});
                blackMap[makeKey(n, jj)] = idx;
            }

            // Check left-facing triangle (WHITE)
            Vertex lc = getLeftTriangleCentroid(n, jj);
            if (pointInPolygon(lc.x, lc.y, polygonBoundary)) {
                int idx = whiteTriangles.size();
                whiteTriangles.push_back({n, jj, lc.x, lc.y});
                whiteMap[makeKey(n, jj)] = idx;
            }

            // Check triangular vertex
            Vertex v = getVertex(n, jj);
            if (pointInPolygon(v.x, v.y, polygonBoundary)) {
                triangularVertices.push_back({n, jj});
            }
        }
    }
}

// Get right triangle neighbors (exactly as in JS getRightTriangleNeighbors)
// Returns: (n,j), (n,j-1), (n-1,j) for white triangle positions
void getRightTriangleNeighbors(int n, int j, int neighbors[3][2]) {
    neighbors[0][0] = n;     neighbors[0][1] = j;      // diagonal
    neighbors[1][0] = n;     neighbors[1][1] = j - 1;  // bottom edge
    neighbors[2][0] = n - 1; neighbors[2][1] = j;      // left vertical edge
}

// Generate initial dimer covering using Hungarian algorithm (iterative BFS version)
void generateInitialDimerCovering() {
    currentDimers.clear();

    if (blackTriangles.empty() || whiteTriangles.empty()) return;

    // Build adjacency: for each black triangle, list of white neighbors
    std::vector<std::vector<int>> adj(blackTriangles.size());

    for (size_t bi = 0; bi < blackTriangles.size(); bi++) {
        int n = blackTriangles[bi].n;
        int j = blackTriangles[bi].j;

        int neighbors[3][2];
        getRightTriangleNeighbors(n, j, neighbors);

        for (int k = 0; k < 3; k++) {
            auto it = whiteMap.find(makeKey(neighbors[k][0], neighbors[k][1]));
            if (it != whiteMap.end()) {
                adj[bi].push_back(it->second);
            }
        }
    }

    // Hungarian matching (iterative BFS to avoid stack overflow)
    std::vector<int> matchWhiteToBlack(whiteTriangles.size(), -1);
    std::vector<int> matchBlackToWhite(blackTriangles.size(), -1);

    // For each unmatched black triangle, try to find augmenting path using BFS
    for (size_t startBlack = 0; startBlack < blackTriangles.size(); startBlack++) {
        // BFS to find augmenting path
        std::vector<int> parent(whiteTriangles.size(), -1);  // parent[w] = black triangle that led to w
        std::vector<bool> visitedWhite(whiteTriangles.size(), false);
        std::queue<int> q;

        // Start from startBlack's white neighbors
        for (int w : adj[startBlack]) {
            if (!visitedWhite[w]) {
                visitedWhite[w] = true;
                parent[w] = startBlack;
                q.push(w);
            }
        }

        int endWhite = -1;
        while (!q.empty() && endWhite == -1) {
            int w = q.front();
            q.pop();

            if (matchWhiteToBlack[w] == -1) {
                // Found unmatched white - augmenting path found
                endWhite = w;
            } else {
                // Follow the matching edge to black, then explore its white neighbors
                int b = matchWhiteToBlack[w];
                for (int nextW : adj[b]) {
                    if (!visitedWhite[nextW]) {
                        visitedWhite[nextW] = true;
                        parent[nextW] = b;
                        q.push(nextW);
                    }
                }
            }
        }

        // If augmenting path found, trace back and flip edges
        if (endWhite != -1) {
            int w = endWhite;
            int b = parent[w];
            while (b != -1) {
                int prevW = matchBlackToWhite[b];
                matchWhiteToBlack[w] = b;
                matchBlackToWhite[b] = w;
                w = prevW;
                if (w == -1) break;
                b = parent[w];
            }
        }
    }

    // Build dimer list and populate grid
    for (size_t bi = 0; bi < blackTriangles.size(); bi++) {
        int wi = matchBlackToWhite[bi];
        if (wi >= 0) {
            int blackN = blackTriangles[bi].n;
            int blackJ = blackTriangles[bi].j;
            int whiteN = whiteTriangles[wi].n;
            int whiteJ = whiteTriangles[wi].j;
            int type = getDimerType(blackN, blackJ, whiteN, whiteJ);
            currentDimers.push_back({blackN, blackJ, whiteN, whiteJ, type});

            // Populate grid for O(1) lookups (with bounds check)
            if (blackN >= gridMinN && blackN <= gridMaxN && blackJ >= gridMinJ && blackJ <= gridMaxJ) {
                size_t idx = getGridIdx(blackN, blackJ);
                if (idx < dimerGrid.size()) {
                    dimerGrid[idx] = static_cast<int8_t>(type);
                }
            }
        }
    }
}

// Get hex edges around vertex (exactly as in JS getHexEdgesAroundVertex)
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
    // Bounds check
    if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) {
        return false;
    }

    size_t idx = getGridIdx(blackN, blackJ);
    if (idx >= dimerGrid.size()) return false;

    int8_t typeInGrid = dimerGrid[idx];

    if (typeInGrid == -1) return false;

    // Check if the type in the grid matches the spatial relationship requested
    int expectedType = getDimerType(blackN, blackJ, whiteN, whiteJ);
    return typeInGrid == expectedType;
}

// Check if dimer exists on a specific grid - O(1) grid lookup
inline bool dimerExistsOnGrid(const std::vector<int8_t>& grid, int blackN, int blackJ, int whiteN, int whiteJ) {
    // Bounds check
    if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) {
        return false;
    }

    size_t idx = getGridIdx(blackN, blackJ);
    if (idx >= grid.size()) return false;

    int8_t typeInGrid = grid[idx];

    if (typeInGrid == -1) return false;

    // Check if the type in the grid matches the spatial relationship requested
    int expectedType = getDimerType(blackN, blackJ, whiteN, whiteJ);
    return typeInGrid == expectedType;
}

// Count covered edges around vertex (exactly as in JS countCoveredEdges)
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

// Count covered edges around vertex on a specific grid
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

// Perform rotation at vertex - O(1) grid updates only
// Returns: 0 if rotation not possible, 1 if adds box, -1 if removes box
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
            else return 0; // More than 3 covered
        } else {
            if (uncoveredCount < 3) uncoveredIdx[uncoveredCount++] = i;
            else return 0; // More than 3 uncovered
        }
    }

    if (coveredCount != 3 || uncoveredCount != 3) {
        return 0;
    }

    // Calculate volume change: compare type 0 lozenges before and after
    // Volume = sum of blackN for type 0 lozenges
    // Before: covered edges that are type 0
    // After: uncovered edges that would become type 0
    int volumeBefore = 0;
    int volumeAfter = 0;

    for (int k = 0; k < 3; k++) {
        int idx = coveredIdx[k];
        if (edges[idx].type == 0) {
            volumeBefore += edges[idx].blackN;
        }
    }

    for (int k = 0; k < 3; k++) {
        int idx = uncoveredIdx[k];
        if (edges[idx].type == 0) {
            volumeAfter += edges[idx].blackN;
        }
    }

    int volumeChange = volumeAfter - volumeBefore;  // positive = adding box, negative = removing

    if (!execute) {
        return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);
    }

    // Remove covered dimers by setting grid to -1
    for (int k = 0; k < 3; k++) {
        int idx = coveredIdx[k];
        int blackN = edges[idx].blackN;
        int blackJ = edges[idx].blackJ;
        // Bounds check before grid access
        if (blackN >= gridMinN && blackN <= gridMaxN && blackJ >= gridMinJ && blackJ <= gridMaxJ) {
            size_t gridIdx = getGridIdx(blackN, blackJ);
            if (gridIdx < dimerGrid.size()) {
                dimerGrid[gridIdx] = -1;
            }
        }
    }

    // Add uncovered edges as new dimers by setting grid to type
    for (int k = 0; k < 3; k++) {
        int idx = uncoveredIdx[k];
        int blackN = edges[idx].blackN;
        int blackJ = edges[idx].blackJ;
        int type = edges[idx].type;

        // Bounds check before grid access
        if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) {
            continue;
        }

        // Check if both triangles exist
        auto blackIt = blackMap.find(makeKey(blackN, blackJ));
        auto whiteIt = whiteMap.find(makeKey(edges[idx].whiteN, edges[idx].whiteJ));

        if (blackIt != blackMap.end() && whiteIt != whiteMap.end()) {
            size_t gridIdx = getGridIdx(blackN, blackJ);
            if (gridIdx < dimerGrid.size()) {
                dimerGrid[gridIdx] = static_cast<int8_t>(type);
            }
        }
    }

    return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);
}

// Perform rotation on a specific grid - O(1) grid updates only
// Returns: 0 if rotation not possible, 1 if adds box, -1 if removes box
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
            else return 0; // More than 3 covered
        } else {
            if (uncoveredCount < 3) uncoveredIdx[uncoveredCount++] = i;
            else return 0; // More than 3 uncovered
        }
    }

    if (coveredCount != 3 || uncoveredCount != 3) {
        return 0;
    }

    // Calculate volume change
    int volumeBefore = 0;
    int volumeAfter = 0;

    for (int k = 0; k < 3; k++) {
        int idx = coveredIdx[k];
        if (edges[idx].type == 0) {
            volumeBefore += edges[idx].blackN;
        }
    }

    for (int k = 0; k < 3; k++) {
        int idx = uncoveredIdx[k];
        if (edges[idx].type == 0) {
            volumeAfter += edges[idx].blackN;
        }
    }

    int volumeChange = volumeAfter - volumeBefore;

    if (!execute) {
        return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);
    }

    // Remove covered dimers
    for (int k = 0; k < 3; k++) {
        int idx = coveredIdx[k];
        int blackN = edges[idx].blackN;
        int blackJ = edges[idx].blackJ;
        if (blackN >= gridMinN && blackN <= gridMaxN && blackJ >= gridMinJ && blackJ <= gridMaxJ) {
            size_t gridIdx = getGridIdx(blackN, blackJ);
            if (gridIdx < grid.size()) {
                grid[gridIdx] = -1;
            }
        }
    }

    // Add uncovered edges as new dimers
    for (int k = 0; k < 3; k++) {
        int idx = uncoveredIdx[k];
        int blackN = edges[idx].blackN;
        int blackJ = edges[idx].blackJ;
        int type = edges[idx].type;

        if (blackN < gridMinN || blackN > gridMaxN || blackJ < gridMinJ || blackJ > gridMaxJ) {
            continue;
        }

        auto blackIt = blackMap.find(makeKey(blackN, blackJ));
        auto whiteIt = whiteMap.find(makeKey(edges[idx].whiteN, edges[idx].whiteJ));

        if (blackIt != blackMap.end() && whiteIt != whiteMap.end()) {
            size_t gridIdx = getGridIdx(blackN, blackJ);
            if (gridIdx < grid.size()) {
                grid[gridIdx] = static_cast<int8_t>(type);
            }
        }
    }

    return (volumeChange > 0) ? 1 : ((volumeChange < 0) ? -1 : 0);
}

// Perform Glauber steps with bias q
// Probability q/(1+q) to add box, 1/(1+q) to remove box
void performGlauberStepsInternal(int numSteps) {
    if (triangularVertices.empty()) return;

    // Precompute acceptance probabilities
    double probAdd = qBias / (1.0 + qBias);     // q/(1+q)
    double probRemove = 1.0 / (1.0 + qBias);   // 1/(1+q)

    for (int s = 0; s < numSteps; s++) {
        totalSteps++;

        int idx = getRandomInt(triangularVertices.size());
        const TriVertex& v = triangularVertices[idx];

        int coveredCount = countCoveredEdges(v.n, v.j);

        if (coveredCount == 3) {
            // Check what kind of rotation this would be
            int rotationType = tryRotation(v.n, v.j, false);  // dry run

            if (rotationType != 0) {
                double acceptProb;
                if (rotationType > 0) {
                    // Adding box
                    acceptProb = probAdd;
                } else {
                    // Removing box
                    acceptProb = probRemove;
                }

                if (getRandom01() < acceptProb) {
                    tryRotation(v.n, v.j, true);  // execute
                    flipCount++;
                }
            }
        }
    }
}

// ============================================================================
// CFTP (Coupling From The Past) Implementation
// ============================================================================

// GridState for CFTP - stores a copy of the dimer grid
struct GridState {
    std::vector<int8_t> grid;

    void cloneFrom(const std::vector<int8_t>& src) {
        grid = src;
    }
};

// Global CFTP state for step-based execution
static GridState cftp_minState, cftp_maxState;
static GridState cftp_lower, cftp_upper;
static int cftp_T = 0;
static bool cftp_initialized = false;
static bool cftp_coalesced = false;
static std::vector<uint64_t> cftp_seeds;
static int cftp_currentStep = 0;  // Current step within epoch
static const int cftp_stepsPerBatch = 1000;  // Steps to run per call

// Make extremal state: direction=-1 for Min (drain all boxes), direction=1 for Max (fill all boxes)
void makeExtremalState(GridState& state, int direction) {
    // Start from current state
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

// Coupled step: update both lower and upper states using same random numbers
void coupledStep(GridState& lower, GridState& upper, uint64_t seed) {
    // Save and restore RNG state for reproducibility
    uint64_t savedRng = rng_state;
    rng_state = seed;

    int N = triangularVertices.size();
    if (N == 0) {
        rng_state = savedRng;
        return;
    }

    double pRemove = 1.0 / (1.0 + qBias);

    for (int i = 0; i < N; i++) {
        int idx = getRandomInt(N);
        double u = getRandom01();
        const TriVertex& v = triangularVertices[idx];

        // Apply to LOWER
        int lowerCovered = countCoveredEdgesOnGrid(lower.grid, v.n, v.j);
        if (lowerCovered == 3) {
            int lowerType = tryRotationOnGrid(lower.grid, v.n, v.j, false);
            if (u < pRemove) {
                // Try to remove
                if (lowerType == -1) {
                    tryRotationOnGrid(lower.grid, v.n, v.j, true);
                }
            } else {
                // Try to add
                if (lowerType == 1) {
                    tryRotationOnGrid(lower.grid, v.n, v.j, true);
                }
            }
        }

        // Apply to UPPER with same random numbers
        int upperCovered = countCoveredEdgesOnGrid(upper.grid, v.n, v.j);
        if (upperCovered == 3) {
            int upperType = tryRotationOnGrid(upper.grid, v.n, v.j, false);
            if (u < pRemove) {
                // Try to remove
                if (upperType == -1) {
                    tryRotationOnGrid(upper.grid, v.n, v.j, true);
                }
            } else {
                // Try to add
                if (upperType == 1) {
                    tryRotationOnGrid(upper.grid, v.n, v.j, true);
                }
            }
        }
    }

    rng_state = savedRng;
}

// Export functions
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* initPolygon(int b, int c, int d, int e, int h) {
    B = b; C = c; D = d; E = e; H = h;
    A = B - D + E + C;

    totalSteps = 0;
    flipCount = 0;

    generatePolygonBoundary();
    findTrianglesInPolygon();
    generateInitialDimerCovering();

    // Calculate initial volume (using grid for consistency)
    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) { // type 0 dimer
                volume += bt.n;
            }
        }
    }

    std::string json = "{\"status\":\"initialized\""
        ",\"a\":" + std::to_string(A) +
        ",\"b\":" + std::to_string(B) +
        ",\"c\":" + std::to_string(C) +
        ",\"d\":" + std::to_string(D) +
        ",\"e\":" + std::to_string(E) +
        ",\"h\":" + std::to_string(H) +
        ",\"blackCount\":" + std::to_string(blackTriangles.size()) +
        ",\"whiteCount\":" + std::to_string(whiteTriangles.size()) +
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

    // Calculate volume (sum of blackN for type 0 lozenges - horizontal faces)
    // Use grid directly for O(N) instead of rebuilding currentDimers
    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) { // type 0 dimer
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
    // Rebuild currentDimers from dimerGrid (lazy export)
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

    // Export boundary vertices
    std::string json = "{\"boundary\":[";
    for (size_t i = 0; i < polygonBoundary.size(); i++) {
        if (i > 0) json += ",";
        json += "{\"x\":" + std::to_string(polygonBoundary[i].x) +
                ",\"y\":" + std::to_string(polygonBoundary[i].y) + "}";
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

    // Export black triangle centroids
    for (size_t i = 0; i < blackTriangles.size(); i++) {
        if (i > 0) json += ",";
        json += "{\"n\":" + std::to_string(blackTriangles[i].n) +
                ",\"j\":" + std::to_string(blackTriangles[i].j) +
                ",\"cx\":" + std::to_string(blackTriangles[i].cx) +
                ",\"cy\":" + std::to_string(blackTriangles[i].cy) + "}";
    }
    json += "],\"white\":[";

    // Export white triangle centroids
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
long long getTotalSteps() {
    return totalSteps;
}

EMSCRIPTEN_KEEPALIVE
long long getFlipCount() {
    return flipCount;
}

EMSCRIPTEN_KEEPALIVE
double getAcceptRate() {
    if (totalSteps == 0) return 0.0;
    return static_cast<double>(flipCount) / static_cast<double>(totalSteps);
}

EMSCRIPTEN_KEEPALIVE
void setQBias(double q) {
    qBias = q;
}

EMSCRIPTEN_KEEPALIVE
double getQBias() {
    return qBias;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

// CFTP: Coupling From The Past for perfect sampling
EMSCRIPTEN_KEEPALIVE
char* runCFTP() {
    // Initialize Min and Max states
    GridState minState, maxState;

    // Generate extremal states
    makeExtremalState(minState, -1);  // Min: all boxes removed
    makeExtremalState(maxState, 1);   // Max: all boxes filled

    int T = 1;
    bool coalesced = false;

    // CFTP Loop with doubling
    while (!coalesced) {
        // Generate T seeds for this run
        std::vector<uint64_t> currentSeeds(T);
        for (int i = 0; i < T; i++) {
            currentSeeds[i] = xorshift64();
        }

        // Reset chains to extremal states
        GridState lower, upper;
        lower.cloneFrom(minState.grid);
        upper.cloneFrom(maxState.grid);

        // Run forward from -T to 0
        for (int t = 0; t < T; t++) {
            coupledStep(lower, upper, currentSeeds[t]);
        }

        // Check coalescence
        if (lower.grid == upper.grid) {
            coalesced = true;
            // Apply result to global state
            dimerGrid = lower.grid;
        } else {
            T *= 2;
            if (T > 1000000) {
                // Safety break - return without coalescence
                std::string json = "{\"status\":\"cftp_timeout\", \"steps\":" + std::to_string(T) + "}";
                char* out = (char*)malloc(json.size() + 1);
                strcpy(out, json.c_str());
                return out;
            }
        }
    }

    // Calculate volume
    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) {
                volume += bt.n;
            }
        }
    }

    std::string json = "{\"status\":\"cftp_complete\", \"steps\":" + std::to_string(T) + ", \"volume\":" + std::to_string(volume) + "}";
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

// Step-based CFTP for progress reporting
EMSCRIPTEN_KEEPALIVE
char* initCFTP() {
    // Generate extremal states
    makeExtremalState(cftp_minState, -1);  // Min: all boxes removed
    makeExtremalState(cftp_maxState, 1);   // Max: all boxes filled

    cftp_T = 1;
    cftp_initialized = true;
    cftp_coalesced = false;

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

    // If starting a new epoch (currentStep == 0), generate seeds and reset chains
    if (cftp_currentStep == 0) {
        cftp_seeds.resize(cftp_T);
        for (int i = 0; i < cftp_T; i++) {
            cftp_seeds[i] = xorshift64();
        }
        cftp_lower.cloneFrom(cftp_minState.grid);
        cftp_upper.cloneFrom(cftp_maxState.grid);
    }

    // Run a batch of steps
    int stepsToRun = std::min(cftp_stepsPerBatch, cftp_T - cftp_currentStep);
    for (int i = 0; i < stepsToRun; i++) {
        coupledStep(cftp_lower, cftp_upper, cftp_seeds[cftp_currentStep + i]);
    }
    cftp_currentStep += stepsToRun;

    // If epoch not complete, return progress
    if (cftp_currentStep < cftp_T) {
        std::string json = "{\"status\":\"in_progress\", \"T\":" + std::to_string(cftp_T) +
                          ", \"step\":" + std::to_string(cftp_currentStep) + "}";
        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;
    }

    // Epoch complete, reset step counter and check coalescence
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

    // Apply result to global state
    dimerGrid = cftp_lower.grid;

    // Calculate volume
    long long volume = 0;
    for (const auto& bt : blackTriangles) {
        if (bt.n >= gridMinN && bt.n <= gridMaxN && bt.j >= gridMinJ && bt.j <= gridMaxJ) {
            size_t gridIdx = getGridIdx(bt.n, bt.j);
            if (gridIdx < dimerGrid.size() && dimerGrid[gridIdx] == 0) {
                volume += bt.n;
            }
        }
    }

    // Reset CFTP state
    cftp_initialized = false;
    cftp_coalesced = false;

    std::string json = "{\"status\":\"finalized\", \"T\":" + std::to_string(cftp_T) + ", \"volume\":" + std::to_string(volume) + "}";
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

} // extern "C"
