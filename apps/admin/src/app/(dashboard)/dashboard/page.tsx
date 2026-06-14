'use client';

import { useEffect, useState } from 'react';
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [active, setActive] = useState<ActiveMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      .finally(() => setLoading(false));
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
            <div className="space-y-3">
              {active.map((m) => (
                <div key={m.userId} className="flex items-start gap-3">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
