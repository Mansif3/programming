import Logo from "@/components/Logo";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { useSiteIdentity } from "@/hooks/useSiteIdentity";

const FOOTER_DEFAULTS = {
  companyName: "Programming Poth",
  address: "Level-4, 34 Tech Avenue, Banani, Dhaka",
  email: "support@programmingpath.io",
  helpline: "+880 1322-810881",
  helplineHours: "Available: 10AM - 5PM",
  usefulLinks: [
    { label: "Refund policy", url: "#" },
    { label: "Terms and Conditions", url: "#" },
    { label: "Privacy Policy", url: "#" },
    { label: "App Privacy Policy", url: "#" },
    { label: "About us", url: "#" },
    { label: "Success Story", url: "#" },
  ],
  socialFacebook: "#",
  socialInstagram: "#",
  socialLinkedin: "#",
  socialYoutube: "#",
  googlePlayUrl: "#",
  paymentMethods: "VISA, MC, AMEX, bKash, Nagad",
  tradeLicense: "177159",
  copyrightText: "Programming Poth.io",
  version: "v 1.0.0",
};

export default function Footer() {
  const { logoUrl } = useSiteIdentity();
  const { data } = useGetSiteSettings();
  const raw = data?.settings as Record<string, unknown> | undefined;
  const f = raw?.footer
    ? { ...FOOTER_DEFAULTS, ...(raw.footer as object) }
    : FOOTER_DEFAULTS;

  const isRealUrl = (url: string | undefined) => !!url && url !== "#" && url.trim() !== "";

  const socials = [
    { key: "FB", url: f.socialFacebook },
    { key: "IG", url: f.socialInstagram },
    { key: "IN", url: f.socialLinkedin },
    { key: "YT", url: f.socialYoutube },
  ].filter((s) => isRealUrl(s.url));

  const activeSocialLinks = socials;
  const hasGooglePlay = isRealUrl(f.googlePlayUrl);
  const activeUsefulLinks = (f.usefulLinks as { label: string; url: string }[]).filter(
    (item) => isRealUrl(item.url)
  );

  const paymentBadges = f.paymentMethods
    .split(",")
    .map((p: string) => p.trim())
    .filter(Boolean);

  const year = new Date().getFullYear();
  const hasUsefulLinks = activeUsefulLinks.length > 0;
  const hasSocialOrApp = activeSocialLinks.length > 0 || hasGooglePlay;
  const hasAnySideContent = hasUsefulLinks || hasSocialOrApp;

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 mt-auto">
      <div className="container py-12">
        <div className={`pb-8 border-b border-slate-700 ${hasAnySideContent ? "grid grid-cols-1 md:grid-cols-3 gap-8" : "flex justify-center"}`}>
          {/* Company Info */}
          <div className={!hasAnySideContent ? "text-center" : ""}>
            <div className={`flex items-center gap-2 mb-4 ${!hasAnySideContent ? "justify-center" : ""}`}>
              <Logo size={32} src={logoUrl || undefined} />
              <span className="font-bold text-white text-lg">{f.companyName}</span>
            </div>
            <address className="not-italic text-sm space-y-1 text-slate-400">
              <p>{f.address}</p>
              <p>{f.email}</p>
              <p>Helpline: {f.helpline}</p>
              <p className="text-xs">({f.helplineHours})</p>
            </address>
          </div>

          {/* Useful Links */}
          {activeUsefulLinks.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Useful Links</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {activeUsefulLinks.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Social + App */}
          {(activeSocialLinks.length > 0 || hasGooglePlay) && (
            <div>
              {activeSocialLinks.length > 0 && (
                <>
                  <h4 className="font-semibold text-white mb-4 text-sm">Social Media</h4>
                  <div className="flex gap-3 mb-6">
                    {activeSocialLinks.map((s) => (
                      <a
                        key={s.key}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full bg-slate-700 hover:bg-primary transition-colors flex items-center justify-center"
                      >
                        <span className="text-xs font-bold text-white">{s.key}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              {hasGooglePlay && (
                <>
                  <h4 className="font-semibold text-white mb-3 text-sm">Download App</h4>
                  <a
                    href={f.googlePlayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 transition-colors px-3 py-2 rounded-lg"
                  >
                    <span className="text-xs text-white font-medium">GET IT ON Google Play</span>
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Pay With</span>
            <div className="flex gap-1 flex-wrap">
              {paymentBadges.map((p: string) => (
                <span key={p} className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 text-[10px]">{p}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {f.tradeLicense && <span>Trade License: {f.tradeLicense}</span>}
            <span>Copyright © {year} {f.copyrightText}</span>
            {f.version && <span>{f.version}</span>}
          </div>
        </div>
      </div>
    </footer>
  );
}
