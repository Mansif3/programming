import { useState } from "react";
import {
  useGetPlatformStats, useListInstructors,
  useListPosts, useListAnnouncements,
} from "@workspace/api-client-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import {
  Users, GraduationCap, Briefcase,
  MessageSquare, Megaphone, Pencil, RotateCcw, Activity,
  BookOpen, FlaskConical, BarChart2, Award, CreditCard, ArrowRight,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAppTime } from "@/hooks/use-app-time";
import { useToast } from "@/hooks/use-toast";

const QUICK_LINKS = [
  {
    href: "/admin/batches",
    label: "Batches",
    icon: GraduationCap,
    desc: "Manage student batches",
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
  },
  {
    href: "/admin/courses",
    label: "Courses",
    icon: BookOpen,
    desc: "Create & edit courses",
    gradient: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
  },
  {
    href: "/admin/students",
    label: "Users",
    icon: Users,
    desc: "View all students",
    gradient: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
  },
  {
    href: "/admin/helpdesk",
    label: "Help Desk",
    icon: MessageSquare,
    desc: "Resolve student queries",
    gradient: "from-rose-500 to-rose-600",
    bg: "bg-rose-50",
    text: "text-rose-600",
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: Megaphone,
    desc: "Post platform notices",
    gradient: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
  {
    href: "/admin/problems",
    label: "Problems",
    icon: FlaskConical,
    desc: "Coding challenges",
    gradient: "from-cyan-500 to-cyan-600",
    bg: "bg-cyan-50",
    text: "text-cyan-600",
  },
  {
    href: "/admin/student-marks",
    label: "Student Marks",
    icon: BarChart2,
    desc: "Track grades & scores",
    gradient: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50",
    text: "text-indigo-600",
  },
  {
    href: "/admin/certificates",
    label: "Certificates",
    icon: Award,
    desc: "Issue & manage certs",
    gradient: "from-teal-500 to-teal-600",
    bg: "bg-teal-50",
    text: "text-teal-600",
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: CreditCard,
    desc: "Revenue & transactions",
    gradient: "from-pink-500 to-pink-600",
    bg: "bg-pink-50",
    text: "text-pink-600",
  },
];

export default function AdminDashboard() {
  const { data: stats } = useGetPlatformStats();
  const { data: instructors } = useListInstructors();
  const { data: posts } = useListPosts();
  const { data: announcements } = useListAnnouncements();
  const { now, setAppTime, resetAppTime, isCustom } = useAppTime();
  const { toast } = useToast();
  const [timeEditOpen, setTimeEditOpen] = useState(false);
  const [timeInput, setTimeInput] = useState("");

  const toDatetimeLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEdit = () => { setTimeInput(toDatetimeLocal(now)); setTimeEditOpen(true); };

  const saveTime = () => {
    const parsed = new Date(timeInput);
    if (isNaN(parsed.getTime())) { toast({ title: "Invalid date/time", variant: "destructive" }); return; }
    setAppTime(parsed);
    setTimeEditOpen(false);
    toast({ title: "System time updated", description: parsed.toLocaleString() });
  };

  const kpis = [
    { label: "Total Students", value: stats?.totalStudents ?? 0, icon: Users, color: "blue" },
    { label: "Instructors", value: instructors?.length ?? 0, icon: GraduationCap, color: "emerald" },
    { label: "Total Hired", value: stats?.totalHired ?? 0, icon: Briefcase, color: "amber" },
  ];

  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    violet: "from-violet-500 to-violet-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Welcome back — here's what's happening on Programming Poth today"
      actions={
        <div className="flex items-center gap-3">
          <div className="text-right select-none">
            <p className="text-2xl font-semibold tabular-nums leading-none" style={{ color: "#22c55e" }}>
              {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#22c55e" }}>
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            {isCustom && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 mt-0.5 inline-block">
                Custom time
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={openEdit} title="Edit time">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {isCustom && (
              <Button size="icon" variant="outline" className="h-7 w-7 text-muted-foreground" onClick={() => { resetAppTime(); toast({ title: "Time reset to real time" }); }} title="Reset to real time">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      }
    >

      {/* QUICK ACCESS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-border/60">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${item.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground leading-tight">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* ACTIVITY ROW */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Recent Help Posts
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/admin/helpdesk">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {posts?.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.author.name}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize shrink-0 ${
                    p.status === "resolved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    p.status === "open" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {p.status}
                </Badge>
              </div>
            )) ?? <p className="text-xs text-muted-foreground p-2">No posts yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" /> Latest Announcements
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/admin/announcements">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcements?.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/40">
                <Activity className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )) ?? <p className="text-xs text-muted-foreground p-2">No announcements yet</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={timeEditOpen} onOpenChange={setTimeEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set System Time</DialogTitle>
            <DialogDescription>
              Choose a custom date and time. The clock keeps ticking forward from this moment, and all time-based features will follow it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs mb-2 block">Date &amp; Time</Label>
            <Input
              type="datetime-local"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeEditOpen(false)}>Cancel</Button>
            <Button onClick={saveTime}>Set Time</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
