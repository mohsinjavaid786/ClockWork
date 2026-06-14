'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ClockWork" className="mx-auto h-14 w-auto" />
          <p className="mt-3 text-sm text-[#666666]">Reset your password</p>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#111111] p-6">
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-[#A1A1A1]">
                If an account exists for <span className="text-white">{email}</span>, a reset link
                is on its way. Check your inbox (and spam folder).
              </p>
              <Link
                href="/login"
                className="inline-block text-sm font-medium text-white underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none ring-0 transition-colors focus:border-[#444]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#e5e5e5] disabled:opacity-50"
              >
                {loading && <LoadingSpinner size="sm" />}
                Send reset link
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-[#666666] underline-offset-4 hover:text-[#A1A1A1] hover:underline"
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
