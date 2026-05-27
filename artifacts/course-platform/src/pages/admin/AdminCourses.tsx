import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { useListCourses } from "@workspace/api-client-react";
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Loader2, BookOpen, Video,
  ChevronRight, ArrowLeft, GripVertical, Upload, CheckCircle2, Link,
} from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Lesson = {
  id: number; moduleId: number; title: string; videoUrl: string | null;
  duration: string; orderIndex: number;
};
type ModuleItem = {
  id: number; courseId: number; title: string; weekNumber: number;
  orderIndex: number; lessons: Lesson[];
};
type CourseDetail = {
  id: number; title: string; slug: string; description: string | null;
  thumbnail: string; category: string; price: number | null;
  isFeatured: boolean; tag: string | null;
  instructor: { id: number; name: string; avatar: string; title: string };
  modules: ModuleItem[];
};

async function apiFetch(path: string, options?: RequestInit) {
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

type ModuleForm = { title: string; weekNumber: string; orderIndex: string };
type LessonForm = { title: string; videoUrl: string; duration: string; orderIndex: string };
type CourseForm = {
  title: string; description: string; thumbnail: string;
  category: string; price: string; isFeatured: boolean; tag: string; instructorId: string;
};

const emptyModule = (): ModuleForm => ({ title: "", weekNumber: "1", orderIndex: "0" });
const emptyLesson = (): LessonForm => ({ title: "", videoUrl: "", duration: "0:00", orderIndex: "0" });
const emptyCourseForm = (): CourseForm => ({
  title: "", description: "", thumbnail: "", category: "Programming",
  price: "", isFeatured: false, tag: "", instructorId: "1",
});


export default function AdminCourses() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [courseDialog, setCourseDialog] = useState<"create" | "edit" | null>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm());
  const [deletingCourseId, setDeletingCourseId] = useState<number | null>(null);

  const [moduleDialog, setModuleDialog] = useState<"create" | "edit" | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm>(emptyModule());
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [deletingModuleId, setDeletingModuleId] = useState<number | null>(null);

  const [lessonDialog, setLessonDialog] = useState<"create" | "edit" | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>(emptyLesson());
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [lessonModuleId, setLessonModuleId] = useState<number | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<number | null>(null);
  const [videoInputMode, setVideoInputMode] = useState<"url" | "file">("url");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const { uploadFile, isUploading, progress } = useUpload({
    basePath: `${BASE}/api/storage`,
    onSuccess: (res) => {
      const serveUrl = `${BASE}/api/storage${res.objectPath}`;
      setLessonForm((f) => ({ ...f, videoUrl: serveUrl }));
      setUploadedFileName(res.metadata.name);
      toast({ title: "Video uploaded successfully" });
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const { data: courses, isLoading } = useListCourses({});

  const { data: detail, isLoading: detailLoading } = useQuery<CourseDetail>({
    queryKey: ["admin-course-detail", selectedId],
    queryFn: () => apiFetch(`/admin/courses/${selectedId}/detail`),
    enabled: selectedId !== null,
  });

  const invalidateDetail = () => qc.invalidateQueries({ queryKey: ["admin-course-detail", selectedId] });
  const invalidateList = () => qc.invalidateQueries({ queryKey: ["listCourses"] });

  const createCourse = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch("/courses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (c) => { invalidateList(); toast({ title: "Course created" }); setSelectedId(c.id); setCourseDialog(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateCourse = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch(`/courses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateDetail(); invalidateList(); toast({ title: "Course updated" }); setCourseDialog(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteCourse = useMutation({
    mutationFn: (id: number) => apiFetch(`/courses/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidateList(); toast({ title: "Course deleted" }); setDeletingCourseId(null); if (selectedId === deletingCourseId) setSelectedId(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const createModule = useMutation({
    mutationFn: (data: ModuleForm) => apiFetch(`/admin/courses/${selectedId}/modules`, {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        weekNumber: Number(data.weekNumber),
        orderIndex: Number(data.orderIndex),
      }),
    }),
    onSuccess: () => { invalidateDetail(); toast({ title: "Module added" }); setModuleDialog(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateModule = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModuleForm }) =>
      apiFetch(`/admin/courses/${selectedId}/modules/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: data.title,
          weekNumber: Number(data.weekNumber),
          orderIndex: Number(data.orderIndex),
        }),
      }),
    onSuccess: () => { invalidateDetail(); toast({ title: "Module updated" }); setModuleDialog(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteModule = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/courses/${selectedId}/modules/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidateDetail(); toast({ title: "Module deleted" }); setDeletingModuleId(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const createLesson = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: LessonForm }) =>
      apiFetch(`/admin/courses/${selectedId}/modules/${moduleId}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: data.title, videoUrl: data.videoUrl || null,
          duration: data.duration, orderIndex: Number(data.orderIndex),
        }),
      }),
    onSuccess: () => { invalidateDetail(); toast({ title: "Lesson added" }); setLessonDialog(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateLesson = useMutation({
    mutationFn: ({ lessonId, moduleId, data }: { lessonId: number; moduleId: number; data: LessonForm }) =>
      apiFetch(`/admin/courses/${selectedId}/modules/${moduleId}/lessons/${lessonId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: data.title, videoUrl: data.videoUrl || null,
          duration: data.duration, orderIndex: Number(data.orderIndex),
        }),
      }),
    onSuccess: () => { invalidateDetail(); toast({ title: "Lesson updated" }); setLessonDialog(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteLesson = useMutation({
    mutationFn: ({ lessonId, moduleId }: { lessonId: number; moduleId: number }) =>
      apiFetch(`/admin/courses/${selectedId}/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE" }),
    onSuccess: () => { invalidateDetail(); toast({ title: "Lesson deleted" }); setDeletingLessonId(null); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const filtered = (courses ?? []).filter((c) => {
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  function openCreateCourse() {
    setCourseForm(emptyCourseForm());
    setCourseDialog("create");
  }

  function openEditCourse() {
    if (!detail) return;
    setCourseForm({
      title: detail.title,
      description: detail.description ?? "",
      thumbnail: detail.thumbnail ?? "",
      category: detail.category,
      price: detail.price ? String(detail.price) : "",
      isFeatured: detail.isFeatured,
      tag: detail.tag ?? "",
      instructorId: String(detail.instructor?.id ?? 1),
    });
    setCourseDialog("edit");
  }

  function submitCourse() {
    const data = {
      title: courseForm.title,
      description: courseForm.description || null,
      thumbnail: courseForm.thumbnail || "",
      category: courseForm.category,
      price: courseForm.price ? Number(courseForm.price) : null,
      isFeatured: courseForm.isFeatured,
      tag: courseForm.tag || null,
      instructorId: Number(courseForm.instructorId),
    };
    if (courseDialog === "create") createCourse.mutate(data);
    else if (courseDialog === "edit" && selectedId) updateCourse.mutate({ id: selectedId, data });
  }

  function openAddModule() {
    setModuleForm(emptyModule());
    setEditingModuleId(null);
    setModuleDialog("create");
  }

  function openEditModule(mod: ModuleItem) {
    setModuleForm({
      title: mod.title,
      weekNumber: String(mod.weekNumber),
      orderIndex: String(mod.orderIndex),
    });
    setEditingModuleId(mod.id);
    setModuleDialog("edit");
  }

  function submitModule() {
    if (moduleDialog === "create") createModule.mutate(moduleForm);
    else if (moduleDialog === "edit" && editingModuleId) updateModule.mutate({ id: editingModuleId, data: moduleForm });
  }

  function openAddLesson(moduleId: number) {
    setLessonForm(emptyLesson());
    setLessonModuleId(moduleId);
    setEditingLessonId(null);
    setVideoInputMode("url");
    setUploadedFileName(null);
    setLessonDialog("create");
  }

  function openEditLesson(lesson: Lesson) {
    setLessonForm({
      title: lesson.title, videoUrl: lesson.videoUrl ?? "",
      duration: lesson.duration, orderIndex: String(lesson.orderIndex),
    });
    setLessonModuleId(lesson.moduleId);
    setEditingLessonId(lesson.id);
    setVideoInputMode("url");
    setUploadedFileName(null);
    setLessonDialog("edit");
  }

  function submitLesson() {
    if (!lessonModuleId) return;
    if (lessonDialog === "create") createLesson.mutate({ moduleId: lessonModuleId, data: lessonForm });
    else if (lessonDialog === "edit" && editingLessonId) updateLesson.mutate({ lessonId: editingLessonId, moduleId: lessonModuleId, data: lessonForm });
  }

  const weekGroups = (detail?.modules ?? []).reduce<Record<number, ModuleItem[]>>((acc, mod) => {
    (acc[mod.weekNumber] ??= []).push(mod);
    return acc;
  }, {});

  return (
    <AdminLayout
      title="Courses"
      subtitle="Manage course content, modules, and lessons"
      actions={
        <Button size="sm" onClick={openCreateCourse}>
          <Plus className="w-4 h-4 mr-1.5" /> New Course
        </Button>
      }
    >
      <div className="flex gap-6 h-full">
        {/* Left: course list */}
        <div className="w-72 shrink-0 space-y-3">
          <Input
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
          {isLoading && (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          )}
          {filtered.map((c) => (
            <Card
              key={c.id}
              className={`cursor-pointer transition-all ${selectedId === c.id ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"}`}
              onClick={() => setSelectedId(c.id)}
            >
              <CardContent className="p-3 flex gap-3 items-start">
                <img
                  src={c.thumbnail || "https://placehold.co/60x40?text=Course"}
                  alt={c.title}
                  className="w-14 h-10 object-cover rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-2">{c.title}</p>
                  <Badge variant="secondary" className="text-[10px] mt-1">{c.category}</Badge>
                </div>
                {selectedId === c.id && <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
              </CardContent>
            </Card>
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No courses found</p>
          )}
        </div>

        {/* Right: course detail */}
        <div className="flex-1 min-w-0">
          {!selectedId && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <BookOpen className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Select a course to manage its content</p>
            </div>
          )}

          {selectedId && detailLoading && (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          )}

          {selectedId && detail && !detailLoading && (
            <div className="space-y-5">
              {/* Course header */}
              <Card>
                <CardContent className="p-4 flex items-start gap-4">
                  <img
                    src={detail.thumbnail || "https://placehold.co/80x56?text=Course"}
                    alt={detail.title}
                    className="w-20 h-14 object-cover rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold">{detail.title}</h2>
                      <Badge variant="outline" className="text-[10px]">{detail.category}</Badge>
                      {detail.isFeatured && <Badge className="text-[10px] bg-amber-500 text-white">Featured</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{detail.description || "No description"}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Avatar className="w-4 h-4 inline"><AvatarImage src={detail.instructor?.avatar} /><AvatarFallback>{(detail.instructor?.name ?? "?")[0]}</AvatarFallback></Avatar>
                        {detail.instructor?.name}
                      </span>
                      {detail.price != null && <span>৳{detail.price}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={openEditCourse}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeletingCourseId(selectedId)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Modules section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">
                    Weeks & Modules
                    <span className="ml-2 text-muted-foreground font-normal">({detail.modules.length} modules, {detail.modules.reduce((s, m) => s + m.lessons.length, 0)} lessons)</span>
                  </h3>
                  <Button size="sm" onClick={openAddModule}>
                    <Plus className="w-4 h-4 mr-1.5" /> Add Module
                  </Button>
                </div>

                {detail.modules.length === 0 && (
                  <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No modules yet. Add the first module to start building the course.</CardContent></Card>
                )}

                <Accordion type="multiple" className="space-y-2">
                  {Object.entries(weekGroups)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([week, mods]) => (
                      <AccordionItem key={week} value={`week-${week}`} className="border rounded-lg px-0">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-mono">Week {week}</Badge>
                            <span className="text-sm font-medium">{mods.length} module{mods.length !== 1 ? "s" : ""}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3 space-y-2">
                          {mods.sort((a, b) => a.orderIndex - b.orderIndex).map((mod) => (
                            <Card key={mod.id} className="border-muted">
                              <CardHeader className="p-3 pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-sm font-medium">{mod.title}</CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Week {mod.weekNumber} · Order {mod.orderIndex}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditModule(mod)}>
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingModuleId(mod.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="px-3 pb-3 space-y-1.5">
                                {mod.lessons.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson) => (
                                  <div key={lesson.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 group">
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                    <Video className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="flex-1 text-xs font-medium min-w-0 truncate">{lesson.title}</span>
                                    {lesson.videoUrl && (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-600 border-emerald-200">Video</Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditLesson(lesson)}>
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeletingLessonId(lesson.id)}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full h-7 text-xs border-dashed"
                                  onClick={() => openAddLesson(mod.id)}
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Lesson
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Course dialog */}
      <Dialog open={courseDialog !== null} onOpenChange={(o) => !o && setCourseDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{courseDialog === "create" ? "New Course" : "Edit Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={courseForm.title} onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. CSE Fundamentals" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={courseForm.description} onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input value={courseForm.category} onChange={(e) => setCourseForm((f) => ({ ...f, category: e.target.value }))} placeholder="Programming" />
              </div>
              <div className="space-y-1">
                <Label>Price (৳)</Label>
                <Input type="number" value={courseForm.price} onChange={(e) => setCourseForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Thumbnail URL</Label>
              <Input value={courseForm.thumbnail} onChange={(e) => setCourseForm((f) => ({ ...f, thumbnail: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="feat" checked={courseForm.isFeatured} onChange={(e) => setCourseForm((f) => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <Label htmlFor="feat" className="cursor-pointer">Featured course</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialog(null)}>Cancel</Button>
            <Button onClick={submitCourse} disabled={createCourse.isPending || updateCourse.isPending}>
              {(createCourse.isPending || updateCourse.isPending) && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Module dialog */}
      <Dialog open={moduleDialog !== null} onOpenChange={(o) => !o && setModuleDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{moduleDialog === "create" ? "Add Module" : "Edit Module"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Module Title *</Label>
              <Input value={moduleForm.title} onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Introduction to Variables" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Week Number *</Label>
                <Input type="number" min="1" value={moduleForm.weekNumber} onChange={(e) => setModuleForm((f) => ({ ...f, weekNumber: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Order</Label>
                <Input type="number" min="0" value={moduleForm.orderIndex} onChange={(e) => setModuleForm((f) => ({ ...f, orderIndex: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog(null)}>Cancel</Button>
            <Button onClick={submitModule} disabled={createModule.isPending || updateModule.isPending}>
              {(createModule.isPending || updateModule.isPending) && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Lesson dialog */}
      <Dialog open={lessonDialog !== null} onOpenChange={(o) => !o && setLessonDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lessonDialog === "create" ? "Add Lesson" : "Edit Lesson"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Lesson Title *</Label>
              <Input value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. What is a Variable?" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-primary" /> Video
              </Label>
              {/* Toggle */}
              <div className="flex rounded-md border overflow-hidden text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setVideoInputMode("url")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${videoInputMode === "url" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
                >
                  <Link className="w-3 h-3" /> Video Link (URL)
                </button>
                <button
                  type="button"
                  onClick={() => setVideoInputMode("file")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${videoInputMode === "file" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
                >
                  <Upload className="w-3 h-3" /> File Upload
                </button>
              </div>

              {videoInputMode === "url" && (
                <div className="space-y-1">
                  <Input
                    value={lessonForm.videoUrl}
                    onChange={(e) => setLessonForm((f) => ({ ...f, videoUrl: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-[11px] text-muted-foreground">YouTube, Vimeo, বা যেকোনো direct video URL</p>
                </div>
              )}

              {videoInputMode === "file" && (
                <div className="space-y-2">
                  {uploadedFileName ? (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1">{uploadedFileName}</span>
                      <button
                        type="button"
                        onClick={() => { setUploadedFileName(null); setLessonForm((f) => ({ ...f, videoUrl: "" })); }}
                        className="text-xs underline shrink-0"
                      >
                        পরিবর্তন
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isUploading ? "opacity-60 pointer-events-none" : "hover:border-primary/50 hover:bg-muted/40"}`}>
                      {isUploading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Uploading… {progress}%</p>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground text-center">
                            এখানে ক্লিক করে video file বেছে নিন<br/>
                            <span className="text-xs">(MP4, WebM, MOV সাপোর্টেড)</span>
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadFile(file);
                        }}
                      />
                    </label>
                  )}
                  {lessonForm.videoUrl && uploadedFileName && (
                    <p className="text-[11px] text-muted-foreground truncate">URL: {lessonForm.videoUrl}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog(null)}>Cancel</Button>
            <Button onClick={submitLesson} disabled={createLesson.isPending || updateLesson.isPending}>
              {(createLesson.isPending || updateLesson.isPending) && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete course confirm */}
      <AlertDialog open={deletingCourseId !== null} onOpenChange={(o) => !o && setDeletingCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the course and all its modules and lessons.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingCourseId && deleteCourse.mutate(deletingCourseId)}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete module confirm */}
      <AlertDialog open={deletingModuleId !== null} onOpenChange={(o) => !o && setDeletingModuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete module?</AlertDialogTitle>
            <AlertDialogDescription>All lessons inside this module will also be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingModuleId && deleteModule.mutate(deletingModuleId)}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete lesson confirm */}
      <AlertDialog open={deletingLessonId !== null} onOpenChange={(o) => !o && setDeletingLessonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
            <AlertDialogDescription>This lesson will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!deletingLessonId) return;
                const mod = detail?.modules.find((m) => m.lessons.some((l) => l.id === deletingLessonId));
                if (mod) deleteLesson.mutate({ lessonId: deletingLessonId, moduleId: mod.id });
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
