'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { api, isDemoMode } from '@/lib/api';
import { getMockCsv, getMockHtml } from '@/lib/mock-data';
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

    if (isDemoMode()) {
      const content = type === 'csv' ? getMockCsv() : getMockHtml();
      const mime = type === 'csv' ? 'text/csv' : 'text/html';
      const filename = type === 'csv' ? 'clockwork-report.csv' : 'clockwork-report.html';
      triggerDownload(new Blob([content], { type: mime }), filename);
      setDownloading(null);
      return;
    }

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

      <div className="rounded-xl border border-[#2A2A2A] bg-[#111111] p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#444] [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#444] [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => download('csv')}
            disabled={downloading !== null}
            className="flex items-center gap-2 rounded-md border border-[#2A2A2A] px-4 py-2 text-sm text-[#A1A1A1] hover:bg-[#1A1A1A] hover:text-white disabled:opacity-50 transition-colors"
          >
            <Download size={13} />
            {downloading === 'csv' ? 'Downloading…' : 'Export CSV'}
          </button>
          <button
            onClick={() => download('pdf')}
            disabled={downloading !== null}
            className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors"
          >
            <Download size={13} />
            {downloading === 'pdf' ? 'Downloading…' : 'Export HTML Report'}
          </button>
        </div>

        <p className="text-xs text-[#444]">
          Leave date fields empty to export all time. The report includes all entries for the selected period across all team members.
        </p>
      </div>
    </div>
  );
}
