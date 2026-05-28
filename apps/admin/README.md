# apps/admin — Clockwork Admin Portal

The web-based management dashboard for Clockwork. Built with Next.js 14 App Router, Tailwind CSS, Geist font, and Recharts. Only users with `role = 'admin'` can access this portal.

---

## Table of Contents

- [Stack](#stack)
- [Design System](#design-system)
- [Project Layout](#project-layout)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Pages](#pages)
- [Components](#components)
- [Auth Flow](#auth-flow)
- [API Client](#api-client)
- [Building & Deploying](#building--deploying)

---

## Stack

| Concern | Library |
|---|---|
| Framework | Next.js 14, App Router |
| Styling | Tailwind CSS 3 |
| Font | Geist (Sans body, Mono headings/numbers) |
| Charts | Recharts 2 |
| Icons | lucide-react |
| HTTP | Native `fetch` via typed `api` module |
| Utilities | clsx + tailwind-merge |

---

## Design System

All colors are defined as CSS custom properties in `src/app/globals.css` and mirrored in `tailwind.config.ts`:

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0A0A0A` | Page background |
| `--bg-surface` | `#111111` | Cards, sidebar |
| `--bg-elevated` | `#1A1A1A` | Modals, hover states |
| `--border-default` | `#2A2A2A` | All borders |
| `--text-primary` | `#FFFFFF` | Headings, values |
| `--text-secondary` | `#A1A1A1` | Body text |
| `--text-muted` | `#666666` | Labels, metadata |
| `--status-green` | `#22C55E` | Active, running |
| `--status-red` | `#EF4444` | Error, inactive |

Geist Mono is used for all numeric values, stat cards, and section headings. Geist Sans is used for body copy and labels.

---

## Project Layout

```
src/
├── app/
│   ├── layout.tsx                  # Geist font vars, globals.css
│   ├── page.tsx                    # Redirect → /dashboard
│   ├── globals.css                 # CSS variables + Tailwind base
│   │
│   ├── (auth)/                     # AuthProvider-wrapped route group
│   │   ├── layout.tsx              # Wraps with <AuthProvider>
│   │   ├── login/page.tsx          # Email + password sign in
│   │   └── access-denied/page.tsx  # 403 page for non-admin users
│   │
│   └── (dashboard)/                # Auth-guarded route group
│       ├── layout.tsx              # Checks auth, shows SidebarLayout
│       ├── dashboard/page.tsx      # Stats + weekly chart + active members
│       ├── team/
│       │   ├── page.tsx            # Member table + invite modal
│       │   └── [userId]/page.tsx   # Profile + weekly hours + recent entries
│       ├── timesheets/page.tsx     # Paginated time entry table
│       ├── projects/page.tsx       # Project list + create/delete
│       ├── reports/page.tsx        # CSV + HTML export
│       └── settings/page.tsx       # App config + Slack webhook
│
├── components/
│   ├── SidebarLayout.tsx           # Fixed left nav + logout
│   ├── StatCard.tsx                # KPI card with optional trend
│   ├── DataTable.tsx               # Generic typed table
│   ├── Avatar.tsx                  # Initials or image avatar
│   ├── StatusBadge.tsx             # Colored status/role pill
│   ├── Modal.tsx                   # Centered overlay with ESC close
│   ├── PageHeader.tsx              # Title + description + action slot
│   ├── EmptyState.tsx              # Empty state with optional action
│   └── LoadingSpinner.tsx          # Animated spinner
│
├── context/
│   └── auth-context.tsx            # AuthProvider + useAuth() hook
│
└── lib/
    ├── api.ts                       # Typed fetch wrapper (reads cw_token from localStorage)
    └── utils.ts                     # cn(), formatDuration(), formatHours(), formatDate()
```

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Running Locally

```bash
# From repo root
pnpm dev:admin

# Or from this directory
pnpm dev        # next dev → http://localhost:3000
pnpm build      # next build
pnpm start      # next start
```

---

## Pages

### `/login`

Email + password form. Calls `POST /api/v1/auth/login`. On success:
1. Stores the access token in `localStorage` as `cw_token`.
2. Updates `AuthContext` with the user object.
3. Redirects to `/dashboard`.

---

### `/dashboard`

Fetches in parallel on mount:
- `GET /reports/stats` → 4 `StatCard` components (today's hours, active now, this week, screenshots today)
- `GET /reports/weekly-chart` → Recharts `BarChart` for the last 7 days
- `GET /time-entries/active` → "Tracking now" panel listing active members with elapsed times

The weekly change percentage is shown as a green/red trend indicator on the weekly hours card.

---

### `/team`

Member table with columns: Name (link), Email, Role badge, Status badge, This week (hours).

**Invite modal** — fields: Full name, Email, Role, Temporary password. Calls `POST /users/invite`.

---

### `/team/[userId]`

Profile header: avatar (initials), name, email, role badge, status badge, weekly hours.

Recent activity table: date, project (colored dot), description, duration, status.

---

### `/timesheets`

Paginated table (25 per page) of all time entries across the team. Columns: Member, Started, Project, Description, Duration, Status. Prev/Next pagination controls with total entry count.

---

### `/projects`

Project list table. Columns: Name (colored dot + description), Status, Total hours, Created date, Delete action.

**Create project modal** — fields: Name, Description, Color swatch picker (7 preset colors).

Deleting a project asks for confirmation before calling `DELETE /projects/:id`.

---

### `/reports`

Date range picker (From / To). Two export buttons:

- **Export CSV** — fetches `GET /reports/csv` with the auth token, triggers a browser download of `clockwork-report.csv`.
- **Export HTML Report** — same flow for `GET /reports/pdf`, downloads `clockwork-report.html` (printable from the browser).

---

### `/settings`

Loads `GET /config` on mount. Controlled form with:

| Field | Description |
|---|---|
| Company name | Used in Slack messages and reports |
| Timezone | Default timezone for display |
| Screenshot interval | Minutes between screenshots (1–60) |
| Slack webhook URL | Optional — enables daily summaries and test messages |

"Send test message" button calls `POST /webhooks/slack/test` and shows inline success/error feedback.

---

## Components

### `SidebarLayout`

Fixed left sidebar (224px) with:
- Brand name `CLOCKWORK` (Geist Mono, uppercase, muted)
- Nav links: Dashboard, Team, Timesheets, Projects, Reports, Settings — active link highlighted
- User name + role at bottom
- Sign out button (calls `logout()` from `AuthContext`)

### `StatCard`

```tsx
<StatCard label="This week" value="38.4h" trend={12} sub="vs last week" />
```

Large Mono value, optional trend badge (green/red with ±%), muted label and sub.

### `DataTable<T>`

Generic typed table:
```tsx
<DataTable
  columns={[{ key: 'name', header: 'Member', cell: (row) => row.name }]}
  data={members}
  keyFn={(r) => r.id}
/>
```

### `Modal`

Centered overlay, `ESC` to close, backdrop click to close. Contains a header with title and X button, and a body slot for form content.

### `StatusBadge`

Pill-shaped badge for statuses (`active`/`inactive`/`running`/`stopped`) and roles (`admin`/`member`). Each variant has its own background + text + border combination.

---

## Auth Flow

1. **Login** → `api.auth.login()` → store token in `localStorage` as `cw_token` → set user in `AuthContext`
2. **Page load** → `AuthContext` reads `cw_token` on mount → calls `GET /auth/me` to restore session
3. **Dashboard guard** → `(dashboard)/layout.tsx` redirects to `/login` if `user === null` after loading
4. **Logout** → `POST /auth/logout` → clear `localStorage` → set user to null → next navigation lands on `/login`

---

## API Client

`src/lib/api.ts` exports a namespaced `api` object. All calls automatically include `Authorization: Bearer <cw_token>` from `localStorage`.

```typescript
// Auth
api.auth.login(email, password)
api.auth.me()
api.auth.logout()

// Users
api.users.list()
api.users.get(id)
api.users.invite(body)
api.users.update(id, body)

// Projects
api.projects.list()
api.projects.create(body)
api.projects.remove(id)

// Time entries
api.timeEntries.list({ page: '2', limit: '25', userId: '...' })
api.timeEntries.getActive()

// Reports
api.reports.stats()
api.reports.weeklyChart()
api.reports.csvUrl({ from: '...', to: '...' })   // returns URL string for fetch

// Config
api.config.get()
api.config.update(body)
```

---

## Building & Deploying

```bash
pnpm build    # next build → .next/
pnpm start    # next start

# Vercel (recommended)
vercel --prod
# Set NEXT_PUBLIC_API_URL in Vercel → Project → Settings → Environment Variables
```

`next.config.js` includes `transpilePackages: ['@clockwork/shared']` so the shared types are compiled inline — no pre-build step needed.
