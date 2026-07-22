import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findBrowser() {
  const candidates = [
    process.env.CHROMIUM_BIN,
    process.env.CHROME_BIN,
    process.env.AGENT_BROWSER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("No Chromium/Chrome executable found for domino WASM smoke test.");
}

function checkPageSource() {
  const source = fs.readFileSync(path.join(root, "s", "domino.md"), "utf8");
  const cppSource = fs.readFileSync(path.join(root, "s", "domino.cpp"), "utf8");
  const wasmBundle = fs.readFileSync(path.join(root, "s", "domino.js"), "utf8");

  assert(
    !/<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@/i.test(source),
    "Three.js should not be loaded by a default-path script tag"
  );
  assert(source.includes('id="no-3d-checkbox" checked'), "No 3D should be checked by default");
  assert(source.includes('<button id="view-2d-btn" class="active"'), "2D view should be active by default");
  assert(source.includes('<canvas id="aztec-canvas-2d"'), "2D view should include the canvas renderer");
  const orderInput = source.match(/<input id="n-input"[^>]*>/)?.[0] || "";
  assert(orderInput && !/\smax=/.test(orderInput), "2D sampler input should not impose an application-level maximum n");
  assert(!source.includes("max2DN"), "2D sampler should leave size limits to the browser");
  assert(source.includes('document.getElementById("n-input").removeAttribute("max")'), "2D view should remove the 3D-only maximum");
  assert(source.includes('const DOMINO_2D_EXACT_RENDER_LIMIT = 100'), "Small 2D tilings should use exact canvas rendering");
  assert(source.includes("class CanvasSegmentBatch"), "Large canvas overlays should use bounded native path batches");
  assert(source.includes("getDoubleDimerCompactLoops"), "Double-dimer previews should use the compact cycle decomposition");
  assert(source.includes("new Uint8Array(siteCount)"), "Double-dimer previews should use compact typed grids");
  assert(!source.includes("DOUBLE_DIMER_SEGMENT_BUDGET"), "Double-dimer previews must not cap or thin loop edges");
  assert(!source.includes("buildDoubleDimerLoops"), "Double-dimer rendering and export should not rebuild the legacy object graph");
  assert(cppSource.includes("PeriodicProbabilityPyramid"), "C++ sampler should reuse periodic shuffling probabilities");
  assert(cppSource.includes("MatrixConfig = FlatMatrix<uint8_t>"), "C++ sampler should use byte-sized configuration cells");
  assert(cppSource.includes("kDelslideBlockTransform"), "C++ sampler should fuse deletion and sliding by 2x2 block");
  assert(cppSource.includes("class JsonBuffer"), "C++ sampler should serialize directly into its returned buffer");
  assert(cppSource.includes("PackedDecisionPyramid"), "C++ sampler should retain the exact finite fallback for periods larger than n");
  assert(!cppSource.includes("dim > 1000"), "C++ sampler should not keep the old n=500 hard cap");
  assert(!wasmBundle.includes("Input size too large, would exceed memory limits"), "Compiled WASM bundle should not contain the old n=500 hard cap");
  assert(!source.includes("periodicity-select"), "Share links should not reference the removed periodicity select");
  assert(!source.includes("weight-a"), "Share links should not reference removed 2x2 weight IDs");
  assert(source.includes("setPeriodicityFromUrl"), "URL load should restore radio-based periodicity");
  assert(source.includes("w6x2"), "URL state should preserve 6x2 weights");

  const updateStart = source.indexOf("async function updateVisualization(");
  const updateEnd = source.indexOf("function snapshotBenchmarkControls()", updateStart);
  assert(updateStart >= 0 && updateEnd > updateStart, "updateVisualization body should be present");
  const updateBody = source.slice(updateStart, updateEnd);
  const sampleIndex = updateBody.indexOf("sampleDominoesFromWasm");
  assert(sampleIndex >= 0, "updateVisualization should call the WASM sampler");
  assert(
    !updateBody.slice(0, sampleIndex).includes('completeProfile("ok")'),
    "updateVisualization should not report success before refreshing cached dominoes"
  );

  const benchmarkStart = source.indexOf("const DOMINO_DEFAULT_BENCHMARK_CASES = [");
  const benchmarkEnd = source.indexOf("];", benchmarkStart);
  assert(benchmarkStart >= 0 && benchmarkEnd > benchmarkStart, "default benchmark cases should be present");
  const benchmarkCases = source.slice(benchmarkStart, benchmarkEnd);
  assert(!benchmarkCases.includes('view: "3d"'), "default benchmark cases should not include 3D");

  const doubleDimerStart = source.indexOf("drawDoubleDimerOverlay(ctx, settings) {");
  const doubleDimerEnd = source.indexOf("drawHeightLabels(ctx, settings) {", doubleDimerStart);
  assert(doubleDimerStart >= 0 && doubleDimerEnd > doubleDimerStart, "double-dimer canvas renderer should be present");
  const doubleDimerBody = source.slice(doubleDimerStart, doubleDimerEnd);
  assert(doubleDimerBody.includes("getDoubleDimerCompactLoops"), "canvas loops should use compact cycle selection");
  assert(!doubleDimerBody.includes("getDoubleDimerDrawableEdges"), "canvas loops should not materialize the vector-export edge graph");
}

async function wait(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
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

function removeTempDir(directory) {
  fs.rmSync(directory, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100
  });
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => {
      stdout += chunk;
    });
    child.stderr?.on("data", chunk => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(
          `${command} ${args.join(" ")} exited with ${code}\n${stdout}\n${stderr}`.trim()
        ));
      }
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
  const response = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,
    { method: "PUT" }
  );
  if (!response.ok) throw new Error(`Failed to open Chromium tab: ${response.status}`);
  return response.json();
}

function createCdpClient(wsUrl) {
  if (typeof WebSocket !== "function") {
    throw new Error("The domino smoke test requires Node.js 22+ with a global WebSocket implementation.");
  }

  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];
  let closedError = null;

  function rejectPending(error) {
    closedError = error;
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  }

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

  ws.addEventListener("error", () => {
    rejectPending(new Error("Chromium WebSocket error"));
  });
  ws.addEventListener("close", () => {
    rejectPending(new Error("Chromium WebSocket closed"));
  });

  return {
    async send(method, params = {}, timeoutMs = 30000) {
      await opened;
      if (closedError) throw closedError;
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
    getEvents() {
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

async function waitForPageCondition(client, expression, description, timeoutMs = 30000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await evaluate(client, expression, 5000);
      if (value) return value;
    } catch (error) {
      lastError = error;
    }

    const exception = client.getEvents().find(event => event.method === "Runtime.exceptionThrown");
    if (exception) {
      const details = exception.params?.exceptionDetails;
      const message = details?.exception?.description || details?.text || "Runtime exception";
      throw new Error(message);
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ""}`);
}

async function evaluateDominoWasm(client) {
  const expression = String.raw`
    new Promise(resolve => {
      const fail = error => resolve({ error: String(error?.message ?? error) });
      const ready = async () => {
        const samplerArgs = [
          "number", "number", "number", "number", "number",
          "number", "number", "number", "number", "number"
        ];
        const sampler6x2Args = [
          "number", "number", "number", "number", "number", "number", "number",
          "number", "number", "number", "number", "number", "number"
        ];
        const periodicSamplerArgs = [
          "number", "number", "number", "number", "number", "number"
        ];
        const freeString = Module.cwrap("freeString", null, ["number"]);
        const callSampler = async (name, args, argTypes = samplerArgs) => {
          const fn = Module.cwrap(name, "number", argTypes, { async: true });
          const ptr = await fn(...args);
          if (!ptr) throw new Error(name + " returned a null pointer");
          try {
            return JSON.parse(Module.UTF8ToString(ptr));
          } finally {
            freeString(ptr);
          }
        };
        const callNineWeightSampler = (label, n, weights = Array(9).fill(0)) =>
          callSampler(label, [n, ...weights], samplerArgs);
        const call6x2Sampler = (n, weights) =>
          callSampler("simulateAztec6x2", [n, ...weights], sampler6x2Args);
        const checkDominoes = (label, dominoes, n, orientation) => {
          const expected = n * (n + 1);
          if (!Array.isArray(dominoes)) throw new Error(label + " did not return an array");
          if (dominoes.length !== expected) {
            throw new Error(label + " expected " + expected + " dominoes, got " + dominoes.length);
          }
          const cells = new Set();
          for (const d of dominoes) {
            if (!Number.isInteger(d.x) || !Number.isInteger(d.y)) {
              throw new Error(label + " returned non-integer coordinates");
            }
            if (!((d.w === 4 && d.h === 2) || (d.w === 2 && d.h === 4))) {
              throw new Error(label + " returned invalid domino dimensions");
            }
            if (orientation === "horizontal" && !(d.w === 4 && d.h === 2)) {
              throw new Error(label + " returned a non-horizontal domino");
            }
            if (orientation === "vertical" && !(d.w === 2 && d.h === 4)) {
              throw new Error(label + " returned a non-vertical domino");
            }
            for (let dx = 0; dx < d.w; dx += 2) {
              for (let dy = 0; dy < d.h; dy += 2) {
                const cellX = d.x + dx;
                const cellY = d.y + dy;
                if (Math.abs(cellX + 1) + Math.abs(cellY - 1) > 2 * n) {
                  throw new Error(label + " has a cell outside the Aztec diamond");
                }
                const key = String(cellX) + "," + String(cellY);
                if (cells.has(key)) throw new Error(label + " has overlapping cell " + key);
                cells.add(key);
              }
            }
          }
          if (cells.size !== expected * 2) {
            throw new Error(label + " expected " + (expected * 2) + " covered cells, got " + cells.size);
          }
        };

        for (const n of [2, 4, 12, 50]) {
          checkDominoes("frozen horizontal n=" + n, await callNineWeightSampler("simulateAztecHorizontal", n), n, "horizontal");
          checkDominoes("frozen vertical n=" + n, await callNineWeightSampler("simulateAztecVertical", n), n, "vertical");
        }
        for (const n of [2, 4, 12, 50]) {
          checkDominoes("uniform n=" + n, await callNineWeightSampler("simulateAztec", n), n);
        }
        for (const n of [2, 50]) {
          checkDominoes("2x2 n=" + n, await callNineWeightSampler(
            "simulateAztec",
            n,
            [1, 0.5, 1, 1.25, 1, 1.25, 1, 0.5, 1]
          ), n);
          checkDominoes("3x3 n=" + n, await callNineWeightSampler(
            "simulateAztec",
            n,
            [1, 1.2, 0.8, 1.5, 0.9, 1.1, 1.3, 0.7, 1.4]
          ), n);
          checkDominoes("6x2 n=" + n, await call6x2Sampler(
            n,
            [1, 2, 1, 3, 1, 0.5, 1.5, 1, 0.75, 1, 2.5, 2]
          ), n);
        }

        const k = 4;
        const l = 5;
        const count = k * l;
        const bytes = count * Float64Array.BYTES_PER_ELEMENT;
        const alphaPtr = Module._malloc(bytes);
        const betaPtr = Module._malloc(bytes);
        const gammaPtr = Module._malloc(bytes);
        try {
          const periodicWeights = shift => Array.from(
            { length: count },
            (_, i) => 0.25 + ((i + shift) % 11) / 4
          );
          Module.HEAPF64.set(periodicWeights(0), alphaPtr >> 3);
          Module.HEAPF64.set(periodicWeights(3), betaPtr >> 3);
          Module.HEAPF64.set(periodicWeights(7), gammaPtr >> 3);
          for (const n of [2, 50]) {
            checkDominoes(
              "general periodic n=" + n,
              await callSampler(
                "simulateAztecPeriodic",
                [n, k, l, alphaPtr, betaPtr, gammaPtr],
                periodicSamplerArgs
              ),
              n
            );
          }
        } finally {
          Module._free(alphaPtr);
          Module._free(betaPtr);
          Module._free(gammaPtr);
        }
        resolve("ok");
      };
      // checkWasmBundle waits for the exported WASM function itself. Calling
      // ready directly avoids racing a late onRuntimeInitialized assignment.
      ready().catch(fail);
    })
  `;

  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 60000
  }, 70000);
  if (result.result?.exceptionDetails) {
    throw new Error(result.result.exceptionDetails.text || "Browser WASM evaluation failed");
  }
  const remote = result.result?.result;
  if (remote?.subtype === "error") {
    throw new Error(remote.description || remote.value || "Browser WASM evaluation failed");
  }
  const value = remote?.value;
  if (value && typeof value === "object" && "error" in value) {
    throw new Error(String(value.error));
  }
  assert(value === "ok", `Unexpected WASM test result: ${JSON.stringify(value)}`);
}

function contentType(filePath) {
  switch (path.extname(filePath)) {
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "application/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".wasm": return "application/wasm";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    default: return "application/octet-stream";
  }
}

function serveStatic(directory, port) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = path.join(directory, normalized);

    if (!filePath.startsWith(directory)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function checkBuiltDominoPage() {
  const browser = findBrowser();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "domino-page-"));
  const siteDir = path.join(tmp, "site");
  const configPath = path.join(tmp, "local-config.yml");
  const sitePort = 4200 + Math.floor(Math.random() * 1000);
  const chromePort = 10400 + Math.floor(Math.random() * 1000);
  const profileDir = path.join(tmp, "profile");
  let server;
  let client;
  let chrome;

  fs.writeFileSync(
    configPath,
    [
      `url: "http://127.0.0.1:${sitePort}"`,
      `storage_url: "http://127.0.0.1:${sitePort}"`,
      `permanent_url: "http://127.0.0.1:${sitePort}"`,
      ""
    ].join("\n")
  );

  try {
    await runCommand("bundle", [
      "exec",
      "jekyll",
      "build",
      "--destination",
      siteDir,
      "--config",
      `_config.yml,${configPath}`
    ]);

    server = await serveStatic(siteDir, sitePort);
    chrome = spawn(browser, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      `--remote-debugging-port=${chromePort}`,
      `--user-data-dir=${profileDir}`,
      "about:blank"
    ], { stdio: "ignore" });

    await waitForChrome(chromePort);
    const tab = await openTab(chromePort, `http://127.0.0.1:${sitePort}/domino/`);
    client = createCdpClient(tab.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Page.bringToFront");
    await client.send("Runtime.enable");
    await client.send("Log.enable").catch(() => {});

    await waitForPageCondition(
      client,
      `Boolean(window.dominoSamplerLastTiming && window.dominoSamplerLastTiming.status === "ok")`,
      "the initial /domino/ sample to complete",
      45000
    );

    const pageState = await evaluate(client, String.raw`(() => {
      const canvas = document.getElementById("aztec-canvas-2d");
      const ctx = canvas?.getContext("2d");
      let sampledPixels = 0;
      let nonBackgroundPixels = 0;
      if (canvas && ctx && canvas.width > 0 && canvas.height > 0) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const step = Math.max(4, Math.floor(image.length / 5000 / 4) * 4);
        const background = [image[0], image[1], image[2], image[3]];
        for (let i = 0; i < image.length; i += step) {
          sampledPixels++;
          if (
            image[i] !== background[0] ||
            image[i + 1] !== background[1] ||
            image[i + 2] !== background[2] ||
            image[i + 3] !== background[3]
          ) {
            nonBackgroundPixels++;
          }
        }
      }
      return {
        active2D: document.getElementById("view-2d-btn")?.classList.contains("active"),
        no3D: document.getElementById("no-3d-checkbox")?.checked,
        canvasWidth: canvas?.width || 0,
        canvasHeight: canvas?.height || 0,
        sampledPixels,
        nonBackgroundPixels,
        threeLoaded: Boolean(window.THREE),
        lazyThreeScript: Boolean(document.querySelector('script[data-domino-lazy-script="three-core"]')),
        timingStatus: window.dominoSamplerLastTiming?.status || null
      };
    })()`);

    assert(pageState.active2D, "/domino/ should open in the 2D pane");
    assert(pageState.no3D, "No 3D should remain checked on default load");
    assert(pageState.canvasWidth > 0 && pageState.canvasHeight > 0, "2D canvas should have drawable dimensions");
    assert(pageState.nonBackgroundPixels > 0, "2D canvas should not be blank after the initial sample");
    assert(!pageState.threeLoaded && !pageState.lazyThreeScript, "Default 2D load should not initialize Three.js");

    await evaluate(client, `document.getElementById("view-3d-btn").click(); true;`);
    await waitForPageCondition(
      client,
      `document.getElementById("aztec-canvas")?.textContent.includes("3D visualization disabled")`,
      "the disabled 3D message",
      5000
    );
    const disabled3DState = await evaluate(client, `({
      active3D: document.getElementById("view-3d-btn")?.classList.contains("active"),
      no3D: document.getElementById("no-3d-checkbox")?.checked,
      message: document.getElementById("aztec-canvas")?.textContent || "",
      threeLoaded: Boolean(window.THREE),
      lazyThreeScript: Boolean(document.querySelector('script[data-domino-lazy-script="three-core"]'))
    })`);
    assert(disabled3DState.active3D, "3D button should become active when clicked");
    assert(disabled3DState.no3D, "No 3D should remain checked after clicking the 3D pane");
    assert(disabled3DState.message.includes("3D visualization disabled"), "3D disabled message should be visible");
    assert(!disabled3DState.threeLoaded && !disabled3DState.lazyThreeScript, "Disabled 3D path should not load Three.js");

  } finally {
    await shutdownBrowser(client, chrome);
    if (server) await new Promise(resolve => server.close(resolve));
    removeTempDir(tmp);
  }
}

async function checkWasmBundle() {
  const browser = findBrowser();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "domino-wasm-"));
  const htmlPath = path.join(tmp, "index.html");
  const profileDir = path.join(tmp, "profile");
  const port = 9300 + Math.floor(Math.random() * 1000);
  fs.writeFileSync(
    htmlPath,
    `<!doctype html><meta charset="utf-8"><script src="${pathToFileURL(path.join(root, "s", "domino.js")).href}"></script>\n`
  );

  const chrome = spawn(browser, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "about:blank"
  ], { stdio: "ignore" });

  let client;
  try {
    await waitForChrome(port);
    const tab = await openTab(port, `file://${htmlPath}`);
    client = createCdpClient(tab.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Page.bringToFront");
    await client.send("Runtime.enable");
    await waitForPageCondition(
      client,
      `typeof Module !== "undefined" && typeof Module._simulateAztec === "function"`,
      "the standalone domino WASM bundle to load",
      30000
    );
    await evaluateDominoWasm(client);
  } finally {
    await shutdownBrowser(client, chrome);
    removeTempDir(tmp);
  }
}

checkPageSource();
if (process.env.DOMINO_SKIP_PAGE_BUILD !== "1") {
  await checkBuiltDominoPage();
}
await checkWasmBundle();
console.log("domino smoke checks passed");
