# Changelog

All notable changes to Clockwork are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each tagged desktop release (`vX.Y.Z`) publishes installers to GitHub Releases
with the matching section below as its notes. Portal (Vercel) and API (Railway)
changes deploy continuously; changes not yet bundled into a desktop release are
listed under **[Unreleased]**.

## [Unreleased]

### Added
- **Dark / light mode** — a theme toggle in the top bar; tokens are CSS-variable
  driven so the whole portal flips instantly (persisted, no flash on load).
- **Scrubbable dashboard timeline** — a Mercury-style draggable/resizable date
  range over a month axis, plus presets (7d/30d/3m/6m/YTD/12m); the KPIs and
  hours chart filter to the selected window via a new `/reports/range` endpoint.
- **Screenshot zoom** — zoom (100–400%) and pan in the screenshot viewer.

### Changed
- **Status tags colour-coded** — active green, paused yellow, stopped red, admin
  blue, etc., each with a matching dot.
- **Work Diary moved under team member detail** — per-employee diary in a tab on
  the member page; the standalone route redirects to Team.
- Restored the ClockWork logo in the sidebar and inset dropdown chevrons.

### Fixed
- **Desktop never hangs on launch and signs out cleanly** — startup session
  validation is now time-bounded (a stalled network can't freeze the app on a
  blank screen), and a request that comes back 401 drops the session and returns
  to the login screen instead of leaving a signed-in-but-broken app.
- **Stop is honoured even if you quit immediately** — quitting while a background
  server-stop is still retrying now waits briefly for it to finish, so an entry
  isn't left running server-side until the next launch. The startup reconcile
  also no longer clobbers a timer you started while it was still loading.
- **One open timer per user** — the database now enforces a single running/paused
  entry per user, closing a race where two quick starts could open two entries.
- **Dashboard KPIs stay live** — Hours / Sessions / Screenshots and the chart now
  refresh every minute alongside the live roster, not only on manual refresh.
- **Screenshots can't desync** — switching between entries quickly no longer shows
  one entry's screenshots under another while requests race.
- **Reports week alignment** — the dashboard stat card now uses the same
  Monday-based week as the timeline and weekly chart.
- **Safer report exports** — CSV cells are escaped against spreadsheet formula
  injection and PDF/HTML fields are escaped against markup injection.
- **No orphaned thumbnails** — deleting an employee now also removes their
  screenshot thumbnails from storage (previously only full images were cleared).

### Security
- API responses no longer echo raw database error text (which could disclose
  schema); details are logged server-side and a generic message is returned.
- CORS no longer falls back to `localhost` with credentials when `ADMIN_URL` is
  unset in production; the portal API URL also fails loudly instead of silently
  defaulting to `localhost` in a production build.

### Changed (earlier)
- **Admin portal redesign (light, editorial)** — the entire portal moves from the
  dark monochrome theme to a light "Steep-inspired" editorial system: a fog
  canvas with white cards (24px radius, soft elevation), Inter + Newsreader
  (serif headings) typography, pill buttons, and rust/blue as the only chart
  voices. Applied across the dashboard, timesheets, team, work diary, projects,
  reports, settings, drawers, and auth screens. Tokens live in
  `tailwind.config.ts`; the system is documented in `apps/admin/DESIGN.md`. The
  dashboard keeps its live refresh, Tracking Now roster, and clickable members.

## [1.1.11] - 2026-06-16

### Fixed
- **Stop button hang** — the desktop now stops tracking locally and updates the
  UI immediately, then closes the entry on the server in the background (bounded
  by a request timeout, with retries). Previously a stalled stop request had no
  timeout, so the button could hang indefinitely and a force-quit left the entry
  running on relaunch. All API requests from the desktop are now time-bounded.

## [1.1.10] - 2026-06-16

### Added
- **Admin can stop an employee's tracker remotely** — the *Stop tracker* button
  in the Timesheets drawer closes the entry server-side
  (`POST /time-entries/:id/admin-stop`); the employee's desktop app detects this
  within ~30s, stops tracking, and shows *"Your tracker was stopped by an
  administrator."* (the employee can start a new session anytime).
- **Live logged hours** — the dashboard's Today/This-week totals and the weekly
  chart now include time from currently-running trackers (updated as it accrues,
  not only after stop); the dashboard auto-refreshes every minute.
- **Dashboard refresh button**, and the *Tracking now* entries are now clickable
  and open the member's detail page.
- **Automatic screenshot thumbnails** — the API generates a small JPEG thumbnail
  with `sharp` at upload time, and the drawer auto-backfills any older
  screenshots missing one (scoped to the entry's window) on open — no manual
  step. Grids/filmstrips show only the lightweight thumbnail; the full-resolution
  screenshot loads only when opened in the modal.
- **Paginated, sortable screenshots** — the drawer lists 10 screenshots per page
  with prev/next and a sort control (newest / oldest / most active / least
  active), in a wider (920px) layout.
- **Real filmstrip thumbnails + shimmer skeletons** — the screenshot modal's
  filmstrip now shows real thumbnails, and drawers/tiles/the full image display a
  shimmer skeleton while loading and fade in once decoded.

### Fixed
- **Screenshots not loading** — grids now load only the small thumbnail (never
  the multi-MB full-resolution PNG) and fall back to a skeleton on a missing or
  failed image instead of a broken-image icon.
- **API healthcheck** — the Docker healthcheck now hits the public `/health`
  endpoint; it previously hit `/config`, which became auth-protected and returned
  401 (marking the container unhealthy).

## [1.1.9] - 2026-06-16

### Fixed
- **Start tracking works after a lost session** — the desktop now reconciles its
  timer against the server on launch and re-adopts any still-open entry, instead
  of failing with a silent 409 when the server already had an open entry the
  client didn't know about.

### Added
- `GET /time-entries/current` — returns the caller's open (running/paused) entry,
  enabling the client/server reconciliation above.

## [1.1.8] - 2026-06-15

### Fixed
- **Fresh login required on install/update** — the persisted session lives in
  `userData` (which survives deleting the app on macOS), so updated/reinstalled
  builds were silently signing the user back in, often with an expired token. The
  session is now version-stamped and the token is validated on startup; a stale
  token is dropped and the app falls back to the login screen.
- **Tray tracking dot** — the green "tracking" indicator renders correctly now
  (`createFromBitmap` for the raw pixel buffer; `createFromBuffer` produced an
  empty icon).

## [1.1.7] - 2026-06-15

### Added
- **Timezone switcher** for viewing entries (My Time / UTC / employee's time).
- **Screenshot thumbnails** for fast grid loading.
- **Toast notifications** for success/error across the portal.
- Invite form gains an optional **temporary password** and a **timezone** field.

### Fixed
- Desktop resumes an open session on relaunch (timer + screenshot capture), shows
  a blinking tray indicator while tracking, and fixes the macOS title overlap.
- Screenshot modal's per-minute table scrolls internally instead of growing the
  modal.
- Admins are excluded from the Work Diary member picker.

## [1.1.6] - 2026-06-15

### Added
- **Email (Resend)** — invite and password-reset emails; invites link to the
  latest macOS/Windows installers.
- **Password set/reset pages** and email-based invite flow in the portal.
- **Team management** — delete an employee (with cascade warning), signup status
  (pending/accepted), in-portal installer downloads, and separate
  Employees/Admins tabs.
- Installers are hosted in a public Supabase bucket for direct download links.

### Fixed / Security
- **Role-based access** — the portal and dashboard APIs are now restricted to
  admins (closing direct/Postman access by non-admins).

## [1.1.5] - 2026-06-14

### Changed
- Desktop resolves its API URL dynamically (never hardcoded), and debug
  screenshot logging was removed.

## [1.1.4] - 2026-06-14

### Fixed
- Desktop refreshes the screenshot interval on every timer start, so an admin's
  interval change takes effect without the employee signing out.

## [1.1.3] - 2026-06-14

### Fixed
- Desktop uploads screenshots to the production API instead of localhost.

## [1.1.2] - 2026-06-14

### Fixed
- Desktop no longer uses the macOS keychain (which prompted on every launch for
  an un-notarized app); the session is persisted to disk instead.

## [1.1.1] - 2026-06-14

### Fixed
- Desktop exits properly on Quit, reaches the production API, and hardens the
  auto-updater.
- Packaged app renders correctly (relative asset paths under `file://`).
- CI pins pnpm to 11.4.0 so Vercel reads the lockfile correctly.

## [1.1.0] - 2026-06-14

Initial production release of the rebuilt Clockwork.

### Added
- **Desktop tracker** — pause/resume, real keystroke/mouse/active-window capture
  with per-minute detail, app/tray icons, and an ad-hoc-signed macOS build.
- **Admin portal** — live Work Diary and screenshots wired to per-account data,
  Timesheet entry detail with screenshots and paused time, branding/favicon.
- **API** — pause/resume endpoints, screenshot activity detail, and corrected
  RLS policies (admin-only user management, auth isolated from the service-role
  client).
- Packaging fixes so the release build bundles all runtime deps.
