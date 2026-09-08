import express, { Router } from "express";
import { db } from "../../db/client";
import { parseWebhookEvent, verifyWebhookSignature } from "../fedapay";
import { adjustWallet } from "../wallet";

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
