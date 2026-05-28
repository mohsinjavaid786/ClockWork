import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  TimeEntriesService,
  StartTimeEntryDto,
  StopTimeEntryDto,
  TimeEntriesQueryDto,
} from './time-entries.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('time-entries')
@ApiBearerAuth()
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new time entry' })
  start(
    @CurrentUser() user: { id: string },
    @Body() dto: StartTimeEntryDto,
  ) {
    return this.timeEntriesService.start(user.id, dto);
  }

  @Post('stop')
  @ApiOperation({ summary: 'Stop the currently running time entry' })
  stop(
    @CurrentUser() user: { id: string },
    @Body() dto: StopTimeEntryDto,
  ) {
    return this.timeEntriesService.stop(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List time entries (paginated, filterable)' })
  findAll(
    @Query() query: TimeEntriesQueryDto,
    @CurrentUser() user: { id: string; role: 'admin' | 'member' },
  ) {
    return this.timeEntriesService.findAll(query, user.id, user.role === 'admin');
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a time entry (admin only)' })
  remove(@Param('id') id: string) {
    return this.timeEntriesService.remove(id);
  }
}
