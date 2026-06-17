import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@clockwork/shared';

export type TimerStatus = {
  running: boolean;
  paused?: boolean;
  entryId?: string;
  startedAt?: string;
  projectId?: string;
  description?: string;
};

export type AuthState = {
  token: string | null;
  user: { id: string; name: string; email: string; role: string } | null;
};

contextBridge.exposeInMainWorld('clockwork', {
  auth: {
    login: (email: string, password: string) =>
      ipcRenderer.invoke(IPC.AUTH_LOGIN, { email, password }),
    logout: () => ipcRenderer.invoke(IPC.AUTH_LOGOUT),
    getToken: () => ipcRenderer.invoke(IPC.AUTH_GET_TOKEN),
    getUser: () => ipcRenderer.invoke(IPC.AUTH_GET_USER),
    // Subscribe to forced sign-outs (token expired/revoked); returns unsubscribe.
    onSessionExpired: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on(IPC.AUTH_SESSION_EXPIRED, handler);
      return () => ipcRenderer.removeListener(IPC.AUTH_SESSION_EXPIRED, handler);
    },
  },
  timer: {
    start: (projectId?: string, description?: string) =>
      ipcRenderer.invoke(IPC.TIMER_START, { projectId, description }),
    stop: () => ipcRenderer.invoke(IPC.TIMER_STOP),
    pause: () => ipcRenderer.invoke(IPC.TIMER_PAUSE),
    resume: () => ipcRenderer.invoke(IPC.TIMER_RESUME),
    getStatus: (): Promise<TimerStatus> => ipcRenderer.invoke(IPC.TIMER_GET_STATUS),
    // Subscribe to admin-initiated stops; returns an unsubscribe fn.
    onRemoteStop: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on(IPC.TIMER_REMOTE_STOP, handler);
      return () => ipcRenderer.removeListener(IPC.TIMER_REMOTE_STOP, handler);
    },
  },
  activity: {
    get: () => ipcRenderer.invoke(IPC.ACTIVITY_GET),
  },
  config: {
    get: () => ipcRenderer.invoke(IPC.CONFIG_GET),
  },
  projects: {
    list: () => ipcRenderer.invoke(IPC.PROJECTS_LIST),
  },
  app: {
    version: () => ipcRenderer.invoke(IPC.APP_VERSION),
  },
});
