export class PostgresLegalRepository {
  constructor(pool) {
    this.pool = pool;
    this.users = new Map();
    this.workspaces = new Map();
    this.memberships = new Map();
    this.acceptances = new Map();
    this.auditLogs = [];
    this.pending = Promise.resolve();
  }

  async init() {
    const [users, workspaces, memberships, acceptances] = await Promise.all([
      this.pool.query("SELECT id, name, email, password_hash AS \"passwordHash\", status, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM users"),
      this.pool.query("SELECT id, owner_user_id AS \"ownerUserId\", status, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM workspaces"),
      this.pool.query("SELECT user_id AS \"userId\", workspace_id AS \"workspaceId\", role, created_at AS \"createdAt\" FROM workspace_members"),
      this.pool.query("SELECT id, user_id AS \"userId\", workspace_id AS \"workspaceId\", document_type AS \"documentType\", document_version AS \"documentVersion\", accepted_at AS \"acceptedAt\", ip_address AS \"ipAddress\", user_agent AS \"userAgent\", created_at AS \"createdAt\" FROM legal_acceptances"),
    ]);
    users.rows.forEach((user) => this.users.set(user.id, user));
    workspaces.rows.forEach((workspace) => this.workspaces.set(workspace.id, workspace));
    memberships.rows.forEach((membership) => this.memberships.set(`${membership.userId}:${membership.workspaceId}`, membership));
    acceptances.rows.forEach((acceptance) => this.acceptances.set(acceptance.id, acceptance));
  }

  findUserByEmail(email) { return [...this.users.values()].find((user) => user.email === email); }
  findUser(userId) { return this.users.get(userId); }
  findWorkspace(workspaceId) { return this.workspaces.get(workspaceId); }
  findMembership(userId, workspaceId) { return this.memberships.get(`${userId}:${workspaceId}`); }
  listAcceptances(userId) { return [...this.acceptances.values()].filter((item) => item.userId === userId); }

  deleteUser(userId) {
    this.users.delete(userId);
    for (const [key, membership] of this.memberships) {
      if (membership.userId === userId) this.memberships.delete(key);
    }
    this.enqueue(async () => {
      await this.pool.query("DELETE FROM legal_acceptances WHERE user_id = $1", [userId]);
      await this.pool.query("DELETE FROM workspace_members WHERE user_id = $1", [userId]);
      await this.pool.query("DELETE FROM users WHERE id = $1", [userId]);
    });
  }

  deleteWorkspace(workspaceId) {
    this.workspaces.delete(workspaceId);
    for (const [key, membership] of this.memberships) {
      if (membership.workspaceId === workspaceId) this.memberships.delete(key);
    }
    for (const [id, acceptance] of this.acceptances) {
      if (acceptance.workspaceId === workspaceId) this.acceptances.delete(id);
    }
    this.enqueue(async () => {
      await this.pool.query("DELETE FROM workspace_data WHERE workspace_id = $1", [workspaceId]);
      await this.pool.query("DELETE FROM legal_acceptances WHERE workspace_id = $1", [workspaceId]);
      await this.pool.query("DELETE FROM workspace_members WHERE workspace_id = $1", [workspaceId]);
      await this.pool.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);
    });
  }

  enqueue(operation) { this.pending = this.pending.then(operation); return this.pending; }

  saveUser(user) {
    this.users.set(user.id, user);
    this.enqueue(() => this.pool.query(`INSERT INTO users (id, name, email, password_hash, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`, [user.id, user.name, user.email, user.passwordHash, user.status || "ACTIVE", user.createdAt, user.updatedAt || null]));
    return user;
  }

  saveWorkspace(workspace) {
    this.workspaces.set(workspace.id, workspace);
    this.enqueue(() => this.pool.query(`INSERT INTO workspaces (id, owner_user_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`, [workspace.id, workspace.ownerUserId, workspace.status || "ACTIVE", workspace.createdAt, workspace.updatedAt || null]));
    return workspace;
  }

  saveMembership(membership) {
    this.memberships.set(`${membership.userId}:${membership.workspaceId}`, membership);
    this.enqueue(() => this.pool.query(`INSERT INTO workspace_members (user_id, workspace_id, role, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = EXCLUDED.role`, [membership.userId, membership.workspaceId, membership.role, membership.createdAt || new Date().toISOString()]));
    return membership;
  }

  saveAcceptance(acceptance) {
    this.acceptances.set(acceptance.id, acceptance);
    this.enqueue(() => this.pool.query(`INSERT INTO legal_acceptances (id, user_id, workspace_id, document_type, document_version, accepted_at, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [acceptance.id, acceptance.userId, acceptance.workspaceId, acceptance.documentType, acceptance.documentVersion, acceptance.acceptedAt, acceptance.ipAddress, acceptance.userAgent, acceptance.createdAt]));
    return acceptance;
  }

  saveAudit(entry) {
    this.auditLogs.push(entry);
    this.enqueue(() => this.pool.query("INSERT INTO audit_logs (id, user_id, workspace_id, action, result, created_at) VALUES ($1, $2, $3, $4, $5, $6)", [entry.id, entry.userId, entry.workspaceId, entry.action, entry.result, entry.createdAt]));
    return entry;
  }

  async flush() { await this.pending; }
}
