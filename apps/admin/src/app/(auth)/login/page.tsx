'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-mono text-xl font-semibold tracking-widest text-white">CLOCKWORK</h1>
          <p className="mt-2 text-sm text-[#666666]">Sign in to your account</p>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#111111] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none ring-0 transition-colors focus:border-[#444]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none ring-0 transition-colors focus:border-[#444]"
              />
            </div>

            {error && (
              <p className="rounded-md border border-[#3f1515] bg-[#1c0a0a] px-3 py-2 text-xs text-[#ef4444]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#e5e5e5] disabled:opacity-50"
            >
              {loading && <LoadingSpinner size="sm" />}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
