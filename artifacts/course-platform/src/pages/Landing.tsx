import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  useGetPlatformStats, getGetPlatformStatsQueryKey,
  useGetSiteSettings, getGetSiteSettingsQueryKey,
} from "@workspace/api-client-react";
import {
  ArrowRight, Sparkles, Users, BookOpen, Award, TrendingUp,
  Code2, MessageCircle, Video, FileCheck, Briefcase, Star,
  CheckCircle2, ChevronRight, Smartphone, Quote, Rocket, Play, X, FilePen, GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { useSiteIdentity } from "@/hooks/useSiteIdentity";

function getEmbedUrl(url: string): string {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  return url;
}

const FEATURE_ICONS = [Video, Code2, MessageCircle, FileCheck, Briefcase, Award];
const FEATURE_STYLES = [
  { bg: "bg-purple-50 dark:bg-purple-950/20", iconBg: "bg-purple-100 dark:bg-purple-900/40", iconColor: "text-purple-600 dark:text-purple-400" },
  { bg: "bg-blue-50 dark:bg-blue-950/20", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-pink-50 dark:bg-pink-950/20", iconBg: "bg-pink-100 dark:bg-pink-900/40", iconColor: "text-pink-600 dark:text-pink-400" },
  { bg: "bg-amber-50 dark:bg-amber-950/20", iconBg: "bg-amber-100 dark:bg-amber-900/40", iconColor: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-green-50 dark:bg-green-950/20", iconBg: "bg-green-100 dark:bg-green-900/40", iconColor: "text-green-600 dark:text-green-400" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/20", iconBg: "bg-cyan-100 dark:bg-cyan-900/40", iconColor: "text-cyan-600 dark:text-cyan-400" },
];

const STAT_ICONS = [Users, BookOpen, Award, TrendingUp];

const TESTIMONIALS = [
  {
    name: "Rifat Hossain",
    role: "Software Engineer at Brain Station 23",
    quote: "Programming Poth changed everything. The fundamentals course gave me confidence and the support engineers were always there. I landed my first job within 2 months of completion.",
    avatar: "https://i.pravatar.cc/150?img=12",
  },
  {
    name: "Nusrat Jahan",
    role: "Backend Developer at Pathao",
    quote: "The roadmap is so well structured. I went from zero to backend developer in 8 months. The live problem-solving sessions were the best part of the journey.",
    avatar: "https://i.pravatar.cc/150?img=44",
  },
  {
    name: "Tanvir Ahmed",
    role: "Full Stack Engineer at Tiger IT",
    quote: "What I loved was the community. The help desk is incredibly active and the mentors actually care. Worth every taka I spent on this platform.",
    avatar: "https://i.pravatar.cc/150?img=33",
  },
];

const FAQS = [
  { q: "Who is this course suitable for?", a: "Anyone who wants to become a software engineer — from absolute beginners with no coding background to working professionals who want to level up their skills." },
  { q: "Do I need a powerful computer?", a: "No. Any modern laptop or desktop with at least 4GB RAM and a stable internet connection will work just fine." },
  { q: "How are live classes conducted?", a: "Classes are streamed live via our platform with full interaction. All sessions are recorded and available to revisit anytime in your dashboard." },
  { q: "What if I miss a class?", a: "All classes are recorded. You can watch them anytime from your dashboard along with all class resources, slides, and code." },
  { q: "Is there job placement support?", a: "Yes. Top performers get direct referrals to our 50+ hiring partners. We also offer resume reviews, mock interviews, and 1-on-1 career coaching." },
  { q: "What payment methods are accepted?", a: "We accept bKash, Nagad, Rocket, all major credit/debit cards, and bank transfers. Installment plans are available for select courses." },
];

export default function Landing() {
  const { siteName, logoUrl } = useSiteIdentity();
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: stats } = useGetPlatformStats({ query: { queryKey: getGetPlatformStatsQueryKey() } });
  const { data: settingsData } = useGetSiteSettings({ query: { queryKey: getGetSiteSettingsQueryKey() } });
  const s = settingsData?.settings;
  const enrollment = (s as Record<string, unknown> | undefined)?.enrollment as { isOpen?: boolean } | undefined;
  const isEnrollmentOpen = enrollment?.isOpen !== false;

  function handleEnrollClick() {
    const isLoggedIn = !!localStorage.getItem("pp_logged_in");
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!isEnrollmentOpen) {
      toast({
        title: "এখন enrollment এর সময় নায়",
        description: "Enrollment বর্তমানে বন্ধ আছে। পরে আবার চেষ্টা করুন।",
        variant: "destructive",
      });
      return;
    }
    navigate("/enroll");
  }

  const hero = s?.hero;
  const statsSection = s?.stats;
  const featuresSection = s?.features;
  const ctaSection = s?.cta;
  const roadmapSection = s?.roadmap;

  // Headline split for roadmap
  const roadmapTitle = roadmapSection?.title ?? "From Zero To Backend Developer";
  const roadmapHighlight = roadmapSection?.highlightedWord ?? "Backend Developer";
  const highlightIndex = roadmapTitle.lastIndexOf(roadmapHighlight);
  const roadmapBefore = highlightIndex >= 0 ? roadmapTitle.slice(0, highlightIndex) : roadmapTitle;
  const roadmapAfter = highlightIndex >= 0 ? roadmapTitle.slice(highlightIndex + roadmapHighlight.length) : "";

  const statItems = statsSection?.items ?? [
    { value: stats?.totalStudents?.toLocaleString() ?? "5,200", label: "Active Students" },
    { value: stats?.totalCourses?.toString() ?? "24", label: "Expert-led Courses" },
    { value: "1,800+", label: "Successful Graduates" },
    { value: "94%", label: "Job Placement Rate" },
  ];

  const featureItems = featuresSection?.items ?? [];
  const roadmapSteps = roadmapSection?.steps ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-100 via-blue-50/40 to-background dark:from-blue-950/40 dark:via-blue-950/10">
        <div className="absolute top-32 left-12 w-72 h-32 bg-white/60 dark:bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-48 right-24 w-80 h-32 bg-white/50 dark:bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-96 h-40 bg-white/40 dark:bg-white/5 rounded-full blur-3xl" />

        <div className="hidden md:flex absolute top-32 left-6 lg:left-16 w-14 h-14 rounded-2xl bg-card border border-border shadow-lg items-center justify-center -rotate-6">
          <Code2 className="w-7 h-7 text-primary" />
        </div>
        <div className="hidden md:flex absolute top-32 right-6 lg:right-16 w-14 h-14 rounded-2xl bg-card border border-border shadow-lg items-center justify-center rotate-6">
          <Sparkles className="w-7 h-7 text-amber-500" />
        </div>
        <div className="hidden md:flex absolute top-[26rem] left-4 lg:left-20 w-14 h-14 rounded-2xl bg-card border border-border shadow-lg items-center justify-center rotate-6">
          <Rocket className="w-7 h-7 text-purple-500" />
        </div>
        <div className="hidden md:flex absolute top-[26rem] right-4 lg:right-20 w-14 h-14 rounded-2xl bg-card border border-border shadow-lg items-center justify-center -rotate-6">
          <TrendingUp className="w-7 h-7 text-green-500" />
        </div>

        <div className="container relative z-10 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.15] mb-5" data-testid="hero-headline">
              {(() => {
                const h1 = hero?.headline1 ?? "Build Your Foundation";
                const h2 = hero?.headline2 ?? "Secure Your Career.";
                const splitH1 = h1.lastIndexOf(" ");
                const h1Start = splitH1 > 0 ? h1.slice(0, splitH1 + 1) : "";
                const h1End = splitH1 > 0 ? h1.slice(splitH1 + 1) : h1;
                const splitH2 = h2.lastIndexOf(" ");
                const h2Start = splitH2 > 0 ? h2.slice(0, splitH2 + 1) : "";
                const h2End = splitH2 > 0 ? h2.slice(splitH2 + 1) : h2;
                return (
                  <>
                    {h1Start}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-blue-400">{h1End}</span>
                    <br />
                    {h2Start}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-blue-400">{h2End}</span>
                  </>
                );
              })()}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {hero?.subtitle ?? "Master computer science fundamentals, problem-solving, and real-world projects with senior mentors guiding you every step of the way."}
            </p>
          </div>

          {/* Next Batch Schedule Card */}
          <div className="max-w-3xl mx-auto mb-10">
            <Card className="border-border shadow-lg shadow-primary/5">
              <CardContent className="p-5 md:p-6">
                <p className="text-center font-semibold text-sm md:text-base mb-5">
                  Next Batch Schedule
                </p>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-6 md:gap-10 justify-center md:justify-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 flex items-center justify-center">
                        <FilePen className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Enrollment Starts</p>
                        <p className="text-sm font-semibold">{hero?.enrollmentStartDate ?? "September 10, 2026"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                        <FileCheck className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Enrollment Ends</p>
                        <p className="text-sm font-semibold">{hero?.enrollmentEndDate ?? "September 24, 2026"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center md:justify-end">
                    <Button
                      size="lg"
                      onClick={handleEnrollClick}
                      className="group relative h-12 px-7 font-semibold text-sm bg-gradient-to-r from-primary via-blue-500 to-blue-600 hover:from-blue-600 hover:via-blue-500 hover:to-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                      data-testid="button-enroll-now"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <GraduationCap className="w-4 h-4 mr-2 relative z-10" />
                      <span className="relative z-10">{hero?.enrollButtonText ?? "Enroll Now"}</span>
                      <ArrowRight className="w-4 h-4 ml-2 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hero Video Banner */}
          <div className="max-w-4xl mx-auto">
            {(() => {
              const videoUrl = hero?.bannerVideoUrl ?? "";
              const thumbnailUrl = hero?.bannerThumbnailUrl ?? "";
              const hasVideo = !!videoUrl;
              return (
                <Card
                  className="relative overflow-hidden border-2 border-primary/20 shadow-2xl shadow-primary/10 transition-all group"
                  data-testid="hero-featured-banner"
                >
                  <div className="relative aspect-video overflow-hidden bg-black">
                    {/* Inline video player — shown once play is clicked */}
                    {videoPlaying && hasVideo && (
                      <>
                        <iframe
                          src={getEmbedUrl(videoUrl)}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Course preview"
                        />
                        <button
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors z-10"
                          onClick={() => setVideoPlaying(false)}
                          aria-label="Close video"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Thumbnail / placeholder — shown when video is not playing */}
                    {!videoPlaying && (
                      <>
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt="Course preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-sky-200 via-blue-200 to-indigo-200 dark:from-blue-900 dark:via-blue-950 dark:to-slate-900 flex flex-col items-center justify-center text-center px-6 relative">
                            <div className="absolute top-12 left-16 w-32 h-12 bg-white/70 rounded-full blur-xl" />
                            <div className="absolute top-20 right-24 w-40 h-12 bg-white/60 rounded-full blur-xl" />
                            <div className="absolute top-10 left-1/4 w-2 h-2 bg-yellow-400 rounded-full" />
                            <div className="absolute top-16 left-2/3 w-2 h-2 bg-pink-400 rounded-full" />
                            <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-blue-500 rounded-full" />
                            <div className="relative flex items-center gap-3 md:gap-5 mb-4">
                              <h2 className="text-4xl md:text-7xl font-black text-primary tracking-tight drop-shadow-sm">
                                {hero?.bannerTitle1 ?? "CSE"}
                              </h2>
                              <h2 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm">
                                {hero?.bannerTitle2 ?? "FUNDAMENTALS"}
                              </h2>
                            </div>
                            <div className="relative flex items-center gap-3">
                              <span className="font-serif italic text-2xl md:text-3xl text-slate-700 dark:text-slate-200">with</span>
                              <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/80 backdrop-blur rounded-full px-4 py-1.5 border border-primary/20 shadow-md">
                                <Logo size={24} src={logoUrl || undefined} />
                                <span className="text-xl md:text-2xl font-bold text-primary tracking-tight">{siteName}</span>
                              </div>
                            </div>
                            <div className="absolute bottom-0 right-8 md:right-16 opacity-20">
                              <Award className="w-32 h-32 md:w-48 md:h-48 text-primary" strokeWidth={1.2} />
                            </div>
                            <div className="absolute bottom-6 left-8 md:left-16 opacity-20">
                              <Star className="w-24 h-24 md:w-32 md:h-32 text-amber-500 fill-amber-400" strokeWidth={1.2} />
                            </div>
                          </div>
                        )}

                        {hasVideo && (
                          <div
                            className="absolute inset-0 flex items-center justify-center cursor-pointer"
                            onClick={() => setVideoPlaying(true)}
                          >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 relative z-10">
                              <Play className="w-9 h-9 md:w-11 md:h-11 text-primary fill-primary ml-1" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              );
            })()}
          </div>
        </div>
      </section>


      {/* FEATURES */}
      <section className="bg-muted/30 py-16 md:py-24 border-y border-border">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-primary border-primary/30 bg-primary/5">
              {featuresSection?.badge ?? "Why Programming Poth"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="heading-features">
              {featuresSection?.title ?? "Everything You Need To Succeed"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {featuresSection?.subtitle ?? "From your first line of code to landing your dream job — we've got every step covered."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureItems.map((feat, i) => {
              const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]!;
              const style = FEATURE_STYLES[i % FEATURE_STYLES.length]!;
              return (
                <Card key={i} className={`border-0 ${style.bg} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${style.iconColor}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="container py-16 md:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 dark:from-slate-950 dark:to-blue-950 p-10 md:p-16">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/20 rounded-full blur-[100px] -ml-12 -mb-12" />

          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div className="text-white">
              <Badge className="mb-4 bg-primary/30 text-primary-foreground border-primary/50 hover:bg-primary/40">
                {ctaSection?.badge ?? "Try Before You Buy"}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                {ctaSection?.title ?? "Not sure which course is right for you?"}
              </h2>
              <p className="text-white/70 text-base md:text-lg mb-8 leading-relaxed">
                {ctaSection?.description ?? "Watch a free sample lesson from any of our courses. See the teaching style, production quality, and decide for yourself — no signup needed."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <Button size="lg" variant="outline" className="font-semibold w-full sm:w-auto h-12 px-7 bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white">
                    {ctaSection?.buttonText ?? "Create Free Account"}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-3xl" />
                <div className="relative w-64 h-64 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
                  <Rocket className="w-32 h-32 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 dark:from-slate-950 dark:to-blue-950 py-20 md:py-28">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />

        <div className="container relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/20 text-primary-foreground border-primary/40">
              {roadmapSection?.badge ?? "Career Roadmap"}
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4" data-testid="heading-roadmap">
              {roadmapBefore}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">
                {roadmapHighlight}
              </span>
              {roadmapAfter}
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto text-base md:text-lg">
              {roadmapSection?.subtitle ?? "A proven 6-step path designed by senior engineers. Follow it and become job-ready in 8-12 months."}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent md:-translate-x-px" />

              {roadmapSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`relative flex flex-col md:flex-row gap-6 mb-10 md:mb-14 ${idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                  data-testid={`roadmap-step-${String(idx + 1).padStart(2, "0")}`}
                >
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-bold text-lg border-4 border-slate-900 dark:border-slate-950 shadow-lg shadow-primary/30">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <div className={`ml-24 md:ml-0 md:w-[calc(50%-3rem)] ${idx % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                      <CardContent className="p-6">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-sm text-white/70 leading-relaxed">{step.desc}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="hidden md:block md:w-[calc(50%-3rem)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ---------- SUB-COMPONENTS ----------

const STAT_COLORS: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
  orange: { bg: "bg-orange-50 dark:bg-orange-950/20", iconBg: "bg-orange-100 dark:bg-orange-900/40", iconColor: "text-orange-600 dark:text-orange-400" },
  pink: { bg: "bg-pink-50 dark:bg-pink-950/20", iconBg: "bg-pink-100 dark:bg-pink-900/40", iconColor: "text-pink-600 dark:text-pink-400" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950/20", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400" },
  green: { bg: "bg-green-50 dark:bg-green-950/20", iconBg: "bg-green-100 dark:bg-green-900/40", iconColor: "text-green-600 dark:text-green-400" },
};

function StatCard({ icon: Icon, value, label, color }: { icon: React.ElementType; value: string; label: string; color: string }) {
  const c = STAT_COLORS[color] ?? STAT_COLORS["blue"]!;
  return (
    <Card className={`${c.bg} border-0`}>
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${c.iconColor}`} />
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
