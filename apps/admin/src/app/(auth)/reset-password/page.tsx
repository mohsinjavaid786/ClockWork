'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // The recovery/invite action link redirects here with tokens in the URL hash.
  // getSupabase() (detectSessionInUrl) consumes them and establishes a session.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => {
        setStatus((s) => (s === 'ready' ? s : data.session ? 'ready' : 'invalid'));
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session) setStatus('ready');
      });
      unsub = () => sub.subscription.unsubscribe();
    } catch {
      setStatus('invalid');
      setError('Password reset is not configured. Contact your admin.');
    }
    return () => unsub?.();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setSaving(false);
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

          {status === 'loading' && (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="sm" />
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4">
              <p className="text-sm text-ash">
                {error || 'This link is invalid or has expired. Ask your admin to re-send the invite, or request a new reset link.'}
              </p>
              <Link
                href="/forgot-password"
                className="inline-block text-sm font-medium text-ink underline-offset-2 hover:underline"
              >
                Request a new link
              </Link>
            </div>
          )}

          {status === 'ready' && done && (
            <p className="py-4 text-center text-sm text-success">
              Password set. Redirecting you to sign in…
            </p>
          )}

          {status === 'ready' && !done && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[14px] font-medium text-ink">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-ink placeholder:text-graphite outline-none transition-colors focus:border-ink"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[14px] font-medium text-ink">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
              >
                {saving && <LoadingSpinner size="sm" />}
                Set password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
