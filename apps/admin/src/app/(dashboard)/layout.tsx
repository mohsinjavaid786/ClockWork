'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { SidebarLayout } from '@/components/SidebarLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function GuardedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return <SidebarLayout>{children}</SidebarLayout>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GuardedLayout>{children}</GuardedLayout>
    </AuthProvider>
  );
}
