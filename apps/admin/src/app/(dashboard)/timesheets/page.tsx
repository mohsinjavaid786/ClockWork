'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
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
  user: { id: string; name: string; email: string } | null;
  project: { id: string; name: string; color: string } | null;
}

interface Paged {
  data: Entry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TimesheetsPage() {
  const [result, setResult] = useState<Paged | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.timeEntries
      .list({ page: String(page), limit: '25' })
      .then((d) => setResult(d as Paged))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const columns = [
    {
      key: 'user',
      header: 'Member',
      cell: (row: Entry) => (
        <span className="text-sm text-white">{row.user?.name ?? '—'}</span>
      ),
    },
    {
      key: 'date',
      header: 'Started',
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
            <span className="text-xs">{row.project.name}</span>
          </div>
        ) : (
          <span className="text-xs text-[#444]">—</span>
        ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row: Entry) => (
        <span className="max-w-xs truncate text-xs text-[#666666]">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: (row: Entry) => (
        <span className="font-mono text-sm text-white">
          {row.duration_seconds != null ? formatDuration(row.duration_seconds) : '—'}
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
      <PageHeader
        title="Timesheets"
        description="All time entries across the team"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : !result || result.data.length === 0 ? (
        <EmptyState title="No time entries found" />
      ) : (
        <>
          <DataTable columns={columns} data={result.data} keyFn={(r) => r.id} />
          <div className="flex items-center justify-between text-xs text-[#666666]">
            <span>
              {result.total} total entries
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-[#2A2A2A] px-3 py-1.5 disabled:opacity-30 hover:bg-[#1A1A1A] transition-colors"
              >
                Prev
              </button>
              <span>
                {page} / {result.totalPages}
              </span>
              <button
                disabled={page >= result.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-[#2A2A2A] px-3 py-1.5 disabled:opacity-30 hover:bg-[#1A1A1A] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
