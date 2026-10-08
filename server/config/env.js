import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

function loadDotEnv() {
  // No Render, as variáveis devem vir do painel do serviço. Nunca sobrescreva
  // configuração de produção com um .env local acidentalmente publicado.
  if (isProduction) return;

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
    // .env é opcional; produção usa as variáveis configuradas no provedor.
  }
}

function parsePort(value) {
  const port = Number(value || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }
  return port;
}

function parsePositiveNumber(value, fallback) {
  const number = Number(value || fallback);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

loadDotEnv();

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL?.trim() || "",
  appUrl: process.env.APP_URL?.trim()
    || process.env.RENDER_EXTERNAL_URL?.trim()
    || (isProduction ? "" : "http://localhost:4173"),
  mercadoPagoApiUrl: process.env.MERCADO_PAGO_API_URL?.trim() || "https://api.mercadopago.com",
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || "",
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim() || "",
  webhookToleranceDays: parsePositiveNumber(process.env.BILLING_GRACE_PERIOD_DAYS, 3),
  lifetimeBusinessEmail: process.env.LIFETIME_BUSINESS_EMAIL?.trim().toLowerCase() || "",
  sessionSecret: process.env.SESSION_SECRET?.trim() || "",
});

export function validateRuntimeConfiguration() {
  if (!env.isProduction) return;

  if (!env.sessionSecret || env.sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters in production");
  }

  if (!env.appUrl) {
    throw new Error("APP_URL is required in production (for example: https://fixflow.onrender.com)");
  }

  let parsedAppUrl;
  try {
    parsedAppUrl = new URL(env.appUrl);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL");
  }

  if (!['http:', 'https:'].includes(parsedAppUrl.protocol)) {
    throw new Error("APP_URL must use http or https");
  }

  if (!env.mercadoPagoAccessToken || !env.mercadoPagoWebhookSecret) {
    console.warn("Mercado Pago ainda não está configurado; checkout e webhook permanecerão indisponíveis.");
  }
}
