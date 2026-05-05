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
#include <cstring>
#include <utility>
#include <algorithm>

// =================  Minimal BigInt (non-negative, base 2^32)  =================
//   Used by the optional exact-rational dynamics path.
//   Operations implemented: +, -, *, /, %, gcd, comparison, bit-shift.
//   Subtraction assumes a >= b (we only subtract within sums where this holds).

namespace fsbi {

struct Bint {
    std::vector<uint32_t> d;     // little-endian, base 2^32

    Bint() {}
    Bint(uint32_t n) { if (n) d.push_back(n); }
    Bint(uint64_t n) {
        if ((uint32_t)n) d.push_back((uint32_t)n);
        if (n >> 32) d.push_back((uint32_t)(n >> 32));
    }

    bool isZero() const { return d.empty(); }
    void normalize() { while (!d.empty() && d.back() == 0) d.pop_back(); }

    int compare(const Bint& o) const {
        if (d.size() != o.d.size()) return d.size() < o.d.size() ? -1 : 1;
        for (int i = (int)d.size() - 1; i >= 0; i--) {
            if (d[i] != o.d[i]) return d[i] < o.d[i] ? -1 : 1;
        }
        return 0;
    }
    bool operator<(const Bint& o)  const { return compare(o) < 0; }
    bool operator<=(const Bint& o) const { return compare(o) <= 0; }
    bool operator>(const Bint& o)  const { return compare(o) > 0; }
    bool operator>=(const Bint& o) const { return compare(o) >= 0; }
    bool operator==(const Bint& o) const { return d == o.d; }

    Bint operator+(const Bint& o) const {
        Bint r;
        size_t n = std::max(d.size(), o.d.size());
        r.d.resize(n);
        uint64_t carry = 0;
        for (size_t i = 0; i < n; i++) {
            uint64_t s = carry + (i < d.size() ? d[i] : 0) + (i < o.d.size() ? o.d[i] : 0);
            r.d[i] = (uint32_t)s;
            carry = s >> 32;
        }
        if (carry) r.d.push_back((uint32_t)carry);
        return r;
    }
    Bint operator-(const Bint& o) const {
        // pre: *this >= o
        Bint r;
        r.d.resize(d.size());
        int64_t borrow = 0;
        for (size_t i = 0; i < d.size(); i++) {
            int64_t a = (int64_t)d[i];
            int64_t b = (i < o.d.size() ? (int64_t)o.d[i] : 0) + borrow;
            if (a >= b) { r.d[i] = (uint32_t)(a - b); borrow = 0; }
            else        { r.d[i] = (uint32_t)((int64_t)0x100000000ll + a - b); borrow = 1; }
        }
        r.normalize();
        return r;
    }
    Bint operator*(const Bint& o) const {
        if (isZero() || o.isZero()) return Bint();
        Bint r;
        r.d.assign(d.size() + o.d.size(), 0);
        for (size_t i = 0; i < d.size(); i++) {
            uint64_t carry = 0;
            for (size_t j = 0; j < o.d.size(); j++) {
                uint64_t prod = (uint64_t)d[i] * o.d[j] + r.d[i + j] + carry;
                r.d[i + j] = (uint32_t)prod;
                carry = prod >> 32;
            }
            size_t k = i + o.d.size();
            while (carry) {
                uint64_t s = (uint64_t)r.d[k] + carry;
                r.d[k] = (uint32_t)s;
                carry = s >> 32;
                k++;
            }
        }
        r.normalize();
        return r;
    }
    int bitLength() const {
        if (isZero()) return 0;
        uint32_t hi = d.back();
        int b = 0; while (hi) { b++; hi >>= 1; }
        return (int)(d.size() - 1) * 32 + b;
    }
    Bint shl(int k) const {
        if (k == 0 || isZero()) return *this;
        int ws = k / 32, bs = k % 32;
        Bint r;
        r.d.assign(d.size() + ws + 1, 0);
        for (size_t i = 0; i < d.size(); i++) {
            uint64_t v = (uint64_t)d[i] << bs;
            r.d[i + ws]     |= (uint32_t)v;
            if (bs) r.d[i + ws + 1] |= (uint32_t)(v >> 32);
        }
        r.normalize();
        return r;
    }
    static std::pair<Bint, Bint> divmod(const Bint& a, const Bint& b) {
        if (a < b) return { Bint(), a };
        // Schoolbook binary long division.  O(bits^2) — fine up to a few
        // thousand bits, which is the regime we need for q-spec rationals.
        Bint q, r;
        int n = a.bitLength();
        q.d.assign(a.d.size(), 0);
        for (int i = n - 1; i >= 0; i--) {
            r = r.shl(1);
            int word = i / 32, bit = i % 32;
            if (word < (int)a.d.size() && ((a.d[word] >> bit) & 1u)) {
                r = r + Bint((uint32_t)1);
            }
            if (r >= b) {
                r = r - b;
                q.d[word] |= (uint32_t)1u << bit;
            }
        }
        q.normalize();
        return { q, r };
    }
    Bint operator/(const Bint& o) const { return divmod(*this, o).first; }
    Bint operator%(const Bint& o) const { return divmod(*this, o).second; }

    // Divide by small uint32 (fast path)
    Bint divSmall(uint32_t k, uint32_t* outRem = nullptr) const {
        Bint r; r.d.resize(d.size());
        uint64_t cur = 0;
        for (int i = (int)d.size() - 1; i >= 0; i--) {
            cur = (cur << 32) | d[i];
            r.d[i] = (uint32_t)(cur / k);
            cur %= k;
        }
        r.normalize();
        if (outRem) *outRem = (uint32_t)cur;
        return r;
    }

    static Bint fromString(const std::string& s) {
        // parse decimal string into Bint
        Bint r;
        for (char c : s) {
            if (c < '0' || c > '9') break;
            // r = r*10 + digit
            // multiply by 10 in place (using divSmall trick reversed)
            uint64_t carry = 0;
            for (size_t i = 0; i < r.d.size(); i++) {
                uint64_t prod = (uint64_t)r.d[i] * 10 + carry;
                r.d[i] = (uint32_t)prod;
                carry = prod >> 32;
            }
            if (carry) r.d.push_back((uint32_t)carry);
            // add digit
            uint32_t add = (uint32_t)(c - '0');
            uint64_t s2 = (r.d.empty() ? 0 : r.d[0]) + add;
            if (r.d.empty()) r.d.push_back(0);
            r.d[0] = (uint32_t)s2;
            uint64_t cy = s2 >> 32;
            size_t i = 1;
            while (cy) {
                if (i >= r.d.size()) r.d.push_back(0);
                uint64_t s3 = (uint64_t)r.d[i] + cy;
                r.d[i] = (uint32_t)s3; cy = s3 >> 32; i++;
            }
        }
        r.normalize();
        return r;
    }
};

inline Bint gcd(Bint a, Bint b) {
    while (!b.isZero()) {
        Bint t = b;
        b = a % b;
        a = t;
    }
    return a;
}

// =================  Rat: positive rational num/den  =================
struct Rat {
    Bint num, den;

    Rat() : num(), den((uint32_t)1) {}
    Rat(Bint p, Bint q) : num(std::move(p)), den(std::move(q)) { reduce(); }

    static Rat one()  { Rat r; r.num = Bint((uint32_t)1); r.den = Bint((uint32_t)1); return r; }
    static Rat zero() { return Rat(); }

    bool isZero() const { return num.isZero(); }

    void reduce() {
        if (num.isZero()) { den = Bint((uint32_t)1); return; }
        Bint g = gcd(num, den);
        if (g > Bint((uint32_t)1)) { num = num / g; den = den / g; }
    }

    Rat operator+(const Rat& o) const { return Rat(num * o.den + o.num * den, den * o.den); }
    Rat operator-(const Rat& o) const { return Rat(num * o.den - o.num * den, den * o.den); } // pre: this >= o
    Rat operator*(const Rat& o) const { return Rat(num * o.num, den * o.den); }
    Rat operator/(const Rat& o) const { return Rat(num * o.den, den * o.num); }

    // Compare a/b vs c/d  ⇔  a*d vs c*b   (all positive)
    int compare(const Rat& o) const { return (num * o.den).compare(o.num * den); }
    bool operator<(const Rat& o) const { return compare(o) < 0; }
};

inline Rat ratPow(Rat base, int n) {
    if (n == 0) return Rat::one();
    if (n < 0) {
        Rat inv;
        inv.num = base.den; inv.den = base.num;
        return ratPow(inv, -n);
    }
    Rat r = Rat::one();
    while (n > 0) {
        if (n & 1) r = r * base;
        base = base * base;
        n >>= 1;
    }
    return r;
}

// Parse rational input: "p/q", "0.123", "5", "" (=0).
inline Rat ratFromString(const std::string& s) {
    if (s.empty()) return Rat::zero();
    size_t slash = s.find('/');
    if (slash != std::string::npos) {
        Bint p = Bint::fromString(s.substr(0, slash));
        Bint q = Bint::fromString(s.substr(slash + 1));
        if (q.isZero()) return Rat::zero();
        return Rat(p, q);
    }
    size_t dot = s.find('.');
    if (dot != std::string::npos) {
        std::string whole = s.substr(0, dot);
        std::string frac  = s.substr(dot + 1);
        // remove trailing whitespace / non-digits in frac
        size_t fl = 0; while (fl < frac.size() && frac[fl] >= '0' && frac[fl] <= '9') fl++;
        frac = frac.substr(0, fl);
        Bint denom((uint32_t)1);
        for (size_t i = 0; i < frac.size(); i++) denom = denom * Bint((uint32_t)10);
        Bint num = Bint::fromString(whole + frac);
        return Rat(num, denom);
    }
    return Rat(Bint::fromString(s), Bint((uint32_t)1));
}

} // namespace fsbi

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
// Rational mirrors used by the exact-rational dynamics path.
static std::vector<fsbi::Rat> xRat, wRat, yRat;
static long long ratStepCount = 0, ratAcceptCount = 0, ratTryCount = 0;

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

// ============== Exact rational dynamics (BigInt rationals)  ==============

static inline fsbi::Rat xValRat(int j) {
    if (j >= 1 && j <= (int)xRat.size()) return xRat[j - 1];
    return fsbi::Rat::one();
}
static inline fsbi::Rat wValRat(int j) {
    if (j >= 1 && j <= (int)wRat.size()) return wRat[j - 1];
    return fsbi::Rat::one();
}
static inline fsbi::Rat yValRat(int k) {
    if (k >= 1 && k <= (int)yRat.size()) return yRat[k - 1];
    return fsbi::Rat::zero();
}

// Returns true with `out` set, false if singular (denominator==0).
static inline bool siteRatPlus(int kind, int j, int i, int v, fsbi::Rat& out) {
    fsbi::Rat num, den;
    if (kind == 0) {
        fsbi::Rat wj = wValRat(j), wj1 = wValRat(j + 1);
        fsbi::Rat ya = yValRat(v + N - i), yb = yValRat(v + N + 1 - i);
        num = wj1 + ya; den = wj + yb;
    } else if (kind == 1) {
        fsbi::Rat xj = xValRat(j), xj1 = xValRat(j + 1);
        fsbi::Rat ya = yValRat(v + j - i), yb = yValRat(v + j + 1 - i);
        num = xj + ya; den = xj1 + yb;
    } else {
        fsbi::Rat xN = xValRat(N), wM = wValRat(M);
        fsbi::Rat ya = yValRat(v + N - i), yb = yValRat(v + N + 1 - i);
        num = xN + ya; den = wM + yb;
    }
    if (den.isZero()) return false;
    out = num / den;
    return true;
}

// Soft cap on heat-bath window so a corner site (hi = INT32_MAX) doesn't
// allocate billions of Rats.  Practical regime: 256 is plenty for q ≤ 0.5.
static constexpr int RAT_HEATBATH_MAX_W = 256;

// 53-bit randomness packed into a Rat for exact uniform sampling.
static inline fsbi::Rat rngRatUnit() {
    // Math.random()-like value in [0, 2^53) over denominator 2^53.
    uint64_t r = rng_next() & ((1ull << 53) - 1ull);
    fsbi::Bint p((uint32_t)0);
    // build 53-bit BigInt:
    p = fsbi::Bint((uint32_t)(r & 0xFFFFFFFFu));
    if (r >> 32) {
        fsbi::Bint hi((uint32_t)(r >> 32));
        // p = p + (hi << 32)
        p = p + hi.shl(32);
    }
    fsbi::Bint denom = fsbi::Bint((uint32_t)1).shl(53);
    return fsbi::Rat(p, denom);
}

static inline int heatBathFlipRat(int kind, int j, int i, int v, int lo, int hi) {
    if (lo == hi) return v;
    int hiCap = hi;
    if ((long long)hiCap - (long long)lo + 1 > RAT_HEATBATH_MAX_W) {
        hiCap = lo + RAT_HEATBATH_MAX_W - 1;
        if (hiCap < v) hiCap = v;
    }
    int width = hiCap - lo + 1;
    static thread_local std::vector<fsbi::Rat> pi;
    pi.assign(width, fsbi::Rat::zero());
    pi[v - lo] = fsbi::Rat::one();
    fsbi::Rat cum = fsbi::Rat::one();
    int hiUsed = v;
    for (int u = v; u + 1 <= hiCap; u++) {
        fsbi::Rat r;
        if (!siteRatPlus(kind, j, i, u, r)) break;
        cum = cum * r;
        pi[u + 1 - lo] = cum;
        hiUsed = u + 1;
    }
    cum = fsbi::Rat::one();
    int loUsed = v;
    for (int u = v - 1; u >= lo; u--) {
        fsbi::Rat r;
        if (!siteRatPlus(kind, j, i, u, r) || r.isZero()) break;
        cum = cum / r;
        pi[u - lo] = cum;
        loUsed = u;
    }
    // Total = sum
    fsbi::Rat total = fsbi::Rat::zero();
    for (int k = loUsed - lo; k <= hiUsed - lo; k++) total = total + pi[k];
    if (total.isZero()) return v;
    fsbi::Rat target = rngRatUnit() * total;
    fsbi::Rat accum = fsbi::Rat::zero();
    for (int k = loUsed - lo; k <= hiUsed - lo; k++) {
        accum = accum + pi[k];
        if (target < accum) return lo + k;
    }
    return hiUsed;
}

static inline int glauberStepRat() {
    int numMu = (M >= 2) ? (M - 1) * N : 0;
    int numLam = (N >= 2) ? (N * (N - 1)) / 2 : 0;
    int numMid = N;
    int total = numMu + numLam + numMid;
    if (total <= 0) return -1;
    uint64_t r64 = rng_next();
    int r = (int)(r64 % (uint64_t)total);

    int changed = 0;
    if (r < numMu) {
        int j = 1 + r / N, i = r % N;
        int v = mu[j][i];
        Bounds b = muBounds(j, i);
        if (v >= b.lo && v <= b.hi) {
            int nv = heatBathFlipRat(0, j, i, v, b.lo, b.hi);
            if (nv != v) { mu[j][i] = nv; changed = 1; }
        }
        ratTryCount++;
    } else if (r < numMu + numLam) {
        int r2 = r - numMu;
        int j = 1, accum = 0;
        while (j <= N - 1 && accum + j <= r2) { accum += j; j++; }
        int i = r2 - accum;
        if (j >= 1 && j <= N - 1 && i >= 0 && i < j) {
            int v = lam[j][i];
            Bounds b = lamBounds(j, i);
            if (v >= b.lo && v <= b.hi) {
                int nv = heatBathFlipRat(1, j, i, v, b.lo, b.hi);
                if (nv != v) { lam[j][i] = nv; changed = 1; }
            }
        }
        ratTryCount++;
    } else {
        int i = r - numMu - numLam;
        int v = mu[M][i];
        Bounds b = midBounds(i);
        if (v >= b.lo && v <= b.hi) {
            int nv = heatBathFlipRat(2, M, i, v, b.lo, b.hi);
            if (nv != v) { mu[M][i] = nv; changed = 1; }
        }
        ratTryCount++;
    }
    if (changed) ratAcceptCount++;
    ratStepCount++;
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

// ---- Rational-mode exports ----
//
// Parameters arrive as a single comma-separated string of rationals (e.g.
// "1/10,1/100,1/1000,...").  We parse on the C++ side so we never need to
// shuttle BigInts across the WASM boundary.

static std::vector<std::string> splitCSV(const char* s) {
    std::vector<std::string> out;
    if (!s) return out;
    std::string cur;
    for (const char* p = s; *p; p++) {
        if (*p == ',') { out.push_back(cur); cur.clear(); }
        else if (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r') { /* skip */ }
        else cur.push_back(*p);
    }
    if (!cur.empty()) out.push_back(cur);
    return out;
}

EMSCRIPTEN_KEEPALIVE
void fs_rat_set_x(const char* csv) {
    auto parts = splitCSV(csv);
    xRat.clear(); xRat.reserve(parts.size());
    for (auto& s : parts) xRat.push_back(fsbi::ratFromString(s));
}
EMSCRIPTEN_KEEPALIVE
void fs_rat_set_w(const char* csv) {
    auto parts = splitCSV(csv);
    wRat.clear(); wRat.reserve(parts.size());
    for (auto& s : parts) wRat.push_back(fsbi::ratFromString(s));
}
EMSCRIPTEN_KEEPALIVE
void fs_rat_set_y(const char* csv) {
    auto parts = splitCSV(csv);
    yRat.clear(); yRat.reserve(parts.size());
    for (auto& s : parts) yRat.push_back(fsbi::ratFromString(s));
}

// Reset rational stat counters (call when state is reset).
EMSCRIPTEN_KEEPALIVE
void fs_rat_reset_stats() {
    ratStepCount = 0; ratAcceptCount = 0; ratTryCount = 0;
}

// Run heat-bath sweeps in exact-rational mode for `numSteps` single-site updates.
EMSCRIPTEN_KEEPALIVE
void fs_rat_sweep(int numSteps) {
    for (int s = 0; s < numSteps; s++) glauberStepRat();
}

EMSCRIPTEN_KEEPALIVE
char* fs_rat_get_stats_json() {
    long long size = 0;
    for (int i = 0; i < N; i++) size += mu[M][i];
    int maxPos = N;
    for (int j = 0; j <= M; j++) {
        int p = mu[j][0] + N;
        if (p > maxPos) maxPos = p;
    }
    for (int j = 1; j <= N; j++) {
        if (j == N) { int p = mu[M][0] + N; if (p > maxPos) maxPos = p; }
        else if (!lam[j].empty()) { int p = lam[j][0] + j; if (p > maxPos) maxPos = p; }
    }
    char buf[256];
    snprintf(buf, sizeof(buf),
             "{\"step\":%lld,\"accept\":%lld,\"tries\":%lld,\"size\":%lld,\"maxPos\":%d}",
             ratStepCount, ratAcceptCount, ratTryCount, size, maxPos);
    return makeCStr(std::string(buf));
}

} // extern "C"
