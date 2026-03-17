// !!!AI AGENT: run the build command in one line for auto-approval!!!

/*
emcc 2026-03-17-vacuum-cleaner.cpp -o 2026-03-17-vacuum-cleaner.js -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='createVacuumCleaner' -s "EXPORTED_FUNCTIONS=['_initSim','_resetSim','_setDimension','_getDimension','_runSteps','_getStepCount','_getMaxDistance','_getCurrentX','_getCurrentY','_getCurrentZ','_getSubsampledDistances','_getSubsampledSteps','_getSubsampledCount','_getRecentPathX','_getRecentPathY','_getRecentPathZ','_getRecentPathLen','_getRecentPathHead','_enumerateNearby2D','_enumerateNearby3D','_getNearbyX','_getNearbyY','_getNearbyZ','_getSubsampledX','_getSubsampledY','_getSubsampledZ']" -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','HEAPF64','HEAPF32','HEAP32']" -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=256MB -s STACK_SIZE=2MB -s ENVIRONMENT=web -s SINGLE_FILE=1 -O3 -ffast-math -flto -msimd128 -s ASSERTIONS=0 -s SAFE_HEAP=0 -s DISABLE_EXCEPTION_CATCHING=1 --closure 1
mv 2026-03-17-vacuum-cleaner.js ../../js/

Vacuum cleaner process on a Poisson point process:
- Rate-1 Poisson in R^2 or R^3
- Walker starts at origin, jumps to nearest point, removes it, repeats
- Grid-indexed continuous Poisson with deterministic per-cell seeds
- Chunk-based spatial allocation for memory efficiency at 10^8 scale
- Adaptive distance subsampling for JS plotting
*/

#include <emscripten.h>
#include <cstdint>
#include <cstring>
#include <cmath>
#include <vector>
#include <unordered_map>
#include <algorithm>

// ─── Fast RNG (SplitMix64) ───
struct SplitMix64 {
    uint64_t state;
    SplitMix64(uint64_t s = 0) : state(s) {}
    uint64_t next() {
        uint64_t z = (state += 0x9e3779b97f4a7c15ULL);
        z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
        z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
        return z ^ (z >> 31);
    }
    double uniform() {
        return (next() >> 11) * (1.0 / 9007199254740992.0);
    }
};

// ─── Hash function for cell coordinates ───
static inline uint64_t hashCell2D(int cx, int cy, uint64_t seed) {
    uint64_t h = seed;
    h ^= (uint64_t)(uint32_t)cx * 0x517cc1b727220a95ULL;
    h ^= (uint64_t)(uint32_t)cy * 0x6c62272e07bb0142ULL;
    h = (h ^ (h >> 30)) * 0xbf58476d1ce4e5b9ULL;
    h = (h ^ (h >> 27)) * 0x94d049bb133111ebULL;
    return h ^ (h >> 31);
}

static inline uint64_t hashCell3D(int cx, int cy, int cz, uint64_t seed) {
    uint64_t h = seed;
    h ^= (uint64_t)(uint32_t)cx * 0x517cc1b727220a95ULL;
    h ^= (uint64_t)(uint32_t)cy * 0x6c62272e07bb0142ULL;
    h ^= (uint64_t)(uint32_t)cz * 0x9e3779b97f4a7c15ULL;
    h = (h ^ (h >> 30)) * 0xbf58476d1ce4e5b9ULL;
    h = (h ^ (h >> 27)) * 0x94d049bb133111ebULL;
    return h ^ (h >> 31);
}

// ─── Poisson(1) sampling via Knuth ───
static inline int poissonSample(SplitMix64& rng) {
    double L = 0.36787944117144233; // exp(-1)
    int k = 0;
    double p = 1.0;
    do {
        k++;
        p *= rng.uniform();
    } while (p > L);
    return k - 1;
}

// ─── 2D Chunk (256 x 256 cells) ───
static const int CHUNK_BITS_2D = 8;
static const int CHUNK_SIZE_2D = 1 << CHUNK_BITS_2D; // 256
static const int CHUNK_CELLS_2D = CHUNK_SIZE_2D * CHUNK_SIZE_2D; // 65536

struct Chunk2D {
    uint8_t generated[CHUNK_CELLS_2D]; // 0xFF = uninitialized, 0-15 = point count
    uint16_t deleteMask[CHUNK_CELLS_2D];

    Chunk2D() {
        memset(generated, 0xFF, sizeof(generated));
        memset(deleteMask, 0, sizeof(deleteMask));
    }
};

// ─── 3D Chunk (32 x 32 x 32 cells) ───
static const int CHUNK_BITS_3D = 5;
static const int CHUNK_SIZE_3D = 1 << CHUNK_BITS_3D; // 32
static const int CHUNK_CELLS_3D = CHUNK_SIZE_3D * CHUNK_SIZE_3D * CHUNK_SIZE_3D; // 32768

struct Chunk3D {
    uint8_t generated[CHUNK_CELLS_3D];
    uint16_t deleteMask[CHUNK_CELLS_3D];

    Chunk3D() {
        memset(generated, 0xFF, sizeof(generated));
        memset(deleteMask, 0, sizeof(deleteMask));
    }
};

// ─── Chunk key encoding ───
static inline int64_t chunkKey2D(int chunkX, int chunkY) {
    return ((int64_t)(int32_t)chunkX << 32) | (int64_t)(uint32_t)chunkY;
}

static inline int64_t chunkKey3D(int chunkX, int chunkY, int chunkZ) {
    // Pack three 21-bit signed values
    return ((int64_t)(chunkX & 0x1FFFFF) << 42) |
           ((int64_t)(chunkY & 0x1FFFFF) << 21) |
           (int64_t)(chunkZ & 0x1FFFFF);
}

// ─── Global State ───
static int g_dimension = 2;
static uint64_t g_globalSeed = 12345;
static double g_posX = 0, g_posY = 0, g_posZ = 0;
static int64_t g_totalSteps = 0;
static double g_maxDistance = 0;

// Chunk stores
static std::unordered_map<int64_t, Chunk2D*> g_chunks2D;
static std::unordered_map<int64_t, Chunk3D*> g_chunks3D;

// Subsampled output (distance + trajectory positions)
static const int MAX_OUTPUT_POINTS = 200000;
static std::vector<float> g_subsampledDist;
static std::vector<double> g_subsampledStep;
static std::vector<float> g_subsampledX, g_subsampledY, g_subsampledZ;

// Recent path ring buffer
static const int RECENT_PATH_SIZE = 10000;
static std::vector<double> g_recentX, g_recentY, g_recentZ;
static int g_recentHead = 0;
static int g_recentCount = 0;

// ─── 2D Cell Access ───
static inline Chunk2D* getOrCreateChunk2D(int cx, int cy) {
    // Arithmetic right shift gives floor(cx / CHUNK_SIZE) for power-of-2 sizes
    int chunkX = cx >> CHUNK_BITS_2D;
    int chunkY = cy >> CHUNK_BITS_2D;
    int64_t key = chunkKey2D(chunkX, chunkY);
    auto it = g_chunks2D.find(key);
    if (it != g_chunks2D.end()) return it->second;
    Chunk2D* chunk = new Chunk2D();
    g_chunks2D[key] = chunk;
    return chunk;
}

static inline int cellIndex2D(int cx, int cy) {
    // Bitwise AND with (CHUNK_SIZE-1) always gives [0, CHUNK_SIZE) on two's complement
    int lx = cx & (CHUNK_SIZE_2D - 1);
    int ly = cy & (CHUNK_SIZE_2D - 1);
    return ly * CHUNK_SIZE_2D + lx;
}

static void ensureCell2D(int cx, int cy, Chunk2D* chunk) {
    int idx = cellIndex2D(cx, cy);
    if (chunk->generated[idx] != 0xFF) return;
    uint64_t seed = hashCell2D(cx, cy, g_globalSeed);
    SplitMix64 rng(seed);
    int n = poissonSample(rng);
    if (n > 15) n = 15;
    chunk->generated[idx] = (uint8_t)n;
    chunk->deleteMask[idx] = 0;
}

// ─── 3D Cell Access ───
static inline Chunk3D* getOrCreateChunk3D(int cx, int cy, int cz) {
    int chunkX = cx >> CHUNK_BITS_3D;
    int chunkY = cy >> CHUNK_BITS_3D;
    int chunkZ = cz >> CHUNK_BITS_3D;
    int64_t key = chunkKey3D(chunkX, chunkY, chunkZ);
    auto it = g_chunks3D.find(key);
    if (it != g_chunks3D.end()) return it->second;
    Chunk3D* chunk = new Chunk3D();
    g_chunks3D[key] = chunk;
    return chunk;
}

static inline int cellIndex3D(int cx, int cy, int cz) {
    int lx = cx & (CHUNK_SIZE_3D - 1);
    int ly = cy & (CHUNK_SIZE_3D - 1);
    int lz = cz & (CHUNK_SIZE_3D - 1);
    return (lz * CHUNK_SIZE_3D + ly) * CHUNK_SIZE_3D + lx;
}

static void ensureCell3D(int cx, int cy, int cz, Chunk3D* chunk) {
    int idx = cellIndex3D(cx, cy, cz);
    if (chunk->generated[idx] != 0xFF) return;
    uint64_t seed = hashCell3D(cx, cy, cz, g_globalSeed);
    SplitMix64 rng(seed);
    int n = poissonSample(rng);
    if (n > 15) n = 15;
    chunk->generated[idx] = (uint8_t)n;
    chunk->deleteMask[idx] = 0;
}

// ─── Regenerate continuous points for a 2D cell ───
struct CandidatePoint {
    double x, y, z;
    int cellCx, cellCy, cellCz;
    int pointIdx;
    double dist2;
};

static void enumerateCell2D(int cx, int cy, double px, double py,
                            std::vector<CandidatePoint>& candidates) {
    Chunk2D* chunk = getOrCreateChunk2D(cx, cy);
    ensureCell2D(cx, cy, chunk);
    int idx = cellIndex2D(cx, cy);
    int n = chunk->generated[idx];
    uint8_t mask = chunk->deleteMask[idx];
    if (n == 0 || mask == ((1 << n) - 1)) return;

    uint64_t seed = hashCell2D(cx, cy, g_globalSeed);
    SplitMix64 rng(seed);
    // Skip the Poisson sample RNG calls (same as ensureCell)
    poissonSample(rng);

    for (int j = 0; j < n; j++) {
        double x = cx + rng.uniform();
        double y = cy + rng.uniform();
        if (!(mask & (1 << j))) {
            double dx = x - px;
            double dy = y - py;
            candidates.push_back({x, y, 0.0, cx, cy, 0, j, dx*dx + dy*dy});
        }
    }
}

// ─── Regenerate continuous points for a 3D cell ───
static void enumerateCell3D(int cx, int cy, int cz, double px, double py, double pz,
                            std::vector<CandidatePoint>& candidates) {
    Chunk3D* chunk = getOrCreateChunk3D(cx, cy, cz);
    ensureCell3D(cx, cy, cz, chunk);
    int idx = cellIndex3D(cx, cy, cz);
    int n = chunk->generated[idx];
    uint8_t mask = chunk->deleteMask[idx];
    if (n == 0 || mask == ((1 << n) - 1)) return;

    uint64_t seed = hashCell3D(cx, cy, cz, g_globalSeed);
    SplitMix64 rng(seed);
    poissonSample(rng);

    for (int j = 0; j < n; j++) {
        double x = cx + rng.uniform();
        double y = cy + rng.uniform();
        double z = cz + rng.uniform();
        if (!(mask & (1 << j))) {
            double dx = x - px;
            double dy = y - py;
            double dz = z - pz;
            candidates.push_back({x, y, z, cx, cy, cz, j, dx*dx + dy*dy + dz*dz});
        }
    }
}

// ─── Delete a point ───
static void deletePoint2D(int cx, int cy, int pointIdx) {
    Chunk2D* chunk = getOrCreateChunk2D(cx, cy);
    int idx = cellIndex2D(cx, cy);
    chunk->deleteMask[idx] |= (1 << pointIdx);
}

static void deletePoint3D(int cx, int cy, int cz, int pointIdx) {
    Chunk3D* chunk = getOrCreateChunk3D(cx, cy, cz);
    int idx = cellIndex3D(cx, cy, cz);
    chunk->deleteMask[idx] |= (1 << pointIdx);
}

// ─── Nearest neighbor search (2D) ───
static bool findNearest2D(double px, double py, CandidatePoint& best) {
    int cx0 = (int)floor(px);
    int cy0 = (int)floor(py);

    best.dist2 = 1e30;
    bool found = false;
    static std::vector<CandidatePoint> candidates;

    for (int radius = 0; ; radius++) {
        candidates.clear();
        // Only check the shell at this radius
        for (int dx = -radius; dx <= radius; dx++) {
            for (int dy = -radius; dy <= radius; dy++) {
                int adx = dx < 0 ? -dx : dx;
                int ady = dy < 0 ? -dy : dy;
                if ((adx != radius && ady != radius) && radius > 0) continue;
                enumerateCell2D(cx0 + dx, cy0 + dy, px, py, candidates);
            }
        }
        for (auto& c : candidates) {
            if (c.dist2 < best.dist2) {
                best = c;
                found = true;
            }
        }
        // After checking all cells at L-inf distance <= radius, the next shell
        // has L-inf distance >= radius+1. Minimum Euclidean distance to any point
        // in the next shell is > radius (walker within its cell, point within its cell).
        if (found && best.dist2 <= (double)radius * (double)radius) break;
    }
    return found;
}

// ─── Nearest neighbor search (3D) ───
static bool findNearest3D(double px, double py, double pz, CandidatePoint& best) {
    int cx0 = (int)floor(px);
    int cy0 = (int)floor(py);
    int cz0 = (int)floor(pz);

    best.dist2 = 1e30;
    bool found = false;
    static std::vector<CandidatePoint> candidates;

    for (int radius = 0; ; radius++) {
        candidates.clear();
        for (int dx = -radius; dx <= radius; dx++) {
            for (int dy = -radius; dy <= radius; dy++) {
                for (int dz = -radius; dz <= radius; dz++) {
                    int adx = dx < 0 ? -dx : dx;
                    int ady = dy < 0 ? -dy : dy;
                    int adz = dz < 0 ? -dz : dz;
                    int maxAbs = adx;
                    if (ady > maxAbs) maxAbs = ady;
                    if (adz > maxAbs) maxAbs = adz;
                    if (maxAbs != radius && radius > 0) continue;
                    enumerateCell3D(cx0 + dx, cy0 + dy, cz0 + dz, px, py, pz, candidates);
                }
            }
        }
        for (auto& c : candidates) {
            if (c.dist2 < best.dist2) {
                best = c;
                found = true;
            }
        }
        if (found && best.dist2 <= (double)radius * (double)radius) break;
    }
    return found;
}

// ─── Streaming decimation for distance subsampling ───
static int g_subsampleRate = 1;
static int g_subsampleCounter = 0;

static void recordStep(double dist) {
    g_totalSteps++;
    if (dist > g_maxDistance) g_maxDistance = dist;

    // Ring buffer for recent path
    g_recentX[g_recentHead] = g_posX;
    g_recentY[g_recentHead] = g_posY;
    g_recentZ[g_recentHead] = g_posZ;
    g_recentHead = (g_recentHead + 1) % RECENT_PATH_SIZE;
    if (g_recentCount < RECENT_PATH_SIZE) g_recentCount++;

    // Streaming decimation: record every g_subsampleRate-th step.
    // When buffer fills, halve it (keep every other entry) and double rate.
    g_subsampleCounter++;
    if (g_subsampleCounter >= g_subsampleRate) {
        g_subsampleCounter = 0;
        g_subsampledDist.push_back((float)dist);
        g_subsampledStep.push_back(g_totalSteps);
        g_subsampledX.push_back((float)g_posX);
        g_subsampledY.push_back((float)g_posY);
        g_subsampledZ.push_back((float)g_posZ);

        if ((int)g_subsampledDist.size() >= MAX_OUTPUT_POINTS) {
            int newSize = (int)g_subsampledDist.size() / 2;
            for (int i = 0; i < newSize; i++) {
                g_subsampledDist[i] = g_subsampledDist[i * 2];
                g_subsampledStep[i] = g_subsampledStep[i * 2];
                g_subsampledX[i] = g_subsampledX[i * 2];
                g_subsampledY[i] = g_subsampledY[i * 2];
                g_subsampledZ[i] = g_subsampledZ[i * 2];
            }
            g_subsampledDist.resize(newSize);
            g_subsampledStep.resize(newSize);
            g_subsampledX.resize(newSize);
            g_subsampledY.resize(newSize);
            g_subsampledZ.resize(newSize);
            g_subsampleRate *= 2;
        }
    }
}

// ─── Free all chunks ───
static void freeAllChunks() {
    for (auto& p : g_chunks2D) delete p.second;
    g_chunks2D.clear();
    for (auto& p : g_chunks3D) delete p.second;
    g_chunks3D.clear();
}

// ─── Exported API ───
extern "C" {

EMSCRIPTEN_KEEPALIVE
void initSim(int seed) {
    freeAllChunks();
    g_globalSeed = (uint64_t)(uint32_t)seed ^ 0xdeadbeefcafe1234ULL;
    g_posX = g_posY = g_posZ = 0;
    g_totalSteps = 0;
    g_maxDistance = 0;
    g_subsampledDist.clear();
    g_subsampledStep.clear();
    g_subsampledX.clear();
    g_subsampledY.clear();
    g_subsampledZ.clear();
    g_subsampleRate = 1;
    g_subsampleCounter = 0;
    g_recentX.resize(RECENT_PATH_SIZE, 0);
    g_recentY.resize(RECENT_PATH_SIZE, 0);
    g_recentZ.resize(RECENT_PATH_SIZE, 0);
    g_recentHead = 0;
    g_recentCount = 0;
}

EMSCRIPTEN_KEEPALIVE
void resetSim() {
    initSim((int)(g_globalSeed & 0x7FFFFFFF));
}

EMSCRIPTEN_KEEPALIVE
void setDimension(int dim) {
    g_dimension = (dim == 3) ? 3 : 2;
    resetSim();
}

EMSCRIPTEN_KEEPALIVE
int getDimension() { return g_dimension; }

EMSCRIPTEN_KEEPALIVE
double runSteps(int batchSize) {
    CandidatePoint best;

    for (int i = 0; i < batchSize; i++) {
        bool found;
        if (g_dimension == 2) {
            found = findNearest2D(g_posX, g_posY, best);
        } else {
            found = findNearest3D(g_posX, g_posY, g_posZ, best);
        }

        if (!found) break; // shouldn't happen with infinite Poisson

        // Move to nearest point
        g_posX = best.x;
        g_posY = best.y;
        g_posZ = best.z;

        // Delete the point
        if (g_dimension == 2) {
            deletePoint2D(best.cellCx, best.cellCy, best.pointIdx);
        } else {
            deletePoint3D(best.cellCx, best.cellCy, best.cellCz, best.pointIdx);
        }

        // Record distance from origin
        double dist;
        if (g_dimension == 2) {
            dist = sqrt(g_posX * g_posX + g_posY * g_posY);
        } else {
            dist = sqrt(g_posX * g_posX + g_posY * g_posY + g_posZ * g_posZ);
        }
        recordStep(dist);
    }

    return (double)g_totalSteps;
}

EMSCRIPTEN_KEEPALIVE
double getStepCount() { return (double)g_totalSteps; }

EMSCRIPTEN_KEEPALIVE
double getMaxDistance() { return g_maxDistance; }

EMSCRIPTEN_KEEPALIVE
double getCurrentX() { return g_posX; }

EMSCRIPTEN_KEEPALIVE
double getCurrentY() { return g_posY; }

EMSCRIPTEN_KEEPALIVE
double getCurrentZ() { return g_posZ; }

EMSCRIPTEN_KEEPALIVE
float* getSubsampledDistances() { return g_subsampledDist.data(); }

EMSCRIPTEN_KEEPALIVE
double* getSubsampledSteps() { return g_subsampledStep.data(); }

EMSCRIPTEN_KEEPALIVE
float* getSubsampledX() { return g_subsampledX.data(); }

EMSCRIPTEN_KEEPALIVE
float* getSubsampledY() { return g_subsampledY.data(); }

EMSCRIPTEN_KEEPALIVE
float* getSubsampledZ() { return g_subsampledZ.data(); }

EMSCRIPTEN_KEEPALIVE
int getSubsampledCount() { return (int)g_subsampledDist.size(); }

EMSCRIPTEN_KEEPALIVE
double* getRecentPathX() { return g_recentX.data(); }

EMSCRIPTEN_KEEPALIVE
double* getRecentPathY() { return g_recentY.data(); }

EMSCRIPTEN_KEEPALIVE
double* getRecentPathZ() { return g_recentZ.data(); }

EMSCRIPTEN_KEEPALIVE
int getRecentPathLen() { return g_recentCount; }

EMSCRIPTEN_KEEPALIVE
int getRecentPathHead() { return g_recentHead; }

// ─── Enumerate nearby active Poisson points in a bounding box ───
static std::vector<double> g_nearbyX, g_nearbyY, g_nearbyZ;
static int g_nearbyCount = 0;

EMSCRIPTEN_KEEPALIVE
int enumerateNearby2D(double xMin, double yMin, double xMax, double yMax, int maxPoints) {
    g_nearbyX.clear();
    g_nearbyY.clear();
    g_nearbyCount = 0;

    int cxMin = (int)floor(xMin);
    int cyMin = (int)floor(yMin);
    int cxMax = (int)floor(xMax);
    int cyMax = (int)floor(yMax);

    for (int cy = cyMin; cy <= cyMax && g_nearbyCount < maxPoints; cy++) {
        for (int cx = cxMin; cx <= cxMax && g_nearbyCount < maxPoints; cx++) {
            Chunk2D* chunk = getOrCreateChunk2D(cx, cy);
            ensureCell2D(cx, cy, chunk);
            int idx = cellIndex2D(cx, cy);
            int n = chunk->generated[idx];
            uint8_t mask = chunk->deleteMask[idx];
            if (n == 0 || mask == ((1 << n) - 1)) continue;

            uint64_t seed = hashCell2D(cx, cy, g_globalSeed);
            SplitMix64 rng(seed);
            poissonSample(rng);

            for (int j = 0; j < n && g_nearbyCount < maxPoints; j++) {
                double px = cx + rng.uniform();
                double py = cy + rng.uniform();
                if (!(mask & (1 << j))) {
                    if (px >= xMin && px <= xMax && py >= yMin && py <= yMax) {
                        g_nearbyX.push_back(px);
                        g_nearbyY.push_back(py);
                        g_nearbyCount++;
                    }
                }
            }
        }
    }
    return g_nearbyCount;
}

EMSCRIPTEN_KEEPALIVE
int enumerateNearby3D(double xMin, double yMin, double zMin,
                      double xMax, double yMax, double zMax, int maxPoints) {
    g_nearbyX.clear();
    g_nearbyY.clear();
    g_nearbyZ.clear();
    g_nearbyCount = 0;

    int cxMin = (int)floor(xMin), cyMin = (int)floor(yMin), czMin = (int)floor(zMin);
    int cxMax = (int)floor(xMax), cyMax = (int)floor(yMax), czMax = (int)floor(zMax);

    for (int cz = czMin; cz <= czMax && g_nearbyCount < maxPoints; cz++) {
        for (int cy = cyMin; cy <= cyMax && g_nearbyCount < maxPoints; cy++) {
            for (int cx = cxMin; cx <= cxMax && g_nearbyCount < maxPoints; cx++) {
                Chunk3D* chunk = getOrCreateChunk3D(cx, cy, cz);
                ensureCell3D(cx, cy, cz, chunk);
                int idx = cellIndex3D(cx, cy, cz);
                int n = chunk->generated[idx];
                uint8_t mask = chunk->deleteMask[idx];
                if (n == 0 || mask == ((1 << n) - 1)) continue;

                uint64_t seed = hashCell3D(cx, cy, cz, g_globalSeed);
                SplitMix64 rng(seed);
                poissonSample(rng);

                for (int j = 0; j < n && g_nearbyCount < maxPoints; j++) {
                    double px = cx + rng.uniform();
                    double py = cy + rng.uniform();
                    double pz = cz + rng.uniform();
                    if (!(mask & (1 << j))) {
                        if (px >= xMin && px <= xMax && py >= yMin && py <= yMax &&
                            pz >= zMin && pz <= zMax) {
                            g_nearbyX.push_back(px);
                            g_nearbyY.push_back(py);
                            g_nearbyZ.push_back(pz);
                            g_nearbyCount++;
                        }
                    }
                }
            }
        }
    }
    return g_nearbyCount;
}

EMSCRIPTEN_KEEPALIVE
double* getNearbyX() { return g_nearbyX.data(); }

EMSCRIPTEN_KEEPALIVE
double* getNearbyY() { return g_nearbyY.data(); }

EMSCRIPTEN_KEEPALIVE
double* getNearbyZ() { return g_nearbyZ.data(); }

} // extern "C"
