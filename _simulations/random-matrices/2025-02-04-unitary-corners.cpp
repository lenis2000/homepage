/*
Compiles into a WebAssembly module that computes the eigenvalues of successive corners of a random
Wigner matrix, or of a matrix with a prescribed diagonal spectrum.

To compile, you need to have Emscripten installed and the Eigen library available

emcc 2025-02-04-unitary-corners.cpp -o 2025-02-04-unitary-corners.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_computeCornerEigenvalues','_computeCornerEigenvaluesDiscrete','_malloc','_free']" \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_MEMORY=268435456 \
    -s TOTAL_STACK=33554432 \
    -O3 \
    -s ASSERTIONS=1 \
    -I ../../eigen-3.4-rc1 \
    -s SINGLE_FILE=1 \
    && mv 2025-02-04-unitary-corners.js ../../js/

then move the js file into the /js/ folder

Note: The function computeCornerEigenvaluesDiscrete generates a matrix with a diagonal spectrum
with 10 distinct eigenvalues (of high multiplicity) provided by the user, and then conjugates it
by a random Haar matrix.
*/

#include <emscripten/emscripten.h>
#include <Eigen/Dense>
#include <Eigen/QR>
#include <vector>
#include <random>
#include <cmath>
#include <algorithm>
#include <cstdio>

using Matrix = Eigen::MatrixXd;

// Global storage for the computed corner eigenvalue data.
// Always allocate enough space for maximum N = 300.
static std::vector<double> cornerEigenData;
static int currentN = 0;
static const int MAX_N = 300;  // Maximum allowed N

// Generate a random number from a normal distribution (fixed seed for reproducibility)
EMSCRIPTEN_KEEPALIVE
extern "C" double randn() {
    static std::mt19937 rng(42);
    static std::normal_distribution<double> dist(0.0, 1.0);
    return dist(rng);
}

// Compute eigenvalues for successive corners of a Wigner matrix of size N.
// Fills the first 2*(N*(N+1)/2) doubles in cornerEigenData and returns its pointer.
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeCornerEigenvalues(int N) {
    currentN = N;
    int maxTotalPoints = MAX_N * (MAX_N + 1) / 2;
    if(cornerEigenData.capacity() < 2 * maxTotalPoints)
        cornerEigenData.reserve(2 * maxTotalPoints);
    // Always resize to full maximum capacity so that the data pointer remains constant.
    cornerEigenData.resize(2 * maxTotalPoints);
    int totalPoints = N * (N + 1) / 2;

    int index = 0;
    // Create a random symmetric Wigner matrix.
    Matrix A = Matrix::Zero(N, N);
    double scale = 1.0 / std::sqrt(N);
    for (int i = 0; i < N; i++) {
        for (int j = i; j < N; j++) {
            double value = randn() * scale;
            A(i, j) = value;
            A(j, i) = value;
        }
    }
    for (int k = 1; k <= N; k++) {
        Matrix A_corner = A.topLeftCorner(k, k);
        Eigen::SelfAdjointEigenSolver<Matrix> solver(A_corner);
        if (solver.info() != Eigen::Success) {
            for (int j = 0; j < k; j++) {
                cornerEigenData[index++] = k;
                cornerEigenData[index++] = 0.0;
            }
            continue;
        }
        Eigen::VectorXd eigs = solver.eigenvalues();
        std::vector<double> eigs_vec(eigs.data(), eigs.data() + k);
        std::sort(eigs_vec.begin(), eigs_vec.end());
        std::reverse(eigs_vec.begin(), eigs_vec.end());
        for (int j = 0; j < k; j++) {
            cornerEigenData[index++] = static_cast<double>(k);
            cornerEigenData[index++] = eigs_vec[j];
        }
    }
    // printf("computeCornerEigenvalues: pointer=%p, numElements=%d, totalBytes=%d\n",
           // cornerEigenData.data(), 2 * totalPoints, 2 * totalPoints * (int)sizeof(double));
    fflush(stdout);
    return cornerEigenData.data();
}

// Helper: Generate a random Haar orthogonal matrix of size N.
Matrix randomHaarMatrix(int N) {
    Matrix X(N, N);
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            X(i, j) = randn();
        }
    }
    Eigen::HouseholderQR<Matrix> qr(X);
    Matrix Q = qr.householderQ() * Matrix::Identity(N, N);
    Matrix R = qr.matrixQR().triangularView<Eigen::Upper>();
    for (int i = 0; i < N; i++) {
        if (R(i, i) < 0)
            Q.col(i) = -Q.col(i);
    }
    return Q;
}

// Compute eigenvalues for successive corners of matrix M constructed as follows:
// Create a diagonal matrix D (size N) with 10 distinct eigenvalues provided in discreteVals,
// then conjugate D by a random Haar matrix (M = H * D * H^T). Compute eigenvalues for each
// top-left k×k block (k=1..N) and store in cornerEigenData.
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeCornerEigenvaluesDiscrete(int N, double* discreteVals) {
    currentN = N;
    int maxTotalPoints = MAX_N * (MAX_N + 1) / 2;
    if(cornerEigenData.capacity() < 2 * maxTotalPoints)
        cornerEigenData.reserve(2 * maxTotalPoints);
    cornerEigenData.resize(2 * maxTotalPoints);
    int totalPoints = N * (N + 1) / 2;

    Matrix D = Matrix::Zero(N, N);
    for (int i = 0; i < N; i++) {
        int group = std::min((i * 10) / N, 9);
        D(i, i) = discreteVals[group];
    }
    Matrix H = randomHaarMatrix(N);
    Matrix M = H * D * H.transpose();

    int index = 0;
    for (int k = 1; k <= N; k++) {
        Matrix M_corner = M.topLeftCorner(k, k);
        Eigen::SelfAdjointEigenSolver<Matrix> solver(M_corner);
        if (solver.info() != Eigen::Success) {
            for (int j = 0; j < k; j++) {
                cornerEigenData[index++] = k;
                cornerEigenData[index++] = 0.0;
            }
            continue;
        }
        Eigen::VectorXd eigs = solver.eigenvalues();
        std::vector<double> eigs_vec(eigs.data(), eigs.data() + k);
        std::sort(eigs_vec.begin(), eigs_vec.end());
        std::reverse(eigs_vec.begin(), eigs_vec.end());
        for (int j = 0; j < k; j++) {
            cornerEigenData[index++] = static_cast<double>(k);
            cornerEigenData[index++] = eigs_vec[j];
        }
    }
    printf("computeCornerEigenvaluesDiscrete: pointer=%p, numElements=%d, totalBytes=%d\n",
           cornerEigenData.data(), 2 * totalPoints, 2 * totalPoints * (int)sizeof(double));
    fflush(stdout);
    return cornerEigenData.data();
}

// Dummy main function required for Emscripten.
int main() {
    return 0;
}
