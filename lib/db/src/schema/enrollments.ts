import { pgTable, serial, timestamp, integer, real, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { coursesTable, lessonsTable } from "./courses";

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  progress: real("progress").notNull().default(0),
  lastLessonId: integer("last_lesson_id").references(() => lessonsTable.id),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonCompletionsTable = pgTable("lesson_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchSessionsTable = pgTable("watch_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id),
  minutes: integer("minutes").notNull().default(0),
  watchedAt: timestamp("watched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, enrolledAt: true });
export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
