export declare const IPC: {
    readonly AUTH_LOGIN: "auth:login";
    readonly AUTH_LOGOUT: "auth:logout";
    readonly AUTH_GET_TOKEN: "auth:get-token";
    readonly AUTH_GET_USER: "auth:get-user";
    readonly TIMER_START: "timer:start";
    readonly TIMER_STOP: "timer:stop";
    readonly TIMER_PAUSE: "timer:pause";
    readonly TIMER_RESUME: "timer:resume";
    readonly TIMER_GET_STATUS: "timer:get-status";
    readonly TIMER_REMOTE_STOP: "timer:remote-stop";
    readonly SCREENSHOT_CAPTURE: "screenshot:capture";
    readonly SCREENSHOT_UPLOAD: "screenshot:upload";
    readonly ACTIVITY_GET: "activity:get";
    readonly CONFIG_GET: "config:get";
    readonly PROJECTS_LIST: "projects:list";
    readonly APP_VERSION: "app:version";
};
export type IPCChannel = (typeof IPC)[keyof typeof IPC];
//# sourceMappingURL=ipc-channels.d.ts.map