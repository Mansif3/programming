import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users,
  MessageSquare, Megaphone, Settings, LogOut, Search, Menu, GraduationCap, FlaskConical, CreditCard, BookOpen, BarChart2, Award,
} from "lucide-react";
import Logo from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useGetCurrentUser, getGetCurrentUserQueryKey, useGetSiteSettings } from "@workspace/api-client-react";

type NavItem = { href: string; label: string; icon: React.ElementType };

const ALL_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/batches", label: "Batches", icon: GraduationCap },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/students", label: "Users", icon: Users },
  { href: "/admin/helpdesk", label: "Help Desk", icon: MessageSquare },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/problems", label: "Problems", icon: FlaskConical },
  { href: "/admin/student-marks", label: "Student Marks", icon: BarChart2 },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
];

function navForRole(role: string | undefined): NavItem[] {
  switch (role) {
    case "admin":
      return ALL_NAV;
    case "mentor":
      return ALL_NAV.filter((n) => ["/admin", "/admin/batches"].includes(n.href));
    case "editor":
      return ALL_NAV.filter((n) => ["/admin", "/admin/helpdesk", "/admin/announcements"].includes(n.href));
    default:
      return ALL_NAV.filter((n) => n.href === "/admin");
  }
}

const ROLE_LABELS: Record<string, string> = {
  admin: "ADMIN",
  mentor: "MENTOR",
  editor: "EDITOR",
  student: "STUDENT",
  instructor: "INSTRUCTOR",
};

function SidebarContent({
  location, role, userName, userAvatar, onNavigate, siteName, logoUrl,
}: {
  location: string;
  role: string | undefined;
  userName: string | undefined;
  userAvatar: string | null | undefined;
  onNavigate?: () => void;
  siteName?: string;
  logoUrl?: string;
}) {
  const nav = navForRole(role);
  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      <div className="p-6 border-b border-white/10">
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2 cursor-pointer" data-testid="admin-logo">
          <Logo size={36} src={logoUrl || undefined} />
          <div>
            <p className="font-bold text-sm leading-tight">{siteName || "Programming Poth"}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Admin Panel</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <Avatar className="w-7 h-7">
            <AvatarImage src={userAvatar ?? undefined} />
            <AvatarFallback className="text-xs">{(userName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{userName ?? "—"}</p>
            <p className="text-[10px] text-white/50 capitalize">{role ?? ""}</p>
          </div>
        </div>
        {role === "admin" && (
          <Link href="/admin/settings" onClick={onNavigate} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white">
            <Settings className="w-4 h-4" /> Site Settings
          </Link>
        )}
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white">
          <LogOut className="w-4 h-4" /> Back to site
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({ children, title, subtitle, actions }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: me } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey() },
  });

  const role = me?.role;
  const roleLabel = ROLE_LABELS[role ?? ""] ?? "PANEL";

  const { data: siteData } = useGetSiteSettings();
  const siteName = (siteData?.settings as Record<string, { siteName?: string; logoUrl?: string }> | undefined)?.site?.siteName || "Programming Poth";
  const logoUrl = (siteData?.settings as Record<string, { siteName?: string; logoUrl?: string }> | undefined)?.site?.logoUrl || "";

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="hidden md:block w-64 shrink-0 sticky top-0 h-screen">
        <SidebarContent location={location} role={role} userName={me?.name} userAvatar={me?.avatar} siteName={siteName} logoUrl={logoUrl} />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-4 md:px-6 h-16 flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-nav">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <SidebarContent
                  location={location}
                  role={role}
                  userName={me?.name}
                  userAvatar={me?.avatar}
                  onNavigate={() => setMobileOpen(false)}
                  siteName={siteName}
                  logoUrl={logoUrl}
                />
              </SheetContent>
            </Sheet>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search anything..." className="pl-9 h-9 bg-muted/40 border-0" data-testid="admin-search" />
            </div>
            <Badge variant="outline" className="hidden sm:flex text-[10px] px-2 py-0.5 border-primary/30 bg-primary/5 text-primary">
              {roleLabel}
            </Badge>
            <Avatar className="w-9 h-9">
              <AvatarImage src={me?.avatar ?? undefined} />
              <AvatarFallback>{(me?.name ?? "AD").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="px-4 md:px-6 pt-6 pb-4 bg-card border-b border-border">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="admin-title">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
