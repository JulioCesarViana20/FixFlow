export class PaymentService {
  constructor(repository, subscriptionService, gateway) {
    this.repository = repository;
    this.subscriptionService = subscriptionService;
    this.gateway = gateway;
  }

  async startCheckout({ workspaceId, userId, planCode }) {
    const plan = this.subscriptionService.getPlan(planCode);
    if (plan.code === "free") throw new Error("FREE_PLAN_DOES_NOT_REQUIRE_CHECKOUT");
    const current = this.repository.findSubscription(workspaceId);
    if (current?.plan?.code === plan.code && ["trialing", "active", "past_due"].includes(current.status)) throw new Error("ALREADY_ON_PLAN");
    const existing = this.repository.listPayments(workspaceId).find((payment) => payment.planId === plan.id && payment.status === "pending");
    if (existing) return { paymentId: existing.id, orderNsu: existing.orderNsu, checkoutUrl: existing.checkoutUrl };
    const orderNsu = `fixflow_${crypto.randomUUID()}`;
    const payment = this.repository.savePayment({
      id: crypto.randomUUID(), workspaceId, userId, planId: plan.id,
      gateway: "infinitepay", orderNsu, amountCents: plan.priceCents,
      status: "pending", createdAt: new Date().toISOString(),
    });
    try {
      const checkout = await this.gateway.createCheckout({ orderNsu, amountCents: plan.priceCents, planCode: plan.code });
      payment.checkoutUrl = checkout.url;
      this.repository.savePayment(payment);
      return { paymentId: payment.id, orderNsu, checkoutUrl: checkout.url };
    } catch (error) {
      payment.status = "canceled";
      this.repository.savePayment(payment);
      throw error;
    }
  }

  handleWebhook(payload) {
    const { eventId, eventType, orderNsu, transactionNsu, status, amountCents } = payload;
    if (!eventId || !eventType || !orderNsu) throw new Error("INVALID_WEBHOOK");
    const existing = this.repository.findEvent("infinitepay", eventId);
    if (existing?.processed) return { duplicate: true };
    this.repository.saveEvent({ gateway: "infinitepay", eventId, eventType, payload, processed: false });
    const payment = this.repository.findPaymentByOrder(orderNsu);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (Number(amountCents) !== payment.amountCents) throw new Error("PAYMENT_AMOUNT_MISMATCH");
    if (payment.status === "approved") return { duplicate: true };
    if (status !== "approved") {
      payment.status = status === "failed" ? "failed" : "canceled";
      this.repository.savePayment(payment);
      return { approved: false };
    }
    payment.transactionNsu = transactionNsu;
    const plan = this.subscriptionService.getPlanById?.(payment.planId) || [...this.repository.plans.values()].find((item) => item.id === payment.planId);
    if (!plan) throw new Error("PLAN_NOT_FOUND");
    this.subscriptionService.activateFromPayment(payment, plan);
    this.repository.savePayment(payment);
    const event = this.repository.findEvent("infinitepay", eventId);
    event.processed = true;
    event.processedAt = new Date().toISOString();
    this.repository.saveEvent(event);
    return { approved: true, subscription: this.repository.findSubscription(payment.workspaceId) };
  }

  verifyAndHandleWebhook(payload, verified) {
    if (!verified) throw new Error("INVALID_WEBHOOK");
    return this.handleWebhook(payload);
  }
}
