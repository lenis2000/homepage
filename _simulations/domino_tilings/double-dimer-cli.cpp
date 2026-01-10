/*
Double Dimer CLI - Standalone C++ tool for sampling double dimers from Aztec diamonds

Compilation:
  # Download stb_image_write.h first (one time):
  curl -O https://raw.githubusercontent.com/nothings/stb/master/stb_image_write.h

  # Compile:
  g++ -std=c++17 -O3 -o double_dimer double-dimer-cli.cpp
  # or: clang++ -std=c++17 -O3 -o double_dimer double-dimer-cli.cpp

Usage:
  # Double dimer mode (h1 - h2):
  ./double_dimer -n 100 -o height_diff.png
  ./double_dimer -n 200 --preset gamma --alpha 2.0 -o gamma_sample.png

  # Fluctuation mode (h - E[h]):
  ./double_dimer -n 100 --mode fluctuation --samples 20 -o fluctuation.png
  ./double_dimer -n 200 --mode fluctuation --samples 50 --preset gamma --alpha 2.0 -o fluct_gamma.png

  ./double_dimer --help

Modes:
  double-dimer  - Show height difference h1 - h2 between two independent tilings (default)
  fluctuation   - Sample N tilings, compute E[h], show h - E[h] for one sample

Presets:
  uniform       - All edge weights = 1 (default)
  bernoulli     - Random IID weights: v1 with probability prob, else v2
  gaussian      - Log-normal: exp(beta * X), X ~ N(0,1)
  gamma         - Gamma(alpha) on even rows, 1 on odd rows
  biased-gamma  - Gamma(alpha) and Gamma(beta) on different edge types (Duits-Van Peski)
  2x2periodic   - Checkerboard pattern with weights a, b

Output:
  PNG image showing either:
  - (double-dimer) Height difference h1 - h2 between two tilings. Level curves (h1=h2)
    are the XOR loops of the double dimer configuration.
  - (fluctuation) Deviation h - E[h] from mean height. Approximates Gaussian Free Field.

Repository: https://github.com/lenis2000/homepage
*/

#include <iostream>
#include <fstream>
#include <vector>
#include <cmath>
#include <random>
#include <string>
#include <cstring>
#include <algorithm>
#include <chrono>
#include <unordered_map>
#include <queue>

// Check for stb_image_write.h
#if __has_include("stb_image_write.h")
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"
#else
#error "Please download stb_image_write.h from https://github.com/nothings/stb"
#endif

using namespace std;

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

    int& at(int i, int j) { return data[i * cols_ + j]; }
    const int& at(int i, int j) const { return data[i * cols_ + j]; }
    int size() const { return rows_; }
    int rows() const { return rows_; }
    int cols() const { return cols_; }
};

// ============================================================================
// Global RNG
// ============================================================================

static mt19937 rng;

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
    uniform_real_distribution<> dis(0.0, 1.0);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            weights.at(i, j) = (dis(rng) < prob) ? v1 : v2;
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

// Biased gamma (Duits-Van Peski model):
// Even rows, even cols -> Gamma(beta)
// Even rows, odd cols -> Gamma(alpha)
// Odd rows -> 1.0
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

// 2x2 periodic weights: 4x4 block pattern (matching web version)
MatrixDouble generate2x2PeriodicWeights(int dim, double a, double b) {
    MatrixDouble weights(dim, dim);
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            int im = i & 3;  // i % 4
            int jm = j & 3;  // j % 4
            if ((im < 2 && jm < 2) || (im >= 2 && jm >= 2))
                weights.at(i, j) = b;
            else
                weights.at(i, j) = a;
        }
    }
    return weights;
}

// =============================================================================
// Layered Weight Functions
// =============================================================================
// Web version coordinate mapping:
//   - Black face at (faceX, faceY) in graph coords
//   - EKLP indices: diagI = (faceX + faceY + N) / 2, diagJ = (faceX - faceY + N) / 2
//   - EKLP position for beta edge: (2*diagI, 2*diagJ)
//
// Web's diagonal layered: layer index = faceX - faceY = 2*diagJ - N
//   → In EKLP matrix, layer varies with column j (for even rows)
//
// Web's straight layered: layer index = faceY = diagI - diagJ
//   → In EKLP matrix, layer varies with (i - j) / 2 (for even rows)
// =============================================================================

// Diagonal layered (Regime 3 default): Bernoulli by diagonal (faceX - faceY)
// Layer index = EKLP column j (for even rows)
// Default: val1=2, val2=0.5, p1=0.5, p2=0.5
MatrixDouble generateDiagonalLayeredWeights(int dim, double val1, double val2, double p1, double p2) {
    MatrixDouble weights(dim, dim, 1.0);
    uniform_real_distribution<> dis(0.0, 1.0);

    // Pre-generate weight for each diagonal (indexed by j/2 for even j)
    int N = dim / 2;
    vector<double> diagWeight(N);
    for (int d = 0; d < N; d++) {
        double p = (d % 2 == 0) ? p1 : p2;
        diagWeight[d] = (dis(rng) < p) ? val1 : val2;
    }

    // Apply to beta edges only (even row, even col)
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int diagJ = j / 2;
            weights.at(i, j) = diagWeight[diagJ];
        }
    }
    return weights;
}

// Straight layered (Regime 3 default): Bernoulli by row (faceY)
// Layer index = (i - j) / 2 for EKLP position (i, j) with i, j even
// Default: val1=2, val2=0.5, p1=0.5, p2=0.5
MatrixDouble generateStraightLayeredWeights(int dim, double val1, double val2, double p1, double p2) {
    MatrixDouble weights(dim, dim, 1.0);
    uniform_real_distribution<> dis(0.0, 1.0);

    // Pre-generate weight for each horizontal layer
    // faceY ranges from -(N-1) to (N-1), so 2N-1 possible values
    int N = dim / 2;
    vector<double> rowWeight(2 * N);
    for (int r = 0; r < 2 * N; r++) {
        double p = (r % 2 == 0) ? p1 : p2;
        rowWeight[r] = (dis(rng) < p) ? val1 : val2;
    }

    // Apply to beta edges only (even row, even col)
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            // diagI = i/2, diagJ = j/2
            // faceY = diagI - diagJ = (i - j) / 2
            int faceY = (i - j) / 2;
            int layerIdx = faceY + N - 1;  // Shift to [0, 2N-2]
            if (layerIdx >= 0 && layerIdx < 2 * N) {
                weights.at(i, j) = rowWeight[layerIdx];
            }
        }
    }
    return weights;
}

// Diagonal layered Regime 4: Deterministic periodic w1/w2 alternating by diagonal
MatrixDouble generateDiagonalPeriodicWeights(int dim, double w1, double w2) {
    MatrixDouble weights(dim, dim, 1.0);

    // Apply to beta edges only (even row, even col)
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int diagJ = j / 2;
            // Web version uses: floor(diag/2) & 1 for alternating pattern
            weights.at(i, j) = ((diagJ / 2) % 2 == 0) ? w1 : w2;
        }
    }
    return weights;
}

// Straight layered Regime 4: Deterministic periodic w1/w2 alternating by row
MatrixDouble generateStraightPeriodicWeights(int dim, double w1, double w2) {
    MatrixDouble weights(dim, dim, 1.0);
    int N = dim / 2;

    // Apply to beta edges only (even row, even col)
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int faceY = (i - j) / 2;
            // Alternate by faceY
            weights.at(i, j) = ((faceY + N) % 2 == 0) ? w1 : w2;
        }
    }
    return weights;
}

// Diagonal layered Regime 5: Uniform[a,b] varying by diagonal
MatrixDouble generateDiagonalUniformWeights(int dim, double a, double b) {
    MatrixDouble weights(dim, dim, 1.0);
    uniform_real_distribution<> dis(0.0, 1.0);

    int N = dim / 2;
    // Pre-generate uniform weight for each diagonal
    vector<double> diagWeight(N);
    for (int d = 0; d < N; d++) {
        diagWeight[d] = a + (b - a) * dis(rng);
    }

    // Apply to beta edges only (even row, even col)
    for (int i = 0; i < dim; i += 2) {
        for (int j = 0; j < dim; j += 2) {
            int diagJ = j / 2;
            weights.at(i, j) = diagWeight[diagJ];
        }
    }
    return weights;
}

// Straight layered Regime 5: Uniform[a,b] varying by row
MatrixDouble generateStraightUniformWeights(int dim, double a, double b) {
    MatrixDouble weights(dim, dim, 1.0);
    uniform_real_distribution<> dis(0.0, 1.0);

    int N = dim / 2;
    // Pre-generate uniform weight for each row
    vector<double> rowWeight(2 * N);
    for (int r = 0; r < 2 * N; r++) {
        rowWeight[r] = a + (b - a) * dis(rng);
    }

    // Apply to beta edges only (even row, even col)
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
// Sampling Algorithm (adapted from existing implementations)
// ============================================================================

// d3pslim: computes the square move for all Aztec diamonds
// Returns pair of [weights matrix list, exponents matrix list]
pair<vector<MatrixDouble>, vector<MatrixDouble>> d3pslim(const MatrixDouble& x1) {
    int n = x1.size();
    int m = n / 2;

    vector<MatrixDouble> A1, A2;
    MatrixDouble B(n, n, 0.0);
    MatrixDouble C(n, n, 0.0);

    // Initialize first matrices
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

    A1.push_back(B);
    A2.push_back(C);

    // Main loop
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

        A1.push_back(B);
        A2.push_back(C);
    }

    return {A1, A2};
}

// probsslim: outputs the probabilities needed for creation steps
vector<MatrixDouble> probsslim(const MatrixDouble& x1) {
    auto [a1, a2] = d3pslim(x1);
    int n = a1.size();
    vector<MatrixDouble> A;

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
        A.push_back(C);
    }

    return A;
}

// delslide: deletion-slide procedure
MatrixInt delslide(const MatrixInt& x1) {
    int n = x1.size();
    MatrixInt a0(n + 2, n + 2, 0);
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
    return a0;
}

// create: decide domino orientation in each 2x2 block using probabilities
MatrixInt createStep(MatrixInt x0, const MatrixDouble& p) {
    int n = x0.size();
    int half = n / 2;
    uniform_real_distribution<> dis(0.0, 1.0);
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
                    if (dis(rng) < p.at(i, j)) {
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
    return x0;
}

// aztecgen: iterate deletion-slide and creation steps
MatrixInt aztecgen(const vector<MatrixDouble>& x0) {
    int n = (int)x0.size();
    uniform_real_distribution<> dis(0.0, 1.0);

    // Initialize with a 2x2 configuration
    MatrixInt a1(2, 2);
    if (dis(rng) < x0[0].at(0, 0)) {
        a1.at(0, 0) = 1; a1.at(0, 1) = 0;
        a1.at(1, 0) = 0; a1.at(1, 1) = 1;
    } else {
        a1.at(0, 0) = 0; a1.at(0, 1) = 1;
        a1.at(1, 0) = 1; a1.at(1, 1) = 0;
    }

    for (int i = 0; i < n - 1; i++) {
        a1 = delslide(a1);
        a1 = createStep(a1, x0[i + 1]);
    }
    return a1;
}

// ============================================================================
// Domino Extraction
// ============================================================================

struct Domino {
    int gx, gy;      // Grid coordinates (lower-left corner)
    int orient;      // 0 = horizontal (4x2), 1 = vertical (2x4)
    int sign;        // +1 or -1 based on color
    string color;
};

vector<Domino> extractDominoes(const MatrixInt& config, int N) {
    vector<Domino> dominoes;
    int size = config.size();

    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            if (config.at(i, j) == 1) {
                bool oddI = (i & 1), oddJ = (j & 1);
                Domino d;

                if (oddI && oddJ) {
                    // Blue: horizontal
                    d.orient = 0;
                    d.sign = 1;
                    d.color = "blue";
                    d.gx = j - i - 2;
                    d.gy = size + 1 - (i + j) - 1;
                } else if (oddI && !oddJ) {
                    // Yellow: vertical
                    d.orient = 1;
                    d.sign = -1;
                    d.color = "yellow";
                    d.gx = j - i - 1;
                    d.gy = size + 1 - (i + j) - 2;
                } else if (!oddI && !oddJ) {
                    // Green: horizontal
                    d.orient = 0;
                    d.sign = -1;
                    d.color = "green";
                    d.gx = j - i - 2;
                    d.gy = size + 1 - (i + j) - 1;
                } else {
                    // Red: vertical
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
// Height Function Computation
// ============================================================================

// Compute height function at vertices using BFS
// Returns a map from "gx,gy" -> height
unordered_map<string, int> computeHeightFunction(const vector<Domino>& dominoes) {
    // Build adjacency graph with height increments
    unordered_map<string, vector<pair<string, int>>> adj;

    auto addEdge = [&](const string& v1, const string& v2, int dh) {
        adj[v1].push_back({v2, dh});
        adj[v2].push_back({v1, -dh});
    };

    for (const auto& d : dominoes) {
        int x = d.gx * 2;  // Scale to unit grid
        int y = d.gy * 2;
        int s = d.sign;

        if (d.orient == 0) {
            // Horizontal domino (4x2 in original units, 8x4 in our grid)
            string TL = to_string(x) + "," + to_string(y + 4);
            string TM = to_string(x + 4) + "," + to_string(y + 4);
            string TR = to_string(x + 8) + "," + to_string(y + 4);
            string BL = to_string(x) + "," + to_string(y);
            string BM = to_string(x + 4) + "," + to_string(y);
            string BR = to_string(x + 8) + "," + to_string(y);

            addEdge(TL, TM, -s);
            addEdge(TM, TR, s);
            addEdge(BL, BM, s);
            addEdge(BM, BR, -s);
            addEdge(TL, BL, s);
            addEdge(TM, BM, 3*s);
            addEdge(TR, BR, s);
        } else {
            // Vertical domino (2x4 in original units, 4x8 in our grid)
            string TL = to_string(x) + "," + to_string(y + 8);
            string TR = to_string(x + 4) + "," + to_string(y + 8);
            string ML = to_string(x) + "," + to_string(y + 4);
            string MR = to_string(x + 4) + "," + to_string(y + 4);
            string BL = to_string(x) + "," + to_string(y);
            string BR = to_string(x + 4) + "," + to_string(y);

            addEdge(TL, TR, -s);
            addEdge(ML, MR, -3*s);
            addEdge(BL, BR, -s);
            addEdge(TL, ML, s);
            addEdge(ML, BL, -s);
            addEdge(TR, MR, -s);
            addEdge(MR, BR, s);
        }
    }

    if (adj.empty()) return {};

    // Find lowest-leftmost vertex as root
    string root;
    int minX = INT_MAX, minY = INT_MAX;
    for (const auto& [key, _] : adj) {
        size_t comma = key.find(',');
        int gx = stoi(key.substr(0, comma));
        int gy = stoi(key.substr(comma + 1));
        if (gy < minY || (gy == minY && gx < minX)) {
            minX = gx;
            minY = gy;
            root = key;
        }
    }

    // BFS to compute heights
    unordered_map<string, int> H;
    H[root] = 0;
    queue<string> q;
    q.push(root);

    while (!q.empty()) {
        string v = q.front();
        q.pop();
        for (const auto& [w, dh] : adj[v]) {
            if (H.find(w) == H.end()) {
                H[w] = H[v] + dh;
                q.push(w);
            }
        }
    }

    return H;
}

// ============================================================================
// PNG Output
// ============================================================================

// Save weight matrix as SVG with actual numbers on edges
void saveWeightsSVG(const string& filename, const MatrixDouble& weights, int N, bool verbose) {
    ofstream svg(filename);
    if (!svg) {
        cerr << "Error: Cannot open " << filename << " for writing" << endl;
        return;
    }

    // SVG setup
    int cellSize = 60;  // Size of each face
    int margin = 40;
    int imgSize = 2 * N * cellSize + 2 * margin;

    svg << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    svg << "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" << imgSize << "\" height=\"" << imgSize << "\">\n";
    svg << "<rect width=\"100%\" height=\"100%\" fill=\"white\"/>\n";
    svg << "<style>text { font-family: monospace; font-size: 9px; text-anchor: middle; }</style>\n";

    // Helper to convert (diagI, diagJ) to pixel coords (center of face)
    auto toPixel = [&](int diagI, int diagJ) -> pair<int, int> {
        int px = margin + (diagJ + (N - 1 - diagI)) * cellSize + cellSize / 2;
        int py = margin + (diagI + diagJ) * cellSize + cellSize / 2;
        return {px, py};
    };

    // Draw edges with weight values
    // Each black face at (diagI, diagJ) has 4 edges:
    //   - alpha (top): connects to face above
    //   - beta (right): connects to face to the right
    //   - gamma (left): connects to face to the left
    //   - delta (bottom): connects to face below

    int dim = 2 * N;

    // Draw all faces first (light gray fill)
    for (int diagI = 0; diagI < N; diagI++) {
        for (int diagJ = 0; diagJ < N; diagJ++) {
            auto [cx, cy] = toPixel(diagI, diagJ);
            int half = cellSize / 2 - 2;
            svg << "<rect x=\"" << (cx - half) << "\" y=\"" << (cy - half)
                << "\" width=\"" << (2 * half) << "\" height=\"" << (2 * half)
                << "\" fill=\"#f0f0f0\" stroke=\"#ccc\"/>\n";
        }
    }

    // Draw edges and weights
    for (int diagI = 0; diagI < N; diagI++) {
        for (int diagJ = 0; diagJ < N; diagJ++) {
            auto [cx, cy] = toPixel(diagI, diagJ);
            int eklpI = 2 * diagI;
            int eklpJ = 2 * diagJ;

            // Get weights
            double wAlpha = weights.at(eklpI, eklpJ + 1);      // even row, odd col
            double wBeta = weights.at(eklpI, eklpJ);           // even row, even col
            double wGamma = weights.at(eklpI + 1, eklpJ + 1);  // odd row, odd col
            double wDelta = weights.at(eklpI + 1, eklpJ);      // odd row, even col

            int half = cellSize / 2;

            // Format weight as string (show 2 decimal places, or integer if whole)
            auto fmt = [](double w) -> string {
                if (abs(w - round(w)) < 0.001) return to_string((int)round(w));
                char buf[16];
                snprintf(buf, sizeof(buf), "%.2f", w);
                return string(buf);
            };

            // Alpha edge (top) - only if not at top boundary
            if (diagI > 0 || diagJ > 0) {
                string color = (wAlpha != 1.0) ? "red" : "#666";
                svg << "<text x=\"" << cx << "\" y=\"" << (cy - half + 12)
                    << "\" fill=\"" << color << "\">" << fmt(wAlpha) << "</text>\n";
            }

            // Beta edge (right) - only if not at right boundary
            if (diagJ < N - 1 || diagI < N - 1) {
                string color = (wBeta != 1.0) ? "blue" : "#666";
                svg << "<text x=\"" << (cx + half - 8) << "\" y=\"" << cy
                    << "\" fill=\"" << color << "\">" << fmt(wBeta) << "</text>\n";
            }

            // Gamma edge (left) - only if not at left boundary
            if (diagJ > 0 || diagI > 0) {
                string color = (wGamma != 1.0) ? "green" : "#666";
                svg << "<text x=\"" << (cx - half + 8) << "\" y=\"" << cy
                    << "\" fill=\"" << color << "\">" << fmt(wGamma) << "</text>\n";
            }

            // Delta edge (bottom) - only if not at bottom boundary
            if (diagI < N - 1 || diagJ < N - 1) {
                string color = (wDelta != 1.0) ? "orange" : "#666";
                svg << "<text x=\"" << cx << "\" y=\"" << (cy + half - 4)
                    << "\" fill=\"" << color << "\">" << fmt(wDelta) << "</text>\n";
            }
        }
    }

    svg << "</svg>\n";
    svg.close();

    if (verbose) {
        cerr << "Saved SVG to " << filename << endl;
    }
}

// Save weight matrix as PNG on Aztec diamond graph structure
// The EKLP matrix is 2N x 2N. We visualize weights on the Aztec diamond shape.
// Each 2x2 block in EKLP corresponds to one black face of the Aztec diamond.
void saveWeightsPNG(const string& filename, const MatrixDouble& weights,
                    const vector<RGB>& colormap, int N, bool verbose) {
    // Draw Aztec diamond with faces colored by weight
    // The Aztec diamond of order N has faces at positions where |x| + |y| < N
    // in the "antidiagonal" coordinate system.

    int cellSize = max(20, 600 / (2 * N));  // Size of each face in pixels
    int margin = cellSize;
    int imgSize = 2 * N * cellSize + 2 * margin;

    vector<uint8_t> pixels(imgSize * imgSize * 3, 255);  // White background

    // Find weight range (only for positions that matter)
    double minW = 1e30, maxW = -1e30;
    int dim = weights.rows();
    for (int i = 0; i < dim; i++) {
        for (int j = 0; j < dim; j++) {
            double w = weights.at(i, j);
            if (w != 1.0) {  // Only consider non-trivial weights
                minW = min(minW, w);
                maxW = max(maxW, w);
            }
        }
    }
    if (minW > maxW) { minW = 1.0; maxW = 1.0; }  // All weights are 1

    // Also include 1.0 in range for proper coloring
    minW = min(minW, 1.0);
    maxW = max(maxW, 1.0);
    double range = (maxW == minW) ? 1.0 : (maxW - minW);

    if (verbose) {
        cerr << "Aztec diamond N=" << N << ", cell size=" << cellSize << endl;
        cerr << "Weight range: [" << minW << ", " << maxW << "]" << endl;
        cerr << "Image size: " << imgSize << " x " << imgSize << " pixels" << endl;
    }

    // Draw each face of the Aztec diamond
    // EKLP matrix indices: row i, col j
    // For even i (rows 0, 2, 4, ...): these are alpha/beta edges
    //   - odd j: alpha edges
    //   - even j: beta edges
    // For odd i: gamma/delta edges (typically weight 1)
    //
    // The black face at antidiagonal coords (diagI, diagJ) where 0 <= diagI, diagJ < N
    // maps to EKLP 2x2 block starting at (2*diagI, 2*diagJ)

    for (int diagI = 0; diagI < N; diagI++) {
        for (int diagJ = 0; diagJ < N; diagJ++) {
            // Check if this face is inside the Aztec diamond
            // In antidiagonal coords, face (diagI, diagJ) exists if:
            // The face center is at graph coords:
            //   faceX = diagI + diagJ - N + 1 (shifted)
            //   faceY = diagI - diagJ
            // Actually for Aztec diamond, all (diagI, diagJ) with 0 <= diagI, diagJ < N are valid

            // Get weights from EKLP matrix
            int eklpI = 2 * diagI;
            int eklpJ = 2 * diagJ;

            // Alpha weight (even row, odd col): top edge of black face
            double wAlpha = weights.at(eklpI, eklpJ + 1);
            // Beta weight (even row, even col): right edge of black face
            double wBeta = weights.at(eklpI, eklpJ);
            // Gamma weight (odd row, odd col): left edge
            double wGamma = weights.at(eklpI + 1, eklpJ + 1);
            // Delta weight (odd row, even col): bottom edge
            double wDelta = weights.at(eklpI + 1, eklpJ);

            // Average weight for face coloring (or use max of non-1 weights)
            double faceW = 1.0;
            if (wAlpha != 1.0) faceW = wAlpha;
            else if (wBeta != 1.0) faceW = wBeta;
            else if (wGamma != 1.0) faceW = wGamma;
            else if (wDelta != 1.0) faceW = wDelta;

            // Convert to pixel position
            // Place in a grid rotated 45 degrees (diamond shape)
            // diagI increases going down-right, diagJ increases going down-left
            int px = margin + (diagJ + (N - 1 - diagI)) * cellSize;
            int py = margin + (diagI + diagJ) * cellSize;

            // Color based on weight
            double t = (faceW - minW) / range;
            RGB color = interpolateColor(colormap, t);

            // Draw the face as a square (in the rotated view it looks like a diamond)
            for (int dy = 1; dy < cellSize - 1; dy++) {
                for (int dx = 1; dx < cellSize - 1; dx++) {
                    int ix = px + dx;
                    int iy = py + dy;
                    if (ix >= 0 && ix < imgSize && iy >= 0 && iy < imgSize) {
                        int idx = (iy * imgSize + ix) * 3;
                        pixels[idx] = color.r;
                        pixels[idx + 1] = color.g;
                        pixels[idx + 2] = color.b;
                    }
                }
            }

            // Draw border (black)
            for (int d = 0; d < cellSize; d++) {
                // Top and bottom edges
                for (int edge : {0, cellSize - 1}) {
                    int ix = px + d;
                    int iy = py + edge;
                    if (ix >= 0 && ix < imgSize && iy >= 0 && iy < imgSize) {
                        int idx = (iy * imgSize + ix) * 3;
                        pixels[idx] = 0; pixels[idx + 1] = 0; pixels[idx + 2] = 0;
                    }
                }
                // Left and right edges
                for (int edge : {0, cellSize - 1}) {
                    int ix = px + edge;
                    int iy = py + d;
                    if (ix >= 0 && ix < imgSize && iy >= 0 && iy < imgSize) {
                        int idx = (iy * imgSize + ix) * 3;
                        pixels[idx] = 0; pixels[idx + 1] = 0; pixels[idx + 2] = 0;
                    }
                }
            }
        }
    }

    if (stbi_write_png(filename.c_str(), imgSize, imgSize, 3, pixels.data(), imgSize * 3)) {
        if (verbose) {
            cerr << "Saved Aztec diamond weights to " << filename << endl;
        }
    } else {
        cerr << "Error: Failed to write PNG to " << filename << endl;
    }
}

void savePNG(const string& filename,
             const unordered_map<string, int>& heights1,
             const unordered_map<string, int>& heights2,
             const vector<RGB>& colormap,
             int N, int userScale, bool verbose) {

    // Compute height difference at each vertex
    unordered_map<string, int> heightDiff;
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

            size_t comma = key.find(',');
            int gx = stoi(key.substr(0, comma));
            int gy = stoi(key.substr(comma + 1));
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

    // Determine image size
    int gridStep = 4;  // Our scaled grid step
    int gridW = (maxGX - minGX) / gridStep + 1;
    int gridH = (maxGY - minGY) / gridStep + 1;

    // Scale to produce nice large images (target ~2000px, or use user scale)
    int pixelScale = userScale > 0 ? userScale : max(4, 2000 / max(gridW, gridH));
    int imgW = gridW * pixelScale;
    int imgH = gridH * pixelScale;

    if (verbose) {
        cerr << "Image size: " << imgW << " x " << imgH << " pixels" << endl;
    }

    // Create pixel buffer
    vector<uint8_t> pixels(imgW * imgH * 3, 128);  // Gray background

    // Fill pixels based on height difference
    double range = (maxH == minH) ? 1.0 : (maxH - minH);

    for (const auto& [key, diff] : heightDiff) {
        size_t comma = key.find(',');
        int gx = stoi(key.substr(0, comma));
        int gy = stoi(key.substr(comma + 1));

        // Map to pixel coordinates
        int px = ((gx - minGX) / gridStep) * pixelScale;
        int py = imgH - 1 - ((gy - minGY) / gridStep) * pixelScale;  // Flip Y

        // Normalize height to [0, 1]
        double t = (diff - minH) / range;
        RGB color = interpolateColor(colormap, t);

        // Fill a square of pixels
        for (int dy = 0; dy < pixelScale; dy++) {
            for (int dx = 0; dx < pixelScale; dx++) {
                int ix = px + dx;
                int iy = py + dy;
                if (ix >= 0 && ix < imgW && iy >= 0 && iy < imgH) {
                    int idx = (iy * imgW + ix) * 3;
                    pixels[idx] = color.r;
                    pixels[idx + 1] = color.g;
                    pixels[idx + 2] = color.b;
                }
            }
        }
    }

    // Write PNG
    if (stbi_write_png(filename.c_str(), imgW, imgH, 3, pixels.data(), imgW * 3)) {
        if (verbose) {
            cerr << "Saved to " << filename << endl;
        }
    } else {
        cerr << "Error: Failed to write PNG to " << filename << endl;
    }
}

// Save fluctuation PNG: h - E[h] as doubles
void saveFluctuationPNG(const string& filename,
                        const unordered_map<string, double>& fluctuation,
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

        size_t comma = key.find(',');
        int gx = stoi(key.substr(0, comma));
        int gy = stoi(key.substr(comma + 1));
        minGX = min(minGX, gx);
        maxGX = max(maxGX, gx);
        minGY = min(minGY, gy);
        maxGY = max(maxGY, gy);
    }

    if (verbose) {
        cerr << "Fluctuation range: [" << minF << ", " << maxF << "]" << endl;
        cerr << "Grid bounds: X=[" << minGX << "," << maxGX << "], Y=[" << minGY << "," << maxGY << "]" << endl;
    }

    // For fluctuations, use symmetric range centered at 0
    double absMax = max(abs(minF), abs(maxF));
    if (absMax < 1e-9) absMax = 1.0;

    // Determine image size
    int gridStep = 4;
    int gridW = (maxGX - minGX) / gridStep + 1;
    int gridH = (maxGY - minGY) / gridStep + 1;

    int pixelScale = userScale > 0 ? userScale : max(4, 2000 / max(gridW, gridH));
    int imgW = gridW * pixelScale;
    int imgH = gridH * pixelScale;

    if (verbose) {
        cerr << "Image size: " << imgW << " x " << imgH << " pixels" << endl;
    }

    vector<uint8_t> pixels(imgW * imgH * 3, 128);

    for (const auto& [key, f] : fluctuation) {
        size_t comma = key.find(',');
        int gx = stoi(key.substr(0, comma));
        int gy = stoi(key.substr(comma + 1));

        int px = ((gx - minGX) / gridStep) * pixelScale;
        int py = imgH - 1 - ((gy - minGY) / gridStep) * pixelScale;

        // Map fluctuation to [0, 1] with 0 centered at 0.5
        double t = 0.5 + 0.5 * (f / absMax);
        t = max(0.0, min(1.0, t));
        RGB color = interpolateColor(colormap, t);

        for (int dy = 0; dy < pixelScale; dy++) {
            for (int dx = 0; dx < pixelScale; dx++) {
                int ix = px + dx;
                int iy = py + dy;
                if (ix >= 0 && ix < imgW && iy >= 0 && iy < imgH) {
                    int idx = (iy * imgW + ix) * 3;
                    pixels[idx] = color.r;
                    pixels[idx + 1] = color.g;
                    pixels[idx + 2] = color.b;
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
    string mode = "double-dimer";  // "double-dimer" or "fluctuation"
    int samples = 20;  // Number of samples for fluctuation mode
    int scale = 0;  // Pixel scale (0 = auto: 4 pixels per vertex)
    double alpha = 2.0;
    double beta = 1.0;
    double v1 = 2.0;     // Layered: val1 (default: 2.0)
    double v2 = 0.5;     // Layered: val2 (default: 0.5)
    double prob = 0.5;   // Bernoulli probability
    double p1 = 0.5;     // Layered: probability for even layers
    double p2 = 0.5;     // Layered: probability for odd layers
    double w1 = 2.0;     // Layered periodic: weight 1
    double w2 = 0.5;     // Layered periodic: weight 2
    double a = 0.5;      // 2x2 periodic: weight a (or uniform range start)
    double b = 2.0;      // 2x2 periodic: weight b (or uniform range end)
    int seed = -1;  // -1 means use random device
    string colormap = "viridis";
    bool verbose = false;
    bool help = false;
    bool showWeights = false;  // Just show weight matrix PNG
};

void printHelp() {
    cerr << R"(
Double Dimer CLI - Sample double dimers from Aztec diamonds

Usage: ./double_dimer [options]

Options:
  -n, --size <N>        Aztec diamond order (default: 50)
  -m, --mode <type>     Output mode (default: double-dimer)
                        double-dimer: show h1 - h2 between two tilings
                        fluctuation: show h - E[h] from multiple samples
  --samples <N>         Number of samples for fluctuation mode (default: 20)
  -p, --preset <type>   Weight preset (default: uniform)
                        Basic: uniform, bernoulli, gaussian, gamma, biased-gamma, 2x2periodic
                        Layered: diagonal-layered, straight-layered,
                                 diagonal-periodic, straight-periodic,
                                 diagonal-uniform, straight-uniform
  -o, --output <file>   Output PNG filename (default: height_diff.png)
  --alpha <val>         Alpha parameter for gamma presets (default: 2.0)
  --beta <val>          Beta parameter for gaussian/gamma presets (default: 1.0)
  --v1 <val>            Value 1 for layered presets (default: 2.0)
  --v2 <val>            Value 2 for layered presets (default: 0.5)
  --prob <val>          Probability for Bernoulli (default: 0.5)
  --p1 <val>            Probability for even layers (default: 0.5)
  --p2 <val>            Probability for odd layers (default: 0.5)
  --w1 <val>            Weight 1 for layered-periodic (default: 2.0)
  --w2 <val>            Weight 2 for layered-periodic (default: 0.5)
  --a <val>             Weight a / uniform range start (default: 0.5)
  --b <val>             Weight b / uniform range end (default: 2.0)
  --seed <val>          Random seed (default: random device)
  --colormap <name>     Color map: viridis, plasma, coolwarm, grayscale (default: viridis)
  -v, --verbose         Verbose output
  -h, --help            Show this help message

Examples:
  # Double dimer mode (h1 - h2):
  ./double_dimer -n 100 -o uniform.png
  ./double_dimer -n 200 --preset gamma --alpha 2.0 -o gamma.png
  ./double_dimer -n 300 --preset biased-gamma --alpha 0.2 --beta 0.25 -o biased.png
  ./double_dimer -n 200 --preset diagonal-layered --v1 2 --v2 0.5 --p1 0.5 --p2 0.5 -o diag.png
  ./double_dimer -n 200 --preset straight-periodic --w1 2.0 --w2 0.5 -o straight.png

  # Fluctuation mode (h - E[h]):
  ./double_dimer -n 100 --mode fluctuation --samples 20 -o fluctuation.png
  ./double_dimer -n 200 --mode fluctuation --samples 50 --preset gamma -o fluct_gamma.png
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
            // Positional argument: treat as N
            args.n = stoi(arg);
        } else if ((arg == "-m" || arg == "--mode") && i + 1 < argc) {
            args.mode = argv[++i];
        } else if (arg == "--samples" && i + 1 < argc) {
            args.samples = stoi(argv[++i]);
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
        } else if (arg == "--show-weights") {
            args.showWeights = true;
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

    // Initialize RNG
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

    // Validate mode
    if (args.mode != "double-dimer" && args.mode != "fluctuation") {
        cerr << "Unknown mode: " << args.mode << endl;
        cerr << "Valid modes: double-dimer, fluctuation" << endl;
        return 1;
    }

    // Generate weight matrix based on preset
    int dim = 2 * args.n;
    MatrixDouble weights;

    if (args.preset == "uniform") {
        weights = generateUniformWeights(dim);
    } else if (args.preset == "bernoulli") {
        weights = generateBernoulliWeights(dim, args.v1, args.v2, args.prob);
        if (args.verbose) {
            cerr << "  Bernoulli: v1=" << args.v1 << ", v2=" << args.v2 << ", prob=" << args.prob << endl;
        }
    } else if (args.preset == "gaussian") {
        weights = generateGaussianWeights(dim, args.beta);
        if (args.verbose) {
            cerr << "  Gaussian: beta=" << args.beta << endl;
        }
    } else if (args.preset == "gamma") {
        weights = generateGammaWeights(dim, args.alpha);
        if (args.verbose) {
            cerr << "  Gamma: alpha=" << args.alpha << endl;
        }
    } else if (args.preset == "biased-gamma") {
        weights = generateBiasedGammaWeights(dim, args.alpha, args.beta);
        if (args.verbose) {
            cerr << "  Biased Gamma: alpha=" << args.alpha << ", beta=" << args.beta << endl;
        }
    } else if (args.preset == "2x2periodic") {
        weights = generate2x2PeriodicWeights(dim, args.a, args.b);
        if (args.verbose) {
            cerr << "  2x2 Periodic: a=" << args.a << ", b=" << args.b << endl;
        }
    } else if (args.preset == "diagonal-layered") {
        weights = generateDiagonalLayeredWeights(dim, args.v1, args.v2, args.p1, args.p2);
        if (args.verbose) {
            cerr << "  Diagonal Layered: v1=" << args.v1 << ", v2=" << args.v2
                 << ", p1=" << args.p1 << ", p2=" << args.p2 << endl;
        }
    } else if (args.preset == "straight-layered") {
        weights = generateStraightLayeredWeights(dim, args.v1, args.v2, args.p1, args.p2);
        if (args.verbose) {
            cerr << "  Straight Layered: v1=" << args.v1 << ", v2=" << args.v2
                 << ", p1=" << args.p1 << ", p2=" << args.p2 << endl;
        }
    } else if (args.preset == "diagonal-periodic") {
        weights = generateDiagonalPeriodicWeights(dim, args.w1, args.w2);
        if (args.verbose) {
            cerr << "  Diagonal Periodic: w1=" << args.w1 << ", w2=" << args.w2 << endl;
        }
    } else if (args.preset == "straight-periodic") {
        weights = generateStraightPeriodicWeights(dim, args.w1, args.w2);
        if (args.verbose) {
            cerr << "  Straight Periodic: w1=" << args.w1 << ", w2=" << args.w2 << endl;
        }
    } else if (args.preset == "diagonal-uniform") {
        weights = generateDiagonalUniformWeights(dim, args.a, args.b);
        if (args.verbose) {
            cerr << "  Diagonal Uniform: a=" << args.a << ", b=" << args.b << endl;
        }
    } else if (args.preset == "straight-uniform") {
        weights = generateStraightUniformWeights(dim, args.a, args.b);
        if (args.verbose) {
            cerr << "  Straight Uniform: a=" << args.a << ", b=" << args.b << endl;
        }
    } else {
        cerr << "Unknown preset: " << args.preset << endl;
        cerr << "Valid presets: uniform, bernoulli, gaussian, gamma, biased-gamma, 2x2periodic" << endl;
        cerr << "               diagonal-layered, straight-layered, diagonal-periodic," << endl;
        cerr << "               straight-periodic, diagonal-uniform, straight-uniform" << endl;
        return 1;
    }

    // Get colormap
    vector<RGB> colormap = getColormap(args.colormap);

    // Show weights mode - output SVG with numbers on edges
    if (args.showWeights) {
        string svgFile = args.output;
        // Change extension to .svg if needed
        size_t dotPos = svgFile.rfind('.');
        if (dotPos != string::npos) {
            svgFile = svgFile.substr(0, dotPos) + ".svg";
        } else {
            svgFile += ".svg";
        }
        saveWeightsSVG(svgFile, weights, args.n, args.verbose);
        return 0;
    }

    if (args.verbose) {
        cerr << "Computing probabilities..." << endl;
    }

    // Compute probability matrices
    vector<MatrixDouble> probs = probsslim(weights);

    if (args.mode == "double-dimer") {
        // ===== DOUBLE DIMER MODE =====
        if (args.verbose) {
            cerr << "Sampling first tiling..." << endl;
        }
        MatrixInt config1 = aztecgen(probs);

        if (args.verbose) {
            cerr << "Sampling second tiling..." << endl;
        }
        MatrixInt config2 = aztecgen(probs);

        if (args.verbose) {
            cerr << "Extracting dominoes..." << endl;
        }
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
        // ===== FLUCTUATION MODE =====
        if (args.verbose) {
            cerr << "Fluctuation mode: sampling " << args.samples << " tilings..." << endl;
        }

        // Sample multiple tilings and accumulate heights
        unordered_map<string, double> heightSum;
        unordered_map<string, int> heightCount;
        unordered_map<string, int> lastHeight;

        for (int s = 0; s < args.samples; s++) {
            if (args.verbose && (s + 1) % 5 == 0) {
                cerr << "  Sample " << (s + 1) << "/" << args.samples << endl;
            }

            MatrixInt config = aztecgen(probs);
            vector<Domino> dominoes = extractDominoes(config, args.n);
            auto heights = computeHeightFunction(dominoes);

            for (const auto& [key, h] : heights) {
                heightSum[key] += h;
                heightCount[key]++;
                if (s == args.samples - 1) {
                    lastHeight[key] = h;  // Keep last sample
                }
            }
        }

        // Compute h - E[h] for last sample
        unordered_map<string, double> fluctuation;
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
