import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const GATEWAY_NAME = "mercadopago";

export class MercadoPagoService {
  name = GATEWAY_NAME;

  isCheckoutConfigured() {
    return Boolean(env.mercadoPagoAccessToken);
  }

  isConfigured() {
    return this.isCheckoutConfigured();
  }

  isWebhookConfigured() {
    return Boolean(env.mercadoPagoAccessToken && env.mercadoPagoWebhookSecret);
  }

  async createCheckout({ orderNsu, amountCents, planCode }) {
    if (!this.isCheckoutConfigured()) {
      const error = new Error("PAYMENT_GATEWAY_NOT_CONFIGURED");
      error.statusCode = 503;
      throw error;
    }

    const response = await fetch(`${env.mercadoPagoApiUrl}/checkout/preferences`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.mercadoPagoAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: [{
          id: planCode,
          title: `FixFlow ${planCode}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: amountCents / 100,
        }],
        external_reference: orderNsu,
        notification_url: `${env.appUrl}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${env.appUrl}/#/checkout/sucesso`,
          pending: `${env.appUrl}/#/checkout/pendente`,
          failure: `${env.appUrl}/#/checkout/falhou`,
        },
        auto_return: "approved",
      }),
    });

    if (!response.ok) {
      const error = new Error("PAYMENT_GATEWAY_REQUEST_FAILED");
      error.statusCode = 502;
      throw error;
    }
    const result = await response.json();
    if (!result.init_point) {
      const error = new Error("PAYMENT_GATEWAY_INVALID_RESPONSE");
      error.statusCode = 502;
      throw error;
    }
    return { url: result.init_point, gatewayPaymentId: result.id };
  }

  verifyWebhook(request, payload) {
    if (!this.isWebhookConfigured()) return false;
    const signature = request.headers["x-signature"];
    const requestId = request.headers["x-request-id"];
    const paymentId = payload.data?.id || new URL(request.url, "http://localhost").searchParams.get("data.id");
    if (!signature || !requestId || !paymentId) return false;
    const parts = Object.fromEntries(signature.split(",").map((part) => part.split("=")));
    if (!parts.ts || !parts.v1) return false;
    const manifest = `id:${paymentId};request-id:${requestId};ts:${parts.ts};`;
    const expected = createHmac("sha256", env.mercadoPagoWebhookSecret).update(manifest).digest("hex");
    const actual = Buffer.from(parts.v1, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  }

  async normalizeWebhook(payload, requestId = "") {
    const paymentId = payload.data?.id;
    if (payload.type !== "payment" || !paymentId) throw new Error("INVALID_WEBHOOK");
    if (!this.isCheckoutConfigured()) throw new Error("PAYMENT_GATEWAY_NOT_CONFIGURED");

    const response = await fetch(`${env.mercadoPagoApiUrl}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { authorization: `Bearer ${env.mercadoPagoAccessToken}` },
    });
    if (!response.ok) throw new Error("INVALID_WEBHOOK");
    const payment = await response.json();
    if (!payment.external_reference || !Number.isFinite(Number(payment.transaction_amount))) {
      throw new Error("INVALID_WEBHOOK");
    }
    const status = payment.status === "approved" ? "approved" : payment.status === "rejected" ? "failed" : payment.status === "cancelled" ? "canceled" : payment.status === "refunded" || payment.status === "charged_back" ? "refunded" : "pending";
    return {
      eventId: requestId || `payment:${payment.id}:${payment.status}`,
      eventType: payload.action || "payment.updated",
      orderNsu: payment.external_reference,
      transactionNsu: String(payment.id),
      amountCents: Math.round(Number(payment.transaction_amount) * 100),
      status,
    };
  }
}
