import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuthRegister, getGetCurrentUserQueryKey, getListDevicesQueryKey, ApiError } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSiteIdentity } from "@/hooks/useSiteIdentity";

export default function Register() {
  const { siteName, logoUrl } = useSiteIdentity();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { mutate: register, isPending } = useAuthRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{11}$/.test(phone)) {
      setError("Phone number must be exactly 11 digits.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    register(
      { data: { name, email, phone, password } },
      {
        onSuccess: async () => {
          localStorage.setItem("pp_logged_in", "1");
          await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          await queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
          setLocation("/my-classes");
        },
        onError: (err: unknown) => {
          if (err instanceof ApiError) {
            const data = (err as ApiError).data as { error?: string } | null;
            setError(data?.error ?? "Registration failed. Please try again.");
          } else {
            setError((err as Error)?.message ?? "Registration failed. Please try again.");
          }
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 bg-primary/5 border-r border-border">
        <div className="flex items-center gap-2 mb-12">
          <Logo size={40} src={logoUrl || undefined} />
          <span className="text-2xl font-bold">{siteName}</span>
        </div>
        <h2 className="text-3xl font-bold">Start your journey today.</h2>
      </div>

      <div className="flex flex-col justify-center flex-1 px-4 sm:px-8 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Logo size={32} src={logoUrl || undefined} />
            <span className="text-xl font-bold">{siteName}</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Free forever. No credit card required.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    data-testid="input-name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    data-testid="input-phone"
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setPhone(val);
                    }}
                    maxLength={11}
                    inputMode="numeric"
                    required
                  />
                  {phone && phone.length !== 11 && (
                    <p className="text-xs text-destructive">Phone number must be exactly 11 digits.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      data-testid="input-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      minLength={6}
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
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      data-testid="input-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pr-10 ${confirmPassword && confirmPassword !== password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-destructive">Passwords do not match.</p>
                  )}
                </div>

                {error && (
                  <p
                    className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
                    data-testid="text-register-error"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                  data-testid="button-register"
                >
                  {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isPending ? "Creating account..." : "Create Free Account"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
