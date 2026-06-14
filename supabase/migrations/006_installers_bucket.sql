-- Public bucket that hosts the desktop installers (.dmg / .exe) so invite emails
-- can link to them directly, while the source repo stays private. Anyone can
-- read; only the service role (used by the release CI) can write — service_role
-- bypasses storage RLS, so no insert policy is needed.
insert into storage.buckets (id, name, public)
values ('installers', 'installers', true)
on conflict (id) do update set public = true;
