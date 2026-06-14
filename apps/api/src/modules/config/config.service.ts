import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UpdateConfigDto } from './dto/config.dto';

@Injectable()
export class ConfigService {
  constructor(private readonly supabase: SupabaseService) {}

  async get() {
    const { data, error } = await this.supabase.client
      .from('app_config')
      .select('screenshot_interval_minutes, company_name, timezone, slack_webhook_url')
      .single();

    if (error || !data)
      throw new BadRequestException(
        `Config not found [diag]: ${JSON.stringify({
          message: error?.message ?? null,
          code: error?.code ?? null,
          details: error?.details ?? null,
          hint: error?.hint ?? null,
          hasData: !!data,
        })}`,
      );

    return {
      screenshotIntervalMinutes: data.screenshot_interval_minutes as number,
      companyName: data.company_name as string,
      timezone: data.timezone as string,
      slackWebhookUrl: data.slack_webhook_url as string | undefined,
    };
  }

  async update(dto: UpdateConfigDto) {
    const patch: Record<string, unknown> = {};
    if (dto.screenshotIntervalMinutes !== undefined)
      patch['screenshot_interval_minutes'] = dto.screenshotIntervalMinutes;
    if (dto.companyName !== undefined) patch['company_name'] = dto.companyName;
    if (dto.timezone !== undefined) patch['timezone'] = dto.timezone;
    if (dto.slackWebhookUrl !== undefined) patch['slack_webhook_url'] = dto.slackWebhookUrl;

    const { data, error } = await this.supabase.client
      .from('app_config')
      .update(patch)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return {
      screenshotIntervalMinutes: data.screenshot_interval_minutes as number,
      companyName: data.company_name as string,
      timezone: data.timezone as string,
      slackWebhookUrl: data.slack_webhook_url as string | undefined,
    };
  }
}
