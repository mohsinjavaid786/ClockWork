# apps/desktop — TrackDesk Desktop App

The cross-platform Electron app that employees install on their machines. It handles time tracking, screenshot capture, activity monitoring, and syncs everything to the backend API.

Supports **macOS** (Apple Silicon + Intel) and **Windows** (x64).

---

## Table of Contents

- [Stack](#stack)
- [Security Model](#security-model)
- [Project Layout](#project-layout)
- [Environment Variables](#environment-variables)
- [Running in Development](#running-in-development)
- [Main Process Services](#main-process-services)
  - [AuthService](#authservice)
  - [TimerService](#timerservice)
  - [ScreenshotService](#screenshotservice)
  - [ActivityService](#activityservice)
- [Preload Bridge](#preload-bridge)
- [Renderer (React UI)](#renderer-react-ui)
- [System Tray](#system-tray)
- [Auto-Update](#auto-update)
- [IPC Channel Reference](#ipc-channel-reference)
- [Packaging & Distribution](#packaging--distribution)
- [Native Modules](#native-modules)

---

## Stack

| Concern | Library |
|---|---|
| Shell | Electron 30 |
| Renderer build | Vite 5 + @vitejs/plugin-react |
| UI framework | React 18 + TypeScript |
| Screenshot blur | sharp (native, Gaussian σ=3) |
| Activity tracking | uiohook-napi (native) |
| Secure token storage | electron.safeStorage (OS keychain) |
| Auto-updates | electron-updater (GitHub Releases) |
| Installer | electron-builder (`.dmg` + `.exe` NSIS) |

---

## Security Model

The renderer process is treated as an untrusted browser context:

| Setting | Value | Why |
|---|---|---|
| `contextIsolation` | `true` | Renderer JS cannot access Node globals |
| `nodeIntegration` | `false` | No `require()` in renderer |
| `sandbox` | `true` | OS-level process sandboxing |

**All communication** between renderer and main process flows through the typed IPC bridge defined in `src/preload/preload.ts`. The bridge is exposed as `window.trackdesk` via `contextBridge.exposeInMainWorld`. No Node API is directly accessible from React components.

Tokens are encrypted with the OS keychain via `electron.safeStorage.encryptString()` on platforms that support it (macOS Keychain, Windows Credential Store). On platforms where encryption is unavailable, the plain token is stored in process memory for the session only.

---

## Project Layout

```
src/
├── main/
│   ├── main.ts                     # App entry — window, tray, IPC handlers, lifecycle
│   └── services/
│       ├── auth.service.ts         # Login, token encryption/decryption via safeStorage
│       ├── timer.service.ts        # Start/stop timer, persist state, IPC tick events
│       ├── screenshot.service.ts   # desktopCapturer → sharp blur → API upload
│       └── activity.service.ts     # uiohook-napi keyboard/mouse → activity %
│
├── preload/
│   └── preload.ts                  # contextBridge.exposeInMainWorld('trackdesk', api)
│
└── renderer/
    ├── index.html                  # HTML shell with strict CSP
    ├── main.tsx                    # ReactDOM.createRoot
    ├── App.tsx                     # Auth gate — shows LoginPage or TrackerPage
    ├── global.d.ts                 # declare window.trackdesk: TrackdeskAPI
    ├── index.css
    └── pages/
        ├── LoginPage.tsx           # Email/password form
        └── TrackerPage.tsx         # Timer display, start/stop, screenshot notifications

resources/
├── tray-idle.png                   # Tray icon — timer stopped
└── tray-active.png                 # Tray icon — timer running

electron-builder.config.js         # Mac (.dmg + .zip) + Windows (NSIS) config
vite.config.ts                      # Renderer build config
tsconfig.json                       # Renderer TS config
tsconfig.electron.json              # Main process TS config (CommonJS)
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

`VITE_*` variables are inlined at build time by Vite. The main process reads them from `process.env` directly (Electron forwards them when launching).

---

## Running in Development

```bash
# From the repo root
pnpm dev:desktop

# Or from this directory — starts Vite dev server + Electron concurrently
pnpm dev
```

In dev mode:
- Vite serves the renderer at `http://localhost:5173`
- Electron loads that URL directly
- DevTools open in a detached window
- Hot module replacement works for renderer code

Changes to main process files require a restart.

---

## Main Process Services

### AuthService

**File:** `src/main/services/auth.service.ts`

Wraps the `/auth/login` API call and handles secure token persistence.

```
login(email, password)
  → POST /auth/login
  → On success: encrypt token with safeStorage → store in process.env
  → Store user JSON in process.env

getToken() → decrypt and return token (or null)
getUser()  → parse and return user JSON (or null)
logout()   → delete both stored values
```

Why `process.env` for in-memory storage? It's scoped to the main process, never accessible from the renderer, and Electron does not persist it across launches unless explicitly written to disk. On the next launch, `getToken()` returns `null` if nothing is stored — which is the intended behavior for the plain-text fallback. The encrypted form can be persisted to a local file if needed (not implemented here; extend `storeToken` to write to `app.getPath('userData')`).

### TimerService

**File:** `src/main/services/timer.service.ts`

Manages the running timer state and coordinates with the API.

```
start(projectId?, description?)
  → POST /time-entries/start
  → Store TimerState { entryId, startedAt, projectId, description } (encrypted)
  → Begin 1-second setInterval → emit tick events to renderer via IPC

stop()
  → POST /time-entries/stop
  → Clear stored state
  → Stop interval

getState() → { entryId, startedAt, elapsed } | null
isRunning() → boolean
```

**Persistence across restarts:** `TimerState` is serialized and encrypted with `safeStorage`, then stored in `process.env[TIMER_STATE_KEY]`. On construction, `TimerService` calls `restore()` — if a state is found, the timer resumes ticking immediately. This means if the app crashes mid-session, the timer re-opens from where it left off when the user relaunches.

### ScreenshotService

**File:** `src/main/services/screenshot.service.ts`

Manages the periodic screenshot capture loop.

```
start(entryId, intervalMs?)
  → Begin setInterval at intervalMs (default: 10 min)
  → Each tick:
      1. desktopCapturer.getSources({ types: ['screen'] })
      2. source.thumbnail.toPNG() → Buffer
      3. sharp(png).blur(3).jpeg({ quality: 75 }).toBuffer()
      4. Build FormData: file + metadata
      5. POST /screenshots/upload
      6. Call onCaptured callback → triggers tray notification

stop()
  → Clear interval
  → Stop ActivityService
```

The Gaussian blur (sigma = 3) is applied via `sharp`'s `.blur(n)` method before the image ever leaves the machine. The raw screenshot is never stored or uploaded.

### ActivityService

**File:** `src/main/services/activity.service.ts`

Tracks keyboard and mouse input using `uiohook-napi` (a native Node addon).

```
start()
  → Register mousemove, mousedown, keydown listeners via uIOhook
  → uIOhook.start() — begins global input hook
  → setInterval every 1 second:
      if (now - lastActivity < 5s) → activeSeconds++

flushWindow() → { activityPercent, isIdle }
  → activityPercent = Math.min(100, (activeSeconds / windowSeconds) * 100)
  → isIdle = (now - lastActivity) > 5 minutes
  → Resets activeSeconds and windowStart

stop()
  → uIOhook.stop()
  → Clear interval
```

`flushWindow()` is called by `ScreenshotService` just before each upload. The returned `activityPercent` is included in the screenshot metadata sent to the API.

---

## Preload Bridge

**File:** `src/preload/preload.ts`

Defines and exposes `window.trackdesk` — the only way for React components to communicate with the main process. The bridge is fully typed; `global.d.ts` imports `TrackdeskAPI` so TypeScript knows the shape of `window.trackdesk`.

```typescript
window.trackdesk = {
  auth: {
    login(email, password)   // → invoke AUTH_LOGIN
    logout()                 // → invoke AUTH_LOGOUT
    getToken()               // → invoke AUTH_GET_TOKEN
    getUser()                // → invoke AUTH_GET_USER
  },
  timer: {
    start(projectId?, desc?) // → invoke TIMER_START
    stop()                   // → invoke TIMER_STOP
    getState()               // → invoke TIMER_GET_STATE
    onTick(cb)               // → listen TIMER_TICK
    offTick()                // → removeAllListeners TIMER_TICK
  },
  screenshot: {
    onCaptured(cb)           // → listen SCREENSHOT_CAPTURED
    offCaptured()            // → removeAllListeners
  },
  tray: {
    onAction(cb)             // → listen TRAY_UPDATE
    offAction()
  },
  app: {
    getVersion()             // → invoke APP_GET_VERSION
    checkUpdate()            // → invoke APP_CHECK_UPDATE
  }
}
```

Every listener registration has a corresponding de-registration method so React components can clean up in `useEffect` return functions.

---

## Renderer (React UI)

### `App.tsx`

On mount, calls `window.trackdesk.auth.getUser()`. If a user is returned, renders `TrackerPage`. Otherwise renders `LoginPage`. This provides auto-login on app restart without re-entering credentials.

### `LoginPage`

Email + password form. Calls `window.trackdesk.auth.login()`. On success calls the `onLogin` prop with the user object. On error, displays the error message inline.

### `TrackerPage`

The main tracking interface:

- **Clock display:** Large monospaced `HH:MM:SS` counter. Receives `elapsed` milliseconds from `TIMER_TICK` IPC events.
- **Status indicator:** Green dot + "Tracking…" when a timer is running; grey dot + "Not tracking" when idle.
- **Project / description inputs:** Shown only when the timer is stopped. Values are passed to `timer.start()`.
- **Start / Stop button:** Circular button, green when idle (Start), red when tracking (Stop).
- **Screenshot notification:** Shows "Last screenshot: HH:MM:SS" below the button when `SCREENSHOT_CAPTURED` fires.
- **Tray action handler:** Listens for `TRAY_UPDATE` with `{ action: 'toggle' }` to allow the tray menu to toggle the timer without the window being open.

---

## System Tray

The tray is created in `main.ts` after the window is ready. Behaviour:

- **Closing the window** hides it (minimizes to tray) instead of quitting.
- **Double-clicking the tray icon** shows the window.
- **Tray icon** switches between `tray-idle.png` and `tray-active.png` based on timer state.
- **Tooltip** shows "TrackDesk — Tracking" or "TrackDesk — Idle".

**Tray menu items:**

| Item | Action |
|---|---|
| Show TrackDesk | `mainWindow.show()` |
| Start Timer / Stop Timer | Sends `TRAY_UPDATE { action: 'toggle' }` to renderer |
| Logout | Sends `AUTH_LOGOUT` to renderer |
| Quit | `app.exit(0)` |

---

## Auto-Update

`electron-updater` is initialised in `main.ts`:

```typescript
autoUpdater.checkForUpdatesAndNotify();   // called on app ready
```

On finding a newer version on GitHub Releases, `electron-updater` downloads the update in the background and shows a system notification. The user can also trigger a manual check via `window.trackdesk.app.checkUpdate()`.

**Publishing updates:**
1. Bump the version in `apps/desktop/package.json`.
2. Tag the commit: `git tag v1.x.x && git push --tags`.
3. Run `pnpm package` — creates installers in `release/`.
4. Upload the following to the GitHub Release:
   - `TrackDesk-1.x.x.dmg` (macOS)
   - `TrackDesk-1.x.x-arm64.dmg` (macOS Apple Silicon)
   - `TrackDesk Setup 1.x.x.exe` (Windows)
   - `latest.yml` and `latest-mac.yml` (update manifests)

---

## IPC Channel Reference

All channel names are constants defined in `packages/shared/src/constants.ts`.

| Constant | Channel string | Direction | Description |
|---|---|---|---|
| `AUTH_LOGIN` | `auth:login` | Renderer → Main | Login with email/password |
| `AUTH_LOGOUT` | `auth:logout` | Renderer → Main | Logout |
| `AUTH_GET_TOKEN` | `auth:get-token` | Renderer → Main | Retrieve stored token |
| `AUTH_GET_USER` | `auth:get-user` | Renderer → Main | Retrieve stored user |
| `TIMER_START` | `timer:start` | Renderer → Main | Start a time entry |
| `TIMER_STOP` | `timer:stop` | Renderer → Main | Stop current entry |
| `TIMER_GET_STATE` | `timer:get-state` | Renderer → Main | Get current timer state |
| `TIMER_TICK` | `timer:tick` | Main → Renderer | Emitted every second with elapsed ms |
| `SCREENSHOT_CAPTURED` | `screenshot:captured` | Main → Renderer | Fired after each upload |
| `TRAY_UPDATE` | `tray:update` | Main → Renderer | Tray menu action (e.g. toggle) |
| `APP_GET_VERSION` | `app:get-version` | Renderer → Main | Returns `app.getVersion()` |
| `APP_CHECK_UPDATE` | `app:check-update` | Renderer → Main | Trigger update check |

---

## Packaging & Distribution

```bash
# Build renderer + compile main process TypeScript
pnpm build

# Create platform installers (output → release/)
pnpm package
```

**electron-builder targets:**

| Platform | Format | Arch |
|---|---|---|
| macOS | `.dmg` + `.zip` | x64, arm64 (universal) |
| Windows | `.exe` (NSIS installer) | x64 |

The `extraResources` section of `electron-builder.config.js` includes `sharp` and `uiohook-napi` as bundled native resources, since they cannot be bundled as regular Node modules in an asar archive.

**App ID:** `com.yourcompany.trackdesk`

---

## Native Modules

Two native Node addons are used. They require platform-specific binaries:

| Module | Purpose | Notes |
|---|---|---|
| `sharp` | JPEG encode + Gaussian blur | Bundled via `extraResources`. Uses `libvips`. |
| `uiohook-napi` | Global keyboard/mouse hook | Requires Accessibility permissions on macOS. Bundled via `extraResources`. |

On macOS, the user must grant **Accessibility** permissions (`System Settings → Privacy & Security → Accessibility`) for `uiohook-napi` to receive global input events. The app will function without it but activity percentages will always be 0%.

The `pnpm-workspace.yaml` `allowBuilds` section explicitly permits native builds for `sharp`, `uiohook-napi`, `electron`, and `esbuild` to avoid `pnpm`'s default build restriction warnings.
