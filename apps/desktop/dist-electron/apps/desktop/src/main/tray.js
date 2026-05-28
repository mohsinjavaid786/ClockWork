"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTray = createTray;
exports.updateTrayMenu = updateTrayMenu;
exports.destroyTray = destroyTray;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let tray = null;
function createTray(win) {
    const iconPath = path_1.default.join(__dirname, '../../resources/tray-icon.png');
    const icon = electron_1.nativeImage.createFromPath(iconPath);
    const resized = icon.isEmpty()
        ? electron_1.nativeImage.createEmpty()
        : icon.resize({ width: 16, height: 16 });
    tray = new electron_1.Tray(resized);
    tray.setToolTip('Clockwork');
    updateTrayMenu(win, false);
    tray.on('click', () => {
        if (win.isVisible()) {
            win.hide();
        }
        else {
            win.show();
            win.focus();
        }
    });
    return tray;
}
function updateTrayMenu(win, isTracking) {
    if (!tray)
        return;
    const menu = electron_1.Menu.buildFromTemplate([
        {
            label: isTracking ? '● Tracking…' : 'Not tracking',
            enabled: false,
        },
        { type: 'separator' },
        {
            label: 'Show Clockwork',
            click: () => {
                win.show();
                win.focus();
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            role: 'quit',
        },
    ]);
    tray.setContextMenu(menu);
}
function destroyTray() {
    tray?.destroy();
    tray = null;
}
//# sourceMappingURL=tray.js.map