import { Injectable } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupabaseService } from '../common/supabase/supabase.service';

export class UpdateConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  screenshotIntervalMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slackWebhookUrl?: string;
}

@Injectable()
export class ConfigService {
  constructor(private readonly supabase: SupabaseService) {}

  async getAll() {
    const { data, error } = await this.supabase.client.from('app_config').select('*');
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  }

  async update(dto: UpdateConfigDto) {
    const updates: Array<{ key: string; value: string }> = [];
    if (dto.companyName !== undefined) updates.push({ key: 'company_name', value: dto.companyName });
    if (dto.screenshotIntervalMinutes !== undefined) updates.push({ key: 'screenshot_interval_minutes', value: String(dto.screenshotIntervalMinutes) });
    if (dto.timezone !== undefined) updates.push({ key: 'timezone', value: dto.timezone });
    if (dto.slackWebhookUrl !== undefined) updates.push({ key: 'slack_webhook_url', value: dto.slackWebhookUrl });

    for (const u of updates) {
      await this.supabase.client
        .from('app_config')
        .update({ value: u.value, updated_at: new Date().toISOString() })
        .eq('key', u.key);
    }
    return this.getAll();
  }
}
