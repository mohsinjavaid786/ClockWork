import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@trackdesk/shared';

// Typed IPC bridge — NO Node APIs exposed to renderer
const api = {
  auth: {
    login: (email: string, password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, email, password),
    logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
    getToken: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_TOKEN),
    getUser: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_USER),
  },
  timer: {
    start: (projectId?: string, description?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TIMER_START, projectId, description),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.TIMER_STOP),
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.TIMER_GET_STATE),
    onTick: (cb: (elapsed: number) => void) => {
      ipcRenderer.on(IPC_CHANNELS.TIMER_TICK, (_e, elapsed: number) => cb(elapsed));
    },
    offTick: () => ipcRenderer.removeAllListeners(IPC_CHANNELS.TIMER_TICK),
  },
  screenshot: {
    onCaptured: (cb: () => void) => {
      ipcRenderer.on(IPC_CHANNELS.SCREENSHOT_CAPTURED, cb);
    },
    offCaptured: () => ipcRenderer.removeAllListeners(IPC_CHANNELS.SCREENSHOT_CAPTURED),
  },
  tray: {
    onAction: (cb: (payload: { action: string }) => void) => {
      ipcRenderer.on(IPC_CHANNELS.TRAY_UPDATE, (_e, payload: { action: string }) => cb(payload));
    },
    offAction: () => ipcRenderer.removeAllListeners(IPC_CHANNELS.TRAY_UPDATE),
  },
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    checkUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_UPDATE),
  },
} as const;

contextBridge.exposeInMainWorld('trackdesk', api);

export type TrackdeskAPI = typeof api;
