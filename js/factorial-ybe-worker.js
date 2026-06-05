(function () {
  'use strict';

  let modulePromise = null;
  const MAX_N = 10000;
  const MAX_M = 10000;
  const MAX_COLUMN_CAP = 1000000;
  const MAX_BIT_LEVEL_WORDS = 4 * 1024 * 1024;

  function loadModule() {
    if (!modulePromise) {
      importScripts('factorial-ybe-wasm.js');
      modulePromise = createFactorialYBEModule();
    }
    return modulePromise;
  }

  function copyFloat64ToWasm(Module, values) {
    if (!(values instanceof Float64Array)) throw new Error('Expected Float64Array sampler parameters.');
    if (typeof Module._malloc !== 'function') throw new Error('WASM module is missing _malloc.');
    if (!Module.HEAPF64) throw new Error('WASM module is missing HEAPF64.');
    if (values.byteLength === 0) return 0;
    const ptr = Module._malloc(values.byteLength);
    if (!ptr) throw new Error('WASM malloc failed for sampler parameters.');
    Module.HEAPF64.set(values, ptr >> 3);
    return ptr;
  }

  function requireExport(Module, name) {
    if (typeof Module[name] !== 'function') {
      throw new Error(`WASM module is missing ${name}.`);
    }
    return Module[name].bind(Module);
  }

  function finitePositiveInteger(value, label) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number <= 0) {
      throw new Error(`${label} must be a positive integer.`);
    }
    return number;
  }

  function validateStorageShape(N, M, columnCap) {
    if (N > MAX_N || M > MAX_M) throw new Error('N and M are too large.');
    if (columnCap > MAX_COLUMN_CAP) throw new Error('Column cap is too large.');
    const levelCount = N + M + 1;
    const wordsPerLevel = Math.ceil(columnCap / 64);
    const totalWords = levelCount * wordsPerLevel;
    if (!Number.isSafeInteger(totalWords) || totalWords > MAX_BIT_LEVEL_WORDS) {
      throw new Error('Sampler level storage request is too large.');
    }
  }

  function validateSampleMessage(message, x, w, y) {
    const N = finitePositiveInteger(message.N, 'N');
    const M = finitePositiveInteger(message.M, 'M');
    const columnCap = finitePositiveInteger(message.columnCap, 'columnCap');
    validateStorageShape(N, M, columnCap);
    if (!(x instanceof Float64Array) || x.length !== N) {
      throw new Error(`Worker parameter mismatch: expected x length ${N}, got ${x?.length ?? 'missing'}.`);
    }
    if (!(w instanceof Float64Array) || w.length !== M) {
      throw new Error(`Worker parameter mismatch: expected w length ${M}, got ${w?.length ?? 'missing'}.`);
    }
    if (!(y instanceof Float64Array) || y.length < columnCap) {
      throw new Error(`Worker parameter mismatch: expected y length at least ${columnCap}, got ${y?.length ?? 'missing'}.`);
    }
    return { N, M, columnCap };
  }

  async function runSample(message) {
    const Module = await loadModule();
    const x = new Float64Array(message.xBuffer);
    const w = new Float64Array(message.wBuffer);
    const y = new Float64Array(message.yBuffer);
    const shape = validateSampleMessage(message, x, w, y);
    let xPtr = 0;
    let wPtr = 0;
    let yPtr = 0;
    let jsonPtr = 0;
    let freeString = null;
    let free = null;

    try {
      const sampleFactorialYBE = requireExport(Module, '_sampleFactorialYBE');
      const utf8ToString = requireExport(Module, 'UTF8ToString');
      freeString = requireExport(Module, '_freeString');
      free = requireExport(Module, '_free');
      xPtr = copyFloat64ToWasm(Module, x);
      wPtr = copyFloat64ToWasm(Module, w);
      yPtr = y.length ? copyFloat64ToWasm(Module, y) : 0;
      jsonPtr = sampleFactorialYBE(
        shape.N,
        shape.M,
        xPtr,
        wPtr,
        yPtr,
        y.length,
        shape.columnCap,
        message.seedLo >>> 0,
        message.seedHi >>> 0
      );
      if (!jsonPtr || !Number.isFinite(Number(jsonPtr))) {
        throw new Error('WASM sampler returned a null JSON pointer.');
      }

      const json = utf8ToString(jsonPtr);
      if (typeof json !== 'string' || json.length === 0) {
        throw new Error('WASM sampler returned an empty JSON string.');
      }
      const parsed = JSON.parse(json);
      if (parsed && parsed.error) throw new Error(parsed.error);
      self.postMessage({
        type: 'result',
        requestId: message.requestId,
        result: parsed,
      });
    } finally {
      if (jsonPtr && freeString) freeString(jsonPtr);
      if (xPtr && free) free(xPtr);
      if (wPtr && free) free(wPtr);
      if (yPtr && free) free(yPtr);
    }
  }

  self.onmessage = (event) => {
    const message = event.data || {};
    if (message.type === 'ping') {
      self.postMessage({ type: 'pong', requestId: message.requestId });
      return;
    }
    if (message.type !== 'sample') return;

    runSample(message).catch((error) => {
      self.postMessage({
        type: 'error',
        requestId: message.requestId,
        error: error && error.message ? error.message : String(error),
      });
    });
  };
})();
