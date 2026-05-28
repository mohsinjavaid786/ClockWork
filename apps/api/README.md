# apps/api — TrackDesk NestJS Backend

The REST API that powers both the admin portal and the desktop app. Built with NestJS, backed by Supabase (PostgreSQL + Auth + Storage), and deployable as a serverless app on Vercel or as a long-running process on Railway.

---

## Table of Contents

- [Stack](#stack)
- [Project Layout](#project-layout)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Module Reference](#module-reference)
  - [Common Infrastructure](#common-infrastructure)
  - [AuthModule](#authmodule)
  - [UsersModule](#usersmodule)
  - [TimeEntriesModule](#timeentriesmodule)
  - [ScreenshotsModule](#screenshotsmodule)
  - [ProjectsModule](#projectsmodule)
  - [ReportsModule](#reportsmodule)
  - [WebhooksModule](#webhooksmodule)
  - [ConfigModule](#configmodule)
- [Request / Response Conventions](#request--response-conventions)
- [Authentication & Authorization](#authentication--authorization)
- [Testing](#testing)
- [Building & Deploying](#building--deploying)

---

## Stack

| Concern | Library |
|---|---|
| Framework | NestJS 10 + Express |
| Database client | @supabase/supabase-js v2 |
| Validation | class-validator + class-transformer |
| API docs | @nestjs/swagger (Swagger UI at `/api/docs`) |
| Cron jobs | @nestjs/schedule |
| CSV export | json2csv |
| File upload | multer (via `@nestjs/platform-express`) |
| Testing | Jest + ts-jest |

---

## Project Layout

```
src/
├── main.ts                     # Bootstrap, Swagger setup, global pipes/filters
├── app.module.ts               # Root module — imports all feature modules
│
├── common/
│   ├── supabase/
│   │   ├── supabase.module.ts  # Global module — provides SupabaseService
│   │   └── supabase.service.ts # Singleton Supabase client (service role key)
│   ├── guards/
│   │   ├── supabase-auth.guard.ts  # JWT verification via Supabase Auth
│   │   └── roles.guard.ts          # Role-based access control
│   ├── decorators/
│   │   ├── public.decorator.ts     # @Public() — opt-out of auth guard
│   │   ├── roles.decorator.ts      # @Roles('admin') metadata
│   │   └── current-user.decorator. # @CurrentUser() param decorator
│   └── filters/
│       └── http-exception.filter.ts # Global error shape { error, statusCode }
│
├── auth/
├── users/
├── time-entries/
├── screenshots/
├── projects/
├── reports/
├── webhooks/
└── config/
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # NEVER expose to clients
SUPABASE_ANON_KEY=<anon-key>
STORAGE_BUCKET=screenshots
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

---

## Running Locally

```bash
# From the repo root
pnpm dev:api

# Or from this directory
pnpm dev        # nest start --watch
pnpm build      # tsc compile → dist/
pnpm start      # run dist/main.js
```

Swagger docs: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

## Module Reference

### Common Infrastructure

#### `SupabaseService`

A global singleton that creates the Supabase JS client using the **service role key**. This key bypasses RLS and is used only server-side. Injected into every feature service.

```typescript
// Any service
constructor(private readonly supabase: SupabaseService) {}
this.supabase.client.from('users').select('*')
```

#### `SupabaseAuthGuard`

Applied globally via `APP_GUARD` in `AuthModule`. On every request:
1. Reads `Authorization: Bearer <token>` header.
2. Calls `supabase.auth.getUser(token)` to validate the JWT.
3. Queries `public.users` to check `is_active` and load `role`.
4. Attaches `{ id, email, role }` to `request.user`.

Routes decorated with `@Public()` skip this guard entirely.

#### `RolesGuard`

Also applied globally. Reads the `@Roles('admin')` metadata from the handler. If present and the user's role does not match, throws `403 Forbidden`.

#### `HttpExceptionFilter`

Catches all thrown exceptions and returns a consistent shape:

```json
{ "statusCode": 404, "error": "User abc not found" }
```

---

### AuthModule

**File:** `src/auth/`

Handles login/logout. This module also registers the two global guards via `APP_GUARD`.

#### `POST /auth/login` — Public

```json
// Request
{ "email": "user@example.com", "password": "secret123" }

// Response 200
{
  "accessToken": "<supabase-jwt>",
  "user": { "id": "...", "email": "...", "name": "Alice", "role": "member" }
}
```

Calls `supabase.auth.signInWithPassword()`, then checks `is_active` in `public.users`. The returned JWT is a standard Supabase-issued token with the user's `sub` claim as the user ID.

#### `POST /auth/logout` — Bearer

Calls `supabase.auth.admin.signOut(token)` to revoke the session server-side.

---

### UsersModule

**File:** `src/users/`

Manages team members. All write operations and the list endpoint are admin-only.

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Bearer | Returns the calling user's profile row |
| GET | `/users` | Admin | All users, ordered by `created_at` desc |
| GET | `/users/:id` | Bearer | Single user profile |
| POST | `/users/invite` | Admin | Creates an auth user + `public.users` row |
| PATCH | `/users/:id` | Admin | Updates `name`, `role`, `is_active`, `timezone` |

#### Invite flow

`POST /users/invite` calls `supabase.auth.admin.createUser({ email, email_confirm: true })`. Supabase sends a magic-link invite email automatically. The service then inserts a row into `public.users` with the new auth UID.

#### DTOs

```typescript
InviteUserDto  { name: string; email: string; role: 'admin' | 'member' }
UpdateUserDto  { name?, role?, isActive?, timezone? }
```

---

### TimeEntriesModule

**File:** `src/time-entries/`

Core time tracking logic. Each user can have at most one running entry at a time.

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/time-entries/start` | Bearer | Opens a new entry (`is_running=true`) |
| POST | `/time-entries/stop` | Bearer | Closes the running entry, sets `ended_at` and `duration_seconds` |
| GET | `/time-entries` | Bearer | Paginated list |
| DELETE | `/time-entries/:id` | Admin | Hard delete |

#### Start

Checks for an existing `is_running=true` entry. If one exists, throws `400 Bad Request` — only one timer per user.

```json
// POST /time-entries/start
{ "projectId": "uuid", "description": "Working on login page" }
```

#### Stop

Finds the running entry by `user_id` (or explicit `entryId`), computes `duration_seconds = ended_at - started_at`, sets `is_running=false`.

#### List query parameters

| Param | Type | Description |
|---|---|---|
| `userId` | UUID | Filter by user (admin only; members are automatically scoped) |
| `projectId` | UUID | Filter by project |
| `startDate` | ISO date | `started_at >=` |
| `endDate` | ISO date | `started_at <=` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Per page (default: 20) |

Response: `{ data: TimeEntry[], total: number, page: number, limit: number }`

---

### ScreenshotsModule

**File:** `src/screenshots/`

Handles screenshot upload, listing (with signed URLs), and full-resolution access.

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/screenshots/upload` | Bearer | Multipart upload |
| GET | `/screenshots` | Bearer | List with 1-hour signed URLs |
| GET | `/screenshots/:id/full` | Admin | Full-res signed URL |

#### Upload (`POST /screenshots/upload`)

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | JPEG file | The blurred screenshot (blurred client-side by `sharp`) |
| `timeEntryId` | string | UUID of the active time entry |
| `activityPercent` | number | 0–100, calculated over the last 10-min window |
| `capturedAt` | ISO 8601 | When the screenshot was taken |

The file is stored at `{userId}/{date}/{timestamp}.jpg` in Supabase Storage. A row is inserted in `public.screenshots`.

#### List

Returns an array of screenshot rows each with an additional `signedUrl` field (1-hour expiry). Members can only list their own screenshots. Admins can query by `?userId=`.

#### Full URL

Admin-only endpoint that returns a signed URL for the stored (blurred) JPEG at full resolution. The screenshots are always stored blurred; the "full" here means the original capture resolution, not an unblurred version.

---

### ProjectsModule

**File:** `src/projects/`

CRUD for projects plus aggregate stats.

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/projects` | Bearer | All non-archived (admins see archived too) |
| GET | `/projects/:id` | Bearer | Single project |
| POST | `/projects` | Admin | Create |
| PATCH | `/projects/:id` | Admin | Edit name/description/color or archive |
| DELETE | `/projects/:id` | Admin | Hard delete |
| GET | `/projects/:id/stats` | Bearer | Aggregate stats |

#### Stats response

```json
{
  "projectId": "uuid",
  "totalHours": 42.5,
  "activeMembers": 4,
  "screenshotCount": 128
}
```

Computed by aggregating `time_entries.duration_seconds` and counting distinct `user_id`s.

#### Create/Update DTOs

```typescript
CreateProjectDto { name: string; description?: string; color?: string }
UpdateProjectDto { name?, description?, color?, isArchived? }
```

---

### ReportsModule

**File:** `src/reports/`

Admin-only export endpoints. Both are filterable by date range, user IDs, and project IDs.

#### `GET /reports/export/csv` — Admin

Returns a `text/csv` stream. The query is joined across `time_entries`, `users`, `projects`, and `screenshots`.

**Query params:** `startDate`, `endDate`, `userIds` (comma-separated), `projectIds` (comma-separated)

**CSV columns:** Employee, Email, Project, Date, Start, End, Duration (hours), Activity %, Screenshots Count, Description

Uses the `json2csv` library with the `Parser` class.

#### `GET /reports/export/pdf` — Admin

Returns JSON data structured per employee per day, intended for rendering into a PDF by the admin frontend using `@react-pdf/renderer`. Shape:

```json
[
  {
    "name": "Alice",
    "email": "alice@example.com",
    "days": {
      "2024-05-01": { "hours": 7.2, "entries": 3 }
    }
  }
]
```

---

### WebhooksModule

**File:** `src/webhooks/`

Slack integration for daily summaries and manual test pings.

#### `POST /webhooks/slack/test` — Admin

Sends a test message to the provided webhook URL. Validates the URL starts with `https://hooks.slack.com/`.

```json
{ "webhookUrl": "https://hooks.slack.com/services/..." }
```

#### Daily Cron Job

Runs at **09:00 UTC** every day via `@Cron('0 9 * * *')`. Reads `slack_webhook_url` from `app_config`. If set, fetches yesterday's aggregated time data and posts:

```
Yesterday (2024-05-01): *8.4 hrs* logged by *5 employees* across *3 projects*
```

---

### ConfigModule

**File:** `src/config/`

Reads and writes the `app_config` table — a simple key/value store for app-wide settings.

#### `GET /config` — Bearer

Returns all config keys as a flat object:

```json
{
  "company_name": "My Company",
  "screenshot_interval_minutes": "10",
  "timezone": "UTC",
  "slack_webhook_url": ""
}
```

#### `PATCH /config` — Admin

Updates one or more config values. Accepts:

```typescript
UpdateConfigDto {
  companyName?: string;
  screenshotIntervalMinutes?: number;  // 5–60
  timezone?: string;
  slackWebhookUrl?: string;
}
```

---

## Request / Response Conventions

- All payloads are JSON (`Content-Type: application/json`), except screenshot upload which is `multipart/form-data`.
- Successful responses return the resource directly (no wrapper object), except list endpoints which return `{ data, total, page, limit }`.
- All error responses have the shape: `{ "statusCode": number, "error": string }`.
- `400` — validation error or business rule violation (e.g. timer already running).
- `401` — missing or expired token.
- `403` — authenticated but insufficient role.
- `404` — resource not found.
- `500` — unexpected server error (logged server-side).

---

## Authentication & Authorization

Every request to a protected endpoint must include:

```
Authorization: Bearer <supabase-jwt>
```

The token is verified by calling Supabase Auth's `getUser()` on every request. There is no local JWT decoding — Supabase acts as the authoritative token validator.

Role enforcement is additive: `@Roles('admin')` on a handler means the user must pass both the auth guard **and** the roles guard.

To opt a handler out of authentication entirely (e.g. the login endpoint), use:

```typescript
@Public()
@Post('login')
login() { ... }
```

---

## Testing

Each module has a `*.spec.ts` file that uses Jest with mocked Supabase calls:

```bash
pnpm test              # run all specs
pnpm test:watch        # watch mode
pnpm test:cov          # with coverage
```

Test pattern: inject a `SupabaseService` mock via `useValue`, stub the Supabase fluent query builder chain (`from().select().eq().single()`), assert service behavior.

---

## Building & Deploying

```bash
# Build TypeScript → dist/
pnpm build

# Start the compiled output
pnpm start

# Vercel (serverless)
# vercel.json at repo root routes /api/* to this app
vercel --prod

# Railway / Fly.io / any Node host
# Start command: node dist/main.js
# Port: read from PORT env var (default 3001)
```
