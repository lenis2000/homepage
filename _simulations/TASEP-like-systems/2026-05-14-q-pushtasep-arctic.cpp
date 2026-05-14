/*
Matveev-Petrov Bernoulli q-PushTASEP boundary sampler for the t-deformed Aztec.

Following the prescription:
  Sample the boundary observable B_m = lambda'(m)_1, m = 1, ..., n,
  via the space-time anti-diagonal B_m = R_m(n+1-m)
  where R_j(t) = lambda_1^{(j)}(t) is the rightmost particle at level j
  after t time steps of Bernoulli q-PushTASEP.

In R-coordinates (rightmost particle of each level, indexed j = 0..N-1 for
levels 1..N), update rule per time step (sequential j = 0..N-1):
  - For particle j with level parameter b_j and time parameter a_t,
    voluntary jump prob p_j = a_t * b_j / (1 + a_t * b_j).
  - j = 0: move = voluntary.
  - j >= 1: if previous did not move, move = voluntary.
            if previous DID move:
              if voluntary, move = 1;
              else push with prob q^{R_j(t) - R_{j-1}(t)} where R values are OLD positions
              before this time step's updates.

Interlacing R[j] >= R[j-1] is preserved at every step.

For the homogeneous AZTEC test bench we use a_t = alpha (time param) and
b_j = beta (level param), with q = t the HL parameter from the AZTEC paper.

Output JSON: {"R": [[R_0(0), R_1(0), ..., R_{N-1}(0)], [R_0(1), ...], ...],
              "B": [B_1, B_2, ..., B_n]}.

Compile:
emcc 2026-05-14-q-pushtasep-arctic.cpp -o 2026-05-14-q-pushtasep-arctic.js \
 -s WASM=1 -s ASYNCIFY=1 \
 -s MODULARIZE=1 \
 -s "EXPORT_NAME='createQPushModule'" \
 -s "EXPORTED_FUNCTIONS=['_sampleQPushTrajectory','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s ENVIRONMENT=web -s SINGLE_FILE=1 \
 -O3 -flto -DNDEBUG
*/

#include <emscripten.h>
#include <vector>
#include <string>
#include <cmath>
#include <random>
#include <cstring>
#include <cstdlib>
#include <cstdio>

using namespace std;

static std::mt19937 rng(std::random_device{}());
static std::uniform_real_distribution<double> uniform01(0.0, 1.0);
volatile int progressCounter = 0;

inline double qpow(double q, int n) {
    if (n <= 0)   return 1.0;
    if (q <= 0.0) return 0.0;
    if (q >= 1.0) return 1.0;
    return std::exp(static_cast<double>(n) * std::log1p(q - 1.0));
}

inline int bernoulli(double p) {
    if (p <= 0.0) return 0;
    if (p >= 1.0) return 1;
    return uniform01(rng) < p ? 1 : 0;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* sampleQPushTrajectory(int n, double alpha, double beta, double q) {
    progressCounter = 0;
    try {
        const int N = n, T = n;

        // R[j] = lambda_1^{(j+1)} after the latest time step (0-indexed in j)
        vector<long long> R(N, 0);
        vector<long long> R_old(N, 0);
        vector<char> moved(N, 0);

        // Store full R trajectory (for visualization of particles)
        vector<vector<long long>> trajR;
        trajR.reserve(T + 1);
        trajR.push_back(R);

        // Boundary curve B[m-1] = R_{m-1}(n+1-m), 0-indexed by m-1
        vector<long long> B(N, -1);

        const double ab = alpha * beta;
        const double p_vol = ab / (1.0 + ab);

        const int yield_every = max(1, T / 50);

        for (int t = 1; t <= T; ++t) {
            // Snapshot OLD positions before any update this step.
            R_old = R;

            // Particle 0 (no upstream blocker / no push from above)
            int v = bernoulli(p_vol);
            moved[0] = v;
            if (v) R[0] += 1;

            for (int j = 1; j < N; ++j) {
                int voluntary = bernoulli(p_vol);
                int mv;
                if (!moved[j - 1]) {
                    mv = voluntary;
                } else {
                    if (voluntary) {
                        mv = 1;
                    } else {
                        long long gap = R_old[j] - R_old[j - 1];
                        if (gap < 0) gap = 0; // defensive
                        double push_p = qpow(q, (int)gap);
                        mv = bernoulli(push_p);
                    }
                }
                moved[j] = mv;
                if (mv) R[j] += 1;
                // Interlacing must hold after every update:
                // R[j] should be >= R[j-1].
            }

            trajR.push_back(R);

            // Anti-diagonal: at time t, record B[m-1] for m = n+1-t.
            // i.e. m_index = m - 1 = (n+1-t) - 1 = n - t.  This is in [0, n-1].
            int m_index = N - t;
            if (m_index >= 0 && m_index < N) {
                B[m_index] = R[m_index];
            }

            if (t % yield_every == 0) {
                progressCounter = 5 + (90 * t) / T;
                emscripten_sleep(0);
            }
        }

        // JSON
        string out;
        out.reserve((size_t)N * (T + 2) * 6 + 100);
        char buf[32];

        out = "{\"R\":[";
        for (size_t t = 0; t < trajR.size(); ++t) {
            if (t) out += ',';
            out += '[';
            for (int j = 0; j < N; ++j) {
                if (j) out += ',';
                int len = snprintf(buf, sizeof(buf), "%lld", trajR[t][j]);
                out.append(buf, len);
            }
            out += ']';
        }
        out += "],\"B\":[";
        for (int m = 0; m < N; ++m) {
            if (m) out += ',';
            int len = snprintf(buf, sizeof(buf), "%lld", B[m]);
            out.append(buf, len);
        }
        out += "]}";

        progressCounter = 100;
        char* cstr = (char*)malloc(out.size() + 1);
        if (cstr) std::memcpy(cstr, out.c_str(), out.size() + 1);
        return cstr;
    } catch (const std::exception& e) {
        progressCounter = 100;
        string err = string("{\"error\":\"") + e.what() + "\"}";
        char* cstr = (char*)malloc(err.size() + 1);
        if (cstr) std::memcpy(cstr, err.c_str(), err.size() + 1);
        return cstr;
    }
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) { free(str); }

EMSCRIPTEN_KEEPALIVE
int getProgress() { return progressCounter; }

} // extern "C"
