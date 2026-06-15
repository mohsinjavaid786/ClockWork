import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { UpdateConfigDto } from './dto/config.dto';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { AuthUser } from '../../guards/supabase-auth.guard';

@ApiTags('config')
@ApiBearerAuth()
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  // Any authenticated user (desktop app included) can read config, but the
  // Slack webhook URL is only returned to admins. No longer @Public — leaving
  // it public exposed the webhook to anyone.
  @Get()
  @ApiOperation({ summary: 'Get application configuration' })
  get(@CurrentUser() user: AuthUser) {
    return this.configService.get(user.role === 'admin');
  }

  @Patch()
  @Roles('admin')
  @ApiOperation({ summary: 'Update application configuration' })
  update(@Body() dto: UpdateConfigDto) {
    return this.configService.update(dto);
  }
}
