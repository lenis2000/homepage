/*
emcc 2025-05-07-dim-lambda-greedy.cpp -o 2025-05-07-dim-lambda-greedy.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateGreedyHook','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
 
Features:
- Greedy hook walk algorithm for growing Young diagrams
- Maximizes dimension f(λ) at each step
- Supports starting from any initial partition
- Implemented using a deterministic version of the complementary hook walk formula
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

using namespace std;

// Global progress counter (0 to 100)
volatile int progressCounter = 0;

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

// Function to calculate factorial
int factorial(int n) {
    if (n <= 1) return 1;
    int result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Calculate hook length for a cell at (row, col)
int getHookLength(int row, int col, const vector<int>& partition) {
    if (row >= static_cast<int>(partition.size()) || col >= partition[row]) return 0;
    
    vector<int> conj = conjugate(partition);
    return (partition[row] - col) + (conj[col] - row) - 1;
}

// Calculate f(λ) using the hook formula
double calculateF(const vector<int>& partition) {
    // Count total number of cells
    int n = accumulate(partition.begin(), partition.end(), 0);
    
    if (n == 0) return 1.0;  // Empty partition
    
    // Calculate product of hook lengths
    int hookProduct = 1;
    for (size_t row = 0; row < partition.size(); row++) {
        for (int col = 0; col < partition[row]; col++) {
            hookProduct *= getHookLength(row, col, partition);
        }
    }
    
    // f(λ) = n! / ∏ hook lengths
    return static_cast<double>(factorial(n)) / hookProduct;
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
    
    // Calculate product of distances to existing corners
    double numerator = 1.0;
    for (const auto& existingCorner : existingCorners) {
        numerator *= distance(corner, existingCorner);
    }
    
    // Calculate product of distances to other addable corners
    double denominator = 1.0;
    for (const auto& otherCorner : otherAddableCorners) {
        denominator *= distance(corner, otherCorner);
    }
    
    // If denominator is 0, return 0 (avoid division by zero)
    if (fabs(denominator) < 1e-9) return 0.0;
    
    return numerator / denominator;
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
        progressCounter = static_cast<int>(100.0 * step / steps);
        emscripten_sleep(0); // Yield to update progress in UI
        
        if (step > 0) json << ",";
        
        // Add current state to JSON
        auto [bestCorner, cornerScores] = findMaximizingCorner(currentPartition);
        
        // Calculate f values for each corner
        vector<pair<pair<int, int>, double>> fValues;
        vector<pair<int, int>> corners = findAddableCorners(currentPartition);
        
        for (const auto& corner : corners) {
            vector<int> newPartition = currentPartition;
            if (corner.first >= static_cast<int>(newPartition.size())) {
                while (newPartition.size() <= static_cast<size_t>(corner.first)) {
                    newPartition.push_back(0);
                }
            }
            newPartition[corner.first] = corner.second + 1;
            double fValue = calculateF(newPartition);
            fValues.push_back({corner, fValue});
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
                 << fValues[i].first.second << "],\"fValue\":" 
                 << fValues[i].second << "}";
        }
        json << "]";
        
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