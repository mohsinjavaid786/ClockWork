"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const shared_1 = require("@clockwork/shared");
electron_1.contextBridge.exposeInMainWorld('clockwork', {
    auth: {
        login: (email, password) => electron_1.ipcRenderer.invoke(shared_1.IPC.AUTH_LOGIN, { email, password }),
        logout: () => electron_1.ipcRenderer.invoke(shared_1.IPC.AUTH_LOGOUT),
        getToken: () => electron_1.ipcRenderer.invoke(shared_1.IPC.AUTH_GET_TOKEN),
        getUser: () => electron_1.ipcRenderer.invoke(shared_1.IPC.AUTH_GET_USER),
    },
    timer: {
        start: (projectId, description) => electron_1.ipcRenderer.invoke(shared_1.IPC.TIMER_START, { projectId, description }),
        stop: () => electron_1.ipcRenderer.invoke(shared_1.IPC.TIMER_STOP),
        getStatus: () => electron_1.ipcRenderer.invoke(shared_1.IPC.TIMER_GET_STATUS),
    },
    activity: {
        get: () => electron_1.ipcRenderer.invoke(shared_1.IPC.ACTIVITY_GET),
    },
    config: {
        get: () => electron_1.ipcRenderer.invoke(shared_1.IPC.CONFIG_GET),
    },
    projects: {
        list: () => electron_1.ipcRenderer.invoke(shared_1.IPC.PROJECTS_LIST),
    },
    app: {
        version: () => electron_1.ipcRenderer.invoke(shared_1.IPC.APP_VERSION),
    },
});
//# sourceMappingURL=index.js.map