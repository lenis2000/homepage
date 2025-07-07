#!/bin/bash

# Build script for RSK WASM module
# Requires emscripten (emcc) to be installed

echo "Building RSK WASM module..."

emcc 2025-07-07-rsk-algorithm.cpp -o 2025-07-07-rsk-algorithm.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_performRSK','_performInverseRSK','_freeString','_getTableauShape','_getTableauEntry','_getPermutationEntry']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=512MB \
 -s MAXIMUM_MEMORY=2GB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

if [ $? -eq 0 ]; then
    echo "Build successful! Moving to js directory..."
    mv 2025-07-07-rsk-algorithm.js ../../js/
    echo "Done!"
else
    echo "Build failed!"
    exit 1
fi