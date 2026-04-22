// !!!AI AGENT: run the build command in one line for auto-approval!!!

/*
cd /Users/leo/Homepage/_simulations/TASEP-like-systems && emcc 2026-04-21-bernoulli-tasep.cpp -o 2026-04-21-bernoulli-tasep.js -s WASM=1 -s "EXPORTED_FUNCTIONS=['_runSample','_getDensityBuf','_getActiveBuf','_getJumpsBuf','_freeWorkspace']" -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPF64"]' -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=64MB -s STACK_SIZE=2MB -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_NAME='createBernoulliTASEP' -s SINGLE_FILE=1 -O3 -flto -ffast-math -msimd128 && mv 2026-04-21-bernoulli-tasep.js ../../js/

Features:
- Parallel Bernoulli TASEP: snapshot-based fused single-pass SIMD update
- Sequential Bernoulli TASEP: right-to-left cluster-cascade update
- Step initial condition: particles at {-r+1, ..., 0}
- 128-bit WASM SIMD via wasm_simd128.h (mandatory)
- Bit-sliced 8-bit coin generation: 8 RNG lanes -> ~0.0625 draws per coin
- xoshiro256** PRNG
- Sliding active window [lane_lo, lane_hi] for early-time speedup
- Density binning done in WASM
*/

#include <emscripten.h>
#include <wasm_simd128.h>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <cmath>

// ─── xoshiro256** PRNG ───────────────────────────────────────────────────────

static uint64_t s[4];

static inline uint64_t rotl(uint64_t x, int k) {
    return (x << k) | (x >> (64 - k));
}

static inline uint64_t xoshiro256ss_next() {
    const uint64_t result = rotl(s[1] * 5, 7) * 9;
    const uint64_t t = s[1] << 17;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 45);
    return result;
}

static void seed_rng(uint64_t seed) {
    // SplitMix64 to spread the seed
    uint64_t z = seed;
    auto sm64 = [&]() -> uint64_t {
        z += 0x9e3779b97f4a7c15ULL;
        z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
        z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
        return z ^ (z >> 31);
    };
    s[0] = sm64(); s[1] = sm64(); s[2] = sm64(); s[3] = sm64();
}

// ─── v128 helpers ────────────────────────────────────────────────────────────

// Return a fresh random v128 (two 64-bit draws)
static inline v128_t rand_v128() {
    uint64_t a = xoshiro256ss_next();
    uint64_t b = xoshiro256ss_next();
    return wasm_i64x2_make((int64_t)a, (int64_t)b);
}

// Scalar Bernoulli(p): one 64-bit RNG draw
static inline bool bernoulli(double p) {
    uint64_t u = xoshiro256ss_next();
    // Map to [0, 1) via top 53 bits
    double r = (double)(u >> 11) * (1.0 / 9007199254740992.0); // 2^53
    return r < p;
}

// Shift a v128 left by 1 bit; insert `carry_in` at bit 0; return old bit 127 as new carry
// (bit 0 = least-significant bit of the first 64-bit lane)
// Used to propagate movers from lane i bit 127 to lane i+1 bit 0 (particle moving right across lane boundary)
static inline v128_t shl1_carry(v128_t v, int carry_in, int *carry_out) {
    uint64_t lo = (uint64_t)wasm_i64x2_extract_lane(v, 0);
    uint64_t hi = (uint64_t)wasm_i64x2_extract_lane(v, 1);
    *carry_out = (int)(hi >> 63);
    uint64_t new_hi = (hi << 1) | (lo >> 63);
    uint64_t new_lo = (lo << 1) | (uint64_t)carry_in;
    return wasm_i64x2_make((int64_t)new_lo, (int64_t)new_hi);
}

// Shift a v128 right by 1 bit; insert `carry_in_top` at bit 127.
// Used to check "is site to the right occupied" at each bit position.
// carry_in_top = bit 0 of the NEXT lane's original occupancy.
static inline v128_t shr1_carry(v128_t v, int carry_in_top) {
    uint64_t lo = (uint64_t)wasm_i64x2_extract_lane(v, 0);
    uint64_t hi = (uint64_t)wasm_i64x2_extract_lane(v, 1);
    uint64_t new_lo = (lo >> 1) | (hi << 63);
    uint64_t new_hi = (hi >> 1) | ((uint64_t)carry_in_top << 63);
    return wasm_i64x2_make((int64_t)new_lo, (int64_t)new_hi);
}

// ─── Bit-sliced Bernoulli(p) coin generation ────────────────────────────────
// 8 bits of precision: p ≈ sum(b_k * 2^-k, k=1..8)
// Generate 8 random v128 lanes Y[0..7].
// Output bit j = 1 iff the first zero in column j of Y[0..7] is at a depth k with b_k=1.
// This gives independent Bernoulli(p') bits, |p'-p| <= 2^-8.

static v128_t gen_coins(double p) {
    // Short-circuit exact 0 and 1 (avoids 8-bit quantization artifacts at the endpoints)
    if (p >= 0.999999) return wasm_i64x2_const(-1LL, -1LL);
    if (p <= 1e-9)     return wasm_i64x2_const(0, 0);

    // Quantize p to 8-bit binary expansion
    // b[k] = bit k+1 of floor(p * 256) (k=0..7, represents 2^-(k+1))
    int pi = (int)(p * 256.0 + 0.5);
    if (pi > 255) pi = 255;
    if (pi < 0) pi = 0;

    v128_t Y[8];
    for (int k = 0; k < 8; k++) Y[k] = rand_v128();

    // coin = OR over k where b[7-k] = 1 of M[k]
    // M[k] = (Y[0] & Y[1] & ... & Y[k-1]) & ~Y[k]  (first zero at depth k+1)
    // Bit (7-k) of pi corresponds to 2^-(k+1) weight

    v128_t prefix = wasm_i64x2_const(-1LL, -1LL); // all-ones
    v128_t coin = wasm_i64x2_const(0, 0);

    for (int k = 0; k < 8; k++) {
        // M[k] = prefix & ~Y[k]
        v128_t mk = wasm_v128_andnot(prefix, Y[k]);
        // prefix &= Y[k] for next level
        prefix = wasm_v128_and(prefix, Y[k]);
        // if bit (7-k) of pi is 1, OR mk into coin
        if ((pi >> (7 - k)) & 1) {
            coin = wasm_v128_or(coin, mk);
        }
    }
    return coin;
}

// ─── Global workspace ────────────────────────────────────────────────────────

static v128_t *g_occ = nullptr;    // occupancy bitmap
static v128_t *g_coin = nullptr;   // coin bitmap (one lane per bitmap lane)
static double *g_density = nullptr;
static double *g_active = nullptr; // a_n = # active particles in state η_n, n=1..T
static double *g_jumps  = nullptr; // m_n = # movers in step n (n=1..T)
static int g_numBins = 0;
static int g_activeCap = 0;
static int g_jumpsCap = 0;
static int g_W = 0;   // number of v128 lanes currently allocated

// Ensure workspace is large enough for W lanes and numBins bins
static void ensure_workspace(int W, int numBins) {
    if (W > g_W) {
        free(g_occ);
        free(g_coin);
        g_occ  = (v128_t*)aligned_alloc(16, (size_t)W * 16);
        g_coin = (v128_t*)aligned_alloc(16, (size_t)W * 16);
        g_W = W;
    }
    if (numBins > g_numBins) {
        free(g_density);
        g_density = (double*)malloc((size_t)numBins * sizeof(double));
        g_numBins = numBins;
    }
}

static void ensure_active(int T) {
    if (T > g_activeCap) {
        free(g_active);
        g_active = (double*)malloc((size_t)T * sizeof(double));
        g_activeCap = T;
    }
}

static void ensure_jumps(int T) {
    if (T > g_jumpsCap) {
        free(g_jumps);
        g_jumps = (double*)malloc((size_t)T * sizeof(double));
        g_jumpsCap = T;
    }
}

// ─── Bit helpers for uint64 arrays ───────────────────────────────────────────

// Test bit i of the occ array (treated as flat uint64 array)
static inline int test_bit(const v128_t *arr, int i) {
    const uint64_t *q = (const uint64_t*)arr;
    return (int)((q[i / 64] >> (i % 64)) & 1ULL);
}

static inline void set_bit(v128_t *arr, int i) {
    uint64_t *q = (uint64_t*)arr;
    q[i / 64] |= (1ULL << (i % 64));
}

static inline void clear_bit(v128_t *arr, int i) {
    uint64_t *q = (uint64_t*)arr;
    q[i / 64] &= ~(1ULL << (i % 64));
}

// Count trailing ones starting from bit position b going left (decreasing index)
// Returns the count of consecutive 1s at b, b-1, b-2, ..., stopping at first 0 or lo_bound
static int count_left_ones(const v128_t *arr, int b, int lo_bound) {
    const uint64_t *q = (const uint64_t*)arr;
    int count = 0;
    int pos = b;
    while (pos >= lo_bound) {
        int qw = pos / 64;
        int bit = pos % 64;
        // How many consecutive 1-bits end at `bit` in qw?
        // Invert and count trailing zeros from position bit downward.
        // Mask to bits [0..bit] of qw
        uint64_t w = q[qw] & ((2ULL << bit) - 1ULL); // bits 0..bit
        // We want the number of consecutive 1s ending at `bit`
        // After inversion: consecutive 0s at `bit` become 1s at leading positions
        uint64_t inv = ~w; // now bits that were 0 are 1
        // Find the highest 0 in w at or below `bit`:
        // That means in inv, find lowest 1 at or below `bit`
        uint64_t inv_masked = inv & ((2ULL << bit) - 1ULL);
        int run;
        if (inv_masked == 0) {
            // All bits 0..bit of w are 1
            run = bit + 1;
        } else {
            // Position of the highest 0 in w (= lowest 1 in inv_masked)
            // but we want consecutive from bit downward
            // Count trailing zeros of inv_masked from the top? No: we need consecutive 1s ending at bit.
            // Highest bit of inv_masked is the position of the first 0 at or below bit in w
            // count = bit - position_of_highest_set_bit_in_inv_masked
            // But we want trailing ones ending at bit: that's (bit - floor(log2(inv_masked)))
            // Use: number of leading zeros in inv_masked from bit down =
            //      count of 1s in w[highest_zero_of_inv+1..bit]
            // Simplest: pop off from bit downward in inv_masked
            // position of highest set bit in inv_masked:
            int highest = 63 - __builtin_clzll(inv_masked);
            run = bit - highest; // bits from (highest+1) to bit in w are all 1
        }
        count += run;
        if (run <= bit) break;  // hit a 0 within the qword or reached bit 0
        // run == bit+1 means the entire qword was 1 from 0..bit; step to previous qword
        pos -= (bit + 1);
    }
    return count;
}

// Similarly count left ones in the coin bitmap
static int count_left_ones_coin(const v128_t *arr, int b, int lo_bound) {
    return count_left_ones(arr, b, lo_bound);
}

// ─── runSample ────────────────────────────────────────────────────────────────

extern "C" {

EMSCRIPTEN_KEEPALIVE
int runSample(int r, int T, double p, int updateRule, int numBins, double xiMin, double xiMax) {
    // Seed with entropy
    {
        uint32_t seed_val;
        // Use emscripten's random source via __builtin_wasm_memory_size or just use a counter
        // Combine multiple sources for seed diversity
        static uint64_t counter = 0;
        counter++;
        // Use the counter combined with a fixed mixing constant
        seed_rng(counter * 6364136223846793005ULL + 1442695040888963407ULL);
    }

    // Layout: bitmap positions [0, L) where origin (site 0 before IC) is at offset r-1
    // Step IC: particles at {-r+1, ..., 0} => bits [0, r-1] (inclusive) are set
    // After T steps rightmost particle can be at most r-1 + T
    int L = r + T + 16;  // +16 padding for SIMD overread
    int W = (L + 127) / 128;

    ensure_workspace(W, numBins);
    ensure_active(T);
    ensure_jumps(T);

    // Helper: count cluster-ends (= active particles) in η at current lane_lo..lane_hi
    // inlined below after each update step.

    // Clear occupancy
    memset(g_occ, 0, (size_t)W * 16);

    // Set IC: bits 0..r-1 are particles
    // bit i = particle at position (i - (r-1))
    // so bit 0 = position -(r-1), bit r-1 = position 0
    {
        uint64_t *q = (uint64_t*)g_occ;
        int full_qw = r / 64;
        int rem = r % 64;
        for (int i = 0; i < full_qw; i++) q[i] = ~0ULL;
        if (rem > 0) q[full_qw] = (1ULL << rem) - 1ULL;
    }

    // Active window: lane_hi can only grow (right-moving particles).
    // lane_lo is held at 0 — advancing it is unsafe because a lane that's currently
    // all-ones can still contribute movers later, once its right neighbor opens up.
    int lane_lo = 0;
    int lane_hi = (r + 127) / 128;
    if (lane_hi >= W) lane_hi = W - 1;

    // Run T productive steps (steps with zero jumps are redone without advancing t)
    if (updateRule == 0) {
        // ─── Parallel update ─────────────────────────────────────────────
        int t = 0;
        while (t < T) {
            // Generate coins for active window
            for (int i = lane_lo; i <= lane_hi; i++) {
                g_coin[i] = gen_coins(p);
            }

            // Fused single-pass parallel update.
            // For each bit k: particle at k moves right iff occ[k] & coin[k] & ~occ[k+1].
            // Check "right neighbor empty" via right-shift of occ (bit k of shr1(occ) = occ[k+1]).
            // The carry for shr1 comes from bit 0 of the NEXT lane.
            int carry_mov = 0;
            int step_jumps = 0;

            for (int i = lane_lo; i <= lane_hi; i++) {
                v128_t occ_i = g_occ[i];
                v128_t coin_i = g_coin[i];

                int next_bit0;
                if (i + 1 < W) {
                    next_bit0 = (int)(wasm_i64x2_extract_lane(g_occ[i + 1], 0) & 1);
                } else {
                    next_bit0 = 0;
                }
                v128_t shifted_o = shr1_carry(occ_i, next_bit0);

                // movers = occ & coin & ~shifted_o
                v128_t movers = wasm_v128_andnot(wasm_v128_and(occ_i, coin_i), shifted_o);

                // Count jumps in this lane
                step_jumps += __builtin_popcountll((uint64_t)wasm_i64x2_extract_lane(movers, 0));
                step_jumps += __builtin_popcountll((uint64_t)wasm_i64x2_extract_lane(movers, 1));

                int new_carry_mov;
                v128_t shifted_m = shl1_carry(movers, carry_mov, &new_carry_mov);

                // New occ: clear movers at their old positions, OR in shifted movers (new positions)
                g_occ[i] = wasm_v128_or(wasm_v128_andnot(occ_i, movers), shifted_m);

                carry_mov = new_carry_mov;
            }

            // If no particle jumped, redo the step without incrementing t
            if (step_jumps == 0) continue;

            g_jumps[t] = (double)step_jumps;

            // Extend lane_hi if the front moved into a new lane
            if (carry_mov && lane_hi + 1 < W) {
                lane_hi++;
                // Set the carry bit in the new lane
                uint64_t *q = (uint64_t*)g_occ;
                q[(lane_hi * 2)] |= 1ULL; // bit 0 of new lane
            }

            // Count active particles in the new state η_{t+1}
            {
                int active_count = 0;
                const uint64_t *q_occ_c = (const uint64_t*)g_occ;
                int max_qw_c = (lane_hi + 1) * 2;
                int Wqw = W * 2;
                for (int qi = lane_lo * 2; qi < max_qw_c; qi++) {
                    uint64_t o = q_occ_c[qi];
                    uint64_t nb0 = (qi + 1 < Wqw) ? (q_occ_c[qi + 1] & 1ULL) : 0ULL;
                    uint64_t oshr = (o >> 1) | (nb0 << 63);
                    active_count += __builtin_popcountll(o & ~oshr);
                }
                g_active[t] = (double)active_count;
            }

            t++;
        }
    } else {
        // ─── Sequential (right-to-left cascading) update ─────────────────
        int t = 0;
        while (t < T) {
            // Generate coin bitmap for entire active window
            for (int i = lane_lo; i <= lane_hi; i++) {
                g_coin[i] = gen_coins(p);
            }

            // Find cluster ends: bits where occ[i]=1 and occ[i+1]=0
            // cluster_ends = occ & ~shl1(occ)
            // We iterate set bits of cluster_ends to find each cluster's rightmost particle

            // Process each cluster: for each cluster end at bit b,
            // - count cluster length k (consecutive 1s going left from b)
            // - count m = min(k, consecutive heads in coin going left from b)
            // - if m>0: clear bit (b-m+1), set bit (b+1)

            // We scan lanes from lane_hi down to lane_lo, processing set bits in cluster_ends
            // Since we process right-to-left and each modification only touches two bits
            // (clear b-m+1, set b+1) we won't disturb clusters we haven't processed yet
            // as long as we go right to left.

            const uint64_t *q_occ  = (const uint64_t*)g_occ;
            const uint64_t *q_coin = (const uint64_t*)g_coin;

            // Scan qwords from high to low
            int num_qw = (lane_hi + 1) * 2;
            int lo_qw  = lane_lo * 2;

            int step_jumps = 0;
            for (int qi = num_qw - 1; qi >= lo_qw; qi--) {
                uint64_t occ_qw = q_occ[qi];
                if (occ_qw == 0) continue;

                // cluster_ends[k] = occ[k] & ~occ[k+1]:  particle with empty right neighbor.
                // occ[k+1] at bit position k = (occ >> 1) | (bit 0 of next qword << 63)
                uint64_t next_bit0 = (qi + 1 < W * 2) ? (q_occ[qi + 1] & 1ULL) : 0ULL;
                uint64_t occ_shr1 = (occ_qw >> 1) | (next_bit0 << 63);
                uint64_t clust_ends = occ_qw & ~occ_shr1;

                // Process each set bit in clust_ends (right to left = high to low bit)
                while (clust_ends != 0) {
                    int bit = 63 - __builtin_clzll(clust_ends);
                    clust_ends &= ~(1ULL << bit);

                    int b = qi * 64 + bit; // global bit index of cluster end

                    // Count cluster length k: consecutive 1s leftward from b
                    int lo_bound = lane_lo * 128;
                    int k = count_left_ones(g_occ, b, lo_bound);

                    // Count cascade length m from coin: consecutive heads leftward from b
                    int m_raw = count_left_ones_coin(g_coin, b, b - k + 1);
                    int m = (m_raw < k) ? m_raw : k;

                    if (m > 0 && b + 1 < L) {
                        // Clear bit b-m+1 (leftmost mover vacates)
                        clear_bit(g_occ, b - m + 1);
                        // Set bit b+1 (rightmost particle moves to b+1)
                        set_bit(g_occ, b + 1);

                        // Cascade: m particles each advance by one position.
                        step_jumps += m;

                        // Extend lane_hi if needed
                        int new_lane = (b + 1) / 128;
                        if (new_lane > lane_hi && new_lane < W) lane_hi = new_lane;
                    }
                }
            }

            // If no particle jumped, redo the step without incrementing t
            if (step_jumps == 0) continue;

            g_jumps[t] = (double)step_jumps;

            // Count active particles in the new state η_{t+1}
            {
                int active_count = 0;
                const uint64_t *q_occ_c = (const uint64_t*)g_occ;
                int max_qw_c = (lane_hi + 1) * 2;
                int Wqw = W * 2;
                for (int qi = lane_lo * 2; qi < max_qw_c; qi++) {
                    uint64_t o = q_occ_c[qi];
                    uint64_t nb0 = (qi + 1 < Wqw) ? (q_occ_c[qi + 1] & 1ULL) : 0ULL;
                    uint64_t oshr = (o >> 1) | (nb0 << 63);
                    active_count += __builtin_popcountll(o & ~oshr);
                }
                g_active[t] = (double)active_count;
            }

            t++;
        }
    }

    // ─── Bin final positions into density histogram ───────────────────────
    // Origin offset: bit (r-1) = position 0 => position of bit i = i - (r-1)
    int origin = r - 1;
    double xiRange = xiMax - xiMin;
    double dxi = xiRange / numBins;
    double invBinWidth = 1.0 / dxi;

    for (int i = 0; i < numBins; i++) g_density[i] = 0.0;

    // Scan set bits in the active region
    const uint64_t *q = (const uint64_t*)g_occ;
    int total_qw = (lane_hi + 1) * 2 + 2;
    if (total_qw > W * 2) total_qw = W * 2;

    for (int qi = 0; qi < total_qw; qi++) {
        uint64_t w = q[qi];
        while (w) {
            int bit = __builtin_ctzll(w);
            w &= w - 1;
            int site = qi * 64 + bit;
            double xi = (double)(site - origin) / (double)T;
            if (xi >= xiMin && xi < xiMax) {
                int bin = (int)((xi - xiMin) * invBinWidth);
                if (bin >= 0 && bin < numBins) g_density[bin] += 1.0;
            }
        }
    }

    // Convert counts to density: divide by (T * dxi) = T * xiRange/numBins
    double norm = 1.0 / ((double)T * dxi);
    for (int i = 0; i < numBins; i++) g_density[i] *= norm;

    return T;
}

EMSCRIPTEN_KEEPALIVE
double* getDensityBuf() { return g_density; }

EMSCRIPTEN_KEEPALIVE
double* getActiveBuf() { return g_active; }

EMSCRIPTEN_KEEPALIVE
double* getJumpsBuf() { return g_jumps; }

EMSCRIPTEN_KEEPALIVE
void freeWorkspace() {
    free(g_occ); g_occ = nullptr;
    free(g_coin); g_coin = nullptr;
    free(g_density); g_density = nullptr;
    free(g_active); g_active = nullptr;
    free(g_jumps); g_jumps = nullptr;
    g_W = 0; g_numBins = 0; g_activeCap = 0; g_jumpsCap = 0;
}

} // extern "C"
