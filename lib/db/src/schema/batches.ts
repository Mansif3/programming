import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { coursesTable, modulesTable } from "./courses";
import { problemBundlesTable } from "./problems";

export const batchesTable = pgTable("batches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: text("status").notNull().default("upcoming"),
  autoEnroll: boolean("auto_enroll").notNull().default(false),
  problemsEnabled: boolean("problems_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchStudentsTable = pgTable("batch_students", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batchesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchClassesTable = pgTable("batch_classes", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batchesTable.id),
  weekName: text("week_name"),
  moduleName: text("module_name"),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  videoUrls: text("video_urls"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchClassWatchesTable = pgTable("batch_class_watches", {
  id: serial("id").primaryKey(),
  batchClassId: integer("batch_class_id").notNull().references(() => batchClassesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  watchedAt: timestamp("watched_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tracks which course modules a student has watched in a batch
// Uses moduleId (not batch_class_id) since /my/batches/:id/classes returns module IDs
export const batchWatchedModulesTable = pgTable("batch_watched_modules", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  userId: integer("user_id").notNull(),
  moduleId: integer("module_id").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  watchedAt: timestamp("watched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchCoursesTable = pgTable("batch_courses", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batchesTable.id),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchModuleSchedulesTable = pgTable("batch_module_schedules", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batchesTable.id),
  moduleId: integer("module_id").notNull().references(() => modulesTable.id),
  publishAt: timestamp("publish_at", { withTimezone: true }),
});

export const batchProblemBundlesTable = pgTable("batch_problem_bundles", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batchesTable.id, { onDelete: "cascade" }),
  bundleId: integer("bundle_id").notNull().references(() => problemBundlesTable.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batchCertificatesTable = pgTable("batch_certificates", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().unique().references(() => batchesTable.id, { onDelete: "cascade" }),
  backgroundDataUrl: text("background_data_url"),
  fontFamily: text("font_family").notNull().default("Georgia"),
  fontColor: text("font_color").notNull().default("#1a1a2e"),
  fontSize: integer("font_size").notNull().default(48),
  minMarksPercent: integer("min_marks_percent").notNull().default(0),
  nameX: text("name_x").notNull().default("0.25"),
  nameY: text("name_y").notNull().default("0.55"),
  nameWidth: text("name_width").notNull().default("0.5"),
  nameHeight: text("name_height").notNull().default("0.12"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Batch = typeof batchesTable.$inferSelect;
export type BatchStudent = typeof batchStudentsTable.$inferSelect;
export type BatchClass = typeof batchClassesTable.$inferSelect;
export type BatchClassWatch = typeof batchClassWatchesTable.$inferSelect;
export type BatchWatchedModule = typeof batchWatchedModulesTable.$inferSelect;
export type BatchCourse = typeof batchCoursesTable.$inferSelect;
export type BatchModuleSchedule = typeof batchModuleSchedulesTable.$inferSelect;
