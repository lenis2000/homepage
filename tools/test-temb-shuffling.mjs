import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageSourcePath = path.join(root, "_simulations", "domino_tilings", "2025-12-11-t-embedding-arbitrary-weights.md");
const builtSiteDir = path.join(root, "_site");
const pageUrlPath = "/simulations/2025-12-11-t-embedding-arbitrary-weights/";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  assert(source.includes("getSampleWeightParameterSnapshot"), "weight cache key should include preset-specific controls");
  assert(source.includes("getOrGenerateSampleWeights"), "random sampler should use a named weight generation/cache phase");
  assert(source.includes("shufflingModule.HEAPF64.set(eklpWeights, weightsPtr >> 3)"), "Float64Array weights should be bulk-copied into the WASM heap");
  assert(!source.includes("shufflingModule.setValue(weightsPtr + i * 8, eklpWeights[i], 'double')"), "random sampler should not copy weights with per-element setValue");
  assert(source.includes("decodeAndFreeShufflingResult"), "WASM results should be decoded through the shared free-in-finally helper");
  assert(source.includes("Shuffling WASM returned no result pointer."), "null WASM pointers should produce useful errors");
  assert(source.includes("parseShufflingJsonResponse"), "WASM JSON responses should be parsed through a named helper");
  assert(source.includes("result.error"), "WASM {error: ...} responses should be surfaced to the status text");
  assert(source.includes("readRandomSampleControlPhase"), "generateRandomSample should split out the control-read phase");
  assert(source.includes("runRandomSampleShuffling"), "generateRandomSample should split out the shuffling phase");
  assert(source.includes("updateRandomSampleState"), "generateRandomSample should split out sample state updates");
  assert(source.includes("renderVisibleSampleViews"), "generateRandomSample should split out visible view rendering");
  assert(source.includes("isSample3DPaneVisible()"), "sample 3D should only update while visible");
  assert(source.includes("isHeightFunctionPaneVisible()"), "height function pane should only update while visible");

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

  assert(source.includes("renderDoubleDimerLoops(sampleCtx"), "2D render should route double-dimer timing through renderDoubleDimerLoops");
  assert(source.includes("shufflingFreeString(resultPtr);"), "WASM result strings should be freed after parsing");
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

checkPageSource();
await runBrowserSmoke();
console.log("T-embedding shuffling instrumentation smoke test passed.");
