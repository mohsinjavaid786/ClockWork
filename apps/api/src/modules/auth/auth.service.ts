import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly email: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.authClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { data: profile, error: profileError } = await this.supabase.client
      .from('users')
      .select('id, name, email, role, is_active, timezone, avatar_url, created_at')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found');
    }

    if (!profile.is_active) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: profile.id as string,
        name: profile.name as string,
        email: profile.email as string,
        role: profile.role as string,
        isActive: profile.is_active as boolean,
        timezone: profile.timezone as string,
        avatarUrl: profile.avatar_url as string | undefined,
        createdAt: profile.created_at as string,
      },
    };
  }

  async logout(token: string) {
    await this.supabase.client.auth.admin.signOut(token);
    return { success: true };
  }

  /**
   * Generate a Supabase password-recovery link and email it via Resend.
   * Always resolves with { success: true } regardless of whether the email
   * exists, so the endpoint can't be used to enumerate registered accounts.
   */
  async forgotPassword(email: string) {
    const adminUrl = (process.env['ADMIN_URL'] ?? '').replace(/\/$/, '');
    const redirectTo = `${adminUrl}/reset-password`;

    try {
      const { data, error } = await this.supabase.client.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });

      const actionLink = data?.properties?.action_link;
      if (error || !actionLink) {
        // No such user (or generation failed) — swallow to avoid enumeration.
        this.logger.warn(`Password reset requested for ${email}: ${error?.message ?? 'no link'}`);
      } else {
        await this.email.sendPasswordReset(email, actionLink);
      }
    } catch (err) {
      this.logger.error(`forgotPassword failed for ${email}: ${(err as Error).message}`);
    }

    return { success: true };
  }

  async me(userId: string) {
    const { data, error } = await this.supabase.client
      .from('users')
      .select('id, name, email, role, is_active, timezone, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: data.id as string,
      name: data.name as string,
      email: data.email as string,
      role: data.role as string,
      isActive: data.is_active as boolean,
      timezone: data.timezone as string,
      avatarUrl: data.avatar_url as string | undefined,
      createdAt: data.created_at as string,
    };
  }
}
