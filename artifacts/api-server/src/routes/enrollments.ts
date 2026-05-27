import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, enrollmentsTable, coursesTable, instructorsTable, lessonsTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

async function buildEnrollment(enrollment: typeof enrollmentsTable.$inferSelect) {
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, enrollment.courseId));
  if (!course) return null;

  const [instructor] = await db.select().from(instructorsTable).where(eq(instructorsTable.id, course.instructorId));

  let lastLessonTitle: string | null = null;
  if (enrollment.lastLessonId) {
    const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, enrollment.lastLessonId));
    if (lesson) lastLessonTitle = lesson.title;
  }

  return {
    id: enrollment.id,
    courseId: enrollment.courseId,
    course: {
      ...course,
      instructor: instructor || { id: 0, name: "Unknown", avatar: "", title: "Instructor" },
    },
    progress: enrollment.progress,
    lastLessonTitle,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  };
}

router.get("/enrollments", async (_req, res): Promise<void> => {
  const enrollments = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.userId, DEFAULT_USER_ID));
  const result = await Promise.all(enrollments.map(buildEnrollment));
  res.json(result.filter(Boolean));
});

router.get("/enrollments/:courseId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

  const [enrollment] = await db
    .select()
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, courseId));

  if (!enrollment) { res.status(404).json({ error: "Enrollment not found" }); return; }

  const result = await buildEnrollment(enrollment);
  if (!result) { res.status(404).json({ error: "Enrollment not found" }); return; }
  res.json(result);
});

export default router;
