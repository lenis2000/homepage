/*
Compiles into a WebAssembly module that computes the eigenvalues of a random
N×N symmetric matrix. Entries are drawn from one of several distributions
(uniform, exponential, Cauchy, Bernoulli, semicircle),
each (except Cauchy) scaled so that Var(entry) = 1/(2N), leading to a typical
largest eigenvalue around 2 for large N.

Cauchy has no finite variance, but we mimic the same scale by dividing the standard
Cauchy(0,1) sample by sqrt(N).

Build (unchanged):
emcc 2025-01-29-Wigner.cpp -o 2025-01-29-Wigner.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_computeEigenvalues', '_getMatrixData', '_getCurrentN', '_getHeatMapData', '_getHeatMapDim', '_main', '_setDistributionType']" \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_MEMORY=268435456 \
    -O3 \
    -s ASSERTIONS=1 \
    -I ../../eigen-3.4-rc1 \
    -s SINGLE_FILE=1 \
    && mv 2025-01-29-Wigner.js ../../js/
*/

#include <emscripten/emscripten.h>
#include <Eigen/Dense>
#include <vector>
#include <random>
#include <cmath>
#include <algorithm>

// Type aliases
using Matrix = Eigen::MatrixXd;

// Global/static storage
static std::vector<double> matrixData;
static std::vector<double> eigenvalues;
static std::vector<unsigned char> heatMapData; // RGBA
static int currentN = 0;
static int heatMapDim = 0;   // dimension of aggregated heatmap
static int distributionType = 0;  // 0=Uniform, 1=Exponential, 2=Cauchy, 3=Bernoulli, 4=Semicircle

// Random generator
static std::mt19937 rng(42);  // fixed seed for reproducibility

// EMSCRIPTEN function to set which distribution to use
EMSCRIPTEN_KEEPALIVE
extern "C" void setDistributionType(int t) {
    distributionType = t;
}

// Helpers for each distribution
static double randUniform() {
    // Base: Uniform in [-1,1]
    static std::uniform_real_distribution<double> dist01(0.0, 1.0);
    double u = dist01(rng);
    return 2.0 * u - 1.0;  // now in [-1,1]
}

static double randExponential() {
    // Standard Exp(1) => mean=1, var=1
    static std::exponential_distribution<double> distExp(1.0);
    return distExp(rng);
}

static double randCauchy() {
    // Standard cauchy(0,1)
    static std::cauchy_distribution<double> distCauchy(0.0, 1.0);
    return distCauchy(rng);
}

static double randBernoulli() {
    // Rademacher: ±1 w.p. 1/2 => var=1
    static std::uniform_real_distribution<double> dist01(0.0, 1.0);
    double u = dist01(rng);
    return (u < 0.5) ? 1.0 : -1.0;
}

// Rejection sampling for semicircle distribution on [-1,1]
// pdf(x) = (2/pi)*sqrt(1 - x^2)
static double randSemicircle() {
    static std::uniform_real_distribution<double> distX(-1.0, 1.0);
    static std::uniform_real_distribution<double> distY(0.0, 2.0 / M_PI);

    while (true) {
        double x = distX(rng);
        double y = distY(rng);
        double pdfVal = (2.0 / M_PI) * std::sqrt(1.0 - x*x);
        if (y <= pdfVal) {
            return x;
        }
    }
}

// For color scaling: exponential transform of matrix entries
inline double exponentialTransform(double x) {
    double ax = std::fabs(x);
    double tx = std::exp(ax) - 1.0;
    return (x < 0) ? -tx : tx;
}

// The main function computing eigenvalues
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeEigenvalues(int N) {
    currentN = N;
    Matrix A = Matrix::Zero(N, N);

    /*
     We want Var(entry) = 1/(2N) for the 4 distributions that have finite variance,
     so that the top eigenvalue ~ 2 for large N. For Cauchy, we do 1/sqrt(N).

     - Uniform in [-1,1] has var=1/3 => scale factor = sqrt( (1/(2N)) / (1/3)) = sqrt(3/(2N))
     - Exponential(1): after shifting by -1, var=1 => scale factor = sqrt(1/(2N))
     - Bernoulli(±1): var=1 => scale factor = sqrt(1/(2N))
     - Semicircle distribution above has var=1/4 => scale factor = sqrt( (1/(2N)) / (1/4)) = sqrt(2/N)
     - Cauchy(0,1): no variance, but we follow your request: scale by 1/sqrt(N)
    */

    double b        = std::sqrt(3.0 / ( double(N)));  // uniform
    double c        = std::sqrt(1.0 / ( double(N)));  // exponential, bernoulli
    double cCauchy  = 1.0 / std::sqrt(double(N));          // cauchy
    double s        = std::sqrt(4.0 / double(N));          // semicircle

    // Resize storage for matrix
    matrixData.resize(N * N);

    // Generate entries
    for (int i = 0; i < N; i++) {
        for (int j = i; j < N; j++) {
            double raw = 0.0;
            switch(distributionType) {
                case 0: { // Uniform
                    raw = randUniform() * b;
                    break;
                }
                case 1: { // Exponential
                    double e = randExponential();  // ~Exp(1)
                    // shift to mean 0 => (e - 1) => var still = 1
                    // scale so var = 1/(2N)
                    raw = c * (e - 1.0);
                    break;
                }
                case 2: { // Cauchy
                    raw = cCauchy * randCauchy();
                    break;
                }
                case 3: { // Bernoulli (±1)
                    raw = c * randBernoulli();
                    break;
                }
                case 4: { // Semicircle
                    raw = s * randSemicircle();
                    break;
                }
                default:
                    // fallback: uniform
                    raw = randUniform() * b;
                    break;
            }

            // Symmetrize
            A(i, j) = raw;
            A(j, i) = raw;
        }
    }

    // Copy matrix values to matrixData (row-major)
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            matrixData[i * N + j] = A(i, j);
        }
    }

    // Compute eigenvalues (self-adjoint => real symmetric)
    Eigen::SelfAdjointEigenSolver<Matrix> solver(A);
    if (solver.info() != Eigen::Success) {
        return nullptr;
    }

    eigenvalues.resize(N);
    std::copy(solver.eigenvalues().data(),
              solver.eigenvalues().data() + N,
              eigenvalues.data());

    // Build aggregated heatmap
    int M = (N < 100) ? N : 100;
    heatMapDim = M;
    heatMapData.resize(4 * M * M);

    // Average in MxM blocks
    std::vector<double> blockVals(M * M, 0.0);
    int blockSize = (N / M);
    if (blockSize < 1) blockSize = 1;

    for (int bi = 0; bi < M; bi++) {
        for (int bj = 0; bj < M; bj++) {
            double sum = 0.0;
            int rowStart = bi * blockSize;
            int colStart = bj * blockSize;
            for (int r = rowStart; r < rowStart + blockSize; r++) {
                for (int c = colStart; c < colStart + blockSize; c++) {
                    if (r < N && c < N) {
                        sum += A(r, c);
                    }
                }
            }
            double avg = sum / double(blockSize * blockSize);
            blockVals[bi * M + bj] = exponentialTransform(avg);
        }
    }

    // min/max for color scale
    double minVal = *std::min_element(blockVals.begin(), blockVals.end());
    double maxVal = *std::max_element(blockVals.begin(), blockVals.end());

    for (int i = 0; i < M; i++) {
        for (int j = 0; j < M; j++) {
            double val = blockVals[i * M + j];
            double ratio;
            if (std::fabs(maxVal - minVal) < 1e-14) {
                ratio = 0.5;
            } else {
                // reversed domain: val -> ratio in [0,1], max->0, min->1
                ratio = (val - maxVal) / (minVal - maxVal);
                if (ratio < 0.0) ratio = 0.0;
                if (ratio > 1.0) ratio = 1.0;
            }

            unsigned char r = static_cast<unsigned char>(255.0 * (1.0 - ratio));
            unsigned char g = 0;
            unsigned char bC = static_cast<unsigned char>(255.0 * ratio);
            unsigned char a = 255;

            int idx = 4 * (i * M + j);
            heatMapData[idx + 0] = r;
            heatMapData[idx + 1] = g;
            heatMapData[idx + 2] = bC;
            heatMapData[idx + 3] = a;
        }
    }

    return eigenvalues.data();
}

// Access the stored matrix
EMSCRIPTEN_KEEPALIVE
extern "C" double* getMatrixData() {
    return matrixData.data();
}

// Get dimension
EMSCRIPTEN_KEEPALIVE
extern "C" int getCurrentN() {
    return currentN;
}

// RGBA data for heatmap
EMSCRIPTEN_KEEPALIVE
extern "C" unsigned char* getHeatMapData() {
    return heatMapData.data();
}

EMSCRIPTEN_KEEPALIVE
extern "C" int getHeatMapDim() {
    return heatMapDim;
}

// Required dummy main
int main() {
    return 0;
}
