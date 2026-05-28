import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ScreenshotsService } from './screenshots.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('screenshots')
@ApiBearerAuth()
@Controller('screenshots')
export class ScreenshotsController {
  constructor(private readonly screenshotsService: ScreenshotsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a blurred screenshot with activity metadata' })
  upload(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body('timeEntryId') timeEntryId: string,
    @Body('activityPercent') activityPercent: string,
    @Body('capturedAt') capturedAt: string,
  ) {
    return this.screenshotsService.upload(file.buffer, {
      userId: user.id,
      timeEntryId: timeEntryId || undefined,
      activityPercent: parseInt(activityPercent, 10),
      capturedAt,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List screenshots for a user/date range (signed URLs, 1h expiry)' })
  findAll(
    @CurrentUser() user: { id: string; role: 'admin' | 'member' },
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const resolvedUserId = user.role === 'admin' ? userId : user.id;
    return this.screenshotsService.findAll(resolvedUserId, startDate, endDate, user.role === 'admin');
  }

  @Get(':id/full')
  @Roles('admin')
  @ApiOperation({ summary: 'Get full-resolution signed URL (admin only)' })
  getFullUrl(@Param('id') id: string) {
    return this.screenshotsService.getFullUrl(id);
  }
}
