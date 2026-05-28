# apps/admin — TrackDesk Admin Portal

The web-based management dashboard for TrackDesk. Built with Next.js 14 (App Router), Tailwind CSS, and Recharts. Deployed on Vercel.

Only users with `role = 'admin'` can access this portal. Anyone else who successfully authenticates is redirected to `/access-denied`.

---

## Table of Contents

- [Stack](#stack)
- [Project Layout](#project-layout)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Page Reference](#page-reference)
  - [/login](#login)
  - [/dashboard](#dashboard)
  - [/team](#team)
  - [/team/[userId]](#teamuserid)
  - [/timesheets](#timesheets)
  - [/projects](#projects)
  - [/reports](#reports)
  - [/settings](#settings)
- [Shared Components](#shared-components)
- [API Client](#api-client)
- [Auth Flow](#auth-flow)
- [Building & Deploying](#building--deploying)

---

## Stack

| Concern | Library |
|---|---|
| Framework | Next.js 14, App Router |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| HTTP client | Native `fetch` via a typed `ApiClient` class |
| PDF export | @react-pdf/renderer |
| CSV export | json2csv (via API endpoint) |
| Date utils | date-fns |

---

## Project Layout

```
src/
├── app/
│   ├── layout.tsx              # Root HTML shell, global CSS
│   ├── page.tsx                # Redirects / → /dashboard
│   ├── globals.css             # Tailwind base + custom CSS vars
│   │
│   ├── login/
│   │   └── page.tsx            # Login form
│   ├── access-denied/
│   │   └── page.tsx            # Shown to non-admin users
│   ├── dashboard/
│   │   └── page.tsx            # Summary cards + live feed + bar chart
│   ├── team/
│   │   ├── page.tsx            # Team member table + invite modal
│   │   └── [userId]/
│   │       └── page.tsx        # Member detail: timeline + screenshots + heatmap
│   ├── timesheets/
│   │   └── page.tsx            # Paginated, filtered time entry table
│   ├── projects/
│   │   └── page.tsx            # Project card grid + create/edit/archive
│   ├── reports/
│   │   └── page.tsx            # CSV + PDF export triggers
│   └── settings/
│       └── page.tsx            # Company config + Slack webhook
│
├── components/
│   ├── layout/
│   │   └── AdminLayout.tsx     # Sidebar nav + logout
│   ├── charts/
│   │   └── WeeklyHoursChart.tsx # Recharts grouped bar chart
│   └── ui/
│       ├── StatCard.tsx         # KPI summary card
│       └── Badge.tsx            # Coloured status badge
│
└── lib/
    ├── api.ts                   # ApiClient class (typed fetch wrapper)
    └── auth.ts                  # login(), logout(), token/user storage
```

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
API_URL=http://localhost:3001          # server-side (SSR) requests
NEXT_PUBLIC_API_URL=http://localhost:3001  # client-side requests
```

---

## Running Locally

```bash
# From the repo root
pnpm dev:admin

# Or from this directory
pnpm dev        # next dev → http://localhost:3000
pnpm build      # next build
pnpm start      # next start
```

---

## Page Reference

### /login

**File:** `src/app/login/page.tsx`

Email + password form. On submit:
1. Calls `POST /auth/login` via the `ApiClient`.
2. If `user.role !== 'admin'`, redirects to `/access-denied`.
3. Otherwise, stores the JWT in `sessionStorage` and navigates to `/dashboard`.

The token is also injected into `apiClient` so subsequent API calls include the `Authorization` header.

---

### /dashboard

**File:** `src/app/dashboard/page.tsx`

Refreshes every 30 seconds. Fetches time entries and screenshots in parallel for the current week.

**Summary cards:**

| Card | Source |
|---|---|
| Today's Hours | Sum of `duration_seconds` for entries started today |
| Active Now | Count of `is_running = true` entries |
| Screenshots Today | Count of screenshots with `captured_at` today |
| Weekly Hours | Sum of all `duration_seconds` this week |

**Live activity feed:** Lists employees with a currently running timer, showing their name and elapsed time (recalculated client-side from `started_at`).

**Weekly bar chart:** Uses `WeeklyHoursChart` (Recharts `BarChart`) to show hours per employee per day for the last 7 days. One bar series per employee, up to 6 employees rendered. Colors cycle through a fixed palette.

---

### /team

**File:** `src/app/team/page.tsx`

**Table columns:** Name (link to detail page), Email, Role badge, Status badge, Actions.

**Add Member modal:**
- Fields: Name, Email, Role (admin | member)
- Calls `POST /users/invite` — triggers a Supabase invite email with a magic link
- On success the modal closes and the table refreshes

**Deactivate / Reactivate:**
- Calls `PATCH /users/:id` with `{ isActive: false/true }`
- Deactivated members cannot log in (blocked at the API auth guard)

Clicking a name row navigates to `/team/[userId]`.

---

### /team/[userId]

**File:** `src/app/team/[userId]/page.tsx`

Detailed view for a single team member.

**Profile header:** Avatar initial (first letter of name), full name, email, status badge (Active/Inactive), role badge.

**Date range picker:** Two date inputs. Changing either re-fetches all data for that member in the new range. Default range: last 7 days.

**Time entry timeline:** Scrollable list showing description, start time, and formatted duration for each entry in the selected range.

**Screenshot gallery:**
- 3-column grid of thumbnail images loaded from signed URLs
- Clicking a thumbnail opens a full-screen modal with the full-resolution signed URL and metadata (timestamp + activity %)
- Images are always the blurred version stored by the desktop app

---

### /timesheets

**File:** `src/app/timesheets/page.tsx`

**Filters (applied on the API side):**
- Employee dropdown (populated from `GET /users`)
- Project dropdown (populated from `GET /projects`)
- Start date / End date pickers
- "Apply" button triggers a new fetch

**Table columns:** Employee, Project, Description, Start, End, Duration

**Pagination:** 20 rows per page. Prev/Next buttons + page counter. Total entry count shown below the table.

---

### /projects

**File:** `src/app/projects/page.tsx`

**Project cards:** Each card shows the colour dot, name, description, archive status badge, and aggregate stats (total hours, active member count).

**Create/Edit modal:** Name (required), description (optional), colour picker (`<input type="color">`).

**Archive toggle:** Calls `PATCH /projects/:id` with `{ isArchived: !current }`. Archived projects are visually labelled but not hidden for admins.

---

### /reports

**File:** `src/app/reports/page.tsx`

Two date pickers (From / To) and two export buttons.

**Export CSV:**
1. Calls `GET /reports/export/csv?startDate=...&endDate=...`
2. The API streams `text/csv` — received as a `Blob`
3. A temporary object URL is created and clicked programmatically, triggering a browser download named `trackdesk-report-{start}-to-{end}.csv`

**Export PDF:**
Similar flow — `GET /reports/export/pdf` returns JSON data structured per employee per day. The admin portal receives it as a Blob and downloads it. (Rendering into a full PDF using `@react-pdf/renderer` can be wired up on the client side using the returned JSON.)

---

### /settings

**File:** `src/app/settings/page.tsx`

Reads from `GET /config` on load. Each field is a controlled input. Clicking **Save Settings** calls `PATCH /config` with all current values.

| Setting | Key in DB | Input type |
|---|---|---|
| Company Name | `company_name` | text |
| Screenshot Interval | `screenshot_interval_minutes` | select: 5, 10, 15 |
| Default Timezone | `timezone` | text |
| Slack Webhook URL | `slack_webhook_url` | url |

The **Test** button next to the Slack URL calls `POST /webhooks/slack/test` and shows a success/failure message for 3 seconds.

---

## Shared Components

### `AdminLayout`

Wraps every page with a fixed left sidebar containing the navigation links and a Logout button. The active route is highlighted in the sidebar. Logout calls `auth.logout()` (clears sessionStorage) and redirects to `/login`.

### `WeeklyHoursChart`

Accepts `data: DailyEntry[]` (one entry per day, keyed by employee name) and `employees: string[]` (the legend entries). Renders a grouped `BarChart` from Recharts with:
- Dark grid lines matching the dark theme
- Custom `Tooltip` and `Legend` styled to match
- Rounded bar tops via `radius={[4, 4, 0, 0]}`

### `StatCard`

Simple card with a title, a large value, and an optional subtitle.

### `Badge`

Pill-shaped badge in four colour variants: `success` (green), `error` (red), `warning` (yellow), `default` (grey).

---

## API Client

`src/lib/api.ts` exports a singleton `apiClient: ApiClient` instance with typed `get`, `post`, `patch`, `delete`, and `getBlob` methods. All methods automatically include the `Authorization: Bearer <token>` header if a token has been set.

```typescript
apiClient.setToken(jwt);                          // call after login
const users = await apiClient.get<User[]>('/users');
await apiClient.patch(`/users/${id}`, { isActive: false });
const blob = await apiClient.getBlob('/reports/export/csv?...');
```

---

## Auth Flow

1. **Login** → `lib/auth.ts` `login()` → `POST /auth/login` → store token in `sessionStorage` → call `apiClient.setToken()`
2. **Page load** → each page calls `initAuth()` at the top of its `useEffect`. This reads the token from `sessionStorage` and restores it into `apiClient`.
3. **Logout** → `lib/auth.ts` `logout()` → clear `sessionStorage` → `apiClient.clearToken()` → redirect to `/login`

There is no middleware-based route protection — each page is responsible for calling `initAuth()`. If the token is missing or expired, the API will return `401` and the page will show an error.

---

## Building & Deploying

```bash
pnpm build    # next build — outputs to .next/
pnpm start    # next start — serves production build

# Vercel (recommended)
vercel --prod
# Set NEXT_PUBLIC_* and API_URL in Vercel dashboard
```

The `next.config.ts` sets `transpilePackages: ['@trackdesk/shared']` so the shared types package is compiled as part of the Next.js build without needing a pre-build step.
