import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnvIfPresent } from "../server/loadEnv";
import { pool } from "./client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotEnvIfPresent(path.resolve(__dirname, ".."));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await pool.query(sql);
  console.log("Migration applied.");
  await pool.end();
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
