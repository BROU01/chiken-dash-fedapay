import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { loadDotEnvIfPresent } from "../server/loadEnv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotEnvIfPresent(path.resolve(__dirname, ".."));

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. See .env.example.");
  const useSsl = process.env.PGSSLMODE !== "disable";
  const pool = new Pool({ connectionString, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
  console.log("Migrations applied.");
  await pool.end();
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
