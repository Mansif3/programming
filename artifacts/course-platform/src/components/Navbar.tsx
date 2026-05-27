import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, LogIn, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import {
  useGetCurrentUser, getGetCurrentUserQueryKey,
  useGetMyBatches, getGetMyBatchesQueryKey,
  useGetSiteSettings,
} from "@workspace/api-client-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    typeof window !== "undefined" && !!localStorage.getItem("pp_logged_in")
  );
  useEffect(() => {
    const sync = () => setIsLoggedIn(!!localStorage.getItem("pp_logged_in"));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [location]);

  const { data: userData } = useGetCurrentUser({ query: { enabled: isLoggedIn, queryKey: getGetCurrentUserQueryKey() } });
  const user = isLoggedIn ? userData : null;
  const canAccessAdmin = user?.role === "admin" || user?.role === "mentor" || user?.role === "editor";

  const { data: siteData } = useGetSiteSettings();
  const siteName = (siteData?.settings as Record<string, { siteName?: string; logoUrl?: string }> | undefined)?.site?.siteName || "Programming Poth";
  const logoUrl = (siteData?.settings as Record<string, { siteName?: string; logoUrl?: string }> | undefined)?.site?.logoUrl || "";

  // Only fetch batches when logged in
  const { data: myBatches } = useGetMyBatches({ query: { enabled: isLoggedIn, queryKey: getGetMyBatchesQueryKey() } });
  const hasBatches = isLoggedIn && (myBatches?.length ?? 0) > 0;
  const hasProblemsAccess = isLoggedIn && (myBatches ?? []).some((b) => (b as { problemsEnabled?: boolean }).problemsEnabled);

  const baseLinks = [{ href: "/", label: "Home" }];
  const batchLinks = hasBatches
    ? [
        { href: "/my-classes", label: "My Classes" },
        { href: "/helpdesk", label: "Help Desk" },
        ...(hasProblemsAccess ? [{ href: "/compiler", label: "Problems" }] : []),
      ]
    : [];
  const links = [...baseLinks, ...batchLinks];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg" data-testid="link-logo">
          <Logo size={32} src={logoUrl || undefined} />
          <span>{siteName}</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location === l.href
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              data-testid={`nav-link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {canAccessAdmin && (
            <Link href="/admin">
              <Button size="sm" className="hidden md:flex" data-testid="button-admin-panel">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            </Link>
          )}
          {user ? (
            <Link href="/profile">
              <Avatar className="w-8 h-8 cursor-pointer" data-testid="avatar-user">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm" data-testid="button-login-nav">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(!open)}
            data-testid="button-mobile-menu"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {canAccessAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full mt-1">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            </Link>
          )}
          {!user && (
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">Sign In</Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button size="sm" className="w-full">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
