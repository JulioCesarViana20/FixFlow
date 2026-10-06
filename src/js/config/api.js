function normalizeUrl(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/$/, "");
}

function resolveConfiguredApiUrl() {
  const runtimeGlobal = normalizeUrl(globalThis.__FIXFLOW_API_URL__);
  if (runtimeGlobal) return runtimeGlobal;

  const metaTag = document.querySelector('meta[name="fixflow-api-url"]');
  const metaValue = normalizeUrl(metaTag?.content);
  if (metaValue) return metaValue;

  const localStorageValue = normalizeUrl(globalThis.localStorage?.getItem("FIXFLOW_API_URL"));
  if (localStorageValue) return localStorageValue;

  return "";
}

const configuredApiUrl = resolveConfiguredApiUrl();
const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const API_URL = configuredApiUrl
  || (isLocalHost
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin);
