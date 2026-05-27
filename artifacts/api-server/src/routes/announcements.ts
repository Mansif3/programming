import { Router, type IRouter } from "express";
import { db, announcementsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/announcements", async (_req, res): Promise<void> => {
  const announcements = await db.select().from(announcementsTable).orderBy(sql`${announcementsTable.createdAt} DESC`);
  res.json(
    announcements.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

router.post("/announcements", async (req, res): Promise<void> => {
  const { title, content } = req.body ?? {};
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }
  const [a] = await db.insert(announcementsTable).values({ title, content }).returning();
  res.status(201).json({ ...a, createdAt: a.createdAt.toISOString() });
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.status(204).end();
});

export default router;
