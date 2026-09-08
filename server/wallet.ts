import type { PoolClient } from "pg";
import { pool } from "../db/client";

export class InsufficientFundsError extends Error {
  constructor() {
    super("INSUFFICIENT_FUNDS");
  }
}

export type LedgerType = "deposit" | "withdrawal" | "bet" | "payout" | "adjustment";

export interface LedgerEntryInput {
  type: LedgerType;
  status?: "pending" | "completed" | "failed" | "cancelled";
  provider?: string;
  providerRef?: string;
  meta?: Record<string, unknown>;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const { rows } = await pool.query<{ balance: string }>("select balance from wallets where user_id = $1", [userId]);
  return rows[0] ? Number(rows[0].balance) : 0;
}

/**
 * Atomically move `delta` (positive = credit, negative = debit) into the
 * wallet and record the ledger entry in the same transaction. The WHERE
 * clause guard (`balance + delta >= 0`) makes debits safe under concurrency
 * without a separate SELECT ... FOR UPDATE: Postgres serializes concurrent
 * UPDATEs on the same row, so a second debit that would overdraw simply
 * matches zero rows instead of racing past the check.
 */
export async function adjustWallet(client: PoolClient, userId: string, delta: number, entry: LedgerEntryInput): Promise<number> {
  const { rows } = await client.query<{ balance: string }>(
    "update wallets set balance = balance + $2, updated_at = now() where user_id = $1 and balance + $2 >= 0 returning balance",
    [userId, delta],
  );
  if (rows.length === 0) {
    throw new InsufficientFundsError();
  }
  await client.query(
    `insert into ledger_entries (user_id, type, amount, status, provider, provider_ref, meta)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, entry.type, delta, entry.status ?? "completed", entry.provider ?? null, entry.providerRef ?? null, entry.meta ?? null],
  );
  return Number(rows[0].balance);
}

export async function listLedgerEntries(userId: string, limit = 30) {
  const { rows } = await pool.query(
    `select id, type, amount, status, provider, created_at
     from ledger_entries where user_id = $1 order by created_at desc limit $2`,
    [userId, limit],
  );
  return rows;
}
