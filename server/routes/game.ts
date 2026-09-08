import { Router } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth, type AuthedRequest } from "../auth";
import { cashOut, GameError, getCurrentRoundView, listRecentBets, placeBet } from "../game";

export const gameRouter = Router();

function handleGameError(res: import("express").Response, error: unknown) {
  if (error instanceof GameError) {
    const statusByCode: Record<string, number> = {
      INVALID_STAKE: 400,
      INVALID_AUTO_TARGET: 400,
      BETTING_CLOSED: 409,
      ALREADY_BET: 409,
      CANNOT_CASH_OUT: 409,
      NO_ACTIVE_BET: 409,
    };
    res.status(statusByCode[error.code] ?? 400).json({ error: error.code });
    return;
  }
  if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
    res.status(402).json({ error: "INSUFFICIENT_FUNDS" });
    return;
  }
  throw error;
}

gameRouter.get("/state", optionalAuth, async (req: AuthedRequest, res) => {
  const view = await getCurrentRoundView(req.userId);
  res.json(view);
});

const betSchema = z.object({
  stake: z.number().int().positive(),
  autoCashoutTarget: z.number().min(1.01).max(1000).nullable().optional(),
});

gameRouter.post("/bet", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = betSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_INPUT" });
    return;
  }
  try {
    const view = await placeBet(req.userId!, parsed.data.stake, parsed.data.autoCashoutTarget ?? null);
    res.json(view);
  } catch (error) {
    handleGameError(res, error);
  }
});

gameRouter.post("/cashout", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const view = await cashOut(req.userId!);
    res.json(view);
  } catch (error) {
    handleGameError(res, error);
  }
});

gameRouter.get("/history", requireAuth, async (req: AuthedRequest, res) => {
  const bets = await listRecentBets(req.userId!);
  res.json({ bets });
});
