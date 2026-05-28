'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { initAuth } from '@/lib/auth';
import type { User, TimeEntry, Screenshot } from '@trackdesk/shared';

interface Props { params: Promise<{ userId: string }>; }

export default function UserDetailPage({ params }: Props) {
  const { userId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    initAuth();
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    setDateRange({ start, end });
    loadData(start, end);
  }, [userId]);

  async function loadData(start: string, end: string) {
    const [u, e, s] = await Promise.allSettled([
      apiClient.get<User>(`/users/${userId}`),
      apiClient.get<{ data: TimeEntry[] }>(`/time-entries?userId=${userId}&startDate=${start}&endDate=${end}&limit=100`),
      apiClient.get<Screenshot[]>(`/screenshots?userId=${userId}&startDate=${start}&endDate=${end}`),
    ]);
    if (u.status === 'fulfilled') setUser(u.value);
    if (e.status === 'fulfilled') setEntries(e.value.data);
    if (s.status === 'fulfilled') setScreenshots(s.value);
  }

  function formatDuration(s?: number) {
    if (!s) return '—';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }

  if (!user) return <AdminLayout><p className="text-slate-400">Loading…</p></AdminLayout>;

  return (
    <AdminLayout>
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-xl font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold">{user.name}</h2>
          <p className="text-slate-400 text-sm">{user.email}</p>
        </div>
        <Badge variant={user.isActive ? 'success' : 'error'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
        <Badge variant={user.role === 'admin' ? 'warning' : 'default'}>{user.role}</Badge>
      </div>

      {/* Date range picker */}
      <div className="flex gap-3 mb-6">
        {(['start', 'end'] as const).map((k) => (
          <input
            key={k}
            type="date"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            value={dateRange[k]}
            onChange={(e) => {
              const next = { ...dateRange, [k]: e.target.value };
              setDateRange(next);
              loadData(next.start, next.end);
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time entries timeline */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4">Time Entries</h3>
          <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {entries.map((e) => (
              <li key={e.id} className="flex justify-between items-center text-sm border-b border-slate-700 pb-2">
                <div>
                  <p className="font-medium">{e.description ?? 'No description'}</p>
                  <p className="text-slate-500 text-xs">{new Date(e.startedAt).toLocaleString()}</p>
                </div>
                <span className="text-slate-300">{formatDuration(e.durationSeconds)}</span>
              </li>
            ))}
            {entries.length === 0 && <p className="text-slate-500 text-sm">No entries in range.</p>}
          </ul>
        </div>

        {/* Screenshot gallery */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4">Screenshots</h3>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {screenshots.map((s) => (
              <button
                key={s.id}
                className="aspect-video bg-slate-700 rounded overflow-hidden hover:ring-2 ring-primary"
                onClick={() => setSelectedScreenshot(s)}
              >
                {s.signedUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.signedUrl} alt="screenshot" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
            {screenshots.length === 0 && <p className="text-slate-500 text-sm col-span-3">No screenshots.</p>}
          </div>
        </div>
      </div>

      {/* Screenshot modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="max-w-4xl w-full p-4">
            {selectedScreenshot.signedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedScreenshot.signedUrl} alt="full screenshot" className="w-full rounded-xl" />
            )}
            <p className="text-center text-slate-400 text-sm mt-2">
              {new Date(selectedScreenshot.capturedAt).toLocaleString()} · Activity: {selectedScreenshot.activityPercent}%
            </p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
