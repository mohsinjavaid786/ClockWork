import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { dbError } from '../../common/db';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list() {
    const { data, error } = await this.supabase.client
      .from('projects')
      .select('id, name, description, color, is_archived, created_by, created_at')
      .order('created_at', { ascending: false });

    if (error) throw dbError(error);

    const result = await Promise.all(
      (data ?? []).map(async (p) => {
        const { data: entries } = await this.supabase.client
          .from('time_entries')
          .select('duration_seconds')
          .eq('project_id', p.id)
          .eq('status', 'stopped');

        const totalSeconds = (entries ?? []).reduce(
          (sum, e) => sum + ((e.duration_seconds as number) ?? 0),
          0,
        );

        return {
          id: p.id as string,
          name: p.name as string,
          description: p.description as string | undefined,
          color: p.color as string,
          isArchived: p.is_archived as boolean,
          createdBy: p.created_by as string,
          createdAt: p.created_at as string,
          totalHours: Math.round((totalSeconds / 3600) * 100) / 100,
        };
      }),
    );

    return result;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.client
      .from('projects')
      .select('id, name, description, color, is_archived, created_by, created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Project not found');

    const { data: entries } = await this.supabase.client
      .from('time_entries')
      .select('duration_seconds, user_id')
      .eq('project_id', id)
      .eq('status', 'stopped');

    const totalSeconds = (entries ?? []).reduce(
      (sum, e) => sum + ((e.duration_seconds as number) ?? 0),
      0,
    );

    const uniqueMembers = new Set((entries ?? []).map((e) => e.user_id)).size;

    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string | undefined,
      color: data.color as string,
      isArchived: data.is_archived as boolean,
      createdBy: data.created_by as string,
      createdAt: data.created_at as string,
      totalHours: Math.round((totalSeconds / 3600) * 100) / 100,
      memberCount: uniqueMembers,
    };
  }

  async create(dto: CreateProjectDto, userId: string) {
    const { data, error } = await this.supabase.client
      .from('projects')
      .insert({
        name: dto.name,
        description: dto.description,
        color: dto.color,
        created_by: userId,
        is_archived: false,
      })
      .select()
      .single();

    if (error) throw dbError(error);
    return data;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch['name'] = dto.name;
    if (dto.description !== undefined) patch['description'] = dto.description;
    if (dto.color !== undefined) patch['color'] = dto.color;
    if (dto.isArchived !== undefined) patch['is_archived'] = dto.isArchived;

    const { data, error } = await this.supabase.client
      .from('projects')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Project not found');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.client.from('projects').delete().eq('id', id);
    if (error) throw dbError(error);
    return { success: true };
  }
}
