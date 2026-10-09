const MAX_WORKSPACE_BYTES = 2 * 1024 * 1024;

export class WorkspaceService {
  constructor(repository, pool = null) {
    this.repository = repository;
    this.pool = pool;
    this.memory = new Map();
  }

  assertAccess(auth) {
    const membership = this.repository.findMembership(auth.userId, auth.workspaceId);
    const workspace = this.repository.findWorkspace(auth.workspaceId);
    if (!membership || !workspace || ["DELETED", "DEACTIVATED"].includes(workspace.status)) {
      const error = new Error("WORKSPACE_NOT_FOUND");
      error.statusCode = 404;
      throw error;
    }
    return workspace;
  }

  async read(auth) {
    this.assertAccess(auth);
    if (this.pool) {
      const result = await this.pool.query("SELECT data, version, updated_at AS \"updatedAt\" FROM workspace_data WHERE workspace_id = $1", [auth.workspaceId]);
      return result.rows[0] || { data: {}, version: 0, updatedAt: null };
    }
    return this.memory.get(auth.workspaceId) || { data: {}, version: 0, updatedAt: null };
  }

  async write(auth, data, expectedVersion = null) {
    this.assertAccess(auth);
    const serialized = JSON.stringify(data || {});
    if (Buffer.byteLength(serialized, "utf8") > MAX_WORKSPACE_BYTES) {
      const error = new Error("WORKSPACE_DATA_TOO_LARGE");
      error.statusCode = 413;
      throw error;
    }
    if (this.pool) {
      const result = await this.pool.query(`
        INSERT INTO workspace_data (workspace_id, data, version, updated_at)
        VALUES ($1, $2::jsonb, 1, now())
        ON CONFLICT (workspace_id) DO UPDATE
          SET data = EXCLUDED.data, version = workspace_data.version + 1, updated_at = now()
        WHERE $3::bigint IS NULL OR workspace_data.version = $3
        RETURNING data, version, updated_at AS "updatedAt"`, [auth.workspaceId, serialized, expectedVersion]);
      if (!result.rows[0]) {
        const error = new Error("WORKSPACE_VERSION_CONFLICT");
        error.statusCode = 409;
        throw error;
      }
      return result.rows[0];
    }
    const current = this.memory.get(auth.workspaceId) || { version: 0 };
    if (expectedVersion !== null && Number(expectedVersion) !== current.version) {
      const error = new Error("WORKSPACE_VERSION_CONFLICT");
      error.statusCode = 409;
      throw error;
    }
    const result = { data, version: current.version + 1, updatedAt: new Date().toISOString() };
    this.memory.set(auth.workspaceId, result);
    return result;
  }
}
