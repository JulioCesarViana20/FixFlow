export class SubscriptionService {
  constructor(repository, { lifetimeBusinessEmail = "" } = {}) { this.repository = repository; this.lifetimeBusinessEmail = lifetimeBusinessEmail; }

  provisionLifetimeBusinessForUser(user, workspaceId) {
    if (!this.lifetimeBusinessEmail || user.email !== this.lifetimeBusinessEmail) return null;
    const existing = this.repository.findEntitlement(workspaceId);
    if (existing) return existing;
    return this.repository.saveEntitlement({ id: crypto.randomUUID(), userId: user.id, workspaceId, planCode: "business", status: "active", subscriptionType: "lifetime", expiresAt: null, grantedBy: "LIFETIME_BUSINESS_EMAIL" });
  }

  lifetimeEntitlement(workspaceId, now = new Date()) {
    const entitlement = this.repository.findEntitlement?.(workspaceId);
    if (!entitlement || (entitlement.expiresAt && new Date(entitlement.expiresAt) <= now)) return null;
    return entitlement;
  }

  getPlan(code) {
    const plan = this.repository.findPlan(code);
    if (!plan || plan.active === false) throw new Error("PLAN_NOT_FOUND");
    return plan;
  }

  getPlanById(id) { return [...this.repository.plans.values()].find((plan) => plan.id === id); }

  getAccess(workspaceId, feature) {
    const subscription = this.repository.findSubscription(workspaceId);
    const entitlement = this.lifetimeEntitlement(workspaceId);
    if (entitlement) return this.getPlan(entitlement.planCode).features.includes(feature);
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
    if (this.lifetimeEntitlement(workspaceId)) return true;
    const subscription = this.repository.findSubscription(workspaceId);
    const plan = subscription && ["trialing", "active"].includes(subscription.status) ? subscription.plan : this.getPlan("free");
    const limit = plan.limits?.[resource];
    return limit === undefined || limit === -1 || Number(currentCount) < limit;
  }

  getLimit(workspaceId, resource) {
    if (this.lifetimeEntitlement(workspaceId)) return this.getPlan("business").limits?.[resource];
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
