/*
emcc 2026-01-07-pipe-dreams-rectangle.cpp -o ../../js/2026-01-07-pipe-dreams-rectangle.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_generatePipeDream','_freeResult','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

Pipe Dreams in a Rectangle Sampler
- Generates random pipe dreams on an N x M grid
- Each cell is cross (prob p) or bump (prob 1-p)
- Optional Demazure reduction: if two pipes try to cross but already crossed, force bump
- Returns grid data, pipe routes, forced bumps, and output permutation as JSON
*/

#include <emscripten.h>
#include <vector>
#include <string>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <random>
#include <sstream>

using namespace std;

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

struct PipeDreamResult {
    int N, M;
    vector<uint8_t> grid;           // N*M, 1=cross, 0=bump
    vector<uint16_t> h_pipes;       // N*(M+1) - horizontal pipe labels
    vector<uint16_t> v_pipes;       // (N+1)*M - vertical pipe labels
    vector<uint8_t> forced_bumps;   // N*M, 1=forced, 0=not forced
    vector<uint16_t> top_outputs;   // M - pipe labels at top edge
    vector<uint16_t> right_outputs; // N - pipe labels at right edge
    int forced_count;

    PipeDreamResult(int n, int m) : N(n), M(m), forced_count(0) {
        grid.resize(N * M);
        h_pipes.resize(N * (M + 1));
        v_pipes.resize((N + 1) * M);
        forced_bumps.resize(N * M, 0);
        top_outputs.resize(M);
        right_outputs.resize(N);
    }

    inline uint8_t& at_grid(int row, int col) {
        return grid[row * M + col];
    }

    inline uint16_t& at_h(int row, int col) {
        return h_pipes[row * (M + 1) + col];
    }

    inline uint16_t& at_v(int row, int col) {
        return v_pipes[row * M + col];
    }

    inline uint8_t& at_forced(int row, int col) {
        return forced_bumps[row * M + col];
    }
};

void generate_random(PipeDreamResult& pd, double p, uint32_t seed) {
    mt19937 rng(seed);
    uniform_real_distribution<double> dist(0.0, 1.0);

    for (int i = 0; i < pd.N * pd.M; i++) {
        pd.grid[i] = (dist(rng) < p) ? 1 : 0;
    }
}

void init_pipes(PipeDreamResult& pd) {
    // Left edge: row 0 (top) = 1, row N-1 (bottom) = N
    for (int row = 0; row < pd.N; row++) {
        pd.at_h(row, 0) = row + 1;
    }

    // Bottom edge: col 0 = N+1, col M-1 = N+M
    for (int col = 0; col < pd.M; col++) {
        pd.at_v(pd.N, col) = pd.N + 1 + col;
    }
}

void compute_demazure(PipeDreamResult& pd) {
    init_pipes(pd);
    pd.forced_count = 0;

    int total_diagonals = pd.N + pd.M - 1;

    // Process diagonals: d = col - row + (N-1)
    // d=0 is bottom-left, d=N+M-2 is top-right
    for (int d = 0; d < total_diagonals; d++) {
        // Update progress
        progressCounter = (d * 100) / total_diagonals;
        emscripten_sleep(0);

        // Cells on same diagonal are independent
        for (int col = 0; col < pd.M; col++) {
            int row = col - d + (pd.N - 1);
            if (row >= 0 && row < pd.N) {
                uint16_t pipe_h = pd.at_h(row, col);      // from left (a)
                uint16_t pipe_v = pd.at_v(row + 1, col);  // from below (b)

                bool is_cross = pd.at_grid(row, col);

                if (is_cross && pipe_h > pipe_v) {
                    // Force cross to bump (pipes already crossed)
                    pd.at_forced(row, col) = 1;
                    pd.forced_count++;
                    // Bump routing: left->top, below->right
                    pd.at_h(row, col + 1) = pipe_v;
                    pd.at_v(row, col) = pipe_h;
                } else if (is_cross) {
                    // Valid cross: left->right, below->top
                    pd.at_h(row, col + 1) = pipe_h;
                    pd.at_v(row, col) = pipe_v;
                } else {
                    // Bump: left->top, below->right
                    pd.at_h(row, col + 1) = pipe_v;
                    pd.at_v(row, col) = pipe_h;
                }
            }
        }
    }

    // Collect outputs
    for (int row = 0; row < pd.N; row++) {
        pd.right_outputs[row] = pd.at_h(row, pd.M);
    }
    for (int col = 0; col < pd.M; col++) {
        pd.top_outputs[col] = pd.at_v(0, col);
    }
}

void compute_no_demazure(PipeDreamResult& pd) {
    init_pipes(pd);

    int total_diagonals = pd.N + pd.M - 1;

    for (int d = 0; d < total_diagonals; d++) {
        progressCounter = (d * 100) / total_diagonals;
        emscripten_sleep(0);

        for (int col = 0; col < pd.M; col++) {
            int row = col - d + (pd.N - 1);
            if (row >= 0 && row < pd.N) {
                uint16_t pipe_h = pd.at_h(row, col);
                uint16_t pipe_v = pd.at_v(row + 1, col);

                bool is_cross = pd.at_grid(row, col);

                if (is_cross) {
                    // Cross: left->right, below->top
                    pd.at_h(row, col + 1) = pipe_h;
                    pd.at_v(row, col) = pipe_v;
                } else {
                    // Bump: left->top, below->right
                    pd.at_h(row, col + 1) = pipe_v;
                    pd.at_v(row, col) = pipe_h;
                }
            }
        }
    }

    // Collect outputs
    for (int row = 0; row < pd.N; row++) {
        pd.right_outputs[row] = pd.at_h(row, pd.M);
    }
    for (int col = 0; col < pd.M; col++) {
        pd.top_outputs[col] = pd.at_v(0, col);
    }
}

string result_to_json(const PipeDreamResult& pd) {
    stringstream json;
    json << "{";

    // Dimensions
    json << "\"N\":" << pd.N << ",";
    json << "\"M\":" << pd.M << ",";

    // Grid (1=cross, 0=bump)
    json << "\"grid\":[";
    for (int i = 0; i < pd.N * pd.M; i++) {
        if (i > 0) json << ",";
        json << (int)pd.grid[i];
    }
    json << "],";

    // Forced bumps
    json << "\"forcedBumps\":[";
    for (int i = 0; i < pd.N * pd.M; i++) {
        if (i > 0) json << ",";
        json << (int)pd.forced_bumps[i];
    }
    json << "],";

    // Horizontal pipes (for drawing)
    json << "\"hPipes\":[";
    for (int i = 0; i < pd.N * (pd.M + 1); i++) {
        if (i > 0) json << ",";
        json << pd.h_pipes[i];
    }
    json << "],";

    // Vertical pipes (for drawing)
    json << "\"vPipes\":[";
    for (int i = 0; i < (pd.N + 1) * pd.M; i++) {
        if (i > 0) json << ",";
        json << pd.v_pipes[i];
    }
    json << "],";

    // Output permutation: top edge (left to right), then right edge (top to bottom)
    json << "\"topOutputs\":[";
    for (int i = 0; i < pd.M; i++) {
        if (i > 0) json << ",";
        json << pd.top_outputs[i];
    }
    json << "],";

    json << "\"rightOutputs\":[";
    for (int i = 0; i < pd.N; i++) {
        if (i > 0) json << ",";
        json << pd.right_outputs[i];
    }
    json << "],";

    // Forced count
    json << "\"forcedCount\":" << pd.forced_count;

    json << "}";
    return json.str();
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* generatePipeDream(int N, int M, double p, int demazure, uint32_t seed) {
    try {
        progressCounter = 0;

        // Validate inputs
        if (N < 1 || N > 2000) N = 100;
        if (M < 1 || M > 2000) M = 100;
        if (p < 0.0 || p > 1.0) p = 0.5;

        PipeDreamResult pd(N, M);

        generate_random(pd, p, seed);

        if (demazure) {
            compute_demazure(pd);
        } else {
            compute_no_demazure(pd);
        }

        progressCounter = 100;

        string resultJson = result_to_json(pd);

        char* result = (char*)malloc(resultJson.size() + 1);
        if (!result) {
            throw runtime_error("Failed to allocate memory");
        }
        strcpy(result, resultJson.c_str());
        return result;
    }
    catch (const exception& e) {
        string errorJson = "{\"error\":\"" + string(e.what()) + "\"}";
        char* result = (char*)malloc(errorJson.size() + 1);
        if (result) {
            strcpy(result, errorJson.c_str());
        }
        progressCounter = 100;
        return result;
    }
}

EMSCRIPTEN_KEEPALIVE
void freeResult(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

} // extern "C"
