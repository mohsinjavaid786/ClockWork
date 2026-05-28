"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startActivityTracking = startActivityTracking;
exports.stopActivityTracking = stopActivityTracking;
exports.recordKeystroke = recordKeystroke;
exports.recordMouseMove = recordMouseMove;
exports.getActivityPercent = getActivityPercent;
const electron_1 = require("electron");
let keyCount = 0;
let mouseCount = 0;
let lastActivity = Date.now();
let intervalId = null;
function startActivityTracking() {
    electron_1.powerMonitor.on('suspend', () => {
        keyCount = 0;
        mouseCount = 0;
    });
    intervalId = setInterval(() => {
        lastActivity = Date.now();
    }, 5000);
}
function stopActivityTracking() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    keyCount = 0;
    mouseCount = 0;
}
function recordKeystroke() {
    keyCount++;
    lastActivity = Date.now();
}
function recordMouseMove() {
    mouseCount++;
    lastActivity = Date.now();
}
function getActivityPercent(windowSeconds = 60) {
    const total = keyCount + mouseCount;
    const idleSeconds = (Date.now() - lastActivity) / 1000;
    if (idleSeconds > windowSeconds)
        return 0;
    const rawPercent = Math.min(100, Math.round((total / (windowSeconds * 2)) * 100));
    keyCount = 0;
    mouseCount = 0;
    return rawPercent;
}
//# sourceMappingURL=activity.service.js.map