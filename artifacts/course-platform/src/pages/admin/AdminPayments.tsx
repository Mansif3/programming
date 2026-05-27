import { useState, useEffect } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, XCircle, Clock, Search, Phone, Hash, BookOpen,
  User, Calendar, CreditCard, Settings, Smartphone, GraduationCap, Trash2,
} from "lucide-react";
import { useGetSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";

type Payment = {
  id: number;
  userId: number;
  courseName: string;
  amount: number;
  paymentMethod: string;
  paymentPhone: string;
  txnId: string;
  status: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

type Batch = {
  id: number;
  name: string;
  status: string;
  studentCount: number;
};

type EnrollmentSettings = {
  isOpen?: boolean;
  courseName?: string;
  coursePrice?: number;
  bkashNumber?: string;
  nagadNumber?: string;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "verified")
    return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle className="w-3 h-3" /> Verified</Badge>;
  if (status === "rejected")
    return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
}

export default function AdminPayments() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified">("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Verify dialog state
  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; payment: Payment | null }>({ open: false, payment: null });
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const { data: settingsData } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });
  const s = settingsData?.settings;
  const enrollment = ((s as Record<string, unknown> | undefined)?.enrollment ?? {}) as EnrollmentSettings;

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((data) => { setPayments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/admin/batches")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBatches(data); })
      .catch(() => {});
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("এই payment record মুছে ফেলবেন?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setPayments((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Payment মুছে ফেলা হয়েছে" });
    } catch {
      toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  const filtered = payments.filter((p) => {
    if (statusFilter === "pending" && p.status !== "pending") return false;
    if (statusFilter === "verified" && p.status !== "verified") return false;
    const q = search.toLowerCase();
    return (
      !q ||
      p.userName?.toLowerCase().includes(q) ||
      p.userEmail?.toLowerCase().includes(q) ||
      p.courseName.toLowerCase().includes(q) ||
      p.txnId.toLowerCase().includes(q) ||
      p.paymentPhone.includes(q)
    );
  });

  function openVerifyDialog(p: Payment) {
    setSelectedBatchId("");
    setVerifyDialog({ open: true, payment: p });
  }

  async function handleVerify() {
    const p = verifyDialog.payment;
    if (!p) return;
    setUpdating(p.id);
    try {
      const body: Record<string, unknown> = { status: "verified" };
      if (selectedBatchId) body.batchId = Number(selectedBatchId);

      const res = await fetch(`/api/payments/${p.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { batchEnrolled?: boolean };

      setPayments((prev) => prev.map((x) => x.id === p.id ? { ...x, status: "verified" } : x));
      setVerifyDialog({ open: false, payment: null });

      const batchName = batches.find((b) => b.id === Number(selectedBatchId))?.name;
      if (data.batchEnrolled && batchName) {
        toast({ title: "✓ Payment verified", description: `Student added to batch "${batchName}"` });
      } else {
        toast({ title: "Payment verified!" });
      }
    } catch {
      toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  async function handleReject(id: number) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/payments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Failed");
      setPayments((prev) => prev.map((p) => p.id === id ? { ...p, status: "rejected" } : p));
      toast({ title: "Payment rejected" });
    } catch {
      toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  }

  const pending = payments.filter((p) => p.status === "pending").length;
  const verified = payments.filter((p) => p.status === "verified").length;
  const isOpen = enrollment.isOpen !== false;

  return (
    <AdminLayout
      title="Payments"
      subtitle="Student payment submissions for course enrollment"
    >
      {/* Enrollment Settings Summary */}
      <Card className="mb-6 border-primary/20 bg-primary/3">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Enrollment Configuration
            </CardTitle>
            <Link href="/admin/settings">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                <Settings className="w-3 h-3" /> Edit in Settings
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1 p-3 rounded-lg border bg-background">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Enrollment</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-green-500" : "bg-red-500"}`} />
                <span className={`font-semibold text-sm ${isOpen ? "text-green-600" : "text-red-600"}`}>
                  {isOpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg border bg-background">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Course Fee</span>
              <span className="font-bold text-primary text-sm">৳ {(enrollment.coursePrice ?? 5000).toLocaleString()}</span>
              <span className="text-xs text-muted-foreground truncate">{enrollment.courseName ?? "CSE Fundamentals Batch"}</span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg border bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-pink-600" />
                <span className="text-xs font-medium text-pink-700 dark:text-pink-400">bKash</span>
              </div>
              <span className="font-mono font-semibold text-sm">{enrollment.bkashNumber ?? "01712345678"}</span>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Nagad</span>
              </div>
              <span className="font-mono font-semibold text-sm">{enrollment.nagadNumber ?? "01812345678"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats — clickable to filter */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{payments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "pending" ? "ring-2 ring-yellow-400" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pending}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "verified" ? "ring-2 ring-green-400" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "verified" ? "all" : "verified")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{verified}</p>
            <p className="text-xs text-muted-foreground mt-1">Verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, course, TRX ID, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Payment List */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No payments found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={p.status} />
                      <Badge variant="outline" className="capitalize text-xs">
                        {p.paymentMethod === "bkash" ? "bKash" : "Nagad"}
                      </Badge>
                      <span className="text-sm font-bold text-primary">৳ {p.amount.toLocaleString()}</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.userName ?? `User #${p.userId}`}</span>
                        {p.userEmail && <span className="text-xs truncate">({p.userEmail})</span>}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.courseName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono">{p.paymentPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono font-medium text-foreground">{p.txnId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs">{new Date(p.createdAt).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {p.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-green-600 hover:bg-green-700 h-8"
                          disabled={updating === p.id}
                          onClick={() => openVerifyDialog(p)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 h-8"
                          disabled={updating === p.id}
                          onClick={() => handleReject(p.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 h-8 px-2"
                      disabled={deleting === p.id}
                      onClick={() => handleDelete(p.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Verify Dialog */}
      <Dialog open={verifyDialog.open} onOpenChange={(o) => setVerifyDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Payment Verify করুন
            </DialogTitle>
          </DialogHeader>

          {verifyDialog.payment && (
            <div className="space-y-4 py-1">
              {/* Payment summary */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">{verifyDialog.payment.userName ?? `User #${verifyDialog.payment.userId}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{verifyDialog.payment.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary">৳ {verifyDialog.payment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TRX ID</span>
                  <span className="font-mono font-medium">{verifyDialog.payment.txnId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{verifyDialog.payment.paymentMethod === "bkash" ? "bKash" : "Nagad"} — {verifyDialog.payment.paymentPhone}</span>
                </div>
              </div>

              {/* Batch selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Batch-এ Add করুন <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="— Batch select করুন —" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.length === 0 ? (
                      <SelectItem value="none" disabled>কোনো batch নেই</SelectItem>
                    ) : (
                      batches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                          <span className="ml-2 text-xs text-muted-foreground">({b.status} · {b.studentCount} students)</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedBatchId ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verify করার সাথে সাথে student এই batch-এ add হয়ে যাবে
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Batch select না করলে শুধু payment verify হবে</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVerifyDialog({ open: false, payment: null })}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 gap-1.5"
              disabled={updating === verifyDialog.payment?.id}
              onClick={handleVerify}
            >
              <CheckCircle className="w-4 h-4" />
              {selectedBatchId ? "Verify & Batch-এ Add করুন" : "Verify করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
