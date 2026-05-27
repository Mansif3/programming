import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, userDevicesTable } from "@workspace/db";

const COOKIE_NAME = "pp_session";

/**
 * Middleware that validates the deviceId in the session cookie still exists in
 * the DB. If the device has been removed, it clears the cookie and marks the
 * request so that getSessionUserId() returns null, causing a 401 from any
 * authenticated route handler.
 */
export async function deviceGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const raw = req.signedCookies?.[COOKIE_NAME];
  if (raw) {
    const parts = String(raw).split(":");
    const deviceId = Number(parts[1]);
    if (Number.isFinite(deviceId) && deviceId > 0) {
      const [device] = await db
        .select({ id: userDevicesTable.id })
        .from(userDevicesTable)
        .where(eq(userDevicesTable.id, deviceId));

      if (!device) {
        res.clearCookie(COOKIE_NAME, { path: "/" });
        (req as Request & { __sessionDeviceInvalid?: boolean }).__sessionDeviceInvalid = true;
      }
    }
  }
  next();
}
