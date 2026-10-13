import { promisify } from "node:util";
import { scrypt, timingSafeEqual } from "node:crypto";

const deriveKey = promisify(scrypt);
const DELETE_PHRASE = "DELETE MY FIXFLOW ACCOUNT";

export class AccountService {
  constructor(repository, billingRepository, subscriptionService, gateway) { this.repository = repository; this.billingRepository = billingRepository; this.subscriptionService = subscriptionService; this.gateway = gateway; }

  ownerContext(auth) {
    const membership = this.repository.findMembership(auth.userId, auth.workspaceId);
    if (!membership || membership.role !== "OWNER") { const error = new Error("OWNER_REQUIRED"); error.statusCode = 403; throw error; }
    const user = this.repository.findUser(auth.userId);
    const workspace = this.repository.findWorkspace(auth.workspaceId);
    if (!user || !workspace || ["DELETED", "DEACTIVATED"].includes(workspace.status)) { const error = new Error("WORKSPACE_NOT_FOUND"); error.statusCode = 404; throw error; }
    return { user, workspace, membership };
  }

  audit(auth, action, result) { this.repository.saveAudit({ id: crypto.randomUUID(), userId: auth.userId, workspaceId: auth.workspaceId, action, result, createdAt: new Date().toISOString() }); }

  subscription(auth) {
    this.ownerContext(auth);
    const subscription = this.billingRepository.findSubscription(auth.workspaceId);
    return subscription ? { plan: subscription.plan.code, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd || null } : { plan: "free", status: "free", currentPeriodEnd: null };
  }

  async cancelSubscription(auth) {
    this.ownerContext(auth);
    const subscription = this.billingRepository.findSubscription(auth.workspaceId);
    if (!subscription) throw new Error("SUBSCRIPTION_NOT_FOUND");
    if (subscription.gateway === "mercadopago" && !this.gateway.isConfigured()) throw new Error("PAYMENT_GATEWAY_NOT_CONFIGURED");
    this.audit(auth, "SUBSCRIPTION_CANCELLATION_REQUESTED", "accepted");
    return this.subscriptionService.cancel(auth.workspaceId);
  }

  exportData(auth) {
    const { user, workspace } = this.ownerContext(auth);
    this.audit(auth, "ACCOUNT_EXPORT_REQUESTED", "accepted");
    return { exportedAt: new Date().toISOString(), workspace: { id: workspace.id, status: workspace.status }, users: [{ id: user.id, name: user.name, email: user.email }], acceptances: this.repository.listAcceptances(user.id).map(({ id, documentType, documentVersion, acceptedAt, createdAt }) => ({ id, documentType, documentVersion, acceptedAt, createdAt })) };
  }

  deactivate(auth) {
    const { workspace } = this.ownerContext(auth);
    if (workspace.status === "DEACTIVATED") throw new Error("ACCOUNT_ALREADY_DEACTIVATED");
    workspace.status = "DEACTIVATED";
    workspace.updatedAt = new Date().toISOString();
    this.audit(auth, "ACCOUNT_DEACTIVATED", "accepted");
    return { status: workspace.status };
  }

  async delete(auth, { confirmation, password }) {
    const { user, workspace } = this.ownerContext(auth);
    if (confirmation !== DELETE_PHRASE) throw new Error("INVALID_DELETE_CONFIRMATION");
    if (!password || !(await this.verifyPassword(password, user.passwordHash))) throw new Error("REAUTHENTICATION_FAILED");
    if (workspace.status === "DELETION_PROCESSING") throw new Error("DELETION_IN_PROGRESS");
    const subscription = this.billingRepository.findSubscription(auth.workspaceId);
    if (subscription && subscription.gateway === "mercadopago" && !this.gateway.isConfigured()) throw new Error("PAYMENT_GATEWAY_NOT_CONFIGURED");
    workspace.status = "DELETION_PROCESSING";
    this.audit(auth, "ACCOUNT_DELETION_REQUESTED", "accepted");
    this.billingRepository.deleteWorkspace(auth.workspaceId);
    this.repository.deleteWorkspace(auth.workspaceId);
    if (this.repository.deleteUser) this.repository.deleteUser(user.id);
    else this.repository.users.delete(user.id);
    this.repository.saveAudit({ id: crypto.randomUUID(), userId: auth.userId, workspaceId: auth.workspaceId, action: "ACCOUNT_DELETED", result: "completed", createdAt: new Date().toISOString() });
    await this.billingRepository.flush?.();
    await this.repository.flush?.();
    return { status: "DELETED" };
  }

  async verifyPassword(password, stored) {
    const [salt, expectedHex] = String(stored || "").split(":");
    if (!salt || !expectedHex) return false;
    const actual = await deriveKey(String(password), salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
