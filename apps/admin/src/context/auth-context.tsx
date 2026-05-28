'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cw_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('cw_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    localStorage.setItem('cw_token', data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    localStorage.removeItem('cw_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
