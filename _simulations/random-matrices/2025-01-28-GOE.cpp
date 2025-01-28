/*
Compiles into a WebAssembly module that computes the eigenvalues of a random
Gaussian Orthogonal Ensemble (GOE) matrix.

To compile, you need to have Emscripten installed and the Eigen library available

emcc 2025-01-28-GOE.cpp -o 2025-01-28-GOE.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_computeEigenvalues', '_getMatrixData', '_getCurrentN', '_getHeatMapData', '_main']" \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_MEMORY=268435456 \
    -O3 \
    -s ASSERTIONS=1 \
    -I ../../eigen-3.4-rc1 \
    -s SINGLE_FILE=1

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
static std::vector<unsigned char> heatMapData; // RGBA data for each matrix cell
static int currentN = 0;

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

    // Prepare the heatmap data (RGBA) in C++ to speed up rendering in JS
    heatMapData.resize(4 * N * N);

    // Compute min and max of the matrix for color scaling
    double minVal = A.minCoeff();
    double maxVal = A.maxCoeff();

    // For each entry, compute color from red-to-blue scale
    // Domain is [maxVal -> red, minVal -> blue], reversing normal order
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            double val = A(i, j);

            // ratio in [0,1] for reversed domain
            double ratio = (val - maxVal) / (minVal - maxVal);
            if (ratio < 0.0) ratio = 0.0;
            if (ratio > 1.0) ratio = 1.0;

            unsigned char r = static_cast<unsigned char>(255.0 * (1.0 - ratio));
            unsigned char g = 0;
            unsigned char b = static_cast<unsigned char>(255.0 * ratio);
            unsigned char a = 255;

            int idx = 4 * (i * N + j);
            heatMapData[idx + 0] = r;
            heatMapData[idx + 1] = g;
            heatMapData[idx + 2] = b;
            heatMapData[idx + 3] = a;
        }
    }

    return eigenvalues.data();
}

// Access the stored matrix data (row-major) if needed for debugging
EMSCRIPTEN_KEEPALIVE
extern "C" double* getMatrixData() {
    return matrixData.data();
}

// Get the current matrix dimension
EMSCRIPTEN_KEEPALIVE
extern "C" int getCurrentN() {
    return currentN;
}

// Get RGBA data for the heatmap
EMSCRIPTEN_KEEPALIVE
extern "C" unsigned char* getHeatMapData() {
    return heatMapData.data();
}

// Required dummy main function
int main() {
    return 0;
}
