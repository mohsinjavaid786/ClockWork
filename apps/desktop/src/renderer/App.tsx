import { useEffect, useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { TrackerPage } from './pages/TrackerPage';

interface UserInfo { id: string; email: string; name: string; role: string; }

export function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.trackdesk.auth.getUser().then((u) => {
      setUser(u as UserInfo | null);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading…</div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  return <TrackerPage user={user} onLogout={() => setUser(null)} />;
}
