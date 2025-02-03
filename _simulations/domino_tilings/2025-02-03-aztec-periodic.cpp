/*
emcc 2025-02-03-aztec-periodic.cpp -o 2025-02-03-aztec-periodic.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
  mv 2025-02-03-aztec-periodic.js ../../js/
*/

#include <emscripten.h>
#include <iostream>
#include <vector>
#include <cmath>
#include <random>
#include <chrono>
#include <sstream>
#include <string>
#include <tuple>
#include <ctime>
#include <cstdlib>
#include <cstring>

using namespace std;

static std::mt19937 rng(std::random_device{}()); // Global RNG
volatile int progressCounter = 0;

struct Cell {
    double value;
    int flag;
};

using Matrix = vector<vector<Cell>>;
using MatrixDouble = vector<vector<double>>;
using MatrixInt = vector<vector<int>>;

vector<Matrix> d3p(const MatrixDouble &x1) {
    int n = (int)x1.size();
    Matrix A(n, vector<Cell>(n));
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            A[i][j] = (fabs(x1[i][j]) < 1e-9) ? Cell{1.0, 1} : Cell{x1[i][j], 0};
        }
    }
    vector<Matrix> AA;
    AA.push_back(A);

    int iterations = n / 2 - 1;
    for (int k = 0; k < iterations; k++){
        int nk = n - 2 * k - 2;
        Matrix C(nk, vector<Cell>(nk));
        Matrix &prev = AA[k];
        for (int i = 0; i < nk; i++){
            for (int j = 0; j < nk; j++){
                int ii = i + 2 * (i & 1);
                int jj = j + 2 * (j & 1);
                const Cell &current = prev[ii][jj];
                const Cell &diag    = prev[i + 1][j + 1];
                const Cell &right   = prev[ii][j + 1];
                const Cell &down    = prev[i + 1][jj];
                double sum1 = current.flag + diag.flag;
                double sum2 = right.flag + down.flag;
                double a2, a2_second;
                if (fabs(sum1 - sum2) < 1e-9) {
                    a2 = current.value * diag.value + right.value * down.value;
                    a2_second = sum1;
                } else if (sum1 < sum2) {
                    a2 = current.value * diag.value;
                    a2_second = sum1;
                } else {
                    a2 = right.value * down.value;
                    a2_second = sum2;
                }
                if (fabs(a2) < 1e-9) a2 = 1e-9;
                C[i][j] = { current.value / a2, current.flag - static_cast<int>(a2_second) };
            }
        }
        AA.push_back(C);
    }
    return AA;
}

vector<MatrixDouble> probs2(const MatrixDouble &x1) {
    vector<Matrix> a0 = d3p(x1);
    int n = (int)a0.size();
    vector<MatrixDouble> A;
    for (int k = 0; k < n; k++){
        Matrix &mat = a0[n - k - 1];
        int nk = (int)mat.size();
        int rows = nk / 2;
        MatrixDouble C(rows, vector<double>(rows, 0.0));
        for (int i = 0; i < rows; i++){
            for (int j = 0; j < rows; j++){
                int i0 = i << 1;
                int j0 = j << 1;
                int sum1 = mat[i0][j0].flag + mat[i0 + 1][j0 + 1].flag;
                int sum2 = mat[i0 + 1][j0].flag + mat[i0][j0 + 1].flag;
                if (sum1 > sum2) {
                    C[i][j] = 0.0;
                } else if (sum1 < sum2) {
                    C[i][j] = 1.0;
                } else {
                    double prod_main  = mat[i0 + 1][j0 + 1].value * mat[i0][j0].value;
                    double prod_other = mat[i0 + 1][j0].value * mat[i0][j0 + 1].value;
                    double denom = prod_main + prod_other;
                    if (fabs(denom) < 1e-9) denom = 1e-9;
                    C[i][j] = prod_main / denom;
                }
            }
        }
        A.push_back(C);
    }
    return A;
}

MatrixInt delslide(const MatrixInt &x1) {
    int n = (int)x1.size();
    MatrixInt a0(n + 2, vector<int>(n + 2, 0));
    for (int i = 0; i < n; i++){
        for (int j = 0; j < n; j++){
            a0[i + 1][j + 1] = x1[i][j];
        }
    }
    int half = n / 2;
    for (int i = 0; i < half; i++){
        for (int j = 0; j < half; j++){
            int i2 = i << 1, j2 = j << 1;
            if (a0[i2][j2] == 1 && a0[i2 + 1][j2 + 1] == 1) {
                a0[i2][j2] = 0;
                a0[i2 + 1][j2 + 1] = 0;
            } else if (a0[i2][j2 + 1] == 1 && a0[i2 + 1][j2] == 1) {
                a0[i2 + 1][j2] = 0;
                a0[i2][j2 + 1] = 0;
            }
        }
    }
    for (int i = 0; i < half + 1; i++){
        for (int j = 0; j < half + 1; j++){
            int i2 = i << 1, j2 = j << 1;
            if (a0[i2 + 1][j2 + 1] == 1) {
                a0[i2][j2] = 1;
                a0[i2 + 1][j2 + 1] = 0;
            } else if (a0[i2][j2] == 1) {
                a0[i2][j2] = 0;
                a0[i2 + 1][j2 + 1] = 1;
            } else if (a0[i2 + 1][j2] == 1) {
                a0[i2][j2 + 1] = 1;
                a0[i2 + 1][j2] = 0;
            } else if (a0[i2][j2 + 1] == 1) {
                a0[i2 + 1][j2] = 1;
                a0[i2][j2 + 1] = 0;
            }
        }
    }
    return a0;
}

MatrixInt create(MatrixInt x0, const MatrixDouble &p) {
    int n = (int)x0.size();
    int half = n / 2;
    for (int i = 0; i < half; i++){
        for (int j = 0; j < half; j++){
            int i2 = i << 1, j2 = j << 1;
            if (x0[i2][j2] == 0 && x0[i2 + 1][j2] == 0 &&
                x0[i2][j2 + 1] == 0 && x0[i2 + 1][j2 + 1] == 0) {
                bool a1 = true, a2 = true, a3 = true, a4 = true;
                if (j > 0)
                    a1 = (x0[i2][j2 - 1] == 0) && (x0[i2 + 1][j2 - 1] == 0);
                if (j < half - 1)
                    a2 = (x0[i2][j2 + 2] == 0) && (x0[i2 + 1][j2 + 2] == 0);
                if (i > 0)
                    a3 = (x0[i2 - 1][j2] == 0) && (x0[i2 - 1][j2 + 1] == 0);
                if (i < half - 1)
                    a4 = (x0[i2 + 2][j2] == 0) && (x0[i2 + 2][j2 + 1] == 0);
                if (a1 && a2 && a3 && a4) {
                    std::uniform_real_distribution<> dis(0.0, 1.0);
                    double r = dis(rng);
                    if (r < p[i][j]) {
                        x0[i2][j2] = 1;
                        x0[i2 + 1][j2 + 1] = 1;
                    } else {
                        x0[i2 + 1][j2] = 1;
                        x0[i2][j2 + 1] = 1;
                    }
                }
            }
        }
    }
    return x0;
}

MatrixInt aztecgen(const vector<MatrixDouble> &x0) {
    int n = (int)x0.size();
    std::uniform_real_distribution<> dis(0.0, 1.0);
    MatrixInt a1;
    if (dis(rng) < x0[0][0][0])
        a1 = { {1, 0}, {0, 1} };
    else
        a1 = { {0, 1}, {1, 0} };
    int totalIterations = n - 1;
    for (int i = 0; i < totalIterations; i++){
        a1 = delslide(a1);
        a1 = create(a1, x0[i + 1]);
        progressCounter = 10 + (int)(((double)(i + 1) / totalIterations) * 80);
        emscripten_sleep(0);
    }
    return a1;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateAztec(int n, double a, double b) {
    progressCounter = 0;

    int dim = 2 * n;
    MatrixDouble A1a(dim, vector<double>(dim, 0.0));
    for (int i = 0; i < dim; i++){
        for (int j = 0; j < dim; j++){
            int im = i % 4;
            int jm = j % 4;
            if ((im < 2 && jm < 2) || (im >= 2 && jm >= 2))
                A1a[i][j] = b;
            else
                A1a[i][j] = a;
        }
    }

    vector<MatrixDouble> prob = probs2(A1a);
    progressCounter = 10;

    MatrixInt dominoConfig = aztecgen(prob);
    progressCounter = 90;

    int size = (int)dominoConfig.size();
    double scale = 10.0;
    ostringstream oss;
    oss << "[";
    bool first = true;
    for (int i = 0; i < size; i++){
        for (int j = 0; j < size; j++){
            if (dominoConfig[i][j] == 1) {
                double x, y, w, h;
                string color;
                if ((i & 1) && (j & 1)) {
                    color = "green";
                    x = j - i - 2;
                    y = size + 1 - (i + j) - 1;
                    w = 4;
                    h = 2;
                } else if ((i & 1) && !(j & 1)) {
                    color = "blue";
                    x = j - i - 1;
                    y = size + 1 - (i + j) - 2;
                    w = 2;
                    h = 4;
                } else if (!(i & 1) && !(j & 1)) {
                    color = "red";
                    x = j - i - 2;
                    y = size + 1 - (i + j) - 1;
                    w = 4;
                    h = 2;
                } else if (!(i & 1) && (j & 1)) {
                    color = "yellow";
                    x = j - i - 1;
                    y = size + 1 - (i + j) - 2;
                    w = 2;
                    h = 4;
                } else {
                    continue;
                }
                x *= scale;
                y *= scale;
                w *= scale;
                h *= scale;
                if (!first) oss << ",";
                else first = false;
                oss << "{\"x\":" << x << ",\"y\":" << y
                    << ",\"w\":" << w << ",\"h\":" << h
                    << ",\"color\":\"" << color << "\"}";
            }
        }
    }
    oss << "]";
    progressCounter = 100;

    string json = oss.str();
    char* out = (char*)malloc(json.size() + 1);
    strcpy(out, json.c_str());
    return out;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

}
