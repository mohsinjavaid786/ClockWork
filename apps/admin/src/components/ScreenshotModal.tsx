'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Keyboard, Mouse, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
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

  // Show the full image; while it loads, the thumbnail (if any) stands in behind a
  // shimmer, and on error we drop to the skeleton rather than a broken-image icon.
  // Reset per shot.
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Zoom + pan for inspecting detail. Scale 1–4; drag to pan when zoomed in.
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [shot.id]);

  function zoomTo(next: number) {
    const s = Math.min(4, Math.max(1, Math.round(next * 10) / 10));
    setScale(s);
    if (s <= 1) setOffset({ x: 0, y: 0 });
  }

  // Wheel-to-zoom needs a non-passive listener so preventDefault actually stops
  // the page from scrolling; React's onWheel is passive and can't.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((prev) => {
        const next = Math.min(4, Math.max(1, Math.round((prev + (e.deltaY < 0 ? 0.3 : -0.3)) * 10) / 10));
        if (next <= 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [shot.id]);

  if (shot.signedUrl && !failed) {
    const zoomed = scale > 1;
    return (
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-field border border-hair bg-black"
        style={{ aspectRatio: '16/9' }}
        onDoubleClick={() => zoomTo(zoomed ? 1 : 2)}
        onPointerDown={(e) => {
          if (!zoomed) return;
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
        }}
        onPointerUp={(e) => {
          drag.current = null;
          (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        }}
      >
        {shot.thumbnailUrl && (
          <img
            src={shot.thumbnailUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain blur-sm scale-105"
          />
        )}
        {!loaded && <div className="cw-skeleton absolute inset-0" style={{ opacity: shot.thumbnailUrl ? 0.5 : 1 }} />}
        <img
          src={shot.signedUrl}
          alt={`Screen ${shot.screenNumber}`}
          draggable={false}
          className={`cw-img-fade absolute inset-0 h-full w-full select-none object-contain ${loaded ? 'is-loaded' : ''}`}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: drag.current ? 'none' : 'transform 120ms ease-out',
            cursor: zoomed ? (drag.current ? 'grabbing' : 'grab') : 'default',
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />

        {/* Zoom controls — always visible */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/60 p-1 backdrop-blur-sm">
          <button
            onClick={() => zoomTo(scale - 0.5)}
            disabled={scale <= 1}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-white/15 disabled:opacity-30"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="min-w-[34px] text-center font-mono text-[11px] text-white/90">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => zoomTo(scale + 0.5)}
            disabled={scale >= 4}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-white/15 disabled:opacity-30"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          {zoomed && (
            <button
              onClick={() => zoomTo(1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-white/15"
              title="Reset zoom"
            >
              <Maximize2 size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-field border border-hair"
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

// One thumbnail in the modal's bottom filmstrip. Real thumbnail with a shimmer
// skeleton behind it while it loads (or a static skeleton if none exists).
function FilmstripThumb({ shot, active, onClick }: { shot: Screenshot; active: boolean; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = !failed ? shot.thumbnailUrl : undefined;

  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 overflow-hidden rounded border transition-colors"
      style={{
        width: 48,
        height: 30,
        background: '#0d0d1f',
        borderColor: active ? '#17191c' : '#ececee',
        opacity: active ? 1 : 0.55,
      }}
    >
      {src ? (
        <>
          {!loaded && <div className="cw-skeleton absolute inset-0" />}
          <img
            src={src}
            alt=""
            loading="lazy"
            className={`cw-img-fade absolute inset-0 h-full w-full object-cover ${loaded ? 'is-loaded' : ''}`}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <div
          className="h-full w-full opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 10px)',
          }}
        />
      )}
    </button>
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
      <div className="absolute inset-0 bg-black/[0.32] backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-5xl rounded-card bg-card shadow-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hair px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-sm font-medium text-ink">
                {shot.user?.name ?? 'Unknown'}
              </span>
            </div>
            <span className="text-dove">·</span>
            <span className="text-sm text-graphite">
              {format(shot.capturedAt, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            {sessionLabel && (
              <>
                <span className="text-dove">·</span>
                <span className="text-xs text-graphite">{sessionLabel}</span>
              </>
            )}
            {shot.displayCount > 1 && (
              <>
                <span className="text-dove">·</span>
                <span className="text-xs font-medium text-ash">
                  Screen {shot.screenNumber} of {shot.displayCount}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-dove px-2.5 py-1 font-mono text-xs text-graphite">
              {index + 1} of {screenshots.length}
            </span>
            <button onClick={onClose} className="rounded-full p-1.5 text-graphite hover:bg-fog hover:text-ink transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-[1fr_300px]">
          {/* Left — screenshot + active window + input totals */}
          <div className="border-r border-hair p-6 flex flex-col gap-4">
            <BigScreenshot shot={shot} />
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-graphite">Active window</p>
                <p className="mt-0.5 truncate text-sm text-ink">{shot.activeWindow ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-graphite">Captured</p>
                <p className="mt-0.5 font-mono text-sm text-ink">{fmtTime(shot.capturedAt)}</p>
              </div>
            </div>

            {/* Input totals for this interval */}
            <div className="flex gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-field bg-fog px-3 py-2.5">
                <Keyboard size={12} className="text-graphite" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-graphite">Keystrokes</p>
                  <p className="font-mono text-sm font-semibold text-ink">{shot.keyCount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-field bg-fog px-3 py-2.5">
                <Mouse size={12} className="text-graphite" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-graphite">Mouse events</p>
                  <p className="font-mono text-sm font-semibold text-ink">{shot.mouseCount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — activity level + per-minute table.
              `relative` + absolutely-positioned content means this column does
              not drive the grid's height — it matches the left column (screenshot
              + totals) and the per-minute table scrolls inside it. */}
          <div className="relative">
            <div className="absolute inset-0 flex flex-col gap-5 p-5">
              <div className="flex-shrink-0">
                <p className="mb-2 text-xs font-medium text-graphite">Activity Level</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className="h-3 w-5 rounded-sm"
                      style={{ background: i < activeBlocks ? color : '#f7f7f8', border: '1px solid #ececee' }}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs" style={{ color }}>
                  {shot.activityPercent}% active
                </p>
              </div>

              {/* Per-minute breakdown */}
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="mb-2 flex-shrink-0 text-xs font-medium text-graphite">Per-minute activity</p>
                {shot.minuteActivity.length === 0 ? (
                  <p className="text-xs text-graphite">No per-minute data</p>
                ) : (
                  <div className="min-h-0 flex-1 overflow-y-auto rounded-field border border-hair">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-hair bg-fog">
                          <th className="bg-fog px-3 py-2 text-left font-medium text-graphite">Time</th>
                          <th className="bg-fog px-3 py-2 text-right font-medium text-graphite">
                            <Keyboard size={10} className="inline mr-1" />Keys
                          </th>
                          <th className="bg-fog px-3 py-2 text-right font-medium text-graphite">
                            <Mouse size={10} className="inline mr-1" />Mouse
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {shot.minuteActivity.map((row, i) => (
                          <tr key={i} className="border-b border-hair last:border-0">
                            <td className="px-3 py-1.5 font-mono text-graphite">{fmtTime(row.t)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-ink">{row.keys}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-ink">{row.mouse}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between border-t border-hair px-6 py-4">
          <button
            onClick={() => onNav(index - 1)}
            disabled={index === 0}
            className="flex items-center gap-2 rounded-full border border-dove px-4 py-2 text-sm text-ink hover:bg-black/[0.03] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          {/* Filmstrip thumbnails */}
          <div className="flex items-center gap-1 overflow-hidden max-w-sm">
            {screenshots.slice(Math.max(0, index - 2), index + 4).map((s, i) => {
              const realIdx = Math.max(0, index - 2) + i;
              return (
                <FilmstripThumb
                  key={s.id}
                  shot={s}
                  active={realIdx === index}
                  onClick={() => onNav(realIdx)}
                />
              );
            })}
          </div>
          <button
            onClick={() => onNav(index + 1)}
            disabled={index === screenshots.length - 1}
            className="flex items-center gap-2 rounded-full border border-dove px-4 py-2 text-sm text-ink hover:bg-black/[0.03] disabled:opacity-30 transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
