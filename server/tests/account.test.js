import test from "node:test";
import assert from "node:assert/strict";
import { LegalRepository } from "../repositories/legal.repository.js";
import { ConsentService } from "../services/consent.service.js";
import { AuthService } from "../services/auth.service.js";
import { BillingRepository } from "../repositories/billing.repository.js";
import { SubscriptionService } from "../services/subscription.service.js";
import { AccountService } from "../services/account.service.js";

const acceptance = { privacyPolicy: { accepted: true, version: "1.0" }, termsOfUse: { accepted: true, version: "1.0" } };

async function setup() {
  const repository = new LegalRepository();
  const auth = new AuthService(repository, new ConsentService(repository));
  const account = await auth.register({ name: "Owner", email: "owner@fixflow.test", password: "senha-segura-123", acceptance, request: { socket: {}, headers: {} } });
  const billing = new BillingRepository();
  const subscriptions = new SubscriptionService(billing);
  const accountService = new AccountService(repository, billing, subscriptions, { isConfigured: () => true });
  return { repository, account, accountService, billing };
}

test("somente OWNER acessa operações críticas", async () => {
  const context = await setup();
  const auth = { userId: context.account.userId, workspaceId: context.account.workspaceId };
  assert.equal(context.accountService.exportData(auth).workspace.id, context.account.workspaceId);
  context.repository.saveMembership({ userId: "admin", workspaceId: context.account.workspaceId, role: "ADMIN" });
  assert.throws(() => context.accountService.exportData({ userId: "admin", workspaceId: context.account.workspaceId }), /OWNER_REQUIRED/);
});

test("workspace adulterado não atravessa autorização", async () => {
  const context = await setup();
  assert.throws(() => context.accountService.exportData({ userId: context.account.userId, workspaceId: "other-workspace" }), /OWNER_REQUIRED/);
});

test("exclusão exige confirmação textual e senha atual", async () => {
  const context = await setup();
  const auth = { userId: context.account.userId, workspaceId: context.account.workspaceId };
  await assert.rejects(() => context.accountService.delete(auth, { confirmation: "DELETE", password: "senha-segura-123" }), /INVALID_DELETE_CONFIRMATION/);
  await assert.rejects(() => context.accountService.delete(auth, { confirmation: "DELETE MY FIXFLOW ACCOUNT", password: "errada-123" }), /REAUTHENTICATION_FAILED/);
  const result = await context.accountService.delete(auth, { confirmation: "DELETE MY FIXFLOW ACCOUNT", password: "senha-segura-123" });
  assert.equal(result.status, "DELETED");
  assert.equal(context.repository.findWorkspace(context.account.workspaceId), undefined);
});

test("desativação bloqueia novas operações do workspace", async () => {
  const context = await setup();
  const auth = { userId: context.account.userId, workspaceId: context.account.workspaceId };
  assert.deepEqual(context.accountService.deactivate(auth), { status: "DEACTIVATED" });
  assert.throws(() => context.accountService.exportData(auth), /WORKSPACE_NOT_FOUND/);
  assert.throws(() => context.accountService.deactivate(auth), /WORKSPACE_NOT_FOUND/);
});
