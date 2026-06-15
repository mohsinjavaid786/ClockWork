import { app, Tray, Menu, nativeImage, BrowserWindow, type NativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;
let baseIcon: NativeImage | null = null;
let blinkTimer: ReturnType<typeof setInterval> | null = null;
let blinkOn = false;

const ICON_SIZE = 16;

// Build a filled circle icon (used to blink a green "tracking" indicator). The
// buffer is BGRA; green stays green regardless of channel order so this reads
// correctly on every platform without shipping extra assets.
function dotIcon(bright: boolean): NativeImage {
  const size = ICON_SIZE;
  const buf = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const radius = size / 2 - 1.5;
  // bright #22c55e vs dim #14532d
  const [r, g, b] = bright ? [34, 197, 94] : [20, 83, 45];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (Math.hypot(x - c, y - c) <= radius) {
        buf[i] = b;
        buf[i + 1] = g;
        buf[i + 2] = r;
        buf[i + 3] = 255;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

let _bright: NativeImage | null = null;
let _dim: NativeImage | null = null;
function brightIcon() {
  return (_bright ??= dotIcon(true));
}
function dimIcon() {
  return (_dim ??= dotIcon(false));
}

export function createTray(win: BrowserWindow): Tray {
  const iconPath = path.join(app.getAppPath(), 'resources/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  baseIcon = icon.isEmpty()
    ? dimIcon()
    : icon.resize({ width: ICON_SIZE, height: ICON_SIZE });

  tray = new Tray(baseIcon);
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

function startBlinking() {
  if (blinkTimer || !tray) return;
  tray.setToolTip('Clockwork — tracking');
  blinkOn = true;
  tray.setImage(brightIcon());
  blinkTimer = setInterval(() => {
    blinkOn = !blinkOn;
    tray?.setImage(blinkOn ? brightIcon() : dimIcon());
  }, 600);
}

function stopBlinking() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
  }
  if (tray && baseIcon) tray.setImage(baseIcon);
  tray?.setToolTip('Clockwork');
}

export function updateTrayMenu(win: BrowserWindow, isTracking: boolean) {
  if (!tray) return;

  if (isTracking) startBlinking();
  else stopBlinking();

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
  stopBlinking();
  tray?.destroy();
  tray = null;
}
