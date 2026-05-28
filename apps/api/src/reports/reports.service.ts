import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

export interface ReportsQuery {
  startDate: string;
  endDate: string;
  userIds?: string;
  projectIds?: string;
}

interface TimeEntryRow {
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  description: string;
  users: { name: string; email: string };
  projects: { name: string } | null;
  screenshots: { id: string }[];
  activity_avg?: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private async fetchEntries(query: ReportsQuery): Promise<TimeEntryRow[]> {
    let q = this.supabase.client
      .from('time_entries')
      .select('*, users(name, email), projects(name), screenshots(id)')
      .gte('started_at', query.startDate)
      .lte('started_at', query.endDate)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: true });

    if (query.userIds) {
      const ids = query.userIds.split(',');
      q = q.in('user_id', ids) as typeof q;
    }
    if (query.projectIds) {
      const ids = query.projectIds.split(',');
      q = q.in('project_id', ids) as typeof q;
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as TimeEntryRow[];
  }

  async exportCsv(query: ReportsQuery): Promise<string> {
    const entries = await this.fetchEntries(query);
    const { Parser } = await import('json2csv');

    const rows = entries.map((e) => ({
      Employee: e.users.name,
      Email: e.users.email,
      Project: e.projects?.name ?? '',
      Date: e.started_at.split('T')[0],
      Start: e.started_at,
      End: e.ended_at,
      'Duration (hours)': (e.duration_seconds / 3600).toFixed(2),
      'Activity %': e.activity_avg ?? '',
      'Screenshots Count': e.screenshots.length,
      Description: e.description,
    }));

    const parser = new Parser();
    return parser.parse(rows);
  }

  async exportPdfData(query: ReportsQuery) {
    const entries = await this.fetchEntries(query);

    const byEmployee: Record<string, {
      name: string;
      email: string;
      days: Record<string, { hours: number; entries: number }>;
    }> = {};

    for (const e of entries) {
      const key = e.users.email;
      if (!byEmployee[key]) {
        byEmployee[key] = { name: e.users.name, email: e.users.email, days: {} };
      }
      const day = e.started_at.split('T')[0];
      if (!byEmployee[key].days[day]) byEmployee[key].days[day] = { hours: 0, entries: 0 };
      byEmployee[key].days[day].hours += e.duration_seconds / 3600;
      byEmployee[key].days[day].entries += 1;
    }

    return Object.values(byEmployee);
  }
}
