import type { Request, Response } from "express";

const COOKIE_NAME = "pp_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

const isProd = process.env.NODE_ENV === "production";

export function setSessionCookie(res: Response, userId: number, deviceId: number): void {
  res.cookie(COOKIE_NAME, `${userId}:${deviceId}`, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    signed: true,
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getSessionUserId(req: Request): number | null {
  if ((req as Request & { __sessionDeviceInvalid?: boolean }).__sessionDeviceInvalid) return null;
  const raw = req.signedCookies?.[COOKIE_NAME];
  if (!raw) return null;
  const parts = String(raw).split(":");
  const id = Number(parts[0]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function getSessionDeviceId(req: Request): number | null {
  const raw = req.signedCookies?.[COOKIE_NAME];
  if (!raw) return null;
  const parts = String(raw).split(":");
  if (parts.length < 2) return null;
  const id = Number(parts[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}
