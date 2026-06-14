import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UploadScreenshotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  timeEntryId?: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  activityPercent: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  capturedAt?: string;

  @ApiPropertyOptional({ minimum: 1, description: '1-based index of the captured display' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  screenNumber?: number;

  @ApiPropertyOptional({ minimum: 1, description: 'Total displays captured in this event' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  displayCount?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Keystrokes during this interval' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  keyCount?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Mouse events during this interval' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mouseCount?: number;

  @ApiPropertyOptional({ description: 'Foreground window/app title at capture time' })
  @IsOptional()
  @IsString()
  activeWindow?: string;

  @ApiPropertyOptional({
    description: 'Per-minute breakdown as a JSON string: [{ t, keys, mouse, window }]',
  })
  @IsOptional()
  @IsString()
  minuteActivity?: string;
}

export class ListScreenshotsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;
}
