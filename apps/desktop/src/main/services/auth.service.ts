import { safeStorage } from 'electron';

const TOKEN_KEY = 'trackdesk_token';
const USER_KEY = 'trackdesk_user';
const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3001';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
}

export class AuthService {
  async login(email: string, password: string): Promise<{ accessToken: string; user: UserInfo }> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json() as { error: string };
      throw new Error(err.error ?? 'Login failed');
    }
    const data = await res.json() as { accessToken: string; user: UserInfo };
    this.storeToken(data.accessToken);
    this.storeUser(data.user);
    return data;
  }

  logout() {
    this.clearToken();
    this.clearUser();
  }

  getToken(): string | null {
    try {
      const encrypted = Buffer.from(
        JSON.parse(process.env[TOKEN_KEY] ?? '{}').data ?? '',
        'base64',
      );
      if (!encrypted.length) return null;
      return safeStorage.decryptString(encrypted);
    } catch {
      return this.getTokenFallback();
    }
  }

  getUser(): UserInfo | null {
    const raw = process.env[USER_KEY];
    if (!raw) return null;
    try { return JSON.parse(raw) as UserInfo; } catch { return null; }
  }

  private storeToken(token: string) {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      process.env[TOKEN_KEY] = JSON.stringify({ data: encrypted.toString('base64') });
    } else {
      process.env[TOKEN_KEY] = JSON.stringify({ plain: token });
    }
  }

  private getTokenFallback(): string | null {
    const raw = process.env[TOKEN_KEY];
    if (!raw) return null;
    try { return (JSON.parse(raw) as { plain?: string }).plain ?? null; } catch { return null; }
  }

  private storeUser(user: UserInfo) {
    process.env[USER_KEY] = JSON.stringify(user);
  }

  private clearToken() { delete process.env[TOKEN_KEY]; }
  private clearUser() { delete process.env[USER_KEY]; }
}
