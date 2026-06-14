import { powerMonitor } from 'electron';

// Real input + window tracking.
//
// Global keyboard/mouse counts come from uiohook-napi (native), and the
// foreground window from active-win (ESM). Both are optional native modules:
// if they fail to load (unsupported platform, missing OS permission, or not
// installed) tracking degrades gracefully to zero rather than crashing.

export interface MinuteActivity {
  t: string; // ISO8601, start of the minute
  keys: number;
  mouse: number;
  window: string;
}

export interface ActivitySnapshot {
  activityPercent: number;
  keyCount: number;
  mouseCount: number;
  activeWindow: string | null;
  minuteActivity: MinuteActivity[];
}

// ── module state ──────────────────────────────────────────────────────────────
let totalKeys = 0;
let totalMouse = 0;
let curKeys = 0;
let curMouse = 0;
let curMinuteStart = startOfMinute(Date.now());
let minutes: MinuteActivity[] = [];
let currentWindow = '';
let lastActivity = Date.now();
let lastMoveTs = 0;
let paused = false;

let minuteTimer: ReturnType<typeof setInterval> | null = null;
let windowTimer: ReturnType<typeof setInterval> | null = null;

// uiohook-napi is CommonJS — lazy require so a native-load failure is catchable.
type Uiohook = { on: (e: string, cb: () => void) => void; start: () => void; stop: () => void };
let uIOhook: Uiohook | null = null;

function startOfMinute(ms: number): Date {
  const d = new Date(ms);
  d.setSeconds(0, 0);
  return d;
}

// active-win is ESM-only; load it from CommonJS via a runtime dynamic import
// (the Function wrapper prevents TypeScript from downleveling it to require()).
const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>;

async function refreshActiveWindow(): Promise<void> {
  try {
    const mod = (await dynamicImport('active-win')) as {
      activeWindow?: () => Promise<unknown>;
      default?: () => Promise<unknown>;
    };
    const fn = mod.activeWindow ?? mod.default;
    if (!fn) return;
    const res = (await fn()) as { title?: string; owner?: { name?: string } } | undefined;
    if (res) {
      const app = res.owner?.name ?? '';
      const title = res.title ?? '';
      currentWindow = app && title ? `${app} — ${title}` : app || title || '';
    }
  } catch {
    // active-win unavailable or OS permission not granted — keep last known value
  }
}

function rollMinute(): void {
  minutes.push({
    t: curMinuteStart.toISOString(),
    keys: curKeys,
    mouse: curMouse,
    window: currentWindow,
  });
  curKeys = 0;
  curMouse = 0;
  curMinuteStart = startOfMinute(Date.now());
}

export function recordKeystroke(): void {
  if (paused) return;
  curKeys++;
  totalKeys++;
  lastActivity = Date.now();
}

export function recordMouseMove(): void {
  if (paused) return;
  curMouse++;
  totalMouse++;
  lastActivity = Date.now();
}

// Pause/resume input accounting so paused time isn't counted as activity.
export function setActivityPaused(value: boolean): void {
  paused = value;
  if (!value) {
    // Start a fresh minute on resume so the paused gap isn't one giant bucket.
    curKeys = 0;
    curMouse = 0;
    curMinuteStart = startOfMinute(Date.now());
    lastActivity = Date.now();
  }
}

export function startActivityTracking(): void {
  powerMonitor.on('suspend', () => {
    curKeys = 0;
    curMouse = 0;
  });

  // Wire global input hooks.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('uiohook-napi') as { uIOhook: Uiohook };
    uIOhook = mod.uIOhook;
    uIOhook.on('keydown', () => recordKeystroke());
    uIOhook.on('mousedown', () => recordMouseMove());
    uIOhook.on('wheel', () => recordMouseMove());
    // mousemove fires very frequently — throttle to ~5/sec so counts stay meaningful.
    uIOhook.on('mousemove', () => {
      const now = Date.now();
      if (now - lastMoveTs >= 200) {
        lastMoveTs = now;
        recordMouseMove();
      }
    });
    uIOhook.start();
  } catch {
    uIOhook = null; // native module missing / failed to load — counts stay 0
  }

  void refreshActiveWindow();
  windowTimer = setInterval(() => void refreshActiveWindow(), 15_000);
  minuteTimer = setInterval(rollMinute, 60_000);
}

export function stopActivityTracking(): void {
  if (minuteTimer) { clearInterval(minuteTimer); minuteTimer = null; }
  if (windowTimer) { clearInterval(windowTimer); windowTimer = null; }
  try { uIOhook?.stop(); } catch { /* ignore */ }
  uIOhook = null;
  totalKeys = 0; totalMouse = 0; curKeys = 0; curMouse = 0;
  minutes = [];
}

// Live activity % for the in-app indicator. Does NOT reset accumulated counts.
export function getActivityPercent(windowSeconds = 60): number {
  const idleSeconds = (Date.now() - lastActivity) / 1000;
  if (idleSeconds > windowSeconds) return 0;
  return Math.min(100, Math.round(((curKeys + curMouse) / (windowSeconds * 2)) * 100));
}

// Snapshot the interval's full detail for a screenshot upload, then reset.
export function flushActivity(windowSeconds: number): ActivitySnapshot {
  rollMinute(); // finalize the in-progress minute

  const total = totalKeys + totalMouse;
  const idleSeconds = (Date.now() - lastActivity) / 1000;
  const activityPercent =
    idleSeconds > windowSeconds
      ? 0
      : Math.min(100, Math.round((total / Math.max(1, windowSeconds * 2)) * 100));

  const snapshot: ActivitySnapshot = {
    activityPercent,
    keyCount: totalKeys,
    mouseCount: totalMouse,
    activeWindow: currentWindow || null,
    minuteActivity: minutes.slice(),
  };

  totalKeys = 0;
  totalMouse = 0;
  minutes = [];
  return snapshot;
}
