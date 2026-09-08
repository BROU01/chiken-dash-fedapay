import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./betterAuth";

export { isAdult } from "./auth-utils";

export interface AuthedRequest extends Request {
  userId?: string;
}

async function readUserId(req: Request): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user.id;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const userId = await readUserId(req);
  if (!userId) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return;
  }
  req.userId = userId;
  next();
}

export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  req.userId = await readUserId(req);
  next();
}
