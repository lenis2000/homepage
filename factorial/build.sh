#!/usr/bin/env bash
# Compile the factorial-Schur Glauber WASM bundle.
# Output: ../js/factorial-wasm.js (single-file, base64-embedded WASM).
set -euo pipefail
cd "$(dirname "$0")"

emcc factorial-glauber.cpp -o factorial-wasm.js \
  -s WASM=1 \
  -s "EXPORTED_FUNCTIONS=['_fs_init','_fs_set_x','_fs_set_w','_fs_set_y','_fs_sweep','_fs_get_state_json','_fs_get_stats_json','_fs_flip_at','_fs_get_ratios_json','_fs_free','_malloc','_free']" \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","HEAPF64"]' \
  -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=32MB -s ENVIRONMENT=web -s SINGLE_FILE=1 \
  -O3 -ffast-math

mv factorial-wasm.js ../js/factorial-wasm.js
echo "Built ../js/factorial-wasm.js"
