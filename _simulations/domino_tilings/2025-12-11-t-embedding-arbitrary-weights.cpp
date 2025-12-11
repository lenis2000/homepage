/*
  2025-12-11-t-embedding-arbitrary-weights.cpp

  High-precision weight management for T-embeddings of Aztec diamond with arbitrary periodic weights.
  Uses Boost multiprecision for 100+ digit precision computations.

  Following Berggren-Borodin convention:
  - Each black face has edges with weights α (bottom), β (right), γ (left), 1 (top)
  - Face weights: X = α/(βγ) for black faces, X = βγ/α for white faces
  - Periodicity: k×l periodic weights with indices j=0..k-1, i=0..l-1

  Compile command (AI agent: use single line for auto-approval):
    emcc 2025-12-11-t-embedding-arbitrary-weights.cpp -o 2025-12-11-t-embedding-arbitrary-weights.js -s WASM=1 -s ASYNCIFY=1 -s "EXPORTED_FUNCTIONS=['_initWeights','_setWeight','_getWeightsJSON','_getEdgesJSON','_getFacesJSON','_setN','_setPeriodicParams','_freeString','_getProgress','_resetProgress','_foldWeights','_urbanRenewalStep1','_urbanRenewalStep2','_urbanRenewalStep3','_computeTembedding','_getTembeddingJSON']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math && mv 2025-12-11-t-embedding-arbitrary-weights.js ../../js/
*/

#include <emscripten.h>
#include <cmath>
#include <complex>
#include <vector>
#include <string>
#include <sstream>
#include <iomanip>
#include <cstdlib>
#include <cstring>
#include <map>

// For now using double precision - Boost multiprecision can be added later
// when higher precision is needed for specific computations
// #include <boost/multiprecision/cpp_dec_float.hpp>
// typedef boost::multiprecision::cpp_dec_float_100 HighPrecFloat;

typedef double HighPrecFloat;

// Global state
static int g_n = 5;           // Diamond size parameter
static int g_k = 2;           // Vertical period
static int g_l = 2;           // Horizontal period

// Weight arrays: alpha[j][i], beta[j][i], gamma[j][i] for j=0..k-1, i=0..l-1
static std::vector<std::vector<HighPrecFloat>> g_alpha;
static std::vector<std::vector<HighPrecFloat>> g_beta;
static std::vector<std::vector<HighPrecFloat>> g_gamma;

// Progress tracking
static int g_progress = 0;

// Edge structure
struct Edge {
    double x1, y1, x2, y2;
    HighPrecFloat weight;
    std::string dir;  // "alpha", "beta", "gamma", "one"
    int periodicI, periodicJ;
    bool isHorizontal;
};

// Face structure
struct Face {
    int x, y;
    HighPrecFloat weight;
    bool isBlack;
};

// Storage
static std::map<std::string, Edge> g_edges;
static std::map<std::string, Face> g_faces;

// After folding, we use arbitrary edge weights instead of periodic
static bool g_useArbitraryWeights = false;
static std::map<std::string, HighPrecFloat> g_arbitraryEdgeWeights;

// Track color swap: after each fold, black<->white swap
static bool g_colorsSwapped = false;

// T-embedding computation storage
static int g_originalN = 0;  // Store original n before folding
static std::vector<std::map<std::string, HighPrecFloat>> g_faceWeightsHistory;  // Face weights at each level
static std::vector<bool> g_colorSwapHistory;  // Color swap state at each level

// T-embedding results: complex numbers stored as pairs (real, imag)
struct TVertex {
    double x, y;  // Original grid position
    double tReal, tImag;  // T-embedded position (complex number)
};
static std::map<std::string, TVertex> g_tEmbedding;
static int g_debugZeroCount = 0;

// Store T-embedding at each level for step-by-step visualization
static std::vector<std::map<std::string, TVertex>> g_tEmbeddingHistory;

// Helper functions
static bool inDiamond(double x, double y, int n) {
    return std::abs(x) + std::abs(y) <= n + 0.5;
}

static bool isBlackFace(int fx, int fy) {
    // Simple formula: g_colorsSwapped handles everything
    // At init, g_colorsSwapped is set based on initial n parity
    // After each fold step 3, it toggles
    bool baseBlack = (fx + fy) % 2 == 0;
    return g_colorsSwapped ? !baseBlack : baseBlack;
}

// Convert high precision float to string
static std::string hpToString(HighPrecFloat val) {
    std::ostringstream oss;
    oss << std::setprecision(15) << static_cast<double>(val);
    return oss.str();
}

// Initialize weight arrays with default values
static void initWeightArrays() {
    g_alpha.clear();
    g_beta.clear();
    g_gamma.clear();

    g_alpha.resize(g_k);
    g_beta.resize(g_k);
    g_gamma.resize(g_k);

    for (int j = 0; j < g_k; j++) {
        g_alpha[j].resize(g_l, 1.0);
        g_beta[j].resize(g_l, 1.0);
        g_gamma[j].resize(g_l, 1.0);
    }

    // Set interesting default values for 2x2 case
    if (g_k == 2 && g_l == 2) {
        g_alpha[1][1] = 1.5;
        g_beta[0][0] = 0.95;
        g_beta[1][1] = 0.1;
        g_gamma[1][0] = 0.95;
        g_gamma[0][1] = 0.1;
    }
}

// Generate edge key from coordinates
static std::string makeEdgeKey(double x1, double y1, double x2, double y2) {
    std::ostringstream keyss;
    keyss << x1 << "," << y1 << "-" << x2 << "," << y2;
    return keyss.str();
}

// Get edge weight and direction based on position
static void getEdgeWeightAndDir(double x1, double y1, double x2, double y2,
                                 HighPrecFloat& weight, std::string& dir,
                                 int& periodicI, int& periodicJ) {
    // Check for arbitrary weight first
    if (g_useArbitraryWeights) {
        std::string key = makeEdgeKey(x1, y1, x2, y2);
        auto it = g_arbitraryEdgeWeights.find(key);
        if (it != g_arbitraryEdgeWeights.end()) {
            weight = it->second;
            dir = "arbitrary";
            periodicI = periodicJ = 0;
            return;
        }
    }

    bool isHorizontal = (y1 == y2);
    int faceX, faceY;

    if (isHorizontal) {
        // Horizontal edge
        int faceAboveX = static_cast<int>(std::round((x1 + x2) / 2.0));
        int faceAboveY = static_cast<int>(std::round(y1 + 0.5));
        int faceBelowX = static_cast<int>(std::round((x1 + x2) / 2.0));
        int faceBelowY = static_cast<int>(std::round(y1 - 0.5));

        if (isBlackFace(faceAboveX, faceAboveY)) {
            faceX = faceAboveX;
            faceY = faceAboveY;
            dir = "alpha";  // bottom edge of black face
        } else if (isBlackFace(faceBelowX, faceBelowY)) {
            faceX = faceBelowX;
            faceY = faceBelowY;
            dir = "one";  // top edge of black face = 1
            weight = 1.0;
            periodicI = periodicJ = 0;
            return;
        } else {
            weight = 1.0;
            dir = "error";
            periodicI = periodicJ = 0;
            return;
        }
    } else {
        // Vertical edge
        int faceRightX = static_cast<int>(std::round(x1 + 0.5));
        int faceRightY = static_cast<int>(std::round((y1 + y2) / 2.0));
        int faceLeftX = static_cast<int>(std::round(x1 - 0.5));
        int faceLeftY = static_cast<int>(std::round((y1 + y2) / 2.0));

        if (isBlackFace(faceRightX, faceRightY)) {
            faceX = faceRightX;
            faceY = faceRightY;
            dir = "gamma";  // left edge of black face
        } else if (isBlackFace(faceLeftX, faceLeftY)) {
            faceX = faceLeftX;
            faceY = faceLeftY;
            dir = "beta";  // right edge of black face
        } else {
            weight = 1.0;
            dir = "error";
            periodicI = periodicJ = 0;
            return;
        }
    }

    // Compute periodic indices using diagonal coordinates
    int diagI = (faceX + faceY) / 2;
    int diagJ = (faceX - faceY) / 2;

    periodicI = ((diagI % g_l) + g_l) % g_l;
    periodicJ = ((diagJ % g_k) + g_k) % g_k;

    // Get weight from arrays
    if (dir == "alpha") {
        weight = g_alpha[periodicJ][periodicI];
    } else if (dir == "beta") {
        weight = g_beta[periodicJ][periodicI];
    } else if (dir == "gamma") {
        weight = g_gamma[periodicJ][periodicI];
    } else {
        weight = 1.0;
    }
}

// Build all edges in the diamond
static void buildEdges() {
    g_edges.clear();

    std::vector<double> coords;
    for (int kk = -g_n; kk <= g_n; kk++) {
        coords.push_back(kk - 0.5);
        coords.push_back(kk + 0.5);
    }

    for (double i : coords) {
        for (double j : coords) {
            if (!inDiamond(i, j, g_n)) continue;

            // Horizontal edge to the right
            if (inDiamond(i + 1, j, g_n)) {
                std::ostringstream keyss;
                keyss << i << "," << j << "-" << (i+1) << "," << j;
                std::string key = keyss.str();

                Edge e;
                e.x1 = i; e.y1 = j;
                e.x2 = i + 1; e.y2 = j;
                e.isHorizontal = true;
                getEdgeWeightAndDir(i, j, i + 1, j, e.weight, e.dir, e.periodicI, e.periodicJ);
                g_edges[key] = e;
            }

            // Vertical edge upward
            if (inDiamond(i, j + 1, g_n)) {
                std::ostringstream keyss;
                keyss << i << "," << j << "-" << i << "," << (j+1);
                std::string key = keyss.str();

                Edge e;
                e.x1 = i; e.y1 = j;
                e.x2 = i; e.y2 = j + 1;
                e.isHorizontal = false;
                getEdgeWeightAndDir(i, j, i, j + 1, e.weight, e.dir, e.periodicI, e.periodicJ);
                g_edges[key] = e;
            }
        }
    }
}

// Build all faces and compute face weights
static void buildFaces() {
    g_faces.clear();

    for (int fx = -g_n; fx <= g_n; fx++) {
        for (int fy = -g_n; fy <= g_n; fy++) {
            // Check all 4 corners are in diamond
            if (!inDiamond(fx - 0.5, fy - 0.5, g_n) ||
                !inDiamond(fx + 0.5, fy - 0.5, g_n) ||
                !inDiamond(fx - 0.5, fy + 0.5, g_n) ||
                !inDiamond(fx + 0.5, fy + 0.5, g_n)) continue;

            // Get the 4 edge keys
            std::ostringstream bkey, tkey, lkey, rkey;
            bkey << (fx - 0.5) << "," << (fy - 0.5) << "-" << (fx + 0.5) << "," << (fy - 0.5);
            tkey << (fx - 0.5) << "," << (fy + 0.5) << "-" << (fx + 0.5) << "," << (fy + 0.5);
            lkey << (fx - 0.5) << "," << (fy - 0.5) << "-" << (fx - 0.5) << "," << (fy + 0.5);
            rkey << (fx + 0.5) << "," << (fy - 0.5) << "-" << (fx + 0.5) << "," << (fy + 0.5);

            HighPrecFloat wBottom = 1.0, wTop = 1.0, wLeft = 1.0, wRight = 1.0;

            auto bit = g_edges.find(bkey.str());
            auto tit = g_edges.find(tkey.str());
            auto lit = g_edges.find(lkey.str());
            auto rit = g_edges.find(rkey.str());

            if (bit != g_edges.end()) wBottom = bit->second.weight;
            if (tit != g_edges.end()) wTop = tit->second.weight;
            if (lit != g_edges.end()) wLeft = lit->second.weight;
            if (rit != g_edges.end()) wRight = rit->second.weight;

            // Compute face weight using all 4 edges
            // Black face: X = (α * δ) / (β * γ) = (bottom * top) / (right * left)
            // White face: X = (β * γ) / (α * δ) = (right * left) / (bottom * top)
            // Initially δ (top for black, bottom for white) = 1, but after folding it's not
            Face f;
            f.x = fx;
            f.y = fy;
            f.isBlack = isBlackFace(fx, fy);

            if (f.isBlack) {
                f.weight = (wBottom * wTop) / (wRight * wLeft);
            } else {
                f.weight = (wRight * wLeft) / (wBottom * wTop);
            }

            std::ostringstream fkey;
            fkey << fx << "," << fy;
            g_faces[fkey.str()] = f;
        }
    }
}

// Step 1: Transform edge weights on black cells
static void doUrbanRenewalStep1() {
    if (g_n <= 1) return;

    // Store new edge weights
    std::map<std::string, HighPrecFloat> newWeights;

    // For each BLACK face, apply urban renewal transformation
    for (int fx = -g_n; fx <= g_n; fx++) {
        for (int fy = -g_n; fy <= g_n; fy++) {
            if (!isBlackFace(fx, fy)) continue;

            // Check all 4 corners are in diamond
            if (!inDiamond(fx - 0.5, fy - 0.5, g_n) ||
                !inDiamond(fx + 0.5, fy - 0.5, g_n) ||
                !inDiamond(fx - 0.5, fy + 0.5, g_n) ||
                !inDiamond(fx + 0.5, fy + 0.5, g_n)) continue;

            // Edge keys for this black face:
            // w = top (horizontal edge at y = fy + 0.5)
            // z = bottom (horizontal edge at y = fy - 0.5)
            // x = left (vertical edge at x = fx - 0.5)
            // y = right (vertical edge at x = fx + 0.5)
            std::string wKey = makeEdgeKey(fx - 0.5, fy + 0.5, fx + 0.5, fy + 0.5);
            std::string zKey = makeEdgeKey(fx - 0.5, fy - 0.5, fx + 0.5, fy - 0.5);
            std::string xKey = makeEdgeKey(fx - 0.5, fy - 0.5, fx - 0.5, fy + 0.5);
            std::string yKey = makeEdgeKey(fx + 0.5, fy - 0.5, fx + 0.5, fy + 0.5);

            // Get current weights
            HighPrecFloat w = 1.0, x = 1.0, y = 1.0, z = 1.0;
            auto wit = g_edges.find(wKey);
            auto zit = g_edges.find(zKey);
            auto xit = g_edges.find(xKey);
            auto yit = g_edges.find(yKey);

            if (wit != g_edges.end()) w = wit->second.weight;
            if (zit != g_edges.end()) z = zit->second.weight;
            if (xit != g_edges.end()) x = xit->second.weight;
            if (yit != g_edges.end()) y = yit->second.weight;

            // Urban renewal formula
            HighPrecFloat cellWeight = w * z + x * y;
            if (cellWeight < 1e-15) cellWeight = 1e-15; // Avoid division by zero

            HighPrecFloat wNew = z / cellWeight;
            HighPrecFloat xNew = y / cellWeight;
            HighPrecFloat yNew = x / cellWeight;
            HighPrecFloat zNew = w / cellWeight;

            // Store new weights
            newWeights[wKey] = wNew;
            newWeights[zKey] = zNew;
            newWeights[xKey] = xNew;
            newWeights[yKey] = yNew;
        }
    }

    // Switch to arbitrary weights mode
    g_useArbitraryWeights = true;
    g_arbitraryEdgeWeights = newWeights;

    buildEdges();
    buildFaces();
}

// Step 2: Strip boundary (decrease n)
static void doUrbanRenewalStep2() {
    if (g_n <= 1) return;
    g_n--;
    buildEdges();
    buildFaces();
}

// Step 3: Swap black<->white colors
static void doUrbanRenewalStep3() {
    g_colorsSwapped = !g_colorsSwapped;
    buildEdges();
    buildFaces();
}

// Store current face weights to history
static void storeFaceWeightsToHistory() {
    std::map<std::string, HighPrecFloat> currentFaceWeights;
    for (const auto& pair : g_faces) {
        currentFaceWeights[pair.first] = pair.second.weight;
    }
    g_faceWeightsHistory.push_back(currentFaceWeights);
    g_colorSwapHistory.push_back(g_colorsSwapped);
}

// Fold all the way to n=1, storing face weights at each level
static void computeAllFolds() {
    // Clear history
    g_faceWeightsHistory.clear();
    g_colorSwapHistory.clear();
    g_originalN = g_n;

    // Store initial face weights at level n
    storeFaceWeightsToHistory();

    // Fold repeatedly until n=1
    while (g_n > 1) {
        doUrbanRenewalStep1();
        doUrbanRenewalStep2();
        doUrbanRenewalStep3();
        storeFaceWeightsToHistory();
    }
}

// Get face weight from history at a given level for position (fx, fy)
// Level 0 = original size n, level 1 = n-1, etc.
static HighPrecFloat getFaceWeightFromHistory(int level, int fx, int fy) {
    if (level < 0 || level >= (int)g_faceWeightsHistory.size()) {
        return 1.0;
    }
    std::ostringstream key;
    key << fx << "," << fy;
    auto it = g_faceWeightsHistory[level].find(key.str());
    if (it != g_faceWeightsHistory[level].end()) {
        return it->second;
    }
    return 1.0;  // Default
}

// Compute T-embedding using the recurrence formula from Berggren-Nicoletti-Russkikh
// Following the structure of 2025-03-27-t-emb-a-json.cpp (uniform case)
//
// The boundary rhombus is fixed for ALL levels m=1..n:
//   T(-m,0) = -1,  T(m,0) = +1,  T(0,-m) = i*a,  T(0,m) = -i*a
//
// For arbitrary weights, we use face weights c_{j,k,m} from the folding history
// instead of the uniform α, β, γ formulas.
static void computeTembeddingRecurrence() {
    g_tEmbedding.clear();
    g_tEmbeddingHistory.clear();

    if (g_faceWeightsHistory.empty()) {
        return;
    }

    int n = g_originalN;  // Original diamond size
    int numLevels = (int)g_faceWeightsHistory.size();

    // Get the final face weight (at n=1, there's one face)
    // This is 'a' in the paper notation
    HighPrecFloat finalFaceWeight = 1.0;
    if (!g_faceWeightsHistory.back().empty()) {
        finalFaceWeight = g_faceWeightsHistory.back().begin()->second;
    }
    double a = std::abs(static_cast<double>(finalFaceWeight));
    if (a < 0.001) a = 1.0;

    // Boundary rhombus parameters from the paper:
    // Horizontal direction: from -a*sqrt(a^2+1) to +a*sqrt(a^2+1)
    // Vertical direction: from -sqrt(a^2+1) to +sqrt(a^2+1)
    double sqrtTerm = std::sqrt(a * a + 1.0);
    double horizScale = a * sqrtTerm;   // horizontal half-width
    double vertScale = sqrtTerm;        // vertical half-height

    // Use complex numbers like the uniform implementation
    typedef std::complex<double> Complex;

    // Tarray[m][j+n][k+n] for j,k in [-n..n], m in [0..n]
    std::vector<std::vector<std::vector<Complex>>> Tarray(
        n + 1,
        std::vector<std::vector<Complex>>(2*n + 1,
            std::vector<Complex>(2*n + 1, Complex(0, 0))
        )
    );

    // Helper to get face weight c_{j,k} at level m
    // faceWeightsHistory[0] = original size n
    // faceWeightsHistory[k] = size n-k
    // Level m corresponds to faceWeightsHistory[n - m]
    auto getFaceWeight = [&](int j, int k, int m) -> double {
        int histIdx = n - m;
        if (histIdx < 0 || histIdx >= numLevels) return 1.0;

        std::ostringstream key;
        key << j << "," << k;
        auto it = g_faceWeightsHistory[histIdx].find(key.str());
        if (it != g_faceWeightsHistory[histIdx].end()) {
            return static_cast<double>(it->second);
        }
        return 1.0;
    };

    // Helper to store T-embedding at a given level m
    auto storeTembeddingAtLevel = [&](int m) {
        std::map<std::string, TVertex> levelMap;
        for (int k = -m; k <= m; k++) {
            for (int j = -m; j <= m; j++) {
                bool isInterior = (std::abs(k) + std::abs(j) < m);
                bool isCorner = (j == -m && k == 0) || (j == m && k == 0) ||
                               (j == 0 && k == -m) || (j == 0 && k == m);
                if (isInterior || isCorner) {
                    std::ostringstream key;
                    key << j << "," << k;
                    TVertex v;
                    v.x = j;
                    v.y = k;
                    v.tReal = Tarray[m][(j + n)][(k + n)].real();
                    v.tImag = Tarray[m][(j + n)][(k + n)].imag();
                    levelMap[key.str()] = v;
                }
            }
        }
        g_tEmbeddingHistory.push_back(levelMap);
    };

    // 1) Initialize boundary for all levels m=1..n
    // Boundary rhombus vertices with correct scaling:
    //   T(-m,0) = -horizScale,  T(m,0) = +horizScale
    //   T(0,-m) = i*vertScale,  T(0,m) = -i*vertScale
    for (int m = 1; m <= n; m++) {
        Tarray[m][(-m + n)][(0 + n)] = Complex(-horizScale, 0.0);
        Tarray[m][(m + n)][(0 + n)] = Complex(horizScale, 0.0);
        Tarray[m][(0 + n)][(-m + n)] = Complex(0.0, vertScale);
        Tarray[m][(0 + n)][(m + n)] = Complex(0.0, -vertScale);
    }

    // Store level 1 (just the boundary rhombus)
    storeTembeddingAtLevel(1);

    // 2) Fill T for m=1..(n-1) via the recursive rule
    // Use face weights at level m for all updates from m -> m+1
    for (int m = 1; m < n; m++) {
        Complex one(1.0, 0.0);

        // Ensure boundary corners for level m+1 are set (safety reset)
        Tarray[m+1][(-(m+1) + n)][(0 + n)] = Complex(-horizScale, 0.0);
        Tarray[m+1][((m+1) + n)][(0 + n)] = Complex(horizScale, 0.0);
        Tarray[m+1][(0 + n)][(-(m+1) + n)] = Complex(0.0, vertScale);
        Tarray[m+1][(0 + n)][((m+1) + n)] = Complex(0.0, -vertScale);

        // Pass 1: Boundary edges and pass-through
        for (int k = -m; k <= m; k++) {
            for (int j = -m; j <= m; j++) {
                if (std::abs(k) + std::abs(j) <= m) {
                    // Get face weight at this position at level m
                    double c = getFaceWeight(j, k, m);
                    Complex cVal(c, 0.0);

                    // Boundary edge updates (4 corners of the diamond along axes)
                    // Left edge: j = -m, k = 0
                    if (j == -m && k == 0) {
                        Tarray[m+1][(j + n)][(k + n)] =
                            (Tarray[m][(-m + n)][(0 + n)] + cVal * Tarray[m][(-m+1 + n)][(0 + n)])
                            / (one + cVal);
                    }
                    // Right edge: j = m, k = 0
                    if (j == m && k == 0) {
                        Tarray[m+1][(j + n)][(k + n)] =
                            (Tarray[m][(m + n)][(0 + n)] + cVal * Tarray[m][(m-1 + n)][(0 + n)])
                            / (one + cVal);
                    }
                    // Bottom edge: j = 0, k = -m
                    if (j == 0 && k == -m) {
                        Tarray[m+1][(j + n)][(k + n)] =
                            (cVal * Tarray[m][(0 + n)][(-m + n)] + Tarray[m][(0 + n)][(-m+1 + n)])
                            / (one + cVal);
                    }
                    // Top edge: j = 0, k = m
                    if (j == 0 && k == m) {
                        Tarray[m+1][(j + n)][(k + n)] =
                            (cVal * Tarray[m][(0 + n)][(m + n)] + Tarray[m][(0 + n)][(m-1 + n)])
                            / (one + cVal);
                    }

                    // Diagonal edges (corners of the square boundary)
                    // Upper-right diagonal: k = m - j, 1 <= j <= m-1
                    if ((1 <= j && j <= m-1) && (k == m - j)) {
                        Tarray[m+1][(j + n)][(k + n)] =
                            (Tarray[m][(j-1 + n)][(m-j + n)] + cVal * Tarray[m][(j + n)][(m-j-1 + n)])
                            / (one + cVal);
                    }
                    // Lower-right diagonal: k = -m + j, 1 <= j <= m-1
                    if ((1 <= j && j <= m-1) && (k == -m + j)) {
                        Tarray[m+1][(j + n)][(k + n)] =
                            (Tarray[m][(j-1 + n)][(-m+j + n)] + cVal * Tarray[m][(j + n)][(-m+j+1 + n)])
                            / (one + cVal);
                    }
                    // Upper-left diagonal: k = m + j, 1-m <= j <= -1
                    if (((1-m) <= j && j <= -1) && (k == m + j)) {
                        Tarray[m+1][(j + n)][(k + n)] =
                            (cVal * Tarray[m][(j + n)][(m+j-1 + n)] + Tarray[m][(j+1 + n)][(m+j + n)])
                            / (one + cVal);
                    }
                    // Lower-left diagonal: k = -m - j, 1-m <= j <= -1
                    if (((1-m) <= j && j <= -1) && (k == -m - j)) {
                        Tarray[m+1][(j + n)][(k + n)] =
                            (cVal * Tarray[m][(j + n)][(-m-j+1 + n)] + Tarray[m][(j+1 + n)][(-m-j + n)])
                            / (one + cVal);
                    }

                    // Interior pass-through (for positions where (j+k+m) % 2 == 0)
                    if ((std::abs(k) + std::abs(j) < m) && (((j + k + m) % 2) == 0)) {
                        Tarray[m+1][(j + n)][(k + n)] = Tarray[m][(j + n)][(k + n)];
                    }
                }
            }
        }

        // Pass 2: Interior recurrence (for positions where (j+k+m) % 2 == 1)
        for (int k = -m; k <= m; k++) {
            for (int j = -m; j <= m; j++) {
                if (std::abs(k) + std::abs(j) <= m) {
                    if ((std::abs(k) + std::abs(j) < m) && (((j + k + m) % 2) == 1)) {
                        double c = getFaceWeight(j, k, m);
                        Complex cVal(c, 0.0);

                        // T[m+1](j,k) = -T[m](j,k) + (T[m+1](j-1,k) + T[m+1](j+1,k) + c*T[m+1](j,k+1) + c*T[m+1](j,k-1)) / (1+c)
                        Tarray[m+1][(j + n)][(k + n)] =
                            -Tarray[m][(j + n)][(k + n)]
                            + (Tarray[m+1][(j-1 + n)][(k + n)]
                               + Tarray[m+1][(j+1 + n)][(k + n)]
                               + cVal * Tarray[m+1][(j + n)][(k+1 + n)]
                               + cVal * Tarray[m+1][(j + n)][(k-1 + n)]
                              ) / (one + cVal);
                    }
                }
            }
        }

        // Store T-embedding at level m+1
        storeTembeddingAtLevel(m + 1);
    }

    // Debug: count how many zeros at level n
    int zeroCount = 0;
    for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
            if (std::abs(k) + std::abs(j) <= n) {
                Complex val = Tarray[n][(j + n)][(k + n)];
                if (std::abs(val.real()) < 0.0001 && std::abs(val.imag()) < 0.0001) {
                    zeroCount++;
                }
            }
        }
    }

    // Store the T-embedding result for the final level n
    // The augmented graph has a 4-edge outer face, so we only include:
    // - Interior points: |j|+|k| < n
    // - The 4 corner points: (-n,0), (n,0), (0,-n), (0,n)
    // The diagonal boundary points (|j|+|k| = n with j≠0 and k≠0) are NOT part of the T-embedding
    for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
            bool isInterior = (std::abs(k) + std::abs(j) < n);
            bool isCorner = (j == -n && k == 0) || (j == n && k == 0) ||
                           (j == 0 && k == -n) || (j == 0 && k == n);

            if (isInterior || isCorner) {
                std::ostringstream key;
                key << j << "," << k;

                TVertex v;
                v.x = j;
                v.y = k;
                v.tReal = Tarray[n][(j + n)][(k + n)].real();
                v.tImag = Tarray[n][(j + n)][(k + n)].imag();
                g_tEmbedding[key.str()] = v;
            }
        }
    }

    // Store debug info
    g_debugZeroCount = zeroCount;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return g_progress;
}

EMSCRIPTEN_KEEPALIVE
void resetProgress() {
    g_progress = 0;
}

// Set the diamond size (resets to periodic weights)
EMSCRIPTEN_KEEPALIVE
void setN(int n) {
    if (n < 1) n = 1;
    if (n > 100) n = 100;
    g_n = n;
    g_useArbitraryWeights = false;
    g_arbitraryEdgeWeights.clear();
    // Set initial color swap based on n parity so leftmost face is always black
    // Leftmost face at (-(n-1), 0) has sum -(n-1)
    // For n odd: sum even → baseBlack=true → no swap needed
    // For n even: sum odd → baseBlack=false → swap needed
    g_colorsSwapped = (n % 2 == 0);
    buildEdges();
    buildFaces();
}

// Set periodic parameters k and l
EMSCRIPTEN_KEEPALIVE
void setPeriodicParams(int k, int l) {
    if (k < 1) k = 1;
    if (k > 10) k = 10;
    if (l < 1) l = 1;
    if (l > 10) l = 10;
    g_k = k;
    g_l = l;
    initWeightArrays();
    buildEdges();
    buildFaces();
}

// Initialize weights with default values (resets to periodic weights)
EMSCRIPTEN_KEEPALIVE
void initWeights() {
    g_useArbitraryWeights = false;
    g_arbitraryEdgeWeights.clear();
    // Set initial color swap based on n parity so leftmost face is always black
    g_colorsSwapped = (g_n % 2 == 0);
    initWeightArrays();
    buildEdges();
    buildFaces();
}

// Full urban renewal: all 3 steps combined
EMSCRIPTEN_KEEPALIVE
void foldWeights() {
    if (g_n <= 1) return;
    doUrbanRenewalStep1();
    doUrbanRenewalStep2();
    doUrbanRenewalStep3();
}

// Step 1 of urban renewal: transform edge weights on black cells
EMSCRIPTEN_KEEPALIVE
void urbanRenewalStep1() {
    doUrbanRenewalStep1();
}

// Step 2 of urban renewal: strip boundary (decrease n)
EMSCRIPTEN_KEEPALIVE
void urbanRenewalStep2() {
    doUrbanRenewalStep2();
}

// Step 3 of urban renewal: swap black<->white colors
EMSCRIPTEN_KEEPALIVE
void urbanRenewalStep3() {
    doUrbanRenewalStep3();
}

// Set a specific weight value
// param: 0=alpha, 1=beta, 2=gamma
EMSCRIPTEN_KEEPALIVE
void setWeight(int param, int j, int i, double value) {
    if (j < 0 || j >= g_k || i < 0 || i >= g_l) return;
    if (value <= 0) value = 0.01;

    switch (param) {
        case 0: g_alpha[j][i] = value; break;
        case 1: g_beta[j][i] = value; break;
        case 2: g_gamma[j][i] = value; break;
    }

    buildEdges();
    buildFaces();
}

// Get all weights as JSON
EMSCRIPTEN_KEEPALIVE
char* getWeightsJSON() {
    std::ostringstream oss;
    oss << "{\"k\":" << g_k << ",\"l\":" << g_l << ",\"n\":" << g_n;

    // Alpha
    oss << ",\"alpha\":[";
    for (int j = 0; j < g_k; j++) {
        if (j > 0) oss << ",";
        oss << "[";
        for (int i = 0; i < g_l; i++) {
            if (i > 0) oss << ",";
            oss << hpToString(g_alpha[j][i]);
        }
        oss << "]";
    }
    oss << "]";

    // Beta
    oss << ",\"beta\":[";
    for (int j = 0; j < g_k; j++) {
        if (j > 0) oss << ",";
        oss << "[";
        for (int i = 0; i < g_l; i++) {
            if (i > 0) oss << ",";
            oss << hpToString(g_beta[j][i]);
        }
        oss << "]";
    }
    oss << "]";

    // Gamma
    oss << ",\"gamma\":[";
    for (int j = 0; j < g_k; j++) {
        if (j > 0) oss << ",";
        oss << "[";
        for (int i = 0; i < g_l; i++) {
            if (i > 0) oss << ",";
            oss << hpToString(g_gamma[j][i]);
        }
        oss << "]";
    }
    oss << "]}";

    std::string result = oss.str();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

// Get all edges as JSON
EMSCRIPTEN_KEEPALIVE
char* getEdgesJSON() {
    std::ostringstream oss;
    oss << "[";

    bool first = true;
    for (const auto& pair : g_edges) {
        const Edge& e = pair.second;
        if (!first) oss << ",";
        first = false;

        oss << "{\"key\":\"" << pair.first << "\""
            << ",\"x1\":" << e.x1
            << ",\"y1\":" << e.y1
            << ",\"x2\":" << e.x2
            << ",\"y2\":" << e.y2
            << ",\"weight\":" << hpToString(e.weight)
            << ",\"dir\":\"" << e.dir << "\""
            << ",\"i\":" << e.periodicI
            << ",\"j\":" << e.periodicJ
            << ",\"horizontal\":" << (e.isHorizontal ? "true" : "false")
            << "}";
    }

    oss << "]";

    std::string result = oss.str();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

// Get all faces as JSON
EMSCRIPTEN_KEEPALIVE
char* getFacesJSON() {
    std::ostringstream oss;
    oss << "[";

    bool first = true;
    for (const auto& pair : g_faces) {
        const Face& f = pair.second;
        if (!first) oss << ",";
        first = false;

        oss << "{\"key\":\"" << pair.first << "\""
            << ",\"x\":" << f.x
            << ",\"y\":" << f.y
            << ",\"weight\":" << hpToString(f.weight)
            << ",\"isBlack\":" << (f.isBlack ? "true" : "false")
            << "}";
    }

    oss << "]";

    std::string result = oss.str();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    std::free(str);
}

EMSCRIPTEN_KEEPALIVE
void computeTembedding(int n) {
    // Reset to given n and current weights, then compute T-embedding
    int originalN = g_n;
    bool originalUseArbitrary = g_useArbitraryWeights;
    std::map<std::string, HighPrecFloat> originalArbitraryWeights = g_arbitraryEdgeWeights;
    bool originalColorsSwapped = g_colorsSwapped;

    // Initialize fresh at n
    g_n = n;
    g_colorsSwapped = (n % 2 == 0);
    g_useArbitraryWeights = originalUseArbitrary;
    g_arbitraryEdgeWeights = originalArbitraryWeights;
    buildEdges();
    buildFaces();

    // Compute all folds and T-embedding
    computeAllFolds();
    computeTembeddingRecurrence();

    // Restore original state
    g_n = originalN;
    g_colorsSwapped = originalColorsSwapped;
    g_useArbitraryWeights = originalUseArbitrary;
    g_arbitraryEdgeWeights = originalArbitraryWeights;
    buildEdges();
    buildFaces();
}

EMSCRIPTEN_KEEPALIVE
char* getTembeddingJSON() {
    std::ostringstream oss;
    oss << "{";

    // Output original n
    oss << "\"originalN\":" << g_originalN;

    // Output T-embedded vertices
    oss << ",\"vertices\":[";
    bool first = true;
    for (const auto& pair : g_tEmbedding) {
        if (!first) oss << ",";
        first = false;
        const TVertex& v = pair.second;
        oss << "{\"key\":\"" << pair.first << "\""
            << ",\"x\":" << v.x
            << ",\"y\":" << v.y
            << ",\"tReal\":" << v.tReal
            << ",\"tImag\":" << v.tImag
            << "}";
    }
    oss << "]";

    // Also output face weights history for debugging
    oss << ",\"numLevels\":" << g_faceWeightsHistory.size();

    // Output ALL face weights at ALL levels
    oss << ",\"faceWeightsHistory\":[";
    for (size_t level = 0; level < g_faceWeightsHistory.size(); level++) {
        if (level > 0) oss << ",";
        oss << "{\"level\":" << level;
        oss << ",\"diamondSize\":" << (g_originalN - (int)level);
        oss << ",\"colorsSwapped\":" << (g_colorSwapHistory.size() > level ? (g_colorSwapHistory[level] ? "true" : "false") : "false");
        oss << ",\"faces\":[";
        bool firstFace = true;
        for (const auto& kv : g_faceWeightsHistory[level]) {
            if (!firstFace) oss << ",";
            firstFace = false;
            // Parse key to get x,y coordinates
            int fx = 0, fy = 0;
            sscanf(kv.first.c_str(), "%d,%d", &fx, &fy);
            // Determine if black at this level (need to account for color swap)
            bool swapped = (g_colorSwapHistory.size() > level) ? g_colorSwapHistory[level] : false;
            bool baseBlack = (fx + fy) % 2 == 0;
            bool isBlack = swapped ? !baseBlack : baseBlack;
            oss << "{\"key\":\"" << kv.first << "\",\"x\":" << fx << ",\"y\":" << fy
                << ",\"w\":" << kv.second << ",\"isBlack\":" << (isBlack ? "true" : "false") << "}";
        }
        oss << "]}";
    }
    oss << "]";

    // Output T-embedding at ALL levels for step-by-step visualization
    oss << ",\"tembHistory\":[";
    for (size_t level = 0; level < g_tEmbeddingHistory.size(); level++) {
        if (level > 0) oss << ",";
        int m = level + 1;  // T-embedding levels are m=1,2,...,n
        oss << "{\"level\":" << m << ",\"vertices\":[";
        bool firstV = true;
        for (const auto& kv : g_tEmbeddingHistory[level]) {
            if (!firstV) oss << ",";
            firstV = false;
            const TVertex& v = kv.second;
            oss << "{\"key\":\"" << kv.first << "\""
                << ",\"x\":" << v.x
                << ",\"y\":" << v.y
                << ",\"tReal\":" << v.tReal
                << ",\"tImag\":" << v.tImag
                << "}";
        }
        oss << "]}";
    }
    oss << "]";

    // Debug: output parameter a and boundary scaling
    HighPrecFloat finalFaceWeight = 1.0;
    if (!g_faceWeightsHistory.empty() && !g_faceWeightsHistory.back().empty()) {
        finalFaceWeight = g_faceWeightsHistory.back().begin()->second;
    }
    double aParam = std::abs(static_cast<double>(finalFaceWeight));
    double sqrtTerm = std::sqrt(aParam * aParam + 1.0);
    double horizScale = aParam * sqrtTerm;
    double vertScale = sqrtTerm;
    oss << ",\"paramA\":" << aParam;
    oss << ",\"horizScale\":" << horizScale;
    oss << ",\"vertScale\":" << vertScale;
    oss << ",\"debugZeroCount\":" << g_debugZeroCount;

    // Debug: output corner vertices
    oss << ",\"corners\":{";
    auto corners = {
        std::make_pair("-n,0", std::make_pair(-g_originalN, 0)),
        std::make_pair("n,0", std::make_pair(g_originalN, 0)),
        std::make_pair("0,-n", std::make_pair(0, -g_originalN)),
        std::make_pair("0,n", std::make_pair(0, g_originalN))
    };
    first = true;
    for (const auto& c : corners) {
        std::ostringstream key;
        key << c.second.first << "," << c.second.second;
        auto it = g_tEmbedding.find(key.str());
        if (it != g_tEmbedding.end()) {
            if (!first) oss << ",";
            first = false;
            oss << "\"" << c.first << "\":{\"re\":" << it->second.tReal << ",\"im\":" << it->second.tImag << "}";
        }
    }
    oss << "}";

    oss << "}";

    std::string result = oss.str();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

} // extern "C"
