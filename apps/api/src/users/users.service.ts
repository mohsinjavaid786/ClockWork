import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { IsEmail, IsIn, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteUserDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['admin', 'member'] })
  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['admin', 'member'] })
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: 'admin' | 'member';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase.client
      .from('users')
      .select('*, time_entries(duration_seconds, started_at)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`User ${id} not found`);
    return data;
  }

  async findMe(userId: string) {
    return this.findOne(userId);
  }

  async invite(dto: InviteUserDto) {
    const { data, error } = await this.supabase.client.auth.admin.createUser({
      email: dto.email,
      email_confirm: true,
      user_metadata: { name: dto.name },
    });
    if (error) throw new Error(error.message);

    await this.supabase.client.from('users').insert({
      id: data.user.id,
      name: dto.name,
      email: dto.email,
      role: dto.role,
    });

    this.logger.log(`Invited user ${dto.email}`);
    return data.user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;
    if (dto.timezone !== undefined) updates.timezone = dto.timezone;

    const { data, error } = await this.supabase.client
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getUserStats(userId: string) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { data: entries } = await this.supabase.client
      .from('time_entries')
      .select('duration_seconds, is_running, started_at')
      .eq('user_id', userId)
      .gte('started_at', weekStart.toISOString());

    const weeklySeconds = (entries ?? []).reduce(
      (sum: number, e: { duration_seconds?: number }) => sum + (e.duration_seconds ?? 0),
      0,
    );

    return {
      weeklyHours: Math.round((weeklySeconds / 3600) * 100) / 100,
      isRunning: (entries ?? []).some((e: { is_running: boolean }) => e.is_running),
    };
  }
}
