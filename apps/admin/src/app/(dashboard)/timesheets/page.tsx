'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { EntryDetailPanel, type TimeEntry } from '@/components/EntryDetailPanel';
import { useTimezone } from '@/context/timezone-context';
import { formatDuration } from '@/lib/utils';

interface Paged {
  data: TimeEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TimesheetsPage() {
  const { format } = useTimezone();
  const [result, setResult] = useState<Paged | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimeEntry | null>(null);

  function load() {
    setLoading(true);
    api.timeEntries
      .list({ page: String(page), limit: '25' })
      .then((d) => setResult(d as Paged))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Timesheets"
          description="Click any entry to see screenshots and activity details"
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : !result || result.data.length === 0 ? (
          <EmptyState title="No time entries found" />
        ) : (
          <>
            <div className="overflow-x-auto rounded-card bg-card shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hair">
                    {['Member', 'Started', 'Project', 'Description', 'Duration', 'Status', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[13px] font-medium uppercase tracking-[0.04em] text-graphite"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(row)}
                      className="group cursor-pointer border-b border-hair transition-colors hover:bg-fog"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={row.user?.name ?? '?'} size="sm" />
                          <span className="text-sm font-medium text-ink">{row.user?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-ash">
                          {format(row.started_at, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.project ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 flex-shrink-0 rounded-full"
                              style={{ background: row.project.color }}
                            />
                            <span className="text-xs text-ash">{row.project.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-dove">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="block truncate text-xs text-graphite">
                          {row.description ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-ink">
                          {row.duration_seconds != null ? formatDuration(row.duration_seconds) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight
                          size={14}
                          className="text-dove transition-colors group-hover:text-graphite"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-graphite">
              <span>{result.total} total entries</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-full border border-dove px-3 py-1.5 text-ink disabled:opacity-30 hover:bg-black/[0.03] transition-colors"
                >
                  Prev
                </button>
                <span>{page} / {result.totalPages}</span>
                <button
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border border-dove px-3 py-1.5 text-ink disabled:opacity-30 hover:bg-black/[0.03] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <EntryDetailPanel entry={selected} onClose={() => setSelected(null)} onChanged={load} />
    </>
  );
}
