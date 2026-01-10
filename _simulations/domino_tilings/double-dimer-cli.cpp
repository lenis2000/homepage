/*
Aztec Diamond CLI - Fast sampling of domino tilings, double dimers, and height fluctuations

HIGH-PERFORMANCE OPTIMIZATIONS:
- Xoshiro256++ RNG (state-of-art, fits in registers, replaces slow mt19937)
- Ping-pong buffer allocation (zero allocations in sampling loop)
- In-place delslide (reuses pre-allocated matrix)
- Direct 2D array addressing for height function (no unordered_map overhead)
- Integer-based coordinate encoding (no string allocations)
- Cache-friendly pixel loop order (row-major access)

Compilation:
  # Download stb_image_write.h first (one time):
  curl -O https://raw.githubusercontent.com/nothings/stb/master/stb_image_write.h

  # Compile with aggressive optimization (OpenMP for parallel fluctuation mode):
  /opt/homebrew/bin/g++-15 -std=c++17 -Ofast -mcpu=native -funroll-loops -flto -fopenmp -DNDEBUG -fno-exceptions -fno-rtti -fomit-frame-pointer -ftree-vectorize -o double_dimer double-dimer-cli.cpp

  # Or without OpenMP (single-threaded):
  g++ -std=c++17 -Ofast -ffast-math -funroll-loops -DNDEBUG -fno-exceptions -fno-rtti -o double_dimer double-dimer-cli.cpp

Usage:
  ./double_dimer -n 100 -o height_diff.png
  ./double_dimer -n 200 --preset gamma --alpha 2.0 -o gamma_sample.png
  ./double_dimer -n 100 --mode fluctuation --samples 20 -o fluctuation.png

Repository: https://github.com/lenis2000/homepage
*/

#include <iostream>
#include <vector>
#include <cmath>
#include <climits>
#include <random>       // For gamma_distribution, normal_distribution
#include <string>
#include <cstring>
#include <algorithm>
#include <chrono>
#include <unordered_map>
#include <map>
#include <set>
#include <queue>
#include <tuple>
#include <mutex>

#ifdef _OPENMP
#include <omp.h>
#endif

// Check for stb_image_write.h
#if __has_include("stb_image_write.h")
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"
#else
#error "Please download stb_image_write.h from https://github.com/nothings/stb"
#endif

using namespace std;

// ============================================================================
// Coordinate Encoding (OPTIMIZATION: replace string keys with int64_t)
// ============================================================================

// Encode (x, y) coordinates into a single int64_t
// Supports coordinates in range [-100000, 100000]
inline int64_t encodeCoord(int x, int y) {
    return ((int64_t)(x + 100000) << 20) | (y + 100000);
}

// Decode int64_t back to (x, y) coordinates
inline pair<int, int> decodeCoord(int64_t key) {
    return {(int)(key >> 20) - 100000, (int)(key & 0xFFFFF) - 100000};
}

// ============================================================================
// Matrix Classes (from matrix_optimized.h)
// ============================================================================

class MatrixDouble {
private:
    vector<double> data;
    int rows_, cols_;
public:
    MatrixDouble() : rows_(0), cols_(0) {}
    MatrixDouble(int rows, int cols, double val = 0.0)
        : data(rows * cols, val), rows_(rows), cols_(cols) {}

    // Move constructor and assignment for efficiency
    MatrixDouble(MatrixDouble&&) = default;
    MatrixDouble& operator=(MatrixDouble&&) = default;
    MatrixDouble(const MatrixDouble&) = default;
    MatrixDouble& operator=(const MatrixDouble&) = default;

    double& at(int i, int j) { return data[i * cols_ + j]; }
    const double& at(int i, int j) const { return data[i * cols_ + j]; }
    int size() const { return rows_; }
    int rows() const { return rows_; }
    int cols() const { return cols_; }
};

class MatrixInt {
private:
    vector<int> data;
    int rows_, cols_;
public:
    MatrixInt() : rows_(0), cols_(0) {}
    MatrixInt(int rows, int cols, int val = 0)
        : data(rows * cols, val), rows_(rows), cols_(cols) {}

    MatrixInt(MatrixInt&&) = default;
    MatrixInt& operator=(MatrixInt&&) = default;
    MatrixInt(const MatrixInt&) = default;
    MatrixInt& operator=(const MatrixInt&) = default;

    int& at(int i, int j) { return data[i * cols_ + j]; }
    const int& at(int i, int j) const { return data[i * cols_ + j]; }
    int size() const { return rows_; }
    int rows() const { return rows_; }
    int cols() const { return cols_; }

    // OPTIMIZATION: Reset to new size without reallocation if possible
    void reset(int rows, int cols, int val = 0) {
        int needed = rows * cols;
        if ((int)data.size() < needed) {
            data.resize(needed);
        }
        rows_ = rows;
        cols_ = cols;
        std::fill(data.begin(), data.begin() + needed, val);
    }

    // OPTIMIZATION: Swap contents with another matrix
    void swap(MatrixInt& other) {
        std::swap(rows_, other.rows_);
        std::swap(cols_, other.cols_);
        data.swap(other.data);
    }
};

// ============================================================================
// Fast RNG: Xoshiro256++ (state-of-the-art, fits in registers)
// Much faster than std::mt19937 which has 624 words of state
// ============================================================================

struct Xoshiro256pp {
    using result_type = uint64_t;

    uint64_t s[4];

    Xoshiro256pp(uint64_t seed = 0) {
        // Seeding using SplitMix64
        uint64_t z = seed + 0x9e3779b97f4a7c15ULL;
        z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
        z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
        s[0] = z ^ (z >> 31);
        z = (s[0] + 0x9e3779b97f4a7c15ULL);
        z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
        z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
        s[1] = z ^ (z >> 31);
        z = (s[1] + 0x9e3779b97f4a7c15ULL);
        z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
        z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
        s[2] = z ^ (z >> 31);
        z = (s[2] + 0x9e3779b97f4a7c15ULL);
        z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
        z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
        s[3] = z ^ (z >> 31);
    }

    void seed(uint64_t seed) {
        *this = Xoshiro256pp(seed);
    }

    // URNG interface for std::distributions
    static constexpr uint64_t min() { return 0; }
    static constexpr uint64_t max() { return UINT64_MAX; }
    uint64_t operator()() { return next(); }

    inline uint64_t rotl(const uint64_t x, int k) const {
        return (x << k) | (x >> (64 - k));
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

    // Fast double in [0, 1) using IEEE 754 bit manipulation
    inline double next_double() {
        const uint64_t v = (next() >> 12) | 0x3FF0000000000000ULL;
        double d;
        memcpy(&d, &v, sizeof(d));
        return d - 1.0;
    }
};

static thread_local Xoshiro256pp rng;

// ============================================================================
// Color Maps
// ============================================================================

struct RGB { uint8_t r, g, b; };

RGB interpolateColor(const vector<RGB>& stops, double t) {
    t = max(0.0, min(1.0, t));
    double pos = t * (stops.size() - 1);
    int idx = (int)pos;
    if (idx >= (int)stops.size() - 1) return stops.back();
    double frac = pos - idx;
    return {
        (uint8_t)(stops[idx].r + frac * (stops[idx+1].r - stops[idx].r)),
        (uint8_t)(stops[idx].g + frac * (stops[idx+1].g - stops[idx].g)),
        (uint8_t)(stops[idx].b + frac * (stops[idx+1].b - stops[idx].b))
    };
}

vector<RGB> getViridis() {
    return {
        {68, 1, 84}, {72, 40, 120}, {62, 74, 137}, {49, 104, 142},
        {38, 130, 142}, {31, 158, 137}, {53, 183, 121}, {109, 205, 89},
        {180, 222, 44}, {253, 231, 37}
    };
}

vector<RGB> getPlasma() {
    return {
        {13, 8, 135}, {75, 3, 161}, {126, 3, 168}, {168, 34, 150},
        {203, 70, 121}, {229, 107, 93}, {248, 148, 65}, {253, 195, 40},
        {240, 249, 33}
    };
}

vector<RGB> getCoolwarm() {
    return {
        {59, 76, 192}, {98, 130, 234}, {141, 176, 254}, {184, 208, 249},
        {221, 221, 221}, {245, 196, 173}, {244, 154, 123}, {222, 96, 77},
        {180, 4, 38}
    };
}

vector<RGB> getGrayscale() {
    return {{0, 0, 0}, {128, 128, 128}, {255, 255, 255}};
}

vector<RGB> getColormap(const string& name) {
    if (name == "plasma") return getPlasma();
    if (name == "coolwarm") return getCoolwarm();
    if (name == "grayscale") return getGrayscale();
    return getViridis();  // default
}

// ============================================================================
// Weight Generation Functions
// ============================================================================

MatrixDouble generateUniformWeights(int dim) {
    return MatrixDouble(dim, dim, 1.0);
}

MatrixDouble generateBernoulliWeights(int dim, double v1, double v2, double prob) {
    MatrixDouble weights(dim, dim);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            weights.at(i, j) = (rng.next_double() < prob) ? v1 : v2;
        }
    }
    return weights;
}

MatrixDouble generateGaussianWeights(int dim, double beta) {
    MatrixDouble weights(dim, dim);
    normal_distribution<> normal(0.0, 1.0);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            double X = normal(rng);
            weights.at(i, j) = exp(beta * X);
        }
    }
    return weights;
}

MatrixDouble generateGammaWeights(int dim, double alpha) {
    MatrixDouble weights(dim, dim);
    gamma_distribution<> gamma_dist(alpha, 1.0);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            if (i % 2 == 0) {
                weights.at(i, j) = gamma_dist(rng);
            } else {
                weights.at(i, j) = 1.0;
            }
        }
    }
    return weights;
}

MatrixDouble generateBiasedGammaWeights(int dim, double alpha, double beta) {
    MatrixDouble weights(dim, dim, 1.0);
    gamma_distribution<> gamma_a(alpha, 1.0);
    gamma_distribution<> gamma_b(beta, 1.0);
    for (int i = 0; i < dim; i++) {
        if (i % 2 == 0) {
            for (int j = 0; j < dim; j++) {
                if (j % 2 == 0) {
                    weights.at(i, j) = gamma_b(rng);
                } else {
                    weights.at(i, j) = gamma_a(rng);
                }
            }
        }
    }
    return weights;
}

MatrixDouble generate2x2PeriodicWeights(int dim, double a, double b) {
    MatrixDouble weights(dim, dim);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            int im = i & 3;
            int jm = j & 3;
            if ((im < 2 && jm < 2) || (im >= 2 && jm >= 2))
                weights.at(i, j) = b;
            else
                weights.at(i, j) = a;
        }
    }
    return weights;
}

// IID random weight functions (matching web simulation)
MatrixDouble generateIIDUniformWeights(int dim, double a, double b) {
    MatrixDouble weights(dim, dim);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            weights.at(i, j) = a + rng.next_double() * (b - a);
        }
    }
    return weights;
}

MatrixDouble generateIIDExponentialWeights(int dim) {
    MatrixDouble weights(dim, dim);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            weights.at(i, j) = -log(1.0 - rng.next_double());
        }
    }
    return weights;
}

MatrixDouble generateIIDParetoWeights(int dim, double alpha, double xmin) {
    MatrixDouble weights(dim, dim);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            weights.at(i, j) = xmin / pow(1.0 - rng.next_double(), 1.0 / alpha);
        }
    }
    return weights;
}

MatrixDouble generateIIDGeometricWeights(int dim, double p) {
    MatrixDouble weights(dim, dim);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            weights.at(i, j) = floor(log(1.0 - rng.next_double()) / log(1.0 - p)) + 1;
        }
    }
    return weights;
}

// Layered weight functions
MatrixDouble generateDiagonalLayeredWeights(int dim, double val1, double val2, double p1, double p2) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    vector<double> diagWeight(N);
    for (int d = 0; d < N; d++) {
        double p = (d % 2 == 0) ? p1 : p2;
        diagWeight[d] = (rng.next_double() < p) ? val1 : val2;
    }
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int diagJ = j / 2;
            weights.at(i, j) = diagWeight[diagJ];
        }
    }
    return weights;
}

// Critical scaling: weights = val1 + 2/sqrt(N) or val2 - 1/sqrt(N)
MatrixDouble generateCriticalScalingWeights(int dim, double val1, double val2, double p1, double p2) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    double sqrtN = sqrt((double)N);
    double w1 = val1 + 2.0 / sqrtN;
    double w2 = val2 - 1.0 / sqrtN;

    vector<double> diagWeight(N);
    for (int d = 0; d < N; d++) {
        double p = (d % 2 == 0) ? p1 : p2;
        diagWeight[d] = (rng.next_double() < p) ? w1 : w2;
    }
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int diagJ = j / 2;
            weights.at(i, j) = diagWeight[diagJ];
        }
    }
    return weights;
}

MatrixDouble generateStraightLayeredWeights(int dim, double val1, double val2, double p1, double p2) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    vector<double> rowWeight(2 * N);
    for (int r = 0; r < 2 * N; r++) {
        double p = (r % 2 == 0) ? p1 : p2;
        rowWeight[r] = (rng.next_double() < p) ? val1 : val2;
    }
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int faceY = (i - j) / 2;
            int layerIdx = faceY + N - 1;
            if (layerIdx >= 0 && layerIdx < 2 * N) {
                weights.at(i, j) = rowWeight[layerIdx];
            }
        }
    }
    return weights;
}

// Critical scaling (straight): weights = val1 + 2/sqrt(N) or val2 - 1/sqrt(N)
MatrixDouble generateStraightCriticalScalingWeights(int dim, double val1, double val2, double p1, double p2) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    double sqrtN = sqrt((double)N);
    double w1 = val1 + 2.0 / sqrtN;
    double w2 = val2 - 1.0 / sqrtN;

    vector<double> rowWeight(2 * N);
    for (int r = 0; r < 2 * N; r++) {
        double p = (r % 2 == 0) ? p1 : p2;
        rowWeight[r] = (rng.next_double() < p) ? w1 : w2;
    }
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int faceY = (i - j) / 2;
            int layerIdx = faceY + N - 1;
            if (layerIdx >= 0 && layerIdx < 2 * N) {
                weights.at(i, j) = rowWeight[layerIdx];
            }
        }
    }
    return weights;
}

MatrixDouble generateDiagonalPeriodicWeights(int dim, double w1, double w2) {
    MatrixDouble weights(dim, dim, 1.0);
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int diagJ = j / 2;
            weights.at(i, j) = ((diagJ / 2) % 2 == 0) ? w1 : w2;
        }
    }
    return weights;
}

MatrixDouble generateStraightPeriodicWeights(int dim, double w1, double w2) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int faceY = (i - j) / 2;
            weights.at(i, j) = ((faceY + N) % 2 == 0) ? w1 : w2;
        }
    }
    return weights;
}

// Critical scaling periodic (diagonal): weights = val1 + 2/sqrt(N) or val2 - 1/sqrt(N), alternating deterministically
MatrixDouble generateDiagonalCriticalPeriodicWeights(int dim, double val1, double val2) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    double sqrtN = sqrt((double)N);
    double w1 = val1 + 2.0 / sqrtN;
    double w2 = val2 - 1.0 / sqrtN;

    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int diagJ = j / 2;
            weights.at(i, j) = ((diagJ / 2) % 2 == 0) ? w1 : w2;
        }
    }
    return weights;
}

// Critical scaling periodic (straight): weights = val1 + 2/sqrt(N) or val2 - 1/sqrt(N), alternating deterministically
MatrixDouble generateStraightCriticalPeriodicWeights(int dim, double val1, double val2) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    double sqrtN = sqrt((double)N);
    double w1 = val1 + 2.0 / sqrtN;
    double w2 = val2 - 1.0 / sqrtN;

    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int faceY = (i - j) / 2;
            weights.at(i, j) = ((faceY + N) % 2 == 0) ? w1 : w2;
        }
    }
    return weights;
}

MatrixDouble generateDiagonalUniformWeights(int dim, double a, double b) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    vector<double> diagWeight(N);
    for (int d = 0; d < N; d++) {
        diagWeight[d] = a + (b - a) * rng.next_double();
    }
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int diagJ = j / 2;
            weights.at(i, j) = diagWeight[diagJ];
        }
    }
    return weights;
}

MatrixDouble generateStraightUniformWeights(int dim, double a, double b) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;
    vector<double> rowWeight(2 * N);
    for (int r = 0; r < 2 * N; r++) {
        rowWeight[r] = a + (b - a) * rng.next_double();
    }
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int faceY = (i - j) / 2;
            int layerIdx = faceY + N - 1;
            if (layerIdx >= 0 && layerIdx < 2 * N) {
                weights.at(i, j) = rowWeight[layerIdx];
            }
        }
    }
    return weights;
}

// ============================================================================
// Sampling Algorithm (OPTIMIZED with reserve() and move semantics)
// ============================================================================

pair<vector<MatrixDouble>, vector<MatrixDouble>> d3pslim(const MatrixDouble& x1) {
    int n = x1.size();
    int m = n / 2;

    vector<MatrixDouble> A1, A2;
    // OPTIMIZATION: Pre-reserve vector capacity
    A1.reserve(m);
    A2.reserve(m);

    MatrixDouble B(n, n, 0.0);
    MatrixDouble C(n, n, 0.0);

    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            if (x1.at(i, j) == 0.0) {
                B.at(i, j) = 1.0;
                C.at(i, j) = 1.0;
            } else {
                B.at(i, j) = x1.at(i, j);
                C.at(i, j) = 0.0;
            }
        }
    }

    // OPTIMIZATION: Use move semantics
    A1.push_back(std::move(B));
    A2.push_back(std::move(C));

    for (int k = 0; k < m - 1; k++) {
        int size = n - 2*k - 2;
        B = MatrixDouble(size, size, 0.0);
        C = MatrixDouble(size, size, 0.0);

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                int idx_i = i + 2*(i%2);
                int idx_j = j + 2*(j%2);

                double a1_val = A1[k].at(idx_i, idx_j);
                double a1_exp = A2[k].at(idx_i, idx_j);

                double sum1_exp = A2[k].at(idx_i, idx_j) + A2[k].at(i+1, j+1);
                double sum2_exp = A2[k].at(idx_i, j+1) + A2[k].at(i+1, idx_j);

                double a2_val, a2_exp;

                if (sum1_exp == sum2_exp) {
                    a2_val = A1[k].at(idx_i, idx_j) * A1[k].at(i+1, j+1) +
                            A1[k].at(idx_i, j+1) * A1[k].at(i+1, idx_j);
                    a2_exp = sum1_exp;
                } else if (sum1_exp < sum2_exp) {
                    a2_val = A1[k].at(idx_i, idx_j) * A1[k].at(i+1, j+1);
                    a2_exp = sum1_exp;
                } else {
                    a2_val = A1[k].at(idx_i, j+1) * A1[k].at(i+1, idx_j);
                    a2_exp = sum2_exp;
                }

                B.at(i, j) = a1_val / a2_val;
                C.at(i, j) = a1_exp - a2_exp;
            }
        }

        // OPTIMIZATION: Use move semantics
        A1.push_back(std::move(B));
        A2.push_back(std::move(C));
    }

    return {std::move(A1), std::move(A2)};
}

vector<MatrixDouble> probsslim(const MatrixDouble& x1) {
    auto [a1, a2] = d3pslim(x1);
    int n = a1.size();
    vector<MatrixDouble> A;
    // OPTIMIZATION: Pre-reserve
    A.reserve(n);

    for (int k = 0; k < n; k++) {
        int size = k + 1;
        MatrixDouble C(size, size, 0.0);

        for (int i = 0; i < size; i++) {
            for (int j = 0; j < size; j++) {
                double exp1 = a2[n-k-1].at(2*i, 2*j) + a2[n-k-1].at(2*i+1, 2*j+1);
                double exp2 = a2[n-k-1].at(2*i+1, 2*j) + a2[n-k-1].at(2*i, 2*j+1);

                if (exp1 > exp2) {
                    C.at(i, j) = 0.0;
                } else if (exp1 < exp2) {
                    C.at(i, j) = 1.0;
                } else {
                    double num = a1[n-k-1].at(2*i+1, 2*j+1) * a1[n-k-1].at(2*i, 2*j);
                    double den = num + a1[n-k-1].at(2*i+1, 2*j) * a1[n-k-1].at(2*i, 2*j+1);
                    C.at(i, j) = num / den;
                }
            }
        }
        // OPTIMIZATION: Use move semantics
        A.push_back(std::move(C));
    }

    return A;
}

// OPTIMIZATION: In-place delslide that reuses pre-allocated buffer
void delslideInPlace(MatrixInt& a0, const MatrixInt& x1) {
    int n = x1.size();
    int newSize = n + 2;
    a0.reset(newSize, newSize, 0);

    // Copy with offset
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            a0.at(i + 1, j + 1) = x1.at(i, j);
        }
    }

    int half = n / 2;
    // Deletion
    for (int i = 0; i < half; i++) {
        for (int j = 0; j < half; j++) {
            int i2 = i << 1, j2 = j << 1;
            if (a0.at(i2, j2) == 1 && a0.at(i2 + 1, j2 + 1) == 1) {
                a0.at(i2, j2) = 0;
                a0.at(i2 + 1, j2 + 1) = 0;
            } else if (a0.at(i2, j2 + 1) == 1 && a0.at(i2 + 1, j2) == 1) {
                a0.at(i2 + 1, j2) = 0;
                a0.at(i2, j2 + 1) = 0;
            }
        }
    }
    // Sliding
    for (int i = 0; i < half + 1; i++) {
        for (int j = 0; j < half + 1; j++) {
            int i2 = i << 1, j2 = j << 1;
            if (a0.at(i2 + 1, j2 + 1) == 1) {
                a0.at(i2, j2) = 1;
                a0.at(i2 + 1, j2 + 1) = 0;
            } else if (a0.at(i2, j2) == 1) {
                a0.at(i2, j2) = 0;
                a0.at(i2 + 1, j2 + 1) = 1;
            } else if (a0.at(i2 + 1, j2) == 1) {
                a0.at(i2, j2 + 1) = 1;
                a0.at(i2 + 1, j2) = 0;
            } else if (a0.at(i2, j2 + 1) == 1) {
                a0.at(i2 + 1, j2) = 1;
                a0.at(i2, j2 + 1) = 0;
            }
        }
    }
}

// OPTIMIZATION: In-place createStep
void createStepInPlace(MatrixInt& x0, const MatrixDouble& p) {
    int n = x0.size();
    int half = n / 2;
    for (int i = 0; i < half; i++) {
        for (int j = 0; j < half; j++) {
            int i2 = i << 1, j2 = j << 1;
            if (x0.at(i2, j2) == 0 && x0.at(i2 + 1, j2) == 0 &&
                x0.at(i2, j2 + 1) == 0 && x0.at(i2 + 1, j2 + 1) == 0) {
                bool a1 = true, a2 = true, a3 = true, a4 = true;
                if (j > 0)
                    a1 = (x0.at(i2, j2 - 1) == 0) && (x0.at(i2 + 1, j2 - 1) == 0);
                if (j < half - 1)
                    a2 = (x0.at(i2, j2 + 2) == 0) && (x0.at(i2 + 1, j2 + 2) == 0);
                if (i > 0)
                    a3 = (x0.at(i2 - 1, j2) == 0) && (x0.at(i2 - 1, j2 + 1) == 0);
                if (i < half - 1)
                    a4 = (x0.at(i2 + 2, j2) == 0) && (x0.at(i2 + 2, j2 + 1) == 0);
                if (a1 && a2 && a3 && a4) {
                    if (rng.next_double() < p.at(i, j)) {
                        x0.at(i2, j2) = 1;
                        x0.at(i2 + 1, j2 + 1) = 1;
                    } else {
                        x0.at(i2 + 1, j2) = 1;
                        x0.at(i2, j2 + 1) = 1;
                    }
                }
            }
        }
    }
}

// OPTIMIZATION: Ping-pong buffer version - zero allocations in main loop
MatrixInt aztecgen(const vector<MatrixDouble>& x0) {
    int n = (int)x0.size();
    int maxSize = 2 * n + 4;

    // Pre-allocate ping-pong buffers
    MatrixInt buf1(maxSize, maxSize, 0);
    MatrixInt buf2(maxSize, maxSize, 0);

    // Initial 2x2 configuration
    buf1.reset(2, 2, 0);
    if (rng.next_double() < x0[0].at(0, 0)) {
        buf1.at(0, 0) = 1;
        buf1.at(1, 1) = 1;
    } else {
        buf1.at(0, 1) = 1;
        buf1.at(1, 0) = 1;
    }

    MatrixInt* curr = &buf1;
    MatrixInt* next = &buf2;

    for (int i = 0; i < n - 1; i++) {
        // Delslide: curr -> next
        delslideInPlace(*next, *curr);
        // CreateStep: in-place on next
        createStepInPlace(*next, x0[i + 1]);
        // Swap pointers
        std::swap(curr, next);
    }

    return std::move(*curr);
}

// ============================================================================
// Domino Extraction
// ============================================================================

struct Domino {
    int gx, gy;
    int orient;
    int sign;
    string color;
};

vector<Domino> extractDominoes(const MatrixInt& config, int N) {
    vector<Domino> dominoes;
    // OPTIMIZATION: Pre-reserve approximate size
    dominoes.reserve(N * N);
    int size = config.size();

    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            if (config.at(i, j) == 1) {
                bool oddI = (i & 1), oddJ = (j & 1);
                Domino d;

                if (oddI && oddJ) {
                    d.orient = 0;
                    d.sign = 1;
                    d.color = "blue";
                    d.gx = j - i - 2;
                    d.gy = size + 1 - (i + j) - 1;
                } else if (oddI && !oddJ) {
                    d.orient = 1;
                    d.sign = -1;
                    d.color = "yellow";
                    d.gx = j - i - 1;
                    d.gy = size + 1 - (i + j) - 2;
                } else if (!oddI && !oddJ) {
                    d.orient = 0;
                    d.sign = -1;
                    d.color = "green";
                    d.gx = j - i - 2;
                    d.gy = size + 1 - (i + j) - 1;
                } else {
                    d.orient = 1;
                    d.sign = 1;
                    d.color = "red";
                    d.gx = j - i - 1;
                    d.gy = size + 1 - (i + j) - 2;
                }
                dominoes.push_back(d);
            }
        }
    }
    return dominoes;
}

// ============================================================================
// Height Function Computation (OPTIMIZED: Direct 2D array addressing)
// ============================================================================

// Direct 2D height array - faster than unordered_map for BFS
struct HeightGrid {
    vector<int> data;
    vector<bool> visited;
    int offsetX, offsetY;
    int width, height;

    static constexpr int UNSET = INT_MIN;

    HeightGrid(int minX, int maxX, int minY, int maxY) {
        offsetX = -minX;
        offsetY = -minY;
        width = maxX - minX + 1;
        height = maxY - minY + 1;
        data.resize(width * height, UNSET);
        visited.resize(width * height, false);
    }

    inline int& at(int x, int y) {
        return data[(y + offsetY) * width + (x + offsetX)];
    }

    inline bool isVisited(int x, int y) const {
        return visited[(y + offsetY) * width + (x + offsetX)];
    }

    inline void setVisited(int x, int y) {
        visited[(y + offsetY) * width + (x + offsetX)] = true;
    }
};

unordered_map<int64_t, int> computeHeightFunction(const vector<Domino>& dominoes) {
    if (dominoes.empty()) return {};

    // First pass: collect all vertices and find bounds
    int minX = INT_MAX, maxX = INT_MIN;
    int minY = INT_MAX, maxY = INT_MIN;

    // Adjacency stored as vector of (neighbor_x, neighbor_y, dh)
    unordered_map<int64_t, vector<tuple<int, int, int>>> adj;
    adj.reserve(dominoes.size() * 6);

    auto addEdge = [&](int x1, int y1, int x2, int y2, int dh) {
        int64_t k1 = encodeCoord(x1, y1);
        int64_t k2 = encodeCoord(x2, y2);
        adj[k1].emplace_back(x2, y2, dh);
        adj[k2].emplace_back(x1, y1, -dh);
        minX = min(minX, min(x1, x2));
        maxX = max(maxX, max(x1, x2));
        minY = min(minY, min(y1, y2));
        maxY = max(maxY, max(y1, y2));
    };

    for (const auto& d : dominoes) {
        int x = d.gx * 2;
        int y = d.gy * 2;
        int s = d.sign;

        if (d.orient == 0) {
            // Horizontal domino
            addEdge(x, y + 4, x + 4, y + 4, -s);
            addEdge(x + 4, y + 4, x + 8, y + 4, s);
            addEdge(x, y, x + 4, y, s);
            addEdge(x + 4, y, x + 8, y, -s);
            addEdge(x, y + 4, x, y, s);
            addEdge(x + 4, y + 4, x + 4, y, 3*s);
            addEdge(x + 8, y + 4, x + 8, y, s);
        } else {
            // Vertical domino
            addEdge(x, y + 8, x + 4, y + 8, -s);
            addEdge(x, y + 4, x + 4, y + 4, -3*s);
            addEdge(x, y, x + 4, y, -s);
            addEdge(x, y + 8, x, y + 4, s);
            addEdge(x, y + 4, x, y, -s);
            addEdge(x + 4, y + 8, x + 4, y + 4, -s);
            addEdge(x + 4, y + 4, x + 4, y, s);
        }
    }

    if (adj.empty()) return {};

    // Find root (lowest-leftmost vertex)
    int rootX = minX, rootY = maxY;
    for (const auto& [key, _] : adj) {
        auto [gx, gy] = decodeCoord(key);
        if (gy < rootY || (gy == rootY && gx < rootX)) {
            rootX = gx;
            rootY = gy;
        }
    }

    // OPTIMIZATION: Use direct 2D array for BFS instead of unordered_map
    HeightGrid grid(minX, maxX, minY, maxY);

    // BFS using coordinates directly
    queue<pair<int, int>> q;
    grid.at(rootX, rootY) = 0;
    grid.setVisited(rootX, rootY);
    q.push({rootX, rootY});

    while (!q.empty()) {
        auto [vx, vy] = q.front();
        q.pop();
        int64_t vkey = encodeCoord(vx, vy);
        int vh = grid.at(vx, vy);

        for (const auto& [wx, wy, dh] : adj[vkey]) {
            if (!grid.isVisited(wx, wy)) {
                grid.at(wx, wy) = vh + dh;
                grid.setVisited(wx, wy);
                q.push({wx, wy});
            }
        }
    }

    // Convert back to unordered_map for compatibility with existing code
    unordered_map<int64_t, int> H;
    H.reserve(adj.size());
    for (const auto& [key, _] : adj) {
        auto [gx, gy] = decodeCoord(key);
        if (grid.isVisited(gx, gy)) {
            H[key] = grid.at(gx, gy);
        }
    }

    return H;
}

// ============================================================================
// Loop Counting for Double-Dimer Model
// ============================================================================

// Count TOPOLOGICAL number of loops surrounding a point.
// This is the UNSIGNED count - each XOR loop surrounding the point counts as +1.
//
// In the dimer model:
// - Each domino covers ONE edge of the dual lattice (connecting two adjacent face centers)
// - XOR of two tilings = edges covered in exactly one tiling
// - These XOR edges form closed loops
// - We count how many such loops contain the target point
//
int countLoopsSurroundingPoint(const vector<Domino>& dominoes1,
                               const vector<Domino>& dominoes2,
                               int targetX, int targetY,
                               bool debug = false) {
    // Each domino covers an edge on the dual lattice.
    // Dual lattice vertices = centers of unit squares (faces)
    // A domino covering two adjacent squares corresponds to an edge between their centers.
    //
    // Domino coordinates (gx, gy) with orient:
    //   Horizontal (orient=0): covers faces at (gx, gy) and (gx+1, gy)
    //                          -> dual edge from (gx+0.5, gy+0.5) to (gx+1.5, gy+0.5)
    //   Vertical (orient=1):   covers faces at (gx, gy) and (gx, gy+1)
    //                          -> dual edge from (gx+0.5, gy+0.5) to (gx+0.5, gy+1.5)
    //
    // We use integer coords *2 to avoid floating point: (2*gx+1, 2*gy+1) for centers

    auto makeEdgeKey = [](int x1, int y1, int x2, int y2) -> tuple<int,int,int,int> {
        if (x1 > x2 || (x1 == x2 && y1 > y2)) {
            return {x2, y2, x1, y1};
        }
        return {x1, y1, x2, y2};
    };

    // Get dimer edges (internal edges, not boundaries)
    // COORDINATE SYSTEM: Must match the height function!
    // Height function uses x = gx*2, with vertices at x, x+4, x+8 (step of 4)
    // Face centers are at gx*2+2 and gx*2+6 for a horizontal domino
    // (i.e., offset +2 from left vertex, spacing of 4 between adjacent face centers)
    auto getDimerEdges = [&](const vector<Domino>& dominoes) {
        set<tuple<int,int,int,int>> edges;
        for (const auto& d : dominoes) {
            // Face center coordinates matching height function scale
            // Horizontal domino at (gx, gy): faces at (gx*2+2, gy*2+2) and (gx*2+6, gy*2+2)
            // Vertical domino at (gx, gy): faces at (gx*2+2, gy*2+2) and (gx*2+2, gy*2+6)
            int cx1 = d.gx * 2 + 2;  // center of first face (was: 2*gx+1, off by 1)
            int cy1 = d.gy * 2 + 2;
            int cx2, cy2;
            if (d.orient == 0) {  // Horizontal: second face is to the right
                cx2 = cx1 + 4;    // spacing is 4, not 2
                cy2 = cy1;
            } else {  // Vertical: second face is above
                cx2 = cx1;
                cy2 = cy1 + 4;    // spacing is 4, not 2
            }
            edges.insert(makeEdgeKey(cx1, cy1, cx2, cy2));
        }
        return edges;
    };

    auto edges1 = getDimerEdges(dominoes1);
    auto edges2 = getDimerEdges(dominoes2);

    if (debug) {
        cerr << "DEBUG: Tiling 1 has " << dominoes1.size() << " dominoes, " << edges1.size() << " edges" << endl;
        cerr << "DEBUG: Tiling 2 has " << dominoes2.size() << " dominoes, " << edges2.size() << " edges" << endl;
    }

    // XOR: edges in exactly one of the two sets
    set<tuple<int,int,int,int>> xorEdges;
    for (const auto& e : edges1) {
        if (edges2.find(e) == edges2.end()) {
            xorEdges.insert(e);
        }
    }
    for (const auto& e : edges2) {
        if (edges1.find(e) == edges1.end()) {
            xorEdges.insert(e);
        }
    }

    if (xorEdges.empty()) {
        if (debug) cerr << "DEBUG: No XOR edges found" << endl;
        return 0;
    }

    if (debug) {
        cerr << "DEBUG: Found " << xorEdges.size() << " XOR edges" << endl;
        cerr << "DEBUG: Target point (height vertex): (" << (2*targetX) << ", " << (2*targetY) << ")" << endl;
        cerr << "DEBUG: Loop edge coords use face centers at gx*2+2 (offset by 2 from vertices)" << endl;
        cerr << "DEBUG: First few XOR edges:" << endl;
        int count = 0;
        for (const auto& [x1, y1, x2, y2] : xorEdges) {
            if (count++ < 5) cerr << "  (" << x1 << "," << y1 << ") - (" << x2 << "," << y2 << ")" << endl;
        }
    }

    // Build adjacency graph from XOR edges
    map<pair<int,int>, vector<pair<int,int>>> adj;
    for (const auto& [x1, y1, x2, y2] : xorEdges) {
        adj[{x1, y1}].push_back({x2, y2});
        adj[{x2, y2}].push_back({x1, y1});
    }

    // Debug: verify vertex degrees (should all be 2 for XOR of perfect matchings)
    if (debug) {
        int deg1Count = 0, deg2Count = 0, otherDegCount = 0;
        for (const auto& [v, neighbors] : adj) {
            if (neighbors.size() == 1) {
                deg1Count++;
                if (deg1Count <= 3) {
                    cerr << "DEBUG WARNING: vertex (" << v.first << "," << v.second
                         << ") has degree 1 (impossible for XOR of perfect matchings!)" << endl;
                }
            } else if (neighbors.size() == 2) {
                deg2Count++;
            } else {
                otherDegCount++;
            }
        }
        cerr << "DEBUG: Vertex degrees - deg2: " << deg2Count << ", deg1: " << deg1Count
             << ", other: " << otherDegCount << endl;
    }

    // Find all loops by tracing. Each vertex in XOR graph has degree 2, so we get simple cycles.
    set<pair<int,int>> visited;
    vector<vector<pair<int,int>>> loops;

    int traceCount = 0;
    for (const auto& [startVertex, neighbors] : adj) {
        if (visited.count(startVertex)) continue;

        vector<pair<int,int>> loop;
        pair<int,int> current = startVertex;
        pair<int,int> prev = {INT_MIN, INT_MIN};

        if (debug && traceCount < 3) {
            cerr << "DEBUG: Starting trace from (" << startVertex.first << "," << startVertex.second << ")"
                 << " with " << neighbors.size() << " neighbors" << endl;
        }

        while (true) {
            if (visited.count(current) && !loop.empty()) {
                if (debug && traceCount < 3) {
                    cerr << "  Stopped: current (" << current.first << "," << current.second << ") already visited" << endl;
                }
                break;
            }
            visited.insert(current);
            loop.push_back(current);

            pair<int,int> next = {INT_MIN, INT_MIN};
            auto& currentNeighbors = adj[current];
            if (debug && traceCount < 3 && loop.size() <= 5) {
                cerr << "  At (" << current.first << "," << current.second << ") with "
                     << currentNeighbors.size() << " neighbors, prev=(" << prev.first << "," << prev.second << ")" << endl;
            }

            for (const auto& neighbor : currentNeighbors) {
                if (neighbor != prev) {
                    if (!visited.count(neighbor) || neighbor == startVertex) {
                        next = neighbor;
                        break;
                    }
                }
            }

            if (next.first == INT_MIN) {
                if (debug && traceCount < 3) {
                    cerr << "  Stopped: no valid next vertex found. Neighbors were:" << endl;
                    for (const auto& n : currentNeighbors) {
                        cerr << "    (" << n.first << "," << n.second << ") "
                             << (n == prev ? "= prev" : "")
                             << (visited.count(n) ? "visited" : "")
                             << (n == startVertex ? "= start" : "") << endl;
                    }
                }
                break;
            }
            prev = current;
            current = next;
        }

        if (debug && traceCount < 3) {
            cerr << "  Loop size: " << loop.size() << (loop.size() >= 3 ? " (keeping)" : " (discarding)") << endl;
        }

        if (loop.size() >= 3) {
            loops.push_back(loop);
        }
        traceCount++;
    }

    if (debug) {
        cerr << "DEBUG: Found " << loops.size() << " loops" << endl;
        for (size_t i = 0; i < loops.size() && i < 3; i++) {
            cerr << "  Loop " << i << " has " << loops[i].size() << " vertices" << endl;
            // Find bounding box
            int minX = INT_MAX, maxX = INT_MIN, minY = INT_MAX, maxY = INT_MIN;
            for (const auto& [x, y] : loops[i]) {
                minX = min(minX, x); maxX = max(maxX, x);
                minY = min(minY, y); maxY = max(maxY, y);
            }
            cerr << "    Bounding box: x=[" << minX << "," << maxX << "], y=[" << minY << "," << maxY << "]" << endl;
        }
    }

    // Count loops containing the target point using ray casting (point-in-polygon)
    // The user's targetX, targetY are "graph coordinates" matching the height function.
    // Height function vertices are at domino corners.
    // For the ray casting, we test if the HEIGHT FUNCTION VERTEX is inside the loop.
    // In 2x coords, this vertex is at (2*targetX, 2*targetY).

    int loopCount = 0;
    double px = 2.0 * targetX;
    double py = 2.0 * targetY;

    if (debug) {
        cerr << "DEBUG: Testing point (" << px << ", " << py << ") against loops" << endl;
    }

    for (size_t loopIdx = 0; loopIdx < loops.size(); loopIdx++) {
        const auto& loop = loops[loopIdx];
        int crossings = 0;
        int n = loop.size();
        for (int i = 0; i < n; i++) {
            double x1 = loop[i].first;
            double y1 = loop[i].second;
            double x2 = loop[(i+1) % n].first;
            double y2 = loop[(i+1) % n].second;

            // Ray casting: ray from (px, py) going right (+x direction)
            if ((y1 <= py && y2 > py) || (y2 <= py && y1 > py)) {
                double xIntersect = x1 + (py - y1) / (y2 - y1) * (x2 - x1);
                if (xIntersect > px) {
                    crossings++;
                }
            }
        }
        if (debug && loopIdx < 3) {
            cerr << "  Loop " << loopIdx << ": " << crossings << " crossings" << endl;
        }
        if (crossings % 2 == 1) {
            loopCount++;
        }
    }

    return loopCount;
}

// ============================================================================
// PNG Output (OPTIMIZED: cache-friendly loops, no string parsing)
// ============================================================================

// Simple 5x7 bitmap font for digits and symbols
const int FONT_W = 5;
const int FONT_H = 7;

// Each character is 5 columns, 7 rows (stored as 7 bytes, each byte is a row)
const unsigned char FONT_GLYPHS[16][7] = {
    // '0'
    {0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110},
    // '1'
    {0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110},
    // '2'
    {0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111},
    // '3'
    {0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110},
    // '4'
    {0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010},
    // '5'
    {0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110},
    // '6'
    {0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110},
    // '7'
    {0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000},
    // '8'
    {0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110},
    // '9'
    {0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100},
    // '-' (index 10)
    {0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000},
    // '.' (index 11)
    {0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100},
    // ' ' (index 12)
    {0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000},
    // '+' (index 13)
    {0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000},
    // 'e' (index 14)
    {0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110},
    // Reserved
    {0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000}
};

int charToFontIndex(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c == '-') return 10;
    if (c == '.') return 11;
    if (c == ' ') return 12;
    if (c == '+') return 13;
    if (c == 'e' || c == 'E') return 14;
    return 12;  // space for unknown
}

void drawText(vector<unsigned char>& pixels, int imgW, int imgH,
              const string& text, int x, int y, RGB color, int scale = 1) {
    int cursorX = x;
    for (char c : text) {
        int idx = charToFontIndex(c);
        const unsigned char* glyph = FONT_GLYPHS[idx];

        for (int row = 0; row < FONT_H; row++) {
            for (int col = 0; col < FONT_W; col++) {
                if ((glyph[row] >> (FONT_W - 1 - col)) & 1) {
                    // Draw scaled pixel
                    for (int sy = 0; sy < scale; sy++) {
                        for (int sx = 0; sx < scale; sx++) {
                            int px = cursorX + col * scale + sx;
                            int py = y + row * scale + sy;
                            if (px >= 0 && px < imgW && py >= 0 && py < imgH) {
                                int pidx = (py * imgW + px) * 3;
                                pixels[pidx] = color.r;
                                pixels[pidx + 1] = color.g;
                                pixels[pidx + 2] = color.b;
                            }
                        }
                    }
                }
            }
        }
        cursorX += (FONT_W + 1) * scale;  // character width + spacing
    }
}

string formatValue(double val) {
    char buf[32];
    if (abs(val) < 0.01 || abs(val) >= 1000) {
        snprintf(buf, sizeof(buf), "%.1e", val);
    } else if (abs(val) < 10) {
        snprintf(buf, sizeof(buf), "%.2f", val);
    } else {
        snprintf(buf, sizeof(buf), "%.1f", val);
    }
    return string(buf);
}

void savePNG(const string& filename,
             const unordered_map<int64_t, int>& heights1,
             const unordered_map<int64_t, int>& heights2,
             const vector<RGB>& colormap,
             int N, int userScale, bool verbose) {

    // Compute height difference at each vertex
    unordered_map<int64_t, int> heightDiff;
    int minH = INT_MAX, maxH = INT_MIN;
    int minGX = INT_MAX, maxGX = INT_MIN;
    int minGY = INT_MAX, maxGY = INT_MIN;

    for (const auto& [key, h1] : heights1) {
        auto it2 = heights2.find(key);
        if (it2 != heights2.end()) {
            int diff = h1 - it2->second;
            heightDiff[key] = diff;
            minH = min(minH, diff);
            maxH = max(maxH, diff);

            auto [gx, gy] = decodeCoord(key);
            minGX = min(minGX, gx);
            maxGX = max(maxGX, gx);
            minGY = min(minGY, gy);
            maxGY = max(maxGY, gy);
        }
    }

    if (heightDiff.empty()) {
        cerr << "Error: No common vertices between the two configurations" << endl;
        return;
    }

    if (verbose) {
        cerr << "Height difference range: [" << minH << ", " << maxH << "]" << endl;
        cerr << "Grid bounds: X=[" << minGX << "," << maxGX << "], Y=[" << minGY << "," << maxGY << "]" << endl;
    }

    int gridStep = 4;
    int gridW = (maxGX - minGX) / gridStep + 1;
    int gridH = (maxGY - minGY) / gridStep + 1;

    int pixelScale = userScale > 0 ? userScale : max(4, 2000 / max(gridW, gridH));
    int dataW = gridW * pixelScale;
    int dataH = gridH * pixelScale;

    int legendW = max(80, dataW / 10);
    int imgW = dataW + legendW;
    int imgH = dataH;

    if (verbose) {
        cerr << "Image size: " << imgW << " x " << imgH << " pixels" << endl;
    }

    vector<uint8_t> pixels(imgW * imgH * 3, 255);

    // Fill data area with gray
    for (int y = 0; y < imgH; y++) {
        int rowBase = y * imgW * 3;
        for (int x = 0; x < dataW; x++) {
            int idx = rowBase + x * 3;
            pixels[idx] = 128;
            pixels[idx + 1] = 128;
            pixels[idx + 2] = 128;
        }
    }

    double range = (maxH == minH) ? 1.0 : (maxH - minH);

    // OPTIMIZATION: Cache-friendly rendering with row-major access
    for (const auto& [key, diff] : heightDiff) {
        auto [gx, gy] = decodeCoord(key);

        int px = ((gx - minGX) / gridStep) * pixelScale;
        int py = imgH - 1 - ((gy - minGY) / gridStep) * pixelScale;

        double t = (diff - minH) / range;
        RGB color = interpolateColor(colormap, t);

        // Calculate bounds once
        int startY = max(0, py);
        int endY = min(imgH, py + pixelScale);
        int startX = max(0, px);
        int endX = min(dataW, px + pixelScale);

        // OPTIMIZATION: Row-major order (outer=y, inner=x)
        for (int iy = startY; iy < endY; iy++) {
            int rowBase = iy * imgW * 3;
            for (int ix = startX; ix < endX; ix++) {
                int idx = rowBase + ix * 3;
                pixels[idx] = color.r;
                pixels[idx + 1] = color.g;
                pixels[idx + 2] = color.b;
            }
        }
    }

    // Draw legend bar with numeric labels
    int barX = dataW + 10;
    int barTop = imgH / 10;
    int barBottom = imgH - imgH / 10;
    int barWidth = max(20, imgH / 50);
    int textScale = max(1, imgH / 400);  // Scale font with image size
    int textX = barX + barWidth + 5;
    RGB textColor = {0, 0, 0};  // Black text

    for (int y = barTop; y < barBottom; y++) {
        double t = 1.0 - (double)(y - barTop) / (barBottom - barTop);
        RGB color = interpolateColor(colormap, t);
        int rowBase = y * imgW * 3;
        for (int x = barX; x < barX + barWidth && x < imgW; x++) {
            int idx = rowBase + x * 3;
            pixels[idx] = color.r;
            pixels[idx + 1] = color.g;
            pixels[idx + 2] = color.b;
        }
    }

    // Draw 5 labels: max, 75%, 50%, 25%, min
    int fontH = FONT_H * textScale;
    int barH = barBottom - barTop;
    double vals[5] = {(double)maxH, 0.75*maxH + 0.25*minH, 0.5*maxH + 0.5*minH, 0.25*maxH + 0.75*minH, (double)minH};
    int ypos[5] = {barTop, barTop + barH/4, barTop + barH/2, barTop + 3*barH/4, barBottom - fontH};
    for (int i = 0; i < 5; i++) {
        string label = (abs(vals[i]) < 0.01) ? "0" : formatValue(vals[i]);
        drawText(pixels, imgW, imgH, label, textX, ypos[i] - (i < 4 ? fontH/2 : 0), textColor, textScale);
    }

    if (stbi_write_png(filename.c_str(), imgW, imgH, 3, pixels.data(), imgW * 3)) {
        if (verbose) {
            cerr << "Saved to " << filename << endl;
        }
    } else {
        cerr << "Error: Failed to write PNG to " << filename << endl;
    }
}

// Save PNG with a marked point (for stats mode)
void savePNGWithMarker(const string& filename,
                       const unordered_map<int64_t, int>& heights1,
                       const unordered_map<int64_t, int>& heights2,
                       const vector<RGB>& colormap,
                       int N, int userScale, bool verbose,
                       int markX, int markY) {

    // Compute height difference at each vertex
    unordered_map<int64_t, int> heightDiff;
    int minH = INT_MAX, maxH = INT_MIN;
    int minGX = INT_MAX, maxGX = INT_MIN;
    int minGY = INT_MAX, maxGY = INT_MIN;

    for (const auto& [key, h1] : heights1) {
        auto it2 = heights2.find(key);
        if (it2 != heights2.end()) {
            int diff = h1 - it2->second;
            heightDiff[key] = diff;
            minH = min(minH, diff);
            maxH = max(maxH, diff);

            auto [gx, gy] = decodeCoord(key);
            minGX = min(minGX, gx);
            maxGX = max(maxGX, gx);
            minGY = min(minGY, gy);
            maxGY = max(maxGY, gy);
        }
    }

    if (heightDiff.empty()) {
        cerr << "Error: No common vertices between the two configurations" << endl;
        return;
    }

    int gridStep = 4;
    int gridW = (maxGX - minGX) / gridStep + 1;
    int gridH = (maxGY - minGY) / gridStep + 1;

    int pixelScale = userScale > 0 ? userScale : max(4, 2000 / max(gridW, gridH));
    int dataW = gridW * pixelScale;
    int dataH = gridH * pixelScale;

    int legendW = max(80, dataW / 10);
    int imgW = dataW + legendW;
    int imgH = dataH;

    vector<uint8_t> pixels(imgW * imgH * 3, 255);

    // Fill data area with gray
    for (int y = 0; y < imgH; y++) {
        int rowBase = y * imgW * 3;
        for (int x = 0; x < dataW; x++) {
            int idx = rowBase + x * 3;
            pixels[idx] = 128;
            pixels[idx + 1] = 128;
            pixels[idx + 2] = 128;
        }
    }

    double range = (maxH == minH) ? 1.0 : (maxH - minH);

    for (const auto& [key, diff] : heightDiff) {
        auto [gx, gy] = decodeCoord(key);

        int px = ((gx - minGX) / gridStep) * pixelScale;
        int py = imgH - 1 - ((gy - minGY) / gridStep) * pixelScale;

        double t = (diff - minH) / range;
        RGB color = interpolateColor(colormap, t);

        int startY = max(0, py);
        int endY = min(imgH, py + pixelScale);
        int startX = max(0, px);
        int endX = min(dataW, px + pixelScale);

        for (int iy = startY; iy < endY; iy++) {
            int rowBase = iy * imgW * 3;
            for (int ix = startX; ix < endX; ix++) {
                int idx = rowBase + ix * 3;
                pixels[idx] = color.r;
                pixels[idx + 1] = color.g;
                pixels[idx + 2] = color.b;
            }
        }
    }

    // Draw marker at the specified point - large red circle with white border
    // Convert graph coords to pixel coords
    // markX, markY are in "graph coordinates" (vertex coordinates / 2)
    // Height function uses gx = vertex_x * 2, so markX corresponds to gx = markX * 4
    int markerGX = markX * 4;
    int markerGY = markY * 4;
    int markerPX = ((markerGX - minGX) / gridStep) * pixelScale + pixelScale / 2;
    int markerPY = imgH - 1 - ((markerGY - minGY) / gridStep) * pixelScale - pixelScale / 2;

    // Draw concentric circles: white outer, red inner
    int outerRadius = max(15, pixelScale * 3);
    int innerRadius = max(10, pixelScale * 2);
    RGB white = {255, 255, 255};
    RGB red = {255, 0, 0};

    for (int dy = -outerRadius; dy <= outerRadius; dy++) {
        for (int dx = -outerRadius; dx <= outerRadius; dx++) {
            int dist2 = dx * dx + dy * dy;
            int px = markerPX + dx;
            int py = markerPY + dy;
            if (px >= 0 && px < dataW && py >= 0 && py < imgH) {
                int idx = py * imgW * 3 + px * 3;
                if (dist2 <= outerRadius * outerRadius && dist2 > innerRadius * innerRadius) {
                    pixels[idx] = white.r;
                    pixels[idx + 1] = white.g;
                    pixels[idx + 2] = white.b;
                } else if (dist2 <= innerRadius * innerRadius) {
                    pixels[idx] = red.r;
                    pixels[idx + 1] = red.g;
                    pixels[idx + 2] = red.b;
                }
            }
        }
    }

    // Draw crosshairs
    int crossLen = outerRadius + 10;
    for (int d = -crossLen; d <= crossLen; d++) {
        // Horizontal
        int px = markerPX + d;
        if (px >= 0 && px < dataW && markerPY >= 0 && markerPY < imgH) {
            int idx = markerPY * imgW * 3 + px * 3;
            pixels[idx] = white.r;
            pixels[idx + 1] = white.g;
            pixels[idx + 2] = white.b;
        }
        // Vertical
        int py = markerPY + d;
        if (markerPX >= 0 && markerPX < dataW && py >= 0 && py < imgH) {
            int idx = py * imgW * 3 + markerPX * 3;
            pixels[idx] = white.r;
            pixels[idx + 1] = white.g;
            pixels[idx + 2] = white.b;
        }
    }

    // Draw legend bar
    int barX = dataW + 10;
    int barTop = imgH / 10;
    int barBottom = imgH - imgH / 10;
    int barWidth = max(20, imgH / 50);
    int textScale = max(1, imgH / 400);
    int textX = barX + barWidth + 5;
    RGB textColor = {0, 0, 0};

    for (int y = barTop; y < barBottom; y++) {
        double t = 1.0 - (double)(y - barTop) / (barBottom - barTop);
        RGB color = interpolateColor(colormap, t);
        int rowBase = y * imgW * 3;
        for (int x = barX; x < barX + barWidth && x < imgW; x++) {
            int idx = rowBase + x * 3;
            pixels[idx] = color.r;
            pixels[idx + 1] = color.g;
            pixels[idx + 2] = color.b;
        }
    }

    int fontH = FONT_H * textScale;
    int barH = barBottom - barTop;
    double vals[5] = {(double)maxH, 0.75*maxH + 0.25*minH, 0.5*maxH + 0.5*minH, 0.25*maxH + 0.75*minH, (double)minH};
    int ypos[5] = {barTop, barTop + barH/4, barTop + barH/2, barTop + 3*barH/4, barBottom - fontH};
    for (int i = 0; i < 5; i++) {
        string label = (abs(vals[i]) < 0.01) ? "0" : formatValue(vals[i]);
        drawText(pixels, imgW, imgH, label, textX, ypos[i] - (i < 4 ? fontH/2 : 0), textColor, textScale);
    }

    if (stbi_write_png(filename.c_str(), imgW, imgH, 3, pixels.data(), imgW * 3)) {
        if (verbose) {
            cerr << "Saved marked sample to " << filename << endl;
        }
    } else {
        cerr << "Error: Failed to write PNG to " << filename << endl;
    }
}

void saveFluctuationPNG(const string& filename,
                        const unordered_map<int64_t, double>& fluctuation,
                        const vector<RGB>& colormap,
                        int N, int userScale, bool verbose) {

    if (fluctuation.empty()) {
        cerr << "Error: No fluctuation data" << endl;
        return;
    }

    double minF = 1e30, maxF = -1e30;
    int minGX = INT_MAX, maxGX = INT_MIN;
    int minGY = INT_MAX, maxGY = INT_MIN;

    for (const auto& [key, f] : fluctuation) {
        minF = min(minF, f);
        maxF = max(maxF, f);

        auto [gx, gy] = decodeCoord(key);
        minGX = min(minGX, gx);
        maxGX = max(maxGX, gx);
        minGY = min(minGY, gy);
        maxGY = max(maxGY, gy);
    }

    if (verbose) {
        cerr << "Fluctuation range: [" << minF << ", " << maxF << "]" << endl;
        cerr << "Grid bounds: X=[" << minGX << "," << maxGX << "], Y=[" << minGY << "," << maxGY << "]" << endl;
    }

    // Use symmetric range for fluctuations (centered at 0)
    double absMax = max(abs(minF), abs(maxF));
    if (absMax < 1e-9) absMax = 1.0;

    int gridStep = 4;
    int gridW = (maxGX - minGX) / gridStep + 1;
    int gridH = (maxGY - minGY) / gridStep + 1;

    int pixelScale = userScale > 0 ? userScale : max(4, 2000 / max(gridW, gridH));
    int dataW = gridW * pixelScale;
    int dataH = gridH * pixelScale;

    // Add space for legend
    int legendW = max(80, dataW / 10);
    int imgW = dataW + legendW;
    int imgH = dataH;

    if (verbose) {
        cerr << "Image size: " << imgW << " x " << imgH << " pixels" << endl;
    }

    // White background for legend, gray for data area
    vector<uint8_t> pixels(imgW * imgH * 3, 255);
    for (int y = 0; y < imgH; y++) {
        int rowBase = y * imgW * 3;
        for (int x = 0; x < dataW; x++) {
            int idx = rowBase + x * 3;
            pixels[idx] = 128;
            pixels[idx + 1] = 128;
            pixels[idx + 2] = 128;
        }
    }

    // Render fluctuation data
    for (const auto& [key, f] : fluctuation) {
        auto [gx, gy] = decodeCoord(key);

        int px = ((gx - minGX) / gridStep) * pixelScale;
        int py = imgH - 1 - ((gy - minGY) / gridStep) * pixelScale;

        double t = 0.5 + 0.5 * (f / absMax);
        t = max(0.0, min(1.0, t));
        RGB color = interpolateColor(colormap, t);

        int startY = max(0, py);
        int endY = min(imgH, py + pixelScale);
        int startX = max(0, px);
        int endX = min(dataW, px + pixelScale);

        for (int iy = startY; iy < endY; iy++) {
            int rowBase = iy * imgW * 3;
            for (int ix = startX; ix < endX; ix++) {
                int idx = rowBase + ix * 3;
                pixels[idx] = color.r;
                pixels[idx + 1] = color.g;
                pixels[idx + 2] = color.b;
            }
        }
    }

    // Draw legend bar with numeric labels (symmetric: -absMax to +absMax)
    int barX = dataW + 10;
    int barTop = imgH / 10;
    int barBottom = imgH - imgH / 10;
    int barWidth = max(20, imgH / 50);
    int textScale = max(1, imgH / 400);  // Scale font with image size
    int textX = barX + barWidth + 5;
    RGB textColor = {0, 0, 0};  // Black text

    for (int y = barTop; y < barBottom; y++) {
        double t = 1.0 - (double)(y - barTop) / (barBottom - barTop);
        RGB color = interpolateColor(colormap, t);
        int rowBase = y * imgW * 3;
        for (int x = barX; x < barX + barWidth && x < imgW; x++) {
            int idx = rowBase + x * 3;
            pixels[idx] = color.r;
            pixels[idx + 1] = color.g;
            pixels[idx + 2] = color.b;
        }
    }

    // Draw 5 labels: +absMax, +absMax/2, 0, -absMax/2, -absMax
    int fontH = FONT_H * textScale;
    int barH = barBottom - barTop;
    double vals[5] = {absMax, absMax/2, 0, -absMax/2, -absMax};
    int ypos[5] = {barTop, barTop + barH/4, barTop + barH/2, barTop + 3*barH/4, barBottom - fontH};
    for (int i = 0; i < 5; i++) {
        string label = (abs(vals[i]) < 0.01) ? "0" : formatValue(vals[i]);
        drawText(pixels, imgW, imgH, label, textX, ypos[i] - (i < 4 ? fontH/2 : 0), textColor, textScale);
    }

    if (stbi_write_png(filename.c_str(), imgW, imgH, 3, pixels.data(), imgW * 3)) {
        if (verbose) {
            cerr << "Saved to " << filename << endl;
        }
    } else {
        cerr << "Error: Failed to write PNG to " << filename << endl;
    }
}

// ============================================================================
// Save Domino Tiling PNG (colored dominoes like web visualization)
// ============================================================================

// Web-matching domino colors: yellow=#FFCD00, green=#228B22, blue=#0057B7, red=#DC143C
RGB getDominoColor(const string& colorName) {
    if (colorName == "yellow") return {255, 205, 0};
    if (colorName == "green") return {34, 139, 34};
    if (colorName == "blue") return {0, 87, 183};
    if (colorName == "red") return {220, 20, 60};
    return {128, 128, 128};  // gray fallback
}

void saveDominoPNG(const string& filename,
                   const vector<Domino>& dominoes,
                   int N, int userScale, int userBorder, bool verbose) {

    if (dominoes.empty()) {
        cerr << "Error: No dominoes" << endl;
        return;
    }

    // Find grid bounds (domino coordinates, not pixel)
    int minGX = INT_MAX, maxGX = INT_MIN;
    int minGY = INT_MAX, maxGY = INT_MIN;

    for (const auto& d : dominoes) {
        minGX = min(minGX, d.gx);
        maxGX = max(maxGX, d.gx + (d.orient == 0 ? 2 : 1));
        minGY = min(minGY, d.gy);
        maxGY = max(maxGY, d.gy + (d.orient == 1 ? 2 : 1));
    }

    int gridW = maxGX - minGX;
    int gridH = maxGY - minGY;

    // Calculate pixel scale
    int pixelScale = userScale > 0 ? userScale : max(4, 2000 / max(gridW, gridH));
    int imgW = gridW * pixelScale + 3 * pixelScale + userBorder * 2;  // +1.5 step + border margin
    int imgH = gridH * pixelScale + 3 * pixelScale + userBorder * 2;  // +1.5 step + border margin

    if (verbose) {
        cerr << "Grid bounds: X=[" << minGX << "," << maxGX << "], Y=[" << minGY << "," << maxGY << "]" << endl;
        cerr << "Image size: " << imgW << " x " << imgH << " pixels" << endl;
    }

    // White background
    vector<uint8_t> pixels(imgW * imgH * 3, 255);

    // Border width (user-specified, default 0 = touching dominoes)
    int border = userBorder;

    // Render each domino
    // Note: The gx/gy coordinates have gaps - dominoes are on a sparse grid.
    // Scale domino dimensions by 2 to fill the grid cells completely.
    for (const auto& d : dominoes) {
        RGB color = getDominoColor(d.color);

        // Domino bounds in pixels - same position, 2x fatter
        // Vertical dominoes (red, yellow) shifted up by 1/2 domino height
        int x0 = (d.gx - minGX) * pixelScale + pixelScale + border;  // +1/2 step for left margin + border
        int y0 = imgH - (d.gy - minGY + (d.orient == 1 ? 2 : 1)) * pixelScale - 2 * pixelScale - border;  // shift all up 1 step + border
        if (d.orient == 1) y0 -= pixelScale;  // shift vertical dominoes up by additional 1/2
        int w = (d.orient == 0 ? 2 : 1) * pixelScale * 2;  // 2x fatter
        int h = (d.orient == 1 ? 2 : 1) * pixelScale * 2;  // 2x fatter

        // Fill domino interior (leaving border)
        for (int py = y0 + border; py < y0 + h - border && py < imgH; py++) {
            if (py < 0) continue;
            int rowBase = py * imgW * 3;
            for (int px = x0 + border; px < x0 + w - border && px < imgW; px++) {
                if (px < 0) continue;
                int idx = rowBase + px * 3;
                pixels[idx] = color.r;
                pixels[idx + 1] = color.g;
                pixels[idx + 2] = color.b;
            }
        }

        // Draw black border
        RGB black = {0, 0, 0};
        // Top and bottom edges
        for (int px = x0; px < x0 + w && px < imgW; px++) {
            if (px < 0) continue;
            for (int b = 0; b < border && b < h; b++) {
                // Top edge
                int ty = y0 + b;
                if (ty >= 0 && ty < imgH) {
                    int idx = ty * imgW * 3 + px * 3;
                    pixels[idx] = black.r; pixels[idx + 1] = black.g; pixels[idx + 2] = black.b;
                }
                // Bottom edge
                int by = y0 + h - 1 - b;
                if (by >= 0 && by < imgH) {
                    int idx = by * imgW * 3 + px * 3;
                    pixels[idx] = black.r; pixels[idx + 1] = black.g; pixels[idx + 2] = black.b;
                }
            }
        }
        // Left and right edges
        for (int py = y0; py < y0 + h && py < imgH; py++) {
            if (py < 0) continue;
            int rowBase = py * imgW * 3;
            for (int b = 0; b < border && b < w; b++) {
                // Left edge
                int lx = x0 + b;
                if (lx >= 0 && lx < imgW) {
                    int idx = rowBase + lx * 3;
                    pixels[idx] = black.r; pixels[idx + 1] = black.g; pixels[idx + 2] = black.b;
                }
                // Right edge
                int rx = x0 + w - 1 - b;
                if (rx >= 0 && rx < imgW) {
                    int idx = rowBase + rx * 3;
                    pixels[idx] = black.r; pixels[idx + 1] = black.g; pixels[idx + 2] = black.b;
                }
            }
        }
    }

    if (stbi_write_png(filename.c_str(), imgW, imgH, 3, pixels.data(), imgW * 3)) {
        if (verbose) {
            cerr << "Saved to " << filename << endl;
        }
    } else {
        cerr << "Error: Failed to write PNG to " << filename << endl;
    }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

struct Args {
    int n = 50;
    string preset = "uniform";
    string output = "height_diff.png";
    string mode = "double-dimer";
    int samples = 20;
    int threads = 6;
    int scale = 0;
    int border = 0;  // Border width for tiling mode (0 = touching dominoes)
    double alpha = 0.2;
    double beta = 0.25;
    double v1 = 2.0;
    double v2 = 0.5;
    double prob = 0.5;
    double p1 = 0.5;
    double p2 = 0.5;
    double w1 = 2.0;
    double w2 = 0.5;
    double a = 0.5;
    double b = 2.0;
    // IID distribution parameters
    double pareto_alpha = 2.0;
    double pareto_xmin = 1.0;
    double geom_p = 0.5;
    int seed = -1;
    string colormap = "viridis";
    bool verbose = false;
    bool help = false;
    bool noOutput = false;  // Skip picture generation for stats-only runs
    // Stats/histogram mode
    int runs = 100;         // Number of runs for stats mode
    int pointX = 0;         // X coordinate for stats point (graph coords)
    int pointY = 0;         // Y coordinate for stats point (graph coords)
    bool useCenter = true;  // Auto-detect center (default true, false if user specifies --point-x/--point-y)
    bool markSample = false; // Generate one PNG with marked point
    bool debugLoops = false; // Debug output for loop counting
};

void printHelp() {
    cerr << R"(
Aztec Diamond CLI - Fast sampling of domino tilings, double dimers, and height fluctuations

Usage: ./double_dimer [N] [options]

Modes:
  tiling                 Sample a single domino tiling with colored dominoes
  double-dimer           Show height difference h1 - h2 between two tilings (default)
  fluctuation            Sample N tilings, show h - E[h] for last sample
  annealed-double-dimer  Resample weights for EACH tiling, then show h1 - h2
  annealed-fluctuation   Resample weights for EACH sample, show h - E[h]
  stats                  Run many double-dimers, collect loop count histogram at a point (quenched)
  annealed-stats         Run many double-dimers, collect loop count histogram at a point (annealed)

Stats mode output:
  - ONE PNG with the measurement point marked (red circle with crosshairs)
  - Histogram of height differences h1 - h2 at the point
  - Histogram of TOPOLOGICAL loop count (# of XOR loops surrounding the point)
  - Statistics: mean, variance, stddev for both quantities

Note on quenched vs annealed (relevant for random edge weights):
  The web simulation at https://lpetrov.cc/simulations/2025-12-11-t-embedding-arbitrary-weights/
  uses QUENCHED disorder: both tilings share the same random weights (like double-dimer mode).
  Its Height Function Difference [h1 - h2] visualization is also quenched.
  Use annealed-* modes to resample weights independently for each tiling/sample.

Options:
  -n, --size <N>        Aztec diamond order (default: 50)
  -m, --mode <type>     Output mode (default: double-dimer)
  --samples <N>         Number of samples for fluctuation mode (default: 20)
  -t, --threads <N>     Number of OpenMP threads (default: 6)
  -p, --preset <type>   Weight preset (default: uniform)
  -o, --output <file>   Output PNG filename (default: height_diff.png)
  --scale <N>           Pixel scale (default: auto)
  --border <N>          Border width in pixels for tiling mode (default: 0)
  --seed <val>          Random seed (default: random)
  --colormap <name>     viridis, plasma, coolwarm, grayscale (default: viridis)
  --no-output           Skip picture generation (faster, for stats only)
  --runs <N>            Number of runs for stats mode (default: 100)
  --point-x <X>         X coord for stats point in graph coords (auto-centers if not specified)
  --point-y <Y>         Y coord for stats point in graph coords (auto-centers if not specified)
  --center              Explicitly use auto-detected center (default if no point specified)
  -v, --verbose         Verbose output
  -h, --help            Show this help message

Weight Presets:
  uniform               All edge weights = 1
  bernoulli             Random IID: v1 with prob p, else v2
                        Params: --v1, --v2, --prob
  iid-uniform           Random IID: Uniform[a,b] for each edge
                        Params: --a, --b
  iid-exponential       Random IID: Exp(1) for each edge
  iid-pareto            Random IID: Pareto(alpha, xmin) for each edge
                        Params: --pareto-alpha, --pareto-xmin
  iid-geometric         Random IID: Geometric(p) for each edge, X >= 1
                        Params: --geom-p
  gaussian              Log-normal: exp(beta * X), X ~ N(0,1)
                        Params: --beta
  gamma                 Gamma(alpha) on alpha-edges, Gamma(beta) on beta-edges
                        Params: --alpha (default 0.2), --beta (default 0.25)
  2x2periodic           Checkerboard 4x4 block pattern
                        Params: --a, --b

  diagonal-layered      Bernoulli by diagonal (faceX - faceY direction)
                        Params: --v1, --v2, --p1, --p2
  straight-layered      Bernoulli by row (faceY direction)
                        Params: --v1, --v2, --p1, --p2
  diagonal-periodic     Deterministic periodic w1/w2 by diagonal
                        Params: --w1, --w2
  straight-periodic     Deterministic periodic w1/w2 by row
                        Params: --w1, --w2
  diagonal-uniform      Uniform[a,b] random by diagonal
                        Params: --a, --b
  straight-uniform      Uniform[a,b] random by row
                        Params: --a, --b

  diagonal-critical     Critical scaling: v1+2/sqrt(N) or v2-1/sqrt(N), Bernoulli by diagonal
                        Params: --v1 (default 1), --v2 (default 1), --p1, --p2
  straight-critical     Critical scaling: v1+2/sqrt(N) or v2-1/sqrt(N), Bernoulli by row
                        Params: --v1 (default 1), --v2 (default 1), --p1, --p2
  diagonal-critical-periodic  Critical scaling, deterministic alternating by diagonal
                        Params: --v1 (default 1), --v2 (default 1)
  straight-critical-periodic  Critical scaling, deterministic alternating by row
                        Params: --v1 (default 1), --v2 (default 1)

Parameter Defaults:
  --alpha 0.2           Gamma shape parameter for alpha-edges
  --beta 0.25           Gamma shape parameter for beta-edges / Gaussian scale
  --v1 2.0, --v2 0.5    Bernoulli/layered weight values
  --prob 0.5            Bernoulli probability
  --p1 0.5, --p2 0.5    Layered probabilities (even/odd layers)
  --w1 2.0, --w2 0.5    Periodic weight values
  --a 0.5, --b 2.0      IID uniform / 2x2periodic range
  --pareto-alpha 2.0    Pareto shape parameter
  --pareto-xmin 1.0     Pareto scale parameter
  --geom-p 0.5          Geometric probability

Examples:
  # Single domino tiling (colored dominoes)
  ./double_dimer 50 --mode tiling -o tiling.png
  ./double_dimer 100 --mode tiling --preset gamma --alpha 2.0 -o tiling_gamma.png

  # Basic double dimer
  ./double_dimer 200 -o output.png
  ./double_dimer -n 300 --preset gamma -o gamma.png
  ./double_dimer 300 --preset gamma --alpha 0.2 --beta 0.25 -o biased.png

  # Layered weights
  ./double_dimer 200 --preset diagonal-layered --v1 2 --v2 0.5 -o diag.png
  ./double_dimer 200 --preset straight-periodic --w1 2.0 --w2 0.5 -o straight.png

  # Fluctuation mode (h - E[h])
  ./double_dimer 200 --mode fluctuation --samples 20 -o fluct.png
  ./double_dimer 300 --mode fluctuation --samples 50 --preset gamma -o fluct_gamma.png

  # Annealed modes (resample weights for each tiling)
  ./double_dimer 200 --mode annealed-double-dimer --preset gamma -o annealed.png
  ./double_dimer 200 --mode annealed-fluctuation --samples 20 --preset gamma -o annealed_fluct.png

  # Stats mode - loop count histogram at origin (parallelized)
  ./double_dimer 100 --mode stats --preset gamma --runs 100 -o marked.png
  ./double_dimer 200 --mode stats --preset uniform --runs 200 -o marked.png

  # Stats mode - custom point, no picture output
  ./double_dimer 100 --mode stats --preset gamma --runs 500 --point-x 10 --point-y 5 --no-output

  # Annealed stats
  ./double_dimer 100 --mode annealed-stats --preset gamma --runs 100 -o annealed_marked.png

)";
}

Args parseArgs(int argc, char* argv[]) {
    Args args;
    for (int i = 1; i < argc; i++) {
        string arg = argv[i];
        if (arg == "-h" || arg == "--help") {
            args.help = true;
        } else if (arg == "-v" || arg == "--verbose") {
            args.verbose = true;
        } else if ((arg == "-n" || arg == "--size") && i + 1 < argc) {
            args.n = stoi(argv[++i]);
        } else if (arg[0] != '-' && arg[0] >= '0' && arg[0] <= '9') {
            args.n = stoi(arg);
        } else if ((arg == "-m" || arg == "--mode") && i + 1 < argc) {
            args.mode = argv[++i];
        } else if (arg == "--samples" && i + 1 < argc) {
            args.samples = stoi(argv[++i]);
        } else if ((arg == "-t" || arg == "--threads") && i + 1 < argc) {
            args.threads = stoi(argv[++i]);
        } else if (arg == "--scale" && i + 1 < argc) {
            args.scale = stoi(argv[++i]);
        } else if (arg == "--border" && i + 1 < argc) {
            args.border = stoi(argv[++i]);
        } else if ((arg == "-p" || arg == "--preset") && i + 1 < argc) {
            args.preset = argv[++i];
        } else if ((arg == "-o" || arg == "--output") && i + 1 < argc) {
            args.output = argv[++i];
        } else if (arg == "--alpha" && i + 1 < argc) {
            args.alpha = stod(argv[++i]);
        } else if (arg == "--beta" && i + 1 < argc) {
            args.beta = stod(argv[++i]);
        } else if (arg == "--v1" && i + 1 < argc) {
            args.v1 = stod(argv[++i]);
        } else if (arg == "--v2" && i + 1 < argc) {
            args.v2 = stod(argv[++i]);
        } else if (arg == "--prob" && i + 1 < argc) {
            args.prob = stod(argv[++i]);
        } else if (arg == "--p1" && i + 1 < argc) {
            args.p1 = stod(argv[++i]);
        } else if (arg == "--p2" && i + 1 < argc) {
            args.p2 = stod(argv[++i]);
        } else if (arg == "--w1" && i + 1 < argc) {
            args.w1 = stod(argv[++i]);
        } else if (arg == "--w2" && i + 1 < argc) {
            args.w2 = stod(argv[++i]);
        } else if (arg == "--a" && i + 1 < argc) {
            args.a = stod(argv[++i]);
        } else if (arg == "--b" && i + 1 < argc) {
            args.b = stod(argv[++i]);
        } else if (arg == "--pareto-alpha" && i + 1 < argc) {
            args.pareto_alpha = stod(argv[++i]);
        } else if (arg == "--pareto-xmin" && i + 1 < argc) {
            args.pareto_xmin = stod(argv[++i]);
        } else if (arg == "--geom-p" && i + 1 < argc) {
            args.geom_p = stod(argv[++i]);
        } else if (arg == "--seed" && i + 1 < argc) {
            args.seed = stoi(argv[++i]);
        } else if (arg == "--colormap" && i + 1 < argc) {
            args.colormap = argv[++i];
        } else if (arg == "--no-output") {
            args.noOutput = true;
        } else if (arg == "--runs" && i + 1 < argc) {
            args.runs = stoi(argv[++i]);
        } else if (arg == "--point-x" && i + 1 < argc) {
            args.pointX = stoi(argv[++i]);
            args.useCenter = false;  // User specified explicit point
        } else if (arg == "--point-y" && i + 1 < argc) {
            args.pointY = stoi(argv[++i]);
            args.useCenter = false;  // User specified explicit point
        } else if (arg == "--center") {
            args.useCenter = true;   // Explicitly request auto-center
        } else if (arg == "--mark-sample") {
            args.markSample = true;
        } else if (arg == "--debug-loops") {
            args.debugLoops = true;
        }
    }

    // Set default v1=1, v2=1 for critical scaling presets (if not overridden)
    if (args.preset.find("critical") != string::npos) {
        if (args.v1 == 2.0) args.v1 = 1.0;
        if (args.v2 == 0.5) args.v2 = 1.0;
    }

    return args;
}

// ============================================================================
// Weight Generation Helper (for annealed modes that resample weights)
// ============================================================================

MatrixDouble generateWeightsFromPreset(const Args& args, int dim) {
    if (args.preset == "uniform") {
        return generateUniformWeights(dim);
    } else if (args.preset == "bernoulli") {
        return generateBernoulliWeights(dim, args.v1, args.v2, args.prob);
    } else if (args.preset == "iid-uniform") {
        return generateIIDUniformWeights(dim, args.a, args.b);
    } else if (args.preset == "iid-exponential") {
        return generateIIDExponentialWeights(dim);
    } else if (args.preset == "iid-pareto") {
        return generateIIDParetoWeights(dim, args.pareto_alpha, args.pareto_xmin);
    } else if (args.preset == "iid-geometric") {
        return generateIIDGeometricWeights(dim, args.geom_p);
    } else if (args.preset == "gaussian") {
        return generateGaussianWeights(dim, args.beta);
    } else if (args.preset == "gamma") {
        return generateBiasedGammaWeights(dim, args.alpha, args.beta);
    } else if (args.preset == "2x2periodic") {
        return generate2x2PeriodicWeights(dim, args.a, args.b);
    } else if (args.preset == "diagonal-layered") {
        return generateDiagonalLayeredWeights(dim, args.v1, args.v2, args.p1, args.p2);
    } else if (args.preset == "straight-layered") {
        return generateStraightLayeredWeights(dim, args.v1, args.v2, args.p1, args.p2);
    } else if (args.preset == "diagonal-periodic") {
        return generateDiagonalPeriodicWeights(dim, args.w1, args.w2);
    } else if (args.preset == "straight-periodic") {
        return generateStraightPeriodicWeights(dim, args.w1, args.w2);
    } else if (args.preset == "diagonal-uniform") {
        return generateDiagonalUniformWeights(dim, args.a, args.b);
    } else if (args.preset == "straight-uniform") {
        return generateStraightUniformWeights(dim, args.a, args.b);
    } else if (args.preset == "diagonal-critical") {
        return generateCriticalScalingWeights(dim, args.v1, args.v2, args.p1, args.p2);
    } else if (args.preset == "straight-critical") {
        return generateStraightCriticalScalingWeights(dim, args.v1, args.v2, args.p1, args.p2);
    } else if (args.preset == "diagonal-critical-periodic") {
        return generateDiagonalCriticalPeriodicWeights(dim, args.v1, args.v2);
    } else if (args.preset == "straight-critical-periodic") {
        return generateStraightCriticalPeriodicWeights(dim, args.v1, args.v2);
    }
    return generateUniformWeights(dim);  // fallback
}

// ============================================================================
// Main
// ============================================================================

int main(int argc, char* argv[]) {
    Args args = parseArgs(argc, argv);

    if (args.help) {
        printHelp();
        return 0;
    }

    if (args.seed >= 0) {
        rng.seed(args.seed);
    } else {
        rng.seed(random_device{}());
    }

    auto startTime = chrono::high_resolution_clock::now();

    if (args.verbose) {
        cerr << "Double Dimer CLI" << endl;
        cerr << "  N = " << args.n << endl;
        cerr << "  Mode = " << args.mode << endl;
        cerr << "  Preset = " << args.preset << endl;
        cerr << "  Output = " << args.output << endl;
    }

    if (args.mode != "tiling" && args.mode != "double-dimer" && args.mode != "fluctuation" &&
        args.mode != "annealed-double-dimer" && args.mode != "annealed-fluctuation" &&
        args.mode != "stats" && args.mode != "annealed-stats") {
        cerr << "Unknown mode: " << args.mode << endl;
        return 1;
    }

    bool isAnnealed = (args.mode == "annealed-double-dimer" || args.mode == "annealed-fluctuation");

    int dim = 2 * args.n;
    MatrixDouble weights;

    if (args.preset == "uniform") {
        weights = generateUniformWeights(dim);
    } else if (args.preset == "bernoulli") {
        weights = generateBernoulliWeights(dim, args.v1, args.v2, args.prob);
    } else if (args.preset == "iid-uniform") {
        weights = generateIIDUniformWeights(dim, args.a, args.b);
        if (args.verbose) cerr << "  IID Uniform: a=" << args.a << ", b=" << args.b << endl;
    } else if (args.preset == "iid-exponential") {
        weights = generateIIDExponentialWeights(dim);
        if (args.verbose) cerr << "  IID Exponential(1)" << endl;
    } else if (args.preset == "iid-pareto") {
        weights = generateIIDParetoWeights(dim, args.pareto_alpha, args.pareto_xmin);
        if (args.verbose) cerr << "  IID Pareto: alpha=" << args.pareto_alpha << ", xmin=" << args.pareto_xmin << endl;
    } else if (args.preset == "iid-geometric") {
        weights = generateIIDGeometricWeights(dim, args.geom_p);
        if (args.verbose) cerr << "  IID Geometric: p=" << args.geom_p << endl;
    } else if (args.preset == "gaussian") {
        weights = generateGaussianWeights(dim, args.beta);
    } else if (args.preset == "gamma") {
        weights = generateBiasedGammaWeights(dim, args.alpha, args.beta);
        if (args.verbose) cerr << "  Gamma: alpha=" << args.alpha << ", beta=" << args.beta << endl;
    } else if (args.preset == "2x2periodic") {
        weights = generate2x2PeriodicWeights(dim, args.a, args.b);
    } else if (args.preset == "diagonal-layered") {
        weights = generateDiagonalLayeredWeights(dim, args.v1, args.v2, args.p1, args.p2);
    } else if (args.preset == "straight-layered") {
        weights = generateStraightLayeredWeights(dim, args.v1, args.v2, args.p1, args.p2);
    } else if (args.preset == "diagonal-periodic") {
        weights = generateDiagonalPeriodicWeights(dim, args.w1, args.w2);
    } else if (args.preset == "straight-periodic") {
        weights = generateStraightPeriodicWeights(dim, args.w1, args.w2);
    } else if (args.preset == "diagonal-uniform") {
        weights = generateDiagonalUniformWeights(dim, args.a, args.b);
    } else if (args.preset == "straight-uniform") {
        weights = generateStraightUniformWeights(dim, args.a, args.b);
    } else if (args.preset == "diagonal-critical") {
        weights = generateCriticalScalingWeights(dim, args.v1, args.v2, args.p1, args.p2);
        if (args.verbose) {
            double sqrtN = sqrt((double)args.n);
            cerr << "  Critical scaling (diagonal): w1=" << args.v1 + 2.0/sqrtN
                 << ", w2=" << args.v2 - 1.0/sqrtN << ", p1=" << args.p1 << ", p2=" << args.p2 << endl;
        }
    } else if (args.preset == "straight-critical") {
        weights = generateStraightCriticalScalingWeights(dim, args.v1, args.v2, args.p1, args.p2);
        if (args.verbose) {
            double sqrtN = sqrt((double)args.n);
            cerr << "  Critical scaling (straight): w1=" << args.v1 + 2.0/sqrtN
                 << ", w2=" << args.v2 - 1.0/sqrtN << ", p1=" << args.p1 << ", p2=" << args.p2 << endl;
        }
    } else if (args.preset == "diagonal-critical-periodic") {
        weights = generateDiagonalCriticalPeriodicWeights(dim, args.v1, args.v2);
        if (args.verbose) {
            double sqrtN = sqrt((double)args.n);
            cerr << "  Critical scaling periodic (diagonal): w1=" << args.v1 + 2.0/sqrtN
                 << ", w2=" << args.v2 - 1.0/sqrtN << endl;
        }
    } else if (args.preset == "straight-critical-periodic") {
        weights = generateStraightCriticalPeriodicWeights(dim, args.v1, args.v2);
        if (args.verbose) {
            double sqrtN = sqrt((double)args.n);
            cerr << "  Critical scaling periodic (straight): w1=" << args.v1 + 2.0/sqrtN
                 << ", w2=" << args.v2 - 1.0/sqrtN << endl;
        }
    } else {
        cerr << "Unknown preset: " << args.preset << endl;
        return 1;
    }

    vector<RGB> colormap = getColormap(args.colormap);

    // For non-annealed modes, compute probs once
    vector<MatrixDouble> probs;
    if (!isAnnealed) {
        if (args.verbose) {
            cerr << "Computing probabilities..." << endl;
        }
        probs = probsslim(weights);
    }

    if (args.mode == "tiling") {
        // Single domino tiling with colored dominoes
        if (args.verbose) cerr << "Sampling tiling..." << endl;
        MatrixInt config = aztecgen(probs);

        if (args.verbose) cerr << "Extracting dominoes..." << endl;
        vector<Domino> dominoes = extractDominoes(config, args.n);

        if (args.verbose) {
            cerr << "  " << dominoes.size() << " dominoes" << endl;
        }

        if (!args.noOutput) {
            if (args.verbose) cerr << "Generating PNG..." << endl;
            saveDominoPNG(args.output, dominoes, args.n, args.scale, args.border, args.verbose);
        }

    } else if (args.mode == "double-dimer") {
        // QUENCHED: Same weights for both tilings
        if (args.verbose) cerr << "Sampling first tiling..." << endl;
        MatrixInt config1 = aztecgen(probs);

        if (args.verbose) cerr << "Sampling second tiling..." << endl;
        MatrixInt config2 = aztecgen(probs);

        if (args.verbose) cerr << "Extracting dominoes..." << endl;
        vector<Domino> dominoes1 = extractDominoes(config1, args.n);
        vector<Domino> dominoes2 = extractDominoes(config2, args.n);

        if (args.verbose) {
            cerr << "Computing height functions..." << endl;
            cerr << "  Config 1: " << dominoes1.size() << " dominoes" << endl;
            cerr << "  Config 2: " << dominoes2.size() << " dominoes" << endl;
        }

        auto heights1 = computeHeightFunction(dominoes1);
        auto heights2 = computeHeightFunction(dominoes2);

        if (args.verbose) {
            cerr << "  Heights 1: " << heights1.size() << " vertices" << endl;
            cerr << "  Heights 2: " << heights2.size() << " vertices" << endl;
        }

        if (!args.noOutput) {
            if (args.verbose) cerr << "Generating PNG..." << endl;
            savePNG(args.output, heights1, heights2, colormap, args.n, args.scale, args.verbose);
        }

    } else if (args.mode == "annealed-double-dimer") {
        // ANNEALED: Resample weights independently for each tiling
        if (args.verbose) cerr << "Generating weights for first tiling..." << endl;
        MatrixDouble weights1 = generateWeightsFromPreset(args, dim);
        vector<MatrixDouble> probs1 = probsslim(weights1);
        if (args.verbose) cerr << "Sampling first tiling..." << endl;
        MatrixInt config1 = aztecgen(probs1);

        if (args.verbose) cerr << "Generating weights for second tiling..." << endl;
        MatrixDouble weights2 = generateWeightsFromPreset(args, dim);
        vector<MatrixDouble> probs2 = probsslim(weights2);
        if (args.verbose) cerr << "Sampling second tiling..." << endl;
        MatrixInt config2 = aztecgen(probs2);

        if (args.verbose) cerr << "Extracting dominoes..." << endl;
        vector<Domino> dominoes1 = extractDominoes(config1, args.n);
        vector<Domino> dominoes2 = extractDominoes(config2, args.n);

        if (args.verbose) {
            cerr << "Computing height functions..." << endl;
            cerr << "  Config 1: " << dominoes1.size() << " dominoes" << endl;
            cerr << "  Config 2: " << dominoes2.size() << " dominoes" << endl;
        }

        auto heights1 = computeHeightFunction(dominoes1);
        auto heights2 = computeHeightFunction(dominoes2);

        if (args.verbose) {
            cerr << "  Heights 1: " << heights1.size() << " vertices" << endl;
            cerr << "  Heights 2: " << heights2.size() << " vertices" << endl;
        }

        if (!args.noOutput) {
            if (args.verbose) cerr << "Generating PNG..." << endl;
            savePNG(args.output, heights1, heights2, colormap, args.n, args.scale, args.verbose);
        }

    } else if (args.mode == "annealed-fluctuation") {
        // ANNEALED FLUCTUATION: Resample weights for each sample
        int numSamples = args.samples;

        if (args.verbose) {
            cerr << "Annealed fluctuation mode: sampling " << numSamples
                 << " tilings (resampling weights each time)..." << endl;
        }

        vector<unordered_map<int64_t, int>> allHeights(numSamples);

        // Note: Annealed mode is sequential because each sample needs fresh weights
        for (int s = 0; s < numSamples; s++) {
            if (args.verbose && ((s + 1) % 5 == 0 || s == 0)) {
                cerr << "  Sample " << (s + 1) << "/" << numSamples << " (generating weights + sampling)..." << endl;
            }

            // Resample weights for this sample
            MatrixDouble sampleWeights = generateWeightsFromPreset(args, dim);
            vector<MatrixDouble> sampleProbs = probsslim(sampleWeights);

            MatrixInt config = aztecgen(sampleProbs);
            vector<Domino> dominoes = extractDominoes(config, args.n);
            allHeights[s] = computeHeightFunction(dominoes);
        }

        unordered_map<int64_t, double> heightSum;
        unordered_map<int64_t, int> heightCount;

        for (int s = 0; s < numSamples; s++) {
            for (const auto& [key, h] : allHeights[s]) {
                heightSum[key] += h;
                heightCount[key]++;
            }
        }

        const auto& lastHeight = allHeights[numSamples - 1];

        unordered_map<int64_t, double> fluctuation;
        for (const auto& [key, h] : lastHeight) {
            double mean = heightSum[key] / heightCount[key];
            fluctuation[key] = h - mean;
        }

        if (!args.noOutput) {
            if (args.verbose) cerr << "Generating PNG..." << endl;
            saveFluctuationPNG(args.output, fluctuation, colormap, args.n, args.scale, args.verbose);
        }

    } else if (args.mode == "stats" || args.mode == "annealed-stats") {
        // Stats mode: run many double-dimers, collect histogram at a point
        bool isAnnealedStats = (args.mode == "annealed-stats");
        int numRuns = args.runs;

        // The point to measure (in graph coordinates)
        int ptX = args.pointX;
        int ptY = args.pointY;

        // Auto-detect center if requested (default behavior)
        if (args.useCenter) {
            // Generate one sample to find height function bounds
            MatrixInt sampleConfig = aztecgen(probs);
            vector<Domino> sampleDominoes = extractDominoes(sampleConfig, args.n);
            auto sampleHeights = computeHeightFunction(sampleDominoes);

            // Find coordinate bounds (height function uses 4x coords)
            int minX4 = INT_MAX, maxX4 = INT_MIN;
            int minY4 = INT_MAX, maxY4 = INT_MIN;
            for (const auto& [key, h] : sampleHeights) {
                auto [x4, y4] = decodeCoord(key);
                minX4 = min(minX4, x4);
                maxX4 = max(maxX4, x4);
                minY4 = min(minY4, y4);
                maxY4 = max(maxY4, y4);
            }

            // Center in graph coordinates (divide 4x coords by 4)
            ptX = (minX4 + maxX4) / 8;  // Average then divide by 4
            ptY = (minY4 + maxY4) / 8;

            cerr << "Auto-detected center: (" << ptX << ", " << ptY << ")" << endl;
            cerr << "  Height function range in graph coords: x=[" << minX4/4 << ", " << maxX4/4
                 << "], y=[" << minY4/4 << ", " << maxY4/4 << "]" << endl;
        }

        // Height function key: coordinates are multiplied by 4
        int64_t targetKey = encodeCoord(ptX * 4, ptY * 4);

        vector<int> heightDiffs(numRuns);
        vector<int> loopCounts(numRuns);
        vector<bool> validRun(numRuns, false);

        // For marked sample output (from run 0)
        unordered_map<int64_t, int> firstHeights1, firstHeights2;
        vector<Domino> firstDominoes1, firstDominoes2;

        // Debug run: generate one sample and output detailed loop info
        if (args.debugLoops) {
            cerr << "\n=== DEBUG: Running one sample with loop tracing ===" << endl;
            MatrixInt dbgConfig1 = aztecgen(probs);
            MatrixInt dbgConfig2 = aztecgen(probs);
            vector<Domino> dbgDominoes1 = extractDominoes(dbgConfig1, args.n);
            vector<Domino> dbgDominoes2 = extractDominoes(dbgConfig2, args.n);
            auto dbgHeights1 = computeHeightFunction(dbgDominoes1);
            auto dbgHeights2 = computeHeightFunction(dbgDominoes2);

            auto it1 = dbgHeights1.find(targetKey);
            auto it2 = dbgHeights2.find(targetKey);
            if (it1 != dbgHeights1.end() && it2 != dbgHeights2.end()) {
                int hDiff = it1->second - it2->second;
                cerr << "DEBUG: Height difference at target: " << hDiff << endl;
            } else {
                cerr << "DEBUG: Target point not found in height function!" << endl;
            }

            int dbgLoops = countLoopsSurroundingPoint(dbgDominoes1, dbgDominoes2, ptX, ptY, true);
            cerr << "DEBUG: Loop count result: " << dbgLoops << endl;
            cerr << "=== END DEBUG ===" << endl << endl;
        }

#ifdef _OPENMP
        omp_set_num_threads(args.threads);
        int numThreads = omp_get_max_threads();
        cerr << "Stats mode (" << (isAnnealedStats ? "annealed" : "quenched") << "): "
             << numRuns << " runs at point (" << ptX << ", " << ptY << ") with "
             << numThreads << " threads" << endl;

        int completedRuns = 0;
        mutex progressMutex;

        #pragma omp parallel
        {
            int tid = omp_get_thread_num();
            rng.seed(args.seed >= 0 ? args.seed + tid * 1000 : random_device{}() + tid);

            #pragma omp for schedule(dynamic)
            for (int r = 0; r < numRuns; r++) {
                vector<MatrixDouble> runProbs;
                if (isAnnealedStats) {
                    MatrixDouble w1 = generateWeightsFromPreset(args, dim);
                    runProbs = probsslim(w1);
                } else {
                    runProbs = probs;
                }

                MatrixInt config1 = aztecgen(runProbs);

                if (isAnnealedStats) {
                    MatrixDouble w2 = generateWeightsFromPreset(args, dim);
                    runProbs = probsslim(w2);
                }

                MatrixInt config2 = aztecgen(runProbs);

                vector<Domino> dominoes1 = extractDominoes(config1, args.n);
                vector<Domino> dominoes2 = extractDominoes(config2, args.n);

                auto heights1 = computeHeightFunction(dominoes1);
                auto heights2 = computeHeightFunction(dominoes2);

                // Save first sample for marked PNG (thread-safe, only run 0)
                if (r == 0) {
                    #pragma omp critical
                    {
                        firstHeights1 = heights1;
                        firstHeights2 = heights2;
                        firstDominoes1 = dominoes1;
                        firstDominoes2 = dominoes2;
                    }
                }

                auto it1 = heights1.find(targetKey);
                auto it2 = heights2.find(targetKey);
                if (it1 != heights1.end() && it2 != heights2.end()) {
                    heightDiffs[r] = it1->second - it2->second;
                    loopCounts[r] = countLoopsSurroundingPoint(dominoes1, dominoes2, ptX, ptY);
                    validRun[r] = true;
                }

                if (args.verbose) {
                    lock_guard<mutex> lock(progressMutex);
                    completedRuns++;
                    if (completedRuns % 10 == 0 || completedRuns == numRuns) {
                        cerr << "  Completed " << completedRuns << "/" << numRuns << " runs" << endl;
                    }
                }
            }
        }
#else
        cerr << "Stats mode (" << (isAnnealedStats ? "annealed" : "quenched") << "): "
             << numRuns << " runs at point (" << ptX << ", " << ptY << ") (single-threaded)" << endl;

        for (int r = 0; r < numRuns; r++) {
            if (args.verbose && ((r + 1) % 10 == 0 || r == 0)) {
                cerr << "  Run " << (r + 1) << "/" << numRuns << endl;
            }

            vector<MatrixDouble> runProbs;
            if (isAnnealedStats) {
                MatrixDouble w1 = generateWeightsFromPreset(args, dim);
                runProbs = probsslim(w1);
            } else {
                runProbs = probs;
            }

            MatrixInt config1 = aztecgen(runProbs);

            if (isAnnealedStats) {
                MatrixDouble w2 = generateWeightsFromPreset(args, dim);
                runProbs = probsslim(w2);
            }

            MatrixInt config2 = aztecgen(runProbs);

            vector<Domino> dominoes1 = extractDominoes(config1, args.n);
            vector<Domino> dominoes2 = extractDominoes(config2, args.n);

            auto heights1 = computeHeightFunction(dominoes1);
            auto heights2 = computeHeightFunction(dominoes2);

            if (r == 0) {
                firstHeights1 = heights1;
                firstHeights2 = heights2;
                firstDominoes1 = dominoes1;
                firstDominoes2 = dominoes2;
            }

            auto it1 = heights1.find(targetKey);
            auto it2 = heights2.find(targetKey);
            if (it1 != heights1.end() && it2 != heights2.end()) {
                heightDiffs[r] = it1->second - it2->second;
                loopCounts[r] = countLoopsSurroundingPoint(dominoes1, dominoes2, ptX, ptY);
                validRun[r] = true;
            }
        }
#endif

        // Collect valid results
        vector<int> validHeightDiffs;
        vector<int> validLoopCounts;
        validHeightDiffs.reserve(numRuns);
        validLoopCounts.reserve(numRuns);
        for (int r = 0; r < numRuns; r++) {
            if (validRun[r]) {
                validHeightDiffs.push_back(heightDiffs[r]);
                validLoopCounts.push_back(loopCounts[r]);
            }
        }

        // Always output marked sample PNG for stats mode (unless --no-output)
        if (!args.noOutput && !firstHeights1.empty()) {
            savePNGWithMarker(args.output, firstHeights1, firstHeights2, colormap,
                             args.n, args.scale, args.verbose, ptX, ptY);
        }

        // Compute and output statistics
        if (validHeightDiffs.empty()) {
            cerr << "Error: Point (" << ptX << ", " << ptY << ") not found in any sample" << endl;
        } else {
            // Output raw values
            cerr << "\n=== Height Difference Values (h1 - h2) at (" << ptX << ", " << ptY << ") ===" << endl;
            cerr << "Raw values: ";
            for (size_t i = 0; i < validHeightDiffs.size(); i++) {
                cerr << validHeightDiffs[i];
                if (i < validHeightDiffs.size() - 1) cerr << ", ";
            }
            cerr << endl;

            // Build histogram of height differences
            map<int, int> histogram;
            double sum = 0, sum2 = 0;
            for (int h : validHeightDiffs) {
                histogram[h]++;
                sum += h;
                sum2 += h * h;
            }
            double mean = sum / validHeightDiffs.size();
            double variance = sum2 / validHeightDiffs.size() - mean * mean;

            cerr << "\n=== Histogram of h1 - h2 ===" << endl;
            for (const auto& [val, count] : histogram) {
                cerr << "  " << val << ": " << count << " ("
                     << (100.0 * count / validHeightDiffs.size()) << "%)" << endl;
            }

            // Topological loop count histogram (actual XOR loops surrounding the point)
            cerr << "\n=== Topological Loop Count (# XOR loops surrounding point) ===" << endl;
            cerr << "Raw loop counts: ";
            for (size_t i = 0; i < validLoopCounts.size(); i++) {
                cerr << validLoopCounts[i];
                if (i < validLoopCounts.size() - 1) cerr << ", ";
            }
            cerr << endl;

            map<int, int> loopHist;
            double loopSum = 0, loopSum2 = 0;
            for (int lc : validLoopCounts) {
                loopHist[lc]++;
                loopSum += lc;
                loopSum2 += lc * lc;
            }
            double loopMean = loopSum / validLoopCounts.size();
            double loopVar = loopSum2 / validLoopCounts.size() - loopMean * loopMean;

            cerr << "\n=== Loop Count Histogram ===" << endl;
            for (const auto& [loops, count] : loopHist) {
                cerr << "  " << loops << " loops: " << count << " ("
                     << (100.0 * count / validLoopCounts.size()) << "%)" << endl;
            }

            cerr << "\n=== Statistics ===" << endl;
            cerr << "  N = " << validHeightDiffs.size() << endl;
            cerr << "  Mean(h1-h2) = " << mean << endl;
            cerr << "  Var(h1-h2) = " << variance << endl;
            cerr << "  StdDev(h1-h2) = " << sqrt(variance) << endl;
            cerr << "  Mean(loop count) = " << loopMean << endl;
            cerr << "  Var(loop count) = " << loopVar << endl;
            cerr << "  StdDev(loop count) = " << sqrt(loopVar) << endl;
        }

    } else {
        // QUENCHED FLUCTUATION: Same weights for all samples
        int numSamples = args.samples;

#ifdef _OPENMP
        omp_set_num_threads(args.threads);
        int numThreads = omp_get_max_threads();
        if (args.verbose) {
            cerr << "Fluctuation mode: sampling " << numSamples << " tilings with "
                 << numThreads << " threads..." << endl;
        }
#else
        if (args.verbose) {
            cerr << "Fluctuation mode: sampling " << numSamples << " tilings (single-threaded)..." << endl;
        }
#endif

        vector<unordered_map<int64_t, int>> allHeights(numSamples);
        int completedSamples = 0;
        mutex progressMutex;

#ifdef _OPENMP
        #pragma omp parallel
        {
            int tid = omp_get_thread_num();
            rng.seed(args.seed >= 0 ? args.seed + tid * 1000 : random_device{}() + tid);

            #pragma omp for schedule(dynamic)
            for (int s = 0; s < numSamples; s++) {
                MatrixInt config = aztecgen(probs);
                vector<Domino> dominoes = extractDominoes(config, args.n);
                allHeights[s] = computeHeightFunction(dominoes);

                if (args.verbose) {
                    lock_guard<mutex> lock(progressMutex);
                    completedSamples++;
                    if (completedSamples % 5 == 0 || completedSamples == numSamples) {
                        cerr << "  Completed " << completedSamples << "/" << numSamples << " samples" << endl;
                    }
                }
            }
        }
#else
        for (int s = 0; s < numSamples; s++) {
            if (args.verbose && (s + 1) % 5 == 0) {
                cerr << "  Sample " << (s + 1) << "/" << numSamples << endl;
            }
            MatrixInt config = aztecgen(probs);
            vector<Domino> dominoes = extractDominoes(config, args.n);
            allHeights[s] = computeHeightFunction(dominoes);
        }
#endif

        unordered_map<int64_t, double> heightSum;
        unordered_map<int64_t, int> heightCount;

        for (int s = 0; s < numSamples; s++) {
            for (const auto& [key, h] : allHeights[s]) {
                heightSum[key] += h;
                heightCount[key]++;
            }
        }

        const auto& lastHeight = allHeights[numSamples - 1];

        unordered_map<int64_t, double> fluctuation;
        for (const auto& [key, h] : lastHeight) {
            double mean = heightSum[key] / heightCount[key];
            fluctuation[key] = h - mean;
        }

        if (!args.noOutput) {
            if (args.verbose) cerr << "Generating PNG..." << endl;
            saveFluctuationPNG(args.output, fluctuation, colormap, args.n, args.scale, args.verbose);
        }
    }

    auto endTime = chrono::high_resolution_clock::now();
    auto duration = chrono::duration_cast<chrono::milliseconds>(endTime - startTime);

    if (args.verbose || args.noOutput) {
        cerr << "Total time: " << duration.count() << " ms" << endl;
    }

    return 0;
}
