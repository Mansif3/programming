import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetMyBatches, getGetMyBatchesQueryKey,
  useGetMyBatchStats, getGetMyBatchStatsQueryKey,
  useGetMyBatchAnnouncements, getGetMyBatchAnnouncementsQueryKey,
  type AnnouncementItem,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Editor from "@monaco-editor/react";
import {
  GraduationCap, Video, CalendarDays, ChevronLeft,
  BellRing, Bell, ChevronRight, Play, RotateCcw, Terminal, Loader2,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  ended:    "bg-slate-100 text-slate-500 border-slate-200",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ─── Announcement panel ───────────────────────────────────────────────────────
function AnnouncementPanel({ batchId }: { batchId: number }) {
  const { data: items, isLoading } = useGetMyBatchAnnouncements(batchId, {
    query: { queryKey: getGetMyBatchAnnouncementsQueryKey(batchId) },
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [selected, setSelected] = useState<AnnouncementItem | null>(null);

  const openDetail = (a: AnnouncementItem) => {
    setSelected(a);
    setListOpen(false);
    setDetailOpen(true);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className="w-4 h-4 text-amber-500" />
          Announcements
        </div>

        {isLoading && (
          <div className="space-y-2 flex-1">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        )}

        {!isLoading && (!items || items.length === 0) && (
          <p className="text-xs text-muted-foreground py-2">No announcements yet.</p>
        )}

        {!isLoading && items && items.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {items.map((a) => (
              <div
                key={a.id}
                className="border rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => openDetail(a)}
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap">
                  <CalendarDays className="w-3 h-3 shrink-0" />
                  <span>{fmtDate(a.createdAt)}, {fmtTime(a.createdAt)}</span>
                  <span className="ml-auto text-primary font-medium">View Details</span>
                </div>
                <p className="text-sm font-medium line-clamp-1">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.content}</p>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline" size="sm" className="w-full text-xs h-8 mt-auto shrink-0"
          onClick={() => setListOpen(true)}
        >
          See All Announcements
        </Button>
      </CardContent>

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
              {selected?.title}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <p className="text-xs text-muted-foreground -mt-2">
              {fmtDate(selected.createdAt)}, {fmtTime(selected.createdAt)}
            </p>
          )}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected?.content}</p>
        </DialogContent>
      </Dialog>

      {/* All announcements modal */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>All Announcements</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-1">
            {(items ?? []).map((a) => (
              <div
                key={a.id}
                className="border rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => openDetail(a)}
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <CalendarDays className="w-3 h-3" />
                  {fmtDate(a.createdAt)}, {fmtTime(a.createdAt)}
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.content}</p>
              </div>
            ))}
            {!isLoading && (!items || items.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No announcements yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── C Compiler card ──────────────────────────────────────────────────────────
const DEFAULT_CODE = `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`;

async function runC(code: string, stdin = ""): Promise<{ ok: boolean; output: string }> {
  try {
    const res = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, stdin }),
    });
    const d = await res.json() as { status?: string; program_output?: string; compiler_error?: string; program_error?: string; error?: string };
    if (d.error) return { ok: false, output: d.error };
    const ok = parseInt(d.status ?? "0", 10) === 0;
    const out = d.program_output ?? d.compiler_error ?? d.program_error ?? "(no output)";
    return { ok, output: out };
  } catch (e) {
    return { ok: false, output: String(e) };
  }
}

function CCompilerCard() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [stdin, setStdin] = useState("");
  const [showInput, setShowInput] = useState(true);
  const [output, setOutput] = useState<{ ok: boolean; text: string } | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    const r = await runC(code, stdin);
    setOutput({ ok: r.ok, text: r.output });
    setRunning(false);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-[#0f1117] border-white/10">
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#1a1d27] shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">Problems</span>
            <Badge variant="outline" className="text-[10px] border-white/20 text-white/40 bg-transparent">GCC · C11</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="ghost"
              className={`h-7 px-2 gap-1 text-xs hover:bg-white/10 transition-colors ${showInput ? "text-primary bg-primary/10" : "text-white/50 hover:text-white"}`}
              onClick={() => setShowInput(!showInput)}
              title="Toggle input (stdin)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6M9 8h6M9 16h4"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              Input
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 px-2 text-white/50 hover:text-white hover:bg-white/10"
              onClick={() => { setCode(DEFAULT_CODE); setStdin(""); setOutput(null); }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 gap-1.5 bg-green-600 hover:bg-green-500 text-white"
              onClick={handleRun}
              disabled={running}
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {running ? "Running..." : "Run"}
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage="c"
            value={code}
            onChange={(v) => setCode(v ?? "")}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              tabSize: 4,
              automaticLayout: true,
              padding: { top: 8, bottom: 8 },
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          />
        </div>

        {/* Input (stdin) */}
        {showInput && (
          <div className="shrink-0 border-t border-white/10 bg-[#0a0c11]">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-4 pt-2.5 pb-1">
              Input (stdin)
            </p>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter program input here..."
              rows={3}
              className="w-full bg-transparent text-white/80 text-xs font-mono px-4 pb-2.5 resize-none outline-none placeholder:text-white/20 leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {/* Output */}
        {(output || running) && (
          <div className="shrink-0 border-t border-white/10 bg-[#0a0c11] px-4 py-3 max-h-36 overflow-y-auto">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Output</p>
            {running ? (
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Compiling...
              </div>
            ) : (
              <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed ${output?.ok ? "text-green-300" : "text-red-300"}`}>
                {output?.text}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



// ─── Batch detail view ────────────────────────────────────────────────────────
function BatchDetail({
  batchId, batchName, batchStatus, onBack, showBack,
}: {
  batchId: number; batchName: string; batchStatus: string;
  onBack: () => void; showBack: boolean;
}) {
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetMyBatchStats(batchId, {
    query: { queryKey: getGetMyBatchStatsQueryKey(batchId) },
  });

  return (
    <div className="flex flex-col">
      {showBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-1 mb-4 gap-1">
          <ChevronLeft className="w-4 h-4" /> All Batches
        </Button>
      )}

      {/* Batch header */}
      <div className="flex items-center gap-2 mb-5">
        <h1 className="text-xl font-bold">{batchName}</h1>
        <Badge variant="outline" className={`text-xs ${STATUS_STYLES[batchStatus] ?? ""}`}>
          {batchStatus}
        </Badge>
      </div>

      {/* Progress card */}
      {statsLoading ? (
        <Skeleton className="h-24 w-full mb-4" />
      ) : stats ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-0.5 uppercase tracking-wide">{batchName}</p>
                <p className="text-sm font-semibold mb-1.5">
                  {stats.watchedCount} / {stats.totalCount} classes watched
                </p>
                <div className="flex items-center gap-3">
                  <Progress value={stats.progressPercent} className="flex-1 h-2" />
                  <span className="text-sm font-bold text-primary tabular-nums">{stats.progressPercent}%</span>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0 hidden sm:flex"
                onClick={() => navigate(`/my-classes/watch/${batchId}/0`)}
              >
                Continue Course
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Announcements + chart side by side */}
      <div className="grid gap-4 lg:grid-cols-2 auto-rows-fr min-h-[calc(100vh-240px)]">
        <AnnouncementPanel batchId={batchId} />
        {stats ? (
          <CCompilerCard />
        ) : (
          <Skeleton className="w-full" />
        )}
      </div>

    </div>
  );
}

// ─── Batch card grid ─────────────────────────────────────────────────────────
function BatchCard({
  batch,
  onClick,
}: {
  batch: { id: number; name: string; description?: string | null; status: string; classCount: number; startDate?: string | null };
  onClick: () => void;
}) {
  const { data: stats } = useGetMyBatchStats(batch.id, {
    query: { queryKey: getGetMyBatchStatsQueryKey(batch.id) },
  });

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{batch.name}</CardTitle>
          <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_STYLES[batch.status] ?? ""}`}>
            {batch.status}
          </Badge>
        </div>
        {batch.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{batch.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Video className="w-3.5 h-3.5" /> {batch.classCount} classes
          </span>
          {batch.startDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {new Date(batch.startDate).toLocaleDateString()}
            </span>
          )}
        </div>
        {stats && stats.totalCount > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{stats.watchedCount}/{stats.totalCount} watched</span>
              <span className="font-medium text-primary">{stats.progressPercent}%</span>
            </div>
            <Progress value={stats.progressPercent} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────
export default function MyClasses() {
  const { data: batches, isLoading } = useGetMyBatches({
    query: { queryKey: getGetMyBatchesQueryKey() },
  });
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  // Auto-select if only one batch
  useEffect(() => {
    if (batches && batches.length === 1 && selectedBatchId === null) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const selectedBatch = batches?.find((b) => b.id === selectedBatchId);
  const multiplesBatches = (batches?.length ?? 0) > 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-8 max-w-7xl min-h-[calc(100vh-4rem)]">
        {selectedBatchId && selectedBatch ? (
          <BatchDetail
            batchId={selectedBatchId}
            batchName={selectedBatch.name}
            batchStatus={selectedBatch.status}
            showBack={multiplesBatches}
            onBack={() => setSelectedBatchId(null)}
          />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">My Classes</h1>
              <p className="text-muted-foreground text-sm mt-1">Your enrolled batches and their classes</p>
            </div>

            {isLoading && (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
              </div>
            )}

            {!isLoading && (!batches || batches.length === 0) && (
              <Card>
                <CardContent className="py-20 text-center">
                  <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="font-semibold text-lg mb-1">No batches yet</p>
                  <p className="text-sm text-muted-foreground">You haven't been added to any batch. Contact your admin.</p>
                </CardContent>
              </Card>
            )}

            {batches && batches.length > 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {batches.map((b) => (
                  <BatchCard key={b.id} batch={b} onClick={() => setSelectedBatchId(b.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
