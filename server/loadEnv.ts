import fs from "node:fs";
import path from "node:path";

/**
 * Minimal .env loader for local development only. Vercel (and most hosts)
 * inject environment variables directly, so this is a no-op in production —
 * it never overrides a variable that's already set.
 */
export function loadDotEnvIfPresent(rootDir: string): void {
  if (process.env.NODE_ENV === "production") return;
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
