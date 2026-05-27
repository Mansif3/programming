import { Router, type IRouter } from "express";
import { eq, and, ne, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  db, usersTable, enrollmentsTable,
  lessonCompletionsTable, watchSessionsTable, postsTable, commentsTable,
} from "@workspace/db";
import { PROTECTED_ADMIN_EMAILS } from "../seed";

const router: IRouter = Router();

const VALID_ROLES = ["student", "mentor", "editor", "admin", "instructor"] as const;
type Role = typeof VALID_ROLES[number];

function shape(u: typeof usersTable.$inferSelect, enrolledCount: number) {
  const { passwordHash: _ph, ...rest } = u;
  return {
    ...rest,
    enrolledCount,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  };
}

router.post("/admin/students", async (req, res): Promise<void> => {
  const { name, email, phone, password, role = "student" } = req.body as {
    name: string; email: string; phone: string; password: string; role?: string;
  };
  if (!name || !email || !phone || !password) {
    res.status(400).json({ error: "name, email, phone and password are required" }); return;
  }
  const existing = await db.select({ id: usersTable.id, email: usersTable.email, phone: usersTable.phone })
    .from(usersTable)
    .where(sql`${usersTable.email} = ${email} OR ${usersTable.phone} = ${phone}`);
  if (existing.some((u) => u.email === email)) {
    res.status(409).json({ error: "This email is already registered" }); return;
  }
  if (existing.some((u) => u.phone === phone)) {
    res.status(409).json({ error: "This phone number is already registered" }); return;
  }
  const safeRole = VALID_ROLES.includes(role as Role) ? (role as Role) : "student";
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, phone, passwordHash, role: safeRole }).returning();
  res.status(201).json(shape(user, 0));
});

router.get("/admin/students", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      u: usersTable,
      enrolled: sql<number>`COALESCE(COUNT(${enrollmentsTable.id})::int, 0)`,
    })
    .from(usersTable)
    .leftJoin(enrollmentsTable, eq(enrollmentsTable.userId, usersTable.id))
    .groupBy(usersTable.id)
    .orderBy(usersTable.id);
  res.json(rows.map((r) => shape(r.u, Number(r.enrolled))));
});

router.get("/admin/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, id));
  res.json(shape(user, Number(count)));
});

router.patch("/admin/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const {
    name, email, address, phone, bio, avatar, password, role, status,
    addressLine1, addressLine2, city, state, zipCode, country,
    educationLevel, examTitle, institute, passingYear,
    cvLink, githubLink, portfolioLink, linkedinLink, professionalImageLink,
  } = req.body ?? {};

  const [target] = await db.select({ role: usersTable.role, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, id));

  // Protect permanently-seeded admin accounts from suspension, deletion, or role demotion
  if (target?.email && PROTECTED_ADMIN_EMAILS.includes(target.email)) {
    if (status === "suspended") {
      res.status(403).json({ error: "This account is permanently protected and cannot be suspended" }); return;
    }
    if (role !== undefined && role !== "admin") {
      res.status(403).json({ error: "This account is permanently protected and its role cannot be changed" }); return;
    }
  }

  // Protect admin accounts from suspension
  if (status === "suspended") {
    if (target?.role === "admin") { res.status(403).json({ error: "Admin accounts cannot be suspended" }); return; }
  }

  const updates: Record<string, string> = {};

  if (status !== undefined) {
    if (!["active", "suspended"].includes(status)) {
      res.status(400).json({ error: "status must be active or suspended" }); return;
    }
    updates.status = status;
  }

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
    const [dup] = await db.select().from(usersTable).where(and(eq(usersTable.email, email), ne(usersTable.id, id)));
    if (dup) { res.status(409).json({ error: "email already in use" }); return; }
    updates.email = email;
  }
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) {
    const normalizedPhone = String(phone).trim();
    if (!/^\d{11}$/.test(normalizedPhone)) {
      res.status(400).json({ error: "Phone number must be exactly 11 digits" }); return;
    }
    const [dupPhone] = await db.select().from(usersTable).where(and(eq(usersTable.phone, normalizedPhone), ne(usersTable.id, id)));
    if (dupPhone) { res.status(409).json({ error: "This phone number is already used by another account" }); return; }
    updates.phone = normalizedPhone;
  }
  if (bio !== undefined) updates.bio = bio;
  if (avatar !== undefined) updates.avatar = avatar;
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
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role as Role)) {
      res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }); return;
    }
    updates.role = role;
  }

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, id));
  res.json(shape(user, Number(count)));
});

router.delete("/admin/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const user = await db.select({ id: usersTable.id, role: usersTable.role, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, id));
  if (!user.length) { res.status(404).json({ error: "Not found" }); return; }
  if (user[0]?.role === "admin") { res.status(403).json({ error: "Admin accounts cannot be deleted" }); return; }
  if (user[0]?.email && PROTECTED_ADMIN_EMAILS.includes(user[0].email)) {
    res.status(403).json({ error: "This account is permanently protected and cannot be deleted" }); return;
  }

  // cascade: delete child records before the user row
  await db.delete(watchSessionsTable).where(eq(watchSessionsTable.userId, id));
  await db.delete(lessonCompletionsTable).where(eq(lessonCompletionsTable.userId, id));
  await db.delete(enrollmentsTable).where(eq(enrollmentsTable.userId, id));
  // comments the user wrote
  await db.delete(commentsTable).where(eq(commentsTable.authorId, id));
  // comments on the user's own posts, then the posts themselves
  const userPosts = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.authorId, id));
  for (const p of userPosts) {
    await db.delete(commentsTable).where(eq(commentsTable.postId, p.id));
  }
  await db.delete(postsTable).where(eq(postsTable.authorId, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));

  res.status(204).end();
});

export default router;
