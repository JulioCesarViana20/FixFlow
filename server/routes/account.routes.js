export function registerAccountRoutes(router, controller, auth) {
  router.get("/api/account/subscription", auth, controller.subscription);
  router.post("/api/account/subscription/cancel", auth, controller.cancelSubscription);
  router.post("/api/account/export", auth, controller.exportData);
  router.post("/api/account/deactivate", auth, controller.deactivate);
  router.post("/api/account/delete", auth, controller.delete);
}
