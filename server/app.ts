import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import express, { type ErrorRequestHandler } from "express";
import { auth } from "./betterAuth";
import { fedapayWebhookRouter } from "./routes/webhooks";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/router";

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

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  };
  app.use(onError);

  return app;
}
