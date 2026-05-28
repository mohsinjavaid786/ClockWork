'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'ACCESS_DENIED') {
        router.push('/access-denied');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-slate-800 rounded-xl p-8 w-96 shadow-2xl">
        <h1 className="text-2xl font-bold mb-1">TrackDesk</h1>
        <p className="text-slate-400 text-sm mb-6">Admin portal</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            className="bg-primary hover:bg-primary-dark text-white rounded-lg py-2.5 font-semibold disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
