/*

emcc 2025-03-31-aztec-uniform-3d.cpp -o 2025-03-31-aztec-uniform-3d.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
mv 2025-03-31-aztec-uniform-3d.js ../../js/



*/


#include <emscripten.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <random>
#include <chrono>
#include <sstream>
#include <string>
#include <tuple>
#include <ctime>
#include <cstdlib>
#include <cstring>
#include <map>
#include <queue>
#include <utility>
#include <array>

using namespace std;

static std::mt19937 rng(std::random_device{}()); // Global RNG for speed

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

struct Cell {
    double value;
    int flag;
};

using Matrix = vector<vector<Cell>>;
using MatrixDouble = vector<vector<double>>;
using MatrixInt = vector<vector<int>>;
using Vertex = pair<int, int>;
using HeightMap = map<Vertex, double>;
using DominoVertex = pair<int,int>;
struct Domino {
    vector<DominoVertex> coords;    // 6 vertices: 4 corners + 2 mids
    vector<double> relH;            // their relative heights
};

HeightMap calculateHeightFunction(const MatrixInt &dominoConfig, int n) {
    int size = dominoConfig.size();
    vector<Domino> dominos;
    dominos.reserve(size * size / 4);

    // --- 1) Gather each domino’s local pattern (coords & rel heights) ---
    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            if (dominoConfig[i][j] != 1) continue;

            // Determine type by parity as before:
            bool oddI = (i & 1), oddJ = (j & 1);
            vector<DominoVertex> v(6);
            vector<double> h(6, 0.0);
            int vi = (j - i - 2);
            int vj = 2*n - (i + j);
            // We'll fill v[0..3]=corners, v[4..5]=midpoints; h[...] from the old patterns
            if ( oddI &&  oddJ) {
                // Blue horizontal domino
                // corners:
                v[0] = {vi,     vj};     h[0] = -1;
                v[1] = {vi + 4, vj};     h[1] = -1;
                v[2] = {vi + 4, vj - 2}; h[2] = -2;
                v[3] = {vi,     vj - 2}; h[3] = -2;
                // mids:
                v[4] = {vi + 2, vj};     h[4] =  0;
                v[5] = {vi + 2, vj - 2}; h[5] = -3;

            } else if ( oddI && !oddJ) {
                // Yellow vertical domino
                v[0] = {vi,     vj};     h[0] = -2;
                v[1] = {vi,     vj + 4}; h[1] = -2;
                v[2] = {vi + 2, vj + 4}; h[2] = -1;
                v[3] = {vi + 2, vj};     h[3] = -1;
                v[4] = {vi,     vj + 2}; h[4] = -3;
                v[5] = {vi + 2, vj + 2}; h[5] =  0;

            } else if (!oddI && !oddJ) {
                // Green horizontal domino
                v[0] = {vi,     vj};     h[0] =  1;
                v[1] = {vi + 4, vj};     h[1] =  1;
                v[2] = {vi + 4, vj - 2}; h[2] =  2;
                v[3] = {vi,     vj - 2}; h[3] =  2;
                v[4] = {vi + 2, vj};     h[4] =  0;
                v[5] = {vi + 2, vj - 2}; h[5] =  3;

            } else {
                // Red vertical domino
                v[0] = {vi,     vj};     h[0] =  2;
                v[1] = {vi,     vj + 4}; h[1] =  2;
                v[2] = {vi + 2, vj + 4}; h[2] =  1;
                v[3] = {vi + 2, vj};     h[3] =  1;
                v[4] = {vi,     vj + 2}; h[4] =  3;
                v[5] = {vi + 2, vj + 2}; h[5] =  0;
            }

            dominos.push_back({v, h});
        }
    }

    int D = dominos.size();
    vector<double> offsets(D, 0.0);
    vector<bool> seen(D, false);

    // Build map from vertex → domino indices
    map<DominoVertex, vector<int>> byVertex;
    for (int d = 0; d < D; d++)
        for (auto &coord : dominos[d].coords)
            byVertex[coord].push_back(d);

    // --- 2) BFS each connected component of the domino graph ---
    for (int start = 0; start < D; start++) {
        if (seen[start]) continue;
        queue<int> q;
        seen[start] = true;
        offsets[start] = 0.0;
        q.push(start);

        while (!q.empty()) {
            int u = q.front(); q.pop();
            // For each vertex of u, any other domino sharing it is a neighbor
            for (int k = 0; k < 6; k++) {
                auto coord = dominos[u].coords[k];
                for (int v : byVertex[coord]) {
                    if (seen[v]) continue;
                    // find which index l in dominos[v].coords matches coord
                    int l = 0;
                    while (l < 6 && dominos[v].coords[l] != coord) ++l;
                    if (l < 6) {
                        // offset_v = offset_u + (h_u[k] - h_v[l])
                        offsets[v] = offsets[u] + (dominos[u].relH[k] - dominos[v].relH[l]);
                        seen[v] = true;
                        q.push(v);
                    }
                }
            }
        }
    }

    // --- 3) Assemble global heightMap ---
    HeightMap hmap;
    for (int d = 0; d < D; d++) {
        for (int k = 0; k < 6; k++) {
            double absH = offsets[d] + dominos[d].relH[k];
            hmap[ dominos[d].coords[k] ] = absH;
        }
    }
    return hmap;
}


// ---------------------------------------------------------------------
// Revised getDominoFaces: fixes the vertical (red/yellow) orientation
// so that vertical dominos grow “up” (+y) instead of “down” (−y).
// ---------------------------------------------------------------------
vector<tuple<string, vector<vector<double>>>> getDominoFaces(
    const MatrixInt &dominoConfig,
    const HeightMap &heightMap,
    int n
) {
    const double x_shift = -0.5;
    const double y_shift = 1.5;

    vector<tuple<string, vector<vector<double>>>> faces;
    faces.reserve(dominoConfig.size() * dominoConfig.size() / 4);

    for (int i = 0; i < (int)dominoConfig.size(); i++) {
        for (int j = 0; j < (int)dominoConfig.size(); j++) {
            if (dominoConfig[i][j] != 1) continue;

            bool oddI = (i & 1), oddJ = (j & 1);
            string color;
            int vi = (j - i - 2);
            int vj = 2 * n - (i + j);

            vector<pair<int,int>> pts;
            if (oddI == oddJ) {
                // horizontal domino (blue or green)
                color = oddI ? "blue" : "green";
                int w = 4, h = 2;
                pts = {
                    {vi,     vj},       // top‑left
                    {vi + w, vj},       // top‑right
                    {vi + w, vj - h},   // bottom‑right
                    {vi,     vj - h},   // bottom‑left
                    {vi + w/2, vj},     // top‑mid
                    {vi + w/2, vj - h}  // bottom‑mid
                };
            } else {
                // vertical domino (yellow or red)
                color = oddI ? "yellow" : "red";
                int w = 2, h = 4;
                pts = {
                    {vi,     vj},       // left‑bottom
                    {vi,     vj + h},   // left‑top
                    {vi + w, vj + h},   // right‑top
                    {vi + w, vj},       // right‑bottom
                    {vi,     vj + h/2}, // left‑mid
                    {vi + w, vj + h/2}  // right‑mid
                };
            }

            vector<vector<double>> verts;
            verts.reserve(6);

            for (auto [x0, y0] : pts) {
                double z0 = 0.0;
                auto it = heightMap.find({x0, y0});
                if (it != heightMap.end()) {
                    z0 = it->second;
                }

                // Apply different shifts based on oddI
                double adjustedXShift = oddI == oddJ ? x_shift : x_shift + 0.5;
                double adjustedYShift = oddI == oddJ ? y_shift : y_shift - 1.5;

                verts.push_back({
                    x0 / 2.0 + adjustedXShift,
                    y0 / 2.0 + adjustedYShift,
                    z0
                });
            }

            faces.emplace_back(color, verts);
        }
    }

    return faces;
}


//////////////////////////////////////////////////////////////////////////////////////////




vector<Matrix> d3p(const MatrixDouble &x1) {
    // d3p: builds a vector of matrices from x1.
    int n = (int)x1.size();
    Matrix A(n, vector<Cell>(n));
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            // Use bitwise & for mod 2 replacement when applicable
            A[i][j] = (fabs(x1[i][j]) < 1e-9) ? Cell{1.0, 1} : Cell{x1[i][j], 0};
        }
    }
    vector<Matrix> AA;
    AA.push_back(A);

    int iterations = n / 2 - 1; // Assumes n is even.
    for (int k = 0; k < iterations; k++){
        int nk = n - 2 * k - 2;
        Matrix C(nk, vector<Cell>(nk));
        Matrix &prev = AA[k];
        for (int i = 0; i < nk; i++){
            for (int j = 0; j < nk; j++){
                int ii = i + 2 * (i & 1);  // instead of i % 2
                int jj = j + 2 * (j & 1);  // instead of j % 2
                const Cell &current = prev[ii][jj];
                const Cell &diag    = prev[i + 1][j + 1];
                const Cell &right   = prev[ii][j + 1];
                const Cell &down    = prev[i + 1][jj];
                double sum1 = current.flag + diag.flag;
                double sum2 = right.flag + down.flag;
                double a2, a2_second;
                if (fabs(sum1 - sum2) < 1e-9) {
                    a2 = current.value * diag.value + right.value * down.value;
                    a2_second = sum1;
                } else if (sum1 < sum2) {
                    a2 = current.value * diag.value;
                    a2_second = sum1;
                } else {
                    a2 = right.value * down.value;
                    a2_second = sum2;
                }
                if (fabs(a2) < 1e-9) a2 = 1e-9;
                C[i][j] = { current.value / a2, current.flag - static_cast<int>(a2_second) };
            }
        }
        AA.push_back(C);
    }
    return AA;
}

vector<MatrixDouble> probs2(const MatrixDouble &x1) {
    // probs2: compute probability matrices from the d3p output.
    vector<Matrix> a0 = d3p(x1);
    int n = (int)a0.size();
    vector<MatrixDouble> A;
    for (int k = 0; k < n; k++){
        Matrix &mat = a0[n - k - 1];
        int nk = (int)mat.size();
        int rows = nk / 2;
        MatrixDouble C(rows, vector<double>(rows, 0.0));
        for (int i = 0; i < rows; i++){
            for (int j = 0; j < rows; j++){
                int i0 = i << 1;  // 2*i
                int j0 = j << 1;  // 2*j
                int sum1 = mat[i0][j0].flag + mat[i0 + 1][j0 + 1].flag;
                int sum2 = mat[i0 + 1][j0].flag + mat[i0][j0 + 1].flag;
                if (sum1 > sum2) {
                    C[i][j] = 0.0;
                } else if (sum1 < sum2) {
                    C[i][j] = 1.0;
                } else {
                    double prod_main  = mat[i0 + 1][j0 + 1].value * mat[i0][j0].value;
                    double prod_other = mat[i0 + 1][j0].value * mat[i0][j0 + 1].value;
                    double denom = prod_main + prod_other;
                    if (fabs(denom) < 1e-9) denom = 1e-9;
                    C[i][j] = prod_main / denom;
                }
            }
        }
        A.push_back(C);
    }
    return A;
}

MatrixInt delslide(const MatrixInt &x1) {
    // delslide: deletion-slide procedure.
    int n = (int)x1.size();
    MatrixInt a0(n + 2, vector<int>(n + 2, 0));
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            a0[i + 1][j + 1] = x1[i][j];
        }
    }
    int half = n / 2;
    for (int i = 0; i < half; i++){
        for (int j = 0; j < half; j++){
            int i2 = i << 1, j2 = j << 1;
            if (a0[i2][j2] == 1 && a0[i2 + 1][j2 + 1] == 1) {
                a0[i2][j2] = 0;
                a0[i2 + 1][j2 + 1] = 0;
            } else if (a0[i2][j2 + 1] == 1 && a0[i2 + 1][j2] == 1) {
                a0[i2 + 1][j2] = 0;
                a0[i2][j2 + 1] = 0;
            }
        }
    }
    for (int i = 0; i < half + 1; i++){
        for (int j = 0; j < half + 1; j++){
            int i2 = i << 1, j2 = j << 1;
            if (a0[i2 + 1][j2 + 1] == 1) {
                a0[i2][j2] = 1;
                a0[i2 + 1][j2 + 1] = 0;
            } else if (a0[i2][j2] == 1) {
                a0[i2][j2] = 0;
                a0[i2 + 1][j2 + 1] = 1;
            } else if (a0[i2 + 1][j2] == 1) {
                a0[i2][j2 + 1] = 1;
                a0[i2 + 1][j2] = 0;
            } else if (a0[i2][j2 + 1] == 1) {
                a0[i2 + 1][j2] = 1;
                a0[i2][j2 + 1] = 0;
            }
        }
    }
    return a0;
}

MatrixInt create(MatrixInt x0, const MatrixDouble &p) {
    // create: decide domino orientation in each 2x2 block using probabilities.
    int n = (int)x0.size();
    int half = n / 2;
    for (int i = 0; i < half; i++){
        for (int j = 0; j < half; j++){
            int i2 = i << 1, j2 = j << 1;
            if (x0[i2][j2] == 0 && x0[i2 + 1][j2] == 0 &&
                x0[i2][j2 + 1] == 0 && x0[i2 + 1][j2 + 1] == 0) {
                bool a1 = true, a2 = true, a3 = true, a4 = true;
                if (j > 0)
                    a1 = (x0[i2][j2 - 1] == 0) && (x0[i2 + 1][j2 - 1] == 0);
                if (j < half - 1)
                    a2 = (x0[i2][j2 + 2] == 0) && (x0[i2 + 1][j2 + 2] == 0);
                if (i > 0)
                    a3 = (x0[i2 - 1][j2] == 0) && (x0[i2 - 1][j2 + 1] == 0);
                if (i < half - 1)
                    a4 = (x0[i2 + 2][j2] == 0) && (x0[i2 + 2][j2 + 1] == 0);
                if (a1 && a2 && a3 && a4) {
                    std::uniform_real_distribution<> dis(0.0, 1.0);
                    double r = dis(rng);
                    if (r < p[i][j]) {
                        x0[i2][j2] = 1;
                        x0[i2 + 1][j2 + 1] = 1;
                    } else {
                        x0[i2 + 1][j2] = 1;
                        x0[i2][j2 + 1] = 1;
                    }
                }
            }
        }
    }
    return x0;
}

MatrixInt aztecgen(const vector<MatrixDouble> &x0) {
    // aztecgen: iterate deletion-slide and creation steps.
    int n = (int)x0.size();
    std::uniform_real_distribution<> dis(0.0, 1.0);
    MatrixInt a1;
    // Initialize with a 2x2 configuration using the first probability.
    if (dis(rng) < x0[0][0][0])
        a1 = { {1, 0}, {0, 1} };
    else
        a1 = { {0, 1}, {1, 0} };
    int totalIterations = n - 1;
    for (int i = 0; i < totalIterations; i++){
        a1 = delslide(a1);
        a1 = create(a1, x0[i + 1]);
        // Update progress: scale from 10 to 90 over these iterations.
        progressCounter = 10 + (int)(((double)(i + 1) / totalIterations) * 80);
        emscripten_sleep(0); // Yield control so that progress updates are visible.
    }
    return a1;
}

// ---------------------------------------------------------------------
// simulateAztec
//
// Exported function callable from JavaScript.
// It creates a 2*n x 2*n weight matrix, runs the simulation,
// and returns a JSON string with domino placements as 3D faces.
// ---------------------------------------------------------------------
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n) {
    try {
        // Limit n to reasonable values to prevent memory issues
        if (n > 120) {
            n = 120; // Cap at 120 to prevent memory issues
        }

        progressCounter = 0; // Reset progress.

        // Create weight matrix A1a: dimensions 2*n x 2*n, filled with ones.
        int dim = 2 * n;

        // Check if memory allocation would be too large
        if (dim > 1000) {
            throw std::runtime_error("Input size too large, would exceed memory limits");
        }

        MatrixDouble A1a(dim, vector<double>(dim, 1.0));
        emscripten_sleep(0); // Yield to update UI

        // Compute probability matrices.
        vector<MatrixDouble> prob;
        try {
            prob = probs2(A1a);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error computing probability matrices");
        }
        progressCounter = 10; // Probabilities computed.
        emscripten_sleep(0); // Yield to update UI

        // Generate domino configuration.
        MatrixInt dominoConfig;
        try {
            dominoConfig = aztecgen(prob);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating domino configuration");
        }
        progressCounter = 90; // Simulation steps complete.
        emscripten_sleep(0); // Yield to update UI

        // Calculate height function
        HeightMap heightMap;
        try {
            heightMap = calculateHeightFunction(dominoConfig, n);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error calculating height function");
        }
        progressCounter = 99; // Fixed height function computed
        emscripten_sleep(0); // Yield to update UI

        // Get 3D faces with heights, using hardcoded shift values
        vector<tuple<string, vector<vector<double>>>> faces;
        try {
            faces = getDominoFaces(dominoConfig, heightMap, n);
        } catch (const std::exception& e) {
            throw std::runtime_error("Error generating 3D faces");
        }

        // Build JSON output with 3D vertices and height function
        ostringstream oss;
        oss << "{\"faces\":[";  // Start with an object containing faces array

        // Limit the number of faces to prevent memory issues
        // Allow more faces for large values of n (since we now support 32-bit indices)
        const size_t maxFacesToOutput = (n > 60) ? 40000 : 10000;
        const size_t facesToOutput = std::min(faces.size(), maxFacesToOutput);

        for (size_t i = 0; i < facesToOutput; i++) {
            if (i > 0) oss << ",";

            // Use traditional access instead of structured binding for compatibility
            const string& color = std::get<0>(faces[i]);
            const vector<vector<double>>& vertices = std::get<1>(faces[i]);

            oss << "{\"color\":\"" << color << "\",\"vertices\":[";

            for (size_t j = 0; j < vertices.size(); j++) {
                if (j > 0) oss << ",";
                oss << "[" << vertices[j][0] << "," << vertices[j][1] << "," << vertices[j][2] << "]";
            }

            oss << "]}";

            // Yield every 1000 faces to keep UI responsive
            if (i % 1000 == 0) {
                emscripten_sleep(0);
            }
        }

        // If we limited the number of faces, add a message
        if (facesToOutput < faces.size()) {
            oss << ",{\"color\":\"gray\",\"vertices\":[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],\"message\":\"Output limited to "
                << maxFacesToOutput << " faces out of " << faces.size() << " total\"}";
        }
        
        // Add a flag to indicate if we need 32-bit indices
        oss << "],\"use32BitIndices\":" << (faces.size() > 10922 ? "true" : "false") << ",\"heightFunction\":{";

        // Add height function data
        bool firstVertex = true;
        for (const auto& entry : heightMap) {
            if (!firstVertex) {
                oss << ",";
            }
            firstVertex = false;

            // Format is "x,y": height
            oss << "\"" << entry.first.first << "," << entry.first.second << "\":"
                << entry.second;
        }

        oss << "}}";
        progressCounter = 100; // Finished.
        emscripten_sleep(0); // Yield to update UI

        // Allocate memory for the output string
        string json = oss.str();
        char* out = nullptr;

        try {
            out = (char*)malloc(json.size() + 1);
            if (!out) {
                throw std::runtime_error("Failed to allocate memory for output");
            }
            strcpy(out, json.c_str());
        } catch (const std::exception& e) {
            // If memory allocation fails, return a simple error message
            const char* errorMsg = "{\"error\":\"Memory allocation failed\"}";
            out = (char*)malloc(strlen(errorMsg) + 1);
            if (out) {
                strcpy(out, errorMsg);
            } else {
                // If we can't even allocate the error message, return a minimal response
                out = (char*)malloc(13); // size for {"faces":[]}
                if (out) {
                    strcpy(out, "{\"faces\":[]}");
                }
            }
        }

        return out;
    } catch (const std::exception& e) {
        // Return error as JSON
        std::string errorMsg = std::string("{\"error\":\"") + e.what() + "\"}";
        char* out = (char*)malloc(errorMsg.size() + 1);
        if (out) {
            strcpy(out, errorMsg.c_str());
        } else {
            // Fallback if memory allocation fails
            out = (char*)malloc(13); // size for {"faces":[]}
            if (out) {
                strcpy(out, "{\"faces\":[]}");
            }
        }
        progressCounter = 100; // Mark as complete to stop progress indicator
        return out;
    }
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

} // extern "C"
