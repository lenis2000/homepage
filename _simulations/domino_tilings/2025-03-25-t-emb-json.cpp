/*
  2025-03-25-t-emb-json.cpp

  Corrected version that also returns a B array (boundary)
  so that the outer polygon is visible.

  Compile to JavaScript/WASM with Emscripten, for example:

  emcc 2025-03-25-t-emb-json.cpp -o 2025-03-25-t-emb-json.js \
   -s WASM=1 \
   -s ASYNCIFY=1 \
   -s "EXPORTED_FUNCTIONS=['_doTembJSON','_freeString','_getProgress','_resetProgress','_requestCancel','_isCancelled','_resetCancel']" \
   -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
   -s ALLOW_MEMORY_GROWTH=1 \
   -s INITIAL_MEMORY=64MB \
   -s ENVIRONMENT=web \
   -s SINGLE_FILE=1 \
   -O3 -ffast-math \
   && mv 2025-03-25-t-emb-json.js ../../js/

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

static const int bign = 300;   // largest n we allow
static const double a = 1.0;   // scale factor used below

// Tarray[n][k+bign][j+bign], Oarray[n][k+bign][j+bign]
static std::vector<std::vector<std::vector<std::complex<double>>>> Tarray;
static std::vector<std::vector<std::vector<std::complex<double>>>> Oarray;

// Track progress for the UI
static int currentProgress = 0;

// Cancellation flag
static bool cancelRequested = false;

// Some small helper “piecewise” factors from the references:
static inline std::complex<double> alpha(int n) {
    // alpha depends on n mod 4
    if ((n % 2) == 1) return {1.0, 0.0};
    if ((n % 4) == 2) return {a*a, 0.0};
    // (n % 4) == 0
    return {1.0/(a*a), 0.0};
}
static inline std::complex<double> betaVal(int j, int n) {
    // depends on n mod 4 and j mod 2
    if ((n % 2) == 1) return {1.0, 0.0};
    if ((n % 4) == 0 && (j % 2) == 0) return {a*a, 0.0};
    if ((n % 4) == 2 && (j % 2) == 1) return {a*a, 0.0};
    // otherwise 1/(a^2)
    return {1.0/(a*a), 0.0};
}
static inline std::complex<double> gammaVal(int j, int k, int n) {
    // depends on n mod 4 and j,k mod 2
    if ((n % 2) == 0) {
        return {1.0, 0.0};
    } else {
        // (n % 2) == 1
        bool bothEven = ((j % 2) == 0) && ((k % 2) == 0);
        bool bothOdd  = ((j % 2) == 1) && ((k % 2) == 1);
        if ((n % 4) == 3 && bothEven) return {a*a, 0.0};
        if ((n % 4) == 1 && bothOdd ) return {a*a, 0.0};
        // else 1/(a^2)
        return {1.0/(a*a), 0.0};
    }
}

// Build Tarray and Oarray if not already built
static void buildArraysIfNeeded() {
    if (!Tarray.empty() && !Oarray.empty()) {
        return; // done already
    }

    // Reset progress counter
    currentProgress = 0;

    Tarray.resize(bign + 1, std::vector<std::vector<std::complex<double>>>(
                                 2*bign + 1,
                                 std::vector<std::complex<double>>(2*bign + 1,{0,0})));
    Oarray.resize(bign + 1, std::vector<std::vector<std::complex<double>>>(
                                 2*bign + 1,
                                 std::vector<std::complex<double>>(2*bign + 1,{0,0})));

    // Initialize T and O for n=1 up to bign
    for (int n = 1; n <= bign; n++) {
        // Put boundary seeds for T and O at corners
        // T(-n,0) = -1, T(n,0)= +1, T(0,-n)= i*a, T(0,n)= -i*a  (some references do so)
        Tarray[n][(-n+bign)][(0+bign)] = {-1.0, 0.0};
        Tarray[n][( n+bign)][(0+bign)] = {+1.0, 0.0};
        Tarray[n][(0+bign)][(-n+bign)] = {0.0, a};
        Tarray[n][(0+bign)][( n+bign)] = {0.0,-a};

        Oarray[n][(-n+bign)][(0+bign)] = {1.0, 0.0};
        Oarray[n][( n+bign)][(0+bign)] = {1.0, 0.0};
        Oarray[n][(0+bign)][(-n+bign)] = {0.0, a};
        Oarray[n][(0+bign)][( n+bign)] = {0.0, a};
    }

    // Fill Tarray and Oarray recursively
    for (int n = 1; n < bign; n++) {
        // Update progress based on current loop (0-100)
        currentProgress = (n * 100) / bign;

        // Check for cancellation
        if (cancelRequested) {
            return;
        }
        //=============================================
        //  T array pass 1
        for (int k = -n; k <= n; k++) {
          for (int j = -n; j <= n; j++) {
            if (std::abs(k)+std::abs(j) <= n) {
              // boundary “incremental” updates
              if (j == -n && k == 0) {
                  Tarray[n+1][j+bign][k+bign] =
                      ( Tarray[n][(-n+bign)][(0+bign)]
                       + alpha(n)*Tarray[n][(-n+1+bign)][(0+bign)] )
                      / (std::complex<double>(1.0)+alpha(n));
              }
              if (j == n && k == 0) {
                  Tarray[n+1][j+bign][k+bign] =
                      ( Tarray[n][(n+bign)][(0+bign)]
                       + alpha(n)*Tarray[n][(n-1+bign)][(0+bign)] )
                      / (std::complex<double>(1.0)+alpha(n));
              }
              if (j == 0 && k == -n) {
                  Tarray[n+1][j+bign][k+bign] =
                      ( alpha(n)*Tarray[n][(0+bign)][(-n+bign)]
                       + Tarray[n][(0+bign)][(-n+1+bign)] )
                      / (std::complex<double>(1.0)+alpha(n));
              }
              if (j == 0 && k == n) {
                  Tarray[n+1][j+bign][k+bign] =
                      ( alpha(n)*Tarray[n][(0+bign)][(n+bign)]
                       + Tarray[n][(0+bign)][(n-1+bign)] )
                      / (std::complex<double>(1.0)+alpha(n));
              }

              // corners inside boundary
              if (1 <= j && j <= n-1 && k == (n - j)) {
                  auto bval = betaVal(j,n);
                  Tarray[n+1][j+bign][k+bign] =
                      ( Tarray[n][(j-1+bign)][(n-j+bign)]
                       + bval*Tarray[n][(j+bign)][(n-j-1+bign)] )
                      / (std::complex<double>(1.0)+bval);
              }
              if (1 <= j && j <= n-1 && k == -n + j) {
                  auto bval = betaVal(j,n);
                  Tarray[n+1][j+bign][k+bign] =
                      ( Tarray[n][(j-1+bign)][(-n+j+bign)]
                       + bval*Tarray[n][(j+bign)][(-n+j+1+bign)] )
                      / (std::complex<double>(1.0)+bval);
              }
              if ((1-n) <= j && j <= -1 && k == (n + j)) {
                  auto bval = betaVal(j,n);
                  Tarray[n+1][j+bign][k+bign] =
                      ( bval*Tarray[n][(j+bign)][(n+j-1+bign)]
                       + Tarray[n][(j+1+bign)][(n+j+bign)] )
                      / (std::complex<double>(1.0)+bval);
              }
              if ((1-n) <= j && j <= -1 && k == -n - j) {
                  auto bval = betaVal(j,n);
                  Tarray[n+1][j+bign][k+bign] =
                      ( bval*Tarray[n][(j+bign)][(-n-j+1+bign)]
                       + Tarray[n][(j+1+bign)][(-n-j+bign)] )
                      / (std::complex<double>(1.0)+bval);
              }

              // interior pass-through
              if ((std::abs(k)+std::abs(j) < n) && ((j + k + n) % 2 == 0)) {
                  Tarray[n+1][j+bign][k+bign] = Tarray[n][j+bign][k+bign];
              }
            }
          }
        }
        // T array pass 2
        for (int k = -n; k <= n; k++) {
          for (int j = -n; j <= n; j++) {
            if (std::abs(k)+std::abs(j) <= n) {
              if ((std::abs(k)+std::abs(j) < n) && ((j + k + n) % 2 == 1)) {
                  auto gm = gammaVal(j,k,n);
                  Tarray[n+1][j+bign][k+bign] =
                      -Tarray[n][j+bign][k+bign]
                      + (   Tarray[n+1][(j-1+bign)][(k+bign)]
                          + Tarray[n+1][(j+1+bign)][(k+bign)]
                          + gm*Tarray[n+1][(j+bign)][(k+1+bign)]
                          + gm*Tarray[n+1][(j+bign)][(k-1+bign)]
                        )
                        / (std::complex<double>(1.0)+gm);
              }
            }
          }
        }

        //=============================================
        //  O array pass 1
        for (int k = -n; k <= n; k++) {
          for (int j = -n; j <= n; j++) {
            if (std::abs(k)+std::abs(j) <= n) {
              // boundary “incremental” updates
              if (j == -n && k == 0) {
                  Oarray[n+1][j+bign][k+bign] =
                      ( Oarray[n][(-n+bign)][(0+bign)]
                       + alpha(n)*Oarray[n][(-n+1+bign)][(0+bign)] )
                      / (std::complex<double>(1.0)+alpha(n));
              }
              if (j == n && k == 0) {
                  Oarray[n+1][j+bign][k+bign] =
                      ( Oarray[n][(n+bign)][(0+bign)]
                       + alpha(n)*Oarray[n][(n-1+bign)][(0+bign)] )
                      / (std::complex<double>(1.0)+alpha(n));
              }
              if (j == 0 && k == -n) {
                  Oarray[n+1][j+bign][k+bign] =
                      ( alpha(n)*Oarray[n][(0+bign)][(-n+bign)]
                       + Oarray[n][(0+bign)][(-n+1+bign)] )
                      / (std::complex<double>(1.0)+alpha(n));
              }
              if (j == 0 && k == n) {
                  Oarray[n+1][j+bign][k+bign] =
                      ( alpha(n)*Oarray[n][(0+bign)][(n+bign)]
                       + Oarray[n][(0+bign)][(n-1+bign)] )
                      / (std::complex<double>(1.0)+alpha(n));
              }

              // corners inside boundary
              if (1 <= j && j <= n-1 && k == (n - j)) {
                  auto bval = betaVal(j,n);
                  Oarray[n+1][j+bign][k+bign] =
                      ( Oarray[n][(j-1+bign)][(n-j+bign)]
                       + bval*Oarray[n][(j+bign)][(n-j-1+bign)] )
                      / (std::complex<double>(1.0)+bval);
              }
              if (1 <= j && j <= n-1 && k == -n + j) {
                  auto bval = betaVal(j,n);
                  Oarray[n+1][j+bign][k+bign] =
                      ( Oarray[n][(j-1+bign)][(-n+j+bign)]
                       + bval*Oarray[n][(j+bign)][(-n+j+1+bign)] )
                      / (std::complex<double>(1.0)+bval);
              }
              if ((1-n) <= j && j <= -1 && k == (n + j)) {
                  auto bval = betaVal(j,n);
                  Oarray[n+1][j+bign][k+bign] =
                      ( bval*Oarray[n][(j+bign)][(n+j-1+bign)]
                       + Oarray[n][(j+1+bign)][(n+j+bign)] )
                      / (std::complex<double>(1.0)+bval);
              }
              if ((1-n) <= j && j <= -1 && k == -n - j) {
                  auto bval = betaVal(j,n);
                  Oarray[n+1][j+bign][k+bign] =
                      ( bval*Oarray[n][(j+bign)][(-n-j+1+bign)]
                       + Oarray[n][(j+1+bign)][(-n-j+bign)] )
                      / (std::complex<double>(1.0)+bval);
              }

              // interior pass-through
              if ((std::abs(k)+std::abs(j) < n) && ((j + k + n) % 2 == 0)) {
                  Oarray[n+1][j+bign][k+bign] = Oarray[n][j+bign][k+bign];
              }
            }
          }
        }
        // O array pass 2
        for (int k = -n; k <= n; k++) {
          for (int j = -n; j <= n; j++) {
            if (std::abs(k)+std::abs(j) <= n) {
              if ((std::abs(k)+std::abs(j) < n) && ((j + k + n) % 2 == 1)) {
                  auto gm = gammaVal(j,k,n);
                  Oarray[n+1][j+bign][k+bign] =
                      -Oarray[n][j+bign][k+bign]
                      + (   Oarray[n+1][(j-1+bign)][(k+bign)]
                          + Oarray[n+1][(j+1+bign)][(k+bign)]
                          + gm*Oarray[n+1][(j+bign)][(k+1+bign)]
                          + gm*Oarray[n+1][(j+bign)][(k-1+bign)]
                        )
                        / (std::complex<double>(1.0)+gm);
              }
            }
          }
        }
    } // end for n in [1..bign-1]
}

extern "C" {

// Function to update and get the current progress
EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return currentProgress;
}

// Function to reset progress
EMSCRIPTEN_KEEPALIVE
void resetProgress() {
    currentProgress = 0;
}

// Function to request cancellation
EMSCRIPTEN_KEEPALIVE
void requestCancel() {
    cancelRequested = true;
}

// Function to check if cancellation is requested
EMSCRIPTEN_KEEPALIVE
bool isCancelled() {
    return cancelRequested;
}

// Function to reset cancellation flag
EMSCRIPTEN_KEEPALIVE
void resetCancel() {
    cancelRequested = false;
}

/*
  doTembJSON(n):
    Returns a JSON with keys "T", "O", and "B", or null if cancelled:

      {
        "T": [
          { "k":k, "j":j, "re": Re(T_{k,j}), "im": Im(T_{k,j}) },
          ...
        ],
        "O": [...],
        "B": [  // boundary points T_{k,j}+O_{k,j} around the perimeter in a cycle
          { "re":..., "im":... },
          ...
        ]
      }

    The function can be cancelled by calling requestCancel(). If cancellation
    is requested, this function will return null.
*/
EMSCRIPTEN_KEEPALIVE
char* doTembJSON(int n) {
    // Reset progress counter and cancel flag
    resetProgress();
    resetCancel();

    // Initial progress update - starting computation
    currentProgress = 5;

    // Add small delays for progress visualization
    for (int i = 0; i < 1000000; i++) {
        // Simple loop to create some CPU work for progress visualization
        if (i % 100000 == 0) {
            // Update progress slowly from 5% to 20%
            currentProgress = 5 + (i / 100000);

            // Check for cancellation
            if (cancelRequested) {
                return nullptr;
            }
        }
    }

    // Arrays preparation phase
    currentProgress = 20;

    buildArraysIfNeeded();
    if (n < 1)  n = 1;
    if (n > bign) n = bign;

    // Add more intermediate progress for larger n values
    // or when arrays already exist
    for (int i = 0; i < std::min(n * 10000, 3000000); i++) {
        // Another computation delay with visible progress
        if (i % 300000 == 0) {
            // Update progress from 20% to 60%
            currentProgress = 20 + (i / 300000) * 5;

            // Check for cancellation
            if (cancelRequested) {
                return nullptr;
            }
        }
    }

    // Set progress to 60% after preparation phase
    currentProgress = 60;

    std::ostringstream oss;
    oss << "{";

    // Progress update - starting JSON generation
    currentProgress = 65;

    // Calculate total points once for progress tracking
    int totalPoints = 0;
    for (int k = -n; k <= n; k++) {
      for (int j = -n; j <= n; j++) {
        if (std::abs(k)+std::abs(j) <= n) {
          totalPoints++;
        }
      }
    }

    //============ T array
    oss << "\"T\":[";
    {
      bool first = true;
      int processedPoints = 0;
      // Now process each point
      for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
          if (std::abs(k)+std::abs(j) <= n) {
            // Update progress occasionally - T array phase (65-75%)
            processedPoints++;
            if (processedPoints % (totalPoints/10 + 1) == 0) { // Update ~10 times
              currentProgress = 65 + (processedPoints * 10 / totalPoints);

              // Check for cancellation
              if (cancelRequested) {
                return nullptr;
              }
            }
            if (!first) oss << ",";
            first=false;
            double re = Tarray[n][k+bign][j+bign].real();
            double im = Tarray[n][k+bign][j+bign].imag();
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

    //============ O array
    oss << "\"O\":[";
    // Progress update - starting O array
    currentProgress = 75;
    {
      bool first = true;
      int processedPoints = 0; // Reuse totalPoints from T array
      for (int k = -n; k <= n; k++) {
        for (int j = -n; j <= n; j++) {
          if (std::abs(k)+std::abs(j) <= n) {
            // Update progress occasionally - O array phase (75-85%)
            processedPoints++;
            if (processedPoints % (totalPoints/10 + 1) == 0) { // Update ~10 times
              currentProgress = 75 + (processedPoints * 10 / totalPoints);

              // Check for cancellation
              if (cancelRequested) {
                return nullptr;
              }
            }
            if (!first) oss << ",";
            first=false;
            double re = Oarray[n][k+bign][j+bign].real();
            double im = Oarray[n][k+bign][j+bign].imag();
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

    //============ B array (boundary points T_{k,j}+O_{k,j})
    // We'll walk around the perimeter in 4 segments:
    //   from (-n,0) up to (0,n),
    //   from (0,n) over to (n,0),
    //   from (n,0) down to (0,-n),
    //   from (0,-n) back to (-n,0).
    // Each segment has (n+1) points, so total of 4*(n+1) points.
    oss << "\"B\":[";
    // Progress update - starting boundary array
    currentProgress = 85;
    {
      std::vector<std::complex<double>> boundary;
      boundary.reserve(4*(n+1));

      // seg1: k from -n to 0, j from 0 to n
      for (int i = 0; i <= n; i++) {
         int k = -n + i;
         int j = i;
         auto Tval = Tarray[n][k+bign][j+bign];
         auto Oval = Oarray[n][k+bign][j+bign];
         boundary.push_back(Tval + Oval);
      }
      // seg2: k from 0 to n, j from n to 0
      for (int i = 0; i <= n; i++) {
         int k = i;
         int j = n - i;
         auto Tval = Tarray[n][k+bign][j+bign];
         auto Oval = Oarray[n][k+bign][j+bign];
         boundary.push_back(Tval + Oval);
      }
      // seg3: k from n down to 0, j from 0 down to -n
      for (int i = 0; i <= n; i++) {
         int k = n - i;
         int j = -i;
         auto Tval = Tarray[n][k+bign][j+bign];
         auto Oval = Oarray[n][k+bign][j+bign];
         boundary.push_back(Tval + Oval);
      }
      // seg4: k from 0 down to -n, j from -n up to 0
      for (int i = 0; i <= n; i++) {
         int k = -i;
         int j = -n + i;
         auto Tval = Tarray[n][k+bign][j+bign];
         auto Oval = Oarray[n][k+bign][j+bign];
         boundary.push_back(Tval + Oval);
      }

      bool first = true;
      int boundaryCount = boundary.size();
      int boundaryProcessed = 0;

      for (auto &z : boundary) {
         // Update progress during boundary processing (85-95%)
         boundaryProcessed++;
         if (boundaryProcessed % (boundaryCount/5 + 1) == 0) { // Update ~5 times
           currentProgress = 85 + (boundaryProcessed * 10 / boundaryCount);

           // Check for cancellation
           if (cancelRequested) {
             return nullptr;
           }
         }

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

    // Set progress to 100% when complete
    currentProgress = 100;

    // convert to char*
    std::string jsonStr = oss.str();
    char* out = (char*) std::malloc(jsonStr.size()+1);
    std::strcpy(out, jsonStr.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    std::free(str);
}

} // extern "C"
