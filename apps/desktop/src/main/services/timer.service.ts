import { safeStorage } from 'electron';

const TOKEN_KEY = 'cw_token';
const USER_KEY = 'cw_user';
const TIMER_KEY = 'cw_timer';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TimerState {
  running: boolean;
  paused?: boolean;
  entryId?: string;
  startedAt?: string;
  projectId?: string;
  description?: string;
}

function encrypt(value: string): Buffer {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value);
  }
  return Buffer.from(value, 'utf8');
}

function decrypt(buf: Buffer): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(buf);
  }
  return buf.toString('utf8');
}

const store = new Map<string, Buffer>();

export function saveToken(token: string) {
  store.set(TOKEN_KEY, encrypt(token));
}

export function getToken(): string | null {
  const buf = store.get(TOKEN_KEY);
  if (!buf) return null;
  try {
    return decrypt(buf);
  } catch {
    return null;
  }
}

export function clearToken() {
  store.delete(TOKEN_KEY);
}

export function saveUser(user: StoredUser) {
  store.set(USER_KEY, encrypt(JSON.stringify(user)));
}

export function getUser(): StoredUser | null {
  const buf = store.get(USER_KEY);
  if (!buf) return null;
  try {
    return JSON.parse(decrypt(buf)) as StoredUser;
  } catch {
    return null;
  }
}

export function clearUser() {
  store.delete(USER_KEY);
}

export function saveTimerState(state: TimerState) {
  store.set(TIMER_KEY, Buffer.from(JSON.stringify(state), 'utf8'));
}

export function getTimerState(): TimerState {
  const buf = store.get(TIMER_KEY);
  if (!buf) return { running: false };
  try {
    return JSON.parse(buf.toString('utf8')) as TimerState;
  } catch {
    return { running: false };
  }
}

export function clearTimerState() {
  store.delete(TIMER_KEY);
}
