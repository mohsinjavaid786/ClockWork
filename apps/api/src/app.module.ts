import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TimeEntriesModule } from './modules/time-entries/time-entries.module';
import { ScreenshotsModule } from './modules/screenshots/screenshots.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ConfigModule } from './modules/config/config.module';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TimeEntriesModule,
    ScreenshotsModule,
    ReportsModule,
    WebhooksModule,
    ConfigModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
