import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportSessionsTable = pgTable("support_sessions", {
  id: serial("id").primaryKey(),
  dayOfWeek: text("day_of_week").notNull(),
  times: text("times").array().notNull(),
  isLive: text("is_live").notNull().default("false"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({ id: true, createdAt: true });
export type Announcement = typeof announcementsTable.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
