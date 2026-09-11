export function requireAuth(request) {
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
