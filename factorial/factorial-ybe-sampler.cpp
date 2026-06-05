#include <emscripten/emscripten.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

struct Xoshiro256pp {
  uint64_t s[4] = {0, 0, 0, 0};

  Xoshiro256pp(uint32_t seedLo, uint32_t seedHi) {
    uint64_t seed = static_cast<uint64_t>(seedLo) ^
                    (static_cast<uint64_t>(seedHi) << 32);
    for (int i = 0; i < 4; ++i) s[i] = splitmix64(seed);
  }

  static inline uint64_t rotl(uint64_t x, int k) {
    return (x << k) | (x >> (64 - k));
  }

  static inline uint64_t splitmix64(uint64_t& x) {
    uint64_t z = (x += 0x9e3779b97f4a7c15ULL);
    z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
    z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
    return z ^ (z >> 31);
  }

  inline uint64_t next() {
    const uint64_t result = rotl(s[0] + s[3], 23) + s[0];
    const uint64_t t = s[1] << 17;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 45);
    return result;
  }

  inline double nextDouble() {
    return static_cast<double>(next() >> 11) * 0x1.0p-53;
  }
};

struct Transition {
  bool admissible = false;
  bool random = false;
  uint8_t deterministic = 0;
  uint8_t first = 0;
  uint8_t second = 0;
};

std::array<Transition, 64 * 8> g_transitions;
bool g_transitionsReady = false;

inline int bit(uint32_t value, int index) {
  return (value >> index) & 1U;
}

inline uint8_t tripleMask(int a, int b, int c) {
  return static_cast<uint8_t>(a | (b << 1) | (c << 2));
}

double wWeight(double x, double y, int i1, int j1, int i2, int j2) {
  if (i1 + j1 != i2 + j2) return 0.0;
  if (i1 == 1 && j1 == 1 && i2 == 1 && j2 == 1) return 0.0;
  if (i1 == 0 && j1 == 0 && i2 == 0 && j2 == 0) return x + y;
  return 1.0;
}

double wCheckWeight(double w, double y, int i1, int j1, int i2, int j2) {
  if (i1 + j1 != i2 + j2) return 0.0;
  if (i1 == 1 && j1 == 1 && i2 == 1 && j2 == 1) return 0.0;
  if (i1 == 0 && j1 == 0 && i2 == 0 && j2 == 0) return 1.0;
  return 1.0 / (w + y);
}

double rWeight(double w, double x, int i1, int i2, int j1, int j2) {
  if (i1 + i2 != j1 + j2) return 0.0;
  if (i1 == 0 && i2 == 0 && j1 == 0 && j2 == 0) return 1.0 / (w - x);
  if (i1 == 1 && i2 == 1 && j1 == 1 && j2 == 1) return 1.0 / (w - x);
  if (i1 == 1 && i2 == 0 && j1 == 1 && j2 == 0) return 1.0;
  if (i1 == 0 && i2 == 1 && j1 == 0 && j2 == 1) return 0.0;
  if (i1 == 0 && i2 == 1 && j1 == 1 && j2 == 0) return 1.0 / (w - x);
  if (i1 == 1 && i2 == 0 && j1 == 0 && j2 == 1) return 1.0 / (w - x);
  return 0.0;
}

void ensureTransitionTable() {
  if (g_transitionsReady) return;

  const double x = 0.3;
  const double w = 1.0;
  const double y = 0.2;
  constexpr double eps = 1e-14;

  for (uint32_t boundary = 0; boundary < 64; ++boundary) {
    const int i1 = bit(boundary, 0);
    const int i2 = bit(boundary, 1);
    const int i3 = bit(boundary, 2);
    const int j1 = bit(boundary, 3);
    const int j2 = bit(boundary, 4);
    const int j3 = bit(boundary, 5);

    std::vector<uint8_t> admissibleInputs;
    std::vector<uint8_t> outputs;
    for (int k1 = 0; k1 <= 1; ++k1) {
      for (int k2 = 0; k2 <= 1; ++k2) {
        for (int k3 = 0; k3 <= 1; ++k3) {
          const double left =
              wCheckWeight(w, y, k3, k2, j3, j2) *
              wWeight(x, y, i3, k1, k3, j1) *
              rWeight(w, x, i1, i2, k1, k2);
          if (left > eps) admissibleInputs.push_back(tripleMask(k1, k2, k3));

          const double right =
              wCheckWeight(w, y, i3, i2, k3, k2) *
              wWeight(x, y, k3, i1, j3, k1) *
              rWeight(w, x, k1, k2, j1, j2);
          if (right > eps) outputs.push_back(tripleMask(k1, k2, k3));
        }
      }
    }

    for (uint8_t input : admissibleInputs) {
      Transition& transition = g_transitions[boundary * 8 + input];
      transition.admissible = true;
      if (outputs.empty() || outputs.size() > 2) {
        throw std::runtime_error("Unexpected Yang-Baxter local table size.");
      }
      if (outputs.size() == 1) {
        transition.random = false;
        transition.deterministic = outputs[0];
      } else {
        transition.random = true;
        transition.first = outputs[0];
        transition.second = outputs[1];
      }
    }
  }

  g_transitionsReady = true;
}

struct Row {
  char type = 'W';
  int idx = 0;
};

class BitLevels {
 public:
  int levelCount = 0;
  int columnCap = 0;
  int wordsPerLevel = 0;
  std::vector<uint64_t> bits;
  std::vector<int> activeMax;
  std::vector<int> counts;

  BitLevels() = default;

  BitLevels(int levels, int cap) {
    reset(levels, cap);
  }

  void reset(int levels, int cap) {
    if (levels <= 0) throw std::runtime_error("Internal level count must be positive.");
    if (cap <= 0) throw std::runtime_error("Column cap must be positive.");
    levelCount = levels;
    columnCap = cap;
    wordsPerLevel = (columnCap + 63) >> 6;
    const size_t totalWords = static_cast<size_t>(levelCount) *
                              static_cast<size_t>(wordsPerLevel);
    bits.assign(totalWords, 0);
    activeMax.assign(static_cast<size_t>(levelCount), 0);
    counts.assign(static_cast<size_t>(levelCount), 0);
  }

  inline size_t offset(int level) const {
    return static_cast<size_t>(level) * static_cast<size_t>(wordsPerLevel);
  }

  void checkLevel(int level) const {
    if (level < 0 || level >= levelCount) {
      throw std::runtime_error("Internal level index out of range.");
    }
  }

  bool occ(int level, int column) const {
    if (column <= 0 || column > columnCap) return false;
    checkLevel(level);
    const int zero = column - 1;
    const size_t word = offset(level) + static_cast<size_t>(zero >> 6);
    return ((bits[word] >> (zero & 63)) & 1ULL) != 0;
  }

  void setOcc(int level, int column) {
    checkLevel(level);
    if (column <= 0 || column > columnCap) {
      throw std::runtime_error("Attempted to set a particle outside the column cap.");
    }
    const int zero = column - 1;
    const size_t word = offset(level) + static_cast<size_t>(zero >> 6);
    const uint64_t mask = 1ULL << (zero & 63);
    if ((bits[word] & mask) == 0) {
      bits[word] |= mask;
      counts[level] += 1;
      if (column > activeMax[level]) activeMax[level] = column;
    }
  }

  void setRange(int level, int count) {
    if (count < 0 || count > columnCap) {
      throw std::runtime_error("Initial particle range exceeds the column cap.");
    }
    for (int column = 1; column <= count; ++column) setOcc(level, column);
  }

  void clearScratch(std::vector<uint64_t>& scratch) const {
    scratch.assign(static_cast<size_t>(wordsPerLevel), 0);
  }

  void setScratch(std::vector<uint64_t>& scratch, int& scratchMax, int& scratchCount,
                  int column) const {
    if (column <= 0 || column > columnCap) {
      throw std::runtime_error("Attempted to set a scratch particle outside the column cap.");
    }
    const int zero = column - 1;
    const size_t word = static_cast<size_t>(zero >> 6);
    const uint64_t mask = 1ULL << (zero & 63);
    if ((scratch[word] & mask) == 0) {
      scratch[word] |= mask;
      scratchCount += 1;
      if (column > scratchMax) scratchMax = column;
    }
  }

  void replaceLevel(int level, const std::vector<uint64_t>& scratch, int scratchMax,
                    int scratchCount) {
    checkLevel(level);
    if (static_cast<int>(scratch.size()) != wordsPerLevel) {
      throw std::runtime_error("Internal scratch level has the wrong size.");
    }
    std::copy(scratch.begin(), scratch.end(), bits.begin() + offset(level));
    activeMax[level] = scratchMax;
    counts[level] = scratchCount;
  }

  int maxOf3(int a, int b, int c) const {
    checkLevel(a);
    checkLevel(b);
    checkLevel(c);
    return std::max(activeMax[a], std::max(activeMax[b], activeMax[c]));
  }

  std::vector<int> occupiedColumns(int level) const {
    checkLevel(level);
    std::vector<int> out;
    out.reserve(static_cast<size_t>(counts[level]));
    const size_t base = offset(level);
    for (int wordIndex = 0; wordIndex < wordsPerLevel; ++wordIndex) {
      uint64_t word = bits[base + static_cast<size_t>(wordIndex)];
      while (word != 0) {
        const int bitIndex = __builtin_ctzll(word);
        const int column = wordIndex * 64 + bitIndex + 1;
        if (column <= columnCap) out.push_back(column);
        word &= word - 1;
      }
    }
    return out;
  }
};

std::string jsonEscape(const std::string& value) {
  std::string out;
  out.reserve(value.size() + 8);
  for (char ch : value) {
    switch (ch) {
      case '\\': out += "\\\\"; break;
      case '"': out += "\\\""; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if (static_cast<unsigned char>(ch) < 0x20) out += ' ';
        else out += ch;
        break;
    }
  }
  return out;
}

void appendIntArray(std::ostringstream& out, const std::vector<int>& row) {
  out << '[';
  for (size_t i = 0; i < row.size(); ++i) {
    if (i) out << ',';
    out << row[i];
  }
  out << ']';
}

void appendRows(std::ostringstream& out, const std::vector<std::vector<int>>& rows) {
  out << '[';
  for (size_t i = 0; i < rows.size(); ++i) {
    if (i) out << ',';
    appendIntArray(out, rows[i]);
  }
  out << ']';
}

class Sampler {
 public:
  int N = 0;
  int M = 0;
  int columnCap = 0;
  const double* x = nullptr;
  const double* w = nullptr;
  const double* y = nullptr;
  int yLen = 0;
  Xoshiro256pp rng;
  BitLevels levels;
  std::vector<Row> rows;
  std::vector<std::vector<int>> mu;
  std::vector<std::vector<int>> lam;
  std::vector<int> lambda;
  int rowSwaps = 0;
  int localMoves = 0;
  int randomChoices = 0;

  Sampler(int n, int m, const double* xPtr, const double* wPtr, const double* yPtr,
          int yLength, int cap, uint32_t seedLo, uint32_t seedHi)
      : N(n),
        M(m),
        columnCap(cap),
        x(xPtr),
        w(wPtr),
        y(yPtr),
        yLen(yLength),
        rng(seedLo, seedHi),
        levels(n + m + 1, cap) {
    validateInputs();
  }

  void validateInputs() const {
    if (N <= 0 || M <= 0) throw std::runtime_error("N and M must be positive.");
    if (N > 10000 || M > 10000) throw std::runtime_error("N and M are too large.");
    if (columnCap < std::max(1, N)) {
      throw std::runtime_error("Column cap is too small for the frozen initial condition.");
    }
    if (!x || !w) throw std::runtime_error("Null x/w parameter pointer.");
    if (yLen < 0) throw std::runtime_error("Negative y length.");
    if (yLen > 0 && !y) throw std::runtime_error("Null y parameter pointer.");

    for (int i = 0; i < N; ++i) {
      if (!std::isfinite(x[i])) throw std::runtime_error("x contains a non-finite value.");
    }
    for (int j = 0; j < M; ++j) {
      if (!std::isfinite(w[j])) throw std::runtime_error("w contains a non-finite value.");
    }
    for (int k = 0; k < yLen; ++k) {
      if (!std::isfinite(y[k])) throw std::runtime_error("y contains a non-finite value.");
    }
    for (int i = 0; i < N; ++i) {
      for (int j = 0; j < M; ++j) {
        if (!(w[j] > x[i])) {
          std::ostringstream message;
          message << "Parameter check failed: need w_" << (j + 1)
                  << " > x_" << (i + 1) << ".";
          throw std::runtime_error(message.str());
        }
      }
    }
  }

  inline double yVal(int column) const {
    if (column <= 0 || column > yLen) return 0.0;
    return y[column - 1];
  }

  void buildFrozenRhs() {
    rows.clear();
    rows.reserve(static_cast<size_t>(N + M));
    for (int i = N; i >= 1; --i) rows.push_back(Row{'W', i});
    for (int j = 1; j <= M; ++j) rows.push_back(Row{'C', j});

    for (int r = 0; r <= N; ++r) levels.setRange(r, N - r);
  }

  static void validateHorizontal(int value, const char* label, int column) {
    if (value != 0 && value != 1) {
      std::ostringstream message;
      message << label << " horizontal occupancy " << value << " at column "
              << column << "; row configuration is not admissible.";
      throw std::runtime_error(message.str());
    }
  }

  uint8_t localForward(double xx, double ww, double yy, uint8_t boundary,
                       uint8_t input) {
    if (!(ww > xx)) throw std::runtime_error("Need w>x locally.");
    if (!(ww + yy > 0.0) || !(xx + yy >= 0.0)) {
      std::ostringstream message;
      message << "Local positivity failed at y=" << yy
              << ": need w+y>0 and x+y>=0.";
      throw std::runtime_error(message.str());
    }

    const Transition& transition = g_transitions[boundary * 8 + input];
    if (!transition.admissible) {
      std::ostringstream message;
      message << "Internal YB state is not admissible for boundary mask "
              << static_cast<int>(boundary) << " and input "
              << static_cast<int>(input) << ".";
      throw std::runtime_error(message.str());
    }

    if (!transition.random) return transition.deterministic;

    randomChoices += 1;
    const double denom = ww + yy;
    const double pFirst = (xx + yy) / denom;
    if (!(pFirst >= -1e-12 && pFirst <= 1.0 + 1e-12) || !std::isfinite(pFirst)) {
      throw std::runtime_error("Bad Bernoulli probability. Check local positivity.");
    }
    const double clamped = std::max(0.0, std::min(1.0, pFirst));
    return rng.nextDouble() < clamped ? transition.first : transition.second;
  }

  void swapAdjacentRows(int pos) {
    const Row lower = rows[pos];
    const Row upper = rows[pos + 1];
    if (lower.type != 'W' || upper.type != 'C') {
      throw std::runtime_error("swapAdjacentRows called on a non-(W below C) pair.");
    }

    const double xx = x[lower.idx - 1];
    const double ww = w[upper.idx - 1];
    const int bottomLevel = pos;
    const int midLevel = pos + 1;
    const int topLevel = pos + 2;
    const int maxInitialColumn = levels.maxOf3(bottomLevel, midLevel, topLevel);

    std::vector<uint64_t> newMid;
    levels.clearScratch(newMid);
    int newMidMax = 0;
    int newMidCount = 0;

    int hW = 0;
    int hC = 0;
    int carrier1 = 0;
    int carrier2 = 0;

    for (int column = 1; column <= columnCap; ++column) {
      const int b = levels.occ(bottomLevel, column) ? 1 : 0;
      const int k3 = levels.occ(midLevel, column) ? 1 : 0;
      const int t = levels.occ(topLevel, column) ? 1 : 0;
      const int k1 = hW;
      const int k2 = hC;
      const int j1 = hW + b - k3;
      const int j2 = hC + k3 - t;
      const int j3 = t;
      validateHorizontal(j1, "W-row", column);
      validateHorizontal(j2, "check-row", column);

      const uint8_t boundary = static_cast<uint8_t>(
          carrier1 | (carrier2 << 1) | (b << 2) |
          (j1 << 3) | (j2 << 4) | (j3 << 5));
      const uint8_t input = tripleMask(k1, k2, k3);
      const uint8_t output = localForward(xx, ww, yVal(column), boundary, input);
      const int l1 = bit(output, 0);
      const int l2 = bit(output, 1);
      const int l3 = bit(output, 2);

      if (l3 == 1) levels.setScratch(newMid, newMidMax, newMidCount, column);
      carrier1 = l1;
      carrier2 = l2;
      hW = j1;
      hC = j2;
      localMoves += 1;

      if (column >= maxInitialColumn && carrier1 == 1 && carrier2 == 0 &&
          hW == 1 && hC == 0) {
        levels.replaceLevel(midLevel, newMid, newMidMax, newMidCount);
        rows[pos] = upper;
        rows[pos + 1] = lower;
        rowSwaps += 1;
        return;
      }
    }

    std::ostringstream message;
    message << "Column cap " << columnCap << " reached while swapping x"
            << lower.idx << " with w" << upper.idx
            << ". Increase the cap or choose parameters with a lighter tail.";
    throw std::runtime_error(message.str());
  }

  void sampleRows() {
    buildFrozenRhs();
    for (int xIdx = 1; xIdx <= N; ++xIdx) {
      int pos = -1;
      for (int r = 0; r < static_cast<int>(rows.size()); ++r) {
        if (rows[r].type == 'W' && rows[r].idx == xIdx) {
          pos = r;
          break;
        }
      }
      if (pos < 0) throw std::runtime_error("Internal error: x row not found.");
      while (pos + 1 < static_cast<int>(rows.size()) && rows[pos + 1].type == 'C') {
        swapAdjacentRows(pos);
        pos += 1;
      }
    }
  }

  std::vector<int> partitionFromLevel(int level, int length) const {
    const std::vector<int> asc = levels.occupiedColumns(level);
    if (static_cast<int>(asc.size()) != length) {
      std::ostringstream message;
      message << "Expected " << length << " particles at a level, found "
              << asc.size() << ".";
      throw std::runtime_error(message.str());
    }
    std::vector<int> part;
    part.reserve(static_cast<size_t>(length));
    for (int i = 0; i < length; ++i) {
      const int descValue = asc[static_cast<size_t>(length - 1 - i)];
      const int value = descValue - (length - i);
      if (value < 0) {
        throw std::runtime_error("Sampled a negative signature part.");
      }
      if (i > 0 && part[static_cast<size_t>(i - 1)] < value) {
        throw std::runtime_error("Sampled signature is not weakly decreasing.");
      }
      part.push_back(value);
    }
    return part;
  }

  void rebuildMuLamFromLevels() {
    for (int j = 0; j < M; ++j) {
      if (rows[j].type != 'C') throw std::runtime_error("Final row order failed in w-block.");
    }
    for (int s = 0; s < N; ++s) {
      if (rows[M + s].type != 'W') {
        throw std::runtime_error("Final row order failed in x-block.");
      }
    }

    mu.assign(static_cast<size_t>(M + 1), {});
    for (int j = 0; j <= M; ++j) mu[j] = partitionFromLevel(j, N);

    lam.assign(static_cast<size_t>(N + 1), {});
    for (int length = N; length >= 0; --length) {
      const int levelIndex = M + (N - length);
      lam[length] = partitionFromLevel(levelIndex, length);
    }
    lambda = mu[M];
  }

  int sampleSize() const {
    int size = 0;
    for (int value : lambda) size += value;
    return size;
  }

  int maxPositionSeen() const {
    int maxPos = N + 1;
    for (int j = 0; j <= M; ++j) {
      if (!mu[j].empty()) maxPos = std::max(maxPos, mu[j][0] + N);
    }
    for (int j = 1; j <= N; ++j) {
      if (!lam[j].empty()) maxPos = std::max(maxPos, lam[j][0] + j);
    }
    return maxPos;
  }

  std::string resultJson(double elapsedMs) const {
    std::ostringstream out;
    out << "{\"N\":" << N
        << ",\"M\":" << M
        << ",\"sampler\":\"wasm\""
        << ",\"mu\":";
    appendRows(out, mu);
    out << ",\"lam\":";
    appendRows(out, lam);
    out << ",\"lambda\":";
    appendIntArray(out, lambda);
    out << ",\"stats\":{"
        << "\"samples\":1"
        << ",\"size\":" << sampleSize()
        << ",\"maxPos\":" << maxPositionSeen()
        << ",\"rowSwaps\":" << rowSwaps
        << ",\"localMoves\":" << localMoves
        << ",\"randomChoices\":" << randomChoices
        << ",\"elapsedMs\":" << elapsedMs
        << ",\"wasm\":true"
        << "}}";
    return out.str();
  }
};

char* copyStringToHeap(const std::string& value) {
  char* out = static_cast<char*>(std::malloc(value.size() + 1));
  if (!out) return nullptr;
  std::memcpy(out, value.c_str(), value.size() + 1);
  return out;
}

std::string errorJson(const std::string& message) {
  return std::string("{\"error\":\"") + jsonEscape(message) + "\"}";
}

}  // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* sampleFactorialYBE(int N, int M, const double* xPtr, const double* wPtr,
                         const double* yPtr, int yLen, int columnCap,
                         uint32_t seedLo, uint32_t seedHi) {
  try {
    ensureTransitionTable();
    const auto started = std::chrono::high_resolution_clock::now();
    Sampler sampler(N, M, xPtr, wPtr, yPtr, yLen, columnCap, seedLo, seedHi);
    sampler.sampleRows();
    sampler.rebuildMuLamFromLevels();
    const auto finished = std::chrono::high_resolution_clock::now();
    const double elapsedMs =
        std::chrono::duration<double, std::milli>(finished - started).count();
    return copyStringToHeap(sampler.resultJson(elapsedMs));
  } catch (const std::exception& error) {
    return copyStringToHeap(errorJson(error.what()));
  } catch (...) {
    return copyStringToHeap(errorJson("Unknown C++ sampler error."));
  }
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* ptr) {
  std::free(ptr);
}

}  // extern "C"
