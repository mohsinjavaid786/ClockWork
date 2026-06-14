'use client';

import { useEffect, useState } from 'react';
import { X, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { getMockScreenshotsForEntry, type MockScreenshot } from '@/lib/mock-data';
import { ScreenshotModal } from '@/components/ScreenshotModal';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export interface DayEntry {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  status: string;
  user: { id: string; name: string; email: string } | null;
  project: { id: string; name: string; color: string } | null;
}

interface Props {
  date: string | null; // 'YYYY-MM-DD'
  userId?: string;
  onClose: () => void;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtHHMM(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')} hrs`;
}

function fmtDayLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function actColor(pct: number) {
  return pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';
}

// Mini thumbnail used in the horizontal filmstrip per session
function MiniShot({ shot, onClick }: { shot: MockScreenshot; onClick: () => void }) {
  const seed = shot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pct = shot.activityPercent;
  const color = actColor(pct);

  return (
    <button
      onClick={onClick}
      className="group flex-shrink-0 overflow-hidden rounded border border-[#2A2A2A] hover:border-[#444] transition-colors"
      style={{ width: 120, background: `linear-gradient(135deg, #0d0d1f ${seed % 3 * 15}%, #08081a 100%)` }}
    >
      {/* Simulated UI content */}
      <div style={{ aspectRatio: '16/9', position: 'relative' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 32px)',
        }} />
        <div className="absolute inset-[8%] flex flex-col gap-[6%] opacity-[0.2]">
          <div className="h-[10%] w-3/4 rounded-sm bg-white" />
          <div className="flex-1 rounded-sm bg-white/15" />
          <div className="h-[8%] w-1/2 rounded-sm bg-white/25" />
        </div>
        {/* Time */}
        <div className="absolute top-1 left-1 rounded px-1 py-0.5 font-mono" style={{ background: 'rgba(0,0,0,0.8)', fontSize: 8, color: '#777' }}>
          {fmtTime(shot.capturedAt)}
        </div>
        {/* Screen badge — only when multi-monitor */}
        {shot.displayCount > 1 && (
          <div className="absolute top-1 right-1 rounded px-1 py-0.5 font-mono" style={{ background: 'rgba(0,0,0,0.8)', fontSize: 8, color: '#A1A1A1' }}>
            S{shot.screenNumber}/{shot.displayCount}
          </div>
        )}
      </div>
      {/* Activity bar at bottom (Upwork-style) */}
      <div className="h-1.5 w-full" style={{ background: '#1A1A1A' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </button>
  );
}

interface SessionBlockProps {
  entry: DayEntry;
  onShotClick: (shots: MockScreenshot[], idx: number, label: string) => void;
}

function SessionBlock({ entry, onShotClick }: SessionBlockProps) {
  const [shots, setShots] = useState<MockScreenshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.screenshots
      .list({ timeEntryId: entry.id, limit: '50' })
      .then(res => setShots((res.data as MockScreenshot[]) ?? []))
      .catch(() => setShots([]))
      .finally(() => setLoading(false));
  }, [entry.id]);

  const startLabel = fmtTime(entry.started_at);
  const endLabel = entry.ended_at ? fmtTime(entry.ended_at) : 'Running';
  const durSecs = entry.duration_seconds ?? 0;
  const sessionLabel = `${startLabel} – ${endLabel} (${fmtHHMM(durSecs)})`;
  const avgPct = shots.length > 0
    ? Math.round(shots.reduce((s, x) => s + x.activityPercent, 0) / shots.length)
    : 0;

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#111111] overflow-hidden">
      {/* Session header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{
            background: entry.project?.color ?? '#22c55e',
          }} />
          <span className="text-sm font-medium text-white">{sessionLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {shots.length > 0 && (
            <span className="text-xs text-[#666666]" style={{ color: actColor(avgPct) }}>
              {avgPct}% avg activity
            </span>
          )}
          <button className="rounded p-1 text-[#444] hover:text-[#666666] transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Project + description */}
      {(entry.project || entry.description) && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1F1F1F]">
          {entry.project && <span className="text-xs text-[#666666]">{entry.project.name}</span>}
          {entry.description && <span className="text-xs text-[#444]">· {entry.description}</span>}
        </div>
      )}

      {/* Screenshot strip */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : shots.length === 0 ? (
          <p className="py-2 text-xs text-[#333]">No screenshots for this session</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {shots.map((shot, idx) => (
              <MiniShot
                key={shot.id}
                shot={shot}
                onClick={() => onShotClick(shots, idx, sessionLabel)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DayDetailPanel({ date, userId, onClose }: Props) {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    shots: MockScreenshot[];
    idx: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (!date) { setEntries([]); return; }
    setLoading(true);
    const params: Record<string, string> = { from: `${date}T00:00:00.000Z`, to: `${date}T23:59:59.999Z`, limit: '50' };
    if (userId) params['userId'] = userId;
    api.timeEntries
      .list(params)
      .then(res => setEntries(((res as { data: DayEntry[] }).data) ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [date, userId]);

  const totalSecs = entries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
  const open = date !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 200ms ease' }}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[680px] bg-[#0A0A0A] border-l border-[#2A2A2A] shadow-2xl overflow-y-auto"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)' }}
      >
        {date && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-[#2A2A2A] bg-[#0A0A0A] px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-base font-semibold text-white">{fmtDayLabel(date)}</h2>
                <button onClick={onClose} className="rounded p-1.5 text-[#666666] hover:bg-[#1A1A1A] hover:text-white transition-colors">
                  <X size={15} />
                </button>
              </div>
              {totalSecs > 0 && (
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                    <span className="text-xs text-[#A1A1A1]">
                      Total: <span className="font-mono font-semibold text-white">{fmtHHMM(totalSecs)}</span>
                    </span>
                  </div>
                  <span className="text-xs text-[#444]">{entries.length} session{entries.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Sessions */}
            <div className="flex flex-col gap-4 p-5">
              {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-[#444]">No sessions recorded for this day</p>
                </div>
              ) : (
                entries.map(entry => (
                  <SessionBlock
                    key={entry.id}
                    entry={entry}
                    onShotClick={(shots, idx, label) => setModalState({ shots, idx, label })}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Screenshot modal (z-60, above the panel) */}
      {modalState && (
        <ScreenshotModal
          screenshots={modalState.shots}
          index={modalState.idx}
          sessionLabel={modalState.label}
          onClose={() => setModalState(null)}
          onNav={idx => setModalState(prev => prev ? { ...prev, idx } : null)}
        />
      )}
    </>
  );
}
