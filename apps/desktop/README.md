# apps/desktop — Clockwork Desktop App

> Cross-platform Electron 30 app for employees. Time tracking with pause/resume, multi-monitor screenshot capture (raw, no blur — Upwork-style), global keyboard/mouse + active-window activity monitoring, on-disk session persistence. React 19 renderer. Supports macOS (Apple Silicon + Intel) and Windows (x64).

---

## Features

| Feature | Details |
|---|---|
| **Timer** | Start / **pause** / resume / stop with project + description selection; `HH:MM:SS` counter ticks client-side from `startedAt`. Paused time is excluded from the tracked duration |
| **Screenshot capture** | `desktopCapturer` every N minutes (interval re-fetched from `GET /config` on each timer start); captures **every connected display** as raw PNG. No blur, no post-processing — managers see actual screen content, identical to Upwork's tracker. One upload per display per capture event |
| **Activity tracking** | Global keystroke + mouse counting (`uiohook-napi`) and foreground-window capture (`active-win`); per-minute breakdown + activity % uploaded with each screenshot. Paused while the timer is paused. Needs macOS Accessibility + Screen Recording |
| **Session storage** | Token + user + timer state persisted as plain JSON in `app.getPath('userData')/session.json` — survives restarts. No OS keychain (an ad-hoc-signed app can't hold keychain access) |
| **System tray** | App minimizes to tray on close; tray icon updates to show tracking state; context menu for Show / Quit |
| **Auto-login** | On launch, reads the persisted session → restores the user without re-entering credentials |
| **Auto-update** | `electron-updater` checks GitHub Releases on every launch; downloads and installs updates silently |
| **Frame-free window** | 360×580 frameless window with draggable title bar (`-webkit-app-region: drag`) |

---

## Security Model

```
┌────────────────────────────────────────────────────────────┐
│                  Electron Process Model                    │
│                                                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Renderer Process  (sandbox: false, isolated)         │ │
│  │                                                       │ │
│  │  React 19 + Vite                                      │ │
│  │  LoginScreen / TrackerScreen                          │ │
│  │                                                       │ │
│  │  window.clockwork.auth.login()    ◄── only surface    │ │
│  │  window.clockwork.timer.start()       available to    │ │
│  │  window.clockwork.timer.stop()        React code      │ │
│  │  window.clockwork.timer.getStatus()                   │ │
│  │  window.clockwork.projects.list()                     │ │
│  │  window.clockwork.app.version()                       │ │
│  └──────────────────┬────────────────────────────────────┘ │
│                     │  contextBridge (IPC only)            │
│  ┌──────────────────▼────────────────────────────────────┐ │
│  │  Preload Script (preload/index.ts)                    │ │
│  │  contextBridge.exposeInMainWorld('clockwork', api)    │ │
│  │  ipcRenderer.invoke() calls only                      │ │
│  └──────────────────┬────────────────────────────────────┘ │
│                     │  ipcMain.handle()                    │
│  ┌──────────────────▼────────────────────────────────────┐ │
│  │  Main Process (Node.js, full access)                  │ │
│  │                                                       │ │
│  │  TimerService        ← session.json + API calls       │ │
│  │  ScreenshotService   ← desktopCapturer (all displays) │ │
│  │  ActivityService     ← uiohook-napi + active-win      │ │
│  │  Tray                ← menu + icon state              │ │
│  │  autoUpdater         ← GitHub Releases                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  contextIsolation: true  ·  nodeIntegration: false        │
│  sandbox: false (preload requires @clockwork/shared)       │
└────────────────────────────────────────────────────────────┘
```

| Setting | Value | Reason |
|---|---|---|
| `contextIsolation` | `true` | Renderer JS cannot access Node globals |
| `nodeIntegration` | `false` | No `require()` in renderer |
| `sandbox` | `false` | Required so the preload can `require('@clockwork/shared')`; the renderer is still isolated and Node-free, reaching main only via the contextBridge |

---

## Screenshot Capture Flow

Clockwork mirrors the Upwork tracker model: every connected display is captured as a raw PNG every N minutes — no blur, no post-processing. Each display becomes its own row in the `screenshots` table, sharing a `captured_at` timestamp so the admin portal can group them as one capture event.

```
ScreenshotService.captureAndUpload()
        │
        ▼
desktopCapturer.getSources({ types: ['screen'] })
        │
        │   returns N sources — one per connected monitor
        ▼
capturedAt = new Date().toISOString()      ← shared across all displays
displayCount = sources.length
        │
        ▼
ActivityService.getActivityPercent()       ← reset counters after reading
        │
        ▼
for each source (1..N):
   source.thumbnail.toPNG()  →  Buffer  (raw, unmodified)
        │
        ▼
   FormData {
     file,
     activityPercent,
     screenNumber:  idx + 1,
     displayCount,
     capturedAt,
     timeEntryId?,
   }
        │
        ▼
   POST /api/v1/screenshots/upload
     Authorization: Bearer <session token>
        │
        ▼
   Supabase Storage → {userId}/{timestamp}-screen-{n}.png
   Database → INSERT screenshots row (one per display)
```

---

## IPC Architecture

```
Renderer                    Preload                    Main
   │                           │                        │
   │  window.clockwork         │                        │
   │  .auth.login(e,p)         │                        │
   │──────────────────────────►│                        │
   │                           │  ipcRenderer.invoke(   │
   │                           │    'auth:login',{e,p}) │
   │                           │───────────────────────►│
   │                           │                        │  POST /auth/login
   │                           │                        │  saveToken(token) → session.json
   │                           │                        │  saveUser(user)  → session.json
   │                           │  { id, name, role }   │
   │                           │◄───────────────────────│
   │  { id, name, role }       │                        │
   │◄──────────────────────────│                        │
   │                           │                        │
   │  .timer.start(proj,desc)  │                        │
   │──────────────────────────►│  'timer:start'        │
   │                           │───────────────────────►│  POST /time-entries/start
   │                           │                        │  saveTimerState()
   │                           │                        │  startScreenshotLoop()
   │                           │                        │  updateTrayMenu(true)
   │  { running, entryId }     │◄───────────────────────│
   │◄──────────────────────────│                        │
   │  Timer ticking            │                        │
   │  (client-side setInterval)│                        │
   │                           │  [every N minutes]     │
   │                           │                        │  captureAndUpload()
   │                           │                        │  → desktopCapturer (all displays)
   │                           │                        │  → for each screen:
   │                           │                        │      POST /screenshots/upload
   │                           │                        │      { screenNumber, displayCount }
   │                           │                        │
   │  .timer.stop()            │                        │
   │──────────────────────────►│  'timer:stop'         │
   │                           │───────────────────────►│  POST /time-entries/:id/stop
   │                           │                        │  clearTimerState()
   │                           │                        │  stopScreenshotLoop()
   │                           │                        │  updateTrayMenu(false)
   │  { running: false }       │◄───────────────────────│
   │◄──────────────────────────│                        │
```

---

## IPC Channel Reference

Defined in `@clockwork/shared` as the `IPC` constant object.

| Constant | Channel | Description |
|---|---|---|
| `IPC.AUTH_LOGIN` | `auth:login` | Login with email + password |
| `IPC.AUTH_LOGOUT` | `auth:logout` | Logout, clear all stored state |
| `IPC.AUTH_GET_TOKEN` | `auth:get-token` | Return decrypted token |
| `IPC.AUTH_GET_USER` | `auth:get-user` | Return stored user object |
| `IPC.TIMER_START` | `timer:start` | Start a time entry (re-fetches the screenshot interval) |
| `IPC.TIMER_PAUSE` | `timer:pause` | Pause the current entry (stops captures + activity) |
| `IPC.TIMER_RESUME` | `timer:resume` | Resume a paused entry |
| `IPC.TIMER_STOP` | `timer:stop` | Stop current entry |
| `IPC.TIMER_GET_STATUS` | `timer:get-status` | Current timer state |
| `IPC.ACTIVITY_GET` | `activity:get` | Activity % + reset counters |
| `IPC.CONFIG_GET` | `config:get` | Fetch `screenshotIntervalMinutes` |
| `IPC.PROJECTS_LIST` | `projects:list` | Project list for dropdown |
| `IPC.APP_VERSION` | `app:version` | `app.getVersion()` |

---

## Project Layout

```
src/
├── main/
│   ├── index.ts                    # BrowserWindow, IPC handlers, lifecycle
│   ├── config.ts                   # dynamic API_BASE resolver (env → injected → localhost)
│   ├── tray.ts                     # Tray icon + context menu
│   └── services/
│       ├── timer.service.ts        # session.json: token, user, timer state
│       ├── screenshot.service.ts   # desktopCapturer (every display) + upload (raw, no blur)
│       └── activity.service.ts     # uiohook-napi keys/mouse + active-win window
│
├── preload/
│   └── index.ts                    # contextBridge → window.clockwork
│
└── renderer/
    ├── index.html                  # HTML shell + Content-Security-Policy
    ├── main.tsx                    # ReactDOM.createRoot → <App />
    ├── App.tsx                     # Auth gate: LoginScreen or TrackerScreen
    ├── globals.css                 # CSS variables, no Tailwind
    ├── types.d.ts                  # window.clockwork: { auth, timer, … }
    └── screens/
        ├── LoginScreen.tsx         # Email/password + draggable title bar
        └── TrackerScreen.tsx       # HH:MM:SS + project picker + start/stop
```

---

## UI Screens

### LoginScreen
```
┌────────────────────────────────┐
│ CLOCKWORK            [drag]    │
├────────────────────────────────┤
│                                │
│         Sign in                │
│   Use your Clockwork account   │
│                                │
│  ┌──────────────────────────┐  │
│  │  email@company.com       │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │  ••••••••                │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │       Sign in            │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### TrackerScreen
```
┌────────────────────────────────┐
│ CLOCKWORK        [Sign out]    │
├────────────────────────────────┤
│          Sarah Chen            │
│                                │
│  ┌──────────────────────────┐  │
│  │     02:34:17             │  │
│  │                          │  │
│  │  Website Redesign        │  │  ← shown when running
│  │  ● Tracking              │  │
│  └──────────────────────────┘  │
│                                │
│  [Project dropdown]            │  ← shown when stopped
│  [What are you working on?]    │
│                                │
│  ┌──────────────────────────┐  │
│  │     Stop tracking        │  │
│  └──────────────────────────┘  │
│                                │
│           v1.0.0               │
└────────────────────────────────┘
```

---

## Environment Variables

The API URL is resolved dynamically by `src/main/config.ts` — never hardcoded:

1. **`API_URL`** env var — used in dev (`API_URL=… pnpm dev`)
2. **build-time injection** — when packaging, electron-builder reads `API_URL` and
   writes it into the packaged `package.json` (`extraMetadata.apiUrl`), which the
   app reads at runtime. The release workflow supplies it from a GitHub
   **repository variable** named `API_URL` (Settings → Secrets and variables →
   Actions → Variables)
3. **`http://localhost:3001`** — dev fallback when neither is set

```env
API_URL=http://localhost:3001   # dev only
```

---

## Running & Building

```bash
pnpm dev       # Vite :5173 + Electron (with HMR)
pnpm build     # vite build + tsc -p tsconfig.electron.json
pnpm package   # electron-builder → release/ (.dmg, .exe)
```

> **Local packaging caveat:** `electron-builder`'s `extraMetadata` rewrites this
> package's `package.json` in place during a local `pnpm package` and may leave it
> stripped. Restore it with `git checkout -- package.json` afterwards. CI is
> unaffected (it builds on a throwaway checkout), so prefer releasing via the tag
> → GitHub Actions flow rather than packaging locally.

### Publishing an update
1. Bump version in `package.json`
2. `git tag v1.x.x && git push origin main --tags`
3. The **Release** GitHub Action builds the macOS `.dmg` + Windows `.exe`, bakes in the `API_URL` repo variable, and publishes a GitHub Release automatically
4. `electron-updater` on the next client launch downloads + installs silently

> macOS note: builds are **ad-hoc signed** (no Apple Developer cert), so macOS
> shows an "unverified developer" prompt and won't durably persist Accessibility /
> Screen Recording grants. Proper notarization (Developer ID + `CSC_LINK` /
> `CSC_KEY_PASSWORD`) removes this — electron-builder is already wired for it.
