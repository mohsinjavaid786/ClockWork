# apps/desktop — Clockwork Desktop App

The cross-platform Electron app that employees install on their machines. It handles time tracking, screenshot capture, activity monitoring, and syncs everything to the Clockwork API.

Supports **macOS** (Apple Silicon + Intel) and **Windows** (x64).

---

## Table of Contents

- [Stack](#stack)
- [Security Model](#security-model)
- [Project Layout](#project-layout)
- [Environment Variables](#environment-variables)
- [Running in Development](#running-in-development)
- [Main Process](#main-process)
  - [IPC Handlers](#ipc-handlers)
  - [TimerService](#timerservice)
  - [ScreenshotService](#screenshotservice)
  - [ActivityService](#activityservice)
- [Preload Bridge](#preload-bridge)
- [Renderer — React UI](#renderer--react-ui)
- [System Tray](#system-tray)
- [Auto-Update](#auto-update)
- [IPC Channel Reference](#ipc-channel-reference)
- [Packaging & Distribution](#packaging--distribution)

---

## Stack

| Concern | Library |
|---|---|
| Shell | Electron 30 |
| Renderer build | Vite 5 + @vitejs/plugin-react |
| UI framework | React 18 + TypeScript |
| Screenshot blur | sharp (Gaussian σ=3, applied before upload) |
| Activity tracking | powerMonitor (OS-level idle detection) |
| Secure token storage | electron.safeStorage (OS keychain / Credential Store) |
| Auto-updates | electron-updater (GitHub Releases) |
| Installer | electron-builder (`.dmg` + NSIS `.exe`) |

---

## Security Model

The renderer process is treated as an untrusted browser context:

| Setting | Value | Why |
|---|---|---|
| `contextIsolation` | `true` | Renderer JS cannot access Node globals |
| `nodeIntegration` | `false` | No `require()` in renderer |
| `sandbox` | `true` | OS-level process sandboxing |

All communication between the React renderer and the Electron main process flows through the typed IPC bridge defined in `src/preload/index.ts`, exposed as `window.clockwork` via `contextBridge.exposeInMainWorld`. No Node API is directly accessible from React components.

Tokens are encrypted with `electron.safeStorage.encryptString()` on platforms that support it (macOS Keychain, Windows Credential Store). On unsupported platforms the token lives in process memory for the session only.

---

## Project Layout

```
src/
├── main/
│   ├── index.ts                    # BrowserWindow, IPC handlers, tray, auto-updater
│   ├── tray.ts                     # System tray creation and menu updates
│   └── services/
│       ├── timer.service.ts        # safeStorage-backed token, user, and timer state
│       ├── screenshot.service.ts   # desktopCapturer → sharp blur → multipart upload
│       └── activity.service.ts     # powerMonitor idle detection → activity %
│
├── preload/
│   └── index.ts                    # contextBridge.exposeInMainWorld('clockwork', api)
│
└── renderer/
    ├── index.html                  # HTML shell + Content-Security-Policy meta tag
    ├── main.tsx                    # ReactDOM.createRoot → <App />
    ├── App.tsx                     # Auth gate: LoginScreen or TrackerScreen
    ├── globals.css                 # CSS variables + base reset (no Tailwind)
    ├── types.d.ts                  # window.clockwork type declaration
    └── screens/
        ├── LoginScreen.tsx         # Email/password form with -webkit-app-region: drag
        └── TrackerScreen.tsx       # HH:MM:SS timer, project/description inputs, tray sync

resources/
└── tray-icon.png                   # 16×16 tray icon

electron-builder.config.js          # appId: com.clockwork.app, GitHub publish config
vite.config.ts                      # Renderer build config (outDir: dist-renderer)
tsconfig.json                       # Renderer TS config (bundler moduleResolution)
tsconfig.electron.json              # Main process TS config (CommonJS, outDir: dist-electron)
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
API_URL=http://localhost:3001
```

`API_URL` is read by the main process at runtime (`process.env['API_URL']`). It defaults to `http://localhost:3001` if unset.

---

## Running in Development

```bash
# From repo root
pnpm dev:desktop

# Or from this directory (starts Vite dev server + Electron concurrently)
pnpm dev
```

In dev mode:
- Vite serves the renderer at `http://localhost:5173`
- Electron loads that URL directly
- DevTools open in a detached window
- HMR works for renderer code; main process changes require a restart

---

## Main Process

**File:** `src/main/index.ts`

Responsibilities:
- Creates the `BrowserWindow` (360×580, frameless, `#0A0A0A` background)
- Registers all `ipcMain.handle()` listeners
- Creates the system tray via `tray.ts`
- Starts `startActivityTracking()` on `app.whenReady()`
- Calls `autoUpdater.checkForUpdatesAndNotify()` in production
- Intercepts the `close` event to hide the window instead of quitting

### IPC Handlers

| Channel | Handler |
|---|---|
| `auth:login` | Calls `POST /auth/login`, saves token + user via `safeStorage` |
| `auth:logout` | Calls `POST /auth/logout`, clears all stored state, stops screenshot loop |
| `auth:get-token` | Returns decrypted stored token |
| `auth:get-user` | Returns stored user object |
| `timer:start` | Calls `POST /time-entries/start`, saves timer state, starts screenshot loop |
| `timer:stop` | Calls `POST /time-entries/:id/stop`, clears timer state, stops screenshot loop |
| `timer:get-status` | Returns current timer state from `safeStorage` |
| `activity:get` | Returns current activity percent and resets the counter |
| `config:get` | Calls `GET /config`, used to read `screenshotIntervalMinutes` on login |
| `projects:list` | Calls `GET /projects` |
| `app:version` | Returns `app.getVersion()` |

---

### TimerService

**File:** `src/main/services/timer.service.ts`

Wraps `electron.safeStorage` for encrypted persistence of three pieces of state:

```
saveToken(token)       / getToken()       / clearToken()
saveUser(user)         / getUser()        / clearUser()
saveTimerState(state)  / getTimerState()  / clearTimerState()
```

On platforms where `safeStorage.isEncryptionAvailable()` returns `false` (e.g. some Linux desktops), data is stored in memory only via a `Map<string, Buffer>` — it will not persist across app restarts in that case.

Timer state shape:
```typescript
{ running: boolean; entryId?: string; startedAt?: string; projectId?: string; description?: string }
```

---

### ScreenshotService

**File:** `src/main/services/screenshot.service.ts`

Called by a `setInterval` in the main process. On each tick:

1. `desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } })`
2. `source.thumbnail.toPNG()` → PNG buffer
3. `sharp(pngBuffer).blur(3).png().toBuffer()` — Gaussian blur σ=3 applied **before** the image leaves the machine
4. Build `FormData` with `file` + `activityPercent` + optional `timeEntryId`
5. `POST /api/v1/screenshots/upload` with `Authorization: Bearer <token>`

If `sharp` is not available (native module load failure), the unblurred PNG is uploaded as a fallback.

---

### ActivityService

**File:** `src/main/services/activity.service.ts`

Uses `powerMonitor` from Electron to detect system idle state. Maintains a running count of simulated activity events and resets them when `powerMonitor` fires `suspend`.

```
startActivityTracking()  — starts a 5-second heartbeat interval
getActivityPercent(windowSeconds)
  → computes percent based on recent activity events
  → resets event counters
  → returns 0 if the system has been idle longer than the window
stopActivityTracking()   — clears the interval
```

The returned percent is passed as `activityPercent` in each screenshot upload.

---

## Preload Bridge

**File:** `src/preload/index.ts`

Exposes `window.clockwork` — the only surface area visible to React:

```typescript
window.clockwork = {
  auth: {
    login(email, password)    → AUTH_LOGIN
    logout()                  → AUTH_LOGOUT
    getToken()                → AUTH_GET_TOKEN
    getUser()                 → AUTH_GET_USER
  },
  timer: {
    start(projectId?, desc?)  → TIMER_START
    stop()                    → TIMER_STOP
    getStatus()               → TIMER_GET_STATUS
  },
  activity: {
    get()                     → ACTIVITY_GET
  },
  config: {
    get()                     → CONFIG_GET
  },
  projects: {
    list()                    → PROJECTS_LIST
  },
  app: {
    version()                 → APP_VERSION
  }
}
```

`types.d.ts` in the renderer declares `interface Window { clockwork: ... }` so all calls are fully typed in React components.

---

## Renderer — React UI

### `App.tsx`

On mount, calls `window.clockwork.auth.getUser()`. If a user is returned, renders `TrackerScreen`; otherwise renders `LoginScreen`. This provides auto-login on app restart without re-entering credentials.

### `LoginScreen`

- Frameless window with a draggable title bar (`-webkit-app-region: drag`)
- Email + password form → `window.clockwork.auth.login()`
- Inline error display

### `TrackerScreen`

- Draggable title bar with sign-out button (`-webkit-app-region: no-drag` on button)
- Large `HH:MM:SS` Mono timer counter (ticks client-side from stored `startedAt`)
- Green "Tracking" / grey "Stopped" status pill
- Project selector + description input (shown only when timer is stopped)
- Start / Stop button with loading state
- App version display at bottom
- On stop/start: syncs tray icon via `updateTrayMenu()`

---

## System Tray

**File:** `src/main/tray.ts`

- Created after `app.whenReady()` with a 16×16 icon from `resources/tray-icon.png`
- Clicking the tray icon toggles the window (show/hide)
- Context menu:
  - Status line: "● Tracking…" or "Not tracking" (disabled label)
  - "Show Clockwork" → `win.show()`
  - "Quit" → `app.quit()`
- `updateTrayMenu(win, isTracking)` is called from the IPC handlers for `TIMER_START` and `TIMER_STOP`

---

## Auto-Update

`electron-updater` is initialized in production:

```typescript
if (!app.isPackaged) return;
autoUpdater.checkForUpdatesAndNotify();
```

On finding a newer version on GitHub Releases, it downloads silently and shows a system notification. The GitHub publisher config in `electron-builder.config.js`:

```javascript
publish: {
  provider: 'github',
  owner: 'mohsinjavaid786',
  repo: 'clockwork',
}
```

**Publishing an update:**
1. Bump version in `package.json`
2. Tag: `git tag v1.x.x && git push --tags`
3. Build: `pnpm build && pnpm package`
4. Upload `release/*.dmg`, `release/*.exe`, `release/latest*.yml` to the GitHub Release

---

## IPC Channel Reference

Channel name constants are defined in `packages/shared/src/ipc-channels.ts` as the `IPC` object.

| Constant | Channel | Description |
|---|---|---|
| `IPC.AUTH_LOGIN` | `auth:login` | Login with email + password |
| `IPC.AUTH_LOGOUT` | `auth:logout` | Logout and clear stored state |
| `IPC.AUTH_GET_TOKEN` | `auth:get-token` | Return decrypted token |
| `IPC.AUTH_GET_USER` | `auth:get-user` | Return stored user object |
| `IPC.TIMER_START` | `timer:start` | Start a time entry |
| `IPC.TIMER_STOP` | `timer:stop` | Stop current time entry |
| `IPC.TIMER_GET_STATUS` | `timer:get-status` | Get current timer state |
| `IPC.SCREENSHOT_CAPTURE` | `screenshot:capture` | Trigger immediate capture |
| `IPC.SCREENSHOT_UPLOAD` | `screenshot:upload` | Upload a captured screenshot |
| `IPC.ACTIVITY_GET` | `activity:get` | Get activity % and reset counters |
| `IPC.CONFIG_GET` | `config:get` | Fetch app configuration |
| `IPC.PROJECTS_LIST` | `projects:list` | List projects for the dropdown |
| `IPC.APP_VERSION` | `app:version` | Get app version string |

---

## Packaging & Distribution

```bash
# Build renderer (Vite) + main process (tsc)
pnpm build

# Create platform installers (output → release/)
pnpm package
```

**electron-builder targets:**

| Platform | Format | Notes |
|---|---|---|
| macOS | `.dmg` + `.zip` | Universal (x64 + arm64) |
| Windows | `.exe` (NSIS) | x64 |
| Linux | `.AppImage` | x64 |

App ID: `com.clockwork.app`
