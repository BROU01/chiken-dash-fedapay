import { createHash, createHmac, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { pool, withTransaction } from "../db/client";
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

interface RoundRow {
  id: number;
  nonce: string;
  server_seed: string;
  server_seed_hash: string;
  crash_point: string;
  status: "betting" | "live" | "crashed";
  betting_opens_at: Date;
  starts_at: Date;
  crashed_at: Date | null;
}

export class GameError extends Error {
  constructor(public code: string) {
    super(code);
  }
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

function computeState(round: RoundRow, now: number): ComputedState {
  const startsAtMs = round.starts_at.getTime();
  if (now < startsAtMs) {
    return { status: "betting", multiplier: 1, crashedAtMs: 0 };
  }
  const crashPoint = Number(round.crash_point);
  const crashedAtMs = startsAtMs + crashDurationMs(crashPoint);
  if (now >= crashedAtMs) {
    return { status: "crashed", multiplier: crashPoint, crashedAtMs };
  }
  return { status: "live", multiplier: multiplierAt(now - startsAtMs), crashedAtMs };
}

async function fetchLatestRound(client: PoolClient): Promise<RoundRow | null> {
  const { rows } = await client.query<RoundRow>("select * from rounds order by id desc limit 1");
  return rows[0] ?? null;
}

async function createRound(client: PoolClient, nonce: number, now: number): Promise<RoundRow> {
  const serverSeed = randomBytes(32).toString("hex");
  const serverSeedHash = createHash("sha256").update(serverSeed).digest("hex");
  const crashPoint = deriveCrashPoint(serverSeed, nonce);
  const bettingOpensAt = new Date(now);
  const startsAt = new Date(now + BETTING_WINDOW_MS);
  const { rows } = await client.query<RoundRow>(
    `insert into rounds (nonce, server_seed, server_seed_hash, crash_point, status, betting_opens_at, starts_at)
     values ($1, $2, $3, $4, 'betting', $5, $6) returning *`,
    [nonce, serverSeed, serverSeedHash, crashPoint, bettingOpensAt, startsAt],
  );
  return rows[0];
}

/** Cash out any auto-target bets the elapsed time has already reached. */
async function resolveAutoCashouts(client: PoolClient, round: RoundRow, multiplier: number): Promise<void> {
  const { rows } = await client.query<{ id: string; user_id: string; stake: string; auto_cashout_target: string }>(
    `select id, user_id, stake, auto_cashout_target from bets
     where round_id = $1 and status = 'placed' and auto_cashout_target is not null and auto_cashout_target <= $2`,
    [round.id, multiplier],
  );
  for (const bet of rows) {
    const target = Number(bet.auto_cashout_target);
    const payout = Math.floor(Number(bet.stake) * target);
    const { rowCount } = await client.query(
      `update bets set status = 'cashed', cashout_multiplier = $2, payout = $3
       where id = $1 and status = 'placed'`,
      [bet.id, target, payout],
    );
    if (rowCount) {
      await adjustWallet(client, bet.user_id, payout, { type: "payout", meta: { roundId: round.id, multiplier: target } });
    }
  }
}

/** Settle every bet still open once a crashed round's cooldown has fully elapsed. */
async function settleRound(client: PoolClient, round: RoundRow, crashedAtMs: number): Promise<void> {
  const crashPoint = Number(round.crash_point);
  const { rows } = await client.query<{ id: string; user_id: string; stake: string; auto_cashout_target: string | null }>(
    `select id, user_id, stake, auto_cashout_target from bets where round_id = $1 and status = 'placed'`,
    [round.id],
  );
  for (const bet of rows) {
    const target = bet.auto_cashout_target !== null ? Number(bet.auto_cashout_target) : null;
    if (target !== null && target <= crashPoint) {
      const payout = Math.floor(Number(bet.stake) * target);
      await client.query(`update bets set status = 'cashed', cashout_multiplier = $2, payout = $3 where id = $1`, [bet.id, target, payout]);
      await adjustWallet(client, bet.user_id, payout, { type: "payout", meta: { roundId: round.id, multiplier: target } });
    } else {
      await client.query(`update bets set status = 'lost', payout = 0 where id = $1`, [bet.id]);
    }
  }
  await client.query(`update rounds set status = 'crashed', crashed_at = $2 where id = $1`, [round.id, new Date(crashedAtMs)]);
}

/** Advance the shared round: resolve auto cash-outs, settle a fully-cooled crash, or spin up the next round. Returns the current round + its live state. */
async function ensureCurrentRound(client: PoolClient, now: number): Promise<{ round: RoundRow; state: ComputedState }> {
  await client.query("select pg_advisory_xact_lock($1)", [ROUND_LOCK_KEY]);
  let round = await fetchLatestRound(client);
  if (!round) {
    round = await createRound(client, 1, now);
    return { round, state: computeState(round, now) };
  }
  let state = computeState(round, now);
  if (state.status === "live") {
    await resolveAutoCashouts(client, round, state.multiplier);
  } else if (state.status === "crashed") {
    if (now >= state.crashedAtMs + COOLDOWN_MS) {
      // Idempotent: settleRound only touches bets still 'placed', so it's safe
      // even if a previous request already marked the round crashed.
      await settleRound(client, round, state.crashedAtMs);
      round = await createRound(client, Number(round.nonce) + 1, now);
      state = computeState(round, now);
    } else if (round.status !== "crashed") {
      await client.query(`update rounds set status = 'crashed', crashed_at = $2 where id = $1`, [round.id, new Date(state.crashedAtMs)]);
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

async function fetchUserBet(client: PoolClient, roundId: number, userId: string): Promise<PublicBetView | null> {
  const { rows } = await client.query(
    `select stake, status, auto_cashout_target, cashout_multiplier, payout from bets where round_id = $1 and user_id = $2`,
    [roundId, userId],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    stake: Number(row.stake),
    status: row.status,
    autoCashoutTarget: row.auto_cashout_target !== null ? Number(row.auto_cashout_target) : null,
    cashoutMultiplier: row.cashout_multiplier !== null ? Number(row.cashout_multiplier) : null,
    payout: row.payout !== null ? Number(row.payout) : null,
  };
}

async function fetchRecentCrashes(client: PoolClient): Promise<number[]> {
  const { rows } = await client.query<{ crash_point: string }>(
    "select crash_point from rounds where status = 'crashed' order by id desc limit 15",
  );
  return rows.map((row) => Number(row.crash_point));
}

function toPublicView(round: RoundRow, state: ComputedState, now: number, yourBet: PublicBetView | null, recentCrashes: number[]): PublicRoundView {
  const crashed = state.status === "crashed";
  return {
    roundId: round.id,
    nonce: Number(round.nonce),
    serverSeedHash: round.server_seed_hash,
    status: state.status,
    multiplier: Math.round(state.multiplier * 100) / 100,
    startsAt: round.starts_at.toISOString(),
    serverNow: now,
    bettingOpensInMs: Math.max(0, round.starts_at.getTime() - now),
    crashPoint: crashed ? Number(round.crash_point) : null,
    serverSeed: crashed ? round.server_seed : null,
    yourBet,
    recentCrashes,
  };
}

export async function getCurrentRoundView(userId?: string): Promise<PublicRoundView> {
  return withTransaction(async (client) => {
    const now = Date.now();
    const { round, state } = await ensureCurrentRound(client, now);
    const yourBet = userId ? await fetchUserBet(client, round.id, userId) : null;
    const recentCrashes = await fetchRecentCrashes(client);
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
  return withTransaction(async (client) => {
    const now = Date.now();
    const { round, state } = await ensureCurrentRound(client, now);
    if (state.status !== "betting") {
      throw new GameError("BETTING_CLOSED");
    }
    await adjustWallet(client, userId, -stake, { type: "bet", meta: { roundId: round.id } });
    try {
      await client.query(
        `insert into bets (round_id, user_id, stake, auto_cashout_target) values ($1, $2, $3, $4)`,
        [round.id, userId, stake, autoCashoutTarget],
      );
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
        throw new GameError("ALREADY_BET");
      }
      throw error;
    }
    const yourBet = await fetchUserBet(client, round.id, userId);
    const recentCrashes = await fetchRecentCrashes(client);
    return toPublicView(round, state, now, yourBet, recentCrashes);
  });
}

export async function cashOut(userId: string): Promise<PublicRoundView> {
  return withTransaction(async (client) => {
    const now = Date.now();
    const { round, state } = await ensureCurrentRound(client, now);
    if (state.status !== "live") {
      throw new GameError("CANNOT_CASH_OUT");
    }
    const payout = Math.floor((await currentStake(client, round.id, userId)) * state.multiplier);
    const { rowCount } = await client.query(
      `update bets set status = 'cashed', cashout_multiplier = $3, payout = $4
       where round_id = $1 and user_id = $2 and status = 'placed'`,
      [round.id, userId, state.multiplier, payout],
    );
    if (!rowCount) {
      throw new GameError("NO_ACTIVE_BET");
    }
    await adjustWallet(client, userId, payout, { type: "payout", meta: { roundId: round.id, multiplier: state.multiplier } });
    const yourBet = await fetchUserBet(client, round.id, userId);
    const recentCrashes = await fetchRecentCrashes(client);
    return toPublicView(round, state, now, yourBet, recentCrashes);
  });
}

async function currentStake(client: PoolClient, roundId: number, userId: string): Promise<number> {
  const { rows } = await client.query<{ stake: string }>(
    "select stake from bets where round_id = $1 and user_id = $2 and status = 'placed'",
    [roundId, userId],
  );
  if (!rows[0]) throw new GameError("NO_ACTIVE_BET");
  return Number(rows[0].stake);
}

export async function listRecentBets(userId: string, limit = 20) {
  const { rows } = await pool.query(
    `select b.id, b.stake, b.status, b.auto_cashout_target, b.cashout_multiplier, b.payout, b.created_at, r.crash_point
     from bets b join rounds r on r.id = b.round_id
     where b.user_id = $1 order by b.created_at desc limit $2`,
    [userId, limit],
  );
  return rows;
}
