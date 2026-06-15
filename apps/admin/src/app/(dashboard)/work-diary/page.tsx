'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { DayMeta } from '@/lib/types';
import { DayDetailPanel } from '@/components/DayDetailPanel';
import { PageHeader } from '@/components/PageHeader';

// ── Utility ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]!;
}

function mondayOf(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function fmtHHMM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')} hrs`;
}

function fmtMonth(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function fmtWeekRange(mon: Date) {
  const sun = addDays(mon, 6);
  const mo = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const su = sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${mo} – ${su}`;
}

// ── Member picker ─────────────────────────────────────────────────────────────

interface Member { id: string; name: string; email: string; role: string }
interface DiaryEntry { started_at: string; duration_seconds: number | null; status: string }

// ── Calendar ──────────────────────────────────────────────────────────────────

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarProps {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  selectedWeekMon: Date;
  onSelectWeek: (mon: Date) => void;
  dayMeta: Map<string, DayMeta>;
}

function Calendar({ month, onPrev, onNext, selectedWeekMon, onSelectWeek, dayMeta }: CalendarProps) {
  const today = toDateStr(new Date());
  const selectedMonStr = toDateStr(selectedWeekMon);
  const selectedSunStr = toDateStr(addDays(selectedWeekMon, 6));

  // Build grid: find first Monday on or before the 1st of the month
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = mondayOf(firstDay);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  function isInSelectedWeek(d: Date) {
    const s = toDateStr(d);
    return s >= selectedMonStr && s <= selectedSunStr;
  }

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#111111] p-4">
      {/* Month nav */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onPrev} className="rounded p-1.5 text-[#666666] hover:bg-[#1A1A1A] hover:text-white transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="font-mono text-sm font-semibold text-white">{fmtMonth(month)}</span>
        <button onClick={onNext} className="rounded p-1.5 text-[#666666] hover:bg-[#1A1A1A] hover:text-white transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7">
        {DOW.map(d => (
          <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wider text-[#444]">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          const ds = toDateStr(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = ds === today;
          const meta = dayMeta.get(ds);
          const inWeek = isInSelectedWeek(d);

          return (
            <button
              key={i}
              onClick={() => onSelectWeek(mondayOf(d))}
              className="relative flex flex-col items-center py-1 transition-colors"
              style={{
                background: inWeek ? '#1A1A1A' : 'transparent',
                borderRadius: inWeek ? (i % 7 === 0 ? '6px 0 0 6px' : i % 7 === 6 ? '0 6px 6px 0' : '0') : '6px',
              }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors"
                style={{
                  background: isToday ? '#fff' : 'transparent',
                  color: isToday ? '#000' : inMonth ? '#A1A1A1' : '#333',
                }}
              >
                {d.getDate()}
              </span>
              {/* Activity dots */}
              <div className="flex gap-0.5 h-1.5">
                {meta && meta.hours > 0 && (
                  <span className="h-1 w-1 rounded-full bg-[#22c55e]" />
                )}
                {meta && meta.hasOvertime && (
                  <span className="h-1 w-1 rounded-sm bg-[#ef4444]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 border-t border-[#2A2A2A] pt-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[#666666]">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" /> Tracked
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#666666]">
          <span className="h-2 w-2 rounded-sm bg-[#ef4444]" /> Overtime
        </div>
      </div>
    </div>
  );
}

// ── Horizontal week bar chart ─────────────────────────────────────────────────

interface WeekBarProps {
  weekMon: Date;
  dayMeta: Map<string, DayMeta>;
  onClickDay: (dateStr: string) => void;
}

function WeekBars({ weekMon, dayMeta, onClickDay }: WeekBarProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekMon, i));
  const hours = days.map(d => dayMeta.get(toDateStr(d))?.hours ?? 0);
  const maxH = Math.max(...hours, 8); // at least 8 h = full bar

  const totalTracked = hours.reduce((s, h) => s + Math.min(h, 8), 0);
  const totalOvertime = hours.reduce((s, h) => s + Math.max(0, h - 8), 0);
  const totalHours = hours.reduce((a, b) => a + b, 0);

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-[#2A2A2A] bg-[#111111] overflow-hidden">
      {/* Week header */}
      <div className="border-b border-[#2A2A2A] px-5 py-3">
        <span className="font-mono text-sm font-semibold text-white">{fmtWeekRange(weekMon)}</span>
      </div>

      {/* Bars */}
      <div className="flex flex-col gap-0 flex-1 px-5 py-4">
        {days.map((d, i) => {
          const ds = toDateStr(d);
          const h = hours[i]!;
          const regularPct = (Math.min(h, 8) / maxH) * 100;
          const overtimePct = (Math.max(0, h - 8) / maxH) * 100;
          const isToday = ds === toDateStr(new Date());

          return (
            <button
              key={ds}
              onClick={() => h > 0 && onClickDay(ds)}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#1A1A1A]"
              style={{ cursor: h > 0 ? 'pointer' : 'default' }}
            >
              <span className="w-28 text-left text-sm" style={{ color: isToday ? '#fff' : '#666666' }}>
                <span className="mr-1.5 font-mono text-xs text-[#444]">{d.getDate()}</span>
                {DAY_NAMES[i]}
              </span>
              <div className="relative flex-1 h-6 rounded overflow-hidden" style={{ background: '#1A1A1A' }}>
                {/* Regular hours */}
                {regularPct > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-500"
                    style={{ width: `${regularPct}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)' }}
                  />
                )}
                {/* Overtime */}
                {overtimePct > 0 && (
                  <div
                    className="absolute inset-y-0 transition-all duration-500"
                    style={{ left: `${regularPct}%`, width: `${overtimePct}%`, background: '#7f1d1d' }}
                  />
                )}
              </div>
              <span className="w-20 text-right font-mono text-sm" style={{ color: h > 0 ? '#fff' : '#333' }}>
                {fmtHHMM(h)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer totals */}
      <div className="grid grid-cols-3 border-t border-[#2A2A2A] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#444]">Tracked</p>
            <p className="font-mono text-sm font-semibold text-white">{fmtHHMM(totalTracked)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#ef4444]" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#444]">Overtime</p>
            <p className="font-mono text-sm font-semibold" style={{ color: totalOvertime > 0 ? '#ef4444' : '#333' }}>
              {totalOvertime > 0 ? fmtHHMM(totalOvertime) : '—'}
            </p>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#444]">Total this week</p>
          <p className="font-mono text-sm font-semibold text-white">{fmtHHMM(totalHours)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkDiaryPage() {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedWeekMon, setSelectedWeekMon] = useState(mondayOf(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    // Only employees track time — exclude admins from the picker.
    api.users
      .list()
      .then((d) => setMembers(((d as Member[]) ?? []).filter((m) => m.role !== 'admin')))
      .catch(() => {});
  }, []);

  // Real time entries for the selected account (or all members).
  useEffect(() => {
    const params: Record<string, string> = { limit: '1000' };
    if (selectedUserId) params['userId'] = selectedUserId;
    api.timeEntries
      .list(params)
      .then(res => setEntries(((res as { data: DiaryEntry[] }).data) ?? []))
      .catch(() => setEntries([]));
  }, [selectedUserId]);

  // dayMeta: aggregate real entries into per-day hours
  const dayMeta = useMemo<Map<string, DayMeta>>(() => {
    const map = new Map<string, DayMeta>();
    for (const e of entries) {
      const secs = e.duration_seconds ?? 0;
      if (secs <= 0) continue;
      const ds = toDateStr(new Date(e.started_at));
      const prev = map.get(ds) ?? { hours: 0, hasOvertime: false, entryCount: 0 };
      const hours = prev.hours + secs / 3600;
      map.set(ds, { hours, hasOvertime: hours > 8, entryCount: prev.entryCount + 1 });
    }
    return map;
  }, [entries]);

  // Stat cards computed from real entries (scoped to the selected account)
  const { last24h, thisWeek, lastWeek, sinceStart, weeklyChange } = useMemo(() => {
    const now = Date.now();
    const DAY_MS = 86_400_000;
    const weekMon = mondayOf(new Date());
    const thisWeekStart = weekMon.getTime();
    const lastWeekStart = addDays(weekMon, -7).getTime();
    let l24 = 0, tw = 0, lw = 0, total = 0;
    for (const e of entries) {
      const secs = e.duration_seconds ?? 0;
      if (secs <= 0) continue;
      const t = new Date(e.started_at).getTime();
      const hrs = secs / 3600;
      total += hrs;
      if (t >= now - DAY_MS) l24 += hrs;
      if (t >= thisWeekStart) tw += hrs;
      else if (t >= lastWeekStart) lw += hrs;
    }
    return {
      last24h: l24,
      thisWeek: tw,
      lastWeek: lw,
      sinceStart: total,
      weeklyChange: lw > 0 ? Math.round(((tw - lw) / lw) * 100) : 0,
    };
  }, [entries]);

  function handleSelectWeek(mon: Date) {
    setSelectedWeekMon(mon);
    setCalMonth(new Date(mon.getFullYear(), mon.getMonth(), 1));
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Work Diary"
            description="Calendar view of tracked time, sessions, and screenshots"
          />
          {/* Member picker */}
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="rounded-md border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#444]"
          >
            <option value="">All members</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Last 24 hours',  value: fmtHHMM(last24h),   sub: undefined as string | undefined, subUp: true },
            { label: 'This week',      value: fmtHHMM(thisWeek),  sub: (thisWeek > 0 || lastWeek > 0) ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange}% vs last week` : undefined, subUp: weeklyChange >= 0 },
            { label: 'Last week',      value: fmtHHMM(lastWeek),  sub: undefined as string | undefined, subUp: true },
            { label: 'Since start',    value: fmtHHMM(sinceStart), sub: undefined as string | undefined, subUp: true },
          ].map(({ label, value, sub, subUp }) => (
            <div key={label} className="rounded-xl border border-[#2A2A2A] bg-[#111111] px-5 py-4">
              <p className="text-xs text-[#666666]">{label}</p>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-white">{value}</p>
              {sub && <p className="mt-0.5 text-xs" style={{ color: subUp ? '#22c55e' : '#ef4444' }}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* Calendar + week bars */}
        <div className="flex gap-5 items-start">
          {/* Calendar */}
          <div className="w-72 flex-shrink-0">
            <Calendar
              month={calMonth}
              onPrev={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              onNext={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              selectedWeekMon={selectedWeekMon}
              onSelectWeek={handleSelectWeek}
              dayMeta={dayMeta}
            />
          </div>

          {/* Week bars */}
          <WeekBars
            weekMon={selectedWeekMon}
            dayMeta={dayMeta}
            onClickDay={ds => setSelectedDay(ds)}
          />
        </div>
      </div>

      {/* Day detail panel */}
      <DayDetailPanel
        date={selectedDay}
        userId={selectedUserId || undefined}
        onClose={() => setSelectedDay(null)}
      />
    </>
  );
}
