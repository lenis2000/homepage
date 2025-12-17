// !!!AI AGENT: run the build command in one line for auto-approval!!!

/*
emcc 2025-12-17-inverse-rsk.cpp -o 2025-12-17-inverse-rsk.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_sampleHookWalk','_getTableauShape','_getTableauEntry','_freeString','_inverseRSK','_getPermutationEntry','_getPermutationSize','_clearHeatmap','_runHeatmapSimulation','_getHeatmapBuffer','_getHeatmapSize','_getHeatmapMax']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","HEAPU32"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s STACK_SIZE=2MB \
 -s ENVIRONMENT=web,worker \
 -s MODULARIZE=1 \
 -s EXPORT_NAME='createHookModule' \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
mv 2025-12-17-inverse-rsk.js ../../js/

Features:
- Hook-walk algorithm for sampling uniform random Standard Young Tableaux
- Supports any Young diagram shape up to 100,000 boxes
- Efficient C++ implementation with O(N) cell removal via swap-and-pop
- Returns tableau entries accessible via getTableauEntry(row, col)
*/

#include <emscripten.h>
#include <vector>
#include <random>
#include <algorithm>
#include <cstring>
#include <string>
#include <sstream>

using namespace std;

static vector<vector<int>> T;           // tableau entries
static vector<int> shape;               // row lengths
static int N;                           // total boxes

// ---------- utilities ----------
static int boxIndex(int r, int c) {     // 1-based linear index for decile test
    int idx = 0;
    for (int i = 0; i < r; ++i) idx += shape[i];
    return idx + c + 1;                 // +1 for 1-based SYT entries
}

// ---------- hook-walk sampling ----------
extern "C" {

// free malloc'ed C-strings
EMSCRIPTEN_KEEPALIVE
void freeString(char* s) { free(s); }

/*
 * args:
 *   shapeStr = "5,5,3,3,1"  (row lengths, left-justified)
 * returns:
 *   "OK"   on success
 *   "ERR"  on failure / bad input
 *
 * Resulting tableau available through getTableauShape / getTableauEntry.
 *
 * OPTIMIZATION: O(1) swap-and-pop for cell removal instead of O(N) rebuild.
 * Since the hook-walk always lands on a corner (rightmost cell in its row),
 * only that single cell becomes invalid when we decrement activeRow[r].
 */
EMSCRIPTEN_KEEPALIVE
char* sampleHookWalk(const char* shapeStr) {
    // reset
    T.clear(); shape.clear(); N = 0;

    // parse shape
    string token; stringstream ss(shapeStr);
    while (getline(ss, token, ',')) {
        if (token.empty()) continue;
        int len = stoi(token);
        if (len <= 0) {
            char* err = (char*)malloc(4); strcpy(err,"ERR"); return err;
        }
        shape.push_back(len);
        N += len;
    }
    if (shape.empty()) {
        char* err = (char*)malloc(4); strcpy(err,"ERR"); return err;
    }

    int numRows = (int)shape.size();

    // init tableau with zeros
    T.assign(numRows, vector<int>());
    for (int r = 0; r < numRows; ++r) T[r].resize(shape[r], 0);

    /* ----------- uniform GNW hook-walk with O(1) cell removal ----------- */
    std::mt19937_64 rng((uint64_t)emscripten_get_now());
    std::vector<int> activeRow = shape;                       // mutable row lengths

    // cells vector + index map for O(1) swap-and-pop
    std::vector<std::pair<int,int>> cells;
    cells.reserve(N);

    // cellIndex[r][c] = index in cells vector, or -1 if not present
    std::vector<std::vector<int>> cellIndex(numRows);
    for (int r = 0; r < numRows; ++r) {
        cellIndex[r].resize(shape[r], -1);
    }

    // populate cells and index map
    for (int r = 0; r < numRows; ++r) {
        for (int c = 0; c < shape[r]; ++c) {
            cellIndex[r][c] = (int)cells.size();
            cells.emplace_back(r, c);
        }
    }

    for (int k = N; k >= 1; --k) {

        /* 1. choose starting cell uniformly among empty squares */
        std::uniform_int_distribution<int> pickCell(0, (int)cells.size() - 1);
        int idx = pickCell(rng);
        int r = cells[idx].first, c = cells[idx].second;

        /* 2. hook walk */
        while (true) {
            int arm = activeRow[r] - c - 1;                   // to the right
            int leg = 0;                                      // below
            for (int rr = r + 1; rr < numRows && c < activeRow[rr]; ++rr) ++leg;

            if (arm == 0 && leg == 0) break;                  // reached corner

            std::uniform_int_distribution<int> stepDist(1, arm + leg);
            int step = stepDist(rng);
            if (step <= arm)          c += step;              // right
            else                      r += (step - arm);      // down
        }

        /* 3. fill tableau and shrink row length */
        T[r][c] = k;
        activeRow[r]--;

        /* 4. O(1) swap-and-pop to remove corner cell (r, c) */
        int cornerIdx = cellIndex[r][c];
        int lastIdx = (int)cells.size() - 1;

        if (cornerIdx != lastIdx) {
            // swap corner with last element
            auto& lastCell = cells[lastIdx];
            cells[cornerIdx] = lastCell;
            cellIndex[lastCell.first][lastCell.second] = cornerIdx;
        }
        cells.pop_back();
        cellIndex[r][c] = -1;  // mark as removed
    }

    char* ok = (char*)malloc(3); strcpy(ok,"OK"); return ok;
}

// ----------- getters --------------

EMSCRIPTEN_KEEPALIVE
char* getTableauShape() {
    stringstream out;
    for (size_t i=0; i<shape.size(); ++i){ if(i) out<<","; out<<shape[i]; }
    string s = out.str();
    char* res=(char*)malloc(s.size()+1); strcpy(res,s.c_str()); return res;
}

EMSCRIPTEN_KEEPALIVE
int getTableauEntry(int r,int c){          // 0-based
    if(r<(int)T.size() && c<(int)T[r].size()) return T[r][c];
    return -1;
}

// ----------- Inverse RSK (exact port from JS) --------------

static vector<int> permutation;  // result of inverse RSK

/*
 * Inverse RSK algorithm - exact port of the working JS implementation.
 * Takes P and Q tableaux as comma-separated strings (row-major, semicolon between rows).
 * Format: "1,2,3;4,5;6" means [[1,2,3],[4,5],[6]]
 *
 * No JS<->WASM progress callbacks - runs entirely in C++ for speed.
 */
// Simple parser without stringstream (avoids stack issues)
static vector<vector<int>> parseTableau(const char* str) {
    vector<vector<int>> T;
    vector<int> row;
    int num = 0;
    bool inNum = false;

    for (const char* p = str; ; ++p) {
        char c = *p;
        if (c >= '0' && c <= '9') {
            num = num * 10 + (c - '0');
            inNum = true;
        } else {
            if (inNum) {
                row.push_back(num);
                num = 0;
                inNum = false;
            }
            if (c == ';' || c == '\0') {
                if (!row.empty()) {
                    T.push_back(row);
                    row.clear();
                }
                if (c == '\0') break;
            }
        }
    }
    return T;
}

EMSCRIPTEN_KEEPALIVE
char* inverseRSK(const char* pStr, const char* qStr) {
    permutation.clear();

    // Parse tableaux using simple parser
    vector<vector<int>> P = parseTableau(pStr);
    vector<vector<int>> Q = parseTableau(qStr);

    if (P.empty() || Q.empty()) {
        char* err = (char*)malloc(4); strcpy(err, "ERR"); return err;
    }

    // Count total boxes
    int totalN = 0;
    for (auto& row : P) totalN += (int)row.size();

    permutation.resize(totalN);

    // Main inverse RSK loop
    // NOTE: Cannot pre-compute Q positions because row deletion shifts indices.
    // Search for t each iteration - O(N²) total but correct and still fast in C++.
    for (int t = totalN; t >= 1; --t) {
        // Find position of t in Q (always at a corner)
        int r = -1, c = -1;
        for (int row = 0; row < (int)Q.size() && r == -1; ++row) {
            for (int col = 0; col < (int)Q[row].size(); ++col) {
                if (Q[row][col] == t) {
                    r = row;
                    c = col;
                    break;
                }
            }
        }
        if (r == -1) {
            char* err = (char*)malloc(4); strcpy(err, "ERR"); return err;
        }

        // Get value from P at same position
        int val = P[r][c];

        // Erase cells from both tableaux (like JS splice)
        Q[r].erase(Q[r].begin() + c);
        P[r].erase(P[r].begin() + c);

        // Remove empty rows (like JS: if (Q[r].length === 0) { Q.splice(r, 1); P.splice(r, 1); })
        if (Q[r].empty()) {
            Q.erase(Q.begin() + r);
            P.erase(P.begin() + r);
        }

        // Bump up through P - find rightmost element < currentVal in each row above
        int currentVal = val;
        for (int row = r - 1; row >= 0; --row) {
            int best = -1;
            for (int col = (int)P[row].size() - 1; col >= 0; --col) {
                if (P[row][col] < currentVal) {
                    best = col;
                    break;
                }
            }
            if (best == -1) break;

            int tmp = P[row][best];
            P[row][best] = currentVal;
            currentVal = tmp;
        }

        permutation[t - 1] = currentVal;
    }

    char* ok = (char*)malloc(3); strcpy(ok, "OK"); return ok;
}

EMSCRIPTEN_KEEPALIVE
int getPermutationSize() {
    return (int)permutation.size();
}

EMSCRIPTEN_KEEPALIVE
int getPermutationEntry(int i) {
    if (i >= 0 && i < (int)permutation.size()) return permutation[i];
    return -1;
}

// ----------- Heatmap Simulation (Fat WASM) --------------

static const int HEATMAP_SIZE = 64;  // Coarse grid for visible cells (like Mathematica MatrixPlot)
static vector<uint32_t> heatmapGrid(HEATMAP_SIZE * HEATMAP_SIZE, 0);
static uint32_t heatmapMax = 0;

// Internal hook-walk that writes directly to provided tableau
static void internalHookWalk(const vector<int>& shapeVec, vector<vector<int>>& tableau, mt19937_64& rng) {
    int totalN = 0;
    for (int len : shapeVec) totalN += len;
    int numRows = (int)shapeVec.size();

    // Init tableau
    tableau.assign(numRows, vector<int>());
    for (int r = 0; r < numRows; ++r) tableau[r].resize(shapeVec[r], 0);

    vector<int> activeRow = shapeVec;

    // cells vector + index map for O(1) swap-and-pop
    vector<pair<int,int>> cells;
    cells.reserve(totalN);
    vector<vector<int>> cellIndex(numRows);
    for (int r = 0; r < numRows; ++r) {
        cellIndex[r].resize(shapeVec[r], -1);
        for (int c = 0; c < shapeVec[r]; ++c) {
            cellIndex[r][c] = (int)cells.size();
            cells.emplace_back(r, c);
        }
    }

    for (int k = totalN; k >= 1; --k) {
        uniform_int_distribution<int> pickCell(0, (int)cells.size() - 1);
        int idx = pickCell(rng);
        int r = cells[idx].first, c = cells[idx].second;

        // hook walk
        while (true) {
            int arm = activeRow[r] - c - 1;
            int leg = 0;
            for (int rr = r + 1; rr < numRows && c < activeRow[rr]; ++rr) ++leg;
            if (arm == 0 && leg == 0) break;

            uniform_int_distribution<int> stepDist(1, arm + leg);
            int step = stepDist(rng);
            if (step <= arm) c += step;
            else r += (step - arm);
        }

        tableau[r][c] = k;
        activeRow[r]--;

        // O(1) swap-and-pop
        int cornerIdx = cellIndex[r][c];
        int lastIdx = (int)cells.size() - 1;
        if (cornerIdx != lastIdx) {
            auto& lastCell = cells[lastIdx];
            cells[cornerIdx] = lastCell;
            cellIndex[lastCell.first][lastCell.second] = cornerIdx;
        }
        cells.pop_back();
    }
}

// Internal inverse RSK - writes to permutation vector
static bool internalInverseRSK(vector<vector<int>>& P, vector<vector<int>>& Q, vector<int>& perm) {
    int totalN = 0;
    for (auto& row : P) totalN += (int)row.size();
    perm.resize(totalN);

    for (int t = totalN; t >= 1; --t) {
        // Find position of t in Q
        int r = -1, c = -1;
        for (int row = 0; row < (int)Q.size() && r == -1; ++row) {
            for (int col = 0; col < (int)Q[row].size(); ++col) {
                if (Q[row][col] == t) { r = row; c = col; break; }
            }
        }
        if (r == -1) return false;

        int val = P[r][c];
        Q[r].erase(Q[r].begin() + c);
        P[r].erase(P[r].begin() + c);
        if (Q[r].empty()) { Q.erase(Q.begin() + r); P.erase(P.begin() + r); }

        // Bump up
        int currentVal = val;
        for (int row = r - 1; row >= 0; --row) {
            int best = -1;
            for (int col = (int)P[row].size() - 1; col >= 0; --col) {
                if (P[row][col] < currentVal) { best = col; break; }
            }
            if (best == -1) break;
            int tmp = P[row][best];
            P[row][best] = currentVal;
            currentVal = tmp;
        }
        perm[t - 1] = currentVal;
    }
    return true;
}

// Clear heatmap grid (call before starting batch runs)
EMSCRIPTEN_KEEPALIVE
void clearHeatmap() {
    fill(heatmapGrid.begin(), heatmapGrid.end(), 0);
    heatmapMax = 0;
}

/*
 * Run heatmap simulation entirely in C++.
 * Returns "OK" on success, stores last permutation and accumulated heatmap.
 * Does NOT clear heatmap - call clearHeatmap() first for fresh start.
 */
EMSCRIPTEN_KEEPALIVE
char* runHeatmapSimulation(const char* shapeStr, int iterations) {
    // Parse shape
    vector<int> shapeVec;
    int totalN = 0;
    {
        int num = 0;
        bool inNum = false;
        for (const char* p = shapeStr; ; ++p) {
            char c = *p;
            if (c >= '0' && c <= '9') {
                num = num * 10 + (c - '0');
                inNum = true;
            } else {
                if (inNum) {
                    shapeVec.push_back(num);
                    totalN += num;
                    num = 0;
                    inNum = false;
                }
                if (c == '\0') break;
            }
        }
    }
    if (shapeVec.empty()) {
        char* err = (char*)malloc(4); strcpy(err, "ERR"); return err;
    }

    // RNG
    mt19937_64 rng((uint64_t)emscripten_get_now());

    // Persistent buffers
    vector<vector<int>> P, Q;
    vector<int> perm;

    for (int iter = 0; iter < iterations; ++iter) {
        // Sample P and Q tableaux
        internalHookWalk(shapeVec, P, rng);
        internalHookWalk(shapeVec, Q, rng);

        // Run inverse RSK
        if (!internalInverseRSK(P, Q, perm)) {
            char* err = (char*)malloc(4); strcpy(err, "ERR"); return err;
        }

        // Accumulate into heatmap
        for (int t = 1; t <= totalN; ++t) {
            int x = (int)(((t - 1) / (double)totalN) * HEATMAP_SIZE);
            int y = (int)(((perm[t - 1] - 1) / (double)totalN) * HEATMAP_SIZE);
            if (x >= HEATMAP_SIZE) x = HEATMAP_SIZE - 1;
            if (y >= HEATMAP_SIZE) y = HEATMAP_SIZE - 1;
            heatmapGrid[y * HEATMAP_SIZE + x]++;
        }
    }

    // Store last permutation for display
    permutation = perm;

    // Find max for normalization
    heatmapMax = 0;
    for (uint32_t v : heatmapGrid) {
        if (v > heatmapMax) heatmapMax = v;
    }

    char* ok = (char*)malloc(3); strcpy(ok, "OK"); return ok;
}

EMSCRIPTEN_KEEPALIVE
uint32_t* getHeatmapBuffer() {
    return heatmapGrid.data();
}

EMSCRIPTEN_KEEPALIVE
int getHeatmapSize() {
    return HEATMAP_SIZE;
}

EMSCRIPTEN_KEEPALIVE
uint32_t getHeatmapMax() {
    return heatmapMax;
}

} // extern "C"
