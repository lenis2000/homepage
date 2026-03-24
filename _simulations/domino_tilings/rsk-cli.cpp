/*
q-RSK CLI: Fast sampling of q-Whittaker Aztec diamond domino tilings

Compile:
/opt/homebrew/bin/g++-15 -std=c++17 -Ofast -mcpu=native -funroll-loops -flto \
  -DNDEBUG -fno-exceptions -fno-rtti -fomit-frame-pointer -ftree-vectorize \
  -o rsk-cli rsk-cli.cpp

Usage:
  ./rsk-cli 50                          # n=50, default q=0.5, alpha=1
  ./rsk-cli 100 --q 0.8 --alpha 0.5    # custom q and alpha
  ./rsk-cli 200 -o tiling.png           # save PNG
  ./rsk-cli 100 --boundary              # print boundary curve to stdout
  ./rsk-cli 100 --boundary -o out.png --boundary-file curve.txt
*/

#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

#include <vector>
#include <string>
#include <cmath>
#include <cstring>
#include <cstdlib>
#include <cstdio>
#include <algorithm>
#include <numeric>
#include <chrono>
#include <iostream>
#include <fstream>
#include <atomic>
#include <unordered_map>
#ifdef _OPENMP
#include <omp.h>
#endif

using namespace std;

// ============================================================
// Xoshiro256++ RNG (from double-dimer-cli.cpp)
// ============================================================
struct Xoshiro256pp {
    using result_type = uint64_t;
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

    static constexpr uint64_t min() { return 0; }
    static constexpr uint64_t max() { return UINT64_MAX; }
    uint64_t operator()() { return next(); }

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

private:
    static inline uint64_t rotl(uint64_t x, int k) { return (x << k) | (x >> (64 - k)); }
};

static thread_local Xoshiro256pp rng;

// ============================================================
// q-RSK algorithm (from 2025-12-04-RSK-sampling.cpp)
// ============================================================
using Partition = vector<int>;

inline int getPart(const Partition& p, int i) {
    return (i >= 0 && i < (int)p.size()) ? p[i] : 0;
}

// 1 - q^n, stable for q near 1
inline double oneMinusQtoN(double q, int n) {
    if (n <= 0) return 0.0;
    if (q <= 0.0) return 1.0;
    if (q >= 1.0) return 0.0;
    if (n > 50 && (double)n * log1p(q - 1.0) < -50.0) return 1.0;
    return -expm1((double)n * log1p(q - 1.0));
}

inline double computeF(int lam_k, int nu_bar_k, int nu_bar_k_minus_1, double q) {
    int d1 = lam_k - nu_bar_k + 1;
    if (d1 <= 0) return 0.0;
    int d2 = nu_bar_k_minus_1 - nu_bar_k + 1;
    if (d2 <= 0) return 1.0;
    double num = oneMinusQtoN(q, d1);
    double den = oneMinusQtoN(q, d2);
    return den == 0.0 ? 1.0 : num / den;
}

inline double computeG(int lam_i, int nu_bar_i, double q) {
    int d = lam_i - nu_bar_i + 1;
    return d <= 0 ? 0.0 : oneMinusQtoN(q, d);
}

// Static buffers (reused across calls, thread-local for OpenMP)
static thread_local vector<int> s_moved, s_nuParts;
static thread_local vector<pair<int,int>> s_islands;

void sampleVHq(const Partition& lam, const Partition& mu, const Partition& kappa,
               int bit, double q, Partition& out)
{
    const int maxLen = max({(int)lam.size(), (int)mu.size(), (int)kappa.size()}) + 2;
    s_moved.clear();
    s_islands.clear();

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

        int stoppedAt;
        if (q == 0.0) {
            stoppedAt = m + 1;
            for (int idx = k; idx <= m; idx++)
                if (getPart(lam, idx) > getPart(mu, idx) - 1) { stoppedAt = idx; break; }
        } else {
            double f_k;
            if (k == 0) {
                int d = getPart(lam, 0) - getPart(mu, 0) + 1;
                f_k = d <= 0 ? 0.0 : oneMinusQtoN(q, d);
            } else {
                f_k = computeF(getPart(lam, k), getPart(mu, k), getPart(mu, k-1), q);
            }
            if (rng.uniform01() < f_k) {
                stoppedAt = k;
            } else {
                stoppedAt = m + 1;
                for (int s = k + 1; s <= m; s++)
                    if (rng.uniform01() < computeG(getPart(lam, s), getPart(mu, s), q))
                        { stoppedAt = s; break; }
            }
        }
        for (int idx = k; idx <= m + 1; idx++)
            if (idx != stoppedAt) s_nuParts[idx] = getPart(lam, idx) + 1;
    }

    for (int i = 0; i < maxLen; i++)
        s_nuParts[i] = max(s_nuParts[i], getPart(mu, i));

    int trimLen = maxLen;
    while (trimLen > 0 && s_nuParts[trimLen - 1] == 0) trimLen--;
    out.assign(s_nuParts.begin(), s_nuParts.begin() + trimLen);
}

vector<Partition> aztecDiamondSample(int n, double alpha, double q) {
    if (n == 0) return {Partition()};

    vector<Partition> prevRow(n + 1), currRow(n + 1);
    for (int j = 0; j <= n; j++) { prevRow[j].reserve(n/2); currRow[j].reserve(n/2); }

    vector<Partition> boundaryA(n + 1), boundaryB(n);

    for (int i = 1; i <= n; i++) {
        const int rowLen = n + 1 - i;
        for (int j = 1; j <= rowLen; j++) {
            // x_i = alpha, y_j = 1 → p = alpha / (1 + alpha)
            const double p = alpha / (1.0 + alpha);
            const int bit = (rng.uniform01() < p) ? 1 : 0;
            sampleVHq(prevRow[j], currRow[j-1], prevRow[j-1], bit, q, currRow[j]);
        }
        boundaryA[i] = std::move(currRow[n + 1 - i]);
        if (i < n) boundaryB[i] = currRow[n - i];
        swap(prevRow, currRow);
    }

    vector<Partition> result;
    result.reserve(2 * n + 1);
    result.emplace_back();
    for (int i = n; i >= 1; i--) {
        result.push_back(std::move(boundaryA[i]));
        if (i > 1) result.push_back(std::move(boundaryB[i - 1]));
    }
    result.emplace_back();
    return result;
}

// ============================================================
// Boundary curve extraction
// ============================================================
struct BoundaryCurve {
    vector<int> topPos;    // max particle position at each diagonal
    vector<int> bottomPos; // min particle position at each diagonal
    vector<int> diagSize;  // ground set size at each diagonal
    vector<int> numParticles; // particle count at each diagonal
};

int getParticleCount(int idx, int n) {
    int k = (idx + 1) / 2;
    return idx % 2 == 0 ? n - k : n - k + 1;
}

int actualDiagSize(int idx, int n) {
    int d = idx - n;
    return (abs(d) % 2 == n % 2) ? n : n + 1;
}

vector<int> partitionToSubset(const Partition& partition, int numParticles, int groundSetSize) {
    int m = groundSetSize, np = numParticles, h = m - np;
    if (h <= 0) {
        vector<int> sub(m);
        iota(sub.begin(), sub.end(), 1);
        return sub;
    }
    vector<int> lamRev(partition.rbegin(), partition.rend());
    while ((int)lamRev.size() < h) lamRev.insert(lamRev.begin(), 0);

    vector<bool> isHole(m + 1, false);
    for (int j = 1; j <= h; j++) {
        int u = lamRev[j-1] + j;
        if (u >= 1 && u <= m) isHole[u] = true;
    }
    vector<int> sub;
    sub.reserve(np);
    for (int pos = 1; pos <= m; pos++)
        if (!isHole[pos]) sub.push_back(pos);
    return sub;
}

BoundaryCurve extractBoundary(const vector<Partition>& partitions, int n) {
    BoundaryCurve bc;
    int numDiags = 2 * n + 1;
    bc.topPos.resize(numDiags, 0);
    bc.bottomPos.resize(numDiags, 0);
    bc.diagSize.resize(numDiags);
    bc.numParticles.resize(numDiags);

    for (int idx = 0; idx < numDiags && idx < (int)partitions.size(); idx++) {
        int np = getParticleCount(idx, n);
        int ds = actualDiagSize(idx, n);
        bc.diagSize[idx] = ds;
        bc.numParticles[idx] = np;

        auto subset = partitionToSubset(partitions[idx], np, ds);
        if (!subset.empty()) {
            bc.topPos[idx] = subset.back();
            bc.bottomPos[idx] = subset.front();
        }
    }
    return bc;
}

// ============================================================
// Lattice points & domino matching (for PNG rendering)
// ============================================================
struct LatticePoint {
    double hx, hy;      // half-integer coords
    double sx, sy;       // screen coords
    int diag;            // hx + hy
    int posInDiag;       // 1-indexed
    bool inSubset;
};

struct Domino {
    double cx, cy;       // center (screen)
    double w, h;         // dimensions
    int type;            // 0=particle-horiz, 1=particle-vert, 2=hole-horiz, 3=hole-vert
};

struct RGB { uint8_t r, g, b; };

static const RGB COLORS[] = {
    {106, 170, 100},  // green  (particle horiz)
    {201, 83, 74},    // red    (particle vert)
    {109, 158, 235},  // blue   (hole horiz)
    {241, 194, 50},   // yellow (hole vert)
};

vector<LatticePoint> generateLatticePoints(int n) {
    const double scale = 20.0;
    vector<LatticePoint> pts;
    pts.reserve((2*n+2) * (2*n+2));

    for (double hx = -n - 0.5; hx <= n + 0.5; hx += 1.0) {
        for (double hy = -n - 0.5; hy <= n + 0.5; hy += 1.0) {
            if (fabs(fmod(hx, 1.0)) < 0.1 || fabs(fmod(hy, 1.0)) < 0.1) continue;
            if (fabs(hx) + fabs(hy) > n + 0.5) continue;
            pts.push_back({hx, hy, hx * scale, -hy * scale,
                          (int)round(hx + hy), 0, false});
        }
    }

    // Group by diagonal, assign posInDiag
    sort(pts.begin(), pts.end(), [](const LatticePoint& a, const LatticePoint& b) {
        if (a.diag != b.diag) return a.diag < b.diag;
        return (a.hx - a.hy) < (b.hx - b.hy);
    });
    int curDiag = pts.empty() ? 0 : pts[0].diag;
    int pos = 1;
    for (auto& p : pts) {
        if (p.diag != curDiag) { curDiag = p.diag; pos = 1; }
        p.posInDiag = pos++;
    }
    return pts;
}

void assignSubsets(vector<LatticePoint>& pts, const vector<Partition>& partitions, int n) {
    // Build map: diag -> {diagSize, subset as bitset}
    int numDiags = 2 * n + 1;
    // diagKeys sorted = [-n, -n+1, ..., n]
    vector<vector<bool>> subsetBits(numDiags); // indexed by diagIdx

    for (int idx = 0; idx < numDiags && idx < (int)partitions.size(); idx++) {
        int d = idx - n; // geometric diagonal
        int np = getParticleCount(idx, n);
        int ds = actualDiagSize(idx, n);
        auto subset = partitionToSubset(partitions[idx], np, ds);
        subsetBits[idx].assign(ds + 1, false);
        for (int s : subset) subsetBits[idx][s] = true;
    }

    for (auto& p : pts) {
        int diagIdx = p.diag + n; // convert geometric to index
        if (diagIdx >= 0 && diagIdx < numDiags && p.posInDiag <= (int)subsetBits[diagIdx].size())
            p.inSubset = subsetBits[diagIdx][p.posInDiag];
        else
            p.inSubset = false;
    }
}

int64_t lkey(double hx, double hy, int n) {
    int ix = (int)round(hx * 2) + 2*n + 1;
    int iy = (int)round(hy * 2) + 2*n + 1;
    return (int64_t)ix * (4*n + 3) + iy;
}

vector<Domino> computeDominoes(const vector<LatticePoint>& pts, int n) {
    // Build lookup
    unordered_map<int64_t, int> lookup;
    lookup.reserve(pts.size() * 2);
    for (int i = 0; i < (int)pts.size(); i++)
        lookup[lkey(pts[i].hx, pts[i].hy, n)] = i;

    auto getNeighbors = [&](int idx) {
        vector<int> nbrs;
        const auto& p = pts[idx];
        static const double dirs[][2] = {{1,0},{-1,0},{0,1},{0,-1}};
        for (auto& d : dirs) {
            auto it = lookup.find(lkey(p.hx + d[0], p.hy + d[1], n));
            if (it != lookup.end()) nbrs.push_back(it->second);
        }
        return nbrs;
    };

    vector<Domino> dominoes;
    dominoes.reserve(pts.size());
    const double scale = 20.0;

    // Match particles (bottom-left first)
    vector<int> particles;
    for (int i = 0; i < (int)pts.size(); i++)
        if (pts[i].inSubset) particles.push_back(i);
    sort(particles.begin(), particles.end(), [&](int a, int b) {
        double sa = pts[a].hx + pts[a].hy, sb = pts[b].hx + pts[b].hy;
        if (sa != sb) return sa < sb;
        return (pts[a].hx - pts[a].hy) < (pts[b].hx - pts[b].hy);
    });

    vector<bool> matched(pts.size(), false);
    for (int pi : particles) {
        if (matched[pi]) continue;
        auto nbrs = getNeighbors(pi);
        // Sort neighbors same way
        sort(nbrs.begin(), nbrs.end(), [&](int a, int b) {
            double sa = pts[a].hx + pts[a].hy, sb = pts[b].hx + pts[b].hy;
            if (sa != sb) return sa < sb;
            return (pts[a].hx - pts[a].hy) < (pts[b].hx - pts[b].hy);
        });
        for (int ni : nbrs) {
            if (pts[ni].inSubset && !matched[ni]) {
                matched[pi] = matched[ni] = true;
                bool horiz = fabs(pts[pi].hx - pts[ni].hx) > 0.5;
                dominoes.push_back({
                    (pts[pi].sx + pts[ni].sx) / 2, (pts[pi].sy + pts[ni].sy) / 2,
                    horiz ? 2*scale : scale, horiz ? scale : 2*scale,
                    horiz ? 0 : 1
                });
                break;
            }
        }
    }

    // Match holes (top-right first)
    vector<int> holes;
    for (int i = 0; i < (int)pts.size(); i++)
        if (!pts[i].inSubset) holes.push_back(i);
    sort(holes.begin(), holes.end(), [&](int a, int b) {
        double sa = pts[a].hx + pts[a].hy, sb = pts[b].hx + pts[b].hy;
        if (sa != sb) return sa > sb;
        return (pts[a].hx - pts[a].hy) > (pts[b].hx - pts[b].hy);
    });

    for (int hi : holes) {
        if (matched[hi]) continue;
        auto nbrs = getNeighbors(hi);
        sort(nbrs.begin(), nbrs.end(), [&](int a, int b) {
            double sa = pts[a].hx + pts[a].hy, sb = pts[b].hx + pts[b].hy;
            if (sa != sb) return sa > sb;
            return (pts[a].hx - pts[a].hy) > (pts[b].hx - pts[b].hy);
        });
        for (int ni : nbrs) {
            if (!pts[ni].inSubset && !matched[ni]) {
                matched[hi] = matched[ni] = true;
                bool horiz = fabs(pts[hi].hx - pts[ni].hx) > 0.5;
                dominoes.push_back({
                    (pts[hi].sx + pts[ni].sx) / 2, (pts[hi].sy + pts[ni].sy) / 2,
                    horiz ? 2*scale : scale, horiz ? scale : 2*scale,
                    horiz ? 2 : 3
                });
                break;
            }
        }
    }

    return dominoes;
}

// ============================================================
// PNG rendering
// ============================================================
void renderPNG(const vector<Domino>& dominoes, const vector<LatticePoint>& pts,
               const BoundaryCurve& bc, int n, const string& filename, int imgSize)
{
    const double scale = 20.0;
    double extent = (n + 1.5) * scale;
    double pxPerUnit = imgSize / (2.0 * extent);

    auto toPixel = [&](double sx, double sy) -> pair<int,int> {
        int px = (int)((sx + extent) * pxPerUnit);
        int py = (int)((sy + extent) * pxPerUnit);
        return {px, py};
    };

    int W = imgSize, H = imgSize;
    vector<uint8_t> pixels(W * H * 3, 250); // light gray bg

    // Draw dominoes
    for (const auto& d : dominoes) {
        RGB col = COLORS[d.type];
        double x0 = d.cx - d.w / 2, y0 = d.cy - d.h / 2;
        double x1 = d.cx + d.w / 2, y1 = d.cy + d.h / 2;
        auto [px0, py0] = toPixel(x0, y0);
        auto [px1, py1] = toPixel(x1, y1);
        // Add 1px border
        int bx0 = min(px0, px1) + 1, by0 = min(py0, py1) + 1;
        int bx1 = max(px0, px1) - 1, by1 = max(py0, py1) - 1;
        for (int y = by0; y <= by1 && y < H; y++) {
            if (y < 0) continue;
            int row = y * W * 3;
            for (int x = bx0; x <= bx1 && x < W; x++) {
                if (x < 0) continue;
                int idx = row + x * 3;
                pixels[idx] = col.r; pixels[idx+1] = col.g; pixels[idx+2] = col.b;
            }
        }
    }

    // Thick line helper for graph below
    auto drawThickLine = [&](vector<uint8_t>& buf, int bW, int bH,
                             int x0, int y0, int x1, int y1, RGB col, int thickness) {
        int dx = abs(x1-x0), dy = abs(y1-y0);
        int sx = x0<x1?1:-1, sy = y0<y1?1:-1;
        int err = dx - dy, r = thickness / 2;
        while (true) {
            for (int ty = -r; ty <= r; ty++)
                for (int tx = -r; tx <= r; tx++) {
                    int px = x0+tx, py = y0+ty;
                    if (px >= 0 && px < bW && py >= 0 && py < bH) {
                        int idx = (py*bW+px)*3;
                        buf[idx] = col.r; buf[idx+1] = col.g; buf[idx+2] = col.b;
                    }
                }
            if (x0 == x1 && y0 == y1) break;
            int e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    };

    // Draw top particle (largest position) on each diagonal
    {
        // Group particles by diagonal, find the top one
        unordered_map<int, const LatticePoint*> topByDiag;
        for (const auto& p : pts) {
            if (!p.inSubset) continue;
            auto it = topByDiag.find(p.diag);
            if (it == topByDiag.end() || p.posInDiag > it->second->posInDiag)
                topByDiag[p.diag] = &p;
        }

        int dotR = max(2, imgSize / (4 * n));
        // Draw dots
        for (auto& [d, tp] : topByDiag) {
            auto [px, py] = toPixel(tp->sx, tp->sy);
            // Black filled dot with white outline
            for (int dy = -dotR-1; dy <= dotR+1; dy++)
                for (int dx = -dotR-1; dx <= dotR+1; dx++) {
                    int d2 = dx*dx + dy*dy;
                    int x = px+dx, y = py+dy;
                    if (x < 0 || x >= W || y < 0 || y >= H) continue;
                    int idx = (y*W+x)*3;
                    if (d2 <= dotR*dotR) {
                        pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0;
                    } else if (d2 <= (dotR+1)*(dotR+1)) {
                        pixels[idx] = 255; pixels[idx+1] = 255; pixels[idx+2] = 255;
                    }
                }
        }
        // Connect with line
        vector<int> sortedD;
        for (auto& [d, _] : topByDiag) sortedD.push_back(d);
        sort(sortedD.begin(), sortedD.end());
        for (int i = 0; i + 1 < (int)sortedD.size(); i++) {
            auto [x0, y0] = toPixel(topByDiag[sortedD[i]]->sx, topByDiag[sortedD[i]]->sy);
            auto [x1, y1] = toPixel(topByDiag[sortedD[i+1]]->sx, topByDiag[sortedD[i+1]]->sy);
            // Bresenham 2px thick
            int ddx = abs(x1-x0), ddy = abs(y1-y0);
            int sx = x0<x1?1:-1, sy = y0<y1?1:-1, err = ddx-ddy;
            while (true) {
                for (int t = -1; t <= 1; t++) {
                    if (x0+t>=0&&x0+t<W&&y0>=0&&y0<H) { int idx=(y0*W+x0+t)*3; pixels[idx]=232; pixels[idx+1]=62; pixels[idx+2]=0; }
                    if (x0>=0&&x0<W&&y0+t>=0&&y0+t<H) { int idx=((y0+t)*W+x0)*3; pixels[idx]=232; pixels[idx+1]=62; pixels[idx+2]=0; }
                }
                if (x0==x1&&y0==y1) break;
                int e2=2*err;
                if (e2>-ddy){err-=ddy;x0+=sx;}
                if (e2<ddx){err+=ddx;y0+=sy;}
            }
        }
    }

    // ---- Draw f(k) = topPos graph below the tiling ----
    int graphH = H / 4;
    int totalH = H + graphH + 10; // 10px gap
    vector<uint8_t> fullPixels(W * totalH * 3, 255); // white
    // Copy tiling into top portion
    memcpy(fullPixels.data(), pixels.data(), W * H * 3);

    int graphTop = H + 10;
    int graphBot = totalH - 20;
    int graphLeft = 40, graphRight = W - 20;
    int gw = graphRight - graphLeft, gh = graphBot - graphTop;

    // Axes
    auto setPixel = [&](int x, int y, RGB c) {
        if (x >= 0 && x < W && y >= 0 && y < totalH) {
            int idx = (y * W + x) * 3;
            fullPixels[idx] = c.r; fullPixels[idx+1] = c.g; fullPixels[idx+2] = c.b;
        }
    };
    auto hline = [&](int x0, int x1, int y, RGB c) { for (int x = x0; x <= x1; x++) setPixel(x, y, c); };
    auto vline = [&](int x, int y0, int y1, RGB c) { for (int y = y0; y <= y1; y++) setPixel(x, y, c); };

    RGB axisCol = {150, 150, 150};
    hline(graphLeft, graphRight, graphBot, axisCol);
    vline(graphLeft, graphTop, graphBot, axisCol);

    // Parity-corrected: -1 on (n+1)-diags, skip last zero
    int numDiags = 2 * n + 1;
    vector<double> fvals;
    for (int idx = 0; idx < numDiags - 1; idx++) {
        int val = bc.topPos[idx];
        if (bc.diagSize[idx] == n + 1) val -= 1;
        fvals.push_back((double)val);
    }

    // Skip frozen part (topPos == n)
    int plotStart = 0;
    for (int i = 0; i < (int)fvals.size(); i++) {
        if (fvals[i] < n - 0.5) { plotStart = max(0, i - 2); break; }
    }
    int plotEnd = (int)fvals.size() - 1;

    double minVal = fvals[plotEnd], maxVal = fvals[plotStart];
    for (int i = plotStart; i <= plotEnd; i++) {
        minVal = min(minVal, fvals[i]);
        maxVal = max(maxVal, fvals[i]);
    }
    double valPad = max(1.0, (maxVal - minVal) * 0.05);
    minVal -= valPad; maxVal += valPad;

    auto kToX = [&](int k) { return graphLeft + (int)((double)(k - plotStart) / (plotEnd - plotStart) * gw); };
    auto vToY = [&](double v) { return graphBot - (int)((v - minVal) / (maxVal - minVal) * gh); };

    // Grid lines
    int numGrid = 5;
    for (int g = 0; g <= numGrid; g++) {
        double v = minVal + g * (maxVal - minVal) / numGrid;
        int y = vToY(v);
        for (int x = graphLeft; x <= graphRight; x += 3) setPixel(x, y, {230, 230, 230});
    }

    // Connect with thick orange line + dots
    RGB plotCol = {232, 62, 0};
    for (int i = plotStart; i + 1 <= plotEnd; i++) {
        int x0 = kToX(i), y0 = vToY(fvals[i]);
        int x1 = kToX(i+1), y1 = vToY(fvals[i+1]);
        int ddx = abs(x1-x0), ddy = abs(y1-y0);
        int sx = x0<x1?1:-1, sy = y0<y1?1:-1, err = ddx-ddy;
        int lx = x0, ly = y0;
        while (true) {
            for (int t = -1; t <= 1; t++) { setPixel(lx, ly+t, plotCol); setPixel(lx+t, ly, plotCol); }
            if (lx == x1 && ly == y1) break;
            int e2 = 2*err;
            if (e2 > -ddy) { err -= ddy; lx += sx; }
            if (e2 < ddx) { err += ddx; ly += sy; }
        }
    }
    for (int i = plotStart; i <= plotEnd; i++) {
        int cx = kToX(i), cy = vToY(fvals[i]);
        for (int dy = -2; dy <= 2; dy++)
            for (int dx = -2; dx <= 2; dx++)
                if (dx*dx + dy*dy <= 5) setPixel(cx+dx, cy+dy, plotCol);
    }

    stbi_write_png(filename.c_str(), W, totalH, 3, fullPixels.data(), W * 3);
    cerr << "Saved " << filename << " (" << W << "x" << totalH << ")" << endl;
}

// ============================================================
// Text output
// ============================================================
void printBoundary(const BoundaryCurve& bc, int n, ostream& out) {
    // topPos on n-sized diagonals reported as-is; on (n+1)-sized diagonals subtract 1
    // so all values are on the same 1..n scale, all integers
    out << "# n=" << n << "  f(k) = topPos (parity-corrected: -1 on (n+1)-diags)" << endl;
    int numDiags = 2 * n + 1;
    for (int idx = 0; idx < numDiags - 1; idx++) {
        int val = bc.topPos[idx];
        if (bc.diagSize[idx] == n + 1) val -= 1;
        out << val << endl;
    }
}

void printPartitions(const vector<Partition>& partitions, int n) {
    cerr << "Partition sequence (2n+1=" << 2*n+1 << " entries):" << endl;
    for (int idx = 0; idx < (int)partitions.size(); idx++) {
        int k = (idx + 1) / 2;
        const char* label = (idx % 2 == 0) ? "lambda" : "mu";
        int num = (idx % 2 == 0) ? idx / 2 : (idx + 1) / 2;
        cerr << "  " << label << "^" << num << " = (";
        for (int j = 0; j < (int)partitions[idx].size(); j++) {
            if (j > 0) cerr << ",";
            cerr << partitions[idx][j];
        }
        cerr << ")" << endl;
    }
}

// ============================================================
// CLI
// ============================================================
struct Args {
    int n = 50;
    double q = 0.5;
    double alpha = 1.0;
    string output = "";
    string boundaryFile = "";
    bool printBound = false;
    bool printParts = false;
    bool verbose = false;
    int imgSize = 0;  // 0 = auto
    int seed = -1;
    int batch = 0;      // 0 = single sample, >0 = batch mode
    int threads = 0;    // 0 = all cores
    bool help = false;
};

Args parseArgs(int argc, char* argv[]) {
    Args a;
    for (int i = 1; i < argc; i++) {
        string arg = argv[i];
        if (arg == "-h" || arg == "--help") { a.help = true; }
        else if ((arg == "-n" || arg == "--size") && i+1 < argc) a.n = stoi(argv[++i]);
        else if ((arg == "--q" || arg == "-q") && i+1 < argc) a.q = stod(argv[++i]);
        else if (arg == "--alpha" && i+1 < argc) a.alpha = stod(argv[++i]);
        else if ((arg == "-o" || arg == "--output") && i+1 < argc) a.output = argv[++i];
        else if (arg == "--boundary-file" && i+1 < argc) a.boundaryFile = argv[++i];
        else if (arg == "--boundary" || arg == "-b") a.printBound = true;
        else if (arg == "--partitions") a.printParts = true;
        else if (arg == "--verbose" || arg == "-v") a.verbose = true;
        else if (arg == "--scale" && i+1 < argc) a.imgSize = stoi(argv[++i]);
        else if (arg == "--seed" && i+1 < argc) a.seed = stoi(argv[++i]);
        else if ((arg == "--batch" || arg == "-B") && i+1 < argc) a.batch = stoi(argv[++i]);
        else if ((arg == "--threads" || arg == "-t") && i+1 < argc) a.threads = stoi(argv[++i]);
        else if (arg[0] != '-' && arg[0] >= '0' && arg[0] <= '9') a.n = stoi(arg);
    }
    return a;
}

// Extract parity-corrected boundary as integer vector
vector<int> boundaryVector(const BoundaryCurve& bc, int n) {
    int numDiags = 2 * n + 1;
    vector<int> v;
    v.reserve(numDiags - 1);
    for (int idx = 0; idx < numDiags - 1; idx++) {
        int val = bc.topPos[idx];
        if (bc.diagSize[idx] == n + 1) val -= 1;
        v.push_back(val);
    }
    return v;
}

// Print a single boundary as Mathematica list
void printMathematicaRow(const vector<int>& v, ostream& out) {
    out << "{";
    for (int i = 0; i < (int)v.size(); i++) {
        if (i > 0) out << ",";
        out << v[i];
    }
    out << "}";
}

void printHelp() {
    cerr << R"HELP(rsk-cli: Fast q-Whittaker RSK sampling of Aztec diamond domino tilings

Usage: rsk-cli [n] [options]

Parameters:
  n                   Diamond size (positional or -n)
  --q VALUE           q-Whittaker parameter [0,1) (default: 0.5)
  --alpha VALUE       Schur specialization x_i = alpha (default: 1.0)

Output:
  -o, --output FILE   Save tiling PNG with boundary overlay
  --scale SIZE        Image size in pixels (default: auto)
  -b, --boundary      Print boundary curve to stdout
  --boundary-file F   Save boundary curve to file
  --partitions        Print partition sequence to stderr
  -v, --verbose       Verbose output

Batch:
  -B, --batch N       Sample N tilings, output as Mathematica array to stdout
                      Each row is one boundary curve f(k)
  -t, --threads N     Number of threads (default: all cores)

Other:
  --seed VALUE        RNG seed (default: random)
  -h, --help          Show this help

Examples:
  ./rsk-cli 50                            # sample, print timing
  ./rsk-cli 100 --q 0.8 -b               # print boundary
  ./rsk-cli 200 --alpha 0.5 -o tile.png   # save PNG
  ./rsk-cli 100 -B 1000 > data.m          # batch → Mathematica
  ./rsk-cli 100 -B 1000 --boundary-file data.m  # same, to file
)HELP";
}

int main(int argc, char* argv[]) {
    Args args = parseArgs(argc, argv);
    if (args.help) { printHelp(); return 0; }

    if (args.seed >= 0) rng.seed(args.seed);
    else {
        uint64_t seed = chrono::high_resolution_clock::now().time_since_epoch().count();
        rng.seed(seed);
    }

    if (args.verbose)
        cerr << "n=" << args.n << " q=" << args.q << " alpha=" << args.alpha << endl;

    // ---- Batch mode ----
    if (args.batch > 0) {
        auto t0 = chrono::high_resolution_clock::now();

        // Auto-generate filename if none given
        string outFile = args.boundaryFile;
        if (outFile.empty()) {
            // Format q and alpha without trailing zeros
            auto fmtNum = [](double v) -> string {
                char buf[32];
                snprintf(buf, sizeof(buf), "%.4g", v);
                return buf;
            };
            // Timestamp
            auto now_t = chrono::system_clock::now();
            auto tt = chrono::system_clock::to_time_t(now_t);
            struct tm ltm;
            localtime_r(&tt, &ltm);
            char ts[32];
            strftime(ts, sizeof(ts), "%Y%m%d_%H%M%S", &ltm);

            outFile = "qw_domino_n" + to_string(args.n)
                    + "_q" + fmtNum(args.q)
                    + "_a" + fmtNum(args.alpha)
                    + "_B" + to_string(args.batch)
                    + "_" + string(ts) + ".m";
        }

        ofstream fout(outFile);
        if (!fout) { cerr << "Error: cannot open " << outFile << endl; return 1; }
        ostream* out = &fout;
        cerr << "Output: " << outFile << endl;

        #ifdef _OPENMP
        if (args.threads > 0) omp_set_num_threads(args.threads);
        fprintf(stderr, "Using %d threads\n", omp_get_max_threads());
        #endif

        // Pre-allocate results
        vector<vector<int>> results(args.batch);
        atomic<int> completed{0};

        // Seed each thread differently
        uint64_t baseSeed = args.seed >= 0 ? args.seed : chrono::high_resolution_clock::now().time_since_epoch().count();

        #pragma omp parallel
        {
            int tid = 0;
            #ifdef _OPENMP
            tid = omp_get_thread_num();
            #endif
            rng.seed(baseSeed + tid * 1000003ULL);

            #pragma omp for schedule(dynamic, 1)
            for (int s = 0; s < args.batch; s++) {
                auto partitions = aztecDiamondSample(args.n, args.alpha, args.q);
                auto bc = extractBoundary(partitions, args.n);
                results[s] = boundaryVector(bc, args.n);

                int done = ++completed;
                // Thread 0 prints progress
                if (tid == 0) {
                    auto now = chrono::high_resolution_clock::now();
                    double elapsed = chrono::duration<double>(now - t0).count();
                    double rate = done / elapsed;
                    double eta = (args.batch - done) / rate;
                    fprintf(stderr, "\r%d/%d  %.1f/s  ~%ds left   ",
                            done, args.batch, rate, (int)eta);
                }
            }
        }

        // Write output
        *out << "(* n=" << args.n << " q=" << args.q << " alpha=" << args.alpha
             << " samples=" << args.batch << " *)\n{";
        for (int s = 0; s < args.batch; s++) {
            if (s > 0) *out << ",\n";
            printMathematicaRow(results[s], *out);
        }
        *out << "}\n";

        auto t1 = chrono::high_resolution_clock::now();
        double totalSec = chrono::duration<double>(t1 - t0).count();
        cerr << "\rDone: " << args.batch << " samples in " << totalSec << "s ("
             << args.batch / totalSec << "/s)  →  " << outFile << endl;
        return 0;
    }

    // ---- Single sample mode ----
    auto t0 = chrono::high_resolution_clock::now();
    auto partitions = aztecDiamondSample(args.n, args.alpha, args.q);
    auto t1 = chrono::high_resolution_clock::now();
    cerr << "Sampled n=" << args.n << " in "
         << chrono::duration<double, milli>(t1 - t0).count() << " ms" << endl;

    if (args.printParts) printPartitions(partitions, args.n);

    auto bc = extractBoundary(partitions, args.n);

    if (args.printBound) printBoundary(bc, args.n, cout);

    if (!args.boundaryFile.empty() && args.batch == 0) {
        ofstream f(args.boundaryFile);
        if (f) { printBoundary(bc, args.n, f); cerr << "Saved " << args.boundaryFile << endl; }
        else cerr << "Error: cannot open " << args.boundaryFile << endl;
    }

    if (!args.output.empty()) {
        int imgSize = args.imgSize > 0 ? args.imgSize : max(400, min(4000, args.n * 20));
        auto t2 = chrono::high_resolution_clock::now();
        auto pts = generateLatticePoints(args.n);
        assignSubsets(pts, partitions, args.n);
        auto dominoes = computeDominoes(pts, args.n);
        auto t3 = chrono::high_resolution_clock::now();
        cerr << "Domino matching: " << chrono::duration<double, milli>(t3 - t2).count() << " ms" << endl;
        renderPNG(dominoes, pts, bc, args.n, args.output, imgSize);
    }

    return 0;
}
