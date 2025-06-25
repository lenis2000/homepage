/*
emcc pascal-wasm.c -o pascal-wasm.js \
 -s WASM=1 \
 -s "EXPORTED_FUNCTIONS=['_generatePascalPattern','_isPositionDivisible','_freePascalPattern']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=32MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math
 mv pascal-wasm.js ../../js/
*/

#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>

// Export function to generate Pascal's triangle with modular arithmetic
// Returns a flat array where position (row, col) is at index: sum(0..row-1) + col
EMSCRIPTEN_KEEPALIVE
uint8_t* generatePascalTriangleMod(int rows, int modulus) {
    // Calculate total size needed for the triangle
    int totalSize = (rows * (rows + 1)) / 2;
    uint8_t* triangle = (uint8_t*)malloc(totalSize * sizeof(uint8_t));
    
    if (!triangle) return NULL;
    
    int index = 0;
    
    // Generate Pascal's triangle with modular arithmetic
    for (int row = 0; row < rows; row++) {
        // First element of each row is always 1
        triangle[index] = 1 % modulus;
        
        // Calculate middle elements
        for (int col = 1; col < row; col++) {
            // Get indices of the two elements above
            int prevRowStart = ((row - 1) * row) / 2;
            int leftParent = prevRowStart + col - 1;
            int rightParent = prevRowStart + col;
            
            // Calculate using modular arithmetic
            triangle[index + col] = (triangle[leftParent] + triangle[rightParent]) % modulus;
        }
        
        // Last element of each row is always 1 (if row > 0)
        if (row > 0) {
            triangle[index + row] = 1 % modulus;
        }
        
        index += row + 1;
    }
    
    return triangle;
}

// Helper function to get a specific value from the triangle
EMSCRIPTEN_KEEPALIVE
uint8_t getPascalValue(uint8_t* triangle, int row, int col) {
    if (!triangle || col > row || col < 0 || row < 0) return 0;
    
    int index = (row * (row + 1)) / 2 + col;
    return triangle[index];
}

// Function to free the allocated memory
EMSCRIPTEN_KEEPALIVE
void freePascalTriangle(uint8_t* triangle) {
    if (triangle) {
        free(triangle);
    }
}

// Optimized function to generate only the divisibility pattern (0s and 1s)
// Returns bit-packed array where 1 means divisible by modulus
EMSCRIPTEN_KEEPALIVE
uint32_t* generatePascalPattern(int rows, int modulus) {
    // Calculate total bits needed
    int totalBits = (rows * (rows + 1)) / 2;
    int arraySize = (totalBits + 31) / 32; // Round up to nearest 32 bits
    uint32_t* pattern = (uint32_t*)calloc(arraySize, sizeof(uint32_t));
    
    if (!pattern) return NULL;
    
    // Temporary array to store current and previous row
    uint8_t* prevRow = (uint8_t*)calloc(rows, sizeof(uint8_t));
    uint8_t* currRow = (uint8_t*)calloc(rows, sizeof(uint8_t));
    
    if (!prevRow || !currRow) {
        free(pattern);
        free(prevRow);
        free(currRow);
        return NULL;
    }
    
    int bitIndex = 0;
    
    for (int row = 0; row < rows; row++) {
        // First element is always 1
        currRow[0] = 1 % modulus;
        
        // Calculate middle elements
        for (int col = 1; col < row; col++) {
            currRow[col] = (prevRow[col - 1] + prevRow[col]) % modulus;
        }
        
        // Last element is always 1
        if (row > 0) {
            currRow[row] = 1 % modulus;
        }
        
        // Pack the divisibility pattern into bits
        for (int col = 0; col <= row; col++) {
            if (currRow[col] == 0) {
                // Set bit if divisible by modulus
                int arrayIndex = bitIndex / 32;
                int bitPosition = bitIndex % 32;
                pattern[arrayIndex] |= (1U << bitPosition);
            }
            bitIndex++;
        }
        
        // Swap current and previous row
        uint8_t* temp = prevRow;
        prevRow = currRow;
        currRow = temp;
    }
    
    free(prevRow);
    free(currRow);
    
    return pattern;
}

// Check if a specific position is divisible by modulus
EMSCRIPTEN_KEEPALIVE
int isPositionDivisible(uint32_t* pattern, int row, int col) {
    if (!pattern || col > row || col < 0 || row < 0) return 0;
    
    int bitIndex = (row * (row + 1)) / 2 + col;
    int arrayIndex = bitIndex / 32;
    int bitPosition = bitIndex % 32;
    
    return (pattern[arrayIndex] & (1U << bitPosition)) ? 1 : 0;
}

// Free the pattern array
EMSCRIPTEN_KEEPALIVE
void freePascalPattern(uint32_t* pattern) {
    if (pattern) {
        free(pattern);
    }
}