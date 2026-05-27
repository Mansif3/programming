import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, coursesTable, instructorsTable, modulesTable, lessonsTable, lessonCompletionsTable, enrollmentsTable, batchModuleSchedulesTable, batchWatchedModulesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import {
  ListCoursesQueryParams,
  GetCourseParams,
  GetCourseModulesParams,
  GetLessonParams,
  CompleteLessonParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getInstructorById(id: number) {
  const [instructor] = await db.select().from(instructorsTable).where(eq(instructorsTable.id, id));
  return instructor;
}

router.get("/courses", async (req, res): Promise<void> => {
  const params = ListCoursesQueryParams.safeParse(req.query);
  let query = db.select().from(coursesTable).$dynamic();

  if (params.success && params.data.category) {
    query = query.where(eq(coursesTable.category, params.data.category)) as typeof query;
  }
  if (params.success && params.data.featured !== undefined) {
    query = query.where(eq(coursesTable.isFeatured, params.data.featured)) as typeof query;
  }

  const courses = await query;
  const result = await Promise.all(
    courses.map(async (course) => {
      const instructor = await getInstructorById(course.instructorId);
      return {
        ...course,
        instructor: instructor || { id: 0, name: "Unknown", avatar: "", title: "Instructor" },
      };
    })
  );
  res.json(result);
});

router.post("/courses", async (req, res): Promise<void> => {
  const body = req.body;
  if (!body.title || !body.category) {
    res.status(400).json({ error: "title and category are required" });
    return;
  }

  // Resolve instructorId: find or create a default instructor
  const allInstructors = await db.select({ id: instructorsTable.id }).from(instructorsTable).limit(1);
  let instructorId: number;
  if (allInstructors.length > 0) {
    instructorId = allInstructors[0].id;
  } else {
    const [created] = await db.insert(instructorsTable).values({
      name: "Admin Instructor",
      title: "Instructor",
      avatar: "",
      bio: null,
    }).returning();
    instructorId = created.id;
  }

  const slug = body.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [course] = await db.insert(coursesTable).values({
    title: body.title,
    slug,
    category: body.category,
    description: body.description || null,
    thumbnail: body.thumbnail || "",
    instructorId,
    price: body.price || null,
    isFeatured: body.isFeatured ?? false,
    tag: body.tag || null,
  }).returning();
  const instructor = await getInstructorById(course.instructorId);
  res.status(201).json({ ...course, instructor });
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const instructor = await getInstructorById(course.instructorId);
  const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, id)).orderBy(modulesTable.orderIndex);
  const modulesWithLessons = await Promise.all(
    modules.map(async (mod) => {
      const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, mod.id)).orderBy(lessonsTable.orderIndex);
      return {
        ...mod,
        lessonCount: lessons.length,
        completedCount: 0,
        lessons: lessons.map((l) => ({ ...l, isCompleted: false })),
      };
    })
  );

  res.json({
    ...course,
    instructor: instructor || { id: 0, name: "Unknown", avatar: "", title: "Instructor" },
    modules: modulesWithLessons,
  });
});

router.get("/courses/:id/modules", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const modules = await db.select().from(modulesTable).where(eq(modulesTable.courseId, id)).orderBy(modulesTable.orderIndex);
  const result = await Promise.all(
    modules.map(async (mod) => {
      const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.moduleId, mod.id)).orderBy(lessonsTable.orderIndex);
      return {
        ...mod,
        lessonCount: lessons.length,
        completedCount: 0,
        lessons: lessons.map((l) => ({ ...l, isCompleted: false })),
      };
    })
  );
  res.json(result);
});

router.get("/lessons/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id));
  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }

  res.json({ ...lesson, isCompleted: false });
});

router.post("/lessons/:id/complete", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  res.json({ lessonId: id, isCompleted: true });
});

router.get("/support-sessions", async (_req, res): Promise<void> => {
  const sessions = [
    { id: 1, dayOfWeek: "Wed", times: ["11:00 AM", "04:00 PM", "09:00 PM - 2h"], isLive: true },
    { id: 2, dayOfWeek: "Thu", times: ["11:00 PM", "04:00 PM", "09:00 PM - 2h"], isLive: false },
    { id: 3, dayOfWeek: "Fri", times: ["10:00 AM", "04:00 PM", "09:00 PM - 2h"], isLive: false },
    { id: 4, dayOfWeek: "Sat", times: ["04:00 PM", "09:00 PM - 2h"], isLive: false },
    { id: 5, dayOfWeek: "Sun", times: ["11:00 AM", "04:00 PM", "09:00 PM - 2h"], isLive: false },
    { id: 6, dayOfWeek: "Mon", times: ["11:00 AM", "04:00 PM", "09:00 PM - 2h"], isLive: false },
    { id: 7, dayOfWeek: "Tue", times: ["11:00 AM", "04:00 PM", "09:00 PM - 2h"], isLive: false },
  ];
  res.json(sessions);
});

// ─── Admin course content management ─────────────────────────────────────────

// Get full course detail with all modules+lessons+publishAt (admin)
router.get("/admin/courses/:id/detail", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }
  const instructor = await getInstructorById(course.instructorId);
  const modules = await db.select().from(modulesTable)
    .where(eq(modulesTable.courseId, id))
    .orderBy(modulesTable.weekNumber, modulesTable.orderIndex);
  const modulesWithLessons = await Promise.all(
    modules.map(async (mod) => {
      const lessons = await db.select().from(lessonsTable)
        .where(eq(lessonsTable.moduleId, mod.id))
        .orderBy(lessonsTable.orderIndex);
      return {
        ...mod,
        publishAt: null,
        createdAt: mod.createdAt instanceof Date ? mod.createdAt.toISOString() : mod.createdAt,
        lessons: lessons.map((l) => ({
          ...l,
          createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
        })),
      };
    })
  );
  res.json({
    ...course,
    createdAt: course.createdAt instanceof Date ? course.createdAt.toISOString() : course.createdAt,
    instructor: instructor || { id: 0, name: "Unknown", avatar: "", title: "Instructor" },
    modules: modulesWithLessons,
  });
});

// Update course
router.put("/courses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title, description, thumbnail, category, price, isFeatured, tag, instructorId } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (thumbnail !== undefined) updates.thumbnail = thumbnail;
  if (category !== undefined) updates.category = category;
  if (price !== undefined) updates.price = price;
  if (isFeatured !== undefined) updates.isFeatured = isFeatured;
  if (tag !== undefined) updates.tag = tag;
  if (instructorId !== undefined) updates.instructorId = instructorId;
  if (title) updates.slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [updated] = await db.update(coursesTable).set(updates as Partial<typeof coursesTable.$inferInsert>).where(eq(coursesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Course not found" }); return; }
  const instructor = await getInstructorById(updated.instructorId);
  res.json({ ...updated, instructor });
});

// Create module for a course
router.post("/admin/courses/:id/modules", async (req, res): Promise<void> => {
  const courseId = parseInt(req.params.id, 10);
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid course id" }); return; }
  const { title, weekNumber, orderIndex } = req.body ?? {};
  if (!title || weekNumber === undefined) { res.status(400).json({ error: "title and weekNumber required" }); return; }
  const [mod] = await db.insert(modulesTable).values({
    courseId,
    title,
    weekNumber: Number(weekNumber),
    orderIndex: orderIndex ?? 0,
  }).returning();
  res.status(201).json({
    ...mod,
    createdAt: mod.createdAt instanceof Date ? mod.createdAt.toISOString() : mod.createdAt,
    lessons: [],
  });
});

// Update module
router.put("/admin/courses/:id/modules/:moduleId", async (req, res): Promise<void> => {
  const moduleId = parseInt(req.params.moduleId, 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid module id" }); return; }
  const { title, weekNumber, orderIndex } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (weekNumber !== undefined) updates.weekNumber = Number(weekNumber);
  if (orderIndex !== undefined) updates.orderIndex = Number(orderIndex);
  const [updated] = await db.update(modulesTable).set(updates as Partial<typeof modulesTable.$inferInsert>).where(eq(modulesTable.id, moduleId)).returning();
  if (!updated) { res.status(404).json({ error: "Module not found" }); return; }
  res.json({
    ...updated,
    createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
  });
});

// Delete module (cascades lessons + batch references)
router.delete("/admin/courses/:id/modules/:moduleId", async (req, res): Promise<void> => {
  const moduleId = parseInt(req.params.moduleId, 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid module id" }); return; }
  // Delete all dependent rows first to avoid FK constraint violations
  const lessonRows = await db.select({ id: lessonsTable.id }).from(lessonsTable).where(eq(lessonsTable.moduleId, moduleId));
  if (lessonRows.length > 0) {
    const lessonIds = lessonRows.map((r) => r.id);
    await db.delete(lessonCompletionsTable).where(inArray(lessonCompletionsTable.lessonId, lessonIds));
  }
  await db.delete(lessonsTable).where(eq(lessonsTable.moduleId, moduleId));
  await db.delete(batchModuleSchedulesTable).where(eq(batchModuleSchedulesTable.moduleId, moduleId));
  await db.delete(batchWatchedModulesTable).where(eq(batchWatchedModulesTable.moduleId, moduleId));
  await db.delete(modulesTable).where(eq(modulesTable.id, moduleId));
  res.status(204).end();
});

// Create lesson in a module
router.post("/admin/courses/:id/modules/:moduleId/lessons", async (req, res): Promise<void> => {
  const moduleId = parseInt(req.params.moduleId, 10);
  if (isNaN(moduleId)) { res.status(400).json({ error: "Invalid module id" }); return; }
  const { title, videoUrl, duration, orderIndex } = req.body ?? {};
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [lesson] = await db.insert(lessonsTable).values({
    moduleId,
    title,
    videoUrl: videoUrl || null,
    duration: duration || "0:00",
    orderIndex: orderIndex ?? 0,
  }).returning();
  res.status(201).json({
    ...lesson,
    createdAt: lesson.createdAt instanceof Date ? lesson.createdAt.toISOString() : lesson.createdAt,
  });
});

// Update lesson
router.put("/admin/courses/:id/modules/:moduleId/lessons/:lessonId", async (req, res): Promise<void> => {
  const lessonId = parseInt(req.params.lessonId, 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lesson id" }); return; }
  const { title, videoUrl, duration, orderIndex } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (videoUrl !== undefined) updates.videoUrl = videoUrl;
  if (duration !== undefined) updates.duration = duration;
  if (orderIndex !== undefined) updates.orderIndex = Number(orderIndex);
  const [updated] = await db.update(lessonsTable).set(updates as Partial<typeof lessonsTable.$inferInsert>).where(eq(lessonsTable.id, lessonId)).returning();
  if (!updated) { res.status(404).json({ error: "Lesson not found" }); return; }
  res.json({
    ...updated,
    createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
  });
});

// Delete lesson
router.delete("/admin/courses/:id/modules/:moduleId/lessons/:lessonId", async (req, res): Promise<void> => {
  const lessonId = parseInt(req.params.lessonId, 10);
  if (isNaN(lessonId)) { res.status(400).json({ error: "Invalid lesson id" }); return; }
  await db.delete(lessonsTable).where(eq(lessonsTable.id, lessonId));
  res.status(204).end();
});

router.delete("/courses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Course not found" }); return; }
  await db.transaction(async (tx) => {
    const modules = await tx.select({ id: modulesTable.id }).from(modulesTable).where(eq(modulesTable.courseId, id));
    const moduleIds = modules.map((m) => m.id);
    if (moduleIds.length > 0) {
      const lessons = await tx.select({ id: lessonsTable.id }).from(lessonsTable).where(inArray(lessonsTable.moduleId, moduleIds));
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length > 0) {
        await tx.delete(lessonCompletionsTable).where(inArray(lessonCompletionsTable.lessonId, lessonIds));
      }
    }
    await tx.delete(enrollmentsTable).where(eq(enrollmentsTable.courseId, id));
    if (moduleIds.length > 0) {
      await tx.delete(lessonsTable).where(inArray(lessonsTable.moduleId, moduleIds));
      await tx.delete(modulesTable).where(eq(modulesTable.courseId, id));
    }
    await tx.delete(coursesTable).where(eq(coursesTable.id, id));
  });
  res.status(204).end();
});

router.get("/instructors", async (_req, res): Promise<void> => {
  const instructors = await db.select().from(instructorsTable);
  res.json(instructors);
});

router.post("/instructors", async (req, res): Promise<void> => {
  const { name, title, avatar, bio } = req.body ?? {};
  if (!name || !title) {
    res.status(400).json({ error: "name and title are required" });
    return;
  }
  const [instructor] = await db.insert(instructorsTable).values({
    name,
    title,
    avatar: avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`,
    bio: bio || null,
  }).returning();
  res.status(201).json(instructor);
});

router.delete("/instructors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(instructorsTable).where(eq(instructorsTable.id, id));
  res.status(204).end();
});

export default router;
