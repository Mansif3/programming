import { Router, type IRouter } from "express";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { getSessionUserId } from "../lib/session";

const router: IRouter = Router();

router.get("/users/me", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { passwordHash: _ph, ...safe } = user;
  res.json(safe);
});

router.patch("/users/me", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const {
    name, email, bio, avatar, address, phone, password,
    addressLine1, addressLine2, city, state, zipCode, country,
    educationLevel, examTitle, institute, passingYear,
    cvLink, githubLink, portfolioLink, linkedinLink, professionalImageLink,
  } = req.body ?? {};
  const updates: Record<string, string> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "name cannot be empty" }); return;
    }
    updates.name = name.trim();
  }
  if (email !== undefined) {
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "invalid email" }); return;
    }
    const [dup] = await db.select().from(usersTable).where(and(eq(usersTable.email, email), ne(usersTable.id, userId)));
    if (dup) { res.status(409).json({ error: "email already in use" }); return; }
    updates.email = email;
  }
  if (bio !== undefined) updates.bio = bio;
  if (avatar !== undefined) updates.avatar = avatar;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) {
    const normalizedPhone = String(phone).trim();
    if (!/^\d{11}$/.test(normalizedPhone)) {
      res.status(400).json({ error: "Phone number must be exactly 11 digits" }); return;
    }
    const [dupPhone] = await db.select().from(usersTable).where(and(eq(usersTable.phone, normalizedPhone), ne(usersTable.id, userId)));
    if (dupPhone) { res.status(409).json({ error: "This phone number is already used by another account" }); return; }
    updates.phone = normalizedPhone;
  }
  if (addressLine1 !== undefined) updates.addressLine1 = addressLine1;
  if (addressLine2 !== undefined) updates.addressLine2 = addressLine2;
  if (city !== undefined) updates.city = city;
  if (state !== undefined) updates.state = state;
  if (zipCode !== undefined) updates.zipCode = zipCode;
  if (country !== undefined) updates.country = country;
  if (educationLevel !== undefined) updates.educationLevel = educationLevel;
  if (examTitle !== undefined) updates.examTitle = examTitle;
  if (institute !== undefined) updates.institute = institute;
  if (passingYear !== undefined) updates.passingYear = passingYear;
  if (cvLink !== undefined) updates.cvLink = cvLink;
  if (githubLink !== undefined) updates.githubLink = githubLink;
  if (portfolioLink !== undefined) updates.portfolioLink = portfolioLink;
  if (linkedinLink !== undefined) updates.linkedinLink = linkedinLink;
  if (professionalImageLink !== undefined) updates.professionalImageLink = professionalImageLink;
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "password must be at least 6 characters" }); return;
    }
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const { passwordHash: _ph, ...safe } = user;
  res.json(safe);
});

export default router;
