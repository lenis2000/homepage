/*
Double Dimer CLI - Standalone C++ tool for sampling double dimers from Aztec diamonds

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
  /opt/homebrew/bin/g++-15 -std=c++17 -O3 -mcpu=native -ffast-math -funroll-loops -flto -fopenmp -o double_dimer double-dimer-cli.cpp

  # Or without OpenMP (single-threaded):
  g++ -std=c++17 -O3 -ffast-math -funroll-loops -o double_dimer double-dimer-cli.cpp

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
// CLI Argument Parsing
// ============================================================================

struct Args {
    int n = 50;
    string preset = "uniform";
    string output = "height_diff.png";
    string mode = "double-dimer";
    int samples = 20;
    int threads = 20;
    int scale = 0;
    double alpha = 2.0;
    double beta = 1.0;
    double v1 = 2.0;
    double v2 = 0.5;
    double prob = 0.5;
    double p1 = 0.5;
    double p2 = 0.5;
    double w1 = 2.0;
    double w2 = 0.5;
    double a = 0.5;
    double b = 2.0;
    int seed = -1;
    string colormap = "viridis";
    bool verbose = false;
    bool help = false;
};

void printHelp() {
    cerr << R"(
Double Dimer CLI - Sample double dimers from Aztec diamonds

Usage: ./double_dimer [N] [options]

Modes:
  double-dimer           Show height difference h1 - h2 between two tilings (default)
  fluctuation            Sample N tilings, show h - E[h] for last sample
  annealed-double-dimer  Resample weights for EACH tiling, then show h1 - h2
  annealed-fluctuation   Resample weights for EACH sample, show h - E[h]

Options:
  -n, --size <N>        Aztec diamond order (default: 50)
  -m, --mode <type>     Output mode (default: double-dimer)
  --samples <N>         Number of samples for fluctuation mode (default: 20)
  -t, --threads <N>     Number of OpenMP threads (default: 20)
  -p, --preset <type>   Weight preset (default: uniform)
  -o, --output <file>   Output PNG filename (default: height_diff.png)
  --scale <N>           Pixel scale (default: auto)
  --seed <val>          Random seed (default: random)
  --colormap <name>     viridis, plasma, coolwarm, grayscale (default: viridis)
  -v, --verbose         Verbose output
  -h, --help            Show this help message

Weight Presets:
  uniform               All edge weights = 1
  bernoulli             Random IID: v1 with prob p, else v2
                        Params: --v1, --v2, --prob
  gaussian              Log-normal: exp(beta * X), X ~ N(0,1)
                        Params: --beta
  gamma                 Gamma(alpha) on even rows, 1 on odd rows
                        Params: --alpha
  biased-gamma          Gamma(alpha) on alpha-edges, Gamma(beta) on beta-edges
                        Params: --alpha, --beta
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

Parameter Defaults:
  --alpha 2.0           Gamma shape parameter
  --beta 1.0            Gamma shape / Gaussian scale
  --v1 2.0, --v2 0.5    Bernoulli/layered weight values
  --prob 0.5            Bernoulli probability
  --p1 0.5, --p2 0.5    Layered probabilities (even/odd layers)
  --w1 2.0, --w2 0.5    Periodic weight values
  --a 0.5, --b 2.0      2x2periodic / uniform range

Examples:
  # Basic double dimer
  ./double_dimer 200 -o output.png
  ./double_dimer -n 300 --preset gamma --alpha 2.0 -o gamma.png

  # Biased gamma (Duits-Van Peski model)
  ./double_dimer 300 --preset biased-gamma --alpha 0.2 --beta 0.25 -o biased.png

  # Layered weights
  ./double_dimer 200 --preset diagonal-layered --v1 2 --v2 0.5 -o diag.png
  ./double_dimer 200 --preset straight-periodic --w1 2.0 --w2 0.5 -o straight.png

  # Fluctuation mode (h - E[h])
  ./double_dimer 200 --mode fluctuation --samples 20 -o fluct.png
  ./double_dimer 300 --mode fluctuation --samples 50 --preset gamma -o fluct_gamma.png

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
        } else if (arg == "--seed" && i + 1 < argc) {
            args.seed = stoi(argv[++i]);
        } else if (arg == "--colormap" && i + 1 < argc) {
            args.colormap = argv[++i];
        }
    }
    return args;
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

    if (args.mode != "double-dimer" && args.mode != "fluctuation") {
        cerr << "Unknown mode: " << args.mode << endl;
        return 1;
    }

    int dim = 2 * args.n;
    MatrixDouble weights;

    if (args.preset == "uniform") {
        weights = generateUniformWeights(dim);
    } else if (args.preset == "bernoulli") {
        weights = generateBernoulliWeights(dim, args.v1, args.v2, args.prob);
    } else if (args.preset == "gaussian") {
        weights = generateGaussianWeights(dim, args.beta);
    } else if (args.preset == "gamma") {
        weights = generateGammaWeights(dim, args.alpha);
        if (args.verbose) cerr << "  Gamma: alpha=" << args.alpha << endl;
    } else if (args.preset == "biased-gamma") {
        weights = generateBiasedGammaWeights(dim, args.alpha, args.beta);
        if (args.verbose) cerr << "  Biased Gamma: alpha=" << args.alpha << ", beta=" << args.beta << endl;
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
    } else {
        cerr << "Unknown preset: " << args.preset << endl;
        return 1;
    }

    vector<RGB> colormap = getColormap(args.colormap);

    if (args.verbose) {
        cerr << "Computing probabilities..." << endl;
    }

    vector<MatrixDouble> probs = probsslim(weights);

    if (args.mode == "double-dimer") {
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
            cerr << "Generating PNG..." << endl;
        }

        savePNG(args.output, heights1, heights2, colormap, args.n, args.scale, args.verbose);

    } else {
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

        if (args.verbose) {
            cerr << "Generating PNG..." << endl;
        }

        saveFluctuationPNG(args.output, fluctuation, colormap, args.n, args.scale, args.verbose);
    }

    auto endTime = chrono::high_resolution_clock::now();
    auto duration = chrono::duration_cast<chrono::milliseconds>(endTime - startTime);

    if (args.verbose) {
        cerr << "Total time: " << duration.count() << " ms" << endl;
    }

    return 0;
}
