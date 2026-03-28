/*
Compare EKLP Shuffling vs q-RSK at q=0: Conditional Distribution Verification

Tests whether the domino shuffling algorithm and the q-RSK growth diagram
produce the same conditional distributions for individual growth steps
(A_k -> A_{k+1}) of Aztec diamond tilings.

Compile:
g++ -std=c++17 -O3 -o compare-shuffling-rsk compare-shuffling-rsk.cpp

Usage:
  ./compare-shuffling-rsk                           # default: step 3->4, 1M samples
  ./compare-shuffling-rsk --step 4 --samples 2000000
  ./compare-shuffling-rsk --step 2 --samples 500000 --verbose
*/

#include <vector>
#include <string>
#include <cmath>
#include <cstring>
#include <cstdlib>
#include <cstdio>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <chrono>
#include <iostream>
#include <iomanip>
#include <cassert>
#include <numeric>

using namespace std;

// ============================================================
// Xoshiro256++ RNG
// ============================================================
struct Xoshiro256pp {
    uint64_t s[4];
    Xoshiro256pp(uint64_t seed = 0) { this->seed(seed); }
    void seed(uint64_t seed) {
        auto splitmix = [](uint64_t& z) {
            z += 0x9e3779b97f4a7c15ULL;
            z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
            z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
            return z ^ (z >> 31);
        };
        uint64_t z = seed;
        s[0] = splitmix(z); s[1] = splitmix(z);
        s[2] = splitmix(z); s[3] = splitmix(z);
    }
    static inline uint64_t rotl(uint64_t x, int k) { return (x << k) | (x >> (64 - k)); }
    inline uint64_t next() {
        const uint64_t result = rotl(s[0] + s[3], 23) + s[0];
        const uint64_t t = s[1] << 17;
        s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
        s[2] ^= t; s[3] = rotl(s[3], 45);
        return result;
    }
    inline double uniform01() {
        const uint64_t v = (next() >> 12) | 0x3FF0000000000000ULL;
        double d; memcpy(&d, &v, sizeof(d));
        return d - 1.0;
    }
    inline bool coin() { return next() & 1; }
};

static Xoshiro256pp rng;

// ============================================================
// Partition type
// ============================================================
using Partition = vector<int>;

inline int getPart(const Partition& p, int i) {
    return (i >= 0 && i < (int)p.size()) ? p[i] : 0;
}

// Conjugate (transpose) a partition: λ'_j = |{i : λ_i >= j}|
Partition conjugate(const Partition& p) {
    if (p.empty()) return {};
    int maxVal = p[0];
    Partition conj(maxVal);
    for (int j = 1; j <= maxVal; j++) {
        int count = 0;
        for (int val : p) if (val >= j) count++;
        conj[j - 1] = count;
    }
    while (!conj.empty() && conj.back() == 0) conj.pop_back();
    return conj;
}

string partToStr(const Partition& p) {
    string s = "[";
    for (size_t i = 0; i < p.size(); i++) {
        if (i > 0) s += ',';
        s += to_string(p[i]);
    }
    s += ']';
    return s;
}

string seqToStr(const vector<Partition>& seq) {
    string s;
    for (size_t i = 0; i < seq.size(); i++) {
        if (i > 0) s += ';';
        s += partToStr(seq[i]);
    }
    return s;
}

// ============================================================
// RSK at q=0 (deterministic VH bijection given bits)
// ============================================================
static vector<int> s_moved, s_nuParts;
static vector<pair<int,int>> s_islands;

void sampleVHq0(const Partition& lam, const Partition& mu, const Partition& kappa,
                int bit, Partition& out)
{
    const int maxLen = max({(int)lam.size(), (int)mu.size(), (int)kappa.size()}) + 2;
    s_moved.clear();
    s_islands.clear();

    // Find islands: consecutive indices where mu_i - kappa_i = 1
    for (int i = 0; i < maxLen; i++)
        if (getPart(mu, i) - getPart(kappa, i) == 1)
            s_moved.push_back(i);

    if (!s_moved.empty()) {
        int start = s_moved[0], end = s_moved[0];
        for (size_t i = 1; i < s_moved.size(); i++) {
            if (s_moved[i] == s_moved[i-1] + 1) end = s_moved[i];
            else { s_islands.push_back({start, end}); start = end = s_moved[i]; }
        }
        s_islands.push_back({start, end});
    }

    s_nuParts.resize(maxLen);
    for (int i = 0; i < maxLen; i++) s_nuParts[i] = getPart(lam, i);
    s_nuParts[0] = getPart(lam, 0) + bit;

    for (const auto& [k, m] : s_islands) {
        if (bit == 1 && k == 0) {
            for (int idx = 1; idx <= m + 1; idx++)
                s_nuParts[idx] = getPart(lam, idx) + 1;
            continue;
        }

        // q=0: deterministic - find first free particle
        int stoppedAt = m + 1;
        for (int idx = k; idx <= m; idx++)
            if (getPart(lam, idx) > getPart(mu, idx) - 1) { stoppedAt = idx; break; }

        for (int idx = k; idx <= m + 1; idx++)
            if (idx != stoppedAt) s_nuParts[idx] = getPart(lam, idx) + 1;
    }

    // Ensure nu >= mu (horizontal strip condition)
    for (int i = 0; i < maxLen; i++)
        s_nuParts[i] = max(s_nuParts[i], getPart(mu, i));

    int trimLen = maxLen;
    while (trimLen > 0 && s_nuParts[trimLen - 1] == 0) trimLen--;
    out.assign(s_nuParts.begin(), s_nuParts.begin() + trimLen);
}

// RSK sample for A_n at q=0, alpha=1, extracting partition sequences at ALL levels
// Returns levelSeqs[k] = partition sequence for A_k, for k = 0, 1, ..., n
vector<vector<Partition>> rskSampleAllLevels(int n) {
    vector<vector<Partition>> levelSeqs(n + 1);
    levelSeqs[0] = {Partition()}; // A_0: single empty partition

    if (n == 0) return levelSeqs;

    vector<Partition> prevRow(n + 1), currRow(n + 1);
    for (int j = 0; j <= n; j++) { prevRow[j].reserve(n); currRow[j].reserve(n); }

    // For each sub-level k = 1..n, we need boundary partitions
    // subA[k][i] = partition at cell (i, k+1-i) for i = 1..k
    // subB[k][i] = partition at cell (i, k-i) for i = 1..k-1
    vector<vector<Partition>> subA(n + 1), subB(n + 1);
    for (int k = 1; k <= n; k++) {
        subA[k].resize(k + 1);
        subB[k].resize(k);
    }

    for (int i = 1; i <= n; i++) {
        const int rowLen = n + 1 - i;
        for (int j = 1; j <= rowLen; j++) {
            // alpha=1 → p = 0.5
            int bit = rng.coin() ? 1 : 0;
            sampleVHq0(prevRow[j], currRow[j-1], prevRow[j-1], bit, currRow[j]);
        }

        // Extract boundary partitions for all sub-levels k >= i
        for (int k = i; k <= n; k++) {
            int j_a = k + 1 - i;
            if (j_a >= 1 && j_a <= rowLen) {
                subA[k][i] = currRow[j_a]; // copy
            }
            if (i <= k - 1) {
                int j_b = k - i;
                if (j_b >= 1 && j_b <= rowLen) {
                    subB[k][i] = currRow[j_b]; // copy
                }
            }
        }

        swap(prevRow, currRow);
    }

    // Reconstruct partition sequences for each level
    for (int k = 1; k <= n; k++) {
        vector<Partition> seq;
        seq.reserve(2 * k + 1);
        seq.emplace_back(); // empty
        for (int i = k; i >= 1; i--) {
            seq.push_back(subA[k][i]);
            if (i > 1) seq.push_back(subB[k][i - 1]);
        }
        seq.emplace_back(); // empty
        levelSeqs[k] = std::move(seq);
    }

    return levelSeqs;
}

// ============================================================
// EKLP Shuffling (ported from JavaScript)
// ============================================================
struct Domino {
    int x, y;
    char type; // 'N', 'S', 'E', 'W'
};

inline bool inDiamond(int x, int y, int n) {
    return abs(x) + abs(y) + 1 <= n;
    // |x+0.5| + |y+0.5| <= n
    // This is equivalent to: for x>=0,y>=0: (x+1)+(y+1) <= n+1 → x+y <= n-1
    // Actually let me be more careful:
    // |x+0.5| + |y+0.5| <= n
    // For x >= 0: x+0.5; for x < 0: -x-0.5 = -(x+0.5) but we need |x+0.5|
    // Let me just compute directly
}

// More careful inDiamond matching the JS: |x+0.5| + |y+0.5| <= n
inline bool inDiamondF(int x, int y, int n) {
    double ax = (x >= 0) ? x + 0.5 : -(x + 0.5);
    double ay = (y >= 0) ? y + 0.5 : -(y + 0.5);
    return ax + ay <= n + 0.001; // small epsilon for floating point
}

struct CellKey {
    int x, y;
    bool operator==(const CellKey& o) const { return x == o.x && y == o.y; }
};
struct CellKeyHash {
    size_t operator()(const CellKey& k) const {
        return hash<long long>()((long long)k.x * 100003 + k.y);
    }
};

using CellMap = unordered_map<CellKey, int, CellKeyHash>;
using CellSet = unordered_set<CellKey, CellKeyHash>;

CellMap buildCellMap(const vector<Domino>& doms) {
    CellMap map;
    for (int idx = 0; idx < (int)doms.size(); idx++) {
        const auto& d = doms[idx];
        if (d.type == 'N' || d.type == 'S') {
            map[{d.x, d.y}] = idx;
            map[{d.x + 1, d.y}] = idx;
        } else {
            map[{d.x, d.y}] = idx;
            map[{d.x, d.y + 1}] = idx;
        }
    }
    return map;
}

// Find bad blocks: 2x2 blocks filled by N-S or E-W colliding pairs
unordered_set<int> findBadBlocks(int n, const vector<Domino>& doms) {
    CellMap cellMap = buildCellMap(doms);
    unordered_set<int> bad;

    for (int bx = -n; bx < n; bx++) {
        for (int by = -n; by < n; by++) {
            if (!inDiamondF(bx, by, n) || !inDiamondF(bx+1, by, n) ||
                !inDiamondF(bx, by+1, n) || !inDiamondF(bx+1, by+1, n)) continue;

            auto it00 = cellMap.find({bx, by});
            auto it10 = cellMap.find({bx+1, by});
            auto it01 = cellMap.find({bx, by+1});
            auto it11 = cellMap.find({bx+1, by+1});

            if (it00 == cellMap.end() || it10 == cellMap.end() ||
                it01 == cellMap.end() || it11 == cellMap.end()) continue;

            int d00 = it00->second, d10 = it10->second;
            int d01 = it01->second, d11 = it11->second;

            // Bad N-S pair: bottom=N, top=S
            if (d00 == d10 && d01 == d11 && d00 != d01) {
                if (doms[d00].type == 'N' && doms[d01].type == 'S') {
                    bad.insert(d00);
                    bad.insert(d01);
                }
            }

            // Bad E-W pair: left=E, right=W
            if (d00 == d01 && d10 == d11 && d00 != d10) {
                if (doms[d00].type == 'E' && doms[d10].type == 'W') {
                    bad.insert(d00);
                    bad.insert(d10);
                }
            }
        }
    }
    return bad;
}

void deleteBadDominoes(vector<Domino>& doms, const unordered_set<int>& badSet) {
    vector<Domino> filtered;
    filtered.reserve(doms.size());
    for (int i = 0; i < (int)doms.size(); i++) {
        if (badSet.find(i) == badSet.end())
            filtered.push_back(doms[i]);
    }
    doms = std::move(filtered);
}

void slideDominoes(vector<Domino>& doms) {
    for (auto& d : doms) {
        if (d.type == 'N') d.y += 1;
        else if (d.type == 'S') d.y -= 1;
        else if (d.type == 'E') d.x += 1;
        else if (d.type == 'W') d.x -= 1;
    }
}

void createDominoes(int n, vector<Domino>& doms) {
    CellSet occupied;
    for (const auto& d : doms) {
        if (d.type == 'N' || d.type == 'S') {
            occupied.insert({d.x, d.y});
            occupied.insert({d.x + 1, d.y});
        } else {
            occupied.insert({d.x, d.y});
            occupied.insert({d.x, d.y + 1});
        }
    }

    for (int bx = -n; bx < n; bx++) {
        for (int by = -n; by < n; by++) {
            if (!inDiamondF(bx, by, n) || !inDiamondF(bx+1, by, n) ||
                !inDiamondF(bx, by+1, n) || !inDiamondF(bx+1, by+1, n)) continue;

            if (occupied.count({bx, by}) || occupied.count({bx+1, by}) ||
                occupied.count({bx, by+1}) || occupied.count({bx+1, by+1})) continue;

            // Fill with 50/50 probability
            if (rng.coin()) {
                // Vertical EW pair
                doms.push_back({bx, by, 'W'});
                doms.push_back({bx + 1, by, 'E'});
            } else {
                // Horizontal NS pair
                doms.push_back({bx, by, 'S'});
                doms.push_back({bx, by + 1, 'N'});
            }
            occupied.insert({bx, by});
            occupied.insert({bx+1, by});
            occupied.insert({bx, by+1});
            occupied.insert({bx+1, by+1});
        }
    }
}

void initN1(vector<Domino>& doms) {
    doms.clear();
    if (rng.coin()) {
        doms.push_back({-1, -1, 'W'});
        doms.push_back({0, -1, 'E'});
    } else {
        doms.push_back({-1, -1, 'S'});
        doms.push_back({-1, 0, 'N'});
    }
}

void shuffleStep(int& currentN, vector<Domino>& doms) {
    if (currentN == 0) {
        initN1(doms);
        currentN = 1;
        return;
    }
    auto bad = findBadBlocks(currentN, doms);
    deleteBadDominoes(doms, bad);
    slideDominoes(doms);
    currentN++;
    createDominoes(currentN, doms);
}

// ============================================================
// Extract partition sequence from domino configuration
// (port of computeDiagonalPartitions from JS)
// ============================================================
vector<Partition> extractPartitions(int n, const vector<Domino>& doms) {
    // Build sets of S and W domino positions
    CellSet sDoms, wDoms;
    for (const auto& d : doms) {
        if (d.type == 'S') sDoms.insert({d.x, d.y});
        if (d.type == 'W') wDoms.insert({d.x, d.y});
    }

    vector<Partition> result;
    result.reserve(2 * n + 1);

    for (int k = 0; k <= 2 * n; k++) {
        int diag = k - (n + 1); // x+y value for this diagonal

        // Find cells on this diagonal inside diamond
        vector<pair<int,int>> cells;
        for (int x = -n - 1; x <= n + 1; x++) {
            int y = diag - x;
            if (inDiamondF(x, y, n))
                cells.push_back({x, y});
        }
        // cells are sorted by x (ascending)

        // Find particle positions (1-indexed)
        vector<int> particlePos;
        for (int i = 0; i < (int)cells.size(); i++) {
            int cx = cells[i].first, cy = cells[i].second;
            // Particle if covered by S or W domino
            bool isParticle =
                sDoms.count({cx - 1, cy}) ||  // S domino to left covers this cell
                wDoms.count({cx, cy - 1}) ||  // W domino below covers this cell
                sDoms.count({cx, cy}) ||       // S domino starting at this cell
                wDoms.count({cx, cy});         // W domino starting at this cell
            if (isParticle)
                particlePos.push_back(i + 1); // 1-indexed
        }

        // Convert particle positions to partition
        int h = (int)particlePos.size();
        Partition part;
        for (int i = 1; i <= h; i++) {
            int val = particlePos[h - i] - (h + 1 - i);
            if (val > 0 || !part.empty())
                part.push_back(val);
        }
        // Trim trailing zeros
        while (!part.empty() && part.back() == 0) part.pop_back();

        // Conjugate to match RSK growth diagram convention
        result.push_back(conjugate(part));
    }
    return result;
}

// ============================================================
// Shuffling: sample tiling via shuffling, return partition sequences at each level
// ============================================================
vector<vector<Partition>> shuffleSampleAllLevels(int n) {
    vector<vector<Partition>> levelSeqs(n + 1);
    levelSeqs[0] = {Partition()};

    vector<Domino> doms;
    int currentN = 0;

    for (int step = 1; step <= n; step++) {
        shuffleStep(currentN, doms);
        levelSeqs[step] = extractPartitions(currentN, doms);
    }

    return levelSeqs;
}

// ============================================================
// Comparison logic
// ============================================================
using CondTable = unordered_map<string, unordered_map<string, int>>;
using MargTable = unordered_map<string, int>;

double tvDistance(const unordered_map<string, int>& dist1, int n1,
                 const unordered_map<string, int>& dist2, int n2) {
    set<string> allKeys;
    for (auto& [k,v] : dist1) allKeys.insert(k);
    for (auto& [k,v] : dist2) allKeys.insert(k);

    double tv = 0.0;
    for (const auto& k : allKeys) {
        double p1 = 0.0, p2 = 0.0;
        auto it1 = dist1.find(k);
        if (it1 != dist1.end()) p1 = (double)it1->second / n1;
        auto it2 = dist2.find(k);
        if (it2 != dist2.end()) p2 = (double)it2->second / n2;
        tv += fabs(p1 - p2);
    }
    return tv / 2.0;
}

// Chi-squared test: compare two multinomial distributions
// Under H0 (same distribution), pool counts and compute chi-sq against pooled proportions
// Returns {chi2, df, p-value approximation}
struct ChiSqResult { double chi2; int df; double pvalue; };

ChiSqResult chiSquaredTest(const unordered_map<string, int>& dist1, int n1,
                           const unordered_map<string, int>& dist2, int n2) {
    set<string> allKeys;
    for (auto& [k,v] : dist1) allKeys.insert(k);
    for (auto& [k,v] : dist2) allKeys.insert(k);

    double chi2 = 0.0;
    int df = 0;
    int nTotal = n1 + n2;

    for (const auto& k : allKeys) {
        int c1 = 0, c2 = 0;
        auto it1 = dist1.find(k);
        if (it1 != dist1.end()) c1 = it1->second;
        auto it2 = dist2.find(k);
        if (it2 != dist2.end()) c2 = it2->second;

        int cTotal = c1 + c2;
        if (cTotal == 0) continue;

        // Expected counts under pooled distribution
        double e1 = (double)cTotal * n1 / nTotal;
        double e2 = (double)cTotal * n2 / nTotal;

        if (e1 > 0) chi2 += (c1 - e1) * (c1 - e1) / e1;
        if (e2 > 0) chi2 += (c2 - e2) * (c2 - e2) / e2;
        df++;
    }
    df = max(0, df - 1); // degrees of freedom = categories - 1

    // Approximate p-value using Wilson-Hilferty normal approximation for chi-sq
    double pval = 1.0;
    if (df > 0) {
        double z = pow(chi2 / df, 1.0/3.0) - (1.0 - 2.0/(9.0*df));
        z /= sqrt(2.0 / (9.0 * df));
        pval = 0.5 * erfc(z / sqrt(2.0)); // upper tail
    }

    return {chi2, df, pval};
}

int main(int argc, char* argv[]) {
    int stepK = 3;
    int numSamples = 100000000; // 100M default
    bool verbose = false;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--step") == 0 && i + 1 < argc) {
            stepK = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--samples") == 0 && i + 1 < argc) {
            numSamples = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--verbose") == 0) {
            verbose = true;
        } else if (strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "-h") == 0) {
            printf("Usage: %s [--step K] [--samples N] [--verbose]\n", argv[0]);
            printf("  --step K      Compare A_K -> A_{K+1} transition (default: 3)\n");
            printf("  --samples N   Number of samples per algorithm (default: 100000000)\n");
            printf("  --verbose     Print full conditional distributions\n");
            return 0;
        }
    }

    int n = stepK + 1; // We need to build up to A_{stepK+1}
    printf("=== Comparing Shuffling vs RSK at q=0 ===\n");
    printf("Step: A_%d -> A_%d\n", stepK, stepK + 1);
    printf("Samples per algorithm: %d\n", numSamples);
    printf("Expected A_%d tilings: %lld\n", stepK, 1LL << (stepK * (stepK + 1) / 2));
    printf("Expected A_%d tilings: %lld\n", n, 1LL << (n * (n + 1) / 2));
    printf("\n");

    // Conditional tables: given A_k state, distribution over A_{k+1} state
    CondTable shuffleCond, rskCond;
    MargTable shuffleMarg, rskMarg; // marginal on A_k
    MargTable shuffleMargK1, rskMargK1; // marginal on A_{k+1}

    auto t0 = chrono::high_resolution_clock::now();

    // Seed RNG
    rng.seed(chrono::high_resolution_clock::now().time_since_epoch().count());

    // === Run Shuffling ===
    printf("Running shuffling algorithm...\n");
    auto ts = chrono::high_resolution_clock::now();
    for (int s = 0; s < numSamples; s++) {
        auto levels = shuffleSampleAllLevels(n);
        string keyK = seqToStr(levels[stepK]);
        string keyK1 = seqToStr(levels[n]);
        shuffleCond[keyK][keyK1]++;
        shuffleMarg[keyK]++;
        shuffleMargK1[keyK1]++;

        if ((s + 1) % (numSamples / 10) == 0) {
            printf("  Shuffling: %d/%d (%.0f%%)\n", s + 1, numSamples, 100.0 * (s + 1) / numSamples);
        }
    }
    auto te = chrono::high_resolution_clock::now();
    double shuffleTime = chrono::duration<double>(te - ts).count();
    printf("  Done in %.1fs (%.0f samples/sec)\n\n", shuffleTime, numSamples / shuffleTime);

    // === Run RSK ===
    printf("Running RSK algorithm (q=0)...\n");
    ts = chrono::high_resolution_clock::now();
    for (int s = 0; s < numSamples; s++) {
        auto levels = rskSampleAllLevels(n);
        string keyK = seqToStr(levels[stepK]);
        string keyK1 = seqToStr(levels[n]);
        rskCond[keyK][keyK1]++;
        rskMarg[keyK]++;
        rskMargK1[keyK1]++;

        if ((s + 1) % (numSamples / 10) == 0) {
            printf("  RSK: %d/%d (%.0f%%)\n", s + 1, numSamples, 100.0 * (s + 1) / numSamples);
        }
    }
    te = chrono::high_resolution_clock::now();
    double rskTime = chrono::duration<double>(te - ts).count();
    printf("  Done in %.1fs (%.0f samples/sec)\n\n", rskTime, numSamples / rskTime);

    // === Analysis ===
    printf("=== Results ===\n\n");

    // Marginal check on A_k
    printf("Marginal distribution on A_%d states:\n", stepK);
    printf("  Shuffling: %zu distinct states\n", shuffleMarg.size());
    printf("  RSK:       %zu distinct states\n", rskMarg.size());
    double margTVk = tvDistance(shuffleMarg, numSamples, rskMarg, numSamples);
    auto margChi2k = chiSquaredTest(shuffleMarg, numSamples, rskMarg, numSamples);
    printf("  TV distance: %.6f\n", margTVk);
    printf("  Chi-squared: %.2f (df=%d, p=%.4g)\n\n", margChi2k.chi2, margChi2k.df, margChi2k.pvalue);

    // Marginal check on A_{k+1}
    printf("Marginal distribution on A_%d states:\n", n);
    printf("  Shuffling: %zu distinct states\n", shuffleMargK1.size());
    printf("  RSK:       %zu distinct states\n", rskMargK1.size());
    double margTVk1 = tvDistance(shuffleMargK1, numSamples, rskMargK1, numSamples);
    auto margChi2k1 = chiSquaredTest(shuffleMargK1, numSamples, rskMargK1, numSamples);
    printf("  TV distance: %.6f\n", margTVk1);
    printf("  Chi-squared: %.2f (df=%d, p=%.4g)\n\n", margChi2k1.chi2, margChi2k1.df, margChi2k1.pvalue);

    // Joint distribution check
    printf("Joint distribution on (A_%d, A_%d) pairs:\n", stepK, n);
    // Build joint tables
    MargTable shuffleJoint, rskJoint;
    for (auto& [stK, extMap] : shuffleCond)
        for (auto& [stK1, cnt] : extMap)
            shuffleJoint[stK + "||" + stK1] += cnt;
    for (auto& [stK, extMap] : rskCond)
        for (auto& [stK1, cnt] : extMap)
            rskJoint[stK + "||" + stK1] += cnt;
    printf("  Shuffling: %zu distinct pairs\n", shuffleJoint.size());
    printf("  RSK:       %zu distinct pairs\n", rskJoint.size());
    double jointTV = tvDistance(shuffleJoint, numSamples, rskJoint, numSamples);
    auto jointChi2 = chiSquaredTest(shuffleJoint, numSamples, rskJoint, numSamples);
    printf("  TV distance: %.6f\n", jointTV);
    printf("  Chi-squared: %.2f (df=%d, p=%.4g)\n\n", jointChi2.chi2, jointChi2.df, jointChi2.pvalue);

    // Conditional distribution comparison per A_k state
    printf("Per-state conditional distribution comparison (A_%d -> A_%d):\n", stepK, n);

    set<string> allStates;
    for (auto& [k,v] : shuffleCond) allStates.insert(k);
    for (auto& [k,v] : rskCond) allStates.insert(k);

    int statesCompared = 0;
    double maxTV = 0.0;
    string maxTVstate;
    double sumTV = 0.0;
    double maxChi2 = 0.0;
    double minPval = 1.0;
    int statesOnlyShuffling = 0, statesOnlyRSK = 0;

    struct StateInfo {
        string state;
        double tv, chi2, pval;
        int shuffleCount, rskCount;
        int shuffleExt, rskExt;
    };
    vector<StateInfo> stateInfos;

    for (const auto& state : allStates) {
        auto itS = shuffleCond.find(state);
        auto itR = rskCond.find(state);

        if (itS == shuffleCond.end()) { statesOnlyRSK++; continue; }
        if (itR == rskCond.end()) { statesOnlyShuffling++; continue; }

        int nS = 0, nR = 0;
        for (auto& [k,v] : itS->second) nS += v;
        for (auto& [k,v] : itR->second) nR += v;

        double tv = tvDistance(itS->second, nS, itR->second, nR);
        auto chi2r = chiSquaredTest(itS->second, nS, itR->second, nR);
        statesCompared++;
        sumTV += tv;
        if (tv > maxTV) { maxTV = tv; maxTVstate = state; }
        if (chi2r.chi2 > maxChi2) maxChi2 = chi2r.chi2;
        if (chi2r.pvalue < minPval) minPval = chi2r.pvalue;

        stateInfos.push_back({state, tv, chi2r.chi2, chi2r.pvalue, nS, nR,
                              (int)itS->second.size(), (int)itR->second.size()});
    }

    sort(stateInfos.begin(), stateInfos.end(),
         [](const StateInfo& a, const StateInfo& b) { return a.tv > b.tv; });

    printf("  States compared: %d\n", statesCompared);
    if (statesOnlyShuffling > 0) printf("  States only in shuffling: %d\n", statesOnlyShuffling);
    if (statesOnlyRSK > 0) printf("  States only in RSK: %d\n", statesOnlyRSK);
    printf("  Max conditional TV: %.6f\n", maxTV);
    printf("  Mean conditional TV: %.6f\n", statesCompared > 0 ? sumTV / statesCompared : 0.0);
    printf("  Max chi-squared: %.2f, min p-value: %.4g\n", maxChi2, minPval);

    double avgSamplesPerState = (double)numSamples / allStates.size();
    double expectedError = 1.0 / sqrt(avgSamplesPerState);
    printf("  Expected stat. error: ~%.6f (1/sqrt(%.0f))\n\n", expectedError, avgSamplesPerState);

    // Per-state details
    int showTop = min((int)stateInfos.size(), verbose ? (int)stateInfos.size() : 10);
    printf("  Top %d states by TV distance:\n", showTop);
    for (int i = 0; i < showTop; i++) {
        auto& si = stateInfos[i];
        printf("    TV=%.6f chi2=%.1f(p=%.3g)  shuf:%d/%dext  rsk:%d/%dext\n",
               si.tv, si.chi2, si.pval, si.shuffleCount, si.shuffleExt, si.rskCount, si.rskExt);
        if (verbose) printf("      %s\n", si.state.c_str());
    }
    printf("\n");

    // Verbose: full conditional table for worst state
    if (verbose && !stateInfos.empty()) {
        auto& worst = stateInfos[0];
        printf("  Full conditional for worst TV state:\n");
        printf("  State: %s\n", worst.state.c_str());

        auto& sDist = shuffleCond[worst.state];
        auto& rDist = rskCond[worst.state];
        int sTotal = worst.shuffleCount;
        int rTotal = worst.rskCount;

        set<string> allExt;
        for (auto& [k,v] : sDist) allExt.insert(k);
        for (auto& [k,v] : rDist) allExt.insert(k);

        printf("    %-12s %-12s %-12s\n", "Shuffle P", "RSK P", "|diff|");
        for (const auto& ext : allExt) {
            double pS = 0.0, pR = 0.0;
            auto itS2 = sDist.find(ext);
            if (itS2 != sDist.end()) pS = (double)itS2->second / sTotal;
            auto itR2 = rDist.find(ext);
            if (itR2 != rDist.end()) pR = (double)itR2->second / rTotal;
            printf("    %-12.6f %-12.6f %-12.6f  %s\n", pS, pR, fabs(pS - pR), ext.c_str());
        }
        printf("\n");
    }

    // === Conclusion ===
    double threshold = 3.0 * expectedError;
    printf("=== Conclusion ===\n");
    if (statesOnlyShuffling > 0 || statesOnlyRSK > 0) {
        printf("WARNING: Encoding mismatch — some states appear only in one algorithm.\n");
        printf("This indicates a convention difference, not a distributional difference.\n\n");
    }
    if (maxTV < threshold && minPval > 0.001) {
        printf("Conditional distributions appear IDENTICAL within statistical error.\n");
        printf("  Max TV = %.6f < %.6f = 3*sigma\n", maxTV, threshold);
        printf("  Min p-value = %.4g (all consistent with H0)\n", minPval);
        printf("  Joint TV = %.6f, joint chi2 p = %.4g\n", jointTV, jointChi2.pvalue);
    } else {
        printf("Conditional distributions appear DIFFERENT.\n");
        printf("  Max TV = %.6f (threshold = %.6f)\n", maxTV, threshold);
        printf("  Min p-value = %.4g\n", minPval);
        printf("  Joint TV = %.6f, joint chi2 p = %.4g\n", jointTV, jointChi2.pvalue);
    }

    auto tEnd = chrono::high_resolution_clock::now();
    printf("\nTotal time: %.1fs\n", chrono::duration<double>(tEnd - t0).count());

    return 0;
}
