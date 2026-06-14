import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { UpdateConfigDto } from './dto/config.dto';
import { Roles } from '../../decorators/roles.decorator';
import { Public } from '../../decorators/public.decorator';

@ApiTags('config')
@ApiBearerAuth()
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get application configuration' })
  get() {
    return this.configService.get();
  }

  @Patch()
  @Roles('admin')
  @ApiOperation({ summary: 'Update application configuration' })
  update(@Body() dto: UpdateConfigDto) {
    return this.configService.update(dto);
  }
}
