import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

function loadDotEnv() {
  const filePath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");

  try {
    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const equalsIndex = trimmed.indexOf("=");
      const key = trimmed.slice(0, equalsIndex).trim();
      if (!key || process.env[key]) continue;

      let value = trimmed.slice(equalsIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch {
    // `.env` is optional; production deployments can inject env vars directly.
  }
}

loadDotEnv();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 3000),
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
