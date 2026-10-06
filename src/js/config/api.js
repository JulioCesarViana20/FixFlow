function normalizeUrl(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/$/, "");
}

function resolveConfiguredApiUrl() {
  const runtimeGlobal = normalizeUrl(globalThis.__FIXFLOW_API_URL__);
  if (runtimeGlobal) return runtimeGlobal;

  const envValue = normalizeUrl(typeof process !== "undefined" ? process.env?.FIXFLOW_API_URL : "");
  if (envValue) return envValue;

  if (typeof window !== "undefined") {
    const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocalHost) {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export const API_URL = resolveConfiguredApiUrl();
