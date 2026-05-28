import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@Roles('admin')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('slack/test')
  @ApiOperation({ summary: 'Send a test message to the configured Slack webhook' })
  testSlack() {
    return this.webhooksService.testWebhook();
  }
}
