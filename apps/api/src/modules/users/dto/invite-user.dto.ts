import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteUserDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'jane@clockwork.app' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['admin', 'member'], default: 'member' })
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member';

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
