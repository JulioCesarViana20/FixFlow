function normalizeUrl(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/$/, "");
}

function resolveConfiguredApiUrl() {
  const runtimeGlobal = normalizeUrl(globalThis.__FIXFLOW_API_URL__);
  if (runtimeGlobal) return runtimeGlobal;

  const documentRef = typeof document !== "undefined" ? document : null;
  const metaTag = documentRef?.querySelector?.('meta[name="fixflow-api-url"]');
  const metaValue = normalizeUrl(metaTag?.content);
  if (metaValue) return metaValue;

  const localStorageRef = typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : null;
  const localStorageValue = normalizeUrl(localStorageRef?.getItem?.("FIXFLOW_API_URL"));
  if (localStorageValue) return localStorageValue;

  return "";
}

const configuredApiUrl = resolveConfiguredApiUrl();
const windowRef = typeof window !== "undefined" ? window : null;
const isLocalHost = !!windowRef && (windowRef.location.hostname === "localhost" || windowRef.location.hostname === "127.0.0.1");

export const API_URL = configuredApiUrl
  || (isLocalHost
    ? `${windowRef.location.protocol}//${windowRef.location.hostname}:3000`
    : windowRef?.location?.origin || "");
