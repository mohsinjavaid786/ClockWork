'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
    } catch {
      // The endpoint always succeeds; ignore transient errors and show the same
      // confirmation so we never reveal whether an email is registered.
    } finally {
      setLoading(false);
      setSent(true);
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

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-ash">
                If an account exists for <span className="text-ink">{email}</span>, a reset link
                is on its way. Check your inbox (and spam folder).
              </p>
              <Link
                href="/login"
                className="inline-block text-sm font-medium text-ink underline-offset-2 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[14px] font-medium text-ink">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-ink placeholder:text-graphite outline-none transition-colors focus:border-ink"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
              >
                {loading && <LoadingSpinner size="sm" />}
                Send reset link
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-ink underline-offset-2 hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
