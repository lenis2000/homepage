/*
emcc 2025-12-05-ultimate-domino.cpp -o 2025-12-05-ultimate-domino.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initFromVertices','_performGlauberSteps','_exportEdges','_getTotalSteps','_getFlipCount','_freeString','_initCFTP','_stepCFTP','_finalizeCFTP','_repairRegion','_malloc','_free']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','setValue','getValue']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=32MB \
  -s STACK_SIZE=1MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math
mv 2025-12-05-ultimate-domino.js ../../js/

Ultimate Domino Tiling Sampler - Clean Graph Model

Data model:
- Region: Set of vertices (x,y) on Z^2
- Matching: Set of edges, each edge connects two adjacent vertices
- Edge: horizontal (x,y)-(x+1,y) or vertical (x,y)-(x,y+1)
- Valid region: even number of vertices + perfect matching exists
- Glauber: pick face, if 2 opposite edges in matching, flip them
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

// ============================================================================
// Fast RNG
// ============================================================================

static uint64_t rng_state = 12345678901234567ULL;

inline uint64_t xorshift64() {
    rng_state ^= rng_state >> 12;
    rng_state ^= rng_state << 25;
    rng_state ^= rng_state >> 27;
    return rng_state * 0x2545F4914F6CDD1DULL;
}

inline uint32_t fastRandomRange(uint32_t range) {
    uint64_t random64 = xorshift64();
    return (uint32_t)(((unsigned __int128)random64 * range) >> 64);
}

inline int getRandomInt(int n) {
    return (int)fastRandomRange((uint32_t)n);
}

// ============================================================================
// Data Structures
// ============================================================================

// Vertex key for hash maps
inline long long vkey(int x, int y) {
    return ((long long)(x + 100000) << 20) | (long long)(y + 100000);
}

// Edge: stored as the "lower-left" vertex + direction
// For horizontal edge (x,y)-(x+1,y): store (x,y,0)
// For vertical edge (x,y)-(x,y+1): store (x,y,1)
struct Edge {
    int x, y;
    int dir;  // 0 = horizontal, 1 = vertical
};

inline long long ekey(int x, int y, int dir) {
    return ((long long)(x + 100000) << 21) | ((long long)(y + 100000) << 1) | dir;
}

// Region vertices
std::unordered_set<long long> vertices;
int vertexCount = 0;

// Grid bounds
int minX, maxX, minY, maxY;

// Matching: set of edges in the current tiling
std::unordered_set<long long> matching;

// List of faces (2x2 squares) that are fully inside the region
// Face at (x,y) has corners (x,y), (x+1,y), (x,y+1), (x+1,y+1)
struct Face {
    int x, y;
};
std::vector<Face> faces;

// Stats
long long totalSteps = 0;
long long flipCount = 0;

// ============================================================================
// Dinic's Algorithm for Perfect Matching
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
        if (level[v] + 1 != level[edge.to] || edge.cap - edge.flow == 0) continue;
        int push = dfs_flow(edge.to, t, std::min(pushed, edge.cap - edge.flow));
        if (push == 0) continue;
        edge.flow += push;
        flowAdj[edge.to][edge.rev].flow -= push;
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
// Check if vertex is in region
// ============================================================================

inline bool hasVertex(int x, int y) {
    return vertices.count(vkey(x, y)) > 0;
}

// ============================================================================
// Check if edge can exist (both endpoints in region)
// ============================================================================

inline bool canHaveEdge(int x, int y, int dir) {
    if (dir == 0) {
        // Horizontal: (x,y) and (x+1,y)
        return hasVertex(x, y) && hasVertex(x + 1, y);
    } else {
        // Vertical: (x,y) and (x,y+1)
        return hasVertex(x, y) && hasVertex(x, y + 1);
    }
}

// ============================================================================
// Build face list
// ============================================================================

void buildFaces() {
    faces.clear();
    std::unordered_set<long long> checked;

    for (long long vk : vertices) {
        int x = (int)((vk >> 20) - 100000);
        int y = (int)((vk & ((1LL << 20) - 1)) - 100000);

        // Check if this vertex is top-left of a complete face
        // Face needs all 4 corners: (x,y), (x+1,y), (x,y+1), (x+1,y+1)
        if (hasVertex(x + 1, y) && hasVertex(x, y + 1) && hasVertex(x + 1, y + 1)) {
            long long fk = vkey(x, y);
            if (checked.count(fk) == 0) {
                checked.insert(fk);
                faces.push_back({x, y});
            }
        }
    }
}

// ============================================================================
// Find Perfect Matching using Dinic
// ============================================================================

// We need bipartite matching on checkerboard coloring
// Black vertices: (x+y) % 2 == 0
// White vertices: (x+y) % 2 == 1

std::vector<std::pair<int,int>> blackVerts, whiteVerts;
std::unordered_map<long long, int> blackIdx, whiteIdx;

bool findPerfectMatching() {
    matching.clear();

    // Separate vertices by color
    blackVerts.clear();
    whiteVerts.clear();
    blackIdx.clear();
    whiteIdx.clear();

    for (long long vk : vertices) {
        int x = (int)((vk >> 20) - 100000);
        int y = (int)((vk & ((1LL << 20) - 1)) - 100000);

        if ((x + y) % 2 == 0) {
            blackIdx[vk] = blackVerts.size();
            blackVerts.push_back({x, y});
        } else {
            whiteIdx[vk] = whiteVerts.size();
            whiteVerts.push_back({x, y});
        }
    }

    if (blackVerts.size() != whiteVerts.size()) {
        return false;
    }

    int numBlack = blackVerts.size();
    int numWhite = whiteVerts.size();
    int S = numBlack + numWhite;
    int T = S + 1;
    int numNodes = T + 1;

    flowAdj.assign(numNodes, std::vector<FlowEdge>());
    level.assign(numNodes, -1);
    ptr.assign(numNodes, 0);

    // Source -> Black
    for (int i = 0; i < numBlack; i++) {
        add_flow_edge(S, i, 1);
    }

    // White -> Sink
    for (int j = 0; j < numWhite; j++) {
        add_flow_edge(numBlack + j, T, 1);
    }

    // Black -> adjacent White
    int dx[] = {1, -1, 0, 0};
    int dy[] = {0, 0, 1, -1};

    for (int i = 0; i < numBlack; i++) {
        int bx = blackVerts[i].first;
        int by = blackVerts[i].second;

        for (int d = 0; d < 4; d++) {
            int wx = bx + dx[d];
            int wy = by + dy[d];

            auto it = whiteIdx.find(vkey(wx, wy));
            if (it != whiteIdx.end()) {
                add_flow_edge(i, numBlack + it->second, 1);
            }
        }
    }

    int matchSize = dinic(S, T);

    if (matchSize != numBlack) {
        return false;
    }

    // Extract matching edges
    for (int i = 0; i < numBlack; i++) {
        int bx = blackVerts[i].first;
        int by = blackVerts[i].second;

        for (const auto& edge : flowAdj[i]) {
            if (edge.to >= numBlack && edge.to < numBlack + numWhite && edge.flow > 0) {
                int j = edge.to - numBlack;
                int wx = whiteVerts[j].first;
                int wy = whiteVerts[j].second;

                // Determine edge
                if (wx == bx + 1 && wy == by) {
                    // Horizontal edge, black on left
                    matching.insert(ekey(bx, by, 0));
                } else if (wx == bx - 1 && wy == by) {
                    // Horizontal edge, white on left
                    matching.insert(ekey(wx, wy, 0));
                } else if (wy == by + 1 && wx == bx) {
                    // Vertical edge, black on bottom
                    matching.insert(ekey(bx, by, 1));
                } else if (wy == by - 1 && wx == bx) {
                    // Vertical edge, white on bottom
                    matching.insert(ekey(wx, wy, 1));
                }
                break;
            }
        }
    }

    return true;
}

// ============================================================================
// Glauber Dynamics
// ============================================================================

// Check face state
// Returns: 0 = not flippable, 1 = has horizontal edges, 2 = has vertical edges
int getFaceState(int fx, int fy) {
    // Face has 4 edges:
    // Top: (fx, fy+1) - (fx+1, fy+1) horizontal at (fx, fy+1, 0)
    // Bottom: (fx, fy) - (fx+1, fy) horizontal at (fx, fy, 0)
    // Left: (fx, fy) - (fx, fy+1) vertical at (fx, fy, 1)
    // Right: (fx+1, fy) - (fx+1, fy+1) vertical at (fx+1, fy, 1)

    bool hasTop = matching.count(ekey(fx, fy + 1, 0)) > 0;
    bool hasBot = matching.count(ekey(fx, fy, 0)) > 0;
    bool hasLeft = matching.count(ekey(fx, fy, 1)) > 0;
    bool hasRight = matching.count(ekey(fx + 1, fy, 1)) > 0;

    if (hasTop && hasBot && !hasLeft && !hasRight) {
        return 1;  // Two horizontal edges
    }
    if (hasLeft && hasRight && !hasTop && !hasBot) {
        return 2;  // Two vertical edges
    }
    return 0;  // Not flippable
}

void flipFace(int fx, int fy) {
    int state = getFaceState(fx, fy);
    if (state == 0) return;

    if (state == 1) {
        // Remove horizontal, add vertical
        matching.erase(ekey(fx, fy + 1, 0));
        matching.erase(ekey(fx, fy, 0));
        matching.insert(ekey(fx, fy, 1));
        matching.insert(ekey(fx + 1, fy, 1));
    } else {
        // Remove vertical, add horizontal
        matching.erase(ekey(fx, fy, 1));
        matching.erase(ekey(fx + 1, fy, 1));
        matching.insert(ekey(fx, fy + 1, 0));
        matching.insert(ekey(fx, fy, 0));
    }
}

void performGlauberStepsInternal(int numSteps) {
    if (faces.empty()) return;

    for (int s = 0; s < numSteps; s++) {
        int idx = getRandomInt(faces.size());
        const Face& f = faces[idx];

        int state = getFaceState(f.x, f.y);
        if (state != 0) {
            flipFace(f.x, f.y);
            flipCount++;
        }
        totalSteps++;
    }
}

// ============================================================================
// CFTP
// ============================================================================

std::unordered_set<long long> cftpMin, cftpMax;
std::vector<uint64_t> cftpSeeds;
int cftpEpochSize = 1;
int cftpTotalEpochs = 0;
bool cftpInitialized = false;

int getFaceStateOn(const std::unordered_set<long long>& m, int fx, int fy) {
    bool hasTop = m.count(ekey(fx, fy + 1, 0)) > 0;
    bool hasBot = m.count(ekey(fx, fy, 0)) > 0;
    bool hasLeft = m.count(ekey(fx, fy, 1)) > 0;
    bool hasRight = m.count(ekey(fx + 1, fy, 1)) > 0;

    if (hasTop && hasBot && !hasLeft && !hasRight) return 1;
    if (hasLeft && hasRight && !hasTop && !hasBot) return 2;
    return 0;
}

void flipFaceOn(std::unordered_set<long long>& m, int fx, int fy, int state) {
    if (state == 1) {
        m.erase(ekey(fx, fy + 1, 0));
        m.erase(ekey(fx, fy, 0));
        m.insert(ekey(fx, fy, 1));
        m.insert(ekey(fx + 1, fy, 1));
    } else if (state == 2) {
        m.erase(ekey(fx, fy, 1));
        m.erase(ekey(fx + 1, fy, 1));
        m.insert(ekey(fx, fy + 1, 0));
        m.insert(ekey(fx, fy, 0));
    }
}

void makeExtremalState(std::unordered_set<long long>& state, int direction) {
    state = matching;

    bool changed = true;
    int maxIter = 10000;
    int iter = 0;

    while (changed && iter < maxIter) {
        changed = false;
        iter++;

        for (const Face& f : faces) {
            int st = getFaceStateOn(state, f.x, f.y);
            // direction < 0: prefer horizontal (state 1)
            // direction > 0: prefer vertical (state 2)
            if ((direction < 0 && st == 2) || (direction > 0 && st == 1)) {
                flipFaceOn(state, f.x, f.y, st);
                changed = true;
            }
        }
    }
}

void cftpStep(uint64_t seed) {
    if (faces.empty()) return;

    rng_state = seed;
    int idx = getRandomInt(faces.size());
    const Face& f = faces[idx];

    int stMin = getFaceStateOn(cftpMin, f.x, f.y);
    if (stMin != 0) {
        flipFaceOn(cftpMin, f.x, f.y, stMin);
    }

    int stMax = getFaceStateOn(cftpMax, f.x, f.y);
    if (stMax != 0) {
        flipFaceOn(cftpMax, f.x, f.y, stMax);
    }
}

bool cftpCoalesced() {
    return cftpMin == cftpMax;
}

// ============================================================================
// Export
// ============================================================================

std::string exportEdgesJson() {
    std::string json = "{\"edges\":[";
    bool first = true;

    for (long long ek : matching) {
        int x = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int y = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);

        if (!first) json += ",";
        first = false;

        if (dir == 0) {
            // Horizontal: (x,y) to (x+1,y)
            json += "{\"x1\":" + std::to_string(x) +
                    ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x + 1) +
                    ",\"y2\":" + std::to_string(y) + "}";
        } else {
            // Vertical: (x,y) to (x,y+1)
            json += "{\"x1\":" + std::to_string(x) +
                    ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x) +
                    ",\"y2\":" + std::to_string(y + 1) + "}";
        }
    }

    json += "],\"totalSteps\":" + std::to_string(totalSteps) +
            ",\"flipCount\":" + std::to_string(flipCount) + "}";
    return json;
}

// ============================================================================
// WASM Exports
// ============================================================================

extern "C" {

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
char* initFromVertices(int* data, int count) {
    vertices.clear();
    matching.clear();
    faces.clear();
    totalSteps = 0;
    flipCount = 0;
    cftpInitialized = false;

    if (count == 0) {
        std::string json = "{\"status\":\"empty\",\"vertexCount\":0}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    minX = maxX = data[0];
    minY = maxY = data[1];

    for (int i = 0; i < count; i++) {
        int x = data[i * 2];
        int y = data[i * 2 + 1];
        vertices.insert(vkey(x, y));
        minX = std::min(minX, x);
        maxX = std::max(maxX, x);
        minY = std::min(minY, y);
        maxY = std::max(maxY, y);
    }

    vertexCount = vertices.size();

    // Check parity
    if (vertexCount % 2 != 0) {
        std::string json = "{\"status\":\"invalid\",\"reason\":\"odd\",\"vertexCount\":" +
                          std::to_string(vertexCount) + "}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Find perfect matching
    if (!findPerfectMatching()) {
        std::string json = "{\"status\":\"invalid\",\"reason\":\"no_matching\",\"vertexCount\":" +
                          std::to_string(vertexCount) + "}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Build faces for Glauber
    buildFaces();

    std::string json = "{\"status\":\"valid\",\"vertexCount\":" + std::to_string(vertexCount) +
                      ",\"edgeCount\":" + std::to_string(matching.size()) +
                      ",\"faceCount\":" + std::to_string(faces.size()) +
                      "," + exportEdgesJson().substr(1);

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* performGlauberSteps(int numSteps) {
    performGlauberStepsInternal(numSteps);

    std::string json = exportEdgesJson();
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* exportEdges() {
    std::string json = exportEdgesJson();
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
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
void initCFTP() {
    if (vertices.empty() || faces.empty()) return;

    makeExtremalState(cftpMin, -1);  // Prefer horizontal
    makeExtremalState(cftpMax, +1);  // Prefer vertical

    cftpSeeds.clear();
    cftpEpochSize = 1;
    cftpTotalEpochs = 0;
    cftpInitialized = true;
}

EMSCRIPTEN_KEEPALIVE
int stepCFTP() {
    if (!cftpInitialized) return -1;

    // Generate new seeds for the earlier time period
    // Seeds represent times: new seeds are for -2T to -T, old seeds for -T to 0
    size_t oldSize = cftpSeeds.size();
    std::vector<uint64_t> newSeeds(cftpEpochSize);
    for (size_t i = 0; i < cftpEpochSize; i++) {
        newSeeds[i] = xorshift64();
    }

    // Prepend new seeds (they represent earlier times)
    cftpSeeds.insert(cftpSeeds.begin(), newSeeds.begin(), newSeeds.end());

    // RESET to extremal states before applying the chain
    makeExtremalState(cftpMin, -1);  // Prefer horizontal
    makeExtremalState(cftpMax, +1);  // Prefer vertical

    // Apply all seeds from earliest to latest (time -T to 0)
    for (size_t i = 0; i < cftpSeeds.size(); i++) {
        cftpStep(cftpSeeds[i]);
    }

    cftpTotalEpochs++;

    if (cftpCoalesced()) {
        return 0;  // Done
    }

    cftpEpochSize *= 2;
    return 1;  // Continue
}

EMSCRIPTEN_KEEPALIVE
char* finalizeCFTP() {
    if (!cftpInitialized) {
        std::string json = "{\"status\":\"error\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    matching = cftpMin;
    cftpInitialized = false;

    std::string json = "{\"status\":\"success\",\"epochs\":" + std::to_string(cftpTotalEpochs) +
                      "," + exportEdgesJson().substr(1);
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* repairRegion() {
    // For now, just return empty - proper repair would add vertices
    std::string json = "{\"status\":\"no_repair\",\"addedCount\":0,\"vertices\":[]}";
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

} // extern "C"
