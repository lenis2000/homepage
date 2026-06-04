import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("s/domino.md");
const source = fs.readFileSync(sourcePath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sectionBetween(startText, endText) {
  const start = source.indexOf(startText);
  assert(start >= 0, `Missing start marker: ${startText}`);
  const end = source.indexOf(endText, start);
  assert(end >= 0, `Missing end marker after: ${startText}`);
  return source.slice(start, end);
}

assert(
  !/<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@/i.test(source),
  "Three.js should not be loaded by static script tags on the default page path"
);
assert(
  source.includes('id="no-3d-checkbox" checked'),
  "No 3D checkbox should be checked in the initial markup"
);
assert(
  source.includes('<button id="view-2d-btn" class="active"'),
  "2D view button should be active in the initial markup"
);
assert(
  source.includes('<div id="aztec-canvas" style="display: none;"></div>'),
  "3D pane should be hidden in the initial markup"
);
assert(
  source.includes('<div id="aztec-2d-canvas" style="display: block;'),
  "2D pane should be visible in the initial markup"
);

const benchmarkCases = sectionBetween(
  "const DOMINO_DEFAULT_BENCHMARK_CASES = [",
  "];"
);
assert(
  !benchmarkCases.includes('view: "3d"'),
  "Default benchmark cases should not include 3D"
);
assert(
  (benchmarkCases.match(/view: "2d"/g) || []).length === 4,
  "Default benchmark should keep the four 2D cases"
);
assert(
  (benchmarkCases.match(/no3D: true/g) || []).length === 4,
  "Default benchmark cases should keep No 3D enabled"
);

assert(
  source.includes("async function ensureThreeJSReady()"),
  "3D readiness should be async so lazy script loading can be gated"
);
assert(
  source.includes("await ensureThreeJSLibrary();"),
  "3D readiness should load Three.js only on demand"
);
assert(
  source.includes("if (!(await ensureThreeJSReady()))"),
  "3D rendering should await the gated readiness check"
);

const threeDClickHandler = sectionBetween(
  'document.getElementById("view-3d-btn").addEventListener("click", async function()',
  "  // Global variable to track last rendered order value"
);
const disabledMessageIndex = threeDClickHandler.indexOf("createNo3DMessage();");
const ensureReadyIndex = threeDClickHandler.indexOf("await ensureThreeJSReady();");
const renderCachedIndex = threeDClickHandler.indexOf("await renderVisibleCachedDominoes();");
assert(
  disabledMessageIndex >= 0,
  "3D click handler should show the disabled message when No 3D is checked"
);
assert(
  ensureReadyIndex > disabledMessageIndex,
  "3D click handler should not load Three.js before the No 3D disabled branch"
);
assert(
  renderCachedIndex > disabledMessageIndex,
  "3D click handler should not render cached 3D before the No 3D disabled branch"
);

assert(
  source.includes("animationActive = false;"),
  "Initial runtime setup should leave the 3D animation inactive"
);
assert(
  source.includes("if (options.leaveNo3D !== false && !snapshot.no3DUserChanged)"),
  "Benchmark cleanup should keep default No 3D without overriding an explicit user change"
);

console.log("domino default 3D path smoke checks passed");
