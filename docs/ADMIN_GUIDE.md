# Clockwork — Admin Guide

> This guide is for **administrators** who manage the team through the Clockwork web portal. It covers every page, every action, and how to interpret the data.

---

## Table of Contents

- [Accessing the portal](#accessing-the-portal)
- [Demo mode](#demo-mode)
- [Dashboard](#dashboard)
- [Work Diary](#work-diary)
  - [Calendar](#calendar)
  - [Weekly bar chart](#weekly-bar-chart)
  - [Day detail — sessions and screenshots](#day-detail--sessions-and-screenshots)
  - [Screenshot modal](#screenshot-modal)
- [Timesheets](#timesheets)
  - [Entry detail panel](#entry-detail-panel)
- [Team](#team)
  - [Inviting a new member](#inviting-a-new-member)
  - [Member profile](#member-profile)
  - [Deactivating a member](#deactivating-a-member)
- [Projects](#projects)
- [Reports](#reports)
- [Settings](#settings)
- [Common admin tasks](#common-admin-tasks)

---

## Accessing the portal

Open your browser and navigate to the admin portal URL (e.g. `https://clockwork.yourcompany.com` or `http://localhost:3000` locally).

You'll see the login screen. Sign in with your admin credentials. Only users with the `admin` role can access the portal — employees who try to log in are shown an access-denied page.

> **First time?** After running the database migrations, promote yourself to admin in the Supabase SQL Editor:
> ```sql
> UPDATE public.users SET role = 'admin' WHERE email = 'you@yourcompany.com';
> ```

---

## Demo mode

If no backend is running, you can still explore the full portal with realistic data.

```
Email:    demo@clockwork.app
Password: demo1234
```

Click **"Use demo"** on the login page to auto-fill. Demo mode includes:
- 6 team members (1 admin, 4 active members, 1 deactivated)
- 5 projects (1 archived)
- 35 time entries spanning 10 days
- 3 members currently "active"
- Mock screenshots per session with activity % and per-minute breakdowns

All pages, panels, and exports work in demo mode. Data is generated in-browser — no network calls are made.

---

## Dashboard

**URL:** `/dashboard`

The dashboard gives you a live snapshot of the team's activity.

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Today       │ │  Active now  │ │  This week   │ │  Screenshots │
│  12.5 hrs    │ │  3 members   │ │  145.5 hrs   │ │  47 today    │
│              │ │              │ │  +12% vs last│ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

┌────────────────────────────────────────┐  ┌──────────────────────┐
│  Hours this week (bar chart)           │  │  Tracking now        │
│                                        │  │                      │
│  Mon ████████████                      │  │  ● James Wilson      │
│  Tue ███████████████                   │  │    Website Redesign  │
│  Wed █████████████████                 │  │    1h 23m            │
│  Thu █████████████                     │  │                      │
│  Fri ████████                          │  │  ● Priya Patel       │
│  Sat ░                                 │  │    Mobile App v2     │
│  Sun ░                                 │  │    45m               │
└────────────────────────────────────────┘  └──────────────────────┘
```

**Stat cards:**
- **Today** — total hours logged today (stopped entries only)
- **Active now** — number of members currently running a timer
- **This week** — total hours this Mon–Sun with % change vs last week (green = up, red = down)
- **Screenshots today** — number of screenshots captured and uploaded today

**Bar chart** — last 7 days, one bar per day. Hover a bar to see the exact hours.

**Tracking now** — live panel listing every member currently running a timer, with their project name and how long their current session has been running. This list updates on page refresh.

---

## Work Diary

**URL:** `/work-diary`

The Work Diary is the most detailed time overview in the portal. It combines a monthly calendar with a weekly horizontal bar chart — similar to Upwork's time tracking view.

```
┌──────────────────────┐  ┌────────────────────────────────────────────────┐
│  Member: All ▾       │  │                                                │
├──────────────────────┤  │  Jun 1 – Jun 7                                 │
│  June 2026     < >   │  │                                                │
│                      │  │  1 Monday    ████████████████████  9:10 hrs    │
│  M  T  W  T  F  S  S │  │  2 Tuesday   ████████████████████  9:10 hrs    │
│  1  2  3  4  5  6  7 │  │  3 Wednesday █████████████████████ 10:00 hrs   │
│  ●  ●  ●  ■  ●       │  │  4 Thursday  ████████████████■■■   8:10 hrs    │
│  8  9 10 11 12 13 14 │  │  5 Friday    ████████              4:00 hrs    │
│ 15 16 17 18 19 20 21 │  │  6 Saturday  ──────────────         0:00 hrs   │
│ 22 23 24 25 26 27 28 │  │  7 Sunday    ──────────────         0:00 hrs   │
│                      │  │                                                │
│  ● Tracked  ■ Overtime│  │  Tracked 40:20  Overtime 0:10  Total 40:30   │
└──────────────────────┘  └────────────────────────────────────────────────┘
```

### Calendar

- Each day shows a **green dot** if there are tracked entries that day
- A **red square** appears when a member logged more than 8 hours (overtime)
- Click any day to select that **whole week** — the bar chart on the right updates to show Mon–Sun for that week
- The **< >** arrows navigate between months

### Weekly bar chart

Each row represents one day of the selected week:

| Bar colour | Meaning |
|---|---|
| Green | Regular hours (up to 8h for that day) |
| Red extension | Overtime — hours beyond 8 on that day |
| Grey | No time logged |

The bar widths are proportional — the longest bar in the week fills the full width. Hours are shown as `H:MM hrs`.

**Click any row** to open the day detail panel for that date.

**Footer row** shows totals for the selected week: total tracked hours, overtime, and combined total.

**Member picker** — use the dropdown at the top-right to filter the entire Work Diary view to one team member. This is useful when reviewing an individual's week.

### Day detail — sessions and screenshots

Clicking a day bar opens a slide-in panel from the right:

```
┌───────────────────────────────────────────────────────────────┐
│  Monday, June 2                                          [X]  │
│  Total: 9:10 hrs  ●  2 sessions                              │
├───────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐    │
│  │ ● 9:00 AM – 11:30 AM (2:30 hrs)            82% avg   │    │
│  │ Website Redesign · Hero section layout                │    │
│  ├───────────────────────────────────────────────────────┤    │
│  │ [9:10] [9:20] [9:30] [9:40] [9:50] [10:00] ──────►  │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐    │
│  │ ● 13:00 PM – 16:00 PM (3:00 hrs)           75% avg   │    │
│  │ Website Redesign · API integration                    │    │
│  ├───────────────────────────────────────────────────────┤    │
│  │ [13:10][13:20][13:30][13:40][13:50][14:00] ──────►   │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

Each **session block** shows:
- A colored dot matching the project colour
- Start time – end time and total duration
- Average activity % across all screenshots in the session
- A horizontally scrollable **screenshot filmstrip** — each thumbnail shows the capture time and a coloured activity bar at the bottom (green ≥70%, yellow ≥40%, red <40%)

**Click any screenshot thumbnail** to open the full screenshot modal.

### Screenshot modal

```
┌──────────────────────────────────────────────────────────────────────┐
│  James Wilson · Mon Jun 2 · 9:00 AM – 11:30 AM         12 of 14    │
├──────────────────────────────────────────────┬───────────────────────┤
│                                              │  Activity Level       │
│   [Blurred screenshot of the work session]   │  ██████████  9/10 min │
│                                              │                       │
│   Active window:                             │  Activity             │
│   Visual Studio Code — index.ts             │  ┌────────┬─────┬────┐│
│                                              │  │ Time   │ Key │ Mse││
│   ⌨ 342 keystrokes                          │  │ 9:10   │  32 │ 18 ││
│   🖱 187 mouse events                        │  │ 9:11   │  14 │ 27 ││
│                                              │  │ 9:12   │  48 │ 11 ││
│                                              │  │ ...    │ ... │ ...││
│                                              │  └────────┴─────┴────┘│
├──────────────────────────────────────────────┴───────────────────────┤
│  ← Previous   [🖼][🖼][🖼][🖼][🖼]   Next →                           │
└──────────────────────────────────────────────────────────────────────┘
```

**Left side:**
- The blurred screenshot (readable enough to confirm the type of work)
- Active window title — which application was in focus
- Total keystroke and mouse event counts for this 10-minute window

**Right side:**
- **Activity Level** — 10 coloured blocks representing each minute of the window; filled blocks = active minute
- **Per-minute breakdown table** — exact Time, Keyboard events, and Mouse events for each of the 10 minutes

**Navigation:**
- **← Previous / Next →** buttons or **arrow keys** on your keyboard
- Thumbnail filmstrip at the bottom — click any frame to jump directly
- **Escape** or click outside to close

> **Interpreting low activity:** A screenshot with 3/10 or 4/10 active minutes is not necessarily a problem. Reading documentation, attending a meeting on a second device, or reviewing designs will show low input activity. Use the active window title and screenshot context to judge.

---

## Timesheets

**URL:** `/timesheets`

The Timesheets page shows every time entry across all team members in a paginated table.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Member    │  Started         │  Project           │  Duration │ › │
├─────────────────────────────────────────────────────────────────────┤
│  J. Wilson │  Jun 2, 9:00 AM  │  ● Website Redesign│  2h 30m   │ › │
│  P. Patel  │  Jun 2, 10:00 AM │  ● Mobile App v2   │  1h 30m   │ › │
│  M. Johnson│  Jun 2, 9:30 AM  │  ● Backend Infra   │  3h 00m   │ › │
│  ...       │                  │                    │           │   │
└─────────────────────────────────────────────────────────────────────┘
    35 total entries                         Prev  1 / 2  Next
```

Each row shows: member avatar + name, start time, project (with colour dot), description snippet, duration, and status badge.

Click **any row** to open the entry detail panel.

### Entry detail panel

```
┌──────────────────────────────────────────────────────┐
│  [Avatar] James Wilson                          [X]  │
│           Monday, June 2                            │
├──────────────────────────────────────────────────────┤
│  ● Website Redesign · Hero section layout   Stopped  │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 2h 30m   │ │ 9:00 AM  │ │ 11:30 AM │ │  82%    │ │
│  │ Duration │ │ Started  │ │  Ended   │ │ Avg act.│ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
├──────────────────────────────────────────────────────┤
│  ⌨ 1,847 keystrokes  🖱 923 mouse events  📷 14 shots │
├──────────────────────────────────────────────────────┤
│  Activity timeline                                   │
│  ▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▓▓░░▓▓▓▓▓▓▓▓▓▓▓▓        │
│  9:00              10:00             11:30           │
├──────────────────────────────────────────────────────┤
│  Screenshots                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ...  │
│  │ 9:10 │ │ 9:20 │ │ 9:30 │ │ 9:40 │ │ 9:50 │      │
│  │ 82%  │ │ 71%  │ │ 90%  │ │ 85%  │ │ 78%  │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
└──────────────────────────────────────────────────────┘
```

The panel contains:
- **4 stat boxes**: Duration, Started, Ended, Average activity %
- **Input totals**: Keystroke count, mouse event count, screenshot count for the whole session
- **Activity timeline**: A bar chart where each bar = one 10-minute screenshot window; height and colour reflect activity level
- **Screenshot grid**: 3-column grid of thumbnails. Click any to open the [Screenshot modal](#screenshot-modal)

Close the panel by clicking **X** or clicking outside it.

---

## Team

**URL:** `/team`

The Team page lists every member in the system.

```
┌──────────────────────────────────────────────────────────────────┐
│  Team  6 members                          [ Invite member ]      │
├──────────────────────────────────────────────────────────────────┤
│  Member              Role    Status    This week  Timezone       │
├──────────────────────────────────────────────────────────────────┤
│  [SA] Sarah Chen     admin   Active    32.5h      America/NY     │
│  [JW] James Wilson   member  Active    28.0h      America/CH     │
│  [PP] Priya Patel    member  Active    25.5h      America/LA     │
│  [MJ] Marcus Johnson member  Active    18.0h      Europe/London  │
│  [ER] Emily Rodriguez member Inactive   0.0h      America/NY     │
│  [AK] Alex Kim       member  Active    12.5h      Asia/Seoul     │
└──────────────────────────────────────────────────────────────────┘
```

**Columns:**
- **Member**: Avatar (initials), full name (click to go to their profile), email
- **Role**: `admin` or `member` badge
- **Status**: `Active` (can log in) or `Inactive` (access blocked)
- **This week**: Total tracked hours Mon–Sun for the current week
- **Timezone**: The member's configured timezone

### Inviting a new member

Click **Invite member** to open the invite modal:

1. **Full name** — the member's display name
2. **Email** — their work email address; must be unique
3. **Role** — `member` for employees, `admin` for managers
4. **Temporary password** — minimum 8 characters; share this securely with the new member and ask them to change it

Click **Send invite** — the user account is created immediately and the member can log in to the desktop app right away.

> **Note:** Clockwork creates the account directly. If you have Supabase email confirmation enabled, the member may need to verify their email first.

### Member profile

Click any member's name to see their detail page:

```
┌──────────────────────────────────────────────────────────────────┐
│  [PP]  Priya Patel           member  Active       25.5h/week     │
│        priya@clockwork.app   America/Los_Angeles                 │
├──────────────────────────────────────────────────────────────────┤
│  Recent activity                                                 │
├──────────────────────────────────────────────────────────────────┤
│  Date         Project          Description         Duration  Sts  │
│  Jun 2, 9:00  Mobile App v2   Auth screens        2:30      ✓    │
│  Jun 2, 10:00 Mobile App v2   Push notifications  1:30      ✓    │
│  Jun 1, 9:30  Backend Infra   Docker refactor     3:00      ✓    │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

This page shows the member's profile, current week's hours, and their last 10 time entries.

### Deactivating a member

When someone leaves the team:

1. Go to **Team** → click the member's name → their profile doesn't have a deactivate button directly
2. Use the team list: click **PATCH /users/:id** via the API, or
3. Alternatively — in the Supabase dashboard, set `is_active = false` for that user row

> Deactivated members **cannot log in** to either the desktop app or the admin portal, even with a valid JWT. Their historical time data is preserved.

**Restoring access:** Set `is_active = true` in the users table.

---

## Projects

**URL:** `/projects`

Projects let you organise time entries. Members select a project when starting a timer.

```
┌──────────────────────────────────────────────────────────────────┐
│  Projects  5 projects                     [ New project ]        │
├──────────────────────────────────────────────────────────────────┤
│  Project                  Status    Total hours  Created         │
├──────────────────────────────────────────────────────────────────┤
│  ● Website Redesign       Active    145.5h       Jan 12          │
│  ● Mobile App v2          Active     89.0h       Jan 20          │
│  ● Backend Infrastructure Active     63.5h       Feb 05          │
│  ● Marketing Campaign     Active     42.0h       Mar 01          │
│  ● Legacy API Cleanup     Archived   28.0h       Nov 01          │
└──────────────────────────────────────────────────────────────────┘
```

**Creating a project:**
1. Click **New project**
2. Enter a name and optional description
3. Choose a colour from the swatch picker (used in charts and entry lists)
4. Click **Create**

**Archiving a project:** Click the delete button (trash icon) on the row — this permanently removes the project. Time entries that referenced it will show "No project" going forward.

> **Best practice:** Create projects that match your client billing structure or team workstreams. Encourage members to always select a project so your reports are meaningful.

---

## Reports

**URL:** `/reports`

Export time data for any date range.

```
┌──────────────────────────────────────────────────────────────────┐
│  Reports                                                         │
│                                                                  │
│  From: [ Jun 1, 2026 ]   To: [ Jun 7, 2026 ]                    │
│                                                                  │
│  [ Export CSV ]   [ Export HTML Report ]                         │
│                                                                  │
│  Leave date fields empty to export all time.                     │
└──────────────────────────────────────────────────────────────────┘
```

**Export CSV** — downloads `clockwork-report.csv` with columns:
- Date, User, Email, Project, Description, Duration (hours)

Open in Excel, Google Sheets, or any accounting tool.

**Export HTML Report** — downloads `clockwork-report.html`, a printable report showing:
- All time entries in the period
- Total hours and entry count at the bottom

Print from your browser (`File → Print` or `Cmd+P`) for a clean single-page summary.

**Filtering by date:** Leave the fields empty to export everything. Fill in a date range to limit the export.

> **Coming soon:** Per-member and per-project filtering via the URL parameters. Currently achievable via the API directly: `GET /api/v1/reports/csv?userId=…&from=…&to=…`

---

## Settings

**URL:** `/settings`

Application-wide configuration. Changes take effect immediately for all users.

### General settings

| Setting | Default | Description |
|---|---|---|
| **Company name** | Clockwork | Used in Slack messages and report headers |
| **Timezone** | UTC | Display timezone for the portal |
| **Screenshot interval** | 10 minutes | How often the desktop app captures screenshots (1–60 min) |

> Changing the screenshot interval takes effect the next time an employee logs in or restarts their timer.

### Slack integration

Clockwork can post a daily summary to a Slack channel at **09:00 UTC** each morning.

**To set up Slack:**
1. Go to `api.slack.com/apps` → create an app → **Incoming Webhooks** → activate → **Add New Webhook to Workspace**
2. Select the channel you want summaries posted to
3. Copy the webhook URL (starts with `https://hooks.slack.com/services/…`)
4. Paste it in the **Webhook URL** field in Settings
5. Click **Send test message** to confirm it works
6. Click **Save changes**

**Daily summary format:**
```
:clockwork: Daily Summary — Monday, Jun 2
• 5 members tracked time
• 38.4h total logged
```

---

## Common admin tasks

### How do I see who is working right now?

Go to **Dashboard** — the "Tracking now" panel shows every member currently running a timer with elapsed time.

### How do I review a specific person's work for a day?

1. Go to **Work Diary**
2. Select the member from the dropdown
3. Click the day on the calendar or on the bar chart
4. The day detail panel shows each session and all screenshots

### How do I dispute or correct a time entry?

Currently, direct editing of time entries is not available through the portal UI. Options:
- Delete the incorrect entry from the **Timesheets** page (click the entry → admin can delete any entry)
- Have the member re-track the correct time
- Or modify the entry directly in the Supabase dashboard (Table Editor → `time_entries`)

### How do I add a member who already has a Supabase auth account?

If the auth user exists but there's no row in `public.users`, create one manually in the Supabase SQL Editor:
```sql
INSERT INTO public.users (id, name, email, role, timezone)
VALUES ('<supabase-auth-uid>', 'Name', 'email@co.com', 'member', 'UTC');
```

### How do I export a month's data for payroll?

1. Go to **Reports**
2. Set **From** to the first of the month, **To** to the last of the month
3. Click **Export CSV**
4. Open in your spreadsheet tool and group/sum by user

### What do the activity percentages in screenshots mean?

| Percentage | Interpretation |
|---|---|
| **≥70%** | Actively working — consistent keyboard/mouse use |
| **40–69%** | Normal working pace — some pauses for reading or thinking |
| **<40%** | Low input — may be reading, in a meeting, or stepped away briefly |

Low activity is **not automatically a problem.** Use it as a signal to have a conversation if you see a pattern, not as grounds for action on a single screenshot.

### How do I check if the Slack integration is working?

Go to **Settings** → scroll to the **Slack integration** section → click **Send test message**. If it succeeds you'll see "Message sent!" in green. If it fails, double-check the webhook URL hasn't expired or been revoked.

### How do I give someone admin access?

1. Go to **Team** → find the member → their role shows `member`
2. Use the API directly: `PATCH /api/v1/users/:id` with `{ "role": "admin" }`
   Or in Supabase: `UPDATE public.users SET role = 'admin' WHERE email = '…'`
3. They'll have admin access on their next login

### How do I generate a report for a client?

1. Go to **Reports** → set the date range for the engagement
2. Export CSV for raw data, or HTML Report for a printable summary
3. The HTML report can be opened in a browser and printed to PDF via `Cmd+P` / `Ctrl+P`
