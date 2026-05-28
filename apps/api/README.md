# apps/api — Clockwork NestJS Backend

The REST API that powers both the admin portal and the desktop app. Built with NestJS 10, backed by Supabase (PostgreSQL + Auth + Storage), running on port `3001` with a global `/api/v1` prefix.

---

## Table of Contents

- [Stack](#stack)
- [Project Layout](#project-layout)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Module Reference](#module-reference)
- [Request / Response Conventions](#request--response-conventions)
- [Authentication & Authorization](#authentication--authorization)
- [Building & Deploying](#building--deploying)

---

## Stack

| Concern | Library |
|---|---|
| Framework | NestJS 10 + Express |
| Database client | @supabase/supabase-js v2 (service role key) |
| Validation | class-validator + class-transformer |
| API docs | @nestjs/swagger (Swagger UI at `/api/docs`) |
| Cron jobs | @nestjs/schedule |
| File upload | multer (via `@nestjs/platform-express`) |

---

## Project Layout

```
src/
├── main.ts                         # Bootstrap: global prefix, CORS, Swagger, ValidationPipe
├── app.module.ts                   # Root module — imports all feature modules, registers APP_GUARDs
│
├── supabase/
│   ├── supabase.module.ts          # @Global() — provides SupabaseService to all modules
│   └── supabase.service.ts         # Singleton Supabase client (service role key)
│
├── guards/
│   ├── supabase-auth.guard.ts      # JWT verification, loads role/is_active from users table
│   └── roles.guard.ts              # Checks @Roles('admin') metadata
│
├── decorators/
│   ├── public.decorator.ts         # @Public() — skip auth guard
│   ├── roles.decorator.ts          # @Roles('admin') — require admin role
│   └── current-user.decorator.ts   # @CurrentUser() — inject AuthUser from request
│
├── filters/
│   └── http-exception.filter.ts    # Uniform error shape: { statusCode, error, path, timestamp }
│
└── modules/
    ├── auth/                        # Login, logout, /me
    ├── users/                       # List, invite, get by ID, patch
    ├── projects/                    # CRUD + total hours
    ├── time-entries/                # Start, stop, list, active feed, delete
    ├── screenshots/                 # Upload, list with signed URLs, get signed URL
    ├── reports/                     # Stats, weekly chart, CSV stream, HTML report
    ├── webhooks/                    # Slack test + daily cron summary
    └── config/                      # Get / patch app_config row
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # NEVER expose to clients
PORT=3001
ADMIN_URL=http://localhost:3000                # CORS allowed origin
```

---

## Running Locally

```bash
# From repo root
pnpm dev:api

# Or from this directory
pnpm dev        # nest start --watch
pnpm build      # nest build → dist/
pnpm start      # node dist/main.js
```

Swagger UI: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

## Module Reference

### Infrastructure

#### `SupabaseService`

A global singleton that creates the Supabase JS client using the **service role key**. This key bypasses RLS and is used only server-side. Injected automatically into every feature service because `SupabaseModule` is `@Global()`.

```typescript
constructor(private readonly supabase: SupabaseService) {}
// Then anywhere:
this.supabase.client.from('users').select('id, name').eq('id', userId)
```

#### `SupabaseAuthGuard`

Registered globally via `APP_GUARD`. On every non-public request:
1. Reads `Authorization: Bearer <token>` header.
2. Calls `supabase.auth.getUser(token)` to validate the JWT with Supabase.
3. Queries `public.users` for `role` and `is_active`.
4. Rejects with `401` if the token is invalid, user not found, or account is deactivated.
5. Attaches `{ id, email, role, isActive }` to `request.user`.

#### `RolesGuard`

Also registered globally. Reads `@Roles('admin')` metadata. If the annotation is present and the user's role doesn't match, throws `403 Forbidden`.

#### `HttpExceptionFilter`

Returns a consistent JSON shape for all errors:

```json
{
  "statusCode": 404,
  "error": "User not found",
  "path": "/api/v1/users/abc",
  "timestamp": "2024-05-01T10:00:00.000Z"
}
```

---

### AuthModule — `src/modules/auth/`

Handles login, logout, and profile retrieval.

#### `POST /auth/login` — Public

```json
// Request body
{ "email": "user@example.com", "password": "secret123" }

// Response 200
{
  "accessToken": "<supabase-jwt>",
  "refreshToken": "<supabase-refresh-token>",
  "user": { "id": "...", "name": "Alice", "email": "...", "role": "admin", "isActive": true, "timezone": "UTC" }
}
```

Calls `supabase.auth.signInWithPassword()`. Verifies `is_active` before returning. Throws `401` if credentials are wrong or account is deactivated.

#### `POST /auth/logout` — Bearer

Calls `supabase.auth.admin.signOut(token)` to revoke the session server-side.

#### `GET /auth/me` — Bearer

Returns the calling user's profile row from `public.users`.

---

### UsersModule — `src/modules/users/`

Team member management. All write operations are admin-only.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | Admin | All users with computed `weeklyHours` |
| GET | `/users/me` | Bearer | Own profile + recent entries + weekly hours |
| GET | `/users/:id` | Admin | User profile + weekly hours + last 10 entries |
| POST | `/users/invite` | Admin | Create auth user + `public.users` row |
| PATCH | `/users/:id` | Admin | Update `name`, `role`, `timezone`, `isActive` |

**Invite flow:** `POST /users/invite` calls `supabase.auth.admin.createUser({ email_confirm: true })` then inserts the `public.users` row. If the DB insert fails, the auth user is cleaned up.

**DTOs:**
```typescript
InviteUserDto  { name: string; email: string; role: 'admin' | 'member'; password: string; timezone?: string }
UpdateUserDto  { name?, role?, timezone?, isActive? }
```

---

### ProjectsModule — `src/modules/projects/`

Project CRUD with aggregate hours.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects` | Bearer | All projects with `totalHours` |
| GET | `/projects/:id` | Bearer | Project + total hours + unique member count |
| POST | `/projects` | Admin | Create project |
| PATCH | `/projects/:id` | Admin | Edit name, description, color, or archive |
| DELETE | `/projects/:id` | Admin | Hard delete |

**DTOs:**
```typescript
CreateProjectDto { name: string; color: string; description?: string }
UpdateProjectDto { name?, description?, color?, isArchived? }
```

---

### TimeEntriesModule — `src/modules/time-entries/`

Core time tracking. The database enforces one running entry per user via a partial unique index.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/time-entries/start` | Bearer | Open a new entry (`status='running'`) |
| POST | `/time-entries/:id/stop` | Bearer | Close running entry, compute `duration_seconds` |
| GET | `/time-entries` | Bearer | Paginated list with filters |
| GET | `/time-entries/active` | Admin | All currently running timers with elapsed seconds |
| DELETE | `/time-entries/:id` | Bearer | Own entry only (admin can delete any) |

**List query params:** `userId`, `projectId`, `from` (ISO), `to` (ISO), `page` (default 1), `limit` (default 20)

**Response shape:** `{ data: TimeEntry[], total, page, limit, totalPages }`

**Start DTOs:**
```typescript
StartTimerDto { projectId?: string; description?: string }
StopTimerDto  { endedAt?: string }  // defaults to now()
```

---

### ScreenshotsModule — `src/modules/screenshots/`

Screenshot upload and retrieval. Screenshots are always stored blurred — the desktop app applies Gaussian blur before upload.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/screenshots/upload` | Bearer | Multipart — `file` + `activityPercent` + optional `timeEntryId` |
| GET | `/screenshots` | Bearer | Paginated list with 1-hour signed URLs |
| GET | `/screenshots/:id/url` | Bearer | Signed URL for a single screenshot |

**Upload fields:** `file` (PNG/JPEG), `activityPercent` (0–100), `timeEntryId?`, `capturedAt?`

Files are stored at `{userId}/{timestamp}.png` in the `screenshots` Supabase Storage bucket (private).

---

### ReportsModule — `src/modules/reports/`

Admin-only data endpoints. All require `role = 'admin'`.

| Method | Path | Description |
|---|---|---|
| GET | `/reports/stats` | `{ todayHours, activeNow, screenshotsToday, weeklyHours, weeklyChange }` |
| GET | `/reports/weekly-chart` | Last 7 days: `[{ day, date, hours }]` |
| GET | `/reports/csv` | `text/csv` stream — filterable by `from`, `to`, `userId`, `projectId` |
| GET | `/reports/pdf` | HTML report as a download |

**CSV columns:** Date, User, Email, Project, Description, Duration (hours)

---

### WebhooksModule — `src/modules/webhooks/`

Slack integration.

#### `POST /webhooks/slack/test` — Admin

Sends a test message to the `slack_webhook_url` stored in `app_config`. Returns `{ success: false }` if no URL is configured.

#### Daily Cron — 09:00 UTC

Reads `slack_webhook_url` from `app_config`. If set, posts yesterday's aggregated stats:

```
:clockwork: Daily Summary — Thursday, May 1
• 5 members tracked time
• 38.4h total logged
```

---

### ConfigModule — `src/modules/config/`

Reads and writes the `app_config` table (single row, `id = 1`).

#### `GET /config` — Bearer

```json
{
  "screenshotIntervalMinutes": 10,
  "companyName": "Clockwork",
  "timezone": "UTC",
  "slackWebhookUrl": "https://hooks.slack.com/..."
}
```

#### `PATCH /config` — Admin

```typescript
UpdateConfigDto {
  screenshotIntervalMinutes?: number;   // 1–60
  companyName?: string;
  timezone?: string;
  slackWebhookUrl?: string;             // must be a valid URL
}
```

---

## Request / Response Conventions

- All bodies are JSON (`Content-Type: application/json`), except screenshot upload which is `multipart/form-data`.
- Successful single-resource responses return the resource directly.
- List endpoints return `{ data, total, page, limit, totalPages }`.
- Error responses: `{ statusCode, error, path, timestamp }`.

| Status | Meaning |
|---|---|
| `400` | Validation failure or business rule violation (e.g. timer already running) |
| `401` | Missing, expired, or invalid token |
| `403` | Valid token but insufficient role |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email on invite) |
| `500` | Unexpected server error |

---

## Authentication & Authorization

Every protected endpoint requires:

```
Authorization: Bearer <supabase-jwt>
```

The token is verified by Supabase Auth on every request — there is no local JWT decoding. Supabase is the authoritative token validator.

To opt a handler out of authentication:

```typescript
@Public()
@Post('login')
login(@Body() dto: LoginDto) { ... }
```

To restrict to admins:

```typescript
@Roles('admin')
@Get()
list() { ... }
```

To access the current user in a handler:

```typescript
@Get('me')
me(@CurrentUser() user: AuthUser) {
  return this.usersService.findById(user.id);
}
```

---

## Building & Deploying

```bash
# Build TypeScript → dist/
pnpm build

# Start compiled output
pnpm start

# Railway / Fly.io / any Node host
# Start command: node dist/main.js
# Set: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_URL, PORT
```
