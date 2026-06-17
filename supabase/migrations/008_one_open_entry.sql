-- Enforce at most one open (running or paused) time entry per user. The API
-- already does a check-then-insert in start(), but that is racy: two concurrent
-- start requests can both pass the check and create two open entries, which then
-- breaks current()/pause()/resume() (they assume a single open entry). This
-- partial unique index makes the database the authority — a second concurrent
-- insert fails with a unique violation, which start() maps to a 409.
--
-- If any user already has duplicate open entries, keep the most recent and stop
-- the rest so the index can be created.
update public.time_entries t
set status = 'stopped',
    ended_at = coalesce(ended_at, now()),
    duration_seconds = coalesce(
      duration_seconds,
      greatest(0, floor(extract(epoch from (now() - started_at)))::int - coalesce(paused_seconds, 0))
    )
where status in ('running', 'paused')
  and exists (
    select 1 from public.time_entries o
    where o.user_id = t.user_id
      and o.status in ('running', 'paused')
      and (o.started_at > t.started_at or (o.started_at = t.started_at and o.id > t.id))
  );

create unique index if not exists time_entries_one_open_per_user
  on public.time_entries (user_id)
  where status in ('running', 'paused');
