/*
  2025-12-11-t-embedding-arbitrary-weights.cpp

  High-precision weight management for T-embeddings of Aztec diamond with arbitrary periodic weights.
  Uses Boost multiprecision for 100+ digit precision computations.

  Following Berggren-Borodin convention:
  - Each black face has edges with weights α (bottom), β (right), γ (left), 1 (top)
  - Face weights: X = α/(βγ) for black faces, X = βγ/α for white faces
  - Periodicity: k×l periodic weights with indices j=0..k-1, i=0..l-1

  Compile command:
    emcc 2025-12-11-t-embedding-arbitrary-weights.cpp -o 2025-12-11-t-embedding-arbitrary-weights.js \
     -s WASM=1 \
     -s ASYNCIFY=1 \
     -s "EXPORTED_FUNCTIONS=['_initWeights','_setWeight','_getWeightsJSON','_getEdgesJSON','_getFacesJSON','_setN','_setPeriodicParams','_freeString','_getProgress','_resetProgress']" \
     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
     -s ALLOW_MEMORY_GROWTH=1 \
     -s INITIAL_MEMORY=64MB \
     -s ENVIRONMENT=web \
     -s SINGLE_FILE=1 \
     -O3 -ffast-math \
     && mv 2025-12-11-t-embedding-arbitrary-weights.js ../../js/
*/

#include <emscripten.h>
#include <cmath>
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

// Helper functions
static bool inDiamond(double x, double y, int n) {
    return std::abs(x) + std::abs(y) <= n + 0.5;
}

static bool isBlackFace(int fx, int fy) {
    return (fx + fy) % 2 == 0;
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

// Get edge weight and direction based on position
static void getEdgeWeightAndDir(double x1, double y1, double x2, double y2,
                                 HighPrecFloat& weight, std::string& dir,
                                 int& periodicI, int& periodicJ) {
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

            // Compute face weight
            // Black face: X = α/(βγ) = bottom / (right * left)
            // White face: X = βγ/α = (right * left) / top
            Face f;
            f.x = fx;
            f.y = fy;
            f.isBlack = isBlackFace(fx, fy);

            if (f.isBlack) {
                f.weight = wBottom / (wRight * wLeft);
            } else {
                f.weight = (wRight * wLeft) / wTop;
            }

            std::ostringstream fkey;
            fkey << fx << "," << fy;
            g_faces[fkey.str()] = f;
        }
    }
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

// Set the diamond size
EMSCRIPTEN_KEEPALIVE
void setN(int n) {
    if (n < 1) n = 1;
    if (n > 100) n = 100;
    g_n = n;
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

// Initialize weights with default values
EMSCRIPTEN_KEEPALIVE
void initWeights() {
    initWeightArrays();
    buildEdges();
    buildFaces();
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

} // extern "C"
