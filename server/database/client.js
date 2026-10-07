import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export function createDatabasePool() {
  if (!env.databaseUrl) return null;
  return new Pool({
    connectionString: env.databaseUrl,
    ssl: env.isProduction ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
}
