import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const instructorsTable = pgTable("instructors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  title: text("title").notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  thumbnail: text("thumbnail").notNull(),
  instructorId: integer("instructor_id").notNull().references(() => instructorsTable.id),
  category: text("category").notNull(),
  price: real("price"),
  duration: text("duration").notNull().default("0h"),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  tag: text("tag"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id),
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  duration: text("duration").notNull().default("0h"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => modulesTable.id),
  title: text("title").notNull(),
  duration: text("duration").notNull().default("0:00"),
  orderIndex: integer("order_index").notNull().default(0),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export const insertModuleSchema = createInsertSchema(modulesTable).omit({ id: true, createdAt: true });
export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true });
export const insertInstructorSchema = createInsertSchema(instructorsTable).omit({ id: true, createdAt: true });

export type Course = typeof coursesTable.$inferSelect;
export type Module = typeof modulesTable.$inferSelect;
export type Lesson = typeof lessonsTable.$inferSelect;
export type Instructor = typeof instructorsTable.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type InsertInstructor = z.infer<typeof insertInstructorSchema>;
