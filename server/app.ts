import { toNodeHandler } from "better-auth/node";
import express, { type ErrorRequestHandler } from "express";
import { auth } from "./betterAuth";
import { gameRouter } from "./routes/game";
import { fedapayWebhookRouter, walletRouter } from "./routes/wallet";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Both need the raw request body (HMAC verification for the webhook,
  // Better Auth's own body parsing for auth), so they're mounted before the
  // global express.json() body parser below.
  app.use("/api/wallet/webhooks", fedapayWebhookRouter);
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json());

  app.use("/api/game", gameRouter);
  app.use("/api/wallet", walletRouter);

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  };
  app.use(onError);

  return app;
}
