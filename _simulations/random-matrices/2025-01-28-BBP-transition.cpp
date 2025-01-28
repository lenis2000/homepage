/*
Compiles into a WebAssembly module that computes the eigenvalues of a random
Gaussian Orthogonal Ensemble (GOE) matrix.

To compile, you need to have Emscripten installed and the Eigen library available

emcc 2025-01-28-BBP-transition.cpp -o 2025-01-28-BBP-transition.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_computeEigenvalues', '_getMatrixData', '_getCurrentN', '_getHeatMapData', '_getHeatMapDim', '_main', '_setTheta']" \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_MEMORY=268435456 \
    -O3 \
    -s ASSERTIONS=1 \
    -I ../../eigen-3.4-rc1 \
    -s SINGLE_FILE=1 \
    && mv 2025-01-28-BBP-transition.js ../../js/

then move the js file into the /js/ folder
*/

#include <emscripten/emscripten.h>
#include <Eigen/Dense>
#include <vector>
#include <random>
#include <cmath>
#include <algorithm>

using Matrix = Eigen::MatrixXd;

// We keep a base random GOE matrix (without the rank-1 shift) in memory
static std::vector<double> baseMatrixData;
static std::vector<double> matrixData;
static std::vector<double> eigenvalues;
static std::vector<unsigned char> heatMapData;
static int currentN = 0;
static int heatMapDim = 0; // dimension of the aggregated heat map

static double currentTheta = 0.0;

// Simple exponential transform: x -> sign(x)*(exp(|x|)-1)
inline double exponentialTransform(double x) {
    double ax = std::fabs(x);
    double tx = std::exp(ax) - 1.0;
    return (x < 0) ? -tx : tx;
}

// Global RNG for reproducibility
static std::mt19937 rng(42);
static std::normal_distribution<double> dist(0.0, 1.0);

// Generate a random number from a normal distribution
EMSCRIPTEN_KEEPALIVE
extern "C" double randn() {
    return dist(rng);
}

// Set the theta parameter
EMSCRIPTEN_KEEPALIVE
extern "C" void setTheta(double theta) {
    currentTheta = theta;
}

/*
  We only re-generate the random matrix if N changes or if we haven't allocated yet.
  Otherwise, we reuse the same random matrix and simply add (currentTheta) to A(0,0)
  to get the rank-1 shift, then compute eigenvalues.
*/
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeEigenvalues(int N) {
    // Check if we need to regenerate the base random matrix
    if (N != currentN || baseMatrixData.size() != size_t(N*N)) {
        currentN = N;
        baseMatrixData.resize(N * N);

        double scale = 1.0 / std::sqrt(N);

        // Generate GOE matrix (store in baseMatrixData)
        for (int i = 0; i < N; i++) {
            for (int j = i; j < N; j++) {
                double value = randn() * scale;
                baseMatrixData[i * N + j] = value;
                baseMatrixData[j * N + i] = value;
            }
        }
    }

    // Now copy baseMatrixData to matrixData
    matrixData = baseMatrixData;

    // Add rank-1 spike: A(0,0) += currentTheta
    if (N > 1) {
        matrixData[0] += currentTheta;
    }

    // Map matrixData into an Eigen::Matrix for eigenvalue computation
    Eigen::Map<Matrix> A(matrixData.data(), N, N);

    Eigen::SelfAdjointEigenSolver<Matrix> solver(A);
    if (solver.info() != Eigen::Success) {
        return nullptr;
    }

    eigenvalues.resize(N);
    std::copy(solver.eigenvalues().data(),
              solver.eigenvalues().data() + N,
              eigenvalues.data());

    // HEAT MAP LOGIC with absolute color scale [-5, 5]
    // 1. Determine dimension M for aggregated heat map
    int M = (N < 100) ? N : 100;
    heatMapDim = M;
    heatMapData.resize(4 * M * M);

    // 2. Precompute block averages from matrixData
    std::vector<double> blockVals(M * M, 0.0);
    int blockSize = (N / M > 0) ? (N / M) : 1;

    for (int bi = 0; bi < M; bi++) {
        for (int bj = 0; bj < M; bj++) {
            double sum = 0.0;
            int rowStart = bi * blockSize;
            int colStart = bj * blockSize;
            int count = 0;

            for (int r = rowStart; r < rowStart + blockSize && r < N; r++) {
                for (int c = colStart; c < colStart + blockSize && c < N; c++) {
                    sum += matrixData[r * N + c];
                    count++;
                }
            }
            double avg = (count > 0) ? (sum / count) : 0.0;
            // Use exponential transform if you wish, or skip. The original logic had it:
            blockVals[bi * M + bj] = exponentialTransform(avg);
        }
    }

    // 3. Fixed absolute range: [-5, 5]
    double minAbs = -5.0;
    double maxAbs =  5.0;

    // 4. Fill in heatMapData with that fixed color scale
    for (int i = 0; i < M; i++) {
        for (int j = 0; j < M; j++) {
            double val = blockVals[i * M + j];

            // clamp val into [-5, 5]
            if (val < minAbs) val = minAbs;
            if (val > maxAbs) val = maxAbs;

            double ratio = (val - minAbs) / (maxAbs - minAbs);
            // ratio=0 => Blue, ratio=1 => Red
            unsigned char r = static_cast<unsigned char>(255.0 * ratio);
            unsigned char g = 0;
            unsigned char b = static_cast<unsigned char>(255.0 * (1.0 - ratio));
            unsigned char a = 255;

            int idx = 4 * (i * M + j);
            heatMapData[idx + 0] = r;
            heatMapData[idx + 1] = g;
            heatMapData[idx + 2] = b;
            heatMapData[idx + 3] = a;
        }
    }

    return eigenvalues.data();
}

// Access the stored matrix data (row-major)
EMSCRIPTEN_KEEPALIVE
extern "C" double* getMatrixData() {
    return matrixData.data();
}

// Get the current matrix dimension
EMSCRIPTEN_KEEPALIVE
extern "C" int getCurrentN() {
    return currentN;
}

// Get the RGBA heatmap data
EMSCRIPTEN_KEEPALIVE
extern "C" unsigned char* getHeatMapData() {
    return heatMapData.data();
}

// Get the dimension M of the heatmap
EMSCRIPTEN_KEEPALIVE
extern "C" int getHeatMapDim() {
    return heatMapDim;
}

// Required dummy main function
int main() {
    return 0;
}
