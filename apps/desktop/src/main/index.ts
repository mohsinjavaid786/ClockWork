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
import { startActivityTracking, stopActivityTracking, getActivityPercent } from './services/activity.service';
import { createTray, updateTrayMenu } from './tray';

const API_BASE = process.env['API_URL'] ?? 'http://localhost:3001';
const IS_DEV = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let screenshotInterval: ReturnType<typeof setInterval> | null = null;
let screenshotIntervalMinutes = 10;

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
      sandbox: true,
    },
  });

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  }

  mainWindow.on('close', (e) => {
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

      const activity = getActivityPercent(screenshotIntervalMinutes * 60);
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

  if (!IS_DEV) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
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

  try {
    const config = await apiRequest<{ screenshotIntervalMinutes: number }>('/config');
    screenshotIntervalMinutes = config.screenshotIntervalMinutes;
  } catch {
    screenshotIntervalMinutes = 10;
  }

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
  startScreenshotLoop();

  return state;
});

ipcMain.handle(IPC.TIMER_STOP, async () => {
  const state = getTimerState();
  if (!state.running || !state.entryId) return { running: false };

  await apiRequest(`/time-entries/${state.entryId}/stop`, { method: 'POST', body: '{}' });

  clearTimerState();
  stopScreenshotLoop();

  if (mainWindow) updateTrayMenu(mainWindow, false);

  return { running: false };
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
