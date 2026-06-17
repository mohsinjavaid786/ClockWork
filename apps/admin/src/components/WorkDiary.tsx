'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { DayMeta } from '@/lib/types';
import { DayDetailPanel } from '@/components/DayDetailPanel';

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

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = mondayOf(firstDay);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  function isInSelectedWeek(d: Date) {
    const s = toDateStr(d);
    return s >= selectedMonStr && s <= selectedSunStr;
  }

  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onPrev} className="rounded-full p-1.5 text-graphite hover:bg-fog hover:text-ink transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-medium text-ink">{fmtMonth(month)}</span>
        <button onClick={onNext} className="rounded-full p-1.5 text-graphite hover:bg-fog hover:text-ink transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium uppercase tracking-wider text-graphite">{d}</div>
        ))}
      </div>

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
                background: inWeek ? 'rgb(var(--c-fog))' : 'transparent',
                borderRadius: inWeek ? (i % 7 === 0 ? '6px 0 0 6px' : i % 7 === 6 ? '0 6px 6px 0' : '0') : '6px',
              }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium"
                style={{
                  background: isToday ? 'rgb(var(--c-ink))' : 'transparent',
                  color: isToday ? 'rgb(var(--c-card))' : inMonth ? 'rgb(var(--c-ink))' : 'rgb(var(--c-dove))',
                }}
              >
                {d.getDate()}
              </span>
              <div className="flex h-1.5 gap-0.5">
                {meta && meta.hours > 0 && <span className="h-1 w-1 rounded-full bg-success" />}
                {meta && meta.hasOvertime && <span className="h-1 w-1 rounded-sm bg-error" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-hair pt-3">
        <div className="flex items-center gap-1.5 text-[11px] text-graphite">
          <span className="h-2 w-2 rounded-full bg-success" /> Tracked
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-graphite">
          <span className="h-2 w-2 rounded-sm bg-error" /> Overtime
        </div>
      </div>
    </div>
  );
}

// ── Week bars ──────────────────────────────────────────────────────────────────

interface WeekBarProps {
  weekMon: Date;
  dayMeta: Map<string, DayMeta>;
  onClickDay: (dateStr: string) => void;
}

function WeekBars({ weekMon, dayMeta, onClickDay }: WeekBarProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekMon, i));
  const hours = days.map((d) => dayMeta.get(toDateStr(d))?.hours ?? 0);
  const maxH = Math.max(...hours, 8);

  const totalTracked = hours.reduce((s, h) => s + Math.min(h, 8), 0);
  const totalOvertime = hours.reduce((s, h) => s + Math.max(0, h - 8), 0);
  const totalHours = hours.reduce((a, b) => a + b, 0);

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-card bg-card shadow-card">
      <div className="border-b border-hair px-5 py-3">
        <span className="text-sm font-medium text-ink">{fmtWeekRange(weekMon)}</span>
      </div>

      <div className="flex flex-1 flex-col px-5 py-4">
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
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-fog"
              style={{ cursor: h > 0 ? 'pointer' : 'default' }}
            >
              <span className={`w-28 text-left text-sm ${isToday ? 'text-ink' : 'text-graphite'}`}>
                <span className="mr-1.5 font-mono text-xs text-dove">{d.getDate()}</span>
                {DAY_NAMES[i]}
              </span>
              <div className="relative h-6 flex-1 overflow-hidden rounded bg-fog">
                {regularPct > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-500"
                    style={{ width: `${regularPct}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)' }}
                  />
                )}
                {overtimePct > 0 && (
                  <div
                    className="absolute inset-y-0 transition-all duration-500"
                    style={{ left: `${regularPct}%`, width: `${overtimePct}%`, background: '#b91c1c' }}
                  />
                )}
              </div>
              <span className={`w-20 text-right font-mono text-sm ${h > 0 ? 'text-ink' : 'text-dove'}`}>
                {fmtHHMM(h)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 border-t border-hair px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-graphite">Tracked</p>
            <p className="font-mono text-sm font-semibold text-ink">{fmtHHMM(totalTracked)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-error" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-graphite">Overtime</p>
            <p className={`font-mono text-sm font-semibold ${totalOvertime > 0 ? 'text-error' : 'text-dove'}`}>
              {totalOvertime > 0 ? fmtHHMM(totalOvertime) : '—'}
            </p>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-graphite">Total this week</p>
          <p className="font-mono text-sm font-semibold text-ink">{fmtHHMM(totalHours)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Work Diary (per employee) ──────────────────────────────────────────────────

export function WorkDiary({ userId }: { userId?: string }) {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedWeekMon, setSelectedWeekMon] = useState(mondayOf(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const params: Record<string, string> = { limit: '1000' };
    if (userId) params['userId'] = userId;
    api.timeEntries
      .list(params)
      .then((res) => setEntries(((res as { data: DiaryEntry[] }).data) ?? []))
      .catch(() => setEntries([]));
  }, [userId]);

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

  function handleSelectWeek(mon: Date) {
    setSelectedWeekMon(mon);
    setCalMonth(new Date(mon.getFullYear(), mon.getMonth(), 1));
  }

  return (
    <>
      <div className="flex items-start gap-5">
        <div className="w-72 flex-shrink-0">
          <Calendar
            month={calMonth}
            onPrev={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            onNext={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            selectedWeekMon={selectedWeekMon}
            onSelectWeek={handleSelectWeek}
            dayMeta={dayMeta}
          />
        </div>
        <WeekBars weekMon={selectedWeekMon} dayMeta={dayMeta} onClickDay={(ds) => setSelectedDay(ds)} />
      </div>

      <DayDetailPanel date={selectedDay} userId={userId} onClose={() => setSelectedDay(null)} />
    </>
  );
}
