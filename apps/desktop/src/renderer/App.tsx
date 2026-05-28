import React, { useEffect, useState } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { TrackerScreen } from './screens/TrackerScreen';

type AppState = 'loading' | 'login' | 'tracker';

export function App() {
  const [state, setState] = useState<AppState>('loading');
  const [user, setUser] = useState<CwUser | null>(null);

  useEffect(() => {
    window.clockwork.auth.getUser().then((u) => {
      if (u) {
        setUser(u);
        setState('tracker');
      } else {
        setState('login');
      }
    });
  }, []);

  if (state === 'loading') {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          CLOCKWORK
        </span>
      </div>
    );
  }

  if (state === 'login') {
    return (
      <LoginScreen
        onLogin={(u) => {
          setUser(u);
          setState('tracker');
        }}
      />
    );
  }

  return (
    <TrackerScreen
      user={user!}
      onLogout={() => {
        setUser(null);
        setState('login');
      }}
    />
  );
}
