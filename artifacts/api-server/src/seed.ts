import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./lib/logger";

const SEED_ADMINS = [
  {
    name: "Programming Poth",
    email: "programmingpoth@gmail.com",
    phone: "01964995859",
    password: "mansif2006",
    role: "admin" as const,
  },
  {
    name: "Mansif Admin",
    email: "smmansif3@gmail.com",
    phone: "01000000001",
    password: "mansif2006",
    role: "admin" as const,
  },
];

export const PROTECTED_ADMIN_EMAILS = SEED_ADMINS.map((a) => a.email);

async function ensureAdmin(admin: typeof SEED_ADMINS[number]) {
  const [existing] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.email, admin.email));

  if (existing) {
    if (existing.role !== "admin") {
      await db
        .update(usersTable)
        .set({ role: "admin" })
        .where(eq(usersTable.id, existing.id));
      logger.info({ email: admin.email }, "Seed admin: role promoted to admin");
    } else {
      logger.info({ email: admin.email }, "Seed admin: already exists");
    }
    return;
  }

  const passwordHash = await bcrypt.hash(admin.password, 10);
  await db.insert(usersTable).values({
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    passwordHash,
    role: admin.role,
    status: "active",
  });
  logger.info({ email: admin.email }, "Seed admin: created successfully");
}

export async function seedAdminUser() {
  for (const admin of SEED_ADMINS) {
    try {
      await ensureAdmin(admin);
    } catch (err) {
      logger.error({ err, email: admin.email }, "Seed admin: failed");
    }
  }
}
