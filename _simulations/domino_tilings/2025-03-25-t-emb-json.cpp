/*
  2025-03-25-t-emb-json.cpp

  This file computes the T- and O-arrays needed for the T-embedding of
  the Aztec diamond graph of order n. It then outputs a JSON with the
  vertex positions in the complex plane (real and imaginary parts) for
  each valid (k, j) with |k| + |j| <= n.

  Compile to JavaScript/WASM with Emscripten, for example:

    emcc 2025-03-25-t-emb-json.cpp -o 2025-03-25-t-emb-json.js \
     -s WASM=1 \
     -s ASYNCIFY=1 \
     -s "EXPORTED_FUNCTIONS=['_doTembJSON','_freeString']" \
     -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
     -s ALLOW_MEMORY_GROWTH=1 \
     -s INITIAL_MEMORY=64MB \
     -s ENVIRONMENT=web \
     -s SINGLE_FILE=1 \
     -O3 -ffast-math
*/

#include <emscripten.h>
#include <cmath>
#include <complex>
#include <vector>
#include <string>
#include <sstream>
#include <iomanip>
#include <iostream>
#include <cstdlib>
#include <cstring>

static const int bign = 111;
static const double a = 1.0;

// Storage for Tarray and Oarray
static std::vector<std::vector<std::vector<std::complex<double>>>> Tarray;
static std::vector<std::vector<std::vector<std::complex<double>>>> Oarray;

// alpha(n)
static inline std::complex<double> alpha(int n) {
    if ((n % 2) == 1) return {1.0, 0.0};
    if ((n % 4) == 2) return {a * a, 0.0};
    return {1.0 / (a * a), 0.0};
}

// beta(j, n)
static inline std::complex<double> betaVal(int j, int n) {
    if ((n % 2) == 1) return {1.0, 0.0};
    if ((n % 4) == 0 && (j % 2) == 0) return {a * a, 0.0};
    if ((n % 4) == 2 && (j % 2) == 1) return {a * a, 0.0};
    if ((n % 4) == 0 && (j % 2) == 1) return {1.0 / (a * a), 0.0};
    // (n % 4) == 2 && (j % 2) == 0
    return {1.0 / (a * a), 0.0};
}

// gammaVal(j, k, n)
static inline std::complex<double> gammaVal(int j, int k, int n) {
    if ((n % 2) == 0) return {1.0, 0.0};
    if ((n % 4) == 3 && (j % 2) == 0 && (k % 2) == 0) return {a * a, 0.0};
    if ((n % 4) == 1 && (j % 2) == 1 && (k % 2) == 1) return {a * a, 0.0};
    if ((n % 4) == 3 && (j % 2) == 1 && (k % 2) == 1) return {1.0 / (a * a), 0.0};
    // (n % 4) == 1 && (j % 2) == 0 && (k % 2) == 0
    return {1.0 / (a * a), 0.0};
}

// Build the Tarray/Oarray tables if not already built
static void buildArraysIfNeeded() {
    if (!Tarray.empty() && !Oarray.empty()) return; // already built

    // Allocate
    Tarray.resize(bign + 1, std::vector<std::vector<std::complex<double>>>(2*bign + 1,
                 std::vector<std::complex<double>>(2*bign + 1, {0.0, 0.0})));
    Oarray.resize(bign + 1, std::vector<std::vector<std::complex<double>>>(2*bign + 1,
                 std::vector<std::complex<double>>(2*bign + 1, {0.0, 0.0})));

    // Initialization
    for (int n = 1; n <= bign; n++) {
        Tarray[n][(-n+bign)][(0+bign)] = {-1.0, 0.0};
        Tarray[n][( n+bign)][(0+bign)] = { 1.0, 0.0};
        Tarray[n][(0+bign)][(-n+bign)] = { 0.0,  a};
        Tarray[n][(0+bign)][( n+bign)] = { 0.0, -a};

        Oarray[n][(-n+bign)][(0+bign)] = {1.0, 0.0};
        Oarray[n][( n+bign)][(0+bign)] = {1.0, 0.0};
        Oarray[n][(0+bign)][(-n+bign)] = {0.0, a};
        Oarray[n][(0+bign)][( n+bign)] = {0.0, a};
    }

    // Recurrence to fill Tarray and Oarray from n=1 to n=bign
    for (int n = 1; n < bign; n++) {
        //=============================================
        // Pass 1 for Tarray
        for (int k = -n; k <= n; k++) {
            for (int j = -n; j <= n; j++) {
                if (std::abs(k) + std::abs(j) <= n) {
                    // boundary increments
                    if (j == -n && k == 0) {
                        Tarray[n+1][j+bign][k+bign] =
                          (Tarray[n][(-n+bign)][(0+bign)] + alpha(n)*Tarray[n][(-n+1+bign)][(0+bign)])
                          / (std::complex<double>(1.0,0.0) + alpha(n));
                    }
                    if (j == n && k == 0) {
                        Tarray[n+1][j+bign][k+bign] =
                          (Tarray[n][(n+bign)][(0+bign)] + alpha(n)*Tarray[n][(n-1+bign)][(0+bign)])
                          / (std::complex<double>(1.0,0.0) + alpha(n));
                    }
                    if (j == 0 && k == -n) {
                        Tarray[n+1][j+bign][k+bign] =
                          (Tarray[n][(0+bign)][(-n+bign)]*alpha(n) + Tarray[n][(0+bign)][(-n+1+bign)])
                          / (std::complex<double>(1.0,0.0) + alpha(n));
                    }
                    if (j == 0 && k == n) {
                        Tarray[n+1][j+bign][k+bign] =
                          (Tarray[n][(0+bign)][(n+bign)]*alpha(n) + Tarray[n][(0+bign)][(n-1+bign)])
                          / (std::complex<double>(1.0,0.0) + alpha(n));
                    }

                    // corners inside boundary
                    if (1 <= j && j <= n-1 && k == (n - j)) {
                        auto bval = betaVal(j, n);
                        Tarray[n+1][j+bign][k+bign] =
                          (Tarray[n][(j-1+bign)][(n-j+bign)] +
                           bval*Tarray[n][(j+bign)][(n-j-1+bign)])
                          / (std::complex<double>(1.0,0.0) + bval);
                    }
                    if (1 <= j && j <= n-1 && k == -n + j) {
                        auto bval = betaVal(j, n);
                        Tarray[n+1][j+bign][k+bign] =
                          (Tarray[n][(j-1+bign)][(-n+j+bign)] +
                           bval*Tarray[n][(j+bign)][(-n+j+1+bign)])
                          / (std::complex<double>(1.0,0.0) + bval);
                    }
                    if ((1-n) <= j && j <= -1 && k == (n + j)) {
                        auto bval = betaVal(j, n);
                        Tarray[n+1][j+bign][k+bign] =
                          (bval*Tarray[n][(j+bign)][(n+j-1+bign)] +
                           Tarray[n][(j+1+bign)][(n+j+bign)])
                          / (std::complex<double>(1.0,0.0) + bval);
                    }
                    if ((1-n) <= j && j <= -1 && k == -n - j) {
                        auto bval = betaVal(j, n);
                        Tarray[n+1][j+bign][k+bign] =
                          (bval*Tarray[n][(j+bign)][(-n-j+1+bign)] +
                           Tarray[n][(j+1+bign)][(-n-j+bign)])
                          / (std::complex<double>(1.0,0.0) + bval);
                    }

                    // interior (pass-through)
                    if ((std::abs(j)+std::abs(k) < n) && ((j + k + n) % 2 == 0)) {
                        Tarray[n+1][j+bign][k+bign] = Tarray[n][j+bign][k+bign];
                    }
                }
            }
        }
        // Pass 2 for Tarray
        for (int k = -n; k <= n; k++) {
            for (int j = -n; j <= n; j++) {
                if (std::abs(k)+std::abs(j) <= n) {
                    if ((std::abs(j)+std::abs(k) < n) && ((j + k + n) % 2 == 1)) {
                        auto gm = gammaVal(j, k, n);
                        Tarray[n+1][j+bign][k+bign] =
                            -Tarray[n][j+bign][k+bign]
                            + (Tarray[n+1][(j-1+bign)][(k+bign)]
                               + Tarray[n+1][(j+1+bign)][(k+bign)]
                               + gm*Tarray[n+1][(j+bign)][(k+1+bign)]
                               + gm*Tarray[n+1][(j+bign)][(k-1+bign)])
                            / (std::complex<double>(1.0,0.0) + gm);
                    }
                }
            }
        }

        //=============================================
        // Pass 1 for Oarray
        for (int k = -n; k <= n; k++) {
            for (int j = -n; j <= n; j++) {
                if (std::abs(k)+std::abs(j) <= n) {
                    // boundary increments
                    if (j == -n && k == 0) {
                        Oarray[n+1][j+bign][k+bign] =
                          (Oarray[n][(-n+bign)][(0+bign)] + alpha(n)*Oarray[n][(-n+1+bign)][(0+bign)])
                          / (std::complex<double>(1.0,0.0) + alpha(n));
                    }
                    if (j == n && k == 0) {
                        Oarray[n+1][j+bign][k+bign] =
                          (Oarray[n][(n+bign)][(0+bign)] + alpha(n)*Oarray[n][(n-1+bign)][(0+bign)])
                          / (std::complex<double>(1.0,0.0) + alpha(n));
                    }
                    if (j == 0 && k == -n) {
                        Oarray[n+1][j+bign][k+bign] =
                          (Oarray[n][(0+bign)][(-n+bign)]*alpha(n) + Oarray[n][(0+bign)][(-n+1+bign)])
                          / (std::complex<double>(1.0,0.0) + alpha(n));
                    }
                    if (j == 0 && k == n) {
                        Oarray[n+1][j+bign][k+bign] =
                          (Oarray[n][(0+bign)][(n+bign)]*alpha(n) + Oarray[n][(0+bign)][(n-1+bign)])
                          / (std::complex<double>(1.0,0.0) + alpha(n));
                    }

                    // corners inside boundary
                    if (1 <= j && j <= n-1 && k == (n - j)) {
                        auto bval = betaVal(j, n);
                        Oarray[n+1][j+bign][k+bign] =
                          (Oarray[n][(j-1+bign)][(n-j+bign)] +
                           bval*Oarray[n][(j+bign)][(n-j-1+bign)])
                          / (std::complex<double>(1.0,0.0) + bval);
                    }
                    if (1 <= j && j <= n-1 && k == -n + j) {
                        auto bval = betaVal(j, n);
                        Oarray[n+1][j+bign][k+bign] =
                          (Oarray[n][(j-1+bign)][(-n+j+bign)] +
                           bval*Oarray[n][(j+bign)][(-n+j+1+bign)])
                          / (std::complex<double>(1.0,0.0) + bval);
                    }
                    if ((1-n) <= j && j <= -1 && k == (n + j)) {
                        auto bval = betaVal(j, n);
                        Oarray[n+1][j+bign][k+bign] =
                          (bval*Oarray[n][(j+bign)][(n+j-1+bign)] +
                           Oarray[n][(j+1+bign)][(n+j+bign)])
                          / (std::complex<double>(1.0,0.0) + bval);
                    }
                    if ((1-n) <= j && j <= -1 && k == -n - j) {
                        auto bval = betaVal(j, n);
                        Oarray[n+1][j+bign][k+bign] =
                          (bval*Oarray[n][(j+bign)][(-n-j+1+bign)] +
                           Oarray[n][(j+1+bign)][(-n-j+bign)])
                          / (std::complex<double>(1.0,0.0) + bval);
                    }

                    // interior (pass-through)
                    if ((std::abs(j)+std::abs(k) < n) && ((j + k + n) % 2 == 0)) {
                        Oarray[n+1][j+bign][k+bign] = Oarray[n][j+bign][k+bign];
                    }
                }
            }
        }
        // Pass 2 for Oarray
        for (int k = -n; k <= n; k++) {
            for (int j = -n; j <= n; j++) {
                if (std::abs(k)+std::abs(j) <= n) {
                    if ((std::abs(j)+std::abs(k) < n) && ((j + k + n) % 2 == 1)) {
                        auto gm = gammaVal(j, k, n);
                        Oarray[n+1][j+bign][k+bign] =
                            -Oarray[n][j+bign][k+bign]
                            + (Oarray[n+1][(j-1+bign)][(k+bign)]
                               + Oarray[n+1][(j+1+bign)][(k+bign)]
                               + gm*Oarray[n+1][(j+bign)][(k+1+bign)]
                               + gm*Oarray[n+1][(j+bign)][(k-1+bign)])
                            / (std::complex<double>(1.0,0.0) + gm);
                    }
                }
            }
        }
    }
}

extern "C" {

/*
  doTembJSON(n):
    Builds Tarray and Oarray up to n (1 <= n <= bign),
    then returns a JSON string with structure:

    {
      "T": [
         { "k": k, "j": j, "re": Re(T_kj), "im": Im(T_kj) },
         ...
      ],
      "O": [
         { "k": k, "j": j, "re": Re(O_kj), "im": Im(O_kj) },
         ...
      ]
    }

    where (k,j) runs over all integer pairs with |k|+|j| <= n.
*/
EMSCRIPTEN_KEEPALIVE
char* doTembJSON(int n) {
    buildArraysIfNeeded();
    if (n < 1) n = 1;
    if (n > bign) n = bign;

    std::ostringstream oss;
    oss << "{";

    // T array
    oss << "\"T\":[";
    bool firstT = true;
    for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
            if (std::abs(k) + std::abs(j) <= n) {
                if (!firstT) oss << ",";
                firstT = false;
                double re = Tarray[n][k+bign][j+bign].real();
                double im = Tarray[n][k+bign][j+bign].imag();
                oss << "{\"k\":" << k
                    << ",\"j\":" << j
                    << ",\"re\":" << std::fixed << std::setprecision(15) << re
                    << ",\"im\":" << std::fixed << std::setprecision(15) << im
                    << "}";
            }
        }
    }
    oss << "],";

    // O array
    oss << "\"O\":[";
    bool firstO = true;
    for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
            if (std::abs(k) + std::abs(j) <= n) {
                if (!firstO) oss << ",";
                firstO = false;
                double re = Oarray[n][k+bign][j+bign].real();
                double im = Oarray[n][k+bign][j+bign].imag();
                oss << "{\"k\":" << k
                    << ",\"j\":" << j
                    << ",\"re\":" << std::fixed << std::setprecision(15) << re
                    << ",\"im\":" << std::fixed << std::setprecision(15) << im
                    << "}";
            }
        }
    }
    oss << "]}";

    // Convert to C string
    std::string outStr = oss.str();
    char* out = (char*)std::malloc(outStr.size() + 1);
    std::strcpy(out, outStr.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    std::free(str);
}

} // extern "C"
