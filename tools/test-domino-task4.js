const fs = require("fs");
const path = require("path");

const dominoPath = path.join(__dirname, "..", "s", "domino.md");
const source = fs.readFileSync(dominoPath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  /<canvas id="aztec-canvas-2d"[^>]*><\/canvas>\s*<svg id="aztec-svg-2d"/s.test(source),
  "2D pane should contain a canvas before the preserved SVG"
);
assert(
  /#aztec-canvas-2d\s*{[\s\S]*touch-action:\s*none;[\s\S]*cursor:\s*grab;/s.test(source),
  "2D canvas should be styled for direct pan/zoom interaction"
);
assert(
  /#aztec-svg-2d\s*{[\s\S]*display:\s*none;/s.test(source),
  "preserved SVG should stay hidden from the interactive path"
);

[
  "class Domino2DCanvasRenderer",
  "createCanvasSurface",
  "computeDominoBounds",
  "get2DDisplaySettings",
  "sync2DSVGForExport"
].forEach(name => {
  assert(source.includes(name), `${name} should exist`);
});

assert(
  /this\.viewport\s*=\s*{\s*scale:\s*1,\s*translateX:\s*0,\s*translateY:\s*0\s*}/s.test(source),
  "renderer should keep persistent viewport state"
);
assert(
  /this\.dpr\s*=\s*Math\.max\(1,\s*Math\.min\(window\.devicePixelRatio\s*\|\|\s*1,\s*3\)\)/.test(source),
  "renderer should scale the visible canvas by device pixel ratio"
);
assert(
  /new ResizeObserver\(\(\)\s*=>\s*this\.resize\(\)\)/.test(source),
  "renderer should respond to container resize"
);
assert(
  /requestAnimationFrame\(\(\)\s*=>\s*{[\s\S]*this\.drawFrame\(\);[\s\S]*}\);/s.test(source),
  "renderer should schedule display draws through requestAnimationFrame"
);
assert(
  /if \(typeof OffscreenCanvas !== "undefined"\) {\s*return new OffscreenCanvas/s.test(source),
  "renderer should prefer OffscreenCanvas when available"
);

const drawFrameMatch = source.match(/drawFrame\(\) \{([\s\S]*?)\n    \}\n\n    toBlob/);
assert(drawFrameMatch, "drawFrame method should be present");
assert(drawFrameMatch[1].includes("ctx.drawImage("), "drawFrame should draw the cached bitmap");
assert(
  !/for \(const d of this\.dominoes\)/.test(drawFrameMatch[1]),
  "drawFrame should not loop over dominoes during pan/zoom redraws"
);

assert(
  /drawDominoFillBatches\(ctx, settings\)[\s\S]*const batches = new Map\(\);[\s\S]*new Path2D\(\)/s.test(source),
  "initial cache drawing should batch domino fills by style"
);
assert(
  /drawBorderStrokePass\(ctx, settings\)[\s\S]*const path = new Path2D\(\);[\s\S]*ctx\.stroke\(path\);/s.test(source),
  "border drawing should use one batched stroke pass"
);
assert(
  /showCheckerboard:[\s\S]*&& n <= DOMINO_2D_OVERLAY_LIMIT/.test(source) &&
  /showPaths:[\s\S]*&& n <= DOMINO_2D_OVERLAY_LIMIT/.test(source) &&
  /showDimers:[\s\S]*&& n <= DOMINO_2D_OVERLAY_LIMIT/.test(source) &&
  /showHeightLabels:[\s\S]*&& n <= 30/.test(source),
  "large 2D overlays should be automatically limited"
);
assert(
  /updateDominoDisplay = function\(\) \{[\s\S]*invalidate2DCanvasCache\(\);[\s\S]*domino2DRenderer\.scheduleDraw\(\);[\s\S]*\};/s.test(source),
  "display option changes should invalidate the canvas cache and schedule a redraw"
);
assert(
  !/updateDominoDisplay = function\(\) \{[\s\S]*sync2DSVGForExport\(cachedDominoes\);[\s\S]*\};/s.test(source),
  "display option changes should not rebuild the hidden SVG DOM"
);
assert(
  /document\.getElementById\("download-png-btn"\)\.addEventListener\("click", function\(\) \{[\s\S]*domino2DRenderer\.toBlob\(function\(blob\)/s.test(source),
  "PNG export should use the canvas renderer"
);
assert(
  !/XMLSerializer\(\)\.serializeToString\(svgClone\)/.test(source),
  "PNG export should not serialize the hidden SVG"
);
assert(
  /document\.getElementById\("view-2d-btn"\)\.addEventListener\("click", async function\(\) \{[\s\S]*await render2D\(cachedDominoes\);/s.test(source),
  "switching back to 2D should render cached dominoes without resampling"
);

console.log("domino task 4 checks passed");
