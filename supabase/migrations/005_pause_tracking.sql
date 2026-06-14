-- Pause/resume support for time entries.
-- Employees can pause tracking (entry stays open) instead of stop/start.
-- paused_seconds is excluded from duration_seconds; pauses records each interval.

alter table public.time_entries
  drop constraint if exists time_entries_status_check;

alter table public.time_entries
  add constraint time_entries_status_check check (status in ('running', 'paused', 'stopped'));

alter table public.time_entries
  add column if not exists paused_seconds integer not null default 0,
  add column if not exists pauses         jsonb   not null default '[]'::jsonb;

-- pauses shape: [{ "pausedAt": ISO8601, "resumedAt": ISO8601 | null }]
