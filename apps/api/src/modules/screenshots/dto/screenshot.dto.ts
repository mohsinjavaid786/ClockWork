import { IsISO8601, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
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
