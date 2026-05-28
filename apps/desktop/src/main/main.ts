import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { AuthService } from './services/auth.service';
import { TimerService } from './services/timer.service';
import { ScreenshotService } from './services/screenshot.service';
import { ActivityService } from './services/activity.service';
import { IPC_CHANNELS } from '@trackdesk/shared';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const authService = new AuthService();
const timerService = new TimerService(authService);
const activityService = new ActivityService();
const screenshotService = new ScreenshotService(authService, activityService);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 620,
    resizable: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
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

function createTray() {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, '../../resources/tray-idle.png'),
  );
  tray = new Tray(icon);
  updateTrayMenu(false);
  tray.on('double-click', () => mainWindow?.show());
}

function updateTrayMenu(isRunning: boolean) {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'Show TrackDesk', click: () => mainWindow?.show() },
    {
      label: isRunning ? 'Stop Timer' : 'Start Timer',
      click: () => mainWindow?.webContents.send(IPC_CHANNELS.TRAY_UPDATE, { action: 'toggle' }),
    },
    { type: 'separator' },
    { label: 'Logout', click: () => mainWindow?.webContents.send(IPC_CHANNELS.AUTH_LOGOUT) },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.exit(0); } },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(isRunning ? 'TrackDesk — Tracking' : 'TrackDesk — Idle');

  const iconName = isRunning ? 'tray-active.png' : 'tray-idle.png';
  tray.setImage(nativeImage.createFromPath(path.join(__dirname, `../../resources/${iconName}`)));
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, (_e, email: string, password: string) =>
  authService.login(email, password),
);

ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => authService.logout());

ipcMain.handle(IPC_CHANNELS.AUTH_GET_TOKEN, () => authService.getToken());

ipcMain.handle(IPC_CHANNELS.AUTH_GET_USER, () => authService.getUser());

ipcMain.handle(IPC_CHANNELS.TIMER_START, (_e, projectId?: string, description?: string) =>
  timerService.start(projectId, description),
);

ipcMain.handle(IPC_CHANNELS.TIMER_STOP, () => timerService.stop());

ipcMain.handle(IPC_CHANNELS.TIMER_GET_STATE, () => timerService.getState());

ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => app.getVersion());

ipcMain.handle(IPC_CHANNELS.APP_CHECK_UPDATE, () => autoUpdater.checkForUpdates());

// Forward timer ticks to renderer
timerService.onTick((elapsed) => {
  mainWindow?.webContents.send(IPC_CHANNELS.TIMER_TICK, elapsed);
  updateTrayMenu(timerService.isRunning());
});

// Screenshot notifications
screenshotService.onCaptured(() => {
  new Notification({ title: 'TrackDesk', body: 'Screenshot captured' }).show();
  mainWindow?.webContents.send(IPC_CHANNELS.SCREENSHOT_CAPTURED);
});

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  createTray();
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});

app.on('before-quit', () => {
  activityService.stop();
  screenshotService.stop();
});
