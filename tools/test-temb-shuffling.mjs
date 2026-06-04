import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageSourcePath = path.join(root, "_simulations", "domino_tilings", "2025-12-11-t-embedding-arbitrary-weights.md");
const shufflingCppPath = path.join(root, "_simulations", "domino_tilings", "2025-12-11-t-embedding-shuffling.cpp");
const shufflingBundlePath = path.join(root, "js", "2025-12-11-t-embedding-shuffling.js");
const builtSiteDir = path.join(root, "_site");
const pageUrlPath = "/simulations/2025-12-11-t-embedding-arbitrary-weights/";
const require = createRequire(import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseSampleUiMax(source) {
  const match = source.match(/<input[^>]+id="sample-N-input"[^>]+max="(\d+)"/);
  assert(match, "sample-N-input should declare a max value");
  return Number.parseInt(match[1], 10);
}

function checkShufflingSourceAndBundle() {
  const pageSource = fs.readFileSync(pageSourcePath, "utf8");
  const cppSource = fs.readFileSync(shufflingCppPath, "utf8");
  const wasmBundle = fs.readFileSync(shufflingBundlePath);
  const sampleUiMax = parseSampleUiMax(pageSource);
  const maxSupportedMatch = cppSource.match(/kMaxSupportedN\s*=\s*(\d+)/);

  assert(maxSupportedMatch, "C++ sampler should declare kMaxSupportedN");
  const maxSupportedN = Number.parseInt(maxSupportedMatch[1], 10);
  assert(
    maxSupportedN >= sampleUiMax,
    `C++ sampler cap ${maxSupportedN} should not be below sample UI max ${sampleUiMax}`
  );
  assert(
    cppSource.includes("PackedDecisionPyramid"),
    "T-embedding shuffling C++ should use PackedDecisionPyramid"
  );
  assert(
    cppSource.includes("computeDecisionPyramids(weights, decisions1, &decisions2"),
    "double-dimer shuffling should build two independent decision pyramids in one probability pass"
  );
  assert(cppSource.includes("normalizeMatrixIfNeeded"), "C++ sampler should normalize extreme square-move layers");
  assert(cppSource.includes("Degenerate square-move denominator"), "C++ sampler should reject degenerate square-move denominators");
  assert(!cppSource.includes('std::strcpy(out, "[]")'), "C++ error allocation failure should not masquerade as an empty sample");
  assert(!cppSource.includes("d3pslim("), "C++ sampler should not keep the removed full d3pslim probability path");
  assert(!cppSource.includes("probsslim("), "C++ sampler should not keep the removed full probsslim probability path");
  assert(!/if\s*\(\s*n\s*>\s*(\d+)\s*\)\s*n\s*=\s*\1\s*;/.test(cppSource), "C++ sampler should not silently clamp n");

  for (const staleText of [
    "Memory allocation failed",
    "Error computing probability matrices",
    "Error generating domino configuration",
    "Input size too large, would exceed memory limits",
    "Hard limit: N <= 500",
    "probsslim",
    "d3pslim"
  ]) {
    assert(
      !wasmBundle.includes(Buffer.from(staleText)),
      `generated shuffling JS should not contain stale text: ${staleText}`
    );
  }
}

function checkPageSource() {
  const source = fs.readFileSync(pageSourcePath, "utf8");
  assert(source.includes('id="sample-timing-display"'), "sample timing span should be present");
  assert(source.includes("toFixed(2)}s"), "sample timing should display elapsed seconds with two decimals");
  assert(source.includes("createShuffledSamplerProfile"), "sample profile helper should be present");
  assert(source.includes("window.tembShuffledSamplerBenchmark"), "benchmark helper should be exposed on window");
  assert(source.includes("TEMB_SHUFFLED_DEFAULT_BENCHMARK_CASES"), "default benchmark cases should be declared");
  assert(source.includes("{ n: 330, doubleDimer: true"), "default benchmark cases should include N=330 double dimer");
  assert(source.includes("const sampleWeightCache = new Map()"), "sample EKLP weights should be cached by deterministic controls");
  assert(source.includes("createSampleWeightRequest"), "weight cache key should include the current weight request");
  assert(source.includes("geometricP: getNumericControlValue"), "IID cache keys should include distribution-specific controls");
  assert(source.includes("getOrGenerateSampleWeights"), "random sampler should use a named weight generation/cache phase");
  assert(source.includes("shufflingModule.HEAPF64.set(eklpWeights, weightsPtr >> 3)"), "Float64Array weights should be bulk-copied into the WASM heap");
  assert(!source.includes("shufflingModule.setValue(weightsPtr + i * 8, eklpWeights[i], 'double')"), "random sampler should not copy weights with per-element setValue");
  assert(source.includes("decodeAndFreeShufflingResult"), "WASM results should be decoded through the shared free-in-finally helper");
  assert(source.includes("Shuffling WASM returned no result pointer."), "null WASM pointers should produce useful errors");
  assert(source.includes("parseShufflingJsonResponse"), "WASM JSON responses should be parsed through a named helper");
  assert(source.includes("result.error"), "WASM {error: ...} responses should be surfaced to the status text");
  assert(source.includes("readRandomSampleControlPhase"), "generateRandomSample should split out the control-read phase");
  assert(source.includes("runShufflingWithWeights(controls.N, sampleWeights"), "generateRandomSample should run the named shuffling phase");
  assert(source.includes("updateRandomSampleState"), "generateRandomSample should split out sample state updates");
  assert(source.includes("renderVisibleSampleViews"), "generateRandomSample should split out visible view rendering");
  assert(source.includes("isActiveRandomSampleRequest"), "generateRandomSample should ignore stale async sample completions");
  assert(source.includes("isSample3DPaneVisible()"), "sample 3D should only update while visible");
  assert(source.includes("isHeightFunctionPaneVisible()"), "height function pane should only update while visible");
  assert(source.includes("#sample-canvas {\n  image-rendering: crisp-edges;\n  image-rendering: pixelated;"), "sample canvas should use crisp pixelated rendering");
  assert(source.includes("class SampleDomino2DCanvasRenderer"), "sample canvas should use the cached 2D renderer");
  assert(source.includes("requestAnimationFrame(() =>"), "sample 2D renderer should schedule draws with requestAnimationFrame");
  assert(source.includes("OffscreenCanvas"), "sample 2D renderer should use an offscreen or hidden canvas cache");
  assert(source.includes("ctx.imageSmoothingEnabled = false"), "sample 2D cached image draws should disable smoothing");
  assert(source.includes("drawSampleStandardDominoes"), "standard sample dominoes should be batched through a shared draw helper");
  assert(source.includes("buildSampleDoubleDimerLoopData"), "double-dimer loop topology should be precomputed");
  assert(source.includes("getSampleDoubleDimerDrawableEdges"), "double-dimer drawable edges should be cached by min-loop filter");
  assert(source.includes("sample2DRenderer?.renderNow();"), "sample PNG export should flush the current 2D renderer frame");
  assert(!source.includes("function renderDoubleDimerLoops("), "double-dimer loops should not be rebuilt inside the visible draw call");
  assert(source.includes("buildSample3DMergedGeometry"), "sample 3D should build one merged geometry");
  assert(source.includes("new THREE.Mesh(geometry, sample3DMaterial)"), "sample 3D should render through a single shared mesh/material");
  assert(source.includes("vertexColors: true"), "sample 3D material should use vertex colors");
  assert(source.includes("fillSample3DColorAttribute"), "sample 3D palette changes should update color attributes");
  assert(source.includes("stopSample3DAnimation();"), "sample 3D animation should stop when returning to 2D mode");
  assert(source.includes("getCachedDoubleDimerHeightDifference"), "height-function differences should be cached by sampled configurations");
  assert(source.includes("invalidateSampleHeightFunctionCache"), "height-function cache should be invalidated on new samples");
  assert(source.includes("window.tembSample3DDebugState"), "sample 3D debug state should be exposed for smoke tests");
  assert(source.includes("window.tembSampleHeightFunctionDebugState"), "height-function cache debug state should be exposed for smoke tests");
  assert(!source.includes("colorValue"), "sample 3D should not allocate per-domino colored materials");
  assert(!source.includes("[temb] shuffled sampler benchmark summary"), "benchmark helper should not emit noisy console logging");

  for (const key of [
    "controlReadMs",
    "weightGenerationConversionMs",
    "heapCopyMs",
    "wasmShufflingMs",
    "utf8ConversionMs",
    "jsonParseMs",
    "twoDRenderMs",
    "doubleDimerLoopProcessingMs",
    "heightFunctionPaneRenderMs",
    "sample3DRenderMs"
  ]) {
    assert(source.includes(key), `sample profile should include ${key}`);
  }

  assert(source.includes("setSamplePhaseTiming(profile, 'doubleDimerLoopProcessingMs'"), "2D render should still record double-dimer loop processing timing");
  assert(source.includes("shufflingFreeString(resultPtr);"), "WASM result strings should be freed after parsing");
}

function createDeterministicWeights(n, seed) {
  const dim = 2 * n;
  const weights = new Float64Array(dim * dim);
  let state = seed >>> 0;
  if (state === 0) state = 1;

  for (let i = 0; i < weights.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    weights[i] = 0.35 + ((state >>> 0) / 0x100000000) * 2.4;
  }

  return weights;
}

function canonicalDominoConfig(dominoes) {
  return dominoes
    .map(domino => `${domino.x},${domino.y},${domino.w},${domino.h},${domino.color}`)
    .sort()
    .join("|");
}

function decodeWasmJson(module, resultPtr, options = {}) {
  assert(resultPtr, "WASM shuffling export should return a non-null result pointer");
  let json = "";
  try {
    json = module.UTF8ToString(resultPtr);
  } finally {
    module._freeString(resultPtr);
  }

  const result = JSON.parse(json);
  if (!options.allowError) {
    assert(!result?.error, `WASM shuffling returned error JSON: ${result.error}`);
  }
  return result;
}

async function callWeightedSampler(module, fn, n, weights) {
  const expectedLength = (2 * n) * (2 * n);
  assert(weights.length === expectedLength, `expected ${expectedLength} EKLP weights for N=${n}`);

  const weightsPtr = module._malloc(weights.length * Float64Array.BYTES_PER_ELEMENT);
  assert(weightsPtr, "WASM heap allocation for EKLP weights should succeed");
  try {
    module.HEAPF64.set(weights, weightsPtr >> 3);
    const resultPtr = await fn(n, weightsPtr);
    return decodeWasmJson(module, resultPtr);
  } finally {
    module._free(weightsPtr);
  }
}

async function expectWasmError(module, promise, expectedText) {
  const resultPtr = await promise;
  const result = decodeWasmJson(module, resultPtr, { allowError: true });
  assert(result && typeof result.error === "string", "WASM error path should return an error JSON object");
  assert(
    result.error.includes(expectedText),
    `WASM error should mention ${expectedText}, got: ${result.error}`
  );
}

function allocateWeights(module, weights) {
  const ptr = module._malloc(weights.length * Float64Array.BYTES_PER_ELEMENT);
  assert(ptr, "WASM heap allocation for test weights should succeed");
  module.HEAPF64.set(weights, ptr >> 3);
  return ptr;
}

function assertDominoCount(dominoes, n, label) {
  assert(Array.isArray(dominoes), `${label} should return an array of dominoes`);
  assert(dominoes.length === n * (n + 1), `${label} should return ${n * (n + 1)} dominoes for N=${n}, got ${dominoes.length}`);
  for (const domino of dominoes) {
    assert(Number.isFinite(domino.x), `${label} domino x coordinate should be numeric`);
    assert(Number.isFinite(domino.y), `${label} domino y coordinate should be numeric`);
    assert(Number.isFinite(domino.w) && domino.w > 0, `${label} domino width should be positive`);
    assert(Number.isFinite(domino.h) && domino.h > 0, `${label} domino height should be positive`);
    assert(typeof domino.color === "string" && domino.color.length > 0, `${label} domino color should be present`);
  }
}

async function runStandaloneWasmSmoke() {
  assert(fs.existsSync(shufflingBundlePath), "generated shuffling JS bundle should exist");
  const createShufflingModule = require(shufflingBundlePath);
  const module = await createShufflingModule();
  const simulateAztecWithWeightMatrix = module.cwrap("simulateAztecWithWeightMatrix", "number", ["number", "number"], { async: true });
  const simulateAztecDoubleDimer = module.cwrap("simulateAztecDoubleDimer", "number", ["number", "number"], { async: true });
  const simulateAztecGammaDirect = module.cwrap("simulateAztecGammaDirect", "number", ["number", "number", "number"], { async: true });
  const simulateAztecPeriodicDirect = module.cwrap("simulateAztecPeriodicDirect", "number", ["number", "number", "number", "number", "number", "number"], { async: true });

  const singleN = 6;
  const singleWeights = createDeterministicWeights(singleN, 0x5eed1234);
  const singleResult = await callWeightedSampler(module, simulateAztecWithWeightMatrix, singleN, singleWeights);
  assertDominoCount(singleResult, singleN, "simulateAztecWithWeightMatrix");

  const doubleN = 8;
  let sawIndependentConfigurations = false;
  for (const seed of [0xdecafbad, 0x9e3779b9, 0x12345678, 0x87654321]) {
    const doubleWeights = createDeterministicWeights(doubleN, seed);
    const doubleResult = await callWeightedSampler(module, simulateAztecDoubleDimer, doubleN, doubleWeights);
    assertDominoCount(doubleResult.config1, doubleN, "simulateAztecDoubleDimer config1");
    assertDominoCount(doubleResult.config2, doubleN, "simulateAztecDoubleDimer config2");
    if (canonicalDominoConfig(doubleResult.config1) !== canonicalDominoConfig(doubleResult.config2)) {
      sawIndependentConfigurations = true;
      break;
    }
  }

  assert(
    sawIndependentConfigurations,
    "simulateAztecDoubleDimer should not accidentally return identical configurations for generic random weights"
  );

  const invalidNWeights = createDeterministicWeights(1, 0xabcdef01);
  const invalidNPtr = allocateWeights(module, invalidNWeights);
  try {
    await expectWasmError(
      module,
      simulateAztecWithWeightMatrix(0, invalidNPtr),
      "N must be at least 1"
    );
  } finally {
    module._free(invalidNPtr);
  }

  await expectWasmError(
    module,
    simulateAztecWithWeightMatrix(2, 0),
    "Weight pointer is null"
  );

  const nonFiniteWeights = createDeterministicWeights(2, 0xf00d1234);
  nonFiniteWeights[3] = Number.POSITIVE_INFINITY;
  const nonFinitePtr = allocateWeights(module, nonFiniteWeights);
  try {
    await expectWasmError(
      module,
      simulateAztecDoubleDimer(2, nonFinitePtr),
      "non-finite"
    );
  } finally {
    module._free(nonFinitePtr);
  }

  await expectWasmError(
    module,
    simulateAztecGammaDirect(4, 0, 1),
    "positive finite"
  );

  const periodicAlpha = new Float64Array([1, 1, 1, 1]);
  const periodicBeta = new Float64Array([1, 1, 1, 1]);
  const periodicGamma = new Float64Array([1, 1, -1, 1]);
  const alphaPtr = allocateWeights(module, periodicAlpha);
  const betaPtr = allocateWeights(module, periodicBeta);
  const gammaPtr = allocateWeights(module, periodicGamma);
  try {
    await expectWasmError(
      module,
      simulateAztecPeriodicDirect(4, 2, 2, alphaPtr, betaPtr, gammaPtr),
      "Periodic weights must be positive"
    );
  } finally {
    module._free(alphaPtr);
    module._free(betaPtr);
    module._free(gammaPtr);
  }
}

function findBrowser() {
  const candidates = [
    process.env.CHROMIUM_BIN,
    process.env.CHROME_BIN,
    process.env.AGENT_BROWSER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("No Chromium/Chrome executable found for T-embedding smoke test.");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mimeType(filePath) {
  if (filePath.endsWith(".html")) return "text/html";
  if (filePath.endsWith(".js")) return "application/javascript";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function startStaticServer(directory) {
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
      const filePath = path.join(directory, normalized);
      if (!filePath.startsWith(directory)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "Content-Type": mimeType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500);
      response.end(String(error.message || error));
    }
  });

  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function waitForChrome(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  for (let i = 0; i < 80; i++) {
    try {
      return await fetchJson(endpoint);
    } catch {
      await wait(100);
    }
  }
  throw new Error("Timed out waiting for Chromium remote debugging endpoint.");
}

async function openTab(port, url) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT"
  });
  if (!response.ok) throw new Error(`Failed to open Chromium tab: ${response.status}`);
  return response.json();
}

function createCdpClient(wsUrl) {
  if (typeof WebSocket !== "function") {
    throw new Error("Node.js 22+ with global WebSocket is required for this smoke test.");
  }

  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];

  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      clearTimeout(timer);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message || "CDP command failed"} (${message.error.code})`));
      else resolve(message);
    } else if (message.method) {
      events.push(message);
    }
  });

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("Chromium WebSocket failed before opening")), { once: true });
    ws.addEventListener("close", () => reject(new Error("Chromium WebSocket closed before opening")), { once: true });
  });

  return {
    async send(method, params = {}, timeoutMs = 30000) {
      await opened;
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Timed out waiting for CDP command ${method}`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
      });
    },
    close() {
      ws.close();
    },
    events() {
      return events.slice();
    }
  };
}

async function evaluate(client, expression, timeoutMs = 30000) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: timeoutMs
  }, timeoutMs + 5000);

  if (result.result?.exceptionDetails) {
    throw new Error(result.result.exceptionDetails.text || "Browser evaluation failed");
  }
  const remote = result.result?.result;
  if (remote?.subtype === "error") {
    throw new Error(remote.description || remote.value || "Browser evaluation failed");
  }
  return remote?.value;
}

async function waitForPageCondition(client, expression, description, timeoutMs = 45000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await evaluate(client, expression, 5000);
      if (value) return value;
    } catch (error) {
      lastError = error;
    }

    const exception = client.events().find(event => event.method === "Runtime.exceptionThrown");
    if (exception) {
      const details = exception.params?.exceptionDetails;
      const message = details?.exception?.description || details?.text || "Runtime exception";
      throw new Error(message);
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ""}`);
}

async function waitForChildExit(child, timeoutMs = 5000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      child.off("exit", done);
      child.off("close", done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    child.once("exit", done);
    child.once("close", done);
  });
}

async function shutdownBrowser(client, chrome) {
  await client?.send("Browser.close").catch(() => {});
  client?.close();
  if (!chrome || chrome.exitCode !== null || chrome.signalCode !== null) return;
  chrome.kill("SIGTERM");
  await waitForChildExit(chrome);
  if (chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill("SIGKILL");
    await waitForChildExit(chrome, 2000);
  }
}

async function runBrowserSmoke() {
  assert(fs.existsSync(path.join(builtSiteDir, "index.html")), "_site is missing; run bundle exec jekyll build before this smoke test");

  const browser = findBrowser();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "temb-smoke-"));
  const chromePort = 9300 + Math.floor(Math.random() * 1000);
  const { server, port: sitePort } = await startStaticServer(builtSiteDir);
  let chrome = null;
  let client = null;

  try {
    chrome = spawn(browser, [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--enable-unsafe-swiftshader",
      "--use-angle=swiftshader",
      "--no-sandbox",
      `--remote-debugging-port=${chromePort}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank"
    ], { stdio: ["ignore", "pipe", "pipe"] });

    await waitForChrome(chromePort);
    const tab = await openTab(chromePort, `http://127.0.0.1:${sitePort}${pageUrlPath}`);
    client = createCdpClient(tab.webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");

    await waitForPageCondition(
      client,
      `document.readyState === "complete" && typeof window.tembShuffledSamplerBenchmark === "function"`,
      "T-embedding page script initialization"
    );

    const initialState = await waitForPageCondition(
      client,
      `(() => {
        const profile = window.tembLastShuffledSamplerProfile;
        const timing = document.getElementById("sample-timing-display")?.textContent || "";
        const computeTime = document.getElementById("compute-time")?.textContent || "";
        return profile && profile.status === "ok" && profile.dominoCount > 0 && /^\\([0-9]+\\.[0-9]{2}s\\)$/.test(timing) && /^[0-9]+\\.[0-9]{2}s$/.test(computeTime)
          ? { profile, timing, computeTime }
          : false;
      })()`,
      "initial T-embedding computation and random sample"
    );

    const pixelState = await evaluate(client, `(() => {
      const sampleCanvas = document.getElementById("sample-canvas");
      const mainCanvas = document.getElementById("main-temb-2d-canvas");
      const inspect = canvas => {
        if (!canvas || canvas.width === 0 || canvas.height === 0) return { width: 0, height: 0, nonBackground: 0 };
        const ctx = canvas.getContext("2d");
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let nonBackground = 0;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a !== 0 && !(r >= 245 && g >= 245 && b >= 245)) nonBackground++;
        }
        return { width: canvas.width, height: canvas.height, nonBackground };
      };
      return {
        sample: inspect(sampleCanvas),
        main: inspect(mainCanvas)
      };
    })()`);

    assert(pixelState.sample.width > 0 && pixelState.sample.height > 0, "sample canvas should have dimensions");
    assert(pixelState.sample.nonBackground > 0, "sample canvas should be non-blank");
    assert(pixelState.main.width > 0 && pixelState.main.height > 0, "main T-embedding canvas should have dimensions");
    assert(pixelState.main.nonBackground > 0, "main T-embedding canvas should be non-blank");
    assert(initialState.profile.timings.controlReadMs !== null, "profile should include control-read timing");
    assert(initialState.profile.timings.twoDRenderMs !== null, "profile should include 2D render timing");

    const cacheBenchmark = await evaluate(client, `window.tembShuffledSamplerBenchmark({
      cases: [
        { n: 12, doubleDimer: false, label: "cache miss smoke" },
        { n: 12, doubleDimer: false, label: "cache hit smoke" }
      ],
      stopOnError: true,
      restore: true
    })`, 120000);
    assert(cacheBenchmark.cases.length === 2, "cache smoke benchmark should return two cases");
    assert(cacheBenchmark.cases.every(c => c.status === "ok"), "cache smoke benchmark cases should pass");
    assert(cacheBenchmark.cases[1].weightCacheHit === true, "second identical sample should reuse cached EKLP weights");
    assert(cacheBenchmark.cases.every(c => c.timings.heapCopyMs !== null), "cache smoke benchmark should record heap copy timing");
    assert(cacheBenchmark.cases.every(c => c.timings.utf8ConversionMs !== null), "cache smoke benchmark should record UTF8 conversion timing");

    const cacheInvalidationSmoke = await evaluate(client, `(async () => {
      const runCase = async (n, label) => {
        const benchmark = await window.tembShuffledSamplerBenchmark({
          cases: [{ n, doubleDimer: false, label }],
          stopOnError: true,
          restore: false
        });
        const result = benchmark.cases[0];
        return {
          status: result.status,
          key: window.tembLastShuffledSamplerProfile?.weightCacheKey || "",
          hit: !!result.weightCacheHit
        };
      };

      const presetSelect = document.getElementById("weight-preset-select");
      const seed = document.getElementById("random-seed");
      const min = document.getElementById("iid-min");
      const periodicK = document.getElementById("periodic-k");
      const periodicL = document.getElementById("periodic-l");

      presetSelect.value = "random-iid";
      presetSelect.dispatchEvent(new Event("change", { bubbles: true }));
      seed.value = "70101";
      min.value = "0.37";
      const iidFirst = await runCase(12, "iid first");
      const iidRepeat = await runCase(12, "iid repeat");
      seed.value = "70102";
      const seedChange = await runCase(12, "iid seed change");
      min.value = "0.43";
      const paramChange = await runCase(12, "iid param change");
      const nChange = await runCase(13, "iid n change");

      presetSelect.value = "periodic";
      presetSelect.dispatchEvent(new Event("change", { bubbles: true }));
      periodicK.value = "2";
      periodicL.value = "2";
      periodicK.dispatchEvent(new Event("change", { bubbles: true }));
      periodicL.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise(resolve => requestAnimationFrame(resolve));
      const periodicGamma = document.querySelector('#weights-tables input[data-type="2"]');
      if (periodicGamma) periodicGamma.value = "1.25";
      const periodicFirst = await runCase(12, "periodic first");
      if (periodicGamma) periodicGamma.value = "1.75";
      const periodicChange = await runCase(12, "periodic gamma change");

      return { iidFirst, iidRepeat, seedChange, paramChange, nChange, periodicFirst, periodicChange };
    })()`, 240000);
    assert(cacheInvalidationSmoke.iidFirst.status === "ok", "IID cache invalidation first sample should pass");
    assert(cacheInvalidationSmoke.iidRepeat.hit, "repeated IID controls should hit the cache");
    assert(!cacheInvalidationSmoke.seedChange.hit, "changing IID seed should miss the cache");
    assert(cacheInvalidationSmoke.seedChange.key !== cacheInvalidationSmoke.iidFirst.key, "changing IID seed should change the cache key");
    assert(!cacheInvalidationSmoke.paramChange.hit, "changing IID distribution params should miss the cache");
    assert(cacheInvalidationSmoke.paramChange.key !== cacheInvalidationSmoke.seedChange.key, "changing IID distribution params should change the cache key");
    assert(!cacheInvalidationSmoke.nChange.hit, "changing sample N should miss the cache");
    assert(cacheInvalidationSmoke.nChange.key !== cacheInvalidationSmoke.paramChange.key, "changing sample N should change the cache key");
    assert(cacheInvalidationSmoke.periodicFirst.status === "ok" && cacheInvalidationSmoke.periodicChange.status === "ok", "periodic cache invalidation samples should pass");
    assert(!cacheInvalidationSmoke.periodicChange.hit, "changing periodic editor weights should miss the cache");
    assert(cacheInvalidationSmoke.periodicChange.key !== cacheInvalidationSmoke.periodicFirst.key, "changing periodic editor weights should change the cache key");

    const rendererSmoke = await evaluate(client, `(() => {
      const sampleCanvas = document.getElementById("sample-canvas");
      const renderer = window.tembSample2DRenderer;
      return {
        imageRendering: getComputedStyle(sampleCanvas).imageRendering,
        hasRenderer: !!renderer,
        hasRenderNow: typeof renderer?.renderNow === "function",
        hasZoomBy: typeof renderer?.zoomBy === "function",
        canvasWidth: sampleCanvas?.width || 0,
        canvasHeight: sampleCanvas?.height || 0
      };
    })()`);
    assert(rendererSmoke.hasRenderer, "sample canvas should expose the cached 2D renderer");
    assert(rendererSmoke.hasRenderNow && rendererSmoke.hasZoomBy, "sample renderer should expose render and zoom controls");
    assert(rendererSmoke.canvasWidth > 0 && rendererSmoke.canvasHeight > 0, "sample renderer should size the canvas");
    assert(/pixelated|crisp-edges/.test(rendererSmoke.imageRendering), "sample canvas should use pixelated image rendering");

    const largeRendererSmoke = await evaluate(client, `window.tembShuffledSamplerBenchmark({
      cases: [
        { n: 330, doubleDimer: false, label: "N=330 single 2D cache smoke" },
        { n: 330, doubleDimer: true, label: "N=330 double-dimer 2D cache smoke" }
      ],
      stopOnError: true,
      restore: false
    }).then(async benchmark => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const renderer = window.tembSample2DRenderer;
      const before = {
        cacheValid: !!renderer?.cacheValid,
        cacheVersion: renderer?.cacheVersion,
        cacheKey: renderer?.cacheKey,
        doubleDimer: !!renderer?.doubleDimer,
        dominoes: renderer?.dominoes?.length || 0,
        dominoes2: renderer?.dominoes2?.length || 0,
        cacheWidth: renderer?.cache?.canvas?.width || 0,
        cacheHeight: renderer?.cache?.canvas?.height || 0
      };
      renderer.zoomBy(1.2);
      renderer.zoomBy(1 / 1.2);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const after = {
        cacheValid: !!renderer?.cacheValid,
        cacheVersion: renderer?.cacheVersion,
        cacheKey: renderer?.cacheKey,
        framePending: !!renderer?.framePending
      };
      return { benchmark, before, after };
    })`, 240000);
    assert(largeRendererSmoke.benchmark.cases.length === 2, "N=330 cache smoke should return both cases");
    assert(largeRendererSmoke.benchmark.cases.every(c => c.status === "ok"), "N=330 single and double-dimer cache smokes should pass");
    assert(largeRendererSmoke.benchmark.cases[0].dominoCount > 0, "N=330 single smoke should produce dominoes");
    assert(largeRendererSmoke.benchmark.cases[1].dominoCount > 0 && largeRendererSmoke.benchmark.cases[1].dominoCount2 > 0, "N=330 double-dimer smoke should produce both configurations");
    assert(largeRendererSmoke.benchmark.cases[1].timings.doubleDimerLoopProcessingMs !== null, "N=330 double-dimer smoke should time loop preprocessing");
    assert(largeRendererSmoke.before.doubleDimer, "large renderer smoke should leave the renderer in double-dimer mode");
    assert(largeRendererSmoke.before.dominoes > 0 && largeRendererSmoke.before.dominoes2 > 0, "large renderer should hold both double-dimer configurations");
    assert(largeRendererSmoke.before.cacheValid && largeRendererSmoke.before.cacheWidth > 0 && largeRendererSmoke.before.cacheHeight > 0, "large renderer should have a cached bitmap");
    assert(largeRendererSmoke.after.cacheValid, "large renderer cache should remain valid after zoom redraws");
    assert(largeRendererSmoke.after.cacheVersion === largeRendererSmoke.before.cacheVersion, "zoom redraws should not invalidate the large-sample cache");
    assert(largeRendererSmoke.after.cacheKey === largeRendererSmoke.before.cacheKey, "zoom redraws should reuse the same large-sample cache key");

    const sampleControlsSmoke = await evaluate(client, `(() => {
      const renderer = window.tembSample2DRenderer;
      const minLoopInput = document.getElementById("sample-min-loop-length");
      const paletteSelect = document.getElementById("sample-palette-select");
      const grayscale = document.getElementById("sample-grayscale-checkbox");
      const before = {
        cacheKey: renderer?.cacheKey || "",
        cacheVersion: renderer?.cacheVersion || 0,
        cacheValid: !!renderer?.cacheValid
      };

      if (minLoopInput) {
        minLoopInput.value = "20";
        minLoopInput.dispatchEvent(new Event("input", { bubbles: true }));
        renderer?.renderNow();
      }
      const afterMinLoop = {
        cacheKey: renderer?.cacheKey || "",
        cacheVersion: renderer?.cacheVersion || 0,
        cacheValid: !!renderer?.cacheValid,
        minLoopValue: minLoopInput?.value || ""
      };

      const paletteCount = paletteSelect?.options?.length || 0;
      const paletteBefore = paletteSelect?.value || "";
      if (paletteCount > 1) {
        const nextIndex = ((paletteSelect.selectedIndex || 0) + 1) % paletteCount;
        paletteSelect.value = paletteSelect.options[nextIndex].value;
        paletteSelect.dispatchEvent(new Event("change", { bubbles: true }));
        renderer?.renderNow();
      }
      const afterPalette = {
        cacheKey: renderer?.cacheKey || "",
        cacheVersion: renderer?.cacheVersion || 0,
        cacheValid: !!renderer?.cacheValid,
        paletteBefore,
        paletteAfter: paletteSelect?.value || "",
        paletteCount
      };

      const grayscaleBefore = !!grayscale?.checked;
      if (grayscale) {
        grayscale.checked = !grayscale.checked;
        grayscale.dispatchEvent(new Event("change", { bubbles: true }));
        renderer?.renderNow();
      }
      const afterGrayscale = {
        cacheKey: renderer?.cacheKey || "",
        cacheVersion: renderer?.cacheVersion || 0,
        cacheValid: !!renderer?.cacheValid,
        grayscaleBefore,
        grayscaleAfter: !!grayscale?.checked
      };

      let download = null;
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        download = {
          fileName: this.download,
          hrefPrefix: String(this.href).slice(0, 22),
          hrefLength: String(this.href).length
        };
      };
      try {
        document.getElementById("sample-export-png-btn")?.click();
      } finally {
        HTMLAnchorElement.prototype.click = originalClick;
      }

      return { before, afterMinLoop, afterPalette, afterGrayscale, download };
    })()`);
    assert(sampleControlsSmoke.before.cacheValid, "sample controls smoke should start from a valid cached large render");
    assert(sampleControlsSmoke.afterMinLoop.cacheValid, "min-loop filtering change should render successfully");
    assert(sampleControlsSmoke.afterMinLoop.minLoopValue === "20", "min-loop input should accept the tested filter value");
    assert(sampleControlsSmoke.afterMinLoop.cacheVersion > sampleControlsSmoke.before.cacheVersion, "min-loop filtering should invalidate only the drawable/cache layer");
    assert(sampleControlsSmoke.afterMinLoop.cacheKey.includes("|20|"), "min-loop filtering should be reflected in the renderer cache key");
    assert(sampleControlsSmoke.afterPalette.cacheValid, "palette change should render successfully");
    if (sampleControlsSmoke.afterPalette.paletteCount > 1) {
      assert(sampleControlsSmoke.afterPalette.paletteAfter !== sampleControlsSmoke.afterPalette.paletteBefore, "palette smoke should exercise a different palette");
      assert(sampleControlsSmoke.afterPalette.cacheKey !== sampleControlsSmoke.afterMinLoop.cacheKey, "palette change should refresh the renderer cache key");
    }
    assert(sampleControlsSmoke.afterGrayscale.cacheValid, "grayscale change should render successfully");
    assert(sampleControlsSmoke.afterGrayscale.grayscaleAfter !== sampleControlsSmoke.afterGrayscale.grayscaleBefore, "grayscale smoke should toggle the control");
    assert(sampleControlsSmoke.afterGrayscale.cacheKey !== sampleControlsSmoke.afterPalette.cacheKey, "grayscale change should refresh the renderer cache key");
    assert(sampleControlsSmoke.download?.fileName === "domino-sample-N330.png", "sample PNG export should use the active sample size in the filename");
    assert(sampleControlsSmoke.download?.hrefPrefix === "data:image/png;base64,", "sample PNG export should produce a PNG data URL");
    assert(sampleControlsSmoke.download?.hrefLength > 1000, "sample PNG export data URL should not be empty");

    const heightCacheSmoke = await evaluate(client, `window.tembSampleHeightFunctionDebugState()`);
    assert(heightCacheSmoke.hasDoubleDimerSample, "height cache smoke should run after a double-dimer sample");
    assert(heightCacheSmoke.diffSize > 0, "height cache smoke should compute non-empty height differences");
    assert(heightCacheSmoke.sameReference, "height cache should return the same cached Map for unchanged double-dimer configurations");
    assert(heightCacheSmoke.cacheMatchesSamples, "height cache should be keyed to the active sampled configurations");

    const heightPaneSmoke = await evaluate(client, `window.tembShuffledSamplerBenchmark({
      cases: [
        { n: 40, doubleDimer: true, label: "height pane smoke" }
      ],
      stopOnError: true,
      restore: false
    }).then(async benchmark => {
      const waitFrames = count => new Promise(resolve => {
        const step = () => {
          if (count-- <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      const button = document.getElementById("height-function-btn");
      const container = document.getElementById("height-function-container");
      const closeButton = document.getElementById("height-function-close-btn");
      if (button && button.style.display !== "none") button.click();
      await waitFrames(20);
      const canvas = container?.querySelector("canvas");
      const debug = window.tembSampleHeightFunctionDebugState();
      const visible = container?.style.display !== "none";
      const canvasState = {
        width: canvas?.width || 0,
        height: canvas?.height || 0
      };
      closeButton?.click();
      await waitFrames(3);
      return {
        benchmark,
        visible,
        canvasState,
        debug,
        closed: container?.style.display === "none"
      };
    })`, 180000);
    assert(heightPaneSmoke.benchmark.cases.length === 1 && heightPaneSmoke.benchmark.cases[0].status === "ok", "height pane smoke sample should pass");
    assert(heightPaneSmoke.visible, "height-function pane should become visible in double-dimer mode");
    assert(heightPaneSmoke.canvasState.width > 0 && heightPaneSmoke.canvasState.height > 0, "height-function pane should create a 3D canvas");
    assert(heightPaneSmoke.debug.sameReference && heightPaneSmoke.debug.diffSize > 0, "height-function pane should use cached height differences");
    assert(heightPaneSmoke.closed, "height-function pane close control should hide the pane");

    const sample3DSmoke = await evaluate(client, `window.tembShuffledSamplerBenchmark({
      cases: [
        { n: 80, doubleDimer: false, label: "N=80 sample 3D smoke" }
      ],
      stopOnError: true,
      restore: false
    }).then(async benchmark => {
      const waitFrames = count => new Promise(resolve => {
        const step = () => {
          if (count-- <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      const errors = [];
      const errorHandler = event => errors.push(event.message || event.error?.message || "unknown error");
      window.addEventListener("error", errorHandler);
      const toggle = document.getElementById("sample-toggle-3d-btn");
      const toggleTextBefore = toggle?.textContent?.trim() || "";
      if (toggle?.textContent?.trim() === "3D") toggle.click();
      const toggleTextAfterClick = toggle?.textContent?.trim() || "";
      for (let i = 0; i < 80; i++) {
        await waitFrames(1);
        const state = window.tembSample3DDebugState();
        if (state.initialized && state.hasMergedMesh && state.vertexCount > 0) break;
      }
      const before = window.tembSample3DDebugState();
      const grayscale = document.getElementById("sample-grayscale-checkbox");
      if (grayscale) {
        grayscale.checked = !grayscale.checked;
        grayscale.dispatchEvent(new Event("change", { bubbles: true }));
      }
      await waitFrames(3);
      const afterPalette = window.tembSample3DDebugState();
      if (toggle?.textContent?.trim() === "2D") toggle.click();
      await waitFrames(3);
      const after2D = window.tembSample3DDebugState();
      window.removeEventListener("error", errorHandler);
      return {
        benchmark,
        before,
        afterPalette,
        after2D,
        diagnostics: {
          toggleTextBefore,
          toggleTextAfterClick,
          finalToggleText: toggle?.textContent?.trim() || "",
          directSetterType: typeof setSampleViewMode,
          threeType: typeof THREE,
          errors
        }
      };
    })`, 240000);
    assert(sample3DSmoke.benchmark.cases.length === 1 && sample3DSmoke.benchmark.cases[0].status === "ok", "sample 3D smoke benchmark should pass");
    assert(sample3DSmoke.before.initialized && sample3DSmoke.before.visible, `sample 3D should initialize only after toggling into 3D mode: ${JSON.stringify(sample3DSmoke.before)} diagnostics=${JSON.stringify(sample3DSmoke.diagnostics)}`);
    assert(sample3DSmoke.before.hasMergedMesh, `sample 3D should create a merged mesh: ${JSON.stringify(sample3DSmoke.before)}`);
    assert(sample3DSmoke.before.childCount === 1, `sample 3D group should contain one merged mesh: ${JSON.stringify(sample3DSmoke.before)}`);
    assert(sample3DSmoke.before.vertexCount > sample3DSmoke.before.renderedDominoCount, "sample 3D geometry should contain batched vertices");
    assert(sample3DSmoke.before.colorCount === sample3DSmoke.before.vertexCount, "sample 3D geometry should have one color per vertex");
    assert(sample3DSmoke.before.materialUsesVertexColors, "sample 3D material should use vertex colors");
    assert(sample3DSmoke.afterPalette.childCount === 1, "sample 3D palette changes should keep one shared mesh");
    assert(sample3DSmoke.afterPalette.vertexCount === sample3DSmoke.before.vertexCount, "sample 3D palette changes should reuse geometry vertices");
    assert(sample3DSmoke.afterPalette.grayscale !== sample3DSmoke.before.grayscale, "sample 3D grayscale toggle should update color state");
    assert(!sample3DSmoke.after2D.visible, "sample 3D should be hidden after switching back to 2D");
    assert(!sample3DSmoke.after2D.animating, "sample 3D animation should stop in 2D mode");
    assert(sample3DSmoke.diagnostics.errors.length === 0, `sample 3D smoke should not report browser errors: ${sample3DSmoke.diagnostics.errors.join("; ")}`);

    const main3DSmoke = await evaluate(client, `(() => {
      const btn = document.getElementById("toggle-2d-3d-btn");
      const container3D = document.getElementById("main-3d-container");
      if (container3D?.style.display === "none" || !container3D?.style.display) btn?.click();
      const canvas = document.getElementById("main-temb-3d-canvas");
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) {
        return { width: canvas?.width || 0, height: canvas?.height || 0, nonBackground: 0 };
      }
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBackground = 0;
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a !== 0 && !(r >= 245 && g >= 245 && b >= 245)) nonBackground++;
      }
      if (container3D?.style.display !== "none") btn?.click();
      return { width: canvas.width, height: canvas.height, nonBackground };
    })()`);
    assert(main3DSmoke.width > 0 && main3DSmoke.height > 0, "main T-embedding 3D canvas should have dimensions after sample 3D smoke");
    assert(main3DSmoke.nonBackground > 0, "main T-embedding 3D view should remain non-blank after sample 3D smoke");

    const collateralSmoke = await evaluate(client, `(async () => {
      const waitFrames = count => new Promise(resolve => {
        const step = () => {
          if (count-- <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      const inspectCanvas = canvas => {
        if (!canvas || canvas.width === 0 || canvas.height === 0) return { width: 0, height: 0, nonBackground: 0 };
        const ctx = canvas.getContext("2d");
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let nonBackground = 0;
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a !== 0 && !(r >= 245 && g >= 245 && b >= 245)) nonBackground++;
        }
        return { width: canvas.width, height: canvas.height, nonBackground };
      };

      const errors = [];
      const errorHandler = event => errors.push(event.message || event.error?.message || "unknown error");
      window.addEventListener("error", errorHandler);

      const nInput = document.getElementById("n-input");
      if (nInput && nInput.value !== "6") nInput.value = "6";
      document.getElementById("compute-btn")?.click();
      for (let i = 0; i < 120; i++) {
        await waitFrames(1);
        if (/^[0-9]+\\.[0-9]{2}s$/.test(document.getElementById("compute-time")?.textContent || "")) break;
      }

      const mainCanvas = document.getElementById("main-temb-2d-canvas");
      const mainBeforeOrigami = inspectCanvas(mainCanvas);
      const origami = document.getElementById("show-origami-chk");
      const origamiBefore = !!origami?.checked;
      if (origami) {
        origami.checked = !origamiBefore;
        origami.dispatchEvent(new Event("change", { bubbles: true }));
      }
      await waitFrames(3);
      const mainAfterOrigami = inspectCanvas(mainCanvas);
      if (origami) {
        origami.checked = origamiBefore;
        origami.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const stepwise = document.getElementById("stepwise-section");
      if (stepwise) stepwise.open = true;
      if (typeof renderStepwiseTemb === "function") renderStepwiseTemb();
      await waitFrames(3);
      const stepwiseCanvas = inspectCanvas(document.getElementById("stepwise-temb-canvas"));

      const mathematica = document.getElementById("mathematica-section");
      if (mathematica) mathematica.open = true;
      document.getElementById("recompute-face-weights-btn")?.click();
      document.getElementById("recompute-mathematica-btn")?.click();
      await waitFrames(3);
      const faceText = document.getElementById("face-weights-output")?.textContent || "";
      const mathematicaText = document.getElementById("mathematica-output")?.textContent || "";
      const verificationText = document.getElementById("verify-levels")?.textContent || "";
      window.removeEventListener("error", errorHandler);

      return {
        computeTime: document.getElementById("compute-time")?.textContent || "",
        mainBeforeOrigami,
        mainAfterOrigami,
        stepwiseCanvas,
        faceText,
        mathematicaText,
        verificationText,
        errors
      };
    })()`, 240000);
    assert(/^[0-9]+\.[0-9]{2}s$/.test(collateralSmoke.computeTime), "compute button should recompute a small T-embedding");
    assert(collateralSmoke.mainBeforeOrigami.nonBackground > 0, "main 2D T-embedding should remain non-blank");
    assert(collateralSmoke.mainAfterOrigami.nonBackground > 0, "origami overlay toggle should keep the main 2D view non-blank");
    assert(collateralSmoke.stepwiseCanvas.width > 0 && collateralSmoke.stepwiseCanvas.height > 0, "stepwise canvas should have dimensions for small n");
    assert(collateralSmoke.stepwiseCanvas.nonBackground > 0, "stepwise section should render for small n");
    assert(!/will appear|No T-embedding computed yet/i.test(collateralSmoke.faceText), "face-weight verification output should be populated");
    assert(!/will appear|No T-embedding computed yet/i.test(collateralSmoke.mathematicaText), "Mathematica coordinate output should be populated");
    assert(!/will appear/i.test(collateralSmoke.verificationText), "Mathematica verification section should be populated");
    assert(collateralSmoke.errors.length === 0, `collateral T-embedding smoke should not report browser errors: ${collateralSmoke.errors.join("; ")}`);

    if (process.env.TEMB_SHUFFLED_BENCHMARK === "1") {
      const benchmark = await evaluate(client, `window.tembShuffledSamplerBenchmark({ stopOnError: false, restore: true })`, 900000);
      console.log("TEMB_SHUFFLED_BENCHMARK_JSON=" + JSON.stringify(benchmark));
    }
  } finally {
    await shutdownBrowser(client, chrome);
    server.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

checkShufflingSourceAndBundle();
checkPageSource();
await runStandaloneWasmSmoke();
await runBrowserSmoke();
console.log("T-embedding shuffling smoke test passed.");
