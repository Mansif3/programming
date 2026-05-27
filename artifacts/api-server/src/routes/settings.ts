import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_SETTINGS = {
  site: {
    siteName: "Programming Poth",
    logoUrl: "",
  },
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
  enrollment: {
    isOpen: true,
    courseName: "CSE Fundamentals Batch",
    coursePrice: 5000,
    bkashNumber: "01712345678",
    nagadNumber: "01812345678",
  },
  footer: {
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
  },
};

async function getOrCreateSettings() {
  const rows = await db.select().from(siteSettingsTable).limit(1);
  if (rows.length === 0) {
    const [row] = await db.insert(siteSettingsTable).values({ settings: JSON.stringify(DEFAULT_SETTINGS) }).returning();
    return row;
  }
  return rows[0]!;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const row = await getOrCreateSettings();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(row.settings);
  } catch {
    parsed = {};
  }
  // Deep-merge with defaults so new fields always appear even if DB was saved before they existed
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(parsed)) {
    if (parsed[key] !== null && typeof parsed[key] === "object" && !Array.isArray(parsed[key])
      && merged[key] !== null && typeof merged[key] === "object" && !Array.isArray(merged[key])) {
      merged[key] = { ...(merged[key] as object), ...(parsed[key] as object) };
    } else {
      merged[key] = parsed[key];
    }
  }
  res.json({ settings: merged, updatedAt: row.updatedAt });
});

router.patch("/settings", async (req, res): Promise<void> => {
  const row = await getOrCreateSettings();
  let current: Record<string, unknown>;
  try {
    current = JSON.parse(row.settings);
  } catch {
    current = { ...DEFAULT_SETTINGS };
  }
  const merged = { ...current, ...req.body };
  const [updated] = await db.update(siteSettingsTable)
    .set({ settings: JSON.stringify(merged), updatedAt: new Date() })
    .where(eq(siteSettingsTable.id, row.id))
    .returning();
  res.json({ settings: JSON.parse(updated!.settings), updatedAt: updated!.updatedAt });
});

export default router;
