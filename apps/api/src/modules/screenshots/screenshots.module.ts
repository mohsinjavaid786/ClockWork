import { Module } from '@nestjs/common';
import { ScreenshotsController } from './screenshots.controller';
import { ScreenshotsService } from './screenshots.service';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ScreenshotsController],
  providers: [ScreenshotsService],
})
export class ScreenshotsModule {}
