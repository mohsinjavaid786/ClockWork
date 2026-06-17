# apps/admin — Clockwork Admin Portal

> Next.js 15 App Router management dashboard. Light "Steep-inspired" editorial design system with a dark/light mode toggle, Inter + Newsreader + Geist Mono, Recharts 3, React 19.

---

## Features

### Dashboard (`/dashboard`)
- **Range-scoped KPI cards**: Hours tracked · Active now · Sessions · Screenshots — all computed for the selected period
- **Mercury-style scrubbable timeline** — a draggable / resizable band over a ~16-month window selects the active date range (resize from either edge, or grab the middle to slide); commits on release
- **Preset dropdown** (Last 7 days / 30 days / 3 months / 6 months / Year to date / 12 months) that drives the same range — dragging the band switches the dropdown to "Custom range"
- Everything filters through a single `GET /reports/range` call (with a `day`/`week`/`month` bucket chosen from the span)
- **Hours over period** — a bucketed bar chart (Recharts `BarChart`, blue `#4a90e2` bars on the cool `sky` card)
- **Tracking now** — a live roster of every member currently running a timer, with elapsed time ticking client-side, project name, and a green live dot; click a member → their detail page
- **Refresh** button (manual) plus 60s auto-refresh of the live roster

### Team member detail (`/team/[userId]`)
Profile header (avatar, role + active/inactive badges, email, timezone, this-week hours) with two tabs:

- **Recent activity** — table of recent entries; click a row → the entry detail drawer (screenshots + activity)
- **Work diary** — the per-employee Upwork-style diary (see below)

> The standalone `/work-diary` route now **redirects to `/team`** and is no longer in the sidebar — the diary lives inside each member's detail page.

#### Work diary (Work diary tab)
```
┌──────────────────────┐  ┌───────────────────────────────────────────────┐
│  June 2026           │  │  Jun 1 – Jun 7                                │
│                      │  │                                               │
│  M  T  W  T  F  S  S│  │  1 Monday    ████████████████████  9:10 hrs   │
│  1  2  3  4  5  6  7 │  │  2 Tuesday   ████████████████████  9:10 hrs   │
│  •  •  •  •  •       │  │  3 Wednesday █████████████████████ 10:00 hrs  │
│  8  9  10 11 12 ...  │  │  4 Thursday  ████████████████      8:10 hrs   │
│  15 16 ...           │  │  5 Friday    ████████▓▓▓▓▓         6:00 hrs   │
│                      │  │  6 Saturday  ──────────────         0:00 hrs   │
│  ● Tracked           │  │  7 Sunday    ──────────────         0:00 hrs   │
│  ■ Overtime          │  │                                               │
└──────────────────────┘  │  Tracked 40:00  Overtime 2:30  Total 42:30   │
                          └───────────────────────────────────────────────┘
```

- **Calendar**: monthly view with green activity dots and red overtime squares; clicking any day selects its full Mon–Sun week
- **Bar chart**: green = regular hours (≤8h), red extension = overtime; click any row to open the day detail panel
- Scoped to the member being viewed (the data is fetched for that `userId`)

### Day Detail Panel
Slides in from the right when a day row is clicked:

```
┌────────────────────────────────────────────────────┐
│  Monday, June 2                               [X]  │
│  Total: 9:10 hrs  ●  2 sessions                   │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ ● 9:00 AM – 11:30 AM (2:30 hrs)    82% avg  │  │
│  │ Website Redesign · Hero section layout       │  │
│  │ [🖥️ 9:10] [🖥️ 9:20] [🖥️ 9:30] [🖥️ 9:40] ──► │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ ● 13:00 PM – 16:00 PM (3:00 hrs)   75% avg  │  │
│  │ [🖥️ 13:10] [🖥️ 13:20] [🖥️ 13:30] ──────────► │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

Each screenshot tile shows the captured thumbnail, a time badge, and a colored activity bar (green ≥70%, yellow ≥40%, red <40%). When the employee has multiple monitors, each capture event produces one tile per display with a small `Screen N/M` badge.

### Timesheets (`/timesheets`)
- Paginated table (25 per page) of all time entries across the team — Member · Started · Project · Description · Duration · Status
- Each row is clickable — opens a **floating detail drawer**: rounded, inset from the edges and elevated (`shadow-modal`), portaled to `document.body` over a blurred backdrop; background scroll is locked while it's open. The drawer contains:
  - Stat row (duration, started, ended, avg activity) plus paused-time note when applicable
  - Input summary (keystroke total, mouse-event total, screenshot count)
  - Activity timeline bar chart (height = activity %, color-coded)
  - **Screenshot grid** — paginated (10 per page) and **sortable** (newest / oldest / most active / least active), rendered from auto-generated thumbnails; click a screenshot → full viewer
- Admins can **force-stop** a running/paused tracker from the drawer header
- Missing thumbnails are auto-generated in the background (`backfillThumbnails`) so tiles fill in without a manual step

### Screenshot Viewer (modal)
Click any screenshot tile to open the full viewer (above the drawer):

```
┌────────────────────────────────────────────────────────────────────┐
│  James Wilson · Mon Jun 2 · Screen 1 of 2               12 of 36  │
├───────────────────────────────────────┬────────────────────────────┤
│                                       │  Activity Level            │
│   [Full screenshot — zoom & pan]      │  ██████████  9% … 100%     │
│                                       │                            │
│   Active window:                      │  Per-minute activity       │
│   Visual Studio Code — index.ts       │  ┌────────┬──────┬──────┐  │
│                                       │  │ Time   │ Keys │Mouse │  │
│   ⌨ 342 keystrokes                   │  │ 9:10   │  32  │  18  │  │
│   🖱 187 mouse events                 │  │ 9:11   │  14  │  27  │  │
│                                       │  │ ...    │  ... │  ... │  │
├───────────────────────────────────────┴────────────────────────────┤
│  ← Previous    [🖥️][🖥️][🖥️][🖥️][🖥️]    Next →                     │
└────────────────────────────────────────────────────────────────────┘
```

- **Thumbnail → full image** with shimmer skeletons (the blurred thumbnail stands in while the full PNG loads; falls back to a UI skeleton on error)
- **Zoom 100–400%** via mouse wheel, +/- buttons, or double-click, with **drag-to-pan** when zoomed in
- **Activity Level**: 10 colored blocks (green ≥70%, yellow ≥40%, red <40%)
- **Per-minute breakdown**: time · keystrokes · mouse events for each minute in the window
- **Navigation**: Previous / Next, ← → arrow keys, Escape to close, real-thumbnail filmstrip at the bottom

### Status tags
Color-coded everywhere via `<StatusBadge>`: active/running/accepted/completed = green, paused/pending = yellow, stopped/failed = red, admin = blue, inactive/archived/member = grey.

### Team (`/team`)
- **Employees / Admins** tabs with counts; member table: avatar + name (links to detail), role badge, active/inactive badge, signup status (pending / accepted), this-week hours, timezone, delete action
- **Invite modal**: full name, email, role, timezone, and an optional temporary password. With a password the account is ready immediately; without one we email a **set-password link plus the desktop installer downloads** (Resend)
- Page header also exposes the **macOS / Windows installer downloads** (public Supabase `installers` bucket) to hand to employees
- **Delete** removes a member and cascades all their time entries and screenshots (confirmation modal)

### Projects (`/projects`)
- Table with colored project dot, name, description, status, total hours, created date
- **Create modal**: name, description, color swatch picker (7 preset hex colors)
- Delete with confirmation

### Reports (`/reports`)
- Date range picker (from / to)
- **Export CSV**: downloads `clockwork-report.csv` (Date, User, Email, Project, Description, Duration)
- **Export HTML Report**: downloads a printable `clockwork-report.html`

### Settings (`/settings`)
- Company name, timezone, screenshot interval (1–60 min)
- Slack webhook URL with **Send test message** button
- Inline save status feedback (saved / error)

### Timezone switcher
A control in the top bar toggles how all times render: **My time** (browser zone), **UTC**, and — when viewing a member — **Employee's time** (their configured zone). Offsets are shown inline.

### Theme toggle (dark / light)
A Sun/Moon button in the top bar switches between the default light theme and dark mode. Colors are CSS-variable tokens (light `:root` + a `.dark` class on `<html>`); the choice is persisted to `localStorage` (`cw-theme`) and applied by a small no-flash boot script in the root layout before first paint. Tailwind uses `darkMode: 'class'`.

---

## Page Hierarchy

```
/ (redirect)
│
├── (auth)/                     AuthProvider wraps this group
│   ├── login/
│   ├── forgot-password/
│   ├── reset-password/
│   └── access-denied/
│
└── (dashboard)/                Auth guard + SidebarLayout
    ├── dashboard/              KPIs + scrubbable timeline + bar chart + live roster
    ├── team/
    │   └── [userId]/           Profile + Recent activity / Work diary tabs
    ├── timesheets/             Paginated table + floating entry detail drawer
    ├── projects/
    ├── reports/
    ├── settings/
    └── work-diary/             redirect → /team (legacy; not in sidebar)
```

Sidebar nav: Dashboard · Team · Timesheets · Projects · Reports · Settings.

---

## Component Relationships

```
SidebarLayout
├── TimezoneSelect + ThemeToggle (top bar)
└── renders all (dashboard)/* pages

Dashboard page
├── DashboardTimeline (Mercury-style scrubbable band)
├── StatCard[] (range-scoped KPIs)
└── BarChart (hours over period) + live "Tracking now" roster

Team member detail (/team/[userId])
├── Recent activity tab → DataTable → EntryDetailPanel
└── Work diary tab → WorkDiary
    ├── Calendar (month grid, week selection, activity dots)
    ├── WeekBars (7 horizontal bars, click → open panel)
    └── DayDetailPanel (slide-in) → ScreenshotModal

Timesheets page
└── EntryDetailPanel (portaled floating drawer)
    ├── Stat boxes + input summary
    ├── ActivityTimeline (bar chart from screenshot data)
    ├── ScreenshotTile grid (paginated 10/page, sortable, thumbnails)
    └── ScreenshotModal (full viewer: zoom/pan, per-minute table, filmstrip)
```

Shared components: `ThemeToggle`, `TimezoneSelect`, `DashboardTimeline`, `WorkDiary`, `EntryDetailPanel`, `DayDetailPanel`, `ScreenshotModal`, `SidebarLayout`, `DataTable`, `StatCard`, `StatusBadge`, `Avatar`, `Modal`, `PageHeader`, `EmptyState`, `LoadingSpinner`.

---

## Design System

A light, editorial, data-first system (Tailwind v3). Tokens are CSS variables (channel triplets `R G B`) defined in `src/app/globals.css` for both light (`:root`) and dark (`.dark`), and surfaced as Tailwind colors via `rgb(var(--x) / <alpha-value>)` so opacity utilities keep working.

```
ink       primary text          fog    page canvas / hovers
ash       secondary text        card   white card surfaces
graphite  muted / labels        hair   hairlines / table separators
dove      input borders         rust   warm chart voice
                                apricot warm data-card bg
                                sky    cool data-card bg
success / warning / error / info  (each with a *-bg pair)   chart blue: #4a90e2
```

- **Radii**: `rounded-card` (24px primary cards), `rounded-field` (16px inputs/selects), `rounded-full` (buttons, badges, avatars)
- **Shadows**: `shadow-card` (elevated white cards — no border, the shadow contains it), `shadow-subtle`, `shadow-modal`
- **Fonts**: **Inter** (`font-sans`, UI), **Newsreader** (`font-display`, serif headings ≥26px — used by `<PageHeader>`), **Geist Mono** (`font-mono`, tabular/time readouts only)

The full token list and component patterns (card / button / input / table / badge / modal / chart conventions) are documented in [`DESIGN.md`](./DESIGN.md).

---

## Auth Flow

```
Login page
    │  POST /auth/login
    ▼
AuthContext.login()
    │  stores token in localStorage as 'cw_token'
    ▼
Redirect → /dashboard
    │
    ▼  (dashboard)/layout.tsx
AuthContext reads 'cw_token' on mount
    │  calls api.auth.me() to restore user
    ▼
If no user → redirect /login
If user → render SidebarLayout + page
```

Invited users set their password via the emailed link (`/reset-password`); `/forgot-password` requests a reset; `/access-denied` is shown to non-admins.

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=...   # used to derive public installer download links
```

---

## Running & Building

```bash
pnpm dev      # next dev  →  :3000
pnpm build    # next build (type/lint errors suppressed by next.config.js)
pnpm start    # next start

# Vercel deploy
vercel --prod
# Set NEXT_PUBLIC_API_URL (and NEXT_PUBLIC_SUPABASE_URL) in the Vercel dashboard
```
