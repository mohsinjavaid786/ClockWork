import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { dbError } from '../../common/db';
import { StartTimerDto, StopTimerDto, ListEntriesQueryDto } from './dto/time-entry.dto';

@Injectable()
export class TimeEntriesService {
  constructor(private readonly supabase: SupabaseService) {}

  async start(userId: string, dto: StartTimerDto) {
    const { data: open } = await this.supabase.client
      .from('time_entries')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['running', 'paused'])
      .maybeSingle();

    if (open) throw new ConflictException('A timer is already running');

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

    // The check above is racy; the partial unique index (migration 008) is the
    // real guard. A concurrent start trips it with a unique violation (23505),
    // which we surface as the same 409 the client already handles.
    if (error) {
      if (error.code === '23505') throw new ConflictException('A timer is already running');
      throw dbError(error);
    }
    return data;
  }

  // The caller's currently open entry (running or paused), or null. Lets the
  // desktop app reconcile its local state against server truth on startup — so a
  // reinstalled/updated client that lost its local session can re-adopt an entry
  // that's still open on the server instead of being unable to start a new one.
  async current(userId: string) {
    // Take the most recent open entry rather than maybeSingle(): if a user ever
    // ends up with more than one open entry, maybeSingle() errors and the client
    // can never reconcile. Newest-first + limit(1) always resolves to one.
    const { data } = await this.supabase.client
      .from('time_entries')
      .select('id, started_at, status, project_id, description, paused_seconds')
      .eq('user_id', userId)
      .in('status', ['running', 'paused'])
      .order('started_at', { ascending: false })
      .limit(1);

    return { entry: data?.[0] ?? null };
  }

  async pause(userId: string, entryId: string) {
    const { data: entry, error: fetchError } = await this.supabase.client
      .from('time_entries')
      .select('id, status, pauses')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) throw new NotFoundException('Time entry not found');
    if (entry.status !== 'running') throw new BadRequestException('Timer is not running');

    const pauses = ((entry.pauses as Array<Record<string, unknown>>) ?? []).slice();
    pauses.push({ pausedAt: new Date().toISOString(), resumedAt: null });

    const { data, error } = await this.supabase.client
      .from('time_entries')
      .update({ status: 'paused', pauses })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw dbError(error);
    return data;
  }

  async resume(userId: string, entryId: string) {
    const { data: entry, error: fetchError } = await this.supabase.client
      .from('time_entries')
      .select('id, status, pauses, paused_seconds')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) throw new NotFoundException('Time entry not found');
    if (entry.status !== 'paused') throw new BadRequestException('Timer is not paused');

    const pauses = ((entry.pauses as Array<Record<string, unknown>>) ?? []).slice();
    const last = pauses[pauses.length - 1];
    let pausedSeconds = (entry.paused_seconds as number) ?? 0;
    const resumedAt = new Date().toISOString();
    if (last && !last['resumedAt']) {
      last['resumedAt'] = resumedAt;
      pausedSeconds += Math.floor(
        (new Date(resumedAt).getTime() - new Date(last['pausedAt'] as string).getTime()) / 1000,
      );
    }

    const { data, error } = await this.supabase.client
      .from('time_entries')
      .update({ status: 'running', pauses, paused_seconds: pausedSeconds })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw dbError(error);
    return data;
  }

  async stop(userId: string, entryId: string, dto: StopTimerDto) {
    const { data: entry, error: fetchError } = await this.supabase.client
      .from('time_entries')
      .select('id, started_at, status, pauses, paused_seconds')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) throw new NotFoundException('Time entry not found');
    if (entry.status === 'stopped') throw new BadRequestException('Timer is not running');

    const endedAt = dto.endedAt ?? new Date().toISOString();
    const startedAt = new Date(entry.started_at as string);

    // If stopped while paused, close the open pause interval.
    const pauses = ((entry.pauses as Array<Record<string, unknown>>) ?? []).slice();
    let pausedSeconds = (entry.paused_seconds as number) ?? 0;
    if (entry.status === 'paused') {
      const last = pauses[pauses.length - 1];
      if (last && !last['resumedAt']) {
        last['resumedAt'] = endedAt;
        pausedSeconds += Math.floor(
          (new Date(endedAt).getTime() - new Date(last['pausedAt'] as string).getTime()) / 1000,
        );
      }
    }

    const durationSeconds = Math.max(
      0,
      Math.floor((new Date(endedAt).getTime() - startedAt.getTime()) / 1000) - pausedSeconds,
    );

    const { data, error } = await this.supabase.client
      .from('time_entries')
      .update({
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        paused_seconds: pausedSeconds,
        pauses,
        status: 'stopped',
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw dbError(error);
    return data;
  }

  // Admin override: stop any user's entry (not just the caller's). Used when a
  // tracker is stuck open — e.g. a desktop client died without stopping. Mirrors
  // stop() but resolves the entry by id alone.
  async adminStop(entryId: string) {
    const { data: entry, error: fetchError } = await this.supabase.client
      .from('time_entries')
      .select('id, started_at, status, pauses, paused_seconds')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) throw new NotFoundException('Time entry not found');
    if (entry.status === 'stopped') return entry;

    const endedAt = new Date().toISOString();
    const startedAt = new Date(entry.started_at as string);

    const pauses = ((entry.pauses as Array<Record<string, unknown>>) ?? []).slice();
    let pausedSeconds = (entry.paused_seconds as number) ?? 0;
    if (entry.status === 'paused') {
      const last = pauses[pauses.length - 1];
      if (last && !last['resumedAt']) {
        last['resumedAt'] = endedAt;
        pausedSeconds += Math.floor(
          (new Date(endedAt).getTime() - new Date(last['pausedAt'] as string).getTime()) / 1000,
        );
      }
    }

    const durationSeconds = Math.max(
      0,
      Math.floor((new Date(endedAt).getTime() - startedAt.getTime()) / 1000) - pausedSeconds,
    );

    const { data, error } = await this.supabase.client
      .from('time_entries')
      .update({
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        paused_seconds: pausedSeconds,
        pauses,
        status: 'stopped',
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw dbError(error);
    return data;
  }

  async list(query: ListEntriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    let q = this.supabase.client
      .from('time_entries')
      .select(
        'id, user_id, project_id, description, started_at, ended_at, duration_seconds, paused_seconds, status, user:users(id, name, email), project:projects(id, name, color)',
        { count: 'exact' },
      )
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.userId) q = q.eq('user_id', query.userId);
    if (query.projectId) q = q.eq('project_id', query.projectId);
    if (query.from) q = q.gte('started_at', query.from);
    if (query.to) q = q.lte('started_at', query.to);

    const { data, error, count } = await q;

    if (error) throw dbError(error);

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
    if (error) throw dbError(error);
    return { success: true };
  }

  async getActive() {
    const { data, error } = await this.supabase.client
      .from('time_entries')
      .select(
        'user_id, started_at, description, project:projects(name), user:users(id, name, email)',
      )
      .eq('status', 'running');

    if (error) throw dbError(error);

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
