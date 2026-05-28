import { useEffect, useState, useCallback } from 'react';

interface UserInfo { id: string; email: string; name: string; role: string; }
interface TimerState { entryId: string; startedAt: number; projectId?: string; elapsed: number; }
interface Props { user: UserInfo; onLogout: () => void; }

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export function TrackerPage({ user, onLogout }: Props) {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);

  useEffect(() => {
    window.trackdesk.timer.getState().then((s) => {
      if (s) { setTimerState(s as TimerState); setElapsed((s as TimerState).elapsed); }
    });

    window.trackdesk.timer.onTick((e) => setElapsed(e));
    window.trackdesk.screenshot.onCaptured(() => setLastScreenshot(new Date().toLocaleTimeString()));
    window.trackdesk.tray.onAction((p) => { if (p.action === 'toggle') handleToggle(); });

    return () => {
      window.trackdesk.timer.offTick();
      window.trackdesk.screenshot.offCaptured();
      window.trackdesk.tray.offAction();
    };
  }, []);

  const handleToggle = useCallback(async () => {
    setLoading(true);
    try {
      if (timerState) {
        await window.trackdesk.timer.stop();
        setTimerState(null);
        setElapsed(0);
      } else {
        const s = await window.trackdesk.timer.start(projectId || undefined, description || undefined);
        setTimerState(s as TimerState);
      }
    } finally {
      setLoading(false);
    }
  }, [timerState, projectId, description]);

  async function handleLogout() {
    await window.trackdesk.auth.logout();
    onLogout();
  }

  const isRunning = Boolean(timerState);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={styles.userName}>{user.name}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </header>

      <main style={styles.main}>
        <div style={styles.clockDisplay}>{formatElapsed(elapsed)}</div>
        <div style={{ ...styles.statusDot, background: isRunning ? '#22c55e' : '#64748b' }} />
        <p style={styles.statusText}>{isRunning ? 'Tracking…' : 'Not tracking'}</p>

        {!isRunning && (
          <div style={styles.inputs}>
            <input
              style={styles.input}
              placeholder="Project ID (optional)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}

        <button
          style={{ ...styles.toggleBtn, background: isRunning ? '#ef4444' : '#22c55e' }}
          onClick={handleToggle}
          disabled={loading}
        >
          {loading ? '…' : isRunning ? 'Stop' : 'Start'}
        </button>

        {lastScreenshot && (
          <p style={styles.screenshotNote}>Last screenshot: {lastScreenshot}</p>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#1e293b', borderBottom: '1px solid #334155' },
  userName: { fontWeight: 600, fontSize: 14 },
  logoutBtn: { background: 'none', border: '1px solid #475569', color: '#94a3b8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  clockDisplay: { fontSize: 52, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: 2 },
  statusDot: { width: 10, height: 10, borderRadius: '50%' },
  statusText: { color: '#94a3b8', fontSize: 14 },
  inputs: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 },
  input: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13 },
  toggleBtn: { width: 80, height: 80, borderRadius: '50%', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  screenshotNote: { color: '#64748b', fontSize: 12 },
};
