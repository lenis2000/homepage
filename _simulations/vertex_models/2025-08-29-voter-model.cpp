/*
emcc 2025-08-29-voter-model.cpp -o 2025-08-29-voter-model.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_initializeModel','_stepK','_exportSites','_getTime','_freeString','_malloc','_free']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","HEAPU32"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
mv 2025-08-29-voter-model.js ../../js/
*/

#include <emscripten.h>
#include <vector>
#include <random>
#include <string>
#include <cstring>
#include <cmath>
#include <stdexcept>
#include <sstream>

using namespace std;

// ---------------------------
// Global simulation state
// ---------------------------
static int N_param = 10;             // lattice from -N..N
static int L = 21;                   // 2*N+1
static double simTime = 0.0;

static std::mt19937_64 rng{std::random_device{}()};
static std::uniform_real_distribution<double> U01(0.0,1.0);
static std::uniform_int_distribution<int> sitePicker; // will be reset to [0,L-1]

// Colors as packed 0xRRGGBB
static std::vector<uint32_t> colors;

// ---------------------------
// Utilities
// ---------------------------

static inline double rand01() { return U01(rng); }

// HSL -> RGB helper (h in [0,360), s,l in [0,1])
static void hslToRgb(double h, double s, double l, int &R, int &G, int &B) {
    auto f = [&](double n){
        double k = fmod(n + h/30.0, 12.0);
        double a = s * std::min(l, 1.0 - l);
        double c = l - a * std::max(-1.0, std::min({k-3.0, 9.0-k, 1.0}));
        return std::max(0.0, std::min(1.0, c));
    };
    double r = f(0.0), g = f(8.0), b = f(4.0);
    R = (int)std::round(r * 255.0);
    G = (int)std::round(g * 255.0);
    B = (int)std::round(b * 255.0);
}

static void initColorsRainbow(int L) {
    colors.assign(L, 0u);
    if (L <= 1) {
        int R,G,B; hslToRgb(0.0, 0.8, 0.6, R,G,B);
        colors[0] = (uint32_t)((R<<16) | (G<<8) | B);
        return;
    }
    for (int i = 0; i < L; ++i) {
        double hue = 360.0 - (double)i / (double)(L - 1) * 360.0;
        int R,G,B; hslToRgb(hue, 0.80, 0.60, R,G,B);
        colors[i] = (uint32_t)((R<<16) | (G<<8) | B);
    }
}

static inline double sampleExp(double rate) {
    // Exp(rate): if U~U(0,1), -ln(U)/rate
    double u = std::max(1e-16, rand01());
    return -std::log(u) / rate;
}

// ---------------------------
// Core dynamics
// ---------------------------

static inline void doOneEvent() {
    // Choose time increment and site
    // Total rate = L (each site rate 1)
    simTime += sampleExp((double)L);
    int i = sitePicker(rng);
    if (i > 0) {
        colors[i] = colors[i - 1];
    }
    // if i == 0: nothing changes (no left neighbor)
}

// ---------------------------
// Export helpers
// ---------------------------

static char* make_json(const std::string& s) {
    char* out = (char*)malloc(s.size() + 1);
    std::memcpy(out, s.c_str(), s.size() + 1);
    return out;
}

// ---------------------------
// C API
// ---------------------------
extern "C" {

EMSCRIPTEN_KEEPALIVE
char* initializeModel(int N, uint32_t seed, int init_mode, int palette_colors) {
    try {
        if (N < 1 || N > 10000) {
            throw std::invalid_argument("N must be between 1 and 10000");
        }
        N_param = N;
        L = 2 * N_param + 1;
        simTime = 0.0;

        if (seed == 0) {
            std::random_device rd;
            rng.seed(((uint64_t)rd() << 32) ^ (uint64_t)rd());
        } else {
            rng.seed((uint64_t)seed);
        }
        sitePicker = std::uniform_int_distribution<int>(0, L - 1);

        // init_mode currently: 0 = rainbow palette (ignore palette_colors for now)
        (void)palette_colors;
        if (init_mode == 0) {
            initColorsRainbow(L);
        } else {
            initColorsRainbow(L); // fallback
        }

        std::ostringstream oss;
        oss << "{\"status\":\"initialized\",\"n\":" << N_param << ",\"L\":" << L << "}";
        return make_json(oss.str());
    } catch (const std::exception& e) {
        std::string msg = std::string("{\"error\":\"") + e.what() + "\"}";
        return make_json(msg);
    }
}

EMSCRIPTEN_KEEPALIVE
char* stepK(int k) {
    try {
        if (k < 0) k = 0;
        for (int i = 0; i < k; ++i) doOneEvent();
        std::ostringstream oss;
        oss.setf(std::ios::fixed); oss.precision(12);
        oss << "{\"status\":\"ok\",\"time\":" << simTime << ",\"events\":" << k << "}";
        return make_json(oss.str());
    } catch (const std::exception& e) {
        std::string msg = std::string("{\"error\":\"") + e.what() + "\"}";
        return make_json(msg);
    }
}

EMSCRIPTEN_KEEPALIVE
char* exportSites() {
    uint32_t* ptr = colors.data();
    size_t count = colors.size();
    std::ostringstream oss;
    oss << "{\"ptr\":" << (uintptr_t)ptr << ",\"count\":" << count << "}";
    return make_json(oss.str());
}

EMSCRIPTEN_KEEPALIVE
double getTime() {
    return simTime;
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* p) {
    free(p);
}

} // extern "C"