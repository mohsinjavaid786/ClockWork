import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './common/supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { ScreenshotsModule } from './screenshots/screenshots.module';
import { ProjectsModule } from './projects/projects.module';
import { ReportsModule } from './reports/reports.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    UsersModule,
    TimeEntriesModule,
    ScreenshotsModule,
    ProjectsModule,
    ReportsModule,
    WebhooksModule,
    ConfigModule,
  ],
})
export class AppModule {}
