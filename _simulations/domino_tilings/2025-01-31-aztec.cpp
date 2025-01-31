/*
Compiles into a WebAssembly module that simulates an Aztec diamond random tiling
following the logic in python_sim_full.py. It returns the final 2N x 2N 0/1 matrix
plus a heatmap. Build example:

  emcc 2025-01-31-aztec.cpp -o 2025-01-31-aztec.js \
       -s WASM=1 \
       -s "EXPORTED_FUNCTIONS=['_computeAztec','_getAztecData','_getCurrentN','_getHeatMapData','_getHeatMapDim','_main']" \
       -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\"]' \
       -s ALLOW_MEMORY_GROWTH=1 \
       -s TOTAL_MEMORY=268435456 \
       -O3 \
       -s ASSERTIONS=1 \
       -s SINGLE_FILE=1 \
    && mv 2025-01-31-aztec.js ../../js/
*/

#include <emscripten/emscripten.h>
#include <vector>
#include <random>
#include <algorithm>
#include <cmath>
#include <cassert>

// We will use a Mersenne Twister with fixed seed for reproducibility
static std::mt19937 rng(42);

// Global data for final tiling + heatmap
static std::vector<double> aztecData;   // final 2N x 2N matrix (0/1)
static int currentN = 0;
static std::vector<unsigned char> heatMapData;  // RGBA aggregated image
static int heatMapDim = 0;

// --------------------------------------------------------------------------
// Random [0,1)
inline double randU() {
    static std::uniform_real_distribution<double> dist(0.0, 1.0);
    return dist(rng);
}

// We define a type for a single "layer": it is an n x n x 2 structure
using Layer3D = std::vector<std::vector<std::vector<double>>>;
using Layers4D = std::vector<Layer3D>;

// --------------------------------------------------------------------------
static Layers4D d3p(const std::vector<std::vector<double>>& x1)
{
    int n = (int)x1.size();
    Layer3D A(n, std::vector<std::vector<double>>(n, std::vector<double>(2, 0.0)));

    for(int i=0; i<n; i++){
        for(int j=0; j<n; j++){
            if(std::fabs(x1[i][j]) < 1e-14) {
                A[i][j][0] = 1.0;
                A[i][j][1] = 1.0;
            } else {
                A[i][j][0] = x1[i][j];
                A[i][j][1] = 0.0;
            }
        }
    }

    Layers4D AA;
    AA.push_back(A);

    int half = n/2 - 1;
    for(int k=0; k<half; k++){
        int nk = n - 2*k - 2;
        Layer3D C(nk, std::vector<std::vector<double>>(nk, std::vector<double>(2, 0.0)));
        for(int i=0; i<nk; i++){
            for(int j=0; j<nk; j++){
                int ii = i + 2*(i % 2);
                int jj = j + 2*(j % 2);

                auto current = AA[k][ii][jj];
                auto diag    = AA[k][i+1][j+1];
                auto right   = AA[k][ii][j+1];
                auto down    = AA[k][i+1][jj];

                double sumCD = current[1] + diag[1];
                double sumRD = right[1]   + down[1];

                double a2 = 0.0;
                double a2_second = 0.0;

                if (std::fabs(sumCD - sumRD) < 1e-14) {
                    a2 = current[0]*diag[0] + right[0]*down[0];
                    a2_second = sumCD;
                } else if (sumCD < sumRD) {
                    a2 = current[0]*diag[0];
                    a2_second = sumCD;
                } else {
                    a2 = right[0]*down[0];
                    a2_second = sumRD;
                }

                double new0 = 0.0;
                double new1 = 0.0;

                if(std::fabs(a2) > 1e-14){
                    new0 = current[0] / a2;
                }
                new1 = current[1] - a2_second;

                C[i][j][0] = new0;
                C[i][j][1] = new1;
            }
        }
        AA.push_back(C);
    }
    return AA;
}

// --------------------------------------------------------------------------
static std::vector<std::vector<std::vector<double>>>
probs(const std::vector<std::vector<double>>& x1)
{
    Layers4D a0 = d3p(x1);
    int n = (int)a0.size();
    std::vector<std::vector<std::vector<double>>> A;

    for(int k=0; k<n; k++){
        int nk = (int)a0[n - k - 1].size();
        int subSize = nk / 2;
        std::vector<std::vector<double>> C(subSize, std::vector<double>(subSize, 0.0));

        for(int i=0; i<subSize; i++){
            for(int j=0; j<subSize; j++){
                double x00_1 = a0[n - k - 1][2*i][2*j][1];
                double x11_1 = a0[n - k - 1][2*i+1][2*j+1][1];
                double x01_1 = a0[n - k - 1][2*i][2*j+1][1];
                double x10_1 = a0[n - k - 1][2*i+1][2*j][1];

                double x00_0 = a0[n - k - 1][2*i][2*j][0];
                double x11_0 = a0[n - k - 1][2*i+1][2*j+1][0];
                double x01_0 = a0[n - k - 1][2*i][2*j+1][0];
                double x10_0 = a0[n - k - 1][2*i+1][2*j][0];

                double leftSum  = x00_1 + x11_1;
                double rightSum = x10_1 + x01_1;

                if(leftSum > rightSum){
                    C[i][j] = 0.0;
                } else if(leftSum < rightSum){
                    C[i][j] = 1.0;
                } else {
                    double denom = x11_0*x00_0 + x10_0*x01_0;
                    if(std::fabs(denom) < 1e-14){
                        C[i][j] = 0.5;
                    } else {
                        C[i][j] = (x11_0*x00_0)/denom;
                    }
                }
            }
        }
        A.push_back(C);
    }
    return A;
}

// --------------------------------------------------------------------------
static void delslide(std::vector<std::vector<int>>& x0)
{
    int n = (int)x0.size();
    std::vector<std::vector<int>> a0(n+2, std::vector<int>(n+2, 0));

    for(int i=1; i<=n; i++){
        for(int j=1; j<=n; j++){
            a0[i][j] = x0[i-1][j-1];
        }
    }

    for(int i=0; i<n/2; i++){
        for(int j=0; j<n/2; j++){
            if(a0[2*i][2*j] == 1 && a0[2*i+1][2*j+1] == 1){
                a0[2*i][2*j] = 0;
                a0[2*i+1][2*j+1] = 0;
            } else if(a0[2*i][2*j+1] == 1 && a0[2*i+1][2*j] == 1){
                a0[2*i][2*j+1] = 0;
                a0[2*i+1][2*j] = 0;
            }
        }
    }

    for(int i=0; i<=n/2; i++){
        for(int j=0; j<=n/2; j++){
            if(a0[2*i+1][2*j+1] == 1){
                a0[2*i][2*j] = 1; a0[2*i+1][2*j+1] = 0;
            } else if(a0[2*i][2*j] == 1){
                a0[2*i][2*j] = 0; a0[2*i+1][2*j+1] = 1;
            } else if(a0[2*i+1][2*j] == 1){
                a0[2*i][2*j+1] = 1; a0[2*i+1][2*j] = 0;
            } else if(a0[2*i][2*j+1] == 1){
                a0[2*i+1][2*j] = 1; a0[2*i][2*j+1] = 0;
            }
        }
    }

    for(int i=1; i<=n; i++){
        for(int j=1; j<=n; j++){
            x0[i-1][j-1] = a0[i][j];
        }
    }
}

// --------------------------------------------------------------------------
static void create(std::vector<std::vector<int>>& x0,
                   const std::vector<std::vector<double>>& p)
{
    int n = (int)x0.size();
    int half = n/2;

    for(int i=0; i<half; i++){
        for(int j=0; j<half; j++){
            int r = 2*i, c = 2*j;
            if(x0[r][c] == 0 && x0[r+1][c] == 0 && x0[r][c+1] == 0 && x0[r+1][c+1] == 0){
                bool a1 = true, a2 = true, a3 = true, a4 = true;
                if(j>0){
                    a1 = (x0[r][c-1] == 0 && x0[r+1][c-1] == 0);
                }
                if(j<half-1){
                    a2 = (x0[r][c+2] == 0 && x0[r+1][c+2] == 0);
                }
                if(i>0){
                    a3 = (x0[r-1][c] == 0 && x0[r-1][c+1] == 0);
                }
                if(i<half-1){
                    a4 = (x0[r+2][c] == 0 && x0[r+2][c+1] == 0);
                }

                if(a1 && a2 && a3 && a4){
                    double toss = randU();
                    double threshold = 0.5;
                    if(i<(int)p.size() && j<(int)p[i].size()){
                        threshold = p[i][j];
                    }

                    if(toss < threshold){
                        x0[r][c]       = 1;
                        x0[r+1][c+1]   = 1;
                    } else {
                        x0[r+1][c]     = 1;
                        x0[r][c+1]     = 1;
                    }
                }
            }
        }
    }
}

// --------------------------------------------------------------------------
static std::vector<std::vector<int>>
aztecgen(const std::vector<std::vector<std::vector<double>>>& allProbs, int N)
{
    std::vector<std::vector<int>> a1(2, std::vector<int>(2,0));
    {
        double toss = randU();
        double prob = 0.5;
        if(!allProbs.empty() && !allProbs[0].empty() && !allProbs[0][0].empty()){
            prob = allProbs[0][0][0];
        }
        if(toss < prob){
            a1[0][0] = 1; a1[0][1] = 0;
            a1[1][0] = 0; a1[1][1] = 1;
        } else {
            a1[0][0] = 0; a1[0][1] = 1;
            a1[1][0] = 1; a1[1][1] = 0;
        }
    }

    for(int i=0; i<N-1; i++){
        int oldSize = 2 + 2*i;
        int newSize = 2 + 2*(i+1);
        std::vector<std::vector<int>> bigger(newSize, std::vector<int>(newSize, 0));
        for(int r=0; r<oldSize; r++){
            for(int c=0; c<oldSize; c++){
                bigger[r][c] = a1[r][c];
            }
        }
        a1 = bigger;
        delslide(a1);
        if((int)allProbs.size() > (i+1)){
            create(a1, allProbs[i+1]);
        } else {
            std::vector<std::vector<double>> p(newSize/2, std::vector<double>(newSize/2, 0.5));
            create(a1, p);
        }
    }
    return a1;
}

// --------------------------------------------------------------------------
// computeAztec(N): main entry point
EMSCRIPTEN_KEEPALIVE
extern "C" double* computeAztec(int N)
{
    currentN = N;
    int dim = 2*N;

    // Create random 2D weights: 0.2 or 5.0 with p=0.5 each
    std::vector<std::vector<double>> A1a(dim, std::vector<double>(dim,0.0));
    for(int i=0; i<dim; i++){
        for(int j=0; j<dim; j++){
            double toss = randU();
            A1a[i][j] = (toss < 0.5)? 0.2 : 5.0;
        }
    }

    // Probability layers
    auto allProbs = probs(A1a);
    auto finalMatrix = aztecgen(allProbs, N);

    // Store final 2N x 2N in aztecData
    aztecData.resize(dim*dim);
    for(int i=0; i<dim; i++){
        for(int j=0; j<dim; j++){
            aztecData[i*dim + j] = (double)finalMatrix[i][j];
        }
    }

    // Also build the old "heatMapData" feature so it is preserved
    int M = (dim < 100)? dim : 100;
    heatMapDim = M;
    heatMapData.resize(4 * M * M);

    int blockSize = dim / M;
    if(blockSize<1) blockSize=1;

    std::vector<double> blockVals(M*M, 0.0);

    for(int bi=0; bi<M; bi++){
        for(int bj=0; bj<M; bj++){
            double sum=0.0;
            int rowStart = bi*blockSize;
            int colStart = bj*blockSize;
            int count=0;
            for(int r=rowStart; r<rowStart+blockSize; r++){
                for(int c=colStart; c<colStart+blockSize; c++){
                    if(r<dim && c<dim){
                        sum += aztecData[r*dim + c];
                        count++;
                    }
                }
            }
            if(count==0) count=1;
            double avg = sum/double(count);
            blockVals[bi*M + bj] = avg;
        }
    }

    double minV = *std::min_element(blockVals.begin(), blockVals.end());
    double maxV = *std::max_element(blockVals.begin(), blockVals.end());

    for(int i=0; i<M; i++){
        for(int j=0; j<M; j++){
            double val = blockVals[i*M + j];
            double ratio=0.0;
            if(std::fabs(maxV-minV)<1e-14){
                ratio=0.5;
            } else {
                ratio=(val-minV)/(maxV-minV);
            }
            unsigned char r = (unsigned char)(255.0 * ratio);
            unsigned char g = 0;
            unsigned char b = (unsigned char)(255.0 * (1.0-ratio));
            unsigned char a = 255;
            int idx = 4*(i*M + j);
            heatMapData[idx+0]=r;
            heatMapData[idx+1]=g;
            heatMapData[idx+2]=b;
            heatMapData[idx+3]=a;
        }
    }

    return aztecData.data();
}

// --------------------------------------------------------------------------
// Accessors
EMSCRIPTEN_KEEPALIVE
extern "C" double* getAztecData() {
    return aztecData.data();
}

EMSCRIPTEN_KEEPALIVE
extern "C" int getCurrentN() {
    return currentN;
}

EMSCRIPTEN_KEEPALIVE
extern "C" unsigned char* getHeatMapData() {
    return heatMapData.data();
}

EMSCRIPTEN_KEEPALIVE
extern "C" int getHeatMapDim() {
    return heatMapDim;
}

// dummy main
int main(){
    return 0;
}
