import { safeStorage } from 'electron';
import { AuthService } from './auth.service';

const TIMER_STATE_KEY = 'trackdesk_timer';
const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3001';

interface TimerState {
  entryId: string;
  startedAt: number;
  projectId?: string;
  description?: string;
}

export class TimerService {
  private state: TimerState | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private tickCallback?: (elapsed: number) => void;

  constructor(private readonly auth: AuthService) {
    this.restore();
  }

  async start(projectId?: string, description?: string) {
    const token = this.auth.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/time-entries/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId, description }),
    });
    if (!res.ok) throw new Error('Failed to start entry');

    const entry = await res.json() as { id: string };
    this.state = { entryId: entry.id, startedAt: Date.now(), projectId, description };
    this.persist();
    this.startTicking();
    return this.state;
  }

  async stop() {
    if (!this.state) throw new Error('No running timer');
    const token = this.auth.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/time-entries/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entryId: this.state.entryId }),
    });
    if (!res.ok) throw new Error('Failed to stop entry');

    this.state = null;
    this.clearPersisted();
    this.stopTicking();
    return res.json();
  }

  getState() {
    if (!this.state) return null;
    return { ...this.state, elapsed: Date.now() - this.state.startedAt };
  }

  isRunning(): boolean {
    return this.state !== null;
  }

  getCurrentEntryId(): string | undefined {
    return this.state?.entryId;
  }

  onTick(cb: (elapsed: number) => void) {
    this.tickCallback = cb;
  }

  private startTicking() {
    this.interval = setInterval(() => {
      if (this.state && this.tickCallback) {
        this.tickCallback(Date.now() - this.state.startedAt);
      }
    }, 1000);
  }

  private stopTicking() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  private persist() {
    if (!this.state) return;
    const data = JSON.stringify(this.state);
    if (safeStorage.isEncryptionAvailable()) {
      process.env[TIMER_STATE_KEY] = safeStorage.encryptString(data).toString('base64');
    } else {
      process.env[TIMER_STATE_KEY] = data;
    }
  }

  private restore() {
    const raw = process.env[TIMER_STATE_KEY];
    if (!raw) return;
    try {
      let data: string;
      if (safeStorage.isEncryptionAvailable()) {
        data = safeStorage.decryptString(Buffer.from(raw, 'base64'));
      } else {
        data = raw;
      }
      this.state = JSON.parse(data) as TimerState;
      this.startTicking();
    } catch {
      // corrupted state — ignore
    }
  }

  private clearPersisted() { delete process.env[TIMER_STATE_KEY]; }
}
