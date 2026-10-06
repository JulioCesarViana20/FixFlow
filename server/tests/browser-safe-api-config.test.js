import test from "node:test";
import assert from "node:assert/strict";

const originalValues = {
  document: globalThis.document,
  window: globalThis.window,
  localStorage: globalThis.localStorage,
  __FIXFLOW_API_URL__: globalThis.__FIXFLOW_API_URL__,
};

test("configuração da API não quebra em runtime sem navegador", async () => {
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.localStorage;
  delete globalThis.__FIXFLOW_API_URL__;

  try {
    const { API_URL } = await import(new URL("../../src/js/config/api.js?browser-safe", import.meta.url));
    assert.equal(API_URL, "");
  } finally {
    Object.assign(globalThis, originalValues);
  }
});
