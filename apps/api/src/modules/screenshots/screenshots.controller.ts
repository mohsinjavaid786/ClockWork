import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScreenshotsService } from './screenshots.service';
import { UploadScreenshotDto, ListScreenshotsQueryDto } from './dto/screenshot.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { AuthUser } from '../../guards/supabase-auth.guard';

@ApiTags('screenshots')
@ApiBearerAuth()
@Controller('screenshots')
export class ScreenshotsController {
  constructor(private readonly screenshotsService: ScreenshotsService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a raw screenshot (+ thumbnail). Desktop sends one upload per display.',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] },
    @Body() dto: UploadScreenshotDto,
  ) {
    return this.screenshotsService.upload(
      user.id,
      files.file?.[0],
      files.thumbnail?.[0],
      dto,
    );
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List screenshots with signed URLs (admin)' })
  list(@Query() query: ListScreenshotsQueryDto) {
    return this.screenshotsService.list(query);
  }

  @Get(':id/url')
  @Roles('admin')
  @ApiOperation({ summary: 'Get signed URL for a specific screenshot (admin)' })
  getSignedUrl(@Param('id') id: string) {
    return this.screenshotsService.getSignedUrl(id);
  }

  @Post('backfill-thumbnails')
  @Roles('admin')
  @ApiOperation({ summary: 'Generate thumbnails for older screenshots missing one (admin)' })
  backfillThumbnails(
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100) : 25;
    return this.screenshotsService.backfillThumbnails(n, { userId, from, to });
  }
}
