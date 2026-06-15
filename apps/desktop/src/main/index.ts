import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { IPC } from '@clockwork/shared';
import {
  saveToken, getToken, clearToken,
  saveUser, getUser, clearUser,
  saveTimerState, getTimerState, clearTimerState,
} from './services/timer.service';
import { captureAndUpload } from './services/screenshot.service';
import { startActivityTracking, stopActivityTracking, getActivityPercent, flushActivity, setActivityPaused } from './services/activity.service';
import { createTray, updateTrayMenu } from './tray';
import { API_BASE } from './config';

// Pin the app name so userData lives under ".../Clockwork" (not the package
// name "desktop") and the app presents consistently to the OS.
app.setName('Clockwork');
const IS_DEV = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let screenshotInterval: ReturnType<typeof setInterval> | null = null;
let screenshotIntervalMinutes = 10;
// Closing the window normally just hides it (tray app). When the user picks Quit,
// before-quit sets this so the close handler lets the window actually close.
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 580,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0A0A0A',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox must be off so the preload can require the @clockwork/shared
      // workspace package; contextIsolation + nodeIntegration:false keep the
      // renderer isolated (it only talks to main via the contextBridge).
      sandbox: false,
    },
  });

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In the packaged app the renderer lives at <app>/dist-renderer; resolve from
    // the app root rather than a fragile relative path off the compiled main.
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist-renderer/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (isQuitting) return; // let the window close so the app can exit
    e.preventDefault();
    mainWindow?.hide();
  });
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function startScreenshotLoop() {
  if (screenshotInterval) clearInterval(screenshotInterval);

  screenshotInterval = setInterval(
    async () => {
      const state = getTimerState();
      const user = getUser();
      if (!state.running || !user) return;

      const activity = flushActivity(screenshotIntervalMinutes * 60);
      await captureAndUpload(user.id, activity, state.entryId).catch(console.error);
    },
    screenshotIntervalMinutes * 60 * 1000,
  );
}

function stopScreenshotLoop() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

// Pull the current screenshot interval from the server. Called at login AND at
// every timer start, so an admin changing the interval takes effect on the next
// Start without needing the employee to sign out — and a restored session (which
// skips login) still gets the right value.
async function refreshConfig() {
  try {
    const config = await apiRequest<{ screenshotIntervalMinutes: number }>('/config');
    if (config.screenshotIntervalMinutes && config.screenshotIntervalMinutes > 0) {
      screenshotIntervalMinutes = config.screenshotIntervalMinutes;
    }
  } catch {
    // network error — keep the last known interval
  }
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    const allowed = ['media', 'display-capture'];
    cb(allowed.includes(permission));
  });

  createWindow();

  if (mainWindow) {
    createTray(mainWindow);
  }

  startActivityTracking();

  // Resume an open session that survived a quit/auto-update restart, so the
  // timer keeps running AND screenshots keep being captured (the entry stays the
  // same one on the server). Without this, capture silently stopped after a
  // restart even though the timer kept showing as running.
  const resumed = getTimerState();
  if (resumed.running) {
    if (mainWindow) updateTrayMenu(mainWindow, true);
    if (resumed.paused) {
      setActivityPaused(true);
    } else {
      await refreshConfig();
      setActivityPaused(false);
      startScreenshotLoop();
    }
  }

  if (!IS_DEV) {
    // Never let a failed update check (offline, no published release, missing
    // app-update.yml) surface as an unhandled rejection and disrupt the app.
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('Update check failed:', err);
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  stopScreenshotLoop();
  stopActivityTracking();
});

ipcMain.handle(IPC.AUTH_LOGIN, async (_e, { email, password }: { email: string; password: string }) => {
  const data = await apiRequest<{
    accessToken: string;
    user: { id: string; name: string; email: string; role: string };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  saveToken(data.accessToken);
  saveUser(data.user);

  await refreshConfig();

  return data.user;
});

ipcMain.handle(IPC.AUTH_LOGOUT, async () => {
  const token = getToken();
  if (token) {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
  }
  clearToken();
  clearUser();
  clearTimerState();
  stopScreenshotLoop();
  return { success: true };
});

ipcMain.handle(IPC.AUTH_GET_TOKEN, () => getToken());
ipcMain.handle(IPC.AUTH_GET_USER, () => getUser());

ipcMain.handle(IPC.TIMER_START, async (_e, { projectId, description }: { projectId?: string; description?: string }) => {
  const entry = await apiRequest<{ id: string; started_at: string }>('/time-entries/start', {
    method: 'POST',
    body: JSON.stringify({ projectId, description }),
  });

  const state = {
    running: true,
    entryId: entry.id,
    startedAt: entry.started_at,
    projectId,
    description,
  };
  saveTimerState(state);

  if (mainWindow) updateTrayMenu(mainWindow, true);
  await refreshConfig(); // honour the latest admin interval for this session
  startScreenshotLoop();

  return state;
});

ipcMain.handle(IPC.TIMER_STOP, async () => {
  const state = getTimerState();
  if (!state.running || !state.entryId) return { running: false };

  await apiRequest(`/time-entries/${state.entryId}/stop`, { method: 'POST', body: '{}' });

  clearTimerState();
  stopScreenshotLoop();
  setActivityPaused(false);

  if (mainWindow) updateTrayMenu(mainWindow, false);

  return { running: false };
});

ipcMain.handle(IPC.TIMER_PAUSE, async () => {
  const state = getTimerState();
  if (!state.running || !state.entryId || state.paused) return state;

  await apiRequest(`/time-entries/${state.entryId}/pause`, { method: 'POST', body: '{}' });

  // Capture what was tracked up to the pause, then halt capture + input counting.
  const user = getUser();
  if (user) {
    const activity = flushActivity(screenshotIntervalMinutes * 60);
    await captureAndUpload(user.id, activity, state.entryId).catch(console.error);
  }
  setActivityPaused(true);
  stopScreenshotLoop();

  const next = { ...state, paused: true };
  saveTimerState(next);
  return next;
});

ipcMain.handle(IPC.TIMER_RESUME, async () => {
  const state = getTimerState();
  if (!state.running || !state.entryId || !state.paused) return state;

  await apiRequest(`/time-entries/${state.entryId}/resume`, { method: 'POST', body: '{}' });

  setActivityPaused(false);
  startScreenshotLoop();

  const next = { ...state, paused: false };
  saveTimerState(next);
  return next;
});

ipcMain.handle(IPC.TIMER_GET_STATUS, () => getTimerState());

ipcMain.handle(IPC.ACTIVITY_GET, () => getActivityPercent());

ipcMain.handle(IPC.CONFIG_GET, async () => {
  return apiRequest('/config').catch(() => ({
    screenshotIntervalMinutes: 10,
    companyName: 'Clockwork',
    timezone: 'UTC',
  }));
});

ipcMain.handle(IPC.PROJECTS_LIST, () =>
  apiRequest<unknown[]>('/projects').catch(() => []),
);

ipcMain.handle(IPC.APP_VERSION, () => app.getVersion());
