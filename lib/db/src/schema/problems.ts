import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  constraints: text("constraints"),
  inputFormat: text("input_format"),
  outputFormat: text("output_format"),
  totalMarks: integer("total_marks").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const testCasesTable = pgTable("test_cases", {
  id: serial("id").primaryKey(),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  input: text("input").notNull().default(""),
  expectedOutput: text("expected_output").notNull(),
  marks: integer("marks").notNull().default(10),
  isSample: boolean("is_sample").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const problemBundlesTable = pgTable("problem_bundles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bundleProblemsTable = pgTable("bundle_problems", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id").notNull().references(() => problemBundlesTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
});

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id, { onDelete: "cascade" }),
  earnedMarks: integer("earned_marks").notNull().default(0),
  totalMarks: integer("total_marks").notNull().default(0),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTestCaseSchema = createInsertSchema(testCasesTable).omit({ id: true, createdAt: true });

export type Problem = typeof problemsTable.$inferSelect;
export type TestCase = typeof testCasesTable.$inferSelect;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type InsertTestCase = z.infer<typeof insertTestCaseSchema>;
export type ProblemBundle = typeof problemBundlesTable.$inferSelect;
export type BundleProblem = typeof bundleProblemsTable.$inferSelect;
