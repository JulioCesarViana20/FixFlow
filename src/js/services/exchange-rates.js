const RATE_CACHE_KEY = "fixflow.exchange-rates.v1";
const RATE_ENDPOINT = "https://api.frankfurter.app/latest?from=BRL&to=USD";
const fallbackRates = Object.freeze({ BRL: 1, USD: null });

export async function getBrlRates() {
  const cached = readCache();
  try {
    const response = await fetch(RATE_ENDPOINT);
    if (!response.ok) throw new Error("EXCHANGE_RATE_UNAVAILABLE");
    const data = await response.json();
    const usd = Number(data.rates?.USD);
    if (!Number.isFinite(usd) || usd <= 0) throw new Error("EXCHANGE_RATE_INVALID");
    const result = { rates: { BRL: 1, USD: usd }, updatedAt: data.date, source: "Frankfurter/ECB" };
    localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(result));
    return result;
  } catch (error) {
    if (cached) return { ...cached, source: `${cached.source} (cache)` };
    throw error;
  }
}

export function convertFromBrl(amount, currency, rates) {
  const rate = rates?.rates?.[currency];
  if (!Number.isFinite(rate)) throw new Error("EXCHANGE_RATE_UNAVAILABLE");
  return Number(amount) * rate;
}

export function formatMoney(amount, currency, locale = undefined) {
  return new Intl.NumberFormat(locale || (currency === "USD" ? "en-US" : "pt-BR"), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(RATE_CACHE_KEY));
    return cached?.rates?.USD ? cached : null;
  } catch {
    return null;
  }
}

export { fallbackRates };
