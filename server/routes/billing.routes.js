export function registerBillingRoutes(router, controller, auth) {
  router.get("/api/billing/plans", controller.plans);
  router.post("/api/billing/checkout", auth, controller.checkout);
  router.get("/api/billing/subscription", auth, controller.subscription);
  router.get("/api/billing/payments", auth, controller.payments);
  router.post("/api/billing/cancel", auth, controller.cancel);
  router.post("/api/webhooks/infinitepay", controller.webhook);
}
