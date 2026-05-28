import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Smith' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: ['admin', 'member'] })
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: 'admin' | 'member';

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
