import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/client";
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

  if (!isAdult(birthdate, 18)) {
    res.status(403).json({ error: "MINIMUM_AGE_NOT_MET" });
    return;
  }

  const existing = await pool.query("select id from users where email = $1", [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "EMAIL_TAKEN" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `insert into users (email, phone, password_hash, first_name, last_name, birthdate)
       values ($1, $2, $3, $4, $5, $6) returning id, email, first_name, last_name`,
      [email.toLowerCase(), phone, passwordHash, firstName, lastName, birthdate],
    );
    const user = rows[0];
    await client.query("insert into wallets (user_id, balance) values ($1, 0)", [user.id]);
    await client.query("commit");

    const token = signSession(user.id);
    setSessionCookie(res, token);
    res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name }, balance: 0 });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_INPUT" });
    return;
  }
  const { rows } = await pool.query(
    "select id, email, first_name, last_name, password_hash from users where email = $1",
    [parsed.data.email.toLowerCase()],
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    res.status(401).json({ error: "INVALID_CREDENTIALS" });
    return;
  }
  const token = signSession(user.id);
  setSessionCookie(res, token);
  const balance = await getWalletBalance(user.id);
  res.json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name }, balance });
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query("select id, email, first_name, last_name from users where id = $1", [req.userId]);
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return;
  }
  const balance = await getWalletBalance(user.id);
  res.json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name }, balance });
});
