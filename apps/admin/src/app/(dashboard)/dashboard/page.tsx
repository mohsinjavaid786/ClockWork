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

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    Promise.all([
      api.reports.stats(),
      api.reports.weeklyChart(),
      api.timeEntries.getActive(),
    ])
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
    // Refresh every minute so logged hours (incl. time from running trackers)
    // and the "tracking now" list stay current without a manual refresh.
    const id = setInterval(() => load(), 60_000);
    return () => clearInterval(id);
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
            className="flex items-center gap-2 rounded-md border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-xs font-medium text-[#A1A1A1] hover:bg-[#1A1A1A] hover:text-white disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={`${stats?.todayHours.toFixed(1) ?? '0.0'}h`}
          sub="hours logged"
        />
        <StatCard
          label="Active now"
          value={stats?.activeNow ?? 0}
          sub="members tracking"
        />
        <StatCard
          label="This week"
          value={`${stats?.weeklyHours.toFixed(1) ?? '0.0'}h`}
          trend={stats?.weeklyChange}
          sub="vs last week"
        />
        <StatCard
          label="Screenshots"
          value={stats?.screenshotsToday ?? 0}
          sub="captured today"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-[#2A2A2A] bg-[#111111] p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[#666666]">
            Hours this week
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chart} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#666666', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#666666', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                cursor={{ fill: '#1A1A1A' }}
                formatter={(v) => [`${Number(v)}h`, 'Hours']}
              />
              <Bar dataKey="hours" fill="#ffffff" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[#666666]">
            Tracking now
          </p>
          {active.length === 0 ? (
            <p className="text-sm text-[#444]">No one is tracking right now.</p>
          ) : (
            <div className="space-y-1">
              {active.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => router.push(`/team/${m.userId}`)}
                  className="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-[#1A1A1A]"
                  title={`View ${m.name}'s details`}
                >
                  <div className="relative mt-0.5">
                    <Avatar name={m.name} size="sm" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#22c55e] ring-2 ring-[#111111]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{m.name}</p>
                    <p className="truncate text-[11px] text-[#666666]">
                      {m.projectName ?? 'No project'}
                    </p>
                    <p className="text-[11px] text-[#444]">{formatDuration(m.elapsedSeconds)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
