import { and, desc, eq, sql } from "drizzle-orm";
import { db, type Tx } from "../db/client";
import { ledgerEntries, ledgerStatusValues, ledgerTypeValues, wallets } from "../db/schema";

export class InsufficientFundsError extends Error {
  constructor() {
    super("INSUFFICIENT_FUNDS");
  }
}

export type LedgerType = (typeof ledgerTypeValues)[number];
export type LedgerStatus = (typeof ledgerStatusValues)[number];

export interface LedgerEntryInput {
  type: LedgerType;
  status?: LedgerStatus;
  provider?: string;
  providerRef?: string;
  meta?: Record<string, unknown>;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const [row] = await db.select({ balance: wallets.balance }).from(wallets).where(eq(wallets.userId, userId));
  return row?.balance ?? 0;
}

/**
 * Atomically move `delta` (positive = credit, negative = debit) into the
 * wallet and record the ledger entry in the same transaction. The WHERE
 * clause guard (`balance + delta >= 0`) makes debits safe under concurrency
 * without a separate SELECT ... FOR UPDATE: Postgres serializes concurrent
 * UPDATEs on the same row, so a second debit that would overdraw simply
 * matches zero rows instead of racing past the check.
 */
export async function adjustWallet(tx: Tx, userId: string, delta: number, entry: LedgerEntryInput): Promise<number> {
  const [row] = await tx
    .update(wallets)
    .set({ balance: sql`${wallets.balance} + ${delta}`, updatedAt: new Date() })
    .where(and(eq(wallets.userId, userId), sql`${wallets.balance} + ${delta} >= 0`))
    .returning({ balance: wallets.balance });

  if (!row) {
    throw new InsufficientFundsError();
  }

  await tx.insert(ledgerEntries).values({
    userId,
    type: entry.type,
    amount: delta,
    status: entry.status ?? "completed",
    provider: entry.provider,
    providerRef: entry.providerRef,
    meta: entry.meta,
  });

  return row.balance;
}

export async function listLedgerEntries(userId: string, limit = 30) {
  return db
    .select({
      id: ledgerEntries.id,
      type: ledgerEntries.type,
      amount: ledgerEntries.amount,
      status: ledgerEntries.status,
      provider: ledgerEntries.provider,
      createdAt: ledgerEntries.createdAt,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, userId))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit);
}
