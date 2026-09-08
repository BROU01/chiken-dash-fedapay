import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { isAdult } from "./auth-utils";
import { env } from "./env";

async function createWalletForNewUser(user: { id: string }): Promise<void> {
  await db.insert(schema.wallets).values({ userId: user.id, balance: 0 });
}

export const auth = betterAuth({
  baseURL: env.appBaseUrl,
  basePath: "/api/auth",
  secret: env.betterAuthSecret,
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: true, input: true },
      lastName: { type: "string", required: true, input: true },
      phone: { type: "string", required: true, input: true },
      birthdate: { type: "string", required: true, input: true },
      depositLimitDaily: { type: "number", required: false, input: false },
      selfExcludedUntil: { type: "date", required: false, input: false },
    },
    // Chicken Crash is real-money gambling — reject signup outright for anyone under 18.
    validateUserInfo({ user, source }) {
      if (source.action !== "create-user") return;
      const birthdate = typeof user.birthdate === "string" ? user.birthdate : undefined;
      if (!birthdate || !isAdult(birthdate, 18)) {
        return { error: "MINIMUM_AGE_NOT_MET", errorDescription: "Réservé aux personnes majeures (18 ans et plus)." };
      }
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: createWalletForNewUser,
      },
    },
  },
  trustedOrigins: [env.appBaseUrl],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.isProduction,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
