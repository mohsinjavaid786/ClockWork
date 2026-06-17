'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const DAY = 86_400_000;

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

interface Props {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
}

// A Mercury-style scrubbable timeline: months span a fixed window, and a
// draggable / resizable band selects the active date range. Resize from either
// edge, or grab the middle to slide the whole range. Commits on release.
export function DashboardTimeline({ from, to, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Fixed window: ~14 months back, 2 months ahead — today sits near the right.
  const { winStart, winEnd, months } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 13, 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 1).getTime();
    const ms: { ms: number; label: string; year: boolean }[] = [];
    const d = new Date(start);
    while (d.getTime() < end) {
      ms.push({
        ms: d.getTime(),
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getMonth() === 0,
      });
      d.setMonth(d.getMonth() + 1);
    }
    return { winStart: start, winEnd: end, months: ms };
  }, []);

  const span = winEnd - winStart;

  // Live (during-drag) band, falls back to committed props.
  const [draft, setDraft] = useState<{ from: number; to: number } | null>(null);
  const fromMs = draft ? draft.from : from.getTime();
  const toMs = draft ? draft.to : to.getTime();

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    setWidth(el.clientWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const xOf = (ms: number) => ((ms - winStart) / span) * width;
  const leftX = xOf(fromMs);
  const rightX = xOf(toMs);
  const todayX = xOf(Date.now());

  const drag = useRef<{ mode: 'move' | 'left' | 'right'; x: number; from: number; to: number } | null>(null);

  function begin(mode: 'move' | 'left' | 'right', e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, from: fromMs, to: toMs };
  }

  function move(e: React.PointerEvent) {
    if (!drag.current || !width) return;
    const dms = ((e.clientX - drag.current.x) / width) * span;
    const min = DAY;
    let nf = drag.current.from;
    let nt = drag.current.to;
    if (drag.current.mode === 'move') {
      const dur = drag.current.to - drag.current.from;
      nf = Math.min(Math.max(drag.current.from + dms, winStart), winEnd - dur);
      nt = nf + dur;
    } else if (drag.current.mode === 'left') {
      nf = Math.min(Math.max(drag.current.from + dms, winStart), drag.current.to - min);
    } else {
      nt = Math.max(Math.min(drag.current.to + dms, winEnd), drag.current.from + min);
    }
    setDraft({ from: nf, to: nt });
  }

  function end() {
    if (!drag.current || !draft) {
      drag.current = null;
      return;
    }
    drag.current = null;
    const f = startOfDay(new Date(draft.from));
    const t = startOfDay(new Date(draft.to));
    setDraft(null);
    onChange(f, t);
  }

  return (
    <div className="select-none">
      {/* Month labels */}
      <div className="relative h-4" style={{ width: '100%' }}>
        {width > 0 &&
          months.map((m) => {
            const x = xOf(m.ms);
            if (x < 0 || x > width) return null;
            return (
              <span
                key={m.ms}
                className={`absolute top-0 -translate-x-1/2 text-[10px] ${m.year ? 'font-medium text-ash' : 'text-graphite'}`}
                style={{ left: x }}
              >
                {m.year ? new Date(m.ms).getFullYear() : m.label}
              </span>
            );
          })}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative mt-1 h-9 rounded-lg bg-fog"
        onPointerMove={move}
        onPointerUp={end}
      >
        {/* month ticks */}
        {width > 0 &&
          months.map((m) => {
            const x = xOf(m.ms);
            if (x < 0 || x > width) return null;
            return <span key={m.ms} className="absolute top-0 h-full w-px bg-hair" style={{ left: x }} />;
          })}

        {/* today marker */}
        {todayX >= 0 && todayX <= width && (
          <span className="absolute top-0 h-full w-px bg-info/60" style={{ left: todayX }} />
        )}

        {/* selection band */}
        <div
          className="absolute top-0 h-full cursor-grab rounded-md border border-info bg-info/15 active:cursor-grabbing"
          style={{ left: leftX, width: Math.max(2, rightX - leftX) }}
          onPointerDown={(e) => begin('move', e)}
        >
          <span
            className="absolute -left-1 top-1/2 h-5 w-2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-info bg-card"
            onPointerDown={(e) => begin('left', e)}
          />
          <span
            className="absolute -right-1 top-1/2 h-5 w-2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-info bg-card"
            onPointerDown={(e) => begin('right', e)}
          />
        </div>
      </div>
    </div>
  );
}
