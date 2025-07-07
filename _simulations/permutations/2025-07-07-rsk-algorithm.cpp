/*
emcc 2025-07-07-rsk-algorithm.cpp -o 2025-07-07-rsk-algorithm.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_performRSK','_performInverseRSK','_freeString','_getTableauShape','_getTableauEntry','_getPermutationEntry']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
 mv 2025-07-07-rsk-algorithm.js ../../js/

Features:
- RSK (Robinson-Schensted-Knuth) algorithm for permutations up to size 10000
- Forward RSK: permutation → (P-tableau, Q-tableau)
- Inverse RSK: (P-tableau, Q-tableau) → permutation
- Efficient C++ implementation for large permutations with optimized memory management
*/

#include <emscripten.h>
#include <vector>
#include <algorithm>
#include <cstring>
#include <string>
#include <sstream>

using namespace std;

// Global storage for tableaux and permutation
vector<vector<int>> pTableau;
vector<vector<int>> qTableau;
vector<int> currentPermutation;
vector<int> tableauShape;

extern "C" {

// Helper function to free allocated strings
EMSCRIPTEN_KEEPALIVE
void freeString(char* str) {
    free(str);
}

// Perform forward RSK algorithm
// Input: comma-separated permutation string (e.g., "3,1,4,2")
// Returns: shape of resulting tableaux as comma-separated string
EMSCRIPTEN_KEEPALIVE
char* performRSK(const char* permStr) {
    // Clear previous data
    pTableau.clear();
    qTableau.clear();
    currentPermutation.clear();
    tableauShape.clear();
    
    // Parse input permutation using stringstream (safer)
    stringstream ss(permStr);
    string token;
    while (getline(ss, token, ',')) {
        if (!token.empty()) {
            currentPermutation.push_back(stoi(token));
        }
    }
    
    int n = currentPermutation.size();
    
    // Reserve memory for large permutations to avoid reallocations
    if (n > 1000) {
        int estimatedRows = min((int)(2.0 * sqrt(n)) + 50, n/2); // Conservative estimate
        pTableau.reserve(estimatedRows);
        qTableau.reserve(estimatedRows);
    }
    
    // Perform RSK insertion for each element
    for (int time = 0; time < n; time++) {
        int value = currentPermutation[time];
        
        // Insert into P-tableau using RSK bumping
        int currentValue = value;
        int row = 0;
        
        while (currentValue != -1) {
            // Ensure row exists
            if (row >= (int)pTableau.size()) {
                pTableau.resize(row + 1);
                qTableau.resize(row + 1);
            }
            
            // Find position to insert/bump
            bool inserted = false;
            for (int col = 0; col < (int)pTableau[row].size(); col++) {
                if (pTableau[row][col] > currentValue) {
                    // Bump this value
                    swap(pTableau[row][col], currentValue);
                    inserted = true;
                    break;
                }
            }
            
            if (!inserted) {
                // Add to end of row
                pTableau[row].push_back(currentValue);
                qTableau[row].push_back(time + 1); // 1-indexed time
                currentValue = -1; // Done
            } else {
                // Continue with bumped value in next row
                row++;
            }
        }
    }
    
    // Calculate shape
    tableauShape.clear();
    for (const auto& row : pTableau) {
        tableauShape.push_back(row.size());
    }
    
    // Return shape as string
    stringstream result;
    for (int i = 0; i < (int)tableauShape.size(); i++) {
        if (i > 0) result << ",";
        result << tableauShape[i];
    }
    
    string resultString = result.str();
    char* resultStr = (char*)malloc(resultString.length() + 1);
    if (resultStr == nullptr) {
        // Memory allocation failed
        return nullptr;
    }
    strcpy(resultStr, resultString.c_str());
    return resultStr;
}

// Perform inverse RSK algorithm
// Returns: recovered permutation as comma-separated string
EMSCRIPTEN_KEEPALIVE
char* performInverseRSK() {
    if (pTableau.empty() || qTableau.empty()) {
        char* errorStr = (char*)malloc(6);
        strcpy(errorStr, "error");
        return errorStr;
    }
    
    // Make copies of tableaux
    vector<vector<int>> pCopy = pTableau;
    vector<vector<int>> qCopy = qTableau;
    vector<int> result;
    
    // Find maximum time value
    int maxTime = 0;
    for (const auto& row : qCopy) {
        for (int val : row) {
            maxTime = max(maxTime, val);
        }
    }
    
    // Extract elements in reverse time order
    for (int time = maxTime; time >= 1; time--) {
        // Find position of time in Q-tableau
        int qRow = -1, qCol = -1;
        for (int r = 0; r < (int)qCopy.size(); r++) {
            for (int c = 0; c < (int)qCopy[r].size(); c++) {
                if (qCopy[r][c] == time) {
                    qRow = r;
                    qCol = c;
                    break;
                }
            }
            if (qRow != -1) break;
        }
        
        if (qRow == -1) continue;
        
        // Remove from Q-tableau
        qCopy[qRow].erase(qCopy[qRow].begin() + qCol);
        if (qCopy[qRow].empty()) {
            qCopy.erase(qCopy.begin() + qRow);
        }
        
        // Extract from P-tableau with reverse bumping
        int value = pCopy[qRow][qCol];
        pCopy[qRow].erase(pCopy[qRow].begin() + qCol);
        if (pCopy[qRow].empty()) {
            pCopy.erase(pCopy.begin() + qRow);
        }
        
        // Reverse bump up through rows
        for (int row = qRow - 1; row >= 0; row--) {
            // Find largest element smaller than value
            int bestCol = -1;
            for (int col = (int)pCopy[row].size() - 1; col >= 0; col--) {
                if (pCopy[row][col] < value) {
                    bestCol = col;
                    break;
                }
            }
            
            if (bestCol != -1) {
                swap(pCopy[row][bestCol], value);
            }
        }
        
        result.push_back(value);
    }
    
    // Reverse to get correct order
    reverse(result.begin(), result.end());
    
    // Return as string
    stringstream resultStream;
    for (int i = 0; i < (int)result.size(); i++) {
        if (i > 0) resultStream << ",";
        resultStream << result[i];
    }
    
    string resultString = resultStream.str();
    char* resultStr = (char*)malloc(resultString.length() + 1);
    if (resultStr == nullptr) {
        // Memory allocation failed
        return nullptr;
    }
    strcpy(resultStr, resultString.c_str());
    return resultStr;
}

// Get shape of current tableaux
EMSCRIPTEN_KEEPALIVE
char* getTableauShape() {
    stringstream result;
    for (int i = 0; i < (int)tableauShape.size(); i++) {
        if (i > 0) result << ",";
        result << tableauShape[i];
    }
    
    string resultString = result.str();
    char* resultStr = (char*)malloc(resultString.length() + 1);
    if (resultStr == nullptr) {
        return nullptr;
    }
    strcpy(resultStr, resultString.c_str());
    return resultStr;
}

// Get entry from P-tableau at (row, col) - 0-indexed
EMSCRIPTEN_KEEPALIVE
int getTableauEntry(int tableau, int row, int col) {
    if (tableau == 0) { // P-tableau
        if (row < (int)pTableau.size() && col < (int)pTableau[row].size()) {
            return pTableau[row][col];
        }
    } else { // Q-tableau
        if (row < (int)qTableau.size() && col < (int)qTableau[row].size()) {
            return qTableau[row][col];
        }
    }
    return -1;
}

// Get permutation entry at index
EMSCRIPTEN_KEEPALIVE
int getPermutationEntry(int index) {
    if (index >= 0 && index < (int)currentPermutation.size()) {
        return currentPermutation[index];
    }
    return -1;
}

} // extern "C"
