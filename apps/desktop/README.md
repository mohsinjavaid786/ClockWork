# apps/desktop — Clockwork Desktop App

> Cross-platform Electron 30 app for employees. Time tracking, screenshot capture with Gaussian blur, activity monitoring, OS keychain token storage. React 19 renderer. Supports macOS (Apple Silicon + Intel) and Windows (x64).

---

## Features

| Feature | Details |
|---|---|
| **Timer** | Start/stop with project + description selection; `HH:MM:SS` counter ticks client-side from `startedAt` |
| **Screenshot capture** | `desktopCapturer` every N minutes (configurable via `GET /config`); `sharp.blur(3)` applied before upload — raw screen never leaves the machine |
| **Activity tracking** | `powerMonitor` idle detection; activity % computed per 10-minute window and uploaded alongside each screenshot |
| **Secure token storage** | `electron.safeStorage.encryptString()` stores JWT in OS keychain (macOS Keychain / Windows Credential Store); falls back to in-memory only on unsupported platforms |
| **System tray** | App minimizes to tray on close; tray icon updates to show tracking state; context menu for Show / Quit |
| **Auto-login** | On launch, reads stored token → restores user session without re-entering credentials |
| **Auto-update** | `electron-updater` checks GitHub Releases on every launch; downloads and installs updates silently |
| **Frame-free window** | 360×580 frameless window with draggable title bar (`-webkit-app-region: drag`) |

---

## Security Model

```
┌────────────────────────────────────────────────────────────┐
│                  Electron Process Model                    │
│                                                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Renderer Process  (sandbox: true)                    │ │
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
│  │  TimerService        ← safeStorage + API calls        │ │
│  │  ScreenshotService   ← desktopCapturer + sharp        │ │
│  │  ActivityService     ← powerMonitor                   │ │
│  │  Tray                ← menu + icon state              │ │
│  │  autoUpdater         ← GitHub Releases                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  contextIsolation: true  ·  nodeIntegration: false        │
│  sandbox: true                                             │
└────────────────────────────────────────────────────────────┘
```

| Setting | Value | Reason |
|---|---|---|
| `contextIsolation` | `true` | Renderer JS cannot access Node globals |
| `nodeIntegration` | `false` | No `require()` in renderer |
| `sandbox` | `true` | OS-level process sandboxing |

---

## Screenshot Capture Flow

```
ScreenshotService.captureAndUpload()
        │
        ▼
desktopCapturer.getSources({ types: ['screen'] })
        │
        ▼
source.thumbnail.toPNG()  →  Buffer
        │
        ▼
sharp(pngBuffer).blur(3).png().toBuffer()
        │           ↑
        │     Gaussian blur σ=3 applied HERE
        │     Raw screenshot never stored or uploaded
        ▼
ActivityService.getActivityPercent()
        │  resets counters after reading
        ▼
FormData { file, activityPercent, timeEntryId? }
        │
        ▼
POST /api/v1/screenshots/upload
  Authorization: Bearer <safeStorage token>
        │
        ▼
Supabase Storage → {userId}/{timestamp}.png
Database → INSERT screenshots row
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
   │                           │                        │  safeStorage.encrypt(token)
   │                           │                        │  safeStorage.encrypt(user)
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
   │                           │                        │  → desktopCapturer
   │                           │                        │  → sharp blur
   │                           │                        │  → POST /screenshots/upload
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
| `IPC.TIMER_START` | `timer:start` | Start a time entry |
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
│   ├── tray.ts                     # Tray icon + context menu
│   └── services/
│       ├── timer.service.ts        # safeStorage: token, user, timer state
│       ├── screenshot.service.ts   # desktopCapturer + sharp blur + upload
│       └── activity.service.ts     # powerMonitor idle detection
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

```env
API_URL=http://localhost:3001   # defaults to localhost:3001 if unset
```

---

## Running & Building

```bash
pnpm dev       # Vite :5173 + Electron (with HMR)
pnpm build     # vite build + tsc -p tsconfig.electron.json
pnpm package   # electron-builder → release/ (.dmg, .exe)
```

### Publishing an update
1. Bump version in `package.json`
2. `git tag v1.x.x && git push --tags`
3. `pnpm build && pnpm package`
4. Upload `release/*.dmg`, `release/*.exe`, `release/latest*.yml` to the GitHub Release
5. `electron-updater` on next client launch downloads + installs silently
