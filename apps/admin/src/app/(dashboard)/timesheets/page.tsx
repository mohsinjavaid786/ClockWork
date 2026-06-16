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
            <div className="overflow-x-auto rounded-lg border border-[#2A2A2A]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] bg-[#111111]">
                    {['Member', 'Started', 'Project', 'Description', 'Duration', 'Status', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#666666]"
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
                      className="group cursor-pointer border-b border-[#1F1F1F] bg-[#0A0A0A] transition-colors hover:bg-[#111111]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={row.user?.name ?? '?'} size="sm" />
                          <span className="text-sm font-medium text-white">{row.user?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#A1A1A1]">
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
                            <span className="text-xs text-[#A1A1A1]">{row.project.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#444]">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="block truncate text-xs text-[#666666]">
                          {row.description ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-white">
                          {row.duration_seconds != null ? formatDuration(row.duration_seconds) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight
                          size={14}
                          className="text-[#333] transition-colors group-hover:text-[#666666]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-[#666666]">
              <span>{result.total} total entries</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-[#2A2A2A] px-3 py-1.5 disabled:opacity-30 hover:bg-[#1A1A1A] transition-colors"
                >
                  Prev
                </button>
                <span>{page} / {result.totalPages}</span>
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

      <EntryDetailPanel entry={selected} onClose={() => setSelected(null)} onChanged={load} />
    </>
  );
}
