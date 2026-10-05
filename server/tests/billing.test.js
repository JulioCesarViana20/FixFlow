import test from "node:test";
import assert from "node:assert/strict";
import { BillingRepository } from "../repositories/billing.repository.js";
import { PaymentService } from "../services/payment.service.js";
import { SubscriptionService } from "../services/subscription.service.js";

function setup() {
  const repository = new BillingRepository();
  const subscriptions = new SubscriptionService(repository);
  const gateway = { createCheckout: async ({ orderNsu }) => ({ url: `https://checkout.test/${orderNsu}` }) };
  return { repository, subscriptions, payments: new PaymentService(repository, subscriptions, gateway) };
}

async function pendingPayment(context) {
  const result = await context.payments.startCheckout({ workspaceId: "workspace-a", userId: "user-a", planCode: "pro" });
  return context.repository.findPaymentByOrder(result.orderNsu);
}

test("checkout usa o preço oficial do plano", async () => {
  const context = setup();
  const payment = await pendingPayment(context);
  assert.equal(payment.amountCents, 4999);
});

test("valor adulterado é rejeitado", async () => {
  const context = setup();
  const payment = await pendingPayment(context);
  assert.throws(() => context.payments.verifyAndHandleWebhook({ eventId: "evt-1", eventType: "paid", orderNsu: payment.orderNsu, amountCents: 1, status: "approved" }, true), /PAYMENT_AMOUNT_MISMATCH/);
});

test("pedido inexistente é rejeitado", () => {
  const context = setup();
  assert.throws(() => context.payments.verifyAndHandleWebhook({ eventId: "evt-2", eventType: "paid", orderNsu: "missing", amountCents: 7900, status: "approved" }, true), /PAYMENT_NOT_FOUND/);
});

test("evento duplicado não renova duas vezes", async () => {
  const context = setup();
  const payment = await pendingPayment(context);
  const payload = { eventId: "evt-3", eventType: "paid", orderNsu: payment.orderNsu, transactionNsu: "tx-1", amountCents: 4999, status: "approved" };
  const first = context.payments.verifyAndHandleWebhook(payload, true);
  const second = context.payments.verifyAndHandleWebhook(payload, true);
  assert.equal(first.approved, true);
  assert.equal(second.duplicate, true);
  assert.equal(context.repository.listPayments("workspace-a").length, 1);
});

test("pagamento pendente pode ser aprovado em uma notificação posterior", async () => {
  const context = setup();
  const payment = await pendingPayment(context);
  context.payments.verifyAndHandleWebhook({ eventId: "evt-pending", eventType: "payment.updated", orderNsu: payment.orderNsu, amountCents: 4999, status: "pending" }, true);
  assert.equal(context.repository.findPaymentByOrder(payment.orderNsu).status, "pending");
  const result = context.payments.verifyAndHandleWebhook({ eventId: "evt-approved", eventType: "payment.updated", orderNsu: payment.orderNsu, amountCents: 4999, status: "approved" }, true);
  assert.equal(result.approved, true);
});

test("renovação parte do período vigente", async () => {
  const context = setup();
  const first = await pendingPayment(context);
  context.payments.verifyAndHandleWebhook({ eventId: "evt-4", eventType: "paid", orderNsu: first.orderNsu, amountCents: 4999, status: "approved" }, true);
  const before = context.repository.findSubscription("workspace-a").currentPeriodEnd;
  context.repository.findSubscription("workspace-a").status = "expired";
  const second = await pendingPayment(context);
  context.payments.verifyAndHandleWebhook({ eventId: "evt-5", eventType: "paid", orderNsu: second.orderNsu, amountCents: 4999, status: "approved" }, true);
  assert.ok(new Date(context.repository.findSubscription("workspace-a").currentPeriodEnd) > new Date(before));
});

test("recurso pago é bloqueado sem assinatura ativa", () => {
  const context = setup();
  assert.equal(context.subscriptions.getAccess("workspace-a", "ai_assistant"), false);
});

test("Business usa preço oficial e libera recursos de equipe", async () => {
  const context = setup();
  const result = await context.payments.startCheckout({ workspaceId: "workspace-b", userId: "user-b", planCode: "business" });
  const payment = context.repository.findPaymentByOrder(result.orderNsu);
  assert.equal(payment.amountCents, 9999);
  context.payments.verifyAndHandleWebhook({ eventId: "evt-business", eventType: "paid", orderNsu: payment.orderNsu, amountCents: 9999, status: "approved" }, true);
  assert.equal(context.subscriptions.getAccess("workspace-b", "team_management"), true);
  assert.equal(context.subscriptions.getAccess("workspace-b", "api_access"), true);
});

test("limite de equipe varia por plano", async () => {
  const context = setup();
  assert.equal(context.subscriptions.canCreate("workspace-a", "teamMembers", 1), false);
  assert.equal(context.subscriptions.canCreate("workspace-a", "teamMembers", 0), true);
  const result = await context.payments.startCheckout({ workspaceId: "workspace-c", userId: "user-c", planCode: "business" });
  const payment = context.repository.findPaymentByOrder(result.orderNsu);
  context.payments.verifyAndHandleWebhook({ eventId: "evt-team", eventType: "paid", orderNsu: payment.orderNsu, amountCents: 9999, status: "approved" }, true);
  assert.equal(context.subscriptions.canCreate("workspace-c", "teamMembers", 10), false);
  assert.equal(context.subscriptions.canCreate("workspace-c", "teamMembers", 9), true);
});

test("limites de registros seguem o catálogo do plano", async () => {
  const context = setup();
  assert.equal(context.subscriptions.canCreate("workspace-a", "orders", 19), true);
  assert.equal(context.subscriptions.canCreate("workspace-a", "orders", 20), false);
  assert.equal(context.subscriptions.canCreate("workspace-a", "clients", 20), false);
  assert.equal(context.subscriptions.canCreate("workspace-a", "transactions", 20), false);
  const result = await context.payments.startCheckout({ workspaceId: "workspace-pro", userId: "user-pro", planCode: "pro" });
  const payment = context.repository.findPaymentByOrder(result.orderNsu);
  context.payments.verifyAndHandleWebhook({ eventId: "evt-pro-limits", eventType: "payment.updated", orderNsu: payment.orderNsu, amountCents: 4999, status: "approved" }, true);
  assert.equal(context.subscriptions.canCreate("workspace-pro", "orders", 99), true);
  assert.equal(context.subscriptions.canCreate("workspace-pro", "orders", 100), false);
  assert.equal(context.subscriptions.canCreate("workspace-pro", "clients", 99), true);
  assert.equal(context.subscriptions.canCreate("workspace-pro", "clients", 100), false);
  assert.equal(context.subscriptions.canCreate("workspace-pro", "transactions", 99), true);
  assert.equal(context.subscriptions.canCreate("workspace-pro", "transactions", 100), false);
});
