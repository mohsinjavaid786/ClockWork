'use client';

import { useEffect, useState } from 'react';
import { X, Camera, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { Screenshot } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDuration } from '@/lib/utils';

export interface TimeEntry {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  status: string;
  user: { id: string; name: string; email: string } | null;
  project: { id: string; name: string; color: string } | null;
}

interface Props {
  entry: TimeEntry | null;
  onClose: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString('en-US', opts);
}

function fmtTime(iso: string) {
  return fmt(iso, { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return fmt(iso, { weekday: 'short', month: 'short', day: 'numeric' });
}

function activityColor(pct: number): string {
  if (pct >= 70) return '#22c55e';
  if (pct >= 40) return '#eab308';
  return '#ef4444';
}

// ── Screenshot tile ───────────────────────────────────────────────────────────

function ScreenshotTile({ shot }: { shot: Screenshot }) {
  const pct = shot.activityPercent;
  const color = activityColor(pct);
  const seed = shot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  // Deterministic "random" layout tweaks so tiles look different from each other
  const barWidths = [
    [55, 80, 40, 95, 60],
    [70, 45, 85, 55, 75],
    [60, 90, 50, 70, 45],
    [80, 55, 75, 40, 90],
    [45, 70, 60, 85, 55],
  ][seed % 5]!;

  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#080810] hover:border-[#3A3A3A] transition-colors cursor-default"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Real raw screenshot when available; demo mode falls through to skeleton */}
      {shot.signedUrl ? (
        <img
          src={shot.signedUrl}
          alt={`Screen ${shot.screenNumber} captured at ${fmtTime(shot.capturedAt)}`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, #0d0d1f ${seed % 3 * 20}%, #080818 100%)` }}
          />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)',
            }}
          />
          <div className="absolute inset-0 p-[8%] flex flex-col gap-[5%] opacity-[0.18]">
            <div className="flex items-center gap-[3%]">
              <div className="h-[8%] rounded-sm bg-white" style={{ width: `${barWidths[0]}%` }} />
              <div className="h-[6%] rounded-sm bg-white/50" style={{ width: `${barWidths[1] * 0.3}%` }} />
            </div>
            <div className="h-px bg-white/20 w-full" />
            <div className="flex-1 flex gap-[4%]">
              <div className="w-[18%] flex flex-col gap-[8%]">
                {barWidths.map((w, i) => (
                  <div key={i} className="h-[10%] rounded-sm bg-white/40" style={{ width: `${w * 0.7}%` }} />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-[5%]">
                <div className="h-[12%] rounded-sm bg-white/20" style={{ width: `${barWidths[2]}%` }} />
                <div className="h-[30%] rounded-sm bg-white/10" />
                <div className="h-[8%] rounded-sm bg-white/15" style={{ width: `${barWidths[3]}%` }} />
                <div className="h-[8%] rounded-sm bg-white/10" style={{ width: `${barWidths[4]}%` }} />
              </div>
            </div>
          </div>
          {pct >= 70 && (
            <div
              className="absolute inset-0 opacity-5"
              style={{ background: `radial-gradient(ellipse at ${30 + (seed % 40)}% ${20 + (seed % 50)}%, #6366f1, transparent 60%)` }}
            />
          )}
        </>
      )}

      {/* Time badge — top left */}
      <div
        className="absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 font-mono"
        style={{ background: 'rgba(0,0,0,0.82)', fontSize: 9, color: '#888' }}
      >
        {fmtTime(shot.capturedAt)}
      </div>

      {/* Screen badge — top right (only when multi-monitor) */}
      {shot.displayCount > 1 && (
        <div
          className="absolute top-1.5 right-1.5 rounded px-1.5 py-0.5 font-mono"
          style={{ background: 'rgba(0,0,0,0.82)', fontSize: 9, color: '#A1A1A1' }}
        >
          Screen {shot.screenNumber}/{shot.displayCount}
        </div>
      )}

      {/* Activity badge — bottom left */}
      <div
        className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 font-mono font-semibold"
        style={{ background: 'rgba(0,0,0,0.82)', fontSize: 9, color }}
      >
        {pct}% active
      </div>
    </div>
  );
}

// ── Activity timeline bar ─────────────────────────────────────────────────────

function ActivityTimeline({ screenshots }: { screenshots: Screenshot[] }) {
  if (screenshots.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#444]">
        Activity timeline
      </p>
      <div className="flex items-end gap-px overflow-hidden rounded" style={{ height: 32 }}>
        {screenshots.map((s, i) => {
          const pct = s.activityPercent;
          const barH = Math.max(15, Math.round((pct / 100) * 100));
          const bg = pct >= 70 ? '#166534' : pct >= 40 ? '#713f12' : '#3f1515';
          const fg = pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';
          return (
            <div
              key={i}
              title={`${fmtTime(s.capturedAt)} — ${pct}% activity`}
              className="flex-1 rounded-sm transition-opacity hover:opacity-100 opacity-80 cursor-default"
              style={{ height: `${barH}%`, background: bg, borderTop: `1px solid ${fg}33` }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between">
        <span className="font-mono text-[10px] text-[#444]">{fmtTime(screenshots[0]!.capturedAt)}</span>
        <span className="font-mono text-[10px] text-[#444]">{fmtTime(screenshots[screenshots.length - 1]!.capturedAt)}</span>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function EntryDetailPanel({ entry, onClose }: Props) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entry) { setScreenshots([]); return; }
    setLoading(true);
    const params: Record<string, string> = {
      from: entry.started_at,
      to: entry.ended_at ?? new Date().toISOString(),
      limit: '1000',
    };
    if (entry.user?.id) params['userId'] = entry.user.id;
    api.screenshots
      .list(params)
      .then((res) => setScreenshots((res.data ?? []).filter((s) => s.timeEntryId === entry.id)))
      .catch(() => setScreenshots([]))
      .finally(() => setLoading(false));
  }, [entry?.id]);

  const avgActivity =
    screenshots.length > 0
      ? Math.round(screenshots.reduce((s, x) => s + x.activityPercent, 0) / screenshots.length)
      : null;

  const open = entry !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 200ms ease',
        }}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[620px] overflow-y-auto bg-[#0A0A0A] border-l border-[#2A2A2A] shadow-2xl"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {entry && (
          <div className="flex flex-col gap-0">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A] bg-[#0A0A0A] px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={entry.user?.name ?? '?'} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-white">{entry.user?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-[#666666]">{fmtDate(entry.started_at)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded p-1.5 text-[#666666] hover:bg-[#1A1A1A] hover:text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-6 p-6">
              {/* Project + description */}
              <div className="flex items-start gap-3">
                {entry.project && (
                  <span
                    className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ background: entry.project.color }}
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {entry.project?.name ?? 'No project'}
                  </p>
                  {entry.description && (
                    <p className="mt-0.5 text-xs text-[#666666]">{entry.description}</p>
                  )}
                </div>
                <div className="ml-auto">
                  <StatusBadge status={entry.status} />
                </div>
              </div>

              {/* Stat row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    icon: <Clock size={12} />,
                    label: 'Duration',
                    value: entry.duration_seconds ? formatDuration(entry.duration_seconds) : '—',
                  },
                  {
                    icon: null,
                    label: 'Started',
                    value: fmtTime(entry.started_at),
                  },
                  {
                    icon: null,
                    label: 'Ended',
                    value: entry.ended_at ? fmtTime(entry.ended_at) : 'Running',
                  },
                  {
                    icon: <Camera size={12} />,
                    label: 'Avg activity',
                    value: avgActivity != null ? `${avgActivity}%` : '—',
                  },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-3">
                    <div className="flex items-center gap-1 text-[#444]">
                      {icon}
                      <p className="text-[10px] uppercase tracking-wider">{label}</p>
                    </div>
                    <p
                      className="mt-1.5 font-mono text-base font-semibold text-white"
                      style={{ fontSize: value.length > 5 ? 13 : 16 }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Activity timeline */}
              {screenshots.length > 0 && <ActivityTimeline screenshots={screenshots} />}

              {/* Screenshots grid */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[#444]">
                  Screenshots {screenshots.length > 0 && `(${screenshots.length})`}
                </p>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : screenshots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] py-12">
                    <Camera size={20} className="mb-2 text-[#333]" />
                    <p className="text-xs text-[#444]">No screenshots for this entry</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {screenshots.map((shot) => (
                      <ScreenshotTile key={shot.id} shot={shot} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
