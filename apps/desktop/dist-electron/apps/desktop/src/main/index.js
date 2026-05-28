"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_updater_1 = require("electron-updater");
const shared_1 = require("@clockwork/shared");
const timer_service_1 = require("./services/timer.service");
const screenshot_service_1 = require("./services/screenshot.service");
const activity_service_1 = require("./services/activity.service");
const tray_1 = require("./tray");
const API_BASE = process.env['API_URL'] ?? 'http://localhost:3001';
const IS_DEV = !electron_1.app.isPackaged;
let mainWindow = null;
let screenshotInterval = null;
let screenshotIntervalMinutes = 10;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 360,
        height: 580,
        resizable: false,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0A0A0A',
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    if (IS_DEV) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../../dist-renderer/index.html'));
    }
    mainWindow.on('close', (e) => {
        e.preventDefault();
        mainWindow?.hide();
    });
}
async function apiRequest(path, init = {}) {
    const token = (0, timer_service_1.getToken)();
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
        throw new Error(body.message ?? `HTTP ${res.status}`);
    }
    return res.json();
}
function startScreenshotLoop() {
    if (screenshotInterval)
        clearInterval(screenshotInterval);
    screenshotInterval = setInterval(async () => {
        const state = (0, timer_service_1.getTimerState)();
        const user = (0, timer_service_1.getUser)();
        if (!state.running || !user)
            return;
        const activity = (0, activity_service_1.getActivityPercent)(screenshotIntervalMinutes * 60);
        await (0, screenshot_service_1.captureAndUpload)(user.id, activity, state.entryId).catch(console.error);
    }, screenshotIntervalMinutes * 60 * 1000);
}
function stopScreenshotLoop() {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
    }
}
electron_1.app.whenReady().then(async () => {
    electron_1.session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
        const allowed = ['media', 'display-capture'];
        cb(allowed.includes(permission));
    });
    createWindow();
    if (mainWindow) {
        (0, tray_1.createTray)(mainWindow);
    }
    (0, activity_service_1.startActivityTracking)();
    if (!IS_DEV) {
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('before-quit', () => {
    stopScreenshotLoop();
    (0, activity_service_1.stopActivityTracking)();
});
electron_1.ipcMain.handle(shared_1.IPC.AUTH_LOGIN, async (_e, { email, password }) => {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    (0, timer_service_1.saveToken)(data.accessToken);
    (0, timer_service_1.saveUser)(data.user);
    try {
        const config = await apiRequest('/config');
        screenshotIntervalMinutes = config.screenshotIntervalMinutes;
    }
    catch {
        screenshotIntervalMinutes = 10;
    }
    return data.user;
});
electron_1.ipcMain.handle(shared_1.IPC.AUTH_LOGOUT, async () => {
    const token = (0, timer_service_1.getToken)();
    if (token) {
        await apiRequest('/auth/logout', { method: 'POST' }).catch(() => { });
    }
    (0, timer_service_1.clearToken)();
    (0, timer_service_1.clearUser)();
    (0, timer_service_1.clearTimerState)();
    stopScreenshotLoop();
    return { success: true };
});
electron_1.ipcMain.handle(shared_1.IPC.AUTH_GET_TOKEN, () => (0, timer_service_1.getToken)());
electron_1.ipcMain.handle(shared_1.IPC.AUTH_GET_USER, () => (0, timer_service_1.getUser)());
electron_1.ipcMain.handle(shared_1.IPC.TIMER_START, async (_e, { projectId, description }) => {
    const entry = await apiRequest('/time-entries/start', {
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
    (0, timer_service_1.saveTimerState)(state);
    if (mainWindow)
        (0, tray_1.updateTrayMenu)(mainWindow, true);
    startScreenshotLoop();
    return state;
});
electron_1.ipcMain.handle(shared_1.IPC.TIMER_STOP, async () => {
    const state = (0, timer_service_1.getTimerState)();
    if (!state.running || !state.entryId)
        return { running: false };
    await apiRequest(`/time-entries/${state.entryId}/stop`, { method: 'POST', body: '{}' });
    (0, timer_service_1.clearTimerState)();
    stopScreenshotLoop();
    if (mainWindow)
        (0, tray_1.updateTrayMenu)(mainWindow, false);
    return { running: false };
});
electron_1.ipcMain.handle(shared_1.IPC.TIMER_GET_STATUS, () => (0, timer_service_1.getTimerState)());
electron_1.ipcMain.handle(shared_1.IPC.ACTIVITY_GET, () => (0, activity_service_1.getActivityPercent)());
electron_1.ipcMain.handle(shared_1.IPC.CONFIG_GET, async () => {
    return apiRequest('/config').catch(() => ({
        screenshotIntervalMinutes: 10,
        companyName: 'Clockwork',
        timezone: 'UTC',
    }));
});
electron_1.ipcMain.handle(shared_1.IPC.PROJECTS_LIST, () => apiRequest('/projects').catch(() => []));
electron_1.ipcMain.handle(shared_1.IPC.APP_VERSION, () => electron_1.app.getVersion());
//# sourceMappingURL=index.js.map