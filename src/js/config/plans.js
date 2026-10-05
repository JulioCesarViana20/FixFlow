import { formatCurrency } from "../utils/format.js";

export const PLAN_CODES = Object.freeze({
  FREE: "free",
  PRO: "pro",
  BUSINESS: "business",
});

export const RESOURCE_KEYS = Object.freeze({
  ORDERS: "orders",
  CLIENTS: "clients",
  TRANSACTIONS: "transactions",
  DEVICES: "devices",
  TEAM_MEMBERS: "teamMembers",
});

export const FEATURE_KEYS = Object.freeze({
  BASIC_DASHBOARD: "basic_dashboard",
  ADVANCED_DASHBOARD: "advanced_dashboard",
  REPORTS: "reports",
  TEAM_MANAGEMENT: "team_management",
  API_ACCESS: "api_access",
  AUDIT_LOG: "audit_log",
});

export const SUBSCRIPTION_STATUSES = Object.freeze({
  FREE: "FREE",
  ACTIVE_PRO: "ACTIVE_PRO",
  ACTIVE_BUSINESS: "ACTIVE_BUSINESS",
  CANCEL_AT_PERIOD_END: "CANCEL_AT_PERIOD_END",
  EXPIRED: "EXPIRED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_FAILED: "PAYMENT_FAILED",
});

export const PLAN_CATALOG = Object.freeze({
  [PLAN_CODES.FREE]: {
    code: PLAN_CODES.FREE,
    name: "Free",
    description: "Para começar com organização.",
    priceCents: 0,
    annualPriceCents: 0,
    interval: "month",
    limits: { orders: 20, clients: 20, transactions: 20, devices: 3, teamMembers: 1 },
    featureKeys: [FEATURE_KEYS.BASIC_DASHBOARD],
    features: ["20 demandas", "20 clientes", "20 registros financeiros", "Até 3 dispositivos", "Dashboard básico"],
  },
  [PLAN_CODES.PRO]: {
    code: PLAN_CODES.PRO,
    name: "Pro",
    description: "Para empresas que querem crescer com mais controle.",
    priceCents: 4999,
    annualPriceCents: 49990,
    interval: "month",
    limits: { orders: 100, clients: 100, transactions: 100, devices: 10, teamMembers: 3 },
    featureKeys: [FEATURE_KEYS.BASIC_DASHBOARD, FEATURE_KEYS.ADVANCED_DASHBOARD, FEATURE_KEYS.REPORTS],
    features: ["100 demandas", "100 clientes", "100 registros financeiros", "Dashboard avançado", "Relatórios e indicadores adicionais"],
  },
  [PLAN_CODES.BUSINESS]: {
    code: PLAN_CODES.BUSINESS,
    name: "Business",
    description: "Para operações com equipe e escala.",
    priceCents: 9999,
    annualPriceCents: 99990,
    interval: "month",
    limits: { orders: -1, clients: -1, transactions: -1, devices: -1, teamMembers: 10 },
    featureKeys: [
      FEATURE_KEYS.BASIC_DASHBOARD, FEATURE_KEYS.ADVANCED_DASHBOARD, FEATURE_KEYS.REPORTS,
      FEATURE_KEYS.TEAM_MANAGEMENT, FEATURE_KEYS.API_ACCESS, FEATURE_KEYS.AUDIT_LOG,
    ],
    features: ["Demandas ilimitadas", "Clientes ilimitados", "Financeiro ilimitado", "Gestão ilimitada", "Recursos de equipe", "Dashboard avançado", "Tudo do Pro"],
  },
});

const PLAN_LEVELS = Object.freeze({
  [PLAN_CODES.FREE]: 0,
  [PLAN_CODES.PRO]: 1,
  [PLAN_CODES.BUSINESS]: 2,
});

export function getPlan(code) {
  return PLAN_CATALOG[String(code || "").toLowerCase()] || PLAN_CATALOG[PLAN_CODES.FREE];
}

export function isPlanDowngrade(currentCode, targetCode) {
  return PLAN_LEVELS[getPlan(targetCode).code] < PLAN_LEVELS[getPlan(currentCode).code];
}

export function planPrice(plan) { return formatCurrency(plan.priceCents / 100, "BRL"); }
export function planPriceCents(plan, period = "month") {
  return period === "year" ? plan.annualPriceCents : plan.priceCents;
}
export function intervalLabel(interval) { return interval === "year" ? "ano" : "mês"; }
