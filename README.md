# TrackDesk

A full-stack, self-hosted employee time tracking system for teams of up to ~30 members. Built in the spirit of Hubstaff and Clockify — with screenshot capture, activity monitoring, and a rich admin dashboard — but fully under your control.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Running in Development](#running-in-development)
- [Running Tests](#running-tests)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Packages & Apps](#packages--apps)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [Security Notes](#security-notes)

---

## Overview

TrackDesk has three deployable units that share a single codebase via pnpm workspaces:

| Unit | What it is | Who uses it |
|---|---|---|
| `apps/api` | NestJS REST API + cron jobs | All clients |
| `apps/admin` | Next.js 14 web dashboard | Managers / admins |
| `apps/desktop` | Electron desktop app | Employees |

All three consume shared TypeScript types from `packages/shared`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Employee Machine                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Electron Desktop App                       │  │
│  │                                                              │  │
│  │  ┌─────────────┐   IPC (typed)   ┌──────────────────────┐  │  │
│  │  │  Renderer   │ ◄────────────── │    Main Process      │  │  │
│  │  │  (React 18) │ ──────────────► │                      │  │  │
│  │  │             │                 │  AuthService         │  │  │
│  │  │  LoginPage  │                 │  TimerService        │  │  │
│  │  │  TrackerPage│                 │  ScreenshotService   │  │  │
│  │  └─────────────┘                 │  ActivityService     │  │  │
│  │        ▲                         │  (uiohook-napi)      │  │  │
│  │   contextBridge                  │  System Tray         │  │  │
│  │   (preload.ts)                   │  electron-updater    │  │  │
│  └──────────────────────────────────┴──────────────────────┘  │  │
└─────────────────────────────────────────────────────────────────────┘
                              │  HTTPS REST
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          NestJS API (apps/api)                      │
│                                                                     │
│   AuthModule      UsersModule      TimeEntriesModule                │
│   ScreenshotsModule  ProjectsModule  ReportsModule                  │
│   WebhooksModule  ConfigModule                                      │
│                                                                     │
│   SupabaseAuthGuard (JWT)  RolesGuard  HttpExceptionFilter          │
│   Swagger docs at /api/docs                                         │
│   @nestjs/schedule cron jobs                                        │
└───────────────────────┬─────────────────────────────────────────────┘
                        │  Supabase JS v2
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Supabase                                  │
│                                                                     │
│   PostgreSQL DB      Auth (JWT)      Storage (screenshots bucket)  │
│   Row-Level Security on all tables                                  │
└─────────────────────────────────────────────────────────────────────┘
                        ▲
                        │  HTTPS
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js Admin Portal (apps/admin)                │
│                                                                     │
│   /login  /dashboard  /team  /team/[userId]                         │
│   /timesheets  /projects  /reports  /settings                       │
│                                                                     │
│   Tailwind CSS + shadcn-style components + Recharts                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow — Time Entry

```
Employee opens desktop app
  → Auto-login (token from safeStorage)
  → Selects project + description
  → Clicks Start
      → Main: POST /time-entries/start  →  DB row (is_running=true)
      → TimerService starts ticking, IPC tick events to renderer
      → ScreenshotService starts 10-min interval
          → desktopCapturer grabs primary display
          → sharp blurs image (Gaussian σ=3)
          → POST /screenshots/upload (multipart) with activityPercent
          → Stored in Supabase Storage as {userId}/{date}/{ts}.jpg
          → DB row inserted in screenshots table
          → Tray notification: "Screenshot captured"
  → Clicks Stop
      → Main: POST /time-entries/stop  →  DB row (ended_at, duration_seconds)
```

### Authentication Flow

```
Login (email + password)
  → POST /auth/login
  → Supabase Auth.signInWithPassword()
  → Check users table: is_active flag
  → Check role for admin portal (role must be 'admin')
  → Return JWT (Supabase-issued)
  → Desktop: stored in safeStorage (OS keychain encrypted)
  → Admin: stored in sessionStorage

All protected routes:
  → Bearer token → SupabaseAuthGuard → auth.getUser()
  → Roles check → RolesGuard (optional @Roles('admin'))
```

---

## Repository Structure

```
trackdesk/
├── apps/
│   ├── api/                    # NestJS backend
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── auth/
│   │       ├── users/
│   │       ├── time-entries/
│   │       ├── screenshots/
│   │       ├── projects/
│   │       ├── reports/
│   │       ├── webhooks/
│   │       ├── config/
│   │       └── common/
│   │           ├── guards/
│   │           ├── decorators/
│   │           ├── filters/
│   │           └── supabase/
│   │
│   ├── admin/                  # Next.js 14 App Router
│   │   └── src/
│   │       ├── app/
│   │       │   ├── login/
│   │       │   ├── dashboard/
│   │       │   ├── team/
│   │       │   │   └── [userId]/
│   │       │   ├── timesheets/
│   │       │   ├── projects/
│   │       │   ├── reports/
│   │       │   └── settings/
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   ├── charts/
│   │       │   └── ui/
│   │       └── lib/
│   │
│   └── desktop/                # Electron + React
│       └── src/
│           ├── main/
│           │   ├── main.ts
│           │   └── services/
│           │       ├── auth.service.ts
│           │       ├── timer.service.ts
│           │       ├── screenshot.service.ts
│           │       └── activity.service.ts
│           ├── preload/
│           │   └── preload.ts
│           └── renderer/
│               ├── App.tsx
│               └── pages/
│
├── packages/
│   └── shared/                 # Shared types, DTOs, IPC constants
│       └── src/
│           ├── interfaces.ts
│           ├── dtos.ts
│           └── constants.ts
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_storage_bucket.sql
│
├── package.json                # Root — workspace scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
└── vercel.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript 5 (strict mode, no `any`) |
| API | NestJS 10, class-validator, Swagger |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| Admin portal | Next.js 14 (App Router), Tailwind CSS, Recharts |
| Desktop app | Electron 30, React 18, Vite |
| Screenshot blur | sharp (Gaussian σ=3) |
| Activity tracking | uiohook-napi |
| Auto-update | electron-updater (GitHub Releases) |
| Cron jobs | @nestjs/schedule |
| CSV export | json2csv |
| PDF export | @react-pdf/renderer |
| Linting | ESLint + Prettier |
| Testing | Jest + ts-jest |

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — install with `npm install -g pnpm`
- A **Supabase project** (free tier works) — [supabase.com](https://supabase.com)
- (For desktop packaging) **Xcode Command Line Tools** on macOS, or **Visual Studio Build Tools** on Windows

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> trackdesk
cd trackdesk
pnpm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/desktop/.env.example apps/desktop/.env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc. in each .env file

# 3. Run Supabase migrations
#    Open your Supabase project → SQL Editor
#    Paste and run 001_initial_schema.sql, then 002_storage_bucket.sql

# 4. Create your first admin user
#    Sign up via Supabase Auth dashboard, then run:
#    UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';

# 5. Start everything
pnpm dev:api      # NestJS API  → http://localhost:3001
pnpm dev:admin    # Next.js     → http://localhost:3000
pnpm dev:desktop  # Electron    → opens window
```

---

## Environment Variables

### `apps/api/.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server-side only, never expose** |
| `SUPABASE_ANON_KEY` | Anon/public key |
| `STORAGE_BUCKET` | Storage bucket name (default: `screenshots`) |
| `PORT` | API listen port (default: `3001`) |
| `CORS_ORIGIN` | Allowed CORS origin (default: `*`) |
| `NODE_ENV` | `development` or `production` |

### `apps/admin/.env`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (exposed to browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (exposed to browser) |
| `API_URL` | Backend API base URL — server-side fetches |
| `NEXT_PUBLIC_API_URL` | Backend API base URL — client-side fetches |

### `apps/desktop/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anon key |

---

## Supabase Setup

1. Create a new project at [app.supabase.com](https://app.supabase.com).
2. Go to **SQL Editor** and run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_bucket.sql`
3. Under **Storage**, confirm the `screenshots` bucket exists and is set to **private**.
4. Under **Authentication → Settings**, ensure email + password auth is enabled.
5. Copy your **Project URL** and keys from **Settings → API**.
6. Promote your first user to admin:
   ```sql
   UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
   ```

---

## Running in Development

```bash
pnpm dev:api      # Starts NestJS API with hot reload on :3001
pnpm dev:admin    # Starts Next.js dev server on :3000
pnpm dev:desktop  # Starts Vite + Electron with hot reload
```

Swagger UI is available at [http://localhost:3001/api/docs](http://localhost:3001/api/docs).

---

## Running Tests

```bash
pnpm test                      # All workspaces
pnpm --filter api test         # API only
pnpm --filter api test:cov     # With coverage report
pnpm --filter api test:watch   # Watch mode
```

---

## Building for Production

```bash
# Build shared types first (other packages depend on it)
pnpm --filter @trackdesk/shared build

# Then build individual apps
pnpm build:api
pnpm build:admin

# Desktop: build renderer + main, then create OS installers
pnpm build:desktop
cd apps/desktop && pnpm package
# Output: apps/desktop/release/  (.dmg, .exe)
```

---

## Deployment

### Vercel (admin + API)

The root `vercel.json` configures routing: `/api/*` → NestJS serverless adapter, `/*` → Next.js.

```bash
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

### Railway (API alternative)

Point Railway at `apps/api`, set the start command to `node dist/main`, add environment variables.

### Desktop — GitHub Releases (auto-update)

1. Tag and push: `git tag v1.0.0 && git push --tags`
2. Build installers: `cd apps/desktop && pnpm package`
3. Upload `release/*.dmg`, `release/*.exe`, and `release/latest*.yml` to the GitHub Release.
4. `electron-updater` checks on every launch and installs silently.

---

## Packages & Apps

| Package | README |
|---|---|
| `packages/shared` | [packages/shared/README.md](packages/shared/README.md) |
| `apps/api` | [apps/api/README.md](apps/api/README.md) |
| `apps/admin` | [apps/admin/README.md](apps/admin/README.md) |
| `apps/desktop` | [apps/desktop/README.md](apps/desktop/README.md) |

---

## Database Schema

```
auth.users  (Supabase-managed)
    │
    ▼
public.users
    id             UUID PK → auth.users(id)
    name           TEXT
    email          TEXT UNIQUE
    role           TEXT  CHECK ('admin' | 'member')  DEFAULT 'member'
    avatar_url     TEXT
    is_active      BOOLEAN  DEFAULT true
    timezone       TEXT     DEFAULT 'UTC'
    created_at     TIMESTAMPTZ

public.projects
    id             UUID PK
    name           TEXT
    description    TEXT
    color          TEXT     DEFAULT '#6366f1'
    is_archived    BOOLEAN  DEFAULT false
    created_by     UUID → public.users(id)
    created_at     TIMESTAMPTZ

public.time_entries
    id               UUID PK
    user_id          UUID → public.users(id)  ON DELETE CASCADE
    project_id       UUID → public.projects(id)
    description      TEXT
    started_at       TIMESTAMPTZ
    ended_at         TIMESTAMPTZ
    duration_seconds INTEGER
    is_running       BOOLEAN  DEFAULT false
    created_at       TIMESTAMPTZ

public.screenshots
    id               UUID PK
    user_id          UUID → public.users(id)  ON DELETE CASCADE
    time_entry_id    UUID → public.time_entries(id)  ON DELETE SET NULL
    storage_path     TEXT
    captured_at      TIMESTAMPTZ
    activity_percent INTEGER  CHECK (0–100)
    created_at       TIMESTAMPTZ

public.app_config
    key              TEXT PK
    value            TEXT
    updated_at       TIMESTAMPTZ
```

RLS is enabled on every table. Members can read/write only their own rows. Admins have unrestricted access via the `is_admin()` helper function that checks `public.users.role`.

---

## API Overview

Full interactive docs at `/api/docs` (Swagger UI).

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/logout` | Bearer | Invalidate session |
| GET | `/users/me` | Bearer | Own profile |
| GET | `/users` | Admin | List all users with stats |
| GET | `/users/:id` | Bearer | User profile |
| POST | `/users/invite` | Admin | Invite new member via email |
| PATCH | `/users/:id` | Admin | Update role / active status |
| POST | `/time-entries/start` | Bearer | Open a new time entry |
| POST | `/time-entries/stop` | Bearer | Close the running entry |
| GET | `/time-entries` | Bearer | Paginated, filterable list |
| DELETE | `/time-entries/:id` | Admin | Remove an entry |
| POST | `/screenshots/upload` | Bearer | Upload blurred JPEG + metadata |
| GET | `/screenshots` | Bearer | List with signed URLs (1 h) |
| GET | `/screenshots/:id/full` | Admin | Full-res signed URL |
| GET | `/projects` | Bearer | List all projects |
| POST | `/projects` | Admin | Create project |
| PATCH | `/projects/:id` | Admin | Edit / archive |
| DELETE | `/projects/:id` | Admin | Delete |
| GET | `/projects/:id/stats` | Bearer | Hours, members, screenshots |
| GET | `/reports/export/csv` | Admin | Stream CSV download |
| GET | `/reports/export/pdf` | Admin | PDF summary data |
| GET | `/config` | Bearer | All config key/value pairs |
| PATCH | `/config` | Admin | Update config values |
| POST | `/webhooks/slack/test` | Admin | Send a test Slack message |

---

## Security Notes

- **Service Role Key** lives only in `apps/api/.env`. It is never sent to a browser or the desktop renderer.
- The Electron renderer runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. The only communication path to Node is the typed IPC bridge defined in `preload.ts` and exposed via `contextBridge`.
- Screenshots are in a **private** Supabase Storage bucket. The API generates signed URLs with a 1-hour expiry; no file is ever publicly accessible.
- JWTs on the desktop are encrypted with the OS keychain via `electron.safeStorage` — not plain text in localStorage.
- Deactivated users (`is_active = false`) are rejected at the `SupabaseAuthGuard` level, even with a valid JWT.
- Admin-only endpoints require both a valid JWT **and** `role = 'admin'` in the users table.
