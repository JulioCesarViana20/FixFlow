export class LegalRepository {
  constructor() {
    this.users = new Map();
    this.workspaces = new Map();
    this.memberships = new Map();
    this.acceptances = new Map();
    this.auditLogs = [];
  }

  findUserByEmail(email) { return [...this.users.values()].find((user) => user.email === email); }
  findUser(userId) { return this.users.get(userId); }
  saveUser(user) { this.users.set(user.id, user); return user; }
  saveWorkspace(workspace) { this.workspaces.set(workspace.id, workspace); return workspace; }
  findWorkspace(workspaceId) { return this.workspaces.get(workspaceId); }
  saveMembership(membership) { this.memberships.set(`${membership.userId}:${membership.workspaceId}`, membership); return membership; }
  findMembership(userId, workspaceId) { return this.memberships.get(`${userId}:${workspaceId}`); }
  deleteWorkspace(workspaceId) { this.workspaces.delete(workspaceId); for (const [key, membership] of this.memberships) if (membership.workspaceId === workspaceId) this.memberships.delete(key); }
  saveAudit(entry) { this.auditLogs.push(entry); return entry; }
  saveAcceptance(acceptance) { this.acceptances.set(acceptance.id, acceptance); return acceptance; }
  listAcceptances(userId) { return [...this.acceptances.values()].filter((acceptance) => acceptance.userId === userId); }
}
