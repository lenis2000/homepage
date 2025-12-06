/*
emcc 2025-12-05-ultimate-domino.cpp -o 2025-12-05-ultimate-domino.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_initFromVertices','_performGlauberSteps','_exportEdges','_getTotalSteps','_getFlipCount','_freeString','_initCFTP','_stepCFTP','_finalizeCFTP','_getCFTPMinState','_getCFTPMaxState','_getMinTiling','_getMaxTiling','_getHeights','_repairRegion','_malloc','_free']" \
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

// Min-cost max-flow for finding extremal tilings
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

// Compute extremal tiling using min-cost max-flow
// MIN: horizontal edges cost 0, vertical edges cost 1 → minimize total cost
// MAX: vertical edges cost 0, horizontal edges cost 1 → minimize total cost
void makeExtremalTiling(std::unordered_set<long long>& m, int direction) {
    m.clear();
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

    if (blacks.size() != whites.size() || blacks.empty()) return;

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
    minCostMaxFlow(S, T, numNodes);

    // Extract matching from flow
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
                } else if (wx == bx - 1 && wy == by) {
                    m.insert(ekey(wx, wy, 0));
                } else if (wy == by + 1 && wx == bx) {
                    m.insert(ekey(bx, by, 1));
                } else if (wy == by - 1 && wx == bx) {
                    m.insert(ekey(wx, wy, 1));
                }
                break;
            }
        }
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

// CFTP state
long long cftpTotalSweeps = 0;      // Total sweeps performed across all epochs
size_t cftpCurrentSweepIdx = 0;     // Current sweep index within the seed list
int cftpCurrentT = 0;               // Current epoch size (number of sweeps)
int cftpPrevT = 0;

EMSCRIPTEN_KEEPALIVE
char* initCFTP() {
    if (vertices.empty() || faces.empty()) {
        std::string json = "{\"status\":\"error\",\"reason\":\"empty\"}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // Compute extremal tilings (MIN and MAX height)
    makeExtremalTiling(cftpMin, -1);  // Minimize heights
    makeExtremalTiling(cftpMax, +1);  // Maximize heights

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

    // Check coalescence every 1000 sweeps
    if (tilingsEqual(cftpMin, cftpMax)) {
        std::string json = "{\"status\":\"coalesced\",\"T\":" + std::to_string(cftpCurrentT) +
                          ",\"sweep\":" + std::to_string(cftpCurrentSweepIdx) +
                          ",\"totalSweeps\":" + std::to_string(cftpTotalSweeps) + "}";
        char* result = (char*)malloc(json.size() + 1);
        strcpy(result, json.c_str());
        return result;
    }

    // If finished this epoch's sweeps without coalescence
    if (cftpCurrentSweepIdx >= cftpSweepSeeds.size()) {
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

} // extern "C"
