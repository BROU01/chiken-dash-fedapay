import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let realPool: Pool | undefined;
let realDb: NodePgDatabase<typeof schema> | undefined;

/**
 * Lazily created so DATABASE_URL is only required once a query actually runs
 * (not at module import time) — this lets local dev load .env after imports
 * are resolved, and keeps a bad/missing env var from crashing the whole
 * process during a serverless cold start before any request is even routed.
 *
 * Works against any standard Postgres connection string, including Neon's —
 * Neon's connection strings speak normal Postgres wire protocol over TLS, so
 * the plain `pg` driver is all that's needed here. (No edge/Workers runtime
 * touches Postgres directly in this project — PartyKit only relays state
 * that this API already computed; see server/game.ts.)
 */
function getPool(): Pool {
  if (realPool) return realPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  // Hosted Postgres (Neon, Supabase, Vercel Postgres...) requires TLS but usually ships a
  // certificate that isn't in Node's default trust store; local/dev Postgres has no TLS at all.
  // PGSSLMODE=disable (set for local dev) turns this off explicitly.
  const useSsl = process.env.PGSSLMODE !== "disable";
  realPool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
  return realPool;
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!realDb) {
    realDb = drizzle(getPool(), { schema });
  }
  return realDb;
}

/** Drizzle query builder, lazily bound to the pool on first property access. */
export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, _receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** `db.transaction()` re-exported through the same lazy-init path (kept for call sites that want the type). */
export type Tx = Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0];
