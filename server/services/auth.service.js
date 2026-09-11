import { promisify } from "node:util";
import { randomBytes, scrypt } from "node:crypto";

const deriveKey = promisify(scrypt);

export class AuthService {
  constructor(repository, consentService) { this.repository = repository; this.consentService = consentService; }

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
    return { userId: user.id, workspaceId };
  }
}
