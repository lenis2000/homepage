#!/bin/bash

# Build the WebAssembly module following codebase conventions
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
echo "WebAssembly module built and moved to js/ directory!"