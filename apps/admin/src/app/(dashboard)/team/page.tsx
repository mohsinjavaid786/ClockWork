'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Trash2, Apple, Monitor, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
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
  inviteStatus?: 'pending' | 'accepted';
}

// Public installer links (uploaded to the Supabase 'installers' bucket by the
// release workflow). Derived from the public Supabase URL — no secret.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const installerUrl = (file: string) =>
  SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/installers/latest/${file}` : null;
const MAC_URL = installerUrl('Clockwork.dmg');
const WIN_URL = installerUrl('Clockwork.exe');

// Common timezones offered when inviting, so "Employee's time" is meaningful.
const TIMEZONES: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Los_Angeles', label: 'Pacific — Los Angeles' },
  { value: 'America/Denver', label: 'Mountain — Denver' },
  { value: 'America/Chicago', label: 'Central — Chicago' },
  { value: 'America/New_York', label: 'Eastern — New York' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Berlin', label: 'Berlin / Paris' },
  { value: 'Africa/Cairo', label: 'Cairo' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Asia/Karachi', label: 'Karachi (GMT+5)' },
  { value: 'Asia/Kolkata', label: 'India (GMT+5:30)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (GMT+6)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Asia/Shanghai', label: 'China (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const { success } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'employees' | 'admins'>('employees');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'member' as 'admin' | 'member',
    timezone: 'UTC',
    password: '',
  });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
      const { password, ...rest } = inviteForm;
      // Only send a password if the admin chose to set a temporary one.
      await api.users.invite(password.trim() ? { ...rest, password: password.trim() } : rest);
      success(
        password.trim()
          ? `${inviteForm.name}'s account is ready`
          : `Invitation sent to ${inviteForm.email}`,
      );
      setInviteOpen(false);
      setInviteForm({ name: '', email: '', role: 'member', timezone: 'UTC', password: '' });
      load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleteError('');
    setDeleting(true);
    const name = toDelete.name;
    try {
      await api.users.remove(toDelete.id);
      success(`${name} and their data were deleted`);
      setToDelete(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
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
      key: 'invite',
      header: 'Signup',
      cell: (row: Member) => (
        <StatusBadge
          status={row.inviteStatus ?? 'pending'}
          label={row.inviteStatus === 'accepted' ? 'Accepted' : 'Pending'}
        />
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
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row: Member) =>
        row.id === currentUser?.id ? (
          <span className="text-xs text-[#444]">You</span>
        ) : (
          <button
            onClick={() => {
              setDeleteError('');
              setToDelete(row);
            }}
            title="Delete"
            aria-label={`Delete ${row.name}`}
            className="inline-flex items-center rounded p-1.5 text-[#666666] transition-colors hover:bg-[#1c0a0a] hover:text-[#ef4444]"
          >
            <Trash2 size={15} />
          </button>
        ),
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
          <div className="flex items-center gap-2">
            {MAC_URL && (
              <a
                href={MAC_URL}
                className="flex items-center gap-2 rounded-md border border-[#2A2A2A] px-3 py-2 text-xs font-medium text-[#A1A1A1] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                title="Download the macOS installer to share with an employee"
              >
                <Apple size={13} />
                macOS
              </a>
            )}
            {WIN_URL && (
              <a
                href={WIN_URL}
                className="flex items-center gap-2 rounded-md border border-[#2A2A2A] px-3 py-2 text-xs font-medium text-[#A1A1A1] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                title="Download the Windows installer to share with an employee"
              >
                <Monitor size={13} />
                Windows
              </a>
            )}
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-medium text-black hover:bg-[#e5e5e5] transition-colors"
            >
              <UserPlus size={13} />
              Invite member
            </button>
          </div>
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
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">Timezone</label>
            <select
              value={inviteForm.timezone}
              onChange={(e) => setInviteForm((p) => ({ ...p, timezone: e.target.value }))}
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#444]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[#666666]">
              Lets you view their entries in their local time.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
              Temporary password <span className="text-[#666666]">(optional)</span>
            </label>
            <input
              type="text"
              value={inviteForm.password}
              onChange={(e) => setInviteForm((p) => ({ ...p, password: e.target.value }))}
              minLength={8}
              placeholder="Leave blank to email a set-password link"
              autoComplete="off"
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#444]"
            />
          </div>
          <p className="rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#666666]">
            {inviteForm.password.trim()
              ? 'The account will be ready immediately — share this password with the employee so they can sign in and start the tracker.'
              : "We'll email an invitation with a secure link for them to set their own password, plus the desktop app downloads."}
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

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete employee">
        <div className="space-y-4">
          <div className="flex gap-3 rounded-md border border-[#3f1515] bg-[#1c0a0a] p-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-[#ef4444]" />
            <div className="text-xs leading-relaxed text-[#f5a3a3]">
              <p className="font-medium text-[#ef4444]">This permanently deletes everything.</p>
              <p className="mt-1">
                Deleting <span className="font-medium text-white">{toDelete?.name}</span> also
                deletes <span className="font-medium">all their time entries and screenshots</span>.
                This cannot be undone — proceed with caution.
              </p>
            </div>
          </div>

          {deleteError && (
            <p className="rounded border border-[#3f1515] bg-[#1c0a0a] px-3 py-2 text-xs text-[#ef4444]">
              {deleteError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setToDelete(null)}
              className="flex-1 rounded-md border border-[#2A2A2A] px-4 py-2 text-sm text-[#A1A1A1] transition-colors hover:bg-[#1A1A1A]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#dc2626] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#b91c1c] disabled:opacity-50"
            >
              {deleting && <LoadingSpinner size="sm" />}
              Delete permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
