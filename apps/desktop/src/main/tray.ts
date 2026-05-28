import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function createTray(win: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  const resized = icon.isEmpty()
    ? nativeImage.createEmpty()
    : icon.resize({ width: 16, height: 16 });

  tray = new Tray(resized);
  tray.setToolTip('Clockwork');

  updateTrayMenu(win, false);

  tray.on('click', () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });

  return tray;
}

export function updateTrayMenu(win: BrowserWindow, isTracking: boolean) {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
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

export function destroyTray() {
  tray?.destroy();
  tray = null;
}
