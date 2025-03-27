/*
Compiles into a WebAssembly module that computes the eigenvalues of successive corners of:
  1) A random Gaussian (GUE-style) Hermitian matrix (for simplicity we’ll still generate a real symmetric matrix, matching the code structure).
  2) A matrix with a prescribed 10-point atomic spectrum.
  3) A matrix with the same 10-point atomic spectrum but also up to 5 outliers (here, all set to 0).

To compile (assuming Emscripten and Eigen are installed and available), run something like:

emcc 2025-03-27-orthogonal-corners-outliers.cpp -o 2025-03-27-orthogonal-corners-outliers.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_computeCornerEigenvalues','_computeCornerEigenvaluesDiscrete','_computeCornerEigenvaluesDiscreteOutliers','_malloc','_free']" \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_MEMORY=268435456 \
    -s TOTAL_STACK=33554432 \
    -O3 \
    -s ASSERTIONS=1 \
    -I ../../eigen-3.4-rc1 \
    -s SINGLE_FILE=1 \
    && mv 2025-03-27-orthogonal-corners-outliers.js ../../js/

This will produce a single-file JS+Wasm. Then move the generated .js file to the desired folder, e.g. /js/.
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
static const int MAX_N = 300;  // Maximum allowed N

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Generate a random number from a normal distribution (fixed seed for reproducibility).
EMSCRIPTEN_KEEPALIVE
extern "C" double randn() {
    static std::mt19937 rng(42);
    static std::normal_distribution<double> dist(0.0, 1.0);
    return dist(rng);
}

// Generate a random Haar orthogonal matrix of size N (real orthogonal version).
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

// ---------------------------------------------------------------------
// 1) computeCornerEigenvalues: random symmetric Gaussian matrix (GUE-style, but real-symmetric).
// ---------------------------------------------------------------------

// Compute eigenvalues for successive corners of a Wigner-like N×N random Gaussian matrix.
// The code normalizes by 1/sqrt(N). Fills cornerEigenData with 2*(N*(N+1)/2) doubles:
// [ (k, λ_{k,1}), (k, λ_{k,2}), ..., (k, λ_{k,k}) ] for k=1..N,
// where λ_{k,1} >= λ_{k,2} >= ... >= λ_{k,k} are the k eigenvalues of the top-left k×k corner.
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeCornerEigenvalues(int N) {
    // Ensure cornerEigenData is big enough for the maximum N, to keep pointer stable.
    int maxTotalPoints = MAX_N * (MAX_N + 1) / 2;
    if (cornerEigenData.capacity() < 2 * maxTotalPoints)
        cornerEigenData.reserve(2 * maxTotalPoints);
    cornerEigenData.resize(2 * maxTotalPoints);

    int totalPoints = N * (N + 1) / 2;

    // Create a random symmetric matrix with variance ~ 1/N.
    Matrix A = Matrix::Zero(N, N);
    double scale = 1.0 / std::sqrt((double)N);
    for (int i = 0; i < N; i++) {
        for (int j = i; j < N; j++) {
            double value = randn() * scale;
            A(i, j) = value;
            A(j, i) = value;
        }
    }

    // For each corner size k, compute eigenvalues and sort descending.
    int index = 0;
    for (int k = 1; k <= N; k++) {
        Matrix A_corner = A.topLeftCorner(k, k);
        Eigen::SelfAdjointEigenSolver<Matrix> solver(A_corner);
        if (solver.info() != Eigen::Success) {
            // If solver fails, fill with zeros
            for (int j = 0; j < k; j++) {
                cornerEigenData[index++] = (double)k;
                cornerEigenData[index++] = 0.0;
            }
            continue;
        }
        Eigen::VectorXd eigs = solver.eigenvalues();
        std::vector<double> eigs_vec(eigs.data(), eigs.data() + k);
        std::sort(eigs_vec.begin(), eigs_vec.end());
        std::reverse(eigs_vec.begin(), eigs_vec.end());
        for (int j = 0; j < k; j++) {
            cornerEigenData[index++] = (double)k;
            cornerEigenData[index++] = eigs_vec[j];
        }
    }

    return cornerEigenData.data();
}

// ---------------------------------------------------------------------
// 2) computeCornerEigenvaluesDiscrete: random orthogonal conjugation of a diagonal with 10 distinct values.
// ---------------------------------------------------------------------

// Compute eigenvalues for successive corners of M = H * D * H^T, where D is diagonal
// with 10 distinct values repeated proportionally to their index among N.
// (Group = floor((i*10)/N), i=0..N-1).
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeCornerEigenvaluesDiscrete(int N, double* discreteVals) {
    // Ensure cornerEigenData is big enough for the maximum N.
    int maxTotalPoints = MAX_N * (MAX_N + 1) / 2;
    if (cornerEigenData.capacity() < 2 * maxTotalPoints)
        cornerEigenData.reserve(2 * maxTotalPoints);
    cornerEigenData.resize(2 * maxTotalPoints);

    Matrix D = Matrix::Zero(N, N);
    for (int i = 0; i < N; i++) {
        // group goes from 0..9
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
                cornerEigenData[index++] = (double)k;
                cornerEigenData[index++] = 0.0;
            }
            continue;
        }
        Eigen::VectorXd eigs = solver.eigenvalues();
        std::vector<double> eigs_vec(eigs.data(), eigs.data() + k);
        std::sort(eigs_vec.begin(), eigs_vec.end());
        std::reverse(eigs_vec.begin(), eigs_vec.end());
        for (int j = 0; j < k; j++) {
            cornerEigenData[index++] = (double)k;
            cornerEigenData[index++] = eigs_vec[j];
        }
    }

    return cornerEigenData.data();
}

// ---------------------------------------------------------------------
// 3) computeCornerEigenvaluesDiscreteOutliers: same as above, but add up to 5 outliers (fixed = 0).
// ---------------------------------------------------------------------

// Compute eigenvalues for a matrix M = H * D * H^T, where
//   - The first up to 5 diagonal entries are outliers (value = 0 here).
//   - The remaining diagonal entries are assigned among the 10 discreteVals groups.
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeCornerEigenvaluesDiscreteOutliers(int N, double* discreteVals) {
    // Ensure cornerEigenData is big enough for the maximum N.
    int maxTotalPoints = MAX_N * (MAX_N + 1) / 2;
    if (cornerEigenData.capacity() < 2 * maxTotalPoints)
        cornerEigenData.reserve(2 * maxTotalPoints);
    cornerEigenData.resize(2 * maxTotalPoints);

    // Fill the diagonal with 0 for first 5 outliers (or fewer if N < 5).
    Matrix D = Matrix::Zero(N, N);
    int outlierCount = std::min(5, N);  // up to 5
    // outliers are set to zero, so no need to do anything special here beyond that.

    // Fill the rest of the diagonal according to the 10 discrete values.
    // i runs from outlierCount..(N-1).
    // We skip the first outlierCount positions (already 0) and group the rest among the 10 values.
    for (int i = outlierCount; i < N; i++) {
        // fraction = (i - outlierCount)/(N - outlierCount)
        // group is in 0..9
        int group = std::min(((i - outlierCount) * 10) / (N - outlierCount), 9);
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
                cornerEigenData[index++] = (double)k;
                cornerEigenData[index++] = 0.0;
            }
            continue;
        }
        Eigen::VectorXd eigs = solver.eigenvalues();
        std::vector<double> eigs_vec(eigs.data(), eigs.data() + k);
        std::sort(eigs_vec.begin(), eigs_vec.end());
        std::reverse(eigs_vec.begin(), eigs_vec.end());
        for (int j = 0; j < k; j++) {
            cornerEigenData[index++] = (double)k;
            cornerEigenData[index++] = eigs_vec[j];
        }
    }

    return cornerEigenData.data();
}

// Dummy main for Emscripten
int main() {
    return 0;
}
