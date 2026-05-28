import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  user: CwUser;
  onLogout: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TrackerScreen({ user, onLogout }: Props) {
  const [status, setStatus] = useState<TimerStatus>({ running: false });
  const [projects, setProjects] = useState<CwProject[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState('');
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTick = useCallback((startedAt: string) => {
    if (tickRef.current) clearInterval(tickRef.current);
    const base = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    setElapsed(base);
    tickRef.current = setInterval(() => {
      setElapsed((p) => p + 1);
    }, 1000);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setElapsed(0);
  }, []);

  useEffect(() => {
    Promise.all([
      window.clockwork.timer.getStatus(),
      window.clockwork.projects.list(),
      window.clockwork.app.version(),
    ]).then(([s, p, v]) => {
      setStatus(s);
      setProjects(p);
      setVersion(v);
      if (s.running && s.startedAt) startTick(s.startedAt);
    });

    return () => stopTick();
  }, [startTick, stopTick]);

  async function handleStart() {
    setLoading(true);
    try {
      const s = await window.clockwork.timer.start(
        selectedProject || undefined,
        description || undefined,
      );
      setStatus(s);
      if (s.startedAt) startTick(s.startedAt);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    try {
      const s = await window.clockwork.timer.stop();
      setStatus(s);
      stopTick();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await window.clockwork.auth.logout().catch(() => {});
    onLogout();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>
      <div
        style={{
          height: 36,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          WebkitAppRegion: 'drag',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 12,
          paddingRight: 8,
        } as React.CSSProperties}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          CLOCKWORK
        </span>
        <button
          onClick={handleLogout}
          style={{
            WebkitAppRegion: 'no-drag',
            background: 'none',
            color: 'var(--text-muted)',
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
          } as React.CSSProperties}
        >
          Sign out
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
            {user.name}
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: 2,
              color: status.running ? 'var(--green)' : 'var(--text-primary)',
            }}
          >
            {formatElapsed(elapsed)}
          </div>

          {status.running && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              {status.description
                ? status.description
                : projects.find((p) => p.id === status.projectId)?.name ?? 'No project'}
            </p>
          )}

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              padding: '3px 10px',
              borderRadius: 20,
              background: status.running ? '#052e16' : 'var(--bg-elevated)',
              border: `1px solid ${status.running ? '#14532d' : 'var(--border)'}`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: status.running ? 'var(--green)' : 'var(--text-muted)',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: status.running ? 'var(--green)' : 'var(--text-muted)',
              }}
            >
              {status.running ? 'Tracking' : 'Stopped'}
            </span>
          </div>
        </div>

        {!status.running && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              style={{ fontSize: 12 }}
            />
          </div>
        )}

        <button
          onClick={status.running ? handleStop : handleStart}
          disabled={loading}
          style={{
            padding: '11px 0',
            background: status.running ? '#1c0a0a' : 'var(--accent)',
            color: status.running ? 'var(--red)' : '#000',
            border: status.running ? '1px solid #3f1515' : 'none',
            fontWeight: 700,
            fontSize: 13,
            borderRadius: 10,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '…' : status.running ? 'Stop tracking' : 'Start tracking'}
        </button>

        <div
          style={{
            marginTop: 'auto',
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
        >
          v{version}
        </div>
      </div>
    </div>
  );
}
