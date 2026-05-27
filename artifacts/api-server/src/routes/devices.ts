import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, userDevicesTable } from "@workspace/db";
import { getSessionUserId, getSessionDeviceId } from "../lib/session";

const router: IRouter = Router();

router.get("/devices", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const currentDeviceId = getSessionDeviceId(req);

  const devices = await db
    .select()
    .from(userDevicesTable)
    .where(eq(userDevicesTable.userId, userId))
    .orderBy(userDevicesTable.loginAt);

  res.json(devices.map((d) => ({ ...d, current: d.id === currentDeviceId })));
});

router.delete("/devices/:id", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const deviceId = Number(req.params["id"]);
  if (!Number.isFinite(deviceId) || deviceId <= 0) {
    res.status(400).json({ error: "Invalid device id" }); return;
  }

  const [deleted] = await db
    .delete(userDevicesTable)
    .where(and(eq(userDevicesTable.id, deviceId), eq(userDevicesTable.userId, userId)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Device not found" }); return; }

  const currentDeviceId = getSessionDeviceId(req);
  const wasCurrent = currentDeviceId === deviceId;
  if (wasCurrent) {
    res.clearCookie("pp_session", { path: "/" });
  }

  res.status(200).json({ wasCurrent });
});

export default router;
