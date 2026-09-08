import { createHash, createHmac, randomBytes } from "node:crypto";
import { and, desc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { db, type Tx } from "../db/client";
import { bets, type Round, rounds } from "../db/schema";
import { GROWTH_RATE, multiplierAt } from "../shared/gameConstants";
import { adjustWallet } from "./wallet";

const HOUSE_EDGE = 0.04;
const MIN_CRASH = 1.01;
const MAX_UNIFORM = 0.98;

export const BETTING_WINDOW_MS = 5000;
export const COOLDOWN_MS = 3000;
export const MIN_STAKE = 100;
export const MAX_STAKE = 1_000_000;
export const MIN_AUTO_CASHOUT = 1.01;
export const MAX_AUTO_CASHOUT = 1000;

/** Advisory lock key: serializes round-state transitions across concurrent requests. */
const ROUND_LOCK_KEY = 47_11;

export class GameError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** True for a Postgres unique-violation (23505), whether thrown directly by
 * `pg` or wrapped by Drizzle's DrizzleQueryError (which nests the real error
 * in `.cause`). */
function isUniqueViolation(error: unknown): boolean {
  const pgCode = (candidate: unknown): string | undefined => (candidate && typeof candidate === "object" && "code" in candidate ? (candidate as { code?: string }).code : undefined);
  return pgCode(error) === "23505" || pgCode((error as { cause?: unknown } | undefined)?.cause) === "23505";
}

function crashDurationMs(crashPoint: number): number {
  return (Math.log(crashPoint) / GROWTH_RATE) * 1000;
}

/** Provably-fair crash point: HMAC-SHA256(serverSeed, nonce) -> uniform in [0,1) -> crash formula. */
function deriveCrashPoint(serverSeed: string, nonce: number): number {
  const digest = createHmac("sha256", serverSeed).update(String(nonce)).digest("hex");
  const int = parseInt(digest.slice(0, 13), 16); // 52 bits of entropy
  const uniform = Math.min(int / 2 ** 52, MAX_UNIFORM);
  const raw = (1 - HOUSE_EDGE) / (1 - uniform);
  return Math.max(MIN_CRASH, Math.round(raw * 100) / 100);
}

interface ComputedState {
  status: "betting" | "live" | "crashed";
  multiplier: number;
  crashedAtMs: number;
}

function computeState(round: Round, now: number): ComputedState {
  const startsAtMs = round.startsAt.getTime();
  if (now < startsAtMs) {
    return { status: "betting", multiplier: 1, crashedAtMs: 0 };
  }
  const crashedAtMs = startsAtMs + crashDurationMs(round.crashPoint);
  if (now >= crashedAtMs) {
    return { status: "crashed", multiplier: round.crashPoint, crashedAtMs };
  }
  return { status: "live", multiplier: multiplierAt(now - startsAtMs), crashedAtMs };
}

async function fetchLatestRound(tx: Tx): Promise<Round | null> {
  const [round] = await tx.select().from(rounds).orderBy(desc(rounds.id)).limit(1);
  return round ?? null;
}

async function createRound(tx: Tx, nonce: number, now: number): Promise<Round> {
  const serverSeed = randomBytes(32).toString("hex");
  const serverSeedHash = createHash("sha256").update(serverSeed).digest("hex");
  const crashPoint = deriveCrashPoint(serverSeed, nonce);
  const [round] = await tx
    .insert(rounds)
    .values({
      nonce,
      serverSeed,
      serverSeedHash,
      crashPoint,
      status: "betting",
      bettingOpensAt: new Date(now),
      startsAt: new Date(now + BETTING_WINDOW_MS),
    })
    .returning();
  return round;
}

/** Cash out any auto-target bets the elapsed time has already reached. */
async function resolveAutoCashouts(tx: Tx, round: Round, multiplier: number): Promise<void> {
  const pending = await tx
    .select({ id: bets.id, userId: bets.userId, stake: bets.stake, autoCashoutTarget: bets.autoCashoutTarget })
    .from(bets)
    .where(and(eq(bets.roundId, round.id), eq(bets.status, "placed"), isNotNull(bets.autoCashoutTarget), lte(bets.autoCashoutTarget, multiplier)));

  for (const bet of pending) {
    const target = bet.autoCashoutTarget!;
    const payout = Math.floor(bet.stake * target);
    const updated = await tx
      .update(bets)
      .set({ status: "cashed", cashoutMultiplier: target, payout })
      .where(and(eq(bets.id, bet.id), eq(bets.status, "placed")))
      .returning({ id: bets.id });
    if (updated.length > 0) {
      await adjustWallet(tx, bet.userId, payout, { type: "payout", meta: { roundId: round.id, multiplier: target } });
    }
  }
}

/** Settle every bet still open once a crashed round's cooldown has fully elapsed. */
async function settleRound(tx: Tx, round: Round, crashedAtMs: number): Promise<void> {
  const open = await tx
    .select({ id: bets.id, userId: bets.userId, stake: bets.stake, autoCashoutTarget: bets.autoCashoutTarget })
    .from(bets)
    .where(and(eq(bets.roundId, round.id), eq(bets.status, "placed")));

  for (const bet of open) {
    if (bet.autoCashoutTarget !== null && bet.autoCashoutTarget <= round.crashPoint) {
      const payout = Math.floor(bet.stake * bet.autoCashoutTarget);
      await tx.update(bets).set({ status: "cashed", cashoutMultiplier: bet.autoCashoutTarget, payout }).where(eq(bets.id, bet.id));
      await adjustWallet(tx, bet.userId, payout, { type: "payout", meta: { roundId: round.id, multiplier: bet.autoCashoutTarget } });
    } else {
      await tx.update(bets).set({ status: "lost", payout: 0 }).where(eq(bets.id, bet.id));
    }
  }
  await tx.update(rounds).set({ status: "crashed", crashedAt: new Date(crashedAtMs) }).where(eq(rounds.id, round.id));
}

/** Advance the shared round: resolve auto cash-outs, settle a fully-cooled crash, or spin up the next round. Returns the current round + its live state. */
async function ensureCurrentRound(tx: Tx, now: number): Promise<{ round: Round; state: ComputedState }> {
  await tx.execute(sql`select pg_advisory_xact_lock(${ROUND_LOCK_KEY})`);
  let round = await fetchLatestRound(tx);
  if (!round) {
    round = await createRound(tx, 1, now);
    return { round, state: computeState(round, now) };
  }
  let state = computeState(round, now);
  if (state.status === "live") {
    await resolveAutoCashouts(tx, round, state.multiplier);
  } else if (state.status === "crashed") {
    if (now >= state.crashedAtMs + COOLDOWN_MS) {
      // Idempotent: settleRound only touches bets still 'placed', so it's safe
      // even if a previous request already marked the round crashed.
      await settleRound(tx, round, state.crashedAtMs);
      round = await createRound(tx, round.nonce + 1, now);
      state = computeState(round, now);
    } else if (round.status !== "crashed") {
      await tx.update(rounds).set({ status: "crashed", crashedAt: new Date(state.crashedAtMs) }).where(eq(rounds.id, round.id));
    }
  }
  return { round, state };
}

export interface PublicBetView {
  stake: number;
  status: "placed" | "cashed" | "lost";
  autoCashoutTarget: number | null;
  cashoutMultiplier: number | null;
  payout: number | null;
}

export interface PublicRoundView {
  roundId: number;
  nonce: number;
  serverSeedHash: string;
  status: "betting" | "live" | "crashed";
  multiplier: number;
  startsAt: string;
  serverNow: number;
  bettingOpensInMs: number;
  crashPoint: number | null;
  serverSeed: string | null;
  yourBet: PublicBetView | null;
  recentCrashes: number[];
}

async function fetchUserBet(tx: Tx, roundId: number, userId: string): Promise<PublicBetView | null> {
  const [row] = await tx
    .select({
      stake: bets.stake,
      status: bets.status,
      autoCashoutTarget: bets.autoCashoutTarget,
      cashoutMultiplier: bets.cashoutMultiplier,
      payout: bets.payout,
    })
    .from(bets)
    .where(and(eq(bets.roundId, roundId), eq(bets.userId, userId)));
  return row ?? null;
}

async function fetchRecentCrashes(tx: Tx): Promise<number[]> {
  const rows = await tx.select({ crashPoint: rounds.crashPoint }).from(rounds).where(eq(rounds.status, "crashed")).orderBy(desc(rounds.id)).limit(15);
  return rows.map((row) => row.crashPoint);
}

function toPublicView(round: Round, state: ComputedState, now: number, yourBet: PublicBetView | null, recentCrashes: number[]): PublicRoundView {
  const crashed = state.status === "crashed";
  return {
    roundId: round.id,
    nonce: round.nonce,
    serverSeedHash: round.serverSeedHash,
    status: state.status,
    multiplier: Math.round(state.multiplier * 100) / 100,
    startsAt: round.startsAt.toISOString(),
    serverNow: now,
    bettingOpensInMs: Math.max(0, round.startsAt.getTime() - now),
    crashPoint: crashed ? round.crashPoint : null,
    serverSeed: crashed ? round.serverSeed : null,
    yourBet,
    recentCrashes,
  };
}

export async function getCurrentRoundView(userId?: string): Promise<PublicRoundView> {
  return db.transaction(async (tx) => {
    const now = Date.now();
    const { round, state } = await ensureCurrentRound(tx, now);
    const yourBet = userId ? await fetchUserBet(tx, round.id, userId) : null;
    const recentCrashes = await fetchRecentCrashes(tx);
    return toPublicView(round, state, now, yourBet, recentCrashes);
  });
}

export async function placeBet(userId: string, stake: number, autoCashoutTarget: number | null): Promise<PublicRoundView> {
  if (!Number.isFinite(stake) || stake < MIN_STAKE || stake > MAX_STAKE || !Number.isInteger(stake)) {
    throw new GameError("INVALID_STAKE");
  }
  if (autoCashoutTarget !== null && (autoCashoutTarget < MIN_AUTO_CASHOUT || autoCashoutTarget > MAX_AUTO_CASHOUT)) {
    throw new GameError("INVALID_AUTO_TARGET");
  }
  return db.transaction(async (tx) => {
    const now = Date.now();
    const { round, state } = await ensureCurrentRound(tx, now);
    if (state.status !== "betting") {
      throw new GameError("BETTING_CLOSED");
    }
    await adjustWallet(tx, userId, -stake, { type: "bet", meta: { roundId: round.id } });
    try {
      await tx.insert(bets).values({ roundId: round.id, userId, stake, autoCashoutTarget });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new GameError("ALREADY_BET");
      }
      throw error;
    }
    const yourBet = await fetchUserBet(tx, round.id, userId);
    const recentCrashes = await fetchRecentCrashes(tx);
    return toPublicView(round, state, now, yourBet, recentCrashes);
  });
}

export async function cashOut(userId: string): Promise<PublicRoundView> {
  return db.transaction(async (tx) => {
    const now = Date.now();
    const { round, state } = await ensureCurrentRound(tx, now);
    if (state.status !== "live") {
      throw new GameError("CANNOT_CASH_OUT");
    }
    const stake = await currentStake(tx, round.id, userId);
    const payout = Math.floor(stake * state.multiplier);
    const updated = await tx
      .update(bets)
      .set({ status: "cashed", cashoutMultiplier: state.multiplier, payout })
      .where(and(eq(bets.roundId, round.id), eq(bets.userId, userId), eq(bets.status, "placed")))
      .returning({ id: bets.id });
    if (updated.length === 0) {
      throw new GameError("NO_ACTIVE_BET");
    }
    await adjustWallet(tx, userId, payout, { type: "payout", meta: { roundId: round.id, multiplier: state.multiplier } });
    const yourBet = await fetchUserBet(tx, round.id, userId);
    const recentCrashes = await fetchRecentCrashes(tx);
    return toPublicView(round, state, now, yourBet, recentCrashes);
  });
}

async function currentStake(tx: Tx, roundId: number, userId: string): Promise<number> {
  const [row] = await tx
    .select({ stake: bets.stake })
    .from(bets)
    .where(and(eq(bets.roundId, roundId), eq(bets.userId, userId), eq(bets.status, "placed")));
  if (!row) throw new GameError("NO_ACTIVE_BET");
  return row.stake;
}

export async function listRecentBets(userId: string, limit = 20) {
  return db
    .select({
      id: bets.id,
      stake: bets.stake,
      status: bets.status,
      autoCashoutTarget: bets.autoCashoutTarget,
      cashoutMultiplier: bets.cashoutMultiplier,
      payout: bets.payout,
      createdAt: bets.createdAt,
      crashPoint: rounds.crashPoint,
    })
    .from(bets)
    .innerJoin(rounds, eq(rounds.id, bets.roundId))
    .where(eq(bets.userId, userId))
    .orderBy(desc(bets.createdAt))
    .limit(limit);
}
