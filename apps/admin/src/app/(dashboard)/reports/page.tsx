'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);

  function buildParams() {
    const p: Record<string, string> = {};
    if (from) p['from'] = new Date(from).toISOString();
    if (to) p['to'] = new Date(to + 'T23:59:59').toISOString();
    return p;
  }

  function triggerDownload(blob: Blob, filename: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function download(type: 'csv' | 'pdf') {
    setDownloading(type);

    const token = localStorage.getItem('cw_token') ?? '';
    const params = buildParams();
    const url = type === 'csv' ? api.reports.csvUrl(params) : api.reports.pdfUrl(params);

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        triggerDownload(blob, type === 'csv' ? 'clockwork-report.csv' : 'clockwork-report.html');
      })
      .catch(console.error)
      .finally(() => setDownloading(null));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Export time data for any date range"
      />

      <div className="rounded-card bg-card p-6 shadow-card space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => download('csv')}
            disabled={downloading !== null}
            className="flex items-center gap-2 rounded-full border border-dove px-4 py-2 text-sm text-ink hover:bg-black/[0.03] disabled:opacity-50 transition-colors"
          >
            <Download size={13} />
            {downloading === 'csv' ? 'Downloading…' : 'Export CSV'}
          </button>
          <button
            onClick={() => download('pdf')}
            disabled={downloading !== null}
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50 transition-colors"
          >
            <Download size={13} />
            {downloading === 'pdf' ? 'Downloading…' : 'Export HTML Report'}
          </button>
        </div>

        <p className="text-xs text-graphite">
          Leave date fields empty to export all time. The report includes all entries for the selected period across all team members.
        </p>
      </div>
    </div>
  );
}
