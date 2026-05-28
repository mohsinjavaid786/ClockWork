import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService, UpdateConfigDto } from './config.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('config')
@ApiBearerAuth()
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all app config values' })
  getAll() {
    return this.configService.getAll();
  }

  @Patch()
  @Roles('admin')
  @ApiOperation({ summary: 'Update app config (admin only)' })
  update(@Body() dto: UpdateConfigDto) {
    return this.configService.update(dto);
  }
}
