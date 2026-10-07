import test from "node:test";
import assert from "node:assert/strict";
import { createCorsMiddleware } from "../middleware/cors.js";

function request(method = "OPTIONS", origin = "http://localhost:4173") {
  return { method, headers: { origin } };
}

function response() {
  return {
    headers: {},
    status: null,
    body: "",
    setHeader(name, value) { this.headers[name] = value; },
    writeHead(status) { this.status = status; },
    end(body = "") { this.body = body; },
  };
}

test("responde preflight da origem configurada", () => {
  const result = response();
  let called = false;

  createCorsMiddleware({ allowedOrigin: "http://localhost:4173" })(
    request(),
    result,
    () => { called = true; },
  );

  assert.equal(result.status, 204);
  assert.equal(result.headers["access-control-allow-origin"], "http://localhost:4173");
  assert.equal(called, false);
});

test("não permite preflight de origem diferente", () => {
  const result = response();

  createCorsMiddleware({ allowedOrigin: "http://localhost:4173" })(
    request("OPTIONS", "http://malicious.example"),
    result,
    () => {},
  );

  assert.equal(result.status, 403);
  assert.equal(JSON.parse(result.body).error, "CORS_ORIGIN_NOT_ALLOWED");
});

test("adiciona cabeçalho CORS nas requisições permitidas", () => {
  const result = response();
  let called = false;

  createCorsMiddleware({ allowedOrigin: "http://localhost:4173" })(
    request("POST"),
    result,
    () => { called = true; },
  );

  assert.equal(result.headers["access-control-allow-origin"], "http://localhost:4173");
  assert.equal(called, true);
});

test("permite origens locais adicionais em desenvolvimento", () => {
  const result = response();
  let called = false;

  createCorsMiddleware({
    allowedOrigin: "https://fixflow.onrender.com",
    allowedOrigins: ["http://localhost:4173"],
  })(
    request("POST", "http://localhost:4173"),
    result,
    () => { called = true; },
  );

  assert.equal(result.headers["access-control-allow-origin"], "http://localhost:4173");
  assert.equal(called, true);
});
