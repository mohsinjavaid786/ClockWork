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
import { formatDateTime, formatDuration } from '@/lib/utils';

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users
      .get(userId)
      .then((d) => setProfile(d as UserProfile))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

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
        <span className="text-xs text-[#A1A1A1]">{formatDateTime(row.started_at)}</span>
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
            <span className="text-xs text-[#A1A1A1]">{row.project.name}</span>
          </div>
        ) : (
          <span className="text-xs text-[#444]">No project</span>
        ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row: Entry) => (
        <span className="text-xs text-[#666666]">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: (row: Entry) => (
        <span className="font-mono text-xs text-white">
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
        className="flex items-center gap-1 text-xs text-[#666666] hover:text-white transition-colors"
      >
        <ChevronLeft size={13} />
        Back to team
      </Link>

      <div className="flex items-start gap-4 rounded-xl border border-[#2A2A2A] bg-[#111111] p-6">
        <Avatar name={profile.name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-semibold text-white">{profile.name}</h1>
            <StatusBadge status={profile.role} />
            <StatusBadge
              status={profile.isActive ? 'active' : 'inactive'}
              label={profile.isActive ? 'Active' : 'Inactive'}
            />
          </div>
          <p className="mt-1 text-sm text-[#666666]">{profile.email}</p>
          <p className="mt-0.5 text-xs text-[#444]">{profile.timezone}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-white">
            {profile.weeklyHours.toFixed(1)}h
          </p>
          <p className="text-xs text-[#666666]">this week</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[#666666]">
          Recent activity
        </h2>
        {profile.recentEntries.length === 0 ? (
          <EmptyState title="No time entries yet" />
        ) : (
          <DataTable columns={columns} data={profile.recentEntries} keyFn={(r) => r.id} />
        )}
      </div>
    </div>
  );
}
