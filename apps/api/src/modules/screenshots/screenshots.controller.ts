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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScreenshotsService } from './screenshots.service';
import { UploadScreenshotDto, ListScreenshotsQueryDto } from './dto/screenshot.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { AuthUser } from '../../guards/supabase-auth.guard';

@ApiTags('screenshots')
@ApiBearerAuth()
@Controller('screenshots')
export class ScreenshotsController {
  constructor(private readonly screenshotsService: ScreenshotsService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a screenshot (blurred by client before upload)' })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadScreenshotDto,
  ) {
    return this.screenshotsService.upload(user.id, file, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List screenshots with signed URLs' })
  list(@Query() query: ListScreenshotsQueryDto) {
    return this.screenshotsService.list(query);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get signed URL for a specific screenshot' })
  getSignedUrl(@Param('id') id: string) {
    return this.screenshotsService.getSignedUrl(id);
  }
}
