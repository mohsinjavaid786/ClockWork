-- ============================================================
-- Supabase Storage: screenshots bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Members can upload their own screenshots; admins can read all
CREATE POLICY "screenshots_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "screenshots_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'screenshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_admin()
    )
  );

CREATE POLICY "screenshots_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'screenshots'
    AND public.is_admin()
  );
