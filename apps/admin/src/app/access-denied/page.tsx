import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
      <p className="text-slate-400">Only admins can access this portal.</p>
      <Link href="/login" className="text-primary underline">Back to login</Link>
    </div>
  );
}
