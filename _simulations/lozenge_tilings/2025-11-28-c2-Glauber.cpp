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
    int searchMinJ = static_cast<int>(std::floor(minY / deltaC)) - searchMaxN - 5;
    int searchMaxJ = static_cast<int>(std::ceil(maxY / deltaC)) + searchMaxN + 5;

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

// Generate initial dimer covering using Hungarian algorithm (exactly as in JS)
void generateInitialDimerCovering() {
    currentDimers.clear();

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

    // Hungarian matching
    std::vector<int> matchWhiteToBlack(whiteTriangles.size(), -1);
    std::vector<int> matchBlackToWhite(blackTriangles.size(), -1);

    std::function<bool(int, std::unordered_set<int>&)> findAugmentingPath;
    findAugmentingPath = [&](int blackIdx, std::unordered_set<int>& visited) -> bool {
        for (int whiteIdx : adj[blackIdx]) {
            if (visited.count(whiteIdx)) continue;
            visited.insert(whiteIdx);

            if (matchWhiteToBlack[whiteIdx] == -1 ||
                findAugmentingPath(matchWhiteToBlack[whiteIdx], visited)) {
                matchWhiteToBlack[whiteIdx] = blackIdx;
                matchBlackToWhite[blackIdx] = whiteIdx;
                return true;
            }
        }
        return false;
    };

    for (size_t bi = 0; bi < blackTriangles.size(); bi++) {
        std::unordered_set<int> visited;
        findAugmentingPath(bi, visited);
    }

    // Build dimer list
    for (size_t bi = 0; bi < blackTriangles.size(); bi++) {
        int wi = matchBlackToWhite[bi];
        if (wi >= 0) {
            int blackN = blackTriangles[bi].n;
            int blackJ = blackTriangles[bi].j;
            int whiteN = whiteTriangles[wi].n;
            int whiteJ = whiteTriangles[wi].j;
            int type = getDimerType(blackN, blackJ, whiteN, whiteJ);
            currentDimers.push_back({blackN, blackJ, whiteN, whiteJ, type});
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

// Check if dimer exists (exactly as in JS dimerExists)
bool dimerExists(int blackN, int blackJ, int whiteN, int whiteJ) {
    for (const auto& d : currentDimers) {
        if (d.blackN == blackN && d.blackJ == blackJ &&
            d.whiteN == whiteN && d.whiteJ == whiteJ) {
            return true;
        }
    }
    return false;
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

// Perform rotation at vertex (exactly as in JS performRotation)
bool performRotation(int n, int j) {
    HexEdge edges[6];
    getHexEdgesAroundVertex(n, j, edges);

    std::vector<int> coveredIdx;
    std::vector<int> uncoveredIdx;

    for (int i = 0; i < 6; i++) {
        if (dimerExists(edges[i].blackN, edges[i].blackJ, edges[i].whiteN, edges[i].whiteJ)) {
            coveredIdx.push_back(i);
        } else {
            uncoveredIdx.push_back(i);
        }
    }

    if (coveredIdx.size() != 3 || uncoveredIdx.size() != 3) {
        return false;
    }

    // Remove covered dimers (exactly as in JS)
    for (int idx : coveredIdx) {
        for (auto it = currentDimers.begin(); it != currentDimers.end(); ) {
            if (it->blackN == edges[idx].blackN && it->blackJ == edges[idx].blackJ &&
                it->whiteN == edges[idx].whiteN && it->whiteJ == edges[idx].whiteJ) {
                it = currentDimers.erase(it);
                break;
            } else {
                ++it;
            }
        }
    }

    // Add uncovered edges as new dimers (exactly as in JS)
    for (int idx : uncoveredIdx) {
        // Check if both triangles exist
        auto blackIt = blackMap.find(makeKey(edges[idx].blackN, edges[idx].blackJ));
        auto whiteIt = whiteMap.find(makeKey(edges[idx].whiteN, edges[idx].whiteJ));

        if (blackIt != blackMap.end() && whiteIt != whiteMap.end()) {
            currentDimers.push_back({
                edges[idx].blackN, edges[idx].blackJ,
                edges[idx].whiteN, edges[idx].whiteJ,
                edges[idx].type
            });
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

    // Calculate initial volume
    long long volume = 0;
    for (const auto& dm : currentDimers) {
        if (dm.type == 0) {
            volume += dm.blackN;
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
    long long volume = 0;
    for (const auto& dm : currentDimers) {
        if (dm.type == 0) {
            volume += dm.blackN;
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
