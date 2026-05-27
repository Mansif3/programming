import { Router, type IRouter } from "express";
import { desc, eq, and } from "drizzle-orm";
import { db, paymentsTable, usersTable, batchStudentsTable, batchesTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

router.post("/payments", async (req, res): Promise<void> => {
  const { courseName, amount, paymentMethod, paymentPhone, txnId } = req.body;
  if (!courseName || !amount || !paymentMethod || !paymentPhone || !txnId) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const [payment] = await db.insert(paymentsTable).values({
    userId: DEFAULT_USER_ID,
    courseName: String(courseName),
    amount: Number(amount),
    paymentMethod: String(paymentMethod),
    paymentPhone: String(paymentPhone),
    txnId: String(txnId),
  }).returning();
  res.status(201).json(payment);
});

router.get("/payments", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: paymentsTable.id,
      userId: paymentsTable.userId,
      courseName: paymentsTable.courseName,
      amount: paymentsTable.amount,
      paymentMethod: paymentsTable.paymentMethod,
      paymentPhone: paymentsTable.paymentPhone,
      txnId: paymentsTable.txnId,
      status: paymentsTable.status,
      createdAt: paymentsTable.createdAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
    })
    .from(paymentsTable)
    .leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(rows);
});

router.patch("/payments/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, batchId } = req.body as { status: string; batchId?: number };
  if (!["pending", "verified", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  const [updated] = await db.update(paymentsTable)
    .set({ status })
    .where(eq(paymentsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Payment not found" }); return; }

  // When verified → auto-enroll into any batch with autoEnroll=true, plus manually selected batchId
  const enrolledBatchNames: string[] = [];

  if (status === "verified") {
    // Find all batches with autoEnroll = true
    const autoEnrollBatches = await db.select({ id: batchesTable.id, name: batchesTable.name })
      .from(batchesTable)
      .where(eq(batchesTable.autoEnroll, true));

    const batchesToEnroll = [...autoEnrollBatches];

    // Also add manually selected batchId if provided and not already in the list
    if (batchId && !autoEnrollBatches.find((b: any) => b.id === batchId)) {
      const [manualBatch] = await db.select({ id: batchesTable.id, name: batchesTable.name })
        .from(batchesTable).where(eq(batchesTable.id, batchId));
      if (manualBatch) batchesToEnroll.push(manualBatch);
    }

    for (const batch of batchesToEnroll) {
      const existing = await db.select({ id: batchStudentsTable.id })
        .from(batchStudentsTable)
        .where(and(eq(batchStudentsTable.batchId, batch.id), eq(batchStudentsTable.userId, updated.userId)));
      if (!existing.length) {
        await db.insert(batchStudentsTable).values({ batchId: batch.id, userId: updated.userId });
        enrolledBatchNames.push(batch.name);
      }
    }
  }

  res.json({ ...updated, enrolledBatchNames });
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(paymentsTable).where(eq(paymentsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Payment not found" }); return; }
  res.json({ success: true });
});

export default router;
