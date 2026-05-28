import { IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  screenshotIntervalMinutes?: number;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  slackWebhookUrl?: string;
}
