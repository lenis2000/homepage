
/*
  2025-03-28-t-emb-3d-json.cpp

  This is the same t-embedding generator code as in 2025-03-27-t-emb-a-json.cpp,
  only placed here under a new name. It exports doTembJSONwithA(n, a) which
  returns a JSON string describing T, O, and boundary arrays for an Aztec diamond
  of parameter n, with a doubly periodic weight a.

  Compilation with Emscripten example:


  emcc 2025-03-28-t-emb-3d-json.cpp -o 2025-03-28-t-emb-3d-json.js \
   -s WASM=1 \
   -s ASYNCIFY=1 \
   -s "EXPORTED_FUNCTIONS=['_doTembJSONwithA','_freeString']" \
   -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
   -s ALLOW_MEMORY_GROWTH=1 \
   -s INITIAL_MEMORY=64MB \
   -s ENVIRONMENT=web \
   -s SINGLE_FILE=1 \
   -O3 -ffast-math \
   && mv 2025-03-28-t-emb-3d-json.js ../../js/

  Then load "2025-03-28-t-emb-3d-json.js" in your HTML, and call:

      const ptr = Module.ccall('doTembJSONwithA', 'number', ['number','number'], [n, a]);
      const jsonStr = Module.UTF8ToString(ptr);
      Module.ccall('freeString', null, ['number'], [ptr]);

  The returned JSON has the structure:
    {
      "T": [ {k, j, re, im}, ... ],
      "O": [ {k, j, re, im}, ... ],
      "B": [ {re, im}, ... ]  // boundary points T+O
    }
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

static inline std::complex<double> alphaVal(int m, double a) {
    // if m%2==1 => 1
    // else if m%4==2 => a^2
    // else => 1/(a^2)
    if ((m % 2) == 1) {
        return {1.0, 0.0};
    }
    if ((m % 4) == 2) {
        return {a*a, 0.0};
    }
    return {1.0/(a*a), 0.0};
}

static inline std::complex<double> betaVal(int j, int m, double a) {
    // if m%2==1 => 1
    // else if (m%4==0 && j%2==0) or (m%4==2 && j%2==1) => a^2
    // else => 1/(a^2)
    if ((m % 2) == 1) {
        return {1.0, 0.0};
    }
    bool jEven = ((j % 2) == 0);
    if ((m % 4) == 0 && jEven) {
        return {a*a, 0.0};
    }
    if ((m % 4) == 2 && !jEven) {
        return {a*a, 0.0};
    }
    return {1.0/(a*a), 0.0};
}

static inline std::complex<double> gammaVal(int j, int k, int m, double a) {
    // if m%2==0 => 1
    // else if (m%4==3 && j,k even) or (m%4==1 && j,k odd) => a^2
    // else => 1/(a^2)
    if ((m % 2) == 0) {
        return {1.0, 0.0};
    }
    bool jEven = ((j % 2) == 0);
    bool kEven = ((k % 2) == 0);
    bool bothEven = jEven && kEven;
    bool bothOdd  = (!jEven) && (!kEven);
    if ((m % 4) == 3 && bothEven) {
        return {a*a, 0.0};
    }
    if ((m % 4) == 1 && bothOdd) {
        return {a*a, 0.0};
    }
    return {1.0/(a*a), 0.0};
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* doTembJSONwithA(int n, double a) {
    if (n < 1)  n = 1;
    if (n > 200) n = 200;
    if (a <= 0.0) a = 1.0;

    // 3D arrays: Tarray[m][k+n][j+n], Oarray[m][k+n][j+n]
    std::vector<std::vector<std::vector<std::complex<double>>>> Tarray(
        n+1,
        std::vector<std::vector<std::complex<double>>>(2*n + 1,
          std::vector<std::complex<double>>(2*n + 1, {0,0})
        )
    );
    std::vector<std::vector<std::vector<std::complex<double>>>> Oarray(
        n+1,
        std::vector<std::vector<std::complex<double>>>(2*n + 1,
          std::vector<std::complex<double>>(2*n + 1, {0,0})
        )
    );

    // Initialize boundary conditions for m=1..n
    for (int m = 1; m <= n; m++) {
        // T(-m,0) = -1, T(m,0)=+1, T(0,-m)= i*a, T(0,m)=-i*a
        Tarray[m][(-m + n)][(0 + n)] = std::complex<double>(-1.0, 0.0);
        Tarray[m][( m + n)][(0 + n)] = std::complex<double>(+1.0, 0.0);
        Tarray[m][(0 + n)][(-m + n)] = std::complex<double>(0.0, a);
        Tarray[m][(0 + n)][( m + n)] = std::complex<double>(0.0,-a);

        // O(-m,0) = +1, O(m,0)= +1, O(0,-m)= i*a, O(0,m)= i*a
        Oarray[m][(-m + n)][(0 + n)] = std::complex<double>(1.0, 0.0);
        Oarray[m][( m + n)][(0 + n)] = std::complex<double>(1.0, 0.0);
        Oarray[m][(0 + n)][(-m + n)] = std::complex<double>(0.0, a);
        Oarray[m][(0 + n)][( m + n)] = std::complex<double>(0.0, a);
    }

    // Fill T, O for m=1..(n-1)
    for (int m = 1; m < n; m++) {
        // pass 1 (T)
        for (int k = -m; k <= m; k++) {
          for (int j = -m; j <= m; j++) {
            if (std::abs(k)+std::abs(j) <= m) {
              auto aVal = alphaVal(m, a);
              // boundary increments
              if (j == -m && k == 0) {
                  Tarray[m+1][(j+n)][(k+n)] =
                      ( Tarray[m][(-m + n)][(0 + n)]
                        + aVal*Tarray[m][(-m+1 + n)][(0 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j ==  m && k == 0) {
                  Tarray[m+1][(j+n)][(k+n)] =
                      ( Tarray[m][( m + n)][(0 + n)]
                        + aVal*Tarray[m][( m-1 + n)][(0 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j == 0 && k == -m) {
                  Tarray[m+1][(j+n)][(k+n)] =
                      ( aVal*Tarray[m][(0 + n)][(-m + n)]
                        + Tarray[m][(0 + n)][(-m+1 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j == 0 && k ==  m) {
                  Tarray[m+1][(j+n)][(k+n)] =
                      ( aVal*Tarray[m][(0 + n)][( m + n)]
                        + Tarray[m][(0 + n)][( m-1 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }

              // corners inside boundary
              auto bVal = betaVal(j, m, a);
              if ((1 <= j && j <= m-1) && (k == m - j)) {
                  Tarray[m+1][(j+n)][(k+n)] =
                    ( Tarray[m][(j-1+n)][(m-j + n)]
                      + bVal*Tarray[m][(j+n)][(m-j-1 + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if ((1 <= j && j <= m-1) && (k == -m + j)) {
                  Tarray[m+1][(j+n)][(k+n)] =
                    ( Tarray[m][(j-1+n)][(-m+j + n)]
                      + bVal*Tarray[m][(j+n)][(-m+j+1 + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if (((1-m) <= j && j <= -1) && (k == m + j)) {
                  Tarray[m+1][(j+n)][(k+n)] =
                    ( bVal*Tarray[m][(j+n)][(m+j-1 + n)]
                      + Tarray[m][(j+1+n)][(m+j + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if (((1-m) <= j && j <= -1) && (k == -m - j)) {
                  Tarray[m+1][(j+n)][(k+n)] =
                    ( bVal*Tarray[m][(j+n)][(-m-j+1 + n)]
                      + Tarray[m][(j+1+n)][(-m-j + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }

              // interior pass-through
              if ((std::abs(k)+std::abs(j) < m) && (((j + k + m) % 2) == 0)) {
                  Tarray[m+1][(j+n)][(k+n)] = Tarray[m][(j+n)][(k+n)];
              }
            }
          }
        }
        // pass 2 (T)
        for (int k = -m; k <= m; k++) {
          for (int j = -m; j <= m; j++) {
            if (std::abs(k)+std::abs(j) <= m) {
              if ((std::abs(k)+std::abs(j) < m) && (((j + k + m) % 2) == 1)) {
                  auto gVal = gammaVal(j, k, m, a);
                  Tarray[m+1][(j+n)][(k+n)] =
                      -Tarray[m][(j+n)][(k+n)]
                      + (    Tarray[m+1][(j-1+n)][(k+n)]
                           + Tarray[m+1][(j+1+n)][(k+n)]
                           + gVal*Tarray[m+1][(j+n)][(k+1+n)]
                           + gVal*Tarray[m+1][(j+n)][(k-1+n)]
                        ) / (std::complex<double>(1.0)+gVal);
              }
            }
          }
        }

        // pass 1 (O)
        for (int k = -m; k <= m; k++) {
          for (int j = -m; j <= m; j++) {
            if (std::abs(k)+std::abs(j) <= m) {
              auto aVal = alphaVal(m, a);
              if (j == -m && k == 0) {
                  Oarray[m+1][(j+n)][(k+n)] =
                      ( Oarray[m][(-m + n)][(0 + n)]
                        + aVal*Oarray[m][(-m+1 + n)][(0 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j ==  m && k == 0) {
                  Oarray[m+1][(j+n)][(k+n)] =
                      ( Oarray[m][( m + n)][(0 + n)]
                        + aVal*Oarray[m][( m-1 + n)][(0 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j == 0 && k == -m) {
                  Oarray[m+1][(j+n)][(k+n)] =
                      ( aVal*Oarray[m][(0 + n)][(-m + n)]
                        + Oarray[m][(0 + n)][(-m+1 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j == 0 && k ==  m) {
                  Oarray[m+1][(j+n)][(k+n)] =
                      ( aVal*Oarray[m][(0 + n)][( m + n)]
                        + Oarray[m][(0 + n)][( m-1 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }

              auto bVal = betaVal(j, m, a);
              if ((1 <= j && j <= m-1) && (k == m - j)) {
                  Oarray[m+1][(j+n)][(k+n)] =
                    ( Oarray[m][(j-1+n)][(m-j + n)]
                      + bVal*Oarray[m][(j+n)][(m-j-1 + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if ((1 <= j && j <= m-1) && (k == -m + j)) {
                  Oarray[m+1][(j+n)][(k+n)] =
                    ( Oarray[m][(j-1+n)][(-m+j + n)]
                      + bVal*Oarray[m][(j+n)][(-m+j+1 + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if (((1-m) <= j && j <= -1) && (k == m + j)) {
                  Oarray[m+1][(j+n)][(k+n)] =
                    ( bVal*Oarray[m][(j+n)][(m+j-1 + n)]
                      + Oarray[m][(j+1+n)][(m+j + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if (((1-m) <= j && j <= -1) && (k == -m - j)) {
                  Oarray[m+1][(j+n)][(k+n)] =
                    ( bVal*Oarray[m][(j+n)][(-m-j+1 + n)]
                      + Oarray[m][(j+1+n)][(-m-j + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }

              if ((std::abs(k)+std::abs(j) < m) && (((j + k + m) % 2) == 0)) {
                  Oarray[m+1][(j+n)][(k+n)] = Oarray[m][(j+n)][(k+n)];
              }
            }
          }
        }
        // pass 2 (O)
        for (int k = -m; k <= m; k++) {
          for (int j = -m; j <= m; j++) {
            if (std::abs(k)+std::abs(j) <= m) {
              if ((std::abs(k)+std::abs(j) < m) && (((j + k + m) % 2) == 1)) {
                  auto gVal = gammaVal(j, k, m, a);
                  Oarray[m+1][(j+n)][(k+n)] =
                      -Oarray[m][(j+n)][(k+n)]
                      + (    Oarray[m+1][(j-1+n)][(k+n)]
                           + Oarray[m+1][(j+1+n)][(k+n)]
                           + gVal*Oarray[m+1][(j+n)][(k+1+n)]
                           + gVal*Oarray[m+1][(j+n)][(k-1+n)]
                        ) / (std::complex<double>(1.0)+gVal);
              }
            }
          }
        }
    }

    // Prepare JSON
    std::ostringstream oss;
    oss << "{";

    // T array
    oss << "\"T\":[";
    {
      bool first = true;
      for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
          if (std::abs(k)+std::abs(j) <= n) {
            if (!first) oss << ",";
            first=false;
            double re = Tarray[n][k + n][j + n].real();
            double im = Tarray[n][k + n][j + n].imag();
            oss << "{\"k\":" << k
                << ",\"j\":" << j
                << ",\"re\":" << std::fixed << std::setprecision(15) << re
                << ",\"im\":" << im
                << "}";
          }
        }
      }
    }
    oss << "],";

    // O array
    oss << "\"O\":[";
    {
      bool first = true;
      for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
          if (std::abs(k)+std::abs(j) <= n) {
            // We won't skip (0,0) here in the data (the 3D code filters if needed).
            if (!first) oss << ",";
            first = false;
            double re = Oarray[n][k + n][j + n].real();
            double im = Oarray[n][k + n][j + n].imag();
            oss << "{\"k\":" << k
                << ",\"j\":" << j
                << ",\"re\":" << std::fixed << std::setprecision(15) << re
                << ",\"im\":" << im
                << "}";
          }
        }
      }
    }
    oss << "],";

    // B array (boundary T_{k,j} + O_{k,j})
    // We'll do the same perimeter approach in 4 segments
    oss << "\"B\":[";
    {
      auto getT = [&](int K, int J){return Tarray[n][K + n][J + n];};
      auto getO = [&](int K, int J){return Oarray[n][K + n][J + n];};

      std::vector<std::complex<double>> boundary;
      boundary.reserve(4*(n+1));

      // seg1: (-n,0) to (0,n)
      for (int i = 0; i <= n; i++) {
        int k = -n + i;
        int j = i;
        boundary.push_back(getT(k,j)+getO(k,j));
      }
      // seg2: (0,n) to (n,0)
      for (int i = 0; i <= n; i++) {
        int k = i;
        int j = n - i;
        boundary.push_back(getT(k,j)+getO(k,j));
      }
      // seg3: (n,0) to (0,-n)
      for (int i = 0; i <= n; i++) {
        int k = n - i;
        int j = -i;
        boundary.push_back(getT(k,j)+getO(k,j));
      }
      // seg4: (0,-n) to (-n,0)
      for (int i = 0; i <= n; i++) {
        int k = -i;
        int j = -n + i;
        boundary.push_back(getT(k,j)+getO(k,j));
      }

      bool first = true;
      for (auto &z : boundary) {
         if (!first) oss << ",";
         first=false;
         double re = z.real();
         double im = z.imag();
         oss << "{\"re\":" << std::fixed << std::setprecision(15) << re
             << ",\"im\":" << im << "}";
      }
    }
    oss << "]";

    oss << "}";
    std::string jsonStr = oss.str();

    char* out = (char*) std::malloc(jsonStr.size()+1);
    std::strcpy(out, jsonStr.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* ptr) {
    std::free(ptr);
}

}
