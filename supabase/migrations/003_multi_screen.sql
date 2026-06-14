-- Multi-monitor screenshot support.
-- Each capture event uploads one row per display, sharing captured_at + user_id.
-- screen_number is the 1-based index of the display; display_count is the total displays captured.

alter table public.screenshots
  add column if not exists screen_number integer not null default 1 check (screen_number >= 1),
  add column if not exists display_count integer not null default 1 check (display_count >= 1);

create index if not exists idx_screenshots_captured_at_user
  on public.screenshots (user_id, captured_at desc, screen_number asc);
