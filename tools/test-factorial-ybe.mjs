import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findBrowser() {
  const candidates = [
    process.env.CHROMIUM_BIN,
    process.env.CHROME_BIN,
    process.env.AGENT_BROWSER_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function checkSource() {
  const page = fs.readFileSync(path.join(root, "factorial", "index.html"), "utf8");
  const sampler = fs.readFileSync(path.join(root, "js", "factorial-ybe-sampler.js"), "utf8");
  const worker = fs.readFileSync(path.join(root, "js", "factorial-ybe-worker.js"), "utf8");
  const wasmBundle = fs.readFileSync(path.join(root, "js", "factorial-ybe-wasm.js"), "utf8");

  assert(page.includes("/js/factorial-ybe-sampler.js"), "/factorial/ should load the YBE sampler");
  assert(sampler.includes("new Worker('/js/factorial-ybe-worker.js"), "visible sampler should start the YBE worker");
  assert(worker.includes("importScripts('factorial-ybe-wasm.js')"), "worker should load the generated WASM bundle");
  assert(!page.includes("factorial-glauber.js"), "/factorial/ should not load stale Glauber JS");
  assert(!page.includes("factorial-wasm.js"), "/factorial/ should not load stale Glauber WASM");
  assert(!fs.existsSync(path.join(root, "js", "factorial-glauber.js")), "stale factorial-glauber.js should be removed once unused");
  assert(!fs.existsSync(path.join(root, "js", "factorial-wasm.js")), "stale factorial-wasm.js should be removed once unused");
  assert(!sampler.includes("Math.random() * total"), "hot local sampler should use the swappable RNG source");
  assert(!sampler.includes(".innerHTML"), "sampler should not write untrusted status text with innerHTML");
  assert(!sampler.includes("dim > 1000"), "sampler should not keep old hard-coded small caps");
  assert(!wasmBundle.includes("Input size too large, would exceed memory limits"), "WASM bundle should not contain an old generated small-cap error");
  assert(worker.includes("validateSampleMessage"), "worker should validate message shapes before calling WASM");
  assert(worker.includes("expected x length"), "worker should reject x/N length mismatches");
  assert(worker.includes("expected y length at least"), "worker should reject short y buffers");
  assert(worker.includes("_sampleFactorialYBE"), "worker should call the exported C++ sampler");
  assert(worker.includes("utf8ToString(jsonPtr)"), "worker should null-check before decoding the JSON pointer");
  assert(worker.includes("finally"), "worker should free WASM/C++ allocations in finally");
  assert(wasmBundle.includes("createFactorialYBEModule"), "WASM bundle should define the modularized factory");
  assert(wasmBundle.includes("_sampleFactorialYBE"), "WASM bundle should export _sampleFactorialYBE");
  assert(wasmBundle.includes("_freeString"), "WASM bundle should export _freeString");
  assert(!wasmBundle.includes("_getProgress"), "WASM bundle should not export unused progress plumbing");
  assert(wasmBundle.includes("_malloc"), "WASM bundle should export _malloc");
  assert(wasmBundle.includes("_free"), "WASM bundle should export _free");
}

function mimeType(filePath) {
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".html")) return "text/html";
  return "application/octet-stream";
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

function createStaticServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    let decoded = decodeURIComponent(url.pathname);
    if (decoded.endsWith("/")) decoded += "index.html";
    const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(root, normalized);
    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, body) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "content-type": mimeType(filePath) });
      response.end(body);
    });
  });

  return new Promise(resolve => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function waitForChrome(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
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
  assert(typeof WebSocket === "function", "Node.js global WebSocket is required for browser smoke tests");
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const handlers = new Map();
  let closedError = null;

  function rejectPending(error) {
    closedError = error;
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  }

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("Chromium WebSocket failed before opening")), { once: true });
    ws.addEventListener("close", () => reject(new Error("Chromium WebSocket closed before opening")), { once: true });
  });

  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) {
      if (message.method && handlers.has(message.method)) {
        for (const handler of handlers.get(message.method)) handler(message.params || {});
      }
      return;
    }
    const { resolve, reject, timer } = pending.get(message.id);
    clearTimeout(timer);
    pending.delete(message.id);
    if (message.error) reject(new Error(`${message.error.message || "CDP command failed"} (${message.error.code})`));
    else resolve(message);
  });
  ws.addEventListener("error", () => rejectPending(new Error("Chromium WebSocket error")));
  ws.addEventListener("close", () => rejectPending(new Error("Chromium WebSocket closed")));

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
    on(method, handler) {
      if (!handlers.has(method)) handlers.set(method, new Set());
      handlers.get(method).add(handler);
      return () => handlers.get(method)?.delete(handler);
    },
    close() {
      ws.close();
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

async function waitForPageCondition(client, expression, description, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate(client, expression, 2000).catch(() => false);
    if (value) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function captureSmokeScreenshot(client, label) {
  const response = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  }, 30000);
  const data = response.result?.data;
  assert(typeof data === "string" && data.length > 0, "CDP screenshot response should contain PNG data");
  const filePath = path.join(os.tmpdir(), `factorial-ybe-${label}-${Date.now()}.png`);
  fs.writeFileSync(filePath, Buffer.from(data, "base64"));
  assert(fs.statSync(filePath).size > 1000, "factorial smoke screenshot should not be empty");
  return filePath;
}

async function runBrowserSmoke() {
  const browser = findBrowser();
  if (!browser) {
    if (process.env.FACTORIAL_YBE_SKIP_BROWSER === "1") {
      console.log("Skipping factorial browser smoke: FACTORIAL_YBE_SKIP_BROWSER=1 and no Chromium/Chrome executable found.");
      return;
    }
    throw new Error("Chromium/Chrome executable is required for factorial browser smoke; set FACTORIAL_YBE_SKIP_BROWSER=1 to run source-only checks.");
  }

  const server = await createStaticServer();
  const sitePort = server.address().port;
  const debugPort = 9300 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "factorial-ybe-chrome-"));
  const chrome = spawn(browser, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: "ignore" });

  let client;
  const consoleErrors = [];
  try {
    await waitForChrome(debugPort);
    const tab = await openTab(debugPort, "about:blank");
    client = createCdpClient(tab.webSocketDebuggerUrl);
    client.on("Runtime.consoleAPICalled", (params) => {
      if (params.type !== "error") return;
      const text = (params.args || []).map(arg => arg.value || arg.description || "").join(" ");
      consoleErrors.push(`console.error: ${text}`.trim());
    });
    client.on("Runtime.exceptionThrown", (params) => {
      const details = params.exceptionDetails || {};
      consoleErrors.push(`exception: ${details.text || details.exception?.description || "unknown runtime exception"}`);
    });
    client.on("Log.entryAdded", (params) => {
      if (params.entry?.level === "error") consoleErrors.push(`log.error: ${params.entry.text || "unknown log error"}`);
    });
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable").catch(() => {});
    await client.send("Page.navigate", { url: `http://127.0.0.1:${sitePort}/factorial/` });
    await waitForPageCondition(
      client,
      "typeof window.factorialYBEReferenceSample === 'function' && typeof window.factorialYBEWorkerSample === 'function' && typeof window.factorialYBEBenchmark === 'function' && typeof window.factorialYBEApplyPreset === 'function'",
      "factorial sampler hooks"
    );

    await evaluate(client, `(() => {
      window.__factorialSmokeCheckShape = function(sample) {
        function assertBrowser(condition, message) {
          if (!condition) throw new Error(message);
        }
        function checkPartition(row, label) {
          for (let i = 0; i < row.length; i++) {
            assertBrowser(Number.isInteger(row[i]) && row[i] >= 0, label + " has a negative or non-integer part");
            if (i > 0) assertBrowser(row[i - 1] >= row[i], label + " is not weakly decreasing");
          }
        }
        const N = sample.N;
        const M = sample.M;
        const mu = sample.mu;
        const lam = sample.lam;
        assertBrowser(mu.length === M + 1, "mu should have M+1 rows");
        assertBrowser(lam.length === N + 1, "lam should have N+1 rows");
        mu.forEach((row, j) => {
          assertBrowser(row.length === N, "mu[" + j + "] should have length N");
          checkPartition(row, "mu[" + j + "]");
        });
        lam.forEach((row, j) => {
          assertBrowser(row.length === j, "lam[" + j + "] should have length j");
          checkPartition(row, "lam[" + j + "]");
        });
        for (let j = 0; j < N; j++) {
          const lower = lam[j];
          const upper = lam[j + 1];
          for (let i = 0; i < j; i++) {
            assertBrowser(upper[i] >= lower[i], "lambda rows fail upper interlacing at row " + j);
            assertBrowser(lower[i] >= upper[i + 1], "lambda rows fail lower interlacing at row " + j);
          }
        }
        assertBrowser(JSON.stringify(lam[N]) === JSON.stringify(mu[M]), "lam[N] should equal mu[M]");
        assertBrowser(sample.stats.rowSwaps === N * M, "row swap count should be N*M");
        assertBrowser(sample.stats.localMoves >= sample.stats.rowSwaps, "local moves should cover row swaps");
        return true;
      };
      window.__factorialSmokeDirectWorker = function(params) {
        return new Promise((resolve, reject) => {
          const requestId = Math.floor(Math.random() * 0x7fffffff);
          const worker = new Worker('/js/factorial-ybe-worker.js?v=20260605-wasm');
          const x = new Float64Array(params.x);
          const w = new Float64Array(params.w);
          const y = new Float64Array(params.y);
          const timer = setTimeout(() => {
            worker.terminate();
            reject(new Error("direct worker smoke timed out"));
          }, params.timeoutMs || 30000);
          worker.onmessage = (event) => {
            clearTimeout(timer);
            worker.terminate();
            resolve(event.data);
          };
          worker.onerror = (event) => {
            clearTimeout(timer);
            worker.terminate();
            reject(new Error(event.message || "direct worker smoke failed"));
          };
          worker.postMessage({
            type: 'sample',
            requestId,
            N: params.N,
            M: params.M,
            xBuffer: x.buffer,
            wBuffer: w.buffer,
            yBuffer: y.buffer,
            columnCap: params.columnCap,
            seedLo: params.seedLo || 1,
            seedHi: params.seedHi || 0
          }, [x.buffer, w.buffer, y.buffer]);
        });
      };
      return true;
    })()`);

    const result = await evaluate(client, `(() => {
      function assertBrowser(condition, message) {
        if (!condition) throw new Error(message);
      }
      function normalize(sample) {
        const copy = JSON.parse(JSON.stringify(sample));
        copy.stats.elapsedMs = 0;
        return copy;
      }
      function checkPartition(row, label) {
        for (let i = 0; i < row.length; i++) {
          assertBrowser(Number.isInteger(row[i]) && row[i] >= 0, label + " has a negative or non-integer part");
          if (i > 0) assertBrowser(row[i - 1] >= row[i], label + " is not weakly decreasing");
        }
      }
      function checkShape(sample) {
        assertBrowser(sample.mu.length === sample.M + 1, "mu should have M+1 rows");
        assertBrowser(sample.lam.length === sample.N + 1, "lam should have N+1 rows");
        sample.mu.forEach((row, j) => {
          assertBrowser(row.length === sample.N, "mu[" + j + "] should have length N");
          checkPartition(row, "mu[" + j + "]");
        });
        sample.lam.forEach((row, j) => {
          assertBrowser(row.length === j, "lam[" + j + "] should have length j");
          checkPartition(row, "lam[" + j + "]");
        });
        assertBrowser(JSON.stringify(sample.lam[sample.N]) === JSON.stringify(sample.mu[sample.M]), "lam[N] should equal mu[M]");
        assertBrowser(sample.stats.rowSwaps === sample.N * sample.M, "row swap count should be N*M");
        assertBrowser(sample.stats.localMoves >= sample.stats.rowSwaps, "local moves should cover row swaps");
      }

      const options = {
        N: 3,
        M: 3,
        x: [0.2, 0.3, 0.4],
        w: [0.9, 1.0, 1.1],
        y: Array(200).fill(0),
        seedLo: 12345,
        seedHi: 67890,
        columnCap: 200
      };
      const a = window.factorialYBEReferenceSample(options);
      const b = window.factorialYBEReferenceSample(options);
      checkShape(a);
      checkShape(b);
      window.__factorialSmokeCheckShape(a);
      window.__factorialSmokeCheckShape(b);
      assertBrowser(JSON.stringify(normalize(a)) === JSON.stringify(normalize(b)), "seeded reference output should be deterministic");
      return { lambda: a.lambda, rowSwaps: a.stats.rowSwaps, localMoves: a.stats.localMoves };
    })()`);

    assert(result && result.rowSwaps === 9, "browser smoke should return deterministic reference stats");
    console.log(`Factorial seeded reference smoke passed: lambda=(${result.lambda.join(",")}), moves=${result.localMoves}.`);

    const presetResult = await evaluate(client, `(() => {
      function assertBrowser(condition, message) {
        if (!condition) throw new Error(message);
      }
      const ok = window.factorialYBEApplyPreset("old-fan-epsilon-safe");
      const state = window.factorialExactSamplerState();
      const wMin = Math.min(...state.wArr);
      const xMax = Math.max(...state.xArr);
      const note = document.getElementById("fs-preset-note").textContent;
      const validation = document.getElementById("fs-validation-note").textContent;
      const detail = document.getElementById("fs-validation-detail").textContent;
      assertBrowser(ok, "old fan preset should validate");
      return {
        N: document.getElementById("fs-N").value,
        M: document.getElementById("fs-M").value,
        q: document.getElementById("fs-q").value,
        x: document.getElementById("fs-x").value,
        w: document.getElementById("fs-w").value,
        y: document.getElementById("fs-y").value,
        cap: document.getElementById("fs-max-cols").value,
        scale: document.getElementById("fs-scale").value,
        square: document.getElementById("fs-square-cells").checked,
        pathStyle: document.getElementById("fs-path-style").value,
        selected: document.getElementById("fs-preset-select").value,
        note,
        validation,
        detail,
        wMin,
        xMax
      };
    })()`, 30000);

    assert(presetResult.N === "12" && presetResult.M === "50", "old fan preset should set N=12 and M=50");
    assert(presetResult.q === "0.2", "old fan preset should set q=0.2");
    assert(presetResult.x === "1^12", "old fan preset should use x=1^12");
    assert(presetResult.w === "1.001*q^(-50+i)", "old fan preset should nudge w by epsilon");
    assert(presetResult.y === "q^(i-50)", "old fan preset should use the old fan y expression");
    assert(Number(presetResult.cap) >= 20000, "old fan preset should set a useful column cap");
    assert(presetResult.scale === "13" && presetResult.square === false, "old fan preset should set view controls for the fan");
    assert(presetResult.pathStyle === "tonal", "old fan preset should keep tonal paths as default");
    assert(presetResult.selected === "old-fan-epsilon-safe", "old fan preset should remain selected after applying");
    assert(presetResult.note.includes("fan shape") && presetResult.note.includes("strictly larger"), "old fan preset note should explain the expected visual behavior and epsilon fix");
    assert(presetResult.validation.includes("strict inequalities") && presetResult.detail.includes("Closest gap"), "preset validation should summarize strict inequalities");
    assert(presetResult.wMin > presetResult.xMax, "old fan preset should satisfy strict w>x");

    const defaultSampleResult = await evaluate(client, `(async () => {
      const okPreset = window.factorialYBEApplyPreset("default-balanced");
      const ok = await window.factorialYBEWorkerSample({ seedLo: 24680, seedHi: 13579 });
      const state = window.factorialExactSamplerState();
      const sample = { N: state.N, M: state.M, mu: state.mu, lam: state.lam, stats: state.stats };
      window.__factorialSmokeCheckShape(sample);
      return {
        okPreset,
        ok,
        wasm: !!state.stats.wasm,
        N: state.N,
        M: state.M,
        rowSwaps: state.stats.rowSwaps,
        localMoves: state.stats.localMoves,
        runState: state.runState,
        phaseText: document.getElementById("fs-status-phase").textContent
      };
    })()`, 60000);

    assert(defaultSampleResult.okPreset && defaultSampleResult.ok, "default preset should sample successfully");
    assert(defaultSampleResult.wasm, "default preset should use the worker/WASM path");
    assert(defaultSampleResult.N === 6 && defaultSampleResult.M === 6, "default preset should keep the intended small size");
    assert(defaultSampleResult.rowSwaps === 36, "default preset worker smoke should perform N*M row swaps");
    assert(defaultSampleResult.localMoves >= defaultSampleResult.rowSwaps, "default preset local moves should cover row swaps");
    assert(defaultSampleResult.runState === "done" && defaultSampleResult.phaseText === "done", "default preset sample should finish in done status");

    const oldFanSampleResult = await evaluate(client, `(async () => {
      const okPreset = window.factorialYBEApplyPreset("old-fan-epsilon-safe");
      const ok = await window.factorialYBEWorkerSample({ seedLo: 314159, seedHi: 271828 });
      const state = window.factorialExactSamplerState();
      const sample = { N: state.N, M: state.M, mu: state.mu, lam: state.lam, stats: state.stats };
      window.__factorialSmokeCheckShape(sample);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = document.getElementById("fs-canvas");
      const ctx = canvas?.getContext("2d");
      let changedPixels = 0;
      if (canvas && ctx && canvas.width > 0 && canvas.height > 0) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const base = [image[0], image[1], image[2], image[3]];
        const step = Math.max(4, Math.floor(image.length / 4000 / 4) * 4);
        for (let i = 0; i < image.length; i += step) {
          if (
            Math.abs(image[i] - base[0]) +
            Math.abs(image[i + 1] - base[1]) +
            Math.abs(image[i + 2] - base[2]) +
            Math.abs(image[i + 3] - base[3]) > 18
          ) changedPixels += 1;
        }
      }
      const renderer = window.factorialYBERenderer;
      const canvasSize = renderer.cssSize();
      const layout = renderer.layoutBounds(canvasSize.width);
      const fittedScreenHeight = layout.height * renderer.viewport.scale;
      const geometry = renderer.geometry;
      return {
        okPreset,
        ok,
        wasm: !!state.stats.wasm,
        N: state.N,
        M: state.M,
        rowSwaps: state.stats.rowSwaps,
        localMoves: state.stats.localMoves,
        maxPos: state.stats.maxPos,
        lambda: state.mu[state.M],
        runState: state.runState,
        phaseText: document.getElementById("fs-status-phase").textContent,
        changedPixels,
        fittedScreenHeight,
        canvasHeight: canvasSize.height,
        xStep: layout.xStep,
        pathCount: geometry?.paths?.length || 0,
        lambdaParticleCount: geometry?.lambdaParticles?.length || 0
      };
    })()`, 120000);

    assert(oldFanSampleResult.okPreset && oldFanSampleResult.ok, "old fan preset should sample successfully");
    assert(oldFanSampleResult.wasm, "old fan preset should use the worker/WASM path");
    assert(oldFanSampleResult.N === 12 && oldFanSampleResult.M === 50, "old fan sample should keep N=12 and M=50");
    assert(oldFanSampleResult.rowSwaps === 600, "old fan worker smoke should perform N*M row swaps");
    assert(oldFanSampleResult.localMoves >= oldFanSampleResult.rowSwaps, "old fan local moves should cover row swaps");
    assert(oldFanSampleResult.lambda.length === 12, "old fan sample should return a length-12 lambda row");
    assert(oldFanSampleResult.maxPos > 12, "old fan sample should produce a nontrivial fan extent");
    assert(oldFanSampleResult.runState === "done" && oldFanSampleResult.phaseText === "done", "old fan sample should finish in done status");
    assert(oldFanSampleResult.changedPixels > 0, "old fan canvas should be nonblank after sampling");
    assert(oldFanSampleResult.pathCount === 12, "old fan renderer should build one path per x-row");
    assert(oldFanSampleResult.lambdaParticleCount === 12, "old fan renderer should build one highlighted lambda particle per path");
    assert(oldFanSampleResult.xStep < 0.02, "old fan renderer should horizontally compress the long fan support");
    assert(
      oldFanSampleResult.fittedScreenHeight > oldFanSampleResult.canvasHeight * 0.45,
      `old fan renderer should not collapse the fan into a thin band: ${JSON.stringify(oldFanSampleResult)}`
    );
    const screenshotPath = await captureSmokeScreenshot(client, "old-fan");
    console.log(`Factorial screenshot helper wrote ${screenshotPath}.`);

    const parserResult = await evaluate(client, `(() => {
      document.getElementById("fs-N").value = "4";
      document.getElementById("fs-M").value = "5";
      document.getElementById("fs-q").value = "0.2";
      document.getElementById("fs-max-cols").value = "120";
      document.getElementById("fs-x").value = "1^N";
      document.getElementById("fs-w").value = "1.001*q^(-5+i)";
      document.getElementById("fs-y").value = "q^(-50+i)";
      const okExpression = window.factorialYBEValidateControls();
      const expressionState = window.factorialExactSamplerState();
      document.getElementById("fs-x").value = "1";
      const okShort = window.factorialYBEValidateControls();
      const shortMessage = document.getElementById("fs-validation-note").textContent;
      document.getElementById("fs-x").value = "1^N";
      document.getElementById("fs-w").value = "1.001^M";
      document.getElementById("fs-y").value = "0^columnCap";
      const okRepeats = window.factorialYBEValidateControls();
      const repeatState = window.factorialExactSamplerState();
      return {
        okExpression,
        expressionW: expressionState.wArr,
        okShort,
        shortMessage,
        okRepeats,
        repeatX: repeatState.xArr,
        repeatW: repeatState.wArr,
        phaseText: document.getElementById("fs-status-phase").textContent,
        elapsedText: document.getElementById("fs-status-elapsed").textContent,
        xNote: document.getElementById("fs-x-note").textContent,
        wNote: document.getElementById("fs-w-note").textContent,
        yNote: document.getElementById("fs-y-note").textContent,
        validationDetail: document.getElementById("fs-validation-detail").textContent
      };
    })()`);

    assert(parserResult.okExpression, "q^(-50+i)-style expressions should validate");
    assert(parserResult.expressionW.every(value => value > 1), "epsilon-safe expression w values should exceed x=1");
    assert(parserResult.okShort === false, "short finite x list should fail validation");
    assert(parserResult.shortMessage.includes("1^N"), "short finite list error should suggest explicit repeat syntax");
    assert(parserResult.okRepeats, "symbolic repeat syntax should validate");
    assert(parserResult.repeatX.length === 4 && parserResult.repeatX.every(value => value === 1), "1^N should expand to N x-values");
    assert(parserResult.repeatW.length === 5 && parserResult.repeatW.every(value => value === 1.001), "1.001^M should expand to M w-values");
    assert(parserResult.phaseText === "ready", "successful validation should leave the page ready");
    assert(/s$/.test(parserResult.elapsedText), "elapsed status should be shown in seconds");
    assert(parserResult.xNote.includes("first=") && parserResult.xNote.includes("min=") && parserResult.xNote.includes("max="), "x summary should include first/last/min/max values");
    assert(parserResult.wNote.includes("Closest gap"), "w summary should include the closest strict-inequality gap");
    assert(parserResult.yNote.includes("first=") && parserResult.yNote.includes("max="), "y summary should include cap-aware min/max values");
    assert(parserResult.validationDetail.includes("Positivity margins"), "validation detail should include positivity margins");

    const parserFailures = await evaluate(client, `(() => {
      const base = {
        N: "3",
        M: "3",
        q: "0.5",
        alpha: "0.4",
        beta: "0",
        gamma: "1",
        cap: "20",
        x: "0.4^N",
        w: "1^M",
        y: "0^columnCap"
      };
      function setBase(overrides = {}) {
        document.getElementById("fs-N").value = overrides.N || base.N;
        document.getElementById("fs-M").value = overrides.M || base.M;
        document.getElementById("fs-q").value = overrides.q || base.q;
        document.getElementById("fs-alpha").value = overrides.alpha || base.alpha;
        document.getElementById("fs-beta").value = overrides.beta || base.beta;
        document.getElementById("fs-gamma").value = overrides.gamma || base.gamma;
        document.getElementById("fs-max-cols").value = overrides.cap || base.cap;
        document.getElementById("fs-x").value = overrides.x || base.x;
        document.getElementById("fs-w").value = overrides.w || base.w;
        document.getElementById("fs-y").value = overrides.y || base.y;
      }
      const cases = [
        { name: "unsafe character", values: { x: "alpha*q^i;alert(1)" }, message: "unsupported character" },
        { name: "unknown identifier", values: { x: "theta*q^i" }, message: "unknown variable/function theta" },
        { name: "invalid repeat count", values: { x: "1^0" }, message: "bad repeat token 1^0" },
        { name: "non-finite expression", values: { x: "exp(1000)*q^i" }, message: "expression produced a non-finite value" },
        { name: "short y list", values: { y: "0" }, message: "y finite list has length 1, but needs at least 100" },
        { name: "negative q positivity", values: { q: "-0.5", x: "alpha*q^i" }, message: "Local positivity failed" }
      ];
      return cases.map(testCase => {
        setBase(testCase.values);
        const ok = window.factorialYBEValidateControls();
        return {
          name: testCase.name,
          ok,
          expected: testCase.message,
          message: document.getElementById("fs-validation-note").textContent
        };
      });
    })()`);

    for (const failure of parserFailures) {
      assert(failure.ok === false, `${failure.name} should fail validation`);
      assert(
        failure.message.includes(failure.expected),
        `${failure.name} should report ${failure.expected}, got ${JSON.stringify(failure.message)}`
      );
    }

    const workerResult = await evaluate(client, `(async () => {
      document.getElementById("fs-N").value = "3";
      document.getElementById("fs-M").value = "3";
      document.getElementById("fs-x").value = "0.2,0.3,0.4";
      document.getElementById("fs-w").value = "0.9,1.0,1.1";
      document.getElementById("fs-y").value = "0^200";
      document.getElementById("fs-max-cols").value = "200";
      document.getElementById("fs-resize-btn").click();
      const options = {
        N: 3,
        M: 3,
        x: [0.2, 0.3, 0.4],
        w: [0.9, 1.0, 1.1],
        y: Array(200).fill(0),
        seedLo: 12345,
        seedHi: 67890,
        columnCap: 200
      };
      const reference = window.factorialYBEReferenceSample(options);
      const ok = await window.factorialYBEWorkerSample({ seedLo: 12345, seedHi: 67890, columnCap: 200 });
      if (!ok) throw new Error(document.getElementById("fs-validation-note")?.textContent || "worker sample failed");
      const state = window.factorialExactSamplerState();
      const sample = { N: state.N, M: state.M, mu: state.mu, lam: state.lam, stats: state.stats };
      window.__factorialSmokeCheckShape(sample);
      const sameMu = JSON.stringify(state.mu) === JSON.stringify(reference.mu);
      const sameLam = JSON.stringify(state.lam) === JSON.stringify(reference.lam);
      return {
        wasm: !!state.stats.wasm,
        rowSwaps: state.stats.rowSwaps,
        localMoves: state.stats.localMoves,
        randomChoices: state.stats.randomChoices,
        sameMu,
        sameLam,
        lambda: state.mu[state.M],
        muRows: state.mu.length,
        lamRows: state.lam.length,
        runState: state.runState,
        phaseText: document.getElementById("fs-status-phase").textContent,
        elapsedText: document.getElementById("fs-status-elapsed").textContent
      };
    })()`, 60000);

    assert(workerResult?.wasm, "visible sample should use the worker/WASM path");
    assert(workerResult.rowSwaps === 9, "tiny worker sample should perform N*M row swaps");
    assert(workerResult.localMoves >= workerResult.rowSwaps, "worker local moves should cover row swaps");
    assert(workerResult.sameMu && workerResult.sameLam, "worker/WASM output should match the seeded JS reference");
    assert(workerResult.muRows === 4 && workerResult.lamRows === 4, "worker sample should return tiny mu/lam row counts");
    assert(workerResult.runState === "done" && workerResult.phaseText === "done", "worker sample should finish in done status");
    assert(/s$/.test(workerResult.elapsedText), "worker sample should report elapsed seconds");
    console.log(`Factorial worker/WASM smoke passed: lambda=(${workerResult.lambda.join(",")}), moves=${workerResult.localMoves}.`);

    const directWorkerErrors = await evaluate(client, `(async () => {
      const equality = await window.__factorialSmokeDirectWorker({
        N: 1,
        M: 1,
        x: [1],
        w: [1],
        y: [0, 0, 0, 0],
        columnCap: 4,
        seedLo: 7,
        seedHi: 9
      });
      const positivity = await window.__factorialSmokeDirectWorker({
        N: 2,
        M: 2,
        x: [0.2, 0.2],
        w: [0.9, 0.9],
        y: Array(40).fill(-1),
        columnCap: 40,
        seedLo: 7,
        seedHi: 9
      });
      const capTooSmall = await window.__factorialSmokeDirectWorker({
        N: 2,
        M: 1,
        x: [0.2, 0.3],
        w: [1.0],
        y: [0],
        columnCap: 1,
        seedLo: 7,
        seedHi: 9
      });
      const shortX = await window.__factorialSmokeDirectWorker({
        N: 2,
        M: 1,
        x: [0.2],
        w: [1.0],
        y: Array(10).fill(0),
        columnCap: 10,
        seedLo: 7,
        seedHi: 9
      });
      const shortW = await window.__factorialSmokeDirectWorker({
        N: 1,
        M: 2,
        x: [0.2],
        w: [1.0],
        y: Array(10).fill(0),
        columnCap: 10,
        seedLo: 7,
        seedHi: 9
      });
      const shortY = await window.__factorialSmokeDirectWorker({
        N: 1,
        M: 1,
        x: [0.2],
        w: [1.0],
        y: [0],
        columnCap: 10,
        seedLo: 7,
        seedHi: 9
      });
      const nonFinite = await window.__factorialSmokeDirectWorker({
        N: 1,
        M: 1,
        x: [NaN],
        w: [1.0],
        y: Array(10).fill(0),
        columnCap: 10,
        seedLo: 7,
        seedHi: 9
      });
      return { equality, positivity, capTooSmall, shortX, shortW, shortY, nonFinite };
    })()`, 60000);

    assert(directWorkerErrors.equality?.type === "error", "invalid equality should return a worker error message");
    assert(/need w_1 > x_1/i.test(directWorkerErrors.equality.error || ""), "invalid equality should surface the C++ strict-inequality error");
    assert(directWorkerErrors.positivity?.type === "error", "invalid positivity should return a worker error message");
    assert(/Local positivity failed/i.test(directWorkerErrors.positivity.error || ""), "invalid positivity should surface the C++ local-positivity error");
    assert(directWorkerErrors.capTooSmall?.type === "error", "too-small column cap should return a worker error message");
    assert(/Column cap is too small/i.test(directWorkerErrors.capTooSmall.error || ""), "too-small column cap should surface the C++ cap error");
    assert(directWorkerErrors.shortX?.type === "error", "short x buffer should return a worker error message");
    assert(/expected x length 2, got 1/i.test(directWorkerErrors.shortX.error || ""), "short x buffer should be rejected before WASM");
    assert(directWorkerErrors.shortW?.type === "error", "short w buffer should return a worker error message");
    assert(/expected w length 2, got 1/i.test(directWorkerErrors.shortW.error || ""), "short w buffer should be rejected before WASM");
    assert(directWorkerErrors.shortY?.type === "error", "short y buffer should return a worker error message");
    assert(/expected y length at least 10, got 1/i.test(directWorkerErrors.shortY.error || ""), "short y buffer should be rejected before WASM");
    assert(directWorkerErrors.nonFinite?.type === "error", "non-finite parameters should return a worker error message");
    assert(/x contains a non-finite value/i.test(directWorkerErrors.nonFinite.error || ""), "non-finite parameters should surface the C++ finite-value error");

    const rendererResult = await evaluate(client, `(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      const canvas = document.getElementById("fs-canvas");
      const renderer = window.factorialYBERenderer;
      const ctx = canvas?.getContext("2d");
      let changedPixels = 0;
      if (canvas && ctx && canvas.width > 0 && canvas.height > 0) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const base = [image[0], image[1], image[2], image[3]];
        for (let i = 0; i < image.length; i += 16) {
          const dr = Math.abs(image[i] - base[0]);
          const dg = Math.abs(image[i + 1] - base[1]);
          const db = Math.abs(image[i + 2] - base[2]);
          const da = Math.abs(image[i + 3] - base[3]);
          if (dr + dg + db + da > 18) changedPixels += 1;
        }
      }
      renderer?.zoomBy(1.1);
      renderer?.zoomBy(1 / 1.1);
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      const geometry = renderer?.geometry;
      return {
        hasRenderer: !!renderer,
        hasRenderNow: typeof renderer?.renderNow === "function",
        hasFit: typeof renderer?.fit === "function",
        hasZoomBy: typeof renderer?.zoomBy === "function",
        pathStyle: document.getElementById("fs-path-style")?.value || "",
        viewbar: document.getElementById("fs-viewbar")?.textContent || "",
        canvasWidth: canvas?.width || 0,
        canvasHeight: canvas?.height || 0,
        changedPixels,
        scale: renderer?.viewport?.scale || 0,
        cacheReady: !!renderer?.backgroundCache,
        pathCount: geometry?.paths?.length || 0,
        lambdaParticleCount: geometry?.lambdaParticles?.length || 0
      };
    })()`, 30000);

    assert(rendererResult.hasRenderer, "page should expose the factorial path renderer");
    assert(rendererResult.hasRenderNow && rendererResult.hasFit && rendererResult.hasZoomBy, "renderer should expose draw and zoom controls");
    assert(rendererResult.pathStyle === "tonal", "tonal path style should remain the default");
    assert(rendererResult.viewbar.includes("tonal"), "viewbar should report the current tonal renderer mode");
    assert(rendererResult.canvasWidth > 0 && rendererResult.canvasHeight > 0, "factorial canvas should have drawable dimensions");
    assert(rendererResult.changedPixels > 0, "factorial canvas should be nonblank after worker sample");
    assert(rendererResult.pathCount > 0, "factorial renderer should build sampled path geometry");
    assert(rendererResult.lambdaParticleCount > 0, "factorial renderer should build lambda particle geometry");
    assert(rendererResult.scale > 0, "renderer viewport should have a positive model-space scale");
    assert(rendererResult.cacheReady, "renderer should prepare its cached background layer");
    console.log(`Factorial renderer smoke passed: ${rendererResult.canvasWidth}x${rendererResult.canvasHeight}, changed=${rendererResult.changedPixels}.`);

    const positivityResult = await evaluate(client, `(async () => {
      document.getElementById("fs-N").value = "2";
      document.getElementById("fs-M").value = "2";
      document.getElementById("fs-x").value = "0.2^N";
      document.getElementById("fs-w").value = "0.9^M";
      document.getElementById("fs-y").value = "-1^columnCap";
      document.getElementById("fs-max-cols").value = "120";
      const ok = await window.factorialYBEWorkerSample({ columnCap: 120 });
      return {
        ok,
        phaseText: document.getElementById("fs-status-phase").textContent,
        message: document.getElementById("fs-validation-note").textContent
      };
    })()`, 30000);

    assert(positivityResult.ok === false, "invalid local positivity should fail before worker sampling");
    assert(positivityResult.phaseText === "error", "invalid local positivity should enter error status");
    assert(positivityResult.message.includes("Local positivity failed"), "positivity failure should surface clearly");

    const cancelResetResult = await evaluate(client, `(async () => {
      window.factorialYBEApplyPreset("large-stress");
      const cancelPromise = window.factorialYBEWorkerSample({ columnCap: 20000 });
      const canceled = window.factorialYBECancelSample();
      const cancelOutcome = await Promise.race([
        cancelPromise.then(value => ({ settled: true, value })),
        new Promise(resolve => setTimeout(() => resolve({ settled: false }), 1000))
      ]);
      await new Promise(resolve => setTimeout(resolve, 100));
      const afterCancelState = window.factorialExactSamplerState();
      const afterCancel = {
        canceled,
        promiseSettled: cancelOutcome.settled,
        promiseValue: cancelOutcome.value,
        runState: afterCancelState.runState,
        phaseText: document.getElementById("fs-status-phase").textContent,
        cancelDisabled: document.getElementById("fs-cancel-btn").disabled,
        sampleDisabled: document.getElementById("fs-sample-btn").disabled,
        requestId: afterCancelState.activeRequestId
      };
      const resetPromise = window.factorialYBEWorkerSample({ columnCap: 20000 });
      document.getElementById("fs-reset-btn").click();
      const resetOutcome = await Promise.race([
        resetPromise.then(value => ({ settled: true, value })),
        new Promise(resolve => setTimeout(() => resolve({ settled: false }), 1000))
      ]);
      await new Promise(resolve => setTimeout(resolve, 100));
      const afterResetState = window.factorialExactSamplerState();
      return {
        afterCancel,
        afterReset: {
          promiseSettled: resetOutcome.settled,
          promiseValue: resetOutcome.value,
          runState: afterResetState.runState,
          phaseText: document.getElementById("fs-status-phase").textContent,
          cancelDisabled: document.getElementById("fs-cancel-btn").disabled,
          sampleDisabled: document.getElementById("fs-sample-btn").disabled,
          wasm: !!afterResetState.stats.wasm,
          samples: afterResetState.stats.samples,
          rowSwaps: afterResetState.stats.rowSwaps,
          lambdaText: document.getElementById("fs-lambda").textContent,
          requestId: afterResetState.activeRequestId
        }
      };
    })()`, 60000);

    assert(cancelResetResult.afterCancel.canceled, "cancel should terminate an active large worker");
    assert(cancelResetResult.afterCancel.promiseSettled && cancelResetResult.afterCancel.promiseValue === false, "cancel should settle the active worker promise as false");
    assert(cancelResetResult.afterCancel.runState === "canceled" && cancelResetResult.afterCancel.phaseText === "canceled", "cancel should leave a canceled status");
    assert(cancelResetResult.afterCancel.cancelDisabled, "cancel button should be disabled after canceling");
    assert(cancelResetResult.afterCancel.sampleDisabled === false, "sample button should be re-enabled after canceling");
    assert(cancelResetResult.afterReset.promiseSettled && cancelResetResult.afterReset.promiseValue === false, "reset should settle the active worker promise as false");
    assert(cancelResetResult.afterReset.runState === "ready" && cancelResetResult.afterReset.phaseText === "ready", "reset during sampling should restore the validated ready state");
    assert(cancelResetResult.afterReset.cancelDisabled, "cancel button should be disabled after reset");
    assert(cancelResetResult.afterReset.sampleDisabled === false, "sample button should be re-enabled after reset");
    assert(cancelResetResult.afterReset.wasm === false, "reset should restore a non-WASM frozen state");
    assert(cancelResetResult.afterReset.rowSwaps === 0, "reset should clear sampled row-swap stats");
    assert(!cancelResetResult.afterReset.lambdaText.includes("("), `reset should clear the sampled lambda tuple, got ${JSON.stringify(cancelResetResult.afterReset)}`);
    assert(cancelResetResult.afterReset.requestId > cancelResetResult.afterCancel.requestId, "reset should advance the request guard against stale worker responses");

    const staleWorkerResult = await evaluate(client, `(async () => {
      const RealWorker = window.Worker;
      const instances = [];
      function sampleResult(N) {
        return {
          N,
          M: 1,
          mu: [Array(N).fill(0), Array(N).fill(0)],
          lam: [[], [0]],
          lambda: [0],
          stats: { size: 0, maxPos: N, rowSwaps: N, localMoves: N, randomChoices: 0, elapsedMs: 0 }
        };
      }
      class FakeWorker {
        constructor() {
          this.id = instances.length;
          instances.push(this);
        }
        postMessage(message) {
          this.message = message;
          const isCurrent = this.id === 1;
          const delay = isCurrent ? 5 : 25;
          const resultN = isCurrent ? 1 : 99;
          setTimeout(() => {
            this.onmessage?.({
              data: {
                type: "result",
                requestId: message.requestId,
                result: sampleResult(resultN)
              }
            });
          }, delay);
        }
        terminate() {
          this.terminated = true;
        }
      }
      try {
        window.Worker = FakeWorker;
        document.getElementById("fs-N").value = "1";
        document.getElementById("fs-M").value = "1";
        document.getElementById("fs-x").value = "0.2";
        document.getElementById("fs-w").value = "1.0";
        document.getElementById("fs-y").value = "0^columnCap";
        document.getElementById("fs-max-cols").value = "100";
        const first = window.factorialYBEWorkerSample({ columnCap: 100 });
        const second = window.factorialYBEWorkerSample({ columnCap: 100 });
        const firstOutcome = await Promise.race([
          first.then(value => ({ settled: true, value })),
          new Promise(resolve => setTimeout(() => resolve({ settled: false }), 1000))
        ]);
        const secondOutcome = await Promise.race([
          second.then(value => ({ settled: true, value })),
          new Promise(resolve => setTimeout(() => resolve({ settled: false }), 1000))
        ]);
        await new Promise(resolve => setTimeout(resolve, 60));
        const state = window.factorialExactSamplerState();
        return {
          firstOutcome,
          secondOutcome,
          instanceCount: instances.length,
          firstTerminated: !!instances[0]?.terminated,
          stateN: state.N,
          requestId: state.activeRequestId
        };
      } finally {
        window.Worker = RealWorker;
      }
    })()`, 30000);

    assert(staleWorkerResult.instanceCount === 2, "stale response smoke should create two fake workers");
    assert(staleWorkerResult.firstTerminated, "starting a replacement sample should terminate the stale worker");
    assert(staleWorkerResult.firstOutcome.settled && staleWorkerResult.firstOutcome.value === false, "replacement should settle the stale worker promise as false");
    assert(staleWorkerResult.secondOutcome.settled && staleWorkerResult.secondOutcome.value === true, "replacement sample should complete successfully");
    assert(staleWorkerResult.stateN === 1, `stale worker response should not overwrite the newer sample state: ${JSON.stringify(staleWorkerResult)}`);

    const sampleManyResult = await evaluate(client, `(async () => {
      window.factorialYBEApplyPreset("default-balanced");
      const before = window.factorialExactSamplerState().stats.samples || 0;
      document.getElementById("fs-sample-count").value = "10";
      document.getElementById("fs-multi-sample-btn").click();
      const started = performance.now();
      while (performance.now() - started < 90000) {
        const state = window.factorialExactSamplerState();
        if ((state.stats.samples || 0) >= before + 10 && state.runState === "done") {
          return {
            before,
            after: state.stats.samples,
            wasm: !!state.stats.wasm,
            rowSwaps: state.stats.rowSwaps,
            phaseText: document.getElementById("fs-status-phase").textContent,
            sampleDisabled: document.getElementById("fs-sample-btn").disabled,
            cancelDisabled: document.getElementById("fs-cancel-btn").disabled
          };
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error("Timed out waiting for Sample x 10 to finish");
    })()`, 120000);

    assert(sampleManyResult.after - sampleManyResult.before === 10, `Sample x 10 should add ten samples: ${JSON.stringify(sampleManyResult)}`);
    assert(sampleManyResult.wasm, "Sample x N should use the worker/WASM path");
    assert(sampleManyResult.rowSwaps === 36, "final Sample x N worker run should have default N*M row swaps");
    assert(sampleManyResult.phaseText === "done", "Sample x N should finish in done status");
    assert(sampleManyResult.sampleDisabled === false && sampleManyResult.cancelDisabled === true, "Sample x N controls should be restored after completion");

    assert(consoleErrors.length === 0, `Browser smoke should not emit console errors:\n${consoleErrors.join("\n")}`);
  } finally {
    client?.close();
    if (chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill("SIGTERM");
      await waitForChildExit(chrome);
      if (chrome.exitCode === null && chrome.signalCode === null) {
        chrome.kill("SIGKILL");
        await waitForChildExit(chrome, 2000);
      }
    }
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

checkSource();
await runBrowserSmoke();
console.log("Factorial YBE baseline checks passed.");
