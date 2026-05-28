import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
      <div className="text-center">
        <p className="font-mono text-5xl font-semibold text-white">403</p>
        <p className="mt-3 text-sm text-[#666666]">You don&apos;t have permission to access this page.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[#e5e5e5] transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
