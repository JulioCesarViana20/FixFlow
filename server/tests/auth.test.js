import test from "node:test";
import assert from "node:assert/strict";
import { LegalRepository } from "../repositories/legal.repository.js";
import { ConsentService } from "../services/consent.service.js";
import { AuthService } from "../services/auth.service.js";

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
