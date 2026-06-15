import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly email: EmailService,
  ) {}

  async list() {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('id, name, email, role, is_active, timezone, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Determine who has actually accepted their invite (set a password / signed
    // in) vs. still pending, using Supabase Auth's records.
    const acceptedIds = new Set<string>();
    try {
      const { data: authList } = await this.supabase.client.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const au of authList?.users ?? []) {
        if (au.last_sign_in_at || au.email_confirmed_at) acceptedIds.add(au.id);
      }
    } catch {
      // If the auth lookup fails, fall back to marking everyone pending.
    }

    const result = await Promise.all(
      (data ?? []).map(async (u) => {
        const { data: entries } = await this.supabase.client
          .from('time_entries')
          .select('duration_seconds')
          .eq('user_id', u.id)
          .eq('status', 'stopped')
          .gte('started_at', weekStart.toISOString());

        const weeklySeconds = (entries ?? []).reduce(
          (sum, e) => sum + ((e.duration_seconds as number) ?? 0),
          0,
        );

        return {
          id: u.id as string,
          name: u.name as string,
          email: u.email as string,
          role: u.role as string,
          isActive: u.is_active as boolean,
          timezone: u.timezone as string,
          avatarUrl: u.avatar_url as string | undefined,
          createdAt: u.created_at as string,
          weeklyHours: Math.round((weeklySeconds / 3600) * 100) / 100,
          inviteStatus: acceptedIds.has(u.id as string) ? 'accepted' : 'pending',
        };
      }),
    );

    return result;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('id, name, email, role, is_active, timezone, avatar_url, created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('User not found');

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { data: entries } = await this.supabase.client
      .from('time_entries')
      .select('duration_seconds')
      .eq('user_id', id)
      .eq('status', 'stopped')
      .gte('started_at', weekStart.toISOString());

    const weeklySeconds = (entries ?? []).reduce(
      (sum, e) => sum + ((e.duration_seconds as number) ?? 0),
      0,
    );

    const { data: recentEntries } = await this.supabase.client
      .from('time_entries')
      .select('id, started_at, ended_at, duration_seconds, description, status, project:projects(id, name, color)')
      .eq('user_id', id)
      .order('started_at', { ascending: false })
      .limit(10);

    return {
      id: data.id as string,
      name: data.name as string,
      email: data.email as string,
      role: data.role as string,
      isActive: data.is_active as boolean,
      timezone: data.timezone as string,
      avatarUrl: data.avatar_url as string | undefined,
      createdAt: data.created_at as string,
      weeklyHours: Math.round((weeklySeconds / 3600) * 100) / 100,
      recentEntries: recentEntries ?? [],
    };
  }

  async invite(dto: InviteUserDto) {
    const { data: existing } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existing) throw new ConflictException('Email already registered');

    const adminUrl = (process.env['ADMIN_URL'] ?? '').replace(/\/$/, '');

    // Two paths:
    //  - With a temp password: create the account ready-to-use so the employee
    //    can log in immediately (the admin shares the password). No set-password
    //    link is needed; the invite email is best-effort.
    //  - Without: generate a Supabase invite link and email it so they set their
    //    own password. No plaintext password is ever stored or sent.
    let authUserId: string;
    let actionLink: string | null = null;

    if (dto.password) {
      const { data: created, error: createErr } =
        await this.supabase.client.auth.admin.createUser({
          email: dto.email,
          password: dto.password,
          email_confirm: true,
        });
      if (createErr || !created.user) {
        throw new BadRequestException(createErr?.message ?? 'Failed to create user');
      }
      authUserId = created.user.id;
    } else {
      const { data: linkData, error: linkError } =
        await this.supabase.client.auth.admin.generateLink({
          type: 'invite',
          email: dto.email,
          options: { redirectTo: `${adminUrl}/reset-password` },
        });
      if (linkError || !linkData.user) {
        throw new BadRequestException(linkError?.message ?? 'Failed to create invite');
      }
      authUserId = linkData.user.id;
      actionLink = linkData.properties?.action_link ?? null;
    }

    const { data, error } = await this.supabase.client
      .from('users')
      .insert({
        id: authUserId,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        timezone: dto.timezone ?? 'UTC',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      await this.supabase.client.auth.admin.deleteUser(authUserId);
      throw new BadRequestException(error.message);
    }

    // Email the employee (set-password link when there's no temp password,
    // otherwise a ready-to-use welcome with download links).
    try {
      await this.email.sendInvite(dto.email, dto.name, actionLink);
    } catch (err) {
      // With a temp password the admin can hand over credentials directly, so a
      // failed email shouldn't fail the whole invite — only surface it when the
      // email was the ONLY way in (set-password link path).
      if (!dto.password) {
        throw new BadRequestException(
          `User created but invite email failed to send: ${(err as Error).message}`,
        );
      }
    }

    return data;
  }

  async update(id: string, dto: UpdateUserDto) {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch['name'] = dto.name;
    if (dto.role !== undefined) patch['role'] = dto.role;
    if (dto.timezone !== undefined) patch['timezone'] = dto.timezone;
    if (dto.isActive !== undefined) patch['is_active'] = dto.isActive;

    const { data, error } = await this.supabase.client
      .from('users')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('User not found');
    return data;
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const { data: existing } = await this.supabase.client
      .from('users')
      .select('id')
      .eq('id', id)
      .single();
    if (!existing) throw new NotFoundException('User not found');

    // Best-effort: remove the user's screenshot files from storage (DB rows are
    // cascade-deleted with the user, but the bucket objects are not).
    try {
      const { data: files } = await this.supabase.client.storage
        .from('screenshots')
        .list(id, { limit: 1000 });
      if (files?.length) {
        await this.supabase.client.storage
          .from('screenshots')
          .remove(files.map((f) => `${id}/${f.name}`));
      }
    } catch {
      // ignore storage cleanup failures — the account + DB rows still get removed
    }

    // Deleting the auth user cascades to public.users, time_entries and
    // screenshots (ON DELETE CASCADE), removing all of the employee's data.
    const { error } = await this.supabase.client.auth.admin.deleteUser(id);
    if (error) throw new BadRequestException(error.message);

    return { success: true };
  }
}
