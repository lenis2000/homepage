/*
 * qracah-coupled.cpp — Coupled Glauber dynamics with q-Racah weights (WASM)
 *
 * Lightweight companion to visual-lozenge.cpp. Handles only the hot loop:
 * coupled sweeps on min/max grids with height-dependent acceptance ratios.
 * Initialization (triangle generation, extremal states) is done by LozengeModule.
 *
 * Compile from talk/visual/sim/src/:
 *   emcc qracah-coupled.cpp -o ../qracah-coupled.js \
 *     -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='QRacahModule' \
 *     -s "EXPORTED_FUNCTIONS=['_initGrid','_loadGrids','_loadBlackTriangles','_setParams','_computeHeights','_runSweeps','_getMinGridPtr','_getMaxGridPtr','_getGridSize','_freeString','_malloc','_free']" \
 *     -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','setValue','getValue']" \
 *     -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=16MB \
 *     -s ENVIRONMENT=web -s SINGLE_FILE=1 \
 *     -O3 -ffast-math -flto -msimd128
 */

#include <cstdlib>
#include <cstdint>
#include <cmath>
#include <cstring>
#include <vector>
#include <cstdio>

extern "C" {

// =====================================================================
// RNG — xorshift64 (same as visual-lozenge.cpp)
// =====================================================================

static uint64_t rng_state = 98765432101234567ULL;

static inline uint64_t xorshift64() {
    rng_state ^= rng_state >> 12;
    rng_state ^= rng_state << 25;
    rng_state ^= rng_state >> 27;
    return rng_state * 0x2545F4914F6CDD1DULL;
}

static inline double getRandom01() {
    return (xorshift64() >> 11) * (1.0 / 9007199254740992.0);
}

// =====================================================================
// Grid state
// =====================================================================

static int gridMinN, gridMaxN, gridMinJ, gridMaxJ;
static int gridStrideJ;
static int gridSize;

static int8_t* gridMin = nullptr;   // dimer grid for min (lower) chain
static int8_t* gridMax = nullptr;   // dimer grid for max (upper) chain
static int32_t* heightMin = nullptr; // height function for min chain
static int32_t* heightMax = nullptr; // height function for max chain

static inline int idx(int n, int j) {
    return (n - gridMinN) * gridStrideJ + (j - gridMinJ);
}

// =====================================================================
// Black triangles and internal vertices
// =====================================================================

struct BlackTri { int n, j; };
static std::vector<BlackTri> blackTriangles;

// Internal vertices: stored as flat arrays for cache-friendly iteration
static int numVerts = 0;
static int32_t* vertIdx  = nullptr;  // grid index of vertex (n, j)
static int32_t* vertIdx1 = nullptr;  // grid index of (n, j+1)
static int32_t* vertIdx2 = nullptr;  // grid index of (n, j)
static int32_t* vertIdx3 = nullptr;  // grid index of (n-1, j+1)

// =====================================================================
// q-Racah weight parameters
// =====================================================================

static double qParam = 0.7;
static int hexSide = 35;
static double* ratioUp = nullptr;    // min(1, w(h+1)/w(h))
static double* ratioDown = nullptr;  // min(1, w(h-1)/w(h))

// =====================================================================
// Statistics
// =====================================================================

static int64_t totalSteps = 0;

// =====================================================================
// Exported: initGrid
// =====================================================================

void initGrid(int minN, int maxN, int minJ, int maxJ) {
    gridMinN = minN;
    gridMaxN = maxN;
    gridMinJ = minJ;
    gridMaxJ = maxJ;
    gridStrideJ = maxJ - minJ + 1;
    gridSize = (maxN - minN + 1) * gridStrideJ;

    // Free old allocations
    free(gridMin); free(gridMax);
    free(heightMin); free(heightMax);
    free(vertIdx); free(vertIdx1); free(vertIdx2); free(vertIdx3);

    gridMin = (int8_t*)calloc(gridSize, sizeof(int8_t));
    gridMax = (int8_t*)calloc(gridSize, sizeof(int8_t));
    heightMin = (int32_t*)calloc(gridSize, sizeof(int32_t));
    heightMax = (int32_t*)calloc(gridSize, sizeof(int32_t));

    vertIdx = nullptr; vertIdx1 = nullptr; vertIdx2 = nullptr; vertIdx3 = nullptr;
    numVerts = 0;
    totalSteps = 0;
    blackTriangles.clear();
}

// =====================================================================
// Exported: loadGrids — copy min/max grids from LozengeModule
// =====================================================================

void loadGrids(int32_t* minGrid, int32_t* maxGrid, int size) {
    if (size > gridSize) size = gridSize;
    for (int i = 0; i < size; i++) {
        gridMin[i] = (int8_t)minGrid[i];
        gridMax[i] = (int8_t)maxGrid[i];
    }
}

// =====================================================================
// Exported: loadBlackTriangles — load (n,j) pairs
// =====================================================================

void loadBlackTriangles(int32_t* data, int count) {
    blackTriangles.clear();
    blackTriangles.reserve(count);
    for (int i = 0; i < count; i++) {
        blackTriangles.push_back({data[i * 2], data[i * 2 + 1]});
    }

    // Build internal vertices
    // Use a flat boolean array for black triangle membership
    uint8_t* btGrid = (uint8_t*)calloc(gridSize, sizeof(uint8_t));
    for (int i = 0; i < (int)blackTriangles.size(); i++) {
        int bi = idx(blackTriangles[i].n, blackTriangles[i].j);
        if (bi >= 0 && bi < gridSize) btGrid[bi] = 1;
    }

    uint8_t* seen = (uint8_t*)calloc(gridSize, sizeof(uint8_t));
    std::vector<int> tempN, tempJ;

    for (int i = 0; i < (int)blackTriangles.size(); i++) {
        int bn = blackTriangles[i].n, bj = blackTriangles[i].j;
        // Candidates: (bn, bj-1), (bn, bj), (bn+1, bj-1)
        int cands[3][2] = {{bn, bj-1}, {bn, bj}, {bn+1, bj-1}};
        for (int c = 0; c < 3; c++) {
            int cn = cands[c][0], cj = cands[c][1];
            if (cn < gridMinN || cn > gridMaxN || cj < gridMinJ || cj > gridMaxJ) continue;
            int ci = idx(cn, cj);
            if (ci < 0 || ci >= gridSize || seen[ci]) continue;
            seen[ci] = 1;

            // Check 3 neighboring black triangles: (cn, cj+1), (cn, cj), (cn-1, cj+1)
            if (cn >= gridMinN && cn <= gridMaxN &&
                cj+1 >= gridMinJ && cj+1 <= gridMaxJ &&
                cn-1 >= gridMinN && cn-1 <= gridMaxN) {
                int i1 = idx(cn, cj+1);
                int i2 = idx(cn, cj);
                int i3 = idx(cn-1, cj+1);
                if (i1 >= 0 && i1 < gridSize && btGrid[i1] &&
                    i2 >= 0 && i2 < gridSize && btGrid[i2] &&
                    i3 >= 0 && i3 < gridSize && btGrid[i3]) {
                    tempN.push_back(cn);
                    tempJ.push_back(cj);
                }
            }
        }
    }

    free(btGrid);
    free(seen);

    numVerts = (int)tempN.size();
    free(vertIdx); free(vertIdx1); free(vertIdx2); free(vertIdx3);
    vertIdx  = (int32_t*)malloc(numVerts * sizeof(int32_t));
    vertIdx1 = (int32_t*)malloc(numVerts * sizeof(int32_t));
    vertIdx2 = (int32_t*)malloc(numVerts * sizeof(int32_t));
    vertIdx3 = (int32_t*)malloc(numVerts * sizeof(int32_t));
    for (int i = 0; i < numVerts; i++) {
        vertIdx[i]  = idx(tempN[i], tempJ[i]);
        vertIdx1[i] = idx(tempN[i], tempJ[i] + 1);
        vertIdx2[i] = idx(tempN[i], tempJ[i]);
        vertIdx3[i] = idx(tempN[i] - 1, tempJ[i] + 1);
    }
}

// =====================================================================
// Exported: setParams — set q and hexSide, precompute weight ratios
// =====================================================================

void setParams(double q, int side) {
    qParam = q;
    hexSide = side;

    free(ratioUp); free(ratioDown);
    ratioUp = (double*)calloc(side + 2, sizeof(double));
    ratioDown = (double*)calloc(side + 2, sizeof(double));

    // Precompute weights w(h) = q^(h - N/2) + q^(-(h - N/2))
    double* w = (double*)calloc(side + 2, sizeof(double));
    for (int h = 0; h <= side + 1; h++) {
        double a = h - side / 2.0;
        w[h] = pow(q, a) + pow(q, -a);
    }
    for (int h = 0; h <= side; h++) {
        ratioUp[h]   = (h < side) ? fmin(1.0, w[h + 1] / w[h]) : 0.0;
        ratioDown[h] = (h > 0)    ? fmin(1.0, w[h - 1] / w[h]) : 0.0;
    }
    free(w);
}

// =====================================================================
// Exported: computeHeights — BFS height from dimer grid
// =====================================================================

// Vertex keys of a dimer: returns 4 (n,j) pairs
static void getVertexKeys(int bn, int bj, int t, int out[8]) {
    if (t == 0) {
        out[0]=bn; out[1]=bj; out[2]=bn+1; out[3]=bj; out[4]=bn+1; out[5]=bj-1; out[6]=bn; out[7]=bj-1;
    } else if (t == 1) {
        out[0]=bn; out[1]=bj; out[2]=bn+1; out[3]=bj-1; out[4]=bn+1; out[5]=bj-2; out[6]=bn; out[7]=bj-1;
    } else {
        out[0]=bn-1; out[1]=bj; out[2]=bn; out[3]=bj; out[4]=bn+1; out[5]=bj-1; out[6]=bn; out[7]=bj-1;
    }
}

static const int heightPattern[3][4] = {
    {0, 0, 0, 0},  // type 0
    {1, 0, 0, 1},  // type 1
    {1, 1, 0, 0}   // type 2
};

static void bfsHeights(int8_t* grid, int32_t* heights) {
    memset(heights, 0, gridSize * sizeof(int32_t));
    uint8_t* visited = (uint8_t*)calloc(gridSize, sizeof(uint8_t));

    // Build dimer list
    struct Dimer { int bn, bj, t; };
    std::vector<Dimer> dimers;
    dimers.reserve(blackTriangles.size());
    for (int i = 0; i < (int)blackTriangles.size(); i++) {
        int bn = blackTriangles[i].n, bj = blackTriangles[i].j;
        int gi = idx(bn, bj);
        if (gi >= 0 && gi < gridSize) {
            int t = grid[gi];
            if (t >= 0 && t <= 2) dimers.push_back({bn, bj, t});
        }
    }
    if (dimers.empty()) { free(visited); return; }

    // Build vertex → dimer adjacency (flat arrays)
    uint8_t* adjCount = (uint8_t*)calloc(gridSize, sizeof(uint8_t));
    // First pass: count
    for (int di = 0; di < (int)dimers.size(); di++) {
        int vk[8];
        getVertexKeys(dimers[di].bn, dimers[di].bj, dimers[di].t, vk);
        for (int v = 0; v < 4; v++) {
            int vn = vk[v*2], vj = vk[v*2+1];
            if (vn >= gridMinN && vn <= gridMaxN && vj >= gridMinJ && vj <= gridMaxJ) {
                int gi = idx(vn, vj);
                if (gi >= 0 && gi < gridSize) adjCount[gi]++;
            }
        }
    }
    // Build offsets
    int32_t* adjOffset = (int32_t*)calloc(gridSize + 1, sizeof(int32_t));
    for (int i = 0; i < gridSize; i++) adjOffset[i+1] = adjOffset[i] + adjCount[i];
    int totalAdj = adjOffset[gridSize];
    int32_t* adjDimerIdx = (int32_t*)malloc(totalAdj * sizeof(int32_t));
    int32_t* adjVertPos = (int32_t*)malloc(totalAdj * sizeof(int32_t));
    int32_t* adjFill = (int32_t*)calloc(gridSize, sizeof(int32_t));
    // Second pass: fill
    for (int di = 0; di < (int)dimers.size(); di++) {
        int vk[8];
        getVertexKeys(dimers[di].bn, dimers[di].bj, dimers[di].t, vk);
        for (int v = 0; v < 4; v++) {
            int vn = vk[v*2], vj = vk[v*2+1];
            if (vn >= gridMinN && vn <= gridMaxN && vj >= gridMinJ && vj <= gridMaxJ) {
                int gi = idx(vn, vj);
                if (gi >= 0 && gi < gridSize) {
                    int pos = adjOffset[gi] + adjFill[gi];
                    adjDimerIdx[pos] = di;
                    adjVertPos[pos] = v;
                    adjFill[gi]++;
                }
            }
        }
    }

    // BFS
    int vk0[8];
    getVertexKeys(dimers[0].bn, dimers[0].bj, dimers[0].t, vk0);
    int startIdx = idx(vk0[0], vk0[1]);
    heights[startIdx] = 0;
    visited[startIdx] = 1;

    // Queue: store (gridIdx, n, j)
    std::vector<int32_t> queue;
    queue.reserve(gridSize);
    queue.push_back(startIdx);
    queue.push_back(vk0[0]);
    queue.push_back(vk0[1]);
    int qHead = 0;

    while (qHead < (int)queue.size()) {
        int curIdx = queue[qHead];
        qHead += 3;
        int curH = heights[curIdx];

        for (int a = adjOffset[curIdx]; a < adjOffset[curIdx] + adjCount[curIdx]; a++) {
            int di = adjDimerIdx[a];
            int myPos = adjVertPos[a];
            int vk[8];
            getVertexKeys(dimers[di].bn, dimers[di].bj, dimers[di].t, vk);
            const int* pat = heightPattern[dimers[di].t];
            for (int i = 0; i < 4; i++) {
                int vn = vk[i*2], vj = vk[i*2+1];
                if (vn >= gridMinN && vn <= gridMaxN && vj >= gridMinJ && vj <= gridMaxJ) {
                    int vi = idx(vn, vj);
                    if (vi >= 0 && vi < gridSize && !visited[vi]) {
                        visited[vi] = 1;
                        heights[vi] = curH + (pat[i] - pat[myPos]);
                        queue.push_back(vi);
                        queue.push_back(vn);
                        queue.push_back(vj);
                    }
                }
            }
        }
    }

    // Normalize so min height = 0
    int minH = heights[startIdx];
    for (int i = 0; i < gridSize; i++) {
        if (visited[i] && heights[i] < minH) minH = heights[i];
    }
    if (minH != 0) {
        for (int i = 0; i < gridSize; i++) {
            if (visited[i]) heights[i] -= minH;
        }
    }

    free(visited);
    free(adjCount);
    free(adjOffset);
    free(adjDimerIdx);
    free(adjVertPos);
    free(adjFill);
}

void computeHeights() {
    bfsHeights(gridMin, heightMin);
    bfsHeights(gridMax, heightMax);
}

// =====================================================================
// Core: coupled sweep
// =====================================================================

static inline void coupledSweep() {
    int8_t* gMin = gridMin;
    int8_t* gMax = gridMax;
    int32_t* hMin = heightMin;
    int32_t* hMax = heightMax;
    const double* rUp = ratioUp;
    const double* rDown = ratioDown;
    const int hs = hexSide;
    const int nv = numVerts;

    for (int vi = 0; vi < nv; vi++) {
        const int i1 = vertIdx1[vi];
        const int i2 = vertIdx2[vi];
        const int i3 = vertIdx3[vi];

        // Min chain state
        const int8_t dMin1 = gMin[i1], dMin2 = gMin[i2], dMin3 = gMin[i3];
        const bool minEven = (dMin1 == 1 && dMin2 == 2 && dMin3 == 0);
        const bool minOdd  = (dMin1 == 2 && dMin2 == 0 && dMin3 == 1);

        // Max chain state
        const int8_t dMax1 = gMax[i1], dMax2 = gMax[i2], dMax3 = gMax[i3];
        const bool maxEven = (dMax1 == 1 && dMax2 == 2 && dMax3 == 0);
        const bool maxOdd  = (dMax1 == 2 && dMax2 == 0 && dMax3 == 1);

        if (!minEven && !minOdd && !maxEven && !maxOdd) continue;

        const double u = getRandom01();
        const int vidx = vertIdx[vi];
        const int hmn = hMin[vidx];
        const int hmx = hMax[vidx];

        if (u < 0.5) {
            // Try DOWN (even→odd): height decreases
            const double uScaled = u * 2.0;
            if (minEven && hmn > 0 && uScaled < rDown[hmn]) {
                gMin[i1] = 2; gMin[i2] = 0; gMin[i3] = 1;
                hMin[vidx] = hmn - 1;
            }
            if (maxEven && hmx > 0 && uScaled < rDown[hmx]) {
                gMax[i1] = 2; gMax[i2] = 0; gMax[i3] = 1;
                hMax[vidx] = hmx - 1;
            }
        } else {
            // Try UP (odd→even): height increases
            const double uScaled = (u - 0.5) * 2.0;
            if (minOdd && hmn < hs && uScaled < rUp[hmn]) {
                gMin[i1] = 1; gMin[i2] = 2; gMin[i3] = 0;
                hMin[vidx] = hmn + 1;
            }
            if (maxOdd && hmx < hs && uScaled < rUp[hmx]) {
                gMax[i1] = 1; gMax[i2] = 2; gMax[i3] = 0;
                hMax[vidx] = hmx + 1;
            }
        }
    }
    totalSteps += nv;
}

// =====================================================================
// Exported: runSweeps — the hot loop
// =====================================================================

static char resultBuf[256];

char* runSweeps(int numSweeps) {
    if (!gridMin || !gridMax || numVerts == 0) {
        snprintf(resultBuf, sizeof(resultBuf),
            "{\"status\":\"error\",\"step\":0}");
        return resultBuf;
    }

    for (int s = 0; s < numSweeps; s++) {
        coupledSweep();
    }

    // Check coalescence
    bool coalesced = true;
    for (int i = 0; i < gridSize; i++) {
        if (gridMin[i] != gridMax[i]) { coalesced = false; break; }
    }

    snprintf(resultBuf, sizeof(resultBuf),
        "{\"status\":\"%s\",\"step\":%lld}",
        coalesced ? "coalesced" : "in_progress",
        (long long)totalSteps);
    return resultBuf;
}

// =====================================================================
// Exported: getMinGridPtr / getMaxGridPtr / getGridSize
// =====================================================================

int8_t* getMinGridPtr() { return gridMin; }
int8_t* getMaxGridPtr() { return gridMax; }
int getGridSize() { return gridSize; }

// =====================================================================
// Exported: freeString (no-op for static buffer, but needed for API)
// =====================================================================

void freeString(char* ptr) {
    // resultBuf is static, nothing to free
    (void)ptr;
}

} // extern "C"
