import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'member';
  };
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');

    const token = authHeader.split(' ')[1];
    const { data, error } = await this.supabaseService.client.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Invalid or expired token');

    const { data: profile } = await this.supabaseService.client
      .from('users')
      .select('role, is_active')
      .eq('id', data.user.id)
      .single();

    if (!profile?.is_active) throw new UnauthorizedException('Account is deactivated');

    request.user = {
      id: data.user.id,
      email: data.user.email ?? '',
      role: profile.role as 'admin' | 'member',
    };

    return true;
  }
}
