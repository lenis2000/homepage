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
  assert(page.includes('id="fs-status-phase"'), "/factorial/ should expose a visible phase status");
  assert(page.includes('id="fs-status-elapsed"'), "/factorial/ should expose visible elapsed seconds");
  assert(!page.includes("factorial-glauber.js"), "/factorial/ should not load stale Glauber JS");
  assert(!page.includes("factorial-wasm.js"), "/factorial/ should not load stale Glauber WASM");
  assert(page.includes('id="fs-cancel-btn"'), "/factorial/ should expose a cancel button");
  assert(page.includes('id="fs-view-fit"'), "/factorial/ should expose a canvas fit control");
  assert(page.includes('id="fs-view-actual"'), "/factorial/ should expose a 100% canvas control");
  assert(page.includes('id="fs-path-style"'), "/factorial/ should expose an advanced path style control");
  assert(page.includes('<option value="tonal" selected>'), "tonal path rendering should be the default");
  assert(page.includes('<option value="legacy">'), "legacy multicolor paths should be available only as a secondary option");
  assert(sampler.includes("window.factorialYBEReferenceSample"), "seeded JS reference hook should be exposed");
  assert(sampler.includes("window.factorialYBEWorkerSample"), "worker/WASM sample hook should be exposed");
  assert(sampler.includes("window.factorialYBEBenchmark"), "dev benchmark helper should be exposed");
  assert(sampler.includes("class FactorialPathCanvasRenderer"), "canvas rendering should be owned by FactorialPathCanvasRenderer");
  assert(sampler.includes("window.factorialYBERenderer"), "renderer diagnostics should be exposed for smoke tests");
  assert(sampler.includes("OffscreenCanvas"), "renderer should cache static layers with OffscreenCanvas when available");
  assert(sampler.includes("requestAnimationFrame"), "renderer should schedule canvas draws with requestAnimationFrame");
  assert(sampler.includes("addEventListener('pointermove'"), "renderer should use pointer events for drag/pinch");
  assert(!sampler.includes("addEventListener('mousemove'"), "renderer should not redraw directly from mousemove handlers");
  assert(!sampler.includes("addEventListener('touchmove'"), "renderer should not redraw directly from touchmove handlers");
  assert(sampler.includes("setRunState('sampling'"), "sampler should use structured sampling status");
  assert(sampler.includes("finiteListTooShortMessage"), "sampler should reject short finite parameter lists clearly");
  assert(sampler.includes("new Worker('/js/factorial-ybe-worker.js"), "visible sampler should start the YBE worker");
  assert(sampler.includes("createXoshiro256pp"), "seeded reference hook should use Xoshiro256++");
  assert(!sampler.includes("Math.random() * total"), "hot local sampler should use the swappable RNG source");
  assert(!sampler.includes(".innerHTML"), "sampler should not write untrusted status text with innerHTML");
  assert(worker.includes("factorial-ybe-wasm.js"), "worker should load the generated WASM bundle");
  assert(worker.includes("_sampleFactorialYBE"), "worker should call the exported C++ sampler");
  assert(worker.includes("utf8ToString(jsonPtr)"), "worker should null-check before decoding the JSON pointer");
  assert(worker.includes("finally"), "worker should free WASM/C++ allocations in finally");
  assert(wasmBundle.includes("_sampleFactorialYBE"), "WASM bundle should export _sampleFactorialYBE");
  assert(wasmBundle.includes("_freeString"), "WASM bundle should export _freeString");
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
    if (!message.id || !pending.has(message.id)) return;
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

async function runBrowserSmoke() {
  const browser = findBrowser();
  if (!browser) {
    console.log("Skipping factorial browser smoke: no Chromium/Chrome executable found.");
    return;
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
  try {
    await waitForChrome(debugPort);
    const tab = await openTab(debugPort, `http://127.0.0.1:${sitePort}/factorial/`);
    client = createCdpClient(tab.webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    await waitForPageCondition(
      client,
      "typeof window.factorialYBEReferenceSample === 'function' && typeof window.factorialYBEWorkerSample === 'function' && typeof window.factorialYBEBenchmark === 'function'",
      "factorial sampler hooks"
    );

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
      assertBrowser(JSON.stringify(normalize(a)) === JSON.stringify(normalize(b)), "seeded reference output should be deterministic");
      return { lambda: a.lambda, rowSwaps: a.stats.rowSwaps, localMoves: a.stats.localMoves };
    })()`);

    assert(result && result.rowSwaps === 9, "browser smoke should return deterministic reference stats");
    console.log(`Factorial seeded reference smoke passed: lambda=(${result.lambda.join(",")}), moves=${result.localMoves}.`);

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
        elapsedText: document.getElementById("fs-status-elapsed").textContent
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
        cacheReady: !!renderer?.backgroundCache
      };
    })()`, 30000);

    assert(rendererResult.hasRenderer, "page should expose the factorial path renderer");
    assert(rendererResult.hasRenderNow && rendererResult.hasFit && rendererResult.hasZoomBy, "renderer should expose draw and zoom controls");
    assert(rendererResult.pathStyle === "tonal", "tonal path style should remain the default");
    assert(rendererResult.viewbar.includes("tonal"), "viewbar should report the current tonal renderer mode");
    assert(rendererResult.canvasWidth > 0 && rendererResult.canvasHeight > 0, "factorial canvas should have drawable dimensions");
    assert(rendererResult.changedPixels > 0, "factorial canvas should be nonblank after worker sample");
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
