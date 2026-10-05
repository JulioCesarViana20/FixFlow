function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 3333),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  mercadoPagoApiUrl: process.env.MERCADO_PAGO_API_URL || "https://api.mercadopago.com",
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || "",
  appUrl: process.env.APP_URL || "http://localhost:4173",
  webhookToleranceDays: Number(process.env.BILLING_GRACE_PERIOD_DAYS || 3),
};

export function requireProductionSecrets() {
  if (env.nodeEnv === "production") {
    required("MERCADO_PAGO_ACCESS_TOKEN");
    required("MERCADO_PAGO_WEBHOOK_SECRET");
  }
}
