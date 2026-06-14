'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ClockWork" className="mx-auto h-14 w-auto" />
          <p className="mt-3 text-sm text-[#666666]">Choose a new password</p>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#111111] p-6">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="sm" />
            </div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-[#A1A1A1]">
                {error || 'This link is invalid or has expired. Ask your admin to re-send the invite, or request a new reset link.'}
              </p>
              <Link
                href="/forgot-password"
                className="inline-block text-sm font-medium text-white underline-offset-4 hover:underline"
              >
                Request a new link
              </Link>
            </div>
          )}

          {status === 'ready' && done && (
            <p className="py-4 text-center text-sm text-[#A1A1A1]">
              Password set. Redirecting you to sign in…
            </p>
          )}

          {status === 'ready' && !done && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none ring-0 transition-colors focus:border-[#444]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#e5e5e5] disabled:opacity-50"
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
