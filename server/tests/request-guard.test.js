import test from "node:test";
import assert from "node:assert/strict";
import { createRequestGuard } from "../middleware/request-guard.js";

function request(path = "/api/test") {
  return {
    method: "POST",
    url: path,
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  };
}

function response() {
  return {
    headersSent: false,
    headers: null,
    status: null,
    body: "",
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
      this.headersSent = true;
    },
    end(body) {
      this.body = body;
    },
  };
}

test("bloqueia excesso de requisições por IP e rota", () => {
  const guard = createRequestGuard({ windowMs: 60_000, maxRequests: 2 });
  const first = response();
  const second = response();
  const third = response();

  guard(request(), first, () => {});
  guard(request(), second, () => {});
  guard(request(), third, () => {});

  assert.equal(third.status, 429);
  assert.equal(JSON.parse(third.body).error, "RATE_LIMITED");
  assert.ok(Number(third.headers["retry-after"]) > 0);
});

test("rejeita corpo acima do limite configurado", () => {
  const guard = createRequestGuard({ maxBodyBytes: 10 });
  const incoming = request();
  incoming.headers["content-length"] = "11";
  const result = response();

  guard(incoming, result, () => {});

  assert.equal(result.status, 413);
  assert.equal(JSON.parse(result.body).error, "REQUEST_TOO_LARGE");
});
