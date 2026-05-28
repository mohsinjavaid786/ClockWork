"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureAndUpload = captureAndUpload;
const electron_1 = require("electron");
const timer_service_1 = require("./timer.service");
const API_BASE = process.env['API_URL'] ?? 'http://localhost:3001';
async function captureAndUpload(userId, activityPercent, timeEntryId) {
    const sources = await electron_1.desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 },
    });
    const source = sources[0];
    if (!source)
        return;
    const thumbnail = source.thumbnail;
    const pngBuffer = thumbnail.toPNG();
    let processedBuffer = pngBuffer;
    try {
        const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
        processedBuffer = await sharp(pngBuffer).blur(3).png().toBuffer();
    }
    catch {
        processedBuffer = pngBuffer;
    }
    const token = (0, timer_service_1.getToken)();
    if (!token)
        return;
    const formData = new FormData();
    formData.append('file', new Blob([processedBuffer], { type: 'image/png' }), 'screenshot.png');
    formData.append('activityPercent', String(activityPercent));
    if (timeEntryId)
        formData.append('timeEntryId', timeEntryId);
    await fetch(`${API_BASE}/api/v1/screenshots/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    void userId;
}
//# sourceMappingURL=screenshot.service.js.map