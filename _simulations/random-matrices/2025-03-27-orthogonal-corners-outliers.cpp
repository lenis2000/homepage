/*
Compiles into a WebAssembly module that computes the eigenvalues of successive corners
of three types of random matrices (all size N):
1) "GUE" (actually a real-symmetric Wigner matrix) with up to 5 outliers on the diagonal.
2) A 10-point atomic diagonal distribution, Haar-conjugated, with up to 5 outliers on the last diagonal entries.
3) A truly complex Hermitian GUE plus a rank-5 diagonal perturbation U D U^\dagger.

To compile with Emscripten (and Eigen 3.x), something like:

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

static const int MAX_N = 300; // Maximum matrix size we support
static std::vector<double> cornerEigenData; // global buffer for corner eigenvalues

// A small helper for normal(0,1) random
static double randn() {
    static std::mt19937 rng(42);
    static std::normal_distribution<double> dist(0.0, 1.0);
    return dist(rng);
}

/**
 * Return a random real-symmetric Wigner matrix (like GOE) of size N,
 * with each (i<j) entry ~ Normal(0,1/sqrt(N)) and diagonal ~ Normal(0,1/sqrt(N)).
 */
Eigen::MatrixXd randomRealWigner(int N) {
    Eigen::MatrixXd A(N, N);
    double scale = 1.0 / std::sqrt((double)N);
    for (int i = 0; i < N; i++) {
        for (int j = i; j < N; j++) {
            double val = randn() * scale;
            A(i, j) = val;
            A(j, i) = val;
        }
    }
    return A;
}

/**
 * Return a random complex Hermitian GUE matrix of size N,
 * each off-diagonal ~ complex Normal(0,1/2) so that Re and Im each ~ Normal(0,1/(2*sqrt(N))).
 * We scale by 1/sqrt(N). Diagonal is purely real normal(0,1/sqrt(N)).
 */
Eigen::MatrixXcd randomComplexGUE(int N) {
    using namespace std::complex_literals;
    Eigen::MatrixXcd G(N, N);
    double scale = 1.0 / std::sqrt((double)N);
    for (int i = 0; i < N; i++) {
        // diagonal is real
        double diagReal = randn() * scale;
        G(i, i) = std::complex<double>(diagReal, 0.0);
        for (int j = i+1; j < N; j++) {
            double re = randn() * scale / std::sqrt(2.0); // factor 1/sqrt(2)
            double im = randn() * scale / std::sqrt(2.0);
            // Hermitian means M(i,j) = conj(M(j,i))
            G(i, j) = std::complex<double>(re, im);
            G(j, i) = std::complex<double>(re, -im);
        }
    }
    return G;
}

/**
 * Return a random real Haar orthogonal matrix (N x N).
 */
Eigen::MatrixXd randomHaarOrthogonal(int N) {
    // Generate random N x N with i.i.d. N(0,1)
    Eigen::MatrixXd X(N, N);
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            X(i, j) = randn();
        }
    }
    // QR factorization
    Eigen::HouseholderQR<Eigen::MatrixXd> qr(X);
    Eigen::MatrixXd Q = qr.householderQ() * Eigen::MatrixXd::Identity(N, N);
    // Fix sign of R's diagonal
    Eigen::MatrixXd R = qr.matrixQR().triangularView<Eigen::Upper>();
    for (int i = 0; i < N; i++) {
        if (R(i, i) < 0) {
            Q.col(i) = -Q.col(i);
        }
    }
    return Q;
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
    // BDCSVD can handle larger matrices efficiently, or JacobiSVD might suffice for smaller N
    Eigen::BDCSVD<Eigen::MatrixXcd> svd(X, Eigen::ComputeThinU | Eigen::ComputeThinV);
    return svd.matrixU();
}


/**
 * Fill the global cornerEigenData with the corner eigenvalues from matrix M (which must be NxN hermitian).
 * We call SelfAdjointEigenSolver on each top-left k x k corner, sorted descending.
 * Return cornerEigenData.data().
 */
template<typename MatrixType>
double* fillCornerEigenDataHermitian(const MatrixType& M, int N)
{
    int maxTotalPoints = MAX_N*(MAX_N+1)/2;
    if (cornerEigenData.capacity() < 2*maxTotalPoints) {
        cornerEigenData.reserve(2*maxTotalPoints);
    }
    cornerEigenData.resize(2*maxTotalPoints);

    int index = 0;
    for (int k = 1; k <= N; k++) {
        auto corner = M.block(0, 0, k, k);
        Eigen::SelfAdjointEigenSolver<MatrixType> solver(corner);
        if (solver.info() != Eigen::Success) {
            for (int j = 0; j < k; j++) {
                cornerEigenData[index++] = (double)k;
                cornerEigenData[index++] = 0.0;
            }
            continue;
        }
        Eigen::VectorXd vals = solver.eigenvalues();
        std::vector<double> eigs(vals.data(), vals.data() + k);
        std::sort(eigs.begin(), eigs.end());
        std::reverse(eigs.begin(), eigs.end());
        for (int j = 0; j < k; j++) {
            cornerEigenData[index++] = (double)k;
            cornerEigenData[index++] = eigs[j];
        }
    }
    return cornerEigenData.data();
}


extern "C" {

/**
 * 1) "GUE" outliers (really real-symmetric Wigner),
 *    plus up to 5 outlier diagonals in the first 5 diagonal entries.
 */
EMSCRIPTEN_KEEPALIVE
double* computeCornerEigenvaluesGUEOutliers(int N, double* outliers) {
    // Build random real-symmetric "GUE"
    Eigen::MatrixXd G = randomRealWigner(N);

    // Overwrite first 5 diagonal entries with outliers
    for (int i = 0; i < 5 && i < N; i++) {
        G(i, i) = outliers[i];
    }
    return fillCornerEigenDataHermitian(G, N);
}

/**
 * 2) 10-point atomic distribution, plus up to 5 outlier diagonals in the LAST 5 diagonal entries,
 *    then conjugate by a random Haar orthogonal matrix.
 */
EMSCRIPTEN_KEEPALIVE
double* computeCornerEigenvaluesDiscreteOutliers(int N, double* discreteVals, double* outliers) {
    // Build diagonal D of size N x N
    Eigen::MatrixXd D = Eigen::MatrixXd::Zero(N, N);
    for (int i = 0; i < N; i++) {
        int group = std::min((i * 10) / N, 9);
        D(i, i) = discreteVals[group];
    }
    // Overwrite last 5 diagonal entries with outliers
    for (int i = 0; i < 5 && i < N; i++) {
        int idx = N - 1 - i;
        D(idx, idx) = outliers[i];
    }
    // Conjugate by random Haar
    Eigen::MatrixXd Q = randomHaarOrthogonal(N);
    Eigen::MatrixXd M = Q * D * Q.transpose();
    return fillCornerEigenDataHermitian(M, N);
}

/**
 * 3) "Rotated GUE": Generate a truly complex Hermitian G,
 *    plus rank-5 diagonal outliers D. Then form M = G + U D U^dagger,
 *    and compute corner eigenvalues.
 *
 *    - G is NxN complex Hermitian (classic GUE).
 *    - D is NxN diagonal with outliers in first 5 entries.
 *    - U is a random NxN unitary from SVD of a random complex matrix.
 */
EMSCRIPTEN_KEEPALIVE
double* computeCornerEigenvaluesRotatedGUE(int N, double* outliers) {
    // Build complex GUE
    Eigen::MatrixXcd G = randomComplexGUE(N);

    // Build diagonal outlier matrix D
    Eigen::MatrixXcd D = Eigen::MatrixXcd::Zero(N, N);
    for (int i = 0; i < 5 && i < N; i++) {
        D(i, i) = std::complex<double>(outliers[i], 0.0);
    }

    // Build random unitary U
    Eigen::MatrixXcd U = randomUnitary(N);

    // M = G + U D U^dagger
    Eigen::MatrixXcd M = G + U * D * U.adjoint();

    // For corners, we do a self-adjoint solver of M(0:k, 0:k).
    // We'll write a specialized version for complex Hermitian:
    int maxTotalPoints = MAX_N*(MAX_N+1)/2;
    if (cornerEigenData.capacity() < 2*maxTotalPoints) {
        cornerEigenData.reserve(2*maxTotalPoints);
    }
    cornerEigenData.resize(2*maxTotalPoints);

    int index = 0;
    for (int k = 1; k <= N; k++) {
        // top-left corner
        Eigen::MatrixXcd corner = M.block(0, 0, k, k);
        Eigen::SelfAdjointEigenSolver<Eigen::MatrixXcd> solver(corner);
        if (solver.info() != Eigen::Success) {
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
        for (int j = 0; j < k; j++) {
            cornerEigenData[index++] = (double)k;
            cornerEigenData[index++] = eigs[j];
        }
    }
    return cornerEigenData.data();
}

} // extern "C"

int main() {
    return 0;
}
