import { env } from "../config/env.js";

export class InfinitePayService {
  isConfigured() {
    return Boolean(env.infinitePayApiUrl && env.infinitePayApiKey);
  }

  async createCheckout() {
    if (!this.isConfigured()) {
      const error = new Error("PAYMENT_GATEWAY_NOT_CONFIGURED");
      error.statusCode = 503;
      throw error;
    }

    // O contrato exato da InfinitePay deve ser preenchido após acesso à API oficial.
    throw new Error("INFINITEPAY_CHECKOUT_CONTRACT_REQUIRED");
  }

  verifyWebhook() {
    if (!env.infinitePayWebhookSecret) return false;
    // A verificação precisa usar o mecanismo de assinatura documentado pela InfinitePay.
    return false;
  }
}
