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
  /<input type="checkbox" id="no-3d-checkbox" checked>/.test(source),
  "No 3D checkbox should be checked by default"
);
assert(
  /<button id="view-2d-btn" class="active" title="2D domino view">2D<\/button>/.test(source),
  "2D view button should be active by default"
);
assert(
  /<div id="aztec-canvas" style="display: none;"><\/div>/.test(source),
  "3D pane should be hidden by default"
);
assert(
  /<div id="aztec-2d-canvas" style="display: block;/.test(source),
  "2D pane should be visible by default"
);

[
  "setProgressStatus",
  "sampleDominoesFromWasm",
  "parseDominoWasmResult",
  "render2DIfVisible",
  "render3DFromDominoes",
  "renderVisibleCachedDominoes"
].forEach(name => {
  assert(source.includes(`function ${name}`), `${name} helper should exist`);
});

assert(
  /if \(!ptr\) {\s*throw new Error\("WASM sampler returned a null pointer\."\);\s*}/s.test(source),
  "sampleDominoesFromWasm should guard null WASM pointers before UTF8ToString"
);
assert(
  /if \(result && typeof result === "object" && !Array\.isArray\(result\) && result\.error\) {\s*throw new Error\(result\.error\);\s*}/s.test(source),
  "parseDominoWasmResult should surface C++ error responses"
);
assert(
  /async function updateVisualizationFromCache\(\) {\s*await renderVisibleCachedDominoes\(\);\s*}/s.test(source),
  "Glauber/cache updates should route through the visible-view renderer"
);
assert(
  /if \(getActiveView\(\) === "3d" && isNo3DEnabled\(\)\) {\s*createNo3DMessage\(\);/s.test(source),
  "updateVisualization should short-circuit disabled 3D views"
);
assert(
  /if \(shouldShowLarge3DMessage\(n\)\) {\s*createLargeTilingMessage\(\);/s.test(source),
  "updateVisualization should short-circuit large 3D views"
);
assert(
  !/setTimeout\(\(\) => {\s*updateVisualization\(n\);\s*}, 10\);/s.test(source),
  "3D pane switching should not resample cached domino data"
);
assert(
  /setInterval\(\(\) => {[\s\S]*setProgressStatus\(`Sampling\.\.\. \(\$\{p\}%\)`\);[\s\S]*}, 250\);/.test(source),
  "sampling progress should use throttled status updates"
);

console.log("domino task 3 checks passed");
