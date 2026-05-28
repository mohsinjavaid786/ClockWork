import { UiohookKey, uIOhook } from 'uiohook-napi';

const WINDOW_MS = 10 * 60 * 1000;
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

export class ActivityService {
  private activeSeconds = 0;
  private windowStart = Date.now();
  private lastActivity = Date.now();
  private sampleInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  start() {
    if (this.running) return;
    this.running = true;
    this.windowStart = Date.now();
    this.lastActivity = Date.now();
    this.activeSeconds = 0;

    const onInput = () => { this.lastActivity = Date.now(); };
    uIOhook.on('mousemove', onInput);
    uIOhook.on('mousedown', onInput);
    uIOhook.on('keydown', onInput);
    uIOhook.start();

    this.sampleInterval = setInterval(() => {
      const now = Date.now();
      const idleDuration = now - this.lastActivity;
      if (idleDuration < 5000) {
        this.activeSeconds += 1;
      }
    }, 1000);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    uIOhook.stop();
    if (this.sampleInterval) { clearInterval(this.sampleInterval); this.sampleInterval = null; }
  }

  /** Returns activity percent for the current 10-min window then resets. */
  flushWindow(): { activityPercent: number; isIdle: boolean } {
    const windowSeconds = (Date.now() - this.windowStart) / 1000;
    const effectiveWindow = Math.min(windowSeconds, 600);
    const activityPercent = Math.min(100, Math.round((this.activeSeconds / effectiveWindow) * 100));
    const isIdle = Date.now() - this.lastActivity > IDLE_THRESHOLD_MS;

    this.activeSeconds = 0;
    this.windowStart = Date.now();

    return { activityPercent, isIdle };
  }
}

// silence unused import warning
void UiohookKey;
