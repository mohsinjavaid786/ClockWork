-- Application data is accessed through the Nest API, which checks account
-- status, roles and ownership. The browser's public Supabase key is used ONLY
-- for Auth password recovery, never for direct database or screenshot access.
-- Run this migration on EVERY hosted database; committing it is not deployment.
begin;

revoke all privileges on table
  public.users, public.projects, public.time_entries, public.screenshots, public.app_config
  from public, anon, authenticated;
grant all privileges on table
  public.users, public.projects, public.time_entries, public.screenshots, public.app_config
  to service_role;

-- Remove the self-promotion policy as a second barrier if table access is ever
-- accidentally granted again. Role changes must go through the admin API.
drop policy if exists "users_update_self" on public.users;
revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to service_role;
alter function public.is_admin() set search_path = public, pg_temp;

-- No client uploads or downloads outside the API account checks. API uploads
-- use service_role; reads are short-lived signed URLs issued only to admins.
drop policy if exists "screenshots_upload" on storage.objects;
drop policy if exists "screenshots_select" on storage.objects;
update storage.buckets set public = false where id = 'screenshots';

commit;
