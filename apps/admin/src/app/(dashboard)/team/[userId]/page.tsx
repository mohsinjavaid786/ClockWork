'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { EntryDetailPanel, type TimeEntry } from '@/components/EntryDetailPanel';
import { useTimezone } from '@/context/timezone-context';
import { formatDuration } from '@/lib/utils';

interface Entry {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  status: string;
  project: { id: string; name: string; color: string } | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  timezone: string;
  createdAt: string;
  weeklyHours: number;
  recentEntries: Entry[];
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { format, setEmployeeTz } = useTimezone();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimeEntry | null>(null);

  useEffect(() => {
    api.users
      .get(userId)
      .then((d) => setProfile(d as UserProfile))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  // Expose this employee's timezone so the "Employee's time" option works, and
  // clear it when leaving the page.
  useEffect(() => {
    if (profile?.timezone) setEmployeeTz(profile.timezone);
    return () => setEmployeeTz(null);
  }, [profile?.timezone, setEmployeeTz]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return <EmptyState title="User not found" />;
  }

  const columns = [
    {
      key: 'date',
      header: 'Date',
      cell: (row: Entry) => (
        <span className="text-xs text-ash">
          {format(row.started_at, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      cell: (row: Entry) =>
        row.project ? (
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: row.project.color }}
            />
            <span className="text-xs text-ash">{row.project.name}</span>
          </div>
        ) : (
          <span className="text-xs text-dove">No project</span>
        ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row: Entry) => (
        <span className="text-xs text-graphite">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: (row: Entry) => (
        <span className="font-mono text-xs text-ink">
          {row.duration_seconds ? formatDuration(row.duration_seconds) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: Entry) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/team"
        className="flex items-center gap-1 text-xs text-graphite hover:text-ink transition-colors"
      >
        <ChevronLeft size={13} />
        Back to team
      </Link>

      <div className="flex items-start gap-4 rounded-card bg-card p-6 shadow-card">
        <Avatar name={profile.name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink">{profile.name}</h1>
            <StatusBadge status={profile.role} />
            <StatusBadge
              status={profile.isActive ? 'active' : 'inactive'}
              label={profile.isActive ? 'Active' : 'Inactive'}
            />
          </div>
          <p className="mt-1 text-sm text-graphite">{profile.email}</p>
          <p className="mt-0.5 text-xs text-dove">{profile.timezone}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-ink">
            {profile.weeklyHours.toFixed(1)}h
          </p>
          <p className="text-xs text-graphite">this week</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-graphite">
          Recent activity
          <span className="ml-2 normal-case tracking-normal text-dove">
            — click an entry to see screenshots &amp; activity
          </span>
        </h2>
        {profile.recentEntries.length === 0 ? (
          <EmptyState title="No time entries yet" />
        ) : (
          <DataTable
            columns={columns}
            data={profile.recentEntries}
            keyFn={(r) => r.id}
            onRowClick={(r) =>
              setSelected({
                ...r,
                paused_seconds: null,
                user: { id: profile.id, name: profile.name, email: profile.email },
              })
            }
          />
        )}
      </div>

      <EntryDetailPanel entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
