export function registerAuthRoutes(router, controller) {
  router.post("/api/auth/register", controller.register);
  router.post("/api/auth/login", controller.login);
}
