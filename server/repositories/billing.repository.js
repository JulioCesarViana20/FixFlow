export class BillingRepository {
  constructor() {
    this.plans = new Map([
      ["free", { id: "plan_free", code: "free", name: "Free", description: "Para começar com organização", priceCents: 0, interval: "month", limits: { clients: 20, orders: 20, transactions: 20, devices: 3, teamMembers: 1 }, features: ["basic_dashboard"] }],
      ["pro", { id: "plan_pro", code: "pro", name: "Pro", description: "Para empresas que querem crescer com mais controle", priceCents: 4999, interval: "month", limits: { clients: 100, orders: 100, transactions: 100, devices: 10, teamMembers: 3 }, features: ["basic_dashboard", "advanced_dashboard", "reports"] }],
      ["business", { id: "plan_business", code: "business", name: "Business", description: "Para operações com equipe e escala", priceCents: 9999, interval: "month", limits: { clients: -1, orders: -1, transactions: -1, devices: -1, teamMembers: 10 }, features: ["basic_dashboard", "advanced_dashboard", "reports", "team_management", "api_access", "audit_log"] }],
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
