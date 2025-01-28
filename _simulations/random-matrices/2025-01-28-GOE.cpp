#include <emscripten/emscripten.h>
#include <Eigen/Dense>
#include <vector>
#include <random>
#include <cmath>

using Matrix = Eigen::MatrixXd;

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
    // Generate GOE matrix
    Matrix A = Matrix::Zero(N, N);
    double scale = 1.0 / std::sqrt(N);

    // Fill matrix
    for (int i = 0; i < N; i++) {
        for (int j = i; j < N; j++) {
            double value = randn() * scale;
            A(i, j) = value;
            A(j, i) = value;
        }
    }

    // Compute eigenvalues
    Eigen::SelfAdjointEigenSolver<Matrix> solver(A);
    if (solver.info() != Eigen::Success) {
        return nullptr;
    }

    // Store eigenvalues in a static vector
    static std::vector<double> eigenvalues;
    eigenvalues.resize(N);
    std::copy(solver.eigenvalues().data(),
              solver.eigenvalues().data() + N,
              eigenvalues.data());

    return eigenvalues.data();
}

// Required dummy main function
int main() {
    return 0;
}
