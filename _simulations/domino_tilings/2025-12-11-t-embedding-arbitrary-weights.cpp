/*
  2025-12-11-t-embedding-arbitrary-weights.cpp

  T-embedding of Aztec diamond using Berggren-Russkikh Proposition recurrence.
  Uses arbitrary coefficients α_n, β_{j,n}, γ_{j,k,n} for the recurrence formulas.

  Two-phase algorithm:
  1. Going DOWN (n → 1): Compute coefficients from edge weights (TODO - for now all 1s)
  2. Going UP (1 → n): Build T-embedding using recurrence formulas

  Compile command (AI agent: use single line for auto-approval):
    emcc 2025-12-11-t-embedding-arbitrary-weights.cpp -o 2025-12-11-t-embedding-arbitrary-weights.js -s WASM=1 -s "EXPORTED_FUNCTIONS=['_setN','_initCoefficients','_computeTembedding','_getTembeddingJSON','_generateAztecGraph','_getAztecGraphJSON','_randomizeAztecWeights','_setAztecGraphLevel','_freeString','_getProgress','_resetProgress']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math && mv 2025-12-11-t-embedding-arbitrary-weights.js ../../js/
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
};

// Aztec diamond graph edge with weight
struct AztecEdge {
    int v1, v2;       // Indices into vertex array
    double weight;    // Edge weight (0.5 to 2.0)
    bool isHorizontal; // True if horizontal edge, false if vertical
};

// Global Aztec graph storage
static int g_aztecLevel = 5;  // Current graph level k
static std::vector<AztecVertex> g_aztecVertices;
static std::vector<AztecEdge> g_aztecEdges;

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
                g_aztecEdges.push_back(e);
            }
        }
    }
}

// Randomize all edge weights
static void randomizeAztecWeightsInternal() {
    g_rngState = (unsigned int)(g_rngState * 1103515245 + 12345);  // Change seed
    for (size_t i = 0; i < g_aztecEdges.size(); i++) {
        g_aztecEdges[i].weight = randomWeight();
    }
}

// Generate JSON for Aztec graph
static std::string getAztecGraphJSONInternal() {
    std::ostringstream oss;
    oss << std::setprecision(10);
    oss << "{";
    oss << "\"level\":" << g_aztecLevel;

    // Output vertices
    oss << ",\"vertices\":[";
    for (size_t i = 0; i < g_aztecVertices.size(); i++) {
        if (i > 0) oss << ",";
        oss << "{\"x\":" << g_aztecVertices[i].x
            << ",\"y\":" << g_aztecVertices[i].y
            << ",\"isWhite\":" << (g_aztecVertices[i].isWhite ? "true" : "false")
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

} // extern "C"
