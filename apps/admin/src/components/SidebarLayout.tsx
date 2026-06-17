'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  FolderKanban,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { TimezoneSelect } from '@/components/TimezoneSelect';
import { ThemeToggle } from '@/components/ThemeToggle';

const nav = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/team',        label: 'Team',         icon: Users },
  { href: '/timesheets',  label: 'Timesheets',   icon: Clock },
  { href: '/projects',    label: 'Projects',     icon: FolderKanban },
  { href: '/reports',     label: 'Reports',      icon: BarChart2 },
  { href: '/settings',    label: 'Settings',     icon: Settings },
];

function monogram(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-fog">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-dove/50 bg-fog">
        {/* Logo */}
        <div className="px-5 pb-2 pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ClockWork" className="h-9 w-auto" />
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] transition-colors',
                  active
                    ? 'bg-card text-ink shadow-subtle'
                    : 'text-graphite hover:bg-black/[0.04] hover:text-ink',
                )}
              >
                <Icon size={16} strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="px-3 pb-4">
            <div className="flex items-center gap-3 rounded-[10px] px-3 py-2.5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky text-[13px] font-medium text-ink">
                {monogram(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{user.name}</p>
                <p className="truncate text-[12px] capitalize text-graphite">{user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="rounded-md p-1.5 text-graphite transition-colors hover:bg-black/[0.04] hover:text-error"
              >
                <LogOut size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 flex h-16 items-center justify-end gap-3 border-b border-hair bg-card px-8">
          <TimezoneSelect />
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-[1200px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
