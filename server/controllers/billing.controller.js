export function createBillingController(paymentService, repository, gateway, subscriptionService) {
  return {
    async checkout(request) {
      const body = await request.json();
      return paymentService.startCheckout({ ...request.auth, planCode: body.planId, couponCode: body.couponCode });
    },
    plans() {
      return repository.listPlans().map(({ id, code, name, description, priceCents, interval, limits, features }) => ({ id, code, name, description, priceCents, interval, limits, features }));
    },
    subscription(request) {
      const subscription = repository.findSubscription(request.auth.workspaceId);
      const entitlement = subscriptionService.lifetimeEntitlement(request.auth.workspaceId);
      if (entitlement) return { status: "active", plan: entitlement.planCode, subscriptionType: entitlement.subscriptionType, currentPeriodEnd: null };
      if (!subscription) return { status: "free", plan: "free" };
      return { id: subscription.id, status: subscription.status, plan: subscription.plan.code, currentPeriodStart: subscription.currentPeriodStart, currentPeriodEnd: subscription.currentPeriodEnd, canceledAt: subscription.canceledAt || null };
    },
    payments(request) {
      return repository.listPayments(request.auth.workspaceId).map(({ id, planId, amountCents, status, paidAt, createdAt }) => ({ id, planId, amountCents, status, paidAt, createdAt }));
    },
    cancel(request) {
      return subscriptionService.cancel(request.auth.workspaceId);
    },
    async webhook(request) {
      const payload = await request.json();
      const verified = gateway.verifyWebhook(request, payload);
      if (!verified) return paymentService.verifyAndHandleWebhook(payload, false);
      return paymentService.verifyAndHandleWebhook(await gateway.normalizeWebhook(payload, request.headers["x-request-id"]), true);
    },
  };
}
