/*
emcc 2026-01-07-pipe-dreams-rectangle.cpp -o ../../js/2026-01-07-pipe-dreams-rectangle.js \
  -s WASM=1 \
  -s ASYNCIFY=1 \
  -s "EXPORTED_FUNCTIONS=['_generatePipeDreamBinary','_getN','_getM','_getGridPtr','_getForcedPtr','_getHPipesPtr','_getVPipesPtr','_getTopOutputsPtr','_getRightOutputsPtr','_getForcedCount','_freeResultBinary','_getProgress']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','wasmMemory']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=256MB \
  -s ENVIRONMENT=web \
  -s SINGLE_FILE=1 \
  -O3 -ffast-math -flto

Pipe Dreams in a Rectangle Sampler (Optimized Binary API)
- Generates random pipe dreams on an N x M grid
- Each cell is cross (prob p) or bump (prob 1-p)
- Optional Demazure reduction: if two pipes try to cross but already crossed, force bump
- Binary data transfer via direct WASM heap access (no JSON overhead)
*/

#include <emscripten.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>

// Fast xorshift128+ RNG (much faster than mt19937)
struct XorShift128Plus {
    uint64_t s[2];

    inline void seed(uint64_t seed) {
        s[0] = seed;
        s[1] = seed ^ 0x5555555555555555ULL;
        // Warm up
        for (int i = 0; i < 16; i++) next();
    }

    inline uint64_t next() {
        uint64_t s1 = s[0];
        const uint64_t s0 = s[1];
        s[0] = s0;
        s1 ^= s1 << 23;
        s[1] = s1 ^ s0 ^ (s1 >> 18) ^ (s0 >> 5);
        return s[1] + s0;
    }

    // Returns value in [0, 1)
    inline double nextDouble() {
        return (next() >> 11) * (1.0 / 9007199254740992.0);
    }
};

// Global result storage (avoids malloc/free overhead)
struct PipeDreamResult {
    int N, M;
    uint8_t* grid;           // N*M, 1=cross, 0=bump
    uint16_t* h_pipes;       // N*(M+1) - horizontal pipe labels
    uint16_t* v_pipes;       // (N+1)*M - vertical pipe labels
    uint8_t* forced_bumps;   // N*M, 1=forced, 0=not forced
    uint16_t* top_outputs;   // M - pipe labels at top edge
    uint16_t* right_outputs; // N - pipe labels at right edge
    int forced_count;

    PipeDreamResult() : N(0), M(0), grid(nullptr), h_pipes(nullptr),
                        v_pipes(nullptr), forced_bumps(nullptr),
                        top_outputs(nullptr), right_outputs(nullptr),
                        forced_count(0) {}

    void allocate(int n, int m) {
        // Free previous if different size
        if (N != n || M != m) {
            deallocate();
            N = n;
            M = m;
            grid = new uint8_t[N * M]();
            h_pipes = new uint16_t[N * (M + 1)]();
            v_pipes = new uint16_t[(N + 1) * M]();
            forced_bumps = new uint8_t[N * M]();
            top_outputs = new uint16_t[M]();
            right_outputs = new uint16_t[N]();
        } else {
            // Same size - just zero out
            memset(grid, 0, N * M);
            memset(h_pipes, 0, N * (M + 1) * sizeof(uint16_t));
            memset(v_pipes, 0, (N + 1) * M * sizeof(uint16_t));
            memset(forced_bumps, 0, N * M);
            memset(top_outputs, 0, M * sizeof(uint16_t));
            memset(right_outputs, 0, N * sizeof(uint16_t));
        }
        forced_count = 0;
    }

    void deallocate() {
        delete[] grid; grid = nullptr;
        delete[] h_pipes; h_pipes = nullptr;
        delete[] v_pipes; v_pipes = nullptr;
        delete[] forced_bumps; forced_bumps = nullptr;
        delete[] top_outputs; top_outputs = nullptr;
        delete[] right_outputs; right_outputs = nullptr;
        N = M = 0;
    }

    ~PipeDreamResult() {
        deallocate();
    }
};

// Global instance
static PipeDreamResult g_result;
static volatile int progressCounter = 0;

// Inline accessors for better performance
#define AT_GRID(row, col) g_result.grid[(row) * g_result.M + (col)]
#define AT_H(row, col) g_result.h_pipes[(row) * (g_result.M + 1) + (col)]
#define AT_V(row, col) g_result.v_pipes[(row) * g_result.M + (col)]
#define AT_FORCED(row, col) g_result.forced_bumps[(row) * g_result.M + (col)]

static void generate_random(double p, uint32_t seed) {
    XorShift128Plus rng;
    rng.seed(seed);

    const int N = g_result.N;
    const int M = g_result.M;
    uint8_t* __restrict__ grid = g_result.grid;

    // Generate in cache-friendly order
    for (int i = 0; i < N * M; i++) {
        grid[i] = (rng.nextDouble() < p) ? 1 : 0;
    }
}

static void init_pipes() {
    const int N = g_result.N;
    const int M = g_result.M;

    // Left edge: row 0 (top) = 1, row N-1 (bottom) = N
    for (int row = 0; row < N; row++) {
        AT_H(row, 0) = row + 1;
    }

    // Bottom edge: col 0 = N+1, col M-1 = N+M
    for (int col = 0; col < M; col++) {
        AT_V(N, col) = N + 1 + col;
    }
}

static void compute_demazure() {
    init_pipes();
    g_result.forced_count = 0;

    const int N = g_result.N;
    const int M = g_result.M;
    const int total_diagonals = N + M - 1;

    // Determine sleep frequency based on grid size
    const int sleep_freq = (N + M > 2000) ? 500 : ((N + M > 500) ? 200 : 50);

    // Process diagonals: d = col - row + (N-1)
    for (int d = 0; d < total_diagonals; d++) {
        // Update progress less frequently
        if (d % sleep_freq == 0) {
            progressCounter = (d * 100) / total_diagonals;
            emscripten_sleep(0);
        }

        // Cells on same diagonal are independent
        for (int col = 0; col < M; col++) {
            const int row = col - d + (N - 1);
            if (row >= 0 && row < N) {
                const uint16_t pipe_h = AT_H(row, col);      // from left
                const uint16_t pipe_v = AT_V(row + 1, col);  // from below

                const bool is_cross = AT_GRID(row, col);

                if (is_cross && pipe_h > pipe_v) {
                    // Force cross to bump (pipes already crossed)
                    AT_FORCED(row, col) = 1;
                    g_result.forced_count++;
                    // Bump routing
                    AT_H(row, col + 1) = pipe_v;
                    AT_V(row, col) = pipe_h;
                } else if (is_cross) {
                    // Valid cross
                    AT_H(row, col + 1) = pipe_h;
                    AT_V(row, col) = pipe_v;
                } else {
                    // Bump
                    AT_H(row, col + 1) = pipe_v;
                    AT_V(row, col) = pipe_h;
                }
            }
        }
    }

    // Collect outputs
    for (int row = 0; row < N; row++) {
        g_result.right_outputs[row] = AT_H(row, M);
    }
    for (int col = 0; col < M; col++) {
        g_result.top_outputs[col] = AT_V(0, col);
    }
}

static void compute_no_demazure() {
    init_pipes();

    const int N = g_result.N;
    const int M = g_result.M;
    const int total_diagonals = N + M - 1;

    const int sleep_freq = (N + M > 2000) ? 500 : ((N + M > 500) ? 200 : 50);

    for (int d = 0; d < total_diagonals; d++) {
        if (d % sleep_freq == 0) {
            progressCounter = (d * 100) / total_diagonals;
            emscripten_sleep(0);
        }

        for (int col = 0; col < M; col++) {
            const int row = col - d + (N - 1);
            if (row >= 0 && row < N) {
                const uint16_t pipe_h = AT_H(row, col);
                const uint16_t pipe_v = AT_V(row + 1, col);

                if (AT_GRID(row, col)) {
                    // Cross
                    AT_H(row, col + 1) = pipe_h;
                    AT_V(row, col) = pipe_v;
                } else {
                    // Bump
                    AT_H(row, col + 1) = pipe_v;
                    AT_V(row, col) = pipe_h;
                }
            }
        }
    }

    // Collect outputs
    for (int row = 0; row < N; row++) {
        g_result.right_outputs[row] = AT_H(row, M);
    }
    for (int col = 0; col < M; col++) {
        g_result.top_outputs[col] = AT_V(0, col);
    }
}

extern "C" {

// Generate pipe dream, store in global result
// Returns 0 on success, -1 on error
EMSCRIPTEN_KEEPALIVE
int generatePipeDreamBinary(int N, int M, double p, int demazure, uint32_t seed) {
    progressCounter = 0;

    // Validate and clamp inputs
    if (N < 1) N = 1;
    if (N > 10000) N = 10000;
    if (M < 1) M = 1;
    if (M > 10000) M = 10000;
    if (p < 0.0) p = 0.0;
    if (p > 1.0) p = 1.0;

    // Allocate/reuse storage
    g_result.allocate(N, M);

    // Generate random grid
    generate_random(p, seed);

    // Compute pipe routes
    if (demazure) {
        compute_demazure();
    } else {
        compute_no_demazure();
    }

    progressCounter = 100;
    return 0;
}

// Accessor functions - return pointers to global result data
EMSCRIPTEN_KEEPALIVE
int getN() {
    return g_result.N;
}

EMSCRIPTEN_KEEPALIVE
int getM() {
    return g_result.M;
}

EMSCRIPTEN_KEEPALIVE
uint8_t* getGridPtr() {
    return g_result.grid;
}

EMSCRIPTEN_KEEPALIVE
uint8_t* getForcedPtr() {
    return g_result.forced_bumps;
}

EMSCRIPTEN_KEEPALIVE
uint16_t* getHPipesPtr() {
    return g_result.h_pipes;
}

EMSCRIPTEN_KEEPALIVE
uint16_t* getVPipesPtr() {
    return g_result.v_pipes;
}

EMSCRIPTEN_KEEPALIVE
uint16_t* getTopOutputsPtr() {
    return g_result.top_outputs;
}

EMSCRIPTEN_KEEPALIVE
uint16_t* getRightOutputsPtr() {
    return g_result.right_outputs;
}

EMSCRIPTEN_KEEPALIVE
int getForcedCount() {
    return g_result.forced_count;
}

EMSCRIPTEN_KEEPALIVE
void freeResultBinary() {
    g_result.deallocate();
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

} // extern "C"
