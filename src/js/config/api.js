const configuredApiUrl = globalThis.__FIXFLOW_API_URL__;

export const API_URL = configuredApiUrl
  || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin);
