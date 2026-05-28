import { IsBoolean, IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Website Redesign' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Redesign the company website' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '#6366F1' })
  @IsHexColor()
  color: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Website Redesign' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#6366F1' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
