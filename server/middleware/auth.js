import { bearerToken, verifySessionToken } from "../services/session-token.service.js";
import { env } from "../config/env.js";

export function requireAuth(request, repository = null) {
  const token = bearerToken(request);
  if (token) {
    try {
      const claims = verifySessionToken(token);
      if (repository) {
        const user = repository.findUser?.(claims.userId);
        const workspace = repository.findWorkspace?.(claims.workspaceId);
        const membership = repository.findMembership?.(claims.userId, claims.workspaceId);
        if (!user || ["DEACTIVATED", "DELETED"].includes(user.status)
          || !workspace || ["DEACTIVATED", "DELETED", "DELETION_PROCESSING"].includes(workspace.status)
          || !membership) throw new Error("UNAUTHORIZED");
      }
      return claims;
    } catch {
      const error = new Error("UNAUTHORIZED");
      error.statusCode = 401;
      throw error;
    }
  }
  if (env.isProduction) {
    const error = new Error("UNAUTHORIZED");
    error.statusCode = 401;
    throw error;
  }
  const workspaceId = request.headers["x-workspace-id"];
  const userId = request.headers["x-user-id"];
  if (!workspaceId || !userId) {
    const error = new Error("UNAUTHORIZED");
    error.statusCode = 401;
    throw error;
  }
  return { workspaceId, userId };
}

export function requireFeature(subscriptionService, feature) {
  return ({ workspaceId }) => {
    if (!subscriptionService.getAccess(workspaceId, feature)) {
      const error = new Error("FEATURE_REQUIRES_UPGRADE");
      error.statusCode = 403;
      throw error;
    }
  };
}
