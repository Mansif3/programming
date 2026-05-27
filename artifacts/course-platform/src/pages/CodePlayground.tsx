import { useState, useRef, useCallback, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  Play, RotateCcw, Copy, Check, Terminal, Loader2,
  GripHorizontal, ClipboardList, FlaskConical, ChevronDown,
  CheckCircle2, XCircle, Eye, EyeOff, Trophy, Package,
  Lock, Timer, Layers,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEFAULT_C_CODE = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`;

type RunResult = {
  status: "success" | "error" | "compile_error";
  output: string;
  stderr?: string;
};

type Problem = {
  id: number; title: string; description: string | null;
  constraints: string | null; inputFormat: string | null; outputFormat: string | null;
  totalMarks: number; orderIndex?: number;
};
type TestCase = {
  id: number; name: string; description: string | null;
  input: string; expectedOutput: string; marks: number; isSample: boolean;
};
type ProblemDetail = Problem & { testCases: TestCase[] };

type JudgeResult = {
  results: Array<{ id: number; name: string; passed: boolean; marks: number; maxMarks: number; actualOutput: string | null; expectedOutput: string | null }>;
  earnedMarks: number;
  totalMarks: number;
};

type BatchBundle = {
  assignmentId: number;
  bundleId: number;
  bundleTitle: string;
  bundleDescription: string | null;
  startAt: string | null;
  endAt: string | null;
  testCasesVisible: boolean;
  isExpired: boolean;
  isUpcoming: boolean;
  problems: Problem[];
};

type MyBatch = {
  id: number; name: string; status: string; problemsEnabled?: boolean;
};

async function runCCode(code: string, stdin: string): Promise<RunResult> {
  const res = await fetch(`${BASE}/api/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, stdin }),
  });
  if (!res.ok) throw new Error(`Compiler error: ${res.status}`);
  const data = await res.json() as {
    status: string; program_output?: string; program_error?: string;
    compiler_output?: string; compiler_error?: string; error?: string;
  };
  if (data.error) throw new Error(data.error);
  const exitCode = parseInt(data.status ?? "0", 10);
  const compileErr = data.compiler_error ?? data.compiler_output ?? "";
  const stdout = data.program_output ?? "";
  const stderr = data.program_error ?? "";
  if (compileErr && !stdout && exitCode !== 0) return { status: "compile_error", output: compileErr };
  if (exitCode !== 0) return { status: "error", output: stdout || stderr, stderr: stderr || compileErr };
  return { status: "success", output: stdout, stderr: compileErr || stderr };
}

async function judgeCode(code: string, problemId: number): Promise<JudgeResult> {
  const res = await fetch(`${BASE}/api/problems/${problemId}/judge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Judge error: ${res.status}`);
  return res.json() as Promise<JudgeResult>;
}

async function apiFetch<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

// ── Problem statement section renderer ───────────────────────────────────────
function SectionDivider() {
  return <div className="border-b border-white/8 my-0" />;
}

function BulletLines({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <ul className="space-y-1">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2 text-[13px] text-white/70 leading-relaxed">
          <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
        </li>
      ))}
    </ul>
  );
}

function CopyBox({ value, onUseAsInput, label }: { value: string; label: string; onUseAsInput?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#1a1d27] border-b border-white/10">
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1">
          {onUseAsInput && (
            <button onClick={onUseAsInput} className="text-[10px] text-primary/70 hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-primary/10">
              Use as input
            </button>
          )}
          <button onClick={copy} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors px-2 py-0.5 rounded hover:bg-white/5">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="px-3 py-2.5 text-[13px] font-mono text-white/80 bg-[#0f1117] whitespace-pre-wrap leading-relaxed">{value || "(empty)"}</pre>
    </div>
  );
}

function ProblemStatement({ problem, sampleTcs, onUseInput }: {
  problem: ProblemDetail;
  sampleTcs: TestCase[];
  onUseInput: (input: string) => void;
}) {
  return (
    <div className="text-white">
      {problem.description && (
        <>
          <div className="px-4 py-3">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Statement</h3>
            <p className="text-sm text-white/85 leading-relaxed break-words whitespace-pre-wrap">{problem.description}</p>
          </div>
          <SectionDivider />
        </>
      )}
      {problem.constraints && (
        <>
          <div className="px-4 py-3">
            <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">Constraints</h3>
            <BulletLines text={problem.constraints} />
          </div>
          <SectionDivider />
        </>
      )}
      {problem.inputFormat && (
        <>
          <div className="px-4 py-3">
            <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">Input Format</h3>
            <BulletLines text={problem.inputFormat} />
          </div>
          <SectionDivider />
        </>
      )}
      {problem.outputFormat && (
        <>
          <div className="px-4 py-3">
            <h3 className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">Output Format</h3>
            <BulletLines text={problem.outputFormat} />
          </div>
          <SectionDivider />
        </>
      )}
      {sampleTcs.length > 0 && (
        <div className="px-4 py-3 space-y-4">
          {sampleTcs.map((tc, i) => (
            <div key={tc.id} className="space-y-2">
              <CopyBox label={`Sample Input ${i + 1}`} value={tc.input} onUseAsInput={() => onUseInput(tc.input)} />
              <CopyBox label={`Sample Output ${i + 1}`} value={tc.expectedOutput} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CodePlayground() {
  const [code, setCode] = useState(DEFAULT_C_CODE);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rightTab, setRightTab] = useState<"manual" | "testcases">("manual");
  const [problemTab, setProblemTab] = useState<"statement" | "cases">("statement");

  // Test case state
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);
  const [selectedTcId, setSelectedTcId] = useState<number | null>(null);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [judging, setJudging] = useState(false);
  const [showProblemPicker, setShowProblemPicker] = useState(false);

  // Batch context
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [batchMode, setBatchMode] = useState(false);

  // Resize: input panel
  const [inputHeight, setInputHeight] = useState(180);
  const dragStartY = useRef<number>(0);
  const dragStartH = useRef<number>(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    dragStartH.current = inputHeight;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - dragStartY.current;
      setInputHeight(Math.max(80, Math.min(400, dragStartH.current + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    e.preventDefault();
  }, [inputHeight]);

  // Fetch all problems (free practice mode)
  const { data: problems = [] } = useQuery<Problem[]>({
    queryKey: ["problems"],
    queryFn: () => apiFetch<Problem[]>(`${BASE}/api/problems`),
    enabled: !batchMode,
  });

  // Fetch my enrolled batches
  const { data: myBatches = [] } = useQuery<MyBatch[]>({
    queryKey: ["my-batches"],
    queryFn: () => apiFetch<MyBatch[]>(`${BASE}/api/my/batches`),
  });

  // Fetch problems from selected batch
  const { data: batchBundles = [] } = useQuery<BatchBundle[]>({
    queryKey: ["batch-problems", selectedBatchId],
    queryFn: () => apiFetch<BatchBundle[]>(`${BASE}/api/my/batches/${selectedBatchId}/problems`),
    enabled: selectedBatchId !== null,
  });

  // Flat list of problems from batch bundles, with bundle context
  const batchProblems = batchBundles.flatMap((b) =>
    b.problems.map((p) => ({ ...p, _bundleId: b.bundleId, _bundleTitle: b.bundleTitle, _testCasesVisible: b.testCasesVisible, _isExpired: b.isExpired, _isUpcoming: b.isUpcoming }))
  );

  // Currently active problem list (batch or free)
  const activeProblemList = batchMode ? batchProblems : problems;

  // Find which bundle the selected problem belongs to
  const selectedBundle = selectedProblemId
    ? batchBundles.find((b) => b.problems.some((p) => p.id === selectedProblemId))
    : null;

  // In batch mode, test cases are ONLY visible when the selected problem belongs to a currently active bundle.
  // If no bundle is found or the bundle is expired/upcoming, test cases are hidden.
  const testCasesVisible = !batchMode
    ? true
    : (selectedBundle != null && selectedBundle.testCasesVisible && !selectedBundle.isExpired && !selectedBundle.isUpcoming);

  // Any active bundle exists in the current batch (used to decide whether to show the Test Cases main tab)
  const hasActiveBundleInBatch = batchBundles.some(
    (b) => b.testCasesVisible && !b.isExpired && !b.isUpcoming
  );

  // If test cases become hidden (bundle inactive/expired/upcoming), clear state and reset tabs
  useEffect(() => {
    if (batchMode && !testCasesVisible) {
      if (problemTab === "cases") setProblemTab("statement");
      setSelectedProblemId(null);
      setSelectedTcId(null);
      setJudgeResult(null);
    }
  }, [testCasesVisible, batchMode, problemTab]);

  // If the Test Cases main tab is no longer available (no active bundle in batch), switch to manual
  useEffect(() => {
    if (batchMode && !hasActiveBundleInBatch && rightTab === "testcases") {
      setRightTab("manual");
    }
  }, [batchMode, hasActiveBundleInBatch, rightTab]);

  // Fetch problem detail (with test cases) when selected.
  // In batch mode, use the batch-context endpoint so test cases are included when the bundle is active.
  const { data: problemDetail } = useQuery<ProblemDetail>({
    queryKey: ["problems", selectedProblemId, batchMode ? selectedBatchId : null],
    queryFn: () => {
      const url = batchMode && selectedBatchId
        ? `${BASE}/api/my/batches/${selectedBatchId}/problems/${selectedProblemId}`
        : `${BASE}/api/problems/${selectedProblemId}`;
      return fetch(url).then((r) => r.json()) as Promise<ProblemDetail>;
    },
    enabled: selectedProblemId !== null,
  });

  const selectedTc = problemDetail?.testCases.find((t) => t.id === selectedTcId) ?? null;
  const sampleTcs = problemDetail?.testCases.filter((t) => t.isSample) ?? [];

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await runCCode(code, stdin);
      setResult(res);
    } catch (e) {
      setResult({ status: "error", output: String(e) });
    } finally {
      setRunning(false);
    }
  };

  const handleJudge = async () => {
    if (!selectedProblemId) return;
    setJudging(true);
    setJudgeResult(null);
    try {
      const res = await judgeCode(code, selectedProblemId);
      setJudgeResult(res);
      setProblemTab("cases");
    } catch (e) {
      console.error(e);
    } finally {
      setJudging(false);
    }
  };

  const handleReset = () => { setCode(DEFAULT_C_CODE); setResult(null); setStdin(""); };
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseInput = (input: string) => {
    setStdin(input);
    setRightTab("manual");
  };

  const selectProblem = (id: number) => {
    setSelectedProblemId(id);
    setSelectedTcId(null);
    setJudgeResult(null);
    setShowProblemPicker(false);
    setProblemTab("statement");
  };

  const switchToBatchMode = (batchId: number) => {
    setSelectedBatchId(batchId);
    setBatchMode(true);
    setShowBatchPicker(false);
    setSelectedProblemId(null);
    setSelectedTcId(null);
    setJudgeResult(null);
  };

  const switchToFreeMode = () => {
    setBatchMode(false);
    setSelectedBatchId(null);
    setSelectedProblemId(null);
    setSelectedTcId(null);
    setJudgeResult(null);
  };

  const selectedBatch = myBatches.find((b) => b.id === selectedBatchId);

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <Navbar />

      {/* Top bar */}
      <div className="border-b border-white/10 bg-[#1a1d27] px-6 py-3 shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Problems</h1>
              <p className="text-xs text-white/40">GCC · C11</p>
            </div>

            {/* Batch selector */}
            <div className="relative ml-2">
              <button
                onClick={() => setShowBatchPicker(!showBatchPicker)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${batchMode ? "bg-primary/15 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"}`}
              >
                <Layers className="w-3.5 h-3.5" />
                {batchMode && selectedBatch ? selectedBatch.name : "Free Practice"}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showBatchPicker && (
                <div className="absolute z-30 top-full left-0 mt-1 min-w-[200px] bg-[#1e2130] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                  <button
                    onClick={switchToFreeMode}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-white/10 transition-colors ${!batchMode ? "text-primary" : "text-white/70"}`}
                  >
                    Free Practice
                  </button>
                  {myBatches.filter((b) => b.problemsEnabled).length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] text-white/30 uppercase tracking-wider border-t border-white/5">My Batches</div>
                      {myBatches.filter((b) => b.problemsEnabled).map((b) => (
                        <button
                          key={b.id}
                          onClick={() => switchToBatchMode(b.id)}
                          className={`w-full text-left px-3 py-2.5 text-xs hover:bg-white/10 transition-colors ${batchMode && selectedBatchId === b.id ? "text-primary" : "text-white/70"}`}
                        >
                          {b.name}
                        </button>
                      ))}
                    </>
                  )}
                  {myBatches.filter((b) => b.problemsEnabled).length === 0 && (
                    <p className="px-3 py-2.5 text-xs text-white/30">No problems access in your batches</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/20 text-white/40 text-xs hidden sm:inline-flex">GCC (C11)</Badge>
            <Button variant="outline" size="sm" onClick={handleCopy}
              className="border-white/20 text-white/70 bg-transparent hover:bg-white/10 gap-1.5 h-8 text-xs">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}
              className="border-white/20 text-white/70 bg-transparent hover:bg-white/10 gap-1.5 h-8 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            {rightTab === "testcases" && selectedProblemId ? (
              <Button size="sm" onClick={handleJudge} disabled={judging}
                className="gap-2 bg-purple-600 hover:bg-purple-500 text-white h-8 text-xs px-4">
                {judging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                {judging ? "Submitting..." : "Submit"}
              </Button>
            ) : (
              <Button size="sm" onClick={handleRun} disabled={running}
                className="gap-2 bg-green-600 hover:bg-green-500 text-white h-8 text-xs px-4">
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                {running ? "Running..." : "Run"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>

        {/* LEFT: Code editor */}
        <div className="flex-1 flex flex-col border-r border-white/10 min-w-0">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#1e2130] border-b border-white/10 shrink-0">
            <div className="flex items-center gap-1.5 mr-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <div className="bg-[#0f1117] rounded-t px-3 py-1 text-xs text-white/60 font-mono border-t border-l border-r border-white/10">
              main.c
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor height="100%" defaultLanguage="c" value={code}
              onChange={(v) => setCode(v ?? "")} theme="vs-dark"
              options={{ fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: "on", renderLineHighlight: "line", tabSize: 4, automaticLayout: true, padding: { top: 16, bottom: 16 } }}
            />
          </div>
        </div>

        {/* RIGHT panel */}
        <div className="w-[460px] shrink-0 flex flex-col bg-[#0f1117]">

          {/* Main Tabs — Test Cases tab only shown in batch mode with an active bundle */}
          <div className="flex border-b border-white/10 shrink-0 bg-[#1a1d27]">
            <button
              onClick={() => setRightTab("manual")}
              className={`${(batchMode && hasActiveBundleInBatch) ? "flex-1" : "w-full"} flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${rightTab === "manual" ? "text-white border-b-2 border-primary" : "text-white/40 hover:text-white/70"}`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Input / Output
            </button>
            {(batchMode && hasActiveBundleInBatch) && (
              <button
                onClick={() => setRightTab("testcases")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${rightTab === "testcases" ? "text-white border-b-2 border-primary" : "text-white/40 hover:text-white/70"}`}
              >
                <FlaskConical className="w-3.5 h-3.5" /> Test Cases
                {judgeResult && (
                  <Badge className={`ml-1 text-[10px] px-1.5 py-0 ${judgeResult.earnedMarks === judgeResult.totalMarks ? "bg-green-600" : "bg-orange-600"}`}>
                    {judgeResult.earnedMarks}/{judgeResult.totalMarks}
                  </Badge>
                )}
              </button>
            )}
          </div>

          {/* Manual Input/Output Tab */}
          {rightTab === "manual" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex flex-col border-b border-white/10 shrink-0" style={{ height: inputHeight }}>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1d27] border-b border-white/10 shrink-0">
                  <ClipboardList className="w-4 h-4 text-white/40" />
                  <span className="text-sm font-medium text-white/70">Input</span>
                  <span className="text-xs text-white/30 ml-auto">stdin</span>
                </div>
                <textarea value={stdin} onChange={(e) => setStdin(e.target.value)}
                  placeholder="Enter program input here..."
                  className="flex-1 w-full bg-[#0f1117] text-white/80 text-sm font-mono px-4 py-3 resize-none outline-none placeholder:text-white/20 leading-relaxed"
                  spellCheck={false}
                />
                <div onMouseDown={onDragStart}
                  className="shrink-0 h-3 flex items-center justify-center cursor-ns-resize bg-[#1a1d27] border-t border-white/10 hover:bg-primary/20 transition-colors group">
                  <GripHorizontal className="w-5 h-3 text-white/20 group-hover:text-primary/60 transition-colors" />
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1d27] border-b border-white/10 shrink-0">
                  <Terminal className="w-4 h-4 text-white/40" />
                  <span className="text-sm font-medium text-white/70">Output</span>
                  {result && (
                    <Badge className={`ml-auto text-xs ${result.status === "success" ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-red-600/20 text-red-400 border-red-600/30"}`} variant="outline">
                      {result.status === "success" ? "✓ Success" : result.status === "compile_error" ? "Compile Error" : "Runtime Error"}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 font-mono text-sm">
                  {running && <div className="flex items-center gap-2 text-white/40"><Loader2 className="w-4 h-4 animate-spin" /><span>Compiling...</span></div>}
                  {!running && !result && <p className="text-white/20 select-none">Run your code to see output here...</p>}
                  {!running && result && (
                    <div className="space-y-3">
                      {result.output && <pre className={`whitespace-pre-wrap leading-relaxed ${result.status === "success" ? "text-green-300" : "text-red-300"}`}>{result.output}</pre>}
                      {result.stderr && result.status === "success" && <pre className="whitespace-pre-wrap text-yellow-400/70 text-xs leading-relaxed border-t border-white/5 pt-2">{result.stderr}</pre>}
                      {!result.output && result.status === "success" && <p className="text-white/30 italic">Program exited with no output.</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Test Cases Tab */}
          {rightTab === "testcases" && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Problem selector */}
              <div className="shrink-0 border-b border-white/10 bg-[#1a1d27] px-4 py-3">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">Select Problem</p>
                <div className="relative">
                  <button
                    onClick={() => setShowProblemPicker(!showProblemPicker)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#0f1117] border border-white/10 rounded-lg text-sm text-left hover:border-white/20 transition-colors"
                  >
                    <span className={selectedProblemId && problemDetail ? "text-white" : "text-white/30"}>
                      {problemDetail ? problemDetail.title : "Choose a problem..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
                  </button>
                  {showProblemPicker && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1e2130] border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                      {activeProblemList.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-white/30">
                          {batchMode ? "No problems in this batch yet" : "No problems available"}
                        </p>
                      ) : batchMode ? (
                        // Group by bundle in batch mode — only show active bundles
                        (() => {
                          const activeBundles = batchBundles.filter((b) => b.testCasesVisible && !b.isExpired && !b.isUpcoming);
                          if (activeBundles.length === 0) {
                            return (
                              <p className="px-3 py-3 text-sm text-white/30">
                                No problems available right now. Check back during the active window.
                              </p>
                            );
                          }
                          return activeBundles.map((bundle) => (
                            <div key={bundle.bundleId}>
                              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/5">
                                <Package className="w-3 h-3 text-primary/60" />
                                <span className="text-[11px] font-semibold text-white/50">{bundle.bundleTitle}</span>
                                <span className="text-[10px] text-emerald-500 ml-auto">Active</span>
                              </div>
                              {bundle.problems.map((p) => (
                                <button key={p.id}
                                  onClick={() => selectProblem(p.id)}
                                  className="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between text-white/70 hover:bg-white/10 hover:text-white"
                                >
                                  <span>{p.title}</span>
                                </button>
                              ))}
                            </div>
                          ));
                        })()
                      ) : (
                        problems.map((p) => (
                          <button key={p.id} onClick={() => selectProblem(p.id)}
                            className="w-full text-left px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                            {p.title}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Bundle status banner (batch mode) */}
                {batchMode && selectedBundle && (
                  <div className={`mt-2 flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium ${
                    selectedBundle.isExpired ? "bg-slate-800/60 text-slate-400" :
                    selectedBundle.isUpcoming ? "bg-amber-900/30 text-amber-400" :
                    "bg-emerald-900/20 text-emerald-400"
                  }`}>
                    {selectedBundle.isExpired && <><Lock className="w-3 h-3 shrink-0" /> Submission window closed · Test cases are hidden</>}
                    {selectedBundle.isUpcoming && <><Timer className="w-3 h-3 shrink-0" /> Not yet available · Opens {new Date(selectedBundle.startAt!).toLocaleString()}</>}
                    {selectedBundle.testCasesVisible && !selectedBundle.isExpired && !selectedBundle.isUpcoming && (
                      <><Package className="w-3 h-3 shrink-0" /> {selectedBundle.bundleTitle}
                        {selectedBundle.endAt && <span className="opacity-70 ml-1">· Closes {new Date(selectedBundle.endAt).toLocaleString()}</span>}
                      </>
                    )}
                  </div>
                )}
              </div>

              {!selectedProblemId ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-white/20 text-sm">Select a problem to get started</p>
                </div>
              ) : !problemDetail ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">

                  {/* Sub-tabs: Statement | Test Cases */}
                  <div className="flex border-b border-white/10 shrink-0 bg-[#1a1d27]">
                    <button
                      onClick={() => setProblemTab("statement")}
                      className={`${testCasesVisible ? "flex-1" : "w-full"} py-2 text-[11px] font-medium transition-colors ${problemTab === "statement" ? "text-white border-b-2 border-purple-500" : "text-white/40 hover:text-white/70"}`}
                    >
                      Statement
                    </button>
                    {testCasesVisible && (
                      <button
                        onClick={() => setProblemTab("cases")}
                        className={`flex-1 py-2 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 ${problemTab === "cases" ? "text-white border-b-2 border-purple-500" : "text-white/40 hover:text-white/70"}`}
                      >
                        Test Cases ({problemDetail.testCases.length})
                        {judgeResult && (
                          <span className={`ml-1 inline-block w-1.5 h-1.5 rounded-full ${judgeResult.earnedMarks === judgeResult.totalMarks ? "bg-green-400" : "bg-orange-400"}`} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Statement sub-tab */}
                  {problemTab === "statement" && (
                    <div className="flex-1 overflow-y-auto">
                      {batchMode && selectedBundle && (selectedBundle.isExpired || selectedBundle.isUpcoming) ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-16">
                          {selectedBundle.isExpired ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                                <Lock className="w-6 h-6 text-slate-400" />
                              </div>
                              <p className="text-sm font-semibold text-white/60">Submission Window Closed</p>
                              <p className="text-xs text-white/30">
                                This problem is no longer accessible.<br />
                                {selectedBundle.endAt && `Closed on ${new Date(selectedBundle.endAt).toLocaleString()}`}
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-amber-900/30 flex items-center justify-center">
                                <Timer className="w-6 h-6 text-amber-400" />
                              </div>
                              <p className="text-sm font-semibold text-amber-400">Not Yet Available</p>
                              <p className="text-xs text-white/30">
                                This problem will be accessible once the window opens.<br />
                                {selectedBundle.startAt && `Opens ${new Date(selectedBundle.startAt).toLocaleString()}`}
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <ProblemStatement
                            problem={problemDetail}
                            sampleTcs={testCasesVisible ? sampleTcs : []}
                            onUseInput={handleUseInput}
                          />
                          {!problemDetail.description && !problemDetail.constraints && !problemDetail.inputFormat && !problemDetail.outputFormat && (
                            <div className="flex items-center justify-center py-16">
                              <p className="text-white/20 text-sm">No statement added for this problem yet</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Test Cases sub-tab */}
                  {problemTab === "cases" && (
                    <div className="flex-1 flex flex-col overflow-hidden">

                      {/* Test cases locked / expired / upcoming */}
                      {!testCasesVisible ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                          {selectedBundle?.isExpired ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                                <Lock className="w-6 h-6 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-white/60">Submission Window Closed</p>
                                <p className="text-xs text-white/30 mt-1">
                                  Test cases are no longer visible.<br />
                                  {selectedBundle.endAt && `Closed on ${new Date(selectedBundle.endAt).toLocaleString()}`}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-amber-900/30 flex items-center justify-center">
                                <Timer className="w-6 h-6 text-amber-400" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-amber-400">Not Yet Available</p>
                                <p className="text-xs text-white/30 mt-1">
                                  Test cases will be visible once the window opens.<br />
                                  {selectedBundle?.startAt && `Opens ${new Date(selectedBundle.startAt).toLocaleString()}`}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 overflow-y-auto">
                            {problemDetail.testCases.length === 0 ? (
                              <div className="flex items-center justify-center py-10">
                                <p className="text-white/20 text-sm">No test cases yet</p>
                              </div>
                            ) : (
                              <div className="p-3 space-y-2">
                                {problemDetail.testCases.map((tc, i) => {
                                  const judgeRes = judgeResult?.results.find((r) => r.id === tc.id);
                                  const isSelected = selectedTcId === tc.id;
                                  return (
                                    <div key={tc.id}>
                                      <button
                                        onClick={() => setSelectedTcId(isSelected ? null : tc.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${isSelected ? "bg-primary/10 border-primary/30" : "bg-[#1a1d27] border-white/10 hover:border-white/20"}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded-full bg-white/10 text-white/50 text-[10px] flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                                          <span className="text-sm text-white/80 flex-1">{tc.name}</span>
                                          <Badge variant="outline" className="text-[10px] border-white/20 text-white/40">{tc.marks}m</Badge>
                                          {tc.isSample ? <Eye className="w-3 h-3 text-white/30" /> : <EyeOff className="w-3 h-3 text-white/20" />}
                                          {judgeRes && (judgeRes.passed ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />)}
                                        </div>
                                        {tc.description && <p className="text-[11px] text-white/30 mt-1 ml-7">{tc.description}</p>}
                                      </button>

                                      {isSelected && (
                                        <div className="mx-1 mb-1 p-3 bg-[#0f1117] border border-white/10 border-t-0 rounded-b-lg space-y-3">
                                          {tc.isSample ? (
                                            <>
                                              <CopyBox label="Sample Input" value={tc.input} onUseAsInput={() => handleUseInput(tc.input)} />
                                              <CopyBox label="Expected Output" value={tc.expectedOutput} />
                                            </>
                                          ) : (
                                            <p className="text-xs text-white/30 text-center py-2">Hidden test case — input/output not shown</p>
                                          )}
                                          {judgeRes && (
                                            <div className={`rounded p-2 text-xs ${judgeRes.passed ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                                              {judgeRes.passed ? `✓ Passed — ${judgeRes.marks} marks earned` : `✗ Failed — 0/${judgeRes.maxMarks} marks`}
                                              {!judgeRes.passed && judgeRes.actualOutput !== null && (
                                                <div className="mt-2">
                                                  <p className="text-[10px] text-white/30 mb-1">Your output:</p>
                                                  <pre className="whitespace-pre-wrap text-red-200/70">{judgeRes.actualOutput || "(empty)"}</pre>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Judge results summary */}
                          {judgeResult && (
                            <div className="shrink-0 border-t border-white/10 bg-[#1a1d27] px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Trophy className={`w-5 h-5 shrink-0 ${judgeResult.earnedMarks === judgeResult.totalMarks ? "text-yellow-400" : "text-white/40"}`} />
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-white">
                                    {judgeResult.earnedMarks} / {judgeResult.totalMarks} marks
                                  </p>
                                  <p className="text-xs text-white/40">
                                    {judgeResult.results.filter((r) => r.passed).length}/{judgeResult.results.length} test cases passed
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-lg font-bold ${judgeResult.earnedMarks === judgeResult.totalMarks ? "text-green-400" : judgeResult.earnedMarks > 0 ? "text-yellow-400" : "text-red-400"}`}>
                                    {Math.round((judgeResult.earnedMarks / judgeResult.totalMarks) * 100)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Judge / Re-Judge button */}
                          <div className="shrink-0 border-t border-white/10 p-3">
                            {judgeResult ? (
                              <Button variant="outline" className="w-full gap-2 border-white/20 text-white/60 bg-transparent hover:bg-white/10" onClick={() => { setJudgeResult(null); handleJudge(); }}>
                                <RotateCcw className="w-4 h-4" /> Re-Submit
                              </Button>
                            ) : (
                              <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-500" onClick={handleJudge} disabled={judging}>
                                {judging ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                                {judging ? "Submitting..." : "Submit"}
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
