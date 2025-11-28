/*
emcc 2025-11-28-c2-Glauber.cpp -o 2025-11-28-c2-Glauber.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initPolygon','_performGlauberSteps','_exportDimers','_getTotalSteps','_getFlipCount','_getAcceptRate','_freeString']" \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=32MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math
mv 2025-11-28-c2-Glauber.js ../../js/

C++ translation of the working JavaScript implementation for:
- Glauber dynamics for lozenge tilings of C2 (complex polygon) region
- Polygon defined by parameters b, c, d, e, h with a = b - d + e + c
- Dimer covering on triangular lattice
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

// Perform rotation at vertex - O(1) grid updates only
bool performRotation(int n, int j) {
    HexEdge edges[6];
    getHexEdgesAroundVertex(n, j, edges);

    int coveredIdx[3];
    int uncoveredIdx[3];
    int coveredCount = 0;
    int uncoveredCount = 0;

    for (int i = 0; i < 6; i++) {
        if (dimerExists(edges[i].blackN, edges[i].blackJ, edges[i].whiteN, edges[i].whiteJ)) {
            if (coveredCount < 3) coveredIdx[coveredCount++] = i;
            else return false; // More than 3 covered
        } else {
            if (uncoveredCount < 3) uncoveredIdx[uncoveredCount++] = i;
            else return false; // More than 3 uncovered
        }
    }

    if (coveredCount != 3 || uncoveredCount != 3) {
        return false;
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

    return true;
}

// Perform Glauber steps (exactly as in JS step function)
void performGlauberStepsInternal(int numSteps) {
    if (triangularVertices.empty()) return;

    for (int s = 0; s < numSteps; s++) {
        totalSteps++;

        int idx = getRandomInt(triangularVertices.size());
        const TriVertex& v = triangularVertices[idx];

        int coveredCount = countCoveredEdges(v.n, v.j);

        if (coveredCount == 3 && getRandom01() < 0.5) {
            if (performRotation(v.n, v.j)) {
                flipCount++;
            }
        }
    }
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
void freeString(char* str) {
    free(str);
}

} // extern "C"
