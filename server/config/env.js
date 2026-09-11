function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 3333),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  infinitePayApiUrl: process.env.INFINITEPAY_API_URL || "",
  infinitePayApiKey: process.env.INFINITEPAY_API_KEY || "",
  infinitePayWebhookSecret: process.env.INFINITEPAY_WEBHOOK_SECRET || "",
  appUrl: process.env.APP_URL || "http://localhost:4173",
  webhookToleranceDays: Number(process.env.BILLING_GRACE_PERIOD_DAYS || 3),
};

export function requireProductionSecrets() {
  if (env.nodeEnv === "production") {
    required("DATABASE_URL");
    required("INFINITEPAY_API_URL");
    required("INFINITEPAY_API_KEY");
    required("INFINITEPAY_WEBHOOK_SECRET");
  }
}
