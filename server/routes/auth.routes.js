export function registerAuthRoutes(router, controller) {
  router.post("/api/auth/register", controller.register);
}
