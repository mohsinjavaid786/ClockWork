import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService, ReportsQuery } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('export/csv')
  @Roles('admin')
  @ApiOperation({ summary: 'Export time entries as CSV (admin only)' })
  async exportCsv(@Query() query: ReportsQuery, @Res() res: Response) {
    const csv = await this.reportsService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    res.send(csv);
  }

  @Get('export/pdf')
  @Roles('admin')
  @ApiOperation({ summary: 'Export weekly PDF summary (admin only)' })
  async exportPdf(@Query() query: ReportsQuery, @Res() res: Response) {
    const data = await this.reportsService.exportPdfData(query);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  }
}
