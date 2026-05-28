-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table extending Supabase auth
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'member')) default 'member',
  is_active boolean not null default true,
  timezone text not null default 'UTC',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Projects
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  color text not null default '#FFFFFF',
  is_archived boolean not null default false,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Time entries
create table public.time_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  description text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  status text not null check (status in ('running', 'stopped')) default 'running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraint: only one running entry per user at a time
create unique index one_running_entry_per_user
  on public.time_entries (user_id)
  where status = 'running';

-- Screenshots
create table public.screenshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  time_entry_id uuid references public.time_entries(id) on delete set null,
  storage_path text not null,
  captured_at timestamptz not null,
  activity_percent integer not null default 0 check (activity_percent between 0 and 100),
  created_at timestamptz not null default now()
);

-- App config (key-value store)
create table public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value) values
  ('screenshot_interval_minutes', '10'),
  ('company_name', 'Clockwork'),
  ('timezone', 'UTC'),
  ('slack_webhook_url', '');

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute function public.handle_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();
create trigger time_entries_updated_at before update on public.time_entries
  for each row execute function public.handle_updated_at();

-- Helper function for RLS
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- RLS policies
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.screenshots enable row level security;
alter table public.app_config enable row level security;

create policy "users_select" on public.users for select using (auth.uid() is not null);
create policy "users_update_self" on public.users for update using (auth.uid() = id);
create policy "users_update_admin" on public.users for update using (public.is_admin());

create policy "projects_select" on public.projects for select using (auth.uid() is not null);
create policy "projects_insert" on public.projects for insert with check (auth.uid() is not null);
create policy "projects_update" on public.projects for update using (public.is_admin() or created_by = auth.uid());
create policy "projects_delete" on public.projects for delete using (public.is_admin());

create policy "entries_select_own" on public.time_entries for select using (user_id = auth.uid() or public.is_admin());
create policy "entries_insert" on public.time_entries for insert with check (user_id = auth.uid());
create policy "entries_update" on public.time_entries for update using (user_id = auth.uid() or public.is_admin());
create policy "entries_delete" on public.time_entries for delete using (public.is_admin());

create policy "screenshots_select" on public.screenshots for select using (user_id = auth.uid() or public.is_admin());
create policy "screenshots_insert" on public.screenshots for insert with check (user_id = auth.uid());
create policy "screenshots_delete" on public.screenshots for delete using (public.is_admin());

create policy "config_select" on public.app_config for select using (auth.uid() is not null);
create policy "config_update" on public.app_config for update using (public.is_admin());
