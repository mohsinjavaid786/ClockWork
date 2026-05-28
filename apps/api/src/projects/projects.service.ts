import { Injectable, NotFoundException } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupabaseService } from '../common/supabase/supabase.service';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase.client
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException(`Project ${id} not found`);
    return data;
  }

  async create(dto: CreateProjectDto, createdBy: string) {
    const { data, error } = await this.supabase.client
      .from('projects')
      .insert({ name: dto.name, description: dto.description, color: dto.color ?? '#6366f1', created_by: createdBy })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.color !== undefined) updates.color = dto.color;
    if (dto.isArchived !== undefined) updates.is_archived = dto.isArchived;

    const { data, error } = await this.supabase.client
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.client.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async getStats(id: string) {
    const [entriesResult, screenshotsResult] = await Promise.all([
      this.supabase.client
        .from('time_entries')
        .select('duration_seconds, user_id')
        .eq('project_id', id)
        .not('duration_seconds', 'is', null),
      this.supabase.client
        .from('screenshots')
        .select('id', { count: 'exact' })
        .eq('time_entry_id', id),
    ]);

    const entries: { duration_seconds: number; user_id: string }[] = entriesResult.data ?? [];
    const totalSeconds = entries.reduce((sum, e) => sum + e.duration_seconds, 0);
    const activeMembers = new Set(entries.map((e) => e.user_id)).size;

    return {
      projectId: id,
      totalHours: Math.round((totalSeconds / 3600) * 100) / 100,
      activeMembers,
      screenshotCount: screenshotsResult.count ?? 0,
    };
  }
}
