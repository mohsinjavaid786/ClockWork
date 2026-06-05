# packages/shared — @clockwork/shared

> Zero-dependency TypeScript package exporting all domain types and IPC channel constants shared across `apps/api`, `apps/admin`, and `apps/desktop`.

A single source of truth: changing a field on `TimeEntry` immediately surfaces as a compile error in every app that consumes it.

---

## Features

| Feature | Details |
|---|---|
| **Domain types** | `User`, `Project`, `TimeEntry`, `Screenshot`, `AppConfig`, `DashboardStats`, `ActiveMember`, `WeeklyChartData`, `PaginatedResponse<T>`, `ApiError` |
| **Status enum** | `EntryStatus = 'running' \| 'stopped'` — replaces the old `isRunning: boolean` pattern |
| **Role type** | `UserRole = 'admin' \| 'member'` |
| **IPC channels** | `IPC` const map — all 13 Electron IPC channel strings, used in both `preload/index.ts` and `main/index.ts` |
| **Zero deps** | No runtime dependencies — safe to import from any environment |

---

## Type Dependency Map

```
@clockwork/shared
│
├── types.ts
│   │
│   ├── UserRole      ── 'admin' | 'member'
│   ├── EntryStatus   ── 'running' | 'stopped'
│   │
│   ├── User          ── { id, name, email, role: UserRole, isActive, timezone, avatarUrl?, createdAt }
│   ├── Project       ── { id, name, description?, color, isArchived, createdBy, totalHours?, createdAt }
│   │
│   ├── TimeEntry     ── { id, userId, projectId?, description?, startedAt, endedAt?,
│   │                      durationSeconds?, status: EntryStatus, user?: User, project?: Project }
│   │
│   ├── Screenshot    ── { id, userId, timeEntryId?, storagePath, capturedAt,
│   │                      activityPercent, signedUrl?, user?: User }
│   │
│   ├── AppConfig     ── { screenshotIntervalMinutes, companyName, timezone, slackWebhookUrl? }
│   │
│   ├── DashboardStats── { todayHours, activeNow, screenshotsToday, weeklyHours, weeklyChange }
│   │
│   ├── ActiveMember  ── { userId, name, email, projectName?, description?,
│   │                      elapsedSeconds, startedAt }
│   │
│   ├── WeeklyChartData─ { day, date, hours }
│   │
│   ├── PaginatedResponse<T> ── { data: T[], total, page, limit, totalPages }
│   │
│   └── ApiError      ── { error, statusCode, message? }
│
└── ipc-channels.ts
    │
    └── IPC (const map)
        ├── AUTH_LOGIN        'auth:login'
        ├── AUTH_LOGOUT       'auth:logout'
        ├── AUTH_GET_TOKEN    'auth:get-token'
        ├── AUTH_GET_USER     'auth:get-user'
        ├── TIMER_START       'timer:start'
        ├── TIMER_STOP        'timer:stop'
        ├── TIMER_GET_STATUS  'timer:get-status'
        ├── SCREENSHOT_CAPTURE 'screenshot:capture'
        ├── SCREENSHOT_UPLOAD  'screenshot:upload'
        ├── ACTIVITY_GET      'activity:get'
        ├── CONFIG_GET        'config:get'
        ├── PROJECTS_LIST     'projects:list'
        └── APP_VERSION       'app:version'
```

---

## Usage in Each App

### `apps/api` — type checking only (no runtime import)

The API uses its own DTO classes (with class-validator decorators) for request validation. Shared types serve as the reference contract for response shapes.

```typescript
// Response shape matches shared types by convention
return {
  id: entry.id,
  status: entry.status as EntryStatus,   // EntryStatus from @clockwork/shared
  // ...
}
```

### `apps/admin` — API client typing

```typescript
import type { TimeEntry, PaginatedResponse, DashboardStats } from '@clockwork/shared';

const stats = await api.reports.stats() as DashboardStats;
const result = await api.timeEntries.list() as PaginatedResponse<TimeEntry>;
```

### `apps/desktop` — IPC channels (critical usage)

```typescript
import { IPC } from '@clockwork/shared';

// In preload/index.ts
ipcRenderer.invoke(IPC.TIMER_START, { projectId, description })

// In main/index.ts
ipcMain.handle(IPC.TIMER_START, async (_e, args) => { ... })
```

Using `IPC.TIMER_START` instead of the raw string `'timer:start'` means renaming a channel is a single change caught by the compiler across all files.

---

## Installation

Workspace package — referenced by name in other apps:

```json
{
  "dependencies": {
    "@clockwork/shared": "workspace:*"
  }
}
```

TypeScript path alias in each app's `tsconfig.json` points to source directly (no build step needed in development):

```json
{
  "paths": {
    "@clockwork/shared": ["../../packages/shared/src"]
  }
}
```

---

## Type Details

### `EntryStatus` — why not `isRunning: boolean`

Using a string literal union instead of boolean:
- Makes state exhaustive — a third state (e.g. `'paused'`) can be added without breaking existing checks
- Database uses `CHECK ('running' | 'stopped')` matching the TypeScript type exactly
- Partial unique index `WHERE (status = 'running')` reads naturally

### `ActiveMember` — vs `User`

`ActiveMember` is a **computed, real-time** shape returned by `GET /time-entries/active`. It is not stored in the database — `elapsedSeconds` is computed at request time from `started_at`. Never try to persist an `ActiveMember` object.

### `PaginatedResponse<T>` — all list endpoints

Every list endpoint returns this shape:

```typescript
{
  data: T[];
  total: number;       // total matching rows (before pagination)
  page: number;        // current page (1-indexed)
  limit: number;       // rows per page
  totalPages: number;  // Math.ceil(total / limit)
}
```

---

## Building

```bash
pnpm build   # tsc → dist/ with .d.ts + source maps
pnpm dev     # watch mode
```

Build output goes to `dist/`. During development all apps import from source via `paths` aliases — only run `pnpm build` when preparing a production artifact.
