export function createCorsMiddleware({ allowedOrigin, allowedOrigins = [] }) {
  const origins = new Set([allowedOrigin, ...allowedOrigins].filter(Boolean));

  return (request, response, next) => {
    const origin = request.headers.origin;
    if (origin && origins.has(origin)) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("access-control-allow-methods", "POST, GET, OPTIONS");
      response.setHeader("access-control-allow-headers", "content-type, authorization");
      response.setHeader("vary", "Origin");
    }

    if (request.method === "OPTIONS") {
      if (!origin || !origins.has(origin)) {
        response.writeHead(403, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "CORS_ORIGIN_NOT_ALLOWED" }));
        return;
      }
      response.writeHead(204);
      response.end();
      return;
    }

    return next();
  };
}
