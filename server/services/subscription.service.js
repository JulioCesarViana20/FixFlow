export class SubscriptionService {
  constructor(repository) { this.repository = repository; }

  getPlan(code) {
    const plan = this.repository.findPlan(code);
    if (!plan || plan.active === false) throw new Error("PLAN_NOT_FOUND");
    return plan;
  }

  getAccess(workspaceId, feature) {
    const subscription = this.repository.findSubscription(workspaceId);
    const active = subscription && ["trialing", "active", "cancel_at_period_end"].includes(subscription.status);
    const plan = active ? subscription.plan : this.getPlan("free");
    if (!active) return plan.features.includes(feature);
    if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date()) return false;
    return plan.features.includes(feature);
  }

  canUseFeature(workspaceId, feature) {
    return this.getAccess(workspaceId, feature);
  }

  canCreate(workspaceId, resource, currentCount) {
    const subscription = this.repository.findSubscription(workspaceId);
    const plan = subscription && ["trialing", "active"].includes(subscription.status) ? subscription.plan : this.getPlan("free");
    const limit = plan.limits?.[resource];
    return limit === undefined || limit === -1 || Number(currentCount) < limit;
  }

  getLimit(workspaceId, resource) {
    const subscription = this.repository.findSubscription(workspaceId);
    const plan = subscription && ["trialing", "active"].includes(subscription.status) ? subscription.plan : this.getPlan("free");
    return plan.limits?.[resource];
  }

  expireIfNeeded(workspaceId, now = new Date()) {
    const subscription = this.repository.findSubscription(workspaceId);
    if (!subscription || !subscription.currentPeriodEnd) return null;
    if (new Date(subscription.currentPeriodEnd) >= now) return subscription;
    subscription.status = "expired";
    subscription.updatedAt = now.toISOString();
    return this.repository.saveSubscription(subscription);
  }

  cancel(workspaceId, now = new Date()) {
    const subscription = this.repository.findSubscription(workspaceId);
    if (!subscription) throw new Error("SUBSCRIPTION_NOT_FOUND");
    if (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) <= now) {
      subscription.status = "expired";
      subscription.updatedAt = now.toISOString();
      return this.repository.saveSubscription(subscription);
    }
    subscription.status = "cancel_at_period_end";
    subscription.canceledAt = now.toISOString();
    subscription.autoRenew = false;
    subscription.updatedAt = now.toISOString();
    return this.repository.saveSubscription(subscription);
  }

  activateFromPayment(payment, plan) {
    const start = new Date();
    const current = this.repository.findSubscription(payment.workspaceId);
    const base = current?.currentPeriodEnd && new Date(current.currentPeriodEnd) > start ? new Date(current.currentPeriodEnd) : start;
    const end = new Date(base);
    if (plan.interval === "month") end.setMonth(end.getMonth() + 1);
    if (plan.interval === "year") end.setFullYear(end.getFullYear() + 1);
    const subscription = this.repository.saveSubscription({
      id: current?.id || crypto.randomUUID(), workspaceId: payment.workspaceId, userId: payment.userId,
      planId: plan.id, plan, status: "active", gateway: payment.gateway,
      currentPeriodStart: base.toISOString(), currentPeriodEnd: end.toISOString(), updatedAt: new Date().toISOString(),
    });
    payment.subscriptionId = subscription.id;
    payment.status = "approved";
    payment.paidAt = new Date().toISOString();
    return subscription;
  }
}
