# apps/api — Clockwork NestJS Backend

> REST API powering the admin portal and desktop app. NestJS 11, Supabase PostgreSQL, global `/api/v1` prefix, Swagger at `/api/docs`.

---

## Features

| Feature | Details |
|---|---|
| **JWT auth** | Every protected request validated against Supabase Auth; no local JWT decoding |
| **Role-based access** | `@Roles('admin')` decorator — admins get full access, members get own-data only |
| **One-timer constraint** | PostgreSQL partial unique index prevents two `running` entries per user at the DB level |
| **Screenshot upload** | Multipart endpoint; blurred file stored to private Supabase Storage; signed URLs generated on read (1-hour expiry) |
| **Dashboard stats** | `GET /reports/stats` — today's hours, active-now count, weekly hours, week-over-week change |
| **Weekly chart** | `GET /reports/weekly-chart` — last 7 days hourly data for bar chart rendering |
| **CSV export** | `GET /reports/csv` — streams `text/csv` with all time entries |
| **HTML report** | `GET /reports/pdf` — printable HTML report download |
| **Daily Slack cron** | `@nestjs/schedule` posts yesterday's summary at 09:00 UTC |
| **Swagger docs** | Full interactive API docs at `/api/docs` with bearer auth |
| **Active members** | `GET /time-entries/active` — all currently running timers with elapsed seconds |

---

## Module Architecture

```
AppModule
│
├── SupabaseModule (@Global)
│   └── SupabaseService          ← Supabase JS client (service role key)
│       └── injected into every feature service
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
│   ├── POST /auth/login         @Public() — skips auth guard
│   ├── POST /auth/logout
│   └── GET  /auth/me
│
├── UsersModule
│   ├── GET  /users              @Roles('admin')
│   ├── GET  /users/me
│   ├── GET  /users/:id          @Roles('admin')
│   ├── POST /users/invite       @Roles('admin')
│   └── PATCH /users/:id         @Roles('admin')
│
├── ProjectsModule
│   ├── GET    /projects
│   ├── GET    /projects/:id
│   ├── POST   /projects         @Roles('admin')
│   ├── PATCH  /projects/:id     @Roles('admin')
│   └── DELETE /projects/:id     @Roles('admin')
│
├── TimeEntriesModule
│   ├── POST   /time-entries/start
│   ├── POST   /time-entries/:id/stop
│   ├── GET    /time-entries      (paginated, filterable)
│   ├── GET    /time-entries/active  @Roles('admin')
│   └── DELETE /time-entries/:id
│
├── ScreenshotsModule
│   ├── POST /screenshots/upload  (multipart)
│   ├── GET  /screenshots         (list + signed URLs)
│   └── GET  /screenshots/:id/url
│
├── ReportsModule                  @Roles('admin') on all
│   ├── GET /reports/stats
│   ├── GET /reports/weekly-chart
│   ├── GET /reports/csv
│   └── GET /reports/pdf
│
├── WebhooksModule
│   ├── POST /webhooks/slack/test  @Roles('admin')
│   └── @Cron('0 9 * * *')        dailySummary()
│
└── ConfigModule
    ├── GET   /config
    └── PATCH /config              @Roles('admin')
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
| POST | `/auth/logout` | Bearer | Revoke session server-side |
| GET | `/auth/me` | Bearer | Current user profile |

### Users
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | Admin | All users + computed `weeklyHours` |
| GET | `/users/me` | Bearer | Own profile + recent entries |
| GET | `/users/:id` | Admin | User profile + weekly hours + last 10 entries |
| POST | `/users/invite` | Admin | Create auth user + `public.users` row |
| PATCH | `/users/:id` | Admin | Update name, role, timezone, isActive |

### Projects
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects` | Bearer | All projects + `totalHours` |
| GET | `/projects/:id` | Bearer | Project + total hours + member count |
| POST | `/projects` | Admin | Create |
| PATCH | `/projects/:id` | Admin | Edit / archive |
| DELETE | `/projects/:id` | Admin | Delete |

### Time Entries
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/time-entries/start` | Bearer | Start timer (DB constraint: one running per user) |
| POST | `/time-entries/:id/stop` | Bearer | Stop + compute `duration_seconds` |
| GET | `/time-entries` | Bearer | Paginated list — params: `page`, `limit`, `userId`, `projectId`, `from`, `to` |
| GET | `/time-entries/active` | Admin | All running timers with elapsed seconds |
| DELETE | `/time-entries/:id` | Bearer | Own entry only; admin can delete any |

### Screenshots
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/screenshots/upload` | Bearer | Multipart: `file` + `activityPercent` + `timeEntryId?` |
| GET | `/screenshots` | Bearer | Paginated list with 1-hour signed URLs — params: `userId`, `timeEntryId`, `from`, `to` |
| GET | `/screenshots/:id/url` | Bearer | Single screenshot signed URL |

### Reports (admin only)
| Method | Path | Description |
|---|---|---|
| GET | `/reports/stats` | `{ todayHours, activeNow, screenshotsToday, weeklyHours, weeklyChange }` |
| GET | `/reports/weekly-chart` | `[{ day, date, hours }]` for last 7 days |
| GET | `/reports/csv` | `text/csv` stream — params: `from`, `to`, `userId`, `projectId` |
| GET | `/reports/pdf` | HTML report download |

### Config & Webhooks
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/config` | Bearer | `{ screenshotIntervalMinutes, companyName, timezone, slackWebhookUrl }` |
| PATCH | `/config` | Admin | Update configuration |
| POST | `/webhooks/slack/test` | Admin | Send test Slack message |

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
```

---

## Running & Building

```bash
pnpm dev      # nest start --watch  →  :3001
pnpm build    # nest build          →  dist/
pnpm start    # node dist/main.js

# Swagger UI
open http://localhost:3001/api/docs
```
