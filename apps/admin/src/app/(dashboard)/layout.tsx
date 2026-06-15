'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { TimezoneProvider } from '@/context/timezone-context';
import { ToastProvider } from '@/context/toast-context';
import { SidebarLayout } from '@/components/SidebarLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function GuardedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'admin') {
      // The portal is admin-only; members (desktop app users) can't use it.
      router.push('/access-denied');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <ToastProvider>
      <TimezoneProvider>
        <SidebarLayout>{children}</SidebarLayout>
      </TimezoneProvider>
    </ToastProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GuardedLayout>{children}</GuardedLayout>
    </AuthProvider>
  );
}
