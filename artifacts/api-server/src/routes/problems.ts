import { Router, type IRouter } from "express";
import { eq, inArray, and } from "drizzle-orm";
import { db, problemsTable, testCasesTable, problemBundlesTable, bundleProblemsTable, submissionsTable } from "@workspace/db";
import { getSessionUserId } from "../lib/session";

const router: IRouter = Router();

type ProblemBody = {
  title?: string;
  description?: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
};

// ── Admin: Problems CRUD ─────────────────────────────────────────────────────

router.get("/admin/problems", async (_req, res): Promise<void> => {
  const problems = await db.select().from(problemsTable).orderBy(problemsTable.id);
  const withCounts = await Promise.all(
    problems.map(async (p: any) => {
      const tcs = await db.select({ id: testCasesTable.id, marks: testCasesTable.marks })
        .from(testCasesTable).where(eq(testCasesTable.problemId, p.id));
      return { ...p, testCaseCount: tcs.length, totalMarks: tcs.reduce((s: number, t: any) => s + t.marks, 0) || p.totalMarks };
    })
  );
  res.json(withCounts);
});

router.post("/admin/problems", async (req, res): Promise<void> => {
  const { title, description, constraints, inputFormat, outputFormat } = req.body as ProblemBody;
  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }
  const [p] = await db.insert(problemsTable).values({
    title: title.trim(),
    description: description ?? null,
    constraints: constraints ?? null,
    inputFormat: inputFormat ?? null,
    outputFormat: outputFormat ?? null,
  }).returning();
  res.status(201).json(p);
});

router.patch("/admin/problems/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { title, description, constraints, inputFormat, outputFormat } = req.body as ProblemBody;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (constraints !== undefined) updates.constraints = constraints;
  if (inputFormat !== undefined) updates.inputFormat = inputFormat;
  if (outputFormat !== undefined) updates.outputFormat = outputFormat;
  const [p] = await db.update(problemsTable).set(updates).where(eq(problemsTable.id, id)).returning();
  if (!p) { res.status(404).json({ error: "not found" }); return; }
  res.json(p);
});

router.delete("/admin/problems/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(testCasesTable).where(eq(testCasesTable.problemId, id));
  await db.delete(problemsTable).where(eq(problemsTable.id, id));
  res.status(204).end();
});

// ── Admin: Test Cases CRUD ───────────────────────────────────────────────────

router.get("/admin/problems/:id/test-cases", async (req, res): Promise<void> => {
  const problemId = parseInt(req.params.id, 10);
  if (isNaN(problemId)) { res.status(400).json({ error: "invalid id" }); return; }
  const tcs = await db.select().from(testCasesTable)
    .where(eq(testCasesTable.problemId, problemId))
    .orderBy(testCasesTable.orderIndex, testCasesTable.id);
  res.json(tcs);
});

router.post("/admin/problems/:id/test-cases", async (req, res): Promise<void> => {
  const problemId = parseInt(req.params.id, 10);
  if (isNaN(problemId)) { res.status(400).json({ error: "invalid id" }); return; }
  const { name, description, input, expectedOutput, marks, isSample, orderIndex } = req.body as {
    name?: string; description?: string; input?: string; expectedOutput?: string;
    marks?: number; isSample?: boolean; orderIndex?: number;
  };
  if (expectedOutput === undefined) { res.status(400).json({ error: "expectedOutput is required" }); return; }
  const existing = await db.select({ id: testCasesTable.id }).from(testCasesTable).where(eq(testCasesTable.problemId, problemId));
  const autoName = name?.trim() || (isSample !== false ? `Sample ${existing.length + 1}` : `Test ${existing.length + 1}`);
  const [tc] = await db.insert(testCasesTable).values({
    problemId,
    name: autoName,
    description: description ?? null,
    input: input ?? "",
    expectedOutput,
    marks: marks ?? 10,
    isSample: isSample ?? true,
    orderIndex: orderIndex ?? 0,
  }).returning();
  res.status(201).json(tc);
});

router.patch("/admin/test-cases/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { name, description, input, expectedOutput, marks, isSample, orderIndex } = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = (name as string).trim();
  if (description !== undefined) updates.description = description;
  if (input !== undefined) updates.input = input;
  if (expectedOutput !== undefined) updates.expectedOutput = expectedOutput;
  if (marks !== undefined) updates.marks = Number(marks);
  if (isSample !== undefined) updates.isSample = Boolean(isSample);
  if (orderIndex !== undefined) updates.orderIndex = Number(orderIndex);
  const [tc] = await db.update(testCasesTable).set(updates).where(eq(testCasesTable.id, id)).returning();
  if (!tc) { res.status(404).json({ error: "not found" }); return; }
  res.json(tc);
});

router.delete("/admin/test-cases/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(testCasesTable).where(eq(testCasesTable.id, id));
  res.status(204).end();
});

// ── Admin: Problem Bundles CRUD ───────────────────────────────────────────────

router.get("/admin/problem-bundles", async (_req, res): Promise<void> => {
  const bundles = await db.select().from(problemBundlesTable).orderBy(problemBundlesTable.id);
  const withCounts = await Promise.all(
    bundles.map(async (b: any) => {
      const items = await db.select({ id: bundleProblemsTable.id })
        .from(bundleProblemsTable).where(eq(bundleProblemsTable.bundleId, b.id));
      return {
        ...b,
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
        problemCount: items.length,
      };
    })
  );
  res.json(withCounts);
});

router.post("/admin/problem-bundles", async (req, res): Promise<void> => {
  const { title, description } = req.body as { title?: string; description?: string };
  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }
  const [b] = await db.insert(problemBundlesTable).values({
    title: title.trim(),
    description: description ?? null,
  }).returning();
  res.status(201).json({
    ...b,
    createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    problemCount: 0,
  });
});

router.patch("/admin/problem-bundles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { title, description } = req.body as { title?: string; description?: string };
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  const [b] = await db.update(problemBundlesTable).set(updates).where(eq(problemBundlesTable.id, id)).returning();
  if (!b) { res.status(404).json({ error: "not found" }); return; }
  res.json({ ...b, createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt });
});

router.delete("/admin/problem-bundles/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(bundleProblemsTable).where(eq(bundleProblemsTable.bundleId, id));
  await db.delete(problemBundlesTable).where(eq(problemBundlesTable.id, id));
  res.status(204).end();
});

// ── Admin: Bundle Problems (items within a bundle) ────────────────────────────

router.get("/admin/problem-bundles/:id/problems", async (req, res): Promise<void> => {
  const bundleId = parseInt(req.params.id, 10);
  if (isNaN(bundleId)) { res.status(400).json({ error: "invalid id" }); return; }
  const items = await db.select({
    id: bundleProblemsTable.id,
    bundleId: bundleProblemsTable.bundleId,
    problemId: bundleProblemsTable.problemId,
    orderIndex: bundleProblemsTable.orderIndex,
    title: problemsTable.title,
    description: problemsTable.description,
    totalMarks: problemsTable.totalMarks,
  })
    .from(bundleProblemsTable)
    .innerJoin(problemsTable, eq(problemsTable.id, bundleProblemsTable.problemId))
    .where(eq(bundleProblemsTable.bundleId, bundleId))
    .orderBy(bundleProblemsTable.orderIndex, bundleProblemsTable.id);
  res.json(items);
});

router.post("/admin/problem-bundles/:id/problems", async (req, res): Promise<void> => {
  const bundleId = parseInt(req.params.id, 10);
  if (isNaN(bundleId)) { res.status(400).json({ error: "invalid id" }); return; }
  const { problemId, orderIndex } = req.body as { problemId?: number; orderIndex?: number };
  if (!problemId) { res.status(400).json({ error: "problemId is required" }); return; }
  const [row] = await db.insert(bundleProblemsTable).values({
    bundleId,
    problemId,
    orderIndex: orderIndex ?? 0,
  }).returning();
  res.status(201).json(row);
});

router.delete("/admin/problem-bundles/:id/problems/:problemId", async (req, res): Promise<void> => {
  const bundleId = parseInt(req.params.id, 10);
  const problemId = parseInt(req.params.problemId, 10);
  if (isNaN(bundleId) || isNaN(problemId)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(bundleProblemsTable)
    .where(and(eq(bundleProblemsTable.bundleId, bundleId), eq(bundleProblemsTable.problemId, problemId)));
  res.status(204).end();
});

// ── Student: Problems (public) ────────────────────────────────────────────────

router.get("/problems", async (_req, res): Promise<void> => {
  // Exclude problems that belong to any bundle — those are batch-only and time-gated
  const bundleProblems = await db
    .select({ problemId: bundleProblemsTable.problemId })
    .from(bundleProblemsTable);
  const bundleProblemIds = bundleProblems.map((r: any) => r.problemId);

  const problems = await db.select().from(problemsTable).orderBy(problemsTable.id);
  const freePracticeProblems = bundleProblemIds.length > 0
    ? problems.filter((p: any) => !bundleProblemIds.includes(p.id))
    : problems;
  res.json(freePracticeProblems);
});

router.get("/problems/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, id));
  if (!problem) { res.status(404).json({ error: "not found" }); return; }

  // If this problem belongs to any bundle, it is batch-only — do not expose test cases via free practice
  const [bundleRow] = await db
    .select({ bundleId: bundleProblemsTable.bundleId })
    .from(bundleProblemsTable)
    .where(eq(bundleProblemsTable.problemId, id));
  if (bundleRow) {
    // Return the problem but with empty test cases (access must go through batch context)
    res.json({ ...problem, testCases: [] });
    return;
  }

  const testCases = await db.select().from(testCasesTable)
    .where(eq(testCasesTable.problemId, id))
    .orderBy(testCasesTable.orderIndex, testCasesTable.id);
  res.json({ ...problem, testCases });
});

// ── Judge ─────────────────────────────────────────────────────────────────────

async function compileAndRun(code: string, stdin: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler: "gcc-head", code, stdin, "runtime-option": "--time-limit=8" }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Wandbox ${res.status}`);
    const data = await res.json() as { program_output?: string; compiler_error?: string; status?: string };
    return (data.program_output ?? "").trim();
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (isAbort) throw new Error("TLE");
    throw err;
  }
}

router.post("/problems/:id/judge", async (req, res): Promise<void> => {
  const problemId = parseInt(req.params.id, 10);
  if (isNaN(problemId)) { res.status(400).json({ error: "invalid id" }); return; }
  const { code } = req.body as { code?: string };
  if (!code?.trim()) { res.status(400).json({ error: "code is required" }); return; }

  const testCases = await db.select().from(testCasesTable)
    .where(eq(testCasesTable.problemId, problemId))
    .orderBy(testCasesTable.orderIndex, testCasesTable.id);

  if (!testCases.length) { res.status(400).json({ error: "No test cases for this problem" }); return; }

  const results = await Promise.all(
    testCases.map(async (tc: any) => {
      try {
        const actualOutput = await compileAndRun(code, tc.input);
        const expectedOutput = tc.expectedOutput.trim();
        const passed = actualOutput === expectedOutput;
        return { id: tc.id, name: tc.name, passed, marks: passed ? tc.marks : 0, maxMarks: tc.marks, actualOutput, expectedOutput: tc.isSample ? expectedOutput : null };
      } catch (err: unknown) {
        const isTLE = err instanceof Error && err.message === "TLE";
        return { id: tc.id, name: tc.name, passed: false, marks: 0, maxMarks: tc.marks, actualOutput: isTLE ? "Time Limit Exceeded" : null, expectedOutput: tc.isSample ? tc.expectedOutput.trim() : null };
      }
    })
  );

  const earnedMarks = results.reduce((s: number, r: any) => s + r.marks, 0);
  const totalMarks = results.reduce((s: number, r: any) => s + r.maxMarks, 0);

  // Persist best submission per user per problem
  const userId = getSessionUserId(req);
  if (userId) {
    const [existing] = await db.select().from(submissionsTable)
      .where(and(eq(submissionsTable.userId, userId), eq(submissionsTable.problemId, problemId)));
    if (existing) {
      if (earnedMarks > existing.earnedMarks) {
        await db.update(submissionsTable)
          .set({ earnedMarks, totalMarks, submittedAt: new Date() })
          .where(eq(submissionsTable.id, existing.id));
      }
    } else {
      await db.insert(submissionsTable).values({ userId, problemId, earnedMarks, totalMarks });
    }
  }

  res.json({ results, earnedMarks, totalMarks });
});

export default router;
