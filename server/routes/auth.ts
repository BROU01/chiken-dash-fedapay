import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client";
import { users, wallets } from "../../db/schema";
import { clearSessionCookie, hashPassword, isAdult, requireAuth, setSessionCookie, signSession, verifyPassword, type AuthedRequest } from "../auth";
import { getWalletBalance } from "../wallet";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6),
  birthdate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Date de naissance invalide."),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() });
    return;
  }
  const { email, password, firstName, lastName, phone, birthdate } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  if (!isAdult(birthdate, 18)) {
    res.status(403).json({ error: "MINIMUM_AGE_NOT_MET" });
    return;
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
  if (existing) {
    res.status(409).json({ error: "EMAIL_TAKEN" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({ email: normalizedEmail, phone, passwordHash, firstName, lastName, birthdate })
      .returning({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName });
    await tx.insert(wallets).values({ userId: created.id, balance: 0 });
    return created;
  });

  const token = signSession(user.id);
  setSessionCookie(res, token);
  res.status(201).json({ user, balance: 0 });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_INPUT" });
    return;
  }
  const [user] = await db
    .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()));

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "INVALID_CREDENTIALS" });
    return;
  }
  const token = signSession(user.id);
  setSessionCookie(res, token);
  const balance = await getWalletBalance(user.id);
  res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }, balance });
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const [user] = await db
    .select({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return;
  }
  const balance = await getWalletBalance(user.id);
  res.json({ user, balance });
});
