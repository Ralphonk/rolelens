import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
export type AuthedRequest = Request & { userId?: string; sessionId?: string };
export function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32)
    throw Object.assign(
      new Error(
        "Authentication is not configured. Set a random JWT_SECRET of at least 32 characters.",
      ),
      { status: 503 },
    );
  return value;
}
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});
export async function createSession(res: Response, userId: string) {
  const key = secret(),
    id = randomUUID();
  await db().session.create({
    data: { id, userId, expiresAt: new Date(Date.now() + 7 * 86400000) },
  });
  res.cookie(
    "rolelens_session",
    jwt.sign({ sub: userId, jti: id }, key, {
      expiresIn: "7d",
      algorithm: "HS256",
      issuer: "rolelens",
      audience: "rolelens-web",
    }),
    { ...cookieOptions(), maxAge: 7 * 86400000 },
  );
}
export function clearSession(res: Response) {
  res.clearCookie("rolelens_session", cookieOptions());
}
export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.cookies.rolelens_session) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  try {
    const payload = jwt.verify(req.cookies.rolelens_session, secret(), {
      algorithms: ["HS256"],
      issuer: "rolelens",
      audience: "rolelens-web",
    });
    if (typeof payload === "string" || !payload.sub || !payload.jti)
      throw new Error("Invalid session");
    const session = await db().session.findUnique({
      where: { id: payload.jti },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.expiresAt < new Date()
    )
      throw new Error("Invalid session");
    req.userId = session.userId;
    req.sessionId = session.id;
    next();
  } catch (e) {
    if ((e as { status?: number }).status === 503) {
      next(e);
      return;
    }
    clearSession(res);
    res
      .status(401)
      .json({ error: "Your session has expired. Please sign in again." });
  }
}
