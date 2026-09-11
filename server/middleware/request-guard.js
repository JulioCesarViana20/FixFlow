const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;
const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export function createRequestGuard({
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
} = {}) {
  const buckets = new Map();

  return (request, response, next) => {
    const now = Date.now();
    const key = `${clientAddress(request)}:${request.method}:${new URL(request.url, "http://localhost").pathname}`;
    const current = buckets.get(key);

    if (!current || now >= current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      current.count += 1;
      if (current.count > maxRequests) {
        const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
        response.writeHead(429, {
          "content-type": "application/json; charset=utf-8",
          "retry-after": String(retryAfter),
          "x-content-type-options": "nosniff",
        });
        response.end(JSON.stringify({ error: "RATE_LIMITED", retryAfter }));
        return;
      }
    }

    const contentLength = Number(request.headers["content-length"] || 0);
    if (contentLength > maxBodyBytes) {
      response.writeHead(413, {
        "content-type": "application/json; charset=utf-8",
        "x-content-type-options": "nosniff",
      });
      response.end(JSON.stringify({ error: "REQUEST_TOO_LARGE" }));
      return;
    }

    return next();
  };
}

function clientAddress(request) {
  return request.socket?.remoteAddress || "unknown";
}
