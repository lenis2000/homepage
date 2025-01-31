#include <emscripten/emscripten.h>
#include <vector>
#include <cmath>
#include <cstdlib>

/*
  Minimal code: We'll store the squares of an Aztec diamond of order n.
  Each square is represented by 4 floats: (xLeft, yTop, xRight, yBottom).
*/

static std::vector<float> aztecSquares;

// Generate squares for Aztec diamond of order n
extern "C" EMSCRIPTEN_KEEPALIVE
void generateAztecDiamond(int n) {
    aztecSquares.clear();

    // Loop over half-integers: center (x,y) with |x|+|y| <= n
    for (int i = -2*n; i <= 2*n; ++i) {
        for (int j = -2*n; j <= 2*n; ++j) {
            float x_center = i * 0.5f;
            float y_center = j * 0.5f;
            if (std::fabs(x_center) + std::fabs(y_center) <= n + 1e-7f) {
                // Store corners as (xLeft, yTop, xRight, yBottom)
                float xLeft = x_center - 0.5f;
                float xRight = x_center + 0.5f;
                float yTop = y_center + 0.5f;
                float yBottom = y_center - 0.5f;

                aztecSquares.push_back(xLeft);
                aztecSquares.push_back(yTop);
                aztecSquares.push_back(xRight);
                aztecSquares.push_back(yBottom);
            }
        }
    }
}

// How many squares
extern "C" EMSCRIPTEN_KEEPALIVE
int getAztecSquaresCount() {
    return (int)(aztecSquares.size() / 4);
}

// Pointer to the array
extern "C" EMSCRIPTEN_KEEPALIVE
float* getAztecSquaresPtr() {
    return aztecSquares.data();
}

// Dummy main
int main() { return 0; }
