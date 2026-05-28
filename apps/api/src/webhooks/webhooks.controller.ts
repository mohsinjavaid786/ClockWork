import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { Roles } from '../common/decorators/roles.decorator';

class TestSlackDto {
  @ApiProperty()
  @IsUrl()
  @IsString()
  webhookUrl!: string;
}

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('slack/test')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test message to Slack webhook (admin only)' })
  testSlack(@Body() dto: TestSlackDto) {
    return this.webhooksService.sendTestMessage(dto.webhookUrl);
  }
}
