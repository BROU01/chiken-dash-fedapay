import { and, desc, eq } from "drizzle-orm";
import express, { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client";
import { ledgerEntries, users } from "../../db/schema";
import { requireAuth, type AuthedRequest } from "../auth";
import { env } from "../env";
import { createDeposit, createPayout, parseWebhookEvent, verifyWebhookSignature } from "../fedapay";
import { adjustWallet, getWalletBalance, InsufficientFundsError, listLedgerEntries } from "../wallet";

export const walletRouter = Router();

const MIN_DEPOSIT = 200;
const MIN_WITHDRAWAL = 500;

/** Mobile Money operators FedaPay supports for Mobile Money Africa payments. Keep in sync with the FedaPay dashboard. */
const MOBILE_MONEY_MODES = ["mtn_open", "moov", "mtn_ci", "moov_tg", "togocel"] as const;

walletRouter.get("/balance", requireAuth, async (req: AuthedRequest, res) => {
  const balance = await getWalletBalance(req.userId!);
  res.json({ balance });
});

walletRouter.get("/transactions", requireAuth, async (req: AuthedRequest, res) => {
  const entries = await listLedgerEntries(req.userId!);
  res.json({ entries });
});

const depositSchema = z.object({
  amount: z.number().int().min(MIN_DEPOSIT),
  mode: z.enum(MOBILE_MONEY_MODES),
  phoneNumber: z.string().min(6),
  phoneCountry: z.string().length(2),
});

walletRouter.post("/deposit", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_INPUT" });
    return;
  }
  const [user] = await db
    .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, req.userId!));
  try {
    const deposit = await createDeposit({
      amount: parsed.data.amount,
      description: `Dépôt Chicken Crash — ${parsed.data.amount} FCFA`,
      userId: req.userId!,
      customer: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: parsed.data.phoneNumber,
        phoneCountry: parsed.data.phoneCountry,
      },
    });
    res.json({ paymentUrl: deposit.paymentUrl, transactionId: deposit.transactionId });
  } catch (error) {
    console.error("FedaPay deposit creation failed:", error);
    res.status(502).json({ error: "PAYMENT_PROVIDER_ERROR" });
  }
});

const withdrawSchema = z.object({
  amount: z.number().int().min(MIN_WITHDRAWAL),
  mode: z.enum(MOBILE_MONEY_MODES),
  phoneNumber: z.string().min(6),
  phoneCountry: z.string().length(2),
});

walletRouter.post("/withdraw", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_INPUT" });
    return;
  }
  const [user] = await db
    .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, req.userId!));

  try {
    await db.transaction((tx) => adjustWallet(tx, req.userId!, -parsed.data.amount, { type: "withdrawal", status: "pending" }));
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      res.status(402).json({ error: "INSUFFICIENT_FUNDS" });
      return;
    }
    throw error;
  }

  if (!env.withdrawalAutoApprove) {
    res.status(202).json({ status: "pending_review" });
    return;
  }

  try {
    const payout = await createPayout({
      amount: parsed.data.amount,
      mode: parsed.data.mode,
      customer: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: parsed.data.phoneNumber,
        phoneCountry: parsed.data.phoneCountry,
      },
    });
    await db.transaction(async (tx) => {
      const [pendingEntry] = await tx
        .select({ id: ledgerEntries.id })
        .from(ledgerEntries)
        .where(and(eq(ledgerEntries.userId, req.userId!), eq(ledgerEntries.type, "withdrawal"), eq(ledgerEntries.status, "pending")))
        .orderBy(desc(ledgerEntries.createdAt))
        .limit(1);
      if (pendingEntry) {
        await tx
          .update(ledgerEntries)
          .set({ status: "completed", provider: "fedapay", providerRef: String(payout.payoutId) })
          .where(eq(ledgerEntries.id, pendingEntry.id));
      }
    });
    res.json({ status: "sent", payoutId: payout.payoutId });
  } catch (error) {
    console.error("FedaPay payout failed, refunding wallet:", error);
    await db.transaction((tx) => adjustWallet(tx, req.userId!, parsed.data.amount, { type: "adjustment", status: "completed" }));
    res.status(502).json({ error: "PAYMENT_PROVIDER_ERROR" });
  }
});

/** Mounted with express.raw() so the exact bytes are available for signature verification. */
export const fedapayWebhookRouter = Router();
fedapayWebhookRouter.post("/fedapay", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("X-FEDAPAY-SIGNATURE");
  if (!verifyWebhookSignature(req.body, signature)) {
    res.status(401).json({ error: "INVALID_SIGNATURE" });
    return;
  }
  const event = parseWebhookEvent(req.body);
  const userId = event.entity.merchant_reference;
  const providerRef = event.entity.id ? String(event.entity.id) : undefined;

  if (event.name === "transaction.approved" && userId && providerRef && event.entity.amount) {
    try {
      await db.transaction((tx) =>
        adjustWallet(tx, String(userId), Number(event.entity.amount), {
          type: "deposit",
          status: "completed",
          provider: "fedapay",
          providerRef,
        }),
      );
    } catch (error) {
      // Unique index on (provider, provider_ref) makes this a no-op if the webhook is retried.
      console.error("Deposit credit failed (may already be applied):", error);
    }
  }

  res.status(200).json({ received: true });
});
