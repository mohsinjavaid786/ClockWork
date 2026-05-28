'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api';
import { initAuth } from '@/lib/auth';
import type { User } from '@trackdesk/shared';

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'member' as 'admin' | 'member' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initAuth();
    loadUsers();
  }, []);

  async function loadUsers() {
    const data = await apiClient.get<User[]>('/users');
    setUsers(data);
  }

  async function invite() {
    setLoading(true);
    try {
      await apiClient.post('/users/invite', form);
      setShowModal(false);
      setForm({ name: '', email: '', role: 'member' });
      await loadUsers();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user: User) {
    await apiClient.patch(`/users/${user.id}`, { isActive: !user.isActive });
    await loadUsers();
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold">Team</h2>
        <button
          className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-dark"
          onClick={() => setShowModal(true)}
        >
          + Add Member
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/team/${u.id}`} className="font-medium hover:text-primary">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === 'admin' ? 'warning' : 'default'}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.isActive ? 'success' : 'error'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <button
                    className="text-xs text-slate-400 hover:text-white border border-slate-600 rounded px-2 py-1"
                    onClick={() => toggleActive(u)}
                  >
                    {u.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96 border border-slate-700">
            <h3 className="font-bold mb-4">Invite Member</h3>
            <div className="flex flex-col gap-3">
              {(['name', 'email'] as const).map((f) => (
                <input
                  key={f}
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                  placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                  value={form[f]}
                  onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                />
              ))}
              <select
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                value={form.role}
                onChange={(e) =>
                  setForm((p) => ({ ...p, role: e.target.value as 'admin' | 'member' }))
                }
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                onClick={invite}
                disabled={loading}
              >
                {loading ? 'Inviting…' : 'Send Invite'}
              </button>
              <button
                className="flex-1 border border-slate-600 text-slate-300 rounded-lg py-2 text-sm"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
