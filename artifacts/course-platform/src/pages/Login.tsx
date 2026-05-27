import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Monitor, Smartphone, Apple, AlertTriangle, KeyRound, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/Logo";
import {
  useAuthLogin,
  useAuthRemoveDevice,
  getGetCurrentUserQueryKey,
  getListDevicesQueryKey,
  ApiError,
  type UserDevice,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteIdentity } from "@/hooks/useSiteIdentity";

function platformIcon(platform: string) {
  if (/android/i.test(platform)) return <Smartphone className="w-4 h-4 text-green-500" />;
  if (/ios/i.test(platform)) return <Apple className="w-4 h-4 text-gray-500" />;
  return <Monitor className="w-4 h-4 text-primary" />;
}

export default function Login() {
  const { siteName, logoUrl } = useSiteIdentity();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [devices, setDevices] = useState<UserDevice[] | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { mutate: login, isPending } = useAuthLogin();
  const { mutateAsync: removeDevice } = useAuthRemoveDevice();

  const doLogin = () => {
    setError(null);
    login(
      { data: { email, password } },
      {
        onSuccess: async () => {
          localStorage.setItem("pp_logged_in", "1");
          await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          await queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
          setLocation("/my-classes");
        },
        onError: (err: unknown) => {
          if (err instanceof ApiError) {
            const apiErr = err as ApiError;
            if (apiErr.status === 403) {
              const data = apiErr.data as { error?: string; devices?: UserDevice[] } | null;
              setError(data?.error ?? "Device limit reached.");
              setDevices(data?.devices ?? null);
            } else {
              const data = apiErr.data as { error?: string } | null;
              setError(data?.error ?? "Login failed. Please try again.");
              setDevices(null);
            }
          } else {
            setError((err as Error)?.message ?? "Login failed. Please try again.");
            setDevices(null);
          }
        },
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin();
  };

  const handleRemoveDevice = async (deviceId: number) => {
    setRemovingId(deviceId);
    try {
      await removeDevice({ data: { email, password, deviceId } });
      const updated = (devices ?? []).filter((d) => d.id !== deviceId);
      setDevices(updated);
      if (updated.length < 3) {
        setError(null);
        setDevices(null);
        doLogin();
      }
    } catch {
      setError("Failed to remove device. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={40} src={logoUrl || undefined} />
          <span className="text-2xl font-bold">{siteName}</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to continue your learning journey</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Phone number</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="text"
                  placeholder="you@example.com or 01XXXXXXXXX"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setDevices(null); setError(null); }}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <KeyRound className="w-3 h-3" />
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setDevices(null); setError(null); }}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 flex items-start gap-2"
                  data-testid="text-login-error"
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {devices && devices.length > 0 && (
                <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Active sessions — remove one to log in:
                  </p>
                  {devices.map((d, idx) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-background border border-border px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {platformIcon(d.platform)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{d.platform}</p>
                          <p className="text-xs text-muted-foreground">
                            {idx + 1}.{" "}
                            {new Date(d.loginAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            {new Date(d.loginAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="shrink-0 h-7 text-xs px-2"
                        disabled={removingId === d.id}
                        onClick={() => handleRemoveDevice(d.id)}
                      >
                        {removingId === d.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Remove"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="button-login"
              >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create one free
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <span className="underline cursor-pointer">Terms of Service</span> and{" "}
          <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
