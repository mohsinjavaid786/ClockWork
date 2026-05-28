import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { AuthUser, AuthRequest } from '../../guards/supabase-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  logout(@Req() req: AuthRequest) {
    const token = req.headers.authorization!.slice(7);
    return this.authService.logout(token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }
}
