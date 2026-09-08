import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client";
import { ledgerEntries, users } from "../../../db/schema";
import { env } from "../../env";
import { createDeposit, createPayout } from "../../fedapay";
import { adjustWallet, getWalletBalance, InsufficientFundsError, listLedgerEntries } from "../../wallet";
import { protectedProcedure, router } from "../trpc";

const MIN_DEPOSIT = 200;
const MIN_WITHDRAWAL = 500;

/** Mobile Money operators FedaPay supports for Mobile Money Africa payments. Keep in sync with the FedaPay dashboard. */
const MOBILE_MONEY_MODES = ["mtn_open", "moov", "mtn_ci", "moov_tg", "togocel"] as const;

const mobileMoneyInput = z.object({
  amount: z.number().int(),
  mode: z.enum(MOBILE_MONEY_MODES),
  phoneNumber: z.string().min(6),
  phoneCountry: z.string().length(2),
});

async function fetchCustomer(userId: string) {
  const [user] = await db.select({ email: users.email, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, userId));
  return user;
}

export const walletRouter = router({
  balance: protectedProcedure.query(({ ctx }) => getWalletBalance(ctx.userId).then((balance) => ({ balance }))),

  transactions: protectedProcedure.query(({ ctx }) => listLedgerEntries(ctx.userId).then((entries) => ({ entries }))),

  deposit: protectedProcedure.input(mobileMoneyInput.extend({ amount: z.number().int().min(MIN_DEPOSIT) })).mutation(async ({ ctx, input }) => {
    const user = await fetchCustomer(ctx.userId);
    try {
      const deposit = await createDeposit({
        amount: input.amount,
        description: `Dépôt Chicken Crash — ${input.amount} FCFA`,
        userId: ctx.userId,
        customer: { firstName: user.firstName, lastName: user.lastName, email: user.email, phoneNumber: input.phoneNumber, phoneCountry: input.phoneCountry },
      });
      return { paymentUrl: deposit.paymentUrl, transactionId: deposit.transactionId };
    } catch (error) {
      console.error("FedaPay deposit creation failed:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PAYMENT_PROVIDER_ERROR" });
    }
  }),

  withdraw: protectedProcedure.input(mobileMoneyInput.extend({ amount: z.number().int().min(MIN_WITHDRAWAL) })).mutation(async ({ ctx, input }) => {
    const user = await fetchCustomer(ctx.userId);

    try {
      await db.transaction((tx) => adjustWallet(tx, ctx.userId, -input.amount, { type: "withdrawal", status: "pending" }));
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "INSUFFICIENT_FUNDS" });
      }
      throw error;
    }

    if (!env.withdrawalAutoApprove) {
      return { status: "pending_review" as const };
    }

    try {
      const payout = await createPayout({
        amount: input.amount,
        mode: input.mode,
        customer: { firstName: user.firstName, lastName: user.lastName, email: user.email, phoneNumber: input.phoneNumber, phoneCountry: input.phoneCountry },
      });
      await db.transaction(async (tx) => {
        const [pendingEntry] = await tx
          .select({ id: ledgerEntries.id })
          .from(ledgerEntries)
          .where(and(eq(ledgerEntries.userId, ctx.userId), eq(ledgerEntries.type, "withdrawal"), eq(ledgerEntries.status, "pending")))
          .orderBy(desc(ledgerEntries.createdAt))
          .limit(1);
        if (pendingEntry) {
          await tx
            .update(ledgerEntries)
            .set({ status: "completed", provider: "fedapay", providerRef: String(payout.payoutId) })
            .where(eq(ledgerEntries.id, pendingEntry.id));
        }
      });
      return { status: "sent" as const, payoutId: payout.payoutId };
    } catch (error) {
      console.error("FedaPay payout failed, refunding wallet:", error);
      await db.transaction((tx) => adjustWallet(tx, ctx.userId, input.amount, { type: "adjustment", status: "completed" }));
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PAYMENT_PROVIDER_ERROR" });
    }
  }),
});
