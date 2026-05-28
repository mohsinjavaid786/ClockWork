"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveToken = saveToken;
exports.getToken = getToken;
exports.clearToken = clearToken;
exports.saveUser = saveUser;
exports.getUser = getUser;
exports.clearUser = clearUser;
exports.saveTimerState = saveTimerState;
exports.getTimerState = getTimerState;
exports.clearTimerState = clearTimerState;
const electron_1 = require("electron");
const TOKEN_KEY = 'cw_token';
const USER_KEY = 'cw_user';
const TIMER_KEY = 'cw_timer';
function encrypt(value) {
    if (electron_1.safeStorage.isEncryptionAvailable()) {
        return electron_1.safeStorage.encryptString(value);
    }
    return Buffer.from(value, 'utf8');
}
function decrypt(buf) {
    if (electron_1.safeStorage.isEncryptionAvailable()) {
        return electron_1.safeStorage.decryptString(buf);
    }
    return buf.toString('utf8');
}
const store = new Map();
function saveToken(token) {
    store.set(TOKEN_KEY, encrypt(token));
}
function getToken() {
    const buf = store.get(TOKEN_KEY);
    if (!buf)
        return null;
    try {
        return decrypt(buf);
    }
    catch {
        return null;
    }
}
function clearToken() {
    store.delete(TOKEN_KEY);
}
function saveUser(user) {
    store.set(USER_KEY, encrypt(JSON.stringify(user)));
}
function getUser() {
    const buf = store.get(USER_KEY);
    if (!buf)
        return null;
    try {
        return JSON.parse(decrypt(buf));
    }
    catch {
        return null;
    }
}
function clearUser() {
    store.delete(USER_KEY);
}
function saveTimerState(state) {
    store.set(TIMER_KEY, Buffer.from(JSON.stringify(state), 'utf8'));
}
function getTimerState() {
    const buf = store.get(TIMER_KEY);
    if (!buf)
        return { running: false };
    try {
        return JSON.parse(buf.toString('utf8'));
    }
    catch {
        return { running: false };
    }
}
function clearTimerState() {
    store.delete(TIMER_KEY);
}
//# sourceMappingURL=timer.service.js.map