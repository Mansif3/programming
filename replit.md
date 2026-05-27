# Programming Poth

A full-featured course learning platform inspired by Phitron, with a landing page, student dashboard, video lesson player, course catalog, bootcamps/events, community help desk, and user profile.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000/8080)
- `pnpm --filter @workspace/course-platform run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + Recharts + Shadcn UI + Tailwind
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/course-platform/src/pages/` — all page components (Landing, Courses, CourseDetail, Learn, Dashboard, Bootcamps, HelpDesk, Profile, Login, Register)
- `artifacts/course-platform/src/components/` — shared components (Navbar, Footer, plus shadcn ui/ and layout/)
- `artifacts/api-server/src/routes/` — API route handlers per domain
- `lib/db/src/schema/` — Drizzle ORM schema tables (source of truth for DB shape)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — auto-generated TanStack Query hooks + Zod schemas

## Architecture decisions

- Contract-first API: OpenAPI spec is written first, hooks/schemas are generated from it via Orval
- Default user ID is hardcoded as `1` (no auth implemented yet; all routes simulate a logged-in student)
- The electric blue theme (`--primary: 221 83% 53%`) is defined as CSS HSL vars in `index.css`, light mode by default
- Wouter is used instead of React Router for minimal bundle size; base path is `import.meta.env.BASE_URL`
- All API requests go through the shared reverse proxy at `/api`, never direct port calls

## Product

- **Landing page** — hero, stats counter, featured courses grid, instructor profiles, CTA
- **Course Catalog** — filterable/searchable course grid with category pills
- **Course Detail** — full syllabus accordion, enrollment CTA, instructor bio
- **Video Lesson Player** — sidebar module tree, progress tracking, lesson completion
- **Student Dashboard** — streak/stats cards, active course progress, weekly watch time bar chart, module calendar heatmap, announcements, support sessions
- **Bootcamps & Events** — card grid split by type, registration status button
- **Community Help Desk** — Facebook-style post feed with status badges, category sidebar, create-post box
- **User Profile** — left-nav sections, personal info form, device activity table
- **Login / Register** — clean auth forms (simulated, redirects to dashboard)

## User preferences

- Blue/electric theme with dark dashboard and light landing page
- Design inspired by Phitron (phitron.io)

## Gotchas

- Do NOT import from `"wouter/preact"` — always import hooks like `useState` from `"react"`
- `pnpm run build` needs workflow-provided `PORT` and `BASE_PATH`; use `typecheck` instead for verification from shell
- The shared proxy routes `/api` to the API server — never call port 8080 directly in app code
- Always run codegen after editing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
