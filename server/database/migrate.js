import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createDatabasePool } from "./client.js";

const pool = createDatabasePool();
if (!pool) throw new Error("DATABASE_URL is required to run migrations");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = await readFile(resolve(root, "database/schema.sql"), "utf8");
const persistence = await readFile(resolve(root, "database/migrations/001_persistence.sql"), "utf8");

try {
  await pool.query("BEGIN");
  await pool.query(schema);
  await pool.query(persistence);
  await pool.query("COMMIT");
  console.log("Database migrations applied.");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
