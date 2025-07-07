#!/bin/bash

# Build hook-walk tableau WASM module
echo "Building hook-walk tableau WASM module..."

emcc 2025-07-07-hookwalk-tableau.cpp -o 2025-07-07-hookwalk-tableau.js \
 -s WASM=1 \
 -s ASYNCIFY=1 \
 -s "EXPORTED_FUNCTIONS=['_sampleHookWalk','_getTableauShape','_getTableauEntry','_freeString']" \
 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString"]' \
 -s ALLOW_MEMORY_GROWTH=1 \
 -s INITIAL_MEMORY=64MB \
 -s ENVIRONMENT=web \
 -s SINGLE_FILE=1 \
 -O3 -ffast-math

# Move to js directory
mv 2025-07-07-hookwalk-tableau.js ../../js/

echo "Hook-walk tableau WASM module built successfully!"