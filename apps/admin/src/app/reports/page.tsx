'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiClient } from '@/lib/api';
import { initAuth } from '@/lib/auth';

export default function ReportsPage() {
  const [range, setRange] = useState({
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState<'csv' | 'pdf' | null>(null);

  function ensureAuth() { initAuth(); }

  async function downloadCsv() {
    ensureAuth();
    setLoading('csv');
    try {
      const blob = await apiClient.getBlob(`/reports/export/csv?startDate=${range.startDate}&endDate=${range.endDate}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackdesk-report-${range.startDate}-to-${range.endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setLoading(null); }
  }

  async function downloadPdf() {
    ensureAuth();
    setLoading('pdf');
    try {
      const blob = await apiClient.getBlob(`/reports/export/pdf?startDate=${range.startDate}&endDate=${range.endDate}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackdesk-report-${range.startDate}-to-${range.endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setLoading(null); }
  }

  return (
    <AdminLayout>
      <h2 className="text-xl font-bold mb-5">Reports</h2>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-xl">
        <h3 className="font-semibold mb-4">Export Time Data</h3>
        <div className="flex gap-3 mb-6">
          {(['startDate', 'endDate'] as const).map((k) => (
            <div key={k} className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">{k === 'startDate' ? 'From' : 'To'}</label>
              <input
                type="date"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                value={range[k]}
                onChange={(e) => setRange((r) => ({ ...r, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={downloadCsv}
            disabled={loading !== null}
          >
            {loading === 'csv' ? 'Generating…' : 'Export CSV'}
          </button>
          <button
            className="flex-1 bg-slate-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={downloadPdf}
            disabled={loading !== null}
          >
            {loading === 'pdf' ? 'Generating…' : 'Export PDF'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <h4 className="font-medium text-sm mb-2">CSV Columns</h4>
          <p className="text-xs text-slate-400">Employee, Project, Date, Start, End, Duration (hours), Activity %, Screenshots Count, Description</p>
        </div>
      </div>
    </AdminLayout>
  );
}
