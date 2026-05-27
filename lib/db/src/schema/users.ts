import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  studentId: text("student_id"),
  avatar: text("avatar"),
  bio: text("bio"),
  address: text("address"),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("student"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Address fields
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
  // Education fields
  educationLevel: text("education_level"),
  examTitle: text("exam_title"),
  institute: text("institute"),
  passingYear: text("passing_year"),
  // Important links
  cvLink: text("cv_link"),
  githubLink: text("github_link"),
  portfolioLink: text("portfolio_link"),
  linkedinLink: text("linkedin_link"),
  professionalImageLink: text("professional_image_link"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const userDevicesTable = pgTable("user_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  userAgent: text("user_agent"),
  loginAt: timestamp("login_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserDevice = typeof userDevicesTable.$inferSelect;
