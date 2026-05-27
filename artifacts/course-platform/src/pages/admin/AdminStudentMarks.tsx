import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trophy, Users, FlaskConical, Search } from "lucide-react";

type Batch = { id: number; name: string; status: string };
type Problem = { id: number; title: string; totalMarks: number };
type StudentMark = {
  userId: number;
  name: string | null;
  email: string | null;
  avatar: string | null;
  studentId: string | null;
  earnedMarks: number;
  totalMarks: number;
  percentage: number;
};
type MarksData = {
  students: StudentMark[];
  problems: Problem[];
  batchTotalMarks: number;
};

async function apiFetch<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

function PercentBadge({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-green-100 text-green-700 border-green-300" :
    pct >= 50 ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
    pct > 0   ? "bg-orange-100 text-orange-700 border-orange-300" :
                "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {pct}%
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const bg =
    pct >= 80 ? "bg-green-500" :
    pct >= 50 ? "bg-yellow-400" :
    pct > 0   ? "bg-orange-400" :
                "bg-slate-200";
  return (
    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AdminStudentMarks() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: batches = [], isLoading: batchesLoading } = useQuery<Batch[]>({
    queryKey: ["admin", "batches-list"],
    queryFn: () => apiFetch<Batch[]>("/api/admin/batches"),
  });

  const { data: marksData, isLoading: marksLoading } = useQuery<MarksData>({
    queryKey: ["admin", "student-marks", selectedBatchId],
    queryFn: () => apiFetch<MarksData>(`/api/admin/batches/${selectedBatchId}/student-marks`),
    enabled: !!selectedBatchId,
  });

  const sorted = [...(marksData?.students ?? [])]
    .sort((a, b) => b.percentage - a.percentage)
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (s.name ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.studentId ?? "").toLowerCase().includes(q)
      );
    });
  const selectedBatch = batches.find((b) => String(b.id) === selectedBatchId);

  return (
    <AdminLayout
      title="Student Marks"
      subtitle="View each student's assignment score by batch"
    >
      <div className="space-y-6">
        {/* Batch selector */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="w-4 h-4" /> Select Batch
              </div>
              {batchesLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choose a batch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedBatch && (
                <Badge variant="outline" className="capitalize">{selectedBatch.status}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* No batch selected */}
        {!selectedBatchId && (
          <Card>
            <CardContent className="py-20 text-center">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Select a batch to see student marks</p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {selectedBatchId && marksLoading && (
          <Card>
            <CardContent className="py-20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {marksData && !marksLoading && (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Students</p>
                  <p className="text-2xl font-bold">{marksData.students.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Problems</p>
                  <p className="text-2xl font-bold">{marksData.problems.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Marks</p>
                  <p className="text-2xl font-bold">{marksData.batchTotalMarks}</p>
                </CardContent>
              </Card>
            </div>

            {/* Problems list */}
            {marksData.problems.length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FlaskConical className="w-3.5 h-3.5" /> Problems in this batch
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {marksData.problems.map((p, i) => (
                      <Badge key={p.id} variant="outline" className="text-xs gap-1.5">
                        <span className="text-muted-foreground font-normal">{i + 1}.</span>
                        {p.title}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Marks table */}
            {sorted.length === 0 && !search ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground">No students enrolled in this batch yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {/* Search bar */}
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        className="pl-8 h-8 text-sm"
                        placeholder="Search by name, email or student ID…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="hidden sm:table-cell">Student ID</TableHead>
                        <TableHead className="text-right">Marks</TableHead>
                        <TableHead className="w-36">Score</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground text-sm">
                            No students match "{search}"
                          </TableCell>
                        </TableRow>
                      )}
                      {sorted.map((s, i) => (
                        <TableRow key={s.userId}>
                          <TableCell className="text-center text-muted-foreground font-mono text-sm">
                            {i === 0 ? <Trophy className="w-4 h-4 text-yellow-500 mx-auto" /> : i + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarImage src={s.avatar ?? undefined} />
                                <AvatarFallback className="text-xs">
                                  {(s.name ?? "?").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{s.name ?? "—"}</p>
                                <p className="text-xs text-muted-foreground truncate hidden sm:block">{s.email ?? ""}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground font-mono">
                            {s.studentId ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            {s.earnedMarks}
                            <span className="text-muted-foreground font-normal">/{s.totalMarks}</span>
                          </TableCell>
                          <TableCell>
                            <ProgressBar pct={s.percentage} />
                          </TableCell>
                          <TableCell className="text-right">
                            <PercentBadge pct={s.percentage} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
