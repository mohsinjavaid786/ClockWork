'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDuration } from '@/lib/utils';

interface Stats {
  todayHours: number;
  activeNow: number;
  screenshotsToday: number;
  weeklyHours: number;
  weeklyChange: number;
}

interface ChartPoint {
  day: string;
  date: string;
  hours: number;
}

interface ActiveMember {
  userId: string;
  name: string;
  email: string;
  projectName?: string;
  description?: string;
  elapsedSeconds: number;
  startedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [active, setActive] = useState<ActiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number>(() => 0);

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    Promise.all([api.reports.stats(), api.reports.weeklyChart(), api.timeEntries.getActive()])
      .then(([s, c, a]) => {
        setStats(s);
        setChart(c);
        setActive(a as ActiveMember[]);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => {
    load();
    const data = setInterval(() => load(), 60_000);
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(data);
      clearInterval(clock);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of team activity and time tracking"
        action={
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-full border border-dove px-4 py-2 text-[15px] text-ink transition-colors hover:bg-black/[0.03] disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={`${stats?.todayHours.toFixed(1) ?? '0.0'}h`} sub="hours logged" />
        <StatCard label="Active now" value={stats?.activeNow ?? 0} sub="members tracking" />
        <StatCard
          label="This week"
          value={`${stats?.weeklyHours.toFixed(1) ?? '0.0'}h`}
          trend={stats?.weeklyChange}
          sub="vs last week"
        />
        <StatCard label="Screenshots" value={stats?.screenshotsToday ?? 0} sub="captured today" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cool data card — weekly hours */}
        <div className="rounded-card bg-sky p-6 lg:col-span-2">
          <p className="mb-5 text-[15px] font-medium text-ink">Hours this week</p>
          <ResponsiveContainer width="100%" height={208}>
            <BarChart data={chart} margin={{ top: 4, right: 0, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="0" stroke="rgba(23,25,28,0.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#4c4c4c', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#777b86', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: 'rgba(0,0,0,0.12) 0px 8px 24px -6px',
                  color: '#17191c',
                  fontSize: '13px',
                }}
                cursor={{ fill: 'rgba(23,25,28,0.05)' }}
                formatter={(v) => [`${Number(v)}h`, 'Hours']}
              />
              <Bar dataKey="hours" fill="#4a90e2" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tracking now */}
        <div className="rounded-card bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[15px] font-medium text-ink">Tracking now</p>
            {active.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {active.length} live
              </span>
            )}
          </div>
          {active.length === 0 ? (
            <p className="py-6 text-[14px] text-graphite">No one is tracking right now.</p>
          ) : (
            <div className="-mx-2 space-y-0.5">
              {active.map((m) => {
                const elapsed = now
                  ? Math.floor((now - new Date(m.startedAt).getTime()) / 1000)
                  : m.elapsedSeconds;
                return (
                  <button
                    key={m.userId}
                    onClick={() => router.push(`/team/${m.userId}`)}
                    className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-fog"
                    title={`View ${m.name}'s details`}
                  >
                    <div className="relative">
                      <Avatar name={m.name} size="sm" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{m.name}</p>
                      <p className="truncate text-[12px] text-graphite">{m.projectName ?? 'No project'}</p>
                    </div>
                    <span className="font-mono text-[13px] tabular-nums text-ash">
                      {formatDuration(elapsed)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
