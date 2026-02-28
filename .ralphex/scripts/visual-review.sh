#!/bin/bash
# Visual review script for ralphex custom external review.
# Takes screenshots with agent-browser and asks Claude to critique them.
# Receives prompt file path as $1, outputs findings to stdout.

set -euo pipefail

PROMPT_FILE="${1:-}"
PROJECT_DIR="/Users/leo/Homepage"
PORT=8769
SCREENSHOT_DIR="/tmp/ralphex-art-review-$$"

mkdir -p "$SCREENSHOT_DIR"

# Start local server
cd "$PROJECT_DIR"
python3 -m http.server "$PORT" &>/dev/null &
SERVER_PID=$!
sleep 2

# Capture screenshots at key moments using agent-browser
/opt/homebrew/bin/agent-browser <<CMDS
open http://localhost:${PORT}/data-art/triangle.html
set viewport 1920 1080
sleep 3000
screenshot ${SCREENSHOT_DIR}/01-hook.png
click 960 540
sleep 5000
screenshot ${SCREENSHOT_DIR}/02-chaos.png
sleep 10000
screenshot ${SCREENSHOT_DIR}/03-annealing.png
sleep 8000
screenshot ${SCREENSHOT_DIR}/04-frozen.png
sleep 3000
screenshot ${SCREENSHOT_DIR}/05-final-with-ui.png
CMDS

# Kill server
kill "$SERVER_PID" 2>/dev/null || true

# Check if screenshots were captured
SHOT_COUNT=$(ls -1 "${SCREENSHOT_DIR}"/*.png 2>/dev/null | wc -l)

if [ "$SHOT_COUNT" -eq 0 ]; then
    echo "VISUAL REVIEW FAILED: No screenshots captured. Check agent-browser installation."
    echo "<<<RALPHEX:CODEX_REVIEW_DONE>>>"
    exit 0
fi

echo "VISUAL REVIEW: Captured ${SHOT_COUNT} screenshots in ${SCREENSHOT_DIR}/"
echo ""
echo "Screenshots captured at these animation phases:"
for f in "${SCREENSHOT_DIR}"/*.png; do
    echo "  - $(basename "$f")"
done
echo ""
echo "Review each screenshot file visually (they are PNG images)."
echo "Evaluate the art piece against these criteria:"
echo ""
echo "1. FIRST IMPRESSION: Does the hook screen arrest attention? Does it read as art?"
echo "2. CHAOS PHASE: Is the randomness visually energetic without being ugly noise?"
echo "3. EMERGENCE: Is the transition from chaos to order perceivable and satisfying?"
echo "4. FROZEN STATE: Does the Penrose triangle reveal create wonder? Is rendering clean?"
echo "5. UI/TYPOGRAPHY: Are captions legible? Does the entropy slider feel intentional?"
echo "6. COMPOSITION: Visual weight, negative space, figure-ground relationship?"
echo "7. COLOR: Is the palette effective for a gallery display? Too monochrome?"
echo "8. DISPLAY READINESS: Would this run on a wall display for months?"
echo ""
echo "For each issue found, report:"
echo "  - Phase: hook/chaos/annealing/frozen/ui"
echo "  - Issue: specific visual problem"
echo "  - Fix: concrete CSS/JS change"
echo ""
echo "If no issues found, output: NO ISSUES FOUND"

# Cleanup
rm -rf "$SCREENSHOT_DIR"
