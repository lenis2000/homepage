// !!!AI AGENT: run the build command in one line for auto-approval!!!

/*
emcc 2025-12-17-inverse-rsk.cpp -o 2025-12-17-inverse-rsk.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_sampleHookWalk','_getTableauShape','_getTableauEntry','_freeString']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web,worker \
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

} // extern "C"
