import test from "node:test";
import assert from "node:assert/strict";
import { WorkspaceService } from "../services/workspace.service.js";

function setup() {
  const repository = {
    users: new Map([["user-a", { id: "user-a" }]]),
    workspaces: new Map([["workspace-a", { id: "workspace-a", status: "ACTIVE" }]]),
    memberships: new Map([["user-a:workspace-a", { role: "OWNER" }]]),
    findMembership(userId, workspaceId) { return this.memberships.get(`${userId}:${workspaceId}`); },
    findWorkspace(workspaceId) { return this.workspaces.get(workspaceId); },
  };
  return { repository, service: new WorkspaceService(repository) };
}

test("persiste e lê dados do workspace autenticado", async () => {
  const { service } = setup();
  const auth = { userId: "user-a", workspaceId: "workspace-a" };
  const saved = await service.write(auth, { orders: [{ id: "order-1" }] });
  const loaded = await service.read(auth);
  assert.equal(saved.version, 1);
  assert.deepEqual(loaded.data.orders, [{ id: "order-1" }]);
});

test("não permite workspace sem membership", async () => {
  const { service } = setup();
  await assert.rejects(() => service.read({ userId: "user-a", workspaceId: "workspace-other" }), /WORKSPACE_NOT_FOUND/);
});

test("detecta conflito de versão para evitar perda silenciosa", async () => {
  const { service } = setup();
  const auth = { userId: "user-a", workspaceId: "workspace-a" };
  await service.write(auth, { orders: [] });
  await assert.rejects(() => service.write(auth, { orders: [{ id: "stale" }] }, 0), /WORKSPACE_VERSION_CONFLICT/);
});
