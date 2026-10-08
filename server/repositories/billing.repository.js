export class BillingRepository {
  constructor(pool = null) {
    this.pool = pool;
    this.pending = Promise.resolve();
    this.plans = new Map([
      ["free", { id: "plan_free", code: "free", name: "Free", description: "Para começar com organização", priceCents: 0, interval: "month", limits: { clients: 20, orders: 20, transactions: 20, devices: 3, teamMembers: 1 }, features: ["basic_dashboard"] }],
      ["pro", { id: "plan_pro", code: "pro", name: "Pro", description: "Para empresas que querem crescer com mais controle", priceCents: 4999, interval: "month", limits: { clients: 100, orders: 100, transactions: 100, devices: 10, teamMembers: 3 }, features: ["basic_dashboard", "advanced_dashboard", "reports"] }],
      ["business", { id: "plan_business", code: "business", name: "Business", description: "Para operações com equipe e escala", priceCents: 9999, interval: "month", limits: { clients: -1, orders: -1, transactions: -1, devices: -1, teamMembers: 10 }, features: ["basic_dashboard", "advanced_dashboard", "reports", "team_management", "api_access", "audit_log"] }],
    ]);
    this.subscriptions = new Map();
    this.payments = new Map();
    this.webhookEvents = new Map();
    this.coupons = new Map();
    this.couponRedemptions = new Map();
    this.entitlements = new Map();
  }

  async init() {
    if (!this.pool) return;
    const [plans, subscriptions, payments, events, coupons, redemptions, entitlements] = await Promise.all([
      this.pool.query('SELECT id, code, name, description, price_cents AS "priceCents", billing_interval AS "interval", limits, features, active FROM plans'),
      this.pool.query('SELECT id, workspace_id AS "workspaceId", user_id AS "userId", plan_id AS "planId", status, gateway, current_period_start AS "currentPeriodStart", current_period_end AS "currentPeriodEnd", canceled_at AS "canceledAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM subscriptions'),
      this.pool.query('SELECT id, workspace_id AS "workspaceId", user_id AS "userId", subscription_id AS "subscriptionId", plan_id AS "planId", gateway, order_nsu AS "orderNsu", transaction_nsu AS "transactionNsu", amount_cents AS "amountCents", status, paid_at AS "paidAt", created_at AS "createdAt", updated_at AS "updatedAt", coupon_code AS "couponCode", discount_cents AS "discountCents" FROM payments'),
      this.pool.query('SELECT gateway, event_id AS "eventId", event_type AS "eventType", payload, processed, processed_at AS "processedAt" FROM webhook_events'),
      this.pool.query('SELECT id, code, discount_percent AS "discountPercent", active, expires_at AS "expiresAt", max_uses AS "maxUses", usage_count AS "usageCount", plan_code AS "planCode" FROM coupons'),
      this.pool.query('SELECT id, coupon_id AS "couponId", user_id AS "userId", workspace_id AS "workspaceId", payment_id AS "paymentId", discount_percent AS "discountPercent", discount_cents AS "discountCents" FROM coupon_redemptions'),
      this.pool.query('SELECT id, user_id AS "userId", workspace_id AS "workspaceId", plan_code AS "planCode", status, subscription_type AS "subscriptionType", expires_at AS "expiresAt", granted_by AS "grantedBy" FROM entitlements'),
    ]);
    plans.rows.forEach((plan) => this.plans.set(plan.code, plan));
    subscriptions.rows.forEach((item) => { item.plan = this.plans.get(item.planId) || this.plans.get(item.planCode); this.subscriptions.set(item.id, item); });
    payments.rows.forEach((item) => this.payments.set(item.id, item));
    events.rows.forEach((item) => this.webhookEvents.set(`${item.gateway}:${item.eventId}`, item));
    coupons.rows.forEach((item) => this.coupons.set(item.code, item));
    redemptions.rows.forEach((item) => this.couponRedemptions.set(`${item.couponId}:${item.userId}:${item.workspaceId}`, item));
    entitlements.rows.forEach((item) => this.entitlements.set(item.id, item));
  }

  enqueue(operation) { this.pending = this.pending.then(operation); return this.pending; }

  findPlan(code) { return this.plans.get(code); }
  listPlans() { return [...this.plans.values()]; }
  findSubscription(workspaceId) { return [...this.subscriptions.values()].find((item) => item.workspaceId === workspaceId); }
  saveSubscription(subscription) { this.subscriptions.set(subscription.id, subscription); if (this.pool) this.enqueue(() => this.pool.query(`INSERT INTO subscriptions (id, workspace_id, user_id, plan_id, status, gateway, current_period_start, current_period_end, canceled_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status=EXCLUDED.status,gateway=EXCLUDED.gateway,current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,canceled_at=EXCLUDED.canceled_at,updated_at=EXCLUDED.updated_at`, [subscription.id, subscription.workspaceId, subscription.userId, subscription.planId, subscription.status, subscription.gateway, subscription.currentPeriodStart || null, subscription.currentPeriodEnd || null, subscription.canceledAt || null, subscription.createdAt || new Date().toISOString(), subscription.updatedAt || new Date().toISOString()])); return subscription; }
  findPaymentByOrder(orderNsu) { return [...this.payments.values()].find((item) => item.orderNsu === orderNsu); }
  savePayment(payment) { this.payments.set(payment.id, payment); if (this.pool) this.enqueue(() => this.pool.query(`INSERT INTO payments (id, workspace_id, user_id, subscription_id, plan_id, gateway, order_nsu, transaction_nsu, amount_cents, status, paid_at, created_at, updated_at, coupon_code, discount_cents) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO UPDATE SET subscription_id=EXCLUDED.subscription_id,transaction_nsu=EXCLUDED.transaction_nsu,amount_cents=EXCLUDED.amount_cents,status=EXCLUDED.status,paid_at=EXCLUDED.paid_at,updated_at=EXCLUDED.updated_at,coupon_code=EXCLUDED.coupon_code,discount_cents=EXCLUDED.discount_cents`, [payment.id, payment.workspaceId, payment.userId, payment.subscriptionId || null, payment.planId, payment.gateway, payment.orderNsu, payment.transactionNsu || null, payment.amountCents, payment.status, payment.paidAt || null, payment.createdAt, payment.updatedAt || new Date().toISOString(), payment.couponCode || null, payment.discountCents || 0])); return payment; }
  findEvent(gateway, eventId) { return this.webhookEvents.get(`${gateway}:${eventId}`); }
  saveEvent(event) { this.webhookEvents.set(`${event.gateway}:${event.eventId}`, event); if (this.pool) this.enqueue(() => this.pool.query(`INSERT INTO webhook_events (id, gateway, event_id, event_type, payload, processed, processed_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6) ON CONFLICT (gateway,event_id) DO UPDATE SET processed=EXCLUDED.processed,processed_at=EXCLUDED.processed_at`, [event.gateway, event.eventId, event.eventType, event.payload, event.processed, event.processedAt || null])); return event; }
  listPayments(workspaceId) { return [...this.payments.values()].filter((item) => item.workspaceId === workspaceId); }
  findCoupon(code) { return this.coupons.get(String(code || "").trim().toUpperCase()); }
  saveCoupon(coupon) { coupon.code = coupon.code.toUpperCase(); this.coupons.set(coupon.code, coupon); if (this.pool) this.enqueue(() => this.pool.query(`INSERT INTO coupons (id,code,discount_percent,active,expires_at,max_uses,usage_count,plan_code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (code) DO UPDATE SET active=EXCLUDED.active,discount_percent=EXCLUDED.discount_percent,expires_at=EXCLUDED.expires_at,max_uses=EXCLUDED.max_uses,usage_count=EXCLUDED.usage_count,plan_code=EXCLUDED.plan_code`, [coupon.id, coupon.code, coupon.discountPercent, coupon.active !== false, coupon.expiresAt || null, coupon.maxUses || null, coupon.usageCount || 0, coupon.planCode || null])); return coupon; }
  findRedemption(couponId, userId, workspaceId) { return this.couponRedemptions.get(`${couponId}:${userId}:${workspaceId}`); }
  saveRedemption(redemption) { this.couponRedemptions.set(`${redemption.couponId}:${redemption.userId}:${redemption.workspaceId}`, redemption); if (this.pool) this.enqueue(() => this.pool.query(`INSERT INTO coupon_redemptions (id,coupon_id,user_id,workspace_id,payment_id,discount_percent,discount_cents) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (coupon_id,user_id,workspace_id) DO NOTHING`, [redemption.id, redemption.couponId, redemption.userId, redemption.workspaceId, redemption.paymentId || null, redemption.discountPercent, redemption.discountCents])); return redemption; }
  findEntitlement(workspaceId) { return [...this.entitlements.values()].find((item) => item.workspaceId === workspaceId && item.status === "active"); }
  saveEntitlement(entitlement) { this.entitlements.set(entitlement.id, entitlement); if (this.pool) this.enqueue(() => this.pool.query(`INSERT INTO entitlements (id,user_id,workspace_id,plan_code,status,subscription_type,expires_at,granted_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,expires_at=EXCLUDED.expires_at,updated_at=now()`, [entitlement.id, entitlement.userId, entitlement.workspaceId, entitlement.planCode, entitlement.status, entitlement.subscriptionType, entitlement.expiresAt || null, entitlement.grantedBy || null])); return entitlement; }
  deleteWorkspace(workspaceId) { for (const [id, item] of this.subscriptions) if (item.workspaceId === workspaceId) this.subscriptions.delete(id); for (const [id, item] of this.payments) if (item.workspaceId === workspaceId) this.payments.delete(id); for (const [id, item] of this.entitlements) if (item.workspaceId === workspaceId) this.entitlements.delete(id); }
  async flush() { await this.pending; }
}
