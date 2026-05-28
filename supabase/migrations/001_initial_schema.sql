-- ============================================================
-- TrackDesk initial schema
-- ============================================================

-- Helper function used in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- users (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  role        TEXT        NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  avatar_url  TEXT,
  is_active   BOOLEAN     DEFAULT TRUE,
  timezone    TEXT        DEFAULT 'UTC',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "users_admin_insert" ON public.users
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "users_admin_delete" ON public.users
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- projects
-- ============================================================
CREATE TABLE public.projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        DEFAULT '#6366f1',
  is_archived BOOLEAN     DEFAULT FALSE,
  created_by  UUID        REFERENCES public.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_all_active" ON public.projects
  FOR SELECT USING (NOT is_archived OR public.is_admin());

CREATE POLICY "projects_admin_write" ON public.projects
  FOR ALL USING (public.is_admin());

-- ============================================================
-- time_entries
-- ============================================================
CREATE TABLE public.time_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id       UUID        REFERENCES public.projects(id),
  description      TEXT,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_running       BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_entries_own" ON public.time_entries
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

CREATE INDEX idx_time_entries_user_id    ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_started_at ON public.time_entries(started_at);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);

-- ============================================================
-- screenshots
-- ============================================================
CREATE TABLE public.screenshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  time_entry_id   UUID        REFERENCES public.time_entries(id) ON DELETE SET NULL,
  storage_path    TEXT        NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL,
  activity_percent INTEGER    CHECK (activity_percent BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "screenshots_own" ON public.screenshots
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

CREATE INDEX idx_screenshots_user_id    ON public.screenshots(user_id);
CREATE INDEX idx_screenshots_captured_at ON public.screenshots(captured_at);

-- ============================================================
-- app_config
-- ============================================================
CREATE TABLE public.app_config (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_select_all"  ON public.app_config FOR SELECT USING (TRUE);
CREATE POLICY "app_config_admin_write" ON public.app_config FOR ALL   USING (public.is_admin());

-- Seed defaults
INSERT INTO public.app_config (key, value) VALUES
  ('screenshot_interval_minutes', '10'),
  ('company_name',                'My Company'),
  ('timezone',                    'UTC'),
  ('slack_webhook_url',           '');
