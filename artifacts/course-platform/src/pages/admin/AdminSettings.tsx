import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  useGetSiteSettings, useUpdateSiteSettings,
  getGetSiteSettingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, RotateCcw, Upload, Loader2, Film, ImageIcon, CreditCard, Globe } from "lucide-react";

type StatItem = { value: string; label: string };
type FeatureItem = { title: string; desc: string };
type RoadmapStep = { title: string; desc: string };
type FooterLink = { label: string; url: string };

type DraftSettings = {
  site: {
    siteName: string;
    logoUrl: string;
  };
  hero: {
    headline1: string;
    headline2: string;
    subtitle: string;
    enrollmentStartDate: string;
    enrollmentEndDate: string;
    enrollButtonText: string;
    bannerTitle1: string;
    bannerTitle2: string;
    bannerVideoUrl: string;
    bannerThumbnailUrl: string;
  };
  stats: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: StatItem[];
  };
  features: {
    badge: string;
    title: string;
    subtitle: string;
    items: FeatureItem[];
  };
  cta: {
    badge: string;
    title: string;
    description: string;
    buttonText: string;
  };
  roadmap: {
    badge: string;
    title: string;
    highlightedWord: string;
    subtitle: string;
    steps: RoadmapStep[];
  };
  enrollment: {
    isOpen: boolean;
    courseName: string;
    coursePrice: number;
    bkashNumber: string;
    nagadNumber: string;
  };
  footer: {
    whatsappNumber: string;
    companyName: string;
    address: string;
    email: string;
    helpline: string;
    helplineHours: string;
    usefulLinks: FooterLink[];
    socialFacebook: string;
    socialInstagram: string;
    socialLinkedin: string;
    socialYoutube: string;
    googlePlayUrl: string;
    paymentMethods: string;
    tradeLicense: string;
    copyrightText: string;
    version: string;
  };
};

const ENROLLMENT_DEFAULTS = {
  isOpen: true,
  courseName: "CSE Fundamentals Batch",
  coursePrice: 5000,
  bkashNumber: "01712345678",
  nagadNumber: "01812345678",
};

const FOOTER_DEFAULTS = {
  whatsappNumber: "",
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

const SITE_DEFAULTS = {
  siteName: "Programming Poth",
  logoUrl: "",
};

const DEFAULTS: DraftSettings = {
  site: SITE_DEFAULTS,
  hero: {
    headline1: "Build Your Foundation",
    headline2: "Secure Your Career.",
    subtitle: "Master computer science fundamentals, problem-solving, and real-world projects with senior mentors guiding you every step of the way.",
    enrollmentStartDate: "September 10, 2026",
    enrollmentEndDate: "September 24, 2026",
    enrollButtonText: "Enroll Now",
    bannerTitle1: "CSE",
    bannerTitle2: "FUNDAMENTALS",
    bannerVideoUrl: "",
    bannerThumbnailUrl: "",
  },
  stats: {
    sectionTitle: "Programming Poth At A Glance",
    sectionSubtitle: "Real numbers from our growing community of learners and successful alumni.",
    items: [
      { value: "5,200", label: "Active Students" },
      { value: "24", label: "Expert-led Courses" },
      { value: "1,800+", label: "Successful Graduates" },
      { value: "94%", label: "Job Placement Rate" },
    ],
  },
  features: {
    badge: "Why Programming Poth",
    title: "Everything You Need To Succeed",
    subtitle: "From your first line of code to landing your dream job — we've got every step covered.",
    items: [
      { title: "Live Recorded Classes", desc: "Daily class recordings with full HD quality. Watch any time, anywhere." },
      { title: "Hands-on Projects", desc: "Real-world projects with code reviews from senior engineers." },
      { title: "1-on-1 Support", desc: "Dedicated support engineers help you debug and learn faster." },
      { title: "Weekly Assignments", desc: "Practice problems and module exams every week to reinforce skills." },
      { title: "Job Placement", desc: "Resume reviews, mock interviews, and direct hiring partners." },
      { title: "Verified Certificate", desc: "Industry-recognized certificate upon completion of every course." },
    ],
  },
  cta: {
    badge: "Try Before You Buy",
    title: "Not sure which course is right for you?",
    description: "Watch a free sample lesson from any of our courses. See the teaching style, production quality, and decide for yourself — no signup needed.",
    buttonText: "Create Free Account",
  },
  roadmap: {
    badge: "Career Roadmap",
    title: "From Zero To Backend Developer",
    highlightedWord: "Backend Developer",
    subtitle: "A proven 6-step path designed by senior engineers. Follow it and become job-ready in 8-12 months.",
    steps: [
      { title: "CS Fundamentals", desc: "Programming basics, data structures, algorithms, and problem solving in C/C++." },
      { title: "Web Foundations", desc: "Master HTML, CSS, JavaScript, Git, and the web platform from the ground up." },
      { title: "Backend Engineering", desc: "Node.js, Express, REST APIs, authentication, and server-side architecture." },
      { title: "Databases", desc: "SQL, PostgreSQL, NoSQL, schema design, queries, and performance tuning." },
      { title: "Cloud & DevOps", desc: "Docker, deployment pipelines, CI/CD, monitoring, and production readiness." },
      { title: "Job Ready", desc: "System design, mock interviews, resume reviews, and direct placement support." },
    ],
  },
  enrollment: ENROLLMENT_DEFAULTS,
  footer: FOOTER_DEFAULTS,
};

function mergeWithDefaults(raw: unknown): DraftSettings {
  if (!raw || typeof raw !== "object") return DEFAULTS;
  const r = raw as Record<string, unknown>;
  return {
    site: { ...SITE_DEFAULTS, ...(r.site as object | undefined) },
    hero: { ...DEFAULTS.hero, ...(r.hero as object | undefined) },
    stats: {
      ...DEFAULTS.stats,
      ...(r.stats as object | undefined),
      items: Array.isArray((r.stats as Record<string, unknown> | undefined)?.items)
        ? (r.stats as Record<string, unknown>).items as StatItem[]
        : DEFAULTS.stats.items,
    },
    features: {
      ...DEFAULTS.features,
      ...(r.features as object | undefined),
      items: Array.isArray((r.features as Record<string, unknown> | undefined)?.items)
        ? (r.features as Record<string, unknown>).items as FeatureItem[]
        : DEFAULTS.features.items,
    },
    cta: { ...DEFAULTS.cta, ...(r.cta as object | undefined) },
    roadmap: {
      ...DEFAULTS.roadmap,
      ...(r.roadmap as object | undefined),
      steps: Array.isArray((r.roadmap as Record<string, unknown> | undefined)?.steps)
        ? (r.roadmap as Record<string, unknown>).steps as RoadmapStep[]
        : DEFAULTS.roadmap.steps,
    },
    enrollment: { ...ENROLLMENT_DEFAULTS, ...(r.enrollment as object | undefined) },
    footer: {
      ...FOOTER_DEFAULTS,
      ...(r.footer as object | undefined),
      usefulLinks: Array.isArray((r.footer as Record<string, unknown> | undefined)?.usefulLinks)
        ? (r.footer as Record<string, unknown>).usefulLinks as FooterLink[]
        : FOOTER_DEFAULTS.usefulLinks,
    },
  };
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });
  const { mutate: save, isPending } = useUpdateSiteSettings();

  const [draft, setDraft] = useState<DraftSettings>(DEFAULTS);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  async function uploadToStorage(file: File): Promise<string> {
    const resp = await fetch("/api/storage/uploads/file", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name,
      },
      body: file,
    });
    if (!resp.ok) throw new Error("Upload failed");
    const data = await resp.json() as { objectPath: string };
    return `/api/storage${data.objectPath}`;
  }

  async function uploadThumbnail(file: File) {
    setIsThumbnailUploading(true);
    try {
      const url = await uploadToStorage(file);
      setHero("bannerThumbnailUrl", url);
      toast({ title: "Thumbnail uploaded", description: "Thumbnail image saved successfully." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload thumbnail.", variant: "destructive" });
    } finally {
      setIsThumbnailUploading(false);
    }
  }

  async function uploadVideo(file: File) {
    setIsVideoUploading(true);
    try {
      const url = await uploadToStorage(file);
      setHero("bannerVideoUrl", url);
      toast({ title: "Video uploaded", description: "Video file saved successfully." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload video.", variant: "destructive" });
    } finally {
      setIsVideoUploading(false);
    }
  }

  useEffect(() => {
    if (data?.settings) {
      setDraft(mergeWithDefaults(data.settings));
    }
  }, [data]);

  function setSite(key: keyof DraftSettings["site"], val: string) {
    setDraft((d) => ({ ...d, site: { ...d.site, [key]: val } }));
  }

  function setHero(key: keyof DraftSettings["hero"], val: string) {
    setDraft((d) => ({ ...d, hero: { ...d.hero, [key]: val } }));
  }
  function setStats(key: keyof Omit<DraftSettings["stats"], "items">, val: string) {
    setDraft((d) => ({ ...d, stats: { ...d.stats, [key]: val } }));
  }
  function setStatItem(i: number, key: keyof StatItem, val: string) {
    setDraft((d) => {
      const items = [...d.stats.items];
      items[i] = { ...items[i]!, [key]: val };
      return { ...d, stats: { ...d.stats, items } };
    });
  }
  function addStatItem() {
    setDraft((d) => ({ ...d, stats: { ...d.stats, items: [...d.stats.items, { value: "", label: "" }] } }));
  }
  function removeStatItem(i: number) {
    setDraft((d) => ({ ...d, stats: { ...d.stats, items: d.stats.items.filter((_, j) => j !== i) } }));
  }

  function setFeatures(key: keyof Omit<DraftSettings["features"], "items">, val: string) {
    setDraft((d) => ({ ...d, features: { ...d.features, [key]: val } }));
  }
  function setFeatureItem(i: number, key: keyof FeatureItem, val: string) {
    setDraft((d) => {
      const items = [...d.features.items];
      items[i] = { ...items[i]!, [key]: val };
      return { ...d, features: { ...d.features, items } };
    });
  }
  function addFeatureItem() {
    setDraft((d) => ({ ...d, features: { ...d.features, items: [...d.features.items, { title: "", desc: "" }] } }));
  }
  function removeFeatureItem(i: number) {
    setDraft((d) => ({ ...d, features: { ...d.features, items: d.features.items.filter((_, j) => j !== i) } }));
  }

  function setEnrollment<K extends keyof DraftSettings["enrollment"]>(key: K, val: DraftSettings["enrollment"][K]) {
    setDraft((d) => ({ ...d, enrollment: { ...d.enrollment, [key]: val } }));
  }

  function setCta(key: keyof DraftSettings["cta"], val: string) {
    setDraft((d) => ({ ...d, cta: { ...d.cta, [key]: val } }));
  }

  function setRoadmap(key: keyof Omit<DraftSettings["roadmap"], "steps">, val: string) {
    setDraft((d) => ({ ...d, roadmap: { ...d.roadmap, [key]: val } }));
  }
  function setRoadmapStep(i: number, key: keyof RoadmapStep, val: string) {
    setDraft((d) => {
      const steps = [...d.roadmap.steps];
      steps[i] = { ...steps[i]!, [key]: val };
      return { ...d, roadmap: { ...d.roadmap, steps } };
    });
  }
  function addRoadmapStep() {
    setDraft((d) => ({ ...d, roadmap: { ...d.roadmap, steps: [...d.roadmap.steps, { title: "", desc: "" }] } }));
  }
  function removeRoadmapStep(i: number) {
    setDraft((d) => ({ ...d, roadmap: { ...d.roadmap, steps: d.roadmap.steps.filter((_, j) => j !== i) } }));
  }

  function handleSave() {
    save(
      { data: draft },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
          toast({ title: "Settings saved", description: "Home page updated successfully." });
        },
        onError: () => toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
      },
    );
  }

  function setFooter<K extends keyof DraftSettings["footer"]>(key: K, val: DraftSettings["footer"][K]) {
    setDraft((d) => ({ ...d, footer: { ...d.footer, [key]: val } }));
  }
  function setFooterLink(i: number, key: keyof FooterLink, val: string) {
    setDraft((d) => {
      const links = [...d.footer.usefulLinks];
      links[i] = { ...links[i]!, [key]: val };
      return { ...d, footer: { ...d.footer, usefulLinks: links } };
    });
  }
  function addFooterLink() {
    setDraft((d) => ({ ...d, footer: { ...d.footer, usefulLinks: [...d.footer.usefulLinks, { label: "", url: "#" }] } }));
  }
  function removeFooterLink(i: number) {
    setDraft((d) => ({ ...d, footer: { ...d.footer, usefulLinks: d.footer.usefulLinks.filter((_, j) => j !== i) } }));
  }

  function handleReset() {
    if (data?.settings) setDraft(mergeWithDefaults(data.settings));
    else setDraft(DEFAULTS);
    toast({ title: "Reset", description: "Unsaved changes discarded." });
  }

  if (isLoading) {
    return (
      <AdminLayout title="Site Settings" subtitle="Manage home page content">
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Site Settings"
      subtitle="Edit every section of the home page"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isPending}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            <Save className="w-4 h-4 mr-1" /> {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="site" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="site">Site Identity</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="cta">CTA Banner</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
        </TabsList>

        {/* SITE IDENTITY TAB */}
        <TabsContent value="site">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Site Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1.5">
                  <Label>Site Name</Label>
                  <Input
                    value={draft.site.siteName}
                    onChange={(e) => setSite("siteName", e.target.value)}
                    placeholder="e.g. Programming Poth"
                  />
                  <p className="text-xs text-muted-foreground">Shown in the browser tab title, navbar, and footer.</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> Logo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={draft.site.logoUrl}
                      onChange={(e) => setSite("logoUrl", e.target.value)}
                      placeholder="https://… or upload a file →"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = async () => {
                          const file = input.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadToStorage(file);
                            setSite("logoUrl", url);
                            toast({ title: "Logo uploaded", description: "Logo saved successfully." });
                          } catch {
                            toast({ title: "Upload failed", variant: "destructive" });
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-4 h-4" /> Upload
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Leave blank to use the default logo from <code>/logo.png</code>.</p>
                  {draft.site.logoUrl && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20 mt-2">
                      <img src={draft.site.logoUrl} alt="Logo preview" className="w-10 h-10 object-contain rounded-lg" />
                      <p className="text-xs text-muted-foreground truncate flex-1">{draft.site.logoUrl}</p>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => setSite("logoUrl", "")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ENROLLMENT TAB */}
        <TabsContent value="enrollment">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Enrollment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div>
                    <p className="font-semibold">{draft.enrollment.isOpen ? "Enrollment is OPEN" : "Enrollment is CLOSED"}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {draft.enrollment.isOpen
                        ? "Students can click Enroll Now and submit payments"
                        : "Clicking Enroll Now will show \"এখন enrollment এর সময় নায়\""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${draft.enrollment.isOpen ? "text-green-600" : "text-red-500"}`}>
                      {draft.enrollment.isOpen ? "ON" : "OFF"}
                    </span>
                    <Switch
                      checked={draft.enrollment.isOpen}
                      onCheckedChange={(v) => setEnrollment("isOpen", v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Course & Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Course Name</Label>
                  <Input
                    value={draft.enrollment.courseName}
                    onChange={(e) => setEnrollment("courseName", e.target.value)}
                    placeholder="e.g. CSE Fundamentals Batch"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Course Price (৳)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.enrollment.coursePrice}
                    onChange={(e) => setEnrollment("coursePrice", Number(e.target.value))}
                    placeholder="e.g. 5000"
                  />
                  <p className="text-xs text-muted-foreground">This amount will be shown on the payment page</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Payment Numbers</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" /> bKash Number
                  </Label>
                  <Input
                    value={draft.enrollment.bkashNumber}
                    onChange={(e) => setEnrollment("bkashNumber", e.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Nagad Number
                  </Label>
                  <Input
                    value={draft.enrollment.nagadNumber}
                    onChange={(e) => setEnrollment("nagadNumber", e.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HERO TAB */}
        <TabsContent value="hero">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Headline</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Line 1 (e.g. "Build Your Foundation")</Label>
                  <Input value={draft.hero.headline1} onChange={(e) => setHero("headline1", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Line 2 (e.g. "Secure Your Career.")</Label>
                  <Input value={draft.hero.headline2} onChange={(e) => setHero("headline2", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtitle / Description</Label>
                  <Textarea rows={3} value={draft.hero.subtitle} onChange={(e) => setHero("subtitle", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Next Batch Schedule</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Enrollment Start Date</Label>
                  <Input value={draft.hero.enrollmentStartDate} onChange={(e) => setHero("enrollmentStartDate", e.target.value)} placeholder="e.g. September 10, 2026" />
                </div>
                <div className="space-y-1.5">
                  <Label>Enrollment End Date</Label>
                  <Input value={draft.hero.enrollmentEndDate} onChange={(e) => setHero("enrollmentEndDate", e.target.value)} placeholder="e.g. September 24, 2026" />
                </div>
                <div className="space-y-1.5">
                  <Label>Enroll Button Text</Label>
                  <Input value={draft.hero.enrollButtonText} onChange={(e) => setHero("enrollButtonText", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Hero Video Banner</CardTitle></CardHeader>
              <CardContent className="space-y-6">

                {/* VIDEO UPLOAD */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Film className="w-4 h-4" /> Video</Label>
                  <div className="flex gap-2">
                    <Input
                      value={draft.hero.bannerVideoUrl}
                      onChange={(e) => setHero("bannerVideoUrl", e.target.value)}
                      placeholder="YouTube link or .mp4 URL, or upload a file →"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isVideoUploading}
                      onClick={() => videoInputRef.current?.click()}
                      className="shrink-0 gap-1.5"
                    >
                      {isVideoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isVideoUploading ? "Uploading…" : "Upload"}
                    </Button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadVideo(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {draft.hero.bannerVideoUrl && (
                    <p className="text-xs text-muted-foreground truncate">Current: {draft.hero.bannerVideoUrl}</p>
                  )}
                </div>

                {/* THUMBNAIL UPLOAD */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> Thumbnail Image <span className="text-muted-foreground font-normal">(shown before play)</span></Label>
                  <div className="flex gap-2">
                    <Input
                      value={draft.hero.bannerThumbnailUrl}
                      onChange={(e) => setHero("bannerThumbnailUrl", e.target.value)}
                      placeholder="Image URL, or upload a file →"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isThumbnailUploading}
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="shrink-0 gap-1.5"
                    >
                      {isThumbnailUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isThumbnailUploading ? "Uploading…" : "Upload"}
                    </Button>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadThumbnail(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {draft.hero.bannerThumbnailUrl && (
                    <div className="rounded-lg overflow-hidden border aspect-video max-w-sm mt-2">
                      <img src={draft.hero.bannerThumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">If no video is set, the banner will show the text title instead. You can paste a URL or upload a file directly.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Section Heading</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={draft.stats.sectionTitle} onChange={(e) => setStats("sectionTitle", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtitle</Label>
                  <Input value={draft.stats.sectionSubtitle} onChange={(e) => setStats("sectionSubtitle", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Stat Cards</CardTitle>
                  <Button size="sm" variant="outline" onClick={addStatItem}>
                    <Plus className="w-4 h-4 mr-1" /> Add Stat
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.stats.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Value</Label>
                        <Input value={item.value} onChange={(e) => setStatItem(i, "value", e.target.value)} placeholder="e.g. 5,200" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input value={item.label} onChange={(e) => setStatItem(i, "label", e.target.value)} placeholder="e.g. Active Students" />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeStatItem(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FEATURES TAB */}
        <TabsContent value="features">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Section Heading</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Badge Text</Label>
                  <Input value={draft.features.badge} onChange={(e) => setFeatures("badge", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={draft.features.title} onChange={(e) => setFeatures("title", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtitle</Label>
                  <Textarea rows={2} value={draft.features.subtitle} onChange={(e) => setFeatures("subtitle", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Feature Cards</CardTitle>
                  <Button size="sm" variant="outline" onClick={addFeatureItem}>
                    <Plus className="w-4 h-4 mr-1" /> Add Feature
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.features.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input value={item.title} onChange={(e) => setFeatureItem(i, "title", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Textarea rows={2} value={item.desc} onChange={(e) => setFeatureItem(i, "desc", e.target.value)} />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive mt-1 shrink-0" onClick={() => removeFeatureItem(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CTA TAB */}
        <TabsContent value="cta">
          <Card>
            <CardHeader><CardTitle className="text-base">Dark CTA Banner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Badge Text</Label>
                <Input value={draft.cta.badge} onChange={(e) => setCta("badge", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={draft.cta.title} onChange={(e) => setCta("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={3} value={draft.cta.description} onChange={(e) => setCta("description", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Button Text</Label>
                <Input value={draft.cta.buttonText} onChange={(e) => setCta("buttonText", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROADMAP TAB */}
        <TabsContent value="roadmap">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Section Heading</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Badge Text</Label>
                  <Input value={draft.roadmap.badge} onChange={(e) => setRoadmap("badge", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Full Title (e.g. "From Zero To Backend Developer")</Label>
                  <Input value={draft.roadmap.title} onChange={(e) => setRoadmap("title", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Highlighted Word(s) in Title (exact match, will be shown in gradient color)</Label>
                  <Input value={draft.roadmap.highlightedWord} onChange={(e) => setRoadmap("highlightedWord", e.target.value)} placeholder="e.g. Backend Developer" />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtitle</Label>
                  <Textarea rows={2} value={draft.roadmap.subtitle} onChange={(e) => setRoadmap("subtitle", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Roadmap Steps</CardTitle>
                  <Button size="sm" variant="outline" onClick={addRoadmapStep}>
                    <Plus className="w-4 h-4 mr-1" /> Add Step
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.roadmap.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 mt-1">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Step Title</Label>
                        <Input value={step.title} onChange={(e) => setRoadmapStep(i, "title", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Textarea rows={2} value={step.desc} onChange={(e) => setRoadmapStep(i, "desc", e.target.value)} />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive mt-1 shrink-0" onClick={() => removeRoadmapStep(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* FOOTER TAB */}
        <TabsContent value="footer">
          <div className="space-y-4">
            {/* WhatsApp */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#25D366" }}>
                  <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </span>
                WhatsApp Float Button
              </CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label>WhatsApp Number <span className="text-muted-foreground font-normal text-xs">(country code সহ, e.g. 8801XXXXXXXXX)</span></Label>
                  <Input
                    value={draft.footer.whatsappNumber}
                    onChange={(e) => setFooter("whatsappNumber", e.target.value)}
                    placeholder="e.g. 8801712345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number দিলে homepage এর নিচে ডানে WhatsApp icon দেখাবে। খালি রাখলে icon দেখাবে না।
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Company Info</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Company Name</Label>
                  <Input value={draft.footer.companyName} onChange={(e) => setFooter("companyName", e.target.value)} placeholder="e.g. Programming Poth" />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={draft.footer.address} onChange={(e) => setFooter("address", e.target.value)} placeholder="e.g. Level-4, 34 Tech Avenue..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Support Email</Label>
                  <Input value={draft.footer.email} onChange={(e) => setFooter("email", e.target.value)} placeholder="support@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Helpline Number</Label>
                  <Input value={draft.footer.helpline} onChange={(e) => setFooter("helpline", e.target.value)} placeholder="+880 1XXXXXXXXX" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Helpline Hours</Label>
                  <Input value={draft.footer.helplineHours} onChange={(e) => setFooter("helplineHours", e.target.value)} placeholder="e.g. Available: 10AM - 5PM" />
                </div>
              </CardContent>
            </Card>

            {/* Useful Links */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Useful Links</CardTitle>
                  <Button size="sm" variant="outline" onClick={addFooterLink}>
                    <Plus className="w-4 h-4 mr-1" /> Add Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.footer.usefulLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input value={link.label} onChange={(e) => setFooterLink(i, "label", e.target.value)} placeholder="e.g. Privacy Policy" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL</Label>
                        <Input value={link.url} onChange={(e) => setFooterLink(i, "url", e.target.value)} placeholder="https://... or #" />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeFooterLink(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Social Media */}
            <Card>
              <CardHeader><CardTitle className="text-base">Social Media Links</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">FB</span> Facebook URL</Label>
                  <Input value={draft.footer.socialFacebook} onChange={(e) => setFooter("socialFacebook", e.target.value)} placeholder="https://facebook.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">IG</span> Instagram URL</Label>
                  <Input value={draft.footer.socialInstagram} onChange={(e) => setFooter("socialInstagram", e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center">IN</span> LinkedIn URL</Label>
                  <Input value={draft.footer.socialLinkedin} onChange={(e) => setFooter("socialLinkedin", e.target.value)} placeholder="https://linkedin.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><span className="w-5 h-5 rounded bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">YT</span> YouTube URL</Label>
                  <Input value={draft.footer.socialYoutube} onChange={(e) => setFooter("socialYoutube", e.target.value)} placeholder="https://youtube.com/..." />
                </div>
              </CardContent>
            </Card>

            {/* App & Payments */}
            <Card>
              <CardHeader><CardTitle className="text-base">App & Payment Info</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Google Play URL</Label>
                  <Input value={draft.footer.googlePlayUrl} onChange={(e) => setFooter("googlePlayUrl", e.target.value)} placeholder="https://play.google.com/..." />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Payment Methods <span className="text-muted-foreground font-normal text-xs">(comma-separated)</span></Label>
                  <Input value={draft.footer.paymentMethods} onChange={(e) => setFooter("paymentMethods", e.target.value)} placeholder="VISA, MC, AMEX, bKash, Nagad" />
                  <p className="text-xs text-muted-foreground">Each item will be shown as a badge in the footer</p>
                </div>
              </CardContent>
            </Card>

            {/* Legal */}
            <Card>
              <CardHeader><CardTitle className="text-base">Legal & Version</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Trade License Number</Label>
                  <Input value={draft.footer.tradeLicense} onChange={(e) => setFooter("tradeLicense", e.target.value)} placeholder="e.g. 177159" />
                </div>
                <div className="space-y-1.5">
                  <Label>Copyright Text</Label>
                  <Input value={draft.footer.copyrightText} onChange={(e) => setFooter("copyrightText", e.target.value)} placeholder="e.g. Programming Poth.io" />
                </div>
                <div className="space-y-1.5">
                  <Label>Version</Label>
                  <Input value={draft.footer.version} onChange={(e) => setFooter("version", e.target.value)} placeholder="e.g. v 1.0.0" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </AdminLayout>
  );
}
