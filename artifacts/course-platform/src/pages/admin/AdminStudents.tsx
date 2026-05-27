import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  useListAdminStudents, useUpdateAdminStudent, useDeleteAdminStudent,
  useCreateAdminStudent, getListAdminStudentsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, MoreVertical, Pencil, Loader2, ShieldCheck, UserCog, Trash2, UserPlus, ShieldOff, ShieldAlert } from "lucide-react";

type AddForm = { name: string; email: string; phone: string; password: string; role: Role };

const ROLES = ["student", "mentor", "editor", "admin"] as const;
type Role = typeof ROLES[number];

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  mentor: "bg-blue-50 text-blue-700 border-blue-200",
  editor: "bg-amber-50 text-amber-700 border-amber-200",
  student: "bg-emerald-50 text-emerald-700 border-emerald-200",
  instructor: "bg-sky-50 text-sky-700 border-sky-200",
};

const EDUCATION_LEVELS = [
  "JSC/JDC/8 pass", "SSC/Dakhil/9-10", "HSC/Alim/11-12",
  "Diploma", "Bachelor's", "Master's", "PhD", "Other",
];

const COUNTRIES = [
  "Bangladesh", "India", "Pakistan", "USA", "UK", "Canada", "Australia",
  "Germany", "France", "UAE", "Saudi Arabia", "Malaysia", "Singapore", "Other",
];

type FormState = {
  name: string; email: string; address: string; phone: string; bio: string; password: string; role: Role;
  addressLine1: string; addressLine2: string; city: string; state: string; zipCode: string; country: string;
  educationLevel: string; examTitle: string; institute: string; passingYear: string;
  cvLink: string; githubLink: string; portfolioLink: string; linkedinLink: string; professionalImageLink: string;
};

export default function AdminStudents() {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [suspendingId, setSuspendingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({ name: "", email: "", phone: "", password: "", role: "student" });
  const emptyForm = (): FormState => ({
    name: "", email: "", address: "", phone: "", bio: "", password: "", role: "student",
    addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "", country: "",
    educationLevel: "", examTitle: "", institute: "", passingYear: "",
    cvLink: "", githubLink: "", portfolioLink: "", linkedinLink: "", professionalImageLink: "",
  });
  const [form, setForm] = useState<FormState>(emptyForm());
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useListAdminStudents();
  const editing = users?.find((s) => s.id === editingId) ?? null;

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "",
        email: editing.email || "",
        address: editing.address || "",
        phone: editing.phone || "",
        bio: editing.bio || "",
        password: "",
        role: (editing.role as Role) ?? "student",
        addressLine1: editing.addressLine1 || "",
        addressLine2: editing.addressLine2 || "",
        city: editing.city || "",
        state: editing.state || "",
        zipCode: editing.zipCode || "",
        country: editing.country || "",
        educationLevel: editing.educationLevel || "",
        examTitle: editing.examTitle || "",
        institute: editing.institute || "",
        passingYear: editing.passingYear || "",
        cvLink: editing.cvLink || "",
        githubLink: editing.githubLink || "",
        portfolioLink: editing.portfolioLink || "",
        linkedinLink: editing.linkedinLink || "",
        professionalImageLink: editing.professionalImageLink || "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [editing]);

  const createMut = useCreateAdminStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdminStudentsQueryKey() });
        toast({ title: "User created", description: "New user added successfully." });
        setAddOpen(false);
        setAddForm({ name: "", email: "", phone: "", password: "", role: "student" });
      },
      onError: (e: unknown) => {
        const err = e as { data?: { error?: string }; message?: string };
        toast({ title: "Failed to create user", description: err?.data?.error ?? err?.message ?? "Try again", variant: "destructive" });
      },
    },
  });

  const submitAdd = () => {
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.phone.trim() || !addForm.password.trim()) {
      toast({ title: "All fields are required", variant: "destructive" }); return;
    }
    createMut.mutate({ data: addForm });
  };

  const deleteMut = useDeleteAdminStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdminStudentsQueryKey() });
        toast({ title: "User deleted", description: "The user has been permanently removed." });
        setDeletingId(null);
      },
      onError: (e: unknown) => {
        const err = e as { data?: { error?: string }; message?: string };
        toast({ title: "Delete failed", description: err?.data?.error ?? err?.message ?? "Try again", variant: "destructive" });
      },
    },
  });

  const updateMut = useUpdateAdminStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdminStudentsQueryKey() });
        toast({ title: "User updated", description: "Changes saved successfully." });
        setEditingId(null);
      },
      onError: (e: unknown) => {
        const err = e as { data?: { error?: string }; message?: string };
        toast({
          title: "Failed to update",
          description: err?.data?.error ?? err?.message ?? "Try again",
          variant: "destructive",
        });
      },
    },
  });

  const quickRole = (id: number, role: Role) => {
    updateMut.mutate({ id, data: { role } });
  };

  const toggleSuspend = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    updateMut.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListAdminStudentsQueryKey() });
          toast({
            title: newStatus === "suspended" ? "User suspended" : "User reinstated",
            description: newStatus === "suspended"
              ? "The user can no longer log in."
              : "The user can log in again.",
          });
          setSuspendingId(null);
        },
        onError: (e: unknown) => {
          const err = e as { data?: { error?: string }; message?: string };
          toast({ title: "Action failed", description: err?.data?.error ?? err?.message ?? "Try again", variant: "destructive" });
          setSuspendingId(null);
        },
      }
    );
  };

  const submit = () => {
    if (!editingId) return;
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" }); return;
    }
    const data: Record<string, string> = {
      name: form.name,
      email: form.email,
      address: form.address,
      phone: form.phone,
      bio: form.bio,
      role: form.role,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      country: form.country,
      educationLevel: form.educationLevel,
      examTitle: form.examTitle,
      institute: form.institute,
      passingYear: form.passingYear,
      cvLink: form.cvLink,
      githubLink: form.githubLink,
      portfolioLink: form.portfolioLink,
      linkedinLink: form.linkedinLink,
      professionalImageLink: form.professionalImageLink,
    };
    if (form.password) data.password = form.password;
    updateMut.mutate({ id: editingId, data });
  };

  const filtered = (users ?? []).filter((s) => {
    const term = q.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.studentId ?? "").toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term)
    );
  });

  return (
    <AdminLayout
      title="Users"
      subtitle={`${users?.length ?? 0} total users across all roles`}
    >
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, role..." value={q} onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-9" data-testid="input-search-students"
              />
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-user">
              <UserPlus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>User</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
              )}
              {filtered.map((s) => (
                <TableRow key={s.id} data-testid={`row-student-${s.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={s.avatar ?? undefined} />
                        <AvatarFallback>{s.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.studentId ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s.phone ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{s.enrolledCount ?? 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={ROLE_STYLES[s.role] ?? "bg-slate-50 text-slate-700 border-slate-200"}>
                        {s.role}
                      </Badge>
                      {(s as any).status === "suspended" && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          suspended
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`menu-student-${s.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingId(s.id)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit profile
                        </DropdownMenuItem>
                        {s.role !== "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            {(s as any).status === "suspended" ? (
                              <DropdownMenuItem
                                className="text-emerald-600 focus:text-emerald-600"
                                onClick={() => toggleSuspend(s.id, "suspended")}
                              >
                                <ShieldOff className="w-3.5 h-3.5 mr-2" /> Unsuspend user
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-amber-600 focus:text-amber-600"
                                onClick={() => setSuspendingId(s.id)}
                              >
                                <ShieldAlert className="w-3.5 h-3.5 mr-2" /> Suspend user
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingId(s.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete user
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                            <UserCog className="w-3 h-3" /> Change role
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {ROLES.map((r) => (
                              <button
                                key={r}
                                onClick={() => quickRole(s.id, r)}
                                disabled={s.role === r || updateMut.isPending}
                                className={`text-[11px] px-2 py-0.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${
                                  s.role === r
                                    ? ROLE_STYLES[r]
                                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                                }`}
                                data-testid={`role-${r}-${s.id}`}
                              >
                                {r === "admin" && <ShieldCheck className="w-2.5 h-2.5 inline mr-0.5" />}
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={suspendingId !== null} onOpenChange={(o) => !o && setSuspendingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend user?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">
                {users?.find((u) => u.id === suspendingId)?.name ?? "This user"}
              </span>{" "}
              will not be able to log in until reinstated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => suspendingId && toggleSuspend(suspendingId, "active")}
            >
              {updateMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin inline" /> : null}
              Suspend user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {users?.find((u) => u.id === deletingId)?.name ?? "this user"}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => deletingId && deleteMut.mutate({ id: deletingId })}
              data-testid="button-confirm-delete"
            >
              {deleteMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin inline" /> : null}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddForm({ name: "", email: "", phone: "", password: "", role: "student" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add new user</DialogTitle>
            <DialogDescription>Create a new account. The user can log in immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Full name *</Label>
              <Input
                value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Your full name" data-testid="input-add-name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email *</Label>
              <Input
                type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="you@example.com" data-testid="input-add-email"
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone *</Label>
              <Input
                type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="01XXXXXXXXX" data-testid="input-add-phone"
              />
            </div>
            <div className="grid gap-2">
              <Label>Password *</Label>
              <Input
                type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                placeholder="Min. 6 characters" minLength={6} data-testid="input-add-password"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v as Role })}>
                <SelectTrigger data-testid="select-add-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={createMut.isPending} data-testid="button-save-add-user">
              {createMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update {editing?.name ?? "this user"}'s profile. Leave password blank to keep the existing one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2 max-h-[70vh] overflow-y-auto pr-2">

            {/* Basic info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Basic Information</p>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Student ID</Label>
                    <Input value={editing?.studentId ?? "—"} readOnly className="bg-muted/30 h-9 text-sm" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                      <SelectTrigger data-testid="select-role" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Full name *</Label>
                    <Input className="h-9 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-student-name" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input className="h-9 text-sm" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-student-email" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input className="h-9 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-student-phone" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">New password</Label>
                    <Input className="h-9 text-sm" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current" data-testid="input-student-password" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Bio</Label>
                  <Textarea rows={2} className="text-sm" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} data-testid="input-student-bio" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Address</p>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Address Line 1</Label>
                  <Input className="h-9 text-sm" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} placeholder="House / Flat / Road..." />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Address Line 2</Label>
                  <Input className="h-9 text-sm" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} placeholder="Village / Area (optional)..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">City</Label>
                    <Input className="h-9 text-sm" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">State</Label>
                    <Input className="h-9 text-sm" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Zip Code</Label>
                    <Input className="h-9 text-sm" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Country</Label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Education */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Education</p>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Education Level</Label>
                  <select
                    value={form.educationLevel}
                    onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select level...</option>
                    {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Exam Title</Label>
                    <Input className="h-9 text-sm" value={form.examTitle} onChange={(e) => setForm({ ...form, examTitle: e.target.value })} placeholder="e.g. HSC" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Passing Year</Label>
                    <Input className="h-9 text-sm" value={form.passingYear} onChange={(e) => setForm({ ...form, passingYear: e.target.value })} placeholder="e.g. 2025" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Institute</Label>
                  <Input className="h-9 text-sm" value={form.institute} onChange={(e) => setForm({ ...form, institute: e.target.value })} placeholder="School / College / University" />
                </div>
              </div>
            </div>

            {/* Important Links */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Important Links</p>
              <div className="grid gap-3">
                {([
                  { key: "cvLink", label: "CV Link" },
                  { key: "githubLink", label: "Github Link" },
                  { key: "portfolioLink", label: "Portfolio Link" },
                  { key: "linkedinLink", label: "LinkedIn Profile Link" },
                  { key: "professionalImageLink", label: "Professional Profile Image Link" },
                ] as { key: keyof FormState; label: string }[]).map(({ key, label }) => (
                  <div key={key} className="grid gap-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      className="h-9 text-sm" type="url"
                      value={form[key] as string}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={submit} disabled={updateMut.isPending} data-testid="button-save-student">
              {updateMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
