import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthRequest } from '../guards/supabase-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest<AuthRequest>().user;
  },
);
