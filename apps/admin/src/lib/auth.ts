'use client';

import { apiClient } from './api';

const TOKEN_KEY = 'trackdesk_admin_token';
const USER_KEY = 'trackdesk_admin_user';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
}

export async function login(email: string, password: string): Promise<AdminUser> {
  const data = await apiClient.post<{ accessToken: string; user: AdminUser }>(
    '/auth/login',
    { email, password },
  );
  if (data.user.role !== 'admin') {
    throw new Error('ACCESS_DENIED');
  }
  sessionStorage.setItem(TOKEN_KEY, data.accessToken);
  sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
  apiClient.setToken(data.accessToken);
  return data.user;
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  apiClient.clearToken();
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AdminUser; } catch { return null; }
}

export function initAuth() {
  const token = getStoredToken();
  if (token) apiClient.setToken(token);
}
