import type { MinuteActivity, Screenshot } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cw_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// Raw screenshot row as returned by the API (snake_case), mapped to camelCase Screenshot.
interface RawScreenshot {
  id: string;
  user_id: string;
  time_entry_id: string | null;
  storage_path: string;
  captured_at: string;
  activity_percent: number;
  screen_number: number;
  display_count: number;
  key_count?: number;
  mouse_count?: number;
  active_window?: string | null;
  minute_activity?: MinuteActivity[];
  user: { id: string; name: string; email: string } | null;
  signedUrl?: string;
}

function toScreenshot(s: RawScreenshot): Screenshot {
  return {
    id: s.id,
    userId: s.user_id,
    timeEntryId: s.time_entry_id,
    storagePath: s.storage_path,
    capturedAt: s.captured_at,
    activityPercent: s.activity_percent,
    screenNumber: s.screen_number,
    displayCount: s.display_count,
    keyCount: s.key_count ?? 0,
    mouseCount: s.mouse_count ?? 0,
    activeWindow: s.active_window ?? null,
    minuteActivity: Array.isArray(s.minute_activity) ? s.minute_activity : [],
    user: s.user,
    signedUrl: s.signedUrl,
  };
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; user: { role: string; name: string; email: string; id: string } }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    me: () => request<{ id: string; name: string; email: string; role: string }>('/auth/me'),
    logout: async () => {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch {
        // ignore network/token errors on logout — we clear locally regardless
      }
      if (typeof window !== 'undefined') localStorage.removeItem('cw_token');
      return {};
    },
  },

  users: {
    list: () => request<unknown[]>('/users'),
    me: () => request<unknown>('/users/me'),
    get: (id: string) => request<unknown>(`/users/${id}`),
    invite: (body: unknown) =>
      request('/users/invite', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) =>
      request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },

  projects: {
    list: () => request<unknown[]>('/projects'),
    get: (id: string) => request<unknown>(`/projects/${id}`),
    create: (body: unknown) =>
      request('/projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) =>
      request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
  },

  timeEntries: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ data: unknown[]; total: number; page: number; limit: number; totalPages: number }>(
        `/time-entries${qs}`,
      );
    },
    getActive: () => request<unknown[]>('/time-entries/active'),
    remove: (id: string) => request(`/time-entries/${id}`, { method: 'DELETE' }),
  },

  screenshots: {
    list: async (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const res = await request<{
        data: RawScreenshot[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/screenshots${qs}`);
      return { ...res, data: (res.data ?? []).map(toScreenshot) };
    },
  },

  reports: {
    stats: () =>
      request<{ todayHours: number; activeNow: number; screenshotsToday: number; weeklyHours: number; weeklyChange: number }>(
        '/reports/stats',
      ),
    weeklyChart: () =>
      request<Array<{ day: string; date: string; hours: number }>>('/reports/weekly-chart'),
    csvUrl: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return `${BASE}/api/v1/reports/csv${qs}`;
    },
    pdfUrl: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return `${BASE}/api/v1/reports/pdf${qs}`;
    },
  },

  config: {
    get: () =>
      request<{ screenshotIntervalMinutes: number; companyName: string; timezone: string; slackWebhookUrl?: string }>(
        '/config',
      ),
    update: (body: unknown) =>
      request('/config', { method: 'PATCH', body: JSON.stringify(body) }),
  },

  webhooks: {
    testSlack: () => request('/webhooks/slack/test', { method: 'POST' }),
  },
};
