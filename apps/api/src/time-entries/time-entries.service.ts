import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SupabaseService } from '../common/supabase/supabase.service';

export class StartTimeEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class StopTimeEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entryId?: string;
}

export class TimeEntriesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}

@Injectable()
export class TimeEntriesService {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async start(userId: string, dto: StartTimeEntryDto) {
    const { data: existing } = await this.supabase.client
      .from('time_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('is_running', true)
      .single();

    if (existing) throw new BadRequestException('A timer is already running');

    const { data, error } = await this.supabase.client
      .from('time_entries')
      .insert({
        user_id: userId,
        project_id: dto.projectId ?? null,
        description: dto.description ?? null,
        started_at: new Date().toISOString(),
        is_running: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async stop(userId: string, dto: StopTimeEntryDto) {
    let query = this.supabase.client
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('is_running', true);

    if (dto.entryId) query = query.eq('id', dto.entryId) as typeof query;

    const { data: entry, error: findErr } = await query.single();
    if (findErr || !entry) throw new NotFoundException('No running timer found');

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - new Date(entry.started_at).getTime()) / 1000,
    );

    const { data, error } = await this.supabase.client
      .from('time_entries')
      .update({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds, is_running: false })
      .eq('id', entry.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(query: TimeEntriesQueryDto, requestingUserId: string, isAdmin: boolean) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    let q = this.supabase.client
      .from('time_entries')
      .select('*, users(name, email), projects(name, color)', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!isAdmin) q = q.eq('user_id', requestingUserId) as typeof q;
    else if (query.userId) q = q.eq('user_id', query.userId) as typeof q;

    if (query.projectId) q = q.eq('project_id', query.projectId) as typeof q;
    if (query.startDate) q = q.gte('started_at', query.startDate) as typeof q;
    if (query.endDate) q = q.lte('started_at', query.endDate) as typeof q;

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);

    return { data: data ?? [], total: count ?? 0, page, limit };
  }

  async remove(id: string) {
    const { error } = await this.supabase.client
      .from('time_entries')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  }
}
