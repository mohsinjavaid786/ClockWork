import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StartTimerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class StopTimerDto {
  @ApiPropertyOptional({ description: 'ISO8601 end time, defaults to now' })
  @IsOptional()
  @IsISO8601()
  endedAt?: string;
}

export class ListEntriesQueryDto {
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
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;
}
