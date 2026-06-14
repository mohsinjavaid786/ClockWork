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
  @ApiOperation({ summary: 'List time entries with pagination and filters' })
  list(@Query() query: ListEntriesQueryDto) {
    return this.timeEntriesService.list(query);
  }

  @Get('active')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all currently active members' })
  getActive() {
    return this.timeEntriesService.getActive();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a time entry' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.timeEntriesService.remove(id, user.id, user.role === 'admin');
  }
}
