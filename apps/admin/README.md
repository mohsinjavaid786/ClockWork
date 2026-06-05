# apps/admin — Clockwork Admin Portal

> Next.js 15 App Router management dashboard. Black/white design system, Geist font, Recharts 3, React 19, demo mode with no backend required.

---

## Features

### Dashboard (`/dashboard`)
- Four live stat cards: Today's hours · Active members right now · This week's hours (with % change vs last week) · Screenshots captured today
- 7-day horizontal bar chart (Recharts `BarChart`) — one bar per day, white bars on dark background
- **Tracking now** panel — lists every member currently running a timer with their elapsed time updating client-side, project name, and a green live indicator dot

### Work Diary (`/work-diary`)
Inspired by Upwork's time tracking UI:

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
- **Member picker**: dropdown to filter the entire view to one team member

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

Each screenshot tile shows a captured time badge and a colored activity bar at the bottom (green ≥70%, yellow ≥40%, red <40%).

### Screenshot Modal
Clicking any screenshot tile opens a full-screen modal:

```
┌────────────────────────────────────────────────────────────────────┐
│  James Wilson · Mon Jun 2 · 9:00 AM – 11:30 AM          12 of 36  │
├───────────────────────────────────────┬────────────────────────────┤
│                                       │  Activity Level            │
│   [Simulated blurred screenshot]      │  ██████████  Active 9/10   │
│                                       │                            │
│   Active window:                      │  Activity                  │
│   Visual Studio Code — index.ts       │  ┌────────┬──────┬──────┐  │
│                                       │  │ Time   │ Keys │Mouse │  │
│   ⌨ 342 keystrokes                   │  │ 9:10   │  32  │  18  │  │
│   🖱 187 mouse events                 │  │ 9:11   │  14  │  27  │  │
│                                       │  │ 9:12   │  48  │  11  │  │
│                                       │  │ ...    │  ... │  ... │  │
│                                       │  └────────┴──────┴──────┘  │
├───────────────────────────────────────┴────────────────────────────┤
│  ← Previous    [🖥️][🖥️][🖥️][🖥️][🖥️]    Next →                     │
└────────────────────────────────────────────────────────────────────┘
```

- **Activity Level**: 10 colored blocks (green ≥70%, yellow ≥40%, red <40%) — "Active X of 10 min"
- **Per-minute breakdown**: time · keystroke count · mouse event count for each of the 10 minutes in the screenshot window
- **Navigation**: ← → arrow keys, Escape to close, filmstrip thumbnails at bottom

### Timesheets (`/timesheets`)
- Paginated table (25 per page) of all time entries across the team
- Each row is clickable — opens a **detail panel** with:
  - Duration, started, ended, avg activity % stat boxes
  - Keystroke total, mouse event total, screenshot count
  - Activity timeline bar chart (height = activity %, color-coded)
  - 3-column screenshot grid

### Team (`/team`)
- Member table: avatar, name, email, role badge, status badge, this-week hours
- **Invite modal**: full name, email, role, temporary password
- Click any name → member profile page with weekly hours + recent 10 entries

### Projects (`/projects`)
- Table with colored project dot, name, description, status, total hours, created date
- **Create modal**: name, description, color swatch picker (7 preset hex colors)
- Delete with confirmation

### Reports (`/reports`)
- Date range picker (from / to)
- **Export CSV**: downloads `clockwork-report.csv` with columns: Date, User, Email, Project, Description, Duration
- **Export HTML Report**: downloads a printable `clockwork-report.html`

### Settings (`/settings`)
- Company name, timezone, screenshot interval (1–60 min)
- Slack webhook URL with **Send test message** button
- Inline save status feedback (saved / error)

### Demo Mode
Login with `demo@clockwork.app / demo1234` — the "Use demo" button on the login page auto-fills the credentials. No API server or Supabase account needed.

Demo data includes:
- **6 team members**: Sarah Chen (admin), James Wilson, Priya Patel, Marcus Johnson, Emily Rodriguez (inactive), Alex Kim
- **5 projects**: Website Redesign, Mobile App v2, Backend Infrastructure, Marketing Campaign, Legacy API (archived)
- **35 time entries** spanning 10 days with realistic descriptions
- **3 active members** currently tracking
- **Mock screenshots**: up to 12 per session with deterministic activity %, keystroke counts, and per-minute breakdown

---

## Page Hierarchy

```
/ (redirect)
│
├── (auth)/
│   ├── login/                  AuthProvider wraps this group
│   └── access-denied/
│
└── (dashboard)/                Auth guard + SidebarLayout
    ├── dashboard/
    ├── work-diary/             Calendar + weekly bars + day panel + screenshot modal
    ├── timesheets/             Paginated table + entry detail panel
    ├── team/
    │   └── [userId]/
    ├── projects/
    ├── reports/
    └── settings/
```

---

## Component Relationships

```
SidebarLayout
└── renders all (dashboard)/* pages

WorkDiary page
├── Calendar (month grid, week selection, activity dots)
├── WeekBars (7 horizontal bars, click → open panel)
├── DayDetailPanel (slide-in)
│   ├── SessionBlock[] (one per time entry)
│   │   └── MiniShot[] (screenshot filmstrip)
│   └── ScreenshotModal (full-screen overlay, z-60)
│       ├── BigScreenshot (simulated blurred screen)
│       ├── Activity level blocks (10 × colored square)
│       ├── Per-minute breakdown table
│       └── Filmstrip navigation

Timesheets page
└── EntryDetailPanel (slide-in)
    ├── Stat boxes (duration, started, ended, avg activity)
    ├── Input summary (keystrokes, mouse, screenshots)
    ├── ActivityTimeline (bar chart from screenshot data)
    └── ScreenshotTile grid (3 columns)
```

---

## Design System

```css
--bg-base:      #0A0A0A   /* page background */
--bg-surface:   #111111   /* cards, sidebar */
--bg-elevated:  #1A1A1A   /* modals, hover */
--border:       #2A2A2A   /* all borders */
--text-primary: #FFFFFF
--text-secondary: #A1A1A1
--text-muted:   #666666
--status-green: #22C55E   /* active, tracked */
--status-red:   #EF4444   /* error, overtime */
--status-yellow: #EAB308  /* medium activity */
```

Font: **Geist Mono** for headings, numbers, stat values. **Geist Sans** for body and labels.

---

## Auth Flow

```
Login page
    │  POST /auth/login (or demo intercept)
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

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Running & Building

```bash
pnpm dev      # next dev  →  :3000
pnpm build    # next build (type/lint errors suppressed by next.config.js)
pnpm start    # next start

# Vercel deploy
vercel --prod
# Set NEXT_PUBLIC_API_URL in Vercel dashboard
```
