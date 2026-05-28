export const IPC_CHANNELS = {
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_TOKEN: 'auth:get-token',
  AUTH_GET_USER: 'auth:get-user',

  TIMER_START: 'timer:start',
  TIMER_STOP: 'timer:stop',
  TIMER_GET_STATE: 'timer:get-state',
  TIMER_TICK: 'timer:tick',

  SCREENSHOT_CAPTURE: 'screenshot:capture',
  SCREENSHOT_CAPTURED: 'screenshot:captured',

  TRAY_UPDATE: 'tray:update',

  APP_GET_VERSION: 'app:get-version',
  APP_CHECK_UPDATE: 'app:check-update',
} as const;

export const SCREENSHOT_INTERVAL_MS = 10 * 60 * 1000;
export const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
export const ACTIVITY_WINDOW_MS = 10 * 60 * 1000;

export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
