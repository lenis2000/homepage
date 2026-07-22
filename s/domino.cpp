/*

emcc domino.cpp -o domino.js\
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_simulateAztec6x2','_simulateAztecPeriodic','_performGlauberSteps','_simulateAztecVertical','_simulateAztecHorizontal','_wasGlauberActive','_freeString','_getProgress','_malloc','_free']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","HEAPF64"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s "EXCEPTION_CATCHING_ALLOWED=['simulateAztec','simulateAztec6x2','simulateAztecPeriodic','simulateAztecHorizontal','simulateAztecVertical','performGlauberSteps']" \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math -flto -DNDEBUG -fno-rtti


Features:
- 3x3 periodic weights for random domino tilings of Aztec diamond
- 2x2 periodic weights support added (May 2025)
- Memory efficient implementation

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
#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <stdexcept>

using namespace std;

struct Xoshiro256pp {
    uint64_t s[4];

    explicit Xoshiro256pp(uint64_t seed = 0) {
        seedState(seed);
    }

    static inline uint64_t rotl(const uint64_t x, int k) {
        return (x << k) | (x >> (64 - k));
    }

    static inline uint64_t splitmix64(uint64_t& x) {
        uint64_t z = (x += 0x9e3779b97f4a7c15ULL);
        z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
        z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
        return z ^ (z >> 31);
    }

    void seedState(uint64_t seed) {
        uint64_t x = seed;
        for (int i = 0; i < 4; ++i) {
            s[i] = splitmix64(x);
        }
    }

    inline uint64_t next() {
        const uint64_t result = rotl(s[0] + s[3], 23) + s[0];
        const uint64_t t = s[1] << 17;
        s[2] ^= s[0];
        s[3] ^= s[1];
        s[1] ^= s[2];
        s[0] ^= s[3];
        s[2] ^= t;
        s[3] = rotl(s[3], 45);
        return result;
    }

    inline double next_double() {
        const uint64_t v = (next() >> 12) | 0x3FF0000000000000ULL;
        double d;
        memcpy(&d, &v, sizeof(d));
        return d - 1.0;
    }
};

static uint64_t makeSamplerSeed() {
    std::random_device rd;
    uint64_t seed = static_cast<uint64_t>(
        std::chrono::high_resolution_clock::now().time_since_epoch().count());
    seed ^= static_cast<uint64_t>(rd()) << 32;
    seed ^= static_cast<uint64_t>(rd());
    return seed;
}

static Xoshiro256pp shuffleRng(makeSamplerSeed());
static std::mt19937 glauberRng(std::random_device{}());

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

template <typename T>
class FlatMatrix {
private:
    vector<T> data_;
    int rows_ = 0;
    int cols_ = 0;

public:
    FlatMatrix() = default;

    FlatMatrix(int rows, int cols, const T& value = T()) {
        reset(rows, cols, value);
    }

    void reset(int rows, int cols, const T& value = T()) {
        const size_t needed = static_cast<size_t>(rows) * static_cast<size_t>(cols);
        if (data_.size() < needed) {
            data_.resize(needed);
        }
        rows_ = rows;
        cols_ = cols;
        std::fill(data_.begin(), data_.begin() + needed, value);
    }

    // Use only when the caller overwrites every active cell. This avoids a
    // full matrix clear in the shuffling ping-pong loop.
    void resetUninitialized(int rows, int cols) {
        const size_t needed = static_cast<size_t>(rows) * static_cast<size_t>(cols);
        if (data_.size() < needed) {
            data_.resize(needed);
        }
        rows_ = rows;
        cols_ = cols;
    }

    T* operator[](int row) {
        return data_.data() + static_cast<size_t>(row) * cols_;
    }

    const T* operator[](int row) const {
        return data_.data() + static_cast<size_t>(row) * cols_;
    }

    int size() const { return rows_; }
    int rows() const { return rows_; }
    int cols() const { return cols_; }
};

using MatrixDouble = FlatMatrix<double>;
using MatrixInt = FlatMatrix<int>;
using MatrixConfig = FlatMatrix<uint8_t>;
using Vertex = pair<int, int>;

/* ---------- Global state for incremental Glauber dynamics ---------- */
static MatrixConfig   g_conf;        // current domino configuration
static MatrixDouble   g_W;           // current weight matrix
static int            g_N    = 0;    // linear size of g_conf (2n)
static string         g_periodicity = "uniform"; // "uniform", "2x2", or "3x3"
// Store weights based on periodicity
static double         g_a = 1.0, g_b = 1.0; // For 2x2
static array<double, 9> g_w = {1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0}; // For 3x3 (w1 to w9)
static array<double, 12> g_w6x2 = {1.0, 20.0, 1.0, 20.0, 1.0, 20.0, 1.0, 20.0, 1.0, 20.0, 1.0, 20.0}; // For 6x2

// Flag to track if a Glauber run is active
static bool g_glauber_active = false;
/* ------------------------------------------------------------------ */

// Helper to get the weight of a plaquette configuration
// Uses the globally stored weight matrix g_W
double plaquetteWeight(int r, int c, bool horizontal) {
    /* Calculates the weight contribution of a 2x2 plaquette at (r, c).
       'horizontal' being true corresponds to the state where
       markers are at (r, c) [NW] and (r+1, c+1) [SE].
       'horizontal' being false corresponds to markers at
       (r+1, c) [SW] and (r, c+1) [NE].

       Uses the global weight matrix g_W.
    */
    if (r < 0 || r + 1 >= g_N || c < 0 || c + 1 >= g_N) {
         // Bounds check - should not happen if called correctly
         return 1.0; // Or some other default/error handling
    }

    // Uniform samples do not need to retain a dense 2n x 2n matrix merely
    // for later Glauber updates.
    if (g_periodicity == "uniform") {
        return 1.0;
    }

    const double wNW = g_W[r][c];         // Weight at NW corner (r, c)
    const double wNE = g_W[r][c + 1];     // Weight at NE corner (r, c+1)
    const double wSW = g_W[r + 1][c];     // Weight at SW corner (r+1, c)
    const double wSE = g_W[r + 1][c + 1]; // Weight at SE corner (r+1, c+1)

    if (horizontal) {
        // Weight for Horizontal configuration (NW and SE markers)
        return wNW * wSE;
    } else {
        // Weight for Vertical configuration (SW and NE markers)
        return wSW * wNE;
    }
}

// One heat‑bath update on a random 2×2 plaquette using global state
void glauberStep(std::uniform_real_distribution<> &u) {
    if (g_N == 0) return; // No configuration loaded

    // Use global RNG
    std::uniform_int_distribution<> duRow(0, g_N - 2);
    std::uniform_int_distribution<> duCol(0, g_N - 2);
    int i = duRow(glauberRng); // Random row for top-left corner (0 to N-2)
    int j = duCol(glauberRng); // Random col for top-left corner (0 to N-2)

    // Check current state of the 2x2 plaquette at (i, j)
    bool isHH = (g_conf[i][j] == 1 && g_conf[i + 1][j + 1] == 1 &&
                 g_conf[i + 1][j] == 0 && g_conf[i][j + 1] == 0);
    bool isVV = (g_conf[i + 1][j] == 1 && g_conf[i][j + 1] == 1 &&
                 g_conf[i][j] == 0 && g_conf[i + 1][j + 1] == 0);

    if (!(isHH || isVV)) {
        // Not a valid HH or VV plaquette (might be mixed or empty)
        return; // Skip update for invalid states
    }

    // Compute weights using the global weight matrix g_W
    double wHH = plaquetteWeight(i, j, /*horizontal=*/true);
    double wVV = plaquetteWeight(i, j, /*horizontal=*/false);

    // Heat-bath probability for choosing the Horizontal state (HH)
    double pHH = (std::abs(wHH + wVV) < 1e-15) ? 0.5 : (wHH / (wHH + wVV));

    // Decide whether to flip based on the probability
    bool chooseHH = (u(glauberRng) < pHH);

    // If the chosen state matches the current state, do nothing
    if ((chooseHH && isHH) || (!chooseHH && isVV)) {
        return;
    }

    // Flip the state: clear the plaquette first
    g_conf[i][j] = 0;
    g_conf[i][j + 1] = 0;
    g_conf[i + 1][j] = 0;
    g_conf[i + 1][j + 1] = 0;

    // Set the new state
    if (chooseHH) {
        // Place markers for HH state (NW and SE)
        g_conf[i][j] = 1;
        g_conf[i + 1][j + 1] = 1;
    } else {
        // Place markers for VV state (SW and NE)
        g_conf[i + 1][j] = 1;
        g_conf[i][j + 1] = 1;
    }
     g_glauber_active = true; // Mark that Glauber has modified the state
}

class PackedDecisionPyramid {
public:
    int levels = 0;
    vector<uint64_t> offsets;   // offsets[r - 1] is the first bit for the r x r level
    vector<uint32_t> words;

    PackedDecisionPyramid() = default;
    explicit PackedDecisionPyramid(int n) { reset(n); }

    void reset(int n) {
        levels = n;
        offsets.assign(static_cast<size_t>(levels) + 1, 0);
        for (int r = 1; r <= levels; ++r) {
            offsets[r] = offsets[r - 1] + static_cast<uint64_t>(r) * static_cast<uint64_t>(r);
        }
        const uint64_t totalWords = (offsets[levels] + 31ULL) >> 5;
        words.assign(static_cast<size_t>(totalWords), 0U);
    }

    inline uint64_t bitIndex(int rows, int i, int j) const {
        return offsets[rows - 1] + static_cast<uint64_t>(i) * static_cast<uint64_t>(rows) + static_cast<uint64_t>(j);
    }

    inline void set(int rows, int i, int j, bool value) {
        const uint64_t idx = bitIndex(rows, i, j);
        const uint32_t mask = 1U << (idx & 31U);
        uint32_t& word = words[static_cast<size_t>(idx >> 5)];
        if (value) word |= mask;
        else word &= ~mask;
    }

    inline bool get(int rows, int i, int j) const {
        const uint64_t idx = bitIndex(rows, i, j);
        return (words[static_cast<size_t>(idx >> 5)] >> (idx & 31U)) & 1U;
    }
};

void normalizeMatrixIfNeeded(MatrixDouble& matrix, double maxAbs) {
    if (maxAbs <= 0.0 || !std::isfinite(maxAbs)) {
        return;
    }

    // The square-move recurrence is homogeneous under a common rescaling of
    // all entries in the current matrix.  Keeping the scale moderate avoids
    // both overflow and the old incorrect practice of clamping tiny
    // denominators to an arbitrary epsilon (which changed the measure).
    if (maxAbs < 1e-100 || maxAbs > 1e100) {
        for (int i = 0; i < matrix.rows(); ++i) {
            for (int j = 0; j < matrix.cols(); ++j) {
                matrix[i][j] /= maxAbs;
            }
        }
    }
}

class PeriodicProbabilityPyramid {
public:
    int levels = 0;
    int blockRows = 0;
    int blockCols = 0;
    vector<double> probabilities;

    PeriodicProbabilityPyramid() = default;

    PeriodicProbabilityPyramid(int levelCount, int rowPeriod, int colPeriod) {
        reset(levelCount, rowPeriod, colPeriod);
    }

    void reset(int levelCount, int rowPeriod, int colPeriod) {
        if (levelCount <= 0 || rowPeriod <= 0 || colPeriod <= 0 ||
            (rowPeriod & 1) || (colPeriod & 1)) {
            throw std::runtime_error("Periodic probability dimensions must be positive and even");
        }
        levels = levelCount;
        blockRows = rowPeriod / 2;
        blockCols = colPeriod / 2;
        probabilities.assign(
            static_cast<size_t>(levels) * static_cast<size_t>(blockRows) * static_cast<size_t>(blockCols),
            0.0);
    }

    inline double& at(int rows, int i, int j) {
        const size_t levelOffset = static_cast<size_t>(rows - 1) * blockRows * blockCols;
        return probabilities[levelOffset + static_cast<size_t>(i) * blockCols + j];
    }

    inline double get(int rows, int i, int j) const {
        const size_t levelOffset = static_cast<size_t>(rows - 1) * blockRows * blockCols;
        const int tileRow = i % blockRows;
        const int tileCol = j % blockCols;
        return probabilities[levelOffset + static_cast<size_t>(tileRow) * blockCols + tileCol];
    }
};

PeriodicProbabilityPyramid computePeriodicProbabilityPyramid(
    const MatrixDouble& weights,
    int levels,
    int rowPeriod,
    int colPeriod) {

    if (weights.rows() < rowPeriod || weights.cols() < colPeriod ||
        rowPeriod <= 0 || colPeriod <= 0 || (rowPeriod & 1) || (colPeriod & 1)) {
        throw std::runtime_error("Invalid periodic weight tile");
    }

    PeriodicProbabilityPyramid result(levels, rowPeriod, colPeriod);
    MatrixDouble currentValue(rowPeriod, colPeriod, 0.0);
    MatrixInt currentExp(rowPeriod, colPeriod, 0);
    MatrixDouble nextValue(rowPeriod, colPeriod, 0.0);
    MatrixInt nextExp(rowPeriod, colPeriod, 0);

    double currentMaxAbs = 0.0;
    for (int i = 0; i < rowPeriod; ++i) {
        for (int j = 0; j < colPeriod; ++j) {
            const double weight = weights[i][j];
            if (fabs(weight) < 1e-9) {
                currentValue[i][j] = 1.0;
                currentExp[i][j] = 1;
            } else {
                currentValue[i][j] = weight;
                currentExp[i][j] = 0;
            }
            currentMaxAbs = std::max(currentMaxAbs, fabs(currentValue[i][j]));
        }
    }
    normalizeMatrixIfNeeded(currentValue, currentMaxAbs);

    const int probabilityRows = rowPeriod / 2;
    const int probabilityCols = colPeriod / 2;
    for (int rows = levels; rows >= 1; --rows) {
        for (int i = 0; i < probabilityRows; ++i) {
            for (int j = 0; j < probabilityCols; ++j) {
                const int i0 = i << 1;
                const int j0 = j << 1;
                const int expMain = currentExp[i0][j0] + currentExp[i0 + 1][j0 + 1];
                const int expOther = currentExp[i0 + 1][j0] + currentExp[i0][j0 + 1];

                double probability;
                if (expMain > expOther) {
                    probability = 0.0;
                } else if (expMain < expOther) {
                    probability = 1.0;
                } else {
                    const double prodMain = currentValue[i0 + 1][j0 + 1] * currentValue[i0][j0];
                    const double prodOther = currentValue[i0 + 1][j0] * currentValue[i0][j0 + 1];
                    const double denom = prodMain + prodOther;
                    if (denom == 0.0 || !std::isfinite(denom)) {
                        throw std::runtime_error("Degenerate creation probability denominator");
                    }
                    probability = prodMain / denom;
                }
                result.at(rows, i, j) = probability;
            }
        }

        if (rows == 1) {
            break;
        }

        double nextMaxAbs = 0.0;
        for (int i = 0; i < rowPeriod; ++i) {
            const int ii = (i + 2 * (i & 1)) % rowPeriod;
            const int nextI = (i + 1) % rowPeriod;
            for (int j = 0; j < colPeriod; ++j) {
                const int jj = (j + 2 * (j & 1)) % colPeriod;
                const int nextJ = (j + 1) % colPeriod;

                const double current = currentValue[ii][jj];
                const double diag = currentValue[nextI][nextJ];
                const double right = currentValue[ii][nextJ];
                const double down = currentValue[nextI][jj];
                const int currentFlag = currentExp[ii][jj];
                const int diagFlag = currentExp[nextI][nextJ];
                const int rightFlag = currentExp[ii][nextJ];
                const int downFlag = currentExp[nextI][jj];
                const int expMain = currentFlag + diagFlag;
                const int expOther = rightFlag + downFlag;

                double denominator;
                int denominatorExp;
                if (expMain == expOther) {
                    denominator = current * diag + right * down;
                    denominatorExp = expMain;
                } else if (expMain < expOther) {
                    denominator = current * diag;
                    denominatorExp = expMain;
                } else {
                    denominator = right * down;
                    denominatorExp = expOther;
                }
                if (denominator == 0.0 || !std::isfinite(denominator)) {
                    throw std::runtime_error("Degenerate square-move denominator");
                }

                nextValue[i][j] = current / denominator;
                nextExp[i][j] = currentFlag - denominatorExp;
                nextMaxAbs = std::max(nextMaxAbs, fabs(nextValue[i][j]));
            }
        }

        normalizeMatrixIfNeeded(nextValue, nextMaxAbs);
        std::swap(currentValue, nextValue);
        std::swap(currentExp, nextExp);
    }

    return result;
}

PackedDecisionPyramid computeDecisionPyramid(const MatrixDouble& weights) {
    const int dim = weights.size();
    if (dim <= 0 || (dim & 1)) {
        throw std::runtime_error("Weight matrix dimension must be positive and even");
    }

    const int levels = dim / 2;
    PackedDecisionPyramid decisions(levels);

    MatrixDouble currentValue(dim, dim, 0.0);
    MatrixInt currentExp(dim, dim, 0);
    MatrixDouble nextValue;
    MatrixInt nextExp;

    double currentMaxAbs = 0.0;
    for (int i = 0; i < dim; ++i) {
        for (int j = 0; j < dim; ++j) {
            if (fabs(weights[i][j]) < 1e-9) {
                currentValue[i][j] = 1.0;
                currentExp[i][j] = 1;
            } else {
                currentValue[i][j] = weights[i][j];
                currentExp[i][j] = 0;
            }
            currentMaxAbs = std::max(currentMaxAbs, fabs(currentValue[i][j]));
        }
    }
    normalizeMatrixIfNeeded(currentValue, currentMaxAbs);

    for (int size = dim; size >= 2; size -= 2) {
        const int rows = size / 2;

        for (int i = 0; i < rows; ++i) {
            for (int j = 0; j < rows; ++j) {
                const int i0 = i << 1;
                const int j0 = j << 1;
                const int sum1 = currentExp[i0][j0] + currentExp[i0 + 1][j0 + 1];
                const int sum2 = currentExp[i0 + 1][j0] + currentExp[i0][j0 + 1];

                bool chooseMain;
                if (sum1 > sum2) {
                    chooseMain = false;
                } else if (sum1 < sum2) {
                    chooseMain = true;
                } else {
                    const double prodMain = currentValue[i0 + 1][j0 + 1] * currentValue[i0][j0];
                    const double prodOther = currentValue[i0 + 1][j0] * currentValue[i0][j0 + 1];
                    const double denom = prodMain + prodOther;
                    if (denom == 0.0 || !std::isfinite(denom)) {
                        throw std::runtime_error("Degenerate creation probability denominator");
                    }
                    chooseMain = shuffleRng.next_double() < (prodMain / denom);
                }
                decisions.set(rows, i, j, chooseMain);
            }
        }

        const int nextSize = size - 2;
        if (nextSize == 0) {
            break;
        }

        nextValue.reset(nextSize, nextSize, 0.0);
        nextExp.reset(nextSize, nextSize, 0);
        double nextMaxAbs = 0.0;

        for (int i = 0; i < nextSize; ++i) {
            for (int j = 0; j < nextSize; ++j) {
                const int ii = i + 2 * (i & 1);
                const int jj = j + 2 * (j & 1);

                const double current = currentValue[ii][jj];
                const double diag = currentValue[i + 1][j + 1];
                const double right = currentValue[ii][j + 1];
                const double down = currentValue[i + 1][jj];

                const int currentFlag = currentExp[ii][jj];
                const int diagFlag = currentExp[i + 1][j + 1];
                const int rightFlag = currentExp[ii][j + 1];
                const int downFlag = currentExp[i + 1][jj];

                const int sum1 = currentFlag + diagFlag;
                const int sum2 = rightFlag + downFlag;
                double a2;
                int a2Exp;

                if (sum1 == sum2) {
                    a2 = current * diag + right * down;
                    a2Exp = sum1;
                } else if (sum1 < sum2) {
                    a2 = current * diag;
                    a2Exp = sum1;
                } else {
                    a2 = right * down;
                    a2Exp = sum2;
                }

                if (a2 == 0.0 || !std::isfinite(a2)) {
                    throw std::runtime_error("Degenerate square-move denominator");
                }
                nextValue[i][j] = current / a2;
                nextExp[i][j] = currentFlag - a2Exp;
                nextMaxAbs = std::max(nextMaxAbs, fabs(nextValue[i][j]));
            }
        }

        normalizeMatrixIfNeeded(nextValue, nextMaxAbs);

        std::swap(currentValue, nextValue);
        std::swap(currentExp, nextExp);

        if ((rows & 15) == 0) {
            progressCounter = 1 + static_cast<int>(((levels - rows + 1) / static_cast<double>(levels)) * 9.0);
            emscripten_sleep(0);
        }
    }

    return decisions;
}

static constexpr uint8_t kDelslideBlockTransform[16] = {
    0, 8, 4, 10, 2, 12, 0, 8,
    1, 0, 3, 4, 5, 2, 1, 2
};

struct DelslidePackedRows {
    uint16_t top;
    uint16_t bottom;
};

constexpr array<DelslidePackedRows, 16> makeDelslidePackedRows() {
    array<DelslidePackedRows, 16> result{};
    for (size_t state = 0; state < result.size(); ++state) {
        const uint8_t moved = kDelslideBlockTransform[state];
        result[state] = {
            static_cast<uint16_t>((moved & 1U) | ((moved & 2U) << 7)),
            static_cast<uint16_t>(((moved & 4U) >> 2) | ((moved & 8U) << 5))
        };
    }
    return result;
}

// Compile-time-derived from the authoritative transition table above: this
// retains fast packed row stores without maintaining a second hand-coded map.
static constexpr auto kDelslidePackedRows = makeDelslidePackedRows();

class EmptyBlockBitset {
public:
    int blocks = 0;
    int wordsPerRow = 0;
    vector<uint64_t> words;

    void reset(int newBlocks) {
        blocks = newBlocks;
        wordsPerRow = (blocks + 63) / 64;
        words.resize(static_cast<size_t>(blocks) * wordsPerRow);
    }
};

inline uint8_t delslideStateFromPairs(const uint8_t* top, const uint8_t* bottom) {
    uint16_t topPair;
    uint16_t bottomPair;
    std::memcpy(&topPair, top, sizeof(topPair));
    std::memcpy(&bottomPair, bottom, sizeof(bottomPair));
    return static_cast<uint8_t>(
        (topPair & 1U) |
        ((topPair >> 7) & 2U) |
        ((bottomPair << 2) & 4U) |
        ((bottomPair >> 5) & 8U));
}

void delslideInPlace(MatrixConfig& out, const MatrixConfig& in, EmptyBlockBitset& emptyBlocks) {
    const int n = in.size();
    const int outSize = n + 2;
    out.resetUninitialized(outSize, outSize);
    const int half = n / 2;
    const int blocks = half + 1;
    emptyBlocks.reset(blocks);

    // Embedding, deletion, and sliding are all local on the same aligned
    // 2x2 blocks. Read the shifted input block and apply their combined
    // 16-state lookup in one pass instead of clearing/copying/scanning the
    // whole matrix three separate times.
    for (int blockRow = 0; blockRow < blocks; ++blockRow) {
        uint64_t* emptyRow = emptyBlocks.words.data() +
            static_cast<size_t>(blockRow) * emptyBlocks.wordsPerRow;
        int wordIndex = 0;
        int bitIndex = 0;
        uint64_t emptyWord = 0;
        const int outRow = blockRow << 1;
        const int inputTopRow = outRow - 1;
        const int inputBottomRow = outRow;
        const uint8_t* inputTop = inputTopRow >= 0 ? in[inputTopRow] : nullptr;
        const uint8_t* inputBottom = inputBottomRow < n ? in[inputBottomRow] : nullptr;
        uint8_t* outputTop = out[outRow];
        uint8_t* outputBottom = out[outRow + 1];

        auto writeBlock = [&](int col, uint8_t state) {
            const uint8_t moved = kDelslideBlockTransform[state];
            const DelslidePackedRows packed = kDelslidePackedRows[state];
            // WASM memory is little-endian, and memcpy lowers these to
            // unaligned 16-bit stores.
            std::memcpy(outputTop + col, &packed.top, sizeof(packed.top));
            std::memcpy(outputBottom + col, &packed.bottom, sizeof(packed.bottom));

            // Creation only needs to inspect blocks whose four output bytes
            // are zero. Accumulate those locations a machine word at a time,
            // avoiding a second full-grid scan in createStepInPlace().
            emptyWord |= static_cast<uint64_t>(moved == 0) << bitIndex;
            if (++bitIndex == 64) {
                emptyRow[wordIndex++] = emptyWord;
                bitIndex = 0;
                emptyWord = 0;
            }
        };

        // Left boundary block: its shifted left input column is outside.
        uint8_t state = 0;
        if (inputTop) state |= static_cast<uint8_t>(inputTop[0] << 1);
        if (inputBottom) state |= static_cast<uint8_t>(inputBottom[0] << 3);
        writeBlock(0, state);

        // Interior blocks are branch-free; only the O(n) boundary blocks need
        // special handling.
        if (inputTop && inputBottom) {
            for (int blockCol = 1; blockCol < half; ++blockCol) {
                const int outCol = blockCol << 1;
                state = delslideStateFromPairs(
                    inputTop + outCol - 1,
                    inputBottom + outCol - 1);
                writeBlock(outCol, state);
            }
        } else {
            for (int blockCol = 1; blockCol < half; ++blockCol) {
                const int outCol = blockCol << 1;
                const int inputLeftCol = outCol - 1;
                const int inputRightCol = outCol;
                state = 0;
                if (inputTop) {
                    state |= inputTop[inputLeftCol];
                    state |= static_cast<uint8_t>(inputTop[inputRightCol] << 1);
                }
                if (inputBottom) {
                    state |= static_cast<uint8_t>(inputBottom[inputLeftCol] << 2);
                    state |= static_cast<uint8_t>(inputBottom[inputRightCol] << 3);
                }
                writeBlock(outCol, state);
            }
        }

        // Right boundary block: its shifted right input column is outside.
        state = 0;
        if (inputTop) state |= inputTop[n - 1];
        if (inputBottom) state |= static_cast<uint8_t>(inputBottom[n - 1] << 2);
        writeBlock(n, state);
        if (bitIndex != 0) {
            emptyRow[wordIndex] = emptyWord;
        }
    }
}

template <typename DecisionSource>
void createStepInPlace(
    MatrixConfig& config,
    DecisionSource& decisions,
    int rows,
    const EmptyBlockBitset& emptyBlocks) {
    const int n = config.size();
    const int half = n / 2;
    decisions.beginLevel(rows);

    for (int i = 0; i < half; ++i) {
        decisions.beginRow(i);
        const int i2 = i << 1;
        uint8_t* top = config[i2];
        uint8_t* bottom = config[i2 + 1];
        const uint8_t* above = i > 0 ? config[i2 - 1] : nullptr;
        const uint8_t* below = i < half - 1 ? config[i2 + 2] : nullptr;

        const uint64_t* emptyWords = emptyBlocks.words.data() +
            static_cast<size_t>(i) * emptyBlocks.wordsPerRow;
        for (int wordIndex = 0; wordIndex < emptyBlocks.wordsPerRow; ++wordIndex) {
            uint64_t emptyWord = emptyWords[wordIndex];
            while (emptyWord != 0) {
                const int bit = __builtin_ctzll(emptyWord);
                const int j = (wordIndex << 6) + bit;
                if (j >= half) break;
                emptyWord &= emptyWord - 1;
                const int j2 = j << 1;
                uint8_t occupiedNeighbor = 0;
                if (j > 0) {
                    occupiedNeighbor |= top[j2 - 1] | bottom[j2 - 1];
                }
                if (j < half - 1) {
                    occupiedNeighbor |= top[j2 + 2] | bottom[j2 + 2];
                }
                if (above) {
                    occupiedNeighbor |= above[j2] | above[j2 + 1];
                }
                if (below) {
                    occupiedNeighbor |= below[j2] | below[j2 + 1];
                }

                if (occupiedNeighbor == 0) {
                    if (decisions.choose(j)) {
                        top[j2] = 1;
                        bottom[j2 + 1] = 1;
                    } else {
                        bottom[j2] = 1;
                        top[j2 + 1] = 1;
                    }
                }
            }
        }
    }
}

class PackedDecisionSource {
public:
    explicit PackedDecisionSource(const PackedDecisionPyramid& decisions) : decisions_(decisions) {}

    inline void beginLevel(int rows) {
        rowWidth_ = rows;
        levelOffset_ = decisions_.offsets[rows - 1];
    }

    inline void beginRow(int row) {
        rowOffset_ = levelOffset_ + static_cast<uint64_t>(row) * rowWidth_;
    }

    inline bool choose(int col) {
        const uint64_t idx = rowOffset_ + static_cast<uint64_t>(col);
        return (decisions_.words[static_cast<size_t>(idx >> 5)] >> (idx & 31U)) & 1U;
    }

private:
    const PackedDecisionPyramid& decisions_;
    uint64_t levelOffset_ = 0;
    uint64_t rowOffset_ = 0;
    int rowWidth_ = 0;
};

class PeriodicProbabilitySource {
public:
    explicit PeriodicProbabilitySource(const PeriodicProbabilityPyramid& probabilities)
        : probabilities_(probabilities),
          rowOffsets_(static_cast<size_t>(probabilities.levels)),
          colOffsets_(static_cast<size_t>(probabilities.levels)) {
        for (int i = 0; i < probabilities.levels; ++i) {
            rowOffsets_[i] = (i % probabilities.blockRows) * probabilities.blockCols;
            colOffsets_[i] = i % probabilities.blockCols;
        }
    }

    inline void beginLevel(int rows) {
        levelOffset_ = static_cast<size_t>(rows - 1) *
            probabilities_.blockRows * probabilities_.blockCols;
    }

    inline void beginRow(int row) {
        rowOffset_ = levelOffset_ + static_cast<size_t>(rowOffsets_[row]);
    }

    inline bool choose(int col) {
        const double probability = probabilities_.probabilities[
            rowOffset_ + static_cast<size_t>(colOffsets_[col])];
        if (probability <= 0.0) return false;
        if (probability >= 1.0) return true;
        return shuffleRng.next_double() < probability;
    }

private:
    const PeriodicProbabilityPyramid& probabilities_;
    vector<int> rowOffsets_;
    vector<int> colOffsets_;
    size_t levelOffset_ = 0;
    size_t rowOffset_ = 0;
};

class UniformDecisionSource {
public:
    inline void beginLevel(int) {}
    inline void beginRow(int) {}

    inline bool choose(int) {
        if (remaining_ == 0) {
            bits_ = shuffleRng.next();
            remaining_ = 64;
        }
        const bool result = (bits_ & 1U) != 0;
        bits_ >>= 1;
        --remaining_;
        return result;
    }

private:
    uint64_t bits_ = 0;
    int remaining_ = 0;
};

template <typename DecisionSource>
MatrixConfig aztecgenWithDecisionSource(int levels, DecisionSource& decisions) {
    if (levels <= 0) {
        return MatrixConfig();
    }

    MatrixConfig bufferA((levels << 1) + 2, (levels << 1) + 2, 0);
    MatrixConfig bufferB((levels << 1) + 2, (levels << 1) + 2, 0);

    bufferA.reset(2, 2, 0);
    decisions.beginLevel(1);
    decisions.beginRow(0);
    if (decisions.choose(0)) {
        bufferA[0][0] = 1;
        bufferA[1][1] = 1;
    } else {
        bufferA[0][1] = 1;
        bufferA[1][0] = 1;
    }

    MatrixConfig* current = &bufferA;
    MatrixConfig* next = &bufferB;
    EmptyBlockBitset emptyBlocks;
    const int totalIterations = levels - 1;
    double nextYieldAt = emscripten_get_now() + 100.0;

    for (int i = 0; i < totalIterations; ++i) {
        delslideInPlace(*next, *current, emptyBlocks);
        createStepInPlace(*next, decisions, i + 2, emptyBlocks);
        std::swap(current, next);

        // Asyncify has to unwind and restore the WASM stack for every sleep.
        // Check cheaply every eight levels, but yield only after roughly one
        // frame of real work. This keeps long samples responsive without
        // making fast samples pay for dozens of timers.
        if (((i + 1) & 7) == 0) {
            progressCounter = 10 + static_cast<int>(((i + 1) / static_cast<double>(totalIterations)) * 80);
            const double now = emscripten_get_now();
            if (now >= nextYieldAt) {
                emscripten_sleep(0);
                nextYieldAt = emscripten_get_now() + 100.0;
            }
        }
    }

    progressCounter = 90;

    return std::move(*current);
}

MatrixConfig aztecgen(const PackedDecisionPyramid& decisions) {
    PackedDecisionSource source(decisions);
    return aztecgenWithDecisionSource(decisions.levels, source);
}

MatrixConfig aztecgen(const PeriodicProbabilityPyramid& probabilities) {
    PeriodicProbabilitySource source(probabilities);
    return aztecgenWithDecisionSource(probabilities.levels, source);
}

MatrixConfig aztecgenUniform(int levels) {
    UniformDecisionSource source;
    return aztecgenWithDecisionSource(levels, source);
}

MatrixConfig samplePeriodicConfig(
    const MatrixDouble& weights,
    int levels,
    int rowPeriod,
    int colPeriod) {

    // If the requested period is larger than this tiny diamond, the finite
    // matrix does not contain one complete tile to copy. The original finite
    // recurrence is cheap at these sizes and remains the exact fallback.
    if (weights.rows() < rowPeriod || weights.cols() < colPeriod) {
        PackedDecisionPyramid decisions = computeDecisionPyramid(weights);
        return aztecgen(decisions);
    }

    PeriodicProbabilityPyramid probabilities =
        computePeriodicProbabilityPyramid(weights, levels, rowPeriod, colPeriod);
    return aztecgen(probabilities);
}

class JsonBuffer {
public:
    explicit JsonBuffer(size_t initialCapacity)
        : capacity_(std::max<size_t>(initialCapacity, 2)),
          data_(static_cast<char*>(std::malloc(capacity_))) {
        if (!data_) {
            throw std::runtime_error("Failed to allocate JSON output");
        }
    }

    ~JsonBuffer() {
        std::free(data_);
    }

    void append(char value) {
        ensure(1);
        data_[size_++] = value;
    }

    void append(const char* value, size_t length) {
        ensure(length);
        std::memcpy(data_ + size_, value, length);
        size_ += length;
    }

    template <size_t N>
    void append(const char (&literal)[N]) {
        append(literal, N - 1);
    }

    char* release() {
        ensure(1);
        data_[size_] = '\0';
        char* result = data_;
        data_ = nullptr;
        capacity_ = 0;
        size_ = 0;
        return result;
    }

private:
    void ensure(size_t extra) {
        if (extra <= capacity_ - size_) return;
        if (extra > SIZE_MAX - size_) {
            throw std::runtime_error("JSON output is too large");
        }
        const size_t needed = size_ + extra;
        size_t nextCapacity = capacity_;
        while (nextCapacity < needed) {
            const size_t grown = nextCapacity + nextCapacity / 2;
            if (grown <= nextCapacity) {
                nextCapacity = needed;
                break;
            }
            nextCapacity = grown;
        }
        char* grown = static_cast<char*>(std::realloc(data_, nextCapacity));
        if (!grown) {
            throw std::runtime_error("Failed to grow JSON output");
        }
        data_ = grown;
        capacity_ = nextCapacity;
    }

    size_t capacity_ = 0;
    size_t size_ = 0;
    char* data_ = nullptr;
};

void appendJsonInteger(JsonBuffer& json, int value) {
    char buffer[16];
    char* end = buffer + sizeof(buffer);
    char* cursor = end;
    const bool negative = value < 0;
    unsigned int magnitude = negative
        ? static_cast<unsigned int>(-static_cast<long long>(value))
        : static_cast<unsigned int>(value);

    do {
        *--cursor = static_cast<char>('0' + (magnitude % 10));
        magnitude /= 10;
    } while (magnitude != 0);
    if (negative) {
        *--cursor = '-';
    }
    json.append(cursor, static_cast<size_t>(end - cursor));
}

void appendDominoJSON(JsonBuffer& json, bool& first, int x, int y, int w, int h, const char* color) {
    if (!first) {
        json.append(',');
    } else {
        first = false;
    }

    json.append("{\"x\":");
    appendJsonInteger(json, x);
    json.append(",\"y\":");
    appendJsonInteger(json, y);
    json.append(",\"w\":");
    appendJsonInteger(json, w);
    json.append(",\"h\":");
    appendJsonInteger(json, h);
    json.append(",\"color\":\"");
    json.append(color, std::strlen(color));
    json.append("\"}");
}

bool appendStandardDominoFromMarker(JsonBuffer& json, bool& first, int i, int j, int size) {
    const bool oddI = i & 1;
    const bool oddJ = j & 1;
    int x, y, w, h;
    const char* color;

    if (oddI && oddJ) {
        color = "blue";
        x = j - i - 2;
        y = size + 1 - (i + j) - 1;
        w = 4;
        h = 2;
    } else if (oddI && !oddJ) {
        color = "yellow";
        x = j - i - 1;
        y = size + 1 - (i + j) - 2;
        w = 2;
        h = 4;
    } else if (!oddI && !oddJ) {
        color = "green";
        x = j - i - 2;
        y = size + 1 - (i + j) - 1;
        w = 4;
        h = 2;
    } else if (!oddI && oddJ) {
        color = "red";
        x = j - i - 1;
        y = size + 1 - (i + j) - 2;
        w = 2;
        h = 4;
    } else {
        return false;
    }

    appendDominoJSON(json, first, x, y, w, h, color);
    return true;
}

char* serializeDominoConfig(const MatrixConfig& config) {
    const int size = config.size();
    const size_t order = static_cast<size_t>(size / 2);
    const size_t expectedDominoes = order * (order + 1);
    if (expectedDominoes > (SIZE_MAX - 2) / 52) {
        throw std::runtime_error("Domino JSON output is too large");
    }
    // At n=2000, the longest emitted object is 50 bytes including its comma.
    // Leave a small margin; JsonBuffer still grows safely when larger
    // coordinates require another digit.
    JsonBuffer json(expectedDominoes * 52 + 2);
    json.append('[');

    bool first = true;
    for (int i = 0; i < size; ++i) {
        for (int j = 0; j < size; ++j) {
            if (config[i][j] == 1) {
                appendStandardDominoFromMarker(json, first, i, j, size);
            }
        }
    }

    json.append(']');
    return json.release();
}

char* makeCString(const string& value) {
    char* out = static_cast<char*>(std::malloc(value.size() + 1));
    if (!out) {
        return nullptr;
    }
    std::memcpy(out, value.c_str(), value.size() + 1);
    return out;
}

string escapeJsonString(const string& value) {
    string escaped;
    escaped.reserve(value.size());
    for (char c : value) {
        if (c == '"' || c == '\\') {
            escaped.push_back('\\');
        }
        escaped.push_back(c);
    }
    return escaped;
}

char* makeErrorCString(const string& message) {
    string error = string("{\"error\":\"") + escapeJsonString(message) + "\"}";
    char* out = makeCString(error);
    if (!out) {
        out = static_cast<char*>(std::malloc(3));
        if (out) {
            std::strcpy(out, "[]");
        }
    }
    return out;
}

// ---------------------------------------------------------------------
// simulateAztec
//
// Exported function callable from JavaScript.
// It creates a 2*n x 2*n weight matrix, runs the simulation,
// and returns a JSON string with domino placements for 3D rendering.
// ---------------------------------------------------------------------
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n, double w1, double w2, double w3, double w4, double w5, double w6, double w7, double w8, double w9) {
    try {
        // // Limit n to reasonable values to prevent memory issues
        // if (n > 120) {
        //     n = 120; // Cap at 120 to prevent memory issues
        // }

        progressCounter = 0; // Reset progress.

        const int dim = 2 * n;
        const bool isUniformPattern =
            std::abs(w1 - 1.0) < 1e-9 && std::abs(w2 - 1.0) < 1e-9 && std::abs(w3 - 1.0) < 1e-9 &&
            std::abs(w4 - 1.0) < 1e-9 && std::abs(w5 - 1.0) < 1e-9 && std::abs(w6 - 1.0) < 1e-9 &&
            std::abs(w7 - 1.0) < 1e-9 && std::abs(w8 - 1.0) < 1e-9 && std::abs(w9 - 1.0) < 1e-9;

        MatrixDouble A1a;

        // Check if the weights match the pattern for a 2x2 periodic configuration
        // In a 2x2 pattern, w2 and w8 are 'a', w4 and w6 are 'b', and the rest are 1.0
        bool is2x2Pattern = (std::abs(w1 - 1.0) < 1e-9 && std::abs(w3 - 1.0) < 1e-9 &&
                             std::abs(w5 - 1.0) < 1e-9 && std::abs(w7 - 1.0) < 1e-9 &&
                             std::abs(w9 - 1.0) < 1e-9 &&
                             std::abs(w2 - w8) < 1e-9 && std::abs(w4 - w6) < 1e-9);

        if (!isUniformPattern) {
            A1a.reset(dim, dim, 0.0);
        }

        if (isUniformPattern) {
            // Every creation probability is exactly 1/2. Generating only the
            // choices for actual holes avoids the cubic weight recurrence and
            // the cubic-size packed decision pyramid.
        } else if (is2x2Pattern) {
            // Use the direct 2x2 pattern implementation from the reference code
            double a = w2; // w2 and w8 are 'a'
            double b = w4; // w4 and w6 are 'b'

            for (int i = 0; i < dim; ++i) {
                for (int j = 0; j < dim; ++j) {
                    int im = i & 3; // Faster than i % 4
                    int jm = j & 3; // Faster than j % 4
                    if ((im < 2 && jm < 2) || (im >= 2 && jm >= 2))
                        A1a[i][j] = b;
                    else
                        A1a[i][j] = a;
                }
            }
        } else {
            // --- 3×3 periodic pattern ------------------------------------------
            const double W[3][3] = {{w1, w2, w3},
                                    {w4, w5, w6},
                                    {w7, w8, w9}};

            for (int i = 0; i < dim; ++i) {
                int ii = i % 3;               // row inside the 3‑periodic block
                for (int j = 0; j < dim; ++j) {
                    int jj = j % 3;           // column inside the 3‑periodic block
                    A1a[i][j] = W[ii][jj];    // assign the corresponding weight
                }
            }
        }

        // Generate domino configuration.
        MatrixConfig dominoConfig;
        try {
            if (isUniformPattern) {
                progressCounter = 10;
                dominoConfig = aztecgenUniform(n);
            } else {
                const int period = is2x2Pattern ? 4 : 6;
                progressCounter = 10;
                dominoConfig = samplePeriodicConfig(A1a, n, period, period);
            }
        } catch (const std::exception& e) {
            throw std::runtime_error(string("Error generating domino configuration: ") + e.what());
        }
        // Store the generated configuration and parameters globally
        g_conf = std::move(dominoConfig);
        g_W    = isUniformPattern ? MatrixDouble() : std::move(A1a);
        g_N    = dim;          // Store the dimension (2*n)

        // Store the periodicity type and corresponding weights
        if (isUniformPattern) {
            g_periodicity = "uniform";
        } else if (is2x2Pattern) {
            g_periodicity = "2x2";
            g_a = w2; // 'a' from input
            g_b = w4; // 'b' from input
        } else {
            g_periodicity = "3x3";
            g_w = {w1, w2, w3, w4, w5, w6, w7, w8, w9}; // Store all 9 weights
        }

        g_glauber_active = false; // Reset Glauber flag after fresh sample

        progressCounter = 90; // Simulation steps complete.

        char* out = serializeDominoConfig(g_conf);
        progressCounter = 100; // Finished.

        return out;
    } catch (const std::exception& e) {
        progressCounter = 100; // Mark as complete to stop progress indicator
        return makeErrorCString(e.what());
    }
}

// ---------------------------------------------------------------------
// simulateAztec6x2
//
// New function for 6x2 periodic weights.
// ---------------------------------------------------------------------
EMSCRIPTEN_KEEPALIVE
char* simulateAztec6x2(int n, double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9, double v10, double v11, double v12) {
    try {
        progressCounter = 0;
        int dim = 2 * n;

        // Store weights globally for Glauber dynamics
        g_w6x2[0] = v1; g_w6x2[1] = v2; g_w6x2[2] = v3;
        g_w6x2[3] = v4; g_w6x2[4] = v5; g_w6x2[5] = v6;
        g_w6x2[6] = v7; g_w6x2[7] = v8; g_w6x2[8] = v9;
        g_w6x2[9] = v10; g_w6x2[10] = v11; g_w6x2[11] = v12;

        MatrixDouble A1a(dim, dim, 0.0);
        const double W[2][6] = {
            {v1, v2, v3, v4, v5, v6},
            {v7, v8, v9, v10, v11, v12}
        };

        for (int i = 0; i < dim; ++i) {
            int ii = i % 2;
            for (int j = 0; j < dim; ++j) {
                int jj = j % 6;
                A1a[i][j] = W[ii][jj];
            }
        }
        progressCounter = 10;

        MatrixConfig dominoConfig = samplePeriodicConfig(A1a, n, 2, 6);

        // Store the generated configuration and parameters globally for Glauber
        g_conf = std::move(dominoConfig);
        g_W    = std::move(A1a);
        g_N    = dim;
        g_periodicity = "6x2"; // Set periodicity for Glauber context
        g_glauber_active = false;

        progressCounter = 90;

        char* out = serializeDominoConfig(g_conf);
        progressCounter = 100;
        return out;
    } catch (const std::exception& e) {
        progressCounter = 100;
        return makeErrorCString(e.what());
    }
}

/* ------------------------------------------------------------------ *
 *  simulateAztecPeriodic – general k×l periodic edge weights.
 *  Matches the T-embedding page convention: for each interior black
 *  face, alpha = top edge, beta = right edge, gamma = left edge, and
 *  delta = bottom edge = 1. alpha/beta/gamma point to k*l arrays in
 *  row-major order; the entry for EKLP cell (cellI, cellJ) is
 *  index (cellI % k) * l + (cellJ % l). Placement in the 2n×2n matrix:
 *  alpha -> even row / odd col, beta -> even/even, gamma -> odd/even.
 *  The shuffle core is identical to the T-embedding sampler, so this
 *  reproduces the same weighted distribution.
 * ------------------------------------------------------------------ */
static MatrixDouble generatePeriodicEdgeWeights(int n, int k, int l,
                                                const double* alpha,
                                                const double* beta,
                                                const double* gamma) {
    if (k < 1 || l < 1) {
        throw std::runtime_error("Period dimensions k and l must be >= 1");
    }
    const int dim = 2 * n;
    MatrixDouble weights(dim, dim, 1.0); // delta (odd row, odd col) defaults to 1
    for (int cellI = 0; cellI < n; ++cellI) {
        const int pi = cellI % k;
        for (int cellJ = 0; cellJ < n; ++cellJ) {
            const int pj = cellJ % l;
            const size_t idx = static_cast<size_t>(pi) * l + pj;
            const double a = alpha[idx], b = beta[idx], g = gamma[idx];
            if (!(a > 0.0) || !(b > 0.0) || !(g > 0.0) ||
                !std::isfinite(a) || !std::isfinite(b) || !std::isfinite(g)) {
                throw std::runtime_error("Periodic weights must be finite and positive");
            }
            const int row = 2 * cellI, col = 2 * cellJ;
            weights[row][col + 1] = a;   // alpha: even row, odd col
            weights[row][col]     = b;   // beta:  even row, even col
            weights[row + 1][col] = g;   // gamma: odd row, even col
        }
    }
    return weights;
}

extern "C" EMSCRIPTEN_KEEPALIVE
char* simulateAztecPeriodic(int n, int k, int l,
                            double* alpha, double* beta, double* gamma) {
    try {
        progressCounter = 0;
        MatrixDouble A1a = generatePeriodicEdgeWeights(n, k, l, alpha, beta, gamma);

        progressCounter = 10;

        MatrixConfig dominoConfig = samplePeriodicConfig(A1a, n, 2 * k, 2 * l);
        g_conf = std::move(dominoConfig);
        g_W    = std::move(A1a);
        g_N    = 2 * n;
        g_periodicity = "periodic"; // Glauber keeps using g_W (no rebuild branch)
        g_glauber_active = false;

        progressCounter = 90;

        char* out = serializeDominoConfig(g_conf);
        progressCounter = 100;
        return out;
    } catch (const std::exception& e) {
        progressCounter = 100;
        return makeErrorCString(e.what());
    }
}

/* ------------------------------------------------------------------ *
 *  simulateAztecHorizontal – deterministic "all‑horizontal" frozen state
 *  (returns only dominoes whose 4×2 rectangle lies wholly inside ♦)
 * ------------------------------------------------------------------ */
extern "C" EMSCRIPTEN_KEEPALIVE
char* simulateAztecHorizontal(int n,
                              double, double, double,
                              double, double, double,
                              double, double, double)
{
    try {
        const int N = 2 * n;                     // lattice size

        MatrixConfig conf(N, N, 0);

        for (int i = 0; i < N; ++i) {
            for (int j = 0; j < N; ++j) {
                const bool oddI = i & 1;
                const bool oddJ = j & 1;
                const int y = N - (i + j);

                if (y > 0) {
                    if (!oddI && !oddJ) conf[i][j] = 1;  // green marker
                } else {
                    if (oddI && oddJ) conf[i][j] = 1;    // blue marker
                }
            }
        }

        /* ---- stash in globals so renderers & Glauber can use it ---- */
        g_conf           = std::move(conf);
        g_W              = MatrixDouble();
        g_N              = N;
        g_periodicity    = "uniform";
        g_glauber_active = false;

        return serializeDominoConfig(g_conf);
    }
    catch (const std::exception& e) {
        return makeErrorCString(e.what());
    }
}


/* ------------------------------------------------------------------ *
 *  simulateAztecVertical – deterministic “all‑vertical” frozen state
 *  (returns only dominoes whose 2×4 rectangle lies wholly inside ♦)
 * ------------------------------------------------------------------ */
extern "C" EMSCRIPTEN_KEEPALIVE
char* simulateAztecVertical(int n,
                            double, double, double,
                            double, double, double,
                            double, double, double)
{
    try {
        const int N = 2 * n;                       /* lattice size */


        MatrixConfig conf(N, N, 0);

        for (int i = 0; i < N; ++i){
            for (int j = 0; j < N; ++j){

                const bool oddI = i & 1;
                const bool oddJ = j & 1;
                const int  x    = j - i - 1;          // renderer’s x‑coord

                if (x < 0) {
                    if (oddI && !oddJ) conf[i][j] = 1;    // yellow marker
                } else {
                    if (!oddI && oddJ) conf[i][j] = 1;    // red marker
                }
            }
        }

        /* --- stash in globals so downstream renderers / Glauber work --- */
        g_conf           = std::move(conf);
        g_W              = MatrixDouble();
        g_N              = N;
        g_periodicity    = "uniform";
        g_glauber_active = false;

        return serializeDominoConfig(g_conf);
    }
    catch (const std::exception& e){
        return makeErrorCString(e.what());
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

// Function to perform multiple Glauber steps and return the result as JSON
EMSCRIPTEN_KEEPALIVE
char* performGlauberSteps(
    const char* periodicity_cstr, // "uniform", "2x2", "3x3", or "6x2"
    double p1, double p2, double p3, double p4, double p5, double p6,
    double p7, double p8, double p9, double p10, double p11, double p12,
    int nSteps)
{
    try {
        if (g_N == 0) {
            throw std::runtime_error("No configuration loaded. Run 'Sample' first.");
        }

        string periodicity = periodicity_cstr;
        bool weights_changed = false;

        // Check if weights or periodicity need updating
        if (periodicity != g_periodicity) {
            weights_changed = true;
            g_periodicity = periodicity;
        }

        if (periodicity == "2x2") {
            double a = p1; // Use p1 for 'a'
            double b = p2; // Use p2 for 'b'
            if (std::abs(a - g_a) > 1e-9 || std::abs(b - g_b) > 1e-9) {
                weights_changed = true;
                g_a = a;
                g_b = b;
            }
        } else if (periodicity == "3x3") {
            array<double, 9> current_w = {p1, p2, p3, p4, p5, p6, p7, p8, p9};
            for (size_t i = 0; i < 9; ++i) {
                if (std::abs(current_w[i] - g_w[i]) > 1e-9) {
                    weights_changed = true;
                    break;
                }
            }
            if (weights_changed) {
                g_w = current_w;
            }
        } else if (periodicity == "6x2") {
            array<double, 12> current_w = {
                p1, p2, p3, p4, p5, p6,
                p7, p8, p9, p10, p11, p12
            };
            for (size_t i = 0; i < current_w.size(); ++i) {
                if (std::abs(current_w[i] - g_w6x2[i]) > 1e-9) {
                    weights_changed = true;
                    break;
                }
            }
            if (weights_changed) {
                g_w6x2 = current_w;
            }
        }
         // No specific weight check needed for "uniform" if periodicity changes

        // Rebuild global weight matrix g_W if necessary
        if (weights_changed) {
             g_W = MatrixDouble(g_N, g_N, 0.0); // Reinitialize
             if (g_periodicity == "2x2") {
                 for (int i = 0; i < g_N; ++i) {
                     for (int j = 0; j < g_N; ++j) {
                         int im = i & 3, jm = j & 3;
                         g_W[i][j] = ((im < 2 && jm < 2) || (im >= 2 && jm >= 2)) ? g_b : g_a;
                     }
                 }
             } else if (g_periodicity == "3x3") {
                 const double W[3][3] = {{g_w[0], g_w[1], g_w[2]},
                                         {g_w[3], g_w[4], g_w[5]},
                                         {g_w[6], g_w[7], g_w[8]}};
                 for (int i = 0; i < g_N; ++i) {
                     for (int j = 0; j < g_N; ++j) {
                         g_W[i][j] = W[i % 3][j % 3];
                     }
                 }
             } else if (g_periodicity == "6x2") {
                 const double W[2][6] = {
                     {g_w6x2[0], g_w6x2[1], g_w6x2[2], g_w6x2[3], g_w6x2[4], g_w6x2[5]},
                     {g_w6x2[6], g_w6x2[7], g_w6x2[8], g_w6x2[9], g_w6x2[10], g_w6x2[11]}
                 };
                 for (int i = 0; i < g_N; ++i) {
                     int ii = i % 2;
                     for (int j = 0; j < g_N; ++j) {
                         int jj = j % 6;
                         g_W[i][j] = W[ii][jj];
                     }
                 }
             } else { // Uniform
                  for (int i = 0; i < g_N; ++i) {
                     for (int j = 0; j < g_N; ++j) {
                          g_W[i][j] = 1.0;
                     }
                 }
             }
        }

        // Perform nSteps Glauber updates
        std::uniform_real_distribution<> u(0.0, 1.0);
        for (int k = 0; k < nSteps; ++k) {
            glauberStep(u);
             // Optionally add emscripten_sleep(0) inside the loop for very large nSteps
             // if (k % 1000 == 0) emscripten_sleep(0);
        }

         g_glauber_active = true; // Mark that Glauber has run

        return serializeDominoConfig(g_conf);

    } catch (const std::exception& e) {
        return makeErrorCString(std::string("Glauber step error: ") + e.what());
    }
}

// Add a simple getter for the g_glauber_active flag
EMSCRIPTEN_KEEPALIVE
bool wasGlauberActive() {
    return g_glauber_active;
}

} // extern "C"
