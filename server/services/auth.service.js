import { promisify } from "node:util";
import { randomBytes, scrypt } from "node:crypto";
import { timingSafeEqual } from "node:crypto";
import { createSessionToken } from "./session-token.service.js";

const deriveKey = promisify(scrypt);

export class AuthService {
  constructor(repository, consentService, onUserCreated = null) { this.repository = repository; this.consentService = consentService; this.onUserCreated = onUserCreated; }

  async register({ name, email, password, acceptance, request }) {
    if (!name || String(name).trim().length < 2 || !email || !password || String(password).length < 8) throw new Error("INVALID_REGISTRATION");
    const normalizedEmail = String(email).trim().toLowerCase();
    if (this.repository.findUserByEmail(normalizedEmail)) throw new Error("EMAIL_ALREADY_REGISTERED");
    this.consentService.validate(acceptance);
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await deriveKey(String(password), salt, 64)).toString("hex");
    const user = { id: crypto.randomUUID(), name: String(name).trim(), email: normalizedEmail, passwordHash: `${salt}:${derivedKey}`, createdAt: new Date().toISOString() };
    const workspaceId = crypto.randomUUID();
    this.repository.saveUser(user);
    this.repository.saveWorkspace({ id: workspaceId, ownerUserId: user.id, status: "ACTIVE", createdAt: new Date().toISOString() });
    this.repository.saveMembership({ userId: user.id, workspaceId, role: "OWNER" });
    try { this.consentService.record({ userId: user.id, workspaceId, acceptance, request }); } catch (error) { this.repository.users.delete(user.id); this.repository.deleteWorkspace(workspaceId); throw error; }
    await this.repository.flush?.();
    await this.onUserCreated?.(user, workspaceId);
    return { userId: user.id, workspaceId, accessToken: createSessionToken({ userId: user.id, workspaceId }) };
  }

  async login({ email, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = this.repository.findUserByEmail(normalizedEmail);
    if (!user || !user.passwordHash || user.status === "DEACTIVATED" || user.status === "DELETED") throw new Error("INVALID_CREDENTIALS");
    const [salt, expectedHex] = String(user.passwordHash).split(":");
    if (!salt || !expectedHex) throw new Error("INVALID_CREDENTIALS");
    const derived = await deriveKey(String(password || ""), salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (expected.length !== derived.length || !timingSafeEqual(expected, derived)) throw new Error("INVALID_CREDENTIALS");
    const workspace = [...this.repository.workspaces.values()].find((item) => item.ownerUserId === user.id && item.status !== "DEACTIVATED");
    const membership = workspace && this.repository.findMembership(user.id, workspace.id);
    if (!workspace || !membership) throw new Error("INVALID_CREDENTIALS");
    return { userId: user.id, workspaceId: workspace.id, accessToken: createSessionToken({ userId: user.id, workspaceId: workspace.id }) };
  }
}
