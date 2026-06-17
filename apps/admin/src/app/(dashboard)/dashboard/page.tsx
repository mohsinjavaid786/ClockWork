'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-reg-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-reg-mono' });

interface Stats {
  todayHours: number;
  activeNow: number;
  screenshotsToday: number;
  weeklyHours: number;
  weeklyChange: number;
}

interface ChartPoint {
  day: string;
  date: string;
  hours: number;
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

const RAIL_HOURS = 12;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// Clock-style live elapsed (HH:MM:SS) — reads like a chronometer.
function clockElapsed(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Engraved dial rim (two rings + 60 ticks) behind the hero numeral.
function DialRim() {
  const cx = 215;
  const cy = 215;
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const major = i % 5 === 0;
    const r1 = major ? 182 : 189;
    const r2 = 196;
    return {
      x1: cx + Math.cos(a) * r1,
      y1: cy + Math.sin(a) * r1,
      x2: cx + Math.cos(a) * r2,
      y2: cy + Math.sin(a) * r2,
      major,
    };
  });
  return (
    <svg className="reg-dialrim" viewBox="0 0 430 430" aria-hidden="true">
      <circle cx={cx} cy={cy} r={208} fill="none" stroke="#C2A35A" strokeOpacity={0.22} strokeWidth={1.4} />
      <circle cx={cx} cy={cy} r={196} fill="none" stroke="#C2A35A" strokeOpacity={0.12} strokeWidth={1} />
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke="#C2A35A"
          strokeOpacity={t.major ? 0.5 : 0.22}
          strokeWidth={t.major ? 1.6 : 1}
        />
      ))}
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [active, setActive] = useState<ActiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    Promise.all([api.reports.stats(), api.reports.weeklyChart(), api.timeEntries.getActive()])
      .then(([s, c, a]) => {
        setStats(s);
        setChart(c);
        setActive(a as ActiveMember[]);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => {
    load();
    // Re-pull logged hours + active members so the panel stays current.
    const data = setInterval(() => load(), 60_000);
    // Tick the clock + live elapsed readouts every second.
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(data);
      clearInterval(clock);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const todayHours = stats?.todayHours ?? 0;
  const needleLeft = (Math.min(todayHours, RAIL_HOURS) / RAIL_HOURS) * 100;
  const weeklyChange = stats?.weeklyChange ?? 0;
  const chartMax = Math.max(1, ...chart.map((c) => c.hours)) * 1.15;
  const todayStr = (now ?? new Date()).toDateString();
  const nowDate = now ?? new Date();

  return (
    <div className={`cw-reg ${display.variable} ${mono.variable} space-y-5`}>
      {/* top bar */}
      <div className="reg-top">
        <div>
          <div className="reg-eyebrow">Team Register · Live</div>
          <h1 className="reg-title">Today on the floor</h1>
          <p className="reg-subtitle">Every running tracker, logged hour, and capture — kept in sync.</p>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="reg-clock">
            <div className="t">
              {nowDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="d">
              {nowDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button className="reg-refresh" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* hero movement */}
      <div className="reg-panel reg-hero">
        <span className="reg-corner tl" />
        <span className="reg-corner tr" />
        <div className="reg-main">
          <DialRim />
          <div className="reg-label">
            <span className="reg-eyebrow">Logged today</span>
            <span className="ln" />
          </div>
          <div className="reg-bignum">
            <span className="v">{todayHours.toFixed(1)}</span>
            <span className="u">hrs</span>
          </div>
          <p className="reg-caption">
            {active.length > 0 ? (
              <>
                <b>{active.length}</b> {active.length === 1 ? 'member' : 'members'} on the clock right now
              </>
            ) : (
              'No active trackers right now'
            )}
          </p>

          <div className="reg-rail">
            <div className="reg-scale">
              {Array.from({ length: RAIL_HOURS + 1 }, (_, i) => {
                const left = `${(i / RAIL_HOURS) * 100}%`;
                const major = i % 3 === 0;
                return (
                  <span key={i}>
                    <span className={`reg-tick ${major ? 'h' : 'm'}`} style={{ left }} />
                    {major && <span className="reg-tlab" style={{ left }}>{i}</span>}
                  </span>
                );
              })}
              <span className="reg-needle" style={{ left: `${needleLeft}%` }} />
            </div>
            <div className="reg-railcap">
              <span>Start of day</span>
              <span>{RAIL_HOURS}h</span>
            </div>
          </div>
        </div>

        <div className="reg-subs">
          <div className="reg-sub">
            <div className="k">
              {active.length > 0 && <span className="reg-pip" />}
              Active now
            </div>
            <div className="val">
              {stats?.activeNow ?? 0}
              <small>tracking</small>
            </div>
          </div>
          <div className="reg-sub">
            <div className="k">This week</div>
            <div className="val">
              {(stats?.weeklyHours ?? 0).toFixed(1)}
              <small>h</small>
              {weeklyChange !== 0 && (
                <span className={`reg-trend ${weeklyChange < 0 ? 'dn' : ''}`}>
                  {weeklyChange < 0 ? '▼' : '▲'} {Math.abs(weeklyChange)}%
                </span>
              )}
            </div>
          </div>
          <div className="reg-sub">
            <div className="k">Screenshots</div>
            <div className="val">
              {stats?.screenshotsToday ?? 0}
              <small>today</small>
            </div>
          </div>
        </div>
      </div>

      {/* lower grid */}
      <div className="reg-lower">
        {/* barograph */}
        <div className="reg-panel">
          <div className="reg-cardh">
            <span className="ttl">Hours this week</span>
            <span className="meta">{chart[0]?.day?.toUpperCase()}–{chart[chart.length - 1]?.day?.toUpperCase()}</span>
          </div>
          <div className="reg-graph">
            <div className="reg-bars">
              {[25, 50, 75].map((p) => (
                <span key={p} className="reg-gridln" style={{ bottom: `${p}%` }} />
              ))}
              {chart.map((c, i) => {
                const isToday = new Date(c.date).toDateString() === todayStr;
                return (
                  <div className="reg-gcol" key={i}>
                    <div
                      className={`reg-bar ${isToday ? 'today' : ''}`}
                      style={{ height: `${Math.max(2, (c.hours / chartMax) * 100)}%` }}
                    >
                      {c.hours > 0 && <span className="cap">{c.hours.toFixed(1)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="reg-glabels">
              {chart.map((c, i) => (
                <span key={i} className={new Date(c.date).toDateString() === todayStr ? 'now' : ''}>
                  {c.day}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* tracking now roster */}
        <div className="reg-panel">
          <div className="reg-cardh">
            <span className="ttl">Tracking now</span>
            <span className="meta">{String(active.length).padStart(2, '0')} LIVE</span>
          </div>
          {active.length === 0 ? (
            <div className="reg-empty">
              <div className="big">The floor is quiet</div>
              No active sessions right now.
            </div>
          ) : (
            <div className="reg-roster">
              {active.map((m) => {
                const elapsed = now
                  ? Math.floor((now.getTime() - new Date(m.startedAt).getTime()) / 1000)
                  : m.elapsedSeconds;
                return (
                  <button
                    key={m.userId}
                    className="reg-rrow"
                    onClick={() => router.push(`/team/${m.userId}`)}
                    title={`View ${m.name}'s details`}
                  >
                    <span className="reg-av">
                      {initials(m.name)}
                      <span className="live" />
                    </span>
                    <span className="reg-rinfo">
                      <span className="nm" style={{ display: 'block' }}>{m.name}</span>
                      <span className="pj" style={{ display: 'block' }}>
                        {m.projectName ?? 'No project'}
                        {m.description ? ` · ${m.description}` : ''}
                      </span>
                    </span>
                    <span className="reg-elapsed">
                      {clockElapsed(elapsed)}
                      <span className="lab">elapsed</span>
                    </span>
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
