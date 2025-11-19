#!/bin/bash
# Pipeline to generate Aztec diamond tiling and draw it
# Usage: ./run_pipeline.sh <n> <alpha> <beta> [output_name]
# Example: ./run_pipeline.sh 200 0.2 0.25 aztec_ab_gamma_n200_a0.2_b0.25

set -e  # Exit on error

# Default parameters
N=${1:-200}
ALPHA=${2:-0.2}
BETA=${3:-0.25}
OUTPUT_BASE=${4:-"aztec_ab_gamma_n${N}_a${ALPHA}_b${BETA}"}

echo "=========================================="
echo "Aztec Diamond Tiling Pipeline"
echo "=========================================="
echo "Parameters:"
echo "  n = $N"
echo "  alpha = $ALPHA"
echo "  beta = $BETA"
echo "  output = $OUTPUT_BASE"
echo ""

# Step 1: Generate tiling with Julia
echo "[1/4] Generating tiling with Julia..."
julia -e "
include(\"simulatorfinal.jl\")

println(\"⏳ Generating gamma-distributed weights...\")
weights = ab_gamma($N, $ALPHA, $BETA)
println(\"✓ Weights generated\")

println(\"⏳ Computing probabilities...\")
probs = probsslim(weights)
println(\"✓ Probabilities computed\")

println(\"⏳ Generating tiling configuration...\")
tiling = aztecgenslim(probs)
println(\"✓ Tiling generated\")

println(\"⏳ Writing to file...\")
writefile2(tiling, \"${OUTPUT_BASE}.txt\")
println(\"✓ File written: ${OUTPUT_BASE}.txt\")
"

if [ ! -f "${OUTPUT_BASE}.txt" ]; then
    echo "Error: Failed to generate ${OUTPUT_BASE}.txt"
    exit 1
fi

# Step 2: Draw tiling
echo "[2/4] Drawing tiling..."
./draw_tiling "${OUTPUT_BASE}.txt" "${OUTPUT_BASE}.ppm"

if [ ! -f "${OUTPUT_BASE}.ppm" ]; then
    echo "Error: Failed to generate ${OUTPUT_BASE}.ppm"
    exit 1
fi

# Step 3: Convert to PNG
echo "[3/4] Converting to PNG..."
magick "${OUTPUT_BASE}.ppm" "${OUTPUT_BASE}.png"

if [ ! -f "${OUTPUT_BASE}.png" ]; then
    echo "Error: Failed to generate ${OUTPUT_BASE}.png"
    exit 1
fi

# Step 4: Remove PPM file
echo "[4/4] Cleaning up..."
rm "${OUTPUT_BASE}.ppm"

echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="
echo "Output files:"
echo "  - ${OUTPUT_BASE}.txt ($(wc -l < "${OUTPUT_BASE}.txt") lines)"
echo "  - ${OUTPUT_BASE}.png ($(ls -lh "${OUTPUT_BASE}.png" | awk '{print $5}'))"
echo ""
