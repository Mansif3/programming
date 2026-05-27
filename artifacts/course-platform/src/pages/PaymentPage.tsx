import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Smartphone, CheckCircle, Copy, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useGetSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";

type EnrollmentSettings = {
  isOpen?: boolean;
  courseName?: string;
  coursePrice?: number;
  bkashNumber?: string;
  nagadNumber?: string;
};

export default function PaymentPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: settingsData } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });
  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("pp_logged_in");

  if (!isLoggedIn) {
    return <Redirect to="/login" />;
  }

  const s = settingsData?.settings;
  const enrollment = ((s as Record<string, unknown> | undefined)?.enrollment ?? {}) as EnrollmentSettings;

  const bkashNumber = enrollment.bkashNumber ?? "01712345678";
  const nagadNumber = enrollment.nagadNumber ?? "01812345678";
  const courseName = enrollment.courseName ?? "CSE Fundamentals Batch";
  const coursePrice = enrollment.coursePrice ?? 5000;

  const [form, setForm] = useState({
    paymentMethod: "",
    paymentPhone: "",
    txnId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function copyNumber(num: string, label: string) {
    navigator.clipboard.writeText(num).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.paymentMethod || !form.paymentPhone || !form.txnId) {
      toast({ title: "সব তথ্য পূরণ করুন", variant: "destructive" });
      return;
    }
    const digitsOnly = form.paymentPhone.replace(/\D/g, "");
    if (digitsOnly.length !== 11) {
      toast({ title: "নম্বরটি ঠিক ১১ সংখ্যার হতে হবে", description: "যেমন: 01XXXXXXXXX", variant: "destructive" });
      return;
    }
    if (form.txnId.trim().length !== 10) {
      toast({ title: "TRX ID ঠিক ১০ অক্ষরের হতে হবে", description: "যেমন: 8AB12CD3EF", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName,
          amount: coursePrice,
          paymentMethod: form.paymentMethod,
          paymentPhone: form.paymentPhone,
          txnId: form.txnId,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      toast({ title: "সমস্যা হয়েছে, আবার চেষ্টা করুন", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-10 pb-10">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">পেমেন্ট সাবমিট হয়েছে!</h2>
              <p className="text-muted-foreground mb-6">
                আপনার পেমেন্ট তথ্য আমরা পেয়েছি। Admin যাচাই করার পর আপনার enrollment confirm করা হবে।
              </p>
              <Button onClick={() => navigate("/")} className="w-full">হোমপেজে ফিরে যান</Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back */}
          <Link href="/">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> হোমপেজে ফিরুন
            </button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold">কোর্সে ভর্তি হন</h1>
            <p className="text-muted-foreground mt-1">নিচের নম্বরে টাকা পাঠিয়ে TRX ID দিয়ে সাবমিট করুন</p>
          </div>

          {/* Course info banner */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">কোর্স</p>
                  <p className="font-bold text-lg">{courseName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">কোর্স ফি</p>
                  <p className="font-bold text-2xl text-primary">৳ {coursePrice.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment numbers */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-pink-200 bg-pink-50 dark:bg-pink-950/20 dark:border-pink-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-pink-700 dark:text-pink-400">bKash</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-semibold">{bkashNumber}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-pink-300 hover:bg-pink-100"
                    onClick={() => copyNumber(bkashNumber, "bkash")}
                  >
                    <Copy className="w-3 h-3" />
                    {copied === "bkash" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Send Money করুন এবং TRX ID সংরক্ষণ করুন</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-orange-700 dark:text-orange-400">Nagad</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-semibold">{nagadNumber}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-orange-300 hover:bg-orange-100"
                    onClick={() => copyNumber(nagadNumber, "nagad")}
                  >
                    <Copy className="w-3 h-3" />
                    {copied === "nagad" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Send Money করুন এবং TRX ID সংরক্ষণ করুন</p>
              </CardContent>
            </Card>
          </div>

          {/* Info banner */}
          <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>টাকা পাঠানোর পর নিচের ফর্ম পূরণ করুন। Admin যাচাই করলে আপনার enrollment confirmed হবে।</p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">পেমেন্ট তথ্য জমা দিন</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>পেমেন্ট পদ্ধতি *</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="bKash / Nagad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bkash">bKash</SelectItem>
                      <SelectItem value="nagad">Nagad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>যে নম্বর থেকে টাকা পাঠিয়েছেন *</Label>
                  <Input
                    className="mt-1"
                    type="tel"
                    inputMode="numeric"
                    placeholder="01XXXXXXXXX"
                    maxLength={11}
                    value={form.paymentPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      set("paymentPhone", digits);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.paymentPhone.length}/11 সংখ্যা</p>
                </div>

                <div>
                  <Label>Transaction ID (TRX ID) *</Label>
                  <Input
                    className="mt-1 font-mono"
                    placeholder="যেমন: 8AB12CD3EF"
                    value={form.txnId}
                    onChange={(e) => set("txnId", e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-muted-foreground mt-1">bKash/Nagad app-এর Transaction History থেকে TRX ID পাবেন</p>
                </div>

                <Button type="submit" disabled={submitting} className="w-full h-11 text-base font-semibold">
                  {submitting ? "সাবমিট হচ্ছে..." : "পেমেন্ট সাবমিট করুন"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
