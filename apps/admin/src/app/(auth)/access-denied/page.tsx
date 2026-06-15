'use client';

import { useRouter } from 'next/navigation';

export default function AccessDeniedPage() {
  const router = useRouter();

  function signOut() {
    if (typeof window !== 'undefined') localStorage.removeItem('cw_token');
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="max-w-sm text-center">
        <p className="font-mono text-5xl font-semibold text-white">403</p>
        <p className="mt-3 text-sm text-[#A1A1A1]">
          This portal is for administrators only.
        </p>
        <p className="mt-2 text-xs text-[#666666]">
          If you&apos;re an employee, use the Clockwork desktop app to track your time. If you
          believe you should have admin access, contact your administrator.
        </p>
        <button
          onClick={signOut}
          className="mt-6 inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#e5e5e5]"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
