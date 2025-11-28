/*
emcc 2025-11-28-c2-Glauber.cpp -o 2025-11-28-c2-Glauber.js \
 -s WASM=1 \
 -s "EXPORTED_FUNCTIONS=['_initPolygon','_performGlauberSteps','_exportDimers','_getDimerCounts','_getAcceptRate','_freeString','_getTotalSteps','_getFlipCount']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=32MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv 2025-11-28-c2-Glauber.js ../../js/

Features:
- Glauber dynamics for lozenge tilings of C2 (complex polygon) region
- Polygon defined by parameters b, c, d, e, h with a = b - d + e + c
- Dimer covering on triangular lattice (dual honeycomb)
- Real-time MCMC sampling
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
#include <functional>

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
const double SLOPE = 1.0 / std::sqrt(3.0);
const double DELTA_C = 2.0 / std::sqrt(3.0);

// Vertex on triangular lattice
struct Vertex {
    double x, y;
};

Vertex getVertex(int n, int j) {
    return { static_cast<double>(n), SLOPE * n + j * DELTA_C };
}

// Triangle centroid
struct TriangleCentroid {
    int n, j;
    double cx, cy;
};

// Right-facing triangle centroid (BLACK) - triangle ▷ with vertices (n,j), (n,j-1), (n+1,j-1)
TriangleCentroid getRightTriangleCentroid(int n, int j) {
    Vertex v1 = getVertex(n, j);
    Vertex v2 = getVertex(n, j - 1);
    Vertex v3 = getVertex(n + 1, j - 1);
    return { n, j, (v1.x + v2.x + v3.x) / 3.0, (v1.y + v2.y + v3.y) / 3.0 };
}

// Left-facing triangle centroid (WHITE) - triangle ◁ with vertices (n,j), (n+1,j), (n+1,j-1)
TriangleCentroid getLeftTriangleCentroid(int n, int j) {
    Vertex v1 = getVertex(n, j);
    Vertex v2 = getVertex(n + 1, j);
    Vertex v3 = getVertex(n + 1, j - 1);
    return { n, j, (v1.x + v2.x + v3.x) / 3.0, (v1.y + v2.y + v3.y) / 3.0 };
}

// Point in polygon test
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

// 6 directions on triangular lattice (dn, dj)
// Direction 0: right-down (along -30°): (1, -1)
// Direction 1: right (along +30°): (1, 0)
// Direction 2: up (vertical): (0, 1)
// Direction 3: up-left (along -30° backwards): (-1, 1)
// Direction 4: left (along +30° backwards): (-1, 0)
// Direction 5: down (vertical): (0, -1)
const int DIR_DN[6] = { 1,  1,  0, -1, -1,  0 };
const int DIR_DJ[6] = { -1, 0,  1,  1,  0, -1 };

// Global state
int B = 7, C = 6, D = 3, E = 8, H = 6;
int A = 18; // computed

std::vector<Vertex> polygonBoundary;

// Triangle storage
struct Triangle {
    int n, j;
    double cx, cy;
};

std::vector<Triangle> blackTriangles; // right-facing
std::vector<Triangle> whiteTriangles; // left-facing
std::unordered_map<long long, int> blackMap; // key -> index in blackTriangles
std::unordered_map<long long, int> whiteMap; // key -> index in whiteTriangles

// Triangular vertices inside polygon (for Glauber dynamics)
struct TriVertex {
    int n, j;
    double x, y;
};
std::vector<TriVertex> triangularVertices;

// Dimer representation
struct Dimer {
    int blackN, blackJ;
    int whiteN, whiteJ;
    int type; // 0=diagonal, 1=bottom, 2=left-vertical
};

std::vector<Dimer> currentDimers;
std::unordered_map<long long, int> dimerByBlack; // blackKey -> dimer index

// Statistics
long long totalSteps = 0;
long long flipCount = 0;
long long recentAccepted = 0;
long long recentTotal = 0;

// Key encoding
inline long long makeKey(int n, int j) {
    return (static_cast<long long>(n + 10000) << 20) | (j + 10000);
}

// Generate polygon boundary
void generatePolygonBoundary() {
    polygonBoundary.clear();
    A = B - D + E + C;

    int n = 0, j = 0;
    int dir = 0; // Start facing right-down (direction 0)

    auto move = [&](int steps) {
        for (int i = 0; i < steps; i++) {
            polygonBoundary.push_back(getVertex(n, j));
            n += DIR_DN[dir];
            j += DIR_DJ[dir];
        }
    };

    auto turnCCW = [&](int degrees) {
        int s = degrees / 60;
        dir = (dir + s + 6) % 6;
    };

    auto turnCW = [&](int degrees) {
        int s = degrees / 60;
        dir = (dir - s + 6) % 6;
    };

    // Trace boundary exactly as in original JS
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

    int searchMinN = static_cast<int>(minX) - 2;
    int searchMaxN = static_cast<int>(maxX) + 2;
    int searchMinJ = static_cast<int>((minY) / DELTA_C) - searchMaxN - 5;
    int searchMaxJ = static_cast<int>((maxY) / DELTA_C) + searchMaxN + 5;

    for (int n = searchMinN; n <= searchMaxN; n++) {
        for (int jj = searchMinJ; jj <= searchMaxJ; jj++) {
            // Check right-facing triangle
            auto rc = getRightTriangleCentroid(n, jj);
            if (pointInPolygon(rc.cx, rc.cy, polygonBoundary)) {
                int idx = blackTriangles.size();
                blackTriangles.push_back({n, jj, rc.cx, rc.cy});
                blackMap[makeKey(n, jj)] = idx;
            }

            // Check left-facing triangle
            auto lc = getLeftTriangleCentroid(n, jj);
            if (pointInPolygon(lc.cx, lc.cy, polygonBoundary)) {
                int idx = whiteTriangles.size();
                whiteTriangles.push_back({n, jj, lc.cx, lc.cy});
                whiteMap[makeKey(n, jj)] = idx;
            }

            // Check triangular vertex
            Vertex v = getVertex(n, jj);
            if (pointInPolygon(v.x, v.y, polygonBoundary)) {
                triangularVertices.push_back({n, jj, v.x, v.y});
            }
        }
    }
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

// Generate initial dimer covering using Hungarian algorithm
void generateInitialDimerCovering() {
    currentDimers.clear();
    dimerByBlack.clear();

    // Build adjacency
    std::vector<std::vector<int>> adj(blackTriangles.size());

    for (size_t bi = 0; bi < blackTriangles.size(); bi++) {
        int n = blackTriangles[bi].n;
        int jj = blackTriangles[bi].j;

        // 3 neighbors: (n,j), (n,j-1), (n-1,j)
        int neighbors[3][2] = {{n, jj}, {n, jj-1}, {n-1, jj}};
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

            int dimerIdx = currentDimers.size();
            currentDimers.push_back({blackN, blackJ, whiteN, whiteJ, type});
            dimerByBlack[makeKey(blackN, blackJ)] = dimerIdx;
        }
    }
}

// Get hex edges around triangular vertex (n, j)
struct HexEdge {
    int blackN, blackJ;
    int whiteN, whiteJ;
    int type;
};

void getHexEdgesAroundVertex(int n, int jj, HexEdge edges[6]) {
    // 6 edges around vertex (n,j) - exactly as in original JS
    edges[0] = {n, jj+1, n, jj, 1};         // R(n,j+1) - L(n,j): bottom edge
    edges[1] = {n, jj, n, jj, 0};           // R(n,j) - L(n,j): diagonal
    edges[2] = {n, jj, n-1, jj, 2};         // R(n,j) - L(n-1,j): left vertical
    edges[3] = {n-1, jj+1, n-1, jj, 1};     // R(n-1,j+1) - L(n-1,j): bottom
    edges[4] = {n-1, jj+1, n-1, jj+1, 0};   // R(n-1,j+1) - L(n-1,j+1): diagonal
    edges[5] = {n, jj+1, n-1, jj+1, 2};     // R(n,j+1) - L(n-1,j+1): left vertical
}

// Check if dimer exists
bool dimerExists(int blackN, int blackJ, int whiteN, int whiteJ) {
    auto it = dimerByBlack.find(makeKey(blackN, blackJ));
    if (it == dimerByBlack.end()) return false;
    const Dimer& d = currentDimers[it->second];
    return d.whiteN == whiteN && d.whiteJ == whiteJ;
}

// Perform Glauber rotation at vertex
bool performRotation(int n, int jj) {
    HexEdge edges[6];
    getHexEdgesAroundVertex(n, jj, edges);

    std::vector<int> coveredIdx;
    std::vector<int> uncoveredIdx;

    for (int i = 0; i < 6; i++) {
        // Check if both triangles exist
        if (blackMap.find(makeKey(edges[i].blackN, edges[i].blackJ)) == blackMap.end()) continue;
        if (whiteMap.find(makeKey(edges[i].whiteN, edges[i].whiteJ)) == whiteMap.end()) continue;

        if (dimerExists(edges[i].blackN, edges[i].blackJ, edges[i].whiteN, edges[i].whiteJ)) {
            coveredIdx.push_back(i);
        } else {
            uncoveredIdx.push_back(i);
        }
    }

    if (coveredIdx.size() != 3 || uncoveredIdx.size() != 3) {
        return false;
    }

    // Remove covered dimers from dimerByBlack
    for (int idx : coveredIdx) {
        long long key = makeKey(edges[idx].blackN, edges[idx].blackJ);
        dimerByBlack.erase(key);
    }

    // Add uncovered edges as new dimers
    for (int idx : uncoveredIdx) {
        // Find the black triangle
        auto blackIt = blackMap.find(makeKey(edges[idx].blackN, edges[idx].blackJ));
        auto whiteIt = whiteMap.find(makeKey(edges[idx].whiteN, edges[idx].whiteJ));

        if (blackIt != blackMap.end() && whiteIt != whiteMap.end()) {
            Dimer newDimer = {
                edges[idx].blackN, edges[idx].blackJ,
                edges[idx].whiteN, edges[idx].whiteJ,
                edges[idx].type
            };

            // Find a slot to reuse or add new
            bool found = false;
            for (int ci : coveredIdx) {
                long long oldKey = makeKey(edges[ci].blackN, edges[ci].blackJ);
                for (size_t di = 0; di < currentDimers.size(); di++) {
                    if (makeKey(currentDimers[di].blackN, currentDimers[di].blackJ) == oldKey) {
                        currentDimers[di] = newDimer;
                        dimerByBlack[makeKey(newDimer.blackN, newDimer.blackJ)] = di;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            if (!found) {
                int di = currentDimers.size();
                currentDimers.push_back(newDimer);
                dimerByBlack[makeKey(newDimer.blackN, newDimer.blackJ)] = di;
            }
        }
    }

    // Rebuild dimerByBlack to ensure consistency
    dimerByBlack.clear();
    for (size_t i = 0; i < currentDimers.size(); i++) {
        dimerByBlack[makeKey(currentDimers[i].blackN, currentDimers[i].blackJ)] = i;
    }

    return true;
}

// Perform Glauber steps
int performGlauberStepsInternal(int numSteps) {
    int accepted = 0;

    if (triangularVertices.empty()) return 0;

    for (int step = 0; step < numSteps; step++) {
        int idx = getRandomInt(triangularVertices.size());
        const TriVertex& v = triangularVertices[idx];

        // Count covered edges
        HexEdge edges[6];
        getHexEdgesAroundVertex(v.n, v.j, edges);

        int coveredCount = 0;
        int validEdges = 0;
        for (int i = 0; i < 6; i++) {
            if (blackMap.find(makeKey(edges[i].blackN, edges[i].blackJ)) == blackMap.end()) continue;
            if (whiteMap.find(makeKey(edges[i].whiteN, edges[i].whiteJ)) == whiteMap.end()) continue;
            validEdges++;
            if (dimerExists(edges[i].blackN, edges[i].blackJ, edges[i].whiteN, edges[i].whiteJ)) {
                coveredCount++;
            }
        }

        // Only rotate if all 6 edges are valid and exactly 3 are covered
        if (validEdges == 6 && coveredCount == 3) {
            if (getRandom01() < 0.5) {
                if (performRotation(v.n, v.j)) {
                    accepted++;
                }
            }
        }
    }

    totalSteps += numSteps;
    flipCount += accepted;
    recentAccepted += accepted;
    recentTotal += numSteps;

    return accepted;
}

// Export functions
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* initPolygon(int b, int c, int d, int e, int h) {
    try {
        if (b < 1 || b > 50) throw std::invalid_argument("b must be between 1 and 50");
        if (c < 1 || c > 50) throw std::invalid_argument("c must be between 1 and 50");
        if (d < 1 || d > 50) throw std::invalid_argument("d must be between 1 and 50");
        if (e < 1 || e > 50) throw std::invalid_argument("e must be between 1 and 50");
        if (h < 1 || h > 50) throw std::invalid_argument("h must be between 1 and 50");

        B = b; C = c; D = d; E = e; H = h;
        A = B - D + E + C;

        totalSteps = 0;
        flipCount = 0;
        recentAccepted = 0;
        recentTotal = 0;

        generatePolygonBoundary();
        findTrianglesInPolygon();
        generateInitialDimerCovering();

        // Count dimer types
        int type0 = 0, type1 = 0, type2 = 0;
        for (const auto& dm : currentDimers) {
            if (dm.type == 0) type0++;
            else if (dm.type == 1) type1++;
            else if (dm.type == 2) type2++;
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
            ",\"type0\":" + std::to_string(type0) +
            ",\"type1\":" + std::to_string(type1) +
            ",\"type2\":" + std::to_string(type2) +
            "}";

        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& ex) {
        std::string errorMsg = "{\"error\":\"" + std::string(ex.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* performGlauberSteps(int numSteps) {
    try {
        if (numSteps < 1 || numSteps > 10000000) {
            throw std::invalid_argument("numSteps must be between 1 and 10000000");
        }

        int accepted = performGlauberStepsInternal(numSteps);

        // Count dimer types
        int type0 = 0, type1 = 0, type2 = 0;
        for (const auto& dm : currentDimers) {
            if (dm.type == 0) type0++;
            else if (dm.type == 1) type1++;
            else if (dm.type == 2) type2++;
        }

        std::string json = "{\"status\":\"complete\""
            ",\"accepted\":" + std::to_string(accepted) +
            ",\"totalSteps\":" + std::to_string(totalSteps) +
            ",\"flipCount\":" + std::to_string(flipCount) +
            ",\"type0\":" + std::to_string(type0) +
            ",\"type1\":" + std::to_string(type1) +
            ",\"type2\":" + std::to_string(type2) +
            "}";

        char* out = (char*)malloc(json.size() + 1);
        strcpy(out, json.c_str());
        return out;

    } catch (const std::exception& ex) {
        std::string errorMsg = "{\"error\":\"" + std::string(ex.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* exportDimers() {
    try {
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

    } catch (const std::exception& ex) {
        std::string errorMsg = "{\"error\":\"" + std::string(ex.what()) + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        strcpy(out, errorMsg.c_str());
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
char* getDimerCounts() {
    int type0 = 0, type1 = 0, type2 = 0;
    for (const auto& dm : currentDimers) {
        if (dm.type == 0) type0++;
        else if (dm.type == 1) type1++;
        else if (dm.type == 2) type2++;
    }

    std::string json = "{\"type0\":" + std::to_string(type0) +
                       ",\"type1\":" + std::to_string(type1) +
                       ",\"type2\":" + std::to_string(type2) +
                       ",\"total\":" + std::to_string(currentDimers.size()) + "}";

    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
double getAcceptRate() {
    if (recentTotal == 0) return 0.0;
    double rate = static_cast<double>(recentAccepted) / static_cast<double>(recentTotal);
    if (recentTotal > 100000) {
        recentAccepted = 0;
        recentTotal = 0;
    }
    return rate;
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
void freeString(char* str) {
    free(str);
}

} // extern "C"
