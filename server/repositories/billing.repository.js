export class BillingRepository {
  constructor() {
    this.plans = new Map([
      ["free", { id: "plan_free", code: "free", name: "Free", description: "Para começar", priceCents: 0, interval: "month", limits: { clients: 20, orders: 10, equipment: 20, teamMembers: 1 }, features: ["basic_dashboard", "basic_quotes", "basic_finance"] }],
      ["pro", { id: "plan_pro", code: "pro", name: "Pro", description: "Para assistências em crescimento", priceCents: 4999, interval: "month", limits: { clients: -1, orders: -1, equipment: -1, teamMembers: 3 }, features: ["advanced_dashboard", "advanced_quotes", "advanced_finance", "reports", "ai_assistant", "public_tracking", "automations", "custom_branding", "priority_support"] }],
      ["business", { id: "plan_business", code: "business", name: "Business", description: "Para operações com equipe e escala", priceCents: 9999, interval: "month", limits: { clients: -1, orders: -1, equipment: -1, teamMembers: -1 }, features: ["advanced_dashboard", "advanced_quotes", "advanced_finance", "reports", "ai_assistant", "public_tracking", "automations", "custom_branding", "priority_support", "team_management", "api_access", "audit_log"] }],
    ]);
    this.subscriptions = new Map();
    this.payments = new Map();
    this.webhookEvents = new Map();
  }

  findPlan(code) { return this.plans.get(code); }
  listPlans() { return [...this.plans.values()]; }
  findSubscription(workspaceId) { return [...this.subscriptions.values()].find((item) => item.workspaceId === workspaceId); }
  saveSubscription(subscription) { this.subscriptions.set(subscription.id, subscription); return subscription; }
  findPaymentByOrder(orderNsu) { return [...this.payments.values()].find((item) => item.orderNsu === orderNsu); }
  savePayment(payment) { this.payments.set(payment.id, payment); return payment; }
  findEvent(gateway, eventId) { return this.webhookEvents.get(`${gateway}:${eventId}`); }
  saveEvent(event) { this.webhookEvents.set(`${event.gateway}:${event.eventId}`, event); return event; }
  listPayments(workspaceId) { return [...this.payments.values()].filter((item) => item.workspaceId === workspaceId); }
  deleteWorkspace(workspaceId) { for (const [id, item] of this.subscriptions) if (item.workspaceId === workspaceId) this.subscriptions.delete(id); for (const [id, item] of this.payments) if (item.workspaceId === workspaceId) this.payments.delete(id); }
}
