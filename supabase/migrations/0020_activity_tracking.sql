-- Admin monitoring: per-member login count/time tracking + an actions feed.
--
-- user_sessions: one row per login, doubling as the login counter (count
-- of rows) and the time tracker (active_seconds accumulates client-side
-- heartbeats while the tab is foregrounded, so it approximates real
-- active time rather than "tab left open overnight"). last_seen_at also
-- drives an "online now" indicator in the admin UI.
--
-- activity_log: a free-text action feed (task created/updated/completed,
-- reports submitted, etc). `action` is plain text rather than an enum
-- since it's system-generated only and new action types shouldn't need a
-- migration.
--
-- Both tables follow the master-key admin-read pattern from
-- 0016_workload_salary_role_approval.sql: a member can see their own
-- rows, and nasir@thequickstyle.com can see everyone's.

create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  active_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create index user_sessions_user_id_idx on public.user_sessions(user_id, started_at desc);

alter table public.user_sessions enable row level security;

create policy "user_sessions_insert_own" on public.user_sessions
  for insert with check (auth.uid() = user_id);

create policy "user_sessions_update_own" on public.user_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_sessions_select_own_or_master_key" on public.user_sessions
  for select using (
    auth.uid() = user_id
    or (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  summary text not null,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index activity_log_actor_id_idx on public.activity_log(actor_id, created_at desc);

alter table public.activity_log enable row level security;

create policy "activity_log_insert_own" on public.activity_log
  for insert with check (auth.uid() = actor_id);

create policy "activity_log_select_own_or_master_key" on public.activity_log
  for select using (
    auth.uid() = actor_id
    or (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );
