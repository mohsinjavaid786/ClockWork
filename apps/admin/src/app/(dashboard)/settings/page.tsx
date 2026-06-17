'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/toast-context';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Config {
  screenshotIntervalMinutes: number;
  companyName: string;
  timezone: string;
  slackWebhookUrl?: string;
}

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
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
      success('Settings saved');
    } catch {
      setSaveStatus('error');
      toastError('Failed to save settings');
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
        <div className="rounded-card bg-card p-6 shadow-card space-y-5">
          <h2 className="text-[15px] font-medium text-ink">General</h2>

          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">
              Company name
            </label>
            <input
              value={config.companyName}
              onChange={(e) => setConfig((p) => p && { ...p, companyName: e.target.value })}
              required
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">Timezone</label>
            <input
              value={config.timezone}
              onChange={(e) => setConfig((p) => p && { ...p, timezone: e.target.value })}
              required
              placeholder="UTC"
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink placeholder:text-graphite outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">
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
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
        </div>

        <div className="rounded-card bg-card p-6 shadow-card space-y-5">
          <h2 className="text-[15px] font-medium text-ink">Slack integration</h2>

          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-ink">
              Webhook URL
            </label>
            <input
              type="url"
              value={config.slackWebhookUrl ?? ''}
              onChange={(e) =>
                setConfig((p) => p && { ...p, slackWebhookUrl: e.target.value || undefined })
              }
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-field border border-dove bg-card px-4 py-2.5 text-sm text-ink placeholder:text-graphite outline-none focus:border-ink"
            />
          </div>

          <button
            type="button"
            onClick={handleTestSlack}
            disabled={testing || !config.slackWebhookUrl}
            className="flex items-center gap-2 rounded-full border border-dove px-4 py-2 text-xs text-ink hover:bg-black/[0.03] disabled:opacity-40 transition-colors"
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
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50 transition-colors"
          >
            {saving && <LoadingSpinner size="sm" />}
            Save changes
          </button>
          {saveStatus === 'saved' && (
            <span className="text-xs text-success">Saved successfully</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-error">Failed to save</span>
          )}
        </div>
      </form>
    </div>
  );
}
