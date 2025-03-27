/*
Compiles into a WebAssembly module that computes the eigenvalues of successive
corners of three types of complex Hermitian random matrices (size N):

1) "GUE" + up to 5 diagonal outliers in the first 5 diagonal entries.
2) A 10-point atomic diagonal distribution, plus up to 5 outliers in the last 5
   diagonal entries, all conjugated by a random complex unitary.
3) "Rotated GUE": a random complex Hermitian GUE plus a rank-5 diagonal
   outlier matrix, rotated by a random unitary ( M = G + U D U^\dagger ).

To compile with Emscripten (and Eigen 3.x), for example:

emcc 2025-03-27-orthogonal-corners-outliers.cpp -o 2025-03-27-orthogonal-corners-outliers.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=['_computeCornerEigenvaluesGUEOutliers','_computeCornerEigenvaluesDiscreteOutliers','_computeCornerEigenvaluesRotatedGUE','_malloc','_free']" \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_MEMORY=268435456 \
    -s TOTAL_STACK=33554432 \
    -O3 \
    -s ASSERTIONS=1 \
    -I ../../eigen-3.4-rc1 \
    -s SINGLE_FILE=1 \
    && mv 2025-03-27-orthogonal-corners-outliers.js ../../js/

*/

#include <emscripten/emscripten.h>
#include <Eigen/Dense>
#include <Eigen/QR>
#include <Eigen/SVD>
#include <complex>
#include <random>
#include <vector>
#include <algorithm>
#include <cmath>
#include <cstdio>

static const int MAX_N = 500; // To handle up to N=500
static std::vector<double> cornerEigenData; // global buffer for corner eigenvalues

// A small helper for normal(0,1) random
static double randn() {
    static std::mt19937 rng(42);
    static std::normal_distribution<double> dist(0.0, 1.0);
    return dist(rng);
}

/**
 * Return a random complex Hermitian GUE matrix of size N,
 * where each off-diagonal entry is complex with real and imaginary parts ~ N(0, 1/(2 sqrt(N))).
 * Diagonal is real ~ N(0,1/sqrt(N)).
 */
Eigen::MatrixXcd randomComplexGUE(int N) {
    using namespace std::complex_literals;
    Eigen::MatrixXcd G(N, N);
    double scale = 1.0 / std::sqrt((double)N);
    for (int i = 0; i < N; i++) {
        // diagonal is real
        double diagReal = randn() * scale;
        G(i, i) = std::complex<double>(diagReal, 0.0);
        for (int j = i + 1; j < N; j++) {
            double re = randn() * scale / std::sqrt(2.0);
            double im = randn() * scale / std::sqrt(2.0);
            G(i, j) = std::complex<double>(re, im);
            G(j, i) = std::complex<double>(re, -im); // Hermitian
        }
    }
    return G;
}

/**
 * Return a random complex unitary (N x N).
 * We do SVD of a random complex matrix X = U * S * V^*, then return U.
 */
Eigen::MatrixXcd randomUnitary(int N) {
    Eigen::MatrixXcd X(N, N);
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            double re = randn();
            double im = randn();
            X(i, j) = std::complex<double>(re, im);
        }
    }
    // SVD
    Eigen::BDCSVD<Eigen::MatrixXcd> svd(X, Eigen::ComputeThinU | Eigen::ComputeThinV);
    return svd.matrixU();
}

/**
 * Fill the global cornerEigenData with the corner eigenvalues from M (N x N),
 * which must be Hermitian. For each top-left k x k corner, we compute all eigenvalues
 * (SelfAdjointEigenSolver) sorted descending, then store (k, eigenvalue) in the buffer.
 *
 * Returns pointer to cornerEigenData.data() for usage in JS.
 */
double* fillCornerEigenDataHermitian(const Eigen::MatrixXcd& M, int N)
{
    // total corner-eigenvalue pairs = N*(N+1)/2
    int totalSize = N*(N+1)/2;
    cornerEigenData.resize(2 * totalSize);

    int index = 0;
    for (int k = 1; k <= N; k++) {
        // top-left corner: M(0:k,0:k)
        Eigen::MatrixXcd corner = M.block(0, 0, k, k);
        // Solve
        Eigen::SelfAdjointEigenSolver<Eigen::MatrixXcd> solver(corner);
        if (solver.info() != Eigen::Success) {
            // fallback: fill with zeros
            for (int j = 0; j < k; j++) {
                cornerEigenData[index++] = (double)k;
                cornerEigenData[index++] = 0.0;
            }
            continue;
        }
        // sort descending
        Eigen::VectorXd vals = solver.eigenvalues();
        std::vector<double> eigs(vals.data(), vals.data() + k);
        std::sort(eigs.begin(), eigs.end());
        std::reverse(eigs.begin(), eigs.end());
        // store
        for (int j = 0; j < k; j++) {
            cornerEigenData[index++] = (double)k;
            cornerEigenData[index++] = eigs[j];
        }
    }
    return cornerEigenData.data();
}

extern "C" {

/**
 * (1) GUE + up to 5 diagonal outliers in the first 5 diagonal entries.
 */
EMSCRIPTEN_KEEPALIVE
double* computeCornerEigenvaluesGUEOutliers(int N, double* outliers) {
    // Build random complex GUE
    Eigen::MatrixXcd G = randomComplexGUE(N);

    // Overwrite the first 5 diagonal entries with user outliers
    for (int i = 0; i < 5 && i < N; i++) {
        G(i, i) = std::complex<double>(outliers[i], 0.0);
    }
    return fillCornerEigenDataHermitian(G, N);
}

/**
 * (2) 10-point atomic distribution, plus up to 5 outliers in the LAST 5 diagonal entries,
 * then conjugate by a random complex unitary.
 * The array discreteVals has 10 sorted distinct values for the 10 “atoms.”
 */
EMSCRIPTEN_KEEPALIVE
double* computeCornerEigenvaluesDiscreteOutliers(int N, double* discreteVals, double* outliers) {
    // Build diagonal D of size N x N:
    // Each index i belongs to one of 10 "atoms" depending on i/N partition.
    // discreteVals[0..9] are sorted distinct values.
    Eigen::MatrixXcd D = Eigen::MatrixXcd::Zero(N, N);
    for (int i = 0; i < N; i++) {
        int group = std::min((i * 10) / N, 9);
        D(i, i) = std::complex<double>(discreteVals[group], 0.0);
    }

    // Overwrite last 5 diagonal entries with outliers
    for (int i = 0; i < 5 && i < N; i++) {
        int idx = N - 1 - i;
        D(idx, idx) = std::complex<double>(outliers[i], 0.0);
    }

    // Conjugate by a random complex unitary
    Eigen::MatrixXcd U = randomUnitary(N);
    Eigen::MatrixXcd M = U * D * U.adjoint();

    return fillCornerEigenDataHermitian(M, N);
}

/**
 * (3) Rotated GUE: M = G + U D U^dagger,
 * where G is random complex Hermitian,
 * D is diagonal with outliers in the first 5 positions,
 * U is a random complex unitary.
 */
EMSCRIPTEN_KEEPALIVE
double* computeCornerEigenvaluesRotatedGUE(int N, double* outliers) {
    // 1) Build random GUE
    Eigen::MatrixXcd G = randomComplexGUE(N);

    // 2) Build diagonal outlier matrix D
    Eigen::MatrixXcd D = Eigen::MatrixXcd::Zero(N, N);
    for (int i = 0; i < 5 && i < N; i++) {
        D(i, i) = std::complex<double>(outliers[i], 0.0);
    }

    // 3) Random unitary U
    Eigen::MatrixXcd U = randomUnitary(N);

    // 4) M = G + UDU^*
    Eigen::MatrixXcd M = G + U * D * U.adjoint();

    // Now compute corner eigenvalues
    return fillCornerEigenDataHermitian(M, N);
}

} // extern "C"

int main() {
    // Not used in the browser environment, but needed for a valid C++ entry point
    return 0;
}
