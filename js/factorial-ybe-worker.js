(function () {
  'use strict';

  let modulePromise = null;

  function loadModule() {
    if (!modulePromise) {
      importScripts('factorial-ybe-wasm.js');
      modulePromise = createFactorialYBEModule();
    }
    return modulePromise;
  }

  function copyFloat64ToWasm(Module, values) {
    const ptr = Module._malloc(values.byteLength);
    if (!ptr) throw new Error('WASM malloc failed for sampler parameters.');
    Module.HEAPF64.set(values, ptr >> 3);
    return ptr;
  }

  async function runSample(message) {
    const Module = await loadModule();
    const x = new Float64Array(message.xBuffer);
    const w = new Float64Array(message.wBuffer);
    const y = new Float64Array(message.yBuffer);
    let xPtr = 0;
    let wPtr = 0;
    let yPtr = 0;
    let jsonPtr = 0;

    try {
      xPtr = copyFloat64ToWasm(Module, x);
      wPtr = copyFloat64ToWasm(Module, w);
      yPtr = y.length ? copyFloat64ToWasm(Module, y) : 0;
      jsonPtr = Module._sampleFactorialYBE(
        message.N,
        message.M,
        xPtr,
        wPtr,
        yPtr,
        y.length,
        message.columnCap,
        message.seedLo >>> 0,
        message.seedHi >>> 0
      );
      if (!jsonPtr) throw new Error('WASM sampler returned a null JSON pointer.');

      const json = Module.UTF8ToString(jsonPtr);
      const parsed = JSON.parse(json);
      if (parsed && parsed.error) throw new Error(parsed.error);
      self.postMessage({
        type: 'result',
        requestId: message.requestId,
        result: parsed,
      });
    } finally {
      if (jsonPtr) Module._freeString(jsonPtr);
      if (xPtr) Module._free(xPtr);
      if (wPtr) Module._free(wPtr);
      if (yPtr) Module._free(yPtr);
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
