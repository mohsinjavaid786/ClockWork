import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report.dto';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard stats' })
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('weekly-chart')
  @ApiOperation({ summary: 'Get last 7 days hourly data for chart' })
  getWeeklyChart() {
    return this.reportsService.getWeeklyChart();
  }

  @Get('csv')
  @ApiOperation({ summary: 'Stream time entries as CSV' })
  streamCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    return this.reportsService.streamCsv(query, res);
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Download time report as HTML/PDF' })
  async getPdf(@Query() query: ReportQueryDto, @Res() res: Response) {
    const buf = await this.reportsService.generatePdf(query);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="clockwork-report.html"');
    res.send(buf);
  }
}
