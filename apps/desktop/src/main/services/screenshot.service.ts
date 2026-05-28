import { desktopCapturer, screen } from 'electron';
import sharp from 'sharp';
import { AuthService } from './auth.service';
import { ActivityService } from './activity.service';

const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3001';
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

export class ScreenshotService {
  private interval: ReturnType<typeof setInterval> | null = null;
  private capturedCallback?: () => void;
  private intervalMs = DEFAULT_INTERVAL_MS;

  constructor(
    private readonly auth: AuthService,
    private readonly activity: ActivityService,
  ) {}

  start(entryId: string, intervalMs = this.intervalMs) {
    this.intervalMs = intervalMs;
    this.activity.start();
    this.interval = setInterval(() => this.capture(entryId), intervalMs);
  }

  stop() {
    this.activity.stop();
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  onCaptured(cb: () => void) { this.capturedCallback = cb; }

  private async capture(entryId: string) {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height },
      });

      const source = sources[0];
      if (!source) return;

      const png = source.thumbnail.toPNG();
      const blurred = await sharp(png)
        .blur(3)
        .jpeg({ quality: 75 })
        .toBuffer();

      await this.upload(blurred, entryId);
      this.capturedCallback?.();
    } catch (err) {
      console.error('Screenshot capture failed:', err);
    }
  }

  private async upload(jpeg: Buffer, entryId: string) {
    const token = this.auth.getToken();
    if (!token) return;

    const { activityPercent } = this.activity.flushWindow();

    const form = new FormData();
    form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'screenshot.jpg');
    form.append('timeEntryId', entryId);
    form.append('activityPercent', String(activityPercent));
    form.append('capturedAt', new Date().toISOString());

    await fetch(`${API_URL}/screenshots/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  }
}
