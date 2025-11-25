/*
emcc 2025-11-25-sln-6v.cpp -o 2025-11-25-sln-6v.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_runSimulation','_getPaths','_freeString','_malloc','_free']" \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=128MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math
mv 2025-11-25-sln-6v.js ../../js/
*/

#include <emscripten.h>
#include <vector>
#include <random>
#include <string>
#include <cstring>
#include <cmath>
#include <sstream>
#include <iomanip>

using namespace std;

// ---------------------------
// Global simulation state
// ---------------------------
static int N_param = 250;      // vertical size (time)
static int HORN_param = 250;   // horizontal size
static double B1_param = 0.5;  // probability of going straight up
static double B2_param = 0.1;  // probability of going straight right
static double P1_param = 1.0;  // Bernoulli prob for left boundary
static double P2_param = 0.0;  // Bernoulli prob for bottom boundary

static std::mt19937_64 rng{std::random_device{}()};
static std::uniform_real_distribution<double> U01(0.0, 1.0);

// W[t][x][4]: 0=in_left, 1=in_bottom, 2=out_up, 3=out_right
static std::vector<std::vector<std::vector<int>>> W;

// Path storage: for each initial path i, store sequence of (x, y) coordinates
// paths[i] = vector of {x, y} pairs
static std::vector<std::vector<std::pair<int,int>>> paths;

// Rainbow colors for each path
static std::vector<std::string> pathColors;

// ---------------------------
// Utilities
// ---------------------------

static inline double rand01() { return U01(rng); }

// HSL to RGB conversion (h in [0,360), s,l in [0,1])
static void hslToRgb(double h, double s, double l, int &R, int &G, int &B) {
    auto f = [&](double n) {
        double k = fmod(n + h / 30.0, 12.0);
        double a = s * std::min(l, 1.0 - l);
        double c = l - a * std::max(-1.0, std::min({k - 3.0, 9.0 - k, 1.0}));
        return std::max(0.0, std::min(1.0, c));
    };
    double r = f(0.0), g = f(8.0), b = f(4.0);
    R = (int)std::round(r * 255.0);
    G = (int)std::round(g * 255.0);
    B = (int)std::round(b * 255.0);
}

static std::string rgbToHex(int R, int G, int B) {
    std::ostringstream oss;
    oss << "#" << std::hex << std::setfill('0')
        << std::setw(2) << R
        << std::setw(2) << G
        << std::setw(2) << B;
    return oss.str();
}

static void initRainbowColors(int numPaths) {
    pathColors.clear();
    pathColors.reserve(numPaths);

    for (int i = 0; i < numPaths; ++i) {
        // Nonlinear rainbow with more vibrant colors
        // Use cubic mapping for more interesting color distribution
        double t = (numPaths > 1) ? (double)i / (double)(numPaths - 1) : 0.0;

        // Nonlinear transformation: cubic ease gives more separation in middle colors
        double t_nonlinear = t * t * (3.0 - 2.0 * t);  // Smoothstep

        // Full spectrum from red (0) through violet (270) to magenta (300)
        double hue = 300.0 * (1.0 - t_nonlinear);

        // Vary saturation and lightness for more depth
        double saturation = 0.95 - 0.15 * sin(t * 3.14159);  // 0.80 to 0.95
        double lightness = 0.50 + 0.10 * cos(t * 3.14159 * 2.0);  // 0.40 to 0.60

        int R, G, B;
        hslToRgb(hue, saturation, lightness, R, G, B);
        pathColors.push_back(rgbToHex(R, G, B));
    }
}

// ---------------------------
// SL_n Vertex Model Simulation
// ---------------------------

static void initializeGrid() {
    // Allocate W[n][horn][4]
    W.assign(N_param, std::vector<std::vector<int>>(HORN_param, std::vector<int>(4, 0)));

    // Boundary condition: W[t][0][1] = t (incoming from left boundary)
    for (int t = 0; t < N_param; ++t) {
        W[t][0][1] = t;
    }
}

static void runVertexModel() {
    for (int t = 0; t < N_param; ++t) {
        for (int x = 0; x < HORN_param; ++x) {
            int in_left = W[t][x][0];    // incoming from left
            int in_bottom = W[t][x][1];  // incoming from bottom
            int out_up, out_right;

            if (in_bottom > in_left) {
                // Case 1: bottom > left
                double u = rand01();
                if (u < B2_param) {
                    // Go right with probability b2
                    out_up = in_left;
                    out_right = in_bottom;
                } else {
                    // Cross: swap
                    out_up = in_bottom;
                    out_right = in_left;
                }
            } else if (in_bottom < in_left) {
                // Case 2: bottom < left
                double u = rand01();
                if (u < B1_param) {
                    // Go up with probability b1
                    out_up = in_left;
                    out_right = in_bottom;
                } else {
                    // Cross: swap
                    out_up = in_bottom;
                    out_right = in_left;
                }
            } else {
                // Case 3: equal (degenerate)
                out_up = in_left;
                out_right = in_bottom;
            }

            // Store outputs
            W[t][x][2] = out_up;
            W[t][x][3] = out_right;

            // Propagate to neighbors
            if (t < N_param - 1) {
                W[t + 1][x][0] = out_up;  // up becomes left input for next time
            }
            if (x < HORN_param - 1) {
                W[t][x + 1][1] = out_right;  // right becomes bottom input for next column
            }
        }
    }
}

static void extractPaths() {
    // Extract individual paths by tracing each initial value from boundary
    // Each path starts at (0, t) where t is the path index
    paths.clear();
    paths.resize(N_param);

    for (int pathIdx = 0; pathIdx < N_param; ++pathIdx) {
        // Path pathIdx starts at time t = pathIdx, x = 0
        int t = pathIdx;
        int x = 0;

        paths[pathIdx].push_back({x, t});

        // Trace the path through the grid
        while (t < N_param && x < HORN_param) {
            // Find which output carries this path's value
            int out_up = W[t][x][2];
            int out_right = W[t][x][3];

            if (out_up == pathIdx) {
                // Path goes up
                t++;
                if (t < N_param) {
                    paths[pathIdx].push_back({x, t});
                }
            } else if (out_right == pathIdx) {
                // Path goes right
                x++;
                if (x < HORN_param) {
                    paths[pathIdx].push_back({x, t});
                }
            } else {
                // Path ended or merged
                break;
            }
        }
    }
}

// ---------------------------
// JSON helpers
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
char* runSimulation(int n, int horn, double b1, double b2, uint32_t seed) {
    try {
        // Validate parameters
        if (n < 1 || n > 2000) n = 500;
        if (horn < 1 || horn > 2000) horn = 500;
        if (b1 < 0.0 || b1 > 1.0) b1 = 0.5;
        if (b2 < 0.0 || b2 > 1.0) b2 = 0.1;

        N_param = n;
        HORN_param = horn;
        B1_param = b1;
        B2_param = b2;

        // Seed RNG
        if (seed == 0) {
            std::random_device rd;
            rng.seed(((uint64_t)rd() << 32) ^ (uint64_t)rd());
        } else {
            rng.seed((uint64_t)seed);
        }

        // Initialize colors
        initRainbowColors(n);

        // Run simulation
        initializeGrid();
        runVertexModel();
        extractPaths();

        std::ostringstream oss;
        oss << "{\"status\":\"ok\",\"n\":" << N_param
            << ",\"horn\":" << HORN_param
            << ",\"b1\":" << B1_param
            << ",\"b2\":" << B2_param
            << ",\"numPaths\":" << paths.size() << "}";
        return make_json(oss.str());

    } catch (const std::exception& e) {
        std::string msg = std::string("{\"error\":\"") + e.what() + "\"}";
        return make_json(msg);
    }
}

EMSCRIPTEN_KEEPALIVE
char* getPaths() {
    try {
        std::ostringstream oss;
        oss << "{\"n\":" << N_param << ",\"horn\":" << HORN_param << ",\"paths\":[";

        bool firstPath = true;
        for (size_t i = 0; i < paths.size(); ++i) {
            if (paths[i].size() < 2) continue;  // Skip trivial paths

            if (!firstPath) oss << ",";
            firstPath = false;

            oss << "{\"color\":\"" << pathColors[i] << "\",\"points\":[";

            bool firstPoint = true;
            for (const auto& pt : paths[i]) {
                if (!firstPoint) oss << ",";
                firstPoint = false;
                oss << "[" << pt.first << "," << pt.second << "]";
            }
            oss << "]}";
        }

        oss << "]}";
        return make_json(oss.str());

    } catch (const std::exception& e) {
        std::string msg = std::string("{\"error\":\"") + e.what() + "\"}";
        return make_json(msg);
    }
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* p) {
    free(p);
}

} // extern "C"
