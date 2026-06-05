#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

emcc factorial-ybe-sampler.cpp -o ../js/factorial-ybe-wasm.js \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=createFactorialYBEModule \
  -s ENVIRONMENT=web,worker \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s SINGLE_FILE=1 \
  -s DISABLE_EXCEPTION_CATCHING=0 \
  -s "EXPORTED_FUNCTIONS=['_sampleFactorialYBE','_freeString','_malloc','_free']" \
  -s "EXPORTED_RUNTIME_METHODS=['UTF8ToString','HEAPF64']" \
  -O3 \
  -fexceptions

echo "Built ../js/factorial-ybe-wasm.js"
