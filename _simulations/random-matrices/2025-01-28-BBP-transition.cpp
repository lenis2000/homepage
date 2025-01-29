/*
Compiles into a WebAssembly module that computes the eigenvalues of a random
Gaussian Orthogonal Ensemble (GOE) matrix.

To compile, you need to have Emscripten installed and the Eigen library available

emcc 2025-01-28-BBP-transition.cpp -o 2025-01-28-BBP-transition.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_computeEigenvalues', '_getMatrixData', '_getCurrentN', '_getHeatMapData', '_getHeatMapDim', '_main', '_setTheta', '_getMatrixCorner', '_getCornerSize', '_setForceResample']" \
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

// Data storage
static std::vector<double> baseMatrixData;
static std::vector<double> matrixData;
static std::vector<double> eigenvalues;
static std::vector<unsigned char> heatMapData;

static int currentN = 0;            // Current dimension
static int heatMapDim = 0;          // Dimension for the aggregated heat map
static double currentTheta = 0.0;   // Rank-1 shift parameter
static bool forceResample = false;  // Flag to force matrix regeneration

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

// Exposed to JavaScript: set or clear the force-resample flag
EMSCRIPTEN_KEEPALIVE
extern "C" void setForceResample(int val) {
    forceResample = (val != 0);
}

// Return the upper 10x10 corner of the matrix
EMSCRIPTEN_KEEPALIVE
extern "C" double* getMatrixCorner() {
    static std::vector<double> cornerData(100); // 10x10 = 100 elements

    int displaySize = std::min(10, currentN);

    for (int i = 0; i < displaySize; i++) {
        for (int j = 0; j < displaySize; j++) {
            cornerData[i * 10 + j] = matrixData[i * currentN + j];
        }
        for (int j = displaySize; j < 10; j++) {
            cornerData[i * 10 + j] = 0.0;
        }
    }
    for (int i = displaySize; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            cornerData[i * 10 + j] = 0.0;
        }
    }

    return cornerData.data();
}

// Get the size of the displayed corner
EMSCRIPTEN_KEEPALIVE
extern "C" int getCornerSize() {
    return std::min(10, currentN);
}

/*
  We regenerate the random GOE matrix only if:
   - N != currentN, or
   - forceResample == true.
  Otherwise, we reuse the existing baseMatrixData.
*/
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeEigenvalues(int N) {
    if (N != currentN || forceResample) {
        currentN = N;
        forceResample = false;  // Reset after use

        baseMatrixData.resize(N * N);
        double scale = 1.0 / std::sqrt(N);

        // Generate GOE matrix
        for (int i = 0; i < N; i++) {
            for (int j = i; j < N; j++) {
                double value = randn() * scale;
                baseMatrixData[i * N + j] = value;
                baseMatrixData[j * N + i] = value;
            }
        }
    }

    // Copy baseMatrixData -> matrixData
    matrixData = baseMatrixData;

    // Add rank-1 shift: A(0,0) += currentTheta
    if (N > 1) {
        matrixData[0] += currentTheta;
    }

    // Eigenvalue computation
    Eigen::Map<Matrix> A(matrixData.data(), N, N);

    Eigen::SelfAdjointEigenSolver<Matrix> solver(A);
    if (solver.info() != Eigen::Success) {
        return nullptr;
    }

    eigenvalues.resize(N);
    std::copy(solver.eigenvalues().data(),
              solver.eigenvalues().data() + N,
              eigenvalues.data());

    // Build heat map
    int M = (N < 100) ? N : 100;
    heatMapDim = M;
    heatMapData.resize(4 * M * M);

    std::vector<double> blockVals(M * M, 0.0);
    int blockSize = (N / M > 0) ? (N / M) : 1;

    // Compute block averages
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
            blockVals[bi * M + bj] = exponentialTransform(avg);
        }
    }

    // Fixed absolute range for coloring
    double minAbs = -5.0;
    double maxAbs =  5.0;

    // Convert to RGBA
    for (int i = 0; i < M; i++) {
        for (int j = 0; j < M; j++) {
            double val = blockVals[i * M + j];
            if (val < minAbs) val = minAbs;
            if (val > maxAbs) val = maxAbs;

            double ratio = (val - minAbs) / (maxAbs - minAbs);
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

// Access the current matrix data
EMSCRIPTEN_KEEPALIVE
extern "C" double* getMatrixData() {
    return matrixData.data();
}

// Get the current matrix dimension
EMSCRIPTEN_KEEPALIVE
extern "C" int getCurrentN() {
    return currentN;
}

// Get the RGBA heat map data
EMSCRIPTEN_KEEPALIVE
extern "C" unsigned char* getHeatMapData() {
    return heatMapData.data();
}

// Get the dimension of the heat map
EMSCRIPTEN_KEEPALIVE
extern "C" int getHeatMapDim() {
    return heatMapDim;
}

// Required dummy main
int main() {
    return 0;
}
