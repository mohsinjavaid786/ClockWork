import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) throw new UnauthorizedException('Invalid credentials');

    const { data: profile } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile?.is_active) throw new UnauthorizedException('Account is deactivated');

    this.logger.log(`User ${email} logged in`);
    return {
      accessToken: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        name: profile.name,
        role: profile.role as 'admin' | 'member',
      },
    };
  }

  async logout(token: string) {
    await this.supabase.client.auth.admin.signOut(token);
  }
}
