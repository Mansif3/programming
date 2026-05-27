import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Pencil, Loader2, ChevronDown, ChevronRight, Eye, EyeOff, Copy, Check,
  Package, FlaskConical, GripVertical, ArrowUp, ArrowDown, X,
} from "lucide-react";

type Problem = {
  id: number; title: string; description: string | null;
  constraints: string | null; inputFormat: string | null; outputFormat: string | null;
  totalMarks: number; testCaseCount?: number; createdAt: string;
};
type TestCase = {
  id: number; problemId: number; name: string; description: string | null;
  input: string; expectedOutput: string; marks: number; isSample: boolean; orderIndex: number;
};
type Bundle = {
  id: number; title: string; description: string | null;
  problemCount: number; createdAt: string;
};
type BundleProblem = {
  id: number; bundleId: number; problemId: number; orderIndex: number;
  title: string; description: string | null; totalMarks: number;
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const PROBLEMS_KEY = ["admin", "problems"];
const TC_KEY = (id: number) => ["admin", "problems", id, "test-cases"];
const BUNDLES_KEY = ["admin", "problem-bundles"];
const BUNDLE_PROBS_KEY = (id: number) => ["admin", "problem-bundles", id, "problems"];

const EMPTY_PROB = { title: "", description: "", constraints: "", inputFormat: "", outputFormat: "" };
const EMPTY_BUNDLE = { title: "", description: "" };

function AdminCopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-3 py-2 text-xs font-mono bg-background whitespace-pre-wrap break-all leading-relaxed">{value || "(empty)"}</pre>
    </div>
  );
}

export default function AdminProblems() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Problems ─────────────────────────────────────────────────────────────
  const { data: problems = [], isLoading } = useQuery<Problem[]>({
    queryKey: PROBLEMS_KEY,
    queryFn: () => apiFetch<Problem[]>("/api/admin/problems"),
  });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [probDialog, setProbDialog] = useState<{ open: boolean; editing?: Problem }>({ open: false });
  const [probForm, setProbForm] = useState(EMPTY_PROB);
  const [tcDialog, setTcDialog] = useState<{ open: boolean; problemId?: number; editing?: TestCase }>({ open: false });
  const [tcForm, setTcForm] = useState({ name: "", description: "", input: "", expectedOutput: "", marks: "10", isSample: true });
  const [delProb, setDelProb] = useState<Problem | null>(null);
  const [delTc, setDelTc] = useState<TestCase | null>(null);

  const { data: testCases = [] } = useQuery<TestCase[]>({
    queryKey: TC_KEY(expandedId ?? 0),
    queryFn: () => apiFetch<TestCase[]>(`/api/admin/problems/${expandedId}/test-cases`),
    enabled: expandedId !== null,
  });

  const createProblem = useMutation({
    mutationFn: (data: typeof EMPTY_PROB) =>
      apiFetch<Problem>("/api/admin/problems", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PROBLEMS_KEY }); toast({ title: "Problem created" }); setProbDialog({ open: false }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const updateProblem = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      apiFetch<Problem>(`/api/admin/problems/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PROBLEMS_KEY }); toast({ title: "Problem updated" }); setProbDialog({ open: false }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const deleteProblem = useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/api/admin/problems/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PROBLEMS_KEY }); toast({ title: "Problem deleted" }); setDelProb(null); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const createTc = useMutation({
    mutationFn: ({ problemId, data }: { problemId: number; data: object }) =>
      apiFetch<TestCase>(`/api/admin/problems/${problemId}/test-cases`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, { problemId }) => { qc.invalidateQueries({ queryKey: TC_KEY(problemId) }); qc.invalidateQueries({ queryKey: PROBLEMS_KEY }); toast({ title: "Test case added" }); setTcDialog({ open: false }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const updateTc = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiFetch<TestCase>(`/api/admin/test-cases/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: TC_KEY(expandedId ?? 0) }); qc.invalidateQueries({ queryKey: PROBLEMS_KEY }); toast({ title: "Test case updated" }); setTcDialog({ open: false }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const deleteTc = useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/api/admin/test-cases/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: TC_KEY(expandedId ?? 0) }); qc.invalidateQueries({ queryKey: PROBLEMS_KEY }); toast({ title: "Test case deleted" }); setDelTc(null); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  // ── Bundles ───────────────────────────────────────────────────────────────
  const { data: bundles = [], isLoading: bundlesLoading } = useQuery<Bundle[]>({
    queryKey: BUNDLES_KEY,
    queryFn: () => apiFetch<Bundle[]>("/api/admin/problem-bundles"),
  });

  const [expandedBundleId, setExpandedBundleId] = useState<number | null>(null);
  const [bundleDialog, setBundleDialog] = useState<{ open: boolean; editing?: Bundle }>({ open: false });
  const [bundleForm, setBundleForm] = useState(EMPTY_BUNDLE);
  const [delBundle, setDelBundle] = useState<Bundle | null>(null);
  const [addProbToBundleDialog, setAddProbToBundleDialog] = useState<{ open: boolean; bundleId: number | null }>({ open: false, bundleId: null });
  const [selectedProbToAdd, setSelectedProbToAdd] = useState<string>("");
  const [delBundleProb, setDelBundleProb] = useState<{ bundleId: number; id: number; title: string } | null>(null);

  const { data: bundleProblems = [], refetch: refetchBundleProblems } = useQuery<BundleProblem[]>({
    queryKey: BUNDLE_PROBS_KEY(expandedBundleId ?? 0),
    queryFn: () => apiFetch<BundleProblem[]>(`/api/admin/problem-bundles/${expandedBundleId}/problems`),
    enabled: expandedBundleId !== null,
  });

  const createBundle = useMutation({
    mutationFn: (data: typeof EMPTY_BUNDLE) =>
      apiFetch<Bundle>("/api/admin/problem-bundles", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: BUNDLES_KEY }); toast({ title: "Bundle created" }); setBundleDialog({ open: false }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const updateBundle = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof EMPTY_BUNDLE }) =>
      apiFetch<Bundle>(`/api/admin/problem-bundles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: BUNDLES_KEY }); toast({ title: "Bundle updated" }); setBundleDialog({ open: false }); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const deleteBundle = useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/api/admin/problem-bundles/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: BUNDLES_KEY }); toast({ title: "Bundle deleted" }); setDelBundle(null); },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const addProbToBundle = useMutation({
    mutationFn: ({ bundleId, problemId }: { bundleId: number; problemId: number }) =>
      apiFetch(`/api/admin/problem-bundles/${bundleId}/problems`, { method: "POST", body: JSON.stringify({ problemId }) }),
    onSuccess: () => {
      refetchBundleProblems();
      qc.invalidateQueries({ queryKey: BUNDLES_KEY });
      toast({ title: "Problem added to bundle" });
      setAddProbToBundleDialog({ open: false, bundleId: null });
      setSelectedProbToAdd("");
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const removeProbFromBundle = useMutation({
    mutationFn: ({ bundleId, id }: { bundleId: number; id: number }) =>
      apiFetch<void>(`/api/admin/problem-bundles/${bundleId}/problems/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refetchBundleProblems();
      qc.invalidateQueries({ queryKey: BUNDLES_KEY });
      toast({ title: "Problem removed from bundle" });
      setDelBundleProb(null);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function openNewProblem() { setProbForm(EMPTY_PROB); setProbDialog({ open: true }); }
  function openEditProblem(p: Problem) {
    setProbForm({ title: p.title, description: p.description ?? "", constraints: p.constraints ?? "", inputFormat: p.inputFormat ?? "", outputFormat: p.outputFormat ?? "" });
    setProbDialog({ open: true, editing: p });
  }
  function saveProblem() {
    if (probDialog.editing) updateProblem.mutate({ id: probDialog.editing.id, data: probForm });
    else createProblem.mutate(probForm);
  }
  function openNewTc(problemId: number) {
    setTcForm({ name: "", description: "", input: "", expectedOutput: "", marks: "10", isSample: true });
    setTcDialog({ open: true, problemId });
  }
  function openEditTc(tc: TestCase) {
    setTcForm({ name: tc.name, description: tc.description ?? "", input: tc.input, expectedOutput: tc.expectedOutput, marks: String(tc.marks), isSample: tc.isSample });
    setTcDialog({ open: true, editing: tc });
  }
  function saveTc() {
    const data = { ...tcForm, marks: parseInt(tcForm.marks, 10) || 10 };
    if (tcDialog.editing) updateTc.mutate({ id: tcDialog.editing.id, data });
    else createTc.mutate({ problemId: tcDialog.problemId!, data });
  }
  function openNewBundle() { setBundleForm(EMPTY_BUNDLE); setBundleDialog({ open: true }); }
  function openEditBundle(b: Bundle) { setBundleForm({ title: b.title, description: b.description ?? "" }); setBundleDialog({ open: true, editing: b }); }
  function saveBundle() {
    if (bundleDialog.editing) updateBundle.mutate({ id: bundleDialog.editing.id, data: bundleForm });
    else createBundle.mutate(bundleForm);
  }

  // Problems not yet in the currently expanded bundle
  const alreadyInBundle = new Set(bundleProblems.map((bp) => bp.problemId));
  const availableToAdd = problems.filter((p) => !alreadyInBundle.has(p.id));

  const isSaving = createProblem.isPending || updateProblem.isPending;
  const isSavingTc = createTc.isPending || updateTc.isPending;
  const isSavingBundle = createBundle.isPending || updateBundle.isPending;

  return (
    <AdminLayout title="Problems & Bundles" subtitle="Manage C programming problems, test cases, and problem bundles">
      <Tabs defaultValue="problems">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="problems" className="gap-2">
              <FlaskConical className="w-3.5 h-3.5" /> Problems ({problems.length})
            </TabsTrigger>
            <TabsTrigger value="bundles" className="gap-2">
              <Package className="w-3.5 h-3.5" /> Bundles ({bundles.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── PROBLEMS TAB ───────────────────────────────────────────────── */}
        <TabsContent value="problems" className="space-y-4 mt-0">
          <div className="flex items-center justify-end">
            <Button onClick={openNewProblem} className="gap-2">
              <Plus className="w-4 h-4" /> New Problem
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : problems.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground mb-4">No problems yet. Create your first problem.</p>
                <Button onClick={openNewProblem} className="gap-2"><Plus className="w-4 h-4" /> New Problem</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {problems.map((p) => {
                const expanded = expandedId === p.id;
                return (
                  <Card key={p.id} className="overflow-hidden">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="flex items-start gap-2 text-left min-w-0 flex-1 pt-0.5"
                          onClick={() => setExpandedId(expanded ? null : p.id)}
                        >
                          {expanded ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />}
                          <div className="min-w-0">
                            <CardTitle className="text-base">{p.title}</CardTitle>
                            {p.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs hidden sm:flex">{p.testCaseCount ?? 0} test cases</Badge>
                          <Button size="sm" variant="outline" onClick={() => openEditProblem(p)} className="gap-1.5 h-8 px-3 text-xs font-medium">
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => setDelProb(p)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {expanded && (
                      <CardContent className="pt-0 pb-4 border-t">
                        <div className="flex items-center justify-between mb-3 pt-4">
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Test Cases</h3>
                          <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => openNewTc(p.id)}>
                            <Plus className="w-3.5 h-3.5" /> Add Test Case
                          </Button>
                        </div>
                        {testCases.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">No test cases yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {testCases.map((tc, i) => {
                              const sampleIdx = testCases.filter((t, j) => t.isSample && j <= i).length;
                              return (
                                <div key={tc.id} className="rounded-lg border overflow-hidden">
                                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                                    <span className="text-xs font-semibold text-foreground">{tc.name || (tc.isSample ? `Sample ${sampleIdx}` : `Hidden ${i + 1}`)}</span>
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{tc.marks}m</Badge>
                                    {tc.isSample ? (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1 text-green-700 border-green-300 bg-green-50"><Eye className="w-2.5 h-2.5" />Sample</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1 text-slate-500"><EyeOff className="w-2.5 h-2.5" />Hidden</Badge>
                                    )}
                                    <div className="flex gap-1 ml-auto">
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditTc(tc)}><Pencil className="w-3 h-3" /></Button>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => setDelTc(tc)}><Trash2 className="w-3 h-3" /></Button>
                                    </div>
                                  </div>
                                  <div className="p-3 grid grid-cols-2 gap-2">
                                    <AdminCopyBox label="Input" value={tc.input} />
                                    <AdminCopyBox label="Expected Output" value={tc.expectedOutput} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── BUNDLES TAB ────────────────────────────────────────────────── */}
        <TabsContent value="bundles" className="space-y-4 mt-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Group problems into bundles, then assign bundles to batches with time windows.</p>
            <Button onClick={openNewBundle} className="gap-2">
              <Plus className="w-4 h-4" /> New Bundle
            </Button>
          </div>

          {bundlesLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : bundles.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-2">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">No bundles yet.</p>
                <p className="text-sm text-muted-foreground/70">Create a bundle to group problems together, then assign it to a batch.</p>
                <Button onClick={openNewBundle} className="gap-2 mt-2"><Plus className="w-4 h-4" /> New Bundle</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bundles.map((b) => {
                const expanded = expandedBundleId === b.id;
                return (
                  <Card key={b.id} className="overflow-hidden">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="flex items-start gap-2 text-left min-w-0 flex-1 pt-0.5"
                          onClick={() => setExpandedBundleId(expanded ? null : b.id)}
                        >
                          {expanded
                            ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                            : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                          }
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary shrink-0" />
                              <CardTitle className="text-base">{b.title}</CardTitle>
                            </div>
                            {b.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{b.description}</p>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs hidden sm:flex">
                            {b.problemCount} {b.problemCount === 1 ? "problem" : "problems"}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => openEditBundle(b)} className="gap-1.5 h-8 px-3 text-xs font-medium">
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => setDelBundle(b)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {expanded && (
                      <CardContent className="pt-0 pb-4 border-t">
                        <div className="flex items-center justify-between mb-3 pt-4">
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Problems in this bundle
                          </h3>
                          <Button
                            size="sm" className="gap-1.5 h-7 text-xs"
                            onClick={() => { setSelectedProbToAdd(""); setAddProbToBundleDialog({ open: true, bundleId: b.id }); }}
                            disabled={availableToAdd.length === 0 && expandedBundleId === b.id}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Problem
                          </Button>
                        </div>

                        {bundleProblems.length === 0 ? (
                          <div className="py-8 text-center border border-dashed rounded-lg">
                            <FlaskConical className="w-6 h-6 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">No problems in this bundle yet.</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Click "Add Problem" to add problems from your library.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {bundleProblems
                              .slice()
                              .sort((a, z) => a.orderIndex - z.orderIndex)
                              .map((bp, idx) => (
                                <div
                                  key={bp.id}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors group"
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{bp.title}</p>
                                    {bp.description && (
                                      <p className="text-xs text-muted-foreground truncate">{bp.description}</p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] shrink-0">{bp.totalMarks}m</Badge>
                                  <button
                                    onClick={() => setDelBundleProb({ bundleId: b.id, id: bp.problemId, title: bp.title })}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 shrink-0 p-1 rounded"
                                    title="Remove from bundle"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Problem Dialog ─────────────────────────────────────────────── */}
      <Dialog open={probDialog.open} onOpenChange={(o) => setProbDialog({ open: o })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{probDialog.editing ? "Edit Problem" : "New Problem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input className="mt-1" placeholder="e.g. Zero or Non Zero" value={probForm.title} onChange={(e) => setProbForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Statement</Label>
              <p className="text-xs text-muted-foreground mb-1">Full problem description shown to students</p>
              <Textarea className="mt-1 break-words whitespace-pre-wrap" rows={5} placeholder="In this problem you will be given an integer number N..." value={probForm.description} onChange={(e) => setProbForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Constraints</Label>
              <p className="text-xs text-muted-foreground mb-1">One constraint per line</p>
              <Textarea className="mt-1" rows={2} placeholder="-1000 <= N <= 1000" value={probForm.constraints} onChange={(e) => setProbForm((f) => ({ ...f, constraints: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Input Format</Label>
                <p className="text-xs text-muted-foreground mb-1">One bullet per line</p>
                <Textarea className="mt-1" rows={2} placeholder="The input consists of an integer N." value={probForm.inputFormat} onChange={(e) => setProbForm((f) => ({ ...f, inputFormat: e.target.value }))} />
              </div>
              <div>
                <Label>Output Format</Label>
                <p className="text-xs text-muted-foreground mb-1">One bullet per line</p>
                <Textarea className="mt-1" rows={2} placeholder="Print Zero if 0, Non Zero otherwise." value={probForm.outputFormat} onChange={(e) => setProbForm((f) => ({ ...f, outputFormat: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProbDialog({ open: false })}>Cancel</Button>
            <Button onClick={saveProblem} disabled={!probForm.title.trim() || isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {probDialog.editing ? "Save Changes" : "Create Problem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Test Case Dialog ───────────────────────────────────────────── */}
      <Dialog open={tcDialog.open} onOpenChange={(o) => setTcDialog({ open: o })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tcDialog.editing ? "Edit Test Case" : "Add Test Case"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input className="mt-1" placeholder="auto e.g. Sample 1, Test 2…" value={tcForm.name} onChange={(e) => setTcForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Marks *</Label>
                <Input className="mt-1" type="number" min={1} placeholder="10" value={tcForm.marks} onChange={(e) => setTcForm((f) => ({ ...f, marks: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input className="mt-1" placeholder="Short note about this test case..." value={tcForm.description} onChange={(e) => setTcForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Input (stdin)</Label>
                <Textarea className="mt-1 font-mono text-sm" rows={4} placeholder="Program input (leave empty if none)" value={tcForm.input} onChange={(e) => setTcForm((f) => ({ ...f, input: e.target.value }))} />
              </div>
              <div>
                <Label>Expected Output *</Label>
                <Textarea className="mt-1 font-mono text-sm" rows={4} placeholder="Expected program output..." value={tcForm.expectedOutput} onChange={(e) => setTcForm((f) => ({ ...f, expectedOutput: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={tcForm.isSample} onCheckedChange={(v) => setTcForm((f) => ({ ...f, isSample: v }))} />
              <div>
                <Label className="cursor-pointer">Sample test case</Label>
                <p className="text-xs text-muted-foreground">Sample test cases show input/output to students. Hidden test cases only show pass/fail.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTcDialog({ open: false })}>Cancel</Button>
            <Button onClick={saveTc} disabled={!tcForm.expectedOutput.trim() || isSavingTc}>
              {isSavingTc && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tcDialog.editing ? "Save Changes" : "Add Test Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bundle Dialog ──────────────────────────────────────────────── */}
      <Dialog open={bundleDialog.open} onOpenChange={(o) => setBundleDialog({ open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              {bundleDialog.editing ? "Edit Bundle" : "New Problem Bundle"}
            </DialogTitle>
            <DialogDescription>
              A bundle groups problems together. You can then assign a bundle to a batch with a time window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label>Bundle Name *</Label>
              <Input
                className="mt-1" placeholder="e.g. Week 1 — Arrays"
                value={bundleForm.title}
                onChange={(e) => setBundleForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                className="mt-1" rows={2} placeholder="Short description shown to students…"
                value={bundleForm.description}
                onChange={(e) => setBundleForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBundleDialog({ open: false })}>Cancel</Button>
            <Button onClick={saveBundle} disabled={!bundleForm.title.trim() || isSavingBundle}>
              {isSavingBundle && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {bundleDialog.editing ? "Save Changes" : "Create Bundle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Problem to Bundle Dialog ───────────────────────────────── */}
      <Dialog
        open={addProbToBundleDialog.open}
        onOpenChange={(o) => { if (!o) { setAddProbToBundleDialog({ open: false, bundleId: null }); setSelectedProbToAdd(""); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" /> Add Problem to Bundle
            </DialogTitle>
            <DialogDescription>Choose a problem from your library to add to this bundle.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {availableToAdd.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All problems are already in this bundle.</p>
            ) : (
              <div className="space-y-1.5">
                <Label>Problem</Label>
                <Select value={selectedProbToAdd} onValueChange={setSelectedProbToAdd}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a problem…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        <span>{p.title}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({p.testCaseCount ?? 0} test cases)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProbToBundleDialog({ open: false, bundleId: null })}>Cancel</Button>
            <Button
              disabled={!selectedProbToAdd || addProbToBundle.isPending || availableToAdd.length === 0}
              onClick={() => addProbToBundle.mutate({
                bundleId: addProbToBundleDialog.bundleId!,
                problemId: parseInt(selectedProbToAdd, 10),
              })}
            >
              {addProbToBundle.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Problem ─────────────────────────────────────────────── */}
      <AlertDialog open={!!delProb} onOpenChange={(o) => !o && setDelProb(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Problem?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete &quot;{delProb?.title}&quot; and all its test cases.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => delProb && deleteProblem.mutate(delProb.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Test Case ───────────────────────────────────────────── */}
      <AlertDialog open={!!delTc} onOpenChange={(o) => !o && setDelTc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Case?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete &quot;{delTc?.name}&quot;.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => delTc && deleteTc.mutate(delTc.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Bundle ──────────────────────────────────────────────── */}
      <AlertDialog open={!!delBundle} onOpenChange={(o) => !o && setDelBundle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{delBundle?.title}&quot; and remove it from all batch assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => delBundle && deleteBundle.mutate(delBundle.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Remove Problem from Bundle ─────────────────────────────────── */}
      <AlertDialog open={!!delBundleProb} onOpenChange={(o) => !o && setDelBundleProb(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{delBundleProb?.title}&quot; from this bundle? The problem itself won&apos;t be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => delBundleProb && removeProbFromBundle.mutate({ bundleId: delBundleProb.bundleId, id: delBundleProb.id })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
