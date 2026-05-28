'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Config {
  screenshotIntervalMinutes: number;
  companyName: string;
  timezone: string;
  slackWebhookUrl?: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    api.config
      .get()
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      await api.config.update(config);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  async function handleTestSlack() {
    setTesting(true);
    setTestStatus('idle');
    try {
      await api.webhooks.testSlack();
      setTestStatus('ok');
    } catch {
      setTestStatus('fail');
    } finally {
      setTesting(false);
      setTimeout(() => setTestStatus('idle'), 4000);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Application-wide configuration" />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#111111] p-6 space-y-5">
          <h2 className="font-mono text-sm font-semibold text-white">General</h2>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
              Company name
            </label>
            <input
              value={config.companyName}
              onChange={(e) => setConfig((p) => p && { ...p, companyName: e.target.value })}
              required
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#444]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">Timezone</label>
            <input
              value={config.timezone}
              onChange={(e) => setConfig((p) => p && { ...p, timezone: e.target.value })}
              required
              placeholder="UTC"
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#444]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
              Screenshot interval (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={config.screenshotIntervalMinutes}
              onChange={(e) =>
                setConfig((p) => p && { ...p, screenshotIntervalMinutes: Number(e.target.value) })
              }
              required
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#444]"
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#2A2A2A] bg-[#111111] p-6 space-y-5">
          <h2 className="font-mono text-sm font-semibold text-white">Slack integration</h2>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A1A1A1]">
              Webhook URL
            </label>
            <input
              type="url"
              value={config.slackWebhookUrl ?? ''}
              onChange={(e) =>
                setConfig((p) => p && { ...p, slackWebhookUrl: e.target.value || undefined })
              }
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-md border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#444]"
            />
          </div>

          <button
            type="button"
            onClick={handleTestSlack}
            disabled={testing || !config.slackWebhookUrl}
            className="flex items-center gap-2 rounded-md border border-[#2A2A2A] px-4 py-2 text-xs text-[#A1A1A1] hover:bg-[#1A1A1A] hover:text-white disabled:opacity-40 transition-colors"
          >
            {testing && <LoadingSpinner size="sm" />}
            {testStatus === 'ok'
              ? 'Message sent!'
              : testStatus === 'fail'
              ? 'Failed — check URL'
              : 'Send test message'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-white px-5 py-2 text-sm font-medium text-black hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors"
          >
            {saving && <LoadingSpinner size="sm" />}
            Save changes
          </button>
          {saveStatus === 'saved' && (
            <span className="text-xs text-[#22c55e]">Saved successfully</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-[#ef4444]">Failed to save</span>
          )}
        </div>
      </form>
    </div>
  );
}
