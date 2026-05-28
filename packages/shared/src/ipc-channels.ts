export const IPC = {
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_TOKEN: 'auth:get-token',
  AUTH_GET_USER: 'auth:get-user',
  TIMER_START: 'timer:start',
  TIMER_STOP: 'timer:stop',
  TIMER_GET_STATUS: 'timer:get-status',
  SCREENSHOT_CAPTURE: 'screenshot:capture',
  SCREENSHOT_UPLOAD: 'screenshot:upload',
  ACTIVITY_GET: 'activity:get',
  CONFIG_GET: 'config:get',
  PROJECTS_LIST: 'projects:list',
  APP_VERSION: 'app:version',
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];
