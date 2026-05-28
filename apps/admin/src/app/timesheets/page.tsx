'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiClient } from '@/lib/api';
import { initAuth } from '@/lib/auth';
import type { TimeEntry, User, Project } from '@trackdesk/shared';

const PAGE_SIZE = 20;

export default function TimesheetsPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ userId: '', projectId: '', startDate: '', endDate: '' });

  useEffect(() => {
    initAuth();
    Promise.all([apiClient.get<User[]>('/users'), apiClient.get<Project[]>('/projects')]).then(
      ([u, p]) => {
        setUsers(u);
        setProjects(p);
      },
    );
    load(1);
  }, []);

  async function load(p: number) {
    const q = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (filters.userId) q.set('userId', filters.userId);
    if (filters.projectId) q.set('projectId', filters.projectId);
    if (filters.startDate) q.set('startDate', filters.startDate);
    if (filters.endDate) q.set('endDate', filters.endDate);

    const res = await apiClient.get<{ data: TimeEntry[]; total: number }>(`/time-entries?${q}`);
    setEntries(res.data);
    setTotal(res.total);
    setPage(p);
  }

  function formatDuration(s?: number) {
    if (!s) return '—';
    return `${(s / 3600).toFixed(2)}h`;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout>
      <h2 className="text-xl font-bold mb-5">Timesheets</h2>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-5">
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          value={filters.userId}
          onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
        >
          <option value="">All Employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          value={filters.projectId}
          onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
        />
        <input
          type="date"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
        />
        <button
          className="bg-primary text-white text-sm px-4 py-2 rounded-lg"
          onClick={() => load(1)}
        >
          Apply
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              {['Employee', 'Project', 'Description', 'Start', 'End', 'Duration'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {entries.map((e) => {
              const user = users.find((u) => u.id === e.userId);
              const project = projects.find((p) => p.id === e.projectId);
              return (
                <tr key={e.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium">{user?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{project?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                    {e.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {new Date(e.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {e.endedAt ? new Date(e.endedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono">{formatDuration(e.durationSeconds)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 text-sm text-slate-400">
        <span>{total} total entries</span>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded border border-slate-700 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
          >
            Prev
          </button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded border border-slate-700 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
