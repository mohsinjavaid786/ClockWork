# Clockwork

A self-hosted employee time tracking system for small and medium teams. Built in the spirit of Hubstaff and Clockify — screenshot capture, activity monitoring, a rich admin dashboard, and a native desktop app — but fully under your control.

---

## Table of Contents

- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Running in Development](#running-in-development)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Security Model](#security-model)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Employee Machine                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Electron Desktop App                        │  │
│  │                                                              │  │
│  │  ┌─────────────┐   contextBridge   ┌──────────────────────┐ │  │
│  │  │  Renderer   │ ◄──────────────── │    Main Process      │ │  │
│  │  │  (React 18) │ ────────────────► │                      │ │  │
│  │  │             │    typed IPC      │  TimerService        │ │  │
│  │  │  LoginScreen│                   │  ScreenshotService   │ │  │
│  │  │  Tracker    │                   │  ActivityService     │ │  │
│  │  │  Screen     │                   │  System Tray         │ │  │
│  │  └─────────────┘                   │  electron-updater    │ │  │
│  │       preload/index.ts             └──────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │  HTTPS REST
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NestJS API  (apps/api)                         │
│                                                                     │
│  /api/v1 global prefix                                              │
│                                                                     │
│  AuthModule       UsersModule        ProjectsModule                 │
│  TimeEntriesModule  ScreenshotsModule  ReportsModule                │
│  WebhooksModule   ConfigModule                                      │
│                                                                     │
│  SupabaseAuthGuard (JWT)  RolesGuard  HttpExceptionFilter           │
│  Swagger at /api/docs    @nestjs/schedule daily cron                │
└────────────────────────────┬────────────────────────────────────────┘
                             │  Supabase JS v2 (service role key)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            Supabase                                 │
│                                                                     │
│  PostgreSQL + RLS policies    Auth (JWT)                            │
│  Storage bucket: screenshots  (private, signed URLs)                │
└─────────────────────────────────────────────────────────────────────┘
                             ▲
                             │  HTTPS REST
┌─────────────────────────────────────────────────────────────────────┐
│                  Next.js Admin Portal  (apps/admin)                 │
│                                                                     │
│  /login  /dashboard  /team  /team/[userId]                          │
│  /timesheets  /projects  /reports  /settings                        │
│                                                                     │
│  Geist font · black/white design system · Recharts                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow — Time Entry

```
Employee opens desktop app
  → Auto-login (token from safeStorage)
  → Selects project + optional description
  → Clicks "Start tracking"
      → IPC: TIMER_START
      → Main: POST /api/v1/time-entries/start → DB row (status='running')
      → Screenshot loop starts (configurable interval, default 10 min)
          → desktopCapturer.getSources({ types: ['screen'] })
          → sharp(png).blur(3).png() — Gaussian blur before leaving the machine
          → POST /api/v1/screenshots/upload (multipart + activityPercent)
          → Stored in Supabase Storage as {userId}/{timestamp}.png
  → Clicks "Stop tracking"
      → IPC: TIMER_STOP
      → Main: POST /api/v1/time-entries/:id/stop
      → duration_seconds computed server-side, status='stopped'
```

### Authentication Flow

```
Login (email + password)
  → POST /api/v1/auth/login
  → supabase.auth.signInWithPassword()
  → Load public.users row → check is_active, load role
  → Return { accessToken, user }
  → Desktop:    token stored via safeStorage.encryptString()
  → Admin portal: token stored in localStorage (cw_token)

Every protected request:
  → Authorization: Bearer <jwt>
  → SupabaseAuthGuard → supabase.auth.getUser(token)
  → Loads role from public.users → attaches to request.user
  → RolesGuard checks @Roles('admin') metadata if present
```

---

## Repository Structure

```
clockwork/
├── apps/
│   ├── api/                        # NestJS 10 backend
│   │   └── src/
│   │       ├── main.ts             # Bootstrap, Swagger, global pipes
│   │       ├── app.module.ts       # Root module, global APP_GUARD providers
│   │       ├── guards/             # SupabaseAuthGuard, RolesGuard
│   │       ├── decorators/         # @Public(), @Roles(), @CurrentUser()
│   │       ├── filters/            # HttpExceptionFilter
│   │       ├── supabase/           # Global SupabaseService (service role key)
│   │       └── modules/
│   │           ├── auth/
│   │           ├── users/
│   │           ├── projects/
│   │           ├── time-entries/
│   │           ├── screenshots/
│   │           ├── reports/
│   │           ├── webhooks/
│   │           └── config/
│   │
│   ├── admin/                      # Next.js 14 App Router
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx      # Geist font, globals.css
│   │       │   ├── page.tsx        # Redirect → /dashboard
│   │       │   ├── (auth)/         # login, access-denied (AuthProvider)
│   │       │   └── (dashboard)/    # Guarded layout + all pages
│   │       ├── components/         # StatCard, DataTable, Avatar, Modal, …
│   │       ├── context/            # AuthProvider, useAuth()
│   │       └── lib/
│   │           ├── api.ts          # Typed fetch wrapper
│   │           └── utils.ts        # cn(), formatDuration(), formatDate()
│   │
│   └── desktop/                    # Electron 30 + React 18 + Vite
│       └── src/
│           ├── main/
│           │   ├── index.ts        # BrowserWindow, IPC handlers, tray, updater
│           │   └── services/
│           │       ├── timer.service.ts      # safeStorage token/timer state
│           │       ├── screenshot.service.ts # desktopCapturer + sharp blur
│           │       └── activity.service.ts   # powerMonitor activity %
│           ├── preload/
│           │   └── index.ts        # contextBridge.exposeInMainWorld('clockwork', …)
│           └── renderer/
│               ├── App.tsx
│               ├── types.d.ts      # window.clockwork type declaration
│               └── screens/
│                   ├── LoginScreen.tsx
│                   └── TrackerScreen.tsx
│
├── packages/
│   └── shared/                     # @clockwork/shared — zero-dep types + IPC
│       └── src/
│           ├── index.ts
│           ├── types.ts            # User, Project, TimeEntry, Screenshot, …
│           └── ipc-channels.ts     # IPC constant map
│
├── supabase/
│   └── migrations/
│       ├── 001_initial.sql         # Tables, RLS, is_admin(), updated_at trigger
│       └── 002_storage.sql        # screenshots bucket policy
│
├── package.json                    # Root workspace scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── vercel.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces (Node ≥ 20) |
| Language | TypeScript 5 (strict, no `any`) |
| API | NestJS 10, class-validator, Swagger |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage (private bucket) |
| Admin portal | Next.js 14 App Router, Tailwind CSS, Geist font, Recharts |
| Desktop app | Electron 30, React 18, Vite 5 |
| Screenshot blur | sharp (Gaussian σ=3) |
| Activity tracking | powerMonitor (with `uiohook-napi` as optional enhancement) |
| Token encryption | electron.safeStorage (OS keychain) |
| Auto-updates | electron-updater (GitHub Releases) |
| Cron jobs | @nestjs/schedule |
| Design system | `#0A0A0A` base · `#111111` surface · `#2A2A2A` border · `#FFFFFF` accent |

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `npm install -g pnpm`
- A **Supabase project** (free tier works) — [supabase.com](https://supabase.com)
- macOS / Linux recommended for desktop packaging (Windows is also supported)

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
cp apps/desktop/.env.example apps/desktop/.env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env
# Fill in NEXT_PUBLIC_API_URL in apps/admin/.env.local

# 3. Run Supabase migrations
# Open your Supabase project → SQL Editor
# Paste and run: supabase/migrations/001_initial.sql
# Paste and run: supabase/migrations/002_storage.sql

# 4. Promote your first admin user (in Supabase SQL Editor)
#    First create a user via the Supabase Auth dashboard, then:
UPDATE public.users SET role = 'admin' WHERE email = 'you@example.com';

# 5. Start everything
pnpm dev:api      # NestJS API    → http://localhost:3001
pnpm dev:admin    # Next.js       → http://localhost:3000
pnpm dev:desktop  # Electron app  → opens window
```

---

## Environment Variables

### `apps/api/.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server-side only, never expose** |
| `PORT` | API listen port (default: `3001`) |
| `ADMIN_URL` | Allowed CORS origin (default: `http://localhost:3000`) |

### `apps/admin/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (default: `http://localhost:3001`) |

### `apps/desktop/.env`

| Variable | Description |
|---|---|
| `API_URL` | Backend API base URL (default: `http://localhost:3001`) |

---

## Supabase Setup

1. Create a new project at [app.supabase.com](https://app.supabase.com).
2. Go to **SQL Editor** and run the two migration files in order:
   - `supabase/migrations/001_initial.sql` — tables, RLS, helper functions
   - `supabase/migrations/002_storage.sql` — screenshots bucket
3. Under **Storage**, confirm the `screenshots` bucket is **private**.
4. Under **Authentication → Settings**, ensure email + password auth is enabled.
5. Copy **Project URL** and **service role key** from **Settings → API**.

---

## Running in Development

```bash
pnpm dev:api      # NestJS with ts-node watch on :3001
pnpm dev:admin    # Next.js dev server on :3000
pnpm dev:desktop  # Vite (renderer :5173) + Electron concurrently
```

Swagger UI: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

## Building for Production

```bash
# Build all apps in the correct dependency order
pnpm --filter @clockwork/shared build   # shared types first
pnpm --filter api build                 # nest build → dist/
pnpm --filter admin build               # next build → .next/
pnpm --filter desktop build             # vite + tsc → dist-renderer/ + dist-electron/

# Package Electron desktop installers
cd apps/desktop && pnpm package
# Output: apps/desktop/release/  (.dmg, .exe)
```

---

## Deployment

### Vercel (admin portal)

`vercel.json` at the repo root points Vercel at `apps/admin`. Set `NEXT_PUBLIC_API_URL` in the Vercel dashboard.

```bash
vercel --prod
```

### Railway / Fly.io (API)

Point at `apps/api`. Start command: `node dist/main.js`. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_URL`, `PORT`.

### Desktop — GitHub Releases (auto-update)

1. Bump version in `apps/desktop/package.json`
2. Tag: `git tag v1.x.x && git push --tags`
3. Build: `cd apps/desktop && pnpm package`
4. Upload `release/*.dmg`, `release/*.exe`, and `release/latest*.yml` to the GitHub Release

`electron-updater` checks on every launch and installs updates silently.

---

## Database Schema

```
auth.users  (Supabase-managed)
    │
    ▼
public.users
    id              UUID PK → auth.users(id)
    name            TEXT NOT NULL
    email           TEXT UNIQUE NOT NULL
    role            TEXT  CHECK ('admin' | 'member')  DEFAULT 'member'
    avatar_url      TEXT
    is_active       BOOLEAN  DEFAULT true
    timezone        TEXT     DEFAULT 'UTC'
    created_at      TIMESTAMPTZ  DEFAULT now()
    updated_at      TIMESTAMPTZ  (trigger-managed)

public.projects
    id              UUID PK DEFAULT gen_random_uuid()
    name            TEXT NOT NULL
    description     TEXT
    color           TEXT  DEFAULT '#6366f1'
    is_archived     BOOLEAN  DEFAULT false
    created_by      UUID → public.users(id)
    created_at      TIMESTAMPTZ  DEFAULT now()
    updated_at      TIMESTAMPTZ

public.time_entries
    id              UUID PK
    user_id         UUID → public.users(id)  ON DELETE CASCADE
    project_id      UUID → public.projects(id)  ON DELETE SET NULL
    description     TEXT
    started_at      TIMESTAMPTZ NOT NULL
    ended_at        TIMESTAMPTZ
    duration_seconds INTEGER
    status          TEXT  CHECK ('running' | 'stopped')  DEFAULT 'running'
    created_at      TIMESTAMPTZ

UNIQUE INDEX one_running_entry_per_user ON time_entries(user_id)
    WHERE (status = 'running')           -- enforces one timer per user at DB level

public.screenshots
    id              UUID PK
    user_id         UUID → public.users(id)  ON DELETE CASCADE
    time_entry_id   UUID → public.time_entries(id)  ON DELETE SET NULL
    storage_path    TEXT NOT NULL
    captured_at     TIMESTAMPTZ NOT NULL
    activity_percent INTEGER  CHECK (0 <= activity_percent AND activity_percent <= 100)
    created_at      TIMESTAMPTZ

public.app_config
    id                         INTEGER PK DEFAULT 1
    screenshot_interval_minutes INTEGER DEFAULT 10
    company_name               TEXT    DEFAULT 'Clockwork'
    timezone                   TEXT    DEFAULT 'UTC'
    slack_webhook_url          TEXT
    updated_at                 TIMESTAMPTZ
```

RLS is enabled on every table. The `is_admin()` helper (`SELECT role = 'admin' FROM public.users WHERE id = auth.uid()`) is used in all policies to give admins unrestricted access while members can only read/write their own rows.

---

## API Reference

Full interactive docs at `/api/docs` (Swagger UI). All endpoints share the `/api/v1` prefix.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, returns `{ accessToken, user }` |
| POST | `/auth/logout` | Bearer | Revoke session server-side |
| GET | `/auth/me` | Bearer | Get current user profile |
| GET | `/users` | Admin | All users with `weeklyHours` |
| GET | `/users/me` | Bearer | Own profile with recent entries |
| GET | `/users/:id` | Admin | User profile + stats + recent entries |
| POST | `/users/invite` | Admin | Create auth user + users row |
| PATCH | `/users/:id` | Admin | Update name, role, timezone, isActive |
| GET | `/projects` | Bearer | All projects with `totalHours` |
| GET | `/projects/:id` | Bearer | Project + total hours + member count |
| POST | `/projects` | Admin | Create project |
| PATCH | `/projects/:id` | Admin | Edit / archive |
| DELETE | `/projects/:id` | Admin | Delete |
| POST | `/time-entries/start` | Bearer | Start timer (one per user enforced by DB) |
| POST | `/time-entries/:id/stop` | Bearer | Stop running timer, compute duration |
| GET | `/time-entries` | Bearer | Paginated list with filters |
| GET | `/time-entries/active` | Admin | All currently running timers |
| DELETE | `/time-entries/:id` | Bearer | Delete entry (own) / Admin (any) |
| POST | `/screenshots/upload` | Bearer | Multipart upload (blurred client-side) |
| GET | `/screenshots` | Bearer | List with 1-hour signed URLs |
| GET | `/screenshots/:id/url` | Bearer | Signed URL for a single screenshot |
| GET | `/reports/stats` | Admin | Dashboard stats (today, week, active now) |
| GET | `/reports/weekly-chart` | Admin | Last 7 days hourly data for bar chart |
| GET | `/reports/csv` | Admin | Stream CSV download |
| GET | `/reports/pdf` | Admin | Download HTML report |
| GET | `/config` | Bearer | App configuration |
| PATCH | `/config` | Admin | Update configuration |
| POST | `/webhooks/slack/test` | Admin | Send test Slack message |

---

## Security Model

- **Service Role Key** lives only in `apps/api/.env`. It is never sent to a browser or the desktop renderer.
- The Electron renderer runs with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The only path to Node is the typed IPC bridge in `preload/index.ts` exposed as `window.clockwork`.
- Screenshots are stored in a **private** Supabase Storage bucket. The API generates 1-hour signed URLs; no file is ever publicly accessible.
- JWTs in the desktop app are encrypted with `electron.safeStorage` (macOS Keychain / Windows Credential Store). On platforms where encryption is unavailable, tokens live in process memory only.
- Deactivated users (`is_active = false`) are rejected at `SupabaseAuthGuard` even with a valid JWT.
- The database enforces one running timer per user via a partial unique index — no race condition is possible even with concurrent requests.

---

## Packages & Apps

| Package | README |
|---|---|
| `packages/shared` | [packages/shared/README.md](packages/shared/README.md) |
| `apps/api` | [apps/api/README.md](apps/api/README.md) |
| `apps/admin` | [apps/admin/README.md](apps/admin/README.md) |
| `apps/desktop` | [apps/desktop/README.md](apps/desktop/README.md) |
