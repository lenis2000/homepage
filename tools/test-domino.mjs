import { spawn } from "node:child_process";
import fs from "node:fs";
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

  assert(
    !/<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@/i.test(source),
    "Three.js should not be loaded by a default-path script tag"
  );
  assert(source.includes('id="no-3d-checkbox" checked'), "No 3D should be checked by default");
  assert(source.includes('<button id="view-2d-btn" class="active"'), "2D view should be active by default");
  assert(source.includes('<canvas id="aztec-canvas-2d"'), "2D view should include the canvas renderer");
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
}

async function wait(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
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

  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  const opened = new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));

  return {
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise(resolve => pending.set(id, resolve));
    },
    close() {
      ws.close();
    }
  };
}

async function evaluateDominoWasm(client) {
  const expression = String.raw`
    new Promise(resolve => {
      const ready = async () => {
        const samplerArgs = [
          "number", "number", "number", "number", "number",
          "number", "number", "number", "number", "number"
        ];
        const freeString = Module.cwrap("freeString", null, ["number"]);
        const callSampler = async (name, n) => {
          const fn = Module.cwrap(name, "number", samplerArgs, { async: true });
          const ptr = await fn(n, 0, 0, 0, 0, 0, 0, 0, 0, 0);
          if (!ptr) throw new Error(name + " returned a null pointer");
          try {
            return JSON.parse(Module.UTF8ToString(ptr));
          } finally {
            freeString(ptr);
          }
        };
        const checkDominoes = (label, dominoes, n, orientation) => {
          const expected = n * (n + 1);
          if (!Array.isArray(dominoes)) throw new Error(label + " did not return an array");
          if (dominoes.length !== expected) {
            throw new Error(label + " expected " + expected + " dominoes, got " + dominoes.length);
          }
          const cells = new Set();
          for (const d of dominoes) {
            if (orientation === "horizontal" && !(d.w === 4 && d.h === 2)) {
              throw new Error(label + " returned a non-horizontal domino");
            }
            if (orientation === "vertical" && !(d.w === 2 && d.h === 4)) {
              throw new Error(label + " returned a non-vertical domino");
            }
            for (let dx = 0; dx < d.w; dx += 2) {
              for (let dy = 0; dy < d.h; dy += 2) {
                const key = String(d.x + dx) + "," + String(d.y + dy);
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
          checkDominoes("frozen horizontal n=" + n, await callSampler("simulateAztecHorizontal", n), n, "horizontal");
          checkDominoes("frozen vertical n=" + n, await callSampler("simulateAztecVertical", n), n, "vertical");
        }
        for (const n of [2, 4, 12]) {
          checkDominoes("uniform n=" + n, await callSampler("simulateAztec", n), n);
        }
        resolve("ok");
      };
      if (Module.calledRun) ready().catch(error => resolve({ error: error.message }));
      else Module.onRuntimeInitialized = () => ready().catch(error => resolve({ error: error.message }));
    })
  `;

  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 60000
  });
  const value = result.result?.result?.value;
  if (value?.error) throw new Error(value.error);
  assert(value === "ok", "Unexpected WASM test result");
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
    await client.send("Runtime.enable");
    await evaluateDominoWasm(client);
    await client.send("Browser.close").catch(() => {});
  } finally {
    client?.close();
    chrome.kill("SIGTERM");
    await wait(100);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

checkPageSource();
await checkWasmBundle();
console.log("domino smoke checks passed");
