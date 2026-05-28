const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiClient {
  private token: string | null = null;

  setToken(t: string) {
    this.token = t;
  }
  clearToken() {
    this.token = null;
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra,
    };
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  async delete(path: string) {
    const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers: this.headers() });
    if (!res.ok && res.status !== 204) throw new Error(await res.text());
  }

  async getBlob(path: string): Promise<Blob> {
    const res = await fetch(`${API_URL}${path}`, { headers: this.headers({ 'Content-Type': '' }) });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  }
}

export const apiClient = new ApiClient();
