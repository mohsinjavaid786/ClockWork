'use client';

import { useRouter } from 'next/navigation';

export default function AccessDeniedPage() {
  const router = useRouter();

  function signOut() {
    if (typeof window !== 'undefined') localStorage.removeItem('cw_token');
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fog px-4">
      <div className="max-w-sm rounded-card bg-card p-8 text-center shadow-card">
        <p className="font-display text-5xl font-medium text-ink">403</p>
        <p className="mt-3 text-sm text-ash">
          This portal is for administrators only.
        </p>
        <p className="mt-2 text-xs text-graphite">
          If you&apos;re an employee, use the Clockwork desktop app to track your time. If you
          believe you should have admin access, contact your administrator.
        </p>
        <button
          onClick={signOut}
          className="mt-6 inline-flex items-center rounded-full border border-dove px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-black/[0.03]"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
