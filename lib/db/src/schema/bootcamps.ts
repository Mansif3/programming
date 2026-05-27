import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bootcampsTable = pgTable("bootcamps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  thumbnail: text("thumbnail").notNull(),
  description: text("description"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  type: text("type").notNull().default("bootcamp"),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBootcampSchema = createInsertSchema(bootcampsTable).omit({ id: true, createdAt: true });
export type Bootcamp = typeof bootcampsTable.$inferSelect;
export type InsertBootcamp = z.infer<typeof insertBootcampSchema>;
