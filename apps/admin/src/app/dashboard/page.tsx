'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/ui/StatCard';
import { WeeklyHoursChart, DailyEntry } from '@/components/charts/WeeklyHoursChart';
import { apiClient } from '@/lib/api';
import { initAuth } from '@/lib/auth';
import type { TimeEntry, User } from '@trackdesk/shared';

interface LiveEmployee { name: string; email: string; elapsed: number; }

export default function DashboardPage() {
  const [stats, setStats] = useState({ todayHours: 0, activeNow: 0, screenshotsToday: 0, weeklyHours: 0, lastWeekHours: 0 });
  const [liveEmployees, setLiveEmployees] = useState<LiveEmployee[]>([]);
  const [chartData, setChartData] = useState<DailyEntry[]>([]);
  const [employees, setEmployees] = useState<string[]>([]);

  useEffect(() => {
    initAuth();
    loadDashboard();
    const interval = setInterval(loadDashboard, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [entriesRes, screenshotsRes, usersRes] = await Promise.allSettled([
      apiClient.get<{ data: TimeEntry[] }>(`/time-entries?startDate=${weekStart.toISOString()}&limit=200`),
      apiClient.get<{ data: unknown[] }>(`/screenshots?startDate=${todayStr}T00:00:00Z`),
      apiClient.get<User[]>('/users'),
    ]);

    if (entriesRes.status === 'fulfilled' && usersRes.status === 'fulfilled') {
      const entries = entriesRes.value.data;
      const users = usersRes.value;

      const todayEntries = entries.filter((e) => e.startedAt.startsWith(todayStr));
      const todayHours = todayEntries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / 3600;
      const weeklyHours = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / 3600;

      const live = entries
        .filter((e) => e.isRunning)
        .map((e) => {
          const user = users.find((u) => u.id === e.userId);
          return {
            name: user?.name ?? 'Unknown',
            email: user?.email ?? '',
            elapsed: Date.now() - new Date(e.startedAt).getTime(),
          };
        });

      setLiveEmployees(live);
      setStats((s) => ({ ...s, todayHours: Math.round(todayHours * 10) / 10, activeNow: live.length, weeklyHours: Math.round(weeklyHours * 10) / 10 }));

      // Build chart data (last 7 days per employee)
      const empNames = [...new Set(entries.map((e) => users.find((u) => u.id === e.userId)?.name ?? e.userId))];
      const days: DailyEntry[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const row: DailyEntry = { date: dayStr.slice(5) };
        for (const name of empNames) {
          const user = users.find((u) => u.name === name);
          const h = entries
            .filter((e) => e.userId === user?.id && e.startedAt.startsWith(dayStr))
            .reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / 3600;
          row[name] = Math.round(h * 10) / 10;
        }
        days.push(row);
      }
      setChartData(days);
      setEmployees(empNames.slice(0, 6));
    }

    if (screenshotsRes.status === 'fulfilled') {
      setStats((s) => ({ ...s, screenshotsToday: screenshotsRes.value.data.length }));
    }
  }

  function formatMs(ms: number) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  return (
    <AdminLayout>
      <h2 className="text-xl font-bold mb-5">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Today's Hours" value={`${stats.todayHours}h`} />
        <StatCard title="Active Now" value={stats.activeNow} />
        <StatCard title="Screenshots Today" value={stats.screenshotsToday} />
        <StatCard title="Weekly Hours" value={`${stats.weeklyHours}h`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4">Weekly Hours by Employee</h3>
          <WeeklyHoursChart data={chartData} employees={employees} />
        </div>

        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4">Live Activity</h3>
          {liveEmployees.length === 0 ? (
            <p className="text-slate-500 text-sm">No one is tracking right now.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {liveEmployees.map((e) => (
                <li key={e.email} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-slate-500">{e.email}</p>
                  </div>
                  <span className="text-green-400 text-sm font-mono">{formatMs(e.elapsed)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
