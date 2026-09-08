import { Pool } from "pg";

let realPool: Pool | undefined;

/** Lazily created so DATABASE_URL is only required once a query actually runs
 * (not at module import time) — this lets local dev load .env after imports
 * are resolved, and keeps a bad/missing env var from crashing the whole
 * process during a serverless cold start before any request is even routed. */
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

/** Proxies every property/method access to the lazily-created Pool above, so
 * call sites can keep using `pool.query<T>(...)` with full generic typing. */
export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop, _receiver) {
    const real = getPool();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export async function withTransaction<T>(run: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
