# apps/api — Clockwork NestJS Backend

> REST API powering the admin portal and desktop app. NestJS 11, Supabase PostgreSQL, global `/api/v1` prefix, Swagger at `/api/docs`.

---

## Features

| Feature | Details |
|---|---|
| **JWT auth** | Every protected request validated against Supabase Auth; no local JWT decoding. Service-role Supabase client bypasses RLS, so the API guards are the protection layer |
| **Role-based access** | `@Roles('admin')` decorator — admins get full access, members get own-data only |
| **One-timer constraint** | PostgreSQL partial unique index prevents two `running` entries per user at the DB level |
| **Pause / resume** | Timers can be paused (entry stays open) and resumed; `paused_seconds` is excluded from `duration_seconds` and each interval is recorded in `pauses` (jsonb) |
| **Screenshot upload** | Multipart endpoint; raw image stored to a private Supabase Storage bucket (no blur — Upwork-style). One upload per display per capture event with `screenNumber` + `displayCount`. A JPEG thumbnail is stored alongside (client-provided, or generated server-side with `sharp`); signed URLs generated on read (1-hour expiry) |
| **Activity detail** | Each screenshot carries `key_count`, `mouse_count`, `active_window`, and a per-minute `minute_activity` (jsonb) breakdown |
| **Email (Resend)** | Global `EmailService` wraps Resend for team-invite and password-reset emails; falls back to logging when `RESEND_API_KEY` is unset |
| **Dashboard stats** | `GET /reports/stats` — today's hours, active-now count, weekly hours, week-over-week change (folds in live time from open entries) |
| **Range report** | `GET /reports/range` — `[from, to]` window bucketed by day/week/month, including live time from open entries |
| **Weekly chart** | `GET /reports/weekly-chart` — last 7 days hourly data for bar chart rendering |
| **CSV export** | `GET /reports/csv` — streams `text/csv` with all time entries |
| **HTML report** | `GET /reports/pdf` — printable HTML report download |
| **Daily Slack cron** | `@nestjs/schedule` posts yesterday's summary at 09:00 (`CronExpression.EVERY_DAY_AT_9AM`) |
| **Swagger docs** | Full interactive API docs at `/api/docs` with bearer auth |
| **Active members** | `GET /time-entries/active` — all currently running timers with elapsed seconds |
| **Health check** | `GET /api/v1/health` (public) — used by the Docker healthcheck |

---

## Module Architecture

```
AppModule
│
├── SupabaseModule (@Global)
│   └── SupabaseService          ← Supabase JS client (service role key, bypasses RLS)
│       └── injected into every feature service
│
├── EmailModule (@Global)
│   └── EmailService             ← Resend wrapper for invite + password-reset emails
│       └── injected into AuthModule + UsersModule
│
├── APP_GUARD: SupabaseAuthGuard ← applied to ALL routes globally
│   └── reads Bearer token → supabase.auth.getUser()
│       → loads role + is_active from public.users
│       → attaches { id, email, role, isActive } to request.user
│
├── APP_GUARD: RolesGuard        ← reads @Roles() metadata
│   └── throws 403 if role doesn't match
│
├── AuthModule
│   ├── POST /auth/login            @Public() — skips auth guard
│   ├── POST /auth/forgot-password  @Public() — emails reset link (always 200)
│   ├── POST /auth/logout
│   └── GET  /auth/me
│
├── UsersModule
│   ├── GET    /users              @Roles('admin')
│   ├── GET    /users/me
│   ├── GET    /users/:id          @Roles('admin')
│   ├── POST   /users/invite       @Roles('admin')
│   ├── PATCH  /users/:id          @Roles('admin')
│   └── DELETE /users/:id          @Roles('admin')
│
├── ProjectsModule
│   ├── GET    /projects
│   ├── GET    /projects/:id       @Roles('admin')
│   ├── POST   /projects           @Roles('admin')
│   ├── PATCH  /projects/:id       @Roles('admin')
│   └── DELETE /projects/:id       @Roles('admin')
│
├── TimeEntriesModule
│   ├── POST   /time-entries/start
│   ├── GET    /time-entries/current
│   ├── POST   /time-entries/:id/stop
│   ├── POST   /time-entries/:id/pause
│   ├── POST   /time-entries/:id/resume
│   ├── GET    /time-entries            @Roles('admin')
│   ├── GET    /time-entries/active     @Roles('admin')
│   ├── POST   /time-entries/:id/admin-stop  @Roles('admin')
│   └── DELETE /time-entries/:id        @Roles('admin')
│
├── ScreenshotsModule
│   ├── POST /screenshots/upload              (multipart: file + thumbnail?)
│   ├── GET  /screenshots                     @Roles('admin') — list + signed URLs
│   ├── GET  /screenshots/:id/url             @Roles('admin')
│   └── POST /screenshots/backfill-thumbnails @Roles('admin')
│
├── ReportsModule                  @Roles('admin') on all
│   ├── GET /reports/stats
│   ├── GET /reports/weekly-chart
│   ├── GET /reports/range
│   ├── GET /reports/csv
│   └── GET /reports/pdf
│
├── WebhooksModule                 @Roles('admin') on all
│   ├── POST /webhooks/slack/test
│   └── @Cron(EVERY_DAY_AT_9AM)   dailySummary()
│
├── ConfigModule
│   ├── GET   /config              (any authenticated user; Slack URL admin-only)
│   └── PATCH /config              @Roles('admin')
│
└── HealthModule
    └── GET /health               @Public() — Docker healthcheck
```

---

## Request Lifecycle

```
Incoming HTTP Request
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  SupabaseAuthGuard (global)                           │
│                                                       │
│  Is @Public()?  ──yes──► Skip guard                  │
│       │ no                                            │
│       ▼                                               │
│  Authorization: Bearer <token>                        │
│  supabase.auth.getUser(token)                        │
│       │                                               │
│  ┌────┴──────────┐                                    │
│  │ token invalid │──► 401 UnauthorizedException       │
│  └───────────────┘                                    │
│       │ valid                                         │
│  SELECT role, is_active FROM public.users             │
│  ┌────────────────┐                                   │
│  │ is_active=false│──► 401 Account deactivated        │
│  └────────────────┘                                   │
│       │                                               │
│  req.user = { id, email, role, isActive }             │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  RolesGuard (global)                                  │
│                                                       │
│  No @Roles() metadata? ──► Pass through               │
│  Has @Roles('admin') and user.role !== 'admin'?       │
│       └──► 403 Insufficient permissions               │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  ValidationPipe                                       │
│  whitelist: true, forbidNonWhitelisted: true          │
│  transform: true                                      │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
              Controller Handler
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│  HttpExceptionFilter (global)                         │
│  Returns: { statusCode, error, path, timestamp }      │
└───────────────────────────────────────────────────────┘
```

---

## API Reference

All endpoints share the `/api/v1` prefix. Full interactive docs at `http://localhost:3001/api/docs`.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | `{ email, password }` → `{ accessToken, refreshToken, user }` |
| POST | `/auth/forgot-password` | Public | `{ email }` — emails a password-reset link via Resend; always returns success (no account enumeration) |
| POST | `/auth/logout` | Bearer | Revoke session server-side |
| GET | `/auth/me` | Bearer | Current user profile |

### Users
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | Admin | All users + computed `weeklyHours` + `inviteStatus` (`pending` / `accepted`, derived from Supabase Auth sign-in/confirmation) |
| GET | `/users/me` | Bearer | Own profile + weekly hours |
| GET | `/users/:id` | Admin | User profile + weekly hours |
| POST | `/users/invite` | Admin | Create auth user + `public.users` row, then email via Resend. Body: `name`, `email`, `role`. Optional `timezone`; optional `password` (8+ chars) creates the account ready to log in, otherwise an invite link is emailed |
| PATCH | `/users/:id` | Admin | Update name, role, timezone, isActive |
| DELETE | `/users/:id` | Admin | Delete a user; cascades `public.users` + `time_entries` + `screenshots` rows and removes the user's screenshot objects from storage. Cannot delete your own account |

### Projects
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects` | Bearer | All projects + `totalHours` |
| GET | `/projects/:id` | Admin | Project + stats |
| POST | `/projects` | Admin | Create |
| PATCH | `/projects/:id` | Admin | Edit / archive |
| DELETE | `/projects/:id` | Admin | Delete |

### Time Entries
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/time-entries/start` | Bearer | Start timer for the current user (DB constraint: one running per user) |
| GET | `/time-entries/current` | Bearer | The caller's open entry (running or paused), if any |
| POST | `/time-entries/:id/stop` | Bearer | Stop + compute `duration_seconds` |
| POST | `/time-entries/:id/pause` | Bearer | Pause a running timer (entry stays open) |
| POST | `/time-entries/:id/resume` | Bearer | Resume a paused timer |
| GET | `/time-entries` | Admin | Paginated list — params: `page`, `limit`, `userId`, `projectId`, `from`, `to` |
| GET | `/time-entries/active` | Admin | All running timers with elapsed seconds |
| POST | `/time-entries/:id/admin-stop` | Admin | Force-stop any user's open entry (override for stuck trackers) |
| DELETE | `/time-entries/:id` | Admin | Delete a time entry |

### Screenshots
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/screenshots/upload` | Bearer | Multipart (`FileFieldsInterceptor`): `file` + optional `thumbnail`, plus `activityPercent`, `screenNumber?`, `displayCount?`, `capturedAt?`, `timeEntryId?`, activity fields. Uploaded to the private `screenshots` bucket. When no `thumbnail` is provided, a JPEG thumbnail is generated server-side with `sharp` and stored at `thumbnail_path`. Desktop sends one upload per connected display per capture event, sharing `capturedAt` |
| GET | `/screenshots` | Admin | Paginated list with 1-hour signed URLs for full image + thumbnail. `thumbnailUrl` is `null` when no real thumbnail exists (grid shows a skeleton rather than fetching the full PNG). Params: `page`, `limit`, `userId`, `from`, `to`. Rows sharing `(user_id, captured_at)` belong to the same multi-monitor capture event |
| GET | `/screenshots/:id/url` | Admin | Single screenshot signed URL |
| POST | `/screenshots/backfill-thumbnails` | Admin | Generate thumbnails for older screenshots missing one (bounded batch). Params: `limit?` (1–100, default 25), `userId?`, `from?`, `to?` |

### Reports (admin only)
| Method | Path | Description |
|---|---|---|
| GET | `/reports/stats` | `{ todayHours, activeNow, screenshotsToday, weeklyHours, weeklyChange }` — folds in live time from open entries |
| GET | `/reports/weekly-chart` | `[{ day, date, hours }]` for last 7 days |
| GET | `/reports/range` | Params: `from`, `to`, `bucket=day\|week\|month` (default `day`), `userId?`. Returns `{ totalHours, activeNow, screenshots, entries, series: [{ label, date, hours }] }`, folding in live time from open entries |
| GET | `/reports/csv` | `text/csv` stream — params: `from`, `to`, `userId`, `projectId` |
| GET | `/reports/pdf` | HTML report download |

### Config, Webhooks & Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/config` | Bearer | `{ screenshotIntervalMinutes, companyName, timezone, slackWebhookUrl }` — `slackWebhookUrl` is omitted for non-admins |
| PATCH | `/config` | Admin | Update configuration |
| POST | `/webhooks/slack/test` | Admin | Send test Slack message. (A daily summary also posts via `@Cron(EVERY_DAY_AT_9AM)`) |
| GET | `/health` | Public | `{ status: 'ok' }` — Docker healthcheck |

---

## Error Responses

All errors return:

```json
{
  "statusCode": 404,
  "error": "User not found",
  "path": "/api/v1/users/abc",
  "timestamp": "2024-05-01T10:00:00.000Z"
}
```

| Status | Cause |
|---|---|
| `400` | Validation failure or business rule (e.g. timer already running) |
| `401` | Missing, expired, or invalid token; deactivated account |
| `403` | Valid token but wrong role |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email on invite) |

---

## Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # NEVER expose to clients
PORT=3001
ADMIN_URL=http://localhost:3000                    # CORS allowed origin

# Email (Resend) — optional; without RESEND_API_KEY emails are logged, not sent
RESEND_API_KEY=re_...
RESEND_FROM=Clockwork <onboarding@resend.dev>      # default if unset
COMPANY_NAME=your team                              # used in email copy + config
DOWNLOAD_BUCKET=installers                          # public bucket for installer links
DOWNLOAD_URL_MACOS=                                 # override mac installer link
DOWNLOAD_URL_WINDOWS=                               # override windows installer link
```

---

## Database Migrations

SQL lives in `supabase/migrations/`, applied in order:

| File | What it adds |
|---|---|
| `001_initial.sql` | `users`, `projects`, `time_entries`, `screenshots`, `app_config`; RLS policies; `one_running_entry_per_user` partial unique index; `status in ('running','paused','stopped')` |
| `002_storage.sql` | Private `screenshots` storage bucket + policies |
| `003_multi_screen.sql` | `screenshots.screen_number` + `display_count` |
| `004_activity_detail.sql` | `screenshots.key_count`, `mouse_count`, `active_window`, `minute_activity` (jsonb) |
| `005_pause_tracking.sql` | `time_entries.paused_seconds` + `pauses` (jsonb) |
| `006_installers_bucket.sql` | Public `installers` bucket for desktop downloads linked from emails |
| `007_screenshot_thumbnails.sql` | `screenshots.thumbnail_path` |

---

## Running & Building

```bash
pnpm dev      # nest start --watch  →  :3001
pnpm build    # nest build          →  dist/
pnpm start    # node dist/main.js

# Swagger UI
open http://localhost:3001/api/docs
```
