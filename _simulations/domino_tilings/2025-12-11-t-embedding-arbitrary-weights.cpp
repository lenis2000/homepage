/*
  2025-12-11-t-embedding-arbitrary-weights.cpp

  T-embedding of Aztec diamond using Berggren-Russkikh Proposition recurrence.
  Uses arbitrary coefficients α_n, β_{j,n}, γ_{j,k,n} for the recurrence formulas.

  Two-phase algorithm:
  1. Going DOWN (n → 1): Compute coefficients from edge weights (TODO - for now all 1s)
  2. Going UP (1 → n): Build T-embedding using recurrence formulas

  Compile command (AI agent: use single line for auto-approval):
    emcc 2025-12-11-t-embedding-arbitrary-weights.cpp -o 2025-12-11-t-embedding-arbitrary-weights.js -s WASM=1 -s "EXPORTED_FUNCTIONS=['_setN','_clearTembLevels','_clearStoredWeightsExport','_initCoefficients','_computeTembedding','_generateAztecGraph','_getAztecGraphJSON','_getAztecFacesJSON','_getStoredFaceWeightsJSON','_getBetaRatiosJSON','_getTembeddingLevelJSON','_getOrigamiLevelJSON','_randomizeAztecWeights','_setAztecWeightMode','_setRandomIIDParams','_setLayeredParams','_setGammaParams','_setPeriodicPeriod','_setPeriodicWeight','_getPeriodicParams','_resetAztecGraphPreservingWeights','_seedRng','_setAztecGraphLevel','_aztecGraphStepDown','_aztecGraphStepUp','_getAztecReductionStep','_canAztecStepUp','_canAztecStepDown','_getComputeTimeMs','_freeString']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 && mv 2025-12-11-t-embedding-arbitrary-weights.js ../../js/
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
#include <cstdio>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

// Use standard double precision
using mp_real = double;
using mp_complex = std::complex<double>;

// Hash function for std::pair<int,int> to use with unordered_map
struct PairHash {
    size_t operator()(const std::pair<int,int>& p) const {
        return std::hash<int64_t>()((int64_t)p.first << 32 | (uint32_t)p.second);
    }
};

// Hash function for std::pair<int64_t,int64_t>
struct PairHash64 {
    size_t operator()(const std::pair<int64_t,int64_t>& p) const {
        size_t h1 = std::hash<int64_t>()(p.first);
        size_t h2 = std::hash<int64_t>()(p.second);
        return h1 ^ (h2 * 0x9e3779b97f4a7c15ULL + (h1 << 6) + (h1 >> 2));
    }
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

static const int MAX_N = 100;  // Maximum supported n value (change this to increase limit)

static double g_totalComputeTimeMs = 0.0;  // Cumulative computation time in milliseconds

static int g_n = 6;           // Diamond size parameter (default n=6)
static double g_a = 1.0;      // Boundary parameter (computed or set)

// Coefficients for T-embedding recurrence (Proposition from paper)
// α_n for n = 1..N (axis boundary formula)
static std::vector<double> g_alpha;  // g_alpha[n] = α_n

// β_{j,n} for diagonal boundary formula
// g_beta[n][j] = β_{j,n}
static std::vector<std::map<int, double>> g_beta;

// γ_{j,k,n} for interior recurrence formula
// g_gamma[n]["j,k"] = γ_{j,k,n}
static std::vector<std::map<std::string, double>> g_gamma;


// =============================================================================
// AZTEC DIAMOND GRAPH STRUCTURE
// =============================================================================

// NOTE: In the Berggren-Russkikh paper, an Aztec diamond with k vertices along
// each edge of the outer rhombus is called A_{k+1}. So our "level k" graph
// corresponds to A_{k+1} in the paper notation.

// Aztec diamond graph vertex (at half-integer coordinates)
struct AztecVertex {
    double x, y;      // Half-integer coordinates (e.g., 0.5, -1.5)
    bool isWhite;     // Bipartite coloring: white if (i+j+k) is even, where x=i+0.5, y=j+0.5
    bool inVgauge;    // True if vertex is in V_gauge set (for highlighting)
    bool toContract;  // True if vertex will be contracted in next step
    bool active = true;  // Soft deletion: false means vertex is logically removed
};

// Aztec diamond graph edge with weight stored in LOG SPACE for numerical stability
struct AztecEdge {
    int v1, v2;       // Indices into vertex array
    mp_real logWeight;   // LOG of edge weight (100-digit precision) - use exp() to get actual weight
    bool isHorizontal; // True if horizontal edge, false if vertical
    bool gaugeTransformed; // True if this edge was modified by gauge transform
    bool active = true;  // Soft deletion: false means edge is logically removed

    // Helper to get actual weight
    mp_real weight() const { return exp(logWeight); }
    // Helper to set weight from actual value
    void setWeight(const mp_real& w) { logWeight = log(w); }
    // Helper for gauge transform: multiply by lambda
    void multiplyWeight(const mp_real& lambda) { logWeight += log(lambda); }
    // Helper for division: divide by d
    void divideWeight(const mp_real& d) { logWeight -= log(d); }
};

// Global Aztec graph storage
static int g_aztecLevel = 4;  // Current graph level k (default n=4)
static int g_aztecReductionStep = 0;  // 0=original, 1=gauge transformed, 2=degree-2 removed, 3=parallel merged
static std::vector<AztecVertex> g_aztecVertices;
static std::vector<AztecEdge> g_aztecEdges;

// Global adjacency cache: g_adj[vertex_idx] = list of edge indices incident to that vertex
static std::vector<std::vector<int>> g_adj;

// Black quad centers (preserved across transformations)
static std::vector<std::pair<double, double>> g_blackQuadCenters;

// Store graph history for stepping back (stack of states)
struct AztecGraphState {
    std::vector<AztecVertex> vertices;
    std::vector<AztecEdge> edges;
    std::vector<std::pair<double, double>> blackQuadCenters;
    int step;
    int level;
};
static std::vector<AztecGraphState> g_aztecHistory;

// Double edge ratios for T-embedding alpha values (captured from step 11)
struct DoubleEdgeRatios {
    int k;                 // Level when captured
    mp_real ratio_top;     // Top edge pair ratio (red/blue)
    mp_real ratio_bottom;  // Bottom edge pair ratio
    mp_real ratio_left;    // Left edge pair ratio
    mp_real ratio_right;   // Right edge pair ratio
    // Store numerator and denominator separately for display
    mp_real num_top, den_top;
    mp_real num_bottom, den_bottom;
    mp_real num_left, den_left;
    mp_real num_right, den_right;
};
static std::vector<DoubleEdgeRatios> g_doubleEdgeRatios;

// Beta edge ratios for T-embedding beta values (captured from step 11)
// These are from double edges connecting external (boundary) to inner vertices
struct BetaEdgeRatios {
    int k;  // Level for T_{k-1} → T_k computation
    std::map<std::pair<int,int>, mp_real> ratios;  // (i,j) → ratio for position
    std::map<std::pair<int,int>, mp_real> numerators;   // (i,j) → numerator
    std::map<std::pair<int,int>, mp_real> denominators; // (i,j) → denominator
};
static std::vector<BetaEdgeRatios> g_betaEdgeRatios;


// Beta position swap flags for T-embedding recurrence (hard-coded working config)
static const bool g_betaSwapUR = false;  // Upper-right quadrant
static const bool g_betaSwapLR = false;  // Lower-right quadrant
static const bool g_betaSwapUL = true;   // Upper-left quadrant (swapped)
static const bool g_betaSwapLL = true;   // Lower-left quadrant (swapped)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Optimization: Flat 2D grid for O(1) vertex lookups
// Grid size based on MAX_N (coordinates roughly [-MAX_N-5, MAX_N+5]).
struct FastGrid {
    std::vector<int> grid;
    int offset;
    int dim;

    FastGrid(int maxCoord = MAX_N + 20) {
        dim = 2 * maxCoord + 1;
        offset = maxCoord;
        grid.assign(dim * dim, -1);
    }

    void clear() {
        std::fill(grid.begin(), grid.end(), -1);
    }

    // Map integer coords (i,j) to index
    inline int& at(int i, int j) {
        return grid[(i + offset) * dim + (j + offset)];
    }

    // Check bounds (optional, for safety)
    inline bool inBounds(int i, int j) const {
        return (std::abs(i) < offset && std::abs(j) < offset);
    }
};

static std::string makeKey(int j, int k) {
    std::ostringstream ss;
    ss << j << "," << k;
    return ss.str();
}

// Rebuild the global adjacency cache from current vertices and edges
// Only includes active edges connecting active vertices
static void rebuildAdjacency() {
    g_adj.assign(g_aztecVertices.size(), std::vector<int>());
    for (size_t i = 0; i < g_aztecEdges.size(); ++i) {
        if (!g_aztecEdges[i].active) continue;  // Skip inactive edges
        int v1 = g_aztecEdges[i].v1;
        int v2 = g_aztecEdges[i].v2;
        // Only add if both endpoints are active
        if (v1 >= 0 && v1 < (int)g_aztecVertices.size() && g_aztecVertices[v1].active &&
            v2 >= 0 && v2 < (int)g_aztecVertices.size() && g_aztecVertices[v2].active) {
            g_adj[v1].push_back((int)i);
            g_adj[v2].push_back((int)i);
        }
    }
}

// Pack half-integer coordinates (x,y) into a unique 64-bit key
// For vertex at x = i + 0.5, y = j + 0.5, packs (i, j) into int64_t
inline int64_t makePosKey(double x, double y) {
    int i = static_cast<int>(std::round(x - 0.5));
    int j = static_cast<int>(std::round(y - 0.5));
    return (static_cast<int64_t>(i) << 32) | (static_cast<uint32_t>(j));
}

// Pack integer coordinates (i,j) directly into a 64-bit key
inline int64_t makeIntKey64(int i, int j) {
    return (static_cast<int64_t>(i) << 32) | (static_cast<uint32_t>(j));
}

// =============================================================================
// AZTEC GRAPH GENERATION
// =============================================================================

// Random number generator state (simple LCG)
static unsigned int g_rngState = 12345;

// Mersenne Twister RNG for gamma distribution
#include <random>
static std::mt19937 g_mt_rng(12345);

// Random IID parameters
static double g_iidMin = 0.5, g_iidMax = 2.0;

// Layered regime parameters
static int g_layeredRegime = 3;  // Default: Bernoulli
static double g_layeredP1 = 2.0, g_layeredP2 = 0.5;
static double g_layeredProb1 = 0.5, g_layeredProb2 = 0.5;

// Gamma distribution parameters
static double g_gammaAlpha = 0.2, g_gammaBeta = 0.25;

extern "C" {
EMSCRIPTEN_KEEPALIVE
void seedRng(unsigned int seed) {
    g_rngState = seed;
    g_mt_rng.seed(seed);
}
}

static double randomWeight() {
    // LCG: next = (a * current + c) mod m
    g_rngState = g_rngState * 1103515245 + 12345;
    int steps = (g_rngState >> 16) % 16;  // 0-15 steps
    return 0.5 + steps * 0.1;  // 0.5 to 2.0 in steps of 0.1
}

// Forward declarations for face detection and weight storage (defined later)
static void clearStoredWeights();
static void computeFaces();
static void tryCaptureFaceWeights();

// Generate Aztec diamond graph for level k
// Vertices at half-integer coordinates (i+0.5, j+0.5) where |x| + |y| <= k + 0.5
static void generateAztecGraphInternal(int k) {
    g_aztecVertices.clear();
    g_aztecEdges.clear();
    g_aztecLevel = k;
    clearStoredWeights();  // Clear stored face weights when graph changes

    // Map from (i,j) integer key to vertex index (using 64-bit key for efficiency)
    std::map<int64_t, int> vertexIndex;

    // Generate vertices
    for (int i = -k; i <= k; i++) {
        for (int j = -k; j <= k; j++) {
            double x = i + 0.5;
            double y = j + 0.5;
            if (std::abs(x) + std::abs(y) <= k + 0.5) {
                AztecVertex v;
                v.x = x;
                v.y = y;
                // Bipartite coloring depends on i + j + k
                // where x = i + 0.5, y = j + 0.5
                // isWhite when (i + j + k) is even
                v.isWhite = ((i + j + k) % 2 == 0);
                v.inVgauge = false;
                v.toContract = false;

                vertexIndex[makeIntKey64(i, j)] = (int)g_aztecVertices.size();
                g_aztecVertices.push_back(v);
            }
        }
    }

    // Generate edges (connect adjacent vertices)
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        double x = g_aztecVertices[idx].x;
        double y = g_aztecVertices[idx].y;
        int i = static_cast<int>(std::round(x - 0.5));
        int j = static_cast<int>(std::round(y - 0.5));

        // Check right neighbor (i+1, j)
        {
            auto it = vertexIndex.find(makeIntKey64(i + 1, j));
            if (it != vertexIndex.end()) {
                AztecEdge e;
                e.v1 = (int)idx;
                e.v2 = it->second;
                e.setWeight(mp_real(1));  // Default uniform weight
                e.isHorizontal = true;
                e.gaugeTransformed = false;
                g_aztecEdges.push_back(e);
            }
        }

        // Check top neighbor (i, j+1)
        {
            auto it = vertexIndex.find(makeIntKey64(i, j + 1));
            if (it != vertexIndex.end()) {
                AztecEdge e;
                e.v1 = (int)idx;
                e.v2 = it->second;
                e.setWeight(mp_real(1));  // Default uniform weight
                e.isHorizontal = false;
                e.gaugeTransformed = false;
                g_aztecEdges.push_back(e);
            }
        }
    }

    // Reset reduction step
    g_aztecReductionStep = 0;
    g_aztecHistory.clear();

    // Rebuild adjacency cache
    rebuildAdjacency();
}

// Randomize all edge weights
static void randomizeAztecWeightsInternal() {
    g_rngState = (unsigned int)(g_rngState * 1103515245 + 12345);  // Change seed
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        g_aztecEdges[i].setWeight(mp_real(randomWeight()));
    }
}

// Set all edge weights to 1 (uniform)
static void setUniformWeightsInternal() {
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        g_aztecEdges[i].setWeight(mp_real(1));
    }
}

// Helper: uniform random in [0,1)
static double uniformRandom() {
    g_rngState = g_rngState * 1103515245 + 12345;
    return (g_rngState >> 16) / 65536.0;
}

// Random IID weights with configurable range
static void setRandomIIDWeightsInternal() {
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        double u = uniformRandom();
        g_aztecEdges[i].setWeight(mp_real(g_iidMin + u * (g_iidMax - g_iidMin)));
    }
}

// Compute layered weight based on diagonal index and regime
static double computeLayeredWeight(int diagIndex) {
    double sqrtN = std::sqrt((double)g_aztecLevel);
    double u = uniformRandom();

    switch (g_layeredRegime) {
        case 1:  // Critical Scaling
            return (u < g_layeredProb1)
                ? g_layeredP1 + 2.0/sqrtN
                : g_layeredP2 - 1.0/sqrtN;
        case 2:  // Rare Event
            return (u < 1.0/sqrtN)
                ? g_layeredP1
                : g_layeredP2;
        case 3:  // Bernoulli
            return (u < g_layeredProb1)
                ? g_layeredP1
                : g_layeredP2;
        case 4:  // Deterministic Periodic
            return (diagIndex % 2 == 0) ? g_layeredP1 : g_layeredP2;
        case 5:  // Continuous Uniform
            return g_layeredP1 + u * (g_layeredP2 - g_layeredP1);
        default:
            return 1.0;
    }
}

// Set layered weights by diagonal
static void setLayeredWeightsInternal() {
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        AztecEdge& edge = g_aztecEdges[i];
        double x1 = g_aztecVertices[edge.v1].x;
        double y1 = g_aztecVertices[edge.v1].y;
        double x2 = g_aztecVertices[edge.v2].x;
        double y2 = g_aztecVertices[edge.v2].y;
        double midX = (x1 + x2) / 2.0;
        double midY = (y1 + y2) / 2.0;
        int diagIndex = (int)std::round(midX + midY);

        double w = computeLayeredWeight(diagIndex);
        edge.setWeight(mp_real(w));
    }
}

// Gamma random number generator using Mersenne Twister
static double gammaRandom(double shape) {
    if (shape <= 0) return 1.0;
    std::gamma_distribution<double> dist(shape, 1.0);
    return dist(g_mt_rng);
}

// Forward declaration for isBlackFace (defined below)
static bool isBlackFace(int fx, int fy);

// Classify edge as 'a' (alpha), 'b' (beta), 'g' (gamma), or '1' (one)
static char classifyEdge(const AztecEdge& edge) {
    double x1 = g_aztecVertices[edge.v1].x;
    double y1 = g_aztecVertices[edge.v1].y;
    double x2 = g_aztecVertices[edge.v2].x;
    double y2 = g_aztecVertices[edge.v2].y;

    if (edge.isHorizontal) {
        double midX = (x1 + x2) / 2.0;
        int faceAboveX = (int)std::round(midX);
        int faceAboveY = (int)std::round(y1 + 0.5);
        int faceBelowX = (int)std::round(midX);
        int faceBelowY = (int)std::round(y1 - 0.5);

        if (isBlackFace(faceAboveX, faceAboveY)) {
            return 'a';  // bottom edge of black face = alpha
        } else if (isBlackFace(faceBelowX, faceBelowY)) {
            return '1';  // top edge of black face = 1
        }
    } else {
        double midY = (y1 + y2) / 2.0;
        int faceRightX = (int)std::round(x1 + 0.5);
        int faceRightY = (int)std::round(midY);
        int faceLeftX = (int)std::round(x1 - 0.5);
        int faceLeftY = (int)std::round(midY);

        if (isBlackFace(faceRightX, faceRightY)) {
            return 'g';  // left edge of black face = gamma
        } else if (isBlackFace(faceLeftX, faceLeftY)) {
            return 'b';  // right edge of black face = beta
        }
    }
    return '1';  // default
}

// Set gamma-distributed weights (alpha edges get Gamma(alpha), beta edges get Gamma(beta))
static void setGammaWeightsInternal() {
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        AztecEdge& edge = g_aztecEdges[i];
        char edgeType = classifyEdge(edge);

        double weight = 1.0;
        if (edgeType == 'a') {
            weight = gammaRandom(g_gammaAlpha);
        } else if (edgeType == 'b') {
            weight = gammaRandom(g_gammaBeta);
        }
        // 'g' and '1' stay at 1.0

        edge.setWeight(mp_real(weight));
    }
}

// Periodic weight storage: alpha[j][i], beta[j][i], gamma[j][i] for period k x l
static int g_periodicK = 2, g_periodicL = 2;
static std::vector<std::vector<double>> g_periodicAlpha, g_periodicBeta, g_periodicGamma;

// Initialize periodic weight arrays with default interesting values
static void initPeriodicWeights(int k, int l) {
    g_periodicK = k;
    g_periodicL = l;
    g_periodicAlpha.assign(k, std::vector<double>(l, 1.0));
    g_periodicBeta.assign(k, std::vector<double>(l, 1.0));
    g_periodicGamma.assign(k, std::vector<double>(l, 1.0));

    // Set interesting default values for 2x2 case
    if (k == 2 && l == 2) {
        g_periodicAlpha[1][1] = 1.5;
        g_periodicBeta[0][0] = 0.95;
        g_periodicBeta[1][1] = 0.1;
        g_periodicGamma[1][0] = 0.95;
        g_periodicGamma[0][1] = 0.1;
    }
}

// Check if a face at integer coordinates (fx, fy) is black
// Black face: (fx + fy) is even
static bool isBlackFace(int fx, int fy) {
    return (fx + fy) % 2 == 0;
}

// Set periodic weights based on Berggren-Borodin convention:
// - Each BLACK face has 4 edges with weights α, β, γ, 1
// - α = bottom edge, β = right edge, γ = left edge, 1 = top edge
// - Periodic indices computed from diagonal coordinates of face center
static void setPeriodicWeightsInternal() {
    if (g_periodicAlpha.empty()) {
        initPeriodicWeights(2, 2);
    }

    int k = g_periodicK;
    int l = g_periodicL;

    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        AztecEdge& edge = g_aztecEdges[i];
        double x1 = g_aztecVertices[edge.v1].x;
        double y1 = g_aztecVertices[edge.v1].y;
        double x2 = g_aztecVertices[edge.v2].x;
        double y2 = g_aztecVertices[edge.v2].y;

        // Find which black face this edge belongs to
        int faceX, faceY;
        char edgeDir; // 'a'=alpha, 'b'=beta, 'g'=gamma, '1'=one

        if (edge.isHorizontal) {
            // Horizontal edge from (x1,y1) to (x2,y1)
            // Face above: center at (round(midX), round(y1 + 0.5))
            // Face below: center at (round(midX), round(y1 - 0.5))
            double midX = (x1 + x2) / 2.0;
            int faceAboveX = (int)std::round(midX);
            int faceAboveY = (int)std::round(y1 + 0.5);
            int faceBelowX = (int)std::round(midX);
            int faceBelowY = (int)std::round(y1 - 0.5);

            if (isBlackFace(faceAboveX, faceAboveY)) {
                faceX = faceAboveX; faceY = faceAboveY;
                edgeDir = 'a'; // bottom edge of black face = alpha
            } else if (isBlackFace(faceBelowX, faceBelowY)) {
                faceX = faceBelowX; faceY = faceBelowY;
                edgeDir = '1'; // top edge of black face = 1
            } else {
                edge.setWeight(mp_real(1));
                continue;
            }
        } else {
            // Vertical edge from (x1,y1) to (x1,y2)
            double midY = (y1 + y2) / 2.0;
            int faceRightX = (int)std::round(x1 + 0.5);
            int faceRightY = (int)std::round(midY);
            int faceLeftX = (int)std::round(x1 - 0.5);
            int faceLeftY = (int)std::round(midY);

            if (isBlackFace(faceRightX, faceRightY)) {
                faceX = faceRightX; faceY = faceRightY;
                edgeDir = 'g'; // left edge of black face = gamma
            } else if (isBlackFace(faceLeftX, faceLeftY)) {
                faceX = faceLeftX; faceY = faceLeftY;
                edgeDir = 'b'; // right edge of black face = beta
            } else {
                edge.setWeight(mp_real(1));
                continue;
            }
        }

        // Compute periodic indices using diagonal coordinates
        // diagI = (faceX + faceY) / 2, diagJ = (faceX - faceY) / 2
        int diagI = (faceX + faceY) / 2;
        int diagJ = (faceX - faceY) / 2;

        // Map to periodic indices [0, l-1] and [0, k-1]
        int pi = ((diagI % l) + l) % l;
        int pj = ((diagJ % k) + k) % k;

        double weight = 1.0;
        if (edgeDir == 'a') weight = g_periodicAlpha[pj][pi];
        else if (edgeDir == 'b') weight = g_periodicBeta[pj][pi];
        else if (edgeDir == 'g') weight = g_periodicGamma[pj][pi];
        // edgeDir == '1' stays at weight = 1.0

        edge.setWeight(mp_real(weight));
    }
}

// =============================================================================
// AZTEC DIAMOND REDUCTION: A_{n+1} -> A'_{n+1} (3-step process)
// =============================================================================
//
// Step 1: Gauge transform - multiply weights at V_gauge vertices to equalize edges
// Step 2: Contract degree-2 vertices (black on j+k=±n, white on j-k=±n except corners)
// Step 3: Merge parallel edges
//
// The V_gauge set depends on n mod 4 (see paper for exact definition)

// Save current state to history
static void pushAztecState() {
    AztecGraphState state;
    state.vertices = g_aztecVertices;
    state.edges = g_aztecEdges;
    state.blackQuadCenters = g_blackQuadCenters;
    state.step = g_aztecReductionStep;
    state.level = g_aztecLevel;
    g_aztecHistory.push_back(state);
}

// Restore previous state from history
static bool popAztecState() {
    if (g_aztecHistory.empty()) return false;
    AztecGraphState state = g_aztecHistory.back();
    g_aztecHistory.pop_back();
    g_aztecVertices = state.vertices;
    g_aztecEdges = state.edges;
    g_blackQuadCenters = state.blackQuadCenters;
    g_aztecReductionStep = state.step;
    g_aztecLevel = state.level;
    rebuildAdjacency();  // Rebuild adjacency after restoring state
    return true;
}

// Helper: get integer coordinates from half-integer
static void getIntCoords(double x, double y, int& i, int& j) {
    i = static_cast<int>(std::round(x - 0.5));
    j = static_cast<int>(std::round(y - 0.5));
}

// Check if vertex is in V_gauge set (for n even)
// V_gauge depends on n mod 4 - see paper for exact definition
static bool isInVgauge(double x, double y, int n) {
    if (n % 2 != 0) return false;  // V_gauge only for even n

    int i, j;
    getIntCoords(x, y, i, j);

    // Check if on boundary (|i|+|j| = n)
    if (std::abs(i) + std::abs(j) != n) return false;

    if (n % 4 == 2) {
        // n = 4m + 2
        // vertices (j±1/2, k∓1/2) with j even and j+k = ±n
        // vertices (j±1/2, k±1/2) with j odd and (∓j)+(±k) = n
        if (i % 2 == 0 && (i + j == n || i + j == -n)) return true;
        if (std::abs(i) % 2 == 1) {
            if ((-i + j == n) || (i - j == n) || (-i - j == n) || (i + j == n)) {
                // More complex condition - simplified for now
                return true;
            }
        }
    } else if (n % 4 == 0) {
        // n = 4m
        // vertices (j∓1/2, k±1/2) with j even and j+k = ±n
        // vertices (j∓1/2, k∓1/2) with j odd and (∓j)+(±k) = n
        if (i % 2 == 0 && (i + j == n || i + j == -n)) return true;
        if (std::abs(i) % 2 == 1) {
            return true;  // Simplified
        }
    }
    return false;
}

// Check if vertex should be contracted (degree-2 boundary vertex)
static bool shouldContract(double x, double y, int n, bool isWhite) {
    int i, j;
    getIntCoords(x, y, i, j);

    // Black vertices on j+k = ±n (NE/SW diagonals)
    if (!isWhite && (i + j == n || i + j == -n)) {
        return true;
    }

    // White vertices on j-k = ±n (NW/SE diagonals), excluding corners
    if (isWhite && (i - j == n || i - j == -n)) {
        // Exclude corners where {|i|, |j|} = {0, n}
        bool isCorner = (std::abs(i) == 0 && std::abs(j) == n) ||
                        (std::abs(i) == n && std::abs(j) == 0);
        if (!isCorner) return true;
    }

    return false;
}

// STEP 1: Gauge transform on BLACK vertices
// For n=4 (A_5), process 2n=8 black vertices on diagonals i-j = ±(n-1)
// At each vertex, compute λ to make edge to boundary = reference edge on boundary
static void aztecStep1_GaugeTransform() {
    if (g_aztecReductionStep != 0) return;

    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    int n = g_aztecLevel;

    // Build vertex lookup using FastGrid for O(1) lookups
    FastGrid vertexGrid(n + 5);
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        int i, j;
        getIntCoords(g_aztecVertices[idx].x, g_aztecVertices[idx].y, i, j);
        if (vertexGrid.inBounds(i, j)) {
            vertexGrid.at(i, j) = (int)idx;
        }
    }

    // Build edge lookup: for each vertex, list of (neighbor_idx, edge_idx)
    // Use vector of vectors for O(1) access by vertex index
    std::vector<std::vector<std::pair<int, int>>> adjacency(g_aztecVertices.size());
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        int v1 = g_aztecEdges[i].v1;
        int v2 = g_aztecEdges[i].v2;
        adjacency[v1].push_back({v2, (int)i});
        adjacency[v2].push_back({v1, (int)i});
    }

    // Find black vertices on diagonals i - j = ±(n-1)
    // These are gauge vertices, but we exclude corners (vertices without valid boundary neighbor)
    struct GaugeVertex {
        int idx;
        int i, j;
        bool isLeftDiagonal;  // i - j = -(n-1)
    };
    std::vector<GaugeVertex> leftDiagVertices, rightDiagVertices;

    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        double x = g_aztecVertices[idx].x;
        double y = g_aztecVertices[idx].y;
        bool isWhite = g_aztecVertices[idx].isWhite;

        if (isWhite) continue;  // Only black vertices

        int i, j;
        getIntCoords(x, y, i, j);

        // Check if on diagonal i - j = ±(n-1)
        if (i - j == -(n - 1)) {
            // Left diagonal: boundary at (i, j+1), check if it exists
            int bi = i, bj = j + 1;
            if (vertexGrid.inBounds(bi, bj) && vertexGrid.at(bi, bj) != -1) {
                leftDiagVertices.push_back({(int)idx, i, j, true});
            }
        } else if (i - j == (n - 1)) {
            // Right diagonal: boundary at (i, j-1), check if it exists
            int bi = i, bj = j - 1;
            if (vertexGrid.inBounds(bi, bj) && vertexGrid.at(bi, bj) != -1) {
                rightDiagVertices.push_back({(int)idx, i, j, false});
            }
        }
    }

    // Sort vertices for processing order:
    // Left diagonal: process from high j to low j (start near corner at high j)
    // Right diagonal: process from low j to high j (start near corner at low j)
    std::sort(leftDiagVertices.begin(), leftDiagVertices.end(),
              [](const GaugeVertex& a, const GaugeVertex& b) { return a.j > b.j; });
    std::sort(rightDiagVertices.begin(), rightDiagVertices.end(),
              [](const GaugeVertex& a, const GaugeVertex& b) { return a.j < b.j; });

    // Mark all gauge vertices
    for (const auto& gv : leftDiagVertices) {
        g_aztecVertices[gv.idx].inVgauge = true;
    }
    for (const auto& gv : rightDiagVertices) {
        g_aztecVertices[gv.idx].inVgauge = true;
    }

    // Helper function to find edge index between two vertices
    auto findEdge = [&adjacency](int v1, int v2) -> int {
        for (const auto& [neighbor, edgeIdx] : adjacency[v1]) {
            if (neighbor == v2) return edgeIdx;
        }
        return -1;
    };

    // Process left diagonal vertices
    for (const auto& gv : leftDiagVertices) {
        int vIdx = gv.idx;
        int i = gv.i, j = gv.j;

        // Boundary vertex at (i, j+1)
        int bi = i, bj = j + 1;
        if (!vertexGrid.inBounds(bi, bj) || vertexGrid.at(bi, bj) == -1) continue;
        int bIdx = vertexGrid.at(bi, bj);

        // Reference vertex at (i+1, j+1) - either corner or previous gauge vertex
        int ri = i + 1, rj = j + 1;
        if (!vertexGrid.inBounds(ri, rj) || vertexGrid.at(ri, rj) == -1) continue;
        int rIdx = vertexGrid.at(ri, rj);

        // Find edge from gauge vertex to boundary
        int edgeToBoundaryIdx = findEdge(vIdx, bIdx);
        if (edgeToBoundaryIdx < 0) continue;

        // Find reference edge (boundary to reference vertex)
        int refEdgeIdx = findEdge(bIdx, rIdx);
        if (refEdgeIdx < 0) continue;

        // Compute gauge factor in LOG SPACE: log(λ) = log(ref) - log(boundary)
        mp_real logLambda = g_aztecEdges[refEdgeIdx].logWeight - g_aztecEdges[edgeToBoundaryIdx].logWeight;

        // Apply λ to all edges adjacent to this gauge vertex (add log(λ) to logWeight)
        for (const auto& [neighbor, eIdx] : adjacency[vIdx]) {
            g_aztecEdges[eIdx].logWeight += logLambda;
            g_aztecEdges[eIdx].gaugeTransformed = true;
        }
    }

    // Process right diagonal vertices
    for (const auto& gv : rightDiagVertices) {
        int vIdx = gv.idx;
        int i = gv.i, j = gv.j;

        // Boundary vertex at (i, j-1)
        int bi = i, bj = j - 1;
        if (!vertexGrid.inBounds(bi, bj) || vertexGrid.at(bi, bj) == -1) continue;
        int bIdx = vertexGrid.at(bi, bj);

        // Reference vertex at (i-1, j-1) - either corner or previous gauge vertex
        int ri = i - 1, rj = j - 1;
        if (!vertexGrid.inBounds(ri, rj) || vertexGrid.at(ri, rj) == -1) continue;
        int rIdx = vertexGrid.at(ri, rj);

        // Find edge from gauge vertex to boundary
        int edgeToBoundaryIdx = findEdge(vIdx, bIdx);
        if (edgeToBoundaryIdx < 0) continue;

        // Find reference edge (boundary to reference vertex)
        int refEdgeIdx = findEdge(bIdx, rIdx);
        if (refEdgeIdx < 0) continue;

        // Compute gauge factor in LOG SPACE: log(λ) = log(ref) - log(boundary)
        mp_real logLambda = g_aztecEdges[refEdgeIdx].logWeight - g_aztecEdges[edgeToBoundaryIdx].logWeight;

        // Apply λ to all edges adjacent to this gauge vertex (add log(λ) to logWeight)
        for (const auto& [neighbor, eIdx] : adjacency[vIdx]) {
            g_aztecEdges[eIdx].logWeight += logLambda;
            g_aztecEdges[eIdx].gaugeTransformed = true;
        }
    }

    g_aztecReductionStep = 1;
    rebuildAdjacency();
}

// STEP 2: WHITE gauge transform
// Goal: Equalize edges at BLACK boundary vertices on x+y = ±n (where x,y are half-integer coords)
// In integer coords (i,j) where x=i+0.5, y=j+0.5: these are vertices with i+j = n-1 or i+j = -(n+1)
// For A_{n+1}: boundary BLACK vertices have x+y = n, i.e., i+j+1 = n, i.e., i+j = n-1
// Each BLACK boundary vertex has 2 WHITE neighbors; we gauge one to equalize its two edges.
static void aztecStep2_WhiteGaugeTransform() {
    if (g_aztecReductionStep != 1) return;

    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    int n = g_aztecLevel;

    // Clear previous vertex highlights
    for (auto& v : g_aztecVertices) {
        v.inVgauge = false;
        v.toContract = false;
    }

    // Build vertex lookup using FastGrid for O(1) lookups
    FastGrid vertexGrid(n + 5);
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        int i, j;
        getIntCoords(g_aztecVertices[idx].x, g_aztecVertices[idx].y, i, j);
        if (vertexGrid.inBounds(i, j)) {
            vertexGrid.at(i, j) = (int)idx;
        }
    }

    // Build edge lookup: vertex -> [(neighbor, edgeIdx)] using vector for O(1) access
    std::vector<std::vector<std::pair<int, int>>> adjacency(g_aztecVertices.size());
    for (size_t eIdx = 0; eIdx < g_aztecEdges.size(); eIdx++) {
        int v1 = g_aztecEdges[eIdx].v1;
        int v2 = g_aztecEdges[eIdx].v2;
        adjacency[v1].push_back({v2, (int)eIdx});
        adjacency[v2].push_back({v1, (int)eIdx});
    }

    // Find BLACK boundary vertices on x+y = n (positive) and x+y = -n (negative)
    // x+y = n means (i+0.5) + (j+0.5) = n, i.e., i+j = n-1
    // x+y = -n means i+j = -n-1
    struct BlackBoundaryVertex {
        int idx;
        int i, j;
        bool isPositiveDiag;
    };
    std::vector<BlackBoundaryVertex> positiveDiagVertices, negativeDiagVertices;

    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (g_aztecVertices[idx].isWhite) continue;  // Only BLACK vertices

        int i, j;
        getIntCoords(g_aztecVertices[idx].x, g_aztecVertices[idx].y, i, j);
        double x = g_aztecVertices[idx].x;
        double y = g_aztecVertices[idx].y;
        double sum = x + y;

        // Positive diagonal: x + y = n
        if (std::abs(sum - n) < 0.01) {
            positiveDiagVertices.push_back({(int)idx, i, j, true});
        }
        // Negative diagonal: x + y = -n
        else if (std::abs(sum + n) < 0.01) {
            negativeDiagVertices.push_back({(int)idx, i, j, false});
        }
    }

    // Sort: positive by i ascending (from corner to corner), negative by i descending
    std::sort(positiveDiagVertices.begin(), positiveDiagVertices.end(),
              [](const BlackBoundaryVertex& a, const BlackBoundaryVertex& b) { return a.i < b.i; });
    std::sort(negativeDiagVertices.begin(), negativeDiagVertices.end(),
              [](const BlackBoundaryVertex& a, const BlackBoundaryVertex& b) { return a.i > b.i; });

    // Helper to find edge index
    auto findEdge = [&adjacency](int v1, int v2) -> int {
        for (const auto& [neighbor, edgeIdx] : adjacency[v1]) {
            if (neighbor == v2) return edgeIdx;
        }
        return -1;
    };

    // Process positive diagonal (x + y = n)
    // For BLACK vertex at (i, j), its two WHITE neighbors are at (i-1, j) and (i, j-1)
    for (const auto& bv : positiveDiagVertices) {
        int bIdx = bv.idx;
        int i = bv.i, j = bv.j;

        // Two neighbors: (i-1, j) and (i, j-1)
        int n1i = i - 1, n1j = j;
        int n2i = i, n2j = j - 1;

        if (!vertexGrid.inBounds(n1i, n1j) || vertexGrid.at(n1i, n1j) == -1) continue;
        if (!vertexGrid.inBounds(n2i, n2j) || vertexGrid.at(n2i, n2j) == -1) continue;

        int n1Idx = vertexGrid.at(n1i, n1j);
        int n2Idx = vertexGrid.at(n2i, n2j);

        int edge1Idx = findEdge(bIdx, n1Idx);
        int edge2Idx = findEdge(bIdx, n2Idx);
        if (edge1Idx < 0 || edge2Idx < 0) continue;

        bool edge1Trans = g_aztecEdges[edge1Idx].gaugeTransformed;
        bool edge2Trans = g_aztecEdges[edge2Idx].gaugeTransformed;

        int refEdgeIdx, eqEdgeIdx, gaugeNeighborIdx;
        if (edge1Trans && !edge2Trans) {
            refEdgeIdx = edge1Idx;
            eqEdgeIdx = edge2Idx;
            gaugeNeighborIdx = n2Idx;
        } else if (edge2Trans && !edge1Trans) {
            refEdgeIdx = edge2Idx;
            eqEdgeIdx = edge1Idx;
            gaugeNeighborIdx = n1Idx;
        } else if (!edge1Trans && !edge2Trans) {
            refEdgeIdx = edge1Idx;
            eqEdgeIdx = edge2Idx;
            gaugeNeighborIdx = n2Idx;
        } else {
            continue;  // Both already transformed
        }

        // Compute gauge factor in LOG SPACE: log(λ) = log(ref) - log(eq)
        mp_real logLambda = g_aztecEdges[refEdgeIdx].logWeight - g_aztecEdges[eqEdgeIdx].logWeight;

        // Highlight the WHITE gauge vertex
        g_aztecVertices[gaugeNeighborIdx].inVgauge = true;

        // Apply λ to ALL edges at the gauge neighbor (add log(λ) to logWeight)
        for (const auto& [neighbor, eIdx] : adjacency[gaugeNeighborIdx]) {
            g_aztecEdges[eIdx].logWeight += logLambda;
            g_aztecEdges[eIdx].gaugeTransformed = true;
        }
    }

    // Process negative diagonal (x + y = -n)
    // For BLACK vertex at (i, j), its two WHITE neighbors are at (i+1, j) and (i, j+1)
    for (const auto& bv : negativeDiagVertices) {
        int bIdx = bv.idx;
        int i = bv.i, j = bv.j;

        // Two neighbors: (i+1, j) and (i, j+1)
        int n1i = i + 1, n1j = j;
        int n2i = i, n2j = j + 1;

        if (!vertexGrid.inBounds(n1i, n1j) || vertexGrid.at(n1i, n1j) == -1) continue;
        if (!vertexGrid.inBounds(n2i, n2j) || vertexGrid.at(n2i, n2j) == -1) continue;

        int n1Idx = vertexGrid.at(n1i, n1j);
        int n2Idx = vertexGrid.at(n2i, n2j);

        int edge1Idx = findEdge(bIdx, n1Idx);
        int edge2Idx = findEdge(bIdx, n2Idx);
        if (edge1Idx < 0 || edge2Idx < 0) continue;

        bool edge1Trans = g_aztecEdges[edge1Idx].gaugeTransformed;
        bool edge2Trans = g_aztecEdges[edge2Idx].gaugeTransformed;

        int refEdgeIdx, eqEdgeIdx, gaugeNeighborIdx;
        if (edge1Trans && !edge2Trans) {
            refEdgeIdx = edge1Idx;
            eqEdgeIdx = edge2Idx;
            gaugeNeighborIdx = n2Idx;
        } else if (edge2Trans && !edge1Trans) {
            refEdgeIdx = edge2Idx;
            eqEdgeIdx = edge1Idx;
            gaugeNeighborIdx = n1Idx;
        } else if (!edge1Trans && !edge2Trans) {
            refEdgeIdx = edge1Idx;
            eqEdgeIdx = edge2Idx;
            gaugeNeighborIdx = n2Idx;
        } else {
            continue;  // Both already transformed
        }

        // Compute gauge factor in LOG SPACE: log(λ) = log(ref) - log(eq)
        mp_real logLambda = g_aztecEdges[refEdgeIdx].logWeight - g_aztecEdges[eqEdgeIdx].logWeight;

        // Highlight the WHITE gauge vertex
        g_aztecVertices[gaugeNeighborIdx].inVgauge = true;

        // Apply λ to ALL edges at the gauge neighbor (add log(λ) to logWeight)
        for (const auto& [neighbor, eIdx] : adjacency[gaugeNeighborIdx]) {
            g_aztecEdges[eIdx].logWeight += logLambda;
            g_aztecEdges[eIdx].gaugeTransformed = true;
        }
    }

    g_aztecReductionStep = 2;
    rebuildAdjacency();
}

// STEP 3: Contract boundary - remove all boundary vertices and their edges
// Removes vertices on i-j = ±n AND i+j = ±n
static void aztecStep3_Contract() {
    if (g_aztecReductionStep != 2) return;

    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    int n = g_aztecLevel;

    // Find vertices to remove (all 4 boundary diagonals):
    // - i-j = n (SE boundary) and i-j = -n (NW boundary)
    // - i+j = n-1 (NE boundary) and i+j = -(n+1) (SW boundary)
    // BUT keep two black corner vertices: (n-1, 0) and (-n, -1)
    std::set<int> verticesToRemove;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        int i = (int)std::round(g_aztecVertices[idx].x - 0.5);
        int j = (int)std::round(g_aztecVertices[idx].y - 0.5);
        int diff = i - j;
        int sum = i + j;

        // Check if this is one of the two black vertices to keep
        bool keepVertex = false;
        if (i == (n - 1) && j == 0) keepVertex = true;  // (3.5, 0.5) for n=4
        if (i == -n && j == -1) keepVertex = true;       // (-3.5, -0.5) for n=4

        if (!keepVertex && (diff == n || diff == -n || sum == (n - 1) || sum == -(n + 1))) {
            verticesToRemove.insert((int)idx);
        }
    }

    // Build new vertex list and mapping from old to new indices using vector for O(1) lookup
    std::vector<AztecVertex> newVertices;
    std::vector<int> oldToNew(g_aztecVertices.size(), -1);
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (verticesToRemove.find((int)idx) == verticesToRemove.end()) {
            oldToNew[idx] = (int)newVertices.size();
            newVertices.push_back(g_aztecVertices[idx]);
        }
    }

    // Build new edge list, removing edges connected to removed vertices
    std::vector<AztecEdge> newEdges;
    for (const auto& e : g_aztecEdges) {
        // O(1) check using vector instead of O(log n) set lookup
        if (oldToNew[e.v1] != -1 && oldToNew[e.v2] != -1) {
            AztecEdge newEdge = e;
            newEdge.v1 = oldToNew[e.v1];
            newEdge.v2 = oldToNew[e.v2];
            newEdge.gaugeTransformed = false;  // Clear highlighting
            newEdges.push_back(newEdge);
        }
    }

    // Update global state
    g_aztecVertices = newVertices;
    g_aztecEdges = newEdges;

    // Clear highlighting on remaining vertices (but preserve isWhite color!)
    for (auto& v : g_aztecVertices) {
        v.inVgauge = false;
        v.toContract = false;
        // Note: v.isWhite is preserved - it was set when vertex was created
    }

    // Level stays the same - this is A'_{n+1} (contracted), not A_n
    // g_aztecLevel stays unchanged
    g_aztecReductionStep = 3;
    rebuildAdjacency();
}

// STEP 4: Black contraction - merge black vertices on i-j = -(n-1) and i-j = (n-1) into single vertices
// Double edges between pairs get summed weights
static void aztecStep4_BlackContraction() {
    if (g_aztecReductionStep != 3) return;

    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    int n = g_aztecLevel;

    // Build vertex index for quick lookup using int64_t keys (much faster than strings)
    std::map<int64_t, int> vertexIndex;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        vertexIndex[makePosKey(g_aztecVertices[idx].x, g_aztecVertices[idx].y)] = (int)idx;
    }

    // Find black vertices on i-j = -(n-1) (negative diagonal)
    std::vector<int> negDiagBlack;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (g_aztecVertices[idx].isWhite) continue;
        int i = (int)std::round(g_aztecVertices[idx].x - 0.5);
        int j = (int)std::round(g_aztecVertices[idx].y - 0.5);
        if (i - j == -(n - 1)) {
            negDiagBlack.push_back((int)idx);
        }
    }

    // Find black vertices on i-j = (n-1) (positive diagonal)
    std::vector<int> posDiagBlack;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (g_aztecVertices[idx].isWhite) continue;
        int i = (int)std::round(g_aztecVertices[idx].x - 0.5);
        int j = (int)std::round(g_aztecVertices[idx].y - 0.5);
        if (i - j == (n - 1)) {
            posDiagBlack.push_back((int)idx);
        }
    }

    // Contract each diagonal: keep first vertex, redirect edges from others, set position
    // Use vector for O(1) redirect lookup (-1 means no redirect)
    std::vector<int> redirect(g_aztecVertices.size(), -1);

    auto contractDiagonal = [&](std::vector<int>& diagVertices, double newX, double newY) {
        if (diagVertices.size() == 0) return;

        int keepIdx = diagVertices[0];  // Keep the first vertex

        // Set the contracted vertex position
        g_aztecVertices[keepIdx].x = newX;
        g_aztecVertices[keepIdx].y = newY;

        // Map from old vertex index to new (redirected) index
        for (size_t i = 1; i < diagVertices.size(); i++) {
            redirect[diagVertices[i]] = keepIdx;
        }

        // Mark vertices for removal (all except first)
        for (size_t i = 1; i < diagVertices.size(); i++) {
            g_aztecVertices[diagVertices[i]].toContract = true;  // Mark for removal
        }
    };

    // Contract negative diagonal (i-j = -(n-1)) to position (-n+0.5, n-0.5)
    contractDiagonal(negDiagBlack, -n + 0.5, n - 0.5);
    // Contract positive diagonal (i-j = n-1) to position (n-0.5, -n+0.5)
    contractDiagonal(posDiagBlack, n - 0.5, -n + 0.5);

    // Redirect edges using O(1) vector lookup
    for (auto& e : g_aztecEdges) {
        if (redirect[e.v1] != -1) e.v1 = redirect[e.v1];
        if (redirect[e.v2] != -1) e.v2 = redirect[e.v2];
    }

    // Remove marked vertices - use vector for O(1) lookup
    std::vector<AztecVertex> newVertices;
    std::vector<int> oldToNew(g_aztecVertices.size(), -1);
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (!g_aztecVertices[idx].toContract) {
            oldToNew[idx] = (int)newVertices.size();
            newVertices.push_back(g_aztecVertices[idx]);
        }
    }

    // Remap edge indices and collect edges
    std::vector<AztecEdge> remappedEdges;
    for (auto& e : g_aztecEdges) {
        if (oldToNew[e.v1] != -1 && oldToNew[e.v2] != -1) {
            AztecEdge newEdge = e;
            newEdge.v1 = oldToNew[e.v1];
            newEdge.v2 = oldToNew[e.v2];
            // Skip self-loops
            if (newEdge.v1 != newEdge.v2) {
                remappedEdges.push_back(newEdge);
            }
        }
    }

    // Merge double edges: sum weights using log-sum-exp for numerical stability
    // log(e^a + e^b) = max(a,b) + log(1 + e^{-|a-b|})
    std::map<std::pair<int,int>, mp_real> edgeLogWeights;  // Store LOG of summed weights
    std::map<std::pair<int,int>, bool> edgeHorizontal;
    std::map<std::pair<int,int>, bool> edgeSeen;
    for (const auto& e : remappedEdges) {
        int v1 = std::min(e.v1, e.v2);
        int v2 = std::max(e.v1, e.v2);
        auto key = std::make_pair(v1, v2);
        if (!edgeSeen[key]) {
            edgeLogWeights[key] = e.logWeight;
            edgeSeen[key] = true;
        } else {
            // Log-sum-exp: log(e^a + e^b) = max(a,b) + log(1 + e^{-|a-b|})
            mp_real a = edgeLogWeights[key];
            mp_real b = e.logWeight;
            mp_real maxAB = (a > b) ? a : b;
            mp_real diff = abs(a - b);
            edgeLogWeights[key] = maxAB + log(mp_real(1) + exp(-diff));
        }
        edgeHorizontal[key] = e.isHorizontal;
    }

    // Build final edge list
    std::vector<AztecEdge> newEdges;
    for (const auto& [key, logWeight] : edgeLogWeights) {
        AztecEdge e;
        e.v1 = key.first;
        e.v2 = key.second;
        e.logWeight = logWeight;  // Already in log space
        e.isHorizontal = edgeHorizontal[key];
        e.gaugeTransformed = false;
        newEdges.push_back(e);
    }

    // Update global state
    g_aztecVertices = newVertices;
    g_aztecEdges = newEdges;

    // Clear highlighting
    for (auto& v : g_aztecVertices) {
        v.inVgauge = false;
        v.toContract = false;
    }

    g_aztecReductionStep = 4;
    rebuildAdjacency();
}

// STEP 5: White contraction - merge white vertices on i+j = -n and i+j = n-2 into single vertices
// Double edges between pairs get summed weights
static void aztecStep5_WhiteContraction() {
    if (g_aztecReductionStep != 4) return;

    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    int n = g_aztecLevel;

    // Find white vertices on i+j = -n (SW diagonal)
    std::vector<int> negDiagWhite;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (!g_aztecVertices[idx].isWhite) continue;  // Only WHITE vertices
        int i = (int)std::round(g_aztecVertices[idx].x - 0.5);
        int j = (int)std::round(g_aztecVertices[idx].y - 0.5);
        if (i + j == -n) {
            negDiagWhite.push_back((int)idx);
        }
    }

    // Find white vertices on i+j = n-2 (NE diagonal)
    std::vector<int> posDiagWhite;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (!g_aztecVertices[idx].isWhite) continue;  // Only WHITE vertices
        int i = (int)std::round(g_aztecVertices[idx].x - 0.5);
        int j = (int)std::round(g_aztecVertices[idx].y - 0.5);
        if (i + j == n - 2) {
            posDiagWhite.push_back((int)idx);
        }
    }

    // Contract each diagonal: keep first vertex, redirect edges from others, set position
    // Use vector for O(1) redirect lookup (-1 means no redirect)
    std::vector<int> redirect(g_aztecVertices.size(), -1);

    auto contractDiagonal = [&](std::vector<int>& diagVertices, double newX, double newY) {
        if (diagVertices.size() == 0) return;

        int keepIdx = diagVertices[0];  // Keep the first vertex

        // Set the contracted vertex position
        g_aztecVertices[keepIdx].x = newX;
        g_aztecVertices[keepIdx].y = newY;

        // Map from old vertex index to new (redirected) index
        for (size_t i = 1; i < diagVertices.size(); i++) {
            redirect[diagVertices[i]] = keepIdx;
        }

        // Mark vertices for removal (all except first)
        for (size_t i = 1; i < diagVertices.size(); i++) {
            g_aztecVertices[diagVertices[i]].toContract = true;
        }
    };

    // Contract SW diagonal (i+j = -n) to position (-(n-0.5), -(n-0.5)) = (-n+0.5, -n+0.5)
    contractDiagonal(negDiagWhite, -n + 0.5, -n + 0.5);
    // Contract NE diagonal (i+j = n-2) to position (n-0.5, n-0.5)
    contractDiagonal(posDiagWhite, n - 0.5, n - 0.5);

    // Redirect edges using O(1) vector lookup
    for (auto& e : g_aztecEdges) {
        if (redirect[e.v1] != -1) e.v1 = redirect[e.v1];
        if (redirect[e.v2] != -1) e.v2 = redirect[e.v2];
    }

    // Remove marked vertices - use vector for O(1) lookup
    std::vector<AztecVertex> newVertices;
    std::vector<int> oldToNew(g_aztecVertices.size(), -1);
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (!g_aztecVertices[idx].toContract) {
            oldToNew[idx] = (int)newVertices.size();
            newVertices.push_back(g_aztecVertices[idx]);
        }
    }

    // Remap edge indices and collect edges
    std::vector<AztecEdge> remappedEdges;
    for (auto& e : g_aztecEdges) {
        if (oldToNew[e.v1] != -1 && oldToNew[e.v2] != -1) {
            AztecEdge newEdge = e;
            newEdge.v1 = oldToNew[e.v1];
            newEdge.v2 = oldToNew[e.v2];
            // Skip self-loops
            if (newEdge.v1 != newEdge.v2) {
                remappedEdges.push_back(newEdge);
            }
        }
    }

    // Merge double edges: sum weights using log-sum-exp for numerical stability
    // log(e^a + e^b) = max(a,b) + log(1 + e^{-|a-b|})
    std::map<std::pair<int,int>, mp_real> edgeLogWeights;  // Store LOG of summed weights
    std::map<std::pair<int,int>, bool> edgeHorizontal;
    std::map<std::pair<int,int>, bool> edgeSeen;
    for (const auto& e : remappedEdges) {
        int v1 = std::min(e.v1, e.v2);
        int v2 = std::max(e.v1, e.v2);
        auto key = std::make_pair(v1, v2);
        if (!edgeSeen[key]) {
            edgeLogWeights[key] = e.logWeight;
            edgeSeen[key] = true;
        } else {
            // Log-sum-exp: log(e^a + e^b) = max(a,b) + log(1 + e^{-|a-b|})
            mp_real a = edgeLogWeights[key];
            mp_real b = e.logWeight;
            mp_real maxAB = (a > b) ? a : b;
            mp_real diff = abs(a - b);
            edgeLogWeights[key] = maxAB + log(mp_real(1) + exp(-diff));
        }
        edgeHorizontal[key] = e.isHorizontal;
    }

    // Build final edge list
    std::vector<AztecEdge> newEdges;
    for (const auto& [key, logWeight] : edgeLogWeights) {
        AztecEdge e;
        e.v1 = key.first;
        e.v2 = key.second;
        e.logWeight = logWeight;  // Already in log space
        e.isHorizontal = edgeHorizontal[key];
        e.gaugeTransformed = false;
        newEdges.push_back(e);
    }

    // Update global state
    g_aztecVertices = newVertices;
    g_aztecEdges = newEdges;

    // Clear highlighting
    for (auto& v : g_aztecVertices) {
        v.inVgauge = false;
        v.toContract = false;
    }

    g_aztecReductionStep = 5;
    rebuildAdjacency();
}

// STEP 6: Shading - mark faces for grey/black rendering (Folding step 1)
// This is a visual step - grey faces have white at top-left, black faces have black at top-left
// Also computes black quad centers for later use
static void aztecStep6_Shading() {
    if (g_aztecReductionStep != 5) return;
    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    // Build vertex index using 64-bit integer keys (unordered for O(1) lookup)
    std::unordered_map<int64_t, int> vertexIndex;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        vertexIndex[makePosKey(g_aztecVertices[i].x, g_aztecVertices[i].y)] = (int)i;
    }

    // Build edge lookup using ordered pairs of vertex keys (unordered for O(1) lookup)
    std::unordered_set<std::pair<int64_t, int64_t>, PairHash64> edgeSet;
    for (const auto& e : g_aztecEdges) {
        int64_t k1 = makePosKey(g_aztecVertices[e.v1].x, g_aztecVertices[e.v1].y);
        int64_t k2 = makePosKey(g_aztecVertices[e.v2].x, g_aztecVertices[e.v2].y);
        edgeSet.insert(k1 < k2 ? std::make_pair(k1, k2) : std::make_pair(k2, k1));
    }

    // Helper to check if edge exists
    auto hasEdge = [&](int64_t k1, int64_t k2) {
        return edgeSet.count(k1 < k2 ? std::make_pair(k1, k2) : std::make_pair(k2, k1)) > 0;
    };

    // Find all black quad centers
    // Black quads have WHITE vertices at NW (TL) and SE (BR) corners
    g_blackQuadCenters.clear();
    std::unordered_set<int64_t> visitedFaces;

    for (const auto& v : g_aztecVertices) {
        double x = v.x, y = v.y;
        int64_t faceKey = makePosKey(x, y);
        if (visitedFaces.count(faceKey)) continue;

        // Look for face with BL at (x, y)
        int64_t blKey = makePosKey(x, y);
        int64_t brKey = makePosKey(x + 1, y);
        int64_t tlKey = makePosKey(x, y + 1);
        int64_t trKey = makePosKey(x + 1, y + 1);

        if (vertexIndex.count(blKey) && vertexIndex.count(brKey) &&
            vertexIndex.count(tlKey) && vertexIndex.count(trKey)) {
            // Check all 4 edges exist
            if (hasEdge(blKey, brKey) && hasEdge(tlKey, trKey) &&
                hasEdge(blKey, tlKey) && hasEdge(brKey, trKey)) {
                visitedFaces.insert(faceKey);

                int blIdx = vertexIndex[blKey];
                int brIdx = vertexIndex[brKey];
                int tlIdx = vertexIndex[tlKey];
                int trIdx = vertexIndex[trKey];

                bool tlWhite = g_aztecVertices[tlIdx].isWhite;
                bool brWhite = g_aztecVertices[brIdx].isWhite;

                // Black quad: WHITE at NW and SE
                if (tlWhite && brWhite) {
                    double cx = (g_aztecVertices[blIdx].x + g_aztecVertices[brIdx].x +
                                 g_aztecVertices[tlIdx].x + g_aztecVertices[trIdx].x) / 4.0;
                    double cy = (g_aztecVertices[blIdx].y + g_aztecVertices[brIdx].y +
                                 g_aztecVertices[tlIdx].y + g_aztecVertices[trIdx].y) / 4.0;
                    g_blackQuadCenters.push_back({cx, cy});
                }
            }
        }
    }

    g_aztecReductionStep = 6;
    rebuildAdjacency();
}

// STEP 7: Mark diagonal vertices (Folding step 2)
// Rule: highlight vertices where |x| + |y| <= n - 3
static void aztecStep7_MarkDiagonalVertices() {
    if (g_aztecReductionStep != 6) return;

    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    int n = g_aztecLevel;

    for (size_t vIdx = 0; vIdx < g_aztecVertices.size(); vIdx++) {
        double x = g_aztecVertices[vIdx].x;
        double y = g_aztecVertices[vIdx].y;

        // Highlight if |x| + |y| <= n - 3
        if (std::abs(x) + std::abs(y) <= n - 3 + 0.01) {  // small epsilon for float comparison
            g_aztecVertices[vIdx].inVgauge = true;
        }
    }

    g_aztecReductionStep = 7;
    rebuildAdjacency();
}

// STEP 8: Split green vertices into 3-vertex chains (Folding step 3)
// WHITE vertex -> NW white -- middle black -- SE white
// BLACK vertex -> SW black -- middle white -- NE black
// Non-selected vertices in black quads shift towards center
static void aztecStep8_SplitVertices() {
    if (g_aztecReductionStep != 7) return;

    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    const double shiftAmount = 0.2;  // Shift towards center for non-selected vertices

    // Build vertex index using 64-bit integer keys (unordered for O(1) lookup)
    std::unordered_map<int64_t, int> vertexIndex;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        vertexIndex[makePosKey(g_aztecVertices[i].x, g_aztecVertices[i].y)] = (int)i;
    }

    // Build edge lookup using ordered pairs of vertex keys (unordered for O(1) lookup)
    std::unordered_set<std::pair<int64_t, int64_t>, PairHash64> edgeSet;
    for (const auto& e : g_aztecEdges) {
        int64_t k1 = makePosKey(g_aztecVertices[e.v1].x, g_aztecVertices[e.v1].y);
        int64_t k2 = makePosKey(g_aztecVertices[e.v2].x, g_aztecVertices[e.v2].y);
        edgeSet.insert(k1 < k2 ? std::make_pair(k1, k2) : std::make_pair(k2, k1));
    }

    // Helper to check if edge exists
    auto hasEdge = [&](int64_t k1, int64_t k2) {
        return edgeSet.count(k1 < k2 ? std::make_pair(k1, k2) : std::make_pair(k2, k1)) > 0;
    };

    // Find all black quads and their vertex indices
    // Black quads have WHITE vertices at NW (TL) and SE (BR) corners
    struct BlackQuad {
        int blIdx, brIdx, tlIdx, trIdx;
        double cx, cy;  // center
    };
    std::vector<BlackQuad> blackQuads;
    std::unordered_set<int> verticesInBlackQuads;  // indices of vertices belonging to black quads
    std::unordered_set<int64_t> visitedFaces;

    for (const auto& v : g_aztecVertices) {
        double x = v.x, y = v.y;
        int64_t faceKey = makePosKey(x, y);
        if (visitedFaces.count(faceKey)) continue;

        // Look for face with BL at (x, y)
        int64_t blKey = makePosKey(x, y);
        int64_t brKey = makePosKey(x + 1, y);
        int64_t tlKey = makePosKey(x, y + 1);
        int64_t trKey = makePosKey(x + 1, y + 1);

        if (vertexIndex.count(blKey) && vertexIndex.count(brKey) &&
            vertexIndex.count(tlKey) && vertexIndex.count(trKey)) {
            // Check all 4 edges exist
            if (hasEdge(blKey, brKey) && hasEdge(tlKey, trKey) &&
                hasEdge(blKey, tlKey) && hasEdge(brKey, trKey)) {
                visitedFaces.insert(faceKey);

                int blIdx = vertexIndex[blKey];
                int brIdx = vertexIndex[brKey];
                int tlIdx = vertexIndex[tlKey];
                int trIdx = vertexIndex[trKey];

                bool tlWhite = g_aztecVertices[tlIdx].isWhite;
                bool brWhite = g_aztecVertices[brIdx].isWhite;

                // Black quad: WHITE at NW and SE
                if (tlWhite && brWhite) {
                    // Compute center by averaging all 4 vertices
                    double cx = (g_aztecVertices[blIdx].x + g_aztecVertices[brIdx].x +
                                 g_aztecVertices[tlIdx].x + g_aztecVertices[trIdx].x) / 4.0;
                    double cy = (g_aztecVertices[blIdx].y + g_aztecVertices[brIdx].y +
                                 g_aztecVertices[tlIdx].y + g_aztecVertices[trIdx].y) / 4.0;

                    BlackQuad bq;
                    bq.blIdx = blIdx; bq.brIdx = brIdx;
                    bq.tlIdx = tlIdx; bq.trIdx = trIdx;
                    bq.cx = cx; bq.cy = cy;
                    blackQuads.push_back(bq);

                    verticesInBlackQuads.insert(blIdx);
                    verticesInBlackQuads.insert(brIdx);
                    verticesInBlackQuads.insert(tlIdx);
                    verticesInBlackQuads.insert(trIdx);
                }
            }
        }
    }

    // Store black quad centers globally
    g_blackQuadCenters.clear();
    for (const auto& bq : blackQuads) {
        g_blackQuadCenters.push_back({bq.cx, bq.cy});
    }

    // For each black quad, shift non-selected vertices towards center
    for (const auto& bq : blackQuads) {
        int corners[4] = {bq.blIdx, bq.brIdx, bq.tlIdx, bq.trIdx};
        for (int i = 0; i < 4; i++) {
            int idx = corners[i];
            if (!g_aztecVertices[idx].inVgauge) {  // Only non-selected vertices
                double vx = g_aztecVertices[idx].x;
                double vy = g_aztecVertices[idx].y;
                // Direction towards center
                double dx = bq.cx - vx;
                double dy = bq.cy - vy;
                // Normalize and scale
                double len = std::sqrt(dx*dx + dy*dy);
                if (len > 0.01) {
                    g_aztecVertices[idx].x += shiftAmount * dx / len;
                    g_aztecVertices[idx].y += shiftAmount * dy / len;
                }
            }
        }
    }

    // Collect selected (green) vertex indices before adding new vertices
    std::vector<int> selectedVertices;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (g_aztecVertices[idx].inVgauge) {
            selectedVertices.push_back((int)idx);
        }
    }

    // For each selected vertex, create mapping of which new vertex gets which edges
    std::map<int, int> oldToNW;  // selected idx -> new NW/SW vertex idx
    std::map<int, int> oldToSE;  // selected idx -> new SE/NE vertex idx
    std::map<int, int> oldToMid; // selected idx -> middle vertex idx (stays at original idx)

    // Store original positions before any modification
    std::map<int, std::pair<double, double>> originalPos;
    std::map<int, bool> originalColor;
    for (int idx : selectedVertices) {
        originalPos[idx] = {g_aztecVertices[idx].x, g_aztecVertices[idx].y};
        originalColor[idx] = g_aztecVertices[idx].isWhite;
    }

    // Record edge count before adding chain edges
    size_t originalEdgeCount = g_aztecEdges.size();

    // Process each selected vertex - create outer vertices and chain edges
    for (int idx : selectedVertices) {
        double x = originalPos[idx].first;
        double y = originalPos[idx].second;
        bool isWhite = originalColor[idx];

        // Create two new outer vertices with SAME color as original
        AztecVertex outer1, outer2;
        outer1.isWhite = isWhite;
        outer1.inVgauge = false;
        outer1.toContract = false;

        outer2.isWhite = isWhite;
        outer2.inVgauge = false;
        outer2.toContract = false;

        if (isWhite) {
            // WHITE: split NW-SE
            // NW vertex at (-0.2, +0.2) offset
            outer1.x = x - shiftAmount;
            outer1.y = y + shiftAmount;
            // SE vertex at (+0.2, -0.2) offset
            outer2.x = x + shiftAmount;
            outer2.y = y - shiftAmount;
        } else {
            // BLACK: split SW-NE
            // SW vertex at (-0.2, -0.2) offset
            outer1.x = x - shiftAmount;
            outer1.y = y - shiftAmount;
            // NE vertex at (+0.2, +0.2) offset
            outer2.x = x + shiftAmount;
            outer2.y = y + shiftAmount;
        }

        int outerIdx1 = (int)g_aztecVertices.size();
        int outerIdx2 = (int)g_aztecVertices.size() + 1;

        g_aztecVertices.push_back(outer1);
        g_aztecVertices.push_back(outer2);

        // Middle vertex stays at original position but color flipped
        g_aztecVertices[idx].isWhite = !isWhite;
        g_aztecVertices[idx].inVgauge = false;

        oldToNW[idx] = outerIdx1;  // NW for white, SW for black
        oldToSE[idx] = outerIdx2;  // SE for white, NE for black
        oldToMid[idx] = idx;
    }

    // Redirect ONLY original edges (not chain edges) from selected vertices to outer vertices
    for (size_t eIdx = 0; eIdx < originalEdgeCount; eIdx++) {
        auto& e = g_aztecEdges[eIdx];
        // Check if v1 was a selected vertex
        if (oldToNW.count(e.v1)) {
            int oldIdx = e.v1;
            bool wasWhite = originalColor[oldIdx];
            double oldX = originalPos[oldIdx].first;
            double oldY = originalPos[oldIdx].second;
            double otherX = g_aztecVertices[e.v2].x;
            double otherY = g_aztecVertices[e.v2].y;

            // Determine which direction the neighbor is
            double dx = otherX - oldX;
            double dy = otherY - oldY;

            if (wasWhite) {
                // WHITE: NW gets left and up, SE gets right and down
                if (dx < -0.01 || dy > 0.01) {
                    e.v1 = oldToNW[oldIdx];  // NW
                } else {
                    e.v1 = oldToSE[oldIdx];  // SE
                }
            } else {
                // BLACK: SW gets left and down, NE gets right and up
                if (dx < -0.01 || dy < -0.01) {
                    e.v1 = oldToNW[oldIdx];  // SW
                } else {
                    e.v1 = oldToSE[oldIdx];  // NE
                }
            }
        }

        // Check if v2 was a selected vertex
        if (oldToNW.count(e.v2)) {
            int oldIdx = e.v2;
            bool wasWhite = originalColor[oldIdx];
            double oldX = originalPos[oldIdx].first;
            double oldY = originalPos[oldIdx].second;
            double otherX = g_aztecVertices[e.v1].x;
            double otherY = g_aztecVertices[e.v1].y;

            // Determine which direction the neighbor is
            double dx = otherX - oldX;
            double dy = otherY - oldY;

            if (wasWhite) {
                // WHITE: NW gets left and up, SE gets right and down
                if (dx < -0.01 || dy > 0.01) {
                    e.v2 = oldToNW[oldIdx];  // NW
                } else {
                    e.v2 = oldToSE[oldIdx];  // SE
                }
            } else {
                // BLACK: SW gets left and down, NE gets right and up
                if (dx < -0.01 || dy < -0.01) {
                    e.v2 = oldToNW[oldIdx];  // SW
                } else {
                    e.v2 = oldToSE[oldIdx];  // NE
                }
            }
        }
    }

    // Now add chain edges: outer1 -- middle -- outer2
    for (int idx : selectedVertices) {
        int outerIdx1 = oldToNW[idx];
        int outerIdx2 = oldToSE[idx];

        AztecEdge edge1, edge2;
        edge1.v1 = outerIdx1;
        edge1.v2 = idx;
        edge1.logWeight = 0;  // log(1) = 0
        edge1.isHorizontal = false;
        edge1.gaugeTransformed = false;

        edge2.v1 = idx;
        edge2.v2 = outerIdx2;
        edge2.logWeight = 0;  // log(1) = 0
        edge2.isHorizontal = false;
        edge2.gaugeTransformed = false;

        g_aztecEdges.push_back(edge1);
        g_aztecEdges.push_back(edge2);
    }

    // Clear highlighting
    for (auto& v : g_aztecVertices) {
        v.inVgauge = false;
        v.toContract = false;
    }

    g_aztecReductionStep = 8;
    rebuildAdjacency();
}

// STEP 9: Diagonal Gauge Transform (Folding step 3b)
// Gauge transform trivalent vertices connected to outer boundary vertices (n-1/2, n-1/2)
// to make all diagonal edge weights equal to 1 before urban renewal
static void aztecStep9_DiagonalGauge() {
    if (g_aztecReductionStep != 8) return;
    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    int n = g_aztecLevel;
    double outerCoord = n - 0.5;  // Outer boundary coordinate

    // Find the 4 outer boundary vertices at corners (±(n-0.5), ±(n-0.5))
    std::set<int> outerBoundaryVerts;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        double x = g_aztecVertices[i].x;
        double y = g_aztecVertices[i].y;
        if ((std::abs(std::abs(x) - outerCoord) < 0.01) &&
            (std::abs(std::abs(y) - outerCoord) < 0.01)) {
            outerBoundaryVerts.insert((int)i);
        }
    }

    // Build adjacency list - using vector for O(1) access
    std::vector<std::vector<std::pair<int, int>>> adj(g_aztecVertices.size());
    for (size_t eIdx = 0; eIdx < g_aztecEdges.size(); eIdx++) {
        int v1 = g_aztecEdges[eIdx].v1;
        int v2 = g_aztecEdges[eIdx].v2;
        adj[v1].push_back({v2, (int)eIdx});
        adj[v2].push_back({v1, (int)eIdx});
    }

    // Find trivalent vertices connected to outer boundary vertices
    // These are the n-2 vertices per corner that need gauge transform
    // IMPORTANT: Skip vertices that are themselves outer boundary corners
    for (int outerIdx : outerBoundaryVerts) {
        // Find neighbors of the outer boundary vertex
        for (const auto& [neighborIdx, diagEdgeIdx] : adj[outerIdx]) {
            // Skip if this neighbor is itself an outer boundary corner
            if (outerBoundaryVerts.count(neighborIdx)) {
                continue;
            }

            // Check if it's trivalent (degree 3)
            if (adj[neighborIdx].size() == 3) {
                // Work in LOG SPACE: divide becomes subtract
                mp_real logDiagWeight = g_aztecEdges[diagEdgeIdx].logWeight;
                // Skip if already ~1 (log(1) = 0)
                if (std::abs(logDiagWeight) > 1e-10) {
                    // Gauge transform: divide all edges at this vertex by diagWeight
                    // In log space: logW -= logDiagWeight
                    for (const auto& [_, edgeIdx] : adj[neighborIdx]) {
                        g_aztecEdges[edgeIdx].logWeight -= logDiagWeight;
                        g_aztecEdges[edgeIdx].gaugeTransformed = true;
                    }
                }
            }
        }
    }

    g_aztecReductionStep = 9;
    rebuildAdjacency();
}

// STEP 10: Urban Renewal (Folding step 4)
// For each black quad: remove 4 inner vertices and 8 edges,
// add 4 new edges connecting outer diagonal vertices with transformed weights
static void aztecStep10_UrbanRenewal() {
    if (g_aztecReductionStep != 9) return;
    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    // Build adjacency list: vertex index -> list of (neighbor index, edge index)
    // Using vector instead of map for O(1) access
    std::vector<std::vector<std::pair<int, int>>> adj(g_aztecVertices.size());
    for (size_t eIdx = 0; eIdx < g_aztecEdges.size(); eIdx++) {
        int v1 = g_aztecEdges[eIdx].v1;
        int v2 = g_aztecEdges[eIdx].v2;
        adj[v1].push_back({v2, (int)eIdx});
        adj[v2].push_back({v1, (int)eIdx});
    }

    // Track vertices and edges to remove
    std::set<int> verticesToRemove;
    std::set<int> edgesToRemove;

    // New edges to add
    std::vector<AztecEdge> newEdges;

    // Process each black quad
    for (const auto& center : g_blackQuadCenters) {
        // Find the 4 inner vertices (closest to center)
        std::vector<std::pair<double, int>> vertsWithDist;
        for (size_t i = 0; i < g_aztecVertices.size(); i++) {
            double d = std::hypot(g_aztecVertices[i].x - center.first,
                                  g_aztecVertices[i].y - center.second);
            vertsWithDist.push_back({d, (int)i});
        }
        std::sort(vertsWithDist.begin(), vertsWithDist.end());

        std::set<int> innerSet;
        std::vector<int> innerVerts;
        for (int i = 0; i < 4 && i < (int)vertsWithDist.size(); i++) {
            innerVerts.push_back(vertsWithDist[i].second);
            innerSet.insert(vertsWithDist[i].second);
        }

        if (innerVerts.size() != 4) continue;

        // Sort inner vertices by angle around center for consistent ordering
        std::sort(innerVerts.begin(), innerVerts.end(), [&](int a, int b) {
            double angleA = std::atan2(g_aztecVertices[a].y - center.second,
                                       g_aztecVertices[a].x - center.first);
            double angleB = std::atan2(g_aztecVertices[b].y - center.second,
                                       g_aztecVertices[b].x - center.first);
            return angleA < angleB;
        });

        // For each inner vertex, find the outer diagonal vertex (neighbor not in inner set)
        std::vector<int> outerVerts(4, -1);
        std::vector<int> diagEdgeIdx(4, -1);  // Edge indices for diagonal edges

        for (int i = 0; i < 4; i++) {
            int innerIdx = innerVerts[i];
            for (const auto& [neighborIdx, edgeIdx] : adj[innerIdx]) {
                if (innerSet.find(neighborIdx) == innerSet.end()) {
                    // This neighbor is outside the quad - it's the diagonal vertex
                    outerVerts[i] = neighborIdx;
                    diagEdgeIdx[i] = edgeIdx;
                    break;
                }
            }
        }

        // Verify we found all 4 outer vertices
        bool valid = true;
        for (int i = 0; i < 4; i++) {
            if (outerVerts[i] == -1) {
                valid = false;
                break;
            }
        }
        if (!valid) continue;

        // Find quad edges (edges between inner vertices) and their LOG weights
        // Order: edge from innerVerts[i] to innerVerts[(i+1)%4]
        std::vector<mp_real> logQuadWeights(4, mp_real(0));  // log(1) = 0 as default
        std::vector<int> quadEdgeIdx(4, -1);

        for (int i = 0; i < 4; i++) {
            int v1 = innerVerts[i];
            int v2 = innerVerts[(i + 1) % 4];
            for (const auto& [neighborIdx, edgeIdx] : adj[v1]) {
                if (neighborIdx == v2) {
                    quadEdgeIdx[i] = edgeIdx;
                    logQuadWeights[i] = g_aztecEdges[edgeIdx].logWeight;
                    break;
                }
            }
        }

        // Get diagonal edge LOG weights
        std::vector<mp_real> logDiagWeights(4, mp_real(0));
        for (int i = 0; i < 4; i++) {
            if (diagEdgeIdx[i] >= 0) {
                logDiagWeights[i] = g_aztecEdges[diagEdgeIdx[i]].logWeight;
            }
        }

        // Apply urban renewal weight transformation IN LOG SPACE
        // Quad edges in cyclic order: x=quadWeights[0], y=quadWeights[1], z=quadWeights[2], w=quadWeights[3]
        // D = x*z + w*y = e^(log_x + log_z) + e^(log_w + log_y)
        // New weights: (z/D, w/D, x/D, y/D)
        // In log space: log(z/D) = log_z - log_D
        mp_real log_x = logQuadWeights[0], log_y = logQuadWeights[1];
        mp_real log_z = logQuadWeights[2], log_w = logQuadWeights[3];

        // log_D = log(e^(log_x + log_z) + e^(log_w + log_y))
        // Use log-sum-exp: log(e^a + e^b) = max(a,b) + log(1 + e^{-|a-b|})
        mp_real term1 = log_x + log_z;  // log(x*z)
        mp_real term2 = log_w + log_y;  // log(w*y)
        mp_real maxTerm = (term1 > term2) ? term1 : term2;
        mp_real diffTerm = abs(term1 - term2);
        mp_real log_D = maxTerm + log(mp_real(1) + exp(-diffTerm));

        // New log weights: log(z/D) = log_z - log_D, etc.
        std::vector<mp_real> newLogWeights = {
            log_z - log_D,  // log(z/D)
            log_w - log_D,  // log(w/D)
            log_x - log_D,  // log(x/D)
            log_y - log_D   // log(y/D)
        };

        // Mark inner vertices for removal
        for (int i = 0; i < 4; i++) {
            verticesToRemove.insert(innerVerts[i]);
        }

        // Mark all 8 edges for removal (4 quad + 4 diagonal)
        for (int i = 0; i < 4; i++) {
            if (quadEdgeIdx[i] >= 0) edgesToRemove.insert(quadEdgeIdx[i]);
            if (diagEdgeIdx[i] >= 0) edgesToRemove.insert(diagEdgeIdx[i]);
        }

        // Add 4 new edges connecting outer vertices
        // Edge i connects outerVerts[i] to outerVerts[(i+1)%4] with logWeight newLogWeights[i]
        for (int i = 0; i < 4; i++) {
            AztecEdge newEdge;
            newEdge.v1 = outerVerts[i];
            newEdge.v2 = outerVerts[(i + 1) % 4];
            newEdge.logWeight = newLogWeights[i];  // Already in log space
            newEdge.isHorizontal = false;
            newEdge.gaugeTransformed = true;  // Mark as transformed
            newEdges.push_back(newEdge);
        }
    }

    // Remove edges marked for removal (in reverse order to preserve indices)
    std::vector<int> edgesToRemoveVec(edgesToRemove.begin(), edgesToRemove.end());
    std::sort(edgesToRemoveVec.rbegin(), edgesToRemoveVec.rend());
    for (int idx : edgesToRemoveVec) {
        g_aztecEdges.erase(g_aztecEdges.begin() + idx);
    }

    // Build vertex index remapping using vector for O(1) lookup
    std::vector<int> vertexRemap(g_aztecVertices.size(), -1);
    int newIdx = 0;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        if (verticesToRemove.find((int)i) == verticesToRemove.end()) {
            vertexRemap[i] = newIdx++;
        }
    }

    // Build new vertex list directly, skipping removals (more efficient than erase)
    std::vector<AztecVertex> finalVertices;
    finalVertices.reserve(newIdx);
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        if (vertexRemap[i] != -1) {
            finalVertices.push_back(g_aztecVertices[i]);
        }
    }
    g_aztecVertices = std::move(finalVertices);

    // Update edge vertex indices using remap (O(1) vector lookup)
    for (auto& e : g_aztecEdges) {
        e.v1 = vertexRemap[e.v1];
        e.v2 = vertexRemap[e.v2];
    }

    // Remap and add new edges
    for (auto& e : newEdges) {
        e.v1 = vertexRemap[e.v1];
        e.v2 = vertexRemap[e.v2];
        g_aztecEdges.push_back(e);
    }

    // Debug: count duplicate edges
    std::map<std::pair<int,int>, int> edgeCount;
    for (const auto& e : g_aztecEdges) {
        int v1 = std::min(e.v1, e.v2);
        int v2 = std::max(e.v1, e.v2);
        edgeCount[{v1, v2}]++;
    }
    int multiEdges = 0;
    for (const auto& kv : edgeCount) {
        if (kv.second > 1) multiEdges += kv.second;
    }
    // Clear black quad centers (they've been collapsed)
    g_blackQuadCenters.clear();

    g_aztecReductionStep = 10;
    rebuildAdjacency();
}

// STEP 11: Combine Double Edges (Folding step 5)
// Replace each pair of double edges with a single edge, summing their weights
static void aztecStep11_CombineDoubleEdges() {
    if (g_aztecReductionStep != 10) return;
    pushAztecState();

    // Clear previous step's highlighting - only show edges modified in THIS step
    for (auto& e : g_aztecEdges) {
        e.gaugeTransformed = false;
    }

    // Group edges by vertex pair (normalized so smaller index first)
    std::map<std::pair<int,int>, std::vector<size_t>> edgeGroups;
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        int v1 = std::min(g_aztecEdges[i].v1, g_aztecEdges[i].v2);
        int v2 = std::max(g_aztecEdges[i].v1, g_aztecEdges[i].v2);
        edgeGroups[{v1, v2}].push_back(i);
    }

    // Find the boundary distance (max coordinate value) for ALL captures
    double maxCoord = 0;
    for (const auto& v : g_aztecVertices) {
        maxCoord = std::max(maxCoord, std::max(std::abs(v.x), std::abs(v.y)));
    }

    // Capture double edge ratios for T-embedding alpha values
    // Alpha edges: BOTH vertices on boundary (at max distance from origin)
    // This now works for any number of vertices, not just 4
    {
        DoubleEdgeRatios ratios;
        // Ratios are for computing T_k where k = g_aztecLevel - 2
        ratios.k = g_aztecLevel - 2;
        ratios.ratio_top = 1; ratios.num_top = 1; ratios.den_top = 1;
        ratios.ratio_bottom = 1; ratios.num_bottom = 1; ratios.den_bottom = 1;
        ratios.ratio_left = 1; ratios.num_left = 1; ratios.den_left = 1;
        ratios.ratio_right = 1; ratios.num_right = 1; ratios.den_right = 1;

        bool foundAnyAlpha = false;

        for (const auto& [vertPair, indices] : edgeGroups) {
            if (indices.size() == 2) {  // Double edge
                const auto& v1 = g_aztecVertices[vertPair.first];
                const auto& v2 = g_aztecVertices[vertPair.second];

                // Check if BOTH vertices are on the boundary (alpha edge)
                double dist1 = std::max(std::abs(v1.x), std::abs(v1.y));
                double dist2 = std::max(std::abs(v2.x), std::abs(v2.y));
                bool isAlphaEdge = (std::abs(dist1 - maxCoord) < 0.1 &&
                                    std::abs(dist2 - maxCoord) < 0.1);

                if (!isAlphaEdge) continue;

                // Get the two edges
                const auto& e0 = g_aztecEdges[indices[0]];
                const auto& e1 = g_aztecEdges[indices[1]];

                // For each edge, check if it goes from black to white
                bool e0_fromBlackToWhite = (g_aztecVertices[e0.v1].isWhite == false);
                bool e1_fromBlackToWhite = (g_aztecVertices[e1.v1].isWhite == false);

                // Compute ratio: black->white edge weight / white->black edge weight
                // In log space: log(ratio) = logWeight_num - logWeight_den
                mp_real logNum, logDen;
                if (e0_fromBlackToWhite && !e1_fromBlackToWhite) {
                    logNum = e0.logWeight;
                    logDen = e1.logWeight;
                } else if (!e0_fromBlackToWhite && e1_fromBlackToWhite) {
                    logNum = e1.logWeight;
                    logDen = e0.logWeight;
                } else {
                    // Both same direction - use default
                    logNum = e0.logWeight;
                    logDen = e1.logWeight;
                }
                // Convert back to actual values for storage (ratio is bounded)
                mp_real numerator = exp(logNum);
                mp_real denominator = exp(logDen);
                mp_real ratio = exp(logNum - logDen);

                // Determine edge type by position (top/bottom/left/right)
                double x1 = v1.x, y1 = v1.y;
                double x2 = v2.x, y2 = v2.y;
                bool sameY = std::abs(y1 - y2) < 0.1;  // Horizontal edge
                bool sameX = std::abs(x1 - x2) < 0.1;  // Vertical edge

                if (sameY && (y1 + y2) / 2 > 0) {
                    ratios.ratio_top = ratio;
                    ratios.num_top = numerator;
                    ratios.den_top = denominator;
                    foundAnyAlpha = true;
                } else if (sameY && (y1 + y2) / 2 < 0) {
                    ratios.ratio_bottom = ratio;
                    ratios.num_bottom = numerator;
                    ratios.den_bottom = denominator;
                    foundAnyAlpha = true;
                } else if (sameX && (x1 + x2) / 2 < 0) {
                    ratios.ratio_left = ratio;
                    ratios.num_left = numerator;
                    ratios.den_left = denominator;
                    foundAnyAlpha = true;
                } else if (sameX && (x1 + x2) / 2 > 0) {
                    ratios.ratio_right = ratio;
                    ratios.num_right = numerator;
                    ratios.den_right = denominator;
                    foundAnyAlpha = true;
                }
            }
        }

        if (foundAnyAlpha) {
            g_doubleEdgeRatios.push_back(ratios);
        }
    }

    // Capture beta double edge ratios
    // Beta edges: one vertex on boundary, one inner
    if (g_aztecVertices.size() > 4) {
        // maxCoord already computed above

        BetaEdgeRatios betaRatios;
        // When we have N > 4 vertices at level L, these ratios are for computing T_{L-2}
        betaRatios.k = g_aztecLevel - 2;

        for (const auto& [vertPair, indices] : edgeGroups) {
            if (indices.size() == 2) {  // Double edge
                const auto& v1 = g_aztecVertices[vertPair.first];
                const auto& v2 = g_aztecVertices[vertPair.second];

                // Determine which is external (on boundary) vs inner
                double dist1 = std::max(std::abs(v1.x), std::abs(v1.y));
                double dist2 = std::max(std::abs(v2.x), std::abs(v2.y));

                // Alpha edges: both vertices on boundary (max distance)
                bool isAlphaEdge = (std::abs(dist1 - maxCoord) < 0.1 &&
                                    std::abs(dist2 - maxCoord) < 0.1);
                // Beta edges: exactly one vertex on boundary, one inner
                bool isBetaEdge = !isAlphaEdge &&
                                  ((std::abs(dist1 - maxCoord) < 0.1) !=
                                   (std::abs(dist2 - maxCoord) < 0.1));

                if (isBetaEdge) {
                    // Find the inner vertex (smaller max-distance from origin)
                    const auto& inner = (dist1 < dist2) ? v1 : v2;

                    // Map inner vertex coords to (i,j) via rounding
                    int i = (int)std::round(inner.x);
                    int j = (int)std::round(inner.y);

                    // Compute ratio based on white/black coloring
                    // Face weight formula uses edges from black to white
                    const auto& e0 = g_aztecEdges[indices[0]];
                    const auto& e1 = g_aztecEdges[indices[1]];

                    bool e0_fromBlackToWhite = (g_aztecVertices[e0.v1].isWhite == false);
                    bool e1_fromBlackToWhite = (g_aztecVertices[e1.v1].isWhite == false);

                    // Compute ratio in log space
                    mp_real logNum, logDen;
                    if (e0_fromBlackToWhite && !e1_fromBlackToWhite) {
                        logNum = e0.logWeight;
                        logDen = e1.logWeight;
                    } else if (!e0_fromBlackToWhite && e1_fromBlackToWhite) {
                        logNum = e1.logWeight;
                        logDen = e0.logWeight;
                    } else {
                        logNum = e0.logWeight;
                        logDen = e1.logWeight;
                    }
                    // Convert back to actual values for storage
                    mp_real numerator = exp(logNum);
                    mp_real denominator = exp(logDen);
                    mp_real ratio = exp(logNum - logDen);
                    betaRatios.ratios[{i, j}] = ratio;
                    betaRatios.numerators[{i, j}] = numerator;
                    betaRatios.denominators[{i, j}] = denominator;
                }
            }
        }

        if (!betaRatios.ratios.empty()) {
            g_betaEdgeRatios.push_back(betaRatios);
        }
    }

    // Build new edge list with combined weights using log-sum-exp
    std::vector<AztecEdge> newEdges;
    for (const auto& [vertPair, indices] : edgeGroups) {
        bool isHoriz = g_aztecEdges[indices[0]].isHorizontal;
        bool gaugeT = g_aztecEdges[indices[0]].gaugeTransformed;

        // Sum weights in log space using log-sum-exp
        // Start with first edge's logWeight
        mp_real logTotalWeight = g_aztecEdges[indices[0]].logWeight;
        for (size_t i = 1; i < indices.size(); i++) {
            size_t idx = indices[i];
            // log(e^a + e^b) = max(a,b) + log(1 + e^{-|a-b|})
            mp_real a = logTotalWeight;
            mp_real b = g_aztecEdges[idx].logWeight;
            mp_real maxAB = (a > b) ? a : b;
            mp_real diff = abs(a - b);
            logTotalWeight = maxAB + log(mp_real(1) + exp(-diff));
            gaugeT = gaugeT || g_aztecEdges[idx].gaugeTransformed;
        }

        // Create single combined edge
        AztecEdge combined;
        combined.v1 = vertPair.first;
        combined.v2 = vertPair.second;
        combined.logWeight = logTotalWeight;
        combined.isHorizontal = isHoriz;
        combined.gaugeTransformed = gaugeT;
        newEdges.push_back(combined);
    }

    g_aztecEdges = newEdges;
    g_aztecReductionStep = 11;
    rebuildAdjacency();
}

// STEP 12: Start Next Iteration (decrease level, back to fold 1)
static void aztecStep12_StartNextIteration() {
    if (g_aztecReductionStep != 11) return;
    if (g_aztecLevel <= 1) return;  // Can't reduce further

    pushAztecState();

    int oldLevel = g_aztecLevel;
    g_aztecLevel--;
    int newLevel = g_aztecLevel;

    // Move the 4 outer boundary vertices inward to match new level
    // Old boundary: ±(oldLevel - 0.5), New boundary: ±(newLevel - 0.5)
    double oldBound = oldLevel - 0.5;
    double newBound = newLevel - 0.5;

    for (auto& v : g_aztecVertices) {
        // Check if this is an outer corner vertex
        if (std::abs(std::abs(v.x) - oldBound) < 0.01 && std::abs(std::abs(v.y) - oldBound) < 0.01) {
            // Move to new boundary position (preserve sign)
            v.x = (v.x > 0) ? newBound : -newBound;
            v.y = (v.y > 0) ? newBound : -newBound;
        }
    }

    // Re-compute black quad centers for new level using current graph structure
    // Build vertex index using 64-bit integer keys
    std::map<int64_t, int> vertexIndex;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        vertexIndex[makePosKey(g_aztecVertices[i].x, g_aztecVertices[i].y)] = (int)i;
    }

    // Build edge lookup using ordered pairs of vertex keys
    std::set<std::pair<int64_t, int64_t>> edgeSet;
    for (const auto& e : g_aztecEdges) {
        int64_t k1 = makePosKey(g_aztecVertices[e.v1].x, g_aztecVertices[e.v1].y);
        int64_t k2 = makePosKey(g_aztecVertices[e.v2].x, g_aztecVertices[e.v2].y);
        edgeSet.insert(k1 < k2 ? std::make_pair(k1, k2) : std::make_pair(k2, k1));
    }

    // Helper to check if edge exists
    auto hasEdge = [&](int64_t k1, int64_t k2) {
        return edgeSet.count(k1 < k2 ? std::make_pair(k1, k2) : std::make_pair(k2, k1)) > 0;
    };

    // Find all black quad centers in current graph
    // Black quads have WHITE vertices at NW (TL) and SE (BR) corners
    g_blackQuadCenters.clear();
    std::set<int64_t> visitedFaces;

    for (const auto& v : g_aztecVertices) {
        double x = v.x, y = v.y;
        int64_t faceKey = makePosKey(x, y);
        if (visitedFaces.count(faceKey)) continue;

        // Look for face with BL at (x, y)
        int64_t blKey = makePosKey(x, y);
        int64_t brKey = makePosKey(x + 1, y);
        int64_t tlKey = makePosKey(x, y + 1);
        int64_t trKey = makePosKey(x + 1, y + 1);

        if (vertexIndex.count(blKey) && vertexIndex.count(brKey) &&
            vertexIndex.count(tlKey) && vertexIndex.count(trKey)) {
            // Check all 4 edges exist
            if (hasEdge(blKey, brKey) && hasEdge(tlKey, trKey) &&
                hasEdge(blKey, tlKey) && hasEdge(brKey, trKey)) {
                visitedFaces.insert(faceKey);

                int blIdx = vertexIndex[blKey];
                int brIdx = vertexIndex[brKey];
                int tlIdx = vertexIndex[tlKey];
                int trIdx = vertexIndex[trKey];

                bool tlWhite = g_aztecVertices[tlIdx].isWhite;
                bool brWhite = g_aztecVertices[brIdx].isWhite;

                // Black quad: WHITE at NW and SE
                if (tlWhite && brWhite) {
                    double cx = (g_aztecVertices[blIdx].x + g_aztecVertices[brIdx].x +
                                 g_aztecVertices[tlIdx].x + g_aztecVertices[trIdx].x) / 4.0;
                    double cy = (g_aztecVertices[blIdx].y + g_aztecVertices[brIdx].y +
                                 g_aztecVertices[tlIdx].y + g_aztecVertices[trIdx].y) / 4.0;
                    g_blackQuadCenters.push_back({cx, cy});
                }
            }
        }
    }

    g_aztecReductionStep = 6;  // Back to fold 1: shaded
    rebuildAdjacency();
}

// Step down: advance to next reduction step
static void aztecStepDown() {
    switch (g_aztecReductionStep) {
        case 0: aztecStep1_GaugeTransform(); break;
        case 1: aztecStep2_WhiteGaugeTransform(); break;
        case 2: aztecStep3_Contract(); break;
        case 3: aztecStep4_BlackContraction(); break;
        case 4: aztecStep5_WhiteContraction(); break;
        case 5: aztecStep6_Shading(); break;
        case 6: aztecStep7_MarkDiagonalVertices(); break;
        case 7: aztecStep8_SplitVertices(); break;
        case 8: aztecStep9_DiagonalGauge(); break;
        case 9: aztecStep10_UrbanRenewal(); break;
        case 10: aztecStep11_CombineDoubleEdges(); break;
        case 11: aztecStep12_StartNextIteration(); break;
        default: break;  // Already fully reduced
    }

    // Only compute faces when needed for weight capture:
    // - Steps 1 and 3 only occur at initial level (subsequent levels start at step 6)
    // - Step 11 occurs at every level
    if (g_aztecReductionStep == 1 || g_aztecReductionStep == 3 || g_aztecReductionStep == 11) {
        computeFaces();
        tryCaptureFaceWeights();
    }
}

// Step up: restore previous state
static void aztecStepUp() {
    popAztecState();
}

// =============================================================================
// FACE DETECTION AND FACE WEIGHTS
// =============================================================================

// Structure to represent a face with its weight
struct AztecFace {
    std::vector<int> vertexIndices;  // Vertices around face in order
    std::vector<int> edgeIndices;    // Edges around face in order
    double cx, cy;                   // Centroid
    mp_real weight;                  // Face weight (cross-ratio, 100-digit precision)
};

// Global face storage
static std::vector<AztecFace> g_aztecFaces;

// =============================================================================
// STORED FACE WEIGHTS (checkpointed at 2k²+2k+1 face counts)
// =============================================================================

struct StoredFaceWeights {
    int k;                                        // Level index
    mp_real root;                                 // k=0 only: single ROOT weight
    mp_real alpha_top, alpha_bottom;              // Extreme weights at (0,max), (0,-max)
    mp_real alpha_left, alpha_right;              // Extreme weights at (-max,0), (max,0)
    std::map<std::pair<int,int>, mp_real> beta;   // Diagonal weights beta(i,j), |i|+|j|=k
    std::map<std::pair<int,int>, mp_real> gamma;  // Inner weights gamma(i,j), |i|+|j|<=k-1
};

static std::vector<StoredFaceWeights> g_storedWeights;
static std::set<int> g_capturedKValues;  // Track which k values we've captured

// Check if n = 2k²+2k+1 for some non-negative integer k, return k or -1
static int checkFaceCountFormula(int n) {
    // 2k²+2k+1 = n => k = (-2 + sqrt(4 + 8(n-1))) / 4 = (-1 + sqrt(2n-1)) / 2
    // For k=0: n=1, k=1: n=5, k=2: n=13, k=3: n=25, k=4: n=41, ...
    for (int k = 0; k <= MAX_N; k++) {
        if (2*k*k + 2*k + 1 == n) return k;
    }
    return -1;
}

// Build face adjacency: two faces are adjacent if they share an edge
static std::vector<std::set<int>> buildFaceAdjacency() {
    int nFaces = (int)g_aztecFaces.size();
    std::vector<std::set<int>> adj(nFaces);

    // Build edge-to-face map
    std::map<int, std::vector<int>> edgeToFaces;
    for (int fi = 0; fi < nFaces; fi++) {
        for (int ei : g_aztecFaces[fi].edgeIndices) {
            edgeToFaces[ei].push_back(fi);
        }
    }

    // Faces sharing an edge are adjacent
    for (const auto& kv : edgeToFaces) {
        const auto& faces = kv.second;
        for (size_t i = 0; i < faces.size(); i++) {
            for (size_t j = i + 1; j < faces.size(); j++) {
                adj[faces[i]].insert(faces[j]);
                adj[faces[j]].insert(faces[i]);
            }
        }
    }
    return adj;
}

// Categorize and store face weights for level k using CONNECTIVITY
static void storeFaceWeightsForK(int k) {
    if (g_capturedKValues.count(k)) return;  // Already captured

    StoredFaceWeights sw;
    sw.k = k;
    sw.root = 0;
    sw.alpha_top = sw.alpha_bottom = sw.alpha_left = sw.alpha_right = 0;

    int nFaces = (int)g_aztecFaces.size();

    if (k == 0) {
        // Special case: just one ROOT face
        if (!g_aztecFaces.empty()) {
            sw.root = g_aztecFaces[0].weight;
        }
    } else {
        // Build face adjacency
        auto adj = buildFaceAdjacency();

        // Assign T-graph coordinates using BFS from center
        // First, find the face closest to centroid origin (will be our (0,0))
        int centerFace = 0;
        double minDist = 1e9;
        for (int fi = 0; fi < nFaces; fi++) {
            double d = std::abs(g_aztecFaces[fi].cx) + std::abs(g_aztecFaces[fi].cy);
            if (d < minDist) {
                minDist = d;
                centerFace = fi;
            }
        }

        // BFS to assign (i,j) coordinates based on connectivity
        std::map<int, std::pair<int,int>> faceCoords;  // face index -> (i,j)
        faceCoords[centerFace] = {0, 0};

        std::vector<int> queue;
        queue.push_back(centerFace);
        std::set<int> visited;
        visited.insert(centerFace);

        while (!queue.empty()) {
            int cur = queue.front();
            queue.erase(queue.begin());
            auto [ci, cj] = faceCoords[cur];

            // For each neighbor, assign coordinates based on relative centroid direction
            for (int nb : adj[cur]) {
                if (visited.count(nb)) continue;
                visited.insert(nb);

                double dx = g_aztecFaces[nb].cx - g_aztecFaces[cur].cx;
                double dy = g_aztecFaces[nb].cy - g_aztecFaces[cur].cy;

                int ni, nj;
                if (std::abs(dx) > std::abs(dy)) {
                    // Horizontal neighbor
                    ni = ci + (dx > 0 ? 1 : -1);
                    nj = cj;
                } else {
                    // Vertical neighbor
                    ni = ci;
                    nj = cj + (dy > 0 ? 1 : -1);
                }

                faceCoords[nb] = {ni, nj};
                queue.push_back(nb);
            }
        }

        // Now categorize faces by their assigned coordinates
        for (const auto& kv : faceCoords) {
            int fi = kv.first;
            int i = kv.second.first;
            int j = kv.second.second;
            mp_real weight = g_aztecFaces[fi].weight;
            int absSum = std::abs(i) + std::abs(j);


            // Alpha faces: |i|+|j|=k and on axis
            if (absSum == k && (i == 0 || j == 0)) {
                if (j > 0 && i == 0) sw.alpha_top = weight;
                else if (j < 0 && i == 0) sw.alpha_bottom = weight;
                else if (i > 0 && j == 0) sw.alpha_right = weight;
                else if (i < 0 && j == 0) sw.alpha_left = weight;
            }
            // Beta faces: |i|+|j|=k, off-axis
            else if (absSum == k && i != 0 && j != 0) {
                sw.beta[{i, j}] = weight;
            }
            // Gamma faces: |i|+|j| <= k-1
            else if (absSum <= k - 1) {
                sw.gamma[{i, j}] = weight;
            }
        }

    }

    g_storedWeights.push_back(sw);
    g_capturedKValues.insert(k);
}

// Clear stored weights (call when n changes)
static void clearStoredWeights() {
    g_storedWeights.clear();
    g_capturedKValues.clear();
    g_doubleEdgeRatios.clear();
    g_betaEdgeRatios.clear();
}

// Try to capture face weights if current face count matches formula
static void tryCaptureFaceWeights() {
    int numFaces = (int)g_aztecFaces.size();
    int k = checkFaceCountFormula(numFaces);
    if (k >= 0 && !g_capturedKValues.count(k)) {
        storeFaceWeightsForK(k);
    }
}

// =============================================================================
// T-EMBEDDING COMPUTATION (using stored face weights)
// =============================================================================

struct TembVertex {
    int i, j;           // Integer indices
    double re, im;      // Complex coordinates T(i,j) = re + i*im
};

struct TembLevel {
    int k;                          // Generation level
    std::vector<TembVertex> vertices;
};

static std::vector<TembLevel> g_tembLevels;

// Storage for origami map (same structure as T-embedding)
static std::vector<TembLevel> g_origamiLevels;

// Compute T_0 using ROOT weight
// T_0(0,0) = 0
// T_0(1,0) = 1, T_0(-1,0) = -1
// T_0(0,1) = i/sqrt(X_ROOT), T_0(0,-1) = -i/sqrt(X_ROOT)
static void computeT0() {
    // Find k=0 stored weights
    mp_real rootWeight = 1;
    for (const auto& sw : g_storedWeights) {
        if (sw.k == 0) {
            rootWeight = sw.root;
            break;
        }
    }

    TembLevel t0;
    t0.k = 0;

    // Center vertex
    t0.vertices.push_back({0, 0, 0.0, 0.0});

    // Boundary vertices on real axis
    t0.vertices.push_back({1, 0, 1.0, 0.0});
    t0.vertices.push_back({-1, 0, -1.0, 0.0});

    // Boundary vertices on imaginary axis: i/sqrt(X_ROOT)
    double invSqrtRoot = 1.0 / std::sqrt(static_cast<double>(rootWeight));
    t0.vertices.push_back({0, 1, 0.0, invSqrtRoot});
    t0.vertices.push_back({0, -1, 0.0, -invSqrtRoot});

    // Store or update T_0
    bool found = false;
    for (auto& level : g_tembLevels) {
        if (level.k == 0) {
            level = t0;
            found = true;
            break;
        }
    }
    if (!found) {
        g_tembLevels.push_back(t0);
    }
}

// Verify T-embedding weight condition for T_0
// Formula: X_f = (-1)^{d+1} * prod_{k=1}^{d} (T(v*) - T(v*_{2k-1})) / (T(v*_{2k}) - T(v*))
// For ROOT face with 4 neighbors (d=2), T(0,0)=0:
// X_ROOT = (-1)^3 * (0 - T(1,0))/(T(0,1) - 0) * (0 - T(-1,0))/(T(0,-1) - 0)
static void verifyT0() {
    // Find T_0 level
    const TembLevel* t0 = nullptr;
    for (const auto& l : g_tembLevels) {
        if (l.k == 0) {
            t0 = &l;
            break;
        }
    }
    if (!t0 || t0->vertices.size() < 5) {
        std::printf("verifyT0: T_0 not computed yet\n");
        return;
    }

    // Find vertices by index
    std::complex<double> T00(0, 0), T10(0, 0), Tm10(0, 0), T01(0, 0), T0m1(0, 0);
    for (const auto& v : t0->vertices) {
        std::complex<double> z(v.re, v.im);
        if (v.i == 0 && v.j == 0) T00 = z;
        else if (v.i == 1 && v.j == 0) T10 = z;
        else if (v.i == -1 && v.j == 0) Tm10 = z;
        else if (v.i == 0 && v.j == 1) T01 = z;
        else if (v.i == 0 && v.j == -1) T0m1 = z;
    }

    // Compute weight from T-embedding
    // Neighbors in CCW order: (1,0), (0,1), (-1,0), (0,-1)
    // v*_1 = T(1,0), v*_2 = T(0,1), v*_3 = T(-1,0), v*_4 = T(0,-1)
    // X = (-1)^3 * (T00 - T10)/(T01 - T00) * (T00 - Tm10)/(T0m1 - T00)
    std::complex<double> term1 = (T00 - T10) / (T01 - T00);
    std::complex<double> term2 = (T00 - Tm10) / (T0m1 - T00);
    std::complex<double> computed = -1.0 * term1 * term2;  // (-1)^3 = -1

    // Get expected ROOT weight
    mp_real expectedWeight = 1;
    for (const auto& sw : g_storedWeights) {
        if (sw.k == 0) {
            expectedWeight = sw.root;
            break;
        }
    }

}

// =============================================================================
// T_K COMPUTATION FROM T_{K-1} USING RECURRENCE
// =============================================================================
//
// T_k vertices:
//   - 4 external corners: (±(k+1), 0), (0, ±(k+1))
//   - 4 alpha vertices: (±k, 0), (0, ±k) — at |i|+|j| = k, on axis
//   - Beta vertices: |i|+|j| = k, off-axis (i≠0 AND j≠0)
//   - Interior: |i|+|j| ≤ k-1
//
// T_k edges:
//   1. External corners connect to their corresponding alpha
//   2. Beta vertices form diagonals
//   3. Interior connects like a lattice
//
// Recurrence formulas (TODO: currently all weights set to 1 for testing):
//   1. T_k(k+1,0) = T_{k-1}(k,0)  (external corners stay same)
//   2. T_k(k,0) = 1/(α+1) * (T_{k-1}(k,0) + T_{k-1}(k-1,0))  (alpha update)
//   3. Beta update for diagonal boundary
//   4. Interior pass-through/recurrence

// Helper to get T value from a TembLevel
static std::complex<double> getTembValue(const TembLevel& level, int i, int j) {
    for (const auto& v : level.vertices) {
        if (v.i == i && v.j == j) {
            return std::complex<double>(v.re, v.im);
        }
    }
    // Return 0 if not found (shouldn't happen if used correctly)
    return std::complex<double>(0, 0);
}

// Verify that a position z satisfies the weight condition
static double computeFaceWeight(
    std::complex<double> z,
    std::complex<double> n1, std::complex<double> n2,
    std::complex<double> n3, std::complex<double> n4)
{
    // X = -[(z - n1)(z - n3)] / [(n2 - z)(n4 - z)]
    std::complex<double> num = (z - n1) * (z - n3);
    std::complex<double> den = (n2 - z) * (n4 - z);
    std::complex<double> X = -num / den;
    return X.real();  // Should be purely real for valid t-embedding
}

// Compute T_k from T_{k-1} using recurrence formulas
// Requires T_{k-1} to already be computed and stored in g_tembLevels
static void computeTk(int k) {
    if (k < 1) return;  // T_0 is computed separately

    // Clear and start debug output for this level
    std::ostringstream dbg;
    dbg << "=== T_" << k << " computation ===\n";

    // Check if already computed
    for (const auto& level : g_tembLevels) {
        if (level.k == k) return;  // Already exists
    }

    // Find T_{k-1}
    const TembLevel* prevLevel = nullptr;
    for (const auto& l : g_tembLevels) {
        if (l.k == k - 1) {
            prevLevel = &l;
            break;
        }
    }

    if (!prevLevel) {
        std::printf("computeTk(%d): T_{%d} not found, computing recursively\n", k, k-1);
        computeTk(k - 1);
        for (const auto& l : g_tembLevels) {
            if (l.k == k - 1) {
                prevLevel = &l;
                break;
            }
        }
    }

    if (!prevLevel) {
        std::printf("computeTk(%d): ERROR - could not find T_{%d}\n", k, k-1);
        return;
    }

    // Find stored face weights for level k
    const StoredFaceWeights* storedWeights = nullptr;
    for (const auto& sw : g_storedWeights) {
        if (sw.k == k) {
            storedWeights = &sw;
            break;
        }
    }

    // Get alpha values from double edge ratios (captured in step 11)
    mp_real alpha_right = 1, alpha_left = 1, alpha_top = 1, alpha_bottom = 1;

    for (const auto& der : g_doubleEdgeRatios) {
        if (der.k == k) {
            alpha_right = der.ratio_right;
            alpha_left = der.ratio_left;
            alpha_top = der.ratio_top;
            alpha_bottom = der.ratio_bottom;
            break;
        }
    }

    TembLevel tk;
    tk.k = k;

    // Use flat arrays for O(1) lookup instead of O(log n) maps
    // Indices range from -(k+1) to (k+1), so dimension is 2*(k+1)+3 for safety
    int dim = 2 * k + 5;
    int offset = k + 2;
    auto idx = [dim, offset](int i, int j) { return (i + offset) * dim + (j + offset); };

    // Flat arrays for T_{k-1} (Tprev)
    std::vector<mp_complex> Tprev_vec(dim * dim, mp_complex(0, 0));
    std::vector<bool> Tprev_exists(dim * dim, false);

    // Populate Tprev from prevLevel
    for (const auto& v : prevLevel->vertices) {
        int index = idx(v.i, v.j);
        Tprev_vec[index] = mp_complex(mp_real(v.re), mp_real(v.im));
        Tprev_exists[index] = true;
    }

    // Flat arrays for T_k (Tcurr)
    std::vector<mp_complex> Tcurr_vec(dim * dim, mp_complex(0, 0));
    std::vector<bool> Tcurr_set(dim * dim, false);

    // Helper lambdas for cleaner access
    auto Tprev = [&](int i, int j) -> mp_complex { return Tprev_vec[idx(i, j)]; };
    auto setTcurr = [&](int i, int j, const mp_complex& val) {
        int index = idx(i, j);
        Tcurr_vec[index] = val;
        Tcurr_set[index] = true;
    };
    auto Tcurr = [&](int i, int j) -> mp_complex { return Tcurr_vec[idx(i, j)]; };

    // ==========================================================================
    // Rule 1: External corners (stay the same as previous level's corners)
    // T_k(k+1,0) = T_{k-1}(k,0), etc.
    // ==========================================================================
    setTcurr(k+1, 0, Tprev(k, 0));
    setTcurr(-(k+1), 0, Tprev(-k, 0));
    setTcurr(0, k+1, Tprev(0, k));
    setTcurr(0, -(k+1), Tprev(0, -k));

    // ==========================================================================
    // Rule 2: Alpha vertices (axis boundary at |i|+|j|=k, on-axis)
    // T_k(k,0) = (T_{k-1}(k,0) + α * T_{k-1}(k-1,0)) / (α + 1)
    // Each axis direction uses its own alpha weight
    // ==========================================================================

    // Right: (k, 0) uses alpha_right
    setTcurr(k, 0, (Tprev(k, 0) + alpha_right * Tprev(k-1, 0)) / (alpha_right + mp_real(1)));
    // Left: (-k, 0) uses alpha_left
    setTcurr(-k, 0, (Tprev(-k, 0) + alpha_left * Tprev(-(k-1), 0)) / (alpha_left + mp_real(1)));
    // Top: (0, k) uses alpha_top
    setTcurr(0, k, (Tprev(0, k) + alpha_top * Tprev(0, k-1)) / (alpha_top + mp_real(1)));
    // Bottom: (0, -k) uses alpha_bottom
    setTcurr(0, -k, (Tprev(0, -k) + alpha_bottom * Tprev(0, -(k-1))) / (alpha_bottom + mp_real(1)));

    // ==========================================================================
    // Rule 3: Beta vertices (diagonal boundary at |i|+|j|=k, off-axis)
    // T_k(j, k-j) = 1/(β+1) * (T_{k-1}(j-1, k-j) + β * T_{k-1}(j, k-j-1))
    // For j = 1, 2, ..., k-1 (positive j quadrants)
    // Each diagonal vertex uses its own beta weight from stored face weights
    // ==========================================================================

    // Helper lambda to get beta weight for position (i, j)
    // First check beta edge ratios (from double edges), then fall back to stored face weights
    // Applies inversion for even k if flag is set
    auto getBetaWeight = [&](int i, int j) -> mp_real {
        mp_real beta = mp_real(1);  // Default

        // First check beta edge ratios (from double edges)
        bool found = false;
        for (const auto& ber : g_betaEdgeRatios) {
            if (ber.k == k) {
                auto it = ber.ratios.find({i, j});
                if (it != ber.ratios.end()) {
                    beta = it->second;
                    found = true;
                    break;
                }
            }
        }
        // Fall back to stored face weights
        if (!found && storedWeights) {
            auto it = storedWeights->beta.find({i, j});
            if (it != storedWeights->beta.end() && it->second > 0) {
                beta = it->second;
            }
        }

        return beta;
    };

    for (int j = 1; j <= k - 1; j++) {
        int kj = k - j;  // So (j, kj) has |j| + |kj| = k

        // Upper-right quadrant: (j, k-j) where j > 0, k-j > 0
        {
            mp_real beta_ij = getBetaWeight(j, kj);
            if (g_betaSwapUR) {
                setTcurr(j, kj, (beta_ij * Tprev(j-1, kj) + Tprev(j, kj-1)) / (beta_ij + mp_real(1)));
            } else {
                setTcurr(j, kj, (Tprev(j-1, kj) + beta_ij * Tprev(j, kj-1)) / (beta_ij + mp_real(1)));
            }
        }

        // Lower-right quadrant: (j, -(k-j)) where j > 0, k-j > 0
        {
            mp_real beta_ij = getBetaWeight(j, -kj);
            if (g_betaSwapLR) {
                setTcurr(j, -kj, (beta_ij * Tprev(j-1, -kj) + Tprev(j, -(kj-1))) / (beta_ij + mp_real(1)));
            } else {
                setTcurr(j, -kj, (Tprev(j-1, -kj) + beta_ij * Tprev(j, -(kj-1))) / (beta_ij + mp_real(1)));
            }
        }
    }

    for (int j = 1; j <= k - 1; j++) {
        int kj = k - j;

        // Upper-left quadrant: (-j, k-j) where j > 0, k-j > 0
        {
            mp_real beta_ij = getBetaWeight(-j, kj);
            if (g_betaSwapUL) {
                setTcurr(-j, kj, (Tprev(-(j-1), kj) + beta_ij * Tprev(-j, kj-1)) / (beta_ij + mp_real(1)));
            } else {
                setTcurr(-j, kj, (beta_ij * Tprev(-(j-1), kj) + Tprev(-j, kj-1)) / (beta_ij + mp_real(1)));
            }
        }

        // Lower-left quadrant: (-j, -(k-j)) where j > 0, k-j > 0
        {
            mp_real beta_ij = getBetaWeight(-j, -kj);
            if (g_betaSwapLL) {
                setTcurr(-j, -kj, (beta_ij * Tprev(-j, -(kj-1)) + Tprev(-(j-1), -kj)) / (beta_ij + mp_real(1)));
            } else {
                setTcurr(-j, -kj, (Tprev(-j, -(kj-1)) + beta_ij * Tprev(-(j-1), -kj)) / (beta_ij + mp_real(1)));
            }
        }
    }

    // ==========================================================================
    // Rule 4a: Interior pass-through (|i|+|j| < k, i+j+k even)
    // T_k(i,j) = T_{k-1}(i,j)
    // ==========================================================================
    for (int i = -(k-1); i <= k-1; i++) {
        for (int j = -(k-1); j <= k-1; j++) {
            if (std::abs(i) + std::abs(j) >= k) continue;  // Not interior
            if ((i + j + k) % 2 != 0) continue;  // Not even parity (handled in 4b)

            // Check if exists in T_{k-1}
            if (Tprev_exists[idx(i, j)]) {
                setTcurr(i, j, Tprev(i, j));
            }
        }
    }

    // ==========================================================================
    // Rule 4b: Interior recurrence (|i|+|j| < k, i+j+k odd)
    // T_k(i,j) = 1/(γ+1) * (T_k(i-1,j) + T_k(i+1,j) + γ*(T_k(i,j+1) + T_k(i,j-1))) - T_{k-1}(i,j)
    // Note: neighbors are already computed via 4a (even parity) or boundary rules
    // Each interior vertex uses its own gamma weight from stored face weights
    // ==========================================================================

    // Helper lambda to get gamma weight for position (i, j)
    auto getGammaWeight = [&](int i, int j) -> mp_real {
        if (storedWeights) {
            auto it = storedWeights->gamma.find({i, j});
            if (it != storedWeights->gamma.end() && it->second > 0) {
                return it->second;
            }
        }
        return mp_real(1);  // Default
    };

    for (int i = -(k-1); i <= k-1; i++) {
        for (int j = -(k-1); j <= k-1; j++) {
            if (std::abs(i) + std::abs(j) >= k) continue;  // Not interior
            if ((i + j + k) % 2 == 0) continue;  // Not odd parity (handled in 4a)

            mp_real gamma = getGammaWeight(i, j);

            // Get neighbors (should all exist by now from Rule 4a or boundary rules)
            mp_complex Tl = Tcurr(i-1, j);  // left
            mp_complex Tr = Tcurr(i+1, j);  // right
            mp_complex Tt = Tcurr(i, j+1);  // top
            mp_complex Tb = Tcurr(i, j-1);  // bottom

            // T_{k-1}(i,j) - should exist for interior vertices
            mp_complex Tprev_ij = Tprev_exists[idx(i, j)] ? Tprev(i, j) : mp_complex(0, 0);

            // Recurrence: T_k(i,j) = (Tl + Tr + γ*(Tt + Tb)) / (γ + 1) - T_{k-1}(i,j)
            setTcurr(i, j, ((Tl + Tr) * gamma + (Tt + Tb)) / (gamma + mp_real(1)) - Tprev_ij);
        }
    }

    // ==========================================================================
    // Convert flat array to TembLevel vertices (convert from 100-digit to double for storage)
    // ==========================================================================
    for (int i = -(k+1); i <= k+1; i++) {
        for (int j = -(k+1); j <= k+1; j++) {
            if (Tcurr_set[idx(i, j)]) {
                TembVertex v;
                v.i = i;
                v.j = j;
                v.re = static_cast<double>(Tcurr_vec[idx(i, j)].real());
                v.im = static_cast<double>(Tcurr_vec[idx(i, j)].imag());
                tk.vertices.push_back(v);
            }
        }
    }

    // Store the level
    g_tembLevels.push_back(tk);

}

// =============================================================================
// T-EMBEDDING VERIFICATION
// =============================================================================
// Verify T_k by checking face weight formula for all faces at level k:
// X_f = (-1)^{d+1} * prod_{s=1}^{d} (T(center) - T(v_{2s-1})) / (T(v_{2s}) - T(center))
// For degree-4 faces (d=2): X = -1 * (T_c - T_1)/(T_2 - T_c) * (T_c - T_3)/(T_4 - T_c)
// IMPORTANT: Neighbors must be actual T_k graph neighbors, NOT grid neighbors!

// Build T_k edge list
static std::vector<std::pair<std::pair<int,int>, std::pair<int,int>>> buildTkEdges(int k) {
    std::vector<std::pair<std::pair<int,int>, std::pair<int,int>>> edges;

    // 1. Interior lattice edges: connect (i,j) to (i+1,j) and (i,j+1) when both have |i|+|j| <= k
    for (int i = -k; i <= k; i++) {
        for (int j = -k; j <= k; j++) {
            int absSum = std::abs(i) + std::abs(j);
            if (absSum > k) continue;

            // Right neighbor
            int ni = i + 1, nj = j;
            int nAbsSum = std::abs(ni) + std::abs(nj);
            if (nAbsSum <= k) {
                edges.push_back({{i, j}, {ni, nj}});
            }

            // Top neighbor
            ni = i; nj = j + 1;
            nAbsSum = std::abs(ni) + std::abs(nj);
            if (nAbsSum <= k) {
                edges.push_back({{i, j}, {ni, nj}});
            }
        }
    }

    // 2. External corners to alpha vertices
    edges.push_back({{k+1, 0}, {k, 0}});
    edges.push_back({{-(k+1), 0}, {-k, 0}});
    edges.push_back({{0, k+1}, {0, k}});
    edges.push_back({{0, -(k+1)}, {0, -k}});

    // 3. Boundary rhombus (connects external corners)
    edges.push_back({{k+1, 0}, {0, k+1}});
    edges.push_back({{0, k+1}, {-(k+1), 0}});
    edges.push_back({{-(k+1), 0}, {0, -(k+1)}});
    edges.push_back({{0, -(k+1)}, {k+1, 0}});

    // 4. Diagonal boundary edges
    for (int s = 0; s < k; s++) {
        // Right-top: (k-s, s) - (k-s-1, s+1)
        edges.push_back({{k-s, s}, {k-s-1, s+1}});
        // Left-top: (-s, k-s) - (-(s+1), k-s-1)
        edges.push_back({{-s, k-s}, {-(s+1), k-s-1}});
        // Left-bottom: (-(k-s), -s) - (-(k-s-1), -(s+1))
        edges.push_back({{-(k-s), -s}, {-(k-s-1), -(s+1)}});
        // Right-bottom: (s, -(k-s)) - (s+1, -(k-s-1))
        edges.push_back({{s, -(k-s)}, {s+1, -(k-s-1)}});
    }

    return edges;
}

// Get neighbors of vertex (i,j) in T_k graph, sorted CCW by angle in the T-embedded plane
static std::vector<std::pair<int,int>> getTkNeighborsCCW(
    int i, int j, int k,
    const std::vector<std::pair<std::pair<int,int>, std::pair<int,int>>>& edges,
    const std::map<std::pair<int,int>, std::complex<double>>& T
) {
    std::vector<std::pair<int,int>> neighbors;

    // Find all neighbors from edge list
    for (const auto& e : edges) {
        if (e.first.first == i && e.first.second == j) {
            neighbors.push_back(e.second);
        } else if (e.second.first == i && e.second.second == j) {
            neighbors.push_back(e.first);
        }
    }

    // Sort by angle in the T-embedded plane (CCW from positive real axis)
    std::complex<double> Tc = T.at({i, j});
    std::sort(neighbors.begin(), neighbors.end(), [&](const std::pair<int,int>& a, const std::pair<int,int>& b) {
        std::complex<double> Ta = T.at(a);
        std::complex<double> Tb = T.at(b);
        double angleA = std::arg(Ta - Tc);
        double angleB = std::arg(Tb - Tc);
        return angleA < angleB;
    });

    return neighbors;
}

static void verifyTk(int k) {
    // Verification logic - no longer outputs to console
    (void)k;  // Suppress unused parameter warning
}

// Compute all T_k levels from 0 to maxK
static void computeAllTembLevels(int maxK) {
    // First compute T_0
    computeT0();

    // Then compute T_1, T_2, ..., T_maxK using recurrence
    for (int k = 1; k <= maxK; k++) {
        computeTk(k);
    }
}

// =============================================================================
// ORIGAMI MAP COMPUTATION
// =============================================================================
// The origami map uses the SAME recurrence rules as T-embedding but with
// DIFFERENT initial conditions (see Berggren-Russkikh Proposition):
// O_0(0,0) = 0
// O_0(1,0) = 1, O_0(-1,0) = 1    (note: NOT -1 like T-embedding!)
// O_0(0,1) = i/sqrt(X_ROOT), O_0(0,-1) = i/sqrt(X_ROOT)  (note: NOT -i/sqrt!)

// Compute O_0 using ROOT weight (origami map base case)
static void computeO0() {
    // Find k=0 stored weights
    mp_real rootWeight = 1;
    for (const auto& sw : g_storedWeights) {
        if (sw.k == 0) {
            rootWeight = sw.root;
            break;
        }
    }

    TembLevel o0;
    o0.k = 0;

    // Center vertex (same as T-embedding)
    o0.vertices.push_back({0, 0, 0.0, 0.0});

    // Boundary vertices on real axis: BOTH are 1 (different from T-embedding!)
    o0.vertices.push_back({1, 0, 1.0, 0.0});
    o0.vertices.push_back({-1, 0, 1.0, 0.0});  // Note: 1.0, not -1.0!

    // Boundary vertices on imaginary axis: BOTH are +i/sqrt(X_ROOT)
    double invSqrtRoot = 1.0 / std::sqrt(static_cast<double>(rootWeight));
    o0.vertices.push_back({0, 1, 0.0, invSqrtRoot});
    o0.vertices.push_back({0, -1, 0.0, invSqrtRoot});  // Note: +invSqrtRoot, not -invSqrtRoot!

    // Store or update O_0
    bool found = false;
    for (auto& level : g_origamiLevels) {
        if (level.k == 0) {
            level = o0;
            found = true;
            break;
        }
    }
    if (!found) {
        g_origamiLevels.push_back(o0);
    }
}

// Compute O_k from O_{k-1} using the same recurrence as T-embedding
static void computeOk(int k) {
    if (k < 1) return;  // O_0 is computed separately

    // Check if already computed
    for (const auto& level : g_origamiLevels) {
        if (level.k == k) return;  // Already exists
    }

    // Find O_{k-1}
    const TembLevel* prevLevel = nullptr;
    for (const auto& l : g_origamiLevels) {
        if (l.k == k - 1) {
            prevLevel = &l;
            break;
        }
    }

    if (!prevLevel) {
        computeOk(k - 1);
        for (const auto& l : g_origamiLevels) {
            if (l.k == k - 1) {
                prevLevel = &l;
                break;
            }
        }
    }

    if (!prevLevel) {
        std::printf("computeOk(%d): ERROR - could not find O_{%d}\n", k, k-1);
        return;
    }

    // Find stored face weights for level k
    const StoredFaceWeights* storedWeights = nullptr;
    for (const auto& sw : g_storedWeights) {
        if (sw.k == k) {
            storedWeights = &sw;
            break;
        }
    }

    // Get alpha values from double edge ratios (same as T-embedding)
    mp_real alpha_right = 1, alpha_left = 1, alpha_top = 1, alpha_bottom = 1;

    for (const auto& der : g_doubleEdgeRatios) {
        if (der.k == k) {
            alpha_right = der.ratio_right;
            alpha_left = der.ratio_left;
            alpha_top = der.ratio_top;
            alpha_bottom = der.ratio_bottom;
            break;
        }
    }

    TembLevel ok;
    ok.k = k;

    // Use flat arrays for O(1) lookup instead of O(log n) maps
    int dim = 2 * k + 5;
    int offset = k + 2;
    auto idx = [dim, offset](int i, int j) { return (i + offset) * dim + (j + offset); };

    // Flat arrays for O_{k-1}
    std::vector<mp_complex> Oprev_vec(dim * dim, mp_complex(0, 0));
    std::vector<bool> Oprev_exists(dim * dim, false);

    // Populate Oprev from prevLevel
    for (const auto& v : prevLevel->vertices) {
        int index = idx(v.i, v.j);
        Oprev_vec[index] = mp_complex(mp_real(v.re), mp_real(v.im));
        Oprev_exists[index] = true;
    }

    // Flat arrays for O_k
    std::vector<mp_complex> Ocurr_vec(dim * dim, mp_complex(0, 0));
    std::vector<bool> Ocurr_set(dim * dim, false);

    // Helper lambdas for cleaner access
    auto Oprev = [&](int i, int j) -> mp_complex { return Oprev_vec[idx(i, j)]; };
    auto setOcurr = [&](int i, int j, const mp_complex& val) {
        int index = idx(i, j);
        Ocurr_vec[index] = val;
        Ocurr_set[index] = true;
    };
    auto Ocurr = [&](int i, int j) -> mp_complex { return Ocurr_vec[idx(i, j)]; };

    // Rule 1: External corners
    setOcurr(k+1, 0, Oprev(k, 0));
    setOcurr(-(k+1), 0, Oprev(-k, 0));
    setOcurr(0, k+1, Oprev(0, k));
    setOcurr(0, -(k+1), Oprev(0, -k));

    // Rule 2: Alpha vertices (same formulas as T-embedding)
    setOcurr(k, 0, (Oprev(k, 0) + alpha_right * Oprev(k-1, 0)) / (alpha_right + mp_real(1)));
    setOcurr(-k, 0, (Oprev(-k, 0) + alpha_left * Oprev(-(k-1), 0)) / (alpha_left + mp_real(1)));
    setOcurr(0, k, (Oprev(0, k) + alpha_top * Oprev(0, k-1)) / (alpha_top + mp_real(1)));
    setOcurr(0, -k, (Oprev(0, -k) + alpha_bottom * Oprev(0, -(k-1))) / (alpha_bottom + mp_real(1)));

    // Helper lambda to get beta weight for position (i, j) - same as T-embedding
    auto getBetaWeight = [&](int i, int j) -> mp_real {
        mp_real beta = mp_real(1);

        bool found = false;
        for (const auto& ber : g_betaEdgeRatios) {
            if (ber.k == k) {
                auto it = ber.ratios.find({i, j});
                if (it != ber.ratios.end()) {
                    beta = it->second;
                    found = true;
                    break;
                }
            }
        }
        if (!found && storedWeights) {
            auto it = storedWeights->beta.find({i, j});
            if (it != storedWeights->beta.end() && it->second > 0) {
                beta = it->second;
            }
        }

        return beta;
    };

    // Rule 3: Beta vertices (same formulas as T-embedding)
    for (int j = 1; j <= k - 1; j++) {
        int kj = k - j;

        // Upper-right quadrant
        {
            mp_real beta_ij = getBetaWeight(j, kj);
            if (g_betaSwapUR) {
                setOcurr(j, kj, (beta_ij * Oprev(j-1, kj) + Oprev(j, kj-1)) / (beta_ij + mp_real(1)));
            } else {
                setOcurr(j, kj, (Oprev(j-1, kj) + beta_ij * Oprev(j, kj-1)) / (beta_ij + mp_real(1)));
            }
        }

        // Lower-right quadrant
        {
            mp_real beta_ij = getBetaWeight(j, -kj);
            if (g_betaSwapLR) {
                setOcurr(j, -kj, (beta_ij * Oprev(j-1, -kj) + Oprev(j, -(kj-1))) / (beta_ij + mp_real(1)));
            } else {
                setOcurr(j, -kj, (Oprev(j-1, -kj) + beta_ij * Oprev(j, -(kj-1))) / (beta_ij + mp_real(1)));
            }
        }
    }

    for (int j = 1; j <= k - 1; j++) {
        int kj = k - j;

        // Upper-left quadrant
        {
            mp_real beta_ij = getBetaWeight(-j, kj);
            if (g_betaSwapUL) {
                setOcurr(-j, kj, (Oprev(-(j-1), kj) + beta_ij * Oprev(-j, kj-1)) / (beta_ij + mp_real(1)));
            } else {
                setOcurr(-j, kj, (beta_ij * Oprev(-(j-1), kj) + Oprev(-j, kj-1)) / (beta_ij + mp_real(1)));
            }
        }

        // Lower-left quadrant
        {
            mp_real beta_ij = getBetaWeight(-j, -kj);
            if (g_betaSwapLL) {
                setOcurr(-j, -kj, (beta_ij * Oprev(-j, -(kj-1)) + Oprev(-(j-1), -kj)) / (beta_ij + mp_real(1)));
            } else {
                setOcurr(-j, -kj, (Oprev(-j, -(kj-1)) + beta_ij * Oprev(-(j-1), -kj)) / (beta_ij + mp_real(1)));
            }
        }
    }

    // Rule 4a: Interior pass-through
    for (int i = -(k-1); i <= k-1; i++) {
        for (int j = -(k-1); j <= k-1; j++) {
            if (std::abs(i) + std::abs(j) >= k) continue;
            if ((i + j + k) % 2 != 0) continue;

            if (Oprev_exists[idx(i, j)]) {
                setOcurr(i, j, Oprev(i, j));
            }
        }
    }

    // Rule 4b: Interior recurrence
    // Get gamma weights helper
    auto getGammaWeight = [&](int i, int j) -> mp_real {
        if (storedWeights) {
            auto it = storedWeights->gamma.find({i, j});
            if (it != storedWeights->gamma.end() && it->second > 0) {
                return it->second;
            }
        }
        return mp_real(1);
    };

    for (int i = -(k-1); i <= k-1; i++) {
        for (int j = -(k-1); j <= k-1; j++) {
            if (std::abs(i) + std::abs(j) >= k) continue;
            if ((i + j + k) % 2 == 0) continue;  // Skip even parity

            mp_real gamma = getGammaWeight(i, j);

            // Get neighbors from O_k (already computed via pass-through or boundary)
            mp_complex O_left = Ocurr(i-1, j);
            mp_complex O_right = Ocurr(i+1, j);
            mp_complex O_down = Ocurr(i, j-1);
            mp_complex O_up = Ocurr(i, j+1);

            // Get O_{k-1}(i,j) if it exists
            mp_complex O_prev_ij = Oprev_exists[idx(i, j)] ? Oprev(i, j) : mp_complex(0, 0);

            // Interior recurrence formula (same as T-embedding)
            setOcurr(i, j, (gamma * (O_left + O_right) + O_down + O_up) / (gamma + mp_real(1)) - O_prev_ij);
        }
    }

    // Store vertices from flat array
    for (int i = -(k+1); i <= k+1; i++) {
        for (int j = -(k+1); j <= k+1; j++) {
            if (Ocurr_set[idx(i, j)]) {
                TembVertex v;
                v.i = i;
                v.j = j;
                v.re = static_cast<double>(Ocurr_vec[idx(i, j)].real());
                v.im = static_cast<double>(Ocurr_vec[idx(i, j)].imag());
                ok.vertices.push_back(v);
            }
        }
    }

    g_origamiLevels.push_back(ok);
}

// Compute all O_k levels from 0 to maxK
static void computeAllOrigamiLevels(int maxK) {
    computeO0();
    for (int k = 1; k <= maxK; k++) {
        computeOk(k);
    }
}

// Get origami map JSON for a specific level (internal function)
static std::string getOrigamiLevelJSONInternal(int k) {
    // Ensure O_k is computed
    bool found = false;
    for (const auto& l : g_origamiLevels) {
        if (l.k == k) {
            found = true;
            break;
        }
    }

    // If not found, compute from O_0 up to O_k
    if (!found) {
        g_origamiLevels.clear();
        computeO0();
        for (int level = 1; level <= k; level++) {
            computeOk(level);
        }
    }

    std::ostringstream oss;
    oss << std::setprecision(15);
    oss << "{\"k\":" << k;

    // Find the level
    const TembLevel* level = nullptr;
    for (const auto& l : g_origamiLevels) {
        if (l.k == k) {
            level = &l;
            break;
        }
    }

    if (level) {
        oss << ",\"vertices\":[";
        for (size_t i = 0; i < level->vertices.size(); i++) {
            if (i > 0) oss << ",";
            const auto& v = level->vertices[i];
            oss << "{\"i\":" << v.i << ",\"j\":" << v.j
                << ",\"re\":" << v.re << ",\"im\":" << v.im << "}";
        }
        oss << "]";
    } else {
        oss << ",\"vertices\":[]";
    }

    oss << "}";
    return oss.str();
}

// Get T-embedding JSON for a specific level
static std::string getTembLevelJSON(int k) {
    // Ensure T_k is computed
    // First check if it exists
    bool found = false;
    for (const auto& l : g_tembLevels) {
        if (l.k == k) {
            found = true;
            break;
        }
    }

    // If not found, compute from T_0 up to T_k
    if (!found) {
        // Clear and recompute all levels up to k
        g_tembLevels.clear();
        computeT0();
        for (int level = 1; level <= k; level++) {
            computeTk(level);
        }
    }

    // Always verify when accessing a level
    if (k == 0) {
        verifyT0();  // Output verification to console
    } else {
        verifyTk(k);  // Verify T-embedding for requested level
    }

    std::ostringstream oss;
    oss << std::setprecision(15);
    oss << "{\"k\":" << k;

    // Find the level
    const TembLevel* level = nullptr;
    for (const auto& l : g_tembLevels) {
        if (l.k == k) {
            level = &l;
            break;
        }
    }

    if (level) {
        oss << ",\"vertices\":[";
        for (size_t i = 0; i < level->vertices.size(); i++) {
            if (i > 0) oss << ",";
            const auto& v = level->vertices[i];
            oss << "{\"i\":" << v.i << ",\"j\":" << v.j
                << ",\"re\":" << v.re << ",\"im\":" << v.im << "}";
        }
        oss << "]";
    } else {
        oss << ",\"vertices\":[]";
    }

    oss << "}";
    return oss.str();
}

// Find the edge connecting two vertices (returns edge index or -1)
// Uses global adjacency cache g_adj for O(degree) lookup instead of O(E)
static int findEdge(int v1, int v2) {
    if (v1 < 0 || v1 >= (int)g_adj.size()) return -1;
    for (int eIdx : g_adj[v1]) {
        const auto& e = g_aztecEdges[eIdx];
        if ((e.v1 == v1 && e.v2 == v2) || (e.v1 == v2 && e.v2 == v1))
            return eIdx;
    }
    return -1;
}

// Compute angle from vertex v1 to vertex v2
static double edgeAngle(int v1, int v2) {
    double dx = g_aztecVertices[v2].x - g_aztecVertices[v1].x;
    double dy = g_aztecVertices[v2].y - g_aztecVertices[v1].y;
    return std::atan2(dy, dx);
}

// Find all faces using half-edge traversal
static void computeFaces() {
    g_aztecFaces.clear();
    if (g_aztecVertices.empty() || g_aztecEdges.empty()) return;

    int nV = (int)g_aztecVertices.size();
    int nE = (int)g_aztecEdges.size();

    // Build adjacency: adj[v] = list of (angle, neighbor_vertex, edge_index)
    std::vector<std::vector<std::tuple<double, int, int>>> adj(nV);
    for (int ei = 0; ei < nE; ei++) {
        int u = g_aztecEdges[ei].v1;
        int v = g_aztecEdges[ei].v2;
        double dx_uv = g_aztecVertices[v].x - g_aztecVertices[u].x;
        double dy_uv = g_aztecVertices[v].y - g_aztecVertices[u].y;
        double dx_vu = -dx_uv, dy_vu = -dy_uv;
        adj[u].push_back({std::atan2(dy_uv, dx_uv), v, ei});
        adj[v].push_back({std::atan2(dy_vu, dx_vu), u, ei});
    }
    for (int v = 0; v < nV; v++) {
        std::sort(adj[v].begin(), adj[v].end());
    }

    // For half-edge (u->v), find next half-edge (v->w) in CCW order around face
    std::map<std::pair<int,int>, std::pair<int,int>> nextHE;
    for (int v = 0; v < nV; v++) {
        int deg = (int)adj[v].size();
        for (int i = 0; i < deg; i++) {
            int u = std::get<1>(adj[v][i]);  // outgoing edge v->u at position i
            // Half-edge (u->v): next is (v -> adj[v][(i+1) % deg])
            int nextNeighbor = std::get<1>(adj[v][(i + 1) % deg]);
            nextHE[{u, v}] = {v, nextNeighbor};
        }
    }

    // Edge index lookup
    auto findEdgeIdx = [&](int u, int v) -> int {
        for (int ei = 0; ei < nE; ei++) {
            if ((g_aztecEdges[ei].v1 == u && g_aztecEdges[ei].v2 == v) ||
                (g_aztecEdges[ei].v1 == v && g_aztecEdges[ei].v2 == u)) return ei;
        }
        return -1;
    };

    std::set<std::pair<int,int>> visited;

    for (int ei = 0; ei < nE; ei++) {
        for (int dir = 0; dir < 2; dir++) {
            int startU = (dir == 0) ? g_aztecEdges[ei].v1 : g_aztecEdges[ei].v2;
            int startV = (dir == 0) ? g_aztecEdges[ei].v2 : g_aztecEdges[ei].v1;
            if (visited.count({startU, startV})) continue;

            std::vector<int> faceV, faceE;
            int curU = startU, curV = startV;

            for (int iter = 0; iter < (int)g_aztecVertices.size() + 10; iter++) {
                if (visited.count({curU, curV})) break;
                visited.insert({curU, curV});
                faceV.push_back(curU);
                int edgeIdx = findEdgeIdx(curU, curV);
                if (edgeIdx >= 0) faceE.push_back(edgeIdx);

                auto it = nextHE.find({curU, curV});
                if (it == nextHE.end()) break;
                curU = it->second.first;
                curV = it->second.second;
                if (curU == startU && curV == startV) break;
            }

            if (faceV.size() >= 3 && faceE.size() >= 3) {
                // Compute signed area to determine orientation
                double signedArea = 0;
                int nv = (int)faceV.size();
                for (int i = 0; i < nv; i++) {
                    int j = (i + 1) % nv;
                    double xi = g_aztecVertices[faceV[i]].x;
                    double yi = g_aztecVertices[faceV[i]].y;
                    double xj = g_aztecVertices[faceV[j]].x;
                    double yj = g_aztecVertices[faceV[j]].y;
                    signedArea += (xi * yj - xj * yi);
                }
                signedArea *= 0.5;

                // Keep only CW faces (negative area) - these are inner faces
                // Skip CCW faces (positive area) - outer boundary or duplicates
                if (signedArea > 0) continue;

                // Compute centroid
                double cx = 0, cy = 0;
                for (int vi : faceV) {
                    cx += g_aztecVertices[vi].x;
                    cy += g_aztecVertices[vi].y;
                }
                cx /= faceV.size();
                cy /= faceV.size();

                // Compute face weight (cross-ratio) in LOG SPACE
                // weight = product of (wt1/wt2) = exp(sum of (logWt1 - logWt2))
                mp_real logWeight = 0;  // log(1) = 0
                int n = (int)faceV.size();

                if (n >= 4 && n % 2 == 0) {
                    // Find first white vertex
                    int startIdx = 0;
                    for (int i = 0; i < n; i++) {
                        if (g_aztecVertices[faceV[i]].isWhite) { startIdx = i; break; }
                    }
                    std::vector<int> ordV(n);
                    for (int i = 0; i < n; i++) ordV[i] = faceV[(startIdx + i) % n];

                    int d = n / 2;
                    for (int s = 0; s < d; s++) {
                        int ws = ordV[2*s], bs = ordV[2*s+1], wnext = ordV[(2*s+2) % n];
                        mp_real logWt1 = 0, logWt2 = 0;  // log(1) = 0 as default
                        for (int e = 0; e < nE; e++) {
                            int a = g_aztecEdges[e].v1, b = g_aztecEdges[e].v2;
                            if ((a==ws && b==bs) || (a==bs && b==ws)) logWt1 = g_aztecEdges[e].logWeight;
                            if ((a==wnext && b==bs) || (a==bs && b==wnext)) logWt2 = g_aztecEdges[e].logWeight;
                        }
                        // In log space: multiply by ratio = add log(ratio) = add (logWt1 - logWt2)
                        logWeight += logWt1 - logWt2;
                    }
                }
                // Convert back to actual weight for storage
                mp_real weight = exp(logWeight);

                AztecFace face;
                face.vertexIndices = faceV;
                face.edgeIndices = faceE;
                face.cx = cx;
                face.cy = cy;
                face.weight = weight;
                g_aztecFaces.push_back(face);
            }
        }
    }
}

// Generate JSON string for faces
static std::string getFacesJSON() {
    computeFaces();
    tryCaptureFaceWeights();  // Capture if face count matches 2k²+2k+1

    std::ostringstream oss;
    oss << std::setprecision(15);
    oss << "[";

    for (size_t i = 0; i < g_aztecFaces.size(); i++) {
        if (i > 0) oss << ",";
        const AztecFace& f = g_aztecFaces[i];

        // Determine face type based on first vertex color
        bool isTypeA = !g_aztecFaces.empty() &&
                       f.vertexIndices.size() > 0 &&
                       g_aztecVertices[f.vertexIndices[0]].isWhite;

        // Compute spatial indices from centroid (round to nearest integer)
        int fi = (int)std::round(f.cx);
        int fj = (int)std::round(f.cy);

        oss << "{\"idx\":" << i
            << ",\"step\":" << g_aztecReductionStep
            << ",\"n\":" << g_aztecLevel
            << ",\"fi\":" << fi
            << ",\"fj\":" << fj
            << ",\"cx\":" << f.cx
            << ",\"cy\":" << f.cy
            << ",\"weight\":" << f.weight
            << ",\"numVertices\":" << f.vertexIndices.size()
            << ",\"isTypeA\":" << (isTypeA ? "true" : "false")
            << ",\"vertices\":[";


        for (size_t j = 0; j < f.vertexIndices.size(); j++) {
            if (j > 0) oss << ",";
            oss << f.vertexIndices[j];
        }
        oss << "]}";
    }

    oss << "]";
    return oss.str();
}

// Generate JSON for stored face weights
static std::string getStoredWeightsJSON() {
    std::ostringstream oss;
    oss << std::setprecision(15);
    oss << "{";
    oss << "\"capturedLevels\":[";

    bool first = true;
    for (const auto& sw : g_storedWeights) {
        if (!first) oss << ",";
        first = false;

        oss << "{\"k\":" << sw.k;

        if (sw.k == 0) {
            oss << ",\"root\":" << sw.root;
        } else {
            oss << ",\"alpha_top\":" << sw.alpha_top;
            oss << ",\"alpha_bottom\":" << sw.alpha_bottom;
            oss << ",\"alpha_left\":" << sw.alpha_left;
            oss << ",\"alpha_right\":" << sw.alpha_right;

            // Beta weights
            oss << ",\"beta\":[";
            bool firstBeta = true;
            for (const auto& kv : sw.beta) {
                if (!firstBeta) oss << ",";
                firstBeta = false;
                oss << "{\"i\":" << kv.first.first
                    << ",\"j\":" << kv.first.second
                    << ",\"weight\":" << kv.second << "}";
            }
            oss << "]";

            // Gamma weights
            oss << ",\"gamma\":[";
            bool firstGamma = true;
            for (const auto& kv : sw.gamma) {
                if (!firstGamma) oss << ",";
                firstGamma = false;
                oss << "{\"i\":" << kv.first.first
                    << ",\"j\":" << kv.first.second
                    << ",\"weight\":" << kv.second << "}";
            }
            oss << "]";
        }

        oss << "}";
    }

    oss << "]";

    // Add double edge ratios with numerator/denominator
    oss << ",\"doubleEdgeRatios\":[";
    first = true;
    for (const auto& der : g_doubleEdgeRatios) {
        if (!first) oss << ",";
        first = false;
        oss << "{\"k\":" << der.k;
        oss << ",\"top\":{\"num\":" << der.num_top << ",\"den\":" << der.den_top << ",\"ratio\":" << der.ratio_top << "}";
        oss << ",\"bottom\":{\"num\":" << der.num_bottom << ",\"den\":" << der.den_bottom << ",\"ratio\":" << der.ratio_bottom << "}";
        oss << ",\"left\":{\"num\":" << der.num_left << ",\"den\":" << der.den_left << ",\"ratio\":" << der.ratio_left << "}";
        oss << ",\"right\":{\"num\":" << der.num_right << ",\"den\":" << der.den_right << ",\"ratio\":" << der.ratio_right << "}";
        oss << "}";
    }
    oss << "]";

    // Add beta edge ratios with numerator/denominator
    oss << ",\"betaEdgeRatios\":[";
    first = true;
    for (const auto& ber : g_betaEdgeRatios) {
        if (!first) oss << ",";
        first = false;
        oss << "{\"k\":" << ber.k << ",\"ratios\":[";
        bool firstRatio = true;
        for (const auto& [pos, ratio] : ber.ratios) {
            if (!firstRatio) oss << ",";
            firstRatio = false;
            auto numIt = ber.numerators.find(pos);
            auto denIt = ber.denominators.find(pos);
            mp_real num = (numIt != ber.numerators.end()) ? numIt->second : mp_real(1);
            mp_real den = (denIt != ber.denominators.end()) ? denIt->second : mp_real(1);
            oss << "{\"i\":" << pos.first << ",\"j\":" << pos.second
                << ",\"num\":" << num << ",\"den\":" << den << ",\"ratio\":" << ratio << "}";
        }
        oss << "]}";
    }
    oss << "]";

    oss << "}";
    return oss.str();
}

// Generate JSON for Aztec graph
static std::string getAztecGraphJSONInternal() {
    std::ostringstream oss;
    oss << std::setprecision(15);
    oss << "{";
    oss << "\"level\":" << g_aztecLevel;
    oss << ",\"reductionStep\":" << g_aztecReductionStep;

    // Build vertex index remapping (old index -> new compact index)
    std::vector<int> vertexRemap(g_aztecVertices.size(), -1);
    int newVertexIdx = 0;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        if (g_aztecVertices[i].active) {
            vertexRemap[i] = newVertexIdx++;
        }
    }

    // Output only active vertices
    oss << ",\"vertices\":[";
    bool firstVertex = true;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        if (!g_aztecVertices[i].active) continue;
        if (!firstVertex) oss << ",";
        firstVertex = false;
        oss << "{\"x\":" << g_aztecVertices[i].x
            << ",\"y\":" << g_aztecVertices[i].y
            << ",\"isWhite\":" << (g_aztecVertices[i].isWhite ? "true" : "false")
            << ",\"inVgauge\":" << (g_aztecVertices[i].inVgauge ? "true" : "false")
            << ",\"toContract\":" << (g_aztecVertices[i].toContract ? "true" : "false")
            << "}";
    }
    oss << "]";

    // Output only active edges with remapped vertex indices
    oss << ",\"edges\":[";
    bool firstEdge = true;
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        if (!g_aztecEdges[i].active) continue;
        int v1 = g_aztecEdges[i].v1;
        int v2 = g_aztecEdges[i].v2;
        // Skip edges with inactive endpoints
        if (v1 < 0 || v1 >= (int)vertexRemap.size() || vertexRemap[v1] < 0) continue;
        if (v2 < 0 || v2 >= (int)vertexRemap.size() || vertexRemap[v2] < 0) continue;
        if (!firstEdge) oss << ",";
        firstEdge = false;
        oss << "{\"v1\":" << vertexRemap[v1]
            << ",\"v2\":" << vertexRemap[v2]
            << ",\"weight\":" << g_aztecEdges[i].weight()  // Convert from log space
            << ",\"isHorizontal\":" << (g_aztecEdges[i].isHorizontal ? "true" : "false")
            << ",\"gaugeTransformed\":" << (g_aztecEdges[i].gaugeTransformed ? "true" : "false")
            << "}";
    }
    oss << "]";

    // Output black quad centers (for shading)
    oss << ",\"blackQuadCenters\":[";
    for (size_t i = 0; i < g_blackQuadCenters.size(); i++) {
        if (i > 0) oss << ",";
        oss << "{\"x\":" << g_blackQuadCenters[i].first
            << ",\"y\":" << g_blackQuadCenters[i].second << "}";
    }
    oss << "]";

    oss << "}";
    return oss.str();
}

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

extern "C" {

EMSCRIPTEN_KEEPALIVE
void clearTembLevels() {
    g_tembLevels.clear();
    g_origamiLevels.clear();
}

EMSCRIPTEN_KEEPALIVE
void setN(int n) {
    if (n < 1) n = 1;
    if (n > MAX_N) n = MAX_N;
    g_n = n;
}

EMSCRIPTEN_KEEPALIVE
void initCoefficients() {
    // No-op: Coefficients captured dynamically during Aztec reduction
}

EMSCRIPTEN_KEEPALIVE
void computeTembedding() {
    // Clear previous results
    g_tembLevels.clear();
    g_origamiLevels.clear();

    // Compute T_0 (base case)
    computeT0();
    // Compute O_0 (origami map base case)
    computeO0();

    // Find max K from stored weights
    int maxK = 0;
    for (const auto& sw : g_storedWeights) {
        if (sw.k > maxK) maxK = sw.k;
    }

    // Compute T_1 through T_maxK based on captured face weights
    for (int k = 1; k <= maxK; k++) {
        computeTk(k);
        computeOk(k);  // Also compute origami map
    }
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    std::free(str);
}

EMSCRIPTEN_KEEPALIVE
void clearStoredWeightsExport() {
    clearStoredWeights();
}

// -----------------------------------------------------------------------------
// AZTEC GRAPH EXPORTED FUNCTIONS
// -----------------------------------------------------------------------------

EMSCRIPTEN_KEEPALIVE
void setAztecGraphLevel(int k) {
    if (k < 1) k = 1;
    if (k > MAX_N) k = MAX_N;
    g_aztecLevel = k;
}

EMSCRIPTEN_KEEPALIVE
void generateAztecGraph(int k) {
    if (k < 1) k = 1;
    if (k > MAX_N) k = MAX_N;
    g_totalComputeTimeMs = 0.0;  // Reset timer on new graph
    generateAztecGraphInternal(k);
}

EMSCRIPTEN_KEEPALIVE
char* getAztecGraphJSON() {
    std::string result = getAztecGraphJSONInternal();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void randomizeAztecWeights() {
    randomizeAztecWeightsInternal();
}

// Set weights based on mode:
// 0 = All 1's (uniform)
// 1 = Random IID
// 2 = Random Layered
// 3 = Random Gamma
// 4 = Periodic (k x l periodicity)
EMSCRIPTEN_KEEPALIVE
void setAztecWeightMode(int mode) {
    if (mode == 0) {
        // All 1's: all weights = 1
        setUniformWeightsInternal();
    } else if (mode == 1) {
        // Random IID
        setRandomIIDWeightsInternal();
    } else if (mode == 2) {
        // Random Layered
        setLayeredWeightsInternal();
    } else if (mode == 3) {
        // Random Gamma
        setGammaWeightsInternal();
    } else if (mode == 4) {
        // Periodic weights
        setPeriodicWeightsInternal();
    }
}

// Set Random IID parameters (min and max range)
EMSCRIPTEN_KEEPALIVE
void setRandomIIDParams(double minVal, double maxVal) {
    if (minVal <= 0) minVal = 0.001;
    if (maxVal <= minVal) maxVal = minVal + 0.1;
    g_iidMin = minVal;
    g_iidMax = maxVal;
}

// Set Layered regime parameters
// regime: 1=Critical, 2=RareEvent, 3=Bernoulli, 4=DetPeriodic, 5=Uniform
EMSCRIPTEN_KEEPALIVE
void setLayeredParams(int regime, double p1, double p2, double prob1, double prob2) {
    g_layeredRegime = regime;
    g_layeredP1 = p1;
    g_layeredP2 = p2;
    g_layeredProb1 = prob1;
    g_layeredProb2 = prob2;
}

// Set Gamma distribution parameters
EMSCRIPTEN_KEEPALIVE
void setGammaParams(double alpha, double beta) {
    if (alpha <= 0) alpha = 0.01;
    if (beta <= 0) beta = 0.01;
    g_gammaAlpha = alpha;
    g_gammaBeta = beta;
}

// Set periodic weight parameters (k x l period)
EMSCRIPTEN_KEEPALIVE
void setPeriodicPeriod(int k, int l) {
    if (k < 1) k = 1;
    if (l < 1) l = 1;
    if (k > 10) k = 10;
    if (l > 10) l = 10;
    initPeriodicWeights(k, l);
}

// Set a specific periodic weight value
// type: 0=alpha, 1=beta, 2=gamma
// j, i: periodic indices (0-indexed)
EMSCRIPTEN_KEEPALIVE
void setPeriodicWeight(int type, int j, int i, double value) {
    if (j < 0 || j >= g_periodicK || i < 0 || i >= g_periodicL) return;
    if (value <= 0) value = 0.001;  // Weights must be positive

    if (type == 0) g_periodicAlpha[j][i] = value;
    else if (type == 1) g_periodicBeta[j][i] = value;
    else if (type == 2) g_periodicGamma[j][i] = value;
}

// Get current periodic parameters as JSON
EMSCRIPTEN_KEEPALIVE
char* getPeriodicParams() {
    std::ostringstream ss;
    ss << "{\"k\":" << g_periodicK << ",\"l\":" << g_periodicL;
    ss << ",\"alpha\":[";
    for (int j = 0; j < g_periodicK; j++) {
        if (j > 0) ss << ",";
        ss << "[";
        for (int i = 0; i < g_periodicL; i++) {
            if (i > 0) ss << ",";
            ss << g_periodicAlpha[j][i];
        }
        ss << "]";
    }
    ss << "],\"beta\":[";
    for (int j = 0; j < g_periodicK; j++) {
        if (j > 0) ss << ",";
        ss << "[";
        for (int i = 0; i < g_periodicL; i++) {
            if (i > 0) ss << ",";
            ss << g_periodicBeta[j][i];
        }
        ss << "]";
    }
    ss << "],\"gamma\":[";
    for (int j = 0; j < g_periodicK; j++) {
        if (j > 0) ss << ",";
        ss << "[";
        for (int i = 0; i < g_periodicL; i++) {
            if (i > 0) ss << ",";
            ss << g_periodicGamma[j][i];
        }
        ss << "]";
    }
    ss << "]}";

    std::string result = ss.str();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

// Reset graph to step 0 while preserving current edge weights
// This clears all history, cached coefficients, and T-embedding caches but keeps the weights
EMSCRIPTEN_KEEPALIVE
void resetAztecGraphPreservingWeights() {
    // [FIX]: Unwind history to return to Step 0 (original state) before capturing weights.
    // If we capture weights from a reduced step (e.g. Step 5), we apply transformed weights
    // to a fresh graph, causing corruption.
    while (!g_aztecHistory.empty()) {
        popAztecState();
    }

    if (g_aztecEdges.empty()) return;

    // Clear T-embedding caches
    g_tembLevels.clear();

    // Save current weights keyed by vertex coordinate pairs
    // Key: "x1,y1,x2,y2" where coordinates are sorted
    std::map<std::string, mp_real> savedWeights;
    for (const auto& e : g_aztecEdges) {
        double x1 = g_aztecVertices[e.v1].x;
        double y1 = g_aztecVertices[e.v1].y;
        double x2 = g_aztecVertices[e.v2].x;
        double y2 = g_aztecVertices[e.v2].y;
        // Sort coordinates for consistent key
        std::ostringstream oss;
        if (x1 < x2 || (x1 == x2 && y1 < y2)) {
            oss << x1 << "," << y1 << "," << x2 << "," << y2;
        } else {
            oss << x2 << "," << y2 << "," << x1 << "," << y1;
        }
        savedWeights[oss.str()] = e.logWeight;  // Save log weight directly
    }

    // Regenerate graph (clears history and cached data including g_storedWeights)
    int n = g_aztecLevel;
    generateAztecGraphInternal(n);

    // Restore weights
    for (auto& e : g_aztecEdges) {
        double x1 = g_aztecVertices[e.v1].x;
        double y1 = g_aztecVertices[e.v1].y;
        double x2 = g_aztecVertices[e.v2].x;
        double y2 = g_aztecVertices[e.v2].y;
        std::ostringstream oss;
        if (x1 < x2 || (x1 == x2 && y1 < y2)) {
            oss << x1 << "," << y1 << "," << x2 << "," << y2;
        } else {
            oss << x2 << "," << y2 << "," << x1 << "," << y1;
        }
        auto it = savedWeights.find(oss.str());
        if (it != savedWeights.end()) {
            e.logWeight = it->second;  // Restore log weight directly
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void aztecGraphStepDown() {
    double t0 = emscripten_get_now();
    aztecStepDown();
    g_totalComputeTimeMs += emscripten_get_now() - t0;
}

EMSCRIPTEN_KEEPALIVE
void aztecGraphStepUp() {
    aztecStepUp();
}

EMSCRIPTEN_KEEPALIVE
int getAztecReductionStep() {
    return g_aztecReductionStep;
}

EMSCRIPTEN_KEEPALIVE
int canAztecStepUp() {
    return g_aztecHistory.empty() ? 0 : 1;
}

EMSCRIPTEN_KEEPALIVE
int canAztecStepDown() {
    // Stop at A'_2 (fold 1: shaded) - step 6 with level 2
    if (g_aztecReductionStep == 6 && g_aztecLevel == 2) return 0;
    // Allow stepping if not at final state (step 11 with level 1)
    if (g_aztecReductionStep < 11) return 1;
    if (g_aztecReductionStep == 11 && g_aztecLevel > 1) return 1;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
double getComputeTimeMs() {
    return g_totalComputeTimeMs;
}

EMSCRIPTEN_KEEPALIVE
char* getAztecFacesJSON() {
    std::string result = getFacesJSON();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* getStoredFaceWeightsJSON() {
    std::string result = getStoredWeightsJSON();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* getBetaRatiosJSON() {
    std::ostringstream oss;
    oss << "[";
    bool first = true;
    for (const auto& ber : g_betaEdgeRatios) {
        if (!first) oss << ",";
        first = false;
        oss << "{\"k\":" << ber.k << ",\"ratios\":[";
        bool firstRatio = true;
        for (const auto& [pos, ratio] : ber.ratios) {
            if (!firstRatio) oss << ",";
            firstRatio = false;
            oss << "{\"i\":" << pos.first << ",\"j\":" << pos.second
                << ",\"ratio\":" << std::setprecision(15) << ratio << "}";
        }
        oss << "]}";
    }
    oss << "]";
    std::string result = oss.str();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* getTembeddingLevelJSON(int k) {
    std::string result = getTembLevelJSON(k);
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
char* getOrigamiLevelJSON(int k) {
    std::string result = getOrigamiLevelJSONInternal(k);
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

} // extern "C"
