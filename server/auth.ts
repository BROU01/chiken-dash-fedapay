import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env";

export const SESSION_COOKIE = "chiken_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: "30d" });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export interface AuthedRequest extends Request {
  userId?: string;
}

function readUserId(req: AuthedRequest): string | undefined {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return undefined;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string };
    return payload.sub;
  } catch {
    return undefined;
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const userId = readUserId(req);
  if (!userId) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return;
  }
  req.userId = userId;
  next();
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  req.userId = readUserId(req);
  next();
}

export function isAdult(birthdate: string, minAge = 18): boolean {
  const dob = new Date(birthdate);
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= minAge;
}
