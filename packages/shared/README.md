# packages/shared — @clockwork/shared

A zero-dependency TypeScript package that exports all domain types and IPC channel constants shared across `apps/api`, `apps/admin`, and `apps/desktop`.

A single source of truth: adding a field to `TimeEntry` immediately surfaces as a compile error in every app that uses it.

---

## Table of Contents

- [Installation](#installation)
- [Types](#types)
- [IPC Channels](#ipc-channels)
- [Building](#building)

---

## Installation

This is a workspace package. Other apps reference it by name:

```json
"dependencies": {
  "@clockwork/shared": "workspace:*"
}
```

Each app's `tsconfig.json` maps the import to the source directly so no pre-build step is needed during development:

```json
"paths": {
  "@clockwork/shared": ["../../packages/shared/src"]
}
```

---

## Types

**File:** `src/types.ts`

Domain model interfaces mirroring the Supabase schema (camelCase instead of snake_case).

### `UserRole`

```typescript
type UserRole = 'admin' | 'member';
```

### `EntryStatus`

```typescript
type EntryStatus = 'running' | 'stopped';
```

Used in `TimeEntry.status`. Replaces the old `isRunning: boolean` pattern. The database enforces at most one `'running'` entry per user via a partial unique index.

### `User`

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  timezone: string;
  avatarUrl?: string;
  createdAt: string;
}
```

### `Project`

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;           // hex color, e.g. '#6366F1'
  isArchived: boolean;
  createdBy: string;       // userId
  totalHours?: number;     // computed by API, not stored in DB
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
  endedAt?: string;        // undefined while status = 'running'
  durationSeconds?: number;
  status: EntryStatus;
  user?: User;             // populated via JOIN on list endpoints
  project?: Project;       // populated via JOIN on list endpoints
}
```

### `Screenshot`

```typescript
interface Screenshot {
  id: string;
  userId: string;
  timeEntryId?: string;
  storagePath: string;     // Supabase Storage path: {userId}/{timestamp}.png
  capturedAt: string;      // ISO 8601
  activityPercent: number; // 0–100
  signedUrl?: string;      // added by API on list/get endpoints (1-hour expiry)
  user?: User;
}
```

### `AppConfig`

```typescript
interface AppConfig {
  screenshotIntervalMinutes: number;
  companyName: string;
  timezone: string;
  slackWebhookUrl?: string;
}
```

### `DashboardStats`

```typescript
interface DashboardStats {
  todayHours: number;
  activeNow: number;
  screenshotsToday: number;
  weeklyHours: number;
  weeklyChange: number;    // percent change vs last week (can be negative)
}
```

### `ActiveMember`

```typescript
interface ActiveMember {
  userId: string;
  name: string;
  email: string;
  projectName?: string;
  description?: string;
  elapsedSeconds: number;  // computed from startedAt at request time
  startedAt: string;
}
```

### `WeeklyChartData`

```typescript
interface WeeklyChartData {
  day: string;    // 'Mon', 'Tue', …
  date: string;   // 'YYYY-MM-DD'
  hours: number;
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
  totalPages: number;
}
```

### `ApiError`

Standard error shape for all API error responses:

```typescript
interface ApiError {
  error: string;
  statusCode: number;
  message?: string;
}
```

---

## IPC Channels

**File:** `src/ipc-channels.ts`

Typed string constants for all Electron IPC channel names. Used in both `apps/desktop/src/preload/index.ts` and `apps/desktop/src/main/index.ts`. Using the `IPC` object prevents typos and makes renaming a channel safe.

```typescript
export const IPC = {
  AUTH_LOGIN:         'auth:login',
  AUTH_LOGOUT:        'auth:logout',
  AUTH_GET_TOKEN:     'auth:get-token',
  AUTH_GET_USER:      'auth:get-user',
  TIMER_START:        'timer:start',
  TIMER_STOP:         'timer:stop',
  TIMER_GET_STATUS:   'timer:get-status',
  SCREENSHOT_CAPTURE: 'screenshot:capture',
  SCREENSHOT_UPLOAD:  'screenshot:upload',
  ACTIVITY_GET:       'activity:get',
  CONFIG_GET:         'config:get',
  PROJECTS_LIST:      'projects:list',
  APP_VERSION:        'app:version',
} as const;
```

`typeof IPC[keyof typeof IPC]` gives the union of all channel strings, useful for typing `ipcMain.handle()` arguments.

---

## Building

```bash
# From this directory
pnpm build       # tsc → dist/ with .d.ts + source maps

# Watch mode
pnpm dev
```

During development all apps import directly from source via the `paths` alias, so you don't need to run `pnpm build` unless preparing a production artifact or publishing the package externally.
