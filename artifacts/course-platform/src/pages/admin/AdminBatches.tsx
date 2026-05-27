import { useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  useListBatches, useCreateBatch, useDeleteBatch,
  useGetBatch, useUpdateBatch,
  useAddBatchStudent, useRemoveBatchStudent,
  useListAdminStudents,
  getListBatchesQueryKey, getGetBatchQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Loader2, GraduationCap, Users, Video,
  CalendarDays, ChevronRight, ArrowLeft, Eye, EyeOff, BookOpen,
  CalendarClock, Clock, ChevronDown, ChevronUp, FlaskConical,
  Package, Timer, LockOpen, Lock, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { getAppNow } from "@/hooks/use-app-time";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function batchApiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

type BatchCourseRow = {
  id: number; batchId: number; courseId: number; addedAt: string;
  courseTitle: string | null; courseSlug: string | null; courseThumbnail: string | null; courseCategory: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ended: "bg-slate-50 text-slate-500 border-slate-200",
};

type BatchForm = { name: string; description: string; startDate: string; endDate: string; status: "upcoming" | "active" | "ended" };

const emptyBatch = (): BatchForm => ({ name: "", description: "", startDate: "", endDate: "", status: "upcoming" });

export default function AdminBatches() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Which batch is "open" for detail view
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Batch CRUD dialogs
  const [batchDialog, setBatchDialog] = useState<"create" | "edit" | null>(null);
  const [batchForm, setBatchForm] = useState<BatchForm>(emptyBatch());
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);

  // Student add dialog
  const [studentDialog, setStudentDialog] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  // Courses tab
  const [courseAddDialog, setCourseAddDialog] = useState(false);
  const [courseAddSearch, setCourseAddSearch] = useState("");

  // Problem bundles tab state
  const [assignBundleDialog, setAssignBundleDialog] = useState(false);
  const [assignBundleForm, setAssignBundleForm] = useState<{ bundleId: string; startAt: string; endAt: string }>({ bundleId: "", startAt: "", endAt: "" });
  const [editAssignDialog, setEditAssignDialog] = useState<{ id: number; startAt: string; endAt: string } | null>(null);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<number | null>(null);

  const { data: batchBundles, refetch: refetchBatchBundles } = useQuery<{
    id: number; batchId: number; bundleId: number; bundleTitle: string; bundleDescription: string | null;
    startAt: string | null; endAt: string | null; problemCount: number; createdAt: string;
  }[]>({
    queryKey: ["batch-problem-bundles", selectedId],
    queryFn: () => batchApiFetch(`/admin/batches/${selectedId}/problem-bundles`),
    enabled: selectedId !== null,
  });

  const { data: allBundles } = useQuery<{ id: number; title: string; description: string | null; problemCount: number; createdAt: string }[]>({
    queryKey: ["all-problem-bundles"],
    queryFn: () => batchApiFetch("/admin/problem-bundles"),
  });

  const assignBundle = useMutation({
    mutationFn: (data: { bundleId: number; startAt: string | null; endAt: string | null }) =>
      batchApiFetch(`/admin/batches/${selectedId}/problem-bundles`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { refetchBatchBundles(); toast({ title: "Bundle assigned to batch" }); setAssignBundleDialog(false); setAssignBundleForm({ bundleId: "", startAt: "", endAt: "" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateBundleAssignment = useMutation({
    mutationFn: ({ id, startAt, endAt }: { id: number; startAt: string | null; endAt: string | null }) =>
      batchApiFetch(`/admin/batches/${selectedId}/problem-bundles/${id}`, { method: "PATCH", body: JSON.stringify({ startAt, endAt }) }),
    onSuccess: () => { refetchBatchBundles(); toast({ title: "Time window updated" }); setEditAssignDialog(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const removeAssignment = useMutation({
    mutationFn: (id: number) => batchApiFetch(`/admin/batches/${selectedId}/problem-bundles/${id}`, { method: "DELETE" }),
    onSuccess: () => { refetchBatchBundles(); toast({ title: "Bundle removed from batch" }); setRemovingAssignmentId(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleProblems = useMutation({
    mutationFn: (enabled: boolean) => batchApiFetch(`/admin/batches/${selectedId}`, { method: "PATCH", body: JSON.stringify({ problemsEnabled: enabled }) }),
    onSuccess: () => {
      if (selectedId) qc.invalidateQueries({ queryKey: getGetBatchQueryKey(selectedId) });
      qc.invalidateQueries({ queryKey: getListBatchesQueryKey() });
      toast({ title: "Problems access updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  function getBundleStatus(startAt: string | null, endAt: string | null) {
    const now = getAppNow();
    if (!startAt && !endAt) return { label: "Always Active", color: "text-emerald-600", icon: LockOpen };
    if (startAt && new Date(startAt) > now) return { label: "Upcoming", color: "text-amber-600", icon: Timer };
    if (endAt && new Date(endAt) < now) return { label: "Expired", color: "text-slate-500", icon: Lock };
    return { label: "Active", color: "text-emerald-600", icon: LockOpen };
  }

  // Module schedule management
  const [schedulePublishAt, setSchedulePublishAt] = useState<string>("");
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [scheduleDialog, setScheduleDialog] = useState<{
    moduleId: number; moduleTitle: string; currentPublishAt: string;
  } | null>(null);

  type BatchModuleRow = {
    id: number; title: string; weekNumber: number; orderIndex: number;
    batchPublishAt: string | null;
  };

  const { data: batchCourseModules, refetch: refetchBatchCourseModules } = useQuery<BatchModuleRow[]>({
    queryKey: ["batch-course-modules", selectedId, expandedCourseId],
    queryFn: () => batchApiFetch(`/admin/batches/${selectedId}/courses/${expandedCourseId}/modules`),
    enabled: selectedId !== null && expandedCourseId !== null,
  });

  type AllModuleRow = { moduleId: number; title: string; weekNumber: number; orderIndex: number; batchPublishAt: string | null; courseId: number; courseTitle: string; courseThumbnail: string | null };
  const { data: batchAllModules, refetch: refetchAllModules } = useQuery<AllModuleRow[]>({
    queryKey: ["batch-all-modules", selectedId],
    queryFn: () => batchApiFetch(`/admin/batches/${selectedId}/modules`),
    enabled: selectedId !== null,
  });

  const setModuleSchedule = useMutation({
    mutationFn: ({ moduleId, publishAt }: { moduleId: number; publishAt: string | null }) =>
      batchApiFetch(`/admin/batches/${selectedId}/modules/${moduleId}/schedule`, {
        method: "PUT",
        body: JSON.stringify({ publishAt }),
      }),
    onSuccess: () => {
      refetchBatchCourseModules();
      refetchAllModules();
      toast({ title: "Module schedule updated" });
      setScheduleDialog(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // Add from payment dialog
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentList, setPaymentList] = useState<{ id: number; userId: number; userName: string | null; userEmail: string | null; courseName: string; amount: number; paymentMethod: string; txnId: string }[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [addingFromPayment, setAddingFromPayment] = useState<number | null>(null);

  const { data: batches, isLoading } = useListBatches();
  const { data: detail, isLoading: detailLoading } = useGetBatch(selectedId ?? 0, {
    query: { enabled: selectedId !== null, queryKey: getGetBatchQueryKey(selectedId ?? 0) },
  });
  const { data: allUsers } = useListAdminStudents();

  const { data: batchCourses, refetch: refetchBatchCourses } = useQuery<BatchCourseRow[]>({
    queryKey: ["batch-courses", selectedId],
    queryFn: () => batchApiFetch(`/admin/batches/${selectedId}/courses`),
    enabled: selectedId !== null,
  });

  const { data: allCourses } = useQuery<{ id: number; title: string; category: string; thumbnail: string }[]>({
    queryKey: ["all-courses-list"],
    queryFn: () => batchApiFetch("/courses"),
  });

  const addBatchCourse = useMutation({
    mutationFn: (courseId: number) => batchApiFetch(`/admin/batches/${selectedId}/courses`, { method: "POST", body: JSON.stringify({ courseId }) }),
    onSuccess: () => { refetchBatchCourses(); toast({ title: "Course added to batch" }); setCourseAddDialog(false); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const removeBatchCourse = useMutation({
    mutationFn: (courseId: number) => batchApiFetch(`/admin/batches/${selectedId}/courses/${courseId}`, { method: "DELETE" }),
    onSuccess: () => { refetchBatchCourses(); toast({ title: "Course removed" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  // Batch mutations
  const createBatch = useCreateBatch({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBatchesQueryKey() });
        toast({ title: "Batch created" });
        setBatchDialog(null);
      },
      onError: (e: unknown) => {
        const err = e as { data?: { error?: string }; message?: string };
        toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" });
      },
    },
  });

  const updateBatch = useUpdateBatch({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBatchesQueryKey() });
        if (selectedId) qc.invalidateQueries({ queryKey: getGetBatchQueryKey(selectedId) });
        toast({ title: "Batch updated" });
        setBatchDialog(null);
      },
      onError: (e: unknown) => {
        const err = e as { data?: { error?: string }; message?: string };
        toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" });
      },
    },
  });

  const deleteBatch = useDeleteBatch({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBatchesQueryKey() });
        toast({ title: "Batch deleted" });
        setDeletingBatchId(null);
        if (selectedId === deletingBatchId) setSelectedId(null);
      },
    },
  });

  // Student mutations
  const addStudent = useAddBatchStudent({
    mutation: {
      onSuccess: () => {
        if (selectedId) qc.invalidateQueries({ queryKey: getGetBatchQueryKey(selectedId) });
        toast({ title: "Student added to batch" });
      },
      onError: (e: unknown) => {
        const err = e as { data?: { error?: string }; message?: string };
        toast({ title: "Failed", description: err?.data?.error ?? err?.message, variant: "destructive" });
      },
    },
  });

  const removeStudent = useRemoveBatchStudent({
    mutation: {
      onSuccess: () => {
        if (selectedId) qc.invalidateQueries({ queryKey: getGetBatchQueryKey(selectedId) });
        toast({ title: "Student removed" });
        setRemovingUserId(null);
      },
    },
  });

  // Open payment dialog: fetch verified payments, exclude already-enrolled students
  function openPaymentDialog() {
    setPaymentDialog(true);
    setPaymentLoading(true);
    fetch("/api/payments")
      .then((r) => r.json())
      .then((data: unknown[]) => {
        const verified = (Array.isArray(data) ? data : []).filter((p: unknown) => (p as { status: string }).status === "verified");
        setPaymentList(verified as typeof paymentList);
      })
      .catch(() => {})
      .finally(() => setPaymentLoading(false));
  }

  async function addFromPayment(userId: number, paymentId: number) {
    if (!selectedId) return;
    setAddingFromPayment(paymentId);
    try {
      await addStudent.mutateAsync({ id: selectedId, data: { userId } });
    } finally {
      setAddingFromPayment(null);
    }
  }

  // Helpers
  const openCreateBatch = () => { setBatchForm(emptyBatch()); setBatchDialog("create"); };
  const openEditBatch = () => {
    if (!detail) return;
    setBatchForm({
      name: detail.name,
      description: detail.description ?? "",
      startDate: detail.startDate ? detail.startDate.slice(0, 10) : "",
      endDate: detail.endDate ? detail.endDate.slice(0, 10) : "",
      status: detail.status as BatchForm["status"],
    });
    setBatchDialog("edit");
  };

  const submitBatch = () => {
    if (!batchForm.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const data = {
      name: batchForm.name,
      description: batchForm.description || undefined,
      startDate: batchForm.startDate || undefined,
      endDate: batchForm.endDate || undefined,
      status: batchForm.status,
    };
    if (batchDialog === "create") {
      createBatch.mutate({ data });
    } else if (selectedId) {
      updateBatch.mutate({ id: selectedId, data });
    }
  };

  // Students not yet in this batch
  const enrolledIds = new Set((detail?.students ?? []).map((s) => s.userId));
  const filteredUsers = (allUsers ?? []).filter((u) => {
    if (enrolledIds.has(u.id)) return false;
    const q = studentSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  // ─── Detail view ───
  if (selectedId !== null) {
    return (
      <AdminLayout title="Batches" subtitle="Manage batch details">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1 -ml-1">
            <ArrowLeft className="w-4 h-4" /> Back to Batches
          </Button>

          {detailLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

          {detail && (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold">{detail.name}</h2>
                    <Badge variant="outline" className={STATUS_STYLES[detail.status] ?? ""}>
                      {detail.status}
                    </Badge>
                  </div>
                  {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    {detail.startDate && <span>Start: {new Date(detail.startDate).toLocaleDateString()}</span>}
                    {detail.endDate && <span>End: {new Date(detail.endDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Problems Access Toggle */}
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${detail.problemsEnabled ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "bg-muted/40 border-border"}`}>
                    <FlaskConical className={`w-4 h-4 shrink-0 ${detail.problemsEnabled ? "text-emerald-600" : "text-muted-foreground"}`} />
                    <div className="leading-tight">
                      <p className="text-xs font-semibold">Problems Access</p>
                      <p className={`text-[10px] ${detail.problemsEnabled ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {detail.problemsEnabled ? "ON — students can see problems" : "OFF — hidden from students"}
                      </p>
                    </div>
                    <Switch
                      checked={!!detail.problemsEnabled}
                      onCheckedChange={(v) => toggleProblems.mutate(v)}
                      disabled={toggleProblems.isPending}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={openEditBatch}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Batch
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeletingBatchId(detail.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="classes">
                <TabsList>
                  <TabsTrigger value="classes">
                    <Video className="w-4 h-4 mr-1.5" /> Classes ({(batchAllModules ?? []).length})
                  </TabsTrigger>
                  <TabsTrigger value="students">
                    <Users className="w-4 h-4 mr-1.5" /> Students ({detail.students.length})
                  </TabsTrigger>
                  <TabsTrigger value="courses">
                    <BookOpen className="w-4 h-4 mr-1.5" /> Courses ({(batchCourses ?? []).length})
                  </TabsTrigger>
                  <TabsTrigger value="problems">
                    <FlaskConical className="w-4 h-4 mr-1.5" /> Problems ({(batchBundles ?? []).length})
                  </TabsTrigger>
                </TabsList>

                {/* Classes tab — shows modules from all linked courses */}
                <TabsContent value="classes" className="mt-4 space-y-4">
                  {(batchAllModules ?? []).length === 0 && (
                    <Card>
                      <CardContent className="py-12 text-center space-y-2">
                        <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No classes yet. Add a course in the Courses tab first.</p>
                      </CardContent>
                    </Card>
                  )}
                  {(() => {
                    const allMods = batchAllModules ?? [];
                    const courseGroups = allMods.reduce<Record<number, { courseTitle: string; courseThumbnail: string | null; modules: AllModuleRow[] }>>((acc, m) => {
                      if (!acc[m.courseId]) acc[m.courseId] = { courseTitle: m.courseTitle, courseThumbnail: m.courseThumbnail, modules: [] };
                      acc[m.courseId].modules.push(m);
                      return acc;
                    }, {});
                    return Object.entries(courseGroups).map(([courseId, group]) => {
                      const weekGroups = group.modules.reduce<Record<number, AllModuleRow[]>>((acc, m) => {
                        (acc[m.weekNumber] ??= []).push(m);
                        return acc;
                      }, {});
                      return (
                        <div key={courseId}>
                          <div className="flex items-center gap-2 mb-2">
                            <img
                              src={group.courseThumbnail || "https://placehold.co/32x24?text=C"}
                              alt={group.courseTitle}
                              className="w-8 h-6 object-cover rounded shrink-0"
                            />
                            <p className="text-sm font-semibold">{group.courseTitle}</p>
                          </div>
                          <div className="space-y-4 pl-10">
                            {Object.entries(weekGroups)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([week, mods]) => (
                                <div key={week}>
                                  <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-mono">Week {week}</span>
                                  </p>
                                  <div className="space-y-1.5">
                                    {mods.sort((a, b) => a.orderIndex - b.orderIndex).map((mod, idx) => (
                                      <Card key={mod.moduleId}>
                                        <CardContent className="p-3 flex items-center gap-3">
                                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                            {idx + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{mod.title}</p>
                                            {mod.batchPublishAt ? (
                                              <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                                                <CalendarClock className="w-3 h-3 shrink-0" />
                                                Publishes {new Date(mod.batchPublishAt).toLocaleString()}
                                              </p>
                                            ) : (
                                              <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3 shrink-0" /> Available immediately
                                              </p>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0"
                                            onClick={() => {
                                              const iso = mod.batchPublishAt ? new Date(mod.batchPublishAt).toISOString() : "";
                                              setSchedulePublishAt(iso);
                                              setScheduleDialog({ moduleId: mod.moduleId, moduleTitle: mod.title, currentPublishAt: iso });
                                            }}
                                          >
                                            <CalendarClock className="w-3 h-3" /> Set date
                                          </Button>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </TabsContent>

                {/* Students tab */}
                <TabsContent value="students" className="mt-4 space-y-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={openPaymentDialog} className="gap-1.5">
                      <GraduationCap className="w-4 h-4" /> Add from Payment
                    </Button>
                    <Button size="sm" onClick={() => { setStudentSearch(""); setStudentDialog(true); }}>
                      <Plus className="w-4 h-4 mr-1.5" /> Add Student
                    </Button>
                  </div>
                  {detail.students.length === 0 && (
                    <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No students enrolled yet.</CardContent></Card>
                  )}
                  {detail.students.map((s) => (
                    <Card key={s.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={s.avatar ?? undefined} />
                          <AvatarFallback>{(s.name ?? "?").slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{s.name ?? "Unknown"}</p>
                            {(s as { studentId?: string | null }).studentId && (
                              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-primary/40 text-primary">
                                {(s as { studentId?: string | null }).studentId}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(s.joinedAt).toLocaleDateString()}
                        </p>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => setRemovingUserId(s.userId)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Problems tab */}
                <TabsContent value="problems" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Assign problem bundles to this batch with a time window. Students can only view test cases during the active window.</p>
                    <Button size="sm" onClick={() => { setAssignBundleForm({ bundleId: "", startAt: "", endAt: "" }); setAssignBundleDialog(true); }}>
                      <Plus className="w-4 h-4 mr-1.5" /> Assign Bundle
                    </Button>
                  </div>

                  {(batchBundles ?? []).length === 0 && (
                    <Card>
                      <CardContent className="py-12 text-center space-y-2">
                        <Package className="w-8 h-8 mx-auto text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No problem bundles assigned yet.</p>
                        <p className="text-xs text-muted-foreground/70">Assign bundles to give students access to problem sets with time-gated test cases.</p>
                      </CardContent>
                    </Card>
                  )}

                  {(batchBundles ?? []).map((bb) => {
                    const status = getBundleStatus(bb.startAt, bb.endAt);
                    const StatusIcon = status.icon;
                    return (
                      <Card key={bb.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold">{bb.bundleTitle}</p>
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5">{bb.problemCount} problems</Badge>
                                <span className={`flex items-center gap-1 text-[11px] font-medium ${status.color}`}>
                                  <StatusIcon className="w-3 h-3" />{status.label}
                                </span>
                              </div>
                              {bb.bundleDescription && <p className="text-xs text-muted-foreground mt-0.5">{bb.bundleDescription}</p>}
                              <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  Start: {bb.startAt ? new Date(bb.startAt).toLocaleString() : <span className="italic text-muted-foreground/60">No limit</span>}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  End: {bb.endAt ? new Date(bb.endAt).toLocaleString() : <span className="italic text-muted-foreground/60">No limit</span>}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost" size="sm" className="h-7 text-xs gap-1"
                                onClick={() => setEditAssignDialog({
                                  id: bb.id,
                                  startAt: bb.startAt ? new Date(bb.startAt).toISOString().slice(0, 16) : "",
                                  endAt: bb.endAt ? new Date(bb.endAt).toISOString().slice(0, 16) : "",
                                })}
                              >
                                <Pencil className="w-3 h-3" /> Edit Times
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setRemovingAssignmentId(bb.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                {/* Courses tab */}
                <TabsContent value="courses" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => { setCourseAddSearch(""); setCourseAddDialog(true); }}>
                      <Plus className="w-4 h-4 mr-1.5" /> Add Course
                    </Button>
                  </div>
                  {(batchCourses ?? []).length === 0 && (
                    <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No courses linked to this batch yet.</CardContent></Card>
                  )}
                  {(batchCourses ?? []).map((bc) => {
                    const isExpanded = expandedCourseId === bc.courseId;
                    const weekGroups = isExpanded ? (batchCourseModules ?? []).reduce<Record<number, typeof batchCourseModules & []>>((acc, m) => {
                      (acc[m.weekNumber] ??= []).push(m);
                      return acc;
                    }, {}) : {};

                    return (
                      <Card key={bc.id} className={isExpanded ? "border-primary/40 ring-1 ring-primary/20" : ""}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={bc.courseThumbnail || "https://placehold.co/56x40?text=C"}
                              alt={bc.courseTitle ?? "Course"}
                              className="w-14 h-10 object-cover rounded shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{bc.courseTitle ?? "Unknown Course"}</p>
                              <p className="text-xs text-muted-foreground">{bc.courseCategory}</p>
                            </div>
                            <p className="text-xs text-muted-foreground shrink-0">Added {new Date(bc.addedAt).toLocaleDateString()}</p>
                            <Button
                              variant="outline" size="sm" className="shrink-0 gap-1"
                              onClick={() => setExpandedCourseId(isExpanded ? null : bc.courseId)}
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                              Schedule
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                              onClick={() => { if (isExpanded) setExpandedCourseId(null); removeBatchCourse.mutate(bc.courseId); }}
                              disabled={removeBatchCourse.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {/* Expandable module schedule section */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t space-y-3">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Module Publish Schedule — set when each module becomes available to students in this batch
                              </p>
                              {(batchCourseModules ?? []).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No modules in this course yet.</p>
                              )}
                              {Object.entries(weekGroups)
                                .sort(([a], [b]) => Number(a) - Number(b))
                                .map(([week, mods]) => (
                                  <div key={week}>
                                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-mono">Week {week}</span>
                                    </p>
                                    <div className="space-y-1.5">
                                      {(mods ?? []).sort((a, b) => a.orderIndex - b.orderIndex).map((mod) => (
                                        <div key={mod.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{mod.title}</p>
                                            {mod.batchPublishAt ? (
                                              <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                                                <CalendarClock className="w-3 h-3 shrink-0" />
                                                Publishes {new Date(mod.batchPublishAt).toLocaleString()}
                                              </p>
                                            ) : (
                                              <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3 shrink-0" /> Available immediately
                                              </p>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0"
                                            onClick={() => {
                                              const iso = mod.batchPublishAt ? new Date(mod.batchPublishAt).toISOString() : "";
                                              setSchedulePublishAt(iso);
                                              setScheduleDialog({ moduleId: mod.id, moduleTitle: mod.title, currentPublishAt: iso });
                                            }}
                                          >
                                            <Pencil className="w-3 h-3" /> Set
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        {/* Assign bundle dialog */}
        <Dialog open={assignBundleDialog} onOpenChange={setAssignBundleDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Assign Problem Bundle
              </DialogTitle>
              <DialogDescription>
                Choose a bundle and set when students can access test cases. Leave times empty for always-on access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>Problem Bundle *</Label>
                <Select value={assignBundleForm.bundleId} onValueChange={(v) => setAssignBundleForm({ ...assignBundleForm, bundleId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bundle…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(allBundles ?? []).length === 0 && (
                      <SelectItem value="__none" disabled>No bundles available — create one in Admin → Problems</SelectItem>
                    )}
                    {(allBundles ?? []).map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.title} <span className="text-muted-foreground ml-1">({b.problemCount} problems)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Timer className="w-3 h-3" /> Start Time</Label>
                  <DateTimePicker
                    value={assignBundleForm.startAt}
                    onChange={(iso) => setAssignBundleForm({ ...assignBundleForm, startAt: iso })}
                    onClear={() => setAssignBundleForm({ ...assignBundleForm, startAt: "" })}
                    placeholder="No start limit"
                  />
                  <p className="text-[11px] text-muted-foreground">When test cases become visible</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Lock className="w-3 h-3" /> End Time</Label>
                  <DateTimePicker
                    value={assignBundleForm.endAt}
                    onChange={(iso) => setAssignBundleForm({ ...assignBundleForm, endAt: iso })}
                    onClear={() => setAssignBundleForm({ ...assignBundleForm, endAt: "" })}
                    placeholder="No end limit"
                  />
                  <p className="text-[11px] text-muted-foreground">When test cases are hidden</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignBundleDialog(false)}>Cancel</Button>
              <Button
                disabled={!assignBundleForm.bundleId || assignBundle.isPending}
                onClick={() => assignBundle.mutate({
                  bundleId: parseInt(assignBundleForm.bundleId, 10),
                  startAt: assignBundleForm.startAt ? new Date(assignBundleForm.startAt).toISOString() : null,
                  endAt: assignBundleForm.endAt ? new Date(assignBundleForm.endAt).toISOString() : null,
                })}
              >
                {assignBundle.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Assign Bundle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit assignment time window dialog */}
        <Dialog open={editAssignDialog !== null} onOpenChange={(o) => !o && setEditAssignDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-500" /> Edit Time Window
              </DialogTitle>
              <DialogDescription>Set when students can access test cases. Leave empty for always-on access.</DialogDescription>
            </DialogHeader>
            {editAssignDialog && (
              <div className="grid grid-cols-2 gap-3 py-1">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Timer className="w-3 h-3" /> Start Time</Label>
                  <DateTimePicker
                    value={editAssignDialog.startAt}
                    onChange={(iso) => setEditAssignDialog({ ...editAssignDialog, startAt: iso })}
                    onClear={() => setEditAssignDialog({ ...editAssignDialog, startAt: "" })}
                    placeholder="No start limit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Lock className="w-3 h-3" /> End Time</Label>
                  <DateTimePicker
                    value={editAssignDialog.endAt}
                    onChange={(iso) => setEditAssignDialog({ ...editAssignDialog, endAt: iso })}
                    onClear={() => setEditAssignDialog({ ...editAssignDialog, endAt: "" })}
                    placeholder="No end limit"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm"
                onClick={() => editAssignDialog && updateBundleAssignment.mutate({ id: editAssignDialog.id, startAt: null, endAt: null })}
                disabled={updateBundleAssignment.isPending}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Always Active
              </Button>
              <Button size="sm"
                disabled={updateBundleAssignment.isPending}
                onClick={() => editAssignDialog && updateBundleAssignment.mutate({
                  id: editAssignDialog.id,
                  startAt: editAssignDialog.startAt ? new Date(editAssignDialog.startAt).toISOString() : null,
                  endAt: editAssignDialog.endAt ? new Date(editAssignDialog.endAt).toISOString() : null,
                })}
              >
                {updateBundleAssignment.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove bundle assignment confirm */}
        <AlertDialog open={removingAssignmentId !== null} onOpenChange={(o) => !o && setRemovingAssignmentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this bundle from batch?</AlertDialogTitle>
              <AlertDialogDescription>Students will lose access to these problems.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => removingAssignmentId && removeAssignment.mutate(removingAssignmentId)}
              >Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Module schedule dialog */}
        <Dialog open={scheduleDialog !== null} onOpenChange={(o) => !o && setScheduleDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-500" /> Set Publish Date
              </DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{scheduleDialog?.moduleTitle}</span> — students in this batch will see this module after the selected date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label>Publish Date &amp; Time</Label>
                <DateTimePicker
                  value={schedulePublishAt}
                  onChange={setSchedulePublishAt}
                  onClear={() => setSchedulePublishAt("")}
                  placeholder="Available immediately"
                />
                <p className="text-[11px] text-muted-foreground">Leave empty to make this module available immediately.</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => { setSchedulePublishAt(""); scheduleDialog && setModuleSchedule.mutate({ moduleId: scheduleDialog.moduleId, publishAt: null }); }}
                disabled={setModuleSchedule.isPending}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Clear (Immediate)
              </Button>
              <Button
                size="sm"
                disabled={setModuleSchedule.isPending}
                onClick={() => {
                  if (!scheduleDialog) return;
                  setModuleSchedule.mutate({ moduleId: scheduleDialog.moduleId, publishAt: schedulePublishAt || null });
                }}
              >
                {setModuleSchedule.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add course to batch dialog */}
        <Dialog open={courseAddDialog} onOpenChange={setCourseAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Course to Batch</DialogTitle>
              <DialogDescription>Link an existing course to this batch.</DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Search courses…"
              value={courseAddSearch}
              onChange={(e) => setCourseAddSearch(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-72 overflow-y-auto space-y-2">
              {(allCourses ?? [])
                .filter((c) => {
                  if (courseAddSearch) {
                    const q = courseAddSearch.toLowerCase();
                    if (!c.title.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false;
                  }
                  return !(batchCourses ?? []).some((bc) => bc.courseId === c.id);
                })
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/40">
                    <img src={c.thumbnail || "https://placehold.co/48x32?text=C"} alt={c.title} className="w-12 h-8 object-cover rounded shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.category}</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={addBatchCourse.isPending}
                      onClick={() => addBatchCourse.mutate(c.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              {(allCourses ?? []).filter((c) => !(batchCourses ?? []).some((bc) => bc.courseId === c.id)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">All courses are already added.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCourseAddDialog(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit batch dialog */}
        <Dialog open={batchDialog !== null} onOpenChange={(o) => !o && setBatchDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{batchDialog === "create" ? "New Batch" : "Edit Batch"}</DialogTitle>
            </DialogHeader>
            <BatchFormFields form={batchForm} setForm={setBatchForm} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDialog(null)}>Cancel</Button>
              <Button onClick={submitBatch} disabled={createBatch.isPending || updateBatch.isPending}>
                {(createBatch.isPending || updateBatch.isPending) && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete batch confirm */}
        <AlertDialog open={deletingBatchId !== null} onOpenChange={(o) => !o && setDeletingBatchId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this batch?</AlertDialogTitle>
              <AlertDialogDescription>All classes and student enrollments in this batch will also be removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => deletingBatchId && deleteBatch.mutate({ id: deletingBatchId })}
              >
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add student dialog */}
        <Dialog open={studentDialog} onOpenChange={setStudentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Student to Batch</DialogTitle>
              <DialogDescription>Search and select a user to enroll in this batch.</DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Search by name or email..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              )}
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={u.avatar ?? undefined} />
                    <AvatarFallback>{u.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    disabled={addStudent.isPending}
                    onClick={() => selectedId && addStudent.mutate({ id: selectedId, data: { userId: u.id } })}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStudentDialog(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add from Payment dialog */}
        <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Verified Payment থেকে Student Add করুন
              </DialogTitle>
              <DialogDescription>Verified payment-এর student-দের এই batch-এ add করুন।</DialogDescription>
            </DialogHeader>
            {paymentLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : paymentList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">কোনো verified payment পাওয়া যায়নি।</p>
            ) : (
              <div className="space-y-2 py-1">
                {paymentList.map((p) => {
                  const alreadyEnrolled = enrolledIds.has(p.userId);
                  return (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${alreadyEnrolled ? "bg-muted/40 opacity-60" : "bg-background"}`}>
                      <Avatar className="w-9 h-9 shrink-0">
                        <AvatarFallback>{(p.userName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.userName ?? `User #${p.userId}`}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.userEmail}</p>
                        <p className="text-xs text-muted-foreground">{p.courseName} · ৳{p.amount.toLocaleString()} · <span className="font-mono">{p.txnId}</span></p>
                      </div>
                      {alreadyEnrolled ? (
                        <span className="text-xs text-green-600 font-medium shrink-0">Already added</span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={addingFromPayment === p.id || addStudent.isPending}
                          onClick={() => addFromPayment(p.userId, p.id)}
                          className="shrink-0"
                        >
                          {addingFromPayment === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialog(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove student confirm */}
        <AlertDialog open={removingUserId !== null} onOpenChange={(o) => !o && setRemovingUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove student?</AlertDialogTitle>
              <AlertDialogDescription>This student will be removed from the batch.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => selectedId && removingUserId && removeStudent.mutate({ id: selectedId, userId: removingUserId })}
              >Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminLayout>
    );
  }

  // ─── List view ───
  return (
    <AdminLayout title="Batches" subtitle="Manage all training batches">
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateBatch}>
          <Plus className="w-4 h-4 mr-2" /> New Batch
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading batches...</p>}

      {!isLoading && (batches ?? []).length === 0 && (
        <Card>
          <CardContent className="py-20 text-center">
            <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">No batches yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first batch to start adding classes and students.</p>
            <Button onClick={openCreateBatch}><Plus className="w-4 h-4 mr-2" /> Create Batch</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(batches ?? []).map((b) => (
          <Card key={b.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(b.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{b.name}</CardTitle>
                <Badge variant="outline" className={`shrink-0 text-xs ${STATUS_STYLES[b.status] ?? ""}`}>
                  {b.status}
                </Badge>
              </div>
              {b.description && <p className="text-xs text-muted-foreground line-clamp-2">{b.description}</p>}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> {b.classCount} classes
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {b.studentCount} students
                  </span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </div>
              {b.startDate && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> {new Date(b.startDate).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create batch dialog */}
      <Dialog open={batchDialog === "create"} onOpenChange={(o) => !o && setBatchDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Set up a new training batch with its schedule and status.</DialogDescription>
          </DialogHeader>
          <BatchFormFields form={batchForm} setForm={setBatchForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialog(null)}>Cancel</Button>
            <Button onClick={submitBatch} disabled={createBatch.isPending}>
              {createBatch.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Create Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function BatchFormFields({ form, setForm }: { form: BatchForm; setForm: (f: BatchForm) => void }) {
  return (
    <div className="grid gap-3 py-1">
      <div className="grid gap-1.5">
        <Label>Batch name *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Batch 10 — Web Development" />
      </div>
      <div className="grid gap-1.5">
        <Label>Description</Label>
        <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Start date</Label>
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label>End date</Label>
          <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as BatchForm["status"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
