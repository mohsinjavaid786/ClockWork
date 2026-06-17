# Clockwork — Admin Guide

> This guide is for **administrators** who manage the team through the Clockwork web portal. It covers every page, every action, and how to interpret the data.

---

## Table of Contents

- [Accessing the portal](#accessing-the-portal)
- [The top bar — theme and timezone](#the-top-bar--theme-and-timezone)
- [Demo mode](#demo-mode)
- [Dashboard](#dashboard)
- [Timesheets](#timesheets)
  - [Entry detail drawer](#entry-detail-drawer)
  - [Screenshot grid](#screenshot-grid)
  - [Screenshot viewer](#screenshot-viewer)
  - [Force-stopping a stuck tracker](#force-stopping-a-stuck-tracker)
- [Team](#team)
  - [Inviting a new member](#inviting-a-new-member)
  - [Member detail page](#member-detail-page)
  - [Work diary tab](#work-diary-tab)
  - [Deleting a member](#deleting-a-member)
  - [Downloading the installers](#downloading-the-installers)
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

## The top bar — theme and timezone

Every page has a sticky top bar. On the right-hand side you'll find two controls that apply across the whole portal.

**Theme toggle.** Clockwork uses a light, editorial theme by default. Click the **sun / moon button** in the top bar to switch between **Light** and **Dark** mode. Your choice is remembered in this browser, so the portal opens in your preferred theme next time.

**Timezone switcher.** A globe dropdown next to the theme toggle controls how every time and date in the portal is displayed:

- **My time** — your own local timezone (the offset is shown in the label, e.g. `My time (UTC+5:00)`)
- **UTC** — coordinated universal time, useful when comparing members across regions
- **Employee's time** — the timezone of the employee you're currently viewing. This option only appears when you're on a member's detail page.

Switching the timezone re-labels timestamps everywhere — the dashboard, timesheets, the work diary and the screenshot viewer all follow this setting.

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

The dashboard gives you a live snapshot of the team's activity over a date range you choose.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Dashboard          [ Last 7 days ▾ ]                 [ ↻ Refresh ]        │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Apr   May   Jun ▏▒▒▒▒▒▒▒▒▒▒▏ Jul   Aug      ← draggable timeline    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ Hours tracked│ │  Active now  │ │  Sessions    │ │ Screenshots  │      │
│  │  145.5       │ │  3 members   │ │  35          │ │  412         │      │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                                            │
│  ┌────────────────────────────────────────┐  ┌──────────────────────┐    │
│  │  Hours over period (bar chart)         │  │  Tracking now    ● 2 │    │
│  │  ████ ██████ ████████ ██████ ███        │  │  ● James Wilson      │    │
│  │                                        │  │    Website · 1h 23m  │    │
│  │                                        │  │  ● Priya Patel       │    │
│  └────────────────────────────────────────┘  └──────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Choosing the date range

Everything on the dashboard — the KPI cards and the hours chart — reflects the date range you select. There are two ways to set it:

- **Preset dropdown** — pick from **Last 7 days**, **Last 30 days**, **Last 3 months**, **Last 6 months**, **Year to date**, or **Last 12 months**.
- **Draggable timeline** — the horizontal band above the cards is a scrubber. **Drag the middle** of the highlighted band to slide the range earlier or later, or **drag either edge** to make the range wider or narrower. Dragging the timeline switches the dropdown to a custom range.

Click **Refresh** at any time to pull the latest numbers.

**KPI cards** (all scoped to the selected range):
- **Hours tracked** — total hours logged in the period
- **Active now** — number of members currently running a timer (live, not range-bound)
- **Sessions** — number of time entries in the period
- **Screenshots** — number of screenshots captured in the period

**Hours over period** — a bar chart of hours across the selected range. Hover a bar to see the exact value.

**Tracking now** — a live panel listing every member currently running a timer, with their project and how long the current session has been running. The green badge shows how many people are active, and the list auto-refreshes about once a minute. **Click any member** to jump straight to their detail page.

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

Each row shows: member avatar + name, start time, project (with colour dot), description snippet, duration, and a colour-coded status badge. The table is paginated (25 entries per page).

> **Status colours.** Status badges are colour-coded throughout the portal: **green** = active / running, **yellow** = paused, **red** = stopped or failed, **grey** = inactive / archived.

Click **any row** to open the entry detail drawer.

### Entry detail drawer

Clicking a row slides a **floating detail drawer** in from the right. The rest of the page **dims and blurs** behind it so you can focus on the entry. Close the drawer with the **X** button or by clicking the blurred backdrop.

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
│  Screenshots               Sort: [ Newest first ▾ ]  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 9:10 │ │ 9:20 │ │ 9:30 │ │ 9:40 │ │ 9:50 │        │
│  │ 82%  │ │ 71%  │ │ 90%  │ │ 85%  │ │ 78%  │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                       Prev 1/2 Next   │
└──────────────────────────────────────────────────────┘
```

The drawer contains:
- **4 stat boxes**: Duration, Started, Ended, Average activity %
- **Input totals**: keystroke count, mouse event count, and screenshot count for the whole session
- **Screenshot grid** (see below)
- For entries that are still **running** or **paused**, a **Stop tracker** button (see [Force-stopping a stuck tracker](#force-stopping-a-stuck-tracker))

### Screenshot grid

The screenshots for the entry are shown in a grid, **10 per page**. Use the **Sort** dropdown to order them by **Newest first**, **Oldest first**, **Most active**, or **Least active**, and the **Prev / Next** controls to page through them.

Each tile shows the raw thumbnail, the capture time, the activity % (colour-coded: green ≥70%, yellow ≥40%, red <40%), and the input counts. For employees with multiple monitors, a small badge marks which screen the image came from (`Screen 1 of 2`, etc.).

**Click any thumbnail** to open the full screenshot viewer.

### Screenshot viewer

```
┌──────────────────────────────────────────────────────────────────────┐
│  James Wilson · Mon Jun 2 · 9:00 AM – 11:30 AM         12 of 14    │
├──────────────────────────────────────────────┬───────────────────────┤
│                                              │  Activity Level       │
│   [Raw screenshot of the work session]       │  ██████████  9/10 min │
│                                              │                       │
│   Active window:                             │  Activity             │
│   Visual Studio Code — index.ts             │  ┌────────┬─────┬────┐│
│                                              │  │ Time   │ Key │ Mse││
│   ⌨ 342 keystrokes                          │  │ 9:10   │  32 │ 18 ││
│   🖱 187 mouse events                        │  │ 9:11   │  14 │ 27 ││
│                                              │  │ ...    │ ... │ ...││
├──────────────────────────────────────────────┴───────────────────────┤
│  ← Prev   [🖼][🖼][🖼][🖼][🖼]   Next →     [ − ] 150% [ + ] [ ⤢ ]   │
└──────────────────────────────────────────────────────────────────────┘
```

**Left side:**
- The captured screenshot at full resolution — **raw, no blur** (Upwork-style). Use this to verify the work being done
- For employees with multiple monitors, the header shows `Screen N of M` and each display appears as its own tile in the filmstrip
- Active window title — which application was in focus
- Total keystroke and mouse event counts for this window

**Right side:**
- **Activity Level** — coloured blocks representing each minute of the window; filled blocks = active minute
- **Per-minute breakdown table** — exact Time, Keyboard events, and Mouse events for each minute

**Zooming and panning:**
- **Zoom** between 100% and 400% using the **scroll wheel**, the **+ / −** buttons, or **double-click** to toggle 2× zoom. The current zoom level is shown in the control bar; the **reset** button (⤢) returns to 100%.
- When zoomed in, **drag the image** to pan around it.

**Navigation:**
- **← Previous / Next →** buttons or the **left / right arrow keys**
- Thumbnail filmstrip at the bottom — click any frame to jump directly
- **Escape** to close

> **Interpreting low activity:** A screenshot with 3/10 or 4/10 active minutes is not necessarily a problem. Reading documentation, attending a meeting on a second device, or reviewing designs will show low input activity. Use the active window title and screenshot context to judge.

### Force-stopping a stuck tracker

If a member's timer is still **running** or **paused** — for example, they forgot to stop at the end of the day, or their machine went offline mid-session — you can close it from the server side:

1. Open the entry's detail drawer from the **Timesheets** table.
2. Click **Stop tracker**.
3. Confirm in the dialog ("Force-stop {name}'s tracker? The entry will be closed now.").

The entry is closed immediately and recorded as stopped. The member's desktop app reconciles with the server on its next check.

---

## Team

**URL:** `/team`

The Team page lists every member in the system.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Team  6 members    [⬇ macOS] [⬇ Windows]            [ Invite member ]    │
│  [ Employees · 5 ]  [ Admins · 1 ]                                         │
├──────────────────────────────────────────────────────────────────────────┤
│  Member              Role    Status    Signup    This week  Timezone   ⋮  │
├──────────────────────────────────────────────────────────────────────────┤
│  [JW] James Wilson   member  Active    Accepted  28.0h      America/CH  🗑 │
│  [PP] Priya Patel    member  Active    Accepted  25.5h      America/LA  🗑 │
│  [MJ] Marcus Johnson member  Active    Pending   18.0h      Europe/Lon  🗑 │
│  [AK] Alex Kim       member  Active    Accepted  12.5h      Asia/Seoul  🗑 │
└──────────────────────────────────────────────────────────────────────────┘
```

The page has **Employees** and **Admins** tabs (each shows a count). Columns:
- **Member**: avatar (initials), full name (click to open their detail page), email
- **Role**: colour-coded `admin` or `member` badge
- **Status**: `Active` (can log in) or `Inactive` (access blocked)
- **Signup**: invite status — **Pending** (invited, not yet set a password) or **Accepted**
- **This week**: total tracked hours Mon–Sun for the current week
- **Timezone**: the member's configured timezone
- A **delete** (trash) action on each row

### Inviting a new member

Click **Invite member** to open the invite modal:

1. **Full name** — the member's display name
2. **Email** — their work email address; must be unique
3. **Role** — `Member` for employees, `Admin` for managers
4. **Timezone** — the member's working timezone
5. **Temporary password** *(optional)* — minimum 8 characters

Click **Send invite**.

- If you **leave the temporary password blank**, the member receives an **email with a set-password link** plus links to download the Mac and Windows desktop apps. The account becomes usable once they choose their password.
- If you **set a temporary password**, the account is ready immediately — share the password securely and ask the member to change it after first login.

> Their **Signup** status shows **Pending** until they set a password (or log in), then flips to **Accepted**.

### Member detail page

Click any member's name to open their detail page. At the top you'll see their profile (name, email, role, status, timezone, current week's hours). The page has tabs:

- **Overview** — recent time entries and a summary of the member's activity
- **Work diary** — see below

> When viewing a member, the top-bar timezone switcher gains the **Employee's time** option, letting you read all their times in their own timezone.

### Work diary tab

The **work diary** (previously a separate top-nav page) now lives as a tab on each member's detail page: **Team → click a member → Work diary**. It is the most detailed time overview for that one employee, combining a monthly calendar with a weekly bar chart — similar to Upwork's time tracking view.

```
┌──────────────────────┐  ┌────────────────────────────────────────────────┐
│  June 2026     < >   │  │  Jun 1 – Jun 7                                 │
│                      │  │  1 Monday    ████████████████████  9:10 hrs    │
│  M  T  W  T  F  S  S │  │  2 Tuesday   ████████████████████  9:10 hrs    │
│  1  2  3  4  5  6  7 │  │  3 Wednesday █████████████████████ 10:00 hrs   │
│  ●  ●  ●  ■  ●       │  │  4 Thursday  ████████████████■■■   8:10 hrs    │
│  8  9 10 11 12 13 14 │  │  5 Friday    ████████              4:00 hrs    │
│ 15 16 17 18 19 20 21 │  │  6 Saturday  ──────────────         0:00 hrs   │
│ 22 23 24 25 26 27 28 │  │  7 Sunday    ──────────────         0:00 hrs   │
│  ● Tracked  ■ Overtime│  │  Tracked 40:20  Overtime 0:10  Total 40:30   │
└──────────────────────┘  └────────────────────────────────────────────────┘
```

**Calendar (left):**
- Each day shows a **green dot** if there are tracked entries that day
- A **red square** appears when the member logged more than 8 hours that day (overtime)
- Click any day to select that **whole week** — the bar chart updates to show Mon–Sun for that week
- The **< >** arrows navigate between months

**Weekly bar chart (centre):** one row per day of the selected week.

| Bar colour | Meaning |
|---|---|
| Green | Regular hours (up to 8h for that day) |
| Red extension | Overtime — hours beyond 8 on that day |
| Grey | No time logged |

Bar widths are proportional. The footer shows the week's totals: tracked hours, overtime, and combined total.

**Day drill-down:** click any day's bar (when it has hours) to open a detail panel listing that day's sessions and screenshots. Each session shows the project, start/end times, duration, average activity %, and a screenshot filmstrip; clicking a screenshot opens the same [screenshot viewer](#screenshot-viewer) described above.

### Deleting a member

When someone leaves the team, click the **trash** icon on their row.

> **Warning:** A confirmation dialog appears stating that deleting a member also **deletes all of their time entries and screenshots**, and that this **cannot be undone**. Export any reports you need first.

Confirm with **Delete permanently** to remove the member and all their data.

### Downloading the installers

The Team page header has **macOS** and **Windows** download buttons that link to the latest desktop installers (served from the public `installers` bucket). Use these to grab the apps yourself, or point new members at the download links included in their invite email.

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

Go to **Dashboard** — the "Tracking now" panel shows every member currently running a timer with elapsed time. Click a member to jump to their detail page.

### How do I review a specific person's work for a day?

1. Go to **Team** → click the member's name
2. Open the **Work diary** tab
3. Click the day on the calendar (this selects its week), then click the day's bar
4. The day detail panel shows each session and all screenshots

### How do I close a timer a member forgot to stop?

1. Go to **Timesheets** and click the running/paused entry to open its drawer
2. Click **Stop tracker** and confirm. The entry is closed immediately.

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
