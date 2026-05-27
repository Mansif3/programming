import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { MessageCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { useSiteIdentity } from "@/hooks/useSiteIdentity";

export default function ForgotPassword() {
  const { siteName, logoUrl } = useSiteIdentity();
  const { data } = useGetSiteSettings();
  const raw = data?.settings as Record<string, unknown> | undefined;
  const footer = raw?.footer as Record<string, unknown> | undefined;
  const rawNumber = (footer?.whatsappNumber as string | undefined)?.trim();
  const cleaned = rawNumber ? rawNumber.replace(/\D/g, "") : null;
  const whatsappHref = cleaned ? `https://wa.me/${cleaned}` : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Logo size={40} src={logoUrl || undefined} />
          <span className="text-2xl font-bold">{siteName}</span>
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">পাসওয়ার্ড ভুলে গেছেন?</CardTitle>
            <CardDescription className="text-sm mt-1">
              চিন্তার কোনো কারণ নেই।
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            <div className="rounded-lg bg-muted/60 border border-border px-4 py-4 text-center">
              <p className="text-sm text-foreground leading-relaxed">
                পাসওয়ার্ড ভুলে গেলে{" "}
                <span className="font-semibold text-primary">অ্যাডমিনের সাথে যোগাযোগ করুন</span>।
                আপনার অ্যাকাউন্টের তথ্য যাচাই করে নতুন পাসওয়ার্ড সেট করে দেওয়া হবে।
              </p>
            </div>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button
                  size="lg"
                  className="w-full gap-3 text-base font-semibold py-6"
                  style={{ backgroundColor: "#25D366", color: "#fff" }}
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <MessageCircle className="w-5 h-5 shrink-0" />
                  WhatsApp-এ যোগাযোগ করুন
                </Button>
              </a>
            ) : (
              <div className="rounded-lg bg-muted border border-border px-4 py-3 text-center">
                <p className="text-sm text-muted-foreground">
                  WhatsApp নম্বর এখনো সেট করা হয়নি।{" "}
                  <span className="text-primary font-medium">Admin Settings</span> থেকে যোগ করুন।
                </p>
              </div>
            )}

            <Link href="/login">
              <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                Login পেজে ফিরে যান
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
