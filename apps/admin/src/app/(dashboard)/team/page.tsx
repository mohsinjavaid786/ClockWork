'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  timezone: string;
  weeklyHours: number;
  createdAt: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'employees' | 'admins'>('employees');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'member' as 'admin' | 'member',
  });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  function load() {
    api.users
      .list()
      .then((d) => setMembers(d as Member[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    setInviting(true);
    try {
      await api.users.invite(inviteForm);
      setInviteOpen(false);
      setInviteForm({ name: '', email: '', role: 'member' });
      load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Member',
      cell: (row: Member) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <div>
            <Link
              href={`/team/${row.id}`}
              className="text-sm font-medium text-white hover:underline"
            >
              {row.name}
            </Link>
            <p className="text-xs text-[#666666]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (row: Member) => <StatusBadge status={row.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: Member) => (
        <StatusBadge status={row.isActive ? 'active' : 'inactive'} label={row.isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'weeklyHours',
      header: 'This week',
      cell: (row: Member) => (
        <span className="font-mono text-sm text-white">{row.weeklyHours.toFixed(1)}h</span>
      ),
    },
    {
      key: 'timezone',
      header: 'Timezone',
      cell: (row: Member) => <span className="text-xs text-[#666666]">{row.timezone}</span>,
    },
  ];

  const employees = members.filter((m) => m.role !== 'admin');
  const admins = members.filter((m) => m.role === 'admin');
  const shown = tab === 'admins' ? admins : employees;

  const tabs: { key: 'employees' | 'admins'; label: string; count: number }[] = [
    { key: 'employees', label: 'Employees', count: employees.length },
    { key: 'admins', label: 'Admins', count: admins.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`${members.length} member${members.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-medium text-black hover:bg-[#e5e5e5] transition-colors"
          >
            <UserPlus size={13} />
            Invite member
          </button>
        }
      />

      <div className="flex items-center gap-1 border-b border-[#2A2A2A]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-white text-white'
                : 'border-transparent text-[#666666] hover:text-[#A1A1A1]'
            }`}
          >
            {t.label}
            <span className="ml-2 rounded-full bg-[#1A1A1A] px-2 py-0.5 font-mono text-xs text-[#A1A1A1]">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          title={tab === 'admins' ? 'No admins yet' : 'No employees yet'}
          description={tab === 'admins' ? undefined : 'Invite someone to get started'}
        />
      ) : (
        <DataTable columns={columns} data={shown} keyFn={(r) => r.id} />
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite team member">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">Full name</label>
            <input
              value={inviteForm.name}
              onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="Jane Smith"
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#444]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
              required
              placeholder="jane@company.com"
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#444]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">Role</label>
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm((p) => ({ ...p, role: e.target.value as 'admin' | 'member' }))
              }
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#444]"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <p className="rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#666666]">
            We&apos;ll email an invitation with a secure link to set their own password and download
            the desktop app for macOS and Windows.
          </p>

          {inviteError && (
            <p className="rounded border border-[#3f1515] bg-[#1c0a0a] px-3 py-2 text-xs text-[#ef4444]">
              {inviteError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="flex-1 rounded-md border border-[#2A2A2A] px-4 py-2 text-sm text-[#A1A1A1] hover:bg-[#1A1A1A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors"
            >
              {inviting && <LoadingSpinner size="sm" />}
              Send invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
