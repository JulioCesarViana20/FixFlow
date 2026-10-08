import test from "node:test";
import assert from "node:assert/strict";
import { Router } from "../http/router.js";
import { registerAuthRoutes } from "../routes/auth.routes.js";
import { LegalRepository } from "../repositories/legal.repository.js";
import { ConsentService } from "../services/consent.service.js";
import { AuthService } from "../services/auth.service.js";
import { createSessionToken } from "../services/session-token.service.js";
import { requireAuth } from "../middleware/auth.js";

function setup() {
  const repository = new LegalRepository();
  const consent = new ConsentService(repository);
  return { repository, auth: new AuthService(repository, consent) };
}

function registration(overrides = {}) {
  return {
    name: "Responsável FixFlow",
    email: "owner@example.com",
    password: "senha-segura-123",
    acceptance: {
      privacyPolicy: { accepted: true, version: "1.0" },
      termsOfUse: { accepted: true, version: "1.0" },
    },
    request: { socket: { remoteAddress: "127.0.0.1" }, headers: { "user-agent": "test" } },
    ...overrides,
  };
}

test("cadastro exige aceite dos dois documentos", async () => {
  const context = setup();
  await assert.rejects(() => context.auth.register(registration({ acceptance: {} })), /LEGAL_ACCEPTANCE_REQUIRED/);
  assert.equal(context.repository.users.size, 0);
});

test("cadastro rejeita versão antiga", async () => {
  const context = setup();
  await assert.rejects(() => context.auth.register(registration({ acceptance: { privacyPolicy: { accepted: true, version: "0.9" }, termsOfUse: { accepted: true, version: "1.0" } } })), /LEGAL_ACCEPTANCE_REQUIRED/);
  assert.equal(context.repository.users.size, 0);
});

test("cadastro registra versões e não armazena senha em texto puro", async () => {
  const context = setup();
  const result = await context.auth.register(registration());
  const user = context.repository.users.get(result.userId);
  assert.ok(user.passwordHash.includes(":"));
  assert.equal(user.password, undefined);
  assert.deepEqual(context.repository.listAcceptances(result.userId).map((item) => item.documentType).sort(), ["PRIVACY_POLICY", "TERMS_OF_USE"]);
  assert.ok(context.repository.listAcceptances(result.userId).every((item) => item.documentVersion === "1.0"));
});

test("cadastro duplicado é rejeitado", async () => {
  const context = setup();
  await context.auth.register(registration());
  await assert.rejects(() => context.auth.register(registration()), /EMAIL_ALREADY_REGISTERED/);
});

test("cadastro responde com headers CORS para o frontend", async () => {
  const router = new Router();
  registerAuthRoutes(router, {
    register: async () => ({ userId: "user-123", workspaceId: "workspace-123" }),
  });

  const payload = JSON.stringify({
    name: "Responsável FixFlow",
    email: "owner@example.com",
    password: "senha-segura-123",
    acceptance: {
      privacyPolicy: { accepted: true, version: "1.0" },
      termsOfUse: { accepted: true, version: "1.0" },
    },
  });

  const request = {
    method: "POST",
    url: "/api/auth/register",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(payload, "utf8")),
    },
    socket: { remoteAddress: "127.0.0.1" },
    async *[Symbol.asyncIterator]() {
      yield payload;
    },
  };

  const response = {
    headers: {},
    writeHead(status, headers) {
      this.statusCode = status;
      Object.assign(this.headers, headers);
    },
    end(body) {
      this.body = body;
    },
  };

  await router.handle(request, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["access-control-allow-origin"], "*");
  assert.match(String(response.headers["access-control-allow-methods"]), /POST/i);
});

test("login valida a senha e retorna um token assinado", async () => {
  const context = setup();
  const registered = await context.auth.register(registration());
  const result = await context.auth.login({ email: "OWNER@EXAMPLE.COM", password: "senha-segura-123" });
  assert.deepEqual({ userId: result.userId, workspaceId: result.workspaceId }, { userId: registered.userId, workspaceId: registered.workspaceId });
  assert.equal(typeof result.accessToken, "string");
  const claims = requireAuth({ headers: { authorization: `Bearer ${result.accessToken}` } });
  assert.equal(claims.userId, result.userId);
  assert.equal(claims.workspaceId, result.workspaceId);
  assert.ok(claims.exp > claims.iat);
});

test("login rejeita senha inválida e token adulterado", async () => {
  const context = setup();
  await context.auth.register(registration());
  await assert.rejects(() => context.auth.login({ email: "owner@example.com", password: "senha-errada" }), /INVALID_CREDENTIALS/);
  const token = createSessionToken({ userId: "user-1", workspaceId: "workspace-1" });
  assert.throws(() => requireAuth({ headers: { authorization: `Bearer ${token}x` } }), /UNAUTHORIZED/);
});
