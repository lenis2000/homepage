/*
  2025-12-11-t-embedding-arbitrary-weights.cpp

  T-embedding of Aztec diamond using Berggren-Russkikh Proposition recurrence.
  Uses arbitrary coefficients α_n, β_{j,n}, γ_{j,k,n} for the recurrence formulas.

  Two-phase algorithm:
  1. Going DOWN (n → 1): Compute coefficients from edge weights (TODO - for now all 1s)
  2. Going UP (1 → n): Build T-embedding using recurrence formulas

  Compile command (AI agent: use single line for auto-approval):
    emcc 2025-12-11-t-embedding-arbitrary-weights.cpp -o 2025-12-11-t-embedding-arbitrary-weights.js -s WASM=1 -s "EXPORTED_FUNCTIONS=['_setN','_initCoefficients','_computeTembedding','_getTembeddingJSON','_generateAztecGraph','_getAztecGraphJSON','_randomizeAztecWeights','_setAztecGraphLevel','_aztecGraphStepDown','_aztecGraphStepUp','_getAztecReductionStep','_canAztecStepUp','_canAztecStepDown','_freeString','_getProgress','_resetProgress']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math && mv 2025-12-11-t-embedding-arbitrary-weights.js ../../js/
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

static int g_n = 5;           // Diamond size parameter
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
static int g_aztecLevel = 4;  // Current graph level k (default n=4)
static int g_aztecReductionStep = 0;  // 0=original, 1=gauge transformed, 2=degree-2 removed, 3=parallel merged
static std::vector<AztecVertex> g_aztecVertices;
static std::vector<AztecEdge> g_aztecEdges;

// Store graph history for stepping back (stack of states)
struct AztecGraphState {
    std::vector<AztecVertex> vertices;
    std::vector<AztecEdge> edges;
    int step;
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

// Generate Aztec diamond graph for level k
// Vertices at half-integer coordinates (i+0.5, j+0.5) where |x| + |y| <= k + 0.5
static void generateAztecGraphInternal(int k) {
    g_aztecVertices.clear();
    g_aztecEdges.clear();
    g_aztecLevel = k;

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
    state.step = g_aztecReductionStep;
    g_aztecHistory.push_back(state);
}

// Restore previous state from history
static bool popAztecState() {
    if (g_aztecHistory.empty()) return false;
    AztecGraphState state = g_aztecHistory.back();
    g_aztecHistory.pop_back();
    g_aztecVertices = state.vertices;
    g_aztecEdges = state.edges;
    g_aztecReductionStep = state.step;
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

    // Log all edges after black gauge
    printf("=== AFTER BLACK GAUGE (Step 1) ===\n");
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        int v1 = g_aztecEdges[i].v1;
        int v2 = g_aztecEdges[i].v2;
        double x1 = g_aztecVertices[v1].x, y1 = g_aztecVertices[v1].y;
        double x2 = g_aztecVertices[v2].x, y2 = g_aztecVertices[v2].y;
        printf("Edge (%.1f,%.1f)-(%.1f,%.1f): w=%.10f %s\n",
               x1, y1, x2, y2, g_aztecEdges[i].weight,
               g_aztecEdges[i].gaugeTransformed ? "[T]" : "");
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

    int n = g_aztecLevel;

    // Clear previous vertex highlights (but keep edge gaugeTransformed flags!)
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

    printf("Looking for BLACK boundary vertices on x+y = %d and x+y = %d\n", n, -n);

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
            g_aztecVertices[idx].inVgauge = true;
            printf("  Found positive: (%d,%d) = (%.1f,%.1f), x+y=%.1f\n", i, j, x, y, sum);
        }
        // Negative diagonal: x + y = -n
        else if (std::abs(sum + n) < 0.01) {
            negativeDiagVertices.push_back({(int)idx, i, j, false});
            g_aztecVertices[idx].inVgauge = true;
            printf("  Found negative: (%d,%d) = (%.1f,%.1f), x+y=%.1f\n", i, j, x, y, sum);
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
    // Both are on x+y = n-1 (one step toward interior)
    // Reference = edge to (i-1, j) (toward left/previous)
    // Equalize = edge to (i, j-1) (toward bottom)
    // Gauge vertex = (i, j-1)
    printf("Processing %zu positive diagonal BLACK boundary vertices\n", positiveDiagVertices.size());
    for (const auto& bv : positiveDiagVertices) {
        int bIdx = bv.idx;
        int i = bv.i, j = bv.j;

        printf("Processing BLACK boundary vertex (%d,%d) = (%.1f,%.1f)\n", i, j, i+0.5, j+0.5);

        // Two neighbors: (i-1, j) and (i, j-1)
        int n1i = i - 1, n1j = j;     // neighbor 1 (left)
        int n2i = i, n2j = j - 1;     // neighbor 2 (bottom)

        auto n1It = vertexIndex.find(makeIntKey(n1i, n1j));
        auto n2It = vertexIndex.find(makeIntKey(n2i, n2j));

        if (n1It == vertexIndex.end()) {
            printf("  Neighbor 1 (%d,%d) not found\n", n1i, n1j);
            continue;
        }
        if (n2It == vertexIndex.end()) {
            printf("  Neighbor 2 (%d,%d) not found\n", n2i, n2j);
            continue;
        }

        int n1Idx = n1It->second;
        int n2Idx = n2It->second;

        int edge1Idx = findEdge(bIdx, n1Idx);
        int edge2Idx = findEdge(bIdx, n2Idx);

        if (edge1Idx < 0 || edge2Idx < 0) {
            printf("  Edge not found: edge1=%d, edge2=%d\n", edge1Idx, edge2Idx);
            continue;
        }

        double edge1Weight = g_aztecEdges[edge1Idx].weight;
        double edge2Weight = g_aztecEdges[edge2Idx].weight;

        printf("  Edge to (%d,%d): w=%.6f %s\n", n1i, n1j, edge1Weight,
               g_aztecEdges[edge1Idx].gaugeTransformed ? "[T]" : "");
        printf("  Edge to (%d,%d): w=%.6f %s\n", n2i, n2j, edge2Weight,
               g_aztecEdges[edge2Idx].gaugeTransformed ? "[T]" : "");

        // Determine which edge to use as reference (already transformed) and which to equalize
        bool edge1Trans = g_aztecEdges[edge1Idx].gaugeTransformed;
        bool edge2Trans = g_aztecEdges[edge2Idx].gaugeTransformed;

        int refEdgeIdx, eqEdgeIdx, gaugeNeighborIdx;
        if (edge1Trans && !edge2Trans) {
            // Edge 1 is reference, gauge neighbor 2
            refEdgeIdx = edge1Idx;
            eqEdgeIdx = edge2Idx;
            gaugeNeighborIdx = n2Idx;
            printf("  Using edge1 as reference, gauging neighbor2 (%d,%d)\n", n2i, n2j);
        } else if (edge2Trans && !edge1Trans) {
            // Edge 2 is reference, gauge neighbor 1
            refEdgeIdx = edge2Idx;
            eqEdgeIdx = edge1Idx;
            gaugeNeighborIdx = n1Idx;
            printf("  Using edge2 as reference, gauging neighbor1 (%d,%d)\n", n1i, n1j);
        } else if (!edge1Trans && !edge2Trans) {
            // Neither transformed: use edge1 as reference, gauge neighbor 2
            refEdgeIdx = edge1Idx;
            eqEdgeIdx = edge2Idx;
            gaugeNeighborIdx = n2Idx;
            printf("  Neither transformed, using edge1 as ref, gauging neighbor2 (%d,%d)\n", n2i, n2j);
        } else {
            // Both already transformed - skip
            printf("  Both edges already transformed, skipping\n");
            continue;
        }

        double refWeight = g_aztecEdges[refEdgeIdx].weight;
        double eqWeight = g_aztecEdges[eqEdgeIdx].weight;

        if (eqWeight < 1e-10) continue;
        double lambda = refWeight / eqWeight;

        printf("  lambda = %.6f / %.6f = %.6f\n", refWeight, eqWeight, lambda);

        // Apply λ to all edges at the gauge neighbor
        for (const auto& [neighbor, eIdx] : adjacency[gaugeNeighborIdx]) {
            if (!g_aztecEdges[eIdx].gaugeTransformed) {
                printf("    Multiplying edge %d by %.6f\n", eIdx, lambda);
                g_aztecEdges[eIdx].weight *= lambda;
                g_aztecEdges[eIdx].gaugeTransformed = true;
            } else {
                printf("    Skipping edge %d (already transformed)\n", eIdx);
            }
        }
    }

    // Process negative diagonal (x + y = -n)
    // For BLACK vertex at (i, j), its two WHITE neighbors are at (i+1, j) and (i, j+1)
    printf("Processing %zu negative diagonal BLACK boundary vertices\n", negativeDiagVertices.size());
    for (const auto& bv : negativeDiagVertices) {
        int bIdx = bv.idx;
        int i = bv.i, j = bv.j;

        printf("Processing BLACK boundary vertex (%d,%d) = (%.1f,%.1f)\n", i, j, i+0.5, j+0.5);

        // Two neighbors: (i+1, j) and (i, j+1)
        int n1i = i + 1, n1j = j;     // neighbor 1 (right)
        int n2i = i, n2j = j + 1;     // neighbor 2 (top)

        auto n1It = vertexIndex.find(makeIntKey(n1i, n1j));
        auto n2It = vertexIndex.find(makeIntKey(n2i, n2j));

        if (n1It == vertexIndex.end() || n2It == vertexIndex.end()) {
            printf("  Neighbor not found\n");
            continue;
        }

        int n1Idx = n1It->second;
        int n2Idx = n2It->second;

        int edge1Idx = findEdge(bIdx, n1Idx);
        int edge2Idx = findEdge(bIdx, n2Idx);

        if (edge1Idx < 0 || edge2Idx < 0) continue;

        double edge1Weight = g_aztecEdges[edge1Idx].weight;
        double edge2Weight = g_aztecEdges[edge2Idx].weight;

        printf("  Edge to (%d,%d): w=%.6f %s\n", n1i, n1j, edge1Weight,
               g_aztecEdges[edge1Idx].gaugeTransformed ? "[T]" : "");
        printf("  Edge to (%d,%d): w=%.6f %s\n", n2i, n2j, edge2Weight,
               g_aztecEdges[edge2Idx].gaugeTransformed ? "[T]" : "");

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
            printf("  Both edges already transformed, skipping\n");
            continue;
        }

        double refWeight = g_aztecEdges[refEdgeIdx].weight;
        double eqWeight = g_aztecEdges[eqEdgeIdx].weight;

        if (eqWeight < 1e-10) continue;
        double lambda = refWeight / eqWeight;

        printf("  lambda = %.6f\n", lambda);

        for (const auto& [neighbor, eIdx] : adjacency[gaugeNeighborIdx]) {
            if (!g_aztecEdges[eIdx].gaugeTransformed) {
                printf("    Multiplying edge %d by %.6f\n", eIdx, lambda);
                g_aztecEdges[eIdx].weight *= lambda;
                g_aztecEdges[eIdx].gaugeTransformed = true;
            } else {
                printf("    Skipping edge %d (already transformed)\n", eIdx);
            }
        }
    }

    // Log all edges after white gauge
    printf("=== AFTER WHITE GAUGE (Step 2) ===\n");
    printf("BLACK boundary vertices on x+y=%d and x+y=%d:\n", n, -n);
    for (const auto& bv : positiveDiagVertices) {
        printf("  Positive: (%d,%d) = (%.1f,%.1f)\n", bv.i, bv.j, bv.i+0.5, bv.j+0.5);
    }
    for (const auto& bv : negativeDiagVertices) {
        printf("  Negative: (%d,%d) = (%.1f,%.1f)\n", bv.i, bv.j, bv.i+0.5, bv.j+0.5);
    }
    printf("All edges:\n");
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        int v1 = g_aztecEdges[i].v1;
        int v2 = g_aztecEdges[i].v2;
        double x1 = g_aztecVertices[v1].x, y1 = g_aztecVertices[v1].y;
        double x2 = g_aztecVertices[v2].x, y2 = g_aztecVertices[v2].y;
        printf("Edge (%.1f,%.1f)-(%.1f,%.1f): w=%.10f %s\n",
               x1, y1, x2, y2, g_aztecEdges[i].weight,
               g_aztecEdges[i].gaugeTransformed ? "[T]" : "");
    }

    g_aztecReductionStep = 2;
}

// STEP 3: Final cleanup - mark as fully reduced
static void aztecStep3_Finalize() {
    if (g_aztecReductionStep != 2) return;

    pushAztecState();

    // Clear all highlighting
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        g_aztecVertices[i].inVgauge = false;
        g_aztecVertices[i].toContract = false;
    }
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        g_aztecEdges[i].gaugeTransformed = false;
    }

    g_aztecReductionStep = 3;
}

// Step down: advance to next reduction step
static void aztecStepDown() {
    switch (g_aztecReductionStep) {
        case 0: aztecStep1_GaugeTransform(); break;
        case 1: aztecStep2_WhiteGaugeTransform(); break;
        case 2: aztecStep3_Finalize(); break;
        default: break;  // Already fully reduced
    }
}

// Step up: restore previous state
static void aztecStepUp() {
    popAztecState();
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
    return (g_aztecReductionStep < 3) ? 1 : 0;
}

} // extern "C"
