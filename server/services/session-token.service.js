import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const developmentSecret = randomBytes(32).toString("hex");

function secret() {
  if (env.sessionSecret) return env.sessionSecret;
  if (!env.isProduction) return developmentSecret;
  throw new Error("SESSION_SECRET_REQUIRED");
}

function encode(value) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function decode(value) { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")); }

export function createSessionToken({ userId, workspaceId, now = Math.floor(Date.now() / 1000) }) {
  const payload = encode({ userId, workspaceId, iat: now, exp: now + TOKEN_TTL_SECONDS });
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string") throw new Error("UNAUTHORIZED");
  const [payload, providedSignature, ...extra] = token.split(".");
  if (!payload || !providedSignature || extra.length) throw new Error("UNAUTHORIZED");
  const expectedSignature = createHmac("sha256", secret()).update(payload).digest();
  const actualSignature = Buffer.from(providedSignature, "base64url");
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) throw new Error("UNAUTHORIZED");
  let claims;
  try { claims = decode(payload); } catch { throw new Error("UNAUTHORIZED"); }
  if (!claims.userId || !claims.workspaceId || !Number.isInteger(claims.exp) || claims.exp <= now) throw new Error("UNAUTHORIZED");
  return claims;
}

export function bearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization;
  return typeof header === "string" && /^Bearer\s+\S+$/i.test(header) ? header.slice(7).trim() : null;
}
