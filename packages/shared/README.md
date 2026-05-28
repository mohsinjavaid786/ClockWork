# packages/shared — TrackDesk Shared Types

A zero-dependency TypeScript package that exports interfaces, DTO types, and constants shared across all three apps (`apps/api`, `apps/admin`, `apps/desktop`).

Having a single source of truth for these types means a change to a data shape (e.g. adding a field to `TimeEntry`) is immediately visible as a compile error in every app that uses it.

---

## Table of Contents

- [What's in here](#whats-in-here)
- [Installation in other packages](#installation-in-other-packages)
- [Interfaces](#interfaces)
- [DTOs](#dtos)
- [Constants](#constants)
- [Building](#building)

---

## What's in here

```
src/
├── index.ts          # Re-exports everything from the three files below
├── interfaces.ts     # Domain model interfaces (User, TimeEntry, Screenshot, …)
├── dtos.ts           # Request/response shape types (LoginDto, InviteUserDto, …)
└── constants.ts      # IPC channel names, timing thresholds, role constants
```

---

## Installation in other packages

Because this is a workspace package, other apps reference it by name in their `package.json`:

```json
"dependencies": {
  "@trackdesk/shared": "workspace:*"
}
```

TypeScript path aliases in each app's `tsconfig.json` point the compiler at the source directly so you don't need to run a build step during development:

```json
"paths": {
  "@trackdesk/shared": ["../../packages/shared/src"]
}
```

---

## Interfaces

**File:** `src/interfaces.ts`

Domain model types that mirror the Supabase database rows (with camelCase fields instead of snake_case).

### `User`

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  avatarUrl?: string;
  isActive: boolean;
  timezone: string;
  createdAt: string;
}
```

### `Project`

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;          // hex colour, e.g. '#6366f1'
  isArchived: boolean;
  createdBy?: string;     // userId
  createdAt: string;
}
```

### `TimeEntry`

```typescript
interface TimeEntry {
  id: string;
  userId: string;
  projectId?: string;
  description?: string;
  startedAt: string;       // ISO 8601
  endedAt?: string;        // undefined if currently running
  durationSeconds?: number;
  isRunning: boolean;
  createdAt: string;
}
```

### `Screenshot`

```typescript
interface Screenshot {
  id: string;
  userId: string;
  timeEntryId?: string;
  storagePath: string;     // Supabase Storage path: {userId}/{date}/{ts}.jpg
  capturedAt: string;      // ISO 8601
  activityPercent: number; // 0–100
  signedUrl?: string;      // populated by API on list endpoints (1-hour expiry)
  createdAt: string;
}
```

### `AppConfig`

```typescript
interface AppConfig {
  key: string;
  value: string;
  updatedAt: string;
}
```

### `PaginatedResponse<T>`

Generic wrapper returned by list endpoints:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

### `ApiError`

Standard error shape returned by all API error responses:

```typescript
interface ApiError {
  error: string;
  statusCode: number;
}
```

### `DashboardStats`

```typescript
interface DashboardStats {
  totalHoursToday: number;
  activeEmployeesNow: number;
  screenshotsTakenToday: number;
  weeklyHours: number;
  lastWeeklyHours: number;
}
```

### `ProjectStats`

```typescript
interface ProjectStats {
  projectId: string;
  totalHours: number;
  activeMembers: number;
  screenshotCount: number;
}
```

### `ActivityWindow`

```typescript
interface ActivityWindow {
  startTime: string;
  endTime: string;
  activeSeconds: number;
  activityPercent: number;
  isIdle: boolean;
}
```

---

## DTOs

**File:** `src/dtos.ts`

Request body and response types for the API. These are plain interfaces (not class-validator decorated), suitable for both frontend fetch calls and for documenting expected shapes.

| DTO | Used by | Purpose |
|---|---|---|
| `LoginDto` | Admin, Desktop | `POST /auth/login` body |
| `LoginResponseDto` | Admin, Desktop | `POST /auth/login` response |
| `InviteUserDto` | Admin | `POST /users/invite` body |
| `UpdateUserDto` | Admin | `PATCH /users/:id` body |
| `CreateProjectDto` | Admin | `POST /projects` body |
| `UpdateProjectDto` | Admin | `PATCH /projects/:id` body |
| `StartTimeEntryDto` | Desktop | `POST /time-entries/start` body |
| `StopTimeEntryDto` | Desktop | `POST /time-entries/stop` body |
| `UploadScreenshotDto` | Desktop | `POST /screenshots/upload` form fields |
| `TimeEntriesQueryDto` | Admin, Desktop | `GET /time-entries` query params |
| `ReportsQueryDto` | Admin | `GET /reports/export/*` query params |
| `UpdateConfigDto` | Admin | `PATCH /config` body |

---

## Constants

**File:** `src/constants.ts`

### `IPC_CHANNELS`

Typed string constants for all Electron IPC channel names. Using these constants in both `preload.ts` and React components prevents typos and makes refactoring safe.

```typescript
const IPC_CHANNELS = {
  AUTH_LOGIN:          'auth:login',
  AUTH_LOGOUT:         'auth:logout',
  AUTH_GET_TOKEN:      'auth:get-token',
  AUTH_GET_USER:       'auth:get-user',
  TIMER_START:         'timer:start',
  TIMER_STOP:          'timer:stop',
  TIMER_GET_STATE:     'timer:get-state',
  TIMER_TICK:          'timer:tick',
  SCREENSHOT_CAPTURE:  'screenshot:capture',
  SCREENSHOT_CAPTURED: 'screenshot:captured',
  TRAY_UPDATE:         'tray:update',
  APP_GET_VERSION:     'app:get-version',
  APP_CHECK_UPDATE:    'app:check-update',
} as const
```

### Timing thresholds

```typescript
SCREENSHOT_INTERVAL_MS = 10 * 60 * 1000   // 10 minutes
IDLE_THRESHOLD_MS      =  5 * 60 * 1000   // 5 minutes of no input = idle
ACTIVITY_WINDOW_MS     = 10 * 60 * 1000   // 10-minute activity calculation window
```

### `ROLES` and `Role`

```typescript
const ROLES = { ADMIN: 'admin', MEMBER: 'member' } as const
type Role = 'admin' | 'member'
```

---

## Building

```bash
# From this directory
pnpm build       # tsc → dist/

# Watch mode for development
pnpm dev
```

Build output goes to `dist/` with `.d.ts` declaration files and source maps. In practice, during development all apps import from the source directly via tsconfig `paths` aliases, so you only need to run `pnpm build` when preparing a production build or publishing the package.
