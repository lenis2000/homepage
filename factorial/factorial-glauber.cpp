/*
 * Glauber dynamics for the factorial Schur process (WASM).
 *
 * Compile:
 *   emcc factorial-glauber.cpp -o factorial-glauber.js \
 *     -s WASM=1 \
 *     -s "EXPORTED_FUNCTIONS=['_fs_init','_fs_set_x','_fs_set_w','_fs_set_y','_fs_sweep','_fs_get_state_json','_fs_get_stats_json','_fs_flip_at','_fs_get_ratios_json','_fs_free']" \
 *     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","HEAPF64","_malloc","_free"]' \
 *     -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=32MB -s ENVIRONMENT=web -s SINGLE_FILE=1 \
 *     -O3 -ffast-math
 *   mv factorial-glauber.js ../../js/
 *
 * Conventions match the JS reference:
 *   mu[j] is N-row (j=0..M); mu[j][i]=0 forced for i>=j by interlacing.
 *   lam[j] is j-row (j=0..N); j-row convention for the lambda chain.
 *   mu[M] === lam[N] (stored inside mu[M], lam[N] is a logical alias).
 *
 * Gibbs ratios (Theorem 1.12 of Y. Li, "Factorial Schur" 2026), 0-indexed:
 *   mu interior  (j in 1..M-1, i in 0..N-1):
 *     up:   (w_{j+1} + y_{v + N - i}) / (w_j     + y_{v + N + 1 - i})
 *     down: (w_j     + y_{v + N - i}) / (w_{j+1} + y_{v + N - 1 - i})
 *   lam interior (j in 1..N-1, i in 0..j-1):
 *     up:   (x_j     + y_{v + j - i}) / (x_{j+1} + y_{v + j + 1 - i})
 *     down: (x_{j+1} + y_{v + j - i}) / (x_j     + y_{v + j - 1 - i})
 *   middle (j=M=N, i in 0..N-1):
 *     up:   (x_N + y_{v + N - i}) / (w_M + y_{v + N + 1 - i})
 *     down: (w_M + y_{v + N - i}) / (x_N + y_{v + N - 1 - i})
 *
 * Glauber: Metropolis-Hastings with symmetric ±1 proposal.
 */

#include <emscripten.h>
#include <vector>
#include <string>
#include <sstream>
#include <cstdint>
#include <cmath>
#include <cstdio>

namespace {

// ---- Xoshiro256++ RNG (fast, fits in registers) ----
static uint64_t s0 = 0x9E3779B97F4A7C15ull;
static uint64_t s1 = 0xBB67AE8584CAA73Bull;
static uint64_t s2 = 0x3C6EF372FE94F82Bull;
static uint64_t s3 = 0xA54FF53A5F1D36F1ull;

static inline uint64_t rotl(const uint64_t x, int k) { return (x << k) | (x >> (64 - k)); }

static inline uint64_t rng_next() {
    const uint64_t result = rotl(s0 + s3, 23) + s0;
    const uint64_t t = s1 << 17;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 45);
    return result;
}
static inline double rng_uniform() {
    // 53 bits to double in [0,1)
    return (rng_next() >> 11) * (1.0 / (uint64_t(1) << 53));
}

// ---- State ----
static int N = 6, M = 6;
static std::vector<std::vector<int>> mu;   // mu[j], j=0..M, size N
static std::vector<std::vector<int>> lam;  // lam[j], j=0..N, lam[j].size()==j; lam[N] aliased separately

static std::vector<double> xArr, wArr, yArr;

static long long stepCount = 0, acceptCount = 0, tryCount = 0;

// ---- Parameter accessors (1-indexed in math; arrays are 0-indexed) ----
static inline double xVal(int j) {
    if (j >= 1 && j <= (int)xArr.size()) return xArr[j - 1];
    return 1.0;
}
static inline double wVal(int j) {
    if (j >= 1 && j <= (int)wArr.size()) return wArr[j - 1];
    return 1.0;
}
static inline double yVal(int k) {
    if (k < 1) return 0.0;
    if (k <= (int)yArr.size()) return yArr[k - 1];
    return 0.0;
}

// ---- Convenience accessors that respect mu[M] === lam[N] alias ----
static inline int& muAt(int j, int i) { return mu[j][i]; }
static inline int  muRead(int j, int i) { return mu[j][i]; }
// lam[j] is j-row for j<N; lam[N] references mu[M].
static inline int lamRead(int j, int i) {
    if (j == N) return mu[M][i];           // alias
    if (i < (int)lam[j].size()) return lam[j][i];
    return 0;
}
static inline void lamWrite(int j, int i, int v) {
    if (j == N) { mu[M][i] = v; return; }
    if (i < (int)lam[j].size()) lam[j][i] = v;
}

// ---- Initialization ----
static void initState() {
    mu.assign(M + 1, std::vector<int>(N, 0));
    lam.assign(N + 1, std::vector<int>());
    for (int j = 0; j <= N; j++) {
        if (j == N) {
            // lam[N] is logically aliased to mu[M]; we keep an empty placeholder.
            lam[j].clear();
        } else {
            lam[j].assign(j, 0);
        }
    }
    stepCount = 0; acceptCount = 0; tryCount = 0;
}

// ---- Interlacing bounds ----
struct Bounds { int lo, hi; };

static inline Bounds muBounds(int j, int i) {
    // mu[j-1] and mu[j+1], both size N
    const auto& below = mu[j - 1];
    const auto& above = mu[j + 1];
    int upperBel = (i == 0) ? INT32_MAX : below[i - 1];
    int lowerBel = below[i];
    int upperAbo = above[i];
    int lowerAbo = (i == N - 1) ? 0 : above[i + 1];
    int lo = lowerBel > lowerAbo ? lowerBel : lowerAbo;
    int hi = upperBel < upperAbo ? upperBel : upperAbo;
    return { lo, hi };
}

static inline Bounds lamBounds(int j, int i) {
    // j in 1..N-1, i in 0..j-1
    // below = lam[j-1] (size j-1; for j=1 size 0)
    // above = lam[j+1] (size j+1; for j+1=N this is alias of mu[M] size N)
    const int belSize = (int)lam[j - 1].size();
    int upperBel = (i == 0) ? INT32_MAX : (i - 1 < belSize ? lam[j - 1][i - 1] : 0);
    int lowerBel = (i < belSize) ? lam[j - 1][i] : 0;
    int upperAbo, lowerAbo;
    if (j + 1 == N) {
        upperAbo = mu[M][i];
        lowerAbo = (i + 1 < N) ? mu[M][i + 1] : 0;
    } else {
        const auto& above = lam[j + 1];
        upperAbo = above[i];
        lowerAbo = (i + 1 < (int)above.size()) ? above[i + 1] : 0;
    }
    int lo = lowerBel > lowerAbo ? lowerBel : lowerAbo;
    int hi = upperBel < upperAbo ? upperBel : upperAbo;
    return { lo, hi };
}

static inline Bounds midBounds(int i) {
    const auto& muBel = mu[M - 1];
    const int lamN1 = N - 1;                                // (N-1)-part
    const int lamN1Size = (lamN1 >= 0) ? (int)lam[lamN1].size() : 0;

    int upperMu = (i == 0) ? INT32_MAX : muBel[i - 1];
    int lowerMu = muBel[i];
    int upperLam = (i == 0) ? INT32_MAX : (i - 1 < lamN1Size ? lam[lamN1][i - 1] : 0);
    int lowerLam = (i < lamN1Size) ? lam[lamN1][i] : 0;
    int lo = lowerMu > lowerLam ? lowerMu : lowerLam;
    int hi = upperMu < upperLam ? upperMu : upperLam;
    return { lo, hi };
}

// ---- Gibbs ratios ----
struct Ratios { double rPlus, rMinus; };

static inline Ratios muRatios(int j, int i, int v) {
    double wj = wVal(j), wj1 = wVal(j + 1);
    double a = yVal(v + N - i);
    double b = yVal(v + N + 1 - i);
    double c = yVal(v + N - 1 - i);
    return { (wj1 + a) / (wj + b), (wj + a) / (wj1 + c) };
}
static inline Ratios lamRatios(int j, int i, int v) {
    double xj = xVal(j), xj1 = xVal(j + 1);
    double a = yVal(v + j - i);
    double b = yVal(v + j + 1 - i);
    double c = yVal(v + j - 1 - i);
    return { (xj + a) / (xj1 + b), (xj1 + a) / (xj + c) };
}
static inline Ratios midRatios(int i, int v) {
    double xN = xVal(N), wM = wVal(M);
    double a = yVal(v + N - i);
    double b = yVal(v + N + 1 - i);
    double c = yVal(v + N - 1 - i);
    return { (xN + a) / (wM + b), (wM + a) / (xN + c) };
}

// ---- Heat-bath / exact local Gibbs sampling on [lo, hi] (log-space) ----
//
// Site-specific upward ratio r_+(v) = pi(v+1)/pi(v).  We compute log r_+(v)
// from log(num) - log(denom) where num, denom are sums of two strictly positive
// products; logaddexp keeps the y-contribution alive even when |log w − log y|
// is huge.  Then the local conditional is sampled by exponentiating and
// normalising — no rejection, so heavy biases (e.g. q = 0.1) don't stall.

static inline double safeLog(double x) {
    if (x <= 0.0) return -1e300;
    return std::log(x);
}
static inline double logAddExp(double a, double b) {
    if (a < b) { double t = a; a = b; b = t; }
    if (b <= -1e290) return a;
    return a + std::log1p(std::exp(b - a));
}
// log(p+q) given logs of p and q, both nonnegative
static inline double logSumOfTwo(double logP, double logQ) {
    return logAddExp(logP, logQ);
}

// log r_+(v) for the given site (kind: 0=mu, 1=lam, 2=mid)
static inline double siteLogRPlus(int kind, int j, int i, int v) {
    if (kind == 0) {
        double logwj  = safeLog(wVal(j));
        double logwj1 = safeLog(wVal(j + 1));
        double logya  = safeLog(yVal(v + N - i));
        double logyb  = safeLog(yVal(v + N + 1 - i));
        return logSumOfTwo(logwj1, logya) - logSumOfTwo(logwj, logyb);
    } else if (kind == 1) {
        double logxj  = safeLog(xVal(j));
        double logxj1 = safeLog(xVal(j + 1));
        double logya  = safeLog(yVal(v + j - i));
        double logyb  = safeLog(yVal(v + j + 1 - i));
        return logSumOfTwo(logxj, logya) - logSumOfTwo(logxj1, logyb);
    } else {
        double logxN  = safeLog(xVal(N));
        double logwM  = safeLog(wVal(M));
        double logya  = safeLog(yVal(v + N - i));
        double logyb  = safeLog(yVal(v + N + 1 - i));
        return logSumOfTwo(logxN, logya) - logSumOfTwo(logwM, logyb);
    }
}

// Heat-bath sample: pick new v' in [lo, hi] from the conditional distribution.
//
// At the i=0 corner (or top of the lambda strip) the interlacing upper bound
// is unbounded.  We cap the window to a practical size and stop early when
// the upward log-weight has dropped enough that the remaining tail is
// negligible — for q-specialisations log r_+(v) → log(q) < 0 as v grows, so
// the probability mass beyond that point is < eps and is safely ignored.
static constexpr int HEAT_BATH_MAX_WIDTH = 4096;
static constexpr double HEAT_BATH_LOG_TAIL_EPS = -40.0;  // exp(-40) ~ 4e-18

static inline int heatBathFlip(int kind, int j, int i, int v, int lo, int hi) {
    if (lo == hi) return v;
    // Soft-cap hi; the dynamics is asymptotically geometric so the tail is harmless.
    int hiCap = hi;
    if ((long long)hiCap - (long long)lo + 1 > HEAT_BATH_MAX_WIDTH) {
        hiCap = lo + HEAT_BATH_MAX_WIDTH - 1;
        if (hiCap < v) hiCap = v;
    }
    int width = hiCap - lo + 1;
    static thread_local std::vector<double> logw;
    if ((int)logw.size() < width) logw.assign(width, 0.0);
    // Anchor at v: logw[v - lo] = 0; build outward.
    logw[v - lo] = 0.0;
    double cum = 0.0;
    int hiUsed = v;
    for (int u = v; u + 1 <= hiCap; u++) {
        cum += siteLogRPlus(kind, j, i, u);
        logw[(u + 1) - lo] = cum;
        hiUsed = u + 1;
        // early exit if the running log-weight is far below the peak so far
        if (cum < HEAT_BATH_LOG_TAIL_EPS - 5.0) {
            // Need to keep going only if cum could still climb back. For
            // q-spec it cannot (log r_+ → log(q) < 0), so we can stop.
            // Conservative: break only if cum has been monotonically decreasing.
            if (u >= v + 4) break;
        }
    }
    cum = 0.0;
    int loUsed = v;
    for (int u = v - 1; u >= lo; u--) {
        cum -= siteLogRPlus(kind, j, i, u);
        logw[u - lo] = cum;
        loUsed = u;
        if (cum < HEAT_BATH_LOG_TAIL_EPS - 5.0 && u <= v - 4) break;
    }
    // Normaliser over the actually-populated window
    int kStart = loUsed - lo;
    int kEnd   = hiUsed - lo;     // inclusive
    double mx = logw[kStart];
    for (int k = kStart + 1; k <= kEnd; k++) if (logw[k] > mx) mx = logw[k];
    double S = 0.0;
    for (int k = kStart; k <= kEnd; k++) S += std::exp(logw[k] - mx);
    double r = rng_uniform() * S;
    double accum = 0.0;
    for (int k = kStart; k <= kEnd; k++) {
        accum += std::exp(logw[k] - mx);
        if (r <= accum) return lo + k;
    }
    return loUsed > kEnd ? loUsed : (lo + kEnd);
}

// ---- One Glauber step ----
static inline int glauberStep() {
    int numMu = (M >= 2) ? (M - 1) * N : 0;
    int numLam = (N >= 2) ? (N * (N - 1)) / 2 : 0;
    int numMid = N;
    int total = numMu + numLam + numMid;
    if (total <= 0) return -1;

    // Random integer in [0, total)
    uint64_t r64 = rng_next();
    int r = (int)(r64 % (uint64_t)total);

    int changed = 0;
    if (r < numMu) {
        int j = 1 + r / N;
        int i = r % N;
        int v = mu[j][i];
        Bounds b = muBounds(j, i);
        if (v >= b.lo && v <= b.hi) {
            int nv = heatBathFlip(0, j, i, v, b.lo, b.hi);
            if (nv != v) { mu[j][i] = nv; changed = 1; }
        }
        tryCount++;
    } else if (r < numMu + numLam) {
        int r2 = r - numMu;
        int j = 1, accum = 0;
        while (j <= N - 1 && accum + j <= r2) { accum += j; j++; }
        int i = r2 - accum;
        if (j >= 1 && j <= N - 1 && i >= 0 && i < j) {
            int v = lam[j][i];
            Bounds b = lamBounds(j, i);
            if (v >= b.lo && v <= b.hi) {
                int nv = heatBathFlip(1, j, i, v, b.lo, b.hi);
                if (nv != v) { lam[j][i] = nv; changed = 1; }
            }
        }
        tryCount++;
    } else {
        int i = r - numMu - numLam;
        int v = mu[M][i];
        Bounds b = midBounds(i);
        if (v >= b.lo && v <= b.hi) {
            int nv = heatBathFlip(2, M, i, v, b.lo, b.hi);
            if (nv != v) { mu[M][i] = nv; changed = 1; }
        }
        tryCount++;
    }
    if (changed) acceptCount++;
    stepCount++;
    return changed;
}

// ---- Returned strings (caller frees) ----
static char* makeCStr(const std::string& s) {
    char* p = (char*)malloc(s.size() + 1);
    std::memcpy(p, s.c_str(), s.size() + 1);
    return p;
}

} // namespace

// ============== Exported API ==============
extern "C" {

EMSCRIPTEN_KEEPALIVE
void fs_init(int n, int m, uint32_t seed) {
    N = n; M = m;
    initState();
    if (seed != 0) {
        s0 = seed | 1ull; s1 = (uint64_t)(seed) * 0x9E3779B97F4A7C15ull;
        s2 = ~(uint64_t)seed; s3 = ((uint64_t)seed << 32) ^ 0xDEADBEEFCAFEBABEull;
        // Burn a few values to mix
        for (int i = 0; i < 8; i++) (void)rng_next();
    }
}

EMSCRIPTEN_KEEPALIVE
void fs_set_x(const double* ptr, int len) {
    xArr.assign(ptr, ptr + len);
}
EMSCRIPTEN_KEEPALIVE
void fs_set_w(const double* ptr, int len) {
    wArr.assign(ptr, ptr + len);
}
EMSCRIPTEN_KEEPALIVE
void fs_set_y(const double* ptr, int len) {
    yArr.assign(ptr, ptr + len);
}

EMSCRIPTEN_KEEPALIVE
void fs_sweep(int numSteps) {
    for (int s = 0; s < numSteps; s++) glauberStep();
}

// Single forced flip (returns 1 if applied, 0 otherwise). dir = +1 or -1.
EMSCRIPTEN_KEEPALIVE
int fs_flip_at(int kind, int j, int i, int dir) {
    // kind: 0=mu, 1=lam, 2=mid
    if (kind == 0) {
        if (j < 1 || j > M - 1 || i < 0 || i >= N) return 0;
        int v = mu[j][i];
        Bounds b = muBounds(j, i);
        int nv = v + dir;
        if (nv < b.lo || nv > b.hi) return 0;
        mu[j][i] = nv;
        return 1;
    } else if (kind == 1) {
        if (j < 1 || j > N - 1 || i < 0 || i >= j) return 0;
        int v = lam[j][i];
        Bounds b = lamBounds(j, i);
        int nv = v + dir;
        if (nv < b.lo || nv > b.hi) return 0;
        lam[j][i] = nv;
        return 1;
    } else if (kind == 2) {
        if (i < 0 || i >= N) return 0;
        int v = mu[M][i];
        Bounds b = midBounds(i);
        int nv = v + dir;
        if (nv < b.lo || nv > b.hi) return 0;
        mu[M][i] = nv;
        return 1;
    }
    return 0;
}

// Return JSON of state (mu and lam arrays + sizes).
EMSCRIPTEN_KEEPALIVE
char* fs_get_state_json() {
    std::ostringstream os;
    os << "{\"N\":" << N << ",\"M\":" << M << ",\"mu\":[";
    for (int j = 0; j <= M; j++) {
        if (j) os << ",";
        os << "[";
        for (int i = 0; i < N; i++) { if (i) os << ","; os << mu[j][i]; }
        os << "]";
    }
    os << "],\"lam\":[";
    for (int j = 0; j <= N; j++) {
        if (j) os << ",";
        os << "[";
        if (j == N) {
            for (int i = 0; i < N; i++) { if (i) os << ","; os << mu[M][i]; }
        } else {
            for (int i = 0; i < (int)lam[j].size(); i++) { if (i) os << ","; os << lam[j][i]; }
        }
        os << "]";
    }
    os << "]}";
    return makeCStr(os.str());
}

EMSCRIPTEN_KEEPALIVE
char* fs_get_stats_json() {
    std::ostringstream os;
    long long size = 0;
    for (int i = 0; i < N; i++) size += mu[M][i];
    int maxPos = N;
    for (int j = 0; j <= M; j++) {
        int p = mu[j][0] + N;          // 1-indexed approx
        if (p > maxPos) maxPos = p;
    }
    for (int j = 1; j <= N; j++) {
        if (j == N) { int p = mu[M][0] + N; if (p > maxPos) maxPos = p; }
        else if (!lam[j].empty()) { int p = lam[j][0] + j; if (p > maxPos) maxPos = p; }
    }
    os << "{\"step\":" << stepCount << ",\"accept\":" << acceptCount
       << ",\"tries\":" << tryCount << ",\"size\":" << size
       << ",\"maxPos\":" << maxPos << "}";
    return makeCStr(os.str());
}

// Return ratios + bounds for a given site, useful for the detailed-mode panel.
// kind: 0=mu, 1=lam, 2=mid.
EMSCRIPTEN_KEEPALIVE
char* fs_get_ratios_json(int kind, int j, int i) {
    std::ostringstream os;
    int v = 0; Bounds b{0, 0}; Ratios rr{0.0, 0.0}; int valid = 0;
    if (kind == 0 && j >= 1 && j <= M - 1 && i >= 0 && i < N) {
        v = mu[j][i]; b = muBounds(j, i); rr = muRatios(j, i, v); valid = 1;
    } else if (kind == 1 && j >= 1 && j <= N - 1 && i >= 0 && i < j) {
        v = lam[j][i]; b = lamBounds(j, i); rr = lamRatios(j, i, v); valid = 1;
    } else if (kind == 2 && i >= 0 && i < N) {
        v = mu[M][i]; b = midBounds(i); rr = midRatios(i, v); valid = 1;
    }
    char buf[256];
    int finiteHi = (b.hi > 1000000000) ? 1000000000 : b.hi;
    snprintf(buf, sizeof(buf),
        "{\"valid\":%d,\"v\":%d,\"lo\":%d,\"hi\":%d,\"rPlus\":%.10g,\"rMinus\":%.10g}",
        valid, v, b.lo, finiteHi, rr.rPlus, rr.rMinus);
    os << buf;
    return makeCStr(os.str());
}

EMSCRIPTEN_KEEPALIVE
void fs_free(char* p) { free(p); }

} // extern "C"
