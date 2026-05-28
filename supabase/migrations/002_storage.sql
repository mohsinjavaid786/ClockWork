insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false);

create policy "screenshots_upload" on storage.objects
  for insert with check (
    bucket_id = 'screenshots' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "screenshots_select" on storage.objects
  for select using (
    bucket_id = 'screenshots' and (
      auth.uid()::text = (storage.foldername(name))[1] or
      public.is_admin()
    )
  );
