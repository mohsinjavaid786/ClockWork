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

  // Optional: when set, the account is created with this password so the
  // employee can log in immediately (admin shares it manually). When omitted,
  // an invite link is emailed for them to set their own password.
  @ApiPropertyOptional({ example: 'Temp1234!', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
