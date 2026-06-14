-- Per-screenshot activity detail: input counts, foreground window, and a
-- per-minute breakdown captured by the desktop app during each interval.

alter table public.screenshots
  add column if not exists key_count       integer not null default 0,
  add column if not exists mouse_count     integer not null default 0,
  add column if not exists active_window    text,
  add column if not exists minute_activity  jsonb  not null default '[]'::jsonb;

-- minute_activity shape: [{ "t": ISO8601, "keys": int, "mouse": int, "window": text }]
