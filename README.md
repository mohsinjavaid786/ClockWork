# Clockwork

> Self-hosted employee time tracking — screenshot capture, activity monitoring, admin dashboard, and native desktop app.
---

## Features

### Admin Portal
| Feature | Details |
|---|---|
| **Theme** | Light "Steep-inspired" editorial theme (fog canvas, white cards with 24px radius + soft shadow) plus a dark/light toggle in the top bar; tokens are CSS-variable driven (`:root` light + `.dark` on `<html>`), persisted to localStorage with a no-flash boot script. Fonts: Inter (UI), Newsreader (serif headings), Geist Mono (data). See `apps/admin/DESIGN.md` |
| **Dashboard** | Range-scoped KPI cards (Hours tracked, Active now, Sessions, Screenshots), a Mercury-style scrubbable/draggable timeline with a preset dropdown (7d / 30d / 3m / 6m / YTD / 12m), a bucketed hours bar chart, and a live "Tracking now" roster (click a member → detail page). Manual Refresh + 60s auto-refresh |
| **Work Diary** | Now a "Work diary" tab on the Team member detail page (`/team/[userId]`); Upwork-style activity view with per-day sessions and screenshot filmstrips. The standalone `/work-diary` route redirects to `/team` |
| **Timesheets** | Paginated table of all entries; click any row to open a floating detail drawer (rounded, inset, elevated) over a blurred backdrop — portaled to `<body>` with background scroll locked. Drawer shows duration stats, an activity timeline, and a paginated (10/page) + sortable screenshot grid (thumbnails only; thumbnails auto-generated). Click any screenshot to open the full viewer |
| **Screenshot Viewer** | Modal that loads thumbnail → full image with shimmer skeletons; zoom 100–400% (wheel / buttons / double-click) + drag-to-pan, prev/next navigation, per-minute activity table, and a filmstrip |
| **Status tags** | Colour-coded: active (green), paused (yellow), stopped (red), admin (blue), inactive (grey) |
| **Team** | Employees / Admins tabs; invite new members by email (Resend) — they get a secure set-your-password link + installer download links; pending / accepted invite status; optional temporary password; timezone; delete member (cascades entries + screenshots); per-member profile with Work diary tab |
| **Timezone** | Switcher in the top bar — My time / UTC / Employee's time |
| **Projects** | CRUD with hex color picker, total hours tracked per project, archive/unarchive |
| **Reports** | Date-range CSV export, printable HTML report download |
| **Settings** | Screenshot interval, company name, timezone, Slack webhook with test-send button |

### Desktop App
| Feature | Details |
|---|---|
| **Window** | Frameless window with a CLOCKWORK title text and macOS traffic-light padding |
| **Timer** | One-click start / **pause** / resume / stop; project + description selection; `HH:MM:SS` live counter. Paused time is excluded from tracked duration and recorded per entry. **Stop** halts locally instantly and syncs the server in the background — all desktop API requests are time-bounded via `AbortController` with retries |
| **Reconciliation** | On launch it reconciles against the server (`GET /time-entries/current`) to re-adopt an open entry, so the timer never gets stuck; requires a fresh login on version change and validates a stale token |
| **Screenshots** | `desktopCapturer` every N minutes (configurable); captures **every connected display** as a raw PNG **and** a small JPEG thumbnail (both uploaded) — no blur (Upwork-style). One upload per display per capture event, sharing `captured_at` |
| **Activity tracking** | Global keystroke + mouse counting (`uiohook-napi`) and foreground-window capture (`active-win`); per-minute keyboard/mouse breakdown + activity % uploaded with each screenshot. Requires macOS Accessibility + Screen Recording permission (auto-prompted; persists reliably only on a notarized build) |
| **Session storage** | Auth token + user + timer state persisted as version-stamped JSON in the per-user app-data directory (`app.getPath('userData')/session.json`), so the session survives restarts. (No OS keychain — an ad-hoc-signed app can't hold keychain access, so it would prompt endlessly) |
| **System tray** | Blinking green tray dot while tracking; context menu for show/hide and quit |
| **Auto-update** | `electron-updater` checks GitHub Releases on launch and installs silently. macOS builds are arm64-only |

### API
| Feature | Details |
|---|---|
| **Auth** | Supabase JWT validation on every request; `is_active` check; role-based guards (`admin` / `member`) |
| **One-timer constraint** | Partial unique index in PostgreSQL prevents two running entries per user — no race condition possible |
| **Screenshot upload** | Multipart endpoint; accepts one file per display with `screenNumber` + `displayCount`; server-side `sharp` thumbnail generation (`thumbnail_path`); stores to private Supabase Storage bucket; `GET` list [admin] returns 1-hour signed URLs (full + thumbnail); `POST backfill-thumbnails` [admin] regenerates missing thumbnails |
| **Time entries** | `start` / `stop` / `pause` / `resume`; `GET current` (caller's open entry); `GET active` [admin]; `POST :id/admin-stop` [admin] |
| **Reports** | `GET /reports/range?from&to&bucket=day\|week\|month` → `{ totalHours, activeNow, screenshots, entries, series[] }`; plus `stats`, `weekly-chart`, `csv`, and `pdf`/`html` exports |
| **Email** | Global email module — Resend wrapper for invites + password reset (`auth forgot-password`) |
| **Config** | `GET` (any authed user; Slack webhook hidden from non-admins) + `PATCH` [admin] of the `app_config` row |
| **Health** | Public `GET /api/v1/health` (used by the Docker healthcheck) |
| **Daily Slack cron** | `@nestjs/schedule` posts yesterday's team summary to Slack at 09:00 UTC |
| **Swagger docs** | Interactive docs at `/api/docs` |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Employee Machine                             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                  Electron Desktop App (Electron 30.x)          │  │
│  │                                                                │  │
│  │  ┌──────────────────┐  contextBridge  ┌────────────────────┐  │  │
│  │  │  Renderer        │◄───────────────►│  Main Process      │  │  │
│  │  │  React 19 + Vite │  window.clockwork│                    │  │  │
│  │  │                  │                 │  TimerService      │  │  │
│  │  │  LoginScreen     │                 │  ScreenshotService │  │  │
│  │  │  TrackerScreen   │                 │  ActivityService   │  │  │
│  │  │  (HH:MM:SS)      │                 │  System Tray       │  │  │
│  │  └──────────────────┘                 │  electron-updater  │  │  │
│  │    preload/index.ts                   └────────────────────┘  │  │
│  │    (sandbox: false,                       │ session.json        │  │
│  │     contextIsolation: true)               │ (userData dir)      │  │
│  └───────────────────────────────────────────┼─────────────────────┘  │
└─────────────────────────────────────────────│────────────────────────┘
                              HTTPS REST       │
                              POST /time-entries/start
                              POST /screenshots/upload
                                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    NestJS API  (apps/api)  :3001                     │
│                    Global prefix: /api/v1                            │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │ SupabaseAuth │  │  RolesGuard  │  │  HttpExceptionFilter       │ │
│  │ Guard (JWT)  │  │  @Roles()    │  │  { statusCode, error }     │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
│                                                                      │
│  AuthModule  UsersModule  ProjectsModule  TimeEntriesModule          │
│  ScreenshotsModule  ReportsModule  WebhooksModule  ConfigModule      │
│  EmailModule (Resend, global)  HealthModule (public /health)        │
│                                                                      │
│  @nestjs/schedule ──► dailySummary() @ 09:00 UTC ──► Slack          │
│  Swagger UI at /api/docs                                             │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │ Supabase JS v2 (service role key)
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           Supabase                                   │
│                                                                      │
│  PostgreSQL + RLS policies      Auth (JWT issuer)                   │
│  Storage: screenshots bucket    is_admin() helper function           │
│           installers bucket     (public — hosts desktop installers)  │
│  Partial unique index: one running timer per user                    │
└──────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ REST (NEXT_PUBLIC_API_URL)
┌──────────────────────────────────────────────────────────────────────┐
│               Next.js Admin Portal (apps/admin)  :3000              │
│                                                                      │
│  /login  /dashboard  /team  /team/[userId] (Work diary tab)         │
│  /timesheets  /projects  /reports  /settings                        │
│  (/work-diary → redirects to /team)                                 │
│                                                                      │
│  Light "Steep" theme + dark/light toggle (CSS variables)           │
│  Inter / Newsreader / Geist Mono · Tailwind CSS · Recharts         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Flows

### Time Entry Lifecycle

```
Employee                  Desktop App              API                   Database
   │                          │                     │                       │
   │  Click "Start"           │                     │                       │
   │─────────────────────────►│                     │                       │
   │                          │  IPC: TIMER_START   │                       │
   │                          │  POST /time-entries/start                   │
   │                          │────────────────────►│                       │
   │                          │                     │  INSERT time_entries  │
   │                          │                     │  status='running'     │
   │                          │                     │──────────────────────►│
   │                          │  { entryId }        │                       │
   │                          │◄────────────────────│                       │
   │  HH:MM:SS ticking        │                     │                       │
   │◄─────────────────────────│                     │                       │
   │                          │                     │                       │
   │  [Every 10 min]          │                     │                       │
   │                          │  desktopCapturer    │                       │
   │                          │  → ALL displays     │                       │
   │                          │  (raw PNG + JPEG    │                       │
   │                          │   thumbnail, no blur)│                      │
   │                          │  for each screen:   │                       │
   │                          │    POST /screenshots/upload                 │
   │                          │    { file, thumb, screenNumber, displayCount }│
   │                          │────────────────────►│                       │
   │                          │                     │  → Supabase Storage   │
   │                          │                     │  INSERT screenshots   │
   │                          │                     │  (one row per screen) │
   │                          │                     │──────────────────────►│
   │                          │                     │                       │
   │  Click "Stop"            │                     │                       │
   │─────────────────────────►│                     │                       │
   │                          │  POST /time-entries/:id/stop                │
   │                          │────────────────────►│                       │
   │                          │                     │  UPDATE time_entries  │
   │                          │                     │  status='stopped'     │
   │                          │                     │  duration_seconds=…   │
   │                          │                     │──────────────────────►│
```

### Authentication Flow

```
Client (Desktop or Admin)          API                      Supabase
         │                           │                          │
         │  POST /auth/login         │                          │
         │  { email, password }      │                          │
         │──────────────────────────►│                          │
         │                           │  signInWithPassword()   │
         │                           │─────────────────────────►│
         │                           │  { user, session }      │
         │                           │◄─────────────────────────│
         │                           │  SELECT role, is_active  │
         │                           │  FROM public.users       │
         │                           │─────────────────────────►│
         │                           │  { role, is_active }    │
         │                           │◄─────────────────────────│
         │  { accessToken, user }    │                          │
         │◄──────────────────────────│                          │
         │                           │                          │
         │  [Subsequent requests]    │                          │
         │  Authorization: Bearer …  │                          │
         │──────────────────────────►│                          │
         │                           │  auth.getUser(token)    │
         │                           │─────────────────────────►│
         │                           │  { id, email }          │
         │                           │◄─────────────────────────│
         │                           │  SupabaseAuthGuard ✓    │
         │                           │  RolesGuard ✓           │
         │  200 { data }             │                          │
         │◄──────────────────────────│                          │
```

### Work Diary — Screenshot Detail Flow (Admin Portal)

```
Admin             Team Member ▸ Work diary tab     Day Panel          Screenshot Modal
  │                        │                        │                     │
  │  Open /team/[userId]   │                        │                     │
  │  → Work diary tab      │                        │                     │
  │───────────────────────►│                        │                     │
  │  [Calendar + Bar chart]│                        │                     │
  │◄───────────────────────│                        │                     │
  │                        │                        │                     │
  │  Click day bar         │                        │                     │
  │───────────────────────►│                        │                     │
  │                        │  Fetch entries for day │                     │
  │                        │───────────────────────►│                     │
  │                        │  [Sessions + filmstrips│                     │
  │                        │   with screenshot tiles│                     │
  │                        │   activity % bars]     │                     │
  │                        │◄───────────────────────│                     │
  │                        │                        │                     │
  │  Click screenshot tile │                        │                     │
  │───────────────────────────────────────────────►│                     │
  │                        │                        │  Open modal         │
  │                        │                        │────────────────────►│
  │                        │                        │  [Large screenshot  │
  │                        │                        │   Active window     │
  │                        │                        │   Activity level    │
  │                        │                        │   Per-min table]    │
  │  ← → keyboard nav      │                        │                     │
  │────────────────────────────────────────────────────────────────────►│
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────┐
│  auth.users  (Supabase-managed)                                         │
│  id · email · created_at                                                │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │ FK (ON DELETE CASCADE)
                            ▼
┌───────────────────────────────────────────┐
│  public.users                             │
│  id           UUID PK                     │
│  name         TEXT                        │
│  email        TEXT UNIQUE                 │
│  role         'admin' | 'member'          │
│  is_active    BOOLEAN DEFAULT true        │
│  timezone     TEXT    DEFAULT 'UTC'       │
│  avatar_url   TEXT                        │
│  created_at   TIMESTAMPTZ                 │
│  updated_at   TIMESTAMPTZ (trigger)       │
└──────┬──────────────────────┬─────────────┘
       │                      │
       │ created_by           │ user_id
       ▼                      ▼
┌────────────────┐   ┌────────────────────────────────────────┐
│  projects      │   │  time_entries                          │
│  id  UUID PK   │   │  id             UUID PK                │
│  name TEXT     │◄──│  user_id        UUID FK → users        │
│  description   │   │  project_id     UUID FK → projects     │
│  color TEXT    │   │  description    TEXT                   │
│  is_archived   │   │  started_at     TIMESTAMPTZ            │
│  created_by FK │   │  ended_at       TIMESTAMPTZ            │
│  created_at    │   │  duration_seconds INTEGER              │
│  updated_at    │   │  paused_seconds INTEGER                │
└────────────────┘   │  pauses         JSONB                  │
                     │  status   'running'|'paused'|'stopped' │
                     │  created_at     TIMESTAMPTZ            │
                     └──────────────┬─────────────────────────┘
                                    │
                    UNIQUE INDEX one_running_entry_per_user
                    WHERE (status = 'running')  ← DB-level constraint
                                    │ time_entry_id
                                    ▼
                     ┌─────────────────────────────────────────┐
                     │  screenshots                            │
                     │  id               UUID PK              │
                     │  user_id          UUID FK → users      │
                     │  time_entry_id    UUID FK (nullable)   │
                     │  storage_path     TEXT                 │
                     │  thumbnail_path   TEXT (nullable)      │  ← small JPEG thumb
                     │  captured_at      TIMESTAMPTZ          │
                     │  activity_percent INTEGER (0–100)      │
                     │  key_count        INTEGER              │
                     │  mouse_count      INTEGER              │
                     │  active_window    TEXT                 │
                     │  minute_activity  JSONB                │  ← per-minute breakdown
                     │  screen_number    INTEGER ≥ 1          │  ← 1-based display index
                     │  display_count    INTEGER ≥ 1          │  ← total displays this capture
                     │  created_at       TIMESTAMPTZ          │
                     └─────────────────────────────────────────┘
                     Multi-monitor: rows sharing (user_id, captured_at)
                     belong to the same capture event.

┌──────────────────────────────────────┐
│  app_config  (single row, id = 1)   │
│  screenshot_interval_minutes  INT   │
│  company_name                 TEXT  │
│  timezone                     TEXT  │
│  slack_webhook_url            TEXT  │
│  updated_at                   TIMESTAMPTZ │
└──────────────────────────────────────┘

RLS: is_admin() helper → SELECT role = 'admin' FROM users WHERE id = auth.uid()
     Members can only read/write their own rows.
     Admins have unrestricted access.
```

---

## Repository Structure

```
clockwork/
├── apps/
│   ├── api/                         # NestJS 11 REST API
│   │   └── src/
│   │       ├── main.ts              # Bootstrap, /api/v1 prefix, Swagger
│   │       ├── app.module.ts        # APP_GUARD providers (auth + roles)
│   │       ├── guards/              # SupabaseAuthGuard, RolesGuard
│   │       ├── decorators/          # @Public(), @Roles(), @CurrentUser()
│   │       ├── filters/             # HttpExceptionFilter
│   │       ├── supabase/            # Global SupabaseService (service role)
│   │       └── modules/
│   │           ├── auth/            # login, logout, /me, forgot-password
│   │           ├── users/           # list+weeklyHours, invite, patch, delete
│   │           ├── projects/        # CRUD + totalHours
│   │           ├── time-entries/    # start/stop/pause/resume, current, active, admin-stop
│   │           ├── screenshots/     # multipart upload + sharp thumbnails, list+signed URLs, backfill
│   │           ├── reports/         # stats, weekly-chart, range, CSV, PDF/HTML
│   │           ├── webhooks/        # Slack test + daily cron
│   │           ├── config/          # get/patch app_config row
│   │           ├── email/           # global Resend wrapper (invites + reset)
│   │           └── health/          # public GET /health (Docker healthcheck)
│   │
│   ├── admin/                       # Next.js 15 App Router
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/          # login, forgot/reset-password, access-denied
│   │       │   └── (dashboard)/     # guarded layout + all pages
│   │       │       ├── dashboard/   # KPI cards + timeline + chart + live roster
│   │       │       ├── work-diary/  # redirects → /team
│   │       │       ├── timesheets/  # paginated entries + floating detail drawer
│   │       │       ├── team/        # list + [userId] profile (Work diary tab)
│   │       │       ├── projects/    # CRUD
│   │       │       ├── reports/     # export
│   │       │       └── settings/    # config form
│   │       ├── components/
│   │       │   ├── EntryDetailPanel.tsx   # timesheets floating drawer
│   │       │   ├── DayDetailPanel.tsx     # work diary day sessions
│   │       │   ├── WorkDiary.tsx          # per-member work diary view
│   │       │   ├── DashboardTimeline.tsx  # Mercury-style scrubbable timeline
│   │       │   ├── ScreenshotModal.tsx    # full viewer + zoom/pan + activity
│   │       │   ├── SidebarLayout.tsx      # fixed left nav
│   │       │   ├── ThemeToggle.tsx        # dark/light toggle (top bar)
│   │       │   ├── TimezoneSelect.tsx     # My time / UTC / Employee's time
│   │       │   ├── DataTable.tsx          # generic typed table
│   │       │   ├── StatCard.tsx           # KPI card
│   │       │   ├── Avatar.tsx             # initials avatar
│   │       │   ├── StatusBadge.tsx        # colour-coded role/status pill
│   │       │   ├── Modal.tsx              # generic overlay
│   │       │   ├── PageHeader.tsx         # title + action slot
│   │       │   ├── EmptyState.tsx
│   │       │   └── LoadingSpinner.tsx
│   │       ├── context/
│   │       │   └── auth-context.tsx       # AuthProvider + useAuth()
│   │       └── lib/
│   │           ├── api.ts                 # typed fetch wrapper (raw→camelCase mappers)
│   │           ├── types.ts               # Screenshot / MinuteActivity / DayMeta types
│   │           └── utils.ts              # cn(), formatDuration(), etc.
│   │
│   └── desktop/                     # Electron 30 + React 19 + Vite
│       └── src/
│           ├── main/
│           │   ├── index.ts         # BrowserWindow, IPC, tray, updater
│           │   ├── config.ts        # single source of truth for API_BASE
│           │   ├── tray.ts          # system tray
│           │   └── services/
│           │       ├── timer.service.ts      # session.json persistence (token/user/timer)
│           │       ├── screenshot.service.ts # capture every display + upload (no blur)
│           │       └── activity.service.ts   # uiohook-napi keys/mouse + active-win window
│           ├── preload/
│           │   └── index.ts         # contextBridge → window.clockwork
│           └── renderer/
│               ├── App.tsx          # auto-login gate
│               ├── types.d.ts       # window.clockwork type declaration
│               └── screens/
│                   ├── LoginScreen.tsx
│                   └── TrackerScreen.tsx
│
├── packages/
│   └── shared/                      # @clockwork/shared
│       └── src/
│           ├── types.ts             # domain interfaces
│           └── ipc-channels.ts      # IPC constant map
│
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql          # tables, RLS, helpers, seed
│       ├── 002_storage.sql          # screenshots bucket policy
│       ├── 003_multi_screen.sql     # screen_number + display_count
│       ├── 004_activity_detail.sql  # key/mouse counts, active window, per-minute
│       ├── 005_pause_tracking.sql   # paused status + paused_seconds + pauses
│       ├── 006_installers_bucket.sql # public bucket hosting the installers
│       └── 007_screenshot_thumbnails.sql # thumbnail_path on screenshots
│
├── package.json                     # root workspace scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── vercel.json
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Monorepo | pnpm workspaces | Node ≥ 20 |
| Language | TypeScript 5 strict | No `any`, no placeholder types |
| API framework | NestJS 11 + Express | Global prefix `/api/v1` |
| Database | Supabase PostgreSQL | RLS on all tables |
| Auth | Supabase Auth JWT | Validated server-side on every request |
| Storage | Supabase Storage | Private bucket, signed URLs |
| Admin portal | Next.js 15 App Router | Tailwind CSS v3, Inter / Newsreader / Geist Mono, Recharts 3 |
| Desktop shell | Electron 30 | `contextIsolation`, `nodeIntegration: false`; `sandbox: false` so the preload can require `@clockwork/shared` |
| Renderer build | Vite 5 + React 19 | HMR in dev mode; `base: './'` for relative asset paths under `file://` |
| Screenshot capture | electron `desktopCapturer` + `screen.getAllDisplays()` | Raw PNG per display, no post-processing (Upwork-style) |
| Activity tracking | `uiohook-napi` + `active-win` + powerMonitor | Global key/mouse counts, foreground window, suspend reset |
| Session storage | plain JSON in `userData` | `session.json` (token/user/timer); no OS keychain — keeps ad-hoc builds prompt-free |
| Auto-updates | electron-updater | GitHub Releases |
| Cron | @nestjs/schedule | Daily Slack summary at 09:00 UTC |
| Design tokens | CSS variables (light + dark) | `:root` light "Steep" theme + `.dark` override on `<html>`; channel-triplet colours via `rgb(var(--x) / <alpha>)`; see `apps/admin/DESIGN.md` |

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `npm install -g pnpm`
- A **Supabase project** — [supabase.com](https://supabase.com) (free tier works)
- macOS recommended for desktop packaging (Windows also supported)

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/mohsinjavaid786/clockwork.git
cd clockwork
pnpm install

# 2. Configure environment
cp apps/api/.env.example    apps/api/.env
cp apps/admin/.env.example  apps/admin/.env.local
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env

# 3. Run Supabase migrations (SQL Editor in Supabase dashboard), in order:
#    001_initial.sql  002_storage.sql  003_multi_screen.sql
#    004_activity_detail.sql  005_pause_tracking.sql  006_installers_bucket.sql
#    007_screenshot_thumbnails.sql

# 4. Promote your first admin (Supabase SQL Editor)
UPDATE public.users SET role = 'admin' WHERE email = 'you@example.com';

# 5. Start
pnpm dev:api      # → http://localhost:3001  (Swagger: /api/docs)
pnpm dev:admin    # → http://localhost:3000
pnpm dev:desktop  # → Electron window
```

---

## Environment Variables

### `apps/api/.env`
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only
PORT=3001
ADMIN_URL=http://localhost:3000                    # CORS origin
```

### `apps/admin/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### `apps/desktop/.env`
```env
API_URL=http://localhost:3001
```
> The desktop API URL is resolved dynamically (`apps/desktop/src/main/config.ts`),
> never hardcoded: `API_URL` env var in dev → value injected into the packaged
> `package.json` at build time via electron-builder `extraMetadata` → localhost
> default. For releases, set a GitHub **repository variable** `API_URL` (Settings
> → Secrets and variables → Actions → Variables); the release workflow bakes it in.

---

## Building for Production

```bash
pnpm --filter @clockwork/shared build  # shared types (other apps depend on this)
pnpm --filter api build                # nest build → dist/
pnpm --filter admin build              # next build → .next/
pnpm --filter desktop build            # vite + tsc → dist-renderer/ + dist-electron/
cd apps/desktop && pnpm package        # create .dmg / .exe → release/
```

---

## Deployment

| Target | How |
|---|---|
| **Admin portal** | `vercel --prod` — `vercel.json` at repo root points at `apps/admin` |
| **API** | Railway / Fly.io — start command: `node dist/main.js` |
| **Desktop updates** | Tag `v1.x.x`, run `pnpm package`, upload `release/*` to GitHub Release |

---

## Security Notes

- Service role key lives only in `apps/api/.env` — never sent to browser or renderer; no secrets are committed (`.env` is git-ignored, only `.env.example` placeholders are tracked)
- API URLs are configured dynamically (env var / build-time injection / Vercel env), never hardcoded in source
- Electron renderer: `contextIsolation: true`, `nodeIntegration: false`. `sandbox: false` is required so the preload can require `@clockwork/shared`; the renderer still has no Node access and reaches main only through the contextBridge
- Screenshots stored in **private** bucket — admin portal receives 1-hour signed URLs; captures are raw (no blur) so managers can verify actual work, identical to Upwork's tracker
- Desktop session (`session.json`) is stored in the OS-protected per-user app-data directory — no OS keychain dependency
- Deactivated users (`is_active = false`) rejected at the auth guard even with valid JWT
- One-running-timer constraint enforced at DB level via partial unique index

---

## User Guides

| Guide | Audience | Contents |
|---|---|---|
| [Employee Guide](docs/EMPLOYEE_GUIDE.md) | Employees using the desktop app | Install, login, start/stop timer, screenshots, tray icon, FAQ |
| [Admin Guide](docs/ADMIN_GUIDE.md) | Managers using the web portal | Dashboard, Work Diary, Timesheets, Team, Projects, Reports, Settings, common tasks |
| [Deployment Guide](docs/DEPLOYMENT.md) | Project owner / DevOps | API on Railway, portal on Vercel, desktop via GitHub Releases, CI/CD, code signing |

---

## Packages & Apps

| Package | README |
|---|---|
| `packages/shared` | [packages/shared/README.md](packages/shared/README.md) |
| `apps/api` | [apps/api/README.md](apps/api/README.md) |
| `apps/admin` | [apps/admin/README.md](apps/admin/README.md) |
| `apps/desktop` | [apps/desktop/README.md](apps/desktop/README.md) |
