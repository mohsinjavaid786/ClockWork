import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async sendSlackMessage(webhookUrl: string, text: string): Promise<void> {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      throw new Error(`Slack webhook failed: ${res.status}`);
    }
  }

  async testWebhook() {
    const { data: config } = await this.supabase.client
      .from('app_config')
      .select('slack_webhook_url')
      .single();

    const webhookUrl = config?.slack_webhook_url as string | null;
    if (!webhookUrl) {
      return { success: false, message: 'No Slack webhook URL configured' };
    }

    await this.sendSlackMessage(webhookUrl, ':white_check_mark: Clockwork webhook test successful!');
    return { success: true, message: 'Test message sent' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async dailySummary() {
    const { data: config } = await this.supabase.client
      .from('app_config')
      .select('slack_webhook_url')
      .single();

    const webhookUrl = config?.slack_webhook_url as string | null;
    if (!webhookUrl) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const dayEnd = new Date(yesterday);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: entries } = await this.supabase.client
      .from('time_entries')
      .select('duration_seconds, user:users(name)')
      .eq('status', 'stopped')
      .gte('started_at', yesterday.toISOString())
      .lte('started_at', dayEnd.toISOString());

    const totalSeconds = (entries ?? []).reduce(
      (s, e) => s + ((e.duration_seconds as number) ?? 0),
      0,
    );
    const uniqueUsers = new Set((entries ?? []).map((e) => {
      const user = e.user as { name?: string } | null;
      return user?.name;
    })).size;

    const date = yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const hours = (totalSeconds / 3600).toFixed(1);

    await this.sendSlackMessage(
      webhookUrl,
      `:clockwork: *Daily Summary — ${date}*\n• ${uniqueUsers} members tracked time\n• ${hours}h total logged`,
    );

    this.logger.log(`Daily Slack summary sent: ${hours}h from ${uniqueUsers} members`);
  }
}
