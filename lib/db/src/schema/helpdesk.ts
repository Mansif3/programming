import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { batchesTable } from "./batches";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  batchId: integer("batch_id").references(() => batchesTable.id),
  category: text("category").notNull().default("Others"),
  status: text("status").notNull().default("open"),
  platform: text("platform"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true });
export type Post = typeof postsTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
