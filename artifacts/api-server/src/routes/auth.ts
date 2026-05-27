import { Router, type IRouter } from "express";
import { eq, or, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable, userDevicesTable } from "@workspace/db";
import { setSessionCookie, clearSessionCookie, getSessionDeviceId } from "../lib/session";

const router: IRouter = Router();

const MAX_DEVICES = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _ph, createdAt: _ca, ...rest } = u;
  return rest;
}

function detectPlatform(userAgent: string): string {
  if (/android/i.test(userAgent)) {
    const m = userAgent.match(/Android\s([\d.]+)/i);
    return m ? `Android ${m[1].split(".")[0]}` : "Android";
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/macintosh|mac os x/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  if (/cros/i.test(userAgent)) return "ChromeOS";
  return "Unknown";
}

async function createDeviceSession(userId: number, userAgent: string) {
  const platform = detectPlatform(userAgent);
  const [device] = await db
    .insert(userDevicesTable)
    .values({ userId, platform, userAgent })
    .returning();
  return device!;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, phone, password } = req.body ?? {};
  if (typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" }); return;
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Valid email is required" }); return;
  }
  if (typeof phone !== "string" || !/^\d{11}$/.test(phone.trim())) {
    res.status(400).json({ error: "Phone number must be exactly 11 digits." }); return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" }); return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existingEmail) {
    res.status(409).json({ error: "This email is already registered" }); return;
  }

  const [existingPhone] = await db.select().from(usersTable).where(eq(usersTable.phone, normalizedPhone));
  if (existingPhone) {
    res.status(409).json({ error: "This phone number is already registered" }); return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name: name.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    passwordHash,
    role: "student",
  }).returning();
  if (!user) { res.status(500).json({ error: "Failed to create account" }); return; }

  const userAgent = req.headers["user-agent"] ?? "Unknown";
  const device = await createDeviceSession(user.id, userAgent);

  setSessionCookie(res, user.id, device.id);
  res.status(201).json(safeUser(user));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(401).json({ error: "Invalid email/phone or password" }); return;
  }

  const identifier = email.trim();
  const isEmail = EMAIL_RE.test(identifier);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      isEmail
        ? eq(usersTable.email, identifier.toLowerCase())
        : or(eq(usersTable.phone, identifier), eq(usersTable.email, identifier.toLowerCase()))!,
    );

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email/phone or password" }); return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email/phone or password" }); return;
  }
  if (user.status === "suspended") {
    res.status(403).json({ error: "Your account has been suspended. Please contact support." }); return;
  }

  const [{ value: deviceCount }] = await db
    .select({ value: count() })
    .from(userDevicesTable)
    .where(eq(userDevicesTable.userId, user.id));

  if (deviceCount >= MAX_DEVICES) {
    const devices = await db
      .select()
      .from(userDevicesTable)
      .where(eq(userDevicesTable.userId, user.id))
      .orderBy(userDevicesTable.loginAt);
    res.status(403).json({
      error: `You are already logged in on ${MAX_DEVICES} devices. Please remove a device to continue.`,
      devices: devices.map((d) => ({
        id: d.id,
        userId: d.userId,
        platform: d.platform,
        userAgent: d.userAgent,
        loginAt: d.loginAt,
        lastActiveAt: d.lastActiveAt,
        current: false,
      })),
    });
    return;
  }

  const userAgent = req.headers["user-agent"] ?? "Unknown";
  const device = await createDeviceSession(user.id, userAgent);

  setSessionCookie(res, user.id, device.id);
  res.status(200).json(safeUser(user));
});

router.post("/auth/remove-device", async (req, res): Promise<void> => {
  const { email, password, deviceId } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || typeof deviceId !== "number") {
    res.status(401).json({ error: "Invalid request" }); return;
  }

  const identifier = email.trim();
  const isEmail = EMAIL_RE.test(identifier);
  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      isEmail
        ? eq(usersTable.email, identifier.toLowerCase())
        : or(eq(usersTable.phone, identifier), eq(usersTable.email, identifier.toLowerCase()))!,
    );

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }

  const [device] = await db
    .select()
    .from(userDevicesTable)
    .where(eq(userDevicesTable.id, deviceId));

  if (!device || device.userId !== user.id) {
    res.status(404).json({ error: "Device not found" }); return;
  }

  await db.delete(userDevicesTable).where(eq(userDevicesTable.id, deviceId));
  res.status(204).end();
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const deviceId = getSessionDeviceId(req);
  if (deviceId) {
    await db.delete(userDevicesTable).where(eq(userDevicesTable.id, deviceId));
  }
  clearSessionCookie(res);
  res.status(204).end();
});

export default router;
