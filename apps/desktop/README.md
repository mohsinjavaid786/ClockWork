# apps/desktop — Clockwork Desktop App

> Electron 30 app (v1.1.11) for employees. Time tracking with pause/resume, multi-monitor screenshot capture (raw, no blur — Upwork-style) plus local JPEG thumbnails, global keyboard/mouse + active-window activity monitoring, on-disk session persistence with server-side reconciliation. React 19 renderer. macOS builds are Apple Silicon (arm64) only; Windows ships x64.

---

## Features

| Feature | Details |
|---|---|
| **Timer** | Start / **pause** / resume / stop with project + description selection; `HH:MM:SS` counter ticks client-side from `startedAt`. Paused time is excluded from the tracked duration. **Stop never hangs** — it clears state locally and returns instantly, then closes the entry on the server in the background with retries |
| **Time-bounded requests** | Every desktop API call goes through `AbortController` with a default ~20 s timeout (10 s for the background stop), so a stalled network call can never freeze the UI |
| **Session reconciliation** | On launch the app calls `GET /time-entries/current` and **re-adopts** any still-open entry (server is source of truth), so a reinstalled/updated client never gets stuck or starts a duplicate. If `Start` hits a 409 it adopts the existing entry rather than failing. A background poll also detects admin/server force-stops |
| **Version-gated login** | The session is version-stamped; on any app version change a **fresh login** is required. The persisted token is also validated against the API on startup and dropped if stale/expired — fixes the "signed in but every call 401s" state |
| **Screenshot capture** | `desktopCapturer` every N minutes (interval re-fetched from `GET /config` on login and each timer start); captures **every connected display** as a raw PNG (no blur, no post-processing — Upwork-style) AND a small JPEG thumbnail generated locally. Both are uploaded per display, sharing one `captured_at`; the API regenerates the thumbnail server-side if missing |
| **Activity tracking** | Global keystroke + mouse counting (`uiohook-napi`) and foreground-window capture (`active-win`); per-minute breakdown + activity % uploaded with each screenshot. Paused while the timer is paused. Needs macOS Accessibility + Screen Recording |
| **Session storage** | Token + user + timer state persisted as plain JSON in `app.getPath('userData')/session.json`, version-stamped — survives restarts. No OS keychain (an ad-hoc-signed app can't hold keychain access) |
| **System tray** | App minimizes to tray on close; tray shows a **blinking green dot** while tracking (built via `nativeImage.createFromBitmap`), static when idle; context menu for Show / Quit |
| **Auto-login** | On launch, reads the persisted session → restores the user without re-entering credentials (after version + token validation pass) |
| **Auto-update** | `electron-updater` checks GitHub Releases on every launch; downloads and installs updates silently |
| **Frame-free window** | 360×580 frameless window with draggable title bar; the title bar shows a **"CLOCKWORK" text wordmark** (left-padded on macOS to clear the traffic-light controls) |

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
│  │  window.clockwork.timer.pause()       React code      │ │
│  │  window.clockwork.timer.resume()                      │ │
│  │  window.clockwork.timer.stop()                        │ │
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

Clockwork mirrors the Upwork tracker model: every connected display is captured as a raw PNG every N minutes — no blur, no post-processing. A small JPEG thumbnail is also generated locally (`nativeImage` resize → `toJPEG`, no native deps) and uploaded alongside the PNG so the portal can render grids fast; the API regenerates a thumbnail server-side if one is missing. Each display becomes its own row in the `screenshots` table, sharing a `captured_at` timestamp so the admin portal can group them as one capture event.

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
   source.thumbnail.toPNG()             →  Buffer  (raw, unmodified)
   source.thumbnail.resize(480).toJPEG(70) →  Buffer  (local thumbnail)
        │
        ▼
   FormData {
     file,            ← raw PNG
     thumbnail,       ← local JPEG
     activityPercent, keyCount, mouseCount, minuteActivity, activeWindow?,
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
   │                           │───────────────────────►│  clearTimerState()      ← local, instant
   │                           │                        │  stopScreenshotLoop()
   │                           │                        │  updateTrayMenu(false)
   │  { running: false }       │◄───────────────────────│  (returns immediately)
   │◄──────────────────────────│                        │
   │                           │                        │  ░ background ░
   │                           │                        │  POST /time-entries/:id/stop
   │                           │                        │  (retries; never blocks UI)
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
| `IPC.TIMER_START` | `timer:start` | Start a time entry (re-fetches the screenshot interval; adopts an existing entry on 409) |
| `IPC.TIMER_PAUSE` | `timer:pause` | Pause the current entry (captures once, then stops captures + activity) |
| `IPC.TIMER_RESUME` | `timer:resume` | Resume a paused entry |
| `IPC.TIMER_STOP` | `timer:stop` | Stop locally and return instantly; close on the server in the background |
| `IPC.TIMER_GET_STATUS` | `timer:get-status` | Current timer state |
| `IPC.TIMER_REMOTE_STOP` | `timer:remote-stop` | **Main → renderer push** — the open entry was stopped server-side (admin override) |
| `IPC.SCREENSHOT_CAPTURE` | `screenshot:capture` | Reserved channel constant |
| `IPC.SCREENSHOT_UPLOAD` | `screenshot:upload` | Reserved channel constant |
| `IPC.ACTIVITY_GET` | `activity:get` | Activity % |
| `IPC.CONFIG_GET` | `config:get` | Fetch `screenshotIntervalMinutes` (+ company/timezone) |
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
│           v1.1.11              │
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
pnpm package   # electron-builder → release/ (.dmg + .zip arm64, .exe x64)
```

> **Local packaging caveat:** `electron-builder`'s `extraMetadata` rewrites this
> package's `package.json` in place during a local `pnpm package` and may leave it
> stripped. Restore it with `git checkout -- package.json` afterwards. CI is
> unaffected (it builds on a throwaway checkout), so prefer releasing via the tag
> → GitHub Actions flow rather than packaging locally.

### Publishing an update
1. Bump version in `package.json`
2. `git tag v1.x.x && git push origin main --tags`
3. The **Release** GitHub Action builds the macOS `.dmg` + `.zip` (arm64) and Windows `.exe` (x64), bakes in the `API_URL` repo variable, and publishes a GitHub Release automatically
4. `electron-updater` on the next client launch downloads + installs silently — on macOS the `.dmg` is the user-facing installer and the `.zip` is what the updater consumes

> macOS note: builds are **ad-hoc signed** (no Apple Developer cert), so macOS
> shows an "unverified developer" prompt and won't durably persist Accessibility /
> Screen Recording grants. Proper notarization (Developer ID + `CSC_LINK` /
> `CSC_KEY_PASSWORD`) removes this — electron-builder is already wired for it.
