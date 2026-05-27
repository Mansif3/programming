import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bootcampsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/bootcamps", async (req, res): Promise<void> => {
  const { type } = req.query;
  let bootcamps;
  if (type && (type === "bootcamp" || type === "event")) {
    bootcamps = await db.select().from(bootcampsTable).where(eq(bootcampsTable.type, type));
  } else {
    bootcamps = await db.select().from(bootcampsTable);
  }
  res.json(
    bootcamps.map((b) => ({
      ...b,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
    }))
  );
});

router.post("/bootcamps", async (req, res): Promise<void> => {
  const { title, description, thumbnail, startDate, endDate, type, status } = req.body ?? {};
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ error: "title is required" }); return;
  }
  if (!startDate || !endDate) {
    res.status(400).json({ error: "startDate and endDate are required" }); return;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ error: "Invalid date format" }); return;
  }
  if (end < start) {
    res.status(400).json({ error: "endDate must be on or after startDate" }); return;
  }
  if (!["bootcamp", "event"].includes(type)) {
    res.status(400).json({ error: "type must be 'bootcamp' or 'event'" }); return;
  }
  const finalStatus = status ?? "upcoming";
  if (!["upcoming", "open", "closed"].includes(finalStatus)) {
    res.status(400).json({ error: "invalid status" }); return;
  }
  const [b] = await db.insert(bootcampsTable).values({
    title: title.trim(),
    description: description || null,
    thumbnail: thumbnail || "",
    startDate: start,
    endDate: end,
    type,
    status: finalStatus,
  }).returning();
  res.status(201).json({
    ...b,
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
  });
});

router.delete("/bootcamps/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bootcampsTable).where(eq(bootcampsTable.id, id));
  res.status(204).end();
});

router.get("/bootcamps/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bootcamp] = await db.select().from(bootcampsTable).where(eq(bootcampsTable.id, id));
  if (!bootcamp) { res.status(404).json({ error: "Bootcamp not found" }); return; }

  res.json({
    ...bootcamp,
    startDate: bootcamp.startDate.toISOString(),
    endDate: bootcamp.endDate.toISOString(),
  });
});

export default router;
