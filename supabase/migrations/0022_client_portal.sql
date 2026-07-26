-- Client-facing portal: identity model + RLS scoping.
--
-- Every client-data table's SELECT policy today is `using (auth.uid() is
-- not null)` — any authenticated user, internal or not, sees every row
-- across every client. Client-portal accounts reuse the existing
-- profiles/user_role/current_role() machinery (role = 'client', added in
-- the previous migration) rather than a parallel identity system, so this
-- migration adds a client_id link on profiles and rewrites the affected
-- policies to scope client accounts to their own client_id while leaving
-- internal roles' access unchanged.

alter table public.profiles add column client_id uuid references public.clients(id);

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid()
$$;

-- handle_new_user: also seed client_id from user_metadata (set by the
-- admin create-login route for client accounts; null/absent for team
-- members, matching today's behavior).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, client_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    (new.raw_user_meta_data->>'role')::user_role,
    nullif(new.raw_user_meta_data->>'client_id', '')::uuid
  );
  return new;
end;
$$;

-- prevent_self_role_escalation: also block a non-team_leader from
-- reassigning their own client_id (same shape as the existing role check).
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and (select role from public.profiles where id = auth.uid()) <> 'team_leader' then
    raise exception 'Only team leaders can change roles';
  end if;

  if new.role = 'team_leader' and old.role is distinct from new.role
     and (select email from public.profiles where id = auth.uid()) <> 'nasir@thequickstyle.com' then
    raise exception 'Promoting to Team Leader requires approval from nasir@thequickstyle.com';
  end if;

  if new.client_id is distinct from old.client_id
     and (select role from public.profiles where id = auth.uid()) <> 'team_leader' then
    raise exception 'Only team leaders can change client assignment';
  end if;

  return new;
end;
$$;

-- profiles: a client account should only ever see its own row, not the
-- team roster or other clients' portal accounts. Internal roles keep
-- seeing everyone, unchanged.
drop policy "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select using (
    public.current_role() <> 'client' or id = auth.uid()
  );

-- clients: a client account only sees its own client row.
drop policy "clients_select_authenticated" on public.clients;
create policy "clients_select_authenticated" on public.clients
  for select using (
    public.current_role() <> 'client' or id = public.current_client_id()
  );

-- tasks: client-scoped select, and inserts must be tagged with the
-- caller's own client_id (so a client can't insert a task under another
-- client's name).
drop policy "tasks_select_authenticated" on public.tasks;
create policy "tasks_select_authenticated" on public.tasks
  for select using (
    public.current_role() <> 'client' or client_id = public.current_client_id()
  );

drop policy "tasks_insert_authenticated" on public.tasks;
create policy "tasks_insert_authenticated" on public.tasks
  for insert with check (
    auth.uid() is not null
    and (public.current_role() <> 'client' or client_id = public.current_client_id())
  );

-- calendar_events: client-scoped select (events with a null client_id —
-- internal/cross-client — are correctly invisible to any client account).
drop policy "calendar_events_select_authenticated" on public.calendar_events;
create policy "calendar_events_select_authenticated" on public.calendar_events
  for select using (
    public.current_role() <> 'client' or client_id = public.current_client_id()
  );

-- client_reports
drop policy "client_reports_select_authenticated" on public.client_reports;
create policy "client_reports_select_authenticated" on public.client_reports
  for select using (
    public.current_role() <> 'client' or client_id = public.current_client_id()
  );

-- content_proofs
drop policy "content_proofs_select_authenticated" on public.content_proofs;
create policy "content_proofs_select_authenticated" on public.content_proofs
  for select using (
    public.current_role() <> 'client' or client_id = public.current_client_id()
  );

-- content_assets
drop policy "content_assets_select_authenticated" on public.content_assets;
create policy "content_assets_select_authenticated" on public.content_assets
  for select using (
    public.current_role() <> 'client' or client_id = public.current_client_id()
  );

-- client_sales
drop policy "client_sales_select_authenticated" on public.client_sales;
create policy "client_sales_select_authenticated" on public.client_sales
  for select using (
    public.current_role() <> 'client' or client_id = public.current_client_id()
  );

-- client_social_accounts
drop policy "client_social_accounts_select_authenticated" on public.client_social_accounts;
create policy "client_social_accounts_select_authenticated" on public.client_social_accounts
  for select using (
    public.current_role() <> 'client' or client_id = public.current_client_id()
  );

-- client_reports: add the one manually-entered metric that had no home
-- yet (views/comments/likes/campaign_sales/roas/ad_spend already exist;
-- shares comes from content_assets).
alter table public.client_reports add column mentions integer;

-- client_baselines: one-time "before YOKUME" snapshot per client, entered
-- once by a team leader. The portal analytics page compares this against
-- live-aggregated numbers from client_reports/content_assets/client_sales.
create table public.client_baselines (
  client_id uuid primary key references public.clients(id) on delete cascade,
  posts integer,
  views integer,
  likes integer,
  comments integer,
  shares integer,
  mentions integer,
  ad_spend numeric(10, 2),
  roas numeric(10, 2),
  sales numeric(10, 2),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.client_baselines enable row level security;

create policy "client_baselines_select_leader" on public.client_baselines
  for select using (public.current_role() = 'team_leader');

create policy "client_baselines_select_own_client" on public.client_baselines
  for select using (
    public.current_role() = 'client' and client_id = public.current_client_id()
  );

create policy "client_baselines_insert_leader" on public.client_baselines
  for insert with check (public.current_role() = 'team_leader');

create policy "client_baselines_update_leader" on public.client_baselines
  for update using (public.current_role() = 'team_leader');
