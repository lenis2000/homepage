/*
  2025-12-11-t-embedding-arbitrary-weights.cpp

  T-embedding of Aztec diamond using Berggren-Russkikh Proposition recurrence.
  Uses arbitrary coefficients α_n, β_{j,n}, γ_{j,k,n} for the recurrence formulas.

  Two-phase algorithm:
  1. Going DOWN (n → 1): Compute coefficients from edge weights (TODO - for now all 1s)
  2. Going UP (1 → n): Build T-embedding using recurrence formulas

  Compile command (AI agent: use single line for auto-approval):
    emcc 2025-12-11-t-embedding-arbitrary-weights.cpp -o 2025-12-11-t-embedding-arbitrary-weights.js -s WASM=1 -s "EXPORTED_FUNCTIONS=['_setN','_initCoefficients','_computeTembedding','_getTembeddingJSON','_generateAztecGraph','_getAztecGraphJSON','_getAztecFacesJSON','_getStoredFaceWeightsJSON','_randomizeAztecWeights','_setAztecGraphLevel','_aztecGraphStepDown','_aztecGraphStepUp','_getAztecReductionStep','_canAztecStepUp','_canAztecStepDown','_freeString','_getProgress','_resetProgress']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math && mv 2025-12-11-t-embedding-arbitrary-weights.js ../../js/
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
#include <algorithm>

// =============================================================================
// GLOBAL STATE
// =============================================================================

static int g_n = 4;           // Diamond size parameter
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

// Progress tracking
static int g_progress = 0;

// Vertex type enum for T-embedding formula tracking
enum VertexType {
    VT_BOUNDARY_CORNER,      // Fixed boundary corner: T(±(n+1),0) and T(0,±(n+1))
    VT_AXIS_HORIZONTAL,      // Axis boundary: T(±n, 0)
    VT_AXIS_VERTICAL,        // Axis boundary: T(0, ±n)
    VT_DIAG_POSITIVE_J,      // Diagonal boundary: j > 0
    VT_DIAG_NEGATIVE_J,      // Diagonal boundary: j < 0
    VT_INTERIOR_PASSTHROUGH, // Interior pass-through: j+k+n even
    VT_INTERIOR_RECURRENCE   // Interior recurrence: j+k+n odd
};

// T-embedding vertex structure
struct TVertex {
    int x, y;                 // Grid position (j, k)
    double tReal, tImag;      // T-embedded position (complex number)
    VertexType type;          // How this vertex was computed
    int sourceLevel;          // Level n from which this was computed
    double coeff;             // Coefficient used (α, β, or γ)
    std::vector<std::string> deps;  // Dependencies
};

// T-embedding storage
static std::map<std::string, TVertex> g_tEmbedding;
static std::vector<std::map<std::string, TVertex>> g_tEmbeddingHistory;

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
};

// Aztec diamond graph edge with weight
struct AztecEdge {
    int v1, v2;       // Indices into vertex array
    double weight;    // Edge weight (0.5 to 2.0)
    bool isHorizontal; // True if horizontal edge, false if vertical
    bool gaugeTransformed; // True if this edge was modified by gauge transform
};

// Global Aztec graph storage
static int g_aztecLevel = 6;  // Current graph level k (default n=6)
static int g_aztecReductionStep = 0;  // 0=original, 1=gauge transformed, 2=degree-2 removed, 3=parallel merged
static std::vector<AztecVertex> g_aztecVertices;
static std::vector<AztecEdge> g_aztecEdges;

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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

static std::string makeKey(int j, int k) {
    std::ostringstream ss;
    ss << j << "," << k;
    return ss.str();
}

static std::string makeDepKey(int level, int j, int k) {
    std::ostringstream ss;
    ss << "T" << level << "(" << j << "," << k << ")";
    return ss.str();
}

// Get α_n coefficient
static double getAlpha(int n) {
    if (n >= 1 && n < (int)g_alpha.size()) {
        return g_alpha[n];
    }
    return 1.0;  // default
}

// Get β_{j,n} coefficient
static double getBeta(int j, int n) {
    if (n >= 1 && n < (int)g_beta.size()) {
        auto it = g_beta[n].find(j);
        if (it != g_beta[n].end()) {
            return it->second;
        }
    }
    return 1.0;  // default
}

// Get γ_{j,k,n} coefficient
static double getGamma(int j, int k, int n) {
    if (n >= 1 && n < (int)g_gamma.size()) {
        std::string key = makeKey(j, k);
        auto it = g_gamma[n].find(key);
        if (it != g_gamma[n].end()) {
            return it->second;
        }
    }
    return 1.0;  // default
}

// =============================================================================
// COEFFICIENT INITIALIZATION
// =============================================================================

// Initialize all coefficients to 1.0 (uniform case)
static void initUniformCoefficients() {
    int N = g_n;

    // Initialize α_n for n = 1..N
    g_alpha.clear();
    g_alpha.resize(N + 1, 1.0);

    // Initialize β_{j,n} for n = 1..N
    g_beta.clear();
    g_beta.resize(N + 1);
    for (int n = 1; n <= N; n++) {
        // j ranges for diagonal boundary: 1 ≤ |j| ≤ n-1
        for (int j = -(n-1); j <= n-1; j++) {
            if (j != 0) {
                g_beta[n][j] = 1.0;
            }
        }
    }

    // Initialize γ_{j,k,n} for n = 1..N
    g_gamma.clear();
    g_gamma.resize(N + 1);
    for (int n = 1; n <= N; n++) {
        // Interior positions: |j|+|k| < n and j+k+n odd
        for (int j = -(n-1); j <= n-1; j++) {
            for (int k = -(n-1); k <= n-1; k++) {
                if (std::abs(j) + std::abs(k) < n && ((j + k + n) % 2 == 1)) {
                    g_gamma[n][makeKey(j, k)] = 1.0;
                }
            }
        }
    }

    // Set a = 1 for uniform case
    g_a = 1.0;
}

// =============================================================================
// T-EMBEDDING COMPUTATION (Going UP: 1 → n)
// =============================================================================

static void computeTembeddingRecurrence() {
    g_tEmbedding.clear();
    g_tEmbeddingHistory.clear();

    int N = g_n;
    double a = g_a;

    // Use complex numbers
    typedef std::complex<double> Complex;

    // T array: Tarray[level][j+N][k+N]
    // Levels go from 1 to N
    std::vector<std::vector<std::vector<Complex>>> T(
        N + 2,  // levels 0..N+1 (we only use 1..N)
        std::vector<std::vector<Complex>>(2*N + 3,
            std::vector<Complex>(2*N + 3, Complex(0, 0))
        )
    );

    // Storage for vertex metadata
    std::vector<std::vector<std::vector<VertexType>>> vertexTypes(
        N + 2,
        std::vector<std::vector<VertexType>>(2*N + 3,
            std::vector<VertexType>(2*N + 3, VT_BOUNDARY_CORNER)
        )
    );
    std::vector<std::vector<std::vector<double>>> vertexCoeffs(
        N + 2,
        std::vector<std::vector<double>>(2*N + 3,
            std::vector<double>(2*N + 3, 1.0)
        )
    );
    std::vector<std::vector<std::vector<int>>> vertexSourceLevel(
        N + 2,
        std::vector<std::vector<int>>(2*N + 3,
            std::vector<int>(2*N + 3, 0)
        )
    );
    std::vector<std::vector<std::vector<std::vector<std::string>>>> vertexDeps(
        N + 2,
        std::vector<std::vector<std::vector<std::string>>>(2*N + 3,
            std::vector<std::vector<std::string>>(2*N + 3)
        )
    );

    // Offset for array indexing (j,k can be negative)
    int off = N + 1;

    // Helper to store T-embedding at a given level
    // T_m graph has: interior vertices (|j|+|k| < m) and 4 corners (±m,0), (0,±m)
    auto storeTembeddingAtLevel = [&](int level) {
        std::map<std::string, TVertex> levelMap;
        int m = level;
        for (int k = -m; k <= m; k++) {
            for (int j = -m; j <= m; j++) {
                int absSum = std::abs(j) + std::abs(k);
                bool isInterior = absSum < m;
                bool isCorner = (absSum == m) && (j == 0 || k == 0);
                if (isInterior || isCorner) {
                    TVertex v;
                    v.x = j;
                    v.y = k;
                    v.tReal = T[m][j + off][k + off].real();
                    v.tImag = T[m][j + off][k + off].imag();
                    v.type = vertexTypes[m][j + off][k + off];
                    v.sourceLevel = vertexSourceLevel[m][j + off][k + off];
                    v.coeff = vertexCoeffs[m][j + off][k + off];
                    v.deps = vertexDeps[m][j + off][k + off];
                    levelMap[makeKey(j, k)] = v;
                }
            }
        }
        g_tEmbeddingHistory.push_back(levelMap);
    };

    // ==========================================================================
    // BASE CASE: T_1
    // ==========================================================================
    // T_1 has vertices at (±1, 0), (0, ±1), and (0, 0)
    // Boundary corners: T_1(±1, 0) = ±1, T_1(0, ±1) = ∓ia
    // Center: T_1(0, 0) = 0 (by symmetry)

    T[1][1 + off][0 + off] = Complex(1.0, 0.0);      // T_1(1, 0) = 1
    T[1][-1 + off][0 + off] = Complex(-1.0, 0.0);   // T_1(-1, 0) = -1
    T[1][0 + off][1 + off] = Complex(0.0, -a);      // T_1(0, 1) = -ia
    T[1][0 + off][-1 + off] = Complex(0.0, a);      // T_1(0, -1) = ia
    T[1][0 + off][0 + off] = Complex(0.0, 0.0);     // T_1(0, 0) = 0

    vertexTypes[1][1 + off][0 + off] = VT_BOUNDARY_CORNER;
    vertexTypes[1][-1 + off][0 + off] = VT_BOUNDARY_CORNER;
    vertexTypes[1][0 + off][1 + off] = VT_BOUNDARY_CORNER;
    vertexTypes[1][0 + off][-1 + off] = VT_BOUNDARY_CORNER;
    vertexTypes[1][0 + off][0 + off] = VT_INTERIOR_PASSTHROUGH;

    storeTembeddingAtLevel(1);

    // ==========================================================================
    // RECURRENCE: T_{n+1} from T_n for n = 1..N-1
    // ==========================================================================

    for (int n = 1; n < N; n++) {
        Complex one(1.0, 0.0);
        Complex ia(0.0, a);

        // Rule 1: Boundary corners for level n+1
        // T_{n+1}(±(n+1), 0) = ±1
        // T_{n+1}(0, ±(n+1)) = ∓ia
        T[n+1][(n+1) + off][0 + off] = Complex(1.0, 0.0);
        T[n+1][-(n+1) + off][0 + off] = Complex(-1.0, 0.0);
        T[n+1][0 + off][(n+1) + off] = Complex(0.0, -a);
        T[n+1][0 + off][-(n+1) + off] = Complex(0.0, a);

        vertexTypes[n+1][(n+1) + off][0 + off] = VT_BOUNDARY_CORNER;
        vertexTypes[n+1][-(n+1) + off][0 + off] = VT_BOUNDARY_CORNER;
        vertexTypes[n+1][0 + off][(n+1) + off] = VT_BOUNDARY_CORNER;
        vertexTypes[n+1][0 + off][-(n+1) + off] = VT_BOUNDARY_CORNER;

        // Rule 2: Axis boundary (|j|, |k| = {0, n})
        // T_{n+1}(±n, 0) = (T_n(±n,0) + α_n·T_n(±(n-1),0)) / (α_n + 1)
        // T_{n+1}(0, ±n) = (α_n·T_n(0,±n) + T_n(0,±(n-1))) / (α_n + 1)
        {
            double alpha = getAlpha(n);
            Complex alphaC(alpha, 0.0);

            // T_{n+1}(n, 0)
            T[n+1][n + off][0 + off] =
                (T[n][n + off][0 + off] + alphaC * T[n][(n-1) + off][0 + off]) / (alphaC + one);
            vertexTypes[n+1][n + off][0 + off] = VT_AXIS_HORIZONTAL;
            vertexSourceLevel[n+1][n + off][0 + off] = n;
            vertexCoeffs[n+1][n + off][0 + off] = alpha;
            vertexDeps[n+1][n + off][0 + off] = {makeDepKey(n, n, 0), makeDepKey(n, n-1, 0)};

            // T_{n+1}(-n, 0)
            T[n+1][-n + off][0 + off] =
                (T[n][-n + off][0 + off] + alphaC * T[n][-(n-1) + off][0 + off]) / (alphaC + one);
            vertexTypes[n+1][-n + off][0 + off] = VT_AXIS_HORIZONTAL;
            vertexSourceLevel[n+1][-n + off][0 + off] = n;
            vertexCoeffs[n+1][-n + off][0 + off] = alpha;
            vertexDeps[n+1][-n + off][0 + off] = {makeDepKey(n, -n, 0), makeDepKey(n, -(n-1), 0)};

            // T_{n+1}(0, n)
            T[n+1][0 + off][n + off] =
                (alphaC * T[n][0 + off][n + off] + T[n][0 + off][(n-1) + off]) / (alphaC + one);
            vertexTypes[n+1][0 + off][n + off] = VT_AXIS_VERTICAL;
            vertexSourceLevel[n+1][0 + off][n + off] = n;
            vertexCoeffs[n+1][0 + off][n + off] = alpha;
            vertexDeps[n+1][0 + off][n + off] = {makeDepKey(n, 0, n), makeDepKey(n, 0, n-1)};

            // T_{n+1}(0, -n)
            T[n+1][0 + off][-n + off] =
                (alphaC * T[n][0 + off][-n + off] + T[n][0 + off][-(n-1) + off]) / (alphaC + one);
            vertexTypes[n+1][0 + off][-n + off] = VT_AXIS_VERTICAL;
            vertexSourceLevel[n+1][0 + off][-n + off] = n;
            vertexCoeffs[n+1][0 + off][-n + off] = alpha;
            vertexDeps[n+1][0 + off][-n + off] = {makeDepKey(n, 0, -n), makeDepKey(n, 0, -(n-1))};
        }

        // Rule 3: Diagonal boundary (|j|+|k|=n, j≠0, k≠0)
        // For j > 0: T_{n+1}(j, ±(n-j)) = (T_n(j-1,±(n-j)) + β·T_n(j,±(n-j-1))) / (β + 1)
        // For j < 0: T_{n+1}(j, ±(n+j)) = (β·T_n(j,±(n+j-1)) + T_n(j+1,±(n+j))) / (β + 1)

        for (int j = 1; j <= n - 1; j++) {
            double beta = getBeta(j, n);
            Complex betaC(beta, 0.0);

            // Upper-right: k = n - j > 0
            int k = n - j;
            T[n+1][j + off][k + off] =
                (T[n][(j-1) + off][k + off] + betaC * T[n][j + off][(k-1) + off]) / (betaC + one);
            vertexTypes[n+1][j + off][k + off] = VT_DIAG_POSITIVE_J;
            vertexSourceLevel[n+1][j + off][k + off] = n;
            vertexCoeffs[n+1][j + off][k + off] = beta;
            vertexDeps[n+1][j + off][k + off] = {makeDepKey(n, j-1, k), makeDepKey(n, j, k-1)};

            // Lower-right: k = -(n - j) < 0
            k = -(n - j);
            T[n+1][j + off][k + off] =
                (T[n][(j-1) + off][k + off] + betaC * T[n][j + off][(k+1) + off]) / (betaC + one);
            vertexTypes[n+1][j + off][k + off] = VT_DIAG_POSITIVE_J;
            vertexSourceLevel[n+1][j + off][k + off] = n;
            vertexCoeffs[n+1][j + off][k + off] = beta;
            vertexDeps[n+1][j + off][k + off] = {makeDepKey(n, j-1, k), makeDepKey(n, j, k+1)};
        }

        for (int j = -(n - 1); j <= -1; j++) {
            double beta = getBeta(j, n);
            Complex betaC(beta, 0.0);

            // Upper-left: k = n + j > 0
            int k = n + j;
            T[n+1][j + off][k + off] =
                (betaC * T[n][j + off][(k-1) + off] + T[n][(j+1) + off][k + off]) / (betaC + one);
            vertexTypes[n+1][j + off][k + off] = VT_DIAG_NEGATIVE_J;
            vertexSourceLevel[n+1][j + off][k + off] = n;
            vertexCoeffs[n+1][j + off][k + off] = beta;
            vertexDeps[n+1][j + off][k + off] = {makeDepKey(n, j, k-1), makeDepKey(n, j+1, k)};

            // Lower-left: k = -(n + j) < 0
            k = -(n + j);
            T[n+1][j + off][k + off] =
                (betaC * T[n][j + off][(k+1) + off] + T[n][(j+1) + off][k + off]) / (betaC + one);
            vertexTypes[n+1][j + off][k + off] = VT_DIAG_NEGATIVE_J;
            vertexSourceLevel[n+1][j + off][k + off] = n;
            vertexCoeffs[n+1][j + off][k + off] = beta;
            vertexDeps[n+1][j + off][k + off] = {makeDepKey(n, j, k+1), makeDepKey(n, j+1, k)};
        }

        // Rule 4: Interior pass-through (|j|+|k| < n, j+k+n even)
        // Must be done BEFORE Rule 5 so T_{n+1} neighbors are available
        for (int k = -(n - 1); k <= n - 1; k++) {
            for (int j = -(n - 1); j <= n - 1; j++) {
                if (std::abs(j) + std::abs(k) >= n) continue;  // not interior
                if ((j + k + n) % 2 != 0) continue;  // not even parity

                T[n+1][j + off][k + off] = T[n][j + off][k + off];
                vertexTypes[n+1][j + off][k + off] = VT_INTERIOR_PASSTHROUGH;
                vertexSourceLevel[n+1][j + off][k + off] = n;
                vertexCoeffs[n+1][j + off][k + off] = 1.0;
                vertexDeps[n+1][j + off][k + off] = {makeDepKey(n, j, k)};
            }
        }

        // Rule 5: Interior recurrence (|j|+|k| < n, j+k+n odd)
        // Now all T_{n+1} neighbors are available (boundary from Rules 1-3, interior from Rule 4)
        for (int k = -(n - 1); k <= n - 1; k++) {
            for (int j = -(n - 1); j <= n - 1; j++) {
                if (std::abs(j) + std::abs(k) >= n) continue;  // not interior
                if ((j + k + n) % 2 == 0) continue;  // not odd parity

                // T_{n+1}(j,k) = -T_n(j,k) + (T_{n+1}(j-1,k) + T_{n+1}(j+1,k)
                //                + γ·(T_{n+1}(j,k+1) + T_{n+1}(j,k-1))) / (γ + 1)
                double gamma = getGamma(j, k, n);
                Complex gammaC(gamma, 0.0);

                T[n+1][j + off][k + off] =
                    -T[n][j + off][k + off]
                    + (T[n+1][(j-1) + off][k + off] + T[n+1][(j+1) + off][k + off]
                       + gammaC * (T[n+1][j + off][(k+1) + off] + T[n+1][j + off][(k-1) + off])
                      ) / (gammaC + one);

                vertexTypes[n+1][j + off][k + off] = VT_INTERIOR_RECURRENCE;
                vertexSourceLevel[n+1][j + off][k + off] = n;
                vertexCoeffs[n+1][j + off][k + off] = gamma;
                vertexDeps[n+1][j + off][k + off] = {
                    makeDepKey(n, j, k),
                    makeDepKey(n+1, j-1, k),
                    makeDepKey(n+1, j+1, k),
                    makeDepKey(n+1, j, k+1),
                    makeDepKey(n+1, j, k-1)
                };
            }
        }

        // Store T-embedding at level n+1
        storeTembeddingAtLevel(n + 1);
    }

    // Store final T-embedding (level N) - only valid T_N vertices
    for (int k = -N; k <= N; k++) {
        for (int j = -N; j <= N; j++) {
            int absSum = std::abs(j) + std::abs(k);
            bool isInterior = absSum < N;
            bool isCorner = (absSum == N) && (j == 0 || k == 0);
            if (isInterior || isCorner) {
                TVertex v;
                v.x = j;
                v.y = k;
                v.tReal = T[N][j + off][k + off].real();
                v.tImag = T[N][j + off][k + off].imag();
                v.type = vertexTypes[N][j + off][k + off];
                v.sourceLevel = vertexSourceLevel[N][j + off][k + off];
                v.coeff = vertexCoeffs[N][j + off][k + off];
                v.deps = vertexDeps[N][j + off][k + off];
                g_tEmbedding[makeKey(j, k)] = v;
            }
        }
    }
}

// =============================================================================
// AZTEC GRAPH GENERATION
// =============================================================================

// Random number generator state (simple LCG)
static unsigned int g_rngState = 12345;

static double randomWeight() {
    // LCG: next = (a * current + c) mod m
    g_rngState = g_rngState * 1103515245 + 12345;
    int steps = (g_rngState >> 16) % 16;  // 0-15 steps
    return 0.5 + steps * 0.1;  // 0.5 to 2.0 in steps of 0.1
}

// Forward declaration for stored weights (defined later in face detection section)
static void clearStoredWeights();

// Generate Aztec diamond graph for level k
// Vertices at half-integer coordinates (i+0.5, j+0.5) where |x| + |y| <= k + 0.5
static void generateAztecGraphInternal(int k) {
    g_aztecVertices.clear();
    g_aztecEdges.clear();
    g_aztecLevel = k;
    clearStoredWeights();  // Clear stored face weights when graph changes

    // Map from (x,y) key to vertex index
    std::map<std::string, int> vertexIndex;

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

                std::ostringstream keyss;
                keyss << x << "," << y;
                vertexIndex[keyss.str()] = (int)g_aztecVertices.size();
                g_aztecVertices.push_back(v);
            }
        }
    }

    // Generate edges (connect adjacent vertices)
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        double x = g_aztecVertices[idx].x;
        double y = g_aztecVertices[idx].y;

        // Check right neighbor (x+1, y)
        {
            std::ostringstream keyss;
            keyss << (x + 1.0) << "," << y;
            auto it = vertexIndex.find(keyss.str());
            if (it != vertexIndex.end()) {
                AztecEdge e;
                e.v1 = (int)idx;
                e.v2 = it->second;
                e.weight = randomWeight();
                e.isHorizontal = true;
                e.gaugeTransformed = false;
                g_aztecEdges.push_back(e);
            }
        }

        // Check top neighbor (x, y+1)
        {
            std::ostringstream keyss;
            keyss << x << "," << (y + 1.0);
            auto it = vertexIndex.find(keyss.str());
            if (it != vertexIndex.end()) {
                AztecEdge e;
                e.v1 = (int)idx;
                e.v2 = it->second;
                e.weight = randomWeight();
                e.isHorizontal = false;
                e.gaugeTransformed = false;
                g_aztecEdges.push_back(e);
            }
        }
    }

    // Reset reduction step
    g_aztecReductionStep = 0;
    g_aztecHistory.clear();
}

// Randomize all edge weights
static void randomizeAztecWeightsInternal() {
    g_rngState = (unsigned int)(g_rngState * 1103515245 + 12345);  // Change seed
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        g_aztecEdges[i].weight = randomWeight();
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

    // Build vertex lookup map using integer coordinates (i,j) to avoid float precision issues
    // Key: i * 10000 + j (assumes |i|, |j| < 5000)
    auto makeIntKey = [](int i, int j) { return i * 10000 + j; };
    std::map<int, int> vertexIndex;  // intKey -> vertex index
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        int i, j;
        getIntCoords(g_aztecVertices[idx].x, g_aztecVertices[idx].y, i, j);
        vertexIndex[makeIntKey(i, j)] = (int)idx;
    }

    // Build edge lookup: for each vertex, list of (neighbor_idx, edge_idx)
    // Note: we'll read current weights from g_aztecEdges, not cached values
    std::map<int, std::vector<std::pair<int, int>>> adjacency;  // vertex -> [(neighbor, edgeIdx)]
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
            if (vertexIndex.count(makeIntKey(bi, bj))) {
                leftDiagVertices.push_back({(int)idx, i, j, true});
            }
        } else if (i - j == (n - 1)) {
            // Right diagonal: boundary at (i, j-1), check if it exists
            int bi = i, bj = j - 1;
            if (vertexIndex.count(makeIntKey(bi, bj))) {
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
        auto bit = vertexIndex.find(makeIntKey(bi, bj));
        if (bit == vertexIndex.end()) continue;
        int bIdx = bit->second;

        // Reference vertex at (i+1, j+1) - either corner or previous gauge vertex
        int ri = i + 1, rj = j + 1;
        auto rit = vertexIndex.find(makeIntKey(ri, rj));
        if (rit == vertexIndex.end()) continue;
        int rIdx = rit->second;

        // Find edge from gauge vertex to boundary
        int edgeToBoundaryIdx = findEdge(vIdx, bIdx);
        if (edgeToBoundaryIdx < 0) continue;

        // Find reference edge (boundary to reference vertex)
        int refEdgeIdx = findEdge(bIdx, rIdx);
        if (refEdgeIdx < 0) continue;

        // Read CURRENT weights (not cached!)
        double edgeToBoundaryWeight = g_aztecEdges[edgeToBoundaryIdx].weight;
        double refEdgeWeight = g_aztecEdges[refEdgeIdx].weight;

        // Compute gauge factor λ = refEdgeWeight / edgeToBoundaryWeight
        if (edgeToBoundaryWeight < 1e-10) continue;
        double lambda = refEdgeWeight / edgeToBoundaryWeight;

        // Apply λ to all edges adjacent to this gauge vertex
        for (const auto& [neighbor, eIdx] : adjacency[vIdx]) {
            g_aztecEdges[eIdx].weight *= lambda;
            g_aztecEdges[eIdx].gaugeTransformed = true;
        }
    }

    // Process right diagonal vertices
    for (const auto& gv : rightDiagVertices) {
        int vIdx = gv.idx;
        int i = gv.i, j = gv.j;

        // Boundary vertex at (i, j-1)
        int bi = i, bj = j - 1;
        auto bit = vertexIndex.find(makeIntKey(bi, bj));
        if (bit == vertexIndex.end()) continue;
        int bIdx = bit->second;

        // Reference vertex at (i-1, j-1) - either corner or previous gauge vertex
        int ri = i - 1, rj = j - 1;
        auto rit = vertexIndex.find(makeIntKey(ri, rj));
        if (rit == vertexIndex.end()) continue;
        int rIdx = rit->second;

        // Find edge from gauge vertex to boundary
        int edgeToBoundaryIdx = findEdge(vIdx, bIdx);
        if (edgeToBoundaryIdx < 0) continue;

        // Find reference edge (boundary to reference vertex)
        int refEdgeIdx = findEdge(bIdx, rIdx);
        if (refEdgeIdx < 0) continue;

        // Read CURRENT weights (not cached!)
        double edgeToBoundaryWeight = g_aztecEdges[edgeToBoundaryIdx].weight;
        double refEdgeWeight = g_aztecEdges[refEdgeIdx].weight;

        // Compute gauge factor λ = refEdgeWeight / edgeToBoundaryWeight
        if (edgeToBoundaryWeight < 1e-10) continue;
        double lambda = refEdgeWeight / edgeToBoundaryWeight;

        // Apply λ to all edges adjacent to this gauge vertex
        for (const auto& [neighbor, eIdx] : adjacency[vIdx]) {
            g_aztecEdges[eIdx].weight *= lambda;
            g_aztecEdges[eIdx].gaugeTransformed = true;
        }
    }

    g_aztecReductionStep = 1;
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

    // Build vertex lookup map using integer coordinates
    auto makeIntKey = [](int i, int j) { return i * 10000 + j; };
    std::map<int, int> vertexIndex;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        int i, j;
        getIntCoords(g_aztecVertices[idx].x, g_aztecVertices[idx].y, i, j);
        vertexIndex[makeIntKey(i, j)] = (int)idx;
    }

    // Build edge lookup: vertex -> [(neighbor, edgeIdx)]
    std::map<int, std::vector<std::pair<int, int>>> adjacency;
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

        auto n1It = vertexIndex.find(makeIntKey(n1i, n1j));
        auto n2It = vertexIndex.find(makeIntKey(n2i, n2j));
        if (n1It == vertexIndex.end() || n2It == vertexIndex.end()) continue;

        int n1Idx = n1It->second;
        int n2Idx = n2It->second;

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

        double refWeight = g_aztecEdges[refEdgeIdx].weight;
        double eqWeight = g_aztecEdges[eqEdgeIdx].weight;
        if (eqWeight < 1e-10) continue;
        double lambda = refWeight / eqWeight;

        // Highlight the WHITE gauge vertex
        g_aztecVertices[gaugeNeighborIdx].inVgauge = true;

        // Apply λ to ALL edges at the gauge neighbor (gauge touches all edges)
        for (const auto& [neighbor, eIdx] : adjacency[gaugeNeighborIdx]) {
            g_aztecEdges[eIdx].weight *= lambda;
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

        auto n1It = vertexIndex.find(makeIntKey(n1i, n1j));
        auto n2It = vertexIndex.find(makeIntKey(n2i, n2j));
        if (n1It == vertexIndex.end() || n2It == vertexIndex.end()) continue;

        int n1Idx = n1It->second;
        int n2Idx = n2It->second;

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

        double refWeight = g_aztecEdges[refEdgeIdx].weight;
        double eqWeight = g_aztecEdges[eqEdgeIdx].weight;
        if (eqWeight < 1e-10) continue;
        double lambda = refWeight / eqWeight;

        // Highlight the WHITE gauge vertex
        g_aztecVertices[gaugeNeighborIdx].inVgauge = true;

        // Apply λ to ALL edges at the gauge neighbor (gauge touches all edges)
        for (const auto& [neighbor, eIdx] : adjacency[gaugeNeighborIdx]) {
            g_aztecEdges[eIdx].weight *= lambda;
            g_aztecEdges[eIdx].gaugeTransformed = true;
        }
    }

    g_aztecReductionStep = 2;
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

    // Build new vertex list and mapping from old to new indices
    std::vector<AztecVertex> newVertices;
    std::map<int, int> oldToNew;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (verticesToRemove.find((int)idx) == verticesToRemove.end()) {
            oldToNew[(int)idx] = (int)newVertices.size();
            newVertices.push_back(g_aztecVertices[idx]);
        }
    }

    // Build new edge list, removing edges connected to removed vertices
    std::vector<AztecEdge> newEdges;
    for (const auto& e : g_aztecEdges) {
        bool v1Removed = (verticesToRemove.find(e.v1) != verticesToRemove.end());
        bool v2Removed = (verticesToRemove.find(e.v2) != verticesToRemove.end());
        if (!v1Removed && !v2Removed) {
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

    // Build vertex index for quick lookup
    std::map<std::string, int> vertexIndex;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        int i = (int)std::round(g_aztecVertices[idx].x - 0.5);
        int j = (int)std::round(g_aztecVertices[idx].y - 0.5);
        vertexIndex[makeKey(i, j)] = (int)idx;
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
    auto contractDiagonal = [&](std::vector<int>& diagVertices, double newX, double newY) {
        if (diagVertices.size() == 0) return;

        int keepIdx = diagVertices[0];  // Keep the first vertex

        // Set the contracted vertex position
        g_aztecVertices[keepIdx].x = newX;
        g_aztecVertices[keepIdx].y = newY;

        // Map from old vertex index to new (redirected) index
        std::map<int, int> redirect;
        for (size_t i = 1; i < diagVertices.size(); i++) {
            redirect[diagVertices[i]] = keepIdx;
        }

        // Redirect edges
        for (auto& e : g_aztecEdges) {
            if (redirect.count(e.v1)) e.v1 = redirect[e.v1];
            if (redirect.count(e.v2)) e.v2 = redirect[e.v2];
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

    // Remove marked vertices
    std::vector<AztecVertex> newVertices;
    std::map<int, int> oldToNew;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (!g_aztecVertices[idx].toContract) {
            oldToNew[(int)idx] = (int)newVertices.size();
            newVertices.push_back(g_aztecVertices[idx]);
        }
    }

    // Remap edge indices and collect edges
    std::vector<AztecEdge> remappedEdges;
    for (auto& e : g_aztecEdges) {
        if (oldToNew.count(e.v1) && oldToNew.count(e.v2)) {
            AztecEdge newEdge = e;
            newEdge.v1 = oldToNew[e.v1];
            newEdge.v2 = oldToNew[e.v2];
            // Skip self-loops
            if (newEdge.v1 != newEdge.v2) {
                remappedEdges.push_back(newEdge);
            }
        }
    }

    // Merge double edges: sum weights of edges between same vertex pairs
    std::map<std::pair<int,int>, double> edgeWeights;
    std::map<std::pair<int,int>, bool> edgeHorizontal;
    for (const auto& e : remappedEdges) {
        int v1 = std::min(e.v1, e.v2);
        int v2 = std::max(e.v1, e.v2);
        auto key = std::make_pair(v1, v2);
        edgeWeights[key] += e.weight;  // Sum weights
        edgeHorizontal[key] = e.isHorizontal;
    }

    // Build final edge list
    std::vector<AztecEdge> newEdges;
    for (const auto& [key, weight] : edgeWeights) {
        AztecEdge e;
        e.v1 = key.first;
        e.v2 = key.second;
        e.weight = weight;
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
    auto contractDiagonal = [&](std::vector<int>& diagVertices, double newX, double newY) {
        if (diagVertices.size() == 0) return;

        int keepIdx = diagVertices[0];  // Keep the first vertex

        // Set the contracted vertex position
        g_aztecVertices[keepIdx].x = newX;
        g_aztecVertices[keepIdx].y = newY;

        // Map from old vertex index to new (redirected) index
        std::map<int, int> redirect;
        for (size_t i = 1; i < diagVertices.size(); i++) {
            redirect[diagVertices[i]] = keepIdx;
        }

        // Redirect edges
        for (auto& e : g_aztecEdges) {
            if (redirect.count(e.v1)) e.v1 = redirect[e.v1];
            if (redirect.count(e.v2)) e.v2 = redirect[e.v2];
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

    // Remove marked vertices
    std::vector<AztecVertex> newVertices;
    std::map<int, int> oldToNew;
    for (size_t idx = 0; idx < g_aztecVertices.size(); idx++) {
        if (!g_aztecVertices[idx].toContract) {
            oldToNew[(int)idx] = (int)newVertices.size();
            newVertices.push_back(g_aztecVertices[idx]);
        }
    }

    // Remap edge indices and collect edges
    std::vector<AztecEdge> remappedEdges;
    for (auto& e : g_aztecEdges) {
        if (oldToNew.count(e.v1) && oldToNew.count(e.v2)) {
            AztecEdge newEdge = e;
            newEdge.v1 = oldToNew[e.v1];
            newEdge.v2 = oldToNew[e.v2];
            // Skip self-loops
            if (newEdge.v1 != newEdge.v2) {
                remappedEdges.push_back(newEdge);
            }
        }
    }

    // Merge double edges: sum weights of edges between same vertex pairs
    std::map<std::pair<int,int>, double> edgeWeights;
    std::map<std::pair<int,int>, bool> edgeHorizontal;
    for (const auto& e : remappedEdges) {
        int v1 = std::min(e.v1, e.v2);
        int v2 = std::max(e.v1, e.v2);
        auto key = std::make_pair(v1, v2);
        edgeWeights[key] += e.weight;  // Sum weights
        edgeHorizontal[key] = e.isHorizontal;
    }

    // Build final edge list
    std::vector<AztecEdge> newEdges;
    for (const auto& [key, weight] : edgeWeights) {
        AztecEdge e;
        e.v1 = key.first;
        e.v2 = key.second;
        e.weight = weight;
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

    // Build vertex index by coordinate string
    std::map<std::string, int> vertexIndex;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        std::ostringstream key;
        key << g_aztecVertices[i].x << "," << g_aztecVertices[i].y;
        vertexIndex[key.str()] = (int)i;
    }

    // Build edge lookup
    std::set<std::string> edgeSet;
    for (const auto& e : g_aztecEdges) {
        double x1 = g_aztecVertices[e.v1].x;
        double y1 = g_aztecVertices[e.v1].y;
        double x2 = g_aztecVertices[e.v2].x;
        double y2 = g_aztecVertices[e.v2].y;
        std::ostringstream k1, k2;
        k1 << x1 << "," << y1 << "-" << x2 << "," << y2;
        k2 << x2 << "," << y2 << "-" << x1 << "," << y1;
        edgeSet.insert(k1.str());
        edgeSet.insert(k2.str());
    }

    // Find all black quad centers
    // Black quads have WHITE vertices at NW (TL) and SE (BR) corners
    g_blackQuadCenters.clear();
    std::set<std::string> visitedFaces;

    for (const auto& v : g_aztecVertices) {
        double x = v.x, y = v.y;
        std::ostringstream faceKey;
        faceKey << x << "," << y;
        if (visitedFaces.count(faceKey.str())) continue;

        // Look for face with BL at (x, y)
        std::ostringstream blKey, brKey, tlKey, trKey;
        blKey << x << "," << y;
        brKey << (x+1) << "," << y;
        tlKey << x << "," << (y+1);
        trKey << (x+1) << "," << (y+1);

        if (vertexIndex.count(blKey.str()) && vertexIndex.count(brKey.str()) &&
            vertexIndex.count(tlKey.str()) && vertexIndex.count(trKey.str())) {
            // Check all 4 edges exist
            std::ostringstream e1, e2, e3, e4;
            e1 << x << "," << y << "-" << (x+1) << "," << y;
            e2 << x << "," << (y+1) << "-" << (x+1) << "," << (y+1);
            e3 << x << "," << y << "-" << x << "," << (y+1);
            e4 << (x+1) << "," << y << "-" << (x+1) << "," << (y+1);

            if (edgeSet.count(e1.str()) && edgeSet.count(e2.str()) &&
                edgeSet.count(e3.str()) && edgeSet.count(e4.str())) {
                visitedFaces.insert(faceKey.str());

                int blIdx = vertexIndex[blKey.str()];
                int brIdx = vertexIndex[brKey.str()];
                int tlIdx = vertexIndex[tlKey.str()];
                int trIdx = vertexIndex[trKey.str()];

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

    // Build vertex index by coordinate
    std::map<std::string, int> vertexIndex;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        std::ostringstream key;
        key << g_aztecVertices[i].x << "," << g_aztecVertices[i].y;
        vertexIndex[key.str()] = (int)i;
    }

    // Build edge lookup
    std::set<std::string> edgeSet;
    for (const auto& e : g_aztecEdges) {
        double x1 = g_aztecVertices[e.v1].x;
        double y1 = g_aztecVertices[e.v1].y;
        double x2 = g_aztecVertices[e.v2].x;
        double y2 = g_aztecVertices[e.v2].y;
        std::ostringstream k1, k2;
        k1 << x1 << "," << y1 << "-" << x2 << "," << y2;
        k2 << x2 << "," << y2 << "-" << x1 << "," << y1;
        edgeSet.insert(k1.str());
        edgeSet.insert(k2.str());
    }

    // Find all black quads and their vertex indices
    // Black quads have WHITE vertices at NW (TL) and SE (BR) corners
    struct BlackQuad {
        int blIdx, brIdx, tlIdx, trIdx;
        double cx, cy;  // center
    };
    std::vector<BlackQuad> blackQuads;
    std::set<int> verticesInBlackQuads;  // indices of vertices belonging to black quads
    std::set<std::string> visitedFaces;

    for (const auto& v : g_aztecVertices) {
        double x = v.x, y = v.y;
        std::ostringstream faceKey;
        faceKey << x << "," << y;
        if (visitedFaces.count(faceKey.str())) continue;

        // Look for face with BL at (x, y)
        std::ostringstream blKey, brKey, tlKey, trKey;
        blKey << x << "," << y;
        brKey << (x+1) << "," << y;
        tlKey << x << "," << (y+1);
        trKey << (x+1) << "," << (y+1);

        if (vertexIndex.count(blKey.str()) && vertexIndex.count(brKey.str()) &&
            vertexIndex.count(tlKey.str()) && vertexIndex.count(trKey.str())) {
            // Check all 4 edges exist
            std::ostringstream e1, e2, e3, e4;
            e1 << x << "," << y << "-" << (x+1) << "," << y;
            e2 << x << "," << (y+1) << "-" << (x+1) << "," << (y+1);
            e3 << x << "," << y << "-" << x << "," << (y+1);
            e4 << (x+1) << "," << y << "-" << (x+1) << "," << (y+1);

            if (edgeSet.count(e1.str()) && edgeSet.count(e2.str()) &&
                edgeSet.count(e3.str()) && edgeSet.count(e4.str())) {
                visitedFaces.insert(faceKey.str());

                int blIdx = vertexIndex[blKey.str()];
                int brIdx = vertexIndex[brKey.str()];
                int tlIdx = vertexIndex[tlKey.str()];
                int trIdx = vertexIndex[trKey.str()];

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
        edge1.weight = 1.0;
        edge1.isHorizontal = false;
        edge1.gaugeTransformed = false;

        edge2.v1 = idx;
        edge2.v2 = outerIdx2;
        edge2.weight = 1.0;
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

    // Build adjacency list
    std::map<int, std::vector<std::pair<int, int>>> adj;
    for (size_t eIdx = 0; eIdx < g_aztecEdges.size(); eIdx++) {
        int v1 = g_aztecEdges[eIdx].v1;
        int v2 = g_aztecEdges[eIdx].v2;
        adj[v1].push_back({v2, (int)eIdx});
        adj[v2].push_back({v1, (int)eIdx});
    }

    // Find trivalent vertices connected to outer boundary vertices
    // These are the n-2 vertices per corner that need gauge transform
    for (int outerIdx : outerBoundaryVerts) {
        // Find neighbors of the outer boundary vertex
        for (const auto& [neighborIdx, diagEdgeIdx] : adj[outerIdx]) {
            // This neighbor is a trivalent vertex connected to the outer boundary
            // Check if it's trivalent (degree 3)
            if (adj[neighborIdx].size() == 3) {
                // Get the diagonal edge weight (edge to outer boundary)
                double diagWeight = g_aztecEdges[diagEdgeIdx].weight;

                if (std::abs(diagWeight) > 1e-10 && std::abs(diagWeight - 1.0) > 1e-10) {
                    // Gauge transform: divide all edges at this vertex by diagWeight
                    for (const auto& [_, edgeIdx] : adj[neighborIdx]) {
                        g_aztecEdges[edgeIdx].weight /= diagWeight;
                        g_aztecEdges[edgeIdx].gaugeTransformed = true;
                    }
                }
            }
        }
    }

    g_aztecReductionStep = 9;
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
    std::map<int, std::vector<std::pair<int, int>>> adj;
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

        // Find quad edges (edges between inner vertices) and their weights
        // Order: edge from innerVerts[i] to innerVerts[(i+1)%4]
        std::vector<double> quadWeights(4, 1.0);
        std::vector<int> quadEdgeIdx(4, -1);

        for (int i = 0; i < 4; i++) {
            int v1 = innerVerts[i];
            int v2 = innerVerts[(i + 1) % 4];
            for (const auto& [neighborIdx, edgeIdx] : adj[v1]) {
                if (neighborIdx == v2) {
                    quadEdgeIdx[i] = edgeIdx;
                    quadWeights[i] = g_aztecEdges[edgeIdx].weight;
                    break;
                }
            }
        }

        // Get diagonal edge weights
        std::vector<double> diagWeights(4, 1.0);
        for (int i = 0; i < 4; i++) {
            if (diagEdgeIdx[i] >= 0) {
                diagWeights[i] = g_aztecEdges[diagEdgeIdx[i]].weight;
            }
        }

        // Apply urban renewal weight transformation
        // Quad edges in cyclic order: x=quadWeights[0], y=quadWeights[1], z=quadWeights[2], w=quadWeights[3]
        // D = x*z + w*y
        // New weights: (z/D, w/D, x/D, y/D)
        double x = quadWeights[0], y = quadWeights[1], z = quadWeights[2], w = quadWeights[3];
        double D = x * z + w * y;
        if (std::abs(D) < 1e-10) D = 1.0;  // Avoid division by zero

        std::vector<double> newWeights = {z / D, w / D, x / D, y / D};

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
        // Edge i connects outerVerts[i] to outerVerts[(i+1)%4] with weight newWeights[i]
        for (int i = 0; i < 4; i++) {
            AztecEdge newEdge;
            newEdge.v1 = outerVerts[i];
            newEdge.v2 = outerVerts[(i + 1) % 4];
            newEdge.weight = newWeights[i];
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

    // Build vertex index remapping (old index -> new index)
    std::map<int, int> vertexRemap;
    int newIdx = 0;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        if (verticesToRemove.find((int)i) == verticesToRemove.end()) {
            vertexRemap[(int)i] = newIdx++;
        }
    }

    // Remove vertices marked for removal (in reverse order)
    std::vector<int> verticesToRemoveVec(verticesToRemove.begin(), verticesToRemove.end());
    std::sort(verticesToRemoveVec.rbegin(), verticesToRemoveVec.rend());
    for (int idx : verticesToRemoveVec) {
        g_aztecVertices.erase(g_aztecVertices.begin() + idx);
    }

    // Update edge vertex indices using remap
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
    printf("Urban renewal: %zu new edges, %d multi-edges\n", newEdges.size(), multiEdges);

    // Clear black quad centers (they've been collapsed)
    g_blackQuadCenters.clear();

    g_aztecReductionStep = 10;
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

    // Build new edge list with combined weights
    std::vector<AztecEdge> newEdges;
    for (const auto& [vertPair, indices] : edgeGroups) {
        // Sum weights of all edges in this group
        double totalWeight = 0.0;
        bool isHoriz = g_aztecEdges[indices[0]].isHorizontal;
        bool gaugeT = g_aztecEdges[indices[0]].gaugeTransformed;
        for (size_t idx : indices) {
            totalWeight += g_aztecEdges[idx].weight;
            gaugeT = gaugeT || g_aztecEdges[idx].gaugeTransformed;
        }

        // Create single combined edge
        AztecEdge combined;
        combined.v1 = vertPair.first;
        combined.v2 = vertPair.second;
        combined.weight = totalWeight;
        combined.isHorizontal = isHoriz;
        combined.gaugeTransformed = gaugeT;
        newEdges.push_back(combined);
    }

    g_aztecEdges = newEdges;
    g_aztecReductionStep = 11;
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
    // Build vertex index by coordinate string
    std::map<std::string, int> vertexIndex;
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        std::ostringstream key;
        key << std::setprecision(10) << g_aztecVertices[i].x << "," << g_aztecVertices[i].y;
        vertexIndex[key.str()] = (int)i;
    }

    // Build edge lookup
    std::set<std::string> edgeSet;
    for (const auto& e : g_aztecEdges) {
        double x1 = g_aztecVertices[e.v1].x;
        double y1 = g_aztecVertices[e.v1].y;
        double x2 = g_aztecVertices[e.v2].x;
        double y2 = g_aztecVertices[e.v2].y;
        std::ostringstream k1, k2;
        k1 << std::setprecision(10) << x1 << "," << y1 << "-" << x2 << "," << y2;
        k2 << std::setprecision(10) << x2 << "," << y2 << "-" << x1 << "," << y1;
        edgeSet.insert(k1.str());
        edgeSet.insert(k2.str());
    }

    // Find all black quad centers in current graph
    // Black quads have WHITE vertices at NW (TL) and SE (BR) corners
    g_blackQuadCenters.clear();
    std::set<std::string> visitedFaces;

    for (const auto& v : g_aztecVertices) {
        double x = v.x, y = v.y;
        std::ostringstream faceKey;
        faceKey << std::setprecision(10) << x << "," << y;
        if (visitedFaces.count(faceKey.str())) continue;

        // Look for face with BL at (x, y)
        std::ostringstream blKey, brKey, tlKey, trKey;
        blKey << std::setprecision(10) << x << "," << y;
        brKey << std::setprecision(10) << (x+1) << "," << y;
        tlKey << std::setprecision(10) << x << "," << (y+1);
        trKey << std::setprecision(10) << (x+1) << "," << (y+1);

        if (vertexIndex.count(blKey.str()) && vertexIndex.count(brKey.str()) &&
            vertexIndex.count(tlKey.str()) && vertexIndex.count(trKey.str())) {
            // Check all 4 edges exist
            std::ostringstream e1, e2, e3, e4;
            e1 << std::setprecision(10) << x << "," << y << "-" << (x+1) << "," << y;
            e2 << std::setprecision(10) << x << "," << (y+1) << "-" << (x+1) << "," << (y+1);
            e3 << std::setprecision(10) << x << "," << y << "-" << x << "," << (y+1);
            e4 << std::setprecision(10) << (x+1) << "," << y << "-" << (x+1) << "," << (y+1);

            if (edgeSet.count(e1.str()) && edgeSet.count(e2.str()) &&
                edgeSet.count(e3.str()) && edgeSet.count(e4.str())) {
                visitedFaces.insert(faceKey.str());

                int blIdx = vertexIndex[blKey.str()];
                int brIdx = vertexIndex[brKey.str()];
                int tlIdx = vertexIndex[tlKey.str()];
                int trIdx = vertexIndex[trKey.str()];

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
    double weight;                   // Face weight (cross-ratio)
};

// Global face storage
static std::vector<AztecFace> g_aztecFaces;

// =============================================================================
// STORED FACE WEIGHTS (checkpointed at 2k²+2k+1 face counts)
// =============================================================================

struct StoredFaceWeights {
    int k;                                      // Level index
    double root;                                // k=0 only: single ROOT weight
    double alpha_top, alpha_bottom;             // Extreme weights at (0,max), (0,-max)
    double alpha_left, alpha_right;             // Extreme weights at (-max,0), (max,0)
    std::map<std::pair<int,int>, double> beta;  // Diagonal weights beta(i,j), |i|+|j|=k
    std::map<std::pair<int,int>, double> gamma; // Inner weights gamma(i,j), |i|+|j|<=k-1
};

static std::vector<StoredFaceWeights> g_storedWeights;
static std::set<int> g_capturedKValues;  // Track which k values we've captured

// Check if n = 2k²+2k+1 for some non-negative integer k, return k or -1
static int checkFaceCountFormula(int n) {
    // 2k²+2k+1 = n => k = (-2 + sqrt(4 + 8(n-1))) / 4 = (-1 + sqrt(2n-1)) / 2
    // For k=0: n=1, k=1: n=5, k=2: n=13, k=3: n=25, k=4: n=41, ...
    for (int k = 0; k <= 20; k++) {
        if (2*k*k + 2*k + 1 == n) return k;
    }
    return -1;
}

// Categorize and store face weights for level k
static void storeFaceWeightsForK(int k) {
    if (g_capturedKValues.count(k)) return;  // Already captured

    StoredFaceWeights sw;
    sw.k = k;
    sw.root = 0;
    sw.alpha_top = sw.alpha_bottom = sw.alpha_left = sw.alpha_right = 0;

    if (k == 0) {
        // Special case: just one ROOT face
        if (!g_aztecFaces.empty()) {
            sw.root = g_aztecFaces[0].weight;
        }
    } else {
        // k >= 1: categorize faces by their centroid position
        // BIG SQUARE has vertices at (±(k+3/2), ±(k+3/2))
        // Actually, looking at Aztec diamond structure:
        // - max coordinate for face centers is around k
        double maxCoord = k;  // Approximate max coordinate for face centers

        for (const auto& face : g_aztecFaces) {
            double fx = face.cx;
            double fy = face.cy;
            int ix = (int)std::round(fx);
            int iy = (int)std::round(fy);

            // Check for alpha (extreme) faces
            // These are at (0, ±maxCoord) and (±maxCoord, 0)
            if (std::abs(ix) + std::abs(iy) == k && (ix == 0 || iy == 0)) {
                if (iy > 0 && ix == 0) sw.alpha_top = face.weight;
                else if (iy < 0 && ix == 0) sw.alpha_bottom = face.weight;
                else if (ix > 0 && iy == 0) sw.alpha_right = face.weight;
                else if (ix < 0 && iy == 0) sw.alpha_left = face.weight;
            }
            // Check for beta (diagonal) faces: |i|+|j|=k, i≠0, j≠0, i≠±k, j≠±k
            else if (std::abs(ix) + std::abs(iy) == k && ix != 0 && iy != 0) {
                sw.beta[{ix, iy}] = face.weight;
            }
            // Check for gamma (inner) faces: |i|+|j| <= k-1
            else if (std::abs(ix) + std::abs(iy) <= k - 1) {
                sw.gamma[{ix, iy}] = face.weight;
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
}

// Try to capture face weights if current face count matches formula
static void tryCaptureFaceWeights() {
    int numFaces = (int)g_aztecFaces.size();
    int k = checkFaceCountFormula(numFaces);
    if (k >= 0 && !g_capturedKValues.count(k)) {
        storeFaceWeightsForK(k);
    }
}

// Find the edge connecting two vertices (returns edge index or -1)
static int findEdge(int v1, int v2) {
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        if ((g_aztecEdges[i].v1 == v1 && g_aztecEdges[i].v2 == v2) ||
            (g_aztecEdges[i].v1 == v2 && g_aztecEdges[i].v2 == v1)) {
            return (int)i;
        }
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

                // Compute face weight
                double weight = 1.0;
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
                        double wt1 = 1.0, wt2 = 1.0;
                        for (int e = 0; e < nE; e++) {
                            int a = g_aztecEdges[e].v1, b = g_aztecEdges[e].v2;
                            if ((a==ws && b==bs) || (a==bs && b==ws)) wt1 = g_aztecEdges[e].weight;
                            if ((a==wnext && b==bs) || (a==bs && b==wnext)) wt2 = g_aztecEdges[e].weight;
                        }
                        weight *= wt1 / wt2;
                    }
                }

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
    oss << std::setprecision(10);
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
    oss << std::setprecision(10);
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

    oss << "]}";
    return oss.str();
}

// Generate JSON for Aztec graph
static std::string getAztecGraphJSONInternal() {
    std::ostringstream oss;
    oss << std::setprecision(10);
    oss << "{";
    oss << "\"level\":" << g_aztecLevel;
    oss << ",\"reductionStep\":" << g_aztecReductionStep;

    // Output vertices
    oss << ",\"vertices\":[";
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        if (i > 0) oss << ",";
        oss << "{\"x\":" << g_aztecVertices[i].x
            << ",\"y\":" << g_aztecVertices[i].y
            << ",\"isWhite\":" << (g_aztecVertices[i].isWhite ? "true" : "false")
            << ",\"inVgauge\":" << (g_aztecVertices[i].inVgauge ? "true" : "false")
            << ",\"toContract\":" << (g_aztecVertices[i].toContract ? "true" : "false")
            << "}";
    }
    oss << "]";

    // Output edges
    oss << ",\"edges\":[";
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        if (i > 0) oss << ",";
        oss << "{\"v1\":" << g_aztecEdges[i].v1
            << ",\"v2\":" << g_aztecEdges[i].v2
            << ",\"weight\":" << g_aztecEdges[i].weight
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
int getProgress() {
    return g_progress;
}

EMSCRIPTEN_KEEPALIVE
void resetProgress() {
    g_progress = 0;
}

EMSCRIPTEN_KEEPALIVE
void setN(int n) {
    if (n < 1) n = 1;
    if (n > 50) n = 50;
    g_n = n;
}

EMSCRIPTEN_KEEPALIVE
void initCoefficients() {
    initUniformCoefficients();
}

EMSCRIPTEN_KEEPALIVE
void computeTembedding() {
    initUniformCoefficients();  // For now, always use uniform coefficients
    computeTembeddingRecurrence();
}

EMSCRIPTEN_KEEPALIVE
char* getTembeddingJSON() {
    std::ostringstream oss;
    oss << std::setprecision(10);
    oss << "{";

    // Output parameters
    oss << "\"n\":" << g_n;
    oss << ",\"a\":" << g_a;

    // Vertex type names
    const char* vertexTypeNames[] = {
        "boundary_corner", "axis_horizontal", "axis_vertical",
        "diag_positive_j", "diag_negative_j",
        "interior_passthrough", "interior_recurrence"
    };

    // Output T-embedding at all levels for step-by-step visualization
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
                << ",\"type\":\"" << vertexTypeNames[v.type] << "\""
                << ",\"sourceLevel\":" << v.sourceLevel
                << ",\"coeff\":" << v.coeff
                << ",\"deps\":[";
            bool firstDep = true;
            for (const auto& dep : v.deps) {
                if (!firstDep) oss << ",";
                firstDep = false;
                oss << "\"" << dep << "\"";
            }
            oss << "]}";
        }
        oss << "]}";
    }
    oss << "]";

    // Output coefficient arrays for display
    oss << ",\"alpha\":[";
    for (size_t i = 1; i < g_alpha.size(); i++) {
        if (i > 1) oss << ",";
        oss << g_alpha[i];
    }
    oss << "]";

    oss << "}";

    std::string result = oss.str();
    char* out = (char*)std::malloc(result.size() + 1);
    std::strcpy(out, result.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    std::free(str);
}

// -----------------------------------------------------------------------------
// AZTEC GRAPH EXPORTED FUNCTIONS
// -----------------------------------------------------------------------------

EMSCRIPTEN_KEEPALIVE
void setAztecGraphLevel(int k) {
    if (k < 1) k = 1;
    if (k > 20) k = 20;
    g_aztecLevel = k;
}

EMSCRIPTEN_KEEPALIVE
void generateAztecGraph(int k) {
    if (k < 1) k = 1;
    if (k > 20) k = 20;
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

EMSCRIPTEN_KEEPALIVE
void aztecGraphStepDown() {
    aztecStepDown();
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

} // extern "C"
