'use client';

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Keyboard, Mouse } from 'lucide-react';
import type { Screenshot } from '@/lib/types';
import { useTimezone } from '@/context/timezone-context';

interface Props {
  screenshots: Screenshot[];
  index: number;
  onClose: () => void;
  onNav: (idx: number) => void;
  sessionLabel?: string;
}

function actColor(pct: number) {
  return pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';
}

// Renders the captured screenshot (raw, no blur — Upwork-style).
// Falls back to a deterministic UI skeleton when no signedUrl is available.
function BigScreenshot({ shot }: { shot: Screenshot }) {
  const seed = shot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rows = [
    [60, 85, 45, 90, 55],
    [75, 50, 80, 60, 70],
    [50, 90, 55, 75, 40],
  ][(seed % 3)]!;

  if (shot.signedUrl) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg border border-[#2A2A2A] bg-black" style={{ aspectRatio: '16/9' }}>
        <img
          src={shot.signedUrl}
          alt={`Screen ${shot.screenNumber}`}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-[#2A2A2A]"
      style={{ aspectRatio: '16/9', background: `linear-gradient(135deg, #0d0d1f ${seed % 3 * 15}%, #080818 100%)` }}
    >
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)',
      }} />
      <div className="absolute inset-0 p-[7%] flex flex-col gap-[3%] opacity-[0.22]">
        <div className="flex items-center gap-2">
          <div className="h-[6%] rounded-sm bg-white" style={{ width: `${rows[0]}%` }} />
          <div className="h-[4%] rounded-sm bg-white/50" style={{ width: '15%' }} />
        </div>
        <div className="h-px bg-white/20 w-full" />
        <div className="flex-1 flex gap-[3%]">
          <div className="w-[16%] flex flex-col gap-[4%]">
            {rows.map((w, i) => <div key={i} className="h-[6%] rounded-sm bg-white/40" style={{ width: `${w * 0.8}%` }} />)}
          </div>
          <div className="flex-1 flex flex-col gap-[3%]">
            <div className="h-[10%] rounded-sm bg-white/25" style={{ width: `${rows[2]}%` }} />
            <div className="flex-1 rounded-sm bg-white/10" />
            <div className="h-[6%] rounded-sm bg-white/20" style={{ width: `${rows[3]}%` }} />
            <div className="h-[6%] rounded-sm bg-white/12" style={{ width: `${rows[4]}%` }} />
          </div>
        </div>
      </div>
      {shot.activityPercent >= 70 && (
        <div className="absolute inset-0 opacity-[0.06]" style={{
          background: `radial-gradient(ellipse at ${25 + seed % 50}% ${20 + seed % 40}%, #6366f1, transparent 55%)`,
        }} />
      )}
    </div>
  );
}

export function ScreenshotModal({ screenshots, index, onClose, onNav, sessionLabel }: Props) {
  const { format } = useTimezone();
  const fmtTime = (iso: string) =>
    format(iso, { hour: '2-digit', minute: '2-digit' });
  const shot = screenshots[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onNav(index - 1);
      if (e.key === 'ArrowRight' && index < screenshots.length - 1) onNav(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, screenshots.length, onClose, onNav]);

  if (!shot) return null;

  const color = actColor(shot.activityPercent);
  const activeBlocks = Math.round(shot.activityPercent / 10);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-5xl rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-sm font-medium text-white">
                {shot.user?.name ?? 'Unknown'}
              </span>
            </div>
            <span className="text-[#444]">·</span>
            <span className="text-sm text-[#666666]">
              {format(shot.capturedAt, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            {sessionLabel && (
              <>
                <span className="text-[#444]">·</span>
                <span className="text-xs text-[#666666]">{sessionLabel}</span>
              </>
            )}
            {shot.displayCount > 1 && (
              <>
                <span className="text-[#444]">·</span>
                <span className="text-xs font-medium text-[#A1A1A1]">
                  Screen {shot.screenNumber} of {shot.displayCount}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded border border-[#2A2A2A] px-2.5 py-1 font-mono text-xs text-[#666666]">
              {index + 1} of {screenshots.length}
            </span>
            <button onClick={onClose} className="rounded p-1.5 text-[#666666] hover:bg-[#1A1A1A] hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-[1fr_300px]">
          {/* Left — screenshot + active window + input totals */}
          <div className="border-r border-[#2A2A2A] p-6 flex flex-col gap-4">
            <BigScreenshot shot={shot} />
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#666666]">Active window</p>
                <p className="mt-0.5 truncate text-sm text-white">{shot.activeWindow ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-[#666666]">Captured</p>
                <p className="mt-0.5 font-mono text-sm text-white">{fmtTime(shot.capturedAt)}</p>
              </div>
            </div>

            {/* Input totals for this interval */}
            <div className="flex gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2.5">
                <Keyboard size={12} className="text-[#555]" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#444]">Keystrokes</p>
                  <p className="font-mono text-sm font-semibold text-white">{shot.keyCount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2.5">
                <Mouse size={12} className="text-[#555]" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#444]">Mouse events</p>
                  <p className="font-mono text-sm font-semibold text-white">{shot.mouseCount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — activity level + per-minute table */}
          <div className="flex flex-col gap-5 p-5">
            <div>
              <p className="mb-2 text-xs font-medium text-[#666666]">Activity Level</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="h-3 w-5 rounded-sm"
                    style={{ background: i < activeBlocks ? color : '#1A1A1A', border: '1px solid #2A2A2A' }}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs" style={{ color }}>
                {shot.activityPercent}% active
              </p>
            </div>

            {/* Per-minute breakdown */}
            <div className="flex-1">
              <p className="mb-2 text-xs font-medium text-[#666666]">Per-minute activity</p>
              {shot.minuteActivity.length === 0 ? (
                <p className="text-xs text-[#444]">No per-minute data</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[#2A2A2A]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] bg-[#111111]">
                        <th className="px-3 py-2 text-left font-medium text-[#555]">Time</th>
                        <th className="px-3 py-2 text-right font-medium text-[#555]">
                          <Keyboard size={10} className="inline mr-1" />Keys
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-[#555]">
                          <Mouse size={10} className="inline mr-1" />Mouse
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shot.minuteActivity.map((row, i) => (
                        <tr key={i} className="border-b border-[#1A1A1A] last:border-0">
                          <td className="px-3 py-1.5 font-mono text-[#666666]">{fmtTime(row.t)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-white">{row.keys}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-white">{row.mouse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between border-t border-[#2A2A2A] px-6 py-4">
          <button
            onClick={() => onNav(index - 1)}
            disabled={index === 0}
            className="flex items-center gap-2 rounded-full border border-[#2A2A2A] px-4 py-2 text-sm text-[#A1A1A1] hover:bg-[#1A1A1A] hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          {/* Filmstrip thumbnails */}
          <div className="flex items-center gap-1 overflow-hidden max-w-sm">
            {screenshots.slice(Math.max(0, index - 2), index + 4).map((s, i) => {
              const realIdx = Math.max(0, index - 2) + i;
              return (
                <button
                  key={s.id}
                  onClick={() => onNav(realIdx)}
                  className="flex-shrink-0 overflow-hidden rounded border transition-colors"
                  style={{
                    width: 48, height: 30,
                    background: '#0d0d1f',
                    borderColor: realIdx === index ? '#fff' : '#2A2A2A',
                    opacity: realIdx === index ? 1 : 0.5,
                  }}
                >
                  <div className="h-full w-full opacity-20" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 10px)',
                  }} />
                </button>
              );
            })}
          </div>
          <button
            onClick={() => onNav(index + 1)}
            disabled={index === screenshots.length - 1}
            className="flex items-center gap-2 rounded-full border border-[#2A2A2A] px-4 py-2 text-sm text-[#A1A1A1] hover:bg-[#1A1A1A] hover:text-white disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
