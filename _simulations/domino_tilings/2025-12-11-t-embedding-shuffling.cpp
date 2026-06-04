/*
  2025-12-11-t-embedding-shuffling.cpp

  Weighted EKLP shuffling for the T-embedding page random sampler.

  Build from _simulations/domino_tilings:

  emcc 2025-12-11-t-embedding-shuffling.cpp -o 2025-12-11-t-embedding-shuffling.js \
    -s WASM=1 \
    -s ASYNCIFY=1 \
    -s MODULARIZE=1 \
    -s 'EXPORT_NAME="createShufflingModule"' \
    -s "EXPORTED_FUNCTIONS=['_simulateAztecWithWeightMatrix','_simulateAztecGammaDirect','_simulateAztecPeriodicDirect','_simulateAztecIIDDirect','_simulateAztecDoubleDimer','_freeString','_getProgress','_malloc','_free']" \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","setValue","getValue","HEAPF64"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=64MB \
    -s ENVIRONMENT=web \
    -fexceptions \
    -s SINGLE_FILE=1 \
    -O3 -ffast-math && mv 2025-12-11-t-embedding-shuffling.js ../../js/
*/

#include <emscripten.h>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <random>
#include <stdexcept>
#include <string>
#include <vector>

using namespace std;

static constexpr int kMaxSupportedN = 330;
volatile int progressCounter = 0;

struct Xoshiro256pp {
    using result_type = uint64_t;

    uint64_t s[4];

    explicit Xoshiro256pp(uint64_t seed = 0) {
        seedState(seed);
    }

    static constexpr result_type min() {
        return 0;
    }

    static constexpr result_type max() {
        return UINT64_MAX;
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

    inline uint64_t operator()() {
        return next();
    }

    inline double next_double() {
        const uint64_t v = (next() >> 12) | 0x3FF0000000000000ULL;
        double d;
        std::memcpy(&d, &v, sizeof(d));
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
        if (rows < 0 || cols < 0) {
            throw std::runtime_error("Negative matrix dimension");
        }

        const size_t needed = static_cast<size_t>(rows) * static_cast<size_t>(cols);
        if (data_.size() < needed) {
            data_.resize(needed);
        }
        rows_ = rows;
        cols_ = cols;
        std::fill(data_.begin(), data_.begin() + needed, value);
    }

    T* operator[](int row) {
        return data_.data() + static_cast<size_t>(row) * static_cast<size_t>(cols_);
    }

    const T* operator[](int row) const {
        return data_.data() + static_cast<size_t>(row) * static_cast<size_t>(cols_);
    }

    T& at(int row, int col) {
        return (*this)[row][col];
    }

    const T& at(int row, int col) const {
        return (*this)[row][col];
    }

    int size() const {
        return rows_;
    }

    int rows() const {
        return rows_;
    }

    int cols() const {
        return cols_;
    }
};

using MatrixDouble = FlatMatrix<double>;
using MatrixInt = FlatMatrix<int>;

class PackedDecisionPyramid {
public:
    int levels = 0;
    vector<uint64_t> offsets;
    vector<uint32_t> words;

    PackedDecisionPyramid() = default;
    explicit PackedDecisionPyramid(int n) { reset(n); }

    void reset(int n) {
        if (n < 0) {
            throw std::runtime_error("Negative decision-pyramid level count");
        }

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
        if (value) {
            word |= mask;
        } else {
            word &= ~mask;
        }
    }

    inline bool get(int rows, int i, int j) const {
        const uint64_t idx = bitIndex(rows, i, j);
        return (words[static_cast<size_t>(idx >> 5)] >> (idx & 31U)) & 1U;
    }
};

static int checkedN(int n) {
    if (n < 1) {
        throw std::runtime_error("N must be at least 1");
    }
    if (n > kMaxSupportedN) {
        throw std::runtime_error("N exceeds supported maximum 330");
    }
    return n;
}

static double clampProbability(double value) {
    if (!std::isfinite(value)) {
        return 0.5;
    }
    if (value <= 0.0) {
        return 0.0;
    }
    if (value >= 1.0) {
        return 1.0;
    }
    return value;
}

static void setProgressInRange(int start, int end, int completed, int total) {
    if (total <= 0) {
        progressCounter = end;
        return;
    }
    const double t = completed / static_cast<double>(total);
    progressCounter = start + static_cast<int>((end - start) * t);
}

static void computeDecisionPyramids(
    const MatrixDouble& weights,
    PackedDecisionPyramid& primary,
    PackedDecisionPyramid* secondary = nullptr,
    int progressStart = 0,
    int progressEnd = 20) {

    const int dim = weights.size();
    if (dim <= 0 || (dim & 1) || weights.cols() != dim) {
        throw std::runtime_error("Weight matrix dimension must be positive, square, and even");
    }

    const int levels = dim / 2;
    primary.reset(levels);
    if (secondary) {
        secondary->reset(levels);
    }

    MatrixDouble currentValue(dim, dim, 0.0);
    MatrixInt currentExp(dim, dim, 0);
    MatrixDouble nextValue;
    MatrixInt nextExp;

    for (int i = 0; i < dim; ++i) {
        for (int j = 0; j < dim; ++j) {
            const double weight = weights[i][j];
            if (!std::isfinite(weight)) {
                throw std::runtime_error("Weight matrix contains a non-finite value");
            }
            if (std::fabs(weight) < 1e-12) {
                currentValue[i][j] = 1.0;
                currentExp[i][j] = 1;
            } else {
                currentValue[i][j] = weight;
                currentExp[i][j] = 0;
            }
        }
    }

    for (int size = dim; size >= 2; size -= 2) {
        const int rows = size / 2;

        for (int i = 0; i < rows; ++i) {
            for (int j = 0; j < rows; ++j) {
                const int i0 = i << 1;
                const int j0 = j << 1;
                const int expMain = currentExp[i0][j0] + currentExp[i0 + 1][j0 + 1];
                const int expOther = currentExp[i0 + 1][j0] + currentExp[i0][j0 + 1];

                bool primaryDecision;
                bool secondaryDecision;

                if (expMain > expOther) {
                    primaryDecision = false;
                    secondaryDecision = false;
                } else if (expMain < expOther) {
                    primaryDecision = true;
                    secondaryDecision = true;
                } else {
                    const double prodMain = currentValue[i0 + 1][j0 + 1] * currentValue[i0][j0];
                    const double prodOther = currentValue[i0 + 1][j0] * currentValue[i0][j0 + 1];
                    const double denom = prodMain + prodOther;
                    const double probability = clampProbability(std::fabs(denom) < 1e-300 ? 0.5 : prodMain / denom);
                    primaryDecision = shuffleRng.next_double() < probability;
                    secondaryDecision = secondary ? (shuffleRng.next_double() < probability) : primaryDecision;
                }

                primary.set(rows, i, j, primaryDecision);
                if (secondary) {
                    secondary->set(rows, i, j, secondaryDecision);
                }
            }
        }

        const int nextSize = size - 2;
        if (nextSize == 0) {
            progressCounter = progressEnd;
            emscripten_sleep(0);
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

                if (!std::isfinite(denominator) || std::fabs(denominator) < 1e-300) {
                    denominator = denominator < 0.0 ? -1e-300 : 1e-300;
                }

                nextValue[i][j] = current / denominator;
                nextExp[i][j] = currentFlag - denominatorExp;
            }
        }

        std::swap(currentValue, nextValue);
        std::swap(currentExp, nextExp);

        if ((rows & 15) == 0 || rows == 1) {
            setProgressInRange(progressStart, progressEnd, levels - rows + 1, levels);
            emscripten_sleep(0);
        }
    }
}

static void delslideInPlace(MatrixInt& out, const MatrixInt& in) {
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

static void createStepInPlace(MatrixInt& config, const PackedDecisionPyramid& decisions, int rows) {
    const int n = config.size();
    const int half = n / 2;

    for (int i = 0; i < half; ++i) {
        for (int j = 0; j < half; ++j) {
            const int i2 = i << 1;
            const int j2 = j << 1;

            if (config[i2][j2] == 0 && config[i2 + 1][j2] == 0 &&
                config[i2][j2 + 1] == 0 && config[i2 + 1][j2 + 1] == 0) {

                bool leftClear = true;
                bool rightClear = true;
                bool topClear = true;
                bool bottomClear = true;

                if (j > 0) {
                    leftClear = config[i2][j2 - 1] == 0 && config[i2 + 1][j2 - 1] == 0;
                }
                if (j < half - 1) {
                    rightClear = config[i2][j2 + 2] == 0 && config[i2 + 1][j2 + 2] == 0;
                }
                if (i > 0) {
                    topClear = config[i2 - 1][j2] == 0 && config[i2 - 1][j2 + 1] == 0;
                }
                if (i < half - 1) {
                    bottomClear = config[i2 + 2][j2] == 0 && config[i2 + 2][j2 + 1] == 0;
                }

                if (leftClear && rightClear && topClear && bottomClear) {
                    if (decisions.get(rows, i, j)) {
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

static MatrixInt aztecgen(const PackedDecisionPyramid& decisions, int progressStart = 20, int progressEnd = 95) {
    const int levels = decisions.levels;
    if (levels <= 0) {
        return MatrixInt();
    }

    MatrixInt bufferA((levels << 1) + 2, (levels << 1) + 2, 0);
    MatrixInt bufferB((levels << 1) + 2, (levels << 1) + 2, 0);

    bufferA.reset(2, 2, 0);
    if (decisions.get(1, 0, 0)) {
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
        createStepInPlace(*next, decisions, i + 2);
        std::swap(current, next);

        if (((i + 1) & 15) == 0 || i + 1 == totalIterations) {
            setProgressInRange(progressStart, progressEnd, i + 1, totalIterations);
            emscripten_sleep(0);
        }
    }

    progressCounter = progressEnd;
    return std::move(*current);
}

static void appendJsonNumber(string& json, double value) {
    char buf[32];
    const int len = std::snprintf(buf, sizeof(buf), "%.15g", value);
    if (len > 0) {
        json.append(buf, static_cast<size_t>(len));
    }
}

static void appendDominoJSON(string& json, bool& first, double x, double y, double w, double h, const char* color) {
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

static bool appendStandardDominoFromMarker(string& json, bool& first, int i, int j, int size) {
    const bool oddI = i & 1;
    const bool oddJ = j & 1;
    double x;
    double y;
    double w;
    double h;
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

static void appendDominoConfig(string& json, const MatrixInt& config) {
    bool first = true;
    const int size = config.size();

    for (int i = 0; i < size; ++i) {
        for (int j = 0; j < size; ++j) {
            if (config[i][j] == 1) {
                appendStandardDominoFromMarker(json, first, i, j, size);
            }
        }
    }
}

static string serializeDominoConfig(const MatrixInt& config) {
    const int size = config.size();
    string json;
    json.reserve(std::max<size_t>(2, static_cast<size_t>(size) * static_cast<size_t>(size) * 24));
    json.push_back('[');
    appendDominoConfig(json, config);
    json.push_back(']');
    return json;
}

static string serializeDoubleDimerConfig(const MatrixInt& config1, const MatrixInt& config2) {
    const int size = std::max(config1.size(), config2.size());
    string json;
    json.reserve(std::max<size_t>(32, static_cast<size_t>(size) * static_cast<size_t>(size) * 48));
    json += "{\"config1\":[";
    appendDominoConfig(json, config1);
    json += "],\"config2\":[";
    appendDominoConfig(json, config2);
    json += "]}";
    return json;
}

static char* makeCString(const string& value) {
    char* out = static_cast<char*>(std::malloc(value.size() + 1));
    if (!out) {
        return nullptr;
    }
    std::memcpy(out, value.c_str(), value.size() + 1);
    return out;
}

static string escapeJsonString(const string& value) {
    string escaped;
    escaped.reserve(value.size());
    for (char c : value) {
        switch (c) {
            case '"':
            case '\\':
                escaped.push_back('\\');
                escaped.push_back(c);
                break;
            case '\n':
                escaped += "\\n";
                break;
            case '\r':
                escaped += "\\r";
                break;
            case '\t':
                escaped += "\\t";
                break;
            default:
                escaped.push_back(c);
                break;
        }
    }
    return escaped;
}

static char* makeErrorCString(const string& message) {
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

static MatrixDouble copyWeightMatrixFromPointer(int n, const double* weights) {
    if (!weights) {
        throw std::runtime_error("Weight pointer is null");
    }

    const int dim = 2 * n;
    MatrixDouble matrix(dim, dim, 1.0);
    for (int i = 0; i < dim; ++i) {
        for (int j = 0; j < dim; ++j) {
            matrix[i][j] = weights[static_cast<size_t>(i) * static_cast<size_t>(dim) + static_cast<size_t>(j)];
        }
    }
    return matrix;
}

static MatrixDouble generateGammaEdgeWeights(int n, double alpha, double beta) {
    if (!(alpha > 0.0) || !(beta > 0.0) || !std::isfinite(alpha) || !std::isfinite(beta)) {
        throw std::runtime_error("Gamma alpha and beta must be positive finite values");
    }

    std::gamma_distribution<double> gammaAlpha(alpha, 1.0);
    std::gamma_distribution<double> gammaBeta(beta, 1.0);

    const int dim = 2 * n;
    MatrixDouble weights(dim, dim, 1.0);

    for (int i = 0; i < dim; ++i) {
        if ((i & 1) == 0) {
            for (int j = 0; j < dim; ++j) {
                weights[i][j] = ((j & 1) == 0) ? gammaBeta(shuffleRng) : gammaAlpha(shuffleRng);
            }
        }
    }

    return weights;
}

static MatrixDouble generatePeriodicEdgeWeights(
    int n,
    int k,
    int l,
    const double* alphaWeights,
    const double* betaWeights,
    const double* gammaWeights) {

    if (k < 1 || l < 1) {
        throw std::runtime_error("Periodic dimensions must be positive");
    }
    if (!alphaWeights || !betaWeights || !gammaWeights) {
        throw std::runtime_error("Periodic weight pointer is null");
    }

    const int dim = 2 * n;
    MatrixDouble weights(dim, dim, 1.0);

    for (int i = 0; i < dim; ++i) {
        if ((i & 1) == 0) {
            for (int j = 0; j < dim; ++j) {
                const int pi = ((i / 2) % k + k) % k;
                const int pj = ((j / 2) % l + l) % l;
                const size_t idx = static_cast<size_t>(pi) * static_cast<size_t>(l) + static_cast<size_t>(pj);
                if (!std::isfinite(alphaWeights[idx]) ||
                    !std::isfinite(betaWeights[idx]) ||
                    !std::isfinite(gammaWeights[idx])) {
                    throw std::runtime_error("Periodic weights must be finite");
                }
                const double selected = ((j & 1) == 0) ? betaWeights[idx] : alphaWeights[idx];
                weights[i][j] = selected;
            }
        }
    }

    return weights;
}

static string runSingleSampleJSON(const MatrixDouble& weights) {
    PackedDecisionPyramid decisions;
    computeDecisionPyramids(weights, decisions, nullptr, 0, 20);
    MatrixInt dominoConfig = aztecgen(decisions, 20, 95);
    progressCounter = 100;
    emscripten_sleep(0);
    return serializeDominoConfig(dominoConfig);
}

static string runDoubleDimerSampleJSON(const MatrixDouble& weights) {
    PackedDecisionPyramid decisions1;
    PackedDecisionPyramid decisions2;
    computeDecisionPyramids(weights, decisions1, &decisions2, 0, 20);

    MatrixInt dominoConfig1 = aztecgen(decisions1, 20, 57);
    MatrixInt dominoConfig2 = aztecgen(decisions2, 57, 95);

    progressCounter = 100;
    emscripten_sleep(0);
    return serializeDoubleDimerConfig(dominoConfig1, dominoConfig2);
}

static char* returnJSON(const string& json) {
    char* out = makeCString(json);
    if (!out) {
        throw std::runtime_error("Failed to allocate memory for output");
    }
    return out;
}

static char* returnError(const std::exception& e) {
    progressCounter = 100;
    return makeErrorCString(e.what());
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateAztecIIDDirect(int n, double* edgeWeights) {
    try {
        progressCounter = 0;
        n = checkedN(n);
        MatrixDouble weights = copyWeightMatrixFromPointer(n, edgeWeights);
        emscripten_sleep(0);
        return returnJSON(runSingleSampleJSON(weights));
    } catch (const std::exception& e) {
        return returnError(e);
    }
}

EMSCRIPTEN_KEEPALIVE
char* simulateAztecPeriodicDirect(
    int n,
    int k,
    int l,
    double* alphaWeights,
    double* betaWeights,
    double* gammaWeights) {

    try {
        progressCounter = 0;
        n = checkedN(n);
        MatrixDouble weights = generatePeriodicEdgeWeights(n, k, l, alphaWeights, betaWeights, gammaWeights);
        emscripten_sleep(0);
        return returnJSON(runSingleSampleJSON(weights));
    } catch (const std::exception& e) {
        return returnError(e);
    }
}

EMSCRIPTEN_KEEPALIVE
char* simulateAztecGammaDirect(int n, double alpha, double beta) {
    try {
        progressCounter = 0;
        n = checkedN(n);
        MatrixDouble weights = generateGammaEdgeWeights(n, alpha, beta);
        emscripten_sleep(0);
        return returnJSON(runSingleSampleJSON(weights));
    } catch (const std::exception& e) {
        return returnError(e);
    }
}

EMSCRIPTEN_KEEPALIVE
char* simulateAztecDoubleDimer(int n, double* edgeWeights) {
    try {
        progressCounter = 0;
        n = checkedN(n);
        MatrixDouble weights = copyWeightMatrixFromPointer(n, edgeWeights);
        emscripten_sleep(0);
        return returnJSON(runDoubleDimerSampleJSON(weights));
    } catch (const std::exception& e) {
        return returnError(e);
    }
}

EMSCRIPTEN_KEEPALIVE
char* simulateAztecWithWeightMatrix(int n, double* weightsPtr) {
    try {
        progressCounter = 0;
        n = checkedN(n);
        MatrixDouble weights = copyWeightMatrixFromPointer(n, weightsPtr);
        emscripten_sleep(0);
        return returnJSON(runSingleSampleJSON(weights));
    } catch (const std::exception& e) {
        return returnError(e);
    }
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    std::free(str);
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

} // extern "C"
