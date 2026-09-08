import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { cashOut, GameError, getCurrentRoundView, listRecentBets, placeBet } from "../../game";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const TRPC_CODE_BY_GAME_CODE: Record<string, "BAD_REQUEST" | "CONFLICT"> = {
  INVALID_STAKE: "BAD_REQUEST",
  INVALID_AUTO_TARGET: "BAD_REQUEST",
  BETTING_CLOSED: "CONFLICT",
  ALREADY_BET: "CONFLICT",
  CANNOT_CASH_OUT: "CONFLICT",
  NO_ACTIVE_BET: "CONFLICT",
};

/** Re-throws game/wallet errors as TRPCErrors, carrying our own error code in `message` (matched client-side). */
function toTRPCError(error: unknown): never {
  if (error instanceof GameError) {
    throw new TRPCError({ code: TRPC_CODE_BY_GAME_CODE[error.code] ?? "BAD_REQUEST", message: error.code });
  }
  if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "INSUFFICIENT_FUNDS" });
  }
  throw error;
}

export const gameRouter = router({
  state: publicProcedure.query(({ ctx }) => getCurrentRoundView(ctx.userId)),

  bet: protectedProcedure
    .input(
      z.object({
        stake: z.number().int().positive(),
        autoCashoutTarget: z.number().min(1.01).max(1000).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await placeBet(ctx.userId, input.stake, input.autoCashoutTarget ?? null);
      } catch (error) {
        toTRPCError(error);
      }
    }),

  cashout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return await cashOut(ctx.userId);
    } catch (error) {
      toTRPCError(error);
    }
  }),

  history: protectedProcedure.query(({ ctx }) => listRecentBets(ctx.userId)),
});
