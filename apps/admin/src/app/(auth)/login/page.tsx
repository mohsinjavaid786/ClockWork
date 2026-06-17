'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-fog px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-card bg-card p-8 shadow-card">
          <div className="mb-7 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink">
              <Clock size={15} className="text-white" strokeWidth={2} />
            </span>
            <span className="font-display text-[19px] font-medium tracking-tight text-ink">Clockwork</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[14px] font-medium text-ink">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-ink placeholder:text-graphite outline-none transition-colors focus:border-ink"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-[14px] font-medium text-ink">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-ink underline-offset-2 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-ink placeholder:text-graphite outline-none transition-colors focus:border-ink"
              />
            </div>

            {error && (
              <p className="rounded-field border border-error-bg bg-error-bg px-3 py-2 text-xs text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
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
