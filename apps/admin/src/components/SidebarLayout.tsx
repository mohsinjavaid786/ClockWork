'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  FolderKanban,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const nav = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/team',        label: 'Team',         icon: Users },
  { href: '/timesheets',  label: 'Timesheets',   icon: Clock },
  { href: '/work-diary',  label: 'Work Diary',   icon: CalendarDays },
  { href: '/projects',    label: 'Projects',     icon: FolderKanban },
  { href: '/reports',     label: 'Reports',      icon: BarChart2 },
  { href: '/settings',    label: 'Settings',     icon: Settings },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      <aside className="flex w-56 flex-col border-r border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="border-b border-[#2A2A2A] px-5 py-4">
          <span className="font-mono text-sm font-semibold tracking-widest text-white">
            CLOCKWORK
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[#1A1A1A] text-white'
                    : 'text-[#666666] hover:bg-[#111111] hover:text-[#A1A1A1]',
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-[#2A2A2A] px-2 py-3">
            <div className="mb-1 px-3 py-1">
              <p className="text-xs font-medium text-white truncate">{user.name}</p>
              <p className="text-[11px] text-[#666666] truncate">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#666666] transition-colors hover:bg-[#111111] hover:text-[#ef4444]"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
