import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db, batchesTable, batchClassesTable, batchStudentsTable, batchClassWatchesTable,
  batchWatchedModulesTable,
  usersTable, postsTable, commentsTable, announcementsTable,
  batchCoursesTable, batchModuleSchedulesTable, coursesTable, modulesTable, lessonsTable,
  batchProblemBundlesTable, problemBundlesTable, bundleProblemsTable, problemsTable,
  testCasesTable, submissionsTable, batchCertificatesTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { getSessionUserId } from "../lib/session";

const router: IRouter = Router();

function parsId(raw: unknown): number | null {
  const n = parseInt(String(raw), 10);
  return isNaN(n) ? null : n;
}

// List all batches with counts
router.get("/admin/batches", async (_req, res): Promise<void> => {
  const batches = await db.select().from(batchesTable).orderBy(batchesTable.id);
  const students = await db.select().from(batchStudentsTable);
  const moduleCounts = await db
    .select({ batchId: batchCoursesTable.batchId, moduleId: modulesTable.id })
    .from(batchCoursesTable)
    .innerJoin(modulesTable, eq(modulesTable.courseId, batchCoursesTable.courseId));
  const result = batches.map((b) => ({
    ...b,
    startDate: b.startDate instanceof Date ? b.startDate.toISOString() : b.startDate,
    endDate: b.endDate instanceof Date ? b.endDate.toISOString() : b.endDate,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    classCount: moduleCounts.filter((m) => m.batchId === b.id).length,
    studentCount: students.filter((s) => s.batchId === b.id).length,
  }));
  res.json(result);
});

// Create batch
router.post("/admin/batches", async (req, res): Promise<void> => {
  const { name, description, startDate, endDate, status } = req.body as {
    name: string; description?: string; startDate?: string; endDate?: string; status?: string;
  };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [batch] = await db.insert(batchesTable).values({
    name,
    description: description ?? null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    status: status ?? "upcoming",
  }).returning();
  res.status(201).json({
    ...batch,
    startDate: batch.startDate instanceof Date ? batch.startDate.toISOString() : batch.startDate,
    endDate: batch.endDate instanceof Date ? batch.endDate.toISOString() : batch.endDate,
    createdAt: batch.createdAt instanceof Date ? batch.createdAt.toISOString() : batch.createdAt,
    classCount: 0, studentCount: 0,
  });
});

// Get batch detail (with classes + students)
router.get("/admin/batches/:id", async (req, res): Promise<void> => {
  const id = parsId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [batch] = await db.select().from(batchesTable).where(eq(batchesTable.id, id));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }

  const classes = await db.select().from(batchClassesTable).where(eq(batchClassesTable.batchId, id));
  const studentRows = await db
    .select({ id: batchStudentsTable.id, batchId: batchStudentsTable.batchId, userId: batchStudentsTable.userId, joinedAt: batchStudentsTable.joinedAt, name: usersTable.name, email: usersTable.email, avatar: usersTable.avatar, studentId: usersTable.studentId })
    .from(batchStudentsTable)
    .leftJoin(usersTable, eq(usersTable.id, batchStudentsTable.userId))
    .where(eq(batchStudentsTable.batchId, id));

  res.json({
    ...batch,
    startDate: batch.startDate instanceof Date ? batch.startDate.toISOString() : batch.startDate,
    endDate: batch.endDate instanceof Date ? batch.endDate.toISOString() : batch.endDate,
    createdAt: batch.createdAt instanceof Date ? batch.createdAt.toISOString() : batch.createdAt,
    classes: classes.map((c) => ({
      ...c,
      videoUrls: c.videoUrls ? JSON.parse(c.videoUrls) : null,
      scheduledAt: c.scheduledAt instanceof Date ? c.scheduledAt.toISOString() : c.scheduledAt,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    })),
    students: studentRows.map((s) => ({
      ...s,
      joinedAt: s.joinedAt instanceof Date ? s.joinedAt.toISOString() : s.joinedAt,
    })),
  });
});

// Update batch
router.patch("/admin/batches/:id", async (req, res): Promise<void> => {
  const id = parsId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, startDate, endDate, status, problemsEnabled } = req.body as Record<string, string | boolean>;
  const update: Partial<typeof batchesTable.$inferInsert> = {};
  if (name !== undefined) update.name = name as string;
  if (description !== undefined) update.description = description as string;
  if (startDate !== undefined) update.startDate = startDate ? new Date(startDate as string) : null;
  if (endDate !== undefined) update.endDate = endDate ? new Date(endDate as string) : null;
  if (status !== undefined) update.status = status as string;
  if (problemsEnabled !== undefined) update.problemsEnabled = Boolean(problemsEnabled);
  const [batch] = await db.update(batchesTable).set(update).where(eq(batchesTable.id, id)).returning();
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    ...batch,
    startDate: batch.startDate instanceof Date ? batch.startDate.toISOString() : batch.startDate,
    endDate: batch.endDate instanceof Date ? batch.endDate.toISOString() : batch.endDate,
    createdAt: batch.createdAt instanceof Date ? batch.createdAt.toISOString() : batch.createdAt,
  });
});

// Delete batch (cascade)
router.delete("/admin/batches/:id", async (req, res): Promise<void> => {
  const id = parsId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(batchStudentsTable).where(eq(batchStudentsTable.batchId, id));
  await db.delete(batchClassesTable).where(eq(batchClassesTable.batchId, id));
  await db.delete(batchModuleSchedulesTable).where(eq(batchModuleSchedulesTable.batchId, id));
  await db.delete(batchCoursesTable).where(eq(batchCoursesTable.batchId, id));
  await db.delete(batchesTable).where(eq(batchesTable.id, id));
  res.status(204).end();
});

// Add class to batch
router.post("/admin/batches/:id/classes", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { weekName, moduleName, title, description, videoUrl, videoUrls, scheduledAt, isPublished } = req.body as {
    weekName?: string; moduleName?: string; title: string; description?: string; videoUrl?: string; videoUrls?: {title:string;url:string}[]; scheduledAt?: string; isPublished?: boolean;
  };
  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }
  const [cls] = await db.insert(batchClassesTable).values({
    batchId,
    weekName: weekName ?? null,
    moduleName: moduleName ?? null,
    title,
    description: description ?? null,
    videoUrl: videoUrl ?? null,
    videoUrls: videoUrls ? JSON.stringify(videoUrls) : null,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    isPublished: isPublished ?? false,
  }).returning();
  res.status(201).json({
    ...cls,
    videoUrls: cls.videoUrls ? JSON.parse(cls.videoUrls) : null,
    scheduledAt: cls.scheduledAt instanceof Date ? cls.scheduledAt.toISOString() : cls.scheduledAt,
    createdAt: cls.createdAt instanceof Date ? cls.createdAt.toISOString() : cls.createdAt,
  });
});

// Update batch class
router.patch("/admin/batches/:id/classes/:classId", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  const classId = parsId(req.params.classId);
  if (!batchId || !classId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { weekName, moduleName, title, description, videoUrl, videoUrls, scheduledAt, isPublished } = req.body as Record<string, unknown>;
  const update: Partial<typeof batchClassesTable.$inferInsert> = {};
  if (weekName !== undefined) update.weekName = weekName as string;
  if (moduleName !== undefined) update.moduleName = moduleName as string;
  if (title !== undefined) update.title = title as string;
  if (description !== undefined) update.description = description as string;
  if (videoUrl !== undefined) update.videoUrl = videoUrl as string;
  if (videoUrls !== undefined) update.videoUrls = videoUrls ? JSON.stringify(videoUrls) : null;
  if (scheduledAt !== undefined) update.scheduledAt = scheduledAt ? new Date(scheduledAt as string) : null;
  if (isPublished !== undefined) update.isPublished = Boolean(isPublished);
  const [cls] = await db.update(batchClassesTable).set(update)
    .where(and(eq(batchClassesTable.id, classId), eq(batchClassesTable.batchId, batchId))).returning();
  if (!cls) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    ...cls,
    videoUrls: cls.videoUrls ? JSON.parse(cls.videoUrls) : null,
    scheduledAt: cls.scheduledAt instanceof Date ? cls.scheduledAt.toISOString() : cls.scheduledAt,
    createdAt: cls.createdAt instanceof Date ? cls.createdAt.toISOString() : cls.createdAt,
  });
});

// Delete batch class
router.delete("/admin/batches/:id/classes/:classId", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  const classId = parsId(req.params.classId);
  if (!batchId || !classId) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(batchClassesTable)
    .where(and(eq(batchClassesTable.id, classId), eq(batchClassesTable.batchId, batchId)));
  res.status(204).end();
});

// Add student to batch
router.post("/admin/batches/:id/students", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { userId } = req.body as { userId: number };
  if (!userId) { res.status(400).json({ error: "userId is required" }); return; }

  // Fetch batch info for ID generation
  const [batch] = await db.select().from(batchesTable).where(eq(batchesTable.id, batchId));
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }

  // Count existing students in this batch for sequential number
  const existing = await db.select({ id: batchStudentsTable.id })
    .from(batchStudentsTable).where(eq(batchStudentsTable.batchId, batchId));
  const seqNum = existing.length + 1;

  // Generate student ID: first letter of batch name + batch id + zero-padded seq
  const firstLetter = batch.name.trim()[0]?.toUpperCase() ?? "X";
  const generatedStudentId = `${firstLetter}-${batchId}-${String(seqNum).padStart(3, "0")}`;

  // Save student ID to user record (only if user doesn't already have one)
  const [user] = await db.select({ studentId: usersTable.studentId })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (user && !user.studentId) {
    await db.update(usersTable)
      .set({ studentId: generatedStudentId })
      .where(eq(usersTable.id, userId));
  }

  const [row] = await db.insert(batchStudentsTable).values({ batchId, userId }).returning();
  res.status(201).json({
    ...row,
    studentId: user?.studentId ?? generatedStudentId,
    joinedAt: row.joinedAt instanceof Date ? row.joinedAt.toISOString() : row.joinedAt,
  });
});

// Remove student from batch
router.delete("/admin/batches/:id/students/:userId", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  const userId = parsId(req.params.userId);
  if (!batchId || !userId) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(batchStudentsTable)
    .where(and(eq(batchStudentsTable.batchId, batchId), eq(batchStudentsTable.userId, userId)));
  res.status(204).end();
});

// All modules from linked courses (admin Classes tab)
router.get("/admin/batches/:id/modules", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db
    .select({
      moduleId: modulesTable.id,
      courseId: coursesTable.id,
      courseTitle: coursesTable.title,
      courseThumbnail: coursesTable.thumbnail,
      title: modulesTable.title,
      weekNumber: modulesTable.weekNumber,
      orderIndex: modulesTable.orderIndex,
      batchPublishAt: batchModuleSchedulesTable.publishAt,
    })
    .from(batchCoursesTable)
    .innerJoin(coursesTable, eq(coursesTable.id, batchCoursesTable.courseId))
    .innerJoin(modulesTable, eq(modulesTable.courseId, coursesTable.id))
    .leftJoin(batchModuleSchedulesTable, and(
      eq(batchModuleSchedulesTable.batchId, batchId),
      eq(batchModuleSchedulesTable.moduleId, modulesTable.id)
    ))
    .where(eq(batchCoursesTable.batchId, batchId))
    .orderBy(coursesTable.id, modulesTable.weekNumber, modulesTable.orderIndex);
  res.json(rows.map((r) => ({
    ...r,
    batchPublishAt: r.batchPublishAt instanceof Date ? r.batchPublishAt.toISOString() : r.batchPublishAt,
  })));
});

// ─── Batch-Course linking (admin) ────────────────────────────────────────────

// List courses in a batch
router.get("/admin/batches/:id/courses", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select({
    id: batchCoursesTable.id,
    batchId: batchCoursesTable.batchId,
    courseId: batchCoursesTable.courseId,
    addedAt: batchCoursesTable.addedAt,
    courseTitle: coursesTable.title,
    courseSlug: coursesTable.slug,
    courseThumbnail: coursesTable.thumbnail,
    courseCategory: coursesTable.category,
  })
    .from(batchCoursesTable)
    .leftJoin(coursesTable, eq(coursesTable.id, batchCoursesTable.courseId))
    .where(eq(batchCoursesTable.batchId, batchId));
  res.json(rows.map((r) => ({ ...r, addedAt: r.addedAt instanceof Date ? r.addedAt.toISOString() : r.addedAt })));
});

// Add course to batch
router.post("/admin/batches/:id/courses", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { courseId } = req.body as { courseId: number };
  if (!courseId) { res.status(400).json({ error: "courseId is required" }); return; }
  const existing = await db.select({ id: batchCoursesTable.id })
    .from(batchCoursesTable)
    .where(and(eq(batchCoursesTable.batchId, batchId), eq(batchCoursesTable.courseId, courseId)));
  if (existing.length > 0) { res.status(409).json({ error: "Course already in batch" }); return; }
  const [row] = await db.insert(batchCoursesTable).values({ batchId, courseId }).returning();
  res.status(201).json({ ...row, addedAt: row.addedAt instanceof Date ? row.addedAt.toISOString() : row.addedAt });
});

// Remove course from batch
router.delete("/admin/batches/:id/courses/:courseId", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  const courseId = parsId(req.params.courseId);
  if (!batchId || !courseId) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(batchCoursesTable)
    .where(and(eq(batchCoursesTable.batchId, batchId), eq(batchCoursesTable.courseId, courseId)));
  res.status(204).end();
});

// Get modules of a course with batch-specific publish dates (admin)
router.get("/admin/batches/:id/courses/:courseId/modules", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  const courseId = parsId(req.params.courseId);
  if (!batchId || !courseId) { res.status(400).json({ error: "Invalid id" }); return; }
  const modules = await db.select()
    .from(modulesTable)
    .where(eq(modulesTable.courseId, courseId))
    .orderBy(modulesTable.weekNumber, modulesTable.orderIndex);
  const schedules = await db.select()
    .from(batchModuleSchedulesTable)
    .where(eq(batchModuleSchedulesTable.batchId, batchId));
  const result = modules.map((m) => {
    const sched = schedules.find((s) => s.moduleId === m.id);
    return {
      ...m,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      batchPublishAt: sched?.publishAt instanceof Date ? sched.publishAt.toISOString() : (sched?.publishAt ?? null),
    };
  });
  res.json(result);
});

// Set (upsert) module publish date for a batch (admin)
router.put("/admin/batches/:id/modules/:moduleId/schedule", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  const moduleId = parsId(req.params.moduleId);
  if (!batchId || !moduleId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { publishAt } = req.body as { publishAt?: string | null };
  const publishAtDate = publishAt ? new Date(publishAt) : null;
  const existing = await db.select({ id: batchModuleSchedulesTable.id })
    .from(batchModuleSchedulesTable)
    .where(and(eq(batchModuleSchedulesTable.batchId, batchId), eq(batchModuleSchedulesTable.moduleId, moduleId)));
  if (existing.length > 0) {
    await db.update(batchModuleSchedulesTable)
      .set({ publishAt: publishAtDate })
      .where(and(eq(batchModuleSchedulesTable.batchId, batchId), eq(batchModuleSchedulesTable.moduleId, moduleId)));
  } else {
    await db.insert(batchModuleSchedulesTable).values({ batchId, moduleId, publishAt: publishAtDate });
  }
  res.json({ batchId, moduleId, publishAt: publishAtDate ? publishAtDate.toISOString() : null });
});

// ─── Student-facing routes ────────────────────────────────────────────────────

// Student: get batch courses (modules gated by publishAt)
router.get("/batches/:id/courses", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const enrolled = await checkEnrolled(batchId, userId);
  if (!enrolled) { res.status(403).json({ error: "Not enrolled" }); return; }
  const batchCourseRows = await db.select({
    courseId: batchCoursesTable.courseId,
    courseTitle: coursesTable.title,
    courseSlug: coursesTable.slug,
    courseThumbnail: coursesTable.thumbnail,
  })
    .from(batchCoursesTable)
    .leftJoin(coursesTable, eq(coursesTable.id, batchCoursesTable.courseId))
    .where(eq(batchCoursesTable.batchId, batchId));

  const now = new Date();
  const allSchedules = await db.select()
    .from(batchModuleSchedulesTable)
    .where(eq(batchModuleSchedulesTable.batchId, batchId));

  const result = await Promise.all(
    batchCourseRows.map(async (bc) => {
      if (!bc.courseId) return null;
      const modules = await db.select().from(modulesTable)
        .where(eq(modulesTable.courseId, bc.courseId))
        .orderBy(modulesTable.weekNumber, modulesTable.orderIndex);
      const visibleModules = await Promise.all(
        modules
          .filter((m) => {
            const sched = allSchedules.find((s) => s.moduleId === m.id);
            if (!sched || !sched.publishAt) return true;
            return new Date(sched.publishAt) <= now;
          })
          .map(async (mod) => {
            const lessons = await db.select().from(lessonsTable)
              .where(eq(lessonsTable.moduleId, mod.id))
              .orderBy(lessonsTable.orderIndex);
            const sched = allSchedules.find((s) => s.moduleId === mod.id);
            return {
              ...mod,
              createdAt: mod.createdAt instanceof Date ? mod.createdAt.toISOString() : mod.createdAt,
              batchPublishAt: sched?.publishAt instanceof Date ? sched.publishAt.toISOString() : (sched?.publishAt ?? null),
              lessons,
            };
          })
      );
      return {
        courseId: bc.courseId,
        title: bc.courseTitle,
        slug: bc.courseSlug,
        thumbnail: bc.courseThumbnail,
        modules: visibleModules,
      };
    })
  );
  res.json(result.filter(Boolean));
});

// Helper: check enrollment
async function checkEnrolled(batchId: number, userId: number) {
  const rows = await db.select({ id: batchStudentsTable.id }).from(batchStudentsTable)
    .where(and(eq(batchStudentsTable.batchId, batchId), eq(batchStudentsTable.userId, userId)));
  return rows.length > 0;
}

// My enrolled batches
router.get("/my/batches", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const rows = await db
    .select({ id: batchesTable.id, name: batchesTable.name, description: batchesTable.description, startDate: batchesTable.startDate, endDate: batchesTable.endDate, status: batchesTable.status, createdAt: batchesTable.createdAt, problemsEnabled: batchesTable.problemsEnabled })
    .from(batchStudentsTable)
    .innerJoin(batchesTable, eq(batchesTable.id, batchStudentsTable.batchId))
    .where(eq(batchStudentsTable.userId, userId))
    .orderBy(batchesTable.id);
  const moduleCounts = await db
    .select({ batchId: batchCoursesTable.batchId, moduleId: modulesTable.id })
    .from(batchCoursesTable)
    .innerJoin(modulesTable, eq(modulesTable.courseId, batchCoursesTable.courseId));
  const schedules = await db.select().from(batchModuleSchedulesTable);
  const now = new Date();
  res.json(rows.map((b) => ({
    ...b,
    startDate: b.startDate instanceof Date ? b.startDate.toISOString() : b.startDate,
    endDate: b.endDate instanceof Date ? b.endDate.toISOString() : b.endDate,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    classCount: moduleCounts.filter((m) => {
      if (m.batchId !== b.id) return false;
      const sched = schedules.find((s) => s.batchId === b.id && s.moduleId === m.moduleId);
      return !sched?.publishAt || new Date(sched.publishAt) <= now;
    }).length,
  })));
});

// Classes for a batch (only if enrolled) — returns course modules as class entries
router.get("/my/batches/:id/classes", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const enrolled = await db.select({ id: batchStudentsTable.id }).from(batchStudentsTable)
    .where(and(eq(batchStudentsTable.batchId, batchId), eq(batchStudentsTable.userId, userId)));
  if (!enrolled.length) { res.status(403).json({ error: "Not enrolled in this batch" }); return; }

  // Fetch all modules from linked courses with schedules
  const moduleRows = await db
    .select({
      moduleId: modulesTable.id,
      title: modulesTable.title,
      weekNumber: modulesTable.weekNumber,
      orderIndex: modulesTable.orderIndex,
      createdAt: modulesTable.createdAt,
      publishAt: batchModuleSchedulesTable.publishAt,
    })
    .from(batchCoursesTable)
    .innerJoin(modulesTable, eq(modulesTable.courseId, batchCoursesTable.courseId))
    .leftJoin(batchModuleSchedulesTable, and(
      eq(batchModuleSchedulesTable.batchId, batchId),
      eq(batchModuleSchedulesTable.moduleId, modulesTable.id)
    ))
    .where(eq(batchCoursesTable.batchId, batchId))
    .orderBy(modulesTable.weekNumber, modulesTable.orderIndex);

  const now = new Date();

  // Fetch lessons for all modules — locked ones get no videos
  const result = await Promise.all(
    moduleRows.map(async (m) => {
      const publishAt = m.publishAt instanceof Date ? m.publishAt : (m.publishAt ? new Date(m.publishAt) : null);
      const isLocked = publishAt !== null && publishAt > now;
      const lessons = isLocked ? [] : await db.select({
        id: lessonsTable.id, title: lessonsTable.title,
        videoUrl: lessonsTable.videoUrl, orderIndex: lessonsTable.orderIndex,
      }).from(lessonsTable).where(eq(lessonsTable.moduleId, m.moduleId)).orderBy(lessonsTable.orderIndex);
      return {
        id: m.moduleId,
        batchId,
        weekName: `Week ${m.weekNumber}`,
        moduleName: m.title,
        title: m.title,
        videoUrl: lessons[0]?.videoUrl ?? null,
        videoUrls: lessons.map((l) => ({ title: l.title, url: l.videoUrl ?? "" })),
        isPublished: !isLocked,
        isLocked,
        scheduledAt: publishAt ? publishAt.toISOString() : null,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      };
    })
  );
  res.json(result);
});

// Batch helpdesk: list posts (only if enrolled)
router.get("/my/batches/:id/helpdesk", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const enrolled = await db.select({ id: batchStudentsTable.id }).from(batchStudentsTable)
    .where(and(eq(batchStudentsTable.batchId, batchId), eq(batchStudentsTable.userId, userId)));
  if (!enrolled.length) { res.status(403).json({ error: "Not enrolled in this batch" }); return; }
  const posts = await db
    .select({ p: postsTable, name: usersTable.name, avatar: usersTable.avatar })
    .from(postsTable)
    .leftJoin(usersTable, eq(usersTable.id, postsTable.authorId))
    .where(eq(postsTable.batchId, batchId))
    .orderBy(postsTable.createdAt);
  const allComments = await db.select().from(commentsTable);
  res.json(posts.map(({ p, name, avatar }) => ({
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    authorName: name,
    authorAvatar: avatar,
    commentCount: allComments.filter((c) => c.postId === p.id).length,
  })));
});

// Batch helpdesk: create post
router.post("/my/batches/:id/helpdesk", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const enrolled = await db.select({ id: batchStudentsTable.id }).from(batchStudentsTable)
    .where(and(eq(batchStudentsTable.batchId, batchId), eq(batchStudentsTable.userId, userId)));
  if (!enrolled.length) { res.status(403).json({ error: "Not enrolled in this batch" }); return; }
  const { title, content, category } = req.body as { title: string; content: string; category?: string };
  if (!title?.trim() || !content?.trim()) { res.status(400).json({ error: "title and content are required" }); return; }
  const [post] = await db.insert(postsTable).values({
    title, content, authorId: userId, batchId, category: category ?? "Others",
  }).returning();
  res.status(201).json({
    ...post,
    createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
  });
});

// Batch helpdesk: list comments for a post
router.get("/my/batches/:id/helpdesk/:postId/comments", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  const postId = parsId(req.params.postId);
  if (!batchId || !postId) { res.status(400).json({ error: "Invalid id" }); return; }
  const enrolled = await db.select({ id: batchStudentsTable.id }).from(batchStudentsTable)
    .where(and(eq(batchStudentsTable.batchId, batchId), eq(batchStudentsTable.userId, userId)));
  if (!enrolled.length) { res.status(403).json({ error: "Not enrolled in this batch" }); return; }
  const rows = await db
    .select({ c: commentsTable, name: usersTable.name, avatar: usersTable.avatar })
    .from(commentsTable)
    .leftJoin(usersTable, eq(usersTable.id, commentsTable.authorId))
    .where(eq(commentsTable.postId, postId))
    .orderBy(commentsTable.createdAt);
  res.json(rows.map(({ c, name, avatar }) => ({
    ...c,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    authorName: name,
    authorAvatar: avatar,
  })));
});

// Batch helpdesk: add comment
router.post("/my/batches/:id/helpdesk/:postId/comments", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  const postId = parsId(req.params.postId);
  if (!batchId || !postId) { res.status(400).json({ error: "Invalid id" }); return; }
  const enrolled = await db.select({ id: batchStudentsTable.id }).from(batchStudentsTable)
    .where(and(eq(batchStudentsTable.batchId, batchId), eq(batchStudentsTable.userId, userId)));
  if (!enrolled.length) { res.status(403).json({ error: "Not enrolled" }); return; }
  const { content } = req.body as { content: string };
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }
  const [comment] = await db.insert(commentsTable).values({ postId, content, authorId: userId }).returning();
  res.status(201).json({
    ...comment,
    createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
  });
});

// Batch stats: progress % + weekly video duration
router.get("/my/batches/:id/stats", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!(await checkEnrolled(batchId, userId))) { res.status(403).json({ error: "Not enrolled" }); return; }

  // Count total modules linked to this batch via batch_courses
  const moduleRows = await db
    .select({ moduleId: modulesTable.id })
    .from(batchCoursesTable)
    .innerJoin(modulesTable, eq(modulesTable.courseId, batchCoursesTable.courseId))
    .where(eq(batchCoursesTable.batchId, batchId));

  const allModuleIds = new Set(moduleRows.map((m) => m.moduleId));
  const totalCount = allModuleIds.size;

  // Get watched modules for this user+batch
  const watches = await db.select()
    .from(batchWatchedModulesTable)
    .where(and(
      eq(batchWatchedModulesTable.userId, userId),
      eq(batchWatchedModulesTable.batchId, batchId),
    ));

  const watchedClassIds = new Set(watches.map((w) => w.moduleId));
  const watchedCount = watchedClassIds.size;
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  // Last 7 days duration per day
  const days: { date: string; minutes: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const mins = watches
      .filter((w) => {
        const wd = new Date(w.watchedAt).toISOString().slice(0, 10);
        return wd === dateStr;
      })
      .reduce((sum, w) => sum + w.durationMinutes, 0);
    days.push({ date: dateStr, minutes: mins });
  }

  res.json({ watchedCount, totalCount, progressPercent, weeklyDuration: days, watchedClassIds: [...watchedClassIds] });
});

// Batch announcements (global announcements, latest 5)
router.get("/my/batches/:id/announcements", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!(await checkEnrolled(batchId, userId))) { res.status(403).json({ error: "Not enrolled" }); return; }

  const rows = await db.select().from(announcementsTable)
    .orderBy(sql`${announcementsTable.createdAt} DESC`);

  res.json(rows.map((a) => ({
    ...a,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  })));
});

// Mark batch class (module) as watched
router.post("/my/batches/:id/classes/:classId/watch", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  const moduleId = parsId(req.params.classId); // classId is actually moduleId
  if (!batchId || !moduleId) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!(await checkEnrolled(batchId, userId))) { res.status(403).json({ error: "Not enrolled" }); return; }

  const { durationMinutes } = req.body as { durationMinutes?: number };

  // Upsert: insert only if not already watched
  const existing = await db.select().from(batchWatchedModulesTable)
    .where(and(
      eq(batchWatchedModulesTable.moduleId, moduleId),
      eq(batchWatchedModulesTable.userId, userId),
      eq(batchWatchedModulesTable.batchId, batchId),
    ));

  if (!existing.length) {
    await db.insert(batchWatchedModulesTable).values({
      batchId,
      moduleId,
      userId,
      durationMinutes: durationMinutes ?? 0,
    });
  } else {
    const best = existing.reduce((max, w) => w.durationMinutes > max.durationMinutes ? w : max, existing[0]);
    if ((durationMinutes ?? 0) > best.durationMinutes) {
      await db.update(batchWatchedModulesTable)
        .set({ durationMinutes: durationMinutes ?? 0, watchedAt: new Date() })
        .where(eq(batchWatchedModulesTable.id, best.id));
    }
  }

  res.json({ ok: true });
});

// ─── Admin: Batch Problem Bundle assignments ──────────────────────────────────

router.get("/admin/batches/:id/problem-bundles", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select({
    id: batchProblemBundlesTable.id,
    batchId: batchProblemBundlesTable.batchId,
    bundleId: batchProblemBundlesTable.bundleId,
    startAt: batchProblemBundlesTable.startAt,
    endAt: batchProblemBundlesTable.endAt,
    createdAt: batchProblemBundlesTable.createdAt,
    bundleTitle: problemBundlesTable.title,
    bundleDescription: problemBundlesTable.description,
  })
    .from(batchProblemBundlesTable)
    .innerJoin(problemBundlesTable, eq(problemBundlesTable.id, batchProblemBundlesTable.bundleId))
    .where(eq(batchProblemBundlesTable.batchId, batchId))
    .orderBy(batchProblemBundlesTable.id);

  const withCounts = await Promise.all(
    rows.map(async (r) => {
      const items = await db.select({ id: bundleProblemsTable.id })
        .from(bundleProblemsTable).where(eq(bundleProblemsTable.bundleId, r.bundleId));
      return {
        ...r,
        startAt: r.startAt instanceof Date ? r.startAt.toISOString() : r.startAt,
        endAt: r.endAt instanceof Date ? r.endAt.toISOString() : r.endAt,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        problemCount: items.length,
      };
    })
  );
  res.json(withCounts);
});

router.post("/admin/batches/:id/problem-bundles", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { bundleId, startAt, endAt } = req.body as { bundleId?: number; startAt?: string; endAt?: string };
  if (!bundleId) { res.status(400).json({ error: "bundleId is required" }); return; }
  const [row] = await db.insert(batchProblemBundlesTable).values({
    batchId,
    bundleId,
    startAt: startAt ? new Date(startAt) : null,
    endAt: endAt ? new Date(endAt) : null,
  }).returning();
  res.status(201).json({
    ...row,
    startAt: row.startAt instanceof Date ? row.startAt.toISOString() : row.startAt,
    endAt: row.endAt instanceof Date ? row.endAt.toISOString() : row.endAt,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  });
});

router.patch("/admin/batches/:id/problem-bundles/:assignmentId", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  const assignmentId = parsId(req.params.assignmentId);
  if (!batchId || !assignmentId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { startAt, endAt } = req.body as { startAt?: string | null; endAt?: string | null };
  const updates: Record<string, unknown> = {};
  if (startAt !== undefined) updates.startAt = startAt ? new Date(startAt) : null;
  if (endAt !== undefined) updates.endAt = endAt ? new Date(endAt) : null;
  const [row] = await db.update(batchProblemBundlesTable).set(updates)
    .where(and(eq(batchProblemBundlesTable.id, assignmentId), eq(batchProblemBundlesTable.batchId, batchId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    ...row,
    startAt: row.startAt instanceof Date ? row.startAt.toISOString() : row.startAt,
    endAt: row.endAt instanceof Date ? row.endAt.toISOString() : row.endAt,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  });
});

router.delete("/admin/batches/:id/problem-bundles/:assignmentId", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  const assignmentId = parsId(req.params.assignmentId);
  if (!batchId || !assignmentId) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(batchProblemBundlesTable)
    .where(and(eq(batchProblemBundlesTable.id, assignmentId), eq(batchProblemBundlesTable.batchId, batchId)));
  res.status(204).end();
});

// ─── Student: Batch Problems ──────────────────────────────────────────────────

router.get("/my/batches/:id/problems", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!(await checkEnrolled(batchId, userId))) { res.status(403).json({ error: "Not enrolled" }); return; }

  const assignments = await db.select({
    id: batchProblemBundlesTable.id,
    bundleId: batchProblemBundlesTable.bundleId,
    startAt: batchProblemBundlesTable.startAt,
    endAt: batchProblemBundlesTable.endAt,
    bundleTitle: problemBundlesTable.title,
    bundleDescription: problemBundlesTable.description,
  })
    .from(batchProblemBundlesTable)
    .innerJoin(problemBundlesTable, eq(problemBundlesTable.id, batchProblemBundlesTable.bundleId))
    .where(eq(batchProblemBundlesTable.batchId, batchId))
    .orderBy(batchProblemBundlesTable.id);

  const now = new Date();
  const result = await Promise.all(
    assignments.map(async (a) => {
      const startAt = a.startAt ? new Date(a.startAt) : null;
      const endAt = a.endAt ? new Date(a.endAt) : null;
      const isActive = (!startAt || now >= startAt) && (!endAt || now <= endAt);
      const isExpired = endAt ? now > endAt : false;
      const isUpcoming = startAt ? now < startAt : false;

      const problemRows = await db.select({
        id: problemsTable.id,
        title: problemsTable.title,
        description: problemsTable.description,
        constraints: problemsTable.constraints,
        inputFormat: problemsTable.inputFormat,
        outputFormat: problemsTable.outputFormat,
        totalMarks: problemsTable.totalMarks,
        orderIndex: bundleProblemsTable.orderIndex,
      })
        .from(bundleProblemsTable)
        .innerJoin(problemsTable, eq(problemsTable.id, bundleProblemsTable.problemId))
        .where(eq(bundleProblemsTable.bundleId, a.bundleId))
        .orderBy(bundleProblemsTable.orderIndex, bundleProblemsTable.id);

      return {
        assignmentId: a.id,
        bundleId: a.bundleId,
        bundleTitle: a.bundleTitle,
        bundleDescription: a.bundleDescription,
        startAt: startAt ? startAt.toISOString() : null,
        endAt: endAt ? endAt.toISOString() : null,
        testCasesVisible: isActive,
        isExpired,
        isUpcoming,
        problems: problemRows,
      };
    })
  );

  res.json(result);
});

// ── Admin: Certificate config ─────────────────────────────────────────────────

router.get("/admin/batches/:id/certificate", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const [cert] = await db.select().from(batchCertificatesTable).where(eq(batchCertificatesTable.batchId, batchId));
  res.json(cert ?? null);
});

router.post("/admin/batches/:id/certificate", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }
  const { backgroundDataUrl, fontFamily, fontColor, fontSize, minMarksPercent, nameX, nameY, nameWidth, nameHeight } = req.body as Record<string, unknown>;
  const [existing] = await db.select({ id: batchCertificatesTable.id }).from(batchCertificatesTable).where(eq(batchCertificatesTable.batchId, batchId));
  let cert;
  if (existing) {
    const updates: Record<string, unknown> = {};
    if (backgroundDataUrl !== undefined) updates.backgroundDataUrl = backgroundDataUrl;
    if (fontFamily !== undefined) updates.fontFamily = fontFamily;
    if (fontColor !== undefined) updates.fontColor = fontColor;
    if (fontSize !== undefined) updates.fontSize = Number(fontSize);
    if (minMarksPercent !== undefined) updates.minMarksPercent = Number(minMarksPercent);
    if (nameX !== undefined) updates.nameX = String(nameX);
    if (nameY !== undefined) updates.nameY = String(nameY);
    if (nameWidth !== undefined) updates.nameWidth = String(nameWidth);
    if (nameHeight !== undefined) updates.nameHeight = String(nameHeight);
    [cert] = await db.update(batchCertificatesTable).set(updates).where(eq(batchCertificatesTable.id, existing.id)).returning();
  } else {
    [cert] = await db.insert(batchCertificatesTable).values({
      batchId,
      backgroundDataUrl: backgroundDataUrl as string ?? null,
      fontFamily: (fontFamily as string) ?? "Georgia",
      fontColor: (fontColor as string) ?? "#1a1a2e",
      fontSize: Number(fontSize ?? 48),
      minMarksPercent: Number(minMarksPercent ?? 0),
      nameX: String(nameX ?? "0.25"),
      nameY: String(nameY ?? "0.55"),
      nameWidth: String(nameWidth ?? "0.5"),
      nameHeight: String(nameHeight ?? "0.12"),
    }).returning();
  }
  res.json(cert);
});

// ── Student: certificates ─────────────────────────────────────────────────────

async function getStudentMarksForBatch(batchId: number, userId: number): Promise<{ earnedMarks: number; totalMarks: number; percentage: number }> {
  const bundleRows = await db.select({ bundleId: batchProblemBundlesTable.bundleId }).from(batchProblemBundlesTable).where(eq(batchProblemBundlesTable.batchId, batchId));
  const bundleIds = bundleRows.map((r) => r.bundleId);
  if (!bundleIds.length) return { earnedMarks: 0, totalMarks: 0, percentage: 0 };
  const rows = await db.select({ id: problemsTable.id, totalMarks: problemsTable.totalMarks })
    .from(bundleProblemsTable)
    .innerJoin(problemsTable, eq(problemsTable.id, bundleProblemsTable.problemId))
    .where(sql`${bundleProblemsTable.bundleId} = ANY(ARRAY[${sql.raw(bundleIds.join(","))}]::int[])`);
  const seen = new Set<number>();
  const problems: { id: number; totalMarks: number }[] = [];
  for (const r of rows) { if (!seen.has(r.id)) { seen.add(r.id); problems.push(r); } }
  let batchTotal = 0;
  for (const p of problems) {
    const tcs = await db.select({ marks: testCasesTable.marks }).from(testCasesTable).where(eq(testCasesTable.problemId, p.id));
    batchTotal += tcs.reduce((s, t) => s + t.marks, 0) || p.totalMarks;
  }
  const problemIds = problems.map((p) => p.id);
  let earned = 0;
  if (problemIds.length) {
    const subs = await db.select({ earnedMarks: submissionsTable.earnedMarks }).from(submissionsTable)
      .where(and(eq(submissionsTable.userId, userId), sql`${submissionsTable.problemId} = ANY(ARRAY[${sql.raw(problemIds.join(","))}]::int[])`));
    earned = subs.reduce((a, s) => a + s.earnedMarks, 0);
  }
  return { earnedMarks: earned, totalMarks: batchTotal, percentage: batchTotal > 0 ? Math.round((earned / batchTotal) * 100) : 0 };
}

router.get("/my/certificates", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const enrollments = await db.select({ batchId: batchStudentsTable.batchId })
    .from(batchStudentsTable).where(eq(batchStudentsTable.userId, userId));
  const result = await Promise.all(enrollments.map(async ({ batchId }) => {
    const [cert] = await db.select().from(batchCertificatesTable).where(eq(batchCertificatesTable.batchId, batchId));
    if (!cert) return null;
    const [batch] = await db.select({ name: batchesTable.name, status: batchesTable.status, endDate: batchesTable.endDate, problemsEnabled: batchesTable.problemsEnabled })
      .from(batchesTable).where(eq(batchesTable.id, batchId));
    const batchEnded = batch.status === "ended" || !!(batch.endDate && new Date(batch.endDate) < new Date());
    const marks = await getStudentMarksForBatch(batchId, userId);
    // If Problems Access is OFF, skip marks check — certificate is granted automatically when batch ends
    const eligible = batch.problemsEnabled === false
      ? batchEnded
      : batchEnded && marks.percentage >= cert.minMarksPercent;
    return { batchId, batchName: batch.name, batchEnded, problemsEnabled: batch.problemsEnabled, cert, marks, eligible };
  }));
  res.json(result.filter(Boolean));
});

// Admin: student marks for a batch
router.get("/admin/batches/:id/student-marks", async (req, res): Promise<void> => {
  const batchId = parsId(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }

  // All students enrolled in this batch
  const students = await db.select({
    userId: batchStudentsTable.userId,
    name: usersTable.name,
    email: usersTable.email,
    avatar: usersTable.avatar,
    studentId: usersTable.studentId,
  })
    .from(batchStudentsTable)
    .leftJoin(usersTable, eq(usersTable.id, batchStudentsTable.userId))
    .where(eq(batchStudentsTable.batchId, batchId));

  // All problems that belong to bundles assigned to this batch
  const bundleRows = await db.select({ bundleId: batchProblemBundlesTable.bundleId })
    .from(batchProblemBundlesTable)
    .where(eq(batchProblemBundlesTable.batchId, batchId));
  const bundleIds = bundleRows.map((r) => r.bundleId);

  let problems: { id: number; title: string; totalMarks: number }[] = [];
  if (bundleIds.length > 0) {
    const rows = await db.select({
      id: problemsTable.id,
      title: problemsTable.title,
      totalMarks: problemsTable.totalMarks,
    })
      .from(bundleProblemsTable)
      .innerJoin(problemsTable, eq(problemsTable.id, bundleProblemsTable.problemId))
      .where(sql`${bundleProblemsTable.bundleId} = ANY(ARRAY[${sql.raw(bundleIds.join(","))}]::int[])`);
    // Deduplicate by problem id (a problem could be in multiple bundles)
    const seen = new Set<number>();
    for (const r of rows) {
      if (!seen.has(r.id)) { seen.add(r.id); problems.push(r); }
    }
  }

  // Compute total possible marks from test cases
  let batchTotalMarks = 0;
  for (const p of problems) {
    const tcs = await db.select({ marks: testCasesTable.marks })
      .from(testCasesTable).where(eq(testCasesTable.problemId, p.id));
    const sum = tcs.reduce((s, t) => s + t.marks, 0);
    batchTotalMarks += sum || p.totalMarks;
  }

  const problemIds = problems.map((p) => p.id);

  // For each student, sum best submission marks
  const result = await Promise.all(students.map(async (s) => {
    let earnedMarks = 0;
    if (problemIds.length > 0) {
      const subs = await db.select({ problemId: submissionsTable.problemId, earnedMarks: submissionsTable.earnedMarks })
        .from(submissionsTable)
        .where(and(
          eq(submissionsTable.userId, s.userId),
          sql`${submissionsTable.problemId} = ANY(ARRAY[${sql.raw(problemIds.join(","))}]::int[])`,
        ));
      earnedMarks = subs.reduce((acc, sub) => acc + sub.earnedMarks, 0);
    }
    const pct = batchTotalMarks > 0 ? Math.round((earnedMarks / batchTotalMarks) * 100) : 0;
    return { userId: s.userId, name: s.name, email: s.email, avatar: s.avatar, studentId: s.studentId, earnedMarks, totalMarks: batchTotalMarks, percentage: pct };
  }));

  res.json({ students: result, problems, batchTotalMarks });
});

// Student: get a single problem with test cases, validated against batch context
router.get("/my/batches/:batchId/problems/:problemId", async (req, res): Promise<void> => {
  const userId = getSessionUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in" }); return; }
  const batchId = parsId(req.params.batchId);
  const problemId = parsId(req.params.problemId);
  if (!batchId || !problemId) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!(await checkEnrolled(batchId, userId))) { res.status(403).json({ error: "Not enrolled" }); return; }

  // Find the bundle assignment that contains this problem
  const rows = await db.select({
    startAt: batchProblemBundlesTable.startAt,
    endAt: batchProblemBundlesTable.endAt,
    bundleId: batchProblemBundlesTable.bundleId,
  })
    .from(batchProblemBundlesTable)
    .innerJoin(bundleProblemsTable, eq(bundleProblemsTable.bundleId, batchProblemBundlesTable.bundleId))
    .where(and(
      eq(batchProblemBundlesTable.batchId, batchId),
      eq(bundleProblemsTable.problemId, problemId),
    ))
    .limit(1);

  if (!rows.length) { res.status(404).json({ error: "Problem not found in this batch" }); return; }

  const assignment = rows[0];
  const now = new Date();
  const startAt = assignment.startAt ? new Date(assignment.startAt) : null;
  const endAt = assignment.endAt ? new Date(assignment.endAt) : null;
  const isActive = (!startAt || now >= startAt) && (!endAt || now <= endAt);

  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, problemId));
  if (!problem) { res.status(404).json({ error: "Problem not found" }); return; }

  const testCases = isActive
    ? await db.select().from(testCasesTable)
        .where(eq(testCasesTable.problemId, problemId))
        .orderBy(testCasesTable.orderIndex, testCasesTable.id)
    : [];

  res.json({ ...problem, testCases });
});

export default router;
