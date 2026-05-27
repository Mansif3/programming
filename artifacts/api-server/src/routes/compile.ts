import { Router, type IRouter } from "express";

const router: IRouter = Router();

const EXECUTION_TIMEOUT_MS = 10_000;

router.post("/compile", async (req, res) => {
  const { code, stdin } = req.body as { code?: string; stdin?: string };
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

  try {
    const response = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: "gcc-head",
        code,
        stdin: stdin ?? "",
        "runtime-option": "--time-limit=8",
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      res.status(502).json({ error: `Wandbox returned ${response.status}` });
      return;
    }

    const data = await response.json() as Record<string, unknown>;
    res.json(data);
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (isAbort) {
      res.json({
        status: "1",
        program_output: "",
        program_error: "Time Limit Exceeded: Your program ran for more than 10 seconds.\nThis usually means an infinite loop or very slow code.",
        compiler_error: "",
      });
      return;
    }
    req.log.error({ err }, "compile proxy error");
    res.status(502).json({ error: "Failed to reach compiler service" });
  }
});

export default router;
