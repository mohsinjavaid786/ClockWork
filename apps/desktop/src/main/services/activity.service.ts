import { powerMonitor } from 'electron';

let keyCount = 0;
let mouseCount = 0;
let lastActivity = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startActivityTracking() {
  powerMonitor.on('suspend', () => {
    keyCount = 0;
    mouseCount = 0;
  });

  intervalId = setInterval(() => {
    lastActivity = Date.now();
  }, 5000);
}

export function stopActivityTracking() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  keyCount = 0;
  mouseCount = 0;
}

export function recordKeystroke() {
  keyCount++;
  lastActivity = Date.now();
}

export function recordMouseMove() {
  mouseCount++;
  lastActivity = Date.now();
}

export function getActivityPercent(windowSeconds = 60): number {
  const total = keyCount + mouseCount;
  const idleSeconds = (Date.now() - lastActivity) / 1000;

  if (idleSeconds > windowSeconds) return 0;

  const rawPercent = Math.min(100, Math.round((total / (windowSeconds * 2)) * 100));
  keyCount = 0;
  mouseCount = 0;
  return rawPercent;
}
