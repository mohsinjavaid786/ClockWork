import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TimeEntriesService } from './time-entries.service';
import { StartTimerDto, StopTimerDto, ListEntriesQueryDto } from './dto/time-entry.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { AuthUser } from '../../guards/supabase-auth.guard';

@ApiTags('time-entries')
@ApiBearerAuth()
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a timer for the current user' })
  start(@CurrentUser() user: AuthUser, @Body() dto: StartTimerDto) {
    return this.timeEntriesService.start(user.id, dto);
  }

  @Get('current')
  @ApiOperation({ summary: "Get the current user's open timer (running or paused), if any" })
  current(@CurrentUser() user: AuthUser) {
    return this.timeEntriesService.current(user.id);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop a running timer' })
  stop(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: StopTimerDto,
  ) {
    return this.timeEntriesService.stop(user.id, id, dto);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a running timer (entry stays open)' })
  pause(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.timeEntriesService.pause(user.id, id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a paused timer' })
  resume(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.timeEntriesService.resume(user.id, id);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List time entries with pagination and filters (admin)' })
  list(@Query() query: ListEntriesQueryDto) {
    return this.timeEntriesService.list(query);
  }

  @Get('active')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all currently active members' })
  getActive() {
    return this.timeEntriesService.getActive();
  }

  @Post(':id/admin-stop')
  @Roles('admin')
  @ApiOperation({ summary: 'Force-stop any open entry (admin override for stuck trackers)' })
  adminStop(@Param('id') id: string) {
    return this.timeEntriesService.adminStop(id);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a time entry (admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.timeEntriesService.remove(id, user.id, user.role === 'admin');
  }
}
