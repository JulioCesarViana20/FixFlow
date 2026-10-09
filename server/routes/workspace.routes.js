export function registerWorkspaceRoutes(router, controller, auth) {
  router.get("/api/workspace", auth, controller.read);
  router.post("/api/workspace", auth, controller.write);
}
