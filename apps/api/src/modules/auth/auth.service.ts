import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
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
