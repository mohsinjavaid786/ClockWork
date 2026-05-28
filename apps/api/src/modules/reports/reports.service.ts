import { BadRequestException, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';
import { ReportQueryDto } from './dto/report.dto';

interface EntryRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  user: { name: string; email: string } | null;
  project: { name: string } | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  private async fetchEntries(query: ReportQueryDto): Promise<EntryRow[]> {
    let q = this.supabase.client
      .from('time_entries')
      .select(
        'id, started_at, ended_at, duration_seconds, description, user:users(name, email), project:projects(name)',
      )
      .eq('status', 'stopped')
      .order('started_at', { ascending: false });

    if (query.userId) q = q.eq('user_id', query.userId);
    if (query.projectId) q = q.eq('project_id', query.projectId);
    if (query.from) q = q.gte('started_at', query.from);
    if (query.to) q = q.lte('started_at', query.to);

    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as unknown as EntryRow[];
  }

  async streamCsv(query: ReportQueryDto, res: Response) {
    const entries = await this.fetchEntries(query);

    const header = 'Date,User,Email,Project,Description,Duration (hours)\n';
    const rows = entries.map((e) => {
      const date = new Date(e.started_at).toISOString().split('T')[0];
      const userName = e.user?.name ?? '';
      const email = e.user?.email ?? '';
      const project = e.project?.name ?? '';
      const desc = (e.description ?? '').replace(/"/g, '""');
      const hours = e.duration_seconds ? (e.duration_seconds / 3600).toFixed(2) : '0.00';
      return `${date},"${userName}","${email}","${project}","${desc}",${hours}`;
    });

    const csv = header + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clockwork-report.csv"');
    res.send(csv);
  }

  async generatePdf(query: ReportQueryDto): Promise<Buffer> {
    const entries = await this.fetchEntries(query);

    const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
    const totalHours = (totalSeconds / 3600).toFixed(2);

    const rows = entries
      .map((e) => {
        const date = new Date(e.started_at).toISOString().split('T')[0];
        const user = e.user?.name ?? '';
        const project = e.project?.name ?? 'No project';
        const desc = e.description ?? '';
        const hours = e.duration_seconds ? (e.duration_seconds / 3600).toFixed(2) : '0.00';
        return `<tr><td>${date}</td><td>${user}</td><td>${project}</td><td>${desc}</td><td>${hours}h</td></tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: sans-serif; font-size: 12px; color: #333; }
h1 { font-size: 20px; margin-bottom: 4px; }
p { margin: 0 0 16px; color: #666; }
table { width: 100%; border-collapse: collapse; }
th { background: #111; color: #fff; padding: 8px; text-align: left; }
td { padding: 6px 8px; border-bottom: 1px solid #eee; }
tr:nth-child(even) td { background: #f9f9f9; }
.total { font-weight: bold; margin-top: 16px; }
</style></head>
<body>
<h1>Clockwork Time Report</h1>
<p>Generated: ${new Date().toLocaleDateString()}</p>
<table>
<thead><tr><th>Date</th><th>User</th><th>Project</th><th>Description</th><th>Hours</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p class="total">Total: ${totalHours}h across ${entries.length} entries</p>
</body></html>`;

    return Buffer.from(html);
  }

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const [todayEntries, screenshotsToday, activeNow, weekEntries, prevWeekEntries] =
      await Promise.all([
        this.supabase.client
          .from('time_entries')
          .select('duration_seconds')
          .eq('status', 'stopped')
          .gte('started_at', todayStart.toISOString()),
        this.supabase.client
          .from('screenshots')
          .select('id', { count: 'exact', head: true })
          .gte('captured_at', todayStart.toISOString()),
        this.supabase.client
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'running'),
        this.supabase.client
          .from('time_entries')
          .select('duration_seconds')
          .eq('status', 'stopped')
          .gte('started_at', weekStart.toISOString()),
        this.supabase.client
          .from('time_entries')
          .select('duration_seconds')
          .eq('status', 'stopped')
          .gte('started_at', prevWeekStart.toISOString())
          .lt('started_at', weekStart.toISOString()),
      ]);

    const todaySeconds = (todayEntries.data ?? []).reduce(
      (s, e) => s + ((e.duration_seconds as number) ?? 0),
      0,
    );
    const weekSeconds = (weekEntries.data ?? []).reduce(
      (s, e) => s + ((e.duration_seconds as number) ?? 0),
      0,
    );
    const prevWeekSeconds = (prevWeekEntries.data ?? []).reduce(
      (s, e) => s + ((e.duration_seconds as number) ?? 0),
      0,
    );

    const weeklyChange =
      prevWeekSeconds > 0
        ? Math.round(((weekSeconds - prevWeekSeconds) / prevWeekSeconds) * 100)
        : 0;

    return {
      todayHours: Math.round((todaySeconds / 3600) * 100) / 100,
      activeNow: activeNow.count ?? 0,
      screenshotsToday: screenshotsToday.count ?? 0,
      weeklyHours: Math.round((weekSeconds / 3600) * 100) / 100,
      weeklyChange,
    };
  }

  async getWeeklyChart(): Promise<Array<{ day: string; date: string; hours: number }>> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    const result = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);

        const { data } = await this.supabase.client
          .from('time_entries')
          .select('duration_seconds')
          .eq('status', 'stopped')
          .gte('started_at', start.toISOString())
          .lte('started_at', end.toISOString());

        const seconds = (data ?? []).reduce(
          (s, e) => s + ((e.duration_seconds as number) ?? 0),
          0,
        );

        return {
          day: days[d.getDay()]!,
          date: start.toISOString().split('T')[0]!,
          hours: Math.round((seconds / 3600) * 100) / 100,
        };
      }),
    );

    return result;
  }
}
