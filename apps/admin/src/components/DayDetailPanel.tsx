'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MoreHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import type { Screenshot } from '@/lib/types';
import { ScreenshotModal } from '@/components/ScreenshotModal';
import { useTimezone } from '@/context/timezone-context';

const TIME_OPTS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

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
function MiniShot({ shot, onClick }: { shot: Screenshot; onClick: () => void }) {
  const { format } = useTimezone();
  const fmtTime = (iso: string) => format(iso, TIME_OPTS);
  const seed = shot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pct = shot.activityPercent;
  const color = actColor(pct);
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const src = !imgFailed ? shot.thumbnailUrl : undefined;

  return (
    <button
      onClick={onClick}
      className="group flex-shrink-0 overflow-hidden rounded border border-hair hover:border-dove transition-colors"
      style={{ width: 120, background: `linear-gradient(135deg, #eef0f3 ${seed % 3 * 15}%, #f7f7f8 100%)` }}
    >
      {/* Real thumbnail when available, otherwise a skeleton */}
      <div style={{ aspectRatio: '16/9', position: 'relative' }}>
        {src ? (
          <>
            {!imgLoaded && <div className="cw-skeleton absolute inset-0" />}
            <img
              src={src}
              alt=""
              className={`cw-img-fade absolute inset-0 h-full w-full object-cover ${imgLoaded ? 'is-loaded' : ''}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
            />
          </>
        ) : (
          <>
            <div className="absolute inset-0 opacity-[0.06]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg,#17191c 0,#17191c 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#17191c 0,#17191c 1px,transparent 1px,transparent 32px)',
            }} />
            <div className="absolute inset-[8%] flex flex-col gap-[6%] opacity-[0.25]">
              <div className="h-[10%] w-3/4 rounded-sm bg-graphite" />
              <div className="flex-1 rounded-sm bg-graphite/30" />
              <div className="h-[8%] w-1/2 rounded-sm bg-graphite/40" />
            </div>
          </>
        )}
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
      <div className="h-1.5 w-full" style={{ background: '#f7f7f8' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </button>
  );
}

interface SessionBlockProps {
  entry: DayEntry;
  shots: Screenshot[];
  onShotClick: (shots: Screenshot[], idx: number, label: string) => void;
}

function SessionBlock({ entry, shots, onShotClick }: SessionBlockProps) {
  const { format } = useTimezone();
  const fmtTime = (iso: string) => format(iso, TIME_OPTS);
  const startLabel = fmtTime(entry.started_at);
  const endLabel = entry.ended_at ? fmtTime(entry.ended_at) : 'Running';
  const durSecs = entry.duration_seconds ?? 0;
  const sessionLabel = `${startLabel} – ${endLabel} (${fmtHHMM(durSecs)})`;
  const avgPct = shots.length > 0
    ? Math.round(shots.reduce((s, x) => s + x.activityPercent, 0) / shots.length)
    : 0;

  return (
    <div className="rounded-card bg-card shadow-card overflow-hidden">
      {/* Session header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hair">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{
            background: entry.project?.color ?? '#22c55e',
          }} />
          <span className="text-sm font-medium text-ink">{sessionLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {shots.length > 0 && (
            <span className="text-xs text-graphite" style={{ color: actColor(avgPct) }}>
              {avgPct}% avg activity
            </span>
          )}
          <button className="rounded p-1 text-dove hover:text-graphite transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Project + description */}
      {(entry.project || entry.description) && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-hair">
          {entry.project && <span className="text-xs text-graphite">{entry.project.name}</span>}
          {entry.description && <span className="text-xs text-dove">· {entry.description}</span>}
        </div>
      )}

      {/* Screenshot strip */}
      <div className="px-4 py-3">
        {shots.length === 0 ? (
          <p className="py-2 text-xs text-dove">No screenshots for this session</p>
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
  const [shots, setShots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    shots: Screenshot[];
    idx: number;
    label: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock background scroll while the drawer is open so scrolling stays inside it.
  useEffect(() => {
    if (!date) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [date]);

  useEffect(() => {
    if (!date) { setEntries([]); setShots([]); return; }
    setLoading(true);
    const range = { from: `${date}T00:00:00.000Z`, to: `${date}T23:59:59.999Z` };
    const entryParams: Record<string, string> = { ...range, limit: '100' };
    const shotParams: Record<string, string> = { ...range, limit: '1000' };
    if (userId) { entryParams['userId'] = userId; shotParams['userId'] = userId; }
    Promise.all([
      api.timeEntries.list(entryParams).then(res => ((res as { data: DayEntry[] }).data) ?? []).catch(() => []),
      api.screenshots.list(shotParams).then(res => res.data ?? []).catch(() => []),
    ])
      .then(([e, s]) => { setEntries(e); setShots(s); })
      .finally(() => setLoading(false));
  }, [date, userId]);

  // Screenshots not tied to any of the day's sessions (e.g. captured outside a timer)
  const entryIds = new Set(entries.map(e => e.id));
  const orphanShots = shots.filter(s => !s.timeEntryId || !entryIds.has(s.timeEntryId));

  const totalSecs = entries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
  const open = date !== null;

  const overlay = (
    <>
      {/* Backdrop — blurs everything behind so the drawer is in prime focus */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 200ms ease' }}
      />

      {/* Floating panel — detached from the edges, rounded, elevated */}
      <div
        className="fixed bottom-4 right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-[680px] overflow-y-auto rounded-card bg-card shadow-modal"
        style={{ transform: open ? 'translateX(0)' : 'translateX(calc(100% + 1.5rem))', transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)' }}
      >
        {date && (
          <div className="flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-hair bg-card px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-ink">{fmtDayLabel(date)}</h2>
                <button onClick={onClose} className="rounded p-1.5 text-graphite hover:bg-fog hover:text-ink transition-colors">
                  <X size={15} />
                </button>
              </div>
              {totalSecs > 0 && (
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                    <span className="text-xs text-ash">
                      Total: <span className="font-mono font-semibold text-ink">{fmtHHMM(totalSecs)}</span>
                    </span>
                  </div>
                  <span className="text-xs text-dove">{entries.length} session{entries.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Sessions */}
            <div className="flex flex-col gap-4 p-5">
              {loading ? (
                <div className="flex flex-col gap-4">
                  {Array.from({ length: 2 }).map((_, s) => (
                    <div key={s} className="flex flex-col gap-3">
                      <div className="cw-skeleton h-5 w-40 rounded" />
                      <div className="flex gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="cw-skeleton rounded border border-hair" style={{ width: 120, aspectRatio: '16/9' }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : entries.length === 0 && orphanShots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-graphite">No sessions recorded for this day</p>
                </div>
              ) : (
                <>
                  {entries.map(entry => (
                    <SessionBlock
                      key={entry.id}
                      entry={entry}
                      shots={shots.filter(s => s.timeEntryId === entry.id)}
                      onShotClick={(s, idx, label) => setModalState({ shots: s, idx, label })}
                    />
                  ))}
                  {orphanShots.length > 0 && (
                    <div className="rounded-card bg-card shadow-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-hair">
                        <span className="text-sm font-medium text-ink">Other screenshots</span>
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                          {orphanShots.map((shot, idx) => (
                            <MiniShot
                              key={shot.id}
                              shot={shot}
                              onClick={() => setModalState({ shots: orphanShots, idx, label: 'Screenshots' })}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
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

  return mounted ? createPortal(overlay, document.body) : null;
}
