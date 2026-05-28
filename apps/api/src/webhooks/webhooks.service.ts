import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async sendTestMessage(webhookUrl: string) {
    if (!webhookUrl?.startsWith('https://hooks.slack.com/')) {
      throw new BadRequestException('Invalid Slack webhook URL');
    }
    await this.postToSlack(webhookUrl, 'TrackDesk test notification ✅');
    return { ok: true };
  }

  @Cron('0 9 * * *', { timeZone: 'UTC' })
  async sendDailySummary() {
    const { data: configRow } = await this.supabase.client
      .from('app_config')
      .select('value')
      .eq('key', 'slack_webhook_url')
      .single();

    const webhookUrl = configRow?.value;
    if (!webhookUrl) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const { data: entries } = await this.supabase.client
      .from('time_entries')
      .select('duration_seconds, user_id, project_id')
      .gte('started_at', `${dateStr}T00:00:00.000Z`)
      .lte('started_at', `${dateStr}T23:59:59.999Z`)
      .not('duration_seconds', 'is', null);

    const rows = (entries ?? []) as { duration_seconds: number; user_id: string; project_id: string | null }[];
    const totalSeconds = rows.reduce((s, e) => s + e.duration_seconds, 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);
    const employees = new Set(rows.map((e) => e.user_id)).size;
    const projects = new Set(rows.map((e) => e.project_id).filter(Boolean)).size;

    const message = `Yesterday (${dateStr}): *${totalHours} hrs* logged by *${employees} employees* across *${projects} projects*`;
    await this.postToSlack(webhookUrl, message);
    this.logger.log(`Daily Slack summary sent for ${dateStr}`);
  }

  private async postToSlack(url: string, text: string) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`Slack webhook failed: ${response.status}`);
  }
}
