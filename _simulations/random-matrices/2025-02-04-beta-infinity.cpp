//------------------------------------------------------------
// 2025-02-04-beta-infinity.cpp
//
// This file (compiled via Emscripten) computes the roots of
// successive derivatives of the characteristic polynomial f(z)
// of an n×n diagonal matrix D.
//
// The diagonal matrix D is defined via a discrete spectrum:
// The user supplies an array of 10 double values (discreteVals),
// and for i = 0,…, n–1 the diagonal entry is set to:
//      d[i] = discreteVals[ min((i*10)/n, 9) ].
//
// Then the characteristic polynomial is
//      f(z) = ∏ (z – d[i]).
// For k = 1,…, n–1, we compute the k-th derivative polynomial f^(k)(z)
// (after normalizing it to be monic) and then compute its roots using
// the companion matrix method.
// (Recall: if a monic polynomial has degree m, then its derivative is
// monic of degree m–1 and has m–1 roots.)
//
// The computed data (pairs of (degree, root)) are stored in a global
// array. Total points = n(n–1)/2.
//
// NOTES ON NUMERICAL STABILITY:
//   - The recurrence used to build f(z) from its roots is notoriously
//     unstable for large n. In this version we use an out-of-place update
//     (i.e. using a temporary vector) to help mitigate cancellation errors.
//   - The companion matrix method is very sensitive to the scaling of the
//     polynomial coefficients. We now scale the non-leading coefficients
//     appropriately (dividing by scale^i) before constructing the companion
//     matrix. After obtaining the eigenvalues for the rescaled polynomial,
//     we multiply them by the scale factor to recover the original roots.
//   - For extremely high degrees or wildly scaled input values, consider using
//     higher precision or a specialized polynomial-root-finding routine.
//
// Compilation example:
/*
  emcc 2025-02-04-beta-infinity.cpp -o 2025-02-04-beta-infinity.js \
      -s WASM=1 \
      -s "EXPORTED_FUNCTIONS=['_computeDerivativeRoots','_malloc','_free']" \
      -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
      -s ALLOW_MEMORY_GROWTH=1 \
      -s TOTAL_MEMORY=268435456 \
      -s TOTAL_STACK=33554432 \
      -O3 \
      -s ASSERTIONS=1 \
      -I ../../eigen-3.4-rc1 \
      -s SINGLE_FILE=1 \
      && mv 2025-02-04-beta-infinity.js ../../js
      */
//------------------------------------------------------------

#include <emscripten/emscripten.h>
#include <Eigen/Dense>
#include <Eigen/Eigenvalues>
#include <vector>
#include <algorithm>
#include <cstdio>
#include <cmath>
#include <limits>

using Matrix = Eigen::MatrixXd;

// Global storage for computed derivative–roots data.
// For maximum matrix size N = 300, total number of points = N(N–1)/2.
static std::vector<double> derivativeRootsData;
static int currentN = 0;
static const int MAX_N = 300;

//------------------------------------------------------------
// Compute the polynomial f(z) = ∏ (z – d[i]) given the roots d.
// The polynomial is represented as a vector of coefficients (length = n+1)
// in descending powers: poly[0]*z^n + poly[1]*z^(n-1) + … + poly[n].
// (Since f is monic, poly[0]=1.)
//
// We use an out-of-place update to reduce cancellation errors.
std::vector<double> computePolynomialFromRoots(const std::vector<double>& roots) {
    std::vector<double> poly = { 1.0 };
    for (double r : roots) {
        int m = poly.size();
        std::vector<double> newPoly(m + 1, 0.0);
        newPoly[0] = poly[0]; // highest degree coefficient remains 1.
        for (int j = 1; j < m + 1; j++) {
            double prev = (j < m ? poly[j] : 0.0);
            newPoly[j] = prev - r * poly[j - 1];
        }
        poly = newPoly;
    }
    return poly;
}

//------------------------------------------------------------
// Given a monic polynomial in descending order (poly[0]=1),
// compute its derivative (and then normalize it to be monic).
// If poly represents p(z)= z^m + poly[1]*z^(m-1)+ … + poly[m],
// then p'(z)= m*z^(m–1) + (m–1)*poly[1]*z^(m–2)+ … + poly[m–1].
// Dividing by m normalizes the derivative to be monic.
std::vector<double> derivativePolynomial(const std::vector<double>& poly) {
    int m = poly.size() - 1; // degree of poly.
    if (m == 0) return std::vector<double>(); // constant polynomial.
    std::vector<double> dpoly(m, 0.0);
    dpoly[0] = 1.0;
    for (int i = 1; i < m; i++) {
        dpoly[i] = ((double)(m - i) / m) * poly[i];
    }
    return dpoly;
}

//------------------------------------------------------------
// Compute the roots of a monic polynomial using the companion matrix method.
// The polynomial is given as poly[0]*z^m + poly[1]*z^(m–1) + … + poly[m] (with poly[0]=1).
//
// To improve numerical stability we now scale the non-leading coefficients by
// dividing the i-th coefficient by scale^i (which corresponds to the substitution
// x = scale * y). After computing the eigenvalues for y, we then recover the
// original roots by multiplying by scale.
std::vector<double> computeCompanionRoots(const std::vector<double>& poly) {
    int m = poly.size() - 1;
    std::vector<double> roots;
    if (m <= 0) return roots;

    // Determine scaling factor from non-leading coefficients.
    double scale = 0.0;
    for (int i = 1; i <= m; i++) {
        scale = std::max(scale, std::abs(poly[i]));
    }
    if (scale == 0.0) scale = 1.0;

    // Properly scale coefficients: For term corresponding to x^(m-i), use poly[i]/(scale^i)
    std::vector<double> polyScaled(poly.size(), 0.0);
    polyScaled[0] = 1.0;
    for (int i = 1; i < poly.size(); i++) {
        polyScaled[i] = poly[i] / std::pow(scale, i);
    }

    // Construct the companion matrix for the polynomial in the variable y (with x = scale*y).
    Matrix C = Matrix::Zero(m, m);
    for (int i = 0; i < m - 1; i++) {
        C(i, i+1) = 1.0;
    }
    for (int j = 0; j < m; j++) {
        C(m - 1, j) = - polyScaled[m - j];
    }

    // Solve for the eigenvalues (roots in y).
    Eigen::EigenSolver<Matrix> solver(C);
    if (solver.info() != Eigen::Success) {
        return roots;
    }
    Eigen::VectorXcd eigs = solver.eigenvalues();
    // Convert eigenvalues from y back to x = scale * y.
    for (int i = 0; i < eigs.size(); i++) {
        std::complex<double> z = eigs(i);
        double rootValue = z.real() * scale;
        // Treat nearly real eigenvalues as real.
        if (std::abs(z.imag()) < 1e-8)
            roots.push_back(rootValue);
        else
            roots.push_back(rootValue);  // Alternatively, handle the imaginary part if needed.
    }
    std::sort(roots.begin(), roots.end(), std::greater<double>());
    return roots;
}

//------------------------------------------------------------
// Compute the roots of successive derivatives of the characteristic polynomial f(z)
// of an n×n diagonal matrix D whose diagonal entries d[i] are given by:
//    d[i] = discreteVals[ min((i*10)/N, 9) ], for i = 0,…, n–1.
//
// First, f(z) = ∏ (z – d[i]) is computed.
// Then, for derivative order k = 1,…, N–1, we compute f^(k)(z) (normalized to be monic)
// and compute its roots using the companion matrix method.
// Each set of roots is labeled with the degree of the derivative polynomial (n–k).
// The computed (degree, root) pairs are stored in the global array derivativeRootsData.
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeDerivativeRoots(int N, double* discreteVals) {
    currentN = N;
    int totalPoints = N * (N - 1) / 2;
    derivativeRootsData.resize(2 * totalPoints);
    int index = 0;

    // Use the user–inputted discrete values (lambdas) from the provided array.
    std::vector<double> d(N);
    for (int i = 0; i < N; i++) {
        int group = std::min((i * 10) / N, 9);
        d[i] = discreteVals[group];
    }

    std::vector<double> poly = computePolynomialFromRoots(d);
    std::vector<double> currentPoly = poly;
    for (int k = 1; k < N; k++) {
        currentPoly = derivativePolynomial(currentPoly);
        int degree = currentPoly.size() - 1; // Should equal N–k.
        std::vector<double> roots = computeCompanionRoots(currentPoly);
        for (double r : roots) {
            derivativeRootsData[index++] = degree;  // Label: degree of derivative polynomial.
            derivativeRootsData[index++] = r;
        }
    }

    printf("computeDerivativeRoots: N=%d, totalPoints=%d, pointer=%p, totalBytes=%d\n",
           N, totalPoints, derivativeRootsData.data(),
           (int)(derivativeRootsData.size() * sizeof(double)));
    fflush(stdout);
    return derivativeRootsData.data();
}

// Dummy main required for Emscripten.
int main() {
    return 0;
}
