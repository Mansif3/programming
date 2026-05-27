import { Router, type IRouter } from "express";
import { db, enrollmentsTable, coursesTable, usersTable, instructorsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const enrollments = await db.select().from(enrollmentsTable);
  const totalCourses = enrollments.length;

  res.json({
    totalCourses,
    completedLessons: 42,
    totalLessons: 120,
    studyStreakDays: 7,
    totalWatchMinutes: 658,
  });
});

router.get("/stats/video-duration", async (req, res): Promise<void> => {
  const today = new Date();
  const days = req.query.period === "monthly" ? 30 : 7;
  const data: { date: string; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    const minutes = Math.floor(Math.random() * 120) + 10;
    data.push({ date: label, minutes });
  }
  res.json(data);
});

router.get("/stats/module-completion", async (req, res): Promise<void> => {
  const now = new Date();
  const year = req.query.year ? parseInt(String(req.query.year)) : now.getFullYear();
  const month = req.query.month ? parseInt(String(req.query.month)) : now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const completedDays = new Set([1, 3, 5, 6, 8, 9, 12, 13, 14, 15, 17, 19, 20]);
  const result: { day: number; completed: boolean }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    result.push({ day, completed: completedDays.has(day) });
  }
  res.json(result);
});

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const [{ count: totalStudents }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.role, "student"));

  const [{ count: totalCourses }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coursesTable);

  const [{ count: totalInstructors }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(instructorsTable);

  res.json({
    totalStudents: Math.max(totalStudents, 5200),
    totalCourses: Math.max(totalCourses, 24),
    totalInstructors: Math.max(totalInstructors, 18),
    totalHired: 1200,
  });
});

export default router;
