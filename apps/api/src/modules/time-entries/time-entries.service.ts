import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { StartTimerDto, StopTimerDto, ListEntriesQueryDto } from './dto/time-entry.dto';

@Injectable()
export class TimeEntriesService {
  constructor(private readonly supabase: SupabaseService) {}

  async start(userId: string, dto: StartTimerDto) {
    const { data: running } = await this.supabase.client
      .from('time_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'running')
      .single();

    if (running) throw new ConflictException('A timer is already running');

    const { data, error } = await this.supabase.client
      .from('time_entries')
      .insert({
        user_id: userId,
        project_id: dto.projectId ?? null,
        description: dto.description ?? null,
        started_at: new Date().toISOString(),
        status: 'running',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async stop(userId: string, entryId: string, dto: StopTimerDto) {
    const { data: entry, error: fetchError } = await this.supabase.client
      .from('time_entries')
      .select('id, started_at, status')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) throw new NotFoundException('Time entry not found');
    if (entry.status !== 'running') throw new BadRequestException('Timer is not running');

    const endedAt = dto.endedAt ?? new Date().toISOString();
    const startedAt = new Date(entry.started_at as string);
    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - startedAt.getTime()) / 1000,
    );

    const { data, error } = await this.supabase.client
      .from('time_entries')
      .update({
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        status: 'stopped',
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async list(query: ListEntriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    let q = this.supabase.client
      .from('time_entries')
      .select(
        'id, user_id, project_id, description, started_at, ended_at, duration_seconds, status, user:users(id, name, email), project:projects(id, name, color)',
        { count: 'exact' },
      )
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.userId) q = q.eq('user_id', query.userId);
    if (query.projectId) q = q.eq('project_id', query.projectId);
    if (query.from) q = q.gte('started_at', query.from);
    if (query.to) q = q.lte('started_at', query.to);

    const { data, error, count } = await q;

    if (error) throw new BadRequestException(error.message);

    const total = count ?? 0;
    return {
      data: data ?? [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const q = this.supabase.client.from('time_entries').delete().eq('id', id);
    if (!isAdmin) q.eq('user_id', userId);

    const { error } = await q;
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async getActive() {
    const { data, error } = await this.supabase.client
      .from('time_entries')
      .select(
        'user_id, started_at, description, project:projects(name), user:users(id, name, email)',
      )
      .eq('status', 'running');

    if (error) throw new BadRequestException(error.message);

    const now = Date.now();
    return (data ?? []).map((e) => {
      const project = e.project as { name?: string } | null;
      const user = e.user as { id?: string; name?: string; email?: string } | null;
      return {
        userId: e.user_id as string,
        name: user?.name ?? '',
        email: user?.email ?? '',
        projectName: project?.name,
        description: e.description as string | undefined,
        elapsedSeconds: Math.floor((now - new Date(e.started_at as string).getTime()) / 1000),
        startedAt: e.started_at as string,
      };
    });
  }
}
