import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createDatabasePool } from "./client.js";

const pool = createDatabasePool();
if (!pool) throw new Error("DATABASE_URL is required to run migrations");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = await readFile(resolve(root, "database/schema.sql"), "utf8");
const migrationFiles = (await readdir(resolve(root, "database/migrations"))).filter((file) => file.endsWith(".sql")).sort();

try {
  await pool.query("BEGIN");
  const existingSchema = await pool.query("SELECT to_regclass('public.plans') AS table_name");
  if (!existingSchema.rows[0]?.table_name) {
    await pool.query(schema);
  }
  for (const file of migrationFiles) await pool.query(await readFile(resolve(root, "database/migrations", file), "utf8"));
  await pool.query("COMMIT");
  console.log("Database migrations applied.");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
