-- Run against a disposable database with the migrations and Supabase roles.
-- A browser token must never reach application tables behind the API guards.
do $$
declare r text; t text; p text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach t in array array['users','projects','time_entries','screenshots','app_config'] loop
      foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(r, 'public.' || t, p) then
          raise exception '% can still % public.% directly', r, p, t;
        end if;
      end loop;
    end loop;
    if has_function_privilege(r, 'public.is_admin()', 'EXECUTE') then
      raise exception '% can call the admin helper directly', r;
    end if;
  end loop;
  if not has_table_privilege('service_role', 'public.users', 'UPDATE') then
    raise exception 'The API service role lost access';
  end if;
  if exists(select 1 from storage.buckets where id = 'screenshots' and public) then
    raise exception 'Screenshot bucket is public';
  end if;
  if exists(select 1 from pg_policies where schemaname = 'storage'
    and tablename = 'objects' and policyname in ('screenshots_upload','screenshots_select')) then
    raise exception 'Direct screenshot storage policies still exist';
  end if;
end $$;
