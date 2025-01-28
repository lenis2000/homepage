/*
Compiles into a WebAssembly module that computes the eigenvalues of a random
Gaussian Orthogonal Ensemble (GOE) matrix.

To compile, you need to have Emscripten installed and the Eigen library available

emcc 2025-01-28-BBP-transition.cpp -o 2025-01-28-BBP-transition.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_computeEigenvalues', '_getMatrixData', '_getCurrentN', '_getHeatMapData', '_getHeatMapDim', '_main']" \
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

// Static storage for matrix elements, eigenvalues, and heatmap data
static std::vector<double> matrixData;
static std::vector<double> eigenvalues;
static std::vector<unsigned char> heatMapData; // RGBA data for 100x100 (max) or NxN if smaller
static int currentN = 0;
static int heatMapDim = 0; // Actual dimension of the aggregated heat map

// Simple exponential transform: x -> sign(x)*(exp(|x|)-1)
inline double exponentialTransform(double x) {
    double ax = std::fabs(x);
    double tx = std::exp(ax) - 1.0;
    return (x < 0) ? -tx : tx;
}

// Generate a random number from a normal distribution
EMSCRIPTEN_KEEPALIVE
extern "C" double randn() {
    static std::mt19937 rng(42);  // Fixed seed for reproducibility
    static std::normal_distribution<double> dist(0.0, 1.0);
    return dist(rng);
}

// Main eigenvalue computation function
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeEigenvalues(int N) {
    currentN = N;
    Matrix A = Matrix::Zero(N, N);
    double scale = 1.0 / std::sqrt(N);

    // Resize storage for the matrix
    matrixData.resize(N * N);

    // Generate GOE matrix
    for (int i = 0; i < N; i++) {
        for (int j = i; j < N; j++) {
            double value = randn() * scale;
            A(i, j) = value;
            A(j, i) = value;
        }
    }

    // Copy matrix values into matrixData (row-major)
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            matrixData[i * N + j] = A(i, j);
        }
    }

    // Compute eigenvalues
    Eigen::SelfAdjointEigenSolver<Matrix> solver(A);
    if (solver.info() != Eigen::Success) {
        return nullptr;
    }

    eigenvalues.resize(N);
    std::copy(solver.eigenvalues().data(),
              solver.eigenvalues().data() + N,
              eigenvalues.data());

    /*
        HEAT MAP LOGIC:
        1. We'll aggregate the matrix into a size M x M, where M = min(N, 100).
        2. For each block, average values, apply exponential transform,
           then color-scale from (max->red, min->blue).
    */

    // 1. Determine the dimension M for the aggregated heat map
    int M = (N < 100) ? N : 100;
    heatMapDim = M;
    heatMapData.resize(4 * M * M);

    // 2. Precompute block averages in a temporary array
    std::vector<double> blockVals(M * M, 0.0);

    // Integer block size in each dimension
    // (some leftover rows/cols may be ignored for simplicity if N not multiple of M)
    int blockSize = N / M;
    if (blockSize < 1) blockSize = 1; // for safety if N < M

    // We'll fill each of the MxM blocks by averaging the blockSize x blockSize region
    // (any leftover region if N % M != 0 won't significantly affect the aggregated map)
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

    // 3. Find the min/max in the transformed block values
    double minVal = *std::min_element(blockVals.begin(), blockVals.end());
    double maxVal = *std::max_element(blockVals.begin(), blockVals.end());

    // 4. Fill in heatMapData with a reversed domain color scale (max->red, min->blue)
    for (int i = 0; i < M; i++) {
        for (int j = 0; j < M; j++) {
            double val = blockVals[i * M + j];

            // ratio in [0,1] for reversed scale
            double ratio;
            if (std::fabs(maxVal - minVal) < 1e-14) {
                // Avoid divide by zero if matrix is nearly constant
                ratio = 0.5;
            } else {
                ratio = (val - maxVal) / (minVal - maxVal);
                if (ratio < 0.0) ratio = 0.0;
                if (ratio > 1.0) ratio = 1.0;
            }

            unsigned char r = static_cast<unsigned char>(255.0 * (1.0 - ratio));
            unsigned char g = 0;
            unsigned char b = static_cast<unsigned char>(255.0 * ratio);
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

// Access the stored matrix data (row-major) if needed
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
