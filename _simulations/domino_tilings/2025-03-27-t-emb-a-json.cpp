/*
  2025-03-27-t-emb-a-json.cpp

  A version of the t-embedding generator that allows a tunable real parameter a.
  It provides a single exported function:

    doTembJSONwithA(n, a)

  that returns a JSON with:
    {
      "T": [...],  // T-vertices
      "O": [...],  // O-vertices
      "B": [...]   // boundary points (T+O) around perimeter
    }

  Usage with Emscripten (example command):

    emcc 2025-03-27-t-emb-a-json.cpp -o 2025-03-27-t-emb-a-json.js \
     -s WASM=1 \
     -s ASYNCIFY=1 \
     -s "EXPORTED_FUNCTIONS=['_doTembJSONwithA','_freeString']" \
     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
     -s ALLOW_MEMORY_GROWTH=1 \
     -s INITIAL_MEMORY=64MB \
     -s ENVIRONMENT=web \
     -s SINGLE_FILE=1 \
     -O3 -ffast-math\
     && mv 2025-03-27-t-emb-a-json.js ../../js/

  Then, include the generated .js (and .wasm if separate) in your web page.
  Make sure to wrap the exported function and freeString with cwrap or ccall, for example:

      const doTembJSONwithA = Module.cwrap('doTembJSONwithA', 'number', ['number','number']);
      const freeString = Module.cwrap('freeString', null, ['number']);

  Then call:
      const ptr = doTembJSONwithA(n, a);
      const jsonStr = Module.UTF8ToString(ptr);
      freeString(ptr);
      const data = JSON.parse(jsonStr);
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

// Helper inline functions to compute the piecewise factors alpha, beta, gamma:
static inline std::complex<double> alphaVal(int m, double a) {
    // alpha depends on m mod 4
    // if (m % 2 == 1) => 1
    // else if (m % 4 == 2) => a^2
    // else (m % 4 == 0) => 1/(a^2)
    if ((m % 2) == 1) {
        return {1.0, 0.0};
    }
    if ((m % 4) == 2) {
        return {a*a, 0.0};
    }
    // (m % 4) == 0
    return {1.0/(a*a), 0.0};
}

static inline std::complex<double> betaVal(int j, int m, double a) {
    // depends on m mod 4 and j mod 2
    // If m % 2 == 1 => 1
    // If m % 4 == 0 and j % 2 == 0 => a^2
    // If m % 4 == 2 and j % 2 == 1 => a^2
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
    // depends on m mod 4 and j,k mod 2
    // If m % 2 == 0 => 1
    // Else if m % 4 == 3 and j,k even => a^2
    // Else if m % 4 == 1 and j,k odd  => a^2
    // otherwise => 1/(a^2)
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


// We build up Tarray[m], Oarray[m] for m from 1..n, storing them in
// local 3D vectors of dimension [n+1][2n+1][2n+1].
// The final Tarray[n][k][j] and Oarray[n][k][j] produce the embedding.
extern "C" {

/*
  doTembJSONwithA(n, a):
    - n is an integer, 1 <= n <= 200
    - a is a positive real scale factor

    Returns a JSON string with keys "T", "O", and "B":
      {
        "T": [
          { "k":k, "j":j, "re":Re(T_{k,j}), "im":Im(T_{k,j}) },
          ...
        ],
        "O": [ ... ],
        "B": [  // boundary points T_{k,j} + O_{k,j} around the perimeter in a cycle
          { "re":..., "im":... },
          ...
        ]
      }

    The caller must free the returned string with freeString().
*/
EMSCRIPTEN_KEEPALIVE
char* doTembJSONwithA(int n, double a) {
    // clamp n
    if (n < 1)  n = 1;
    if (n > 200) n = 200;
    if (a <= 0.0) a = 1.0;  // fallback if user gave a nonpositive

    // Prepare Tarray, Oarray of size (n+1) x (2*n + 1) x (2*n + 1)
    // We'll index them as Tarray[m][k+n][j+n] for k,j in [-n..n].
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

    // 1) Initialize T and O for m=1..n (boundary seeds)
    for (int m = 1; m <= n; m++) {
        // T(-m,0) = -1, T(m,0)= +1, T(0,-m)= i*a, T(0,m)= -i*a
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

    // 2) Fill T and O for m=1..(n-1) via the recursive rule
    for (int m = 1; m < n; m++) {
        // Pass 1 for T
        for (int k = -m; k <= m; k++) {
          for (int j = -m; j <= m; j++) {
            if (std::abs(k) + std::abs(j) <= m) {
              // boundary “incremental” updates:
              auto aVal = alphaVal(m, a);

              // T(-m,0), T(m,0), T(0,-m), T(0,m)
              if (j == -m && k == 0) {
                  Tarray[m+1][(j + n)][(k + n)] =
                      ( Tarray[m][(-m + n)][(0 + n)]
                        + aVal*Tarray[m][(-m+1 + n)][(0 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j ==  m && k == 0) {
                  Tarray[m+1][(j + n)][(k + n)] =
                      ( Tarray[m][( m + n)][(0 + n)]
                        + aVal*Tarray[m][( m-1 + n)][(0 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j == 0 && k == -m) {
                  Tarray[m+1][(j + n)][(k + n)] =
                      ( aVal*Tarray[m][(0 + n)][(-m + n)]
                        + Tarray[m][(0 + n)][(-m+1 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j == 0 && k ==  m) {
                  Tarray[m+1][(j + n)][(k + n)] =
                      ( aVal*Tarray[m][(0 + n)][( m + n)]
                        + Tarray[m][(0 + n)][( m-1 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }

              // corners inside boundary
              auto bVal = betaVal(j, m, a);
              if ((1 <= j && j <= m-1) && (k == m - j)) {
                  Tarray[m+1][(j + n)][(k + n)] =
                    ( Tarray[m][(j-1 + n)][(m-j + n)]
                      + bVal*Tarray[m][(j + n)][(m-j-1 + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if ((1 <= j && j <= m-1) && (k == -m + j)) {
                  Tarray[m+1][(j + n)][(k + n)] =
                    ( Tarray[m][(j-1 + n)][(-m+j + n)]
                      + bVal*Tarray[m][(j + n)][(-m+j+1 + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if (((1-m) <= j && j <= -1) && (k == m + j)) {
                  Tarray[m+1][(j + n)][(k + n)] =
                    ( bVal*Tarray[m][(j + n)][(m+j-1 + n)]
                      + Tarray[m][(j+1 + n)][(m+j + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if (((1-m) <= j && j <= -1) && (k == -m - j)) {
                  Tarray[m+1][(j + n)][(k + n)] =
                    ( bVal*Tarray[m][(j + n)][(-m-j+1 + n)]
                      + Tarray[m][(j+1 + n)][(-m-j + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }

              // interior pass-through
              if ((std::abs(k)+std::abs(j) < m) && (((j + k + m) % 2) == 0)) {
                  Tarray[m+1][(j + n)][(k + n)] =
                      Tarray[m][(j + n)][(k + n)];
              }
            }
          }
        }
        // Pass 2 for T
        for (int k = -m; k <= m; k++) {
          for (int j = -m; j <= m; j++) {
            if (std::abs(k) + std::abs(j) <= m) {
              if ((std::abs(k)+std::abs(j) < m) && (((j + k + m) % 2) == 1)) {
                  auto gVal = gammaVal(j, k, m, a);
                  Tarray[m+1][(j + n)][(k + n)] =
                      -Tarray[m][(j + n)][(k + n)]
                      + (    Tarray[m+1][(j-1 + n)][(k + n)]
                           + Tarray[m+1][(j+1 + n)][(k + n)]
                           + gVal*Tarray[m+1][(j + n)][(k+1 + n)]
                           + gVal*Tarray[m+1][(j + n)][(k-1 + n)]
                        )
                        / (std::complex<double>(1.0)+gVal);
              }
            }
          }
        }

        // Pass 1 for O
        for (int k = -m; k <= m; k++) {
          for (int j = -m; j <= m; j++) {
            if (std::abs(k) + std::abs(j) <= m) {
              auto aVal = alphaVal(m, a);
              if (j == -m && k == 0) {
                  Oarray[m+1][(j + n)][(k + n)] =
                      ( Oarray[m][(-m + n)][(0 + n)]
                        + aVal*Oarray[m][(-m+1 + n)][(0 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j ==  m && k == 0) {
                  Oarray[m+1][(j + n)][(k + n)] =
                      ( Oarray[m][( m + n)][(0 + n)]
                        + aVal*Oarray[m][( m-1 + n)][(0 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j == 0 && k == -m) {
                  Oarray[m+1][(j + n)][(k + n)] =
                      ( aVal*Oarray[m][(0 + n)][(-m + n)]
                        + Oarray[m][(0 + n)][(-m+1 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }
              if (j == 0 && k ==  m) {
                  Oarray[m+1][(j + n)][(k + n)] =
                      ( aVal*Oarray[m][(0 + n)][( m + n)]
                        + Oarray[m][(0 + n)][( m-1 + n)] )
                      / (std::complex<double>(1.0)+aVal);
              }

              auto bVal = betaVal(j, m, a);
              if ((1 <= j && j <= m-1) && (k == m - j)) {
                  Oarray[m+1][(j + n)][(k + n)] =
                    ( Oarray[m][(j-1 + n)][(m-j + n)]
                      + bVal*Oarray[m][(j + n)][(m-j-1 + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if ((1 <= j && j <= m-1) && (k == -m + j)) {
                  Oarray[m+1][(j + n)][(k + n)] =
                    ( Oarray[m][(j-1 + n)][(-m+j + n)]
                      + bVal*Oarray[m][(j + n)][(-m+j+1 + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if (((1-m) <= j && j <= -1) && (k == m + j)) {
                  Oarray[m+1][(j + n)][(k + n)] =
                    ( bVal*Oarray[m][(j + n)][(m+j-1 + n)]
                      + Oarray[m][(j+1 + n)][(m+j + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }
              if (((1-m) <= j && j <= -1) && (k == -m - j)) {
                  Oarray[m+1][(j + n)][(k + n)] =
                    ( bVal*Oarray[m][(j + n)][(-m-j+1 + n)]
                      + Oarray[m][(j+1 + n)][(-m-j + n)] )
                    / (std::complex<double>(1.0)+bVal);
              }

              // interior pass-through
              if ((std::abs(k)+std::abs(j) < m) && (((j + k + m) % 2) == 0)) {
                  Oarray[m+1][(j + n)][(k + n)] =
                      Oarray[m][(j + n)][(k + n)];
              }
            }
          }
        }
        // Pass 2 for O
        for (int k = -m; k <= m; k++) {
          for (int j = -m; j <= m; j++) {
            if (std::abs(k) + std::abs(j) <= m) {
              if ((std::abs(k)+std::abs(j) < m) && (((j + k + m) % 2) == 1)) {
                  auto gVal = gammaVal(j, k, m, a);
                  Oarray[m+1][(j + n)][(k + n)] =
                      -Oarray[m][(j + n)][(k + n)]
                      + (    Oarray[m+1][(j-1 + n)][(k + n)]
                           + Oarray[m+1][(j+1 + n)][(k + n)]
                           + gVal*Oarray[m+1][(j + n)][(k+1 + n)]
                           + gVal*Oarray[m+1][(j + n)][(k-1 + n)]
                        )
                        / (std::complex<double>(1.0)+gVal);
              }
            }
          }
        }
    } // end for m in [1..n-1]

    // Now we have Tarray[n] and Oarray[n] as our final T- and O- embeddings.
    // We'll build the output JSON:
    std::ostringstream oss;
    oss << "{";

    // =========== T array
    oss << "\"T\":[";
    {
      bool first = true;
      // k, j in [-n..n], but only consider |k|+|j| <= n
      for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
          if (std::abs(k)+std::abs(j) <= n) {
            if (!first) oss << ",";
            first=false;
            double re = Tarray[n][(k + n)][(j + n)].real();
            double im = Tarray[n][(k + n)][(j + n)].imag();
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

    // =========== O array
    oss << "\"O\":[";
    {
      bool first = true;
      for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
          if (std::abs(k)+std::abs(j) <= n) {
            // -- Skip the origin (k=0, j=0) so no red vertex appears there:
            if (k == 0 && j == 0) {
                continue;
            }
            if (!first) oss << ",";
            first=false;
            double re = Oarray[n][(k + n)][(j + n)].real();
            double im = Oarray[n][(k + n)][(j + n)].imag();
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

    // =========== B array (boundary: T_{k,j} + O_{k,j})
    // We'll walk around the perimeter in 4 segments, each with (n+1) points:
    //   from (-n,0) up to (0,n),
    //   from (0,n) over to (n,0),
    //   from (n,0) down to (0,-n),
    //   from (0,-n) back to (-n,0).
    oss << "\"B\":[";
    {
      std::vector<std::complex<double>> boundary;
      boundary.reserve(4 * (n+1));

      auto getT = [&](int k, int j) {
        return Tarray[n][(k + n)][(j + n)];
      };
      auto getO = [&](int k, int j) {
        return Oarray[n][(k + n)][(j + n)];
      };

      // seg1: from (-n,0) to (0,n)
      for (int i = 0; i <= n; i++) {
         int k = -n + i;
         int j = i;
         boundary.push_back( getT(k,j) + getO(k,j) );
      }
      // seg2: from (0,n) to (n,0)
      for (int i = 0; i <= n; i++) {
         int k = i;
         int j = n - i;
         boundary.push_back( getT(k,j) + getO(k,j) );
      }
      // seg3: from (n,0) down to (0,-n)
      for (int i = 0; i <= n; i++) {
         int k = n - i;
         int j = -i;
         boundary.push_back( getT(k,j) + getO(k,j) );
      }
      // seg4: from (0,-n) back to (-n,0)
      for (int i = 0; i <= n; i++) {
         int k = -i;
         int j = -n + i;
         boundary.push_back( getT(k,j) + getO(k,j) );
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

    // Convert to char* for returning
    std::string jsonStr = oss.str();
    char* out = (char*) std::malloc(jsonStr.size()+1);
    std::strcpy(out, jsonStr.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    std::free(str);
}

}
