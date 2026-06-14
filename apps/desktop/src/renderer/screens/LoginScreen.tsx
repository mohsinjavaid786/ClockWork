import React, { useState } from 'react';
import logo from '../logo.png';

interface Props {
  onLogin: (user: CwUser) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await window.clockwork.auth.login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
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
          paddingLeft: 12,
        } as React.CSSProperties}
      >
        <img src={logo} alt="ClockWork" style={{ height: 16, width: 'auto' }} />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <img src={logo} alt="ClockWork" style={{ height: 48, width: 'auto', marginBottom: 16 }} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Use your Clockwork account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />

          {error && (
            <p
              style={{
                fontSize: 11,
                color: 'var(--red)',
                background: '#1c0a0a',
                border: '1px solid #3f1515',
                borderRadius: 6,
                padding: '6px 10px',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '9px 0',
              background: loading ? '#888' : 'var(--accent)',
              color: '#000',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
