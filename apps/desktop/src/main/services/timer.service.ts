import { app } from 'electron';
import fs from 'fs';
import path from 'path';

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

interface Store {
  token?: string;
  user?: StoredUser;
  timer?: TimerState;
}

// Session data is persisted as plain JSON in the app's private per-user data
// directory. We deliberately do NOT use Electron safeStorage: on macOS it keeps
// its key in the login keychain, and an ad-hoc-signed app (no Apple Developer
// cert) can never get that access to persist — it just prompts for the keychain
// password on every launch and never sticks. A JWT in the OS-protected userData
// folder is the standard trade-off for an internal tool, and it lets the session
// survive restarts (the old in-memory store lost it on quit).
const storeFile = () => path.join(app.getPath('userData'), 'session.json');

let cache: Store | null = null;

function load(): Store {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(storeFile(), 'utf8')) as Store;
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  try {
    fs.writeFileSync(storeFile(), JSON.stringify(cache ?? {}), 'utf8');
  } catch (err) {
    console.error('Failed to persist session store:', err);
  }
}

export function saveToken(token: string) {
  load().token = token;
  persist();
}

export function getToken(): string | null {
  return load().token ?? null;
}

export function clearToken() {
  delete load().token;
  persist();
}

export function saveUser(user: StoredUser) {
  load().user = user;
  persist();
}

export function getUser(): StoredUser | null {
  return load().user ?? null;
}

export function clearUser() {
  delete load().user;
  persist();
}

export function saveTimerState(state: TimerState) {
  load().timer = state;
  persist();
}

export function getTimerState(): TimerState {
  return load().timer ?? { running: false };
}

export function clearTimerState() {
  delete load().timer;
  persist();
}
