export function createBillingController(paymentService, repository, gateway, subscriptionService) {
  return {
    async checkout(request) {
      const body = await request.json();
      return paymentService.startCheckout({ ...request.auth, planCode: body.planId });
    },
    plans() {
      return repository.listPlans().map(({ id, code, name, description, priceCents, interval, limits, features }) => ({ id, code, name, description, priceCents, interval, limits, features }));
    },
    subscription(request) {
      const subscription = repository.findSubscription(request.auth.workspaceId);
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
      return paymentService.verifyAndHandleWebhook(payload, gateway.verifyWebhook(request, payload));
    },
  };
}
