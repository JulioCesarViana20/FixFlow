export class Router {
  constructor() { this.routes = []; }
  get(path, ...handlers) { this.routes.push({ method: "GET", path, handlers }); }
  post(path, ...handlers) { this.routes.push({ method: "POST", path, handlers }); }

  async handle(request, response) {
    const route = this.routes.find((item) => item.method === request.method && item.path === new URL(request.url, "http://localhost").pathname);
    if (!route) return send(response, 404, { error: "NOT_FOUND" });
    try {
      let index = 0;
      const next = async () => {
        const handler = route.handlers[index++];
        if (handler) return handler(request, response, next);
      };
      request.json = async () => {
        let body = "";
        for await (const chunk of request) {
          body += chunk;
          if (Buffer.byteLength(body, "utf8") > 64 * 1024) {
            const error = new Error("REQUEST_TOO_LARGE");
            error.statusCode = 413;
            throw error;
          }
        }
        return body ? JSON.parse(body) : {};
      };
      const result = await next();
      if (!response.headersSent) send(response, 200, result || { ok: true });
    } catch (error) {
      send(response, error.statusCode || 400, { error: publicError(error) });
    }
  }
}

export function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}

function publicError(error) {
  const safe = new Set(["UNAUTHORIZED", "OWNER_REQUIRED", "WORKSPACE_NOT_FOUND", "SUBSCRIPTION_NOT_FOUND", "FEATURE_REQUIRES_UPGRADE", "PAYMENT_GATEWAY_NOT_CONFIGURED", "PAYMENT_NOT_FOUND", "PAYMENT_AMOUNT_MISMATCH", "INVALID_WEBHOOK", "PLAN_NOT_FOUND", "REQUEST_TOO_LARGE", "ALREADY_ON_PLAN", "FREE_PLAN_DOES_NOT_REQUIRE_CHECKOUT", "LEGAL_ACCEPTANCE_REQUIRED", "INVALID_REGISTRATION", "EMAIL_ALREADY_REGISTERED", "INVALID_DELETE_CONFIRMATION", "REAUTHENTICATION_FAILED", "DELETION_IN_PROGRESS", "ACCOUNT_ALREADY_DEACTIVATED"]);
  return safe.has(error.message) ? error.message : "REQUEST_FAILED";
}
