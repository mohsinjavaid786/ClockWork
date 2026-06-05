# Clockwork

> Self-hosted employee time tracking — screenshot capture, activity monitoring, admin dashboard, and native desktop app.
---

## Features

### Admin Portal
| Feature | Details |
|---|---|
| **Dashboard** | Live stats (today's hours, active members, weekly total, screenshots), 7-day bar chart, real-time active members panel with elapsed timers |
| **Work Diary** | Upwork-style monthly calendar with activity dots, horizontal weekly bar chart (green = regular, red = overtime), member picker, click any day to drill into sessions |
| **Day Detail** | Slide-in panel showing every session for a day; each session has a scrollable screenshot filmstrip with per-screenshot activity bars |
| **Timesheets** | Paginated table of all entries; click any row to open a detail panel showing duration stats, keystroke + mouse totals, activity timeline, and a 3-column screenshot grid |
| **Screenshot Modal** | Full-screen screenshot viewer with active window name, 10-block activity level indicator, per-minute keyboard/mouse breakdown table, prev/next navigation (keyboard arrows supported) |
| **Team** | Member list with weekly hours; invite new members with temporary passwords; per-member profile page with recent activity |
| **Projects** | CRUD with hex color picker, total hours tracked per project, archive/unarchive |
| **Reports** | Date-range CSV export, printable HTML report download |
| **Settings** | Screenshot interval, company name, timezone, Slack webhook with test-send button |
| **Demo mode** | Full working demo with `demo@clockwork.app / demo1234` — no backend required; 6 members, 5 projects, 35 time entries, mock screenshots |

### Desktop App
| Feature | Details |
|---|---|
| **Timer** | One-click start/stop; project + description selection; `HH:MM:SS` live counter |
| **Screenshots** | `desktopCapturer` every N minutes (configurable); Gaussian blur σ=3 via `sharp` applied **before** upload — raw screen never leaves the machine |
| **Activity tracking** | `powerMonitor` idle detection; activity % computed per screenshot window and uploaded with each capture |
| **Secure storage** | JWT encrypted via `electron.safeStorage` (macOS Keychain / Windows Credential Store) |
| **System tray** | Tray icon updates to show tracking state; context menu for show/hide and quit |
| **Auto-update** | `electron-updater` checks GitHub Releases on launch and installs silently |

### API
| Feature | Details |
|---|---|
| **Auth** | Supabase JWT validation on every request; `is_active` check; role-based guards (`admin` / `member`) |
| **One-timer constraint** | Partial unique index in PostgreSQL prevents two running entries per user — no race condition possible |
| **Screenshot upload** | Multipart endpoint; stores to private Supabase Storage bucket; generates 1-hour signed URLs on read |
| **Dashboard stats** | Aggregated today/week/active-now counts computed server-side |
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
│  │    (sandbox: true,                        │ safeStorage         │  │
│  │     contextIsolation: true)               │ (OS keychain)       │  │
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
│  Partial unique index: one running timer per user                    │
└──────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ REST (NEXT_PUBLIC_API_URL)
┌──────────────────────────────────────────────────────────────────────┐
│               Next.js Admin Portal (apps/admin)  :3000              │
│                                                                      │
│  /login  /dashboard  /work-diary  /team  /team/[userId]             │
│  /timesheets  /projects  /reports  /settings                        │
│                                                                      │
│  Geist font · #0A0A0A base · Tailwind CSS · Recharts                │
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
   │                          │  → sharp blur σ=3   │                       │
   │                          │  POST /screenshots/upload                   │
   │                          │────────────────────►│                       │
   │                          │                     │  → Supabase Storage   │
   │                          │                     │  INSERT screenshots   │
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
Admin                 Work Diary Page           Day Panel          Screenshot Modal
  │                        │                        │                     │
  │  Open /work-diary      │                        │                     │
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
│  updated_at    │   │  status         'running' | 'stopped'  │
└────────────────┘   │  created_at     TIMESTAMPTZ            │
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
                     │  captured_at      TIMESTAMPTZ          │
                     │  activity_percent INTEGER (0–100)      │
                     │  created_at       TIMESTAMPTZ          │
                     └─────────────────────────────────────────┘

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
│   │           ├── auth/            # login, logout, /me
│   │           ├── users/           # list+weeklyHours, invite, patch
│   │           ├── projects/        # CRUD + totalHours
│   │           ├── time-entries/    # start, stop, list, active, delete
│   │           ├── screenshots/     # multipart upload, list+signed URLs
│   │           ├── reports/         # stats, weekly-chart, CSV, HTML
│   │           ├── webhooks/        # Slack test + daily cron
│   │           └── config/          # get/patch app_config row
│   │
│   ├── admin/                       # Next.js 15 App Router
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/          # login, access-denied (AuthProvider)
│   │       │   └── (dashboard)/     # guarded layout + all pages
│   │       │       ├── dashboard/   # stats + chart + active members
│   │       │       ├── work-diary/  # calendar + weekly bars + day detail
│   │       │       ├── timesheets/  # paginated entries + detail panel
│   │       │       ├── team/        # member list + [userId] profile
│   │       │       ├── projects/    # CRUD
│   │       │       ├── reports/     # export
│   │       │       └── settings/    # config form
│   │       ├── components/
│   │       │   ├── EntryDetailPanel.tsx   # timesheets slide-in panel
│   │       │   ├── DayDetailPanel.tsx     # work diary day sessions
│   │       │   ├── ScreenshotModal.tsx    # full-screen screenshot + activity
│   │       │   ├── SidebarLayout.tsx      # fixed left nav
│   │       │   ├── DataTable.tsx          # generic typed table
│   │       │   ├── StatCard.tsx           # KPI card
│   │       │   ├── Avatar.tsx             # initials avatar
│   │       │   ├── StatusBadge.tsx        # role/status pill
│   │       │   ├── Modal.tsx              # generic overlay
│   │       │   ├── PageHeader.tsx         # title + action slot
│   │       │   ├── EmptyState.tsx
│   │       │   └── LoadingSpinner.tsx
│   │       ├── context/
│   │       │   └── auth-context.tsx       # AuthProvider + useAuth()
│   │       └── lib/
│   │           ├── api.ts                 # fetch wrapper + demo intercept
│   │           ├── mock-data.ts           # demo mode data + helpers
│   │           └── utils.ts              # cn(), formatDuration(), etc.
│   │
│   └── desktop/                     # Electron 30 + React 19 + Vite
│       └── src/
│           ├── main/
│           │   ├── index.ts         # BrowserWindow, IPC, tray, updater
│           │   ├── tray.ts          # system tray
│           │   └── services/
│           │       ├── timer.service.ts      # safeStorage token/state
│           │       ├── screenshot.service.ts # capture + blur + upload
│           │       └── activity.service.ts   # powerMonitor activity %
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
│       └── 002_storage.sql          # screenshots bucket policy
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
| Admin portal | Next.js 15 App Router | Tailwind CSS, Geist font, Recharts 3 |
| Desktop shell | Electron 30 | `contextIsolation`, `sandbox`, no `nodeIntegration` |
| Renderer build | Vite 5 + React 19 | HMR in dev mode |
| Screenshot blur | sharp (native) | Gaussian σ=3 before upload |
| Activity tracking | powerMonitor | OS idle detection |
| Token encryption | electron.safeStorage | macOS Keychain / Windows Credential Store |
| Auto-updates | electron-updater | GitHub Releases |
| Cron | @nestjs/schedule | Daily Slack summary at 09:00 UTC |
| Design tokens | CSS variables | `#0A0A0A` base · `#2A2A2A` border · `#FFFFFF` accent |

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

# 3. Run Supabase migrations (SQL Editor in Supabase dashboard)
#    supabase/migrations/001_initial.sql
#    supabase/migrations/002_storage.sql

# 4. Promote your first admin (Supabase SQL Editor)
UPDATE public.users SET role = 'admin' WHERE email = 'you@example.com';

# 5. Start
pnpm dev:api      # → http://localhost:3001  (Swagger: /api/docs)
pnpm dev:admin    # → http://localhost:3000
pnpm dev:desktop  # → Electron window
```

### Try without a backend (demo mode)

```
URL:      http://localhost:3000
Email:    demo@clockwork.app
Password: demo1234
```

Click **"Use demo"** on the login page to auto-fill. All API calls return rich mock data — no Supabase account needed.

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

- Service role key lives only in `apps/api/.env` — never sent to browser or renderer
- Electron renderer: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Screenshots stored in **private** bucket — admin portal receives 1-hour signed URLs
- Desktop JWT encrypted with OS keychain via `safeStorage`
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
