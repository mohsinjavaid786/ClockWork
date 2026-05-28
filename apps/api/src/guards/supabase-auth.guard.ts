import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'member';
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing authorization token');

    const token = auth.slice(7);
    const { data, error } = await this.supabase.client.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Invalid or expired token');

    const { data: profile, error: profileError } = await this.supabase.client
      .from('users')
      .select('role, is_active')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) throw new UnauthorizedException('User profile not found');
    if (!profile.is_active) throw new UnauthorizedException('Account has been deactivated');

    req.user = {
      id: data.user.id,
      email: data.user.email ?? '',
      role: profile.role as 'admin' | 'member',
      isActive: profile.is_active as boolean,
    };

    return true;
  }
}
