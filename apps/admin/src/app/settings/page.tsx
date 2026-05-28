'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { apiClient } from '@/lib/api';
import { initAuth } from '@/lib/auth';

interface Config {
  company_name: string;
  screenshot_interval_minutes: string;
  timezone: string;
  slack_webhook_url: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config>({
    company_name: '',
    screenshot_interval_minutes: '10',
    timezone: 'UTC',
    slack_webhook_url: '',
  });
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
    apiClient.get<Config>('/config').then(setConfig);
  }, []);

  async function saveSettings() {
    await apiClient.patch('/config', {
      companyName: config.company_name,
      screenshotIntervalMinutes: parseInt(config.screenshot_interval_minutes, 10),
      timezone: config.timezone,
      slackWebhookUrl: config.slack_webhook_url,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testSlack() {
    try {
      await apiClient.post('/webhooks/slack/test', { webhookUrl: config.slack_webhook_url });
      setTestResult('Test message sent!');
    } catch {
      setTestResult('Failed to send test message.');
    }
    setTimeout(() => setTestResult(null), 3000);
  }

  function field(label: string, key: keyof Config, type = 'text', options?: string[]) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-slate-400">{label}</label>
        {options ? (
          <select
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
            value={config[key]}
            onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
          >
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
            value={config[key]}
            onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
          />
        )}
      </div>
    );
  }

  return (
    <AdminLayout>
      <h2 className="text-xl font-bold mb-5">Settings</h2>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-lg flex flex-col gap-5">
        {field('Company Name', 'company_name')}
        {field('Screenshot Interval', 'screenshot_interval_minutes', 'text', ['5', '10', '15'])}
        {field('Default Timezone', 'timezone')}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-slate-400">Slack Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm flex-1"
              placeholder="https://hooks.slack.com/services/…"
              value={config.slack_webhook_url}
              onChange={(e) => setConfig((c) => ({ ...c, slack_webhook_url: e.target.value }))}
            />
            <button
              className="bg-slate-700 text-sm text-white rounded-lg px-3 py-2"
              onClick={testSlack}
              disabled={!config.slack_webhook_url}
            >
              Test
            </button>
          </div>
          {testResult && <p className="text-xs text-green-400">{testResult}</p>}
        </div>

        <button
          className="bg-primary text-white rounded-lg py-2.5 text-sm font-medium w-full max-w-xs"
          onClick={saveSettings}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </AdminLayout>
  );
}
