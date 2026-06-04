/*

emcc domino.cpp -o domino.js\
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_simulateAztec6x2','_performGlauberSteps','_simulateAztecVertical','_simulateAztecHorizontal','_wasGlauberActive','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math


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

struct Cell {
    double value;
    int flag;
};

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

    FlatMatrix(int rows, const vector<T>& row) {
        rows_ = rows;
        cols_ = static_cast<int>(row.size());
        data_.reserve(static_cast<size_t>(rows_) * cols_);
        for (int i = 0; i < rows_; ++i) {
            data_.insert(data_.end(), row.begin(), row.end());
        }
    }

    FlatMatrix(std::initializer_list<std::initializer_list<T>> rows) {
        rows_ = static_cast<int>(rows.size());
        cols_ = rows_ ? static_cast<int>(rows.begin()->size()) : 0;
        data_.reserve(static_cast<size_t>(rows_) * cols_);
        for (const auto& row : rows) {
            if (static_cast<int>(row.size()) != cols_) {
                throw std::runtime_error("FlatMatrix initializer rows have inconsistent lengths");
            }
            data_.insert(data_.end(), row.begin(), row.end());
        }
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

    T* operator[](int row) {
        return data_.data() + static_cast<size_t>(row) * cols_;
    }

    const T* operator[](int row) const {
        return data_.data() + static_cast<size_t>(row) * cols_;
    }

    T& at(int row, int col) {
        return data_[static_cast<size_t>(row) * cols_ + col];
    }

    const T& at(int row, int col) const {
        return data_[static_cast<size_t>(row) * cols_ + col];
    }

    int size() const { return rows_; }
    int rows() const { return rows_; }
    int cols() const { return cols_; }
    bool empty() const { return rows_ == 0 || cols_ == 0; }
};

using Matrix = FlatMatrix<Cell>;
using MatrixDouble = FlatMatrix<double>;
using MatrixInt = FlatMatrix<int>;
using Vertex = pair<int, int>;

/* ---------- Global state for incremental Glauber dynamics ---------- */
static MatrixInt      g_conf;        // current domino configuration
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

vector<MatrixDouble> computeProbabilityPyramid(const MatrixDouble& weights) {
    const int dim = weights.size();
    if (dim <= 0 || (dim & 1)) {
        throw std::runtime_error("Weight matrix dimension must be positive and even");
    }

    const int levels = dim / 2;
    vector<MatrixDouble> probabilities;
    probabilities.reserve(levels);
    probabilities.resize(levels);

    MatrixDouble currentValue(dim, dim, 0.0);
    MatrixInt currentExp(dim, dim, 0);
    MatrixDouble nextValue;
    MatrixInt nextExp;

    for (int i = 0; i < dim; ++i) {
        for (int j = 0; j < dim; ++j) {
            if (fabs(weights[i][j]) < 1e-9) {
                currentValue[i][j] = 1.0;
                currentExp[i][j] = 1;
            } else {
                currentValue[i][j] = weights[i][j];
                currentExp[i][j] = 0;
            }
        }
    }

    for (int size = dim; size >= 2; size -= 2) {
        const int rows = size / 2;
        MatrixDouble& probs = probabilities[rows - 1];
        probs.reset(rows, rows, 0.0);

        for (int i = 0; i < rows; ++i) {
            for (int j = 0; j < rows; ++j) {
                const int i0 = i << 1;
                const int j0 = j << 1;
                const int sum1 = currentExp[i0][j0] + currentExp[i0 + 1][j0 + 1];
                const int sum2 = currentExp[i0 + 1][j0] + currentExp[i0][j0 + 1];

                if (sum1 > sum2) {
                    probs[i][j] = 0.0;
                } else if (sum1 < sum2) {
                    probs[i][j] = 1.0;
                } else {
                    const double prodMain = currentValue[i0 + 1][j0 + 1] * currentValue[i0][j0];
                    const double prodOther = currentValue[i0 + 1][j0] * currentValue[i0][j0 + 1];
                    double denom = prodMain + prodOther;
                    if (fabs(denom) < 1e-9) denom = 1e-9;
                    probs[i][j] = prodMain / denom;
                }
            }
        }

        const int nextSize = size - 2;
        if (nextSize == 0) {
            break;
        }

        nextValue.reset(nextSize, nextSize, 0.0);
        nextExp.reset(nextSize, nextSize, 0);

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

                if (fabs(a2) < 1e-9) a2 = 1e-9;
                nextValue[i][j] = current / a2;
                nextExp[i][j] = currentFlag - a2Exp;
            }
        }

        std::swap(currentValue, nextValue);
        std::swap(currentExp, nextExp);
    }

    return probabilities;
}

void delslideInPlace(MatrixInt& out, const MatrixInt& in) {
    const int n = in.size();
    out.reset(n + 2, n + 2, 0);

    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            out[i + 1][j + 1] = in[i][j];
        }
    }

    const int half = n / 2;
    for (int i = 0; i < half; ++i) {
        for (int j = 0; j < half; ++j) {
            const int i2 = i << 1;
            const int j2 = j << 1;
            if (out[i2][j2] == 1 && out[i2 + 1][j2 + 1] == 1) {
                out[i2][j2] = 0;
                out[i2 + 1][j2 + 1] = 0;
            } else if (out[i2][j2 + 1] == 1 && out[i2 + 1][j2] == 1) {
                out[i2 + 1][j2] = 0;
                out[i2][j2 + 1] = 0;
            }
        }
    }

    for (int i = 0; i < half + 1; ++i) {
        for (int j = 0; j < half + 1; ++j) {
            const int i2 = i << 1;
            const int j2 = j << 1;
            if (out[i2 + 1][j2 + 1] == 1) {
                out[i2][j2] = 1;
                out[i2 + 1][j2 + 1] = 0;
            } else if (out[i2][j2] == 1) {
                out[i2][j2] = 0;
                out[i2 + 1][j2 + 1] = 1;
            } else if (out[i2 + 1][j2] == 1) {
                out[i2][j2 + 1] = 1;
                out[i2 + 1][j2] = 0;
            } else if (out[i2][j2 + 1] == 1) {
                out[i2 + 1][j2] = 1;
                out[i2][j2 + 1] = 0;
            }
        }
    }
}

void createStepInPlace(MatrixInt& config, const MatrixDouble& probs) {
    const int n = config.size();
    const int half = n / 2;
    for (int i = 0; i < half; ++i) {
        for (int j = 0; j < half; ++j) {
            const int i2 = i << 1;
            const int j2 = j << 1;
            if (config[i2][j2] == 0 && config[i2 + 1][j2] == 0 &&
                config[i2][j2 + 1] == 0 && config[i2 + 1][j2 + 1] == 0) {
                bool a1 = true, a2 = true, a3 = true, a4 = true;
                if (j > 0)
                    a1 = (config[i2][j2 - 1] == 0) && (config[i2 + 1][j2 - 1] == 0);
                if (j < half - 1)
                    a2 = (config[i2][j2 + 2] == 0) && (config[i2 + 1][j2 + 2] == 0);
                if (i > 0)
                    a3 = (config[i2 - 1][j2] == 0) && (config[i2 - 1][j2 + 1] == 0);
                if (i < half - 1)
                    a4 = (config[i2 + 2][j2] == 0) && (config[i2 + 2][j2 + 1] == 0);
                if (a1 && a2 && a3 && a4) {
                    if (shuffleRng.next_double() < probs[i][j]) {
                        config[i2][j2] = 1;
                        config[i2 + 1][j2 + 1] = 1;
                    } else {
                        config[i2 + 1][j2] = 1;
                        config[i2][j2 + 1] = 1;
                    }
                }
            }
        }
    }
}

MatrixInt aztecgen(const vector<MatrixDouble>& probabilities) {
    const int levels = static_cast<int>(probabilities.size());
    if (levels <= 0) {
        return MatrixInt();
    }

    MatrixInt bufferA((levels << 1) + 2, (levels << 1) + 2, 0);
    MatrixInt bufferB((levels << 1) + 2, (levels << 1) + 2, 0);

    bufferA.reset(2, 2, 0);
    if (shuffleRng.next_double() < probabilities[0][0][0]) {
        bufferA[0][0] = 1;
        bufferA[1][1] = 1;
    } else {
        bufferA[0][1] = 1;
        bufferA[1][0] = 1;
    }

    MatrixInt* current = &bufferA;
    MatrixInt* next = &bufferB;
    const int totalIterations = levels - 1;

    for (int i = 0; i < totalIterations; ++i) {
        delslideInPlace(*next, *current);
        createStepInPlace(*next, probabilities[i + 1]);
        std::swap(current, next);

        progressCounter = 10 + static_cast<int>(((i + 1) / static_cast<double>(totalIterations)) * 80);
        emscripten_sleep(0);
    }

    return std::move(*current);
}

void appendJsonNumber(string& json, double value) {
    char buf[32];
    const int len = std::snprintf(buf, sizeof(buf), "%.15g", value);
    if (len > 0) {
        json.append(buf, static_cast<size_t>(len));
    }
}

void appendDominoJSON(string& json, bool& first, double x, double y, double w, double h, const char* color) {
    if (!first) {
        json.push_back(',');
    } else {
        first = false;
    }

    json += "{\"x\":";
    appendJsonNumber(json, x);
    json += ",\"y\":";
    appendJsonNumber(json, y);
    json += ",\"w\":";
    appendJsonNumber(json, w);
    json += ",\"h\":";
    appendJsonNumber(json, h);
    json += ",\"color\":\"";
    json += color;
    json += "\"}";
}

bool appendStandardDominoFromMarker(string& json, bool& first, int i, int j, int size) {
    const bool oddI = i & 1;
    const bool oddJ = j & 1;
    double x, y, w, h;
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

string serializeDominoConfig(const MatrixInt& config) {
    const int size = config.size();
    string json;
    json.reserve(std::max<size_t>(2, static_cast<size_t>(size) * static_cast<size_t>(size) * 24));
    json.push_back('[');

    bool first = true;
    for (int i = 0; i < size; ++i) {
        for (int j = 0; j < size; ++j) {
            if (config[i][j] == 1) {
                appendStandardDominoFromMarker(json, first, i, j, size);
            }
        }
    }

    json.push_back(']');
    return json;
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

        // Create weight matrix A1a: dimensions 2*n x 2*n with periodic pattern
        int dim = 2 * n;

        // Check if memory allocation would be too large
        if (dim > 1000) {
            throw std::runtime_error("Input size too large, would exceed memory limits");
        }

        MatrixDouble A1a(dim, dim, 0.0);

        // Check if the weights match the pattern for a 2x2 periodic configuration
        // In a 2x2 pattern, w2 and w8 are 'a', w4 and w6 are 'b', and the rest are 1.0
        bool is2x2Pattern = (std::abs(w1 - 1.0) < 1e-9 && std::abs(w3 - 1.0) < 1e-9 &&
                             std::abs(w5 - 1.0) < 1e-9 && std::abs(w7 - 1.0) < 1e-9 &&
                             std::abs(w9 - 1.0) < 1e-9 &&
                             std::abs(w2 - w8) < 1e-9 && std::abs(w4 - w6) < 1e-9);

        if (is2x2Pattern) {
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

        emscripten_sleep(0); // Yield to update UI

        vector<MatrixDouble> prob;
        try {
            prob = computeProbabilityPyramid(A1a);
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
        // Store the generated configuration and parameters globally
        g_conf = dominoConfig; // Store the generated MatrixInt
        g_W    = A1a;          // Store the calculated weight MatrixDouble
        g_N    = dim;          // Store the dimension (2*n)

        // Store the periodicity type and corresponding weights
        if (is2x2Pattern) {
            g_periodicity = "2x2";
            g_a = w2; // 'a' from input
            g_b = w4; // 'b' from input
        } else if (std::abs(w1 - 1.0) < 1e-9 && std::abs(w2 - 1.0) < 1e-9 && std::abs(w3 - 1.0) < 1e-9 &&
                   std::abs(w4 - 1.0) < 1e-9 && std::abs(w5 - 1.0) < 1e-9 && std::abs(w6 - 1.0) < 1e-9 &&
                   std::abs(w7 - 1.0) < 1e-9 && std::abs(w8 - 1.0) < 1e-9 && std::abs(w9 - 1.0) < 1e-9) {
            g_periodicity = "uniform";
        } else {
            g_periodicity = "3x3";
            g_w = {w1, w2, w3, w4, w5, w6, w7, w8, w9}; // Store all 9 weights
        }

        g_glauber_active = false; // Reset Glauber flag after fresh sample

        progressCounter = 90; // Simulation steps complete.
        emscripten_sleep(0);  // Yield to update UI

        string json = serializeDominoConfig(dominoConfig);
        progressCounter = 100; // Finished.
        emscripten_sleep(0); // Yield to update UI

        char* out = makeCString(json);
        if (!out) {
            throw std::runtime_error("Failed to allocate memory for output");
        }

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
        if (dim > 1000) {
            throw std::runtime_error("Input size too large, would exceed memory limits");
        }

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
        emscripten_sleep(0);

        vector<MatrixDouble> prob = computeProbabilityPyramid(A1a);
        progressCounter = 10;
        emscripten_sleep(0);

        MatrixInt dominoConfig = aztecgen(prob);

        // Store the generated configuration and parameters globally for Glauber
        g_conf = dominoConfig;
        g_W    = A1a;
        g_N    = dim;
        g_periodicity = "6x2"; // Set periodicity for Glauber context
        g_glauber_active = false;

        progressCounter = 90;
        emscripten_sleep(0);

        string json = serializeDominoConfig(dominoConfig);
        progressCounter = 100;
        emscripten_sleep(0);

        char* out = makeCString(json);
        if (!out) { throw std::runtime_error("Failed to allocate memory for output"); }
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

        MatrixInt conf(N, N, 0);

        for (int i = 0; i < N; ++i) {
            for (int j = 0; j < N; ++j) {
                const bool oddI = i & 1;
                const bool oddJ = j & 1;

                /* Renderer y‑coord (centre‑of‑diamond = 0) */
                const int y = (N + 1) - (i + j) - 1;

                /*  blue  = NW marker  (companion SE = i+1,j+1)
                 *  green = SE marker  (companion NW = i‑1,j‑1)          */
                if (y >= 0) {                            // TOP half
                    if (oddI && oddJ && i <= N - 2 && j <= N - 2  && i >= 3 && j >= 3)
                        conf[i][j] = 1;                  // blue marker
                } else {                                 // BOTTOM half
                    if (!oddI && !oddJ && i >= 1 && j >= 1 && i <= N  && j <= N )
                        conf[i][j] = 1;                  // green marker
                }
            }
        }

        /* ---- stash in globals so renderers & Glauber can use it ---- */
        g_conf           = conf;
        g_W              = MatrixDouble(N, N, 1.0);
        g_N              = N;
        g_periodicity    = "uniform";
        g_glauber_active = false;

        string json;
        json.reserve(std::max<size_t>(2, static_cast<size_t>(N) * static_cast<size_t>(N) * 16));
        json.push_back('[');
        bool first = true;

        for (int i = 0; i < N; ++i) {
            for (int j = 0; j < N; ++j) {
                if (!conf[i][j]) continue;

                double x  = j - i - 2;
                double yy = N + 1 - (i + j) - 1;
                const char* col = ((i & 1) && (j & 1)) ? "blue" : "green";

                appendDominoJSON(json, first, x, yy, 4, 2, col);
            }
        }
        json.push_back(']');

        char* out = makeCString(json);
        if (!out) throw std::runtime_error("Failed to allocate memory for output");
        return out;
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


        MatrixInt conf(N, N, 0);

        for (int i = 0; i < N; ++i){
            for (int j = 0; j < N; ++j){

                const bool oddI = i & 1;
                const bool oddJ = j & 1;
                const int  x    = j - i - 1;          // renderer’s x‑coord

                /*  yellow  (NE marker)  needs companion SW = (i+1,j‑1)
                 *  red     (SW marker)  needs companion NE = (i‑1,j+1)  */
                if (x <= 0){                                            // left half
                    if ( oddI && !oddJ && i <= N-2 && j >= 2 )
                        conf[i][j] = 1;          /* yellow marker */
                } else {                                              // right half
                    if (!oddI && oddJ && i >= 0 && j <= N )
                        conf[i][j] = 1;          /* red marker */
                }
            }
        }

        /* --- stash in globals so downstream renderers / Glauber work --- */
        g_conf           = conf;
        g_W              = MatrixDouble(N, N, 1.0);
        g_N              = N;
        g_periodicity    = "uniform";
        g_glauber_active = false;

        string json;
        json.reserve(std::max<size_t>(2, static_cast<size_t>(N) * static_cast<size_t>(N) * 16));
        json.push_back('[');
        bool first = true;

        for (int i = 0; i < N; ++i){
            for (int j = 0; j < N; ++j){
                if (!conf[i][j]) continue;

                double x = j - i - 1;
                double y = N + 1 - (i + j) - 2;
                const char* col = (x <= 0) ? "yellow" : "red";

                appendDominoJSON(json, first, x, y, 2, 4, col);
            }
        }
        json.push_back(']');

        char* out = makeCString(json);
        if (!out) throw std::runtime_error("Failed to allocate memory for output");
        return out;
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
    const char* periodicity_cstr, // "uniform", "2x2", or "3x3"
    double p1, double p2, double p3, double p4, double p5, double p6, double p7, double p8, double p9, // Use all 9 for flexibility
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
            // Check if any of the first 9 weights have changed
            array<double, 9> current_w = {p1, p2, p3, p4, p5, p6, p7, p8, p9};
            for (size_t i = 0; i < 9; ++i) {
                if (std::abs(current_w[i] - g_w6x2[i]) > 1e-9) {
                    weights_changed = true;
                    break;
                }
            }
            // Note: we'll update g_w6x2 in the rebuild section below
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
                 // For 6x2 mode, update the global weights with passed parameters
                 // We only have 9 parameters, so we'll update the first 9 weights
                 // and keep the last 3 from the global state
                 g_w6x2[0] = p1; g_w6x2[1] = p2; g_w6x2[2] = p3;
                 g_w6x2[3] = p4; g_w6x2[4] = p5; g_w6x2[5] = p6;
                 g_w6x2[6] = p7; g_w6x2[7] = p8; g_w6x2[8] = p9;
                 // Keep g_w6x2[9], g_w6x2[10], g_w6x2[11] from previous state
                 
                 // Now rebuild the weight matrix with the updated values
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

        string json = serializeDominoConfig(g_conf);
        char* out = makeCString(json);
        if (!out) throw std::runtime_error("Memory allocation failed for Glauber result");
        return out;

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
