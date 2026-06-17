'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DashboardTimeline } from '@/components/DashboardTimeline';
import { formatDuration } from '@/lib/utils';

const DAY = 86_400_000;

interface RangeData {
  totalHours: number;
  activeNow: number;
  screenshots: number;
  entries: number;
  series: Array<{ label: string; date: string; hours: number }>;
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

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}
function bucketFor(from: Date, to: Date): 'day' | 'week' | 'month' {
  const days = (to.getTime() - from.getTime()) / DAY;
  if (days <= 31) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

const PRESETS: { value: string; label: string; range: () => [Date, Date] }[] = [
  { value: '7d', label: 'Last 7 days', range: () => [startOfDay(new Date(Date.now() - 6 * DAY)), startOfDay(new Date())] },
  { value: '30d', label: 'Last 30 days', range: () => [startOfDay(new Date(Date.now() - 29 * DAY)), startOfDay(new Date())] },
  { value: '90d', label: 'Last 3 months', range: () => [startOfDay(new Date(Date.now() - 89 * DAY)), startOfDay(new Date())] },
  { value: '6m', label: 'Last 6 months', range: () => [startOfDay(new Date(Date.now() - 182 * DAY)), startOfDay(new Date())] },
  { value: 'ytd', label: 'Year to date', range: () => [new Date(new Date().getFullYear(), 0, 1), startOfDay(new Date())] },
  { value: '12m', label: 'Last 12 months', range: () => [startOfDay(new Date(Date.now() - 364 * DAY)), startOfDay(new Date())] },
];

function fmtRangeLabel(from: Date, to: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const isToday = startOfDay(to).getTime() === startOfDay(new Date()).getTime();
  return `${from.toLocaleDateString('en-US', opts)} – ${isToday ? 'Today' : to.toLocaleDateString('en-US', opts)}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [from, setFrom] = useState<Date>(() => startOfDay(new Date(Date.now() - 89 * DAY)));
  const [to, setTo] = useState<Date>(() => startOfDay(new Date()));
  const [preset, setPreset] = useState('90d');
  const [data, setData] = useState<RangeData | null>(null);
  const [active, setActive] = useState<ActiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(0);

  const bucket = useMemo(() => bucketFor(from, to), [from, to]);

  // Latest window, readable from the mount-only refresh interval without
  // re-subscribing it on every range change.
  const fromRef = useRef(from);
  const toRef = useRef(to);
  fromRef.current = from;
  toRef.current = to;

  const loadRange = useCallback(
    (f: Date, t: Date) =>
      api.reports
        .range({ from: startOfDay(f).toISOString(), to: endOfDay(t).toISOString(), bucket: bucketFor(f, t) })
        .then((d) => setData(d))
        .catch(console.error),
    [],
  );

  const loadActive = useCallback(
    () => api.timeEntries.getActive().then((a) => setActive(a as ActiveMember[])).catch(console.error),
    [],
  );

  useEffect(() => {
    Promise.all([loadRange(from, to), loadActive()]).finally(() => setLoading(false));
    setNow(Date.now());
    // Refresh the live roster AND the period KPIs/chart every minute so hours,
    // sessions and screenshots reflect time accruing on running trackers — not
    // only the live "Active now" count.
    const a = setInterval(() => {
      loadActive();
      loadRange(fromRef.current, toRef.current);
    }, 60_000);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(a);
      clearInterval(c);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-pull range data whenever the window changes.
  useEffect(() => {
    loadRange(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function applyPreset(value: string) {
    setPreset(value);
    const p = PRESETS.find((x) => x.value === value);
    if (p) {
      const [f, t] = p.range();
      setFrom(f);
      setTo(t);
    }
  }

  function onTimeline(f: Date, t: Date) {
    setPreset('custom');
    setFrom(f);
    setTo(t);
  }

  async function refresh() {
    setRefreshing(true);
    await Promise.all([loadRange(from, to), loadActive()]);
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const series = data?.series ?? [];
  const tickStep = Math.max(0, Math.floor(series.length / 8));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Team activity and time tracking for the selected period"
        action={
          <div className="flex items-center gap-2">
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value)}
              className="rounded-field border border-dove bg-card px-3 py-2 text-[14px] text-ink outline-none focus:border-ink"
            >
              {preset === 'custom' && <option value="custom">Custom range</option>}
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-full border border-dove px-4 py-2 text-[14px] text-ink transition-colors hover:bg-black/[0.03] disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Scrubbable timeline */}
      <div className="rounded-card bg-card p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink">{fmtRangeLabel(from, to)}</span>
          <span className="text-[12px] text-graphite">Drag the band to change the period</span>
        </div>
        <DashboardTimeline from={from} to={to} onChange={onTimeline} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Hours tracked" value={`${(data?.totalHours ?? 0).toFixed(1)}h`} sub="in period" />
        <StatCard label="Active now" value={active.length} sub="members tracking" />
        <StatCard label="Sessions" value={data?.entries ?? 0} sub="in period" />
        <StatCard label="Screenshots" value={data?.screenshots ?? 0} sub="in period" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cool data card — hours over the period */}
        <div className="rounded-card bg-sky p-6 lg:col-span-2">
          <p className="mb-5 text-[15px] font-medium text-ink">Hours over period</p>
          <ResponsiveContainer width="100%" height={208}>
            <BarChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="0" stroke="rgba(127,127,127,0.18)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8a8d96', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={tickStep}
              />
              <YAxis tick={{ fill: '#8a8d96', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--c-card))',
                  border: '1px solid rgb(var(--c-hair))',
                  borderRadius: '12px',
                  color: 'rgb(var(--c-ink))',
                  fontSize: '13px',
                }}
                cursor={{ fill: 'rgba(127,127,127,0.12)' }}
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
                    <span className="font-mono text-[13px] tabular-nums text-ash">{formatDuration(elapsed)}</span>
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
