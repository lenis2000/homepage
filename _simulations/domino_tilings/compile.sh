#!/bin/bash

# Compilation script for optimized domino tiling simulations
echo "Compiling domino tiling simulations..."

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten compiler (emcc) not found. Please install Emscripten SDK."
    exit 1
fi

# Compile the uniform simulation
echo "Compiling uniform simulation..."
emcc 2025-02-02-aztec-uniform-optimized.cpp -o 2025-02-02-aztec-uniform.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

# Compile the 2x2 periodic simulation
echo "Compiling 2x2 periodic simulation..."
emcc 2025-02-03-aztec-periodic-optimized.cpp -o 2025-02-03-aztec-periodic.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

# Compile the 3x3 periodic simulation
echo "Compiling 3x3 periodic simulation..."
emcc 2025-04-18-three-periodic-optimized.cpp -o 2025-04-18-three-periodic.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

# Compile the 2x2 Aztec Glauber simulation
echo "Compiling 2x2 Aztec Glauber simulation..."
emcc 2025-04-21-aztec-glauber-two-by-two.cpp -o 2025-04-21-aztec-glauber-two-by-two.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec', '_performGlauberStep', '_performGlauberSteps', '_simulateAztecGlauber', '_freeString', '_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

# Compile the 3D visualization
echo "Compiling 3D visualization..."
emcc 2025-04-17-aztec-uniform-3d-optimized.cpp -o 2025-04-17-aztec-uniform-3d.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=32MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

# Compile the 3D three-periodic visualization
echo "Compiling 3D three-periodic visualization..."
emcc 2025-04-18-aztec-three-periodic-3d.cpp -o 2025-04-18-aztec-three-periodic-3d.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_simulateAztec','_freeString','_getProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

# Compile T-embeddings with A parameter JSON generator
echo "Compiling T-embeddings with A parameter JSON generator..."
emcc 2025-03-27-t-emb-a-json.cpp -o 2025-03-27-t-emb-a-json.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_doTembJSONwithA','_freeString','_getProgress','_resetProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

# Compile T-embeddings 3D JSON generator
echo "Compiling T-embeddings 3D JSON generator..."
emcc 2025-03-28-t-emb-3d-json.cpp -o 2025-03-28-t-emb-3d-json.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_doTembJSONwithA','_freeString','_getProgress','_resetProgress']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

echo "Moving JavaScript files to js directory..."
# Create js directory if it doesn't exist
mkdir -p ../../js/

# Move compiled JavaScript files to the js directory
mv *.js ../../js/

echo "Compilation complete!"
