/*
emcc 2025-12-05-ultimate-domino.cpp -o 2025-12-05-ultimate-domino.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initFromVertices','_performGlauberSteps','_performGlauberStepsBinary','_exportEdges','_getTotalSteps','_getFlipCount','_freeString','_initCFTP','_stepCFTP','_finalizeCFTP','_getCFTPMinState','_getCFTPMaxState','_getMinTiling','_getMaxTiling','_getHeights','_getRegionMask','_repairRegion','_initFluctuationsCFTP','_stepFluctuationsCFTP','_exportFluctuationSample','_loadDimersForLoops','_filterLoopsBySize','_getAllHolesInfo','_adjustHoleWindingExport','_initHoleWindingsExport','_malloc','_free']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','setValue','getValue','HEAP32']" \
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
#include <set>
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
// CFTP with Height Function Monotone Coupling (Systematic Sweeps)
// ============================================================================
//
// For domino tilings, we use the height function partial order:
// - Height defined at vertices (corners of cells)
// - Tiling A ≤ B iff height_A(v) ≤ height_B(v) at all vertices
// - MIN state: tiling with minimum heights (computed by local optimization)
// - MAX state: tiling with maximum heights
// - Monotone coupling: same random choices applied to both states
//
// SYSTEMATIC SWEEPS: Each "step" is a complete pass through ALL faces.
// - One sweep = visit every face exactly once
// - For each face, generate random target (horizontal/vertical)
// - Apply same target to both MIN and MAX chains
// - T counts number of sweeps, doubling each epoch

std::unordered_set<long long> cftpMin, cftpMax;
std::vector<uint64_t> cftpSweepSeeds;  // One seed per sweep
int cftpEpochSize = 1;  // Number of sweeps in current epoch
int cftpTotalEpochs = 0;
bool cftpInitialized = false;

// ============================================================================
// Double CFTP for Fluctuations (2 independent pairs)
// ============================================================================
// Pair 0: fluctMin0, fluctMax0 with seeds fluctSeeds0
// Pair 1: fluctMin1, fluctMax1 with seeds fluctSeeds1

std::unordered_set<long long> fluctMin0, fluctMax0;  // Pair 0 chains
std::unordered_set<long long> fluctMin1, fluctMax1;  // Pair 1 chains
std::vector<uint64_t> fluctSeeds0, fluctSeeds1;      // Separate seeds for independence
int fluctEpochSize0 = 1, fluctEpochSize1 = 1;
int fluctTotalEpochs = 0;
bool fluctCoalesced0 = false, fluctCoalesced1 = false;
bool fluctInitialized = false;
uint64_t fluctRngState0 = 0, fluctRngState1 = 0;     // Separate RNG states

// For loop detection
std::vector<std::array<int, 3>> loopDimers0, loopDimers1;  // {x, y, dir}
std::vector<int> loopSizes;  // Size of loop containing each dimer
bool loopsDetected = false;

// Height function at vertex (i,j) - corner between cells
// Convention: going counterclockwise around a BLACK cell (x+y even),
// height increases by 1 on unmatched edges, decreases by 3 on matched edges
// (total change = 4 - 4*covered = 0 if covered by domino)
std::unordered_map<long long, int> heights;

// Compute height at all vertices for a given matching
void computeHeights(const std::unordered_set<long long>& m,
                    std::unordered_map<long long, int>& h) {
    h.clear();
    if (vertices.empty()) return;

    // BFS from corner (minX, minY), which has height 0
    h[vkey(minX, minY)] = 0;
    std::queue<std::pair<int,int>> q;
    q.push({minX, minY});

    while (!q.empty()) {
        auto [vx, vy] = q.front();
        q.pop();
        int curH = h[vkey(vx, vy)];

        // Try moving to adjacent vertices (corners)
        // Each move crosses one edge of the cell grid

        // Right: cross vertical edge at (vx, vy-1) to (vx, vy) if exists
        // or at (vx, vy) to (vx, vy+1)
        int dirs[4][2] = {{1,0}, {-1,0}, {0,1}, {0,-1}};

        for (int d = 0; d < 4; d++) {
            int nx = vx + dirs[d][0];
            int ny = vy + dirs[d][1];
            long long nk = vkey(nx, ny);

            if (h.count(nk)) continue;

            // Check if this corner is adjacent to our region
            bool adjacent = false;
            // Corner (nx,ny) touches cells (nx-1,ny-1), (nx,ny-1), (nx-1,ny), (nx,ny)
            for (int cx = nx-1; cx <= nx; cx++) {
                for (int cy = ny-1; cy <= ny; cy++) {
                    if (hasVertex(cx, cy)) adjacent = true;
                }
            }
            if (!adjacent) continue;

            // Compute height change when crossing from (vx,vy) to (nx,ny)
            int dh = 0;

            if (dirs[d][0] == 1) { // Moving right
                // Cross vertical edge. Which cell are we going around?
                // If vy is even: going around cell (vx, vy) counterclockwise (bottom edge)
                // Height change: +1 if unmatched, -3 if matched
                int edgeY = vy - 1; // The cell below the edge
                bool inMatch = m.count(ekey(vx, edgeY, 1)) > 0;
                // Going right along bottom of cell (vx, edgeY) which is black if (vx+edgeY) even
                bool blackCell = ((vx + edgeY) % 2 == 0);
                if (blackCell) {
                    dh = inMatch ? -3 : 1;  // counterclockwise around black
                } else {
                    dh = inMatch ? 3 : -1;  // clockwise around white
                }
            } else if (dirs[d][0] == -1) { // Moving left
                int edgeY = vy - 1;
                bool inMatch = m.count(ekey(vx-1, edgeY, 1)) > 0;
                bool blackCell = ((vx-1 + edgeY) % 2 == 0);
                if (blackCell) {
                    dh = inMatch ? 3 : -1;
                } else {
                    dh = inMatch ? -3 : 1;
                }
            } else if (dirs[d][1] == 1) { // Moving up
                int edgeX = vx - 1;
                bool inMatch = m.count(ekey(edgeX, vy, 0)) > 0;
                bool blackCell = ((edgeX + vy) % 2 == 0);
                if (blackCell) {
                    dh = inMatch ? -3 : 1;
                } else {
                    dh = inMatch ? 3 : -1;
                }
            } else { // Moving down
                int edgeX = vx - 1;
                bool inMatch = m.count(ekey(edgeX, vy-1, 0)) > 0;
                bool blackCell = ((edgeX + vy-1) % 2 == 0);
                if (blackCell) {
                    dh = inMatch ? 3 : -1;
                } else {
                    dh = inMatch ? -3 : 1;
                }
            }

            h[nk] = curH + dh;
            q.push({nx, ny});
        }
    }
}

// Get total height at face corners (for comparing flip directions)
int getFaceHeight(const std::unordered_map<long long, int>& h, int fx, int fy) {
    int total = 0;
    // Face corners: (fx,fy), (fx+1,fy), (fx,fy+1), (fx+1,fy+1)
    // But we care about the CENTER vertex which is (fx+1, fy+1) in our convention
    // Actually for comparing, we just need height at one interior point
    auto it = h.find(vkey(fx+1, fy+1));
    if (it != h.end()) return it->second;
    return 0;
}

// Check face state on a matching
int getFaceStateOn(const std::unordered_set<long long>& m, int fx, int fy) {
    bool hasTop = m.count(ekey(fx, fy + 1, 0)) > 0;
    bool hasBot = m.count(ekey(fx, fy, 0)) > 0;
    bool hasLeft = m.count(ekey(fx, fy, 1)) > 0;
    bool hasRight = m.count(ekey(fx + 1, fy, 1)) > 0;

    if (hasTop && hasBot && !hasLeft && !hasRight) return 1;  // horizontal
    if (hasLeft && hasRight && !hasTop && !hasBot) return 2;  // vertical
    return 0;
}

// Flip face on a matching
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

// ============================================================================
// Hole Detection and Monodromy
// ============================================================================
//
// For regions with holes, the height function has monodromy: walking around
// a hole changes the height by ±4. Different monodromy values correspond to
// different "winding numbers" of the tiling around the hole.
//
// For CFTP to work, MIN and MAX tilings must have the SAME monodromy around
// all holes. We detect holes, pick a canonical monodromy for each, and add
// constraints to the min-cost flow to enforce this.

struct Hole {
    std::vector<std::pair<int,int>> boundaryCycle;  // Vertices forming cycle around hole
    std::vector<std::pair<int,int>> holeCells;      // Cells inside the hole
    double centroidX, centroidY;                     // For UI positioning
    int currentWinding;                              // Current monodromy value
    int baseHeight;                                  // Initial winding (for relative display)
};

// Structure for edges crossing a vertical cut
struct DominoCutEdge {
    int x, y;      // Edge position (lower-left vertex)
    int dir;       // 0 = horizontal
};

std::vector<Hole> detectedHoles;
bool holesComputed = false;

// Find holes in the region using flood-fill of the complement
// A "hole" is a bounded connected component of cells NOT in the region
void detectHoles() {
    detectedHoles.clear();
    holesComputed = true;

    if (vertices.empty()) return;

    // Work in a padded bounding box
    int padMinX = minX - 1;
    int padMaxX = maxX + 1;
    int padMinY = minY - 1;
    int padMaxY = maxY + 1;
    int width = padMaxX - padMinX + 1;
    int height = padMaxY - padMinY + 1;

    // Mark region cells
    std::vector<bool> isRegion(width * height, false);
    for (long long vk : vertices) {
        int x = (int)((vk >> 20) - 100000);
        int y = (int)((vk & ((1LL << 20) - 1)) - 100000);
        int idx = (y - padMinY) * width + (x - padMinX);
        isRegion[idx] = true;
    }

    // Flood-fill from exterior to mark non-hole cells
    std::vector<bool> isExterior(width * height, false);
    std::queue<std::pair<int,int>> q;

    // Start from all boundary cells that are not in region
    for (int x = padMinX; x <= padMaxX; x++) {
        for (int y : {padMinY, padMaxY}) {
            int idx = (y - padMinY) * width + (x - padMinX);
            if (!isRegion[idx] && !isExterior[idx]) {
                isExterior[idx] = true;
                q.push({x, y});
            }
        }
    }
    for (int y = padMinY; y <= padMaxY; y++) {
        for (int x : {padMinX, padMaxX}) {
            int idx = (y - padMinY) * width + (x - padMinX);
            if (!isRegion[idx] && !isExterior[idx]) {
                isExterior[idx] = true;
                q.push({x, y});
            }
        }
    }

    int dx[] = {1, -1, 0, 0};
    int dy[] = {0, 0, 1, -1};

    while (!q.empty()) {
        auto [cx, cy] = q.front();
        q.pop();

        for (int d = 0; d < 4; d++) {
            int nx = cx + dx[d];
            int ny = cy + dy[d];
            if (nx < padMinX || nx > padMaxX || ny < padMinY || ny > padMaxY) continue;

            int nidx = (ny - padMinY) * width + (nx - padMinX);
            if (!isRegion[nidx] && !isExterior[nidx]) {
                isExterior[nidx] = true;
                q.push({nx, ny});
            }
        }
    }

    // Find connected components of interior (holes)
    std::vector<bool> visited(width * height, false);

    for (int y = padMinY + 1; y < padMaxY; y++) {
        for (int x = padMinX + 1; x < padMaxX; x++) {
            int idx = (y - padMinY) * width + (x - padMinX);
            if (isRegion[idx] || isExterior[idx] || visited[idx]) continue;

            // Found a new hole - BFS to find all cells in this hole
            Hole hole;
            std::vector<std::pair<int,int>> holeCells;
            std::queue<std::pair<int,int>> holeQ;

            visited[idx] = true;
            holeQ.push({x, y});

            while (!holeQ.empty()) {
                auto [hx, hy] = holeQ.front();
                holeQ.pop();
                holeCells.push_back({hx, hy});

                for (int d = 0; d < 4; d++) {
                    int nx = hx + dx[d];
                    int ny = hy + dy[d];
                    if (nx < padMinX || nx > padMaxX || ny < padMinY || ny > padMaxY) continue;

                    int nidx = (ny - padMinY) * width + (nx - padMinX);
                    if (!isRegion[nidx] && !isExterior[nidx] && !visited[nidx]) {
                        visited[nidx] = true;
                        holeQ.push({nx, ny});
                    }
                }
            }

            // Find boundary cycle around this hole
            // The boundary consists of region vertices adjacent to hole cells
            std::unordered_set<long long> boundarySet;
            for (auto [hx, hy] : holeCells) {
                for (int d = 0; d < 4; d++) {
                    int bx = hx + dx[d];
                    int by = hy + dy[d];
                    if (hasVertex(bx, by)) {
                        boundarySet.insert(vkey(bx, by));
                    }
                }
            }

            // Order the boundary into a cycle (BFS walk around hole)
            if (!boundarySet.empty()) {
                // Start from any boundary vertex
                long long startKey = *boundarySet.begin();
                int startX = (int)((startKey >> 20) - 100000);
                int startY = (int)((startKey & ((1LL << 20) - 1)) - 100000);

                hole.boundaryCycle.push_back({startX, startY});
                std::unordered_set<long long> usedInCycle;
                usedInCycle.insert(startKey);

                int curX = startX, curY = startY;

                // Walk around the boundary
                while (hole.boundaryCycle.size() < boundarySet.size()) {
                    bool found = false;
                    for (int d = 0; d < 4; d++) {
                        int nx = curX + dx[d];
                        int ny = curY + dy[d];
                        long long nk = vkey(nx, ny);

                        if (boundarySet.count(nk) && !usedInCycle.count(nk)) {
                            hole.boundaryCycle.push_back({nx, ny});
                            usedInCycle.insert(nk);
                            curX = nx;
                            curY = ny;
                            found = true;
                            break;
                        }
                    }
                    if (!found) break;  // Disconnected boundary (shouldn't happen)
                }

                // Store hole cells and compute centroid
                hole.holeCells = holeCells;
                double sumX = 0, sumY = 0;
                for (auto& [hx, hy] : holeCells) {
                    sumX += hx + 0.5;  // Center of cell
                    sumY += hy + 0.5;
                }
                hole.centroidX = sumX / holeCells.size();
                hole.centroidY = sumY / holeCells.size();
                hole.currentWinding = 0;
                hole.baseHeight = 0;

                detectedHoles.push_back(hole);
            }
        }
    }
}

// Compute monodromy around a hole for a given matching
// Returns the height change when walking counterclockwise around the boundary
int computeMonodromy(const std::unordered_set<long long>& m, const Hole& hole) {
    if (hole.boundaryCycle.size() < 2) return 0;

    int totalChange = 0;

    for (size_t i = 0; i < hole.boundaryCycle.size(); i++) {
        int x1 = hole.boundaryCycle[i].first;
        int y1 = hole.boundaryCycle[i].second;
        int x2 = hole.boundaryCycle[(i + 1) % hole.boundaryCycle.size()].first;
        int y2 = hole.boundaryCycle[(i + 1) % hole.boundaryCycle.size()].second;

        // Compute height change when moving from (x1,y1) to (x2,y2)
        // This depends on whether the edge between them is in the matching
        int edgeDir = -1;
        int edgeX = -1, edgeY = -1;

        if (x2 == x1 + 1 && y2 == y1) {
            // Moving right - crossing vertical edge below
            edgeX = x1; edgeY = y1 - 1; edgeDir = 1;
        } else if (x2 == x1 - 1 && y2 == y1) {
            // Moving left - crossing vertical edge below
            edgeX = x1 - 1; edgeY = y1 - 1; edgeDir = 1;
        } else if (y2 == y1 + 1 && x2 == x1) {
            // Moving up - crossing horizontal edge to left
            edgeX = x1 - 1; edgeY = y1; edgeDir = 0;
        } else if (y2 == y1 - 1 && x2 == x1) {
            // Moving down - crossing horizontal edge to left
            edgeX = x1 - 1; edgeY = y1 - 1; edgeDir = 0;
        }

        if (edgeDir >= 0) {
            bool inMatch = m.count(ekey(edgeX, edgeY, edgeDir)) > 0;
            // Height change depends on cell color and match status
            bool blackCell = ((edgeX + edgeY) % 2 == 0);
            int dh = 0;

            if (edgeDir == 0) {  // Horizontal edge
                if (x2 > x1) {  // Moving right along top of cell
                    dh = blackCell ? (inMatch ? -3 : 1) : (inMatch ? 3 : -1);
                } else {  // Moving left
                    dh = blackCell ? (inMatch ? 3 : -1) : (inMatch ? -3 : 1);
                }
            } else {  // Vertical edge
                if (y2 > y1) {  // Moving up along right of cell
                    dh = blackCell ? (inMatch ? -3 : 1) : (inMatch ? 3 : -1);
                } else {  // Moving down
                    dh = blackCell ? (inMatch ? 3 : -1) : (inMatch ? -3 : 1);
                }
            }

            totalChange += dh;
        }
    }

    return totalChange;
}

// ============================================================================
// Hole Winding Adjustment via Horizontal Cut
// ============================================================================

// Helper to find vertical edges crossing a horizontal line at a given edgeY
std::vector<DominoCutEdge> findVerticalEdgesAtY(int edgeY) {
    std::vector<DominoCutEdge> result;
    for (int x = minX; x <= maxX; x++) {
        if (hasVertex(x, edgeY) && hasVertex(x, edgeY + 1)) {
            result.push_back({x, edgeY, 1});
        }
    }
    return result;
}

// Count matched vertical edges on left/right of a given x position
void countMatchedEdges(const std::vector<DominoCutEdge>& edges, double holeX,
                       int& matchedLeft, int& matchedRight) {
    matchedLeft = 0;
    matchedRight = 0;
    for (const auto& e : edges) {
        if (matching.count(ekey(e.x, e.y, 1)) > 0) {
            if (e.x < holeX) matchedLeft++;
            else matchedRight++;
        }
    }
}

// Find VERTICAL edges crossing HORIZONTAL line at y = cutY (half-integer)
// Tries multiple y-levels to find one with matched edges on both sides
// Returns: cutY (the horizontal cut line y-coordinate)
std::vector<DominoCutEdge> findCrossingEdges(int holeIdx, double& cutY) {
    std::vector<DominoCutEdge> result;
    if (holeIdx < 0 || holeIdx >= (int)detectedHoles.size()) return result;

    const Hole& hole = detectedHoles[holeIdx];
    double holeX = hole.centroidX;

    printf("[findCrossingEdges] Hole %d has %zu cells, centroid=(%.2f,%.2f)\n",
           holeIdx, hole.holeCells.size(), hole.centroidX, hole.centroidY);

    if (hole.holeCells.empty()) {
        cutY = std::floor(hole.centroidY) + 0.5;
        int edgeY = (int)std::floor(cutY);
        return findVerticalEdgesAtY(edgeY);
    }

    // Collect all unique y values from hole cells
    std::set<int> holeYs;
    for (const auto& cell : hole.holeCells) {
        holeYs.insert(cell.second);
    }

    // Try each y level and find the one with the most balanced matched edges
    int bestEdgeY = 0;
    int bestScore = -1;  // min(matchedLeft, matchedRight)
    std::vector<DominoCutEdge> bestEdges;
    bool foundValidCut = false;

    for (int y : holeYs) {
        auto edges = findVerticalEdgesAtY(y);
        if (edges.empty()) continue;

        int mL, mR;
        countMatchedEdges(edges, holeX, mL, mR);
        int score = std::min(mL, mR);

        printf("[findCrossingEdges] Trying edgeY=%d: %zu edges, matchedLeft=%d, matchedRight=%d, score=%d\n",
               y, edges.size(), mL, mR, score);

        if (score > bestScore) {
            bestScore = score;
            bestEdgeY = y;
            bestEdges = edges;
            foundValidCut = true;
        }
    }

    if (foundValidCut && bestScore > 0) {
        cutY = bestEdgeY + 0.5;
        printf("[findCrossingEdges] Best edgeY=%d with score=%d\n", bestEdgeY, bestScore);
        return bestEdges;
    }

    // Fallback: use centroid
    cutY = std::floor(hole.centroidY) + 0.5;
    int edgeY = (int)std::floor(cutY);
    printf("[findCrossingEdges] No good cut found (bestScore=%d), falling back to edgeY=%d\n", bestScore, edgeY);
    return findVerticalEdgesAtY(edgeY);
}

// Compute winding for a hole based on current matching
// Uses boundary walk monodromy (height change around hole) / 4
int computeHoleWinding(int holeIdx) {
    if (holeIdx < 0 || holeIdx >= (int)detectedHoles.size()) return 0;
    // Use the correct boundary walk function
    return computeMonodromy(matching, detectedHoles[holeIdx]) / 4;
}

// Compute winding for a hole on a SPECIFIC matching (not global), with logging
int computeHoleWindingOnMatching(int holeIdx, const std::unordered_set<long long>& m, bool verbose) {
    if (holeIdx < 0 || holeIdx >= (int)detectedHoles.size()) return 0;

    // Use boundary walk monodromy
    int monodromy = computeMonodromy(m, detectedHoles[holeIdx]);
    int winding = monodromy / 4;

    if (verbose) {
        printf("[WINDING] Hole %d: monodromy=%d, winding=%d\n",
               holeIdx, monodromy, winding);
    }

    return winding;
}

// Reference tiling for monodromy-constrained extremal search (forward declaration)
std::unordered_set<long long> referenceTiling;
bool hasReferenceTiling = false;

// Rebuild matching on one partition (bottom or top of horizontal cut)
// forcedEdgeKeys: edges that MUST be in the matching (crossing VERTICAL edges)
// cutY is the y-coordinate of crossing edges (vertical edge goes from cutY to cutY+1)
// Bottom partition: y <= cutY (includes bottom endpoint of crossing edges)
// Top partition: y > cutY (includes top endpoint of crossing edges)
// Returns true if successful
bool rebuildPartition(int cutY, bool isBottomSide,
                      const std::unordered_set<long long>& forcedEdgeKeys) {
    // Collect vertices in this partition
    std::vector<std::pair<int,int>> blacks, whites;
    std::unordered_map<long long, int> blackIdx, whiteIdx;

    for (long long vk : vertices) {
        int x = (int)((vk >> 20) - 100000);
        int y = (int)((vk & ((1LL << 20) - 1)) - 100000);

        // Bottom partition: y <= cutY, Top partition: y > cutY
        // This ensures crossing edges (from cutY to cutY+1) span between partitions
        bool inPartition = isBottomSide ? (y <= cutY) : (y > cutY);
        if (!inPartition) continue;

        if ((x + y) % 2 == 0) {
            blackIdx[vk] = blacks.size();
            blacks.push_back({x, y});
        } else {
            whiteIdx[vk] = whites.size();
            whites.push_back({x, y});
        }
    }

    if (blacks.empty() && whites.empty()) return true;

    // Find which vertices are already matched by forced edges
    std::set<int> excludedBlacks, excludedWhites;
    for (long long ek : forcedEdgeKeys) {
        int ex = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int ey = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);

        // Endpoints of this edge
        int x1 = ex, y1 = ey;
        int x2 = (dir == 0) ? ex + 1 : ex;
        int y2 = (dir == 0) ? ey : ey + 1;

        // Check if endpoints are in this partition
        auto bit1 = blackIdx.find(vkey(x1, y1));
        auto wit1 = whiteIdx.find(vkey(x1, y1));
        auto bit2 = blackIdx.find(vkey(x2, y2));
        auto wit2 = whiteIdx.find(vkey(x2, y2));

        if (bit1 != blackIdx.end()) excludedBlacks.insert(bit1->second);
        if (wit1 != whiteIdx.end()) excludedWhites.insert(wit1->second);
        if (bit2 != blackIdx.end()) excludedBlacks.insert(bit2->second);
        if (wit2 != whiteIdx.end()) excludedWhites.insert(wit2->second);
    }

    int numBlack = blacks.size();
    int numWhite = whites.size();
    int freeBlacks = numBlack - excludedBlacks.size();
    int freeWhites = numWhite - excludedWhites.size();

    if (freeBlacks != freeWhites) return false;  // Parity mismatch
    if (freeBlacks == 0) return true;  // Nothing to match

    // Build flow graph for remaining vertices
    int S = numBlack + numWhite;
    int T = S + 1;
    int numNodes = T + 1;

    flowAdj.assign(numNodes, std::vector<FlowEdge>());
    level.assign(numNodes, -1);
    ptr.assign(numNodes, 0);

    // Source -> free blacks
    for (int i = 0; i < numBlack; i++) {
        if (excludedBlacks.count(i) == 0) {
            add_flow_edge(S, i, 1);
        }
    }

    // Free whites -> sink
    for (int j = 0; j < numWhite; j++) {
        if (excludedWhites.count(j) == 0) {
            add_flow_edge(numBlack + j, T, 1);
        }
    }

    // Black -> adjacent White edges (only within partition)
    int dxArr[] = {1, -1, 0, 0};
    int dyArr[] = {0, 0, 1, -1};

    for (int i = 0; i < numBlack; i++) {
        if (excludedBlacks.count(i)) continue;

        int bx = blacks[i].first;
        int by = blacks[i].second;

        for (int d = 0; d < 4; d++) {
            int wx = bx + dxArr[d];
            int wy = by + dyArr[d];

            auto it = whiteIdx.find(vkey(wx, wy));
            if (it != whiteIdx.end() && excludedWhites.count(it->second) == 0) {
                add_flow_edge(i, numBlack + it->second, 1);
            }
        }
    }

    // Run Dinic's
    int matchSize = dinic(S, T);
    if (matchSize != freeBlacks) return false;  // No perfect matching

    // Extract edges and add to global matching
    for (int i = 0; i < numBlack; i++) {
        if (excludedBlacks.count(i)) continue;

        int bx = blacks[i].first;
        int by = blacks[i].second;

        for (const auto& edge : flowAdj[i]) {
            if (edge.to >= numBlack && edge.to < numBlack + numWhite && edge.flow > 0) {
                int j = edge.to - numBlack;
                int wx = whites[j].first;
                int wy = whites[j].second;

                // Determine edge type
                if (wx == bx + 1 && wy == by) {
                    matching.insert(ekey(bx, by, 0));
                } else if (wx == bx - 1 && wy == by) {
                    matching.insert(ekey(wx, wy, 0));
                } else if (wy == by + 1 && wx == bx) {
                    matching.insert(ekey(bx, by, 1));
                } else if (wy == by - 1 && wx == bx) {
                    matching.insert(ekey(wx, wy, 1));
                }
                break;
            }
        }
    }

    return true;
}

// Adjust winding for a hole by swapping crossing edges
// Uses HORIZONTAL cut with VERTICAL edges
// Categorize by LEFT/RIGHT of hole center (x-coordinate)
// Returns number of successful swaps (0 if failed)
int adjustHoleWinding(int holeIdx, int delta) {
    printf("[adjustHoleWinding] holeIdx=%d, delta=%d\n", holeIdx, delta);

    if (holeIdx < 0 || holeIdx >= (int)detectedHoles.size()) return 0;
    if (delta == 0) return 0;

    Hole& hole = detectedHoles[holeIdx];

    // Record initial monodromy for verification
    int initialMonodromy = computeMonodromy(matching, hole);
    printf("[adjustHoleWinding] Initial monodromy=%d (winding=%d)\n", initialMonodromy, initialMonodromy/4);
    printf("[adjustHoleWinding] Current matching size=%zu\n", matching.size());

    // Log a few edges from the matching to see pattern
    int logged = 0;
    for (long long ek : matching) {
        int ex = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int ey = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);
        printf("[adjustHoleWinding] Matching edge: (%d,%d) dir=%d\n", ex, ey, dir);
        if (++logged >= 20) {
            printf("[adjustHoleWinding] ... (truncated)\n");
            break;
        }
    }

    // Get crossing edges (VERTICAL edges crossing HORIZONTAL cut at cutY)
    double cutY;
    auto edges = findCrossingEdges(holeIdx, cutY);
    if (edges.empty()) {
        printf("[adjustHoleWinding] No crossing edges found!\n");
        return 0;
    }
    int cutYInt = (int)std::floor(cutY);  // For partition rebuild
    printf("[adjustHoleWinding] cutY=%.2f, cutYInt=%d, numEdges=%zu\n", cutY, cutYInt, edges.size());

    double holeX = hole.centroidX;

    // Categorize VERTICAL edges by LEFT/RIGHT of hole center
    std::vector<int> matchedLeft, matchedRight;
    std::vector<int> unmatchedLeft, unmatchedRight;

    for (size_t i = 0; i < edges.size(); i++) {
        auto& e = edges[i];
        // dir=1 for vertical edges
        long long ek = ekey(e.x, e.y, 1);
        bool isMatched = matching.count(ek) > 0;
        // Edge center is at (e.x, e.y + 0.5)
        bool isLeft = (e.x < holeX);

        printf("[adjustHoleWinding]   Edge (%d,%d) dir=1 key=%lld matched=%d left=%d\n",
               e.x, e.y, ek, isMatched ? 1 : 0, isLeft ? 1 : 0);

        if (isMatched) {
            if (isLeft) matchedLeft.push_back(i);
            else matchedRight.push_back(i);
        } else {
            if (isLeft) unmatchedLeft.push_back(i);
            else unmatchedRight.push_back(i);
        }
    }

    printf("[adjustHoleWinding] matchedLeft=%zu, matchedRight=%zu, unmatchedLeft=%zu, unmatchedRight=%zu\n",
           matchedLeft.size(), matchedRight.size(), unmatchedLeft.size(), unmatchedRight.size());

    // Sort by x position (distance from hole center)
    auto sortByX = [&](std::vector<int>& v, bool ascending) {
        std::sort(v.begin(), v.end(), [&](int a, int b) {
            return ascending ? (edges[a].x < edges[b].x) : (edges[a].x > edges[b].x);
        });
    };

    sortByX(matchedLeft, false);   // highest x (closest to hole) first
    sortByX(matchedRight, true);   // lowest x (closest to hole) first
    sortByX(unmatchedLeft, false); // highest x (closest to hole) first
    sortByX(unmatchedRight, true); // lowest x (closest to hole) first

    // Determine how many swaps we can do
    int absDelta = std::abs(delta);
    int numSwaps;

    std::vector<int> toUnmatch, toMatch;
    if (delta > 0) {
        // Increase winding: unmatch from LEFT, match in RIGHT
        // This moves matched edge from left to right
        numSwaps = std::min({absDelta, (int)matchedLeft.size(), (int)unmatchedRight.size()});
        for (int i = 0; i < numSwaps; i++) {
            toUnmatch.push_back(matchedLeft[i]);
            toMatch.push_back(unmatchedRight[i]);
        }
    } else {
        // Decrease winding: unmatch from RIGHT, match in LEFT
        numSwaps = std::min({absDelta, (int)matchedRight.size(), (int)unmatchedLeft.size()});
        for (int i = 0; i < numSwaps; i++) {
            toUnmatch.push_back(matchedRight[i]);
            toMatch.push_back(unmatchedLeft[i]);
        }
    }

    if (numSwaps == 0) {
        printf("[adjustHoleWinding] numSwaps=0, cannot adjust\n");
        return 0;
    }

    printf("[adjustHoleWinding] numSwaps=%d\n", numSwaps);

    // Save old matching
    auto savedMatching = matching;

    // Build new set of forced crossing edges (VERTICAL, dir=1)
    std::unordered_set<long long> forcedEdgeKeys;

    // Add all crossing edges that should be matched (keep + new matches)
    for (size_t i = 0; i < edges.size(); i++) {
        auto& e = edges[i];
        bool wasMatched = savedMatching.count(ekey(e.x, e.y, 1)) > 0;  // dir=1 for vertical
        bool shouldUnmatch = std::find(toUnmatch.begin(), toUnmatch.end(), i) != toUnmatch.end();
        bool shouldMatch = std::find(toMatch.begin(), toMatch.end(), i) != toMatch.end();

        if ((wasMatched && !shouldUnmatch) || shouldMatch) {
            forcedEdgeKeys.insert(ekey(e.x, e.y, 1));  // dir=1 for vertical
            printf("[adjustHoleWinding] Forced crossing edge at (%d, %d) dir=1\n", e.x, e.y);
        }
    }

    printf("[adjustHoleWinding] forcedEdgeKeys=%zu\n", forcedEdgeKeys.size());

    // Clear matching and add forced crossing edges
    matching.clear();
    for (long long ek : forcedEdgeKeys) {
        matching.insert(ek);
    }

    // Rebuild BOTTOM partition (y <= cutY)
    printf("[adjustHoleWinding] Rebuilding bottom partition (y <= %d)...\n", cutYInt);
    if (!rebuildPartition(cutYInt, true, forcedEdgeKeys)) {
        printf("[adjustHoleWinding] Bottom partition rebuild FAILED\n");
        matching = savedMatching;
        return 0;
    }
    printf("[adjustHoleWinding] Bottom partition OK, matching size=%zu\n", matching.size());

    // Rebuild TOP partition (y > cutY)
    printf("[adjustHoleWinding] Rebuilding top partition (y > %d)...\n", cutYInt);
    if (!rebuildPartition(cutYInt, false, forcedEdgeKeys)) {
        printf("[adjustHoleWinding] Top partition rebuild FAILED\n");
        matching = savedMatching;
        return 0;
    }
    printf("[adjustHoleWinding] Top partition OK, matching size=%zu\n", matching.size());

    // Validate: matching size should equal savedMatching size
    if (matching.size() != savedMatching.size()) {
        printf("[adjustHoleWinding] VALIDATION FAILED: matching size %zu != saved size %zu\n",
               matching.size(), savedMatching.size());
        matching = savedMatching;
        return 0;
    }

    // Verify monodromy changed
    int finalMonodromy = computeMonodromy(matching, hole);
    int monoChange = finalMonodromy - initialMonodromy;
    printf("[adjustHoleWinding] Final monodromy=%d (winding=%d), change=%d\n",
           finalMonodromy, finalMonodromy/4, monoChange);

    // Update stored winding based on actual monodromy
    hole.currentWinding = finalMonodromy / 4;
    printf("[adjustHoleWinding] SUCCESS! newWinding=%d\n", hole.currentWinding);

    // Update reference tiling for future extremal computations
    referenceTiling = matching;
    hasReferenceTiling = true;

    return numSwaps;
}

// Initialize hole windings from current matching
void initHoleWindings() {
    for (size_t i = 0; i < detectedHoles.size(); i++) {
        int winding = computeHoleWinding(i);
        detectedHoles[i].currentWinding = winding;
        detectedHoles[i].baseHeight = winding;
    }
}

// ============================================================================
// Min-cost max-flow for finding extremal tilings
// ============================================================================
// Uses SPFA (Bellman-Ford variant) for shortest path
struct MCFEdge {
    int to, cap, flow, cost, rev;
};

std::vector<std::vector<MCFEdge>> mcfAdj;
std::vector<int> mcfDist, mcfParent, mcfParentEdge;
std::vector<bool> mcfInQueue;

void mcf_add_edge(int from, int to, int cap, int cost) {
    mcfAdj[from].push_back({to, cap, 0, cost, (int)mcfAdj[to].size()});
    mcfAdj[to].push_back({from, 0, 0, -cost, (int)mcfAdj[from].size() - 1});
}

bool mcf_spfa(int s, int t, int n) {
    mcfDist.assign(n, INT_MAX);
    mcfParent.assign(n, -1);
    mcfParentEdge.assign(n, -1);
    mcfInQueue.assign(n, false);

    mcfDist[s] = 0;
    std::queue<int> q;
    q.push(s);
    mcfInQueue[s] = true;

    while (!q.empty()) {
        int v = q.front();
        q.pop();
        mcfInQueue[v] = false;

        for (int i = 0; i < (int)mcfAdj[v].size(); i++) {
            const auto& e = mcfAdj[v][i];
            if (e.cap - e.flow > 0 && mcfDist[v] + e.cost < mcfDist[e.to]) {
                mcfDist[e.to] = mcfDist[v] + e.cost;
                mcfParent[e.to] = v;
                mcfParentEdge[e.to] = i;
                if (!mcfInQueue[e.to]) {
                    q.push(e.to);
                    mcfInQueue[e.to] = true;
                }
            }
        }
    }
    return mcfDist[t] != INT_MAX;
}

// Returns {max_flow, min_cost}
std::pair<int, int> minCostMaxFlow(int s, int t, int n) {
    int flow = 0, cost = 0;
    while (mcf_spfa(s, t, n)) {
        // Find min capacity along path
        int pushFlow = INT_MAX;
        for (int v = t; v != s; v = mcfParent[v]) {
            auto& e = mcfAdj[mcfParent[v]][mcfParentEdge[v]];
            pushFlow = std::min(pushFlow, e.cap - e.flow);
        }

        // Apply flow
        for (int v = t; v != s; v = mcfParent[v]) {
            auto& e = mcfAdj[mcfParent[v]][mcfParentEdge[v]];
            e.flow += pushFlow;
            mcfAdj[v][e.rev].flow -= pushFlow;
        }

        flow += pushFlow;
        cost += pushFlow * mcfDist[t];
    }
    return {flow, cost};
}

// Compute extremal tiling using min-cost max-flow (for simply-connected regions)
// MIN: horizontal edges cost 0, vertical edges cost 1 → minimize total cost
// MAX: vertical edges cost 0, horizontal edges cost 1 → minimize total cost
void makeExtremalTilingMCF(std::unordered_set<long long>& m, int direction) {
    m.clear();
    printf("[CPU MCF] Starting, direction=%d, vertices=%zu\n", direction, vertices.size());
    if (vertices.empty()) return;

    // Separate vertices by color
    std::vector<std::pair<int,int>> blacks, whites;
    std::unordered_map<long long, int> blackIdx, whiteIdx;

    for (long long vk : vertices) {
        int x = (int)((vk >> 20) - 100000);
        int y = (int)((vk & ((1LL << 20) - 1)) - 100000);

        if ((x + y) % 2 == 0) {
            blackIdx[vk] = blacks.size();
            blacks.push_back({x, y});
        } else {
            whiteIdx[vk] = whites.size();
            whites.push_back({x, y});
        }
    }

    printf("[CPU MCF] blacks=%zu, whites=%zu\n", blacks.size(), whites.size());
    if (blacks.size() != whites.size() || blacks.empty()) {
        printf("[CPU MCF] ERROR: size mismatch or empty!\n");
        return;
    }

    int numBlack = blacks.size();
    int numWhite = whites.size();
    int S = numBlack + numWhite;
    int T = S + 1;
    int numNodes = T + 1;

    mcfAdj.assign(numNodes, std::vector<MCFEdge>());

    // Source -> Black (cost 0)
    for (int i = 0; i < numBlack; i++) {
        mcf_add_edge(S, i, 1, 0);
    }

    // White -> Sink (cost 0)
    for (int j = 0; j < numWhite; j++) {
        mcf_add_edge(numBlack + j, T, 1, 0);
    }

    // Black -> White edges with costs
    // MIN (direction < 0): horizontal cost 0, vertical cost 1
    // MAX (direction > 0): vertical cost 0, horizontal cost 1
    for (int i = 0; i < numBlack; i++) {
        int bx = blacks[i].first;
        int by = blacks[i].second;

        // Right neighbor (horizontal)
        auto it = whiteIdx.find(vkey(bx + 1, by));
        if (it != whiteIdx.end()) {
            int cost = (direction < 0) ? 0 : 1;  // MIN: horiz=0, MAX: horiz=1
            mcf_add_edge(i, numBlack + it->second, 1, cost);
        }

        // Left neighbor (horizontal)
        it = whiteIdx.find(vkey(bx - 1, by));
        if (it != whiteIdx.end()) {
            int cost = (direction < 0) ? 0 : 1;
            mcf_add_edge(i, numBlack + it->second, 1, cost);
        }

        // Up neighbor (vertical)
        it = whiteIdx.find(vkey(bx, by + 1));
        if (it != whiteIdx.end()) {
            int cost = (direction < 0) ? 1 : 0;  // MIN: vert=1, MAX: vert=0
            mcf_add_edge(i, numBlack + it->second, 1, cost);
        }

        // Down neighbor (vertical)
        it = whiteIdx.find(vkey(bx, by - 1));
        if (it != whiteIdx.end()) {
            int cost = (direction < 0) ? 1 : 0;
            mcf_add_edge(i, numBlack + it->second, 1, cost);
        }
    }

    // Run min-cost max-flow
    auto [flow, cost] = minCostMaxFlow(S, T, numNodes);
    printf("[CPU MCF] MCF result: flow=%d, cost=%d\n", flow, cost);

    // Extract matching from flow
    int horizCount = 0, vertCount = 0;
    for (int i = 0; i < numBlack; i++) {
        int bx = blacks[i].first;
        int by = blacks[i].second;

        for (const auto& e : mcfAdj[i]) {
            if (e.to >= numBlack && e.to < numBlack + numWhite && e.flow > 0) {
                int j = e.to - numBlack;
                int wx = whites[j].first;
                int wy = whites[j].second;

                if (wx == bx + 1 && wy == by) {
                    m.insert(ekey(bx, by, 0));
                    horizCount++;
                } else if (wx == bx - 1 && wy == by) {
                    m.insert(ekey(wx, wy, 0));
                    horizCount++;
                } else if (wy == by + 1 && wx == bx) {
                    m.insert(ekey(bx, by, 1));
                    vertCount++;
                } else if (wy == by - 1 && wx == bx) {
                    m.insert(ekey(wx, wy, 1));
                    vertCount++;
                }
                break;
            }
        }
    }
    printf("[CPU MCF] Done: horiz=%d, vert=%d, total=%zu\n", horizCount, vertCount, m.size());
}

// Compute winding from a matching using boundary monodromy
// Returns monodromy / 4 (the actual winding number)
int computeWindingFromMatching(const std::unordered_set<long long>& m, int holeIdx) {
    if (holeIdx < 0 || holeIdx >= (int)detectedHoles.size()) return 0;
    int monodromy = computeMonodromy(m, detectedHoles[holeIdx]);
    return monodromy / 4;
}

// Constrained MCF: find extremal tiling with specified winding around each hole
// Uses the greedy approach from reference tiling (proven to preserve monodromy)
// then runs MCF on each partition to restore extremality
void makeExtremalTilingConstrainedMCF(std::unordered_set<long long>& m, int direction,
                                       const std::vector<int>& targetWindings) {
    printf("[CPU ConstrainedMCF] direction=%d, holes=%zu\n", direction, targetWindings.size());

    if (targetWindings.empty() || detectedHoles.empty()) {
        // No holes - just use regular MCF
        makeExtremalTilingMCF(m, direction);
        return;
    }

    // Strategy: Use greedy flipping from reference tiling to preserve monodromy
    // This is proven to preserve winding numbers since 2x2 flips don't change them
    if (!hasReferenceTiling || referenceTiling.empty()) {
        printf("[CPU ConstrainedMCF] ERROR: No reference tiling available\n");
        makeExtremalTilingMCF(m, direction);
        return;
    }

    // Start from reference and greedily move toward extremal
    m = referenceTiling;

    // Greedy flipping: repeatedly flip faces toward extremal state
    int targetState = (direction < 0) ? 1 : 2;  // 1=horizontal, 2=vertical
    int fromState = (direction < 0) ? 2 : 1;

    bool changed = true;
    int maxIter = faces.size() * 10;
    int iter = 0;
    int totalFlips = 0;

    while (changed && iter < maxIter) {
        changed = false;
        iter++;

        for (const Face& f : faces) {
            int state = getFaceStateOn(m, f.x, f.y);
            if (state == fromState) {
                flipFaceOn(m, f.x, f.y, state);
                changed = true;
                totalFlips++;
            }
        }
    }

    // Verify winding is preserved
    for (size_t h = 0; h < detectedHoles.size(); h++) {
        int actualWinding = computeWindingFromMatching(m, h);
        printf("[CPU ConstrainedMCF] Hole %zu: actual=%d, target=%d\n",
               h, actualWinding, targetWindings[h]);
    }

    // Count edges
    int horizCount = 0, vertCount = 0;
    for (long long ek : m) {
        int dir = (int)(ek & 1);
        if (dir == 0) horizCount++; else vertCount++;
    }

    printf("[CPU ConstrainedMCF] Done: iter=%d, flips=%d, horiz=%d, vert=%d\n",
           iter, totalFlips, horizCount, vertCount);
}

// Make extremal tiling by greedy local moves from a reference tiling
// This preserves monodromy around holes (since 2x2 flips don't change monodromy)
// direction < 0: minimize (prefer horizontal)
// direction > 0: maximize (prefer vertical)
void makeExtremalTilingFromReference(std::unordered_set<long long>& m,
                                      const std::unordered_set<long long>& ref,
                                      int direction) {
    m = ref;  // Start from reference tiling
    if (faces.empty()) return;

    // Greedy: repeatedly flip faces that move toward extremal state
    // For MIN: flip vertical pairs to horizontal (state 2 -> state 1)
    // For MAX: flip horizontal pairs to vertical (state 1 -> state 2)
    int targetState = (direction < 0) ? 1 : 2;  // What we want faces to have
    int fromState = (direction < 0) ? 2 : 1;    // What we flip away from

    bool changed = true;
    int maxIter = faces.size() * 10;  // Safety limit
    int iter = 0;

    while (changed && iter < maxIter) {
        changed = false;
        iter++;

        for (const Face& f : faces) {
            int state = getFaceStateOn(m, f.x, f.y);
            if (state == fromState) {
                // This face can be flipped toward our target
                flipFaceOn(m, f.x, f.y, state);
                changed = true;
            }
        }
    }
}

// Main entry point for extremal tiling computation
// Handles both simply-connected (use MCF) and regions with holes (use constrained MCF)
void makeExtremalTiling(std::unordered_set<long long>& m, int direction) {
    printf("[CPU makeExtremalTiling] direction=%d, holesComputed=%d, numHoles=%zu\n",
           direction, holesComputed, detectedHoles.size());

    // First, detect holes if not already done
    if (!holesComputed) {
        detectHoles();
    }

    if (detectedHoles.empty()) {
        // Simply-connected region: use fast min-cost flow
        printf("[CPU makeExtremalTiling] Using MCF (no holes)\n");
        makeExtremalTilingMCF(m, direction);
        printf("[CPU makeExtremalTiling] MCF done, edges=%zu\n", m.size());
    } else {
        // Region has holes: use constrained MCF to preserve monodromy
        printf("[CPU makeExtremalTiling] Using constrained MCF (has %zu holes)\n", detectedHoles.size());

        // Ensure we have a reference tiling to get target windings
        if (!hasReferenceTiling || referenceTiling.empty()) {
            printf("[CPU makeExtremalTiling] Finding reference tiling...\n");
            findPerfectMatching();
            referenceTiling = matching;
            hasReferenceTiling = true;
        }

        // Compute target windings from reference tiling
        std::vector<int> targetWindings;
        for (size_t i = 0; i < detectedHoles.size(); i++) {
            int winding = computeWindingFromMatching(referenceTiling, i);
            targetWindings.push_back(winding);
            printf("[CPU makeExtremalTiling] Hole %zu target winding=%d\n", i, winding);
        }

        // Use constrained MCF to find true extremal with same winding
        makeExtremalTilingConstrainedMCF(m, direction, targetWindings);
        printf("[CPU makeExtremalTiling] Constrained MCF done, edges=%zu\n", m.size());
    }
}

// Check if two tilings are equal
bool tilingsEqual(const std::unordered_set<long long>& a,
                  const std::unordered_set<long long>& b) {
    return a == b;
}

// CFTP systematic sweep: visit ALL faces exactly once with same randomness for both chains
// Returns number of face operations performed
int cftpSweep(uint64_t sweepSeed) {
    if (faces.empty()) return 0;

    rng_state = sweepSeed;
    int ops = 0;

    // Visit every face in order
    for (size_t i = 0; i < faces.size(); i++) {
        const Face& f = faces[i];

        // Heat-bath: pick target state uniformly (1=horizontal, 2=vertical)
        int target = (getRandomInt(2) == 0) ? 1 : 2;

        // Apply to min state
        int stMin = getFaceStateOn(cftpMin, f.x, f.y);
        if (stMin != 0 && stMin != target) {
            flipFaceOn(cftpMin, f.x, f.y, stMin);
        }

        // Apply to max state (same face, same target)
        int stMax = getFaceStateOn(cftpMax, f.x, f.y);
        if (stMax != 0 && stMax != target) {
            flipFaceOn(cftpMax, f.x, f.y, stMax);
        }

        ops++;
    }

    return ops;
}

// Fluctuation sweep: same as CFTP sweep but operates on specified pair
// Uses its own RNG state for independence
int fluctSweep(uint64_t sweepSeed, int pairIdx) {
    if (faces.empty()) return 0;

    std::unordered_set<long long>& minChain = (pairIdx == 0) ? fluctMin0 : fluctMin1;
    std::unordered_set<long long>& maxChain = (pairIdx == 0) ? fluctMax0 : fluctMax1;

    // Use separate RNG state
    uint64_t& localRng = (pairIdx == 0) ? fluctRngState0 : fluctRngState1;
    localRng = sweepSeed;

    auto localXorshift = [&]() -> uint64_t {
        localRng ^= localRng >> 12;
        localRng ^= localRng << 25;
        localRng ^= localRng >> 27;
        return localRng * 0x2545F4914F6CDD1DULL;
    };

    auto localRandomInt = [&](int n) -> int {
        uint64_t random64 = localXorshift();
        return (int)(((unsigned __int128)random64 * n) >> 64);
    };

    int ops = 0;
    for (size_t i = 0; i < faces.size(); i++) {
        const Face& f = faces[i];
        int target = (localRandomInt(2) == 0) ? 1 : 2;

        int stMin = getFaceStateOn(minChain, f.x, f.y);
        if (stMin != 0 && stMin != target) {
            flipFaceOn(minChain, f.x, f.y, stMin);
        }

        int stMax = getFaceStateOn(maxChain, f.x, f.y);
        if (stMax != 0 && stMax != target) {
            flipFaceOn(maxChain, f.x, f.y, stMax);
        }
        ops++;
    }
    return ops;
}

// ============================================================================
// Export
// ============================================================================

// Static buffer for binary edge export (avoids allocation per call)
static std::vector<int32_t> binaryEdgeBuffer;

// Compute domino type from edge position and direction
// Type 0: horizontal, starts at black vertex (x+y even)
// Type 1: horizontal, starts at white vertex (x+y odd)
// Type 2: vertical, starts at black vertex (x+y even)
// Type 3: vertical, starts at white vertex (x+y odd)
inline int computeDominoType(int x, int y, int dir) {
    bool isBlack = ((x + y) % 2 == 0);
    if (dir == 0) {  // horizontal
        return isBlack ? 0 : 1;
    } else {  // vertical
        return isBlack ? 2 : 3;
    }
}

// Export edges as binary int32 array: [count, totalSteps_lo, totalSteps_hi, flipCount_lo, flipCount_hi, x1,y1,x2,y2,type, ...]
// Returns pointer to static buffer (caller should NOT free)
int32_t* exportEdgesBinaryInternal(const std::unordered_set<long long>& m) {
    size_t edgeCount = m.size();
    binaryEdgeBuffer.clear();
    binaryEdgeBuffer.reserve(5 + edgeCount * 5);

    binaryEdgeBuffer.push_back((int32_t)edgeCount);
    binaryEdgeBuffer.push_back((int32_t)(totalSteps & 0xFFFFFFFF));
    binaryEdgeBuffer.push_back((int32_t)(totalSteps >> 32));
    binaryEdgeBuffer.push_back((int32_t)(flipCount & 0xFFFFFFFF));
    binaryEdgeBuffer.push_back((int32_t)(flipCount >> 32));

    for (long long ek : m) {
        int x = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int y = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);
        int type = computeDominoType(x, y, dir);

        if (dir == 0) {
            // Horizontal: (x,y) to (x+1,y)
            binaryEdgeBuffer.push_back(x);
            binaryEdgeBuffer.push_back(y);
            binaryEdgeBuffer.push_back(x + 1);
            binaryEdgeBuffer.push_back(y);
        } else {
            // Vertical: (x,y) to (x,y+1)
            binaryEdgeBuffer.push_back(x);
            binaryEdgeBuffer.push_back(y);
            binaryEdgeBuffer.push_back(x);
            binaryEdgeBuffer.push_back(y + 1);
        }
        binaryEdgeBuffer.push_back(type);
    }

    return binaryEdgeBuffer.data();
}

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

    // Reset hole detection and reference tiling for new region
    holesComputed = false;
    hasReferenceTiling = false;
    referenceTiling.clear();
    detectedHoles.clear();

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

    // Detect holes in the region (for UI and monodromy tracking)
    detectHoles();

    std::string json = "{\"status\":\"valid\",\"vertexCount\":" + std::to_string(vertexCount) +
                      ",\"edgeCount\":" + std::to_string(matching.size()) +
                      ",\"faceCount\":" + std::to_string(faces.size()) +
                      ",\"holeCount\":" + std::to_string(detectedHoles.size()) +
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

// Binary version of performGlauberSteps - returns pointer to static int32 buffer
// Format: [count, totalSteps_lo, totalSteps_hi, flipCount_lo, flipCount_hi, x1,y1,x2,y2,type, ...]
EMSCRIPTEN_KEEPALIVE
int32_t* performGlauberStepsBinary(int numSteps) {
    performGlauberStepsInternal(numSteps);
    return exportEdgesBinaryInternal(matching);
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

// CFTP state
long long cftpTotalSweeps = 0;      // Total sweeps performed across all epochs
size_t cftpCurrentSweepIdx = 0;     // Current sweep index within the seed list
int cftpCurrentT = 0;               // Current epoch size (number of sweeps)
int cftpPrevT = 0;

EMSCRIPTEN_KEEPALIVE
char* initCFTP() {
    printf("[CPU initCFTP] Starting, vertices=%zu, faces=%zu\n", vertices.size(), faces.size());

    if (vertices.empty() || faces.empty()) {
        std::string json = "{\"status\":\"error\",\"reason\":\"empty\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Compute extremal tilings (MIN and MAX height)
    printf("[CPU initCFTP] Computing MIN tiling...\n");
    makeExtremalTiling(cftpMin, -1);  // Minimize heights
    printf("[CPU initCFTP] Computing MAX tiling...\n");
    makeExtremalTiling(cftpMax, +1);  // Maximize heights
    printf("[CPU initCFTP] MIN edges=%zu, MAX edges=%zu\n", cftpMin.size(), cftpMax.size());

    // Count horizontal and vertical in each
    int minHoriz = 0, minVert = 0, maxHoriz = 0, maxVert = 0;
    for (long long ek : cftpMin) {
        int dir = (int)(ek & 1);
        if (dir == 0) minHoriz++; else minVert++;
    }
    for (long long ek : cftpMax) {
        int dir = (int)(ek & 1);
        if (dir == 0) maxHoriz++; else maxVert++;
    }
    printf("[CPU initCFTP] MIN: horiz=%d, vert=%d\n", minHoriz, minVert);
    printf("[CPU initCFTP] MAX: horiz=%d, vert=%d\n", maxHoriz, maxVert);

    // Check if MIN == MAX (means only one tiling exists)
    if (cftpMin == cftpMax) {
        printf("[CPU initCFTP] WARNING: MIN == MAX (single tiling)\n");
    } else {
        // Count shared edges
        int shared = 0;
        for (long long ek : cftpMin) {
            if (cftpMax.count(ek)) shared++;
        }
        printf("[CPU initCFTP] Shared edges: %d (%.1f%% of MIN)\n",
               shared, 100.0 * shared / cftpMin.size());
    }

    // Check monodromy around each hole for MIN and MAX tilings
    bool monodromyOk = true;
    if (!detectedHoles.empty()) {
        printf("[CPU initCFTP] Checking monodromy for %zu holes:\n", detectedHoles.size());
        for (size_t i = 0; i < detectedHoles.size(); i++) {
            int monoMin = computeMonodromy(cftpMin, detectedHoles[i]);
            int monoMax = computeMonodromy(cftpMax, detectedHoles[i]);
            printf("[CPU initCFTP] Hole %zu: MIN monodromy=%d, MAX monodromy=%d\n",
                   i, monoMin, monoMax);

            // Also compute winding using crossing edges method
            int windingMin = computeWindingFromMatching(cftpMin, i);
            int windingMax = computeWindingFromMatching(cftpMax, i);
            printf("[CPU initCFTP] Hole %zu: MIN winding=%d, MAX winding=%d\n",
                   i, windingMin, windingMax);

            if (monoMin != monoMax) {
                printf("[CPU initCFTP] ERROR: Monodromy mismatch! CFTP will not converge.\n");
                monodromyOk = false;
            }
            if (windingMin != windingMax) {
                printf("[CPU initCFTP] ERROR: Winding mismatch!\n");
                monodromyOk = false;
            }
        }
    }

    // If monodromy mismatch, return error
    if (!monodromyOk) {
        std::string json = "{\"status\":\"error\",\"reason\":\"monodromy_mismatch\",\"holes\":" +
                          std::to_string(detectedHoles.size()) + "}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    cftpSweepSeeds.clear();
    cftpEpochSize = 1;  // Start with T=1 sweep, doubles each epoch
    cftpTotalEpochs = 0;
    cftpTotalSweeps = 0;
    cftpCurrentSweepIdx = 0;
    cftpCurrentT = 1;
    cftpPrevT = 0;
    cftpInitialized = true;

    std::string json = "{\"status\":\"initialized\",\"T\":1,\"faces\":" +
                      std::to_string(faces.size()) + "}";
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* stepCFTP() {
    if (!cftpInitialized) {
        std::string json = "{\"status\":\"error\",\"reason\":\"not_initialized\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // If we need more seeds (starting new epoch or first call)
    if (cftpCurrentSweepIdx >= cftpSweepSeeds.size()) {
        // Generate new seeds for earlier time period (one seed per sweep)
        std::vector<uint64_t> newSeeds(cftpEpochSize);
        for (int i = 0; i < cftpEpochSize; i++) {
            newSeeds[i] = xorshift64();
        }

        // Prepend new seeds (they represent earlier sweeps in time)
        cftpSweepSeeds.insert(cftpSweepSeeds.begin(), newSeeds.begin(), newSeeds.end());

        // RESET to extremal states
        makeExtremalTiling(cftpMin, -1);
        makeExtremalTiling(cftpMax, +1);

        cftpCurrentSweepIdx = 0;
        cftpTotalEpochs++;
        cftpCurrentT = cftpSweepSeeds.size();

        // Check if already coalesced (rare edge case)
        if (tilingsEqual(cftpMin, cftpMax)) {
            std::string json = "{\"status\":\"coalesced\",\"T\":" + std::to_string(cftpCurrentT) +
                              ",\"sweep\":" + std::to_string(cftpCurrentSweepIdx) +
                              ",\"totalSweeps\":" + std::to_string(cftpTotalSweeps) + "}";
            char* result = (char*)malloc(json.size() + 1);
            strcpy(result, json.c_str());
            return result;
        }
    }

    // Process sweeps - each sweep visits ALL faces exactly once
    // Run up to 1000 sweeps per batch, then check coalescence
    const int COALESCENCE_CHECK_INTERVAL = 1000;
    int sweepsThisBatch = 0;

    while (cftpCurrentSweepIdx < cftpSweepSeeds.size() && sweepsThisBatch < COALESCENCE_CHECK_INTERVAL) {
        cftpSweep(cftpSweepSeeds[cftpCurrentSweepIdx]);
        cftpCurrentSweepIdx++;
        cftpTotalSweeps++;
        sweepsThisBatch++;
    }

    // If finished this epoch's sweeps — check coalescence at time 0 only
    if (cftpCurrentSweepIdx >= cftpSweepSeeds.size()) {
        if (tilingsEqual(cftpMin, cftpMax)) {
            std::string json = "{\"status\":\"coalesced\",\"T\":" + std::to_string(cftpCurrentT) +
                              ",\"sweep\":" + std::to_string(cftpCurrentSweepIdx) +
                              ",\"totalSweeps\":" + std::to_string(cftpTotalSweeps) + "}";
            char* result = (char*)malloc(json.size() + 1);
            strcpy(result, json.c_str());
            return result;
        }

        // Safety limit
        if (cftpTotalEpochs >= 30) {
            std::string json = "{\"status\":\"timeout\",\"T\":" + std::to_string(cftpCurrentT) +
                              ",\"totalSweeps\":" + std::to_string(cftpTotalSweeps) + "}";
            char* result = (char*)malloc(json.size() + 1);
            strcpy(result, json.c_str());
            return result;
        }

        // Double epoch size for next iteration
        cftpPrevT = cftpCurrentT;
        cftpEpochSize *= 2;

        std::string json = "{\"status\":\"not_coalesced\",\"T\":" + std::to_string(cftpCurrentT) +
                          ",\"prevT\":" + std::to_string(cftpPrevT) +
                          ",\"nextT\":" + std::to_string(cftpEpochSize) +
                          ",\"totalSweeps\":" + std::to_string(cftpTotalSweeps) + "}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Still in progress
    std::string json = "{\"status\":\"in_progress\",\"T\":" + std::to_string(cftpCurrentT) +
                      ",\"sweep\":" + std::to_string(cftpCurrentSweepIdx) +
                      ",\"totalSweeps\":" + std::to_string(cftpTotalSweeps) + "}";
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* finalizeCFTP() {
    if (!cftpInitialized) {
        std::string json = "{\"status\":\"error\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Use the coalesced tiling (min and max should be equal)
    matching = cftpMin;
    cftpInitialized = false;

    std::string json = "{\"status\":\"success\",\"epochs\":" + std::to_string(cftpTotalEpochs) +
                      ",\"sweeps\":" + std::to_string(cftpTotalSweeps) +
                      "," + exportEdgesJson().substr(1);
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// Export current CFTP min state (for visualization during CFTP)
EMSCRIPTEN_KEEPALIVE
char* getCFTPMinState() {
    std::string json = "{\"edges\":[";
    bool first = true;
    for (long long ek : cftpMin) {
        int x = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int y = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);
        if (!first) json += ",";
        first = false;
        if (dir == 0) {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x + 1) + ",\"y2\":" + std::to_string(y) + "}";
        } else {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x) + ",\"y2\":" + std::to_string(y + 1) + "}";
        }
    }
    json += "]}";
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// Export current CFTP max state (for visualization during CFTP)
EMSCRIPTEN_KEEPALIVE
char* getCFTPMaxState() {
    std::string json = "{\"edges\":[";
    bool first = true;
    for (long long ek : cftpMax) {
        int x = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int y = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);
        if (!first) json += ",";
        first = false;
        if (dir == 0) {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x + 1) + ",\"y2\":" + std::to_string(y) + "}";
        } else {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x) + ",\"y2\":" + std::to_string(y + 1) + "}";
        }
    }
    json += "]}";
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* getMinTiling() {
    if (vertices.empty() || faces.empty()) {
        std::string json = "{\"status\":\"error\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    std::unordered_set<long long> minTiling;
    makeExtremalTiling(minTiling, -1);

    // Export edges
    std::string json = "{\"edges\":[";
    bool first = true;
    for (long long ek : minTiling) {
        int x = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int y = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);
        if (!first) json += ",";
        first = false;
        if (dir == 0) {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x + 1) + ",\"y2\":" + std::to_string(y) + "}";
        } else {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x) + ",\"y2\":" + std::to_string(y + 1) + "}";
        }
    }
    json += "]}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* getMaxTiling() {
    if (vertices.empty() || faces.empty()) {
        std::string json = "{\"status\":\"error\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    std::unordered_set<long long> maxTiling;
    makeExtremalTiling(maxTiling, +1);

    // Export edges
    std::string json = "{\"edges\":[";
    bool first = true;
    for (long long ek : maxTiling) {
        int x = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int y = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);
        if (!first) json += ",";
        first = false;
        if (dir == 0) {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x + 1) + ",\"y2\":" + std::to_string(y) + "}";
        } else {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x) + ",\"y2\":" + std::to_string(y + 1) + "}";
        }
    }
    json += "]}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* getHeights() {
    if (vertices.empty()) {
        std::string json = "{\"heights\":[]}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    std::unordered_map<long long, int> h;
    computeHeights(matching, h);

    std::string json = "{\"heights\":[";
    bool first = true;
    for (auto& [vk, hval] : h) {
        int x = (int)((vk >> 20) - 100000);
        int y = (int)((vk & ((1LL << 20) - 1)) - 100000);
        if (!first) json += ",";
        first = false;
        json += "{\"x\":" + std::to_string(x) + ",\"y\":" + std::to_string(y) +
                ",\"h\":" + std::to_string(hval) + "}";
    }
    json += "]}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// Export region mask for WebGPU CFTP
// Returns binary array (1=in region, 0=outside) with bounds info
EMSCRIPTEN_KEEPALIVE
char* getRegionMask() {
    if (vertices.empty()) {
        std::string json = "{\"status\":\"empty\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    int width = maxX - minX + 1;
    int height = maxY - minY + 1;
    int numCells = width * height;

    // Build mask array
    std::vector<uint8_t> mask(numCells, 0);
    for (long long vk : vertices) {
        int x = (int)((vk >> 20) - 100000);
        int y = (int)((vk & ((1LL << 20) - 1)) - 100000);
        int idx = (y - minY) * width + (x - minX);
        if (idx >= 0 && idx < numCells) {
            mask[idx] = 1;
        }
    }

    // Convert mask to Base64 for efficient transfer
    static const char* base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string encoded;
    encoded.reserve(((numCells + 2) / 3) * 4);

    for (int i = 0; i < numCells; i += 3) {
        uint32_t triple = (mask[i] << 16);
        if (i + 1 < numCells) triple |= (mask[i + 1] << 8);
        if (i + 2 < numCells) triple |= mask[i + 2];

        encoded += base64_chars[(triple >> 18) & 0x3F];
        encoded += base64_chars[(triple >> 12) & 0x3F];
        encoded += (i + 1 < numCells) ? base64_chars[(triple >> 6) & 0x3F] : '=';
        encoded += (i + 2 < numCells) ? base64_chars[triple & 0x3F] : '=';
    }

    std::string json = "{\"status\":\"ok\",\"minX\":" + std::to_string(minX) +
                      ",\"maxX\":" + std::to_string(maxX) +
                      ",\"minY\":" + std::to_string(minY) +
                      ",\"maxY\":" + std::to_string(maxY) +
                      ",\"width\":" + std::to_string(width) +
                      ",\"height\":" + std::to_string(height) +
                      ",\"mask\":\"" + encoded + "\"}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// Find maximum matching and return unmatched vertices for a given vertex set
std::vector<std::pair<int,int>> findUnmatchedVerticesInSet(const std::unordered_set<long long>& vertexSet) {
    std::vector<std::pair<int,int>> unmatched;

    if (vertexSet.empty()) return unmatched;

    // Separate by color
    std::vector<std::pair<int,int>> blacks, whites;
    std::unordered_map<long long, int> blackIdx, whiteIdx;

    for (long long vk : vertexSet) {
        int x = (int)((vk >> 20) - 100000);
        int y = (int)((vk & ((1LL << 20) - 1)) - 100000);
        if ((x + y) % 2 == 0) {
            blackIdx[vk] = blacks.size();
            blacks.push_back({x, y});
        } else {
            whiteIdx[vk] = whites.size();
            whites.push_back({x, y});
        }
    }

    int numBlack = blacks.size();
    int numWhite = whites.size();

    if (numBlack == 0 || numWhite == 0) {
        // All vertices are one color - return them all
        for (auto& p : blacks) unmatched.push_back(p);
        for (auto& p : whites) unmatched.push_back(p);
        return unmatched;
    }

    // Run max flow to find maximum matching
    int S = numBlack + numWhite;
    int T = S + 1;
    int numNodes = T + 1;

    flowAdj.assign(numNodes, std::vector<FlowEdge>());
    level.assign(numNodes, -1);
    ptr.assign(numNodes, 0);

    for (int i = 0; i < numBlack; i++) {
        add_flow_edge(S, i, 1);
    }
    for (int j = 0; j < numWhite; j++) {
        add_flow_edge(numBlack + j, T, 1);
    }

    int dx[] = {1, -1, 0, 0};
    int dy[] = {0, 0, 1, -1};

    for (int i = 0; i < numBlack; i++) {
        int bx = blacks[i].first;
        int by = blacks[i].second;
        for (int d = 0; d < 4; d++) {
            int wx = bx + dx[d];
            int wy = by + dy[d];
            auto it = whiteIdx.find(vkey(wx, wy));
            if (it != whiteIdx.end()) {
                add_flow_edge(i, numBlack + it->second, 1);
            }
        }
    }

    dinic(S, T);

    // Find unmatched black vertices
    for (int i = 0; i < numBlack; i++) {
        bool matched = false;
        for (const auto& e : flowAdj[i]) {
            if (e.to >= numBlack && e.to < numBlack + numWhite && e.flow > 0) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            unmatched.push_back(blacks[i]);
        }
    }

    // Find unmatched white vertices
    std::vector<bool> whiteMatched(numWhite, false);
    for (int i = 0; i < numBlack; i++) {
        for (const auto& e : flowAdj[i]) {
            if (e.to >= numBlack && e.to < numBlack + numWhite && e.flow > 0) {
                whiteMatched[e.to - numBlack] = true;
            }
        }
    }
    for (int j = 0; j < numWhite; j++) {
        if (!whiteMatched[j]) {
            unmatched.push_back(whites[j]);
        }
    }

    return unmatched;
}

EMSCRIPTEN_KEEPALIVE
char* repairRegion() {
    if (vertices.empty()) {
        std::string json = "{\"status\":\"empty\",\"addedCount\":0,\"vertices\":[]}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Work with a LOCAL copy of vertices - don't modify the global state
    std::unordered_set<long long> workingSet = vertices;
    std::vector<std::pair<int,int>> addedVertices;

    // Find unmatched vertices and try to extend
    int dx[] = {1, -1, 0, 0};
    int dy[] = {0, 0, 1, -1};

    int maxIterations = 1000;  // Safety limit
    int iterations = 0;

    while (iterations < maxIterations) {
        iterations++;

        auto unmatched = findUnmatchedVerticesInSet(workingSet);
        if (unmatched.empty()) break;  // Perfect matching exists!

        // Try to add a neighbor for each unmatched vertex
        bool addedAny = false;
        for (auto& [ux, uy] : unmatched) {
            // Try each direction
            for (int d = 0; d < 4; d++) {
                int nx = ux + dx[d];
                int ny = uy + dy[d];
                long long nk = vkey(nx, ny);

                if (workingSet.count(nk) == 0) {
                    // Add this neighbor to working set
                    workingSet.insert(nk);
                    addedVertices.push_back({nx, ny});

                    addedAny = true;
                    break;  // Only add one neighbor per unmatched vertex per iteration
                }
            }
            if (addedAny) break;  // Recompute unmatched after each addition
        }

        if (!addedAny) {
            // Can't add any more neighbors - stuck
            break;
        }
    }

    // Build JSON response
    std::string json = "{\"status\":\"repaired\",\"addedCount\":" + std::to_string(addedVertices.size()) +
                      ",\"vertices\":[";
    bool first = true;
    for (auto& [x, y] : addedVertices) {
        if (!first) json += ",";
        first = false;
        json += "{\"x\":" + std::to_string(x) + ",\"y\":" + std::to_string(y) + "}";
    }
    json += "]}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// ============================================================================
// Fluctuations CFTP (2 independent pairs for double dimer sampling)
// ============================================================================

// State for fluctuations CFTP
size_t fluctCurrentSweepIdx0 = 0, fluctCurrentSweepIdx1 = 0;
int fluctCurrentT0 = 0, fluctCurrentT1 = 0;
long long fluctTotalSweeps = 0;

EMSCRIPTEN_KEEPALIVE
char* initFluctuationsCFTP() {
    if (vertices.empty() || faces.empty()) {
        std::string json = "{\"status\":\"error\",\"reason\":\"empty\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Initialize extremal tilings for both pairs
    makeExtremalTiling(fluctMin0, -1);
    makeExtremalTiling(fluctMax0, +1);
    makeExtremalTiling(fluctMin1, -1);
    makeExtremalTiling(fluctMax1, +1);

    // Clear seed lists
    fluctSeeds0.clear();
    fluctSeeds1.clear();

    // Reset state
    fluctEpochSize0 = 1;
    fluctEpochSize1 = 1;
    fluctTotalEpochs = 0;
    fluctCoalesced0 = false;
    fluctCoalesced1 = false;
    fluctCurrentSweepIdx0 = 0;
    fluctCurrentSweepIdx1 = 0;
    fluctCurrentT0 = 1;
    fluctCurrentT1 = 1;
    fluctTotalSweeps = 0;

    // Initialize separate RNG states
    fluctRngState0 = xorshift64();
    fluctRngState1 = xorshift64();

    fluctInitialized = true;

    std::string json = "{\"status\":\"initialized\",\"T\":1,\"faces\":" +
                      std::to_string(faces.size()) + "}";
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

EMSCRIPTEN_KEEPALIVE
char* stepFluctuationsCFTP() {
    if (!fluctInitialized) {
        std::string json = "{\"status\":\"error\",\"reason\":\"not_initialized\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    const int COALESCENCE_CHECK_INTERVAL = 1000;

    // Process pair 0 if not coalesced
    if (!fluctCoalesced0) {
        if (fluctCurrentSweepIdx0 >= fluctSeeds0.size()) {
            // Generate new seeds for pair 0
            std::vector<uint64_t> newSeeds(fluctEpochSize0);
            for (int i = 0; i < fluctEpochSize0; i++) {
                newSeeds[i] = xorshift64();
            }
            fluctSeeds0.insert(fluctSeeds0.begin(), newSeeds.begin(), newSeeds.end());

            // Reset to extremal states
            makeExtremalTiling(fluctMin0, -1);
            makeExtremalTiling(fluctMax0, +1);
            fluctCurrentSweepIdx0 = 0;
            fluctCurrentT0 = fluctSeeds0.size();
        }

        // Run sweeps for pair 0
        int sweeps0 = 0;
        while (fluctCurrentSweepIdx0 < fluctSeeds0.size() && sweeps0 < COALESCENCE_CHECK_INTERVAL) {
            fluctSweep(fluctSeeds0[fluctCurrentSweepIdx0], 0);
            fluctCurrentSweepIdx0++;
            fluctTotalSweeps++;
            sweeps0++;
        }

        // Check coalescence only at epoch completion
        if (fluctCurrentSweepIdx0 >= fluctSeeds0.size()) {
            if (tilingsEqual(fluctMin0, fluctMax0)) {
                fluctCoalesced0 = true;
            } else {
                fluctEpochSize0 *= 2;
            }
        }
    }

    // Process pair 1 if not coalesced
    if (!fluctCoalesced1) {
        if (fluctCurrentSweepIdx1 >= fluctSeeds1.size()) {
            // Generate new seeds for pair 1 (independent from pair 0!)
            std::vector<uint64_t> newSeeds(fluctEpochSize1);
            for (int i = 0; i < fluctEpochSize1; i++) {
                newSeeds[i] = xorshift64();
            }
            fluctSeeds1.insert(fluctSeeds1.begin(), newSeeds.begin(), newSeeds.end());

            // Reset to extremal states
            makeExtremalTiling(fluctMin1, -1);
            makeExtremalTiling(fluctMax1, +1);
            fluctCurrentSweepIdx1 = 0;
            fluctCurrentT1 = fluctSeeds1.size();
        }

        // Run sweeps for pair 1
        int sweeps1 = 0;
        while (fluctCurrentSweepIdx1 < fluctSeeds1.size() && sweeps1 < COALESCENCE_CHECK_INTERVAL) {
            fluctSweep(fluctSeeds1[fluctCurrentSweepIdx1], 1);
            fluctCurrentSweepIdx1++;
            fluctTotalSweeps++;
            sweeps1++;
        }

        // Check coalescence only at epoch completion
        if (fluctCurrentSweepIdx1 >= fluctSeeds1.size()) {
            if (tilingsEqual(fluctMin1, fluctMax1)) {
                fluctCoalesced1 = true;
            } else {
                fluctEpochSize1 *= 2;
            }
        }
    }

    // Update epoch count when both advance
    fluctTotalEpochs = std::max(fluctTotalEpochs,
        std::max((int)std::log2(fluctEpochSize0), (int)std::log2(fluctEpochSize1)));

    // Safety limit
    if (fluctTotalEpochs >= 30 && (!fluctCoalesced0 || !fluctCoalesced1)) {
        std::string json = "{\"status\":\"timeout\",\"done\":" +
                          std::to_string((fluctCoalesced0 ? 1 : 0) + (fluctCoalesced1 ? 1 : 0)) +
                          ",\"maxT\":" + std::to_string(std::max(fluctCurrentT0, fluctCurrentT1)) + "}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Check if both coalesced
    if (fluctCoalesced0 && fluctCoalesced1) {
        std::string json = "{\"status\":\"coalesced\",\"done\":2,\"maxT\":" +
                          std::to_string(std::max(fluctCurrentT0, fluctCurrentT1)) +
                          ",\"totalSweeps\":" + std::to_string(fluctTotalSweeps) + "}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Still in progress
    std::string json = "{\"status\":\"in_progress\",\"done\":" +
                      std::to_string((fluctCoalesced0 ? 1 : 0) + (fluctCoalesced1 ? 1 : 0)) +
                      ",\"T0\":" + std::to_string(fluctCurrentT0) +
                      ",\"T1\":" + std::to_string(fluctCurrentT1) +
                      ",\"maxT\":" + std::to_string(std::max(fluctCurrentT0, fluctCurrentT1)) +
                      ",\"totalSweeps\":" + std::to_string(fluctTotalSweeps) + "}";
    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// Export coalesced sample from specified pair (0 or 1)
EMSCRIPTEN_KEEPALIVE
char* exportFluctuationSample(int pairIdx) {
    if (!fluctInitialized) {
        std::string json = "{\"status\":\"error\",\"reason\":\"not_initialized\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    const std::unordered_set<long long>& sample =
        (pairIdx == 0) ? fluctMin0 : fluctMin1;

    std::string json = "{\"edges\":[";
    bool first = true;
    for (long long ek : sample) {
        int x = (int)(((ek >> 21) & ((1LL << 20) - 1)) - 100000);
        int y = (int)(((ek >> 1) & ((1LL << 20) - 1)) - 100000);
        int dir = (int)(ek & 1);
        if (!first) json += ",";
        first = false;
        if (dir == 0) {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x + 1) + ",\"y2\":" + std::to_string(y) +
                    ",\"dir\":0}";
        } else {
            json += "{\"x1\":" + std::to_string(x) + ",\"y1\":" + std::to_string(y) +
                    ",\"x2\":" + std::to_string(x) + ",\"y2\":" + std::to_string(y + 1) +
                    ",\"dir\":1}";
        }
    }
    json += "]}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// ============================================================================
// Loop Detection for Double Dimer View
// ============================================================================

// Edge key for loop detection (domino position)
inline long long loopEdgeKey(int x, int y, int dir) {
    return ((long long)(x + 100000) << 21) | ((long long)(y + 100000) << 1) | dir;
}

// Vertex key for loop tracing
inline long long loopVertKey(int x, int y) {
    return ((long long)(x + 100000) << 20) | (long long)(y + 100000);
}

EMSCRIPTEN_KEEPALIVE
char* loadDimersForLoops(const char* json0, const char* json1) {
    loopDimers0.clear();
    loopDimers1.clear();
    loopSizes.clear();
    loopsDetected = false;

    // Parse JSON arrays - format: [{x1,y1,x2,y2,dir}, ...]
    auto parseEdges = [](const char* json, std::vector<std::array<int, 3>>& dimers) {
        const char* p = json;
        while (*p) {
            // Find x1
            const char* x1Start = strstr(p, "\"x1\":");
            if (!x1Start) break;
            int x1 = atoi(x1Start + 5);

            const char* y1Start = strstr(x1Start, "\"y1\":");
            if (!y1Start) break;
            int y1 = atoi(y1Start + 5);

            const char* dirStart = strstr(y1Start, "\"dir\":");
            if (!dirStart) break;
            int dir = atoi(dirStart + 6);

            dimers.push_back({x1, y1, dir});

            // Move past this object
            p = dirStart + 7;
        }
    };

    parseEdges(json0, loopDimers0);
    parseEdges(json1, loopDimers1);

    std::string result = "{\"status\":\"loaded\",\"count0\":" + std::to_string(loopDimers0.size()) +
                        ",\"count1\":" + std::to_string(loopDimers1.size()) + "}";
    char* out = (char*)malloc(result.size() + 1);
    strcpy(out, result.c_str());
    return out;
}

// Detect loop sizes and filter by minimum size
EMSCRIPTEN_KEEPALIVE
char* filterLoopsBySize(int minSize) {
    if (loopDimers0.empty() && loopDimers1.empty()) {
        std::string json = "{\"indices0\":[],\"indices1\":[]}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Build edge-to-index maps
    std::unordered_map<long long, size_t> edge0Map, edge1Map;
    for (size_t i = 0; i < loopDimers0.size(); i++) {
        auto& d = loopDimers0[i];
        edge0Map[loopEdgeKey(d[0], d[1], d[2])] = i;
    }
    for (size_t i = 0; i < loopDimers1.size(); i++) {
        auto& d = loopDimers1[i];
        edge1Map[loopEdgeKey(d[0], d[1], d[2])] = i;
    }

    // Initialize loop sizes if not detected yet
    if (!loopsDetected) {
        size_t totalEdges = loopDimers0.size() + loopDimers1.size();
        loopSizes.assign(totalEdges, 0);

        // Build adjacency: vertex -> list of (edgeIdx, sample, otherVertex)
        struct AdjEntry {
            size_t edgeIdx;
            int sample;  // 0 or 1
            long long otherVert;
        };
        std::unordered_map<long long, std::vector<AdjEntry>> adj;

        auto addEdgeToAdj = [&](const std::array<int, 3>& d, size_t idx, int sample) {
            int x = d[0], y = d[1], dir = d[2];
            long long v1, v2;
            if (dir == 0) {  // horizontal
                v1 = loopVertKey(x, y);
                v2 = loopVertKey(x + 1, y);
            } else {  // vertical
                v1 = loopVertKey(x, y);
                v2 = loopVertKey(x, y + 1);
            }
            adj[v1].push_back({idx, sample, v2});
            adj[v2].push_back({idx, sample, v1});
        };

        for (size_t i = 0; i < loopDimers0.size(); i++) {
            addEdgeToAdj(loopDimers0[i], i, 0);
        }
        for (size_t i = 0; i < loopDimers1.size(); i++) {
            addEdgeToAdj(loopDimers1[i], loopDimers0.size() + i, 1);
        }

        // Mark double dimers (same edge in both samples) as size 2
        for (size_t i = 0; i < loopDimers0.size(); i++) {
            auto& d = loopDimers0[i];
            long long ek = loopEdgeKey(d[0], d[1], d[2]);
            auto it = edge1Map.find(ek);
            if (it != edge1Map.end()) {
                loopSizes[i] = 2;
                loopSizes[loopDimers0.size() + it->second] = 2;
            }
        }

        // Trace alternating cycles for remaining edges
        std::vector<bool> visited(totalEdges, false);
        for (size_t i = 0; i < loopDimers0.size(); i++) {
            if (loopSizes[i] == 2) visited[i] = true;
        }
        for (size_t i = 0; i < loopDimers1.size(); i++) {
            if (loopSizes[loopDimers0.size() + i] == 2) visited[loopDimers0.size() + i] = true;
        }

        for (size_t startIdx = 0; startIdx < loopDimers0.size(); startIdx++) {
            if (visited[startIdx]) continue;

            // Trace cycle starting from this edge
            std::vector<size_t> cycleEdges;
            cycleEdges.push_back(startIdx);
            visited[startIdx] = true;

            auto& startDimer = loopDimers0[startIdx];
            long long startV1 = (startDimer[2] == 0) ?
                loopVertKey(startDimer[0], startDimer[1]) :
                loopVertKey(startDimer[0], startDimer[1]);
            long long startV2 = (startDimer[2] == 0) ?
                loopVertKey(startDimer[0] + 1, startDimer[1]) :
                loopVertKey(startDimer[0], startDimer[1] + 1);

            long long currentV = startV2;
            int lastSample = 0;  // Started with sample 0

            int maxIter = 10000;
            while (maxIter-- > 0) {
                // Find next edge at currentV from the OTHER sample
                int nextSample = 1 - lastSample;
                bool found = false;

                for (auto& ae : adj[currentV]) {
                    if (ae.sample == nextSample && !visited[ae.edgeIdx]) {
                        cycleEdges.push_back(ae.edgeIdx);
                        visited[ae.edgeIdx] = true;
                        currentV = ae.otherVert;
                        lastSample = nextSample;
                        found = true;
                        break;
                    }
                }

                if (!found || currentV == startV1) break;
            }

            // Set loop size for all edges in cycle
            int cycleSize = cycleEdges.size();
            for (size_t idx : cycleEdges) {
                loopSizes[idx] = cycleSize;
            }
        }

        loopsDetected = true;
    }

    // Filter indices by minimum size
    std::string json = "{\"indices0\":[";
    bool first = true;
    for (size_t i = 0; i < loopDimers0.size(); i++) {
        if (loopSizes[i] >= minSize) {
            if (!first) json += ",";
            first = false;
            json += std::to_string(i);
        }
    }
    json += "],\"indices1\":[";
    first = true;
    for (size_t i = 0; i < loopDimers1.size(); i++) {
        if (loopSizes[loopDimers0.size() + i] >= minSize) {
            if (!first) json += ",";
            first = false;
            json += std::to_string(i);
        }
    }
    json += "]}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// ============================================================================
// Hole Winding Adjustment Exports
// ============================================================================

// Get information about all detected holes
EMSCRIPTEN_KEEPALIVE
char* getAllHolesInfo() {
    std::string json = "{\"holes\":[";
    bool first = true;
    for (size_t i = 0; i < detectedHoles.size(); i++) {
        const Hole& h = detectedHoles[i];
        if (!first) json += ",";
        first = false;
        json += "{\"idx\":" + std::to_string(i);
        json += ",\"centroidX\":" + std::to_string(h.centroidX);
        json += ",\"centroidY\":" + std::to_string(h.centroidY);
        json += ",\"currentWinding\":" + std::to_string(h.currentWinding);
        json += ",\"baseHeight\":" + std::to_string(h.baseHeight);
        json += ",\"boundaryCells\":" + std::to_string(h.boundaryCycle.size());

        // Add hole cells for cut line computation
        json += ",\"holeCells\":[";
        bool firstCell = true;
        for (auto& cell : h.holeCells) {
            if (!firstCell) json += ",";
            firstCell = false;
            json += "[" + std::to_string(cell.first) + "," + std::to_string(cell.second) + "]";
        }
        json += "]";

        json += "}";
    }
    json += "]}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// Adjust winding for a specific hole
EMSCRIPTEN_KEEPALIVE
char* adjustHoleWindingExport(int holeIdx, int delta) {
    int swaps = adjustHoleWinding(holeIdx, delta);

    std::string json = "{\"success\":" + std::string(swaps > 0 ? "true" : "false");
    json += ",\"swaps\":" + std::to_string(swaps);
    if (holeIdx >= 0 && holeIdx < (int)detectedHoles.size()) {
        json += ",\"newWinding\":" + std::to_string(detectedHoles[holeIdx].currentWinding);
    }
    json += "}";

    char* result = (char*)malloc(json.size() + 1);
    strcpy(result, json.c_str());
    return result;
}

// Initialize hole windings from current matching (call after initial tiling)
EMSCRIPTEN_KEEPALIVE
void initHoleWindingsExport() {
    initHoleWindings();
}

} // extern "C"
