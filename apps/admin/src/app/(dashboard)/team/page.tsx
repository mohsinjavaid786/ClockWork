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
              className="text-sm font-medium text-ink hover:underline"
            >
              {row.name}
            </Link>
            <p className="text-xs text-graphite">{row.email}</p>
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
        <span className="font-mono text-sm text-ink">{row.weeklyHours.toFixed(1)}h</span>
      ),
    },
    {
      key: 'timezone',
      header: 'Timezone',
      cell: (row: Member) => <span className="text-xs text-graphite">{row.timezone}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row: Member) =>
        row.id === currentUser?.id ? (
          <span className="text-xs text-dove">You</span>
        ) : (
          <button
            onClick={() => {
              setDeleteError('');
              setToDelete(row);
            }}
            title="Delete"
            aria-label={`Delete ${row.name}`}
            className="inline-flex items-center rounded p-1.5 text-graphite transition-colors hover:bg-error-bg hover:text-error"
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
                className="flex items-center gap-2 rounded-full border border-dove px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-black/[0.03]"
                title="Download the macOS installer to share with an employee"
              >
                <Apple size={13} />
                macOS
              </a>
            )}
            {WIN_URL && (
              <a
                href={WIN_URL}
                className="flex items-center gap-2 rounded-full border border-dove px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-black/[0.03]"
                title="Download the Windows installer to share with an employee"
              >
                <Monitor size={13} />
                Windows
              </a>
            )}
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-ink/90"
            >
              <UserPlus size={13} />
              Invite member
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-hair">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-ink text-ink'
                : 'border-transparent text-graphite hover:text-ink'
            }`}
          >
            {t.label}
            <span className="ml-2 rounded-full bg-fog px-2 py-0.5 font-mono text-xs text-graphite">
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
            <label className="mb-1.5 block text-[14px] font-medium text-ink">Full name</label>
            <input
              value={inviteForm.name}
              onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="Jane Smith"
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink placeholder:text-graphite outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
              required
              placeholder="jane@company.com"
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink placeholder:text-graphite outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">Role</label>
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm((p) => ({ ...p, role: e.target.value as 'admin' | 'member' }))
              }
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">Timezone</label>
            <select
              value={inviteForm.timezone}
              onChange={(e) => setInviteForm((p) => ({ ...p, timezone: e.target.value }))}
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-graphite">
              Lets you view their entries in their local time.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">
              Temporary password <span className="text-graphite">(optional)</span>
            </label>
            <input
              type="text"
              value={inviteForm.password}
              onChange={(e) => setInviteForm((p) => ({ ...p, password: e.target.value }))}
              minLength={8}
              placeholder="Leave blank to email a set-password link"
              autoComplete="off"
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink placeholder:text-graphite outline-none focus:border-ink"
            />
          </div>
          <p className="rounded-field border border-hair bg-fog px-4 py-2.5 text-xs text-graphite">
            {inviteForm.password.trim()
              ? 'The account will be ready immediately — share this password with the employee so they can sign in and start the tracker.'
              : "We'll email an invitation with a secure link for them to set their own password, plus the desktop app downloads."}
          </p>

          {inviteError && (
            <p className="rounded-field border border-error-bg bg-error-bg px-4 py-2.5 text-xs text-error">
              {inviteError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="flex-1 rounded-full border border-dove px-4 py-2 text-sm text-ink transition-colors hover:bg-black/[0.03]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
            >
              {inviting && <LoadingSpinner size="sm" />}
              Send invite
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete employee">
        <div className="space-y-4">
          <div className="flex gap-3 rounded-field border border-error-bg bg-error-bg p-3">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-error" />
            <div className="text-xs leading-relaxed text-error">
              <p className="font-medium text-error">This permanently deletes everything.</p>
              <p className="mt-1">
                Deleting <span className="font-medium text-ink">{toDelete?.name}</span> also
                deletes <span className="font-medium">all their time entries and screenshots</span>.
                This cannot be undone — proceed with caution.
              </p>
            </div>
          </div>

          {deleteError && (
            <p className="rounded-field border border-error-bg bg-error-bg px-4 py-2.5 text-xs text-error">
              {deleteError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setToDelete(null)}
              className="flex-1 rounded-full border border-dove px-4 py-2 text-sm text-ink transition-colors hover:bg-black/[0.03]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
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
