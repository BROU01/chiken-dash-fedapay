import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler } from "express";
import { authRouter } from "./routes/auth";
import { gameRouter } from "./routes/game";
import { fedapayWebhookRouter, walletRouter } from "./routes/wallet";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Needs the raw request body for HMAC signature verification, so it is
  // mounted before the global express.json() body parser below.
  app.use("/api/wallet/webhooks", fedapayWebhookRouter);

  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/auth", authRouter);
  app.use("/api/game", gameRouter);
  app.use("/api/wallet", walletRouter);

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  };
  app.use(onError);

  return app;
}
