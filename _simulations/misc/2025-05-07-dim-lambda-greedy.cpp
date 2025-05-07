/*
emcc 2025-05-07-dim-lambda-greedy.cpp -o ../../js/2025-05-07-dim-lambda-greedy.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateGreedyHook','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=512MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
 
Features:
- Greedy hook walk algorithm for growing Young diagrams
- Maximizes dimension f(λ) at each step
- Supports starting from any initial partition
- Implemented using a deterministic version of the complementary hook walk formula
- Uses a custom implementation for handling large integers
*/

#include <emscripten.h>
#include <vector>
#include <string>
#include <cmath>
#include <sstream>
#include <algorithm>
#include <numeric>
#include <iostream>
#include <cstring>
#include <utility>
#include <deque>

using namespace std;

// Global progress counter (0 to 100)
volatile int progressCounter = 0;
volatile int totalStepsToCompute = 0;

// Custom big integer implementation that can handle factorial calculations
class BigInteger {
private:
    // Store digits in base 10^9 for efficiency
    static const int BASE = 1000000000;
    static const int BASE_DIGITS = 9;
    
    vector<int> digits;  // Stores digits in base 10^9
    bool isNegative;     // Sign flag
    
    // Remove leading zeros
    void normalize() {
        while (digits.size() > 1 && digits.back() == 0) {
            digits.pop_back();
        }
        
        // Check for zero
        if (digits.size() == 1 && digits[0] == 0) {
            isNegative = false;
        }
    }
    
public:
    // Default constructor - initialize to zero
    BigInteger() : isNegative(false) {
        digits.push_back(0);
    }
    
    // Constructor from long
    BigInteger(long value) : isNegative(value < 0) {
        if (value < 0) value = -value;
        
        if (value == 0) {
            digits.push_back(0);
        } else {
            while (value > 0) {
                digits.push_back(value % BASE);
                value /= BASE;
            }
        }
    }
    
    // Constructor from string
    BigInteger(const string& str) {
        digits.clear();
        isNegative = false;
        
        int start = 0;
        if (str[0] == '-') {
            isNegative = true;
            start = 1;
        } else if (str[0] == '+') {
            start = 1;
        }
        
        // Process the string from right to left in BASE_DIGITS chunks
        for (int i = str.length() - 1; i >= start; i -= BASE_DIGITS) {
            int segmentStart = max(start, i - BASE_DIGITS + 1);
            string segment = str.substr(segmentStart, i - segmentStart + 1);
            digits.push_back(stoi(segment));
        }
        
        normalize();
    }
    
    // Copy constructor
    BigInteger(const BigInteger& other) : digits(other.digits), isNegative(other.isNegative) {}
    
    // Assignment operator
    BigInteger& operator=(const BigInteger& other) {
        if (this != &other) {
            digits = other.digits;
            isNegative = other.isNegative;
        }
        return *this;
    }
    
    // Multiplication by integer
    BigInteger operator*(int value) const {
        if (value == 0) return BigInteger();
        
        BigInteger result = *this;
        if (value < 0) {
            result.isNegative = !result.isNegative;
            value = -value;
        }
        
        long long carry = 0;
        for (size_t i = 0; i < result.digits.size() || carry; ++i) {
            if (i == result.digits.size()) {
                result.digits.push_back(0);
            }
            
            long long product = (long long)result.digits[i] * value + carry;
            result.digits[i] = product % BASE;
            carry = product / BASE;
        }
        
        result.normalize();
        return result;
    }
    
    // Division by integer
    BigInteger operator/(int value) const {
        if (value == 0) {
            throw std::runtime_error("Division by zero");
        }
        
        BigInteger result = *this;
        if (value < 0) {
            result.isNegative = !result.isNegative;
            value = -value;
        }
        
        long long remainder = 0;
        for (int i = result.digits.size() - 1; i >= 0; --i) {
            long long current = result.digits[i] + remainder * BASE;
            result.digits[i] = current / value;
            remainder = current % value;
        }
        
        result.normalize();
        return result;
    }
    
    // GCD calculation
    static BigInteger gcd(const BigInteger& a, const BigInteger& b) {
        BigInteger x = a;
        BigInteger y = b;
        
        // Make both positive
        x.isNegative = false;
        y.isNegative = false;
        
        while (!y.isZero()) {
            BigInteger temp = y;
            y = x % y;
            x = temp;
        }
        
        return x;
    }
    
    // Modulo operator
    BigInteger operator%(const BigInteger& other) const {
        // Simple but inefficient implementation
        BigInteger quotient = *this / other;
        return *this - (quotient * other);
    }
    
    // Division by BigInteger (simplified implementation)
    BigInteger operator/(const BigInteger& other) const {
        if (other.isZero()) {
            throw std::runtime_error("Division by zero");
        }
        
        // Handle easy cases
        if (this->isZero()) return BigInteger();
        if (other == BigInteger(1)) return *this;
        if (other == BigInteger(-1)) {
            BigInteger result = *this;
            result.isNegative = !result.isNegative;
            return result;
        }
        
        // For our purposes, we only need integer division for simple cases
        // Full implementation would be more complex
        
        // For small numbers, convert to long and use integer division
        if (this->digits.size() <= 2 && other.digits.size() <= 2) {
            long a = this->toLong();
            long b = other.toLong();
            return BigInteger(a / b);
        }
        
        // For large numbers, estimate division using a more efficient algorithm
        // This is a simplified implementation
        BigInteger result;
        BigInteger remainder = *this;
        remainder.isNegative = false;  // Work with absolute values
        
        BigInteger divisor = other;
        divisor.isNegative = false;
        
        if (remainder < divisor) {
            return BigInteger();  // Result is 0
        }
        
        // Binary search to find the result
        BigInteger left = BigInteger(1);
        BigInteger right = remainder;
        
        while (left <= right) {
            BigInteger mid = (left + right) / BigInteger(2);
            BigInteger product = mid * divisor;
            
            if (product <= remainder) {
                result = mid;
                left = mid + BigInteger(1);
            } else {
                right = mid - BigInteger(1);
            }
        }
        
        // Set the sign
        if (isNegative != other.isNegative) {
            result.isNegative = true;
        }
        
        return result;
    }
    
    // Addition
    BigInteger operator+(const BigInteger& other) const {
        // If signs are different, convert to subtraction
        if (isNegative != other.isNegative) {
            if (isNegative) {
                BigInteger temp = *this;
                temp.isNegative = false;
                return other - temp;
            } else {
                BigInteger temp = other;
                temp.isNegative = false;
                return *this - temp;
            }
        }
        
        // Signs are the same, perform addition
        BigInteger result;
        result.digits.resize(max(digits.size(), other.digits.size()) + 1, 0);
        result.isNegative = isNegative;
        
        int carry = 0;
        for (size_t i = 0; i < result.digits.size() - 1; ++i) {
            int sum = carry;
            if (i < digits.size()) sum += digits[i];
            if (i < other.digits.size()) sum += other.digits[i];
            
            result.digits[i] = sum % BASE;
            carry = sum / BASE;
        }
        
        if (carry > 0) {
            result.digits.back() = carry;
        }
        
        result.normalize();
        return result;
    }
    
    // Subtraction
    BigInteger operator-(const BigInteger& other) const {
        // If signs are different, convert to addition
        if (isNegative != other.isNegative) {
            BigInteger temp = other;
            temp.isNegative = !temp.isNegative;
            return *this + temp;
        }
        
        // Determine which number has larger absolute value
        bool swapped = false;
        if (isNegative) {
            // Both negative, compare absolute values
            if (absLessThan(*this, other)) {
                swapped = true;
            }
        } else {
            // Both positive, compare absolute values
            if (absLessThan(*this, other)) {
                swapped = true;
            }
        }
        
        const BigInteger& larger = swapped ? other : *this;
        const BigInteger& smaller = swapped ? *this : other;
        
        BigInteger result;
        result.digits.resize(larger.digits.size(), 0);
        
        int borrow = 0;
        for (size_t i = 0; i < larger.digits.size(); ++i) {
            int diff = larger.digits[i] - borrow;
            if (i < smaller.digits.size()) diff -= smaller.digits[i];
            
            if (diff < 0) {
                diff += BASE;
                borrow = 1;
            } else {
                borrow = 0;
            }
            
            result.digits[i] = diff;
        }
        
        result.isNegative = (isNegative != swapped);
        result.normalize();
        return result;
    }
    
    // Multiplication
    BigInteger operator*(const BigInteger& other) const {
        if (isZero() || other.isZero()) return BigInteger();
        
        // Initialize result with enough space
        BigInteger result;
        result.digits.resize(digits.size() + other.digits.size(), 0);
        
        // Perform multiplication
        for (size_t i = 0; i < digits.size(); ++i) {
            int carry = 0;
            for (size_t j = 0; j < other.digits.size() || carry; ++j) {
                long long product = result.digits[i + j] + 
                                   (long long)digits[i] * (j < other.digits.size() ? other.digits[j] : 0) + 
                                   carry;
                result.digits[i + j] = product % BASE;
                carry = product / BASE;
            }
        }
        
        // Set sign
        result.isNegative = (isNegative != other.isNegative);
        result.normalize();
        return result;
    }
    
    // Check if number is zero
    bool isZero() const {
        return digits.size() == 1 && digits[0] == 0;
    }
    
    // Comparison: less than
    bool operator<(const BigInteger& other) const {
        if (isNegative != other.isNegative) {
            return isNegative;
        }
        
        if (isNegative) {
            return absLessThan(other, *this);
        } else {
            return absLessThan(*this, other);
        }
    }
    
    // Comparison: less than or equal
    bool operator<=(const BigInteger& other) const {
        return (*this < other) || (*this == other);
    }
    
    // Comparison: equal
    bool operator==(const BigInteger& other) const {
        if (isNegative != other.isNegative) return false;
        if (digits.size() != other.digits.size()) return false;
        
        for (size_t i = 0; i < digits.size(); ++i) {
            if (digits[i] != other.digits[i]) return false;
        }
        
        return true;
    }
    
    // Convert to string
    string toString() const {
        if (isZero()) return "0";
        
        string result = isNegative ? "-" : "";
        
        // Add most significant digit first
        result += to_string(digits.back());
        
        // Add remaining digits with leading zeros
        for (int i = digits.size() - 2; i >= 0; --i) {
            string digitStr = to_string(digits[i]);
            // Pad with leading zeros
            result += string(BASE_DIGITS - digitStr.length(), '0') + digitStr;
        }
        
        return result;
    }
    
    // Convert to long (for small numbers)
    long toLong() const {
        if (digits.size() > 2) {
            throw std::runtime_error("Number too large for long conversion");
        }
        
        long result = 0;
        for (int i = digits.size() - 1; i >= 0; --i) {
            result = result * BASE + digits[i];
        }
        
        return isNegative ? -result : result;
    }
    
private:
    // Helper to compare absolute values
    static bool absLessThan(const BigInteger& a, const BigInteger& b) {
        if (a.digits.size() != b.digits.size()) {
            return a.digits.size() < b.digits.size();
        }
        
        for (int i = a.digits.size() - 1; i >= 0; --i) {
            if (a.digits[i] != b.digits[i]) {
                return a.digits[i] < b.digits[i];
            }
        }
        
        return false;  // They're equal
    }
};

// Rational number using BigInteger
class BigRational {
private:
    BigInteger num;  // Numerator
    BigInteger den;  // Denominator
    
    // Normalize the fraction
    void normalize() {
        if (den < BigInteger(0)) {
            num = num * (-1);
            den = den * (-1);
        }
        
        BigInteger g = BigInteger::gcd(num, den);
        if (!(g == BigInteger(1) || g == BigInteger(-1))) {
            num = num / g;
            den = den / g;
        }
    }
    
public:
    // Default constructor
    BigRational() : num(0), den(1) {}
    
    // Constructor from integers
    BigRational(int n, int d = 1) : num(n), den(d) {
        if (d == 0) {
            throw std::runtime_error("Division by zero");
        }
        normalize();
    }
    
    // Constructor from BigInteger
    BigRational(const BigInteger& n, const BigInteger& d = BigInteger(1)) : num(n), den(d) {
        if (den.isZero()) {
            throw std::runtime_error("Division by zero");
        }
        normalize();
    }
    
    // Multiplication
    BigRational operator*(const BigRational& other) const {
        return BigRational(num * other.num, den * other.den);
    }
    
    // Multiplication by integer
    BigRational operator*(int value) const {
        return BigRational(num * value, den);
    }
    
    // Division
    BigRational operator/(const BigRational& other) const {
        return BigRational(num * other.den, den * other.num);
    }
    
    // Convert to double
    double toDouble() const {
        // This is an approximation - works for medium sized numbers
        try {
            long numLong = num.toLong();
            long denLong = den.toLong();
            return (double)numLong / denLong;
        } catch (const std::runtime_error&) {
            // If too large for long, use string conversion and stod
            return stod(num.toString()) / stod(den.toString());
        }
    }
    
    // Convert to string
    string toString() const {
        if (den == BigInteger(1)) {
            return num.toString();
        } else {
            return num.toString() + "/" + den.toString();
        }
    }
};

// Utility function to split a string by a delimiter
vector<int> splitToInt(const string& input, char delimiter) {
    vector<int> result;
    stringstream ss(input);
    string item;
    
    while (getline(ss, item, delimiter)) {
        // Trim whitespace
        item.erase(0, item.find_first_not_of(" \t"));
        item.erase(item.find_last_not_of(" \t") + 1);
        
        if (!item.empty()) {
            result.push_back(stoi(item));
        }
    }
    
    return result;
}

// Function to get the conjugate (transpose) of a partition
vector<int> conjugate(const vector<int>& partition) {
    if (partition.empty()) return {};
    
    vector<int> result(partition[0], 0);
    for (size_t i = 0; i < partition.size(); i++) {
        for (int j = 0; j < partition[i]; j++) {
            result[j]++;
        }
    }
    return result;
}

// Find all valid corners where we can add a box to the partition
// Returns vector of [row, col] coordinates
vector<pair<int, int>> findAddableCorners(const vector<int>& partition) {
    vector<pair<int, int>> corners;
    
    // First row special case - can always add to the end
    if (partition.empty()) {
        corners.push_back({0, 0});
        return corners;
    }
    
    // Can add to end of first row
    corners.push_back({0, partition[0]});
    
    // For other rows
    for (size_t i = 1; i < partition.size(); i++) {
        if (partition[i] < partition[i-1]) {
            corners.push_back({static_cast<int>(i), partition[i]});
        }
    }
    
    // Can add a new row if last row is non-empty
    if (!partition.empty() && partition[partition.size()-1] > 0) {
        corners.push_back({static_cast<int>(partition.size()), 0});
    }
    
    return corners;
}

// Find all corners of the current shape
// These are positions where removing a box would still give a valid partition
vector<pair<int, int>> findCorners(const vector<int>& partition) {
    vector<pair<int, int>> corners;
    
    for (size_t i = 0; i < partition.size(); i++) {
        // Last column in this row
        if (partition[i] > 0 && (i == partition.size() - 1 || partition[i] > partition[i+1])) {
            corners.push_back({static_cast<int>(i), partition[i] - 1});
        }
    }
    
    return corners;
}

// Calculate Manhattan distance between two cells
int distance(const pair<int, int>& cell1, const pair<int, int>& cell2) {
    return abs(cell1.first - cell2.first) + abs(cell1.second - cell2.second);
}

// Calculate factorial using our BigInteger
BigInteger factorial(int n) {
    // Guard against very large inputs
    if (n > 1000) {
        throw std::runtime_error("Factorial too large to compute");
    }
    
    BigInteger result(1);
    for (int i = 2; i <= n; i++) {
        result = result * i;
        // Add some safety checks for extremely large numbers
        if (result.toString().length() > 10000) {
            throw std::runtime_error("Factorial result too large to handle");
        }
    }
    return result;
}

// Calculate hook length for a cell at (row, col)
int getHookLength(int row, int col, const vector<int>& partition) {
    if (row >= static_cast<int>(partition.size()) || col >= partition[row]) return 0;
    
    vector<int> conj = conjugate(partition);
    return (partition[row] - col) + (conj[col] - row) - 1;
}

// Calculate f(λ) using the hook formula with log arithmetic for extreme precision
string calculateFLogForm(const vector<int>& partition) {
    // Count total number of cells
    int n = accumulate(partition.begin(), partition.end(), 0);
    
    if (n == 0) return "1";  // Empty partition
    
    // For extremely large values, use log-based calculation
    // ln(f(λ)) = ln(n!) - Σ ln(hook_lengths)
    // This avoids overflow for huge factorials
    
    // Calculate ln(n!)
    double log_n_factorial = 0.0;
    for (int i = 2; i <= n; i++) {
        log_n_factorial += log(i);
    }
    
    // Calculate sum of ln(hook_lengths)
    double log_hook_product = 0.0;
    for (size_t row = 0; row < partition.size(); row++) {
        for (int col = 0; col < partition[row]; col++) {
            int hook = getHookLength(row, col, partition);
            log_hook_product += log(hook);
        }
    }
    
    // Calculate ln(f(λ))
    double log_f = log_n_factorial - log_hook_product;
    
    // Return as a formatted string with approximate magnitude
    char buffer[100];
    sprintf(buffer, "e^%.2f (≈10^%.2f)", log_f, log_f / log(10));
    return string(buffer);
}

// Calculate f(λ) using the hook formula with arbitrary precision
// Returns a BigRational for exact calculation when possible,
// falls back to logarithmic approximation for extreme values
BigRational calculateF(const vector<int>& partition) {
    // Count total number of cells
    int n = accumulate(partition.begin(), partition.end(), 0);
    
    if (n == 0) return BigRational(1);  // Empty partition
    
    // For very large partitions, use the log form
    if (n > 100) {
        // Return a BigRational that will be converted to string
        // in a special format that indicates it's a log-form approximation
        string approx = calculateFLogForm(partition);
        throw std::runtime_error("log_form:" + approx);
    }
    
    try {
        // Calculate n! and product of hook lengths
        BigInteger n_factorial = factorial(n);
        
        // Calculate product of hook lengths
        BigInteger hook_product(1);
        
        for (size_t row = 0; row < partition.size(); row++) {
            for (int col = 0; col < partition[row]; col++) {
                int hook = getHookLength(row, col, partition);
                hook_product = hook_product * hook;
            }
        }
        
        // f(λ) = n! / ∏ hook lengths
        return BigRational(n_factorial, hook_product);
    } catch (const std::exception& e) {
        // Check if this is our special log form exception
        string error_msg = e.what();
        if (error_msg.substr(0, 9) == "log_form:") {
            // Just rethrow it
            throw;
        }
        
        // Otherwise try the log form
        string approx = calculateFLogForm(partition);
        throw std::runtime_error("log_form:" + approx);
    }
}

// Calculate the probability score for a potential corner
// based on the complementary hook walk formula
double calculateCornerScore(const pair<int, int>& corner, const vector<int>& partition) {
    // Get all corners of the current shape
    vector<pair<int, int>> existingCorners = findCorners(partition);
    
    // Add the proposed corner temporarily to find other corners of complementary board
    vector<int> newPartition = partition;
    if (corner.first >= static_cast<int>(newPartition.size())) {
        while (newPartition.size() <= static_cast<size_t>(corner.first)) {
            newPartition.push_back(0);
        }
    }
    newPartition[corner.first] = corner.second + 1;
    
    // Get all corners of the new shape (except the one we added)
    vector<pair<int, int>> otherAddableCorners = findAddableCorners(newPartition);
    // Filter out the corner we're adding
    otherAddableCorners.erase(
        remove_if(otherAddableCorners.begin(), otherAddableCorners.end(),
                 [&corner](const pair<int, int>& c) { 
                     return c.first == corner.first && c.second == corner.second;
                 }),
        otherAddableCorners.end()
    );
    
    // Calculate exact score using BigRational
    BigRational exact_score(1);
    
    // Calculate product of distances to existing corners
    for (const auto& existingCorner : existingCorners) {
        exact_score = exact_score * distance(corner, existingCorner);
    }
    
    // Calculate product of distances to other addable corners
    BigRational denominator(1);
    for (const auto& otherCorner : otherAddableCorners) {
        denominator = denominator * distance(corner, otherCorner);
    }
    
    // If denominator is 0, return 0
    if (denominator.toDouble() < 1e-9) return 0.0;
    
    // Compute the final score
    exact_score = exact_score / denominator;
    
    // Convert to double for comparison (actual values are kept exact)
    return exact_score.toDouble();
}

// Find the corner that would maximize f(μ) when added to partition
pair<pair<int, int>, vector<pair<pair<int, int>, double>>> findMaximizingCorner(const vector<int>& partition) {
    vector<pair<int, int>> corners = findAddableCorners(partition);
    
    double maxScore = -1;
    pair<int, int> bestCorner = {-1, -1};
    vector<pair<pair<int, int>, double>> scores;
    
    for (const auto& corner : corners) {
        double score = calculateCornerScore(corner, partition);
        scores.push_back({corner, score});
        
        if (score > maxScore) {
            maxScore = score;
            bestCorner = corner;
        }
    }
    
    return {bestCorner, scores};
}

// Perform one step of the greedy hook walk
vector<int> addBestCorner(const vector<int>& partition) {
    auto [bestCorner, scores] = findMaximizingCorner(partition);
    
    if (bestCorner.first == -1) return partition;  // No valid corners found
    
    vector<int> newPartition = partition;
    if (bestCorner.first >= static_cast<int>(newPartition.size())) {
        while (newPartition.size() <= static_cast<size_t>(bestCorner.first)) {
            newPartition.push_back(0);
        }
    }
    newPartition[bestCorner.first] = bestCorner.second + 1;
    
    return newPartition;
}

// Grow a partition using the greedy hook walk algorithm
// Returns JSON with each step of the process
string simulateGreedyWalk(vector<int> initialPartition, int steps) {
    vector<int> currentPartition = initialPartition;
    
    stringstream json;
    json << "[";
    
    for (int step = 0; step < steps; step++) {
        // Update progress
        progressCounter = static_cast<int>(100.0 * step / totalStepsToCompute);
        emscripten_sleep(0); // Yield to update progress in UI
        
        if (step > 0) json << ",";
        
        // Add current state to JSON
        auto [bestCorner, cornerScores] = findMaximizingCorner(currentPartition);
        
        // Calculate f values for each corner
        vector<pair<pair<int, int>, string>> fValues;
        vector<pair<int, int>> corners = findAddableCorners(currentPartition);
        
        for (const auto& corner : corners) {
            vector<int> newPartition = currentPartition;
            if (corner.first >= static_cast<int>(newPartition.size())) {
                while (newPartition.size() <= static_cast<size_t>(corner.first)) {
                    newPartition.push_back(0);
                }
            }
            newPartition[corner.first] = corner.second + 1;
            
            try {
                // Calculate exact f value using arbitrary precision
                BigRational fValue = calculateF(newPartition);
                
                // Convert to string for JSON
                fValues.push_back({corner, fValue.toString()});
            } catch (const std::exception& e) {
                string error_msg = e.what();
                
                // Check if this is our special log form exception
                if (error_msg.substr(0, 9) == "log_form:") {
                    // Extract the log approximation
                    string log_approx = error_msg.substr(9);
                    fValues.push_back({corner, "\"" + log_approx + "\""});
                } else {
                    // Some other error
                    fValues.push_back({corner, "\"too large to compute\""});
                }
            }
        }
        
        json << "{";
        
        // Add current partition
        json << "\"partition\":[";
        for (size_t i = 0; i < currentPartition.size(); i++) {
            if (i > 0) json << ",";
            json << currentPartition[i];
        }
        json << "],";
        
        // Add best corner
        json << "\"bestCorner\":[" << bestCorner.first << "," << bestCorner.second << "],";
        
        // Add corner scores
        json << "\"cornerScores\":[";
        for (size_t i = 0; i < cornerScores.size(); i++) {
            if (i > 0) json << ",";
            json << "{\"corner\":[" << cornerScores[i].first.first << "," 
                 << cornerScores[i].first.second << "],\"score\":" 
                 << cornerScores[i].second << "}";
        }
        json << "],";
        
        // Add f values
        json << "\"fValues\":[";
        for (size_t i = 0; i < fValues.size(); i++) {
            if (i > 0) json << ",";
            json << "{\"corner\":[" << fValues[i].first.first << "," 
                 << fValues[i].first.second << "],\"fValue\":\"" 
                 << fValues[i].second << "\"}";
        }
        json << "],";
        
        // Add step number
        json << "\"step\":" << step;
        
        json << "}";
        
        // Update partition for next step
        currentPartition = addBestCorner(currentPartition);
    }
    
    json << "]";
    return json.str();
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* simulateGreedyHook(const char* partitionStr, int steps) {
    try {
        // Reset progress counter
        progressCounter = 0;
        totalStepsToCompute = steps;
        
        // Parse the input partition
        vector<int> initialPartition = splitToInt(partitionStr, ',');
        
        // Ensure partition is valid (non-increasing)
        for (size_t i = 1; i < initialPartition.size(); i++) {
            if (initialPartition[i] > initialPartition[i-1]) {
                throw runtime_error("Invalid partition: row lengths must be non-increasing");
            }
        }
        
        // Run the simulation
        string resultJson = simulateGreedyWalk(initialPartition, steps);
        
        // Set progress to 100%
        progressCounter = 100;
        
        // Allocate memory for the result
        char* result = (char*)malloc(resultJson.size() + 1);
        if (!result) {
            throw runtime_error("Failed to allocate memory for result");
        }
        
        strcpy(result, resultJson.c_str());
        return result;
    }
    catch (const exception& e) {
        // Return error as JSON
        string errorJson = "{\"error\":\"" + string(e.what()) + "\"}";
        char* result = (char*)malloc(errorJson.size() + 1);
        if (result) {
            strcpy(result, errorJson.c_str());
        }
        else {
            // Minimal fallback if allocation fails
            result = (char*)malloc(3);
            if (result) {
                strcpy(result, "{}");
            }
        }
        
        // Set progress to 100% to stop progress indicator
        progressCounter = 100;
        
        return result;
    }
}

EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

EMSCRIPTEN_KEEPALIVE
int getProgress() {
    return progressCounter;
}

} // extern "C"