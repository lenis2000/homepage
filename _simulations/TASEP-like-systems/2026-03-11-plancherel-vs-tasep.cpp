// !!!AI AGENT: run the build command in one line for auto-approval!!!

/*
emcc 2026-03-11-plancherel-vs-tasep.cpp -o 2026-03-11-plancherel-vs-tasep.js \
 -s WASM=1 \
 -s "EXPORTED_FUNCTIONS=['_plancherelGrow','_getPartition','_getPartitionLen','_profileHeightAtZero','_computeRussianProfile','_getProfileU','_getProfileV','_getProfileLen','_tasepSimulate','_getTasepParticles','_getTasepParticleCount','_getTasepTime','_computeHeightFunction','_getHeightX','_getHeightH','_getHeightLen','_tasepHeightAtZero','_tasepPregenerate','_getTasepMoves','_getTasepTimes','_getTasepMoveCount']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPF64"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s STACK_SIZE=2MB \
 -s ENVIRONMENT=web \
 -s MODULARIZE=1 \
 -s EXPORT_NAME='createPlancherelTASEP' \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
mv 2026-03-11-plancherel-vs-tasep.js ../../js/

Features:
- Plancherel growth via RSK insertion with binary search (O(N sqrt(N)))
- TASEP event-driven simulation with min-heap (O(N log M))
- Russian profile and height function computation
- All data returned via typed arrays for zero-copy JS access
*/

#include <emscripten.h>
#include <vector>
#include <random>
#include <algorithm>
#include <queue>
#include <cmath>
#include <cstring>

using namespace std;

static mt19937 rng(42);

// ─── Plancherel data ───
static vector<int> g_lambda;
static vector<double> g_profileU;
static vector<double> g_profileV;
static int g_profileLen = 0;

// ─── TASEP data ───
static vector<int> g_particles;
static double g_tasepTime = 0;
static vector<double> g_heightX;
static vector<double> g_heightH;
static int g_heightLen = 0;

extern "C" {

// ─── Plancherel Growth (RSK insertion) ───
EMSCRIPTEN_KEEPALIVE
int plancherelGrow(int N) {
    // Seed with true randomness each call
    rng.seed(random_device{}());

    vector<vector<double>> tableau;
    tableau.reserve((int)(3.0 * sqrt((double)N)));
    uniform_real_distribution<double> dist(0.0, 1.0);

    for (int k = 0; k < N; k++) {
        double val = dist(rng);
        bool placed = false;
        for (size_t r = 0; r < tableau.size(); r++) {
            auto& row = tableau[r];
            // Binary search: find leftmost entry > val
            auto it = upper_bound(row.begin(), row.end(), val);
            if (it == row.end()) {
                row.push_back(val);
                placed = true;
                break;
            }
            double bumped = *it;
            *it = val;
            val = bumped;
        }
        if (!placed) {
            tableau.push_back({val});
        }
    }

    g_lambda.resize(tableau.size());
    for (size_t i = 0; i < tableau.size(); i++) {
        g_lambda[i] = (int)tableau[i].size();
    }

    return (int)g_lambda.size();
}

EMSCRIPTEN_KEEPALIVE
int* getPartition() { return g_lambda.data(); }

EMSCRIPTEN_KEEPALIVE
int getPartitionLen() { return (int)g_lambda.size(); }

EMSCRIPTEN_KEEPALIVE
int profileHeightAtZero() {
    int count = 0;
    for (int k = 0; k < (int)g_lambda.size(); k++) {
        if (g_lambda[k] >= k + 1) count++;
        else break;
    }
    return 2 * count;
}

// ─── Russian Profile ───
EMSCRIPTEN_KEEPALIVE
int computeRussianProfile() {
    int ell = (int)g_lambda.size();
    g_profileU.clear();
    g_profileV.clear();

    if (ell == 0) {
        g_profileU.push_back(0);
        g_profileV.push_back(0);
        g_profileLen = 1;
        return 1;
    }

    // Reserve space: at most 2*ell + 1 points
    g_profileU.reserve(2 * ell + 2);
    g_profileV.reserve(2 * ell + 2);

    double currU = -ell, currV = ell;
    g_profileU.push_back(currU);
    g_profileV.push_back(currV);

    int j = 0;
    for (int i = ell - 1; i >= 0; i--) {
        int rightSteps = g_lambda[i] - j;
        if (rightSteps > 0) {
            currU += rightSteps;
            currV += rightSteps;
            g_profileU.push_back(currU);
            g_profileV.push_back(currV);
        }
        j = g_lambda[i];
        currU += 1;
        currV -= 1;
        g_profileU.push_back(currU);
        g_profileV.push_back(currV);
    }

    g_profileLen = (int)g_profileU.size();
    return g_profileLen;
}

EMSCRIPTEN_KEEPALIVE
double* getProfileU() { return g_profileU.data(); }

EMSCRIPTEN_KEEPALIVE
double* getProfileV() { return g_profileV.data(); }

EMSCRIPTEN_KEEPALIVE
int getProfileLen() { return g_profileLen; }

// ─── TASEP Simulation (event-driven with min-heap) ───
EMSCRIPTEN_KEEPALIVE
double tasepSimulate(int N) {
    rng.seed(random_device{}());

    int M = (int)(3.0 * sqrt((double)N)) + 10;
    g_particles.resize(M);

    exponential_distribution<double> expDist(1.0);

    // Min-heap: (time, particle_index)
    using Event = pair<double, int>;
    priority_queue<Event, vector<Event>, greater<Event>> pq;

    for (int k = 0; k < M; k++) {
        g_particles[k] = -k;
        pq.push({expDist(rng), k});
    }

    double time = 0;
    int totalDisp = 0;
    int maxIter = N * 100;
    int iter = 0;

    while (totalDisp < N && iter < maxIter) {
        iter++;
        auto [t, k] = pq.top();
        pq.pop();
        time = t;

        bool canJump = (k == 0) || (g_particles[k] + 1 < g_particles[k - 1]);
        if (canJump) {
            g_particles[k] += 1;
            totalDisp++;
        }
        pq.push({time + expDist(rng), k});
    }

    g_tasepTime = time;
    return time;
}

EMSCRIPTEN_KEEPALIVE
int* getTasepParticles() { return g_particles.data(); }

EMSCRIPTEN_KEEPALIVE
int getTasepParticleCount() { return (int)g_particles.size(); }

EMSCRIPTEN_KEEPALIVE
double getTasepTime() { return g_tasepTime; }

EMSCRIPTEN_KEEPALIVE
int tasepHeightAtZero() {
    int count = 0;
    for (int k = 0; k < (int)g_particles.size(); k++) {
        if (g_particles[k] > 0) count++;
    }
    return 2 * count;
}

// ─── Height Function from particles ───
EMSCRIPTEN_KEEPALIVE
int computeHeightFunction(int xMin, int xMax) {
    int M = (int)g_particles.size();
    int range = xMax - xMin + 1;

    g_heightX.resize(range);
    g_heightH.resize(range);

    // Build occupancy array
    vector<bool> occupied(range, false);
    for (int k = 0; k < M; k++) {
        int p = g_particles[k];
        if (p >= xMin && p <= xMax) {
            occupied[p - xMin] = true;
        }
    }

    // Count particles at positions > xMin
    int countRight = 0;
    for (int k = 0; k < M; k++) {
        if (g_particles[k] > xMin) countRight++;
    }

    double h = 2.0 * countRight + xMin;
    g_heightX[0] = xMin;
    g_heightH[0] = h;

    for (int i = 1; i < range; i++) {
        int eta = occupied[i] ? 1 : 0;
        h += (1.0 - 2.0 * eta);
        g_heightX[i] = xMin + i;
        g_heightH[i] = h;
    }

    g_heightLen = range;
    return range;
}

EMSCRIPTEN_KEEPALIVE
double* getHeightX() { return g_heightX.data(); }

EMSCRIPTEN_KEEPALIVE
double* getHeightH() { return g_heightH.data(); }

EMSCRIPTEN_KEEPALIVE
int getHeightLen() { return g_heightLen; }

// ─── TASEP Pre-generation (for animation replay) ───
static vector<int> g_tasepMoves;
static vector<double> g_tasepTimes;

EMSCRIPTEN_KEEPALIVE
int tasepPregenerate(int N) {
    rng.seed(random_device{}());

    int M = (int)(3.0 * sqrt((double)N)) + 10;
    vector<int> particles(M);
    exponential_distribution<double> expDist(1.0);

    using Event = pair<double, int>;
    priority_queue<Event, vector<Event>, greater<Event>> pq;

    for (int k = 0; k < M; k++) {
        particles[k] = -k;
        pq.push({expDist(rng), k});
    }

    g_tasepMoves.clear();
    g_tasepTimes.clear();
    g_tasepMoves.reserve(N);
    g_tasepTimes.reserve(N);

    double time = 0;
    int totalDisp = 0;
    int maxIter = N * 100;
    int iter = 0;

    while (totalDisp < N && iter < maxIter) {
        iter++;
        auto [t, k] = pq.top();
        pq.pop();
        time = t;

        bool canJump = (k == 0) || (particles[k] + 1 < particles[k - 1]);
        if (canJump) {
            particles[k] += 1;
            totalDisp++;
            g_tasepMoves.push_back(k);
            g_tasepTimes.push_back(time);
        }
        pq.push({time + expDist(rng), k});
    }

    return totalDisp;
}

EMSCRIPTEN_KEEPALIVE
int* getTasepMoves() { return g_tasepMoves.data(); }

EMSCRIPTEN_KEEPALIVE
double* getTasepTimes() { return g_tasepTimes.data(); }

EMSCRIPTEN_KEEPALIVE
int getTasepMoveCount() { return (int)g_tasepMoves.size(); }

} // extern "C"
