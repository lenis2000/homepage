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
  assert(!page.includes("factorial-glauber.js"), "/factorial/ should not load stale Glauber JS");
  assert(!page.includes("factorial-wasm.js"), "/factorial/ should not load stale Glauber WASM");
  assert(page.includes('id="fs-cancel-btn"'), "/factorial/ should expose a cancel button");
  assert(sampler.includes("window.factorialYBEReferenceSample"), "seeded JS reference hook should be exposed");
  assert(sampler.includes("window.factorialYBEWorkerSample"), "worker/WASM sample hook should be exposed");
  assert(sampler.includes("new Worker('/js/factorial-ybe-worker.js"), "visible sampler should start the YBE worker");
  assert(sampler.includes("createXoshiro256pp"), "seeded reference hook should use Xoshiro256++");
  assert(!sampler.includes("Math.random() * total"), "hot local sampler should use the swappable RNG source");
  assert(worker.includes("factorial-ybe-wasm.js"), "worker should load the generated WASM bundle");
  assert(worker.includes("_sampleFactorialYBE"), "worker should call the exported C++ sampler");
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
      "typeof window.factorialYBEReferenceSample === 'function' && typeof window.factorialYBEWorkerSample === 'function'",
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
        y: Array(80).fill(0),
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
        lamRows: state.lam.length
      };
    })()`, 60000);

    assert(workerResult?.wasm, "visible sample should use the worker/WASM path");
    assert(workerResult.rowSwaps === 9, "tiny worker sample should perform N*M row swaps");
    assert(workerResult.localMoves >= workerResult.rowSwaps, "worker local moves should cover row swaps");
    assert(workerResult.sameMu && workerResult.sameLam, "worker/WASM output should match the seeded JS reference");
    assert(workerResult.muRows === 4 && workerResult.lamRows === 4, "worker sample should return tiny mu/lam row counts");
    console.log(`Factorial worker/WASM smoke passed: lambda=(${workerResult.lambda.join(",")}), moves=${workerResult.localMoves}.`);
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
